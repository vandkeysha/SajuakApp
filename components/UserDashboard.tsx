"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CABANG } from "@/lib/cabang";

type Item = { id: string; namaLengkap: string; kantorCabang?: string; createdAt: string };
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

// ketik 17081990 -> 17.08.1990
const maskTgl = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join(".");
};

export default function UserDashboard({ name }: { name: string }) {
  const [view, setView] = useState<null | "proof" | "person">(null);
  const [bukti, setBukti] = useState<Item[]>([]);
  const [peserta, setPeserta] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [dob, setDob] = useState("");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch("/api/bukti"), fetch("/api/peserta")]);
    if (a.ok) setBukti(await a.json());
    if (b.ok) setPeserta(await b.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  function open(v: "proof" | "person") { setView(v); setMsg(""); setDone(""); setDob(""); }

  async function sendProof(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return setMsg("Bukti transfer wajib diunggah.");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setMsg("File harus berformat PNG, JPG, atau WebP.");
    if (file.size > 4 * 1024 * 1024) return setMsg("Ukuran file maksimal 4 MB.");
    setBusy(true); setMsg("");
    const res = await fetch("/api/bukti", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Gagal mengirim.");
    setView(null); setDone("Bukti berhasil dikirim. Terima kasih telah berbagi!"); load();
  }

  async function sendPerson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setMsg("");
    const res = await fetch("/api/peserta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Gagal menyimpan.");
    setView(null); setDone("Data calon peserta berhasil disimpan."); load();
  }

  if (view === "proof")
    return (
      <>
        <button className="back" onClick={() => setView(null)}>← Kembali</button>
        <form className="card" onSubmit={sendProof}>
          <h2>Bukti Pengisi</h2>
          <label>Nama lengkap</label><input name="namaLengkap" required minLength={2} />
          <label>Kantor cabang</label>
          <select name="kantorCabang" required defaultValue="">
            <option value="" disabled>Pilih kantor cabang</option>
            {CABANG.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label>Bukti transfer (foto atau screenshot)</label>
          <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
          <div className="hint">Format PNG, JPG, atau WebP, maksimal 4 MB</div>
          {msg && <div className="msg">{msg}</div>}
          <button className="btn" style={{ marginTop: 14 }} disabled={busy}>{busy ? "Mengirim..." : "Kirim Bukti"}</button>
        </form>
      </>
    );

  if (view === "person")
    return (
      <>
        <button className="back" onClick={() => setView(null)}>← Kembali</button>
        <form className="card" onSubmit={sendPerson}>
          <h2>Calon Peserta yang Dilindungi</h2>
          <label>Nama lengkap</label><input name="namaLengkap" required />
          <div className="row">
            <div><label>NIK (16 digit)</label><input name="nik" inputMode="numeric" maxLength={16} pattern="\d{16}" title="16 digit angka" required /></div>
            <div><label>Pekerjaan</label><input name="pekerjaan" required /></div>
          </div>
          <div className="row">
            <div><label>Tempat lahir</label><input name="tempatLahir" required /></div>
            <div><label>Tanggal lahir (dd.mm.yyyy)</label>
              <input name="tanggalLahir" value={dob} onChange={(e) => setDob(maskTgl(e.target.value))} inputMode="numeric" placeholder="17.08.1990" required /></div>
          </div>
          <div className="row">
            <div><label>Nomor HP</label><input name="noHp" type="tel" placeholder="08xxxxxxxxxx" required /></div>
            <div><label>Email</label><input name="email" type="email" required /></div>
          </div>
          <label>Lokasi pekerjaan</label><input name="lokasiKerja" required />
          {msg && <div className="msg">{msg}</div>}
          <button className="btn" style={{ marginTop: 14 }} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Data"}</button>
        </form>
      </>
    );

  return (
    <>
      <div className="hero">
        <div className="tag">Jumat Berkah</div>
        <h1>Halo, {name}</h1>
        <p>Terima kasih telah berbagi. Lengkapi data di bawah ini.</p>
      </div>
      {done && <div className="banner">{done}</div>}
      <div className="grid">
        <button className="card opt" onClick={() => open("proof")}>
          <div className="tag">Kartu 1</div><h3>Bukti Pengisi</h3>
          <p>Nama lengkap, kantor cabang, dan bukti transfer.</p>
          <p className="hint" style={{ marginTop: 12 }}>{bukti.length} terkirim</p>
        </button>
        <button className="card opt" onClick={() => open("person")}>
          <div className="tag">Kartu 2</div><h3>Calon Peserta Dilindungi</h3>
          <p>NIK, tanggal lahir, pekerjaan, dan kontak.</p>
          <p className="hint" style={{ marginTop: 12 }}>{peserta.length} tersimpan</p>
        </button>
      </div>
      <div className="grid">
        <div className="card"><h3>Riwayat bukti</h3>
          {bukti.length ? bukti.map((b) => <div className="li" key={b.id}><span>{b.namaLengkap} · {b.kantorCabang}</span><span className="hint">{tgl(b.createdAt)}</span></div>) : <div className="empty">Belum ada.</div>}
        </div>
        <div className="card"><h3>Riwayat calon peserta</h3>
          {peserta.length ? peserta.map((p) => <div className="li" key={p.id}><span>{p.namaLengkap}</span><span className="hint">{tgl(p.createdAt)}</span></div>) : <div className="empty">Belum ada.</div>}
        </div>
      </div>
    </>
  );
}
