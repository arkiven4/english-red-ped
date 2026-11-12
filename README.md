# Red Pen

A grammar game for learners of English, built as an installable offline web app (PWA).

Four exercise types: **put in order**, **fill the gap**, **spot the mistake**, **fix the sentence**.
The mistakes are the ones Indonesian speakers often make in English: missing *-s* and *a/an*,
*he/she* confusion, *"I am agree"*, *"have"* instead of *there is/are*, verbs that don't change for the past, question word order.

## How it works

- **30 topics**: a Foundations unit, then one unit per lesson of the *Basic English for IELTS and TOEFL* course (lessons 2–20). The next topic unlocks at 70% mastery. **Jump here** unlocks the lesson your class is on; lessons then focus on it.
- **Mastery per topic** is a moving average of your recent answers (recent answers count more).
- **Each lesson** has 12 questions: mostly your current topic, plus your weakest *practiced* topics and mistakes that are due again.
- **Mistakes come back** at the end of the lesson, then after 1, 3, 7 and 14 days.
- **Scroll pass**: a daily goal of correct answers (5/10/20/30).
- Progress is stored in the browser (`localStorage`). Use **Progress → Backup → Export** now and then.

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
