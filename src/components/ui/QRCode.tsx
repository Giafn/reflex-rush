// src/components/ui/QRCode.tsx
"use client";

import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCode({ value, size = 200 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#00FF88", light: "#0A0A0F" },
      errorCorrectionLevel: "M",
    }).catch(console.error);
  }, [value, size]);

  return (
    <div
      className="rounded-2xl overflow-hidden border border-green-500/20 p-3"
      style={{ background: "#0A0A0F" }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
