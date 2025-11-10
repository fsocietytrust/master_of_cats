
import React, { useEffect, useRef, useState } from 'react';
import type { Scene } from '../App';

interface SnakeSceneProps {
  setScene: (scene: Scene) => void;
}

const SnakeScene: React.FC<SnakeSceneProps> = ({ setScene }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grid = 20;
    const cols = canvas.width / grid;
    const rows = canvas.height / grid;

    let dir = { x: 1, y: 0 };
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 5, y: 5 };

    const draw = () => {
      // BG
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid Lines
      ctx.strokeStyle = '#002200';
      ctx.lineWidth = 1;
      for(let i=0; i<cols; i++) { ctx.beginPath(); ctx.moveTo(i*grid,0); ctx.lineTo(i*grid, canvas.height); ctx.stroke(); }
      for(let j=0; j<rows; j++) { ctx.beginPath(); ctx.moveTo(0,j*grid); ctx.lineTo(canvas.width, j*grid); ctx.stroke(); }

      // Food
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff003c'; // Alert Color
      ctx.fillRect(food.x * grid + 2, food.y * grid + 2, grid - 4, grid - 4);
      
      // Snake
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#00ff41' : '#008f11'; // Terminal Green
        if(i === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff41';
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fillRect(s.x * grid + 1, s.y * grid + 1, grid - 2, grid - 2);
      });
      ctx.shadowBlur = 0;
    };

    const move = () => {
      const head = { x: (snake[0].x + dir.x + cols) % cols, y: (snake[0].y + dir.y + rows) % rows };
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        endGame();
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } else {
        snake.pop();
      }
      draw();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
      }
      if (e.key === 'ArrowUp' && dir.y === 0) dir = { x: 0, y: -1 };
      else if (e.key === 'ArrowDown' && dir.y === 0) dir = { x: 0, y: 1 };
      else if (e.key === 'ArrowLeft' && dir.x === 0) dir = { x: -1, y: 0 };
      else if (e.key === 'ArrowRight' && dir.x === 0) dir = { x: 1, y: 0 };
    };

    const loop = setInterval(move, 90);
    document.addEventListener('keydown', handleKeyDown);
    
    const endGame = () => {
        clearInterval(loop);
        setShowOverlay(true);
        setTimeout(() => setScene('menu'), 3000);
    };
    
    // Auto-exit after 45s
    const timeout = setTimeout(endGame, 45000);

    draw();

    return () => {
      clearInterval(loop);
      clearTimeout(timeout);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setScene]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#050505] relative">
       {showOverlay && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center backdrop-blur-sm">
            <div className="border-2 border-red-600 bg-black p-8 text-center shadow-[0_0_50px_rgba(255,0,0,0.4)]">
                <h2 className="text-red-600 font-vt323 text-5xl mb-2 animate-pulse">CONNECTION TERMINATED</h2>
                <p className="text-red-800 mt-4 text-xs font-mono tracking-widest">RUNTIME_ERROR: STACK_OVERFLOW</p>
            </div>
        </div>
      )}
      <canvas ref={canvasRef} width={640} height={480} className="rounded border border-green-900 shadow-lg bg-[#000]" />
      <div className="absolute top-6 right-6 text-green-800 font-mono text-xs">
        &gt; RUNNING SNAKE_v1.0.exe
      </div>
    </div>
  );
};

export default SnakeScene;
