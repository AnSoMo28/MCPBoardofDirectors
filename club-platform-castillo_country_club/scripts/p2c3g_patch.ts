#!/usr/bin/env node
/**
 * P2-C3g · g3-patch — renombres verificados + cirugía del ledger VI14_EQUIVALENCES
 * ══════════════════════════════════════════════════════════════════════════
 * Disposiciones congeladas con la evidencia de g2-inspect + g2-inspect2:
 *   · REWRITE (8): renombra agent/tool/params SOLO donde el contrato quedó
 *     verificado (clave de response + firma backend). Cada fila pasa un
 *     preflight; si falla, se demora — nunca edita a ciegas.
 *   · C3H (4): equivalencia verdadera que necesita adaptador de consumidor —
 *     se marca en el ledger, no se toca el call-site.
 *   · DEUDA (6): falsa equivalencia confirmada — se REMUEVE del ledger.
 * Idempotente: una segunda corrida no cambia nada.
 * Escribe p2c3g_patch_report.txt e imprime lo mismo por stdout.
 * Uso (raíz del platform):  npx tsx scripts/p2c3g_patch.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const FE = path.join(ROOT, 'frontend', 'src');
const REPORT = path.join(ROOT, 'p2c3g_patch_report.txt');

const out: string[] = [];
const say = (s = '') => out.push(s);
const hr = (t: string) => say(`\n══ ${t} ${'═'.repeat(Math.max(0, 72 - t.length))}`);
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join('/');
const cache = new Map<string, string[]>();
const readFile = (p: string): string[] => {
  const c = cache.get(p);
  if (c) return c;
  let ls: string[] = [];
  try { ls = fs.readFileSync(p, 'utf8').split(/\r?\n/); } catch { ls = []; }
  cache.set(p, ls);
  return ls;
};

// ── manifiesto (g1) ────────────────────────────────────────────────────────
const MAN = path.join(ROOT, 'p2c3g_manifest.json');
if (!fs.existsSync(MAN)) {
  console.error('✗ falta p2c3g_manifest.json — corre primero scripts/p2c3g_manifest.ts');
  process.exit(1);
}
const rows: { n: number; file: string; line: number; old: string; real: string; cls: string }[]
  = JSON.parse(fs.readFileSync(MAN, 'utf8')).rows;
if (rows.length !== 18) {
  console.error(`✗ manifiesto con ${rows.length} filas (≠18) — regenerar g1`);
  process.exit(1);
}
const oldReal = new Map(rows.map(r => [r.old, r.real] as const));

// ── walk ───────────────────────────────────────────────────────────────────
const SKIP = new Set(['node_modules', '.git', 'dist', '__pycache__', '.venv', 'venv', 'coverage']);
function walk(d: string, ext: RegExp, acc: string[] = []): string[] {
  let ents: fs.Dirent[] = [];
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, ext, acc);
    else if (ext.test(e.name)) acc.push(p);
  }
  return acc;
}
const pyRoot = [path.join(ROOT, 'backend'), path.join(ROOT, 'server')].find(p => fs.existsSync(p)) ?? ROOT;
const pyFiles = walk(pyRoot, /\.py$/);
const feTs = walk(FE, /\.(ts|tsx)$/);

// ── disposiciones congeladas (evidencia g2) ────────────────────────────────
type ParamSpec = { find: RegExp; replace: string };
type RewriteSpec = { kind: 'REWRITE'; agent: string; tool: string; params?: ParamSpec; check?: string };
type Disp = RewriteSpec | { kind: 'C3H'; why: string } | { kind: 'DEUDA'; why: string };

const D: Record<string, Disp> = {
  // #1 — C+D7: history lo sirve get_notification_history (🟢 AUTO); analytics NO.
  'communication.get_communication_history':
    { kind: 'REWRITE', agent: 'communication', tool: 'get_notification_history', check: 'history_sig' },
  // #2 — D11: dispatch lister (action="list") → { campaigns: [...] }.
  'engagement.list_reactivation_campaigns':
    { kind: 'REWRITE', agent: 'member_engagement', tool: 'design_reactivation_campaign',
      params: { find: /^\{\s*\}$/, replace: '{ action: "list" }' }, check: 'campaigns_key' },
  // #3 — D10: análisis por EVENTO (overall_avg, sentiment) ≠ resultados por encuesta.
  'engagement.get_survey_results':
    { kind: 'DEUDA', why: 'analyze_event_satisfaction agrega por EVENTO ≠ resultados por encuesta (question_summaries, nps)' },
  // #4 — D9: get_survey_for_event devuelve RESPUESTAS, no la plantilla del form.
  'engagement.get_active_survey':
    { kind: 'DEUDA', why: 'get_survey_for_event devuelve respuestas enviadas ≠ plantilla con preguntas que el form necesita' },
  // #5 — D13+E: el tipo consumidor espeja campo a campo el modelo del repo.
  'facilities.get_utilization':
    { kind: 'REWRITE', agent: 'facility_management', tool: 'get_amenity_utilization' },
  // #6 — D5: firma snake (facility_id/date_from/date_to); reservations[] top-level.
  'facilities.list_reservations':
    { kind: 'REWRITE', agent: 'facility_management', tool: 'get_facility_reservations',
      params: { find: /^\{\s*facilityId,\s*dateFrom,\s*dateTo\s*\}$/,
                replace: '{ facility_id: facilityId, date_from: dateFrom, date_to: dateTo }' },
      check: 'reservations_key' },
  // #7 — D4: cubre saldo/overdue pero NO aging_30/60/90 ni monthly_dues.
  'finance.get_family_account':
    { kind: 'C3H', why: 'finance_account_status da saldo/overdue sin aging ni monthly_dues — adaptador de consumidor' },
  // #8 — escritura pura con HITL.
  'finance.get_invoices':
    { kind: 'DEUDA', why: 'finance_invoice_create es ESCRITURA con HITL — no existe tool de listado de facturas' },
  // #9 — D3: dispatch lister → { trial_memberships: [...] }.
  'guests.list_trial_memberships':
    { kind: 'REWRITE', agent: 'guest_management', tool: 'manage_trial_memberships',
      params: { find: /^\{\s*page:\s*trialPage,\s*page_size:\s*10\s*\}$/, replace: '{ action: "list" }' },
      check: 'trials_key' },
  // #10 — D1: search_families(query, tier, age_group, engagement_min, limit).
  'families.search_families':
    { kind: 'REWRITE', agent: 'family_profile', tool: 'family_search' },
  // #11 — D12: dispatch lister → { facilities: [...] }.
  'facilities.list_available_facilities':
    { kind: 'REWRITE', agent: 'facility_management', tool: 'manage_facilities',
      params: { find: /^\{\s*\}$/, replace: '{ action: "list" }' } },
  // #12 — return de family_get_profile sin capturar + FamilyDetailResponse camelCase.
  'families.get_family':
    { kind: 'C3H', why: 'family_get_profile existe (AUTO) pero shape de retorno sin capturar y consumer camelCase — adaptador' },
  // #13 — D6: el repo NO filtra por family_id.
  'facilities.get_reservations':
    { kind: 'C3H', why: 'get_facility_reservations no filtra por family_id — filtrar client-side en el hook' },
  // #14 — D14: HITL, devuelve request de aprobación ≠ reporte que la query lee.
  'reports.get_board_report':
    { kind: 'DEUDA', why: 'generate_quarterly_board_report es HITL: devuelve request de aprobación, no el reporte' },
  // #15 — D8: no existe tool de matriz de riesgo.
  'reports.get_risk_matrix':
    { kind: 'DEUDA', why: 'no existe tool de matriz de riesgo; get_member_risk_assessment es por member_id' },
  // #16 — D1: query/limit; el selector no usa la paginación del response.
  'families.list_families':
    { kind: 'REWRITE', agent: 'family_profile', tool: 'family_search',
      params: { find: /^\{\s*page:\s*1,\s*limit:\s*100,\s*search:\s*search\s*\|\|\s*undefined\s*\}$/,
                replace: '{ query: search || "", limit: 100 }' },
      check: 'no_pagination_use' },
  // #17 — D16: exige insight_data (dict) que el hook no tiene.
  'finance.narrative_generate':
    { kind: 'DEUDA', why: 'generate_insight_narrative exige insight_data (dict) — el hook no tiene insight que transformar' },
  // #18 — D17: exige base_data + proposed_changes.
  'finance.scenario_simulate':
    { kind: 'C3H', why: 'simulate_scenario exige base_data+proposed_changes — sourcearlos antes (adaptador de consumidor)' },
};

const NOTES: Record<string, string> = {
  'guests.list_trial_memberships':
    'trialPage queda sin lector — con noUnusedLocals quita el estado o pagina client-side (el backend no pagina)',
};
// ── helpers de tipos ───────────────────────────────────────────────────────
function resolveSpec(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(FE, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const c of [`${base}.ts`, `${base}.tsx`, base, path.join(base, 'index.ts')]) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* probar siguiente */ }
  }
  return null;
}

function findTypeDef(typeName: string, fromFile: string): { file: string; block: string } | null {
  const local = readFile(fromFile);
  const rx = new RegExp(`(interface|type)\\s+${typeName}\\b`);
  const li = local.findIndex(l => rx.test(l));
  if (li >= 0) return { file: fromFile, block: local.slice(li, li + 14).join('\n') };
  // imports multilínea: matchear cláusula completa contra el texto unificado
  const text = local.join('\n');
  const impRx = new RegExp(`import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*["']([^"']+)["']`, 'g');
  for (const m of text.matchAll(impRx)) {
    if (!new RegExp(`\\b${typeName}\\b`).test(m[1])) continue;
    const t = resolveSpec(m[2], fromFile);
    if (!t) continue;
    const tl = readFile(t);
    const ti = tl.findIndex(x => rx.test(x));
    if (ti >= 0) return { file: t, block: tl.slice(ti, ti + 14).join('\n') };
  }
  return null;
}

// ── preflight por fila ─────────────────────────────────────────────────────
function runCheck(row: { old: string; file: string }, spec: RewriteSpec): { reason: string | null; note?: string } {
  const file = path.join(FE, row.file);
  switch (spec.check) {
    case 'history_sig': {
      const f = pyFiles.find(p => /communication_agent\.py$/.test(p));
      if (!f) return { reason: 'communication_agent.py no hallado' };
      const ls = readFile(f);
      const i = ls.findIndex(l => l.includes('async def get_notification_history'));
      if (i < 0) return { reason: 'get_notification_history no existe en backend' };
      const sig = ls.slice(i, i + 22).join('\n');
      if (!/member_id/.test(sig)) {
        spec.params = { find: /^\{\s*member_id:.*limit:\s*\d+\s*\}$/, replace: '{ limit: 100 }' };
        return { reason: null, note: 'firma sin member_id → params reducidos a { limit: 100 }' };
      }
      return { reason: null };
    }
    case 'campaigns_key': {
      const d = findTypeDef('CampaignListResponse', file);
      if (!d) return { reason: 'CampaignListResponse: definición no hallada' };
      return d.block.includes('campaigns') ? { reason: null } : { reason: 'CampaignListResponse sin clave "campaigns"' };
    }
    case 'reservations_key': {
      const d = findTypeDef('CalendarQueryResponse', file);
      if (!d) return { reason: 'CalendarQueryResponse: definición no hallada' };
      return d.block.includes('reservations') ? { reason: null } : { reason: 'CalendarQueryResponse sin clave "reservations"' };
    }
    case 'trials_key': {
      const d = findTypeDef('TrialListResponse', file);
      if (!d) return { reason: 'TrialListResponse: definición no hallada' };
      return d.block.includes('trial_memberships') ? { reason: null } : { reason: 'TrialListResponse sin clave "trial_memberships"' };
    }
    case 'no_pagination_use': {
      const ls = readFile(file);
      if (ls.some(l => l.includes('totalPages'))) return { reason: 'el componente lee totalPages (family_search no pagina)' };
      const d = findTypeDef('FamilyListResponse', file);
      if (!d) return { reason: 'FamilyListResponse: definición no hallada' };
      return d.block.includes('families') ? { reason: null } : { reason: 'FamilyListResponse sin clave "families"' };
    }
    default:
      return { reason: null };
  }
}

// ── aplicación del renombre ────────────────────────────────────────────────
const splitOld = (old: string): [string, string] => {
  const i = old.indexOf('.');
  return [old.slice(0, i), old.slice(i + 1)];
};

function applyRewrite(row: { old: string; file: string }, spec: RewriteSpec):
  { status: 'aplicado' | 'ya' | 'demorado' | 'saltado'; detail: string } {
  const file = path.join(FE, row.file);
  const ls = readFile(file);
  if (!ls.length) return { status: 'saltado', detail: 'archivo no hallado' };
  const [oldAgent, oldTool] = splitOld(row.old);

  const pairAt = (agent: string, tool: string): number => {
    for (let i = 0; i < ls.length - 1; i++) {
      if (ls[i].trim() !== `"${agent}",`) continue;
      let j = i + 1;
      while (j < ls.length && ls[j].trim() === '') j++;
      if (ls[j] && ls[j].trim() === `"${tool}",`) return i;
    }
    return -1;
  };

  const oldI = pairAt(oldAgent, oldTool);
  if (oldI < 0) {
    return pairAt(spec.agent, spec.tool) >= 0
      ? { status: 'ya', detail: 'renombre ya presente' }
      : { status: 'saltado', detail: 'call-site no hallado (deriva del manifiesto)' };
  }

  let j = oldI + 1;
  while (j < ls.length && ls[j].trim() === '') j++;
  let k = j + 1;
  while (k < ls.length && ls[k].trim() === '') k++;

  if (spec.params) {
    const trimmed = ls[k].trim();
    const hadComma = trimmed.endsWith(',');
    const body = hadComma ? trimmed.slice(0, -1) : trimmed;
    if (!spec.params.find.test(body))
      return { status: 'demorado', detail: `params no coinciden: "${body}"` };
    const indent = /^(\s*)/.exec(ls[k])?.[1] ?? '';
    ls[k] = `${indent}${spec.params.replace}${hadComma ? ',' : ''}`;
  }

  ls[oldI] = ls[oldI].replace(`"${oldAgent}"`, `"${spec.agent}"`);
  ls[j] = ls[j].replace(`"${oldTool}"`, `"${spec.tool}"`);
  fs.writeFileSync(file, ls.join('\n'), 'utf8');
  cache.delete(file);
  return { status: 'aplicado', detail: `"${oldAgent}","${oldTool}" → "${spec.agent}","${spec.tool}"` };
}

// ── A. filas ───────────────────────────────────────────────────────────────
say('P2-C3g · g3-patch — renombres verificados + cirugía del ledger');
say(`  filas: ${rows.length} · REWRITE ${[...Object.values(D)].filter(d => d.kind === 'REWRITE').length} · C3H ${[...Object.values(D)].filter(d => d.kind === 'C3H').length} · DEUDA ${[...Object.values(D)].filter(d => d.kind === 'DEUDA').length}`);

hr('A. Filas — renombres con preflight');
const stats = { aplicado: 0, ya: 0, demorado: 0, saltado: 0, c3h: 0, deuda: 0 };
const appliedOlds = new Set<string>();
for (const row of rows) {
  const d = D[row.old];
  if (!d) { say(`  #${row.n} ?? disposición desconocida (${row.old})`); continue; }
  if (d.kind === 'DEUDA') {
    stats.deuda++;
    say(`  #${String(row.n).padStart(2)} DEUDA    ${row.old} — ${d.why}`);
    continue;
  }
  if (d.kind === 'C3H') {
    stats.c3h++;
    say(`  #${String(row.n).padStart(2)} C3H      ${row.old} ≡ ${row.real} — ${d.why}`);
    continue;
  }
  const file = path.join(FE, row.file);
  const chk = runCheck(row, d);
  if (chk.reason) {
    stats.demorado++;
    say(`  #${String(row.n).padStart(2)} DEMORADO ${row.old} — preflight: ${chk.reason}`);
    continue;
  }
  const r = applyRewrite(row, d);
  if (r.status === 'aplicado' || r.status === 'ya') appliedOlds.add(row.old);
  stats[r.status]++;
  const tag = ({ aplicado: 'REWRITE ✓', ya: 'REWRITE =', demorado: 'DEMORADO', saltado: 'SALTADO' } as const)[r.status];
  say(`  #${String(row.n).padStart(2)} ${tag.padEnd(10)} ${rel(file)} — ${r.detail}${chk.note ? ` · ${chk.note}` : ''}`);
  if (NOTES[row.old]) say(`        nota: ${NOTES[row.old]}`);
}

// ── B. cirugía del ledger ──────────────────────────────────────────────────
hr('B. Cirugía del ledger VI14_EQUIVALENCES');
const DEUDA_OLDS = Object.entries(D).filter(([, v]) => v.kind === 'DEUDA').map(([k]) => k);
const C3H_OLDS = Object.entries(D).filter(([, v]) => v.kind === 'C3H').map(([k]) => k);

// rewrites resueltos: confirmar que el par viejo ya no se llama en frontend/src
function countCallPairs(agent: string, tool: string): number {
  let files = 0;
  for (const f of feTs) {
    const ls = readFile(f);
    for (let i = 0; i < ls.length - 1; i++) {
      if (ls[i].trim() !== `"${agent}",`) continue;
      let j = i + 1;
      while (j < ls.length && ls[j].trim() === '') j++;
      if (ls[j] && ls[j].trim() === `"${tool}",`) { files++; break; }
    }
  }
  return files;
}

let ledgerPath: string | null = null;
for (const f of walk(ROOT, /\.(ts|tsx|py|md|json)$/)) {
  const name = path.basename(f);
  if (name.startsWith('p2c3g_') || name === 'package.json' || name === 'package-lock.json') continue;
  if (readFile(f).some(l => l.includes('VI14_EQUIVALENCES'))) { ledgerPath = f; break; }
}

let deudaRemoved = 0;
let totalRemoved = 0;
let remainingEquiv = 18;

if (!ledgerPath) {
  say('  ✗ archivo del ledger VI14_EQUIVALENCES no hallado — cirugía omitida (aplicar a mano según §C)');
} else {
  const resolvedOlds: string[] = [];
  const stillRef: string[] = [];
  for (const o of appliedOlds) {
    const [a, t] = splitOld(o);
    if (countCallPairs(a, t) === 0) resolvedOlds.push(o);
    else stillRef.push(o);
  }
  const removeOlds = new Set([...DEUDA_OLDS, ...resolvedOlds]);

  const ls = readFile(ledgerPath);
  let removed = 0;
  const removedNames: string[] = [];
  const kept = ls.filter(l => {
    for (const o of removeOlds) {
      const real = oldReal.get(o);
      if (real && l.includes(o) && l.includes(real)) { removed++; removedNames.push(o); return false; }
    }
    return true;
  });
  let updated = 0;
  let tagged = 0;
  const outLines = kept.map(l => {
    // #1 no aplicado: la entrada sobrevive, pero con el real corregido
    // (analytics NO sirve history; lo sirve get_notification_history)
    if (!appliedOlds.has('communication.get_communication_history')
      && l.includes('communication.get_communication_history')
      && l.includes('get_communication_analytics')) {
      updated++;
      return l.replace('get_communication_analytics', 'get_notification_history');
    }
    for (const o of C3H_OLDS) {
      const real = oldReal.get(o);
      if (real && l.includes(o) && l.includes(real) && !l.includes('P2-C3h')) {
        tagged++;
        return `${l.replace(/\s*$/, '')}  // P2-C3h: adaptador de consumidor pendiente`;
      }
    }
    return l;
  });
  deudaRemoved = removedNames.filter(n => DEUDA_OLDS.includes(n)).length;
  totalRemoved = removedNames.length;
  remainingEquiv = 18 - removedNames.length;
  if (removed || updated || tagged) {
    // best-effort: si el mismo archivo lleva el literal missingBoth, alinearlo
    const debtAdded = deudaRemoved;
    for (let i = 0; i < outLines.length; i++) {
      const m = /(\bmissingBoth\s*[:=]\s*)(\d+)/.exec(outLines[i]);
      if (m) {
        outLines[i] = outLines[i].replace(m[0], `${m[1]}${Number(m[2]) + debtAdded}`);
        say(`  missingBoth literal: ${m[2]} → ${Number(m[2]) + debtAdded} (en ${path.basename(ledgerPath ?? '')})`);
        break;
      }
    }
    fs.writeFileSync(ledgerPath, outLines.join('\n'), 'utf8');
    cache.delete(ledgerPath);
  }
  say(`  ledger: ${rel(ledgerPath)}`);
  say(`  removidas ${removed} entradas (${deudaRemoved} falsas equivalencias + ${removedNames.length - deudaRemoved} resueltas por renombre):`);
  removedNames.forEach(n => say(`    ✂ ${n}`));
  if (stillRef.length) {
    say('  ⚠ mantenidas — par viejo aún referenciado en otro archivo:');
    stillRef.forEach(n => say(`    · ${n}`));
  }
  say(`  actualizadas ${updated} (#1 no aplicado → real corregido a get_notification_history)`);
  say(`  marcadas ${tagged}/${C3H_OLDS.length} con // P2-C3h (cola de adaptación)`);
}

// ── C. cola C3h + end-state ────────────────────────────────────────────────
hr('C. End-state tras esta corrida');
say(`  equivalente:  18 → ${remainingEquiv}   (${totalRemoved} removidas; las ${C3H_OLDS.length} C3H siguen como equivalencia)`);
say('  toolBackend:  169      (sin cambio — este parche no agrega tools)');
say(`  missingBoth:  3 → ${3 + deudaRemoved}    (${deudaRemoved} falsas equivalencias pasan a deuda)`);
say(`  colaC3h:      ${C3H_OLDS.length} filas  (#7 #12 #13 #18 — adaptadores de consumidor)`);
say('  destino:      C3h adapta los 4 consumidores → equivalente llega a 0');
say('  dev-mock:     ninguna de las 18 tiene fábrica bajo viejo ni real');
say('               (evidencia B) — ya rotas en dev-mock; este parche corrige');
say('               la ruta backend real. Agregar fábricas es opcional.');
say('');
say(`  resumen corrida: aplicados ${stats.aplicado} · ya presentes ${stats.ya} · demorados ${stats.demorado} · saltados ${stats.saltado}`);

// ── persistir + imprimir ───────────────────────────────────────────────────
fs.writeFileSync(REPORT, out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
console.error(`\n✓ reporte: p2c3g_patch_report.txt`);