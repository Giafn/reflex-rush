// src/app/api/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// GET /api/rooms?code=ABC123
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing room code" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { orderBy: { totalScore: "desc" } },
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return NextResponse.json(room);
}

// POST /api/rooms
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hostName, totalRounds = 5 } = body;

    if (!hostName) return NextResponse.json({ error: "hostName required" }, { status: 400 });

    const code = nanoid(6).toUpperCase();
    const room = await prisma.room.create({
      data: { id: nanoid(), code, hostName, totalRounds, status: "LOBBY" },
      include: { players: true, rounds: true },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
