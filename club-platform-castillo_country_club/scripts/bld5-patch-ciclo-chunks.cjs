#!/usr/bin/env node
// scripts/bld5-patch-ciclo-chunks.cjs — v1 (Bld5) · Cirugía del ciclo de chunks
//
// DOS FASES (una por commit, en orden):
//   fase1 — Inversión de dependencia api → auth.store: api.ts deja de
//           importar @/stores/auth.store (edge ascendente lib → stores
//           que sostiene el ciclo de chunks) y expone un AuthDelegate;
//           auth.store.ts lo registra en module scope.
//   fase2 — Mapa de chunks DAG por capas en vite.config.ts: regla nueva
//           shared-lib (lib + types + mocks), específico antes que
//           genérico (advisor-engine vive dentro de lib/). Mata
//           "Circular chunk: shared-ui -> advisor-engine -> shared-ui".
//
// SEGURIDAD (fail-closed):
//   - Anclas por CONTENIDO exacto — nunca números de línea.
//   - Cada reemplazo exige el número EXACTO de ocurrencias; si algo no
//     cuadra, aborta SIN escribir nada (no hay estado parcial).
//   - Detecta y preserva EOL (CRLF/LF) y BOM de cada archivo.
//   - Idempotente: fase ya aplicada → avisa y sale 0.
//   - No crea .bak: el árbol debe estar limpio — git es el rollback.

"use strict";

const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { join, resolve } = require("node:path");

const TOOL = "bld5-patch-ciclo-chunks";
const PHASE = process.argv[2];

if (PHASE !== "fase1" && PHASE !== "fase2") {
  console.log(`Uso:
  node scripts/${TOOL}.cjs fase1   # api.ts + auth.store.ts  (commit 1)
  node scripts/${TOOL}.cjs fase2   # vite.config.ts          (commit 2)
Orden: fase1 → build + commit → fase2.`);
  process.exit(PHASE ? 2 : 0);
}

// ── Raíz del frontend ───────────────────────────────────────────────────────
const CANDIDATES = [
  resolve(__dirname, "..", "frontend"),
  resolve("frontend"),
  process.cwd(),
  resolve(process.cwd(), "frontend"),
];
const FRONTEND = CANDIDATES.find((d) => existsSync(join(d, "src")) && existsSync(join(d, "package.json")));
if (!FRONTEND) {
  console.error(`⛔ ${TOOL}: no encontré la raíz del frontend (dir con src/ + package.json).`);
  process.exit(2);
}
console.log(`${TOOL} v1 · ${PHASE} · frontend: ${FRONTEND.split("\\").join("/")}`);

// ── Helpers ─────────────────────────────────────────────────────────────────
function load(rel) {
  const path = join(FRONTEND, rel);
  const raw = readFileSync(path, "utf8");
  const bom = raw.charCodeAt(0) === 0xfeff;
  const text = bom ? raw.slice(1) : raw;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return { path, rel, text, bom, eol };
}
function save(f) {
  writeFileSync(f.path, (f.bom ? "\uFEFF" : "") + f.text, "utf8");
}
function count(f, needle) {
  return f.text.split(needle).length - 1;
}
function sub(f, label, from, to, expected) {
  const n = count(f, from);
  if (n !== expected) {
    console.error(`⛔ ${label}: esperaba ${expected} ocurrencia(s), encontré ${n}. NADA se escribió.`);
    console.error(`   Ancla: ${JSON.stringify(from.length > 90 ? from.slice(0, 90) + "…" : from)}`);
    process.exit(1);
  }
  f.text = f.text.split(from).join(to);
  console.log(`  ✓ ${label} · ${expected} reemplazo(s)`);
}
const E = (f, ...lines) => lines.join(f.eol);

// ── FASE 1 ──────────────────────────────────────────────────────────────────
if (PHASE === "fase1") {
  const api = load("src/shared/lib/api.ts");
  const IMPORT_LINE = 'import { useAuthStore } from "@/stores/auth.store";';

  if (count(api, IMPORT_LINE) === 0 && count(api, "setAuthDelegate") > 0) {
    console.log("✓ fase1 ya está aplicada en api.ts — nada que hacer.");
    process.exit(0);
  }
  if (count(api, IMPORT_LINE) === 0) {
    console.error("⛔ api.ts no contiene el import de useAuthStore NI el delegate — versión inesperada.");
    console.error("   Frená y reportame: output de PASO 0 (grep -c) + las primeras 70 líneas de api.ts.");
    process.exit(1);
  }

  console.log("· api.ts");
  const DELEGATE = E(api,
    "// ═══ Auth — delegate (inversión de dependencia · Bld5) ═══",
    "// ANTES: este módulo importaba @/stores/auth.store — la capa de",
    "// transporte (lib) dependía hacia ARRIBA de la capa de estado",
    "// (stores). Como auth.store importa signalBus del advisor-engine y",
    "// el engine importa utils/api de vuelta, ese edge sostenía el ciclo",
    "// de chunks 'Circular chunk: shared-ui -> advisor-engine -> shared-ui'.",
    "// DESPUÉS: api expone un AuthDelegate; auth.store lo registra al",
    "// cargarse (stores → lib: descendente y legal). Sin registro:",
    "// fail-closed 401.",
    "export interface AuthDelegate {",
    "  /** Access token vigente, o null si no hay sesión. */",
    "  getAccessToken(): string | null;",
    "  /** Refresca la sesión; rechaza si el refresh falla. */",
    "  refreshAccessToken(): Promise<void>;",
    "  /** Cierra la sesión (401 / token inválido o expirado). */",
    "  logout(): void;",
    "}",
    "",
    "let authDelegate: AuthDelegate | null = null;",
    "",
    "/** Registra el proveedor de auth — lo llama auth.store.ts en module scope. */",
    "export function setAuthDelegate(delegate: AuthDelegate): void {",
    "  authDelegate = delegate;",
    "}",
    "",
    "/** Acceso fail-closed: nunca se procede sin auth registrada. */",
    "function auth(): AuthDelegate {",
    "  if (!authDelegate) {",
    "    throw new APIError(",
    '      "Auth delegate no registrado — auth.store debe inicializarse antes de usar api",',
    "      401,",
    "    );",
    "  }",
    "  return authDelegate;",
    "}",
  );
  // Ancla: bloque de 2 líneas si calza; si no, línea sola (deja el @ts-ignore huérfano — cosmético)
  const anchor2 = E(api, "// @ts-ignore: TS2307 module not found", IMPORT_LINE);
  const useA = count(api, anchor2) === 1 ? anchor2 : IMPORT_LINE;
  sub(api, "A · import useAuthStore → AuthDelegate", useA, DELEGATE, 1);

  sub(api, "B · refreshSession (refresh + token)",
    E(api,
      "    await useAuthStore.getState().refreshAccessToken();",
      "    const newToken = useAuthStore.getState().accessToken;",
    ),
    E(api,
      "    await auth().refreshAccessToken();",
      "    const newToken = auth().getAccessToken();",
    ),
    1);

  sub(api, "C · logout prefijado (×2: refreshSession + backendCaller 401)",
    "    useAuthStore.getState().logout();",
    "    auth().logout();",
    2);

  sub(api, "D · getAuthToken destructure",
    "  const { accessToken, logout } = useAuthStore.getState();",
    "  const accessToken = auth().getAccessToken();",
    1);

  sub(api, "E · logout() sueltos en getAuthToken (×2)",
    "    logout();",
    "    auth().logout();",
    2);

  sub(api, "F · isDevMockMode",
    "  return useAuthStore.getState().accessToken === DEV_MOCK_TOKEN;",
    "  return authDelegate?.getAccessToken() === DEV_MOCK_TOKEN;",
    1);

  if (count(api, "useAuthStore") !== 0) {
    console.error("⛔ verificación post-parche: quedan referencias a useAuthStore en api.ts — NADA se escribió.");
    process.exit(1);
  }

  console.log("· auth.store.ts");
  const store = load("src/stores/auth.store.ts");
  if (count(store, "setAuthDelegate") === 0) {
    sub(store, "G · import setAuthDelegate",
      'import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";',
      E(store,
        'import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";',
        'import { setAuthDelegate } from "@/shared/lib/api";',
      ),
      1);
    if (!store.text.endsWith(store.eol)) store.text += store.eol;
    store.text += E(store,
      "",
      "// ═══ Registro del delegate de auth (inversión de dependencia · Bld5) ═══",
      "// api.ts ya NO importa este módulo: ese edge (lib → stores) sostenía",
      "// el ciclo de chunks con el advisor-engine (stores → engine → lib).",
      "// El registro corre en module scope: para el primer render ya está",
      "// hecho (providers.tsx importa este store en el bootstrap).",
      "setAuthDelegate({",
      "  getAccessToken: () => useAuthStore.getState().accessToken ?? null,",
      "  refreshAccessToken: async () => {",
      "    await useAuthStore.getState().refreshAccessToken();",
      "  },",
      "  logout: () => useAuthStore.getState().logout(),",
      "});",
    ) + store.eol;
    console.log("  ✓ H · registro del delegate al final del archivo");
  } else {
    console.log("  ✓ ya contiene setAuthDelegate — se omite (idempotente)");
  }

  save(api);
  save(store);
  console.log(`✓ fase1 aplicada. Verificá (tsc + build) y commiteá SOLO api.ts y auth.store.ts`);
  process.exit(0);
}

// ── FASE 2 ──────────────────────────────────────────────────────────────────
if (PHASE === "fase2") {
  const vite = load("vite.config.ts");
  if (count(vite, "shared-lib") > 0) {
    console.log("✓ fase2 ya está aplicada — nada que hacer.");
    process.exit(0);
  }

  sub(vite, "I · manualChunks → DAG por capas",
    E(vite,
      '  if (!normalized.includes("/node_modules/")) {',
      '    if (normalized.includes("/src/shared/components/ui/")) return "shared-ui";',
      '    if (normalized.includes("/src/shared/lib/advisor-engine/")) return "advisor-engine";',
      "    return undefined;",
      "  }",
    ),
    E(vite,
      '  if (!normalized.includes("/node_modules/")) {',
      "    // DAG por capas — orden crítico: específico ANTES que genérico",
      "    // (advisor-engine vive dentro de lib/; la regla genérica lo absorbería).",
      "    //   shared-lib (fondo: lib + types + mocks)",
      "    //     ← advisor-engine ← shared-ui ← index/features (top)",
      "    // Antes: la fundación (utils/api/enums/mocks) se plegaba DENTRO de",
      "    // shared-ui y el engine la importaba de vuelta →",
      '    // "Circular chunk: shared-ui -> advisor-engine -> shared-ui".',
      '    if (normalized.includes("/src/shared/lib/advisor-engine/")) return "advisor-engine";',
      "    if (",
      '      normalized.includes("/src/shared/lib/") ||',
      '      normalized.includes("/src/shared/types/") ||',
      '      normalized.includes("/src/shared/mocks/")',
      "    ) {",
      '      return "shared-lib";',
      "    }",
      '    if (normalized.includes("/src/shared/components/ui/")) return "shared-ui";',
      "    return undefined;",
      "  }",
    ),
    1);

  save(vite);
  console.log('✓ fase2 aplicada. Rebuildeá: la línea "Circular chunk" debe DESAPARECER.');
  process.exit(0);
}