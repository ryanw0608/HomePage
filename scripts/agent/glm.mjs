/*
 * Minimal Zhipu (bigmodel.cn) chat client. OpenAI-compatible endpoint.
 *
 * Env:
 *   ZHIPU_API_KEY  (required — set in GitHub Actions secrets, never committed)
 *   GLM_MODEL      (optional, default glm-5.2)
 *   GLM_BASE_URL   (optional, default https://open.bigmodel.cn/api/coding/paas/v4 —
 *                   the GLM Coding Plan endpoint; plan keys are invalid on the
 *                   regular api/paas/v4 endpoint)
 */
export async function chat(messages, { temperature = 0.4 } = {}) {
  const key = process.env.ZHIPU_API_KEY;
  if (!key) {
    throw new Error("ZHIPU_API_KEY is not set");
  }

  const base = (process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/coding/paas/v4").replace(/\/$/, "");
  const model = process.env.GLM_MODEL ?? "glm-5.2";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`
    },
    body: JSON.stringify({ model, temperature, messages })
  });

  if (!res.ok) {
    throw new Error(`GLM API ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(`GLM API returned no content: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { content, model };
}

/* Extract a JSON object from a model reply that may wrap it in ``` fences. */
export function parseJsonReply(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`no JSON object found in model reply: ${text.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1));
}
