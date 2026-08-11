/**
 * Cria/atualiza o schema. Idempotente: pode rodar quantas vezes quiser,
 * tanto num banco vazio quanto num que já tem dados.
 *   npm run db:setup
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
  `create table if not exists users (
     id serial primary key,
     email text not null unique,
     password_hash text not null,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists sessions (
     token text primary key,
     user_id integer not null references users(id) on delete cascade,
     expires_at timestamptz not null,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists sessions_user_idx on sessions (user_id)`,

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
     opening_balance_cents integer not null default 0,
     opening_date date not null default current_date,
     lookback_months integer not null default 3,
     variable_override_cents integer,
     horizon_months integer not null default 12
   )`,

  // --- Multi-usuário: colunas adicionadas depois, então vão por ALTER. ---
  `alter table categories add column if not exists user_id integer
     references users(id) on delete cascade`,
  `alter table transactions add column if not exists user_id integer
     references users(id) on delete cascade`,
  `alter table recurrences add column if not exists user_id integer
     references users(id) on delete cascade`,
  `alter table settings add column if not exists user_id integer
     references users(id) on delete cascade`,
  `alter table settings add column if not exists install_prompted boolean
     not null default false`,
  `alter table recurrences add column if not exists thirteenth boolean
     not null default false`,
  `alter table recurrences add column if not exists vacation_month integer`,
  `alter table settings add column if not exists yield_annual_bps integer
     not null default 0`,
  `alter table recurrences drop constraint if exists recurrences_vacation`,
  `alter table recurrences add constraint recurrences_vacation
     check (vacation_month is null or vacation_month between 1 and 12)`,

  `create table if not exists goals (
     id serial primary key,
     user_id integer not null references users(id) on delete cascade,
     name text not null,
     target_cents integer not null,
     monthly_cents integer not null default 0,
     deadline date,
     created_at timestamptz not null default now(),
     constraint goals_target check (target_cents > 0)
   )`,
  `create index if not exists goals_user_idx on goals (user_id)`,

  `create index if not exists categories_user_idx on categories (user_id)`,
  `create index if not exists transactions_user_idx on transactions (user_id, date desc)`,
  `create index if not exists recurrences_user_idx on recurrences (user_id)`,
];

/* A tabela `settings` nasceu como linha única com `id = 1`. Agora é uma
   linha por usuário, então a coluna e a checagem antigas precisam sair —
   e só depois disso `user_id` pode virar chave primária. */
const migrations = [
  `alter table settings drop constraint if exists settings_singleton`,
  `alter table settings drop constraint if exists settings_pkey`,
  `alter table settings drop column if exists id`,
  `delete from settings where user_id is null`,
  `create unique index if not exists settings_user_key on settings (user_id)`,
];

try {
  for (const stmt of statements) await sql.query(stmt);
  for (const stmt of migrations) await sql.query(stmt);

  // Dados antigos (de antes do login) não pertencem a ninguém: sem dono, o
  // app não conseguiria mostrá-los mesmo. Melhor limpar do que deixar lixo.
  const orfaos = await sql`
    select
      (select count(*) from categories where user_id is null)::int as c,
      (select count(*) from transactions where user_id is null)::int as t,
      (select count(*) from recurrences where user_id is null)::int as r`;
  const { c, t, r } = orfaos[0];
  if (c + t + r > 0) {
    await sql`delete from transactions where user_id is null`;
    await sql`delete from recurrences where user_id is null`;
    await sql`delete from categories where user_id is null`;
    console.log(`  ✓ ${c + t + r} registros sem dono removidos (pré-login)`);
  }

  console.log("\n✓ Banco pronto.");
  console.log("  As categorias padrão agora são criadas junto com cada conta.\n");
} catch (err) {
  console.error("\n✗ Falhou:", err.message, "\n");
  process.exit(1);
}
