import { useEffect, useState } from "react";
import { AudioLines, BookOpenText, Check, Clock3, Mic2, Play, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { checkOllama, type OllamaStatus } from "./lib/ollama";
import { evaluate, localRequest, type Word, type Evaluation, type SyntaxResult } from "./lib/sidecar";
import { AudioPractice } from "./components/AudioPractice";

type PracticeArea = "Writing" | "Speaking" | "Pronunciation";

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
  const [scenario, setScenario] = useState('');
  const loadWord = () => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return localRequest<Word>(`/api/daily-word?day=${day}`).then(value => { setWord(value); setError(''); }).catch(e => setError(e.message));
  };
  useEffect(() => { void loadWord(); }, []);
  const analyzeWriting = async () => {
    if (!word) return;
    setBusy(true); setError(''); setEvaluation(null);
    try { const result = await evaluate(compound, complex, word.word); setSyntaxFeedback(result.syntax); setEvaluation(result); }
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
              onClick={() => setActiveArea(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="local-status">
            <span className={`status-dot ${ollamaStatus === "available" ? "is-ready" : ""}`} />
            <span>{ollamaStatus === "available" ? "Ollama ready" : ollamaStatus === "checking" ? "Checking local models" : "Local mode"}</span>
          </div>
          <button className="settings-button" aria-label="Open settings">
            <Settings2 size={18} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>Good evening, Daniel.</h1>
          </div>
          <div className="streak">
            <span className="streak-number">04</span>
            <span>day streak</span>
          </div>
        </header>

        <div className="content">
          {activeArea === "Writing" && (
            <section className="practice-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow accent">Writing clarity</p>
                  <h2>Give your ideas room to breathe.</h2>
                  <p className="muted">Build both structures from today’s word, then get a local grammar check without rewriting your voice.</p>
                </div>
                <span className="local-badge"><span className="status-dot" /> On-device analysis</span>
              </div>
              <div className="word-of-day">
                <span className="card-label">Word of the day</span>
                <strong>{word?.word ?? 'Local vocabulary unavailable'}</strong>
                <span>{word ? `[${word.general_american_phonemes.join(' ')}] · ${word.part_of_speech} · ${word.definition}` : 'Start the Python sidecar to load the curated word bank.'}</span>
                {word && <p>{word.sample_context}</p>}
                {!word && <button onClick={() => void loadWord()}>Retry connection</button>}
                {word && <button disabled={busy} onClick={async () => { setBusy(true); try { const result = await localRequest<{scenario: string}>('/api/scenario', { method: 'POST' }); setScenario(result.scenario); } catch(e) { setError(e instanceof Error ? e.message : 'Scenario unavailable'); } finally { setBusy(false); } }}>Generate a local scenario</button>}
                {scenario && <p>{scenario}</p>}
              </div>
              <div className="syntax-fields">
                <label className="syntax-field">
                  <span><b>01</b> Compound sentence <small>two independent clauses</small></span>
                  <textarea className="writing-input" disabled={busy} value={compound} onChange={(event) => { setCompound(event.target.value); setSyntaxFeedback(null); setEvaluation(null); }} aria-label="Compound sentence" aria-describedby="compound-feedback" aria-invalid={syntaxFeedback?.compound.valid === false} />
                  {syntaxFeedback && <span id="compound-feedback" className={`field-feedback ${syntaxFeedback.compound.valid ? "is-valid" : "is-invalid"}`} role={syntaxFeedback.compound.valid ? undefined : "alert"}>{syntaxFeedback.compound.valid && <Check size={14} />}{syntaxFeedback.compound.message}</span>}
                </label>
                <label className="syntax-field">
                  <span><b>02</b> Complex sentence <small>independent + dependent clause</small></span>
                  <textarea className="writing-input" disabled={busy} value={complex} onChange={(event) => { setComplex(event.target.value); setSyntaxFeedback(null); setEvaluation(null); }} aria-label="Complex sentence" aria-describedby="complex-feedback" aria-invalid={syntaxFeedback?.complex.valid === false} />
                  {syntaxFeedback && <span id="complex-feedback" className={`field-feedback ${syntaxFeedback.complex.valid ? "is-valid" : "is-invalid"}`} role={syntaxFeedback.complex.valid ? undefined : "alert"}>{syntaxFeedback.complex.valid && <Check size={14} />}{syntaxFeedback.complex.message}</span>}
                </label>
              </div>
              <div className="panel-actions">
                <span className="word-count">{compound.trim().split(/\s+/).filter(Boolean).length + complex.trim().split(/\s+/).filter(Boolean).length} words total</span>
                <button className="primary-button" disabled={busy || !word} onClick={() => void analyzeWriting()}>
                  <Sparkles size={17} /> Analyze sentence
                </button>
              </div>
              {error && <p role="alert">{error}</p>}
              {evaluation?.error && <p role="alert">{evaluation.error}</p>}
              {evaluation?.spelling_flags.map((flag, i) => <p key={i}>American spelling: {flag.original} → {flag.replacement}</p>)}
              {evaluation?.feedback && <div className="feedback-card" aria-live="polite">
                <p><b>Glow:</b> {evaluation.feedback.glow}</p>
                <p><b>Grow:</b> {evaluation.feedback.grow}</p>
                <p><b>American polish:</b> {evaluation.feedback.american_polish}</p>
                <p>Vocabulary: {evaluation.feedback.vocabulary_score}/10 · {evaluation.feedback.word_of_day_used_correctly ? 'Appropriate usage' : 'Review word usage'}</p>
              </div>}
              <AudioPractice targets={word ? [word.word] : []} />
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
                <div className="timer"><Clock3 size={16} /> 02:00</div>
              </div>
              <div className="prompt-card"><span>Today's prompt</span><strong>What is a small habit that has changed the way you think?</strong></div>
              <AudioPractice targets={word ? [word.word] : []} />
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
                <button className="reset-button"><RotateCcw size={15} /> New set</button>
              </div>
              <AudioPractice targets={["particularly", "comfortable", "opportunity"]} />
              <div className="pronunciation-list">
                {["particularly", "comfortable", "opportunity"].map((word, index) => (
                  <div className="pronunciation-row" key={word}>
                    <span className="word-index">0{index + 1}</span>
                    <strong>{word}</strong>
                    <span className="phonetic">/{["pərˈtɪkjələrli", "ˈkʌmftərbəl", "ˌɑpərˈtunəti"][index]}/</span>
                    <button className="play-button" aria-label={`Play ${word}`} onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(word))}><Play size={14} fill="currentColor" /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="section-heading">
            <div>
              <p className="eyebrow">Keep going</p>
              <h2>Recent progress</h2>
            </div>
            <button className="text-button">View history</button>
          </div>

          <section className="progress-grid">
            <article className="progress-card">
              <div className="card-icon writing-icon"><BookOpenText size={19} /></div>
              <div className="card-copy">
                <span className="card-label">Writing clarity</span>
                <strong>Compound structures</strong>
                <div className="progress-track"><span style={{ width: "68%" }} /></div>
                <small>68% this week</small>
              </div>
            </article>
            <article className="progress-card">
              <div className="card-icon speaking-icon"><Mic2 size={19} /></div>
              <div className="card-copy">
                <span className="card-label">Public speaking</span>
                <strong>Impromptu answers</strong>
                <div className="progress-track"><span style={{ width: "42%" }} /></div>
                <small>3 of 7 sessions</small>
              </div>
            </article>
          </section>

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
