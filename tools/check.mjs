import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !/^(tools|\.git|\.github|css|js|assets)$/.test(e.name)) walk(full);
    else if (e.isFile() && e.name.endsWith(".html")) pages.push(full);
  }
};
walk(ROOT);

let issues = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  const dir = path.dirname(file);

  const leak = html.match(/\$\{[^}]*\}/g);
  if (leak) { console.log(`LEAKED VAR  ${rel}:`, leak.slice(0, 2)); issues++; }

  if (/[\u2014\u2013]/.test(html)) {
    // Data copy from the seeders legitimately contains dashes (e.g. "2022 — 2026");
    // only warn here. The template's hard ban applies to authored copy.
    console.log(`dash (warn) ${rel}`);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) { console.log(`DUP IDS     ${rel}: ${[...new Set(dup)].join(", ")}`); issues++; }

  const missingAnchors = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))]
    .filter((r) => !ids.includes(r));
  if (missingAnchors.length) { console.log(`BAD ANCHOR  ${rel}: ${missingAnchors.join(", ")}`); issues++; }

  const refs = [...html.matchAll(/(?:href|src)="(?!https?:|#|mailto:|data:|tel:)([^"]+)"/g)]
    .map((m) => m[1].split("#")[0])
    .filter((u) => u && !u.endsWith(".pdf"));
  for (const ref of refs) {
    if (!fs.existsSync(path.resolve(dir, ref))) {
      console.log(`BAD REF     ${rel}: ${ref}`);
      issues++;
    }
  }
}

console.log(issues ? `\n${issues} issue(s) found` : `\nALL CLEAN across ${pages.length} pages`);
process.exit(issues ? 1 : 0);
