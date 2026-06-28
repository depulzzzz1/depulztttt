import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import defaultPrisma from '../../lib';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';

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
    console.error('Failed to write log in route:', err);
  }
}

// Register Route
router.post('/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Username is already taken' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'Admin',
      },
    });

    await createSystemLog(req, 'SUCCESS', 'USER', `User ${username} registered successfully as ${role || 'Admin'}`);

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
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ success: false, message: 'Your account has been suspended' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
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

    await createSystemLog(req, 'INFO', 'USER', `User ${username} logged in successfully`);

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

export default router;
