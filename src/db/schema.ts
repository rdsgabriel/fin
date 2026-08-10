import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Valores monetários são sempre inteiros em centavos e sempre positivos.
 *  O sinal vem do campo `kind`. */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull().$type<"income" | "expense">(),
    color: text("color").notNull().default("#8E8E93"),
  },
  (t) => [check("categories_kind", sql`${t.kind} in ('income','expense')`)],
);

/** Lançamentos que já aconteceram. Alimentam o saldo atual e a média de gastos variáveis. */
export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    kind: text("kind").notNull().$type<"income" | "expense">(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("transactions_kind", sql`${t.kind} in ('income','expense')`),
    check("transactions_amount", sql`${t.amountCents} > 0`),
  ],
);

/** O coração da projeção: tudo que se repete todo mês.
 *  Salário, aluguel, assinatura — e também parcelas, que são só uma
 *  recorrência com `endMonth` preenchido. */
export const recurrences = pgTable(
  "recurrences",
  {
    id: serial("id").primaryKey(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    kind: text("kind").notNull().$type<"income" | "expense">(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    dayOfMonth: integer("day_of_month").notNull().default(1),
    /** Sempre o dia 1 do mês em que começa. */
    startMonth: date("start_month").notNull(),
    /** Dia 1 do último mês em que ocorre. null = por tempo indeterminado. */
    endMonth: date("end_month"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("recurrences_kind", sql`${t.kind} in ('income','expense')`),
    check("recurrences_amount", sql`${t.amountCents} > 0`),
    check("recurrences_day", sql`${t.dayOfMonth} between 1 and 31`),
  ],
);

/** Linha única (id = 1). */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    /** Quanto você tinha na data de abertura. Ponto de partida do saldo. */
    openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
    openingDate: date("opening_date").notNull(),
    /** Quantos meses de histórico usar pra estimar o gasto variável. */
    lookbackMonths: integer("lookback_months").notNull().default(3),
    /** Se preenchido, substitui a estimativa automática de gasto variável. */
    variableOverrideCents: integer("variable_override_cents"),
    /** Horizonte padrão da projeção, em meses. */
    horizonMonths: integer("horizon_months").notNull().default(12),
  },
  (t) => [check("settings_singleton", sql`${t.id} = 1`)],
);

export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Recurrence = typeof recurrences.$inferSelect;
export type Settings = typeof settings.$inferSelect;
