"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, categories, settings, users } from "@/db";
import {
  createSession,
  destroySession,
  hashPassword,
  normalizeEmail,
  requireUser,
  validarCredenciais,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { todayISO } from "@/lib/month";

export type AuthState = { error?: string } | null;

export async function registrar(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const senha = String(formData.get("senha") ?? "");

  const erro = validarCredenciais(email, senha);
  if (erro) return { error: erro };

  const existente = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existente.length) {
    return { error: "Já existe uma conta com esse e-mail. Tente entrar." };
  }

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(senha) })
    .returning();

  // Conta nova nasce com as preferências e as categorias padrão prontas,
  // senão a primeira tela já apareceria quebrada.
  await db.insert(settings).values({ userId: user.id, openingDate: todayISO() });
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })));

  await createSession(user.id);
  redirect("/instalar");
}

export async function entrar(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const senha = String(formData.get("senha") ?? "");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Mesma mensagem nos dois casos: dizer "esse e-mail não existe" entrega
  // quem tem conta aqui pra quem estiver testando e-mails.
  const generico = { error: "E-mail ou senha incorretos." };
  if (!user) return generico;
  if (!(await verifyPassword(senha, user.passwordHash))) return generico;

  await createSession(user.id);
  redirect("/");
}

export async function sair() {
  await destroySession();
  redirect("/entrar");
}

/** Marca que a pessoa já viu a tela de instalar, e segue pro onboarding. */
export async function concluirInstalacao() {
  const user = await requireUser();
  await db
    .update(settings)
    .set({ installPrompted: true })
    .where(eq(settings.userId, user.id));
  redirect("/comecar");
}
