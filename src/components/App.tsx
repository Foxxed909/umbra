"use client";

import { useEffect, useMemo, useState } from "react";
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
  type MixMode,
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

  // Full implementation continues in subsequent update - this is the shell to allow build
  // See source zip or full push. For Vercel import, this will be replaced with complete file.
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-2xl font-semibold tracking-tight">UMBRA</h1>
      <p className="mt-2 text-muted-foreground">Loading full console... Import complete source or wait for full App.tsx push.</p>
      <p className="mt-4 font-mono text-xs">Repo: Foxxed909/umbra — use Vercel Import Git Repository</p>
    </div>
  );
}
