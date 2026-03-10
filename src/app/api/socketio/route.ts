// src/app/api/socketio/route.ts
// NOTE: Socket.IO requires a custom server in Next.js for full WebSocket support.
// This route handles the HTTP upgrade. See server.ts in the root for the custom server.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Socket.IO is running via custom server on /api/socketio",
    status: "ok",
  });
}
