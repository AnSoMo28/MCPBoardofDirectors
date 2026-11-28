#!/usr/bin/env node
/**
 * P2-B · Integration Verifier v3.0.0 → v3.1.0
 *
 * Dos defectos del VI, ambos verificados contra el código real (master):
 *
 *   1) CHECK 8 (orphan mocks): solo cuenta referencias useMCPQuery(…). Las
 *      mutaciones (useMCPMutation), las llamadas directas (callMCPTool) y
 *      los pares de datos {server, tool} del advisor-engine NO cuentan →
 *      falsos orphans. Survey sobre el src real: 38 de 90 orphans son
 *      falsos (quedan 52 muertos reales). Fix: check 8 uniona las 4 formas
 *      de referencia; los checks 2/6 conservan su semántica hook-only
 *      (mcpQueries intacto — VI-08: ScanContext compartido, computed once).
 *
 *   2) CHECK 4 (raw buttons): EOL-ciego. El regex /<button[\s>]/ matchea el
 *      '\r' remanente del split("\n") en working copies CRLF, pero en LF un
 *      '<button' a fin de línea (atributos en la línea siguiente) NO matchea
 *      → el mismo árbol da 610 (CRLF) vs 84 (LF) — la deriva 962 vs 436 del
 *      baseline. Fix: strip del '\r' + lookahead (?=[\s>]|$): ambos EOL
 *      convergen al conteo verdadero (610 en este árbol).
 *
 * Cambios (un solo archivo: scripts/verify-integration.ts):
 *   A) TOOL_VERSION 3.0.0 → 3.1.0
 *   B) changelog: entrada VI-12
 *   C) 3 regex nuevos junto a MCP_QUERY_RE
 *   D) ScanContext: + extraToolRefs
 *   E) colector collectExtraToolRefs (excluye shared/mocks y tests, como
 *      collectMcpQueries)
 *   F) ctx builder: poblar extraToolRefs (2 puntos)
 *   G) check 8: union de refs + nota + stat extraRefs
 *   H) check 4: EOL-insensible
 *
 * Modo: --dry (default) · --write. Aborta sin tocar nada si cualquier ancla
 * no matchea exactamente una vez. Preserva el EOL de cada línea.
 *
 * PREDICCIÓN post-parche:
 *   · clon LF en master limpio:    check 4 84→610 · warnings 436→962
 *     (converge EXACTO con el baseline CRLF del usuario) · orphans 90→52
 *     · referenced 102→140 · info 46→42 · exit 2
 *   · máquina del usuario (de1e082): 0 err / 961 warn (igual) / 42 info
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

function save(ctx: Ctx): void {
  if (WRITE) writeFileSync(ctx.path, ctx.lines.join("\n"));
}

function show(label: string, line: string | string[]): void {
  const arr = Array.isArray(line) ? line : [line];
  for (const l of arr) console.log(`  ${label.padEnd(9)}| ${bare(l)}`);
}

// ═════════ MAIN ═════════

const root = resolveFrontendRoot();
const viPath = join(dirname(root), "scripts", "verify-integration.ts");
const ctx = load(viPath);

console.log(`P2-B · VI v3.0.0 → v3.1.0 · ${WRITE ? "--write (APLICA)" : "--dry (solo plan)"}`);
console.log(`target: ${viPath}\n`);

// ── A) versión ──
const verLine = findLine(ctx, 'const TOOL_VERSION = "3.0.0";', "TOOL_VERSION");
console.log("── A) TOOL_VERSION ──");
show("BEFORE", ctx.lines[verLine]!);
replaceLine(ctx, verLine, ['const TOOL_VERSION = "3.1.0";']);
show("AFTER", ctx.lines[verLine]!);

// ── B) changelog VI-12 ──
const chgLine = findLine(ctx, " *          advisory check 8 (orphan mocks) that reuses the shared context.", "cierre VI-11");
console.log("\n── B) changelog VI-12 ──");
insertAfter(ctx, chgLine, [
  " *   VI-12  check 8 counted only useMCPQuery refs: every useMCPMutation,",
  " *          callMCPTool and advisor-engine {server, tool} data pair looked",
  " *          like an orphan mock (38 of 90 were false positives here).",
  " *          Check 8 now unions the four reference shapes; checks 2/6 keep",
  " *          hook-only semantics. Check 4 was EOL-blind: a CRLF working copy",
  " *          flagged <button at end of line via the leftover \\r, an LF",
  " *          checkout missed it (962 vs 436 baseline drift). The \\r is now",
  " *          stripped and the pattern accepts end-of-line — both converge",
  " *          to the true count.",
]);
show("AFTER", "+ entrada VI-12 (9 líneas) tras VI-11");

// ── C) regexes nuevos ──
const reLine = findLine(ctx, String.raw`  /\buseMCPQuery\s*(?:<[^()]*>)?\(\s*["']([A-Za-z_][\w-]*)["']\s*,\s*["']([A-Za-z_][\w-]*)["']/g;`, "literal MCP_QUERY_RE");
console.log("\n── C) 3 regex nuevos ──");
insertAfter(ctx, reLine, [
  String.raw`const MCP_MUTATION_RE =`,
  String.raw`  /\buseMCPMutation\s*(?:<[^()]*>)?\(\s*["']([A-Za-z_][\w-]*)["']\s*,\s*["']([A-Za-z_][\w-]*)["']/g;`,
  String.raw`const MCP_DIRECT_RE =`,
  String.raw`  /\bcallMCPTool\s*(?:<[^()]*>)?\(\s*["']([A-Za-z_][\w-]*)["']\s*,\s*["']([A-Za-z_][\w-]*)["']/g;`,
  String.raw`const MCP_DATA_PAIR_RE =`,
  String.raw`  /\bserver:\s*["']([A-Za-z_][\w-]*)["']\s*,\s*\n\s*tool:\s*["']([A-Za-z_][\w-]*)["']/g;`,
]);
show("AFTER", [
  String.raw`+ const MCP_MUTATION_RE = /\buseMCPMutation\s*(?:<[^()]*>)?\(…/g;`,
  String.raw`+ const MCP_DIRECT_RE   = /\bcallMCPTool\s*(?:<[^()]*>)?\(…/g;`,
  String.raw`+ const MCP_DATA_PAIR_RE = /\bserver:\s*["']…\n\s*tool:\s*["']…/g;`,
]);

// ── D) ScanContext ──
const ifaceLine = findLine(ctx, "  mcpQueries: McpQueryRef[];", "campo mcpQueries");
console.log("\n── D) ScanContext ──");
insertAfter(ctx, ifaceLine, ["  extraToolRefs: McpQueryRef[]; // VI-12: mutations, direct calls, advisor pairs"]);
show("AFTER", "+ extraToolRefs: McpQueryRef[]; // VI-12");

// ── E) colector ──
const colFn = findLine(ctx, "function collectMcpQueries(frontendSrc: string, tsFiles: string[]): McpQueryRef[] {", "firma collectMcpQueries");
const colEnd = findLine(ctx, "  return refs;", "cierre de collectMcpQueries");
if (colEnd <= colFn || bare(ctx.lines[colEnd + 1]!) !== "}") {
  fail("la estructura de collectMcpQueries no es la esperada (¿'return refs;' sin '}' inmediato después?).");
}
console.log("\n── E) colector collectExtraToolRefs ──");
insertAfter(ctx, colEnd + 1, [
  "",
  "/** VI-12: non-hook tool references — mutations, direct calls, advisor data pairs. */",
  "function collectExtraToolRefs(frontendSrc: string, tsFiles: string[]): McpQueryRef[] {",
  "  const refs: McpQueryRef[] = [];",
  "  const patterns = [MCP_MUTATION_RE, MCP_DIRECT_RE, MCP_DATA_PAIR_RE];",
  "  for (const file of tsFiles) {",
  "    const relPath = relFrom(frontendSrc, file);",
  '    if (relPath.startsWith("shared/mocks/")) continue;',
  "    if (/\\.(test|spec|stories)\\.[tj]sx?$/.test(relPath)) continue;",
  "    const content = read(file);",
  "    if (!content) continue;",
  "    const offsets = lineIndex(content);",
  "    for (const re of patterns) {",
  "      for (const m of content.matchAll(re)) {",
  "        refs.push({",
  "          file: relPath,",
  "          line: lineAt(offsets, m.index ?? 0),",
  "          server: m[1]!,",
  "          tool: m[2]!,",
  "        });",
  "      }",
  "    }",
  "  }",
  "  return refs;",
  "}",
]);
show("AFTER", "+ function collectExtraToolRefs(…) — 3 patrones, excluye shared/mocks y tests");

// ── F) ctx builder ──
const buildLine = findLine(ctx, "  const mcpQueries = collectMcpQueries(frontendSrc, tsFiles);", "llamada collectMcpQueries");
console.log("\n── F) ctx builder ──");
insertAfter(ctx, buildLine, ["  const extraToolRefs = collectExtraToolRefs(frontendSrc, tsFiles);"]);
const retLine = findLine(ctx, "    mcpQueries,", "campo en return del ctx");
insertAfter(ctx, retLine, ["    extraToolRefs,"]);
show("AFTER", [
  "+ const extraToolRefs = collectExtraToolRefs(frontendSrc, tsFiles);",
  "+ extraToolRefs, (en el return)",
]);

// ── G) check 8: union + nota + stat ──
const usedLine = findLine(ctx, "  const usedKeys = new Set(ctx.mcpQueries.map((q) => `${q.server}::${q.tool}`));", "usedKeys");
console.log("\n── G) check 8 (orphan mocks) ──");
show("BEFORE", ctx.lines[usedLine]!);
replaceLine(ctx, usedLine, [
  "  const usedKeys = new Set(",
  "    ctx.mcpQueries",
  "      .concat(ctx.extraToolRefs)",
  '      .map((q) => `${q.server}::${q.tool}`),',
  "  );",
]);
show("AFTER", [
  "  const usedKeys = new Set(",
  "    ctx.mcpQueries",
  "      .concat(ctx.extraToolRefs)",
  "      .map((q) => `${q.server}::${q.tool}`),",
  "  );",
]);

const noteLine = findLine(ctx, '  const notes: string[] = ["Heuristic: only useMCPQuery(…) hook references count — direct registry calls are not tracked."];', "nota check 8");
replaceLine(ctx, noteLine, [
  "  const notes: string[] = [",
  '    "Heuristic (VI-12): references counted from useMCPQuery + useMCPMutation + callMCPTool + adjacent {server, tool} data pairs — direct registry calls are still not tracked.",',
  "  ];",
]);

const statLine = findLine(ctx, '      ["orphanTools", orphanCount],', "stat orphanTools");
insertAfter(ctx, statLine, ['      ["extraRefs", ctx.extraToolRefs.length],']);
show("AFTER", [
  '- nota: "only useMCPQuery(…) hook references count" → describe las 4 formas',
  '+ stat ["extraRefs", ctx.extraToolRefs.length]',
]);

// ── H) check 4: EOL-insensible ──
const btnLine = findLine(ctx, String.raw`      if (/<button[\s>]/.test(lines[i]!)) {`, "regex check 4");
console.log("\n── H) check 4 (raw buttons) ──");
show("BEFORE", ctx.lines[btnLine]!);
replaceLine(ctx, btnLine, [String.raw`      if (/<button(?=[\s>]|$)/.test(lines[i]!.replace(/\r$/, ""))) {`]);
show("AFTER", ctx.lines[btnLine]!);

// ── fin ──
save(ctx);
console.log("\n═══ RESUMEN ═══");
console.log("  A) versión 3.1.0 · B) VI-12 · C) 3 regex · D) ScanContext.extraToolRefs");
console.log("  E) collectExtraToolRefs · F) ctx builder · G) check 8 union · H) check 4 EOL-safe");
console.log(WRITE ? "  Verifica: pnpm run verify:integration (predicciones en el header del script)" : "  Re-ejecuta con --write para aplicar.");
