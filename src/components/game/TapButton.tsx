// src/components/game/TapButton.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

interface TapButtonProps {
  onTap: (timestamp: number, x: number, y: number) => void;
  disabled?: boolean;
  tapped?: boolean;
  color?: string;
  eliminated?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
}

export function TapButton({ onTap, disabled, tapped, color = "#00FF88", eliminated }: TapButtonProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || tapped || eliminated) return;
      e.preventDefault();

      const timestamp = Date.now();
      const rect = buttonRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : e.clientX;
      const y = rect ? rect.top + rect.height / 2 : e.clientY;

      onTap(timestamp, x, y);

      // Spawn particles
      const newParticles: Particle[] = Array.from({ length: 14 }, (_, i) => ({
        id: Date.now() + i,
        x: e.clientX,
        y: e.clientY,
        dx: (Math.random() - 0.5) * 180,
        dy: (Math.random() - 0.5) * 180,
        color,
      }));
      setParticles((p) => [...p, ...newParticles]);
      setTimeout(
        () =>
          setParticles((p) => p.filter((pp) => !newParticles.find((np) => np.id === pp.id))),
        700
      );
    },
    [disabled, tapped, eliminated, onTap, color]
  );

  if (eliminated) {
    return (
      <div className="w-full h-44 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-2">
        <span className="text-4xl">💀</span>
        <span className="font-orbitron text-sm text-red-500 tracking-widest">ELIMINATED</span>
      </div>
    );
  }

  return (
    <>
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-50 w-3 h-3 rounded-full"
          style={{
            left: p.x,
            top: p.y,
            backgroundColor: p.color,
            animation: "particle-burst 0.6s ease-out forwards",
            // @ts-ignore
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
          }}
        />
      ))}

      <motion.button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        disabled={disabled}
        whileTap={!tapped && !disabled ? { scale: 0.94 } : {}}
        className="tap-button w-full h-44 rounded-3xl relative overflow-hidden select-none outline-none"
        style={{
          background: tapped
            ? color === "#FF3355"
              ? "linear-gradient(135deg, #FF3355, #AA0033)"
              : "linear-gradient(135deg, #00FF88, #007744)"
            : "linear-gradient(135deg, #111118, #1a1a2e)",
          border: `3px solid ${tapped ? color : `${color}55`}`,
          boxShadow: tapped
            ? `0 0 50px ${color}44, inset 0 0 30px ${color}11`
            : `0 0 20px ${color}22`,
          cursor: tapped || disabled ? "default" : "pointer",
          transition: "background 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Pulse ring when not tapped */}
        {!tapped && !disabled && (
          <span
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              border: `2px solid ${color}33`,
              animation: "pulse-ring 1.5s ease-out infinite",
            }}
          />
        )}

        <span
          className="font-orbitron font-black tracking-widest select-none"
          style={{
            fontSize: 32,
            color: tapped ? "#FFF" : color,
            textShadow: tapped ? "none" : `0 0 20px ${color}88`,
          }}
        >
          {tapped ? (color === "#FF3355" ? "KENA! 💀" : "✓ TAPPED!") : "TAP!"}
        </span>
      </motion.button>
    </>
  );
}
