# Deployment

This site is currently deployed as a GitHub Pages project site:

```txt
https://ryanw0608.github.io/HomePage/
```

## Active Hosting Mode

Repository: `ryanw0608/HomePage`

Branch deployed by workflow: `master`

Astro settings:

```js
site: "https://ryanw0608.github.io",
base: "/HomePage/",
trailingSlash: "always"
```

Do not remove the `/HomePage/` base unless the site moves to a user site (`ryanw0608.github.io`) or a custom domain.

## GitHub Pages Settings

Required repository settings:

1. Settings -> Pages -> Build and deployment -> Source: `GitHub Actions`.
2. Settings -> Environments -> `github-pages` -> Deployment branches and tags:
   - `master`
   - `homepage-foundation`

The `master` environment rule is required. Without it, deploy fails with:

```txt
Branch "master" is not allowed to deploy to github-pages due to environment protection rules.
```

## Workflows

- `.github/workflows/ci.yml` runs validation and production build.
- `.github/workflows/deploy.yml` builds the site and deploys `dist/` to GitHub Pages.

The deploy workflow runs on pushes to `master` and through manual `workflow_dispatch`.

## Local Verification

Run from the repository root:

```bash
npm ci
npm run check
npm run build
npm run preview
```

For base-path checks, inspect built output through the deployed URL or a static preview that serves the site under `/HomePage/`.

## Verified Production Routes

These routes were verified after Pages deployment:

- `/HomePage/`
- `/HomePage/course-notes/`
- `/HomePage/paper-reading/`
- `/HomePage/about/`
- `/HomePage/course-notes/ml-foundations-gradient-descent/`
- `/HomePage/paper-reading/attention-is-all-you-need/`
- `/HomePage/rss.xml`
- `/HomePage/sitemap-index.xml`
- Built CSS assets under `/HomePage/_astro/`

## Switching Hosting Mode

Before moving to a user site, Cloudflare Pages, or a custom domain:

1. Update `astro.config.mjs` `site` and `base`.
2. Rebuild with `npm run build`.
3. Re-check internal links, RSS URLs, sitemap URLs, canonical URLs, and asset paths.
4. Update this document and the handoff docs.
