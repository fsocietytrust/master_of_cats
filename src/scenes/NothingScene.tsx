import React from 'react';
import { Skull } from 'lucide-react';

const NothingScene: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <div className="relative mb-6">
        <Skull className="text-red-600 w-24 h-24 animate-pulse" />
      </div>
      <h1 className="text-4xl font-vt323 text-red-500 mb-2 tracking-[0.5em]">
        SYSTEM FAILURE
      </h1>
      <p className="text-red-800 font-mono text-sm">
        SECTOR EMPTY
      </p>
    </div>
  );
};

export default NothingScene;