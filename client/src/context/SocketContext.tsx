import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Log {
  id: number;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  tag: string;
  message: string;
  createdAt: string;
}

export interface Message {
  id: number;
  chatId: string;
  chatName: string;
  sender: string;
  text: string;
  mediaType: string;
  mediaUrl?: string;
  isIncoming: boolean;
  createdAt: string;
}

export interface BotMetrics {
  cpuUsage: number;
  ramUsage: number;
  ping: number;
  uptime: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  waStatus: 'Disconnected' | 'Connecting' | 'Connected';
  pairingCode: string | null;
  qrCode: string | null;
  logs: Log[];
  messages: Message[];
  metrics: BotMetrics | null;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  clearLogs: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000'
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [waStatus, setWaStatus] = useState<'Disconnected' | 'Connecting' | 'Connected'>('Disconnected');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const connectSocket = useCallback((token: string) => {
    // If there is an existing socket, clean it up first
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.IO connected to server:', serverUrl);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket.IO disconnected from server, reason:', reason);
    });

    // Handle WhatsApp Status changes
    newSocket.on('wa_status', (status: 'Disconnected' | 'Connecting' | 'Connected') => {
      setWaStatus(status);
      if (status === 'Connected') {
        setPairingCode(null);
        setQrCode(null);
      }
    });

    // Handle WhatsApp Pairing Code
    newSocket.on('wa_pairing_code', (code: string | null) => {
      setPairingCode(code);
      if (code) setQrCode(null);
    });

    // Handle WhatsApp QR Code
    newSocket.on('wa_qr_code', (code: string | null) => {
      setQrCode(code);
      if (code) setPairingCode(null);
    });

    // Handle real-time Log feeds
    newSocket.on('new_log', (log: Log) => {
      setLogs((prevLogs) => {
        // Keep a max of 200 logs in standard rolling window
        const updated = [log, ...prevLogs];
        return updated.slice(0, 200);
      });
    });

    // Handle real-time Messages
    newSocket.on('new_message', (message: Message) => {
      setMessages((prevMessages) => [message, ...prevMessages]);
    });

    // Handle real-time updates for BotMetrics (if emitted by Socket.IO)
    newSocket.on('bot_metrics', (newMetrics: BotMetrics) => {
      setMetrics(newMetrics);
    });

    setSocket(newSocket);
  }, [serverUrl, socket]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Periodically fetch status/metrics as fallback if socket metrics are not active
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatusAndMetrics = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${serverUrl}/api/system/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          if (data.bot) {
            setWaStatus(data.bot.connectionStatus);
            setMetrics(data.bot.metrics);
          }
        }
      } catch (err) {
        console.error('Failed to poll system metrics in SocketContext:', err);
      }
    };

    // If connected to a user session, poll status periodically
    if (isConnected) {
      fetchStatusAndMetrics(); // initial fetch
      intervalId = setInterval(fetchStatusAndMetrics, 5000); // every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isConnected, serverUrl]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        waStatus,
        pairingCode,
        qrCode,
        logs,
        messages,
        metrics,
        connectSocket,
        disconnectSocket,
        clearLogs,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
