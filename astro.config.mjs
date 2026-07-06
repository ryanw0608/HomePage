import { readFileSync, readdirSync } from "node:fs";

import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// visibility: "unlisted" notes are built but must never be advertised
// (see src/lib/schema/frontmatter.ts) — robots.txt announces the sitemap
// to every crawler, so their URLs have to be filtered out of it here.
function unlistedPathnames() {
  const paths = new Set();
  for (const collection of ["course-notes", "paper-reading"]) {
    const dir = `src/content/${collection}`;
    let files = [];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(md|mdx)$/.test(file)) continue;
      const raw = readFileSync(`${dir}/${file}`, "utf8");
      if (/^visibility:\s*["']?unlisted["']?\s*$/m.test(raw)) {
        paths.add(`/HomePage/${collection}/${file.replace(/\.(md|mdx)$/, "")}/`);
      }
    }
  }
  return paths;
}

const unlisted = unlistedPathnames();

export default defineConfig({
  site: "https://ryanw0608.github.io",
  base: "/HomePage/",
  trailingSlash: "always",
  output: "static",
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark"
      },
      defaultColor: false
    },
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex]
    })
  },
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !unlisted.has(new URL(page).pathname)
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
