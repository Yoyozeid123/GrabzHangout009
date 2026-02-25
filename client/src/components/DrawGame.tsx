import { useState, useRef, useEffect } from "react";
import { RetroButton } from "./RetroButton";

interface DrawGameProps {
  username: string;
  isAdmin: boolean;
  onClose: () => void;
  broadcastGame: (data: any) => void;
  gameData: any;
}

export function DrawGame({ username, isAdmin, onClose, broadcastGame, gameData }: DrawGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [word, setWord] = useState("");
  const [drawer, setDrawer] = useState("");

  useEffect(() => {
    if (gameData?.type === 'draw') {
      if (gameData.drawer) setDrawer(gameData.drawer);
      if (gameData.word && gameData.drawer === username) setWord(gameData.word);
      if (gameData.drawing && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => ctx?.drawImage(img, 0, 0);
        img.src = gameData.drawing;
      }
    }
  }, [gameData, username]);

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      broadcastGame({ 
        type: 'draw', 
        drawing: canvasRef.current.toDataURL(),
        drawer: username,
        word
      });
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing && e.type !== 'mousedown') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00ff00';

    if (e.type === 'mousedown') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startGame = () => {
    const words = ['CAT', 'HOUSE', 'TREE', 'CAR', 'SUN', 'MOON', 'STAR', 'FISH'];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setWord(randomWord);
    setDrawer(username);
    broadcastGame({ type: 'draw', drawer: username, word: randomWord });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-6 max-w-4xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-[#00ff00] text-shadow-neon">🎨 DRAW & GUESS</h2>
          <button onClick={onClose} className="text-[#ff6f61] text-2xl">✕</button>
        </div>

        {!drawer && isAdmin && (
          <div className="text-center mb-4">
            <RetroButton onClick={startGame}>START DRAWING</RetroButton>
          </div>
        )}

        {drawer === username && word && (
          <div className="text-center mb-4">
            <p className="text-[#ff6f61] text-2xl">Your word: {word}</p>
          </div>
        )}

        {drawer && drawer !== username && (
          <div className="text-center mb-4">
            <p className="text-[#00ff00] text-xl">{drawer} is drawing! Guess in chat!</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="border-4 border-[#00ff00] bg-black w-full cursor-crosshair"
          onMouseDown={drawer === username ? startDrawing : undefined}
          onMouseMove={drawer === username ? draw : undefined}
          onMouseUp={drawer === username ? stopDrawing : undefined}
          onMouseLeave={drawer === username ? stopDrawing : undefined}
        />

        {drawer === username && (
          <div className="mt-4 flex gap-2">
            <RetroButton onClick={clearCanvas} variant="secondary">CLEAR</RetroButton>
          </div>
        )}
      </div>
    </div>
  );
}
