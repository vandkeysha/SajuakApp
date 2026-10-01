import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Shell from "@/components/Shell";
import UserDashboard from "@/components/UserDashboard";

export default async function DashboardPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role === "ADMIN") redirect("/admin");
  return (
    <Shell name={s.name}>
      <UserDashboard name={s.name} />
    </Shell>
  );
}
