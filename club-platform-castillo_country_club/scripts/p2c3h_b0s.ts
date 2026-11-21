// P2-C3h · b0s — fix §5 smoke: CREAR config/club_registry.py (H2) + re-smoke + triage read-only
// ÚNICA escritura en el repo: backend/src/club_mcp/config/club_registry.py (si falta).
// NO toca ml_intelligence.py ni test_rbac.py (sus fixes son b0t, con el triage §C/§D).
// NO relanza B0 (§4 ya consumió sus anclas). Idempotente: si ya existe, no reescribe.
// Uso (desde la RAÍZ):   npx tsx scripts/p2c3h_b0s.ts
// En sandbox/fixture:     B0S_PY="python3" npx tsx scripts/p2c3h_b0s.ts
// Reporte: p2c3h_b0s_report.txt — pegar el output COMPLETO en el chat.
//
// Contexto (b0r): get_club_config NO está definido en ningún módulo (H2 — el módulo nunca
// se creó); bootstrap.py:165 lo importa lazy dentro de build_runtime y :173 lo llama con
// "castillo_country_club"; :211-212 inyecta el resultado como kwarg club_config a los
// agentes (event_orchestrator.py:35 lo declara dict[str, Any] | None). Hallazgos extra que
// NO bloquean este fix: ml_intelligence.py:34-35 importa club_mcp.services.* (paquete que
// nunca existió — daño del baseline, el archivo no figura en el git status de B0) y
// test_rbac.py:5 importa TOOL_PERMISSION_MAP retirado (Guard A de B0 escaneó solo src/).
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
const SRC = path.join(BE, "src");
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

// ── extracción de imports club_mcp.*/relativos (para reachability e importers) ──
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
      if (level === 0 && tail !== "club_mcp" && !tail.startsWith("club_mcp.")) continue;
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

const CLUB_REGISTRY_PY = `"""Registro de configuración por club (P2-C3h b0s).

Creado por b0s a partir del diagnóstico de b0r (§E: H2 puro): bootstrap.py:165
importa \`from club_mcp.config.club_registry import get_club_config\` y el módulo
no existía en ningún punto del árbol. Contrato inferido de los únicos
consumidores reales (verificados por b0r §B):

- bootstrap.py:173         club_config = get_club_config("castillo_country_club")
- bootstrap.py:211-212     kwargs[pname] = club_config  (inyección por nombre a agentes)
- event_orchestrator.py:35 club_config: dict[str, Any] | None = None  →  or {}

get_club_config(slug) devuelve un dict plano por club (copia defensiva); slug
desconocido → KeyError explícito: un club no registrado es un error de
configuración, no un caso de "vacío". El contenido vive en _CLUB_CONFIGS:
castillo_country_club arranca con dict vacío y se puebla con los datos reales
del club cuando la fase que los consume los defina (insumo: lo que
config/settings.py ya expone, volcado en p2c3h_b0s_report.txt §A).
"""

from typing import Any

_CLUB_CONFIGS: dict[str, dict[str, Any]] = {
    "castillo_country_club": {},
}

_KNOWN = ", ".join(sorted(_CLUB_CONFIGS))


def get_club_config(club_slug: str) -> dict[str, Any]:
    """Configuración del club \`club_slug\`, como dict plano (copia defensiva).

    Raises:
        KeyError: si el slug no está registrado en _CLUB_CONFIGS.
    """
    try:
        return dict(_CLUB_CONFIGS[club_slug])
    except KeyError:
        raise KeyError(
            f"club no registrado: {club_slug!r} (registrados: {_KNOWN})"
        ) from None


def registered_clubs() -> list[str]:
    """Slugs con configuración registrada (tests y diagnóstico)."""
    return sorted(_CLUB_CONFIGS)
`;

const BOOTSTRAP = path.join(SRC, "club_mcp", "bootstrap.py");
const TARGET = path.join(SRC, "club_mcp", "config", "club_registry.py");
const MLF = path.join(SRC, "club_mcp", "agents", "ml_intelligence.py");
const TEST_RBAC = path.join(BE, "tests", "unit", "auth", "test_rbac.py");

say("P2-C3h · b0s — fix §5: crear config/club_registry.py (H2) + re-smoke + triage");
say("");
say(`  · archivos auditados: ${pyFiles.length} .py (backend/src + backend/scripts + backend/tests)`);
say("  · única escritura prevista: backend/src/club_mcp/config/club_registry.py (si falta)");
say("");

// ── §0 Guardas ──
say("── §0 Guardas ──");
if (!ex(BOOTSTRAP)) { say(`  ✗ no existe ${rel(BOOTSTRAP)} — ABORTAR`); process.exit(1); }
const bsrc = read(BOOTSTRAP);
if (!bsrc.includes("from club_mcp.config.club_registry import get_club_config")) {
  say("  ✗ bootstrap.py ya no contiene 'from club_mcp.config.club_registry import get_club_config'");
  say("    — árbol derivado respecto de lo que b0r vio — ABORTAR (pegar el reporte igual)");
  process.exit(1);
}
say("  · bootstrap.py importa club_mcp.config.club_registry ✓ (ancla intacta)");
{
  const elsewhere: string[] = [];
  for (const f of pyFiles) {
    if (f === TARGET) continue;
    if (/\bdef\s+get_club_config\b/.test(read(f))) elsewhere.push(rel(f));
  }
  if (elsewhere.length) {
    say(`  ✗ get_club_config YA está definido en: ${elsewhere.join(", ")} — sería H1, no H2 — ABORTAR`);
    say("    (habría que re-apuntar el import de bootstrap, no crear un módulo duplicado)");
    process.exit(1);
  }
  say("  · get_club_config sin otra definición en el árbol ✓ (H2 confirmado)");
}
if (ex(TARGET)) {
  if (/\bdef\s+get_club_config\b/.test(read(TARGET))) {
    say("  · config/club_registry.py ya existe con get_club_config — no reescribo (idempotente)");
  } else {
    say("  ✗ config/club_registry.py existe SIN get_club_config — estado a medio hacer — ABORTAR");
    process.exit(1);
  }
} else {
  say("  · config/club_registry.py no existe → §A lo crea");
}
say("");

// ── §A · única escritura: crear el módulo ──
say("── §A · crear backend/src/club_mcp/config/club_registry.py ──");
let created = false;
if (!ex(TARGET)) {
  fs.writeFileSync(TARGET, CLUB_REGISTRY_PY, "utf8");
  created = true;
  say(`  ✓ escrito ${rel(TARGET)} (${CLUB_REGISTRY_PY.split("\n").length} líneas)`);
} else {
  say(`  · ${rel(TARGET)} ya presente — esta corrida no escribe nada`);
}
const SETTINGS = path.join(SRC, "club_mcp", "config", "settings.py");
if (ex(SETTINGS)) {
  const keep = read(SETTINGS)
    .split("\n")
    .map((l, i) => ({ l: l.replace(/\r$/, ""), i: i + 1 }))
    .filter(({ l }) => /^[A-Za-z_]\w*\s*[:=]/.test(l) || /^class\s/.test(l) || /^\s{4}[A-Za-z_]\w*\s*[:=]/.test(l));
  say("  · settings.py (superficie pública — insumo para poblar club_config en b0t):");
  if (keep.length) keep.slice(0, 15).forEach(({ l, i }) => say(`      l.${i} │ ${l.trim().slice(0, 90)}`));
  else say("      (sin asignaciones/clases top-level)");
} else {
  say("  · settings.py no encontrado — club_config queda dict vacío por ahora");
}
say("");

// ── §B · re-smoke (predicción de cadena + corrida real) ──
say("── §B · re-smoke ──");
const entry = path.join(BE, "scripts", "smoke_b0.py");
const reach = new Set<string>();
if (ex(entry)) {
  reach.add(entry);
  const q = [entry];
  while (q.length) {
    const f = q.pop()!;
    for (const imp of imps) {
      if (imp.file !== f) continue;
      const { file: mf } = resolveMod(f, imp);
      if (mf && !reach.has(mf)) { reach.add(mf); q.push(mf); }
    }
  }
}
const mlReachable = reach.has(MLF);
if (!ex(entry)) {
  say(`  ✗ no existe ${rel(entry)} — no puedo re-correr el smoke (¿B0 §2 lo escribió?)`);
} else {
  say(mlReachable
    ? "  · predicción: ml_intelligence ALCANZABLE desde el smoke → posible fallo runtime (club_mcp.services.*)"
    : "  · predicción: ml_intelligence NO alcanzable desde el smoke → sin blockers conocidos");
  if (/importlib|__import__/.test(bsrc)) {
    say("  · caveat: bootstrap.py usa importlib/__import__ — hay imports dinámicos que esta predicción estática no ve");
  }
  const PY = process.env.B0S_PY ? process.env.B0S_PY.trim().split(/\s+/) : ["uv", "run", "python"];
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
      else say(`  ✗ SMOKE exit=${r.status ?? "(sin status)"} — causa probable en §C/§D; pegar el reporte completo`);
    }
  } catch (e) {
    say(`  ✗ fallo lanzando el smoke: ${String(e)}`);
  }
}
say("");

// ── §C · triage ml_intelligence (READ-ONLY — el fix es b0t) ──
say("── §C · triage ml_intelligence (READ-ONLY — el fix es b0t) ──");
if (!ex(MLF)) {
  say(`  · ${rel(MLF)} no existe — nada que triagar`);
} else {
  const svcLines: { ln: number; text: string }[] = [];
  read(MLF).split("\n").forEach((raw, i) => {
    const t = raw.replace(/\r$/, "").trim();
    if (/^(from|import)\s+club_mcp\.services\./.test(t)) svcLines.push({ ln: i + 1, text: t });
  });
  say("  · imports rotos (club_mcp.services.* no existe en el árbol):");
  svcLines.forEach((s) => say(`      l.${s.ln} │ ${s.text}`));
  const syms: string[] = [];
  for (const s of svcLines) {
    const mm = s.text.match(/^from\s+[\w.]+\s+import\s+(.+)$/);
    if (mm) for (const part of mm[1].replace(/[()]/g, "").split(",")) {
      const t = part.trim().split(/\s+as\s+/)[0].trim();
      if (t && /^\w+$/.test(t)) syms.push(t);
    }
  }
  for (const s of syms) {
    const locs: string[] = [];
    for (const f of pyFiles) {
      if (f === MLF) continue;
      const c = read(f);
      const m2 = c.match(new RegExp(`(^|\\n)\\s*(?:async\\s+def|def|class)\\s+${s}\\b`));
      if (m2) locs.push(`${modOfFile(f)} (${rel(f)}:l.${c.slice(0, (m2.index ?? 0) + 1).split("\n").length})`);
    }
    say(locs.length
      ? `  · símbolo ${s} → definido en ${locs.join(", ")}`
      : `  · símbolo ${s} → SIN definición en el árbol (crear módulo o re-apuntar en b0t)`);
  }
  const importers: string[] = [];
  for (const imp of imps) {
    const { mod } = resolveMod(imp.file, imp);
    if (mod === "club_mcp.agents.ml_intelligence") importers.push(`${rel(imp.file)}:l.${imp.ln}`);
  }
  say(`  · importers de ml_intelligence: ${importers.length ? importers.join(", ") : "(ninguno — módulo huérfano)"}`);
  say(mlReachable
    ? "  · veredicto: EN CADENA del smoke → b0t debe corregir estos imports para que el smoke pase"
    : "  · veredicto: FUERA DE CADENA → no bloquea el smoke; diferir a b0t");
  say("  · el archivo no figura en el git status de B0 → daño del baseline, NO de B0");
}
say("");

// ── §D · triage test_rbac (READ-ONLY — el fix es b0t) ──
say("── §D · triage test_rbac (READ-ONLY — el fix es b0t) ──");
if (!ex(TEST_RBAC)) {
  say(`  · ${rel(TEST_RBAC)} no existe — nada que triagar`);
} else {
  say("  · primeras líneas del test:");
  read(TEST_RBAC).split("\n").slice(0, 8).forEach((raw, i) => say(`      l.${i + 1} │ ${raw.replace(/\r$/, "")}`));
  const refs: string[] = [];
  for (const f of pyFiles) {
    read(f).split("\n").forEach((raw, i) => { if (/\bTOOL_PERMISSION_MAP\b/.test(raw)) refs.push(`${rel(f)}:l.${i + 1}`); });
  }
  say(`  · TOOL_PERMISSION_MAP aún referenciado en: ${refs.join(", ") || "(ninguna — ya limpio)"}`);
  const tp = path.join(SRC, "club_mcp", "auth", "tool_permissions.py");
  say(`  · auth/tool_permissions.py: ${ex(tp) ? "aún EXISTE — revisar si el test debía seguir usándolo" : "no está en el árbol (B0 lo borró — git status 'D') → el import del test quedó colgando"}`);
  const RBAC = path.join(SRC, "club_mcp", "auth", "rbac.py");
  if (ex(RBAC)) {
    const names: string[] = [];
    read(RBAC).split("\n").forEach((raw) => {
      const t = raw.replace(/\r$/, "");
      let mm = t.match(/^([A-Z][A-Z0-9_]*)\s*[:=]/); if (mm) names.push(mm[1]);
      mm = t.match(/^(?:async\s+)?def\s+(\w+)/); if (mm) names.push(mm[1]);
      mm = t.match(/^class\s+(\w+)/); if (mm) names.push(mm[1]);
    });
    say(`  · auth/rbac.py ahora expone: ${names.join(", ") || "(nada público top-level)"}`);
  }
  say("  · causa raíz: el Guard A de B0 escaneó solo backend/src — no vio el import en tests/");
  say("  · veredicto: solo rompe pytest, no el smoke → reescribir el import del test en b0t");
}
say("");

// ── §E · git / rollback ──
say("── §E · git / rollback ──");
try {
  const st = spawnSync("git", ["status", "--porcelain", "--", "backend/src/club_mcp/config"], { cwd: ROOT, encoding: "utf8" });
  say(`  · git status config/: ${st.status === 0 ? ((st.stdout || "").trim() || "clean") : "(no es repo git / git no disponible)"}`);
} catch { say("  · git status config/: (git no disponible)"); }
say(created
  ? "  · rollback: club_registry.py es NUEVO (no trackeado) — borrarlo restaura el estado previo"
  : "  · rollback: n/a — esta corrida no escribió ningún archivo del repo");
say("");

// ── §F · siguiente ──
say("── siguiente paso ──");
say("  · pegar el output COMPLETO de p2c3h_b0s_report.txt en el chat.");
say("  · smoke VERDE → h7 gate superado → seguir con B1 (4 migrables) + B2 (15 cross-agent).");
say("  · smoke ROJO con ModuleNotFoundError 'club_mcp.services' → es §C: b0t re-apunta/crea esos imports.");
say("  · test_rbac (§D) se corrige en b0t junto con §C — NO relanzar B0 (§4 ya consumió anclas).");
say("");
fs.writeFileSync(path.join(ROOT, "p2c3h_b0s_report.txt"), R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0s_report.txt");
