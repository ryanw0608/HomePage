# Claude Code Notes

Read `AGENTS.md` first. It is the canonical contributor and agent guide for this repository.

## Claude-Specific Agent Policy

- Do not use Fable for sub-agents or Workflow sub-agents in this project.
- Prefer Opus 4.8 (`claude-opus-4-8`) or a cheaper tier such as Haiku for large mechanical review tasks.
- When launching `Agent` or `Workflow`, inherit a non-Fable current session model or pass an explicit non-Fable model override.
- Keep multi-agent fan-outs small unless the user explicitly approves a large run.
