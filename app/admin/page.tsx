import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Shell from "@/components/Shell";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "ADMIN") redirect("/dashboard");
  return (
    <Shell name={s.name}>
      <AdminPanel />
    </Shell>
  );
}
