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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  /** scrypt: "<salt hex>:<hash hex>". Sem dependência externa. */
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  /** Token aleatório de 32 bytes que vai no cookie httpOnly. */
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    /**
     * Só para entradas CLT. Quem é registrado recebe ~13,33 salários por ano:
     * o 13º (metade em novembro, metade em dezembro) e o adicional de 1/3
     * constitucional sobre as férias. Ignorar isso subestima a projeção o ano
     * inteiro — e são justamente os meses em que dá pra quitar parcela.
     */
    thirteenth: boolean("thirteenth").notNull().default(false),
    /** Mês (1-12) em que você tira férias, pro adicional de 1/3. null = não usa. */
    vacationMonth: integer("vacation_month"),
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

/**
 * Metas são linha de chegada, não despesa.
 *
 * Guardar dinheiro NÃO é uma saída: o dinheiro continua seu, só muda de
 * bolso. Se a meta entrasse como recorrência de despesa, a projeção ficaria
 * pessimista na exata medida da sua disciplina. Então nada aqui altera o
 * cálculo do saldo — a meta só marca um alvo sobre a curva e muda a leitura
 * do mês ("guardando X, sobram Y pra viver").
 */
export const goals = pgTable(
  "goals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetCents: integer("target_cents").notNull(),
    /** Quanto você pretende separar por mês. Só enquadramento, não sai do saldo. */
    monthlyCents: integer("monthly_cents").notNull().default(0),
    /** Prazo desejado, opcional. Dia 1 do mês-alvo. */
    deadline: date("deadline"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("goals_target", sql`${t.targetCents} > 0`)],
);

/** Preferências e ponto de partida do saldo, por usuário. */
export const settings = pgTable("settings", {
  /** Uma linha por usuário — a chave primária é o próprio usuário. */
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Quanto você tinha na data de abertura. Ponto de partida do saldo. */
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  openingDate: date("opening_date").notNull(),
  /** Quantos meses de histórico usar pra estimar o gasto variável. */
  lookbackMonths: integer("lookback_months").notNull().default(3),
  /** Se preenchido, substitui a estimativa automática de gasto variável. */
  variableOverrideCents: integer("variable_override_cents"),
  /** Horizonte padrão da projeção, em meses. */
  horizonMonths: integer("horizon_months").notNull().default(12),
  /** Marca se a pessoa já passou pela tela de instalar o PWA. */
  installPrompted: boolean("install_prompted").notNull().default(false),
  /**
   * Rentabilidade anual do dinheiro parado, em pontos-base (1050 = 10,50% a.a.).
   * Inteiro pra não guardar float. 0 = parado na conta, sem render.
   */
  yieldAnnualBps: integer("yield_annual_bps").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Recurrence = typeof recurrences.$inferSelect;
export type Settings = typeof settings.$inferSelect;
