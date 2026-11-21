/**
 * P2-C3g · g8-patch4 — cierre de C3g: fila #9 (trials) + campo C16 (familia)
 * Se corre desde la RAIZ del repo:  npx tsx scripts/p2c3g_patch4.ts
 *
 * Filas (atomicas: edit -> gate tsc -> rollback SOLO de la fila si falla):
 *   C16  WellnessFamilySelector.tsx — items FamilyBrief (7 campos snake) via regex GLOBAL
 *        (la causa del revert de patch3 fueron renombres parciales)
 *   #9   GuestList.tsx — list_trial_memberships -> manage_trial_memberships{action:"list"}
 *        envelope { status, message, trial_memberships } (E3) · sin total/KPIs/paginacion
 *        backend (E4) -> adaptador client-side estilo D5 + degradacion documentada.
 *
 * Pre-flights (solo lectura, quedan en el reporte):
 *   A · HITL: gate central? fuentes de register_with_mcp + MCPTool + create_request
 *        fuera de agents/ (guard que demora #9 si aparece) + rama list de
 *        design_reactivation_campaign (validacion retroactiva de #2/g5)
 *   B · consumidores de WellnessFamilySelector (el tsc de patch3 no podia validarlos)
 *
 * Post-gate #9: cirugia de ledger VI14 (entrada guests.list_trial_memberships).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FE = path.join(ROOT, "frontend");
const REPORT: string[] = [];
const say = (s = ""): void => { console.log(s); REPORT.push(s); };

const read = (p: string): string => fs.readFileSync(p, "utf8");
const write = (p: string, c: string): void => fs.writeFileSync(p, c, "utf8");
const countOf = (s: string, re: RegExp): number => (s.match(re) ?? []).length;
const rel = (p: string): string => path.relative(ROOT, p).replaceAll("\\", "/");

function tscGate(): { ok: boolean; out: string } {
  try {
    execSync("npx tsc -p tsconfig.app.json --noEmit", {
      cwd: FE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      timeout: 240_000, maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: true, out: "" };
  } catch (e: any) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() };
  }
}

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git", "dist", "build"].includes(e.name)) continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

type Hit = { file: string; line: number; text: string };
function grepFiles(files: string[], re: RegExp): Hit[] {
  const hits: Hit[] = [];
  for (const f of files) {
    let lines: string[] = [];
    try { lines = read(f).split("\n"); } catch { continue; }
    lines.forEach((t, i) => { if (re.test(t)) hits.push({ file: f, line: i + 1, text: t }); });
  }
  return hits;
}

function printSlice(file: string, start1: number, count: number): string {
  const lines = read(file).split("\n");
  const s = Math.max(0, start1 - 1);
  const e = Math.min(lines.length, s + count);
  const out: string[] = [];
  for (let i = s; i < e; i++) out.push(`    ${String(i + 1).padStart(4)}│ ${lines[i]}`);
  return out.join("\n");
}

type Edit = { find: string; repl: string; label: string };
function applyEdits(src: string, edits: Edit[]): { ok: true; out: string } | { ok: false; err: string } {
  const crlf = src.includes("\r\n");
  const norm = (s: string): string => (crlf ? s.replace(/\n/g, "\r\n") : s);
  let out = src;
  for (const e of edits) {
    const find = norm(e.find);
    const n = out.split(find).length - 1;
    if (n !== 1) return { ok: false, err: `ancla no unica (n=${n}, crlf=${crlf}): ${e.label}` };
    out = out.replace(find, norm(e.repl));
  }
  return { ok: true, out };
}

say('P2-C3g · g8-patch4 — cierre de C3g: #9 + C16 con pre-flights y cirugia de ledger');
say('  filas: C16 campos familia (regex global) · #9 trials -> manage_trial_memberships{action:"list"}');
say("");

// ══════════════════════════════════════════════════════════════
// A · Pre-flight HITL — ¿existe un gate central fuera de agents/?
// ══════════════════════════════════════════════════════════════
say("══ A. Pre-flight HITL — ¿gate central en el registro de tools? ══");
let hitlSuspicious = false;
const pys = walk(path.join(ROOT, "backend/src/club_mcp"), [".py"]);

// A1 · create_request( / ApprovalEngine( por archivo
const gateHits = grepFiles(pys, /create_request\(|ApprovalEngine\(/);
const byFile = new Map<string, number>();
for (const h of gateHits) byFile.set(h.file, (byFile.get(h.file) ?? 0) + 1);
say("  · create_request( / ApprovalEngine( — hits por archivo:");
for (const [f, n] of [...byFile.entries()].sort()) say(`      ${rel(f)}: ${n}`);
for (const h of gateHits) {
  const r = rel(h.file);
  if (/create_request\(/.test(h.text) && !/\/agents\//.test(r) && !/\/hitl\//.test(r)) {
    hitlSuspicious = true;
    say(`  ⚠ create_request FUERA de agents/|hitl/: ${r}:${h.line}`);
  }
}

// A2 · fuente de register_with_mcp
const regHits = grepFiles(pys, /def register_with_mcp/);
if (regHits.length === 0) { say("  ⚠ no encontre def register_with_mcp"); hitlSuspicious = true; }
for (const h of regHits.slice(0, 2)) {
  say(`  ── ${rel(h.file)}:${h.line} · register_with_mcp (+55 lineas) ──`);
  say(printSlice(h.file, h.line, 55));
  const body = read(h.file).split("\n").slice(h.line - 1, h.line - 1 + 55).join("\n");
  if (/create_request|ApprovalLevel\.HITL/.test(body)) {
    hitlSuspicious = true;
    say("  ⚠ el cuerpo de register_with_mcp menciona create_request/ApprovalLevel.HITL");
  }
}

// A3 · fuente del decorador MCPTool
const toolHits = grepFiles(pys, /class MCPTool|def MCPTool/);
if (toolHits.length === 0) {
  say("  ⚠ no encontre class/def MCPTool en backend/src/club_mcp — import en guest_management_agent:");
  const imp = grepFiles([path.join(ROOT, "backend/src/club_mcp/agents/guest_management_agent.py")], /MCPTool/);
  for (const h of imp.slice(0, 3)) say(`      ${h.line}│ ${h.text.trim()}`);
  hitlSuspicious = true;
}
for (const h of toolHits.slice(0, 2)) {
  say(`  ── ${rel(h.file)}:${h.line} · MCPTool (+70 lineas) ──`);
  say(printSlice(h.file, h.line, 70));
  const body = read(h.file).split("\n").slice(h.line - 1, h.line - 1 + 70).join("\n");
  if (/create_request|pending_approval/.test(body)) {
    hitlSuspicious = true;
    say("  ⚠ el cuerpo de MCPTool menciona create_request/pending_approval — posible wrapper");
  }
}

// A4 · rama list de design_reactivation_campaign (validacion retroactiva de #2/g5)
const drc = grepFiles(pys, /name="design_reactivation_campaign"/);
for (const h of drc.slice(0, 1)) {
  const lines = read(h.file).split("\n");
  const from = h.line - 1;
  const to = Math.min(lines.length, from + 130);
  let li = -1;
  for (let i = from; i < to; i++) if (lines[i].includes('if action == "list"')) { li = i; break; }
  if (li >= 0) {
    say(`  ── ${rel(h.file)}:${li + 1} · design_reactivation_campaign rama list (+18) ──`);
    say(printSlice(h.file, li + 1, 18));
  } else {
    say("  ⚠ design_reactivation_campaign sin rama action==list visible en +130 lineas — revisar (#2/g5)");
  }
}

if (hitlSuspicious) {
  say("  VEREDICTO A: ⚠ SOSPECHOSO — #9 se demora (evidencia arriba para revision manual)");
} else {
  say('  VEREDICTO A: sin gate central — el HITL se materializa con create_request DENTRO de');
  say('    las ramas de escritura; la rama list (E3 l411-425) retorna directo → action="list" pasa.');
}
say("");

// ══════════════════════════════════════════════════════════════
// B · Pre-flight C16 — consumidores de WellnessFamilySelector
// ══════════════════════════════════════════════════════════════
say("══ B. Pre-flight C16 — consumidores de WellnessFamilySelector ══");
say("  (el tsc de patch3 no validaba consumidores: el tipo Props roto degradaba a any)");
{
  const feTs = walk(path.join(FE, "src"), [".tsx", ".ts"]);
  const consFiles = feTs.filter((f) => {
    if (rel(f) === "frontend/src/features/wellness/components/WellnessFamilySelector.tsx") return false;
    try { return read(f).includes("WellnessFamilySelector"); } catch { return false; }
  });
  if (consFiles.length === 0) say("  · sin consumidores fuera del componente");
  for (const f of consFiles) {
    say(`  ── ${rel(f)} · uso JSX con contexto ──`);
    const lines = read(f).split("\n");
    const useIdx = lines.map((t, i) => (t.includes("<WellnessFamilySelector") ? i : -1)).filter((i) => i >= 0);
    if (useIdx.length === 0) {
      say("    (sin JSX <WellnessFamilySelector — import muerto o reexport)");
      lines.forEach((t, i) => { if (t.includes("WellnessFamilySelector")) say(`    ${String(i + 1).padStart(4)}│ ${t}`); });
    }
    for (const i of useIdx.slice(0, 3)) {
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 12); j++) {
        say(`    ${String(j + 1).padStart(4)}│ ${lines[j]}`);
      }
      say("    ⋮");
    }
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// C · Fila C16 — WellnessFamilySelector.tsx (renombrado GLOBAL)
// ══════════════════════════════════════════════════════════════
say("══ C. Fila C16 — WellnessFamilySelector.tsx (regex global) ══");
const c16p = path.join(FE, "src/features/wellness/components/WellnessFamilySelector.tsx");
let appliedC16 = false;
if (!fs.existsSync(c16p)) {
  say(`  ✗ no encuentro ${rel(c16p)}`);
} else {
  const orig = read(c16p);
  const importLine = 'import type { Family, FamilyListResponse } from "@/features/families/types";';
  const nFName = countOf(orig, /\.familyName\b/g);
  const nMCount = countOf(orig, /\.memberCount\b/g);
  const nFam = countOf(orig, /\bFamily\b/g);
  say(`  anclas: import=${orig.includes(importLine)} · .familyName=${nFName}/3 · .memberCount=${nMCount}/2 · Family=${nFam}/2`);
  if (!orig.includes(importLine) || nFName !== 3 || nMCount !== 2 || nFam !== 2) {
    say("  C16 DEMORADO — anclas no coinciden con E1 (¿el archivo cambio desde g7?)");
  } else {
    const crlf = orig.includes("\r\n");
    const N = (s: string): string => (crlf ? s.replace(/\n/g, "\r\n") : s);
    const ifaceBlock = N([
      "/**",
      " * P2-C3g C16 — items de family_search: FamilyBrief",
      " * (backend/src/club_mcp/models/family.py · 7 campos snake_case).",
      " * El tipo compartido (families/types, 14 campos camelCase) queda como deuda C3h.",
      " */",
      "interface WellnessFamilyItem {",
      "  id: string;",
      "  name: string;",
      "  tier: string;",
      "  status: string;",
      "  member_count: number;",
      "  engagement_score: number;",
      "  join_date: string;",
      "}",
      "",
      "interface WellnessFamilyListResponse {",
      "  families: WellnessFamilyItem[];",
      "}",
    ].join("\n"));
    const next = orig
      .replace(N(importLine), ifaceBlock)
      .replace(N("onSelect: (family: Family) => void;"), N("onSelect: (family: WellnessFamilyItem) => void;"))
      .replace(N("useMCPQuery<FamilyListResponse>"), N("useMCPQuery<WellnessFamilyListResponse>"))
      .replace(/\.familyName\b/g, ".name")
      .replace(/\.memberCount\b/g, ".member_count");
    const residue = countOf(next, /\bFamily\b/g) + countOf(next, /familyName/g) + countOf(next, /memberCount/g);
    if (residue !== 0) {
      say(`  C16 DEMORADO — residuo tras regex: Family/familyName/memberCount = ${residue}`);
    } else {
      write(c16p, next);
      say("  C16 REWRITE ✓ .familyName→.name(×3) · .memberCount→.member_count(×2) · Family→WellnessFamilyItem");
      say("    + interfaces locales WellnessFamilyItem(7)/WellnessFamilyListResponse · import families/types fuera");
      say("    ↻ gate tsc …");
      const g = tscGate();
      if (g.ok) { say("  ✓ tsc OK — fila C16 APLICADA"); appliedC16 = true; }
      else {
        say("  ✗ tsc FALLÓ — revirtiendo SOLO esta fila:");
        say(g.out.split("\n").map((l) => "      " + l).join("\n"));
        write(c16p, orig);
        say("  ⤺ fila revertida (el resto de la corrida permanece)");
      }
    }
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// D · Fila #9 — GuestList.tsx · trials
// ══════════════════════════════════════════════════════════════
say("══ D. Fila #9 — GuestList.tsx · trials ══");
const p9 = path.join(FE, "src/features/guests/GuestList.tsx");
const gmaPath = path.join(ROOT, "backend/src/club_mcp/agents/guest_management_agent.py");
let applied9 = false;

if (hitlSuspicious) {
  say("  #9 DEMORADO — pre-flight A marco posible gate central (ver seccion A)");
} else if (!fs.existsSync(gmaPath)) {
  say("  #9 DEMORADO — no encuentro guest_management_agent.py");
} else if (!read(gmaPath).includes('"trial_memberships": [') || !read(gmaPath).includes('if action == "list":')) {
  say("  #9 DEMORADO — la rama list de manage_trial_memberships ya no coincide con E3");
} else if (!fs.existsSync(p9)) {
  say(`  ✗ no encuentro ${rel(p9)}`);
} else {
  say("  · rama list verificada (E3): { status, message, trial_memberships } sin create_request");
  say("  · E4: conversion_rate/active_count/total NO existen en el envelope backend → degradacion D5");
  const orig = read(p9);
  const edits: Edit[] = [
    {
      label: "query → manage_trial_memberships",
      find: `  const trialsQ = useMCPQuery<TrialListResponse>(
    "guests",
    "list_trial_memberships",
    { page: trialPage, page_size: 10 },
    { enabled: activeTab === "trials", placeholderData: keepPreviousData },
  );`,
      repl: `  const trialsQ = useMCPQuery<TrialListEnvelope>(
    "guests",
    "manage_trial_memberships",
    { action: "list" },
    { enabled: activeTab === "trials", placeholderData: keepPreviousData },
  );`,
    },
    {
      label: "import sin TrialListResponse",
      find: "  type TrialListResponse,\n",
      repl: "",
    },
    {
      label: "tipos locales envelope/item",
      find: `type Tab = "today" | "trials";`,
      repl: `type Tab = "today" | "trials";

/**
 * P2-C3g #9 — envelope + item de manage_trial_memberships(action="list").
 * Backend (guest_management_agent.py, rama list): { status, message, trial_memberships[] }
 * — sin total/conversion_rate/active_count y sin paginacion server-side (E3/E4).
 * Campos FE-only no vienen del backend → opcionales (degradacion documentada, deuda C3h).
 */
interface TrialListEnvelope {
  status: string;
  message?: string;
  trial_memberships?: BackendTrialItem[];
}

interface BackendTrialItem {
  id: string;
  guest_name: string;
  trial_type: string;
  start_date: string;
  end_date: string;
  status: string;
  /** FE-only — el modelo backend (13 campos) no los envia. */
  host_family_name?: string;
  trial_type_label?: string;
  activities_attended?: number;
  conversion_probability?: number | null;
}`,
    },
    {
      label: "constante TRIALS_PAGE_SIZE",
      find: `const STATUS_OPTIONS = [
  { value: "active", label: "En el club" },
  { value: "departed", label: "Salió" },
  { value: "no_show", label: "No se presentó" },
] as const;`,
      repl: `const STATUS_OPTIONS = [
  { value: "active", label: "En el club" },
  { value: "departed", label: "Salió" },
  { value: "no_show", label: "No se presentó" },
] as const;

/** P2-C3g #9 — el backend no pagina el list de trials → paginacion client-side. */
const TRIALS_PAGE_SIZE = 10;`,
    },
    {
      label: "adaptador client-side",
      find: `  const stats = summaryQ.data;`,
      repl: `  const stats = summaryQ.data;

  // ── P2-C3g #9 · adaptador client-side (deuda C3h: KPIs y paginacion en backend) ──
  const trials = trialsQ.data?.trial_memberships ?? [];
  const trialsTotal = trials.length;
  const activeTrials = trials.filter((t) => t.status === "active").length;
  const trialPages = Math.max(1, Math.ceil(trialsTotal / TRIALS_PAGE_SIZE));
  const currentTrialPage = Math.min(trialPage, trialPages);
  const pagedTrials = trials.slice(
    (currentTrialPage - 1) * TRIALS_PAGE_SIZE,
    currentTrialPage * TRIALS_PAGE_SIZE,
  );`,
    },
    {
      label: "banner de conversion degradado",
      find: `                  {/* Conversion rate banner */}
                  {trialsQ.data.conversion_rate > 0 && (
                    <div className="gst-list__conversion-banner">
                      <Sparkles className="gst-list__conversion-icon" />
                      <div className="gst-list__conversion-info">
                        <p className="gst-list__conversion-rate">
                          Tasa de conversión: {trialsQ.data.conversion_rate.toFixed(1)}%
                        </p>
                        <p className="gst-list__conversion-active">
                          {trialsQ.data.active_count} trials activos
                        </p>
                      </div>
                    </div>
                  )}`,
      repl: `                  {/* P2-C3g #9 · banner degradado — backend no expone conversion_rate (deuda C3h) */}
                  {activeTrials > 0 && (
                    <div className="gst-list__conversion-banner">
                      <Sparkles className="gst-list__conversion-icon" />
                      <div className="gst-list__conversion-info">
                        <p className="gst-list__conversion-active">
                          {activeTrials} trials activos
                        </p>
                      </div>
                    </div>
                  )}`,
    },
    {
      label: "empty check",
      find: `              {!trialsQ.isLoading && (!trialsQ.data || trialsQ.data.trials.length === 0) && (`,
      repl: `              {!trialsQ.isLoading && trials.length === 0 && (`,
    },
    {
      label: "data check",
      find: `              {trialsQ.data && trialsQ.data.trials.length > 0 && (`,
      repl: `              {trialsQ.data && trials.length > 0 && (`,
    },
    {
      label: "map sobre pagina",
      find: `                    {trialsQ.data.trials.map((trial, i) => {`,
      repl: `                    {pagedTrials.map((trial, i) => {`,
    },
    {
      label: "linea host degradada",
      find: `                            <p className="gst-list__trial-host">
                              Invitado por {trial.host_family_name} · {trial.trial_type_label}
                            </p>`,
      repl: `                            <p className="gst-list__trial-host">
                              Invitado por {trial.host_family_name ?? "—"} ·{" "}
                              {trial.trial_type_label ?? trial.trial_type}
                            </p>`,
    },
    {
      label: "actividades con ?? 0",
      find: `                              {trial.activities_attended > 0 && (
                                <span className="gst-list__meta-item">
                                  {trial.activities_attended} actividades
                                </span>
                              )}`,
      repl: `                              {(trial.activities_attended ?? 0) > 0 && (
                                <span className="gst-list__meta-item">
                                  {trial.activities_attended ?? 0} actividades
                                </span>
                              )}`,
    },
    {
      label: "visibilidad paginacion",
      find: `                  {trialsQ.data.total > 10 && (`,
      repl: `                  {trialsTotal > TRIALS_PAGE_SIZE && (`,
    },
    {
      label: "total en paginacion",
      find: `                        {trialsQ.data.total} membresías en total`,
      repl: `                        {trialsTotal} membresías en total`,
    },
    {
      label: "disabled anterior",
      find: `                          disabled={trialPage === 1}`,
      repl: `                          disabled={currentTrialPage === 1}`,
    },
    {
      label: "disabled siguiente",
      find: `                          disabled={trialsQ.data.trials.length < 10}`,
      repl: `                          disabled={currentTrialPage >= trialPages}`,
    },
  ];

  const res = applyEdits(orig, edits);
  if (!res.ok) {
    say(`  #9 DEMORADO — ${res.err}`);
  } else {
    const out = res.out;
    const residue: string[] = [];
    if (countOf(out, /list_trial_memberships/g) !== 0) residue.push("list_trial_memberships");
    if (countOf(out, /trialsQ\.data\.trials/g) !== 0) residue.push("trialsQ.data.trials");
    if (countOf(out, /trialsQ\.data\.total/g) !== 0) residue.push("trialsQ.data.total");
    if (countOf(out, /trialsQ\.data\.conversion_rate/g) !== 0) residue.push("trialsQ.data.conversion_rate");
    if (countOf(out, /trialsQ\.data\.active_count/g) !== 0) residue.push("trialsQ.data.active_count");
    if (residue.length) {
      say(`  #9 DEMORADO — residuo inesperado: ${residue.join(", ")}`);
    } else {
      write(p9, out);
      say('  #9 REWRITE ✓ query→manage_trial_memberships{action:"list"} (sin page/page_size: no estan');
      say("    en la firma backend) · envelope+item locales · adaptador client-side:");
      say("    · paginacion client-side (TRIALS_PAGE_SIZE=10, slice) · total→length · active_count→filter");
      say('    · banner degradado a "N trials activos" (conversion_rate no existe en backend)');
      say('    · item: host_family_name→"—" · trial_type_label→trial_type · activities/probability opcionales');
      say("    ↻ gate tsc …");
      const g = tscGate();
      if (g.ok) { say("  ✓ tsc OK — fila #9 APLICADA"); applied9 = true; }
      else {
        say("  ✗ tsc FALLÓ — revirtiendo SOLO esta fila:");
        say(g.out.split("\n").map((l) => "      " + l).join("\n"));
        write(p9, orig);
        say("  ⤺ fila revertida (el resto de la corrida permanece)");
      }
    }
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// E · Cirugia del ledger VI14_EQUIVALENCES (solo si #9 aplico)
// ══════════════════════════════════════════════════════════════
say("══ E. Cirugía del ledger VI14_EQUIVALENCES ══");
const ledgerPath = path.join(ROOT, "scripts/p2c3e_vi14_patch.ts");
if (applied9 && fs.existsSync(ledgerPath)) {
  const lines = read(ledgerPath).split("\n");
  const idx = lines.findIndex((l) => /^\s*"guests\.list_trial_memberships"\s*:/.test(l));
  if (idx >= 0) {
    say(`  · entrada eliminada: ${lines[idx].trim()}`);
    lines.splice(idx, 1);
    write(ledgerPath, lines.join("\n"));
  } else {
    say("  ⚠ entrada guests.list_trial_memberships no encontrada (¿ya removida?)");
  }
  const remaining = lines.filter((l) => /^\s*"[\w.]+"\s*:\s*\[/.test(l)).length;
  say(`  · entradas de equivalencia restantes en el ledger: ${remaining}`);
} else if (applied9) {
  say("  ⚠ ledger no encontrado: scripts/p2c3e_vi14_patch.ts");
} else {
  say("  · #9 no aplicado — la entrada queda");
}
say("");

// ══════════════════════════════════════════════════════════════
// F · End-state
// ══════════════════════════════════════════════════════════════
say("══ F. End-state ══");
say(`  C16 ${appliedC16 ? "APLICADO ✓" : "no aplicado"} · #9 ${applied9 ? "APLICADO ✓" : "no aplicado"}`);
if (appliedC16 && applied9) say("  → C3g-frontend cerrado: queda deuda backend (#3 #4 #8 #14 #15 #17) + cola C3h");
if (applied9) {
  say("  cola C3h — nuevas por #9 (deuda backend de guest_management):");
  say("    · manage_trial_memberships(list) sin total/conversion_rate/active_count/paginacion");
  say("    · item sin host_family_name/trial_type_label/activities_attended/conversion_probability");
}
if (appliedC16) say("  cola C3h — permanece Family (families/types, 14 camel) por ser tipo compartido");
say("  inventario D (9 llamadas viejas en archivos tocados) — proximo ciclo C3h");
const nApplied = (appliedC16 ? 1 : 0) + (applied9 ? 1 : 0);
say(`  resumen corrida: aplicados ${nApplied} · demorados ${2 - nApplied}`);
say("");
say("  git diff --stat:");
let diff = "";
try { diff = execSync("git diff --stat", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString(); } catch { diff = ""; }
say(diff.split("\n").filter((l) => !l.startsWith("warning:")).join("\n").trim());

const reportPath = path.join(ROOT, "p2c3g_patch4_report.txt");
write(reportPath, REPORT.join("\n") + "\n");
console.log("");
console.log(`✓ reporte: ${rel(reportPath)}`);
