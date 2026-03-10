// src/app/play/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, emit } = useSocket();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState(searchParams.get("code") || "");
  const [loading, setLoading] = useState(false);

  function handleJoin() {
    if (!playerName.trim()) return toast.error("Masukkan namamu");
    if (roomCode.length < 4) return toast.error("Kode room tidak valid");
    if (!isConnected) return toast.error("Koneksi terputus, coba lagi");

    setLoading(true);
    emit(
      "player:join",
      { roomCode: roomCode.toUpperCase(), playerName: playerName.trim() },
      (result) => {
        if ("error" in result) {
          toast.error(result.error);
          setLoading(false);
          return;
        }
        // Store player info in sessionStorage for rejoin
        sessionStorage.setItem("playerId", result.player.id);
        sessionStorage.setItem("roomId", result.room.id);
        sessionStorage.setItem("playerName", playerName.trim());
        router.push(`/play/${result.room.id}`);
      }
    );
  }

  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center p-4">
      <div className="card-glass rounded-2xl p-8 w-full max-w-sm">
        <a href="/" className="text-gray-600 text-sm mb-6 block hover:text-gray-400 transition-colors">
          ← Kembali
        </a>

        <h1 className="font-orbitron font-bold text-2xl mb-1">📱 Join Room</h1>
        <p className="text-gray-500 text-sm mb-8">Masuk ke game yang sudah dibuat host</p>

        <div className="mb-5">
          <label className="block text-xs text-gray-500 tracking-widest uppercase mb-2">
            Nama Kamu
          </label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white font-dm outline-none focus:border-green-500/50 transition-colors"
            placeholder="Nama untuk leaderboard..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            autoFocus
          />
        </div>

        <div className="mb-8">
          <label className="block text-xs text-gray-500 tracking-widest uppercase mb-2">
            Kode Room
          </label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-green-400 font-orbitron text-2xl tracking-widest text-center outline-none focus:border-green-500/50 transition-colors uppercase"
            placeholder="ABC123"
            maxLength={8}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={loading || !playerName || roomCode.length < 4}
          className="w-full py-4 rounded-xl font-dm font-bold text-lg text-black bg-gradient-to-r from-[#00FF88] to-[#00AAFF] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Bergabung..." : "Masuk Room 🚀"}
        </button>

        <div className="flex items-center justify-center gap-2 mt-6">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs text-gray-600">{isConnected ? "Terhubung ke server" : "Menghubungkan..."}</span>
        </div>
      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-game-dark" />}>
      <JoinForm />
    </Suspense>
  );
}
