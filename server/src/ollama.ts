import type { ChatTurn } from "./types";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function toOllamaHistory(history: ChatTurn[]): OllamaMessage[] {
  return history.map((item) => ({ role: item.role, content: item.content }));
}

export async function askOllama(params: {
  systemPrompt: string;
  userPrompt: string;
  history?: ChatTurn[];
}): Promise<string> {
  const messages: OllamaMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...toOllamaHistory(params.history ?? []),
    { role: "user", content: params.userPrompt },
  ];

  let response: Response;
  try {
    response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages,
      }),
    });
  } catch (error) {
    throw new Error(
      "I couldn't reach Ollama right now. Please start Ollama and try again.",
      { cause: error },
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned an empty response.");
  }
  return content;
}
