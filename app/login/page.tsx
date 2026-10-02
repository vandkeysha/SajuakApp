import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const s = await getSession();
  if (s) redirect(s.role === "ADMIN" ? "/admin" : "/dashboard");
  const { error } = await searchParams;
  return (
    <div className="wrap">
      <AuthForm initialError={error} />
    </div>
  );
}