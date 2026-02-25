import { useState, useEffect, useRef } from "react";
import { RetroButton } from "./RetroButton";

interface SnakeGameProps {
  username: string;
  isAdmin: boolean;
  isRoomOwner: boolean;
  onClose: () => void;
  broadcastGame: (data: any) => void;
  gameData: any;
}

interface Player {
  username: string;
  snake: { x: number; y: number }[];
  direction: string;
  alive: boolean;
  score: number;
}

const GRID_SIZE = 20;
const CELL_SIZE = 20;

export function SnakeGame({ username, isAdmin, isRoomOwner, onClose, broadcastGame, gameData }: SnakeGameProps) {
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [food, setFood] = useState({ x: 10, y: 10 });
  const [gameStarted, setGameStarted] = useState(false);
  const [isController, setIsController] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef("RIGHT");
  const myDirectionRef = useRef("RIGHT");

  useEffect(() => {
    if (gameData?.type === 'snake') {
      if (gameData.players) setPlayers(gameData.players);
      if (gameData.food) setFood(gameData.food);
      if (gameData.started !== undefined) setGameStarted(gameData.started);
      if (gameData.controller) setIsController(gameData.controller === username);
    }
  }, [gameData, username]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key;
      const currentDir = myDirectionRef.current;
      
      if (key === "ArrowUp" && currentDir !== "DOWN") myDirectionRef.current = "UP";
      else if (key === "ArrowDown" && currentDir !== "UP") myDirectionRef.current = "DOWN";
      else if (key === "ArrowLeft" && currentDir !== "RIGHT") myDirectionRef.current = "LEFT";
      else if (key === "ArrowRight" && currentDir !== "LEFT") myDirectionRef.current = "RIGHT";
      
      // Broadcast direction change
      if (players[username]) {
        const updatedPlayers = { ...players };
        updatedPlayers[username] = { ...players[username], direction: myDirectionRef.current };
        broadcastGame({
          type: 'snake',
          players: updatedPlayers,
          food,
          started: gameStarted,
          controller: isController ? username : undefined
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [players, username, food, gameStarted, isController, broadcastGame]);

  useEffect(() => {
    if (!gameStarted || !isController) return;

    const interval = setInterval(() => {
      const updatedPlayers = { ...players };
      let newFood = { ...food };
      let foodEaten = false;

      // Move all players
      Object.entries(players).forEach(([name, player]) => {
        if (!player.alive) return;

        const head = player.snake[0];
        let newHead = { ...head };
        const dir = player.direction;

        switch (dir) {
          case "UP": newHead.y -= 1; break;
          case "DOWN": newHead.y += 1; break;
          case "LEFT": newHead.x -= 1; break;
          case "RIGHT": newHead.x += 1; break;
        }

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          updatedPlayers[name] = { ...player, alive: false };
          return;
        }

        // Check self collision
        if (player.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          updatedPlayers[name] = { ...player, alive: false };
          return;
        }

        const newSnake = [newHead, ...player.snake];
        
        // Check food
        if (newHead.x === food.x && newHead.y === food.y) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          foodEaten = true;
          updatedPlayers[name] = {
            ...player,
            snake: newSnake,
            score: player.score + 1
          };
        } else {
          newSnake.pop();
          updatedPlayers[name] = {
            ...player,
            snake: newSnake
          };
        }
      });

      broadcastGame({
        type: 'snake',
        players: updatedPlayers,
        food: newFood,
        started: true,
        controller: username
      });
    }, 150);

    return () => clearInterval(interval);
  }, [gameStarted, isController, players, food, username, broadcastGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#00ff0033';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = '#ff6f61';
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Draw players
    const colors = ['#00ff00', '#00ffff', '#ffff00', '#ff00ff', '#ff8800'];
    Object.entries(players).forEach(([name, player], idx) => {
      if (!player.alive) return;
      ctx.fillStyle = colors[idx % colors.length];
      player.snake.forEach(seg => {
        ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
      });
    });
  }, [players, food]);

  const startGame = () => {
    const initialPlayers: Record<string, Player> = {};
    initialPlayers[username] = {
      username,
      snake: [{ x: 10, y: 10 }],
      direction: "RIGHT",
      alive: true,
      score: 0
    };

    broadcastGame({
      type: 'snake',
      players: initialPlayers,
      food: { x: 15, y: 15 },
      started: true,
      controller: username
    });
    setIsController(true);
  };

  const joinGame = () => {
    const newPlayers = { ...players };
    newPlayers[username] = {
      username,
      snake: [{ x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) }],
      direction: "RIGHT",
      alive: true,
      score: 0
    };

    broadcastGame({
      type: 'snake',
      players: newPlayers,
      food,
      started: gameStarted,
      controller: isController ? username : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-6 max-w-4xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-[#00ff00] text-shadow-neon">🐍 MULTIPLAYER SNAKE</h2>
          <button onClick={onClose} className="text-[#ff6f61] text-2xl">✕</button>
        </div>

        {!gameStarted ? (
          <div className="text-center">
            <p className="text-[#00ff00] text-xl mb-4">Use arrow keys to control your snake!</p>
            {(isAdmin || isRoomOwner) && (
              <RetroButton onClick={startGame} className="text-xl px-8 py-4">
                START GAME
              </RetroButton>
            )}
            {!isAdmin && !isRoomOwner && <p className="text-[#00ff00] animate-pulse">Waiting for admin to start...</p>}
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4">
              {Object.entries(players).map(([name, player]) => (
                <div key={name} className={`text-[#00ff00] ${!player.alive ? 'opacity-50' : ''}`}>
                  {name}: {player.score} {!player.alive && '💀'}
                </div>
              ))}
            </div>

            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="border-4 border-[#00ff00] mx-auto"
            />

            {!players[username] && (
              <div className="text-center mt-4">
                <RetroButton onClick={joinGame}>JOIN GAME</RetroButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
