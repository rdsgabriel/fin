/**
 * Percorre o fluxo inteiro num browser real: criar conta → instalar PWA →
 * onboarding → home, e confere os números. No fim testa o isolamento entre
 * contas, que é o ponto onde um bug custaria caro.
 *   npm run e2e
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const email = `teste-${Date.now()}@fin.app`;
const SENHA = "teste12345";

const b = await chromium.launch();
const falhas = [];
const checar = (nome, real, esperado) => {
  const ok = String(real) === String(esperado);
  if (!ok) falhas.push(`${nome}: esperado "${esperado}", veio "${real}"`);
  console.log(`  ${ok ? "✓" : "✗"} ${nome}: ${real}`);
};

// Contexto de celular: no desktop a tela de instalação é pulada de propósito.
async function novaAba() {
  const ctx = await b.newContext({
    viewport: { width: 393, height: 852 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Mobile Safari/537.36",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    hasTouch: true,
    isMobile: true,
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => falhas.push("JS: " + e));
  return { ctx, p };
}

const { ctx, p } = await novaAba();
const tap = async (n) => {
  await p.getByRole("button", { name: n, exact: true }).click();
  await p.waitForTimeout(70);
};

console.log("\n1. criar conta");
await p.goto(`${BASE}/criar-conta`, { waitUntil: "networkidle" });
await p.locator('input[name="email"]').fill(email);
await p.locator('input[name="senha"]').fill(SENHA);
await p.getByRole("button", { name: /Criar minha conta/ }).click();

await p.waitForURL("**/instalar", { timeout: 15000 });
checar("cai em /instalar", new URL(p.url()).pathname, "/instalar");

console.log("\n2. tela de instalar o PWA");
await p.waitForTimeout(700);
await p.getByRole("button", { name: /Seguir no navegador/ }).click();
await p.waitForURL("**/comecar", { timeout: 15000 });
checar("cai em /comecar", new URL(p.url()).pathname, "/comecar");

console.log("\n3. onboarding");
await p.waitForTimeout(400);
for (const d of "320000") await tap(d); // saldo 3.200,00
await p.getByRole("button", { name: "Continuar" }).click();
await p.waitForTimeout(250);

for (const d of "450000") await tap(d); // renda 4.500,00
await p.getByRole("button", { name: "Continuar" }).click();
await p.waitForTimeout(250);

await p.getByRole("button", { name: "+ Aluguel" }).click();
await p.getByRole("button", { name: "+ Internet" }).click();
const vals = p.locator('input[placeholder="R$ 0,00"]');
await vals.nth(0).fill("160000");
await vals.nth(1).fill("12000");
await p.getByRole("button", { name: "Continuar" }).click();
await p.waitForTimeout(250);

await p.getByRole("button", { name: "+ Adicionar parcela" }).click();
await p.locator('input[placeholder="O que foi? (sofá, celular…)"]').fill("Sofá");
await p.locator('input[placeholder="Valor da parcela"]').fill("38000");
for (let i = 0; i < 4; i++) await p.getByRole("button", { name: "Menos parcelas" }).click();
await p.getByRole("button", { name: "Continuar" }).click();
await p.waitForTimeout(250);

for (const d of "90000") await tap(d); // variável 900,00
await p.getByRole("button", { name: "Continuar" }).click();
await p.waitForTimeout(300);

for (const d of "50000") await tap(d); // guardar 500,00 por mês
await p.getByRole("button", { name: "Continuar" }).click();
await p.waitForTimeout(700);

const revelado = (await p.locator("p.display").first().textContent())?.trim();
await p.getByRole("button", { name: "Abrir meu app" }).click();
await p.waitForURL(`${BASE}/`, { timeout: 15000 });
await p.waitForTimeout(1000);

console.log("\n4. home");
/* Intl.NumberFormat('pt-BR') separa "R$" do número com espaço não-quebrável
   (U+00A0), não com espaço comum — sem normalizar, nenhuma comparação bate. */
const normaliza = (s) => s.replace(/ /g, " ");
const corpo = normaliza(await p.locator("body").innerText());
const tem = (s) => (corpo.includes(s) ? s : `FALTOU (${s})`);

/* 4.500 de entrada − (1.600 + 120 + 380 de parcela) − 900 variável = 1.500 */
checar("saldo de hoje", tem("R$ 3.200,00"), "R$ 3.200,00");
checar("entradas", tem("R$ 4.500,00"), "R$ 4.500,00");
checar("sobra por mês", tem("R$ 1.500,00"), "R$ 1.500,00");
checar("gasto variável", tem("R$ 900,00"), "R$ 900,00");
checar("marco da parcela", tem("Sofá quitado"), "Sofá quitado");
checar("meta criada", tem("Reserva de emergência"), "Reserva de emergência");
/* teto = 4.500 − (1.600 + 120 + 380) − 500 guardados = 1.900 */
checar("pode gastar (já sem o que guarda)", tem("R$ 1.900,00"), "R$ 1.900,00");
console.log(`  · revelado no onboarding: ${revelado}`);

console.log("\n5. isolamento entre contas");
const { ctx: ctx2, p: p2 } = await novaAba();
const outro = `outro-${Date.now()}@fin.app`;
await p2.goto(`${BASE}/criar-conta`, { waitUntil: "networkidle" });
await p2.locator('input[name="email"]').fill(outro);
await p2.locator('input[name="senha"]').fill(SENHA);
await p2.getByRole("button", { name: /Criar minha conta/ }).click();
await p2.waitForURL("**/instalar", { timeout: 15000 });
await p2.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p2.waitForTimeout(800);
const corpo2 = normaliza(await p2.locator("body").innerText());
checar(
  "conta nova não vê dados da outra",
  corpo2.includes("R$ 3.200,00") ? "VAZOU" : "isolada",
  "isolada",
);

console.log("\n6. rota protegida sem sessão");
const anon = await b.newContext();
const pa = await anon.newPage();
await pa.goto(`${BASE}/ajustes`, { waitUntil: "networkidle" });
checar("sem login vai pro /entrar", new URL(pa.url()).pathname, "/entrar");

await ctx.close();
await ctx2.close();
await anon.close();
await b.close();

if (falhas.length) {
  console.log("\n✗ falhou:\n  " + falhas.join("\n  ") + "\n");
  process.exit(1);
}
console.log("\n✓ fluxo completo passou\n");
