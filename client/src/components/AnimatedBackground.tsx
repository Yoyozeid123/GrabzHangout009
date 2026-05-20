import React from 'react';

interface AnimatedBackgroundProps {
  theme: string;
}

// All random values pre-computed — never recalculated on re-render
const RAIN_COLS = Array.from({ length: 20 }, (_, i) => ({
  left: `${i * 5}%`,
  duration: `${3 + (i % 4)}s`,
  delay: `${(i * 0.3) % 2}s`,
  chars: Array.from({ length: 20 }, (_, j) =>
    String.fromCharCode(0x30A0 + ((i * 7 + j * 3) % 96))
  ).join(''),
}));

const ORB_DATA = Array.from({ length: 8 }, (_, i) => ({
  width: `${20 + (i * 7) % 40}px`,
  height: `${20 + (i * 7) % 40}px`,
  left: `${(i * 13) % 100}%`,
  top: `${(i * 17) % 100}%`,
  duration: `${8 + (i % 4)}s`,
  delay: `${(i * 0.5) % 4}s`,
}));

const MatrixRain = React.memo(() => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {RAIN_COLS.map((col, i) => (
      <div
        key={i}
        className="absolute text-green-400 text-xs font-mono opacity-40 select-none"
        style={{
          left: col.left,
          top: '-100vh',
          animation: `matrixRain ${col.duration} linear infinite`,
          animationDelay: col.delay,
          writingMode: 'vertical-rl',
          letterSpacing: '0.5em',
        }}
      >
        {col.chars}
      </div>
    ))}
  </div>
));

const SynthwaveGrid = React.memo(() => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div
      className="absolute bottom-0 left-0 w-full h-1/2"
      style={{
        background: `
          repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(139,92,246,0.12) 20px, rgba(139,92,246,0.12) 21px),
          repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(244,114,182,0.12) 20px, rgba(244,114,182,0.12) 21px)
        `,
        transform: 'perspective(500px) rotateX(60deg)',
        transformOrigin: 'bottom',
        animation: 'synthGrid 8s linear infinite',
      }}
    />
  </div>
));

const FloatingOrbs = React.memo(({ color }: { color: string }) => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {ORB_DATA.map((orb, i) => (
      <div
        key={i}
        className="absolute rounded-full"
        style={{
          width: orb.width,
          height: orb.height,
          background: `radial-gradient(circle, ${color}55, transparent)`,
          left: orb.left,
          top: orb.top,
          animation: `orbFloat ${orb.duration} ease-in-out infinite`,
          animationDelay: orb.delay,
        }}
      />
    ))}
  </div>
));

export const AnimatedBackground = React.memo(({ theme }: AnimatedBackgroundProps) => {
  switch (theme) {
    case 'green': return <MatrixRain />;
    case 'purple': return <SynthwaveGrid />;
    case 'amber': return <FloatingOrbs color="#fbbf24" />;
    case 'ice': return <FloatingOrbs color="#67e8f9" />;
    case 'blood': return <FloatingOrbs color="#f87171" />;
    default: return <MatrixRain />;
  }
});
