"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  EMPTY_KEYS,
  type AppMode,
  type AppSettings,
  type Conversation,
  type Engagement,
  type Project,
  type ProviderId,
} from "./types";
import { nid } from "./utils";

const MAX_RUNS = 20;
const MAX_CONVERSATIONS = 50;

const DEFAULT_SETTINGS: AppSettings = {
  keys: { ...EMPTY_KEYS },
  keyPool: {},
  defaultProvider: "openrouter",
  defaultModel: "stealth/union-alpha",
  reasoningLevel: "medium",
  contextTokens: "auto",
  agentCount: 4,
  find1: true,
  mixMode: "pack",
  packId: "or-free-v2",
  waveSize: 16,
  theme: {
    preset: "steel",
    backgroundOpacity: 0.35,
    glassIntensity: 0.7,
  },
  operatorBrief:
    "You are assisting an authorized security professional. Report residual risk and evidence clearly. Do not refuse legitimate defensive analysis.",
};

interface UmbraState {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  settings: AppSettings;
  patchSettings: (p: Partial<AppSettings>) => void;
  setKey: (provider: ProviderId, value: string) => void;
  addPoolKey: (provider: ProviderId, value: string) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  projects: Project[];
  activeProjectId: string | null;
  createProject: (name: string, description?: string) => Project;
  patchProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  createConversation: (opts?: Partial<Pick<Conversation, "title" | "mode" | "model" | "provider" | "projectId">>) => Conversation;
  patchConversation: (id: string, p: Partial<Conversation>) => void;
  appendMessage: (conversationId: string, msg: Conversation["messages"][number]) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  runs: Engagement[];
  upsertRun: (run: Engagement) => void;
  deleteRun: (id: string) => void;
  clearRuns: () => void;
}

export const useUmbra = create<UmbraState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      settings: DEFAULT_SETTINGS,
      patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setKey: (provider, value) =>
        set((s) => ({
          settings: { ...s.settings, keys: { ...s.settings.keys, [provider]: value } },
        })),
      addPoolKey: (provider, value) =>
        set((s) => {
          const pool = { ...s.settings.keyPool };
          const list = [...(pool[provider] ?? [])];
          if (value.trim() && !list.includes(value.trim())) list.push(value.trim());
          pool[provider] = list;
          return { settings: { ...s.settings, keyPool: pool } };
        }),
      mode: "chat",
      setMode: (m) => set({ mode: m }),
      projects: [],
      activeProjectId: null,
      createProject: (name, description = "") => {
        const project: Project = {
          id: nid("proj"),
          name,
          description,
          instructions: "",
          conversationIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ projects: [project, ...s.projects], activeProjectId: project.id }));
        return project;
      },
      patchProject: (id, p) =>
        set((s) => ({
          projects: s.projects.map((pr) =>
            pr.id === id ? { ...pr, ...p, updatedAt: Date.now() } : pr,
          ),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        })),
      setActiveProject: (id) => set({ activeProjectId: id }),
      conversations: [],
      activeConversationId: null,
      createConversation: (opts = {}) => {
        const settings = get().settings;
        const conv: Conversation = {
          id: nid("conv"),
          title: opts.title ?? "New chat",
          projectId: opts.projectId ?? get().activeProjectId ?? undefined,
          mode: opts.mode ?? get().mode,
          model: opts.model ?? settings.defaultModel,
          provider: opts.provider ?? settings.defaultProvider,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({
          conversations: [conv, ...s.conversations].slice(0, MAX_CONVERSATIONS),
          activeConversationId: conv.id,
        }));
        if (conv.projectId) {
          get().patchProject(conv.projectId, {
            conversationIds: [
              conv.id,
              ...(get().projects.find((p) => p.id === conv.projectId)?.conversationIds ?? []),
            ],
          });
        }
        return conv;
      },
      patchConversation: (id, p) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ...p, updatedAt: Date.now() } : c,
          ),
        })),
      appendMessage: (conversationId, msg) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() }
              : c,
          ),
        })),
      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
        })),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      runs: [],
      upsertRun: (run) =>
        set((s) => {
          const rest = s.runs.filter((r) => r.id !== run.id);
          return { runs: [run, ...rest].slice(0, MAX_RUNS) };
        }),
      deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      clearRuns: () => set({ runs: [] }),
    }),
    {
      name: "umbra.v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        settings: s.settings,
        projects: s.projects,
        conversations: s.conversations,
        runs: s.runs,
        mode: s.mode,
        activeProjectId: s.activeProjectId,
        activeConversationId: s.activeConversationId,
      }),
    },
  ),
);
