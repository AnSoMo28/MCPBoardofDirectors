#!/usr/bin/env node
/**
 * P2-C1 · Phantom CSS Token Bailout · VI check 3 (327 warnings)
 * =============================================================
 * Genera src/styles/vi-token-bailout.css — una capa :root que DEFINE
 * todos los tokens var(--…) referenciados en TS/TSX que no existen en
 * ningún CSS bajo src/. Cero toques en componentes: solo CSS nuevo.
 *
 * Políticas de valor (en orden de confianza):
 *  KEEP      preservado de un bailout previo (las ediciones a mano sobreviven)
 *  FALLBACK  el propio autor dejó el valor inline: var(--x, #f87171)
 *  ALIAS     existe el token sin prefijo --color- (p.ej. --gold-100)
 *  DERIVED   familia cromática conocida: -bg → color-mix(12%, transparent)
 *            sobre el paso -400 ("primary" del canon), pasos -300/-100 →
 *            mix con white/black del hermano más cercano
 *  ASSUMED   sin señal alguna → default neutro MARCADO para revisar
 *  DYNAMIC   prefijo de template literal var(--gca-${…}) — resuelve en
 *            runtime a tokens definidos en CSS de componentes (no @theme:
 *            Tailwind no los poda). NO se emite CSS; residuo esperado.
 *  NOISE     token degenerado (p.ej. "var(--color-" en un comentario o
 *            test): no es una referencia real. NO se emite; residuo.
 *  THEME     paleta por defecto de Tailwind v4 (solo si algún CSS escaneado
 *            hace @import "tailwindcss"). Docs TW: "By default only used
 *            CSS variables will be generated in the final CSS output" →
 *            un var(--color-red-400) en TS que ninguna utility use NO se
 *            emite en build y resuelve a nada. Se EMITE en @layer theme
 *            con el valor v4 EXACTO leído de node_modules/tailwindcss/
 *            theme.css (la versión instalada del proyecto): si Tailwind
 *            también lo emite, el valor es idéntico; si lo tree-shakea,
 *            aquí se rellena. Cero deriva cromática.
 *
 * Además calcula el ranking P2-C2 (botones crudos por archivo/feature)
 * con el regex EOL-safe de VI v3.1.0 y lo guarda en vi-button-ranking.json.
 *
 * Uso:   npx tsx ../scripts/p2c1_tokens.ts --dry     (plan, sin tocar nada)
 *        npx tsx ../scripts/p2c1_tokens.ts --write   (aplica)
 *        npx tsx ../scripts/p2c1_tokens.ts --root <ruta>
 * Idempotente: re-ejecutar --write produce el mismo archivo e import.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const MODE = process.argv.includes("--write") ? "write" : "dry";
const ROOT = (() => {
  const i = process.argv.indexOf("--root");
  if (i > -1 && process.argv[i + 1] !== undefined) {
    return path.resolve(process.argv[i + 1] as string);
  }
  return path.resolve(process.cwd(), ".."); // como p2b: correr desde frontend/
})();

const SRC = (() => {
  const cands = [path.join(ROOT, "frontend", "src"), path.join(ROOT, "src")];
  for (const c of cands) {
    if (fs.existsSync(c)) return c;
  }
  return null;
})();
if (SRC === null) {
  console.error(`✗ no encuentro <root>/frontend/src ni <root>/src (root=${ROOT}). Usa --root <ruta>.`);
  process.exit(1);
}

const OUT_CSS = path.join(SRC, "styles", "vi-token-bailout.css");
const RANKING_JSON = path.join(ROOT, "vi-button-ranking.json");

// ── helpers ───────────────────────────────────────────────────────────
function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}
const rel = (f: string): string => path.relative(SRC, f).split(path.sep).join("/");

// ── escaneo ───────────────────────────────────────────────────────────
const cssFiles = walk(SRC, [".css"]);
const tsFiles = walk(SRC, [".ts", ".tsx"]).filter((f) => !/\.(test|spec)\.[tj]sx?$/.test(f));

const defined = new Set<string>();
const bailoutExisting = new Map<string, string>(); // tokens definidos por una ejecución previa
const scanCss = cssFiles.filter((f) => path.resolve(f) !== path.resolve(OUT_CSS));
for (const f of scanCss) {
  const txt = fs.readFileSync(f, "utf8");
  for (const m of txt.matchAll(/--[\w-]+(?=\s*:)/g)) defined.add(m[0]);
}
if (fs.existsSync(OUT_CSS)) {
  for (const line of fs.readFileSync(OUT_CSS, "utf8").split("\n")) {
    const m = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(line);
    if (m !== null) bailoutExisting.set(m[1] as string, (m[2] as string).trim());
  }
}

// ¿el proyecto importa Tailwind v4? Su paleta por defecto se genera en
// build dentro de @layer theme — no existe como texto, VI no la ve.
const hasTailwind = scanCss.some((f) => /@import\s+["']tailwindcss/.test(fs.readFileSync(f, "utf8")));

// Paleta por defecto leída del theme.css REAL instalado en node_modules
// (pnpm lo expone como symlink — fs lo sigue). Así los valores emitidos
// son exactos para la versión de Tailwind que corre el proyecto, no una
// tabla copiada a mano que puede quedar vieja.
const TW_THEME_CANDIDATES = [
  path.join(ROOT, "frontend", "node_modules", "tailwindcss", "theme.css"),
  path.join(ROOT, "node_modules", "tailwindcss", "theme.css"),
];
const twDefaults = new Map<string, string>();
let twThemeSrc: string | null = null;
for (const c of TW_THEME_CANDIDATES) {
  if (!fs.existsSync(c)) continue;
  for (const m of fs.readFileSync(c, "utf8").matchAll(/^\s*(--color-[\w-]+)\s*:\s*([^;]+);/gm)) {
    twDefaults.set(m[1] as string, (m[2] as string).trim());
  }
  if (twDefaults.size > 0) {
    twThemeSrc = c;
    break;
  }
}

interface Ref {
  tok: string;
  file: string;
  line: number;
}
const refs: Ref[] = [];
const fallbacks = new Map<string, string[]>(); // tok -> valores inline
const dynamicPrefixes = new Set<string>(); // prefijos var(--x-${…}) — el token exacto no existe en runtime
const VAR_PLAIN_RE = /var\(\s*(--[\w-]+)/g;
const VAR_FB_RE = /var\(\s*(--[\w-]+)\s*,\s*("[^"]*"|'[^']*'|[^)]+?)\s*\)/g;

// Strips // and /* */ comments preserving line numbers. Guarda strings
// ('…"https://…"…' NO se corta). VI v3.1.0 escanea comentarios y por eso
// flaggea "var(--color-)" de notas como ProgramTimeline.tsx:32 — aquí no.
function stripLine(line: string, state: { inBlock: boolean }): string {
  let out = "";
  let i = 0;
  let inStr: string | null = null;
  while (i < line.length) {
    const c = line[i]!;
    const next = line[i + 1] ?? "";
    if (inStr !== null) {
      out += c;
      if (c === "\\") {
        out += next;
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (state.inBlock) {
      if (c === "*" && next === "/") {
        state.inBlock = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && next === "/") break; // resto de la línea = comentario
    if (c === "/" && next === "*") {
      state.inBlock = true;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

for (const f of tsFiles) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const blockState = { inBlock: false };
  lines.forEach((raw, i) => {
    const line = stripLine(raw.replace(/\r$/, ""), blockState); // EOL-safe + sin comentarios
    for (const m of line.matchAll(VAR_PLAIN_RE)) {
      refs.push({ tok: m[1] as string, file: rel(f), line: i + 1 });
      // ¿el match sigue inmediatamente un ${…}? → prefijo dinámico, no un token real
      const rest = line.slice((m.index ?? 0) + m[0].length).trimStart();
      if (rest.startsWith("${")) dynamicPrefixes.add(m[1] as string);
    }
    for (const m of line.matchAll(VAR_FB_RE)) {
      const tok = m[1] as string;
      const val = (m[2] as string).trim();
      if (!fallbacks.has(tok)) fallbacks.set(tok, []);
      (fallbacks.get(tok) as string[]).push(val);
    }
  });
}

// ── clasificación ─────────────────────────────────────────────────────
type Policy = "KEEP" | "FALLBACK" | "ALIAS" | "DERIVED" | "ASSUMED" | "DYNAMIC" | "THEME" | "NOISE";
interface Phantom {
  tok: string;
  policy: Policy;
  value: string;
  uses: number;
  files: string[];
  note: string;
}

const refCount = new Map<string, Ref[]>();
for (const r of refs) {
  if (!refCount.has(r.tok)) refCount.set(r.tok, []);
  (refCount.get(r.tok) as Ref[]).push(r);
}

const resolved = new Map<string, Phantom>(); // tok -> entrada (para siblings DERIVED)
const dynFindings: Ref[] = [];
const noiseFindings: Ref[] = []; // refs degeneradas que VI flaggeará igual (comentarios/test)

function majorityFallback(tok: string): string | null {
  const vals = fallbacks.get(tok);
  if (vals === undefined || vals.length === 0) return null;
  const tally = new Map<string, number>();
  for (const v of vals) tally.set(v, (tally.get(v) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

// hermano cromático: definido en CSS o resuelto en esta pasada.
// El canon de globals.css marca el paso -400 como "primary" de cada
// familia — preferirlo como base de derivación (empate: el más cercano a 400).
function sibling(hue: string): string | null {
  const cands = [...defined, ...resolved.keys()].filter((d) =>
    new RegExp(`^--color-${hue}-(?:\\d{2,3})$`).test(d),
  );
  if (cands.length === 0) return null;
  const step = (d: string): number => Number((/-(\d{2,3})$/.exec(d) as RegExpExecArray)[1]);
  return cands.slice().sort((a, b) => Math.abs(step(a) - 400) - Math.abs(step(b) - 400) || step(a) - step(b))[0]!;
}

function classify(tok: string): Phantom {
  const uses = (refCount.get(tok) ?? []).length;
  const files = [...new Set((refCount.get(tok) ?? []).map((r) => `${r.file}:${r.line}`))];

  // DYNAMIC: prefijo de template literal var(--x-${…}) — el token exacto
  // nunca se referencia en runtime; el finding de VI es falso positivo.
  // Se comprueba ANTES que KEEP para que una ejecución vieja no lo congelen.
  if (dynamicPrefixes.has(tok)) {
    for (const r of refCount.get(tok) ?? []) dynFindings.push(r);
    return { tok, policy: "DYNAMIC", value: "", uses, files, note: "prefijo dinámico — falso positivo VI" };
  }

  // NOISE: token degenerado (termina en "-" sin ser prefijo dinámico) —
  // p.ej. "var(--color-" citado en un string/comentario. Definirlo sería
  // meter basura al CSS: se excluye y queda como residuo esperado.
  if (/-$/.test(tok)) {
    for (const r of refCount.get(tok) ?? []) noiseFindings.push(r);
    return { tok, policy: "NOISE", value: "", uses, files, note: "degenerado — no es una referencia real" };
  }

  // THEME: token de la paleta por defecto Tailwind v4, presente en el
  // theme.css instalado. VI no la ve (se genera en build) y Tailwind solo
  // emite las variables "usadas" por utilities — un var(--…) en TS puede
  // quedar tree-shakeado y resolver a nada. Se EMITE con el valor v4
  // exacto en @layer theme: si Tailwind también lo emite, el valor es
  // idéntico (sin deriva); si no, aquí se rellena el hueco.
  // Antes de KEEP: sana emisiones equivocadas de una versión vieja.
  if (hasTailwind && twDefaults.has(tok)) {
    return {
      tok,
      policy: "THEME",
      value: twDefaults.get(tok) as string,
      uses,
      files,
      note: "default Tailwind v4 exacto (theme.css instalado) — emitido en @layer theme",
    };
  }

  // KEEP: ya definido por una ejecución previa — preservar el valor (p.ej. revisado a mano)
  if (bailoutExisting.has(tok)) {
    return {
      tok,
      policy: "KEEP",
      value: bailoutExisting.get(tok) as string,
      uses,
      files,
      note: "preservado de bailout previo",
    };
  }

  // FALLBACK: el autor dejó el valor inline
  const fb = majorityFallback(tok);
  if (fb !== null) {
    return { tok, policy: "FALLBACK", value: fb, uses, files, note: "valor inline del autor" };
  }

  // ALIAS: existe el token sin el prefijo --color-
  const alias = tok.replace(/^--color-/, "--");
  if (alias !== tok && defined.has(alias)) {
    return { tok, policy: "ALIAS", value: `var(${alias})`, uses, files, note: `alias de ${alias}` };
  }

  // DERIVED: variantes -bg / pasos de escala de una familia cromática conocida
  let m = /^--color-([\w]+)-bg$/.exec(tok);
  if (m !== null) {
    const sib = sibling(m[1] as string);
    if (sib !== null) {
      return {
        tok,
        policy: "DERIVED",
        value: `color-mix(in srgb, var(${sib}) 12%, transparent)`,
        uses,
        files,
        note: `bg derivado de ${sib}`,
      };
    }
  }
  m = /^--color-([\w]+)-(\d{2,3})$/.exec(tok);
  if (m !== null) {
    const step = Number(m[2]);
    const sibs = [...defined, ...resolved.keys()]
      .map((d) => /^--color-([\w]+)-(\d{2,3})$/.exec(d))
      .filter((x) => x !== null && x[1] === m[1]);
    if (sibs.length > 0) {
      const nearest = sibs.sort(
        (a, b) => Math.abs(Number(a![2]) - step) - Math.abs(Number(b![2]) - step),
      )[0]!;
      const lighter = step < Number(nearest[2]);
      return {
        tok,
        policy: "DERIVED",
        value: lighter
          ? `color-mix(in srgb, var(--color-${m[1]}-${nearest[2]}) 45%, white)`
          : `color-mix(in srgb, var(--color-${m[1]}-${nearest[2]}) 25%, black)`,
        uses,
        files,
        note: `paso ${step} derivado de --color-${m[1]}-${nearest[2]}`,
      };
    }
  }

  // ASSUMED: sin señal — default neutro marcado para revisión humana
  const isShadow = /shadow/.test(tok);
  const isSpacing = /space|gap|pad|size|radius/.test(tok);
  const isTime = /dur|delay|time/.test(tok);
  const isColorish = /color|rose|amber|teal|emerald|sage|gold|red|blue|green|text|border|bg/.test(tok);
  let value = "inherit";
  if (isShadow) value = "0 4px 12px rgba(0, 0, 0, 0.15)";
  else if (isSpacing) value = "0.5rem";
  else if (isTime) value = "150ms";
  else if (isColorish) value = "#94a3b8";
  return { tok, policy: "ASSUMED", value, uses, files, note: "default neutro — REVISAR" };
}

for (const tok of refCount.keys()) {
  if (defined.has(tok)) continue; // ya definido en CSS (texto) bajo src/
  resolved.set(tok, classify(tok));
}
// solo DYNAMIC y NOISE quedan fuera de la emisión: no son referencias reales
const phantoms = [...resolved.values()].filter(
  (p) => p.policy !== "DYNAMIC" && p.policy !== "NOISE",
);
const dynTokens = [...resolved.values()].filter((p) => p.policy === "DYNAMIC");
const noiseTokens = [...resolved.values()].filter((p) => p.policy === "NOISE");
const themeTokens = [...resolved.values()].filter((p) => p.policy === "THEME");
const themeRefs = themeTokens.reduce((s, p) => s + p.uses, 0);

// ── emisión CSS ───────────────────────────────────────────────────────
const ORDER: Policy[] = ["KEEP", "FALLBACK", "ALIAS", "DERIVED", "ASSUMED"];

function renderCss(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const head = [
    "/* ============================================================",
    `   VI Token Bailout Layer — P2-C1 (${stamp}) · NO CANÓNICO`,
    "   Generado por scripts/p2c1_tokens.ts — NO EDITAR A MANO.",
    "   Re-ejecutar: npx tsx ../scripts/p2c1_tokens.ts --write",
    "",
    "   CAPA TRANSITORIA, NO FUENTE DE VERDAD. El canon de valores es",
    "   CHECKPOINT §1.2, implementado en globals.css (@theme + :root).",
    "   Este archivo solo define tokens que ni el canon ni ningún CSS",
    "   bajo src/ definían (VI check 3: phantom tokens). Cada token que",
    "   se estabilice debe PROMOCIONARSE a globals.css y desaparecer de",
    "   aquí (re-ejecutar --write lo recalcula). Políticas:",
    "     KEEP      preservado de una ejecución previa (ediciones a mano sobreviven)",
    "     FALLBACK  valor inline que dejó el propio autor",
    "     ALIAS     alias a token equivalente ya definido",
    "     DERIVED   derivado color-mix del paso -400 (primary) de su familia",
    "     ASSUMED   default neutro — REVISAR antes de producción",
    "   Bloque @layer theme (al final): tokens de la paleta por defecto de",
    "   Tailwind v4 con su valor EXACTO (node_modules/tailwindcss/theme.css).",
    "   Tailwind solo emite las variables usadas por utilities; un var(--…)",
    "   en TS puede quedar fuera del build. Mismo valor → mismo color: si",
    "   Tailwind también lo emite, no hay deriva; si no, aquí se rellena.",
    "   Excluidos a propósito:",
    "     · prefijos dinámicos var(--x-${…}) — resuelven a tokens ya definidos",
    "     · refs degeneradas citadas en strings/comentarios (VI las flaggeará igual)",
    "   ============================================================ */",
  ];
  const body: string[] = [];
  for (const pol of ORDER) {
    const group = phantoms
      .filter((p) => p.policy === pol)
      .sort((a, b) => b.uses - a.uses || a.tok.localeCompare(b.tok));
    if (group.length === 0) continue;
    body.push(`  /* —— ${pol} (${group.length}) —— */`);
    for (const p of group) {
      const ej = p.files.slice(0, 2).join(", ") + (p.files.length > 2 ? "…" : "");
      body.push(`  ${p.tok}: ${p.value}; /* ${p.uses} uso(s) · ${ej} · ${p.note} */`);
    }
    body.push("");
  }
  const rootBlock = body.length > 0 ? [":root {", ...body, "}"] : [];
  const themeBlock: string[] = [];
  if (themeTokens.length > 0) {
    const sorted = themeTokens.slice().sort((a, b) => b.uses - a.uses || a.tok.localeCompare(b.tok));
    themeBlock.push(
      "/* Paleta por defecto Tailwind v4 — valores exactos de theme.css.",
      "   En @layer theme para convivir (no pisar) con lo que Tailwind genere:",
      "   mismos valores, mismo resultado visual pase lo que pase en build. */",
      "@layer theme {",
      "  :root {",
    );
    for (const p of sorted) {
      const ej = p.files.slice(0, 2).join(", ") + (p.files.length > 2 ? "…" : "");
      themeBlock.push(`    ${p.tok}: ${p.value}; /* ${p.uses} uso(s) · ${ej} · default v4 */`);
    }
    themeBlock.push("  }", "}");
  }
  return [...head, ...rootBlock, "", ...themeBlock, ""].join("\n");
}

function findEntryCss(): string | null {
  const prefs = ["index.css", "main.css", "App.css", "global.css", "globals.css"];
  const candidates = cssFiles.filter((f) => path.resolve(f) !== path.resolve(OUT_CSS));
  for (const name of prefs) {
    const hit = candidates.find((f) => path.basename(f) === name);
    if (hit !== undefined) return hit;
  }
  return candidates.length > 0
    ? candidates.slice().sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0]!
    : null;
}

function injectImport(entry: string): "injected" | "already" {
  const txt = fs.readFileSync(entry, "utf8");
  const importPath = "./" + path.relative(path.dirname(entry), OUT_CSS).split(path.sep).join("/");
  const line = `@import "${importPath}";`;
  if (txt.includes(line)) return "already";
  const lines = txt.split("\n");
  let i = 0;
  while (i < lines.length && (/^\s*@(import|charset)/.test(lines[i]!) || /^\s*(\/\*|\/\/|$)/.test(lines[i]!))) {
    i++;
  }
  lines.splice(i, 0, line);
  fs.writeFileSync(entry, lines.join("\n"));
  return "injected";
}

// ── ranking P2-C2: botones crudos ─────────────────────────────────────
const BTN_RE = /<button(?=[\s>]|$)/;
const ALLOWED_DIRS = [
  "shared/components/ui",
  "shared/components/layout",
  "shared/components/error",
  "shared/components/export",
];
interface BtnRow {
  file: string;
  count: number;
}
const btnRows: BtnRow[] = [];
for (const f of tsFiles.filter((f) => f.endsWith(".tsx"))) {
  const relF = rel(f);
  if (ALLOWED_DIRS.some((d) => relF.startsWith(d + "/") || relF.startsWith(d))) continue;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const count = lines.filter((l) => BTN_RE.test(l.replace(/\r$/, ""))).length;
  if (count > 0) btnRows.push({ file: relF, count });
}
btnRows.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
const byFeature = new Map<string, number>();
for (const r of btnRows) {
  const seg = r.file.split("/");
  const key = seg[0] === "features" && seg.length > 1 ? `features/${seg[1]}` : seg[0]!;
  byFeature.set(key, (byFeature.get(key) ?? 0) + r.count);
}
const featureRows = [...byFeature.entries()].sort((a, b) => b[1] - a[1]);

// ── main ──────────────────────────────────────────────────────────────
console.log(`P2-C1 · Phantom Token Bailout · --${MODE === "write" ? "write (APLICA)" : "dry (solo plan)"}`);
console.log(`root: ${ROOT}`);
console.log(`src : ${SRC}  (${cssFiles.length} css · ${tsFiles.length} ts/tsx)`);
console.log("");
console.log("── A) Escaneo ──");
console.log(`  tokens definidos en CSS : ${defined.size}`);
console.log(`  refs var(--…) en TS/TSX : ${refs.length} (${refCount.size} tokens únicos)`);
console.log(`  @import tailwindcss      : ${hasTailwind ? "SÍ — paleta v4 se genera en build (solo las vars usadas)" : "no"}`);
console.log(
  hasTailwind
    ? `  theme.css instalado      : ${twThemeSrc !== null ? `${twDefaults.size} colores ✓ (${path.relative(ROOT, twThemeSrc)})` : "⚠ NO encontrado — los tokens de paleta v4 caerán a DERIVED/ASSUMED"}`
    : "",
);
console.log("");
console.log("── B) Clasificación de phantoms ──");
for (const pol of ORDER) {
  const g = phantoms.filter((p) => p.policy === pol);
  if (g.length > 0) console.log(`  ${pol.padEnd(9)} ${g.length} token(s)`);
}
console.log(`  DYNAMIC   ${dynTokens.length} token(s) → ${dynFindings.length} finding(s) de VI que QUEDAN (prefijo template literal — resuelven a tokens ya definidos)`);
console.log(`  NOISE     ${noiseTokens.length} token(s) → ${noiseFindings.length} finding(s) de VI que QUEDAN (degenerados: citados en strings/comentarios)`);
console.log(`  THEME     ${themeTokens.length} token(s) → ${themeRefs} finding(s) de VI que se EMITEN en @layer theme con el valor v4 exacto (${themeRefs} findings limpian)`);
console.log("");
console.log("── C) vi-token-bailout.css ──");
const cssText = renderCss();
if (MODE === "dry") {
  console.log("  preview (primeras 25 líneas):");
  console.log(cssText.split("\n").slice(0, 25).map((l) => `    ${l}`).join("\n"));
} else {
  fs.mkdirSync(path.dirname(OUT_CSS), { recursive: true });
  fs.writeFileSync(OUT_CSS, cssText);
  console.log(`  ✓ escrito: ${rel(OUT_CSS)} (${cssText.split("\n").length} líneas)`);
}
const entry = findEntryCss();
if (entry !== null) {
  if (MODE === "dry") {
    console.log(`  import a inyectar en ${rel(entry)} (tras los @import existentes)`);
  } else {
    const r = injectImport(entry);
    console.log(`  ${r === "already" ? "✓ import ya presente (idempotente)" : `✓ import inyectado en ${rel(entry)}`}`);
  }
} else {
  console.log("  ⚠ no hay CSS de entrada — importa vi-token-bailout.css a mano tras tu CSS principal");
}
console.log("");
console.log("── D) Ranking P2-C2 (botones crudos, regex EOL-safe VI v3.1.0) ──");
console.log(`  total: ${btnRows.reduce((s, r) => s + r.count, 0)} en ${btnRows.length} archivo(s)`);
for (const [f, c] of featureRows.slice(0, 10)) console.log(`  ${String(c).padStart(4)}  ${f}`);
console.log("  top archivos:");
for (const r of btnRows.slice(0, 10)) console.log(`  ${String(r.count).padStart(4)}  ${r.file}`);
if (MODE === "write") {
  fs.writeFileSync(
    RANKING_JSON,
    JSON.stringify({ total: btnRows.reduce((s, r) => s + r.count, 0), porFeature: featureRows, porArchivo: btnRows }, null, 2),
  );
  console.log(`  ✓ ranking completo: ${path.relative(ROOT, RANKING_JSON)}`);
}
console.log("");
console.log("── E) Predicción VI check 3 ──");
const before = refs.filter((r) => !defined.has(r.tok)).length;
console.log(`  findings VI sin bailout    : ${before}`);
console.log(`  residuo tras --write       : ${dynFindings.length + noiseFindings.length} = ${dynFindings.length} DYNAMIC + ${noiseFindings.length} NOISE`);
console.log(`  THEME emitido              : ${themeRefs} finding(s) limpian (valor v4 exacto en @layer theme)`);
console.log(`  defined en CSS (con bailout): ${defined.size} → ${defined.size + phantoms.length + themeTokens.length}`);
console.log("");
console.log("═══ RESUMEN ═══");
console.log(`  ${phantoms.length} token(s) :root · ${themeTokens.length} THEME @layer theme · ` +
  `${dynTokens.length} dinámico(s) + ${noiseTokens.length} noise excluidos · botones P2-C2: ${btnRows.reduce((s, r) => s + r.count, 0)}`);
if (MODE === "dry") {
  console.log("  Re-ejecuta con --write para aplicar.");
} else {
  console.log("  Verifica: pnpm run verify:integration (check 3 → solo residuo DYNAMIC+NOISE)");
  console.log("  ASSUMED: revisa los valores marcados antes de darlo por bueno.");
  console.log("  Promoción a canon: tokens estables → globals.css @theme (CHECKPOINT §1.2).");
}

