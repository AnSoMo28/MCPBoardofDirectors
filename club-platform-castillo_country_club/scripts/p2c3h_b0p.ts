// P2-C3h · b0p — parche de separadores de ruta (Windows) para scripts/p2c3h_b0.ts
// READ-ONLY sobre el repo · MODIFICA solo el archivo target (backup .bak_winpatch)
// Uso desde la RAÍZ:   npx tsx scripts/p2c3h_b0p.ts
//   o con otro target: npx tsx scripts/p2c3h_b0p.ts scripts/otro.ts
// Reporte: p2c3h_b0p_report.txt
//
// Causa raíz que corrige: en Windows (MINGW64) path.join() produce '\', y el guard §1
// compara p.endsWith("auth/rbac.py") con '/'. Nunca matchea → los archivos que el B0
// mismo reescribe (rbac.py, routes/agents.py) aparecen como offenders y aborta.
// El parche reescribe cada `X.endsWith("a/b.py")` → `X.replaceAll("\\", "/").endsWith("a/b.py")`
// (inofensivo en Linux/Mac, requerido en Windows). NO toca líneas dentro de templates
// String.raw (payloads Python) ni comparaciones .includes/=== (solo inventariadas).
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const target = process.argv[2]
  ? path.resolve(ROOT, process.argv[2])
  : path.join(ROOT, "scripts/p2c3h_b0.ts");
const BAK = `${target}.bak_winpatch`;
const R: string[] = [];
const say = (s = ""): void => { console.log(s); R.push(s); };

if (!fs.existsSync(target)) {
  console.error(`✗ no existe: ${path.relative(ROOT, target) || target}`);
  process.exit(1);
}

// ── §0 · prueba de plataforma (la explicación del aborto) ──
const demo = path.join("backend", "src", "club_mcp", "auth", "rbac.py");
say("P2-C3h · b0p — parche separadores de ruta (Windows)");
say("");
say("── §0 · prueba de plataforma ──");
say(`  · process.platform: ${process.platform}`);
say(`  · path.join("backend","src","club_mcp","auth","rbac.py") → ${JSON.stringify(demo)}`);
say(`  · demo.endsWith("auth/rbac.py") → ${demo.endsWith("auth/rbac.py")}`);
if (!demo.endsWith("auth/rbac.py")) {
  say("  · CONFIRMADO: aquí path.join produce '\\' y el guard compara con '/' → nunca matchea.");
  say("    Por eso tu re-run listó rbac.py + routes/agents.py PESI a que la exclusión existe.");
} else {
  say("  · en ESTA máquina el demo pasa (POSIX). El parche se aplica igual: es inofensivo aquí");
  say("    y obligatorio en Windows — tu aborto con la exclusión presente es la prueba.");
}
say("");

// ── §1 · inventario de comparaciones de ruta con '/' ──
const IDG = /([A-Za-z_$][\w$]*)\.(endsWith|startsWith)\("([^"/]*\/[^"]*)"\)/g;
const GEN = /\.(endsWith|startsWith)\("([^"]*\/[^"]*)"\)/i;
const INC = /\.includes\("[^"]*\/[^"]*"\)/;
const EQ = /(===|!==)\s*"[^"]*\/[^"]*"/;

const src = fs.readFileSync(target, "utf8");
const lines = src.split("\n");
type Site = { ln: number; line: string; note: string; hits: number };
const patchable: Site[] = [];
const manual: Site[] = [];
let inTpl = false;
lines.forEach((line, i) => {
  const tpl = inTpl;
  for (const ch of line) if (ch === "`") inTpl = !inTpl;
  if (GEN.test(line)) {
    if (tpl) manual.push({ ln: i + 1, line, note: "dentro de template (¿payload Python?) — NO tocado", hits: 0 });
    else {
      IDG.lastIndex = 0;
      const hits = [...line.matchAll(IDG)].length;
      if (hits > 0) patchable.push({ ln: i + 1, line, note: "auto-parcheable", hits });
      else manual.push({ ln: i + 1, line, note: "no auto-parcheable (receptor complejo o método no-JS) — solo reporte", hits: 0 });
    }
  } else if (!tpl && (INC.test(line) || EQ.test(line))) {
    manual.push({ ln: i + 1, line, note: "comparación de ruta con '/' — solo reporte", hits: 0 });
  }
});
say("── §1 · inventario de comparaciones de ruta con '/' ──");
const totalHits = patchable.reduce((a, s) => a + s.hits, 0);
say(`  · auto-parcheables: ${patchable.length} (${totalHits} ${totalHits === 1 ? "sitio" : "sitios"})`);
patchable.forEach((s) => say(`      l.${s.ln} (${s.hits}) · ${s.line.trim().slice(0, 100)}`));
say(`  · solo reporte: ${manual.length}`);
manual.forEach((s) => say(`      l.${s.ln} · ${s.note} · ${s.line.trim().slice(0, 100)}`));
say("");

// ── §2 · parche ──
say("── §2 · parche ──");
if (patchable.length === 0) {
  say("  · 0 sitios parcheables — ya está parcheado (o no aplica). Nada escrito.");
} else {
  if (fs.existsSync(BAK)) {
    say(`  · backup ya existía (se conserva el original de la primera pasada): ${path.relative(ROOT, BAK)}`);
  } else {
    fs.copyFileSync(target, BAK);
    say(`  · backup creado: ${path.relative(ROOT, BAK)}`);
  }
  const REPL = '$1.replaceAll("\\\\", "/").$2("$3")';
  const out = lines.slice();
  for (const s of patchable) {
    const before = out[s.ln - 1];
    IDG.lastIndex = 0;
    const after = before.replace(IDG, REPL);
    out[s.ln - 1] = after;
    say(`      l.${s.ln} ANTES : ${before.trim().slice(0, 110)}`);
    say(`      l.${s.ln} AHORA : ${after.trim().slice(0, 110)}`);
  }
  fs.writeFileSync(target, out.join("\n"), "utf8");
  say(`  · ${totalHits} comparaciones normalizadas en ${patchable.length} líneas.`);
}
say("");

// ── §3 · verificación ──
say("── §3 · verificación ──");
const src2 = fs.readFileSync(target, "utf8");
const lines2 = src2.split("\n");
let inTpl2 = false;
let remaining = 0;
lines2.forEach((line) => {
  const tpl = inTpl2;
  for (const ch of line) if (ch === "`") inTpl2 = !inTpl2;
  if (!tpl) { IDG.lastIndex = 0; remaining += [...line.matchAll(IDG)].length; }
});
say(`  · sitios frágiles restantes fuera de templates: ${remaining} ${remaining === 0 ? "✓" : "⚠"}`);
say(`  · líneas antes/después: ${lines.length}/${lines2.length} ${lines.length === lines2.length ? "✓" : "⚠"}`);
for (const s of patchable) {
  const ok = lines2[s.ln - 1].includes('.replaceAll("\\\\", "/").');
  say(`  · l.${s.ln} normalizada: ${ok ? "✓" : "⚠"}`);
}
say("");

// ── §4 · veredicto ──
say("── §4 · veredicto ──");
say(patchable.length === 0
  ? "  · nada que hacer — relanzar B0 tal cual:"
  : "  · parche aplicado. Relanzar B0:");
say("      npx tsx scripts/p2c3h_b0.ts");
say("  · rollback del parche si algo se ve raro:");
say(`      cp ${path.relative(ROOT, BAK)} ${path.relative(ROOT, target)}`);
say("  · si aborta MÁS ALLÁ de §1: pegar p2c3h_b0p_report.txt completo en el chat");
say("    (los sitios 'solo reporte' del §1 son los siguientes sospechosos).");
say("");
fs.writeFileSync(path.join(ROOT, "p2c3h_b0p_report.txt"), R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0p_report.txt");
