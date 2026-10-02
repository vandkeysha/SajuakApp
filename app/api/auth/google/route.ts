import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

// Langkah 1: kirim user ke halaman pilih akun Google
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Login Google belum diaktifkan.")}`);

  const state = randomBytes(24).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("g_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}