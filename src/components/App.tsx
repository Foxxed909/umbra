"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Crosshair,
  FlaskConical,
  Settings,
  ChevronDown,
  Copy,
} from "lucide-react";
import { createLabEngagement, createReconEngagement, executeLabRun, executeReconRun } from "@/lib/engine";
import { MODEL_CATALOG, MODEL_PACKS, PROVIDER_META, modelsFor } from "@/lib/models";
import { useUmbra } from "@/lib/store";
import { allFindings } from "@/lib/summary";
import {
  DEPTHS,
  type DepthId,
  type Engagement,
  type Finding,
  type ProviderId,
} from "@/lib/types";
import { cn, formatAgo, hostOf } from "@/lib/utils";

type Tab = "scan" | "lab" | "archive" | "settings" | "run";

export default function App() {
  const hydrated = useUmbra((s) => s.hydrated);
  const setHydrated = useUmbra((s) => s.setHydrated);
  const settings = useUmbra((s) => s.settings);
  const patchSettings = useUmbra((s) => s.patchSettings);
  const setKey = useUmbra((s) => s.setKey);
  const runs = useUmbra((s) => s.runs);
  const upsertRun = useUmbra((s) => s.upsertRun);
  const deleteRun = useUmbra((s) => s.deleteRun);
  const clearRuns = useUmbra((s) => s.clearRuns);

  const [tab, setTab] = useState<Tab>("scan");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = runs.find((r) => r.id === activeId) ?? null;

  useEffect(() => {
    void useUmbra.persist.rehydrate().finally(() => setHydrated(true));
  }, [setHydrated]);

  const [target, setTarget] = useState("https://example.com");
  const [depth, setDepth] = useState<DepthId>("probe");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [labAuth, setLabAuth] = useState(false);

  const models = modelsFor(settings.defaultProvider);
  const depthMeta = DEPTHS.find((d) => d.id === depth) ?? DEPTHS[0];
  const hasKey = Boolean(settings.keys[settings.defaultProvider]?.trim());

  async function launchScan() {
    if (!authorized) return alert("Confirm authorization first.");
    let url = target.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setBusy(true);
    try {
      const run = createReconEngagement({
        target: url,
        depth,
        agentCount: settings.agentCount,
        find1: settings.find1,
        provider: settings.defaultProvider,
        mixMode: settings.mixMode,
        keys: settings.keys,
      });
      upsertRun(run);
      setActiveId(run.id);
      setTab("run");
      await executeReconRun(run, {
        onUpdate: (updated) => upsertRun(updated),
      });
    } catch (e) {
      console.error(e);
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function launchLab() {
    if (!labAuth) return alert("Confirm lab authorization first.");
    setBusy(true);
    try {
      const run = createLabEngagement({
        provider: settings.defaultProvider,
        keys: settings.keys,
        models: models.slice(0, Math.min(settings.agentCount, models.length)),
      });
      upsertRun(run);
      setActiveId(run.id);
      setTab("run");
      await executeLabRun(run, {
        onUpdate: (updated) => upsertRun(updated),
      });
    } catch (e) {
      console.error(e);
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading UMBRA…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-medium tracking-widest">UMBRA</span>
            <span className="text-xs text-muted-foreground">authorized recon · model lab</span>
          </div>
          <nav className="flex gap-1">
            {(["scan", "lab", "run", "archive", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider",
                  tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "scan" && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium">Recon scan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Target URL</span>
                <input
                  className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="https://example.com"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Depth</span>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value as DepthId)}
                >
                  {DEPTHS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-sm text-muted-foreground">{depthMeta?.description}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
              I confirm authorized testing of this target
            </label>
            <button
              type="button"
              disabled={busy || !hasKey}
              onClick={() => void launchScan()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <Crosshair className="size-4" />
              {busy ? "Running…" : "Launch scan"}
            </button>
            {!hasKey && <p className="text-sm text-warn">Add an API key in Settings first.</p>}
          </section>
        )}

        {tab === "lab" && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium">Model red-team lab</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={labAuth} onChange={(e) => setLabAuth(e.target.checked)} />
              Authorized model evaluation / JB lab
            </label>
            <button
              type="button"
              disabled={busy || !hasKey}
              onClick={() => void launchLab()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <FlaskConical className="size-4" />
              {busy ? "Running…" : "Run lab probes"}
            </button>
          </section>
        )}

        {tab === "settings" && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium">Settings & keys</h2>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Provider</span>
              <select
                className="w-full max-w-xs rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={settings.defaultProvider}
                onChange={(e) => patchSettings({ defaultProvider: e.target.value as ProviderId })}
              >
                {Object.keys(PROVIDER_META).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_META[p as ProviderId]?.label ?? p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">API key (localStorage only)</span>
              <input
                type="password"
                className="w-full max-w-md rounded-md border border-border bg-card px-3 py-2 font-mono text-sm"
                value={settings.keys[settings.defaultProvider] ?? ""}
                onChange={(e) => setKey(settings.defaultProvider, e.target.value)}
                placeholder="sk-or-... or provider key"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Agent count (1–128)</span>
              <input
                type="number"
                min={1}
                max={128}
                className="w-24 rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={settings.agentCount}
                onChange={(e) => patchSettings({ agentCount: Math.min(128, Math.max(1, Number(e.target.value) || 1)) })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.find1}
                onChange={(e) => patchSettings({ find1: e.target.checked })}
              />
              FIND1 — each agent must produce ≥1 evidence-backed finding
            </label>
          </section>
        )}

        {tab === "archive" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Archive</h2>
              <button type="button" className="text-xs text-muted-foreground" onClick={() => clearRuns()}>
                Clear all
              </button>
            </div>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <ul className="space-y-2">
                {runs.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setActiveId(r.id);
                        setTab("run");
                      }}
                    >
                      <span className="font-mono text-xs">{r.kind}</span> · {r.target || r.id.slice(0, 8)} ·{" "}
                      {formatAgo(r.createdAt)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "run" && active && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-medium">
                {active.kind} · {active.target || active.id.slice(0, 8)}
              </h2>
              <span className="font-mono text-xs text-muted-foreground">{active.status}</span>
            </div>
            {active.summary && (
              <div className="rounded-md border border-border bg-card p-4 text-sm">
                <p>Score: {active.summary.score} · Grade: {active.summary.grade}</p>
                <p className="mt-1 text-muted-foreground">
                  Findings: {active.summary.findingCount} · Strongest: {active.summary.strongest} · Weakest:{" "}
                  {active.summary.weakest}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Agents</h3>
              {active.agents.map((a) => (
                <div key={a.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span>{a.name || a.role}</span>
                    <span className="font-mono text-xs text-muted-foreground">{a.status}</span>
                  </div>
                  {a.findings?.length ? (
                    <p className="mt-1 text-xs text-live">{a.findings.length} finding(s)</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Findings</h3>
              {allFindings(active).map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </section>
        )}

        {tab === "run" && !active && (
          <p className="text-sm text-muted-foreground">No active run. Launch a scan or lab.</p>
        )}
      </main>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-md border border-border">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>{finding.severity}</span>
            <span>{finding.category}</span>
            {finding.reportable ? <span className="text-live">reportable</span> : null}
          </div>
          <h3 className="mt-1 text-sm font-medium">{finding.title}</h3>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-4 py-3 text-sm">
          {finding.evidence ? <Block label="Evidence" body={finding.evidence} mono /> : null}
          {finding.impact ? <Block label="Impact" body={finding.impact} /> : null}
          {finding.reproduction ? <Block label="Reproduction" body={finding.reproduction} /> : null}
          {finding.recommendation ? <Block label="Recommendation" body={finding.recommendation} /> : null}
          {finding.bypassNotes ? <Block label="Residual / control gap" body={finding.bypassNotes} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function Block({ label, body, mono }: { label: string; body: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <pre className={cn("mt-1 whitespace-pre-wrap", mono ? "font-mono text-xs" : "text-sm")}>{body}</pre>
    </div>
  );
}
