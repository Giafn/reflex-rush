// src/app/play/[roomId]/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useSound } from "@/hooks/useSound";
import { TapButton } from "@/components/game/TapButton";
import { CountdownDisplay } from "@/components/game/CountdownDisplay";
import { Leaderboard } from "@/components/game/Leaderboard";
import type { Room, Player, Round, RoomStatus } from "@/types/game";
import { ROUND_CONFIG } from "@/types/game";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatMs } from "@/lib/utils";

interface Feedback {
  type: "success" | "fail" | "too-early";
  message: string;
}

export default function PlayerGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { isConnected, emit, on } = useSocket();
  const { play } = useSound();

  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<RoomStatus>("LOBBY");
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [delayRevealed, setDelayRevealed] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const playerId = useRef<string | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  // Restore session
  useEffect(() => {
    const pid = sessionStorage.getItem("playerId");
    const pName = sessionStorage.getItem("playerName");
    if (!pid) { router.push("/play"); return; }
    playerId.current = pid;

    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((data: Room) => {
        setRoom(data);
        setStatus(data.status);
        setPlayers(data.players);
        const me = data.players.find((p) => p.id === pid);
        if (me) setMe(me);
        else if (pName) {
          setMe({ id: pid, name: pName, roomId, totalScore: 0, isEliminated: false, isConnected: true, joinedAt: "" });
        }
        setLoading(false);
      });
  }, [roomId, router]);

  // Rejoin socket
  useEffect(() => {
    if (!isConnected || !playerId.current) return;
    emit("player:rejoin", { roomId, playerId: playerId.current });
  }, [isConnected, roomId, emit]);

  // Socket listeners
  useEffect(() => {
    const unsubs = [
      on("room:updated", (r) => {
        setRoom(r);
        setStatus(r.status);
        setPlayers(r.players);
        const m = r.players.find((p) => p.id === playerId.current);
        if (m) setMe(m);
      }),
      on("player:updated", (player) => {
        setPlayers((p) => p.map((x) => (x.id === player.id ? player : x)));
        if (player.id === playerId.current) setMe(player);
      }),
      on("game:countdown", ({ count }) => {
        setStatus("COUNTDOWN");
        setCountdown(count);
        play("countdown");
      }),
      on("game:round-start", ({ round }) => {
        setStatus("PLAYING");
        setCurrentRound(round as Round);
        setTapped(false);
        setFeedback(null);
        setDelayRevealed(round.type !== "DELAY");
        setRoom((prev) => prev ? { ...prev, currentRound: (round as Round).roundNumber } : prev);
        play("go");
      }),
      on("game:delay-reveal", () => {
        setDelayRevealed(true);
        play("tension");
      }),
      on("game:leaderboard", ({ players: p }) => {
        setStatus("LEADERBOARD");
        setPlayers(p);
        const m = p.find((x) => x.id === playerId.current);
        if (m) setMe(m);
      }),
      on("game:finished", ({ players: p, winner: w }) => {
        setStatus("FINISHED");
        setPlayers(p);
        setWinner(w);
        play("winner");
      }),
      on("tap:accepted", ({ reactionMs, points }) => {
        play("success");
        showFeedback({ type: "success", message: `+${points} pts ⚡ ${formatMs(reactionMs)}` });
      }),
      on("tap:too-early", () => {
        play("fail");
        showFeedback({ type: "too-early", message: "-200 pts ⚠️ Terlalu Cepat!" });
      }),
      on("error", ({ message }) => toast.error(message)),
    ];
    return () => unsubs.forEach((fn) => fn?.());
  }, [on, play]);

  function showFeedback(fb: Feedback) {
    setFeedback(fb);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  }

  const handleTap = useCallback((timestamp: number) => {
    if (!playerId.current || !room || !currentRound || tapped) return;
    setTapped(true);
    play("tap");
    emit("player:tap", {
      roomId: room.id,
      playerId: playerId.current,
      clientTimestamp: timestamp,
    });
  }, [room, currentRound, tapped, emit, play]);

  const roundConfig = currentRound ? ROUND_CONFIG[currentRound.type] : null;
  const myRank = players && players.length > 0
    ? [...players].sort((a, b) => b.totalScore - a.totalScore).findIndex((p) => p.id === playerId.current) + 1
    : 0;

  if (loading) return <LoadingScreen />;
  if (!room) return <ErrorScreen />;

  return (
    <main
      className="min-h-screen flex flex-col items-center transition-colors duration-500"
      style={{ background: roundConfig && status === "PLAYING" ? roundConfig.bg : "#0A0A0F", maxWidth: 440, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center px-5 pt-5 pb-2">
        <div>
          <p className="text-xs text-gray-600 tracking-widest">SKOR</p>
          <p className="font-orbitron font-bold text-2xl text-green-400">{me?.totalScore ?? 0}</p>
        </div>
        <div className="text-center">
          <p className="font-orbitron text-xs text-gray-600">{me?.name}</p>
          {myRank > 0 && status !== "LOBBY" && (
            <p className="text-xs text-gray-500">Rank #{myRank}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 tracking-widest">RONDE</p>
          <p className="font-orbitron font-bold text-2xl text-white">
            {room.currentRound}/{room.totalRounds}
          </p>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center w-full px-5">
        <AnimatePresence mode="wait">
          {status === "LOBBY" && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="text-5xl mb-4">⏳</div>
              <p className="font-orbitron text-gray-400 tracking-widest text-sm">MENUNGGU HOST...</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-600">{players.length} peserta terhubung</span>
              </div>
            </motion.div>
          )}

          {status === "COUNTDOWN" && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CountdownDisplay count={countdown} />
            </motion.div>
          )}

          {status === "PLAYING" && currentRound && (
            <motion.div
              key={currentRound.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full flex flex-col items-center gap-4"
            >
              {/* Instruction mini */}
              <div className="text-center">
                <div className="text-5xl mb-2">{roundConfig?.emoji}</div>
                <p
                  className="font-orbitron font-black text-2xl tracking-wide"
                  style={{ color: roundConfig?.color, textShadow: `0 0 20px ${roundConfig?.color}66` }}
                >
                  {currentRound.type === "DELAY" && !delayRevealed
                    ? "TUNGGU..."
                    : roundConfig?.label}
                </p>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`font-orbitron text-sm tracking-widest ${
                      feedback.type === "success" ? "text-green-400" :
                      feedback.type === "fail" ? "text-red-400" : "text-yellow-400"
                    }`}
                  >
                    {feedback.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {status === "LEADERBOARD" && (
            <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              <Leaderboard
                players={players}
                currentRound={room.currentRound}
                totalRounds={room.totalRounds}
                highlightId={playerId.current ?? undefined}
              />
            </motion.div>
          )}

          {status === "FINISHED" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center">
              <div className="text-6xl mb-3">{myRank === 1 ? "🏆" : myRank <= 3 ? "🥈" : "💪"}</div>
              <p className="font-orbitron text-yellow-400 text-xs tracking-widest mb-2">GAME SELESAI</p>
              <p className="font-orbitron font-bold text-3xl text-white mb-1">{me?.name}</p>
              <p className="font-orbitron text-4xl text-green-400 glow-green mb-1">{me?.totalScore ?? 0}</p>
              <p className="text-gray-500 text-sm mb-6">Peringkat #{myRank} dari {players?.length ?? 0}</p>
              <Leaderboard players={players || []} currentRound={room.totalRounds} totalRounds={room.totalRounds} highlightId={playerId.current ?? undefined} />
              <a href="/" className="inline-block mt-6 px-6 py-3 rounded-xl font-dm font-bold text-black bg-gradient-to-r from-green-400 to-blue-400">
                🔄 Main Lagi
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TAP Button area */}
      <div className="w-full px-5 pb-10 pt-4">
        {status === "PLAYING" && currentRound ? (
          <TapButton
            onTap={handleTap}
            tapped={tapped}
            eliminated={me?.isEliminated}
            color={roundConfig?.color}
          />
        ) : (
          <div className="w-full h-44 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center opacity-30">
            <span className="font-orbitron text-gray-600 text-2xl">TAP!</span>
          </div>
        )}
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-orbitron text-gray-500 tracking-widest text-sm">LOADING...</p>
      </div>
    </main>
  );
}

function ErrorScreen() {
  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center">
      <div className="text-center">
        <p className="font-orbitron text-red-400 mb-4">Room tidak ditemukan</p>
        <a href="/play" className="text-green-400 underline">Coba lagi</a>
      </div>
    </main>
  );
}
