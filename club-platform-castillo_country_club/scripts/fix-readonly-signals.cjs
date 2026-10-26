#!/usr/bin/env node
/**
 * fix-readonly-signals.cjs (G26-3) — TS2345 del clúster buildCtx:
 *   `signals?: DomainSignal[]`  →  `signals?: readonly DomainSignal[]`
 *
 * Proyecto : club-platform-castillo_country_club · frontend/
 * Causa    : AdvisorConfig<C>["buildCtx"] declara
 *            `(rawData: unknown, signals?: readonly DomainSignal[]) => C`
 *            y con strictFunctionTypes los hooks que lo declaran MUTABLE
 *            no son asignables (contravariancia de parámetros) → ~20 TS2345
 *            repartidos en useMLAdvisor + los useXAdvisor + engines.
 * Fix      : aceptar `readonly` es SIEMPRE más general (el body solo lee:
 *            filter/map/reduce) — si algún body mutara `signals`, el nuevo
 *            error que saltaría sería un bug real, no ruido.
 *
 * Quirúrgico y lineal: SOLO se tocan líneas dentro de la firma de un
 * `buildCtx` (la línea del `buildCtx:` y hasta 3 líneas siguientes
 * mientras no aparezca `=>`). Otras ocurrencias de `signals: DomainSignal[]`
 * (interfaces, estados, firmas ajenas) NO se tocan — si alguna es parte
 * de un TS2345, reaparece en el próximo tsc y se decide con evidencia.
 *
 * USO (desde DONDE SEA — raíz auto-resuelta como el agregador):
 *   node scripts/fix-readonly-signals.cjs   [--root <ruta-del-frontend>]
 * Después: node scripts/g21-aggregate-typecheck.mjs --run
 */
"use strict";

const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const argValue = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isFrontendRoot = (p) =>
  !!p && isFile(path.join(p, "tsconfig.app.json")) && isFile(path.join(p, "package.json"));

let ROOT = argValue("--root");
let HOW = "--root";
if (!ROOT) {
  const cwd = process.cwd();
  const scriptDir = __dirname;
  const candidates = [
    ["directorio actual", cwd],
    ["monorepo (./frontend)", path.join(cwd, "frontend")],
    ["anclaje al script (scripts/..)", path.dirname(scriptDir)],
    ["monorepo (scripts/../frontend)", path.join(path.dirname(scriptDir), "frontend")],
  ];
  if (path.basename(cwd) === "scripts") {
    candidates.push(["scripts/.. del cwd", path.dirname(cwd)]);
    candidates.push(["monorepo (scripts/../frontend del cwd)", path.join(path.dirname(cwd), "frontend")]);
  }
  for (const [how, c] of candidates) {
    if (isFrontendRoot(c)) { ROOT = path.resolve(c); HOW = how; break; }
  }
}
if (!ROOT || !isFrontendRoot(ROOT)) {
  console.error("✗ no pude resolver la raíz del frontend (debe tener tsconfig.app.json + package.json).");
  console.error("  Usa:  node scripts/fix-readonly-signals.cjs --root <ruta-del-frontend>");
  process.exit(2);
}
const SRC = path.join(ROOT, "src");

function walkFiles(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walkFiles(fp, out); }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(fp);
  }
  return out;
}

// ocurrencia de la firma mutable (regex SIN /g para sondeo — replace usa la /g)
const HAS_RE = /\bsignals\s*\??\s*:\s*DomainSignal\[\]/;
const PATCH_RE = /(\bsignals\s*\??\s*:\s*)(DomainSignal\[\])/g;

const changed = [];
for (const fp of walkFiles(SRC, [])) {
  const raw = fs.readFileSync(fp, "utf8");
  if (!HAS_RE.test(raw) || !/\bbuildCtx\b/.test(raw)) continue;
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  let fileChanged = false;
  for (let i = 0; i < lines.length; i++) {
    if (!/\bbuildCtx\b/.test(lines[i])) continue;
    // ventana: la línea del buildCtx + hasta 3 siguientes, hasta cerrar la firma con =>
    for (let j = i; j <= Math.min(i + 3, lines.length - 1); j++) {
      const before = lines[j];
      const after = before.replace(PATCH_RE, "$1readonly $2");
      if (after !== before) {
        lines[j] = after;
        fileChanged = true;
        changed.push({
          file: path.relative(ROOT, fp).replace(/\\/g, "/"),
          line: j + 1,
          before: before.trim(),
          after: after.trim(),
        });
      }
      if (/=>/.test(lines[j])) break;
    }
  }
  if (fileChanged) fs.writeFileSync(fp, lines.join(eol), "utf8");
}

console.log(`fix-readonly-signals — G26-3 · raíz: ${ROOT} (${HOW})`);
console.log(`archivos parcheados: ${new Set(changed.map((c) => c.file)).size} · líneas: ${changed.length}`);
for (const c of changed) {
  console.log(`  ${c.file}:${c.line}`);
  console.log(`    − ${c.before}`);
  console.log(`    + ${c.after}`);
}
if (changed.length === 0) {
  console.log("nada que parchear (¿ya readonly, o firmas multi-línea más largas? — ver tsc)");
}
console.log(`\nsiguiente: node scripts/g21-aggregate-typecheck.mjs --run`);
