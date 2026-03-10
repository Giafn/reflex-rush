// src/hooks/useSound.ts
"use client";

import { useCallback, useRef } from "react";

function createTone(
  freq: number,
  type: OscillatorType = "sine",
  duration = 0.15,
  gain = 0.3
): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
  } catch (e) {
    // Audio not available
  }
}

export function useSound() {
  const enabled = useRef(true);

  const play = useCallback((name: keyof typeof soundDefs) => {
    if (!enabled.current) return;
    soundDefs[name]();
  }, []);

  const toggle = useCallback(() => {
    enabled.current = !enabled.current;
    return enabled.current;
  }, []);

  return { play, toggle };
}

const soundDefs = {
  tap: () => {
    createTone(880, "sine", 0.1);
    setTimeout(() => createTone(1100, "sine", 0.08), 40);
  },
  success: () => {
    createTone(523, "sine", 0.1);
    setTimeout(() => createTone(659, "sine", 0.1), 100);
    setTimeout(() => createTone(784, "sine", 0.2), 200);
  },
  fail: () => {
    createTone(200, "sawtooth", 0.3, 0.4);
    setTimeout(() => createTone(150, "sawtooth", 0.3, 0.4), 150);
  },
  countdown: () => createTone(440, "triangle", 0.15, 0.25),
  go: () => {
    createTone(880, "square", 0.05, 0.2);
    setTimeout(() => createTone(1100, "square", 0.15, 0.2), 50);
  },
  tension: () => createTone(330, "sine", 0.6, 0.1),
  winner: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => createTone(f, "sine", 0.3), i * 120)
    );
  },
};
