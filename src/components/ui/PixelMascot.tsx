import React, { useState, useEffect, useRef } from 'react';

export interface PixelMascotProps {
  className?: string;
  direction?: 'left' | 'right';
  state?: 'idle' | 'walking' | 'thinking' | 'typing' | 'peeking' | 'neutral' | 'sleeping';
  thought?: string;
}

export const PixelMascot = ({ 
  className, 
  direction = 'right', 
  state = 'idle',
  thought 
}: PixelMascotProps) => {
  const [isJumping, setIsJumping] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (prevStateRef.current === 'sleeping' && state !== 'sleeping') {
      setIsWaking(true);
      const timer = setTimeout(() => setIsWaking(false), 600);
      return () => clearTimeout(timer);
    }
    prevStateRef.current = state;
  }, [state]);

  const handleTap = () => {
    if (isJumping) return;
    setIsJumping(true);
    setShowHeart(true);
    setTimeout(() => setIsJumping(false), 600);
    setTimeout(() => setShowHeart(false), 1500);
  };

  const isWalking = state === 'walking';
  const isTyping = state === 'typing';
  const isThinking = state === 'thinking';
  const isSleeping = state === 'sleeping';

  return (
    <div 
      className={`relative inline-block ${className}`}
      onClick={handleTap}
      style={{ cursor: 'pointer' }}
    >
      {thought && !isSleeping && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[120%] bg-white border-2 border-black p-1.5 rounded-lg z-20 whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce-custom">
          <p className="font-display font-bold text-[10px] uppercase">{thought}</p>
          <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white border-r-2 border-b-2 border-black rotate-45"></div>
        </div>
      )}

      {isSleeping && (
        <div className="absolute top-1/2 right-12 z-20 transform -translate-y-1/2">
          <div className="animate-float-up opacity-0" style={{ animationDelay: '0s' }}>
            <span className="font-display font-bold text-xl text-black">Z</span>
          </div>
          <div className="absolute top-0 right-4 animate-float-up opacity-0" style={{ animationDelay: '1s' }}>
            <span className="font-display font-bold text-lg text-black">z</span>
          </div>
          <div className="absolute top-2 right-8 animate-float-up opacity-0" style={{ animationDelay: '2s' }}>
            <span className="font-display font-bold text-sm text-black">z</span>
          </div>
        </div>
      )}

      {showHeart && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 animate-float-up pointer-events-none z-10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
             <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#EF4444" stroke="black" strokeWidth="2"/>
          </svg>
        </div>
      )}

      <svg 
        viewBox="-60 -40 240 200" 
        className={`w-full h-full transition-transform duration-100 ${isJumping || isWalking ? 'animate-bounce-custom' : ''}`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        style={{ transform: direction === 'left' ? 'scaleX(-1)' : 'none' }}
      >
        <defs>
          <style>
            {`
              .mascot-wag { animation: wag 1s ease-in-out infinite; }
              .mascot-wave { animation: wave 2s ease-in-out infinite; }
              .glasses-shine { animation: shine 3s linear infinite; }
              .mascot-type { animation: type 0.2s steps(2) infinite; }
              .mascot-sleep { animation: breathe 3s ease-in-out infinite; }
              .animate-jump-wake { animation: jump-wake 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
              .animate-float-up { animation: float-up 2s ease-in-out infinite; }
              .animate-bounce-custom { animation: jump 0.5s infinite; }
              
              @keyframes float-up {
                0% { transform: translateY(0); opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { transform: translateY(-20px); opacity: 0; }
              }
              @keyframes wag {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(-20deg); }
              }
              @keyframes wave {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(25deg); }
              }
              @keyframes shine {
                0% { transform: translateX(-20px); opacity: 0; }
                50% { opacity: 0.8; }
                100% { transform: translateX(20px); opacity: 0; }
              }
              @keyframes jump {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px) scale(0.9, 1.1); }
              }
              @keyframes jump-wake {
                0% { transform: translate(-60px, 10px) rotate(90deg) scale(1); }
                40% { transform: translate(0px, -20px) rotate(-10deg) scale(1.1); }
                100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
              }
              @keyframes type {
                0% { transform: translateY(0); }
                100% { transform: translateY(2px); }
              }
              @keyframes breathe {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
              }
            `}
          </style>
        </defs>

        <ellipse cx="40" cy="58" rx="16" ry="4" fill="black" opacity="0.2" />

        <g 
          transform={isSleeping ? "translate(-60, 10) rotate(90 40 58)" : "translate(0, 0)"}
          style={{ transition: 'transform 0.3s ease-in-out', transformOrigin: '40px 58px' }}
          className={isWaking ? "animate-jump-wake" : ""}
        > 
          
          <g className={isSleeping ? "mascot-sleep" : "mascot-wag"} transform-origin="10 50">
            <rect x="2" y="40" width="12" height="14" fill="#EA580C" />
            <rect x="0" y="36" width="10" height="10" fill="#EA580C" />
            <rect x="14" y="44" width="4" height="6" fill="#EA580C" />
            <rect x="0" y="32" width="6" height="6" fill="#FDBA74" />
          </g>

          <g className={isSleeping ? "mascot-sleep" : ""}>
            <rect x="18" y="38" width="28" height="18" fill="#EA580C" />
            <rect x="16" y="42" width="32" height="12" fill="#EA580C" />
            
            <rect x="24" y="38" width="16" height="14" fill="white" />
            <rect x="22" y="42" width="20" height="8" fill="white" />

            <rect x="20" y="54" width="8" height="4" fill="#3F3F46" />
            <rect x="36" y="54" width="8" height="4" fill="#3F3F46" />

            <g className={isTyping ? "mascot-type" : ""}>
              <rect x="16" y="44" width="6" height="8" fill="#EA580C" />
              <rect x="16" y="50" width="6" height="4" fill="white" />
            </g>

            <g className={isTyping ? "mascot-type" : (isSleeping ? "" : "mascot-wave")} style={{ transformOrigin: '48px 44px' }}>
              <rect x="46" y="42" width="12" height="6" fill="#EA580C" transform={isSleeping ? "rotate(-80 46 42) translate(-2, 4)" : "rotate(-30 46 42)"} />
              <rect x="54" y="34" width="8" height="8" fill="white" transform={isSleeping ? "rotate(-60 54 34) translate(-4, 6)" : "rotate(-10 54 34)"} />
              {!isSleeping && (
                <>
                  <rect x="55" y="35" width="2" height="2" fill="#EA580C" transform="rotate(-10 54 34)"/>
                  <rect x="58" y="35" width="2" height="2" fill="#EA580C" transform="rotate(-10 54 34)"/>
                </>
              )}
            </g>

            <g>
              <rect x="12" y="14" width="40" height="22" fill="#EA580C" />
              <rect x="10" y="18" width="44" height="14" fill="#EA580C" />
              <rect x="8" y="22" width="48" height="8" fill="#EA580C" />

              <rect x="14" y="4" width="10" height="12" fill="#EA580C" />
              <rect x="40" y="4" width="10" height="12" fill="#EA580C" />
              <rect x="16" y="8" width="6" height="6" fill="#FDBA74" />
              <rect x="42" y="8" width="6" height="6" fill="#FDBA74" />

              <rect x="18" y="28" width="28" height="10" fill="white" />
              <rect x="22" y="38" width="20" height="2" fill="white" />

              {isSleeping ? (
                <g>
                   <rect x="18" y="24" width="8" height="2" fill="#18181B" />
                   <rect x="38" y="24" width="8" height="2" fill="#18181B" />
                </g>
              ) : (
                <g>
                  <rect x="14" y="20" width="16" height="10" fill="#18181B" />
                  <rect x="34" y="20" width="16" height="10" fill="#18181B" />
                  <rect x="30" y="22" width="4" height="4" fill="#18181B" />
                  
                  <g className="glasses-shine">
                    <rect x="16" y="22" width="4" height="4" fill="white" opacity="0.5" />
                    <rect x="36" y="22" width="4" height="4" fill="white" opacity="0.5" />
                  </g>
                </g>
              )}

              <rect x="28" y="30" width="8" height="4" fill="#3F3F46" />

              {!isSleeping && (
                <>
                  <rect x="30" y="36" width="4" height="2" fill="#3F3F46" />
                  <rect x="28" y="35" width="2" height="2" fill="#3F3F46" />
                  <rect x="34" y="35" width="2" height="2" fill="#3F3F46" />
                </>
              )}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
