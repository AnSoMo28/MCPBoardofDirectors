#!/usr/bin/env node
/**
 * P2-C3g · g1 — Manifiesto de reescritura de las 18 refs EQUIV
 * ══════════════════════════════════════════════════════════════════════════
 * Fuente: p2c3g_raw.json (volcado --json del check 6, VI-14 v2 vivo).
 * Produce:
 *   1. Clasificación SAFE / LOSSY / RISKY por verbo (lectura vs escritura)
 *   2. Contexto de cada call-site (línea ±1) — insumo del parche g2
 *   3. Mapa de ocurrencias (viejo/real) en frontend/src: dónde vive el mock,
 *      y si el nombre real ya se sirve en algún lugar del frontend
 *   4. p2c3g_manifest.json — entrada mecánica de p2c3g_patch.ts (g2)
 *
 * Uso (desde la raíz del platform):
 *   npx tsx scripts/p2c3g_manifest.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const RAW_PATH = path.join(ROOT, 'p2c3g_raw.json');
const OUT_PATH = path.join(ROOT, 'p2c3g_manifest.json');
const FE_SRC = path.join(ROOT, 'frontend', 'src');

/** Invariante congelada en 290afa4 (check 6 · 2026-11-05) */
const EXPECT = { refs: 238, toolBackend: 169, equiv: 18, mockOnly: 47, capacidad: 1, deuda: 3 };

type Cls = 'SAFE' | 'LOSSY' | 'RISKY' | '?';

/** Clasificación por verbo: ¿la ref de LECTURA apunta a un tool de lectura? */
const CLASS: Record<string, { cls: Cls; why: string }> = {
  // SAFE — reescritura mecánica (revisar params en las anotadas)
  'facility_management.get_facility_reservations':       { cls: 'SAFE',  why: 'list/get_reservations → get_facility_reservations' },
  'facility_management.get_amenity_utilization':         { cls: 'SAFE',  why: 'get_utilization → amenity_utilization (alcance amenity)' },
  'family_profile.family_search':                        { cls: 'SAFE',  why: 'search_families / list_families → family_search' },
  'family_profile.family_get_profile':                   { cls: 'SAFE',  why: 'get_family → family_get_profile' },
  'executive_dashboard.generate_quarterly_board_report': { cls: 'SAFE',  why: 'get → generate (compute+return); revisar params' },
  'member_360.get_member_risk_assessment':               { cls: 'SAFE',  why: 'risk_matrix → risk_assessment; revisar shape' },
  'advisor_intelligence.generate_insight_narrative':     { cls: 'SAFE',  why: 'narrative_generate → generate_insight_narrative' },
  'advisor_intelligence.simulate_scenario':              { cls: 'SAFE',  why: 'scenario_simulate → simulate_scenario' },
  // LOSSY — lectura→lectura, shape/contrato distinto (adaptar consumidor)
  'communication.get_communication_analytics':           { cls: 'LOSSY', why: 'history → analytics: shape distinto' },
  'satisfaction.analyze_event_satisfaction':             { cls: 'LOSSY', why: 'survey_results → análisis computado' },
  'satisfaction.get_survey_for_event':                   { cls: 'LOSSY', why: 'active_survey → probablemente exige event_id' },
  'finance.finance_account_status':                      { cls: 'LOSSY', why: 'family_account → status: shape parcial' },
  // RISKY — lectura apunta a verb de ESCRITURA/dispatch: inspección obligatoria
  'member_engagement.design_reactivation_campaign':      { cls: 'RISKY', why: 'list → design: generación, no listado' },
  'finance.finance_invoice_create':                      { cls: 'RISKY', why: 'get_invoices (lectura) → create (ESCRITURA)' },
  'guest_management.manage_trial_memberships':           { cls: 'RISKY', why: 'list → manage: dispatch CRUD' },
  'facility_management.manage_facilities':               { cls: 'RISKY', why: 'list_available → manage: dispatch CRUD' },
};

interface Row {
  n: number; file: string; line: number; abs: string | null;
  old: string; real: string; cls: Cls; why: string;
  context: string[];
  oldElsewhere: { file: string; line: number; tag: string }[];
  realInFrontend: { file: string; line: number }[];
}

// ── 1. cargar raw (tolera ruido de stderr pegado en los extremos) ──────────
if (!fs.existsSync(RAW_PATH)) {
  console.error('✗ falta p2c3g_raw.json — regenera con:');
  console.error('  npx tsx scripts/verify-integration.ts --check 6 --json > p2c3g_raw.json');
  process.exit(1);
}
let raw: any;
try {
  const txt = fs.readFileSync(RAW_PATH, 'utf8');
  raw = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
} catch (e) {
  console.error(`✗ p2c3g_raw.json no parsea: ${(e as Error).message}`);
  process.exit(1);
}
if (raw?.scanned?.backendTools !== 198 || raw?.totals?.warnings !== 22) {
  console.warn(`⚠ drift: backendTools=${raw?.scanned?.backendTools} · warnings=${raw?.totals?.warnings} (esperaba 198/22) — el raw no es de la corrida auditada`);
}

// ── 2. recolectar issues EQUIV (walk defensivo: sin asumir nesting) ────────
function parseMsg(msg: string) {
  const old = /^(\S+)\s+is called under/.exec(msg)?.[1] ?? null;
  const real = /the real tool is\s+(\S+)/.exec(msg)?.[1] ?? null;
  return { old, real };
}
const found: { file: string; line: number; old: string; real: string }[] = [];
(function walk(node: unknown) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (o.severity === 'warning' && typeof o.message === 'string' &&
        o.message.includes('audited equivalence') &&
        typeof o.file === 'string' && typeof o.line === 'number') {
      const p = parseMsg(o.message as string);
      if (p.old && p.real) found.push({ file: o.file as string, line: o.line as number, old: p.old, real: p.real });
    }
    Object.values(o).forEach(walk);
  }
})(raw);

const seen = new Set<string>();
const rowsRaw = found
  .filter(r => { const k = `${r.file}:${r.line}:${r.old}`; if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

console.log('P2-C3g · g1 — manifiesto EQUIV');
console.log(`  fuente: p2c3g_raw.json · issues EQUIV extraídos: ${rowsRaw.length} (esperaba ${EXPECT.equiv})`);
if (rowsRaw.length !== EXPECT.equiv) {
  console.error(`✗ conteo inesperado (${rowsRaw.length} ≠ ${EXPECT.equiv}): el raw cambió — regenerar antes de continuar`);
  process.exit(1);
}

// ── 3. resolver rutas y contexto de cada call-site ─────────────────────────
function resolveAbs(file: string): string | null {
  for (const c of [path.join(FE_SRC, file), path.join(ROOT, file)])
    if (fs.existsSync(c)) return c;
  return null;
}
const rows: Row[] = rowsRaw.map((r, i) => {
  const abs = resolveAbs(r.file);
  const context: string[] = [];
  if (abs) {
    const ls = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    if (r.line - 1 < ls.length) {
      for (let k = Math.max(0, r.line - 2); k < Math.min(ls.length, r.line + 1); k++)
        context.push(`${String(k + 1).padStart(5)} ${k === r.line - 1 ? '>' : ' '} ${ls[k]}`);
    } else {
      context.push('      (línea fuera de rango — el archivo cambió desde el escaneo)');
    }
  }
  const c = CLASS[r.real] ?? { cls: '?' as Cls, why: 'sin clasificar — revisar manualmente' };
  return { n: i + 1, file: r.file, line: r.line, abs, old: r.old, real: r.real, cls: c.cls, why: c.why, context, oldElsewhere: [], realInFrontend: [] };
});
const unresolved = rows.filter(r => !r.abs);
if (unresolved.length) console.warn(`⚠ ${unresolved.length} archivo(s) sin resolver: ${unresolved.map(r => r.file).join(', ')}`);

// ── 4. mapa de ocurrencias en frontend/src ─────────────────────────────────
const feFiles: string[] = [];
(function walkDir(d: string) {
  let ents: fs.Dirent[] = [];
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkDir(p);
    else if (/\.(ts|tsx)$/.test(e.name)) feFiles.push(p);
  }
})(FE_SRC);
console.log(`  frontend/src ts/tsx: ${feFiles.length} archivos (verifier escaneó ${raw?.scanned?.tsTsFiles})`);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const names = [...new Set(rows.flatMap(r => [r.old, r.real]))];
const rx = new Map(names.map(n => [n, new RegExp(esc(n) + '(?![\\w.])')]));
const occ: Record<string, { file: string; line: number }[]> = {};
for (const f of feFiles) {
  let txt = '';
  try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (!names.some(n => txt.includes(n))) continue;
  const rel = path.relative(FE_SRC, f).split(path.sep).join('/');
  txt.split(/\r?\n/).forEach((l, i) => {
    for (const n of names) if (rx.get(n)!.test(l)) (occ[n] ??= []).push({ file: rel, line: i + 1 });
  });
}
const tagOf = (f: string) => /mock/i.test(f) ? '[MOCK?]' : (/types?\./.test(f) || /\/types\//.test(f)) ? '[TYPES?]' : '';
for (const r of rows) {
  r.oldElsewhere = (occ[r.old] ?? []).filter(o => !(o.file === r.file && o.line === r.line))
    .map(o => ({ ...o, tag: tagOf(o.file) }));
  r.realInFrontend = occ[r.real] ?? [];
}

// ── 5. reporte ─────────────────────────────────────────────────────────────
const by = (c: Cls) => rows.filter(r => r.cls === c);
console.log(`  invariante: refs=${EXPECT.refs} · TOOL=${EXPECT.toolBackend} · EQUIV=${EXPECT.equiv} · MOCK=${EXPECT.mockOnly} · CAPACIDAD=${EXPECT.capacidad} · DEUDA=${EXPECT.deuda}`);
console.log(`  archivos únicos: ${new Set(rows.map(r => r.file)).size} · nombres reales únicos: ${new Set(rows.map(r => r.real)).size}\n`);
console.log('── clasificación por verbo ──');
console.log(`  SAFE  ${by('SAFE').length} → reescritura mecánica`);
console.log(`  LOSSY ${by('LOSSY').length} → reescritura + adaptación de shape/contrato`);
console.log(`  RISKY ${by('RISKY').length} → lectura→escritura: inspección obligatoria (posible reclasificación a DEUDA)\n`);
for (const c of ['RISKY', 'LOSSY', 'SAFE'] as Cls[]) {
  console.log(`── ${c} ──`);
  for (const r of by(c)) console.log(`  #${String(r.n).padStart(2)} ${r.file}:${r.line}  ${r.old} → ${r.real}   (${r.why})`);
  console.log('');
}
console.log('── contexto de call-sites (para g2) ──');
for (const r of rows) {
  console.log(`  #${String(r.n).padStart(2)} ${r.file}:${r.line}`);
  for (const l of r.context) console.log(`      ${l}`);
}
console.log('\n── ocurrencias en frontend/src ──');
for (const r of rows) {
  const oe = r.oldElsewhere.length ? r.oldElsewhere.map(o => `${o.file}:${o.line}${o.tag}`).join(', ') : 'ninguna otra';
  const re = r.realInFrontend.length ? r.realInFrontend.map(o => `${o.file}:${o.line}`).join(', ') : 'no existe aún en frontend';
  console.log(`  #${String(r.n).padStart(2)} viejo en: ${oe}`);
  console.log(`       real en: ${re}`);
}

// ── 6. persistir manifiesto ────────────────────────────────────────────────
fs.writeFileSync(OUT_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'p2c3g_raw.json',
  expect: EXPECT,
  rows: rows.map(({ abs, ...rest }) => ({ ...rest, abs: abs ? path.relative(ROOT, abs).split(path.sep).join('/') : null })),
}, null, 2), 'utf8');
console.log(`\n✓ p2c3g_manifest.json escrito (${rows.length} filas)`);
console.log('  siguiente: pegar este output → diseño de p2c3g_patch.ts (g2)');