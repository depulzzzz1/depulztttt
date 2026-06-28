import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import prisma from '../lib';
import apiRoutes from './routes';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Share prisma and io with routes/controllers via Express app settings
app.set('prisma', prisma);
app.set('io', io);

const PORT = process.env.PORT || 5000;

// 1. Global Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Body Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Global Rate Limiter to prevent brute force & DDoS attacks
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
});
app.use(globalLimiter);

// WhatsApp connection state tracking
let waConnectionStatus = 'Disconnected'; // 'Disconnected', 'Connecting', 'Connected'
app.set('waConnectionStatus', waConnectionStatus);

// 4. Mount consolidated modular routes under /api
app.use('/api', apiRoutes);

// Helper function to create system logs and broadcast to connected clients
async function createSystemLog(level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', tag: string, message: string) {
  try {
    const log = await prisma.log.create({
      data: { level, tag, message },
    });
    io.emit('new_log', log);
    return log;
  } catch (err) {
    console.error('Failed to write system log:', err);
  }
}

// 5. Socket.IO Connections & Event Setup
io.on('connection', (socket) => {
  console.log('Real-time client connected:', socket.id);

  // Send initial WhatsApp engine connection state
  socket.emit('wa_status', app.get('waConnectionStatus') || 'Disconnected');

  socket.on('disconnect', () => {
    console.log('Real-time client disconnected:', socket.id);
  });
});

// 6. Database Seeding for Initial Launch
async function seedInitialDatabase() {
  try {
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
      console.log('Successfully seeded default account (Username: admin, Password: admin123).');
    }

    const settingsCount = await prisma.settings.count();
    if (settingsCount === 0) {
      await prisma.settings.create({
        data: { id: 1 },
      });
      console.log('Successfully seeded default bot settings.');
    }
  } catch (error) {
    console.error('Error during database seeding:', error);
  }
}

// 7. Start the unified HTTP and WebSocket Server
server.listen(PORT, async () => {
  await seedInitialDatabase();
  console.log(`🚀 Security-hardened Backend running on http://localhost:${PORT}`);
});
