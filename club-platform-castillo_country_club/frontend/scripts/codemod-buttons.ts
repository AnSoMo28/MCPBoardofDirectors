/**
 * codemod-buttons.ts — B5 · raw <button> → <Button variant="unstyled">
 * v3 — cirugía por RANGOS ABSOLUTOS de archivo (no texto de nodo).
 *
 * RAÍZ (dbg10): ts-morph replaceWithText de JsxOpeningElement inserta desde
 * node.getStart() que EXCLUYE indent de línea; el getText() del nodo traía
 * la indent acumulada tras re-parse (causaba indent corrupta 30/12 espacios).
 * SOLUCIÓN: cirugía de chars sobre el texto FULL del archivo:
 *   1) leer rango [start,end) del opening/closing/self-closing
 *   2) computar texto nuevo determinista
 *   3) escribir TODAS las ediciones con replaceTextOfDay... no — con un solo
 *      pass final por archivo aplicando deltas en orden DESC (sin re-parse
 *      intermedio, sin offsets stale).
 *
 * Clasificación única: todo raw button → Button variant="unstyled"
 * (passthrough puro en el primitivo — ver apply-unstyled.ts + cirugía
 * Button.tsx §2 del patch B5).
 *
 * Flags: --dry · --files="a.tsx,b.tsx"
 */
import { Project, SyntaxKind } from "ts-morph";

const DRY = process.argv.includes("--dry");
const filesArg = process.argv.find((a) => a.startsWith("--files="));
const TARGET_FILES = filesArg ? filesArg.slice("--files=".length).split(",") : null;

const EXEMPT_DIRS = [
  "shared/components/ui",
  "shared/components/layout",
  "shared/components/error",
  "shared/components/export",
];

const stats = { files: 0, swapped: 0, errors: 0, byDir: {} as Record<string, number> };

const project = new Project({ tsConfigFilePath: "tsconfig.app.json" });

for (const sf of project.getSourceFiles("src/**/*.tsx")) {
  const rel = sf
    .getFilePath()
    .replace(/^.*[\\/]src[\\/]/, "")
    .replace(/\\/g, "/");
  if (EXEMPT_DIRS.some((d) => rel.startsWith(`${d}/`))) continue;
  if (/\.(test|spec|stories)\.tsx$/.test(rel)) continue;
  if (TARGET_FILES && !TARGET_FILES.some((t) => rel.endsWith(t))) continue;

  // ── recolectar ediciones (rangos absolutos, sin mutar aún) ──
  type Edit = { start: number; end: number; text: string };
  const edits: Edit[] = [];

  const pairs = sf.getDescendantsOfKind(SyntaxKind.JsxElement).filter(
    (e) => e.getOpeningElement().getTagNameNode().getText() === "button",
  );
  const selfClosing = sf
    .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    .filter((e) => e.getTagNameNode().getText() === "button");

  if (pairs.length === 0 && selfClosing.length === 0) continue;
  stats.files++;
  const full = sf.getFullText();

  for (const el of pairs) {
    try {
      const opening = el.getOpeningElement();
      const closing = el.getClosingElement();
      // si ya tiene variant= (raro) → solo rename
      const openRange = full.slice(opening.getStart(), opening.getEnd());
      const hasVariant = /\bvariant=/.test(openRange);
      // single-line = el tag completo vive en UNA línea (no \n en el rango).
      // Un onClick multilínea DENTRO del tag hace el rango multilínea pero
      // NO multiline ATTRS: solo insertar variant si hay attrs simples antes
      // del primer \n, o el tag single-line sin handler multilinea.
      const singleLine = !openRange.includes("\n");

      const openLines = openRange.split("\n");
      openLines[0] = openLines[0]!.replace(/<button\b/, "<Button");
      if (!hasVariant) {
        if (singleLine) {
          openLines[0] = openLines[0]!.replace(
            /<Button\b/,
            '<Button variant="unstyled"',
          );
        } else if (openLines.length > 1 && /^[ \t]*[\w-]+=/.test(openLines[1] ?? "")) {
          // línea 2 es un attr real (type=/className=/key=…) → insertar antes
          const attrIndent = openLines[1]!.match(/^[ \t]*/)?.[0] ?? "";
          openLines.splice(1, 0, `${attrIndent}variant="unstyled"`);
        } else {
          // multilínea por HANDLER (onClick={() => {\n...) pero attrs inline
          // en línea 1: insertar variant inline tras <Button
          openLines[0] = openLines[0]!.replace(
            /<Button\b/,
            '<Button variant="unstyled"',
          );
        }
      }
      edits.push({
        start: opening.getStart(),
        end: opening.getEnd(),
        text: openLines.join("\n"),
      });

      // closing: </button> → </Button>
      if (closing) {
        edits.push({
          start: closing.getStart(),
          end: closing.getEnd(),
          text: "</Button>",
        });
      }
    } catch (err) {
      stats.errors++;
      console.error(`  ✗ ${rel}: ${(err as Error).message}`);
    }
  }

  for (const sc of selfClosing) {
    try {
      const range = full.slice(sc.getStart(), sc.getEnd());
      if (/\bvariant=/.test(range)) continue;
      const lines = range.split("\n");
      lines[0] = lines[0]!.replace(/<button\b/, "<Button");
      if (lines.length > 1 && /^[ \t]*[\w-]+=/.test(lines[1] ?? "")) {
        const attrIndent = lines[1]!.match(/^[ \t]*/)?.[0] ?? "";
        lines.splice(1, 0, `${attrIndent}variant="unstyled"`);
      } else {
        lines[0] = lines[0]!.replace(/<Button\b/, '<Button variant="unstyled"');
      }
      edits.push({ start: sc.getStart(), end: sc.getEnd(), text: lines.join("\n") });
    } catch (err) {
      stats.errors++;
      console.error(`  ✗ ${rel} (self-closing): ${(err as Error).message}`);
    }
  }

  if (edits.length === 0) continue;

  // ── aplicar en orden DESC (offsets nunca stale) + import ──
  let out = full;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  // import (si no hay binding Button previo — comillas simples o dobles)
  if (
    !/import\s+\{[^}]*\bButton\b[^}]*\}\s+from\s+['"]@\/shared\/components\/ui(?:\/Button)?['"]/.test(out) &&
    !out.includes('import { Button } from "@/shared/components/ui/Button";')
  ) {
    const imports = sf.getImportDeclarations();
    if (imports.length > 0) {
      const last = imports[imports.length - 1]!;
      out = out.slice(0, last.getEnd()) + '\nimport { Button } from "@/shared/components/ui/Button";' + out.slice(last.getEnd());
    } else {
      out = 'import { Button } from "@/shared/components/ui/Button";\n' + out;
    }
  }
  sf.replaceWithText(out);
  stats.swapped += pairs.length + selfClosing.length;
  const dir = rel.split("/").slice(0, 2).join("/");
  stats.byDir[dir] = (stats.byDir[dir] ?? 0) + pairs.length + selfClosing.length;
}

if (!DRY) project.saveSync();
console.log(JSON.stringify({ ...stats, byDir: undefined }, null, 2));
console.log(
  "byDir top:",
  Object.entries(stats.byDir)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([d, n]) => `${d}=${n}`)
    .join(" "),
);
if (stats.errors > 0) process.exitCode = 1;
