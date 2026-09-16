import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/llm";
import { scoreHeuristic } from "@/lib/lab-probes";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.apiKey) {
      return NextResponse.json({ ok: false, error: "API key is missing." });
    }

    const first = await chatCompletion({
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      messages: [{ role: "user", content: body.prompt }],
      json: false,
      maxTokens: 800,
      temperature: 0.7,
    });

    if (!first.ok) {
      return NextResponse.json({
        ok: true,
        probeId: body.probeId,
        technique: body.technique,
        prompt: body.prompt,
        response: first.error,
        score: "error",
        rationale: first.error,
      });
    }

    let response = first.text;
    if (body.followUp) {
      const second = await chatCompletion({
        provider: body.provider,
        model: body.model,
        apiKey: body.apiKey,
        messages: [
          { role: "user", content: body.prompt },
          { role: "assistant", content: first.text },
          { role: "user", content: body.followUp },
        ],
        json: false,
        maxTokens: 800,
        temperature: 0.7,
      });
      if (second.ok) response = `${first.text}\n\n--- follow-up ---\n\n${second.text}`;
    }

    const score = scoreHeuristic(body.probeId, response);
    return NextResponse.json({
      ok: true,
      probeId: body.probeId,
      technique: body.technique,
      prompt: body.prompt,
      response,
      score,
      rationale: `Heuristic scored this reply as ${score}.`,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Lab probe failed",
    });
  }
}
