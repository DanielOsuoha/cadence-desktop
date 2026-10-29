import { useEffect, useRef, useState } from "react";
import { AudioLines, BookOpenText, Check, Mic2, Play, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { checkOllama, type OllamaStatus } from "./lib/ollama";
import { evaluate, localRequest, type Word, type Evaluation, type SyntaxResult } from "./lib/sidecar";
import { AudioPractice } from "./components/AudioPractice";

type PracticeArea = "Writing" | "Speaking" | "Pronunciation";

const pronunciationSets = [
  [['particularly', 'pərˈtɪkjələrli'], ['comfortable', 'ˈkʌmftərbəl'], ['opportunity', 'ˌɑpərˈtunəti']],
  [['literature', 'ˈlɪtərətʃər'], ['thorough', 'ˈθɜroʊ'], ['reliable', 'rɪˈlaɪəbəl']],
  [['rural', 'ˈrʊrəl'], ['world', 'wɜrld'], ['regularly', 'ˈrɛɡjələrli']],
];
const practiceAreas: { label: PracticeArea; icon: typeof BookOpenText }[] = [
  { label: "Writing", icon: BookOpenText },
  { label: "Speaking", icon: Mic2 },
  { label: "Pronunciation", icon: AudioLines },
];

function App() {
  const [activeArea, setActiveArea] = useState<PracticeArea>("Writing");
  const [compound, setCompound] = useState("I prepared my ideas, and I practiced them aloud.");
  const [complex, setComplex] = useState("Although I prepared my ideas, I practiced them aloud.");
  const [syntaxFeedback, setSyntaxFeedback] = useState<{ compound: SyntaxResult; complex: SyntaxResult } | null>(null);
  const [word, setWord] = useState<Word | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wordLoading, setWordLoading] = useState(true);
  const [scenarioBusy, setScenarioBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setIndex, setSetIndex] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const [audioBusy, setAudioBusy] = useState(false);
  const [writingCount, setWritingCount] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const setupHeading = useRef<HTMLHeadingElement>(null);
  const pronunciationWords = pronunciationSets[setIndex];
  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find(v => v.localService && v.lang.replace('_', '-').toLowerCase() === 'en-us');
    if (!voice) { setVoiceError('No local American English voice is available. Add an English (US) system voice in your device settings, then retry.'); return; }
    setVoiceError(''); synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = 'en-US'; utterance.rate = .85;
    utterance.onerror = () => setVoiceError('Playback could not start. Try again or check your system voice settings.');
    synth.speak(utterance);
  };
  useEffect(() => { if (settingsOpen) setupHeading.current?.focus(); }, [settingsOpen]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const [scenario, setScenario] = useState('');
  const loadWord = () => {
    setWordLoading(true);
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return localRequest<Word>(`/api/daily-word?day=${day}`).then(value => { setWord(value); setError(''); }).catch(e => setError(e.message)).finally(() => setWordLoading(false));
  };
  useEffect(() => { void loadWord(); }, []);
  const analyzeWriting = async () => {
    if (!word) return;
    setBusy(true); setError(''); setEvaluation(null);
    try { const result = await evaluate(compound, complex, word.word); setSyntaxFeedback(result.syntax); setEvaluation(result); setWritingCount(count => count + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed.'); }
    finally { setBusy(false); }
  };
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>("checking");

  useEffect(() => {
    const controller = new AbortController();
    checkOllama(controller.signal)
      .then((available) => setOllamaStatus(available ? "available" : "offline"))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOllamaStatus("offline");
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#practice-heading">Skip to practice</a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>cadence</span>
        </div>

        <nav className="practice-nav" aria-label="Practice areas">
          <p className="eyebrow">Practice</p>
          {practiceAreas.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item ${activeArea === label ? "is-active" : ""}`}
              key={label}
              aria-current={activeArea === label ? "page" : undefined}
              disabled={audioBusy}
              onClick={() => { setActiveArea(label); window.speechSynthesis?.cancel(); }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="local-status">
            <span className={`status-dot ${ollamaStatus === "available" ? "is-ready" : ""}`} />
            <span>{ollamaStatus === "available" ? "Kimi via Ollama" : ollamaStatus === "checking" ? "Checking Ollama" : "Ollama offline"}</span>
          </div>
          <button className="settings-button" aria-label="Connection settings" aria-expanded={settingsOpen} aria-controls="connection-settings" onClick={() => setSettingsOpen(open => !open)}>
            <Settings2 size={18} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 id="practice-heading" tabIndex={-1}>A little practice. A clearer voice.</h1>
          </div>

        </header>

        <div className="content">
          {settingsOpen && <section id="connection-settings" className="setup-panel" aria-labelledby="setup-title">
            <h2 id="setup-title" ref={setupHeading} tabIndex={-1}>Your analysis connections</h2>
            <p><b>Audio & syntax:</b> processed on your device by the Python service.</p>
            <code>.venv/bin/uvicorn app:app --app-dir src-tauri/sidecar --host 127.0.0.1 --port 8765</code>
            <p><b>Writing & scenarios:</b> sent to Kimi cloud through Ollama. Model availability does not guarantee account access.</p>
            <button className="secondary-button" onClick={() => { void loadWord(); setOllamaStatus('checking'); checkOllama().then(ok => setOllamaStatus(ok ? 'available' : 'offline')).catch(() => setOllamaStatus('offline')); }}>Recheck connections</button>
          </section>}
          {audioBusy && <p className="notice" role="status">Finish recording or analysis before changing practice areas.</p>}
          {activeArea === "Writing" && (
            <section className="practice-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow accent">Writing clarity</p>
                  <h2>Give your ideas room to breathe.</h2>
                  <p className="muted">Build both structures from today’s word, then get a local structure check and Kimi writing feedback.</p>
                </div>
                <span className="local-badge"><span className="status-dot" /> Local syntax · Cloud coaching</span>
              </div>
              <div className="word-of-day">
                <span className="card-label">Word of the day</span>
                <strong>{word?.word ?? (wordLoading ? 'Loading today’s word…' : 'Connect local analysis')}</strong>
                <span className="word-pronunciation">{word ? `[${word.general_american_phonemes.join(' ')}] · ${word.part_of_speech} · ${word.definition}` : wordLoading ? 'Getting your daily vocabulary ready.' : 'Open connection settings to start the local service, then retry.'}</span>
                {word && <p className="word-example">{word.sample_context}</p>}
                {!word && !wordLoading && <button className="secondary-button" onClick={() => void loadWord()}>Retry connection</button>}
                {word && <button className="secondary-button" disabled={scenarioBusy} onClick={async () => { setScenarioBusy(true); setError(''); try { const result = await localRequest<{scenario: string}>('/api/scenario', { method: 'POST' }); setScenario(result.scenario); } catch(e) { setError(e instanceof Error ? e.message : 'Scenario unavailable'); } finally { setScenarioBusy(false); } }}>{scenarioBusy ? 'Creating your scenario…' : 'Generate a Kimi scenario'}</button>}
                {scenario && <p>{scenario}</p>}
              </div>
              <div className="syntax-fields">
                <label className="syntax-field" htmlFor="compound-input">
                  <span><b>01</b> Compound sentence <small>two independent clauses</small></span>
                  <textarea className="writing-input" disabled={busy} value={compound} onChange={(event) => { setCompound(event.target.value); setSyntaxFeedback(null); setEvaluation(null); }} id="compound-input" maxLength={3000} aria-label="Compound sentence" aria-describedby={syntaxFeedback ? "compound-feedback" : undefined} aria-invalid={syntaxFeedback?.compound.valid === false} />
                  {syntaxFeedback && <span id="compound-feedback" className={`field-feedback ${syntaxFeedback.compound.valid ? "is-valid" : "is-invalid"}`} role={syntaxFeedback.compound.valid ? undefined : "alert"}>{syntaxFeedback.compound.valid && <Check size={14} />}{syntaxFeedback.compound.message}</span>}
                </label>
                <label className="syntax-field" htmlFor="complex-input">
                  <span><b>02</b> Complex sentence <small>independent + dependent clause</small></span>
                  <textarea className="writing-input" disabled={busy} value={complex} onChange={(event) => { setComplex(event.target.value); setSyntaxFeedback(null); setEvaluation(null); }} id="complex-input" maxLength={3000} aria-label="Complex sentence" aria-describedby={syntaxFeedback ? "complex-feedback" : undefined} aria-invalid={syntaxFeedback?.complex.valid === false} />
                  {syntaxFeedback && <span id="complex-feedback" className={`field-feedback ${syntaxFeedback.complex.valid ? "is-valid" : "is-invalid"}`} role={syntaxFeedback.complex.valid ? undefined : "alert"}>{syntaxFeedback.complex.valid && <Check size={14} />}{syntaxFeedback.complex.message}</span>}
                </label>
              </div>
              <div className="panel-actions">
                <span className="word-count">{compound.trim().split(/\s+/).filter(Boolean).length + complex.trim().split(/\s+/).filter(Boolean).length} words total</span>
                <button className="primary-button" disabled={busy || !word || !compound.trim() || !complex.trim()} onClick={() => void analyzeWriting()}>
                  <Sparkles size={17} aria-hidden="true" /> {busy ? "Analyzing your sentences…" : "Analyze sentences"}
                </button>
              </div>
              {error && <p className="notice" role="alert">{error}</p>}
              {evaluation?.error && <p className="notice" role="alert">{evaluation.error}</p>}
              {evaluation?.spelling_flags.map((flag, i) => <p key={i}>American spelling: {flag.original} → {flag.replacement}</p>)}
              {evaluation?.feedback && <div className="feedback-card" aria-live="polite">
                <p><b>Glow:</b> {evaluation.feedback.glow}</p>
                <p><b>Grow:</b> {evaluation.feedback.grow}</p>
                <p><b>American polish:</b> {evaluation.feedback.american_polish}</p>
                <p>Vocabulary: {evaluation.feedback.vocabulary_score}/10 · {evaluation.feedback.word_of_day_used_correctly ? 'Appropriate usage' : 'Review word usage'}</p>
              </div>}
              <AudioPractice onBusyChange={setAudioBusy} onComplete={() => setAudioCount(count => count + 1)} targets={word ? [word.word] : []} />
            </section>
          )}

          {activeArea === "Speaking" && (
            <section className="practice-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow accent">Impromptu speaking</p>
                  <h2>Take a moment. Then make it yours.</h2>
                  <p className="muted">You have two minutes to respond. There is no perfect answer—only a clear beginning, middle, and end.</p>
                </div>

              </div>
              <div className="prompt-card"><span>Today's prompt</span><strong>What is a small habit that has changed the way you think?</strong></div>
              <AudioPractice onBusyChange={setAudioBusy} onComplete={() => setAudioCount(count => count + 1)} targets={word ? [word.word] : []} />
            </section>
          )}

          {activeArea === "Pronunciation" && (
            <section className="practice-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow accent">General American</p>
                  <h2>Make every syllable intentional.</h2>
                  <p className="muted">Practice the sounds that matter most for your next conversation.</p>
                </div>
                <button className="reset-button" disabled={audioBusy} onClick={() => { setSetIndex(index => (index + 1) % pronunciationSets.length); setVoiceError(''); window.speechSynthesis?.cancel(); }}><RotateCcw size={15} aria-hidden="true" /> New set</button>
              </div>

              <div className="pronunciation-list">
                {pronunciationWords.map(([word, phonetic], index) => (
                  <div className="pronunciation-row" key={word}>
                    <span className="word-index">0{index + 1}</span>
                    <strong>{word}</strong>
                    <span className="phonetic">/{phonetic}/</span>
                    <button className="play-button" aria-label={`Play ${word}`} disabled={audioBusy} onClick={() => speak(word)}><Play size={14} fill="currentColor" /></button>
                  </div>
                ))}
              </div>
              {voiceError && <p className="notice" role="alert">{voiceError}</p>}
              <AudioPractice onBusyChange={setAudioBusy} onComplete={() => setAudioCount(count => count + 1)} targets={pronunciationWords.map(([word]) => word)} />
            </section>
          )}

          <div className="section-heading"><div><p className="eyebrow">Small steps add up</p><h2>This session</h2></div></div>
          {writingCount + audioCount === 0 ? <div className="empty-state"><h3>Your next step starts here.</h3><p>Analyze a sentence pair or record your voice to begin. Completed checks will appear here during this session.</p></div> :
            <section className="progress-grid" aria-label="Completed checks this session">
              <article className="progress-card"><div className="card-icon writing-icon"><BookOpenText size={19} /></div><div className="card-copy"><span className="card-label">Writing practice</span><strong>{writingCount} sentence {writingCount === 1 ? 'pair checked' : 'pairs checked'}</strong><small>This session only</small></div></article>
              <article className="progress-card"><div className="card-icon speaking-icon"><Mic2 size={19} /></div><div className="card-copy"><span className="card-label">Voice practice</span><strong>{audioCount} {audioCount === 1 ? 'recording analyzed' : 'recordings analyzed'}</strong><small>This session only</small></div></article>
            </section>}

          <section className="quote-card">
            <div className="quote-mark">“</div>
            <blockquote>Clarity is not about having fewer ideas. It is about giving each one room to be heard.</blockquote>
            <span className="quote-caption">A note for your practice today</span>
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
