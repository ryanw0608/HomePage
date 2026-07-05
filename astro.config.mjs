import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://ryanw0608.github.io",
  base: "/HomePage/",
  trailingSlash: "always",
  output: "static",
  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex]
    }),
    react(),
    sitemap()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
