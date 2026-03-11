# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reflex Rush is a real-time web-based reflex game for office gatherings. The host displays on a large screen while participants play via mobile phones without any app installation. The game uses WebSocket for instant synchronization and server-side timestamps for fair scoring.

## Commands

### Development
```bash
npm run dev          # Start development server (runs server.ts)
npm run build        # Build for production
npm start            # Start production server
```

### Database (Prisma)
```bash
npm run db:push      # Push schema to database (dev)
npm run db:generate  # Generate Prisma client after schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio (database GUI)
```

## Architecture

### Custom Server
The application uses a custom Next.js server (`server.ts`) instead of the default Next.js server to integrate Socket.IO. The server is initialized with `tsx server.ts` (not `next dev`).

### Socket.IO Integration
- Socket.IO server is initialized in `src/lib/socket-server.ts` as a singleton using `globalThis` to persist across hot reloads
- Socket path is `/api/socketio`
- Event handlers are registered in `src/lib/socket-handlers.ts`
- Client-side uses `src/hooks/useSocket.ts` hook with singleton pattern

### Game Engine Architecture
The game logic is server-side controlled for fairness:

1. **Round State** (`src/lib/round-state.ts`): In-memory Map tracking active round data (startTime, delayMs, revealed state, revealTime). Used for tap validation.

2. **Game Flow** (`src/lib/game-engine.ts`):
   - `startGame()` → countdown → `startRound()`
   - `startRound()` creates a random round type (TAP/DONT_TAP/DELAY), broadcasts `game:round-start`
   - For DELAY type: after `delayMs`, emits `game:delay-reveal` signal
   - After round duration, `endRound()` processes scores and shows leaderboard
   - Uses `activeTimers` Map to track and clear all timers when stopping/ending games

3. **Scoring** (`src/types/game.ts`):
   - TAP: Faster = more points (1000ms - reactionTime)
   - DONT_TAP: -500 for tapping, +300 for waiting
   - DELAY: 500 - reactionTime (min 50), -200 for early tap

### Room & Player State
All room/player data is persisted in PostgreSQL via Prisma:
- Rooms store game state (status, currentRound, totalRounds)
- Players store connection state (isConnected), scores, elimination status
- Round results stored in Score table with reactionTimeMs and pointsEarned
- Players can reconnect (`player:rejoin`) and restore state from DB

### Client-Host Architecture
- **Host View** (`src/app/host/[roomId]/page.tsx`): Shows QR code, live leaderboard, round instructions, manages game flow
- **Player View** (`src/app/play/[roomId]/page.tsx`): Mobile-optimized, shows tap button, receives immediate feedback
- Both views share `useSocket()` hook for real-time communication

### Socket Events Summary

**Server → Client:**
- `room:updated` - Full room state with players/rounds
- `player:joined/left/updated` - Individual player changes
- `game:countdown` - Countdown number
- `game:round-start` - Round starts with type and serverTime
- `game:delay-reveal` - Signal for DELAY round tap validity
- `game:leaderboard` - Show interim leaderboard
- `game:finished` - Game over with winner
- `tap:accepted/penalty/too-early` - Immediate tap feedback

**Client → Server:**
- `host:create-room` - Create new room
- `host:join-room` - Reconnect host to existing room
- `host:start-game/end-game` - Control game flow
- `player:join` - Join room with name and code
- `player:tap` - Submit tap with clientTimestamp
- `player:rejoin` - Reconnect player

### Key Design Decisions
- **Server-side timestamping**: Tap reactions calculated from `Date.now()` on server, not client timestamp (clientTimestamp sent only for debugging)
- **In-memory round state**: Round validation data stored in Map for fast access, cleared when round ends
- **Timer management**: All game timers tracked in `activeTimers` Map for proper cleanup on disconnect/reset
- **Session persistence**: Players store playerId in sessionStorage for reconnection
