
import React, { useState } from 'react';
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
  colorClass: string;
}> = ({ onClick, icon, label, subLabel, colorClass }) => (
  <button
    onClick={onClick}
    className={`group relative w-64 h-24 bg-black/80 border border-dashed ${colorClass} hover:bg-green-900/10 transition-all duration-200 overflow-hidden flex items-center px-4 gap-4`}
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 ${colorClass.replace('border-', 'bg-')}`} />
    <div className={`${colorClass.replace('border-', 'text-')} group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <div className="flex flex-col items-start">
      <span className={`font-vt323 text-2xl tracking-widest ${colorClass.replace('border-', 'text-')} term-text-glow`}>
        {label}
      </span>
      <span className="text-gray-500 text-xs font-mono uppercase tracking-wider">
        {subLabel}
      </span>
    </div>
    <div className={`absolute right-2 top-2 w-2 h-2 ${colorClass.replace('border-', 'bg-')} opacity-50 group-hover:animate-ping`} />
  </button>
);

const MenuScene: React.FC<MenuSceneProps> = ({ setScene }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
      
      {/* Header ASCII-ish */}
      <div className="mb-12 text-center">
        <h1 className="font-vt323 text-6xl md:text-7xl text-green-500 term-text-glow mb-2 tracking-widest">
          MASTER_OF_CATS
        </h1>
        <div className="w-full h-px bg-green-900 mb-2 relative">
           <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-green-500 animate-linear-wipe" />
        </div>
        <p className="text-green-700 text-sm font-mono tracking-[0.3em] uppercase">
          Secure Connection Established // User: ROOT
        </p>
      </div>

      {/* Menu Grid */}
      <div className="flex flex-col gap-4 z-10">
        <MenuBtn 
          onClick={() => setScene('snake')}
          icon={<ShieldAlert size={32} />}
          label="./PATH_1.exe"
          subLabel="Security Bypass Protocol"
          colorClass="border-green-600"
        />
        <MenuBtn 
          onClick={() => setScene('cats')}
          icon={<Cat size={32} />}
          label="./PATH_2.exe"
          subLabel="Signal Interception"
          colorClass="border-blue-500"
        />
        <MenuBtn 
          onClick={() => setScene('nothing')}
          icon={<Skull size={32} />}
          label="./PATH_3.exe"
          subLabel="Void Sector"
          colorClass="border-red-600"
        />
      </div>

      {/* Footer */}
      <div className="mt-16 text-center opacity-60">
        <p className="text-green-800 text-xs font-mono">
          PRESS <strong className="text-green-400">[M]</strong> TO ABORT SESSION
        </p>
        <div className="mt-2 text-[10px] text-green-900 font-mono">
          v2.0.4 // CTF_BUILD // SIGNAL_BANDIT_MOD
        </div>
      </div>

      {/* Background Grid Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
        style={{ backgroundImage: 'linear-gradient(#0f0 1px, transparent 1px), linear-gradient(90deg, #0f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
    </div>
  );
};

export default MenuScene;
