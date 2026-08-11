import { webkit, chromium } from "playwright";
const OUT = process.env.SHOTS_DIR;

for (const [nome, engine] of [["webkit", webkit], ["chromium", chromium]]) {
  const b = await engine.launch();
  const ctx = await b.newContext({
    viewport: { width: 1200, height: 900 }, colorScheme: "dark",
    locale: "pt-BR", timezoneId: "America/Sao_Paulo",
  });
  const p = await ctx.newPage();
  const probs = [];
  p.on("pageerror", e => probs.push("JS: " + e));
  p.on("response", r => r.status() >= 400 && probs.push(r.status() + " " + r.url()));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);

  const info = await p.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const card = document.querySelector("section.material");
    const bar = document.querySelector('[style*="width"][style*="background"]');
    const linha = document.querySelector("svg path[stroke]");
    let regras = 0, quebradas = [];
    for (const s of document.styleSheets) {
      try { regras += s.cssRules.length } catch { quebradas.push("CORS") }
    }
    return {
      regras,
      brand: root.getPropertyValue("--brand").trim(),
      mat: root.getPropertyValue("--mat").trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      cardBg: card && getComputedStyle(card).backgroundColor,
      cardRadius: card && getComputedStyle(card).borderRadius,
      cardPad: card && getComputedStyle(card).padding,
      barBg: bar && getComputedStyle(bar).backgroundColor,
      barW: bar && getComputedStyle(bar).width,
      strokeAttr: linha && linha.getAttribute("stroke"),
      strokeComputed: linha && getComputedStyle(linha).stroke,
    };
  });
  console.log("=== " + nome + " ===");
  console.log(JSON.stringify(info, null, 1));
  if (probs.length) console.log("problemas:", [...new Set(probs)].slice(0,5));
  await p.screenshot({ path: `${OUT}/${nome}-dark-desktop.png`, fullPage: false });
  await b.close();
}
