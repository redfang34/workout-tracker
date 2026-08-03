import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs";

const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  target: ["es2019"],
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
});
// Guard against the one sequence that would break inline embedding.
const js = result.outputFiles[0].text.replace(/<\/script>/gi, "<\\/script>");

let css = readFileSync("src/styles.css", "utf8");
if (existsSync("src/font.css")) css = readFileSync("src/font.css", "utf8") + "\n" + css;

const tpl = readFileSync("src/template.html", "utf8");
const page = tpl.replace("/*CSS*/", () => css).replace("/*JS*/", () => js);

mkdirSync("docs", { recursive: true });
writeFileSync("docs/index.html", page);
for (const f of ["manifest.webmanifest", "sw.js", "icon-192.png", "icon-512.png", "icon-180.png"]) {
  copyFileSync(`public/${f}`, `docs/${f}`);
}

// Artifact variant: page content only (host wraps it in doctype/head/body).
const art = `<title>6-Week Strength</title>\n<style>${css}</style>\n<div id="root"></div>\n<script>${js}</script>`;
mkdirSync("artifact", { recursive: true });
writeFileSync("artifact/workout-tracker.html", art);

console.log(`built docs/index.html (${(page.length / 1024).toFixed(0)} KB) + artifact variant`);
