// src/app/api/rooms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const room = await prisma.room.findUnique({
    where: { id: params.id },
    include: {
      players: { orderBy: { totalScore: "desc" } },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: { scores: true },
      },
    },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.room.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
