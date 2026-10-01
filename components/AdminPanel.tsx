"use client";
import { useEffect, useMemo, useState } from "react";

type Bukti = { id: string; namaLengkap: string; kantorCabang: string; createdAt: string; user: { username: string } };
type Peserta = {
  id: string; namaLengkap: string; nik: string; tempatLahir: string; tanggalLahir: string;
  pekerjaan: string; noHp: string; email: string; lokasiKerja: string; user: { username: string };
};
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

function exportCsv(rows: Peserta[]) {
  const safe = (v: string) => `"${(/^[=+\-@]/.test(v) ? "'" + v : v).replace(/"/g, '""')}"`;
  const head = ["Nama Lengkap", "NIK", "Tempat Lahir", "Tanggal Lahir", "Pekerjaan", "No HP", "Email", "Lokasi Kerja", "Diisi Oleh"];
  const lines = rows.map((r) =>
    [safe(r.namaLengkap), `="${r.nik}"`, safe(r.tempatLahir), safe(r.tanggalLahir), safe(r.pekerjaan), safe(r.noHp), safe(r.email), safe(r.lokasiKerja), safe(r.user.username)].join(",")
  );
  const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "calon-peserta-sajuak.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminPanel() {
  const [tab, setTab] = useState<"bukti" | "peserta">("bukti");
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Bukti | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([fetch("/api/admin/bukti"), fetch("/api/admin/peserta")]);
      if (!a.ok || !b.ok) return setErr("Gagal memuat data.");
      setBukti(await a.json());
      setPeserta(await b.json());
    })();
  }, []);

  const k = q.trim().toLowerCase();
  const fb = useMemo(() => bukti.filter((x) => !k || [x.namaLengkap, x.kantorCabang, x.user.username].join(" ").toLowerCase().includes(k)), [bukti, k]);
  const fp = useMemo(() => peserta.filter((x) => !k || Object.values(x).filter((v) => typeof v === "string").join(" ").toLowerCase().includes(k) || x.user.username.toLowerCase().includes(k)), [peserta, k]);
  const cabang = new Set(bukti.map((b) => b.kantorCabang.toLowerCase())).size;

  return (
    <>
      <div className="hero">
        <div className="tag">Panel Admin</div>
        <h1>Pemantauan Sedekah</h1>
        <p>Pantau pengisi dan lihat seluruh bukti yang masuk.</p>
      </div>
      <div className="stats">
        <div className="card stat"><b>{bukti.length}</b><span>Bukti sedekah</span></div>
        <div className="card stat"><b>{peserta.length}</b><span>Calon peserta</span></div>
        <div className="card stat"><b>{cabang}</b><span>Kantor cabang</span></div>
      </div>
      {err && <div className="msg">{err}</div>}
      <div className="card">
        <div className="tabs">
          <button className={tab === "bukti" ? "on" : ""} onClick={() => setTab("bukti")}>Bukti Pengisi</button>
          <button className={tab === "peserta" ? "on" : ""} onClick={() => setTab("peserta")}>Calon Peserta</button>
        </div>
        <div className="bar">
          <input placeholder="Cari nama, cabang, pengguna..." value={q} onChange={(e) => setQ(e.target.value)} />
          {tab === "peserta" && <button className="btn ghost" onClick={() => exportCsv(fp)} disabled={!fp.length}>Export CSV</button>}
        </div>
        <div className="tw">
          {tab === "bukti" ? (
            fb.length ? (
              <table>
                <thead><tr><th>Nama</th><th>Cabang</th><th>Diisi oleh</th><th>Tanggal</th><th></th></tr></thead>
                <tbody>{fb.map((x) => (
                  <tr key={x.id}><td>{x.namaLengkap}</td><td>{x.kantorCabang}</td><td>{x.user.username}</td><td>{tgl(x.createdAt)}</td>
                    <td><button className="btn ghost sm" onClick={() => setSel(x)}>Lihat bukti</button></td></tr>
                ))}</tbody>
              </table>
            ) : <div className="empty">Belum ada bukti masuk.</div>
          ) : fp.length ? (
            <table>
              <thead><tr><th>Nama</th><th>NIK</th><th>TTL</th><th>Pekerjaan</th><th>HP</th><th>Email</th><th>Lokasi</th><th>Oleh</th></tr></thead>
              <tbody>{fp.map((x) => (
                <tr key={x.id}><td>{x.namaLengkap}</td><td>{x.nik}</td><td>{x.tempatLahir}, {x.tanggalLahir}</td><td>{x.pekerjaan}</td><td>{x.noHp}</td><td>{x.email}</td><td>{x.lokasiKerja}</td><td>{x.user.username}</td></tr>
              ))}</tbody>
            </table>
          ) : <div className="empty">Belum ada data peserta.</div>}
        </div>
      </div>
      {sel && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="card">
            <h3>{sel.namaLengkap}</h3>
            <div className="hint">{sel.kantorCabang} · {tgl(sel.createdAt)} · oleh {sel.user.username}</div>
            <img src={`/api/admin/bukti/${sel.id}/file`} alt="Bukti transfer" />
            <button className="btn" style={{ marginTop: 14, width: "100%" }} onClick={() => setSel(null)}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}
