# UMBRA

Authorized black-box recon and model red-team console.

## Features

- **1–128 agents** in parallel waves (configurable wave size)
- **OpenRouter free pack**: Ling 3.0 Flash VL, Nemotron 3.5 Lightning, GLM 5.2, Nemotron 3 Ultra, Nex N2.5 Pro/Mini, Kimi/Qwen
- **Group space** — agents post short shares while they work
- **Reportable findings** — reproduction, impact, recommendation, residual-risk notes (plan gates, CAPTCHA residual risk)
- **Live thread** — system, user, assistant, and thinking/reasoning messages
- **Model lab (JB)** — leetspeak, code wrapper, roleplay, encoding, hierarchy, canary, confuse stack, schema trap
- **Run summary** — score, grade, strongest, weakest

## Quick start (tablet / Vercel)

1. Open https://github.com/Foxxed909/umbra
2. In Vercel dashboard → Add New → Project → Import Git Repository → select **Foxxed909/umbra**
3. Framework preset: **Next.js** (auto)
4. Deploy
5. Open the deployment URL → go to **Keys** and paste your OpenRouter (or OpenAI/Anthropic/Gemini/xAI) key (stored in browser localStorage only)

## Local

```bash
npm install
npm run dev
```

## Notes

- Authorization checkbox required before scan/lab
- FIND1 enforced: every agent must produce ≥1 evidence-backed finding
- SSRF-hardened recon (private IP blocklist + DNS check)
- No weaponized exploit generation; residual-risk notes only
