
import React from 'react';
import { Skull } from 'lucide-react';

const NothingScene: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <div className="relative mb-6">
        <Skull className="text-red-600 w-24 h-24 animate-pulse" />
        <div className="absolute inset-0 text-red-500 blur-md opacity-50 animate-pulse">
             <Skull className="w-24 h-24" />
        </div>
      </div>
      
      <h1 className="text-4xl font-vt323 text-red-500 mb-2 tracking-[0.5em] term-text-glow">
        SYSTEM FAILURE
      </h1>
      <p className="text-red-800 font-mono text-sm">
        SECTOR 0x00 EMPTY / DATA CORRUPTED
      </p>
      
      <div className="mt-12 p-4 border border-red-900/30 bg-red-950/10 font-mono text-xs text-red-700 max-w-md">
        <p> scanning sector...</p>
        <p> 0 objects found</p>
        <p> 0 signals detected</p>
        <p className="animate-pulse"> fatal error: nothing is here</p>
      </div>
    </div>
  );
};

export default NothingScene;