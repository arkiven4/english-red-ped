// Shared helpers for the browser tests (Playwright with the system Chromium).
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "..");
const PORT = 8000;
const BASE = `http://localhost:${PORT}/`;

async function serve() {
  const p = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE); return p; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error("server did not start");
}
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM || "/usr/bin/chromium" });

// Phone-sized context; collects console errors.
async function phone(browser, { dark = false, storage, sw = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", serviceWorkers: sw ? "allow" : "block" });
  if (storage) await ctx.addInitScript(s => { if (!localStorage.getItem("redpen.v1")) localStorage.setItem("redpen.v1", s); }, JSON.stringify(storage));
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  return { ctx, page };
}

// Answer the current question through the UI, right or wrong.
async function answer(page, ok) {
  const q = await page.evaluate(() => { const c = window.__redpen.L.cur; return { ...c.q, tiles: c.tiles, words: c.words, wrongIdx: c.wrongIdx }; });
  const click = sel => page.locator(sel).click();
  if (q.type === "fill") {
    const label = o => o === "—" ? "(no word)" : o;
    const opts = await page.locator(".choices .choice").allTextContents();
    const want = ok ? label(q.answer) : opts.find(o => o !== label(q.answer));
    await page.locator(".choices .choice").filter({ hasText: new RegExp("^\\s*" + want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$") }).first().click();
  } else if (q.type === "order") {
    const toks = q.answer.split(/\s+/).map((w, i, a) => i === a.length - 1 && !/[ap]\.m\.$/.test(w) ? w.replace(/[.?!]+$/, "") : w).map(w => w.replace(/,$/, ""));
    const free = q.tiles.map((t, i) => i), seq = [];
    for (const t of toks) { const k = free.findIndex(i => q.tiles[i].toLowerCase() === t.toLowerCase()); seq.push(free[k]); free.splice(k, 1); }
    if (!ok) seq.reverse();
    for (const i of seq) await page.locator(".pool .tile").nth(i).click();
  } else if (q.type === "spot") {
    if (ok && q.correct) await click(".nomistake");
    else if (ok) {
      await page.locator(".words .word").nth(q.wrongIdx).click(); await click("#check");
      await page.locator(".choices .choice", { hasText: q.fix === "—" ? "(no word)" : q.fix }).first().click();
    } else if (q.correct) await page.locator(".words .word").first().click();
    else await click(".nomistake");
  } else if (q.type === "rewrite") {
    await page.fill("#rw", ok ? q.answer : "This is not it at all");
  }
  await click("#check");
  await click("#continue");
}

// Play one lesson (or practice mix) to the end, answering right except where wrongAt says otherwise.
async function playLesson(page, { wrongAt = [] } = {}) {
  let i = 0;
  while (await page.locator("#check").count()) { await answer(page, !wrongAt.includes(i)); i++; if (i > 40) throw new Error("lesson did not end"); }
  await page.getByRole("button", { name: "Continue" }).click();
  return i;
}

module.exports = { ROOT, BASE, serve, launch, phone, answer, playLesson };
