# Cadence

Cadence is a macOS desktop app for improving grammar, pronunciation, intonation, and impromptu public speaking.

## Principles

- Local audio models; writing inference through the configured Ollama service
- Audio analysis remains local; writing feedback uses the configured Ollama model
- Native desktop packaging through Tauri
- Replaceable model adapters for grammar, speech recognition, and pronunciation analysis

## Development

```bash
npm install
npm run dev
npm run tauri:dev
```

The macOS desktop shell lives under `src-tauri/`. Rust and Xcode Command Line Tools are required for native builds.

## Local services

Cadence separates local audio analysis from configured writing inference:

- **Ollama** provides language-model feedback at `http://localhost:11434`. The current default is `kimi-k2.6:cloud`.
- The Python sidecar provides local transcription, pitch, pace, filler-word, and pronunciation metrics.
- Model weights and generated recordings are intentionally excluded from Git by `.gitignore`.

If Ollama is not running, the writing and practice UI remains available and reports the connection state instead of failing silently.

## Run the local analysis service

From the repository root (Python 3.10+; tested with Python 3.13 on Apple Silicon):

```bash
python3 -m venv .venv
.venv/bin/pip install -r src-tauri/sidecar/requirements.txt
.venv/bin/python src-tauri/sidecar/provision.py
ollama pull kimi-k2.6:cloud
```

Provisioning downloads public packages once. Audio analysis stays local. With
`kimi-k2.6:cloud`, writing feedback is sent through Ollama Cloud; use a local model
instead if that privacy boundary is not acceptable.

In separate terminals:

```bash
ollama serve  # omit if Ollama is already running
.venv/bin/uvicorn app:app --app-dir src-tauri/sidecar --host 127.0.0.1 --port 8765
npm run tauri:dev  # or npm run dev for browser development
```

The Python service is currently launched separately; it is not yet packaged as a native
Tauri sidecar executable. Native microphone permission is declared in `src-tauri/Info.plist`.
Allow microphone access when macOS prompts. Audio is limited to two minutes in the UI.

`CADENCE_WHISPER_MODEL` can point to another provisioned faster-whisper directory.
`CADENCE_OLLAMA_MODEL` defaults to `kimi-k2.6:cloud`. Set it to a locally installed
model such as `llama3:8b` or `mistral:7b` if you want fully local writing feedback.

## Analysis contract

- `GET /api/health`: checks the spaCy parser; 503 explains missing model setup.
- `GET /api/daily-word?day=YYYY-MM-DD`: deterministic selection from 118 curated
  advanced-study words, with definitions, examples, and General American ARPABET.
  Dates supplied by the writing UI use the user's local calendar.
- `POST /api/scenario`: optional Ollama scenario grounded in the curated word (Kimi cloud by default).
- `POST /api/evaluate`: JSON `{compound, complex, word}`. Dependency checks and
  whole-word usage run before any coaching call. Structural failures return field
  errors; unavailable or invalid model output preserves the structural results.
- `POST /api/analyze-audio`: multipart `audio` (16 kHz, PCM16 mono WAV) and `targets`
  (space-separated vocabulary/content words). The bounded multipart parser and
  soundfile decoder keep audio entirely in memory; no recordings are persisted.

Whisper provides word timestamps/probabilities and segment average log probabilities
(not individual token log probabilities). Pitch uses 50 ms pYIN windows and a 20 Hz
standard-deviation threshold, with null results when voiced evidence is insufficient.
WPM uses the full recording duration, including pauses. Filler matches include exact
start/end timestamps; words such as “like” can be intentional, so the UI says “possible.”

Pronunciation attention items compare CMUdict targets (g2p_en for unknown words) with
recognized words and a 0.65 confidence threshold. These are review cues, not measured
phoneme alignment or proof of dropped rhotics/vowel substitutions. Pitch thresholds
are practice heuristics, not clinical assessments. spaCy dependency parsing is
repeatable with the installed model, but it can misparse language; it is not a full
proof of grammatical correctness. The vocabulary bank is an editorial advanced-study
selection, not a certified CEFR classification; `diffident` has a manually supplied
ARPABET entry, and the other entries use CMUdict's first pronunciation variant.

## Verification

```bash
npm run build
PYTHONPATH=src-tauri/sidecar .venv/bin/pytest -q src-tauri/sidecar/tests
cargo check --manifest-path src-tauri/Cargo.toml
```

Tests exercise real spaCy parsing and pYIN, syntax rejection before LLM calls, strict
feedback validation, pronunciation confidence boundaries, timestamps, and multipart
uploads larger than the normal spooling threshold with temporary-file creation blocked.
Whisper and coaching are stubbed in unit tests; real-model checks require provisioning.

The UI displays real session-only writing and recording counts. Persistent history
and the full timed gauntlet remain separate work. Speaking includes topic selection
and a scratchpad; recordings show a live two-minute countdown.
