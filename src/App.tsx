import { useEffect, useState } from "react";
import { AudioLines, BookOpenText, Check, Clock3, Mic2, Play, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { checkOllama, type OllamaStatus } from "./lib/ollama";

type PracticeArea = "Writing" | "Speaking" | "Pronunciation";

const practiceAreas: { label: PracticeArea; icon: typeof BookOpenText }[] = [
  { label: "Writing", icon: BookOpenText },
  { label: "Speaking", icon: Mic2 },
  { label: "Pronunciation", icon: AudioLines },
];

function App() {
  const [activeArea, setActiveArea] = useState<PracticeArea>("Writing");
  const [draft, setDraft] = useState(
    "Although I had prepared my ideas, I was speaking too quickly and my main point got lost.",
  );
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
            <p className="eyebrow">Tuesday, October 28</p>
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
                  <p className="muted">Write naturally. Cadence will look for compound and complex structures without rewriting your voice.</p>
                </div>
                <span className="local-badge"><span className="status-dot" /> On-device analysis</span>
              </div>
              <textarea className="writing-input" value={draft} onChange={(event) => { setDraft(event.target.value); setIsAnalyzed(false); }} aria-label="Writing practice" />
              <div className="panel-actions">
                <span className="word-count">{draft.trim().split(/\s+/).filter(Boolean).length} words</span>
                <button className="primary-button" onClick={() => setIsAnalyzed(true)}>
                  <Sparkles size={17} /> Analyze sentence
                </button>
              </div>
              {isAnalyzed && (
                <div className="feedback-card">
                  <div className="feedback-title"><Check size={17} /> Strong structure detected</div>
                  <p>Your opening clause sets context before the main idea. Try a brief pause after “ideas” to make the contrast easier to follow.</p>
                </div>
              )}
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
              <div className="recording-area">
                <div className={`record-orb ${isRecording ? "is-recording" : ""}`}><Mic2 size={26} /></div>
                <button className="record-button" onClick={() => setIsRecording((current) => !current)}>
                  {isRecording ? "Stop recording" : "Start recording"}
                </button>
                <span>{isRecording ? "Listening locally…" : "Your recording stays on this device."}</span>
              </div>
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
