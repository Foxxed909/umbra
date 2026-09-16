import type { MixMode, ProviderId } from "./types";

export interface ModelEntry {
  id: string;
  label: string;
  provider: ProviderId;
  free?: boolean;
  note?: string;
}

export const MODEL_CATALOG: ModelEntry[] = [
  { id: "stealth/union-alpha", label: "stealth/union-alpha", provider: "openrouter", note: "Default stealth" },
  { id: "openrouter/auto", label: "openrouter/auto", provider: "openrouter" },
  { id: "inclusionai/ling-3.0-flash-vl:free", label: "Ling 3.0 Flash VL (free)", provider: "openrouter", free: true },
  { id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning (free)", provider: "openrouter", free: true },
  { id: "z-ai/glm-5.2:free", label: "GLM 5.2 (free)", provider: "openrouter", free: true },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra 550B (free)", provider: "openrouter", free: true },
  { id: "nex-agi/nex-n2.5-pro:free", label: "Nex N2.5 Pro (free)", provider: "openrouter", free: true },
  { id: "nex-agi/nex-n2.5-mini:free", label: "Nex N2.5 Mini (free)", provider: "openrouter", free: true },
  { id: "moonshotai/kimi-k2:free", label: "Kimi K2 (free)", provider: "openrouter", free: true },
  { id: "qwen/qwen3-235b-a22b:free", label: "Qwen3 235B (free)", provider: "openrouter", free: true },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)", provider: "openrouter", free: true },
  { id: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (free)", provider: "openrouter", free: true },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1 (free)", provider: "openrouter", free: true },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "openrouter" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini (OR)", provider: "openrouter" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (OR)", provider: "openrouter" },
  { id: "x-ai/grok-4.5", label: "Grok 4.5 (OR)", provider: "openrouter" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", provider: "openai" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", provider: "anthropic" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini" },
  { id: "grok-4.5", label: "Grok 4.5", provider: "xai" },
  { id: "grok-3-mini", label: "Grok 3 mini", provider: "xai" },
];

export interface ModelPack {
  id: string;
  label: string;
  provider: ProviderId;
  models: string[];
  blurb: string;
}

export const MODEL_PACKS: ModelPack[] = [
  {
    id: "or-free-v2",
    label: "OpenRouter free (current)",
    provider: "openrouter",
    models: [
      "inclusionai/ling-3.0-flash-vl:free",
      "nvidia/nemotron-3.5-lightning:free",
      "z-ai/glm-5.2:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nex-agi/nex-n2.5-pro:free",
      "nex-agi/nex-n2.5-mini:free",
      "moonshotai/kimi-k2:free",
      "qwen/qwen3-235b-a22b:free",
    ],
    blurb: "Rotate the free routes you listed across the cell.",
  },
  {
    id: "or-stealth",
    label: "Stealth + free mix",
    provider: "openrouter",
    models: [
      "stealth/union-alpha",
      "inclusionai/ling-3.0-flash-vl:free",
      "nvidia/nemotron-3.5-lightning:free",
      "z-ai/glm-5.2:free",
      "nex-agi/nex-n2.5-pro:free",
    ],
    blurb: "Lead with stealth, fill with free specialists.",
  },
  {
    id: "or-flagship",
    label: "Flagship via OpenRouter",
    provider: "openrouter",
    models: [
      "anthropic/claude-sonnet-4",
      "openai/gpt-4o-mini",
      "google/gemini-2.5-flash",
      "x-ai/grok-4.5",
    ],
    blurb: "Paid routes. Uses your OpenRouter key.",
  },
];

export const PROVIDER_META: Record<ProviderId, { label: string; keyUrl: string; baseHint: string }> = {
  openrouter: { label: "OpenRouter", keyUrl: "https://openrouter.ai/keys", baseHint: "sk-or-…" },
  openai: { label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", baseHint: "sk-…" },
  anthropic: { label: "Anthropic", keyUrl: "https://console.anthropic.com/settings/keys", baseHint: "sk-ant-…" },
  gemini: { label: "Google Gemini", keyUrl: "https://aistudio.google.com/apikey", baseHint: "AIza…" },
  xai: { label: "xAI", keyUrl: "https://console.x.ai", baseHint: "xai-…" },
};

export function modelsFor(provider: ProviderId): ModelEntry[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

export function assignModels(opts: {
  count: number;
  provider: ProviderId;
  model: string;
  mixMode: MixMode;
  packId?: string;
}): string[] {
  if (opts.mixMode === "pack") {
    const pack = MODEL_PACKS.find((p) => p.id === opts.packId) ?? MODEL_PACKS[0];
    const list = pack.models;
    return Array.from({ length: opts.count }, (_, i) => list[i % list.length]);
  }
  return Array.from({ length: opts.count }, () => opts.model);
}
