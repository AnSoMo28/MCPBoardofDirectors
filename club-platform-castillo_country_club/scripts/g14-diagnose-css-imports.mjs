#!/usr/bin/env node
// scripts/g14-diagnose-css-imports.mjs — v4 (G19) · Diagnóstico diferencial + reparación de la firma:
//   error TS1003: Identifier expected   (apunta al keyword `import`)
//   error TS1005: ',' expected          (apunta al string y al `;`)
//   ...sobre líneas `import "./X.css";`
//
// LECTURA DE LA FIRMA: el parser entra a esa línea todavía DENTRO de una lista
// `import { …` sin cerrar → la declaración de import INMEDIATAMENTE ANTERIOR
// quedó sin terminar (típicamente falta `} from "…";`). Son errores de GRAMÁTICA
// (fase de parseo): ninguna opción del tsconfig los genera ni los oculta.
//
// v2 (G16) — patrones CONFIRMADOS contra el caso real (WellnessAnomalyRadar.tsx):
//   MISPLACED_CSS_IMPORT — el import CSS fue insertado justo DESPUÉS de la línea
//     de apertura de un `import type { … } from "…";` multi-línea; la declaración
//     SÍ completa más abajo → el import está DESUBICADO, no truncado.
//     AUTO-REPARABLE: --fix lo MUEVE a después del cierre de la declaración.
//   UNTERMINATED_IMPORT — declaración que nunca completa (falta `} from "…";`).
//     Manual; subcaso seguro auto-reparable: single-line con `{`, sin `}` y la
//     ruta ya presente (`import { A, B from "./x";`) — se inserta `}` y NADA más.
//     Jamás se inventa una ruta de módulo.
//   INVISIBLE_CHARS — BOM/zero-width/nbsp/smart-quotes (hipótesis alternativa).
//
// v3 (G18) — RESOLUCIÓN DE RAÍZ ROBUSTA (corrección del error real del usuario:
// "No pude leer el directorio: src" corriendo desde la raíz del MONOREPO).
// El objetivo se descubre solo, en este orden — explícito > implícito, y la
// fuente de la resolución SIEMPRE se anuncia en la primera línea de output:
//   1. argumento posicional <ruta>             (compat v2, relativa al CWD)
//   2. --root <raíz-del-frontend>              (la carpeta que CONTIENE src/)
//   3. anclaje al script: <dir-del-script>/..  (si tiene src/ — layout del paquete)
//   4. directorio actual                       (si tiene src/)
//   5. monorepo: ./frontend                    (si tiene src/ + package.json)
// Si nada resuelve: diagnóstico con cada ruta probada + comandos exactos (exit 2 —
// error de herramienta, distinto del exit 1 = hallazgos).
//
// v4 (G19) — FALSOS POSITIVOS ELIMINADOS (correcciones de la corrida REAL del usuario:
// 813 archivos, 11 MISPLACED reparados — y 8 falsos positivos de 9 "pendientes"):
//   [fp1] `import.meta.env.DEV` al inicio de línea abría un "pending" fantasma:
//         `import\b` matchea entre "import" y "." y el lookahead solo excluía
//         `import(` → señalaba UNTERMINATED_IMPORT en signal-bus.ts L306, que
//         está SANO. IMPORT_OPENER ahora también excluye `import.meta`.
//   [fp2] U+200D (ZWJ) DENTRO de secuencias emoji (familias \u{1F468}\u200D… ,
//         profesiones) es un componente LEGAL de composición — solo es
//         sospechoso adosado a ASCII (ataques homoglyph). La detección es ahora
//         consciente del contexto emoji (code points vecinos).
//   [bom] U+FEFF en (línea 1, columna 0) = BOM de archivo: legal (Unicode) y
//         aceptado por tsc → informativo, NO cuenta para el exit code.
//
// Uso (desde DONDE SEA — la raíz se auto-resuelve):
//   node scripts/g14-diagnose-css-imports.mjs                      # diagnóstico
//   node scripts/g14-diagnose-css-imports.mjs --fix                # + repara lo seguro
//   node scripts/g14-diagnose-css-imports.mjs --root frontend --fix  # explícito
//
// Cero dependencias · Node >= 20 · exit 0 = limpio · exit 1 = hallazgos · exit 2 = error de herramienta (CI-friendly)

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const SKIP = new Set(["node_modules", "dist", "coverage", ".git"]);

const IMPORT_OPENER = /^\s*import\b(?!\s*\()(?!\s*\.meta\b)/;
const SIDE_EFFECT_IMPORT = /^\s*import\s*(?:type\s+)?["'][^"']+["']\s*;?\s*$/;
const INTRUDER_AT_COL0 =
  /^(?:import|export|const|let|var|function|class|interface|enum|declare|namespace|abstract)\b/;
const FROM_WITH_STRING = /\bfrom\s*(?:"[^"]+"|'[^']+')/;
const INVISIBLES = /[\u200B\u200C\u200D\uFEFF\u00A0\u2028\u2029\u201C\u201D\u2018\u2019]/;
// Subcaso recuperable de UNTERMINATED: una sola línea, con `{`, SIN `}`,
// y `from "ruta"` presente.
const RECOVERABLE_SHAPE =
  /^\s*import\s*(?:type\s+)?\{[^{}]*\bfrom\b\s*(?:"[^"]+"|'[^']+')\s*;?\s*$/;

const INVISIBLE_LABELS = new Map([
  ["\u200B", "U+200B zero-width space"],
  ["\u200C", "U+200C zero-width non-joiner"],
  ["\u200D", "U+200D zero-width joiner"],
  ["\uFEFF", "U+FEFF BOM/ZWNBSP"],
  ["\u00A0", "U+00A0 no-break space"],
  ["\u2028", "U+2028 line separator"],
  ["\u2029", "U+2029 paragraph separator"],
  ["\u201C", "U+201C smart quote izquierda"],
  ["\u201D", "U+201D smart quote derecha"],
  ["\u2018", "U+2018 smart apostrophe izq."],
  ["\u2019", "U+2019 smart apostrophe der."],
]);

/** ¿Code point de aspecto emoji? (rangos suficientes para composición ZWJ) */
function isEmojiish(cp) {
  return (
    (cp >= 0x1f000 && cp <= 0x1faff) || // pictographs, emoticons, skin tones
    (cp >= 0x2600 && cp <= 0x27bf) || // misc symbols & dingbats
    (cp >= 0x2b00 && cp <= 0x2bff) || // estrellas, flechas
    cp === 0xfe0f || // variation selector-16
    cp === 0x200d // ZWJ encadenado (familias de 3+ miembros)
  );
}

/** Code point que TERMINA justo antes de idx (soporta pares sustitutos). */
function cpBefore(line, idx) {
  if (idx === 0) return Number.NaN;
  const prev = line.charCodeAt(idx - 1);
  if (prev >= 0xdc00 && prev <= 0xdfff) return line.codePointAt(idx - 2);
  return prev;
}

/** Code point que EMPIEZA justo después de idx (undefined si no hay). */
function cpAfter(line, idx) {
  return line.codePointAt(idx + 1);
}

/**
 * Escaneo de invisibles con conciencia de contexto (v4):
 *  - ZWJ entre dos code points emoji = composición legítima → NO es hallazgo
 *  - BOM en (línea 1, col 0) = legal → informativo, no cuenta al exit code
 *  - todo lo demás (incluido ZWJ adosado a ASCII) = hallazgo
 */
function scanInvisibles(line, isFirstLine) {
  const findings = [];
  const infos = [];
  const re = new RegExp(INVISIBLES.source, "g");
  let m;
  while ((m = re.exec(line)) !== null) {
    const ch = m[0];

    if (ch === "\uFEFF" && isFirstLine && m.index === 0) {
      infos.push("U+FEFF BOM al inicio del archivo — benigno (tsc lo acepta); strip opcional");
      continue;
    }

    if (
      ch === "\u200D" &&
      isEmojiish(cpBefore(line, m.index)) &&
      isEmojiish(cpAfter(line, m.index))
    ) {
      continue; // composición emoji legal (familias, profesiones)
    }

    findings.push(INVISIBLE_LABELS.get(ch) ?? `U+${ch.codePointAt(0).toString(16)}`);
  }
  return { findings: [...new Set(findings)], infos };
}

/** Quita strings (con escapes) y comentarios de línea: deja la estructura real. */
function stripStringsAndComments(line) {
  return line
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""')
    .replace(/\/\/.*$/, "");
}

function braceDepth(stripped) {
  let d = 0;
  for (const ch of stripped) {
    if (ch === "{") d++;
    else if (ch === "}") d--;
  }
  return d;
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    process.stderr.write(`⛔ No pude leer el directorio: ${dir}\n`);
    process.exit(2);
  }
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) yield* walk(join(dir, ent.name));
      continue;
    }
    const dot = ent.name.lastIndexOf(".");
    if (dot !== -1 && EXTS.has(ent.name.slice(dot))) yield join(dir, ent.name);
  }
}

/**
 * Analiza un archivo. Hallazgos posibles:
 *   { type: "MISPLACED_CSS_IMPORT", declarationStart, completesAt, suspended[] }
 *   { type: "UNTERMINATED_IMPORT", startLine, captured[], suspended[], intruderLine, fixable, missingHint }
 *   { type: "INVISIBLE_CHARS", line, detail } — v4: ZWJ entre emoji y BOM al
 *                                             inicio del archivo quedan fuera
 *                                             (infos, no hallazgos)
 *
 * `suspended`: imports side-effect que intruyen DENTRO de una declaración
 * abierta. Se excluyen del tracking de profundidad (son enunciados completos
 * textualmente) y se reportan por separado: si la declaración completa, el
 * hallazgo es MISPLACED (mover); si no, el import queda bien posicionado
 * apenas la declaración se repare a mano.
 */
function analyze(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const findings = [];
  const infos = [];
  let pending = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const invisible = scanInvisibles(line, i === 0);
    if (invisible.findings.length > 0) {
      findings.push({
        type: "INVISIBLE_CHARS",
        line: i + 1,
        detail: invisible.findings.join(", "),
        raw: line,
      });
    }
    for (const info of invisible.infos) {
      infos.push({ line: i + 1, detail: info });
    }

    if (pending) {
      // Import side-effect intruso: SUSPENDER — no es contenido de la
      // declaración ni un intruso gramatical propio.
      if (SIDE_EFFECT_IMPORT.test(line)) {
        pending.suspended.push({ index: i, line });
        continue;
      }

      pending.captured.push({ n: i + 1, raw: line });
      pending.depth += braceDepth(stripStringsAndComments(line));

      // ¿Esta línea completa la declaración? (profundidad 0 + `from "ruta"`)
      if (pending.depth === 0 && FROM_WITH_STRING.test(line)) {
        if (pending.suspended.length > 0) {
          findings.push({
            type: "MISPLACED_CSS_IMPORT",
            declarationStart: pending.start,
            completesAt: i + 1,
            suspended: pending.suspended,
            hint: 'import CSS insertado dentro de la declaración — --fix lo mueve a después de `} from "…";`',
          });
        }
        pending = null;
        continue;
      }

      // ¿Arranca una declaración nueva mientras la anterior sigue abierta?
      // Esto reproduce EXACTAMENTE la cascada TS1003/TS1005 de tsc.
      if (INTRUDER_AT_COL0.test(line)) {
        findings.push({
          type: "UNTERMINATED_IMPORT",
          startLine: pending.start,
          captured: pending.captured,
          suspended: pending.suspended,
          intruderLine: i + 1,
          depth: pending.depth,
          fixable: RECOVERABLE_SHAPE.test(pending.captured[0].raw),
          missingHint: RECOVERABLE_SHAPE.test(pending.captured[0].raw)
            ? "falta únicamente `}` antes de `from` — recuperable con --fix"
            : pending.depth > 0
              ? 'falta `}` (y posiblemente `from "…";`) — la ruta del módulo NO es recuperable mecánicamente'
              : "la declaración quedó sin el string del módulo tras `from` — ruta no recuperable",
        });
        pending = null; // recuperación de error, como hace tsc
        continue;
      }
      continue;
    }

    if (IMPORT_OPENER.test(line) && !SIDE_EFFECT_IMPORT.test(line)) {
      const depth = braceDepth(stripStringsAndComments(line));
      const complete = depth === 0 && FROM_WITH_STRING.test(line);
      if (!complete) {
        pending = {
          start: i + 1,
          depth,
          captured: [{ n: i + 1, raw: line }],
          suspended: [],
        };
      }
    }
  }

  if (pending) {
    findings.push({
      type: "UNTERMINATED_IMPORT",
      startLine: pending.start,
      captured: pending.captured,
      suspended: pending.suspended,
      intruderLine: null,
      depth: pending.depth,
      fixable: RECOVERABLE_SHAPE.test(pending.captured[0].raw),
      missingHint: RECOVERABLE_SHAPE.test(pending.captured[0].raw)
        ? "falta únicamente `}` antes de `from` — recuperable con --fix"
        : pending.depth > 0
          ? 'falta `}` (y posiblemente `from "…";`) — llega abierta hasta EOF'
          : "sin string de módulo tras `from` hasta EOF",
    });
  }

  return { findings, infos };
}

/**
 * Aplica TODOS los fixes seguros en UNA pasada sobre índices ORIGINALES
 * (varios hallazgos por archivo no desplazan índices entre sí):
 *   - MISPLACED_CSS_IMPORT → la línea suspendida se ELIMINA de su posición
 *     y se REINSERTA (verbatim) después de la línea que cierra la declaración.
 *   - UNTERMINATED + RECOVERABLE_SHAPE → inserta `}` antes de `from`
 *     (absorbiendo whitespace); los suspended, si los hay, quedan bien
 *     posicionados tras la corrección — no se tocan.
 * Devuelve la lista de acciones para el reporte.
 */
function applyFix(filePath, findings) {
  const raw = readFileSync(filePath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);

  const removals = new Set(); // índices 0-based a eliminar (imports desubicados)
  const insertions = new Map(); // ancla 0-based → líneas a insertar DESPUÉS
  const braceFixes = new Map(); // índice 0-based → línea corregida
  const report = [];

  for (const f of findings) {
    if (f.type === "MISPLACED_CSS_IMPORT") {
      const anchor = f.completesAt - 1; // índice ORIGINAL de la línea que cierra
      const queue = insertions.get(anchor) ?? [];
      for (const s of f.suspended) {
        removals.add(s.index);
        queue.push(s.line);
        report.push(`L${s.index + 1} → tras L${f.completesAt} (movida)`);
      }
      insertions.set(anchor, queue);
    } else if (f.type === "UNTERMINATED_IMPORT" && f.fixable) {
      const idx = f.startLine - 1;
      // Absorbe el whitespace alrededor de `from` para no dejar dobles espacios.
      braceFixes.set(idx, lines[idx].replace(/\s*\bfrom\b\s*/, " } from "));
      report.push(`L${f.startLine} (insertado } antes de 'from')`);
    }
  }

  if (removals.size === 0 && braceFixes.size === 0) return report;

  const out = [];
  lines.forEach((line, idx) => {
    if (removals.has(idx)) return; // se reinserta tras su ancla
    out.push(braceFixes.has(idx) ? braceFixes.get(idx) : line);
    if (insertions.has(idx)) out.push(...insertions.get(idx));
  });

  writeFileSync(filePath, out.join(eol), "utf8");
  return report;
}

function printFindings(findings) {
  for (const f of findings) {
    if (f.type === "INVISIBLE_CHARS") {
      console.log(`  ⚠ INVISIBLE_CHARS · línea ${f.line} · ${f.detail}`);
      console.log(`    raw: ${JSON.stringify(f.raw.trim())}`);
      continue;
    }
    if (f.type === "MISPLACED_CSS_IMPORT") {
      console.log(
        `  ⛔ IMPORT CSS DESUBICADO · declaración L${f.declarationStart}–L${f.completesAt} · REPARABLE (--fix: se mueve tras el cierre)`,
      );
      for (const s of f.suspended) {
        console.log(`     L${s.index + 1}: ${s.line}`);
      }
      console.log(`     → ${f.hint}`);
      continue;
    }
    const hasta = f.intruderLine ? `intruso en L${f.intruderLine}` : "hasta EOF";
    console.log(
      `  ⛔ IMPORT SIN TERMINAR · abre en L${f.startLine} · ${hasta} · ${f.fixable ? "REPARABLE (--fix)" : "manual"}`,
    );
    for (const c of f.captured) {
      console.log(`     L${c.n}: ${c.raw}`);
    }
    console.log(`     → ${f.missingHint}`);
    for (const s of f.suspended) {
      console.log(
        `     (import CSS en L${s.index + 1} — queda bien posicionado apenas repares la declaración)`,
      );
    }
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const fix = args.includes("--fix");

// --root <raíz-del-frontend>: explícito, gana a toda heurística.
const rootFlagIdx = args.indexOf("--root");
const rootValue = rootFlagIdx === -1 ? null : args[rootFlagIdx + 1];
if (rootFlagIdx !== -1 && (!rootValue || rootValue.startsWith("--"))) {
  console.error("⛔ --root necesita la ruta de la raíz del frontend: --root <ruta>\n");
  console.error("   La raíz es la carpeta que CONTIENE src/ (p. ej. --root frontend).");
  process.exit(2);
}

// Posicional (compat v2): ruta explícita relativa al CWD — máxima prioridad.
// (rootValueIdx = -1 cuando no hay --root: ningún índice real lo iguala.)
const rootValueIdx = rootFlagIdx === -1 ? -1 : rootFlagIdx + 1;
const positionalIdx = args.findIndex(
  (a, i) => !a.startsWith("--") && i !== rootValueIdx,
);
const positional = positionalIdx === -1 ? null : args[positionalIdx];

function hasSrc(dir) {
  return existsSync(join(dir, "src"));
}

/** Resolución de la raíz: explícito > implícito · fail-closed con diagnóstico. */
function resolveTarget() {
  if (positional) return { dir: positional, how: "argumento posicional" };

  if (rootValue) {
    if (!hasSrc(rootValue)) {
      console.error(
        `⛔ --root "${rootValue}" no contiene src/ — pasa la RAÍZ del frontend (la carpeta padre de src/).`,
      );
      process.exit(2);
    }
    return { dir: join(rootValue, "src"), how: `--root ${rootValue}` };
  }

  // Layout del paquete: el script vive en <frontend>/scripts/ → subir DOS
  // niveles (el propio archivo → scripts/ → raíz del frontend).
  const scriptRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  if (hasSrc(scriptRoot)) {
    return { dir: join(scriptRoot, "src"), how: "anclaje al script (scripts/..)" };
  }

  // Corriendo desde la raíz del frontend.
  if (hasSrc(process.cwd())) {
    return { dir: "src", how: "directorio actual" };
  }

  // Monorepo: CWD es la raíz del repo y el frontend es un subdirectorio
  // (exige package.json — un src/ suelto sin proyecto no cuenta).
  const mono = join(process.cwd(), "frontend");
  if (hasSrc(mono) && existsSync(join(mono, "package.json"))) {
    return { dir: join(mono, "src"), how: "monorepo detectado (./frontend)" };
  }

  return null;
}

const target = resolveTarget();
if (!target) {
  console.error("⛔ No pude resolver la raíz del frontend (directorio con src/).\n");
  console.error("Probado, en orden:");
  console.error(`  · --root            → ${rootValue ? "inválido" : "no especificado"}`);
  console.error(`  · scripts/..        → ${dirname(dirname(fileURLToPath(import.meta.url)))} (sin src/)`);
  console.error(`  · directorio actual → ${process.cwd()} (sin src/)`);
  console.error(
    `  · ./frontend        → ${join(process.cwd(), "frontend")} (sin src/ o sin package.json)\n`,
  );
  console.error("Corre desde la raíz del frontend, o pásala explícita:");
  console.error("  node scripts/g14-diagnose-css-imports.mjs --fix");
  console.error("  node scripts/g14-diagnose-css-imports.mjs --root <ruta-del-frontend> --fix");
  process.exit(2);
}

const files = [...walk(target.dir)];
console.log(
  `g14-diagnose-css-imports v4 · objetivo: ${resolve(target.dir)} (${target.how})` +
    ` · ${files.length} archivo(s)${fix ? " · con --fix" : ""}`,
);

let totalFindings = 0;
let totalFixed = 0;
let remainingFindings = 0;

/** Encabezado de archivo + infos (ℹ️ no cuentan al exit) + hallazgos. */
function reportFile(file, findings, infos) {
  console.log(`\n${file}`);
  for (const info of infos) {
    console.log(`  ℹ️ L${info.line} · ${info.detail}`);
  }
  if (findings.length > 0) printFindings(findings);
}

for (const file of files) {
  const { findings, infos } = analyze(file);
  if (findings.length === 0 && infos.length === 0) continue;

  reportFile(file, findings, infos);
  totalFindings += findings.length;

  if (fix) {
    const report = applyFix(file, findings);
    if (report.length > 0) {
      console.log(`  ✅ REPARADO: ${report.join(" · ")}`);
      totalFixed += report.length;
    }
  }
}

// Tras aplicar fixes, SIEMPRE re-escanear para reportar el estado REAL restante
// (el exit code debe basarse en el estado final, no en el inicial).
if (fix) {
  if (totalFixed > 0) console.log(`\n── Re-escaneo tras --fix ──`);
  for (const file of files) {
    const { findings, infos } = analyze(file);
    if (findings.length === 0 && infos.length === 0) continue;
    reportFile(file, findings, infos);
    remainingFindings += findings.length;
  }
} else {
  remainingFindings = totalFindings;
}

console.log(
  `\nResumen: ${totalFindings} hallazgo(s)` +
    (fix ? ` · ${totalFixed} reparación(es) automática(s) · ${remainingFindings} pendiente(s) MANUAL(ES)` : "") +
    (fix && totalFixed > 0 && remainingFindings === 0 ? " 🎉" : ""),
);
console.log(
  remainingFindings > 0
    ? "Pendientes: cada hallazgo MANUAL necesita la ruta original del módulo (o eliminar la declaración si es código muerto)."
    : "Estado: limpio.",
);

process.exit(remainingFindings > 0 ? 1 : 0);
