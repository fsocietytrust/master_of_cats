import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import type { Scene } from '../App';
import type { Motan, Obiect } from '../types';
import { Activity, Radar, CheckCircle2, Router, Terminal } from 'lucide-react';

interface CatsSceneProps {
  setScene: (scene: Scene) => void;
}

interface TunnelNode {
  id: string;
  x: number;
  y: number;
  pairId: string;
  color: string;
}

const MOTANI_TOTAL = 18;
const OBIECTE_TOTAL = 18;
const MOTANI_HIDDEN = 6;
const TUNNEL_PAIRS = 3;
const TOP_BAR_HEIGHT = 60;

// --- Entity Component with Glitch Support ---
const GameEntity = forwardRef<HTMLDivElement, { 
  src: string; 
  type: 'motan' | 'object'; 
  size: number;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  isGlitching?: boolean;
}>(({ src, type, size, onClick, onMouseDown, style, className }, ref) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      ref={ref}
      className={`${className} flex items-center justify-center`}
      style={style}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div className="entity-inner w-full h-full flex items-center justify-center transition-transform duration-200 relative group">
        {!hasError ? (
          <img 
            src={src} 
            alt={type}
            className={`w-full h-full object-contain pointer-events-none select-none
              ${type === 'motan' 
                ? 'filter drop-shadow-[0_0_8px_#00f3ff] brightness-125 contrast-125 sepia(1) hue-rotate(130deg) saturate(4)' 
                : 'filter sepia(1) hue-rotate(90deg) saturate(0.5) brightness(0.5) drop-shadow(0 5px 10px black)'}
            `}
            onError={() => setHasError(true)}
            draggable={false}
          />
        ) : (
          <div className={`w-full h-full border-2 flex flex-col items-center justify-center text-[8px] font-bold bg-black/80 backdrop-blur-md
             ${type === 'motan' ? 'border-cyan-500 text-cyan-400 shadow-[0_0_10px_cyan]' : 'border-green-900 text-green-800'}`}>
             <span>ERR_404</span>
             <span>{type === 'motan' ? 'SIG' : 'OBJ'}</span>
          </div>
        )}
        
        {/* Hover Bracket Effect */}
        <div className="absolute inset-0 border border-white/0 group-hover:border-white/20 transition-colors rounded-sm pointer-events-none" />
      </div>
    </div>
  );
});
GameEntity.displayName = 'GameEntity';

const CatsScene: React.FC<CatsSceneProps> = ({ setScene }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [foundCount, setFoundCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [scannerLevel, setScannerLevel] = useState(0);
  
  const motaniRef = useRef<Motan[]>([]);
  const obiecteRef = useRef<Obiect[]>([]);
  const tunnelsRef = useRef<TunnelNode[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const mousePos = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ id: number; startX: number; startY: number; initialLeft: number; initialTop: number; } | null>(null);
  const miauSounds = useRef<HTMLAudioElement[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('en-GB')}] ${msg}`, ...prev.slice(0, 6)]);
  }, []);

  // --- Initialization ---
  useEffect(() => {
    miauSounds.current = [];
    for(let i=1; i<=MOTANI_TOTAL; i++) {
        const a = new Audio(`/miau_${i}.wav`);
        a.volume = 0.4;
        a.onerror = () => {}; 
        miauSounds.current.push(a);
    }

    const newMotani: Motan[] = [];
    for (let i = 1; i <= MOTANI_TOTAL; i++) {
      const s = 40 + Math.random() * 40;
      newMotani.push({
        id: i,
        x: Math.random() * 800,
        y: TOP_BAR_HEIGHT + Math.random() * 400,
        dx: (Math.random() - 0.5) * 1.2,
        dy: (Math.random() - 0.5) * 1.2,
        size: s,
        angle: 0,
        dAngle: (Math.random() - 0.5) * 0.8,
        found: false,
        isHidden: false,
        lastTeleportTime: 0
      });
    }

    const newObiecte: Obiect[] = [];
    for (let j = 1; j <= OBIECTE_TOTAL; j++) {
      const s = 70 + Math.random() * 60;
      newObiecte.push({
        id: j,
        x: Math.random() * 800,
        y: TOP_BAR_HEIGHT + Math.random() * 400,
        size: s,
        assignedMotanId: null
      });
    }

    const newTunnels: TunnelNode[] = [];
    for (let t = 0; t < TUNNEL_PAIRS; t++) {
        const idA = `NODE-${t}A`;
        const idB = `NODE-${t}B`;
        const pA = { x: 100 + Math.random() * 600, y: 100 + Math.random() * 300 };
        const pB = { x: 100 + Math.random() * 600, y: 100 + Math.random() * 300 };
        const color = t === 0 ? 'cyan' : (t === 1 ? 'purple' : 'amber');
        
        newTunnels.push({ id: idA, x: pA.x, y: pA.y, pairId: idB, color });
        newTunnels.push({ id: idB, x: pB.x, y: pB.y, pairId: idA, color });
    }
    tunnelsRef.current = newTunnels;

    // Hiding Logic
    const shuffled = [...newMotani].sort(() => Math.random() - 0.5);
    for (let k = 0; k < MOTANI_HIDDEN; k++) {
      const m = shuffled[k];
      const obj = newObiecte[k];
      if(m && obj) {
        m.isHidden = true;
        m.x = obj.x + (obj.size - m.size) / 2;
        m.y = obj.y + (obj.size - m.size) / 2;
        m.dx = 0; m.dy = 0;
        obj.assignedMotanId = m.id;
      }
    }

    motaniRef.current = newMotani;
    obiecteRef.current = newObiecte;
    setIsLoading(false);
    addLog("SYSTEM_READY: SIGNAL SCANNER ONLINE");
  }, [addLog]);

  // --- Game Loop ---
  useEffect(() => {
    if(isLoading) return;

    const animate = (time: number) => {
      const bounds = gameAreaRef.current ? gameAreaRef.current.getBoundingClientRect() : { width: 1000, height: 600 };
      const w = bounds.width;
      const h = bounds.height;
      
      motaniRef.current.forEach(m => {
        if (!m.element) return;

        if (m.found) {
            if(!m.foundTime) m.foundTime = time;
            const elapsed = time - m.foundTime;
            if(elapsed < 600) {
                const scale = 1 + elapsed * 0.005;
                const opacity = 1 - elapsed/600;
                m.element.style.transform = `translate(${m.x}px, ${m.y}px) scale(${scale})`;
                m.element.style.opacity = opacity.toString();
                m.element.style.filter = `brightness(2) blur(${elapsed/50}px)`;
            } else {
                m.element.style.display = 'none';
            }
            return;
        }

        if (m.isHidden) {
             const obj = obiecteRef.current.find(o => o.assignedMotanId === m.id);
             if(obj) {
                 m.x = obj.x + (obj.size - m.size)/2;
                 m.y = obj.y + (obj.size - m.size)/2;
                 m.element.style.transform = `translate(${m.x}px, ${m.y}px)`;
                 m.element.style.opacity = '0';
                 m.element.style.pointerEvents = 'none';
             }
        } else {
             m.x += m.dx; 
             m.y += m.dy;
             m.angle += m.dAngle;

             if(m.x <= 0) { m.x = 0; m.dx = Math.abs(m.dx); }
             if(m.x >= w - m.size) { m.x = w - m.size; m.dx = -Math.abs(m.dx); }
             if(m.y <= TOP_BAR_HEIGHT) { m.y = TOP_BAR_HEIGHT; m.dy = Math.abs(m.dy); }
             if(m.y >= h - m.size) { m.y = h - m.size; m.dy = -Math.abs(m.dy); }
             
             // Tunnel Check
             if (time - (m.lastTeleportTime || 0) > 2000) {
                for (const tunnel of tunnelsRef.current) {
                    const cx = tunnel.x + 24; 
                    const cy = tunnel.y + 24;
                    const mx = m.x + m.size / 2;
                    const my = m.y + m.size / 2;
                    
                    if (Math.hypot(mx - cx, my - cy) < 40) {
                        const exit = tunnelsRef.current.find(t => t.id === tunnel.pairId);
                        if (exit) {
                            m.x = exit.x - m.size / 2 + 24;
                            m.y = exit.y - m.size / 2 + 24;
                            m.lastTeleportTime = time;
                            
                            const inner = m.element.querySelector('.entity-inner');
                            if (inner) {
                                inner.classList.add('glitch-text'); 
                                setTimeout(() => inner.classList.remove('glitch-text'), 500);
                            }
                            addLog(`SIGNAL #${m.id} REROUTED -> ${exit.id}`);
                        }
                        break;
                    }
                }
             }

             const hoverY = Math.sin(time * 0.003 + m.id) * 4;
             m.element.style.transform = `translate(${m.x}px, ${m.y + hoverY}px) rotate(${m.angle}deg)`;
             m.element.style.opacity = '1';
             m.element.style.pointerEvents = 'auto';
        }
      });

      obiecteRef.current.forEach(o => {
         if(o.element) {
             o.element.style.transform = `translate(${o.x}px, ${o.y}px)`;
         }
      });

      // Scanner Calculation
      let maxSignal = 0;
      motaniRef.current.forEach(m => {
          if(m.isHidden && !m.found) {
              const cx = m.x + m.size/2;
              const cy = m.y + m.size/2;
              const dist = Math.hypot(mousePos.current.x - cx, mousePos.current.y - cy);
              if(dist < 200) maxSignal = Math.max(maxSignal, (200 - dist)/2);
          }
      });
      setScannerLevel(prev => prev + (maxSignal - prev) * 0.15);

      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isLoading, addLog]);

  // --- Interaction Handlers ---
  const handleMotanClick = (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const m = motaniRef.current.find(x => x.id === id);
      if(m && !m.found && !m.isHidden) {
          m.found = true;
          
          const snd = miauSounds.current[(id - 1) % miauSounds.current.length];
          if (snd) { snd.currentTime = 0; snd.play().catch(()=>{}); }

          setFoundCount(prev => {
              const n = prev + 1;
              if(n === MOTANI_TOTAL) {
                  setTimeout(() => setGameWon(true), 1000);
                  addLog("ALL SIGNALS ACQUIRED. KEY GENERATED.");
              }
              return n;
          });

          // Popup Effect
          if(gameAreaRef.current) {
            const popup = document.createElement('div');
            popup.textContent = `[DECRYPTED_0x${id}]`;
            popup.className = 'absolute text-cyan-400 font-mono text-lg font-bold z-50 animate-ping pointer-events-none';
            const r = gameAreaRef.current.getBoundingClientRect();
            popup.style.left = `${e.clientX - r.left}px`;
            popup.style.top = `${e.clientY - r.top - 40}px`;
            gameAreaRef.current.appendChild(popup);
            setTimeout(() => popup.remove(), 600);
          }
          addLog(`SIGNAL ACQUIRED: ID_${id}`);
      }
  };

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      const obj = obiecteRef.current.find(o => o.id === id);
      if(obj) {
          dragRef.current = { id, startX: e.clientX, startY: e.clientY, initialLeft: obj.x, initialTop: obj.y };
          if(obj.element) {
              obj.element.style.cursor = 'grabbing';
              obj.element.style.zIndex = '50';
              obj.element.style.filter = 'brightness(1.5) sepia(1) saturate(3)';
          }
      }
  };

  useEffect(() => {
      const onMove = (e: MouseEvent) => {
          if(gameAreaRef.current) {
              const r = gameAreaRef.current.getBoundingClientRect();
              mousePos.current = { x: e.clientX - r.left, y: e.clientY - r.top };
          }
          if(dragRef.current) {
              const dx = e.clientX - dragRef.current.startX;
              const dy = e.clientY - dragRef.current.startY;
              const obj = obiecteRef.current.find(o => o.id === dragRef.current?.id);
              if(obj) {
                  obj.x = dragRef.current.initialLeft + dx;
                  obj.y = dragRef.current.initialTop + dy;
                  
                  // Reveal check
                  if(obj.assignedMotanId) {
                      const m = motaniRef.current.find(x => x.id === obj.assignedMotanId);
                      if(m && m.isHidden) {
                          const dist = Math.hypot(obj.x - m.x, obj.y - m.y);
                          if(dist > obj.size * 0.7) {
                              m.isHidden = false;
                              m.dx = (Math.random()-0.5)*4;
                              m.dy = (Math.random()-0.5)*4;
                              obj.assignedMotanId = null;
                              addLog(`OBSTRUCTION CLEARED. SIGNAL #${m.id} REVEALED.`);
                          }
                      }
                  }
              }
          }
      };
      const onUp = () => { 
          if(dragRef.current) {
              const obj = obiecteRef.current.find(o => o.id === dragRef.current?.id);
              if(obj && obj.element) {
                  obj.element.style.cursor = 'grab';
                  obj.element.style.zIndex = '20';
                  obj.element.style.filter = 'sepia(1) hue-rotate(90deg) saturate(0.5) brightness(0.5) drop-shadow(0 5px 10px black)';
              }
              dragRef.current = null; 
          }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [addLog]);

  if (isLoading) return <div className="w-full h-full flex items-center justify-center text-green-500 font-mono animate-pulse">> INITIALIZING_SCANNER_PROTOCOLS...</div>;

  return (
    <div ref={gameAreaRef} className="w-full h-full relative bg-[#020302] overflow-hidden cursor-crosshair">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)', backgroundSize: '50px 50px'}} />

        {/* HUD Bar */}
        <div className="absolute top-0 left-0 w-full h-[50px] bg-black/90 border-b border-green-800 flex items-center justify-between px-6 z-50 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-4 text-green-500">
                <Activity size={20} className="animate-pulse"/>
                <span className="font-vt323 text-2xl tracking-widest text-green-400 drop-shadow-[0_0_5px_green]">
                    ACQUIRED: {foundCount.toString().padStart(2,'0')}/{MOTANI_TOTAL}
                </span>
            </div>
            <div className="flex items-center gap-3">
                 <div className="text-right">
                    <div className="text-[10px] text-green-700 font-mono">SIGNAL_STRENGTH</div>
                    <div className="w-32 h-1.5 bg-green-950 border border-green-800 relative">
                        <div className="h-full bg-cyan-400 transition-all duration-75 ease-out shadow-[0_0_10px_cyan]" style={{width: `${scannerLevel}%`}} />
                    </div>
                 </div>
                 <Radar size={24} className={`${scannerLevel > 30 ? "text-cyan-400 animate-spin" : "text-green-900"}`} />
            </div>
        </div>

        {/* System Logs */}
        <div className="absolute bottom-4 left-4 z-40 font-mono text-[10px] text-green-400/70 pointer-events-none flex flex-col-reverse h-24 overflow-hidden border-l border-green-900/50 pl-2">
            {logs.map((l, i) => <div key={i} className="mb-0.5">{l}</div>)}
        </div>

        {/* Data Tunnels */}
        {tunnelsRef.current.map(t => (
            <div key={t.id} 
                 className={`absolute w-12 h-12 rounded-full border border-dashed flex items-center justify-center z-10 opacity-60 transition-opacity hover:opacity-100
                    ${t.color === 'cyan' ? 'border-cyan-500 text-cyan-500' : (t.color === 'purple' ? 'border-purple-500 text-purple-500' : 'border-amber-500 text-amber-500')}`}
                 style={{left: t.x, top: t.y}}>
                 <div className={`w-full h-full rounded-full animate-ping opacity-10 bg-current absolute`} />
                 <Router size={16} className="animate-pulse" />
                 <span className="absolute -bottom-4 text-[8px] font-mono opacity-50 whitespace-nowrap">{t.id}</span>
            </div>
        ))}

        {/* Render Entities */}
        {motaniRef.current.map(m => (
            <GameEntity 
                key={`m-${m.id}`} 
                ref={el => { if(m) m.element = el; }}
                type="motan" 
                size={m.size}
                src={`/motan_${m.id}.png`}
                style={{width: m.size, height: m.size, zIndex: 15}}
                className="absolute cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => handleMotanClick(m.id, e)}
            />
        ))}

        {obiecteRef.current.map(o => (
            <GameEntity 
                key={`o-${o.id}`} 
                ref={el => { if(o) o.element = el; }}
                type="object" 
                size={o.size}
                src={`/obiect_${o.id}.png`}
                style={{width: o.size, height: o.size, zIndex: 20}}
                className="absolute cursor-grab"
                onMouseDown={(e) => handleMouseDown(e, o.id)}
            />
        ))}

        {/* Scanner Visual Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 mix-blend-screen transition-colors duration-100"
             style={{ 
               background: `radial-gradient(circle at ${mousePos.current.x}px ${mousePos.current.y}px, rgba(0, 243, 255, ${scannerLevel * 0.005}), transparent ${100 + scannerLevel}px)` 
             }}
        />

        {/* Win Modal */}
        {gameWon && (
            <div className="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center">
                <div className="border border-green-500 bg-black p-10 text-center shadow-[0_0_150px_rgba(0,255,0,0.2)] max-w-lg relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_10px_green]" />
                    <CheckCircle2 size={80} className="text-green-500 mx-auto mb-6 drop-shadow-[0_0_20px_green]"/>
                    <h1 className="font-vt323 text-6xl text-green-400 mb-2 tracking-widest glitch-text" data-text="SYSTEM UNLOCKED">SYSTEM UNLOCKED</h1>
                    
                    <div className="bg-green-900/10 p-6 border border-dashed border-green-800 mb-8">
                        <div className="text-xs text-green-600 mb-2 text-left font-mono">DECRYPTED KEY:</div>
                        <p className="text-cyan-300 font-mono text-2xl select-text tracking-[0.2em] drop-shadow-[0_0_5px_cyan]">
                            FLAG{'{'}CAT_18_FOUND{'}'}
                        </p>
                    </div>
                    
                    <button onClick={() => setScene('menu')} className="group px-8 py-3 border border-green-700 text-green-500 hover:bg-green-500 hover:text-black font-mono text-sm transition-all">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} />
                            <span>RETURN_TO_ROOT</span>
                        </div>
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default CatsScene;
