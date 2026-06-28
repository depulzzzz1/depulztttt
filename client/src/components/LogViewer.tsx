import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket, Log } from '../context/SocketContext';
import { 
  Terminal, 
  Search, 
  Trash2, 
  Filter, 
  Download, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  Database, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface LogViewerProps {
  apiUrl?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  apiUrl = 'http://localhost:5000/api'
}) => {
  const { logs: socketLogs, clearLogs: clearSocketLogs, isConnected } = useSocket();
  const [initialLogs, setInitialLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isClearingServer, setIsClearingServer] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch initial log history
  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/logs`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.logs)) {
        setInitialLogs(data.logs);
      } else {
        throw new Error(data.message || 'Failed to fetch logs history');
      }
    } catch (err: any) {
      setErrorFeedback(err.message || 'Could not load historic server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [apiUrl]);

  // Combine live socket logs and historic REST logs ensuring uniqueness
  const mergedLogs = useMemo(() => {
    const combined: Log[] = [...socketLogs];
    const seenIds = new Set<number>(socketLogs.map(l => l.id));

    initialLogs.forEach(log => {
      if (!seenIds.has(log.id)) {
        combined.push(log);
        seenIds.add(log.id);
      }
    });

    // Sort by id descending (most recent first)
    return combined.sort((a, b) => b.id - a.id);
  }, [socketLogs, initialLogs]);

  // Auto Scroll logic
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0; // Since list is rendered desc or container scrolling matches
    }
  }, [mergedLogs, autoScroll]);

  // Filtered Logs list
  const filteredLogs = useMemo(() => {
    return mergedLogs.filter(log => {
      // 1. Level Filter
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) {
        return false;
      }
      // 2. Tag Filter
      if (selectedTag !== 'ALL' && log.tag !== selectedTag) {
        return false;
      }
      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msg = log.message.toLowerCase();
        const tag = log.tag.toLowerCase();
        const lvl = log.level.toLowerCase();
        return msg.includes(query) || tag.includes(query) || lvl.includes(query);
      }
      return true;
    });
  }, [mergedLogs, selectedLevel, selectedTag, searchQuery]);

  // Get unique tags for filtering dropdown
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    mergedLogs.forEach(log => {
      if (log.tag) tags.add(log.tag);
    });
    return Array.from(tags);
  }, [mergedLogs]);

  const handleClearAllLogs = async () => {
    if (!window.confirm('Clear all logs on the server database as well? (Requires Admin/Owner)')) {
      // Just clear locally
      clearSocketLogs();
      setInitialLogs([]);
      return;
    }

    setIsClearingServer(true);
    setErrorFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/logs/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success) {
        clearSocketLogs();
        setInitialLogs([]);
      } else {
        throw new Error(data.message || 'Server refused to clear logs');
      }
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to purge server logs. Clearing client instead.');
      clearSocketLogs();
      setInitialLogs([]);
    } finally {
      setIsClearingServer(false);
    }
  };

  const handleCopyLogText = (log: Log) => {
    const logString = `[${log.timestamp || log.createdAt || new Date().toISOString()}] [${log.level}] [${log.tag}] ${log.message}`;
    navigator.clipboard.writeText(logString);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const downloadLogFile = () => {
    const rawContent = filteredLogs
      .map(log => `[${log.timestamp || log.createdAt}] [${log.level}] [${log.tag}] ${log.message}`)
      .join('\n');
    
    const blob = new Blob([rawContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `depmq_wa_panel_logs_${Date.now()}.log`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get Level Badge Styles
  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'ERROR':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          indicator: 'bg-red-500',
          icon: <AlertCircle className="w-3 h-3 text-red-400" />
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          indicator: 'bg-amber-500',
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />
        };
      case 'SUCCESS':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          indicator: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        };
      case 'INFO':
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          indicator: 'bg-blue-500',
          icon: <Info className="w-3 h-3 text-blue-400" />
        };
    }
  };

  const formatLogTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="w-full bg-[#0F172A]/90 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[580px] font-mono select-none">
      
      {/* Terminal Title Bar Header */}
      <div className="bg-[#090D16] px-5 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
            <Terminal className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              System Console Feed
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Live background runtime outputs</p>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all focus:outline-none ${
              autoScroll 
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={autoScroll ? 'Pause terminal streaming auto-scroll' : 'Resume terminal streaming auto-scroll'}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 animate-pulse" />}
            <span className="hidden md:inline">{autoScroll ? 'Streaming' : 'Paused'}</span>
          </button>

          <button
            onClick={downloadLogFile}
            disabled={filteredLogs.length === 0}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-lg transition-all focus:outline-none disabled:opacity-40"
            title="Download log outputs (.log)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClearAllLogs}
            disabled={isClearingServer}
            className="p-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 rounded-lg transition-all focus:outline-none"
            title="Purge database/local console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Filters & Search */}
      <div className="p-4 bg-[#0B101E] border-b border-slate-800/60 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Keyword Search */}
        <div className="md:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search keywords, events, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-[#090D16]/90 border border-slate-800/80 focus:border-indigo-500/60 rounded-lg py-2.5 pl-9 pr-4 text-white outline-none transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Level Selector */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full text-xs bg-[#090D16]/90 border border-slate-800/80 focus:border-indigo-500/60 rounded-lg py-2.5 pl-9 pr-3 text-white outline-none cursor-pointer appearance-none"
          >
            <option value="ALL">ALL LEVELS</option>
            <option value="INFO">INFO</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        {/* Tag Selector */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <Database className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full text-xs bg-[#090D16]/90 border border-slate-800/80 focus:border-indigo-500/60 rounded-lg py-2.5 pl-9 pr-3 text-white outline-none cursor-pointer appearance-none"
          >
            <option value="ALL">ALL TAGS</option>
            {uniqueTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {/* Local Feedback Messages */}
      {errorFeedback && (
        <div className="px-5 py-2 bg-red-950/40 border-b border-red-900/40 text-red-200 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{errorFeedback}</span>
        </div>
      )}

      {/* Terminal scroll container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 bg-[#070B13] space-y-1.5 selection:bg-indigo-500/30 selection:text-white"
        style={{ contentVisibility: 'auto' }}
      >
        {isLoading && filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <span className="w-5 h-5 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-[11px] uppercase tracking-widest">Establishing socket log stream...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-24 text-slate-600 text-xs flex flex-col items-center justify-center gap-2">
            <Terminal className="w-8 h-8 text-slate-800 stroke-[1.5]" />
            <p className="uppercase tracking-wider">No matching log records found</p>
            <p className="text-[10px] text-slate-700 lowercase">Try clearing query terms or tag filters</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const levelStyles = getLevelStyles(log.level);
            return (
              <div 
                key={log.id} 
                className="group flex flex-col md:flex-row items-start gap-2.5 p-2 bg-slate-950/20 hover:bg-slate-950/80 rounded-lg border border-transparent hover:border-slate-800/40 transition-all text-xs"
              >
                {/* Log Time metadata */}
                <span className="text-slate-500 shrink-0 font-mono text-[11px] pt-0.5">
                  [{formatLogTime(log.timestamp || log.createdAt)}]
                </span>

                {/* Level Tag & Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${levelStyles.bg}`}>
                    {levelStyles.icon}
                    {log.level}
                  </span>

                  {log.tag && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 text-[9px] uppercase font-bold tracking-wider">
                      {log.tag}
                    </span>
                  )}
                </div>

                {/* Main Log Message Content */}
                <span className={`flex-1 break-all text-slate-300 whitespace-pre-wrap font-mono ${
                  log.level === 'ERROR' ? 'text-red-300' : log.level === 'SUCCESS' ? 'text-emerald-300' : ''
                }`}>
                  {log.message}
                </span>

                {/* Quick copy buttons */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pl-2">
                  <button
                    onClick={() => handleCopyLogText(log)}
                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all focus:outline-none"
                    title="Copy full log line"
                  >
                    {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Info Bar */}
      <div className="bg-[#090D16] px-5 py-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <div>
          Showing {filteredLogs.length} of {mergedLogs.length} buffered log tracks
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Socket Status: CONNECTED
          </span>
          <span className="hidden md:inline">Memory Limit: 200 Logs</span>
        </div>
      </div>

    </div>
  );
};
