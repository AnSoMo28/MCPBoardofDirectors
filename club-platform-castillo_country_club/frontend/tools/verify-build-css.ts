/**
 * verify-build-css — post-build bundle probe (B6-QA v3 gate).
 *
 * Post-mortem del 0002: `@import "tailwindcss" source(".")` es relativo al
 * STYLESHEET (src/styles/), no al root — el escaneo colapsó a solo .css y
 * la capa de utilities ENTERA desapareció del bundle (207kB → 118kB,
 * .flex/.grid/.items-center: 0 en dist contra 1716/559/875 usos reales en
 * src/). El build seguía siendo verde y el tsc seguía pasando: NINGÚN gate
 * existente miraba el OUTPUT. Este gate sí.
 *
 * Contrato:
 *   1. dist/assets/index-*.css existe y es el css de entry más grande.
 *   2. Batería de utilities representativa PRESENTE (la sonda usa las que
 *      el propio src/ usa masivamente: flex×1716, items-center×875,
 *      text-xs×603, grid×559, hidden×137 …). Si Tailwind vuelve a perder
 *      la raíz de escaneo, estas cuentan 0 y el gate FALLA.
 *   3. Familia font-[family-name:var(--font-*)] presente (1490 usos reales
 *      en 73 archivos: mono/ui/display/body) — su ausencia también delató
 *      el 118k roto.
 *   4. Piso de tamaño: el bundle debe superar el CSS hand-authored puro
 *      (src/styles/*.css) por un margen mínimo — la capa de utilities
 *      aportó ~89kB en 74491e3; un bundle que apenas supera el piso
 *      señala scan colapsado, no optimización.
 *   5. Sin selectores comodín inválidos: `var(--font-*)` / `var(--color-*)`
 *      crudos en el bundle = sintaxis de governance fugada al output.
 *
 * Uso:  npx tsx tools/verify-build-css.ts [--quiet]
 * Exit: 0 = PASS · 1 = FAIL (findings listados)
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const root = process.cwd(); // frontend/

const log = (m: string) => !quiet && console.log(m);

// ── 1. localizar el bundle de entry ────────────────────────────────
const distAssets = join(root, "dist", "assets");
if (!existsSync(distAssets)) {
  console.error("FAIL: dist/assets/ no existe — corré pnpm run build primero.");
  process.exit(1);
}
const cssFiles = readdirSync(distAssets)
  .filter((f) => /^index-.*\.css$/.test(f) || /^shared-ui-.*\.css$/.test(f));
if (cssFiles.length === 0) {
  console.error("FAIL: no hay index-*.css en dist/assets/ — el build no generó CSS de entry.");
  process.exit(1);
}
// El entry CSS es el más grande (index-*.css concentra la capa compartida).
const entry = cssFiles
  .map((f) => ({ f, size: statSync(join(distAssets, f)).size }))
  .sort((a, b) => b.size - a.size)[0];
const bundlePath = join(distAssets, entry.f);
const bundle = readFileSync(bundlePath, "utf8");

const findings: string[] = [];

// ── 2. batería de utilities ────────────────────────────────────────
// Escapado para grep literal: `.flex{` etc. Tailwind v4 emite
// exactamente ese shape para las utilities usadas.
const battery = [
  ".flex{", ".grid{", ".hidden{", ".items-center{", ".text-xs{",
  ".text-sm{", ".justify-between{", ".rounded-lg{", ".w-full{", ".font-semibold{",
];
const missing = battery.filter((u) => !bundle.includes(u));
if (missing.length > 0) {
  findings.push(
    `utilities ausentes del bundle (${missing.length}/${battery.length}): ${missing.join(" ")} — raíz de escaneo de Tailwind colapsada (¿@source/source() apuntando mal?)`,
  );
}

// ── 3. familia font-[family-name:var(--font-*)] ────────────────────
const fontVariants = ["--font-mono", "--font-ui", "--font-display", "--font-body"];
const fontMissing = fontVariants.filter((v) => !bundle.includes(`font-family:var(${v})`));
if (fontMissing.length > 0) {
  findings.push(
    `familia font-[family-name:var(--font-*)] ausente: ${fontMissing.join(" ")} (1490 usos en 73 archivos la referencian)`,
  );
}

// ── 4. piso de tamaño vs CSS hand-authored ─────────────────────────
let handFloor = 0;
for (const d of ["styles"]) {
  const dir = join(root, "src", d);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".css")) handFloor += statSync(join(dir, f)).size;
  }
}
// Margen mínimo: la capa de utilities aportó ~89kB sobre el piso en la
// base 74491e3. 1.4x del piso deja pasar el caso bueno (207k vs 115k) y
// frena el caso roto (118k vs 115k ≈ 1.03x).
const minSize = Math.floor(handFloor * 1.4);
if (entry.size < minSize) {
  findings.push(
    `bundle sospechosamente chico: ${entry.size}B vs piso hand-authored ${handFloor}B (mínimo ${minSize}B) — capa de utilities probablemente perdida`,
  );
}

// ── 5. sin sintaxis de governance fugada al output ──────────────────
const wildcards = ["var(--font-*)", "var(--color-*)"];
const leaked = wildcards.filter((w) => bundle.includes(w));
if (leaked.length > 0) {
  findings.push(`sintaxis comodín de governance en el bundle: ${leaked.join(" ")} — el escaneo está tocando archivos que POLICIAN, no los que usan`);
}

// ── veredicto ──────────────────────────────────────────────────────
if (findings.length > 0) {
  console.error(`FAIL: ${findings.length} finding(s) contra ${entry.f} (${entry.size}B):`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  process.exit(1);
}

log(`PASS: ${entry.f} · ${entry.size}B · utilities ✓ · familia font ✓ · piso ${handFloor}B ✓ · sin fugas ✓`);
process.exit(0);
