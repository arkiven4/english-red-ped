/* Red Pen — state schema, migration and merge for cloud sync.
   Pure functions, no DOM, no Date.now() inside: callers pass `today` ("YYYY-MM-DD") and `now` (ms).
   Loaded in the browser as a plain script (window.RedPenState) and in Node tests via require().

   Schema 2 (what is stored and synced):
     topics[id] = {m, n, c}            mastery EMA; merge keeps the version with more answers
     unlocked = [id]                   union
     srs[id] = {box, due, t}           spaced-repetition mistakes; t = last change (ms); later t wins
     srsDone[id] = t                   "graduated" marker so a merge doesn't bring a finished item back
     days = ["YYYY-MM-DD"]             days with a finished lesson; union; streak is derived from it
     cnt[dev] = {xp, lessons, answered, right, ms: {type: {n, c}}}
                                       counters per device; per device take the max, totals are sums
     dayCnt[dev] = {day, n}            correct answers today per device (scroll pass); summed for today
     goal, theme, themeChosen, current settings; last write wins using ts[key]
     epoch                             bumped by "Reset all progress"; the higher epoch wins outright
     recent = [id]                     device-local (avoid repeats); never taken from the other side
   Derived (recomputed by derive(), read by the app): xp, lessons, answered, right, modeStats,
     day, dayCorrect, streak, lastLesson. */
(function (root) {
"use strict";

const SCHEMA = 2;
const COUNT_KEYS = ["xp", "lessons", "answered", "right"];
const SETTINGS = ["goal", "theme", "themeChosen", "current"];
const DAY_MS = 864e5;
const DONE_KEEP_MS = 60 * DAY_MS; // graduated markers older than this are dropped
const DAYS_KEEP = 400;

const clone = x => JSON.parse(JSON.stringify(x));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const toUTC = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fromUTC = ms => new Date(ms).toISOString().slice(0, 10);
const addDays = (d, k) => fromUTC(toUTC(d) + k * DAY_MS);
const isDay = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
// deterministic tie-break so merge(a, b) equals merge(b, a)
const cmpJSON = (x, y) => { const a = JSON.stringify(x), b = JSON.stringify(y); return a === b ? 0 : (a > b ? 1 : -1); };

function fresh(today) {
  return { v: SCHEMA, epoch: 0, topics: {}, unlocked: ["be_verb"], srs: {}, srsDone: {}, recent: [], days: [], cnt: {}, dayCnt: {},
    goal: 10, theme: "light", themeChosen: true, ts: {},
    xp: 0, lessons: 0, answered: 0, right: 0, modeStats: {}, pronStats: {}, day: today, dayCorrect: 0, streak: 0, lastLesson: "" };
}

/* Recompute the derived fields from the synced ones. Mutates and returns s. */
function derive(s, today) {
  for (const k of COUNT_KEYS) s[k] = 0;
  s.modeStats = {};
  s.pronStats = {};
  for (const b of Object.values(s.cnt)) {
    for (const k of COUNT_KEYS) s[k] += b[k] || 0;
    for (const [m, x] of Object.entries(b.ms || {})) {
      const t = s.modeStats[m] || (s.modeStats[m] = { n: 0, c: 0 });
      t.n += x.n || 0; t.c += x.c || 0;
    }
    for (const [cat, x] of Object.entries(b.ps || {})) {
      const t = s.pronStats[cat] || (s.pronStats[cat] = { n: 0, c: 0 });
      t.n += x.n || 0; t.c += x.c || 0;
    }
  }
  s.day = today;
  s.dayCorrect = Object.values(s.dayCnt).reduce((a, x) => a + (x.day === today ? x.n || 0 : 0), 0);
  s.days = [...new Set(s.days.filter(isDay))].sort().slice(-DAYS_KEEP);
  s.lastLesson = s.days.length ? s.days[s.days.length - 1] : "";
  let streak = 0;
  for (let i = s.days.length - 1; i >= 0 && s.days[i] === addDays(s.lastLesson, -streak); i--) streak++;
  s.streak = streak;
  return s;
}

/* Turn whatever was saved (schema 1 or 2, possibly partial) into a schema-2 state. Returns null if it isn't Red Pen data. */
function migrate(raw, today) {
  if (!raw || typeof raw !== "object" || (raw.v !== 1 && raw.v !== SCHEMA) || typeof (raw.topics || {}) !== "object") return null;
  const s = Object.assign(fresh(today), clone(raw));
  if (raw.v === 1) {
    // Old saves have plain totals. They go into one "legacy" bucket. If the same old data reached two devices
    // (e.g. through Export/Import), the bucket merges by max, so it is not counted twice.
    s.cnt = { legacy: { xp: raw.xp || 0, lessons: raw.lessons || 0, answered: raw.answered || 0, right: raw.right || 0, ms: clone(raw.modeStats || {}) } };
    s.dayCnt = isDay(raw.day) && raw.dayCorrect ? { legacy: { day: raw.day, n: raw.dayCorrect } } : {};
    s.days = [];
    if (isDay(raw.lastLesson)) for (let i = 0; i < Math.max(1, raw.streak || 0); i++) s.days.push(addDays(raw.lastLesson, -i));
    for (const e of Object.values(s.srs)) if (typeof e.t !== "number") e.t = 0;
    // ts 1 = "chosen at some point": beats the untouched defaults of a brand-new device (ts 0)
    s.srsDone = {}; s.ts = Object.fromEntries(SETTINGS.filter(k => raw[k] !== undefined).map(k => [k, 1])); s.epoch = 0; s.v = SCHEMA;
  }
  for (const k of ["topics", "srs", "srsDone", "cnt", "dayCnt", "ts"]) if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
  for (const k of ["unlocked", "recent", "days"]) if (!Array.isArray(s[k])) s[k] = [];
  for (const e of Object.values(s.srs)) if (typeof e.t !== "number") e.t = 0;
  if (typeof s.epoch !== "number") s.epoch = 0;
  return derive(s, today);
}

/* ---------- local changes (keep synced and derived fields consistent) ---------- */
function bucket(s, dev) { return s.cnt[dev] || (s.cnt[dev] = { xp: 0, lessons: 0, answered: 0, right: 0, ms: {} }); }
function bump(s, dev, key, n = 1) { bucket(s, dev)[key] += n; s[key] += n; }
function bumpMode(s, dev, type, ok) {
  const b = bucket(s, dev), x = b.ms[type] || (b.ms[type] = { n: 0, c: 0 }); x.n++; if (ok) x.c++;
  const t = s.modeStats[type] || (s.modeStats[type] = { n: 0, c: 0 }); t.n++; if (ok) t.c++;
}
function bumpPron(s, dev, cat, ok) {
  const b = bucket(s, dev), ps = b.ps || (b.ps = {}), x = ps[cat] || (ps[cat] = { n: 0, c: 0 }); x.n++; if (ok) x.c++;
  const psTot = s.pronStats || (s.pronStats = {}), t = psTot[cat] || (psTot[cat] = { n: 0, c: 0 }); t.n++; if (ok) t.c++;
}
function addCorrectToday(s, dev, today) {
  const d = s.dayCnt[dev];
  if (!d || d.day !== today) s.dayCnt[dev] = { day: today, n: 0 };
  s.dayCnt[dev].n++;
  if (s.day !== today) derive(s, today); else s.dayCorrect++;
}
function markDay(s, today) { if (!s.days.includes(today)) { s.days.push(today); derive(s, today); } }
function setSetting(s, key, val, now) { s[key] = val; s.ts[key] = now; }
function srsPut(s, id, box, due, now) { s.srs[id] = { box, due, t: now }; delete s.srsDone[id]; }
function srsFinish(s, id, now) { delete s.srs[id]; s.srsDone[id] = now; }

/* ---------- merge ---------- */
function betterTopic(x, y) {
  if (!x) return y; if (!y) return x;
  if (x.n !== y.n) return x.n > y.n ? x : y;
  if ((x.c || 0) !== (y.c || 0)) return (x.c || 0) > (y.c || 0) ? x : y;
  return cmpJSON(x, y) >= 0 ? x : y;
}
function betterSrs(x, y) {
  if (!x) return y; if (!y) return x;
  if (x.t !== y.t) return x.t > y.t ? x : y;
  if (x.due !== y.due) return x.due > y.due ? x : y;
  return cmpJSON(x, y) >= 0 ? x : y;
}
function betterMode(x, y) {
  if (!x) return y; if (!y) return x;
  if (x.n !== y.n) return x.n > y.n ? x : y;
  return (x.c || 0) >= (y.c || 0) ? x : y;
}

/* merge(local, remote) → new state. Symmetric except `recent`, which always comes from `local`.
   Opts: today ("YYYY-MM-DD"), now (ms). Inputs are not modified. */
function merge(local, remote, { today, now }) {
  const a = migrate(local, today), b = migrate(remote, today);
  if (!a) return b; if (!b) return a;
  if (a.epoch !== b.epoch) {
    // someone pressed "Reset all progress": the newer epoch replaces everything older
    const win = clone(a.epoch > b.epoch ? a : b);
    win.recent = a.epoch > b.epoch ? a.recent : [];
    return derive(win, today);
  }
  const out = fresh(today);
  out.epoch = a.epoch;
  out.recent = clone(a.recent);

  for (const id of new Set([...Object.keys(a.topics), ...Object.keys(b.topics)])) out.topics[id] = clone(betterTopic(a.topics[id], b.topics[id]));
  out.unlocked = [...new Set([...a.unlocked, ...b.unlocked])].sort();

  for (const id of new Set([...Object.keys(a.srs), ...Object.keys(b.srs), ...Object.keys(a.srsDone), ...Object.keys(b.srsDone)])) {
    const live = betterSrs(a.srs[id], b.srs[id]);
    const done = Math.max(has(a.srsDone, id) ? a.srsDone[id] : -1, has(b.srsDone, id) ? b.srsDone[id] : -1);
    if (live && live.t > done) out.srs[id] = clone(live);
    else if (done >= 0 && now - done < DONE_KEEP_MS) out.srsDone[id] = done;
  }

  out.days = [...new Set([...a.days, ...b.days])];

  for (const dev of new Set([...Object.keys(a.cnt), ...Object.keys(b.cnt)])) {
    const x = a.cnt[dev] || {}, y = b.cnt[dev] || {}, o = out.cnt[dev] = { ms: {} };
    for (const k of COUNT_KEYS) o[k] = Math.max(x[k] || 0, y[k] || 0);
    const xm = x.ms || {}, ym = y.ms || {};
    for (const m of new Set([...Object.keys(xm), ...Object.keys(ym)])) o.ms[m] = clone(betterMode(xm[m], ym[m]));
    const xp = x.ps || {}, yp = y.ps || {}, pKeys = [...new Set([...Object.keys(xp), ...Object.keys(yp)])];
    if (pKeys.length) {
      o.ps = {};
      for (const c of pKeys) o.ps[c] = clone(betterMode(xp[c], yp[c]));
    }
  }

  for (const dev of new Set([...Object.keys(a.dayCnt), ...Object.keys(b.dayCnt)])) {
    const x = a.dayCnt[dev], y = b.dayCnt[dev];
    out.dayCnt[dev] = clone(!x ? y : !y ? x : x.day !== y.day ? (x.day > y.day ? x : y) : (x.n >= y.n ? x : y));
  }

  for (const k of SETTINGS) {
    const ta = a.ts[k] || 0, tb = b.ts[k] || 0;
    const pick = ta !== tb ? (ta > tb ? a : b) : (cmpJSON(a[k], b[k]) >= 0 ? a : b);
    if (pick[k] !== undefined) out[k] = clone(pick[k]);
    if (ta || tb) out.ts[k] = Math.max(ta, tb);
  }

  return derive(out, today);
}

/* What goes to the cloud: the state without device-local and derived fields. */
function forCloud(s) {
  const o = clone(s);
  for (const k of ["recent", ...COUNT_KEYS, "modeStats", "pronStats", "day", "dayCorrect", "streak", "lastLesson"]) delete o[k];
  return o;
}

const api = { SCHEMA, fresh, migrate, derive, merge, forCloud, bump, bumpMode, bumpPron, addCorrectToday, markDay, setSetting, srsPut, srsFinish, addDays };
if (typeof module === "object" && module.exports) module.exports = api; else root.RedPenState = api;
})(typeof self !== "undefined" ? self : this);
