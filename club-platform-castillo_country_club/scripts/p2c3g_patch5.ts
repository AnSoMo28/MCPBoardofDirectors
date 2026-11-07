/**
 * P2-C3g · g9-patch5 — C16: guards corregidos + adaptación de consumidor
 * Ejecutar desde la RAIZ del repo:  npx tsx scripts/p2c3g_patch5.ts
 *
 * Causa del demorado de patch4: el guard contaba \bFamily\b === 2, pero hay 3
 * (cabecera línea 2, "Wellness Family Selector"). Residuo esperado tras edits: 1
 * (esa cabecera — es comentario, no afecta tsc).
 *
 * Riesgo conocido: WellnessDashboard.tsx hace onSelect={d.handleFamilySelect}
 * directo — si su parámetro es el Family compartido (14 camel requeridos), tsc
 * falla EN EL CONSUMIDOR. Pasada 2 adaptativa: re-tipo `: Family` →
 * `: Pick<Family, "id">` en ±12 líneas de cada handleFamilySelect (Pick
 * mantiene vivo el import; por contravarianza WellnessFamilyItem, que tiene
 * id, pasa a ser asignable). Gate 2 decide; si falla → rollback total.
 *
 * #9 ya está aplicado (g8) — este patch NO lo toca.
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

function printSlice(file: string, start1: number, count: number): string {
  const lines = read(file).split("\n");
  const s = Math.max(0, start1 - 1);
  const e = Math.min(lines.length, s + count);
  const out: string[] = [];
  for (let i = s; i < e; i++) out.push(`    ${String(i + 1).padStart(4)}│ ${lines[i]}`);
  return out.join("\n");
}

interface TscErr { file: string; line: number; code: string; msg: string; }
function parseTscErrors(out: string): TscErr[] {
  const errs: TscErr[] = [];
  for (const m of out.matchAll(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/gm)) {
    errs.push({ file: m[1].replaceAll("\\", "/").trim(), line: +m[2], code: m[3], msg: m[4] });
  }
  return errs;
}

say("P2-C3g · g9-patch5 — C16: guards corregidos (Family=3, residuo=1) + consumidor adaptativo");
say("");

// ══════════════════════════════════════════════════════════════
// A · Pre-flight — handleFamilySelect en todo frontend/src
//     (evidencia para el reporte aunque la fila aplique; y base
//      para patch6 quirúrgico si la pasada 2 falla)
// ══════════════════════════════════════════════════════════════
say("══ A. Pre-flight — handleFamilySelect en frontend/src ══");
const feFiles = walk(path.join(FE, "src"), [".ts", ".tsx"]);
const hfsHits: { file: string; line: number; text: string }[] = [];
for (const f of feFiles) {
  const lines = read(f).split("\n");
  lines.forEach((t, i) => { if (/handleFamilySelect/.test(t)) hfsHits.push({ file: f, line: i + 1, text: t }); });
}
if (hfsHits.length === 0) say("  · sin menciones (¿raro?) — el consumidor de patch4 las mostraba");
for (const h of hfsHits) say(`  ${rel(h.file)}:${h.line}│ ${h.text.trim()}`);
const hfsFiles = [...new Set(hfsHits.map((h) => h.file))];
for (const f of hfsFiles.slice(0, 4)) {
  const first = hfsHits.find((h) => h.file === f)!.line;
  say(`  ── ${rel(f)} · contexto (±16 alrededor de la línea ${first}) ──`);
  say(printSlice(f, Math.max(1, first - 15), 32));
}
say("");

// ══════════════════════════════════════════════════════════════
// B · Fila C16 — WellnessFamilySelector.tsx
// ══════════════════════════════════════════════════════════════
say("══ B. Fila C16 — WellnessFamilySelector.tsx ══");
const SEL = path.join(FE, "src/features/wellness/components/WellnessFamilySelector.tsx");
const SEL_REL = "src/features/wellness/components/WellnessFamilySelector.tsx";
let c16Applied = false;
const consumerFixes: { file: string; backup: string }[] = [];

if (!fs.existsSync(SEL)) {
  say(`  ✗ no encuentro ${rel(SEL)}`);
} else {
  const orig = read(SEL);
  const importLine = 'import type { Family, FamilyListResponse } from "@/features/families/types";';
  const nFName = countOf(orig, /\.familyName\b/g);
  const nMCount = countOf(orig, /\.memberCount\b/g);
  const nFam = countOf(orig, /\bFamily\b/g);
  say(`  anclas: import=${orig.includes(importLine)} · .familyName=${nFName}/3 · .memberCount=${nMCount}/2 · Family=${nFam}/3 (cabecera línea 2 incluida)`);
  if (!orig.includes(importLine) || nFName !== 3 || nMCount !== 2 || nFam !== 3) {
    say("  C16 DEMORADO — anclas no coinciden (¿el archivo cambió desde g7?)");
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
    const resFam = countOf(next, /\bFamily\b/g);
    const resFN = countOf(next, /familyName/g);
    const resMC = countOf(next, /memberCount/g);
    if (resFam !== 1 || resFN !== 0 || resMC !== 0) {
      say(`  C16 DEMORADO — residuo: Family=${resFam}(esp 1) · familyName=${resFN}(esp 0) · memberCount=${resMC}(esp 0)`);
    } else {
      write(SEL, next);
      say("  C16 REWRITE ✓ .familyName→.name(×3) · .memberCount→.member_count(×2) · import→interfaces locales");
      say("    WellnessFamilyItem(7 snake)/WellnessFamilyListResponse · onSelect re-tipado");
      say("    ↻ gate tsc (pasada 1) …");
      const g1 = tscGate();
      if (g1.ok) {
        c16Applied = true;
        say("  ✓ tsc OK — fila C16 APLICADA (solo el selector; el handler ya era compatible)");
      } else {
        const errs = parseTscErrors(g1.out);
        const selErrs = errs.filter((e) => e.file.endsWith(SEL_REL));
        const otherFiles = [...new Set(errs.filter((e) => !e.file.endsWith(SEL_REL)).map((e) => e.file))];
        say(`  ✗ tsc FALLÓ (pasada 1): ${errs.length} error(es) — en selector: ${selErrs.length} · otros archivos: ${otherFiles.length}`);
        errs.slice(0, 12).forEach((e) => say(`      ${e.file}:${e.line} ${e.code} ${e.msg}`));
        if (selErrs.length > 0 || otherFiles.length === 0) {
          write(SEL, orig);
          say("  ⤺ errores dentro del selector (o no parseables) — fila revertida");
        } else {
          // ── pasada 2 — fix adaptativo del consumidor ──
          // candidatos: archivos con error ∪ archivos que mencionan handleFamilySelect
          // (el error puede estar en el JSX de uso mientras la definición vive en el hook)
          say('  ↻ pasada 2 — re-tipo de consumidores: `: Family` → `: Pick<Family, "id">` (±12 líneas');
          say("    de cada handleFamilySelect — Pick mantiene vivo el import y, por contravarianza,");
          say("    WellnessFamilyItem (tiene id) pasa a ser asignable al parámetro)");
          const cands = [...new Set([
            ...otherFiles,
            ...hfsFiles.map((f) => path.relative(FE, f).replaceAll("\\", "/")),
          ])].filter((c) => c !== SEL_REL);
          let anyChanged = false;
          for (const c of cands.slice(0, 8)) {
            const f = path.join(FE, c);
            if (!fs.existsSync(f)) { say(`    ⚠ no existe ${c}`); continue; }
            const backup = read(f);
            const lines = backup.split("\n");
            const anchors = lines.map((t, i) => (/handleFamilySelect/.test(t) ? i : -1)).filter((i) => i >= 0);
            const changed: string[] = [];
            const touched = new Set<number>();
            const re = /([\w}\]]\s*:\s*)Family(?![\w\[])/;
            for (const a of anchors) {
              for (let i = Math.max(0, a - 12); i <= Math.min(lines.length - 1, a + 12); i++) {
                if (touched.has(i)) continue;
                if (re.test(lines[i])) {
                  const before = lines[i];
                  lines[i] = lines[i].replace(re, '$1Pick<Family, "id">');
                  if (lines[i] !== before) {
                    touched.add(i);
                    changed.push(`      ${i + 1}│ ${before.trim()}`);
                    changed.push(`        → ${lines[i].trim()}`);
                  }
                }
              }
            }
            if (changed.length) {
              write(f, lines.join("\n"));
              consumerFixes.push({ file: f, backup });
              anyChanged = true;
              say(`    ✎ ${rel(f)}:`);
              changed.forEach((l) => say(l));
            } else {
              say(`    · ${rel(f)}: sin patrón ': Family' cerca de handleFamilySelect`);
            }
          }
          if (!anyChanged) {
            write(SEL, orig);
            say("  ⤺ nada re-tipable — fila revertida (sección A del reporte = evidencia para patch6)");
          } else {
            say("    ↻ gate tsc (pasada 2) …");
            const g2 = tscGate();
            if (g2.ok) {
              c16Applied = true;
              say(`  ✓ tsc OK — fila C16 APLICADA (selector + ${consumerFixes.length} consumidor(es))`);
            } else {
              say("  ✗ tsc FALLÓ (pasada 2) — rollback total de la fila:");
              parseTscErrors(g2.out).slice(0, 12).forEach((e) => say(`      ${e.file}:${e.line} ${e.code} ${e.msg}`));
              write(SEL, orig);
              for (const cf of consumerFixes) write(cf.file, cf.backup);
              say("  ⤺ selector + consumidores revertidos (evidencia arriba + sección A para patch6)");
            }
          }
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
  say("  → C3g-FRONTEND CERRADO — filas frontend migradas o degradadas-documentadas:");
  say("    #1 #2 #5 #6 #9 #10 #11 #16 + D5 + C16");
  say("  · deuda backend C3g→C3h: #3 #4 #8 #14 #15 #17 + inventario D (9 llamadas viejas)");
  say("  · cola C3h (campos): Reservation 9 renames · Family 2 renames · TrialList KPIs/paginación");
}
const ledgerPath = path.join(ROOT, "scripts/p2c3e_vi14_patch.ts");
if (fs.existsSync(ledgerPath)) {
  const n = read(ledgerPath).split("\n").filter((l) => /^\s*"[\w.]+"\s*:\s*\[/.test(l)).length;
  say(`  · entradas key:[…] en el ledger VI14: ${n} (misma regex que patch4)`);
}
say("  git diff --stat:");
let diff = "";
try { diff = execSync("git diff --stat", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString(); } catch { diff = ""; }
say(diff.split("\n").filter((l) => !l.startsWith("warning:")).join("\n").trim());

const reportPath = path.join(ROOT, "p2c3g_patch5_report.txt");
write(reportPath, REPORT.join("\n") + "\n");
console.log("");
console.log(`✓ reporte: ${rel(reportPath)}`);
