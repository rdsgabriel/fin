/**
 * Screenshots das telas pra revisão visual.
 *   npm run shots            -> light
 *   npm run shots -- dark    -> dark
 * Usa a conta de demonstração criada por `npm run db:seed`.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const scheme = process.argv.includes("dark") ? "dark" : "light";
const OUT = process.env.SHOTS_DIR || "./shots";
const BASE = "http://localhost:3000";
mkdirSync(OUT, { recursive: true });

const PUBLICAS = [
  ["entrar", "/entrar"],
  ["criar-conta", "/criar-conta"],
];
const PRIVADAS = [
  ["home", "/"],
  ["extrato", "/lancamentos"],
  ["fixos", "/fixos"],
  ["ajustes", "/ajustes"],
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  colorScheme: scheme,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  hasTouch: true,
  isMobile: true,
});

const page = await context.newPage();
const erros = [];
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
page.on("pageerror", (e) => erros.push(String(e)));

const tirar = async (nome, opts = {}) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${scheme}-${nome}.png`, ...opts });
  console.log(`  ✓ ${scheme}-${nome}.png`);
};

for (const [nome, path] of PUBLICAS) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await tirar(nome, { fullPage: true });
}

// Login com a conta de demonstração.
await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.locator('input[name="email"]').fill("demo@fin.app");
await page.locator('input[name="senha"]').fill("demo1234");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });

for (const [nome, path] of PRIVADAS) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await tirar(nome, { fullPage: true });
}

// Viewport real, pra conferir o dock sem o artefato do fullPage.
await page.goto(BASE, { waitUntil: "networkidle" });
await tirar("viewport");

// A folha de "novo lançamento" só existe depois do toque no +.
await page.goto(`${BASE}/lancamentos`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /novo lançamento/i }).click();
await tirar("sheet");

await browser.close();

if (erros.length) {
  console.log("\n⚠ erros no console:");
  for (const e of [...new Set(erros)].slice(0, 10)) console.log("   " + e);
} else {
  console.log("\n✓ nenhum erro de console");
}
