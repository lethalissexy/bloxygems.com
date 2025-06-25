import React from 'react';

const LoadingSpinner = ({ size = 40, thickness = 4, centered = false }) => {  
  const staticId = 'blox-spinner';
  
  const containerStyle = {
    display: 'inline-flex',
    position: centered ? 'absolute' : 'relative',
    ...(centered && {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }),
    zIndex: 9999,
  };

  return (
    <div style={containerStyle}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={`spinner-gradient-${staticId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB800" />
            <stop offset="40%" stopColor="#FFD700" />
            <stop offset="70%" stopColor="#00FFD0" />
            <stop offset="100%" stopColor="#FF4B4B" />
          </linearGradient>
          <filter id={`glow-${staticId}`}>
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - thickness) / 2}
          fill="none"
          stroke={`url(#spinner-gradient-${staticId})`}
          strokeWidth={thickness}
          strokeDasharray={Math.PI * (size - thickness)}
          strokeDashoffset={Math.PI * (size - thickness) * 0.25}
          strokeLinecap="round"
          style={{
            filter: `url(#glow-${staticId})`,
            transformOrigin: '50% 50%',
            animation: `spin-blox 1.1s linear infinite, pulse-blox 1.5s ease-in-out infinite`,
          }}
        />
      </svg>
      <style>{`
        @keyframes spin-blox {
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-blox {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; filter: drop-shadow(0 0 16px #FFD700) drop-shadow(0 0 32px #00FFD0); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner; 