import { desc, eq } from "drizzle-orm";
import { db, categories, recurrences, settings, transactions } from "@/db";
import { todayISO } from "./month";

export async function getSettings() {
  const rows = await db.select().from(settings).where(eq(settings.id, 1));
  if (rows[0]) return rows[0];

  const created = await db
    .insert(settings)
    .values({ id: 1, openingDate: todayISO() })
    .returning();
  return created[0];
}

export function getCategories() {
  return db.select().from(categories).orderBy(categories.kind, categories.name);
}

export function getTransactions(limit?: number) {
  const q = db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.id));
  return limit ? q.limit(limit) : q;
}

export function getRecurrences() {
  return db
    .select()
    .from(recurrences)
    .orderBy(desc(recurrences.kind), recurrences.dayOfMonth);
}

/** Tudo que a projeção precisa, numa ida só. */
export async function getProjectionData() {
  const [s, txs, recs, cats] = await Promise.all([
    getSettings(),
    getTransactions(),
    getRecurrences(),
    getCategories(),
  ]);
  return { settings: s, transactions: txs, recurrences: recs, categories: cats };
}
