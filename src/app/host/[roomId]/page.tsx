// src/app/host/[roomId]/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useSound } from "@/hooks/useSound";
import { QRCode } from "@/components/ui/QRCode";
import { Leaderboard } from "@/components/game/Leaderboard";
import { CountdownDisplay } from "@/components/game/CountdownDisplay";
import { RoundInstruction } from "@/components/game/RoundInstruction";
import type { Room, Player, Round, RoomStatus } from "@/types/game";
import { ROUND_CONFIG } from "@/types/game";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function HostRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { isConnected, emit, on } = useSocket();
  const { play } = useSound();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<RoomStatus>("LOBBY");
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [delayRevealed, setDelayRevealed] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [startLoading, setStartLoading] = useState(false);
  const hasInitializedRoom = useRef(false);

  // Load initial room data
  useEffect(() => {
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        setRoom(data);
        setPlayers(data.players || []);
        setStatus(data.status);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Room tidak ditemukan");
        setLoading(false);
      });
  }, [roomId]);

  // Join host socket room - only initialize once
  useEffect(() => {
    if (!isConnected || !room || hasInitializedRoom.current) return;

    hasInitializedRoom.current = true;

    // Tell server to join this room
    emit("host:join-room", { roomId: room.id }, (result) => {
      if (result && "error" in result) {
        toast.error(result.error);
      }
    });
  }, [isConnected, room, emit]);

  // Socket listeners
  useEffect(() => {
    const unsubs = [
      on("room:updated", (r) => {
        setRoom(r);
        setPlayers(r.players || []);
        setStatus(r.status);
      }),
      on("player:joined", (player) => {
        setPlayers((p) => [...p.filter((x) => x.id !== player.id), player]);
        toast.success(`${player.name} bergabung!`);
      }),
      on("player:left", (playerId) => {
        setPlayers((p) => p.map((x) => (x.id === playerId ? { ...x, isConnected: false } : x)));
      }),
      on("player:updated", (player) => {
        setPlayers((p) => p.map((x) => (x.id === player.id ? player : x)));
      }),
      on("game:countdown", ({ count }) => {
        setStatus("COUNTDOWN");
        setCountdown(count);
        play("countdown");
      }),
      on("game:round-start", ({ round }) => {
        setStatus("PLAYING");
        setCurrentRound(round as Round);
        setDelayRevealed(round.type !== "DELAY");
        setRoom((prev) => prev ? { ...prev, currentRound: (round as Round).roundNumber } : prev);
        play("go");
      }),
      on("game:delay-reveal", () => {
        setDelayRevealed(true);
        play("go");
      }),
      on("game:leaderboard", ({ players: p }) => {
        setStatus("LEADERBOARD");
        setPlayers(p);
      }),
      on("game:finished", ({ players: p, winner: w }) => {
        setStatus("FINISHED");
        setPlayers(p);
        setWinner(w);
        play("winner");
      }),
      on("error", ({ message }) => toast.error(message)),
    ];
    return () => unsubs.forEach((fn) => fn?.());
  }, [on, play]);

  const handleStartGame = useCallback(() => {
    if (!room) return;
    setStartLoading(true);
    emit("host:start-game", { roomId: room.id });
    setTimeout(() => setStartLoading(false), 2000);
  }, [room, emit]);

  const handleEndGame = useCallback(() => {
    if (!room || status === "FINISHED") return;
    if (confirm("Yakinkan ingin mengakhiri game?")) {
      emit("host:end-game", { roomId: room.id });
    }
  }, [room, status, emit]);

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play?code=${room?.code}`
    : "";

  if (loading) return <LoadingScreen />;
  if (!room) return <ErrorScreen />;

  const roundConfig = currentRound ? ROUND_CONFIG[currentRound.type] : null;
  const playersList = players || [];

  return (
    <main
      className="min-h-screen flex transition-colors duration-700"
      style={{ background: roundConfig && status === "PLAYING" ? roundConfig.bg : "#0A0A0F" }}
    >
      {/* ─── LEFT: Main Display ─── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {/* LOBBY */}
          {status === "LOBBY" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-lg"
            >
              <h1 className="font-orbitron font-black text-5xl mb-2">
                REFLEX <span className="text-green-400">RUSH</span>
              </h1>
              <p className="text-gray-500 mb-10">Scan QR code atau masukkan kode untuk bergabung</p>

              <div className="flex flex-col items-center gap-6 mb-10">
                {joinUrl && <QRCode value={joinUrl} size={220} />}
                <div className="text-center">
                  <p className="text-xs text-gray-500 tracking-widest mb-2">KODE ROOM</p>
                  <div className="font-orbitron font-black text-6xl text-green-400 tracking-widest glow-green">
                    {room.code}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{joinUrl}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-8 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-orbitron text-sm tracking-widest">
                  {playersList.length} PESERTA SIAP
                </span>
              </div>

              <button
                onClick={handleStartGame}
                disabled={startLoading || players.length === 0}
                className="px-12 py-4 rounded-xl font-dm font-bold text-xl text-black bg-gradient-to-r from-green-400 to-blue-400 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
              >
                {startLoading ? "Memulai..." : players.length === 0 ? "Tunggu Peserta..." : "▶ Mulai Game!"}
              </button>
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {status === "COUNTDOWN" && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CountdownDisplay count={countdown} />
            </motion.div>
          )}

          {/* PLAYING */}
          {status === "PLAYING" && currentRound && (
            <motion.div key={currentRound.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RoundInstruction
                round={currentRound}
                delayRevealed={delayRevealed}
                duration={roundConfig?.duration ?? 3000}
              />
            </motion.div>
          )}

          {/* LEADERBOARD */}
          {status === "LEADERBOARD" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <h2 className="font-orbitron text-4xl text-yellow-400 tracking-widest font-black">
                ⭐ HASIL RONDE {room.currentRound}
              </h2>
              <Leaderboard players={playersList} currentRound={room.currentRound} totalRounds={room.totalRounds} />
            </motion.div>
          )}

          {/* FINISHED */}
          {status === "FINISHED" && winner && (
            <motion.div
              key="winner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-8xl mb-4">🏆</div>
              <p className="font-orbitron text-yellow-400 text-sm tracking-widest mb-3">PEMENANG</p>
              <h2 className="font-orbitron font-black text-5xl text-white mb-2">{winner.name}</h2>
              <div className="font-orbitron text-5xl text-green-400 glow-green mb-10">
                {winner.totalScore.toLocaleString()} pts
              </div>
              <Leaderboard players={playersList} currentRound={room.totalRounds} totalRounds={room.totalRounds} />
              <a
                href="/"
                className="inline-block mt-8 px-8 py-3 rounded-xl font-dm font-bold text-black bg-gradient-to-r from-green-400 to-blue-400 hover:opacity-90 transition-all"
              >
                🔄 Main Lagi
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── RIGHT: Sidebar ─── */}
      <div className="w-56 bg-black/30 border-l border-white/[0.05] p-4 flex flex-col gap-3">
        {/* End Game Button */}
        {status !== "FINISHED" && (
          <button
            onClick={handleEndGame}
            className="w-full px-4 py-2 rounded-xl font-dm font-bold text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            ⏹ Selesaikan Game
          </button>
        )}

        <p className="font-orbitron text-xs text-gray-600 tracking-widest">LIVE PLAYERS</p>
        <div className="flex-1 overflow-y-auto space-y-2">
          {[...playersList]
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 12)
            .map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]"
              >
                <span className="text-gray-300 font-dm text-xs truncate flex-1">{p.name}</span>
                <span className="font-orbitron text-green-400 text-xs ml-2">{p.totalScore}</span>
              </div>
            ))}
        </div>

        {/* Room info */}
        <div className="pt-3 border-t border-white/[0.05]">
          <p className="text-xs text-gray-600 mb-1">Room Code</p>
          <p className="font-orbitron text-green-400 text-xl tracking-widest">{room.code}</p>
          <p className="text-xs text-gray-600 mt-2">
            {room.currentRound}/{room.totalRounds} ronde
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-500"}`} />
            <span className="text-xs text-gray-600">{isConnected ? "Live" : "Reconnecting..."}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-orbitron text-gray-500 tracking-widest text-sm">LOADING ROOM...</p>
      </div>
    </main>
  );
}

function ErrorScreen() {
  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center">
      <div className="text-center">
        <p className="font-orbitron text-red-400 text-xl mb-4">Room tidak ditemukan</p>
        <a href="/" className="text-green-400 underline">Kembali ke Home</a>
      </div>
    </main>
  );
}
