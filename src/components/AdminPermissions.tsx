import React, { useEffect, useState } from 'react';
import { User, Audiobook, Permission } from '../types';
import { 
  Key, 
  UserCheck, 
  UserMinus, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  Users,
  Layers,
  Unlock,
  Shield
} from 'lucide-react';

interface AdminPermissionsProps {
  authToken: string;
}

export function AdminPermissions({ authToken }: AdminPermissionsProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPermissionsData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/permissions', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setPermissions(data.permissions || []);
        // List all users to manage roles seamlessly, and use filter only on permissions dropdown options
        setUsers(data.users || []);
        setBooks(data.audiobooks || []);
      }
    } catch (err) {
      console.error('Failed to parse permission settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissionsData();
  }, [authToken]);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!selectedUserId || !selectedBookId) {
      setActionError('Escolha um usuário e um audiobook correspondente!');
      return;
    }

    try {
      const response = await fetch('/api/admin/permissions/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          audiobookId: selectedBookId
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao conceder permissão.');
      }

      setActionSuccess('Acesso concedido com sucesso!');
      setSelectedBookId('');
      fetchPermissionsData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleRevokeAccess = async (userId: string, audiobookId: string) => {
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch('/api/admin/permissions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId, audiobookId })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao revogar permissão.');
      }

      setActionSuccess('Acesso revogado com sucesso!');
      fetchPermissionsData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'USER') => {
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId, role: newRole })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao alterar perfil do usuário.');
      }

      setActionSuccess(`Perfil do usuário atualizado para ${newRole} com sucesso!`);
      fetchPermissionsData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Helper matching books and user permissions
  const getUserPermissions = (userId: string) => {
    return permissions.filter(p => p.userId === userId).map(p => {
      const book = books.find(b => b.id === p.audiobookId);
      return {
        permissionId: p.id,
        bookId: p.audiobookId,
        title: book ? book.title : 'Audiobook Deletado',
        status: book ? book.status : 'DESCONHECIDO'
      };
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Key className="h-7 w-7 text-indigo-400" />
          Controle de Permissões de Acesso
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie e audite direitos de leitura. Usuários com perfil USER só visualizam audiobooks autorizados neste painel. Administradores possuem acesso total implícito.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Grant form wrapper */}
        <div className="bg-[#111114] p-6 rounded-2xl border border-slate-850 space-y-5 h-fit">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-3.5">
            <Unlock className="h-4.5 w-4.5 text-indigo-400" />
            Conceder Novo Acesso
          </h3>

          <form onSubmit={handleGrantAccess} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                1. Selecione o Leitor (USER)
              </label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full p-2.5 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-150 cursor-pointer"
              >
                <option value="" className="bg-[#111114]">-- Escolha o leitor --</option>
                {users.filter(u => u.role !== 'ADMIN').map(u => (
                  <option key={u.id} value={u.id} className="bg-[#111114]">{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                2. Selecione o Audiobook
              </label>
              <select
                value={selectedBookId}
                onChange={e => setSelectedBookId(e.target.value)}
                className="w-full p-2.5 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-150 font-medium cursor-pointer"
              >
                <option value="" className="bg-[#111114]">-- Escolha o livro --</option>
                {books.map(b => (
                  <option key={b.id} value={b.id} className="bg-[#111114]">{b.title} ({b.status})</option>
                ))}
              </select>
            </div>

            {actionError && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-450 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedUserId || !selectedBookId}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              Conceder Permissão
            </button>
          </form>
        </div>

        {/* Detailed direct rights list table */}
        <div className="bg-[#111114] p-6 rounded-2xl border border-slate-850 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-3">
            <Users className="h-5 w-5 text-indigo-400" />
            Conselho Geral de Leitores e Permissões
          </h3>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-indigo-450 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2 font-mono">Sincronizando ACLs...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs italic font-sans">
              Nenhum leitor comum cadastrado ainda para atribuição de permissões.
            </div>
          ) : (
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {users.map((user) => {
                const userPerms = getUserPermissions(user.id);
                return (
                  <div key={user.id} className="p-4 rounded-xl border border-slate-855 bg-[#16161a]/40 hover:bg-[#16161a] transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-850/60 pb-2">
                      <div className="leading-tight">
                        <h4 className="text-xs font-black text-white">{user.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{user.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        {user.role === 'ADMIN' ? (
                          <>
                            <span className="p-1 px-2 font-mono text-[9px] uppercase font-bold border border-indigo-500/15 rounded bg-indigo-500/10 text-indigo-400">
                              Administrador ({user.role})
                            </span>
                            <button
                              onClick={() => handleChangeRole(user.id, 'USER')}
                              className="p-1 px-2 font-sans text-[9px] font-bold border border-rose-500/15 rounded bg-rose-500/10 text-rose-450 hover:bg-rose-500/20 transition-all flex items-center gap-0.5 cursor-pointer"
                              title="Remover direitos de Administrador"
                            >
                              <UserMinus className="h-3 w-3" />
                              Tornar User
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="p-1 px-2 font-mono text-[9px] uppercase font-bold border border-emerald-500/15 rounded bg-emerald-500/10 text-emerald-450">
                              Leitor ({user.role})
                            </span>
                            <button
                              onClick={() => handleChangeRole(user.id, 'ADMIN')}
                              className="p-1 px-2 font-sans text-[9px] font-bold border border-indigo-500/15 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-0.5 cursor-pointer"
                              title="Conceder direitos de Administrador"
                            >
                              <Shield className="h-3 w-3" />
                              Tornar Admin
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {user.role === 'ADMIN' ? (
                      <p className="text-[10px] text-indigo-300 italic py-1 pl-1 font-sans">
                        Administradores possuem acesso automático implícito a todos os audiobooks do sistema.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <h5 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          Audiobooks Autorizados ({userPerms.length})
                        </h5>
                        
                        {userPerms.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic py-1 pl-1 font-sans">Sem permissões registradas. Usuário com biblioteca vazia.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {userPerms.map((perm, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-850 bg-[#111114] shadow-sm text-xs gap-2 shrink-0">
                                <span className="font-bold text-slate-300 truncate" title={perm.title}>
                                  {perm.title}
                                </span>
                                <button
                                  onClick={() => handleRevokeAccess(user.id, perm.bookId)}
                                  className="p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                                  title="Revogar acesso"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
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
      </div>
    </div>
  );
}
