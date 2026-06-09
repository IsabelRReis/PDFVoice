import React, { useEffect, useState } from 'react';
import { User, Track } from './types';
import { Sidebar } from './components/Sidebar';
import { AuthScreens } from './components/AuthScreens';
import { Library } from './components/Library';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUploads } from './components/AdminUploads';
import { AdminPermissions } from './components/AdminPermissions';
import { AdminLogs } from './components/AdminLogs';
import { AudioPlayer } from './components/AudioPlayer';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>('library');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);

  // Active audio state variables
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);

  // Session recovery check on init
  useEffect(() => {
    const savedToken = localStorage.getItem('auth-token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Sessão expirada.');
          return res.json();
        })
        .then(userData => {
          setUser(userData);
          setToken(savedToken);
          // Redirect by role on connection
          if (userData.role === 'ADMIN') {
            setActiveView('admin-dashboard');
          } else {
            setActiveView('library');
          }
        })
        .catch(err => {
          console.log('Session restoration failed:', err);
          localStorage.removeItem('auth-token');
        })
        .finally(() => {
          setCheckingSession(false);
        });
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleAuthSuccess = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('auth-token', userToken);
    
    // Redirect role: Route immediately
    if (userData.role === 'ADMIN') {
      setActiveView('admin-dashboard');
    } else {
      setActiveView('library');
    }
  };

  const handleLogout = () => {
    // Clear user state
    setUser(null);
    setToken(null);
    setCurrentTrack(null);
    setPlaylist([]);
    localStorage.removeItem('auth-token');
    setActiveView('library');
  };

  // Skip / Previous actions handlers
  const handleNextTrack = () => {
    if (playlist.length <= 1 || !currentTrack) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentTrack(playlist[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (playlist.length <= 1 || !currentTrack) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrack(playlist[prevIndex]);
  };

  const handleSelectTrack = (track: Track, currentPlaylist: Track[]) => {
    setPlaylist(currentPlaylist);
    setCurrentTrack(track);
  };

  // Loading Splash Screen while verifying auth
  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0C] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase font-mono">Restaurando Sessão Segura...</p>
      </div>
    );
  }

  // Not Authenticated Layout
  if (!user || !token) {
    return <AuthScreens onAuthSuccess={handleAuthSuccess} />;
  }

  // Active Authenticated Application layout (Collapsing sidebar + dynamically routed pages)
  return (
    <div id="app-viewport-wrapper" className="min-h-screen flex flex-col md:flex-row bg-[#0A0A0C] text-slate-300">
      {/* Role-based Sidebar Panel */}
      <Sidebar 
        user={user}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Primary scroll viewport */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 
          ${isSidebarCollapsed ? 'md:pl-0' : 'md:pl-0'}`}
      >
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {activeView === 'library' && (
              <Library 
                onSelectTrack={handleSelectTrack}
                currentTrack={currentTrack}
                authToken={token}
              />
            )}

            {activeView === 'admin-dashboard' && (
              <AdminDashboard 
                authToken={token} 
                onNavigate={setActiveView}
              />
            )}

            {activeView === 'admin-uploads' && (
              <AdminUploads 
                authToken={token}
              />
            )}

            {activeView === 'admin-permissions' && (
              <AdminPermissions 
                authToken={token}
              />
            )}

            {activeView === 'admin-logs' && (
              <AdminLogs 
                authToken={token}
              />
            )}
          </motion.div>
        </main>
      </div>

      {/* Ground fixed global playing bar controller */}
      <AudioPlayer 
        currentTrack={currentTrack}
        playlist={playlist}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        authToken={token}
      />
    </div>
  );
}
