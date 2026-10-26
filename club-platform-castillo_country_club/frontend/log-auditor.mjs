#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   LOG AUDITOR — condensa y audita logs de Architecture Guardian
   ───────────────────────────────────────────────────────────────────────────
   Problema: `npx tsx tools/architecture-guardian.ts > salida.log` produce
   decenas de miles de líneas (una por violación + sugerencia). Nadie —ni un
   humano ni un LLM— puede auditar eso en bruto. Este tool los convierte en
   evidencia auditable.

   Acepta DOS formatos de entrada (autodetectados):
     1. Reporte humano  (salida por defecto del guardian)  → parser streaming
     2. Reporte --json  (recomendado: exacto, sin riesgo de parseo) → directo

   Tolerancia de entrada (endurecimiento v2 — lecciones de Windows):
     · BOM UTF-8 y UTF-16 LE/BE (redirección `>` desde PowerShell) → decodificados
     · UTF-16 LE sin BOM → detectado por heurística ({\0, tamaño par)
     · JSON truncado o corrupto → error EXPLÍCITO con evidencia (cola del
       archivo), no un genérico "formato no reconocido"
     · JSON válido ajeno al guardian → mensaje específico con las claves halladas
     · Cualquier fallo de reconocimiento → el error reporta bytes, encoding y
       hex de cabecera para autodiagnosticar el input

   Reparación de evidencia (v3):
     · Mojibake CP437 (PowerShell decodifica el stdout UTF-8 con la codepage
       OEM y reescribe UTF-16: §→┬º, —→ΓÇö) — restaurado por línea de mensaje
       y reportado como advertencia de integridad con la causa exacta

   Produce DOS salidas junto al input:
     <input>.digest.md     — digest legible y ACOTADO (tablas, firmas, muestras)
     <input>.digest.json   — agregados completos para consumo máquina

   Qué audita:
     · Volumen y distribución (errores/warns, por regla, por archivo, por capa)
     · Firmas de mensaje normalizadas (clases reales de error, no ocurrencias)
     · Hotspots repetidos (misma regla × mismo archivo)
     · Pareto (cuántos archivos concentran el problema)
     · Integridad del propio log: truncado, totales ≠ SUMMARY, líneas no
       reconocidas, reportes concatenados, archivos ilegibles (UNREADABLE)

   Uso:
     node log-auditor.mjs <salida.log | report.json> [--top N] [--md <path>] [--json <path>]
     node log-auditor.mjs --help

   Exit codes (familia guardian):
     0  digest generado (aunque haya warnings de integridad; van en el digest)
     1  input ilegible o inexistente
     2  formato no reconocido (0 violaciones parseadas)
     3  error de CLI (flag desconocido, input faltante)

   Cero dependencias · Node >= 18 · ESM · determinista (orden estable por
   conteo descendente y desempate alfabético).
   ═══════════════════════════════════════════════════════════════════════════ */

import { createReadStream } from "node:fs";
import { readFile, writeFile, open } from "node:fs/promises";
import { createInterface } from "node:readline";
import { basename } from "node:path";

/* ── utilidades ─────────────────────────────────────────────────────────── */

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s) => s.replace(ANSI_RE, "");

/* ── reparación de mojibake CP437 (captura vía PowerShell) ──────────────────
   PowerShell 5.1 decodifica el stdout UTF-8 de node con la codepage OEM
   (CP437/CP850) y reescribe UTF-16: los bytes UTF-8 de §/—/·/→ quedan
   "interpretados" como caracteres CP437 (┬º, ΓÇö, ┬·, ΓåÊ). Es reversible:
   re-codificar cada char a su byte CP437 y decodificar UTF-8 estricto.
   Fail-closed: solo si TODOS los no-ASCII mapean, el UTF-8 es válido, y la
   línea contiene un marcador que jamás aparece legítimo (box-drawing, Γ, Ã). */

const CP437_HIGH =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0";
const CP437_TO_BYTE = new Map();
for (let i = 0; i < CP437_HIGH.length; i += 1) CP437_TO_BYTE.set(CP437_HIGH.codePointAt(i), 0x80 + i);

const MOJIBAKE_GATE = /[\u2500-\u25FF\u0393\u00C3\u00C2]/; // box-drawing, Γ, Ã, Â
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });

function repairMojibake(s) {
  if (typeof s !== "string" || !MOJIBAKE_GATE.test(s)) return null;
  const bytes = Buffer.allocUnsafe(s.length);
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) { bytes[n++] = cp; continue; }
    const b = CP437_TO_BYTE.get(cp);
    if (b === undefined) return null; // no puede ser mojibake CP437
    bytes[n++] = b;
  }
  try { return UTF8_FATAL.decode(bytes.subarray(0, n)); } catch { return null; }
}

/** Repara best-effort y cuenta las reparaciones para el autodiagnóstico. */
function repairText(s, agg) {
  if (typeof s !== "string") return s;
  const r = repairMojibake(s);
  if (r === null || r === s) return s;
  agg.meta.mojibakeRepaired += 1;
  return r;
}

/** Firma normalizada: colapsa lo volátil para revelar la CLASE de error. */
function signature(msg) {
  return msg
    .replace(/"([^"]*)"/g, '"«q»"')
    .replace(/'([^']*)'/g, "'«q»'")
    .replace(/#(?:[0-9a-fA-F]{3,8})\b/g, "#HEX")
    .replace(/rgba?\([^)]*\)/g, "RGB()")
    .replace(/(?:[\w@.[\]-]+\/)+[\w.[\]-]+\.(?:tsx?|jsx?|mjs|cjs|css|scss|json|html)\b/g, "PATH")
    .replace(/\b\d+(?:\.\d+)?\b/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/** Capa arquitectónica inferida de la ruta (src/<layer>/…). */
function layerOf(file) {
  const m = file.match(/(?:^|\/)src\/([^/]+)\//);
  if (m) return m[1];
  if (/(?:^|\/)src\//.test(file)) return "(src root)";
  return "(outside src)";
}

const pct = (n, total) => (total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`);

function sortedEntries(map, keyFn = (v) => v.count) {
  return [...map.entries()].sort((a, b) => {
    const d = keyFn(b[1]) - keyFn(a[1]);
    return d !== 0 ? d : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
}

function fmtViolation(v) {
  return `${v.file}:L${v.line} · ${v.message}`;
}

/* ── tipos internos ──────────────────────────────────────────────────────── */

/** @typedef {{severity:"error"|"warn", rule:string, line:number, message:string,
 *             autoFixable:boolean, suggestion?:string, file:string}} Viol */

function newAgg() {
  return {
    meta: { input: "", format: "human", toolVersion: null, root: null,
            generatedAt: null, runs: 0, linesConsumed: 0,
            encoding: "utf-8", byteLength: 0, mojibakeRepaired: 0 },
    claimed: { errors: null, warnings: null, autoFixable: null,
               filesScanned: null, score: null, threshold: null,
               scale: null, durationMs: null, verdict: null },
    readErrors: [],
    violations: [],
    integrity: { warnings: [], unmatched: 0, unmatchedSamples: [],
                 orphanSuggestions: 0, sawSummary: false, sawVerdict: false },
    fileScores: new Map(), // solo modo JSON: file → {score, applicable}
  };
}

/* ── parser: reporte humano (streaming, línea a línea) ───────────────────── */

const RE_HEADER = /^ARCHITECTURE GUARDIAN v([\w.-]+) — root: (.+)$/;
const RE_STATS = /^files: (\d+) · errors: (\d+) · warnings: (\d+) · auto-fixable: (\d+) · (\d+)ms$/;
const RE_VIOL = /^[ \t]{2}(ERROR|WARN)[ \t]+([A-Z][A-Z0-9]*(?:-\d+)+) · L(\d+) · (.*)$/;
const RE_SUGG = /^[ \t]{8}→ (.*)$/;
const RE_UNREAD_HDR = /^UNREADABLE \(blocking — the gate could not verify\):$/;
const RE_UNREAD_ITEM = /^[ \t]{2}✗ (.*)$/;
const RE_SUMMARY = /^SUMMARY$/;
const RE_SUM_KV = /^[ \t]{2}(errors|warnings|auto-fixable):[ \t]+(\d+)$/;
const RE_SUM_SCORE = /^[ \t]{2}score:[ \t]+([\d.]+) \/ (\d+) \(threshold (\d+)\)$/;
const RE_VERDICT = /^(PASS ✅|FAIL ❌) — (.+)$/;
const RE_FIXNOTE = /^--fix applied \d+ safe fix\(es\)\. Re-run to verify\.$/;
const RE_REGISTRY = /^RULE REGISTRY \(/;

/* ── parser: reporte humano — máquina de estados compartida ────────────────
   El mismo ingestLine sirve para streaming (utf-8) y para texto decodificado
   (utf-16): idéntica semántica, un solo lugar de verdad. */

function makeHumanParser(agg) {
  let currentFile = null;
  let lastViol = null;
  let state = "body"; // body | unreadable | registry
  let first = true;

  return function ingestLine(raw) {
    if (first) { raw = raw.replace(/^\uFEFF/, ""); first = false; }
    agg.meta.linesConsumed += 1;
    let line = stripAnsi(raw).replace(/\r$/, "");
    const fixed = repairMojibake(line);
    if (fixed !== null && fixed !== line) { line = fixed; agg.meta.mojibakeRepaired += 1; }
    if (line === "") return;

    if (state === "registry") return; // registry va siempre al final
    if (RE_REGISTRY.test(line)) { state = "registry"; return; }
    if (RE_FIXNOTE.test(line)) return;

    if (state === "unreadable") {
      const m = line.match(RE_UNREAD_ITEM);
      if (m) { agg.readErrors.push(m[1]); return; }
      state = "body"; // sección terminada al primer no-ítem
    }

    let m;
    if ((m = line.match(RE_HEADER))) {
      agg.meta.runs += 1;
      if (agg.meta.runs > 1) {
        agg.integrity.warnings.push(
          `el log contiene ${agg.meta.runs} reportes concatenados (agregados juntos)`);
      }
      agg.meta.toolVersion = m[1]; agg.meta.root = m[2];
      currentFile = null; lastViol = null;
      return;
    }
    if ((m = line.match(RE_STATS))) {
      agg.claimed.filesScanned = +m[1]; agg.claimed.errors = +m[2];
      agg.claimed.warnings = +m[3]; agg.claimed.autoFixable = +m[4];
      agg.claimed.durationMs = +m[5];
      return;
    }
    if (RE_UNREAD_HDR.test(line)) { state = "unreadable"; return; }
    if (RE_SUMMARY.test(line)) { agg.integrity.sawSummary = true; currentFile = null; return; }
    if ((m = line.match(RE_SUM_KV))) {
      agg.claimed[m[1] === "auto-fixable" ? "autoFixable" : m[1]] = +m[2];
      return;
    }

    if (agg.integrity.sawSummary) {
      if ((m = line.match(RE_SUM_SCORE))) {
        agg.claimed.score = +m[1]; agg.claimed.scale = +m[2]; agg.claimed.threshold = +m[3];
        return;
      }
      if ((m = line.match(RE_VERDICT))) {
        agg.integrity.sawVerdict = true; agg.claimed.verdict = m[1];
        return;
      }
      return; // línea suelta post-SUMMARY que no reconocimos: irrelevante
    }

    if ((m = line.match(RE_VIOL))) {
      let message = m[4];
      let autoFixable = false;
      if (message.endsWith(" [auto-fixable]")) {
        autoFixable = true; message = message.slice(0, -15);
      }
      lastViol = {
        severity: m[1] === "ERROR" ? "error" : "warn",
        rule: m[2], line: +m[3], message, autoFixable,
        file: currentFile ?? "(sin archivo)",
      };
      agg.violations.push(lastViol);
      return;
    }
    if ((m = line.match(RE_SUGG))) {
      if (lastViol !== null) { lastViol.suggestion = m[1]; lastViol = null; }
      else agg.integrity.orphanSuggestions += 1;
      return;
    }

    // Línea sin indentar en el cuerpo → encabezado de archivo…
    if (/^[^\s]/.test(line)) { currentFile = line; lastViol = null; return; }

    // …pero si empieza indentada y PARECE una violación, es drift de formato.
    if (/^[ \t]{2,}(ERROR|WARN)\b/.test(line)) {
      agg.integrity.unmatched += 1;
      if (agg.integrity.unmatchedSamples.length < 5) agg.integrity.unmatchedSamples.push(line.trim());
    }
  };
}

async function parseHumanStream(inputPath, agg) {
  const ingestLine = makeHumanParser(agg);
  const rl = createInterface({ input: createReadStream(inputPath, "utf8"), crlfDelay: Infinity });
  for await (const raw of rl) ingestLine(raw);
}

function parseHumanText(text, agg) {
  const ingestLine = makeHumanParser(agg);
  for (const raw of text.split("\n")) ingestLine(raw);
}

/* ── parser: reporte --json (autoritativo) ──────────────────────────────── */

function ingestJsonReport(r, agg) {
  agg.meta.format = "json";
  agg.meta.toolVersion = r.version ?? null;
  agg.meta.root = r.root ?? null;
  agg.meta.generatedAt = r.generatedAt ?? null;
  agg.meta.runs = 1;
  agg.claimed = {
    errors: r.errors.length, warnings: r.warnings.length,
    autoFixable: Array.isArray(r.autoFixable) ? r.autoFixable.length : null,
    filesScanned: r.filesScanned ?? null, score: r.overallScore ?? null,
    threshold: r.passThreshold ?? null, scale: r.scale ?? null,
    durationMs: r.durationMs ?? null,
    verdict: r.passed ? "PASS ✅" : "FAIL ❌",
  };
  agg.integrity.sawSummary = true;
  agg.integrity.sawVerdict = true;
  agg.readErrors = Array.isArray(r.readErrors) ? r.readErrors : [];
  for (const v of [...r.errors, ...r.warnings]) {
    agg.violations.push({
      severity: v.severity === "error" ? "error" : "warn",
      rule: v.rule, line: v.line ?? 0,
      message: repairText(v.message ?? "", agg),
      autoFixable: v.autoFixable === true,
      suggestion: v.suggestion !== undefined ? repairText(v.suggestion, agg) : undefined,
      file: v.file ?? "(sin archivo)",
    });
  }
  if (Array.isArray(r.results)) {
    for (const res of r.results) {
      if (res && typeof res.file === "string") {
        agg.fileScores.set(res.file, { score: res.score ?? null, applicable: res.applicable?.length ?? 0 });
      }
    }
  }
}

/* ── carga tolerante de encoding (Windows / PowerShell) ─────────────────── */

/** Olfatea BOM y heurística UTF-16 sin BOM; lee ≤256 bytes + stat. */
async function sniff(inputPath) {
  const fh = await open(inputPath, "r");
  try {
    const buf = Buffer.alloc(256);
    const { bytesRead } = await fh.read(buf, 0, 256, 0);
    const head = buf.subarray(0, bytesRead);
    const { size } = await fh.stat();
    let encoding = "utf-8";
    if (bytesRead >= 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) encoding = "utf-8-bom";
    else if (bytesRead >= 2 && head[0] === 0xff && head[1] === 0xfe) encoding = "utf-16le";
    else if (bytesRead >= 2 && head[0] === 0xfe && head[1] === 0xff) encoding = "utf-16be";
    else if (bytesRead >= 2 && head[0] === 0x7b && head[1] === 0x00 && size % 2 === 0) encoding = "utf-16le-nobom";
    return { encoding, byteLength: size, head: Buffer.from(head) };
  } finally {
    await fh.close();
  }
}

function decodeBuffer(buf, encoding) {
  switch (encoding) {
    case "utf-16le": return buf.subarray(2).toString("utf16le");
    case "utf-16be": {
      const body = Buffer.from(buf.subarray(2));
      if (body.length % 2 === 0) body.swap16();
      return body.toString("utf16le");
    }
    case "utf-16le-nobom": return buf.toString("utf16le");
    default: return buf.toString("utf8");
  }
}

/** Conteo de líneas sin array transitorio (a 585k líneas, split() aloca ~25MB). */
function countLines(text) {
  let nl = 0;
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) nl += 1;
  return text.endsWith("\n") ? nl : nl + 1;
}

/** Vista imprimible de la cabecera, para mensajes de diagnóstico. */
function previewOf(head, encoding) {
  const even = head.subarray(0, head.length - (head.length % 2));
  let s;
  if (encoding === "utf-16le" || encoding === "utf-16le-nobom") s = even.toString("utf16le");
  else if (encoding === "utf-16be") { const b = Buffer.from(even); b.swap16(); s = b.toString("utf16le"); }
  else s = head.toString("utf8");
  return s.replace(/^\uFEFF/, "").replace(/[^\x20-\x7e]/g, "·").slice(0, 80);
}

/** Diagnóstico explícito para JSON que no parsea — evidencia, no silencio. */
function diagnoseJson(text, err, info) {
  const msg = err instanceof Error ? err.message : String(err);
  const tail = text.trimEnd().slice(-80).replace(/[^\x20-\x7e]/g, "·");
  if (/unexpected end/i.test(msg)) {
    return `JSON TRUNCADO — el reporte quedó cortado a mitad (${info.byteLength} bytes, encoding ${info.encoding}); cola actual: «…${tail}». Causas típicas: proceso interrumpido (Ctrl+C), disco lleno o crash del guardian. Regeneralo completo: npx tsx tools/architecture-guardian.ts --json > report.json`;
  }
  return `JSON inválido — ${msg} (${info.byteLength} bytes, encoding ${info.encoding}); cola: «…${tail}»`;
}

/* ── agregación ──────────────────────────────────────────────────────────── */

function aggregate(agg) {
  const viol = agg.violations;
  const byRule = new Map();     // rule → stats
  const byFile = new Map();     // file → stats
  const byLayer = new Map();    // layer → stats
  const bySig = new Map();      // signature → stats
  const bySugg = new Map();     // suggestion → count
  const hotspots = new Map();   // "rule\u0000file" → count
  const filesAffected = new Set();

  for (const v of viol) {
    filesAffected.add(v.file);

    let r = byRule.get(v.rule);
    if (!r) byRule.set(v.rule, r = { count: 0, errors: 0, warns: 0, autoFix: 0, files: new Set(), first: v });
    r.count += 1; r[v.severity === "error" ? "errors" : "warns"] += 1;
    if (v.autoFixable) r.autoFix += 1; r.files.add(v.file);

    let f = byFile.get(v.file);
    if (!f) byFile.set(v.file, f = { count: 0, errors: 0, warns: 0, rules: new Map() });
    f.count += 1; f[v.severity === "error" ? "errors" : "warns"] += 1;
    f.rules.set(v.rule, (f.rules.get(v.rule) ?? 0) + 1);

    const layer = layerOf(v.file);
    let l = byLayer.get(layer);
    if (!l) byLayer.set(layer, l = { count: 0, errors: 0, warns: 0, files: new Set() });
    l.count += 1; l[v.severity === "error" ? "errors" : "warns"] += 1; l.files.add(v.file);

    const sig = signature(v.message);
    let s = bySig.get(sig);
    if (!s) bySig.set(sig, s = { count: 0, rules: new Set(), errors: 0, warns: 0, first: v });
    s.count += 1; s.rules.add(v.rule); s[v.severity === "error" ? "errors" : "warns"] += 1;

    if (v.suggestion !== undefined) {
      const key = signature(v.suggestion);
      bySugg.set(key, (bySugg.get(key) ?? 0) + 1);
    }

    const hk = `${v.rule}\u0000${v.file}`;
    hotspots.set(hk, (hotspots.get(hk) ?? 0) + 1);
  }

  const errs = viol.filter((v) => v.severity === "error").length;
  const autoFix = viol.filter((v) => v.autoFixable).length;

  // Pareto: acumulado de archivos ordenados por carga
  const fileEntries = sortedEntries(byFile).map(([file, f]) => ({ file, ...f, rules: [...f.rules.entries()] }));
  let cum = 0;
  const pareto = fileEntries.map((e) => { cum += e.count; return { ...e, cumPct: cum / Math.max(viol.length, 1) }; });
  const pareto80 = pareto.findIndex((e) => e.cumPct >= 0.8) + 1; // archivos que cubren el 80%

  // Integridad: totales parseados vs declarados por el propio tool
  if (agg.readErrors.length > 0) {
    agg.integrity.warnings.push(
      `${agg.readErrors.length} archivo(s) UNREADABLE — el gate no pudo verificarlos (exit 2 del guardian)`);
  }
  if (agg.meta.format === "human") {
    const w = [];
    if (!agg.integrity.sawSummary) w.push("log truncado: no se encontró la sección SUMMARY");
    if (!agg.integrity.sawVerdict) w.push("log truncado: falta la línea de veredicto final (PASS/FAIL)");
    if (agg.claimed.errors !== null && agg.claimed.errors !== errs) {
      w.push(`errores parseados (${errs}) ≠ declarados en SUMMARY (${agg.claimed.errors})`);
    }
    const warns = viol.length - errs;
    if (agg.claimed.warnings !== null && agg.claimed.warnings !== warns) {
      w.push(`warnings parseados (${warns}) ≠ declarados (${agg.claimed.warnings})`);
    }
    if (agg.integrity.unmatched > 0) {
      w.push(`${agg.integrity.unmatched} línea(s) con apariencia de violación no parsearon (¿formato nuevo?)`);
    }
    if (agg.integrity.orphanSuggestions > 0) {
      w.push(`${agg.integrity.orphanSuggestions} sugerencia(s) huérfanas sin violación previa`);
    }
    agg.integrity.warnings.push(...w);
  }

  return {
    totals: {
      violations: viol.length, errors: errs, warnings: viol.length - errs,
      autoFixable: autoFix, filesAffected: filesAffected.size,
      avgPerFile: filesAffected.size ? +(viol.length / filesAffected.size).toFixed(1) : 0,
      maxPerFile: fileEntries.length ? fileEntries[0].count : 0,
      distinctSignatures: bySig.size,
      distinctSuggestions: bySugg.size,
    },
    byRule: sortedEntries(byRule).map(([rule, r]) => ({
      rule, ...r, files: r.files.size,
      severity: r.errors > 0 && r.warns > 0 ? "mixed" : r.errors > 0 ? "error" : "warn",
    })),
    byFile: fileEntries,
    byLayer: sortedEntries(byLayer).map(([layer, l]) => ({ layer, ...l, files: l.files.size })),
    bySig: sortedEntries(bySig).map(([sig, s]) => ({
      signature: sig, count: s.count, rules: [...s.rules], errors: s.errors, warns: s.warns,
      first: fmtViolation(s.first),
    })),
    bySugg: sortedEntries(bySugg).map(([s, c]) => ({ suggestion: s, count: c })),
    hotspots: sortedEntries(hotspots).map(([k, c]) => {
      const [rule, file] = k.split("\u0000");
      return { rule, file, count: c };
    }),
    pareto80: viol.length ? pareto80 : 0,
    filesBelowThreshold: [...agg.fileScores.entries()]
      .filter(([, fs]) => fs.score !== null && agg.claimed.threshold !== null && fs.score < agg.claimed.threshold)
      .map(([file, fs]) => ({ file, score: fs.score }))
      .sort((a, b) => a.score - b.score || a.file.localeCompare(b.file)),
  };
}

/* ── digest markdown ─────────────────────────────────────────────────────── */

function digestMd(agg, A, top) {
  const o = [];
  const c = agg.claimed;
  const t = A.totals;
  o.push(`# Architecture Guardian — Log Digest`);
  o.push("");
  o.push(`- fuente: \`${basename(agg.meta.input)}\` · formato: ${agg.meta.format} · ${agg.meta.linesConsumed} líneas consumidas · encoding: ${agg.meta.encoding}`);
  if (agg.meta.toolVersion) o.push(`- guardian v${agg.meta.toolVersion} · root: ${agg.meta.root ?? "n/d"}${agg.meta.generatedAt ? ` · generado: ${agg.meta.generatedAt}` : ""}`);

  o.push(``, `## Veredicto`);
  o.push(`- ${c.verdict ?? "n/d (sin línea de veredicto)"} · score: ${c.score ?? "n/d"}${c.scale ? ` / ${c.scale}` : ""}${c.threshold !== null ? ` (threshold ${c.threshold})` : ""} · ${c.durationMs !== null ? `${c.durationMs}ms · ` : ""}${c.filesScanned !== null ? `${c.filesScanned} archivos escaneados` : ""}`);

  o.push(``, `## Volumen`);
  o.push(`| violaciones | errores | warnings | auto-fixable | archivos afectados | prom/arch | máx/arch |`);
  o.push(`|---:|---:|---:|---:|---:|---:|---:|`);
  o.push(`| ${t.violations} | ${t.errors} | ${t.warnings} | ${t.autoFixable} | ${t.filesAffected} | ${t.avgPerFile} | ${t.maxPerFile} |`);
  o.push(``);
  o.push(`${t.violations} ocurrencias se reducen a **${t.distinctSignatures} clases** de error y **${t.distinctSuggestions} sugerencias** distintas — eso es lo que hay que auditar de verdad.`);
  if (A.pareto80 > 0) o.push(`Pareto: los **top ${A.pareto80} archivos** concentran el 80% de las violaciones (${pct(A.pareto80, Math.max(t.filesAffected, 1))} de los afectados).`);

  o.push(``, `## Integridad (autodiagnóstico del auditor)`);
  if (agg.integrity.warnings.length === 0) {
    o.push(`- ✅ sin anomalías: totales parseados = totales declarados por el guardian; log completo`);
  } else {
    for (const w of agg.integrity.warnings) o.push(`- ⚠️ ${w}`);
  }
  for (const s of agg.integrity.unmatchedSamples) o.push(`  - no parseada: \`${s.slice(0, 120)}\``);
  for (const f of agg.readErrors.slice(0, 10)) o.push(`  - ilegible: ${f}`);

  o.push(``, `## Violaciones por capa`);
  if (A.byLayer.length > 0) {
    o.push(`| capa | total | errores | warns | % | archivos |`);
    o.push(`|---|---:|---:|---:|---:|---:|`);
    for (const l of A.byLayer) o.push(`| ${l.layer} | ${l.count} | ${l.errors} | ${l.warns} | ${pct(l.count, t.violations)} | ${l.files} |`);
  } else o.push(`(sin violaciones)`);

  o.push(``, `## Violaciones por regla`);
  if (A.byRule.length > 0) {
    o.push(`| regla | severidad | total | errores | warns | % | auto-fix | archivos |`);
    o.push(`|---|---|---:|---:|---:|---:|---:|---:|`);
    for (const r of A.byRule) o.push(`| ${r.rule} | ${r.severity} | ${r.count} | ${r.errors} | ${r.warns} | ${pct(r.count, t.violations)} | ${r.autoFix} | ${r.files} |`);
  } else o.push(`(sin violaciones)`);

  o.push(``, `## Top ${Math.min(top, A.byFile.length)} archivos`);
  if (A.byFile.length > 0) {
    o.push(`| archivo | total | errores | warns | reglas dominantes |`);
    o.push(`|---|---:|---:|---:|---|`);
    for (const f of A.byFile.slice(0, top)) {
      const dom = f.rules.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r, n]) => `${r}×${n}`).join(", ");
      o.push(`| ${f.file} | ${f.count} | ${f.errors} | ${f.warns} | ${dom} |`);
    }
  } else o.push(`(sin violaciones)`);

  const hs = A.hotspots.filter((h) => h.count >= 3);
  if (hs.length > 0) {
    o.push(``, `## Hotspots repetidos (misma regla × mismo archivo, ≥3)`);
    o.push(`| regla | archivo | repeticiones |`);
    o.push(`|---|---|---:|`);
    for (const h of hs.slice(0, 15)) o.push(`| ${h.rule} | ${h.file} | ${h.count} |`);
    if (hs.length > 15) o.push(`… y ${hs.length - 15} más (ver digest.json)`);
  }

  o.push(``, `## Firmas de mensaje (top ${Math.min(30, A.bySig.length)})`);
  if (A.bySig.length > 0) {
    o.push(`| ocurrencias | regla(s) | firma | primera aparición |`);
    o.push(`|---:|---|---|---|`);
    for (const s of A.bySig.slice(0, 30)) o.push(`| ${s.count} | ${s.rules.slice(0, 3).join(", ")} | ${s.signature.replace(/\|/g, "\\|")} | ${s.first} |`);
  } else o.push(`(sin violaciones)`);

  o.push(``, `## Sugerencias distintas (top ${Math.min(15, A.bySugg.length)})`);
  if (A.bySugg.length > 0) {
    o.push(`| peticiones | sugerencia |`);
    o.push(`|---:|---|`);
    for (const s of A.bySugg.slice(0, 15)) o.push(`| ${s.count} | ${s.suggestion.replace(/\|/g, "\\|")} |`);
  }

  if (A.filesBelowThreshold.length > 0) {
    o.push(``, `## Archivos bajo threshold (${A.filesBelowThreshold.length})`);
    for (const f of A.filesBelowThreshold.slice(0, top)) o.push(`- ${f.file} — score ${f.score}`);
  }

  o.push(``, `## Muestras por regla dominante (hasta 8 reglas × 3 ejemplos)`);
  for (const r of A.byRule.slice(0, 8)) {
    o.push(``, `### ${r.rule} — ${r.count} ocurrencias (${pct(r.count, t.violations)})`);
    const samples = agg.violations.filter((v) => v.rule === r.rule).slice(0, 3);
    for (const v of samples) o.push(`- ${fmtViolation(v)}`);
    if (r.autoFix > 0) o.push(`  - 💡 ${r.autoFix} auto-fixables: \`npx tsx tools/architecture-guardian.ts --fix\` las resuelve`);
  }
  return o.join("\n") + "\n";
}

/* ── digest json ─────────────────────────────────────────────────────────── */

function digestJson(agg, A) {
  // Topes en el digest json: agregados completos pero acotados (los datos
  // crudos viven en el input; el digest no debe replicar su volumen)
  const hotAll = A.hotspots.filter((h) => h.count >= 3);
  const belowAll = A.filesBelowThreshold;
  return JSON.stringify({
    meta: agg.meta,
    claimed: agg.claimed,
    readErrors: agg.readErrors,
    integrity: agg.integrity,
    totals: A.totals,
    pareto80Files: A.pareto80,
    byLayer: A.byLayer,
    byRule: A.byRule,
    byFile: A.byFile.slice(0, 500).map((f) => ({ ...f, rules: Object.fromEntries(f.rules) })),
    byFileTruncated: A.byFile.length > 500,
    signatures: A.bySig,
    suggestions: A.bySugg,
    hotspots: hotAll.slice(0, 2000),
    hotspotsTruncated: hotAll.length > 2000,
    filesBelowThreshold: belowAll.slice(0, 500),
    filesBelowThresholdTruncated: belowAll.length > 500,
  }, null, 2) + "\n";
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

const HELP = `LOG AUDITOR — condensa y audita logs de Architecture Guardian

USAGE
  node log-auditor.mjs <log-human | report.json> [opciones]

OPCIONES
  --top <N>     tamaño de listas "top" en el markdown (default 25)
  --md <path>   ruta del digest markdown (default: <input>.digest.md)
  --json <path> ruta del digest json     (default: <input>.digest.json)
  --help        esta ayuda

SALIDAS
  <input>.digest.md    — digest legible y acotado (firmas, Pareto, muestras)
  <input>.digest.json  — agregados completos para consumo máquina

RECOMENDADO
  Regenerar la evidencia con el flag nativo del guardian:
    npx tsx tools/architecture-guardian.ts --json > report.json
  y auditar ese archivo: JSON es autoritativo, sin riesgo de parseo.

TOLERANCIA DE ENTRADA
  BOM UTF-8 y UTF-16 LE/BE (redirección de PowerShell) — decodificados solos.
  JSON truncado o corrupto — error explícito con evidencia (cola del archivo).
  JSON ajeno al guardian — mensaje específico con las claves encontradas.
  Mojibake CP437 (PowerShell + codepage OEM) — mensajes §/—/· reparados y
  reportados como advertencia de integridad de la evidencia.

EXIT CODES
  0  digest generado (warnings de integridad van DENTRO del digest)
  1  input inexistente o ilegible
  2  formato no reconocido (0 violaciones parseadas)
  3  error de CLI`;

function fail(msg, code) { process.stderr.write(`${msg}\n`); process.exit(code); }

async function main() {
  const argv = process.argv.slice(2);
  let input = null, top = 25, mdPath = null, jsonPath = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { process.stdout.write(`${HELP}\n`); process.exit(0); }
    if (a === "--top") {
      const v = argv[i + 1];
      if (v === undefined || !/^\d+$/.test(v)) fail("--top requiere un entero", 3);
      top = Math.max(1, Math.min(200, +v)); i += 1;
    } else if (a === "--md") {
      mdPath = argv[++i]; if (!mdPath) fail("--md requiere una ruta", 3);
    } else if (a === "--json") {
      jsonPath = argv[++i]; if (!jsonPath) fail("--json requiere una ruta", 3);
    } else if (a.startsWith("--")) {
      fail(`flag desconocido: ${a} — ver --help`, 3);
    } else if (input === null) {
      input = a;
    } else {
      fail(`argumento inesperado: ${a} (un solo input)`, 3);
    }
  }
  if (input === null) fail("uso: node log-auditor.mjs <log | report.json> — ver --help", 3);

  const agg = newAgg();
  agg.meta.input = input;

  // ── carga y clasificación del input ──
  // Fallar ciego es inaceptable: si el formato no se reconoce, el error debe
  // caracterizar el archivo (bytes, encoding, hex de cabecera) para que la
  // causa sea evidente sin herramientas externas.
  let info;
  try {
    info = await sniff(input);
  } catch (err) {
    fail(`no puedo leer ${input}${err?.code ? ` (${err.code})` : ""}`, 1);
  }
  agg.meta.encoding = info.encoding;
  agg.meta.byteLength = info.byteLength;

  const isUtf8Family = info.encoding === "utf-8" || info.encoding === "utf-8-bom";
  const headText = isUtf8Family
    ? info.head.toString("utf8")
    : decodeBuffer(info.head, info.encoding);
  const firstChar = headText.replace(/^\uFEFF/, "").trimStart().slice(0, 1);

  if (firstChar === "{") {
    // Camino JSON — autoritativo. Todo fallo es EXPLÍCITO con evidencia.
    const text = isUtf8Family
      ? (await readFile(input, "utf8")).replace(/^\uFEFF/, "")
      : decodeBuffer(await readFile(input), info.encoding).replace(/^\uFEFF/, "");
    let parsed = null;
    let parseErr = null;
    try { parsed = JSON.parse(text); } catch (e) { parseErr = e; }
    if (parseErr !== null) fail(diagnoseJson(text, parseErr, info), 2);
    const contractOk = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) &&
      parsed.tool === "architecture-guardian" &&
      Array.isArray(parsed.errors) && Array.isArray(parsed.warnings);
    if (!contractOk) {
      const keys = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed).slice(0, 8).join(", ")
        : String(parsed).slice(0, 40);
      fail(`JSON válido pero NO es un reporte del guardian — claves: ${keys}; se exige "tool":"architecture-guardian" + errors[]/warnings[] (¿versión distinta del tool?)`, 2);
    }
    ingestJsonReport(parsed, agg);
    agg.meta.linesConsumed = countLines(text);
  } else if (isUtf8Family) {
    // Camino humano — streaming (log de cualquier tamaño).
    await parseHumanStream(input, agg);
  } else {
    // Camino humano en UTF-16: decodificar y reusar la misma máquina de estados.
    parseHumanText(decodeBuffer(await readFile(input), info.encoding), agg);
  }

  if (agg.violations.length === 0 && agg.claimed.errors === null && agg.claimed.warnings === null) {
    const hex = info.head.subarray(0, 8).toString("hex").replace(/(..)/g, "$1 ").trim() || "(vacío)";
    fail(
      `formato no reconocido en ${input}: 0 violaciones parseadas y sin SUMMARY del guardian · ` +
      `${info.byteLength} bytes · encoding: ${info.encoding} · primeros bytes (hex): ${hex} · ` +
      `inicio: ${JSON.stringify(previewOf(info.head, info.encoding))}`,
      2);
  }

  if (agg.meta.mojibakeRepaired > 0) {
    agg.integrity.warnings.push(
      `mojibake CP437 reparado en ${agg.meta.mojibakeRepaired} campo(s) — la captura se hizo vía PowerShell, que decodificó el stdout UTF-8 del guardian con la codepage OEM (los §/—/· de los mensajes llegaron corruptos y fueron restaurados). Para evidencia limpia: regenerar desde Git Bash, o en PowerShell correr antes: [Console]::OutputEncoding=[Text.Encoding]::UTF8`);
  }

  const A = aggregate(agg);
  const md = mdPath ?? `${input}.digest.md`;
  const js = jsonPath ?? `${input}.digest.json`;
  await writeFile(md, digestMd(agg, A, top), "utf8");
  await writeFile(js, digestJson(agg, A), "utf8");

  const t = A.totals;
  process.stdout.write(
    `Log auditor — ${basename(input)} (${agg.meta.format}, ${agg.meta.linesConsumed} líneas)\n` +
    `  parseado: ${t.violations} violaciones (${t.errors} errores, ${t.warnings} warnings) en ${t.filesAffected} archivos\n` +
    `  clases:   ${t.distinctSignatures} firmas distintas · Pareto 80% = ${A.pareto80} archivos\n` +
    `  integridad: ${agg.integrity.warnings.length === 0 ? "OK" : `${agg.integrity.warnings.length} advertencia(s) — ver digest`}\n` +
    `  digest:   ${md}\n            ${js}\n`);
}

main().catch((err) => {
  process.stderr.write(`log-auditor error interno: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(2);
});