import { useEffect, useRef, useState } from 'react';
import { toWav } from '../lib/recorder';
import { localRequest, type AudioReport } from '../lib/sidecar';

export function AudioPractice({ targets }: { targets: string[] }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'analyzing'>('idle');
  const [error, setError] = useState('');
  const [report, setReport] = useState<AudioReport | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; clearTimeout(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  const start = async () => {
    setState('starting'); setError(''); setReport(null);
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
          if (mounted.current) setReport(result);
        } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Audio analysis failed.'); }
        finally { if (mounted.current) setState('idle'); }
      };
      capture.start(); setState('recording');
      timer.current = setTimeout(() => { if (capture.state === 'recording') capture.stop(); }, 120000);
    } catch (e) {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) { setError(e instanceof Error ? e.message : 'Microphone permission denied.'); setState('idle'); }
    }
  };
  return <section className="feedback-card" aria-label="Read aloud analysis">
    <p>Read your sentences aloud, or practice a two-minute response. Recording stops automatically at two minutes.</p>
    <button className="record-button" disabled={state === 'starting' || state === 'analyzing'} onClick={() => state === 'recording' ? recorder.current?.stop() : void start()}>
      {state === 'recording' ? 'Stop and analyze' : state === 'analyzing' ? 'Analyzing locally…' : state === 'starting' ? 'Opening microphone…' : 'Record speech'}
    </button>
    <p role="status">{state === 'recording' ? 'Recording locally…' : ''}</p>
    {error && <p role="alert">{error}</p>}
    {report && <div aria-live="polite">
      <p><b>Transcript:</b> {report.transcript || 'No speech recognized.'}</p>
      <p><b>Pace:</b> {report.wpm.toFixed(0)} WPM (practice target: 130–160)</p>
      <p><b>Pitch:</b> {report.pitch_std_hz === null ? 'Not enough voiced audio to assess.' : `${report.pitch_std_hz.toFixed(1)} Hz standard deviation — ${report.monotone_risk ? 'try more pitch variation' : 'pitch variation detected'}`}</p>
      <p><b>Possible fillers:</b> {report.fillers.length} (context may make these intentional words)</p>
      <ul>{report.fillers.map((f, i) => <li key={i}>{f.phrase}: {f.start.toFixed(2)}–{f.end.toFixed(2)}s</li>)}</ul>
      <p><b>Pronunciation attention items</b> — recognition cues, not a phoneme diagnosis.</p>
      <ul>{report.pronunciation.map((item, i) => <li key={i}><b>{item.target}</b> [{item.phonemes.join(' ')}]{item.start !== null ? ` at ${item.start.toFixed(2)}s` : ''}: {item.reason}</li>)}</ul>
    </div>}
  </section>;
}
