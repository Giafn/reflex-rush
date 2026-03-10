// src/lib/socket-server.ts
import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/game";

const globalForSocketIO = globalThis as unknown as {
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | undefined;
};

export function getSocketServer(
  httpServer?: HTTPServer
): SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null {
  if (globalForSocketIO.io) return globalForSocketIO.io;
  if (!httpServer) return null;

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  globalForSocketIO.io = io;
  return io;
}

export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null {
  return globalForSocketIO.io ?? null;
}
