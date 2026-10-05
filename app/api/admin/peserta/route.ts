import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pesertaSchema, parseTanggal } from "@/lib/validators";

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

export async function POST(req: Request) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const parsed = pesertaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { tanggalLahir, ...rest } = parsed.data;
  const row = await db.calonPeserta.create({
    data: { ...rest, tanggalLahir: parseTanggal(tanggalLahir)!, userId: s.uid },
  });
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}