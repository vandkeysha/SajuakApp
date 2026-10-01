"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";


async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function PasswordInput(props: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input
        id={props.id}
        type={show ? "text" : "password"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required
      />
      <button
        type="button"
        className="eye"
        onClick={() => setShow(!show)}
        aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {show ? (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export default function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "reg">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      if (tab === "reg") {
        if (password !== password2) return setMsg("Kata sandi tidak sama.");
        const r = await post("/api/auth/register", { username, password });
        if (!r.ok) return setMsg(r.data.error ?? "Gagal mendaftar.");
      }
      const r = await post("/api/auth/login", { username, password });
      if (!r.ok) return setMsg(r.data.error ?? "Gagal masuk.");
      router.push(r.data.redirect);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="brand">Sajuak<b>.</b></div>
      <p className="sub">Program Jumat Berkah · Berbagi itu menenangkan</p>
      <form className="card" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={tab === "login" ? "on" : ""} onClick={() => { setTab("login"); setMsg(""); }}>Masuk</button>
          <button type="button" className={tab === "reg" ? "on" : ""} onClick={() => { setTab("reg"); setMsg(""); }}>Daftar</button>
        </div>
        <label htmlFor="un">Nama pengguna</label>
        <input id="un" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        <label htmlFor="pw">Kata sandi</label>
        <PasswordInput id="pw" value={password} onChange={setPassword} autoComplete={tab === "login" ? "current-password" : "new-password"} />
        {tab === "reg" && (
          <>
            <label htmlFor="pw2">Ulangi kata sandi</label>
            <PasswordInput id="pw2" value={password2} onChange={setPassword2} autoComplete="new-password" />
            <div className="hint" style={{ marginTop: 6 }}>Nama: 3–30 karakter (huruf/angka). Sandi minimal 6 karakter.</div>
          </>
        )}
        {msg && <div className="msg">{msg}</div>}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={busy}>
          {busy ? "Memproses..." : tab === "login" ? "Masuk" : "Buat Akun"}
        </button>
      </form>
    </div>
  );
}