import { STUDIO } from "@/studio/config";

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(STUDIO.tokenKey);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(STUDIO.tokenKey, token);
    else window.localStorage.removeItem(STUDIO.tokenKey);
  } catch {
    /* storage blocked — session-only login */
  }
}

/*
 * GitHub login via the cms-auth Worker using the Decap popup protocol:
 *   1. open  {worker}/auth?provider=github&site_id={host}&scope=repo
 *   2. popup posts the handshake string  "authorizing:github"
 *   3. we answer with the same string (any message unblocks the popup)
 *   4. popup posts  "authorization:github:success:{json}"  and closes
 */
export function loginWithPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url =
      `${STUDIO.authWorker}/auth?provider=github` +
      `&site_id=${encodeURIComponent(window.location.hostname)}&scope=repo`;
    const popup = window.open(url, "studio-auth", "width=680,height=760");
    if (!popup) {
      reject(new Error("popup blocked — allow popups for this site and retry"));
      return;
    }

    const expectedOrigin = new URL(STUDIO.authWorker).origin;
    let settled = false;

    function finish(error: Error | null, token?: string) {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(closeWatcher);
      try {
        popup?.close();
      } catch {
        /* already closed */
      }
      if (error) reject(error);
      else resolve(token ?? "");
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return;
      const data = typeof event.data === "string" ? event.data : "";

      if (data === "authorizing:github") {
        popup?.postMessage("authorizing:github", expectedOrigin);
        return;
      }
      if (data.startsWith("authorization:github:success:")) {
        try {
          const payload = JSON.parse(data.slice("authorization:github:success:".length));
          if (payload?.token) finish(null, String(payload.token));
          else finish(new Error("auth succeeded but no token in payload"));
        } catch {
          finish(new Error("auth succeeded but payload was unreadable"));
        }
        return;
      }
      if (data.startsWith("authorization:github:error:")) {
        finish(new Error(`auth failed: ${data.slice("authorization:github:error:".length).slice(0, 200)}`));
      }
    }

    const closeWatcher = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(closeWatcher);
        // Grace period: the success message can arrive a beat after the
        // popup closes itself — don't reject a login that just succeeded.
        window.setTimeout(() => finish(new Error("login window closed")), 700);
      }
    }, 500);

    window.addEventListener("message", onMessage);
  });
}
