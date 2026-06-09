import React, { useEffect, useState } from 'react';
import { SystemLog } from '../types';
import { 
  FileTerminal, 
  Search, 
  RefreshCw, 
  Info, 
  AlertTriangle, 
  ShieldAlert,
  Archive,
  Layers
} from 'lucide-react';

interface AdminLogsProps {
  authToken: string;
}

export function AdminLogs({ authToken }: AdminLogsProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/logs', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [authToken]);

  // Filtering criteria
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === 'ALL' || log.level.toUpperCase() === levelFilter;
    
    return matchesSearch && matchesLevel;
  });

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-sky-400" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-amber-405" />;
      case 'error':
        return <ShieldAlert className="h-4 w-4 text-red-405" />;
      default:
        return <FileTerminal className="h-4 w-4 text-slate-400" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'info':
        return <span className="p-1 px-1.5 text-[9px] font-bold rounded bg-sky-500/10 border border-sky-500/15 text-sky-400">INFO</span>;
      case 'warn':
        return <span className="p-1 px-1.5 text-[9px] font-bold rounded bg-amber-500/10 border border-amber-500/15 text-amber-400">AVISO</span>;
      case 'error':
        return <span className="p-1 px-1.5 text-[9px] font-bold rounded bg-red-500/10 border border-red-500/15 text-red-400">ERRO</span>;
      default:
        return <span className="p-1 px-1.5 text-[9px] font-bold rounded bg-slate-800 text-slate-405">LOG</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileTerminal className="h-7 w-7 text-indigo-400" />
            Logs de Auditoria do Sistema
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Registro cronológico imutável de eventos de cadastro, logins, uploads, conversões e alterações de privilégios.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-400 bg-[#111114] border border-slate-800 hover:border-slate-700 transition-all rounded-xl cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading && 'animate-spin'}`} />
          Sincronizar Eventos
        </button>
      </div>

      {/* Audit control search panels */}
      <div className="bg-[#111114] p-5 rounded-2xl border border-slate-850 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-1/2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-full p-2 bg-[#16161a] border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500"
            placeholder="Buscar por ação ou mensagem..."
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`p-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer
                ${levelFilter === lvl 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-[#16161a] border border-slate-800/40 text-slate-400 hover:bg-[#202026]/40'}`}
            >
              {lvl === 'ALL' ? 'Todos' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main timeline listing structure */}
      <div className="bg-[#111114] rounded-2xl border border-slate-850 overflow-hidden">
        {loading ? (
          <div className="py-24 text-center font-sans">
            <div className="w-8 h-8 border-3 border-indigo-450 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 mt-2 font-mono">Consolidando registros federados...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center space-y-3 font-sans">
            <Archive className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum registro encontrado</h3>
            <p className="text-slate-500 text-xs">Tente ajustar seus termos ou seleções de relevância acima.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-850/40 text-xs text-slate-300">
            <div className="hidden md:grid grid-cols-12 p-3 px-6 bg-[#16161a]/60 font-bold uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-850/50">
              <div className="col-span-1">Grau</div>
              <div className="col-span-2">Ação</div>
              <div className="col-span-6">Mensagem Descritiva</div>
              <div className="col-span-3 text-right">Carimbo de Data/Hora</div>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-850/40">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 px-6 hover:bg-[#16161a]/30 transition-colors grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  {/* Severity Column */}
                  <div className="col-span-1 flex items-center gap-1.5">
                    {getLogIcon(log.level)}
                    {getLevelBadge(log.level)}
                  </div>

                  {/* Action Title */}
                  <div className="col-span-2 font-extrabold text-white text-xs">
                    {log.action}
                  </div>

                  {/* Detailed Description */}
                  <div className="col-span-6 text-slate-300 font-medium break-words leading-relaxed">
                    {log.message}
                  </div>

                  {/* Datetime stamp */}
                  <div className="col-span-3 text-left md:text-right font-mono text-[10px] text-slate-500">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
