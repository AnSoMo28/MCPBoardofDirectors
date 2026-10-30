#!/usr/bin/env node
// scripts/bld6-cross-edges.mjs — v1 (Bld6) · Aristas reales entre dos chunks
//
// CONTEXTO: tras la fase2 queda "Circular chunk: shared-ui -> shared-lib
// -> shared-ui". Los greps de src NO alcanzan a ver el portador: puede ser
// (a) un módulo src plegado por comunidad en el chunk equivocado o
// (b) un módulo VENDOR sin regla (lucide-react…) particionado entre
// chunks. bld6 combina membresía (.map sources) + contenido
// (sourcesContent) + resolución (relativas/aliases/barriles/vendor) y
// lista las aristas file:line en AMBAS direcciones.
//
// Uso (raíz de la plataforma o frontend/ — SIN redirect):
//   node scripts/bld6-cross-edges.mjs                     # shared-lib ↔ shared-ui
//   node scripts/bld6-cross-edges.mjs advisor-engine shared-ui
//
// Solo lectura · salida corta · exit 0.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [stemA = "shared-lib", stemB = "shared-ui"] = process.argv.slice(2);

const ANCHOR = resolve(dirname(dirname(fileURLToPath(import.meta.url))));
const ROOT = [join(ANCHOR, "frontend"), process.cwd(), join(process.cwd(), "frontend")]
  .find((d) => existsSync(join(d, "src")) && existsSync(join(d, "package.json")));
if (!ROOT) { console.error("⛔ bld6: raíz del frontend no encontrada (dir con src/)."); process.exit(2); }
const ASSETS = join(ROOT, "dist", "assets");
if (!existsSync(ASSETS)) { console.error("⛔ bld6: no existe dist/assets — rebuild con --sourcemap."); process.exit(2); }

function loadMap(stem) {
  const files = readdirSync(ASSETS).filter((f) => f.startsWith(stem + "-") && f.endsWith(".js.map"));
  if (files.length !== 1) { console.error(`⛔ bld6: ${files.length} maps para "${stem}" — ¿dist limpio?`); process.exit(2); }
  const m = JSON.parse(readFileSync(join(ASSETS, files[0]), "utf8"));
  const src = new Map();
  const contents = new Map();
  const vendorPkgs = new Map();
  (m.sources ?? []).forEach((s, i) => {
    if (typeof s !== "string") return;
    const abs = resolve(ASSETS, s).split("\\").join("/");
    if (s.includes("node_modules")) {
      let pkg = "?";
      for (const mm of abs.matchAll(/\/node_modules\/((?:@[^/]+\/)?[^/@.]+)\//g)) pkg = mm[1];
      vendorPkgs.set(pkg, (vendorPkgs.get(pkg) ?? 0) + 1);
      return;
    }
    src.set(abs, s.replace(/^(\.\.\/)+/, ""));
    if (typeof m.sourcesContent?.[i] === "string") contents.set(abs, m.sourcesContent[i]);
  });
  return { stem, src, contents, vendorPkgs };
}

const A = loadMap(stemA);
const B = loadMap(stemB);
const vA = [...A.vendorPkgs.values()].reduce((a, b) => a + b, 0);
const vB = [...B.vendorPkgs.values()].reduce((a, b) => a + b, 0);
console.log(`bld6 v1 · ${stemA} (${A.src.size} src · ${vA} vendor) ↔ ${stemB} (${B.src.size} src · ${vB} vendor)`);

// ── Infiltrados (módulos fuera de su hogar canónico) ────────────────────────
const HOMES = {
  "shared-lib": /^src\/shared\/(lib|types|mocks)\//,
  "shared-ui": /^src\/shared\/components\/ui\//,
  "advisor-engine": /^src\/shared\/lib\/advisor-engine\//,
};
for (const c of [A, B]) {
  const home = HOMES[c.stem];
  if (!home) continue;
  const inf = [...c.src.values()].filter((r) => !home.test(r));
  if (inf.length === 0) continue;
  console.log(`\n· infiltrados en ${c.stem}: ${inf.length}`);
  for (const r of inf.slice(0, 15)) console.log(`    · ${r}`);
  if (inf.length > 15) console.log(`    … +${inf.length - 15} más`);
}

// ── Resolución ───────────────────────────────────────────────────────────────
const ALIASES = [["@shared/", "src/shared/"], ["@features/", "src/features/"], ["@stores/", "src/stores/"], ["@app/", "src/app/"], ["@/", "src/"]];
const ASSET_RE = /\.(css|scss|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav)(\?|$)/i;

function probe(base) {
  for (const c of [base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")]) {
    try { if (statSync(c).isFile()) return c.split("\\").join("/"); } catch {}
  }
  return null;
}
function resolveSpec(spec, importerAbs) {
  const clean = spec.split("?")[0];
  if (!clean || ASSET_RE.test(clean)) return { kind: "skip" };
  if (clean.startsWith(".")) {
    const p = probe(resolve(dirname(importerAbs), clean).split("\\").join("/"));
    return p ? { kind: "src", path: p } : { kind: "unres" };
  }
  for (const [pre, rel] of ALIASES) {
    if (clean.startsWith(pre)) {
      const p = probe(join(ROOT, rel, clean.slice(pre.length)).split("\\").join("/"));
      return p ? { kind: "src", path: p } : { kind: "unres" };
    }
  }
  return { kind: "vendor", pkg: clean };
}
function pkgOf(spec) {
  const parts = spec.split("/");
  return parts[0].startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/** Sigue facades (export…from) desde path hasta miembros del chunk destino. */
function reachableIn(path, target, other) {
  const out = new Set();
  const seen = new Set();
  const stack = [path];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (target.src.has(cur)) { out.add(cur); continue; }
    if (other.src.has(cur)) continue;
    let text = target.contents.get(cur) ?? other.contents.get(cur) ?? null;
    if (text === null) { try { text = readFileSync(cur, "utf8"); } catch { continue; } }
    const re = /(?:^|\n)[ \t]*export\s+(?:type\s+)?[^;]*?from\s+["']([^"'\n]+)["']/g;
    let mm;
    while ((mm = re.exec(text)) !== null) {
      const r = resolveSpec(mm[1], cur);
      if (r.kind === "src") stack.push(r.path);
    }
  }
  return [...out];
}

// ── Escaneo de aristas ───────────────────────────────────────────────────────
function scanEdges(from, to) {
  const edges = [];
  for (const [abs, rel] of from.src) {
    const text = (from.contents.get(abs) ?? "").replace(/^\uFEFF/, "");
    if (!text) continue;
    const re = /(?:^|\n)[ \t]*(?:import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"'\n]+)["']/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const typeKw = m[1], clause = m[2], spec = m[3];
      let valor = !typeKw;
      if (valor) {
        const br = clause.match(/\{([^}]*)\}/);
        if (br) {
          const specs = br[1].split(",").map((s) => s.trim()).filter(Boolean);
          if (specs.length > 0 && specs.every((s) => /^type\s+/.test(s))) valor = false;
        }
      }
      const r = resolveSpec(spec, abs);
      if (r.kind === "skip" || r.kind === "unres") continue;
      let targets = [];
      let via = "";
      if (r.kind === "src") {
        const t = reachableIn(r.path, to, from);
        if (t.length === 0) continue;
        targets = t.map((p) => to.src.get(p));
        via = to.src.has(r.path) ? "" : "  (vía barril)";
      } else {
        const pkg = pkgOf(spec);
        if (!to.vendorPkgs.has(pkg)) continue;
        targets = [`vendor:${pkg} (${to.vendorPkgs.get(pkg)} módulos en ${to.stem})`];
        via = from.vendorPkgs.has(pkg) ? "  (¡paquete particionado en AMBOS chunks!)" : "  (vendor solo en destino)";
      }
      let line = 1;
      for (let i = 0; i < m.index; i++) if (text.charCodeAt(i) === 10) line++;
      edges.push({ rel, line, spec, valor, targets, via });
    }
  }
  return edges;
}

function report(from, to) {
  const edges = scanEdges(from, to);
  const valor = edges.filter((e) => e.valor);
  const tipo = edges.filter((e) => !e.valor);
  console.log(`\n── ${from.stem} → ${to.stem} · aristas: ${edges.length} (VALOR ${valor.length} · type-only ${tipo.length}) ──`);
  for (const e of valor.slice(0, 14)) {
    console.log(`  VALOR ${e.rel}:${e.line}  "${e.spec}"${e.via}`);
    console.log(`        → ${e.targets.join(", ")}`);
  }
  if (valor.length > 14) console.log(`  … +${valor.length - 14} VALOR más`);
  if (valor.length === 0 && tipo.length > 0) {
    for (const e of tipo.slice(0, 5)) console.log(`  type  ${e.rel}:${e.line}  "${e.spec}" → ${e.targets.join(", ")}`);
  }
  return valor;
}

const ab = report(A, B);
const ba = report(B, A);
console.log(`\n${"═".repeat(60)}`);
if (ab.length > 0 && ba.length > 0) console.log(`⛔ CICLO ${A.stem} ↔ ${B.stem}: aristas de VALOR en ambas direcciones`);
else if (ab.length > 0) console.log(`✓ ${A.stem} → ${B.stem} unidireccional — sin ciclo entre estos dos`);
else if (ba.length > 0) console.log(`✓ ${B.stem} → ${A.stem} unidireccional — sin ciclo entre estos dos`);
else console.log(`✓ sin aristas de valor entre ${A.stem} y ${B.stem}`);