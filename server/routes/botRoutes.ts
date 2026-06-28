import { Router, Response } from 'express';
import defaultPrisma from '../../lib';
import { verifyToken, authorizeRoles, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { BotController } from '../controllers/botController';
import { UserController } from '../controllers/userController';
import { StatusController } from '../controllers/statusController';
import { LogController } from '../controllers/logController';

const router = Router();

// Helper for logging
async function createSystemLog(req: any, level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', tag: string, message: string) {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const io = req.app.get('io');
    const log = await prisma.log.create({
      data: { level, tag, message },
    });
    if (io) io.emit('new_log', log);
    return log;
  } catch (err) {
    console.error('Failed to write log in bot route:', err);
  }
}

// Ensure all routes are verified by default JWT authentication
router.use(verifyToken as any);

// ==========================================
// 1. SETTINGS ENDPOINTS
// ==========================================
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
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

router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { botName, ownerNumber, prefix, timezone, language } = req.body;
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { botName, ownerNumber, prefix, timezone, language },
      create: { id: 1, botName, ownerNumber, prefix, timezone, language },
    });

    await createSystemLog(req, 'INFO', 'USER', 'Bot settings updated successfully');
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. MESSAGES ENDPOINTS
// ==========================================
router.get('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'asc' },
    });
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const io = req.app.get('io');
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

    if (io) io.emit('new_message', msg);

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
          if (io) io.emit('new_message', autoReplyMsg);
          await createSystemLog(req, 'INFO', 'BOT', `Auto reply triggered for keyword "${rule.keyword}" in ${chatId}`);
          break; // Trigger highest-priority matching rule only
        }
      }
    }, 1000);

    res.json({ success: true, message: msg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/messages/chat/:chatId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { chatId } = req.params;
    await prisma.message.deleteMany({ where: { chatId } });
    await createSystemLog(req, 'WARNING', 'USER', `Cleared chat inbox history for ${chatId}`);
    res.json({ success: true, message: 'Chat inbox cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. GROUPS ENDPOINTS
// ==========================================
router.get('/groups', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const groups = await prisma.group.findMany();
    res.json({ success: true, groups });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/groups', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { id, name, memberCount } = req.body;
    const group = await prisma.group.create({
      data: { id, name, memberCount: memberCount || 1 },
    });
    await createSystemLog(req, 'INFO', 'BOT', `Group "${name}" joined successfully`);
    res.json({ success: true, group });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/groups/action', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, groupId, groupName } = req.body;
    await createSystemLog(req, 'INFO', 'BOT', `Group command "${action}" executed on "${groupName}"`);
    res.json({ success: true, message: `Command ${action} dispatched successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/groups/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { id } = req.params;
    const deletedGroup = await prisma.group.delete({ where: { id } });
    await createSystemLog(req, 'WARNING', 'BOT', `Bot left group "${deletedGroup.name}"`);
    res.json({ success: true, message: 'Group removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. BROADCASTS ENDPOINTS
// ==========================================
router.get('/broadcasts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const broadcasts = await prisma.broadcast.findMany({ orderBy: { timestamp: 'desc' } });
    res.json({ success: true, broadcasts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/broadcasts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const io = req.app.get('io');
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

    if (io) io.emit('new_broadcast', bc);
    await createSystemLog(req, 'INFO', 'BROADCAST', `Started mass campaign "${name}" with ${totalCount} targets`);

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

        if (io) {
          io.emit('broadcast_update', { id: bc.id, sentCount, status: sentCount === totalCount ? 'Completed' : 'Running' });
        }
      }

      if (sentCount >= totalCount) {
        clearInterval(intervalId);
        await prisma.broadcast.update({
          where: { id: bc.id },
          data: { status: 'Completed' },
        });
        await createSystemLog(req, 'SUCCESS', 'BROADCAST', `Mass campaign "${name}" completed successfully!`);
      }
    }, (delay || 3) * 1000);

    res.json({ success: true, broadcast: bc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. CONTACTS ENDPOINTS
// ==========================================
router.get('/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const contacts = await prisma.contact.findMany();
    res.json({ success: true, contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { name, phone } = req.body;
    const contact = await prisma.contact.create({
      data: { name, phone },
    });
    res.json({ success: true, contact });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/contacts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const id = parseInt(req.params.id);
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. AUTO REPLY ENDPOINTS
// ==========================================
router.get('/auto-replies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const autoReplies = await prisma.autoReply.findMany({ orderBy: { priority: 'asc' } });
    res.json({ success: true, autoReplies });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auto-replies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { keyword, matchType, response, priority } = req.body;
    const rule = await prisma.autoReply.create({
      data: {
        keyword,
        matchType,
        response,
        priority: priority || 1,
      },
    });
    await createSystemLog(req, 'INFO', 'USER', `Added new auto-reply rule for: "${keyword}"`);
    res.json({ success: true, rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/auto-replies/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
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

router.delete('/auto-replies/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const id = parseInt(req.params.id);
    await prisma.autoReply.delete({ where: { id } });
    res.json({ success: true, message: 'Auto reply rule deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 7. PLUGINS ENDPOINTS
// ==========================================
router.get('/plugins', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const plugins = await prisma.plugin.findMany();
    res.json({ success: true, plugins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/plugins', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { name, description } = req.body;
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const plugin = await prisma.plugin.create({
      data: { id, name, description },
    });
    await createSystemLog(req, 'SUCCESS', 'BOT', `Installed plugin: "${name}"`);
    res.json({ success: true, plugin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/plugins/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { id } = req.params;
    const { isEnabled } = req.body;
    const plugin = await prisma.plugin.update({
      where: { id },
      data: { isEnabled },
    });
    await createSystemLog(req, 'INFO', 'BOT', `Plugin "${plugin.name}" toggled to ${isEnabled ? 'Active' : 'Inactive'}`);
    res.json({ success: true, plugin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/plugins/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { id } = req.params;
    const deleted = await prisma.plugin.delete({ where: { id } });
    await createSystemLog(req, 'WARNING', 'BOT', `Uninstalled plugin: "${deleted.name}"`);
    res.json({ success: true, message: 'Plugin deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 8. LOGS ENDPOINTS
// ==========================================
router.get('/logs', LogController.getLogs);
router.delete('/logs/clear', LogController.clearLogs);
router.get('/logs/stats', LogController.getLogStats);

// ==========================================
// 9. API KEYS ENDPOINTS
// ==========================================
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const keys = await prisma.apiKey.findMany();
    res.json({ success: true, apiKeys: keys });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { name, role } = req.body;
    const rawKey = 'wa_key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: rawKey,
        role: role || 'Admin',
      },
    });
    await createSystemLog(req, 'SUCCESS', 'API', `Generated API Key for application: "${name}"`);
    res.json({ success: true, apiKey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/api-keys/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const id = parseInt(req.params.id);
    await prisma.apiKey.delete({ where: { id } });
    res.json({ success: true, message: 'API key revoked' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 10. USERS ENDPOINTS (Requires Owner role)
// ==========================================
router.get('/users', authorizeRoles('Owner') as any, UserController.getAllUsers);
router.get('/users/:id', authorizeRoles('Owner') as any, UserController.getUserById);
router.post('/users', authorizeRoles('Owner') as any, UserController.createUser);
router.put('/users/:id', authorizeRoles('Owner') as any, UserController.updateUser);
router.put('/users/:id/password', authorizeRoles('Owner') as any, UserController.resetPassword);
router.put('/users/:id/suspend', authorizeRoles('Owner') as any, UserController.toggleSuspension);
router.delete('/users/:id', authorizeRoles('Owner') as any, UserController.deleteUser);

// ==========================================
// 11. WHATSAPP ENGINE CONTROL
// ==========================================
router.post('/wa/pairing', BotController.generatePairingCode);
router.get('/wa/qr', BotController.getQrCode);
router.get('/wa/status', BotController.getStatus);
router.post('/wa/disconnect', BotController.disconnectBot);

router.post('/wa/connect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const io = req.app.get('io');
    req.app.set('waConnectionStatus', 'Connecting');
    if (io) io.emit('wa_status', 'Connecting');
    await createSystemLog(req, 'INFO', 'SOCKET', 'WhatsApp connection handshake initiated...');

    setTimeout(async () => {
      req.app.set('waConnectionStatus', 'Connected');
      if (io) io.emit('wa_status', 'Connected');
      await createSystemLog(req, 'SUCCESS', 'SOCKET', 'WhatsApp Session established successfully! Scanning QR code completed.');
    }, 3000);

    res.json({ success: true, status: 'Connecting' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/wa/disconnect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const io = req.app.get('io');
    req.app.set('waConnectionStatus', 'Disconnected');
    if (io) io.emit('wa_status', 'Disconnected');
    await createSystemLog(req, 'WARNING', 'SOCKET', 'WhatsApp engine shutdown. Client session closed.');
    res.json({ success: true, status: 'Disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 12. SYSTEM STATUS & METRICS
// ==========================================
router.get('/system/metrics', StatusController.getSystemMetrics);
router.get('/system/ping', StatusController.ping);

export default router;
