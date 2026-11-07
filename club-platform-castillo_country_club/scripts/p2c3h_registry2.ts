/**
 * P2-C3h · h3-registry2 — scanner v2 + transporte completo + reclasificación final
 * Ejecutar desde la RAIZ: npx tsx scripts/p2c3h_registry2.ts · SOLO LECTURA
 * Reporte: p2c3h_registry2_report.txt
 *
 * Bugs de h2 que corrige (evidencia: sección A del reporte h2):
 *   1 · 6 agentes declaran tools con decoradores POSICIONALES/MIXTOS:
 *         @MCPTool("name", "desc", ApprovalLevel.AUTO)          → advisor_intelligence
 *         @MCPTool("name", "desc", approval=ApprovalLevel.AUTO) → age_group, compliance,
 *           event_orchestrator, finance, wellness
 *       El scanner sólo leía name= kwarg → 0 tools → sus callsites se clasificaron
 *       como DEUDA falsa (los 107 de h2 están inflados).
 *   2 · base.py: el ejemplo del docstring de la clase MCPTool contaba como tool.
 *       Fix: blanquear docstrings (triple-quoted) y comentarios antes de escanear.
 *   3 · Faltaba el corazón del transporte: toolNameAdapter.ts + mcp-router —
 *       si el adapter remapea nombres viejos, la clasificación cambia.
 *   4 · El paste de h2 quedó cortado antes de E/F — regeneradas aquí
 *       (capa HTTP que sirve /api/agents/{server}/{tool} + reconciliación del ledger).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FE = path.join(ROOT, "frontend");
const BE = path.join(ROOT, "backend");
const REPORT: string[] = [];
const say = (s = ""): void => { console.log(s); REPORT.push(s); };
const read = (p: string): string => fs.readFileSync(p, "utf8");
const rel = (p: string): string => path.relative(ROOT, p).replaceAll("\\", "/");
const clean = (s: string): string => s.replace(/\r$/, "");
const countOf = (s: string, re: RegExp): number => (s.match(re) ?? []).length;

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", "__pycache__", "venv", ".venv"].includes(e.name)) continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

// ── limpieza de fuente python (preserva números de línea) ──
function blankTriple(src: string): string {
  const blank = (m: string): string => m.replace(/[^\n]/g, " ");
  return src.replace(/"""[\s\S]*?"""/g, blank).replace(/'''[\s\S]*?'''/g, blank);
}
function stripComment(line: string): string {
  let out = "";
  let inStr = false;
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      out += ch;
      if (ch === "\\") { out += line[i + 1] ?? ""; i++; continue; }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = true; quote = ch; out += ch; continue; }
    if (ch === "#") break;
    out += ch;
  }
  return out;
}
function pyClean(src: string): string {
  return blankTriple(src).split("\n").map(stripComment).join("\n");
}

// ── scanner de decoradores (balance de paréntesis respetando strings) ──
type Dec = { dec: string; text: string; line: number };
function extractDecorators(src: string): Dec[] {
  const decs: Dec[] = [];
  const re = /@([A-Za-z_]\w*)\s*\(/g;
  for (const m of src.matchAll(re)) {
    const start = m.index ?? 0;
    let depth = 1;
    let i = start + m[0].length;
    let inStr = false;
    let quote = "";
    for (; i < src.length && depth > 0; i++) {
      const ch = src[i];
      if (inStr) {
        if (ch === "\\") { i++; continue; }
        if (ch === quote) inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") { inStr = true; quote = ch; continue; }
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    decs.push({ dec: m[1], text: src.slice(start, i), line: countOf(src.slice(0, start), /\n/g) + 1 });
  }
  return decs;
}

// ── registro v2 ──
type Tool = { name: string; approval: string; line: number };
const regByFile = new Map<string, Tool[]>();
const agentNameByFile = new Map<string, string>();
const agentFiles = walk(path.join(BE, "src/club_mcp/agents"), [".py"]);
for (const f of agentFiles) {
  const raw = read(f);
  const src = pyClean(raw);
  const an = raw.split("\n").find((t) => /agent_name\b/.test(t) && /["']/.test(t));
  const anm = an?.match(/agent_name\b[^=]*=\s*["']([^"']+)["']/);
  if (anm) agentNameByFile.set(rel(f), anm[1]);
  else agentNameByFile.set(rel(f), path.basename(f, ".py"));
  const tools: Tool[] = [];
  for (const d of extractDecorators(src)) {
    if (d.dec !== "MCPTool") continue;
    const kw = d.text.match(/\bname\s*=\s*["']([\w.]+)["']/);
    const pos = d.text.match(/@\w+\s*\(\s*["']([\w.]+)["']/);
    const name = kw?.[1] ?? pos?.[1];
    if (!name) continue;
    const ap = d.text.match(/ApprovalLevel\.(\w+)/);
    tools.push({ name, approval: ap?.[1] ?? "(default)", line: d.line });
  }
  regByFile.set(rel(f), tools);
}

say("P2-C3h · h3-registry2 — scanner v2 + transporte completo + reclasificación final");
try { say(`  base: ${execSync("git log --oneline -1", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim()}`); } catch { /* noop */ }
say("");

// ══════════════════════════════════════════════════════════════
// A · Forense v2 — raw (fuente limpia) vs registro, por archivo
// ══════════════════════════════════════════════════════════════
say("══ A. Forense v2 — @MCPTool en fuente limpia vs registro ══");
const flagged: string[] = [];
for (const f of agentFiles) {
  const rawClean = countOf(pyClean(read(f)), /@MCPTool\s*\(/g);
  const reg = (regByFile.get(rel(f)) ?? []).length;
  const bad = rawClean !== reg;
  if (bad) flagged.push(rel(f));
  say(`  ${path.basename(f).padEnd(36)} limpio=${String(rawClean).padStart(3)} · registro=${String(reg).padStart(3)}${bad ? "  ⚠" : ""}`);
}
if (flagged.length === 0) {
  say("  · sin discrepancias — scanner v2 capturó todo (base.py limpio=0: el ejemplo del docstring ya no cuenta)");
} else {
  say(`  ── evidencia de los ${flagged.length} archivo(s) ⚠ (primeros 2 decoradores c/u) ──`);
  for (const fr of flagged.slice(0, 6)) {
    const rawLines = read(path.join(ROOT, fr)).split("\n");
    for (const d of extractDecorators(pyClean(read(path.join(ROOT, fr)))).filter((x) => x.dec === "MCPTool").slice(0, 2)) {
      say(`    ── ${fr}:${d.line} ──`);
      for (let i = Math.max(0, d.line - 1); i < Math.min(rawLines.length, d.line - 1 + 22); i++) {
        say(`    ${String(i + 1).padStart(4)}│ ${clean(rawLines[i])}`);
      }
      say("    ⋮");
    }
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// B · Registro v2 completo
// ══════════════════════════════════════════════════════════════
say("══ B. Registro v2 — tools por agente ══");
const total = [...regByFile.values()].reduce((a, t) => a + t.length, 0);
say(`  · ${agentFiles.length} archivos de agente · ${total} tools (h2: 136 · referencia C3g: 169)`);
const allTools = new Map<string, string>();
const dupes: string[] = [];
for (const [f, ts] of regByFile) {
  for (const t of ts) {
    if (allTools.has(t.name)) dupes.push(`${t.name}: ${path.basename(allTools.get(t.name)!)} + ${path.basename(f)}`);
    else allTools.set(t.name, f);
  }
}
for (const [f, ts] of [...regByFile.entries()].filter(([, ts]) => ts.length > 0).sort((a, b) => b[1].length - a[1].length)) {
  say(`    ${path.basename(f)} · agent=${agentNameByFile.get(f) ?? "?"} · ${ts.length}`);
  const names = ts.map((t) => `${t.name}(${t.approval})`);
  for (let i = 0; i < names.length; i += 3) say(`      ${names.slice(i, i + 3).join(" · ")}`);
}
if (dupes.length) {
  say("  ⚠ nombres de tool DUPLICADOS (todo se registra en UN solo FastMCP → colisión):");
  dupes.forEach((d) => say(`      ${d}`));
} else {
  say("  · sin nombres duplicados entre agentes");
}
say("");

// ══════════════════════════════════════════════════════════════
// C · Transporte — toolNameAdapter + mcp-router (el corazón)
// ══════════════════════════════════════════════════════════════
say("══ C. Transporte — toolNameAdapter.ts + módulo mcp ══");
const LIB = path.join(FE, "src/shared/lib");
try {
  say("  ── frontend/src/shared/lib (nivel 1) ──");
  fs.readdirSync(LIB).forEach((n) => say(`    ${n}`));
} catch { say("  ⚠ sin shared/lib"); }
const adapterPath = path.join(LIB, "toolNameAdapter.ts");
if (fs.existsSync(adapterPath)) {
  const al = read(adapterPath).split("\n");
  say(`  ── toolNameAdapter.ts (${al.length} líneas — COMPLETO) ──`);
  al.forEach((t, i) => say(`    ${String(i + 1).padStart(4)}│ ${clean(t)}`));
} else {
  say("  ⚠ toolNameAdapter.ts no está en shared/lib — buscando:");
  for (const f of walk(path.join(FE, "src"), [".ts"])) {
    if (/toolNameAdapter/i.test(path.basename(f))) say(`    ✓ ${rel(f)}`);
  }
}
const mcpCandidates = ["mcp.ts", "mcp/index.ts", "mcp-router.ts", "mcp-router/index.ts"];
let mcpPath = mcpCandidates.map((c) => path.join(LIB, c)).find((p) => fs.existsSync(p)) ?? null;
if (!mcpPath) {
  try {
    const hit = fs.readdirSync(LIB).find((n) => /^mcp/i.test(n));
    if (hit) {
      const p = path.join(LIB, hit);
      mcpPath = fs.statSync(p).isDirectory() ? path.join(p, "index.ts") : p;
    }
  } catch { /* noop */ }
}
if (mcpPath) {
  const ml = read(mcpPath).split("\n");
  say(`  ── ${rel(mcpPath)} (${ml.length} líneas) ──`);
  const limit = Math.min(ml.length, 260);
  for (let i = 0; i < limit; i++) say(`    ${String(i + 1).padStart(4)}│ ${clean(ml[i])}`);
  if (ml.length > limit) {
    say("    ⋮ (resto — sólo líneas route/mock/agent/backend/registry):");
    for (let i = limit; i < ml.length; i++) {
      if (/route|mock|agent|backend|registry|fallback|prefer/i.test(ml[i])) say(`    ${String(i + 1).padStart(4)}│ ${clean(ml[i])}`);
    }
  }
} else {
  say("  ⚠ no encontré el módulo mcp (import \"./mcp\") — listado de shared/lib arriba");
}
say("");

// ══════════════════════════════════════════════════════════════
// D · Capa HTTP — quién sirve /api/agents/{server}/{tool}
// ══════════════════════════════════════════════════════════════
say("══ D. Capa HTTP del backend ══");
try {
  say("  ── backend/src (nivel 1) ──");
  fs.readdirSync(path.join(BE, "src")).forEach((n) => say(`    ${n}`));
  say("  ── backend/src/club_mcp (nivel 1) ──");
  fs.readdirSync(path.join(BE, "src/club_mcp")).forEach((n) => say(`    ${n}`));
} catch { /* noop */ }
const httpFiles: string[] = [];
for (const f of walk(BE, [".py"])) {
  const src = read(f);
  if (/FastAPI\(|APIRouter\(|uvicorn|@(app|router)\.(get|post|put|delete|patch)\(/.test(src)) httpFiles.push(f);
}
if (httpFiles.length === 0) {
  say("  ⚠ sin FastAPI/APIRouter en backend/ — ¿cómo se sirve /api/agents/...? (grep literal):");
  let n = 0;
  for (const f of walk(BE, [".py"])) {
    read(f).split("\n").forEach((t, i) => {
      if (/api\/agents|\/agents\//.test(t) && n < 15) { n++; say(`    ${rel(f)}:${i + 1}│ ${clean(t).trim()}`); }
    });
  }
  if (n === 0) say("    · ninguna mención — la ruta vive en otro proceso/proxy");
} else {
  for (const f of httpFiles.slice(0, 6)) {
    const lines = read(f).split("\n");
    say(`  ── ${rel(f)} (${lines.length} líneas) · rutas y wiring ──`);
    let n = 0;
    lines.forEach((t, i) => {
      if (/(FastAPI\(|APIRouter\(|uvicorn|@(app|router)\.(get|post|put|delete|patch)\(|api\/agents|\/agents\/|include_router|add_mcp|mount)/.test(t) && n < 60) {
        n++;
        say(`    ${String(i + 1).padStart(4)}│ ${clean(t)}`);
      }
    });
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// E · Reclasificación final de callsites
// ══════════════════════════════════════════════════════════════
say("══ E. Reclasificación final (registro v2 + conciencia del adapter) ══");
const ledger = new Map<string, string>();
{
  const src = read(path.join(ROOT, "scripts/p2c3e_vi14_patch.ts"));
  const anchor = src.indexOf("VI14_EQUIVALENCES");
  if (anchor >= 0) {
    for (const m of src.slice(anchor, anchor + 20000).matchAll(/"(\w+\.\w+)"\s*:\s*\[([^\]]*)\]/g)) ledger.set(m[1], m[2].trim());
  }
}
// palabras presentes en toolNameAdapter (posible remapeo de nombres viejos)
const adapterWords = new Set<string>();
if (fs.existsSync(adapterPath)) {
  for (const m of read(adapterPath).matchAll(/["']([\w.]+)["']/g)) adapterWords.add(m[1]);
}

const feFiles = walk(path.join(FE, "src"), [".ts", ".tsx"]);
type Call = { kind: string; agent: string; tool: string; file: string; line: number };
const calls: Call[] = [];
const callRe = /useMCP(Query|Mutation)\s*(?:<[\s\S]*?>)?\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
for (const f of feFiles) {
  let src = ""; try { src = read(f); } catch { continue; }
  const lines = src.split("\n");
  for (const m of src.matchAll(callRe)) {
    const line = countOf(src.slice(0, m.index ?? 0), /\n/g) + 1;
    if (clean(lines[line - 1] ?? "").trim().startsWith("//")) continue;
    calls.push({ kind: m[1], agent: m[2], tool: m[3], file: rel(f), line });
  }
}
say(`  · ${calls.length} callsites`);

const KNOWN: Record<string, string> = {
  guests: "backend/src/club_mcp/agents/guest_management_agent.py",
  guest_management: "backend/src/club_mcp/agents/guest_management_agent.py",
  engagement: "backend/src/club_mcp/agents/member_engagement_agent.py",
  member_engagement: "backend/src/club_mcp/agents/member_engagement_agent.py",
  families: "backend/src/club_mcp/agents/family_profile.py",
  family_profile: "backend/src/club_mcp/agents/family_profile.py",
  communication: "backend/src/club_mcp/agents/communication_agent.py",
  facilities: "backend/src/club_mcp/agents/facility_management_agent.py",
  facility_management: "backend/src/club_mcp/agents/facility_management_agent.py",
  satisfaction: "backend/src/club_mcp/agents/satisfaction_agent.py",
  executive_dashboard: "backend/src/club_mcp/agents/executive_dashboard_agent.py",
  member_360: "backend/src/club_mcp/agents/member_360_agent.py",
  ml_intelligence: "backend/src/club_mcp/agents/ml_intelligence.py",
  document_intelligence: "backend/src/club_mcp/agents/document_intelligence_agent.py",
  proactive_recommendation: "backend/src/club_mcp/agents/proactive_recommendation_agent.py",
  sports_recreation: "backend/src/club_mcp/agents/sports_recreation_agent.py",
  cultural_social: "backend/src/club_mcp/agents/cultural_social_agent.py",
  wellness: "backend/src/club_mcp/agents/wellness.py",
  finance: "backend/src/club_mcp/agents/finance.py",
  events: "backend/src/club_mcp/agents/event_orchestrator.py",
  age_group: "backend/src/club_mcp/agents/age_group.py",
  compliance: "backend/src/club_mcp/agents/compliance.py",
  advisor_intelligence: "backend/src/club_mcp/agents/advisor_intelligence.py",
};
const filesWithTools = [...regByFile.entries()].filter(([, ts]) => ts.length > 0).map(([f]) => f);
const usedKeys = [...new Set(calls.map((c) => c.agent))].sort();
const agentMap = new Map<string, { file: string } | null>();
for (const k of usedKeys) agentMap.set(k, KNOWN[k] && filesWithTools.includes(KNOWN[k]) ? { file: KNOWN[k] } : null);
say("  · mapeo agent-key → agente backend:");
for (const k of usedKeys) {
  const r = agentMap.get(k);
  const n = r ? (regByFile.get(r.file)?.length ?? 0) : 0;
  say(`      ${k.padEnd(24)} → ${r ? `${path.basename(r.file)} (${n} tools)` : "⚠ SIN AGENTE (cross-agent)"}`);
}

type Row = Call & { status: string; proposed?: string[]; elsewhere?: string; adapter?: boolean };
const rows: Row[] = [];
for (const c of calls) {
  const r = agentMap.get(c.agent);
  const tools = r ? (regByFile.get(r.file)?.map((t) => t.name) ?? []) : [];
  const ledRaw = ledger.get(`${c.agent}.${c.tool}`);
  const proposed = ledRaw !== undefined ? (ledRaw.match(/"([^"]+)"/g) ?? []).map((s) => s.slice(1, -1)) : undefined;
  if (tools.includes(c.tool)) { rows.push({ ...c, status: "REAL" }); continue; }
  if (proposed) {
    const inAgent = proposed.filter((p) => tools.includes(p));
    const elsewhere = proposed.find((p) => !tools.includes(p) && allTools.has(p));
    if (inAgent.length) { rows.push({ ...c, status: "MIGRABLE", proposed }); continue; }
    if (elsewhere) { rows.push({ ...c, status: "MIGRABLE-OTRO-AGENTE", proposed, elsewhere: `${elsewhere} @ ${path.basename(allTools.get(elsewhere)!)}` }); continue; }
    rows.push({ ...c, status: "DEUDA-BACKEND", proposed, adapter: adapterWords.has(c.tool) }); continue;
  }
  if (allTools.has(c.tool)) { rows.push({ ...c, status: "MIGRABLE-OTRO-AGENTE", elsewhere: `${c.tool} @ ${path.basename(allTools.get(c.tool)!)}` }); continue; }
  rows.push({ ...c, status: "DEUDA-BACKEND", adapter: adapterWords.has(c.tool) });
}
const real = rows.filter((r) => r.status === "REAL");
const mig = rows.filter((r) => r.status === "MIGRABLE");
const otro = rows.filter((r) => r.status === "MIGRABLE-OTRO-AGENTE");
const debt = rows.filter((r) => r.status === "DEUDA-BACKEND");
say("");
say(`  ▸ REAL ${real.length} · MIGRABLE ${mig.length} · MIGRABLE-OTRO-AGENTE ${otro.length} · DEUDA-BACKEND ${debt.length}`);
say("    (h2 decía: REAL 174 · MIGRABLE 2 · OTRO 12 · DEUDA 107 — parser incompleto)");
say("    REAL por agent-key: " + usedKeys.map((k) => `${k}=${real.filter((r) => r.agent === k).length}`).join(" · "));
say("");
say("  ── MIGRABLE (misma agent-key) ──");
if (!mig.length) say("    · ninguna");
for (const r of mig) say(`    ✎ ${r.agent}.${r.tool} → ${r.proposed?.join("|")} · ${r.file}:${r.line} (${r.kind})`);
say("");
say("  ── MIGRABLE-OTRO-AGENTE (cambiar agent-key) ──");
if (!otro.length) say("    · ninguna");
for (const r of otro) say(`    ✎ ${r.agent}.${r.tool}${r.proposed ? ` → ${r.proposed.join("|")}` : ""} · ${r.elsewhere} · ${r.file}:${r.line} (${r.kind})`);
say("");
say("  ── DEUDA-BACKEND final (agrupada por agent.tool) ──");
const debtGroups = new Map<string, { n: number; files: Set<string>; adapter: boolean; ledger?: string[] }>();
for (const r of debt) {
  const k = `${r.agent}.${r.tool}`;
  const g = debtGroups.get(k) ?? { n: 0, files: new Set<string>(), adapter: false };
  g.n++;
  g.files.add(r.file);
  g.adapter = g.adapter || !!r.adapter;
  if (r.proposed) g.ledger = r.proposed;
  debtGroups.set(k, g);
}
if (debtGroups.size === 0) say("    · ninguna 🎉");
for (const [k, g] of [...debtGroups.entries()].sort()) {
  say(`    ✗ ${k} · ${g.n} callsite(s) en ${g.files.size} archivo(s)${g.ledger ? ` · ledger: [${g.ledger.join(", ")}]` : ""}${g.adapter ? " · ⚠ nombre presente en toolNameAdapter (ver C)" : ""}`);
  for (const f of g.files) say(`        ${f}`);
}
say("");

// ══════════════════════════════════════════════════════════════
// F · Ledger — reconciliación v2
// ══════════════════════════════════════════════════════════════
say("══ F. Ledger — reconciliación v2 ══");
for (const [k, v] of ledger) {
  const live = calls.some((c) => `${c.agent}.${c.tool}` === k);
  const proposed = (v.match(/"([^"]+)"/g) ?? []).map((s) => s.slice(1, -1));
  const present = proposed.filter((p) => allTools.has(p));
  say(`    ${live ? "vivo " : "MUERTO"} · ${k} → [${v}]${present.length ? ` · en backend: ${present.map((p) => `${p} @ ${path.basename(allTools.get(p)!)}`).join(", ")}` : ""}`);
}
say("");

// ══════════════════════════════════════════════════════════════
// G · End-state — insumos del plan de batches
// ══════════════════════════════════════════════════════════════
say("══ G. End-state — insumos para el plan de batches C3h ══");
say(`  · registro v2: ${total} tools en ${regByFile.size} archivos (dupes: ${dupes.length})`);
say(`  · callsites: ${rows.length} → REAL ${real.length} · MIGRABLE ${mig.length} · OTRO-AGENTE ${otro.length} · DEUDA ${debt.length} (${debtGroups.size} tools únicos)`);
say(`  · adapter: ${adapterWords.size > 0 ? `${adapterWords.size} literales en toolNameAdapter (revisar C para saber si remapea)` : "no encontrado"}`);
say("  · batches propuestos (se confirmarán con este reporte):");
say("      B1 · MIGRABLE misma agent-key (frontend, estilo C3g)");
say("      B2 · MIGRABLE-OTRO-AGENTE (frontend, cambio de agent-key)");
say("      B3 · DEUDA-BACKEND (crear tool o degradar — necesita firma/envelope de cada agente)");
say("      B4 · campos/envelopes heredados (H del reporte h1)");
say("");
say("══ fin h3 ══");
fs.writeFileSync(path.join(ROOT, "p2c3h_registry2_report.txt"), REPORT.join("\n") + "\n", "utf8");
console.log("");
console.log("✓ reporte: p2c3h_registry2_report.txt");
