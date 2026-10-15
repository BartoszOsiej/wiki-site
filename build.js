import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] || "/tmp/opencode/wiki";
const OUT = path.resolve("./dist");

const GUIDE = [
  ["quality-assurance", "Quality Assurance"],
  ["research-and-development", "Research & Development"],
  ["energy-research", "Energy Research"],
  ["supply-chain", "Supply chain & standards"],
  ["pdf-translator", "PDF Translator"],
  ["tests", "Test Suites"],
  ["update-flow", "Update Flow"],
];
const PRODUCTS = [
  ["projects/talus-process-monitor", "Talus Process Monitor"],
  ["projects/solana-validator", "TrustNode"],
  ["projects/externum", "Externum"],
  ["projects/cybersec-tools", "CyberForge"],
  ["projects/pqbit", "PQBit"],
  ["projects/nv2-engine", "VIVIA"],
  ["projects/n2-mesh", "Meshcore"],
  ["projects/factorio-web-game", "Novactorio"],
  ["projects/prompt-inbox", "Promptbox"],
  ["projects/fastapi-url", "LinkShort"],
  ["projects/pqguard", "PQGuard"],
];
const TITLES = { projects: "Projects" };
for (const [s, t] of GUIDE) TITLES[s] = t;
for (const [s, t] of PRODUCTS) TITLES[s] = t;

const cleanH1 = (s) =>
  s
    .replace(/^[\s#]+/, "")
    .replace(/^(?:[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D\u2122\u2120]+\s*)+/u, "")
    .trim();

function walk(dir, base = dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, base));
    else if (e.name.endsWith(".md")) out.push(path.relative(base, p));
  }
  return out;
}

function normTarget(href, pageDir) {
  if (/^(https?:|mailto:|#|data:)/.test(href)) return null;
  const h = href.replace(/\.md$/i, "").replace(/^\/docs\//, "/").replace(/^docs\//, "");
  if (h === "Home" || h === "home" || h === "") return "/";
  if (h.startsWith("/")) return h.endsWith("/") ? h : h + "/";
  const joined = path.posix.normalize(path.posix.join(pageDir, h)).toLowerCase().replace(/\/$/, "");
  return "/" + joined + "/";
}

let currentDir = "";
marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    link(token) {
      let href = token.href;
      const t = normTarget(href, currentDir);
      if (t) href = t;
      return `<a href="${href}">${this.parser.parseInline(token.tokens)}</a>`;
    },
  },
});
const render = (md, dir) => {
  currentDir = dir;
  return marked.parse(md);
};

const pages = walk(SRC).filter((p) => !path.basename(p).startsWith("_"));

const SIDEBAR = `<h2>Documentation</h2>
<ul><li><a href="/">Overview</a></li><li><a href="/projects/">Projects</a></li></ul>
<h3>Guides</h3>
<ul>${GUIDE.map(([s, t]) => `<li><a href="/${s}/">${t}</a></li>`).join("")}</ul>
<h3>Products</h3>
<ul>${PRODUCTS.map(([s, t]) => `<li><a href="/${s}/">${t}</a></li>`).join("")}</ul>`;

const HEX = `<svg width="22" height="22" viewBox="0 0 46 46" aria-hidden="true"><path d="M23,2 L42,13 L42,33 L23,44 L4,33 L4,13 Z" fill="none" stroke="#4f46e5" stroke-width="3.4" stroke-linejoin="round"/><polyline points="13,26 19,26 22,17 26,29 29,24 33,24" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CSS = `
:root{--bg:#fff;--bg-subtle:#f8fafc;--border:#e2e8f0;--txt:#0f172a;--txt-2:#475569;--txt-3:#94a3b8;--accent:#4f46e5;--accent-hover:#4338ca;--accent-soft:#eef2ff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font-family:"Inter",-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.65}
.container{max-width:1080px;margin:0 auto;padding:0 24px}
header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.header-in{display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px;text-decoration:none;color:var(--txt)}
nav.main{display:flex;gap:26px}
nav.main a{font-size:14px;color:var(--txt-2);text-decoration:none;font-weight:500}
nav.main a:hover,nav.main a[aria-current]{color:var(--txt)}
.header-cta{display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:8px;background:var(--txt);color:#fff;font-size:13.5px;font-weight:600;text-decoration:none}
.header-cta:hover{background:#1e293b}
.layout{display:flex;align-items:flex-start}
.side{width:280px;flex:0 0 280px;position:sticky;top:64px;height:calc(100vh - 64px);overflow:auto;padding:30px 22px 60px 0;border-right:1px solid var(--border);font-size:14px}
.side ul{list-style:none;padding:0;margin:6px 0}
.side li{margin:2px 0}
.side a{color:var(--txt-2);text-decoration:none}
.side a:hover{color:var(--accent)}
.side h2,.side h3{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--txt-3);margin:20px 0 6px;font-weight:600}
.doc{flex:1;min-width:0;padding:40px 0 60px 46px;max-width:780px}
.md h1{font-size:clamp(30px,4vw,40px);letter-spacing:-.02em;line-height:1.15;font-weight:700;margin:0 0 18px}
.md h2{font-size:22px;letter-spacing:-.01em;margin:2em 0 .5em;font-weight:700;padding-bottom:.25em;border-bottom:1px solid var(--border)}
.md h3{font-size:17px;margin:1.6em 0 .4em;font-weight:600}
.md a{color:var(--accent);text-decoration:none}.md a:hover{text-decoration:underline}
.md img{max-width:100%}.md p{margin:1em 0}
.md code{font-family:"JetBrains Mono",monospace;font-size:.87em;background:var(--bg-subtle);border:1px solid var(--border);border-radius:5px;padding:.1em .4em}
.md pre{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:16px 18px;overflow:auto;font-size:13.5px;line-height:1.6}
.md pre code{background:none;border:0;color:inherit;padding:0}
.md table{border-collapse:collapse;width:100%;margin:1.2em 0;font-size:14.5px}
.md th,.md td{border:1px solid var(--border);padding:8px 12px;text-align:left}
.md th{background:var(--bg-subtle);font-weight:600}
.md blockquote{border-left:3px solid var(--accent);background:var(--accent-soft);margin:1.2em 0;padding:.5em 1.1em;border-radius:0 8px 8px 0;color:var(--txt-2)}
.md hr{border:0;border-top:1px solid var(--border);margin:2em 0}
.md ul,.md ol{padding-left:1.3em}
footer.site{margin-top:56px;border-top:1px solid var(--border);padding-top:18px;color:var(--txt-3);font-size:13.5px}
footer.site a{color:var(--txt-2)}

.ai-link{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;margin-right:8px;border:1px solid var(--border);border-radius:7px;font:600 11.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.04em;color:var(--txt-2);text-decoration:none;text-transform:uppercase}
.ai-link:hover{color:var(--accent);border-color:var(--accent)}
@media(max-width:900px){nav.main{display:none}.layout{flex-direction:column}.side{position:relative;top:0;height:auto;width:100%;flex:none;border-right:0;border-bottom:1px solid var(--border);padding:20px 0}.doc{padding:24px 0;max-width:none}}
`;

const HEADER = `<header><div class="container header-in">
<a class="logo" href="/">${HEX}Hartwell&nbsp;Labs</a>
<nav class="main">
<a href="https://hartwell-labs.pl/products">Products</a>
<a href="https://hartwell-labs.pl/catalog">Catalog</a>
<a href="/" aria-current="page">Docs</a>
<a href="https://hartwell-labs.pl/security">Security</a>
<a href="https://hartwell-labs.pl/company">Company</a>
</nav>
<a class="ai-link" href="/llms.txt" title="llms.txt — indeks wszystkich stron w markdownie">AI</a>
<a class="header-cta" href="https://github.com/Hartwell-Labs">GitHub ↗</a>
</div></header>`;

/* Wersja markdownowa strony — frontmatter + treść + specyfikacja wyglądu.
   Dzięki niej AI dostaje pełny tekst strony bez otwierania HTML-a. */
const VISUAL = (title) => `
---

# Visual specification

> Generated by \`build.js\` from the theme constants below, so it always matches the CSS.

### Palette

| Token | Value | Role |
|---|---|---|
| \`--bg\` | \`#fff\` | tło strony |
| \`--bg-subtle\` | \`#f8fafc\` | tło nagłówków tabel, kod inline |
| \`--border\` | \`#e2e8f0\` | obramowania 1px |
| \`--txt\` | \`#0f172a\` | tekst główny |
| \`--txt-2\` | \`#475569\` | tekst drugorzędny (sidebar, stopka) |
| \`--txt-3\` | \`#94a3b8\` | tekst trzeciorzędny (nagłówki grup w sidebarze) |
| \`--accent\` | \`#4f46e5\` | akcent: logo, linki, \`aria-current\` |
| \`--accent-hover\` | \`#4338ca\` | akcent po najechaniu |
| \`--accent-soft\` | \`#eef2ff\` | tło blockquote |

Motyw jest **jasny**. Jedyny ciemny element to bloki kodu (\`#0f172a\` tło,
\`#e2e8f0\` tekst) — to zamierzone, nie tryb nocny.

### Typography

- **Inter** 400/500/600/700, 16px, \`line-height: 1.65\`.
- **JetBrains Mono** 400/600 — kod inline i bloki.
- Oba kroje z Google Fonts (\`preconnect\` do \`fonts.googleapis.com\`).

### Layout

- \`.container\`: \`max-width: 1080px\`, centrowany, padding 24px.
- Nagłówek sticky, 64px, tło \`rgba(255,255,255,.88)\` + \`backdrop-filter: blur(10px)\`.
- Układ dwukolumnowy: sidebar **280px** (sticky, \`top:64px\`, \`height: calc(100vh - 64px)\`,
  własny scroll, prawa linia \`--border\`) + treść \`max-width: 780px\`, padding \`40px 0 60px 46px\`.
- Breakpoint: \`max-width: 900px\` — sidebar spada pod treść, znika \`position: sticky\`,
  nawigacja w nagłówku jest ukrywana.
- Nagłówki w treści: H1 \`clamp(30px, 4vw, 40px)\`, \`letter-spacing: -.02em\`;
  H2 22px z dolną linią \`--border\`; H3 17px.
- Tabele: obramowania 1px, nagłówek na tle \`--bg-subtle\`.
- Blockquote: lewa krawędź 3px w kolorze akcentu, tło \`--accent-soft\`.
- Stopka: górna linia \`--border\`, \`--txt-3\`, link do strony firmowej.

### Page furniture

- Logo: sześciokąt SVG z zygzakiem sygnału, obok napisu „Hartwell Labs".
- Sidebar: grupy „Documentation", „Guides", „Products" — nagłówki 11.5px,
  wersaliki, \`letter-spacing: .08em\`, kolor \`--txt-3\`.
- Nagłówek: linki do firmowej strony (Products, Catalog, Security, Company),
  przycisk „AI" (\`llms.txt\`) i „GitHub ↗".
- Stopka: „© Hartwell Labs — independent engineering company, Szczecin, Poland".
- Bez JavaScriptu poza \`href\` — strona jest w pełni statyczna.
`;

const FOOTER = `<footer class="site">© Hartwell Labs — independent engineering company, Szczecin, Poland · <a href="https://hartwell-labs.pl">hartwell-labs.pl ↗</a></footer>`;

fs.rmSync(OUT, { recursive: true, force: true });
let count = 0;
const index = [];
for (const rel of pages) {
  const page = rel.replace(/\.md$/i, "");
  const key = page.toLowerCase();
  const pageDir = path.posix.dirname(key) === "." ? "" : path.posix.dirname(key);
  let md = fs.readFileSync(path.join(SRC, rel), "utf8");
  let title = TITLES[key] || cleanH1(md.match(/^#\s+(.+)$/m)?.[1] || page.split("/").pop());
  if (TITLES[key]) md = md.replace(/^#\s+.*$/m, "# " + TITLES[key]);
  const body = render(md, pageDir);
  const url = key === "home" ? "" : key + "/";
  const dest = path.join(OUT, url, "index.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  /* --- wersja .md tej strony (konwencja llmstxt.org) ---------------- */
  const mdUrl = url === "" ? "/index.md" : url.replace(/\/$/, "") + ".md";
  const clean = md.replace(/^#\s+.*$/m, "").trim();
  fs.writeFileSync(path.join(OUT, mdUrl),
    `---\ntitle: "${title}"\nurl: https://wiki.hartwell-labs.pl/${url}\nlang: en\n` +
    `last_built: ${new Date().toISOString().slice(0, 10)}\ngenerator: wiki-site/build.js\n---\n\n` +
    `# ${title}\n\n> Markdown twin of https://wiki.hartwell-labs.pl/${url} — pelna tresc\n` +
    `> oraz specyfikacja wygladu na koncu. Konwencja: https://llmstxt.org\n\n` +
    `${clean}\n${VISUAL(title)}`);

  index.push({ slug: page, title, url, mdUrl, md });
  fs.writeFileSync(dest, `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Hartwell Labs Docs</title>
<meta name="description" content="Hartwell Labs engineering documentation">
<meta name="theme-color" content="#4f46e5">
<link rel="alternate" type="text/markdown" href="${mdUrl}">
<link rel="icon" type="image/svg+xml" href="https://hartwell-labs.pl/assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${HEADER}
<div class="container layout">
<aside class="side">${SIDEBAR}</aside>
<main class="doc"><article class="md">${body}</article>${FOOTER}</main>
</div></body></html>`);
  count++;
}
/* --- llms.txt / llms-full.txt ---------------------------------------- */
const site = "https://wiki.hartwell-labs.pl";
const abs = (u) => site + "/" + String(u).replace(/^\//, "");
const group = (label, prefix) => {
  const rows = index.filter((p) => (prefix ? p.slug.startsWith(prefix) : !p.slug.includes("/")));
  if (!rows.length) return "";
  return `## ${label}\n\n` + rows
    .map((p) => `- [${p.title}](${abs(p.url)}): markdown → \`${abs(p.mdUrl)}\``)
    .join("\n") + "\n\n";
};
const llms = `# Hartwell Labs — Documentation

> Engineering documentation for the products we build and maintain: endpoint security
> (Rust + eBPF), post-quantum tooling, a self-hosted programming language and trusted
> compute. This wiki is the single source of truth for Hartwell Labs documentation —
> the company website links here instead of duplicating it.

Every page has a markdown twin — append \`.md\` to any URL, or use:
- \`${site}/llms-full.txt\` — the whole wiki in one file
- \`${site}/.well-known/llms.txt\` — the same index at the discovery path

Convention: https://llmstxt.org · built ${new Date().toISOString().slice(0, 10)}

` + group("Guides & site pages", "") + group("Products", "projects/");
fs.writeFileSync(path.join(OUT, "llms.txt"), llms);
fs.mkdirSync(path.join(OUT, ".well-known"), { recursive: true });
fs.writeFileSync(path.join(OUT, ".well-known", "llms.txt"), llms);
fs.writeFileSync(path.join(OUT, "llms-full.txt"),
  `# Hartwell Labs — Documentation (every page)\n\nGenerated ${new Date().toISOString().slice(0, 10)} · ${index.length} pages\n\n` +
  index.map((p) => `\n\n---\n\n# ${p.title}\n\n*${abs(p.url)}*\n\n${p.md.trim()}`).join(""));

fs.writeFileSync(path.join(OUT, "_headers"),
  "/*\n  Cache-Control: no-store\n\n/*.md\n  Content-Type: text/markdown; charset=utf-8\n\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n\n/llms-full.txt\n  Content-Type: text/plain; charset=utf-8\n");
fs.writeFileSync(path.join(OUT, "404.html"),
  `<!doctype html><meta charset="utf-8"><title>404 · Hartwell Labs Docs</title><body style="font-family:Inter,system-ui;background:#fff;color:#0f172a;padding:80px">
<div style="max-width:560px;margin:auto"><h1 style="letter-spacing:-.02em">404</h1><p style="color:#475569">This documentation page doesn't exist.</p><a href="/" style="color:#4f46e5;font-weight:600">← Back to documentation</a></div></body>`);
console.log("built", count, "pages ->", OUT);
