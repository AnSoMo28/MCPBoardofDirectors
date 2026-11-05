#!/usr/bin/env node
/**
 * P2-A v2 · Bridge F24 end-to-end + gate espejo en /admin/members/intelligence
 *
 * Armado y verificado contra el código REAL del repo (master 2277844):
 * tsc -b 0 errores · build exit 0 (0 chunks >500 kB) · VI check 5 → clean
 * (−1 warning quirúrgico). La v1 quedó incompleta: widget sin prop de
 * callback → asignación sin uso (TS6133), y roles=["admin"] en minúsculas
 * → deny-all (el gate compara EXACTO contra UserRole "SOCIO"|"STAFF"|
 * "ADMIN"|"JUNTA", usePermissionGate.ts:248 roles.includes(user.role)).
 *
 *   A) src/stores/chat.store.ts — slot del bridge en el store (el canal que
 *      ya usa advisorContext): executeAction + setExecuteAction + tipo
 *      ChatBridgeAction ESTRUCTURAL (definido acá — Fix N del clúster auth).
 *   B) src/features/dashboard/ExecutiveDashboard.tsx — asigna el handler
 *      (`const handleChatAction =`) y lo registra en el store con cleanup;
 *      se re-registra cuando cambian los insights (única entrada dinámica
 *      del closure), espejo del efecto advisorContext que vive arriba.
 *   C) src/shared/components/chat/AIChatWidget.tsx — ChatBubble usa la prop
 *      onExecute (hoy declarada y muerta; el inline duplicado dentro de
 *      ChatActionCard se elimina); el caller pasa un handler bridge-first:
 *      si el dashboard registró executeAction → delega (reacciones +
 *      actionStates + toasts); si no (chat global en otra página) →
 *      fallback inline idéntico al actual.
 *   D) src/app/router.tsx — el alias legacy /admin/members/intelligence
 *      (redirect a /admin/member-360) espeja el gate EXACTO de su target:
 *      roles={["ADMIN", "STAFF", "JUNTA"]}, formato multilinea del router.
 *
 * PRERREQUISITO: descartar la v1:
 *   git restore src/app/router.tsx src/features/dashboard/ExecutiveDashboard.tsx
 *
 * EOL: cada línea preserva su terminador (LF o CRLF) — seguro en working
 * copies mixtos. Los anclas son \r-tolerantes; las inserciones heredan el
 * EOL de su línea ancla. (La v1 reescribía todo el archivo en LF — origen
 * del warning "LF will be replaced by CRLF" de tu git diff.)
 *
 * Modo: --dry (default) solo plan · --write aplica. Aborta sin tocar nada
 * si cualquier ancla no matchea exactamente una vez.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes("--write");

function fail(msg: string): never {
  console.error(`\n✗ ABORTADO (nada fue modificado): ${msg}`);
  console.error(`  ¿aplicaste la v1 sin descartar? git restore src/app/router.tsx src/features/dashboard/ExecutiveDashboard.tsx`);
  process.exit(1);
}

// ── Raíz del frontend (misma resolución que v1/VI) ──
function resolveRoot(): string {
  const rootArg = process.argv.find((a) => a.startsWith("--root="));
  if (rootArg) return rootArg.slice("--root=".length);
  for (const seed of [__dirname, process.cwd()]) {
    let dir = seed;
    for (let i = 0; i < 6; i++) {
      if (existsSync(join(dir, "src", "app", "router.tsx"))) return dir;
      if (existsSync(join(dir, "frontend", "src", "app", "router.tsx"))) return join(dir, "frontend");
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return fail("no localizo la raíz del frontend — usa --root=<frontend>");
}

// ── Edición con ancla única + EOL preservado por línea ──
interface Ctx {
  path: string;
  lines: string[]; // split("\n"): las líneas CRLF conservan su "\r" final
}

const bare = (l: string): string => l.replace(/\r$/, "");
const eolOf = (l: string): string => (l.endsWith("\r") ? "\r" : "");

function load(rel: string, root: string): Ctx {
  const path = join(root, "src", rel);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return fail(`no puedo leer ${path}`);
  }
  return { path, lines: raw.split("\n") };
}

function findLine(ctx: Ctx, needle: string, what: string): number {
  const hits: number[] = [];
  for (let i = 0; i < ctx.lines.length; i++) {
    if (bare(ctx.lines[i]!) === needle) hits.push(i);
  }
  if (hits.length !== 1) {
    return fail(`${ctx.path}: ancla "${what}" aparece ${hits.length} veces (esperaba 1): ${JSON.stringify(needle.slice(0, 60))}`);
  }
  return hits[0]!;
}

/** Inserta `newLines` (sin \r) tras `index`; heredan el EOL de la línea index. */
function insertAfter(ctx: Ctx, index: number, newLines: string[]): void {
  const sfx = eolOf(ctx.lines[index]!);
  ctx.lines.splice(index + 1, 0, ...newLines.map((l) => l + sfx));
}

/** Inserta `newLines` (sin \r) antes de `index`; heredan el EOL de esa línea. */
function insertBefore(ctx: Ctx, index: number, newLines: string[]): void {
  const sfx = eolOf(ctx.lines[index]!);
  ctx.lines.splice(index, 0, ...newLines.map((l) => l + sfx));
}

/** Reemplaza la línea `index` por `newLine` (sin \r); conserva su EOL. */
function replaceLine(ctx: Ctx, index: number, newLine: string): void {
  const sfx = eolOf(ctx.lines[index]!);
  ctx.lines[index] = newLine + sfx;
}

/** Reemplaza el rango [start, end] por `newLines`; heredan el EOL del bloque. */
function replaceRange(ctx: Ctx, start: number, end: number, newLines: string[]): void {
  const sfx = eolOf(ctx.lines[start]!);
  ctx.lines.splice(start, end - start + 1, ...newLines.map((l) => l + sfx));
}

function save(ctx: Ctx): void {
  // join("\n"): el "\r" de cada línea CRLF ya está embebido — byte-exacto.
  if (WRITE) writeFileSync(ctx.path, ctx.lines.join("\n"));
}

function show(label: string, line: string | string[]): void {
  const arr = Array.isArray(line) ? line : [line];
  for (const l of arr) console.log(`  ${label.padEnd(9)}| ${bare(l) || "(vacía)"}`);
}

// ═════════ A) chat.store.ts ═════════

function patchStore(root: string): void {
  const ctx = load("stores/chat.store.ts", root);

  const ifaceLine = findLine(ctx, "  setAdvisorContext: (ctx: AdvisorChatContext | null) => void;", "iface setAdvisorContext");
  insertAfter(ctx, ifaceLine, [
    "  /** Bridge F24: handler de acciones de chat registrado por el ExecutiveDashboard. */",
    "  executeAction: ((action: ChatBridgeAction) => Promise<void>) | null;",
    "  setExecuteAction: (fn: ((action: ChatBridgeAction) => Promise<void>) | null) => void;",
  ]);

  // Interfaz estructural — NO importa de la capa de componentes (Fix N).
  const riskLine = findLine(ctx, "  systemicRiskScore?: number;", "systemicRiskScore (cierre AdvisorChatContext)");
  const closeLine = riskLine + 1;
  if (bare(ctx.lines[closeLine]!) !== "}") {
    return fail(`chat.store.ts: esperaba '}' tras systemicRiskScore (línea ${closeLine + 1}), hay ${JSON.stringify(bare(ctx.lines[closeLine]!))}.`);
  }
  insertAfter(ctx, closeLine, [
    "/** Acción ejecutable del chat (forma estructural, isomorfa a AdvisorSuggestedAction). */",
    "export interface ChatBridgeAction {",
    "  label: string;",
    "  server: string;",
    "  tool: string;",
    "  params: Record<string, unknown>;",
    "  approval_level: string;",
    "}",
    "",
  ]);

  const implLine = findLine(ctx, "  setAdvisorContext: (ctx) => set({ advisorContext: ctx }),", "impl setAdvisorContext");
  insertAfter(ctx, implLine, [
    "  executeAction: null,",
    "  setExecuteAction: (fn) => set({ executeAction: fn }),",
  ]);

  console.log("\n── A) src/stores/chat.store.ts ──");
  show("AFTER", [
    "+ ChatBridgeAction (tipo estructural, sin import de componentes)",
    "+ executeAction: ((action: ChatBridgeAction) => Promise<void>) | null",
    "+ setExecuteAction: (fn) => set({ executeAction: fn })",
  ]);
  save(ctx);
}

// ═════════ B) ExecutiveDashboard.tsx ═════════

function patchDashboard(root: string): void {
  const ctx = load("features/dashboard/ExecutiveDashboard.tsx", root);

  // B.1 — selector del setter del bridge, junto al existente
  const selLine = findLine(ctx, "  const setAdvisorContext = useChatStore((s) => s.setAdvisorContext);", "selector setAdvisorContext");
  insertAfter(ctx, selLine, ["  const setExecuteAction = useChatStore((s) => s.setExecuteAction);"]);

  // B.2 — restaurar la asignación perdida del F24
  const arrowLine = findLine(ctx, "  async (chatAction: {", "async arrow F24 sin asignar");
  const before = ctx.lines[arrowLine]!;
  replaceLine(ctx, arrowLine, "  const handleChatAction = async (chatAction: {");

  // B.3 — registro en el store con cleanup (espejo del efecto advisorContext)
  const planLine = findLine(ctx, "  const handleGeneratePlan = async () => {", "handleGeneratePlan");
  insertBefore(ctx, planLine, [
    "  // F24: bridge de acciones — expone el handler al widget global de chat",
    "  useEffect(() => {",
    "    setExecuteAction(handleChatAction);",
    "    return () => setExecuteAction(null);",
    "    // eslint-disable-next-line react-hooks/exhaustive-deps",
    "  }, [globalInsights, setExecuteAction]);",
    "",
  ]);

  console.log("\n── B) src/features/dashboard/ExecutiveDashboard.tsx ──");
  show("BEFORE", before);
  show("AFTER", ctx.lines[arrowLine]!);
  show("AFTER", [
    "+ const setExecuteAction = useChatStore((s) => s.setExecuteAction);",
    "+ useEffect(() => { setExecuteAction(handleChatAction);",
    "+   return () => setExecuteAction(null); }, [globalInsights, setExecuteAction]);",
  ]);
  save(ctx);
}

// ═════════ C) AIChatWidget.tsx ═════════

function patchWidget(root: string): void {
  const ctx = load("shared/components/chat/AIChatWidget.tsx", root);

  // C.1 — import del store (dirección componente→store, como useAIChat)
  const importLine = findLine(ctx, 'import { useAIChat } from "./hooks/useAIChat";', "import useAIChat");
  insertAfter(ctx, importLine, ['import { useChatStore } from "@/stores/chat.store";']);

  // C.2 — ChatBubble: usar la prop onExecute (hoy muerta), soltar queryClient
  const sigLine = findLine(ctx, "function ChatBubble({ msg, queryClient, reduced }: {", "firma ChatBubble");
  replaceLine(ctx, sigLine, "function ChatBubble({ msg, onExecute, reduced }: {");
  const qcType = findLine(ctx, "  queryClient: ReturnType<typeof useQueryClient>;", "tipo queryClient en ChatBubble");
  ctx.lines.splice(qcType, 1);

  // C.3 — localizar los DOS bloques onExecute={async (action) => {…}}
  //   · el de ChatBubble (SIN "if (!action) return;") → onExecute={onExecute}
  //   · el del caller (CON guard) → bridge-first
  const starts: number[] = [];
  for (let i = 0; i < ctx.lines.length; i++) {
    if (/^(\s*)onExecute=\{async \(action\) => \{$/.test(bare(ctx.lines[i]!))) starts.push(i);
  }
  if (starts.length !== 2) {
    return fail(`AIChatWidget.tsx: esperaba 2 bloques onExecute={async (action) => {…}}, hay ${starts.length}.`);
  }
  const blocks = starts.map((start) => {
    const indent = (bare(ctx.lines[start]!).match(/^\s*/) ?? [""])[0]!;
    let end = -1;
    for (let j = start + 1; j < ctx.lines.length; j++) {
      if (bare(ctx.lines[j]!) === `${indent}}}`) { end = j; break; }
    }
    if (end === -1) return fail(`AIChatWidget.tsx: bloque onExecute en línea ${start + 1} sin cierre \`}}\`.`);
    return { start, end, indent, body: ctx.lines.slice(start, end + 1).join("\n") };
  });
  const bubbleBlock = blocks.find((b) => !b.body.includes("if (!action) return;"));
  const callerBlock = blocks.find((b) => b.body.includes("if (!action) return;"));
  if (!bubbleBlock || !callerBlock) return fail("AIChatWidget.tsx: no pude clasificar los 2 bloques onExecute (guard `if (!action) return;`).");

  // C.3a — ChatBubble: prop directa en el ChatActionCard
  replaceRange(ctx, bubbleBlock.start, bubbleBlock.end, [`${bubbleBlock.indent}onExecute={onExecute}`]);

  // C.3b — caller: bridge-first con fallback standalone (mismo cuerpo actual)
  const c = callerBlock.indent;
  const replacement = [
    `${c}onExecute={async (action) => {`,
    `${c}  if (!action) return;`,
    `${c}  const bridge = useChatStore.getState().executeAction;`,
    `${c}  if (bridge) {`,
    `${c}    await bridge(action);`,
    `${c}    return;`,
    `${c}  }`,
    `${c}  try {`,
    `${c}    await callMCPTool(action.server, action.tool, action.params);`,
    `${c}    queryClient.invalidateQueries();`,
    `${c}    showToast({ type: "success", message: \`Acción ejecutada: \${action.label}\` });`,
    `${c}  } catch {`,
    `${c}    showToast({ type: "error", message: \`Error al ejecutar: \${action.label}\` });`,
    `${c}  }`,
    `${c}}}`,
  ];
  // Relocalizar el bloque del caller por contenido (el primer reemplazo
  // desplazó líneas).
  const bodyLines = callerBlock.body.split("\n");
  let cs = -1;
  for (let i = 0; i <= ctx.lines.length - bodyLines.length; i++) {
    if (ctx.lines.slice(i, i + bodyLines.length).join("\n") === callerBlock.body) { cs = i; break; }
  }
  if (cs === -1) return fail("AIChatWidget.tsx: no pude relocalizar el bloque onExecute del caller tras el primer reemplazo.");
  replaceRange(ctx, cs, cs + bodyLines.length - 1, replacement);

  // C.4 — el caller ya no pasa queryClient a ChatBubble
  const qcProp = ctx.lines.findIndex((l) => /^(\s*)queryClient=\{queryClient\}$/.test(bare(l)));
  if (qcProp === -1) return fail("AIChatWidget.tsx: no encontré queryClient={queryClient} en el <ChatBubble …> del caller.");
  ctx.lines.splice(qcProp, 1);

  console.log("\n── C) src/shared/components/chat/AIChatWidget.tsx ──");
  show("BEFORE", "function ChatBubble({ msg, queryClient, reduced }: {");
  show("AFTER", "function ChatBubble({ msg, onExecute, reduced }: {");
  show("AFTER", [
    "- inline de ChatActionCard (9 líneas) → onExecute={onExecute}",
    '+ import { useChatStore } from "@/stores/chat.store";',
    "+ caller: bridge = useChatStore.getState().executeAction → delega;",
    "+   si no hay bridge → fallback inline idéntico al actual",
    "- queryClient={queryClient} (prop muerta en ChatBubble)",
  ]);
  save(ctx);
}

// ═════════ D) router.tsx ═════════

function patchRouter(root: string): void {
  const ctx = load("app/router.tsx", root);

  const anchor = '        element: <Navigate to="/admin/member-360" replace />,';
  const line = findLine(ctx, anchor, "element del alias intelligence");
  replaceRange(ctx, line, line, [
    "        element: (",
    '          <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>',
    '            <Navigate to="/admin/member-360" replace />',
    "          </PermissionGate>",
    "        ),",
  ]);

  console.log("\n── D) src/app/router.tsx ──");
  show("BEFORE", anchor);
  show("AFTER", [
    "        element: (",
    '          <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>',
    '            <Navigate to="/admin/member-360" replace />',
    "          </PermissionGate>",
    "        ),",
  ]);
  save(ctx);
}

// ═════════ MAIN ═════════

const root = resolveRoot();
console.log(`P2-A v2 · ${WRITE ? "--write (APLICA)" : "--dry (solo plan)"}`);
console.log(`root: ${root}`);

patchStore(root);
patchDashboard(root);
patchWidget(root);
patchRouter(root);

console.log("\n═══ RESUMEN ═══");
console.log("  A) chat.store.ts:      slot executeAction + tipo ChatBridgeAction");
console.log("  B) ExecutiveDashboard: handleChatAction asignado + registrado con cleanup");
console.log("  C) AIChatWidget:       prop onExecute viva + caller bridge-first");
console.log("  D) router.tsx:         gate espejo roles=[ADMIN,STAFF,JUNTA] del target");
console.log(WRITE ? "  Sigue con los gates: tsc -b · build · VI" : "  Re-ejecuta con --write para aplicar.");
