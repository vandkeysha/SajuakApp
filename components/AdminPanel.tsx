"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CABANG } from "@/lib/cabang";

type Bukti = { id: string; namaLengkap: string; kantorCabang: string; createdAt: string; user: { username: string } };
type Peserta = {
  id: string; namaLengkap: string; nik: string; tempatLahir: string; tanggalLahir: string;
  pekerjaan: string; noHp: string; email: string; lokasiKerja: string; user: { username: string };
};
type ModalState = { kind: "bukti"; item?: Bukti } | { kind: "peserta"; item?: Peserta } | null;
type DelState = { kind: "bukti" | "peserta"; id: string; label: string } | null;

const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const hariIni = () => new Date().toISOString().slice(0, 10);
// ketik 17081990 -> 17.08.1990
const maskTgl = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join(".");
};

/* ---------- Export Excel ---------- */
type Col = { header: string; key: string; width: number; text?: boolean };

async function downloadExcel(fileName: string, sheetName: string, cols: Col[], rows: Record<string, unknown>[], linkKey?: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sajuak";
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
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
  const blob = new Blob([buf as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}-${hariIni()}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportBukti(rows: Bukti[]) {
  const base = window.location.origin;
  return downloadExcel(
    "bukti-pengisi-sajuak", "Bukti Pengisi",
    [
      { header: "No", key: "no", width: 6 },
      { header: "Nama Lengkap", key: "nama", width: 28 },
      { header: "Kantor Cabang", key: "cabang", width: 36 },
      { header: "Diisi Oleh", key: "oleh", width: 22 },
      { header: "Tanggal", key: "tanggal", width: 16, text: true },
      { header: "Bukti", key: "link", width: 16 },
    ],
    rows.map((r, i) => ({
      no: i + 1, nama: r.namaLengkap, cabang: r.kantorCabang, oleh: r.user.username, tanggal: tgl(r.createdAt),
      link: { text: "Lihat bukti", hyperlink: `${base}/api/admin/bukti/${r.id}/file` },
    })),
    "link"
  );
}

function exportPeserta(rows: Peserta[]) {
  return downloadExcel(
    "calon-peserta-sajuak", "Calon Peserta",
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
      no: i + 1, nama: r.namaLengkap, nik: r.nik, tempat: r.tempatLahir, tanggal: r.tanggalLahir, kerja: r.pekerjaan,
      hp: r.noHp, email: r.email, lokasi: r.lokasiKerja, oleh: r.user.username,
    }))
  );
}

/* ---------- Formulir Bukti Pengisi (tambah / edit) ---------- */
function BuktiForm({ item, onClose, onSaved }: { item?: Bukti; onClose: () => void; onSaved: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // data lama yang cabangnya diketik bebas tetap bisa dipilih di dropdown
  const opts = item && !CABANG.includes(item.kantorCabang) ? [item.kantorCabang, ...CABANG] : CABANG;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    const has = file instanceof File && file.size > 0;
    if (!item && !has) return setMsg("Foto bukti wajib diunggah.");
    if (has) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setMsg("File harus berformat PNG, JPG, atau WebP.");
      if (file.size > 4 * 1024 * 1024) return setMsg("Ukuran file maksimal 4 MB.");
    } else {
      fd.delete("file");
    }
    setBusy(true); setMsg("");
    const res = await fetch(item ? `/api/admin/bukti/${item.id}` : "/api/admin/bukti", { method: item ? "PATCH" : "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Gagal menyimpan.");
    onSaved(item ? "Bukti berhasil diperbarui." : "Bukti berhasil ditambahkan.");
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card" onSubmit={submit}>
        <h3>{item ? "Edit Bukti Pengisi" : "Tambah Bukti Pengisi"}</h3>
        <label>Nama lengkap</label>
        <input name="namaLengkap" defaultValue={item?.namaLengkap ?? ""} required minLength={2} />
        <label>Kantor cabang</label>
        <select name="kantorCabang" defaultValue={item?.kantorCabang ?? ""} required>
          <option value="" disabled>Pilih kantor cabang</option>
          {opts.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label>{item ? "Ganti foto (kosongkan jika tidak diganti)" : "Foto bukti transfer"}</label>
        {item && <img src={`/api/admin/bukti/${item.id}/file`} alt="Bukti saat ini" style={{ maxHeight: 150, width: "auto", marginBottom: 8 }} />}
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp" />
        <div className="hint">PNG, JPG, atau WebP, maksimal 4 MB</div>
        {msg && <div className="msg">{msg}</div>}
        <div className="act" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</button>
          <button type="button" className="btn ghost" onClick={onClose}>Batal</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Formulir Calon Peserta (tambah / edit) ---------- */
function PesertaForm({ item, onClose, onSaved }: { item?: Peserta; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({
    namaLengkap: item?.namaLengkap ?? "", nik: item?.nik ?? "", tempatLahir: item?.tempatLahir ?? "",
    tanggalLahir: item?.tanggalLahir ?? "", pekerjaan: item?.pekerjaan ?? "", noHp: item?.noHp ?? "",
    email: item?.email ?? "", lokasiKerja: item?.lokasiKerja ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const res = await fetch(item ? `/api/admin/peserta/${item.id}` : "/api/admin/peserta", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Gagal menyimpan.");
    onSaved(item ? "Data peserta berhasil diperbarui." : "Data peserta berhasil ditambahkan.");
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
        <h3>{item ? "Edit Calon Peserta" : "Tambah Calon Peserta"}</h3>
        <label>Nama lengkap</label>
        <input value={f.namaLengkap} onChange={(e) => set("namaLengkap", e.target.value)} required />
        <div className="row">
          <div><label>NIK (16 digit)</label>
            <input value={f.nik} onChange={(e) => set("nik", e.target.value)} inputMode="numeric" maxLength={16} pattern="\d{16}" title="16 digit angka" required /></div>
          <div><label>Pekerjaan</label>
            <input value={f.pekerjaan} onChange={(e) => set("pekerjaan", e.target.value)} required /></div>
        </div>
        <div className="row">
          <div><label>Tempat lahir</label>
            <input value={f.tempatLahir} onChange={(e) => set("tempatLahir", e.target.value)} required /></div>
          <div><label>Tanggal lahir (dd.mm.yyyy)</label>
            <input value={f.tanggalLahir} onChange={(e) => set("tanggalLahir", maskTgl(e.target.value))} inputMode="numeric" placeholder="17.08.1990" required /></div>
        </div>
        <div className="row">
          <div><label>Nomor HP</label>
            <input value={f.noHp} onChange={(e) => set("noHp", e.target.value)} type="tel" placeholder="08xxxxxxxxxx" required /></div>
          <div><label>Email</label>
            <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" required /></div>
        </div>
        <label>Lokasi pekerjaan</label>
        <input value={f.lokasiKerja} onChange={(e) => set("lokasiKerja", e.target.value)} required />
        {msg && <div className="msg">{msg}</div>}
        <div className="act" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</button>
          <button type="button" className="btn ghost" onClick={onClose}>Batal</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Panel utama ---------- */
export default function AdminPanel() {
  const [tab, setTab] = useState<"bukti" | "peserta">("bukti");
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Bukti | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [del, setDel] = useState<DelState>(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch("/api/admin/bukti"), fetch("/api/admin/peserta")]);
    if (!a.ok || !b.ok) return setErr("Gagal memuat data.");
    setErr("");
    setBukti(await a.json());
    setPeserta(await b.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saved(m: string) {
    setModal(null);
    setInfo(m);
    await load();
  }

  async function doDelete() {
    if (!del) return;
    setDelBusy(true);
    const res = await fetch(`/api/admin/${del.kind}/${del.id}`, { method: "DELETE" });
    setDelBusy(false);
    if (!res.ok) return alert("Gagal menghapus data.");
    setDel(null);
    setInfo("Data berhasil dihapus.");
    await load();
  }

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
        <p>Pantau pengisi dan kelola seluruh data yang masuk.</p>
      </div>
      <div className="stats">
        <div className="card stat"><b>{bukti.length}</b><span>Bukti sedekah</span></div>
        <div className="card stat"><b>{peserta.length}</b><span>Calon peserta</span></div>
        <div className="card stat"><b>{cabang}</b><span>Kantor cabang</span></div>
      </div>
      {err && <div className="msg">{err}</div>}
      {info && <div className="banner" onClick={() => setInfo("")} style={{ cursor: "pointer" }}>{info}</div>}
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
                  <tr key={x.id}>
                    <td>{x.namaLengkap}</td><td>{x.kantorCabang}</td><td>{x.user.username}</td><td>{tgl(x.createdAt)}</td>
                    <td>
                      <div className="act">
                        <button className="btn ghost sm" onClick={() => setSel(x)}>Lihat</button>
                        <button className="btn edit sm" onClick={() => { setInfo(""); setModal({ kind: "bukti", item: x }); }}>Edit</button>
                        <button className="btn danger sm" onClick={() => setDel({ kind: "bukti", id: x.id, label: x.namaLengkap })}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <div className="empty">Belum ada bukti masuk.</div>
          ) : fp.length ? (
            <table>
              <thead><tr><th>Nama</th><th>NIK</th><th>TTL</th><th>Pekerjaan</th><th>HP</th><th>Email</th><th>Lokasi</th><th>Oleh</th><th></th></tr></thead>
              <tbody>{fp.map((x) => (
                <tr key={x.id}>
                  <td>{x.namaLengkap}</td><td>{x.nik}</td><td>{x.tempatLahir}, {x.tanggalLahir}</td><td>{x.pekerjaan}</td>
                  <td>{x.noHp}</td><td>{x.email}</td><td>{x.lokasiKerja}</td><td>{x.user.username}</td>
                  <td>
                    <div className="act">
                      <button className="btn edit sm" onClick={() => { setInfo(""); setModal({ kind: "peserta", item: x }); }}>Edit</button>
                      <button className="btn danger sm" onClick={() => setDel({ kind: "peserta", id: x.id, label: x.namaLengkap })}>Hapus</button>
                    </div>
                  </td>
                </tr>
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

      {modal?.kind === "bukti" && <BuktiForm item={modal.item} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.kind === "peserta" && <PesertaForm item={modal.item} onClose={() => setModal(null)} onSaved={saved} />}

      {del && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && !delBusy && setDel(null)}>
          <div className="card">
            <h3>Hapus data?</h3>
            <p style={{ margin: "10px 0 0" }}>
              Data <b>{del.label}</b> akan dihapus permanen{del.kind === "bukti" ? " beserta fotonya" : ""}. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="act" style={{ marginTop: 18 }}>
              <button className="btn solid-danger" onClick={doDelete} disabled={delBusy}>{delBusy ? "Menghapus..." : "Ya, hapus"}</button>
              <button className="btn ghost" onClick={() => setDel(null)} disabled={delBusy}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}