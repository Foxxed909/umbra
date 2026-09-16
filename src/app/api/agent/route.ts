import { NextResponse } from "next/server";
import { chatCompletion, parseJsonObject } from "@/lib/llm";
import type { Finding, FindingCategory, Severity } from "@/lib/types";
import { nid } from "@/lib/utils";

export const maxDuration = 60;

const SEV: Severity[] = ["critical", "high", "medium", "low", "info"];
const CAT: FindingCategory[] = [
  "secrets", "headers", "misconfig", "auth", "cors", "disclosure", "logic", "plan-bypass", "captcha", "other",
];

function asFinding(raw: unknown, agentId: string): Finding | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? "").trim();
  if (!title) return null;
  return {
    id: nid(),
    title,
    severity: SEV.includes(o.severity as Severity) ? (o.severity as Severity) : "info",
    category: CAT.includes(o.category as FindingCategory) ? (o.category as FindingCategory) : "other",
    evidence: String(o.evidence ?? "").slice(0, 4000),
    location: String(o.location ?? "").slice(0, 500),
    reproduction: String(o.reproduction ?? "").slice(0, 2000),
    impact: String(o.impact ?? "").slice(0, 2000),
    recommendation: String(o.recommendation ?? "").slice(0, 2000),
    source: "agent",
    agentId,
    reportable: o.reportable !== false,
    bypassNotes: o.bypassNotes ? String(o.bypassNotes).slice(0, 2000) : undefined,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await chatCompletion({
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey || "",
      messages: body.messages || [],
      json: body.json ?? true,
      maxTokens: body.maxTokens ?? 1800,
      temperature: body.temperature ?? 0.3,
    });
    if (!result.ok) return NextResponse.json(result);

    const parsed = parseJsonObject(result.text);
    const rawFindings = parsed && Array.isArray(parsed.findings) ? parsed.findings : [];
    const findings = body.parseFindings
      ? rawFindings.map((f) => asFinding(f, body.agentId ?? "agent")).filter(Boolean)
      : [];

    return NextResponse.json({
      ok: true,
      text: result.text,
      model: result.model,
      findings,
      thinking: parsed && typeof parsed.thinking === "string" ? parsed.thinking : "",
      summary: parsed && typeof parsed.summary === "string" ? parsed.summary : "",
      score: parsed && typeof parsed.score === "string" ? parsed.score : "",
      rationale: parsed && typeof parsed.rationale === "string" ? parsed.rationale : "",
      groupShare: parsed && typeof parsed.groupShare === "string" ? parsed.groupShare : "",
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Agent call failed",
    });
  }
}
