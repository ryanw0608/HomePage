/*
 * site-api — one Worker, three jobs (first-party analytics + AI proxy):
 *
 *   POST /collect          traffic beacon sent by the site itself. Stores
 *                          [type, path, referrer, country, visitor, session]
 *                          into Workers Analytics Engine. No cookies: the
 *                          visitor id is a salted daily hash of ip+ua, the
 *                          session id lives in sessionStorage. Bot- and
 *                          origin-filtered.
 *
 *   GET  /stats/:metric    public read-only queries over the collected data
 *                          (summary | countries | pages | referrers | active),
 *                          cached in-memory 60s (active: 10s), CORS-locked to
 *                          the site. (Not caches.default — the Cache API is a
 *                          no-op on *.workers.dev hosts.)
 *
 *   POST /ai/chat          GLM (Zhipu) chat proxy for the Studio editor.
 *                          Requires a GitHub token with push access to the
 *                          repo (the same collaborator gate as content writes).
 *
 * Bindings (wrangler.toml):
 *   TRAFFIC          Analytics Engine dataset `homepage_traffic`
 *
 * Environment (Cloudflare dashboard → Settings → Variables and Secrets):
 *   CF_ACCOUNT_ID   (text)    Cloudflare account id (for the Analytics SQL API)
 *   CF_API_TOKEN    (secret)  API token with permission "Account Analytics: Read"
 *   HASH_SALT       (secret)  any random string; salts the daily visitor hash
 *   ZHIPU_API_KEY   (secret)  GLM coding-plan key
 *   GLM_MODEL       (text, optional, default glm-5.2)
 *   GLM_BASE_URL    (text, optional, default https://open.bigmodel.cn/api/coding/paas/v4)
 *   ALLOWED_ORIGIN  (text, default https://ryanw0608.github.io)
 */

const GH_REPO = "ryanw0608/HomePage";
const DATASET = "homepage_traffic";

const STATS_TTL = { active: 10, default: 60 };
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|scrape|python-requests|curl\//i;

function allowedOrigin(env) {
  return env.ALLOWED_ORIGIN || "https://ryanw0608.github.io";
}

function corsHeaders(env, extra = {}) {
  return {
    "access-control-allow-origin": allowedOrigin(env),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    ...extra
  };
}

function json(env, body, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(env, {
      "content-type": "application/json",
      ...(cacheSeconds ? { "cache-control": `public, max-age=${cacheSeconds}` } : {})
    })
  });
}

function noContent(env) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

/* ---------------------------------------------------------------- collect */

async function visitorHash(env, request) {
  // Daily-rotating salted hash — same scheme as Plausible/GoatCounter.
  // Not reversible, not linkable across days, no cookie involved.
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${env.HASH_SALT || "yw"}|${day}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handleCollect(env, request) {
  if (!env.TRAFFIC) return json(env, { error: "collect not configured" }, 503);

  // Beacons always carry the Origin header cross-origin; anything else
  // (curl, bots, other sites) is dropped without error.
  if (request.headers.get("origin") !== allowedOrigin(env)) return noContent(env);
  if (BOT_RE.test(request.headers.get("user-agent") || "")) return noContent(env);

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return noContent(env);
  }

  const type = payload?.type === "ping" ? "ping" : "view";
  const path = typeof payload?.path === "string" ? payload.path.slice(0, 256) : "";
  if (!path.startsWith("/")) return noContent(env);
  const sid = typeof payload?.sid === "string" ? payload.sid.slice(0, 64) : "";

  let referrer = "";
  try {
    const host = new URL(payload?.referrer).hostname;
    const ownHost = new URL(allowedOrigin(env)).hostname;
    if (host && host !== ownHost) referrer = host.replace(/^www\./, "").slice(0, 128);
  } catch {
    /* no or invalid referrer */
  }

  const country = request.cf?.country || "";
  const visitor = await visitorHash(env, request);

  env.TRAFFIC.writeDataPoint({
    blobs: [type, path, referrer, country, visitor, sid],
    doubles: [1],
    indexes: [visitor]
  });
  return noContent(env);
}

/* ------------------------------------------------------------------ stats */

async function sql(env, query) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${env.CF_API_TOKEN}` },
      body: query
    }
  );
  if (!res.ok) throw new Error(`analytics sql ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const out = await res.json();
  return out?.data ?? [];
}

// Blob layout (see handleCollect): blob1 type, blob2 path, blob3 referrer,
// blob4 country, blob5 visitor, blob6 session. Event count = sum of
// _sample_interval (Analytics Engine may sample under heavy load).
const VIEWS_30D = `FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '30' DAY AND blob1 = 'view'`;

function topRows(rows, xKey) {
  return rows
    .map((r) => ({ x: String(r[xKey] ?? ""), y: Number(r.y) || 0 }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 10);
}

async function queryMetric(env, metric) {
  if (metric === "active") {
    // Distinct sessions seen in the last 5 minutes (views + pings).
    const rows = await sql(
      env,
      `SELECT blob6 AS s FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '5' MINUTE AND blob6 != '' GROUP BY s LIMIT 10000`
    );
    return { visitors: rows.length };
  }
  if (metric === "summary") {
    // One query: distinct visitors = row count, pageviews = summed events.
    const rows = await sql(env, `SELECT blob5 AS v, sum(_sample_interval) AS n ${VIEWS_30D} GROUP BY v LIMIT 10000`);
    return {
      visitors: rows.length,
      pageviews: rows.reduce((total, r) => total + (Number(r.n) || 0), 0)
    };
  }
  if (metric === "countries") {
    // Distinct visitors per country: group by (country, visitor), then
    // fold rows per country here (the SQL dialect has no COUNT(DISTINCT)).
    const rows = await sql(env, `SELECT blob4 AS c, blob5 AS v ${VIEWS_30D} AND blob4 != '' GROUP BY c, v LIMIT 10000`);
    const byCountry = new Map();
    for (const r of rows) byCountry.set(r.c, (byCountry.get(r.c) || 0) + 1);
    return [...byCountry.entries()].map(([x, y]) => ({ x, y })).sort((a, b) => b.y - a.y);
  }
  if (metric === "pages") {
    const rows = await sql(env, `SELECT blob2 AS x, sum(_sample_interval) AS y ${VIEWS_30D} GROUP BY x LIMIT 10000`);
    return topRows(rows, "x");
  }
  if (metric === "referrers") {
    const rows = await sql(env, `SELECT blob3 AS x, sum(_sample_interval) AS y ${VIEWS_30D} AND blob3 != '' GROUP BY x LIMIT 10000`);
    return topRows(rows, "x");
  }
  return null;
}

// Per-isolate memory cache. caches.default would be the classic choice, but
// the Cache API is a documented no-op on *.workers.dev hosts; a module-level
// Map survives across requests within an isolate, which is enough to collapse
// the per-viewer polling into one upstream query per TTL per colo. Browsers
// additionally honor the max-age header per client.
const memCache = new Map(); // metric -> { expires: epoch-ms, body: unknown }

async function handleStats(env, metric) {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return json(env, { error: "stats not configured" }, 503);
  }

  const ttl = STATS_TTL[metric] ?? STATS_TTL.default;
  const hit = memCache.get(metric);
  if (hit && hit.expires > Date.now()) {
    return json(env, hit.body, 200, ttl);
  }

  const body = await queryMetric(env, metric);
  if (body === null) return json(env, { error: "unknown metric" }, 404);

  memCache.set(metric, { expires: Date.now() + ttl * 1000, body });
  return json(env, body, 200, ttl);
}

/* --------------------------------------------------------------------- ai */

async function verifyCollaborator(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}`, {
    headers: {
      authorization: auth,
      accept: "application/vnd.github+json",
      "user-agent": "site-api-worker"
    }
  });
  if (!res.ok) return false;
  const repo = await res.json();
  return repo?.permissions?.push === true;
}

async function handleAi(env, request) {
  if (!env.ZHIPU_API_KEY) return json(env, { error: "ai not configured" }, 503);
  if (!(await verifyCollaborator(request))) {
    return json(env, { error: "forbidden: repo write access required" }, 403);
  }

  const payload = await request.json();
  const base = (env.GLM_BASE_URL || "https://open.bigmodel.cn/api/coding/paas/v4").replace(/\/$/, "");
  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.ZHIPU_API_KEY}`
    },
    body: JSON.stringify({
      model: env.GLM_MODEL || "glm-5.2",
      temperature: payload.temperature ?? 0.4,
      stream: payload.stream ?? true,
      // Single-user plan: always run with thinking enabled (1M-context model).
      thinking: payload.thinking ?? { type: "enabled" },
      messages: payload.messages ?? []
    })
  });

  // Pass the (possibly streaming SSE) body straight through.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: corsHeaders(env, {
      "content-type": upstream.headers.get("content-type") || "application/json"
    })
  });
}

/* ------------------------------------------------------------------ entry */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      if (url.pathname === "/collect" && request.method === "POST") {
        return await handleCollect(env, request);
      }
      const statsMatch = url.pathname.match(/^\/stats\/([a-z]+)\/?$/);
      if (statsMatch && request.method === "GET") {
        return await handleStats(env, statsMatch[1]);
      }
      if (url.pathname === "/ai/chat" && request.method === "POST") {
        return await handleAi(env, request);
      }
      return json(env, {
        ok: true,
        service: "site-api",
        endpoints: ["/collect", "/stats/:metric", "/ai/chat"]
      });
    } catch (err) {
      return json(env, { error: String(err?.message || err).slice(0, 300) }, 502);
    }
  }
};
