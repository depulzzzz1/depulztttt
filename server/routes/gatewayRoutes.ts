import { Router, Request, Response, NextFunction } from 'express';
import defaultPrisma from '../../lib';

const router = Router();

// Middleware for Gateway Key Validation
const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const apiKeyHeader = req.headers['x-api-key'] || req.query.apiKey;
    if (!apiKeyHeader) {
      return res.status(401).json({ success: false, message: 'API key is missing.' });
    }

    const apiKeyRecord = await prisma.apiKey.findUnique({ where: { key: String(apiKeyHeader) } });
    if (!apiKeyRecord) {
      return res.status(403).json({ success: false, message: 'Invalid API key.' });
    }

    next();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Utility to create logs in database and broadcast via socket
async function createSystemLog(req: Request, level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', tag: string, message: string) {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const io = req.app.get('io');
    const log = await prisma.log.create({
      data: { level, tag, message },
    });
    if (io) io.emit('new_log', log);
    return log;
  } catch (err) {
    console.error('Failed to write log in gateway route:', err);
  }
}

// Send message via third-party integrations
router.post('/messages/send', validateApiKey as any, async (req: Request, res: Response) => {
  try {
    const prisma = req.app.get('prisma') || defaultPrisma;
    const io = req.app.get('io');
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

    if (io) io.emit('new_message', newMessage);
    await createSystemLog(req, 'SUCCESS', 'API', `API message successfully dispatched to ${to}`);

    res.json({
      success: true,
      message: 'Message dispatched successfully',
      data: newMessage,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
