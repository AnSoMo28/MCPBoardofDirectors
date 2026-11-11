// frontend/vite.config.ts — v2.0 (G14 · production grade)
//
// Cambios clave vs v1:
// - Env validado con zod vía loadEnv(): los .env* del proyecto ya NO se
//   ignoran (process.env solo ve el shell) y una URL malformada revienta
//   al arrancar, no en la primera petición de proxy.
// - import.meta.dirname (ESM puro, Node >= 20.11) en lugar del shim CJS
//   de __dirname que Vite inyecta por compatibilidad.
// - Alias en paridad EXACTA con tsconfig.app.json > paths (incluye el
//   barril "@shared" — antes: compilaba en tsc y reventaba en build).
// - manualChunks en forma de función: la forma de objeto NO expande
//   directorios y listaba "react-router-dom", que ni siquiera es
//   dependencia (react-router v7 unificó ambas entradas).
// - Config de Vitest: los tests de componentes necesitan un DOM real.

/// <reference types="vitest/config" />
import { join } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { z } from "zod";

const ENV_PREFIX = "VITE_";
const DEFAULT_API_URL = "http://localhost:8001";

/**
 * Fail-fast sobre el entorno de dev/build (misma filosofía fail-closed del
 * resto de la plataforma). zod ya es dependencia del proyecto: cero deps
 * nuevas. `.loose()` deja pasar el resto de variables VITE_* sin validarlas
 * aquí (cada consumidor valida las suyas en su frontera).
 */
const envSchema = z
  .object({
    VITE_API_URL: z.url().default(DEFAULT_API_URL),
  })
  .loose();

/**
 * manualChunks por ID de módulo. Motivos de la forma de función:
 * - La forma de objeto asigna MÓDULOS puntuales: "./src/shared/components/ui"
 *   resuelve como mucho a su index.ts (barril) — el resto del directorio
 *   cae en el chunk principal y la estrategia de bundling falla en silencio.
 * - Se normaliza el separador de rutas para que los chunks también se formen
 *   en Windows (los IDs llegan con backslash).
 * - react-router v7 es un único paquete; no existe react-router-dom en el
 *   árbol de dependencias (pnpm estricto no lo resolvería).
 */
function manualChunks(id: string): string | undefined {
  const normalized = id.replace(/\\/g, "/");

  if (!normalized.includes("/node_modules/")) {
    // DAG por capas — orden crítico: específico ANTES que genérico
    // (advisor-engine vive dentro de lib/; la regla genérica lo absorbería).
    //   shared-lib (fondo: lib + types + mocks)
    //     ← advisor-engine ← shared-ui ← index/features (top)
    // Antes: la fundación (utils/api/enums/mocks) se plegaba DENTRO de
    // shared-ui y el engine la importaba de vuelta →
    // "Circular chunk: shared-ui -> advisor-engine -> shared-ui".
    if (normalized.includes("/src/shared/lib/advisor-engine/")) return "advisor-engine";
    if (
      normalized.includes("/src/shared/lib/") ||
      normalized.includes("/src/shared/types/") ||
      normalized.includes("/src/shared/mocks/")
    ) {
      return "shared-lib";
    }
    if (normalized.includes("/src/shared/components/ui/")) return "shared-ui";
    return undefined;
  }

  if (/\/node_modules\/(react|react-dom|scheduler|react-router)\//.test(normalized)) {
    return "vendor-react";
  }
  if (normalized.includes("/node_modules/lucide-react/")) return "vendor-icons";
  if (normalized.includes("/node_modules/@tanstack/react-query/")) {
    return "vendor-query";
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  // loadEnv(mode, dir, prefix): lee .env, .env.local, .env.[mode], .env.[mode].local
  // y las variables VITE_* del proceso. Antes: VITE_API_URL declarado en
  // .env.development era ignorado por el proxy (silent fallback a localhost).
  const env = envSchema.parse(loadEnv(mode, import.meta.dirname, ENV_PREFIX));

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        // Paridad EXACTA con tsconfig.app.json > paths. La coincidencia es por
        // segmento completo ("@shared/x" no colisiona con "@"), pero se listan
        // los específicos primero por autodocumentación y defensa futura.
        "@shared": join(import.meta.dirname, "src", "shared"),
        "@features": join(import.meta.dirname, "src", "features"),
        "@stores": join(import.meta.dirname, "src", "stores"),
        "@app": join(import.meta.dirname, "src", "app"),
        "@": join(import.meta.dirname, "src"),
      },
    },

    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
      },
    },

    build: {
      // Explícito aunque coincida con el default de Vite 6: documenta el suelo
      // de navegadores que el CSS del sistema asume (@property, :has(),
      // color-mix(), container queries — todas baseline 2023). Si algún día se
      // baja este target, el CSS moderno lo reclamará aquí primero.
      target: ["chrome107", "edge107", "firefox104", "safari16"],
      // NOTA Bld2: el alias "baseline-widely-available" NO se traduce en Vite 6.4.2
      // (default real: "modules") — fuga verbatim a esbuild en vite:css-post y
      // vite:esbuild-transpile; esbuild lo rechaza. Esta lista es el equivalente
      // documentado del alias; re-evaluable al migrar a Vite 7+.
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },

    test: {
      // happy-dom: DOM real para montar componentes TSX (jsdom solo si algún
      // test necesita APIs que happy-dom no cubre). Importación explícita
      // desde "vitest" (globals: false) — estilo de la casa: nada implícito.
      environment: "happy-dom",
      globals: false,
      include: ["src/**/*.{test,spec}.{ts,tsx}", "tools/__tests__/**/*.{test,spec}.{ts,tsx}"],
      restoreMocks: true,
    },
  };
});
