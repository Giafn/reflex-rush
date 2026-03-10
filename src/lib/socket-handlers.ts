// src/lib/socket-handlers.ts
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/game";
import { prisma } from "./prisma";
import { startGame, recordTap, stopGame } from "./game-engine";
import { nanoid } from "nanoid";
import { roundState, getRoundState } from "./round-state";

export function registerSocketHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
) {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── Host: Create Room ───────────────────────────────────────────
    socket.on("host:create-room", async ({ hostName, totalRounds }, cb) => {
      try {
        const code = nanoid(6).toUpperCase();
        const room = await prisma.room.create({
          data: {
            id: nanoid(),
            code,
            hostName,
            totalRounds,
            status: "LOBBY",
          },
          include: { players: true, rounds: true },
        });

        socket.join(room.id);
        socket.data.roomId = room.id;
        socket.data.role = "host";

        // Broadcast room updated to all in room
        io.to(room.id).emit("room:updated", room as any);
        cb(room as any);
        console.log(`[Room] Created: ${code} by ${hostName}`);
      } catch (err) {
        console.error("[host:create-room]", err);
        socket.emit("error", { message: "Gagal membuat room" });
      }
    });

    // ─── Host: Join Room (for existing room) ─────────────────────────
    socket.on("host:join-room", async ({ roomId }, cb) => {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { players: true, rounds: true },
        });

        if (!room) return cb({ error: "Room tidak ditemukan" });

        socket.join(room.id);
        socket.data.roomId = room.id;
        socket.data.role = "host";

        cb({ room: room as any });
        console.log(`[Room] Host joined: ${room.code}`);
      } catch (err) {
        console.error("[host:join-room]", err);
        cb({ error: "Gagal join room" });
      }
    });

    // ─── Host: End Game (manual finish) ───────────────────────────────
    socket.on("host:end-game", async ({ roomId }) => {
      try {
        // Stop all game timers first
        stopGame(roomId);

        const players = await prisma.player.findMany({
          where: { roomId },
          orderBy: { totalScore: "desc" },
        });

        await prisma.room.update({
          where: { id: roomId },
          data: { status: "FINISHED" },
        });

        io.to(roomId).emit("room:updated", { status: "FINISHED" });
        io.to(roomId).emit("game:finished", {
          players: players as any,
          winner: players[0] as any,
        });

        console.log(`[Room ${roomId}] Game ended by host`);
      } catch (err) {
        console.error("[host:end-game]", err);
        socket.emit("error", { message: "Gagal mengakhiri game" });
      }
    });

    // ─── Host: Start Game ────────────────────────────────────────────
    socket.on("host:start-game", async ({ roomId }) => {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { players: true },
        });
        if (!room) return socket.emit("error", { message: "Room tidak ditemukan" });
        if (room.players.length === 0) return socket.emit("error", { message: "Tidak ada peserta" });

        await startGame(roomId);
      } catch (err) {
        console.error("[host:start-game]", err);
        socket.emit("error", { message: "Gagal memulai game" });
      }
    });

    // ─── Player: Join Room ───────────────────────────────────────────
    socket.on("player:join", async ({ roomCode, playerName }, cb) => {
      try {
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() },
          include: { players: true, rounds: true },
        });

        if (!room) return cb({ error: "Kode room tidak valid" });
        if (room.status === "FINISHED") return cb({ error: "Game sudah selesai" });

        const player = await prisma.player.create({
          data: {
            id: nanoid(),
            roomId: room.id,
            name: playerName,
            isConnected: true,
          },
        });

        socket.join(room.id);
        socket.data.roomId = room.id;
        socket.data.playerId = player.id;
        socket.data.role = "player";

        // Get updated room with new player
        const updatedRoom = await prisma.room.findUnique({
          where: { id: room.id },
          include: { players: true, rounds: true },
        });

        // Broadcast to ALL clients in room (including host)
        io.to(room.id).emit("room:updated", updatedRoom as any);
        io.to(room.id).emit("player:joined", player as any);

        cb({ player: player as any, room: updatedRoom as any });
        console.log(`[Room ${roomCode}] Player joined: ${playerName}`);
      } catch (err) {
        console.error("[player:join]", err);
        cb({ error: "Gagal bergabung ke room" });
      }
    });

    // ─── Player: Tap ─────────────────────────────────────────────────
    socket.on("player:tap", async ({ roomId, playerId, clientTimestamp }) => {
      try {
        const state = getRoundState(roomId);
        if (!state) return;

        const serverTimestamp = Date.now();

        await recordTap(
          roomId,
          playerId,
          state.roundId,
          serverTimestamp,
          state.startTime,
          state.type as any,
          state.delayMs,
          state.revealed,
          state.revealTime
        );
      } catch (err) {
        console.error("[player:tap]", err);
      }
    });

    // ─── Player: Rejoin ───────────────────────────────────────────────
    socket.on("player:rejoin", async ({ roomId, playerId }) => {
      try {
        await prisma.player.update({
          where: { id: playerId },
          data: { isConnected: true },
        });

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.playerId = playerId;
        socket.data.role = "player";

        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { players: true, rounds: true },
        });

        if (room) socket.emit("room:updated", room as any);
      } catch (err) {
        console.error("[player:rejoin]", err);
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      const { playerId, roomId } = socket.data;
      if (playerId && roomId) {
        await prisma.player
          .update({ where: { id: playerId }, data: { isConnected: false } })
          .catch(() => {});

        // Get updated room and broadcast
        const updatedRoom = await prisma.room.findUnique({
          where: { id: roomId },
          include: { players: true },
        });

        if (updatedRoom) {
          io.to(roomId).emit("room:updated", updatedRoom as any);
        }
        io.to(roomId).emit("player:left", playerId);
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}
