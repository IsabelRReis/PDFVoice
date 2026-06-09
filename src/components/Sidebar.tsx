import React from 'react';
import { User } from '../types';
import { 
  BookOpen, 
  LayoutDashboard, 
  UploadCloud, 
  KeyRound, 
  FileTerminal, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  user: User;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ 
  user, 
  activeView, 
  onNavigate, 
  onLogout, 
  isCollapsed, 
  setIsCollapsed 
}: SidebarProps) {
  
  const isAdmin = user.role === 'ADMIN';

  const menuItems = [
    {
      id: 'library',
      label: 'Minha Biblioteca',
      icon: BookOpen,
      roles: ['USER', 'ADMIN'],
    },
    {
      id: 'admin-dashboard',
      label: 'Painel Central',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
    },
    {
      id: 'admin-uploads',
      label: 'Enviar PDFs',
      icon: UploadCloud,
      roles: ['ADMIN'],
    },
    {
      id: 'admin-permissions',
      label: 'Permissões',
      icon: KeyRound,
      roles: ['ADMIN'],
    },
    {
      id: 'admin-logs',
      label: 'Auditoria Logs',
      icon: FileTerminal,
      roles: ['ADMIN'],
    },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile top-bar display when collapsed or floating */}
      <div className="md:hidden bg-[#111114] border-b border-slate-800 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-indigo-500" />
          <span className="font-bold tracking-tight text-white font-sans text-md">PDFVoice</span>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 focus:outline-none"
        >
          {isCollapsed ? <Menu className="h-6 w-6" /> : <X className="h-6 w-6" />}
        </button>
      </div>

      {/* Main Sidebar Wrapper */}
      <div 
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#111114] text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-2xl transition-all duration-300
          ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64'} 
          h-screen md:sticky`}
      >
        <div className="flex flex-col">
          {/* Header branding and toggle */}
          <div className="p-6 flex items-center justify-between border-b border-slate-850">
            <div className={`flex items-center space-x-3 overflow-hidden ${isCollapsed && 'md:justify-center md:w-full'}`}>
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shrink-0">
                <div className="w-4 h-4 bg-white/20 rounded-sm rotate-45"></div>
              </div>
              {!isCollapsed && (
                <span className="font-bold text-lg text-white tracking-tight">
                  PDFVoice
                </span>
              )}
            </div>
            {!isCollapsed && (
              <button 
                onClick={() => setIsCollapsed(true)} 
                className="hidden md:block p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                title="Minimizar Sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Navigation link elements */}
          <nav className="p-4 space-y-1.5 flex-1">
            {isCollapsed && (
              <button 
                onClick={() => setIsCollapsed(false)}
                className="hidden md:flex w-full justify-center p-2.5 mb-4 text-slate-400 hover:text-white bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all shadow-sm"
                title="Maximizar Sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {!isCollapsed && (
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-2">Navegação</div>
            )}

            {visibleItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    // Close sidebar on mobile clicking navigation
                    if (window.innerWidth < 768) {
                      setIsCollapsed(true);
                    }
                  }}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group font-sans text-sm font-medium
                    ${isActive 
                      ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                      : 'text-slate-400 hover:text-white hover:bg-[#18181c]/50 font-medium'
                    } ${isCollapsed && 'md:justify-center'}`}
                >
                  <IconComp className={`h-5 w-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} ${!isCollapsed && 'mr-3'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User identification footer cards */}
        <div className="p-4 border-t border-slate-850 m-2 rounded-xl bg-slate-900/40">
          <div className={`flex items-center text-xs text-slate-300 ${isCollapsed ? 'md:justify-center mb-2' : 'mb-4'} space-x-2`}>
            <div className="p-1.5 bg-slate-800 rounded-lg shrink-0">
              {isAdmin ? <ShieldAlert className="h-4 w-4 text-amber-500" /> : <UserIcon className="h-4 w-4 text-teal-450" />}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="font-bold text-white truncate text-xs">{user.name}</p>
                <p className="text-[10px] text-indigo-400 truncate tracking-wide font-mono font-medium uppercase">{user.role}</p>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`w-full flex items-center p-2 rounded-xl text-red-400 hover:text-white hover:bg-red-950/25 transition-colors text-xs font-medium ${isCollapsed && 'md:justify-center'}`}
            title="Sair"
          >
            <LogOut className={`h-4 w-4 shrink-0 ${!isCollapsed && 'mr-3'}`} />
            {!isCollapsed && <span>Sair da Conta</span>}
          </button>
        </div>
      </div>
    </>
  );
}
