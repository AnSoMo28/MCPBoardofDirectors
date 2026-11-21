// ═══════════════════════════════════════════════════════════════════════════
// P2-C3g · g6-patch3 — cierre de C3g: #9, C16, auditoría con resolvers fijos
//
// Ejecutar DESDE LA RAÍZ del repo:
//     npx tsx scripts/p2c3g_patch3.ts
//
// A  #9   GuestList: guests.list_trial_memberships
//         → guest_management.manage_trial_memberships {action:"list"}
//         + adaptador client-side (paginación/total/active_count)
//         (v3: conteo ignorando comentarios // y validación por PROPIEDAD)
// B  C16  WellnessFamilySelector: ítems de family_search son snake_case →
//         interfaz local generada del modelo backend + rename camel→snake
//         (v3: resuelve el modelo del ÍTEM de FamilyListResponse.families)
// C  Auditoría de campo (v3: ventana de retorno 15 líneas, corta en def)
// D  Inventario de deuda (v3: agente = archivo agents/*_agent.py real)
// E  HITL: evidencia del motor — ¿action="list" pasa sin aprobación?
// F  Ledger VI14: cirugía de list_trial_memberships si #9 aplicó
//
// ATÓMICO POR FILA: si `tsc --noEmit` falla, SOLO esa fila se revierte.
// Sandbox: P2C3G3_NO_TSC=1 omite el gate (solo para pruebas del script).
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const F = (p: string) => path.join(ROOT, p);
const NO_TSC = process.env.P2C3G3_NO_TSC === "1";

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

// ── exploración backend ────────────────────────────────────────────────────

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

function pyGrep(pattern: RegExp, scope?: string): string[] {
  const out: string[] = [];
  for (const f of pyFiles()) {
    if (scope && !f.includes(scope)) continue;
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) out.push(`${f}:${i + 1}: ${lines[i].trim()}`);
    }
  }
  return out;
}

function pyRegion(pattern: RegExp, before: number, after: number, scope?: string): string[] {
  const out: string[] = [];
  for (const f of pyFiles()) {
    if (scope && !f.includes(scope)) continue;
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

interface PyModel { file: string; fields: string[]; annots: Record<string, string>; statusType: string }
function pyModelFields(className: string): PyModel | null {
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    const idx = lines.findIndex(l => new RegExp(`^class ${className}\\b`).test(l));
    if (idx === -1) continue;
    const fields: string[] = [];
    const annots: Record<string, string> = {};
    let statusType = "";
    for (let i = idx + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break;
      const fm = lines[i].match(/^\s{4}([a-z_][a-z0-9_]*)\s*:\s*(.+?)\s*(?:=.*)?$/);
      if (fm && fm[1] !== "model_config") {
        fields.push(fm[1]);
        annots[fm[1]] = fm[2];
        if (fm[1] === "status") statusType = fm[2];
      }
    }
    return { file: f, fields, annots, statusType };
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
      const m = lines[i].match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*"([^"]+)"/);
      if (m) vals.push(m[1]);
    }
    return vals.length ? vals : null;
  }
  return null;
}

// v3: ventana de 15 líneas, corta en el siguiente `def` — firmas multilínea OK
function returnTypeOf(defPattern: RegExp): string | null {
  for (const f of pyFiles()) {
    const src = read(f);
    if (!src) continue;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!defPattern.test(lines[i])) continue;
      const window: string[] = [];
      for (let j = i; j < Math.min(lines.length, i + 15); j++) {
        if (j > i && /^\s*(async\s+)?def\s/.test(lines[j])) break;
        window.push(lines[j]);
      }
      const m = window.join(" ").match(/->\s*(?:list\[|Sequence\[|Iterable\[|Optional\[)?([A-Z]\w+)/);
      if (m && !["Dict", "Any"].includes(m[1])) return m[1];
    }
  }
  return null;
}

function statusValuesOf(statusType: string): string[] {
  if (!statusType) return [];
  const lit = [...statusType.matchAll(/"([^"]+)"/g)].map(x => x[1]);
  if (lit.length) return lit;
  const en = statusType.match(/\b([A-Z][A-Za-z0-9_]*)\b/);
  return en ? (pyEnumValues(en[1]) ?? []) : [];
}

// ── exploración frontend ───────────────────────────────────────────────────

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

// v3: escaneo por profundidad de llaves — soporta interfaces multilínea Y de una línea
function tsInterfaceFields(file: string, name: string): { file: string; fields: string[] } | null {
  const src = read(file);
  if (!src) return null;
  const m = src.match(new RegExp(`(?:interface|type)\\s+${name}\\b`));
  if (!m || m.index === undefined) return null;
  let depth = 0, began = false, pdepth = 0;
  let ident = "", pendingSpace = false;
  const fields: string[] = [];
  const stop = Math.min(src.length, m.index + 4000);
  for (let i = m.index; i < stop; i++) {
    const ch = src[i];
    if (ch === "{") { depth++; began = true; continue; }
    if (ch === "}") { depth--; if (began && depth <= 0) break; continue; }
    if (ch === "(") { pdepth++; ident = ""; continue; }
    if (ch === ")") { pdepth--; continue; }
    if (!began || depth !== 1 || pdepth > 0) { ident = ""; pendingSpace = false; continue; }
    if (/[A-Za-z0-9_]/.test(ch)) {
      if (pendingSpace) { ident = ""; pendingSpace = false; }
      ident += ch;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { pendingSpace = true; continue; }
    if (ch === "?") { continue; } // a?: b — conserva el identificador para el ":" siguiente
    if (ch === ":") {
      if (ident && !["readonly", "type", "interface"].includes(ident)) fields.push(ident);
      ident = ""; pendingSpace = false;
      continue;
    }
    ident = ""; pendingSpace = false;
  }
  if (!began) return null;
  return { file, fields };
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
  if (NO_TSC) { log("    ↻ gate tsc OMITIDO (P2C3G3_NO_TSC=1)"); return true; }
  log("    ↻ gate tsc …");
  const t = tscGate();
  if (t.ok) { log("    ✓ tsc OK — fila confirmada"); return true; }
  log("    ✗ tsc FALLÓ — revirtiendo SOLO esta fila:");
  t.out.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 25).forEach(l => log("      " + l));
  restoreFiles(files);
  log("    ⤺ fila revertida (el resto de la corrida permanece)");
  return false;
}

// ── A. Fila #9 — trials (v3: ignorar comentarios; validar por propiedad) ───

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

  // v3: conteo solo en código — se descartan los comentarios //
  const code = src.split("\n").map(l => (l.match(/^\s*\/\//) ? "" : l.replace(/\/\/.*$/, ""))).join("\n");
  const uses = (code.match(/TrialListResponse/g) || []).length;
  if (uses !== 2) {
    log(`  #9 DEMORADO — TrialListResponse aparece ${uses} veces en CÓDIGO (esperado 2: import + query):`);
    tsRegion(FILE, /TrialListResponse/, 1, 1).slice(0, 12).forEach(l => log("      " + l));
    return { status: "DEMORADO", resolved: false };
  }

  const tsrc = read(TYPES);
  if (!tsrc || !/export (?:interface|type) TrialMembership\b/.test(tsrc)) {
    log("  #9 DEMORADO — TrialMembership no está exportado desde guests/types.ts");
    return { status: "DEMORADO", resolved: false };
  }
  // v3: bloque de import completo (multilínea) — ¿ya importa TrialMembership?
  const importBlock = src.match(/import\s*\{[^}]*\}\s*from\s*["']\.\/types["']/s);
  const alreadyImportsTM = importBlock ? /\bTrialMembership\b/.test(importBlock[0]) : false;

  // v3: validación por PROPIEDAD de trialsQ (no por línea completa)
  const propUses = new Set<string>();
  for (const pm of src.matchAll(/\btrialsQ\.(?:data\??\.)?([A-Za-z_][A-Za-z0-9_]*)/g)) propUses.add(pm[1]);
  const allowed = new Set(["data", "trials", "total", "active_count",
    "isLoading", "isFetching", "isPending", "isError", "error", "refetch",
    "status", "isPlaceholderData", "failureCount", "isStale"]);
  const badProps = [...propUses].filter(p => !allowed.has(p));
  if (badProps.length) {
    log(`  #9 DEMORADO — propiedades de trialsQ no mapeadas: ${badProps.join(", ")}`);
    badProps.forEach(p => {
      tsRegion(FILE, new RegExp(`trialsQ\\.(?:data\\?\\.)?${p}\\b`), 0, 1).slice(0, 3).forEach(l => log("      " + l));
    });
    return { status: "DEMORADO", resolved: false };
  }

  const nTrials = (src.match(/trialsQ\.data\??\.trials\b/g) || []).length;
  const nTotal = (src.match(/trialsQ\.data\??\.total\b/g) || []).length;
  const nActive = (src.match(/trialsQ\.data\??\.active_count\b/g) || []).length;

  const beModel = returnTypeOf(/async def list_trial_memberships\b/);
  const beStatus = beModel ? statusValuesOf(pyModelFields(beModel)?.statusType ?? "") : [];
  log(`      backend list_trial_memberships → ${beModel ?? "?"}${beStatus.length ? " · status [" + beStatus.join(", ") + "]" : ""}`);
  const act = beStatus.find(v => /^(active|activa|ongoing|en_curso|vigente)$/i.test(v));
  let activeExpr = "0";
  if (act) activeExpr = `trialAll.filter((t) => t.status === "${act}").length`;
  else log(`      ⚠ status activo no confirmado — active_count → 0 (ajustar en C3h)`);

  let out = src.replace(
    anchor,
    `useMCPQuery<TrialListBackendResponse>(\n${IND}"guest_management",\n${IND}"manage_trial_memberships",\n${IND}{ action: "list" },`
  );
  const iface =
    "  // P2-C3g #9 — shape real de guest_management.manage_trial_memberships(action:\"list\")\n" +
    "  interface TrialListBackendResponse {\n" +
    "    readonly status: string;\n" +
    "    readonly message: string;\n" +
    "    readonly trial_memberships: readonly TrialMembership[];\n" +
    "  }\n\n";
  out = out.replace("  const trialsQ = useMCPQuery<TrialListBackendResponse>(", iface + "  const trialsQ = useMCPQuery<TrialListBackendResponse>(");

  if (nTrials > 0 || nTotal > 0 || nActive > 0) {
    const qIdx = out.indexOf("const trialsQ = useMCPQuery<TrialListBackendResponse>");
    const cIdx = out.indexOf("\n  );", qIdx);
    if (qIdx === -1 || cIdx === -1) {
      log("  #9 DEMORADO — no se pudo ubicar el cierre del bloque trialsQ");
      return { status: "DEMORADO", resolved: false };
    }
    const lines = ["  const trialAll = trialsQ.data?.trial_memberships ?? [];"];
    if (nActive > 0) lines.push(`  const trialActiveCount = ${activeExpr};`);
    if (nTrials > 0) lines.push(`  const trialPageRows = trialAll.slice((trialPage - 1) * ${PAGE}, trialPage * ${PAGE});`);
    const adapter = "\n\n  // P2-C3g #9 — adaptador: el backend no pagina; slice y conteos client-side\n" + lines.join("\n");
    const at = cIdx + "\n  );".length;
    out = out.slice(0, at) + adapter + out.slice(at);
  }

  out = out
    .replace(/trialsQ\.data\?\.trials\b/g, "trialPageRows")
    .replace(/trialsQ\.data\.trials\b/g, "trialPageRows")
    .replace(/trialsQ\.data\?\.total\b/g, "trialAll.length")
    .replace(/trialsQ\.data\.total\b/g, "trialAll.length")
    .replace(/trialsQ\.data\?\.active_count\b/g, "trialActiveCount")
    .replace(/trialsQ\.data\.active_count\b/g, "trialActiveCount");

  if (!/  type TrialListResponse,/.test(out) && !alreadyImportsTM) {
    log("  #9 DEMORADO — no se encontró la línea de import 'type TrialListResponse,'");
    return { status: "DEMORADO", resolved: false };
  }
  out = alreadyImportsTM
    ? out.replace(/\s*type TrialListResponse,/, "")
    : out.replace("  type TrialListResponse,", "  type TrialMembership,");

  const residual = (out.match(/trialsQ\.data\??\.(trials|total|active_count)\b/g) || []).length;
  if (residual > 0) {
    log(`  #9 DEMORADO — ${residual} lecturas residuales sin mapear`);
    return { status: "DEMORADO", resolved: false };
  }

  writeFile(FILE, out);
  log(`  #9 REWRITE ✓ ${FILE}`);
  log('      guests.list_trial_memberships → guest_management.manage_trial_memberships {action:"list"}');
  log(`      adaptador client-side: trialAll · trialPageRows(page=${PAGE}) · lecturas: trials=${nTrials} total=${nTotal} active_count=${nActive}`);
  const ok = rowGate(files);
  return { status: ok ? "APLICADO" : "REVERTIDO", resolved: ok };
}

// ── B. C16 — wellness (v3: modelo del ÍTEM de la respuesta) ────────────────

function tsTypeOf(pyAnnot: string): string {
  const a = pyAnnot.replace(/^Optional\[(.*)\]$/, "$1").trim();
  if (/^(str|Text|EmailStr)$/.test(a)) return "string";
  if (/^(int|float|Decimal|conint|confloat)/.test(a)) return "number";
  if (/^bool$/.test(a)) return "boolean";
  if (/^(datetime|date|time|AnyDate)/.test(a)) return "string";
  if (/^list\[|^Sequence\[/.test(a)) return "Array<Record<string, unknown>>";
  if (/^dict\[/.test(a)) return "Record<string, unknown>";
  return "string";
}

function rowC16(): string {
  const FILE = "frontend/src/features/wellness/components/WellnessFamilySelector.tsx";
  const files = [FILE];
  const src = read(FILE);
  if (!src) { log("  C16 SKIP — archivo no encontrado"); return "SKIP"; }
  if (!src.includes('"family_search"')) { log("  C16 SKIP — sin family_search"); return "SKIP"; }
  if (!/\.familyName\b/.test(src)) { log("  C16 YA — sin lecturas .familyName"); return "YA"; }

  // 1) resolver el modelo del ítem: class FamilyListResponse → families: list[X]
  const envelope = pyModelFields("FamilyListResponse");
  let itemModel: PyModel | null = null;
  let itemVia = "";
  if (envelope && envelope.annots["families"]) {
    const im = envelope.annots["families"].match(/(?:list|Sequence|Iterable)\[\s*([A-Z]\w+)\s*\]/);
    if (im) { itemModel = pyModelFields(im[1]); itemVia = `FamilyListResponse.families → ${im[1]} (${envelope.file})`; }
  }
  if (!itemModel) {
    for (const cls of ["FamilySearchResult", "FamilySummary", "FamilyBrief"]) {
      const c = pyModelFields(cls);
      if (c) { itemModel = c; itemVia = `fallback ${cls} (${c.file})`; break; }
    }
  }
  if (!itemModel) {
    log("  C16 DEMORADO — no se resolvió el modelo del ítem de family_search:");
    log(`      envelope: ${envelope ? envelope.file + " → " + (envelope.annots["families"] ?? "sin campo families") : "FamilyListResponse no encontrada"}`);
    pyRegion(/async def family_search\b/, 0, 40).slice(0, 20).forEach(l => log("      " + l));
    return "DEMORADO";
  }
  log(`      ítem resuelto vía ${itemVia}`);
  log(`      campos backend (${itemModel.fields.length}): ${itemModel.fields.join(", ")}`);

  const target = itemModel.fields.includes("family_name") ? "family_name"
    : itemModel.fields.includes("name") ? "name" : null;
  if (!target) {
    log("  C16 DEMORADO — el ítem no tiene family_name ni name; renombres a mano según la lista de campos");
    return "DEMORADO";
  }

  // 2) interfaz local generada del modelo del ítem
  const alias = pyGrep(/alias_generator|to_camel/);
  if (alias.length) {
    log(`  C16 DEMORADO — backend con alias camelCase (${alias[0]}) — no renombrar`);
    return "DEMORADO";
  }
  let name = "WellnessFamilyItem";
  while (src.includes(name)) name = "W" + name;
  const ifaceLines = itemModel.fields.map(f => `  ${f}: ${tsTypeOf(itemModel!.annots[f] ?? "str")};`);
  const localTypes =
    `// P2-C3g C16 — shape real del ítem de family_profile.family_search (snake_case)\n` +
    `interface ${name} {\n${ifaceLines.join("\n")}\n}\n\n` +
    `interface WellnessFamilyListResponse {\n  readonly families: readonly ${name}[];\n}\n\n`;
  const insertAt = src.search(/^interface Props\b/m);
  if (insertAt === -1) {
    log("  C16 DEMORADO — no se encontró 'interface Props' para insertar los tipos locales");
    return "DEMORADO";
  }

  let out = src.slice(0, insertAt) + localTypes + src.slice(insertAt);

  // 3) rename camel→snake SOLO de propiedades con respaldo en el modelo del ítem
  const beSet = new Set(itemModel.fields);
  const renames = new Map<string, string>();
  for (const rm of out.matchAll(/\.([a-z][a-zA-Z0-9]*)\b/g)) {
    const prop = rm[1];
    if (!/[A-Z]/.test(prop)) continue;
    const sn = snake(prop);
    if (beSet.has(sn) && prop !== sn) renames.set(prop, sn);
  }
  if (renames.size) {
    for (const [from, to] of renames) out = out.replace(new RegExp(`\\.${from}\\b`, "g"), `.${to}`);
    log(`      renames camel→snake: ${[...renames.entries()].map(([a, b]) => `${a}→${b}`).join(", ")}`);
  }

  // 4) swap del tipo genérico + cirugía del import
  out = out.replace(/useMCPQuery<\s*FamilyListResponse\s*>/, "useMCPQuery<WellnessFamilyListResponse>");
  const importRe = /(import\s+(?:type\s+)?\{)([^}]*)(\}\s*from\s*"[^"]*families\/types")/;
  const im = out.match(importRe);
  if (im) {
    const syms = im[2].split(",").map(s => s.trim()).filter(s => s && s !== "FamilyListResponse" && s !== "Family");
    out = syms.length
      ? out.replace(importRe, `$1 ${syms.join(", ")} $3`)
      : out.replace(new RegExp(importRe.source + "\\s*;?\\s*\\n?"), "");
    log(`      import families/types: ${syms.length ? "conserva " + syms.join(", ") : "línea eliminada"}`);
  } else {
    log("      ⚠ import de FamilyListResponse no hallado — si se importa de otro lado, ajustar a mano");
  }

  writeFile(FILE, out);
  log(`  C16 REWRITE ✓ ${FILE} — .familyName→.${target} + interfaz local ${name} (${itemModel.fields.length} campos)`);
  return rowGate(files) ? "APLICADO" : "REVERTIDO";
}

// ── C. Auditoría de campo (ventana 15 líneas) ──────────────────────────────

function diffRow(label: string, fe: { file: string; fields: string[] } | null, be: PyModel | null, c3h: string[]): void {
  log(`  ▸ ${label}`);
  if (!fe || !be) {
    log(`      ✗ no extraíble — frontend:${fe ? "✓" : "✗"} · backend:${be ? "✓ " + be.file : "✗"}`);
    return;
  }
  const beSet = new Set(be.fields);
  const feSnakes = new Set(fe.fields.map(snake));
  // v3: mismatch = campo fe camelCase cuya snake_case SÍ existe en backend
  const mismatches = fe.fields.filter(x => !beSet.has(x) && beSet.has(snake(x)));
  const absent = fe.fields.filter(x => !beSet.has(x) && !beSet.has(snake(x)));
  const onlyBe = be.fields.filter(x => !feSnakes.has(x));
  if (mismatches.length) {
    log(`      ⚠ MISMATCH camel→snake → cola C3h: ${mismatches.map(x => `${x}⇒${snake(x)}`).join(", ")}`);
    c3h.push(`${label}: ${mismatches.map(x => `${x}⇒${snake(x)}`).join(", ")}`);
  }
  log(`      · fe(${fe.fields.length}) be(${be.fields.length}) · fe-sin-par-backend: ${absent.join(", ") || "—"} · solo-be: ${onlyBe.join(", ") || "—"}`);
}

function audits(c3hNew: string[]): void {
  log("══ C. Auditoría de campo — frontend ↔ backend ═══════════════════════════");
  const alias = pyGrep(/alias_generator|to_camel/);
  log(`  alias camelCase en backend: ${alias.length ? "⚠ PRESENTE" : "no"}`);

  const logModel = returnTypeOf(/async def list_logs\b/);
  diffRow(`HistoryItem ↔ ${logModel ?? "?"}`,
    tsInterfaceFields("frontend/src/features/communications/types.ts", "HistoryItem"),
    logModel ? pyModelFields(logModel) : null, c3hNew);

  const resModel = returnTypeOf(/async def list_reservations\b/);
  diffRow(`FacilityReservation ↔ ${resModel ?? "?"}`,
    tsInterfaceFields("frontend/src/features/facilities/types.ts", "FacilityReservation")
      ?? tsInterfaceFields("frontend/src/features/facilities/components/ReservationCalendar.tsx", "FacilityReservation"),
    resModel ? pyModelFields(resModel) : null, c3hNew);
  diffRow(`Reservation (facilities/types) ↔ ${resModel ?? "?"}`,
    tsInterfaceFields("frontend/src/features/facilities/types.ts", "Reservation"),
    resModel ? pyModelFields(resModel) : null, c3hNew);

  const facModel = returnTypeOf(/async def list_facilities\b/);
  diffRow(`Facility ↔ ${facModel ?? "?"}`,
    tsInterfaceFields("frontend/src/features/facilities/types.ts", "Facility"),
    facModel ? pyModelFields(facModel) : null, c3hNew);

  const trModel = returnTypeOf(/async def list_trial_memberships\b/);
  diffRow(`TrialMembership (guests/types) ↔ ${trModel ?? "?"}`,
    tsInterfaceFields("frontend/src/features/guests/types.ts", "TrialMembership"),
    trModel ? pyModelFields(trModel) : null, c3hNew);

  const cmpModel = returnTypeOf(/async def list_campaigns\b/);
  diffRow(`ReactivationCampaign ↔ ${cmpModel ?? "?"}`,
    tsInterfaceFields("frontend/src/features/engagement/types.ts", "ReactivationCampaign"),
    cmpModel ? pyModelFields(cmpModel) : null, c3hNew);

  const env = pyModelFields("FamilyListResponse");
  let famItem: PyModel | null = null;
  if (env && env.annots["families"]) {
    const im = env.annots["families"].match(/(?:list|Sequence)\[\s*([A-Z]\w+)\s*\]/);
    if (im) famItem = pyModelFields(im[1]);
  }
  diffRow(`Family (families/types) ↔ ${famItem?.file ?? "?"}`,
    tsInterfaceFields("frontend/src/features/families/types.ts", "Family"), famItem, c3hNew);
}

// ── D. Inventario de deuda (agente = archivo agents/*_agent.py) ────────────

function inventory(): void {
  log("══ D. Inventario de deuda — pares viejos en archivos tocados ════════════");
  const AGENT_FILE: Record<string, string> = {
    guests: "guest_management_agent.py",
    engagement: "member_engagement_agent.py",
    families: "family_profile_agent.py",
    facilities: "facility_management_agent.py",
    finance: "finance_agent.py",
    reports: "executive_reporting_agent.py",
    communication: "communication_agent.py",
    wellness: "wellness_agent.py",
  };
  const files = [
    "frontend/src/features/engagement/ReactivationCampaigns.tsx",
    "frontend/src/features/guests/GuestList.tsx",
    "frontend/src/features/guests/GuestRegistration.tsx",
  ];
  const agentFiles = pyFiles().filter(f => f.startsWith("backend/src/club_mcp/agents/") && f.endsWith("_agent.py"));
  const seen = new Set<string>();
  let debt = 0;
  for (const f of files) {
    const s = read(f);
    if (!s) continue;
    for (const m of s.matchAll(/"(guests|engagement|families|facilities|finance|reports|communication|wellness)",(\s*\n\s+)"([a-z_]+)",/g)) {
      const key = `${m[1]}.${m[3]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const toolHits = pyGrep(new RegExp(`name="${m[3]}"`), "/agents/");
      if (toolHits.length) continue;
      debt++;
      const mapped = AGENT_FILE[m[1]] ?? "?";
      const mappedPath = agentFiles.find(a => a.endsWith("/" + mapped));
      const cands = mappedPath
        ? (read(mappedPath) ?? "").match(/name="[a-z_]+"/g)?.slice(0, 12) ?? []
        : agentFiles.map(a => a.split("/").pop());
      log(`  ✗ ${key} (${(f.split("/").pop() as string)})`);
      log(`      agente mapeado → ${mapped} ${mappedPath ? "✓" : "(no existe — agentes: " + agentFiles.map(a => a.split("/").pop()).join(", ") + ")"}`);
      if (mappedPath) log(`      tools disponibles: ${cands.join(" ")}`);
    }
  }
  if (!debt) log("  (ningún par viejo sin tool)");
}

// ── E. HITL — ¿action="list" pasa el gate? ─────────────────────────────────

function hitlEvidence(): void {
  log("══ E. HITL — ¿action=\"list\" pasa sin aprobación? ══════════════════════");
  const eng = pyRegion(/class ApprovalEngine\b/, 0, 60);
  if (eng.length) {
    eng.slice(0, 40).forEach(l => log("      " + l));
  } else {
    log("  ✗ ApprovalEngine no encontrado — regiones con approval:");
    pyGrep(/ApprovalLevel\.HITL/, "/agents/").slice(0, 8).forEach(l => log("      " + l));
  }
  const enforce = pyGrep(/request_approval|ApprovalLevel\.(HITL|AUTO)/).filter(l => !l.includes("/agents/")).slice(0, 10);
  if (enforce.length) {
    log("  ── puntos de decisión (fuera de agents/) ──");
    enforce.forEach(l => log("      " + l));
  }
  const bypass = pyGrep(/action\s*===?\s*["'](list|read|get)["']|READ_ONLY|read_only|bypass|exempt|skip_approval/i);
  log(`  exención para lecturas: ${bypass.length ? "⚠ POSIBLE — líneas:" : "SIN EVIDENCIA"}`);
  bypass.slice(0, 6).forEach(l => log("      " + l));
  if (!bypass.length) {
    log("  → VEREDICTO: sin exención visible, design_reactivation_campaign{action:\"list\"} (#2)");
    log("    probablemente también requiere aprobación → la lista NO cargará en runtime.");
  }
  const autoList = pyGrep(/name="[a-z_]*(list|get|campaign)[a-z_]*"/, "member_engagement_agent.py");
  const hitlLines = pyGrep(/ApprovalLevel\.HITL/, "member_engagement_agent.py");
  log("  ── alternativas en member_engagement_agent ──");
  const ln = (s: string): number => parseInt(s.match(/:(\d+):/)?.[1] ?? "0", 10);
  autoList.slice(0, 8).forEach(l => {
    const near = hitlLines.some(h => Math.abs(ln(h) - ln(l)) < 6);
    log(`      ${l}${near ? "  ⚠ HITL cercano" : ""}`);
  });
}

// ── F. Ledger VI14 ─────────────────────────────────────────────────────────

function ledger(r9: boolean): number {
  log("══ F. Cirugía del ledger VI14_EQUIVALENCES ══════════════════════════════");
  const LED = "scripts/p2c3e_vi14_patch.ts";
  const led = read(LED);
  if (!led) { log("  ✗ ledger no encontrado"); return 0; }
  if (!r9) { log("  · list_trial_memberships: #9 no aplicado — la entrada queda"); return 0; }
  const lines = led.split("\n");
  const idx = lines.findIndex(l => l.includes("list_trial_memberships"));
  if (idx === -1) { log("  · list_trial_memberships: ya ausente (resuelta en corrida previa)"); return 1; }
  const tr = lines[idx].trim();
  const complete = (/^["'\[{]/.test(tr) || /^\/\//.test(tr)) && /[,\]}"']$/.test(tr);
  if (!complete) {
    log(`  ⚠ entrada multilínea (línea ${idx + 1}) — cirugía MANUAL: ${tr}`);
    return 0;
  }
  lines.splice(idx, 1);
  writeFile(LED, lines.join("\n"));
  log(`  ✂ list_trial_memberships — línea ${idx + 1} eliminada: ${tr}`);
  return 1;
}

// ── main ───────────────────────────────────────────────────────────────────

function main(): void {
  if (!fs.existsSync(F("frontend")) || !fs.existsSync(F("backend"))) {
    throw new Error("ejecutar desde la raíz del repo (se esperan frontend/ y backend/)");
  }
  log("P2-C3g · g6-patch3 — cierre de C3g: #9 + C16 + auditoría con resolvers fijos");
  log("  filas: #9 renombre+adaptador · C16 campo · 7 auditorías · inventario · HITL · ledger");
  log("");
  log("══ A. Fila #9 — trials ═════════════════════════════════════════════════");
  const r9 = row9();
  log("");
  log("══ B. Campo — WellnessFamilySelector (C16) ═════════════════════════════");
  const c16 = rowC16();
  const c3hNew: string[] = [];
  log("");
  audits(c3hNew);
  log("");
  inventory();
  log("");
  hitlEvidence();
  log("");
  const nLed = ledger(r9.resolved);
  log("");
  log("══ G. End-state ════════════════════════════════════════════════════════");
  log(`  #9 ${r9.status} · C16 ${c16}`);
  log(`  equivalente:  16 → ${16 - nLed}   (${nLed} resueltas)`);
  log("  toolBackend:  169    (sin cambio)");
  log("  missingBoth:  3      (sin cambio)");
  log(`  colaC3h:      4 + ${c3hNew.length} nuevas por mismatch de campo:`);
  c3hNew.forEach(x => log(`      - ${x}`));
  log("  deuda backend: 6 filas (#3 #4 #8 #14 #15 #17) + sección D");
  const all = [r9.status, c16];
  log(`  resumen corrida: aplicados ${all.filter(s => s === "APLICADO").length} · ya ${all.filter(s => s === "YA").length} · demorados ${all.filter(s => s === "DEMORADO").length} · revertidos/saltados ${all.filter(s => s === "REVERTIDO" || s === "SKIP").length}`);
  try {
    log("  git diff --stat:");
    execSync("git diff --stat", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\n").filter(Boolean).forEach(l => log("    " + l));
  } catch { /* sin git o sin cambios */ }
  log("");
  log("✓ reporte: p2c3g_patch3_report.txt");
}

try {
  main();
} catch (e) {
  log(`✗ ERROR FATAL: ${(e as Error).message}`);
  log("  (revisar git diff — puede haber escrituras parciales)");
} finally {
  try { fs.writeFileSync(F("p2c3g_patch3_report.txt"), report.join("\n") + "\n"); } catch { /* noop */ }
}