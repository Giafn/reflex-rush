// src/lib/game-engine.ts
import { prisma } from "./prisma";
import { getIO } from "./socket-server";
import { calcScore, ROUND_CONFIG } from "@/types/game";
import type { RoundType } from "@/types/game";
import { nanoid } from "nanoid";
import { updateRoundState, setRoundRevealed, getRoundState, clearRoundState } from "./round-state";

const COUNTDOWN_SECONDS = 3;
const LEADERBOARD_DISPLAY_MS = 4000;
const ROUND_TYPES: RoundType[] = ["TAP", "DONT_TAP", "DELAY"];

// Track active game timers so we can clear on disconnect/reset
const activeTimers = new Map<string, NodeJS.Timeout[]>();

function clearRoomTimers(roomId: string) {
  const timers = activeTimers.get(roomId) ?? [];
  timers.forEach(clearTimeout);
  activeTimers.delete(roomId);
}

// Export for use in socket-handlers
export function stopGame(roomId: string) {
  clearRoomTimers(roomId);
  clearRoundState(roomId);
}

function addTimer(roomId: string, timer: NodeJS.Timeout) {
  const existing = activeTimers.get(roomId) ?? [];
  activeTimers.set(roomId, [...existing, timer]);
}

export async function startGame(roomId: string) {
  const io = getIO();
  if (!io) throw new Error("Socket.IO not initialized");

  clearRoomTimers(roomId);

  // Update room status and broadcast
  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: { status: "COUNTDOWN", currentRound: 0 },
    include: { players: true, rounds: true },
  });

  io.to(roomId).emit("room:updated", updatedRoom as any);

  // Countdown sequence
  for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
    const delay = (COUNTDOWN_SECONDS - i) * 1000;
    const t = setTimeout(() => {
      io.to(roomId).emit("game:countdown", { count: i });
    }, delay);
    addTimer(roomId, t);
  }

  // Start first round after countdown
  const t = setTimeout(() => startRound(roomId, 1), COUNTDOWN_SECONDS * 1000);
  addTimer(roomId, t);
}

export async function startRound(roomId: string, roundNumber: number) {
  const io = getIO();
  if (!io) return;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.status === "FINISHED") return;

  const type: RoundType = ROUND_TYPES[Math.floor(Math.random() * ROUND_TYPES.length)];
  const config = ROUND_CONFIG[type];
  const delayMs = type === "DELAY" ? Math.floor(Math.random() * 2500) + 1500 : null;

  const round = await prisma.round.create({
    data: {
      id: nanoid(),
      roomId,
      roundNumber,
      type,
      delayMs,
      startedAt: new Date(),
    },
  });

  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: { status: "PLAYING", currentRound: roundNumber },
    include: { players: true, rounds: true },
  });

  const serverTime = Date.now();

  // Update round state for tap validation
  updateRoundState(roomId, round.id, serverTime, delayMs, type, type !== "DELAY");

  // Broadcast round start with room update
  io.to(roomId).emit("room:updated", updatedRoom as any);
  io.to(roomId).emit("game:round-start", { round: round as any, serverTime });

  // For DELAY type, emit reveal signal after delayMs
  if (type === "DELAY" && delayMs) {
    const t = setTimeout(() => {
      setRoundRevealed(roomId, round.id);
      io.to(roomId).emit("game:delay-reveal", { roundId: round.id });
    }, delayMs);
    addTimer(roomId, t);
  }

  // End round after duration
  const t = setTimeout(() => endRound(roomId, round.id, roundNumber), config.duration);
  addTimer(roomId, t);
}

export async function endRound(roomId: string, roundId: string, roundNumber: number) {
  const io = getIO();
  if (!io) return;

  const round = await prisma.round.update({
    where: { id: roundId },
    data: { endedAt: new Date() },
    include: { scores: true },
  });

  // Award points to players who didn't tap in DONT_TAP
  if (round.type === "DONT_TAP") {
    const tappedPlayerIds = round.scores.filter((s) => s.tapped).map((s) => s.playerId);
    const allPlayers = await prisma.player.findMany({ where: { roomId } });
    const nonTappedPlayers = allPlayers.filter((p) => !tappedPlayerIds.includes(p.id));

    // Award points to players who didn't tap
    for (const player of nonTappedPlayers) {
      await prisma.score.upsert({
        where: { playerId_roundId: { playerId: player.id, roundId } },
        create: {
          id: nanoid(),
          playerId: player.id,
          roundId,
          pointsEarned: 300,
          tapped: false,
        },
        update: {},
      });
      await prisma.player.update({
        where: { id: player.id },
        data: { totalScore: { increment: 300 } },
      });
    }

    // Apply penalty to players who tapped (no elimination)
    for (const playerId of tappedPlayerIds) {
      await prisma.score.upsert({
        where: { playerId_roundId: { playerId, roundId } },
        create: {
          id: nanoid(),
          playerId,
          roundId,
          pointsEarned: -500,
          tapped: true,
          penaltyApplied: true,
        },
        update: {},
      });
      await prisma.player.update({
        where: { id: playerId },
        data: { totalScore: { increment: -500 } },
      });
    }
  }

  const updatedPlayers = await prisma.player.findMany({
    where: { roomId },
    orderBy: { totalScore: "desc" },
  });
  const allScores = await prisma.score.findMany({ where: { roundId } });

  const roomWithPlayers = await prisma.room.update({
    where: { id: roomId },
    data: { status: "LEADERBOARD" },
    include: { players: true, rounds: true },
  });

  // Broadcast room update and leaderboard
  io.to(roomId).emit("room:updated", roomWithPlayers as any);
  io.to(roomId).emit("game:round-end", {
    round: round as any,
    scores: allScores as any,
    players: updatedPlayers as any,
  });

  io.to(roomId).emit("game:leaderboard", {
    players: updatedPlayers as any,
    round: round as any,
  });

  // Check if game is over
  if (roundNumber >= roomWithPlayers.totalRounds) {
    const t = setTimeout(() => finishGame(roomId), LEADERBOARD_DISPLAY_MS);
    addTimer(roomId, t);
  } else {
    const t = setTimeout(() => startRound(roomId, roundNumber + 1), LEADERBOARD_DISPLAY_MS);
    addTimer(roomId, t);
  }
}

export async function finishGame(roomId: string) {
  const io = getIO();
  if (!io) return;

  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { totalScore: "desc" },
  });

  const roomWithPlayers = await prisma.room.update({
    where: { id: roomId },
    data: { status: "FINISHED" },
    include: { players: true, rounds: true },
  });

  const winner = players[0];

  // Broadcast final room state
  io.to(roomId).emit("room:updated", roomWithPlayers as any);
  io.to(roomId).emit("game:finished", { players: players as any, winner: winner as any });
  clearRoomTimers(roomId);
}

export async function recordTap(
  roomId: string,
  playerId: string,
  roundId: string,
  serverTimestamp: number,
  roundStartTime: number,
  roundType: RoundType,
  delayMs: number | null,
  delayRevealed: boolean,
  revealTime?: number // New parameter for DELAY round
) {
  const io = getIO();
  if (!io) return;

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.isEliminated) return;

  // Prevent double tap
  const existing = await prisma.score.findUnique({
    where: { playerId_roundId: { playerId, roundId } },
  });
  if (existing) return;

  // For DELAY round, calculate reaction from reveal time, not round start
  const reactionMs = roundType === "DELAY" && revealTime
    ? serverTimestamp - revealTime
    : serverTimestamp - roundStartTime;

  // DELAY: tapped before reveal = penalty
  if (roundType === "DELAY" && !delayRevealed) {
    await prisma.score.create({
      data: {
        id: nanoid(),
        playerId,
        roundId,
        reactionTimeMs: reactionMs,
        pointsEarned: -200,
        penaltyApplied: true,
        tapped: true,
      },
    });
    await prisma.player.update({
      where: { id: playerId },
      data: { totalScore: { increment: -200 } },
    });
    io.to(playerId).emit("tap:too-early");

    // Broadcast updated player scores
    const updatedPlayer = await prisma.player.findUnique({ where: { id: playerId } });
    if (updatedPlayer) {
      io.to(roomId).emit("player:updated", updatedPlayer as any);
    }
    return;
  }

  const points = calcScore(reactionMs, roundType, true);

  await prisma.score.create({
    data: {
      id: nanoid(),
      playerId,
      roundId,
      reactionTimeMs: reactionMs,
      pointsEarned: points,
      tapped: true,
    },
  });

  await prisma.player.update({
    where: { id: playerId },
    data: { totalScore: { increment: points } },
  });

  // Calculate current rank
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { totalScore: "desc" },
  });
  const rank = players.findIndex((p) => p.id === playerId) + 1;
  io.to(playerId).emit("tap:accepted", { reactionMs, points, rank });

  // Broadcast updated player scores
  const updatedPlayer = await prisma.player.findUnique({ where: { id: playerId } });
  if (updatedPlayer) {
    io.to(roomId).emit("player:updated", updatedPlayer as any);
  }
}
