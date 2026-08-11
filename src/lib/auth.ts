import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, sessions, users, type User } from "@/db";

const scrypt = promisify(scryptCb);
const COOKIE = "fin_session";
const DIAS = 30;

/* --- Senhas -------------------------------------------------------
   scrypt vem no Node, então não há dependência externa pra manter nem
   supply chain pra auditar. Guardamos "salt:hash", ambos em hex. */

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(plain.normalize("NFKC"), salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;

  const key = (await scrypt(
    plain.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    64,
  )) as Buffer;
  const expected = Buffer.from(keyHex, "hex");

  // Comparação de tempo constante: comparar com === vazaria o prefixo
  // correto pelo tempo de resposta.
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/* --- Sessões ------------------------------------------------------ */

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DIAS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ token, userId, expiresAt });

  // Faxina barata: some com as sessões vencidas de vez em quando.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(COOKIE);
}

/** Usuário da sessão atual, ou null. Não redireciona. */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}

/** Usuário da sessão, ou manda pro login. Use nas páginas protegidas. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function validarCredenciais(email: string, senha: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "E-mail inválido.";
  if (senha.length < 8) return "A senha precisa de pelo menos 8 caracteres.";
  return null;
}
