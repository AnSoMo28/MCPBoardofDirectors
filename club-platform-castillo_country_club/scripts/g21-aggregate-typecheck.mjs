#!/usr/bin/env node
/**
 * ============================================================================
 * G21 v3 — Agregador del type-check (honesto + calibrado al formato REAL)
 * ============================================================================
 * v2 falló en la corrida real: exit 2, log con 1620 líneas de errores y
 * "Errores parseados: 0". Causa raíz (reproducida contra tsc real):
 * la regex estaba calibrada al formato PRETTY (`file:line:col - error TS…`)
 * pero tsc por PIPE — como lo captura spawnSync, sin TTY — emite el formato
 * PLANO (`file(line,col): error TS…`). Las matrices v1/v2 testeaban contra
 * fixtures pretty: ficticios para el modo --run. Fail-open por drift de
 * formato de fixture (defecto mío; v3 lo cierra por construcción).
 *
 * v3:
 *   · Regex DUAL: parsea AMBOS formatos (plano y pretty).
 *   · AUTO-CHECK anti-mentira: cuenta las apariciones crudas de "error TS…"
 *     del texto y las compara contra lo parseado. Si hay crudos sin parsear
 *     → diagnóstico con char codes (hex) de la primera línea cruda. Un "0"
 *     silencioso es estructuralmente imposible de volver a pasar inadvertido.
 *   · Modo parse tolerante a logs hechos a mano: UTF-16 LE/BE (redirect `>`
 *     de PowerShell), BOM UTF-8 (Out-File -Encoding utf8 en PS 5.1), CRLF.
 *   · El contrato v2 se conserva: exit code siempre visible, evidencia cruda
 *     si falla sin parseables, veredicto de dos lecturas para exit 0 vacío,
 *     --force por defecto en --run (--fast desactiva), stat de .tsbuildinfo,
 *     G21_TYPECHECK_CMD como seam de pruebas, timeout explícito.
 *
 * Modos:
 *   node scripts/g21-aggregate-typecheck.mjs --run [--fast]
 *       Corre `pnpm exec tsc -b --force` (o `pnpm type-check` con --fast),
 *       guarda TODO en frontend/type-check.log y agrega.
 *   node scripts/g21-aggregate-typecheck.mjs [ruta-al-log]
 *       Agrega un log existente (discovery: argumento → ./type-check.log →
 *       ./frontend/type-check.log).
 *
 * Env de prueba: G21_TYPECHECK_CMD reemplaza el comando completo (matriz).
 * Exit: 0 = agregó · 1 = no encontró log · 2 = error de herramienta.
 * Node >= 20. Cero dependencias.
 * ============================================================================
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── Argumentos ──────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const wantRun = argv.includes("--run");
const wantFast = argv.includes("--fast");
const positional = argv.find((a) => !a.startsWith("--")) ?? null;

/* ── Resolución de la raíz del frontend (cascada del script g14 v3) ──────── */
function resolveFrontendRoot() {
  const candidates = [];
  if (positional) candidates.push(positional);
  candidates.push(process.cwd(), join(process.cwd(), "frontend"), join(HERE, ".."), join(HERE, "..", "frontend"));
  for (const c of candidates) {
    if (
      existsSync(join(c, "package.json")) &&
      (existsSync(join(c, "tsconfig.json")) || existsSync(join(c, "tsconfig.app.json")))
    ) {
      return { root: resolve(c), how: c === process.cwd() ? "directorio actual" : c };
    }
  }
  return null;
}

/* ── Lector tolerante (modo parse: logs capturados a mano vía PowerShell) ──
 * `>` en PS 5.1 produce UTF-16 LE con BOM · Out-File -Encoding utf8 produce
 * UTF-8 con BOM · el log escrito por --run siempre es UTF-8 limpio.         */
function readLogTolerant(p) {
  const buf = readFileSync(p);
  let text;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = buf.subarray(2).toString("utf16le"); // UTF-16 LE
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const le = Buffer.from(buf);
    le.swap16();
    text = le.subarray(2).toString("utf16le"); // UTF-16 BE (raro)
  } else if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    text = buf.subarray(3).toString("utf8"); // UTF-8 + BOM
  } else {
    text = buf.toString("utf8");
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/* ── Correr el type-check y capturar TODO (incluye stderr) ───────────────── */
let logText = null;
let logPath = null;
let exitCode = null; // null = modo parse (no aplica)

if (wantRun) {
  const root = resolveFrontendRoot();
  if (!root) {
    console.error("⛔ No pude resolver la raíz del frontend (package.json + tsconfig).");
    console.error("   Probé: " + [process.cwd(), join(process.cwd(), "frontend"), join(HERE, ".."), join(HERE, "..", "frontend")].join(" · "));
    process.exit(2);
  }
  const override = process.env.G21_TYPECHECK_CMD;
  const forceMode = !wantFast;
  const cmd = override ?? (forceMode ? "pnpm exec tsc -b --force" : "pnpm type-check");
  console.log(`Raíz: ${root.root} (${root.how})`);
  console.log(
    `Comando: ${cmd}${override ? " (G21_TYPECHECK_CMD)" : ""}` +
      (forceMode && !override ? " · --force: tsc -b re-checquea TODO (defeat del estado incremental; --fast para desactivar)" : ""),
  );
  console.log("Corriendo el type-check (puede tardar un par de minutos)…");

  const r = spawnSync(cmd, {
    cwd: root.root,
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });

  if (r.status === null || r.status === undefined) {
    // Spawn error (ENOENT) o timeout (signal) — NUNCA silencioso.
    const kind = r.error?.code === "ETIMEDOUT" || r.signal ? "TIMEOUT (> 5 min)" : `no pude ejecutar el comando (${r.error?.message ?? "signal " + String(r.signal)})`;
    console.error(`⛔ El type-check no terminó: ${kind}.`);
    console.error("   Subí el timeout o corré el type-check a mano y agregá el log en modo parse.");
    process.exit(2);
  }
  exitCode = r.status;
  logText = (r.stdout ?? "") + (r.stderr ? "\n" + r.stderr : "");
  logPath = join(root.root, "type-check.log");
  writeFileSync(logPath, logText, "utf8");
  console.log(`Log completo guardado: ${logPath} (exit ${exitCode})`);
} else {
  const candidates = [];
  if (positional) candidates.push(positional);
  candidates.push(join(process.cwd(), "type-check.log"), join(process.cwd(), "frontend", "type-check.log"));
  for (const c of candidates) {
    if (existsSync(c)) {
      logPath = resolve(c);
      logText = readLogTolerant(c);
      break;
    }
  }
  if (logText === null) {
    console.error("⛔ No encontré el log. Probé: " + candidates.join(" · "));
    console.error("");
    console.error("Opción A (recomendada — un solo comando):");
    console.error("  node scripts/g21-aggregate-typecheck.mjs --run");
    console.error("Opción B (capturás vos primero, desde frontend/):");
    console.error("  pnpm type-check 2>&1 | Out-File -Encoding utf8 type-check.log");
    console.error("  node scripts/g21-aggregate-typecheck.mjs type-check.log");
    process.exit(1);
  }
}

/* ── Parseo — AMBOS formatos de tsc ────────────────────────────────────────
 * pipe (no-TTY, lo que captura --run):  file.ts(84,16): error TS2664: msg
 * --pretty / TTY:                        file.ts:84:16 - error TS2664: msg */
const LINE_RE_PLAIN = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const LINE_RE_PRETTY = /^(.+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
const FOUND_RE = /^Found (\d+) errors?\b/m;

const byCode = new Map();
const byFile = new Map();
let parsed = 0;

for (const line of logText.split(/\r?\n/)) {
  const m = LINE_RE_PLAIN.exec(line) ?? LINE_RE_PRETTY.exec(line);
  if (!m) continue;
  parsed += 1;
  const [, file, , , code, msg] = m;
  const entry = byCode.get(code) ?? { count: 0, sample: msg.slice(0, 96) };
  entry.count += 1;
  byCode.set(code, entry);
  byFile.set(file, (byFile.get(file) ?? 0) + 1);
}

/* ── AUTO-CHECK anti-mentira ───────────────────────────────────────────────
 * Cuento las apariciones crudas de "error TS####" en el texto y las comparo
 * contra lo parseado. Un "0 parseados" con crudos > 0 ahora se anuncia solo
 * con evidencia byte-level (char codes hex) — imposible que pase inadvertido. */
const rawHits = (logText.match(/error TS\d+/g) ?? []).length;
const rawOk = rawHits === parsed;

/* ── Evidencia de estado ─────────────────────────────────────────────────── */
const foundMatch = FOUND_RE.exec(logText);
const reported = foundMatch ? Number(foundMatch[1]) : null;
const mismatch = reported !== null && reported !== parsed;
const logLines = logText.split(/\r?\n/).length;
const logBytes = Buffer.byteLength(logText, "utf8");
const fmtBytes = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

function buildinfoStats() {
  const dir = join(dirname(logPath), "node_modules", ".tmp");
  if (!existsSync(dir)) return ["    sin node_modules/.tmp (nunca compiló o estado limpio)"];
  const files = readdirSync(dir).filter((f) => f.endsWith(".tsbuildinfo"));
  if (files.length === 0) return ["    sin .tsbuildinfo (nunca escribió estado)"];
  return files.map((f) => {
    const st = statSync(join(dir, f));
    return `    ${f} · ${fmtBytes(st.size)} · ${st.mtime.toISOString()}`;
  });
}

function firstEvidenceLines(max = 8) {
  const nonEmpty = logText.split(/\r?\n/).filter((l) => l.trim() !== "");
  return nonEmpty.slice(0, max).map((l) => `    | ${l.slice(0, 160)}`);
}

/* ── Reporte ─────────────────────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n, " ");
const out = [];
out.push("G21 v3 — Agregación del type-check");
out.push(`Log: ${logPath}`);
if (exitCode !== null) {
  out.push(`Exit del type-check: ${exitCode}`);
} else {
  out.push("Modo parse (log preexistente): sin exit code disponible");
}
out.push(`Log: ${logLines} líneas · ${fmtBytes(logBytes)}`);
out.push(`Errores parseados: ${parsed}${reported !== null ? ` (tsc reportó: ${reported})` : ""}`);
out.push(
  `Auto-check: ${rawHits} crudos "error TS####" · ${parsed} parseadas ` +
    (rawOk ? "✓ coinciden" : "⚠️ NO coinciden"),
);
out.push("");

/* Veredictos honestos — nunca dejar "0" ambiguo */
if (rawHits > 0 && parsed === 0) {
  const raw = logText.split(/\r?\n/).find((l) => /error TS\d+/.test(l)) ?? "";
  out.push("⚠️ AUTO-CHECK: hay errores crudos que NINGUNA regex atrapó (formato desconocido).");
  out.push("   Primera línea cruda + char codes (hex) para diagnóstico:");
  out.push(`    | ${raw.slice(0, 160)}`);
  out.push(`    | codes: ${[...raw.slice(0, 90)].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ")}`);
  out.push("");
}
if (exitCode !== null && exitCode !== 0 && parsed === 0) {
  out.push(`⚠️ El type-check FALLÓ (exit ${exitCode}) pero no encontré líneas de error parseables.`);
  out.push("   Evidencia cruda — primeras líneas del log:");
  out.push(...firstEvidenceLines());
  out.push("");
} else if (exitCode === 0 && parsed === 0) {
  out.push("ℹ️ tsc terminó exit 0 SIN salida. Dos lecturas posibles:");
  out.push("   (a) el proyecto está limpio de verdad · (b) tsc -b consideró todo up-to-date y NO re-checqueó.");
  out.push("   Con --run (que usa --force por defecto), (b) queda excluida: salida vacía = limpio de verdad.");
  out.push("");
} else if (exitCode === null && parsed === 0 && logBytes > 0) {
  out.push("⚠️ Log con contenido pero 0 errores parseables — primeras líneas (evidencia cruda):");
  out.push(...firstEvidenceLines());
  out.push("");
} else if (!rawOk && parsed > 0) {
  out.push(`ℹ️ Auto-check desbalance: ${rawHits} crudos vs ${parsed} parseadas (códigos citados dentro de mensajes cuentan como crudos — informativo).`);
  out.push("");
}
if (mismatch) {
  out.push(`⚠️ MISMATCH: tsc reportó ${reported} pero parseé ${parsed} — pegá también las primeras ~30 líneas del log por las dudas.`);
  out.push("");
}
if (parsed > 0) {
  out.push("POR CÓDIGO TS (todos):");
  const codes = [...byCode.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  for (const [code, { count, sample }] of codes) {
    out.push(`  ${pad(code, 8)} ×${pad(String(count).padStart(5), 6)} ${sample}`);
  }
  out.push("");

  out.push("TOP 30 ARCHIVOS:");
  const files = [...byFile.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [file, count] of files.slice(0, 30)) {
    out.push(`  ${pad(`×${String(count).padStart(5)}`, 7)} ${file}`);
  }
  if (files.length > 30) out.push(`  … y ${files.length - 30} archivos más (${files.length} en total)`);
  out.push("");

  out.push("FAMILIAS MECÁNICAS (orientativo):");
  const FAMILIES = [
    { label: "A · código muerto (TS6133/6196/6192/6195/6112)", codes: ["TS6133", "TS6196", "TS6192", "TS6195", "TS6112"] },
    { label: "B · clúster de roles / nombres (TS2304/2305/2440/2561/2724/2749/2367)", codes: ["TS2304", "TS2305", "TS2440", "TS2561", "TS2724", "TS2749", "TS2367"] },
    { label: "C · drift de contratos (TS2322/2820/2739/2741/2554/2345/2353)", codes: ["TS2322", "TS2820", "TS2739", "TS2741", "TS2554", "TS2345", "TS2353"] },
    { label: "D · sintaxis (TS1xxx — NO debería haber ninguno)", codes: ["TS1003", "TS1005"] },
  ];
  let mapped = 0;
  for (const fam of FAMILIES) {
    const n = fam.codes.reduce((acc, c) => acc + (byCode.get(c)?.count ?? 0), 0);
    mapped += n;
    out.push(`  ${pad(fam.label, 66)} ×${n}`);
  }
  out.push(`  ${pad("· otros (no mapeados — ver POR CÓDIGO)", 66)} ×${parsed - mapped}`);
  out.push("");
}

out.push("ESTADO INCREMENTAL (.tsbuildinfo — pista, no veredicto):");
out.push(...buildinfoStats());
out.push("");

console.log(out.join("\n"));
process.exit(0);
