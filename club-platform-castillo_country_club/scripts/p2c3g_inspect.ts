#!/usr/bin/env node
/**
 * P2-C3g · g2-inspect — evidencia de diseño para p2c3g_patch.ts
 * ══════════════════════════════════════════════════════════════════════════
 * Lee p2c3g_manifest.json (g1) y recolecta, con salida acotada:
 *   A. inventario de shared/ (mocks · lib · api · hooks)
 *   B. definición de useMCPQuery + rama mock (cómo resuelve dev-mode)
 *   C. contexto de los 18 call-sites (anclas: server y tool como tokens separados)
 *   D. registros mock: estructura + entradas viejas/reales (RISKY real: +25 lin)
 *   E. backend: def de los 16 tools reales (verdad de terreno para RISKY/LOSSY)
 *   F. precedente: useCommunicationData.ts ya llama al nombre real de #1
 * Escribe p2c3g_inspect.txt e imprime lo mismo por stdout.
 * Uso (raíz del platform):  npx tsx scripts/p2c3g_inspect.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const FE = path.join(ROOT, 'frontend', 'src');
const OUT = path.join(ROOT, 'p2c3g_inspect.txt');

const out: string[] = [];
const say = (s = '') => out.push(s);
const hr = (t: string) => say(`\n══ ${t} ${'═'.repeat(Math.max(0, 72 - t.length))}`);
const rel = (p: string) => path.relative(FE, p).split(path.sep).join('/');
const readFile = (p: string): string[] => {
  try { return fs.readFileSync(p, 'utf8').split(/\r?\n/); } catch { return []; }
};

// ── manifiesto (g1) ────────────────────────────────────────────────────────
const MAN = path.join(ROOT, 'p2c3g_manifest.json');
if (!fs.existsSync(MAN)) {
  console.error('✗ falta p2c3g_manifest.json — corre primero scripts/p2c3g_manifest.ts');
  process.exit(1);
}
const rows: { n: number; file: string; line: number; old: string; real: string; cls: string; abs: string | null }[]
  = JSON.parse(fs.readFileSync(MAN, 'utf8')).rows;
if (rows.length !== 18) {
  console.error(`✗ manifiesto con ${rows.length} filas (≠18) — regenerar g1`);
  process.exit(1);
}
say('P2-C3g · g2-inspect — evidencia para el diseño del parche');
say(`  filas: 18 · SAFE ${rows.filter(r => r.cls === 'SAFE').length} · LOSSY ${rows.filter(r => r.cls === 'LOSSY').length} · RISKY ${rows.filter(r => r.cls === 'RISKY').length}`);

// ── walkers ────────────────────────────────────────────────────────────────
const SKIP = new Set(['node_modules', '.git', 'dist', '__pycache__', '.venv', 'venv', 'frontend']);
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
const feTs = walk(FE, /\.(ts|tsx)$/);

// ═ A. inventario shared ════════════════════════════════════════════════════
hr('A. inventario shared/');
for (const d of ['shared/mocks', 'shared/lib', 'shared/api', 'shared/hooks']) {
  const p = path.join(FE, ...d.split('/'));
  if (!fs.existsSync(p)) { say(`  (sin ${d}/)`); continue; }
  say(`  ${d}/`);
  for (const e of fs.readdirSync(p)) say(`    ${e}`);
}

// ═ B. useMCPQuery ═════════════════════════════════════════════════════════
hr('B. definición de useMCPQuery');
const rxDef = /(export\s+)?(async\s+)?function\s+useMCPQuery\b|const\s+useMCPQuery\s*=/;
const hookFiles = feTs.filter(f => readFile(f).some(l => rxDef.test(l)));
if (!hookFiles.length) {
  say('  ✗ definición no hallada en frontend/src');
} else {
  say(`  ${hookFiles.length} archivo(s) definen useMCPQuery`);
  for (const f of hookFiles.slice(0, 2)) {
    const ls = readFile(f);
    const i = ls.findIndex(l => rxDef.test(l));
    say(`  ── ${rel(f)}:${i + 1} · cabecera+imports ──`);
    ls.slice(0, Math.min(16, i + 1)).forEach((l, k) => say(`  ${String(k + 1).padStart(4)} ${l.slice(0, 130)}`));
    say('  ── cuerpo (≤80 lin) ──');
    ls.slice(i, Math.min(i + 80, ls.length)).forEach((l, k) => say(`  ${String(i + k + 1).padStart(4)} ${l.slice(0, 130)}`));
    say('  ── líneas mock/env del archivo (≤25) ──');
    let m = 0;
    ls.forEach((l, k) => {
      if (m < 25 && /mock|MOCK|import\.meta\.env|VITE_|isMock/.test(l)) { m++; say(`  ${String(k + 1).padStart(4)} ${l.trim().slice(0, 120)}`); }
    });
  }
}

// ═ C. call-sites ══════════════════════════════════════════════════════════
hr('C. call-sites (anclas: server y tool son tokens separados)');
for (const r of rows) {
  const abs = r.abs && fs.existsSync(path.join(ROOT, r.abs)) ? path.join(ROOT, r.abs)
    : fs.existsSync(path.join(FE, r.file)) ? path.join(FE, r.file) : null;
  const ls = abs ? readFile(abs) : [];
  const after = r.cls === 'SAFE' ? 6 : 12;
  say(`  #${String(r.n).padStart(2)} [${r.cls}] ${r.file}:${r.line}   ${r.old} → ${r.real}`);
  if (!ls.length) { say('      (archivo ilegible — ¿movido?)'); continue; }
  for (let k = Math.max(0, r.line - 4); k < Math.min(ls.length, r.line + after); k++)
    say(`      ${String(k + 1).padStart(5)} ${k === r.line - 1 ? '>' : ' '} ${ls[k].slice(0, 140)}`);
}

// ═ D. registros mock ══════════════════════════════════════════════════════
hr('D. registros mock — estructura y entradas');
const regFiles = walk(path.join(FE, 'shared', 'mocks'), /\.(ts|tsx)$/);
const md = path.join(FE, 'shared', 'lib', 'mock-data.ts');
if (fs.existsSync(md)) regFiles.push(md);
say(`  archivos de registro: ${regFiles.map(rel).join(', ') || '(ninguno)'}`);
for (const f of regFiles) {
  const base = path.basename(f);
  if (base !== 'contracts.ts' && base !== 'mock-data.ts') continue;
  const ls = readFile(f);
  say(`  ── ${rel(f)} · primeras ${Math.min(45, ls.length)} lin ──`);
  ls.slice(0, base === 'contracts.ts' ? 45 : 25).forEach((l, k) => say(`  ${String(k + 1).padStart(4)} ${l.slice(0, 130)}`));
}
const riskyReals = new Set(rows.filter(r => r.cls === 'RISKY').map(r => r.real));
const lossyReals = new Set(rows.filter(r => r.cls === 'LOSSY').map(r => r.real));
say('  ── entradas por nombre (viejo ∪ real) ──');
for (const n of [...new Set(rows.flatMap(r => [r.old, r.real]))]) {
  const wide = riskyReals.has(n) ? 25 : lossyReals.has(n) ? 15 : 6;
  let hits = 0;
  for (const f of regFiles) {
    const ls = readFile(f);
    ls.forEach((l, i) => {
      if (hits < 3 && l.includes(n)) {
        hits++;
        say(`  ▸ ${n}  @ ${rel(f)}:${i + 1}`);
        for (let k = i; k < Math.min(i + 1 + wide, ls.length); k++)
          say(`      ${String(k + 1).padStart(5)} ${ls[k].slice(0, 130)}`);
      }
    });
  }
  if (!hits) say(`  ▸ ${n}  — sin entrada en los registros mock`);
}

// ═ E. backend ═════════════════════════════════════════════════════════════
hr('E. backend — def de los 16 tools reales (verdad de terreno)');
const pyRoot = [path.join(ROOT, 'backend'), path.join(ROOT, 'server')].find(p => fs.existsSync(p)) ?? ROOT;
const pyFiles = walk(pyRoot, /\.py$/);
say(`  raíz: ${path.relative(ROOT, pyRoot) || '.'} · ${pyFiles.length} py (verifier: 102)`);
const byCls = (c: string) => rows.filter(r => r.cls === c).map(r => r.real);
const wanted = [...new Set([...byCls('RISKY'), ...byCls('LOSSY'), ...byCls('SAFE')])];
for (const w of wanted) {
  const seg = w.split('.').pop()!;
  const rx = new RegExp(`\\bdef\\s+${seg}\\b`);
  const wide = riskyReals.has(w) || lossyReals.has(w) ? 12 : 4;
  let hits = 0;
  for (const f of pyFiles) {
    const ls = readFile(f);
    ls.forEach((l, i) => {
      if (hits < 3 && rx.test(l)) {
        hits++;
        say(`  ▸ ${w}  @ ${path.relative(pyRoot, f).split(path.sep).join('/')}:${i + 1}`);
        for (let k = Math.max(0, i - 1); k < Math.min(i + 1 + wide, ls.length); k++)
          say(`      ${String(k + 1).padStart(5)} ${ls[k].slice(0, 130)}`);
      }
    });
  }
  if (!hits) say(`  ▸ ${w}  — def no hallado (spec dinámico o lambda)`);
}

// ═ F. precedente ══════════════════════════════════════════════════════════
hr('F. precedente — useCommunicationData.ts:61 (ya llama al nombre real de #1)');
const uls = readFile(path.join(FE, 'features', 'communications', 'hooks', 'useCommunicationData.ts'));
if (uls.length) {
  for (let k = 49; k < Math.min(73, uls.length); k++)
    say(`  ${String(k + 1).padStart(4)} ${uls[k].slice(0, 140)}`);
} else say('  (no encontrado)');

// ── persistir + imprimir ───────────────────────────────────────────────────
fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
console.error(`\n✓ ${out.length} líneas · también en disco: p2c3g_inspect.txt`);