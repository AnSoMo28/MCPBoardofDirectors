/**
 * ============================================================================
 * G20 — PARCHE AL GUARDIAN: fixMissingCssImport v2 + guard de checkC06
 * ============================================================================
 * Archivo: tools/architecture-guardian.ts (frontend)
 * Reemplaza: SOLO la función fixMissingCssImport (v1, líneas ~1782-1803)
 *            y UNA línea del guard de checkC06_MissingCSSImport (~1311).
 * Cero cambios de call-site: misma firma, mismo retorno { text, fixes }.
 *
 * ⚠️ ESTE ARCHIVO ES TRANSPORTE, NO CÓDIGO DEL REPO ⚠️
 * No parchea nada por solo vivir en tools/ — y como tsconfig.node.json
 * compila tools/**/*.ts, si queda ahí sin aplicarse arrastra 2 errores
 * TS2304 (existían exactamente así en el primer type-check post-copia).
 * INSTALACIÓN (3 pasos, después de los cuales se BORRA):
 *   1. En tools/architecture-guardian.ts, reemplazá la función v1
 *      fixMissingCssImport COMPLETA por la de abajo — SIN las 2 líneas
 *      `import` que siguen a este bloque (el guardian YA las tiene:
 *      existsSync en L398, basename en L403 — duplicarlas = duplicate
 *      identifier). Llevate también maskLineForBraces (helper nuevo,
 *      va junto a la función).
 *   2. Reemplazá la línea del guard de checkC06 (ver bloque al final).
 *   3. BORRÁ este archivo del repo (queda en el paquete como referencia)
 *      y verificá: pnpm guardian corre + pnpm type-check ya no muestra
 *      los 2 TS2304 de tools/fixMissingCssImport.G20.ts.
 * Verificación rápida de si el parche YA está aplicado (PowerShell):
 *   Select-String -Path tools/architecture-guardian.ts -Pattern maskLineForBraces
 *   → sin match = la v1 corruptora SIGUE ARMADA: no corras guardian --fix.
 *
 * CAUSA RAÍZ CONFIRMADA (G20): v1 anclaba la inserción en
 * `lastImport + 1`, donde lastImport = última línea que EMPIEZA con
 * `import` (`/^import\s/`, primeras 500 líneas). En una declaración
 * multi-línea (`import type {\n  …\n} from "…";`) la ÚNICA línea que
 * empieza con `import` es la de APERTURA → el import CSS se insertaba
 * DENTRO de las llaves → TS1003/TS1005 — la firma exacta de los 11
 * archivos corrompidos reparados por scripts/g14-diagnose-css-imports.mjs
 * (G19: MemberChurnOracle, MemberCrossDomain, MemberEngagementDNA,
 * MemberLTVProphet, MemberRiskObservatory, MemberSocialConstellation,
 * MemberTimeline, WellnessBusinessInsights, WellnessRiskRadar,
 * WellnessScoreCard, PlanStepApprovalModal).
 *
 * v2 ancla en la línea donde COMPLETA la última declaración de import
 * (tracker de llaves sobre líneas enmascaradas de strings/comentarios —
 * el mismo enfoque probado del script v4) y es FAIL-CLOSED: si el header
 * no se puede parsear por completo (declaración sin cerrar), NO escribe.
 *
 * Ya NO depende de HEADER_SCAN_LINES ni isCommentLine.
 * Supuesto documentado: imports con punto y coma (estilo 100% de la casa).
 * Con inputs ASI sin `;` la degradación es a inserción post-código (legal,
 * jamás corruptora de sintaxis) — el invariante de v2 es: o inserta en un
 * punto probado seguro, o se reusa (fail-closed).
 * Prueba de regresión: scripts/g20-fix-css-import-tests.mjs (matriz 16
 * casos + repro forense de v1, byte-exacta contra la firma de campo).
 * ============================================================================
 */

/* Solo para compilar este archivo standalone (transporte). AL MERGEAR en el
 * guardian: BORRAR estas 2 líneas (duplicate identifier contra L398/L403). */
import { existsSync } from "node:fs";
import { basename } from "node:path";

/** Enmascara comentarios y cuerpos de string/template para que llaves y
 *  terminadores en posiciones NO-código nunca influyan en el tracker de
 *  declaraciones. Lleva el estado de comentarios de bloque multi-línea. */
function maskLineForBraces(line: string, state: { inBlockComment: boolean }): string {
  let out = "";
  let i = 0;
  const n = line.length;
  while (i < n) {
    if (state.inBlockComment) {
      const end = line.indexOf("*/", i);
      if (end === -1) return out;
      state.inBlockComment = false;
      i = end + 2;
      continue;
    }
    const ch = line[i];
    if (ch === "/" && line[i + 1] === "/") return out;
    if (ch === "/" && line[i + 1] === "*") {
      state.inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < n && line[i] !== quote) i += line[i] === "\\" ? 2 : 1;
      i += 1; // comilla de cierre (o EOL si el literal quedó abierto)
      continue; // el cuerpo del literal jamás llega a `out`
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** C-06 fixer: side-effect import of an existing sibling CSS file — safe.
 *  v2 (G20): fail-closed; ancla = línea donde COMPLETA la última
 *  declaración de import (nunca su línea de apertura). */
function fixMissingCssImport(absTsxPath: string, text: string): { text: string; fixes: number } {
  // Cualquier referencia sintáctica a un módulo .css cuenta como importado:
  // side-effect (`import "./x.css"`), nombrada/modules (`import s from
  // "./x.module.css"` — v1 la duplicaba), dinámica (`import("./x.css")`).
  // En lockstep con el guard de checkC06 (ver parche de esa línea abajo).
  const cssReferenced =
    /import\s*["'][^"'\n]*\.css["']/.test(text) ||
    /from\s*["'][^"'\n]*\.css["']/.test(text) ||
    /\b(?:import|require)\s*\(\s*["'][^"'\n]*\.css["']/.test(text);
  if (cssReferenced) return { text, fixes: 0 };
  // Solo los .tsx llevan la convención de CSS hermano. Sin este guard, un
  // path no-.tsx resuelve cssPath a SÍ MISMO y emitiría un auto-import
  // circular (`import "./foo.ts";`). Latente en v1 (el caller filtra .tsx,
  // L1816) — defensa en profundidad a nivel contrato de la función.
  if (!absTsxPath.endsWith(".tsx")) return { text, fixes: 0 };
  const cssPath = absTsxPath.replace(/\.tsx$/, ".css");
  if (!existsSync(cssPath)) return { text, fixes: 0 };

  const lines = text.split("\n");
  // Preservar el EOL del archivo para no crear líneas mixtas (v1 insertaba
  // sin \r en archivos CRLF). Se detecta por la primera línea con salto.
  const firstNl = text.indexOf("\n");
  const crlf = firstNl > 0 && text[firstNl - 1] === "\r";
  const importLine = `import "./${basename(cssPath)}";${crlf ? "\r" : ""}`;

  const state = { inBlockComment: false };
  let inDeclaration = false;
  let depth = 0;          // profundidad de llaves de la declaración en curso
  let lastCompleted = -1; // última línea donde un import/directiva COMPLETÓ
  let firstCode = -1;     // primera línea de código real (ancla de fallback)

  for (let i = 0; i < lines.length; i += 1) {
    // Se captura ANTES de enmascarar: el test de directivas corre sobre la
    // línea CRUDA (el masker de strings reduce `"use client";` a `;` y el
    // regex no la reconocería sobre el skeleton) y debe excluir directivas
    // citadas DENTRO de comentarios de bloque multi-línea.
    const wasInBlock = state.inBlockComment;
    const masked = maskLineForBraces(lines[i], state);
    const skeleton = masked.trim();

    if (inDeclaration) {
      for (const ch of masked) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (depth <= 0 && /["';]$/.test(skeleton)) {
        inDeclaration = false;
        depth = 0;
        lastCompleted = i; // la declaración cerró en esta línea
      }
      continue;
    }

    if (skeleton === "") continue; // línea en blanco o solo-comentario

    // Los prólogos de directiva quedan por encima de los imports
    // (seguro barato; la SPA de Vite hoy no usa ninguno).
    if (!wasInBlock && /^['"]use\s+(?:client|server|strict)['"];?$/.test(lines[i].trim())) {
      lastCompleted = i;
      continue;
    }

    // `import.meta` / `import(` son expresiones, no declaraciones.
    if (/^import(?!\.)(?!\s*\()/.test(skeleton)) {
      inDeclaration = true;
      depth = 0;
      for (const ch of masked) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (depth <= 0 && /["';]$/.test(skeleton)) {
        inDeclaration = false; // completó en su propia línea de apertura
        lastCompleted = i;
      }
      continue;
    }

    firstCode = i; // primera línea de código real
    break;
  }

  // FAIL-CLOSED: una declaración de import que nunca cerró significa que el
  // archivo ya está roto (o excede lo que este fixer entiende). No escribir
  // en él: primero se diagnostica (g14-diagnose-css-imports.mjs), después
  // se corrige. v1 escribía igual → agravaba archivos ya corruptos.
  if (inDeclaration) return { text, fixes: 0 };

  const insertAt = lastCompleted >= 0 ? lastCompleted + 1 : firstCode;
  if (insertAt < 0) return { text, fixes: 0 }; // sin código, sin imports, sin header: ningún punto probado seguro

  lines.splice(insertAt, 0, importLine);
  return { text: lines.join("\n"), fixes: 1 };
}

/* ────────────────────────────────────────────────────────────────────────────
 * PARCHE DE COHERENCIA — checkC06_MissingCSSImport (~L1311), UNA línea:
 *
 *   ANTES (v1):
 *     const imported = /import\s+["'][^"']*\.css["']/.test(ctx.content);
 *
 *   DESPUÉS (G20 — mismos 3 patrones del fixer, lockstep por construcción):
 *     const imported =
 *       /import\s*["'][^"'\n]*\.css["']/.test(ctx.content) ||
 *       /from\s*["'][^"'\n]*\.css["']/.test(ctx.content) ||
 *       /\b(?:import|require)\s*\(\s*["'][^"'\n]*\.css["']/.test(ctx.content);
 *
 * Razón: sin esto, un archivo con `import styles from "./X.module.css"`
 * sería FLAGGEADO por C-06 (autoFixable: true) pero el fixer v2 se negaría
 * a tocarlo → violación eterna imposible de auto-fixear. El guard ampliado
 * en AMBOS lados mantiene el invariante "el checker flaguea ⇔ el fixer
 * fidea". (Refinación futura NO adoptada a propósito: exigir el .css
 * HERMANO exacto en el specifier — cambia la semántica de la regla y
 * empezaría a flaguear archivos que importan OTRO css; decisión de
 * producto, no de limpieza.)
 * ──────────────────────────────────────────────────────────────────────────── */
