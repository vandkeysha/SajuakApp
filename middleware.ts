import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Lapisan pertama: halaman & API dilindungi. Setiap route tetap mengecek ulang sesi.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sajuak_session")?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
      role = payload.role as string;
    } catch {}
  }
  const isApi = pathname.startsWith("/api");
  const deny = (status: number) =>
    isApi ? NextResponse.json({ error: "Tidak diizinkan" }, { status }) : NextResponse.redirect(new URL("/login", req.url));

  if (!role) return deny(401);
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && role !== "ADMIN") return deny(403);
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/bukti/:path*", "/api/peserta/:path*", "/api/admin/:path*"],
};
