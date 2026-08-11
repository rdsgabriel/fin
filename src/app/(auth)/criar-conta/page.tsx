import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta — Fin" };
export const dynamic = "force-dynamic";

export default async function CriarContaPage() {
  if (await getCurrentUser()) redirect("/");
  return <AuthForm modo="criar" />;
}
