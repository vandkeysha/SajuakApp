import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

function done(origin: string, path: string) {
  const res = NextResponse.redirect(`${origin}${path}`);
  res.cookies.set("g_state", "", { path: "/api/auth/google", maxAge: 0 });
  return res;
}
const fail = (origin: string, msg: string) => done(origin, `/login?error=${encodeURIComponent(msg)}`);

async function uniqueUsername(name: string, email: string) {
  const admin = process.env.ADMIN_USERNAME?.toLowerCase();
  let base = (name || email.split("@")[0]).normalize("NFKD").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  if (base.length < 3) base = "Donatur";
  for (let i = 0; i < 10; i++) {
    const cand = i === 0 ? base : base + Math.floor(1000 + Math.random() * 9000);
    if (cand.toLowerCase() === admin) continue;
    const taken = await db.user.findFirst({ where: { username: { equals: cand, mode: "insensitive" } } });
    if (!taken) return cand;
  }
  return base + Date.now().toString().slice(-6);
}

// Langkah 2: Google mengembalikan user ke sini
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  if (searchParams.get("error")) return fail(origin, "Login Google dibatalkan.");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const saved = (await cookies()).get("g_state")?.value;
  if (!code || !state || !saved || state !== saved) return fail(origin, "Sesi login Google tidak valid. Coba lagi.");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail(origin, "Gagal menghubungi Google.");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return fail(origin, "Gagal menghubungi Google.");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return fail(origin, "Gagal membaca akun Google.");
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!info.sub || !info.email || !info.email_verified) return fail(origin, "Email Google belum terverifikasi.");
  const email = info.email.toLowerCase();

  // cari akun yang sudah ada; akun admin tidak pernah dicocokkan lewat Google
  let user = await db.user.findUnique({ where: { googleId: info.sub } });
  if (!user) {
    const byEmail = await db.user.findFirst({ where: { email, role: "USER" } });
    if (byEmail) user = await db.user.update({ where: { id: byEmail.id }, data: { googleId: info.sub } });
  }
  if (!user) {
    user = await db.user.create({
      data: { username: await uniqueUsername(info.name ?? "", email), email, googleId: info.sub, role: "USER" },
    });
  }
  if (user.role !== "USER") return fail(origin, "Akun ini tidak bisa masuk lewat Google.");

  await createSession({ uid: user.id, name: user.username, role: "USER" });
  return done(origin, "/dashboard");
}