import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import defaultPrisma from '../../lib';
import { botService } from '../services/botService';

// ------------------------------------------------------------------------
// BotController - Route handler for Express
// ------------------------------------------------------------------------
export class BotController {
  private static botService = botService;

  private static async log(
    req: any,
    level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS',
    tag: string,
    message: string
  ) {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const io = req.app.get('io');
      const log = await prisma.log.create({
        data: { level, tag, message },
      });
      if (io) io.emit('new_log', log);
      return log;
    } catch (err) {
      console.error('Failed to write log in BotController:', err);
    }
  }

  public static async generatePairingCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        res.status(400).json({ success: false, message: 'Phone number is required' });
        return;
      }

      const io = req.app.get('io');
      const code = BotController.botService.generatePairingCode(phoneNumber, io, (level, tag, msg) =>
        BotController.log(req, level as any, tag, msg)
      );

      res.json({ success: true, pairingCode: code });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getQrCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const io = req.app.get('io');
      const qrCode = BotController.botService.getQrCode(io, (level, tag, msg) =>
        BotController.log(req, level as any, tag, msg)
      );

      res.json({ success: true, qrCode });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = BotController.botService.getStatus();
      res.json({ success: true, ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async disconnectBot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const io = req.app.get('io');
      BotController.botService.disconnect(io, (level, tag, msg) =>
        BotController.log(req, level as any, tag, msg)
      );
      res.json({ success: true, message: 'Disconnected successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
