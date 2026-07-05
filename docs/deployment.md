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

Before switching to a user site or custom domain, update the Astro `site` and `base` settings, then rebuild and re-check internal links, RSS links, sitemap URLs, and generated asset paths.
