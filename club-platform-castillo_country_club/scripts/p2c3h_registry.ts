/**
 * P2-C3h · h2-registry — registro backend REAL + transporte + reclasificación
 * Ejecutar desde la RAIZ: npx tsx scripts/p2c3h_registry.ts · SOLO LECTURA
 *
 * Bug de h1 que corrige: el extractor usaba ventana fija de 14 líneas desde
 * "@MCPTool(" y sólo comillas dobles → 136/169 tools; finance/wellness/
 * event_orchestrator/age_group/compliance/advisor_intelligence quedaron con 0
 * tools y sus callsites se clasificaron como DEUDA falsa.
 *
 * A · Forense de decoradores (crudo vs registro + bloques de los fallidos)
 * B · Registro REAL (scanner con balance de paréntesis respetando strings,
 *     comillas simples/dobles, name/approval en cualquier punto del bloque)
 * C · Transporte frontend (shared/lib/api.ts: callMCPTool/routeMCPCall/mocks)
 * D · Reclasificación de los callsites con el registro corregido
 * E · Misterio "hitl" (tools de aprobación + capa HTTP del backend)
 * F · Reconciliación del ledger
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FE = path.join(ROOT, "frontend");
const BE = path.join(ROOT, "backend/src/club_mcp");
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
      if (["node_modules", ".git", "dist", "build", "__pycache__"].includes(e.name)) continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

// ── scanner de decoradores: balance de paréntesis respetando strings ──
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

// ── construcción del registro (silenciosa; se imprime en B) ──
type Tool = { name: string; approval: string; dec: string; line: number };
const regByFile = new Map<string, Tool[]>();
const agentNameByFile = new Map<string, string>();
const noApprovalNotes: string[] = [];
const agentFiles = walk(path.join(BE, "agents"), [".py"]);
for (const f of agentFiles) {
  const src = read(f);
  const an = src.split("\n").find((t) => /agent_name\s*(?::[^=]+)?=\s*["']/.test(t));
  const anm = an?.match(/["']([^"']+)["']/);
  if (anm) agentNameByFile.set(rel(f), anm[1]);
  const tools: Tool[] = [];
  const noAppr: string[] = [];
  for (const d of extractDecorators(src)) {
    const mn = d.text.match(/\bname\s*=\s*["']([\w.]+)["']/);
    if (!mn) continue;
    const ma = d.text.match(/\bapproval\s*=\s*ApprovalLevel\.(\w+)/);
    if (ma) tools.push({ name: mn[1], approval: ma[1], dec: d.dec, line: d.line });
    else if (/tool/i.test(d.dec)) { tools.push({ name: mn[1], approval: "(default)", dec: d.dec, line: d.line }); noAppr.push(mn[1]); }
  }
  regByFile.set(rel(f), tools);
  if (noAppr.length) noApprovalNotes.push(`${path.basename(f)}: ${noAppr.join(", ")}`);
}

say("P2-C3h · h2-registry — registro backend real + transporte + reclasificación");
try { say(`  base: ${execSync("git log --oneline -1", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim()}`); } catch { /* noop */ }
say("");

// ══════════════════════════════════════════════════════════════
// A · Forense de decoradores
// ══════════════════════════════════════════════════════════════
say("══ A. Forense — conteo crudo vs registro por archivo ══");
const flagged: string[] = [];
for (const f of agentFiles) {
  const src = read(f);
  const raw = countOf(src, /@MCPTool\s*\(/g);
  const appr = countOf(src, /ApprovalLevel\./g);
  const reg = (regByFile.get(rel(f)) ?? []).length;
  const bad = raw !== reg || (raw === 0 && appr > 0);
  if (bad) flagged.push(rel(f));
  say(`  ${path.basename(f).padEnd(36)} @MCPTool=${String(raw).padStart(3)} · ApprovalLevel=${String(appr).padStart(3)} · registro=${String(reg).padStart(3)}${bad ? "  ⚠" : ""}`);
}
say("");
if (flagged.length === 0) {
  say("  · sin discrepancias — el scanner nuevo capturó todo");
} else {
  say(`  ── evidencia de los ${flagged.length} archivo(s) ⚠ (hasta 2 decoradores c/u) ──`);
  for (const fr of flagged.slice(0, 8)) {
    const src = read(path.join(ROOT, fr));
    const decs = extractDecorators(src).filter((d) => /\bname\s*=/.test(d.text));
    say(`  ── ${fr} · ${decs.length} decoradores con name= ──`);
    if (decs.length === 0) {
      const lines = src.split("\n");
      const idx = lines.findIndex((t) => /ApprovalLevel\./.test(t));
      if (idx >= 0) {
        say("    (sin decoradores con name= — contexto de la primera aparición de ApprovalLevel:)");
        for (let i = Math.max(0, idx - 20); i < Math.min(lines.length, idx + 6); i++) {
          say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
        }
      }
    }
    for (const d of decs.slice(0, 2)) {
      const lines = src.split("\n");
      for (let i = d.line - 1; i < Math.min(lines.length, d.line - 1 + 26); i++) {
        say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
      }
      say("    ⋮");
    }
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// B · Registro REAL
// ══════════════════════════════════════════════════════════════
say("══ B. Registro REAL — tools por agente ══");
const total = [...regByFile.values()].reduce((a, t) => a + t.length, 0);
say(`  · ${agentFiles.length} archivos de agente · ${total} tools (h1: 136 · referencia C3g: 169)`);
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
  for (let i = 0; i < names.length; i += 4) say(`      ${names.slice(i, i + 4).join(" · ")}`);
}
if (noApprovalNotes.length) { say("  ℹ tools sin approval= explícito (asumen default AUTO):"); noApprovalNotes.forEach((n) => say(`      ${n}`)); }
if (dupes.length) {
  say("  ⚠ nombres de tool DUPLICADOS (un solo FastMCP común → colisión potencial):");
  dupes.forEach((d) => say(`      ${d}`));
}
say("");

// ══════════════════════════════════════════════════════════════
// C · Transporte frontend
// ══════════════════════════════════════════════════════════════
say("══ C. Transporte frontend — shared/lib/api.ts ══");
const apiPath = path.join(FE, "src/shared/lib/api.ts");
if (fs.existsSync(apiPath)) {
  const lines = read(apiPath).split("\n");
  say(`  ── frontend/src/shared/lib/api.ts (${lines.length} líneas) ──`);
  const limit = Math.min(lines.length, 230);
  for (let i = 0; i < limit; i++) say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
  if (lines.length > limit) {
    say("    ⋮ (resto — sólo líneas con agent/route/mock/call):");
    for (let i = limit; i < lines.length; i++) {
      if (/callMCPTool|routeMCP|agent|mock|AGENT|ROUTE|fallback/i.test(lines[i])) say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
    }
  }
} else {
  say("  ⚠ no está en src/shared/lib/api.ts — buscando la definición de callMCPTool:");
  for (const f of walk(path.join(FE, "src"), [".ts"])) {
    try { if (/export (async )?function callMCPTool|export const callMCPTool/.test(read(f))) say(`    ✓ ${rel(f)}`); } catch { /* noop */ }
  }
}
say("  ── superficie de mocks (imports de mocks) ──");
const mockFiles: string[] = [];
for (const f of walk(path.join(FE, "src"), [".ts", ".tsx"])) {
  try { if (/from\s+["'][^"']*mocks?[^"']*["']/.test(read(f))) mockFiles.push(rel(f)); } catch { /* noop */ }
}
say(`  · ${mockFiles.length} archivos importan mocks · primeros 12: ${mockFiles.slice(0, 12).join(", ")}`);
say("");

// ══════════════════════════════════════════════════════════════
// D · Reclasificación de callsites
// ══════════════════════════════════════════════════════════════
say("══ D. Reclasificación de callsites (registro corregido) ══");
const ledger = new Map<string, string>();
{
  const src = read(path.join(ROOT, "scripts/p2c3e_vi14_patch.ts"));
  const anchor = src.indexOf("VI14_EQUIVALENCES");
  if (anchor >= 0) {
    for (const m of src.slice(anchor, anchor + 20000).matchAll(/"(\w+\.\w+)"\s*:\s*\[([^\]]*)\]/g)) ledger.set(m[1], m[2].trim());
  }
}

const feFiles = walk(path.join(FE, "src"), [".ts", ".tsx"]);
type Call = { kind: string; agent: string; tool: string; file: string; line: number; ctx: string[] };
const calls: Call[] = [];
const callRe = /useMCP(Query|Mutation)\s*(?:<[\s\S]*?>)?\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
for (const f of feFiles) {
  let src = ""; try { src = read(f); } catch { continue; }
  const lines = src.split("\n");
  for (const m of src.matchAll(callRe)) {
    const line = countOf(src.slice(0, m.index ?? 0), /\n/g) + 1;
    if (clean(lines[line - 1] ?? "").trim().startsWith("//")) continue; // menciones en comentarios
    const ctx: string[] = [];
    for (let i = line - 1; i < Math.min(lines.length, line + 6); i++) ctx.push(clean(lines[i]).trimEnd());
    calls.push({ kind: m[1], agent: m[2], tool: m[3], file: rel(f), line, ctx });
  }
}
say(`  · ${calls.length} callsites (h1: 296 — incluye ~1 comentario que ahora se filtra)`);

const KNOWN: Record<string, string> = {
  guests: "backend/src/club_mcp/agents/guest_management_agent.py",
  guest_management: "backend/src/club_mcp/agents/guest_management_agent.py",
  engagement: "backend/src/club_mcp/agents/member_engagement_agent.py",
  member_engagement: "backend/src/club_mcp/agents/member_engagement_agent.py",
  family_profile: "backend/src/club_mcp/agents/family_profile.py",
  families: "backend/src/club_mcp/agents/family_profile.py",
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
const norm = (k: string): string[] => {
  const c = [k];
  if (k.endsWith("ies")) c.push(k.slice(0, -3) + "y");
  if (k.endsWith("es")) c.push(k.slice(0, -2));
  if (k.endsWith("s")) c.push(k.slice(0, -1));
  return c;
};
function resolveAgent(key: string): { file: string; how: string } | null {
  if (KNOWN[key] && filesWithTools.includes(KNOWN[key])) return { file: KNOWN[key], how: "conocido" };
  for (const c of norm(key)) {
    const hits = filesWithTools.filter((f) => path.basename(f).toLowerCase().includes(c.toLowerCase()));
    if (hits.length === 1) return { file: hits[0], how: `fuzzy(${c})` };
    if (hits.length > 1) return { file: hits[0], how: `fuzzy(${c}) AMBIGUO` };
  }
  return null;
}
const usedKeys = [...new Set(calls.map((c) => c.agent))].sort();
const agentMap = new Map<string, { file: string; how: string } | null>();
for (const k of usedKeys) agentMap.set(k, resolveAgent(k));
say("  · mapeo agent-key → agente backend:");
for (const k of usedKeys) {
  const r = agentMap.get(k);
  const n = r ? (regByFile.get(r.file)?.length ?? 0) : 0;
  say(`      ${k.padEnd(24)} → ${r ? `${path.basename(r.file)} (${n} tools, ${r.how})` : "⚠ SIN AGENTE (candidato cross-agent)"}`);
}

type Row = Call & { status: string; proposed?: string[]; elsewhere?: string };
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
    if (inAgent.length) rows.push({ ...c, status: "MIGRABLE", proposed });
    else if (elsewhere) rows.push({ ...c, status: "MIGRABLE-OTRO-AGENTE", proposed, elsewhere: `${elsewhere} @ ${path.basename(allTools.get(elsewhere)!)}` });
    else rows.push({ ...c, status: "DEUDA-BACKEND", proposed });
    continue;
  }
  if (allTools.has(c.tool)) {
    rows.push({ ...c, status: "MIGRABLE-OTRO-AGENTE", elsewhere: `${c.tool} @ ${path.basename(allTools.get(c.tool)!)}` });
    continue;
  }
  rows.push({ ...c, status: "DEUDA-BACKEND" });
}
const real = rows.filter((r) => r.status === "REAL");
const mig = rows.filter((r) => r.status === "MIGRABLE");
const otro = rows.filter((r) => r.status === "MIGRABLE-OTRO-AGENTE");
const debt = rows.filter((r) => r.status === "DEUDA-BACKEND");
say("");
say(`  ▸ REAL ${real.length} · MIGRABLE ${mig.length} · MIGRABLE-OTRO-AGENTE ${otro.length} · DEUDA-BACKEND ${debt.length}`);
say("    (h1 decía: REAL 174 · MIGRABLE 6 · DEUDA 116 — la diferencia es el parser)");
say("    REAL por agent-key: " + usedKeys.map((k) => `${k}=${real.filter((r) => r.agent === k).length}`).join(" · "));
say("");
say("  ── MIGRABLE (misma agent-key · tool equivalente en el agente) ──");
if (!mig.length) say("    · ninguna");
for (const r of mig) {
  say(`    ✎ ${r.agent}.${r.tool} → ${r.proposed?.join("|")} · ${r.file}:${r.line} (${r.kind})`);
  r.ctx.forEach((l) => say(`        ${l}`));
}
say("");
say("  ── MIGRABLE-OTRO-AGENTE (la tool vive en otro agente → cambiar agent-key) ──");
if (!otro.length) say("    · ninguna");
for (const r of otro) {
  say(`    ✎ ${r.agent}.${r.tool}${r.proposed ? ` → ${r.proposed.join("|")}` : ""} · ${r.elsewhere} · ${r.file}:${r.line} (${r.kind})`);
  r.ctx.forEach((l) => say(`        ${l}`));
}
say("");
say("  ── DEUDA-BACKEND (sin tool en ningún agente) ──");
if (!debt.length) say("    · ninguna 🎉");
for (const r of debt) {
  say(`    ✗ ${r.agent}.${r.tool}${r.proposed ? ` (ledger: [${r.proposed.join(", ")}])` : ""} · ${r.file}:${r.line} (${r.kind})`);
}
say("");

// ══════════════════════════════════════════════════════════════
// E · Misterio hitl
// ══════════════════════════════════════════════════════════════
say("══ E. Misterio hitl — aprobaciones en backend ══");
say("  ── tools de aprobación (/pending|approve|reject|approval/i) ──");
for (const [f, ts] of [...regByFile.entries()].filter(([, ts]) => ts.length > 0).sort()) {
  const hits = ts.filter((t) => /pending|approve|reject|approval/i.test(t.name));
  if (hits.length) say(`    ${path.basename(f)}: ${hits.map((t) => `${t.name}(${t.approval})`).join(" · ")}`);
}
say('  ── literal "hitl" como agente/ruta en backend/src ──');
let hitlHits = 0;
for (const f of walk(path.join(ROOT, "backend/src"), [".py"])) {
  const lines = read(f).split("\n");
  lines.forEach((t, i) => {
    if (/["']hitl["']/.test(t) && hitlHits < 20) { hitlHits++; say(`    ${rel(f)}:${i + 1}│ ${clean(t).trim()}`); }
  });
}
if (hitlHits === 0) say('    · ninguna — no existe agente "hitl"; la ruta real se define en el transporte (sección C)');
say("  ── capa HTTP en backend/src (FastAPI/APIRouter) ──");
let httpFound = false;
for (const f of walk(path.join(ROOT, "backend/src"), [".py"])) {
  const src = read(f);
  if (!/FastAPI\(|APIRouter\(/.test(src)) continue;
  httpFound = true;
  say(`    ✓ ${rel(f)}`);
  src.split("\n").forEach((t, i) => { if (/@(app|router|api)\.(get|post|put|delete|patch)\(/.test(t)) say(`      ${String(i + 1).padStart(4)}│ ${clean(t).trim()}`); });
}
if (!httpFound) say("    · sin FastAPI/APIRouter — el backend es FastMCP puro (transporte MCP, no REST)");
say("");

// ══════════════════════════════════════════════════════════════
// F · Ledger — reconciliación
// ══════════════════════════════════════════════════════════════
say("══ F. Ledger — reconciliación con registro corregido ══");
for (const [k, v] of ledger) {
  const live = calls.some((c) => `${c.agent}.${c.tool}` === k);
  const proposed = (v.match(/"([^"]+)"/g) ?? []).map((s) => s.slice(1, -1));
  const present = proposed.filter((p) => allTools.has(p));
  say(`    ${live ? "vivo " : "MUERTO"} · ${k} → [${v}]${present.length ? ` · en backend: ${present.map((p) => `${p} @ ${path.basename(allTools.get(p)!)}`).join(", ")}` : ""}`);
}
say("");

say("══ fin h2 — con esto se arma el plan de batches C3h ══");
fs.writeFileSync(path.join(ROOT, "p2c3h_registry_report.txt"), REPORT.join("\n") + "\n", "utf8");
console.log("");
console.log("✓ reporte: p2c3h_registry_report.txt");
