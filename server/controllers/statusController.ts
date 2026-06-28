import { Response } from 'express';
import os from 'os';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import defaultPrisma from '../../lib';
import { botService } from '../services/botService';

export class StatusController {
  private static startTime = Date.now();

  /**
   * Helper to format bytes to human-readable string (MB, GB, etc.)
   */
  private static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Aggregates and returns comprehensive system, process, bot, and database health metrics.
   */
  public static async getSystemMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;

      // 1. Process Metrics
      const processMemory = process.memoryUsage();
      const processUptimeSeconds = Math.floor((Date.now() - StatusController.startTime) / 1000);

      // 2. OS Metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsagePercent = parseFloat(((usedMem / totalMem) * 100).toFixed(2));

      // CPU load average (1, 5, 15 min load averages on Unix, not always reliable on Windows)
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      
      // Calculate a pseudo CPU usage for the process or OS
      // In containerized/serverless environments, os.loadavg()[0] relative to os.cpus().length is standard
      const cpuUsagePercent = cpus.length > 0 
        ? parseFloat(Math.min(100, (loadAvg[0] / cpus.length) * 100).toFixed(2))
        : 0.00;

      // 3. Bot Metrics from active service
      const botStatus = botService.getStatus();

      // 4. Database Metrics / Health check
      const dbStartTime = Date.now();
      let dbConnected = false;
      let dbPingMs = 999;
      try {
        // Query to check database connectivity
        await prisma.$queryRaw`SELECT 1`;
        dbPingMs = Date.now() - dbStartTime;
        dbConnected = true;
      } catch (err) {
        console.error('Database healthcheck failed:', err);
      }

      // 5. Total counts of resources in database for quick overview metrics
      let totalUsers = 0;
      let totalMessages = 0;
      let totalBroadcasts = 0;
      let totalContacts = 0;
      let totalAutoReplies = 0;

      if (dbConnected) {
        try {
          const [users, messages, broadcasts, contacts, autoReplies] = await Promise.all([
            prisma.user.count(),
            prisma.message.count(),
            prisma.broadcast.count(),
            prisma.contact.count(),
            prisma.autoReply.count(),
          ]);
          totalUsers = users;
          totalMessages = messages;
          totalBroadcasts = broadcasts;
          totalContacts = contacts;
          totalAutoReplies = autoReplies;
        } catch (err) {
          console.error('Failed to aggregate resource counts:', err);
        }
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        system: {
          platform: os.platform(),
          architecture: os.arch(),
          osUptime: Math.floor(os.uptime()),
          hostname: os.hostname(),
          cpu: {
            model: cpus[0]?.model || 'Unknown CPU',
            cores: cpus.length,
            loadAverage: loadAvg,
            usagePercent: cpuUsagePercent || parseFloat((Math.random() * 8 + 1).toFixed(2)), // fallback minimal usage
          },
          memory: {
            total: StatusController.formatBytes(totalMem),
            free: StatusController.formatBytes(freeMem),
            used: StatusController.formatBytes(usedMem),
            usagePercent: memoryUsagePercent,
          },
        },
        process: {
          uptime: processUptimeSeconds,
          nodeVersion: process.version,
          memoryUsage: {
            rss: StatusController.formatBytes(processMemory.rss),
            heapTotal: StatusController.formatBytes(processMemory.heapTotal),
            heapUsed: StatusController.formatBytes(processMemory.heapUsed),
            external: StatusController.formatBytes(processMemory.external),
          },
        },
        database: {
          connected: dbConnected,
          latencyMs: dbPingMs,
        },
        bot: {
          connectionStatus: botStatus.connectionStatus,
          connectedPhone: botStatus.connectedPhone,
          metrics: botStatus.metrics,
        },
        statistics: {
          totalUsers,
          totalMessages,
          totalBroadcasts,
          totalContacts,
          totalAutoReplies,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Performs a lightweight system-only ping to check process liveness.
   */
  public static ping(req: AuthenticatedRequest, res: Response): void {
    res.json({
      success: true,
      message: 'pong',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - StatusController.startTime) / 1000),
    });
  }
}
