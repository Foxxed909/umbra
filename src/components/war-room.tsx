"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Copy } from "lucide-react";
import { allFindings } from "@/lib/summary";
import { DEPTHS, type Engagement, type Finding } from "@/lib/types";
import { cn, formatAgo, hostOf } from "@/lib/utils";

export function WarRoom({
  run,
  onOpenThread,
  onBack,
}: {
  run: Engagement;
  onOpenThread: (id: string) => void;
  onBack: () => void;
}) {
  const findings = useMemo(() => allFindings(run), [run]);
  const depth = DEPTHS.find((d) => d.id === run.depth);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <button type="button" onClick={onBack} className="text-xs uppercase tracking-widest text-muted-foreground">
            ← Back
          </button>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {run.kind === "lab" ? "Model lab" : "Black-box recon"}
          </p>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            {run.kind === "lab" ? run.target : hostOf(run.target)}
          </h1>
          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>{run.status}</span>
            {depth ? <span>· {depth.label}</span> : null}
            {run.find1 ? <span>· FIND1</span> : null}
            <span>· {formatAgo(run.createdAt)}</span>
          </div>
          {run.error ? <p className="text-sm text-crit">{run.error}</p> : null}
        </div>
        <CopyReport title={run.title} findings={findings} />
      </div>

      {run.summary ? (
        <section className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</p>
            <p className="mt-1 font-mono text-3xl tabular-nums">
              {run.summary.score}
              <span className="ml-2 text-lg text-muted-foreground">{run.summary.grade}</span>
            </p>
          </div>
          <div className="md:col-span-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Run summary</p>
            <p className="mt-1 text-sm leading-relaxed">{run.summary.notes}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-live">Strongest</p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {run.summary.strongest.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-crit">Weakest</p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {run.summary.weakest.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex justify-between">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Cell</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {run.agents.filter((a) => a.status === "done" || a.status === "skipped").length}/{run.agents.length}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {run.agents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpenThread(a.id)}
              className="rounded-xl border border-border bg-card p-4 text-left hover:bg-accent"
            >
              <div className="flex justify-between">
                <span className="font-mono text-[11px] tracking-widest text-muted-foreground">{a.codename}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{a.status}</span>
              </div>
              <p className="mt-2 font-medium">{a.role}</p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{a.model}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {a.findings.length} findings{a.thinking ? " · has thinking" : ""}
              </p>
            </button>
          ))}
        </div>
      </section>

      {run.groupChat.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Group space</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-4">
            {run.groupChat.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-mono text-[10px] tracking-widest text-live">{m.codename}</span>
                <p className="text-muted-foreground">{m.content}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {run.recon ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Recon pack</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Probes", run.recon.probes.length],
              ["Secrets", run.recon.secrets.length],
              ["Header gaps", run.recon.headerIssues.length],
              ["CAPTCHA signals", run.recon.captchaSignals.length],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
                <p className="mt-1 font-mono text-2xl tabular-nums">{v}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {run.labResults?.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Lab scores</h2>
          <div className="grid gap-3">
            {run.labResults.map((r) => (
              <article key={r.probeId} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{r.score}</span>
                  <span className="text-sm font-medium">{r.technique}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.rationale}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Findings · {findings.length}
        </h2>
        <FindingList findings={findings} />
      </section>
    </div>
  );
}

function FindingList({ findings }: { findings: Finding[] }) {
  if (!findings.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No findings yet.
      </div>
    );
  }
  const order: Record<Finding["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  return (
    <div className="grid gap-3">
      {[...findings]
        .sort((a, b) => order[a.severity] - order[b.severity])
        .map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(finding.severity === "critical" || finding.severity === "high");
  return (
    <article className="rounded-lg border border-border bg-card">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>{finding.severity}</span>
            <span>{finding.category}</span>
            <span>{finding.source}</span>
            {finding.reportable ? <span className="text-live">reportable</span> : null}
          </div>
          <h3 className="mt-2 text-sm font-medium">{finding.title}</h3>
          {finding.location ? <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{finding.location}</p> : null}
        </div>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
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

function CopyReport({ title, findings }: { title: string; findings: Finding[] }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm"
      onClick={async () => {
        const lines = [`# UMBRA report — ${title}`, "", `Generated ${new Date().toISOString()}`, ""];
        for (const f of findings) {
          lines.push(`## [${f.severity}] ${f.title}`, "", f.evidence, "", f.reproduction, "", f.recommendation, "");
        }
        await navigator.clipboard.writeText(lines.join("\n"));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      <Copy className="size-3.5" />
      {done ? "Copied" : "Copy report"}
    </button>
  );
}
