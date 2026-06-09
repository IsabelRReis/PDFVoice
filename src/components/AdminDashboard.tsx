import React, { useEffect, useState } from 'react';
import { Audiobook } from '../types';
import { 
  Shield, 
  Settings, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Activity, 
  AlertTriangle,
  Clock,
  Loader2,
  FileText,
  Key
} from 'lucide-react';

interface AdminDashboardProps {
  authToken: string;
  onNavigate: (view: string) => void;
}

export function AdminDashboard({ authToken, onNavigate }: AdminDashboardProps) {
  const [metrics, setMetrics] = useState({
    usersCount: 0,
    booksCount: 0,
    readyCount: 0,
    processingCount: 0,
    failedCount: 0,
    ocrCount: 0
  });
  const [recentBooks, setRecentBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const users = await usersRes.json();

      // Fetch admin books
      const booksRes = await fetch('/api/admin/audiobooks', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const books = await booksRes.json();

      const userCount = Array.isArray(users) ? users.length : 0;
      const bCount = Array.isArray(books) ? books.length : 0;

      const ready = books.filter((b: any) => b.status === 'PRONTO').length;
      const processing = books.filter((b: any) => b.status === 'PROCESSANDO' || b.status === 'ENVIADO').length;
      const failed = books.filter((b: any) => b.status === 'FALHOU').length;
      const ocr = books.filter((b: any) => b.status === 'NECESSITA_OCR').length;

      setMetrics({
        usersCount: userCount,
        booksCount: bCount,
        readyCount: ready,
        processingCount: processing,
        failedCount: failed,
        ocrCount: ocr
      });

      setRecentBooks(books.slice(0, 5)); // show recent 5
    } catch (err) {
      console.error('Failed to parse dashboard numbers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [authToken]);

  const cards = [
    {
      title: 'Usuários Ativos',
      value: metrics.usersCount,
      desc: 'Instâncias cadastradas no sistema',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Total de PDFs',
      value: metrics.booksCount,
      desc: 'Audiobooks indexados',
      icon: BookOpen,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
    },
    {
      title: 'Prontos para escutar',
      value: metrics.readyCount,
      desc: 'Conversões concluídas',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Processando / Fila',
      value: metrics.processingCount,
      desc: 'Aguardando renderização de áudio',
      icon: Loader2,
      color: 'text-blue-600 bg-blue-50 border-blue-100 animate-pulse',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7 text-indigo-400" />
            Painel Central Administrador
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Supervisão e monitoramento das conversões de PDFs, permissões e saúde do servidor.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="self-start md:self-center px-4 py-2 bg-[#111114] border border-slate-800 hover:border-slate-700 text-indigo-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Activity className="h-4 w-4" />
          Recarregar Métricas
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-mono">Processando estatísticas...</p>
        </div>
      ) : (
        <>
          {/* Bento-grid Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="bg-[#111114] p-5 rounded-2xl border border-slate-850 flex items-center gap-4">
                  <span className={`p-3 rounded-xl border ${card.color.includes('indigo') ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/15' : card.color.includes('teal') ? 'text-teal-400 bg-teal-500/10 border-teal-500/15' : card.color.includes('emerald') ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' : 'text-blue-400 bg-blue-500/10 border-blue-500/15'}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-2xl font-black text-white tracking-tight font-sans">{card.value}</p>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">{card.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warnings & Process Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attention section */}
            <div className="bg-[#111114] p-6 rounded-2xl border border-slate-850 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Ações Necessárias
              </h3>
              
              <div className="space-y-3">
                {metrics.ocrCount > 0 && (
                  <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 text-slate-300 text-xs flex gap-3">
                    <FileText className="h-5 w-5 text-amber-550 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-400">{metrics.ocrCount} PDF(s) necessitam OCR</p>
                      <p className="text-slate-450 mt-0.5 leading-relaxed">O sistema não conseguiu extrair texto digital direto destes arquivos. Recomenda-se reenviar PDFs com texto selecionável.</p>
                    </div>
                  </div>
                )}

                {metrics.failedCount > 0 && (
                  <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/20 text-slate-300 text-xs flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-455 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-400">{metrics.failedCount} PDF(s) com Falha</p>
                      <p className="text-slate-455 mt-0.5 leading-relaxed">Falha ocorrida durante renderização ou estruturação na fila de áudio. Consulte os logs do sistema.</p>
                    </div>
                  </div>
                )}

                {metrics.ocrCount === 0 && metrics.failedCount === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs italic py-10">
                    Nenhuma anomalia de conversão pendente detectada! O servidor está saudável.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions and recent uploads list */}
            <div className="bg-[#111114] p-6 rounded-2xl border border-slate-850 lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-5 w-5 text-indigo-400" />
                  Últimos Uploads & Status
                </h3>
                <button 
                  onClick={() => onNavigate('admin-uploads')}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline text-xs font-bold cursor-pointer"
                >
                  Ver Todos
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Título</th>
                      <th className="pb-3 font-semibold">Tamanho / Faixas</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Cadastrado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-slate-305">
                    {recentBooks.map((book: any, idx) => (
                      <tr key={idx} className="hover:bg-[#16161a]/40 transition-colors">
                        <td className="py-3 font-bold text-white max-w-[180px] truncate">{book.title}</td>
                        <td className="py-3 font-medium">
                          {book.status === 'PRONTO' 
                            ? `${book.tracksCount} faixas (${Math.floor(book.duration / 60)}m)` 
                            : 'Pendente'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-transparent
                            ${book.status === 'PRONTO' && 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'}
                            ${book.status === 'PROCESSANDO' && 'bg-blue-500/10 text-blue-400 border-blue-500/15 animate-pulse'}
                            ${book.status === 'ENVIADO' && 'bg-slate-800 text-slate-355'}
                            ${book.status === 'NECESSITA_OCR' && 'bg-amber-500/10 text-amber-500 border-amber-500/15'}
                            ${book.status === 'FALHOU' && 'bg-rose-500/10 text-rose-455 border-rose-500/15'}
                          `}>
                            {book.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {new Date(book.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                    {recentBooks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500 italic">
                          Nenhum PDF enviado ainda. Vá na aba "Enviar PDFs" para iniciar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Access Menu Tiles */}
          <div className="bg-indigo-950/20 rounded-3xl p-6 text-white grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-indigo-500/15">
            <div className="space-y-3">
              <h3 className="text-xl font-extrabold tracking-tight">Atribuir Permissões Imediatas</h3>
              <p className="text-indigo-200/80 text-xs leading-relaxed">
                Admins podem conceder permissões imediatas de leitura. Leitores comuns (USER) só conseguem visualizar e reproduzir audiobooks que foram expressamente autorizados.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 md:justify-end">
              <button 
                onClick={() => onNavigate('admin-permissions')}
                className="px-5 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="h-4 w-4 text-white" />
                Gerenciar Acessos
              </button>
              <button 
                onClick={() => onNavigate('admin-uploads')}
                className="px-5 py-2.5 bg-transparent text-indigo-400 font-extrabold text-xs rounded-xl border border-indigo-500/20 hover:bg-indigo-500/10 transition-colors cursor-pointer"
              >
                Upload Novo PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
