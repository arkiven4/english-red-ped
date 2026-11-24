FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/hf_cache \
    MODEL_ID=facebook/wav2vec2-lv-60-espeak-cv-ft

RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.6.0+cpu \
    -r /app/requirements.txt

# Pre-download model weights and processor at build time so cold starts are fast
RUN python3 -c "from transformers import Wav2Vec2ForCTC, Wav2Vec2FeatureExtractor; \
    m='facebook/wav2vec2-lv-60-espeak-cv-ft'; \
    Wav2Vec2FeatureExtractor.from_pretrained(m); \
    Wav2Vec2ForCTC.from_pretrained(m)"

COPY app.py /app/app.py

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
