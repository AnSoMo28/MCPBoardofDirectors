#!/usr/bin/env node
// scripts/bld1-scan-asset-imports.mjs — v1 (Bld1) · Escáner de resolución de
// imports de ASSETS (css/scss/svg/img/fuentes/video) contra el filesystem.
//
// LA FAMILIA Bld: el bundler (rollup/vite) muere en empaquetado con
//   [vite] Rollup failed to resolve import "../../ml/ml-glass.css"
// PERO tsc NUNCA lo ve — los imports de assets caen en módulos ambient
// (`declare module "*.css"`) y el compilador no resuelve rutas de assets.
// G28→G37 dejó el type-check en 0 errores y AÚN ASÍ el build está rojo:
// este escáner cierra exactamente ese hueco de verificación.
//
// Además clasifica cada import como SIDE-EFFECT (`import "./x.css"`) o
// BINDING (`import x from "./x.css"`) — los side-effect son INVISIBLES
// para el grafo H-06 del guardian (parseImports solo extrae `from "spec"`),
// así que el inventario de este escáner es también el complemento del
// mapa de dependencias del guardian.
//
// RESOLUCIÓN (réplica de la semántica del bundler, best-effort documentado):
//   - "./x.css" | "../x.css"  → relativa al directorio del archivo importador
//   - "@/x.css", "@features/…", "@shared/…", "@stores/…", "@app/…
//     → aliases: se leen de tsconfig*.json (compilerOptions.paths) del
//       frontend; fallback canónico por directorio existente si no hay
//       paths declarados. Un spec resuelve por CUALQUIER candidato vivo.
//   - bare ("paquete/x.css") → node_modules del frontend (best-effort:
//     si no se certifica ni ahí, se reporta BARE como hallazgo separado,
//     no BROKEN — los plugins de vite pueden inyectar virtuales).
//   - sufijos de query ("./x.svg?url", "?raw", "?inline") se descartan
//     ANTES de resolver (vite los admite).
//
// Para cada BROKEN el reporte incluye el basename-búsqueda: si un archivo
// con el mismo nombre existe en otra parte de src/, se lista como candidato
// de re-punto (rama B del árbol de decisión Bld1), lo que reduce el fix a
// elegir entre: (A) corregir profundidad · (B) re-apuntar · (C) eliminar
// import si nunca existió (documentarlo como territorio no registrado) ·
// (D) restaurar de git history si existió.
//
// Uso (desde DONDE SEA — cascada de raíz idéntica a g14 v3 + un fallback):
//   node scripts/bld1-scan-asset-imports.mjs              # diagnóstico
//   node scripts/bld1-scan-asset-imports.mjs --json       # salida JSON
//   node scripts/bld1-scan-asset-imports.mjs --root frontend
//   node scripts/bld1-scan-asset-imports.mjs --ext css,svg   # limitar familias
//
// Cero dependencias · Node >= 20 · SOLO LECTURA (jamás muta archivos).
// exit 0 = todos resuelven · exit 1 = hay BROKEN · exit 2 = error de herramienta.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = "bld1-scan-asset-imports";
const VERSION = "1 (Bld1)";

const ASSET_EXTS = new Set([
  ".css", ".scss", ".sass", ".less",
  ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".mp4", ".webm", ".mp3", ".wav",
]);
const CODE_EXTS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", ".git", ".next"]);

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const jsonMode = argv.includes("--json");
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`Uso:
  node scripts/${TOOL}.mjs                # diagnóstico (texto)
  node scripts/${TOOL}.mjs --json         # salida JSON (autoritativa)
  node scripts/${TOOL}.mjs --root <ruta>  # raíz del frontend explícita
  node scripts/${TOOL}.mjs --ext css,svg  # limitar extensiones escaneadas
Opciones: --json · --root <ruta> · --ext <lista> · --help`);
  process.exit(0);
}
const rootFlagIdx = argv.indexOf("--root");
const rootValue = rootFlagIdx === -1 ? null : argv[rootFlagIdx + 1];
if (rootFlagIdx !== -1 && (!rootValue || rootValue.startsWith("--"))) {
  console.error("⛔ --root necesita la ruta de la raíz del frontend: --root <ruta>");
  console.error("   La raíz es la carpeta que CONTIENE src/ (p. ej. --root frontend).");
  process.exit(2);
}
const rootValueIdx = rootFlagIdx === -1 ? -1 : rootFlagIdx + 1;
const positional = argv.find((a, i) => !a.startsWith("--") && i !== rootValueIdx) ?? null;

const extFilterIdx = argv.indexOf("--ext");
let extFilter = null;
if (extFilterIdx !== -1) {
  const raw = argv[extFilterIdx + 1];
  if (!raw || raw.startsWith("--")) {
    console.error("⛔ --ext necesita una lista de extensiones: --ext css,svg");
    process.exit(2);
  }
  extFilter = new Set(
    raw.split(",").map((e) => (e.startsWith(".") ? e.toLowerCase() : "." + e.toLowerCase())),
  );
}

// ── Resolución de la raíz del frontend (cascada g14 v3 + fallback por ancla) ──
function hasSrc(dir) {
  return existsSync(join(dir, "src"));
}
function isFrontendRoot(dir) {
  return hasSrc(dir) && existsSync(join(dir, "package.json"));
}

function resolveFrontendRoot() {
  const tried = [];
  // 1. argumento posicional (compatibilidad con la familia)
  if (positional) {
    tried.push(`argumento posicional → ${positional}`);
    if (isFrontendRoot(positional)) return { root: resolve(positional), how: "argumento posicional" };
    if (hasSrc(positional)) return { root: resolve(positional), how: "argumento posicional (sin package.json — aceptado)" };
  }
  // 2. --root explícito (gana a toda heurística; fail-closed SIN fallback
  //    silencioso — lección G25: la intención explícita no se reinterpreta)
  if (rootValue) {
    if (!hasSrc(rootValue)) {
      console.error(`⛔ --root "${rootValue}" no contiene src/ — pasa la RAÍZ del frontend (la carpeta padre de src/).`);
      process.exit(2);
    }
    return { root: resolve(rootValue), how: `--root ${rootValue}` };
  }
  // 3. anclaje al script: <dir-del-script>/.. (layout del paquete de transporte)
  const scriptAnchor = dirname(dirname(fileURLToPath(import.meta.url)));
  tried.push(`scripts/.. → ${scriptAnchor}`);
  if (hasSrc(scriptAnchor)) return { root: scriptAnchor, how: "anclaje al script (scripts/..)" };
  // 4. directorio actual
  tried.push(`directorio actual → ${process.cwd()}`);
  if (hasSrc(process.cwd())) return { root: process.cwd(), how: "directorio actual" };
  // 5. monorepo: ./frontend desde el CWD
  const monoCwd = join(process.cwd(), "frontend");
  tried.push(`./frontend → ${monoCwd}`);
  if (isFrontendRoot(monoCwd)) return { root: monoCwd, how: "monorepo detectado (./frontend)" };
  // 6. monorepo por ancla del script: scripts/../frontend (correr desde scripts/ u otro lado)
  const monoAnchor = join(scriptAnchor, "frontend");
  if (monoAnchor !== monoCwd) tried.push(`scripts/../frontend → ${monoAnchor}`);
  if (isFrontendRoot(monoAnchor)) return { root: monoAnchor, how: "monorepo por ancla del script (scripts/../frontend)" };

  console.error("⛔ No pude resolver la raíz del frontend (directorio con src/).");
  console.error("Probado, en orden:");
  for (const t of tried) console.error(`  · ${t}`);
  console.error("\nCorre desde la raíz del frontend o pásala explícita:");
  console.error(`  node scripts/${TOOL}.mjs --root <ruta-del-frontend>`);
  process.exit(2);
}

const { root, how } = resolveFrontendRoot();
const srcDir = join(root, "src");

// ── Aliases: tsconfig*.json compilerOptions.paths + fallback canónico ──────
function loadAliases() {
  const aliases = []; // {prefix, targetAbs}
  let declared = false;
  let tsconfigRead = [];
  try {
    tsconfigRead = readdirSync(root).filter((f) => /^tsconfig[^.]*\.json$/i.test(f));
  } catch {
    tsconfigRead = [];
  }
  for (const f of tsconfigRead) {
    try {
      const raw = readFileSync(join(root, f), "utf8").replace(/^\uFEFF/, "");
      // JSON con comentarios/comas colgantes: strip conservador línea a línea
      const cleaned = raw
        .split("\n")
        .map((l) => l.replace(/\/\/.*$/, ""))
        .join("\n")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      const cfg = JSON.parse(cleaned);
      const paths = cfg?.compilerOptions?.paths ?? {};
      for (const [key, targets] of Object.entries(paths)) {
        if (!Array.isArray(targets) || targets.length === 0) continue;
        declared = true;
        const prefix = key.endsWith("/*") ? key.slice(0, -1) : key; // "@/*" → "@/"
        for (const t of targets) {
          const norm = t.endsWith("/*") ? t.slice(0, -1) : t; // "./src/*" → "./src/"
          aliases.push({ prefix, targetAbs: join(root, norm), from: f });
        }
      }
    } catch {
      // tsconfig ilegible → el fallback canónico cubre
    }
  }
  if (!declared) {
    // Fallback canónico — solo directorios que EXISTEN en este frontend
    const canonical = [
      ["@/", "src/"], ["@shared/", "src/shared/"], ["@features/", "src/features/"],
      ["@stores/", "src/stores/"], ["@app/", "src/app/"], ["@hooks/", "src/hooks/"],
    ];
    for (const [prefix, rel] of canonical) {
      if (existsSync(join(root, rel))) aliases.push({ prefix, targetAbs: join(root, rel), from: "fallback canónico" });
    }
  }
  // prefix más largo primero ("@shared/" antes que "@/")
  aliases.sort((a, b) => b.prefix.length - a.prefix.length);
  return aliases;
}
const ALIASES = loadAliases();

// ── Caminata del árbol src ──────────────────────────────────────────────────
function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

const codeFiles = [];
for (const p of walk(srcDir)) {
  if (CODE_EXTS.has(extname(p).toLowerCase())) codeFiles.push(p);
}

// Índice de assets por basename (para sugerencias de re-punto — rama B)
const assetByBasename = new Map();
for (const p of walk(srcDir)) {
  const ext = extname(p).toLowerCase();
  if (ASSET_EXTS.has(ext)) {
    const b = basename(p).toLowerCase();
    if (!assetByBasename.has(b)) assetByBasename.set(b, []);
    assetByBasename.get(b).push(p);
  }
}

// ── Extracción de imports de assets ────────────────────────────────────────
// Cubre: import "x" · import("x") · from "x" · require("x") · export…from "x"
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(["'])([^"'\n]+?)\1/g;

function stripQuery(spec) {
  const i = spec.indexOf("?");
  return i === -1 ? { spec, query: null } : { spec: spec.slice(0, i), query: spec.slice(i + 1) };
}

function assetExtOf(spec) {
  const clean = stripQuery(spec).spec.toLowerCase();
  const e = extname(clean);
  return ASSET_EXTS.has(e) ? e : null;
}

/** ¿El match está dentro de un comentario? (línea + bloque — best-effort) */
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

function relRoot(p) {
  return p.startsWith(root + "/") || p.startsWith(root + "\\")
    ? p.slice(root.length + 1).split("\\").join("/")
    : p.split("\\").join("/");
}

/** Clasifica SIDE-EFFECT vs BINDING a partir del texto matcheado + contexto previo. */
function classifyKind(matchText, text, matchStart) {
  // m[0] empieza con la alternativa que matcheó: from / import / require
  if (/^from\b/.test(matchText)) return "BINDING"; // toda cláusula `… from "x"` enlaza
  if (/^require\b/.test(matchText)) return "BINDING"; // require() devuelve valor
  if (/^import\s*\(/.test(matchText)) {
    // import() dinámico: BINDING si se asigna/await-a, SIDE-EFFECT si va suelto
    const back = text.slice(Math.max(0, matchStart - 160), matchStart);
    return /(?:=|await)\s*$/.test(back) ? "BINDING" : "SIDE-EFFECT";
  }
  return "SIDE-EFFECT"; // `import "./x.css";` puro — el que H-06 no ve
}

function resolveSpec(spec, importerFile) {
  const { spec: clean, query } = stripQuery(spec);
  if (clean.startsWith(".")) {
    return { candidates: [resolve(dirname(importerFile), clean)], query, kind: "relativa" };
  }
  for (const a of ALIASES) {
    if (clean.startsWith(a.prefix)) {
      const rest = clean.slice(a.prefix.length);
      return { candidates: [join(a.targetAbs, rest)], query, kind: `alias ${a.prefix}` };
    }
  }
  return { candidates: [join(root, "node_modules", clean)], query, kind: "bare (node_modules)" };
}

function fileExists(p) {
  if (!existsSync(p)) return false;
  return true;
}

// ── Escaneo ─────────────────────────────────────────────────────────────────
const findings = [];
const bareUnverified = [];
const byExt = new Map();
let totalImports = 0;
let unreadable = [];

for (const file of codeFiles) {
  let text;
  try {
    text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  } catch {
    unreadable.push(relRoot(file));
    continue;
  }
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(text)) !== null) {
    const spec = m[2];
    const ext = assetExtOf(spec);
    if (!ext) continue;
    if (extFilter && !extFilter.has(ext)) continue;
    if (insideComment(text, m.index)) continue;
    totalImports++;
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1);

    const { candidates, query, kind } = resolveSpec(spec, file);
    const resolved = candidates.find(fileExists);
    if (resolved) continue;

    const isBare = kind.startsWith("bare");
    if (isBare && !spec.startsWith(".")) {
      // Los bare no certificables van a aparte: los plugins de vite pueden
      // inyectar virtuales — no los declaramos BROKEN sin certeza.
      bareUnverified.push({ file: relRoot(file), line: lineAt(text, m.index), spec });
      continue;
    }

    const b = basename(stripQuery(spec).spec).toLowerCase();
    const suggestions = (assetByBasename.get(b) ?? []).map(relRoot);
    findings.push({
      file: relRoot(file),
      line: lineAt(text, m.index),
      spec,
      kind,
      importKind: classifyKind(m[0], text, m.index),
      query,
      expected: relRoot(candidates[0]),
      suggestions,
    });
  }
}

// ── Reporte ─────────────────────────────────────────────────────────────────
const summary = {
  tool: TOOL,
  version: VERSION,
  root: root.split("\\").join("/"),
  rootHow: how,
  scanned: codeFiles.length,
  assetImports: totalImports,
  byExt: Object.fromEntries([...byExt.entries()].sort()),
  broken: findings.length,
  bareUnverified: bareUnverified.length,
  unreadable: unreadable.length,
};

if (jsonMode) {
  console.log(JSON.stringify({ ...summary, findings, bareFindings: bareUnverified, unreadableFiles: unreadable }, null, 2));
} else {
  console.log(`${TOOL} v${VERSION} · objetivo: ${root.split("\\").join("/")} (${how})`);
  console.log(`archivos escaneados: ${codeFiles.length} · imports de assets: ${totalImports}`);
  if (byExt.size > 0) {
    const tally = [...byExt.entries()].sort().map(([e, n]) => `${e.replace(".", "")} ${n}`).join(" · ");
    console.log(`por extensión: ${tally}`);
  }
  if (unreadable.length > 0) {
    console.log(`⚠ ilegibles (utf-8): ${unreadable.length} — ${unreadable.slice(0, 5).join(", ")}${unreadable.length > 5 ? " …" : ""}`);
  }
  console.log(`BROKEN: ${findings.length}${bareUnverified.length > 0 ? ` · bare sin certificar: ${bareUnverified.length}` : ""}`);
  console.log("");
  for (const f of findings) {
    console.log(`  [BROKEN] ${f.file}:${f.line}`);
    console.log(`      spec:      "${f.spec}"${f.query ? ` (query ?${f.query})` : ""} · ${f.importKind}`);
    console.log(`      esperado:  ${f.expected} — NO EXISTE`);
    if (f.suggestions.length > 0) {
      console.log(`      mismo basename en src/ (rama B — re-punto):`);
      for (const s of f.suggestions) console.log(`        · ${s}`);
    } else {
      console.log(`      mismo basename en src/: ninguna — rama C (nunca existió) o D (git history)`);
    }
  }
  if (bareUnverified.length > 0) {
    console.log("  [BARE — sin certificar en node_modules]");
    for (const b of bareUnverified.slice(0, 20)) {
      console.log(`      ${b.file}:${b.line} · "${b.spec}"`);
    }
    if (bareUnverified.length > 20) console.log(`      … +${bareUnverified.length - 20} más (--json para el listado completo)`);
  }
}

process.exit(findings.length > 0 ? 1 : 0);
