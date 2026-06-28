import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  Database, 
  Clock, 
  Server, 
  Network, 
  Users, 
  MessageSquare, 
  Radio, 
  Reply, 
  RefreshCw, 
  Activity, 
  Shield, 
  AlertCircle, 
  HardDrive,
  Info
} from 'lucide-react';

interface MetricsData {
  success: boolean;
  timestamp: string;
  system: {
    platform: string;
    architecture: string;
    osUptime: number;
    hostname: string;
    cpu: {
      model: string;
      cores: number;
      loadAverage: number[];
      usagePercent: number;
    };
    memory: {
      total: string;
      free: string;
      used: string;
      usagePercent: number;
    };
  };
  process: {
    uptime: number;
    nodeVersion: string;
    memoryUsage: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
  };
  database: {
    connected: boolean;
    latencyMs: number;
  };
  bot: {
    connectionStatus: string;
    connectedPhone: string | null;
    metrics: any;
  };
  statistics: {
    totalUsers: number;
    totalMessages: number;
    totalBroadcasts: number;
    totalContacts: number;
    totalAutoReplies: number;
  };
}

interface DashboardStatsProps {
  apiUrl?: string;
  refreshIntervalMs?: number; // pass 0 to disable auto-refresh
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  apiUrl = 'http://localhost:5000/api',
  refreshIntervalMs = 5000
}) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const fetchMetrics = useCallback(async (showSilent = false) => {
    if (!showSilent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/system/metrics`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch dashboard metrics');
      }

      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the system controller.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiUrl]);

  // Initial load
  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  // Auto Refresh Interval
  useEffect(() => {
    if (refreshIntervalMs <= 0 || !autoRefreshEnabled) return;

    const timer = setInterval(() => {
      fetchMetrics(true);
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [fetchMetrics, refreshIntervalMs, autoRefreshEnabled]);

  const formatUptime = (totalSeconds: number): string => {
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
  };

  const getMemoryPercentageColor = (percent: number) => {
    if (percent > 85) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (percent > 65) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const getCpuPercentageColor = (percent: number) => {
    if (percent > 85) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (percent > 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
  };

  if (isLoading && !metrics) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-[#090D16] text-slate-400 gap-3 p-6 rounded-2xl border border-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold tracking-wide uppercase font-mono">Aggregating system telemetry...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans select-none">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
            DEPMQ SYSTEM DIAGNOSTICS
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Real-time resource utilization, database integrity, and traffic analytics</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Auto Refresh toggle */}
          <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all focus:outline-none flex items-center gap-1.5 ${
              autoRefreshEnabled
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {autoRefreshEnabled ? 'Auto Refresh (5s)' : 'Auto Refresh Off'}
          </button>

          {/* Manual refresh button */}
          <button
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-40"
            title="Refresh statistics manually"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/50 rounded-2xl p-5 text-red-200 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Diagnostics connection failure</p>
            <p className="text-xs text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {metrics && (
        <div className="space-y-6">
          
          {/* Main Triple Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CPU Metric Card */}
            <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700/60 transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-teal-500" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">CPU Workload</span>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {metrics.system.cpu.usagePercent.toFixed(2)}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Cpu className="w-5.5 h-5.5" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#090D16] h-2 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-teal-400 h-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, Math.max(1, metrics.system.cpu.usagePercent))}%` }}
                />
              </div>

              {/* Auxiliary Meta */}
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span className="truncate max-w-[180px]" title={metrics.system.cpu.model}>
                  {metrics.system.cpu.model}
                </span>
                <span className="font-semibold px-2 py-0.5 rounded bg-[#090D16] border border-slate-800 text-indigo-400">
                  {metrics.system.cpu.cores} Cores
                </span>
              </div>
            </div>

            {/* RAM Metric Card */}
            <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700/60 transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">RAM Allocation</span>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {metrics.system.memory.usagePercent.toFixed(1)}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <HardDrive className="w-5.5 h-5.5" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#090D16] h-2 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, Math.max(1, metrics.system.memory.usagePercent))}%` }}
                />
              </div>

              {/* Auxiliary Meta */}
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>
                  Used: {metrics.system.memory.used}
                </span>
                <span className="font-semibold px-2 py-0.5 rounded bg-[#090D16] border border-slate-800 text-emerald-400">
                  Total: {metrics.system.memory.total}
                </span>
              </div>
            </div>

            {/* System Uptime Card */}
            <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700/60 transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-500 to-orange-500" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Session Uptime</span>
                  <p className="text-3xl font-black text-white tracking-tight truncate pr-2">
                    {formatUptime(metrics.process.uptime)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Clock className="w-5.5 h-5.5" />
                </div>
              </div>

              {/* Uptime description bar / layout */}
              <div className="h-2 bg-[#090D16] rounded-full mb-4 flex items-center overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-400 w-full h-full animate-pulse" />
              </div>

              {/* Auxiliary Meta */}
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Node Process Instance</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-[#090D16] border border-slate-800 text-amber-400 font-mono">
                  OS Uptime: {formatUptime(metrics.system.osUptime)}
                </span>
              </div>
            </div>

          </div>

          {/* Database and Platform Environment Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Database & Runtime Health */}
            <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400" />
                Service Connectivity
              </h4>

              <div className="space-y-3">
                {/* Postgres Database check */}
                <div className="flex items-center justify-between p-3.5 bg-[#090D16] rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      metrics.database.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      <Database className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Prisma DB connection</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">PostgreSQL Instance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                      metrics.database.connected 
                        ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' 
                        : 'bg-red-950/40 border-red-900/40 text-red-400'
                    }`}>
                      {metrics.database.connected ? 'ACTIVE' : 'FAILED'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Ping: {metrics.database.latencyMs}ms</p>
                  </div>
                </div>

                {/* WhatsApp Socket Connection */}
                <div className="flex items-center justify-between p-3.5 bg-[#090D16] rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                      <Shield className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Bot Engine Bridge</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">WhatsApp Virtual Host</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                      metrics.bot.connectionStatus === 'Connected'
                        ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400'
                        : metrics.bot.connectionStatus === 'Connecting'
                          ? 'bg-amber-950/40 border-amber-900/40 text-amber-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      {metrics.bot.connectionStatus.toUpperCase()}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[140px]" title={metrics.bot.connectedPhone || 'No device linked'}>
                      {metrics.bot.connectedPhone || 'No device linked'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform & Environment Context */}
            <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                Environment Context
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#090D16] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Architecture</span>
                  <p className="text-xs font-bold text-slate-200 capitalize">{metrics.system.platform} ({metrics.system.architecture})</p>
                </div>
                <div className="p-3 bg-[#090D16] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Node Version</span>
                  <p className="text-xs font-bold text-slate-200">{metrics.process.nodeVersion}</p>
                </div>
                <div className="p-3 bg-[#090D16] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Process RSS</span>
                  <p className="text-xs font-bold text-slate-200">{metrics.process.memoryUsage.rss}</p>
                </div>
                <div className="p-3 bg-[#090D16] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Node heapUsed</span>
                  <p className="text-xs font-bold text-slate-200">{metrics.process.memoryUsage.heapUsed}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Resources & Counts Overview Metrics */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4.5 h-4.5 text-indigo-400" />
              Database Resource Overview
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Users */}
              <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:border-slate-700/50 transition-colors">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Users</p>
                  <p className="text-xl font-extrabold text-white leading-tight">{metrics.statistics.totalUsers}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:border-slate-700/50 transition-colors">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Messages</p>
                  <p className="text-xl font-extrabold text-white leading-tight">{metrics.statistics.totalMessages}</p>
                </div>
              </div>

              {/* Broadcasts */}
              <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:border-slate-700/50 transition-colors">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Broadcasts</p>
                  <p className="text-xl font-extrabold text-white leading-tight">{metrics.statistics.totalBroadcasts}</p>
                </div>
              </div>

              {/* Contacts */}
              <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:border-slate-700/50 transition-colors">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contacts</p>
                  <p className="text-xl font-extrabold text-white leading-tight">{metrics.statistics.totalContacts}</p>
                </div>
              </div>

              {/* Auto Replies */}
              <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:border-slate-700/50 transition-colors md:col-span-1 col-span-2">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                  <Reply className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auto Replies</p>
                  <p className="text-xl font-extrabold text-white leading-tight">{metrics.statistics.totalAutoReplies}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
