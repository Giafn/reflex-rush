// src/components/game/Leaderboard.tsx
"use client";

import { Player } from "@/types/game";
import { getRankEmoji, getInitials } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardProps {
  players: Player[];
  currentRound?: number;
  totalRounds?: number;
  compact?: boolean;
  highlightId?: string;
}

export function Leaderboard({
  players,
  currentRound,
  totalRounds,
  compact = false,
  highlightId,
}: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);

  return (
    <div className="w-full max-w-lg">
      {(currentRound !== undefined || totalRounds !== undefined) && (
        <div className="flex justify-between items-center mb-4">
          <span className="font-orbitron text-yellow-400 text-xs tracking-[3px] uppercase">
            Leaderboard
          </span>
          {currentRound !== undefined && totalRounds !== undefined && (
            <span className="font-orbitron text-gray-600 text-xs">
              Ronde {currentRound}/{totalRounds}
            </span>
          )}
        </div>
      )}

      <AnimatePresence>
        {sorted.map((player, i) => (
          <motion.div
            key={player.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: player.isEliminated ? 0.35 : 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 border transition-all ${
              i === 0
                ? "bg-yellow-500/10 border-yellow-500/25"
                : player.id === highlightId
                ? "bg-green-500/10 border-green-500/25"
                : "bg-white/[0.03] border-white/[0.06]"
            } ${compact ? "py-2" : ""}`}
          >
            {/* Rank */}
            <span
              className={`font-orbitron w-8 text-center flex-shrink-0 ${
                compact ? "text-xs" : "text-sm"
              } ${
                i === 0
                  ? "text-yellow-400"
                  : i === 1
                  ? "text-gray-300"
                  : i === 2
                  ? "text-amber-600"
                  : "text-gray-600"
              }`}
            >
              {getRankEmoji(i + 1)}
            </span>

            {/* Avatar */}
            {!compact && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0"
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(135deg, #FFD700, #FFA500)"
                      : "linear-gradient(135deg, #00FF88, #00AAFF)",
                }}
              >
                {getInitials(player.name)}
              </div>
            )}

            {/* Name */}
            <span
              className={`flex-1 font-dm font-semibold truncate ${
                compact ? "text-sm" : "text-base"
              } ${player.isEliminated ? "text-gray-600 line-through" : "text-gray-200"}`}
            >
              {player.name}
              {!player.isConnected && (
                <span className="text-xs text-gray-600 ml-1">(offline)</span>
              )}
            </span>

            {/* Score */}
            <span
              className={`font-orbitron font-bold flex-shrink-0 ${
                compact ? "text-sm" : "text-base"
              } ${i === 0 ? "text-yellow-400" : "text-green-400"}`}
            >
              {player.totalScore.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
