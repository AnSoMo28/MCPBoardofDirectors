#!/usr/bin/env node
// scripts/bld4-chunk-edges.mjs — v1 (Bld4) · Aristas runtime entre chunks
//
// CONTEXTO: el build emite
//     Circular chunk: shared-ui -> advisor-engine -> shared-ui.
// El warning habla de CHUNKS (nombres salidos de manualChunks), no de
// módulos. La membresía real incluye módulos "plegados" por Rollup:
// p.ej. src/features/finance/types.ts vive DENTRO del chunk
// advisor-engine (verificado vía .map sources) sin que ningún archivo
// del directorio advisor-engine importe components/ui. Las aristas
// reales del ciclo solo se ven combinando membresía (sources) +
// imports (sourcesContent) + resolución de specs (relativas/aliases/
// barriles facade).
//
// QUÉ HACE:
//   1. Carga los .map de los chunks indicados (default: advisor-engine,
//      shared-ui) y lista la membresía EXACTA — marca infiltrados.
//   2. Parsea los imports de cada miembro (import type / { type A } /
//      valor / dinámico; comentarios descartados).
//   3. Resuelve cada spec contra el filesystem y SIGUE barriles
//      facade (export ... from) hasta el módulo final.
//   4. Reporta solo las aristas que CRUZAN chunks (archivo:linea +
//      sentencia exacta) y detecta el ciclo runtime si lo hay.
//
// USO (desde la raíz de la plataforma o del frontend):
//   node scripts/bld4-chunk-edges.mjs                    # advisor-engine vs shared-ui
//   node scripts/bld4-chunk-edges.mjs shared-ui index    # cualquier par de stems
//   node scripts/bld4-chunk-edges.mjs --members          # solo membresía
//
// Requiere dist/ fresco construido con --sourcemap.
// Cero dependencias · SOLO LECTURA · exit 0 (diagnóstico puro).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = "bld4-chunk-edges";
const VERSION = "1 (Bld4)";

// ── Raíz del frontend (cascada corta estilo bld1) ───────────────────────────
function findRoot() {
  const anchor = resolve(dirname(dirname(fileURLToPath(import.meta.url))));
  const candidates = [
    join(anchor, "frontend"),
    process.cwd(),
    join(process.cwd(), "frontend"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "src")) && existsSync(join(c, "package.json"))) return c;
  }
  for (const c of candidates) {
    if (existsSync(join(c, "src"))) return c;
  }
  console.error(`⛔ ${TOOL}: no encontré la raíz del frontend (dir con src/ + package.json).`);
  process.exit(2);
}

const ROOT = findRoot();
const ASSETS = join(ROOT, "dist", "assets");
if (!existsSync(ASSETS)) {
  console.error(`⛔ ${TOOL}: no existe dist/assets — construí primero (vite build --sourcemap).`);
  process.exit(2);
}

const argv = process.argv.slice(2);
const membersOnly = argv.includes("--members");
const stemsArg = argv.filter((a) => !a.startsWith("--"));
const CHUNKS = stemsArg.length ? stemsArg : ["advisor-engine", "shared-ui"];

// Hogar canónico de cada stem (para marcar infiltrados). Solo defaults.
const HOMES = {
  "advisor-engine": "src/shared/lib/advisor-engine/",
  "shared-ui": "src/shared/components/ui/",
};

const ALIASES = [
  ["@shared/", "src/shared/"],
  ["@features/", "src/features/"],
  ["@stores/", "src/stores/"],
  ["@app/", "src/app/"],
  ["@/", "src/"],
];

const ASSET_RE = /\.(css|scss|sass|less|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav)$/i;

const ROOT_NORM = ROOT.split("\\").join("/");
function relRoot(p) {
  const norm = p.split("\\").join("/");
  return norm.startsWith(ROOT_NORM + "/") ? norm.slice(ROOT_NORM.length + 1) : norm;
}

// ── Carga de chunks ─────────────────────────────────────────────────────────
function loadChunk(stem) {
  const maps = readdirSync(ASSETS).filter((f) => f.startsWith(stem + "-") && f.endsWith(".js.map"));
  if (maps.length === 0) {
    console.error(`⚠ no hay .map para el stem "${stem}" en dist/assets — se omite.`);
    return null;
  }
  if (maps.length > 1) {
    console.error(`⛔ ${maps.length} maps para "${stem}" (${maps.join(", ")}) — dist no está limpio. Rebuild.`);
    process.exit(2);
  }
  const m = JSON.parse(readFileSync(join(ASSETS, maps[0]), "utf8"));
  const members = new Map();
  let vendor = 0;
  let noContent = 0;
  const sources = Array.isArray(m.sources) ? m.sources : [];
  sources.forEach((s, i) => {
    if (typeof s !== "string") return;
    if (s.includes("node_modules")) { vendor++; return; }
    const abs = resolve(ASSETS, s);
    const content =
      Array.isArray(m.sourcesContent) && typeof m.sourcesContent[i] === "string"
        ? m.sourcesContent[i]
        : null;
    if (content === null) noContent++;
    members.set(abs, { rel: relRoot(abs), content });
  });
  return { stem, mapFile: maps[0], members, vendor, noContent, total: sources.length };
}

const chunks = CHUNKS.map(loadChunk).filter(Boolean);
if (chunks.length === 0) {
  console.error(`⛔ ${TOOL}: ningún chunk cargado.`);
  process.exit(2);
}
function ownerOf(absPath) {
  for (const c of chunks) if (c.members.has(absPath)) return c;
  return null;
}

// ── Membresía ───────────────────────────────────────────────────────────────
console.log(`${TOOL} v${VERSION} · raíz: ${relRoot(ROOT)} · dist/assets`);
for (const c of chunks) {
  const home = HOMES[c.stem];
  let outsiders = 0;
  console.log(`\nchunk ${c.stem} (${c.mapFile})`);
  console.log(`  fuentes src: ${c.members.size} · vendor: ${c.vendor} · sin sourcesContent: ${c.noContent} · total: ${c.total}`);
  for (const { rel } of [...c.members.values()].sort((a, b) => a.rel.localeCompare(b.rel))) {
    const infiltrado = home && !rel.startsWith(home);
    if (infiltrado) outsiders++;
    console.log(`  · ${rel}${infiltrado ? "   ← INFILTRADO" : ""}`);
  }
  if (outsiders > 0) console.log(`  ↑ infiltrados: ${outsiders}`);
}
if (membersOnly) process.exit(0);

// ── Parseo de imports ───────────────────────────────────────────────────────
const STMT_RE = /\b(?:import|export)\s+(type\s+)?([^;]*?)\s*from\s*(["'])([^"'\n]+?)\3/g;
const DYN_RE = /\bimport\s*\(\s*(["'])([^"'\n]+?)\1\s*\)/g;

function insideComment(text, matchStart) {
  const lineStart = text.lastIndexOf("\n", matchStart) + 1;
  const before = text.slice(lineStart, matchStart);
  if (before.includes("//")) return true;
  const open = text.lastIndexOf("/*", matchStart);
  if (open !== -1) {
    const close = text.lastIndexOf("*/", matchStart);
    if (close < open) return true;
  }
  return false;
}

function lineAt(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** "type" si TODOS los bindings son type-only; "valor" si hay alguno runtime. */
function stmtKind(typeKw, clause) {
  if (typeKw) return "type";
  const br = clause.match(/\{([^}]*)\}/);
  if (br) {
    const specs = br[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (specs.length > 0 && specs.every((s) => /^type\s+/.test(s))) return "type";
  }
  return "valor";
}

// ── Resolución de specs ─────────────────────────────────────────────────────
function probe(base) {
  const cands = [base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx"), base + ".js", base];
  for (const c of cands) {
    try {
      if (statSync(c).isFile()) return { kind: "code", path: c };
    } catch { /* no existe */ }
  }
  return { kind: "unresolved" };
}

function resolveSpec(spec, importerAbs) {
  const clean = spec.split("?")[0];
  if (ASSET_RE.test(clean)) return { kind: "asset" };
  if (clean.startsWith(".")) return probe(resolve(dirname(importerAbs), clean));
  for (const [prefix, rel] of ALIASES) {
    if (clean.startsWith(prefix)) return probe(join(ROOT, rel, clean.slice(prefix.length)));
  }
  return { kind: "bare" };
}

/** Exporta ... from de un módulo (barril facade) → specs resolvidas. */
function exportTargets(absPath, depth) {
  if (depth <= 0) return [];
  let text;
  try { text = readFileSync(absPath, "utf8"); } catch { return []; }
  const out = [];
  STMT_RE.lastIndex = 0;
  let m;
  while ((m = STMT_RE.exec(text)) !== null) {
    if (!m[0].startsWith("export")) continue;
    if (insideComment(text, m.index)) continue;
    if (/[()=]/.test(m[2])) continue;
    const r = resolveSpec(m[4], absPath);
    if (r.kind === "code") out.push(r.path);
  }
  return out;
}

/** Sigue facades hasta módulos finales con dueño. */
function resolveFinal(path, visited) {
  if (visited.has(path)) return [];
  visited.add(path);
  if (ownerOf(path)) return [path];
  return exportTargets(path, 3).flatMap((t) => resolveFinal(t, visited));
}

// ── Aristas entre chunks ────────────────────────────────────────────────────
const edges = [];
const dynEdges = [];
for (const c of chunks) {
  for (const [abs, { rel, content }] of c.members) {
    if (!content) continue;
    const text = content.replace(/^\uFEFF/, "");
    STMT_RE.lastIndex = 0;
    let m;
    while ((m = STMT_RE.exec(text)) !== null) {
      if (insideComment(text, m.index)) continue;
      if (/[()=]/.test(m[2])) continue;
      const spec = m[4];
      const kind = stmtKind(m[1], m[2]);
      const r = resolveSpec(spec, abs);
      if (r.kind !== "code") continue;
      const finals = resolveFinal(r.path, new Set());
      const owners = new Map();
      for (const f of finals) {
        const own = ownerOf(f);
        if (!own || own.stem === c.stem) continue;
        if (!owners.has(own.stem)) owners.set(own.stem, []);
        owners.get(own.stem).push(relRoot(f));
      }
      for (const [toStem, targets] of owners) {
        edges.push({
          from: c.stem, to: toStem, rel, line: lineAt(text, m.index), spec, kind,
          targets: [...new Set(targets)],
          viaBarril: !ownerOf(r.path),
        });
      }
    }
    DYN_RE.lastIndex = 0;
    let d;
    while ((d = DYN_RE.exec(text)) !== null) {
      if (insideComment(text, d.index)) continue;
      const r = resolveSpec(d[2], abs);
      if (r.kind !== "code") continue;
      for (const f of resolveFinal(r.path, new Set())) {
        const own = ownerOf(f);
        if (own && own.stem !== c.stem) {
          dynEdges.push({ from: c.stem, to: own.stem, rel, line: lineAt(text, d.index), spec: d[2] });
        }
      }
    }
  }
}

edges.sort((a, b) => a.from.localeCompare(b.from) || a.rel.localeCompare(b.rel) || a.line - b.line);
const runtime = edges.filter((e) => e.kind === "valor");
const typeOnly = edges.filter((e) => e.kind === "type");

console.log(`\n${"═".repeat(72)}`);
console.log(`ARISTAS RUNTIME (crean dependencia estática entre chunks): ${runtime.length}`);
for (const e of runtime) {
  console.log(`\n  ${e.from} → ${e.to}`);
  console.log(`    ${e.rel}:${e.line} · ${e.spec}`);
  console.log(`    → ${e.targets.join(", ")}${e.viaBarril ? "  (vía barril facade)" : ""}`);
}
if (typeOnly.length > 0) {
  console.log(`\nARISTAS type-only (elididas en build — NO crean dependencia): ${typeOnly.length}`);
  for (const e of typeOnly.slice(0, 15)) {
    console.log(`  ${e.from} → ${e.to} · ${e.rel}:${e.line} · ${e.spec}`);
  }
  if (typeOnly.length > 15) console.log(`  … +${typeOnly.length - 15} más`);
}
if (dynEdges.length > 0) {
  console.log(`\nIMPORTS DINÁMICOS cruzando chunks (informativo): ${dynEdges.length}`);
  for (const e of dynEdges.slice(0, 15)) {
    console.log(`  ${e.from} → ${e.to} · ${e.rel}:${e.line} · ${e.spec}`);
  }
  if (dynEdges.length > 15) console.log(`  … +${dynEdges.length - 15} más`);
}

// ── Ciclo ───────────────────────────────────────────────────────────────────
const graph = new Map();
for (const e of runtime) {
  if (!graph.has(e.from)) graph.set(e.from, new Set());
  graph.get(e.from).add(e.to);
}
const cycles = [];
function dfs(node, stack) {
  if (stack.includes(node)) {
    cycles.push([...stack.slice(stack.indexOf(node)), node].join(" → "));
    return;
  }
  if (stack.length > chunks.length) return;
  stack.push(node);
  for (const next of graph.get(node) ?? []) dfs(next, stack);
  stack.pop();
}
for (const stem of graph.keys()) dfs(stem, []);

console.log(`\n${"═".repeat(72)}`);
if (cycles.length > 0) {
  console.log(`⛔ CICLO RUNTIME CONFIRMADO:`);
  for (const cy of [...new Set(cycles)]) console.log(`   ${cy}`);
} else {
  console.log(`✓ sin ciclo runtime entre los chunks analizados`);
}