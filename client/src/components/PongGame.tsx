import { useEffect, useRef, useState, useCallback } from "react";
import { RetroButton } from "./RetroButton";

interface PongGameProps {
  username: string;
  opponent: string;
  onClose: () => void;
  broadcastGame: (data: any) => void;
  gameData: any;
  primaryColor: string;
}

const W = 600, H = 400, PAD_H = 60, PAD_W = 10, BALL_SIZE = 10, PAD_SPEED = 6, BALL_SPEED = 5;

export function PongGame({ username, opponent, onClose, broadcastGame, gameData, primaryColor }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ball: { x: W / 2, y: H / 2, vx: BALL_SPEED, vy: BALL_SPEED },
    p1: { y: H / 2 - PAD_H / 2, score: 0 }, // left — challenger (lower username alphabetically)
    p2: { y: H / 2 - PAD_H / 2, score: 0 }, // right
    keys: { up: false, down: false },
    running: false,
  });
  const rafRef = useRef<number>(0);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<string | null>(null);

  // Determine which paddle this user controls
  const players = [username, opponent].sort();
  const isP1 = username === players[0]; // left paddle

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Center dashed line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = primaryColor + "44";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, s.p1.y, PAD_W, PAD_H);
    ctx.fillRect(W - PAD_W, s.p2.y, PAD_W, PAD_H);

    // Ball
    ctx.fillStyle = "#fff";
    ctx.fillRect(s.ball.x - BALL_SIZE / 2, s.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

    // Scores
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(s.p1.score), W / 4, 40);
    ctx.fillText(String(s.p2.score), (3 * W) / 4, 40);

    // Player labels
    ctx.font = "12px monospace";
    ctx.fillStyle = primaryColor + "99";
    ctx.fillText(players[0], W / 4, H - 10);
    ctx.fillText(players[1], (3 * W) / 4, H - 10);
  }, [primaryColor, players]);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    // Move my paddle
    const myPad = isP1 ? s.p1 : s.p2;
    if (s.keys.up) myPad.y = Math.max(0, myPad.y - PAD_SPEED);
    if (s.keys.down) myPad.y = Math.min(H - PAD_H, myPad.y + PAD_SPEED);

    // Broadcast my paddle position
    broadcastGame({ type: "pong", from: username, padY: myPad.y });

    // Only P1 simulates ball (authoritative)
    if (isP1) {
      s.ball.x += s.ball.vx;
      s.ball.y += s.ball.vy;

      // Top/bottom bounce
      if (s.ball.y <= BALL_SIZE / 2 || s.ball.y >= H - BALL_SIZE / 2) s.ball.vy *= -1;

      // Paddle collisions
      if (s.ball.x <= PAD_W + BALL_SIZE / 2 && s.ball.y >= s.p1.y && s.ball.y <= s.p1.y + PAD_H) {
        s.ball.vx = Math.abs(s.ball.vx);
        s.ball.vy += (s.ball.y - (s.p1.y + PAD_H / 2)) * 0.1;
      }
      if (s.ball.x >= W - PAD_W - BALL_SIZE / 2 && s.ball.y >= s.p2.y && s.ball.y <= s.p2.y + PAD_H) {
        s.ball.vx = -Math.abs(s.ball.vx);
        s.ball.vy += (s.ball.y - (s.p2.y + PAD_H / 2)) * 0.1;
      }

      // Score
      if (s.ball.x < 0) {
        s.p2.score++;
        setScores({ p1: s.p1.score, p2: s.p2.score });
        resetBall(s, 1);
      } else if (s.ball.x > W) {
        s.p1.score++;
        setScores({ p1: s.p1.score, p2: s.p2.score });
        resetBall(s, -1);
      }

      if (s.p1.score >= 7 || s.p2.score >= 7) {
        s.running = false;
        const w = s.p1.score >= 7 ? players[0] : players[1];
        setWinner(w);
        broadcastGame({ type: "pong-end", winner: w });
        return;
      }

      broadcastGame({ type: "pong-ball", ball: s.ball });
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [isP1, username, broadcastGame, draw, players]);

  function resetBall(s: typeof stateRef.current, dir: number) {
    s.ball = { x: W / 2, y: H / 2, vx: BALL_SPEED * dir, vy: (Math.random() - 0.5) * BALL_SPEED };
  }

  // Handle incoming game data
  useEffect(() => {
    if (!gameData || gameData.type !== "pong" && gameData.type !== "pong-ball" && gameData.type !== "pong-end") return;
    const s = stateRef.current;
    if (gameData.type === "pong" && gameData.from !== username) {
      const opponentPad = isP1 ? s.p2 : s.p1;
      opponentPad.y = gameData.padY;
    }
    if (gameData.type === "pong-ball" && !isP1) {
      s.ball = gameData.ball;
    }
    if (gameData.type === "pong-end") {
      s.running = false;
      setWinner(gameData.winner);
    }
  }, [gameData, isP1, username]);

  // Keyboard controls
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") stateRef.current.keys.up = true;
      if (e.key === "ArrowDown" || e.key === "s") stateRef.current.keys.down = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") stateRef.current.keys.up = false;
      if (e.key === "ArrowDown" || e.key === "s") stateRef.current.keys.down = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Touch controls
  const touchStart = useRef(0);
  const handleTouchMove = (e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    const s = stateRef.current;
    const myPad = isP1 ? s.p1 : s.p2;
    const rect = canvasRef.current!.getBoundingClientRect();
    myPad.y = Math.max(0, Math.min(H - PAD_H, ((y - rect.top) / rect.height) * H - PAD_H / 2));
  };

  const startGame = () => {
    stateRef.current.running = true;
    stateRef.current.p1.score = 0;
    stateRef.current.p2.score = 0;
    setScores({ p1: 0, p2: 0 });
    setWinner(null);
    resetBall(stateRef.current, 1);
    rafRef.current = requestAnimationFrame(tick);
    broadcastGame({ type: "pong-start" });
  };

  useEffect(() => {
    if (gameData?.type === "pong-start" && !isP1) {
      stateRef.current.running = true;
      setWinner(null);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [gameData, isP1, tick]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
            PONG — {players[0]} vs {players[1]}
          </h2>
          <button onClick={onClose} style={{ color: primaryColor }} className="text-2xl">✕</button>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="border-2 max-w-full"
          style={{ borderColor: primaryColor, touchAction: "none" }}
          onTouchMove={handleTouchMove}
        />

        <p className="text-sm opacity-60" style={{ color: primaryColor }}>
          {isP1 ? "You are LEFT paddle" : "You are RIGHT paddle"} — Arrow keys / W·S / touch to move · First to 7 wins
        </p>

        {winner ? (
          <div className="text-center">
            <p className="text-2xl font-bold mb-3" style={{ color: primaryColor }}>
              {winner === username ? "🏆 YOU WIN!" : `${winner} wins!`}
            </p>
            <div className="flex gap-3">
              {isP1 && <RetroButton onClick={startGame}>REMATCH</RetroButton>}
              <RetroButton onClick={onClose}>CLOSE</RetroButton>
            </div>
          </div>
        ) : !stateRef.current.running ? (
          isP1 ? (
            <RetroButton onClick={startGame}>START GAME</RetroButton>
          ) : (
            <p style={{ color: primaryColor }} className="animate-pulse">Waiting for {players[0]} to start...</p>
          )
        ) : null}
      </div>
    </div>
  );
}
