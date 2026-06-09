import React, { useEffect, useRef, useState } from 'react';
import { Track } from '../types';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Music
} from 'lucide-react';

interface AudioPlayerProps {
  currentTrack: Track | null;
  playlist: Track[];
  onNext: () => void;
  onPrev: () => void;
  authToken: string;
}

export function AudioPlayer({ 
  currentTrack, 
  playlist, 
  onNext, 
  onPrev, 
  authToken 
}: AudioPlayerProps) {
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [useLocalVoice, setUseLocalVoice] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Load browser speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      const vList = window.speechSynthesis.getVoices();
      // Sort: Portuguese language voices first, then others alphabetically
      const sorted = [...vList].sort((a, b) => {
        const aPt = a.lang.startsWith('pt');
        const bPt = b.lang.startsWith('pt');
        if (aPt && !bPt) return -1;
        if (!aPt && bPt) return 1;
        return a.name.localeCompare(b.name);
      });
      setVoices(sorted);

      // Default to first Portuguese voice if has any, or first overall
      if (sorted.length > 0) {
        const defaultVoice = sorted.find(v => v.lang.startsWith('pt')) || sorted[0];
        setSelectedVoiceURI(prev => prev || defaultVoice.voiceURI);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Stop synthesis when player unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
      }
    };
  }, []);

  // Sync state when track changes
  useEffect(() => {
    if (currentTrack) {
      const isFallback = !!currentTrack.isFallback;
      setUseLocalVoice(isFallback);
      
      const savedPosition = localStorage.getItem(`resume-time-${currentTrack.id}`);
      const initialTime = savedPosition ? parseFloat(savedPosition) : 0;
      setCurrentTime(initialTime);
      
      // Reset any active local speaker
      window.speechSynthesis.cancel();
      setIsPlaying(true); // Auto-play track on selection
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack]);

  // Main playback engine coordinating streaming audio vs local SpeechSynthesis
  useEffect(() => {
    if (!currentTrack) {
      setIsPlaying(false);
      return;
    }

    if (useLocalVoice) {
      // Pause streaming audio element
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const textToSpeak = currentTrack.text || currentTrack.title;
      const cleanText = textToSpeak.replace(/\r?\n|\r/g, ' ');
      const wordsCount = cleanText.split(/\s+/).length;
      const estimatedDuration = Math.max(5, Math.ceil(wordsCount / 2.5));
      setDuration(estimatedDuration);

      if (isPlaying) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'pt-BR';
          
          // Select user-selected local voice or fallback to Portuguese matches
          const allVoices = window.speechSynthesis.getVoices();
          const chosenVoice = allVoices.find(v => v.voiceURI === selectedVoiceURI);
          if (chosenVoice) {
            utterance.voice = chosenVoice;
          } else {
            const ptVoice = allVoices.find(v => v.lang.startsWith('pt'));
            if (ptVoice) utterance.voice = ptVoice;
          }

          utterance.onend = () => {
            setIsPlaying(false);
            if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
            onNext();
          };

          utterance.onerror = () => {
            setIsPlaying(false);
          };

          window.speechSynthesis.speak(utterance);
        }

        if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            setCurrentTime(prev => {
              const nextVal = prev + 1;
              return nextVal >= estimatedDuration ? estimatedDuration : nextVal;
            });
          }
        }, 1000);
      } else {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
        }
        if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
      }

      return () => {
        if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
      };

    } else {
      // Cancel active speech synthesis
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);

      const audioUrl = `/api/tracks/${currentTrack.id}/stream?token=${encodeURIComponent(authToken)}`;

      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      } else if (audioRef.current.src !== window.location.origin + audioUrl) {
        audioRef.current.src = audioUrl;
      }

      const audio = audioRef.current;
      audio.volume = isMuted ? 0 : volume;

      const savedPosition = localStorage.getItem(`resume-time-${currentTrack.id}`);
      if (savedPosition) {
        const parsedTime = parseFloat(savedPosition);
        if (Math.abs(audio.currentTime - parsedTime) > 2) {
          audio.currentTime = parsedTime;
        }
      }

      const handleLoadedMetadata = () => {
        setDuration(audio.duration || currentTrack.duration || 10);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        localStorage.setItem(`resume-time-${currentTrack.id}`, audio.currentTime.toString());
      };

      const handleEnded = () => {
        onNext();
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      if (isPlaying) {
        audio.play().catch(err => {
          console.log('Playback stream deferred', err);
          setIsPlaying(false);
        });
      } else {
        audio.pause();
      }

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [currentTrack, isPlaying, useLocalVoice, selectedVoiceURI, authToken]);

  // Volume control effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  if (!currentTrack) return null;

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const seekSynthesis = (percentage: number) => {
    window.speechSynthesis.cancel();
    if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
    
    const textToSpeak = currentTrack.text || currentTrack.title;
    const cleanText = textToSpeak.replace(/\r?\n|\r/g, ' ');
    const words = cleanText.split(' ');
    
    const wordIndex = Math.floor((percentage / 100) * words.length);
    const remainingText = words.slice(wordIndex).join(' ');
    
    const wordsCount = cleanText.split(/\s+/).length;
    const estimatedDuration = Math.max(5, Math.ceil(wordsCount / 2.5));
    setDuration(estimatedDuration);
    
    const newCurrentTime = (percentage / 100) * estimatedDuration;
    setCurrentTime(newCurrentTime);

    if (isPlaying) {
      const utterance = new SpeechSynthesisUtterance(remainingText);
      utterance.lang = 'pt-BR';
      const allVoices = window.speechSynthesis.getVoices();
      const chosenVoice = allVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      } else {
        const ptVoice = allVoices.find(v => v.lang.startsWith('pt'));
        if (ptVoice) utterance.voice = ptVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
        onNext();
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
      
      synthIntervalRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          setCurrentTime(prev => {
            const nextTime = prev + 1;
            return nextTime >= estimatedDuration ? estimatedDuration : nextTime;
          });
        }
      }, 1000);
    }
  };

  const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercentage = parseFloat(e.target.value);
    if (useLocalVoice) {
      seekSynthesis(newPercentage);
    } else {
      if (!audioRef.current || duration === 0) return;
      const newTime = (newPercentage / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setIsMuted(false);
  };

  const restartTrack = () => {
    if (useLocalVoice) {
      seekSynthesis(0);
    } else {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      localStorage.removeItem(`resume-time-${currentTrack.id}`);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Switch between server and local browser speech voice
  const handleToggleVoiceMode = () => {
    if (useLocalVoice) {
      window.speechSynthesis.cancel();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setUseLocalVoice(prev => !prev);
  };

  return (
    <div 
      id="bottom-footer-player" 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#16161a] border-t border-slate-800 shadow-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3"
    >
      {/* Title & Metadata */}
      <div className="flex items-center space-x-3 w-full md:w-1/4">
        <span className="p-2.5 bg-slate-800/80 text-indigo-400 rounded-xl animate-pulse">
          <Music className="h-5 w-5" />
        </span>
        <div className="overflow-hidden leading-tight">
          <h4 className="text-sm font-bold text-white truncate font-sans">{currentTrack.title}</h4>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <p className="text-[11px] text-slate-500 truncate uppercase tracking-tighter">
              Faixa {currentTrack.order} de {playlist.length}
            </p>
            {useLocalVoice && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold border border-amber-500/25 tracking-tight">
                VOZ LOCAL {currentTrack.isFallback ? '(FALLBACK)' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls & Progress bar */}
      <div className="flex flex-col items-center gap-1.5 w-full md:w-2/4">
        {/* Buttons cluster */}
        <div className="flex items-center space-x-4">
          <button 
            type="button"
            onClick={restartTrack}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/30 transition-colors"
            title="Reiniciar faixa"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </button>

          <button 
            type="button"
            onClick={onPrev}
            disabled={playlist.length <= 1}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/30 transition-colors disabled:opacity-30"
            title="Anterior"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button 
            type="button"
            onClick={togglePlay}
            className="p-3 bg-white text-black hover:bg-slate-100 rounded-full shadow-lg shadow-white/5 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-black text-black" /> : <Play className="h-5 w-5 fill-black text-black translate-x-0.5" />}
          </button>

          <button 
            type="button"
            onClick={onNext}
            disabled={playlist.length <= 1}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/30 transition-colors disabled:opacity-30"
            title="Próxima"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Slider Bar */}
        <div className="flex items-center space-x-2.5 w-full">
          <span className="text-[10px] font-mono font-medium text-slate-500 min-w-[32px] text-right">
            {formatTime(currentTime)}
          </span>
          
          <div className="relative flex-1 group">
            <input 
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentPercentage}
              onChange={handleSliderChange}
              className="w-full h-1 bg-slate-800 cursor-pointer accent-indigo-500 hover:accent-indigo-400 appearance-none focus:outline-none rounded-lg"
            />
            {/* Custom Background progress overlay */}
            <div 
              style={{ width: `${currentPercentage}%` }}
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 pointer-events-none rounded-l-lg"
            />
          </div>

          <span className="text-[10px] font-mono font-medium text-slate-500 min-w-[32px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Additional Configurations */}
      <div className="hidden md:flex items-center justify-end space-x-3 w-full md:w-1/4">
        {/* Toggle Mode Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleVoiceMode}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all shrink-0 ${
              useLocalVoice 
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30' 
                : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
            title="Alternar entre Voz Real do Servidor e Voz Local do Navegador"
          >
            {useLocalVoice ? '🎙️ Voz Local' : '🌐 Voz Servidor'}
          </button>

          {useLocalVoice && voices.length > 0 && (
            <select
              value={selectedVoiceURI}
              onChange={(e) => {
                setSelectedVoiceURI(e.target.value);
                if (isPlaying) {
                  seekSynthesis(currentPercentage);
                }
              }}
              className="bg-slate-900 border border-slate-750 text-slate-300 text-[10px] font-sans font-bold rounded-lg px-2 py-1 max-w-[120px] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              title="Escolha a voz local do sintetizador do seu dispositivo"
            >
              {voices.map((voice, idx) => {
                const isPt = voice.lang.startsWith('pt');
                return (
                  <option key={`${voice.voiceURI}-${idx}`} value={voice.voiceURI} className={isPt ? 'font-bold text-indigo-400' : ''}>
                    {isPt ? '🇧🇷 ' : '🌐 '} {voice.name.replace(/Google/g, '').trim()}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="text-slate-400 hover:text-white transition-colors"
          title={isMuted ? 'Ativar som' : 'Mudar para mudo'}
        >
          {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5 text-red-500" /> : <Volume2 className="h-4.5 w-4.5" />}
        </button>

        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 rounded-lg bg-slate-800 accent-indigo-500 cursor-pointer"
        />

        <span className="p-1 px-1.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-bold border border-indigo-500/20 tracking-wider shrink-0">
          AUTO-SALVO
        </span>
      </div>
    </div>
  );
}
