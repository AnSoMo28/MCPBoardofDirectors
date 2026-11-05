#!/usr/bin/env node
/**
 * P2-C3f · Post-patch audit — ¿por qué el check 6 salió v1 tras aplicar VI-14?
 *
 * Contexto (2026-11-04): el usuario aplicó p2c3e_vi14_patch.ts; el VI informó
 * "✓ VI-14 aplicado", pero el --check 6 posterior emitió la SALIDA V1 (notas
 * de decoradores, 4 stats, backendTools=0). Evidencia del sandbox:
 *   · esbuild/tsx RECHAZA declaraciones duplicadas ("has already been
 *     declared") → el archivo no puede tener dos `function checkBackendTools`;
 *     la hipótesis del hoisting queda descartada.
 *   · un archivo CRLF parcheado (aunque corrupto con \r\r\n) SIGUE emitiendo
 *     las notas v2 → la salida v1 no puede salir del código parcheado.
 *   · la salida v1 completó el run con backendTools=0 y texto deriva
 *     ("checkdegrades") → el check 6 VIVO es otra función bajo OTRO nombre.
 *
 * Explicación consistente: la copia local del VI (deriva de ~100 líneas frente
 * a la auditada) contiene las funciones legacy MUERTAS
 * checkBackendTools/extractBackendToolNames (las únicas que el parche de la
 * copia auditada sabe encontrar y reemplazar) MIENTRAS el wiring del CHECKS
 * llama a otra función (p. ej. verifyBackendTools) y buildContext popula
 * backendTools con otro extractor (p. ej. extractMcpToolNames) — ambos v1.
 *
 * Este script es read-only por defecto:
 *   npx tsx ../scripts/p2c3f_postcheck.ts              → audit + probe de ejecución
 *   npx tsx ../scripts/p2c3f_postcheck.ts --repair-eol → normaliza \r\r\n → \r\n
 *   npx tsx ../scripts/p2c3f_postcheck.ts --rebind     → ata el check 6 vivo a la v2:
 *     · renombra duplicados legacy no-v2 (si los hubiera),
 *     · convierte la función wired F en trampolín → checkBackendTools (v2),
 *     · reescribe la población de backendTools para llamar a
 *       extractBackendToolNames (v2).
 *
 * Exit codes: 0 = v2 viva o nada que hacer · 1 = acción recomendada · 2 = error.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const REPAIR_EOL = process.argv.includes("--repair-eol");
const REBIND = process.argv.includes("--rebind");
const NO_PROBE = process.argv.includes("--no-probe");

// ═════════════════════════════════════════════ discovery (mismo que p2c3e) ═══

function findViFile(): string | null {
  for (const seed of [process.cwd(), __dirname]) {
    let dir = seed;
    for (let i = 0; i < 6; i++) {
      if (!existsSync(join(dir, "frontend", "src"))) {
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
        continue;
      }
      const direct = [
        join(dir, "scripts", "verify-integration.ts"),
        join(dir, "scripts", "verify-integration.mts"),
        join(dir, "verify-integration.ts"),
        join(dir, "frontend", "scripts", "verify-integration.ts"),
      ];
      for (const p of direct) if (existsSync(p)) return p;
      const scriptsDir = join(dir, "scripts");
      if (existsSync(scriptsDir)) {
        for (const f of readdirSync(scriptsDir)) {
          if (!/\.(ts|mts)$/.test(f)) continue;
          const p = join(scriptsDir, f);
          try {
            if (readFileSync(p, "utf-8").includes("extractBackendToolNames")) return p;
          } catch { /* ilegible — omitir */ }
        }
      }
      return null;
    }
  }
  return null;
}

const VI_ARG = (() => {
  const a = process.argv.find((x) => x.startsWith("--vi="));
  return a ? a.slice(5) : undefined;
})();

const viPathRaw = VI_ARG ? resolve(VI_ARG) : findViFile();
if (!viPathRaw || !existsSync(viPathRaw)) {
  console.error("✗ no localizo el VI — usa --vi=<ruta a verify-integration.ts>");
  process.exit(2);
}
const viPath: string = viPathRaw;
const repoRoot = existsSync(join(dirname(viPath), "frontend", "src"))
  ? dirname(viPath)
  : dirname(dirname(viPath));

// ═══════════════════════════════════════════════════════════════════ audit ═══

interface FnDecl { line: number; end: number; v2: boolean; }

interface AuditResult {
  patched: boolean;
  markerCount: number;
  typeFieldV2: boolean;
  leftoverSize: boolean;
  extractorDecls: FnDecl[];
  checkDecls: FnDecl[];
  wiringFn: string | null;
  wiringClosure: boolean;
  wiringTrampoline: boolean;
  wiringLine: number;
  extractorCallSites: number[];
  populationCalls: Array<{ line: number; callee: string }>;
  doubledCr: number;
  crlf: boolean;
}

/** Normaliza terminadores para el análisis: quita TODOS los \r finales
 *  (los archivos con corrupción \r\r\n tienen dos). */
function normLines(content: string): string[] {
  return content.split("\n").map((l) => l.replace(/\r+$/, ""));
}

function audit(content: string): AuditResult {
  const lines = normLines(content);

  const declsOf = (nameRe: RegExp, isV2Body: (body: string) => boolean): FnDecl[] => {
    const out: FnDecl[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!nameRe.test(lines[i]!)) continue;
      let end = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j]! === "}") { end = j; break; }
      }
      const body = lines.slice(i, Math.min(end + 1, lines.length)).join("\n");
      out.push({ line: i + 1, end, v2: isV2Body(body) });
    }
    return out;
  };

  // extractor: la v2 declara `): Vi14BackendIndex {`; la v1 `): Set<string> {`
  const extractorDecls = declsOf(
    /^[ \t]*function\s+extractBackendToolNames\s*\(/,
    (body) => body.includes("Vi14BackendIndex") || body.includes("vi14Snake"),
  );
  // check: la v2 llama a vi14ClassifyRef; la v1 usa ctx.backendTools.has(
  const checkDecls = declsOf(
    /^[ \t]*function\s+checkBackendTools\s*\(/,
    (body) => body.includes("vi14ClassifyRef"),
  );

  // wiring: la entrada del CHECKS con el id/título del check 6. El título
  // TAMBIÉN aparece dentro de los cuerpos de las funciones check — saltar
  // esos rangos y seguir buscando en el CHECKS real.
  let wiringFn: string | null = null;
  let wiringClosure = false;
  let wiringLine = -1;
  const inFnBody = (idx: number): boolean =>
    checkDecls.some((d) => idx >= d.line - 1 && idx <= d.end) ||
    extractorDecls.some((d) => idx >= d.line - 1 && idx <= d.end);
  for (let i = 0; i < lines.length; i++) {
    if (inFnBody(i)) continue;
    const l = lines[i]!;
    if (!/Missing from Mock AND Backend|["']backend-tools["']/.test(l)) continue;
    const run = l.match(/run\s*:\s*([A-Za-z_$][\w$]*)/);
    if (run) { wiringFn = run[1]!; wiringLine = i + 1; break; }
    if (/run\s*:\s*\(/.test(l)) { wiringClosure = true; wiringLine = i + 1; break; }
    for (let j = Math.max(0, i - 6); j <= Math.min(lines.length - 1, i + 6); j++) {
      if (inFnBody(j)) continue;
      const r2 = lines[j]!.match(/run\s*:\s*([A-Za-z_$][\w$]*)/);
      if (r2) { wiringFn = r2[1]!; wiringLine = j + 1; break; }
      if (/run\s*:\s*\(/.test(lines[j]!)) { wiringClosure = true; wiringLine = j + 1; break; }
    }
    if (wiringFn !== null || wiringClosure) break;
  }

  // ¿la función wired ya es trampolín hacia checkBackendTools?
  let wiringTrampoline = false;
  if (wiringFn !== null && wiringFn !== "checkBackendTools") {
    const fIdx = lines.findIndex((l) =>
      new RegExp(`^[ \\t]*function\\s+${wiringFn}\\s*\\(`).test(l));
    if (fIdx >= 0) {
      let fEnd = fIdx;
      for (let j = fIdx + 1; j < lines.length; j++) {
        if (lines[j]! === "}") { fEnd = j; break; }
      }
      wiringTrampoline = lines.slice(fIdx, fEnd + 1).some((l) => /return\s+checkBackendTools\s*\(/.test(l));
    }
  }

  // call-sites del extractor v2 (excluyendo sus declaraciones)
  const extractorCallSites: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (/extractBackendToolNames\s*\(/.test(l) && !/function\s+extractBackendToolNames/.test(l)) {
      extractorCallSites.push(i + 1);
    }
  }
  // población real de ctx.backendTools: `const backendTools = fn(…)` o `backendTools: fn(…)`
  const populationCalls: Array<{ line: number; callee: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/backendTools\s*[:=]\s*([A-Za-z_$][\w$]*)\s*\(/);
    if (m) populationCalls.push({ line: i + 1, callee: m[1]! });
  }

  return {
    patched: content.includes("vi14ClassifyRef") && content.includes("VI-14 v2 (motor-based)"),
    markerCount: (content.match(/vi14ClassifyRef/g) ?? []).length,
    typeFieldV2: /backendTools[ \t]*:[ \t]*Vi14BackendIndex/.test(content),
    leftoverSize: content.includes("ctx.backendTools.size"),
    extractorDecls,
    checkDecls,
    wiringFn,
    wiringClosure,
    wiringTrampoline,
    wiringLine,
    extractorCallSites,
    populationCalls,
    doubledCr: (content.match(/\r\r\n/g) ?? []).length,
    crlf: content.includes("\r\n"),
  };
}

// ═══════════════════════════════════════════════════════════════════ probe ═══

interface ProbeResult { ok: boolean; v2Live: boolean; backendTools?: number; missingBoth?: number; detail: string; }

function probe(): ProbeResult {
  const cmd = `npx tsx "${viPath}" --check 6 --no-color`;
  const r = spawnSync(cmd, { shell: true, cwd: repoRoot, encoding: "utf8", timeout: 180000 });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  if (out === "") return { ok: false, v2Live: false, detail: `no pudo ejecutarse (exit ${r.status})` };
  if (!out.includes("note:") && /\bError\b|UncaughtException|has already been declared/.test(out)) {
    return { ok: false, v2Live: false, detail: `el VI CRASH al ejecutarse: ${out.split("\n").find((l) => /Error|declared/.test(l)) ?? ""}` };
  }
  // v2Live: las notas v2 empiezan por "VI-14 v2"; la v1 habla de decoradores
  const v2Live = out.includes("VI-14 v2");
  const bt = out.match(/backendTools\s*=\s*(\d+)/);
  const mb = out.match(/missingBoth\s*=\s*(\d+)/);
  return {
    ok: true,
    v2Live,
    backendTools: bt ? Number(bt[1]) : undefined,
    missingBoth: mb ? Number(mb[1]) : undefined,
    detail: v2Live ? "el check 6 EMITE las notas/stats v2" : "el check 6 emite la salida v1 (notas de decoradores)",
  };
}

// ═════════════════════════════════════════════════════════════ repairs ═══════

function backupOf(suffix: string): string {
  const b = viPath + suffix;
  if (!existsSync(b)) copyFileSync(viPath, b);
  return b;
}

function repairEol(): boolean {
  const raw = readFileSync(viPath, "utf-8");
  const before = (raw.match(/\r\r\n/g) ?? []).length;
  if (before === 0) {
    console.log(c.green("✓ no hay \\r\\r\\n que reparar"));
    return true;
  }
  backupOf(".bak-p2c3f-eol");
  writeFileSync(viPath, raw.replace(/\r\r\n/g, "\r\n"));
  const after = (readFileSync(viPath, "utf-8").match(/\r\r\n/g) ?? []).length;
  console.log(`${after === 0 ? c.green("✓") : c.red("✗")} ${before} línea(s) \\r\\r\\n normalizada(s) → \\r\\n (quedan ${after}) · backup .bak-p2c3f-eol`);
  return after === 0;
}

/** Reata el check 6 vivo a la v2: renombra duplicados legacy no-v2, convierte
 *  la función wired en trampolín → checkBackendTools y reescribe la población
 *  de backendTools para llamar a extractBackendToolNames (v2). */
function rebind(a: AuditResult): boolean {
  if (!a.patched) {
    console.error(c.red("✗ --rebind requiere el parche VI-14 presente — aplica p2c3e primero."));
    process.exit(2);
  }
  if (!a.checkDecls.some((d) => d.v2)) {
    console.error(c.red("✗ no encontré la declaración v2 de checkBackendTools en el archivo — aborto sin tocar nada."));
    process.exit(2);
  }
  if (a.extractorDecls.length > 0 && !a.extractorDecls.some((d) => d.v2)) {
    console.error(c.red("✗ no encontré la declaración v2 de extractBackendToolNames — aborto sin tocar nada."));
    process.exit(2);
  }

  const original = readFileSync(viPath, "utf-8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = normLines(original);
  const actions: string[] = [];

  // 1) duplicados no-v2 de los nombres canónicos (bajo tsx no deberían existir
  //    — esbuild los rechaza — pero el renombrado es inofensivo y defensivo)
  const renames: Array<{ decl: FnDecl; rename: string }> = [];
  for (const d of a.checkDecls) if (!d.v2) renames.push({ decl: d, rename: "checkBackendTools_legacy_p2c3f" });
  for (const d of a.extractorDecls) if (!d.v2) renames.push({ decl: d, rename: "extractBackendToolNames_legacy_p2c3f" });
  for (const t of renames) {
    const i = t.decl.line - 1;
    lines[i] = lines[i]!.replace(/function\s+(checkBackendTools|extractBackendToolNames)\b/, `function ${t.rename}`);
    actions.push(`renombrada la declaración v1 duplicada (línea ${t.decl.line}) → ${t.rename}`);
  }

  // 2) wiring a otra función F → trampolín que delega en checkBackendTools (v2)
  if (
    a.wiringFn !== null &&
    a.wiringFn !== "checkBackendTools" &&
    !a.wiringClosure &&
    !a.wiringTrampoline
  ) {
    const fIdx = lines.findIndex((l) =>
      new RegExp(`^[ \\t]*function\\s+${a.wiringFn}\\s*\\(`).test(l));
    if (fIdx >= 0) {
      let fEnd = fIdx;
      for (let j = fIdx + 1; j < lines.length; j++) {
        if (lines[j]! === "}") { fEnd = j; break; }
      }
      const param = lines[fIdx]!.match(new RegExp(`function\\s+${a.wiringFn}\\s*\\(\\s*([A-Za-z_$][\\w$]*)`));
      const arg = param?.[1] ?? "ctx";
      lines.splice(
        fIdx + 1,
        fEnd - fIdx - 1,
        "  // P2-C3f rebind — el check 6 vivo delega en la implementación VI-14 v2.",
        `  return checkBackendTools(${arg});`,
      );
      actions.push(`${a.wiringFn} (línea ${fIdx + 1}) convertida en trampolín → checkBackendTools (v2)`);
    } else {
      actions.push(`⚠ ${a.wiringFn} no es una function declaration (arrow/class) — trampolín NO aplicado, requiere parche manual`);
    }
  }

  // 3) población de backendTools por otro extractor → extractBackendToolNames (v2)
  for (const p of a.populationCalls) {
    if (p.callee === "extractBackendToolNames") continue;
    const i = p.line - 1;
    lines[i] = lines[i]!.replace(
      /(backendTools\s*[:=]\s*)([A-Za-z_$][\w$]*)\s*\(/,
      "$1extractBackendToolNames(",
    );
    actions.push(`población de backendTools (línea ${p.line}): ${p.callee}(…) → extractBackendToolNames(…) (v2)`);
  }

  if (actions.length === 0) {
    console.log(c.green("✓ nada que rebindear (sin duplicados, wiring estándar y población vía v2)"));
    return true;
  }

  backupOf(".bak-p2c3f");
  writeFileSync(viPath, lines.join(eol));

  // verificación post-escritura
  const fresh = audit(readFileSync(viPath, "utf-8"));
  const oneCheck = fresh.checkDecls.filter((d) => !d.v2).length === 0 && fresh.checkDecls.length === 1;
  const callsOk = fresh.extractorCallSites.length > 0;
  const trampOk = fresh.wiringFn === null
    || fresh.wiringFn === "checkBackendTools"
    || fresh.wiringTrampoline;
  if (!oneCheck || !callsOk || !trampOk) {
    console.error(c.red(`✗ verificación post-rebind falló (check único=${oneCheck}, call-sites=${fresh.extractorCallSites.length}, trampolín=${trampOk}) — restaurando backup.`));
    copyFileSync(viPath + ".bak-p2c3f", viPath);
    process.exit(2);
  }
  console.log(c.green(`\n✓ rebind aplicado (${actions.length} cambio(s)) · backup .bak-p2c3f`));
  for (const x of actions) console.log(`  · ${x}`);
  return true;
}

// ═════════════════════════════════════════════════════════════════ report ════

function report(a: AuditResult, p: ProbeResult | null): number {
  console.log(`P2-C3f · post-patch audit — ${viPath}`);
  console.log(c.dim(`  repo: ${repoRoot}`));
  const mark = (ok: boolean) => (ok ? c.green("✓") : c.red("✗"));
  console.log(`  ${a.patched ? c.green("✓") : c.red("✗")} marcadores VI-14 v2 en disco: ${a.patched ? `presentes (${a.markerCount} vi14ClassifyRef)` : "AUSENTES — el parche no está en ESTA copia"}`);
  if (a.patched) {
    console.log(`  ${mark(a.typeFieldV2)} ScanContext.backendTools: ${a.typeFieldV2 ? "Vi14BackendIndex (v2)" : "tipo NO v2"}`);
    console.log(`  ${mark(!a.leftoverSize)} restos ctx.backendTools.size: ${a.leftoverSize ? "PRESENTES" : "ninguno"}`);
  }

  const dupCheck = a.checkDecls.filter((d) => !d.v2);
  const dupExtract = a.extractorDecls.filter((d) => !d.v2);
  if (a.checkDecls.length > 1 || a.extractorDecls.length > 1) {
    console.log(c.yellow(`  ⚠ declaraciones DUPLICADAS: checkBackendTools ×${a.checkDecls.length} (v1 en línea(s) ${dupCheck.map((d) => d.line).join(", ")}), extractBackendToolNames ×${a.extractorDecls.length} (v1 en línea(s) ${dupExtract.map((d) => d.line).join(", ")})`));
  } else {
    console.log(`  ${mark(true)} declaración única de checkBackendTools (línea ${a.checkDecls[0]?.line ?? "?"}) y extractBackendToolNames (línea ${a.extractorDecls[0]?.line ?? "?"})`);
  }

  if (a.wiringFn || a.wiringClosure) {
    const wired = a.wiringClosure ? "cierre inline (run: (…) => …)" : a.wiringFn!;
    const ok = a.wiringClosure
      ? a.wiringTrampoline
      : a.wiringFn === "checkBackendTools" || a.wiringTrampoline;
    console.log(`  ${ok ? mark(true) : c.yellow("⚠")} wiring del check 6 (línea ${a.wiringLine}): run: ${wired}${a.wiringTrampoline ? c.dim(" → trampolín → checkBackendTools (v2)") : ""}`);
  } else {
    console.log(c.yellow(`  ⚠ no encontré el wiring del CHECKS (id "backend-tools" / título "Missing from Mock") — patrón distinto en esta copia`));
  }

  if (a.extractorCallSites.length > 0) {
    console.log(`  ${mark(true)} call-sites de extractBackendToolNames: ${a.extractorCallSites.join(", ")}`);
  } else {
    console.log(c.yellow("  ⚠ call-sites de extractBackendToolNames: NINGUNO — buildContext NO usa el extractor v2"));
    if (a.populationCalls.length > 0) {
      console.log(c.yellow(`    la población real es: ${a.populationCalls.map((p) => `${p.callee}(…) en línea ${p.line}`).join("; ")}`));
    }
  }

  if (a.doubledCr > 0) {
    console.log(c.yellow(`  ⚠ corrupción eol: ${a.doubledCr} línea(s) con \\r\\r\\n (bug CRLF del parche e original) → --repair-eol`));
  } else {
    console.log(`  ${mark(true)} salud eol: sin \\r\\r\\n (${a.crlf ? "CRLF" : "LF"})`);
  }

  if (p) {
    console.log(`  ${p.v2Live ? c.green("✓") : c.red("✗")} probe --check 6: ${p.detail}${p.backendTools !== undefined ? ` (backendTools=${p.backendTools}, missingBoth=${p.missingBoth})` : ""}`);
  }

  // veredicto
  console.log("\n── veredicto ──");
  if (!a.patched) {
    console.log(c.red("  El VI NO está parcheado en esta copia. Aplica p2c3e_vi14_patch.ts sobre ESTE archivo."));
    return 1;
  }
  if (p && p.ok === false) {
    console.log(c.red(`  El VI no se ejecuta limpio: ${p.detail}`));
    return 1;
  }
  if (p && p.v2Live) {
    console.log(c.green("  VI-14 v2 VIVO: el check 6 emite la clasificación de 5 estados."));
    if (dupCheck.length > 0 || dupExtract.length > 0) {
      console.log(c.yellow("  …aunque quedan duplicados v1 latentes — usa --rebind para renombrarlos."));
    }
    return 0;
  }
  const causes: string[] = [];
  if (a.wiringFn !== null && a.wiringFn !== "checkBackendTools" && !a.wiringTrampoline) {
    causes.push(`el wiring llama a ${a.wiringFn}, no a checkBackendTools — --rebind la convierte en trampolín hacia la v2`);
  }
  if (a.wiringClosure && !a.wiringTrampoline) {
    causes.push("el wiring es un cierre inline — requiere parche manual (repórtame la línea " + a.wiringLine + ")");
  }
  if (a.extractorCallSites.length === 0) {
    if (a.populationCalls.length > 0) {
      causes.push(`buildContext popula backendTools con ${a.populationCalls.map((p) => p.callee).join(", ")} — --rebind lo reescribe a extractBackendToolNames (v2)`);
    } else {
      causes.push("no veo cómo se popula backendTools — repórtame la línea de población para parche manual");
    }
  }
  if (dupCheck.length > 0 || dupExtract.length > 0) {
    causes.push("duplicados v1 con los nombres canónicos — --rebind los renombra");
  }
  if (a.doubledCr > 0) causes.push("corrupción \\r\\r\\n del parche e original → --repair-eol");
  if (causes.length === 0) {
    if (p === null) {
      console.log(c.green("  Estática sana (sin probe: --no-probe). Ejecuta sin --no-probe para confirmar la salida v2 en vivo."));
      return 0;
    }
    console.log(c.yellow("  El parche está en disco y el wiring es estándar, pero el probe no vio stats v2. Re-executa el check 6: tu salida anterior pudo venir de otra copia del VI."));
    return 1;
  }
  for (const cause of causes) console.log(c.yellow(`  · ${cause}`));
  const order: string[] = [];
  if (a.doubledCr > 0) order.push("--repair-eol");
  if (dupCheck.length > 0 || dupExtract.length > 0 || a.extractorCallSites.length === 0 || (a.wiringFn !== null && a.wiringFn !== "checkBackendTools" && !a.wiringTrampoline)) order.push("--rebind");
  console.log(c.cyan(`  siguiente: npx tsx ${process.argv[1] ?? "p2c3f_postcheck.ts"} ${order.join(" ")}`.trim() + (order.length ? "" : " (manual)")));
  return 1;
}

// ─── main ──────────────────────────────────────────────────────────────────

if (REPAIR_EOL) {
  repairEol();
}
if (REBIND) {
  rebind(audit(readFileSync(viPath, "utf-8")));
}
const fresh = audit(readFileSync(viPath, "utf-8"));
const p = NO_PROBE ? null : probe();
process.exit(report(fresh, p));
