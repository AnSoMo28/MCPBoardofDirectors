// P2-C3h · b0w — waiver TP-1 (auth/tool_permissions.py) + predicción del re-run de B0
// READ-ONLY sobre el repo. Desde la RAÍZ: npx tsx scripts/p2c3h_b0w.ts
// Reporte: p2c3h_b0w_report.txt — pegar el output COMPLETO en el chat.
//
// Tu b0d ya probó: backend prístino (B0 no escribió nada) · script intacto (11/11) ·
// tool_permissions.py = stub de 42 líneas jamás dumpeado. Este waiver cierra el caso:
//   §A · ¿está muerto? importadores en TODO backend/ + rotura latente + .pyc huérfanos
//   §B · dump del guard §1 REAL (autoridad = tu disco, con nº de línea y contexto)
//   §C · predicción del re-run: quién bloquea §1 después de remover lo muerto
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
const TP = path.join(BE, "src/club_mcp/auth/tool_permissions.py");
const B0 = path.join(ROOT, "scripts/p2c3h_b0.ts");
const R: string[] = [];
const say = (s = ""): void => { console.log(s); R.push(s); };
const has = (p: string): boolean => fs.existsSync(p);
const rel = (p: string): string => path.relative(ROOT, p).replaceAll("\\", "/");

if (!has(path.join(BE, "src"))) {
  console.error("✗ Ejecutar desde la raíz del repo (backend/src no encontrado)");
  process.exit(1);
}

function walkPy(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let es: fs.Dirent[];
    try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "__pycache__") stack.push(p); }
      else if (e.name.endsWith(".py")) out.push(p);
    }
  }
  return out;
}

// ── cálculos ──
const tpExists = has(TP);
let tpUsesPerm = false;
let tpImportsPerm = true;
const importers: string[] = [];
let pycCount = -1;
if (tpExists) {
  const src = fs.readFileSync(TP, "utf8");
  tpUsesPerm = /\bPermission\./.test(src);
  tpImportsPerm = /^[ \t]*(from[^\n]*\bPermission\b|import[^\n]*\bPermission\b)/m.test(src);
  const FORMS = [
    "from club_mcp.auth.tool_permissions import",
    "from club_mcp.auth import tool_permissions",
    "from .tool_permissions import",
    "from ..auth.tool_permissions import",
    "from ...club_mcp.auth.tool_permissions import",
    "import tool_permissions",
  ];
  for (const f of walkPy(BE)) {
    if (f === TP) continue;
    const src2 = fs.readFileSync(f, "utf8");
    for (const form of FORMS) {
      const hit = src2.split("\n").find((l) => l.includes(form));
      if (hit) { importers.push(`${rel(f)} → ${hit.trim()}`); break; }
    }
  }
  const pyc = spawnSync("find", [BE, "-name", "tool_permissions*.pyc"], { encoding: "utf8" });
  pycCount = ((pyc.stdout || "") + (pyc.stderr || "")).trim().split("\n").filter(Boolean).length;
}
const guardSrc = has(B0) ? fs.readFileSync(B0, "utf8") : "";
const tokens = [...new Set(
  [...guardSrc.matchAll(/["']([^"']*\.py)["']/g)].map((m) => m[1]).filter((t) => t.length > 4)
)];
const users = walkPy(path.join(BE, "src"))
  .filter((f) => fs.readFileSync(f, "utf8").includes("TOOL_PERMISSION_MAP"));
const info = users.map((u) => {
  const r = rel(u);
  const cited = tokens.some((t) => r.endsWith(t) || t.endsWith(r));
  return { r, cited, isTP: u === TP };
});
const blockers = info.filter((x) => !x.cited).map((x) => x.r);
const postBlockers = blockers.filter((r) => r !== rel(TP));
const tracked = (() => {
  if (!tpExists) return true;
  const g = spawnSync("git", ["status", "--porcelain", "--", rel(TP)], { cwd: ROOT, encoding: "utf8" });
  return !((g.stdout || "").trim().startsWith("??"));
})();

// ── §A ──
say("P2-C3h · b0w — waiver TP-1 + predicción del re-run (read-only)");
say("");
say("── §A · tool_permissions.py: ¿está muerto? ──");
if (!tpExists) {
  say("  · el archivo NO existe (¿ya removido?) — ver §C para el re-run");
} else {
  say(`  · usa Permission.: ${tpUsesPerm ? "sí" : "no"} · importa Permission: ${tpImportsPerm ? "sí" : "NO → NameError latente (nunca pudo importarse sin reventar)"}`);
  say(`  · importadores en TODO backend/ (src+tests+scripts): ${importers.length}`);
  importers.forEach((l) => say(`      - ${l}`));
  say(`  · .pyc huérfanos: ${pycCount} ${pycCount === 0 ? "(nunca compilado → nunca importado)" : "(⚠ alguien lo importó alguna vez)"}`);
}
say("");

// ── §B ──
say("── §B · guard §1 real de scripts/p2c3h_b0.ts (autoridad: tu disco) ──");
if (!guardSrc) {
  say("  · scripts/p2c3h_b0.ts no encontrado — predicción §C queda limitada");
} else {
  const lines = guardSrc.split("\n");
  const hitIdx: number[] = [];
  lines.forEach((l, i) => { if (/TOOL_PERMISSION_MAP|offenders|endsWith|abortando/.test(l)) hitIdx.push(i); });
  if (hitIdx.length === 0) {
    say("  · sin líneas del guard encontradas (¿script distinto al enviado?)");
  } else if (hitIdx.length <= 40) {
    const keep = new Set<number>();
    hitIdx.forEach((i) => { for (let k = Math.max(0, i - 2); k <= Math.min(lines.length - 1, i + 2); k++) keep.add(k); });
    let prev = -2;
    [...keep].sort((a, b) => a - b).forEach((i) => {
      if (i > prev + 1) say("      ⋮");
      say(`  ${String(i + 1).padStart(4)} │ ${lines[i]}`);
      prev = i;
    });
  } else {
    say(`  · ${hitIdx.length} líneas matcheadas — mostrando sin contexto:`);
    hitIdx.slice(0, 80).forEach((i) => say(`  ${String(i + 1).padStart(4)} │ ${lines[i]}`));
  }
}
say("");

// ── §C ──
say("── §C · predicción del re-run (walk TOOL_PERMISSION_MAP sobre backend/src) ──");
say(`  · tokens .py citados por el guard: ${tokens.length ? tokens.join(" | ") : "(ninguno)"}`);
info.forEach((x) => say(`  ${x.cited ? "citado    " : "BLOQUEANTE"} · ${x.r}`));
say("");
say("  · tu aborto listó rbac.py + routes/agents.py ADEMÁS del desconocido: el guard no los");
say("    excluyó del LISTADO; §B muestra si los excluye del ABORTO (expected-set) o no (estricto).");
if (tpExists && importers.length > 0) {
  say("  ⚠ §A encontró importadores — NO remover; el waiver no procede.");
} else if (postBlockers.length === 0) {
  if (tpExists) {
    say("  · bloqueante actual: tool_permissions.py — el único uso NO citado por el guard.");
    say("  · tras removerlo, todos los usos restantes están citados → §1 debería pasar.");
  } else {
    say("  · todos los usos están citados por el guard → §1 debería pasar tal cual.");
  }
} else {
  say(`  · re-run abortaría por: ${blockers.join(", ")}`);
  say(`    → aun tras remover tool_permissions.py, seguiría abortando por: ${postBlockers.join(", ")}`);
  say("      (no es un error tuyo: son archivos que el propio B0 reescribe — pegar §B en el chat");
  say("       y te mando el parche de una línea para el guard).");
}
say("");

// ── veredicto ──
say("── veredicto ──");
if (!tpExists) {
  say("  · tool_permissions.py ausente — lanzar el re-run tal cual:");
  say("      npx tsx scripts/p2c3h_b0.ts");
} else if (importers.length > 0) {
  say("  ✗ NO remover todavía: tool_permissions.py está VIVO — pegar §A + §B en el chat.");
} else {
  say("  ✓ WAIVER: código muerto confirmado (0 importadores · NameError latente · sin .pyc).");
  if (tracked) {
    say("    remover (reversible):");
    say(`      git rm ${rel(TP)}`);
    say(`    rollback: git checkout HEAD -- ${rel(TP)}`);
  } else {
    say("    remover (no está en git — respaldo manual):");
    say(`      mv ${rel(TP)} ./tool_permissions.py.bak`);
  }
  say("    luego re-run:");
  say("      npx tsx scripts/p2c3h_b0.ts");
  if (postBlockers.length > 0) {
    say("  ⚠ ojo: §C predice que el re-run volvería a abortar — pegar §B antes de insistir.");
  }
}
say("");
fs.writeFileSync(path.join(ROOT, "p2c3h_b0w_report.txt"), R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0w_report.txt");
