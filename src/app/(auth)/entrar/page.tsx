import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar — Fin" };
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  // Quem já está logado não tem o que fazer na tela de login.
  if (await getCurrentUser()) redirect("/");
  return <AuthForm modo="entrar" />;
}
