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
  const playersRef = useRef<Record<string, Player>>({});
  const foodRef = useRef({ x: 10, y: 10 });
  const myDirectionRef = useRef("RIGHT");
  const lastBroadcastRef = useRef(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gameData) return;
    
    // Handle direction changes
    if (gameData.type === 'snake-direction') {
      console.log('[SnakeGame] Received direction change:', gameData.username, gameData.direction);
      const currentPlayers = { ...playersRef.current };
      if (currentPlayers[gameData.username]) {
        currentPlayers[gameData.username] = {
          ...currentPlayers[gameData.username],
          direction: gameData.direction
        };
        playersRef.current = currentPlayers;
        
        // Update my own direction ref if it's me
        if (gameData.username === username) {
          myDirectionRef.current = gameData.direction;
        }
      }
      return;
    }
    
    // Handle full game state
    if (gameData.type === 'snake') {
      console.log('[SnakeGame] Received game data:', { 
        controller: gameData.controller, 
        isMe: gameData.controller === username,
        playerCount: Object.keys(gameData.players || {}).length 
      });
      
      const newPlayers = gameData.players || {};
      const newFood = gameData.food || food;
      
      // Always update display state
      setPlayers(newPlayers);
      setFood(newFood);
      
      // Update refs with latest data
      playersRef.current = newPlayers;
      foodRef.current = newFood;
      
      // Keep my own direction ref in sync
      if (newPlayers[username]) {
        myDirectionRef.current = newPlayers[username].direction;
      }
      
      if (gameData.started !== undefined) setGameStarted(gameData.started);
      if (gameData.controller) setIsController(gameData.controller === username);
    }
  }, [gameData, username]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key;
      const currentDir = myDirectionRef.current;
      let newDir = currentDir;
      
      if (key === "ArrowUp" && currentDir !== "DOWN") newDir = "UP";
      else if (key === "ArrowDown" && currentDir !== "UP") newDir = "DOWN";
      else if (key === "ArrowLeft" && currentDir !== "RIGHT") newDir = "LEFT";
      else if (key === "ArrowRight" && currentDir !== "LEFT") newDir = "RIGHT";
      
      if (newDir !== currentDir) {
        myDirectionRef.current = newDir;
        console.log('[SnakeGame] Direction changed:', newDir, 'isController:', isController);
        
        // Update local direction
        const currentPlayers = { ...playersRef.current };
        if (currentPlayers[username]) {
          currentPlayers[username] = { ...currentPlayers[username], direction: newDir };
          playersRef.current = currentPlayers;
          
          // Broadcast direction change (not full game state)
          broadcastGame({
            type: 'snake-direction',
            username,
            direction: newDir
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [username, isController, broadcastGame]);

  useEffect(() => {
    if (!gameStarted || !isController) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }
    
    console.log('[SnakeGame] Starting game loop as controller');

    gameLoopRef.current = setInterval(() => {
      const currentPlayers = { ...playersRef.current };
      let newFood = { ...foodRef.current };
      let foodEaten = false;

      // Move all players
      Object.entries(currentPlayers).forEach(([name, player]) => {
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
          currentPlayers[name] = { ...player, alive: false };
          return;
        }

        // Check self collision
        if (player.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          currentPlayers[name] = { ...player, alive: false };
          return;
        }

        const newSnake = [newHead, ...player.snake];
        
        // Check food
        if (newHead.x === newFood.x && newHead.y === newFood.y) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          foodEaten = true;
          currentPlayers[name] = {
            ...player,
            snake: newSnake,
            score: player.score + 1
          };
        } else {
          newSnake.pop();
          currentPlayers[name] = {
            ...player,
            snake: newSnake
          };
        }
      });

      playersRef.current = currentPlayers;
      foodRef.current = newFood;
      
      broadcastGame({
        type: 'snake',
        players: currentPlayers,
        food: newFood,
        started: true,
        controller: username
      });
    }, 150);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameStarted, isController, username, broadcastGame]);

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
    const newPlayers = { ...playersRef.current };
    newPlayers[username] = {
      username,
      snake: [{ x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) }],
      direction: "RIGHT",
      alive: true,
      score: 0
    };
    
    playersRef.current = newPlayers;

    broadcastGame({
      type: 'snake',
      players: newPlayers,
      food: foodRef.current,
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
            
            {players[username] && !players[username].alive && (
              <div className="text-center mt-4">
                <p className="text-[#ff6f61] text-xl mb-2">💀 YOU DIED!</p>
                <RetroButton onClick={joinGame}>RESPAWN</RetroButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
