// src/components/game/CountdownDisplay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

export function CountdownDisplay({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-orbitron text-muted-secondary text-sm tracking-[4px]">SIAPKAN DIRIMU</p>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={count}
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="font-orbitron font-black text-white leading-none select-none"
          style={{ fontSize: "clamp(100px, 25vw, 180px)" }}
        >
          {count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
