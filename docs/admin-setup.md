# Owner Setup Guide

## ✅ As-built record (completed 2026-07-06)

Everything below this box is the original how-to, kept for reference. The live configuration is:

| Piece | Value |
|---|---|
| Web editor | **Studio** at `/studio/` (in construction, replaces Sveltia). Sveltia `/admin` retired 2026-07-07; the GitHub App + cms-auth Worker below stay — Studio reuses them for login |
| GitHub App | "HomePage CMS", App ID 4228900, Client ID `Iv23li6YzNYlirEUYBOt`, installed on `HomePage` only, permission: Contents read/write. Manage at github.com/settings/apps |
| OAuth broker | Cloudflare Worker **`cms-auth`** → `https://cms-auth.wyz162536.workers.dev` (repo `ryanw0608/sveltia-cms-auth`; env vars `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (secret), `ALLOWED_DOMAINS`) |
| App callback URL | `https://cms-auth.wyz162536.workers.dev/callback` |
| Analytics | **First-party** (2026-07-07; Umami Cloud was evaluated but its API is Pro-paywalled) — an inline beacon in `SiteShell.astro` (gated on `src/lib/site.ts` `siteApi`) posts to the **site-api** Worker, which stores events in Cloudflare **Analytics Engine** (dataset `homepage_traffic`, no cookies, daily-salted visitor hash). Live map at `/stats/` reads the same Worker. Setup: Part B below |
| site-api Worker | Cloudflare Worker **`site-api`** (code in this repo, `workers/site-api/`) — `/collect` beacon sink → Analytics Engine; `/stats/:metric` public read-only queries (60s edge cache); `/ai/chat` collaborator-gated GLM proxy for Studio. Env: `CF_ACCOUNT_ID`, `CF_API_TOKEN` (secret, Account Analytics: Read), `HASH_SALT` (secret), `ZHIPU_API_KEY` (secret), optional `GLM_MODEL`/`GLM_BASE_URL`; `ALLOWED_ORIGIN` set in wrangler.toml |
| Agent secret | `ZHIPU_API_KEY` in repo Actions secrets (Settings → Secrets and variables → Actions). Optional vars: `GLM_MODEL` (default `glm-5.2`), `GLM_BASE_URL` (default coding-plan endpoint `api/coding/paas/v4`) |
| Agent schedule | daily overview 23:00 UTC (09:00 Sydney), weekly digest Sat 23:00 UTC (Sun 09:00 Sydney), manual via Actions → **CI** → Run workflow (the agent job is hosted inside ci.yml because this repo refuses to register new workflow files — GitHub-side issue, 2026-07-06). Output arrives as a PR; merging deploys |

**Key rotation (do this if a credential ever leaks or as routine hygiene):**

- GitHub App client secret → github.com/settings/apps → HomePage CMS → generate new client secret →
  update `GITHUB_CLIENT_SECRET` in the Worker → delete the old secret.
- Zhipu API key → regenerate in the bigmodel.cn console → update `ZHIPU_API_KEY` repo secret.
  (Recommended once shortly after initial setup, since the original key transited chat logs.)
- Neither rotation touches the repo; nothing redeploys except the Worker variable save.

**Daily usage runbook:**

- Quick edits / status flips / new entries from any device → `/studio/` (P1a live: GitHub
  login, raw-MDX editing, ⌘S = commit, drafts, CI pill; block editor and preview coming).
- Long math-heavy notes → VS Code + `npm run new:paper` / `new:note` (see `docs/authoring.md`).
- Taxonomy dropdowns everywhere derive from `src/data/taxonomy.ts` directly — no regen step.
- Agent PRs titled `agent: refresh …` → review the diff, merge if the summary is faithful, close if not.
- Visitor stats → `stats` link in the site status bar → `/stats/` live world map. To exclude your
  own devices, run `localStorage.setItem("yw-notrack", "1")` once in each browser's console.

---

One-time account-side steps that only Ryan can do (Claude cannot create accounts or handle
secrets). Everything repo-side is already committed. Each part is independent — do them in any
order; nothing breaks while a part is un-configured.

---

## Part A — Web editor (`/admin`, Sveltia CMS) · ~30 min · **RETIRED 2026-07-07**

> Sveltia was removed in Studio P0 (`public/admin/`, `scripts/gen-cms-options.mjs`, `npm run
> gen:cms` all deleted). Keep the GitHub App (A1) and the cms-auth Worker (A2) — Studio's login
> uses exactly the same OAuth flow. The steps below are kept only as the as-built record of that
> App/Worker setup.

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

(Steps A3/A4 configured and validated the Sveltia editor itself; they are gone along with it.
Studio's equivalent acceptance test — a byte-clean "save without changes" commit — ships with
Studio P1.)

**Security model (why others can't write, unchanged for Studio):** the editor page is static;
writes go straight to the GitHub API with the *logged-in user's* token. GitHub refuses (403) any
write from a non-collaborator of `ryanw0608/HomePage`. The Worker only exchanges the OAuth code
for a token — it cannot grant permissions. If the Client Secret ever leaks: regenerate it in the
GitHub App and update the Worker variable; repo permissions remain the real gate.

---

## Part B — Analytics (first-party, Cloudflare Analytics Engine) · ~15 min

The `/stats/` page (terminal dot-matrix world map, live "online now", top countries / pages /
referrers) is already deployed and stays in a graceful "not configured" state until these steps
are done. The whole pipeline is first-party: the site sends a tiny beacon to the `site-api`
Worker, the Worker stores events in Cloudflare Analytics Engine (free: ~100k writes/day, 90-day
retention) and answers the map's queries. No third-party analytics account needed.
(History: Umami Cloud was the original plan, but its API is paywalled behind Pro — the account
created for it can be deleted.)

**B1. Deploy the site-api Worker** (same flow as the cms-auth Worker):

1. dash.cloudflare.com → Workers & Pages → Create → **Import a repository** → pick
   `ryanw0608/HomePage`.
2. Project name: `site-api`. **Root directory: `workers/site-api`** (critical — the wrangler.toml
   with the Analytics Engine binding lives there). Deploy.
3. Note the Worker URL, e.g. `https://site-api.wyz162536.workers.dev`.

**B2. Create a Cloudflare API token** (lets the Worker query its own analytics data):

1. dash.cloudflare.com → top-right profile → **My Profile → API Tokens → Create Token →
   Custom token**.
2. Name `site-api-analytics`; Permissions: **Account · Account Analytics · Read** (that one row,
   nothing else); Account Resources: your account. Create and copy the token (shown once).
3. Also note your **Account ID** (Workers & Pages overview page, right-hand column — a 32-char
   hex string).

**B3. Fill the Worker variables** (Worker → Settings → Variables and Secrets):

- `CF_ACCOUNT_ID` (text) = the Account ID from B2
- `CF_API_TOKEN` (encrypt) = the token from B2
- `HASH_SALT` (encrypt) = any random string you make up (salts the anonymous visitor hash)
- `ZHIPU_API_KEY` (encrypt) = 智谱 coding-plan key — powers the Studio AI assistant later; can be
  added whenever

**B4. Wire the site:** edit `src/lib/site.ts` → `siteApi: ""` → the Worker URL from B1 (no
trailing slash), commit and push — or paste the URL to Claude. This single field turns on both
the beacon and the live map. Visit the site once after deploy; within a minute or two `/stats/`
should show 1 online and light up your country.

**Privacy / security model:** no cookies, no fingerprinting — a visitor is a salted SHA-256 of
ip+ua that rotates daily (the Plausible/GoatCounter scheme); raw IPs are never stored. The API
token can only *read analytics* and lives only in the Worker. `/collect` accepts only beacons
with this site's Origin and drops bot user-agents; `/stats/*` is public read-only and cached
(60 s; the live "online now" count 10 s); `/ai/chat` requires a GitHub token with push access to this repo (the same collaborator
gate as content writes). To not count yourself, run `localStorage.setItem("yw-notrack", "1")` in
each of your browsers' consoles once.

---

## Part C — GLM site agent · ~5 min

The agent job (hosted in `.github/workflows/ci.yml`) runs daily (notes overview) and Sunday
(weekly digest). It skips itself politely until the key exists.

1. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - Name: `ZHIPU_API_KEY` · Value: your 智谱 coding-plan API key. (Paste it yourself — never
     share it in chat.)
2. Optional repository **variables** (same page, Variables tab):
   - `GLM_MODEL` — defaults to `glm-5.2`; set this if your plan uses a different model id.
   - `GLM_BASE_URL` — defaults to `https://open.bigmodel.cn/api/coding/paas/v4` (the GLM
     Coding Plan endpoint per docs.bigmodel.cn); set only if your plan uses a different one.
3. Test: Actions → CI → Run workflow → mode `overview`. It should open a PR titled
   `agent: refresh overview` touching only `src/data/overview.json`. Review, merge → the homepage
   gains an `$ ./agent --overview` section. Run mode `digest` the same way to get the first
   `/digest/` entry.

**Guarantees:** the agent only summarizes committed notes (prompts forbid invention), its output
arrives as a PR you review (merging is what deploys), and a red CI can never publish. If a PR looks
wrong, close it — nothing happened.

---

## Part D — History safety & privacy (decided 2026-07-07)

**Local backup (installed, nothing to do):** a Windows scheduled task **"HomePage git backup"**
runs daily at 12:00 (or next wake) on this PC: `git fetch --all --prune` (mirrors the full GitHub
history locally even if the working tree is dirty) then `git pull --ff-only` (fast-forwards the
working tree when safe). Every note therefore exists in at least three places: GitHub (full
history), this PC's git clone (full history), and the deployed site. Manage the task in Task
Scheduler if needed.

**Private repo migration (owner steps, do in this order):**

1. Apply for the GitHub Student Developer Pack at https://education.github.com/pack with your
   USYD email / enrollment proof (free; grants GitHub Pro; approval takes hours to a few days).
2. **Only after Pro is active**: repo → Settings → General → Danger Zone → Change visibility →
   Private. (Flipping before Pro would disable GitHub Pages — Pages on private repos is a Pro
   feature. The site URL and deployment stay exactly the same afterwards.)
3. Note the CI budget change: private repos get 2000 free Actions minutes/month (builds are ~2
   min each + the daily agent run — comfortably within budget, but visible under Settings →
   Billing if ever curious).

Content visibility on the site itself is a separate, per-note `visibility` frontmatter field
(`public` / `unlisted` / `private`) introduced with Studio P0 — see `docs/authoring.md` once it
lands. Repo privacy protects the *source*; the field controls what the *website* shows.

---

## Local commands

```bash
npm run agent:overview   # run the overview agent locally (needs ZHIPU_API_KEY in env)
npm run agent:digest     # run the weekly digest locally
```
