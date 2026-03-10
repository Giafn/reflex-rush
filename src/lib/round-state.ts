// src/lib/round-state.ts
// Track round start times on server (roomId -> { roundId, startTime, delayMs, revealed })

export interface RoundState {
  roundId: string;
  startTime: number;
  delayMs: number | null;
  revealed: boolean;
  type: string;
  revealTime?: number; // When the delay reveal happened
}

export const roundState = new Map<string, RoundState>();

export function updateRoundState(
  roomId: string,
  roundId: string,
  startTime: number,
  delayMs: number | null,
  type: string,
  revealed: boolean
) {
  roundState.set(roomId, { roundId, startTime, delayMs, revealed, type });
}

export function setRoundRevealed(roomId: string, roundId: string) {
  const state = roundState.get(roomId);
  if (state && state.roundId === roundId) {
    roundState.set(roomId, {
      ...state,
      revealed: true,
      revealTime: Date.now() // Track when reveal happened
    });
  }
}

export function getRoundState(roomId: string): RoundState | undefined {
  return roundState.get(roomId);
}

export function clearRoundState(roomId: string) {
  roundState.delete(roomId);
}
