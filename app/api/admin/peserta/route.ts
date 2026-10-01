import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const rows = await db.calonPeserta.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true } } },
  });
  const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
  return NextResponse.json(rows.map((r) => ({ ...r, tanggalLahir: fmt(r.tanggalLahir) })));
}
