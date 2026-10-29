export type OllamaStatus = 'checking' | 'available' | 'offline';
export const DEFAULT_OLLAMA_MODEL = 'kimi-k2.6:cloud';

export async function checkOllama(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch('http://localhost:11434/api/tags', { signal: signal ?? AbortSignal.timeout(8000) });
  if (!response.ok) return false;
  const body = await response.json() as { models?: Array<{ name: string }> };
  return (body.models ?? []).some(model => model.name === DEFAULT_OLLAMA_MODEL);
}
