#!/usr/bin/env node
/**
 * ============================================================================
 * G28 - Extractor de evidencia del type-check (SOLO LECTURA)
 * ============================================================================
 * No corre tsc y NO muta nada bajo src/. Lee frontend/type-check.log + los
 * archivos citados y produce el paquete de evidencia completo para disenar
 * la tanda final (familia C + v2 de fix-readonly + auditoria de la A):
 *
 *  [0] Estado: raiz, log, mtime, familias, auto-check anti-mentira
 *  [1] Inventario familia C completo (la A va agrupada en [2]; el inventario
 *      COMPLETO, con A/B/D, queda en evidence-g28.txt)
 *  [2] Composicion familia A: identificador muerto xN -> archivos
 *  [3] TS2345: (a) fixeables por readonly (msg con 'signals?: DomainSignal[]')
 *              (b) OTROS, con contexto del sitio
 *  [4] TS2739 + TS2741 (reacciones): sitios + contextos
 *  [5] TS2353 (action={{...}} en EmptyState): sitios + contextos + def
 *  [6] DEFS de tipos para el arbitraje mock-vs-tipo (RiskLevel, TrendDirection,
 *      AnomalyDomain, AnomalySeverity, HealthFactorStatus, AdvisorReaction,
 *      AdvisorReactionInsight, AdvisorCommand, DomainSignal, SentimentLevel,
 *      GlobalAdvisorLayer, AdvisorConfig, EmptyState, insightTiers)
 *  [7] Verificacion G26/G27: delta-simulator + SignalBusDebugPanel (espera 0),
 *      firmas 'signals' AUN mutables (targets de fix-readonly v2), salud de
 *      los 7 archivos del colateral reparado, staleness del log
 *
 * Uso:    node scripts/g28-evidence.mjs [ruta-al-log]
 * Salida: consola (con caps) + <frontend>/evidence-g28.txt (SIN caps).
 * Exit:   0 = evidencia producida - 1 = sin log - 2 = sin raiz.
 * Node >= 20. Cero dependencias.
 * ============================================================================
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const logArg = argv.find((a) => !a.startsWith("--")) ?? null;

/* ---------- Familias mecanicas (mismo mapa que el g21 v3) ---------------- */
const FAM = {
  A: ["TS6133", "TS6196", "TS6192", "TS6195", "TS6112", "TS6199"],
  B: ["TS2304", "TS2305", "TS2440", "TS2561", "TS2724", "TS2749", "TS2367"],
  C: ["TS2322", "TS2820", "TS2739", "TS2741", "TS2554", "TS2345", "TS2353"],
  D: ["TS1003", "TS1005"],
};
const famOf = (code) => {
  for (const k of Object.keys(FAM)) if (FAM[k].includes(code)) return k;
  return "?";
};

/* ---------- Resolucion de la raiz (CWD gana al ancla - leccion G25) ----- */
const isFrontendRoot = (p) =>
  !!p && existsSync(join(p, "package.json")) && existsSync(join(p, "tsconfig.app.json"));

function resolveRoot() {
  const cwd = process.cwd();
  const cands = [
    ["directorio actual", cwd],
    ["monorepo (./frontend)", join(cwd, "frontend")],
    ["anclaje al script (scripts/..)", dirname(HERE)],
    ["monorepo (scripts/../frontend)", join(dirname(HERE), "frontend")],
  ];
  if (cwd.endsWith("scripts")) {
    cands.push(["scripts/.. del cwd", dirname(cwd)]);
    cands.push(["monorepo (scripts/../frontend del cwd)", join(dirname(cwd), "frontend")]);
  }
  for (const [how, c] of cands) if (isFrontendRoot(c)) return { root: resolve(c), how };
  return null;
}

const R = resolveRoot();
if (!R) {
  console.error("[G28] no encontre la raiz del frontend (package.json + tsconfig.app.json).");
  console.error("  probe: " + [process.cwd(), join(process.cwd(), "frontend"), dirname(HERE), join(dirname(HERE), "frontend")].join(" | "));
  process.exit(2);
}
const ROOT = R.root;

/* ---------- Lector tolerante (UTF-16 LE/BE, BOM UTF-8, CRLF) ------------- */
function readLogTolerant(p) {
  const buf = readFileSync(p);
  let text;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) text = buf.subarray(2).toString("utf16le");
  else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const le = Buffer.from(buf); le.swap16(); text = le.subarray(2).toString("utf16le");
  } else if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) text = buf.subarray(3).toString("utf8");
  else text = buf.toString("utf8");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/* ---------- Discovery del log -------------------------------------------- */
let logPath = null;
{
  const cands = [];
  if (logArg) cands.push(logArg);
  cands.push(join(ROOT, "type-check.log"), join(process.cwd(), "type-check.log"), join(process.cwd(), "frontend", "type-check.log"));
  for (const c of cands) if (existsSync(c)) { logPath = resolve(c); break; }
}
if (!logPath) {
  console.error("[G28] no encontre el log. Corre primero: node scripts/g21-aggregate-typecheck.mjs --run");
  process.exit(1);
}
const logText = readLogTolerant(logPath);
const logMtime = statSync(logPath).mtimeMs;

/* ---------- Parseo dual (plano + pretty) con lineas de continuacion ----- */
const LINE_RE_PLAIN = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const LINE_RE_PRETTY = /^(.+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
const FOUND_RE = /^Found (\d+) errors?\b/;

const rawLines = logText.split(/\r?\n/);
const errors = [];
for (let i = 0; i < rawLines.length; i++) {
  const m = LINE_RE_PLAIN.exec(rawLines[i]) ?? LINE_RE_PRETTY.exec(rawLines[i]);
  if (!m) continue;
  const [, file, l, c, code, msg] = m;
  const cont = [];
  for (let j = i + 1; j <= i + 2 && j < rawLines.length; j++) {
    const nl = rawLines[j];
    if (nl.trim() === "" || LINE_RE_PLAIN.test(nl) || LINE_RE_PRETTY.test(nl) || FOUND_RE.test(nl)) break;
    cont.push(nl.trim());
  }
  errors.push({ file: file.replace(/\\/g, "/"), line: +l, col: +c, code, msg, cont });
}
const rawHits = (logText.match(/error TS\d+/g) ?? []).length;
const foundMatch = FOUND_RE.exec(logText);
const reported = foundMatch ? Number(foundMatch[1]) : null;

/* ---------- Utilidades de archivos --------------------------------------- */
const stale = new Set();
function toAbs(f) {
  const norm = f.replace(/\\/g, "/").replace(/^\.\//, "");
  for (const t of [join(ROOT, norm), join(ROOT, "frontend", norm)]) if (existsSync(t)) return t;
  return null;
}
function readSrc(abs) {
  try {
    const st = statSync(abs);
    if (st.mtimeMs > logMtime + 2000) stale.add(abs);
    return readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}
function contextLines(abs, from, to, before, after) {
  const raw = readSrc(abs);
  if (raw == null) return ["      [no pude leer el archivo]"];
  const lines = raw.split(/\r?\n/);
  const start = Math.max(1, from - before);
  const end = Math.min(lines.length, (to ?? from) + after);
  const out = [];
  for (let n = start; n <= end; n++) out.push("      " + String(n).padStart(5) + " | " + lines[n - 1].slice(0, 110));
  return out;
}
const ctx = (abs, line, before, after) => contextLines(abs, line, null, before, after);

/* contextos por ventanas fusionadas (sitios cercanos = un solo bloque) */
function mergedBlocks(sites, before, after) {
  const byFile = new Map();
  for (const s of sites) {
    if (!s.abs) continue;
    if (!byFile.has(s.abs)) byFile.set(s.abs, { rel: s.rel, lines: [] });
    byFile.get(s.abs).lines.push(s.line);
  }
  const blocks = [];
  for (const [abs, { rel, lines }] of byFile) {
    lines.sort((a, b) => a - b);
    const merged = [];
    for (const ln of lines) {
      const last = merged[merged.length - 1];
      if (last && ln - last.to <= before + after + 2) last.to = Math.max(last.to, ln);
      else merged.push({ from: ln, to: ln });
    }
    for (const mm of merged) blocks.push({ abs, rel, from: mm.from, to: mm.to });
  }
  return blocks;
}

/* ---------- Escaneo unico de src (defs + firmas + insightTiers) ---------- */
const TYPE_NAMES = [
  "RiskLevel", "TrendDirection", "AnomalyDomain", "AnomalySeverity", "HealthFactorStatus",
  "AdvisorReaction", "AdvisorReactionInsight", "AdvisorCommand", "DomainSignal",
  "SentimentLevel", "GlobalAdvisorLayer", "AdvisorConfig",
];
const DECL_RES = TYPE_NAMES.map((n) => [n, new RegExp("^\\s*(export\\s+)?(declare\\s+)?(type|interface|enum)\\s+" + n + "\\b")]);
const MUTABLE_RE = /(?<!readonly )\bsignals\s*\??\s*:\s*DomainSignal\[/;
const READONLY_RE = /\bsignals\s*\??\s*:\s*readonly\s+DomainSignal\[/;
const IT_RE = /\binsightTiers\b/;
const IT_DECL_RE = /^\s*(?:export\s+)?(?:const|let|var)\s+insightTiers\b/;
const EMPTY_RE = /\b(?:function\s+EmptyState\b|const\s+EmptyState\s*=|interface\s+EmptyStateProps\b|type\s+EmptyStateProps\b)/;

function walk(dir, out) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "dist") walk(fp, out); }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(fp);
  }
  return out;
}

const defs = new Map(TYPE_NAMES.map((n) => [n, []]));
const scan = { mutable: [], readonlyCount: 0, itFiles: new Map(), itDecls: [], emptyState: [] };
const relOf = (abs) => abs.slice(ROOT.length + 1).replace(/\\/g, "/");

for (const fp of walk(join(ROOT, "src"), [])) {
  const raw = readSrc(fp);
  if (raw == null) continue;
  const rel = relOf(fp);
  const lines = raw.split(/\r?\n/);
  let itCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    for (const [n, re] of DECL_RES) if (re.test(L)) defs.get(n).push({ abs: fp, rel, line: i + 1 });
    if (MUTABLE_RE.test(L)) scan.mutable.push({ rel, line: i + 1, text: L.trim().slice(0, 100), next: (lines[i + 1] ?? "").trim().slice(0, 70) });
    if (READONLY_RE.test(L)) scan.readonlyCount += 1;
    if (IT_RE.test(L)) { itCount += 1; if (IT_DECL_RE.test(L)) scan.itDecls.push({ abs: fp, rel, line: i + 1 }); }
    if (EMPTY_RE.test(L)) scan.emptyState.push({ abs: fp, rel, line: i + 1 });
  }
  if (itCount > 0) scan.itFiles.set(rel, itCount);
}

/* ---------- Armado de secciones ------------------------------------------ */
const sections = [];
const sec = (title, lines, cap = Infinity, opts = {}) => sections.push({ title, lines, cap, ...opts });

const famCount = { A: 0, B: 0, C: 0, D: 0, "?": 0 };
for (const e of errors) famCount[famOf(e.code)] += 1;
const pad2 = (s) => String(s).padStart(2, "0");

/* [0] estado */
{
  const L = [];
  L.push("Raiz: " + ROOT + " (" + R.how + ")");
  L.push("Log: " + logPath + " · mtime " + statSync(logPath).mtime.toISOString());
  L.push("Log: " + rawLines.length + " lineas · " + Math.round(Buffer.byteLength(logText, "utf8") / 102.4) / 10 + " KB");
  L.push("Errores parseados: " + errors.length + (reported !== null ? " (tsc reporto: " + reported + ")" : ""));
  L.push("Familias: A:" + famCount.A + " · B:" + famCount.B + " · C:" + famCount.C + " · D:" + famCount.D + " · otros:" + famCount["?"]);
  L.push("Auto-check: " + rawHits + " crudos 'error TS####' vs " + errors.length + " parseadas " + (rawHits === errors.length ? "(coinciden)" : "(NO coinciden — códigos citados en mensajes cuentan como crudos)"));
  sec("[0] ESTADO", L);
}

const enriched = errors.map((e) => {
  const abs = toAbs(e.file);
  return { ...e, abs, rel: abs ? relOf(abs) : e.file, found: !!abs };
});

const invLine = (e) => {
  const head = "  " + e.file + ":" + e.line + ":" + e.col + "  " + e.code + (e.found ? "" : "  [archivo no encontrado]");
  const rest = "  " + e.msg.slice(0, 150);
  const out = [(head + rest).slice(0, 220)];
  if (["TS2345", "TS2739", "TS2741"].includes(e.code) && e.cont[0]) out.push("        > " + e.cont[0].slice(0, 150));
  return out;
};

/* [1] inventario C (+B/D/otros) — la A completa va solo al archivo */
{
  const order = { C: 0, B: 1, D: 2, "?": 3, A: 4 };
  const sorted = [...enriched].sort((a, b) =>
    order[famOf(a.code)] - order[famOf(b.code)] || a.code.localeCompare(b.code) || a.rel.localeCompare(b.rel) || a.line - b.line
  );
  const linesC = [];
  let n = 0;
  for (const e of sorted) {
    if (famOf(e.code) === "A") continue;
    n += 1;
    linesC.push(...invLine(e).map((s, i) => (i === 0 ? s.replace(/^  /, "  " + pad2(n) + ") ") : s)));
  }
  sec("[1] INVENTARIO — familias C/B/D/otros (" + n + " de " + errors.length + "; la A completa va en el archivo)", linesC);

  const linesA = [];
  let k = 0;
  for (const e of sorted) {
    if (famOf(e.code) !== "A") continue;
    k += 1;
    linesA.push(...invLine(e).map((s, i) => (i === 0 ? s.replace(/^  /, "  " + pad2(k) + ") ") : s)));
  }
  sec("[1b] INVENTARIO — familia A completa (solo en evidence-g28.txt)", linesA, 0, { fileOnly: true });
}

/* [2] composicion A */
{
  const byName = new Map();
  const ts6192 = [];
  for (const e of enriched) {
    if (famOf(e.code) !== "A") continue;
    if (e.code === "TS6192") { ts6192.push(e.file + ":" + e.line); continue; }
    const m = /'([^']+)'/.exec(e.msg);
    const name = m ? m[1] : "(sin nombre en el mensaje)";
    if (!byName.has(name)) byName.set(name, { count: 0, files: new Map() });
    const rec = byName.get(name);
    rec.count += 1;
    rec.files.set(e.rel, (rec.files.get(e.rel) ?? 0) + 1);
  }
  const rows = [...byName.entries()].sort((a, b) => b[1].count - a[1].count);
  const L = ["  identificadores muertos (TS6133/TS6196), agrupados:"];
  if (rows.length === 0) L.push("  (ninguno)");
  for (const [name, rec] of rows) {
    const fl = [...rec.files.entries()].map(([f, c]) => f.split("/").pop() + " x" + c);
    L.push("  " + name.padEnd(24) + " x" + String(rec.count).padStart(3) + "  -> " + fl.slice(0, 6).join(" | ") + (fl.length > 6 ? "  (+" + (fl.length - 6) + " arch)" : ""));
  }
  L.push("  TS6192 (import-declaration entera sin uso): " + (ts6192.length ? "" : "(ninguno)"));
  for (const s of ts6192) L.push("    " + s);
  sec("[2] FAMILIA A — composicion (para la ronda 2 del codemod)", L, 40);
}

/* [3] TS2345 */
{
  const t = enriched.filter((e) => e.code === "TS2345");
  const fixable = t.filter((e) => e.msg.includes("signals?: DomainSignal[]"));
  const others = t.filter((e) => !e.msg.includes("signals?: DomainSignal[]"));
  const L = ["  total TS2345: " + t.length];
  L.push("  (a) fixeables por readonly (el mensaje muestra 'signals?: DomainSignal[]' mutable): " + fixable.length);
  for (const e of fixable) L.push("      " + e.rel + ":" + e.line);
  if (fixable.length === 0) L.push("      (ninguno — raro si quedan TS2345 de buildCtx)");
  L.push("  (b) OTROS (necesitan decision — delta-simulator / SignalBus / global / readonly-y-falla): " + others.length);
  const blocks = mergedBlocks(others, 5, 5).slice(0, 6);
  for (const b of blocks) {
    L.push("      --- " + b.rel + " (sitio " + b.from + (b.to !== b.from ? "-" + b.to : "") + ") ---");
    L.push(...contextLines(b.abs, b.from, b.to, 5, 5));
  }
  sec("[3] TS2345 — clasificados (targets de fix-readonly v2)", L, 80);
}

/* [4] TS2739 + TS2741 */
{
  const t = enriched.filter((e) => e.code === "TS2739" || e.code === "TS2741");
  const L = ["  total: " + t.length];
  for (const e of t) {
    L.push("  " + e.rel + ":" + e.line + ":" + e.col + "  " + e.code + "  " + e.msg.slice(0, 130));
    if (e.cont[0]) L.push("        > " + e.cont[0].slice(0, 130));
  }
  const blocks = mergedBlocks(t, 5, 5).slice(0, 6);
  for (const b of blocks) {
    L.push("  --- " + b.rel + " (sitio " + b.from + (b.to !== b.from ? "-" + b.to : "") + ") ---");
    L.push(...contextLines(b.abs, b.from, b.to, 5, 5));
  }
  sec("[4] REACCIONES — TS2739/TS2741 (sitios + contextos)", L, 90);
}

/* [5] TS2353 */
{
  const t = enriched.filter((e) => e.code === "TS2353");
  const L = ["  total: " + t.length];
  for (const e of t) L.push("  " + e.rel + ":" + e.line + ":" + e.col + "  " + e.code + "  " + e.msg.slice(0, 130));
  const blocks = mergedBlocks(t, 6, 6).slice(0, 5);
  for (const b of blocks) {
    L.push("  --- " + b.rel + " (sitio " + b.from + (b.to !== b.from ? "-" + b.to : "") + ") ---");
    L.push(...contextLines(b.abs, b.from, b.to, 6, 6));
  }
  L.push("  def de EmptyState (componente y/o props):");
  for (const m of scan.emptyState.slice(0, 2)) {
    L.push("  --- " + m.rel + ":" + m.line + " ---");
    L.push(...ctx(m.abs, m.line, 2, 14));
  }
  if (scan.emptyState.length === 0) L.push("    (no encontre declaracion de EmptyState bajo src/)");
  sec("[5] TS2353 — action={{...}} en EmptyState", L, 90);
}

/* [6] defs de tipos */
{
  const L = [];
  for (const name of TYPE_NAMES) {
    const ms = defs.get(name);
    L.push("  == " + name + " == " + (ms.length === 0 ? "NO ENCONTRADO bajo src/ (¿importado de un paquete?)" : ms.length + " declaracion(es)"));
    for (const m of ms.slice(0, 2)) {
      L.push("     --- " + m.rel + ":" + m.line + " ---");
      L.push(...ctx(m.abs, m.line, 3, 12));
    }
    if (ms.length > 2) L.push("     (+" + (ms.length - 2) + " declaraciones mas en evidence-g28.txt)");
  }
  L.push("  == insightTiers — declaraciones y ocurrencias ==");
  const fl = [...scan.itFiles.entries()].sort((a, b) => b[1] - a[1]);
  L.push("     ocurrencias por archivo: " + (fl.length === 0 ? "(ninguna — el identificador ya no existe)" : fl.map(([f, c]) => f.split("/").pop() + " x" + c).join(" | ")));
  for (const d of scan.itDecls.slice(0, 2)) {
    L.push("     --- " + d.rel + ":" + d.line + " ---");
    L.push(...ctx(d.abs, d.line, 3, 3));
  }
  sec("[6] DEFS DE TIPOS (arbitraje mock-vs-tipo de la familia C)", L, 200);
}

/* [7] verificacion G26/G27 */
{
  const L = [];
  const countIn = (needle) => enriched.filter((e) => e.file.includes(needle));
  for (const probe of ["delta-simulator", "SignalBusDebugPanel"]) {
    const hits = countIn(probe);
    L.push("  " + probe + ": " + hits.length + " error(es) citandolo" + (hits.length ? " — detalle:" : " (sin errores)"));
    for (const e of hits) L.push("      " + e.rel + ":" + e.line + "  " + e.code + "  " + e.msg.slice(0, 110));
  }
  L.push("");
  L.push("  firmas 'signals?: DomainSignal[]' AUN mutables (targets de fix-readonly v2): " + scan.mutable.length + " en " + new Set(scan.mutable.map((m) => m.rel)).size + " archivos");
  for (const m of scan.mutable) L.push("      " + m.rel + ":" + m.line + "  | " + m.text + (m.next ? "  || sig: " + m.next : ""));
  L.push("  firmas ya readonly (parches v1 + tipo madre): " + scan.readonlyCount);
  L.push("");
  L.push("  colateral reparado — errores residuales por archivo:");
  const COL = ["AgeGroupAdvisorBanner", "GravityObservatory", "SpatialGraphView", "WhatIfPlannerPanel", "FamiliesDashboard", "EngagementGravityWell", "MemberIntelligenceStream"];
  for (const c of COL) {
    const hits = enriched.filter((e) => e.file.includes("/" + c + "."));
    if (hits.length === 0) { L.push("    " + c + ".tsx: 0 errores ✓"); continue; }
    const byCode = new Map();
    for (const e of hits) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
    L.push("    " + c + ".tsx: x" + hits.length + " (" + [...byCode.entries()].map(([k, v]) => k + " x" + v).join(" · ") + ")");
  }
  L.push("");
  if (stale.size === 0) L.push("  staleness: ningun archivo leido es mas nuevo que el log (log fresco) ✓");
  else {
    L.push("  staleness: el log es MAS VIEJO que " + stale.size + " archivo(s) — re-corre g21 --run antes de diseñar fixes:");
    for (const s of [...stale].slice(0, 10)) L.push("      " + relOf(s));
  }
  sec("[7] VERIFICACION G26/G27", L, 80);
}

/* ---------- Render: consola (caps) + archivo (completo) ------------------ */
const evidencePath = join(ROOT, "evidence-g28.txt");
const fileOut = ["G28 — evidencia del type-check (generado " + new Date().toISOString() + ")", ""];
for (const s of sections) {
  fileOut.push(s.title + "  [" + s.lines.length + " lineas]");
  fileOut.push(...s.lines);
  fileOut.push("");
}
writeFileSync(evidencePath, fileOut.join("\n"), "utf8");

const conOut = ["G28 — evidencia del type-check (solo lectura)", ""];
for (const s of sections) {
  if (s.fileOnly) {
    conOut.push(s.title + " — omitido en consola, completo en evidence-g28.txt");
    conOut.push("");
    continue;
  }
  conOut.push(s.title);
  const shown = s.lines.slice(0, s.cap);
  conOut.push(...shown);
  if (s.lines.length > shown.length) conOut.push("  ... (" + (s.lines.length - shown.length) + " lineas mas de esta seccion en evidence-g28.txt)");
  conOut.push("");
}
conOut.push("evidencia completa (sin caps): " + evidencePath);
console.log(conOut.join("\n"));
process.exit(0);
