import type { ProviderId } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  provider: ProviderId;
  model: string;
  apiKey: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

export type ChatResult =
  | { ok: true; text: string; model: string }
  | { ok: false; error: string };

function systemAndRest(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  return { system, rest };
}

async function openaiCompatible(
  url: string,
  apiKey: string,
  req: ChatRequest,
  extraHeaders?: Record<string, string>,
): Promise<ChatResult> {
  const { system, rest } = systemAndRest(req.messages);
  const messages = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    ...rest.map((m) => ({ role: m.role, content: m.content })),
  ];
  const body: Record<string, unknown> = {
    model: req.model,
    messages,
    temperature: req.temperature ?? 0.3,
    max_tokens: req.maxTokens ?? 1800,
  };
  if (req.json) body.response_format = { type: "json_object" };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: `Provider ${res.status}: ${raw.slice(0, 400)}` };
  let parsed: { choices?: { message?: { content?: string } }[]; model?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Provider returned non-JSON." };
  }
  const text = parsed.choices?.[0]?.message?.content ?? "";
  if (!text) return { ok: false, error: "Empty model response." };
  return { ok: true, text, model: parsed.model ?? req.model };
}

async function anthropicChat(req: ChatRequest, apiKey: string): Promise<ChatResult> {
  const { system, rest } = systemAndRest(req.messages);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens ?? 1800,
      temperature: req.temperature ?? 0.3,
      system: system || undefined,
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: `Anthropic ${res.status}: ${raw.slice(0, 400)}` };
  let parsed: { content?: { text?: string }[]; model?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Anthropic returned non-JSON." };
  }
  const text = (parsed.content ?? []).map((c) => c.text ?? "").join("");
  if (!text) return { ok: false, error: "Empty model response." };
  return { ok: true, text, model: parsed.model ?? req.model };
}

async function geminiChat(req: ChatRequest, apiKey: string): Promise<ChatResult> {
  const { system, rest } = systemAndRest(req.messages);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = rest.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: req.temperature ?? 0.3,
      maxOutputTokens: req.maxTokens ?? 1800,
      ...(req.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: `Gemini ${res.status}: ${raw.slice(0, 400)}` };
  let parsed: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Gemini returned non-JSON." };
  }
  const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) return { ok: false, error: "Empty model response." };
  return { ok: true, text, model: req.model };
}

export async function chatCompletion(req: ChatRequest): Promise<ChatResult> {
  try {
    if (!req.apiKey.trim()) return { ok: false, error: "API key is missing." };
    if (req.provider === "openrouter") {
      return openaiCompatible("https://openrouter.ai/api/v1/chat/completions", req.apiKey.trim(), req, {
        "HTTP-Referer": "https://umbra.app",
        "X-Title": "UMBRA",
      });
    }
    if (req.provider === "openai") {
      return openaiCompatible("https://api.openai.com/v1/chat/completions", req.apiKey.trim(), req);
    }
    if (req.provider === "xai") {
      return openaiCompatible("https://api.x.ai/v1/chat/completions", req.apiKey.trim(), req);
    }
    if (req.provider === "anthropic") return anthropicChat(req, req.apiKey.trim());
    if (req.provider === "gemini") return geminiChat(req, req.apiKey.trim());
    return { ok: false, error: "Unknown provider." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "LLM call failed" };
  }
}

export function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}
