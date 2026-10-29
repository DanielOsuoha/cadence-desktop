export const SIDECAR = 'http://127.0.0.1:8765';
export type Word = { word: string; definition: string; part_of_speech: string; general_american_phonemes: string[]; sample_context: string };
export type SyntaxResult = { valid: boolean; message: string };
export type Evaluation = {
  syntax: { compound: SyntaxResult; complex: SyntaxResult };
  spelling_flags: { original: string; replacement: string }[];
  error: string | null;
  feedback: null | { glow: string; grow: string; american_polish: string; vocabulary_score: number; word_of_day_used_correctly: boolean };
};
export type AudioReport = {
  transcript: string; wpm: number; pitch_std_hz: number | null; monotone_risk: boolean | null;
  fillers: { phrase: string; start: number; end: number }[];
  pronunciation: { target: string; phonemes: string[]; reason: string; start: number | null }[];
};
export async function localRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(SIDECAR + path, { signal: AbortSignal.timeout(180_000), ...init }); }
  catch { throw new Error('Local analysis unavailable. Start the Python sidecar on 127.0.0.1:8765 (see README), then retry.'); }
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Local analysis rejected the request.');
  return body;
}
export function evaluate(compound: string, complex: string, word: string) {
  return localRequest<Evaluation>('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compound, complex, word }) });
}
