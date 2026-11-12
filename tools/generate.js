#!/usr/bin/env node
// Builds ../data/questions.json.
// jsRealB (https://github.com/rali-udem/jsRealB, ISC) produces the correct sentences;
// the rules below break them in one place to make the exercises.
// Run: cd tools && npm install && npm run generate

const fs = require("fs");
const path = require("path");
const jsRealB = require("jsrealb");
Object.assign(globalThis, jsRealB);
loadEn();

const PER_MODE = Number(process.env.PER_MODE || 320);
const MODES = ["order", "fill", "spot", "rewrite"];

/* ---------- small utilities ---------- */
let seed = 20261112;
function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const chance = p => rnd() < p;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const join = (...p) => p.filter(Boolean).join(" ");
const R = x => { try { return String(x.realize()).trim().replace(/\s+/g, " "); } catch (e) { return "[[error]]"; } };
const silent = f => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return f(); } finally { console.log = l; console.warn = w; } };
const clean = w => String(w).toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
const count = (sentence, word) => sentence.split(/\s+/).filter(w => clean(w) === clean(word)).length;
const uniq = a => [...new Set(a)];

const PROPER = new Set(["I", "Budi", "Rina", "Andi", "Dewi", "Jakarta", "Bandung", "Surabaya", "Medan", "Bali", "Yogyakarta",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Mondays", "Sundays", "Fridays",
  "January", "May", "August", "December", "English", "TV"]);

/* ---------- lexicon ---------- */
const SUBJECTS = [
  { k: "I", np: () => Pro("I").pe(1), s3: false, be: "am" },
  { k: "you", np: () => Pro("I").pe(2), s3: false, be: "are" },
  { k: "he", np: () => Pro("I").pe(3).g("m"), s3: true, be: "is", g: "m" },
  { k: "she", np: () => Pro("I").pe(3).g("f"), s3: true, be: "is", g: "f" },
  { k: "we", np: () => Pro("I").pe(1).n("p"), s3: false, be: "are", pl: true },
  { k: "they", np: () => Pro("I").pe(3).n("p"), s3: false, be: "are", pl: true },
  { k: "my sister", np: () => NP(D("my").pe(1), N("sister")), s3: true, be: "is", g: "f" },
  { k: "my brother", np: () => NP(D("my").pe(1), N("brother")), s3: true, be: "is", g: "m" },
  { k: "my parents", np: () => NP(D("my").pe(1), N("parent")).n("p"), s3: false, be: "are", pl: true },
  { k: "my friends", np: () => NP(D("my").pe(1), N("friend")).n("p"), s3: false, be: "are", pl: true },
  { k: "Budi", np: () => Q("Budi"), s3: true, be: "is", g: "m" },
  { k: "Rina", np: () => Q("Rina"), s3: true, be: "is", g: "f" },
  { k: "Andi", np: () => Q("Andi"), s3: true, be: "is", g: "m" },
  { k: "Dewi", np: () => Q("Dewi"), s3: true, be: "is", g: "f" },
];
const GENDERED = [
  ...SUBJECTS.filter(s => s.g && !["he", "she"].includes(s.k)),
  ...[["my mother", "mother", "f"], ["my father", "father", "m"], ["my aunt", "aunt", "f"], ["my uncle", "uncle", "m"],
    ["my grandmother", "grandmother", "f"], ["my grandfather", "grandfather", "m"]]
    .map(([k, n, g]) => ({ k, np: () => NP(D("my").pe(1), N(n)), s3: true, be: "is", g })),
];

// verb frames: objects and places are all compatible with each other
const FRAMES = [
  { v: "eat", objs: ["rice", "a banana", "fried noodles", "bread", "an apple", "soup"], places: ["at home", "in the kitchen", "at a small restaurant"] },
  { v: "drink", objs: ["coffee", "tea", "a glass of milk", "orange juice"], places: ["at home", "at a coffee shop", "in the office"] },
  { v: "buy", objs: ["vegetables", "a new phone", "some fruit", "a birthday cake", "new shoes"], places: ["at the market", "at the mall", "at a small shop"] },
  { v: "cook", objs: ["fried rice", "dinner", "chicken soup", "breakfast"], places: ["in the kitchen", "at home"] },
  { v: "read", objs: ["a book", "the newspaper", "a comic", "a long email"], places: ["in the library", "on the bus", "in bed"] },
  { v: "write", objs: ["a letter", "an email", "a report", "a short story"], places: ["in the library", "at the office", "at school"] },
  { v: "watch", objs: ["a movie", "a horror film"], places: ["at the cinema", "at home"] },
  { v: "watch", objs: ["the news", "a football match"], places: ["on TV", "at home"] },
  { v: "play", objs: ["football", "badminton", "basketball"], places: ["in the park", "at school"] },
  { v: "play", objs: ["the guitar", "the piano"], places: ["at home", "at church"] },
  { v: "clean", objs: ["the kitchen", "the bathroom", "the house", "the car"], places: [] },
  { v: "visit", objs: ["the museum", "Bali", "the zoo", "Yogyakarta"], places: [] },
  { v: "study", objs: ["English", "math", "history"], places: ["in the library", "at home", "at school"] },
  { v: "go", objs: [], places: ["to the market", "to school", "to work", "to the beach", "to the mall", "to the doctor"] },
  { v: "work", objs: [], places: ["at a hospital", "at a bank", "in an office", "from home"], noCont: false },
  { v: "live", objs: [], places: ["in Jakarta", "in Bandung", "in Surabaya", "near the station", "in a small village"], stative: true },
  { v: "walk", objs: [], places: ["to school", "to the station", "in the park"] },
  { v: "swim", objs: [], places: ["in the pool", "in the sea"] },
  { v: "take", objs: ["the bus", "a taxi", "the train"], places: ["to work", "to school", "to the airport"] },
  { v: "wash", objs: ["the dishes", "the car", "the clothes"], places: [] },
  { v: "meet", objs: ["a friend", "the manager", "the new teacher"], places: ["at the station", "at a coffee shop"], person: true },
  { v: "make", objs: ["a cake", "coffee", "a sandwich"], places: ["in the kitchen", "at home"] },
  { v: "teach", objs: ["English", "math"], places: ["at a primary school", "at a university"] },
  { v: "sell", objs: ["vegetables", "old books", "clothes"], places: ["at the market", "online"] },
  { v: "fly", objs: [], places: ["to Bali", "to Medan", "to Jakarta"], once: true },
  { v: "see", objs: ["an old friend", "my teacher"], places: ["at the mall", "in the park"], person: true, once: true },
];
const ONE_OFF = new Set(["a new phone", "a birthday cake", "new shoes", "Bali", "Yogyakarta", "the museum", "the zoo", "a long email", "a short story", "a horror film"]);
const TIMES = {
  p: ["every day", "every morning", "every weekend", "every evening", "twice a week", "every Sunday"],
  pc: ["now", "right now", "at the moment"],
  ps: ["yesterday", "last night", "last week", "two days ago", "last Sunday", "last month"],
  f: ["tomorrow", "next week", "tonight", "this weekend", "next Monday", "next month"],
};

/* ---------- verb forms (from jsRealB) ---------- */
const vf = {};
function forms(v) {
  if (!vf[v]) vf[v] = { base: v, s3: R(V(v).t("p").pe(3)), past: R(V(v).t("ps")), ing: R(V(v).t("pr")), pp: R(V(v).t("pp")) };
  return vf[v];
}
const IRREGULAR = v => forms(v).past !== v + "ed" && forms(v).past !== v + "d" && !/ied$/.test(forms(v).past) && forms(v).past !== v + v.slice(-1) + "ed";
const naivePast = v => v.endsWith("e") ? v + "d" : v + "ed";
const verbFor = (sub, v, tense) => {
  const f = forms(v);
  if (tense === "p") return sub.s3 ? f.s3 : f.base;
  if (tense === "ps") return f.past;
  if (tense === "pc") return sub.be + " " + f.ing;
  if (tense === "f") return "will " + f.base;
};

/* A scenario = subject + verb frame + optional object/place/time in a tense.
   `say` builds the sentence from parts so wrong versions can swap one part;
   `check` compares it with jsRealB's own realization and drops anything that differs. */
function scenario(tense, opts = {}) {
  const subs = opts.subjects || SUBJECTS;
  for (let tries = 0; tries < 50; tries++) {
    const fr = pick(FRAMES);
    if (fr.stative && tense !== "p") continue;
    if (tense === "p" && fr.once) continue;
    if (opts.noPerson && fr.person) continue;
    if (opts.needObj && !fr.objs.length) continue;
    if (opts.needPlace && !fr.places.length) continue;
    const sub = pick(subs);
    const obj = fr.objs.length ? pick(fr.objs) : "";
    if (tense === "p" && ONE_OFF.has(obj)) continue;
    let place = fr.places.length && (opts.needPlace || !fr.objs.length || chance(0.5)) ? pick(fr.places) : "";
    if (!obj && !place) continue;
    let time = opts.noTime ? "" : (opts.time !== undefined ? opts.time : pick(TIMES[tense]));
    if (opts.shortQ && place && time && chance(0.5)) place = fr.objs.length ? "" : place;
    const sc = { sub, fr, obj, place, time, tense };
    sc.verb = verbFor(sub, fr.v, tense);
    sc.rest = join(obj, place, time);
    sc.text = cap(join(sub.k, sc.verb, sc.rest)) + ".";
    const parts = [V(fr.v)]; if (obj) parts.push(Q(obj)); if (place) parts.push(Q(place)); if (time) parts.push(Q(time));
    let s = S(sub.np(), VP(...parts)).t(tense === "pc" ? "p" : tense);
    if (tense === "pc") s = s.typ({ prog: true });
    const real = silent(() => R(s));
    if (real !== sc.text || real.includes("[[")) continue;
    return sc;
  }
  return null;
}
function questionOf(sc, kind) { // kind: yon | wad | whe | whn
  const parts = [V(sc.fr.v)];
  if (sc.obj && kind !== "wad") parts.push(Q(sc.obj));
  if (sc.place && kind !== "whe") parts.push(Q(sc.place));
  if (sc.time && kind !== "whn") parts.push(Q(sc.time));
  let s = S(sc.sub.np(), VP(...parts)).t(sc.tense === "pc" ? "p" : sc.tense);
  const typ = { int: kind }; if (sc.tense === "pc") typ.prog = true;
  return silent(() => R(s.typ(typ)));
}
const restWithout = (sc, kind) => join(kind === "wad" ? "" : sc.obj, kind === "whe" ? "" : sc.place, kind === "whn" ? "" : sc.time);
const subjInSentence = s => PROPER.has(s.k.split(" ")[0]) ? s.k : s.k.toLowerCase();
function timeFront(sc) {
  if (!sc.time || sc.time === "right now") return [];
  return [cap(sc.time) + ", " + join(subjInSentence(sc.sub), sc.verb, join(sc.obj, sc.place)) + "."];
}

/* ---------- item builders + validation ---------- */
const items = [];
const seen = new Set();
const quota = {};
function keyOf(q) { return q.topic + "|" + q.type + "|" + (q.answer || q.sentence || q.wrong).toLowerCase() + "|" + (q.wrong || q.sentence || ""); }
function firstKeep(sentence) { const w = sentence.split(/\s+/)[0].replace(/[.,!?]$/, ""); return PROPER.has(w) || /^I'/.test(w); }
function add(q) {
  q.alts = q.alts || [];
  if (!valid(q)) return false;
  const k = keyOf(q); if (seen.has(k)) return false;
  const qk = q.topic + "|" + q.type; if ((quota[qk] || 0) >= PER_MODE && !q.hand) return false;
  seen.add(k); quota[qk] = (quota[qk] || 0) + 1;
  if (q.type === "order") q.keep = firstKeep(q.answer);
  const out = { id: "", topic: q.topic, type: q.type };
  for (const f of ["sentence", "options", "answer", "alts", "correct", "wrong_word", "fix", "fix_options", "corrected", "wrong", "keep", "explain"]) if (q[f] !== undefined) out[f] = q[f];
  if (out.alts && !out.alts.length) delete out.alts;
  items.push(out);
  return true;
}
function valid(q) {
  const str = x => typeof x === "string" && x.trim().length > 0 && !x.includes("[[");
  if (!str(q.explain) || !str(q.topic)) return false;
  switch (q.type) {
    case "order": { const n = q.answer.split(/\s+/).length; return str(q.answer) && n >= 3 && n <= 13; }
    case "fill": return str(q.sentence) && (q.sentence.match(/_{3}/g) || []).length === 1 && q.options.length >= 3
      && q.options.every(str) && q.options.includes(q.answer) && uniq(q.options.map(o => o.toLowerCase())).length === q.options.length;
    case "spot":
      if (!str(q.sentence) || !str(q.corrected)) return false;
      if (q.correct) return true;
      return str(q.wrong_word) && str(q.fix) && q.fix_options.includes(q.fix) && uniq(q.fix_options).length === q.fix_options.length
        && count(q.sentence, q.wrong_word) === 1 && q.sentence !== q.corrected;
    case "rewrite": return str(q.wrong) && str(q.answer) && q.wrong.toLowerCase() !== q.answer.toLowerCase();
  }
  return false;
}
const need = (topic, type) => (quota[topic + "|" + type] || 0) < PER_MODE;
const full = topic => MODES.every(m => !need(topic, m));
function run(topic, fn, max = 40000) { for (let i = 0; i < max && !full(topic); i++) fn(); }
const gap = (sentence, word) => { // replace the one occurrence of `word` (may be several tokens) with ___
  const re = new RegExp("(^|\\s)" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[\\s.,?!]|$)", "g");
  const m = sentence.match(re); if (!m || m.length !== 1) return null;
  return sentence.replace(re, "$1___");
};
const spotFrom = (topic, correctText, wrongText, wrongWord, fix, fixOpts, explain) =>
  ({ topic, type: "spot", sentence: wrongText, correct: false, wrong_word: wrongWord, fix, fix_options: shuffle(uniq([fix, ...fixOpts.filter(o => o !== fix && o !== wrongWord)]).slice(0, 3)), corrected: correctText, explain });
const spotOk = (topic, text, explain) => ({ topic, type: "spot", sentence: text, correct: true, wrong_word: "", fix: "", fix_options: [], corrected: text, explain: "Correct. " + explain });

/* ================= topics ================= */

/* 1. am / is / are */
const ADJ = ["tired", "hungry", "happy", "busy", "sick", "late", "ready", "angry", "sleepy", "bored", "nervous", "excited", "thirsty", "cold", "sad"]
  .filter(a => !silent(() => R(A(a))).includes("[["));
const BE_PLACES = ["at home", "at school", "at work", "in the kitchen", "at the market", "in Bali"];
const beWhy = s => s.k === "I" ? "Use am with I." : s.s3 ? `Use is with he, she, it and one person or thing (${s.k}).` : `Use are with you, we, they and more than one person (${s.k}).`;
run("be_verb", () => {
  const sub = pick(SUBJECTS);
  const usePlace = chance(0.35);
  const adj = pick(ADJ); const comp = usePlace ? pick(BE_PLACES) : (chance(0.4) && !["late", "ready"].includes(adj) ? "very " : "") + adj;
  const time = usePlace ? pick(["now", "today", ""]) : pick(["today", "now", "", "this morning"]);
  const text = cap(join(sub.k, sub.be, comp, time)) + ".";
  const real = silent(() => R(S(sub.np(), VP(V("be"), Q(join(comp, time)))).t("p")));
  if (real !== text) return;
  const others = ["am", "is", "are"].filter(b => b !== sub.be);
  if (need("be_verb", "fill")) add({ topic: "be_verb", type: "fill", sentence: gap(text, sub.be), options: shuffle(["am", "is", "are", "be"]), answer: sub.be, explain: beWhy(sub) });
  if (need("be_verb", "spot")) {
    if (chance(0.25)) add(spotOk("be_verb", text, beWhy(sub)));
    else { const w = pick(others); add(spotFrom("be_verb", text, cap(join(sub.k, w, comp, time)) + ".", w, sub.be, ["am", "is", "are"], beWhy(sub))); }
  }
  if (need("be_verb", "rewrite") && !usePlace && chance(0.5))
    add({ topic: "be_verb", type: "rewrite", wrong: cap(join(sub.k, comp, time)) + ".", answer: text, alts: [], explain: `Before an adjective like ${comp.replace("very ", "")}, English needs am/is/are: ${sub.k} ${sub.be} ${comp}.` });
  if (need("be_verb", "rewrite") && chance(0.5)) { // "She is work at a bank" (am/is/are + normal verb)
    const sc = scenario("p"); if (sc && !sc.fr.stative || sc && chance(0.5)) {
      add({ topic: "be_verb", type: "rewrite", wrong: cap(join(sc.sub.k, sc.sub.be, sc.fr.v, sc.rest)) + ".", answer: sc.text, alts: timeFront(sc),
        explain: `Don't put am/is/are before a normal verb. Say: ${sc.sub.k} ${sc.verb}.` });
    }
  }
  if (need("be_verb", "order")) add({ topic: "be_verb", type: "order", answer: text, alts: time && time !== "now" ? [cap(time) + ", " + join(subjInSentence(sub), sub.be, comp) + "."] : [], explain: beWhy(sub) });
});

/* 2. he / she, his / her */
const JOBS = [["nurse", "at a hospital"], ["teacher", "at a primary school"], ["doctor", "at a clinic"], ["driver", "for a taxi company"],
  ["engineer", "at a big factory"], ["farmer", "in a village"], ["chef", "at a hotel"], ["accountant", "at a bank"], ["pilot", "for an airline"], ["dentist", "in Bandung"]]
  .filter(([j]) => !silent(() => R(N(j))).includes("[["));
const POSS = [
  { v: "lose", obj: "phone", tense: "ps", time: "yesterday" }, { v: "lose", obj: "wallet", tense: "ps", time: "last week" },
  { v: "wash", obj: "car", tense: "p", time: "every weekend" }, { v: "call", obj: "mother", tense: "ps", time: "last night" },
  { v: "clean", obj: "room", tense: "pc", time: "now" }, { v: "visit", obj: "grandmother", tense: "f", time: "next week" },
  { v: "forget", obj: "keys", tense: "ps", time: "this morning" }, { v: "fix", obj: "bike", tense: "pc", time: "right now" },
  { v: "help", obj: "brother", tense: "p", time: "every evening" }, { v: "sell", obj: "old laptop", tense: "ps", time: "last month" },
];
const genderWhy = s => s.g === "f" ? `${cap(s.k)} is a woman or girl, so use she and her.` : `${cap(s.k)} is a man or boy, so use he and his.`;
run("pronouns", () => {
  const sub = pick(GENDERED);
  const he = sub.g === "f" ? "She" : "He", his = sub.g === "f" ? "her" : "his";
  if (chance(0.5)) { // two sentences: job + pronoun
    const [job, where] = pick(JOBS);
    const a = silent(() => R(NP(D("a"), N(job))));
    const text = `${cap(sub.k)} is ${a}. ${he} works ${where}.`;
    if (need("pronouns", "fill")) add({ topic: "pronouns", type: "fill", sentence: `${cap(sub.k)} is ${a}. ___ works ${where}.`, options: shuffle(["He", "She", "It", "They"]), answer: he, explain: genderWhy(sub) });
    const wrongHe = he === "She" ? "He" : "She";
    if (need("pronouns", "spot")) add(chance(0.25) ? spotOk("pronouns", text, genderWhy(sub)) : spotFrom("pronouns", text, `${cap(sub.k)} is ${a}. ${wrongHe} works ${where}.`, wrongHe, he, ["He", "She", "It"], genderWhy(sub)));
    if (need("pronouns", "rewrite")) add({ topic: "pronouns", type: "rewrite", wrong: `${cap(sub.k)} is ${a}. ${wrongHe} works ${where}.`, answer: text, explain: genderWhy(sub) });
    return;
  }
  const p = pick(POSS);
  const verb = verbFor(sub, p.v, p.tense);
  const text = cap(join(sub.k, verb, his, p.obj, p.time)) + ".";
  let s = S(sub.np(), VP(V(p.v), Q(join(his, p.obj, p.time)))).t(p.tense === "pc" ? "p" : p.tense); if (p.tense === "pc") s = s.typ({ prog: true });
  if (silent(() => R(s)) !== text) return;
  const wrong = his === "her" ? "his" : "her";
  if (need("pronouns", "fill")) add({ topic: "pronouns", type: "fill", sentence: gap(text, his), options: shuffle(["his", "her", "its", "their"]), answer: his, explain: genderWhy(sub) });
  if (need("pronouns", "spot")) add(chance(0.25) ? spotOk("pronouns", text, genderWhy(sub)) : spotFrom("pronouns", text, cap(join(sub.k, verb, wrong, p.obj, p.time)) + ".", wrong, his, ["his", "her", "its"], genderWhy(sub)));
  if (need("pronouns", "rewrite")) add({ topic: "pronouns", type: "rewrite", wrong: cap(join(sub.k, verb, wrong, p.obj, p.time)) + ".", answer: text, explain: genderWhy(sub) });
  if (need("pronouns", "order")) add({ topic: "pronouns", type: "order", answer: text, explain: genderWhy(sub) });
});

/* 3. a / an */
const ART_NOUNS = [
  ["umbrella", "I need {} because it is raining."], ["egg", "She eats {} every morning."], ["apple", "He brings {} to school every day."],
  ["orange", "Can I have {}, please?"], ["hour", "We waited for {}."], ["idea", "I have {}."], ["uniform", "Students wear {} at my school."],
  ["university", "My brother studies at {} in Bandung."], ["email", "I sent {} to my teacher."], ["ticket", "She bought {} for the concert."],
  ["onion", "We need {} for the soup."], ["banana", "He ate {} after lunch."], ["elephant", "We saw {} at the zoo."],
  ["bike", "My sister rides {} to work."], ["car", "My father drives {}."], ["house", "They live in {}."], ["book", "I am reading {}."],
  ["answer", "Please write {} on the board."], ["island", "Bali is {}."], ["animal", "A cat is {}."], ["honest", null], ["question", "Can I ask {}?"],
];
const ART_ADJ = { car: ["old", "expensive", "new", "small"], house: ["old", "big", "beautiful"], book: ["interesting", "old", "useful"], question: ["easy", "important", "difficult"], answer: ["easy", "honest", "short"], island: ["beautiful", "small", "amazing"], animal: ["intelligent", "friendly", "unusual"], idea: ["interesting", "good", "unusual"] };
const ART_JOBS = ["doctor", "teacher", "engineer", "nurse", "artist", "architect", "accountant", "farmer", "actor", "student", "driver", "officer", "editor", "astronaut"]
  .filter(j => !silent(() => R(N(j))).includes("[["));
const anWhy = np => {
  const first = np.split(" ")[1];
  if (/^(hour|honest)/.test(first)) return `The h in ${first} is silent, so it starts with a vowel sound: ${np}.`;
  if (/^(uni|use|eu)/.test(first)) return `${cap(first)} starts with a "yoo" sound, which is a consonant sound, so use a: ${np}.`;
  return np.startsWith("an ") ? `Use an before a vowel sound: ${np}.` : `Use a before a consonant sound: ${np}.`;
};
run("articles", () => {
  if (chance(0.5)) {
    const [n, tpl] = pick(ART_NOUNS); if (!tpl) return;
    const adj = ART_ADJ[n] && chance(0.6) ? pick(ART_ADJ[n]) : "";
    const np = silent(() => R(adj ? NP(D("a"), A(adj), N(n)) : NP(D("a"), N(n)))); if (np.includes("[[")) return;
    const art = np.split(" ")[0], rest = np.slice(art.length + 1), other = art === "a" ? "an" : "a";
    const text = tpl.replace("{}", np), wrongText = tpl.replace("{}", other + " " + rest);
    if (need("articles", "fill")) add({ topic: "articles", type: "fill", sentence: tpl.replace("{}", "___ " + rest), options: ["a", "an", "—"], answer: art, explain: anWhy(np) });
    if (need("articles", "spot")) add(chance(0.25) ? spotOk("articles", text, anWhy(np)) : spotFrom("articles", text, wrongText, other, art, ["a", "an", "some"], anWhy(np)));
    if (need("articles", "rewrite") && chance(0.5)) add({ topic: "articles", type: "rewrite", wrong: wrongText, answer: text, explain: anWhy(np) });
    if (need("articles", "order")) add({ topic: "articles", type: "order", answer: text, explain: anWhy(np) });
  } else {
    const sub = pick(SUBJECTS.filter(s => !s.pl));
    const job = pick(ART_JOBS);
    const np = silent(() => R(NP(D("a"), N(job))));
    const text = cap(join(sub.k, sub.be, np)) + ".";
    const why = `Jobs need a or an in English: ${sub.k} ${sub.be} ${np}.`;
    const art = np.split(" ")[0], other = art === "a" ? "an" : "a";
    const pl = silent(() => R(N(job).n("p")));
    if (need("articles", "spot")) {
      if (chance(0.5)) add(spotFrom("articles", text, cap(join(sub.k, sub.be, job)) + ".", job, np, [np, other + " " + job, pl], why));
      else add(spotFrom("articles", text, cap(join(sub.k, sub.be, other, job)) + ".", other, art, ["a", "an", "the"], anWhy(np)));
    }
    if (need("articles", "rewrite")) add({ topic: "articles", type: "rewrite", wrong: cap(join(sub.k, sub.be, job)) + ".", answer: text, explain: why });
    if (need("articles", "fill")) add({ topic: "articles", type: "fill", sentence: cap(join(sub.k, sub.be, "___", job)) + ".", options: ["a", "an", "—"], answer: art, explain: anWhy(np) });
    if (need("articles", "order")) add({ topic: "articles", type: "order", answer: text, explain: why });
  }
});

/* 4. plurals */
const NUMS = ["two", "three", "four", "five", "six", "seven", "eight", "ten"];
const PL_HAVE = ["cat", "dog", "child", "box", "book", "bag", "toy", "watch", "brush", "fish"].filter(n => n !== "fish");
const PL_BUY = ["potato", "tomato", "glass", "knife", "dish", "book", "bag", "watch", "toy", "box", "candle"];
const PL_THERE = [["person", "in the room"], ["man", "in the office"], ["woman", "at the bus stop"], ["child", "in the park"], ["bus", "at the station"],
  ["leaf", "on the ground"], ["mouse", "in the kitchen"], ["city", "in this country"], ["tooth", "in his mouth"], ["foot", "on the floor"], ["sheep", "on the farm"], ["baby", "in the hospital"]];
const plWhy = (n, pl, num) => {
  if (n === pl) return `${cap(n)} has the same form for one and many: one ${n}, ${num} ${pl}.`;
  if (pl === n + "s") return `After a number bigger than one, use the plural: ${num} ${pl}.`;
  if (pl === n + "es") return `Nouns ending in s, x, ch, sh or o often add -es: ${pl}.`;
  if (pl.endsWith("ies")) return `A consonant + y becomes -ies: ${n} → ${pl}.`;
  if (pl.endsWith("ves")) return `Many nouns ending in f or fe change to -ves: ${n} → ${pl}.`;
  return `${cap(n)} has an irregular plural: one ${n}, ${num} ${pl}.`;
};
const wrongPlurals = (n, pl) => {
  const regular = pl === n + "s" || pl === n + "es";
  const c = [n];
  if (!regular) c.push(n + "s");                       // childs, mans, babys, knifes
  if (!regular && pl !== n) c.push(pl + "s");          // childrens, peoples
  if (pl === n + "es" && !n.endsWith("s")) c.push(n + "s"); // boxs, watchs, potatos (not "glasss")
  c.push(n + "'s");                                     // confusion with the possessive
  return uniq(c).filter(w => w !== pl);
};
run("plurals", () => {
  const num = pick(NUMS); let n, text, mk;
  const kind = pick(["have", "buy", "there"]);
  if (kind === "have") { n = pick(PL_HAVE); const sub = pick(SUBJECTS); const v = verbFor(sub, "have", "p"); mk = w => cap(join(sub.k, v, num, w)) + "."; }
  else if (kind === "buy") { n = pick(PL_BUY); const sub = pick(SUBJECTS); mk = w => cap(join(sub.k, "bought", num, w, "at the market")) + "."; }
  else { const [nn, where] = pick(PL_THERE); n = nn; mk = w => `There are ${num} ${w} ${where}.`; }
  const pl = silent(() => R(N(n).n("p"))); if (pl.includes("[[")) return;
  text = mk(pl);
  const why = plWhy(n, pl, num);
  const wrongs = wrongPlurals(n, pl);
  if (need("plurals", "fill")) add({ topic: "plurals", type: "fill", sentence: mk("___") .replace("___.", "___ .").replace(" .", ".") + ` (${n})`, options: shuffle([pl, ...shuffle(wrongs).slice(0, 3)]), answer: pl, explain: why });
  if (n !== pl) {
    const w = chance(0.6) ? n : pick(wrongs.filter(x => x !== n));
    if (need("plurals", "spot")) add(chance(0.25) ? spotOk("plurals", text, why) : spotFrom("plurals", text, mk(w), w, pl, [pl, ...wrongs.filter(x => x !== w)].slice(0, 3), why));
    if (need("plurals", "rewrite")) add({ topic: "plurals", type: "rewrite", wrong: mk(w), answer: text, explain: why });
  }
  if (need("plurals", "order")) add({ topic: "plurals", type: "order", answer: text, explain: why });
});

/* 5. there is / there are */
const THERE = [["cat", ["on the sofa", "in the garden", "under the bed"]], ["book", ["on the table", "in my bag", "on the shelf"]], ["bottle", ["in the fridge", "on the table"]],
  ["picture", ["on the wall"]], ["tree", ["in the garden", "near my house"]], ["car", ["in front of my house", "near the gate"]], ["student", ["in the classroom", "in the library"]],
  ["shop", ["near my house", "on this street"]], ["egg", ["in the fridge", "in the basket"]], ["restaurant", ["near the station", "on this street"]], ["chair", ["in the kitchen", "in the room"]],
  ["bird", ["in the garden", "on the roof"]], ["apple", ["in the basket", "on the table"]], ["mosque", ["near my house"]], ["hotel", ["near the beach"]], ["umbrella", ["near the door"]]];
run("there_is", () => {
  const [n, places] = pick(THERE), where = pick(places), plural = chance(0.5), num = pick(NUMS);
  const np = plural ? num + " " + silent(() => R(N(n).n("p"))) : silent(() => R(NP(D("a"), N(n))));
  const be = plural ? "are" : "is", other = plural ? "is" : "are";
  const text = `There ${be} ${np} ${where}.`;
  const why = plural ? `Use there are for more than one thing (${np}).` : `Use there is for one thing (${np}).`;
  const haveWhy = `To say that something exists, use there is / there are, not have: there ${be} ${np}.`;
  if (need("there_is", "fill")) add({ topic: "there_is", type: "fill", sentence: `There ___ ${np} ${where}.`, options: shuffle(["is", "are", "have", "has"]), answer: be, explain: why });
  if (need("there_is", "spot")) {
    const r = rnd();
    if (r < 0.25) add(spotOk("there_is", text, why));
    else if (r < 0.65) add(spotFrom("there_is", text, `There ${other} ${np} ${where}.`, other, be, ["is", "are", "have"], why));
    else { const h = plural ? "have" : "has"; add(spotFrom("there_is", text, `There ${h} ${np} ${where}.`, h, be, [be, other, "be"], haveWhy)); }
  }
  if (need("there_is", "rewrite")) {
    if (chance(0.6)) add({ topic: "there_is", type: "rewrite", wrong: `${cap(where)} have ${np}.`, answer: text, alts: [`${cap(where)}, there ${be} ${np}.`, `${cap(where)} there ${be} ${np}.`], explain: haveWhy });
    else add({ topic: "there_is", type: "rewrite", wrong: `There ${other} ${np} ${where}.`, answer: text, explain: why });
  }
  if (need("there_is", "order")) add({ topic: "there_is", type: "order", answer: text, alts: [`${cap(where)}, there ${be} ${np}.`], explain: why });
});

/* 6. present simple */
const s3Why = sc => sc.sub.s3
  ? `With he, she, it or one person (${sc.sub.k}), the present simple verb takes -s: ${sc.verb}.`
  : `With I, you, we, they or more than one person (${sc.sub.k}), use the base verb: ${sc.verb}.`;
run("pres_simple", () => {
  const sc = scenario("p"); if (!sc) return;
  const f = forms(sc.fr.v);
  const wrongV = sc.sub.s3 ? f.base : f.s3;
  const wrongText = cap(join(sc.sub.k, wrongV, sc.rest)) + ".";
  if (need("pres_simple", "fill")) { const g = gap(sc.text, sc.verb); if (g) add({ topic: "pres_simple", type: "fill", sentence: g + ` (${f.base})`, options: shuffle(uniq([sc.verb, wrongV, f.ing, f.past])), answer: sc.verb, explain: s3Why(sc) }); }
  if (need("pres_simple", "spot")) add(chance(0.25) ? spotOk("pres_simple", sc.text, s3Why(sc)) : spotFrom("pres_simple", sc.text, wrongText, wrongV, sc.verb, [sc.verb, f.ing, f.past], s3Why(sc)));
  if (need("pres_simple", "rewrite")) {
    const r = rnd();
    if (r < 0.4) add({ topic: "pres_simple", type: "rewrite", wrong: wrongText, answer: sc.text, alts: timeFront(sc), explain: s3Why(sc) });
    else if (r < 0.75) { // negative
      const neg = silent(() => R(S(sc.sub.np(), VP(V(sc.fr.v), ...[sc.obj, sc.place, sc.time].filter(Boolean).map(x => Q(x)))).t("p").typ({ neg: true, contr: true })));
      const negLong = silent(() => R(S(sc.sub.np(), VP(V(sc.fr.v), ...[sc.obj, sc.place, sc.time].filter(Boolean).map(x => Q(x)))).t("p").typ({ neg: true })));
      const aux = sc.sub.s3 ? "doesn't" : "don't", wAux = sc.sub.s3 ? "don't" : "doesn't";
      if (neg.includes(" " + aux + " ")) add({ topic: "pres_simple", type: "rewrite", wrong: neg.replace(" " + aux + " ", " " + wAux + " "), answer: neg, alts: [negLong],
        explain: sc.sub.s3 ? `With he, she, it or one person, the negative is doesn't (does not).` : `With I, you, we, they, the negative is don't (do not).` });
    } else { // question with -s after does
      if (!sc.sub.s3) return;
      const q = questionOf(sc, "yon");
      if (q.startsWith("Does ")) add({ topic: "pres_simple", type: "rewrite", wrong: q.replace(" " + f.base + " ", " " + f.s3 + " ").replace(new RegExp(" " + f.base + "\\?$"), " " + f.s3 + "?"), answer: q, explain: `Does already has the -s, so the main verb stays in the base form: does … ${f.base}.` });
    }
  }
  if (need("pres_simple", "order")) add({ topic: "pres_simple", type: "order", answer: sc.text, alts: timeFront(sc), explain: s3Why(sc) });
});

/* 7. in / on / at */
const PREP_TIMES = {
  p: [["on", "on Sundays", "day"], ["on", "on Fridays", "day"], ["in", "in the morning", "part"], ["in", "in the evening", "part"], ["in", "in the afternoon", "part"], ["at", "at night", "night"], ["at", "at noon", "clock"], ["at", "at 7 a.m.", "clock"]],
  ps: [["on", "on Monday", "day"], ["on", "on 17 August", "date"], ["in", "in May", "month"], ["in", "in 2020", "year"], ["at", "at 6 p.m.", "clock"], ["in", "in the morning", "part"], ["at", "at midnight", "clock"]],
  f: [["on", "on Friday", "day"], ["on", "on Saturday", "day"], ["in", "in December", "month"], ["at", "at noon", "clock"], ["at", "at 8 o'clock", "clock"], ["in", "in the evening", "part"]],
};
const PREP_WHY = {
  day: "Use on with days: on Monday, on Sundays.", date: "Use on with dates: on 17 August.", month: "Use in with months: in May.",
  year: "Use in with years: in 2020.", part: "Use in with parts of the day: in the morning, in the evening.",
  night: "Night is special: at night (but in the morning).", clock: "Use at with clock times: at 7 a.m., at noon, at midnight.",
  city: "Use in with cities and countries: in Jakarta.", point: "Use at for places like home, school and work: at home.",
};
const PREP_PLACES = [["in", "in Jakarta", "city"], ["in", "in Bandung", "city"], ["in", "in Japan", "city"], ["at", "at home", "point"], ["at", "at school", "point"], ["at", "at work", "point"]];
run("prepositions", () => {
  let text, prep, phrase, why, mk;
  if (chance(0.75)) {
    const tense = pick(["p", "ps", "f"]); const [p, ph, kind] = pick(PREP_TIMES[tense]);
    const sc = scenario(tense, { time: ph }); if (!sc || /^(at|in|on) /.test(sc.place)) return;
    prep = p; phrase = ph; why = PREP_WHY[kind]; text = sc.text;
    mk = w => cap(join(sc.sub.k, sc.verb, sc.obj, sc.place, w + ph.slice(p.length))) + ".";
  } else {
    const sub = pick(SUBJECTS); const [p, ph, kind] = pick(PREP_PLACES);
    const v = kind === "city" ? verbFor(sub, "live", "p") : sub.be;
    prep = p; phrase = ph; why = PREP_WHY[kind];
    const time = kind === "city" ? "" : pick(["now", "today", ""]);
    mk = w => cap(join(sub.k, v, w + ph.slice(p.length), time)) + ".";
    text = mk(p);
  }
  const others = ["in", "on", "at"].filter(x => x !== prep);
  if (count(text, prep) !== 1) return;
  if (need("prepositions", "fill")) add({ topic: "prepositions", type: "fill", sentence: mk("___"), options: ["in", "on", "at"], answer: prep, explain: why });
  const w = pick(others);
  if (need("prepositions", "spot")) add(chance(0.25) ? spotOk("prepositions", text, why) : spotFrom("prepositions", text, mk(w), w, prep, ["in", "on", "at"], why));
  if (need("prepositions", "rewrite")) add({ topic: "prepositions", type: "rewrite", wrong: mk(w), answer: text, explain: why });
  if (need("prepositions", "order")) add({ topic: "prepositions", type: "order", answer: text, alts: [], explain: why });
});

/* 8. present continuous */
const pcWhy = sc => `For an action happening now, use am/is/are + verb-ing: ${sc.sub.k} ${sc.verb}.`;
run("pres_cont", () => {
  const sc = scenario("pc"); if (!sc) return;
  const f = forms(sc.fr.v);
  const simple = sc.sub.s3 ? f.s3 : f.base;
  if (need("pres_cont", "fill")) { const g = gap(sc.text, sc.verb); if (g) add({ topic: "pres_cont", type: "fill", sentence: g + ` (${f.base})`, options: shuffle(uniq([sc.verb, simple, f.ing, sc.sub.be + " " + f.base])), answer: sc.verb, explain: pcWhy(sc) }); }
  if (need("pres_cont", "spot")) {
    const r = rnd();
    if (r < 0.25) add(spotOk("pres_cont", sc.text, pcWhy(sc)));
    else if (r < 0.65) add(spotFrom("pres_cont", sc.text, cap(join(sc.sub.k, sc.sub.be, f.base, sc.rest)) + ".", f.base, f.ing, [f.ing, f.s3, f.past], pcWhy(sc)));
    else { const wb = pick(["am", "is", "are"].filter(b => b !== sc.sub.be)); add(spotFrom("pres_cont", sc.text, cap(join(sc.sub.k, wb, f.ing, sc.rest)) + ".", wb, sc.sub.be, ["am", "is", "are"], beWhy(sc.sub))); }
  }
  if (need("pres_cont", "rewrite")) add({ topic: "pres_cont", type: "rewrite", wrong: cap(join(sc.sub.k, f.ing, sc.rest)) + ".", answer: sc.text, alts: timeFront(sc), explain: `The -ing form needs am/is/are before it: ${sc.sub.k} ${sc.verb}.` });
  if (need("pres_cont", "order")) add({ topic: "pres_cont", type: "order", answer: sc.text, alts: timeFront(sc), explain: pcWhy(sc) });
});

/* 9. past simple */
const pastWhy = sc => {
  const f = forms(sc.fr.v), t = sc.time ? cap(sc.time) : "This";
  return IRREGULAR(sc.fr.v) ? `${t} is in the past, so the verb changes. ${cap(f.base)} is irregular: ${f.base} → ${f.past}.` : `${t} is in the past, so add -ed: ${f.base} → ${f.past}.`;
};
run("past", () => {
  const sc = scenario("ps"); if (!sc) return;
  const f = forms(sc.fr.v); if (f.past === f.base) return;
  const naive = naivePast(f.base);
  const wrongForms = uniq([f.base, f.s3, IRREGULAR(f.base) ? naive : f.ing]).filter(x => x !== f.past);
  if (need("past", "fill")) { const g = gap(sc.text, sc.verb); if (g) add({ topic: "past", type: "fill", sentence: g + ` (${f.base})`, options: shuffle([f.past, ...wrongForms]), answer: f.past, explain: pastWhy(sc) }); }
  if (need("past", "spot")) add(chance(0.2) ? spotOk("past", sc.text, pastWhy(sc)) : spotFrom("past", sc.text, cap(join(sc.sub.k, f.base, sc.rest)) + ".", f.base, f.past, [f.past, ...wrongForms.filter(x => x !== f.base)], pastWhy(sc)));
  if (need("past", "rewrite")) {
    const r = rnd();
    if (r < 0.35) {
      const q = questionOf(sc, "yon");
      if (q.startsWith("Did ") && count(q, f.base) === 1) add({ topic: "past", type: "rewrite", wrong: q.replace(new RegExp(" " + f.base + "(?=[ ?])"), " " + f.past), answer: q, explain: `After did, use the base verb (${f.base}). Did already shows the past.` });
    } else if (r < 0.7) {
      const base = S(sc.sub.np(), VP(V(sc.fr.v), ...[sc.obj, sc.place, sc.time].filter(Boolean).map(x => Q(x)))).t("ps");
      const neg = silent(() => R(base.typ({ neg: true, contr: true })));
      const negLong = silent(() => R(S(sc.sub.np(), VP(V(sc.fr.v), ...[sc.obj, sc.place, sc.time].filter(Boolean).map(x => Q(x)))).t("ps").typ({ neg: true })));
      if (neg.includes("didn't " + f.base + " ") || neg.endsWith("didn't " + f.base + "."))
        add({ topic: "past", type: "rewrite", wrong: neg.replace("didn't " + f.base, "didn't " + f.past), answer: neg, alts: [negLong], explain: `After didn't, use the base verb: didn't ${f.base}.` });
    } else add({ topic: "past", type: "rewrite", wrong: cap(join(sc.sub.k, f.base, sc.rest)) + ".", answer: sc.text, alts: timeFront(sc), explain: pastWhy(sc) });
  }
  if (need("past", "order")) add({ topic: "past", type: "order", answer: sc.text, alts: timeFront(sc), explain: pastWhy(sc) });
});

/* 10. questions */
const AUX = { p: s => (s.s3 ? "does" : "do"), ps: () => "did", f: () => "will" };
const qWhy = (tense, aux) => tense === "f" ? "Question order: question word + will + subject + base verb."
  : `Question order: question word + ${aux} + subject + base verb.`;
run("questions", () => {
  const tense = pick(["p", "ps", "f"]);
  const kind = pick(["wad", "whe", "whn", "yon"]);
  const sc = scenario(tense, { needObj: kind === "wad", needPlace: kind === "whe", shortQ: true, noPerson: kind === "wad", subjects: SUBJECTS.filter(s => s.k !== "I") }); if (!sc) return;
  if (kind === "whn" && !sc.time) return;
  const f = forms(sc.fr.v), aux = AUX[tense](sc.sub);
  const q = questionOf(sc, kind); if (q.includes("[[") || !q.endsWith("?")) return;
  const why = qWhy(tense, aux);
  const wh = { wad: "What", whe: "Where", whn: "When" }[kind];
  // order
  if (need("questions", "order")) add({ topic: "questions", type: "order", answer: q, explain: why });
  // fill: aux gap (needs a time word so only one aux fits)
  if (kind !== "yon" && kind !== "whn" && sc.time && need("questions", "fill")) {
    const opts = { p: ["does", "do", "is", "are"], ps: ["did", "does", "do", "was"], f: ["will", "does", "is", "did"] }[tense];
    const g = q.replace(new RegExp("^" + wh + " " + aux + " "), wh + " ___ ");
    if (g !== q) add({ topic: "questions", type: "fill", sentence: g, options: shuffle(opts), answer: aux, explain: why });
  }
  // spot: wrong verb form after the auxiliary
  if (need("questions", "spot")) {
    const wrongV = tense === "p" ? f.s3 : tense === "ps" ? f.past : f.s3;
    if (wrongV !== f.base && count(q, f.base) === 1) {
      const wrong = q.replace(new RegExp(" " + f.base + "(?=[ ?])"), " " + wrongV);
      const fwhy = tense === "f" ? `After will, use the base verb: will … ${f.base}.` : `After ${aux}, use the base verb: ${aux} … ${f.base}.`;
      add(chance(0.25) ? spotOk("questions", q, fwhy) : spotFrom("questions", q, wrong, wrongV, f.base, [f.base, f.ing, wrongV === f.past ? f.s3 : f.past], fwhy));
    }
  }
  // rewrite: statement word order used as a question
  if (kind !== "yon" && need("questions", "rewrite")) {
    const wrong = join(wh, subjInSentence(sc.sub), sc.verb, restWithout(sc, kind)) + "?";
    add({ topic: "questions", type: "rewrite", wrong, answer: q, explain: why + (tense === "f" ? "" : ` Don't keep the statement order (${subjInSentence(sc.sub)} ${sc.verb}).`) });
  }
});

/* 11. future */
const willWhy = sc => `After will, use the base verb: will ${forms(sc.fr.v).base}.`;
run("future", () => {
  const sc = scenario("f"); if (!sc) return;
  const f = forms(sc.fr.v);
  if (chance(0.5)) { // will
    if (need("future", "fill")) { const g = gap(sc.text, sc.verb); if (g) add({ topic: "future", type: "fill", sentence: g + ` (${f.base})`, options: shuffle(["will " + f.base, "will " + f.s3, "will to " + f.base, "will " + f.ing]), answer: sc.verb, explain: willWhy(sc) }); }
    if (need("future", "spot")) add(chance(0.25) ? spotOk("future", sc.text, willWhy(sc)) : spotFrom("future", sc.text, cap(join(sc.sub.k, "will", f.s3, sc.rest)) + ".", f.s3, f.base, [f.base, f.ing, f.past], willWhy(sc)));
    if (need("future", "rewrite")) add({ topic: "future", type: "rewrite", wrong: cap(join(sc.sub.k, "will to", f.base, sc.rest)) + ".", answer: sc.text, alts: [...timeFront(sc), sc.sub.k === "I" ? cap(join("I'll", f.base, sc.rest)) + "." : ""].filter(Boolean), explain: "After will, use the base verb without to." });
    if (need("future", "order")) add({ topic: "future", type: "order", answer: sc.text, alts: timeFront(sc), explain: willWhy(sc) });
  } else { // going to
    const going = join(sc.sub.be, "going to", f.base);
    const text = cap(join(sc.sub.k, going, sc.rest)) + ".";
    const why = `Going to needs am/is/are: ${sc.sub.k} ${sc.sub.be} going to ${f.base}.`;
    if (need("future", "fill")) add({ topic: "future", type: "fill", sentence: cap(join(sc.sub.k, "___", sc.rest)) + `. (${f.base})`, options: shuffle([going, "going to " + f.base, sc.sub.be + " going " + f.base, sc.sub.be + " going to " + f.ing]), answer: going, explain: why });
    const wb = pick(["am", "is", "are"].filter(b => b !== sc.sub.be));
    if (need("future", "spot")) add(chance(0.25) ? spotOk("future", text, why) : spotFrom("future", text, cap(join(sc.sub.k, wb, "going to", f.base, sc.rest)) + ".", wb, sc.sub.be, ["am", "is", "are"], beWhy(sc.sub)));
    if (need("future", "rewrite")) add({ topic: "future", type: "rewrite", wrong: cap(join(sc.sub.k, "going to", f.base, sc.rest)) + ".", answer: text, explain: why });
    if (need("future", "order")) add({ topic: "future", type: "order", answer: text, explain: why });
  }
});

/* 12. comparatives */
const CMP_THINGS = [["bag", ["cheap", "expensive", "heavy", "big", "small"]], ["phone", ["cheap", "expensive", "fast", "new", "old"]], ["room", ["big", "small", "clean", "quiet", "comfortable"]],
  ["road", ["busy", "quiet", "long", "dangerous"]], ["test", ["easy", "difficult", "long"]], ["chair", ["comfortable", "cheap", "heavy"]], ["shirt", ["cheap", "expensive", "beautiful", "big"]],
  ["car", ["fast", "expensive", "old", "big", "modern"]], ["book", ["interesting", "long", "easy", "thick"]], ["hotel", ["cheap", "expensive", "modern", "comfortable"]]];
const CMP_PEOPLE = [["my brother", "my sister"], ["Budi", "Andi"], ["Rina", "Dewi"], ["my father", "my uncle"], ["my mother", "my aunt"]];
const CMP_PEOPLE_ADJ = ["tall", "old", "young", "busy", "strong", "fast", "rich", "short", "good at math"];
const CMP_FACTS = [["Jakarta", "big", "Bandung"], ["Jakarta", "busy", "Bandung"], ["Jakarta", "hot", "Bandung"], ["Bandung", "cool", "Jakarta"], ["A car", "fast", "a bicycle"],
  ["An elephant", "heavy", "a horse"], ["Gold", "expensive", "silver"], ["The sun", "big", "the moon"], ["Summer", "hot", "winter"], ["A plane", "fast", "a train"], ["Bali", "famous", "Lombok"]];
function cmp(adj) {
  if (adj === "good at math") return { co: "better at math", su: "best at math", kind: "irr", base: "good" };
  const co = silent(() => R(A(adj).f("co"))), su = silent(() => R(A(adj).f("su")));
  const kind = co.startsWith("more ") ? "long" : (adj === "good" || adj === "bad" || adj === "far") ? "irr" : "short";
  return { co, su, kind, base: adj };
}
const cmpWhy = (adj, c) => c.kind === "long" ? `Long adjectives use more: ${c.co}.` : c.kind === "irr" ? `${cap(c.base)} is irregular: ${c.base} → ${c.co.split(" ")[0]}.`
  : /y$/.test(c.base) ? `Short adjectives ending in y change to -ier: ${c.base} → ${c.co}.` : c.co.endsWith(c.base.slice(-1) + c.base.slice(-1) + "er") ? `Double the last letter, then add -er: ${c.base} → ${c.co}.` : `Short adjectives add -er: ${c.base} → ${c.co}.`;
run("comparatives", () => {
  let mk, adj, sub;
  const r = rnd();
  if (r < 0.45) { const [n, adjs] = pick(CMP_THINGS); adj = pick(adjs); mk = x => `This ${n} is ${x} than that one.`; }
  else if (r < 0.8) { const [a, b] = pick(CMP_PEOPLE); adj = pick(CMP_PEOPLE_ADJ); mk = x => `${cap(a)} is ${x} than ${b}.`; }
  else { const [a, ad, b] = pick(CMP_FACTS); adj = ad; mk = x => `${a} is ${x} than ${b}.`; }
  const c = cmp(adj); if (c.co.includes("[[")) return;
  const tail = adj === "good at math" ? " at math" : "";
  const word = adj.split(" ")[0];
  const text = mk(c.co), why = cmpWhy(adj, c);
  const wrongs = c.kind === "long" ? [word + tail, "most " + word + tail, word + "er" + tail] : uniq(["more " + word + tail, "more " + c.co, c.su, word + tail]).filter(x => x !== c.co);
  if (need("comparatives", "fill")) add({ topic: "comparatives", type: "fill", sentence: mk("___") + ` (${word})`, options: shuffle([c.co, ...wrongs.slice(0, 3)]), answer: c.co, explain: why });
  if (need("comparatives", "spot")) {
    const rr = rnd();
    if (rr < 0.25) add(spotOk("comparatives", text, why));
    else if (rr < 0.6 && count(text, "than") === 1 && !text.includes("that")) { const w = pick(["that", "then"]); add(spotFrom("comparatives", text, text.replace(" than ", ` ${w} `), w, "than", ["than", w === "that" ? "then" : "that", "as"], "Comparisons use than: taller than, cheaper than.")); }
    else if (c.kind === "long") add(spotFrom("comparatives", text, mk(word + "er" + tail), word + "er", c.co.split(" ").slice(0, 2).join(" "), [c.co.split(" ").slice(0, 2).join(" "), "most " + word, word + "est"], why));
    else if (c.kind === "irr" && c.base === "good") add(spotFrom("comparatives", text, mk("gooder" + tail), "gooder", "better", ["better", "best", "more good"], why));
  }
  if (need("comparatives", "rewrite")) {
    const wrong = c.kind === "long" ? mk(word + "er" + tail) : mk("more " + c.co);
    add({ topic: "comparatives", type: "rewrite", wrong, answer: text, explain: c.kind === "long" ? why : "Use -er or more, never both: " + c.co + ", not more " + c.co + "." });
  }
  if (need("comparatives", "order")) add({ topic: "comparatives", type: "order", answer: text, explain: why });
});

/* ---------- hand-written ---------- */
for (const q of require("./handwritten.js")) { const h = { ...q, hand: true, alts: q.alts || [] }; if (!add(h) && !seen.has(keyOf(h))) console.error("Hand-written item failed validation:", q.sentence || q.wrong || q.answer); }

/* ---------- output ---------- */
items.forEach((q, i) => { q.id = q.topic.slice(0, 3) + i.toString(36); });
const byTopic = {};
for (const q of items) { byTopic[q.topic] = byTopic[q.topic] || {}; byTopic[q.topic][q.type] = (byTopic[q.topic][q.type] || 0) + 1; }
console.table(byTopic);
const out = path.join(__dirname, "..", "data", "questions.json");
fs.writeFileSync(out, JSON.stringify({ version: new Date().toISOString().slice(0, 10), count: items.length, items }));
console.log(`Wrote ${items.length} questions to ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
