# 🎮 Reflex Rush — Office Gathering Game

Game refleks real-time berbasis web untuk gathering kantor. Host menampilkan layar besar, peserta bermain lewat HP tanpa install apapun.

---

## ✨ Fitur

- **3 Mode Ronde**: TAP (kecepatan), DON'T TAP (tahan refleks), DELAY (timing)
- **Real-time WebSocket**: Sinkronisasi instan antara host dan semua peserta
- **Server-side Timestamp**: Skor berdasarkan waktu server, bukan HP peserta
- **QR Code Join**: Peserta scan QR langsung masuk, tanpa install app
- **Live Leaderboard**: Update setelah setiap ronde
- **Sistem Eliminasi**: Kena jebakan di mode DON'T TAP = eliminated
- **50+ Peserta Simultan**: Arsitektur WebSocket yang scalable

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd reflex-rush
npm install
```

### 2. Setup Database

Pastikan PostgreSQL sudah running, lalu:

```bash
# Copy env
cp .env.example .env

# Edit DATABASE_URL di .env
# Contoh: postgresql://postgres:password@localhost:5432/reflexrush

# Push schema ke database
npm run db:push
```

### 3. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker (Recommended untuk Production)

```bash
# Jalankan semua service (App + PostgreSQL)
docker-compose up -d

# Cek logs
docker-compose logs -f app

# Stop
docker-compose down
```

App akan tersedia di `http://localhost:3000`

---

## 📁 Struktur Project

```
reflex-rush/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   ├── host/
│   │   │   ├── page.tsx          # Host setup form
│   │   │   └── [roomId]/
│   │   │       └── page.tsx      # Host game view (layar besar)
│   │   ├── play/
│   │   │   ├── page.tsx          # Player join form
│   │   │   └── [roomId]/
│   │   │       └── page.tsx      # Player game view (HP)
│   │   └── api/
│   │       ├── rooms/
│   │       │   ├── route.ts      # GET/POST rooms
│   │       │   └── [id]/route.ts # GET/DELETE room by ID
│   │       ├── socketio/
│   │       │   └── route.ts      # Socket.IO info endpoint
│   │       └── health/
│   │           └── route.ts      # Health check
│   ├── components/
│   │   ├── game/
│   │   │   ├── Leaderboard.tsx   # Live leaderboard
│   │   │   ├── CountdownDisplay.tsx
│   │   │   ├── RoundInstruction.tsx
│   │   │   └── TapButton.tsx     # Main tap button dengan particle effect
│   │   └── ui/
│   │       └── QRCode.tsx        # QR Code generator
│   ├── hooks/
│   │   ├── useSocket.ts          # Socket.IO client hook
│   │   └── useSound.ts           # Web Audio API sound engine
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── socket-server.ts      # Socket.IO server singleton
│   │   ├── socket-handlers.ts    # Socket event handlers
│   │   ├── game-engine.ts        # Core game logic (server-side)
│   │   └── utils.ts              # Helper functions
│   └── types/
│       └── game.ts               # TypeScript types + game config
├── prisma/
│   └── schema.prisma             # Database schema
├── server.ts                     # Custom Next.js server (Socket.IO)
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
└── .env.example
```

---

## 🎮 Cara Pakai

### Sebagai Host (Layar Besar)
1. Buka `http://your-server:3000` di laptop/PC
2. Klik **"Buat Room (Host)"**
3. Set nama & jumlah ronde → **Buat Room**
4. Tampilkan QR Code / kode room ke peserta
5. Tunggu peserta bergabung → Klik **"Mulai Game!"**

### Sebagai Peserta (HP)
1. Scan QR Code atau buka `http://your-server:3000/play`
2. Masukkan nama & kode room → **Masuk**
3. Tunggu host memulai
4. Ikuti instruksi dan tekan tombol **TAP!** sesuai aturan

---

## 🔌 Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Real-time | Socket.IO v4 |
| Database | PostgreSQL via Prisma ORM |
| Custom Server | Node.js HTTP + Socket.IO |
| Fonts | Orbitron + DM Sans (Google Fonts) |
| Container | Docker + Docker Compose |

---

## 🌐 Environment Variables

| Variable | Deskripsi | Contoh |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Port server (default: 3000) | `3000` |
| `NODE_ENV` | Environment | `development` / `production` |

---

## 📡 API Endpoints

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/rooms?code=ABC` | Cari room by code |
| `POST` | `/api/rooms` | Buat room baru |
| `GET` | `/api/rooms/:id` | Detail room |
| `DELETE` | `/api/rooms/:id` | Hapus room |
| `GET` | `/api/health` | Health check |

---

## 🔧 Socket Events

### Client → Server
| Event | Payload | Deskripsi |
|---|---|---|
| `host:create-room` | `{ hostName, totalRounds }` | Host buat room via socket |
| `host:start-game` | `{ roomId }` | Mulai game |
| `player:join` | `{ roomCode, playerName }` | Peserta join room |
| `player:tap` | `{ roomId, playerId, clientTimestamp }` | Kirim tap action |
| `player:rejoin` | `{ roomId, playerId }` | Reconnect setelah putus |

### Server → Client
| Event | Payload | Deskripsi |
|---|---|---|
| `game:countdown` | `{ count }` | Hitungan mundur |
| `game:round-start` | `{ round, serverTime }` | Ronde dimulai |
| `game:delay-reveal` | `{ roundId }` | Sinyal GO untuk mode DELAY |
| `game:leaderboard` | `{ players, round }` | Update leaderboard |
| `game:finished` | `{ players, winner }` | Game selesai |
| `tap:accepted` | `{ reactionMs, points, rank }` | Tap berhasil |
| `tap:penalty` | `{ points }` | Tap di mode DONT_TAP |
| `tap:too-early` | - | Tap sebelum sinyal DELAY |

---

## 🛠 Development

```bash
# Dev server
npm run dev

# Prisma Studio (GUI database)
npm run db:studio

# Generate Prisma client setelah update schema
npm run db:generate

# Reset & push schema
npm run db:push
```

---

## 📄 License

MIT — Bebas digunakan untuk keperluan internal perusahaan.
