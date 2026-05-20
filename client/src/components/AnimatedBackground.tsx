import React from 'react';

interface AnimatedBackgroundProps {
  theme: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ theme }) => {
  const MatrixRain = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute text-green-400 text-xs font-mono opacity-40 select-none"
          style={{
            left: `${i * 5}%`,
            top: '-100vh',
            animation: `matrixRain ${3 + (i % 4)}s linear infinite`,
            animationDelay: `${(i * 0.3) % 2}s`,
            writingMode: 'vertical-rl',
            letterSpacing: '0.5em',
          }}
        >
          {Array.from({ length: 20 }, (_, j) =>
            String.fromCharCode(0x30A0 + ((i * 7 + j * 3) % 96))
          ).join('')}
        </div>
      ))}
    </div>
  );

  const SynthwaveGrid = () => (
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
  );

  const FloatingOrbs = ({ color }: { color: string }) => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${20 + (i * 7) % 40}px`,
            height: `${20 + (i * 7) % 40}px`,
            background: `radial-gradient(circle, ${color}55, transparent)`,
            left: `${(i * 13) % 100}%`,
            top: `${(i * 17) % 100}%`,
            animation: `orbFloat ${8 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.5) % 4}s`,
          }}
        />
      ))}
    </div>
  );

  switch (theme) {
    case 'green': return <MatrixRain />;
    case 'purple': return <SynthwaveGrid />;
    case 'amber': return <FloatingOrbs color="#fbbf24" />;
    case 'ice': return <FloatingOrbs color="#67e8f9" />;
    case 'blood': return <FloatingOrbs color="#f87171" />;
    default: return <MatrixRain />;
  }
};
