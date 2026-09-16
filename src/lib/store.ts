"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  EMPTY_KEYS,
  type AgentRun,
  type AppSettings,
  type Engagement,
  type Finding,
  type GroupMessage,
  type LabProbeResult,
  type ReconPack,
  type RunStatus,
  type RunSummary,
} from "./types";
import { DEFAULT_OPERATOR_BRIEF } from "./prompts";

const MAX_RUNS = 20;

interface UmbraState {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  settings: AppSettings;
  patchSettings: (p: Partial<AppSettings>) => void;
  setKey: (k: keyof AppSettings["keys"], v: string) => void;
  runs: Engagement[];
  upsertRun: (run: Engagement) => void;
  patchRun: (id: string, p: Partial<Engagement>) => void;
  patchAgent: (runId: string, agentId: string, p: Partial<AgentRun>) => void;
  appendAgentMessage: (runId: string, agentId: string, msg: AgentRun["messages"][number]) => void;
  appendGroup: (runId: string, msg: GroupMessage) => void;
  setRecon: (runId: string, recon: ReconPack, instrument: Finding[]) => void;
  setLabResults: (runId: string, results: LabProbeResult[]) => void;
  setSummary: (runId: string, summary: RunSummary) => void;
  setRunStatus: (runId: string, status: RunStatus, error?: string) => void;
  deleteRun: (id: string) => void;
  clearRuns: () => void;
}

export const useUmbra = create<UmbraState>()(
  persist(
    (set) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      settings: {
        keys: { ...EMPTY_KEYS },
        defaultProvider: "openrouter",
        defaultModel: "stealth/union-alpha",
        operatorBrief: DEFAULT_OPERATOR_BRIEF,
        agentCount: 4,
        find1: true,
        mixMode: "pack",
        packId: "or-free-v2",
        waveSize: 16,
      },
      patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setKey: (k, v) =>
        set((s) => ({
          settings: { ...s.settings, keys: { ...s.settings.keys, [k]: v } },
        })),
      runs: [],
      upsertRun: (run) =>
        set((s) => {
          const rest = s.runs.filter((r) => r.id !== run.id);
          return { runs: [run, ...rest].slice(0, MAX_RUNS) };
        }),
      patchRun: (id, p) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === id ? { ...r, ...p, updatedAt: Date.now() } : r)),
        })),
      patchAgent: (runId, agentId, p) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id !== runId
              ? r
              : {
                  ...r,
                  updatedAt: Date.now(),
                  agents: r.agents.map((a) => (a.id === agentId ? { ...a, ...p } : a)),
                },
          ),
        })),
      appendAgentMessage: (runId, agentId, msg) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id !== runId
              ? r
              : {
                  ...r,
                  updatedAt: Date.now(),
                  agents: r.agents.map((a) =>
                    a.id === agentId ? { ...a, messages: [...a.messages, msg] } : a,
                  ),
                },
          ),
        })),
      appendGroup: (runId, msg) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? { ...r, groupChat: [...r.groupChat, msg].slice(-200), updatedAt: Date.now() }
              : r,
          ),
        })),
      setRecon: (runId, recon, instrument) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? { ...r, recon, instrumentFindings: instrument, updatedAt: Date.now() }
              : r,
          ),
        })),
      setLabResults: (runId, results) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, labResults: results, updatedAt: Date.now() } : r,
          ),
        })),
      setSummary: (runId, summary) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, summary, updatedAt: Date.now() } : r,
          ),
        })),
      setRunStatus: (runId, status, error) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, status, error, updatedAt: Date.now() } : r,
          ),
        })),
      deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      clearRuns: () => set({ runs: [] }),
    }),
    {
      name: "umbra.v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ settings: s.settings, runs: s.runs }),
    },
  ),
);
