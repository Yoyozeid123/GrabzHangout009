import { useState, useEffect } from "react";
import { RetroButton } from "./RetroButton";

interface ReactionGameProps {
  username: string;
  isAdmin: boolean;
  onClose: () => void;
  broadcastGame: (data: any) => void;
  gameData: any;
}

export function ReactionGame({ username, isAdmin, onClose, broadcastGame, gameData }: ReactionGameProps) {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'go' | 'done'>('waiting');
  const [myTime, setMyTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    if (gameData?.type === 'reaction') {
      if (gameData.status === 'go') {
        setStatus('go');
        setStartTime(Date.now());
      } else if (gameData.status === 'results') {
        setStatus('done');
      }
    }
  }, [gameData]);

  const startGame = () => {
    setStatus('ready');
    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => {
      setStatus('go');
      setStartTime(Date.now());
      broadcastGame({ type: 'reaction', status: 'go' });
    }, delay);
  };

  const handleClick = () => {
    if (status === 'go' && !myTime) {
      const time = Date.now() - startTime;
      setMyTime(time);
      broadcastGame({ type: 'reaction', status: 'click', username, time });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl text-[#00ff00] text-shadow-neon">🎯 REACTION TEST</h2>
          <button onClick={onClose} className="text-[#ff6f61] text-2xl">✕</button>
        </div>

        {status === 'waiting' && (
          <div className="text-center">
            <p className="text-[#00ff00] text-2xl mb-6">
              {isAdmin ? "Click START to begin!" : "Waiting for admin to start..."}
            </p>
            {isAdmin && (
              <RetroButton onClick={startGame} className="text-2xl px-8 py-4">
                START GAME
              </RetroButton>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="text-center">
            <div className="text-[#ff6f61] text-6xl mb-4 animate-pulse">⏳</div>
            <p className="text-[#ff6f61] text-3xl">GET READY...</p>
          </div>
        )}

        {status === 'go' && (
          <div 
            className="text-center cursor-pointer bg-[#00ff00] p-12 border-4 border-[#00ff00] animate-pulse"
            onClick={handleClick}
          >
            <p className="text-black text-6xl font-bold">CLICK NOW!</p>
            {myTime && (
              <p className="text-black text-3xl mt-4">{myTime}ms</p>
            )}
          </div>
        )}

        {status === 'done' && gameData?.results && (
          <div className="text-center">
            <p className="text-[#00ff00] text-3xl mb-6">🏆 RESULTS</p>
            <div className="space-y-2">
              {gameData.results.map((r: any, i: number) => (
                <div key={i} className="text-[#00ff00] text-xl">
                  {i + 1}. {r.username}: {r.time}ms
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
