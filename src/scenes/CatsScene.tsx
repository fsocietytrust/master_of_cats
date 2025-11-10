import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import type { Scene } from '../App';
import type { Motan, Obiect } from '../types';
import { Activity, Radar, CheckCircle2, Wifi, Lock, Unlock } from 'lucide-react';

interface CatsSceneProps {
  setScene: (scene: Scene) => void;
}

const MOTANI_TOTAL = 18;
const OBIECTE_TOTAL = 18; // Keeping balanced
const MOTANI_HIDDEN = 6;
const TOP_BAR_HEIGHT = 60;

const GameEntity = forwardRef<HTMLDivElement, { 
  src: string; 
  type: 'motan' | 'object'; 
  size: number;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  isFound?: boolean;
}>(({ src, type, size, onClick, onMouseDown, style, className, isFound }, ref) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      ref={ref}
      className={`${className} flex items-center justify-center`}
      style={style}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div className={`entity-inner w-full h-full flex items-center justify-center transition-all duration-300`}>
        {!hasError ? (
          <img 
            src={src} 
            alt={type}
            className={`w-full h-full object-contain pointer-events-none select-none
              ${type === 'motan' 
                ? 'filter drop-shadow-[0_0_5px_#00f3ff] brightness-110 contrast-125 sepia(1) hue-rotate(140deg) saturate(3)' 
                : 'filter sepia(1) hue-rotate(180deg) saturate(0.2) brightness(0.6) drop-shadow(0 4px 6px black)'}
            `}
            onError={() => setHasError(true)}
            draggable={false}
          />
        ) : (
          // Fallback placeholder if image missing
          <div className={`w-full h-full border flex items-center justify-center text-[10px] font-bold ${type === 'motan' ? 'border-cyan-500 text-cyan-500 bg-cyan-900/20' : 'border-orange-800 text-orange-800 bg-black'}`}>
             {type === 'motan' ? 'SIG' : 'OBJ'}
          </div>
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
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const mousePos = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ id: number; startX: number; startY: number; initialLeft: number; initialTop: number; } | null>(null);
  const miauSounds = useRef<HTMLAudioElement[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('en-US',{hour12:false,minute:'2-digit',second:'2-digit'})}] ${msg}`, ...prev.slice(0, 7)]);
  }, []);

  useEffect(() => {
    // Init Sounds
    miauSounds.current = [];
    // Try to load sound files
    for(let i=1; i<=MOTANI_TOTAL; i++) {
        // We assume the user has miau_1.mp3/wav etc. 
        // Using a generic sound array for playback.
        const a = new Audio(`/miau_${i}.wav`); // Trying .wav as per previous request context, could be .mp3
        a.volume = 0.5;
        // Add error handler to fallback if wav missing, maybe try mp3? 
        // For now we just suppress errors
        a.onerror = () => { console.warn(`Missing sound: miau_${i}.wav`); };
        miauSounds.current.push(a);
    }

    // Init Entities
    const newMotani: Motan[] = [];
    for (let i = 1; i <= MOTANI_TOTAL; i++) {
      const size = 50 + Math.random() * 30;
      newMotani.push({
        id: i,
        x: Math.random() * 800,
        y: TOP_BAR_HEIGHT + Math.random() * 400,
        dx: (Math.random() - 0.5) * 0.8,
        dy: (Math.random() - 0.5) * 0.8,
        size,
        angle: 0,
        dAngle: (Math.random() - 0.5) * 0.2,
        found: false,
        isHidden: false
      });
    }

    const newObiecte: Obiect[] = [];
    for (let j = 1; j <= OBIECTE_TOTAL; j++) {
      const size = 90 + Math.random() * 60;
      newObiecte.push({
        id: j,
        x: Math.random() * 800,
        y: TOP_BAR_HEIGHT + Math.random() * 400,
        size,
        assignedMotanId: null
      });
    }

    // Hide Logic: Place cats UNDER objects
    const shuffled = [...newMotani].sort(() => Math.random() - 0.5);
    for (let k = 0; k < MOTANI_HIDDEN; k++) {
      const m = shuffled[k];
      const obj = newObiecte[k];
      if(m && obj) {
        m.isHidden = true;
        // Center cat
        m.x = obj.x + (obj.size - m.size) / 2;
        m.y = obj.y + (obj.size - m.size) / 2;
        m.dx = 0; 
        m.dy = 0;
        obj.assignedMotanId = m.id;
      }
    }

    motaniRef.current = newMotani;
    obiecteRef.current = newObiecte;
    setIsLoading(false);
    addLog("SYSTEM_READY: SIGNAL SCANNER ONLINE");
    addLog("MISSION: LOCATE BLUE ENERGY SIGNATURES");
  }, [addLog]);

  // Animation Loop
  useEffect(() => {
    if(isLoading) return;

    const animate = (time: number) => {
      const bounds = gameAreaRef.current ? gameAreaRef.current.getBoundingClientRect() : { width: 1024, height: 600 };
      const w = bounds.width;
      const h = bounds.height;
      
      motaniRef.current.forEach(m => {
        if (!m.element) return;

        if (m.found) {
            if(!m.foundTime) m.foundTime = time;
            const elapsed = time - m.foundTime;
            // Exit animation
            if(elapsed < 500) {
                const scale = 1 + elapsed * 0.01;
                const opacity = 1 - elapsed/500;
                m.element.style.transform = `translate(${m.x}px, ${m.y}px) scale(${scale})`;
                m.element.style.opacity = opacity.toString();
                m.element.style.filter = `blur(${elapsed/20}px) hue-rotate(${elapsed}deg)`;
            } else {
                m.element.style.display = 'none';
            }
            return;
        }

        if (m.isHidden) {
             // Sync with object if hidden
             const obj = obiecteRef.current.find(o => o.assignedMotanId === m.id);
             if(obj) {
                 m.x = obj.x + (obj.size - m.size)/2;
                 m.y = obj.y + (obj.size - m.size)/2;
                 m.element.style.transform = `translate(${m.x}px, ${m.y}px)`;
                 m.element.style.opacity = '0'; // Invisible
                 m.element.style.pointerEvents = 'none';
             }
        } else {
             // Float movement for visible cats
             m.x += m.dx; m.y += m.dy;
             // Bounce off walls
             if(m.x <= 0 || m.x >= w - m.size) m.dx *= -1;
             if(m.y <= TOP_BAR_HEIGHT || m.y >= h - m.size) m.dy *= -1;
             
             // Hover effect
             const hoverY = Math.sin(time * 0.002 + m.id) * 5;

             m.element.style.transform = `translate(${m.x}px, ${m.y + hoverY}px)`;
             m.element.style.opacity = '1';
             m.element.style.pointerEvents = 'auto';
        }
      });

      obiecteRef.current.forEach(o => {
         if(o.element) {
             o.element.style.transform = `translate(${o.x}px, ${o.y}px)`;
         }
      });

      // Scanner Logic
      let maxSignal = 0;
      motaniRef.current.forEach(m => {
          if(m.isHidden && !m.found) {
              const dist = Math.hypot(mousePos.current.x - (m.x + m.size/2), mousePos.current.y - (m.y + m.size/2));
              if(dist < 150) maxSignal = Math.max(maxSignal, (150 - dist)/1.5);
          }
      });
      setScannerLevel(prev => prev + (maxSignal - prev) * 0.1);

      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isLoading]);

  const handleMotanClick = (id: number) => {
      const m = motaniRef.current.find(x => x.id === id);
      if(m && !m.found && !m.isHidden) {
          m.found = true;
          
          // Play specific sound if available, random otherwise
          const soundIdx = (id - 1) % miauSounds.current.length;
          const snd = miauSounds.current[soundIdx];
          if (snd) {
             snd.currentTime = 0; 
             snd.play().catch(()=>{});
          }

          setFoundCount(prev => {
              const n = prev + 1;
              if(n === MOTANI_TOTAL) {
                  setGameWon(true);
                  addLog("ALL SIGNALS ACQUIRED. DECRYPTING FLAG...");
              }
              return n;
          });
          addLog(`SIGNAL_CAPTURED [ID: ${m.id.toString(16).padStart(2,'0').toUpperCase()}]`);
      }
  };

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      const obj = obiecteRef.current.find(o => o.id === id);
      if(obj) {
          dragRef.current = { id, startX: e.clientX, startY: e.clientY, initialLeft: obj.x, initialTop: obj.y };
          if(obj.element) {
              obj.element.style.cursor = 'grabbing';
              obj.element.style.zIndex = '50'; // Bring to top
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
                  // Simple movement
                  obj.x = dragRef.current.initialLeft + dx;
                  obj.y = dragRef.current.initialTop + dy;
                  
                  // Check for reveal
                  if(obj.assignedMotanId) {
                      const m = motaniRef.current.find(x => x.id === obj.assignedMotanId);
                      if(m && m.isHidden) {
                          const dist = Math.hypot(obj.x - m.x, obj.y - m.y);
                          if(dist > obj.size * 0.5) {
                              m.isHidden = false;
                              m.dx = (Math.random()-0.5)*2;
                              m.dy = (Math.random()-0.5)*2;
                              obj.assignedMotanId = null;
                              addLog(`INTERFERENCE_REMOVED. SIGNAL #${m.id} EXPOSED.`);
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
              }
              dragRef.current = null; 
          }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [addLog]);

  if (isLoading) return <div className="text-green-500 font-mono p-10 w-full h-full flex items-center justify-center">LOADING_ENCRYPTED_ASSETS...</div>;

  return (
    <div ref={gameAreaRef} className="w-full h-full relative bg-[#020503] overflow-hidden cursor-crosshair">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

        {/* HUD */}
        <div className="absolute top-0 left-0 w-full h-[50px] bg-black/90 border-b border-green-800 flex items-center justify-between px-4 z-50 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-4 text-green-500">
                <Activity size={20} className="animate-pulse"/>
                <span className="font-vt323 text-2xl tracking-widest">SIGNALS: {foundCount.toString().padStart(2,'0')}/{MOTANI_TOTAL}</span>
            </div>
            <div className="flex items-center gap-2">
                 <Radar size={20} className={scannerLevel > 30 ? "text-cyan-400 animate-spin" : "text-green-900"} />
                 <div className="w-32 h-2 bg-green-900 border border-green-700 relative overflow-hidden">
                     <div className="h-full bg-cyan-400 transition-all duration-100" style={{width: `${scannerLevel}%`}} />
                 </div>
                 <span className="text-[10px] text-green-600 font-mono">PROXIMITY</span>
            </div>
        </div>

        {/* LOGS */}
        <div className="absolute bottom-4 left-4 z-40 font-mono text-[10px] text-green-400 opacity-70 pointer-events-none flex flex-col-reverse">
            {logs.map((l, i) => <div key={i} className="bg-black/50 px-1">{l}</div>)}
        </div>

        {/* ENTITIES */}
        {motaniRef.current.map(m => (
            <GameEntity 
                key={`m-${m.id}`} 
                ref={el => { if(m) m.element = el; }}
                type="motan" 
                src={`/motan_${m.id}.png`} 
                size={m.size}
                style={{width: m.size, height: m.size, zIndex: 10}}
                className="absolute cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => handleMotanClick(m.id)}
            />
        ))}

        {obiecteRef.current.map(o => (
            <GameEntity 
                key={`o-${o.id}`} 
                ref={el => { if(o) o.element = el; }}
                type="object" 
                src={`/obiect_${o.id}.png`} 
                size={o.size}
                style={{width: o.size, height: o.size, zIndex: 20}}
                className="absolute cursor-grab"
                onMouseDown={(e) => handleMouseDown(e, o.id)}
            />
        ))}

        {/* SCANNER OVERLAY - Visualizes hidden signals */}
        <div className="absolute inset-0 pointer-events-none z-30 mix-blend-screen"
             style={{ background: `radial-gradient(circle at ${mousePos.current.x}px ${mousePos.current.y}px, rgba(0, 243, 255, ${scannerLevel * 0.004}), transparent ${100 + scannerLevel}px)` }}
        />

        {gameWon && (
            <div className="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center animate-[fadeIn_1s]">
                <div className="border-2 border-green-500 bg-black p-8 text-center shadow-[0_0_100px_rgba(0,255,0,0.3)] max-w-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-[scanline_2s_linear_infinite]" />
                    <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(0,255,0,0.6)]"/>
                    <h1 className="font-vt323 text-5xl text-green-400 mb-4 tracking-widest">ACCESS GRANTED</h1>
                    
                    <div className="bg-green-900/10 p-4 border border-dashed border-green-700 mb-6">
                        <div className="text-[10px] text-green-600 mb-1 text-left">DECRYPTED KEY:</div>
                        <p className="text-cyan-300 font-mono text-xl select-text tracking-widest drop-shadow-[0_0_5px_cyan]">
                            FLAG{'{'}CAT_18_FOUND{'}'}
                        </p>
                    </div>
                    
                    <button onClick={() => setScene('menu')} className="px-6 py-2 border border-green-800 text-green-500 hover:bg-green-900/50 hover:text-green-300 font-mono text-sm transition-colors">
                        [ RETURN TO ROOT ]
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default CatsScene;