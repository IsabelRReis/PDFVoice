import React, { useEffect, useState } from 'react';
import { Audiobook, Track } from '../types';
import { 
  Play, 
  Book, 
  Clock, 
  Layers, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

interface LibraryProps {
  onSelectTrack: (track: Track, playlist: Track[]) => void;
  currentTrack: Track | null;
  authToken: string;
}

export function Library({ onSelectTrack, currentTrack, authToken }: LibraryProps) {
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/library', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Falha ao buscar biblioteca. Verifique suas permissões.');
      }
      const data = await response.json();
      setBooks(data);
    } catch (err: any) {
      setError(err.message || 'Erro de rede ao carregar os livros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [authToken]);

  const loadTracks = async (bookId: string) => {
    setTracksLoading(true);
    setTracks([]);
    try {
      const response = await fetch(`/api/audiobooks/${bookId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Não foi possível carregar as faixas deste livro.');
      }
      const data = await response.json();
      setTracks(data.tracks);
    } catch (err: any) {
      console.error(err);
    } finally {
      setTracksLoading(false);
    }
  };

  const toggleBookExpand = (bookId: string) => {
    if (selectedBookId === bookId) {
      setSelectedBookId(null);
    } else {
      setSelectedBookId(bookId);
      loadTracks(bookId);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '0 min';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">ENVIADO</span>;
      case 'PROCESSANDO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 animate-pulse">PROCESSANDO</span>;
      case 'PRONTO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-450 flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> PRONTO</span>;
      case 'NECESSITA_OCR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500" title="PDF sem texto extraível">NECESSITA OCR</span>;
      case 'FALHOU':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-450">FALHOU</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Book className="h-7 w-7 text-indigo-400" />
            Minha Biblioteca
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Aqui estão os audiolivros que foram autorizados e liberados para você.
          </p>
        </div>
        <button
          onClick={fetchBooks}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-400 bg-[#111114] border border-slate-800 hover:border-slate-700 hover:bg-[#1c1c22] transition-all rounded-xl shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Livros
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase font-mono font-medium">Carregando Biblioteca...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/20 rounded-2xl border border-red-900/30 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h4 className="text-sm font-bold text-red-250">Falha na Conexão</h4>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="p-12 text-center bg-[#111114] rounded-2xl border border-slate-850 shadow-sm max-w-md mx-auto mt-10 space-y-4">
          <Layers className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-md font-bold text-slate-200">Nenhum Audiobook Liberado</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Seu usuário ainda não possui nenhum audiobook autorizado na biblioteca. Solicite permissão de acesso ao Administrador do sistema.
          </p>
          <div className="pt-2">
            <button 
              onClick={fetchBooks}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Verificar Novamente
            </button>
          </div>
        </div>
      ) : (
        /* Grid responsive cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const isExpanded = selectedBookId === book.id;
            return (
              <div 
                key={book.id}
                className={`bg-[#111114] rounded-2xl border border-slate-850 transition-all overflow-hidden relative flex flex-col justify-between 
                  ${isExpanded ? 'ring-2 ring-indigo-500 md:col-span-2 lg:col-span-3' : 'hover:border-slate-800'}`}
              >
                {/* Book Card Header */}
                <div className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h3 className="font-extrabold text-white tracking-tight text-base font-sans truncate">{book.title}</h3>
                      <div className="flex items-center space-x-2 text-slate-500 text-[11px] font-medium">
                        <span className="truncate max-w-[150px]">{book.originalPdf}</span>
                        <span>•</span>
                        <span>{getStatusBadge(book.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-xs pt-1.5 border-t border-slate-850">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      <span>{book.tracksCount} {book.tracksCount === 1 ? 'faixa' : 'faixas'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-4 w-4 text-indigo-400" />
                      <span>{formatDuration(book.duration)}</span>
                    </div>

                    <button
                      onClick={() => toggleBookExpand(book.id)}
                      disabled={book.status !== 'PRONTO'}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all
                        ${book.status === 'PRONTO'
                          ? 'border-slate-800 text-indigo-455 hover:bg-[#1c1c22] cursor-pointer'
                          : 'border-slate-900 text-slate-600 cursor-not-allowed bg-[#0f0f12]'}`}
                    >
                      {isExpanded ? (
                        <>Contrair <ChevronDown className="h-3.5 w-3.5" /></>
                      ) : (
                        <>Ver Faixas <ChevronRight className="h-3.5 w-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded tracks viewport */}
                {isExpanded && (
                  <div className="border-t border-slate-850 bg-[#0c0c0e]/80 p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Faixas de Áudio Disponíveis</h4>
                    {tracksLoading ? (
                      <div className="flex items-center gap-2 py-4">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-slate-400">Carregando faixas...</span>
                      </div>
                    ) : tracks.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3 italic">Nenhuma faixa disponível ou criada ainda.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tracks.map((track) => {
                          const isCurrentlyPlaying = currentTrack?.id === track.id;
                          return (
                            <button
                              key={track.id}
                              onClick={() => onSelectTrack(track, tracks)}
                              className={`flex items-center justify-between p-3 rounded-xl border bg-[#111114] shadow-sm hover:border-indigo-500/40 hover:bg-[#18181c]/55 transition-all text-left w-full group
                                ${isCurrentlyPlaying ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/10' : 'border-slate-850'}`}
                            >
                              <div className="min-w-0 pr-2">
                                <p className={`text-xs font-bold truncate ${isCurrentlyPlaying ? 'text-indigo-400' : 'text-slate-200'}`}>
                                  {track.title}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Faixa {track.order} • {Math.floor(track.duration / 60)}m {track.duration % 60}s</p>
                              </div>
                              <span className={`p-1.5 rounded-lg shrink-0 transition-colors
                                ${isCurrentlyPlaying 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                <Play className="h-3.5 w-3.5 fill-current" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
