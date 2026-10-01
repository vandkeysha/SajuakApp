# Sajuak – Jumat Berkah (Frontend + Backend)

Next.js 15 · Prisma · PostgreSQL. Satu proyek, satu perintah jalan.

## Kebutuhan
- Node.js 20 atau lebih baru
- PostgreSQL (paling mudah lewat Docker, sudah disediakan)

## Menjalankan (pertama kali)
```bash
docker compose up -d      # menyalakan PostgreSQL (lewati bila sudah punya Postgres sendiri)
npm install
npm run setup             # membuat tabel + akun admin
npm run dev               # buka http://localhost:3000
```
File `.env` sudah terisi. Jika memakai Postgres sendiri, ubah `DATABASE_URL`.

## Akun admin
- Nama: `SajuakJumatSedekah`
- Password: lihat `ADMIN_PASSWORD` di `.env` (ubah lalu jalankan `npm run seed` untuk memperbarui)

User baru mendaftar sendiri lewat tab **Daftar**.

## Produksi
```bash
npm run build && npm start
```
Sebelum online: ganti `ADMIN_PASSWORD` dan `JWT_SECRET`, pakai HTTPS, backup folder `storage/` dan database secara berkala.

## Struktur
- `app/login`, `app/dashboard`, `app/admin` – halaman
- `components/` – form login, dashboard user, panel admin
- `app/api/*` – endpoint (auth, bukti, peserta, admin)
- `prisma/schema.prisma` – skema database
- `storage/bukti` – file PNG bukti transfer (tidak publik)
