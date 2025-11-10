
import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import type { Scene } from '../App';
import type { Motan, Obiect } from '../types';
import { Activity, Radar, CheckCircle2, Router, Terminal, AlertTriangle } from 'lucide-react';

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

// --- Entity Component ---
const GameEntity = forwardRef<HTMLDivElement, { 
  src: string; 
  type: 'motan' | 'object'; 
  size: number;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
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
                ? 'filter drop-shadow-[0_0_5px_#00f3ff] brightness-110 contrast-110' 
                : 'filter sepia(1) hue-rotate(50deg) saturate(0.5) brightness(0.6) drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]'}
            `}
            onError={() => setHasError(true)}
            draggable={false}
          />
        ) : (
          <div 
             className={`flex flex-col items-center justify-center border-2 bg-black/90 backdrop-blur-md
             ${type === 'motan' ? 'border-cyan-500 text-cyan-400 shadow-[0_0_10px_cyan]' : 'border-amber-700 text-amber-600'}`}
             style={{ width: size, height: size, borderRadius: size * 0.1 }}
          >
             <AlertTriangle size={size * 0.4} />
             <span className="font-mono font-bold mt-1" style={{ fontSize: Math.max(8, size * 0.15) }}>ERR</span>
          </div>
        )}
        
        {/* Selection Bracket Effect for Objects */}
        {type === 'object' && (
            <div className="absolute inset-0 border border-white/0 group-hover:border-amber-500/50 transition-all rounded-sm pointer-events-none scale-110" />
        )}
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
    // Initialize Audio
    miauSounds.current = [];
    for(let i=1; i<=MOTANI_TOTAL; i++) {
        const a = new Audio(`/miau_${i}.wav`);
        a.volume = 0.3;
        a.onerror = () => {}; 
        miauSounds.current.push(a);
    }

    // Initialize Cats (Signals)
    const newMotani: Motan[] = [];
    for (let i = 1; i <= MOTANI_TOTAL; i++) {
      const s = 35 + Math.random() * 35;
      newMotani.push({
        id: i,
        x: Math.random() * 800,
        y: TOP_BAR_HEIGHT + Math.random() * 400,
        dx: (Math.random() - 0.5) * 1.2,
        dy: (Math.random() - 0.5) * 1.2,
        size: s,
        angle: 0,
        dAngle: (Math.random() - 0.5) * 0.5,
        found: false,
        isHidden: false,
        lastTeleportTime: 0
      });
    }

    // Initialize Objects (Obstacles)
    const newObiecte: Obiect[] = [];
    for (let j = 1; j <= OBIECTE_TOTAL; j++) {
      const s = 60 + Math.random() * 50;
      newObiecte.push({
        id: j,
        x: Math.random() * 800,
        y: TOP_BAR_HEIGHT + Math.random() * 400,
        size: s,
        assignedMotanId: null
      });
    }

    // Initialize Tunnels
    const newTunnels: TunnelNode[] = [];
    for (let t = 0; t < TUNNEL_PAIRS; t++) {
        const idA = `PORT-${t}A`;
        const idB = `PORT-${t}B`;
        // Ensure tunnels aren't too close to edges
        const pA = { x: 100 + Math.random() * 600, y: 100 + Math.random() * 300 };
        const pB = { x: 100 + Math.random() * 600, y: 100 + Math.random() * 300 };
        
        const colors = ['cyan', 'purple', 'yellow'];
        const color = colors[t % colors.length];
        
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
        // Center the cat under the object
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
            if(elapsed < 500) {
                // "Beam up" animation
                const progress = elapsed / 500;
                const scale = 1 - progress * 0.5;
                const opacity = 1 - progress;
                const lift = progress * -50;
                m.element.style.transform = `translate(${m.x}px, ${m.y + lift}px) scale(${scale})`;
                m.element.style.opacity = opacity.toString();
                m.element.style.filter = `brightness(${1 + progress * 5}) blur(${progress * 10}px)`;
            } else {
                m.element.style.display = 'none';
            }
            return;
        }

        if (m.isHidden) {
             const obj = obiecteRef.current.find(o => o.assignedMotanId === m.id);
             if(obj) {
                 // Sync position exactly
                 m.x = obj.x + (obj.size - m.size)/2;
                 m.y = obj.y + (obj.size - m.size)/2;
                 m.element.style.transform = `translate(${m.x}px, ${m.y}px)`;
                 m.element.style.opacity = '0';
                 m.element.style.pointerEvents = 'none';
             }
        } else {
             // Move
             m.x += m.dx; 
             m.y += m.dy;
             m.angle += m.dAngle;

             // Bounce Bounds
             if(m.x <= 0) { m.x = 0; m.dx = Math.abs(m.dx); }
             if(m.x >= w - m.size) { m.x = w - m.size; m.dx = -Math.abs(m.dx); }
             if(m.y <= TOP_BAR_HEIGHT) { m.y = TOP_BAR_HEIGHT; m.dy = Math.abs(m.dy); }
             if(m.y >= h - m.size) { m.y = h - m.size; m.dy = -Math.abs(m.dy); }
             
             // Tunnel Teleport
             if (time - (m.lastTeleportTime || 0) > 2500) {
                for (const tunnel of tunnelsRef.current) {
                    const cx = tunnel.x + 24; 
                    const cy = tunnel.y + 24;
                    const mx = m.x + m.size / 2;
                    const my = m.y + m.size / 2;
                    
                    if (Math.hypot(mx - cx, my - cy) < 35) {
                        const exit = tunnelsRef.current.find(t => t.id === tunnel.pairId);
                        if (exit) {
                            m.x = exit.x - m.size / 2 + 24;
                            m.y = exit.y - m.size / 2 + 24;
                            m.lastTeleportTime = time;
                            
                            // Visual Glitch Trigger
                            const inner = m.element.querySelector('.entity-inner');
                            if (inner) {
                                inner.classList.add('animate-pulse'); 
                                setTimeout(() => inner.classList.remove('animate-pulse'), 500);
                            }
                            addLog(`PACKET RE-ROUTED: ${tunnel.id} >> ${exit.id}`);
                        }
                        break;
                    }
                }
             }

             // Render
             const float = Math.sin(time * 0.003 + m.id) * 3;
             m.element.style.transform = `translate(${m.x}px, ${m.y + float}px) rotate(${m.angle}deg)`;
             m.element.style.opacity = '1';
             m.element.style.pointerEvents = 'auto';
        }
      });

      obiecteRef.current.forEach(o => {
         if(o.element) {
             // Just position, drag handles visual effects
             o.element.style.transform = `translate(${o.x}px, ${o.y}px)`;
         }
      });

      // Scanner Intensity Calculation
      let maxSignal = 0;
      motaniRef.current.forEach(m => {
          if(m.isHidden && !m.found) {
              const cx = m.x + m.size/2;
              const cy = m.y + m.size/2;
              const dist = Math.hypot(mousePos.current.x - cx, mousePos.current.y - cy);
              if(dist < 250) maxSignal = Math.max(maxSignal, (250 - dist)/2.5);
          }
      });
      // Smooth damping
      setScannerLevel(prev => prev + (maxSignal - prev) * 0.1);

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
          
          // Sound
          const snd = miauSounds.current[(id - 1) % miauSounds.current.length];
          if (snd) { snd.currentTime = 0; snd.play().catch(()=>{}); }

          // Game Logic
          setFoundCount(prev => {
              const n = prev + 1;
              if(n === MOTANI_TOTAL) {
                  setTimeout(() => setGameWon(true), 1200);
                  addLog("ROOT_ACCESS_GRANTED. DECRYPTING FLAG...");
              }
              return n;
          });

          // Visual Pop-up
          if(gameAreaRef.current) {
            const popup = document.createElement('div');
            popup.textContent = `+ SIGNAL_0x${id.toString(16).toUpperCase()}`;
            popup.className = 'absolute text-cyan-300 font-mono text-xs font-bold z-50 animate-[fadeOut_1s_forwards] pointer-events-none shadow-black drop-shadow-md';
            const r = gameAreaRef.current.getBoundingClientRect();
            popup.style.left = `${e.clientX - r.left}px`;
            popup.style.top = `${e.clientY - r.top - 30}px`;
            gameAreaRef.current.appendChild(popup);
            setTimeout(() => popup.remove(), 1000);
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
                  
                  // Check for Reveal
                  if(obj.assignedMotanId) {
                      const m = motaniRef.current.find(x => x.id === obj.assignedMotanId);
                      if(m && m.isHidden) {
                          const dist = Math.hypot(obj.x - m.x, obj.y - m.y);
                          // If moved far enough from the cat
                          if(dist > obj.size * 0.6) {
                              m.isHidden = false;
                              m.dx = (Math.random()-0.5)*4;
                              m.dy = (Math.random()-0.5)*4;
                              obj.assignedMotanId = null;
                              addLog(`INTERFERENCE CLEARED. HIDDEN SIGNAL FOUND.`);
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
                  obj.element.style.filter = 'sepia(1) hue-rotate(50deg) saturate(0.5) brightness(0.6) drop-shadow(0 5px 5px rgba(0,0,0,0.8))';
              }
              dragRef.current = null; 
          }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [addLog]);

  if (isLoading) return <div className="w-full h-full flex flex-col items-center justify-center text-green-500 font-mono bg-black"><Activity className="animate-pulse mb-4"/><div className="animate-pulse">&gt;&gt; INITIALIZING_SCANNER_PROTOCOLS...</div></div>;

  return (
    <div ref={gameAreaRef} className="w-full h-full relative bg-[#010201] overflow-hidden cursor-crosshair select-none">
        {/* Dynamic Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{
                backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)', 
                backgroundSize: '60px 60px',
                transform: `translate(${mousePos.current.x * -0.02}px, ${mousePos.current.y * -0.02}px)`
             }} 
        />

        {/* HUD Top Bar */}
        <div className="absolute top-0 left-0 w-full h-[60px] bg-black/80 border-b border-green-800/50 flex items-center justify-between px-6 z-50 shadow-[0_5px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                   <span className="text-[10px] text-green-700 font-mono tracking-widest">TARGETS</span>
                   <span className="font-vt323 text-3xl text-green-400 drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]">
                      {foundCount.toString().padStart(2,'0')} <span className="text-green-800">/</span> {MOTANI_TOTAL}
                   </span>
                </div>
            </div>
            
            {/* Signal Strength Meter */}
            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-[10px] text-green-600 font-mono uppercase mb-1">
                        {scannerLevel > 50 ? <AlertTriangle size={10} className="animate-bounce text-cyan-400"/> : null}
                        <span>Proximity_Sensor</span>
                    </div>
                    <div className="w-48 h-2 bg-green-950 border border-green-900 overflow-hidden relative">
                         {/* Grid lines on meter */}
                         <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_10%,#000_10%)] bg-[length:10%_100%] opacity-30 z-10" />
                         <div className="h-full bg-gradient-to-r from-green-900 via-cyan-600 to-white transition-all duration-100 ease-out" style={{width: `${scannerLevel}%`, opacity: 0.5 + scannerLevel/200}} />
                    </div>
                 </div>
                 <div className="relative w-10 h-10 flex items-center justify-center border border-green-900 rounded-full bg-black">
                     <Radar size={20} className={`text-green-600 transition-all duration-300 ${scannerLevel > 10 ? 'animate-[spin_2s_linear_infinite] text-cyan-400' : ''}`} />
                     {scannerLevel > 60 && <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-50" />}
                 </div>
            </div>
        </div>

        {/* System Logs Bottom Left */}
        <div className="absolute bottom-4 left-4 z-40 font-vt323 text-lg text-green-500/60 pointer-events-none flex flex-col-reverse h-32 overflow-hidden w-80 mask-image-b-to-t">
            {logs.map((l, i) => (
                <div key={i} className="leading-tight flex gap-2">
                    <span className="opacity-30">&gt;</span> 
                    <span className={l.includes('ACQUIRED') ? 'text-cyan-400' : ''}>{l}</span>
                </div>
            ))}
        </div>

        {/* Data Tunnels Visuals */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20">
            {tunnelsRef.current.map((tunnel, i) => {
                if(tunnel.id.endsWith('B')) return null; // Draw once per pair
                const pair = tunnelsRef.current.find(t => t.id === tunnel.pairId);
                if(!pair) return null;
                return (
                   <line key={i} x1={tunnel.x+24} y1={tunnel.y+24} x2={pair.x+24} y2={pair.y+24} 
                         stroke={tunnel.color === 'cyan' ? '#06b6d4' : (tunnel.color === 'purple' ? '#a855f7' : '#eab308')} 
                         strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                );
            })}
        </svg>

        {tunnelsRef.current.map(t => (
            <div key={t.id} 
                 className={`absolute w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-500
                    ${t.color === 'cyan' ? 'border-cyan-500/30 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 
                      (t.color === 'purple' ? 'border-purple-500/30 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 
                      'border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]')}`}
                 style={{left: t.x, top: t.y}}>
                 
                 {/* Spinning ring */}
                 <div className={`absolute inset-0 border-t-2 rounded-full animate-[spin_3s_linear_infinite] opacity-50 ${t.color === 'cyan' ? 'border-cyan-400' : (t.color === 'purple' ? 'border-purple-400' : 'border-yellow-400')}`} />
                 
                 <Router size={14} />
                 <span className="absolute -bottom-5 text-[9px] font-mono opacity-60 whitespace-nowrap tracking-tighter bg-black px-1 border border-green-900">{t.id}</span>
            </div>
        ))}

        {/* Entities */}
        {motaniRef.current.map(m => (
            <GameEntity 
                key={`m-${m.id}`} 
                ref={el => { if(m) m.element = el; }}
                type="motan" 
                size={m.size}
                src={`/motan_${m.id}.png`}
                style={{width: m.size, height: m.size, zIndex: 15}}
                className="absolute cursor-pointer hover:z-50"
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

        {/* Scanner Mouse Follower */}
        <div className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-200"
             style={{ opacity: scannerLevel > 5 ? 1 : 0 }}>
            <div className="absolute rounded-full border border-cyan-500/30 transition-all duration-75"
                 style={{
                    left: mousePos.current.x, top: mousePos.current.y,
                    width: 60 + scannerLevel, height: 60 + scannerLevel,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: `0 0 ${scannerLevel}px rgba(0, 243, 255, ${scannerLevel/200})`
                 }} 
            />
            <div className="absolute left-0 top-0 w-full h-[1px] bg-cyan-500/20" style={{top: mousePos.current.y}} />
            <div className="absolute left-0 top-0 h-full w-[1px] bg-cyan-500/20" style={{left: mousePos.current.x}} />
        </div>

        {/* Win Modal */}
        {gameWon && (
            <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]">
                <div className="w-[600px] border-2 border-green-500 bg-black p-1 relative shadow-[0_0_100px_rgba(0,255,65,0.15)]">
                    <div className="border border-green-900 p-8 flex flex-col items-center relative overflow-hidden">
                        {/* CRT Scanline for modal */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />
                        
                        <CheckCircle2 size={64} className="text-green-500 mb-6 animate-[bounce_2s_infinite]"/>
                        
                        <h1 className="font-vt323 text-7xl text-green-400 mb-2 tracking-widest text-shadow-neon">
                            SYSTEM UNLOCKED
                        </h1>
                        
                        <div className="w-full bg-green-900/10 p-6 border-y border-green-600/50 mb-8 text-center relative">
                            <div className="absolute top-0 left-0 px-2 py-1 bg-green-800 text-black text-[9px] font-mono">PAYLOAD_DECRYPTED</div>
                            <p className="text-cyan-300 font-mono text-3xl select-text tracking-[0.15em] mt-4 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                                FLAG{'{'}CAT_18_FOUND{'}'}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setScene('menu')} 
                            className="group px-10 py-3 border border-green-600 hover:bg-green-500 hover:text-black transition-all duration-200 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-green-400 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                            <div className="flex items-center gap-3 relative z-10 font-mono text-sm uppercase tracking-wider">
                                <Terminal size={16} />
                                <span>Return to Root</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CatsScene;
