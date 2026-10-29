import { useEffect, useRef, useState } from 'react';
import { Mic2, Square, AudioLines } from 'lucide-react';
import { toWav } from '../lib/recorder';
import { localRequest, type AudioReport } from '../lib/sidecar';

export function AudioPractice({ targets, onBusyChange, onComplete }: { targets: string[]; onBusyChange?: (busy: boolean) => void; onComplete?: () => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'analyzing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);
  const [error, setError] = useState('');
  const [report, setReport] = useState<AudioReport | null>(null);
  useEffect(() => { onBusyChange?.(state !== 'idle'); }, [state, onBusyChange]);
  useEffect(() => {
    if (state !== 'recording') return;
    const ticker = setInterval(() => setSeconds(Math.min(120, Math.floor((Date.now() - startedAt.current) / 1000))), 250);
    return () => clearInterval(ticker);
  }, [state]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; clearTimeout(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  const start = async () => {
    setState('starting'); setSeconds(0); setError(''); setReport(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Microphone recording is unavailable in this browser.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(media, mimeType ? { mimeType } : undefined); recorder.current = capture;
      const chunks: Blob[] = [];
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      capture.onerror = () => { setError('Microphone recording failed. Retry after checking permissions.'); capture.stop(); };
      capture.onstop = async () => {
        clearTimeout(timer.current); media.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        setState('analyzing');
        try {
          const wav = await toWav(new Blob(chunks, { type: capture.mimeType }));
          const form = new FormData(); form.append('audio', wav, 'speech.wav'); form.append('targets', targets.join(' '));
          const result = await localRequest<AudioReport>('/api/analyze-audio', { method: 'POST', body: form });
          if (mounted.current) { setReport(result); onComplete?.(); }
        } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Audio analysis failed.'); }
        finally { if (mounted.current) setState('idle'); }
      };
      capture.start(); startedAt.current = Date.now(); setState('recording');
      timer.current = setTimeout(() => { if (capture.state === 'recording') capture.stop(); }, 120000);
    } catch (e) {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) { setError(e instanceof Error ? e.message : 'Microphone permission denied.'); setState('idle'); }
    }
  };
  const remaining = state === 'recording' ? 120 - seconds : 120;
  return <section className="audio-practice" aria-label="Read aloud analysis">
    <div className="audio-heading">
      <div className={`record-orb ${state === 'recording' ? 'is-recording' : ''}`} aria-hidden="true"><Mic2 size={22} /></div>
      <div><h3>Put your voice into practice</h3><p>Audio stays on your device. Up to two minutes per recording.</p></div>
      <span className="record-clock" aria-label={`${remaining} seconds remaining`}>{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</span>
    </div>
    <div className="audio-actions">
      <button className={state === 'recording' ? 'primary-button recording-button' : 'secondary-button'} disabled={state === 'starting' || state === 'analyzing'} onClick={() => state === 'recording' ? recorder.current?.stop() : void start()}>
        {state === 'recording' ? <Square size={14} aria-hidden="true" /> : <Mic2 size={16} aria-hidden="true" />}
        {state === 'recording' ? 'Stop and analyze' : state === 'analyzing' ? 'Analyzing locally…' : state === 'starting' ? 'Opening microphone…' : report ? 'Record again' : 'Record speech'}
      </button>
      <span className="audio-hint" role="status">{state === 'recording' ? 'Recording · stops automatically at 02:00' : state === 'analyzing' ? 'Transcribing and checking your delivery. This may take a moment.' : state === 'starting' ? 'Allow microphone access when prompted.' : 'Read your sentences aloud or respond to the prompt.'}</span>
    </div>
    {error && <p className="notice" role="alert">{error}</p>}
    {report && <div className="audio-report" aria-live="polite">
      <h3><AudioLines size={18} aria-hidden="true" /> Your delivery</h3>
      <p><b>Transcript:</b> {report.transcript || 'No speech recognized.'}</p>
      <div className="audio-metrics"><p><b>Pace:</b> {report.wpm.toFixed(0)} WPM (practice target: 130–160)</p>
      <p><b>Pitch:</b> {report.pitch_std_hz === null ? 'Not enough voiced audio to assess.' : `${report.pitch_std_hz.toFixed(1)} Hz standard deviation — ${report.monotone_risk ? 'try more pitch variation' : 'pitch variation detected'}`}</p>
      <p><b>Possible fillers:</b> {report.fillers.length} (context may make these intentional words)</p></div>
      {report.fillers.length > 0 && <ul>{report.fillers.map((f, i) => <li key={i}>{f.phrase}: {f.start.toFixed(2)}–{f.end.toFixed(2)}s</li>)}</ul>}
      <p><b>Pronunciation attention items</b> — recognition cues, not a phoneme diagnosis.</p>
      {report.pronunciation.length === 0 && <p>No attention items flagged in this recording.</p>}
      <ul>{report.pronunciation.map((item, i) => <li key={i}><b>{item.target}</b> [{item.phonemes.join(' ')}]{item.start !== null ? ` at ${item.start.toFixed(2)}s` : ''}: {item.reason}</li>)}</ul>
    </div>}
  </section>;
}
