import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pesertaSchema, parseTanggal } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await params;

  const parsed = pesertaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { tanggalLahir, ...rest } = parsed.data;
  const r = await db.calonPeserta.updateMany({
    where: { id },
    data: { ...rest, tanggalLahir: parseTanggal(tanggalLahir)! },
  });
  if (!r.count) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await params;
  const r = await db.calonPeserta.deleteMany({ where: { id } });
  if (!r.count) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}