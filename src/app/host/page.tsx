// src/app/host/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function HostPage() {
  const router = useRouter();
  const [hostName, setHostName] = useState("Host");
  const [totalRounds, setTotalRounds] = useState(5);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!hostName.trim()) return toast.error("Masukkan nama host");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: hostName.trim(), totalRounds }),
      });
      const room = await res.json();
      if (!res.ok) throw new Error(room.error);
      router.push(`/host/${room.id}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat room");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center p-4">
      <div className="card-glass rounded-2xl p-8 w-full max-w-md">
        <a href="/" className="text-gray-600 text-sm mb-6 block hover:text-gray-400 transition-colors">
          ← Kembali
        </a>

        <h1 className="font-orbitron font-bold text-2xl mb-2">⚙️ Setup Room</h1>
        <p className="text-gray-500 text-sm mb-8">Konfigurasi game sebelum peserta bergabung</p>

        {/* Host Name */}
        <div className="mb-6">
          <label className="block text-xs text-gray-500 tracking-widest uppercase mb-2">
            Nama Host
          </label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white font-dm outline-none focus:border-green-500/50 transition-colors"
            placeholder="Nama acara / host..."
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
        </div>

        {/* Total Rounds */}
        <div className="mb-8">
          <label className="block text-xs text-gray-500 tracking-widest uppercase mb-3">
            Jumlah Ronde
          </label>
          <div className="flex gap-3">
            {[3, 5, 7, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => setTotalRounds(n)}
                className={`flex-1 py-3 rounded-xl font-orbitron font-bold text-lg border transition-all ${
                  totalRounds === n
                    ? "bg-green-500/15 border-green-500 text-green-400"
                    : "bg-white/[0.04] border-white/10 text-gray-500 hover:border-white/20"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-8">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="text-green-400">3 mode ronde</span> akan dimainkan secara acak:{" "}
            <strong className="text-gray-300">TAP</strong> (kecepatan),{" "}
            <strong className="text-gray-300">DON'T TAP</strong> (tahan refleks),{" "}
            <strong className="text-gray-300">DELAY</strong> (timing). Server mencatat waktu — bukan HP peserta.
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-4 rounded-xl font-dm font-bold text-lg text-black bg-gradient-to-r from-[#00FF88] to-[#00AAFF] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Membuat room..." : "Buat Room 🚀"}
        </button>
      </div>
    </main>
  );
}
