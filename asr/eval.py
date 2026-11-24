#!/usr/bin/env python3
"""Benchmark Red Pen's ONNX phoneme pronunciation scorer on 20 sentence pairs (40 clips).

Tests the exact ONNX model (onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX) and scoring
algorithm used in the browser Web Worker against 20 pairs of neural English speech clips:
  1. Correct pronunciation clip
  2. Deliberate Indonesian L1 mistake clip (dropped final -s, dropped final -ed,
     th -> t/d, v -> f) scored against the SAME target text.
"""

from __future__ import annotations

import asyncio
import os
import statistics
import sys

from app import decode_audio, score_recording

TTS_CACHE = "/tmp/redpen_onnx/tts_cache"

# 20 test pairs covering the key error categories:
# (category, target_sentence, target_word, correct_spoken_text, mistake_spoken_text)
BENCHMARK_PAIRS = [
    # --- Category 1: Dropped final -s / -es (final_s) ---
    ("final_s", "She reads three books every week.", "books",
     "She reads three books every week.", "She reads three book every week."),
    ("final_s", "He works at a big hospital.", "works",
     "He works at a big hospital.", "He work at a big hospital."),
    ("final_s", "My sister likes classical music.", "likes",
     "My sister likes classical music.", "My sister like classical music."),
    ("final_s", "The shop sells fresh apples.", "apples",
     "The shop sells fresh apples.", "The shop sells fresh apple."),
    ("final_s", "He watches television after dinner.", "watches",
     "He watches television after dinner.", "He watch television after dinner."),
    ("final_s", "Two students arrived early today.", "students",
     "Two students arrived early today.", "Two student arrived early today."),

    # --- Category 2: Dropped final -ed (final_ed) ---
    ("final_ed", "They walked to the station yesterday.", "walked",
     "They walked to the station yesterday.", "They walk to the station yesterday."),
    ("final_ed", "She cooked dinner for her family.", "cooked",
     "She cooked dinner for her family.", "She cook dinner for her family."),
    ("final_ed", "We finished our report on time.", "finished",
     "We finished our report on time.", "We finish our report on time."),
    ("final_ed", "He helped his friend move house.", "helped",
     "He helped his friend move house.", "He help his friend move house."),
    ("final_ed", "I talked to the manager last week.", "talked",
     "I talked to the manager last week.", "I talk to the manager last week."),

    # --- Category 3: th -> t / d (th) ---
    ("th", "She has three brothers in Jakarta.", "three",
     "She has three brothers in Jakarta.", "She has tree brothers in Jakarta."),
    ("th", "I think the exam was quite fair.", "think",
     "I think the exam was quite fair.", "I tink the exam was quite fair."),
    ("th", "Thank you for helping me today.", "Thank",
     "Thank you for helping me today.", "Tank you for helping me today."),
    ("th", "They live near the university.", "They",
     "They live near the university.", "Day live near the university."),
    ("th", "Both answers are completely right.", "Both",
     "Both answers are completely right.", "Boat answers are completely right."),

    # --- Category 4: v -> f (v_f) ---
    ("v_f", "The movie was very interesting.", "very",
     "The movie was very interesting.", "The movie was ferry interesting."),
    ("v_f", "We have five days left to prepare.", "five",
     "We have five days left to prepare.", "We have fife days left to prepare."),
    ("v_f", "They live in a quiet village.", "live",
     "They live in a quiet village.", "They leaf in a quiet village."),
    ("v_f", "Please save your work before leaving.", "save",
     "Please save your work before leaving.", "Please safe your work before leaving."),
]


async def ensure_clips() -> None:
    import edge_tts

    os.makedirs(TTS_CACHE, exist_ok=True)
    for idx, (_, _, _, good_s, bad_s) in enumerate(BENCHMARK_PAIRS, 1):
        for tag, txt in [(f"g_{idx}", good_s), (f"b_{idx}", bad_s)]:
            p = os.path.join(TTS_CACHE, f"{tag}.mp3")
            text_p = os.path.join(TTS_CACHE, f"{tag}.txt")
            if not os.path.exists(p) or (os.path.exists(text_p) and open(text_p).read() != txt):
                await edge_tts.Communicate(txt, "en-GB-SoniaNeural").save(p)
                with open(text_p, "w") as f:
                    f.write(txt)


def has_target_flag(resp: dict, category: str, target_word: str) -> bool:
    w_low = target_word.lower()
    for err in resp.get("all_errors", resp.get("errors", [])):
        if err.get("category") == category and err.get("word", "").lower() == w_low:
            return True
    return False


def main() -> int:
    asyncio.run(ensure_clips())

    tp_by_cat: dict[str, list[bool]] = {}
    fp_by_cat: dict[str, list[bool]] = {}
    latencies: list[float] = []

    print("\nRunning 20-pair (40-clip) pronunciation benchmark on onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX...\n")
    print(f"{'#':>2} | {'Cat':<8} | {'Word':<10} | {'Correct clip':<13} | {'Mistake clip':<13} | {'Time ms':>7}")
    print("-" * 68)

    for idx, (cat, target_sent, target_word, _, _) in enumerate(BENCHMARK_PAIRS, 1):
        good_bytes = open(os.path.join(TTS_CACHE, f"g_{idx}.mp3"), "rb").read()
        bad_bytes = open(os.path.join(TTS_CACHE, f"b_{idx}.mp3"), "rb").read()

        good_res = score_recording(target_sent, decode_audio(good_bytes))
        bad_res = score_recording(target_sent, decode_audio(bad_bytes))

        latencies.extend([good_res["latency_ms"], bad_res["latency_ms"]])

        false_pos = has_target_flag(good_res, cat, target_word)
        true_pos = has_target_flag(bad_res, cat, target_word)

        fp_by_cat.setdefault(cat, []).append(false_pos)
        tp_by_cat.setdefault(cat, []).append(true_pos)

        g_str = "FALSE ALARM" if false_pos else f"OK ({good_res['score']}%)"
        b_str = "CAUGHT" if true_pos else f"MISSED ({bad_res['score']}%)"
        ms = int(0.5 * (good_res["latency_ms"] + bad_res["latency_ms"]))
        print(f"{idx:>2} | {cat:<8} | {target_word:<10} | {g_str:<13} | {b_str:<13} | {ms:>7}")

    all_tp = [x for v in tp_by_cat.values() for x in v]
    all_fp = [x for v in fp_by_cat.values() for x in v]

    print("\n=== Detection Summary by Category ===")
    for cat in ["final_s", "final_ed", "th", "v_f"]:
        tps = tp_by_cat.get(cat, [])
        fps = fp_by_cat.get(cat, [])
        print(
            f"  {cat:<10}: caught {sum(tps)}/{len(tps)} ({100*sum(tps)/max(1,len(tps)):.0f}%) "
            f"| false alarms {sum(fps)}/{len(fps)} ({100*sum(fps)/max(1,len(fps)):.0f}%)"
        )

    print(
        f"\n  OVERALL   : caught {sum(all_tp)}/{len(all_tp)} ({100*sum(all_tp)/len(all_tp):.1f}%) "
        f"| false alarms {sum(all_fp)}/{len(all_fp)} ({100*sum(all_fp)/len(all_fp):.1f}%)"
    )
    print(
        f"  LATENCY   : median {statistics.median(latencies):.0f} ms "
        f"(mean {statistics.mean(latencies):.0f} ms, min {min(latencies):.0f} ms, max {max(latencies):.0f} ms)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
