import { Server } from 'socket.io';
import defaultPrisma from '../../lib';

export interface BotMetrics {
  cpuUsage: number;
  ramUsage: number;
  ping: number;
  uptime: number;
}

export interface BotStatus {
  connectionStatus: 'Disconnected' | 'Connecting' | 'Connected';
  pairingCode: string | null;
  qrCode: string | null;
  metrics: BotMetrics;
  connectedPhone: string | null;
}

/**
 * Service to manage the WhatsApp bot instance and coordinate Socket.IO events.
 * Bridges actual or simulated bot lifecycles directly to the visual dashboard.
 */
export class BotService {
  private connectionStatus: 'Disconnected' | 'Connecting' | 'Connected' = 'Disconnected';
  private pairingCode: string | null = null;
  private qrCode: string | null = null;
  private startTime: number = Date.now();
  private connectedPhone: string | null = null;
  private autoConnectTimeout: NodeJS.Timeout | null = null;
  private ioInstance: Server | null = null;

  constructor(io?: Server) {
    if (io) {
      this.ioInstance = io;
    }
  }

  /**
   * Sets the active Socket.IO server instance.
   */
  public setIo(io: Server) {
    this.ioInstance = io;
  }

  /**
   * Emits helper logs both to Database and via WebSocket.
   */
  private async createSystemLog(
    level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS',
    tag: string,
    message: string
  ) {
    try {
      const log = await defaultPrisma.log.create({
        data: { level, tag, message },
      });
      if (this.ioInstance) {
        this.ioInstance.emit('new_log', log);
      }
      return log;
    } catch (err) {
      console.error('Failed to write log in BotService:', err);
    }
  }

  /**
   * Returns current connection status, parameters, and system metrics.
   */
  public getStatus(): BotStatus {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    let cpuUsage = 0.02;
    let ramUsage = 0.25;
    let ping = 999;

    if (this.connectionStatus === 'Connected') {
      cpuUsage = parseFloat((Math.random() * 0.15 + 0.05).toFixed(2));
      ramUsage = parseFloat((0.35 + Math.random() * 0.08).toFixed(2));
      ping = Math.floor(Math.random() * 27 + 28);
    } else if (this.connectionStatus === 'Connecting') {
      cpuUsage = parseFloat((Math.random() * 0.35 + 0.20).toFixed(2));
      ramUsage = parseFloat((0.50 + Math.random() * 0.12).toFixed(2));
      ping = Math.floor(Math.random() * 160 + 90);
    } else {
      cpuUsage = parseFloat((Math.random() * 0.05 + 0.01).toFixed(2));
      ramUsage = parseFloat((0.25 + Math.random() * 0.02).toFixed(2));
      ping = 999;
    }

    return {
      connectionStatus: this.connectionStatus,
      pairingCode: this.pairingCode,
      qrCode: this.qrCode,
      metrics: {
        cpuUsage,
        ramUsage,
        ping,
        uptime: uptimeSeconds,
      },
      connectedPhone: this.connectedPhone,
    };
  }

  /**
   * Generates a unique WhatsApp pairing code, alerts the UI, and simulates bridging of connectivity.
   */
  public generatePairingCode(phoneNumber: string, io?: any): string {
    const activeIo = io || this.ioInstance;
    if (this.autoConnectTimeout) clearTimeout(this.autoConnectTimeout);

    this.connectionStatus = 'Connecting';
    this.qrCode = null;
    this.connectedPhone = phoneNumber;

    // Generate code format: XXXX-XXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.pairingCode = code.slice(0, 4) + '-' + code.slice(4);

    if (activeIo) {
      activeIo.emit('wa_status', 'Connecting');
      activeIo.emit('wa_pairing_code', this.pairingCode);
    }

    this.createSystemLog('INFO', 'SOCKET', `Requesting pairing code for ${phoneNumber}...`);
    this.createSystemLog('SUCCESS', 'BOT', `Pairing Code generated successfully: ${this.pairingCode}`);

    // Bridge flow: auto-connect after 8 seconds
    this.autoConnectTimeout = setTimeout(async () => {
      this.connectionStatus = 'Connected';
      this.pairingCode = null;
      if (activeIo) {
        activeIo.emit('wa_status', 'Connected');
        activeIo.emit('wa_pairing_code', null);
      }
      await this.createSystemLog('SUCCESS', 'BOT', 'WhatsApp Bot successfully CONNECTED via pairing code!');
    }, 8000);

    return this.pairingCode;
  }

  /**
   * Triggers generation of an authentication QR code and simulates a scan/successful handshake.
   */
  public getQrCode(io?: any): string {
    const activeIo = io || this.ioInstance;
    if (this.autoConnectTimeout) clearTimeout(this.autoConnectTimeout);

    this.connectionStatus = 'Connecting';
    this.pairingCode = null;
    this.qrCode = 'ready_qr_code_placeholder_data';
    this.connectedPhone = null;

    if (activeIo) {
      activeIo.emit('wa_status', 'Connecting');
      activeIo.emit('wa_qr_code', this.qrCode);
    }

    this.createSystemLog('INFO', 'SOCKET', 'Requesting QR Code authentication...');
    this.createSystemLog('SUCCESS', 'BOT', 'New QR Code loaded. Please scan with your WhatsApp app.');

    // Bridge flow: auto-connect after 10 seconds of scanning
    this.autoConnectTimeout = setTimeout(async () => {
      this.connectionStatus = 'Connected';
      this.qrCode = null;
      if (activeIo) {
        activeIo.emit('wa_status', 'Connected');
        activeIo.emit('wa_qr_code', null);
      }
      await this.createSystemLog('SUCCESS', 'BOT', 'WhatsApp Session established successfully! Scanning QR code completed.');
    }, 10000);

    return this.qrCode;
  }

  /**
   * Shuts down any current connection process or active session.
   */
  public disconnect(io?: any): void {
    const activeIo = io || this.ioInstance;
    if (this.autoConnectTimeout) clearTimeout(this.autoConnectTimeout);
    
    this.connectionStatus = 'Disconnected';
    this.pairingCode = null;
    this.qrCode = null;
    this.connectedPhone = null;

    if (activeIo) {
      activeIo.emit('wa_status', 'Disconnected');
      activeIo.emit('wa_pairing_code', null);
      activeIo.emit('wa_qr_code', null);
    }

    this.createSystemLog('WARNING', 'SOCKET', 'WhatsApp engine shutdown. Client session closed.');
  }

  /**
   * Adapts and bridges an incoming message event from a WhatsApp instance to the dashboard
   */
  public async handleIncomingMessage(chatId: string, sender: string, text: string, mediaType: string = 'text', mediaUrl: string = '') {
    try {
      const message = await defaultPrisma.message.create({
        data: {
          chatId,
          chatName: chatId,
          sender,
          text,
          mediaType,
          mediaUrl,
          isIncoming: true,
        },
      });

      if (this.ioInstance) {
        this.ioInstance.emit('new_message', message);
      }

      await this.createSystemLog('INFO', 'BOT', `Message bridged from WhatsApp instance: "${text.substring(0, 30)}"`);
      return message;
    } catch (err) {
      console.error('Error bridging incoming message:', err);
    }
  }
}

// Export a singleton instance by default
export const botService = new BotService();
export default botService;
