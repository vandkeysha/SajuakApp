import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pesertaSchema, parseTanggal } from "@/lib/validators";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const parsed = pesertaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { tanggalLahir, ...rest } = parsed.data;
  const row = await db.calonPeserta.create({
    data: { ...rest, tanggalLahir: parseTanggal(tanggalLahir)!, userId: s.uid },
  });
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const rows = await db.calonPeserta.findMany({
    where: { userId: s.uid }, orderBy: { createdAt: "desc" },
    select: { id: true, namaLengkap: true, createdAt: true },
  });
  return NextResponse.json(rows);
}
