
import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import type { Scene } from '../App';
import type { Motan, Obiect } from '../types';
import { Cat, Box, Wifi, Activity, CheckCircle2, AlertTriangle, Info, Minus, ChevronUp, Router } from 'lucide-react';

interface CatsSceneProps {
  setScene: (scene: Scene) => void;
}

const MOTANI_TOTAL = 18;
const OBIECTE_TOTAL = 18;
const MOTANI_HIDDEN = 5;
const TUNNEL_PAIRS = 3;
const TOP_BAR_HEIGHT = 60; // Height of HUD (48px) + padding

// --- UTILS ---
const preloadImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(src);
    img.onerror = () => reject(src);
  });
};

interface TunnelNode {
  id: string;
  x: number;
  y: number;
  pairId: string;
  color: string;
}

const GameEntity = forwardRef<HTMLDivElement, { 
  src: string; 
  type: 'motan' | 'object'; 
  size: number;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  isGlitching?: boolean;
}>(({ src, type, size, onClick, onMouseDown, style, className, isGlitching }, ref) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      ref={ref}
      className={`${className} flex items-center justify-center`}
      style={style}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {/* Inner container handles visual effects like glitching so outer div transform (position) isn't overridden */}
      <div className={`entity-inner w-full h-full flex items-center justify-center ${isGlitching ? 'glitch-active' : ''}`}>
        {!hasError ? (
          <img 
            src={src} 
            alt={type}
            className={`w-full h-full object-contain pointer-events-none drop-shadow-[0_0_5px_rgba(0,255,0,0.3)]`}
            onError={() => setHasError(true)}
            draggable={false}
          />
        ) : (
          <div className={`relative w-full h-full flex flex-col items-center justify-center bg-black/90 border ${type === 'motan' ? 'border-blue-500/50' : 'border-orange-500/50'} select-none overflow-hidden`}>
             <div className={`absolute inset-0 opacity-20 ${type === 'motan' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
             <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-500 animate-pulse"></div>
             
             {type === 'motan' ? (
               <Cat size={size * 0.5} className="text-blue-400 animate-pulse" />
             ) : (
               <Box size={size * 0.5} className="text-orange-400" />
             )}
             
             <div className="absolute -bottom-0 w-full text-[8px] font-mono text-black bg-red-500 text-center font-bold">
               ERR_404
             </div>
          </div>
        )}
      </div>
    </div>
  );
});
GameEntity.displayName = 'GameEntity';

const TerminalLog: React.FC<{ logs: string[] }> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, minimized]);

  return (
    <div 
      className={`absolute right-4 bottom-4 w-64 bg-black/80 border border-green-800/50 rounded font-mono text-xs overflow-hidden flex flex-col z-40 backdrop-blur-md shadow-[0_0_20px_rgba(0,20,0,0.5)] transition-all duration-300 ${minimized ? 'h-8' : 'h-48'}`}
    >
      <div className="bg-green-900/30 px-2 py-1 text-green-400 border-b border-green-800/50 flex justify-between items-center cursor-pointer hover:bg-green-900/50 transition-colors" onClick={() => setMinimized(!minimized)}>
        <div className="flex items-center gap-2">
            <span className="font-bold">SYSTEM_LOG</span>
            {!minimized && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
        </div>
        <button className="text-green-500 hover:text-green-300">
            {minimized ? <ChevronUp size={14}/> : <Minus size={14}/>}
        </button>
      </div>
      
      {!minimized && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 text-green-300/80 scrollbar-thin select-text">
          {logs.map((log, i) => (
            <div key={i} className="break-words leading-tight font-vt323 tracking-wider text-sm">
              <span className="opacity-50 mr-1">{`>`}</span>
              <span className={log.includes("ERR") || log.includes("FAIL") ? "text-red-400" : "text-green-300"}>{log}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CatsScene: React.FC<CatsSceneProps> = ({ setScene }) => {
  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("INITIALIZING PROTOCOLS...");
  const [missingAssets, setMissingAssets] = useState<string[]>([]);

  // Game State
  const [foundCount, setFoundCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [scannerLevel, setScannerLevel] = useState(0);
  
  const motaniRef = useRef<Motan[]>([]);
  const obiecteRef = useRef<Obiect[]>([]);
  const tunnelsRef = useRef<TunnelNode[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastScannerUpdateRef = useRef<number>(0);
  
  // Audio Refs
  const miauSounds = useRef<HTMLAudioElement[]>([]);
  
  const dragRef = useRef<{ id: number; startX: number; startY: number; initialLeft: number; initialTop: number; } | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString('en-US', {hour12:false, minute:'2-digit', second:'2-digit'})} ${msg}`]);
  }, []);

  // --- ASSET LOADING & INITIALIZATION ---
  useEffect(() => {
    let mounted = true;

    const initGame = async () => {
      // 1. Check Assets
      const assetsToCheck: string[] = [];
      for(let i=1; i<=MOTANI_TOTAL; i++) assetsToCheck.push(`/motan_${i}.png`);
      for(let i=1; i<=OBIECTE_TOTAL; i++) assetsToCheck.push(`/obiect_${i}.png`);

      let loaded = 0;
      const missing: string[] = [];

      for (const asset of assetsToCheck) {
        if(!mounted) return;
        try {
          await preloadImage(asset);
          loaded++;
          setLoadingStatus(`VERIFYING ASSET: ${asset.split('/').pop()} [OK]`);
        } catch (e) {
          missing.push(asset);
          setLoadingStatus(`ERROR: MISSING ${asset.split('/').pop()}`);
        }
        setLoadingProgress(Math.floor((loaded / assetsToCheck.length) * 100));
        await new Promise(r => setTimeout(r, 5)); 
      }

      if (missing.length > 0) {
        setMissingAssets(missing);
        addLog(`CRITICAL: ${missing.length} ASSETS MISSING FROM /public`);
        setTimeout(() => setIsLoading(false), 3500);
      } else {
        setLoadingStatus("ALL SYSTEMS OPERATIONAL. STARTING...");
        setTimeout(() => setIsLoading(false), 800);
      }

      // 2. Setup Sounds
      miauSounds.current = [];
      for(let i=1; i<=MOTANI_TOTAL; i++) {
          const audio = new Audio(`/miau_${i}.wav`);
          audio.volume = 0.6;
          miauSounds.current.push(audio);
      }

      // 3. Setup Game Entities
      // We use estimated bounds here, but collision loop handles exacts.
      const newMotani: Motan[] = [];
      for (let i = 1; i <= MOTANI_TOTAL; i++) {
        const size = 40 + Math.random() * 30;
        newMotani.push({
          id: i,
          x: Math.random() * (1000 - size),
          y: TOP_BAR_HEIGHT + Math.random() * (540 - TOP_BAR_HEIGHT - size),
          dx: (Math.random() - 0.5) * 1.5,
          dy: (Math.random() - 0.5) * 1.5,
          size,
          angle: Math.random() * 360,
          dAngle: (Math.random() - 0.5),
          found: false,
          isHidden: false,
          lastTeleportTime: 0,
          element: null
        });
      }

      const newObiecte: Obiect[] = [];
      for (let j = 1; j <= OBIECTE_TOTAL; j++) {
        const size = 70 + Math.random() * 60;
        newObiecte.push({
          id: j,
          x: Math.random() * (1000 - size),
          y: TOP_BAR_HEIGHT + Math.random() * (540 - TOP_BAR_HEIGHT - size),
          size,
          assignedMotanId: null,
          element: null
        });
      }

      // 4. Setup Tunnels
      const newTunnels: TunnelNode[] = [];
      const getRandomSafePos = () => {
        let x = 0, y = 0;
        let valid = false;
        let attempts = 0;
        while(!valid && attempts < 100) {
            x = 60 + Math.random() * 800;
            y = TOP_BAR_HEIGHT + 20 + Math.random() * (450 - TOP_BAR_HEIGHT);
            const inLogArea = x > 700 && y > 380;
            if(!inLogArea) valid = true;
            attempts++;
        }
        return {x, y};
      };

      for (let t = 0; t < TUNNEL_PAIRS; t++) {
          const idA = `tunnel-${t}-A`;
          const idB = `tunnel-${t}-B`;
          const posA = getRandomSafePos();
          const posB = getRandomSafePos();
          const colorClass = t === 0 ? 'border-cyan-500 text-cyan-500' : (t === 1 ? 'border-purple-500 text-purple-500' : 'border-yellow-500 text-yellow-500');
          newTunnels.push({ id: idA, x: posA.x, y: posA.y, pairId: idB, color: colorClass });
          newTunnels.push({ id: idB, x: posB.x, y: posB.y, pairId: idA, color: colorClass });
      }
      tunnelsRef.current = newTunnels;

      // Hide logic
      const shuffled = newMotani.map((_, i) => i).sort(() => 0.5 - Math.random());
      for (let k = 0; k < MOTANI_HIDDEN; k++) {
        const mIdx = shuffled[k];
        if (newMotani[mIdx] && newObiecte[k]) {
          newMotani[mIdx].isHidden = true;
          // Center cat under object
          newMotani[mIdx].x = newObiecte[k].x + (newObiecte[k].size - newMotani[mIdx].size) / 2;
          newMotani[mIdx].y = newObiecte[k].y + (newObiecte[k].size - newMotani[mIdx].size) / 2;
          newMotani[mIdx].dx = 0;
          newMotani[mIdx].dy = 0;
          newObiecte[k].assignedMotanId = newMotani[mIdx].id;
        }
      }

      motaniRef.current = newMotani;
      obiecteRef.current = newObiecte;
      setFoundCount(0);
      addLog("SCANNER INITIALIZED. FIND BLUE SIGNALS.");
    };

    initGame();
    return () => { mounted = false; };
  }, [addLog]);

  // --- ANIMATION LOOP ---
  useEffect(() => {
    if(isLoading) return;

    const animate = (time: number) => {
      // Dynamic boundaries based on actual container size
      const bounds = gameAreaRef.current ? gameAreaRef.current.getBoundingClientRect() : { width: 1024, height: 600 };
      const maxX = bounds.width;
      const maxY = bounds.height;

      motaniRef.current.forEach(m => {
        if (!m.element) return;

        // Handle Found Animation (Exit)
        if (m.found) {
          if (m.foundTime) {
            const elapsed = time - m.foundTime;
            if (elapsed < 300) { // 300ms fade out
               const progress = elapsed / 300;
               const scale = 1 - progress; 
               const opacity = 1 - progress;
               // Force styles even if React re-renders
               m.element.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${m.angle}deg) scale(${scale})`;
               m.element.style.opacity = opacity.toString();
            } else {
               // Done
               m.element.style.opacity = '0';
               m.element.style.transform = 'scale(0)';
               m.element.style.pointerEvents = 'none';
            }
          }
          return; // Skip movement logic for found cats
        }

        if (m.isHidden) {
          // Sync hidden cat with assigned object (in case object is dragged)
          const obj = obiecteRef.current.find(o => o.assignedMotanId === m.id);
          if (obj) {
              // We use the object position so they stay together
              m.element.style.transform = `translate(${m.x}px, ${m.y}px)`;
              m.element.style.opacity = '0';
              m.element.style.pointerEvents = 'none';
          }
        } else {
          // Movement Logic only for visible, unfound cats
          m.x += m.dx;
          m.y += m.dy;
          m.angle += m.dAngle;

          // Proper Collision with bounds
          if (m.x <= 0) {
             m.x = 0;
             m.dx = Math.abs(m.dx);
          } else if (m.x >= maxX - m.size) {
             m.x = maxX - m.size;
             m.dx = -Math.abs(m.dx);
          }

          if (m.y <= TOP_BAR_HEIGHT) {
             m.y = TOP_BAR_HEIGHT;
             m.dy = Math.abs(m.dy);
          } else if (m.y >= maxY - m.size) {
             m.y = maxY - m.size;
             m.dy = -Math.abs(m.dy);
          }

          // Tunnel Logic
          if (time - (m.lastTeleportTime || 0) > 2000) {
              for (const tunnel of tunnelsRef.current) {
                  const cx = tunnel.x + 24;
                  const cy = tunnel.y + 24;
                  const mx = m.x + m.size / 2;
                  const my = m.y + m.size / 2;
                  
                  if (Math.hypot(mx - cx, my - cy) < 30) {
                      const exit = tunnelsRef.current.find(t => t.id === tunnel.pairId);
                      if (exit) {
                          m.x = exit.x - m.size / 2 + 24;
                          m.y = exit.y - m.size / 2 + 24;
                          m.lastTeleportTime = time;
                          
                          // Apply glitch to INNER element to avoid overriding position transform
                          const inner = m.element.querySelector('.entity-inner');
                          if (inner) {
                            inner.classList.add('glitch-active');
                            setTimeout(() => inner.classList.remove('glitch-active'), 500);
                          }
                          
                          if(Math.random() > 0.7) addLog(`PACKET #${m.id} REROUTED VIA PORT ${tunnel.id.split('-')[1]}`);
                      }
                      break;
                  }
              }
          }
          
          // Apply Transform for active cats
          const scale = 1 + 0.03 * Math.sin(time * 0.002 + m.id);
          m.element.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${m.angle}deg) scale(${scale})`;
          
          // Ensure visibility (fix for potential race conditions)
          m.element.style.opacity = '1';
          m.element.style.pointerEvents = 'auto';
        }
      });

      // Objects Loop
      obiecteRef.current.forEach(o => {
        if (o.element) {
          // Use transform exclusively for positioning
          const floatY = !dragRef.current && !o.assignedMotanId ? Math.sin(time * 0.002 + o.id) * 5 : 0;
          o.element.style.transform = `translate(${o.x}px, ${o.y + floatY}px)`;
        }
      });
      
      // Scanner Logic
      if (time - lastScannerUpdateRef.current > 200) { 
          let maxProx = 0;
          motaniRef.current.forEach(m => {
            if (m.isHidden && !m.found) {
              const cx = m.x + m.size / 2;
              const cy = m.y + m.size / 2;
              const dist = Math.hypot(mousePos.current.x - cx, mousePos.current.y - cy);
              if (dist < 150) {
                const prox = Math.max(0, (150 - dist) / 1.5);
                if (prox > maxProx) maxProx = prox;
              }
            }
          });
          
          setScannerLevel(prev => {
             if (Math.abs(prev - maxProx) > 5) return prev + (maxProx - prev) * 0.5;
             return prev;
          });
          lastScannerUpdateRef.current = time;
      }
      
      // Reveal Check
      obiecteRef.current.forEach(o => {
          if(o.assignedMotanId) {
              const m = motaniRef.current.find(x => x.id === o.assignedMotanId);
              if(m && m.isHidden) {
                  const dist = Math.hypot((o.x) - (m.x), (o.y) - (m.y));
                  if(dist > o.size * 0.6) {
                      m.isHidden = false;
                      m.dx = (Math.random() - 0.5) * 3;
                      m.dy = (Math.random() - 0.5) * 3;
                      addLog(`INTERFERENCE CLEARED. SIGNAL #${m.id} EXPOSED.`);
                      o.assignedMotanId = null; 
                  }
              }
          }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isLoading, addLog]);

  // Play a specific miau sound
  const playSound = (preferredIndex: number = -1) => {
      if(miauSounds.current.length === 0) return;
      let sound: HTMLAudioElement;
      if(preferredIndex >= 0 && preferredIndex < miauSounds.current.length) {
          sound = miauSounds.current[preferredIndex];
      } else {
          sound = miauSounds.current[Math.floor(Math.random() * miauSounds.current.length)];
      }
      if(sound) {
          sound.currentTime = 0;
          sound.play().catch(() => {});
      }
  };

  const handleMotanClick = (motanId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const motan = motaniRef.current.find(m => m.id === motanId);
    
    if (motan && !motan.found && !motan.isHidden) {
      motan.found = true; 
      motan.foundTime = performance.now(); // Mark for animation
      playSound(motan.id - 1);
      
      if (motan.element) {
        // Trigger Glitch on inner content immediately
        const inner = motan.element.querySelector('.entity-inner');
        inner?.classList.add('glitch-active');
        
        // Visual feedback (popup)
        const popup = document.createElement('div');
        popup.textContent = `[ID_${motan.id}_DECRYPTED]`;
        popup.className = 'absolute text-green-500 font-vt323 text-xl pointer-events-none z-50 animate-ping';
        popup.style.left = `${e.clientX - gameAreaRef.current!.getBoundingClientRect().left}px`;
        popup.style.top = `${e.clientY - gameAreaRef.current!.getBoundingClientRect().top - 20}px`;
        gameAreaRef.current?.appendChild(popup);
        setTimeout(() => popup.remove(), 800);
      }
      
      addLog(`BLUE SIGNAL CAPTURED: ${foundCount + 1}/${MOTANI_TOTAL}`);
      setFoundCount(prev => {
        const newCount = prev + 1;
        if (newCount === MOTANI_TOTAL) {
          setTimeout(() => setGameWon(true), 1000);
          addLog("ALL SIGNALS ACQUIRED. GENERATING FLAG...");
        }
        return newCount;
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const obj = obiecteRef.current.find(o => o.id === dragRef.current?.id);
      if (obj) {
        let newX = dragRef.current.initialLeft + dx;
        let newY = dragRef.current.initialTop + dy;

        // Bounds for dragging
        if (gameAreaRef.current) {
           const bounds = gameAreaRef.current.getBoundingClientRect();
           if (newX < 0) newX = 0;
           if (newX > bounds.width - obj.size) newX = bounds.width - obj.size;
           if (newY < TOP_BAR_HEIGHT) newY = TOP_BAR_HEIGHT;
           if (newY > bounds.height - obj.size) newY = bounds.height - obj.size;
        }

        obj.x = newX;
        obj.y = newY;
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent, objId: number) => {
    e.preventDefault(); 
    e.stopPropagation();
    playSound();

    const obj = obiecteRef.current.find(o => o.id === objId);
    if (obj) {
      dragRef.current = { id: objId, startX: e.clientX, startY: e.clientY, initialLeft: obj.x, initialTop: obj.y };
      if (obj.element) {
          obj.element.style.zIndex = '20';
          obj.element.style.filter = 'brightness(1.2) sepia(1) hue-rotate(180deg) saturate(2) drop-shadow(0 0 8px #00ff41)';
          obj.element.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      const obj = obiecteRef.current.find(o => o.id === dragRef.current?.id);
      if (obj && obj.element) {
          obj.element.style.zIndex = '10';
          obj.element.style.filter = 'none';
          obj.element.style.cursor = 'move';
      }
      dragRef.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center font-mono p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,20,0,0)_0%,rgba(0,50,0,0.1)_100%)] pointer-events-none" />
        <div className="w-96 mb-4">
           <div className="flex justify-between text-green-500 text-xs mb-1">
             <span>SYSTEM_BOOT</span>
             <span>{loadingProgress}%</span>
           </div>
           <div className="w-full h-2 bg-green-900/30 border border-green-700">
             <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${loadingProgress}%` }} />
           </div>
        </div>
        <div className="font-vt323 text-xl text-green-400 tracking-wider mb-8 text-center">
          {loadingStatus}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden cursor-crosshair bg-neutral-950" ref={gameAreaRef}>
      
      {/* Scanner HUD - Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10" 
        style={{ backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)', backgroundSize: '50px 50px', transform: `translate(${mousePos.current.x * -0.05}px, ${mousePos.current.y * -0.05}px)` }}
      />

      {/* DATA TUNNELS */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30">
          {tunnelsRef.current.map((tunnel, i) => {
              if(tunnel.id.endsWith('B')) return null;
              const pair = tunnelsRef.current.find(t => t.id === tunnel.pairId);
              if(!pair) return null;
              return (
                <line 
                    key={`line-${i}`}
                    x1={tunnel.x + 24} y1={tunnel.y + 24}
                    x2={pair.x + 24} y2={pair.y + 24}
                    stroke={tunnel.color.includes('cyan') ? 'cyan' : (tunnel.color.includes('purple') ? 'purple' : 'yellow')}
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    className="animate-pulse"
                />
              );
          })}
      </svg>

      {tunnelsRef.current.map((tunnel) => (
          <div 
            key={tunnel.id}
            className={`absolute w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center z-0 ${tunnel.color}`}
            style={{ left: tunnel.x, top: tunnel.y }}
          >
              <div className={`w-8 h-8 rounded-full border border-dotted opacity-50 animate-[spin_4s_linear_infinite] ${tunnel.color.replace('text', 'border')}`} />
              <Router size={14} className={`animate-pulse ${tunnel.color}`} />
              <div className="absolute -bottom-4 text-[8px] font-mono opacity-70 whitespace-nowrap">DATA_PORT_{tunnel.id.split('-')[1]}</div>
          </div>
      ))}

      {/* Scanner Cursor Effect */}
      <div className="absolute inset-0 pointer-events-none z-30"
           style={{ background: `radial-gradient(circle at ${mousePos.current.x}px ${mousePos.current.y}px, rgba(0, 255, 65, ${scannerLevel * 0.002}), transparent 200px)` }}
      >
        <div className="absolute border border-green-500 rounded-full transition-all duration-75 ease-out opacity-50"
            style={{
                width: `${40 + scannerLevel * 0.5}px`,
                height: `${40 + scannerLevel * 0.5}px`,
                left: mousePos.current.x,
                top: mousePos.current.y,
                transform: 'translate(-50%, -50%)',
                borderColor: scannerLevel > 20 ? (scannerLevel > 80 ? '#ff0000' : '#00ff41') : '#004400',
                borderWidth: scannerLevel > 50 ? '2px' : '1px',
                boxShadow: scannerLevel > 20 ? '0 0 10px rgba(0,255,65,0.3)' : 'none'
            }}
        />
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full h-12 bg-black/80 border-b border-green-900 flex items-center justify-between px-4 z-40 backdrop-blur-sm">
         <div className="flex items-center gap-4">
            <Activity className="text-green-500 animate-pulse" size={18} />
            <div className="flex flex-col">
                <span className="text-xs text-green-700">TARGET ACQUISITION</span>
                <span className="text-xl font-vt323 text-green-400 tracking-widest">
                    {foundCount.toString().padStart(2, '0')} / {MOTANI_TOTAL}
                </span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <Wifi size={16} className={scannerLevel > 50 ? "text-red-500 animate-ping" : "text-green-900"} />
            <span className="text-xs font-mono text-green-800">SCANNER_MODULE_ACTIVE</span>
         </div>
      </div>

      <TerminalLog logs={logs} />

      {/* ENTITIES: IMPORTANT - NO REACT 'transform' in style prop to prevent conflicts with animation loop */}
      
      {motaniRef.current.map((motan) => (
        <GameEntity
          key={`motan-${motan.id}`}
          ref={(el) => { if (motan) motan.element = el; }}
          type="motan"
          src={`/motan_${motan.id}.png`}
          size={motan.size}
          className="absolute select-none top-0 left-0"
          style={{ width: `${motan.size}px`, height: `${motan.size}px`, zIndex: 5, cursor: 'pointer' }}
          onClick={(e) => handleMotanClick(motan.id, e)}
        />
      ))}

      {obiecteRef.current.map((obj) => (
        <GameEntity
          key={`obj-${obj.id}`}
          ref={(el) => { if (obj) obj.element = el; }}
          type="object"
          src={`/obiect_${obj.id}.png`}
          size={obj.size}
          className="absolute select-none cursor-move top-0 left-0"
          style={{ width: `${obj.size}px`, height: `${obj.size}px`, zIndex: 10 }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)}
        />
      ))}

      {gameWon && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-[fadeIn_1s_ease-out]">
          <div className="w-[500px] border-2 border-green-500 bg-black p-8 relative shadow-[0_0_50px_rgba(0,255,65,0.2)]">
            <div className="absolute -top-3 left-4 bg-black px-2 text-green-500 font-mono text-sm">MISSION_REPORT</div>
            <CheckCircle2 className="mx-auto text-green-500 mb-4 w-16 h-16" />
            <h2 className="font-vt323 text-5xl text-green-500 text-center mb-6 term-text-glow">SYSTEM UNLOCKED</h2>
            <div className="bg-green-900/10 border border-green-800 p-4 mb-6 text-center">
              <p className="text-green-600 text-xs mb-2">DECRYPTED KEY:</p>
              <p className="font-mono text-2xl text-green-300 select-text">FLAG{'{'}CAT_18_FOUND{'}'}</p>
            </div>
            <div className="text-center">
                <button onClick={() => setScene('menu')} className="px-6 py-2 bg-green-900/20 border border-green-600 text-green-400 hover:bg-green-500 hover:text-black transition-colors font-mono text-sm">
                    [ DISCONNECT ]
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatsScene;
