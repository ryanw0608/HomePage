# Deployment

This site targets GitHub Pages as a project site for the `HomePage` repository:

```txt
https://ryanw0608.github.io/HomePage/
```

Required Astro settings:

```js
site: "https://ryanw0608.github.io",
base: "/HomePage/",
trailingSlash: "always"
```

Local verification before publishing:

```sh
npm ci
npm run build
npm run preview
```

GitHub Pages setup:

1. Open repository Settings -> Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Push to `master` or run Deploy GitHub Pages manually from the Actions tab.
4. Verify the published project site:

```txt
https://ryanw0608.github.io/HomePage/
```

Before switching to a user site or custom domain, update the Astro `site` and `base` settings, then rebuild and re-check internal links, RSS links, sitemap URLs, and generated asset paths.
