import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buktiSchema } from "@/lib/validators";
import { isCabang } from "@/lib/cabang";

// Vercel membatasi isi permintaan sekitar 4,5 MB, jadi batas aman 4 MB
const MAX = 4 * 1024 * 1024;

// Jenis file ditentukan dari isi file, bukan dari nama atau klaim browser
function detectType(b: Uint8Array): string | null {
  if (b.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length > 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50  // "WEBP"
  ) return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const form = await req.formData();
  const parsed = buktiSchema.safeParse({ namaLengkap: form.get("namaLengkap"), kantorCabang: form.get("kantorCabang") });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    if (!isCabang(parsed.data.kantorCabang)) return NextResponse.json({ error: "Pilih kantor cabang dari daftar" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Bukti transfer wajib diunggah" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Ukuran maksimal 4 MB" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileType = detectType(bytes);
  if (!fileType) return NextResponse.json({ error: "File harus berformat PNG, JPG, atau WebP" }, { status: 400 });

  const row = await db.buktiPengisi.create({ data: { ...parsed.data, fileData: bytes, fileType, userId: s.uid } });
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