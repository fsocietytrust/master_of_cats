import React, { useState, useEffect, useCallback, useRef } from 'react';
import MenuScene from './scenes/MenuScene';
import SnakeScene from './scenes/SnakeScene';
import CatsScene from './scenes/CatsScene';
import NothingScene from './scenes/NothingScene';

export type Scene = 'menu' | 'snake' | 'cats' | 'nothing';

const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>('menu');
  const [booted, setBooted] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && ['u', 'i', 'j', 'c'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === 'm') {
        setScene('menu');
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Simulated Boot
    const bootTimer = setTimeout(() => setBooted(true), 2000);

    // Background Music
    bgMusicRef.current = new Audio('/melodie.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.15;

    const playMusic = () => {
        bgMusicRef.current?.play().catch(() => {});
        document.removeEventListener('click', playMusic);
    }
    document.addEventListener('click', playMusic, { once: true });

    return () => {
      clearTimeout(bootTimer);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
      bgMusicRef.current?.pause();
    };
  }, []);

  const renderScene = useCallback(() => {
    switch (scene) {
      case 'snake': return <SnakeScene setScene={setScene} />;
      case 'cats': return <CatsScene setScene={setScene} />;
      case 'nothing': return <NothingScene />;
      case 'menu': default: return <MenuScene setScene={setScene} />;
    }
  }, [scene]);

  if (!booted) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-start justify-end p-10 font-mono text-green-500 text-xs md:text-sm overflow-hidden">
        <div className="mb-1">> KERNEL_INIT...</div>
        <div className="mb-1">> LOADING_MODULES [MOTANI_DB]... OK</div>
        <div className="mb-1">> ESTABLISHING_UPLINK...</div>
        <div className="mb-1 text-blue-400">> DETECTED_SIGNAL_INTERFERENCE...</div>
        <div className="text-red-500 animate-pulse">> WARNING: UNSAFE CONNECTION</div>
        <div className="animate-pulse text-white mt-2">_</div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] w-screen h-screen flex items-center justify-center overflow-hidden select-none p-4">
      {/* Monitor Shell */}
      <div className="relative w-full max-w-[1280px] aspect-video bg-[#111] rounded-lg p-4 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_150px_rgba(0,255,0,0.1)] border border-[#222] ring-1 ring-white/5">
        
        {/* Screen Bezel Inner */}
        <div className="w-full h-full relative overflow-hidden rounded bg-[#020402] shadow-[inset_0_0_100px_rgba(0,0,0,1)] border border-green-900/30">
          
          {/* CRT Effects */}
          <div className="scanlines" />
          <div className="scanline-bar" />
          <div className="absolute inset-0 pointer-events-none z-[60] bg-[radial-gradient(circle,rgba(0,0,0,0)_60%,rgba(0,20,0,0.5)_100%)]" />
          
          {/* Main Content */}
          <div className="w-full h-full relative z-10">
             {renderScene()}
          </div>

          {/* Screen Reflections */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl pointer-events-none z-[70]" />
        </div>

        {/* Status LED */}
        <div className="absolute bottom-5 right-10 flex gap-2 items-center">
            <span className="text-[9px] text-[#444] font-mono tracking-widest uppercase">SYSTEM_RDY</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#00ff41] animate-pulse" />
        </div>
        <div className="absolute bottom-5 left-10 text-[10px] text-[#333] font-mono tracking-[0.2em]">CTF_TERM_OS_v4.0</div>
      </div>
    </div>
  );
};

export default App;
