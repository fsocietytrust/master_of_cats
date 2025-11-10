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

    let loop: NodeJS.Timer;

    const endGame = () => {
      clearInterval(loop);
      setShowOverlay(true);
      setTimeout(() => setScene('menu'), 3000);
    };

    const draw = () => {
      ctx.fillStyle = '#050a08';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#0a1f11';
      ctx.lineWidth = 1;

      for (let i = 0; i < cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * grid, 0);
        ctx.lineTo(i * grid, canvas.height);
        ctx.stroke();
      }

      for (let j = 0; j < rows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * grid);
        ctx.lineTo(canvas.width, j * grid);
        ctx.stroke();
      }

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff8c00';
      ctx.fillStyle = '#ff8c00';
      ctx.fillRect(food.x * grid + 4, food.y * grid + 4, grid - 8, grid - 8);
      ctx.shadowBlur = 0;

      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#00ff41' : '#008f11';
        if (i === 0) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ff41';
        }
        ctx.fillRect(s.x * grid + 1, s.y * grid + 1, grid - 2, grid - 2);
        ctx.shadowBlur = 0;
      });
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
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowUp' && dir.y === 0) dir = { x: 0, y: -1 };
      else if (e.key === 'ArrowDown' && dir.y === 0) dir = { x: 0, y: 1 };
      else if (e.key === 'ArrowLeft' && dir.x === 0) dir = { x: -1, y: 0 };
      else if (e.key === 'ArrowRight' && dir.x === 0) dir = { x: 1, y: 0 };
    };

    loop = setInterval(move, 100);
    document.addEventListener('keydown', handleKeyDown);
    const timeout = setTimeout(endGame, 30000);

    draw();

    return () => {
      clearInterval(loop);
      clearTimeout(timeout);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setScene]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative">
      {showOverlay && (
        <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center backdrop-blur-sm">
          <div className="border border-red-500 bg-black p-8 text-center shadow-[0_0_30px_rgba(255,0,0,0.3)]">
            <h2 className="text-red-500 font-vt323 text-4xl mb-2 animate-pulse">CONNECTION LOST</h2>
            <p className="text-gray-500 mt-4 text-xs font-mono">DATA STREAM INTERRUPTED</p>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={640} height={480} className="rounded border border-green-900/50 shadow-lg bg-[#050a08]" />
      <div className="absolute top-4 right-4 text-green-900 font-mono text-xs">PROTOCOL: SNAKE_V1</div>
    </div>
  );
};

export default SnakeScene;
