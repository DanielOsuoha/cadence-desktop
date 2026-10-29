export type OllamaStatus = "checking" | "available" | "offline";

type OllamaTagsResponse = {
  models?: Array<{ name: string }>;
};

type OllamaGenerateResponse = {
  response?: string;
};

const OLLAMA_URL = "http://localhost:11434";

export async function checkOllama(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal });
  return response.ok;
}

export async function generateLocalFeedback(prompt: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3:8b",
      prompt,
      stream: false,
      format: "json",
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}`);
  }

  const body = (await response.json()) as OllamaGenerateResponse;
  if (!body.response) {
    throw new Error("Ollama returned an empty response");
  }
  return body.response;
}

export function getModelNames(body: OllamaTagsResponse): string[] {
  return (body.models ?? []).map((model) => model.name);
}
