# Project Notes

## Agent / model policy

- **Do NOT use the Fable model for sub-agents or Workflow sub-agents in this project.** It burns quota too fast. Prefer Opus 4.8 (`claude-opus-4-8`) or a cheaper tier (Haiku) for large fan-out work.
- When launching `Agent` or `Workflow`, either inherit the current session model (keep the main model off Fable) or pass an explicit non-Fable `model` override on each agent call.
- Keep multi-agent fan-outs small unless the user explicitly opts into a large run, and prefer a lighter model for mechanical stages.

## About this repo

- Pre-implementation stage: currently only `docs/` (design spec, review prompts, review dispositions). No site code yet.
- Primary design spec: `docs/superpowers/specs/2026-07-05-homepage-design.md` — a personal academic homepage for Yongzhe Wang (Astro + React islands + TypeScript + MDX + Tailwind, static-first, GitHub Pages / Cloudflare Pages).
