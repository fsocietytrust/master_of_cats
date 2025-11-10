
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MenuScene from './scenes/MenuScene';
import SnakeScene from './scenes/SnakeScene';
import CatsScene from './scenes/CatsScene';
import NothingScene from './scenes/NothingScene';

export type Scene = 'menu' | 'snake' | 'cats' | 'nothing';

const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>('menu');
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Anti-dev-tools
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

    // Background Music
    bgMusicRef.current = new Audio('/melodie.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.25;

    const playMusic = () => {
        bgMusicRef.current?.play().catch(() => {
            // Silent fail if autoplay blocked
        });
        document.removeEventListener('click', playMusic);
    }
    document.addEventListener('click', playMusic, { once: true });

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
      bgMusicRef.current?.pause();
    };
  }, []);

  const renderScene = useCallback(() => {
    switch (scene) {
      case 'snake':
        return <SnakeScene setScene={setScene} />;
      case 'cats':
        return <CatsScene setScene={setScene} />;
      case 'nothing':
        return <NothingScene />;
      case 'menu':
      default:
        return <MenuScene setScene={setScene} />;
    }
  }, [scene]);

  return (
    <div className="bg-neutral-950 w-screen h-screen flex items-center justify-center overflow-hidden select-none p-4">
      {/* Monitor Bezel */}
      <div className="relative w-[1050px] h-[630px] bg-neutral-900 rounded-xl p-3 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-neutral-800">
        
        {/* Screen Container */}
        <div className="w-full h-full relative overflow-hidden rounded bg-black shadow-[inset_0_0_20px_rgba(0,0,0,1)] border border-green-900/30">
          
          {/* CRT Overlay Layers */}
          <div className="absolute inset-0 pointer-events-none z-[60] bg-[radial-gradient(circle,rgba(0,20,0,0)_60%,rgba(0,20,0,0.6)_100%)]" />
          <div className="scanlines" />
          
          {/* Rendered Content */}
          <div className="w-full h-full relative z-10">
             {renderScene()}
          </div>

          {/* Screen Glare */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl pointer-events-none z-[70]" />
        </div>

        {/* Power LED */}
        <div className="absolute bottom-4 right-8 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#00ff00] animate-pulse z-50" />
      </div>
    </div>
  );
};

export default App;
