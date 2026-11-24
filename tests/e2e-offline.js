// The app without signing in: old saves migrate, lessons record progress, nothing loads Firebase.
// Run: node tests/e2e-offline.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { BASE, serve, launch, phone, playLesson } = require("./helpers");

const day = (k = 0) => { const d = new Date(Date.now() + k * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const V1 = { v: 1, topics: { be_verb: { m: 72, n: 40, c: 30 } }, unlocked: ["be_verb", "articles"], srs: {}, recent: [], xp: 500, day: day(-1), dayCorrect: 4,
  goal: 10, streak: 3, lastLesson: day(-1), lessons: 12, answered: 60, right: 45, theme: "light", themeChosen: true, modeStats: { fill: { n: 30, c: 25 } } };

(async () => {
  const server = await serve(), browser = await launch();
  try {
    for (const dark of [false, true]) {
      const { ctx, page } = await phone(browser, { dark, storage: V1 });
      const firebase = [];
      page.on("request", r => { if (/firebasejs|googleapis\.com\/identitytoolkit|firestore/.test(r.url()) || /sync\.js$/.test(r.url())) firebase.push(r.url()); });
      if (dark) await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem("redpen.v1")); s.theme = "dark"; localStorage.setItem("redpen.v1", JSON.stringify(s)); });
      await page.goto(BASE + "?test");
      await page.waitForFunction(() => window.__redpen && !document.querySelector(".home-cta .btn[disabled]"));

      // migration: totals and streak survive
      assert.equal((await page.locator(".stat.xp").textContent()).trim(), "500");
      assert.equal((await page.locator(".stat.streak").textContent()).trim(), "3");
      const s0 = await page.evaluate(() => window.__redpen.S);
      assert.equal(s0.v, 2); assert.equal(s0.cnt.legacy.xp, 500); assert.deepEqual(s0.days, [day(-3), day(-2), day(-1)]);

      // a lesson with two wrong answers
      await page.locator(".home-cta .btn").click();
      const n = await playLesson(page, { wrongAt: [1, 4] });
      const s1 = await page.evaluate(() => window.__redpen.S);
      const dev = Object.keys(s1.cnt).find(k => k !== "legacy");
      assert.ok(dev, "this device has its own counters");
      assert.equal(s1.answered, 72, "12 first answers counted"); assert.equal(s1.cnt[dev].answered, 12);
      assert.equal(s1.right, 55); assert.equal(s1.lessons, 13);
      assert.equal(s1.streak, 4); assert.equal(s1.lastLesson, day());
      assert.equal(s1.dayCorrect, n - 2, "yesterday's correct answers reset; today's counted (retries too)");
      const mistakes = Object.values(s1.srs);
      assert.ok(mistakes.length >= 1 && mistakes.every(e => typeof e.t === "number" && e.t > 0), "mistakes carry a change time");
      assert.equal(s1.xp, 500 + s1.cnt[dev].xp);
      assert.equal((await page.locator(".stat.xp").textContent()).trim(), String(s1.xp));

      // Progress: cloud card shows sign-in button (if config present) without loading Firebase SDK; no horizontal scroll
      await page.getByRole("button", { name: "Progress", exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal scroll");
      await page.screenshot({ path: path.join(os.tmpdir(), `redpen-progress-${dark ? "dark" : "light"}.png`), fullPage: true });

      // settings carry a change time
      await page.locator(".seg button", { hasText: /^20$/ }).click();
      const s2 = await page.evaluate(() => window.__redpen.S);
      assert.equal(s2.goal, 20); assert.ok(s2.ts.goal > 0);

      // import an old v1 backup, then reset
      const f = path.join(os.tmpdir(), "redpen-v1-backup.json"); fs.writeFileSync(f, JSON.stringify(V1));
      await page.locator("input[type=file]").setInputFiles(f);
      await page.waitForFunction(() => window.__redpen.S.xp === 500);
      await page.getByRole("button", { name: "Reset all progress" }).click();
      await page.getByRole("button", { name: "Delete everything" }).click();
      const s3 = await page.evaluate(() => window.__redpen.S);
      assert.equal(s3.xp, 0); assert.equal(s3.epoch, 1);

      // offline still works
      await ctx.setOffline(true);
      await page.getByRole("button", { name: "Learn" }).click();
      await page.locator(".home-cta .btn").click();
      await playLesson(page);
      assert.ok((await page.evaluate(() => window.__redpen.S.xp)) > 0);

      assert.deepEqual(firebase, [], "Firebase is never loaded without sign-in");
      assert.deepEqual(page.errors, [], "no console errors");
      await ctx.close();
      console.log(`ok offline app (${dark ? "dark" : "light"})`);
    }
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
