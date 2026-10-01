import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect(s.role === "ADMIN" ? "/admin" : "/dashboard");
  return (
    <div className="wrap">
      <AuthForm />
    </div>
  );
}
