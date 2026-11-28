#!/usr/bin/env node
/**
 * P2-C3g · g2-inspect2 — última ronda de evidencia antes del parche
 * ══════════════════════════════════════════════════════════════════════════
 * Lee p2c3g_manifest.json (g1) y recolecta lo que decide el diseño de
 * p2c3g_patch.ts:
 *   A. api.ts callMCPTool   — envelope + fallback mock (decide los adaptadores)
 *   B. mock-registry.ts     — fábricas runtime bajo nombres reales (dev-mode)
 *   C. useCommunicationData — precedente #1: ¿qué tool sirve history?
 *   D. backend              — firmas completas/specs de los tools ambiguos
 *   E. contracts.ts         — interfaces de los tools reales
 *   F. tipos consumidores   — los genéricos de los 18 call-sites
 *   G. mock-data.ts         — shapes que devolvía el mock viejo
 * Escribe p2c3g_inspect2.txt e imprime lo mismo por stdout.
 * Uso (raíz del platform):  npx tsx scripts/p2c3g_inspect2.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const FE = path.join(ROOT, 'frontend', 'src');
const OUT = path.join(ROOT, 'p2c3g_inspect2.txt');

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
const OLDS = [...new Set(rows.map(r => r.old))];
const REALS = [...new Set(rows.map(r => r.real))];
const NAMES = [...new Set([...OLDS, ...REALS])];

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
say('P2-C3g · g2-inspect2 — evidencia final para p2c3g_patch.ts');
say(`  filas: 18 · olds únicos: ${OLDS.length} · reales únicos: ${REALS.length}`);
say(`  backend: ${pyFiles.length} py · frontend/src: ${feTs.length} ts/tsx`);

function pyGrep(title: string, needle: string, before: number, after: number, maxHits = 2, fileRe?: RegExp) {
  say(`  ── ${title} ──`);
  let hits = 0;
  for (const f of pyFiles) {
    if (fileRe && !fileRe.test(rel(f))) continue;
    const ls = readFile(f);
    for (let i = 0; i < ls.length && hits < maxHits; i++) {
      if (ls[i].includes(needle)) {
        hits++;
        say(`  ▸ ${rel(f)}:${i + 1}`);
        for (let k = Math.max(0, i - before); k < Math.min(ls.length, i + after); k++)
          say(`      ${String(k + 1).padStart(5)} ${ls[k].slice(0, 132)}`);
      }
    }
  }
  if (!hits) say('    (sin hits)');
}

// ═ A. api.ts — callMCPTool ═════════════════════════════════════════════════
hr('A. shared/lib/api.ts — callMCPTool (envelope + fallback mock)');
{
  const als = readFile(path.join(FE, 'shared', 'lib', 'api.ts'));
  if (!als.length) {
    say('  ✗ no encontrado');
  } else {
    const i = als.findIndex(l => /(async\s+)?function\s+callMCPTool|const\s+callMCPTool\s*=/.test(l));
    say(`  ${als.length} líneas · callMCPTool @ línea ${i + 1}`);
    if (i >= 0)
      for (let k = Math.max(0, i - 6); k < Math.min(als.length, i + 95); k++)
        say(`  ${String(k + 1).padStart(4)} ${als[k].slice(0, 132)}`);
    say('  ── líneas mock/env/fallback del archivo ──');
    let m = 0;
    als.forEach((l, k) => {
      if (m < 22 && /mock|getMockResponse|import\.meta\.env|VITE_|fallback|health/i.test(l)) {
        m++;
        say(`  ${String(k + 1).padStart(4)} ${l.trim().slice(0, 124)}`);
      }
    });
    if (!m) say('    (sin hits)');
  }
}

// ═ B. mock-registry.ts — fábricas runtime ══════════════════════════════════
hr('B. shared/mocks/mock-registry.ts — fábricas runtime (nombres reales)');
{
  const mls = readFile(path.join(FE, 'shared', 'mocks', 'mock-registry.ts'));
  if (!mls.length) {
    say('  ✗ no encontrado');
  } else {
    say(`  ${mls.length} líneas · primeras 26:`);
    mls.slice(0, 26).forEach((l, k) => say(`  ${String(k + 1).padStart(4)} ${l.slice(0, 132)}`));
    say('  ── hits de nuestros nombres (viejo ∪ real) ──');
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const n of NAMES) {
      const rx = new RegExp(esc(n) + '(?![\\w.])');
      let hits = 0;
      mls.forEach((l, i) => {
        if (hits < 2 && rx.test(l)) {
          hits++;
          say(`  ▸ ${n} @ ${i + 1}`);
          for (let k = i; k < Math.min(i + 5, mls.length); k++)
            say(`      ${String(k + 1).padStart(5)} ${mls[k].slice(0, 132)}`);
        }
      });
      if (!hits) say(`  ▹ ${n} — sin hit`);
    }
  }
}

// ═ C. precedente #1 ════════════════════════════════════════════════════════
hr('C. useCommunicationData.ts:1-60 — ¿qué tool sirve history?');
readFile(path.join(FE, 'features', 'communications', 'hooks', 'useCommunicationData.ts'))
  .slice(0, 60)
  .forEach((l, k) => say(`  ${String(k + 1).padStart(4)} ${l.slice(0, 140)}`));

// ═ D. backend — firmas completas y specs ═══════════════════════════════════
hr('D. backend — firmas completas y specs de los tools ambiguos');
pyGrep('D1 · spec family_search', 'family_search', 8, 20);
pyGrep('D2 · spec family_get_profile', 'family_get_profile', 8, 20);
pyGrep('D3 · firma completa manage_trial_memberships', 'async def manage_trial_memberships', 0, 50);
pyGrep('D4 · finance_account_status (firma + return)', 'async def finance_account_status', 0, 40);
pyGrep('D5 · get_facility_reservations (agent + repo)', 'async def get_facility_reservations', 0, 46, 3);
pyGrep('D6 · repo facility — capacidad family_id', 'family_id', 0, 1, 14, /facility_management_repo/);
{
  say('  ── D7 · communication_agent — herramientas con history ──');
  const f = pyFiles.find(p => /communication_agent\.py$/.test(p));
  const ls = f ? readFile(f) : [];
  let m = 0;
  ls.forEach((l, i) => {
    if (m < 16 && l.includes('history')) { m++; say(`  ${String(i + 1).padStart(5)} ${l.trim().slice(0, 124)}`); }
  });
  if (!m) say('    (sin hits)');
  say('  ── D7b · communication_agent — tools registrados ──');
  m = 0;
  ls.forEach((l, i) => {
    if (m < 60 && /name"?\s*[=:]\s*["']/.test(l)) { m++; say(`  ${String(i + 1).padStart(5)} ${l.trim().slice(0, 110)}`); }
  });
  if (!m) say('    (sin hits)');
}
{
  say('  ── D8 · executive_dashboard — líneas con risk ──');
  const f = pyFiles.find(p => /executive_dashboard_agent\.py$/.test(p));
  const ls = f ? readFile(f) : [];
  let m = 0;
  ls.forEach((l, i) => {
    if (m < 14 && l.includes('risk')) { m++; say(`  ${String(i + 1).padStart(5)} ${l.trim().slice(0, 124)}`); }
  });
  if (!m) say('    (sin hits)');
  say('  ── D8b · executive_dashboard_agent — tools registrados ──');
  m = 0;
  ls.forEach((l, i) => {
    if (m < 40 && /name"?\s*[=:]\s*["']/.test(l)) { m++; say(`  ${String(i + 1).padStart(5)} ${l.trim().slice(0, 110)}`); }
  });
  if (!m) say('    (sin hits)');
}
pyGrep('D9 · get_survey_for_event (return)', 'async def get_survey_for_event', 0, 40);
pyGrep('D10 · analyze_event_satisfaction (return)', 'async def analyze_event_satisfaction', 0, 42);
pyGrep('D11 · design_reactivation_campaign', 'async def design_reactivation_campaign', 0, 62);
pyGrep('D12 · manage_facilities', 'async def manage_facilities', 0, 58);
pyGrep('D13 · get_amenity_utilization (agent + repo)', 'async def get_amenity_utilization', 0, 42, 3);
pyGrep('D14 · generate_quarterly_board_report (params + return)', 'async def generate_quarterly_board_report', 0, 42);
pyGrep('D15 · member_360.get_member_risk_assessment', 'async def get_member_risk_assessment', 0, 40);
pyGrep('D16 · advisor_intelligence (2 tools)', 'async def generate_insight_narrative', 0, 40);
pyGrep('D17 · advisor_intelligence.simulate_scenario', 'async def simulate_scenario', 0, 40);

// ═ E. contracts.ts — interfaces de los tools reales ═════════════════════════
hr('E. contracts.ts — interfaces de los tools reales');
{
  const cls = readFile(path.join(FE, 'shared', 'mocks', 'contracts.ts'));
  if (!cls.length) {
    say('  ✗ no encontrado');
  } else {
    for (const real of REALS) {
      const i = cls.findIndex(l => l.includes(`"${real}"`));
      if (i < 0) { say(`  ▹ ${real} — sin entry`); continue; }
      const tn = /:\s*([A-Za-z0-9_]+)\s*;/.exec(cls[i])?.[1] ?? null;
      say(`  ▸ ${real} → ${tn} @ ${i + 1}`);
      if (!tn) continue;
      const j = cls.findIndex(l => new RegExp(`(interface|type)\\s+${tn}\\b`).test(l));
      if (j < 0) { say('      (tipo no declarado en contracts.ts)'); continue; }
      for (let k = j; k < Math.min(cls.length, j + 17); k++)
        say(`      ${String(k + 1).padStart(5)} ${cls[k].slice(0, 132)}`);
    }
  }
}

// ═ F. tipos consumidores ═══════════════════════════════════════════════════
hr('F. tipos consumidores — los genéricos de los 18 call-sites');
{
  const TYPES = [
    'HistoryItem', 'CampaignListResponse', 'SurveyResultsResponse', 'SurveyTemplate',
    'AmenityUtilizationResponse', 'CalendarQueryResponse', 'FamilyAccountData', 'Invoice',
    'TrialListResponse', 'FamilySearchResponse', 'FacilityListResponse', 'FamilyDetailResponse',
    'ReservationListResponse', 'BoardReport', 'RiskSummary', 'FamilyListResponse',
    'FinanceNarrativeGenerateResponse', 'FinanceScenarioSimulateResponse',
  ];
  for (const t of TYPES) {
    const rx = new RegExp(`(interface|type)\\s+${t}\\b`);
    let found = false;
    for (const f of feTs) {
      const ls = readFile(f);
      for (let i = 0; i < ls.length; i++) {
        if (rx.test(ls[i])) {
          found = true;
          say(`  ▸ ${t} @ ${rel(f).replace(/^frontend\/src\//, '')}:${i + 1}`);
          for (let k = i; k < Math.min(ls.length, i + 16); k++)
            say(`      ${String(k + 1).padStart(5)} ${ls[k].slice(0, 132)}`);
          break;
        }
      }
      if (found) break;
    }
    if (!found) say(`  ▹ ${t} — declaración no hallada`);
  }
}

// ═ G. mock-data.ts — shapes del mock viejo ═════════════════════════════════
hr('G. mock-data.ts — shapes que devolvía el mock viejo');
{
  const mds = readFile(path.join(FE, 'shared', 'lib', 'mock-data.ts'));
  if (!mds.length) {
    say('  ✗ no encontrado');
  } else {
    for (const m of [
      'mockFamilyAccount', 'mockGetReservations', 'mockBoardReport', 'mockRiskMatrix',
      'mockSurveyResults', 'mockGetSurvey', 'mockListFamilies', 'mockGetFamilyDetail',
    ]) {
      const i = mds.findIndex(l => new RegExp(`(const|function)\\s+${m}\\b`).test(l));
      if (i < 0) { say(`  ▹ ${m} — no hallado`); continue; }
      say(`  ▸ ${m} @ ${i + 1}`);
      for (let k = i; k < Math.min(mds.length, i + 14); k++)
        say(`      ${String(k + 1).padStart(5)} ${mds[k].slice(0, 132)}`);
    }
  }
}

// ── persistir + imprimir ───────────────────────────────────────────────────
fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
console.error(`\n✓ ${out.length} líneas · también en disco: p2c3g_inspect2.txt`);