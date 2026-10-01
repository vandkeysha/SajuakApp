import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// File bukti TIDAK ada di folder public; hanya bisa dibuka admin lewat endpoint ini.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await params;
  const row = await db.buktiPengisi.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  try {
    const buf = await readFile(path.join(process.env.UPLOAD_DIR ?? "./storage/bukti", path.basename(row.fileName)));
    return new Response(buf, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "File hilang" }, { status: 404 });
  }
}
