"""Red Pen phoneme-level pronunciation scorer (ONNX Runtime + FastAPI).

Uses onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX (model_q4f16.onnx, 197 MB)
+ espeak-ng (en-gb and en-us) to detect segmental pronunciation errors common
for Indonesian IELTS learners:
  - final_s : dropped final -s / -es (/s/, /z/, /ɪz/)
  - final_ed: dropped final -ed (/t/, /d/, /ɪd/)
  - th      : /θ/ -> /t, s, f/ or /ð/ -> /d, z, v/
  - v_f     : /v/ -> /f, b, p/ (verified with a 350ms context-masked acoustic window
              so wav2vec2's sentence-level attention does not hallucinate /v/ from context)
  - z_s     : word-final /z/ strongly devoiced to /s/

Audio is decoded in memory with ffmpeg and never written to disk.
"""

from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import time
import urllib.request
from typing import Any

import numpy as np
import onnxruntime as ort

MODEL_REPO = os.environ.get("MODEL_REPO", "onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX")
MODEL_FILE = os.environ.get("MODEL_FILE", "onnx/model_q4f16.onnx")
CACHE_DIR = os.environ.get("REDPEN_ONNX_CACHE", "/tmp/redpen_onnx")
SAMPLE_RATE = 16000
MAX_AUDIO_SECONDS = 20.0

os.makedirs(CACHE_DIR, exist_ok=True)
MODEL_PATH = os.path.join(CACHE_DIR, "lv60_q4f16.onnx")
VOCAB_PATH = os.path.join(CACHE_DIR, "vocab.json")

if not os.path.exists(VOCAB_PATH):
    urllib.request.urlretrieve(f"https://huggingface.co/{MODEL_REPO}/raw/main/vocab.json", VOCAB_PATH)
if not os.path.exists(MODEL_PATH):
    urllib.request.urlretrieve(f"https://huggingface.co/{MODEL_REPO}/resolve/main/{MODEL_FILE}", MODEL_PATH)

with open(VOCAB_PATH, "r", encoding="utf-8") as _f:
    VOCAB: dict[str, int] = json.load(_f)
ID_TO_TOKEN: dict[int, str] = {v: k for k, v in VOCAB.items()}
SPECIAL_IDS = {VOCAB.get("<pad>", 0), VOCAB.get("<s>", 1), VOCAB.get("</s>", 2), VOCAB.get("<unk>", 3)}

_sess_opts = ort.SessionOptions()
_sess_opts.intra_op_num_threads = int(os.environ.get("OMP_NUM_THREADS", "2"))
SESSION = ort.InferenceSession(MODEL_PATH, sess_options=_sess_opts, providers=["CPUExecutionProvider"])
INPUT_NAMES = [i.name for i in SESSION.get_inputs()]

VOWELS = {
    "i", "iː", "ɪ", "ᵻ", "e", "ɛ", "æ", "a", "ɑ", "ɑː", "ɒ", "ɔ", "ɔː", "o", "oː", "ʊ", "u", "uː",
    "ʌ", "ɐ", "ə", "ɜ", "ɜː", "ɚ", "ɝ", "eɪ", "aɪ", "ɔɪ", "aʊ", "oʊ", "əʊ", "ɪə", "eə", "ʊə", "əl",
    "ɑːɹ", "ɔːɹ", "oːɹ", "ɛɹ", "ɪɹ", "ʊɹ", "aɪə", "aɪɚ", "ø",
}
RHOTICS = {"ɹ", "r", "ɚ", "ɝ"}
EQUIV_GROUPS = [
    {"i", "iː", "ɪ", "ᵻ"},
    {"e", "ɛ", "æ", "a"},
    {"a", "æ", "ɑ", "ɑː", "ɒ", "ʌ", "ɐ"},
    {"ɔ", "ɔː", "ɒ", "o", "oː", "oʊ", "əʊ"},
    {"u", "uː", "ʊ"},
    {"ə", "ɜ", "ɜː", "ʌ", "ɐ", "ɚ", "ɝ", "ᵻ", "əl"},
    {"eɪ", "e", "ɛ"},
    {"oʊ", "əʊ", "o", "ɔː"},
    {"ɹ", "r", "ɚ", "ɝ"},
    {"t", "ɾ", "th", "tʰ"},
    {"d", "ɾ"},
    {"p", "ph", "pʰ"},
    {"k", "kh", "kʰ"},
    {"z", "s"},
]


def clean_tok(t: str) -> str:
    t = re.sub(r"[1-5]$", "", t)
    if t == "ts.":
        return "t"
    return t


def are_allophones(p1: str, p2: str) -> bool:
    p1, p2 = clean_tok(p1), clean_tok(p2)
    if p1 == p2:
        return True
    for g in EQUIV_GROUPS:
        if p1 in g and p2 in g:
            return True
    if (p1 in {"ɑːɹ", "ɔːɹ", "oːɹ", "ɛɹ", "ɪɹ", "ʊɹ"} and p2 in VOWELS | RHOTICS) or (
        p2 in {"ɑːɹ", "ɔːɹ", "oːɹ", "ɛɹ", "ɪɹ", "ʊɹ"} and p1 in VOWELS | RHOTICS
    ):
        return True
    return False


def sub_cost(exp_p: str, obs_p: str) -> float:
    exp_p, obs_p = clean_tok(exp_p), clean_tok(obs_p)
    if exp_p == obs_p:
        return 0.0
    if are_allophones(exp_p, obs_p):
        return 0.2
    confusions = [
        {"θ", "t", "s", "f", "d"},
        {"ð", "d", "z", "v", "t"},
        {"v", "f", "b", "p", "m"},
        {"z", "s", "ʃ", "ʒ"},
        {"t", "d", "k", "p"},
    ]
    for g in confusions:
        if exp_p in g and obs_p in g:
            return 0.45
    if (exp_p in VOWELS and obs_p in VOWELS) or (exp_p in RHOTICS and obs_p in RHOTICS):
        return 0.45
    return 1.1


def decode_audio(raw_bytes: bytes) -> np.ndarray:
    """Decode any audio container (webm/opus, wav, mp3, ogg) to 16 kHz mono float32 in memory."""
    if not raw_bytes:
        raise ValueError("Empty audio payload.")
    proc = subprocess.run(
        [
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
            "-i", "pipe:0",
            "-ac", "1", "-ar", str(SAMPLE_RATE),
            "-f", "f32le", "pipe:1",
        ],
        input=raw_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0 or not proc.stdout:
        err = proc.stderr.decode("utf-8", "ignore").strip()
        raise ValueError(f"Could not decode audio: {err or 'invalid format'}")
    pcm = np.frombuffer(proc.stdout, dtype=np.float32).copy()
    max_samples = int(MAX_AUDIO_SECONDS * SAMPLE_RATE)
    if pcm.size > max_samples:
        pcm = pcm[:max_samples]
    if pcm.size < int(0.15 * SAMPLE_RATE):
        raise ValueError("Recording is too short.")

    peak = float(np.max(np.abs(pcm)))
    if peak < 1e-4:
        raise ValueError("No speech detected in the recording.")
    pcm = (pcm - float(np.mean(pcm))) / float(np.sqrt(np.var(pcm) + 1e-7))
    return pcm


def run_onnx(pcm_norm: np.ndarray) -> np.ndarray:
    """Run wav2vec2 ONNX session and return frame probability matrix (T, V)."""
    x = pcm_norm.reshape(1, -1).astype(np.float32)
    feed: dict[str, Any] = {"input_values": x}
    if "attention_mask" in INPUT_NAMES:
        feed["attention_mask"] = np.ones_like(x, dtype=np.int64)
    logits = SESSION.run(["logits"], feed)[0][0]
    e = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    return e / np.sum(e, axis=-1, keepdims=True)


def local_window_probs(pcm_norm: np.ndarray, center_frame: float, half_samples: int = 2800) -> np.ndarray:
    """Run wav2vec2 on a 350ms context-masked window centered at center_frame (~20ms/frame)."""
    c = int(round(center_frame * 320 + 160))
    seg = pcm_norm[max(0, c - half_samples) : min(len(pcm_norm), c + half_samples)]
    if seg.size < 1600:
        return np.zeros((1, len(VOCAB)), dtype=np.float32)
    seg = (seg - float(np.mean(seg))) / float(np.sqrt(np.var(seg) + 1e-7))
    return run_onnx(seg)


def phonemize_words(words: list[str], lang: str) -> list[list[str]]:
    if not words:
        return []
    clean_words = [re.sub(r"[^A-Za-z']", "", w).lower() or "a" for w in words]
    proc = subprocess.run(
        ["espeak-ng", "-q", "--ipa", "--sep= ", "-v", lang],
        input="\n".join(clean_words).encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    lines = [ln.strip() for ln in proc.stdout.decode("utf-8", "ignore").splitlines() if ln.strip()]
    result: list[list[str]] = []
    for i in range(len(clean_words)):
        raw_line = lines[i] if i < len(lines) else ""
        toks = [p.replace("ˈ", "").replace("ˌ", "").replace("\u200d", "") for p in raw_line.split()]
        toks = [t for t in toks if t in VOCAB]
        result.append(toks or ["ə"])
    return result


def detect_word_categories(word: str, phones: list[str]) -> set[str]:
    w = re.sub(r"[^a-z']", "", word.lower())
    cats: set[str] = set()
    if not w or not phones:
        return cats
    if (w.endswith("s") or w.endswith("'s")) and len(w) >= 2 and phones[-1] in {"s", "z"}:
        cats.add("final_s")
        if phones[-1] == "z":
            cats.add("z_s")
    if w.endswith("ed") and len(w) >= 4 and phones[-1] in {"t", "d"}:
        cats.add("final_ed")
    if any(p in {"θ", "ð"} for p in phones):
        cats.add("th")
    if "v" in phones:
        cats.add("v_f")
    return cats


def ctc_decode_segments(probs: np.ndarray) -> list[dict[str, Any]]:
    top_ids = np.argmax(probs, axis=-1)
    T = len(top_ids)
    segments: list[dict[str, Any]] = []
    i = 0
    while i < T:
        tid = int(top_ids[i])
        j = i + 1
        while j < T and int(top_ids[j]) == tid:
            j += 1
        if tid not in SPECIAL_IDS:
            tok = clean_tok(ID_TO_TOKEN.get(tid, ""))
            if tok:
                peak = float(np.max(probs[i:j, tid]))
                segments.append({"id": tid, "phone": tok, "start": i, "end": j - 1, "prob": peak})
        i = j
    return segments


def align_expected_to_ctc(
    exp_items: list[dict[str, Any]],
    obs_segs: list[dict[str, Any]],
) -> list[dict[str, Any] | None]:
    N = len(exp_items)
    M = len(obs_segs)
    del_cost = 0.85
    ins_cost = 0.85
    dp = np.zeros((N + 1, M + 1), dtype=np.float32)
    back = np.zeros((N + 1, M + 1), dtype=np.int8)

    for i in range(1, N + 1):
        dp[i, 0] = i * del_cost
        back[i, 0] = 1
    for j in range(1, M + 1):
        dp[0, j] = j * ins_cost
        back[0, j] = 2

    for i in range(1, N + 1):
        ep = exp_items[i - 1]["phone"]
        for j in range(1, M + 1):
            op = obs_segs[j - 1]["phone"]
            c_diag = dp[i - 1, j - 1] + sub_cost(ep, op)
            c_del = dp[i - 1, j] + del_cost
            c_ins = dp[i, j - 1] + ins_cost
            if c_diag <= c_del and c_diag <= c_ins:
                dp[i, j] = c_diag
                back[i, j] = 0
            elif c_del <= c_ins:
                dp[i, j] = c_del
                back[i, j] = 1
            else:
                dp[i, j] = c_ins
                back[i, j] = 2

    aligned: list[dict[str, Any] | None] = [None] * N
    i, j = N, M
    while i > 0 or j > 0:
        b = int(back[i, j]) if (i > 0 and j > 0) else (1 if i > 0 else 2)
        if b == 0:
            aligned[i - 1] = obs_segs[j - 1]
            i -= 1
            j -= 1
        elif b == 1:
            aligned[i - 1] = None
            i -= 1
        else:
            j -= 1
    return aligned


def score_variant(
    words: list[str],
    word_phones: list[list[str]],
    pcm_norm: np.ndarray,
    probs: np.ndarray,
    obs_segs: list[dict[str, Any]],
) -> dict[str, Any]:
    exp_items: list[dict[str, Any]] = []
    for wi, phones in enumerate(word_phones):
        for pi, ph in enumerate(phones):
            exp_items.append({
                "word_idx": wi,
                "phone_idx": pi,
                "is_final": (pi == len(phones) - 1),
                "phone": ph,
            })

    N = len(exp_items)
    aligned = align_expected_to_ctc(exp_items, obs_segs)

    by_word: list[list[tuple[int, dict[str, Any], dict[str, Any] | None]]] = [[] for _ in words]
    for idx, item in enumerate(exp_items):
        by_word[item["word_idx"]].append((idx, item, aligned[idx]))

    word_results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    category_stats: dict[str, dict[str, int]] = {}

    def bump_cat(cat: str, ok: bool) -> None:
        st = category_stats.setdefault(cat, {"n": 0, "c": 0})
        st["n"] += 1
        if ok:
            st["c"] += 1

    total_phone_score = 0.0
    total_phones = max(1, N)

    for wi, w in enumerate(words):
        w_clean = re.sub(r"[^A-Za-z']", "", w)
        phones = word_phones[wi]
        items = by_word[wi]
        cats = detect_word_categories(w_clean, phones)

        phone_details: list[dict[str, Any]] = []
        word_issues: list[dict[str, Any]] = []
        cat_failed: set[str] = set()

        for idx, item, seg in items:
            exp_p = item["phone"]
            obs_p = seg["phone"] if seg else None
            is_final = item["is_final"]

            # Unmatched gap frames strictly between previous matched segment and next matched segment
            prev_end = -1
            for k in range(idx - 1, -1, -1):
                if aligned[k] is not None:
                    prev_end = int(aligned[k]["end"])
                    break
            next_start = len(probs)
            for k in range(idx + 1, N):
                if aligned[k] is not None:
                    next_start = int(aligned[k]["start"])
                    break
            gap_s = prev_end + 1
            gap_e = min(prev_end + 4, next_start - 1)

            def gap_prob(pset: set[str]) -> float:
                ids = [VOCAB[p] for p in pset if p in VOCAB]
                if not ids or gap_s > gap_e:
                    return 0.0
                sub = probs[max(0, gap_s) : min(len(probs), gap_e + 1)][:, ids]
                return float(np.max(sub)) if sub.size > 0 else 0.0

            p_status = "good"
            p_score = 1.0

            # 1. Final -s / -es (final_s & z_s)
            if is_final and "final_s" in cats and exp_p in {"s", "z"}:
                gp = gap_prob({"s", "z"})
                if obs_p in {"s", "z", "ʃ"} or gp >= 0.30:
                    p_status = "good"
                    p_score = 1.0
                elif gp >= 0.14:
                    p_status = "unclear"
                    p_score = 0.5
                    cat_failed.add("final_s")
                    word_issues.append({
                        "category": "final_s",
                        "severity": "unclear",
                        "word": w_clean,
                        "expected": exp_p,
                        "heard": obs_p or "none",
                        "message": f"The final -s in “{w_clean}” sounded faint.",
                        "tip": f"Finish “{w_clean}” with a clear /{exp_p}/ sound.",
                    })
                else:
                    p_status = "wrong"
                    p_score = 0.0
                    cat_failed.add("final_s")
                    word_issues.append({
                        "category": "final_s",
                        "severity": "wrong",
                        "word": w_clean,
                        "expected": exp_p,
                        "heard": obs_p or "none",
                        "message": f"Final -s missing in “{w_clean}”.",
                        "tip": f"Don't drop the -s ending: finish “{w_clean}” with a clear /{exp_p}/ sound.",
                    })

            # 2. Final -ed (final_ed)
            elif is_final and "final_ed" in cats and exp_p in {"t", "d"}:
                gp = gap_prob({"t", "d"})
                if obs_p in {"t", "d", "ɾ"} or gp >= 0.30:
                    p_status = "good"
                    p_score = 1.0
                elif gp >= 0.14:
                    p_status = "unclear"
                    p_score = 0.5
                    cat_failed.add("final_ed")
                    word_issues.append({
                        "category": "final_ed",
                        "severity": "unclear",
                        "word": w_clean,
                        "expected": exp_p,
                        "heard": obs_p or "none",
                        "message": f"The -ed ending in “{w_clean}” sounded faint.",
                        "tip": f"Tap your tongue behind your upper teeth for the /{exp_p}/ ending in “{w_clean}”.",
                    })
                else:
                    p_status = "wrong"
                    p_score = 0.0
                    cat_failed.add("final_ed")
                    word_issues.append({
                        "category": "final_ed",
                        "severity": "wrong",
                        "word": w_clean,
                        "expected": exp_p,
                        "heard": obs_p or "none",
                        "message": f"Final -ed missing in “{w_clean}”.",
                        "tip": f"Pronounce the past -ed ending in “{w_clean}” as /{exp_p}/.",
                    })

            # 3. 'th' (/θ/ or /ð/)
            elif exp_p in {"θ", "ð"}:
                if obs_p in {"θ", "ð"}:
                    p_status = "good"
                    p_score = 1.0
                else:
                    heard_lbl = obs_p if obs_p in {"t", "d", "s", "z", "f"} else ("t" if exp_p == "θ" else "d")
                    p_status = "wrong"
                    p_score = 0.0
                    cat_failed.add("th")
                    word_issues.append({
                        "category": "th",
                        "severity": "wrong",
                        "word": w_clean,
                        "expected": exp_p,
                        "heard": heard_lbl,
                        "message": f"In “{w_clean}”, “th” sounded like “{heard_lbl}”.",
                        "tip": f"Place the tip of your tongue lightly between your teeth for “th” (/{exp_p}/) in “{w_clean}”.",
                    })

            # 4. /v/ vs /f/ (v_f): verify with a 350ms context-masked window so sentence context cannot mask /f/
            elif exp_p == "v":
                center_f = 0.5 * (seg["start"] + seg["end"]) if seg else 0.5 * (gap_s + gap_e)
                lprobs = local_window_probs(pcm_norm, center_f)
                mid = len(lprobs) // 2
                lsub = lprobs[max(0, mid - 3) : min(len(lprobs), mid + 4)]
                loc_v = float(np.max(lsub[:, VOCAB["v"]])) if lsub.size else 0.0
                loc_f = float(np.max(lsub[:, [VOCAB["f"], VOCAB["p"], VOCAB["b"]]])) if lsub.size else 0.0

                if obs_p == "v" and (loc_v >= 0.25 or loc_v >= loc_f):
                    p_status = "good"
                    p_score = 1.0
                else:
                    heard_lbl = "f" if loc_f > loc_v else (obs_p or "f")
                    p_status = "wrong"
                    p_score = 0.0
                    cat_failed.add("v_f")
                    word_issues.append({
                        "category": "v_f",
                        "severity": "wrong",
                        "word": w_clean,
                        "expected": "v",
                        "heard": heard_lbl,
                        "message": f"In “{w_clean}”, “v” sounded like “{heard_lbl}”.",
                        "tip": f"Touch your top teeth to your bottom lip and vibrate your vocal cords for /v/ in “{w_clean}”.",
                    })

            # 5. General phoneme check
            else:
                if obs_p is not None and (obs_p == exp_p or are_allophones(exp_p, obs_p)):
                    p_status = "good"
                    p_score = 1.0
                elif obs_p is not None and sub_cost(exp_p, obs_p) <= 0.5:
                    p_status = "unclear"
                    p_score = 0.65
                else:
                    p_status = "wrong"
                    p_score = 0.0

            total_phone_score += p_score
            phone_details.append({
                "expected": exp_p,
                "heard": obs_p,
                "status": p_status,
                "score": round(p_score, 2),
            })

        for cat in cats:
            bump_cat(cat, cat not in cat_failed)

        w_mean = sum(p["score"] for p in phone_details) / max(1, len(phone_details))
        if any(iss["severity"] == "wrong" for iss in word_issues) or w_mean < 0.45:
            w_status = "wrong"
        elif word_issues or w_mean < 0.75:
            w_status = "unclear"
        else:
            w_status = "good"

        if w_status == "wrong" and not word_issues:
            word_issues.append({
                "category": "general",
                "severity": "wrong",
                "word": w_clean,
                "expected": "".join(phones),
                "heard": "".join(p["heard"] or "" for p in phone_details) or "none",
                "message": f"“{w_clean}” was not clear (expected /{''.join(phones)}/).",
                "tip": f"Tap Listen to hear “{w_clean}”, then say each syllable clearly.",
            })

        errors.extend(word_issues)
        word_results.append({
            "word": w,
            "clean": w_clean,
            "expected_ipa": "".join(phones),
            "heard_ipa": "".join(p["heard"] or "" for p in phone_details),
            "status": w_status,
            "score": round(w_mean * 100),
            "categories": sorted(cats),
            "phonemes": phone_details,
        })

    def err_rank(e: dict[str, Any]) -> tuple[int, int]:
        targeted = 0 if e["category"] != "general" else 1
        sev = 0 if e["severity"] == "wrong" else 1
        return (targeted, sev)

    errors.sort(key=err_rank)
    overall = round((total_phone_score / total_phones) * 100)
    target_err_count = sum(1 for e in errors if e["category"] != "general" and e["severity"] == "wrong")
    return {
        "overall_score": overall,
        "target_err_count": target_err_count,
        "words": word_results,
        "errors": errors,
        "top_errors": errors[:3],
        "categories": category_stats,
    }


def score_recording(text: str, pcm_norm: np.ndarray) -> dict[str, Any]:
    t0 = time.perf_counter()
    raw_words = [w for w in re.findall(r"[A-Za-z']+(?:[.,!?;:]*)", text.strip()) if re.sub(r"[^A-Za-z']", "", w)]
    if not raw_words:
        raise ValueError("Text must contain at least one English word.")

    probs = run_onnx(pcm_norm)
    obs_segs = ctc_decode_segments(probs)
    heard_ipa = " ".join(s["phone"] for s in obs_segs)

    gb_phones = phonemize_words(raw_words, "en-gb")
    us_phones = phonemize_words(raw_words, "en-us")

    res_gb = score_variant(raw_words, gb_phones, pcm_norm, probs, obs_segs)
    res_us = score_variant(raw_words, us_phones, pcm_norm, probs, obs_segs)

    if (res_us["overall_score"], -res_us["target_err_count"]) > (res_gb["overall_score"], -res_gb["target_err_count"]):
        best_accent = "en-us"
        best = res_us
    else:
        best_accent = "en-gb"
        best = res_gb

    elapsed_ms = round((time.perf_counter() - t0) * 1000)
    return {
        "text": text,
        "accent": best_accent,
        "score": best["overall_score"],
        "heard_ipa": heard_ipa,
        "words": best["words"],
        "errors": best["top_errors"],
        "all_errors": best["errors"],
        "categories": best["categories"],
        "latency_ms": elapsed_ms,
        "model": f"{MODEL_REPO}/{MODEL_FILE}",
    }
