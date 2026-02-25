import { useState, useEffect } from "react";
import { RetroButton } from "./RetroButton";

interface DuelGameProps {
  username: string;
  isAdmin: boolean;
  onClose: () => void;
  broadcastGame: (data: any) => void;
  gameData: any;
  onlineUsers: string[];
}

export function DuelGame({ username, isAdmin, onClose, broadcastGame, gameData, onlineUsers }: DuelGameProps) {
  const [status, setStatus] = useState<'setup' | 'ready' | 'draw' | 'done'>('setup');
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [myTime, setMyTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    if (gameData?.type === 'duel') {
      if (gameData.status === 'ready') {
        setStatus('ready');
        setPlayer1(gameData.player1);
        setPlayer2(gameData.player2);
      } else if (gameData.status === 'draw') {
        setStatus('draw');
        setStartTime(Date.now());
      } else if (gameData.status === 'done') {
        setStatus('done');
      }
    }
  }, [gameData]);

  const startDuel = (p1: string, p2: string) => {
    setPlayer1(p1);
    setPlayer2(p2);
    setStatus('ready');
    broadcastGame({ type: 'duel', status: 'ready', player1: p1, player2: p2 });
    
    setTimeout(() => {
      const delay = 2000 + Math.random() * 3000;
      setTimeout(() => {
        setStatus('draw');
        setStartTime(Date.now());
        broadcastGame({ type: 'duel', status: 'draw' });
      }, delay);
    }, 1000);
  };

  const handleDraw = () => {
    if (status === 'draw' && !myTime && (username === player1 || username === player2)) {
      const time = Date.now() - startTime;
      setMyTime(time);
      broadcastGame({ type: 'duel', status: 'shot', username, time });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl text-[#00ff00] text-shadow-neon">🔫 QUICK DRAW DUEL</h2>
          <button onClick={onClose} className="text-[#ff6f61] text-2xl">✕</button>
        </div>

        {status === 'setup' && (
          <div>
            <p className="text-[#00ff00] text-xl mb-4">Select 2 players:</p>
            <div className="grid grid-cols-2 gap-4">
              {onlineUsers.filter(u => u !== username).slice(0, 10).map(user => (
                <RetroButton
                  key={user}
                  onClick={() => {
                    if (!player1) setPlayer1(user);
                    else if (!player2 && user !== player1) {
                      startDuel(player1, user);
                    }
                  }}
                  variant={player1 === user ? "default" : "secondary"}
                >
                  {user}
                </RetroButton>
              ))}
            </div>
            {player1 && !player2 && (
              <p className="text-[#ff6f61] text-center mt-4">Selected: {player1}. Pick opponent!</p>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="text-center">
            <p className="text-[#00ff00] text-3xl mb-8">
              {player1} 🆚 {player2}
            </p>
            <div className="text-[#ff6f61] text-6xl mb-4 animate-pulse">⏳</div>
            <p className="text-[#ff6f61] text-2xl">GET READY TO DRAW...</p>
          </div>
        )}

        {status === 'draw' && (
          <div 
            className="text-center cursor-pointer bg-[#ff6f61] p-16 border-4 border-[#ff6f61]"
            onClick={handleDraw}
          >
            <p className="text-black text-8xl mb-4">🔫</p>
            <p className="text-black text-6xl font-bold">DRAW!</p>
            {myTime && (
              <p className="text-black text-3xl mt-4">{myTime}ms</p>
            )}
          </div>
        )}

        {status === 'done' && gameData?.winner && (
          <div className="text-center">
            <p className="text-[#00ff00] text-6xl mb-6">🏆</p>
            <p className="text-[#00ff00] text-4xl mb-4">{gameData.winner} WINS!</p>
            <p className="text-[#00ff00] text-2xl">{gameData.winnerTime}ms</p>
          </div>
        )}
      </div>
    </div>
  );
}
