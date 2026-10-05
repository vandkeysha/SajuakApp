import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buktiSchema } from "@/lib/validators";
import { isCabang } from "@/lib/cabang";
import { detectType, MAX_FILE } from "@/lib/upload";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await params;

  const cur = await db.buktiPengisi.findUnique({ where: { id }, select: { kantorCabang: true } });
  if (!cur) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const form = await req.formData();
  const parsed = buktiSchema.safeParse({ namaLengkap: form.get("namaLengkap"), kantorCabang: form.get("kantorCabang") });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  // data lama yang cabangnya diketik bebas boleh tetap dipakai, tapi pilihan baru harus dari daftar
  if (!isCabang(parsed.data.kantorCabang) && parsed.data.kantorCabang !== cur.kantorCabang)
    return NextResponse.json({ error: "Pilih kantor cabang dari daftar" }, { status: 400 });

  const file = form.get("file");
  if (file instanceof File && file.size) {
    if (file.size > MAX_FILE) return NextResponse.json({ error: "Ukuran maksimal 4 MB" }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileType = detectType(bytes);
    if (!fileType) return NextResponse.json({ error: "File harus berformat PNG, JPG, atau WebP" }, { status: 400 });
    await db.buktiPengisi.update({ where: { id }, data: { ...parsed.data, fileData: bytes, fileType } });
  } else {
    await db.buktiPengisi.update({ where: { id }, data: parsed.data });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { id } = await params;
  const r = await db.buktiPengisi.deleteMany({ where: { id } });
  if (!r.count) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}