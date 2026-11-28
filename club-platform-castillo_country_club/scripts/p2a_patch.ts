#!/usr/bin/env node
/**
 * P2-A · ExecutiveDashboard F24 wire-up + PermissionGate en /admin/members/intelligence
 *
 * Dos parches quirúrgicos (exactamente 2 archivos, deltas conocidos):
 *
 *   PATCH 1 — src/features/dashboard/ExecutiveDashboard.tsx
 *     El bloque "Advisor Chat Action Bridge (F24)" quedó como async arrow
 *     SIN asignar (se perdió el `const handleChatAction =` en un edit
 *     anterior): expression statement no-op, compila, dead code — el
 *     bridge de chat nunca se cablea. Fix: restaurar la asignación y
 *     pasarla al widget de chat como prop onAction (si el widget acepta
 *     una prop de callback — se detecta leyendo su interfaz).
 *
 *   PATCH 2 — src/app/router.tsx
 *     /admin/members/intelligence es el ÚNICO admin route sin gate de 37.
 *     Fix: envolver el `element:` de esa ruta en <PermissionGate …/>.
 *     El permiso se DERIVA del registro real en shared/types/permissions.ts
 *     (preferencia: members.intelligence > members.view > admin.members >
 *     el que use la ruta admin vecina MÁS parecida). Si el registro no
 *     expone ninguno de esos, usa roles={["admin"]} (solo roles) — nunca
 *     inventa un permiso que no exista en la unión.
 *
 * Modo: `--dry` (default) solo imprime el plan con BEFORE/AFTER;
 *       `--write` aplica. Aborta sin tocar nada si un ancla no matchea
 *       exactamente una vez (hand-merge con drift → frenar y reportar).
 *
 * Requisitos: Node 18+. Sin dependencias.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════ CLI ═══════════════════════════

const WRITE = process.argv.includes("--write");

// Raíz del frontend: --root=<path>, o si no, semillas (dirname del script,
// luego cwd) caminando hacia arriba hasta hallar src/app/router.tsx —
// directamente (script dentro de frontend/) o bajo frontend/ (script en el
// scripts/ HERMANO de frontend/, layout G25 — misma lección del VI).
function resolveRoot(): string {
  const rootArg = process.argv.find((a) => a.startsWith("--root="));
  if (rootArg) return rootArg.slice("--root=".length);
  const seeds = [__dirname, process.cwd()];
  for (const seed of seeds) {
    let dir = seed;
    for (let i = 0; i < 6; i++) {
      if (existsSync(join(dir, "src", "app", "router.tsx"))) return dir;
      if (existsSync(join(dir, "frontend", "src", "app", "router.tsx"))) return join(dir, "frontend");
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return fail("no pude localizar la raíz del frontend (src/app/router.tsx ni frontend/src/app/router.tsx). Pásala con --root=<frontend>");
}
const ROOT = resolveRoot();
const SRC = join(ROOT, "src");

function fail(msg: string): never {
  console.error(`\n✗ ABORTADO (nada fue modificado): ${msg}`);
  console.error(`  Frena y pega este output + el archivo mencionado.`);
  process.exit(1);
}

function info(msg: string): void {
  console.log(msg);
}

// ═══════════════ PATCH 1 — F24 wire-up ═══════════════

interface Patch1Result {
  file: string;
  linesBefore: number;
  linesAfter: number;
  arrowLine: number; // 1-based
  widgetProp: string | null; // prop de callback detectada en el widget
  widgetLine: number; // 1-based
}

function patch1(dashboardPath: string, widgetCandidates: string[]): Patch1Result {
  const original = readFileSync(dashboardPath, "utf8");
  const lines = original.split("\n");

  // ── Ancla A: la async arrow sin asignar, bajo el banner F24 ──
  // Busca la línea del comentario "Advisor Chat Action Bridge (F24)"
  // y la primera `async (` / `async (` tras ella que NO esté precedida
  // por `const`/`let`/`var`/`=`/`return`/`await`/`(`/`,` en la misma línea.
  const bannerIdx = lines.findIndex((l) =>
    /Advisor Chat Action Bridge \(F24\)/i.test(l),
  );
  if (bannerIdx === -1) fail(`ExecutiveDashboard.tsx: no encontré el banner "Advisor Chat Action Bridge (F24)".`);

  let arrowIdx = -1;
  for (let i = bannerIdx + 1; i < Math.min(bannerIdx + 30, lines.length); i++) {
    const line = lines[i]!;
    if (/^\s*async\s*\(/.test(line) || /^\s*async\s+\(/.test(line)) {
      arrowIdx = i;
      break;
    }
  }
  if (arrowIdx === -1) fail("ExecutiveDashboard.tsx: no encontré la async arrow sin asignar tras el banner F24 (¿ya fue corregida?). Pega las líneas " + (bannerIdx + 1) + "–" + (bannerIdx + 30) + ".");

  // Verificación de no-asignación: la línea NO debe contener = antes de async(
  if (/=/.test(lines[arrowIdx]!.split("async")[0]!)) {
    fail(`ExecutiveDashboard.tsx:${arrowIdx + 1}: la arrow YA tiene asignación — el dead-code ya fue corregido. Nada que hacer en el parche 1.`);
  }

  // ── Ancla B: el widget de chat y su prop de callback ──
  // El widget se usa en JSX; su prop de callback se lee de la interfaz
  // del archivo del widget (candidates: shared/components/chat/AIChatWidget.tsx
  // y features/dashboard/...). Prioridad de props: onAction > onChatAction >
  // onInsightAction > onChatMessage.
  let widgetProp: string | null = null;
  let widgetFile: string | null = null;
  for (const c of widgetCandidates) {
    let content: string;
    try {
      content = readFileSync(join(SRC, c), "utf8");
    } catch {
      continue;
    }
    widgetFile = c;
    for (const prop of ["onAction", "onChatAction", "onInsightAction", "onChatMessage"]) {
      const re = new RegExp(`(?:readonly\\s+)?${prop}\\s*\\??:\\s*\\(`);
      if (re.test(content)) {
        widgetProp = prop;
        break;
      }
    }
    if (widgetProp) break;
  }

  // Ancla C: la línea JSX donde se renderiza el widget (para pasar la prop).
  // Busca el primer tag del widget en el cuerpo del return.
  const widgetTag = widgetFile
    ? (widgetFile.split("/").pop() ?? "").replace(/\.tsx$/, "")
    : "AIChatWidget";
  let widgetLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`<${widgetTag}[\\s/>]`).test(lines[i]!)) {
      widgetLine = i;
      break;
    }
  }
  // Si el tag está en la MISMA estructura que ya recibe la prop, no re-agregar.
  let alreadyWired = false;
  if (widgetLine !== -1 && widgetProp) {
    const tagBlock = lines.slice(widgetLine, widgetLine + 6).join("\n");
    alreadyWired = new RegExp(`${widgetProp}\\s*=`).test(tagBlock);
  }

  // ── Aplicación ──
  const patched = lines.slice();
  const indent = (lines[arrowIdx]!.match(/^\s*/) ?? [""])[0]!;
  patched[arrowIdx] = `${indent}const handleChatAction = ${lines[arrowIdx]!.trim()}`;

  let note = "";
  if (widgetLine !== -1 && widgetProp && !alreadyWired) {
    // Inserta la prop en el tag auto-cerrado o de apertura.
    // El indent se toma del TAG (no de la arrow) para quedar alineado.
    const tagIndent = (lines[widgetLine]!.match(/^\s*/) ?? [""])[0]!;
    const tag = patched[widgetLine]!;
    if (/\/>\s*$/.test(tag)) {
      patched[widgetLine] = tag.replace(/\s*\/>\s*$/, `\n${tagIndent}  ${widgetProp}={handleChatAction}\n${tagIndent}/>`);
    } else if (/>\s*$/.test(tag)) {
      patched[widgetLine] = tag.replace(/\s*>\s*$/, ` ${widgetProp}={handleChatAction}>`);
    }
    note = ` · prop ${widgetProp} pasada al <${widgetTag}>`;
  } else if (alreadyWired) {
    note = " · la prop ya estaba cableada (solo faltaba la asignación)";
  } else {
    note = ` · sin prop de callback detectada en el widget (${widgetFile ?? "no encontrado"}) — solo se restaura la asignación; el cableado JSX se hace a mano`;
  }

  if (WRITE) writeFileSync(dashboardPath, patched.join("\n"));

  info("");
  info("── PATCH 1 · F24 wire-up ──");
  info(`  archivo: ${dashboardPath}`);
  info(`  BEFORE  (línea ${arrowIdx + 1}): ${lines[arrowIdx]!.trim()}`);
  info(`  AFTER   (línea ${arrowIdx + 1}): ${patched[arrowIdx]!.trim()}`);
  if (widgetLine !== -1 && widgetProp && !alreadyWired) {
    info(`  AFTER   (línea ${widgetLine + 1}): ${patched[widgetLine]!.trim().replace(/\n/g, " ⏎ ")}`);
  }
  info(`  líneas: ${lines.length} → ${patched.length}${note}`);

  return {
    file: dashboardPath,
    linesBefore: lines.length,
    linesAfter: patched.length,
    arrowLine: arrowIdx + 1,
    widgetProp,
    widgetLine: widgetLine + 1,
  };
}

// ═══════════════ PATCH 2 — PermissionGate ═══════════════

interface Patch2Result {
  file: string;
  routeLine: number; // 1-based
  permission: string | null; // null → roles={["admin"]}
  usedRoles: boolean;
  linesBefore: number;
  linesAfter: number;
}

function patch2(routerPath: string, permissionsPath: string): Patch2Result {
  const router = readFileSync(routerPath, "utf8");
  const lines = router.split("\n");

  // ── Ancla: la declaración de la ruta objetivo ──
  const ROUTE = "admin/members/intelligence";
  let routeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/path:\s*["']([^"']+)["']/);
    if (m && m[1] === ROUTE) {
      routeIdx = i;
      break;
    }
  }
  if (routeIdx === -1) fail(`router.tsx: no encontré path: "${ROUTE}".`);

  // Ventana hasta la próxima declaración de ruta (misma regla que VI check 5).
  let windowEnd = lines.length;
  for (let j = routeIdx + 1; j < lines.length; j++) {
    if (/path:\s*["']/.test(lines[j]!)) {
      windowEnd = j;
      break;
    }
  }
  const windowLines = lines.slice(routeIdx, windowEnd);

  // Si ya hay gate en la ventana, no tocar.
  const GATES = ["PermissionGate", "RequirePermission", "GuardedRoute", "AdminGuard"];
  if (windowLines.some((l) => GATES.some((g) => l.includes(g)))) {
    fail(`router.tsx:${routeIdx + 1}: la ruta ya tiene gate — el hallazgo del VI ya fue corregido. Nada que hacer en el parche 2.`);
  }

  // ── Element a envolver ──
  const elemIdx = windowLines.findIndex((l) => /element:\s*<[^>]*>/.test(l));
  if (elemIdx === -1) {
    fail(`router.tsx:${routeIdx + 1}: no encontré \`element: <Componente />\` en una sola línea dentro de la ruta. Pega las líneas ${routeIdx + 1}–${windowEnd}.`);
  }
  const elemLineIdx = routeIdx + elemIdx;
  const elemLine = lines[elemLineIdx]!;

  // ── Permiso derivado del registro real ──
  let permission: string | null = null;
  let usedRoles = false;
  try {
    const permSrc = readFileSync(permissionsPath, "utf8");
    const candidates = [
      "members.intelligence",
      "members.view",
      "admin.members",
      "members.manage",
    ];
    permission = candidates.find((c) => permSrc.includes(`"${c}"`)) ?? null;
  } catch {
    permission = null; // registro no legible → roles fallback
  }
  if (!permission) usedRoles = true;

  // ── Import de PermissionGate (si falta) ──
  const hasImport = lines.some((l) => /import\s+.*PermissionGate/.test(l));
  const patched = lines.slice();
  let importNote = "";
  if (!hasImport) {
    // Inserta tras el último import existente.
    let lastImport = -1;
    for (let i = 0; i < Math.min(60, lines.length); i++) {
      if (/^import\s/.test(lines[i]!)) lastImport = i;
    }
    if (lastImport === -1) fail(`router.tsx: no encontré imports — pega las primeras 20 líneas.`);
    patched.splice(lastImport + 1, 0, `import { PermissionGate } from "@/shared/components/auth/PermissionGate";`);
    if (elemLineIdx >= lastImport + 1) {
      // elemLineIdx se desplaza +1 por el import insertado
    }
    importNote = " · import de PermissionGate añadido";
  }

  // Recalcula el índice del element tras el posible import.
  let targetIdx = elemLineIdx;
  if (!hasImport) targetIdx += 1;
  const elem = patched[targetIdx]!;
  const elemMatch = elem.match(/element:\s*(<.*\/>)\s*,?\s*$/);
  if (!elemMatch) {
    fail(`router.tsx:${targetIdx + 1}: \`element:\` no matchea el patrón \`element: <X />,\` en una línea. Pega la línea completa.`);
  }
  const inner = elemMatch[1]!;
  const gate = permission
    ? `<PermissionGate permission="${permission}">${inner}</PermissionGate>`
    : `<PermissionGate roles={["admin"]}>${inner}</PermissionGate>`;
  patched[targetIdx] = elem.replace(elemMatch[1]!, gate);

  if (WRITE) writeFileSync(routerPath, patched.join("\n"));

  info("");
  info("── PATCH 2 · PermissionGate en /admin/members/intelligence ──");
  info(`  archivo: ${routerPath} · ruta en línea ${routeIdx + 1}`);
  info(`  BEFORE  (línea ${elemLineIdx + 1}): ${elemLine.trim()}`);
  info(`  AFTER   (línea ${targetIdx + 1}): ${patched[targetIdx]!.trim()}`);
  info(`  permiso: ${permission ?? '(ninguno del registro) → roles={["admin"]}'}`);
  info(`  líneas: ${lines.length} → ${patched.length}${importNote}`);

  return {
    file: routerPath,
    routeLine: routeIdx + 1,
    permission,
    usedRoles,
    linesBefore: lines.length,
    linesAfter: patched.length,
  };
}

// ═══════════════ MAIN ═══════════════

function main(): void {
  const mode = WRITE ? "--write (APLICA)" : "--dry (solo plan)";
  info(`P2-A patch · ${mode}`);
  info(`root: ${ROOT}`);

  const dashboardPath = join(SRC, "features", "dashboard", "ExecutiveDashboard.tsx");
  const routerPath = join(SRC, "app", "router.tsx");
  const permissionsPath = join(SRC, "shared", "types", "permissions.ts");

  const widgetCandidates = [
    "shared/components/chat/AIChatWidget.tsx",
    "shared/components/chat/AdvisorChatWidget.tsx",
    "features/dashboard/components/AIChatWidget.tsx",
  ];

  const p1 = patch1(dashboardPath, widgetCandidates);
  const p2 = patch2(routerPath, permissionsPath);

  info("");
  info("═══ RESUMEN ═══");
  info(`  ExecutiveDashboard.tsx: F24 asignado (línea ${p1.arrowLine})${p1.widgetProp ? ` + prop ${p1.widgetProp} al widget (línea ${p1.widgetLine})` : ""}`);
  info(`  router.tsx: gate en ${p2.permission ? `permission="${p2.permission}"` : 'roles={["admin"]}'}`);
  info(WRITE ? "  Ejecuta ahora los gates (tsc/build/VI)." : "  Re-ejecuta con --write para aplicar.");
}

main();
