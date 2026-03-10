// src/types/game.ts

export type RoomStatus = "LOBBY" | "COUNTDOWN" | "PLAYING" | "LEADERBOARD" | "FINISHED";
export type RoundType = "TAP" | "DONT_TAP" | "DELAY";

export interface Room {
  id: string;
  code: string;
  hostName: string;
  totalRounds: number;
  status: RoomStatus;
  currentRound: number;
  createdAt: string;
  players: Player[];
  rounds: Round[];
}

export interface Player {
  id: string;
  roomId: string;
  name: string;
  totalScore: number;
  isEliminated: boolean;
  isConnected: boolean;
  joinedAt: string;
}

export interface Round {
  id: string;
  roomId: string;
  roundNumber: number;
  type: RoundType;
  delayMs?: number;
  startedAt?: string;
  endedAt?: string;
}

export interface Score {
  id: string;
  playerId: string;
  roundId: string;
  reactionTimeMs?: number;
  pointsEarned: number;
  penaltyApplied: boolean;
  tapped: boolean;
}

// ─── Socket Events ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  // Room events
  "room:updated": (room: Room) => void;
  "player:joined": (player: Player) => void;
  "player:left": (playerId: string) => void;
  "player:updated": (player: Player) => void;

  // Game flow
  "game:countdown": (data: { count: number }) => void;
  "game:round-start": (data: { round: Round; serverTime: number }) => void;
  "game:delay-reveal": (data: { roundId: string }) => void;
  "game:round-end": (data: { round: Round; scores: Score[]; players: Player[] }) => void;
  "game:leaderboard": (data: { players: Player[]; round: Round }) => void;
  "game:finished": (data: { players: Player[]; winner: Player }) => void;

  // Player feedback
  "tap:accepted": (data: { reactionMs: number; points: number; rank: number }) => void;
  "tap:penalty": (data: { points: number }) => void;
  "tap:too-early": () => void;

  // Errors
  "error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  // Host actions
  "host:create-room": (data: { hostName: string; totalRounds: number }, cb: (room: Room) => void) => void;
  "host:join-room": (data: { roomId: string }, cb: (result: { room: Room } | { error: string }) => void) => void;
  "host:start-game": (data: { roomId: string }) => void;
  "host:end-game": (data: { roomId: string }) => void;
  "host:next-round": (data: { roomId: string }) => void;

  // Player actions
  "player:join": (data: { roomCode: string; playerName: string }, cb: (result: { player: Player; room: Room } | { error: string }) => void) => void;
  "player:tap": (data: { roomId: string; playerId: string; clientTimestamp: number }) => void;
  "player:rejoin": (data: { roomId: string; playerId: string }) => void;
}

// ─── Round Config ────────────────────────────────────────────────────────

export const ROUND_CONFIG: Record<RoundType, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  emoji: string;
  duration: number;
  penalty: boolean;
}> = {
  TAP: {
    label: "TAP SEKARANG!",
    sublabel: "Tekan secepat mungkin!",
    color: "#00FF88",
    bg: "#021a0e",
    emoji: "👆",
    duration: 3000,
    penalty: false,
  },
  DONT_TAP: {
    label: "JANGAN TAP!",
    sublabel: "Tahan dirimu...",
    color: "#FF3355",
    bg: "#1a0208",
    emoji: "🚫",
    duration: 4000,
    penalty: true,
  },
  DELAY: {
    label: "TAP!",
    sublabel: "GO!",
    color: "#FFD700",
    bg: "#1a1200",
    emoji: "⏳",
    duration: 5000,
    penalty: false,
  },
};

export const calcScore = (reactionMs: number, type: RoundType, tapped: boolean): number => {
  switch (type) {
    case "TAP":
      // Faster = more points: 100ms = 900pts, 500ms = 500pts, 1000ms = 0pts
      return tapped ? Math.max(0, 1000 - Math.floor(reactionMs)) : 0;
    case "DONT_TAP":
      return tapped ? -500 : 300;
    case "DELAY":
      // Faster = more points: 100ms = 450pts, 300ms = 350pts, 500ms = 250pts
      return tapped ? Math.max(50, 500 - Math.floor(reactionMs)) : 0;
    default:
      return 0;
  }
};
