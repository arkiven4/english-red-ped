/* Red Pen — grammar practice. No build step: plain JS, data in data/questions.json, progress in localStorage. */
(() => {
"use strict";

/* ================= curriculum ================= */
// Units follow the "Basic English for IELTS and TOEFL" course. `lesson` is the course lesson number (null = foundations, before the course).
const UNITS = [
  { lesson: null, name: "Foundations", topics: [
    ["be_verb", "am / is / are", "I am, she is, they are"],
    ["pronouns", "he / she, his / her", "Choose he or she, his or her"],
    ["articles", "a / an", "a car, an egg, an hour"],
    ["plurals", "Plurals", "two cats, three children"],
    ["there_is", "There is / there are", "There are two cats, not “have two cats”"],
    ["questions", "Questions", "Where does she work?"] ] },
  { lesson: 2, name: "Parts of speech", topics: [["adj_adv", "Adjective or adverb", "careful / carefully, good / well"]] },
  { lesson: 3, name: "Sentence types", topics: [["conjunctions", "Compound and complex", "because, so, but, although"]] },
  { lesson: 4, name: "Subject-verb agreement", topics: [["agreement", "Agreement", "Everyone likes, my friends like"]] },
  { lesson: 5, name: "Present simple vs. continuous", topics: [
    ["pres_simple", "Present simple", "She works, they work"],
    ["pres_cont", "Present continuous", "She is working now"],
    ["pres_contrast", "Simple or continuous?", "every day vs. now, know (not knowing)"] ] },
  { lesson: 6, name: "Past tense forms", topics: [
    ["past", "Past simple", "bought, went, didn't go"],
    ["past_cont", "Past continuous", "I was reading when he called"] ] },
  { lesson: 7, name: "Future forms", topics: [["future", "Future", "will, going to, I'm meeting"]] },
  { lesson: 8, name: "Time expressions", topics: [["pres_perfect", "Present perfect", "has lived since 2015, have never been"]] },
  { lesson: 9, name: "Relative clauses", topics: [["relative", "who / which / where / whose", "The teacher who helped me"]] },
  { lesson: 10, name: "Conditionals", topics: [["conditionals", "Conditionals", "If it rains, I will… If I had…"]] },
  { lesson: 11, name: "Passive voice", topics: [["passive", "Passive voice", "is made, was built, will be sent"]] },
  { lesson: 12, name: "Articles", topics: [["the_zero", "the or no article", "the sun, education (no article)"]] },
  { lesson: 13, name: "Quantifiers", topics: [["quantifiers", "many / much / few / little", "many people, little money"]] },
  { lesson: 14, name: "Linking words", topics: [["linking", "Linking words", "however, therefore, moreover"]] },
  { lesson: 15, name: "Parallel structures", topics: [["parallel", "Parallel structures", "not only… but also, both… and"]] },
  { lesson: 16, name: "Pronoun reference", topics: [["demonstratives", "this / that / these / those", "these books, it / they"]] },
  { lesson: 17, name: "Prepositions", topics: [
    ["prepositions", "in / on / at", "on Monday, in May, at 7 a.m."],
    ["collocations", "Word + preposition", "good at, interested in, apply for"] ] },
  { lesson: 18, name: "Comparatives & superlatives", topics: [
    ["comparatives", "Comparatives", "bigger, more expensive"],
    ["superlatives", "Superlatives", "the biggest, the most expensive"] ] },
  { lesson: 19, name: "Gerunds & infinitives", topics: [["gerund_inf", "Gerunds & infinitives", "enjoy reading, plan to travel"]] },
  { lesson: 20, name: "Advanced passive", topics: [["passive_adv", "Advanced passive", "is being built, has been sent, had it repaired"]] },
];
const TOPICS = UNITS.flatMap((u, ui) => u.topics.map(([id, name, sub]) => ({ id, name, sub, unit: ui })));
const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const MODES = {
  order: { label: "Put in order", title: "Build the sentence" },
  fill: { label: "Fill the gap", title: "Choose the word that fits" },
  spot: { label: "Spot the mistake", title: "Tap the wrong word, or choose No mistake" },
  rewrite: { label: "Fix it", title: "Correct this sentence" },
};
const LESSON_SIZE = 12, UNLOCK_AT = 70, UNLOCK_MIN = 12, ALPHA = 0.15;
const SRS_DAYS = [1, 3, 7, 14];
const DAY = 864e5;

/* ================= storage ================= */
const KEY = "redpen.v1";
const fresh = () => ({ v: 1, topics: {}, unlocked: ["be_verb"], srs: {}, recent: [], xp: 0, day: today(), dayCorrect: 0, goal: 10,
  streak: 0, lastLesson: "", lessons: 0, answered: 0, right: 0, theme: "system" });
function today(d = new Date()) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
const yesterday = () => today(new Date(Date.now() - DAY));
let S = fresh();
try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && raw.v === 1) S = Object.assign(fresh(), raw); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Could not save progress on this device."); } };
function rollDay() { if (S.day !== today()) { S.day = today(); S.dayCorrect = 0; save(); } }
const T = id => S.topics[id] || (S.topics[id] = { m: 0, n: 0, c: 0 });
const streakNow = () => (S.lastLesson === today() || S.lastLesson === yesterday()) ? S.streak : 0;
let themeSet = false;
function applyTheme() { // "system" leaves the attribute alone so the phone (or host page) decides
  const root = document.documentElement;
  if (S.theme === "light" || S.theme === "dark") { root.setAttribute("data-theme", S.theme); themeSet = true; }
  else if (themeSet) { root.removeAttribute("data-theme"); themeSet = false; }
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  requestAnimationFrame(() => { meta.content = getComputedStyle(document.body).backgroundColor; });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v; // only used for our own static SVG
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(3)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : String(c)); }
  return e;
}
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function weighted(items, w) { const ws = items.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
function norm(s) {
  return String(s).toLowerCase().replace(/[’‘`]/g, "'")
    .replace(/\bwon't\b/g, "will not").replace(/\bcan't\b/g, "cannot").replace(/\bcan not\b/g, "cannot")
    .replace(/n't\b/g, " not").replace(/'m\b/g, " am").replace(/'re\b/g, " are").replace(/'ll\b/g, " will").replace(/'ve\b/g, " have")
    .replace(/\b(he|she|it|that|what|there|where|who|here)'s\b/g, "$1 is")
    .replace(/[.,!?;:"]/g, " ").replace(/\s+/g, " ").trim();
}
const wordsKey = s => String(s).toLowerCase().replace(/[.,!?;:"]/g, "").replace(/\s+/g, " ").trim();
const clean = w => String(w).toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
function toast(msg) { const t = h("div", { class: "toast", role: "status" }, msg); document.body.append(t); setTimeout(() => t.remove(), 2600); }
const level = m => m >= UNLOCK_AT ? "strong" : m >= 40 ? "learning" : "weak";

/* ================= Nib, the mascot ================= */
function nib(state = "idle") {
  const eyes = {
    idle: `<ellipse cx="41" cy="44" rx="6" ry="7.5" fill="#fff"/><ellipse cx="59" cy="44" rx="6" ry="7.5" fill="#fff"/><circle cx="42.5" cy="45.5" r="3.4" fill="#1d2647"/><circle cx="60.5" cy="45.5" r="3.4" fill="#1d2647"/><circle cx="43.6" cy="44.3" r="1.1" fill="#fff"/><circle cx="61.6" cy="44.3" r="1.1" fill="#fff"/>`,
    happy: `<path d="M35 46 q6 -9 12 0" stroke="#1d2647" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M53 46 q6 -9 12 0" stroke="#1d2647" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
    sad: `<ellipse cx="41" cy="45" rx="6" ry="7" fill="#fff"/><ellipse cx="59" cy="45" rx="6" ry="7" fill="#fff"/><circle cx="41" cy="48.5" r="3.4" fill="#1d2647"/><circle cx="59" cy="48.5" r="3.4" fill="#1d2647"/><path d="M34 36 l9 3.5 M66 36 l-9 3.5" stroke="#1d2647" stroke-width="2.6" stroke-linecap="round"/>`,
  }[state === "idle" ? "idle" : state];
  const mouth = { idle: `<path d="M45 56 q5 4 10 0" stroke="#1d2647" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    happy: `<path d="M42 54 q8 10 16 0 z" fill="#1d2647"/><path d="M46 58.5 q4 3 8 0" fill="#ff8f7f"/>`,
    sad: `<path d="M45 59 q5 -4 10 0" stroke="#1d2647" stroke-width="2.6" fill="none" stroke-linecap="round"/>` }[state];
  return `<svg class="nib-svg ${state}" viewBox="0 0 100 110" aria-hidden="true"><g class="body">
    <ellipse cx="50" cy="104" rx="20" ry="4" fill="currentColor" opacity=".10"/>
    <path d="M38 78 L62 78 L54 96 Q50 104 46 96 Z" fill="#f4d9b0"/><path d="M47.6 95 L52.4 95 L50 102 Z" fill="#1d2647"/>
    <rect x="28" y="20" width="44" height="62" rx="16" fill="#e2452f"/>
    <rect x="28" y="20" width="44" height="22" rx="14" fill="#b3301c"/><rect x="28" y="32" width="44" height="10" fill="#b3301c"/>
    <rect x="66" y="16" width="6" height="34" rx="3" fill="#8f2416"/>
    <path d="M34 26 q2 -3 6 -3" stroke="#ffffff" stroke-opacity=".4" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eyes}${mouth}
    <circle cx="33" cy="54" r="3.6" fill="#ff8f7f" opacity=".55"/><circle cx="67" cy="54" r="3.6" fill="#ff8f7f" opacity=".55"/>
  </g></svg>`;
}
const nibEl = state => h("span", { html: nib(state), style: "display:contents" });

/* ================= icons ================= */
const ICON = {
  flame: `<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 7 13c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6.5 1-9.5z" fill="currentColor"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>`,
  x: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8 6.6 19.7l1-6.1L3.2 9.3l6.1-.9z" fill="currentColor"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="2.6" fill="none"/></svg>`,
  crown: `<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/></svg>`,
  path: `<svg viewBox="0 0 24 24"><circle cx="7" cy="6" r="3" fill="currentColor"/><circle cx="17" cy="12" r="3" fill="currentColor"/><circle cx="8" cy="19" r="3" fill="currentColor"/><path d="M9 8l6 3M15 14l-5 3" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>`,
  chart: `<svg viewBox="0 0 24 24"><rect x="4" y="12" width="4" height="8" rx="1.5" fill="currentColor"/><rect x="10" y="7" width="4" height="13" rx="1.5" fill="currentColor"/><rect x="16" y="3" width="4" height="17" rx="1.5" fill="currentColor"/></svg>`,
};
const icon = n => h("span", { html: ICON[n], style: "display:contents" });

/* ================= data ================= */
let POOL = {}, BY_ID = {}, dataReady = false;
fetch("data/questions.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
  for (const q of d.items) { BY_ID[q.id] = q; ((POOL[q.topic] = POOL[q.topic] || {})[q.type] = POOL[q.topic][q.type] || []).push(q); }
  dataReady = true; render();
}).catch(() => { $("#app").replaceChildren(h("div", { class: "boot" }, "Could not load the questions. Check your connection and reopen the app.")); });

/* ================= lesson building ================= */
const unlockedTopics = () => TOPICS.filter(t => S.unlocked.includes(t.id));
function frontier() {
  // 1) the topic you picked last (e.g. this week's class lesson) until it is strong;
  // 2) then the next unlocked, not-yet-strong topic after it in course order; 3) else the first one; 4) else your weakest.
  const u = unlockedTopics();
  const cur = S.current && TOPIC[S.current] && S.unlocked.includes(S.current) ? S.current : null;
  if (cur && T(cur).m < UNLOCK_AT) return TOPIC[cur];
  const from = cur ? TOPICS.indexOf(TOPIC[cur]) : -1;
  return u.find(t => TOPICS.indexOf(t) > from && T(t.id).m < UNLOCK_AT) || u.find(t => T(t.id).m < UNLOCK_AT)
    || u.filter(t => T(t.id).n).sort((a, b) => T(a.id).m - T(b.id).m)[0] || u[0];
}
// How often you miss a question type (0 = never, 1 = always); 0.5 until there are answers.
const modeMiss = m => { const s = (S.modeStats || {})[m] || { n: 0, c: 0 }; return 1 - (s.c + 1) / (s.n + 2); };
function pickMode(topicId, weakBias) {
  const t = T(topicId), modes = Object.keys(MODES).filter(m => POOL[topicId] && POOL[topicId][m] && POOL[topicId][m].length);
  const w = t.n < 8 ? { fill: 3, order: 3, spot: 1.2, rewrite: 0.6 } : t.m > 55 ? { fill: 1, order: 1, spot: 1.3, rewrite: 1.6 } : { fill: 1.3, order: 1.2, spot: 1.2, rewrite: 1 };
  return weighted(modes, m => weakBias ? (0.4 + 3 * modeMiss(m)) : w[m]);
}
function pickQuestion(topicId, used, weakBias) {
  const recent = new Set(S.recent);
  for (let tries = 0; tries < 30; tries++) {
    const mode = pickMode(topicId, weakBias), list = POOL[topicId][mode];
    const q = list[rand(list.length)];
    if (used.has(q.id)) continue;
    if (recent.has(q.id) && tries < 25) continue;
    return q;
  }
  return null;
}
function buildLesson(focusId) {
  const used = new Set(), out = [];
  const add = (q, tag) => { if (q && !used.has(q.id)) { used.add(q.id); out.push({ q, tag }); } };
  const now = Date.now();
  // 1) mistakes that are due again (spaced repetition)
  const due = Object.entries(S.srs).filter(([id, s]) => s.due <= now && BY_ID[id] && S.unlocked.includes(BY_ID[id].topic)).sort((a, b) => a[1].due - b[1].due);
  for (const [id] of due.slice(0, 2)) add(BY_ID[id], "review");
  // 2) weakest other unlocked topics
  const others = unlockedTopics().filter(t => t.id !== focusId && T(t.id).n > 0); // never mix in topics you haven't started
  for (let i = 0; i < 3 && others.length; i++) { const t = weighted(others, t => 110 - T(t.id).m); add(pickQuestion(t.id, used), "mix"); }
  // 3) the rest from the focus topic
  let guard = 0;
  while (out.length < LESSON_SIZE && guard++ < 100) add(pickQuestion(focusId, used), "focus");
  const focus = out.filter(x => x.tag === "focus"), rest = shuffle(out.filter(x => x.tag !== "focus"));
  return [...focus.slice(0, 2), ...shuffle([...focus.slice(2), ...rest])];
}

// Practice tab: random topics, weighted toward weak topics and weak question types.
function buildMix(kind) {
  const used = new Set(), out = [];
  const add = (q, tag) => { if (q && !used.has(q.id)) { used.add(q.id); out.push({ q, tag }); } };
  const mistakes = Object.entries(S.srs).filter(([id]) => BY_ID[id]).sort((a, b) => a[1].due - b[1].due).map(([id]) => BY_ID[id]);
  if (kind === "mistakes") { for (const q of mistakes.slice(0, LESSON_SIZE)) add(q, "review"); return shuffle(out); }
  const now = Date.now();
  for (const q of mistakes.filter(q => S.srs[q.id].due <= now).slice(0, 3)) add(q, "review");
  const practiced = TOPICS.filter(t => T(t.id).n > 0 && POOL[t.id]);
  let guard = 0;
  while (practiced.length && out.length < LESSON_SIZE && guard++ < 200) {
    const t = weighted(practiced, t => Math.pow(105 - T(t.id).m, 1.6)); // weaker topic → much more likely
    add(pickQuestion(t.id, used, true), "mix");
  }
  return shuffle(out);
}

/* ================= app state ================= */
let view = "home"; // home | lesson | result | progress
let L = null;      // current lesson
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if (view === "progress") render(); });

function startLesson(focusId, kind) {
  if (!dataReady) return;
  let focus = null, items;
  if (kind) { items = buildMix(kind); if (!items.length) return toast("Nothing to practice yet."); }
  else { focus = focusId || frontier().id; S.current = focus; save(); items = buildLesson(focus); }
  L = { focus, kind, from: view === "practice" ? "practice" : "home", items, i: 0, firstTry: 0, firstTotal: 0, xp: 0, combo: 0, retry: [], inRetry: false,
    startM: Object.fromEntries(TOPICS.map(t => [t.id, T(t.id).m])), startUnlocked: [...S.unlocked], earnedPass: false };
  newQuestion(); view = "lesson"; render();
}
function newQuestion() {
  const it = L.items[L.i]; const q = it.q;
  L.cur = { q, tag: it.tag, retry: !!it.retry, done: false, ok: null };
  const c = L.cur;
  if (q.type === "order") {
    const toks = q.answer.split(/\s+/).map((w, i, a) => i === a.length - 1 && !/[ap]\.m\.$/.test(w) ? w.replace(/[.?!]+$/, "") : w).map(w => w.replace(/,$/, ""));
    if (!q.keep) toks[0] = toks[0].charAt(0).toLowerCase() + toks[0].slice(1);
    let order = shuffle(toks.map((_, i) => i));
    for (let k = 0; k < 6 && order.every((v, i) => v === i); k++) order = shuffle(order);
    c.tiles = order.map(i => toks[i]); c.built = [];
  }
  if (q.type === "fill") { c.opts = shuffle(q.options); c.pick = null; }
  if (q.type === "spot") { c.words = q.sentence.split(/\s+/); c.wrongIdx = q.correct ? -1 : c.words.findIndex(w => clean(w) === clean(q.wrong_word)); c.sel = null; c.stage = "find"; c.fixOpts = shuffle(q.fix_options); c.fixPick = null; }
  if (q.type === "rewrite") c.text = q.wrong;
}
function canCheck() {
  const c = L.cur;
  if (c.q.type === "order") return c.built.length === c.tiles.length;
  if (c.q.type === "fill") return c.pick != null;
  if (c.q.type === "spot") return c.stage === "find" ? c.sel != null : c.fixPick != null;
  if (c.q.type === "rewrite") return c.text.trim().length > 0;
}
function check() {
  const c = L.cur, q = c.q;
  if (!canCheck()) return;
  let ok = false;
  if (q.type === "order") { const built = c.built.map(i => c.tiles[i]).join(" "); c.yours = built; ok = [q.answer, ...(q.alts || [])].some(a => wordsKey(a) === wordsKey(built)); }
  if (q.type === "fill") ok = c.pick === q.answer;
  if (q.type === "spot") {
    if (c.stage === "find") {
      if (c.sel === "none") { ok = !!q.correct; if (!ok) c.yours = "You said there was no mistake."; }
      else if (q.correct) { ok = false; c.yours = `You marked “${c.words[c.sel]}” as wrong, but the sentence was correct.`; }
      else if (c.sel === c.wrongIdx) { c.stage = "fix"; render(); return; }
      else { ok = false; c.yours = `You marked “${c.words[c.sel]}”. The mistake was “${q.wrong_word}”.`; }
    } else { ok = c.fixPick === q.fix; if (!ok) c.yours = `You chose “${c.fixPick === "—" ? "(no word)" : c.fixPick}”.`; }
  }
  if (q.type === "rewrite") {
    const v = c.text.trim(); c.yours = v;
    if (norm(v) === norm(q.wrong)) { ok = false; c.yours = "You did not change the sentence."; }
    else ok = [q.answer, ...(q.alts || [])].some(a => norm(a) === norm(v));
  }
  grade(ok);
}
function grade(ok) {
  const c = L.cur, q = c.q; c.done = true; c.ok = ok;
  rollDay();
  if (!c.retry) {
    const t = T(q.topic); t.n++; if (ok) t.c++;
    t.m = Math.round((t.m + ALPHA * ((ok ? 100 : 0) - t.m)) * 10) / 10;
    S.answered++; if (ok) S.right++;
    const ms = (S.modeStats = S.modeStats || {})[q.type] || (S.modeStats[q.type] = { n: 0, c: 0 }); ms.n++; if (ok) ms.c++;
    L.firstTotal++; if (ok) L.firstTry++;
    if (!ok) L.retry.push({ q, tag: c.tag, retry: true });
  }
  // spaced repetition
  const s = S.srs[q.id];
  if (!ok) S.srs[q.id] = { box: 0, due: Date.now() + DAY / 2 };
  else if (s) { if (s.box + 1 >= SRS_DAYS.length) delete S.srs[q.id]; else S.srs[q.id] = { box: s.box + 1, due: Date.now() + SRS_DAYS[s.box + 1] * DAY }; }
  // rewards
  if (ok) {
    L.combo++; const gain = c.retry ? 5 : 10; L.xp += gain; S.xp += gain; S.dayCorrect++;
    if (S.dayCorrect === S.goal) L.earnedPass = true;
  } else { L.combo = 0; if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {} }
  S.recent = [...S.recent.filter(id => id !== q.id), q.id].slice(-600);
  checkUnlocks();
  save(); render();
}
function checkUnlocks() {
  for (const t of TOPICS) {
    if (S.unlocked.includes(t.id)) continue;
    const idx = TOPICS.indexOf(t), prev = TOPICS[idx - 1];
    const p = T(prev.id);
    if (S.unlocked.includes(prev.id) && p.m >= UNLOCK_AT && p.n >= UNLOCK_MIN) S.unlocked.push(t.id);
  }
}
function next() {
  L.i++;
  if (L.i >= L.items.length && L.retry.length && !L.inRetry) { L.items.push(...L.retry); L.retry = []; L.inRetry = true; }
  if (L.i >= L.items.length) return finishLesson();
  newQuestion(); render(); window.scrollTo(0, 0);
}
function finishLesson() {
  const perfect = L.firstTry === L.firstTotal;
  const bonus = 5 + (perfect ? 10 : 0); L.xp += bonus; S.xp += bonus;
  S.lessons++;
  if (S.lastLesson !== today()) { S.streak = (S.lastLesson === yesterday() ? S.streak : 0) + 1; S.lastLesson = today(); }
  L.perfect = perfect; save(); view = "result"; render(); window.scrollTo(0, 0);
}

/* ================= sheets ================= */
function sheet(content) {
  const root = $("#sheet-root");
  const close = () => root.replaceChildren();
  const s = h("div", { class: "scrim", onclick: e => { if (e.target === s) close(); } }, h("div", { class: "sheet", role: "dialog", "aria-modal": "true" }, content(close)));
  root.replaceChildren(s);
  const f = s.querySelector("button"); f && f.focus();
}
function topicSheet(t) {
  const st = T(t.id), unlocked = S.unlocked.includes(t.id);
  sheet(close => unlocked ? [
    h("h2", {}, t.name), h("p", {}, (UNITS[t.unit].lesson ? `Course lesson ${UNITS[t.unit].lesson} · ` : "") + t.sub),
    h("p", {}, st.n ? `Mastery ${Math.round(st.m)}% · ${st.c} of ${st.n} correct` : "Not started yet."),
    h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { close(); startLesson(t.id); } }, st.n ? "Practice" : "Start"),
      h("button", { class: "btn ghost", onclick: close }, "Cancel")),
  ] : [
    h("h2", {}, t.name + " is locked"),
    h("p", {}, `It unlocks when the topic before it reaches ${UNLOCK_AT}% mastery. If your class is already at ${UNITS[t.unit].lesson ? "Lesson " + UNITS[t.unit].lesson : "this point"}, jump here. Earlier topics unlock too, but they only appear in lessons after you practice them.`),
    h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { const idx = TOPICS.indexOf(t); for (const x of TOPICS.slice(0, idx + 1)) if (!S.unlocked.includes(x.id)) S.unlocked.push(x.id); S.current = t.id; save(); close(); render(); toast(`${t.name} unlocked. Lessons now focus on it.`); } }, "Jump here"),
      h("button", { class: "btn ghost", onclick: close }, "Cancel")),
  ]);
}
function quitSheet() {
  sheet(close => [h("div", { style: "width:110px;justify-self:center" }, nibEl("sad")),
    h("h2", {}, "Leave this lesson?"), h("p", {}, "Answers you already gave are saved. You lose the lesson bonus."),
    h("div", { class: "row" }, h("button", { class: "btn", onclick: close }, "Keep going"),
      h("button", { class: "btn ghost", style: "color:var(--bad)", onclick: () => { close(); L = null; view = "home"; render(); } }, "Leave"))]);
}

/* ================= views ================= */
function topbar() {
  const st = streakNow();
  return h("div", { class: "topbar" },
    h("div", { class: "logo" }, nibEl("idle"), "Red Pen"),
    h("div", { class: "stats" },
      h("span", { class: "stat streak" + (st ? "" : " off"), title: "Day streak" }, icon("flame"), st),
      h("span", { class: "stat xp", title: "Total XP" }, icon("bolt"), S.xp)));
}
function passCard() {
  rollDay();
  const earned = S.dayCorrect >= S.goal;
  return h("div", { class: "pass" + (earned ? " earned" : "") },
    h("div", { class: "pass-head" }, h("span", {}, "Scroll pass"), h("span", {}, `${Math.min(S.dayCorrect, S.goal)} / ${S.goal}`)),
    h("div", { class: "bar" }, h("i", { style: `width:${Math.min(100, S.dayCorrect / S.goal * 100)}%` })),
    h("p", { class: "pass-note" }, earned ? "Earned. Take 15 minutes of social media, then come back." : `Get ${S.goal - S.dayCorrect} more correct answers today to earn 15 minutes of scrolling.`));
}
function nav() {
  return h("nav", { class: "nav" },
    h("button", { "aria-current": view === "home" ? "page" : null, onclick: () => { view = "home"; render(); } }, icon("path"), "Learn"),
    h("button", { "aria-current": view === "practice" ? "page" : null, onclick: () => { view = "practice"; render(); window.scrollTo(0, 0); } }, icon("target"), "Practice"),
    h("button", { "aria-current": view === "progress" ? "page" : null, onclick: () => { view = "progress"; render(); } }, icon("chart"), "Progress"));
}
function homeView() {
  const f = frontier(); const ft = T(f.id);
  const due = Object.values(S.srs).filter(s => s.due <= Date.now()).length;
  let say;
  if (!S.answered) say = [`Hi, I'm Nib. Let's start with `, h("b", {}, f.name), `. Every mistake you make comes back later until you get it right.`];
  else if (due) say = [`You have `, h("b", {}, due + (due === 1 ? " mistake" : " mistakes")), ` to review. They're mixed into your next lesson with `, h("b", {}, f.name), `.`];
  else if (ft.m >= UNLOCK_AT) say = [`Everything you've unlocked is strong. Let's practice your weakest topic: `, h("b", {}, f.name), `.`];
  else say = [`Next up: `, h("b", {}, f.name), `. You're at ${Math.round(ft.m)}%. Get it to ${UNLOCK_AT}% to unlock the next topic.`];
  const path = UNITS.map((u, ui) => h("section", { class: "unit" },
    h("div", { class: "unit-head" }, h("small", {}, u.lesson ? `Lesson ${u.lesson}` : "Before the course"), h("strong", {}, u.name)),
    h("div", { class: "nodes" }, TOPICS.filter(t => t.unit === ui).map(t => {
      const st = T(t.id), un = S.unlocked.includes(t.id), done = un && st.m >= UNLOCK_AT, cur = t.id === f.id;
      const pct = un ? Math.min(100, st.m) : 0, C = 2 * Math.PI * 33;
      return h("button", { class: "node" + (un ? "" : " locked") + (done ? " done" : "") + (cur ? " current" : ""), onclick: () => topicSheet(t), "aria-label": `${t.name}, ${un ? Math.round(st.m) + "% mastery" : "locked"}` },
        h("span", { class: "ring", html: `<svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="none" stroke="var(--surface-2)" stroke-width="5"/><circle cx="36" cy="36" r="33" fill="none" stroke="${done ? "var(--warn)" : "var(--good)"}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg><span class="disc">${ICON[un ? (done ? "crown" : "star") : "lock"]}</span>` }),
        h("span", { class: "node-text" }, h("strong", {}, t.name), h("span", {}, t.sub), h("br"),
          cur ? h("span", { class: "tag start" }, st.n ? "Continue" : "Start") : un && st.n ? h("span", { class: "tag " + level(st.m) }, level(st.m)) : null));
    }))));
  return [topbar(), passCard(),
    h("div", { class: "hero" }, nibEl("idle"), h("div", { class: "bubble" }, say)),
    h("div", { class: "home-cta" }, h("button", { class: "btn", onclick: () => startLesson(), disabled: !dataReady }, dataReady ? (S.answered ? "Start lesson" : "Start first lesson") : "Loading questions…")),
    path, h("div", { class: "spacer" }), nav()];
}

function questionBody() {
  const c = L.cur, q = c.q, out = [];
  const lock = c.done;
  if (q.type === "order") {
    out.push(h("div", { class: "built", "aria-label": "Your sentence" }, c.built.map((ti, k) =>
      h("button", { class: "tile", disabled: lock, onclick: () => { c.built.splice(k, 1); render(); } }, c.tiles[ti]))));
    out.push(h("div", { class: "pool" }, c.tiles.map((w, i) => { const used = c.built.includes(i);
      return h("button", { class: "tile" + (used ? " ghosted" : ""), disabled: lock || used, "aria-hidden": used ? "true" : null, onclick: () => { c.built.push(i); render(); } }, w); })));
  }
  if (q.type === "fill") {
    const m = q.sentence.match(/^(.*?)___(.*?)(\s\(([^)]+)\))?$/);
    const before = m ? m[1] : q.sentence, after = m ? m[2] : "", hint = m && m[4];
    out.push(h("p", { class: "sentence" }, before, h("span", { class: "gap" }, c.pick ? (c.pick === "—" ? "(no word)" : c.pick) : " "), after, hint ? h("span", { class: "hint" }, ` (${hint})`) : null));
    out.push(h("div", { class: "choices" }, c.opts.map(o => {
      let cls = "choice"; if (lock && o === q.answer) cls += " right"; else if (lock && o === c.pick) cls += " wrong";
      return h("button", { class: cls, disabled: lock, "aria-pressed": String(c.pick === o), onclick: () => { c.pick = o; render(); } }, o === "—" ? "(no word)" : o);
    })));
  }
  if (q.type === "spot") {
    out.push(h("div", { class: "words" }, c.words.map((w, i) => h("button", { class: "word" + (c.stage === "fix" && i === c.wrongIdx ? " marked" : ""), disabled: lock || c.stage === "fix",
      "aria-pressed": String(c.sel === i), onclick: () => { c.sel = i; render(); } }, w))));
    if (c.stage === "find") out.push(h("button", { class: "btn ghost small nomistake", disabled: lock, "aria-pressed": String(c.sel === "none"), style: c.sel === "none" ? "border-color:var(--primary)" : null, onclick: () => { c.sel = "none"; render(); } }, "No mistake"));
    else {
      out.push(h("p", { class: "subq" }, `Right, “${q.wrong_word}” is wrong. What should it be?`));
      out.push(h("div", { class: "choices" }, c.fixOpts.map(o => { let cls = "choice"; if (lock && o === q.fix) cls += " right"; else if (lock && o === c.fixPick) cls += " wrong";
        return h("button", { class: cls, disabled: lock, "aria-pressed": String(c.fixPick === o), onclick: () => { c.fixPick = o; render(); } }, o === "—" ? "(no word)" : o); })));
    }
  }
  if (q.type === "rewrite") {
    const ta = h("textarea", { id: "rw", rows: "3", autocapitalize: "sentences", autocomplete: "off", autocorrect: "off", spellcheck: "false", disabled: lock, "aria-label": "Your corrected sentence" });
    ta.value = c.text; ta.addEventListener("input", () => { const before = canCheck(); c.text = ta.value; if (before !== canCheck()) { const b = $("#check"); if (b) b.disabled = !canCheck(); } });
    out.push(ta);
  }
  return out;
}
function correctLine(q) {
  if (q.type === "order") return q.answer;
  if (q.type === "fill") return q.sentence.replace(/\s\([^)]+\)$/, "").replace("___", q.answer === "—" ? "" : q.answer).replace(/\s+/g, " ");
  if (q.type === "spot") return q.correct ? "No mistake. This sentence is correct." : q.corrected;
  return q.answer;
}
function markDiff(correct, yours) { // highlight words in the correct answer that the learner missed
  const have = {}; for (const w of (yours || "").split(/\s+/)) { const k = clean(w); have[k] = (have[k] || 0) + 1; }
  return correct.split(/(\s+)/).map(p => { if (/^\s+$/.test(p)) return p; const k = clean(p); if (have[k]) { have[k]--; return p; } return yours ? h("mark", {}, p) : p; });
}
const PRAISE = ["Nice!", "Correct!", "Great job!", "Well done!", "Exactly!", "You got it!"];
function feedback() {
  const c = L.cur, q = c.q, ok = c.ok;
  const showLine = !ok || q.type === "spot" || q.type === "rewrite";
  return h("div", { class: "fb " + (ok ? "good" : "bad"), role: "status" }, h("div", { class: "fb-inner" },
    h("div", { class: "fb-head" }, nibEl(ok ? "happy" : "sad"), h("div", { class: "fb-title" }, ok ? (L.combo >= 3 ? `${L.combo} in a row!` : pick(PRAISE)) : "Not quite")),
    showLine ? h("div", {}, h("div", { class: "fb-label" }, ok ? "Correct sentence" : "Correct answer"), h("div", { class: "pen" }, ok ? correctLine(q) : markDiff(correctLine(q), (q.type === "order" || q.type === "rewrite") ? c.yours : ""))) : null,
    h("p", { class: "why" }, q.explain),
    !ok && c.yours ? h("p", { class: "yours" }, /^You /.test(c.yours) ? c.yours : "You wrote: " + c.yours) : null,
    h("button", { class: "btn " + (ok ? "good" : "bad"), id: "continue", onclick: next }, "Continue")));
}
function lessonView() {
  const c = L.cur, q = c.q;
  const progress = L.i / L.items.length * 100;
  const kick = [h("span", { class: "chip" + (c.tag === "review" || c.retry ? " review" : "") }, c.retry ? "Second try" : c.tag === "review" ? "Review" : MODES[q.type].label),
    h("span", { class: "chip" }, TOPIC[q.topic].name), T(q.topic).n < 3 && !c.retry ? h("span", { class: "chip new" }, "New") : null];
  const title = q.type === "spot" && c.stage === "fix" ? "Choose the correction" : MODES[q.type].title;
  return h("div", { class: "lesson" },
    h("div", { class: "lesson-top" },
      h("button", { class: "close", "aria-label": "Leave lesson", onclick: quitSheet }, icon("x")),
      h("div", { class: "bar", role: "progressbar", "aria-valuenow": String(Math.round(progress)), "aria-valuemin": "0", "aria-valuemax": "100" }, h("i", { style: `width:${progress}%` })),
      h("span", { class: "combo" }, L.combo >= 2 ? `x${L.combo}` : "")),
    h("div", { class: "q" }, h("div", { class: "q-kicker" }, kick), h("h1", {}, title),
      q.type === "rewrite" ? h("p", { class: "sentence", style: "color:var(--muted);text-decoration:line-through;text-decoration-color:var(--bad)" }, q.wrong) : null,
      questionBody(), c.done ? h("div", { class: "fb-pad" }) : null),
    c.done ? feedback() : h("div", { class: "lesson-foot" }, h("button", { class: "btn", id: "check", disabled: !canCheck(), onclick: check }, "Check")));
}
function resultView() {
  const acc = L.firstTotal ? Math.round(L.firstTry / L.firstTotal * 100) : 0;
  const t = L.focus ? TOPIC[L.focus] : null, before = t ? Math.round(L.startM[L.focus]) : 0, after = t ? Math.round(T(L.focus).m) : 0;
  const nTopics = new Set(L.items.map(x => x.q.topic)).size;
  const newly = S.unlocked.filter(id => !L.startUnlocked.includes(id)).map(id => TOPIC[id].name);
  return h("div", { class: "result" },
    nibEl("happy"),
    h("h1", {}, L.perfect ? "Perfect lesson!" : "Lesson complete!"),
    h("div", { class: "tiles3" },
      h("div", { class: "t3 xp" }, h("small", {}, "XP"), h("b", {}, "+" + L.xp)),
      h("div", { class: "t3 acc" }, h("small", {}, "First try"), h("b", {}, acc + "%")),
      t ? h("div", { class: "t3 mas" }, h("small", {}, t.name.length > 14 ? "Mastery" : t.name), h("b", {}, `${before}→${after}`))
        : h("div", { class: "t3 mas" }, h("small", {}, "Topics"), h("b", {}, nTopics))),
    newly.length ? h("div", { class: "unlock" }, "New topic unlocked: " + newly.join(", ")) : null,
    L.earnedPass ? h("div", { class: "earned" }, `Scroll pass earned: ${S.goal} correct answers today. Enjoy 15 minutes, then come back.`) : null,
    h("div", { class: "spacer" }),
    h("button", { class: "btn", onclick: () => { view = L.from || "home"; L = null; render(); window.scrollTo(0, 0); } }, "Continue"));
}
function practiceView() {
  const practiced = TOPICS.filter(t => T(t.id).n > 0).sort((a, b) => T(a.id).m - T(b.id).m);
  const nMist = Object.keys(S.srs).filter(id => BY_ID[id]).length;
  const modes = Object.keys(MODES).map(m => ({ m, s: (S.modeStats || {})[m] || { n: 0, c: 0 } }));
  const known = modes.filter(x => x.s.n >= 5).sort((a, b) => a.s.c / a.s.n - b.s.c / b.s.n);
  const head = [topbar(), h("h1", { class: "page-title" }, "Practice")];
  if (!practiced.length) return [...head,
    h("div", { class: "hero" }, nibEl("idle"), h("div", { class: "bubble" }, "Finish one lesson in Learn first. I need to see some answers before I can find your weak spots.")),
    h("button", { class: "btn", onclick: () => { view = "home"; render(); } }, "Go to Learn"), h("div", { class: "spacer" }), nav()];
  const weakest = practiced[0];
  const say = [`This mix jumps between random topics, mostly the ones you get wrong. Weakest right now: `, h("b", {}, weakest.name), ` (${Math.round(T(weakest.id).m)}%)`,
    known.length && known[0].s.c / known[0].s.n < 0.85 ? [`. You miss `, h("b", {}, MODES[known[0].m].label), ` questions most, so you'll get more of those.`] : "."];
  return [...head,
    h("div", { class: "hero" }, nibEl("idle"), h("div", { class: "bubble" }, say)),
    h("div", { class: "row", style: "display:grid;gap:12px" },
      h("button", { class: "btn", onclick: () => startLesson(null, "weak"), disabled: !dataReady }, "Weak-spot mix"),
      h("button", { class: "btn ghost", onclick: () => startLesson(null, "mistakes"), disabled: !dataReady || !nMist }, nMist ? `Review my mistakes (${Math.min(nMist, LESSON_SIZE)})` : "No mistakes to review")),
    h("div", { class: "card" }, h("h2", {}, "Your weak spots"), h("p", {}, "Only topics you have practiced. The weaker a topic, the more often it appears in the mix."),
      practiced.slice(0, 6).map(t => { const st = T(t.id); return h("div", { class: "trow " + level(st.m) },
        h("strong", {}, t.name), h("span", { class: "pct" }, Math.round(st.m) + "%"), h("div", { class: "bar" }, h("i", { style: `width:${st.m}%` }))); })),
    h("div", { class: "card" }, h("h2", {}, "Question types"), h("p", {}, "Correct on the first try."),
      modes.map(({ m, s }) => { const pct = s.n ? Math.round(s.c / s.n * 100) : 0; return h("div", { class: "trow " + (s.n ? level(pct) : "locked") },
        h("strong", {}, MODES[m].label), h("span", { class: "pct" }, s.n ? `${pct}% · ${s.n}` : "no answers yet"), h("div", { class: "bar" }, h("i", { style: `width:${pct}%` }))); })),
    h("div", { class: "spacer" }), nav()];
}
function progressView() {
  const acc = S.answered ? Math.round(S.right / S.answered * 100) : 0;
  const due = Object.keys(S.srs).length;
  const rows = TOPICS.slice().sort((a, b) => { const ua = S.unlocked.includes(a.id), ub = S.unlocked.includes(b.id); if (ua !== ub) return ua ? -1 : 1; return T(a.id).m - T(b.id).m; });
  const fileIn = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: e => importBackup(e.target.files[0]) });
  return [topbar(),
    h("h1", { class: "page-title" }, "Progress"),
    h("div", { class: "card" }, h("div", { class: "grid4" },
      h("div", { class: "kpi" }, h("b", {}, S.answered), h("span", {}, "questions answered")),
      h("div", { class: "kpi" }, h("b", {}, acc + "%"), h("span", {}, "correct overall")),
      h("div", { class: "kpi" }, h("b", {}, S.lessons), h("span", {}, "lessons done")),
      h("div", { class: "kpi" }, h("b", {}, due), h("span", {}, "mistakes to review")))),
    h("div", { class: "card" }, h("h2", {}, "Topics, weakest first"),
      h("p", {}, `Lessons focus on your current topic and mix in your weakest ones. A topic is strong at ${UNLOCK_AT}%; that also unlocks the next one.`),
      rows.map(t => { const st = T(t.id), un = S.unlocked.includes(t.id);
        return h("div", { class: "trow " + (un ? level(st.m) : "locked") },
          h("strong", {}, t.name), h("span", { class: "pct" }, un ? (st.n ? Math.round(st.m) + "%" : "new") : "locked"),
          h("div", { class: "bar" }, h("i", { style: `width:${un ? st.m : 0}%` }))); })),
    h("div", { class: "card" }, h("h2", {}, "Daily goal for the scroll pass"), h("p", {}, "Correct answers needed each day."),
      h("div", { class: "seg" }, [5, 10, 20, 30].map(g => h("button", { "aria-pressed": String(S.goal === g), onclick: () => { S.goal = g; save(); render(); } }, g)))),
    h("div", { class: "card" }, h("h2", {}, "Appearance"), h("p", {}, "System follows your phone's dark mode setting."),
      h("div", { class: "seg three" }, [["system", "System"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) =>
        h("button", { "aria-pressed": String((S.theme || "system") === v), onclick: () => { S.theme = v; save(); applyTheme(); render(); } }, l)))),
    h("div", { class: "card" }, h("h2", {}, "Backup"),
      h("p", {}, "Progress is stored in this browser. Clearing Chrome's site data deletes it, so export a backup now and then."),
      h("div", { class: "btnrow" }, h("button", { class: "btn ghost small", onclick: exportBackup }, "Export"), h("button", { class: "btn ghost small", onclick: () => fileIn.click() }, "Import")), fileIn,
      installEvt ? h("button", { class: "btn small", onclick: async () => { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; render(); } }, "Install app") : null,
      h("button", { class: "link", style: "color:var(--bad);justify-self:start", onclick: resetSheet }, "Reset all progress")),
    h("div", { class: "spacer" }), nav()];
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `red-pen-backup-${today()}.json` });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast("Backup saved to your downloads.");
}
function importBackup(file) {
  if (!file) return;
  file.text().then(txt => {
    const d = JSON.parse(txt);
    if (!d || d.v !== 1 || typeof d.topics !== "object") throw new Error("bad");
    S = Object.assign(fresh(), d); save(); applyTheme(); render(); toast("Backup restored.");
  }).catch(() => toast("That file is not a Red Pen backup."));
}
function resetSheet() {
  sheet(close => [h("h2", {}, "Delete all progress?"), h("p", {}, "This removes your XP, streak, mastery and mistakes on this device. Export a backup first if you might want it back."),
    h("div", { class: "row" }, h("button", { class: "btn bad", onclick: () => { S = fresh(); save(); applyTheme(); close(); render(); toast("Progress deleted."); } }, "Delete everything"),
      h("button", { class: "btn ghost", onclick: close }, "Cancel"))]);
}

/* ================= render ================= */
function render() {
  const app = $("#app");
  if (!dataReady && view !== "home") view = "home";
  let content;
  if (view === "lesson" && L) content = lessonView();
  else if (view === "result" && L) content = resultView();
  else if (view === "progress") content = progressView();
  else if (view === "practice") content = practiceView();
  else { view = "home"; content = homeView(); }
  app.replaceChildren(...[content].flat(4));
  if (view === "lesson" && L.cur.done) { const b = $("#continue"); b && b.focus({ preventScroll: true }); }
}
document.addEventListener("keydown", e => {
  if (view !== "lesson" || !L || e.target.tagName === "TEXTAREA" && !(e.key === "Enter" && !e.shiftKey)) return;
  if (e.key === "Enter") { e.preventDefault(); if (L.cur.done) next(); else check(); }
});

if (/[?&]test\b/.test(location.search)) window.__redpen = { get L() { return L; }, get S() { return S; }, buildMix };
applyTheme(); rollDay(); render();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
