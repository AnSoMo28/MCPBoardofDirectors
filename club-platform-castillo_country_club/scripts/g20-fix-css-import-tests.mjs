#!/usr/bin/env node
/**
 * ============================================================================
 * G20 — Matriz de regresión: fixMissingCssImport v2 + repro forense de v1
 * ============================================================================
 * Sujeto: tools/architecture-guardian.ts → fixMissingCssImport (v1, L1782-1803)
 *         y guard de checkC06_MissingCSSImport (L1311).
 *
 * Contiene:
 *   - v1 VERBATIM (puerto JS, types stripped) con las constantes REALES del
 *     guardian (HEADER_SCAN_LINES=40 L313 · isCommentLine L426-429).
 *   - v2 (puerto JS exacto de tools/fixMissingCssImport.G20.ts).
 *   - 16 fixtures: 8 prueban v2 correcto DONDE v1 corrompía (repro forense
 *     byte-exacta), 4 documentan paridad (v1 estaba bien ahí — la auditoría
 *     es bidireccional), más CRLF, fail-closed, directiva y banners largos.
 *   - Idempotencia (re-corrida → fixes:0) y lockstep checker↔fixer.
 *
 * Uso:   node scripts/g20-fix-css-import-tests.mjs
 * Exit:  0 = todo verde · 1 = fallos (scratch conservado para debug).
 * Requisito: Node >= 20. Cero dependencias. Escribe SOLO en scripts/g20-scratch.
 * ============================================================================
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRATCH = join(HERE, "g20-scratch");

/* ── Constantes y helpers REALES del guardian (verbatim) ─────────────────── */
const HEADER_SCAN_LINES = 40; // architecture-guardian.ts L313

function isCommentLine(line) { // architecture-guardian.ts L426-429, verbatim
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--");
}

/* ── v1 VERBATIM (L1782-1803, types stripped) — el sujeto auditado ───────── */
function fixMissingCssImportV1(absTsxPath, text) {
  if (/import\s+["'][^"']*\.css["']/.test(text)) return { text, fixes: 0 };
  const cssPath = absTsxPath.replace(/\.tsx$/, ".css");
  if (!existsSync(cssPath)) return { text, fixes: 0 };
  const lines = text.split("\n");
  let lastImport = -1;
  for (let i = 0; i < Math.min(lines.length, 500); i += 1) {
    if (/^import\s/.test(lines[i])) lastImport = i;
  }
  let insertAt;
  if (lastImport !== -1) {
    insertAt = lastImport + 1;
  } else {
    let i = 0;
    while (i < lines.length && i < HEADER_SCAN_LINES * 2 && (lines[i].trim() === "" || isCommentLine(lines[i]))) {
      i += 1;
    }
    insertAt = i;
  }
  lines.splice(insertAt, 0, `import "./${basename(cssPath)}";`);
  return { text: lines.join("\n"), fixes: 1 };
}

/* ── v2 — puerto JS EXACTO de tools/fixMissingCssImport.G20.ts ───────────── */
function maskLineForBraces(line, state) {
  let out = "";
  let i = 0;
  const n = line.length;
  while (i < n) {
    if (state.inBlockComment) {
      const end = line.indexOf("*/", i);
      if (end === -1) return out;
      state.inBlockComment = false;
      i = end + 2;
      continue;
    }
    const ch = line[i];
    if (ch === "/" && line[i + 1] === "/") return out;
    if (ch === "/" && line[i + 1] === "*") {
      state.inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < n && line[i] !== quote) i += line[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function fixMissingCssImportV2(absTsxPath, text) {
  const cssReferenced =
    /import\s*["'][^"'\n]*\.css["']/.test(text) ||
    /from\s*["'][^"'\n]*\.css["']/.test(text) ||
    /\b(?:import|require)\s*\(\s*["'][^"'\n]*\.css["']/.test(text);
  if (cssReferenced) return { text, fixes: 0 };
  if (!absTsxPath.endsWith(".tsx")) return { text, fixes: 0 };
  const cssPath = absTsxPath.replace(/\.tsx$/, ".css");
  if (!existsSync(cssPath)) return { text, fixes: 0 };

  const lines = text.split("\n");
  const firstNl = text.indexOf("\n");
  const crlf = firstNl > 0 && text[firstNl - 1] === "\r";
  const importLine = `import "./${basename(cssPath)}";${crlf ? "\r" : ""}`;

  const state = { inBlockComment: false };
  let inDeclaration = false;
  let depth = 0;
  let lastCompleted = -1;
  let firstCode = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const wasInBlock = state.inBlockComment;
    const masked = maskLineForBraces(lines[i], state);
    const skeleton = masked.trim();

    if (inDeclaration) {
      for (const ch of masked) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (depth <= 0 && /["';]$/.test(skeleton)) {
        inDeclaration = false;
        depth = 0;
        lastCompleted = i;
      }
      continue;
    }

    if (skeleton === "") continue;

    if (!wasInBlock && /^["']use\s+(?:client|server|strict)["'];?$/.test(lines[i].trim())) {
      lastCompleted = i;
      continue;
    }

    if (/^import(?!\.)(?!\s*\()/.test(skeleton)) {
      inDeclaration = true;
      depth = 0;
      for (const ch of masked) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (depth <= 0 && /["';]$/.test(skeleton)) {
        inDeclaration = false;
        lastCompleted = i;
      }
      continue;
    }

    firstCode = i;
    break;
  }

  if (inDeclaration) return { text, fixes: 0 };

  const insertAt = lastCompleted >= 0 ? lastCompleted + 1 : firstCode;
  if (insertAt < 0) return { text, fixes: 0 };

  lines.splice(insertAt, 0, importLine);
  return { text: lines.join("\n"), fixes: 1 };
}

/* ── Guards para el lockstep checker↔fixer ───────────────────────────────── */
const fixerGuardV2 = (t) =>
  /import\s*["'][^"'\n]*\.css["']/.test(t) ||
  /from\s*["'][^"'\n]*\.css["']/.test(t) ||
  /\b(?:import|require)\s*\(\s*["'][^"'\n]*\.css["']/.test(t);
const checkerGuardV1 = (t) => /import\s+["'][^"']*\.css["']/.test(t);

/* ── Helpers de fixtures ─────────────────────────────────────────────────── */
const J = (...ls) => ls.join("\n");

function bannerSlash(n) {
  return Array.from({ length: n }, (_, i) => `// línea ${i + 1} del banner`);
}
function bannerBlock(n) {
  // n líneas TOTALES de comentario de bloque: /* + (n-2) interiores + */
  const inner = Array.from({ length: n - 2 }, (_, i) => ` * línea ${i + 1}`);
  return ["/*", ...inner, "*/"];
}

/* ── LA FIRMA DE CAMPO (G16/G19): el radar pre-corrupción ────────────────── */
const RADAR_INPUT = J(
  'import { useMemo } from "react";',
  "import type {",
  "  AnomalyBlip,",
  "  WellnessSnapshot,",
  '} from "../types";',
  "",
  "interface Props {",
  "  snapshot: WellnessSnapshot;",
  "}",
  "",
  "export function WellnessAnomalyRadar({ snapshot }: Props) {",
  "  return null;",
  "}",
);
const RADAR_FIXED = J(
  'import { useMemo } from "react";',
  "import type {",
  "  AnomalyBlip,",
  "  WellnessSnapshot,",
  '} from "../types";',
  'import "./Radar.css";',
  "",
  "interface Props {",
  "  snapshot: WellnessSnapshot;",
  "}",
  "",
  "export function WellnessAnomalyRadar({ snapshot }: Props) {",
  "  return null;",
  "}",
);

/* ── Fixtures ────────────────────────────────────────────────────────────── */
const CASES = [
  {
    id: 1,
    name: "radar-multiline-last",
    desc: "LA firma de campo: import type multi-línea como ÚLTIMO import",
    files: { "Radar.css": "/* css */\n", "Radar.tsx": RADAR_INPUT },
    target: "Radar.tsx",
    input: RADAR_INPUT,
    v2: { fixes: 1, text: RADAR_FIXED },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.split("\n")[2] === 'import "./Radar.css";',
    forensicNote: "v1 inserta EN la línea 3 (dentro de las llaves) — reproducción byte-exacta de la corrupción de los 11 archivos",
  },
  {
    id: 2,
    name: "multiline-not-last",
    desc: "multi-línea SEGUIDO de un import single-line (v1 acertaba aquí)",
    files: { "F2.css": "/* css */\n" },
    target: "F2.tsx",
    input: J(
      "import type {",
      "  A,",
      '} from "../types";',
      'import { useX } from "./hooks";',
      "",
      "export const K = 1;",
    ),
    v2: {
      fixes: 1,
      text: J(
        "import type {",
        "  A,",
        '} from "../types";',
        'import { useX } from "./hooks";',
        'import "./F2.css";',
        "",
        "export const K = 1;",
      ),
    },
    parity: true,
  },
  {
    id: 3,
    name: "single-line-only",
    desc: "solo imports single-line (paridad con v1)",
    files: { "F3.css": "/* css */\n" },
    target: "F3.tsx",
    input: J('import { a } from "./a";', 'import { b } from "./b";', "", "export const C = 1;"),
    v2: {
      fixes: 1,
      text: J('import { a } from "./a";', 'import { b } from "./b";', 'import "./F3.css";', "", "export const C = 1;"),
    },
    parity: true,
  },
  {
    id: 4,
    name: "no-imports-banner",
    desc: "banner JSDoc + código, sin imports → antes del código",
    files: { "F4.css": "/* css */\n" },
    target: "F4.tsx",
    input: J("/**", " * @module F4", " * Banner de documentación.", " */", "export const F4 = 1;"),
    v2: {
      fixes: 1,
      text: J("/**", " * @module F4", " * Banner de documentación.", " */", 'import "./F4.css";', "export const F4 = 1;"),
    },
    parity: true,
  },
  {
    id: 5,
    name: "no-imports-no-banner",
    desc: "código en la línea 0 → import en la línea 0",
    files: { "F5.css": "/* css */\n" },
    target: "F5.tsx",
    input: "export const F5 = 1;",
    v2: { fixes: 1, text: J('import "./F5.css";', "export const F5 = 1;") },
  },
  {
    id: 6,
    name: "already-side-effect",
    desc: "ya tiene el import side-effect → guard, fixes:0",
    files: { "F6.css": "/* css */\n" },
    target: "F6.tsx",
    input: J('import "./F6.css";', 'import { a } from "./a";', "", "export const X = 1;"),
    v2: { fixes: 0, text: J('import "./F6.css";', 'import { a } from "./a";', "", "export const X = 1;") },
  },
  {
    id: 7,
    name: "already-modules",
    desc: "import NOMBRADO de .module.css → v2 no duplica (v1 duplicaba)",
    files: { "F7.module.css": "/* mod */\n", "F7.css": "/* css */\n" },
    target: "F7.tsx",
    input: J(
      'import styles from "./F7.module.css";',
      'import { a } from "./a";',
      "",
      "export const X = 1;",
    ),
    v2: {
      fixes: 0,
      text: J('import styles from "./F7.module.css";', 'import { a } from "./a";', "", "export const X = 1;"),
    },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.includes('import "./F7.css";'),
    forensicNote: "v1 agrega el side-effect ADEMÁS del modules → doble import del CSS",
  },
  {
    id: 8,
    name: "crlf",
    desc: "archivo CRLF → línea insertada con \\r (sin EOL mixto)",
    files: { "F8.css": "/* css */\n" },
    target: "F8.tsx",
    input: [
      'import { a } from "./a";',
      "import type {",
      "  A,",
      '} from "../types";',
      "",
      "export const X = 1;",
    ].join("\r\n"),
    v2: {
      fixes: 1,
      text: [
        'import { a } from "./a";',
        "import type {",
        "  A,",
        '} from "../types";',
        'import "./F8.css";',
        "",
        "export const X = 1;",
      ].join("\r\n"),
    },
  },
  {
    id: 9,
    name: "unterminated-fail-closed",
    desc: "declaración de import SIN cerrar → v2 se reusa (fail-closed)",
    files: { "F9.css": "/* css */\n" },
    target: "F9.tsx",
    input: J("import type {", "  A,", "  B,", "", "export const x = 1;"),
    v2: { fixes: 0, text: J("import type {", "  A,", "  B,", "", "export const x = 1;") },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.split("\n")[1] === 'import "./F9.css";',
    forensicNote: "v1 ESCRIBE igual dentro de un archivo ya roto (fail-open: agravaba)",
  },
  {
    id: 10,
    name: "comment-inside-braces",
    desc: "comentarios DENTRO del import multi-línea → completa en } from",
    files: { "F10.css": "/* css */\n" },
    target: "F10.tsx",
    input: J(
      "import {",
      "  a, // primero",
      "  // hueco deliberado",
      "  b,",
      '} from "./x";',
      "",
      "export const X = 1;",
    ),
    v2: {
      fixes: 1,
      text: J(
        "import {",
        "  a, // primero",
        "  // hueco deliberado",
        "  b,",
        '} from "./x";',
        'import "./F10.css";',
        "",
        "export const X = 1;",
      ),
    },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.split("\n")[1] === 'import "./F10.css";',
    forensicNote: "v1 inserta en la línea 2 (dentro de las llaves que contienen comentarios)",
  },
  {
    id: 11,
    name: "blank-gap",
    desc: "import + líneas en blanco + código → pegado al import (paridad v1)",
    files: { "F11.css": "/* css */\n" },
    target: "F11.tsx",
    input: J('import { a } from "./a";', "", "", "const x = 1;"),
    v2: {
      fixes: 1,
      text: J('import { a } from "./a";', 'import "./F11.css";', "", "", "const x = 1;"),
    },
    parity: true,
  },
  {
    id: 12,
    name: "self-import-guard",
    desc: "path .ts (no .tsx) → v2 se reusa; v1 emitía auto-import circular",
    files: { "Foo.ts": "export const foo = 1;\n" },
    target: "Foo.ts",
    input: "export const foo = 1;",
    v2: { fixes: 0, text: "export const foo = 1;" },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.startsWith('import "./Foo.ts";'),
    forensicNote: 'v1 emite `import "./Foo.ts";` — auto-import circular (latente: el caller filtra .tsx, L1816)',
  },
  {
    id: 13,
    name: "directive-prologue",
    desc: '"use client"; + imports → después del último import, no antes de la directiva',
    files: { "F13.css": "/* css */\n" },
    target: "F13.tsx",
    input: J('"use client";', "", 'import { a } from "./a";', "", "export function X() {}"),
    v2: {
      fixes: 1,
      text: J('"use client";', "", 'import { a } from "./a";', 'import "./F13.css";', "", "export function X() {}"),
    },
  },
  {
    id: 14,
    name: "two-multiline",
    desc: "DOS imports multi-línea seguidos → tras el cierre del segundo",
    files: { "F14.css": "/* css */\n" },
    target: "F14.tsx",
    input: J(
      "import type {",
      "  A,",
      '} from "../types";',
      "import {",
      "  useX,",
      '} from "./hooks";',
      "",
      "export const K = 1;",
    ),
    v2: {
      fixes: 1,
      text: J(
        "import type {",
        "  A,",
        '} from "../types";',
        "import {",
        "  useX,",
        '} from "./hooks";',
        'import "./F14.css";',
        "",
        "export const K = 1;",
      ),
    },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.split("\n")[4] === 'import "./F14.css";',
    forensicNote: "v1 inserta en la línea 5 (dentro de la SEGUNDA declaración)",
  },
  {
    id: 15,
    name: "banner-slash-largo",
    desc: "banner // de 85 líneas (cap v1: 80) → v2 tras el banner; v1 parte el banner",
    files: { "F15.css": "/* css */\n" },
    target: "F15.tsx",
    input: J(...bannerSlash(85), "export const X = 1;"),
    v2: { fixes: 1, text: J(...bannerSlash(85), 'import "./F15.css";', "export const X = 1;") },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.split("\n")[80] === 'import "./F15.css";',
    forensicNote: "v1 inserta en la línea 81 — DENTRO del banner (cap HEADER_SCAN_LINES*2=80)",
  },
  {
    id: 16,
    name: "banner-block-largo",
    desc: "banner /* */ de 85 líneas → v2 tras el banner; v1 lo inserta DENTRO del comentario (fix fantasma)",
    files: { "F16.css": "/* css */\n" },
    target: "F16.tsx",
    input: J(...bannerBlock(85), "export const X = 1;"),
    v2: { fixes: 1, text: J(...bannerBlock(85), 'import "./F16.css";', "export const X = 1;") },
    forensic: (v1r) => v1r.fixes === 1 && v1r.text.split("\n")[80] === 'import "./F16.css";',
    forensicNote: "v1 inserta en la línea 81 — DENTRO del bloque /* */: el import queda COMENTADO (fix fantasma: reporta 1 y escribe, pero no prende)",
  },
];

/* ── Runner ──────────────────────────────────────────────────────────────── */
let pass = 0;
let forensicsOk = 0;
let forensicsTotal = 0;
let parityOk = 0;
let parityTotal = 0;
let idempotencyOk = 0;
let idempotencyTotal = 0;
const failures = [];

function firstDiff(expected, actual) {
  const e = expected.split("\n");
  const a = actual.split("\n");
  const n = Math.max(e.length, a.length);
  for (let i = 0; i < n; i += 1) {
    if (e[i] !== a[i]) {
      return `línea ${i + 1}: esperado ${JSON.stringify(e[i] ?? "<EOF>")} · obtenido ${JSON.stringify(a[i] ?? "<EOF>")}`;
    }
  }
  return "(sin diff de línea — ¿longitudes?)";
}

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });

console.log("G20 — Matriz de regresión fixMissingCssImport v2 + repro forense de v1");
console.log(`Scratch: ${SCRATCH}`);
console.log("");

for (const c of CASES) {
  const dir = join(SCRATCH, String(c.id).padStart(2, "0"));
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(c.files)) {
    writeFileSync(join(dir, name), content, "utf8");
  }
  const target = join(dir, c.target);

  const v2r = fixMissingCssImportV2(target, c.input);
  let ok = v2r.fixes === c.v2.fixes && v2r.text === c.v2.text;
  let note = "";

  if (!ok) {
    note =
      v2r.fixes !== c.v2.fixes
        ? `fixes esperado ${c.v2.fixes}, obtenido ${v2r.fixes}`
        : firstDiff(c.v2.text, v2r.text);
    failures.push(`[${c.id}] ${c.name}: ${note}`);
  }

  // Forense de v1: reproduce/documenta el comportamiento auditado.
  let forensicMsg = "";
  if (c.forensic) {
    forensicsTotal += 1;
    const v1r = fixMissingCssImportV1(target, c.input);
    if (c.forensic(v1r)) {
      forensicsOk += 1;
      forensicMsg = ` · forense v1 OK (${c.forensicNote})`;
    } else {
      failures.push(`[${c.id}] forense v1 NO reproducido: ${c.forensicNote}`);
      forensicMsg = " · FORENSE v1 FALLO";
    }
  }

  // Paridad: documenta dónde v1 estaba BIEN (auditoría bidireccional).
  let parityMsg = "";
  if (c.parity) {
    parityTotal += 1;
    const v1r = fixMissingCssImportV1(target, c.input);
    if (v1r.fixes === c.v2.fixes && v1r.text === c.v2.text) {
      parityOk += 1;
      parityMsg = " · paridad v1 OK";
    } else {
      failures.push(`[${c.id}] paridad v1 rota (v1 debía coincidir): ${firstDiff(c.v2.text, v1r.text)}`);
      parityMsg = " · PARIDAD v1 FALLO";
    }
  }

  // Idempotencia: re-corrida sobre la salida → fixes:0, texto idéntico.
  let idemMsg = "";
  if (v2r.fixes === 1) {
    idempotencyTotal += 1;
    const again = fixMissingCssImportV2(target, v2r.text);
    if (again.fixes === 0 && again.text === v2r.text) {
      idempotencyOk += 1;
      idemMsg = " · idempotente";
    } else {
      failures.push(`[${c.id}] NO idempotente: segunda corrida fixes=${again.fixes}`);
      idemMsg = " · IDEMPOTENCIA FALLO";
    }
  }

  if (ok) pass += 1;
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `[${String(c.id).padStart(2, "0")}] ${c.name.padEnd(24)} ${status}${parityMsg}${idemMsg}${forensicMsg}`,
  );
  if (!ok) {
    console.log(`      ↳ ${note}`);
    console.log(`      ↳ ${c.desc}`);
  }
}

/* ── Lockstep checker↔fixer ──────────────────────────────────────────────── */
console.log("");
let lockstepOk = true;
const F6INPUT = CASES[5].input; // ya tiene import side-effect
const F7INPUT = CASES[6].input; // import NOMBRADO de .module.css
const lockstepChecks = [
  { label: "v1 checker NO ve el import modules → flaguearía C-06 (autoFixable)", run: () => checkerGuardV1(F7INPUT) === false },
  { label: "fixer v2 SÍ lo ve → se reusa (no duplica)", run: () => fixerGuardV2(F7INPUT) === true },
  { label: "par v1-checker + v2-fixer ROTO (flaguea ⇔ reusa) — por eso el parche de checkC06", run: () => checkerGuardV1(F7INPUT) !== fixerGuardV2(F7INPUT) },
  { label: "F6 (side-effect ya presente): ambos guards true", run: () => fixerGuardV2(F6INPUT) === true && checkerGuardV1(F6INPUT) === true },
  { label: "F1 (radar limpio): ambos guards false", run: () => fixerGuardV2(RADAR_INPUT) === false && checkerGuardV1(RADAR_INPUT) === false },
];
for (const lc of lockstepChecks) {
  const r = lc.run();
  console.log(`  lockstep ${r ? "OK " : "FALLO"} — ${lc.label}`);
  if (!r) {
    lockstepOk = false;
    failures.push(`lockstep: ${lc.label}`);
  }
}

/* ── Veredicto ───────────────────────────────────────────────────────────── */
console.log("");
console.log(
  `Resultado: ${pass}/${CASES.length} v2 PASS · forenses v1 ${forensicsOk}/${forensicsTotal} · paridad v1 ${parityOk}/${parityTotal} · idempotencia ${idempotencyOk}/${idempotencyTotal} · lockstep ${lockstepOk ? "OK" : "FALLO"}`,
);

if (failures.length > 0) {
  console.error(`\nFALLOS (${failures.length}) — scratch conservado en ${SCRATCH}:`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}

rmSync(SCRATCH, { recursive: true, force: true });
console.log(`\nTodo verde. Scratch eliminado. El parche (tools/fixMissingCssImport.G20.ts) está listo para aplicar al guardian.`);
process.exit(0);
