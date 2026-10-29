export type OllamaStatus = 'checking' | 'available' | 'offline';

export async function checkOllama(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch('http://localhost:11434/api/tags', { signal });
  if (!response.ok) return false;
  const body = await response.json() as { models?: Array<{ name: string }> };
  return (body.models ?? []).some(model => model.name === 'llama3:8b');
}
