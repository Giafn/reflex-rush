// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-game-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 opacity-5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 opacity-5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-orbitron text-xs text-green-400 tracking-widest">OFFICE GAME</span>
        </div>

        {/* Title */}
        <h1 className="font-orbitron font-black text-[clamp(64px,15vw,110px)] leading-none tracking-tight mb-6">
          REFLEX
          <br />
          <span className="text-[#00FF88] glow-green">RUSH</span>
        </h1>

        <p className="font-dm text-gray-400 text-lg leading-relaxed mb-12 max-w-md mx-auto">
          Game refleks real-time untuk gathering kantor.
          <br />
          Siapa yang paling cepat? Siapa yang paling sabar?
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <Link
            href="/host"
            className="px-8 py-4 rounded-xl font-dm font-bold text-lg text-black bg-gradient-to-r from-[#00FF88] to-[#00AAFF] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-green-500/20"
          >
            🖥️ Buat Room (Host)
          </Link>
          <Link
            href="/play"
            className="px-8 py-4 rounded-xl font-dm font-bold text-lg text-white border-2 border-white/15 hover:border-white/30 active:scale-95 transition-all"
          >
            📱 Join Room (Peserta)
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { icon: "⚡", title: "TAP Mode", desc: "Siapa paling cepat", color: "#00FF88" },
            { icon: "🚫", title: "Don't TAP", desc: "Tahan refleksmu", color: "#FF3355" },
            { icon: "⏳", title: "Delay Trap", desc: "Timing is everything", color: "#FFD700" },
          ].map((f) => (
            <div
              key={f.title}
              className="card-glass rounded-2xl p-4 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">{f.icon}</span>
              <span
                className="font-orbitron text-[10px] tracking-widest"
                style={{ color: f.color }}
              >
                {f.title}
              </span>
              <span className="text-xs text-gray-600 text-center">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
