/**
 * P2-C3h · h5-wiring — cierre forense del cableado antes del plan definitivo
 * Ejecutar desde la RAIZ: npx tsx scripts/p2c3h_wiring.ts · SOLO LECTURA
 * Reporte: p2c3h_wiring_report.txt
 *
 * Cierra: W1 claves de app.state.agents · W2 split-brain engine + doble
 * CommunicationAgent · W3 ¿approve() ejecuta? · W5 mapa RBAC · W6 ¿el planner
 * LLM emite tool calls? · W8 montaje FastMCP↔FastAPI e instanciación única.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
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
      if (["__pycache__", "venv", ".venv", ".git"].includes(e.name)) continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const PY = walk(path.join(BE, "src"), [".py"]);

function dumpFull(p: string, cap = 400): void {
  if (!fs.existsSync(p)) { say(`  ⚠ ${rel(p)} no existe`); return; }
  const lines = read(p).split("\n");
  say(`  ── ${rel(p)} (${lines.length} líneas) ──`);
  const n = Math.min(lines.length, cap);
  for (let i = 0; i < n; i++) say(`  ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
  if (lines.length > cap) say(`  ⋮ (${lines.length - cap} truncadas)`);
}

function dumpMethods(p: string, names: string[], cap = 110): void {
  if (!fs.existsSync(p)) { say(`  ⚠ ${rel(p)} no existe`); return; }
  const lines = read(p).split("\n");
  const remaining = new Set(names);
  for (let i = 0; i < lines.length && remaining.size > 0; i++) {
    const m = lines[i].match(/^(\s*)(async\s+)?def\s+(\w+)\s*\(/);
    if (!m || !remaining.has(m[3])) continue;
    const indent = m[1].length;
    remaining.delete(m[3]);
    say(`  ── ${rel(p)} · def ${m[3]} (línea ${i + 1}) ──`);
    let j = i, printed = 0;
    while (j < lines.length && printed <= cap) {
      const t = lines[j];
      const nm = t.match(/^(\s*)(async\s+)?def\s+/);
      if (j > i && nm && nm[1].length <= indent) break;
      if (j > i && /^\S/.test(t)) break;
      say(`  ${String(j + 1).padStart(4)}│ ${clean(t)}`);
      printed++; j++;
    }
    if (printed > cap) say(`  ⋮ (cap ${cap} líneas)`);
    say("");
  }
  if (remaining.size > 0) say(`  ⚠ no encontrados en ${rel(p)}: ${[...remaining].join(", ")}`);
}

function grepAll(pattern: RegExp, label: string, cap = 60): void {
  say(`  ── grep · ${label} ──`);
  let n = 0;
  for (const f of PY) {
    read(f).split("\n").forEach((t, i) => {
      if (pattern.test(t) && n < cap) { n++; say(`    ${rel(f)}:${i + 1}│ ${clean(t).trim()}`); }
    });
  }
  if (n === 0) say("    · sin hits");
  else if (n >= cap) say(`    ⋮ (cap ${cap})`);
  say("");
}

say("P2-C3h · h5-wiring — cierre forense del cableado");
try { say(`  base: ${execSync("git log --oneline -1", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim()}`); } catch { /* noop */ }
say("");

say("══ A. api/app.py — COMPLETO (W1/W8: app.state.agents, montaje, instanciación) ══");
dumpFull(path.join(BE, "src/club_mcp/api/app.py"));
say("");

say("══ B. server.py — COMPLETO (W2b: doble CommunicationAgent · montaje FastMCP) ══");
dumpFull(path.join(BE, "src/club_mcp/server.py"));
say("");

say("══ C. auth/rbac.py — COMPLETO (W5: TOOL_PERMISSION_MAP + check_permission) ══");
{
  const p = path.join(BE, "src/club_mcp/auth/rbac.py");
  dumpFull(p, 340);
  if (fs.existsSync(p)) {
    const entries = (read(p).match(/^\s*["'][\w.]+["']\s*:/gm) ?? []).length;
    say(`  · entradas "tool": permiso ≈ ${entries} (vs 196 tools del registro v2)`);
  }
}
say("");

say("══ D. hitl/approval_engine.py — índice + create/approve/reject/init (W3) ══");
{
  const p = path.join(BE, "src/club_mcp/hitl/approval_engine.py");
  if (fs.existsSync(p)) {
    say(`  ── ${rel(p)} · índice de métodos ──`);
    read(p).split("\n").forEach((t, i) => {
      if (/^(\s*)(async\s+)?def\s+\w+/.test(t)) say(`    ${String(i + 1).padStart(4)}│ ${clean(t).trimEnd()}`);
    });
    say("");
    dumpMethods(p, ["__init__", "create_request", "approve", "reject", "get_pending", "resolve", "execute"], 130);
  } else { say("  ⚠ no existe"); }
}
grepAll(/\b(execut|dispatch|handler|callback|on_approv|post_approval)\w*/i, "D2 · ejecutores post-aprobación en backend/src", 40);
say("");

say("══ E. hitl/approval_types.py — semántica ApprovalLevel (envelopes B4) ══");
dumpFull(path.join(BE, "src/club_mcp/hitl/approval_types.py"), 160);
say("");

say("══ F. routes/chat.py — COMPLETO (W6: ¿planner emite tool calls?) ══");
dumpFull(path.join(BE, "src/club_mcp/api/routes/chat.py"));
say("");

say("══ F2. ai/prompts.py · contrato de acciones del planner (540-640) ══");
{
  const p = path.join(BE, "src/club_mcp/ai/prompts.py");
  if (fs.existsSync(p)) {
    const lines = read(p).split("\n");
    const from = 539, to = Math.min(640, lines.length);
    say(`  ── ${rel(p)} (líneas ${from + 1}-${to}) ──`);
    for (let i = from; i < to; i++) say(`  ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
  }
}
say("");

say("══ G. __init__ de agentes — orden super() vs approval_engine (W2) ══");
for (const f of [
  "family_profile.py", "finance.py", "executive_dashboard_agent.py",
  "guest_management_agent.py", "communication_agent.py", "satisfaction_agent.py",
]) {
  dumpMethods(path.join(BE, `src/club_mcp/agents/${f}`), ["__init__"], 45);
}
say("");

say("══ H. Greps de cableado cruzado ══");
grepAll(/app\.state\.\w+\s*=/, "H1 · asignaciones a app.state");
grepAll(/ApprovalEngine\(/, "H2 · instanciaciones de ApprovalEngine");
grepAll(/create_mcp_server|from club_mcp\.server import/, "H3 · uso de create_mcp_server");
grepAll(/\.mount\(|sse_app|streamable/i, "H4 · montaje FastMCP sobre FastAPI", 30);
grepAll(/agent_name\s*[:=]\s*["']/, "H5 · agent_name declarados (claves canónicas)");
grepAll(/["'](families|guests|facilities|engagement|hitl|reports)["']/, "H6 · literales de claves legacy en backend/src", 50);
grepAll(/super\(\)\.__init__\(\)/, "H7 · super().__init__() en agentes");
grepAll(/self\.approval_engine\s*=/, "H8 · asignaciones self.approval_engine");
grepAll(/\bexecute_\w+/, "H9 · métodos/referencias execute_*", 60);
say("");

say("══ I. Qué habilita cada bloque ══");
say("  A/B → W1/W2/W8: claves de app.state.agents, montaje FastMCP↔FastAPI, doble CommunicationAgent, instanciación única");
say("  C   → W5: mapa RBAC completo y cobertura vs 196 tools");
say("  D   → W3: ¿approve() despacha ejecutores? — el hallazgo más crítico pendiente (define B0.5)");
say("  E   → semántica exacta de ApprovalLevel para envelopes B4");
say("  F/F2→ W6: ¿el planner LLM emite tool calls y con qué claves? (tercera consumidora del compat)");
say("  G/H → orden super().__init__() vs engine, callers de execute_, claves legacy existentes");
say("══ fin h5-wiring ══");
fs.writeFileSync(path.join(ROOT, "p2c3h_wiring_report.txt"), REPORT.join("\n") + "\n", "utf8");
console.log("");
console.log("✓ reporte: p2c3h_wiring_report.txt");
