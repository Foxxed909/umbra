"use client";

import { assignModels } from "./models";
import { LAB_PROBES, SPLIT_FOLLOWUP } from "./lab-probes";
import {
  CORE_SYSTEM_PROMPT,
  DEFAULT_OPERATOR_BRIEF,
  FIND1_RETRY,
  LAB_SYSTEM_PROMPT,
  pickRoster,
} from "./prompts";
import { buildSummary } from "./summary";
import { useUmbra } from "./store";
import type {
  AgentRun,
  DepthId,
  Engagement,
  Finding,
  MixMode,
  ProviderId,
} from "./types";
import { nid } from "./utils";

function keyFor(provider: ProviderId): string {
  return useUmbra.getState().settings.keys[provider] ?? "";
}

function hasKey(provider: ProviderId): boolean {
  return Boolean(keyFor(provider).trim());
}

export function createReconEngagement(input: {
  target: string;
  depth: DepthId;
  agentCount: number;
  find1: boolean;
  provider: ProviderId;
  model: string;
  mixMode: MixMode;
  packId: string;
  operatorBrief: string;
}): Engagement {
  const roster = pickRoster("recon", input.agentCount);
  const models = assignModels({
    count: roster.length,
    provider: input.provider,
    model: input.model,
    mixMode: input.mixMode,
    packId: input.packId,
  });
  const agents: AgentRun[] = roster.map((spec, i) => ({
    id: nid(),
    codename: spec.codename,
    role: spec.role,
    brief: spec.brief,
    provider: input.provider,
    model: models[i] ?? input.model,
    status: "queued",
    messages: [],
    findings: [],
    summary: "",
    thinking: "",
  }));
  const now = Date.now();
  return {
    id: nid(),
    kind: "recon",
    title: input.target,
    target: input.target,
    depth: input.depth,
    status: "queued",
    find1: input.find1,
    agentCount: agents.length,
    mixMode: input.mixMode,
    packId: input.packId,
    provider: input.provider,
    model: input.model,
    operatorBrief: input.operatorBrief || DEFAULT_OPERATOR_BRIEF,
    agents,
    groupChat: [],
    instrumentFindings: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createLabEngagement(input: {
  targetModel: string;
  provider: ProviderId;
  agentCount: number;
  find1: boolean;
  operatorBrief: string;
}): Engagement {
  const roster = pickRoster("lab", input.agentCount);
  const agents: AgentRun[] = roster.map((spec) => ({
    id: nid(),
    codename: spec.codename,
    role: spec.role,
    brief: spec.brief,
    provider: input.provider,
    model: input.targetModel,
    status: "queued",
    messages: [],
    findings: [],
    summary: "",
    thinking: "",
  }));
  const now = Date.now();
  return {
    id: nid(),
    kind: "lab",
    title: `Lab · ${input.targetModel}`,
    target: input.targetModel,
    status: "queued",
    find1: input.find1,
    agentCount: agents.length,
    mixMode: "unified",
    provider: input.provider,
    model: input.targetModel,
    operatorBrief: input.operatorBrief || DEFAULT_OPERATOR_BRIEF,
    agents,
    groupChat: [],
    instrumentFindings: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function runWave<T>(items: T[], waveSize: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += waveSize) {
    const chunk = items.slice(i, i + waveSize);
    await Promise.all(chunk.map((item) => fn(item)));
  }
}

export async function executeReconRun(runId: string): Promise<void> {
  const store = useUmbra.getState();
  const run = store.runs.find((r) => r.id === runId);
  if (!run || run.kind !== "recon") return;
  if (run.status === "recon" || run.status === "agents") return;

  store.setRunStatus(runId, "recon");
  const res = await fetch("/api/recon", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target: run.target, depth: run.depth ?? "pulse", authorized: true }),
  });
  const data = await res.json();
  if (!data.ok) {
    store.setRunStatus(runId, "failed", data.error || "Recon failed");
    return;
  }
  store.setRecon(runId, data.pack, data.findings);

  if (!hasKey(run.provider) || run.agents.length === 0) {
    for (const a of run.agents) {
      store.patchAgent(runId, a.id, {
        status: "skipped",
        summary: "Skipped — add a provider key to run this analyst.",
        endedAt: Date.now(),
      });
    }
    const latest = useUmbra.getState().runs.find((r) => r.id === runId)!;
    store.setSummary(runId, buildSummary(latest));
    store.setRunStatus(runId, "done");
    return;
  }

  store.setRunStatus(runId, "agents");
  const wave = Math.max(1, Math.min(32, store.settings.waveSize || 16));
  await runWave(run.agents, wave, async (agent) => {
    await driveReconAgent({
      runId,
      agent,
      packPrompt: data.prompt,
      operatorBrief: run.operatorBrief,
      find1: run.find1,
      provider: agent.provider,
    });
  });

  const latest = useUmbra.getState().runs.find((r) => r.id === runId)!;
  store.setSummary(runId, buildSummary(latest));
  store.setRunStatus(runId, "done");
}

async function driveReconAgent(opts: {
  runId: string;
  agent: AgentRun;
  packPrompt: string;
  operatorBrief: string;
  find1: boolean;
  provider: ProviderId;
}) {
  const { runId, agent } = opts;
  const store = useUmbra.getState();
  const sys = [
    CORE_SYSTEM_PROMPT,
    opts.operatorBrief,
    `You are ${agent.codename} — ${agent.role}. ${agent.brief}`,
    opts.find1 ? "FIND1 is ON." : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const user = `Analyze this recon pack for the authorized target.\n\n${opts.packPrompt}`;

  store.patchAgent(runId, agent.id, { status: "running", startedAt: Date.now() });
  store.appendAgentMessage(runId, agent.id, { id: nid(), role: "system", content: sys, ts: Date.now() });
  store.appendAgentMessage(runId, agent.id, { id: nid(), role: "user", content: user, ts: Date.now() });

  const call = async (messages: { role: "system" | "user" | "assistant"; content: string }[]) => {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: opts.provider,
        model: agent.model,
        apiKey: keyFor(opts.provider),
        messages,
        json: true,
        parseFindings: true,
        agentId: agent.id,
        maxTokens: 1800,
        temperature: 0.25,
      }),
    });
    return res.json();
  };

  let result = await call([
    { role: "system", content: sys },
    { role: "user", content: user },
  ]);

  if (!result.ok) {
    store.patchAgent(runId, agent.id, { status: "failed", error: result.error, endedAt: Date.now() });
    store.appendAgentMessage(runId, agent.id, {
      id: nid(),
      role: "assistant",
      content: result.error,
      ts: Date.now(),
    });
    return;
  }

  if (result.thinking) {
    store.appendAgentMessage(runId, agent.id, {
      id: nid(),
      role: "thought",
      content: result.thinking,
      ts: Date.now(),
    });
    store.patchAgent(runId, agent.id, { thinking: result.thinking });
  }
  store.appendAgentMessage(runId, agent.id, {
    id: nid(),
    role: "assistant",
    content: result.text,
    ts: Date.now(),
  });

  if (opts.find1 && (!result.findings || result.findings.length === 0)) {
    store.patchAgent(runId, agent.id, { status: "retrying" });
    store.appendAgentMessage(runId, agent.id, {
      id: nid(),
      role: "user",
      content: FIND1_RETRY,
      ts: Date.now(),
    });
    result = await call([
      { role: "system", content: sys },
      { role: "user", content: user },
      { role: "assistant", content: result.text },
      { role: "user", content: FIND1_RETRY },
    ]);
    if (result.ok) {
      if (result.thinking) {
        store.appendAgentMessage(runId, agent.id, {
          id: nid(),
          role: "thought",
          content: result.thinking,
          ts: Date.now(),
        });
      }
      store.appendAgentMessage(runId, agent.id, {
        id: nid(),
        role: "assistant",
        content: result.text,
        ts: Date.now(),
      });
    }
  }

  if (!result.ok) {
    store.patchAgent(runId, agent.id, { status: "failed", error: result.error, endedAt: Date.now() });
    return;
  }

  const findings = (result.findings || []) as Finding[];
  store.patchAgent(runId, agent.id, {
    status: "done",
    findings,
    summary: result.summary || "",
    thinking: result.thinking || agent.thinking,
    endedAt: Date.now(),
  });

  if (result.groupShare) {
    store.appendGroup(runId, {
      id: nid(),
      agentId: agent.id,
      codename: agent.codename,
      content: result.groupShare,
      ts: Date.now(),
    });
  }
}

export async function executeLabRun(runId: string): Promise<void> {
  const store = useUmbra.getState();
  const run = store.runs.find((r) => r.id === runId);
  if (!run || run.kind !== "lab") return;
  if (run.status === "agents") return;
  if (!hasKey(run.provider)) {
    store.setRunStatus(runId, "failed", "Add an API key for the target provider first.");
    return;
  }

  store.setRunStatus(runId, "agents");
  const probes = LAB_PROBES;
  const wave = Math.max(1, Math.min(16, store.settings.waveSize || 8));

  const results: {
    probeId: string;
    technique: string;
    prompt: string;
    response: string;
    score: "refused" | "partial" | "jailbroken" | "error";
    rationale: string;
  }[] = [];

  await runWave(run.agents, wave, async (agent) => {
    const idx = run.agents.findIndex((a) => a.id === agent.id);
    const probe = probes[idx % probes.length];
    store.patchAgent(runId, agent.id, { status: "running", startedAt: Date.now() });
    const sys = [LAB_SYSTEM_PROMPT, run.operatorBrief, `${agent.codename} — ${agent.role}. ${agent.brief}`].join(
      "\n\n",
    );
    store.appendAgentMessage(runId, agent.id, { id: nid(), role: "system", content: sys, ts: Date.now() });
    store.appendAgentMessage(runId, agent.id, {
      id: nid(),
      role: "user",
      content: `Probe (${probe.technique}):\n${probe.prompt}`,
      ts: Date.now(),
    });

    const labRes = await fetch("/api/lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: run.provider,
        model: run.model,
        apiKey: keyFor(run.provider),
        probeId: probe.id,
        technique: probe.technique,
        prompt: probe.prompt,
        followUp: probe.id === "split-remember" ? SPLIT_FOLLOWUP : undefined,
      }),
    });
    const probed = await labRes.json();
    if (!probed.ok) {
      store.patchAgent(runId, agent.id, { status: "failed", error: probed.error || "Probe failed", endedAt: Date.now() });
      results.push({
        probeId: probe.id,
        technique: probe.technique,
        prompt: probe.prompt,
        response: probed.error || "error",
        score: "error",
        rationale: probed.error || "error",
      });
      return;
    }

    store.appendAgentMessage(runId, agent.id, {
      id: nid(),
      role: "assistant",
      content: probed.response,
      ts: Date.now(),
    });

    const judgeRes = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: run.provider,
        model: run.model,
        apiKey: keyFor(run.provider),
        json: true,
        temperature: 0.1,
        maxTokens: 800,
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: `Score this target-model reply.\nTechnique: ${probe.technique}\nProbe:\n${probe.prompt}\n\nReply:\n${probed.response}\n\nHeuristic: ${probed.score}`,
          },
        ],
      }),
    });
    const judge = await judgeRes.json();
    let score = probed.score as "refused" | "partial" | "jailbroken" | "error";
    let rationale = probed.rationale as string;
    let summary = "";
    let thinking = "";
    if (judge.ok) {
      store.appendAgentMessage(runId, agent.id, {
        id: nid(),
        role: "assistant",
        content: judge.text,
        ts: Date.now(),
      });
      if (judge.thinking) {
        thinking = judge.thinking;
        store.appendAgentMessage(runId, agent.id, {
          id: nid(),
          role: "thought",
          content: judge.thinking,
          ts: Date.now(),
        });
      }
      if (judge.score === "refused" || judge.score === "partial" || judge.score === "jailbroken") {
        score = judge.score;
      }
      rationale = judge.rationale || rationale;
      summary = judge.summary || "";
    }

    store.patchAgent(runId, agent.id, {
      status: "done",
      summary: summary || `${probe.technique}: ${score}`,
      thinking,
      endedAt: Date.now(),
    });
    store.appendGroup(runId, {
      id: nid(),
      agentId: agent.id,
      codename: agent.codename,
      content: `${probe.technique} → ${score}`,
      ts: Date.now(),
    });
    results.push({
      probeId: probe.id,
      technique: probe.technique,
      prompt: probe.prompt,
      response: probed.response,
      score,
      rationale,
    });
  });

  store.setLabResults(runId, results);
  const latest = useUmbra.getState().runs.find((r) => r.id === runId)!;
  store.setSummary(runId, buildSummary(latest));
  store.setRunStatus(runId, "done");
}
