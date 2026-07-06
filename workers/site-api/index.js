/*
 * site-api — one Worker, two jobs:
 *
 *   GET  /stats/:metric   public read-only proxy to the Umami Cloud API
 *                         (summary | countries | pages | referrers | active),
 *                         cached 60s (active: 10s), CORS-locked to the site.
 *
 *   POST /ai/chat         GLM (Zhipu) chat proxy for the Studio editor.
 *                         Requires a GitHub token with push access to the
 *                         repo (the same collaborator gate as content writes).
 *
 * Environment (Cloudflare dashboard → Settings → Variables and Secrets):
 *   UMAMI_API_KEY   (secret)  Umami Cloud API key
 *   UMAMI_WEBSITE_ID (text)   Umami website id
 *   ZHIPU_API_KEY   (secret)  GLM coding-plan key
 *   GLM_MODEL       (text, optional, default glm-5.2)
 *   GLM_BASE_URL    (text, optional, default https://open.bigmodel.cn/api/coding/paas/v4)
 *   ALLOWED_ORIGIN  (text, default https://ryanw0608.github.io)
 */

const UMAMI_API = "https://api.umami.is/v1";
const GH_REPO = "ryanw0608/HomePage";

const STATS_TTL = { active: 10, default: 60 };

function corsHeaders(env, extra = {}) {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || "https://ryanw0608.github.io",
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

async function umami(env, path, params = {}) {
  const url = new URL(`${UMAMI_API}/websites/${env.UMAMI_WEBSITE_ID}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { "x-umami-api-key": env.UMAMI_API_KEY, accept: "application/json" }
  });
  if (!res.ok) throw new Error(`umami ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function handleStats(env, metric, ctx, request) {
  if (!env.UMAMI_API_KEY || !env.UMAMI_WEBSITE_ID) {
    return json(env, { error: "stats not configured" }, 503);
  }

  // Edge cache: one entry per metric, TTL per metric type.
  const ttl = STATS_TTL[metric] ?? STATS_TTL.default;
  const cacheKey = new Request(`https://cache.site-api/${metric}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) {
    const copy = new Response(hit.body, hit);
    for (const [k, v] of Object.entries(corsHeaders(env))) copy.headers.set(k, v);
    return copy;
  }

  const now = Date.now();
  const monthAgo = now - 30 * 24 * 3600 * 1000;
  const range = { startAt: monthAgo, endAt: now };

  let body;
  if (metric === "active") {
    body = await umami(env, "/active");
  } else if (metric === "summary") {
    body = await umami(env, "/stats", range);
  } else if (metric === "countries") {
    body = await umami(env, "/metrics", { ...range, type: "country", limit: 200 });
  } else if (metric === "pages") {
    body = await umami(env, "/metrics", { ...range, type: "url", limit: 10 });
  } else if (metric === "referrers") {
    body = await umami(env, "/metrics", { ...range, type: "referrer", limit: 10 });
  } else {
    return json(env, { error: "unknown metric" }, 404);
  }

  const res = json(env, body, 200, ttl);
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      const statsMatch = url.pathname.match(/^\/stats\/([a-z]+)\/?$/);
      if (statsMatch && request.method === "GET") {
        return await handleStats(env, statsMatch[1], ctx, request);
      }
      if (url.pathname === "/ai/chat" && request.method === "POST") {
        return await handleAi(env, request);
      }
      return json(env, { ok: true, service: "site-api", endpoints: ["/stats/:metric", "/ai/chat"] });
    } catch (err) {
      return json(env, { error: String(err?.message || err).slice(0, 300) }, 502);
    }
  }
};
