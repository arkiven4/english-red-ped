---
title: Red Pen Pronunciation Scorer
emoji: 🖊️
colorFrom: red
colorTo: green
sdk: static
pinned: false
license: mit
---

# Red Pen Pronunciation Scorer

In-browser phoneme-level English pronunciation scorer for **Red Pen** (`https://arkiven4.github.io/english-red-ped/`).

- **Model:** `onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX` (`onnx/model_q4f16.onnx`, 197 MB, eSpeak IPA CTC phoneme recognizer)
- **Reference dictionary:** `espeak-ng` (`en-gb` and `en-us`), scored against whichever accent fits better
- **Target error categories:**
  - `final_s`: dropped final `-s` / `-es` (`/s/`, `/z/`, `/ɪz/`)
  - `final_ed`: dropped final `-ed` (`/t/`, `/d/`, `/ɪd/`)
  - `th`: `/θ/` → `/t/` or `/s/`, `/ð/` → `/d/` or `/z/`
  - `v_f`: `/v/` → `/f/` (with 350 ms context-masked window verification)
  - `z_s`: final `/z/` devoiced to `/s/`
- **Benchmark (20 sentence pairs / 40 clips):** 19/20 (95%) deliberate mistakes caught, 0/20 (0%) false alarms, median latency 664 ms.
