import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { limited } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(`reg:${ip}`, 10)) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { username, password } = parsed.data;

  // nama admin & duplikat (tanpa membedakan huruf besar/kecil) ditolak
  const taken = await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (taken || username.toLowerCase() === process.env.ADMIN_USERNAME?.toLowerCase())
    return NextResponse.json({ error: "Nama pengguna sudah dipakai" }, { status: 409 });

  // role SELALU USER dari endpoint ini
  await db.user.create({ data: { username, passwordHash: await bcrypt.hash(password, 12), role: "USER" } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
