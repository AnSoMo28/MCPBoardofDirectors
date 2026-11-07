/**
 * P2-C3g · g11-patch7 — C16: fix del punto de inserción (import multilínea)
 * Ejecutar desde la RAIZ del repo:  npx tsx scripts/p2c3g_patch7.ts
 *
 * Causa raíz g10: la última línea que EMPIEZA con import (l32) es el inicio de
 * un import MULTILÍNEA que cierra en l35 ("} from \"...\";"). El splice en
 * l32+1 insertó la interfaz DENTRO de las llaves → TS1005 en cascada (las
 * columnas de los errores coinciden 1:1 con los ";" de mis campos).
 *
 * Fix: insertar tras el FIN de la sentencia import (escaneo hasta línea que
 * termine en ";", máx 15 líneas) · fallback: fin de archivo (interfaces se
 * hoistean) · ventana de inserción impresa en el reporte · consumers sólo se
 * escriben si cambiaron · hasta 30 errores en el rollback.
 *
 * #9 ya aplicado (g8) — este patch NO lo toca.
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
const clean = (s: string): string => s.replace(/\r$/, "");

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

interface TscErr { file: string; line: number; code: string; msg: string; }
function parseTscErrors(out: string): TscErr[] {
  const errs: TscErr[] = [];
  for (const m of out.matchAll(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/gm)) {
    errs.push({ file: m[1].replaceAll("\\", "/").trim(), line: +m[2], code: m[3], msg: m[4] });
  }
  return errs;
}

function stripFamilyImport(src: string): { text: string; note: string } {
  const lines = src.split("\n");
  const usedIn: number[] = [];
  lines.forEach((t, i) => {
    const tr = clean(t).trim();
    if (tr.startsWith("//") || tr.startsWith("*") || tr.startsWith("/*")) return;
    if (/families\/types/.test(t)) return;
    if (/\bFamily\b/.test(t)) usedIn.push(i);
  });
  if (usedIn.length > 0) {
    return { text: src, note: `import conservado — Family sigue en línea(s) ${usedIn.map((i) => i + 1).join(",")}` };
  }
  const idxs: number[] = [];
  lines.forEach((t, i) => { if (/families\/types/.test(t) && /\bFamily\b/.test(t)) idxs.push(i); });
  if (idxs.length === 0) return { text: src, note: "sin import de Family" };
  if (idxs.length > 1) return { text: src, note: "múltiples imports families/types — conservado" };
  const i = idxs[0];
  const tr = clean(lines[i]).trim();
  if (tr === 'import type { Family } from "@/features/families/types";') {
    lines.splice(i, 1);
    return { text: lines.join("\n"), note: "import Family eliminado" };
  }
  if (/import type \{ Family, /.test(tr)) {
    lines[i] = lines[i].replace(/\{ Family, /, "{ ");
    return { text: lines.join("\n"), note: "Family quitado del import" };
  }
  if (/import type \{ .*, Family \}/.test(tr)) {
    lines[i] = lines[i].replace(/, Family \}/, " }");
    return { text: lines.join("\n"), note: "Family quitado del import" };
  }
  return { text: src, note: "import de forma no reconocida — conservado" };
}

const SEL = path.join(FE, "src/features/wellness/components/WellnessFamilySelector.tsx");
const HOOK = path.join(FE, "src/features/wellness/hooks/useWellnessDashboard.ts");
const HOOK_REL = "src/features/wellness/hooks/useWellnessDashboard.ts";

say("P2-C3g · g11-patch7 — C16: inserción tras el fin de la sentencia import (fix g10)");
say("");

// ══════════════════════════════════════════════════════════════
// A · Evidencia (read-only — queda en el reporte gane o pierda)
// ══════════════════════════════════════════════════════════════
say("══ A. Evidencia — selectedFamily / Family / imports en la cadena ══");
const feFiles = walk(path.join(FE, "src"), [".ts", ".tsx"]);
const consumers: string[] = [];
for (const f of feFiles) {
  if (f === SEL || f === HOOK) continue;
  try { if (/\bselectedFamily\b/.test(read(f))) consumers.push(f); } catch { /* noop */ }
}
if (fs.existsSync(HOOK)) {
  const hl = read(HOOK).split("\n");
  say(`  ── ${HOOK_REL} (${hl.length} líneas) · selectedFamily|Family|familyName|memberCount|engagementScore ──`);
  hl.forEach((t, i) => {
    if (/selectedFamily|setSelectedFamily|\bFamily\b|familyName|\.memberCount\b|\.engagementScore\b/.test(t)) {
      say(`    ${String(i + 1).padStart(4)}│ ${clean(t)}`);
    }
  });
  say("  ── useState con Family ──");
  hl.forEach((t, i) => { if (/useState[^\n]*\bFamily\b/.test(t)) say(`    ${String(i + 1).padStart(4)}│ ${clean(t)}`); });
  say("  ── imports families/types ──");
  hl.forEach((t, i) => { if (/families\/types/.test(t)) say(`    ${String(i + 1).padStart(4)}│ ${clean(t)}`); });
  say("  ── fin del bloque de imports (l30-38) ──");
  for (let i = 29; i < Math.min(hl.length, 38); i++) say(`    ${String(i + 1).padStart(4)}│ ${clean(hl[i])}`);
} else {
  say(`  ✗ no encuentro ${HOOK_REL}`);
}
say(`  ── otros archivos con selectedFamily: ${consumers.length} (los homónimos locales no cambian) ──`);
for (const f of consumers.slice(0, 8)) say(`    ${rel(f)}`);
say("");

// ══════════════════════════════════════════════════════════════
// B · Fila C16 — cadena completa con inserción corregida
// ══════════════════════════════════════════════════════════════
say("══ B. Fila C16 — cadena selector + hook + consumidores ══");
let c16Applied = false;
const touched: { file: string; backup: string }[] = [];

if (!fs.existsSync(SEL) || !fs.existsSync(HOOK)) {
  say("  C16 DEMORADO — faltan selector o hook");
} else {
  const selOrig = read(SEL);
  const importLine = 'import type { Family, FamilyListResponse } from "@/features/families/types";';
  const selOk =
    selOrig.includes(importLine) &&
    countOf(selOrig, /\.familyName\b/g) === 3 &&
    countOf(selOrig, /\.memberCount\b/g) === 2 &&
    countOf(selOrig, /\bFamily\b/g) === 3;
  if (!selOk) {
    say("  C16 DEMORADO — anclas del selector no coinciden (g7/E1)");
  } else {
    const crlfS = selOrig.includes("\r\n");
    const NS = (s: string): string => (crlfS ? s.replace(/\n/g, "\r\n") : s);
    const selIface = NS([
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
    const selNext = selOrig
      .replace(NS(importLine), selIface)
      .replace(NS("onSelect: (family: Family) => void;"), NS("onSelect: (family: WellnessFamilyItem) => void;"))
      .replace(NS("useMCPQuery<FamilyListResponse>"), NS("useMCPQuery<WellnessFamilyListResponse>"))
      .replace(/\.familyName\b/g, ".name")
      .replace(/\.memberCount\b/g, ".member_count");

    const rFam = countOf(selNext, /\bFamily\b/g);
    const rFN = countOf(selNext, /familyName/g);
    const rMC = countOf(selNext, /memberCount/g);
    if (rFam !== 1 || rFN !== 0 || rMC !== 0) {
      say(`  C16 DEMORADO — residuo selector: Family=${rFam}(esp 1) · familyName=${rFN}(esp 0) · memberCount=${rMC}(esp 0)`);
    } else {
      const hookOrig = read(HOOK);
      const hl = hookOrig.split("\n");
      const paramIdxs = hl.map((t, i) => (/const handleFamilySelect = useCallback\(\(family: Family\) =>/.test(t) ? i : -1)).filter((i) => i >= 0);
      const setIdxs = hl.map((t, i) => (/setSelectedFamily\(family\);/.test(t) ? i : -1)).filter((i) => i >= 0);
      const usIdxs = hl.map((t, i) => (/useState[^\n]*\bFamily\b/.test(t) ? i : -1)).filter((i) => i >= 0);
      let lastImportIdx = -1;
      hl.forEach((t, i) => { if (/^\s*import\b/.test(t)) lastImportIdx = i; });
      say(`  guards hook: param=${paramIdxs.length}/1 · setSelected(family)=${setIdxs.length}/1 · useState-Family=${usIdxs.length}/1 · última import=l${lastImportIdx + 1}`);

      if (paramIdxs.length !== 1 || setIdxs.length !== 1 || usIdxs.length !== 1 || lastImportIdx < 0) {
        say("  C16 DEMORADO — guards del hook no cuadran (evidencia en sección A)");
      } else {
        // ── FIX g10: fin de la SENTENCIA import (puede ser multilínea) ──
        let endImp = -1;
        if (/;\s*$/.test(clean(hl[lastImportIdx]))) {
          endImp = lastImportIdx;
        } else {
          for (let k = lastImportIdx + 1; k < Math.min(hl.length, lastImportIdx + 16); k++) {
            const t = clean(hl[k]);
            if (/;\s*$/.test(t)) { endImp = k; break; }
            if (!/^[\sA-Za-z0-9_$,"'{}*]/.test(t)) break;
          }
        }
        const insertAt = endImp >= 0 ? endImp + 1 : hl.length;
        say(`  · inserción: ${endImp >= 0
          ? `tras l${endImp + 1} (fin de sentencia import${endImp !== lastImportIdx ? " MULTILÍNEA — caso g10" : ""})`
          : "al final del archivo (fallback — interfaces se hoistean)"}`);

        const crlfH = hookOrig.includes("\r\n");
        const NL = (s: string): string => (crlfH ? s + "\r" : s);
        const nl = [...hl];
        const iface: string[] = [
          "",
          "/**",
          " * P2-C3g C16 — shape real de family_search: FamilyBrief",
          " * (backend/src/club_mcp/models/family.py · 7 campos snake_case).",
          " * Deuda C3h: unificar con el Family compartido (14 camelCase).",
          " */",
          "interface SelectedFamily {",
          "  id: string;",
          "  name: string;",
          "  tier: string;",
          "  status: string;",
          "  member_count: number;",
          "  engagement_score: number;",
          "  join_date: string;",
          "}",
        ].map(NL);
        nl.splice(insertAt, 0, ...iface);
        const shiftFor = (idx: number): number => (idx >= insertAt ? iface.length : 0);

        const pi = paramIdxs[0] + shiftFor(paramIdxs[0]);
        nl[pi] = nl[pi].replace("(family: Family)", "(family: SelectedFamily)");
        const ui = usIdxs[0] + shiftFor(usIdxs[0]);
        const usBefore = nl[ui];
        nl[ui] = nl[ui].replace(/\bFamily\b/g, "SelectedFamily");

        const ren = (src: string): string => src
          .replace(/(selectedFamily\??)\.familyName\b/g, "$1.name")
          .replace(/(selectedFamily\??)\.memberCount\b/g, "$1.member_count")
          .replace(/(selectedFamily\??)\.engagementScore\b/g, "$1.engagement_score");

        const nFN = countOf(hookOrig, /selectedFamily\??\.familyName\b/g);
        const nMC = countOf(hookOrig, /selectedFamily\??\.memberCount\b/g);
        const nES = countOf(hookOrig, /selectedFamily\??\.engagementScore\b/g);
        let hookNext = ren(nl.join("\n"));
        const hookStrip = stripFamilyImport(hookNext);
        hookNext = hookStrip.text;

        // vista de la inserción (post-splice, pre-ren — índices ya con shift)
        say("  · ventana de inserción en el resultado:");
        for (let k = Math.max(0, insertAt - 2); k < Math.min(nl.length, insertAt + iface.length + 2); k++) {
          say(`      ${String(k + 1).padStart(4)}│ ${clean(nl[k])}`);
        }

        // consumers: sólo escribir si cambian
        const consChanged: { file: string; backup: string; next: string; note: string }[] = [];
        for (const f of consumers.slice(0, 8)) {
          const backup = read(f);
          const st = stripFamilyImport(ren(backup));
          if (st.text !== backup) consChanged.push({ file: f, backup, next: st.text, note: st.note });
        }

        write(SEL, selNext); touched.push({ file: SEL, backup: selOrig });
        write(HOOK, hookNext); touched.push({ file: HOOK, backup: hookOrig });
        for (const cp of consChanged) { write(cp.file, cp.next); touched.push({ file: cp.file, backup: cp.backup }); }

        say("  C16 REWRITE ✓ cadena completa:");
        say("    · selector: WellnessFamilyItem(7 snake) local · onSelect re-tipado");
        say(`    · hook: SelectedFamily top-level · useState: ${clean(usBefore).trim()}`);
        say(`      → ${clean(nl[ui]).trim()}`);
        say(`    · hook renames: familyName×${nFN}→.name · memberCount×${nMC} · engagementScore×${nES}`);
        say(`    · hook import: ${hookStrip.note}`);
        say(`    · consumers modificados: ${consChanged.length ? consChanged.map((c) => rel(c.file)).join(", ") : "— (homónimos locales sin patrón)"}`);
        say("    ↻ gate tsc …");
        const g = tscGate();
        if (g.ok) {
          c16Applied = true;
          say("  ✓ tsc OK — C16 APLICADA (selector + hook + consumers)");
        } else {
          say("  ✗ tsc FALLÓ — rollback total de la cadena:");
          parseTscErrors(g.out).slice(0, 30).forEach((e) => say(`      ${e.file}:${e.line} ${e.code} ${e.msg}`));
          for (const t of touched) write(t.file, t.backup);
          say("  ⤺ cadena revertida (sección A + errores arriba = evidencia para patch8)");
        }
      }
    }
  }
}
say("");

// ══════════════════════════════════════════════════════════════
// C · End-state
// ══════════════════════════════════════════════════════════════
say("══ C. End-state ══");
say(`  C16 ${c16Applied ? "APLICADO ✓" : "no aplicado"} · #9 APLICADO (g8)`);
if (c16Applied) {
  say("  → C3g-FRONTEND CERRADO — filas migradas/degradadas: #1 #2 #5 #6 #9 #10 #11 #16 + D5 + C16");
  say("  · deuda backend: #3 #4 #8 #14 #15 #17 · inventario D (9 llamadas viejas) → C3h");
  say("  · cola C3h campos: Reservation 9 renames · Family compartido 14↔7 · TrialList KPIs/paginación");
  say('  sugerido: git add -A && git commit -m "P2-C3g: migrar frontend a tools MCP reales (#1 #2 #5 #6 #9 #10 #11 #16, D5, C16)"');
}
const ledgerPath = path.join(ROOT, "scripts/p2c3e_vi14_patch.ts");
if (fs.existsSync(ledgerPath)) {
  const n = read(ledgerPath).split("\n").filter((l) => /^\s*"[\w.]+"\s*:\s*\[/.test(l)).length;
  say(`  · entradas key:[…] en ledger VI14: ${n}`);
}
say("  git diff --stat:");
let diff = "";
try { diff = execSync("git diff --stat", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString(); } catch { diff = ""; }
say(diff.split("\n").filter((l) => !l.startsWith("warning:")).join("\n").trim());

const reportPath = path.join(ROOT, "p2c3g_patch7_report.txt");
write(reportPath, REPORT.join("\n") + "\n");
console.log("");
console.log(`✓ reporte: ${rel(reportPath)}`);
