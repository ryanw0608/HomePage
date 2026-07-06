# Owner Setup Guide

## ✅ As-built record (completed 2026-07-06)

Everything below this box is the original how-to, kept for reference. The live configuration is:

| Piece | Value |
|---|---|
| Web editor | https://ryanw0608.github.io/HomePage/admin/ (Sveltia CMS, login with GitHub) |
| GitHub App | "HomePage CMS", App ID 4228900, Client ID `Iv23li6YzNYlirEUYBOt`, installed on `HomePage` only, permission: Contents read/write. Manage at github.com/settings/apps |
| OAuth broker | Cloudflare Worker **`cms-auth`** → `https://cms-auth.wyz162536.workers.dev` (repo `ryanw0608/sveltia-cms-auth`; env vars `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (secret), `ALLOWED_DOMAINS`) |
| App callback URL | `https://cms-auth.wyz162536.workers.dev/callback` |
| Analytics | GoatCounter account code **`yongzhewang`** → dashboard https://yongzhewang.goatcounter.com; wired in `src/lib/site.ts` `goatcounter` |
| Agent secret | `ZHIPU_API_KEY` in repo Actions secrets (Settings → Secrets and variables → Actions). Optional vars: `GLM_MODEL` (default `glm-5.2`), `GLM_BASE_URL` |
| Agent schedule | daily overview 19:07 UTC, weekly digest Sun 09:37 UTC, manual via Actions → Agent → Run workflow. Output arrives as a PR; merging deploys |

**Key rotation (do this if a credential ever leaks or as routine hygiene):**

- GitHub App client secret → github.com/settings/apps → HomePage CMS → generate new client secret →
  update `GITHUB_CLIENT_SECRET` in the Worker → delete the old secret.
- Zhipu API key → regenerate in the bigmodel.cn console → update `ZHIPU_API_KEY` repo secret.
  (Recommended once shortly after initial setup, since the original key transited chat logs.)
- Neither rotation touches the repo; nothing redeploys except the Worker variable save.

**Daily usage runbook:**

- Quick edits / status flips / new entries from any device → `/admin/`.
- Long math-heavy notes → VS Code + `npm run new:paper` / `new:note` (see `docs/authoring.md`).
- After editing `src/data/taxonomy.ts` → `npm run gen:cms` and commit, so CMS dropdowns stay in sync.
- Agent PRs titled `agent: refresh …` → review the diff, merge if the summary is faithful, close if not.
- Visitor stats → `stats` link in the site status bar or https://yongzhewang.goatcounter.com.

---

One-time account-side steps that only Ryan can do (Claude cannot create accounts or handle
secrets). Everything repo-side is already committed. Each part is independent — do them in any
order; nothing breaks while a part is un-configured.

---

## Part A — Web editor (`/admin`, Sveltia CMS) · ~30 min

The admin page is already live at `https://ryanw0608.github.io/HomePage/admin/` but its login
button won't work until the OAuth broker exists.

**A1. Create a GitHub App** (github.com → Settings → Developer settings → GitHub Apps → New —
preferred over a classic OAuth App; Sveltia supports both):

- App name: `HomePage CMS`; Homepage URL: `https://ryanw0608.github.io/HomePage/`
- Callback URL: `https://YOUR-WORKER.workers.dev/callback` — placeholder; paste the real Worker
  URL after A2.
- **Uncheck "Expire user authorization tokens"** (otherwise CMS logins expire every 8 h).
- Leave "Request user authorization during installation" and "Device Flow" unchecked.
- **Webhook: uncheck "Active"** (not used; the form demands a URL if left on).
- Permissions → Repository permissions → **Contents: Read and write** (Metadata auto-sets to
  read-only). Nothing else.
- "Where can this GitHub App be installed?" → **Only on this account**. Create.
- After creation: copy the **Client ID**, generate + save a **Client Secret** (shown once).
- **Install the app** (required for repo access): app settings → left sidebar → Install App →
  @ryanw0608 → *Only select repositories* → `HomePage`.

**A2. Deploy the OAuth broker** (free Cloudflare Worker):

1. Sign up / log in at dash.cloudflare.com (free plan).
2. Go to https://github.com/sveltia/sveltia-cms-auth and use its "Deploy to Cloudflare Workers"
   button (or clone + `npx wrangler deploy`).
3. In the Worker's Settings → Variables, set:
   - `GITHUB_CLIENT_ID` = from A1
   - `GITHUB_CLIENT_SECRET` = from A1 (encrypt)
   - `ALLOWED_DOMAINS` = `ryanw0608.github.io`
4. Note the Worker URL (`https://<something>.workers.dev`) and put it into the OAuth App's
   callback URL (A1): `https://<something>.workers.dev/callback`.

**A3. Point the CMS at the Worker:** edit `public/admin/config.yml` → `backend.base_url:` replace
`https://REPLACE-WITH-YOUR-WORKER.workers.dev` with your Worker URL. Commit and push.

**A4. Round-trip acceptance test (do this before trusting the editor):**

1. Open `/HomePage/admin/`, log in with GitHub.
2. Open the existing entry *Reading: Attention Is All You Need*, change nothing, press Save.
3. Check the commit diff on GitHub: it must be empty or whitespace-only. `<Bench>`, `<Critique>`,
   `$$…$$` must be byte-identical (the body widget is in raw mode for exactly this reason).
4. Then: create a throwaway entry, upload one image, confirm CI goes green, delete the entry.

**Security model (why others can't write):** the page is static; writes go straight to the GitHub
API with the *logged-in user's* token. GitHub refuses (403) any write from a non-collaborator of
`ryanw0608/HomePage`. The Worker only exchanges the OAuth code for a token — it cannot grant
permissions. If the Client Secret ever leaks: regenerate it in the OAuth App and update the Worker
variable; repo permissions remain the real gate.

Day-to-day rules: heavy long notes still belong in VS Code/Obsidian; commit desktop work before
editing the same file from the web CMS; after changing `src/data/taxonomy.ts` run `npm run gen:cms`
so the CMS dropdowns stay in sync.

---

## Part B — Analytics (GoatCounter) · ~10 min

1. Sign up at https://www.goatcounter.com (free for personal use) — pick a code, e.g. `ryanw0608`
   → your dashboard becomes `https://ryanw0608.goatcounter.com`.
2. In the GoatCounter settings, allow the site `ryanw0608.github.io` and (recommended) make the
   dashboard public — that's what the status-bar `stats` link points to, and the future custom
   visitor map reads its public JSON.
3. Edit `src/lib/site.ts` → `goatcounter: ""` → your code (e.g. `"ryanw0608"`). Commit and push.
   The counter script (no cookies, ~3.5 KB) and the `stats` status-bar link appear automatically;
   with the field empty nothing is emitted.

Phase 2 (after data accumulates): a `/stats/` page with a terminal-style dot-matrix world map
drawn from GoatCounter's public API — the designed replacement for the mapmyvisitors widget. See
`docs/roadmap.md`.

---

## Part C — GLM site agent · ~5 min

The workflow (`.github/workflows/agent.yml`) runs daily (notes overview) and Sunday (weekly
digest). It skips itself politely until the key exists.

1. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - Name: `ZHIPU_API_KEY` · Value: your 智谱 coding-plan API key. (Paste it yourself — never
     share it in chat.)
2. Optional repository **variables** (same page, Variables tab):
   - `GLM_MODEL` — defaults to `glm-5.2`; set this if your plan uses a different model id.
   - `GLM_BASE_URL` — defaults to `https://open.bigmodel.cn/api/paas/v4`; set only if your plan
     uses a different endpoint.
3. Test: Actions → Agent → Run workflow → mode `overview`. It should open a PR titled
   `agent: refresh overview` touching only `src/data/overview.json`. Review, merge → the homepage
   gains an `$ ./agent --overview` section. Run mode `digest` the same way to get the first
   `/digest/` entry.

**Guarantees:** the agent only summarizes committed notes (prompts forbid invention), its output
arrives as a PR you review (merging is what deploys), and a red CI can never publish. If a PR looks
wrong, close it — nothing happened.

---

## Local commands

```bash
npm run agent:overview   # run the overview agent locally (needs ZHIPU_API_KEY in env)
npm run agent:digest     # run the weekly digest locally
npm run gen:cms          # re-sync CMS dropdowns after editing taxonomy.ts
```
