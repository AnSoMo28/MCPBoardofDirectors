// frontend/eslint.config.js — v2.0 (G14 · production grade)
//
// Cambios clave vs v1:
// - Globals correctos por región: src/** corre en browser; vite.config.ts,
//   eslint.config.js y tools/** corren en Node (el config anterior aplicaba
//   globals.browser a TODO, incluido el guardian).
// - Reglas con información de tipos (recommendedTypeChecked) para src/** vía
//   projectService: tsserver resuelve el tsconfig dueño de cada archivo —
//   sin rutas manuales. Esto sube al baseline 2027: no-floating-promises y
//   compañía dejan de ser opcionales en un código que decide permisos.
// - reportUnusedDisableDirectives: "error" — un eslint-disable huérfano es
//   deuda silenciosa (misma filosofía que el guardian: nada muerto se coló).
// - Scope real de react-hooks/react-refresh: solo src/** (antes, reglas de
//   React sobre tooling de Node).

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

/** Código que corre en el browser (app React). */
const SRC = "src/**/*.{ts,tsx}";

/** Código que corre en Node: build, tooling y governance. */
const NODE_SIDE = ["eslint.config.js", "vite.config.ts", "tools/**/*.ts", "scripts/**/*.ts"];

export default defineConfig(
  globalIgnores(["dist", "coverage"]),

  // Base JS + TS (sin información de tipos) para TODO el repo:
  // el tooling también merece las reglas base.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Reglas type-checked SOLO para src/**. El resto (tools) se queda en
  // recommended: el guardian es una herramienta de línea de comandos, no
  // código de producto, y no debe bloquear el lint por tipado fino.
  ...tseslint.configs.recommendedTypeChecked.map((entry) => ({
    ...entry,
    files: [SRC],
  })),

  {
    files: [SRC],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // console.log / console.info = sobrante de debugging que se filtra a
      // producción. warn/error permitidos: patrón de la casa para avisos DEV
      // fail-fast (bus de development, warnings de provider).
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Globals de Node para el código que efectivamente corre en Node.
  {
    files: NODE_SIDE,
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // react-refresh: solo tiene sentido sobre componentes de la app.
  {
    ...reactRefresh.configs.vite,
    files: [SRC],
  },

  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
);
