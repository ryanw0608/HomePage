import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Studio converter tests. The pure round-trip/golden suite runs in node;
// the BlockNote mount test opts into jsdom via a `// @vitest-environment
// jsdom` pragma at the top of that file.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true
  }
});
