# Red Pen

A grammar game for learners of English, built as an installable offline web app (PWA).

Four exercise types: **put in order**, **fill the gap**, **spot the mistake**, **fix the sentence**.
The mistakes are the ones Indonesian speakers often make in English: missing *-s* and *a/an*,
*he/she* confusion, *"I am agree"*, *"have"* instead of *there is/are*, verbs that don't change for the past, question word order.

## How it works

- **30 topics**: a Foundations unit, then one unit per lesson of the *Basic English for IELTS and TOEFL* course (lessons 2–20). The next topic unlocks at 70% mastery. **Jump here** unlocks the lesson your class is on; lessons then focus on it.
- **Mastery per topic** is a moving average of your recent answers (recent answers count more).
- **Each lesson** has 12 questions: mostly your current topic, plus your weakest *practiced* topics and mistakes that are due again.
- **Practice tab**: a *weak-spot mix* of random topics, weighted toward your weakest practiced topics and the question types you miss most, a *review my mistakes* lesson, and **Say it** (phoneme-level pronunciation practice).
- **Say it (pronunciation)**: read a sentence aloud and get per-word phoneme feedback on the sounds Indonesian learners often miss (final *-s / -es*, past *-ed*, *th* `/θ, ð/`, *v* vs *f*, and voiced final `/z/`). Powered by `onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX` + `espeak-ng` (`en-GB` and `en-US`), running directly in the browser via ONNX Runtime Web and cached after the first load. Companion Hugging Face Space: https://huggingface.co/spaces/arkiven4/red-pen-asr.
- **Mistakes come back** at the end of the lesson, then after 1, 3, 7 and 14 days.
- **Scroll pass**: a daily goal of correct answers (5/10/20/30).
- Progress is stored in the browser (`localStorage`). Use **Progress → Backup file → Export** now and then.
- **Cloud backup and sync (optional):** sign in with Google in the Progress tab to keep the phone, laptop and PC in sync. Without signing in, the app works exactly as before and never loads Firebase.

## Cloud backup and sync

Progress syncs through Firebase (Google sign-in + Firestore, free Spark plan). **Setup steps: [docs/firebase-setup.md](docs/firebase-setup.md).**

- One document per user: `users/{uid}` = `{ state, schema, updatedAt }`. `state` is the progress as a JSON string.
- Security rules: [`firebase/firestore.rules`](firebase/firestore.rules). Only the signed-in owner can read or write their document.
- Each sync reads the document, merges it with local progress and writes the result back in one transaction. The merge (`merge.js`) never overwrites blindly:
  - counters (XP, lessons, answers) are kept per device and added up;
  - per topic, the version with more answers wins;
  - mistakes: the most recent change wins (a finished mistake does not come back);
  - the streak comes from the set of days you practiced, so a day counts once on any number of devices;
  - settings: the most recent change wins;
  - **Reset all progress** resets every device at its next sync.
- Syncs on app start, after each lesson, when the device comes back online, and when you leave the app with unsynced changes.
- `sync.js` and the Firebase SDK (pinned to 13.2.0, from gstatic) load only when you're signed in or tap Sign in. The service worker caches them, so a signed-in user can still open the app offline.
- The Firebase web config in `firebase-config.js` is public by design.

## Run it

Any static file server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` directly from disk does not work, because the browser blocks loading `data/questions.json` from `file://`.)

## Publish on GitHub Pages

1. Repository **Settings → Pages**.
2. **Source:** Deploy from a branch. **Branch:** `main`, folder `/ (root)`. Save.
3. After a minute the app is at `https://<your-username>.github.io/english-red-ped/`.
4. On Android, open that link in Chrome → menu (⋮) → **Install app**.

## The questions

`data/questions.json` is generated. Don't edit it by hand.

```bash
cd tools
npm install
npm run generate          # PER_MODE=320 by default: questions per topic per exercise type
```

- `tools/generate.js` builds correct sentences with [jsRealB](https://github.com/rali-udem/jsRealB) (ISC license),
  then breaks them in one place with rules for each topic. Every generated sentence is checked against jsRealB's own output;
  anything that differs is dropped.
- `tools/stage2.js` generates the course topics (lessons 2–20) from word banks; verb, plural and adjective forms come from jsRealB.
- `tools/handwritten.js` and `tools/handwritten2.js` hold questions the generator can't make well (uncountable nouns, *the*, FANBOYS, the course's own practice items).
- Question ids are hashes of the question text, so regenerating keeps saved progress pointing at the same questions.
- After regenerating or changing any app file, **bump `VERSION` in `sw.js`**, otherwise installed apps keep the old cached version.

Add `?test` to the URL to expose `window.__redpen` (lesson and progress state) for automated tests.

## Tests

```bash
cd tests && npm install
npm run unit   # merge rules
npm run e2e    # offline app, three-device sync on the Firebase emulators, security rules (needs Java)
```
