/**
 * P2-C3h · h1-backlog — mapa consolidado de deuda tras el cierre de C3g (00417eb)
 * Ejecutar desde la RAIZ del repo:  npx tsx scripts/p2c3h_backlog.ts
 * SOLO LECTURA (+ probe de python para futuros gates backend).
 *
 * Produce p2c3h_backlog_report.txt con:
 *   A · Manifest C3g (recupera el numerado # de las filas, p.ej. #3 #4 #8 #14 #15 #17)
 *   B · Ledger VI14_EQUIVALENCES (entradas vivas agent.tool → [tools])
 *   C · Registro backend: @MCPTool(name, approval) por archivo de agente
 *   D · Hook useMCPQuery + mapeo agent-key → archivo backend (heurístico, imprimible)
 *   E · Callsites frontend (sólo literales) clasificados:
 *         REAL · MIGRABLE (tool existe en el agente) · MIGRABLE-OTRO-AGENTE
 *         · DEUDA-BACKEND (crear tool o degradar frontend)
 *   F · Entradas del ledger SIN callsite vivo (candidatas a limpieza)
 *   G · Probe de python (ast.parse para gates de parches .py)
 *   H · Deuda de campos/envelopes heredada de C3g (estática)
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

say("P2-C3h · h1-backlog — mapa consolidado de deuda tras C3g");
try {
  const head = execSync("git log --oneline -1", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  say(`  base: ${head}`);
} catch { /* noop */ }
say("");

// ══════════════════════════════════════════════════════════════
// A · Manifest C3g — numerado de filas
// ══════════════════════════════════════════════════════════════
say("══ A. Manifest C3g (p2c3g_manifest.json) ══");
try {
  const m = JSON.parse(read(path.join(ROOT, "p2c3g_manifest.json")));
  const findArr = (o: any, depth = 0): any[] | null => {
    if (depth > 4) return null;
    if (Array.isArray(o) && o.length && typeof o[0] === "object") return o;
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        const r = findArr(o[k], depth + 1);
        if (r) return r;
      }
    }
    return null;
  };
  const rows = findArr(m);
  if (!rows) {
    say(`  · claves top-level: ${Object.keys(m).join(", ")} (sin array de filas reconocible)`);
  } else {
    say(`  · ${rows.length} filas (una por línea, truncadas a 400 chars):`);
    for (const r of rows) {
      let s = JSON.stringify(r);
      if (s.length > 400) s = s.slice(0, 400) + " …";
      say(`    ${s}`);
    }
  }
} catch (e: any) {
  say(`  ⚠ no pude leer el manifest: ${e.message}`);
}
say("");

// ══════════════════════════════════════════════════════════════
// B · Ledger VI14_EQUIVALENCES
// ══════════════════════════════════════════════════════════════
say("══ B. Ledger VI14_EQUIVALENCES (scripts/p2c3e_vi14_patch.ts) ══");
const ledger = new Map<string, string>();
try {
  const src = read(path.join(ROOT, "scripts/p2c3e_vi14_patch.ts"));
  const anchor = src.indexOf("VI14_EQUIVALENCES");
  if (anchor < 0) {
    say("  ⚠ no encuentro VI14_EQUIVALENCES");
  } else {
    const win = src.slice(anchor, anchor + 20000);
    for (const m of win.matchAll(/"(\w+\.\w+)"\s*:\s*\[([^\]]*)\]/g)) ledger.set(m[1], m[2].trim());
    say(`  · ${ledger.size} entradas:`);
    for (const [k, v] of ledger) say(`    ${k} → [${v}]`);
  }
} catch (e: any) {
  say(`  ⚠ no pude leer el ledger: ${e.message}`);
}
say("");

// ══════════════════════════════════════════════════════════════
// C · Registro backend — tools por archivo de agente
// ══════════════════════════════════════════════════════════════
say("══ C. Registro backend — @MCPTool por agente ══");
type BTool = { name: string; approval: string };
const toolsByFile = new Map<string, BTool[]>();
const agentNameByFile = new Map<string, string>();
const agentFiles = walk(path.join(BE, "agents"), [".py"]);
for (const f of agentFiles) {
  const lines = read(f).split("\n");
  const anLine = lines.find((t) => /agent_name\s*(?::[^=]+)?=\s*"/.test(t));
  if (anLine) {
    const mm = anLine.match(/"([^"]+)"/);
    if (mm) agentNameByFile.set(rel(f), mm[1]);
  }
  const tools: BTool[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/@MCPTool\(/.test(lines[i])) {
      let name = "";
      let approval = "?";
      for (let j = i; j < Math.min(lines.length, i + 14); j++) {
        const mn = lines[j].match(/\bname\s*=\s*"([^"]+)"/);
        if (mn && !name) name = mn[1];
        const ma = lines[j].match(/\bapproval\s*=\s*ApprovalLevel\.(\w+)/);
        if (ma) approval = ma[1];
        if (name && approval !== "?") break;
      }
      if (name) tools.push({ name, approval });
    }
  }
  if (tools.length) toolsByFile.set(rel(f), tools);
}
const totalTools = [...toolsByFile.values()].reduce((a, t) => a + t.length, 0);
say(`  · ${agentFiles.length} archivos de agente · ${totalTools} tools (sanity: C3g cerró con 169)`);
for (const [f, ts] of [...toolsByFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  say(`    ${path.basename(f)} · agent_name=${agentNameByFile.get(f) ?? "?"} · ${ts.length} tools`);
}
const allTools = new Map<string, string>();
for (const [f, ts] of toolsByFile) for (const t of ts) allTools.set(t.name, f);
say("");

// ══════════════════════════════════════════════════════════════
// D · Hook useMCPQuery + mapeo agent-key → archivo backend
// ══════════════════════════════════════════════════════════════
say("══ D. Hook useMCPQuery (fuente) ══");
const feFiles = walk(path.join(FE, "src"), [".ts", ".tsx"]);
const hookFile = feFiles.find((f) => { try { return /export (async )?function useMCPQuery/.test(read(f)); } catch { return false; } });
if (hookFile) {
  const hl = read(hookFile).split("\n");
  say(`  ── ${rel(hookFile)} (${hl.length} líneas) ──`);
  hl.slice(0, 90).forEach((t, i) => say(`    ${String(i + 1).padStart(4)}│ ${clean(t)}`));
  if (hl.length > 90) say(`    ⋮ (${hl.length - 90} líneas más — ver archivo)`);
} else {
  say("  ⚠ no encontré la definición de useMCPQuery");
}
say("");

// ══════════════════════════════════════════════════════════════
// E · Callsites frontend + clasificación
// ══════════════════════════════════════════════════════════════
say("══ E. Callsites frontend — useMCPQuery/useMCPMutation (sólo literales) ══");
type Call = { kind: string; agent: string; tool: string; file: string; line: number; ctx: string[] };
const calls: Call[] = [];
const callRe = /useMCP(Query|Mutation)\s*(?:<[\s\S]*?>)?\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
for (const f of feFiles) {
  let src = "";
  try { src = read(f); } catch { continue; }
  for (const m of src.matchAll(callRe)) {
    const line = src.slice(0, m.index ?? 0).split("\n").length;
    const lines = src.split("\n");
    const ctx: string[] = [];
    for (let i = line - 1; i < Math.min(lines.length, line + 7); i++) ctx.push(clean(lines[i]).trimEnd());
    calls.push({ kind: m[1], agent: m[2], tool: m[3], file: rel(f), line, ctx });
  }
}
say(`  · ${calls.length} callsites en ${feFiles.length} archivos TS/TSX`);

const KNOWN: Record<string, string> = {
  guests: "backend/src/club_mcp/agents/guest_management_agent.py",
  engagement: "backend/src/club_mcp/agents/member_engagement_agent.py",
  family_profile: "backend/src/club_mcp/agents/family_profile.py",
  communications: "backend/src/club_mcp/agents/communication_agent.py",
  facilities: "backend/src/club_mcp/agents/facility_management_agent.py",
  wellness: "backend/src/club_mcp/agents/wellness.py",
};
const norm = (k: string): string[] => {
  const c = [k];
  if (k.endsWith("ies")) c.push(k.slice(0, -3) + "y");
  if (k.endsWith("es")) c.push(k.slice(0, -2));
  if (k.endsWith("s")) c.push(k.slice(0, -1));
  return c;
};
const relAgentFiles = [...toolsByFile.keys()];
function resolveAgent(key: string): { file: string; how: string } | null {
  if (KNOWN[key] && relAgentFiles.includes(KNOWN[key])) return { file: KNOWN[key], how: "conocido" };
  for (const c of norm(key)) {
    const hits = relAgentFiles.filter((f) => path.basename(f).toLowerCase().includes(c.toLowerCase()));
    if (hits.length === 1) return { file: hits[0], how: `fuzzy(${c})` };
    if (hits.length > 1) return { file: hits[0], how: `fuzzy(${c}) AMBIGUO: ${hits.map((h) => path.basename(h)).join(",")}` };
  }
  return null;
}
const usedKeys = [...new Set(calls.map((c) => c.agent))].sort();
const agentMap = new Map<string, { file: string; how: string } | null>();
for (const k of usedKeys) agentMap.set(k, resolveAgent(k));
say("  · mapeo agent-key → archivo backend:");
for (const k of usedKeys) {
  const r = agentMap.get(k);
  const n = r ? (toolsByFile.get(r.file)?.length ?? 0) : 0;
  say(`      ${k.padEnd(16)} → ${r ? `${path.basename(r.file)} (${n} tools, ${r.how})` : "⚠ SIN ARCHIVO"}`);
}

type Row = Call & { status: string; proposed?: string[]; elsewhere?: string };
const rows: Row[] = [];
for (const c of calls) {
  const r = agentMap.get(c.agent);
  const tools = r ? (toolsByFile.get(r.file)?.map((t) => t.name) ?? []) : [];
  const ledRaw = ledger.get(`${c.agent}.${c.tool}`);
  if (tools.includes(c.tool)) {
    rows.push({ ...c, status: "REAL" });
  } else if (ledRaw !== undefined) {
    const proposed = (ledRaw.match(/"([^"]+)"/g) ?? []).map((s) => s.slice(1, -1));
    const inAgent = proposed.filter((p) => tools.includes(p));
    const elsewhere = proposed.find((p) => !tools.includes(p) && allTools.has(p));
    if (inAgent.length) rows.push({ ...c, status: "MIGRABLE", proposed });
    else if (elsewhere) rows.push({ ...c, status: "MIGRABLE-OTRO-AGENTE", proposed, elsewhere: `${elsewhere} @ ${path.basename(allTools.get(elsewhere) ?? "")}` });
    else rows.push({ ...c, status: "DEUDA-BACKEND", proposed });
  } else {
    rows.push({ ...c, status: "DEUDA-BACKEND-SIN-LEDGER" });
  }
}
const real = rows.filter((r) => r.status === "REAL");
const mig = rows.filter((r) => r.status === "MIGRABLE" || r.status === "MIGRABLE-OTRO-AGENTE");
const debt = rows.filter((r) => r.status.startsWith("DEUDA-BACKEND"));
say("");
say(`  ▸ REAL: ${real.length} · MIGRABLE: ${mig.length} · DEUDA-BACKEND: ${debt.length}`);
say("    (sanity REAL por agent-key: " + usedKeys.map((k) => `${k}=${real.filter((r) => r.agent === k).length}`).join(" · ") + ")");
say("");

say("  ── MIGRABLES (tool existe — adaptador de params/respuesta, estilo C3g) ──");
if (mig.length === 0) say("    · ninguna");
for (const r of mig) {
  say(`    ✎ ${r.agent}.${r.tool} → ${r.proposed?.join("|")}${r.elsewhere ? ` (en OTRO agente: ${r.elsewhere})` : ""} · ${r.file}:${r.line} (${r.kind})`);
  r.ctx.forEach((l) => say(`        ${l}`));
}
say("");
say("  ── DEUDA-BACKEND (crear tool backend o degradar frontend) ──");
if (debt.length === 0) say("    · ninguna");
for (const r of debt) {
  say(`    ✗ ${r.agent}.${r.tool}${r.proposed ? ` → ledger: [${r.proposed.join(", ")}] sin tool backend` : " (sin entrada ledger)"} · ${r.file}:${r.line} (${r.kind})`);
  r.ctx.forEach((l) => say(`        ${l}`));
}
say("");
say("  ── tools de los agentes involucrados en deuda/migrables ──");
const involved = [...new Set([...mig, ...debt].map((r) => r.agent))];
for (const k of involved) {
  const rm = agentMap.get(k);
  if (!rm) { say(`    ${k}: ⚠ sin archivo backend mapeado`); continue; }
  const ts = toolsByFile.get(rm.file) ?? [];
  say(`    ${k} → ${path.basename(rm.file)} (${ts.length} tools):`);
  say(`      ${ts.map((t) => `${t.name}(${t.approval})`).join(" · ")}`);
}
say("");

// ══════════════════════════════════════════════════════════════
// F · Entradas del ledger sin callsite vivo
// ══════════════════════════════════════════════════════════════
say("══ F. Entradas del ledger SIN callsite vivo (candidatas a limpieza) ══");
let dead = 0;
for (const [k, v] of ledger) {
  const live = rows.find((r) => `${r.agent}.${r.tool}` === k);
  if (!live) { say(`    · ${k} → [${v}]`); dead++; }
}
if (dead === 0) say("    · todas las entradas tienen callsite vivo");
say("");

// ══════════════════════════════════════════════════════════════
// G · Probe de python (gates para parches backend)
// ══════════════════════════════════════════════════════════════
say("══ G. Probe de python ══");
let pyOk = false;
for (const cmd of ["python --version", "py --version", "python3 --version"]) {
  try {
    const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15_000 }).toString().trim();
    say(`  ✓ ${cmd} → ${out}`);
    pyOk = true;
    break;
  } catch { /* siguiente */ }
}
if (!pyOk) say("  ⚠ sin python en PATH — los parches backend usarán anclas estrictas sin gate py");
try {
  execSync('python -c "import ast; ast.parse(\'x=1\')"', { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15_000 });
  say("  ✓ ast.parse disponible — gate sintáctico listo para parches .py");
} catch {
  say("  ⚠ ast.parse no ejecutable — gate py pendiente de resolver");
}
say("");

// ══════════════════════════════════════════════════════════════
// H · Deuda de campos/envelopes (estática, heredada de C3g)
// ══════════════════════════════════════════════════════════════
say("══ H. Deuda de campos/envelopes heredada de C3g ══");
say("  · Reservation (facilities/types) ↔ FacilityReservation: 9 renames camel→snake (facilityId, facilityName, familyId, familyName, startTime, endTime, guestCount, createdBy, createdAt)");
say("  · Family compartido (families/types, 14 camel) ↔ FamilyBrief backend (7 snake): unificar o adaptar en C3h");
say("  · manage_trial_memberships(list): sin total/conversion_rate/active_count/paginación server-side");
say("  · TrialMembership ítem: FE sin par backend (guest_id, host_family_id, host_family_name, trial_type_label, facilities_access, activities_attended, feedback_score, conversion_probability) · backend sin par FE (referred_by_family_id, privileges, updated_at)");
say("  · D5 FacilityMap: facility_type descartado por falta de evidencia de enum — filtro tipo/estado sólo client-side");
say("  · ReactivationCampaign FE(18) ↔ backend(16): mismatch de campos (target_level/channel/… vs campaign_type/target_member_ids/…)");
say("");

say("══ fin h1 — con este reporte se arma el plan de batches C3h ══");
const reportPath = path.join(ROOT, "p2c3h_backlog_report.txt");
write: {
  fs.writeFileSync(reportPath, REPORT.join("\n") + "\n", "utf8");
}
console.log("");
console.log(`✓ reporte: ${rel(reportPath)}`);
