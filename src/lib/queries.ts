import { and, desc, eq } from "drizzle-orm";
import { db, categories, goals, recurrences, settings, transactions } from "@/db";
import { todayISO } from "./month";

/* Toda query aqui recebe `userId` explicitamente. Nada de pegar o usuário
   de um contexto implícito: se um dia alguém esquecer de passar, o
   TypeScript reclama em vez de vazar dado de outra conta. */

export async function getSettings(userId: number) {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));
  if (rows[0]) return rows[0];

  const created = await db
    .insert(settings)
    .values({ userId, openingDate: todayISO() })
    .returning();
  return created[0];
}

export function getCategories(userId: number) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.kind, categories.name);
}

export function getTransactions(userId: number, limit?: number) {
  const q = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.id));
  return limit ? q.limit(limit) : q;
}

export function getRecurrences(userId: number) {
  return db
    .select()
    .from(recurrences)
    .where(eq(recurrences.userId, userId))
    .orderBy(desc(recurrences.kind), recurrences.dayOfMonth);
}

export function getGoals(userId: number) {
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(goals.targetCents);
}

/** Tudo que a projeção precisa, numa ida só. */
export async function getProjectionData(userId: number) {
  const [s, txs, recs, cats, metas] = await Promise.all([
    getSettings(userId),
    getTransactions(userId),
    getRecurrences(userId),
    getCategories(userId),
    getGoals(userId),
  ]);
  return {
    settings: s,
    transactions: txs,
    recurrences: recs,
    categories: cats,
    goals: metas,
  };
}

/** Conta se o usuário já tem qualquer dado — usado pra decidir o onboarding. */
export async function temDados(userId: number) {
  const [rec] = await db
    .select({ id: recurrences.id })
    .from(recurrences)
    .where(eq(recurrences.userId, userId))
    .limit(1);
  if (rec) return true;

  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .limit(1);
  return Boolean(tx);
}

export { and };
