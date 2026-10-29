import io
import os
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from threading import Lock
from pathlib import Path
import numpy as np
import soundfile as sf
from pronunciation import attention_items

POOL = ThreadPoolExecutor(max_workers=2)
MODEL_LOCK = Lock()
FILLERS = re.compile(r'\b(um|uh|like|you know|sort of|basically|actually|kind of)\b', re.I)

@lru_cache(maxsize=1)
def whisper():
    from faster_whisper import WhisperModel
    return WhisperModel(os.environ.get('CADENCE_WHISPER_MODEL', str(Path(__file__).resolve().parents[2] / 'models/whisper-base.en')), device='cpu', compute_type='int8', local_files_only=True)

def transcribe(samples):
    with MODEL_LOCK:
        segments, _ = whisper().transcribe(samples, language='en', word_timestamps=True, vad_filter=True)
        return [dict(word=w.word.strip(), start=w.start, end=w.end, probability=w.probability,
                     avg_logprob=s.avg_logprob) for s in segments for w in (s.words or [])]

def pitch(samples):
    import librosa
    f0, _, _ = librosa.pyin(samples, sr=16000, fmin=65, fmax=500, frame_length=800, hop_length=800)
    voiced = f0[np.isfinite(f0)]
    std = float(np.std(voiced)) if len(voiced) >= 3 else None
    return dict(pitch_std_hz=std, pitch_variance_hz2=float(np.var(voiced)) if std is not None else None,
                monotone_risk=std < 20 if std is not None else None, monotone_threshold_hz=20)

def fillers(words):
    text = ''; spans = []
    for word in words:
        start = len(text); text += word['word'] + ' '
        spans.append((start, len(text)-1, word))
    found = []
    for match in FILLERS.finditer(text):
        hits = [w for start, end, w in spans if start < match.end() and end > match.start()]
        found.append(dict(phrase=match.group(), start=hits[0]['start'], end=hits[-1]['end']))
    return found

def analyze(raw, targets):
    try:
        with sf.SoundFile(io.BytesIO(raw)) as source:
            if source.format != 'WAV' or source.subtype != 'PCM_16' or source.samplerate != 16000 or source.channels != 1:
                raise ValueError('Upload 16 kHz, 16-bit mono PCM WAV audio.')
            if not 0.25 <= source.frames / 16000 <= 125:
                raise ValueError('Record between 0.25 and 125 seconds.')
            samples = source.read(dtype='float32')
    except sf.LibsndfileError as error:
        raise ValueError('Invalid WAV audio.') from error
    if not np.all(np.isfinite(samples)) or np.max(np.abs(samples)) < .0001:
        raise ValueError('No audible signal. Check your microphone and try again.')
    speech = POOL.submit(transcribe, samples)
    acoustic = POOL.submit(pitch, samples)
    words = speech.result(); metrics = acoustic.result()
    duration = len(samples) / 16000
    return dict(transcript=' '.join(w['word'] for w in words), words=words,
                duration_seconds=duration, wpm=len(words)/duration*60,
                fillers=fillers(words), pronunciation=attention_items(words, targets), **metrics)
