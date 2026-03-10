// src/hooks/useSocket.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/game";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: AppSocket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    if (!socketSingleton) {
      const socketUrl = typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

      socketSingleton = io(socketUrl, {
        path: "/api/socketio",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
      });
    }

    socketRef.current = socketSingleton;
    const socket = socketSingleton;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: Error) => console.error("Socket connection error:", err);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  const on = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ) => {
      socketRef.current?.on(event as any, handler as any);
      return () => socketRef.current?.off(event as any, handler as any);
    },
    []
  );

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socketRef.current?.emit(event as any, ...(args as any[]));
    },
    []
  );

  return { socket: socketRef.current, isConnected, on, emit };
}
