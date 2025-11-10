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
    // Prevent Context Menu
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
          (e.ctrlKey && e.key.toUpperCase() === 'U')) {
        e.preventDefault();
      }
      if (e.key.toUpperCase() === 'M') {
        setScene('menu');
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Boot Sequence Simulation
    const bootTimer = setTimeout(() => setBooted(true), 3000);

    // Background Music
    bgMusicRef.current = new Audio('/melodie.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;

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
      <div className="w-screen h-screen bg-black flex flex-col items-start justify-end p-10 font-mono text-green-500 text-xs md:text-sm">
        <div className="mb-1"> KERNEL_INIT...</div>
        <div className="mb-1"> MOUNTING_VIRTUAL_DRIVES... [OK]</div>
        <div className="mb-1"> LOADING_ASSETS (MOTANI_DB)... [OK]</div>
        <div className="mb-1"> ESTABLISHING_SECURE_CONNECTION...</div>
        <div className="mb-1 text-blue-400"> DETECTED_SIGNAL_INTERFERENCE...</div>
        <div className="animate-pulse text-white mt-2">_</div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 w-screen h-screen flex items-center justify-center overflow-hidden select-none p-2 md:p-6">
      {/* Monitor Bezel */}
      <div className="relative w-full max-w-[1200px] aspect-video bg-neutral-900 rounded-xl p-4 shadow-[0_0_120px_rgba(0,0,0,0.9)] border border-neutral-800 ring-1 ring-white/5">
        
        {/* Screen Container */}
        <div className="w-full h-full relative overflow-hidden rounded-lg bg-black shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] border border-green-900/30">
          
          {/* CRT Overlay Layers */}
          <div className="absolute inset-0 pointer-events-none z-[60] crt-overlay" />
          <div className="scanline" />
          <div className="absolute inset-0 pointer-events-none z-[60] bg-[radial-gradient(circle,rgba(0,0,0,0)_40%,rgba(0,20,0,0.5)_100%)]" />
          
          {/* Rendered Content */}
          <div className="w-full h-full relative z-10">
             {renderScene()}
          </div>

          {/* Screen Glare */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl pointer-events-none z-[70]" />
        </div>

        {/* Power LED */}
        <div className="absolute bottom-4 right-8 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_#00ff00] animate-pulse z-50" />
        <div className="absolute bottom-4 left-8 text-[10px] text-neutral-600 font-mono tracking-widest">SECURE_TERM_V3.1</div>
      </div>
    </div>
  );
};

export default App;