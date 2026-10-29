# Cadence

Cadence is a local-first macOS desktop app for improving grammar, pronunciation, intonation, and impromptu public speaking.

## Principles

- 100% free and local-only inference
- No audio or writing data leaves the device
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

Cadence is designed to keep writing and audio on-device:

- **Ollama** provides optional local language-model feedback at `http://localhost:11434`.
- The Python sidecar will provide local transcription, pitch, pace, filler-word, and pronunciation metrics.
- Model weights and generated recordings are intentionally excluded from Git by `.gitignore`.

If Ollama is not running, the writing and practice UI remains available and reports the connection state instead of failing silently.
