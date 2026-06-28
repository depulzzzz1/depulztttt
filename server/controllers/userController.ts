import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import defaultPrisma from '../../lib';

export class UserController {
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
      console.error('Failed to write log in UserController:', err);
    }
  }

  /**
   * Get all users (Typically restricted to Owner)
   */
  public static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          isSuspended: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, users });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get user details by ID
   */
  public static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid user ID format' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          role: true,
          isSuspended: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Create / Register a new user
   */
  public static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      await UserController.log(
        req,
        'SUCCESS',
        'USER',
        `User ${username} created successfully with role ${role || 'Admin'}`
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: { id: user.id, username: user.username, role: user.role },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update User details (role and username)
   */
  public static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const id = parseInt(req.params.id);
      const { username, role } = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid user ID format' });
        return;
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Check username conflicts if it's changing
      if (username && username !== existingUser.username) {
        const usernameTaken = await prisma.user.findUnique({ where: { username } });
        if (usernameTaken) {
          res.status(400).json({ success: false, message: 'Username is already taken' });
          return;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          username: username || existingUser.username,
          role: role || existingUser.role,
        },
      });

      await UserController.log(
        req,
        'INFO',
        'USER',
        `User ${existingUser.username} updated (New details -> Username: ${updatedUser.username}, Role: ${updatedUser.role})`
      );

      res.json({
        success: true,
        message: 'User details updated successfully',
        user: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Reset user password
   */
  public static async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const id = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid user ID format' });
        return;
      }

      if (!newPassword || newPassword.trim().length < 4) {
        res.status(400).json({
          success: false,
          message: 'New password must be provided and contain at least 4 characters',
        });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      // Invalidate current active sessions for security
      await prisma.session.deleteMany({ where: { userId: id } });

      await UserController.log(
        req,
        'WARNING',
        'USER',
        `Password reset successfully for user: ${existingUser.username}`
      );

      res.json({ success: true, message: 'User password reset and sessions invalidated successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Toggle suspension status of a user (Suspend / Active)
   */
  public static async toggleSuspension(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const id = parseInt(req.params.id);
      const { isSuspended } = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid user ID format' });
        return;
      }

      if (typeof isSuspended !== 'boolean') {
        res.status(400).json({ success: false, message: 'isSuspended must be a boolean value' });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Check to prevent self-suspension
      if (req.user && req.user.id === id) {
        res.status(400).json({ success: false, message: 'You cannot suspend your own account!' });
        return;
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isSuspended },
      });

      // If suspended, invalidate all user sessions
      if (isSuspended) {
        await prisma.session.deleteMany({ where: { userId: id } });
      }

      await UserController.log(
        req,
        'WARNING',
        'USER',
        `User ${user.username} suspension status updated to: ${isSuspended}`
      );

      res.json({
        success: true,
        message: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`,
        user: { id: user.id, username: user.username, isSuspended: user.isSuspended },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete a user account (Requires Owner role)
   */
  public static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = req.app.get('prisma') || defaultPrisma;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid user ID format' });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Prevent self-deletion
      if (req.user && req.user.id === id) {
        res.status(400).json({ success: false, message: 'You cannot delete your own account!' });
        return;
      }

      await prisma.user.delete({ where: { id } });

      await UserController.log(req, 'WARNING', 'USER', `Deleted user account: "${existingUser.username}"`);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
