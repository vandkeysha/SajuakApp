import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9._]+$/, "Hanya huruf, angka, titik, underscore"),
  password: z.string().min(6).max(72),
});
export const loginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

export const buktiSchema = z.object({
  namaLengkap: z.string().trim().min(2).max(100),
  kantorCabang: z.string().trim().min(2).max(100),
});

// dd.mm.yyyy -> Date (UTC), null jika tanggal tidak valid
export function parseTanggal(s: string): Date | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const ok = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  return ok && y > 1900 && dt < new Date() ? dt : null;
}

export const pesertaSchema = z.object({
  namaLengkap: z.string().trim().min(2).max(100),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit"),
  tempatLahir: z.string().trim().min(2).max(60),
  tanggalLahir: z.string().refine((v) => parseTanggal(v) !== null, "Format tanggal dd.mm.yyyy"),
  pekerjaan: z.string().trim().min(2).max(100),
  noHp: z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor HP tidak valid"),
  email: z.string().trim().email().max(120),
  lokasiKerja: z.string().trim().min(2).max(150),
});
