import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import defaultPrisma from '../../lib';

export class LogController {
  /**
   * Fetches paginated, filtered, and searchable log records from the database.
   */
  public static async getLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;

      // 1. Extract query params and parse with defaults
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const skip = (page - 1) * limit;

      const level = req.query.level as string;
      const tag = req.query.tag as string;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      // 2. Build where filter clauses dynamically
      const where: any = {};

      if (level && level !== 'ALL') {
        where.level = level;
      }

      if (tag && tag !== 'ALL') {
        where.tag = tag;
      }

      if (search) {
        where.message = {
          contains: search,
          mode: 'insensitive' // case-insensitive search if supported by DB (postgresql supports this)
        };
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = new Date(startDate);
        }
        if (endDate) {
          where.timestamp.lte = new Date(endDate);
        }
      }

      // 3. Execute DB queries concurrently (data + total count)
      const [logs, totalCount] = await Promise.all([
        prisma.log.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit,
        }),
        prisma.log.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        logs,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error: any) {
      console.error('Error fetching logs in LogController:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Deletes all logs from the database.
   */
  public static async clearLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;

      // Ensure user role has permission (Admin or Owner)
      if (req.user?.role !== 'Admin' && req.user?.role !== 'Owner') {
        res.status(430).json({ success: false, message: 'Forbidden: Insufficient permissions to clear system logs' });
        return;
      }

      const result = await prisma.log.deleteMany({});

      res.json({
        success: true,
        message: 'Successfully purged system log archives',
        count: result.count
      });
    } catch (error: any) {
      console.error('Error purging logs in LogController:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Exposes dynamic metrics regarding log distributions.
   */
  public static async getLogStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;

      const [totalCount, levelsGroup, tagsGroup] = await Promise.all([
        prisma.log.count(),
        prisma.log.groupBy({
          by: ['level'],
          _count: {
            _all: true
          }
        }),
        prisma.log.groupBy({
          by: ['tag'],
          _count: {
            _all: true
          }
        })
      ]);

      res.json({
        success: true,
        stats: {
          totalCount,
          byLevel: levelsGroup.reduce((acc: any, curr: any) => {
            acc[curr.level] = curr._count._all;
            return acc;
          }, {}),
          byTag: tagsGroup.reduce((acc: any, curr: any) => {
            acc[curr.tag] = curr._count._all;
            return acc;
          }, {})
        }
      });
    } catch (error: any) {
      console.error('Error loading log stats in LogController:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
