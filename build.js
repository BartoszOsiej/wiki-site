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
  ["projects/aurora-os", "Aurora"],
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

/* Page metadata is collected before rendering so the sidebar can show every
   subpage and highlight the current one. */
const pageMeta = pages.map((rel) => {
  const page = rel.replace(/\.md$/i, "");
  const key = page.toLowerCase();
  const md = fs.readFileSync(path.join(SRC, rel), "utf8");
  const title = TITLES[key] || cleanH1(md.match(/^#\s+(.+)$/m)?.[1] || page.split("/").pop());
  return { rel, key, title };
});
const byKey = new Map(pageMeta.map((p) => [p.key, p]));

const NAV_LABELS = {
  api: "API reference",
  "user-guide": "User guide",
  fleet: "Fleet & licensing",
  tests: "Tests",
};
const NAV_ORDER = [
  "quickstart", "installation", "architecture", "configuration", "operations",
  "security", "licensing", "fleet", "api", "user-guide", "compiler", "syntax",
  "performance", "backend", "troubleshooting", "tests", "maturity",
];
const navLabel = (p) => {
  const tail = p.key.split("/").pop();
  return NAV_LABELS[tail] || tail.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};
const navRank = (p) => {
  const i = NAV_ORDER.indexOf(p.key.split("/").pop());
  return i === -1 ? NAV_ORDER.length : i;
};
const childrenOf = (root) =>
  pageMeta
    .filter((p) => p.key.startsWith(root + "/"))
    .sort((a, b) => navRank(a) - navRank(b) || a.key.localeCompare(b.key));

const linkAttrs = (key, current) =>
  key === current ? ' class="active" aria-current="page"' : "";

function buildSidebar(current) {
  const productItems = PRODUCTS.map(([root, label]) => {
    const kids = childrenOf(root);
    const inSection = current === root || current.startsWith(root + "/");
    const sub = kids.length
      ? `<ul class="nav-sub-list">${kids
          .map(
            (p) =>
              `<li><a href="/${p.key}/"${linkAttrs(p.key, current)}>${navLabel(p)}</a></li>`
          )
          .join("")}</ul>`
      : "";
    return `<li><details class="nav-sub"${inSection ? " open" : ""}>
<summary><a href="/${root}/"${linkAttrs(root, current)}>${label}</a></summary>${sub}
</details></li>`;
  }).join("");

  return `<nav class="side-nav" aria-label="Documentation">
<div class="side-head"><span>Documentation</span><label class="nav-close" for="nav-toggle" aria-label="Close menu">×</label></div>
<ul class="nav-list nav-top">
<li><a href="/"${linkAttrs("home", current)}>Overview</a></li>
<li><a href="/projects/"${linkAttrs("projects", current)}>All projects</a></li>
</ul>
<div class="nav-label">Products</div>
<ul class="nav-list">${productItems}</ul>
<div class="nav-label">Guides</div>
<ul class="nav-list">${GUIDE.map(
    ([s, t]) => `<li><a href="/${s}/"${linkAttrs(s, current)}>${t}</a></li>`
  ).join("")}</ul>
</nav>`;
}

const SECTION_NAMES = new Map([
  ["projects", "Projects"],
  ...PRODUCTS.map(([s, t]) => [s, t]),
  ...GUIDE.map(([s, t]) => [s, t]),
]);

function buildCrumbs(key) {
  if (key === "home") return "";
  const parts = key.split("/");
  const items = [`<a href="/">Docs</a>`];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc = acc ? acc + "/" + parts[i] : parts[i];
    const page = byKey.get(acc);
    const label = SECTION_NAMES.get(acc) || (page ? navLabel(page) : parts[i].replace(/-/g, " "));
    if (i === parts.length - 1) items.push(`<span aria-current="page">${label}</span>`);
    else items.push(`<a href="/${acc}/">${label}</a>`);
  }
  return `<nav class="crumbs" aria-label="Breadcrumb">${items.join(
    '<span class="crumb-sep">/</span>'
  )}</nav>`;
}

const HEX = `<svg width="22" height="22" viewBox="0 0 46 46" aria-hidden="true"><path d="M23,2 L42,13 L42,33 L23,44 L4,33 L4,13 Z" fill="none" stroke="#4f46e5" stroke-width="3.4" stroke-linejoin="round"/><polyline points="13,26 19,26 22,17 26,29 29,24 33,24" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CSS = `
:root{--bg:#fff;--bg-subtle:#f8fafc;--border:#e2e8f0;--txt:#0f172a;--txt-2:#475569;--txt-3:#94a3b8;--accent:#4f46e5;--accent-hover:#4338ca;--accent-soft:#eef2ff}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--txt);font-family:"Inter",-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.65}
body:has(#nav-toggle:checked){overflow:hidden}
.nav-toggle{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.container{max-width:1140px;margin:0 auto;padding:0 24px}
header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.header-in{display:flex;align-items:center;height:64px;gap:20px}
.logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px;text-decoration:none;color:var(--txt);flex:0 0 auto}
nav.main{display:flex;gap:24px;margin-left:auto}
nav.main a{font-size:14px;color:var(--txt-2);text-decoration:none;font-weight:500}
nav.main a:hover,nav.main a[aria-current]{color:var(--txt)}
.header-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.header-cta{display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:8px;background:var(--txt);color:#fff;font-size:13.5px;font-weight:600;text-decoration:none}
.header-cta:hover{background:#1e293b}
.nav-burger{display:none;align-items:center;justify-content:center;flex-direction:column;gap:4px;width:38px;height:38px;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--bg);cursor:pointer}
.nav-burger span{display:block;width:100%;height:2px;border-radius:2px;background:var(--txt)}
.layout{display:flex;align-items:flex-start;position:relative}
.side{width:286px;flex:0 0 286px;position:sticky;top:64px;height:calc(100vh - 64px);overflow-y:auto;overscroll-behavior:contain;padding:26px 20px 60px 0;border-right:1px solid var(--border);font-size:14px}
.side-head{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;padding:0 10px}
.side-head>span{font-size:11.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--txt-3);font-weight:700}
.nav-close{display:none;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);color:var(--txt-2);font-size:20px;line-height:1;cursor:pointer}
.nav-list{list-style:none;padding:0;margin:0}
.nav-list li{margin:1px 0}
.nav-list a{display:block;padding:6px 10px;border-radius:7px;color:var(--txt-2);text-decoration:none;line-height:1.4}
.nav-list a:hover{background:var(--bg-subtle);color:var(--txt)}
.nav-list a.active{background:var(--accent-soft);color:var(--accent);font-weight:600}
.nav-top{margin-bottom:6px}
.nav-label{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--txt-3);margin:20px 10px 6px;font-weight:700}
.nav-sub{margin:0}
.nav-sub>summary{list-style:none;display:flex;align-items:center;cursor:pointer;border-radius:7px}
.nav-sub>summary::-webkit-details-marker{display:none}
.nav-sub>summary::before{content:"";flex:0 0 auto;width:0;height:0;margin:0 7px 0 9px;border-top:4px solid transparent;border-bottom:4px solid transparent;border-left:5px solid var(--txt-3);transition:transform .15s ease}
.nav-sub[open]>summary::before{transform:rotate(90deg)}
.nav-sub>summary>a{flex:1;padding:6px 8px 6px 0}
.nav-sub>summary:hover{background:var(--bg-subtle)}
.nav-sub-list{margin:2px 0 8px 18px;padding-left:8px;border-left:1px solid var(--border)}
.nav-sub-list a{font-size:13.5px;padding:5px 9px}
.nav-overlay{display:none}
.doc{flex:1;min-width:0;padding:34px 0 60px 46px;max-width:840px}
.crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 18px;font-size:13px;color:var(--txt-3)}
.crumbs a{color:var(--txt-2);text-decoration:none}
.crumbs a:hover{color:var(--accent)}
.crumbs [aria-current]{color:var(--txt);font-weight:500}
.crumb-sep{color:var(--txt-3);opacity:.7}
.md{overflow-wrap:break-word}
.md h1{font-size:clamp(30px,4vw,40px);letter-spacing:-.02em;line-height:1.15;font-weight:700;margin:0 0 18px}
.md h2{font-size:22px;letter-spacing:-.01em;margin:2em 0 .5em;font-weight:700;padding-bottom:.25em;border-bottom:1px solid var(--border);scroll-margin-top:80px}
.md h3{font-size:17px;margin:1.6em 0 .4em;font-weight:600;scroll-margin-top:80px}
.md a{color:var(--accent);text-decoration:none}.md a:hover{text-decoration:underline}
.md img{max-width:100%;height:auto}.md p{margin:1em 0}
.md code{font-family:"JetBrains Mono",monospace;font-size:.87em;background:var(--bg-subtle);border:1px solid var(--border);border-radius:5px;padding:.1em .4em}
.md pre{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:16px 18px;overflow:auto;font-size:13.5px;line-height:1.6;-webkit-overflow-scrolling:touch}
.md pre code{background:none;border:0;color:inherit;padding:0;overflow-wrap:normal}
.table-wrap{max-width:100%;overflow-x:auto;margin:1.2em 0;border-radius:10px;-webkit-overflow-scrolling:touch}
.md table{border-collapse:collapse;width:100%;margin:0;font-size:14.5px}
.md th,.md td{border:1px solid var(--border);padding:8px 12px;text-align:left;vertical-align:top}
.md th{background:var(--bg-subtle);font-weight:600}
.md blockquote{border-left:3px solid var(--accent);background:var(--accent-soft);margin:1.2em 0;padding:.5em 1.1em;border-radius:0 8px 8px 0;color:var(--txt-2)}
.md hr{border:0;border-top:1px solid var(--border);margin:2em 0}
.md ul,.md ol{padding-left:1.3em}
footer.site{margin-top:56px;border-top:1px solid var(--border);padding-top:18px;color:var(--txt-3);font-size:13.5px}
footer.site a{color:var(--txt-2)}
.ai-link{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;border:1px solid var(--border);border-radius:7px;font:600 11.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.04em;color:var(--txt-2);text-decoration:none;text-transform:uppercase}
.ai-link:hover{color:var(--accent);border-color:var(--accent)}
a:focus-visible,summary:focus-visible,label:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
@media(max-width:900px){
 header .container{padding:0 16px}
 .header-in{height:58px;gap:10px}
 nav.main{display:none}
 .header-cta{display:none}
 .nav-burger{display:inline-flex}
 .header-actions{margin-left:auto}
 .layout{display:block}
 .side{position:fixed;top:0;left:0;bottom:0;width:min(86vw,330px);height:100dvh;z-index:120;background:var(--bg);border-right:1px solid var(--border);box-shadow:0 24px 70px rgba(15,23,42,.24);transform:translateX(-102%);transition:transform .22s ease;padding:18px 16px 44px;font-size:14.5px}
 #nav-toggle:checked ~ .layout .side{transform:none;box-shadow:0 0 0 100vmax rgba(15,23,42,.48),0 24px 70px rgba(15,23,42,.3)}
 .nav-overlay{display:block;position:fixed;inset:0;z-index:110;background:rgba(15,23,42,.48);opacity:0;pointer-events:none;transition:opacity .2s ease}
 #nav-toggle:checked ~ .nav-overlay{opacity:1;pointer-events:auto}
 .nav-close{display:flex}
 .side-head{margin-bottom:14px}
 .doc{padding:20px 0 44px;max-width:none}
 .crumbs{font-size:12.5px;margin-bottom:14px}
 .md h1{font-size:29px;line-height:1.2}
 .md h2{font-size:20px;margin-top:1.7em}
 .md h3{font-size:16.5px}
 .md pre{font-size:12.5px;padding:14px;border-radius:10px}
 .md table{font-size:13px}
 .md th,.md td{padding:7px 9px}
 footer.site{margin-top:40px}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
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
<span class="header-actions">
<a class="ai-link" href="/llms.txt" title="llms.txt — indeks wszystkich stron w markdownie">AI</a>
<a class="header-cta" href="https://github.com/Hartwell-Labs">GitHub ↗</a>
</span>
<label class="nav-burger" for="nav-toggle" aria-label="Open documentation menu"><span></span><span></span><span></span></label>
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
- Układ dwukolumnowy: sidebar **286px** (sticky, \`top:64px\`, \`height: calc(100vh - 64px)\`,
  własny scroll, prawa linia \`--border\`) + treść \`max-width: 840px\`, padding \`34px 0 60px 46px\`.
- Sidebar pokazuje wszystkie podstrony produktów w rozwijanych grupach (\`<details>\`);
  grupa aktywnego produktu jest otwarta, aktywna strona ma tło \`--accent-soft\`.
  Nad treścią znajduje się breadcrumb (\`Docs / Projects / Produkt / Strona\`).
- Breakpoint: \`max-width: 900px\` — sidebar staje się chowanym menu (drawer) otwieranym
  przyciskiem-hamburgerem (checkbox + label, bez JavaScriptu), z overlayem i przyciskiem
  zamykania. Nawigacja w nagłówku jest ukrywana, treść zajmuje pełną szerokość.
- Tabele są owinięte w \`.table-wrap\` z poziomym scrollem; na mobile komórki zawijają
  tekst, więc dwukolumnowe tabele mieszczą się bez przycinania. Bloki kodu i długie
  ścieżki nie rozpychają strony.
- Nagłówki w treści: H1 \`clamp(30px, 4vw, 40px)\`, \`letter-spacing: -.02em\`;
  H2 22px z dolną linią \`--border\`; H3 17px.
- Tabele: obramowania 1px, nagłówek na tle \`--bg-subtle\`.
- Blockquote: lewa krawędź 3px w kolorze akcentu, tło \`--accent-soft\`.
- Stopka: górna linia \`--border\`, \`--txt-3\`, link do strony firmowej.

### Page furniture

- Logo: sześciokąt SVG z zygzakiem sygnału, obok napisu „Hartwell Labs".
- Sidebar: grupy „Products" i „Guides" — nagłówki 11px, wersaliki,
  \`letter-spacing: .09em\`, kolor \`--txt-3\`; podstrony jako zagnieżdżona lista z linią
  \`--border\`, aktywna pozycja na tle \`--accent-soft\`.
- Nagłówek: linki do firmowej strony (Products, Catalog, Security, Company),
  przycisk „AI" (\`llms.txt\`) i „GitHub ↗".
- Stopka: „© Hartwell Labs — independent engineering company, Szczecin, Poland".
- Bez JavaScriptu poza \`href\` — strona jest w pełni statyczna.
`;

const FOOTER = `<footer class="site">© Hartwell Labs — independent engineering company, Szczecin, Poland · <a href="https://hartwell-labs.pl">hartwell-labs.pl ↗</a></footer>`;

/* Talus customer-facing docs are also reachable at the shorter /talus/* path so
   marketing links and the product page's "Documentation" button resolve there.
   These are soft redirects: a canonical link plus a zero-delay meta refresh —
   enough for crawlers, instant for humans, no JavaScript dependency. */
const TALUS_ALIASES = [
  ["talus/quickstart", "projects/talus-process-monitor/quickstart/"],
  ["talus/configuration", "projects/talus-process-monitor/configuration/"],
  ["talus/api", "projects/talus-process-monitor/api/"],
  ["talus/fleet", "projects/talus-process-monitor/fleet/"],
  ["talus/troubleshooting", "projects/talus-process-monitor/troubleshooting/"],
];
const ALIAS_HTML = (target) => { const href = "https://wiki.hartwell-labs.pl/" + target; return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index, follow">
<title>Talus — redirect</title>
<link rel="canonical" href="${href}">
<meta http-equiv="refresh" content="0; url=${href}">
</head><body>
<p>Redirecting… <a href="${href}">${href}</a></p>
</body></html>`; };

fs.rmSync(OUT, { recursive: true, force: true });
let count = 0;
const index = [];
for (const meta of pageMeta) {
  const { key, title } = meta;
  const pageDir = path.posix.dirname(key) === "." ? "" : path.posix.dirname(key);
  let md = fs.readFileSync(path.join(SRC, meta.rel), "utf8");
  if (TITLES[key]) md = md.replace(/^#\s+.*$/m, "# " + TITLES[key]);
  const body = render(md, pageDir).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  const sidebar = buildSidebar(key);
  const crumbs = buildCrumbs(key);
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

  index.push({ slug: meta.rel.replace(/\.md$/i, ""), title, url, mdUrl, md });
  const descPara = clean.split(/\n\n|\n(?=[A-Z\d#])/m).find((l) => { const t = l.trim(); return t && !t.startsWith("#"); }) || "";
  const description = descPara.replace(/^(```|\||>|-|\d+\.)\S*\s?/gm, "").replace(/[\n\r`]+/g, " ").trim().slice(0, 155) || "Hartwell Labs engineering documentation";
  fs.writeFileSync(dest, `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index, follow">
<title>${title} · Hartwell Labs Docs</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://wiki.hartwell-labs.pl/${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hartwell Labs">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="https://wiki.hartwell-labs.pl/${url}">
<meta property="og:image" content="https://hartwell-labs.pl/assets/og-cover.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="https://hartwell-labs.pl/assets/og-cover.png">
<meta name="theme-color" content="#4f46e5">
<link rel="alternate" type="text/markdown" href="${mdUrl}">
<link rel="icon" type="image/svg+xml" href="https://hartwell-labs.pl/assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true">
${HEADER}
<label class="nav-overlay" for="nav-toggle" aria-hidden="true"></label>
<div class="container layout">
<aside class="side">${sidebar}</aside>
<main class="doc">${crumbs}<article class="md">${body}</article>${FOOTER}</main>
</div></body></html>`);
  count++;
}

/* Talus short-path aliases (/talus/quickstart/… → /projects/talus-process-monitor/…) */
for (const [alias, target] of TALUS_ALIASES) {
  const d = path.join(OUT, alias);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), ALIAS_HTML(target.endsWith("/") ? target : target + "/"));
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
