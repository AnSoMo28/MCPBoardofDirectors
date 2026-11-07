// P2-C3h · b0t — fix §5 (2ª caída): LookupError de _load_repo_class en bootstrap.py
// Escribe SOLO: backend/src/club_mcp/bootstrap.py (parche anclado) + backup .b0t.bak.
// NO toca ml_intelligence.py ni test_rbac.py (quedan para b0u, triage de b0s §C/§D).
// NO relanza B0. Idempotente: si el marcador "P2-C3h b0t" ya está, no reescribe.
// Uso (desde la RAÍZ):   npx tsx scripts/p2c3h_b0t.ts
// En sandbox/fixture:     B0T_PY="python3" npx tsx scripts/p2c3h_b0t.ts
// Reporte: p2c3h_b0t_report.txt — pegar el output COMPLETO en el chat.
//
// Contexto (b0s §B): el smoke avanzó pasado club_registry (fix de b0s ✓) y ahora cae en
// bootstrap.py:104 → LookupError: Repository class not found for 'member_360_repo' in
// club_mcp.db.repositories.member_360_repo. O sea: el MÓDULO importó bien (no fue
// ModuleNotFoundError) pero la CLASE que _load_repo_class deriva por convención no coincide
// con la definida en el módulo. El fix: reemplazar esa línea `raise` (ancla = texto exacto
// del traceback) por un bloque fallback que resuelve la clase por candidatas de nombre
// (CamelCase del key ± sufijos Repo/Repository) y, si no, por escaneo del módulo (si define
// una única clase pública). Cubre TODAS las claves de repo, no solo member_360_repo.
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
const BOOTSTRAP = path.join(BE, "src", "club_mcp", "bootstrap.py");
const BAK = `${BOOTSTRAP}.b0t.bak`;
const REPODIR = path.join(BE, "src", "club_mcp", "db", "repositories");
const REPORT = path.join(ROOT, "p2c3h_b0t_report.txt");
const R: string[] = [];
const say = (s = ""): void => { console.log(s); R.push(s); };
const rel = (p: string): string => path.relative(ROOT, p).replaceAll("\\", "/");
const read = (p: string): string => fs.readFileSync(p, "utf8");
const ex = (p: string): boolean => fs.existsSync(p);
const die = (msg: string): never => {
  say(msg);
  fs.writeFileSync(REPORT, R.join("\n") + "\n", "utf8");
  process.exit(1);
  throw new Error("unreachable");
};

// ── bloque fallback que reemplaza al raise (mismo indent que la línea ancla) ──
const FALLBACK = (I: string): string[] => [
  `${I}# P2-C3h b0t: fallback — convención de nombre + escaneo del módulo`,
  `${I}from importlib import import_module as _b0t_import`,
  `${I}_b0t_mod = None`,
  `${I}_b0t_err = None`,
  `${I}try:`,
  `${I}    _b0t_mod = _b0t_import(module_name)`,
  `${I}except ModuleNotFoundError as _b0t_e:`,
  `${I}    _b0t_err = _b0t_e`,
  `${I}if _b0t_mod is not None:`,
  `${I}    _b0t_parts = [p.title() if not p.isdigit() else p for p in repo_key.split("_")]`,
  `${I}    _b0t_base = "".join(_b0t_parts)`,
  `${I}    _b0t_strip = repo_key[:-5] if repo_key.endswith("_repo") else repo_key`,
  `${I}    _b0t_base2 = "".join(p.title() if not p.isdigit() else p for p in _b0t_strip.split("_")) if _b0t_strip else _b0t_base`,
  `${I}    _b0t_cands = []`,
  `${I}    for _b0t_s in (_b0t_base, _b0t_base2 + "Repo", _b0t_base2 + "Repository", _b0t_base2):`,
  `${I}        if _b0t_s and _b0t_s not in _b0t_cands:`,
  `${I}            _b0t_cands.append(_b0t_s)`,
  `${I}    for _b0t_c in _b0t_cands:`,
  `${I}        _b0t_cls = getattr(_b0t_mod, _b0t_c, None)`,
  `${I}        if isinstance(_b0t_cls, type):`,
  `${I}            return _b0t_cls`,
  `${I}    _b0t_defined = sorted(`,
  `${I}        _n for _n, _v in vars(_b0t_mod).items()`,
  `${I}        if isinstance(_v, type) and _v.__module__ == _b0t_mod.__name__ and not _n.startswith("_")`,
  `${I}    )`,
  `${I}    if len(_b0t_defined) == 1:`,
  `${I}        return getattr(_b0t_mod, _b0t_defined[0])`,
  `${I}    raise LookupError(`,
  `${I}        f"Repository class not found for '{repo_key}' in {module_name}"`,
  `${I}        f" (candidatas: {_b0t_cands}; clases definidas: {_b0t_defined})"`,
  `${I}    )`,
  `${I}raise LookupError(`,
  `${I}    f"Repository module not found for '{repo_key}': {module_name} ({_b0t_err})"`,
  `${I})`,
];

// ── candidatas en TS (espejo del algoritmo del parche, para predecir §B) ──
function candidates(key: string): string[] {
  const t = (p: string): string => (/^\d+$/.test(p) ? p : p ? p[0].toUpperCase() + p.slice(1) : p);
  const base = key.split("_").map(t).join("");
  const strip = key.endsWith("_repo") ? key.slice(0, -5) : key;
  const base2 = strip ? strip.split("_").map(t).join("") : base;
  const out: string[] = [];
  for (const s of [base, base2 + "Repo", base2 + "Repository", base2]) if (s && !out.includes(s)) out.push(s);
  return out;
}

function classify(key: string): { kind: string; detail: string } {
  const modFile = path.join(REPODIR, `${key}.py`);
  if (!ex(modFile)) return { kind: "MODULO_INEXISTENTE", detail: `club_mcp.db.repositories.${key} — crear módulo o corregir clave (b0u)` };
  const classes: string[] = [];
  for (const l of read(modFile).split("\n")) {
    const m = l.replace(/\r$/, "").match(/^class\s+([A-Za-z_]\w*)/);
    if (m && !classes.includes(m[1])) classes.push(m[1]);
  }
  const pub = classes.filter((c) => !c.startsWith("_"));
  const hit = candidates(key).find((c) => pub.includes(c));
  if (hit) return { kind: "CANDIDATA", detail: `${hit} (club_mcp.db.repositories.${key} ✓)` };
  if (pub.length === 1) return { kind: "ESCANEO_UNICO", detail: `${pub[0]} (única clase pública del módulo ✓)` };
  if (pub.length === 0) return { kind: "SIN_CLASES", detail: "módulo sin clases top-level (b0u)" };
  return { kind: "AMBIGUO", detail: `clases: ${pub.join(", ")} — el fallback no puede elegir (b0u decide)` };
}

say("P2-C3h · b0t — fix §5 (2ª caída): _load_repo_class no encuentra la clase");
say("");
say("  · escribe SOLO backend/src/club_mcp/bootstrap.py (+ backup .b0t.bak)");
say("");

// ── §0 Guardas ──
say("── §0 Guardas ──");
if (!ex(BOOTSTRAP)) die(`  ✗ no existe ${rel(BOOTSTRAP)} — ¿corriste desde la raíz del repo? — ABORTAR`);
const rawSrc = read(BOOTSTRAP);
const lines = rawSrc.split("\n").map((l) => l.replace(/\r$/, ""));
const crlf = rawSrc.includes("\r\n");
const already = rawSrc.includes("P2-C3h b0t:");
say("  · bootstrap.py existe ✓");
let anchorLn = -1;
let indent = "";
if (already) {
  say("  · bootstrap.py ya contiene el parche b0t — no reescribo (idempotente)");
} else {
  const raiseRe = /^([ \t]*)raise LookupError\(f"Repository class not found for '\{repo_key\}' in \{module_name\}"\)[ \t]*$/;
  const idxs: number[] = [];
  lines.forEach((l, i) => { if (raiseRe.test(l)) idxs.push(i); });
  if (idxs.length !== 1) die(`  ✗ ancla-raise presente ${idxs.length} veces (esperado 1) — ABORTAR (pegar el reporte)`);
  anchorLn = idxs[0];
  indent = lines[anchorLn].match(raiseRe)![1];
  say(`  · ancla-raise presente 1 vez ✓ (línea ${anchorLn + 1}, indent ${indent.length} espacios)`);
  if (crlf) say("  · bootstrap.py con CRLF → §C normaliza a LF antes de parchear");
}
say("");

// ── §A · fuente actual de _load_repo_class + claves (READ-ONLY) ──
say("── §A · _load_repo_class (fuente actual) + claves de repo ──");
const KEYS: string[] = [...new Set([...rawSrc.matchAll(/["']([a-z0-9_]+_repo)["']/g)].map((m) => m[1]))].sort();
{
  const fi = lines.findIndex((l) => /^\s*def\s+_load_repo_class\s*\(/.test(l));
  if (fi === -1) {
    say("  · _load_repo_class NO encontrado en bootstrap.py (¿renombrado?) — el parche igual apunta a la línea del raise");
  } else {
    say(`  · función (l.${fi + 1} en adelante):`);
    for (let j = fi; j < lines.length && j - fi < 45; j++) {
      if (j > fi && /^\S/.test(lines[j])) break;
      say(`      l.${j + 1} │ ${lines[j].slice(0, 100)}`);
    }
  }
  const keys = KEYS;
  say(`  · claves _repo literales en bootstrap.py: ${keys.join(", ") || "(ninguna — mapeo dinámico; §B queda vacío)"}`);
  const wf = lines.map((l, i) => ({ l, i })).filter(({ l }) => /repo_for\(|pname\s*==/.test(l)).slice(0, 12);
  if (wf.length) {
    say("  · llamadas repo_for(/pname == (primeras 12):");
    wf.forEach(({ l, i }) => say(`      l.${i + 1} │ ${l.trim().slice(0, 90)}`));
  }
}
say("");

// ── §B · inventario db/repositories + predicción por clave ──
say("── §B · inventario db/repositories + predicción por clave ──");
const classified: { key: string; kind: string; detail: string }[] = [];
{
  if (!ex(REPODIR)) {
    say("  · db/repositories/: NO EXISTE — todas las claves quedan MODULO_INEXISTENTE");
  } else {
    say(`  · db/repositories/: ${fs.readdirSync(REPODIR).sort().filter((n) => n.endsWith(".py")).join(", ") || "(vacío)"}`);
  }
  for (const key of KEYS.slice(0, 20)) {
    const c = classify(key);
    classified.push({ key, ...c });
    say(`  · ${key} → ${c.kind} ${c.detail}`);
  }
  const cnt = (k: string): number => classified.filter((c) => c.kind === k).length;
  say(`  · resumen: ${classified.length} clave(s) · CANDIDATA ${cnt("CANDIDATA")} · ESCANEO_UNICO ${cnt("ESCANEO_UNICO")} · AMBIGUO ${cnt("AMBIGUO")} · MODULO_INEXISTENTE ${cnt("MODULO_INEXISTENTE")} · SIN_CLASES ${cnt("SIN_CLASES")}`);
}
say("");

// ── §C · parche ──
say("── §C · parche bootstrap._load_repo_class (fallback de resolución) ──");
if (already) {
  say("  · ya parcheado — esta corrida no escribe bootstrap.py");
} else {
  fs.copyFileSync(BOOTSTRAP, BAK);
  say(`  ✓ backup: ${rel(BAK)} (bytes originales)`);
  const block = FALLBACK(indent);
  lines[anchorLn] = block.join("\n");
  fs.writeFileSync(BOOTSTRAP, lines.join("\n") + "\n", "utf8");
  say(`  ✓ parche aplicado: línea ${anchorLn + 1} → bloque fallback de ${block.length} líneas`);
  const PY = process.env.B0T_PY ? process.env.B0T_PY.trim().split(/\s+/) : ["uv", "run", "python"];
  const pc = spawnSync(PY[0], [...PY.slice(1), "-m", "py_compile", BOOTSTRAP], { encoding: "utf8", timeout: 120000 });
  if (pc.status === 0) {
    say("  ✓ py_compile bootstrap.py");
  } else {
    die(`  ✗ py_compile FALLÓ — restaurar con: mv ${rel(BAK)} ${rel(BOOTSTRAP)}\n${((pc.stdout || "") + (pc.stderr || "")).trim().split("\n").slice(-8).map((l) => `    ${l}`).join("\n")}`);
  }
  const patched = read(BOOTSTRAP).split("\n");
  const mi = patched.findIndex((l) => l.includes("P2-C3h b0t:"));
  say("  · región parcheada (primeras líneas):");
  patched.slice(Math.max(0, mi - 2), mi + 12).forEach((l, i) => say(`      l.${Math.max(0, mi - 2) + i + 1} │ ${l.slice(0, 100)}`));
}
say("");

// ── §D · re-smoke ──
say("── §D · re-smoke ──");
{
  const bad = classified.filter((c) => c.kind === "MODULO_INEXISTENTE" || c.kind === "AMBIGUO" || c.kind === "SIN_CLASES");
  if (bad.length) say(`  · predicción: el smoke puede seguir fallando en: ${bad.map((b) => `${b.key} (${b.kind})`).join(", ")}`);
  else say("  · predicción: todas las claves resolvibles — sin blockers conocidos en repos");
  const entry = path.join(BE, "scripts", "smoke_b0.py");
  if (!ex(entry)) {
    say(`  ✗ no existe ${rel(entry)} — no puedo re-correr el smoke`);
  } else {
    const PY = process.env.B0T_PY ? process.env.B0T_PY.trim().split(/\s+/) : ["uv", "run", "python"];
    say(`  · corriendo: ${PY.join(" ")} scripts/smoke_b0.py (cwd=backend, PYTHONPATH=src)`);
    try {
      const r = spawnSync(PY[0], [...PY.slice(1), "scripts/smoke_b0.py"], { cwd: BE, encoding: "utf8", env: { ...process.env, PYTHONPATH: "src" }, timeout: 180000 });
      if (r.error) {
        say(`  ✗ intérprete no disponible: ${String((r.error as Error).message)}`);
      } else {
        const out = ((r.stdout || "") + (r.stderr || "")).trim();
        const all = out ? out.split("\n") : ["(sin salida)"];
        if (all.length <= 23) all.forEach((l) => say(`    ${l}`));
        else {
          all.slice(0, 8).forEach((l) => say(`    ${l}`));
          say("    …");
          all.slice(-15).forEach((l) => say(`    ${l}`));
        }
        if (r.status === 0) say("  ✓ SMOKE VERDE (exit=0) — h7 gate superado");
        else say(`  ✗ SMOKE exit=${r.status ?? "(sin status)"} — pegar el reporte completo`);
      }
    } catch (e) {
      say(`  ✗ fallo lanzando el smoke: ${String(e)}`);
    }
  }
}
say("");

// ── §E · git / rollback ──
say("── §E · git / rollback ──");
{
  const st = spawnSync("git", ["status", "--porcelain", "--", "backend/src/club_mcp/bootstrap.py"], { cwd: ROOT, encoding: "utf8" });
  say(`  · git status bootstrap.py: ${st.status === 0 ? ((st.stdout || "").trim() || "clean") : "(git no disponible)"}`);
  say(`  · rollback exacto: mv ${rel(BAK)} ${rel(BOOTSTRAP)} (restaura los bytes previos, incluido CRLF si lo había)`);
}
say("");

// ── §F · siguiente ──
say("── siguiente paso ──");
say("  · pegar el output COMPLETO de p2c3h_b0t_report.txt en el chat.");
say("  · VERDE → h7 gate superado → b0u (ml_intelligence + test_rbac, triage de b0s §C/§D) y luego B1/B2.");
say("  · ROJO con \"No module named 'club_mcp.db.repositories.X'\" o \"Repository module not found for 'X'\" → módulo ausente real → b0u crea/redirige.");
say("  · ROJO con \"Repository class not found … (candidatas: …; clases definidas: …)\" → módulo AMBIGUO → b0u decide.");
say("  · ROJO con OTRO error → ya no es tema de repos: pegarlo igual (instancia de agentes, prompts, etc.).");
say("  · NO relanzar B0 (§4 consumió anclas).");
say("");
fs.writeFileSync(REPORT, R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0t_report.txt");
