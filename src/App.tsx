import { useState } from "react";
import { AudioLines, BookOpenText, Mic2, Settings2, Sparkles } from "lucide-react";

type PracticeArea = "Writing" | "Speaking" | "Pronunciation";

const practiceAreas: { label: PracticeArea; icon: typeof BookOpenText }[] = [
  { label: "Writing", icon: BookOpenText },
  { label: "Speaking", icon: Mic2 },
  { label: "Pronunciation", icon: AudioLines },
];

function App() {
  const [activeArea, setActiveArea] = useState<PracticeArea>("Writing");

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
            <span className="status-dot" />
            <span>Local mode</span>
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
          <section className="welcome-card">
            <div>
              <p className="eyebrow accent">Your next session</p>
              <h2>Find your natural rhythm.</h2>
              <p className="muted">
                A short, focused exercise to make your ideas clearer and your voice more confident.
              </p>
              <button className="primary-button">
                <Sparkles size={17} />
                Begin {activeArea.toLowerCase()} practice
              </button>
            </div>
            <div className="waveform" aria-hidden="true">
              {[28, 44, 32, 58, 38, 72, 46, 86, 54, 38, 62, 42, 76, 48, 30].map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </section>

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

