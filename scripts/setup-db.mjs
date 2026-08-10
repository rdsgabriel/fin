/**
 * Cria as tabelas e semeia categorias padrão.
 * Roda com: npm run db:setup   (idempotente, pode rodar quantas vezes quiser)
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* arquivo não existe, tudo bem */
  }
}

if (!process.env.DATABASE_URL) {
  console.error("\n✗ DATABASE_URL não encontrada. Crie um .env com a string do Neon.\n");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `create table if not exists categories (
     id serial primary key,
     name text not null,
     kind text not null,
     color text not null default '#8E8E93',
     constraint categories_kind check (kind in ('income','expense'))
   )`,
  `create table if not exists transactions (
     id serial primary key,
     date date not null,
     description text not null,
     amount_cents integer not null,
     kind text not null,
     category_id integer references categories(id) on delete set null,
     created_at timestamptz not null default now(),
     constraint transactions_kind check (kind in ('income','expense')),
     constraint transactions_amount check (amount_cents > 0)
   )`,
  `create index if not exists transactions_date_idx on transactions (date desc)`,
  `create table if not exists recurrences (
     id serial primary key,
     description text not null,
     amount_cents integer not null,
     kind text not null,
     category_id integer references categories(id) on delete set null,
     day_of_month integer not null default 1,
     start_month date not null,
     end_month date,
     active boolean not null default true,
     created_at timestamptz not null default now(),
     constraint recurrences_kind check (kind in ('income','expense')),
     constraint recurrences_amount check (amount_cents > 0),
     constraint recurrences_day check (day_of_month between 1 and 31)
   )`,
  `create table if not exists settings (
     id integer primary key default 1,
     opening_balance_cents integer not null default 0,
     opening_date date not null default current_date,
     lookback_months integer not null default 3,
     variable_override_cents integer,
     horizon_months integer not null default 12,
     constraint settings_singleton check (id = 1)
   )`,
  `insert into settings (id) values (1) on conflict (id) do nothing`,
];

const seedCategories = [
  ["Salário", "income", "#34C759"],
  ["Freela / Extra", "income", "#30D158"],
  ["Moradia", "expense", "#FF9500"],
  ["Mercado", "expense", "#FF375F"],
  ["Transporte", "expense", "#5E5CE6"],
  ["Saúde", "expense", "#FF2D55"],
  ["Lazer", "expense", "#BF5AF2"],
  ["Assinaturas", "expense", "#0A84FF"],
  ["Educação", "expense", "#64D2FF"],
  ["Outros", "expense", "#8E8E93"],
];

try {
  // `sql` só aceita tagged template; DDL sem parâmetros vai por sql.query.
  for (const stmt of statements) await sql.query(stmt);

  const [{ count }] = await sql`select count(*)::int as count from categories`;
  if (count === 0) {
    for (const [name, kind, color] of seedCategories) {
      await sql`insert into categories (name, kind, color) values (${name}, ${kind}, ${color})`;
    }
    console.log(`  ✓ ${seedCategories.length} categorias padrão criadas`);
  }

  console.log("\n✓ Banco pronto.\n");
} catch (err) {
  console.error("\n✗ Falhou:", err.message, "\n");
  process.exit(1);
}
