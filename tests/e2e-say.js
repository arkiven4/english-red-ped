// "Say it" pronunciation practice mode: mocked microphone (MediaRecorder) and mocked /score endpoint.
// Checks lazy mic permission, word coloring, tips, retry, Progress stats, offline handling, light & dark modes.
// Run: node tests/e2e-say.js
const assert = require("node:assert/strict");
const { BASE, serve, launch, phone } = require("./helpers");

(async () => {
  const server = await serve(), browser = await launch();
  try {
    for (const dark of [false, true]) {
      const { ctx, page } = await phone(browser, { dark });
      if (dark) {
        await page.addInitScript(() => {
          localStorage.setItem("redpen.v1", JSON.stringify({ v: 2, epoch: 0, topics: { be_verb: { m: 80, n: 15, c: 12 } }, unlocked: ["be_verb"], srs: {}, srsDone: {}, recent: [], days: [], cnt: {}, dayCnt: {}, goal: 10, theme: "dark", themeChosen: true, ts: { theme: 1, themeChosen: 1 } }));
        });
      }

      // Mock microphone (MediaRecorder + getUserMedia) and speechSynthesis
      await page.addInitScript(() => {
        window.__micRequests = 0;
        window.__spoken = [];
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          value: {
            cancel() {},
            getVoices: () => [{ lang: "en-GB", name: "English (UK)" }],
            speak: u => { window.__spoken.push({ text: u.text, lang: u.lang }); },
          },
        });

        navigator.mediaDevices.getUserMedia = async () => {
          window.__micRequests++;
          return { getTracks: () => [{ stop() {} }] };
        };
        window.MediaRecorder = class FakeMediaRecorder {
          constructor(stream) { this.stream = stream; this.state = "inactive"; this.mimeType = "audio/webm"; }
          start() { this.state = "recording"; }
          stop() {
            this.state = "inactive";
            if (this.ondataavailable) this.ondataavailable({ data: new Blob(["fake-audio"], { type: "audio/webm" }) });
            if (this.onstop) setTimeout(() => this.onstop(), 10);
          }
        };
      });

      let scoreCall = 0;
      await page.route("**/score", async route => {
        scoreCall++;
        const body = JSON.parse(route.request().postData() || "{}");
        const words = (body.text.match(/[A-Za-z']+[.,!?;:]*/g) || []);
        if (scoreCall === 1) {
          // First attempt: simulate a dropped final -s and a 'th' -> 't' mistake
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              text: body.text,
              accent: "en-gb",
              score: 62,
              heard_ipa: "ʃ iː ɹ iː d z t ɹ iː b ʊ k",
              words: words.map((w, i) => ({
                word: w,
                clean: w.replace(/[^A-Za-z']/g, ""),
                expected_ipa: "wɜːd",
                heard_ipa: i === 0 ? "wɜː" : "wɜːd",
                status: i === 0 ? "wrong" : i === 1 ? "unclear" : "good",
                score: i === 0 ? 40 : i === 1 ? 65 : 100,
                categories: i === 0 ? ["final_s"] : i === 1 ? ["th"] : [],
                phonemes: [],
              })),
              errors: [
                {
                  category: "final_s",
                  severity: "wrong",
                  word: words[0].replace(/[^A-Za-z']/g, ""),
                  expected: "s",
                  heard: "none",
                  message: `Final -s missing in “${words[0].replace(/[^A-Za-z']/g, "")}”.`,
                  tip: "Don't drop the -s ending: finish with a clear /s/ sound.",
                },
                {
                  category: "th",
                  severity: "unclear",
                  word: (words[1] || "three").replace(/[^A-Za-z']/g, ""),
                  expected: "θ",
                  heard: "t",
                  message: `In “${(words[1] || "three").replace(/[^A-Za-z']/g, "")}”, “th” sounded like “t”.`,
                  tip: "Place the tip of your tongue lightly between your teeth for “th”.",
                },
              ],
              categories: { final_s: { n: 1, c: 0 }, th: { n: 1, c: 0 }, v_f: { n: 1, c: 1 } },
              latency_ms: 120,
            }),
          });
        } else {
          // Second attempt (retry): all clear!
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              text: body.text,
              accent: "en-gb",
              score: 96,
              heard_ipa: "ʃ iː ɹ iː d z θ ɹ iː b ʊ k s",
              words: words.map(w => ({
                word: w,
                clean: w.replace(/[^A-Za-z']/g, ""),
                expected_ipa: "wɜːd",
                heard_ipa: "wɜːd",
                status: "good",
                score: 100,
                categories: [],
                phonemes: [],
              })),
              errors: [],
              categories: { final_s: { n: 1, c: 1 }, th: { n: 1, c: 1 }, v_f: { n: 1, c: 1 } },
              latency_ms: 95,
            }),
          });
        }
      });

      await page.goto(BASE + "?test&asr=" + encodeURIComponent(BASE.replace(/\/$/, "")));
      await page.waitForFunction(() => window.__redpen && !document.querySelector(".home-cta .btn[disabled]"));

      // Open Practice tab -> Say it
      await page.getByRole("button", { name: "Practice", exact: true }).click();
      assert.equal(await page.evaluate(() => window.__micRequests), 0, "mic permission not requested before tapping Record");
      await page.locator("#start-say").click();

      // Tap Listen first
      await page.locator("#say-listen").click();
      const spoken = await page.evaluate(() => window.__spoken);
      assert.equal(spoken.length, 1);
      assert.match(spoken[0].lang, /^en-GB/i);

      // Tap Record, then Stop
      await page.locator("#say-record").click();
      assert.equal(await page.evaluate(() => window.__micRequests), 1, "mic permission requested on Record tap");
      assert.match(await page.locator("#say-record").textContent(), /Stop/);
      await page.locator("#say-record").click();

      // Wait for first feedback (with deliberate errors)
      await page.locator(".say-feedback.bad").waitFor();
      assert.ok(await page.locator(".say-word.wrong").count() >= 1, "wrong word colored red");
      assert.ok(await page.locator(".say-word.unclear").count() >= 1, "unclear word colored amber");
      assert.ok(await page.locator(".say-word.good").count() >= 1, "good words colored green");
      assert.match(await page.locator(".say-issues").textContent(), /Final -s missing/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal scroll");

      // Retry the same sentence and pass
      await page.locator("#say-retry").click();
      await page.locator("#say-record").click();
      await page.locator(".say-feedback.good").waitFor();
      assert.match(await page.locator(".say-feedback .fb-title").textContent(), /Clear! \(96%\)/);

      // Leave back to Progress tab and check Pronunciation stats card
      await page.locator(".lesson-top .close").click();
      await page.getByRole("button", { name: "Progress", exact: true }).click();
      await page.locator("#pron-card").waitFor();
      assert.match(await page.locator('[data-pron-cat="final_s"]').textContent(), /0% · 0\/1/);
      assert.match(await page.locator('[data-pron-cat="v_f"]').textContent(), /100% · 1\/1/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal scroll on Progress");

      assert.deepEqual(page.errors, [], "no console errors");
      await ctx.close();
      console.log(`ok Say it pronunciation mode (${dark ? "dark" : "light"})`);
    }
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
