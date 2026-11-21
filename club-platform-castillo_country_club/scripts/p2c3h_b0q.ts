// P2-C3h · b0q — diagnóstico §4: por qué "family_profile.__init__: ancla no encontrada"
// READ-ONLY sobre el repo salvo §E: conversión CRLF→LF de targets de patch(), SOLO cuando
// todos los fallos son CRLF (H1) y ninguno es deriva (H2/H3). Trackeados → git es el rollback.
// Uso desde la RAÍZ:   npx tsx scripts/p2c3h_b0q.ts
//   o con otro target: npx tsx scripts/p2c3h_b0q.ts scripts/otro.ts
// Reporte: p2c3h_b0q_report.txt — pegar el output COMPLETO en el chat.
//
// Contexto: b0p normalizó los separadores del guard §1 → el re-run pasó §1-§3 (7 archivos
// escritos) y abortó en §4: "family_profile.__init__: ancla no encontrada" (throw b0.ts:1313,
// llamada b0.ts:1357; §4 NO escribió nada — abortó antes de modificar). Hipótesis:
//   H1 · CRLF: Git-for-Windows con core.autocrlf=true chequea los .py con \r\n; las anclas
//          de b0.ts llevan \n puro → indexOf falla aunque el código esté intacto.
//   H2 · deriva real: family_profile.py de tu árbol difiere del estado que el ancla asume.
//   H3 · espacios: deriva menor de indentación/tabs.
// §D pre-testea TODAS las anclas de TODAS las patch() de b0.ts contra el disco → predicción
// completa del re-run (no descubrir los fallos de a uno por aborto).
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
const B0 = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, "scripts/p2c3h_b0.ts");
const R: string[] = [];
const say = (s = ""): void => { console.log(s); R.push(s); };
const rel = (p: string): string => path.relative(ROOT, p).replaceAll("\\", "/");
const read = (p: string): string => fs.readFileSync(p, "utf8");

const git = (...args: string[]): string => {
  try {
    const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
    return ((r.status === 0 ? r.stdout : r.stderr) ?? "").trim();
  } catch { return "(git no disponible)"; }
};
const gitOk = (...args: string[]): boolean => {
  try { return spawnSync("git", args, { cwd: ROOT, encoding: "utf8" }).status === 0; } catch { return false; }
};

// ── extracción de las llamadas patch(...) del target ──
type Call = { ln: number; endLn: number; label: string; anchor: string | null; kind: string; target: string | null; targetPath: string | null };

function unquote(a: string): string | null {
  const t = a.trim();
  const sr = t.match(/^String\.raw`([\s\S]*)`$/);
  if (sr) return sr[1];
  if (t.length >= 2 && t.startsWith("`") && t.endsWith("`")) return t.slice(1, -1);
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    try { return JSON.parse(t); } catch { return t.slice(1, -1); }
  }
  return null;
}

function parseCall(src: string, open: number): { args: string[]; end: number } | null {
  const args: string[] = [];
  let cur = "";
  let depth = 1;
  let i = open + 1;
  let q: "" | "'" | '"' | "`" = "";
  let tplBrace = 0;
  while (i < src.length) {
    const c = src[i];
    if (q) {
      const esc = q !== "`" && src[i - 1] === "\\";
      if (esc) { cur += c; i++; continue; }
      if (q === "`") {
        if (c === "$" && src[i + 1] === "{") { tplBrace++; cur += "${"; i += 2; continue; }
        if (c === "{" && tplBrace > 0) tplBrace++;
        if (c === "}" && tplBrace > 0) { tplBrace--; cur += c; i++; continue; }
        if (c === "`" && tplBrace === 0) { q = ""; cur += c; i++; continue; }
      } else if (c === q) { q = ""; }
      cur += c; i++; continue;
    }
    if (c === "'" || c === '"' || c === "`") { q = c; cur += c; i++; continue; }
    if (c === "(" || c === "[" || c === "{") { depth++; cur += c; i++; continue; }
    if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0) { args.push(cur); return { args, end: i }; }
      cur += c; i++; continue;
    }
    if (c === "," && depth === 1) { args.push(cur); cur = ""; i++; continue; }
    cur += c; i++;
  }
  return null;
}

const b0src = fs.existsSync(B0) ? read(B0) : "";
if (!b0src) { console.error(`✗ no existe o vacío: ${B0}`); process.exit(1); }
const blines = b0src.split("\n");

const calls: Call[] = [];
{
  let idx = b0src.indexOf("patch(");
  while (idx !== -1) {
    const before = b0src.slice(Math.max(0, idx - 30), idx);
    const isDef = /(function\s|const\s|let\s|=\s*)$/.test(before);
    const isMember = idx > 0 && /[\w$.]/.test(b0src[idx - 1]);
    if (!isDef && !isMember) {
      const parsed = parseCall(b0src, idx + 5);
      if (parsed) {
        const ln = b0src.slice(0, idx).split("\n").length;
        const endLn = b0src.slice(0, parsed.end).split("\n").length;
        let label = ""; let labelIdx = -1;
        parsed.args.forEach((a, k) => {
          const u = unquote(a);
          if (labelIdx === -1 && u !== null && !u.includes("\n") && !u.includes("/") && !/\.(py|ts|tsx|json|md)$/i.test(u)) {
            label = u; labelIdx = k;
          }
        });
        let target: string | null = null;
        for (const a of parsed.args) {
          const lits = [...a.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
          const cand = lits.filter((l) => /\.(py|ts|tsx|json|md)$/i.test(l));
          if (cand.length) target = cand[cand.length - 1];
        }
        let anchor: string | null = null; let kind = "dinámica";
        if (labelIdx !== -1 && parsed.args[labelIdx + 1] !== undefined) {
          const rawArg = parsed.args[labelIdx + 1];
          const u = unquote(rawArg);
          if (u !== null) {
            anchor = u;
            kind = rawArg.trim().startsWith("String.raw") ? "String.raw" : rawArg.trim().startsWith("`") ? "template" : "string";
          }
        }
        if (anchor === null) {
          for (const a of parsed.args) { const u = unquote(a); if (u !== null && u.includes("\n")) { anchor = u; kind = "multiline"; break; } }
        }
        let targetPath: string | null = null;
        if (target) {
          const t = target.startsWith("backend/") ? target.slice("backend/".length) : target;
          targetPath = t.startsWith("scripts/") ? path.join(ROOT, t) : path.join(BE, t);
        }
        calls.push({ ln, endLn, label: label || `call@l.${ln}`, anchor, kind, target, targetPath });
      }
    }
    idx = b0src.indexOf("patch(", idx + 6);
  }
}

// ── matching (cache de CONTENIDO por archivo; booleans frescos por ancla) ──
const fileCache = new Map<string, string>();
function contentOf(p: string): string | null {
  if (!fs.existsSync(p)) return null;
  if (!fileCache.has(p)) fileCache.set(p, read(p));
  return fileCache.get(p)!;
}
type M = { raw: boolean; crlf: boolean; ws: boolean };
function testA(anchor: string, file: string): M | null {
  const c = contentOf(file);
  if (c === null) return null;
  const flatA = anchor.replace(/\s+/g, " ");
  return {
    raw: c.includes(anchor),
    crlf: c.replaceAll("\r\n", "\n").includes(anchor),
    ws: c.replace(/\s+/g, " ").includes(flatA),
  };
}

say("P2-C3h · b0q — diagnóstico §4: ancla no encontrada en family_profile.__init__");
say("");
say(`  · target analizado: ${rel(B0)} (${blines.length} líneas)`);
say(`  · llamadas patch() encontradas: ${calls.length}`);
say("");

type Row = { call: Call; relT: string | null; m: M | null; verdict: string };
const rows: Row[] = calls.map((c) => {
  const relT = c.targetPath ? rel(c.targetPath) : null;
  const m = c.anchor && c.targetPath ? testA(c.anchor, c.targetPath) : null;
  const verdict = !c.anchor ? "dinámica" : !c.targetPath ? "sin target" : !m ? "sin archivo" : m.raw ? "OK" : m.crlf ? "CRLF" : m.ws ? "espacios" : "deriva";
  return { call: c, relT, m, verdict };
});

// ── §A · el paciente: el archivo de la llamada fallida ──
const failRow =
  rows.find((r) => r.call.label.includes("family_profile")) ||
  rows.find((r) => r.verdict === "CRLF" || r.verdict === "deriva" || r.verdict === "espacios") ||
  rows[0];
say("── §A · el paciente: " + (failRow?.relT ?? "target no extraíble") + " ──");
if (failRow?.call.targetPath && fs.existsSync(failRow.call.targetPath)) {
  const p = failRow.call.targetPath;
  const c = contentOf(p)!;
  const crlf = (c.match(/\r\n/g) || []).length;
  const lfAll = (c.match(/\n/g) || []).length;
  const crAll = (c.match(/\r/g) || []).length;
  const flines = c.split("\n");
  say(`  · existe ✓ · ${Buffer.byteLength(c, "utf8")} bytes · ${flines.length} líneas`);
  say(`  · finales de línea: CRLF=${crlf} · LF-lone=${lfAll - crlf} · CR-lone=${crAll - crlf} · BOM=${c.charCodeAt(0) === 0xfeff ? "SÍ" : "no"} · tabs=${(c.match(/\t/g) || []).length}`);
  say(`  · git ls-files --eol: ${git("ls-files", "--eol", "--", rel(p)) || "(no trackeado)"}`);
  const st = git("status", "--porcelain", "--", rel(p));
  say(`  · git status: ${st || "clean"}`);
  const ii = flines.findIndex((l) => l.includes("__init__"));
  if (ii !== -1) {
    const a = Math.max(0, ii - 2); const b = Math.min(flines.length, ii + 13);
    say(`  · región __init__ (l.${a + 1}–${b}, «CR» = \\r visible):`);
    flines.slice(a, b).forEach((l, k) => say(`      ${a + k + 1} │ ${l.replace(/\r$/, "«CR»")}`));
  } else {
    say("  · sin __init__ en el archivo (¿archivo equivocado?) — primeras 12 líneas:");
    flines.slice(0, 12).forEach((l, k) => say(`      ${k + 1} │ ${l.replace(/\r$/, "«CR»")}`));
  }
} else {
  say("  · no pude resolver el archivo de la llamada — ver §B.");
}
say("");

// ── §B · el instrumento: función patch() y la llamada fallida, tal cual en tu disco ──
say("── §B · función patch() y llamada fallida (autoridad: tu disco) ──");
const defIdx = blines.findIndex((l) => /^(function patch|const patch\s*=)/.test(l));
if (defIdx !== -1) {
  const b = Math.min(blines.length, defIdx + 34);
  say(`  · definición (l.${defIdx + 1}–${b}):`);
  blines.slice(defIdx, b).forEach((l, k) => say(`      ${defIdx + k + 1} │ ${l}`));
} else {
  say("  · no encontré la definición de patch() — el helper se llama distinto (pegar igual).");
}
if (failRow) {
  const c = failRow.call;
  const a = Math.max(0, c.ln - 3); const b = Math.min(blines.length, c.endLn + 3);
  say(`  · llamada ${c.label} (l.${c.ln}–${c.endLn}):`);
  blines.slice(a, b).forEach((l, k) => say(`      ${a + k + 1} │ ${l}`));
}
say("");

// ── §C · ¿por qué no matchea? ──
say("── §C · hipótesis sobre la llamada fallida ──");
if (failRow?.call.anchor && failRow.m) {
  const al = failRow.call.anchor.split("\n").filter((l) => l.trim() !== "").slice(0, 8);
  say(`  · ancla (${failRow.call.kind}, primeras líneas no vacías):`);
  al.forEach((l, k) => say(`      ${k + 1}│ ${l}`));
  say(`  · raw indexOf: ${failRow.m.raw ? "SÍ" : "NO"} · tras CRLF→LF del archivo: ${failRow.m.crlf ? "SÍ" : "NO"} · whitespace-colapsado: ${failRow.m.ws ? "SÍ" : "NO"}`);
  if (failRow.m.raw) say("  · causa = ??? el ancla YA está en crudo — el patch() estaría leyendo OTRO archivo (revisar §B)");
  else if (failRow.m.crlf) say("  · causa = CRLF (H1): el código está, los finales de línea no — fix mecánico en §E");
  else if (failRow.m.ws) say("  · causa = espacios (H3): mismo texto, distinta indentación — corregir ancla o archivo a mano");
  else say("  · causa = deriva real (H2): el archivo NO contiene el ancla — comparar región §A vs ancla");
} else {
  say("  · ancla no extraíble (dinámica) o target sin resolver — usar §A/§B a ojo.");
}
say("");

// ── §D · predicción del re-run: TODAS las anclas de TODAS las patch() ──
say("── §D · pre-test de todas las patch() (predicción del re-run §4) ──");
rows.forEach((r, i) => {
  const m = r.m ? `raw ${r.m.raw ? "SÍ" : "NO"} · crlf ${r.m.crlf ? "SÍ" : "NO"} · ws ${r.m.ws ? "SÍ" : "NO"}` : "—";
  say(`  ${i + 1}. l.${r.call.ln} · ${r.call.label} · ${r.relT ?? "target no extraíble"} · ${m} → ${r.verdict}`);
});
const unknown = rows.filter((r) => r.verdict === "dinámica" || r.verdict === "sin target");
const blockers = rows.filter((r) => r.verdict === "deriva" || r.verdict === "espacios" || r.verdict === "sin archivo");
if (blockers.length) {
  say(`  · próximo aborto previsto: ${blockers[0].call.label} (causa ${blockers[0].verdict})${unknown.length ? ` — además ${unknown.length} ancla(s) no testables` : ""}`);
} else if (rows.some((r) => r.verdict === "CRLF")) {
  say(`  · todas las falencias son CRLF → tras la conversión §E, §4 debería pasar${unknown.length ? ` (${unknown.length} ancla(s) dinámica(s) no testables — caveat)` : ""}`);
} else {
  say(`  · ninguna ancla falla en crudo ni CRLF → §4 debería pasar${unknown.length ? ` (${unknown.length} dinámica(s) sin testar — caveat)` : ""}`);
}
say("");

// ── §E · fix: conversión CRLF→LF SOLO si todos los fallos son CRLF ──
say("── §E · fix (solo si todos los fallos son CRLF) ──");
const crlfRows = rows.filter((r) => r.verdict === "CRLF");
if (!crlfRows.length && !blockers.length) {
  say("  · nada que corregir — todas las anclas extraíbles matchean.");
} else if (blockers.length) {
  say(`  · NO apliqué ningún fix: hay ${blockers.length} ancla(s) con deriva/espacios/archivo ausente:`);
  blockers.forEach((r) => say(`      - ${r.call.label} (${r.relT ?? "?"}) → ${r.verdict}`));
  say("  · pegá §A+§B+§C+§D del reporte completo en el chat para el ancla corregida.");
} else {
  const targets = [...new Set(crlfRows.map((r) => r.call.targetPath!))].filter((p) => (contentOf(p) ?? "").includes("\r\n"));
  const already = [...new Set(crlfRows.map((r) => r.call.targetPath!))].filter((p) => !(contentOf(p) ?? "").includes("\r\n"));
  already.forEach((p) => say(`  · ${rel(p)} ya está en LF — nada que convertir`));
  for (const p of targets) {
    const c = contentOf(p)!;
    if (gitOk("ls-files", "--error-unmatch", "--", rel(p))) {
      fs.writeFileSync(p, c.replaceAll("\r\n", "\n"), "utf8");
      say(`  ✓ convertido a LF: ${rel(p)} · rollback: git checkout -- ${rel(p)}`);
    } else {
      fs.copyFileSync(p, `${p}.bak_crlf`);
      fs.writeFileSync(p, c.replaceAll("\r\n", "\n"), "utf8");
      say(`  ✓ convertido a LF: ${rel(p)} (no trackeado, backup ${rel(`${p}.bak_crlf`)})`);
    }
  }
  fileCache.clear();
  let allOk = true;
  for (const r of crlfRows) {
    const m2 = testA(r.call.anchor!, r.call.targetPath!);
    const ok = !!m2 && m2.raw;
    if (!ok) allOk = false;
    say(`  · re-test raw tras conversión · ${r.call.label}: ${ok ? "✓" : "⚠ sigue sin matchear"}`);
  }
  if (allOk && targets.length) say("  · todas las anclas CRLF ahora matchean en crudo.");
}
say("");
say("── siguiente paso ──");
say(`  · relanzar B0: npx tsx ${rel(B0)}`);
say("  · B0 es re-entrante hasta §3 (reescribe archivos completos); §4 no escribió nada aún.");
say("  · si aborta de nuevo en §4 con OTRO label: pegá §D (predicción) + el nuevo error.");
say("  · nota: §D cubre las llamadas patch(...); si una sección posterior usa otro helper");
say("    (insertAfter, replace...), ese aborto saldrá en la próxima corrida — pegarlo igual.");
say("");
fs.writeFileSync(path.join(ROOT, "p2c3h_b0q_report.txt"), R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0q_report.txt");
