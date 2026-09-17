# UMBRA

Glassy steel AI workspace — chat, projects, agents, and authorized **Labs**.

## MVP (this build)

- Multi-provider keys (OpenRouter, OpenAI, Anthropic, Gemini, xAI + more slots)
- ChatGPT-style interface with reasoning levels
- Model-aware context sizes
- Projects (workspace + instructions)
- Custom background (local image upload + steel/obsidian/aurora presets)
- Modes: Chat · Code · Solo agent · Group agent · **Labs** (recon/JB shell next)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Settings** → paste OpenRouter (or other) key.

Keys stay in **browser localStorage** only.

## Deploy

```bash
npx vercel
```

Or import this repo in the Vercel dashboard (Framework: Next.js).

## Roadmap

1. Labs full multi-agent recon + JB (FIND1, depth tiers, group space)
2. Group agent composition (N× same model or custom mix)
3. Connectors: GitHub → Vercel → Gmail
4. Scheduled tasks
5. Code mode tool loops
