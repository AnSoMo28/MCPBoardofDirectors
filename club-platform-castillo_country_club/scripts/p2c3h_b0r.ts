// P2-C3h · b0r — diagnóstico §5 smoke: ModuleNotFoundError 'club_mcp.config.club_registry'
// READ-ONLY: NO modifica nada del repo (solo escribe p2c3h_b0r_report.txt en la raíz).
// Uso (desde la RAÍZ):    npx tsx scripts/p2c3h_b0r.ts
// En sandbox/fixture:      B0R_PY="python3" npx tsx scripts/p2c3h_b0r.ts
// Reporte: p2c3h_b0r_report.txt — pegar el output COMPLETO en el chat.
//
// Contexto: B0 §1-§4 verde (3 parches aplicados tras la conversión CRLF de b0q) y py_compile
// 8/8 ✓, pero smoke_b0.py muere en runtime: bootstrap.py:165 importa
// club_mcp.config.club_registry, que no existe en el árbol (el traceback demuestra que
// club_mcp SÍ resuelve a src/ — no es problema de venv). Hipótesis:
//   H1 · renombrado: get_club_config vive en OTRO módulo (p.ej. config/club_config.py) y la
//          línea de bootstrap apunta al nombre equivocado → fix de 1 línea (b0s).
//   H2 · ausente: el módulo nunca se creó (era de una fase previa o se perdió) → decidir
//          stub mínimo vs módulo real.
//   H3 · otro import más falla después de arreglar este → §C audita TODOS los imports
//          club_mcp/relativos de src+scripts+tests de una vez (predicción completa).
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
const SRC = path.join(BE, "src");
const EXPECTED = "club_mcp.config.club_registry";
const R: string[] = [];
const say = (s = ""): void => { console.log(s); R.push(s); };
const rel = (p: string): string => path.relative(ROOT, p).replaceAll("\\", "/");
const read = (p: string): string => fs.readFileSync(p, "utf8");
const ex = (p: string): boolean => fs.existsSync(p);

function walkPy(dir: string, acc: string[] = []): string[] {
  if (!ex(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "__pycache__") walkPy(p, acc); continue; }
    if (e.name.endsWith(".py")) acc.push(p);
  }
  return acc;
}

const pyFiles = [...walkPy(SRC), ...walkPy(path.join(BE, "scripts")), ...walkPy(path.join(BE, "tests"))];

function moduleToFile(mod: string): string | null {
  const parts = mod.split(".");
  if (parts[0] !== "club_mcp") return null;
  const rest = parts.slice(1);
  if (rest.length === 0) {
    const p = path.join(SRC, "club_mcp", "__init__.py");
    return ex(p) ? p : null;
  }
  const base = path.join(SRC, "club_mcp", ...rest);
  if (ex(`${base}.py`)) return `${base}.py`;
  const init = path.join(base, "__init__.py");
  if (ex(init)) return init;
  return null;
}

function pkgOf(f: string): string | null {
  const rp = path.relative(SRC, f).replaceAll("\\", "/");
  if (rp.startsWith("..")) return null;
  const parts = rp.split("/");
  parts.pop();
  return parts.join(".");
}

function modOfFile(f: string): string {
  const pkg = pkgOf(f) ?? "";
  const base = path.basename(f).replace(/\.py$/, "");
  return base === "__init__" ? pkg : `${pkg}${pkg ? "." : ""}${base}`;
}

// ── extracción de imports (club_mcp.* y relativos; ignora terceros) ──
type Imp = { file: string; ln: number; mod: string | null; level: number; syms: string[] };
const imps: Imp[] = [];
for (const f of pyFiles) {
  const lines = read(f).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lnFirst = i + 1;
    let stmt = lines[i].replace(/\r$/, "");
    while ((stmt.match(/\(/g) || []).length > (stmt.match(/\)/g) || []).length && i + 1 < lines.length) {
      i++;
      stmt += " " + lines[i].replace(/\r$/, "");
    }
    const m = stmt.match(/^\s*from\s+([.\w]+)\s+import\s+(.+?)\s*(?:#.*)?$/);
    if (m) {
      const target = m[1];
      const level = (target.match(/^\.+/) || [""])[0].length;
      const tail = target.slice(level);
      const isRel = level > 0;
      const isPkg = tail === "club_mcp" || tail.startsWith("club_mcp.");
      if (!isRel && !isPkg) continue;
      const syms: string[] = [];
      for (const s of m[2].replace(/[()]/g, "").split(",")) {
        const t = s.trim().split(/\s+as\s+/)[0].trim();
        if (t) syms.push(t);
      }
      imps.push({ file: f, ln: lnFirst, mod: tail || null, level, syms });
      continue;
    }
    const m2 = stmt.match(/^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/);
    if (m2) {
      for (const t of m2[1].split(",")) {
        const mod = t.trim();
        if (mod === "club_mcp" || mod.startsWith("club_mcp.")) imps.push({ file: f, ln: lnFirst, mod, level: 0, syms: [] });
      }
    }
  }
}

function resolveMod(f: string, imp: Imp): { mod: string; file: string | null } {
  if (imp.level === 0) return { mod: imp.mod!, file: moduleToFile(imp.mod!) };
  const pkg = pkgOf(f);
  if (pkg === null) return { mod: imp.mod ?? "(.)", file: null };
  const parts = pkg.split(".");
  const up = imp.level - 1;
  if (up > parts.length) return { mod: imp.mod ?? "(relativa)", file: null };
  const baseParts = parts.slice(0, parts.length - up);
  const modParts = imp.mod ? imp.mod.split(".") : [];
  const mod = [...baseParts, ...modParts].join(".");
  return { mod, file: moduleToFile(mod) };
}

function symVerdict(mod: string, sym: string): boolean {
  if (sym === "*") return true;
  if (!/^\w+$/.test(sym)) return true;
  const f = moduleToFile(mod);
  if (!f) return false;
  const c = read(f);
  if (new RegExp(`(^|\\n)\\s*(?:async\\s+def|def|class)\\s+${sym}\\b`).test(c)) return true;
  if (new RegExp(`(^|\\n)\\s*${sym}\\s*[:=]`).test(c)) return true;
  if (new RegExp(`(^|\\n)\\s*from\\s+[\\w.]+\\s+import\\s+[^#\\n]*\\b${sym}\\b`).test(c)) return true;
  if (moduleToFile(`${mod}.${sym}`)) return true;
  return false;
}

say("P2-C3h · b0r — diagnóstico §5: ModuleNotFoundError 'club_mcp.config.club_registry'");
say("");
say(`  · archivos auditados: ${pyFiles.length} .py (backend/src + backend/scripts + backend/tests)`);
say("");

// ── §A · el paciente ──
say(`── §A · el paciente: backend/src/club_mcp/config/club_registry.py ──`);
{
  const cfgDir = path.join(SRC, "club_mcp", "config");
  const init = path.join(cfgDir, "__init__.py");
  const target = path.join(cfgDir, "club_registry.py");
  say(`  · config/ existe ${ex(cfgDir) ? "✓" : "✗ (AUSENTE)"} · config/__init__.py ${ex(init) ? "✓" : "✗ AUSENTE"} · config/club_registry.py ${ex(target) ? "✓ (¿raro!) " : "✗ AUSENTE"}`);
  if (ex(cfgDir)) say(`  · contenido de config/: ${fs.readdirSync(cfgDir).sort().join(", ")}`);
  const rootPy = fs.readdirSync(path.join(SRC, "club_mcp")).filter((n) => n.endsWith(".py")).sort();
  say(`  · .py en la raíz de club_mcp/: ${rootPy.join(", ")}`);
  const st = spawnSync("git", ["status", "--porcelain", "--", "backend/src/club_mcp/config"], { cwd: ROOT, encoding: "utf8" });
  say(`  · git status config/: ${((st.status === 0 ? st.stdout : "") || "").trim() ? ((st.stdout || "").trim()) : "clean"}`);
}
say("");

// ── §B · ¿dónde vive get_club_config? ──
say("── §B · ¿dónde vive get_club_config? (grep en src+scripts+tests) ──");
type Hit = { file: string; ln: number; text: string };
const hits: Hit[] = [];
{
  const PAT = /get_club_config|club_registry|club_config|ClubConfig|CLUB_REGISTRY/i;
  for (const f of pyFiles) {
    const lines = read(f).split("\n");
    lines.forEach((rawLine, i) => {
      const line = rawLine.replace(/\r$/, "").trim();
      if (PAT.test(line)) hits.push({ file: f, ln: i + 1, text: line });
    });
  }
  const files = [...new Set(hits.map((h) => h.file))];
  say(`  · patrón: get_club_config|club_registry|club_config|ClubConfig|CLUB_REGISTRY (i)`);
  say(`  · hits: ${hits.length} en ${files.length} archivo(s)`);
  let shown = 0;
  for (const h of hits) {
    if (shown >= 25) { say("      … (truncado a 25 líneas — el resto está solo en el archivo)"); break; }
    say(`      ${rel(h.file)}:${h.ln} │ ${h.text.slice(0, 110)}`);
    shown++;
  }
  const defHits = hits.filter((h) => /\bdef\s+get_club_config\b/.test(h.text));
  if (defHits.length) {
    defHits.forEach((h) => say(`  · def get_club_config: ${defHits.length} definición(es) → ${modOfFile(h.file)} (${rel(h.file)}:${h.ln})`));
  } else {
    say("  · def get_club_config: 0 definiciones");
  }
}
say("");

// ── §C · auditoría completa de imports (predicción de próximos fallos) ──
say("── §C · auditoría de imports club_mcp/relativos (predicción completa) ──");
type Fail = { kind: "modulo" | "simbolo" | "relativa"; mod: string; sym?: string; file: string; ln: number };
const fails: Fail[] = [];
let okCount = 0;
for (const imp of imps) {
  const { mod, file: mf } = resolveMod(imp.file, imp);
  if (mf === null) {
    fails.push({ kind: imp.level > 0 ? "relativa" : "modulo", mod, file: imp.file, ln: imp.ln });
    continue;
  }
  let bad: string | null = null;
  for (const s of imp.syms) {
    if (!symVerdict(mod, s)) { bad = s; break; }
  }
  if (bad) { fails.push({ kind: "simbolo", mod, sym: bad, file: imp.file, ln: imp.ln }); continue; }
  okCount++;
}
fails.sort((a, b) => (rel(a.file) === rel(b.file) ? a.ln - b.ln : rel(a.file) < rel(b.file) ? -1 : 1));
if (fails.length) {
  fails.forEach((f) => {
    if (f.kind === "modulo") say(`  ✗ ${f.mod} · módulo inexistente ← ${rel(f.file)}:${f.ln}`);
    else if (f.kind === "relativa") say(`  ✗ ${f.mod} · relativa sin resolver ← ${rel(f.file)}:${f.ln}`);
    else say(`  ✗ ${f.mod} · símbolo ${f.sym} ausente ← ${rel(f.file)}:${f.ln}`);
  });
} else {
  say("  · ningún import club_mcp/relativo falla en resolución estática");
}
say(`  · otros ${okCount} imports resuelven ✓ (módulo y símbolo)`);
say("");

// ── §D · runtime con el mismo intérprete que el smoke ──
say("── §D · runtime (mismo intérprete que el smoke) ──");
{
  const PY = process.env.B0R_PY ? process.env.B0R_PY.trim().split(/\s+/) : ["uv", "run", "python"];
  const mods = ["club_mcp", ...new Set(fails.filter((f) => f.mod.startsWith("club_mcp")).map((f) => f.mod))];
  const code = [
    "import importlib",
    `mods = ${JSON.stringify(mods)}`,
    "for m in mods:",
    "    try:",
    "        mod = importlib.import_module(m)",
    "        print('OK  ' + m + ' -> ' + str(getattr(mod, '__file__', '(builtin)')))",
    "    except Exception as e:",
    "        print('FAIL ' + m + ' -> ' + type(e).__name__ + ': ' + str(e))",
  ].join("\n");
  say(`  · comando: ${PY.join(" ")} -c "<import test>" (cwd=backend, PYTHONPATH=src)`);
  say(`  · módulos probados: ${mods.join(", ")}`);
  try {
    const r = spawnSync(PY[0], [...PY.slice(1), "-c", code], { cwd: BE, encoding: "utf8", env: { ...process.env, PYTHONPATH: "src" }, timeout: 120000 });
    const out = ((r.stdout || "") + (r.stderr || "")).trim();
    out.split("\n").slice(0, 30).forEach((l) => say(`  ${l}`));
    if (r.status !== 0 && !out) say(`  · (sin salida — status ${r.status})`);
  } catch (e) {
    say(`  · (intérprete no disponible: ${String(e)})`);
  }
  say("  · si aparece 'warning: VIRTUAL_ENV=… will be ignored': benigno — uv usa el .venv del proyecto.");
}
say("");

// ── §E · veredicto ──
say("── §E · veredicto ──");
{
  const defHits = hits.filter((h) => /\bdef\s+get_club_config\b/.test(h.text));
  if (defHits.length === 1) {
    const m = modOfFile(defHits[0].file);
    say(`  · get_club_config vive en ${m} (${rel(defHits[0].file)}:${defHits[0].ln})`);
    const failLn = fails.find((f) => f.mod === EXPECTED);
    if (m !== EXPECTED) say(`  → fix probable (b0s): ${rel(failLn?.file ?? path.join(SRC, "club_mcp/bootstrap.py"))}:${failLn?.ln ?? 165} → from ${m} import get_club_config`);
  } else if (defHits.length > 1) {
    defHits.forEach((h) => say(`  · def get_club_config también en ${modOfFile(h.file)} (${rel(h.file)}:${h.ln})`));
    say("  · definiciones múltiples — elegir la correcta antes de tocar bootstrap.");
  } else {
    say("  · get_club_config no está definido en ningún módulo del árbol.");
    const provs = hits.filter((h) => !/^\s*(from|import)\s/.test(h.text));
    if (provs.length) provs.slice(0, 6).forEach((h) => say(`  · candidato por nombre: ${rel(h.file)}:${h.ln} │ ${h.text.slice(0, 90)}`));
    else say("  · el nombre club_registry/config solo aparece en imports (bootstrap) — no hay proveedor: era de una fase previa o nunca se creó (H2).");
  }
  if (fails.length) {
    say(`  · lista completa a resolver en la próxima pasada (b0s):`);
    fails.forEach((f, i) => say(`      ${i + 1}. ${rel(f.file)}:${f.ln} · ${f.kind === "simbolo" ? `símbolo ${f.sym} ausente en ${f.mod}` : `módulo ${f.mod} inexistente`}`));
  } else {
    say("  · ningún otro import falla — arreglado el mío, el smoke debería avanzar.");
  }
}
say("");
say("── siguiente paso ──");
say("  · pegar el output COMPLETO de p2c3h_b0r_report.txt en el chat.");
say("  · NO relanzar B0: §4 ya aplicó sus parches (anclas viejas consumidas — no es idempotente).");
say("  · tras el fix (b0s o edición manual) correr SOLO el smoke:");
say("      cd backend && uv run python scripts/smoke_b0.py");
say("  · si el smoke avanza y falla en otro import: ya estaría en §C de este reporte.");
say("");
fs.writeFileSync(path.join(ROOT, "p2c3h_b0r_report.txt"), R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0r_report.txt");
