# Red Pen

Grammar-practice PWA for an Indonesian learner preparing for IELTS Academic (course: "Basic English for IELTS and TOEFL" by Scholars Today, lessons 1–20).

## Working with the user
- Honest, direct feedback. Push back on weak ideas. No flattery.
- At the end of every reply, correct the user's English: their sentence, the corrected version, and the one or two rules broken. Repeated mistakes: missing a/an/the, missing plural -s, "its" vs "it's", missing auxiliary in questions, typos (often drops the letter p).
- App UI and all explanations: English only, no Indonesian.
- Plan first and show the plan before writing code for bigger tasks. Ask before pushing.

## What it is
Offline-capable PWA (plain HTML/CSS/JS, no build step) hosted on GitHub Pages (https://arkiven4.github.io/english-red-ped/). Installed on an Android phone (Chrome); also used in browsers on a laptop and a PC.

## Files
- `index.html`, `style.css`, `app.js`: the whole app. `app.js` is one IIFE: curriculum (`UNITS`), storage (`S`, localStorage key `redpen.v1`), lesson building, views (home/Learn, practice, lesson, result, progress), Nib mascot SVG.
- `merge.js`: pure state migration + merge used by cloud sync (works in browser and Node). Tests: `node --test tests/*.test.js`.
- `sync.js`: Firebase glue, loaded lazily with `import()` only when signed in or when the user taps Sign in. Firebase SDK is pinned (gstatic CDN) and cached by `sw.js`.
- `firebase/`: Firestore security rules + emulator config. Setup steps: `docs/firebase-setup.md`. Tests: `cd tests && npm run unit && npm run e2e` (e2e uses Firebase emulators).
- `sw.js`: service worker. **Bump `VERSION` whenever any app file or the data changes**, or installed apps keep the old cache.
- `manifest.webmanifest`, `icons/`: PWA install.
- `data/questions.json`: ~26k generated questions. **Never edit by hand.**
- `tools/generate.js` + `tools/stage2.js`: generator. Correct sentences come from jsRealB (ISC); rules break them in one place. `tools/handwritten.js` and `handwritten2.js` hold hand-written items. Run `cd tools && npm install && npm run generate`.
- Question ids are hashes of the question text, so regenerating keeps saved progress valid.

## App behavior
- 30 topics: a "Foundations" unit, then one unit per course lesson (2–20). Four question types: order, fill, spot, rewrite.
- Mastery per topic is an EMA (alpha 0.15). A topic unlocks the next at 70% (min 12 answers). "Jump here" unlocks up to a topic and focuses lessons on it.
- Lessons: 12 questions: focus topic + weakest practiced topics + spaced-repetition mistakes (1/3/7/14 days). Wrong answers return once at the end of the lesson.
- Practice tab: weak-spot mix (topics weighted by `(105 - mastery)^1.6`, question types weighted by miss rate) and "review my mistakes".
- Scroll pass: daily goal of correct answers earns 15 minutes of social media.
- Theme: light by default; System/Light/Dark switch in Progress. Teal primary (#0f8b8d), red pen brand/mistakes, green correct, amber XP. Fonts: Nunito + Caveat.
- `?test` in the URL exposes `window.__redpen` (`L`, `S`, `buildMix`) for automated tests.
- Optional Google sign-in syncs progress via Firestore (`users/{uid}`). Counters are per device and summed; practice days are a set (streak is derived); merge rules live in `merge.js`.

## Question quality rules (learned the hard way)
- Every distractor must be clearly wrong in that sentence. No ambiguous options (e.g. never "did" in a present-tense question without a time word).
- No junk options nobody would write ("glasss", "comfortableer", "more most modern").
- Check meaning, not only grammar: no "What did you meet?", no "This phone is talented", no habits with one-off events.
- After changing the generator: read random samples per topic and mode, scan all items for known bad patterns, then fix the rules rather than deleting items one by one.

## Testing
- Serve with `python3 -m http.server 8000` (file:// doesn't work).
- Playwright at phone size (393×851), light and dark. Answer right and wrong in all four modes, check grading, no console errors, no horizontal scroll.
- Chromium: `/usr/bin/chromium`.

## Backlog
Thin topics: passive ~250, relative clauses ~180, superlatives ~140, advanced passive ~130, this/these ~300. Expand passive and relative clauses first. Practice mode only uses topics practiced at least once.
