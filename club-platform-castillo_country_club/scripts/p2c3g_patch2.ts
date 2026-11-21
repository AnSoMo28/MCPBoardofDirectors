// ═══════════════════════════════════════════════════════════════════════════
// P2-C3g · g5-patch2 — des-bloqueo #2/#9 + cirugía de campo de los aplicados
//
// Ejecutar DESDE LA RAÍZ del repo:
//     npx tsx scripts/p2c3g_patch2.ts
//
// A  #2   ReactivationCampaigns: engagement.list_reactivation_campaigns
//         → member_engagement.design_reactivation_campaign {action:"list"}
//         + lecturas de total → campaigns.length (backend no devuelve total)
// B  #9   GuestList: guests.list_trial_memberships
//         → guest_management.manage_trial_memberships {action:"list"}
//         + adaptador client-side (paginación/total/active_count)
// C  C16  WellnessFamilySelector: f.familyName → f.family_name
//         (condicional: confirmación snake_case en backend + tipo local)
// D  D5   FacilityMap: params search/type/status → facility_type
//         (condicional: enums compatibles) + búsqueda client-side
// E  Auditoría de campo: diffs frontend↔backend + alias config + hook wellness
// F  Nueva deuda: pares (agente, tool) viejos en los archivos tocados
// G  HITL: evidencia del gate (¿action="list" pasa?)
// H  Ledger VI14: quitar equivalencias resueltas
//
// ATÓMICO POR FILA: cada fila se valida con `tsc --noEmit`; si falla,
// SOLO esa fila se revierte y el resto permanece.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const F = (p: string) => path.join(ROOT, p);

const report: string[] = [];
function log(s = ""): void { console.log(s); report.push(s); }

function read(p: string): string | null {
  try { return fs.readFileSync(F(p), "utf8"); } catch { return null; }
}

const originals = new Map<string, string>();
function writeFile(p: string, s: string): void {
  if (!originals.has(p)) { const o = read(p); if (o !== null) originals.set(p, o); }
  fs.writeFileSync(F(p), s);
}
function restoreFiles(files: string[]): void {
  for (const f of files) {
    const o = originals.get(f);
    if (o !== undefined) { fs.writeFileSync(F(f), o); originals.delete(f); }
  }
}

// ── helpers de exploración ─────────────────────────────────────────────────

let pyCache: string[] | null = null;
function pyFiles(): string[] {
  if (pyCache) return pyCache;
  const acc: string[] = [];
  const stack = ["backend/src/club_mcp"];
  while (stack.length) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(F(dir), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const rel = dir + "/" + e.name;
      if (e.isDirectory()) stack.push(rel);
      else if (e.name.endsWith(".py")) acc.push(rel);
    }
  }
  pyCache = acc;
  return acc;
}

function pyGrep(pattern: RegExp): string[] {
  const out: string[] = [];
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) out.push(`${f}:${i + 1}: ${lines[i]}`);
    }
  }
  return out;
}

function pyRegion(pattern: RegExp, before: number, after: number): string[] {
  const out: string[] = [];
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        out.push(`── ${f}:${i + 1} ──`);
        for (let j = Math.max(0, i - before); j <= Math.min(lines.length - 1, i + after); j++) {
          out.push(`  ${String(j + 1).padStart(5)} │ ${lines[j]}`);
        }
      }
    }
  }
  return out;
}

function pyModelFields(className: string): { file: string; fields: string[]; statusType: string } | null {
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    const idx = lines.findIndex(l => new RegExp(`^class ${className}\\b`).test(l));
    if (idx === -1) continue;
    const fields: string[] = [];
    let statusType = "";
    for (let i = idx + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break;
      const fm = lines[i].match(/^\s{4}([a-z_][a-z0-9_]*)\s*:\s*(.+?)\s*(?:=.*)?$/);
      if (fm && fm[1] !== "model_config") {
        fields.push(fm[1]);
        if (fm[1] === "status") statusType = fm[2];
      }
    }
    return { file: f, fields, statusType };
  }
  return null;
}

function pyEnumValues(name: string): string[] | null {
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    const idx = lines.findIndex(l => new RegExp(`^class ${name}\\b`).test(l));
    if (idx === -1) continue;
    const vals: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break;
      const m = lines[i].match(/^\s*[A-Z_]+\s*=\s*"([^"]+)"/);
      if (m) vals.push(m[1]);
    }
    return vals.length ? vals : null;
  }
  return null;
}

function tsGlob(dir: string, pattern: RegExp): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop() as string;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(F(d), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const rel = d + "/" + e.name;
      if (e.isDirectory()) stack.push(rel);
      else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) {
        const s = read(rel);
        if (!s) continue;
        const lines = s.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) out.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
        }
      }
    }
  }
  return out;
}

function tsRegion(file: string, pattern: RegExp, before: number, after: number): string[] {
  const src = read(file);
  if (!src) return [];
  const lines = src.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      out.push(`── ${file}:${i + 1} ──`);
      for (let j = Math.max(0, i - before); j <= Math.min(lines.length - 1, i + after); j++) {
        out.push(`  ${String(j + 1).padStart(5)} │ ${lines[j]}`);
      }
    }
  }
  return out;
}

function tsInterfaceFields(file: string, name: string): { file: string; fields: string[] } | null {
  const src = read(file);
  if (!src) return null;
  const lines = src.split("\n");
  const start = lines.findIndex(l => new RegExp(`(?:interface|type)\\s+${name}\\b`).test(l));
  if (start === -1) return null;
  const fields: string[] = [];
  let depth = 0;
  let began = false;
  for (let i = start; i < Math.min(lines.length, start + 120); i++) {
    for (const ch of lines[i]) {
      if (ch === "{") { depth++; began = true; }
      else if (ch === "}") depth--;
    }
    if (!began && i > start + 2) break;
    if (began && depth <= 0 && i > start) break;
    if (i > start) {
      const fm = lines[i].match(/^\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);
      if (fm) fields.push(fm[1]);
    }
  }
  return { file, fields };
}

function returnTypeOf(pattern: RegExp): string | null {
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        const around = lines.slice(i, i + 4).join(" ");
        const m = around.match(/->\s*(?:list\[|Sequence\[|Iterable\[|Optional\[)?([A-Z]\w+)/);
        if (m && !["Dict", "Any"].includes(m[1])) return m[1];
      }
    }
  }
  return null;
}

const snake = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

// ── gate tsc atómico por fila ──────────────────────────────────────────────

function tscGate(): { ok: boolean; out: string } {
  try {
    execSync("npx tsc -p tsconfig.app.json --noEmit", {
      cwd: F("frontend"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 240000,
    });
    return { ok: true, out: "" };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, out: `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}` };
  }
}

function rowGate(files: string[]): boolean {
  log("    ↻ gate tsc …");
  const t = tscGate();
  if (t.ok) { log("    ✓ tsc OK — fila confirmada"); return true; }
  log("    ✗ tsc FALLÓ — revirtiendo SOLO esta fila:");
  t.out.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 25).forEach(l => log("      " + l));
  restoreFiles(files);
  log("    ⤺ fila revertida (el resto de la corrida permanece)");
  return false;
}

// ── A. Fila #2 — campaigns ─────────────────────────────────────────────────

function row2(): { status: string; resolved: boolean } {
  const FILE = "frontend/src/features/engagement/ReactivationCampaigns.tsx";
  const TFILE = "frontend/src/features/engagement/types.ts";
  const files = [FILE, TFILE];
  const src = read(FILE);
  if (!src) { log("  #2 SKIP — archivo no encontrado"); return { status: "SKIP", resolved: false }; }
  if (src.includes('"design_reactivation_campaign"')) {
    log("  #2 YA — ya llama design_reactivation_campaign");
    return { status: "YA", resolved: true };
  }
  const anchor = /"engagement",(\s*\n\s+)"list_reactivation_campaigns",(\s*\n\s+)\{\},/;
  if (!anchor.test(src)) {
    log("  #2 SKIP — ancla no encontrada:");
    tsRegion(FILE, /list_reactivation_campaigns/, 2, 6).slice(0, 20).forEach(l => log("      " + l));
    return { status: "SKIP", resolved: false };
  }
  // preflight: todos los usos de campaignsQ deben ser propiedades conocidas
  const tokens = [...src.matchAll(/\bcampaignsQ\b[^\n]*/g)].map(x => x[0].trim());
  const bad = tokens.filter(t => {
    if (/^campaignsQ\s*=\s*useMCPQuery/.test(t)) return false;
    if (/^campaignsQ\.data\??\.(campaigns|total|status|message)\b/.test(t)) return false;
    if (/^campaignsQ\.(isLoading|isFetching|isPending|isError|error|refetch|status|isPlaceholderData|failureCount|isStale)\b/.test(t)) return false;
    return true;
  });
  if (bad.length) {
    log("  #2 DEMORADO — usos de campaignsQ no mapeados (pegar la salida para ajuste):");
    bad.forEach(b => log("      " + b));
    return { status: "DEMORADO", resolved: false };
  }
  let out = src.replace(anchor, '"member_engagement",$1"design_reactivation_campaign",$2{ action: "list" },');
  const nTotal = (out.match(/campaignsQ\.data\??\.total\b/g) || []).length;
  out = out
    .replace(/campaignsQ\.data\?\.total\b/g, "campaignsQ.data?.campaigns.length ?? 0")
    .replace(/campaignsQ\.data\.total\b/g, "campaignsQ.data.campaigns.length");
  const tsrc = read(TFILE);
  let typeNote = "types.ts sin cambio (total ya opcional o ausente)";
  if (tsrc) {
    const tre = /(export interface CampaignListResponse \{[\s\S]*?\n)(\s*)total: number;/;
    if (tre.test(tsrc)) {
      writeFile(TFILE, tsrc.replace(tre, "$1$2total?: number; // P2-C3g: backend no devuelve total"));
      typeNote = "types.ts: total → total? (backend no lo envía)";
    }
  }
  writeFile(FILE, out);
  log(`  #2 REWRITE ✓ ${FILE}`);
  log('      engagement.list_reactivation_campaigns → member_engagement.design_reactivation_campaign {action:"list"}');
  log(`      lecturas de total reescritas: ${nTotal} · ${typeNote}`);
  const ok = rowGate(files);
  return { status: ok ? "APLICADO" : "REVERTIDO", resolved: ok };
}

// ── B. Fila #9 — trials ────────────────────────────────────────────────────

function row9(): { status: string; resolved: boolean } {
  const FILE = "frontend/src/features/guests/GuestList.tsx";
  const TYPES = "frontend/src/features/guests/types.ts";
  const files = [FILE];
  const src = read(FILE);
  if (!src) { log("  #9 SKIP — archivo no encontrado"); return { status: "SKIP", resolved: false }; }
  if (src.includes('"manage_trial_memberships"')) {
    log("  #9 YA — ya llama manage_trial_memberships");
    return { status: "YA", resolved: true };
  }
  const anchor = /useMCPQuery<\s*TrialListResponse\s*>\(\s*\n(\s*)"guests",\s*\n\s*"list_trial_memberships",\s*\n\s*\{ page: trialPage, page_size: (\d+) \},/;
  const m = src.match(anchor);
  if (!m) {
    log("  #9 SKIP — ancla no encontrada:");
    tsRegion(FILE, /list_trial_memberships|trialsQ = useMCPQuery/, 2, 6).slice(0, 24).forEach(l => log("      " + l));
    return { status: "SKIP", resolved: false };
  }
  const IND = m[1];
  const PAGE = m[2];
  const uses = (src.match(/TrialListResponse/g) || []).length;
  if (uses !== 2) {
    log(`  #9 DEMORADO — TrialListResponse aparece ${uses} veces (esperado 2: import + query):`);
    tsRegion(FILE, /TrialListResponse/, 1, 2).slice(0, 12).forEach(l => log("      " + l));
    return { status: "DEMORADO", resolved: false };
  }
  const tsrc = read(TYPES);
  if (!tsrc || !/export (?:interface|type) TrialMembership\b/.test(tsrc)) {
    log("  #9 DEMORADO — TrialMembership no está exportado desde guests/types.ts:");
    tsGlob("frontend/src", /(?:interface|type)\s+TrialMembership\b/).slice(0, 6).forEach(l => log("      " + l));
    return { status: "DEMORADO", resolved: false };
  }
  // preflight: usos de trialsQ totalmente mapeados
  const tokens = [...src.matchAll(/\btrialsQ\b[^\n]*/g)].map(x => x[0].trim());
  const bad = tokens.filter(t => {
    if (/^trialsQ\s*=\s*useMCPQuery/.test(t)) return false;
    if (/^trialsQ\.data\??\.(trials|total|active_count)\b/.test(t)) return false;
    if (/^trialsQ\.(isLoading|isFetching|isPending|isError|error|refetch|status|isPlaceholderData|failureCount|isStale)\b/.test(t)) return false;
    return true;
  });
  if (bad.length) {
    log("  #9 DEMORADO — usos de trialsQ no mapeados (pegar la salida para ajuste):");
    bad.forEach(b => log("      " + b));
    return { status: "DEMORADO", resolved: false };
  }
  const nTrials = (src.match(/trialsQ\.data\??\.trials\b/g) || []).length;
  const nTotal = (src.match(/trialsQ\.data\??\.total\b/g) || []).length;
  const nActive = (src.match(/trialsQ\.data\??\.active_count\b/g) || []).length;

  // valor de estado "activo" según el modelo backend
  const tm = pyModelFields("TrialMembership");
  let statusVals: string[] = [];
  if (tm && tm.statusType) {
    const lit = [...tm.statusType.matchAll(/"([^"]+)"/g)].map(x => x[1]);
    if (lit.length) statusVals = lit;
    else {
      const en = tm.statusType.match(/\b([A-Z][A-Za-z0-9_]*)\b/);
      if (en) statusVals = pyEnumValues(en[1]) ?? [];
    }
  }
  log(`      backend TrialMembership.status → ${tm ? (tm.statusType || "(sin anotación)") : "modelo no encontrado"}${statusVals.length ? " [" + statusVals.join(", ") + "]" : ""}`);
  const act = statusVals.find(v => /^(active|activa|ongoing|en_curso|vigente)$/i.test(v));
  const activeExpr = act
    ? `trialAll.filter((t) => t.status === "${act}").length`
    : "0 /* P2-C3g: estado activo no confirmado en backend */";

  let out = src.replace(
    anchor,
    `useMCPQuery<TrialListBackendResponse>(\n${IND}"guest_management",\n${IND}"manage_trial_memberships",\n${IND}{ action: "list" },`
  );
  // interfaz local con el shape real del backend
  const iface =
    "  // P2-C3g #9 — shape real de guest_management.manage_trial_memberships(action:\"list\")\n" +
    "  interface TrialListBackendResponse {\n" +
    "    readonly status: string;\n" +
    "    readonly message: string;\n" +
    "    readonly trial_memberships: readonly TrialMembership[];\n" +
    "  }\n\n";
  out = out.replace(
    "  const trialsQ = useMCPQuery<TrialListBackendResponse>(",
    iface + "  const trialsQ = useMCPQuery<TrialListBackendResponse>("
  );
  // adaptador client-side (el backend no pagina)
  if (nTrials > 0 || nTotal > 0 || nActive > 0) {
    const qIdx = out.indexOf("const trialsQ = useMCPQuery<TrialListBackendResponse>");
    const cIdx = out.indexOf("\n  );", qIdx);
    if (qIdx === -1 || cIdx === -1) {
      log("  #9 DEMORADO — no se pudo ubicar el cierre del bloque trialsQ");
      return { status: "DEMORADO", resolved: false };
    }
    const lines = ["    const trialAll = trialsQ.data?.trial_memberships ?? [];"];
    if (nActive > 0) lines.push(`    const trialActiveCount = ${activeExpr};`);
    if (nTrials > 0) lines.push(`    const trialPageRows = trialAll.slice((trialPage - 1) * ${PAGE}, trialPage * ${PAGE});`);
    const adapter = "\n\n  // P2-C3g #9 — adaptador: el backend no pagina; slice y conteos client-side\n" + lines.join("\n");
    const at = cIdx + "\n  );".length;
    out = out.slice(0, at) + adapter + out.slice(at);
  }
  // reescritura de lecturas
  out = out
    .replace(/trialsQ\.data\?\.trials\b/g, "trialPageRows")
    .replace(/trialsQ\.data\.trials\b/g, "trialPageRows")
    .replace(/trialsQ\.data\?\.total\b/g, "trialAll.length")
    .replace(/trialsQ\.data\.total\b/g, "trialAll.length")
    .replace(/trialsQ\.data\?\.active_count\b/g, "trialActiveCount")
    .replace(/trialsQ\.data\.active_count\b/g, "trialActiveCount");
  // import: TrialListResponse → TrialMembership
  if (!/  type TrialListResponse,/.test(out)) {
    log("  #9 DEMORADO — no se encontró la línea de import 'type TrialListResponse,'");
    return { status: "DEMORADO", resolved: false };
  }
  out = out.replace("  type TrialListResponse,", "  type TrialMembership,");
  const residual = (out.match(/trialsQ\.data\??\.(trials|total|active_count)\b/g) || []).length;
  if (residual > 0) {
    log(`  #9 DEMORADO — ${residual} lecturas residuales sin mapear`);
    return { status: "DEMORADO", resolved: false };
  }
  writeFile(FILE, out);
  log(`  #9 REWRITE ✓ ${FILE}`);
  log('      guests.list_trial_memberships → guest_management.manage_trial_memberships {action:"list"}');
  log(`      adaptador client-side: trialAll · trialPageRows(page=${PAGE}) · lecturas reescritas: trials=${nTrials} total=${nTotal} active_count=${nActive}`);
  const ok = rowGate(files);
  return { status: ok ? "APLICADO" : "REVERTIDO", resolved: ok };
}

// ── C. Campo — WellnessFamilySelector (C16) ────────────────────────────────

function rowC16(): string {
  const FILE = "frontend/src/features/wellness/components/WellnessFamilySelector.tsx";
  const src = read(FILE);
  if (!src) { log("  C16 SKIP — archivo no encontrado"); return "SKIP"; }
  if (!src.includes("family_search")) { log("  C16 SKIP — sin family_search"); return "SKIP"; }
  log("  ── bloque del componente (evidencia) ──");
  tsRegion(FILE, /"family_search"/, 5, 12).slice(0, 22).forEach(l => log("      " + l));
  const hookLine = src.split("\n").find(l => /useMCP|callMCP/.test(l));
  if (hookLine) log(`      hook: ${hookLine.trim()}`);
  if (/familiesResp\?\.(families|total|data)/.test(src)) {
    log("      ⚠ NOTA: se lee familiesResp?.… — verificar si el wrapper devuelve UseQueryResult (¿falta .data?)");
  }
  // 1) evidencia backend: ¿los ítems son snake_case?
  const evLines: string[] = [
    ...pyRegion(/async def family_search\b/, 0, 45),
    ...pyRegion(/async def search_families\b/, 0, 35),
  ];
  for (const cls of ["FamilySearchResult", "FamilySummary", "Family", "FamilyBrief"]) {
    const mf = pyModelFields(cls);
    if (mf) evLines.push(`${mf.file}: class ${cls} → ${mf.fields.join(", ")}`);
  }
  const aliasCfg = pyGrep(/alias_generator|to_camel/);
  const snakeOK = evLines.some(l => /\bfamily_name\b/.test(l)) && aliasCfg.length === 0;
  const camelBE = evLines.some(l => /\bfamilyName\b/.test(l)) || aliasCfg.length > 0;
  if (!snakeOK || camelBE) {
    log("  C16 DEMORADO — ítems de family_search sin confirmar como snake_case:");
    log(`      snake:${snakeOK ? "✓" : "✗"} · camel-backend:${camelBE ? "⚠" : "✗"} · alias:${aliasCfg.length ? aliasCfg[0] : "no"}`);
    evLines.slice(0, 20).forEach(l => log("      " + l));
    return "DEMORADO";
  }
  // 2) ¿familyName es un tipo local del archivo?
  const isLocal = /\{[^{}]*\bfamilyName\b[^{}]*\}/.test(src);
  if (!isLocal) {
    log("  C16 DEMORADO — familyName no es tipo local (tipo compartido → decisión C3h). Aparece en:");
    tsGlob("frontend/src", /\bfamilyName\b/).slice(0, 12).forEach(l => log("      " + l));
    return "DEMORADO";
  }
  const jsxProp = /\bfamilyName\s*=\{/.test(src);
  if (jsxProp) {
    const n1 = (src.match(/\.familyName\b/g) || []).length;
    let out = src.replace(/\.familyName\b/g, ".family_name");
    out = out.replace(/\bfamilyName(\s*[?:])/g, "family_name$1");
    writeFile(FILE, out);
    log(`  C16 REWRITE ✓ ${FILE} — .familyName→.family_name (${n1}) + declaración (props JSX intactas)`);
  } else {
    const n = (src.match(/\bfamilyName\b/g) || []).length;
    writeFile(FILE, src.replace(/\bfamilyName\b/g, "family_name"));
    log(`  C16 REWRITE ✓ ${FILE} — familyName→family_name (${n} ocurrencias)`);
  }
  return rowGate([FILE]) ? "APLICADO" : "REVERTIDO";
}

// ── D. Campo — FacilityMap filtros (D5) ────────────────────────────────────

function rowD5(): string {
  const FILE = "frontend/src/features/facilities/FacilityMap.tsx";
  const src = read(FILE);
  if (!src) { log("  D5 SKIP — archivo no encontrado"); return "SKIP"; }
  const anchor = /("(?:facility_management|facilities|facility)",)(\s*\n\s+)"manage_facilities",(\s*\n\s+)\{\s*\n\s+action: "list",\s*\n\s+search: deferredSearch \|\| undefined,\s*\n\s+type: typeFilter \|\| undefined,\s*\n\s+status: statusFilter \|\| undefined,\s*\n\s+\},/;
  const m = src.match(anchor);
  if (!m) {
    log("  D5 SKIP — ancla de params no encontrada (¿ya ajustado?):");
    tsRegion(FILE, /"manage_facilities"/, 2, 8).slice(0, 20).forEach(l => log("      " + l));
    return "SKIP";
  }
  if (m[1] !== '"facility_management",') log(`      ⚠ agente actual ${m[1]} → se normaliza a "facility_management"`);

  const beVals = pyEnumValues("FacilityType") ?? [];
  const ftypes = read("frontend/src/features/facilities/types.ts") ?? "";
  const feUnion = (ftypes.match(/type FacilityType\s*=\s*([^;]+);/) || [])[1] || "";
  const feVals = [...feUnion.matchAll(/"([^"]+)"/g)].map(x => x[1]);
  const typeOK = beVals.length > 0 && feVals.length > 0 && feVals.every(v => beVals.includes(v));
  log(`      FacilityType → backend [${beVals.join(", ") || "?"}] · frontend [${feVals.join(", ") || "?"}] → ${typeOK ? "compatible ✓" : "INCOMPATIBLE (filtro de tipo cae → C3h)"}`);

  const facModel = pyModelFields("Facility");
  let beStatus: string[] = [];
  if (facModel && facModel.statusType) {
    const lit = [...facModel.statusType.matchAll(/"([^"]+)"/g)].map(x => x[1]);
    if (lit.length) beStatus = lit;
    else {
      const en = facModel.statusType.match(/\b([A-Z][A-Za-z0-9_]*)\b/);
      if (en) beStatus = pyEnumValues(en[1]) ?? [];
    }
  }
  const feStatusUnion = (ftypes.match(/type (?:FacilityStatus|FacilityStatusFilter)\s*=\s*([^;]+);/) || [])[1] || "";
  const feStatus = [...feStatusUnion.matchAll(/"([^"]+)"/g)].map(x => x[1]);
  const statusOK = beStatus.length > 0 && feStatus.length > 0 && feStatus.every(v => beStatus.includes(v));
  log(`      status → backend [${beStatus.join(", ") || "?"}] · frontend [${feStatus.join(", ") || "?"}] → filtro client-side ${statusOK ? "SÍ ✓" : "NO (C3h)"}`);

  const paramsNew = typeOK
    ? `"facility_management",$2"manage_facilities",$3{\n$3  action: "list",\n$3  facility_type: typeFilter || undefined,\n$3},`
    : `"facility_management",$2"manage_facilities",$3{\n$3  action: "list",\n$3},`;

  const memoAnchor = /const facilities = useMemo\(\(\) => data\?\.facilities \?\? \[\], \[data\]\);/;
  const statusLine = statusOK ? `\n      if (statusFilter && f.status !== statusFilter) return false;` : "";
  const memoNew = `const facilities = useMemo(() => {\n    const all = data?.facilities ?? [];\n    const q = deferredSearch.trim().toLowerCase();\n    return all.filter((f) => {\n      if (q && !(f.name ?? "").toLowerCase().includes(q)) return false;${statusLine}\n      return true;\n    });\n  }, [data, deferredSearch${statusOK ? ", statusFilter" : ""}]);`;

  let out = src.replace(anchor, paramsNew);
  const memoOK = memoAnchor.test(out);
  if (memoOK) out = out.replace(memoAnchor, memoNew);
  writeFile(FILE, out);
  log(`  D5 REWRITE ✓ ${FILE} — params {action:"list"${typeOK ? ", facility_type" : ""}}${memoOK ? " + búsqueda client-side en useMemo" : " (⚠ useMemo no encontrado — búsqueda client-side pendiente)"}`);
  return rowGate([FILE]) ? "APLICADO" : "REVERTIDO";
}

// ── E. Auditoría de campo ──────────────────────────────────────────────────

function diffRow(label: string, fe: { file: string; fields: string[] } | null, be: { file: string; fields: string[] } | null, c3h: string[]): void {
  log(`  ▸ ${label}`);
  if (!fe || !be) {
    log(`      ✗ no extraíble — frontend:${fe ? "✓" : "✗"} · backend:${be ? "✓" : "✗"}`);
    return;
  }
  const beSet = new Set(be.fields);
  const feSnakes = new Set(fe.fields.map(snake));
  const onlyFe = fe.fields.filter(x => !beSet.has(x));
  const onlyBe = be.fields.filter(x => !feSnakes.has(x));
  const pairs = onlyFe.filter(x => onlyBe.includes(snake(x)));
  if (fe.fields.length) log(`      fe(${fe.fields.length}): ${fe.fields.join(", ")}`);
  if (be.fields.length) log(`      be(${be.fields.length}): ${be.fields.join(", ")}`);
  if (pairs.length) {
    log(`      ⚠ MISMATCH confirmado → reescribir en frontend: ${pairs.join(", ")} ⇒ ${pairs.map(snake).join(", ")}`);
    c3h.push(`${label}: ${pairs.join(", ")} ⇒ ${pairs.map(snake).join(", ")}`);
  } else if (onlyFe.length || onlyBe.length) {
    log(`      · solo-fe: ${onlyFe.join(", ") || "—"} · solo-be: ${onlyBe.join(", ") || "—"}`);
  } else {
    log("      ✓ campos idénticos");
  }
}

function audits(c3hNew: string[]): void {
  log("══ E. Auditoría de campo — frontend ↔ backend ═══════════════════════════");
  const alias = pyGrep(/alias_generator|to_camel|populate_by_name/);
  log(`  config de alias camelCase en backend: ${alias.length ? "⚠ PRESENTE — los model_dump serían camelCase" : "no (pydantic snake_case por defecto)"}`);
  alias.slice(0, 4).forEach(l => log("      " + l));

  const logModel = returnTypeOf(/async def list_logs\b/);
  diffRow(`HistoryItem ↔ ${logModel ?? "?"}`, tsInterfaceFields("frontend/src/features/communications/types.ts", "HistoryItem"), logModel ? pyModelFields(logModel) : null, c3hNew);

  const resModel = returnTypeOf(/async def list_reservations\b/);
  diffRow(`FacilityReservation (local ReservationCalendar) ↔ ${resModel ?? "?"}`, tsInterfaceFields("frontend/src/features/facilities/components/ReservationCalendar.tsx", "FacilityReservation"), resModel ? pyModelFields(resModel) : null, c3hNew);
  diffRow(`Reservation (facilities/types) ↔ ${resModel ?? "?"}`, tsInterfaceFields("frontend/src/features/facilities/types.ts", "Reservation"), resModel ? pyModelFields(resModel) : null, c3hNew);

  const facModel = returnTypeOf(/async def list_facilities\b/);
  diffRow(`Facility ↔ ${facModel ?? "?"}`, tsInterfaceFields("frontend/src/features/facilities/types.ts", "Facility"), facModel ? pyModelFields(facModel) : null, c3hNew);

  const trModel = returnTypeOf(/async def list_trial_memberships\b/);
  diffRow(`TrialMembership (guests/types) ↔ ${trModel ?? "?"}`, tsInterfaceFields("frontend/src/features/guests/types.ts", "TrialMembership"), trModel ? pyModelFields(trModel) : null, c3hNew);

  const cmpModel = returnTypeOf(/async def list_campaigns\b/);
  diffRow(`ReactivationCampaign ↔ ${cmpModel ?? "?"}`, tsInterfaceFields("frontend/src/features/engagement/types.ts", "ReactivationCampaign"), cmpModel ? pyModelFields(cmpModel) : null, c3hNew);

  const famModel = returnTypeOf(/async def (?:search_families|family_search|list_families)\b/);
  if (famModel) {
    diffRow(`Family (families/types) ↔ ${famModel}`, tsInterfaceFields("frontend/src/features/families/types.ts", "Family"), pyModelFields(famModel), c3hNew);
  } else {
    log("  ▸ Family ↔ ? — modelo no resuelto; región de family_search:");
    pyRegion(/async def family_search\b/, 0, 35).slice(0, 25).forEach(l => log("      " + l));
  }
  log("  ▸ usePreferencesForm — bloque history (evidencia post-g3):");
  tsRegion("frontend/src/features/communications/hooks/usePreferencesForm.ts", /get_notification_history/, 3, 8).slice(0, 14).forEach(l => log("      " + l));
}

// ── F. Nueva deuda ─────────────────────────────────────────────────────────

function newDebt(): void {
  log("══ F. Nueva deuda — pares (agente, tool) viejos en archivos tocados ═════");
  const files = [
    "frontend/src/features/engagement/ReactivationCampaigns.tsx",
    "frontend/src/features/guests/GuestList.tsx",
    "frontend/src/features/guests/GuestRegistration.tsx",
  ];
  const seen = new Set<string>();
  let found = 0;
  for (const f of files) {
    const s = read(f);
    if (!s) continue;
    for (const m of s.matchAll(/"(guests|engagement|families|facilities|reports|finance|communication|wellness)",(\s*\n\s+)"([a-z_]+)",/g)) {
      const key = `${m[1]}.${m[3]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const toolOK = pyGrep(new RegExp(`name="${m[3]}"`)).length > 0;
      const agentHits = pyGrep(new RegExp(`"${m[1]}"`));
      const agentOK = agentHits.length > 0;
      if (toolOK && agentOK) continue;
      found++;
      log(`  ✗ ${key} — tool:${toolOK ? "✓" : "✗ no existe"} · agente:${agentOK ? "✓" : "✗ viejo"} (${(f.split("/").pop() as string)})`);
      agentHits.slice(0, 2).forEach(l => log(`        ? ${l}`));
    }
  }
  if (!found) log("  (ninguno — los tres archivos quedan sin pares viejos)");
}

// ── G. HITL ────────────────────────────────────────────────────────────────

function hitlEvidence(): void {
  log("══ G. HITL — ¿action=\"list\" pasa el gate? (evidencia) ══════════════════");
  const nonAgent = pyGrep(/[Aa]pprov|request_id/).filter(l => !l.split(":")[0].includes("/agents/"));
  if (!nonAgent.length) {
    log("  (sin lógica de approval/request_id fuera de agents/ — verificar despacho del server)");
    pyGrep(/ApprovalLevel\.HITL/).slice(0, 6).forEach(l => log("      " + l));
    return;
  }
  nonAgent.slice(0, 14).forEach(l => log("      " + l));
}

// ── H. Ledger ──────────────────────────────────────────────────────────────

function ledger(resolved: { r2: boolean; r9: boolean }): number {
  log("══ H. Cirugía del ledger VI14_EQUIVALENCES ══════════════════════════════");
  const LED = "scripts/p2c3e_vi14_patch.ts";
  const led = read(LED);
  if (!led) { log("  ✗ ledger no encontrado"); return 0; }
  let out = led;
  let n = 0;
  const targets: Array<[string, boolean]> = [["list_reactivation_campaigns", resolved.r2], ["list_trial_memberships", resolved.r9]];
  for (const [t, ok] of targets) {
    if (!ok) { log(`  · ${t}: fila no aplicada — la entrada queda`); continue; }
    const lines = out.split("\n");
    const idx = lines.findIndex(l => l.includes(t));
    if (idx === -1) { log(`  · ${t}: no presente en el ledger`); continue; }
    const tr = lines[idx].trim();
    const complete = (/^["'\[{]/.test(tr) || /^\/\//.test(tr)) && /[,\]}"']$/.test(tr);
    if (complete) {
      lines.splice(idx, 1);
      n++;
      log(`  ✂ ${t} — línea ${idx + 1} eliminada: ${tr}`);
    } else {
      log(`  ⚠ ${t} — entrada multilínea (línea ${idx + 1}) — cirugía MANUAL: ${tr}`);
    }
    out = lines.join("\n");
  }
  if (n > 0) writeFile(LED, out);
  return n;
}

// ── main ───────────────────────────────────────────────────────────────────

function main(): void {
  if (!fs.existsSync(F("frontend")) || !fs.existsSync(F("backend"))) {
    throw new Error("ejecutar desde la raíz del repo (se esperan frontend/ y backend/)");
  }
  log("P2-C3g · g5-patch2 — des-bloqueo #2/#9 + cirugía de campo de los aplicados");
  log("  filas: 2 renombres+adaptador · 2 campo · 6 auditorías · ledger · gates tsc por fila");
  log("");
  log("══ A. Fila #2 — campaigns ═══════════════════════════════════════════════");
  const r2 = row2();
  log("");
  log("══ B. Fila #9 — trials ═════════════════════════════════════════════════");
  const r9 = row9();
  log("");
  log("══ C. Campo — WellnessFamilySelector (C16) ═════════════════════════════");
  const c16 = rowC16();
  log("");
  log("══ D. Campo — FacilityMap filtros (D5) ═════════════════════════════════");
  const d5 = rowD5();
  const c3hNew: string[] = [];
  log("");
  audits(c3hNew);
  log("");
  newDebt();
  log("");
  hitlEvidence();
  log("");
  const nLed = ledger({ r2: r2.resolved, r9: r9.resolved });
  log("");
  log("══ I. End-state ════════════════════════════════════════════════════════");
  log(`  #2 ${r2.status} · #9 ${r9.status} · C16 ${c16} · D5 ${d5}`);
  log(`  equivalente:  17 → ${17 - nLed}   (${nLed} resueltas por renombre+adaptador)`);
  log("  toolBackend:  169    (sin cambio — este parche no agrega tools)");
  log("  missingBoth:  3      (sin cambio)");
  log(`  colaC3h:      4 + ${c3hNew.length} nuevas por mismatch de campo:`);
  c3hNew.forEach(x => log(`      - ${x}`));
  log("  deuda backend: 6 filas (#3 #4 #8 #14 #15 #17) + las nuevas de la sección F");
  log("  dev-mock:     sin cambio (añadir fábricas sigue siendo opcional)");
  const all = [r2.status, r9.status, c16, d5];
  log(`  resumen corrida: aplicados ${all.filter(s => s === "APLICADO").length} · ya presentes ${all.filter(s => s === "YA").length} · demorados ${all.filter(s => s === "DEMORADO").length} · revertidos/saltados ${all.filter(s => s === "REVERTIDO" || s === "SKIP").length}`);
  try {
    log("  git diff --stat:");
    execSync("git diff --stat", { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean).forEach(l => log("    " + l));
  } catch { /* sin git o sin cambios */ }
  log("");
  log("✓ reporte: p2c3g_patch2_report.txt");
}

try {
  main();
} catch (e) {
  log(`✗ ERROR FATAL: ${(e as Error).message}`);
  log("  (revisar git diff — puede haber escrituras parciales)");
} finally {
  try { fs.writeFileSync(F("p2c3g_patch2_report.txt"), report.join("\n") + "\n"); } catch { /* noop */ }
}