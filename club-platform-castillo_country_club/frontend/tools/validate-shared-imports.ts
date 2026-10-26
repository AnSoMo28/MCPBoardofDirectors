/**
 * validate-shared-imports.ts
 * frontend/tools/validate-shared-imports.ts
 *
 * @level       Level 6+ Agency · Apple/Xiaomi Production Grade · 2027
 * @namespace   tool-validator
 * @keyframes   0 (tool, not UI)
 * @depends     node:fs · node:path · node:url · ../architecture.manifest.ts (SSOT)
 *
 * SHARED IMPORT VALIDATOR v4.0.0 — Checklist I/J enforcement (Pilar 10)
 *
 * LINEAGE: repo v2.1 ⊕ AI-gen v1.0 → v3.0.0 FUSION (ledger §8) → v4.0.0
 * SENIOR HARDENED (ledger SV-1..SV-17 abajo; todos cerrados y verificados
 * por scripts/validator-verify/ — suite de ~47 checks sobre fixtures con
 * outcomes calculados a mano).
 *
 * SSOT TOTAL: TODO el conocimiento del registro vive en
 * ../architecture.manifest.ts. Este tool NO declara listas ni semántica de
 * resolución propias:
 *   - AUDITED_REGISTRY · normalizeSharedPath · AuditStatus   (v3.0.0+)
 *   - resolveAuditStatus · getAuditEntry                     (v3.1.0; si el
 *     manifest es más viejo, fallback local con la semántica PINEADA — SV-17)
 * El manifest se importa POR URL DINÁMICA (diagnóstico exit 3 limpio si
 * falta o rompe el contrato; además permite correr con `node` nativo ≥22.18
 * sin tsx, igual que con `npx tsx`).
 *
 * USAGE:
 *   npx tsx tools/validate-shared-imports.ts [options]
 *   --root <dir>               root de frontend/ (default: padre de tools/)
 *   --json                     reporte máquina
 *   --quiet                    solo resumen
 *   --strict                   promueve reverify-on-use a error
 *   --include-shared-internal  incluye consumidores dentro de shared/
 *   --dirs <a,b,c>             sustituye los dirs de consumidores
 *                              (default: features,app,stores [+shared con flag])
 *   --fix                      reescribe imports relativos→alias @shared/ (X-01)
 *   --dry-run                  con --fix: preview sin escribir
 *   --threshold <n>            score global mínimo (default 9.3; 0 desactiva)
 *   --audit-coverage           además: módulos de shared/ sin entry (warn VM-06)
 *   --omit-verified            --json: omite hits verified del array hits
 *   --max-report <n>           tope de entradas por sección humana (default 50)
 *   --verbose                  secciones sin tope + volcado del registro
 *   -h, --help                 esta ayuda
 *   (soporta --flag=valor; flag desconocido o valor inválido → exit 3)
 *
 * EXIT: 0 pass · 1 violaciones / threshold · 2 ilegible o interno · 3 config
 *
 * RESOLUCIÓN DE ESTADOS (DELEGADA al manifest §8 — SV-17):
 *   La precedencia es la del manifest v3.1.0 (resolveAuditStatus, pineada):
 *     1. hijo no-config pending            → pending  (bloqueo conservativo)
 *     2. entry exacto sin hijos no-config  → su status
 *     3. hijo no-config reverify-on-use    → reverify
 *     4. entry exacto                      → su status
 *     5. hijos no-config todos audited     → audited
 *     6. resto                             → unknown (J-09)
 *   v4 NO inventa herencia de ancestros (v3 lo hacía y enmascaraba módulos
 *   sin registrar — SV-2): un path profundo no registrado es J-09, que es
 *   exactamente lo que exige el Checklist J ("auditar y registrar antes de
 *   usar").
 *
 * VEREDICTOS:
 *   verified → silencioso · reverify → warn J-07 · pending → error J-10
 *   tracked (config) → informativo · unknown → error J-09
 *
 * TELEMETRÍA (nuevo — pipeline unificado con log-auditor):
 *   El JSON lleva `violations[]` con {rule, severity, file, line, message}
 *   (X-01 · J-07 · J-09 · J-10 · VM-06) + `byRule` + `score` — el mismo
 *   envelope de gobernanza que el architecture-guardian, para que el
 *   log-auditor pueda ingerir ambos con un solo contrato.
 *
 * SCORING (nuevo — SV-11):
 *   Por archivo consumidor con ≥1 shared import: 10 − 1.0·errores −
 *   0.25·warns (floor 0). Global = promedio. Threshold default 9.3 (el
 *   mismo bar del guardian); `--threshold 0` desactiva durante calibración.
 *
 * PRE-WRITE VERIFICATION (v4.0.0):
 * [x] Registro importado del manifest (SSOT) — cero listas locales
 * [x] Alias "@shared/x" mapeado al id-space real del registro ("shared/x")
 *     — SV-1: sin esto NINGÚN import por alias matcheaba el registro
 * [x] Resolución delegada a resolveAuditStatus del manifest — SV-17
 * [x] Extractor con lexer de estados: comentarios de bloque/línea, strings
 *     con contenido "from \"...\"", regexes /["']/g, JSX apóstrofes,
 *     require(), import() dinámico literal y template — SV-3/SV-4
 * [x] Intra-shared relativo NO es X-01 (cohesión interna) — SV-5
 * [x] Skips por SEGMENTO de path (my-node_modules/ ya no se salta) — SV-6
 * [x] Escaneo vacío → exit 3 (nunca PASS en vacío); src/ ausente → exit 3
 *     con diagnóstico exacto (no "entries fantasma") — SV-10
 * [x] Salida determinista; ilegibles = exit 2; sin process.exit post-stdout
 *     (exitCode — sin truncamiento en pipes) — SV-8
 * [x] --fix X-01 con cirugía posicional (comilla preservada, ext .css
 *     preservada, índices de atrás hacia adelante) — SV-15
 * [x] Score + threshold + envelope de telemetría — SV-11/SV-12
 *
 * SV LEDGER (auditoría v3.0.0 → v4.0.0; evidencia contra manifest v3.1.0):
 *   SV-1  CRÍTICA  id-space del alias roto: "@shared/ui" → normalize("ui")
 *        pero el registro es src-relative ("shared/components/ui") → todo
 *        import por alias caía en unknown/"no resuelve en disco".
 *   SV-2  ALTA     herencia de ancestros inventada enmascaraba módulos sin
 *        registrar (contradice J-09 y al resolver del manifest).
 *   SV-3  ALTA     regex de extracción sin conciencia de comentarios en
 *        bloque ni contenido de strings → FPs; require() y import(`tpl`)
 *        invisibles → FNs.
 *   SV-4  MEDIA    heurística "orphan" (`"@shared/x";` suelto) = vector de FP.
 *   SV-5  ALTA     X-01 falso con --include-shared-internal (relativos
 *        DENTRO de shared/ son cohesión, no consumidor).
 *   SV-6  MEDIA    INTERNAL_DIRS por substring: "my-node_modules/" se salta.
 *   SV-7  MEDIA    O(registry) por import + existsSync/statSync sin caché.
 *   SV-8  ALTA     process.exit() tras console.log trunca stdout en pipes
 *        (PowerShell/CI del usuario).
 *   SV-9  BAJA     verdictFromStatus sin default exhaustivo (drift futuro de
 *        AuditStatus → undefined.crash).
 *   SV-10 ALTA     escaneo vacío → PASS falso; src/ ausente → "ghost
 *        entries" engañosos en vez de exit 3 de config.
 *   SV-11 ALTA     sin score/threshold — desconectado del loop de gobernanza.
 *   SV-12 ALTA     sin envelope de telemetría — log-auditor no puede ingerir.
 *   SV-13 BAJA     salida humana sin tope (miles de líneas a escala real).
 *   SV-14 MEDIA    archivos raíz src/*.ts(x) nunca escaneados.
 *   SV-15 MEDIA    --fix ausente pese a X-100% mecánico (X-01 alias).
 *   SV-16 CRÍTICA  cero suite/harness: los "fixes" VC/VM eran afirmaciones,
 *        no evidencia.
 *   SV-17 BAJA     resolución duplicada en el tool (drift potencial §8) →
 *        v4 delega en el manifest.
 *
 * BREAKING CHANGES v4 (documentados, compensables con flags):
 *   - JSON: hits[].resolved → hits[].module (+ onDisk); nuevo violations[],
 *     byRule, score, fileScores, dynamicSkipped, omittedVerified, fixed.
 *   - Herencia de ancestros ELIMINADA (SV-2): paths profundos no
 *     registrados ahora son J-09 (antes: veredicto heredado suavizado).
 *   - Threshold default 9.3: un repo warn-only con score < 9.3 ahora FAIL
 *     (antes PASS). `--threshold 0` restaura el comportamiento v3.
 *   - Exit 3 nuevo para: root/src/shared ausentes, 0 consumidores, flags
 *     inválidos, contrato de manifest roto.
 *   - Archivos raíz src/*.ts(x) ahora escaneados (SV-14): pueden aparecer
 *     consumidores nuevos (correcto, no más reglas).
 *   - Los imports por alias ahora resuelven (SV-1): esperen MENOS unknown
 *     J-09 falsos y veredictos reales (incl. pending/tracked reales).
 */

/* ═══ §1  TYPES ═════════════════════════════════════════════ */

type Verdict = "verified" | "reverify" | "pending" | "tracked" | "unknown";

interface ImportRef {
  readonly specifier: string;
  readonly index: number;
  readonly end: number;
  readonly quote: string;
  readonly line: number;
}

interface ExtractResult {
  readonly refs: readonly ImportRef[];
  readonly dynamicSkipped: number;
}

interface SharedHit {
  readonly consumer: string;
  readonly line: number;
  readonly specifier: string;
  readonly module: string;
  readonly onDisk: boolean;
  readonly verdict: Verdict;
  readonly note: string;
}

interface AliasViolation {
  readonly consumer: string;
  readonly line: number;
  readonly specifier: string;
  readonly suggestion: string;
}

interface ConsistencyIssue {
  readonly entry: string;
  readonly issue: string;
  readonly severity: "error" | "warn";
}

interface ReadError {
  readonly file: string;
  readonly reason: string;
}

interface FileScore {
  readonly file: string;
  readonly errors: number;
  readonly warns: number;
  readonly score: number;
}

interface TelemetryViolation {
  readonly rule: string;
  readonly severity: "error" | "warn";
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

interface FixOp {
  readonly fileAbs: string;
  readonly fileRel: string;
  readonly line: number;
  readonly index: number;
  readonly end: number;
  readonly quote: string;
  readonly oldSpec: string;
  readonly newSpec: string;
}

interface FixResult {
  readonly files: number;
  readonly imports: number;
  readonly skipped: number;
  readonly dryRun: boolean;
  readonly details: readonly string[];
}

interface ScoreBlock {
  readonly global: number;
  readonly threshold: number;
  readonly filesScored: number;
  readonly belowThreshold: readonly string[];
}

interface ValidatorReport {
  readonly tool: "validate-shared-imports";
  readonly version: string;
  readonly root: string;
  readonly generatedAt: string;
  readonly consumersScanned: number;
  readonly sharedImports: number;
  readonly dynamicSkipped: number;
  readonly counts: Readonly<Record<Verdict, number>>;
  readonly byRule: Readonly<Record<string, number>>;
  readonly errors: number;
  readonly warnings: number;
  readonly score: ScoreBlock;
  readonly fileScores: readonly FileScore[];
  readonly hits: readonly SharedHit[];
  readonly omittedVerified: number;
  readonly aliasViolations: readonly AliasViolation[];
  readonly consistency: readonly ConsistencyIssue[];
  readonly readErrors: readonly ReadError[];
  readonly violations: readonly TelemetryViolation[];
  readonly fixed: FixResult | null;
  readonly durationMs: number;
  readonly passed: boolean;
}

interface ValidationOutcome {
  readonly consumersScanned: number;
  readonly hits: readonly SharedHit[];
  readonly aliasViolations: readonly AliasViolation[];
  readonly readErrors: readonly ReadError[];
  readonly dynamicSkipped: number;
  readonly fixResult: FixResult | null;
}

interface CliOptions {
  readonly root: string;
  readonly json: boolean;
  readonly quiet: boolean;
  readonly strict: boolean;
  readonly includeSharedInternal: boolean;
  readonly verbose: boolean;
  readonly failOnWarn: boolean;
  readonly fix: boolean;
  readonly dryRun: boolean;
  readonly threshold: number;
  readonly auditCoverage: boolean;
  readonly omitVerified: boolean;
  readonly maxReport: number;
  readonly dirs: readonly string[] | null;
}

interface RegistryEntry {
  readonly path: string;
  readonly status: AuditStatus;
  readonly notes?: string;
}

type Classification =
  | { readonly kind: "shared"; readonly normalized: string }
  | { readonly kind: "relative-shared"; readonly normalized: string; readonly ext: string; readonly suggestion: string }
  | { readonly kind: "internal-shared" }
  | { readonly kind: "other" };

/* ═══ §2  MANIFEST LOAD (SSOT — dynamic import) ════════════ */

import type { AuditStatus } from "../architecture.manifest";

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Resolved = { readonly verdict: Verdict; readonly note: string };

let AUDITED_REGISTRY: readonly RegistryEntry[] = [];
let normalizeSharedPath: (path: string) => string = (p) => p;
let resolveAuditStatusFn: ((normalizedPath: string) => AuditStatus | "unknown") | null = null;
let getAuditEntryFn: ((normalizedPath: string) => RegistryEntry | undefined) | null = null;

async function loadManifest(): Promise<void> {
  const manifestPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "architecture.manifest.ts");
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(manifestPath).href)) as Record<string, unknown>;
  } catch (err) {
    console.error(
      `config error: no se pudo cargar el manifest → ${manifestPath}\n  ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(3);
  }
  const registry = mod.AUDITED_REGISTRY;
  const normalize = mod.normalizeSharedPath;
  if (!Array.isArray(registry) || typeof normalize !== "function") {
    console.error(
      `config error: contrato del manifest roto → ${manifestPath}\n` +
        `  se requieren AUDITED_REGISTRY (array) y normalizeSharedPath (function)`,
    );
    process.exit(3);
  }
  AUDITED_REGISTRY = registry as readonly RegistryEntry[];
  normalizeSharedPath = normalize as (p: string) => string;
  resolveAuditStatusFn = typeof mod.resolveAuditStatus === "function"
    ? (mod.resolveAuditStatus as (p: string) => AuditStatus | "unknown")
    : null;
  getAuditEntryFn = typeof mod.getAuditEntry === "function"
    ? (mod.getAuditEntry as (p: string) => RegistryEntry | undefined)
    : null;
}

/** Semántica PINEADA del manifest v3.1.0 §8 — solo si el manifest no exporta resolveAuditStatus. */
function localResolveAuditStatus(normalizedPath: string): AuditStatus | "unknown" {
  const exact = AUDITED_REGISTRY.find((e) => e.path === normalizedPath);
  const children = AUDITED_REGISTRY.filter(
    (e) => e.path.startsWith(`${normalizedPath}/`) && e.status !== "config",
  );
  if (children.some((c) => c.status === "pending")) return "pending";
  if (exact && children.length === 0) return exact.status;
  if (children.some((c) => c.status === "reverify-on-use")) return "reverify-on-use";
  if (exact) return exact.status;
  return children.length > 0 ? "audited" : "unknown";
}

function getAuditEntry(normalizedPath: string): RegistryEntry | undefined {
  if (getAuditEntryFn !== null) return getAuditEntryFn(normalizedPath);
  return AUDITED_REGISTRY.find((e) => e.path === normalizedPath);
}

function resolveAuditStatus(normalizedPath: string): AuditStatus | "unknown" {
  if (resolveAuditStatusFn !== null) return resolveAuditStatusFn(normalizedPath);
  return localResolveAuditStatus(normalizedPath);
}

/* ═══ §3  CONSTANTS ════════════════════════════════════════ */

const TOOL_VERSION = "4.0.0";

const CONSUMER_DIRS_DEFAULT: readonly string[] = ["features", "app", "stores"];
const CONSUMER_DIRS_EXTENDED: readonly string[] = ["features", "app", "stores", "shared"];

/** SV-6: skips por SEGMENTO de path, no por substring. */
const SKIP_SEGMENTS: ReadonlySet<string> = new Set([
  "node_modules", "dist", "build", "htmlcov", ".pytest_cache", "coverage", "__tests__",
]);

const SHARED_PREFIXES: readonly string[] = ["@shared/", "@/shared/"];

const SPEC_EXT_RE = /\.(css|scss|sass|less|svg|png|jpg|jpeg|json)$/;

const DEFAULT_THRESHOLD = 9.3;
const DEFAULT_MAX_REPORT = 50;

const WARN_PENALTY = 0.25;

const TS_FILE_RE = /\.(ts|tsx)$/;

/* ═══ §4  CLI ══════════════════════════════════════════════ */

const USAGE = [
  "Uso: npx tsx tools/validate-shared-imports.ts [options]",
  "  --root <dir>               root de frontend/ (default: padre de tools/)",
  "  --json                     reporte máquina (JSON)",
  "  --quiet                    solo resumen",
  "  --strict                   promueve reverify-on-use a error",
  "  --fail-on-warn             exit 1 también con warnings",
  "  --include-shared-internal  incluye consumidores dentro de shared/",
  "  --dirs <a,b,c>             sustituye los dirs de consumidores (default features,app,stores)",
  "  --fix                      reescribe imports relativos → alias @shared/ (X-01)",
  "  --dry-run                  con --fix: preview sin escribir",
  "  --threshold <n>            score global mínimo (default 9.3; 0 desactiva)",
  "  --audit-coverage           además: módulos de shared/ sin entry en el registro (warn)",
  "  --omit-verified            --json: omite hits verified del array hits",
  "  --max-report <n>           tope de entradas por sección humana (default 50)",
  "  --verbose                  secciones sin tope + volcado del registro",
  "  -h, --help                 esta ayuda",
  "EXIT: 0 pass · 1 violaciones/threshold · 2 ilegible/interno · 3 config",
].join("\n");

const VALUE_FLAGS: ReadonlySet<string> = new Set(["--root", "--threshold", "--max-report", "--dirs"]);
const BOOL_FLAGS: ReadonlySet<string> = new Set([
  "--json", "--quiet", "--strict", "--include-shared-internal", "--verbose",
  "--fail-on-warn", "--fix", "--dry-run", "--audit-coverage", "--omit-verified",
]);

function failConfig(message: string): never {
  console.error(`config error: ${message}\n\n${USAGE}`);
  process.exit(3);
}

function parseNumber(name: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    failConfig(`${name} espera un número ≥ 0 — recibido: «${raw}»`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const bools = new Set<string>();
  const values = new Map<string, string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    }
    if (!arg.startsWith("--")) failConfig(`argumento inesperado: «${arg}»`);
    const eq = arg.indexOf("=");
    if (eq > 0) {
      const key = arg.slice(0, eq);
      if (!VALUE_FLAGS.has(key)) failConfig(`${key} no acepta la forma --flag=valor`);
      values.set(key, arg.slice(eq + 1));
      continue;
    }
    if (VALUE_FLAGS.has(arg)) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) failConfig(`${arg} requiere un valor`);
      values.set(arg, next);
      i++;
      continue;
    }
    if (BOOL_FLAGS.has(arg)) {
      bools.add(arg);
      continue;
    }
    failConfig(`flag desconocido: «${arg}»`);
  }

  const toolDir = dirname(fileURLToPath(import.meta.url));
  const rootRaw = values.get("--root") ?? join(toolDir, "..");
  const threshold = values.has("--threshold")
    ? parseNumber("--threshold", values.get("--threshold") as string)
    : DEFAULT_THRESHOLD;
  const maxReport = values.has("--max-report")
    ? parseNumber("--max-report", values.get("--max-report") as string)
    : DEFAULT_MAX_REPORT;
  const dirsRaw = values.get("--dirs");
  const dirs = dirsRaw !== undefined
    ? dirsRaw.split(",").map((d) => d.trim()).filter((d) => d.length > 0)
    : null;
  if (dirs !== null && dirs.length === 0) failConfig("--dirs recibió una lista vacía");

  return {
    root: toPosix(resolve(rootRaw)),
    json: bools.has("--json"),
    quiet: bools.has("--quiet"),
    strict: bools.has("--strict"),
    includeSharedInternal: bools.has("--include-shared-internal"),
    verbose: bools.has("--verbose"),
    failOnWarn: bools.has("--fail-on-warn"),
    fix: bools.has("--fix"),
    dryRun: bools.has("--dry-run"),
    threshold,
    auditCoverage: bools.has("--audit-coverage"),
    omitVerified: bools.has("--omit-verified"),
    maxReport: Math.floor(maxReport),
    dirs,
  };
}

/* ═══ §5  HELPERS ══════════════════════════════════════════ */

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

/** SV-6: segmento a segmento — "my-node_modules" ya no se salta. */
function isSkippedPath(rel: string): boolean {
  return rel.split("/").some((segment) => SKIP_SEGMENTS.has(segment));
}

function walk(dir: string, srcRoot: string, out: string[], extRe: RegExp): void {
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = join(current, entry.name);
      const rel = toPosix(relative(srcRoot, abs));
      if (isSkippedPath(rel)) continue;
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (extRe.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
        out.push(rel);
      }
    }
  }
}

/** SV-14: archivos raíz src/*.ts(x) — consumidores de pleno derecho. */
function collectRootFiles(srcRoot: string, out: string[]): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(srcRoot, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (SKIP_SEGMENTS.has(entry.name)) continue;
    if (TS_FILE_RE.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(entry.name);
  }
}

/** SV-7: caché de resolución FS — una syscall por módulo único, no por import. */
const diskCache = new Map<string, boolean>();

function moduleExists(srcRoot: string, normalized: string): boolean {
  const cached = diskCache.get(normalized);
  if (cached !== undefined) return cached;
  const base = join(srcRoot, normalized);
  const candidates: readonly string[] = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.css`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    join(base, "index.css"),
  ];
  let ok = false;
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) {
        ok = true;
        break;
      }
    } catch {
      // candidato inexistente — siguiente
    }
  }
  diskCache.set(normalized, ok);
  return ok;
}

/* ═══ §6  EXTRACTOR (lexer de estados — SV-3/SV-4) ════════ */

/**
 * Recorre el archivo carácter a carácter con estados (código / comentario
 * de línea / comentario de bloque / string / template) y captura el
 * specifier SOLO cuando un token armado lo precede:
 *   import "x" · import("x") · require("x") · … from "x"
 * Cobertura que la regex de v3 no tenía:
 *   - import dentro de comentarios de bloque → ignorado (FP eliminado)
 *   - 'learned from "@shared/fake"' en string → ignorado (FP eliminado)
 *   - require() e import() dinámico literal → capturados (FN eliminado)
 *   - import(`tpl`) → contado como dynamicSkipped, no capturado
 *   - /["']/g (regex literal) no rompe el parseo
 *   - apóstrofes de JSX ("it's") no abren strings
 *   - import multilínea y quoted export names ({"a" as b}) correctos
 * Limitaciones documentadas (FN benigno, nunca FP): template dinámico,
 * import(variable), strings anidados en template ${} a doble nivel.
 */
function captureString(content: string, start: number, quote: string): { value: string; end: number; closed: boolean } {
  let j = start + 1;
  const n = content.length;
  while (j < n) {
    if (content[j] === "\\") {
      j += 2;
      continue;
    }
    if (content[j] === quote) return { value: content.slice(start + 1, j), end: j + 1, closed: true };
    if (content[j] === "\n") return { value: content.slice(start + 1, j), end: j, closed: false };
    j++;
  }
  return { value: content.slice(start + 1, j), end: j, closed: false };
}

function consumeTemplate(content: string, start: number): { end: number; newlines: number } {
  let j = start + 1;
  let nl = 0;
  let depth = 0;
  const n = content.length;
  while (j < n) {
    const t = content[j];
    if (t === "\\") {
      j += 2;
      continue;
    }
    if (t === "\n") {
      nl++;
      j++;
      continue;
    }
    if (t === "`" && depth === 0) return { end: j + 1, newlines: nl };
    if (t === "$" && content[j + 1] === "{") {
      depth++;
      j += 2;
      continue;
    }
    if (t === "}" && depth > 0) {
      depth--;
      j++;
      continue;
    }
    if (depth > 0 && (t === '"' || t === "'")) {
      const q = t;
      j++;
      while (j < n && content[j] !== q) {
        if (content[j] === "\\") j++;
        if (content[j] === "\n") nl++;
        j++;
      }
      j++;
      continue;
    }
    j++;
  }
  return { end: j, newlines: nl };
}

type Arm = "import" | "from" | "require" | "call-import" | "call-require" | "await-from";

function extractImportRefs(content: string): ExtractResult {
  const refs: ImportRef[] = [];
  let dynamicSkipped = 0;
  let arm: Arm | null = null;
  let i = 0;
  let line = 1;
  let prev = ""; // último carácter significativo (ws/comentarios no cuentan)
  const n = content.length;

  const blockedStringStart = (): boolean => /[A-Za-z0-9_)\]'"`]/.test(prev);

  while (i < n) {
    const c = content[i];

    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "\uFEFF") {
      i++;
      continue;
    }

    // ── comentarios (los comentarios no alteran prev) ──
    if (c === "/" && content[i + 1] === "/") {
      while (i < n && content[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && content[i + 1] === "*") {
      i += 2;
      while (i < n && !(content[i] === "*" && content[i + 1] === "/")) {
        if (content[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }

    // ── regex literal vs división ──
    if (c === "/" && prev !== "." && prev !== "<" && !blockedStringStart()) {
      let inClass = false;
      let j = i + 1;
      while (j < n) {
        const r = content[j];
        if (r === "\\") {
          j += 2;
          continue;
        }
        if (r === "\n") break; // regex no puede ser multilinea → división
        if (r === "[") inClass = true;
        else if (r === "]") inClass = false;
        else if (r === "/" && !inClass) break;
        j++;
      }
      if (j < n && content[j] === "/") {
        j++;
        while (j < n && /[a-z]/.test(content[j])) j++; // flags
        i = j;
      } else {
        i++;
      }
      prev = "/";
      continue;
    }

    // ── template literal ──
    if (c === "`") {
      if (arm === "call-import") dynamicSkipped++;
      const consumed = consumeTemplate(content, i);
      line += consumed.newlines;
      i = consumed.end;
      prev = "`";
      if (arm === "call-import" || arm === "import") arm = null;
      continue;
    }

    // ── strings ──
    if (c === '"' || c === "'") {
      const quote = c;
      const captureNow =
        arm === "import" || arm === "from" || arm === "call-import" || arm === "call-require";
      if (captureNow || !blockedStringStart()) {
        const res = captureString(content, i, quote);
        if (captureNow && res.closed) {
          refs.push({ specifier: res.value, index: i, end: res.end, quote, line });
          arm = null;
        } else if (captureNow && !res.closed) {
          arm = null; // string sin cerrar: no confiable
        }
        i = res.end;
      } else {
        // apóstrofe/comilla textual (JSX "it's") — un carácter, nada más
        i++;
      }
      prev = quote;
      continue;
    }

    // ── palabras ──
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(content[j])) j++;
      const word = content.slice(i, j);
      if (prev !== ".") {
        // x.from / x.import (property access) nunca arma
        if (word === "import") {
          arm = "import";
        } else if (word === "from" || word === "require") {
          arm = word;
        } else if (arm === "import") {
          arm = "await-from"; // import x / import type {…} — esperar `from`
        } else if (arm === "call-import" || arm === "call-require") {
          if (arm === "call-import") dynamicSkipped++; // import(variable)
          arm = null;
        }
        // await-from / from / require sobreviven a tokens intermedios válidos
      }
      i = j;
      prev = word[word.length - 1];
      continue;
    }

    // ── puntuación ──
    if (c === ";") {
      arm = null;
    } else if (c === "(") {
      if (arm === "import") arm = "call-import";
      else if (arm === "require") arm = "call-require";
      else if (arm !== "call-import" && arm !== "call-require") arm = null;
    } else if (c === ")" || c === "," || c === "}" || c === "]") {
      if (arm === "call-import" || arm === "call-require") arm = null;
      // await-from sobrevive: `import { a, b } from "x"`
    } else {
      if (arm === "import") arm = "await-from"; // import { · import *
      else if (arm === "from" || arm === "require") arm = null;
    }
    i++;
    prev = c;
    continue;
  }

  return { refs, dynamicSkipped };
}

/* ═══ §7  CLASSIFICATION ═══════════════════════════════════ */

function classify(spec: string, importerRel: string, srcRoot: string): Classification {
  for (const prefix of SHARED_PREFIXES) {
    if (spec.startsWith(prefix)) {
      // SV-1: el id-space del registro es src-relative ("shared/...").
      // "@shared/ui" → "shared/ui" ANTES de normalizar; sin este prepend
      // ningún import por alias matchea jamás AUDITED_REGISTRY.
      const normalized = normalizeSharedPath(`shared/${spec.slice(prefix.length)}`);
      return { kind: "shared", normalized };
    }
  }
  if (spec.startsWith(".")) {
    const abs = resolve(srcRoot, dirname(importerRel), spec);
    const relToSrc = toPosix(relative(srcRoot, abs));
    if (relToSrc === "shared" || relToSrc.startsWith("shared/")) {
      if (importerRel === "shared" || importerRel.startsWith("shared/")) {
        return { kind: "internal-shared" }; // SV-5: cohesión interna de shared/
      }
      const normalized = normalizeSharedPath(relToSrc);
      const ext = SPEC_EXT_RE.exec(spec)?.[0] ?? "";
      const aliasTarget = normalized.startsWith("shared/")
        ? normalized.slice("shared/".length)
        : normalized;
      return {
        kind: "relative-shared",
        normalized,
        ext,
        suggestion: `Usar alias: import ... from "@shared/${aliasTarget}${ext}"`,
      };
    }
  }
  return { kind: "other" };
}

/* ═══ §8  VERDICT RESOLUTION (delegada al manifest — SV-17) ═ */

/** SV-7: caché por módulo único — resolveAuditStatus se llama una vez por path. */
const verdictCache = new Map<string, Resolved>();

function statusToVerdict(status: AuditStatus | "unknown", exact: RegistryEntry | undefined): Resolved {
  switch (status) {
    case "audited":
      return { verdict: "verified", note: exact?.notes ?? "auditado (manifest §8)" };
    case "reverify-on-use":
      return { verdict: "reverify", note: exact?.notes ?? "re-verificar API al primer uso (Checklist J-07)" };
    case "pending": {
      const barrelBlocked = exact === undefined || exact.status !== "pending";
      return {
        verdict: "pending",
        note: barrelBlocked
          ? "barrel bloqueado por hijo pending (J-10) — ver PENDING_AUDIT del manifest"
          : exact?.notes ?? "pendiente de auditoría — bloquea al consumidor (J-10)",
      };
    }
    case "config":
      return { verdict: "tracked", note: exact?.notes ?? "módulo trackeado — gate propio (manifest MODULES/ROLLOUT)" };
    case "unknown":
      return { verdict: "unknown", note: "fuera de AUDITED_REGISTRY (J-09) — auditar y registrar antes de usar" };
    default:
      // SV-9: fail-safe ante drift futuro de AuditStatus
      return { verdict: "unknown", note: `status no reconocido «${String(status)}» — actualizar tool (fail-safe J-09)` };
  }
}

function resolveVerdict(normalized: string): Resolved {
  const cached = verdictCache.get(normalized);
  if (cached !== undefined) return cached;
  const exact = getAuditEntry(normalized);
  const status = resolveAuditStatus(normalized);
  const result = statusToVerdict(status, exact);
  verdictCache.set(normalized, result);
  return result;
}

/* ═══ §9  REGISTRY CONSISTENCY ═════════════════════════════ */

function checkRegistryConsistency(srcRoot: string, auditCoverage: boolean): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const seen = new Set<string>();
  for (const entry of AUDITED_REGISTRY) {
    if (typeof entry?.path !== "string" || typeof entry?.status !== "string") {
      issues.push({ entry: String(entry?.path), issue: "entrada malformada (path/status)", severity: "error" });
      continue;
    }
    if (seen.has(entry.path)) {
      issues.push({ entry: entry.path, issue: "entrada duplicada en AUDITED_REGISTRY", severity: "error" });
    }
    seen.add(entry.path);
    if (/\.(ts|tsx|css)$/.test(entry.path)) {
      issues.push({ entry: entry.path, issue: "el registro exige paths sin extensión (normalizeSharedPath)", severity: "error" });
    }
    if (!moduleExists(srcRoot, entry.path)) {
      issues.push({ entry: entry.path, issue: "no existe en disco — entry fantasma o path desactualizado", severity: "error" });
    }
  }
  if (auditCoverage) {
    const files: string[] = [];
    const sharedRoot = join(srcRoot, "shared");
    if (existsSync(sharedRoot)) walk(sharedRoot, srcRoot, files, /\.(ts|tsx|css)$/);
    const registered = [...seen];
    for (const file of files.sort()) {
      const normalized = normalizeSharedPath(file);
      const covered =
        seen.has(normalized) || registered.some((p) => normalized.startsWith(`${p}/`));
      if (!covered) {
        issues.push({
          entry: normalized,
          issue: "módulo en shared/ sin entry en AUDITED_REGISTRY (cobertura del registro)",
          severity: "warn",
        });
      }
    }
  }
  return issues;
}

/* ═══ §10  VALIDATION ══════════════════════════════════════ */

function applyFixes(ops: readonly FixOp[], skipped: number, dryRun: boolean): FixResult {
  const byFile = new Map<string, FixOp[]>();
  for (const op of ops) {
    const list = byFile.get(op.fileAbs) ?? [];
    list.push(op);
    byFile.set(op.fileAbs, list);
  }
  let imports = 0;
  let files = 0;
  const details: string[] = [];
  for (const [fileAbs, list] of byFile) {
    // de atrás hacia adelante: los índices previos siguen válidos (SV-15)
    list.sort((a, b) => b.index - a.index);
    let content: string;
    try {
      content = readFileSync(fileAbs, "utf8");
    } catch {
      skipped += list.length;
      continue;
    }
    let changed = false;
    for (const op of list) {
      const candidate = `${content.slice(0, op.index + 1)}${op.newSpec}${content.slice(op.end - 1)}`;
      if (candidate !== content) {
        content = candidate;
        changed = true;
        imports++;
      }
      details.push(`${op.fileRel}:${op.line}  ${op.quote}${op.oldSpec}${op.quote} → ${op.quote}${op.newSpec}${op.quote}`);
    }
    if (changed) {
      files++;
      if (!dryRun) writeFileSync(fileAbs, content, "utf8");
    }
  }
  return { files, imports, skipped, dryRun, details };
}

function validate(root: string, opts: CliOptions): ValidationOutcome {
  const srcRoot = join(root, "src");
  let dirs = opts.dirs ?? (opts.includeSharedInternal ? CONSUMER_DIRS_EXTENDED : CONSUMER_DIRS_DEFAULT);
  if (opts.includeSharedInternal && opts.dirs !== null && !dirs.includes("shared")) {
    dirs = [...dirs, "shared"];
  }

  const consumers: string[] = [];
  for (const dirName of dirs) {
    const dir = join(srcRoot, dirName);
    if (existsSync(dir)) walk(dir, srcRoot, consumers, TS_FILE_RE);
  }
  collectRootFiles(srcRoot, consumers);
  consumers.sort();

  const hits: SharedHit[] = [];
  const aliasViolations: AliasViolation[] = [];
  const readErrors: ReadError[] = [];
  const fixOps: FixOp[] = [];
  let fixSkipped = 0;
  let dynamicSkipped = 0;

  for (const rel of consumers) {
    const abs = join(srcRoot, rel);
    let content: string;
    try {
      content = readFileSync(abs, "utf8");
    } catch (err) {
      // SV-10/VM-5: ilegible = blocking, jamás silencioso
      readErrors.push({ file: `src/${rel}`, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }

    const extraction = extractImportRefs(content);
    dynamicSkipped += extraction.dynamicSkipped;

    for (const ref of extraction.refs) {
      const cl = classify(ref.specifier, rel, srcRoot);
      if (cl.kind === "other" || cl.kind === "internal-shared") continue;

      if (cl.kind === "relative-shared") {
        aliasViolations.push({
          consumer: `src/${rel}`,
          line: ref.line,
          specifier: ref.specifier,
          suggestion: cl.suggestion,
        });
        if (opts.fix) {
          if (moduleExists(srcRoot, cl.normalized)) {
            const aliasTarget = cl.normalized.startsWith("shared/")
              ? cl.normalized.slice("shared/".length)
              : cl.normalized;
            fixOps.push({
              fileAbs: abs,
              fileRel: `src/${rel}`,
              line: ref.line,
              index: ref.index,
              end: ref.end,
              quote: ref.quote,
              oldSpec: ref.specifier,
              newSpec: `@shared/${aliasTarget}${cl.ext}`,
            });
          } else {
            fixSkipped++; // target roto: cirugía mecánica no aplica
          }
        }
        continue;
      }

      const onDisk = moduleExists(srcRoot, cl.normalized);
      const resolved: Resolved = onDisk
        ? resolveVerdict(cl.normalized)
        : { verdict: "unknown", note: "módulo no resuelve en disco (path roto o renombrado)" };
      hits.push({
        consumer: `src/${rel}`,
        line: ref.line,
        specifier: ref.specifier,
        module: cl.normalized,
        onDisk,
        verdict: resolved.verdict,
        note: resolved.note,
      });
    }
  }

  const fixResult = opts.fix ? applyFixes(fixOps, fixSkipped, opts.dryRun) : null;

  return { consumersScanned: consumers.length, hits, aliasViolations, readErrors, dynamicSkipped, fixResult };
}

/* ═══ §11  REPORT ══════════════════════════════════════════ */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildReport(
  root: string,
  outcome: ValidationOutcome,
  consistency: readonly ConsistencyIssue[],
  opts: CliOptions,
  durationMs: number,
): ValidatorReport {
  const counts: Record<Verdict, number> = { verified: 0, reverify: 0, pending: 0, tracked: 0, unknown: 0 };
  for (const hit of outcome.hits) counts[hit.verdict] += 1;

  const consistencyErrors = consistency.filter((c) => c.severity === "error").length;
  const consistencyWarns = consistency.filter((c) => c.severity === "warn").length;

  const errors =
    counts.pending +
    counts.unknown +
    outcome.aliasViolations.length +
    consistencyErrors +
    (opts.strict ? counts.reverify : 0);
  const warnings = (opts.strict ? 0 : counts.reverify) + consistencyWarns;

  // ── score por archivo (SV-11) ──
  const perFile = new Map<string, { errors: number; warns: number }>();
  const bump = (file: string, err: number, warn: number): void => {
    const cur = perFile.get(file) ?? { errors: 0, warns: 0 };
    cur.errors += err;
    cur.warns += warn;
    perFile.set(file, cur);
  };
  for (const hit of outcome.hits) {
    if (hit.verdict === "pending" || hit.verdict === "unknown") bump(hit.consumer, 1, 0);
    else if (hit.verdict === "reverify") bump(hit.consumer, 0, 1);
    else bump(hit.consumer, 0, 0); // verified/tracked: entra al promedio con score 10
  }
  for (const alias of outcome.aliasViolations) bump(alias.consumer, 1, 0);

  const fileScores: FileScore[] = [...perFile.entries()]
    .map(([file, agg]) => ({
      file,
      errors: agg.errors,
      warns: agg.warns,
      score: Math.max(0, round2(10 - agg.errors - WARN_PENALTY * agg.warns)),
    }))
    .sort((a, b) => a.score - b.score || a.file.localeCompare(b.file));

  const global = fileScores.length > 0
    ? round2(fileScores.reduce((sum, s) => sum + s.score, 0) / fileScores.length)
    : 10;
  const belowThreshold = opts.threshold > 0
    ? fileScores.filter((s) => s.score < opts.threshold).map((s) => s.file)
    : [];

  // ── envelope de telemetría (SV-12) ──
  const violations: TelemetryViolation[] = [
    ...outcome.aliasViolations.map<TelemetryViolation>((a) => ({
      rule: "X-01", severity: "error", file: a.consumer, line: a.line, message: a.suggestion,
    })),
    ...outcome.hits.filter((h) => h.verdict === "pending").map<TelemetryViolation>((h) => ({
      rule: "J-10", severity: "error", file: h.consumer, line: h.line, message: h.note,
    })),
    ...outcome.hits.filter((h) => h.verdict === "unknown").map<TelemetryViolation>((h) => ({
      rule: "J-09", severity: "error", file: h.consumer, line: h.line, message: h.note,
    })),
    ...outcome.hits.filter((h) => h.verdict === "reverify").map<TelemetryViolation>((h) => ({
      rule: "J-07", severity: "warn", file: h.consumer, line: h.line, message: h.note,
    })),
    ...consistency.map<TelemetryViolation>((c) => ({
      rule: "VM-06", severity: c.severity, file: "architecture.manifest.ts", line: 0,
      message: `${c.entry} — ${c.issue}`,
    })),
  ].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));

  const byRule: Record<string, number> = { "X-01": 0, "J-07": 0, "J-09": 0, "J-10": 0, "VM-06": 0 };
  for (const v of violations) byRule[v.rule] += 1;

  const hitsOut = opts.omitVerified
    ? outcome.hits.filter((h) => h.verdict !== "verified")
    : outcome.hits;

  const passed =
    errors === 0 &&
    outcome.readErrors.length === 0 &&
    (!opts.failOnWarn || warnings === 0) &&
    (opts.threshold <= 0 || global >= opts.threshold);

  return {
    tool: "validate-shared-imports",
    version: TOOL_VERSION,
    root,
    generatedAt: new Date().toISOString(),
    consumersScanned: outcome.consumersScanned,
    sharedImports: outcome.hits.length,
    dynamicSkipped: outcome.dynamicSkipped,
    counts,
    byRule,
    errors,
    warnings,
    score: { global, threshold: opts.threshold, filesScored: fileScores.length, belowThreshold },
    fileScores,
    hits: [...hitsOut].sort(
      (a, b) => a.consumer.localeCompare(b.consumer) || a.line - b.line || a.specifier.localeCompare(b.specifier),
    ),
    omittedVerified: opts.omitVerified ? counts.verified : 0,
    aliasViolations: [...outcome.aliasViolations].sort(
      (a, b) => a.consumer.localeCompare(b.consumer) || a.line - b.line,
    ),
    consistency: [...consistency].sort((a, b) => a.entry.localeCompare(b.entry)),
    readErrors: [...outcome.readErrors].sort((a, b) => a.file.localeCompare(b.file)),
    violations,
    fixed: outcome.fixResult,
    durationMs,
    passed,
  };
}

/* ═══ §12  HUMAN OUTPUT ════════════════════════════════════ */

function reportHuman(report: ValidatorReport, quiet: boolean, verbose: boolean, maxReport: number): string {
  const lines: string[] = [];
  lines.push(`SHARED IMPORT VALIDATOR v${report.version} — root: ${report.root}`);
  lines.push(
    `consumers: ${report.consumersScanned} · shared imports: ${report.sharedImports} · ` +
      `dynamic skipped: ${report.dynamicSkipped} · errors: ${report.errors} · ` +
      `warnings: ${report.warnings} · ${report.durationMs}ms`,
  );

  const cap = (title: string, rows: readonly string[]): void => {
    if (rows.length === 0) return;
    lines.push("");
    lines.push(title);
    const limit = verbose ? rows.length : Math.min(rows.length, maxReport);
    for (const row of rows.slice(0, limit)) lines.push(row);
    if (!verbose && rows.length > limit) {
      lines.push(`  … y ${rows.length - limit} más (ver --json o --verbose)`);
    }
  };

  if (!quiet) {
    const hitRows = (filter: (v: Verdict) => boolean, tag: string): string[] =>
      report.hits.filter((h) => filter(h.verdict)).map((h) =>
        [
          `  ${h.consumer}:${h.line}  ${h.specifier}`,
          `      module: ${h.module}${h.onDisk ? "" : " (no resuelve en disco)"} · ${h.note}${tag}`,
        ].join("\n"),
      );

    cap("PENDING AUDIT (J-10 — error)", hitRows((v) => v === "pending", ""));
    cap("NOT IN REGISTRY (J-09 — error)", hitRows((v) => v === "unknown", ""));
    cap("RE-VERIFY ON USE (J-07 — warn)", hitRows((v) => v === "reverify", ""));

    cap(
      "RELATIVE SHARED IMPORTS (X-01 — error: usar alias @shared/)",
      report.aliasViolations.map((v) =>
        [`  ${v.consumer}:${v.line}  ${v.specifier}`, `      → ${v.suggestion}`].join("\n"),
      ),
    );

    cap(
      "REGISTRY CONSISTENCY (VM-06)",
      report.consistency.map((c) => `  [${c.severity}] ${c.entry} — ${c.issue}`),
    );

    cap(
      "READ ERRORS (blocking)",
      report.readErrors.map((r) => `  ${r.file} — ${r.reason}`),
    );

    if (report.fixed !== null && (report.fixed.imports > 0 || report.fixed.skipped > 0)) {
      cap(
        report.fixed.dryRun ? `PLANNED FIXES — X-01 (${report.fixed.imports}, dry-run)` : `APPLIED FIXES — X-01 (${report.fixed.imports})`,
        report.fixed.details.map((d) => `  ${d}`),
      );
    }
  }

  lines.push("");
  lines.push("SUMMARY");
  lines.push(
    `  verified: ${report.counts.verified} · reverify: ${report.counts.reverify} · ` +
      `pending: ${report.counts.pending} · tracked: ${report.counts.tracked} · ` +
      `unknown: ${report.counts.unknown}`,
  );
  lines.push(
    `  alias: ${report.aliasViolations.length} · consistency: ${report.consistency.length} · ` +
      `read errors: ${report.readErrors.length}`,
  );
  lines.push(
    `  byRule: X-01=${report.byRule["X-01"]} · J-07=${report.byRule["J-07"]} · ` +
      `J-09=${report.byRule["J-09"]} · J-10=${report.byRule["J-10"]} · VM-06=${report.byRule["VM-06"]}`,
  );

  lines.push("");
  lines.push("SCORE");
  lines.push(
    `  global: ${report.score.global} / 10 (threshold ${report.score.threshold}) · ` +
      `files scored: ${report.score.filesScored} · below threshold: ${report.score.belowThreshold.length}`,
  );
  const worst = report.fileScores.filter((s) => s.score < report.score.threshold).slice(0, 3);
  if (worst.length > 0) {
    lines.push(`  worst: ${worst.map((s) => `${s.file} (${s.score})`).join(" · ")}`);
  }

  if (report.passed) {
    lines.push("PASS — todo import de shared/ respaldado por auditoría (BASE Rule 7)");
  } else {
    const reasons: string[] = [];
    if (report.errors > 0) reasons.push(`${report.errors} error(es)`);
    if (report.warnings > 0 && report.score.threshold <= 0) reasons.push(`${report.warnings} warn(s)`);
    if (report.score.threshold > 0 && report.score.global < report.score.threshold) {
      reasons.push(`score ${report.score.global} < threshold ${report.score.threshold}`);
    }
    lines.push(`FAIL — commit rechazado (BASE Rule 8)${reasons.length > 0 ? ` · ${reasons.join(" · ")}` : ""}`);
  }
  return lines.join("\n");
}

/* ═══ §13  MAIN ════════════════════════════════════════════ */

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const started = Date.now();

  if (!existsSync(opts.root)) {
    console.error(`config error: root not found → ${opts.root}`);
    process.exit(3);
  }
  const srcRoot = join(opts.root, "src");
  if (!existsSync(srcRoot)) {
    console.error(`config error: src/ no encontrado bajo ${opts.root}`);
    process.exit(3);
  }

  await loadManifest(); // SSOT — exit 3 con diagnóstico exacto si rompe

  if (AUDITED_REGISTRY.length > 0 && !existsSync(join(srcRoot, "shared"))) {
    console.error(
      `config error: AUDITED_REGISTRY no vacío pero src/shared/ no existe bajo ${opts.root} ` +
        `(¿root mal apuntado?)`,
    );
    process.exit(3);
  }

  const consistency = checkRegistryConsistency(srcRoot, opts.auditCoverage);
  const outcome = validate(opts.root, opts);

  // SV-10: nunca se certifica en vacío — 0 consumidores es config rota.
  if (outcome.consumersScanned === 0) {
    console.error(
      `config error: 0 consumidores escaneados bajo ${opts.root} — ` +
        `root mal configurado o árbol vacío (no se certifica en vacío)`,
    );
    process.exit(3);
  }

  const report = buildReport(opts.root, outcome, consistency, opts, Date.now() - started);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(reportHuman(report, opts.quiet, opts.verbose, opts.maxReport));
    if (opts.verbose) {
      console.log("");
      console.log("AUDITED_REGISTRY (manifest SSOT):");
      for (const entry of [...AUDITED_REGISTRY].sort((a, b) => a.path.localeCompare(b.path))) {
        console.log(`  [${entry.status}] ${entry.path}${entry.notes ? ` — ${entry.notes}` : ""}`);
      }
    }
  }

  // SV-8: exitCode (nunca process.exit post-stdout — sin truncamiento en pipes)
  if (report.readErrors.length > 0) {
    console.error(`${report.readErrors.length} archivo(s) ilegible(s) — no se puede certificar (exit 2).`);
    process.exitCode = 2;
    return;
  }
  process.exitCode = report.passed ? 0 : 1;
}

main().catch((err: unknown) => {
  console.error(
    "validate-shared-imports internal error:",
    err instanceof Error ? err.stack : String(err),
  );
  process.exitCode = 2;
});
