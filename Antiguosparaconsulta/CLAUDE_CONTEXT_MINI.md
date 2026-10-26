1) CLAUDE_CONTEXT_MINI.md

markdown
markdown
# CLAUDE_CONTEXT_MINI.md — Castillo Country Club

> Contexto comprimido para continuidad entre chats.
> Optimizado para que el LLM procese lo esencial sin perder detalle.
> Si necesitás profundizar en un agente específico, pasá el archivo .py aparte.

**Última actualización:** Mayo 2025 — Post Fase 10 completada

---

## 0. ROL

**Principal FullStack Engineer** del Castillo Country Club.
4 disciplinas: FullStack Engineering, UI/UX Architecture, Product Strategy, Private Club Operations (Costa Rica).

**Regla de oro:** Yo propongo y analizo ANTES de escribir código. El usuario aprueba antes de generar. Changelog detallado al final de cada bloque.

---

## 1. PROYECTO

Web app para gestión integral del Castillo Country Club, club de campo de alto nivel en Costa Rica.

**Stack:**
- React 19 + TypeScript
- React Router v7 (createBrowserRouter)
- TanStack Query — `useMCPQuery` / `useMCPMutation`
- Zustand — auth, theme, sidebar, notification-prefs
- Tailwind CSS 4 (via @tailwindcss/vite)
- Framer Motion, Lucide React
- Vite proxy: `/api` → `localhost:8001`
- Backend FastAPI + MCP agents (NO REST genérica). Excepción REST: auth + chat

**Roles:**
| Frontend | Backend | Acceso |
|----------|---------|--------|
| ADMIN | "admin" | Total |
| STAFF | "staff" | Operaciones |
| JUNTA | "junta" | Directiva, reportes, finanzas |
| SOCIO | "socio" | Portal /mi-club |

Auth: login devuelve tokens + role (lowercase) → auth.store normaliza UPPERCASE.

---

## 2. ARQUITECTURA MCP

Frontend → useMCPQuery(server, tool, params, options)
↓
callMCPTool (api.ts)
↓
getMockResponse() → REGISTRY
↓
¿Existe mock? → Devuelve mock
No existe → Fetch backend (/api/agents/{server}/{tool})

text
text

**Mock System (contracts → factories → registry):**
src/shared/mocks/
├── contracts.ts ← Shape EXACTO de cada tool response (NUNCA se borran)
├── factories.ts ← Factory functions que satisfacen contracts
└── mock-registry.ts ← Registry nested: { server: { tool: factory } }

text
text
- Para migrar a backend real: eliminar key del registry. 0 cambios en componentes.
- Contracts son el source of truth de la API.

**Sistema de aprobaciones:**
| Nivel | Significado |
|-------|-------------|
| AUTO | Sin intervención |
| SEMI | Aprobación condicional |
| HITL | Human-in-the-loop siempre |
| ALWAYS_HUMAN | Doble confirmación |

Escalación condicional: `register_guest` (>4/día→HITL), `send_personalized_notification` (>100 dest→HITL), `export_report` (audiencia externa→HITL).

---

## 3. DESIGN SYSTEM — "Silver Tide"

**REGLA DE ORO: NUNCA colores hardcoded. SIEMPRE tokens.**

### Token Map
--color-abyss: #080B12 (fondo base)
--color-surface-0: #0D1117 (superficies base)
--color-surface-1: #151B24 (nivel 1)
--color-surface-2: #1C2230 (nivel 2 — datos/cards)
--color-surface-3: #242C3A (nivel 3)


--color-silver-100: #F0F2F5 (texto bright)
--color-silver-200: #D8DCE4 (texto principal)
--color-silver-300: #B8C0CC (texto secondary)
--color-silver-400: #8A95A5 (texto muted)
--color-silver-500: #5C6978 (placeholder)
--color-silver-600: #3D4755 (disabled)


--color-gold-400: #C9A96E (acento primario)
--color-teal-400: #2A9AB5 (funcional/datos)
--color-emerald-400: #3DAA70 (éxito)
--color-amber-400: #D4A840 (warning)
--color-rose-400: #C46470 (error)
--color-terracotta-400: #D47A5A (tierra/charts)
--color-sage-400: #5B8A6A (verde elegante)

text
text

### Patrones de superficie
bgColors: color-mix(in srgb, var(--color-xxx) 12%, transparent)
Bordes: border-white/[0.06] sutil | [0.08] medio | [0.12] emphasis
Shadows: var(--shadow-card) | var(--shadow-elevated)
Datos: bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)]

text
text

### Tipografía
--font-display: "Cormorant Garamond" — headings
--font-body: "Source Serif 4" — body text
--font-ui: "DM Sans" — UI elements
--font-mono: "DM Mono" — data/numbers

text
text

### Recharts
**SIEMPRE** importar de `shared/lib/chartTheme.ts`. SVG attrs requieren HEX, no CSS vars.
Archivo: `shared/lib/chartTheme.ts` — CHART, TOOLTIP_STYLE, AXIS_TICK, CHART_PALETTE, CHART_COLORS.

### Aurora Glow
GlowButton: borde rotatorio conic-gradient. Card con `glowColor` prop.
Paleta por actividad en CLAUDE_CONTEXT.md completo.

### Glass card
`backdrop-filter` SOLO para superficies decorativas, NUNCA para datos.

---

## 4. PATRÓN DE IMPLEMENTACIÓN AI (Estándar desde Fase 9)

| Nivel | Patrón | Ejemplo |
|-------|--------|---------|
| 1. Datos (auto-load) | `useMCPQuery` con `staleTime` | wellness_report, list_pricing |
| 2. Inteligencia (on-demand) | `useMCPQuery` con `enabled: shouldFetch` | wellness_anomalies, detect_conflicts |
| 3. Two-phase | Dos triggers separados | insights → predictions |

Herramientas de inteligencia: `{module}_predict`, `{module}_anomalies`, `{module}_correlate`, `{module}_insights`.
Backend NO las implementa aún. Se mockean. Cuando backend las implemente → quitar del registry.

---

## 5. 22 REGLAS DE TRABAJO

### Tokens & Theming (1-5)
1. NUNCA colores hardcoded — siempre `var(--color-xxx)` o `color-mix`
2. NUNCA `backdrop-filter` para superficies de datos — `bg-[var(--color-surface-2)]` sólido
3. Recharts: importar de `shared/lib/chartTheme.ts` — NUNCA hex inline
4. Siempre mostrar changelog con reemplazos exactos
5. Código completo cuando cambios >30%, quirúrgico cuando ≤15 líneas

### Charts (6-10)
6. SIEMPRE `ResponsiveContainer`
7. CHART constants de chartTheme para configuración
8. SIEMPRE `formatCurrency`/`formatNumber` para labels
9. TOOLTIP_STYLE sin blur, sólido con `bg-[var(--color-surface-1)]`
10. AXIS_TICK para axis labels

### UX & Accessibility (11-16)
11. `focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]`
12. `min-h-[44px]` en todos los elementos interactivos
13. `DetailTabs` shared component para navegación de secciones
14. `EmptyState` shared para estados vacíos
15. `showToast({ type, message })` para feedback — NUNCA `alert()`
16. `PageContainer` + breadcrumb para pages (paths absolutos con `/admin/` prefix)

### Componentes (17-22)
17. `Button` de `@/shared/components/ui` — NUNCA raw `<button>` para acciones
18. `useReducedMotion()` SIEMPRE antes de animaciones
19. AI features: AIDecisionPanel shared + on-demand — SIEMPRE botón, NUNCA auto-load
20. `useBreakpoint()` para responsive JS (matchMedia, event-driven). Mobile: <640, Tablet: 640-1023, Desktop: ≥1024
21. Tablas: `hidden sm:block` en phone. Phone usa cards alternativas via `sm:hidden`
22. `cn()` utility para conditional classes

---

## 6. SHARED COMPONENTS DISPONIBLES

PageContainer, StatCard, EmptyState, Card, CardHeader, Badge, Button, Skeleton, Table, Modal, FilterDropdown, DetailTabs, GlowButton, Toast, FormField, WizardStepper, AIDecisionPanel

**Hooks:** useMCPQuery, useMCPMutation, useBreakpoint, useReducedMotion

**Utils:** cn, formatCurrency, formatPercent, formatNumber, formatUSD, getGreeting, timeAgo, roleLabel

---

## 7. ESTADO DEL SPRINT

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1-5 | Infraestructura, tokens, forms, lists, details | ✅ |
| 6 | Dashboards densos + AI | ✅ |
| 7 | Reports, mi-club, settings, finance | ✅ |
| 8 | Dashboard sub-componentes | 🔄 5/12 done |
| 9 | Wellness + Satisfaction | ✅ |
| **10** | **Proactive Recommendations** | **✅ COMPLETADA** |
| 11 | Communication Enhancement | ⬜ SIGUIENTE |
| 12 | Guest Management + Trial Memberships | ⬜ |
| 13 | Finance Enhancement + HITL Complete | ⬜ |
| 14 | Print/PDF + Export | ⬜ |
| 15 | Integration Testing + QA | ⬜ |
| 16 | Mock → Backend Migration | ⬜ |

---

## 8. PENDIENTES ACUMULADOS

| # | Issue | Severidad | Archivo | Fase sugerida |
|---|-------|-----------|---------|---------------|
| 1 | FinancialDashboard: métricas que no aparecen | MEDIA | `features/finance/FinancialDashboard.tsx` | 13 |
| 2 | AIChatWidget: posición movida de derecha a izquierda | MEDIA | `shared/components/chat/AIChatWidget.tsx` | 15 |
| 3 | ApprovalQueue: 2 tipos nuevos (optimize_pricing, suggest_new_activities) | MEDIA | `features/approvals/ApprovalQueue.tsx` | 13 |
| 4 | Dashboard sub-componentes: 7/12 pendientes (violations reglas) | MEDIA | `features/dashboard/components/` | 8 |
| 5 | Tier mismatch backend↔frontend | MEDIA | `features/families/types.ts` | 13 |

---

## 9. METODOLOGÍA DE TRABAJO

1. Leer el agente backend completo (tools, models, enums)
2. Proponer visión de arquitectura ANTES de código
3. Usuario aprueba
4. Generar en bloques de 3 archivos
5. Changelog detallado al final de cada bloque
6. Verificación contra las 22 reglas
7. Tools de inteligencia nuevas se mockean primero
8. Contracts NUNCA se borran
9. Decisiones de sesión → registrar en checkpoint

---

## 10. CÓMO PROFUNDIZAR

Este mini context cubre el 90% de lo necesario. Para fases específicas, pasar adicionalmente:

| Necesidad | Qué pasar |
|-----------|-----------|
| Trabajar en un agente específico | El archivo `backend/src/club_mcp/agents/{agent}.py` + `models/{model}.py` |
| Saber qué tools tiene un agente | Tabla de tools del agente (ver CLAUDE_CONTEXT.md Sección 6) |
| Mapeo archivos↔agentes | Ver CLAUDE_CONTEXT.md Sección 8 |
| Detalle de una fase completada | El checkpoint de esa fase |
| Hitos históricos | Ver CLAUDE_CONTEXT.md Secciones 14-16 |
