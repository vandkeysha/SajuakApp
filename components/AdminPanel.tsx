"use client";
import { useEffect, useMemo, useState } from "react";

type Bukti = { id: string; namaLengkap: string; kantorCabang: string; createdAt: string; user: { username: string } };
type Peserta = {
  id: string; namaLengkap: string; nik: string; tempatLahir: string; tanggalLahir: string;
  pekerjaan: string; noHp: string; email: string; lokasiKerja: string; user: { username: string };
};
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const hariIni = () => new Date().toISOString().slice(0, 10);

type Col = { header: string; key: string; width: number; text?: boolean };

async function downloadExcel(fileName: string, sheetName: string, cols: Col[], rows: Record<string, unknown>[], linkKey?: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sajuak";
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });

  // kolom bertanda text disimpan sebagai teks (NIK, nomor HP, tanggal) supaya tidak berubah format
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.text ? { numFmt: "@" } : {} }));
  rows.forEach((r) => ws.addRow(r));

  const head = ws.getRow(1);
  head.height = 24;
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F5C47" } };
    cell.alignment = { vertical: "middle" };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  if (linkKey) {
    ws.eachRow((row, n) => {
      if (n > 1) row.getCell(linkKey).font = { color: { argb: "FF0563C1" }, underline: true };
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}-${hariIni()}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportBukti(rows: Bukti[]) {
  const base = window.location.origin;
  return downloadExcel(
    "bukti-pengisi-sajuak",
    "Bukti Pengisi",
    [
      { header: "No", key: "no", width: 6 },
      { header: "Nama Lengkap", key: "nama", width: 28 },
      { header: "Kantor Cabang", key: "cabang", width: 36 },
      { header: "Diisi Oleh", key: "oleh", width: 22 },
      { header: "Tanggal", key: "tanggal", width: 16, text: true },
      { header: "Bukti", key: "link", width: 16 },
    ],
    rows.map((r, i) => ({
      no: i + 1,
      nama: r.namaLengkap,
      cabang: r.kantorCabang,
      oleh: r.user.username,
      tanggal: tgl(r.createdAt),
      link: { text: "Lihat bukti", hyperlink: `${base}/api/admin/bukti/${r.id}/file` },
    })),
    "link"
  );
}

function exportPeserta(rows: Peserta[]) {
  return downloadExcel(
    "calon-peserta-sajuak",
    "Calon Peserta",
    [
      { header: "No", key: "no", width: 6 },
      { header: "Nama Lengkap", key: "nama", width: 28 },
      { header: "NIK", key: "nik", width: 20, text: true },
      { header: "Tempat Lahir", key: "tempat", width: 18 },
      { header: "Tanggal Lahir", key: "tanggal", width: 16, text: true },
      { header: "Pekerjaan", key: "kerja", width: 22 },
      { header: "No HP", key: "hp", width: 18, text: true },
      { header: "Email", key: "email", width: 30 },
      { header: "Lokasi Kerja", key: "lokasi", width: 26 },
      { header: "Diisi Oleh", key: "oleh", width: 22 },
    ],
    rows.map((r, i) => ({
      no: i + 1,
      nama: r.namaLengkap,
      nik: r.nik,
      tempat: r.tempatLahir,
      tanggal: r.tanggalLahir,
      kerja: r.pekerjaan,
      hp: r.noHp,
      email: r.email,
      lokasi: r.lokasiKerja,
      oleh: r.user.username,
    }))
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<"bukti" | "peserta">("bukti");
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Bukti | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

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
  const kosong = tab === "bukti" ? !fb.length : !fp.length;

  async function doExport() {
    setBusy(true);
    try {
      await (tab === "bukti" ? exportBukti(fb) : exportPeserta(fp));
    } catch {
      alert("Gagal membuat file Excel. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

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
          <button className="btn ghost" onClick={doExport} disabled={kosong || busy}>
            {busy ? "Menyiapkan..." : "Export Excel"}
          </button>
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