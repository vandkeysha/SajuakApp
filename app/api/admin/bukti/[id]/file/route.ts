import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Foto bukti hanya bisa dibuka admin lewat endpoint ini.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await params;
  const row = await db.buktiPengisi.findUnique({ where: { id }, select: { fileData: true } });
  if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return new Response(new Uint8Array(row.fileData), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}