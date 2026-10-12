import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] || "/tmp/opencode/wiki";
const OUT = path.resolve("./dist");

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
  let h = href.replace(/\.md$/i, "").replace(/^\/docs\//, "/").replace(/^docs\//, "");
  if (h === "Home" || h === "home" || h === "") return "/";
  if (h.startsWith("/")) return h.endsWith("/") ? h : h + "/";
  let joined = path.posix.normalize(path.posix.join(pageDir, h)).toLowerCase().replace(/\/$/, "");
  return "/" + joined + "/";
}

const pages = walk(SRC).filter((p) => !path.basename(p).startsWith("_"));

let currentDir = "";
marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    link(token) {
      let href = token.href;
      const t = normTarget(href, currentDir);
      if (t) href = t;
      const inner = this.parser.parseInline(token.tokens);
      return `<a href="${href}">${inner}</a>`;
    },
  },
});

function render(md, pageDir) {
  currentDir = pageDir;
  return marked.parse(md);
}

const sidebarMd = fs.existsSync(path.join(SRC, "_Sidebar.md"))
  ? fs.readFileSync(path.join(SRC, "_Sidebar.md"), "utf8")
  : "";
const sidebar = render(sidebarMd, "");

fs.rmSync(OUT, { recursive: true, force: true });
let count = 0;
for (const rel of pages) {
  const page = rel.replace(/\.md$/i, "");
  const pageDir = path.posix.dirname(page) === "." ? "" : path.posix.dirname(page).toLowerCase();
  const md = fs.readFileSync(path.join(SRC, rel), "utf8");
  const title = (md.match(/^#\s+(.+)$/m)?.[1] || page.split("/").pop()).replace(/[*_`]/g, "");
  const body = render(md, pageDir);
  const url = page.toLowerCase() === "home" ? "" : page.toLowerCase() + "/";
  const dest = path.join(OUT, url, "index.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Hartwell Labs Docs</title>
<meta name="description" content="Hartwell Labs engineering documentation">
<link rel="preconnect" href="https://fonts.googleapis.com">
<style>
:root{--bg:#0b0e14;--panel:#111722;--bd:#1e2836;--fg:#d7dee8;--mut:#8896aa;--acc:#f5a623;--acc2:#3da9fc}
*{box-sizing:border-box}body{margin:0;font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--fg)}
a{color:var(--acc2);text-decoration:none}a:hover{text-decoration:underline}
.wrap{display:flex;min-height:100vh}
aside{width:280px;flex:0 0 280px;background:var(--panel);border-right:1px solid var(--bd);padding:22px 18px;position:sticky;top:0;height:100vh;overflow:auto}
aside h2{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin:0 0 12px}
aside h3{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin:22px 0 8px}
aside ul{list-style:none;padding:0;margin:0}aside li{margin:3px 0}
aside a{color:var(--fg);font-size:.9rem}
main{flex:1;min-width:0;padding:38px 54px;max-width:980px}
header.top{display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--bd);padding-bottom:14px;margin-bottom:26px}
header.top .brand{font-weight:700;color:var(--acc)}
header.top a.home{color:var(--mut);font-size:.9rem;margin-left:auto}
.md h1{font-size:1.9rem;border-bottom:1px solid var(--bd);padding-bottom:.3em}
.md h2{font-size:1.4rem;margin-top:1.6em}.md h3{font-size:1.15rem}
.md img{max-width:100%}.md code{background:#0b1220;border:1px solid var(--bd);border-radius:5px;padding:.1em .4em;font-size:.88em}
.md pre{background:#0b1220;border:1px solid var(--bd);border-radius:10px;padding:14px;overflow:auto}
.md pre code{border:0;background:none;padding:0}
.md table{border-collapse:collapse;width:100%;margin:1em 0}.md th,.md td{border:1px solid var(--bd);padding:8px 11px}
.md th{background:var(--panel)}.md blockquote{border-left:3px solid var(--acc);margin:1em 0;padding:.2em 1em;color:var(--mut);background:var(--panel);border-radius:0 8px 8px 0}
.md hr{border:0;border-top:1px solid var(--bd);margin:2em 0}
footer{margin-top:44px;padding-top:16px;border-top:1px solid var(--bd);color:var(--mut);font-size:.85rem}
@media(max-width:820px){.wrap{flex-direction:column}aside{position:relative;height:auto;width:100%;flex:none}main{padding:22px}}
</style></head><body><div class="wrap">
<aside><h2>Hartwell Labs Docs</h2>${sidebar}</aside>
<main><header class="top"><span class="brand">◈ Hartwell Labs</span><a class="home" href="https://hartwell-labs.pl">hartwell-labs.pl ↗</a></header>
<article class="md">${body}</article>
<footer>Rendered from the <a href="https://github.com/BartoszOsiej/BartoszOsiej/wiki">BartoszOsiej wiki</a> · served on <code>wiki.hartwell-labs.pl</code></footer>
</main></div></body></html>`;
  fs.writeFileSync(dest, html);
  count++;
}
// 404
fs.writeFileSync(path.join(OUT, "404.html"),
  `<!doctype html><meta charset="utf-8"><title>404</title><body style="background:#0b0e14;color:#d7dee8;font:16px system-ui;padding:60px"><h1>404</h1><p>This docs page doesn't exist. <a style="color:#3da9fc" href="/">Back to docs</a></p>`);
console.log("built", count, "pages ->", OUT);
