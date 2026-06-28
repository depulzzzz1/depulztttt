import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib';
import { verifyToken, authorizeRoles, AuthenticatedRequest } from './middlewares/authMiddleware';
import apiRoutes from './routes';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Share prisma and io with routes via Express app settings
app.set('prisma', prisma);
app.set('io', io);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';

// Global Security and Request Processing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing with basic JSON and URL-encoded structures
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting to secure application resources
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
});
app.use(globalLimiter);

// Socket.io connection state
let waConnectionStatus = 'Disconnected'; // 'Disconnected', 'Connecting', 'Connected'
app.set('waConnectionStatus', waConnectionStatus);

// Mount modular consolidated routes with security middlewares integrated
app.use('/api', apiRoutes);

// Utility to create logs in database and broadcast via socket
async function createSystemLog(level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', tag: string, message: string) {
  try {
    const log = await prisma.log.create({
      data: { level, tag, message },
    });
    io.emit('new_log', log);
    return log;
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

// Socket.io Real-time communications
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial connection status
  socket.emit('wa_status', waConnectionStatus);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==========================================
// 1. PUBLIC & AUTHENTICATION API
// ==========================================

// Register Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'Admin',
      },
    });

    await createSystemLog('SUCCESS', 'USER', `User ${username} registered successfully as ${role || 'Admin'}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '24h',
    });

    // Save user session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await createSystemLog('INFO', 'USER', `User ${username} logged in successfully`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. REST API GATEWAY (Protected by ApiKey)
// ==========================================

// Middleware for Gateway Key Validation
const validateApiKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKeyHeader = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKeyHeader) {
    return res.status(401).json({ success: false, message: 'API key is missing.' });
  }

  const apiKeyRecord = await prisma.apiKey.findUnique({ where: { key: String(apiKeyHeader) } });
  if (!apiKeyRecord) {
    return res.status(403).json({ success: false, message: 'Invalid API key.' });
  }

  next();
};

// Send message via third-party integrations
app.post('/api/v1/messages/send', validateApiKey, async (req, res) => {
  try {
    const { to, text, mediaUrl, mediaType } = req.body;
    if (!to || !text) {
      return res.status(400).json({ success: false, message: 'Receiver (to) and text content are required' });
    }

    // Save and send message simulation
    const newMessage = await prisma.message.create({
      data: {
        chatId: to,
        chatName: to,
        sender: 'BOT',
        text,
        mediaType: mediaType || 'text',
        mediaUrl: mediaUrl || '',
        isIncoming: false,
      },
    });

    io.emit('new_message', newMessage);
    await createSystemLog('SUCCESS', 'API', `API message successfully dispatched to ${to}`);

    res.json({
      success: true,
      message: 'Message dispatched successfully',
      data: newMessage,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. PRIVATE ADMIN API (JWT Protected)
// ==========================================

// Apply JWT verification middleware to all routes below
app.use('/api', verifyToken as any);

// Settings Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1 },
      });
    }
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { botName, ownerNumber, prefix, timezone, language } = req.body;
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { botName, ownerNumber, prefix, timezone, language },
      create: { id: 1, botName, ownerNumber, prefix, timezone, language },
    });

    await createSystemLog('INFO', 'USER', 'Bot settings updated successfully');
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Messages & Inbox Chat Endpoints
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'asc' },
    });
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { chatId, text, sender, mediaType, mediaUrl } = req.body;
    const msg = await prisma.message.create({
      data: {
        chatId,
        chatName: chatId,
        sender: sender || 'SAYA',
        text,
        mediaType: mediaType || 'text',
        mediaUrl: mediaUrl || '',
        isIncoming: false,
      },
    });

    io.emit('new_message', msg);

    // Trigger basic auto-reply logic simulation
    setTimeout(async () => {
      const triggerRules = await prisma.autoReply.findMany({ where: { isEnabled: true } });
      for (const rule of triggerRules) {
        let isMatched = false;
        if (rule.matchType === 'Exact' && text.toLowerCase() === rule.keyword.toLowerCase()) {
          isMatched = true;
        } else if (rule.matchType === 'Contains' && text.toLowerCase().includes(rule.keyword.toLowerCase())) {
          isMatched = true;
        } else if (rule.matchType === 'Regex') {
          try {
            const regex = new RegExp(rule.keyword, 'i');
            isMatched = regex.test(text);
          } catch (e) {
            console.error('Invalid regex:', rule.keyword);
          }
        }

        if (isMatched) {
          const autoReplyMsg = await prisma.message.create({
            data: {
              chatId,
              chatName: chatId,
              sender: 'BOT',
              text: rule.response,
              mediaType: rule.mediaUri ? 'image' : 'text',
              mediaUrl: rule.mediaUri,
              isIncoming: true,
            },
          });
          io.emit('new_message', autoReplyMsg);
          await createSystemLog('INFO', 'BOT', `Auto reply triggered for keyword "${rule.keyword}" in ${chatId}`);
          break; // Trigger highest-priority matching rule only
        }
      }
    }, 1000);

    res.json({ success: true, message: msg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/messages/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    await prisma.message.deleteMany({ where: { chatId } });
    await createSystemLog('WARNING', 'USER', `Cleared chat inbox history for ${chatId}`);
    res.json({ success: true, message: 'Chat inbox cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Groups Endpoints
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await prisma.group.findMany();
    res.json({ success: true, groups });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { id, name, memberCount } = req.body;
    const group = await prisma.group.create({
      data: { id, name, memberCount: memberCount || 1 },
    });
    await createSystemLog('INFO', 'BOT', `Group "${name}" joined successfully`);
    res.json({ success: true, group });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/groups/action', async (req, res) => {
  try {
    const { action, groupId, groupName, target } = req.body;
    await createSystemLog('INFO', 'BOT', `Group command "${action}" executed on "${groupName}"`);
    res.json({ success: true, message: `Command ${action} dispatched successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGroup = await prisma.group.delete({ where: { id } });
    await createSystemLog('WARNING', 'BOT', `Bot left group "${deletedGroup.name}"`);
    res.json({ success: true, message: 'Group removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Broadcasts Endpoints
app.get('/api/broadcasts', async (req, res) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({ orderBy: { timestamp: 'desc' } });
    res.json({ success: true, broadcasts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/broadcasts', async (req, res) => {
  try {
    const { name, message, delay, targets } = req.body;
    const totalCount = targets ? targets.length : 1;

    const bc = await prisma.broadcast.create({
      data: {
        name,
        message,
        delay: delay || 3,
        totalCount,
        sentCount: 0,
        status: 'Running',
      },
    });

    io.emit('new_broadcast', bc);
    await createSystemLog('INFO', 'BROADCAST', `Started mass campaign "${name}" with ${totalCount} targets`);

    // Simulate sending broadcasts asynchronously
    let sentCount = 0;
    const intervalId = setInterval(async () => {
      sentCount++;
      if (sentCount <= totalCount) {
        await prisma.broadcast.update({
          where: { id: bc.id },
          data: { sentCount },
        });

        // Add a mock sent message to the chat history
        const targetNumber = targets[sentCount - 1];
        await prisma.message.create({
          data: {
            chatId: targetNumber,
            chatName: targetNumber,
            sender: 'BOT',
            text: message,
            isIncoming: false,
          },
        });

        io.emit('broadcast_update', { id: bc.id, sentCount, status: sentCount === totalCount ? 'Completed' : 'Running' });
      }

      if (sentCount >= totalCount) {
        clearInterval(intervalId);
        await prisma.broadcast.update({
          where: { id: bc.id },
          data: { status: 'Completed' },
        });
        await createSystemLog('SUCCESS', 'BROADCAST', `Mass campaign "${name}" completed successfully!`);
      }
    }, (delay || 3) * 1000);

    res.json({ success: true, broadcast: bc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Contacts Endpoints
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany();
    res.json({ success: true, contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const contact = await prisma.contact.create({
      data: { name, phone },
    });
    res.json({ success: true, contact });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto Reply Endpoints
app.get('/api/auto-replies', async (req, res) => {
  try {
    const autoReplies = await prisma.autoReply.findMany({ orderBy: { priority: 'asc' } });
    res.json({ success: true, autoReplies });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auto-replies', async (req, res) => {
  try {
    const { keyword, matchType, response, priority } = req.body;
    const rule = await prisma.autoReply.create({
      data: {
        keyword,
        matchType,
        response,
        priority: priority || 1,
      },
    });
    await createSystemLog('INFO', 'USER', `Added new auto-reply rule for: "${keyword}"`);
    res.json({ success: true, rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/auto-replies/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isEnabled, keyword, matchType, response, priority } = req.body;
    const rule = await prisma.autoReply.update({
      where: { id },
      data: { isEnabled, keyword, matchType, response, priority },
    });
    res.json({ success: true, rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/auto-replies/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.autoReply.delete({ where: { id } });
    res.json({ success: true, message: 'Auto reply rule deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Plugins Endpoints
app.get('/api/plugins', async (req, res) => {
  try {
    const plugins = await prisma.plugin.findMany();
    res.json({ success: true, plugins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/plugins', async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const plugin = await prisma.plugin.create({
      data: { id, name, description },
    });
    await createSystemLog('SUCCESS', 'BOT', `Installed plugin: "${name}"`);
    res.json({ success: true, plugin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/plugins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled } = req.body;
    const plugin = await prisma.plugin.update({
      where: { id },
      data: { isEnabled },
    });
    await createSystemLog('INFO', 'BOT', `Plugin "${plugin.name}" toggled to ${isEnabled ? 'Active' : 'Inactive'}`);
    res.json({ success: true, plugin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/plugins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await prisma.plugin.delete({ where: { id } });
    await createSystemLog('WARNING', 'BOT', `Uninstalled plugin: "${deleted.name}"`);
    res.json({ success: true, message: 'Plugin deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Logs Endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Users Endpoints (Requires Owner role)
app.get('/api/users', authorizeRoles('Owner') as any, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, isSuspended: true, createdAt: true },
    });
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id', authorizeRoles('Owner') as any, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isSuspended } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended },
    });
    await createSystemLog('WARNING', 'USER', `User status changed for ${user.username} (Suspended: ${isSuspended})`);
    res.json({ success: true, user: { id: user.id, username: user.username, isSuspended: user.isSuspended } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/users/:id', authorizeRoles('Owner') as any, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await prisma.user.delete({ where: { id } });
    await createSystemLog('WARNING', 'USER', `Deleted user account: "${deleted.username}"`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API Keys Endpoints
app.get('/api/api-keys', async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany();
    res.json({ success: true, apiKeys: keys });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/api-keys', async (req, res) => {
  try {
    const { name, role } = req.body;
    const rawKey = 'wa_key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: rawKey,
        role: role || 'Admin',
      },
    });
    await createSystemLog('SUCCESS', 'API', `Generated API Key for application: "${name}"`);
    res.json({ success: true, apiKey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/api-keys/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.apiKey.delete({ where: { id } });
    res.json({ success: true, message: 'API key revoked' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// WhatsApp Engine Simulation controls
app.post('/api/wa/connect', async (req, res) => {
  try {
    waConnectionStatus = 'Connecting';
    io.emit('wa_status', waConnectionStatus);
    await createSystemLog('INFO', 'SOCKET', 'WhatsApp connection handshake initiated...');

    setTimeout(async () => {
      waConnectionStatus = 'Connected';
      io.emit('wa_status', waConnectionStatus);
      await createSystemLog('SUCCESS', 'SOCKET', 'WhatsApp Session established successfully! Scanning QR code completed.');
    }, 3000);

    res.json({ success: true, status: 'Connecting' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/wa/disconnect', async (req, res) => {
  try {
    waConnectionStatus = 'Disconnected';
    io.emit('wa_status', waConnectionStatus);
    await createSystemLog('WARNING', 'SOCKET', 'WhatsApp engine shutdown. Client session closed.');
    res.json({ success: true, status: 'Disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seed Initial Setup on Server Start
async function seedInitialDatabase() {
  const usersCount = await prisma.user.count();
  if (usersCount === 0) {
    const initialHashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: initialHashedPassword,
        role: 'Owner',
      },
    });
    console.log('Seeded initial Owner user "admin" with password "admin123".');
  }

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: { id: 1 },
    });
  }
}

// Start Server
server.listen(PORT, async () => {
  await seedInitialDatabase();
  console.log(`Backend server running on http://localhost:${PORT}`);
});
