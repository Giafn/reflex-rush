// src/components/game/RoundInstruction.tsx
"use client";

import { motion } from "framer-motion";
import type { Round } from "@/types/game";
import { ROUND_CONFIG } from "@/types/game";

interface RoundInstructionProps {
  round: Round;
  delayRevealed: boolean;
  duration: number; // ms
}

export function RoundInstruction({ round, delayRevealed, duration }: RoundInstructionProps) {
  const config = ROUND_CONFIG[round.type];
  const showTapLabel = round.type !== "DELAY" || delayRevealed;

  return (
    <div className="flex flex-col items-center gap-6 text-center px-8">
      {/* Emoji */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="text-7xl select-none"
      >
        {config.emoji}
      </motion.div>

      {/* Instruction label */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2
          className="font-orbitron font-black leading-tight tracking-wide"
          style={{
            fontSize: "clamp(36px, 7vw, 72px)",
            color: config.color,
            textShadow: `0 0 40px ${config.color}66`,
          }}
        >
          {showTapLabel ? config.label : "TUNGGU..."}
        </h2>
        <p className="font-dm text-gray-500 mt-3 text-lg">{config.sublabel}</p>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-1 rounded-full bg-white/10 overflow-hidden mt-4">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: config.color }}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      </div>

      {/* Round type badge */}
      <div
        className="px-4 py-1 rounded-full font-orbitron text-xs tracking-widest border"
        style={{
          color: config.color,
          borderColor: `${config.color}44`,
          background: `${config.color}11`,
        }}
      >
        {round.type.replace("_", " ")} MODE
      </div>
    </div>
  );
}
