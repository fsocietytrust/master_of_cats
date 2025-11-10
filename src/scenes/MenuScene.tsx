import React from 'react';
import type { Scene } from '../App';
import { Terminal, Cat, Skull, ShieldAlert } from 'lucide-react';

interface MenuSceneProps {
  setScene: (scene: Scene) => void;
}

const MenuBtn: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  borderColor: string;
  textColor: string;
}> = ({ onClick, icon, label, subLabel, borderColor, textColor }) => (
  <button
    onClick={onClick}
    className={`group relative w-full md:w-80 h-24 bg-black/90 border border-dashed ${borderColor} hover:bg-white/5 transition-all duration-200 overflow-hidden flex items-center px-6 gap-5`}
  >
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${textColor.replace('text-', 'bg-')} group-hover:w-2 transition-all`} />
    
    <div className={`${textColor} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
      {icon}
    </div>
    
    <div className="flex flex-col items-start">
      <span className={`font-vt323 text-3xl tracking-widest ${textColor} drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]`}>
        {label}
      </span>
      <span className="text-gray-500 text-xs font-mono uppercase tracking-wider group-hover:text-gray-300">
        {subLabel}
      </span>
    </div>
    
    <div className={`absolute right-2 top-2 w-1.5 h-1.5 ${textColor.replace('text-', 'bg-')} opacity-0 group-hover:opacity-100 animate-ping`} />
  </button>
);

const MenuScene: React.FC<MenuSceneProps> = ({ setScene }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
      
      {/* Header */}
      <div className="mb-12 text-center relative px-4">
        <div className="absolute -inset-4 bg-green-500/10 blur-xl rounded-full"></div>
        <h1 className="relative font-vt323 text-6xl md:text-8xl text-green-500 drop-shadow-[0_0_10px_rgba(0,255,65,0.8)] mb-2 tracking-widest glitch-text cursor-default">
          MASTER_OF_CATS
        </h1>
        <div className="w-full h-px bg-green-900 mb-2 overflow-hidden relative">
           <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-green-500 animate-[slide_2s_linear_infinite]" />
        </div>
        <p className="text-green-700 text-xs md:text-sm font-mono tracking-[0.4em] uppercase">
          Identify Signals // Decrypt the System
        </p>
      </div>

      {/* Menu Grid */}
      <div className="flex flex-col gap-4 z-10 w-full max-w-md px-6">
        <MenuBtn 
          onClick={() => setScene('snake')}
          icon={<ShieldAlert size={32} />}
          label="BREACH_PROTOCOL"
          subLabel="Snake Algorithm"
          borderColor="border-green-600"
          textColor="text-green-500"
        />
        <MenuBtn 
          onClick={() => setScene('cats')}
          icon={<Cat size={32} />}
          label="SIGNAL_BANDIT"
          subLabel="Locate Blue Signals"
          borderColor="border-cyan-500"
          textColor="text-cyan-400"
        />
        <MenuBtn 
          onClick={() => setScene('nothing')}
          icon={<Skull size={32} />}
          label="VOID_SECTOR"
          subLabel="Corrupted Data"
          borderColor="border-red-600"
          textColor="text-red-600"
        />
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center opacity-60">
        <p className="text-green-900 text-xs font-mono">
          PRESS <strong className="text-green-500">[M]</strong> TO RETURN TO ROOT
        </p>
      </div>

      {/* Background Grid Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
        style={{ backgroundImage: 'linear-gradient(#003300 1px, transparent 1px), linear-gradient(90deg, #003300 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
    </div>
  );
};

export default MenuScene;