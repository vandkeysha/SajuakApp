import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buktiSchema } from "@/lib/validators";

const MAX = 2 * 1024 * 1024;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const form = await req.formData();
  const parsed = buktiSchema.safeParse({ namaLengkap: form.get("namaLengkap"), kantorCabang: form.get("kantorCabang") });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Bukti transfer wajib diunggah" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Ukuran maksimal 2 MB" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  // cek isi file (magic bytes), bukan hanya ekstensi / MIME dari browser
  if (!PNG.every((b, i) => buf[i] === b)) return NextResponse.json({ error: "File harus berformat PNG" }, { status: 400 });

  const dir = process.env.UPLOAD_DIR ?? "./storage/bukti";
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.png`; // nama dari server, bukan dari user
  await writeFile(path.join(dir, fileName), buf);

  const row = await db.buktiPengisi.create({ data: { ...parsed.data, fileName, userId: s.uid } });
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const rows = await db.buktiPengisi.findMany({
    where: { userId: s.uid }, orderBy: { createdAt: "desc" },
    select: { id: true, namaLengkap: true, kantorCabang: true, createdAt: true },
  });
  return NextResponse.json(rows);
}
