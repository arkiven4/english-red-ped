// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../merge.js");

const TODAY = "2026-11-22", NOW = Date.UTC(2026, 10, 22, 12);
const opts = { today: TODAY, now: NOW };
const H = 36e5, DAY = 864e5;

// What a device would have after answering: mirrors app.js.
function answer(s, dev, q, ok, now = NOW) {
  const t = s.topics[q.topic] || (s.topics[q.topic] = { m: 0, n: 0, c: 0 });
  t.n++; if (ok) t.c++; t.m = Math.round((t.m + 0.15 * ((ok ? 100 : 0) - t.m)) * 10) / 10;
  R.bump(s, dev, "answered"); if (ok) R.bump(s, dev, "right");
  R.bumpMode(s, dev, q.type, ok);
  if (!ok) R.srsPut(s, q.id, 0, now + DAY / 2, now);
  else if (s.srs[q.id]) { const b = s.srs[q.id].box + 1; if (b >= 4) R.srsFinish(s, q.id, now); else R.srsPut(s, q.id, b, now + DAY, now); }
  if (ok) { R.bump(s, dev, "xp", 10); R.addCorrectToday(s, dev, TODAY); }
}
function finish(s, dev, today = TODAY) { R.bump(s, dev, "xp", 5); R.bump(s, dev, "lessons"); R.markDay(s, today); }
const stripRecent = s => { const o = JSON.parse(JSON.stringify(s)); delete o.recent; return o; };

const v1 = () => ({ v: 1, topics: { be_verb: { m: 72, n: 40, c: 30 } }, unlocked: ["be_verb", "articles"], srs: { q1: { box: 1, due: NOW - H } },
  recent: ["q1"], xp: 500, day: "2026-11-21", dayCorrect: 7, goal: 10, streak: 3, lastLesson: "2026-11-21", lessons: 12, answered: 60, right: 45,
  theme: "dark", themeChosen: true, modeStats: { fill: { n: 30, c: 25 } } });

test("v1 save migrates without losing totals", () => {
  const s = R.migrate(v1(), TODAY);
  assert.equal(s.v, 2);
  assert.equal(s.xp, 500); assert.equal(s.lessons, 12); assert.equal(s.answered, 60); assert.equal(s.right, 45);
  assert.deepEqual(s.modeStats, { fill: { n: 30, c: 25 } });
  assert.deepEqual(s.days, ["2026-11-19", "2026-11-20", "2026-11-21"]);
  assert.equal(s.streak, 3); assert.equal(s.lastLesson, "2026-11-21");
  assert.equal(s.dayCorrect, 0, "yesterday's correct answers don't count today");
  assert.equal(s.srs.q1.t, 0);
  assert.equal(s.theme, "dark");
});

test("same old data on two devices (export/import) is not counted twice", () => {
  const m = R.merge(v1(), v1(), opts);
  assert.equal(m.xp, 500); assert.equal(m.answered, 60);
});

test("two devices practice offline on the same day: nothing lost, day counted once", () => {
  const base = R.migrate(v1(), TODAY);
  const phone = JSON.parse(JSON.stringify(base)), laptop = JSON.parse(JSON.stringify(base));
  for (let i = 0; i < 5; i++) answer(phone, "phone", { id: "p" + i, topic: "be_verb", type: "fill" }, true);
  finish(phone, "phone");
  for (let i = 0; i < 4; i++) answer(laptop, "laptop", { id: "l" + i, topic: "articles", type: "order" }, i % 2 === 0);
  finish(laptop, "laptop");
  const m = R.merge(phone, laptop, opts);
  assert.equal(m.xp, 500 + 55 + 25);
  assert.equal(m.answered, 69); assert.equal(m.right, 45 + 5 + 2); assert.equal(m.lessons, 14);
  assert.equal(m.dayCorrect, 7, "scroll pass sums today's correct answers from both devices");
  assert.deepEqual(m.modeStats, { fill: { n: 35, c: 30 }, order: { n: 4, c: 2 } });
  assert.equal(m.streak, 4, "today counts once, even with two devices");
  assert.equal(m.topics.be_verb.n, 45); assert.equal(m.topics.articles.n, 4);
  assert.ok(m.srs.l1 && m.srs.l3, "laptop's mistakes kept");
});

test("topic answered on both devices: version with more answers wins", () => {
  const a = R.migrate(v1(), TODAY), b = R.migrate(v1(), TODAY);
  for (let i = 0; i < 3; i++) answer(a, "a", { id: "x" + i, topic: "be_verb", type: "fill" }, false);
  for (let i = 0; i < 6; i++) answer(b, "b", { id: "y" + i, topic: "be_verb", type: "fill" }, true);
  const m = R.merge(a, b, opts);
  assert.deepEqual(m.topics.be_verb, b.topics.be_verb);
});

test("srs: item finished on A, missed again later on B → it stays a mistake", () => {
  const a = R.migrate(v1(), TODAY), b = R.migrate(v1(), TODAY);
  R.srsFinish(a, "q1", NOW - 2 * H);
  R.srsPut(b, "q1", 0, NOW + DAY / 2, NOW - H);
  for (const m of [R.merge(a, b, opts), R.merge(b, a, opts)]) {
    assert.equal(m.srs.q1.box, 0); assert.equal(m.srsDone.q1, undefined);
  }
});

test("srs: item finished on A after B last touched it → it does not come back", () => {
  const a = R.migrate(v1(), TODAY), b = R.migrate(v1(), TODAY);
  R.srsPut(b, "q1", 2, NOW + 3 * DAY, NOW - 2 * H);
  R.srsFinish(a, "q1", NOW - H);
  for (const m of [R.merge(a, b, opts), R.merge(b, a, opts)]) {
    assert.equal(m.srs.q1, undefined); assert.equal(m.srsDone.q1, NOW - H);
  }
});

test("srs: a new mistake beats an older entry with a later due date", () => {
  const a = R.migrate(v1(), TODAY), b = R.migrate(v1(), TODAY);
  R.srsPut(a, "q9", 3, NOW + 14 * DAY, NOW - 5 * H);
  R.srsPut(b, "q9", 0, NOW + DAY / 2, NOW - H);
  assert.equal(R.merge(a, b, opts).srs.q9.box, 0);
});

test("srs: old graduated markers expire", () => {
  const a = R.migrate(v1(), TODAY);
  R.srsFinish(a, "old", NOW - 61 * DAY); R.srsFinish(a, "new", NOW - DAY);
  const m = R.merge(a, R.fresh(TODAY), opts);
  assert.equal(m.srsDone.old, undefined); assert.equal(m.srsDone.new, NOW - DAY);
});

test("settings: last change wins, per setting", () => {
  const a = R.migrate(v1(), TODAY), b = R.migrate(v1(), TODAY);
  R.setSetting(a, "goal", 20, NOW - H); R.setSetting(b, "goal", 30, NOW - 2 * H);
  R.setSetting(b, "theme", "light", NOW - 3 * H);
  R.setSetting(b, "current", "articles", NOW - 3 * H);
  const m = R.merge(a, b, opts);
  assert.equal(m.goal, 20); assert.equal(m.theme, "light"); assert.equal(m.current, "articles");
});

test("streak across devices: phone yesterday, laptop today", () => {
  const a = R.fresh(TODAY), b = R.fresh(TODAY);
  R.markDay(a, "2026-11-20"); R.markDay(a, "2026-11-21");
  R.markDay(b, "2026-11-22");
  const m = R.merge(a, b, opts);
  assert.equal(m.streak, 3); assert.equal(m.lastLesson, TODAY);
  const gap = R.merge(a, (() => { const c = R.fresh(TODAY); R.markDay(c, "2026-11-18"); return c; })(), opts);
  assert.equal(gap.streak, 2);
});

test("reset on one device wins over older progress everywhere", () => {
  const old = R.migrate(v1(), TODAY);
  const reset = R.fresh(TODAY); reset.epoch = 1;
  answer(reset, "pc", { id: "r1", topic: "be_verb", type: "fill" }, true);
  for (const m of [R.merge(old, reset, opts), R.merge(reset, old, opts)]) {
    assert.equal(m.epoch, 1); assert.equal(m.xp, 10); assert.equal(m.answered, 1);
    assert.equal(m.srs.q1, undefined);
  }
});

test("merge is symmetric (except device-local `recent`) and idempotent", () => {
  const a = R.migrate(v1(), TODAY), b = R.fresh(TODAY);
  answer(a, "a", { id: "z1", topic: "be_verb", type: "spot" }, false);
  answer(b, "b", { id: "z2", topic: "articles", type: "rewrite" }, true); finish(b, "b");
  R.setSetting(b, "goal", 5, NOW);
  const ab = R.merge(a, b, opts), ba = R.merge(b, a, opts);
  assert.deepEqual(stripRecent(ab), stripRecent(ba));
  assert.deepEqual(R.merge(ab, ab, opts), ab);
  assert.deepEqual(R.merge(ab, a, opts), ab, "merging an older copy again changes nothing");
  assert.deepEqual(ab.recent, a.recent);
});

test("cloud copy has no device-local or derived fields, and merges back to the same state", () => {
  const a = R.migrate(v1(), TODAY);
  const c = R.forCloud(a);
  for (const k of ["recent", "xp", "streak", "dayCorrect", "modeStats"]) assert.equal(c[k], undefined, k);
  assert.deepEqual(stripRecent(R.merge(R.fresh(TODAY), c, opts)), stripRecent(R.merge(a, a, opts)));
});

test("bad input is rejected", () => {
  assert.equal(R.migrate(null, TODAY), null);
  assert.equal(R.migrate({ v: 7 }, TODAY), null);
  assert.equal(R.migrate("x", TODAY), null);
  const a = R.migrate(v1(), TODAY);
  assert.deepEqual(R.merge(a, null, opts), a);
});

test("new device signing in adopts the cloud's settings, not its own defaults", () => {
  const cloud = R.migrate(v1(), TODAY); // theme dark, chosen long ago
  const m = R.merge(R.fresh(TODAY), R.forCloud(cloud), opts);
  assert.equal(m.theme, "dark"); assert.deepEqual(m.unlocked, ["articles", "be_verb"]); assert.equal(m.xp, 500);
});

test("pronunciation stats merge across devices per sound category", () => {
  const a = R.fresh(TODAY), b = R.fresh(TODAY);
  R.bumpPron(a, "phone", "final_s", true);
  R.bumpPron(a, "phone", "final_s", false);
  R.bumpPron(a, "phone", "th", false);
  R.bumpPron(b, "laptop", "final_s", true);
  R.bumpPron(b, "laptop", "v_f", true);
  const m = R.merge(a, b, opts);
  assert.deepEqual(m.pronStats, {
    final_s: { n: 3, c: 2 },
    th: { n: 1, c: 0 },
    v_f: { n: 1, c: 1 },
  });
  assert.equal(R.forCloud(m).pronStats, undefined, "derived pronStats is omitted from cloud payload");
  assert.deepEqual(stripRecent(R.merge(m, a, opts)), stripRecent(m), "idempotent after merge");
});
