# wiki-site

Serves the **[BartoszOsiej GitHub Wiki](https://github.com/BartoszOsiej/BartoszOsiej/wiki)** as a themed documentation site on **https://wiki.hartwell-labs.pl** via a Cloudflare Worker (static assets).

- Source of truth: the GitHub Wiki (`*.wiki.git`). Edit docs on GitHub → site refreshes.
- Build: `build.js` (markdown → static HTML, link rewriting, sidebar).
- Deploy: `wrangler deploy` (worker `hartwell-wiki`, custom domain `wiki.hartwell-labs.pl`).

## CI
`.github/workflows/deploy.yml` runs hourly + on demand: clones the wiki, builds, deploys.
Needs repo secrets `CF_API_TOKEN` and `CF_ACCOUNT_ID`.

## Manual deploy
```bash
git clone --depth 1 https://github.com/BartoszOsiej/BartoszOsiej.wiki.git wiki-src
npm install && node build.js ./wiki-src && npx wrangler deploy
```
