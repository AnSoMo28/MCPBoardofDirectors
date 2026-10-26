#!/usr/bin/env node
/**
 * fix-unused.cjs — limpieza mecánica de la familia A del type-check
 *                   (TS6133 · TS6196 · TS6192 · TS6199 [+ 6195/6112 si aparecieran])
 *
 * Proyecto : club-platform-castillo_country_club · frontend/
 * Entrada  : type-check.log  (salida cruda de `pnpm exec tsc -b --force`
 *            — formato PLANO con paréntesis, el que tsc emite por pipe)
 * Salida   : archivos editados in-place + fix-unused.report.txt
 *
 * USO (desde DONDE SEA — la raíz del frontend se auto-resuelve con la
 *      misma cascada que el agregador):
 *   pnpm add -D ts-morph            (en frontend/ O en la raíz del monorepo)
 *   node scripts/fix-unused.cjs     [--root <frontend>] · [<frontend>] · [<ruta>/type-check.log]
 *   node scripts/fix-unused.cjs --restore     (revierte la corrida más reciente)
 *   pnpm exec tsc -b --force        (desde frontend/ — árbitro final, SIEMPRE)
 *
 * ── Diseño ──────────────────────────────────────────────────────
 * Dirigido POR EL LOG: solo se toca lo que tsc señaló — nada de
 * heurísticas propias. Por archivo, los errores se procesan en orden
 * DESCENDENTE de (línea, columna) y cada nodo se resuelve FRESCO contra
 * el AST vigente justo antes de editar: una edición en la posición P
 * solo desplaza posiciones > P (ya procesadas) → inmune a corrimientos
 * de línea y a nodos "forgotten" de ts-morph.
 *
 * ── v3 (G25 · red de seguridad por colateral observado en producción) ──
 *  La corrida real (1111 fixes / 368 archivos) dejó familia B ×31:
 *  TS2304 "Cannot find name" ×27 + TS2305 "no exported member" ×4 —
 *  declaraciones vivas eliminadas. La causa exacta no se cerró por
 *  lectura del código, así que v3 vuelve el mis-targeting ESTRUCTURAL-
 *  MENTE imposible de aplicar en silencio:
 *   · BACKUP timestamped — cada archivo tocado se copia INTACTO a
 *     fix-unused.backup-<stamp>/ antes de su primera mutación;
 *     --restore revierte la corrida completa sin git.
 *   · GUARD DE NOMBRE — el nombre del mensaje de tsc debe coincidir
 *     con el nombre del nodo resuelto; si no, NO se toca y queda
 *     reportado como DESFASE (intacto, reaparece en el próximo tsc).
 *   · DEDUPE — las entradas del log se agrupan por archivo FÍSICO
 *     resuelto: dos grafías de una misma ruta jamás se procesan por
 *     separado (el segundo grupo llevaría posiciones obsoletas).
 *   · JOURNAL — toda eliminación queda itemizada en el reporte con el
 *     texto capturado ANTES de mutar (undo/diagnóstico sin git).
 *   · POST-CHECK — si un nombre eliminado sigue apareciendo como
 *     palabra en el archivo, se reporta SOSPECHA (¿comentario/cadena…
 *     o uso vivo?).
 *
 * ── Políticas (conservadoras — nunca cambia comportamiento runtime) ──
 *  · import specifier sin uso     → se quita el specifier; si el import
 *                                   queda sin bindings, se elimina entero
 *  · import completo sin uso      → se elimina y se reporta (revisar
 *                                   side-effects de módulo en el reporte)
 *  · import default sin uso       → se reconstruye sin el default
 *  · interface/type/enum sin uso  → se elimina (los tipos no existen en
 *                                   runtime; los enum no referenciados tampoco)
 *  · función/clase LOCAL sin uso  → se elimina (no referenciada = muerta)
 *  · variable local sin uso:
 *      - inicializador puro       → se elimina el statement completo
 *      - inicializador con efectos→ se CONSERVA la expresión:
 *                                    const x = f();       → f();
 *                                    const x = await f(); → await f();
 *      - statement multi-declarator totalmente muerto (TS6199)
 *                                 → puros: fuera; con efectos: se conservan
 *                                   solo los inicializadores con efectos
 *  · parámetro sin uso            → rename a _nombre (exención estándar)
 *  · var de for-of/for-in/catch   → rename a _nombre (el body corre igual —
 *                                   JAMÁS se remueve el loop)
 *  · destructuring objeto         → se quita el elemento (posicionalmente
 *                                   inocuo); si tiene default con efectos → manual
 *  · destructuring array          → HOLE (la posición es semántica:
 *                                    const [a, b] → const [, b] — JAMÁS remover)
 *  · propiedad de clase sin uso   → se elimina si el inicializador es puro
 *  · caso ambiguo / no soportado  → NO se toca; queda en el reporte y
 *                                    reaparece en el próximo tsc (bucle seguro)
 *
 * Supuesto documentado: los accesos a propiedad (getters impuros) se
 * asumen puros — convención estándar; todo call/new/await/yield/update/
 * asignación/tagged template/delete SÍ cuenta como efecto.
 *
 * El reporte (fix-unused.report.txt) lista: imports tocados (revisar
 * side-effects de módulo), efectos conservados como expresión (queries
 * muertas incluidas — quedan a la vista para poda manual posterior) y
 * todo lo saltado con motivo.
 */
"use strict";

const fs = require("fs");
const path = require("path");

let tsMorph;
try {
  tsMorph = require("ts-morph");
} catch {
  // fallback: resolver desde el CWD (pnpm add -D ts-morph en frontend/ aunque
  // el script viva en otra carpeta)
  try {
    tsMorph = require(require.resolve("ts-morph", { paths: [process.cwd()] }));
  } catch {
    console.error("✗ ts-morph no está instalado →  pnpm add -D ts-morph  (en frontend/)");
    process.exit(1);
  }
}
const { Project, ts } = tsMorph;

const TARGET_CODES = new Set(["TS6133", "TS6196", "TS6192", "TS6199", "TS6195", "TS6112"]);

/* ══ 0 · resolución de la raíz del frontend (misma cascada que el
      agregador — se puede correr desde cualquier lado) ═══════════ */
const argv = process.argv.slice(2);
const argValue = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const isFrontendRoot = (p) =>
  !!p && isFile(path.join(p, "tsconfig.app.json")) && isFile(path.join(p, "package.json"));

let ROOT = null;
let HOW = null;
let LOG_PATH = null;

function resolveRootOrExit() {
  const scriptDir = __dirname;
  const cwd = process.cwd();
  // CWD primero: es la señal de intención más fuerte tras los argumentos
  // explícitos (evita que un script instalado en OTRO árbol frontend-like
  // — p. ej. el paquete de transporte — capture la corrida)
  const candidates = [
    ["directorio actual", cwd],
    ["monorepo (./frontend)", path.join(cwd, "frontend")],
    ["anclaje al script (scripts/)", scriptDir],
    ["scripts/.. del script", path.dirname(scriptDir)],
    ["monorepo (scripts/../frontend)", path.join(path.dirname(scriptDir), "frontend")],
  ];
  if (path.basename(cwd) === "scripts") {
    candidates.push(["scripts/.. del cwd", path.dirname(cwd)]);
    candidates.push(["monorepo (scripts/../frontend del cwd)", path.join(path.dirname(cwd), "frontend")]);
  }
  for (const [how, c] of candidates) {
    if (isFrontendRoot(c)) return { root: path.resolve(c), how };
  }
  console.error("✗ no pude resolver la raíz del frontend (debe tener tsconfig.app.json + package.json).");
  console.error("  Probé: --root · argumento · CWD · ./frontend · anclaje al script · scripts/..");
  console.error("  Usa:  node scripts/fix-unused.cjs --root <ruta-del-frontend>");
  process.exit(2);
}

const explicitRoot = argValue("--root");
const positional = argv.find((a) => !a.startsWith("--") && a !== explicitRoot);

if (explicitRoot) {
  if (!isFrontendRoot(explicitRoot)) {
    console.error(`✗ --root ${explicitRoot} no es la raíz del frontend (falta tsconfig.app.json o package.json)`);
    process.exit(2);
  }
  ROOT = path.resolve(explicitRoot);
  HOW = "--root";
} else if (positional && isDir(positional)) {
  if (!isFrontendRoot(positional)) {
    console.error(`✗ ${positional} no es la raíz del frontend (falta tsconfig.app.json o package.json)`);
    process.exit(2);
  }
  ROOT = path.resolve(positional);
  HOW = "argumento (raíz)";
} else {
  if (positional && /\.log$/i.test(positional)) {
    if (isFile(positional)) {
      LOG_PATH = path.resolve(positional);
      const d = path.dirname(LOG_PATH);
      if (isFrontendRoot(d)) {
        ROOT = d;
        HOW = "argumento (log)";
      } else {
        console.error(`⚠ el log no está en la raíz del frontend (${d}) — resuelvo la raíz por anclaje`);
      }
    } else {
      console.error(`⚠ no existe el log ${positional} — resuelvo la raíz por anclaje`);
    }
  }
  if (!ROOT) ({ root: ROOT, how: HOW } = resolveRootOrExit());
}

if (!LOG_PATH) LOG_PATH = path.join(ROOT, "type-check.log");
const REPORT_PATH = path.join(ROOT, "fix-unused.report.txt");
const stamp = (() => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
})();
const BACKUP_DIR = path.join(ROOT, `fix-unused.backup-${stamp}`);
const TSCONFIG = path.join(ROOT, "tsconfig.app.json");

console.log(`Raíz: ${ROOT} (${HOW})`);

/* ══ 0-bis · --restore: revierte la corrida más reciente desde su backup ═ */
if (argv.includes("--restore")) {
  let latest = null;
  try {
    latest = fs.readdirSync(ROOT)
      .filter((n) => /^fix-unused\.backup-\d{8}-\d{6}$/.test(n))
      .sort()
      .pop() || null;
  } catch { /* raíz sin listar — cae al error de abajo */ }
  if (!latest) {
    console.error(`✗ no hay backups fix-unused.backup-* en ${ROOT} — nada que revertir`);
    console.error("  (los backups los crea la v3 al correr; una corrida de la v2 no dejó ninguno)");
    process.exit(1);
  }
  const srcRoot = path.join(ROOT, latest);
  let n = 0;
  (function walkRestore(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const s = path.join(d, ent.name);
      if (ent.isDirectory()) { walkRestore(s); continue; }
      const dest = path.join(ROOT, path.relative(srcRoot, s));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(s, dest);
      n++;
    }
  })(srcRoot);
  console.log(`✓ --restore: ${n} archivo(s) restaurados desde ${latest}`);
  console.log("  (el backup queda conservado; bórralo cuando el árbol esté verificado)");
  process.exit(0);
}

if (!fs.existsSync(LOG_PATH)) {
  console.error(`✗ no existe ${LOG_PATH} — genera antes el log:`);
  console.error(`    node scripts/g21-aggregate-typecheck.mjs --run    (escribe frontend/type-check.log)`);
  console.error(`    o:  cd frontend  &&  pnpm exec tsc -b --force > type-check.log 2>&1`);
  process.exit(1);
}

/* ══ 1 · parse del log (formato plano de tsc por pipe) ═══════════ */
const LINE_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const entries = [];
for (const raw of fs.readFileSync(LOG_PATH, "utf8").split(/\r?\n/)) {
  const m = raw.match(LINE_RE);
  if (!m) continue;
  const [, file, line, col, code, msg] = m;
  if (!TARGET_CODES.has(code)) continue;
  entries.push({
    file: file.replace(/\\/g, "/"),
    line: Number(line),
    col: Number(col),
    code,
    msg,
  });
}
if (entries.length === 0) {
  console.error("✗ 0 entradas de la familia A en el log — nada que hacer");
  process.exit(0);
}

const byFile = new Map();
for (const e of entries) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

/* ══ 2 · proyecto (nunca emite — solo estructura) ════════════════ */
const project = new Project({ tsConfigFilePath: TSCONFIG });

/* ══ 3 · detector de efectos (conservador) ═══════════════════════ */
const ASSIGN_OPS = new Set([
  ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken, ts.SyntaxKind.BarEqualsToken, ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken, ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);
const EFFECT_KINDS = new Set([
  ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression, ts.SyntaxKind.AwaitExpression,
  ts.SyntaxKind.YieldExpression, ts.SyntaxKind.UpdateExpression,
  ts.SyntaxKind.TaggedTemplateExpression, ts.SyntaxKind.DeleteExpression,
]);
const FUNCTION_LIKE = new Set([
  ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.FunctionExpression, ts.SyntaxKind.ClassExpression,
]);

/** ¿La expresión puede tener efectos al evaluarse? (definir una función no) */
function hasEffects(node) {
  const stack = [node];
  while (stack.length > 0) {
    const n = stack.pop();
    if (EFFECT_KINDS.has(n.getKind())) return true;
    if (n.getKind() === ts.SyntaxKind.BinaryExpression &&
        ASSIGN_OPS.has(n.getOperatorToken().getKind())) return true;
    for (const child of n.getChildren()) {
      if (FUNCTION_LIKE.has(child.getKind())) continue;
      stack.push(child);
    }
  }
  return false;
}

/* ══ 3-bis · backup v3: copia intacta ANTES de la primera mutación ══ */
const backedUp = new Set();
function backupOnce(sf) {
  const fp = sf.getFilePath();
  if (backedUp.has(fp)) return;
  backedUp.add(fp);
  const dest = path.join(BACKUP_DIR, path.relative(ROOT, fp));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(fp, dest);
}

/* ══ 4 · clasificación del nodo señalado ═════════════════════════ */
function classify(e, node) {
  // TS6192 ("All imports in import declaration are unused") apunta a la
  // declaración completa — forzar el climb hasta ella, pase lo que pase
  if (e.code === "TS6192") {
    let n = node;
    while (n && n.getKind() !== ts.SyntaxKind.ImportDeclaration) n = n.getParent();
    return n ? { kind: "import-all", node: n } : null;
  }
  let n = node;
  while (n) {
    switch (n.getKind()) {
      case ts.SyntaxKind.ImportSpecifier:      return { kind: "import-specifier", node: n };
      case ts.SyntaxKind.ImportClause:         return { kind: "import-clause", node: n };
      case ts.SyntaxKind.ImportDeclaration:    return { kind: "import-all", node: n };
      case ts.SyntaxKind.InterfaceDeclaration: // ┐
      case ts.SyntaxKind.TypeAliasDeclaration: // ├ tipos: cero runtime
      case ts.SyntaxKind.EnumDeclaration:      // ┘
        return { kind: "type-decl", node: n };
      case ts.SyntaxKind.ClassDeclaration:     return { kind: "class-decl", node: n };
      case ts.SyntaxKind.FunctionDeclaration:  return { kind: "fn-decl", node: n };
      case ts.SyntaxKind.Parameter:            return { kind: "param", node: n };
      case ts.SyntaxKind.BindingElement:       return { kind: "binding-el", node: n };
      case ts.SyntaxKind.VariableDeclaration: {
        const list = n.getParent();
        const owner = list && list.getParent();
        if (list && list.getKind() === ts.SyntaxKind.VariableDeclarationList &&
            owner && owner.getKind() === ts.SyntaxKind.VariableStatement) {
          return { kind: "var-decl", node: n };        // const/let/var statement
        }
        if (list && list.getKind() === ts.SyntaxKind.VariableDeclarationList &&
            owner && (owner.getKind() === ts.SyntaxKind.ForOfStatement ||
                      owner.getKind() === ts.SyntaxKind.ForInStatement)) {
          return { kind: "loop-var", node: n };         // for-of/for-in — solo rename
        }
        if (list && list.getKind() === ts.SyntaxKind.CatchClause) {
          return { kind: "loop-var", node: n };         // catch (e) — solo rename
        }
        return null;                                    // for clásico u otro contexto — manual
      }
      case ts.SyntaxKind.PropertyDeclaration:  return { kind: "prop-decl", node: n };
      case ts.SyntaxKind.VariableStatement:   return { kind: "var-stmt", node: n }; // TS6199
      case ts.SyntaxKind.SourceFile:           return null; // cadena agotada
    }
    n = n.getParent();
  }
  return null;
}

/* ══ 4-bis · guard de nombre (v3) ═════════════════════════════ */
// "'X' is declared but …" → X ; TS6192/TS6199 no llevan nombre único → null
function flaggedName(e) {
  const m = e.msg.match(/^'([^']+)'/);
  return m ? m[1] : null;
}
// nombre del nodo objetivo según su clase (best-effort; null = sin verificar)
function targetName(t) {
  const n = t.node;
  try {
    switch (t.kind) {
      case "import-specifier": {          // "X" · "X as Y" · "type X" → nombre LOCAL
        let txt = n.getText().split(/\s+as\s+/).pop().trim();
        if (/^type\s+/.test(txt)) txt = txt.replace(/^type\s+/, "");
        return txt;
      }
      case "import-clause": {             // "Default, { … }" · "type Default" → default
        let txt = n.getText().trim();
        if (/^type\s+/.test(txt)) txt = txt.replace(/^type\s+/, "");
        return (txt.match(/^[A-Za-z_$][\w$]*/) || [null])[0];
      }
      case "binding-el": {                // "x" · "x = 1" · "prop: y" · "…rest" → local
        let txt = n.getText().trim();
        if (txt.startsWith("...")) txt = txt.slice(3).trim();
        if (txt.includes(":")) txt = txt.split(":").pop();
        return txt.split("=")[0].trim();
      }
      default:
        if (typeof n.getNameNode === "function") {
          const nn = n.getNameNode();
          if (nn) return nn.getText();
        }
        if (typeof n.getName === "function") {
          const nm = n.getName();
          if (typeof nm === "string") return nm;
        }
    }
  } catch { /* best-effort */ }
  return null;
}

/* ══ 5 · aplicación de fixes ═════════════════════════════════════ */
const stats = Object.create(null);
const report = { imports: [], preserved: [], skipped: [], deletions: [] };
function bump(k) { stats[k] = (stats[k] || 0) + 1; }
const one = (s) => s.replace(/\s+/g, " ").slice(0, 100);
// journal v3: el texto se captura ANTES de mutar el nodo
const journal = (node, where) => report.deletions.push(`FUERA  ${where}  →  ${one(node.getText())}`);

function applyFix(e, t) {
  const where = `${e.file}:${e.line}  ${one(e.msg)}`;
  try {
    switch (t.kind) {

      case "import-all": {
        report.imports.push(`ELIMINADO   ${where}  →  ${one(t.node.getText())}`);
        t.node.remove();
        bump("import eliminado");
        break;
      }

      case "import-specifier": {
        const decl = t.node.getFirstAncestorByKind(ts.SyntaxKind.ImportDeclaration);
        const spec = t.node.getText();
        t.node.remove();
        bump("specifier eliminado");
        if (decl && /^import\s+(type\s+)?\{\s*\}\s*from/.test(decl.getText())) {
          report.imports.push(`ELIMINADO   ${where}  (había quedado sin bindings)`);
          decl.remove();
          bump("import eliminado");
        } else {
          report.imports.push(`− specifier ${where}  −  ${spec}`);
        }
        break;
      }

      case "import-clause": { // `import Default, { usado } from "…"` con Default sin uso
        const clause = t.node;
        const decl = clause.getFirstAncestorByKind(ts.SyntaxKind.ImportDeclaration);
        const named = typeof clause.getNamedBindings === "function" ? clause.getNamedBindings() : undefined;
        if (named && named.getKind() === ts.SyntaxKind.NamespaceImport) {
          // `import Default, * as NS from "…"` — reescribir sin el default dejaría
          // la cláusula mal formada; caso raro → manual
          report.skipped.push(`default junto a namespace import (manual)  ${where}`);
          break;
        }
        if (decl && named && named.getKind() === ts.SyntaxKind.NamedImports &&
            named.getElements().length > 0) {
          const specs = named.getElements().map((s) => s.getText()).join(", ");
          decl.replaceWithText(`import { ${specs} } from ${decl.getModuleSpecifier().getText()};`);
          bump("default import eliminado");
        } else if (decl) {
          report.imports.push(`ELIMINADO   ${where}  →  ${one(decl.getText())}`);
          decl.remove();
          bump("import eliminado");
        }
        break;
      }

      case "type-decl": {
        journal(t.node, where);
        t.node.remove();
        bump("tipo eliminado");
        break;
      }

      case "class-decl": {
        journal(t.node, where);
        t.node.remove();
        bump("clase local eliminada");
        break;
      }

      case "fn-decl": {
        journal(t.node, where);
        t.node.remove();
        bump("función local eliminada");
        break;
      }

      case "param": {
        const nameNode = t.node.getNameNode();
        if (nameNode && nameNode.getKind() === ts.SyntaxKind.Identifier &&
            !nameNode.getText().startsWith("_")) {
          nameNode.replaceWithText(`_${nameNode.getText()}`);
          bump("parámetro → _nombre");
        } else if (nameNode && nameNode.getKind() === ts.SyntaxKind.Identifier) {
          bump("parámetro ya _");
        } else {
          report.skipped.push(`param con patrón (manual)  ${where}`);
        }
        break;
      }

      case "loop-var": { // for-of/for-in/catch — el cuerpo corre igual: solo rename
        const nameNode = t.node.getNameNode();
        if (nameNode && nameNode.getKind() === ts.SyntaxKind.Identifier &&
            !nameNode.getText().startsWith("_")) {
          nameNode.replaceWithText(`_${nameNode.getText()}`);
          bump("var de loop/catch → _nombre");
        } else {
          report.skipped.push(`var de loop con patrón (manual)  ${where}`);
        }
        break;
      }

      case "binding-el": {
        const be = t.node;
        const pattern = be.getParent();
        if (!pattern || typeof pattern.getElements !== "function") {
          report.skipped.push(`binding sin pattern (manual)  ${where}`);
          break;
        }
        // un default con efectos NO se poda ciegamente (se perdería la llamada)
        const elInit = typeof be.getInitializer === "function" ? be.getInitializer() : undefined;
        if (elInit && hasEffects(elInit)) {
          report.skipped.push(`elemento con default con efectos (manual)  ${where}`);
          break;
        }
        const siblings = pattern.getElements().filter((x) => x !== be);
        if (siblings.length > 0) {
          // reconstrucción por texto: ts-morph no expone remove() en BindingElement
          const elTexts = pattern.getElements().map((el) => (el === be ? "" : el.getText()));
          if (pattern.getKind() === ts.SyntaxKind.ArrayBindingPattern) {
            // ⚠️ posición semántica → HOLE, jamás remover
            pattern.replaceWithText(`[${elTexts.join(", ")}]`);
            bump("array destructuring → hole");
          } else {
            pattern.replaceWithText(`{ ${elTexts.filter(Boolean).join(", ")} }`);
            bump("destructuring element eliminado");
          }
          break;
        }
        const stmt = be.getFirstAncestorByKind(ts.SyntaxKind.VariableStatement);
        const init = stmt && stmt.getDeclarations().length === 1
          ? stmt.getDeclarations()[0].getInitializer()
          : undefined;
        if (stmt && init && hasEffects(init)) {
          const initText = init.getText();                       // capturar ANTES de mutar
          stmt.replaceWithText(`${initText};`);
          report.preserved.push(`${where}  →  ${one(initText)};`);
          bump("efecto conservado");
        } else if (stmt) {
          journal(stmt, where);
          stmt.remove();
          bump("statement eliminado");
        } else {
          report.skipped.push(`binding fuera de statement (manual)  ${where}`);
        }
        break;
      }

      case "var-decl": {
        const d = t.node;
        const list = d.getParent();
        const stmt = list.getParent();
        const init = d.getInitializer();

        if (list.getDeclarations().length > 1) {            // const a = 1, b = f();
          if (!init || !hasEffects(init)) {
            if (typeof d.remove === "function") {
              journal(d, where);
              d.remove();
              bump("declarator eliminado");
            } else {
              report.skipped.push(`declarator sin remove() (manual)  ${where}`);
            }
          } else {
            report.skipped.push(`declarator con efectos en lista múltiple (manual)  ${where}`);
          }
          break;
        }
        if (init && hasEffects(init)) {                      // const x = f(); → f();
          const initText = init.getText();                     // capturar ANTES de mutar
          stmt.replaceWithText(`${initText};`);
          report.preserved.push(`${where}  →  ${one(initText)};`);
          bump("efecto conservado");
        } else {                                             // puro → fuera el statement
          journal(stmt, where);
          stmt.remove();
          bump("statement eliminado");
        }
        break;
      }

      case "var-stmt": { // TS6199: TODO el statement multi-declarator está muerto
        const decls = t.node.getDeclarations();
        const effectful = decls
          .map((d) => d.getInitializer())
          .filter((init) => init && hasEffects(init));
        if (effectful.length === 0) {
          journal(t.node, where);
          t.node.remove();
          bump("statement eliminado");
        } else {
          const texts = effectful.map((i) => `${i.getText()};`); // capturar ANTES de mutar
          t.node.replaceWithText(texts.join("\n"));
          for (const tx of texts) report.preserved.push(`${where}  →  ${one(tx)}`);
          bump("efectos conservados");
        }
        break;
      }

      case "prop-decl": {
        const init = t.node.getInitializer();
        if (!init || !hasEffects(init)) {
          journal(t.node, where);
          t.node.remove();
          bump("propiedad eliminada");
        } else {
          report.skipped.push(`propiedad con efectos (manual)  ${where}`);
        }
        break;
      }

      default:
        report.skipped.push(`sin política  ${where}`);
    }
  } catch (err) {
    report.skipped.push(`ERROR: ${err && err.message}  ${where}`);
  }
}

/* ══ 6 · ejecución ═══════════════════════════════════════════════ */
function nodeAtPos(sf, pos) {
  if (typeof sf.getDescendantAtPos === "function") return sf.getDescendantAtPos(pos);
  let found; // fallback: pre-order → el último contenedor es el más profundo
  for (const d of sf.getDescendants()) {
    if (d.getStart() <= pos && pos < d.getEnd()) found = d;
  }
  return found;
}

const normPath = (p) => p.replace(/\\/g, "/").toLowerCase();
function findSourceFile(file) {
  const abs = path.isAbsolute(file) ? file : path.resolve(ROOT, file);
  const sf = project.getSourceFile(abs) || project.getSourceFile(file);
  if (sf) return sf;
  // último recurso: match por sufijo de ruta relativa (cubre slash/casing de Windows)
  const rel = normPath(file);
  return project.getSourceFiles().find((s) => normPath(s.getFilePath()).endsWith("/" + rel)) || null;
}

// dedupe v3: dos grafías del log que resuelven al MISMO archivo físico se
// fusionan en un solo grupo — procesarlas por separado aplicaría el segundo
// grupo con posiciones obsoletas (la primera corrida ya movió las líneas)
const fileGroups = new Map(); // ruta física normalizada → { sf, errs }
for (const [file, errs] of byFile) {
  const sf = findSourceFile(file);
  if (!sf) {
    report.skipped.push(`${file}: no encontrado en el proyecto (tsconfig.app.json) — ${errs.length} error(es) sin tratar`);
    continue;
  }
  const key = normPath(sf.getFilePath());
  if (!fileGroups.has(key)) fileGroups.set(key, { sf, errs: [] });
  fileGroups.get(key).errs.push(...errs);
}

// kinds cuya eliminación depende del nombre (para el post-check de sospechas)
const NAME_CHECK_KINDS = new Set([
  "import-specifier", "import-clause", "type-decl", "class-decl",
  "fn-decl", "var-decl", "var-stmt",
]);

let filesTouched = 0;
for (const { sf, errs } of fileGroups.values()) {
  // DESC por (línea, col): una edición en P solo desplaza posiciones > P (ya procesadas)
  const sorted = [...errs].sort((a, b) => (b.line - a.line) || (b.col - a.col));
  const relFile = path.relative(ROOT, sf.getFilePath()).replace(/\\/g, "/");
  const delNames = [];
  let touched = false;
  for (const e of sorted) {
    try {
      const pos = sf.compilerNode.getPositionOfLineAndCharacter(e.line - 1, e.col - 1);
      const node = nodeAtPos(sf, pos);
      if (!node) throw new Error("posición sin nodo");
      const target = classify(e, node);
      if (!target) throw new Error("no clasificable");
      // GUARD v3: el nombre señalado por tsc debe ser el del nodo resuelto.
      // Si las posiciones se desfilaron por cualquier causa, el fix NO se
      // aplica — el error queda intacto y reaparece en el próximo tsc.
      const esperado = flaggedName(e);
      if (esperado) {
        const real = targetName(target);
        if (real && real !== esperado) {
          report.skipped.push(`DESFASE (intacto)  ${e.file}:${e.line}  el log señala '${esperado}' pero el nodo allí es '${real}'  →  ${one(e.msg)}`);
          continue;
        }
      }
      if (NAME_CHECK_KINDS.has(target.kind)) {
        const nm = targetName(target);
        if (nm) delNames.push(nm);
      }
      backupOnce(sf);            // copia intacta ANTES de la primera mutación
      applyFix(e, target);
      touched = true;
    } catch (err) {
      report.skipped.push(`${e.file}:${e.line}  ${err && err.message}  →  ${one(e.msg)}`);
    }
  }
  if (touched) {
    filesTouched++;
    // POST-CHECK v3: un nombre eliminado que sigue apareciendo como palabra
    try {
      const fullText = sf.getFullText();
      for (const nm of new Set(delNames)) {
        if (!nm || !/^[A-Za-z_$][\w$]*$/.test(nm)) continue;
        if (new RegExp(`\\b${nm.replace(/\$/g, "\\$")}\\b`).test(fullText)) {
          report.skipped.push(`SOSPECHA (revisar)  ${relFile}  '${nm}' fue eliminado pero sigue apareciendo en el archivo — ¿comentario/cadena… o uso vivo?`);
        }
      }
    } catch { /* best-effort */ }
  }
}

project.saveSync();

/* ══ 7 · reporte ═════════════════════════════════════════════════ */
const totalFixed = Object.values(stats).reduce((a, b) => a + b, 0);
const out = [
  `fix-unused (v3) — ${new Date().toISOString()}`,
  `raíz:     ${ROOT} (${HOW})`,
  `log:      ${LOG_PATH}`,
  `backup:   ${BACKUP_DIR}`,
  `          (revertir TODO: node scripts/fix-unused.cjs --restore)`,
  `errores familia A en el log: ${entries.length}`,
  `fixes aplicados: ${totalFixed} · archivos tocados: ${filesTouched}`,
  ``,
  `── APLICADOS ──`,
  ...Object.entries(stats).map(([k, v]) => `  ${k.padEnd(32)} × ${v}`),
  ``,
  `── IMPORTS TOCADOS (${report.imports.length}) — revisar side-effects de módulo ──`,
  ...report.imports,
  ``,
  `── ELIMINACIONES (${report.deletions.length}) — journal: texto capturado antes de borrar ──`,
  ...report.deletions,
  ``,
  `── EFECTOS CONSERVADOS COMO EXPRESIÓN (${report.preserved.length}) — candidatos a poda manual ──`,
  ...report.preserved,
  ``,
  `── SALTADOS · DESFASES · SOSPECHAS (${report.skipped.length}) ──`,
  ...report.skipped,
  ``,
  `siguiente paso: pnpm exec tsc -b --force   (el árbitro final)`,
];
fs.writeFileSync(REPORT_PATH, out.join("\n"), "utf8");

const cut = out.findIndex((l) => l.startsWith("── IMPORTS TOCADOS"));
console.log(out.slice(0, cut < 0 ? 30 : cut).join("\n"));
console.log(`\n→ reporte completo: ${REPORT_PATH}`);
console.log(`→ re-corre: pnpm exec tsc -b --force`);
