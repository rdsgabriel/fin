/**
 * Popula o banco com um cenário de exemplo pra você ver o app cheio.
 *   npm run db:seed          -> insere os dados de exemplo
 *   npm run db:seed -- --clear  -> apaga TUDO (lançamentos, fixos, ajustes)
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const sql = neon(process.env.DATABASE_URL);
const clear = process.argv.includes("--clear");

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const Y = now.getFullYear();
const M = now.getMonth() + 1;

/** Deslocamento em meses a partir do mês corrente -> "YYYY-MM-01". */
function month(offset) {
  const t = Y * 12 + (M - 1) + offset;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}-01`;
}
function day(offset, d) {
  return month(offset).slice(0, 8) + pad(d);
}

await sql`delete from transactions`;
await sql`delete from recurrences`;

if (clear) {
  await sql`update settings set opening_balance_cents = 0, variable_override_cents = null where id = 1`;
  console.log("\n✓ Banco limpo.\n");
  process.exit(0);
}

const cats = await sql`select id, name from categories`;
const byName = Object.fromEntries(cats.map((c) => [c.name, c.id]));

await sql`update settings
  set opening_balance_cents = 320000, opening_date = ${day(0, 1)}, lookback_months = 3
  where id = 1`;

// Fixos que já existem há tempos.
const recs = [
  ["Salário", 450000, "income", "Salário", 5, month(-6), null],
  ["Aluguel", 160000, "expense", "Moradia", 10, month(-6), null],
  ["Internet", 12000, "expense", "Assinaturas", 15, month(-6), null],
  ["Academia", 9000, "expense", "Saúde", 8, month(-6), null],
  // Parcelas começando agora — é o que faz a projeção contar uma história.
  ["Sofá da sala", 38000, "expense", "Moradia", 12, month(0), month(7)],
  ["Notebook", 52000, "expense", "Outros", 20, month(0), month(4)],
];

for (const [desc, cents, kind, cat, d, start, end] of recs) {
  await sql`insert into recurrences
    (description, amount_cents, kind, category_id, day_of_month, start_month, end_month)
    values (${desc}, ${cents}, ${kind}, ${byName[cat] ?? null}, ${d}, ${start}, ${end})`;
}

// Três meses fechados de histórico: os fixos da época + gasto variável.
// A estimativa deve convergir pra ~R$ 900/mês de variável.
const variable = [
  ["Mercado", 32000, "Mercado", 3],
  ["Farmácia", 8000, "Saúde", 7],
  ["Uber", 11000, "Transporte", 11],
  ["Jantar fora", 14000, "Lazer", 18],
  ["Mercado", 25000, "Mercado", 22],
];

for (const offset of [-3, -2, -1]) {
  for (const [desc, cents, cat, d] of [
    ["Aluguel", 160000, "Moradia", 10],
    ["Internet", 12000, "Assinaturas", 15],
    ["Academia", 9000, "Saúde", 8],
    ...variable,
  ]) {
    await sql`insert into transactions (date, description, amount_cents, kind, category_id)
      values (${day(offset, d)}, ${desc}, ${cents}, 'expense', ${byName[cat] ?? null})`;
  }
  await sql`insert into transactions (date, description, amount_cents, kind, category_id)
    values (${day(offset, 5)}, 'Salário', 450000, 'income', ${byName["Salário"] ?? null})`;
}

console.log("\n✓ Cenário de exemplo criado.");
console.log("  saldo inicial R$ 3.200 · salário R$ 4.500 · fixos R$ 1.810");
console.log("  + sofá 8x R$ 380 e notebook 5x R$ 520\n");
