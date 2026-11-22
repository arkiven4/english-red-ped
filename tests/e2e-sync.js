// Three devices (phone, laptop, PC) sign in to the same Google account, practice offline, come back online:
// progress must merge with nothing lost and today must count once in the streak.
// Needs the Firebase emulators: run through `npm run e2e` in tests/ (firebase emulators:exec).
const assert = require("node:assert/strict");
const { BASE, serve, launch, phone, playLesson } = require("./helpers");

const URL = BASE + "?test&emu";
const EMAIL = "learner@example.com";
const day = (k = 0) => { const d = new Date(Date.now() + k * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
// The phone has months of progress from before sync existed.
const PHONE_V1 = { v: 1, topics: { be_verb: { m: 80, n: 50, c: 42 }, articles: { m: 40, n: 10, c: 5 } }, unlocked: ["be_verb", "articles"],
  srs: { oldmistake: { box: 1, due: Date.now() - 36e5 } }, recent: [], xp: 900, day: day(-1), dayCorrect: 3, goal: 10, streak: 5, lastLesson: day(-1),
  lessons: 20, answered: 240, right: 190, theme: "light", themeChosen: true, modeStats: { fill: { n: 100, c: 80 } } };

const S = page => page.evaluate(() => window.__redpen.S);
const status = page => page.locator(".sync-status").getAttribute("class");
async function waitSynced(page, after = 0) {
  await page.waitForFunction(a => { const el = document.querySelector(".sync-status"); return el && el.classList.contains("synced") && +localStorage.getItem("redpen.synced") > a; }, after, { timeout: 30000 });
}
async function openProgress(page) { await page.getByRole("button", { name: "Progress", exact: true }).click(); await page.locator(".card.cloud").waitFor(); }

async function signIn(page, first) {
  await openProgress(page);
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Sign in with Google" }).click()]);
  await popup.waitForLoadState();
  if (first) {
    await popup.getByText("Add new account").click();
    await popup.locator("#email-input").fill(EMAIL);
    await popup.locator("#display-name-input").fill("Learner");
    await popup.locator("#sign-in").click();
  } else {
    await popup.getByText(EMAIL).first().click();
  }
  await waitSynced(page);
}

(async () => {
  const server = await serve(), browser = await launch();
  try {
    const devs = {};
    devs.phone = await phone(browser, { storage: PHONE_V1 });
    devs.laptop = await phone(browser);
    devs.pc = await phone(browser, { sw: true });
    for (const d of Object.values(devs)) { await d.page.goto(URL); await d.page.waitForFunction(() => window.__redpen && !document.querySelector(".home-cta .btn[disabled]")); }

    // Laptop practices before ever signing in (local-only progress must survive the first sign-in merge).
    await devs.laptop.page.locator(".home-cta .btn").click();
    await playLesson(devs.laptop.page, { wrongAt: [0] });
    const laptopLocal = await S(devs.laptop.page);

    // First sign-in: phone creates the cloud copy, laptop merges its local progress, PC downloads.
    await signIn(devs.phone.page, true);
    await signIn(devs.laptop.page, false);
    await signIn(devs.pc.page, false);
    await devs.phone.page.getByRole("button", { name: "Sync now" }).click(); await waitSynced(devs.phone.page, Date.now() - 1);
    const p0 = await S(devs.phone.page), c0 = await S(devs.pc.page);
    assert.equal(p0.xp, 900 + laptopLocal.xp, "phone sees laptop's local progress after sync");
    assert.equal(c0.xp, 900 + laptopLocal.xp, "PC downloads everything");
    assert.equal(c0.streak, 6, "5 old days + today on the laptop");
    assert.ok(c0.srs.oldmistake, "old mistakes reach the PC");
    console.log("ok first sign-in merges local and cloud data on all three devices");
    await openProgress(devs.phone.page); await devs.phone.page.locator(".card.cloud").screenshot({ path: require("node:os").tmpdir() + "/redpen-cloud-synced.png" });

    // PC: reload offline. The service worker serves the app and the cached Firebase SDK; the user stays signed in.
    await devs.pc.ctx.setOffline(true);
    await devs.pc.page.reload();
    await devs.pc.page.waitForFunction(() => window.__redpen && !document.querySelector(".home-cta .btn[disabled]"));
    await openProgress(devs.pc.page);
    await devs.pc.page.waitForFunction(() => document.querySelector(".sync-status.offline"), null, { timeout: 15000 });
    assert.match(await devs.pc.page.locator(".sync-status").textContent(), /Offline/);
    await devs.pc.page.locator(".card.cloud").screenshot({ path: require("node:os").tmpdir() + "/redpen-cloud-offline.png" });
    await devs.pc.page.getByRole("button", { name: "Learn" }).click();
    console.log("ok signed-in app opens offline and shows a calm offline status");

    // All three go offline and practice different things.
    await devs.phone.ctx.setOffline(true); await devs.laptop.ctx.setOffline(true);
    const before = await S(devs.pc.page);
    const wrong = { phone: [2, 5], laptop: [1], pc: [0, 3, 7] };
    for (const [name, d] of Object.entries(devs)) {
      await d.page.getByRole("button", { name: "Learn" }).click();
      await d.page.locator(".home-cta .btn").click();
      await playLesson(d.page, { wrongAt: wrong[name] });
    }
    await devs.laptop.page.getByRole("button", { name: "Practice" }).click();
    await devs.laptop.page.getByRole("button", { name: "Weak-spot mix" }).click();
    await playLesson(devs.laptop.page);
    // settings: phone changes the goal first, laptop later → laptop's wins everywhere
    await openProgress(devs.phone.page); await devs.phone.page.locator(".seg button", { hasText: /^5$/ }).click();
    await new Promise(r => setTimeout(r, 20));
    await openProgress(devs.laptop.page); await devs.laptop.page.locator(".seg button", { hasText: /^30$/ }).click();
    const offline = {};
    for (const [name, d] of Object.entries(devs)) offline[name] = await S(d.page);
    for (const d of Object.values(devs)) assert.deepEqual(d.page.errors, [], "no console errors while offline");

    // Back online: each syncs (online event), then a second round so everyone has everything.
    for (const d of Object.values(devs)) { const t = Date.now(); await d.ctx.setOffline(false); await openProgress(d.page); await waitSynced(d.page, t); }
    for (const d of Object.values(devs)) { const t = Date.now(); await d.page.getByRole("button", { name: "Sync now" }).click(); await waitSynced(d.page, t); }

    const fin = {};
    for (const [name, d] of Object.entries(devs)) fin[name] = await S(d.page);
    const strip = s => { const o = JSON.parse(JSON.stringify(s)); delete o.recent; return o; };
    assert.deepEqual(strip(fin.laptop), strip(fin.phone), "laptop = phone");
    assert.deepEqual(strip(fin.pc), strip(fin.phone), "PC = phone");

    const gained = k => Object.values(offline).reduce((a, s) => a + s[k] - before[k], 0);
    const f = fin.phone;
    assert.equal(f.xp, before.xp + gained("xp"), "XP from all three devices adds up");
    assert.equal(f.answered, before.answered + gained("answered"), "answers add up");
    assert.equal(f.right, before.right + gained("right"));
    assert.equal(f.lessons, before.lessons + gained("lessons"));
    assert.equal(f.streak, 6, "today counts once, however many devices");
    assert.equal(f.days.filter(x => x === day()).length, 1);
    assert.equal(f.goal, 30, "latest settings change wins");
    for (const [name, s] of Object.entries(offline)) for (const id of Object.keys(s.srs)) {
      const kept = f.srs[id] || f.srsDone[id];
      assert.ok(kept, `${name}'s mistake ${id} is kept (or graduated)`);
    }
    for (const [name, s] of Object.entries(offline)) for (const [id, t] of Object.entries(s.topics))
      assert.ok(f.topics[id].n >= t.n, `${name}'s topic ${id} not reduced`);
    let today = 0;
    for (const [name, d] of Object.entries(devs)) { const id = await d.page.evaluate(() => localStorage.getItem("redpen.dev")); today += (offline[name].dayCnt[id] || {}).n || 0; }
    assert.equal(f.dayCorrect, today, "scroll pass counts today's correct answers from all devices");
    console.log(`ok three devices offline → merged: xp ${f.xp}, answers ${f.answered}, streak ${f.streak}, ${Object.keys(f.srs).length} mistakes`);

    // Reset on the PC reaches the other devices.
    await openProgress(devs.pc.page);
    await devs.pc.page.getByRole("button", { name: "Reset all progress" }).click();
    assert.match(await devs.pc.page.locator(".sheet, [role=dialog]").first().textContent(), /other devices/);
    let t = Date.now();
    await devs.pc.page.getByRole("button", { name: "Delete everything" }).click();
    await waitSynced(devs.pc.page, t);
    t = Date.now();
    await devs.phone.page.getByRole("button", { name: "Sync now" }).click(); await waitSynced(devs.phone.page, t);
    assert.equal((await S(devs.phone.page)).xp, 0, "reset reaches the phone");
    console.log("ok reset on one device resets the others");

    // Sign out keeps local progress.
    await devs.laptop.page.getByRole("button", { name: "Sign out" }).click();
    await devs.laptop.page.getByRole("button", { name: "Sign in with Google" }).waitFor();
    await devs.laptop.page.emulateMedia({ colorScheme: "dark" }); await devs.laptop.page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await devs.laptop.page.locator(".card.cloud").screenshot({ path: require("node:os").tmpdir() + "/redpen-cloud-signedout-dark.png" });
    assert.ok((await S(devs.laptop.page)).xp > 0, "signing out keeps this device's progress");
    console.log("ok sign-out keeps local progress");

    for (const d of Object.values(devs)) assert.deepEqual(d.page.errors, [], "no console errors");
    for (const d of Object.values(devs)) await d.ctx.close();
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
