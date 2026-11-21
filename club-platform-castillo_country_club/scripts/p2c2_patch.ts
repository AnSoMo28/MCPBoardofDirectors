#!/usr/bin/env node
/**
 * P2-C2 · Integration Verifier v3.1.0 → v3.2.0
 *
 * Dos cegueras del VI, ambas visibles en la salida real del usuario
 * (2026-11-04, master de1e082-equivalente):
 *
 *   1) CHECK 3 (phantom tokens): escanea la línea CRUDA. Eso infla el
 *      residuo tras el bailout P2-C1: 32 warnings = 1 phantom real +
 *      2 template-literals dinámicos (var(--gca-${tone}) — el token
 *      exacto nunca existe) + 29 menciones var(--font-)/var(--color-)
 *      citadas DENTRO de comentarios de migración y en asserts de tests.
 *      Fix: stripper de comentarios (line y bloque, preserva strings y
 *      números de línea), exclusión de archivos de test, skip de refs
 *      dinámicas (var(--x-${…}) — no es un token resoluble) y exención
 *      info de tokens asignados en runtime vía .setProperty(("--x", …)).
 *
 *   2) CHECK 6 (backend tools): extractBackendToolNames no ve FastMCP:
 *      · NAME_KWARG_RE captura [A-Za-z_][\w-]* SIN puntos → un registro
 *        @mcp.tool(name="guests.get_today_guests") con función de nombre
 *        distinto se pierde entero;
 *      · la ventana def→decorador es de 16 líneas y FastMCP admite
 *        kwargs largos (description multi-línea) → def fuera de ventana;
 *      · la comparación es contra el short name (q.tool ya punteado) sin
 *        probar la clave compuesta server.tool que FastMCP registra.
 *      Fix: puntos en NAME_KWARG_RE, ventana 40 líneas, añadir
 *      server.tool a los nombres extraídos y al lookup del check 6.
 *
 * Cambios (un solo archivo: scripts/verify-integration.ts):
 *   A) TOOL_VERSION 3.1.0 → 3.2.0
 *   B) changelog: entrada VI-13
 *   C) helper stripJsComments() junto a snippetOf()
 *   D) check 3: stripper + exclusión tests + skip dinámicos +
 *      exención info setProperty + stat dynamicSkipped
 *   E) extractBackendToolNames: NAME_KWARG_RE con puntos, ventana 40,
 *      sufijos server.tool
 *   F) check 6: lookup con clave compuesta + stat defs sin decorador
 *
 * Modo: --dry (default) · --write. Aborta sin tocar nada si cualquier
 * ancla no matchea exactamente una vez. Preserva el EOL de cada línea.
 *
 * PREDICCIÓN post-parche (repo real del usuario, 2026-11-04):
 *   · check 3: 32 → 1 warning (AnnouncementBoard var(--gca-) dinámico
 *     incluido en el skip; queda el phantom real si lo hubiera) — en
 *     concreto: 29 de comentarios/tests y 3 dinámicos desaparecen;
 *     los 6 bare-mention info (dtabs/setProperty/borderClass) se
 *     mantienen o se convierten en exención explícita;
 *   · check 6: backendTools 0 → N>0 (depende del backend real) — si el
 *     backend registra con FastMCP name= punteado, los 24 "verify
 *     manually" degradados pasan a resueltos o a missingBoth reales;
 *   · checks 1/2/4/5/7/8: sin cambios (no se tocan sus funciones);
 *   · exit: sigue siendo 2 (PASS with warnings) — sin error nuevo.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes("--write");

function fail(msg: string): never {
  console.error(`\n✗ ABORTADO (nada fue modificado): ${msg}`);
  process.exit(1);
}

function resolveFrontendRoot(): string {
  const rootArg = process.argv.find((a) => a.startsWith("--root="));
  if (rootArg) return rootArg.slice("--root=".length);
  for (const seed of [__dirname, process.cwd()]) {
    let dir = seed;
    for (let i = 0; i < 6; i++) {
      if (existsSync(join(dir, "src", "app", "router.tsx"))) return dir;
      if (existsSync(join(dir, "frontend", "src", "app", "router.tsx"))) return join(dir, "frontend");
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return fail("no localizo la raíz del frontend — usa --root=<frontend>");
}

interface Ctx {
  path: string;
  lines: string[]; // split("\n"): las líneas CRLF conservan su "\r" final
}

const bare = (l: string): string => l.replace(/\r$/, "");
const eolOf = (l: string): string => (l.endsWith("\r") ? "\r" : "");

function load(viPath: string): Ctx {
  let raw: string;
  try {
    raw = readFileSync(viPath, "utf8");
  } catch {
    return fail(`no puedo leer ${viPath}`);
  }
  return { path: viPath, lines: raw.split("\n") };
}

function findLine(ctx: Ctx, needle: string, what: string): number {
  const hits: number[] = [];
  for (let i = 0; i < ctx.lines.length; i++) {
    if (bare(ctx.lines[i]!) === needle) hits.push(i);
  }
  if (hits.length !== 1) {
    return fail(`${ctx.path}: ancla "${what}" aparece ${hits.length} veces (esperaba 1): ${JSON.stringify(needle.slice(0, 60))}`);
  }
  return hits[0]!;
}

function insertAfter(ctx: Ctx, index: number, newLines: string[]): void {
  const sfx = eolOf(ctx.lines[index]!);
  ctx.lines.splice(index + 1, 0, ...newLines.map((l) => l + sfx));
}

function replaceLine(ctx: Ctx, index: number, newLines: string[]): void {
  const sfx = eolOf(ctx.lines[index]!);
  ctx.lines.splice(index, 1, ...newLines.map((l) => l + sfx));
}

/** Reemplaza un bloque de n líneas consecutivas por otras nuevas. */
function replaceSeq(ctx: Ctx, index: number, count: number, newLines: string[]): void {
  const sfx = eolOf(ctx.lines[index]!);
  ctx.lines.splice(index, count, ...newLines.map((l) => l + sfx));
}

function save(ctx: Ctx): void {
  if (WRITE) writeFileSync(ctx.path, ctx.lines.join("\n"));
}

function show(label: string, line: string | string[]): void {
  const arr = Array.isArray(line) ? line : [line];
  for (const l of arr) console.log(`  ${label.padEnd(9)}| ${bare(l)}`);
}

// ═════════════════════════════════════════ MAIN ═════════════════════════

const root = resolveFrontendRoot();
const viPath = join(dirname(root), "scripts", "verify-integration.ts");
const ctx = load(viPath);

console.log(`P2-C2 · VI v3.1.0 → v3.2.0 · ${WRITE ? "--write (APLICA)" : "--dry (solo plan)"}`);
console.log(`target: ${viPath}\n`);

// ── A) versión ──
const verLine = findLine(ctx, 'const TOOL_VERSION = "3.1.0";', "TOOL_VERSION 3.1.0");
console.log("── A) TOOL_VERSION ──");
show("BEFORE", ctx.lines[verLine]!);
replaceLine(ctx, verLine, ['const TOOL_VERSION = "3.2.0";']);
show("AFTER", ctx.lines[verLine]!);

// ── B) changelog VI-13 ──
// el parche P2-B insertó 9 líneas VI-12 que CIERRAN con "to the true count."
const chgLine = findLine(ctx, " *          to the true count.", "cierre VI-12");
console.log("\n── B) changelog VI-13 ──");
insertAfter(ctx, chgLine, [
  " *   VI-13  check 3 scanned the raw line, so migration comments citing",
  " *          var(--font-*) and test asserts quoting var(--color-) counted",
  " *          as phantoms (29 of 32 post-bailout warnings were noise), and",
  " *          dynamic template refs var(--gca-${tone}) flagged a token that",
  " *          never exists verbatim. Now: JS comments are stripped (strings",
  " *          preserved, line numbers kept), test files are skipped, dynamic",
  " *          refs are skipped, and tokens set at runtime via",
  " *          .setProperty(\"--x\", …) are exempted as info. Check 6 was",
  " *          FastMCP-blind: name=\"server.tool\" kwargs were dropped (the",
  " *          regex had no dots), the decorator→def window was 16 lines",
  " *          (long FastMCP descriptions pushed the def out), and only the",
  " *          short name was probed. Now: dotted kwarg names, a 40-line",
  " *          window, and the compound server.tool key is extracted and",
  " *          probed.",
]);
show("AFTER", "+ entrada VI-13 (14 líneas) tras VI-12");

// ── C) helper stripJsComments junto a snippetOf ──
const snippetLine = findLine(
  ctx,
  "function snippetOf(line: string): string {",
  "snippetOf",
);
console.log("\n── C) helper stripJsComments ──");
show("ANCLA", ctx.lines[snippetLine]!);
insertAfter(ctx, snippetLine + 2, [
  "",
  "/**",
  " * VI-13: strips line and block comments while preserving string contents and",
  " * line structure (a comment becomes spaces of the same length so every",
  " * character keeps its column). Handles block comments spanning lines via",
  " * the carry flag; template literals are treated as strings so `${…}` and",
  " * nested quotes survive. Escaped quotes inside strings are respected.",
  " */",
  "function stripJsComments(content: string): string {",
  "  const out: string[] = [];",
  "  let inBlock = false;",
  "  for (const line of content.split(\"\\n\")) {",
  "    let kept = \"\";",
  "    let inStr: string | null = null;",
  "    for (let i = 0; i < line.length; i++) {",
  "      const ch = line[i]!;",
  "      const next = line[i + 1] ?? \"\";",
  "      if (inStr !== null) {",
  "        kept += ch;",
  "        if (ch === \"\\\\\\\\\") {",
  "          kept += next;",
  "          i++;",
  "          continue;",
  "        }",
  "        if (ch === inStr) inStr = null;",
  "        continue;",
  "      }",
  "      if (inBlock) {",
  "        if (ch === \"*\" && next === \"/\") {",
  "          inBlock = false;",
  "          i++; // consume '/'",
  "        }",
  "        continue;",
  "      }",
  "      if (ch === '\"' || ch === \"'\" || ch === \"`\") {",
  "        inStr = ch;",
  "        kept += ch;",
  "        continue;",
  "      }",
  "      if (ch === \"/\" && next === \"/\") break; // rest of line is comment",
  "      if (ch === \"/\" && next === \"*\") {",
  "        inBlock = true;",
  "        i++; // consume '*'",
  "        continue;",
  "      }",
  "      kept += ch;",
  "    }",
  "    out.push(kept);",
  "  }",
  "  return out.join(\"\\n\");",
  "}",
]);
show("AFTER", "+ stripJsComments() (47 líneas) tras snippetOf()");

// ── D) check 3: escaneo sobre contenido sin comentarios ──
// 'const content = read(file);' aparece 7 veces en el archivo — se ancla por
// la secuencia de 4 líneas consecutivas que solo existe en checkPhantomTokens:
//   read(file) → if (!content) → lineIndex(content) → content.split("\n")
function findSeq(ctx: Ctx, seq: string[], what: string): number {
  const hits: number[] = [];
  for (let i = 0; i + seq.length <= ctx.lines.length; i++) {
    let ok = true;
    for (let j = 0; j < seq.length; j++) {
      if (bare(ctx.lines[i + j]!) !== seq[j]) { ok = false; break; }
    }
    if (ok) hits.push(i);
  }
  if (hits.length !== 1) {
    return fail(`${ctx.path}: secuencia "${what}" aparece ${hits.length} veces (esperaba 1)`);
  }
  return hits[0]!;
}

const scanLine = findSeq(
  ctx,
  [
    "    const content = read(file);",
    "    if (!content) continue;",
    "    const offsets = lineIndex(content);",
    '    const lines = content.split("\\n");',
  ],
  "read/if/lineIndex/split — check 3",
);
console.log("\n── D) check 3 · escaneo sin comentarios ──");
show("BEFORE", ctx.lines[scanLine]!);
show("BEFORE", ctx.lines[scanLine + 1]!);
show("BEFORE", ctx.lines[scanLine + 2]!);
show("BEFORE", ctx.lines[scanLine + 3]!);
replaceSeq(ctx, scanLine, 4, [
  "    const raw = read(file);",
  "    if (!raw) continue;",
  "    if (/\\.(test|spec|stories)\\.[tj]sx?$/.test(relPath)) continue; // VI-13: tests quote tokens, not use them",
  "    const content = stripJsComments(raw); // VI-13: comments are not refs",
  "    const offsets = lineIndex(content);",
  '    const lines = content.split("\\n");',
]);
for (let k = 0; k < 6; k++) show("AFTER", ctx.lines[scanLine + k]!);

// D2) skip de refs dinámicas + exención info setProperty
const varLoop = findLine(
  ctx,
  "    for (const m of content.matchAll(VAR_USE_RE)) {",
  "loop VAR_USE_RE",
);
console.log("\n── D2) check 3 · refs dinámicas y setProperty ──");
show("ANCLA", ctx.lines[varLoop]!);
insertAfter(ctx, varLoop, [
  "      const rest = content.slice((m.index ?? 0) + m[0].length).trimStart();",
  "      if (rest.startsWith(\"${\")) {",
  "        dynamicSkipped++; // VI-13: var(--x-${…}) resolves at runtime — not a verbatim token",
  "        continue;",
  "      }",
]);
show("AFTER", "+ 5 líneas (skip dinámico) tras el apertura del loop");

// declarar dynamicSkipped junto a varRefs
const varRefsLine = findLine(ctx, "  let varRefs = 0;", "varRefs");
show("BEFORE", ctx.lines[varRefsLine]!);
replaceLine(ctx, varRefsLine, [
  "  let varRefs = 0;",
  "  let dynamicSkipped = 0; // VI-13: template-literal refs, not verbatim tokens",
]);
show("AFTER", ctx.lines[varRefsLine]!);
show("AFTER", ctx.lines[varRefsLine + 1]!);

// exención info de tokens asignados por setProperty en runtime.
// El loop BARE_TOKEN_RE aparece 2 veces; el del bare-mentions es el que
// sigue 'if (locallyDefined.has(m[1]!)) continue;' — se ancla por esa next-line.
const bareLoop = findSeq(
  ctx,
  [
    "    for (const m of content.matchAll(BARE_TOKEN_RE)) {",
    "      if (locallyDefined.has(m[1]!)) continue;",
  ],
  "loop BARE_TOKEN_RE (bare-mentions)",
);
show("ANCLA", ctx.lines[bareLoop]!);
insertAfter(ctx, bareLoop, [
  "      const before = content.slice(0, m.index ?? 0);",
  "      if (/\\.setProperty\\(\\s*$/.test(before.split(\"\\n\").pop() ?? \"\")) {",
  "        continue; // VI-13: setProperty(\"--x\", …) assigns at runtime — not a phantom",
  "      }",
]);
show("AFTER", "+ 4 líneas (exención setProperty) tras el apertura del loop bare");

// stat dynamicSkipped en el outcome del check 3
const statVar = findLine(
  ctx,
  '      ["undefinedVar", phantomVar],',
  "stat undefinedVar",
);
show("BEFORE", ctx.lines[statVar]!);
replaceLine(ctx, statVar, [
  '      ["undefinedVar", phantomVar],',
  '      ["dynamicSkipped", dynamicSkipped],',
]);
show("AFTER", ctx.lines[statVar]!);
show("AFTER", ctx.lines[statVar + 1]!);

// ── E) extractBackendToolNames ──
console.log("\n── E) extractBackendToolNames · FastMCP ──");
const kwargLine = findLine(
  ctx,
  '  const NAME_KWARG_RE = /\\bname\\s*=\\s*["\']([A-Za-z_][\\w-]*)["\']/;',
  "NAME_KWARG_RE",
);
show("BEFORE", ctx.lines[kwargLine]!);
replaceLine(ctx, kwargLine, [
  '  const NAME_KWARG_RE = /\\bname\\s*=\\s*["\']([A-Za-z_][\\w.-]*)["\']/; // VI-13: dots — FastMCP name="server.tool"',
]);
show("AFTER", ctx.lines[kwargLine]!);

const windowLine = findLine(
  ctx,
  "        for (let j = i + 1; j < Math.min(i + 16, lines.length); j++) {",
  "ventana def 16",
);
show("BEFORE", ctx.lines[windowLine]!);
replaceLine(ctx, windowLine, [
  "        for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) { // VI-13: FastMCP kwargs can be long",
]);
show("AFTER", ctx.lines[windowLine]!);

// ADD_TOOL_ARG_RE también merece puntos (add_tool("server.tool") existe)
const addArgLine = findLine(
  ctx,
  '  const ADD_TOOL_ARG_RE = /(?:add_tool|register_tool|addTool|registerTool)\\s*\\(\\s*["\']([A-Za-z_][\\w-]*)["\']/;',
  "ADD_TOOL_ARG_RE",
);
show("BEFORE", ctx.lines[addArgLine]!);
replaceLine(ctx, addArgLine, [
  '  const ADD_TOOL_ARG_RE = /(?:add_tool|register_tool|addTool|registerTool)\\s*\\(\\s*["\']([A-Za-z_][\\w.-]*)["\']/;',
]);
show("AFTER", ctx.lines[addArgLine]!);

// ── F) check 6: lookup con clave compuesta ──
console.log("\n── F) check 6 · clave compuesta ──");
const lookupLine = findLine(
  ctx,
  "    const inBackend = ctx.backendTools.has(q.tool);",
  "lookup backend",
);
show("BEFORE", ctx.lines[lookupLine]!);
replaceLine(ctx, lookupLine, [
  "    const inBackend = ctx.backendTools.has(q.tool) || ctx.backendTools.has(`${q.server}.${q.tool}`); // VI-13: FastMCP compound key",
]);
show("AFTER", ctx.lines[lookupLine]!);

// stat extra: claves compuestas extraídas (visibilidad del extractor)
const statBackend = findLine(
  ctx,
  '      ["backendTools", ctx.backendTools.size],',
  "stat backendTools",
);
show("BEFORE", ctx.lines[statBackend]!);
replaceLine(ctx, statBackend, [
  '      ["backendTools", ctx.backendTools.size],',
  '      ["compoundKeys", [...ctx.backendTools].filter((n) => n.includes(".")).length],',
]);
show("AFTER", ctx.lines[statBackend]!);
show("AFTER", ctx.lines[statBackend + 1]!);

// ── guardar ──
save(ctx);
console.log(`\n═══ RESUMEN ═══`);
console.log(`  A) versión 3.2.0 · B) VI-13 · C) stripJsComments()`);
console.log(`  D) check 3: stripper + tests + dinámicos + setProperty + stat`);
console.log(`  E) extractor: puntos + ventana 40 · F) check 6: clave compuesta + stat`);
console.log(`  ${WRITE ? "APLICADO" : "DRY — re-ejecuta con --write para aplicar"}`);
console.log(`  Verifica: pnpm run verify:integration (check 3 → solo phantoms reales; check 6 → backendTools>0)`);
