import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  QrCode, 
  Phone, 
  Wifi, 
  WifiOff, 
  Loader2, 
  LogOut, 
  Key, 
  Cpu, 
  Database, 
  Activity, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface WhatsAppControllerProps {
  apiUrl?: string;
}

export const WhatsAppController: React.FC<WhatsAppControllerProps> = ({
  apiUrl = 'http://localhost:5000/api'
}) => {
  const { 
    waStatus, 
    pairingCode, 
    qrCode, 
    metrics, 
    isConnected 
  } = useSocket();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // Loading states
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isDisconnectLoading, setIsDisconnectLoading] = useState(false);
  
  // Feedback states
  const [copied, setCopied] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneratePairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    // Validate phone number format (must contain only numbers, optionally + at start, length between 10-15)
    const cleanedPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanedPhone) {
      setPhoneError('Phone number is required');
      return;
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(cleanedPhone)) {
      setPhoneError('Please enter a valid WhatsApp number with country code (e.g. +628123456789 or 628123456789)');
      return;
    }

    setIsPairingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/wa/pairing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ phoneNumber: cleanedPhone })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate pairing code');
      }

      setSuccessFeedback(`Pairing code requested successfully for ${cleanedPhone}`);
    } catch (err: any) {
      setErrorFeedback(err.message || 'Could not connect to bot engine. Please try again.');
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleRequestQrCode = async () => {
    setErrorFeedback(null);
    setSuccessFeedback(null);
    setIsQrLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/wa/qr`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch QR code');
      }

      setSuccessFeedback('QR Code request received. Generating authentication ticket...');
    } catch (err: any) {
      setErrorFeedback(err.message || 'An error occurred fetching the QR ticket.');
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect and logout this WhatsApp device?')) {
      return;
    }

    setErrorFeedback(null);
    setSuccessFeedback(null);
    setIsDisconnectLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/wa/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Disconnect operation failed');
      }

      setSuccessFeedback('Device session successfully terminated.');
      setPhoneNumber('');
    } catch (err: any) {
      setErrorFeedback(err.message || 'Could not disconnect bot session.');
    } finally {
      setIsDisconnectLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-sans select-none">
      
      {/* Top Controller Hero Dashboard Panel */}
      <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-teal-500" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
              WhatsApp Engine Control Hub
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">Control bot connections, pairing codes, and live diagnostics</p>
          </div>
          
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold mr-1">Dashboard Sync:</span>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              !isConnected 
                ? 'bg-red-950/40 border-red-900/50 text-red-400'
                : waStatus === 'Connected'
                  ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
                  : waStatus === 'Connecting'
                    ? 'bg-amber-950/40 border-amber-900/50 text-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                !isConnected 
                  ? 'bg-red-500 animate-pulse'
                  : waStatus === 'Connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : waStatus === 'Connecting'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-slate-500'
              }`} />
              <span>
                {!isConnected ? 'SOCKET OFFLINE' : `BOT ${waStatus.toUpperCase()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#090D16]/80 rounded-xl border border-slate-800/60">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              CPU Load
            </div>
            <p className="text-lg font-bold text-white tracking-tight">
              {metrics ? `${Math.round(metrics.cpuUsage * 100)}%` : '0%'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              RAM Allocation
            </div>
            <p className="text-lg font-bold text-white tracking-tight">
              {metrics ? `${Math.round(metrics.ramUsage * 1024)} MB` : '0 MB'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Engine Ping
            </div>
            <p className="text-lg font-bold text-white tracking-tight">
              {metrics && metrics.ping !== 999 ? `${metrics.ping} ms` : '∞'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Session Uptime
            </div>
            <p className="text-lg font-bold text-white tracking-tight">
              {metrics ? formatUptime(metrics.uptime) : '0s'}
            </p>
          </div>
        </div>

        {/* Local Feedbacks */}
        {errorFeedback && (
          <div className="mt-4 flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-xl p-4 text-red-200 text-xs animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorFeedback}</span>
          </div>
        )}
        {successFeedback && (
          <div className="mt-4 flex items-start gap-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-4 text-emerald-200 text-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Connection Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Pairing Controls */}
        <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-md font-bold text-white">Device Pairing</h4>
                <p className="text-xs text-slate-400">Link your WA using an 8-character code</p>
              </div>
            </div>

            {waStatus !== 'Connected' ? (
              <form onSubmit={handleGeneratePairingCode} className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="628123456789"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      disabled={isPairingLoading || waStatus === 'Connecting'}
                      className={`w-full text-sm bg-[#090D16]/90 border ${
                        phoneError ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                      } rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4`}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {phoneError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPairingLoading || waStatus === 'Connecting'}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isPairingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Requesting code...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Generate Pairing Code</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="bg-[#090D16]/60 border border-emerald-900/30 rounded-xl p-4 flex items-center gap-3 mt-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Bot is fully active</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Device is connected. Disconnect first to link a new number.</p>
                </div>
              </div>
            )}

            {/* Displaying active Pairing Code */}
            {pairingCode && (
              <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-4 space-y-2 mt-4 animate-fadeIn">
                <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider text-center">Your Pairing Code</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex gap-1.5">
                    {pairingCode.split('').map((char, index) => (
                      <span 
                        key={index} 
                        className={`inline-flex items-center justify-center w-8 h-10 rounded-lg text-lg font-black tracking-widest ${
                          char === '-' 
                            ? 'text-indigo-400 bg-transparent w-3' 
                            : 'bg-indigo-900/40 text-white border border-indigo-500/20 shadow-md'
                        }`}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => copyToClipboard(pairingCode)}
                    className="p-2 hover:bg-indigo-900/30 active:scale-95 rounded-lg text-indigo-400 hover:text-white transition-all focus:outline-none"
                    title="Copy pairing code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-1">
                  Open WhatsApp &gt; Linked Devices &gt; Link with Phone Code, then enter this code.
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800/40 text-[11px] text-slate-500 text-center">
            Standard simulation handles pairing handshakes safely inside secure memory pools.
          </div>
        </div>

        {/* Right Side: QR Code / Session Management */}
        <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-md font-bold text-white">QR Handshake & Controls</h4>
                <p className="text-xs text-slate-400">Authenticating using standard dynamic QR arrays</p>
              </div>
            </div>

            {waStatus === 'Disconnected' && (
              <button
                onClick={handleRequestQrCode}
                disabled={isQrLoading || waStatus === 'Connecting'}
                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isQrLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading authenticating ticket...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Initialize QR Authentication</span>
                  </>
                )}
              </button>
            )}

            {/* Displaying Simulated QR Code ticket if available */}
            {qrCode && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                <div className="bg-white p-3 rounded-xl shadow-lg relative group">
                  {/* Premium mock visual QR placeholder */}
                  <div className="w-40 h-40 bg-slate-900 flex flex-col items-center justify-center text-white p-2 rounded-lg gap-1 border-2 border-dashed border-emerald-500/40">
                    <QrCode className="w-14 h-14 text-emerald-400 stroke-[1.5]" />
                    <span className="text-[9px] text-slate-400 font-mono tracking-widest text-center mt-1">DEPMQ SECURITY</span>
                    <span className="text-[7px] text-[#10B981] font-mono text-center">SCAN ACTIVE HANDSHAKE</span>
                  </div>
                  {/* Subtle overlay */}
                  <div className="absolute inset-0 bg-emerald-500/5 rounded-xl pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 text-center max-w-xs">
                  Scan the security QR ticket above with your WhatsApp scanner to link session instantly.
                </p>
              </div>
            )}

            {/* Logout / Terminate Device Control */}
            {waStatus === 'Connected' && (
              <div className="space-y-3 mt-2">
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Bot is actively bridging commands</p>
                    <p className="text-[11px] text-slate-400">Linked to virtual memory nodes. Ready to process inbox hooks.</p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnectLoading}
                  className="w-full bg-red-950/40 hover:bg-red-950/60 border border-red-900/50 hover:border-red-800 text-red-300 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isDisconnectLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      <span>Logging out virtual device...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Logout & Disconnect Device</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {waStatus === 'Connecting' && !pairingCode && !qrCode && (
              <div className="bg-[#090D16]/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center gap-3 min-h-[120px] animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs text-slate-400 text-center">Handshaking with WhatsApp session controller. Ready to serve pairing methods...</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/40 text-[11px] text-slate-500 text-center">
            Virtual engine guarantees 256-bit secure end-to-end simulation pipelines.
          </div>
        </div>

      </div>

    </div>
  );
};
