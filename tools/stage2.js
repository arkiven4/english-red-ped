// Stage 2 topics, following the Basic English for IELTS course (lessons 2–20).
// Sentences are assembled from word banks; verb, plural and adjective forms come from jsRealB (via `forms`, `R`).
module.exports = function stage2(ctx) {
const { add, need, run, pick, chance, shuffle, cap, join, R, silent, forms, SUBJECTS, spotFrom, spotOk, gap, count, uniq, rnd, PROPER, NUMS } = ctx;
const NO = "—"; // shown as "(no word)" in the app
["Japan", "China", "Sumatra", "Indonesia", "Everest", "Mount", "Russia", "Korean", "French", "Japanese", "Lombok", "Asia", "Paris", "London", "Monday", "December", "IELTS", "Nile", "Sahara"].forEach(w => PROPER.add(w));
const s3 = v => forms(v).s3, past = v => forms(v).past, pp = v => forms(v).pp, ing = v => forms(v).ing;
const beP = sub => sub.k === "I" ? "am" : sub.s3 ? "is" : "are";
const beS = sub => (sub.k === "I" || sub.s3) ? "was" : "were";
const has = sub => sub.s3 ? "has" : "have";
const subj = s => (PROPER.has(s.k.split(" ")[0]) ? s.k : s.k);
const people = SUBJECTS.filter(s => s.k !== "you" || true);

/* ===== Lesson 2: adjectives vs adverbs ===== */
const FAM = { careful: ["carefully", "care"], quick: ["quickly", "speed"], fluent: ["fluently", "fluency"], clear: ["clearly", "clarity"], polite: ["politely", "politeness"],
  beautiful: ["beautifully", "beauty"], slow: ["slowly", "slowness"], quiet: ["quietly", "silence"], easy: ["easily", "ease"], happy: ["happily", "happiness"],
  successful: ["successfully", "success"], good: ["well", "goodness"], hard: ["hard", "hardly"], fast: ["fast", "fastly"], bad: ["badly", "badness"], correct: ["correctly", "correction"] };
const ADV_FRAMES = [["speak", "English", ["fluently", "clearly", "quickly", "slowly", "well", "quietly", "badly"]], ["drive", "", ["carefully", "fast", "slowly", "badly", "well"]],
  ["work", "", ["hard", "quickly", "carefully", "well"]], ["sing", "", ["beautifully", "well", "badly", "quietly"]], ["answer", "the questions", ["correctly", "politely", "clearly", "quickly"]],
  ["explain", "the rules", ["clearly", "well", "slowly", "carefully"]], ["finish", "the test", ["easily", "quickly", "successfully"]], ["write", "", ["clearly", "carefully", "beautifully", "well"]]];
const ADJ_FRAMES = [["a", "driver", ["careful", "fast", "good", "bad", "slow"]], ["a", "speaker", ["fluent", "clear", "good", "quiet"]], ["a", "student", ["hardworking", "polite", "quiet", "successful", "good"]],
  ["a", "singer", ["beautiful", "good", "successful"]], ["an", "answer", ["easy", "clear", "correct", "quick"]], ["a", "worker", ["hard", "fast", "careful", "good"]]];
const adjOf = adv => Object.keys(FAM).find(a => FAM[a][0] === adv);
run("adj_adv", () => {
  const sub = pick(SUBJECTS);
  if (chance(0.6)) { // adverb slot
    const [v, obj, advs] = pick(ADV_FRAMES), adv = pick(advs), adj = adjOf(adv); if (!adj) return;
    const verb = sub.s3 ? s3(v) : v, very = ["well", "fast", "hard"].includes(adv) || chance(0.5) ? "" : "very";
    const text = cap(join(sub.k, verb, obj, very, adv)) + ".";
    const why = adv === "well" ? "Good is an adjective. The adverb is well: speaks well, works well." : adv === "hard" ? "Hard is both an adjective and an adverb: work hard. Hardly means almost not." :
      adv === "fast" ? "Fast is both an adjective and an adverb. There is no word fastly." : `Use an adverb to say how someone does something: ${verb} ${adv} (not ${adj}).`;
    const opts = uniq([adv, adj, FAM[adj][1]]);
    if (need("adj_adv", "fill")) add({ topic: "adj_adv", type: "fill", sentence: cap(join(sub.k, verb, obj, very, "___")) + ".", options: shuffle(opts), answer: adv, explain: why });
    if (adj !== adv && need("adj_adv", "spot")) add(chance(0.25) ? spotOk("adj_adv", text, why) : spotFrom("adj_adv", text, cap(join(sub.k, verb, obj, very, adj)) + ".", adj, adv, opts, why));
    if (adj !== adv && need("adj_adv", "rewrite")) add({ topic: "adj_adv", type: "rewrite", wrong: cap(join(sub.k, verb, obj, very, adj)) + ".", answer: text, explain: why });
    if (need("adj_adv", "order")) add({ topic: "adj_adv", type: "order", answer: text, explain: why });
  } else { // adjective slot
    const [, noun, adjs] = pick(ADJ_FRAMES), adj = pick(adjs);
    const np = silent(() => R(NP(D("a"), A(adj), N(noun)))); if (np.includes("[[")) return;
    const subj1 = pick(SUBJECTS.filter(s => !s.pl && s.k !== "I" && s.k !== "you"));
    const text = cap(join(subj1.k, "is", np)) + ".";
    const adv = FAM[adj] ? FAM[adj][0] : null;
    const why = `Use an adjective before a noun: ${np}. Adverbs (like ${adv || adj + "ly"}) describe verbs, not nouns.`;
    if (!adv || adv === adj) { if (need("adj_adv", "order")) add({ topic: "adj_adv", type: "order", answer: text, explain: why }); return; }
    const art = np.split(" ")[0];
    const mk = w => cap(join(subj1.k, "is", silent(() => R(NP(D("a"), Q(w), N(noun)))).replace(/^an? /, art + " "), "")).trim().replace(/\s+\./, ".") ;
    const wrongText = cap(join(subj1.k, "is", art, adv, noun)) + ".";
    if (need("adj_adv", "fill")) add({ topic: "adj_adv", type: "fill", sentence: cap(join(subj1.k, "is", art, "___", noun)) + ".", options: shuffle(uniq([adj, adv, FAM[adj][1]])), answer: adj, explain: why });
    if (need("adj_adv", "spot")) add(spotFrom("adj_adv", text, wrongText, adv, adj, [adj, FAM[adj][1], adv + "s"], why));
    if (need("adj_adv", "rewrite")) add({ topic: "adj_adv", type: "rewrite", wrong: wrongText, answer: text, explain: why });
    void mk;
  }
});

/* ===== Lessons 3 + 14: conjunctions and linking words (shared clause bank) ===== */
const CAUSE = [ // [result, reason]
  ["I stayed at home", "it was raining"], ["she was very tired", "she worked late"], ["we took a taxi", "the bus was late"], ["he passed the exam", "he studied hard"],
  ["the shop was closed", "it was a public holiday"], ["I was hungry", "I didn't eat breakfast"], ["they cancelled the match", "the weather was bad"], ["she went to the doctor", "she felt sick"],
  ["he bought a new phone", "his old phone was broken"], ["we were late", "there was a lot of traffic"], ["the library was closed", "it was Sunday"], ["many students failed", "the test was very difficult"],
  ["I couldn't sleep", "my neighbors were very noisy"], ["she got the scholarship", "her IELTS score was high"], ["the streets were wet", "it rained all night"], ["the flight was delayed", "there was a storm"], ["she wore a coat", "it was cold"], ["we ordered pizza", "nobody wanted to cook"], ["he was late for work", "his alarm didn't ring"], ["the price went up", "demand increased"]];
const CONTRAST = [ // [a, b] — b is surprising after a
  ["the exam was difficult", "most students passed"], ["it was raining", "we went to the beach"], ["he is rich", "he is not happy"], ["the hotel was expensive", "the rooms were small"],
  ["she studied hard", "she failed the test"], ["the phone is cheap", "it works very well"], ["he is very smart", "he is lazy"], ["the restaurant was full", "we found a table"],
  ["fast food is unhealthy", "many people eat it every day"], ["cars cause pollution", "they are still widely used"], ["I was tired", "I finished my homework"], ["the city is crowded", "it is very clean"], ["the car is old", "it runs well"], ["she is only ten", "she speaks three languages"], ["the test was short", "it was very difficult"], ["we left early", "we missed the train"]];
const ADDITION = [["I enjoy reading", "I love writing"], ["the city has good food", "it has beautiful beaches"], ["the course is cheap", "it is very useful"], ["the hotel is near the beach", "it has a big pool"],
  ["the museum is free", "it has a nice café"], ["the new library is big", "it is open every day"], ["this laptop is light", "its battery lasts all day"], ["online classes are flexible", "they save time"]];
const capFirst = s => cap(s);
run("conjunctions", () => {
  const r = rnd();
  if (r < 0.5) {
    const [res, why0] = pick(CAUSE);
    if (chance(0.5)) { // because
      const text = `${capFirst(res)} because ${why0}.`, why = "Because introduces the reason: result + because + reason.";
      if (need("conjunctions", "fill")) add({ topic: "conjunctions", type: "fill", sentence: `${capFirst(res)} ___ ${why0}.`, options: shuffle(["because", "so", "but", "although"]), answer: "because", explain: why });
      if (need("conjunctions", "spot")) add(chance(0.25) ? spotOk("conjunctions", text, why) : spotFrom("conjunctions", text, `${capFirst(res)} so ${why0}.`, "so", "because", ["because", "but", "although"], "So introduces a result, not a reason. Here the second part is the reason, so use because."));
      if (need("conjunctions", "order")) add({ topic: "conjunctions", type: "order", answer: text, alts: [`Because ${why0}, ${res}.`], explain: "A complex sentence: main clause + because + reason. You can also start with the because-clause and add a comma." });
      if (need("conjunctions", "rewrite")) add({ topic: "conjunctions", type: "rewrite", wrong: `Because ${why0}. ${capFirst(res)}.`, answer: `Because ${why0}, ${res}.`, alts: [text], explain: "A because-clause alone is not a complete sentence. Join it to the main clause." });
    } else { // so
      const text = `${capFirst(why0)}, so ${res}.`, why = "So introduces the result: reason + comma + so + result.";
      if (need("conjunctions", "fill")) add({ topic: "conjunctions", type: "fill", sentence: `${capFirst(why0)}, ___ ${res}.`, options: shuffle(["so", "because", "although", "or"]), answer: "so", explain: why });
      if (need("conjunctions", "spot")) add(spotFrom("conjunctions", text, `${capFirst(why0)}, because ${res}.`, "because", "so", ["so", "but", "or"], "Because introduces a reason. Here the second part is the result, so use so."));
      if (need("conjunctions", "order")) add({ topic: "conjunctions", type: "order", answer: text, explain: why });
    }
  } else {
    const [a, b] = pick(CONTRAST);
    if (chance(0.5)) {
      const text = `Although ${a}, ${b}.`, why = "Although starts a contrast clause. Use although or but, never both.";
      if (need("conjunctions", "fill")) add({ topic: "conjunctions", type: "fill", sentence: `___ ${a}, ${b}.`, options: shuffle(["Although", "Because", "So", "If"]), answer: "Although", explain: "Although shows a surprising contrast: Although + clause, main clause." });
      if (need("conjunctions", "rewrite")) add({ topic: "conjunctions", type: "rewrite", wrong: `Although ${a}, but ${b}.`, answer: text, alts: [`${capFirst(a)}, but ${b}.`, `${capFirst(b)} although ${a}.`], explain: why });
      if (need("conjunctions", "order")) add({ topic: "conjunctions", type: "order", answer: text, alts: [`${capFirst(b)} although ${a}.`], explain: why });
      if (need("conjunctions", "spot")) add(spotFrom("conjunctions", text, `Because ${a}, ${b}.`, "Because", "Although", ["Although", "So", "If"], "The second part is surprising, not a result. Use although for contrast."));
    } else {
      const text = `${capFirst(a)}, but ${b}.`, why = "But joins two contrasting ideas in a compound sentence: clause + comma + but + clause.";
      if (need("conjunctions", "fill")) add({ topic: "conjunctions", type: "fill", sentence: `${capFirst(a)}, ___ ${b}.`, options: shuffle(["but", "so", "because", "or"]), answer: "but", explain: why });
      if (need("conjunctions", "spot")) add(chance(0.25) ? spotOk("conjunctions", text, why) : spotFrom("conjunctions", text, `${capFirst(a)}, so ${b}.`, "so", "but", ["but", "because", "or"], "The ideas contrast, so use but. So is for results."));
      if (need("conjunctions", "order")) add({ topic: "conjunctions", type: "order", answer: text, explain: why });
    }
  }
});
const LINK = { contrast: ["However", "Nevertheless"], result: ["Therefore", "As a result", "Consequently"], addition: ["Moreover", "In addition", "Furthermore"] };
const LINK_WHY = { contrast: "However and nevertheless show a surprising contrast between two sentences.", result: "Therefore, as a result and consequently introduce a result.", addition: "Moreover, in addition and furthermore add more information." };
run("linking", () => {
  const kind = pick(["contrast", "result", "addition"]);
  const [a, b] = kind === "contrast" ? pick(CONTRAST) : kind === "result" ? (([res, rs]) => [rs, res])(pick(CAUSE)) : pick(ADDITION);
  const word = pick(LINK[kind]);
  const text = `${capFirst(a)}. ${word}, ${b}.`;
  const others = Object.keys(LINK).filter(k => k !== kind).map(k => LINK[k][0]);
  if (need("linking", "fill")) add({ topic: "linking", type: "fill", sentence: `${capFirst(a)}. ___, ${b}.`, options: shuffle([word, ...others, "Because"]), answer: word, explain: LINK_WHY[kind] });
  const wrongWord = pick(others), wk = Object.keys(LINK).find(k => LINK[k][0] === wrongWord);
  if (need("linking", "spot")) add(chance(0.25) ? spotOk("linking", text, LINK_WHY[kind]) : spotFrom("linking", text, `${capFirst(a)}. ${wrongWord}, ${b}.`, wrongWord + ",", word, [word, ...others.filter(o => o !== wrongWord)], `${LINK_WHY[kind]} ${wrongWord} is for ${wk === "addition" ? "adding information" : wk === "result" ? "results" : "contrast"}.`));
  if (need("linking", "rewrite")) add({ topic: "linking", type: "rewrite", wrong: `${capFirst(a)}. ${wrongWord}, ${b}.`, answer: text, alts: LINK[kind].filter(w => w !== word).map(w => `${capFirst(a)}. ${w}, ${b}.`), explain: LINK_WHY[kind] });
});

/* ===== Lesson 4: subject–verb agreement ===== */
const AG_PEOPLE = [["Everyone", true, "Everyone, everybody, someone, nobody and no one always take a singular verb."], ["Everybody", true, "Everyone, everybody, someone, nobody and no one always take a singular verb."],
  ["Nobody", true, "Nobody is singular, so the verb takes -s."], ["Someone", true, "Someone is singular, so the verb takes -s."], ["Each student", true, "Each + singular noun takes a singular verb."],
  ["Every teacher", true, "Every + singular noun takes a singular verb."], ["One of my friends", true, "The subject is one, not friends, so use a singular verb."], ["One of the students", true, "The subject is one, not students, so use a singular verb."],
  ["My sister and her friend", false, "Two subjects joined by and are plural, so use the base verb."], ["Budi and Rina", false, "Two subjects joined by and are plural."], ["The students in my class", false, "The subject is students (plural). The phrase in my class doesn't change that."],
  ["My parents", false, "My parents is plural, so use the base verb."], ["Neither of my brothers", true, "Neither of … takes a singular verb in formal English."]];
const AG_VP = [["like", "the new teacher"], ["live", "in Jakarta"], ["work", "very hard"], ["need", "a laptop for this course"], ["speak", "English well"], ["want", "to visit Bali"],
  ["go", "to school by bus"], ["enjoy", "this class"], ["know", "the answer"], ["play", "badminton on Sundays"], ["study", "in the library every day"], ["watch", "the news every evening"]];
const AG_THINGS = [["The price of these shoes", true, "too high"], ["The quality of these products", true, "very good"], ["The color of the flowers", true, "beautiful"], ["The number of students", true, "increasing"],
  ["The results of the test", false, "surprising"], ["The books on the shelf", false, "very old"], ["The information in this report", true, "useful"], ["The news", true, "good today"]];
run("agreement", () => {
  if (chance(0.7)) {
    const [s, sing, why] = pick(AG_PEOPLE), [v, rest] = pick(AG_VP);
    if (s === "Neither of my brothers" && v === "live") return;
    const good = sing ? s3(v) : v, bad = sing ? v : s3(v);
    const text = `${s} ${good} ${rest}.`;
    if (need("agreement", "fill")) add({ topic: "agreement", type: "fill", sentence: `${s} ___ ${rest}. (${v})`, options: shuffle(uniq([good, bad, ing(v), "are " + v])), answer: good, explain: why });
    if (need("agreement", "spot")) add(chance(0.25) ? spotOk("agreement", text, why) : spotFrom("agreement", text, `${s} ${bad} ${rest}.`, bad, good, [good, ing(v), past(v)], why));
    if (need("agreement", "rewrite")) add({ topic: "agreement", type: "rewrite", wrong: `${s} ${bad} ${rest}.`, answer: text, explain: why });
    if (need("agreement", "order")) add({ topic: "agreement", type: "order", answer: text, explain: why });
  } else {
    const [s, sing, rest] = pick(AG_THINGS);
    const be = sing ? "is" : "are", other = sing ? "are" : "is";
    const why = s === "The news" ? "News is uncountable and singular: the news is." : sing ? `The main noun is ${s.split(" ")[1]} (singular), so use is. The words after of don't change it.` : `The main noun is ${s.split(" ")[1]} (plural), so use are.`;
    const text = `${s} ${be} ${rest}.`;
    if (need("agreement", "fill")) add({ topic: "agreement", type: "fill", sentence: `${s} ___ ${rest}.`, options: shuffle(["is", "are", "be", "am"]), answer: be, explain: why });
    if (need("agreement", "spot")) add(spotFrom("agreement", text, `${s} ${other} ${rest}.`, other, be, ["is", "are", "be"], why));
    if (need("agreement", "rewrite")) add({ topic: "agreement", type: "rewrite", wrong: `${s} ${other} ${rest}.`, answer: text, explain: why });
  }
});

/* ===== Lesson 5: present simple vs present continuous ===== */
const STATIVE = [["know", "the answer"], ["like", "spicy food"], ["want", "a new laptop"], ["need", "more time"], ["understand", "the question"], ["believe", "his story"], ["prefer", "tea to coffee"], ["own", "two cars"]];
const ACTIONS = [["study", "English"], ["cook", "dinner"], ["watch", "TV"], ["read", "a book"], ["play", "football"], ["write", "an email"], ["work", "from home"], ["drink", "coffee"]];
run("pres_contrast", () => {
  const sub = pick(SUBJECTS.filter(s => s.k !== "you"));
  const r = rnd();
  if (r < 0.4) { // stative verbs never take -ing
    const [v, obj] = pick(STATIVE), now = pick(["now", "right now", "at the moment", ""]);
    const good = sub.s3 ? s3(v) : v, bad = beP(sub) + " " + ing(v);
    const text = cap(join(sub.k, good, obj, now)) + ".";
    const why = `${cap(v)} is a state verb (know, like, want, need, understand…). State verbs don't use -ing, even now.`;
    if (need("pres_contrast", "fill")) add({ topic: "pres_contrast", type: "fill", sentence: cap(join(sub.k, "___", obj, now)) + `. (${v})`, options: shuffle(uniq([good, bad, ing(v), sub.s3 ? v : s3(v)])), answer: good, explain: why });
    if (need("pres_contrast", "rewrite")) add({ topic: "pres_contrast", type: "rewrite", wrong: cap(join(sub.k, bad, obj, now)) + ".", answer: text, explain: why });
    if (need("pres_contrast", "order")) add({ topic: "pres_contrast", type: "order", answer: text, explain: why });
  } else {
    const [v, obj] = pick(ACTIONS), habit = chance(0.5);
    const time = habit ? pick(["every day", "every evening", "on Sundays", "twice a week"]) : pick(["now", "right now", "at the moment"]);
    const simple = sub.s3 ? s3(v) : v, cont = beP(sub) + " " + ing(v);
    const good = habit ? simple : cont, bad = habit ? cont : simple;
    const text = cap(join(sub.k, good, obj, time)) + ".";
    const why = habit ? `${cap(time)} shows a habit, so use the present simple: ${good}.` : `${cap(time)} shows an action happening now, so use the present continuous: ${good}.`;
    if (need("pres_contrast", "fill")) add({ topic: "pres_contrast", type: "fill", sentence: cap(join(sub.k, "___", obj, time)) + `. (${v})`, options: shuffle(uniq([good, bad, ing(v), past(v)])), answer: good, explain: why });
    if (need("pres_contrast", "rewrite")) add({ topic: "pres_contrast", type: "rewrite", wrong: cap(join(sub.k, bad, obj, time)) + ".", answer: text, explain: why });
    if (need("pres_contrast", "spot") && !habit) add(chance(0.25) ? spotOk("pres_contrast", text, why) : spotFrom("pres_contrast", text, cap(join(sub.k, beP(sub), v, obj, time)) + ".", v, ing(v), [ing(v), s3(v), past(v)], why));
    if (need("pres_contrast", "spot") && habit && chance(0.25)) add(spotOk("pres_contrast", text, why));
    if (need("pres_contrast", "order")) add({ topic: "pres_contrast", type: "order", answer: text, explain: why });
  }
});

/* ===== Lesson 6: past continuous ===== */
const PC_PAIRS = [[["read", "a book"], "my phone rang"], [["cook", "dinner"], "the lights went out"], [["watch", "TV"], "someone knocked on the door"], [["play", "football"], "it started to rain"],
  [["drive", "to work"], "I saw an accident"], [["walk", "home"], "I met an old friend"], [["take", "a shower"], "the doorbell rang"], [["write", "the test"], "the fire alarm rang"],
  [["study", "in the library"], "my friend called me"], [["wait", "for the bus"], "it started to rain"], [["sleep", ""], "the earthquake happened"], [["eat", "lunch"], "my boss came in"]];
run("past_cont", () => {
  const sub = pick(SUBJECTS.filter(s => s.k !== "you")), [[v, obj], short] = pick(PC_PAIRS);
  if (/^I /.test(short) && ["I", "we"].includes(sub.k)) return;
  const was = beS(sub), cont = `${was} ${ing(v)}`;
  const text = cap(join(sub.k, cont, obj)) + ` when ${short}.`;
  const why = `Use was/were + -ing for the longer action in progress (${cont}), and the past simple for the short action that interrupted it.`;
  if (need("past_cont", "fill")) add({ topic: "past_cont", type: "fill", sentence: cap(join(sub.k, "___", obj)) + ` when ${short}. (${v})`, options: shuffle(uniq([cont, past(v), (was === "was" ? "were " : "was ") + ing(v), beP(sub) + " " + ing(v)])), answer: cont, explain: why });
  if (need("past_cont", "spot")) {
    if (chance(0.5)) { const w = was === "was" ? "were" : "was"; if (sub.k !== "I" || w === "were") add(spotFrom("past_cont", text, cap(join(sub.k, w, ing(v), obj)) + ` when ${short}.`, w, was, ["was", "were", "is"], `Use was with I, he, she, it and one person; were with you, we, they.`)); }
    else add(chance(0.3) ? spotOk("past_cont", text, why) : spotFrom("past_cont", text, cap(join(sub.k, was, v, obj)) + ` when ${short}.`, v, ing(v), [ing(v), past(v), s3(v)], why));
  }
  if (need("past_cont", "rewrite")) add({ topic: "past_cont", type: "rewrite", wrong: cap(join(sub.k, ing(v), obj)) + ` when ${short}.`, answer: text, alts: [`When ${short}, ${join(sub.k === "I" || PROPER.has(sub.k.split(" ")[0]) ? sub.k : sub.k, cont, obj)}.`], explain: `The -ing form needs was/were: ${sub.k} ${cont}.` });
  if (need("past_cont", "order")) add({ topic: "past_cont", type: "order", answer: text, alts: [`When ${short}, ${join(sub.k, cont, obj)}.`], explain: why });
});

/* ===== Lesson 8: present perfect (and vs past simple) ===== */
const PP_FRAMES = [["live", "in Jakarta"], ["work", "at this company"], ["study", "English"], ["know", "my best friend"], ["teach", "at this school"], ["play", "the piano"], ["be", "a nurse"]];
const SINCE = ["since 2015", "since last year", "since January", "since I was a child"], FOR = ["for five years", "for two months", "for a long time", "for three weeks"];
const EVENTS = [["visit", "Bali"], ["finish", "the report"], ["eat", "lunch"], ["write", "three essays"], ["see", "that movie"], ["lose", "my keys"], ["take", "the IELTS test"], ["buy", "a new laptop"], ["go", "to Japan"], ["break", "the window"]];
run("pres_perfect", () => {
  const sub = pick(SUBJECTS.filter(s => s.k !== "you"));
  const r = rnd();
  if (r < 0.45) { // duration: since / for
    const [v, rest] = pick(PP_FRAMES), useSince = chance(0.5), dur = pick(useSince ? SINCE : FOR);
    if (v === "be" && sub.pl) return;
    const good = `${has(sub)} ${pp(v)}`, text = cap(join(sub.k, good, rest, dur)) + ".";
    const why = `For something that started in the past and continues now, use has/have + past participle: ${good}. ${useSince ? "Since + a starting point." : "For + a length of time."}`;
    if (need("pres_perfect", "fill") && chance(0.5)) add({ topic: "pres_perfect", type: "fill", sentence: cap(join(sub.k, "___", rest, dur)) + `. (${v})`, options: shuffle(uniq([good, past(v), beP(sub) + " " + ing(v), (sub.s3 ? "have " : "has ") + pp(v)])), answer: good, explain: why });
    else if (need("pres_perfect", "fill")) add({ topic: "pres_perfect", type: "fill", sentence: cap(join(sub.k, good, rest, "___", dur.split(" ").slice(1).join(" "))) + ".", options: ["since", "for", "from", "in"], answer: useSince ? "since" : "for", explain: useSince ? "Use since with a starting point: since 2015, since January." : "Use for with a length of time: for five years, for two months." });
    if (need("pres_perfect", "spot")) { const w = sub.s3 ? "have" : "has"; add(chance(0.25) ? spotOk("pres_perfect", text, why) : spotFrom("pres_perfect", text, cap(join(sub.k, w, pp(v), rest, dur)) + ".", w, has(sub), ["has", "have", "is"], "Use has with he, she, it and one person; have with I, you, we, they.")); }
    if (need("pres_perfect", "rewrite")) add({ topic: "pres_perfect", type: "rewrite", wrong: cap(join(sub.k, v === "be" ? beP(sub) : sub.s3 ? s3(v) : v, rest, dur)) + ".", answer: text, explain: `With since/for, use the present perfect, not the present simple: ${good}.` });
    if (need("pres_perfect", "order")) add({ topic: "pres_perfect", type: "order", answer: text, explain: why });
  } else { // experience / finished: present perfect vs past simple
    const [v, obj] = pick(EVENTS);
    const pastTime = pick(["last year", "yesterday", "two days ago", "in 2020", "last week"]);
    const adv = pick(["already", "just", "never", "twice"]);
    const ppText = adv === "twice" ? cap(join(sub.k, has(sub), pp(v), obj, "twice")) + "." : cap(join(sub.k, has(sub), adv, pp(v), obj)) + ".";
    const psText = cap(join(sub.k, past(v), obj, pastTime)) + ".";
    const whyPs = `${cap(pastTime)} is a finished time, so use the past simple: ${past(v)}. Don't use has/have with a finished time.`;
    const whyPp = `With ${adv} and no finished time, use has/have + past participle: ${has(sub)} ${pp(v)}.`;
    if (need("pres_perfect", "fill")) {
      if (chance(0.5)) add({ topic: "pres_perfect", type: "fill", sentence: cap(join(sub.k, "___", obj, pastTime)) + `. (${v})`, options: shuffle(uniq([past(v), `${has(sub)} ${pp(v)}`, v, `${has(sub)} ${past(v)}`])), answer: past(v), explain: whyPs });
      else if (pp(v) !== past(v)) add({ topic: "pres_perfect", type: "fill", sentence: (adv === "twice" ? cap(join(sub.k, has(sub), "___", obj, "twice")) : cap(join(sub.k, has(sub), adv, "___", obj))) + `. (${v})`, options: shuffle(uniq([pp(v), past(v), v, ing(v)])), answer: pp(v), explain: `After has/have, use the past participle: ${v} → ${pp(v)}.` });
    }
    if (need("pres_perfect", "rewrite")) add({ topic: "pres_perfect", type: "rewrite", wrong: cap(join(sub.k, has(sub), pp(v), obj, pastTime)) + ".", answer: psText, explain: whyPs });
    if (need("pres_perfect", "spot") && pp(v) !== past(v)) add(chance(0.25) ? spotOk("pres_perfect", ppText, whyPp) : spotFrom("pres_perfect", ppText, ppText.replace(" " + pp(v) + " ", " " + past(v) + " "), past(v), pp(v), [pp(v), v, ing(v)], `After has/have, use the past participle, not the past simple: ${v} → ${past(v)} → ${pp(v)}.`));
    if (need("pres_perfect", "order")) { const usePp = chance(0.5); add({ topic: "pres_perfect", type: "order", answer: usePp ? ppText : psText, explain: usePp ? whyPp : whyPs }); }
  }
});

/* ===== Lesson 9: relative clauses ===== */
const REL = [
  ["who", "the teacher", "helped me with my essay", "is very kind"], ["who", "the man", "lives next door", "is a doctor"], ["who", "the student", "won the prize", "is from Medan"],
  ["who", "the woman", "called you", "is my aunt"], ["who", "the doctor", "treated my father", "works at this hospital"], ["who", "the girl", "sits next to me", "speaks three languages"],
  ["which", "the laptop", "has a big screen", "is mine"], ["which", "the bus", "goes to the airport", "leaves at 7 a.m."], ["which", "the report", "was published yesterday", "is very long"],
  ["which", "the book", "I read last week", "was interesting"], ["which", "the phone", "I bought", "was expensive"], ["which", "the movie", "we watched", "was amazing"],
  ["where", "the park", "we met", "is beautiful"], ["where", "the city", "I was born", "is very big"], ["where", "the restaurant", "we had dinner", "is closed now"], ["where", "the school", "my mother teaches", "is near here"],
  ["whose", "the student", "book I borrowed", "is my friend"], ["whose", "the man", "car was stolen", "called the police"], ["whose", "the woman", "son is a pilot", "lives next door"], ["whose", "the company", "products are popular", "is hiring new staff"],
  ["who", "the boy", "broke the window", "has said sorry"], ["who", "the nurse", "took care of me", "was very friendly"], ["who", "the people", "live upstairs", "are very noisy"], ["who", "the scientist", "discovered this method", "won a prize"],
  ["which", "the car", "is parked outside", "belongs to my uncle"], ["which", "the shoes", "I bought yesterday", "are too small"], ["which", "the museum", "opened last year", "is very popular"], ["which", "the email", "you sent me", "was very helpful"],
  ["where", "the hotel", "we stayed", "was near the beach"], ["where", "the village", "my grandparents live", "has no internet"], ["where", "the office", "she works", "is in the city center"], ["where", "the café", "we usually study", "is closed today"],
  ["whose", "the girl", "phone was lost", "is in my class"], ["whose", "the author", "book won the prize", "is from Indonesia"], ["whose", "the teacher", "class I joined", "is very strict"], ["whose", "the family", "house burned down", "is staying with us"]];
const relWhy = { who: "Use who for people.", which: "Use which (or that) for things.", where: "Use where for places: the place where something happens.", whose: "Use whose for possession: the man whose car… = his car." };
run("relative", () => {
  const [rel, noun, clause, rest] = pick(REL);
  const text = `${cap(noun)} ${rel} ${clause} ${rest}.`;
  const opts = ["who", "which", "where", "whose"];
  if (need("relative", "fill")) add({ topic: "relative", type: "fill", sentence: `${cap(noun)} ___ ${clause} ${rest}.`, options: opts, answer: rel, explain: relWhy[rel] });
  const wrong = rel === "who" ? "which" : rel === "which" ? "who" : rel === "where" ? "which" : "who";
  if (need("relative", "spot")) add(chance(0.25) ? spotOk("relative", text, relWhy[rel]) : spotFrom("relative", text, `${cap(noun)} ${wrong} ${clause} ${rest}.`, wrong, rel, opts, relWhy[rel]));
  if (need("relative", "rewrite")) {
    const subjClause = /^(helped|lives|won|called|treated|sits|has|goes|was published)/.test(clause);
    if (subjClause) add({ topic: "relative", type: "rewrite", wrong: `${cap(noun)} ${rel} ${rel === "who" ? (noun.match(/woman|girl/) ? "she" : "he") : "it"} ${clause} ${rest}.`, answer: text, alts: rel === "which" ? [`${cap(noun)} that ${clause} ${rest}.`] : [], explain: `Who/which already replaces the subject, so don't add ${rel === "who" ? "he/she" : "it"} after it.` });
    else add({ topic: "relative", type: "rewrite", wrong: `${cap(noun)} ${wrong} ${clause} ${rest}.`, answer: text, alts: rel === "which" ? [`${cap(noun)} that ${clause} ${rest}.`] : [], explain: relWhy[rel] });
  }
  if (need("relative", "order")) add({ topic: "relative", type: "order", answer: text, alts: rel === "which" ? [`${cap(noun)} that ${clause} ${rest}.`] : [], explain: relWhy[rel] });
});

/* ===== Lesson 10: conditionals ===== */
const C_SUBS = { I: { s3: false }, plants: { s3: false }, you: { s3: false }, we: { s3: false }, they: { s3: false }, he: { s3: true }, she: { s3: true }, it: { s3: true }, "the machine": { s3: true }, "the weather": { s3: true } };
const COND = [ // [subj, verb, rest] → [subj, verb, rest], types
  [["you", "study", "hard"], ["you", "pass", "the exam"], [1, 2, 3]], [["it", "rain"], ["we", "stay", "at home"], [1, 2, 3]], [["she", "leave", "early"], ["she", "catch", "the bus"], [1, 2, 3]],
  [["we", "take", "a taxi"], ["we", "arrive", "on time"], [1, 2, 3]], [["he", "eat", "breakfast"], ["he", "feel", "better"], [1, 2, 3]], [["they", "practice", "every day"], ["they", "win", "the match"], [1, 2, 3]],
  [["the weather", "be", "nice"], ["we", "go", "to the beach"], [1, 2, 3]], [["she", "speak", "English well"], ["she", "get", "the job"], [1, 2, 3]], [["I", "have", "more money"], ["I", "visit", "Japan"], [1, 2, 3]],
  [["I", "know", "the answer"], ["I", "tell", "you"], [2, 3]], [["I", "win", "the lottery"], ["I", "buy", "a big house"], [1, 2]], [["I", "be", "you"], ["I", "accept", "the offer"], [2]],
  [["you", "heat", "ice"], ["it", "melt"], [0]], [["you", "mix", "red and blue"], ["you", "get", "purple"], [0]], [["water", "reach", "100 degrees"], ["it", "boil"], [0]],
  [["you", "press", "this button"], ["the machine", "start"], [0, 1]], [["plants", "get", "enough sunlight"], ["they", "grow", "quickly"], [0]], [["you", "don't sleep", "enough"], ["you", "feel", "tired"], [0]]];
const cform = (s, v, kind) => { // kind: pres | will | past | would | pastperf | wouldhave
  const sing = (C_SUBS[s] || { s3: false }).s3 || s === "water";
  if (v === "don't sleep") return { pres: sing ? "doesn't sleep" : "don't sleep" }[kind];
  if (v === "be") return { pres: s === "I" ? "am" : sing ? "is" : "are", will: "will be", past: "were", would: "would be", pastperf: "had been", wouldhave: "would have been" }[kind];
  return { pres: sing ? s3(v) : v, will: "will " + v, past: past(v), would: "would " + v, pastperf: "had " + pp(v), wouldhave: "would have " + pp(v) }[kind];
};
const CTYPE = { 0: ["pres", "pres", "Zero conditional (facts): If + present simple, present simple."], 1: ["pres", "will", "First conditional (real future): If + present simple, will + base verb."],
  2: ["past", "would", "Second conditional (unreal or imagined): If + past simple, would + base verb. With be, use were: If I were you…"], 3: ["pastperf", "wouldhave", "Third conditional (imagined past): If + had + past participle, would have + past participle."] };
run("conditionals", () => {
  let [[cs, cv, cr], [rs, rv, rr], types] = pick(COND); const t = pick(types);
  if (cs === rs && ["I", "you", "we", "they", "he", "she"].includes(cs) && !/\byou\b/.test(rr || "") && cv !== "be" && t !== 0) { const ns = pick(["I", "you", "we", "they", "he", "she"]); cs = rs = ns; }
  const [ck, rk, why] = CTYPE[t];
  const ifc = join(cs, cform(cs, cv, ck), cr || ""), res = join(rs, cform(rs, rv, rk), rr || "");
  const text = `If ${ifc}, ${res}.`, alt = `${cap(res)} if ${ifc}.`;
  if (need("conditionals", "fill")) {
    if (chance(0.5) && rv !== "be") { const opts = uniq([cform(rs, rv, rk), ...["pres", "will", "would", "wouldhave"].filter(k => k !== rk).map(k => cform(rs, rv, k))]).slice(0, 4);
      add({ topic: "conditionals", type: "fill", sentence: `If ${ifc}, ${rs} ___ ${rr || ""}`.trim() + `. (${rv})`, options: shuffle(opts), answer: cform(rs, rv, rk), explain: why }); }
    else if (cv !== "don't sleep") { const opts = uniq([cform(cs, cv, ck), ...["pres", "will", "past", "pastperf"].filter(k => k !== ck).map(k => cform(cs, cv, k))]).slice(0, 4);
      if (!(t === 0 && opts.includes(cform(cs, cv, "pres")) && ck !== "pres")) add({ topic: "conditionals", type: "fill", sentence: `If ${cs} ___ ${cr || ""}`.trim() + `, ${res}. (${cv})`, options: shuffle(opts), answer: cform(cs, cv, ck), explain: why }); }
  }
  if (need("conditionals", "spot") && (t === 2 || t === 1)) {
    const wrongW = t === 2 ? "will" : "would", fixW = t === 2 ? "would" : "will";
    if (cform(rs, rv, rk).startsWith(fixW + " ")) add(chance(0.25) ? spotOk("conditionals", text, why) : spotFrom("conditionals", text, text.replace(`, ${rs} ${fixW} `, `, ${rs} ${wrongW} `), wrongW, fixW, ["would", "will", "had"], why));
  }
  if (need("conditionals", "rewrite") && t === 1 && cv !== "don't sleep") add({ topic: "conditionals", type: "rewrite", wrong: `If ${join(cs, "will " + (cv === "be" ? "be" : cv), cr || "")}, ${res}.`, answer: text, alts: [alt], explain: "Don't use will in the if-clause. Use the present simple after if, even for the future." });
  if (need("conditionals", "rewrite") && t === 2) add({ topic: "conditionals", type: "rewrite", wrong: `If ${join(cs, "would " + cv, cr || "")}, ${res}.`, answer: text, alts: [alt, ...(cv === "be" && cs === "I" ? [`If I was you, ${res}.`] : [])], explain: "Don't use would in the if-clause. Second conditional: If + past simple, would + base verb." });
  if (need("conditionals", "order")) add({ topic: "conditionals", type: "order", answer: text, alts: [alt], explain: why });
});

/* ===== Lesson 11: passive voice ===== */
const PASSIVE = { p: [["English", "speak", "in many countries", 1], ["These phones", "make", "in China", 0], ["The office", "clean", "every day", 1], ["Rice", "grow", "in many parts of Indonesia", 1],
    ["The letters", "deliver", "every morning", 0], ["Coffee", "produce", "in Sumatra", 1], ["This room", "use", "for meetings", 1], ["The museum", "visit", "by thousands of tourists every year", 1], ["Most cars", "make", "by machines", 0], ["Tea", "drink", "all over the world", 1], ["The rooms", "clean", "twice a week", 0], ["Newspapers", "sell", "at the station", 0], ["The exam", "hold", "every three months", 1], ["Spanish", "speak", "in Mexico", 1], ["Many toys", "make", "from plastic", 0], ["The gates", "close", "at 10 p.m.", 0], ["Bread", "bake", "here every morning", 1]],
  ps: [["The bridge", "build", "in 1990", 1], ["This book", "write", "by a famous author", 1], ["The windows", "break", "during the storm", 0], ["The report", "publish", "last week", 1], ["The thief", "catch", "by the police", 1],
    ["The results", "announce", "yesterday", 0], ["My bike", "steal", "last night", 1], ["The emails", "send", "this morning", 0], ["The school", "build", "in 1985", 1], ["The students", "give", "a test", 0], ["The telephone", "invent", "in 1876", 1], ["The match", "cancel", "because of the rain", 1], ["The prizes", "give", "to the best students", 0], ["The wallet", "find", "under the bed", 1], ["These photos", "take", "in Bali", 0], ["The car", "repair", "last week", 1], ["The new rules", "explain", "at the meeting", 0], ["Two people", "hurt", "in the accident", 0], ["The cake", "eat", "in five minutes", 1], ["Our flight", "delay", "for three hours", 1]],
  f: [["The results", "announce", "next week", 0], ["A new hospital", "build", "next year", 1], ["The meeting", "hold", "on Monday", 1], ["The package", "deliver", "tomorrow", 1], ["New rules", "introduce", "next month", 0], ["The new library", "open", "in May", 1], ["Your results", "send", "by email", 0], ["The winners", "choose", "next Friday", 0], ["The road", "close", "tomorrow", 1]] };
run("passive", () => {
  const tense = pick(["p", "ps", "f"]), [s, v, rest, sing] = pick(PASSIVE[tense]);
  const be = tense === "p" ? (sing ? "is" : "are") : tense === "ps" ? (sing ? "was" : "were") : "will be";
  const good = `${be} ${pp(v)}`, text = `${s} ${good} ${rest}.`;
  const why = tense === "f" ? `Future passive: will be + past participle (will be ${pp(v)}).` : `Passive: ${tense === "p" ? "am/is/are" : "was/were"} + past participle. ${cap(v)} → ${pp(v)}.`;
  if (need("passive", "fill")) add({ topic: "passive", type: "fill", sentence: `${s} ___ ${rest}. (${v})`, options: shuffle(uniq([good, tense === "ps" ? past(v) : sing ? s3(v) : v, `${be} ${v}`, tense === "f" ? `will ${v}` : `${be} ${ing(v)}`])), answer: good, explain: why });
  if (need("passive", "spot")) {
    if (pp(v) !== v && chance(0.6)) add(spotFrom("passive", text, `${s} ${be} ${v} ${rest}.`, v, pp(v), [pp(v), ing(v), s3(v)], `After be in the passive, use the past participle: ${pp(v)}.`));
    else if (tense !== "f") { const wb = { is: "are", are: "is", was: "were", were: "was" }[be]; add(chance(0.3) ? spotOk("passive", text, why) : spotFrom("passive", text, `${s} ${wb} ${pp(v)} ${rest}.`, wb, be, [be, wb === "is" || wb === "are" ? "be" : "been", tense === "p" ? (be === "is" ? "was" : "were") : (be === "was" ? "is" : "are")], `${s} is ${sing ? "singular" : "plural"}, so use ${be}.`)); }
  }
  if (need("passive", "rewrite") && tense !== "f") add({ topic: "passive", type: "rewrite", wrong: `${s} ${pp(v)} ${rest}.`, answer: text, explain: `The passive needs be: ${good}. Without ${be}, it sounds like ${s.toLowerCase()} did the action.` });
  if (need("passive", "order")) add({ topic: "passive", type: "order", answer: text, explain: why });
});

/* ===== Lesson 20: advanced passive ===== */
const PA_CONT = [["The road", "repair", 1], ["The equipment", "test", 1], ["A new mall", "build", 1], ["Dinner", "prepare", 1], ["The rooms", "clean", 0], ["The new computers", "install", 0]];
const PA_PERF = [["Ten new schools", "build", "since 2020", 0], ["Over 500 trees", "plant", "so far", 0], ["The road", "close", "for two weeks", 1], ["Three new methods", "discover", "since 2019", 0], ["This house", "sell", "three times since 2010", 1], ["The report", "read", "by thousands of people so far", 1]];
const PA_MOD = [["The form", "complete", "online", "can"], ["Mobile phones", "switch off", "during the exam", "must"], ["This medicine", "take", "after meals", "should"], ["The rules", "follow", "by everyone", "must"], ["The tickets", "buy", "at the station", "can"], ["Your essay", "submit", "before Friday", "must"]];
const PA_CAUS = [["I", "my hair", "cut", "last week"], ["She", "her car", "repair", "yesterday"], ["We", "the house", "paint", "last month"], ["He", "his eyes", "test", "last year"], ["The manager", "the report", "prepare", "by his assistant"], ["They", "their photos", "print", "at a shop"]];
const ppPhrase = v => v.includes(" ") ? pp(v.split(" ")[0]) + " " + v.split(" ").slice(1).join(" ") : pp(v);
run("passive_adv", () => {
  const r = rnd();
  if (r < 0.28) {
    const [s, v, sing] = pick(PA_CONT), time = pick(["now", "at the moment", "right now"]), be = sing ? "is" : "are";
    const good = `${be} being ${pp(v)}`, text = `${s} ${good} ${time}.`, why = `Passive continuous: am/is/are + being + past participle (${good}).`;
    if (need("passive_adv", "fill")) add({ topic: "passive_adv", type: "fill", sentence: `${s} ___ ${time}. (${v})`, options: shuffle([good, `${be} ${ing(v)}`, `${be} ${pp(v)}`, `${be} being ${v}`]), answer: good, explain: why });
    if (need("passive_adv", "rewrite")) add({ topic: "passive_adv", type: "rewrite", wrong: `${s} ${be} ${ing(v)} ${time}.`, answer: text, explain: `${s} doesn't do the action; something is done to it. Use the passive: ${good}.` });
    if (need("passive_adv", "spot")) add(spotFrom("passive_adv", text, `${s} ${be} being ${v} ${time}.`, v, pp(v), [pp(v), ing(v), past(v)], why));
    if (need("passive_adv", "order")) add({ topic: "passive_adv", type: "order", answer: text, explain: why });
  } else if (r < 0.55) {
    const [s, v, rest, sing] = pick(PA_PERF), hv = sing ? "has" : "have";
    const good = `${hv} been ${pp(v)}`, text = `${s} ${good} ${rest}.`, why = `Passive perfect: has/have + been + past participle (${good}).`;
    if (need("passive_adv", "fill")) add({ topic: "passive_adv", type: "fill", sentence: `${s} ___ ${rest}. (${v})`, options: shuffle(uniq([good, `${hv} ${pp(v)}`, `${hv} being ${pp(v)}`, `${sing ? "have" : "has"} been ${pp(v)}`])), answer: good, explain: why });
    if (need("passive_adv", "spot") && pp(v) !== v) add(spotFrom("passive_adv", text, `${s} ${hv} been ${v} ${rest}.`, v, pp(v), [pp(v), ing(v), s3(v)], why));
    if (need("passive_adv", "rewrite")) add({ topic: "passive_adv", type: "rewrite", wrong: `${s} ${hv} ${pp(v)} ${rest}.`, answer: text, explain: `Without been, it means ${s.toLowerCase()} did the action. Passive perfect: ${good}.` });
    if (need("passive_adv", "order")) add({ topic: "passive_adv", type: "order", answer: text, explain: why });
  } else if (r < 0.8) {
    const [s, v, rest, m] = pick(PA_MOD), good = `${m} be ${ppPhrase(v)}`, text = `${s} ${good} ${rest}.`, why = `Passive with a modal: ${m} + be + past participle (${good}).`;
    if (need("passive_adv", "fill")) add({ topic: "passive_adv", type: "fill", sentence: `${s} ___ ${rest}. (${m} / ${v})`, options: shuffle([good, `${m} ${v}`, `${m} be ${v}`, `${m} ${ppPhrase(v)}`]), answer: good, explain: why });
    if (need("passive_adv", "rewrite")) add({ topic: "passive_adv", type: "rewrite", wrong: `${s} ${m} ${v} ${rest}.`, answer: text, explain: `${s} can't do the action itself. Use the passive: ${good}.` });
    if (need("passive_adv", "order")) add({ topic: "passive_adv", type: "order", answer: text, explain: why });
  } else {
    const [s, obj, v, rest] = pick(PA_CAUS), had = past("have");
    const text = `${s} ${had} ${obj} ${pp(v)} ${rest}.`, why = `Causative: have/get + object + past participle. Someone else did it: ${had} ${obj} ${pp(v)}.`;
    if (pp(v) === v) { if (need("passive_adv", "order")) add({ topic: "passive_adv", type: "order", answer: text, explain: why }); return; }
    if (need("passive_adv", "fill")) add({ topic: "passive_adv", type: "fill", sentence: `${s} ${had} ${obj} ___ ${rest}. (${v})`, options: shuffle([pp(v), v, ing(v), "to " + v]), answer: pp(v), explain: why });
    if (need("passive_adv", "spot")) add(spotFrom("passive_adv", text, `${s} ${had} ${obj} ${v} ${rest}.`, v, pp(v), [pp(v), ing(v), "to " + v], why));
    if (need("passive_adv", "order")) add({ topic: "passive_adv", type: "order", answer: text, explain: why });
  }
});

/* ===== Lesson 12: the / no article ===== */
const ABSTRACT = ["Education", "Health", "Information", "Technology", "Music", "Money", "Knowledge", "Happiness", "Pollution", "Exercise", "Time", "Experience"];
const ABS_PRED = ["is important for everyone", "can change people's lives", "is becoming more important", "plays a big role in modern life"];
const PLURAL_GEN = [["Students", "need enough sleep"], ["Children", "learn quickly"], ["Smartphones", "are very useful"], ["Cats", "sleep a lot"], ["Teachers", "work very hard"], ["Books", "help us learn"]];
const SPECIFIC = [["book", "on the table", "is mine"], ["keys", "in my bag", "are not mine"], ["man", "next to the door", "is my uncle"], ["coffee", "in this cup", "is cold"], ["students", "in my class", "are very friendly"], ["information", "in this report", "is correct"], ["food", "at this restaurant", "is delicious"], ["water", "in the bottle", "is clean"]];
run("the_zero", () => {
  const r = rnd();
  if (r < 0.45) {
    const n = pick(ABSTRACT), pred = pick(ABS_PRED), text = `${n} ${pred}.`, why = `${n} here means ${n.toLowerCase()} in general, so use no article. Not: The ${n.toLowerCase()}.`;
    if (need("the_zero", "fill")) add({ topic: "the_zero", type: "fill", sentence: `___ ${n.toLowerCase()} ${pred}.`, options: [NO, "The", "A"], answer: NO, explain: why });
    if (need("the_zero", "rewrite")) add({ topic: "the_zero", type: "rewrite", wrong: `The ${n.toLowerCase()} ${pred}.`, answer: text, explain: why });
    if (need("the_zero", "spot")) add(chance(0.3) ? spotOk("the_zero", text, why) : { topic: "the_zero", type: "spot", sentence: `The ${n.toLowerCase()} ${pred}.`, correct: false, wrong_word: "The", fix: NO, fix_options: shuffle([NO, "A", "An"]), corrected: text, explain: why });
  } else if (r < 0.65) {
    const [n, pred] = pick(PLURAL_GEN), text = `${n} ${pred}.`, why = `${n} in general: plural noun with no article.`;
    if (need("the_zero", "fill")) add({ topic: "the_zero", type: "fill", sentence: `___ ${n.toLowerCase()} ${pred}.`, options: [NO, "The", "A"], answer: NO, explain: why });
    if (need("the_zero", "order")) add({ topic: "the_zero", type: "order", answer: text, explain: why });
  } else {
    const [n, where, pred] = pick(SPECIFIC), text = `The ${n} ${where} ${pred}.`, why = `${where.split(" ").slice(0, 1).join(" ") === "in" || true ? `The phrase “${where}” says exactly which ${n}, so use the.` : ""}`;
    if (need("the_zero", "fill")) add({ topic: "the_zero", type: "fill", sentence: `___ ${n} ${where} ${pred}.`, options: ["The", NO, n.endsWith("s") || ["coffee", "information", "food", "water"].includes(n) ? "Some" : "An"], answer: "The", explain: why });
    if (need("the_zero", "rewrite")) add({ topic: "the_zero", type: "rewrite", wrong: `${cap(n)} ${where} ${pred}.`, answer: text, explain: why });
    if (need("the_zero", "order")) add({ topic: "the_zero", type: "order", answer: text, explain: why });
  }
});

/* ===== Lesson 13: quantifiers ===== */
const COUNTABLE = [["students", "in the class"], ["books", "on the shelf"], ["people", "at the meeting"], ["cars", "on the road"], ["questions", "in the test"], ["mistakes", "in your essay"], ["apples", "in the basket"], ["chairs", "in the room"]];
const UNCOUNT = [["money", "in my wallet"], ["time", "before the exam"], ["water", "in the bottle"], ["information", "on the website"], ["homework", "today"], ["traffic", "this morning"], ["sugar", "in my coffee"], ["furniture", "in the room"], ["rice", "in the kitchen"], ["luggage", "for the trip"]];
run("quantifiers", () => {
  const countable = chance(0.5), [n, where] = pick(countable ? COUNTABLE : UNCOUNT);
  const kind = pick(["neg", "how", "few"]);
  const why = countable ? `${cap(n)} are countable: use many / few.` : `${cap(n)} is uncountable: use much / little.`;
  let text, mk, ans;
  if (kind === "neg") { ans = countable ? "many" : "much"; mk = q => `There ${countable ? "aren't" : "isn't"} ${q} ${n} ${where}.`; }
  else if (kind === "how") { ans = countable ? "many" : "much"; mk = q => `How ${q} ${n} ${countable ? "are" : "is"} there ${where}?`; }
  else { ans = countable ? "few" : "little"; mk = q => `There ${countable ? "are" : "is"} very ${q} ${n} ${where}.`; }
  text = mk(ans);
  const wrong = { many: "much", much: "many", few: "little", little: "few" }[ans];
  if (need("quantifiers", "fill")) add({ topic: "quantifiers", type: "fill", sentence: mk("___"), options: kind === "few" ? ["few", "little", "many", "much"] : ["many", "much", "a lot", "few"].slice(0, kind === "how" ? 2 : 3), answer: ans, explain: why });
  if (need("quantifiers", "spot")) add(chance(0.25) ? spotOk("quantifiers", text, why) : spotFrom("quantifiers", text, mk(wrong), wrong, ans, kind === "few" ? ["few", "little", "less"] : ["many", "much", "few"], why));
  if (need("quantifiers", "rewrite")) add({ topic: "quantifiers", type: "rewrite", wrong: mk(wrong), answer: text, explain: why });
  if (need("quantifiers", "order")) add({ topic: "quantifiers", type: "order", answer: text, explain: why });
});

/* ===== Lesson 15: parallel structure ===== */
const ACTS = ["dance", "sing", "cook", "swim", "read", "travel", "paint", "write", "draw", "run"];
const PAR_ADJ_P = [["talented", "hardworking"], ["smart", "kind"], ["friendly", "helpful"], ["patient", "funny"]], PAR_T = [["This phone", "cheap", "reliable"], ["The hotel", "clean", "comfortable"], ["This bag", "light", "strong"], ["The new bridge", "safe", "beautiful"], ["This laptop", "fast", "easy to use"], ["The course", "cheap", "useful"]];
const PAR_N = [["my brother", "my sister"], ["Budi", "Rina"], ["the teacher", "the students"], ["coffee", "tea"], ["math", "physics"]];
run("parallel", () => {
  const r = rnd();
  if (r < 0.45) { // lists: all -ing or all to + verb
    const acts = shuffle(ACTS).slice(0, 3), sub = pick(SUBJECTS.filter(s => s.k !== "you")), verb = sub.s3 ? "likes" : "like";
    const useIng = chance(0.5), f = a => useIng ? ing(a) : "to " + a, wf = a => useIng ? "to " + a : ing(a);
    const text = cap(`${sub.k} ${verb} ${f(acts[0])}, ${f(acts[1])}, and ${f(acts[2])}.`);
    const wrong = cap(`${sub.k} ${verb} ${f(acts[0])}, ${wf(acts[1])}, and ${f(acts[2])}.`);
    const why = `Items in a list must have the same form: ${useIng ? "all -ing" : "all to + verb"} (${f(acts[0])}, ${f(acts[1])}, ${f(acts[2])}).`;
    if (need("parallel", "spot") && !useIng) add(spotFrom("parallel", text, wrong, ing(acts[1]), "to " + acts[1], ["to " + acts[1], acts[1] + "s", past(acts[1])], why));
    if (need("parallel", "rewrite")) add({ topic: "parallel", type: "rewrite", wrong, answer: text, alts: [cap(`${sub.k} ${verb} ${wf(acts[0])}, ${wf(acts[1])}, and ${wf(acts[2])}.`), text.replace(",  and", " and").replace(/, and/, " and")], explain: why });
    if (need("parallel", "order")) add({ topic: "parallel", type: "order", answer: text, explain: why });
  } else {
    const k = pick(["notonly", "both", "either", "neither"]);
    let text, mk, ans, why;
    if (k === "notonly") { const person = chance(0.5); let a, b, s; if (person) { [a, b] = pick(PAR_ADJ_P); s = pick(["She", "He", "My teacher", "Our manager"]); } else [s, a, b] = pick(PAR_T); mk = w => `${s} is not only ${a} ${w} also ${b}.`; ans = "but"; why = "Not only … but also: both parts have the same form (adjective + adjective)."; }
    else if (k === "both") { const [a, b] = pick(PAR_N); mk = w => `Both ${a} ${w} ${b} ${["coffee", "math"].includes(a) ? "are popular here" : "live in Bali"}.`; ans = "and"; why = "Both … and (never both … or). Two subjects joined by both … and are plural."; }
    else if (k === "either") { const [a, b] = pick([["call me", "email me"], ["take the bus", "walk"], ["study tonight", "wake up early"], ["pay by card", "pay in cash"]]); mk = w => `You can either ${a} ${w} ${b}.`; ans = "or"; why = "Either … or gives two options."; }
    else { const [a, b] = pick([["my brother", "my sister"], ["Budi", "Andi"], ["the teacher", "the principal"]]); mk = w => `Neither ${a} ${w} ${b} likes coffee.`; ans = "nor"; why = "Neither … nor means not this and not that. The verb agrees with the nearest subject."; }
    text = mk(ans);
    const opts = ["but", "and", "or", "nor"];
    const wrongW = pick(opts.filter(o => o !== ans));
    if (need("parallel", "fill")) add({ topic: "parallel", type: "fill", sentence: mk("___"), options: opts, answer: ans, explain: why });
    if (need("parallel", "spot")) add(chance(0.25) ? spotOk("parallel", text, why) : spotFrom("parallel", text, mk(wrongW), wrongW, ans, opts, why));
    if (need("parallel", "order")) add({ topic: "parallel", type: "order", answer: text, explain: why });
  }
});

/* ===== Lesson 16: this / that / these / those, it / they ===== */
const DEM_SING = [["book", "new"], ["car", "mine"], ["bag", "expensive"], ["house", "very old"], ["phone", "broken"], ["chair", "comfortable"], ["laptop", "fast"], ["shoe", "too small"], ["apple", "fresh"], ["building", "very tall"], ["dress", "beautiful"], ["box", "heavy"], ["picture", "nice"], ["tree", "very old"], ["key", "mine"]];
run("demonstratives", () => {
  if (chance(0.65)) {
    const [n, pred] = pick(DEM_SING), plural = chance(0.5), near = chance(0.5);
    const noun = plural ? silent(() => R(N(n).n("p"))) : n, be = plural ? "are" : "is";
    const ans = near ? (plural ? "These" : "This") : (plural ? "Those" : "That"), place = near ? "here" : "over there";
    const predP = plural && pred === "mine" ? "mine" : pred;
    const text = `${ans} ${noun} ${place} ${be} ${predP}.`;
    const why = `${near ? "Near (here)" : "Far (over there)"} + ${plural ? "plural" : "singular"} → ${ans.toLowerCase()}. This/that for one thing, these/those for more than one.`;
    if (need("demonstratives", "fill")) add({ topic: "demonstratives", type: "fill", sentence: `___ ${noun} ${place} ${be} ${predP}.`, options: ["This", "That", "These", "Those"], answer: ans, explain: why });
    const wrongNum = { This: "These", These: "This", That: "Those", Those: "That" }[ans];
    if (need("demonstratives", "spot")) add(chance(0.25) ? spotOk("demonstratives", text, why) : spotFrom("demonstratives", text, `${wrongNum} ${noun} ${place} ${be} ${predP}.`, wrongNum, ans, ["This", "That", "These", "Those"], why));
    if (need("demonstratives", "rewrite")) add({ topic: "demonstratives", type: "rewrite", wrong: `${wrongNum} ${noun} ${place} ${be} ${predP}.`, answer: text, explain: why });
    if (need("demonstratives", "order")) add({ topic: "demonstratives", type: "order", answer: text, explain: why });
  } else {
    const items = [["I bought two new books", "They", "are very interesting", true], ["My laptop is old", "It", "is very slow", false], ["We visited Bali and Lombok", "They", "are both beautiful", true],
      ["I have a new phone", "It", "takes great photos", false], ["The students finished the test", "They", "can go home now", true], ["Pollution is increasing", "It", "affects our health", false],
      ["Online education is popular", "It", "is also convenient", false], ["My parents live in Medan", "They", "visit us every year", true]];
    const [a, p, b, pl] = pick(items), text = `${a}. ${p} ${b}.`, why = pl ? "The noun is plural, so the pronoun is they." : "The noun is singular (or uncountable), so the pronoun is it.";
    if (need("demonstratives", "fill")) add({ topic: "demonstratives", type: "fill", sentence: `${a}. ___ ${b}.`, options: ["It", "They", "He", "She"], answer: p, explain: why });
    if (need("demonstratives", "rewrite")) add({ topic: "demonstratives", type: "rewrite", wrong: `${a}. ${p === "It" ? "They" : "It"} ${b}.`, answer: text, explain: why });
  }
});

/* ===== Lesson 17: preposition collocations ===== */
const COLL = [["good at", ["math", "cooking", "swimming", "public speaking"], "be"], ["interested in", ["history", "science", "learning Korean", "art"], "be"], ["responsible for", ["the project", "managing the team", "the budget"], "be"],
  ["afraid of", ["dogs", "the dark", "spiders", "flying"], "be"], ["proud of", ["her son", "his work", "our team"], "be"], ["worried about", ["the exam", "the future", "his health"], "be"],
  ["married to", ["a doctor", "my cousin"], "be"], ["different from", ["his brother", "the old version"], "be"], ["similar to", ["mine", "the first one"], "be"], ["famous for", ["its beaches", "its food"], "place"],
  ["tired of", ["waiting", "the noise"], "be"], ["keen on", ["football", "photography"], "be"], ["listen to", ["music", "podcasts", "the radio"], "verb"], ["wait for", ["the bus", "my friend", "the results"], "verb"],
  ["depend on", ["the weather", "my parents"], "verb"], ["apply for", ["a scholarship", "a job", "a visa"], "verb"], ["belong to", ["my brother", "the school"], "verb"], ["focus on", ["their studies", "grammar"], "verb"],
  ["agree with", ["my teacher", "you"], "verb"], ["succeed in", ["passing the exam", "their plan"], "verb"]];
const PREPS = ["at", "in", "for", "of", "on", "to", "about", "with", "from"];
const ALSO_OK = { "good at": ["with"], "worried about": [], "tired of": [], "different from": ["to", "than"], "keen on": [], "agree with": ["on", "to"], "succeed in": [], "wait for": [], "focus on": [], "depend on": [] };
run("collocations", () => {
  const [coll, objs, kind] = pick(COLL), [w, prep] = coll.split(" "), obj = pick(objs);
  if (kind === "place") { const pl = pick(["Bali", "Yogyakarta", "Paris"]); const text = `${pl} is ${coll} ${obj}.`; const why = `Famous for: the reason something is well known.`;
    if (need("collocations", "fill")) add({ topic: "collocations", type: "fill", sentence: `${pl} is famous ___ ${obj}.`, options: shuffle(["for", "of", "with", "by"]), answer: "for", explain: why });
    if (need("collocations", "order")) add({ topic: "collocations", type: "order", answer: text, explain: why }); return; }
  const sub = pick(SUBJECTS.filter(s => s.k !== "you" && !(obj.startsWith("their") && !s.pl) && !(obj.startsWith("her ") && s.g !== "f") && !(obj.startsWith("his ") && s.g !== "m")));
  const verbPart = kind === "be" ? join(beP(sub), w) : (sub.s3 ? s3(w) : w);
  const text = cap(join(sub.k, verbPart, prep, obj)) + ".", why = `We say ${coll} (${coll} + ${obj.split(" ")[0] === "the" ? "something" : obj}). Learn these as fixed pairs.`;
  const wrongs = shuffle(PREPS.filter(p => p !== prep && !(ALSO_OK[coll] || []).includes(p)));
  if (need("collocations", "fill")) add({ topic: "collocations", type: "fill", sentence: cap(join(sub.k, verbPart, "___", obj)) + ".", options: shuffle([prep, ...wrongs.slice(0, 3)]), answer: prep, explain: why });
  if (count(text, prep) === 1) {
    if (need("collocations", "spot")) add(chance(0.25) ? spotOk("collocations", text, why) : spotFrom("collocations", text, cap(join(sub.k, verbPart, wrongs[0], obj)) + ".", wrongs[0], prep, [prep, wrongs[1], wrongs[2]], why));
    if (need("collocations", "rewrite")) add({ topic: "collocations", type: "rewrite", wrong: cap(join(sub.k, verbPart, wrongs[0], obj)) + ".", answer: text, explain: why });
  }
  if (need("collocations", "order")) add({ topic: "collocations", type: "order", answer: text, explain: why });
});

/* ===== Lesson 18: superlatives ===== */
const SUP = [["Jakarta", "big", "city in Indonesia"], ["Mount Everest", "high", "mountain in the world"], ["Today", "hot", "day of the week"], ["Budi", "tall", "student in our class"],
  ["This", "expensive", "hotel in the city"], ["December", "busy", "month of the year"], ["The cheetah", "fast", "animal in the world"], ["This", "difficult", "question in the test"],
  ["Russia", "large", "country in the world"], ["This", "good", "restaurant in town"], ["That", "bad", "movie I have ever seen"], ["She", "intelligent", "person in my family"],
  ["This", "interesting", "book I have read"], ["The Sahara", "hot", "desert in the world"], ["This", "beautiful", "beach in Bali"], ["My grandmother", "old", "person in our village"], ["This", "cheap", "phone in the shop"], ["Rina", "young", "student in the class"],
  ["Bali", "popular", "island in Indonesia"], ["This", "important", "chapter in the book"], ["Andi", "funny", "person I know"], ["This", "comfortable", "chair in the house"], ["Friday", "busy", "day at the office"],
  ["This", "easy", "exercise in the unit"], ["It", "cold", "night of the year"], ["The blue whale", "large", "animal on Earth"], ["This", "modern", "building in the city"], ["He", "strong", "player on the team"],
  ["This", "long", "river in the country"], ["That", "happy", "day of my life"], ["This", "dangerous", "road in the area"], ["She", "fast", "runner in the school"]];
run("superlatives", () => {
  const [s, adj, rest] = pick(SUP), su = silent(() => R(A(adj).f("su"))), co = silent(() => R(A(adj).f("co"))); if (su.includes("[[")) return;
  const be = ["Today", "This", "That", "She", "December"].includes(s) || !s.endsWith("s") ? "is" : "are";
  const mk = x => `${s} is the ${x} ${rest}.`, text = mk(su);
  const long = su.startsWith("most "), irr = ["good", "bad"].includes(adj);
  const why = irr ? `${cap(adj)} is irregular: ${adj} → ${co} → ${su}.` : long ? `Long adjectives use the most: the ${su}.` : /iest$/.test(su) ? `Consonant + y → -iest: the ${su}.` : su.endsWith(adj.slice(-1) + adj.slice(-1) + "est") ? `Double the last letter, then add -est: ${adj} → ${su}.` : `Short adjectives add -est: the ${su}.`;
  const wrongs = long ? [adj + "est", "more " + adj, adj] : uniq(["most " + adj, co, "most " + su, adj + "est"]).filter(x => x !== su);
  if (need("superlatives", "fill")) add({ topic: "superlatives", type: "fill", sentence: mk("___") + ` (${adj})`, options: shuffle([su, ...wrongs.slice(0, 3)]), answer: su, explain: why });
  if (need("superlatives", "rewrite")) add({ topic: "superlatives", type: "rewrite", wrong: mk(long ? adj + "est" : "most " + su), answer: text, explain: long ? why : `Use -est or most, never both: the ${su}.` });
  if (need("superlatives", "spot")) {
    const bad = long ? adj + "est" : irr ? (adj === "good" ? "goodest" : "baddest") : (adj + "est" !== su ? adj + "est" : null);
    if (bad && bad !== su) add(chance(0.25) ? spotOk("superlatives", text, why) : spotFrom("superlatives", text, mk(bad), bad, su, long ? [su, co] : [su, co, "most " + adj], why));
  }
  if (need("superlatives", "order")) add({ topic: "superlatives", type: "order", answer: text, explain: why });
  void be;
});

/* ===== Lesson 19: gerunds and infinitives ===== */
const GER_V = ["enjoy", "finish", "avoid", "dislike", "keep", "practice", "consider"];
const INF_V = ["want", "plan", "decide", "hope", "need", "promise", "agree", "refuse", "learn", "expect"];
const ACTIVITY = [["read", "books in my free time"], ["study", "English every evening"], ["watch", "movies at home"], ["cook", "dinner for my family"], ["play", "football on weekends"],
  ["learn", "Japanese"], ["write", "essays"], ["apply", "for a scholarship"], ["visit", "my grandparents"], ["buy", "a new laptop"], ["take", "the IELTS test"], ["travel", "to Japan"]];
const GER_OK = { enjoy: ["read", "study", "watch", "cook", "play", "learn", "write", "travel", "visit"], finish: ["read", "study", "watch", "cook", "write"], avoid: ["buy", "watch", "travel", "eat"],
  dislike: ["cook", "write", "travel", "watch"], keep: ["study", "learn", "write", "read"], practice: ["write", "play", "cook"], consider: ["apply", "buy", "take", "learn", "travel", "study"], suggest: ["visit", "apply", "take", "study", "learn"] };
run("gerund_inf", () => {
  const sub = pick(SUBJECTS.filter(s => s.k !== "you")), r = rnd();
  if (r < 0.75) {
    const gerund = chance(0.5), mv = pick(gerund ? GER_V : INF_V);
    const INF_OK = { learn: ["cook", "play", "write"], expect: ["visit", "travel", "take"], hope: ["travel", "visit", "take", "apply", "buy", "study"], refuse: ["cook", "watch", "buy", "visit"], agree: ["cook", "visit", "buy", "play"], promise: ["visit", "cook", "study", "write", "buy"] };
    const pool = ACTIVITY.filter(([a]) => gerund ? (GER_OK[mv] || []).includes(a) : (!INF_OK[mv] || INF_OK[mv].includes(a))); if (!pool.length) return;
    const [a, rest0] = pick(pool), rest = sub.k === "I" ? rest0 : rest0.replace("my ", sub.s3 ? (sub.g === "f" ? "her " : sub.g === "m" ? "his " : "their ") : "their ");
    if (sub.s3 && !sub.g && rest0.includes("my ")) return;
    const tense = chance(0.6) ? "p" : "ps";
    const mvF = tense === "ps" ? past(mv) : sub.s3 ? s3(mv) : mv;
    const good = gerund ? ing(a) : "to " + a, bad = gerund ? "to " + a : ing(a);
    const text = cap(join(sub.k, mvF, good, rest)) + ".";
    const why = gerund ? `${cap(mv)} is followed by -ing: ${mv} ${ing(a)}.` : `${cap(mv)} is followed by to + base verb: ${mv} to ${a}.`;
    if (need("gerund_inf", "fill")) add({ topic: "gerund_inf", type: "fill", sentence: cap(join(sub.k, mvF, "___", rest)) + `. (${a})`, options: shuffle(uniq([good, bad, a, "to " + ing(a)])), answer: good, explain: why });
    if (need("gerund_inf", "spot")) {
      if (!gerund) add(chance(0.25) ? spotOk("gerund_inf", text, why) : spotFrom("gerund_inf", text, cap(join(sub.k, mvF, "to", ing(a), rest)) + ".", ing(a), a, [a, past(a), s3(a)], `After to, use the base verb: to ${a}, not to ${ing(a)}.`));
      else add(spotFrom("gerund_inf", text, cap(join(sub.k, mvF, a, rest)) + ".", a, ing(a), [ing(a), "to " + a, s3(a)], why));
    }
    if (need("gerund_inf", "rewrite")) add({ topic: "gerund_inf", type: "rewrite", wrong: cap(join(sub.k, mvF, bad, rest)) + ".", answer: text, explain: why });
    if (need("gerund_inf", "order")) add({ topic: "gerund_inf", type: "order", answer: text, explain: why });
  } else { // preposition + -ing
    const [adjp, a, rest] = pick([["interested in", "learn", "Korean"], ["good at", "cook", "Indonesian food"], ["afraid of", "speak", "in public"], ["tired of", "wait", "for the bus"], ["excited about", "travel", "to Japan"], ["responsible for", "manage", "the team"]]);
    const text = cap(join(sub.k, beP(sub), adjp, ing(a), rest)) + ".", why = `After a preposition (${adjp.split(" ")[1]}), use -ing: ${adjp} ${ing(a)}.`;
    if (need("gerund_inf", "fill")) add({ topic: "gerund_inf", type: "fill", sentence: cap(join(sub.k, beP(sub), adjp, "___", rest)) + `. (${a})`, options: shuffle([ing(a), "to " + a, a, past(a)]), answer: ing(a), explain: why });
    if (need("gerund_inf", "rewrite")) add({ topic: "gerund_inf", type: "rewrite", wrong: cap(join(sub.k, beP(sub), adjp, a, rest)) + ".", answer: text, explain: why });
  }
});
};
