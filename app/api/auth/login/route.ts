import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { limited } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const { username, password } = parsed.data;

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(`login:${ip}:${username.toLowerCase()}`))
    return NextResponse.json({ error: "Terlalu banyak percobaan, coba lagi 15 menit" }, { status: 429 });

  const user = await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) return NextResponse.json({ error: "Nama atau kata sandi salah" }, { status: 401 });

  await createSession({ uid: user.id, name: user.username, role: user.role });
  return NextResponse.json({ ok: true, role: user.role, redirect: user.role === "ADMIN" ? "/admin" : "/dashboard" });
}
