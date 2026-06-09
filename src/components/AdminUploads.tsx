import React, { useCallback, useState, useEffect } from 'react';
import { Audiobook } from '../types';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  HelpCircle,
  RefreshCw,
  FileDown,
  Trash2,
  RotateCcw
} from 'lucide-react';

interface AdminUploadsProps {
  authToken: string;
}

export function AdminUploads({ authToken }: AdminUploadsProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [allBooks, setAllBooks] = useState<Audiobook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const fetchAdminAudiobooks = async () => {
    setBooksLoading(true);
    try {
      const response = await fetch('/api/admin/audiobooks', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllBooks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBooksLoading(false);
    }
  };

  const handleReprocess = async (bookId: string) => {
    setActionLoading(bookId);
    try {
      const response = await fetch(`/api/admin/audiobooks/${bookId}/reprocess`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar reprocessamento.');
      }
      fetchAdminAudiobooks();
    } catch (err: any) {
      alert(err.message || 'Erro de rede ao reprocessar.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (bookId: string) => {
    setHistoryError(null);
    setActionLoading(bookId);
    try {
      const response = await fetch(`/api/admin/audiobooks/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir audiobook.');
      }
      setDeleteConfirmId(null);
      fetchAdminAudiobooks();
    } catch (err: any) {
      setHistoryError(err.message || 'Erro de rede ao excluir.');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchAdminAudiobooks();
    // Poll updates every 6 seconds to give instant feedback on processing!
    const interval = setInterval(fetchAdminAudiobooks, 6000);
    return () => clearInterval(interval);
  }, [authToken]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const pdfsOnly = filesArray.filter((f: any) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      
      if (pdfsOnly.length < filesArray.length) {
        setUploadError('Apenas arquivos no formato PDF são aceitos pelo sistema!');
      } else {
        setUploadError(null);
      }

      setSelectedFiles(pdfsOnly);
      setUploadSuccess(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Simulate step progress increments
      const progInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 150);

      const response = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
      });

      clearInterval(progInterval);
      setUploadProgress(100);

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao realizar upload dos PDFs.');
      }

      setUploadSuccess(true);
      setSelectedFiles([]);
      fetchAdminAudiobooks();
    } catch (err: any) {
      setUploadError(err.message || 'Erro de rede ao enviar arquivos.');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PRONTO':
        return 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400';
      case 'PROCESSANDO':
        return 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/20 animate-pulse';
      case 'ENVIADO':
        return 'bg-slate-800 border-slate-750 text-slate-300';
      case 'NECESSITA_OCR':
        return 'bg-amber-500/5 border-amber-500/20 text-amber-500';
      case 'FALHOU':
        return 'bg-rose-500/5 border shadow-none border-rose-500/20 text-rose-450';
      default:
        return 'bg-[#16161a] border-slate-800 text-slate-300';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="h-7 w-7 text-indigo-400" />
          Conversor & Upload de PDFs
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Selecione múltiplos arquivos PDF para extração e renderização sintética de áudio no servidor.
        </p>
      </div>

      {/* Collapsible Info Help Guide Panel */}
      <div className="bg-[#111114] border border-slate-850 rounded-2xl overflow-hidden transition-all duration-300">
        <button 
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-6 py-4 bg-[#16161a] hover:bg-[#1f1f26] transition-colors flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-500/15 text-indigo-400 rounded-xl">
              <HelpCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">💡 Guia de Uso, Limites & Comparativo de Vozes</h3>
              <p className="text-[11px] text-slate-500 font-medium">Informações cruciais sobre limites de arquivos, possíveis interferências e o seletor de vozes.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-400 select-none">
            {showGuide ? '[ OCULTAR GUIA ]' : '[ MOSTRAR GUIA ]'}
          </span>
        </button>

        {showGuide && (
          <div className="p-6 border-t border-slate-850 bg-[#0c0c0e]/30 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in line-clamp-none">
            {/* Guide Item 1 */}
            <div className="space-y-2 p-4 rounded-xl bg-[#16161a]/60 border border-slate-850">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold tracking-wider uppercase border border-emerald-500/20">
                1. Tamanho & Envio
              </span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Tamanho Máximo do PDF</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recomendamos o upload de arquivos PDF de até <strong className="text-white">15 MB</strong> para garantir rapidez e desempenho ideais no processamento.
                Arquivos maiores contendo centenas de páginas podem demorar alguns minutos ou atingir limites de timeout do servidor durante a síntese de voz (TTS).
              </p>
            </div>

            {/* Guide Item 2 */}
            <div className="space-y-2 p-4 rounded-xl bg-[#16161a]/60 border border-slate-850">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-extrabold tracking-wider uppercase border border-amber-500/20">
                2. Interferências
              </span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Possíveis Interferências</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Imagens pesadas, infográficos complexos, anotações de margem e rodapés muito longos embutidos no PDF podem gerar textos truncados, causando pequenas incoerências ou ruídos sutis na geração do áudio.
                Além disso, PDFs escaneados sem OCR ativado (imagens puras) não possuem fluxo de texto selecionável e farão o sistema acusar <strong className="text-amber-500">NECESSITA_OCR</strong>.
              </p>
            </div>

            {/* Guide Item 3 */}
            <div className="space-y-2 p-4 rounded-xl bg-[#16161a]/60 border border-slate-850">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-extrabold tracking-wider uppercase border border-indigo-500/20">
                3. Vozes & Reprodutor
              </span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Voz Servidor vs Voz Local</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-white">Voz do Servidor (Alta Qualidade):</strong> Qualidade impecável e entonação natural humana, perfeita para escuta contínua. Requer conexão de rede.<br />
                <strong className="text-white">Voz Local:</strong> Síntese de voz rápida fornecida pelo seu navegador. Implementamos um <strong className="text-indigo-400">seletor de vozes</strong> diretamente na barra de áudio (basta mudar para "Voz Local" e selecionar o leitor em português do seu aparelho)!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dropzone Attachment form */}
        <div className="bg-[#111114] p-6 rounded-2xl border border-slate-850 space-y-5 h-fit">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Enviar PDFs para o Processador</h3>
          
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-[#0c0c0e]/40 hover:bg-[#16161a]/60 transition-colors relative">
              <input 
                type="file" 
                multiple
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="h-10 w-10 text-slate-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-300">Clique ou Arraste múltiplos PDFs aqui</p>
              <p className="text-[10px] text-slate-500 mt-1">Apenas arquivos no formato (.pdf) são aceitos</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Arquivos selecionados ({selectedFiles.length})</p>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-2 bg-[#16161a] border border-slate-850 rounded-lg text-xs text-indigo-400 font-medium">
                      <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate flex-1 text-slate-200">{file.name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 bg-[#172e22]/30 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-start gap-2">
                <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>Upload e cadastro concluídos! O processador está convertendo as faixas em segundo plano.</span>
              </div>
            )}

            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold text-indigo-400">
                  <span>Enviando arquivos...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${uploadProgress}%` }}
                    className="h-full bg-indigo-600 rounded-full transition-all duration-350"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Transmitindo PDF...
                </>
              ) : (
                'Iniciar Conversão para Áudio'
              )}
            </button>
          </form>
        </div>

        {/* Real-time Status Lists table of existing uploads */}
        <div className="bg-[#111114] p-6 rounded-2xl border border-slate-850 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FileDown className="h-5 w-5 text-indigo-400" />
              Histórico de Conversões do Servidor
            </h3>
            <button
              onClick={fetchAdminAudiobooks}
              className="p-1.5 text-indigo-400 hover:bg-[#1a1a22] rounded-lg transition-colors cursor-pointer"
              title="Sincronizar statuses"
            >
              <RefreshCw className={`h-4 w-4 ${booksLoading && 'animate-spin'}`} />
            </button>
          </div>

          {historyError && (
            <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-start gap-2 animate-fade-in">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{historyError}</span>
                <button 
                  onClick={() => setHistoryError(null)} 
                  className="ml-2 underline font-sans text-[11px] text-slate-400 hover:text-white"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {booksLoading && allBooks.length === 0 ? (
            <div className="py-20 text-center font-sans">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Carregando lista de audiobooks...</p>
            </div>
          ) : allBooks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs italic font-sans animate-fade-in">
              Nenhum PDF cadastrado ou enviado para o servidor. Use o painel ao lado para enviar.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-850/40 pr-2 space-y-3.5">
              {allBooks.map((book) => (
                <div key={book.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${getStatusStyle(book.status)}`}>
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="text-sm font-bold truncate text-white">{book.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] opacity-75 font-medium text-slate-400">
                      <span>Ref: {book.originalPdf}</span>
                      <span>•</span>
                      <span>Cadastrado em {new Date(book.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {book.status === 'PRONTO' && (
                      <p className="text-[11px] font-semibold text-emerald-450 mt-1">
                        ✓ {book.tracksCount} faixas de áudio criadas ({Math.floor(book.duration / 60)}m {book.duration % 60}s)
                      </p>
                    )}
                    {book.status === 'PROCESSANDO' && (
                      <p className="text-[11px] font-semibold text-indigo-400 mt-1 animate-pulse">
                        ⌛ Extraindo texto do PDF e sintetizando faixas de áudio no servidor...
                      </p>
                    )}
                    {book.status === 'NECESSITA_OCR' && (
                      <p className="text-[11px] font-semibold text-amber-500 mt-1">
                        ⚠ PDF não contém texto selecionável compatível. Necessita OCR ou reenvio de arquivo digital padrão.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                    <span className="p-1 px-3 font-extrabold text-[10px] uppercase rounded-full bg-[#0c0c0e]/60 text-slate-300 tracking-wider">
                      {book.status}
                    </span>

                    {(book.status === 'FALHOU' || book.status === 'NECESSITA_OCR') && (
                      <button
                        onClick={() => handleReprocess(book.id)}
                        disabled={actionLoading !== null}
                        className="p-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/30 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Reprocessar arquivo PDF"
                      >
                        {actionLoading === book.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        <span>Reprocessar</span>
                      </button>
                    )}

                    {deleteConfirmId === book.id ? (
                      <div className="flex items-center gap-1.5 animate-fade-in">
                        <button
                          onClick={() => handleDelete(book.id)}
                          disabled={actionLoading !== null}
                          className="p-2 py-1 bg-red-650 hover:bg-red-700 text-white font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-md shadow-red-500/15"
                          title="Confirmar exclusão definitiva"
                        >
                          {actionLoading === book.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          <span>Confirmar?</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={actionLoading !== null}
                          className="p-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setHistoryError(null);
                          setDeleteConfirmId(book.id);
                        }}
                        disabled={actionLoading !== null}
                        className="p-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/30 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Excluir Audiobook"
                      >
                        {actionLoading === book.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
