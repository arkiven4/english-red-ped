/* Red Pen phoneme pronunciation scorer (lazy-loaded only when "Say it" mode is opened).
   Runs onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX (model_q4f16.onnx) in the browser via
   ONNX Runtime Web (WASM SIMD), cached in CacheStorage ("redpen-asr-v1") after the first download
   from Hugging Face CDN. Also supports an HTTP /score endpoint when `?asr=<url>` or
   window.REDPEN_ASR_URL is set (for local server or Playwright tests with mocked /score). */

const ORT_VERSION = "1.21.0";
const ORT_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const HF_MODEL_URL = "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/onnx/model_q4f16.onnx";
const MODEL_CACHE = "redpen-asr-v1";
const SAMPLE_RATE = 16000;

export const CATEGORIES = {
  final_s:  { label: "Final -s / -es", example: "books, works, watches" },
  final_ed: { label: "Past -ed endings", example: "walked, cooked, helped" },
  th:       { label: "“th” sounds (/θ/, /ð/)", example: "three, think, they" },
  v_f:      { label: "“v” vs “f”", example: "very, five, live, save" },
  z_s:      { label: "Voiced final /z/", example: "reads, apples, plays" },
};

const VOWELS = new Set([
  "i", "iː", "ɪ", "ᵻ", "e", "ɛ", "æ", "a", "ɑ", "ɑː", "ɒ", "ɔ", "ɔː", "o", "oː", "ʊ", "u", "uː",
  "ʌ", "ɐ", "ə", "ɜ", "ɜː", "ɚ", "ɝ", "eɪ", "aɪ", "ɔɪ", "aʊ", "oʊ", "əʊ", "ɪə", "eə", "ʊə", "əl",
  "ɑːɹ", "ɔːɹ", "oːɹ", "ɛɹ", "ɪɹ", "ʊɹ", "aɪə", "aɪɚ", "ø"
]);
const RHOTICS = new Set(["ɹ", "r", "ɚ", "ɝ"]);
const EQUIV_GROUPS = [
  ["i", "iː", "ɪ", "ᵻ"],
  ["e", "ɛ", "æ", "a"],
  ["a", "æ", "ɑ", "ɑː", "ɒ", "ʌ", "ɐ"],
  ["ɔ", "ɔː", "ɒ", "o", "oː", "oʊ", "əʊ"],
  ["u", "uː", "ʊ"],
  ["ə", "ɜ", "ɜː", "ʌ", "ɐ", "ɚ", "ɝ", "ᵻ", "əl"],
  ["eɪ", "e", "ɛ"],
  ["oʊ", "əʊ", "o", "ɔː"],
  ["ɹ", "r", "ɚ", "ɝ"],
  ["t", "ɾ", "th", "tʰ"],
  ["d", "ɾ"],
  ["p", "ph", "pʰ"],
  ["k", "kh", "kʰ"],
  ["z", "s"],
];
const CONFUSIONS = [
  ["θ", "t", "s", "f", "d"],
  ["ð", "d", "z", "v", "t"],
  ["v", "f", "b", "p", "m"],
  ["z", "s", "ʃ", "ʒ"],
  ["t", "d", "k", "p"],
];

let phonData = null;
let ortMod = null;
let ortSession = null;
let loadingPromise = null;

function cleanTok(t) {
  const s = String(t || "").replace(/[1-5]$/, "");
  return s === "ts." ? "t" : s;
}

function areAllophones(p1, p2) {
  p1 = cleanTok(p1); p2 = cleanTok(p2);
  if (p1 === p2) return true;
  for (const g of EQUIV_GROUPS) if (g.includes(p1) && g.includes(p2)) return true;
  return false;
}

function subCost(ep, op) {
  ep = cleanTok(ep); op = cleanTok(op);
  if (ep === op) return 0;
  if (areAllophones(ep, op)) return 0.2;
  for (const g of CONFUSIONS) if (g.includes(ep) && g.includes(op)) return 0.45;
  if ((VOWELS.has(ep) && VOWELS.has(op)) || (RHOTICS.has(ep) && RHOTICS.has(op))) return 0.45;
  return 1.1;
}

async function loadPhonemes(url = "data/phonemes.json") {
  if (phonData) return phonData;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Could not load phoneme dictionary.");
  const d = await r.json();
  const id2tok = {};
  for (const [k, v] of Object.entries(d.vocab)) id2tok[v] = k;
  d.id2tok = id2tok;
  phonData = d;
  return d;
}

function fallbackWordPhones(word) {
  // Simple fallback if a word is not in data/phonemes.json
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  const out = [];
  let i = 0;
  while (i < w.length) {
    const two = w.slice(i, i + 2);
    if (two === "th") { out.push("θ"); i += 2; continue; }
    if (two === "sh") { out.push("ʃ"); i += 2; continue; }
    if (two === "ch") { out.push("tʃ"); i += 2; continue; }
    if (two === "ng") { out.push("ŋ"); i += 2; continue; }
    if (two === "ee" || two === "ea") { out.push("iː"); i += 2; continue; }
    if (two === "oo") { out.push("ʊ"); i += 2; continue; }
    const c = w[i++];
    const map = { a: "æ", e: "ɛ", i: "ɪ", o: "ɒ", u: "ʌ", y: "i", r: "ɹ", c: "k", g: "ɡ", j: "dʒ", x: "s" };
    if (c === "e" && i === w.length && out.length > 1) continue;
    out.push(map[c] || c);
  }
  return out.length ? out : ["ə"];
}

export function getWordPhones(word, lang, dict = phonData) {
  const w = word.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "");
  if (!w) return ["ə"];
  if (dict) {
    if (lang === "en-us" && dict.us && dict.us[w]) return dict.us[w];
    if (dict.gb && dict.gb[w]) return dict.gb[w];
    const noApos = w.replace(/'/g, "");
    if (lang === "en-us" && dict.us && dict.us[noApos]) return dict.us[noApos];
    if (dict.gb && dict.gb[noApos]) return dict.gb[noApos];
  }
  return fallbackWordPhones(w);
}

export function detectWordCategories(word, phones) {
  const w = word.toLowerCase().replace(/[^a-z']/g, "");
  const cats = new Set();
  if (!w || !phones || !phones.length) return cats;
  const last = phones[phones.length - 1];
  if ((w.endsWith("s") || w.endsWith("'s")) && w.length >= 2 && (last === "s" || last === "z")) {
    cats.add("final_s");
    if (last === "z") cats.add("z_s");
  }
  if (w.endsWith("ed") && w.length >= 4 && (last === "t" || last === "d")) cats.add("final_ed");
  if (phones.some(p => p === "θ" || p === "ð") || w.includes("th")) cats.add("th");
  if (phones.includes("v") || w.includes("v")) cats.add("v_f");
  return cats;
}

export function sentenceCategories(sentence, dict = phonData) {
  const words = String(sentence || "").match(/[A-Za-z']+/g) || [];
  const cats = new Set();
  for (const w of words) {
    const ph = getWordPhones(w, "en-gb", dict);
    for (const c of detectWordCategories(w, ph)) cats.add(c);
  }
  return [...cats];
}

function getHttpEndpoint() {
  if (typeof window !== "undefined") {
    const m = /[?&]asr=([^&]*)/.exec(location.search);
    if (m) return decodeURIComponent(m[1]).replace(/\/$/, "");
    if (window.REDPEN_ASR_URL != null) return String(window.REDPEN_ASR_URL).replace(/\/$/, "");
  }
  return null;
}

async function fetchModelBuffer(onStatus) {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(MODEL_CACHE);
      const hit = await cache.match(HF_MODEL_URL);
      if (hit) {
        onStatus && onStatus("Loading pronunciation model…", 100);
        return await hit.arrayBuffer();
      }
    } catch (e) {}
  }
  onStatus && onStatus("Downloading phoneme model from Hugging Face (once, 197 MB)…", 2);
  const res = await fetch(HF_MODEL_URL, { mode: "cors" });
  if (!res.ok) throw new Error(`Failed to download model (${res.status})`);
  const total = +(res.headers.get("content-length") || 196910000);
  if (!res.body || !res.body.getReader) {
    const buf = await res.arrayBuffer();
    if (typeof caches !== "undefined") {
      try { const c = await caches.open(MODEL_CACHE); await c.put(HF_MODEL_URL, new Response(buf)); } catch (e) {}
    }
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const pct = Math.min(99, Math.round((loaded / total) * 100));
    onStatus && onStatus(`Downloading phoneme model (once)… ${pct}%`, pct);
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const ch of chunks) { out.set(ch, offset); offset += ch.byteLength; }
  if (typeof caches !== "undefined") {
    try {
      const c = await caches.open(MODEL_CACHE);
      await c.put(HF_MODEL_URL, new Response(out.buffer, { headers: { "Content-Type": "application/octet-stream" } }));
    } catch (e) {}
  }
  return out.buffer;
}

export async function ensureReady(onStatus, phonemesUrl = "data/phonemes.json") {
  await loadPhonemes(phonemesUrl);
  const endpoint = getHttpEndpoint();
  if (endpoint !== null) {
    onStatus && onStatus("Scorer ready", 100);
    return true;
  }
  if (ortSession) {
    onStatus && onStatus("Scorer ready", 100);
    return true;
  }
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      onStatus && onStatus("Loading ONNX Runtime…", 0);
      ortMod = await import(ORT_CDN + "ort.wasm.min.mjs");
      const ort = ortMod.default || ortMod;
      ort.env.wasm.wasmPaths = ORT_CDN;
      ort.env.wasm.numThreads = 1;
      const buf = await fetchModelBuffer(onStatus);
      onStatus && onStatus("Starting phoneme scorer…", 100);
      ortSession = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"] });
      onStatus && onStatus("Scorer ready", 100);
      return true;
    } catch (e) {
      loadingPromise = null;
      throw e;
    }
  })();
  return loadingPromise;
}

export async function decodeBlobToPCM16k(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx({ sampleRate: SAMPLE_RATE });
  try {
    const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
    const ch0 = audioBuf.getChannelData(0);
    if (audioBuf.sampleRate === SAMPLE_RATE) return new Float32Array(ch0);
    const ratio = audioBuf.sampleRate / SAMPLE_RATE;
    const outLen = Math.round(ch0.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio;
      const i0 = Math.floor(src), i1 = Math.min(ch0.length - 1, i0 + 1), f = src - i0;
      out[i] = ch0[i0] * (1 - f) + ch0[i1] * f;
    }
    return out;
  } finally {
    try { await ctx.close(); } catch (e) {}
  }
}

function normalizePCM(pcm) {
  const maxSamples = 20 * SAMPLE_RATE;
  const arr = pcm.length > maxSamples ? pcm.subarray(0, maxSamples) : pcm;
  if (arr.length < 0.15 * SAMPLE_RATE) throw new Error("Recording is too short. Hold Record and read the whole sentence.");
  let peak = 0, sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const a = Math.abs(arr[i]);
    if (a > peak) peak = a;
    sum += arr[i];
  }
  if (peak < 1e-4) throw new Error("No speech detected. Check your microphone and try again.");
  const mean = sum / arr.length;
  let vsum = 0;
  for (let i = 0; i < arr.length; i++) { const d = arr[i] - mean; vsum += d * d; }
  const std = Math.sqrt(vsum / arr.length + 1e-7);
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = (arr[i] - mean) / std;
  return out;
}

async function runOnnxProbs(pcmNorm) {
  const ort = ortMod.default || ortMod;
  const tensor = new ort.Tensor("float32", pcmNorm, [1, pcmNorm.length]);
  const feeds = { input_values: tensor };
  if (ortSession.inputNames.includes("attention_mask")) {
    const mask = new BigInt64Array(pcmNorm.length);
    mask.fill(1n);
    feeds.attention_mask = new ort.Tensor("int64", mask, [1, pcmNorm.length]);
  }
  const out = await ortSession.run(feeds);
  const logits = out.logits;
  const [, T, V] = logits.dims;
  const data = logits.data;
  const probs = new Array(T);
  for (let t = 0; t < T; t++) {
    const base = t * V;
    let maxL = -Infinity;
    for (let v = 0; v < V; v++) if (data[base + v] > maxL) maxL = data[base + v];
    const row = new Float32Array(V);
    let s = 0;
    for (let v = 0; v < V; v++) { const e = Math.exp(data[base + v] - maxL); row[v] = e; s += e; }
    for (let v = 0; v < V; v++) row[v] /= s;
    probs[t] = row;
  }
  return probs;
}

async function runLocalWindowProbs(pcmNorm, centerFrame) {
  const c = Math.round(centerFrame * 320 + 160);
  const half = 2800; // 350ms total
  const s = Math.max(0, c - half), e = Math.min(pcmNorm.length, c + half);
  if (e - s < 1600) return [];
  const slice = pcmNorm.subarray(s, e);
  let sum = 0;
  for (let i = 0; i < slice.length; i++) sum += slice[i];
  const mean = sum / slice.length;
  let vsum = 0;
  for (let i = 0; i < slice.length; i++) { const d = slice[i] - mean; vsum += d * d; }
  const std = Math.sqrt(vsum / slice.length + 1e-7);
  const norm = new Float32Array(slice.length);
  for (let i = 0; i < slice.length; i++) norm[i] = (slice[i] - mean) / std;
  return runOnnxProbs(norm);
}

function ctcDecodeSegments(probs, dict) {
  const special = new Set([dict.vocab["<pad>"] || 0, dict.vocab["<s>"] || 1, dict.vocab["</s>"] || 2, dict.vocab["<unk>"] || 3]);
  const T = probs.length;
  const topIds = new Int32Array(T);
  for (let t = 0; t < T; t++) {
    const row = probs[t];
    let bestI = 0, bestV = row[0];
    for (let v = 1; v < row.length; v++) if (row[v] > bestV) { bestV = row[v]; bestI = v; }
    topIds[t] = bestI;
  }
  const segs = [];
  let i = 0;
  while (i < T) {
    const tid = topIds[i];
    let j = i + 1;
    while (j < T && topIds[j] === tid) j++;
    if (!special.has(tid)) {
      const tok = cleanTok(dict.id2tok[tid] || "");
      if (tok) {
        let peak = 0;
        for (let k = i; k < j; k++) if (probs[k][tid] > peak) peak = probs[k][tid];
        segs.push({ id: tid, phone: tok, start: i, end: j - 1, prob: peak });
      }
    }
    i = j;
  }
  return segs;
}

function alignExpectedToCtc(expItems, obsSegs) {
  const N = expItems.length, M = obsSegs.length, del = 0.85, ins = 0.85;
  const dp = Array.from({ length: N + 1 }, () => new Float32Array(M + 1));
  const back = Array.from({ length: N + 1 }, () => new Uint8Array(M + 1));
  for (let i = 1; i <= N; i++) { dp[i][0] = i * del; back[i][0] = 1; }
  for (let j = 1; j <= M; j++) { dp[0][j] = j * ins; back[0][j] = 2; }
  for (let i = 1; i <= N; i++) {
    const ep = expItems[i - 1].phone;
    for (let j = 1; j <= M; j++) {
      const op = obsSegs[j - 1].phone;
      const cd = dp[i - 1][j - 1] + subCost(ep, op);
      const cu = dp[i - 1][j] + del;
      const cl = dp[i][j - 1] + ins;
      if (cd <= cu && cd <= cl) { dp[i][j] = cd; back[i][j] = 0; }
      else if (cu <= cl) { dp[i][j] = cu; back[i][j] = 1; }
      else { dp[i][j] = cl; back[i][j] = 2; }
    }
  }
  const aligned = new Array(N).fill(null);
  let i = N, j = M;
  while (i > 0 || j > 0) {
    const b = (i > 0 && j > 0) ? back[i][j] : (i > 0 ? 1 : 2);
    if (b === 0) { aligned[i - 1] = obsSegs[j - 1]; i--; j--; }
    else if (b === 1) { aligned[i - 1] = null; i--; }
    else j--;
  }
  return aligned;
}

async function scoreVariant(words, wordPhones, pcmNorm, probs, obsSegs, dict) {
  const expItems = [];
  for (let wi = 0; wi < words.length; wi++) {
    const phs = wordPhones[wi];
    for (let pi = 0; pi < phs.length; pi++) {
      expItems.push({ wordIdx: wi, phoneIdx: pi, isFinal: pi === phs.length - 1, phone: phs[pi] });
    }
  }
  const N = expItems.length;
  const aligned = alignExpectedToCtc(expItems, obsSegs);
  const byWord = Array.from({ length: words.length }, () => []);
  for (let idx = 0; idx < N; idx++) byWord[expItems[idx].wordIdx].push({ idx, item: expItems[idx], seg: aligned[idx] });

  const wordResults = [];
  const errors = [];
  const categoryStats = {};
  const bumpCat = (cat, ok) => {
    const st = categoryStats[cat] || (categoryStats[cat] = { n: 0, c: 0 });
    st.n++; if (ok) st.c++;
  };

  let totalPhoneScore = 0;
  const totalPhones = Math.max(1, N);

  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    const wClean = w.replace(/[^A-Za-z']/g, "");
    const phones = wordPhones[wi];
    const items = byWord[wi];
    const cats = detectWordCategories(wClean, phones);
    const phoneDetails = [];
    const wordIssues = [];
    const catFailed = new Set();

    for (const { idx, item, seg } of items) {
      const expP = item.phone;
      const obsP = seg ? seg.phone : null;
      const isFinal = item.isFinal;

      let prevEnd = -1;
      for (let k = idx - 1; k >= 0; k--) if (aligned[k]) { prevEnd = aligned[k].end; break; }
      let nextStart = probs.length;
      for (let k = idx + 1; k < N; k++) if (aligned[k]) { nextStart = aligned[k].start; break; }
      const gapS = prevEnd + 1, gapE = Math.min(prevEnd + 4, nextStart - 1);

      const gapProb = pset => {
        const ids = pset.map(p => dict.vocab[p]).filter(id => id !== undefined);
        if (!ids.length || gapS > gapE) return 0;
        let maxP = 0;
        for (let t = Math.max(0, gapS); t <= Math.min(probs.length - 1, gapE); t++) {
          for (const id of ids) if (probs[t][id] > maxP) maxP = probs[t][id];
        }
        return maxP;
      };

      let pStatus = "good", pScore = 1.0;

      if (isFinal && cats.has("final_s") && (expP === "s" || expP === "z")) {
        const gp = gapProb(["s", "z"]);
        if (obsP === "s" || obsP === "z" || obsP === "ʃ" || gp >= 0.30) {
          pStatus = "good"; pScore = 1.0;
        } else if (gp >= 0.14) {
          pStatus = "unclear"; pScore = 0.5; catFailed.add("final_s");
          wordIssues.push({ category: "final_s", severity: "unclear", word: wClean, expected: expP, heard: obsP || "none",
            message: `The final -s in “${wClean}” sounded faint.`, tip: `Finish “${wClean}” with a clear /${expP}/ sound.` });
        } else {
          pStatus = "wrong"; pScore = 0.0; catFailed.add("final_s");
          wordIssues.push({ category: "final_s", severity: "wrong", word: wClean, expected: expP, heard: obsP || "none",
            message: `Final -s missing in “${wClean}”.`, tip: `Don't drop the -s ending: finish “${wClean}” with a clear /${expP}/ sound.` });
        }
      } else if (isFinal && cats.has("final_ed") && (expP === "t" || expP === "d")) {
        const gp = gapProb(["t", "d"]);
        if (obsP === "t" || obsP === "d" || obsP === "ɾ" || gp >= 0.30) {
          pStatus = "good"; pScore = 1.0;
        } else if (gp >= 0.14) {
          pStatus = "unclear"; pScore = 0.5; catFailed.add("final_ed");
          wordIssues.push({ category: "final_ed", severity: "unclear", word: wClean, expected: expP, heard: obsP || "none",
            message: `The -ed ending in “${wClean}” sounded faint.`, tip: `Tap your tongue behind your upper teeth for the /${expP}/ ending in “${wClean}”.` });
        } else {
          pStatus = "wrong"; pScore = 0.0; catFailed.add("final_ed");
          wordIssues.push({ category: "final_ed", severity: "wrong", word: wClean, expected: expP, heard: obsP || "none",
            message: `Final -ed missing in “${wClean}”.`, tip: `Pronounce the past -ed ending in “${wClean}” as /${expP}/.` });
        }
      } else if (expP === "θ" || expP === "ð") {
        if (obsP === "θ" || obsP === "ð") {
          pStatus = "good"; pScore = 1.0;
        } else {
          const heardLbl = ["t", "d", "s", "z", "f"].includes(obsP) ? obsP : (expP === "θ" ? "t" : "d");
          pStatus = "wrong"; pScore = 0.0; catFailed.add("th");
          wordIssues.push({ category: "th", severity: "wrong", word: wClean, expected: expP, heard: heardLbl,
            message: `In “${wClean}”, “th” sounded like “${heardLbl}”.`,
            tip: `Place the tip of your tongue lightly between your teeth for “th” (/${expP}/) in “${wClean}”.` });
        }
      } else if (expP === "v") {
        const centerF = seg ? 0.5 * (seg.start + seg.end) : 0.5 * (gapS + gapE);
        const lprobs = await runLocalWindowProbs(pcmNorm, centerF);
        const mid = Math.floor(lprobs.length / 2);
        let locV = 0, locF = 0;
        const vid = dict.vocab["v"], fids = [dict.vocab["f"], dict.vocab["p"], dict.vocab["b"]].filter(Boolean);
        for (let t = Math.max(0, mid - 3); t <= Math.min(lprobs.length - 1, mid + 3); t++) {
          if (lprobs[t][vid] > locV) locV = lprobs[t][vid];
          for (const fid of fids) if (lprobs[t][fid] > locF) locF = lprobs[t][fid];
        }
        if (obsP === "v" && (locV >= 0.25 || locV >= locF)) {
          pStatus = "good"; pScore = 1.0;
        } else {
          const heardLbl = locF > locV ? "f" : (obsP || "f");
          pStatus = "wrong"; pScore = 0.0; catFailed.add("v_f");
          wordIssues.push({ category: "v_f", severity: "wrong", word: wClean, expected: "v", heard: heardLbl,
            message: `In “${wClean}”, “v” sounded like “${heardLbl}”.`,
            tip: `Touch your top teeth to your bottom lip and vibrate your vocal cords for /v/ in “${wClean}”.` });
        }
      } else {
        if (obsP && (obsP === expP || areAllophones(expP, obsP))) { pStatus = "good"; pScore = 1.0; }
        else if (obsP && subCost(expP, obsP) <= 0.5) { pStatus = "unclear"; pScore = 0.65; }
        else { pStatus = "wrong"; pScore = 0.0; }
      }

      totalPhoneScore += pScore;
      phoneDetails.push({ expected: expP, heard: obsP, status: pStatus, score: Math.round(pScore * 100) / 100 });
    }

    for (const cat of cats) bumpCat(cat, !catFailed.has(cat));

    const wMean = phoneDetails.reduce((a, x) => a + x.score, 0) / Math.max(1, phoneDetails.length);
    const wStatus = (wordIssues.some(x => x.severity === "wrong") || wMean < 0.45) ? "wrong"
      : (wordIssues.length || wMean < 0.75) ? "unclear" : "good";

    if (wStatus === "wrong" && !wordIssues.length) {
      wordIssues.push({ category: "general", severity: "wrong", word: wClean,
        expected: phones.join(""), heard: phoneDetails.map(p => p.heard || "").join("") || "none",
        message: `“${wClean}” was not clear (expected /${phones.join("")}/).`,
        tip: `Tap Listen to hear “${wClean}”, then say each syllable clearly.` });
    }
    errors.push(...wordIssues);
    wordResults.push({
      word: w, clean: wClean, expected_ipa: phones.join(""),
      heard_ipa: phoneDetails.map(p => p.heard || "").join(""),
      status: wStatus, score: Math.round(wMean * 100),
      categories: [...cats].sort(), phonemes: phoneDetails,
    });
  }

  errors.sort((a, b) => ((a.category !== "general" ? 0 : 1) - (b.category !== "general" ? 0 : 1))
    || ((a.severity === "wrong" ? 0 : 1) - (b.severity === "wrong" ? 0 : 1)));

  const overall = Math.round((totalPhoneScore / totalPhones) * 100);
  const targetErrCount = errors.filter(e => e.category !== "general" && e.severity === "wrong").length;
  return { overall_score: overall, target_err_count: targetErrCount, words: wordResults, errors, categories: categoryStats };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function scoreAudio(text, audioBlob, onStatus, phonemesUrl = "data/phonemes.json") {
  const endpoint = getHttpEndpoint();
  if (endpoint !== null) {
    const b64 = await blobToBase64(audioBlob);
    const r = await fetch((endpoint || "") + "/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, audio: b64 }),
    });
    if (!r.ok) throw new Error(`Scorer error (${r.status})`);
    return await r.json();
  }

  await ensureReady(onStatus, phonemesUrl);
  const t0 = performance.now();
  const rawWords = (String(text || "").trim().match(/[A-Za-z']+[.,!?;:]*/g) || []).filter(w => w.replace(/[^A-Za-z']/g, ""));
  if (!rawWords.length) throw new Error("Sentence has no English words.");

  const pcm = await decodeBlobToPCM16k(audioBlob);
  const pcmNorm = normalizePCM(pcm);
  const probs = await runOnnxProbs(pcmNorm);
  const obsSegs = ctcDecodeSegments(probs, phonData);
  const heardIpa = obsSegs.map(s => s.phone).join(" ");

  const gbPhones = rawWords.map(w => getWordPhones(w, "en-gb", phonData));
  const usPhones = rawWords.map(w => getWordPhones(w, "en-us", phonData));

  const resGb = await scoreVariant(rawWords, gbPhones, pcmNorm, probs, obsSegs, phonData);
  const resUs = await scoreVariant(rawWords, usPhones, pcmNorm, probs, obsSegs, phonData);

  const pickUs = resUs.overall_score > resGb.overall_score
    || (resUs.overall_score === resGb.overall_score && resUs.target_err_count < resGb.target_err_count);
  const best = pickUs ? resUs : resGb;

  return {
    text,
    accent: pickUs ? "en-us" : "en-gb",
    score: best.overall_score,
    heard_ipa: heardIpa,
    words: best.words,
    errors: best.errors.slice(0, 3),
    all_errors: best.errors,
    categories: best.categories,
    latency_ms: Math.round(performance.now() - t0),
    model: "onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX",
  };
}
