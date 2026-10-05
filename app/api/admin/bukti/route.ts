import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const rows = await db.buktiPengisi.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, namaLengkap: true, kantorCabang: true, createdAt: true, user: { select: { username: true } } },
  });
  return NextResponse.json(rows); // gambar diambil lewat /api/admin/bukti/{id}/file
}