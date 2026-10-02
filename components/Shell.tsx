"use client";
import { useRouter } from "next/navigation";

export default function Shell({ name, children }: { name: string; children: React.ReactNode }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="wrap">
      <div className="top">
          <img className="logo logo-sm" src="/logo.png" alt="Sajuak" />
        <div>
          <span className="hint">{name}</span>&nbsp;
          <button className="btn ghost sm" onClick={logout}>Keluar</button>
        </div>
      </div>
      {children}
    </div>
  );
}
