# Four-pillar implementation audit

## Before

- Vocabulary was a fixed UI string; syntax checks used regex splitting.
- Recording only toggled a visual state; there was no Python service.
- No acoustic pronunciation checks existed.
- The unused Ollama wrapper requested JSON but did not validate a feedback schema.

## Implemented

1. 118 curated advanced-study entries, daily calendar selection, CMUdict ARPABET
   targets, and optional word-grounded scenarios. spaCy dependency checks reject
   missing independent/subordinate structures before model evaluation. Semicolon
   clauses are also parsed separately to accommodate spaCy attachment differences.
2. MediaRecorder capture, Web Audio downmix/resampling, PCM16 WAV encoding,
   bounded multipart ingestion, soundfile decoding in memory, concurrent Whisper
   and pYIN, duration-based WPM, and timestamped filler matches.
3. CMUdict and offline g2p_en targets; probability checks below 0.65 and phonetic
   similarity review cues for daily vocabulary and key content words. Missing
   targets are distinguished from evidence of pronunciation errors.
4. American spelling flags before inference, two calibration examples, JSON-mode
   requests, strict Pydantic output validation, and actionable connection/account
   errors that preserve successful deterministic results.

The user explicitly approved Kimi cloud for writing after the original local-only
brief. Audio and syntax stay local; writing and scenarios use `kimi-k2.6:cloud` by
default. The UI and README disclose this distinction.

## Verification performed

- 22 Python tests passed, including real spaCy and pYIN; model calls are isolated
  in the unit suite with response fixtures and HTTP transport assertions.
- `npm run build` passed; `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- Real loopback HTTP health, daily-word and syntax-rejection requests passed.
- Real Whisper + pYIN HTTP request on 9.75 seconds of locally synthesized speech
  returned a transcript, 166 WPM, 35.06 Hz pitch standard deviation, and timestamped
  `um`, `you know`, and `actually` matches.
- The unknown-word g2p_en fallback produced phonemes using provisioned local data.
- Headless Chrome with a synthetic microphone completed recording/conversion and
  upload. Inspection of the uploaded WAV confirmed 16000 Hz, 16 bits, one channel.
  The UI exposed validation errors through aria-invalid and linked descriptions;
  no browser JavaScript errors occurred. This browser test stubbed the analysis
  response; the separate real HTTP test exercised the actual audio engine.
- Real Kimi request reached Ollama but returned HTTP 402 (model not included in
  current account usage). Successful Kimi output remains unverified. The app now
  reports this specific limitation; a regression test covers that failure path.

## Remaining boundaries

- The Python service is started separately, not bundled into the desktop artifact.
- Interactive macOS microphone permissions and WKWebView capture need a native
  manual run; Chrome verification does not establish those behaviors.
- Whisper recognition confidence is not phoneme-level forced alignment. These
  attention items cannot establish a particular rhotic/vowel error.
- Vocabulary labels are editorial, not certified CEFR classifications. Dependency
  parser decisions and fixed pitch thresholds remain fallible practice heuristics.
- The original history/streak display placeholders and complete timed gauntlet are
  outside this four-pillar audit.
