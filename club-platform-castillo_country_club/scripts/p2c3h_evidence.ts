/**
 * P2-C3h · h4-evidence — dispatch/alias + firmas de tools target + mocks
 * Ejecutar desde la RAIZ: npx tsx scripts/p2c3h_evidence.ts · SOLO LECTURA
 * Reporte: p2c3h_evidence_report.txt
 *
 * Con h3 cerrado (REAL 237 · MIGRABLE 4 · OTRO-AGENTE 15 · DEUDA 35 tools únicos),
 * este paso reúne la evidencia que falta antes de escribir parches:
 *   A · Dispatch: ¿cómo resuelve /api/agents/{agent_name}/{tool_name} las keys
 *       del frontend (families/guests/events/engagement/facilities) contra agentes
 *       llamados family_profile/guest_management/event_orchestrator/...?
 *       ¿Existen aliases para "hitl" y "reports" (sin agente propio)?
 *   B · base.py completo: decorador MCPTool + wrapper HITL (¿create_request
 *       automático según ApprovalLevel, o solo cuando el cuerpo lo llama?)
 *   C · Firmas + cuerpos de los 31 tools target (params, envelope de respuesta,
 *       ramas create_request) — insumo directo de los adaptadores B1/B2/B3.
 *   D · Mocks: inventario del registro mock (los mocks usan nombres frontend;
 *       renombrar un callsite rompe dev-mock si no hay entrada bajo el nombre
 *       nuevo) + mcp-router.ts (routing preferBackend/fallbackToMock).
 *   E · Plan de batches draft (filas con target y preguntas abiertas).
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

say("P2-C3h · h4-evidence — dispatch + firmas + mocks");
try { say(`  base: ${execSync("git log --oneline -1", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim()}`); } catch { /* noop */ }
say("");

// ══════════════════════════════════════════════════════════════
// A · Dispatch — ¿cómo resuelve la URL las agent-keys?
// ══════════════════════════════════════════════════════════════
say("══ A1. api/routes/agents.py — COMPLETO (dispatch {agent_name}/{tool_name}) ══");
{
  const p = path.join(BE, "src/club_mcp/api/routes/agents.py");
  const lines = read(p).split("\n");
  say(`  ── ${rel(p)} (${lines.length} líneas) ──`);
  lines.forEach((t, i) => say(`  ${String(i + 1).padStart(4)}│ ${clean(t)}`));
}
say("");
say("══ A2. agents/__init__.py — registro/aliases de agentes ══");
{
  const p = path.join(BE, "src/club_mcp/agents/__init__.py");
  if (fs.existsSync(p)) {
    const lines = read(p).split("\n");
    say(`  ── ${rel(p)} (${lines.length} líneas) ──`);
    const cap = Math.min(lines.length, 180);
    for (let i = 0; i < cap; i++) say(`  ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
    if (lines.length > cap) say(`  ⋮ (${lines.length - cap} líneas truncadas)`);
  } else { say("  ⚠ no existe"); }
}
say("");
say("══ A3. server.py — wiring FastMCP/app/agent registry (líneas relevantes) ══");
{
  const p = path.join(BE, "src/club_mcp/server.py");
  const lines = read(p).split("\n");
  say(`  ── ${rel(p)} (${lines.length} líneas) ──`);
  let n = 0;
  lines.forEach((t, i) => {
    if (/agent|Agent|FastMCP|mount|register|alias|include|app\s*=|server|Tool/i.test(t) && n < 120) {
      n++;
      say(`  ${String(i + 1).padStart(4)}│ ${clean(t)}`);
    }
  });
  if (n === 0) say("  ⚠ sin líneas relevantes — ¿el wiring vive en otro archivo?");
}
say("");
say("══ A4. Literales 'hitl'/'reports' como nombre de agente en backend/src ══");
{
  let n = 0;
  for (const f of walk(path.join(BE, "src"), [".py"])) {
    read(f).split("\n").forEach((t, i) => {
      if (/["'](hitl|reports)["']/.test(t) && n < 15) { n++; say(`    ${rel(f)}:${i + 1}│ ${clean(t).trim()}`); }
    });
  }
  if (n === 0) say("    · ninguno — no hay alias 'hitl'/'reports' visible (se confirma con A1-A3)");
}
say("");

// ══════════════════════════════════════════════════════════════
// B · base.py — decorador + wrapper HITL
// ══════════════════════════════════════════════════════════════
say("══ B. base.py — decorador MCPTool + HITL wrapper ══");
{
  const p = path.join(BE, "src/club_mcp/agents/base.py");
  const lines = read(p).split("\n");
  say(`  ── ${rel(p)} (${lines.length} líneas) ──`);
  const cap = Math.min(lines.length, 280);
  for (let i = 0; i < cap; i++) say(`  ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
  if (lines.length > cap) say(`  ⋮ (${lines.length - cap} líneas truncadas)`);
}
say("");

// ══════════════════════════════════════════════════════════════
// C · Firmas + cuerpos de los 31 tools target
// ══════════════════════════════════════════════════════════════
const TARGETS: Array<[string, string]> = [
  // B1 · MIGRABLE misma agent-key
  ["finance_account_status", "finance.py"],
  ["finance_invoice_create", "finance.py"],
  ["family_get_profile", "family_profile.py"],
  ["get_facility_reservations", "facility_management_agent.py"],
  // B2 · OTRO-AGENTE targets
  ["get_pending_approvals", "executive_dashboard_agent.py"],
  ["approve_request", "executive_dashboard_agent.py"],
  ["reject_request", "executive_dashboard_agent.py"],
  ["generate_quarterly_board_report", "executive_dashboard_agent.py"],
  ["analyze_event_satisfaction", "satisfaction_agent.py"],
  ["get_survey_for_event", "satisfaction_agent.py"],
  ["get_member_risk_assessment", "member_360_agent.py"],
  ["generate_ai_analysis", "finance.py"],
  ["generate_insight_narrative", "advisor_intelligence.py"],
  ["simulate_scenario", "advisor_intelligence.py"],
  // B3a · near-name / dispatcher candidates
  ["design_reactivation_campaign", "member_engagement_agent.py"],
  ["submit_satisfaction_survey", "satisfaction_agent.py"],
  ["get_age_group_health_score", "age_group.py"],
  ["get_generational_analytics", "age_group.py"],
  ["age_group_recommend_activities", "age_group.py"],
  ["generate_communication_insights", "communication_agent.py"],
  ["get_campaign_performance", "communication_agent.py"],
  ["send_personalized_notification", "communication_agent.py"],
  ["register_guest", "guest_management_agent.py"],
  ["get_guest_analytics_enhanced", "guest_management_agent.py"],
  ["manage_facilities", "facility_management_agent.py"],
  ["event_get_calendar", "event_orchestrator.py"],
  ["predict_event_attendance", "proactive_recommendation_agent.py"],
  ["detect_scheduling_conflicts", "proactive_recommendation_agent.py"],
  ["get_seasonal_analysis", "finance.py"],
  ["get_member_ltv_analysis", "member_360_agent.py"],
  ["simulate_hypothetical", "ml_intelligence.py"],
];
say(`══ C. Firmas y cuerpos de ${TARGETS.length} tools target ══`);
for (const [name, fname] of TARGETS) {
  const fileRel = `backend/src/club_mcp/agents/${fname}`;
  const abs = path.join(ROOT, fileRel);
  say(`  ── ${name} · ${fileRel} ──`);
  if (!fs.existsSync(abs)) { say("    ⚠ archivo no encontrado"); say(""); continue; }
  const raw = read(abs);
  const rawLines = raw.split("\n");
  const decs = extractDecorators(pyClean(raw)).filter((d) => d.dec === "MCPTool");
  let start = 0;
  let end = 0;
  for (let i = 0; i < decs.length; i++) {
    const d = decs[i];
    const kw = d.text.match(/\bname\s*=\s*["']([\w.]+)["']/);
    const pos = d.text.match(/@\w+\s*\(\s*["']([\w.]+)["']/);
    if ((kw?.[1] ?? pos?.[1]) === name) {
      start = d.line;
      end = decs[i + 1] ? decs[i + 1].line - 1 : rawLines.length;
      break;
    }
  }
  if (!start) { say("    ⚠ decorador no encontrado (¿nombre incorrecto?)"); say(""); continue; }
  const cap = 70;
  const stop = Math.min(end, start - 1 + cap);
  for (let i = start - 1; i < stop; i++) say(`    ${String(i + 1).padStart(4)}│ ${clean(rawLines[i])}`);
  if (end - start + 1 > cap) say(`    ⋮ (${end - start + 1 - cap} líneas truncadas del método)`);
  say("");
}

// ══════════════════════════════════════════════════════════════
// D · Mocks + mcp-router
// ══════════════════════════════════════════════════════════════
say("══ D. Mocks — registro + router ══");
const MCPDIR = path.join(FE, "src/shared/lib/mcp");
say("  ── shared/lib/mcp (contenido) ──");
try { fs.readdirSync(MCPDIR).forEach((n) => say(`    ${n}`)); } catch { say("    ⚠ sin directorio mcp"); }
say("");
const AGENT_KEYS = [
  "families", "family_profile", "guests", "guest_management", "events", "engagement",
  "member_engagement", "facilities", "facility_management", "finance", "wellness",
  "age_group", "compliance", "advisor_intelligence", "executive_dashboard",
  "communication", "satisfaction", "hitl", "reports", "member_360", "ml_intelligence",
  "proactive_recommendation", "sports_recreation", "document_intelligence", "cultural_social",
];
const mockFiles = walk(MCPDIR, [".ts"]).filter((f) => /mock/i.test(path.basename(f)));
if (mockFiles.length === 0) say("  ⚠ ningún archivo con 'mock' en el nombre dentro de shared/lib/mcp (ver listado arriba)");
for (const f of mockFiles) {
  const lines = read(f).split("\n");
  say(`  ── ${rel(f)} (${lines.length} líneas) · head 110 + líneas con agent-key ──`);
  const head = Math.min(lines.length, 110);
  for (let i = 0; i < head; i++) say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
  if (lines.length > head) {
    let n = 0;
    for (let i = head; i < lines.length; i++) {
      const hit = AGENT_KEYS.some((k) => new RegExp(`["']${k}["']`).test(lines[i]));
      if (hit && n < 130) { n++; say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`); }
    }
    if (n === 0) say("    ⋮ (sin más líneas con agent-keys literales)");
    else if (n >= 130) say("    ⋮ (truncado en 130 líneas con agent-key)");
  }
  say("");
}
const routerPath = path.join(MCPDIR, "mcp-router.ts");
if (fs.existsSync(routerPath)) {
  const lines = read(routerPath).split("\n");
  say(`  ── ${rel(routerPath)} (${lines.length} líneas) · head 140 + relevantes ──`);
  const head = Math.min(lines.length, 140);
  for (let i = 0; i < head; i++) say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
  if (lines.length > head) {
    let n = 0;
    for (let i = head; i < lines.length; i++) {
      if (/route|backend|mock|registry|prefer|fallback|fetch|agents|resolveTool|error/i.test(lines[i]) && n < 90) {
        n++;
        say(`    ${String(i + 1).padStart(4)}│ ${clean(lines[i])}`);
      }
    }
    if (n >= 90) say("    ⋮ (truncado en 90)");
  }
} else {
  say("  ⚠ mcp-router.ts no encontrado en shared/lib/mcp");
}
say("");

// ══════════════════════════════════════════════════════════════
// E · Plan de batches draft
// ══════════════════════════════════════════════════════════════
say("══ E. Plan de batches C3h — draft (pendiente de evidencia A-D) ══");
const B1: Array<[string, string, string]> = [
  ["#7  finance.get_family_account → finance_account_status", "params {family_id} ya snake ✓", "shape LOSSY → C; ¿incluye transactions/invoices? (cubre #get_transactions)"],
  ["#8  finance.get_invoices → finance_invoice_create", "Query llama tool de ESCRITURA (HITL)", "NO migrar directo → B3 (crear finance_invoice_list) o degradar tab"],
  ["#12 families.get_family → family_get_profile", "params {familyId} → {family_id}", "adapter ya traduce nombre → migrar callsite + limpiar adapter + mock (D)"],
  ["#13 facilities.get_reservations → get_facility_reservations", "params {family_id} vs firma conocida (facility_id,date_from,date_to)", "C: ¿acepta family_id? si no → adaptador o degradar"],
];
say("  ── B1 · misma agent-key (4 filas · frontend · estilo C3g) ──");
for (const [row, params, open] of B1) say(`    ${row}\n        params: ${params}\n        abierto: ${open}`);
say("");
const B2: Array<[string, string, string]> = [
  ["hitl.get_pending_approvals ×5 → executive_dashboard.get_pending_approvals (AUTO)", "params {}", "shape requests[] → C; dispatch 'hitl' hoy → A"],
  ["hitl.approve_request ×2 → executive_dashboard.approve_request (AUTO)", "{request_id, approved_by, note}", "firma → C"],
  ["hitl.reject_request ×1 → executive_dashboard.reject_request (AUTO)", "{request_id, rejected_by, reason}", "firma → C"],
  ["#3 engagement.get_survey_results → satisfaction.analyze_event_satisfaction (SEMI_AUTO)", "{survey_id}", "⚠ ¿event_id? → C"],
  ["#4 engagement.get_active_survey → satisfaction.get_survey_for_event (AUTO)", "{survey_id}", "⚠ ¿event_id? → C"],
  ["#14 reports.get_board_report → executive_dashboard.generate_quarterly_board_report (HITL)", "{period}", "⚠ ¿create_request en cuerpo? → C; si gating → degradar"],
  ["#15 reports.get_risk_matrix → member_360.get_member_risk_assessment (AUTO)", "{period}", "⚠ ¿member_id? → C"],
  ["executive_dashboard.generate_ai_analysis → finance.generate_ai_analysis (AUTO)", "{scope, period}", "valores de scope → C"],
  ["#17 finance.narrative_generate → advisor_intelligence.generate_insight_narrative (AUTO)", "{period, audience, detail_level}", "⚠ params distintos → adaptador estilo C16 → C"],
  ["#18 finance.scenario_simulate → advisor_intelligence.simulate_scenario (AUTO)", "{variables}", "firma → C"],
];
say("  ── B2 · cross-agent (15 filas → 10 targets · cambiar agent-key, patrón C3g) ──");
for (const [row, params, open] of B2) say(`    ${row}\n        params: ${params}\n        abierto: ${open}`);
say("");
const B3A: Array<[string, string]> = [
  ["age_group.get_activity_health_score ×2 → get_age_group_health_score (mismo agente)", "equivalencia exacta de shape → C"],
  ["age_group.get_age_group_analytics_enhanced → get_generational_analytics", "semántica demografía vs analytics → C"],
  ["age_group.get_age_recommendation_enhanced → age_group_recommend_activities", "shape → C"],
  ["communication.communication_insights ×2 → generate_communication_insights", "shape insights[] → C"],
  ["communication.communications_campaign_generate → get_campaign_performance?", "⚠ generate(write-ish) vs perf(read) → C"],
  ["communication.communications_generate_personalized → send_personalized_notification (SEMI_AUTO)?", "⚠ ¿send real vs draft? → C"],
  ["communication.communications_sentiment_analyze → ⚠ sin candidato", "B3b o degradar"],
  ["guests.register_guest_checkin → register_guest (SEMI_AUTO)", "GuestCheckInForm vs firma → C"],
  ["guests.get_today_guests / get_today_summary → ¿get_guest_analytics_enhanced trae 'today'?", "→ C"],
  ["guests.checkout_guest → ⚠ sin candidato", "B3b (checkout) o degradar"],
  ["guest_management.guest_management_insights → get_guest_analytics_enhanced?", "shape → C"],
  ["facilities.get_facility → manage_facilities {action:'list'} + lookup cliente (patrón D5)", "→ C"],
  ["events.list_events → event_get_calendar {status,limit}?", "shape calendario vs lista → C"],
  ["events.get_event ×2 / update_event / update_event_status → ⚠ sin candidato", "B3b o degradar"],
  ["events.event_predict_attendance → proactive_recommendation.predict_event_attendance (cross)", "params → C"],
  ["events.event_conflict_detection → proactive_recommendation.detect_scheduling_conflicts?", "params → C"],
  ["events.event_recommend_optimization / event_engagement_boost → ⚠ sin candidato claro", "B3b o degradar"],
  ["engagement.create/pause/resume/cancel_campaign → design_reactivation_campaign dispatcher?", "enum de actions → C (inventario D)"],
  ["engagement.submit_survey_response → satisfaction.submit_satisfaction_survey (HITL, cross)", "params → C"],
  ["finance.finance_seasonal_calendar → get_seasonal_analysis (mismo agente)", "shape → C"],
  ["finance.finance_scenario_simulate ×2 → advisor simulate_scenario / ml simulate_hypothetical?", "→ C"],
  ["finance.finance_stress_test + finance.stress_test → ml simulate_hypothetical?", "→ C"],
  ["finance.finance_decision_simulate + finance.decision_simulate → ml simulate_hypothetical? / advisor?", "→ C"],
  ["finance.finance_narrative_generate → advisor generate_insight_narrative?", "→ C"],
  ["finance.finance_member_profitability → member_360 get_member_ltv_analysis?", "→ C"],
  ["finance.finance_opportunities_scan → ⚠ sin candidato", "B3b o degradar"],
  ["finance.get_transactions → ¿finance_account_status incluye tx?", "→ C (si no, B3b)"],
];
say("  ── B3a · near-name / candidatos a migración (verificar con C) ──");
for (const [row, open] of B3A) say(`    ${row}\n        abierto: ${open}`);
say("");
say("  ── B3b · crear tool backend o degradar (residuo tras B3a · decidir con C) ──");
say("    · por definir: events.get_event/update_*, guests.checkout_guest, communication.sentiment, finance.opportunities_scan…");
say("");
say("  ── B4 · campos/envelopes (herencia C3g) ──");
say("    · Reservation 9 renames camel→snake · Family 14↔7 · TrialList KPIs/paginación · ReactivationCampaign 18↔16 · D5 facility_type");
say("");
say("  ── Higiene ──");
say("    · ledger VI14: 6 entradas MUERTAS + 4 vacías (facilities.get_facility, finance.get_transactions, guests.get_today_guests, guests.get_today_summary)");
say("    · toolNameAdapter: entradas families muertas (create_family, update_family, list_families, get_activity_history, get_social_graph) + get_financial_summary → tool INEXISTENTE");
say("    · mocks huérfanos tras migraciones (inventario D)");
say("");
say("══ fin h4 — con A-D se confirma o corrige el plan y se escribe el batch h5 ══");
fs.writeFileSync(path.join(ROOT, "p2c3h_evidence_report.txt"), REPORT.join("\n") + "\n", "utf8");
console.log("");
console.log("✓ reporte: p2c3h_evidence_report.txt");
