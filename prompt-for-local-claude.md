# Red Pen: handoff + next tasks (cloud sync, then pronunciation scoring)

You are continuing work on **Red Pen**, a grammar-practice PWA in this repository (`arkiven4/english-red-ped`). A previous Claude session built it in the cloud. You have no memory of that session, so everything you need is below. Read it fully before doing anything.

## 0. First steps

1. Run `git log --oneline` and confirm the latest commit is `fcb3e53 Make light the default theme`. If it isn't, tell me what you see before changing anything.
2. Check whether GitHub Pages is live at https://arkiven4.github.io/english-red-ped/. Tell me the result.
3. Create a `CLAUDE.md` in the repo root from section 2 below, so future sessions have this context. Commit it.
4. Then do **Task A (section 3)**, then **Task B (section 4)**. For each task, **plan first and show me the plan before writing code.**

## 1. About me (the user)

- Native language: Indonesian. I'm preparing for **IELTS** (Academic). I follow the course "Basic English for IELTS and TOEFL" by Scholars Today (lessons 1–20).
- I want honest, direct feedback. Push back when my idea is weak. Don't flatter me.
- **Correct my English** at the end of every reply: show my sentence, the corrected version, and the one or two rules I broke. My repeated mistakes: missing a/an/the, missing plural -s, "its" vs "it's", missing auxiliary in questions, typos (I often drop the letter p).
- The app UI and all explanations are **English only**, no Indonesian.

## 2. Project notes (put this in CLAUDE.md)

**What it is.** An offline-capable PWA (plain HTML/CSS/JS, no build step) hosted on GitHub Pages. I install it on an Android phone (Poco X8 Pro, Chrome).

**Files**
- `index.html`, `style.css`, `app.js`: the whole app. `app.js` is one IIFE with these parts: curriculum (`UNITS`), storage (`S`, localStorage key `redpen.v1`), lesson building, views (home/Learn, practice, lesson, result, progress), and the Nib mascot SVG.
- `sw.js`: service worker. **Bump `VERSION` whenever any app file or the data changes**, or installed apps keep the old cache.
- `manifest.webmanifest`, `icons/`: PWA install.
- `data/questions.json`: about 26k generated questions. **Never edit it by hand.**
- `tools/generate.js` + `tools/stage2.js`: generator. Correct sentences come from jsRealB (ISC license); rules break them in one place. `tools/handwritten.js` and `handwritten2.js` hold hand-written items. Run `cd tools && npm install && npm run generate`.
- Question ids are hashes of the question text, so regenerating keeps saved progress valid.

**App behavior**
- 30 topics: a "Foundations" unit, then one unit per course lesson (2–20). Four question types: order, fill, spot, rewrite.
- Mastery per topic is an exponential moving average (alpha 0.15). A topic unlocks the next one at 70% (min 12 answers). "Jump here" unlocks up to a topic and makes lessons focus on it.
- Lessons have 12 questions: focus topic + weakest *practiced* topics + spaced-repetition mistakes (1/3/7/14 days). Wrong answers come back at the end of the lesson once.
- Practice tab: weak-spot mix (topics weighted by `(105 - mastery)^1.6`, question types weighted by how often I miss them) and "review my mistakes".
- Scroll pass: a daily goal of correct answers that earns 15 minutes of social media.
- Theme: **light by default**, with a System/Light/Dark switch in Progress. Teal primary (#0f8b8d), red pen brand/mistakes, green correct, amber XP. Fonts: Nunito + Caveat.
- `?test` in the URL exposes `window.__redpen` (`L`, `S`, `buildMix`) for automated tests.

**Quality rules for questions** (learned the hard way)
- Every distractor must be clearly wrong in that sentence. No ambiguous options (e.g. never offer "did" in a present-tense question without a time word).
- No junk options nobody would write ("glasss", "comfortableer", "more most modern").
- Check meaning, not only grammar: no "What did you meet?" (people take "who"), no "This phone is talented", no habits with one-off events ("buys a new phone twice a week").
- After changing the generator: read random samples per topic and mode, scan all items for known bad patterns, then fix the rules rather than deleting items one by one.

**Testing.** Serve locally with `python3 -m http.server 8000`; opening the file directly doesn't work. Test with Playwright at phone size (393×851), in light and dark mode. Answer questions right and wrong in all four modes and check that the grading matches. Check there are no console errors and no horizontal scroll.

**Known limits / backlog.** Some topics are thin: passive ~250, relative clauses ~180, superlatives ~140, advanced passive ~130, this/these ~300. Expand passive and relative clauses first (most useful for IELTS Writing). Practice mode only uses topics I've practiced at least once.

## 3. Task A: cloud backup and sync with Firebase

**Why.** Progress is only in localStorage on one phone. Clearing Chrome's data or changing phones loses everything. **I practice on three devices: my phone (installed PWA), my laptop and my PC (browser).** Sync across all three is a real need, not a nice-to-have.

**Decision: Firebase (Firestore + Google sign-in).** It has offline persistence and syncing built in, which fits an offline-first PWA, and the free tier doesn't pause idle projects (Supabase's free tier does). Check current free-tier limits and tell me if something changed.

**Requirements**
- **Login is optional.** Without signing in, the app works exactly as now (offline, localStorage). Add "Sign in with Google to back up and sync" to the Progress tab, plus sign-out and "last synced" info.
- **Load the Firebase SDK lazily**, only when I'm signed in or tap Sign in, so the offline app never depends on it. Pin exact SDK versions. Cache the SDK in `sw.js` so a signed-in user can open the app offline.
- **Data model:** one document per user, `users/{uid}`, holding the state object `S`, plus `updatedAt` and a schema version.
- **Security rules:** only `request.auth.uid == uid` can read or write their document, with size limits. Put the rules in the repo (`firebase/firestore.rules`) and explain how to deploy them.
- **Merge, never blindly overwrite.** The phone and laptop can both change progress while offline.
  - Per topic: keep the version with more answers (`n`).
  - Spaced-repetition mistakes: union, keeping the later due date.
  - `xp`, `lessons`, `answered`, `right`: take the max.
  - Streak, day counters and settings: take the most recently updated.
  - Write the merge as a pure function and unit-test it with conflicting examples before wiring it up.
- **First sign-in:** if both local and cloud data exist, merge them. Don't ask me to choose, and don't lose either.
- Sync after each lesson and on app start, not on every answer. Show a small sync status and handle errors calmly (offline is normal, not an error).
- The Firebase web config is public by design, so it's fine in the client. No other secrets in the repo.
- **Setup steps for me:** write the exact Firebase console steps in README:
  1. Create the project.
  2. Enable Google sign-in.
  3. Add `arkiven4.github.io` and `localhost` as authorized domains.
  4. Create Firestore and deploy the rules.

  Then wait for me to give you the config.
- Keep Export/Import backup as they are.

**Done when:**
- Signing in on three browsers, practicing offline on all of them, and going back online gives merged progress with nothing lost. Test this with Playwright using three browser contexts (Firebase emulator or a test project).
- The streak counts a day once, no matter how many devices I practiced on that day.
- The app still works fully offline without signing in.

## 4. Task B: pronunciation practice with a phoneme model on Hugging Face

**Goal.** A "Say it" mode: the app shows a sentence, I read it aloud, and I get feedback on *which sounds* I got wrong. The point is to catch the mistakes Indonesian speakers make: **dropped final consonants (especially -s/-es and -ed endings)**, **th → t/d** (θ, ð), **v → f**, **final /z/ → /s/**, and missing word stress. Generic ASR (Whisper, the browser's Web Speech API) is NOT acceptable as the scorer: its language model "corrects" my mistakes and hides them.

**Architecture (proposed; check it and push back if something is wrong)**

1. **Scoring service: a Hugging Face Space** in a new folder `asr/` in this repo. Deploy it to my account (`arkiven4`) with the `hf` CLI.
   - Model: a wav2vec2 **phoneme** recognizer that outputs IPA, e.g. `facebook/wav2vec2-lv-60-espeak-cv-ft` or `facebook/wav2vec2-xlsr-53-espeak-cv-ft`. **Verify the model ids exist, check their licenses, and test them** before choosing. Don't trust these names from memory.
   - Expected phonemes: `phonemizer` with the espeak-ng backend, for both `en-us` and `en-gb`. Score against whichever variant fits better; IELTS accepts both accents.
   - Scoring: prefer a goodness-of-pronunciation (GOP) score from CTC posteriors with forced alignment of the expected phonemes (e.g. `torchaudio.functional.forced_align`). Fall back to an edit-distance alignment between recognized and expected phonemes. Return per-word and per-phoneme results, and map errors to the categories above ("final -s missing in *books*", "th said as t in *three*").
   - API: `POST /score` with `{text, audio}` (16 kHz mono WAV, or webm/opus converted on the server) → JSON. Allow CORS from `https://arkiven4.github.io` and `http://localhost:8000`. **Don't store any audio.**
   - Free CPU hardware first. Measure latency for a 5-second clip. Free Spaces sleep when idle, so the app must handle a cold start of 30–60 s ("Waking up the scorer…").
   - Ask me before using paid hardware, and tell me whether I should use my own GPU instead.

2. **App changes**
   - New "Say it" mode. Put it in the Practice tab first, not in the Learn path, until the scoring is proven.
   - Pick sentences from `data/questions.json` answers that contain the target sounds (plural -s, -ed endings, th words), weighted toward the categories I fail most.
   - Record with `MediaRecorder` (needs https, which GitHub Pages provides). Show a clear recording state. Ask for microphone permission only when I tap Record.
   - Play the target sentence with the browser's `speechSynthesis` (prefer an en-GB voice), so I can hear it first. That's free and needs no server.
   - Feedback: color each word (good / unclear / wrong), list the top 1–3 problems in plain English with a tip, and let me retry.
   - Track pronunciation stats per sound category in `S`, separate from grammar mastery. Show them in Progress. Extend the Task A merge function to cover them.
   - When offline or when the Space is unreachable, disable the mode with a clear message. The rest of the app must keep working offline.
   - Keep the design rules from section 2 (teal, light default, Nib reacting to the result). Bump `sw.js` VERSION.

3. **Prove that it works before integrating** (most important)
   - Build a small test set. Use TTS audio for "correct" clips, then ask me to record about 20 sentences, twice each: once correctly, once with deliberate mistakes (drop the -s in "books", say "tree" for "three", drop -ed).
   - Report detection numbers: how many deliberate errors it caught, and how many correct sounds it falsely flagged.
   - **If it can't reliably catch a dropped final -s, tell me honestly** and propose alternatives (another model, or Azure Pronunciation Assessment) instead of shipping something that gives fake feedback.

**Definition of done**
- The Space is deployed, its URL is documented in README, and it returns scores for real phone recordings.
- Detection numbers are reported to me.
- "Say it" works on my phone from GitHub Pages.
- Playwright tests pass with the mic mocked: a fake audio blob and a mocked `/score` response.
- Everything is committed with clear messages. Ask me before pushing.
