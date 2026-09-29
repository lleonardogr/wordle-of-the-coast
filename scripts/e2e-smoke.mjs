#!/usr/bin/env node
/**
 * Teste de fumaça ponta-a-ponta com Chromium headless (Playwright).
 *
 * Por que este script existe: a automação de navegador do Claude Code
 * (claude-in-chrome) não respondeu neste ambiente de desenvolvimento, então
 * a verificação visual real do jogo foi feita assim — abrindo a página com
 * um Chromium de verdade, simulando digitação/cliques, e lendo screenshots.
 * Isso já pegou 3 bugs reais que os testes de lógica pura não pegavam:
 * símbolos de mana crus ({W}{U}), tamanho de peça errado para nomes longos
 * sem vírgula, e subtipo não revelado ao fim da partida. Ver docs/TESTING.md.
 *
 * Uso:
 *   npx playwright install chromium   # uma vez, baixa o binário do Chromium
 *   npm run test:e2e                                    # contra localhost:8123
 *   node scripts/e2e-smoke.mjs https://lleonardogr.github.io/wordle-mtg/  # contra prod
 *
 * Roda: npm run serve (num terminal separado) antes de testar localmente.
 */

import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.argv[2] || "http://localhost:8123/";
const OUT = path.join(ROOT, "e2e-screenshots");

const { dailyIndex, targetNameForMode, stripDiacritics } = await import(
  path.join(ROOT, "js/gameLogic.js")
);

function fail(label, condition) {
  if (!condition) throw new Error(`FALHOU: ${label}`);
  console.log(`  ok: ${label}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const data = JSON.parse(await readFile(path.join(ROOT, "data/cards.json"), "utf8"));
  const card = data.cards[dailyIndex(data.cards.length)];
  const easyTarget = targetNameForMode(card, "easy");
  const easyLetters = stripDiacritics(easyTarget).toUpperCase().replace(/[^A-Z]/g, "");
  console.log(`Carta do dia: ${card.name} (alvo fácil: "${easyTarget}")`);

  const browser = await chromium.launch();
  const errors = [];

  // ---- Cenário 1: carregamento inicial + tentativa errada (modo fácil) ----
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[load] ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`[load] pageerror: ${e.message}`));

    console.log("\n== Cenário 1: carregamento + tentativa errada ==");
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("#board .row", { timeout: 15000 });
    await page.screenshot({ path: `${OUT}/01-initial-easy.png`, fullPage: true });

    const glen = await page.evaluate(
      () => document.querySelectorAll("#board .row")[0].querySelectorAll(".t:not(.fix)").length
    );
    fail("tamanho do alvo fácil bate com gameLogic", glen === easyLetters.length);

    await page.keyboard.type("A".repeat(glen));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/02-after-wrong-guess.png`, fullPage: true });

    const hintsProgress = await page.textContent("#hintsProgress");
    fail("dica avança após 1 tentativa", /Dica 1/.test(hintsProgress));

    await page.click("#bHard");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/03-hard-mode.png`, fullPage: true });

    await page.close();
  }

  // ---- Cenário 2: vitória (modo fácil) ----
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[win] ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`[win] pageerror: ${e.message}`));

    console.log("\n== Cenário 2: vitória (modo fácil) ==");
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("#board .row");
    await page.keyboard.type(easyLetters);
    await page.keyboard.press("Enter");
    await page.waitForSelector("#artBox img", { timeout: 5000 });
    // A imagem vem de um CDN externo (cards.scryfall.io) — esperar o
    // evento de load real em vez de um timeout fixo, que era instável.
    await page.waitForFunction(
      () => document.querySelector("#artBox img")?.complete,
      { timeout: 10000 }
    );
    await page.screenshot({ path: `${OUT}/04-win-state.png`, fullPage: true });

    const meta = await page.textContent("#meta");
    fail("mensagem de vitória", /Acertou em/.test(meta));

    const resultVisible = await page.evaluate(() => !document.getElementById("resultPanel").hidden);
    fail("painel de resultado visível", resultVisible);

    const msCount = await page.evaluate(() => document.querySelectorAll(".ms").length);
    fail("símbolos de mana renderizados como pastilhas (.ms)", msCount > 0);

    const typeLineHasQuestionMark = await page.evaluate(
      () => document.getElementById("typeLine").textContent.includes("?")
    );
    fail("subtipo revelado ao fim (sem '?' residual)", !typeLineHasQuestionMark);

    const artInfo = await page.evaluate(() => {
      const img = document.querySelector("#artBox img");
      return img ? { naturalWidth: img.naturalWidth, complete: img.complete } : null;
    });
    fail("arte da carta carregou", !!artInfo && artInfo.complete && artInfo.naturalWidth > 0);

    await page.close();
  }

  // ---- Cenário 3: derrota (modo difícil) + persistência após reload ----
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[loss] ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`[loss] pageerror: ${e.message}`));

    console.log("\n== Cenário 3: derrota (modo difícil) + persistência ==");
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("#board .row");
    await page.click("#bHard");
    await page.waitForTimeout(150);

    const glenHard = await page.evaluate(
      () => document.querySelectorAll("#board .row")[0].querySelectorAll(".t:not(.fix)").length
    );
    for (let i = 0; i < 8; i++) {
      await page.keyboard.type("Q".repeat(glenHard));
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
    }
    await page.screenshot({ path: `${OUT}/05-loss-state.png`, fullPage: true });

    const meta = await page.textContent("#meta");
    fail("mensagem de tentativas esgotadas", /esgotadas/.test(meta));

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#board .row");
    // A página sempre abre na aba fácil por padrão — precisa voltar para o
    // difícil antes de checar se o progresso daquele modo foi preservado.
    await page.click("#bHard");
    await page.waitForTimeout(150);
    const metaAfterReload = await page.textContent("#meta");
    fail("estado de derrota (difícil) persiste após reload", /esgotadas/.test(metaAfterReload));

    await page.close();
  }

  await browser.close();

  console.log(`\nScreenshots salvos em ${OUT}/`);
  if (errors.length) {
    console.log(`\n${errors.length} erro(s) de console/página capturado(s):`);
    errors.forEach((e) => console.log("  -", e));
    process.exitCode = 1;
  } else {
    console.log("\nNenhum erro de console. Todas as verificações passaram.");
  }
}

main().catch((err) => {
  console.error("\n" + err.message);
  process.exitCode = 1;
});
