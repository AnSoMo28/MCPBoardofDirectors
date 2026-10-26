# MASTER_CHECKPOINT.md — Project State & Execution Plan
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 7.0 · Generación G7 (sincronizada) · Date: 2026-08-12
### Updates: Master Self-Audit G7 (hallazgos #31-#60 corregidos), artefactos
###          de la capa de gobierno integrados (Lotes 1-2), Vision 2027
###          restaurada, conteos verificados contra evidencia real

---

## CHANGELOG G7 (v6.1 → v7.0)

```
ESTRUCTURA:
- Markdown puro sin envoltorio ```markdown (hallazgos #31/#32).
- Versionado sincronizado G7 junto a BASE v7.0 y CHECKLIST v7.0.

CONTENIDO:
- §0.1: registro extendido a 60 problemas (30 previos + 30 nuevos del
  Master Self-Audit G7, #31-#60); los "5 pending" ahora ENUMERADOS (#46).
- §0.2: Vision 2027 con DETALLE COMPLETO restaurado — v6.1 decía
  "see original if needed" (referencia colgante, #47).
- §0.3 NUEVO: Master Self-Audit G7 — scores pre/post y mecanismo
  anti-regresión (regenerar en cada generación).
- §1.1: jerarquía de autoridad corregida (sentencia 4 contradecía
  la 1 — #34-adj); §1.2: divergencia de tokens RESUELTA en globals.css
  v2.2 (verificado contra el archivo real: 9 tokens sincronizados,
  --font-body eliminado) — v6.1 documentaba la divergencia sin acción
  trackeable (#57).
- §1.5: 9 dominios sin aura color marcados PENDIENTES (no se inventan
  valores — regla de scope §4.3 BASE).
- §2.2: conteos recomputados con matemática explícita (components 92 =
  24+20+11+2+10+3+2+17+1+2; shared/ ~197) — errores #42/#43.
- §3.2: AdvisorActionModal 9.2 FLAGGED (bajo umbral) — #44.
- §3.5 NUEVO: Governance Layer Rewrite (Lotes 1-2) con artefactos y
  versiones reales — manifest v3.1.0, guardian v4.1.1 (26 checks),
  validator v4.0.0, verify-integration v3.0.0 (8 checks), globals v2.2.
- §4: OVERALL con FÓRMULA explícita (9.33 ponderado por unidades) —
  v6.1 decía 9.35 sin fórmula y "7.8 pending" inverificable (#45).
- §6: PENDING REVIEW corregido a 9 entradas / 14 archivos físicos
  (v6.1 decía "2" — #41); LOWEST 9.2 registrado con flag (#44);
  stats inverificables (STD DEV) eliminados.
- §7: BC-01..BC-04 intactos (el sync de tokens ya se aplicó en
  globals.css v2.2 — no requiere BC nuevo).
- §8: Export 17 (v6.1: 15, error #42); ML separado 7 componentes +
  3 hooks; totales recomputados.
- §9: FASE 22-26 aclaradas como FASES DE CIERRE (no features).
- §12: REESCRITO — el SSOT del audit status es AUDITED_REGISTRY del
  manifest (27 entradas verificadas); v6.1 mantenía una lista manual
  divergente (#59); "(or wherever)" eliminado — path real (#48).
- §13: "(if exists)" eliminado — PageContainer existe según §8 (#49).
- §14: REQUEST 2 actualizado (globals.css ya auditado 9.7; utils.ts
  es PENDING REWRITE score 7.2 según manifest, no mera auditoría #58).
- §6.1 BASE: frontend 1.151 archivos (digest verificado) vs ~810
  estimado (#55) — refleja también aquí el estado total.
```

---

╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  MASTER CHECKPOINT v7.0 — DEFINITIVE CONSOLIDATED REFERENCE (G7)         ║
║                                                                          ║
║  Status: FASE 0 ✅ · FASE 1 UI ✅ · FASE 1.5 Shared/ ✅                  ║
║          · Lotes 1-2 Governance ✅ · FASE 2 Events (30%) → EN CURSO      ║
║                                                                          ║
║  UI Components migrated:         23 / 23 (shared/components/ui/)         ║
║  Shared/ files rewritten:        7 / 7 (core infrastructure)             ║
║  Governance layer (Lotes 1-2):   5 / 5 artefactos (manifest, guardian,   ║
║                                   validator, verify-integration, globals)║
║  Events feature files:           9 / ~30 (fuentes de datos completas)    ║
║  Events pages:                   0 / 3 (EventCalendar EN REVISIÓN — §13) ║
║  Shared/ audit for feature use:  0 / 7 (PENDIENTE — §13)                 ║
║  Overall UI score:               4.2 → 9.3 (+121%)                       ║
║  Overall Shared/ score:          7.97 → 9.31 (+17%)                      ║
║  globals.css:                    v2.1 6.2 → v2.2 9.7 (re-audit Lote 2)   ║
║  Total project files:            ≈ 1.286 (frontend 1.151 VERIFICADO     ║
║                                   por guardian v4.1.1 + backend ~123 +   ║
║                                   config ~12; v6.1 decía ~945 = #55)     ║
║  Critical issue:                 Shared/ components used without audit    ║
║                                                                          ║
║  THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR PROJECT STATE.          ║
║  For rules: see MASTER_BASE.md §8.                                       ║
║  For checks: see MASTER_CHECKLIST.md.                                    ║
║  For audit status per-file: AUDITED_REGISTRY (manifest §8) — SSOT real.  ║
║  EVERY FILE THAT EXITS THIS PROCESS PASSES THIS CHECKPOINT.              ║
║  ZERO TOLERANCE. NO SHORTCUTS. NO COMPROMISES.                           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

---

## §0.1 — THE BRUTAL DIAGNOSIS (registro completo: 60 problemas)

```
ORIGINAL PROBLEMS (pre-migration):
  1. Token divergence (8+ tokens wrong values)
  2. Generic keyframes without namespace (107+ frames)
  3. Missing -webkit-backdrop-filter on glass primitives
  4. Material easing (0.4,0,0.2,1) instead of Apple (0.32,0.72,0,1)
  5. Mixed styling: CSS + Tailwind + inline styles
  6. framer-motion in shared UI (30KB+ bundle)
  7. Zero responsive breakpoints
  8. Scrollbar 6px instead of 3px

DISCOVERED DURING SHARED/ AUDIT (FASE 1.5):
  9.  "OK (no mock)" silent success in api.ts
  10. `null as T` casts in mcp-router.ts
  11. useExecutiveSummary domain hook in shared/ (violation)
  12. HealthFactorStatus values in Spanish
  13. Side effect inside useMemo in engine.ts
  14. ~120 flat exports in barrel
  15. 8 Spanish hardcoded toast messages
  16. setPlans updater pattern duplicated 6 times
  17. Manual JWT decode without base64url handling
  18. Concurrent token refresh race condition
  19. showToast in infrastructure layer (api.ts)
  20. 13 duplicate AdvisorBanners across features
  21. ~7 test files for 400+ source files
  22. Deprecated files left in repo (11 files)

DISCOVERED DURING FASE 2 (v6.0):
  23. Shared components imported without reading implementation
  24. AdvisorCommand.action field missed in rules/events.ts
  25. BaseContext imported from wrong module

DISCOVERED DURING CROSS-AUDIT v6.1:
  26. "Checkpoint v7" label error in token table (§1.2)
  27. Triple discrepancy of shared/ lists (§5 vs §12 vs §13)
  28. Checklist B (80 checks) missing detail in v6.0
  29. Golden Rule 5 changed between v3.0 and v6.0 without tracking
  30. Score math inconsistent across all versions

DISCOVERED DURING MASTER SELF-AUDIT G7 (nuevos — #31-#60):
  ESTRUCTURA (críticos de absorción):
  31. Fence corruption en CHECKLIST v6.1 (```markdown duplicado +
      stray fence) — rompía el parseo/absorción del documento
  32. Doble envoltorio ```markdown en los 3 archivos — frágil al pegar
  MATEMÁTICA (conteos divergentes):
  33. BASE §2.3: resumen "5/3/3" ≠ matriz real (4 completos, 5 parciales,
      2 pendientes)
  41. §6 "PENDING REVIEW: 2" vs 9 entradas reales (14 archivos físicos)
  42. §8 Export decía "(15)" — el inventario lista 17 (4+11+2)
  43. §2.2 components "~82" vs 92 según el propio inventario §8
  50. CHECKLIST §11 "~46 anti-patterns" vs 52 reales (14+20+13+5)
  51. CHECKLIST §16: suma bruta de scripts 128 vs "111 automatable"
      sin reconciliación de solapamientos
  CONTRADICCIONES DIRECTAS:
  34. BASE RULE 1 invertía la jerarquía de autoridad de tokens
      (vs CHECKPOINT §1.1 que sí la definía bien)
  35. BASE §1.1 ↔ §9 duplicaban el protocolo de sesión (viola la
      regla anti-dup §1.3 del propio BASE)
  36. BASE §1.3 ↔ §9.1 duplicaban los mapas de referencia
  37. BASE §4.1 PHASE 3 omitía Checklist H (inconsistente con §16)
  38. A-09 ("default except legacy") vs BASE §8.3 ("0 default exports")
  39. BASE §5.2 "3 breakpoints mínimo" vs template §13 y D9 (2 checks)
  44. §3.2 AdvisorActionModal 9.2 vs §6 "LOWEST COMPLETED: 9.3" —
      además está BAJO el umbral 9.3 sin flag
  45. §4 "OVERALL 9.35" sin fórmula; "7.8 with pending" inverificable
  60. Versiones de herramientas stale en los masters (guardian "v2.0
      24 checks", validator "v2.0") vs artefactos reales entregados
  REFERENCIAS COLGANTES (contenido ausente):
  46. §0.1 "25 resolved, 5 pending" — los 5 pendientes no enumerados
  47. Vision 2027 "see original if needed" + CHECKLIST §14.1
      "unchanged from v6.0" + §14.2/§14.3 "See original" — contenido
      obligatorio AUSENTE del sistema de masters
  48. §12/§14 "(or wherever)" para globals.css — el path es conocido
      y está normalizado en el manifest ("styles/globals")
  49. §13 "(if exists)" para PageContainer — existe según §8
  TERMINOLOGÍA Y TAXONOMÍA:
  40. Taxonomía de estados sin criterio (¿cuándo COMPLETO vs PARCIAL?);
      simbología mixta "✅ PARCIAL" vs "⚠️ Parcial"
  52. CHECKLIST §12 "7 Pillars" colisionaba con los 11 Pilares (BASE §2)
  53. BASE §0.1 TIER 4 "(13 Dimensions?)" — indecisión en gobernanza
  54. BASE §3 "~28 archivos" — conteo no verificable (mezclaba
      infraestructura con trabajo per-feature)
  EVIDENCIA vs ARTEFACTOS REALES (Lotes 1-2):
  55. Frontend "~810 archivos" vs 1.151 del digest de producción
      verificado por guardian v4.1.1
  56. Masters referenciaban guardian "v2.0 (24 checks)" — real: v4.1.1
      con 26 checks; validator "v2.0" — real: v4.0.0; verify-integration
      sin versión — real: v3.0.0 con 8 checks
  57. v6.1 documentaba la divergencia de tokens §1.2 SIN acción
      trackeable — real: RESUELTA en globals.css v2.2 (9 tokens
      sincronizados, --font-body eliminado, verificado)
  58. utils.ts listado como simple "REQUEST 2" — real (manifest):
      PENDING REWRITE, score 7.2, 6 violaciones U-01..U-06, RC-3
  59. §12 mantenía lista manual de audit (11 files) divergente del
      AUDITED_REGISTRY real del manifest (27 entradas) — el manifest
      es el SSOT, el master debe apuntar ahí

BOOKKEEPING G7 (verificable):
  Problemas 1-30 (v6.1):
    25 resueltos antes de G7 ✓
    5 PENDIENTES, ahora ENUMERADOS (era #46):
      P-1: 7 shared/ files sin auditar (§13) — bloquea EventCalendar
      P-2: BC-02 QueryClient error handler — bloqueante runtime
      P-3: BC-01 HealthFactorStatus values — pendiente
      P-4: BC-03 api convenience removal — pendiente (pre-FASE 3)
      P-5: BC-04 TrendDirection re-export — pendiente
  Problemas 31-60 (Master Self-Audit G7):
    30/30 RESUELTOS en esta generación G7 ✓
    (evidencia por hallazgo en §0.3 y en los CHANGELOG de cada master)
```

---

## §0.2 — VISION 2027 (detalle RESTAURADO — era referencia colgante #47)

```
1. THE UI IS AN AI ORCHESTRATOR
   La UI no muestra datos: dirige la orquestación de agentes. Cada
   pantalla refleja el estado del sistema multi-agente — qué agente
   está activo, qué está decidiendo, qué necesita aprobación humana.
   El usuario conduce un equipo de IA; no rellena formularios.

2. PREDICTION IS THE DEFAULT
   Toda vista responde "qué pasará" antes de "qué pasó". Las métricas
   llevan tendencia + pronóstico + rango de incertidumbre (G-04).
   El pasado es contexto; el futuro es el producto.

3. EVERY INSIGHT IS ACTIONABLE
   Cero insights sin CTA (D-01, F-10). Un insight sin acción es ruido.
   Cada tarjeta lleva su acción: aprobar, simular, ajustar, delegar.

4. THE SYSTEM LEARNS
   El advisor-engine calibra (calibration.ts), construye learning
   profiles y propone su propia evolución (evolution-proposer). El
   sistema de hoy es mediblemente mejor que el de ayer — y la UI lo
   comunica explícitamente.

5. CROSS-DOMAIN INTELLIGENCE
   SignalBus conecta dominios: un evento cultural afecta engagement
   familiar que afecta finanzas. La UI revela cadenas causales
   (CausalChainViz), no métricas aisladas por silo.

6. AMBIENT INTELLIGENCE
   El fondo de la plataforma respira el estado del sistema: auras de
   dominio, health scores, canvas ambiental predictivo (propuesta #2
   de §10). El usuario percibe la salud del club sin leer un número.

7. NATURAL LANGUAGE INTERACTION
   CommandPalette + AIChatWidget + NLRuleAuthor: crear, consultar y
   modificar mediante lenguaje natural. El formulario es el fallback,
   no el camino principal.
```

---

## §0.3 — MASTER SELF-AUDIT G7 (NUEVO — regenerar en cada generación)

```
METODOLOGÍA:
  Los 3 documentos master se auditan a sí mismos con la misma escala
  y umbral que el resto del proyecto (BASE §0.2: ≥ 9.3). Esta sección
  es la evidencia de auditoría de la generación actual.

SCORES PRE-G7 → POST-G7:
  MASTER_BASE.md        v2.0: 6.4 → v7.0: 9.5 ✅
  MASTER_CHECKPOINT.md  v6.1: 6.6 → v7.0: 9.5 ✅
  MASTER_CHECKLIST.md   v6.1: 6.1 → v7.0: 9.5 ✅
  (v6.1 del CHECKLIST era el peor: fence corruption + contenido
   obligatorio ausente en §14 + matemática rota en §16)

EVIDENCIA DE LOS SCORES PRE-G7 (los 10 más severos):
  🔴 #31  fence corruption (rompía la absorción del CHECKLIST entero)
  🔴 #47  contenido obligatorio ausente (§14.1-14.3 "see original")
  🔴 #33  resumen de pilares contradecía su propia matriz
  🔴 #44  score 9.2 registrado como "lowest 9.3" — bajo umbral oculto
  🔴 #34  RULE 1 invertía la jerarquía canónica de tokens
  🔴 #38  contradicción default exports entre A-09 y §8.3
  🔴 #41  "PENDING REVIEW: 2" con 9 entradas reales
  🔴 #51  suma de automatización 128 ≠ 111 declarados
  🔴 #55  ~810 archivos estimados vs 1.151 reales verificados
  🔴 #59  lista de audit manual divergente del SSOT (manifest)

QUÉ SE VERIFICÓ CONTRA ARTEFACTOS REALES (no claims internos):
  - globals.css v2.2: 9 tokens §1.2 sincronizados ✓ (leído del archivo)
  - guardian v4.1.1: TOOL_VERSION + 26 checks X-series ✓ (parseado)
  - manifest v3.1.0: AUDITED_REGISTRY con 27 entradas ✓ (parseado)
  - validator v4.0.0: TOOL_VERSION ✓ (leído)
  - verify-integration v3.0.0: 8 checks con ids/títulos ✓ (parseado)
  - utils.ts: PENDING REWRITE 7.2, U-01..U-06 ✓ (nota del manifest)

MECANISMO ANTI-REGRESIÓN (para que NO vuelvan a generarse errores):
  1. Tabla de consistencia CHECKLIST §16.3 — regenerar en cada cambio
     de generación; si un número no cuadra, la generación NO se publica
  2. scripts/verify-master-consistency.py — guard ejecutable
     (portar a tools/master-audit.ts en el repo como tarea G8-01)
  3. Versionado sincronizado G7 (BASE §0.3) — jamás versionar por separado
  4. Los masters referencian al manifest como SSOT de audit status —
     jamás mantener listas manuales paralelas (#59)
  5. Todo conteo en los masters lleva su matemática explícita al lado
```

---

## §1 — DESIGN SYSTEM REFERENCE

### §1.1 Token Authority Hierarchy

```
1. THIS CHECKPOINT §1.2 is AUTHORITY (canonical hex values)
2. globals.css §1 is IMPLEMENTATION of that authority — debe
   reflejar §1.2 EXACTAMENTE (estado v2.2: sincronizado ✓)
3. Component CSS CONSUMES tokens — never redefines them
4. Si un valor no está en §1.2, no existe. Si globals.css diverge
   de §1.2, globals.css se corrige.
   (G7: la sentencia 4 de v6.1 — "if a value isn't in globals.css,
   it doesn't exist" — contradecía la sentencia 1; corregida.)
```

### §1.2 Token Reconciliation Table (estado: SINCRONIZADO en v2.2)

```
Token                CANON (§1.2)         globals.css v2.2   Estado
─── ──────────────── ──────────────────   ─────────────────  ──────────
--color-silver-200   #E8EAF0              #E8EAF0            ✓ synced
--color-silver-600   #4A5568              #4A5568            ✓ synced
--color-silver-700   #3A4050              #3A4050            ✓ synced
--color-rose-400     #E85D6E              #E85D6E            ✓ synced
--color-rose-500     #D64457              #D64457            ✓ synced
--color-surface-0    #0C1018              #0C1018            ✓ synced
--color-surface-1    rgba(12,16,24,.75)   rgba(12,16,24,.75) ✓ synced
--color-surface-2    rgba(12,16,24,.6)    rgba(12,16,24,.60) ✓ synced
--font-body          (no definir)         (removed)          ✓ eliminado

G7 (hallazgo #57): la divergencia que v6.1 documentaba ("Checkpoint ✓"
sin acción trackeable) quedó RESUELTA en globals.css v2.2 (Lote 2) —
verificado contra el archivo real. El fix de v6.1 ("column renamed
from 'Checkpoint v7'" — problema #26) se preserva como historial:
la columna CANON es esta tabla, única fuente de valores.
Conteos verificados de globals.css v2.2: 75 tokens · 107 keyframes ·
28 @property (machine-verified por scripts/css-audit/).
```

### §1.3 Tokens Added to globals.css

```
/* Colors */
--color-gold-200: #E8D5A0;
--color-gold-700: #8B692A;

/* Shadows */
--shadow-card:    0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03) inset;
--shadow-float:   0 12px 40px rgba(0,0,0,0.3);
--shadow-hero:    0 20px 60px rgba(0,0,0,0.4);
--shadow-overlay: 0 24px 80px rgba(0,0,0,0.5);

/* Easing */
--ease-apple:  cubic-bezier(0.32, 0.72, 0, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-micro:  ease-out;

/* Spacing */
--gap-panel:   14px;
--gap-card:    10px;
--gap-metric:  6px;
--gap-timeline: 5px;
--gap-action:  5px;
```

### §1.4 BEM Namespace Registry (28 prefijos — conteo verificado)

```
Prefix     Domain                Example Files
─── ────── ──────────────────── ─────────────────────────
.ui-       shared/components/ui  Button, Card, Badge...
.glass-    globals.css           glass-card, glass-panel
.lunar-    globals.css effects   lunar-btn, lunar-sweep
.frost-    globals.css effects   frost-card, frost-badge
.glow-     globals.css effects   glow-card
.ev-       events                EventCalendar, EventDetail
.fm-       families              FamilyList, FamilyConstellation
.sp-       sports                SportsDashboard, AthleticRadar
.cu-       cultural              CulturalDashboard, VenueBrain
.en-       engagement            EngagementDashboard, DNAHelix
.fi-       finance               FinancialDashboard, LivingCommand
.gu-       guests                GuestManagementDashboard, Pipeline
.me-       members               Member360Dashboard, ChurnOracle
.cm-       communications        CommunicationDashboard, Cortex
.we-       wellness              WellnessDashboard, AnomalyRadar
.fa-       facilities            FacilitiesDashboard, MaintenanceOracle
.ag-       age-group             AgeGroupDashboard, GenerationalPrism
.db-       dashboard             ExecutiveDashboard, PulseRadar
.ab-       advisor banner (unified)
.mc-       mi-club               MiClubLanding, MyReservations
.op-       operations            OperationsDashboard
.rc-       recommendations       RecommendationsDashboard
.rp-       reports               BoardReportViewer, RiskHeatmap
.ai-       ai-system             AISystemPage
.st-       settings              SettingsPage
.au-       auth                  LoginPage, GlassLoginCard
.ap-       approvals             ApprovalQueue
.do-       documents             DocumentRepository, KnowledgeQuery

(28 prefijos = 5 globales + 20 core features + 3 cross-cutting ✓)
```

### §1.5 Domain Color Map (AI auras) — 14 asignados + 9 PENDIENTES

```
Domain           Primary Token           Aura CSS Var
─── ──────────── ────────────────────── ─────────────────
global           --color-gold-400        --aura-global
events           --color-emerald-400     --aura-events
families         --color-violet-400      --aura-families
sports           --color-sky-400         --aura-sports
cultural         --color-amber-400       --aura-cultural
engagement       --color-rose-400        --aura-engagement
finance          --color-emerald-400     --aura-finance
guests           --color-cyan-400        --aura-guests
members          --color-indigo-400      --aura-members
communications   --color-pink-400        --aura-comms
wellness         --color-teal-400        --aura-wellness
facilities       --color-orange-400      --aura-facilities
age-group        --color-lime-400        --aura-age-group
recommendations  --color-violet-400      --aura-recs

PENDIENTES DE ASIGNACIÓN (G7 — no se inventan valores, regla de
scope BASE §4.3; decisión de diseño pendiente del usuario):
  dashboard · mi-club · operations · reports · ai-system ·
  settings · auth · approvals · documents
  → task D-01: asignar aura token + var por dominio y añadir a
    globals.css v2.3 (junto a --aura-* existentes)
```

### §1.6 Keyframe Naming Convention

```
Pattern: <prefix>-<DescriptiveName>

CONVENCIÓN G7 (canon — resuelve mezcla kebab/camel):
  NUEVOS keyframes:   kebab-case  (ui-btn-spin, ev-calendar-reveal)
  EXISTENTES en producción: NO renombrar (churn cero) — se tolera
  camelCase ya shipped (fm-cardRevealIn, fm-memRevealIn)

NEVER: fadeIn, slideUp, pulse (generic names rejected)

Verified examples (from completed components):
  ui-btn-spin, ui-modal-overlay-in, ui-skeleton-shimmer
  ui-reaction-orb-breathe, ui-cmd-spin, ui-approval-item-in

Events feature (planned — usar kebab):
  ev-calendar-reveal, ev-hero-breathing, ev-rsvp-cascade

Existing feature keyframes (do not rename):
  fm-cardRevealIn, fm-memRevealIn
```

---

## §2 — ARCHITECTURE

### §2.1 CSS Layer Architecture

```
Layer 0: DESIGN TOKENS        → globals.css @theme {} + :root {}
Layer 1: SHARED PRIMITIVES    → globals.css §4-7
Layer 2: UI COMPONENTS        → shared/components/ui/<Name>.css
Layer 3: FEATURE COMPONENTS   → features/<name>/components/<Name>.css
Layer 4: FEATURE ATOMS        → features/<name>/<name>-atoms.css (optional)
Layer 5: GLOBAL OVERRIDES     → globals.css §9-10
```

### §2.2 Shared/ Architecture (Real — conteos recomputados G7)

```
src/shared/  (~197 archivos — recomputado del inventario §8:
              92 components + 30 hooks + ~65 lib + 3 types + 5 mocks
              + 1 services + 1 template = 197; v6.1 decía ~180 =
              hallazgo #43; task V-01: verificar contra árbol real)

├── components/ (92 — matemática: 24+20+11+2+10+3+2+17+1+2)
│   ├── AdvisorBanner.tsx        ← UNIFIED advisor banner ✅
│   ├── InsightCard.tsx
│   ├── ui/ (23 + barrel = 24)   ← ✅ MIGRATED FASE 1
│   ├── layout/ (20)             ← DashboardLayout, Header, Sidebar...
│   ├── ai/ (11)                 ← AIDecisionPanel, CausalChainViz...
│   ├── chat/ (2)                ← AIChatWidget + hook
│   ├── ml/ (10 = 7 comp + 3 hooks) ← MLDashboard, CalibrationDashboard...
│   ├── auth/ (3)                ← PermissionGate, ProtectedRoute
│   ├── error/ (2)               ← ErrorBoundary, NotFoundPage
│   ├── export/ (17 = 4 + 11 decision/* + 2 hooks)  ← v6.1 decía 15 (#42)
│   └── feedback/ (1)            ← Placeholder
│
├── hooks/ (30)
│   ├── useMCPQuery.ts           ← ✅ REWRITTEN 9.3
│   ├── useAutonomousAdvisor.ts  ← ✅ REWRITTEN 9.3
│   └── ... (28 more: useBreakpoint, useDataFreshness, etc.)
│
├── lib/ (~65)
│   ├── advisor-engine/ (~45)    ← ✅ REWRITTEN (12 rules + 33 modules)
│   ├── mcp/ (3)                 ← ✅ REWRITTEN
│   ├── api.ts                   ← ✅ REWRITTEN 9.3
│   ├── utils.ts                 ← ⚠️ PENDING REWRITE 7.2 (U-01..U-06)
│   └── ... (15+: financial/, ui/, analytics...)
│
├── types/ (3)                   ← ai-intelligence, domain-enums, permissions
├── mocks/ (5)                   ← contracts, factories, mock-registry...
├── services/ (1)                ← exportService
└── features/__TEMPLATE__/       ← types template

DEPRECATED (11 files): TO BE ELIMINATED (FASE 22)
```

### §2.3 Placement Rules (Golden Rule)

```
Style used by 2+ features?      → globals.css (Layer 1)
Style used by 1 feature?         → co-located CSS (Layer 3)
Component used by 2+ features?   → shared/components/ (Layer 2)
Component used by 1 feature?     → feature directory
Hook used by 2+ features?        → shared/hooks/
Hook used by 1 feature?          → feature's hooks/
```

---

## §3 — COMPLETED WORK

### §3.1 FASE 0: globals.css ✅ (re-auditado en Lote 2)

```
globals.css v2.0 (FASE 0) → v2.1 → v2.2 (Lote 2):
  v2.2 score 9.7/10 (v2.1 pre-audit: 6.2/10)
  27 parches quirúrgicos CRLF-preserving, 0 animaciones muertas,
  0 undefined vars, 0 claim drift, 17/17 checks GC PASS
  Conteos verificados: 75 tokens · 107 keyframes · 28 @property
  Tokens §1.2 sincronizados (9) + --font-body eliminado
```

### §3.2 FASE 1: UI Components (23/23) ✅

```
Core Batch (1-6):              4.7 → 9.3 (+97%)
Form & Data Batch (7-12):      4.4 → 9.3 (+111%)
Glass & Surface (13-15):       4.2 → 9.3 (+121%)
Intel Extended (16-19):        4.1 → 9.3 (+127%)
Pre-batch (AdvisorActionModal): 5.7 → 9.2 (+61%)  ⚠️ FLAG G7:
  9.2 < umbral 9.3 — re-audit pendiente (hallazgo #44; v6.1 lo
  ocultaba afirmando "LOWEST COMPLETED: 9.3")
Intelligence Batch (20-22):    3.7 → 9.4 (+154%)
OVERALL:                       4.2 → 9.3 (+121%)
Nota G7: las deltas porcentuales están verificadas
(ej. AdvisorActionModal: (9.2−5.7)/5.7 = +61% ✓)
```

### §3.3 FASE 1.5: Shared/ Infrastructure Rewrite (7/7) ✅

```
#  File                          Before  After   Delta
1  api.ts                         6.6     9.3    +41%
2  mcp/mcp-router.ts              8.6     9.3     +8%
3  hooks/useMCPQuery.ts           7.5     9.3    +24%
4  advisor-engine/types.ts        8.6     9.3     +8%
5  advisor-engine/index.ts        7.3     9.3    +27%
6  advisor-engine/engine.ts       9.0     9.4     +4%
7  hooks/useAutonomousAdvisor.ts  8.2     9.3    +13%
AVERAGE: 7.97 → 9.31 (+17%) · ALL ≥ 9.3 ✅
(matemática verificada: 55.8/7 = 7.971 ✓ · 65.2/7 = 9.314 ✓)
```

### §3.4 FASE 2: Events Feature Migration (IN PROGRESS — 30%)

```
SHARED PARALLEL:
  rules/events.ts                   ✅ 9.4
  signal-bus.ts                     ✅ 9.4

EVENTS — COMPLETED (9 files):
  types.ts                          ✅ 9.3
  config.ts                         ✅ 9.3
  index.ts (barrel)                 ✅ 9.4
  hooks/useEventAdvisor.ts          ✅ 9.4
  hooks/useEventData.ts             ✅ 9.4
  hooks/useEventCalendar.ts         ✅ 9.3
  hooks/useEventDetail.ts           ✅ 9.4
  hooks/useEventForm.ts             ✅ 9.4
  lib/calendarSignals.ts            ✅ 9.4

EVENTS — PENDING:
  EventCalendar.tsx + .css          ⚠️ EN REVISIÓN (bloqueado por §13)
  EventDetail.tsx + .css            → NOT STARTED
  EventForm.tsx + .css              → NOT STARTED
  Components (13): CalendarGrid, EventHero, EventAdvisorBanner,
    EventFormSteps, EventListView, EventLivePreview, ChronoCompass,
    EventIntelligencePanel, ProgramTimeline, PulseRing, QuickAddPanel,
    RsvpBoard, VendorGrid → ALL NOT STARTED

FEATURE AVERAGE (completed): 9.37 · ALL ≥ 9.3 ✅
(matemática verificada: 84.3/9 = 9.367 ✓)
```

### §3.5 GOVERNANCE LAYER REWRITE — LOTES 1-2 ✅ (NUEVO G7)

```
Los 5 artefactos backbone reescritos a production grade senior expert
(más el Lote 4 — BC-02 package — ver §3.5.1):

#  Artefacto                       Versión  Score    Evidencia
1  architecture.manifest.ts        v3.2.0   9.3+     SSOT: MODULE_INVENTORY
   (G7: v3.1.0, 993 líneas)                         + AUDITED_REGISTRY (27
                                                    entradas) + VERSION_SYNC;
                                                    v3.2.0 = BC-02 APPLIED
                                                    (Lote 4, §14 BC-02 LEDGER)
2  tools/architecture-guardian.ts  v4.1.1   9.3+     26 checks X-series;
   (≈2.300 líneas)                                  verificado vs digest de
                                                    producción: 1.151 files,
                                                    30.075 violaciones, 8.0/10
3  tools/validate-shared-imports.ts v4.0.0  9.3+     Registry-driven (carga
                                                    AUDITED_REGISTRY del
                                                    manifest — sin lista
                                                    hardcoded #59); --fix,
                                                    --json, --strict
4  scripts/verify-integration.ts   v3.0.0   9.3+     8 checks (router lazy,
                                                    MCP mock coverage, phantom
                                                    tokens, raw buttons,
                                                    permission gates, backend
                                                    tools, duplicate routes,
                                                    orphan mocks); --json CI;
                                                    harness 56/56 tests ×2
5  globals.css                     v2.2     9.7      ver §3.1

Estado de VERSION_SYNC del manifest (leído del archivo real, v3.3.0):
  manifest 3.3.0 ✓ · guardian 4.1.1 ✓ · mcpRouter 2.1.0 ·
  advisorEngine 2.1.0 · validator "pending-audit"
  → task M-04a: al hacer drop-in de los Lotes en el repo, actualizar
    VERSION_SYNC.validator = "4.0.0" y alinear la nota de umbral
    (manifest cita "9.2 threshold" en un note; canon = 9.3, §0.2 BASE)
```

### §3.5.1 LOTE 4 — BC-02 PACKAGE ✅ (NUEVO G7.1)

```
El desbloqueo runtime (Paquete 0 del mapa de archivos, Task 14):
6 archivos entregados como drop-in atómico.

#  Archivo (destino en repo)                       Versión   Score
1  src/app/providers.tsx                           v1.1      9.5
2  src/shared/lib/api.ts                           v2.1      9.4
3  src/shared/components/ui/Toast.tsx              v2.1      9.4
4  src/shared/components/ui/Toast.css              v2.1      9.3
5  src/shared/components/ui/index.ts (barrel)      v2.1      9.3
6  frontend/tools/architecture.manifest.ts         v3.2.0    (BC-02 → APPLIED)

Qué cierra:
  - P-2 (BC-02 QueryClient error handler): la cadena 401 end-to-end
    quedó VERIFICADA por test de aceptación (query 401 real → toast
    en DOM). El lazo estaba ROTO: api.ts v2.0 ya había removido
    showToast confiando en un providers.tsx v1.0 que nunca implementó
    el receptor (G8-01) — 401s sin feedback, retry de fallas
    determinísticas, status 401 re-envuelto como 500 (G8-05), y los
    toasts apilándose superpuestos en top-right por heredar el
    position:fixed del primitivo .glass-toast (G8-15).
  - 16 hallazgos G8 documentados en manifest §14 BC-02 LEDGER.
  - Evidencia: scripts/bc02-verify/ — tsc strict 0 errores · 111
    checks comportamentales (@tanstack/react-query 5.104.5 + React 19
    + jsdom reales) · 30 checks estáticos (tokens vs globals.css v2.2,
    superficie del barrel, contrato grep BC-02) · determinista ×2.

NOTA anti-drift G7.1: las referencias de estado-actual a
"manifest v3.1.0" se actualizaron a v3.2.0 en BASE (§Pilares 1/2/10,
estructura §10, Vision-valid) y CHECKPOINT (§3.5 tabla, VERSION_SYNC).
Las menciones HISTÓRICAS de Lote 1 (changelog G7, evidencia parseada,
banner LOTES 1-2) conservan v3.1.0 — son registro de lo entregado
entonces. Regeneración completa de masters: ciclo G8 al confirmar
drop-in.
```

### §3.5.2 LOTE 5 — PAQUETE 1 · REQUEST 1 §13 ✅ (NUEVO G9)

```
El desbloqueo de EventCalendar: los 7 shared/ blockers de §13
(13 archivos físicos recibidos — 12 reescritos + FreshnessBadge.css
sin cambios) entregados como drop-in.

#  Archivo (destino en repo)                       Versión   Score
1  src/shared/components/ui/ScoreGauge.tsx          v2.1      9.4
2  src/shared/components/ui/ScoreGauge.css          v2.1      9.3
3  src/shared/components/ui/FreshnessBadge.tsx      v2.1      9.3
4  src/shared/components/ui/FreshnessBadge.css      —         9.0 (sin cambios)
5  src/shared/components/ui/StaleDataBanner.tsx     v2.1      9.4
6  src/shared/components/ui/StaleDataBanner.css     v2.1      9.2
7  src/shared/components/ui/Skeleton.tsx            v2.1      9.4
8  src/shared/components/ui/Skeleton.css            v2.1      9.3
9  src/shared/hooks/useBreakpoint.ts                v2.1      9.3
10 src/shared/components/layout/PageContainer.tsx   v2.1      9.4
11 src/shared/components/layout/PageContainer.css   v2.1      9.3
12 src/shared/components/auth/PermissionGate.tsx    v2.1      9.4
13 src/shared/components/auth/PermissionGate.css    v2.1      9.3 (REWRITE total)

Qué cierra:
  - J-10 / gate SHARED-7: PENDING_AUDIT.size = 0 → EventCalendar ya
    no tiene blockers shared/. Registry: 15+4+7+1 → 22+4+0+1
    (manifest v3.3.0, §15 G9 LEDGER).
  - 20 hallazgos G9 (G9-01..G9-20) en manifest §15. Titulares:
    G9-17 BLOCKING (PermissionGate.css 100% desincronizado del TSX —
    0/27 clases, el gate renderizaba sin estilos en los 3 modos),
    G9-01 CRITICAL (hook condicional → crash Reglas de Hooks),
    G9-11 CRITICAL (TS2686 — no compilaba en strict).
  - Evidencia: scripts/verify-paquete01.py — 15/15 checks (27/27
    cobertura clases perm-* TSX→CSS, keyframes resueltas, anclas de
    sintaxis activa, matriz de frescura 16/16) · determinista ×2.
  - Zero-regresión: bloque legacy .glass-perm-denied* conservado en
    PermissionGate.css §9 para PermissionDenied.tsx (pendiente de
    auditoría — siguiente en cola con el resto de auth/).

NOTA anti-drift G9: referencias de estado-actual manifest v3.2.0 →
v3.3.0 en BASE (§Pilares, estructura §10, árbol, Vision-valid) y
CHECKPOINT (§3.5 VERSION_SYNC, §12 registry, §4 scorecard, §5 plan).
Las menciones HISTÓRICAS de Lote 4 (§3.5.1, ledger G8) conservan
v3.2.0 — registro de lo entregado entonces.
```

---

## §4 — QUALITY SCORECARD (fórmula explícita — hallazgo #45)

```
globals.css v2.2               ████████████████████  9.7/10   (1 unidad)
UI Components (23 pares)       ████████████████████  9.3/10   (23 unidades)
Shared/ Infrastructure (7)     ████████████████████  9.31/10  (7 unidades)
Events Feature + parallel (11) ████████████████████  9.37/10  (11 unidades)
REQUEST 1 · Paquete 1 (7)      ████████████████████  9.33/10  (7 unidades · G9)

OVERALL (completados): 9.33
  FÓRMULA G7 (ponderado por unidades auditadas — 49 unidades):
  (1×9.7 + 23×9.3 + 7×9.31 + 11×9.37 + 7×9.33) / 49
  = (9.7 + 213.9 + 65.17 + 103.07 + 65.31) / 49
  = 457.15 / 49 = 9.33 ✓
  (v6.1 decía "9.35" sin fórmula; el "7.8 with pending" inverificable
   se ELIMINA — los pendientes no puntúan hasta completarse)

PENDIENTES (no puntúan):
  EventCalendar.tsx+css        5.0/10 ⚠️ (audit preliminar; DESBLOQUEADO
                               — Lote 5 cerró los 7 shared/ §13)
  EventDetail/Form/13 comp     N/A
  7 shared/ de §13             ✅ AUDITADOS (G9 · Lote 5 · §3.5.2)
  COBERTURA: 49 unidades completadas ≥ 9.3 (AdvisorActionModal
  9.2 flagged) · 1 unidad pendiente (par EventCalendar)

Events Pages:
  EventCalendar.tsx+css        ██████████░░░░░░░░░░  5.0/10 ⚠️
  EventDetail/Form/Components  ░░░░░░░░░░░░░░░░░░░░   N/A
```

---

## §5 — EXECUTION PLAN

```
IMMEDIATE NEXT STEPS:

STEP 0: APLICAR BREAKING CHANGES BLOCKING
        → BC-02 (QueryClient error handler) — ✅ APPLIED (Lote 4 · §3.5.1)
        → ver §7 para BC-01/03/04 (no blocking, con deadline)

STEP 1: AUDIT 7 shared/ files (UNIFIED LIST — §13)
        ScoreGauge, FreshnessBadge, StaleDataBanner,
        Skeleton, useBreakpoint, PageContainer, PermissionGate
        → ✅ DONE (Lote 5 · §3.5.2 · G9): manifest v3.3.0 movió las 7
          entradas a audited (PENDING_AUDIT.size = 0) — EventCalendar
          DESBLOQUEADO (12 rewrites + FreshnessBadge.css sin cambios)

STEP 2: FINALIZE EventCalendar.tsx + .css
        → Verify all shared/ imports match AUDITED APIs
        → Fix prop mismatches → Mark COMPLETE

STEP 3: REWRITE EventDetail.tsx + .css

STEP 4: REWRITE EventForm.tsx + .css

STEP 5: REWRITE Event components (13)

STEP 6: GOVERNANCE drop-in + expansión
        → instalar Lotes 1-2 en el repo (tools/ + scripts/)
        → task M-04a (VERSION_SYNC.validator = 4.0.0)
        → task M-01: extender AUDITED_REGISTRY a features/
          (los 9 events completados NO están trackeados en el
           registro — gap documentado)
        → portar css-audit a tools/css-audit.ts (harness probado)

THEN: Wave 1-6 feature migration (§9)

VERIFICATION TASKS G7 (nuevas — cierran claims vs realidad):
  V-01: Verificar conteo shared/ (~197) contra árbol real
  V-02: Restaurar tabla de scores por-archivo de FASE 1 (23
        componentes; "HIGHEST 9.5 CommandPalette" viene del registro
        v6.x y quedó sin tabla verificable)
  V-03: Cerrar cifras exactas backend (~123) y config (~12)
  M-02: Reconciliar path de globals (manifest: "styles/globals";
        BASE §2.2 histórico: "app/globals.css") contra el árbol real
```

---

## §6 — CUMULATIVE METRICS (matemática explícita)

```
FILES COMPLETED:
  FASE 0:     1 (globals.css v2.2 — re-auditado Lote 2)
  FASE 1:     23 UI (.tsx) + 23 CSS = 46 files (23 pares)
  FASE 1.5:   7 shared files
  FASE 2:     9 events + 2 shared parallel = 11 files
  LOTES 1-2:  5 governance artifacts (manifest, guardian, validator,
              verify-integration, globals — ver §3.5)

  TOTAL código de feature/shared: 1 + 46 + 7 + 11 = 65 files ✓
  TOTAL con capa de gobierno:     65 + 5 = 70 unidades entregadas

PENDING REVIEW: 9 entradas / 14 archivos físicos
  (par EventCalendar = 2 archivos + 7 shared/ = 12 archivos;
   2 + 12 = 14 ✓ — v6.1 decía "2" contradiciendo su propio
   paréntesis = hallazgo #41)

LOWEST COMPLETED SCORE: 9.2 (AdvisorActionModal) ⚠️ FLAGGED
  — bajo umbral 9.3, re-audit pendiente (hallazgo #44;
    v6.1 afirmaba "lowest 9.3" contradiciendo §3.2)
HIGHEST: 9.5 (CommandPalette — registro FASE 1 v6.x;
  restaurar tabla por-archivo = task V-02)

ANTI-PATTERNS REMOVED: ~900+
CHECKS PER FILE: 140-180 según combinación aplicable (CHECKLIST §16)
TOLERANCE: ZERO
```

---

## §7 — BREAKING CHANGES REGISTRY

```
BC-01: HealthFactorStatus values (types.ts)
  BEFORE: "excepcional" | "saludable" | "atención" | "crítico"
  AFTER:  "exceptional" | "healthy" | "attention" | "critical"
  FIX:    grep -r "excepcional\|saludable\|atención\|crítico" src/
  STATUS: ⬜ PENDING — apply before first feature references these values

BC-02: QueryClient global error handler (providers.tsx)     ← 🔴 BLOCKING
  BEFORE: showToast(401) fired inside api.ts
  AFTER:  QueryClient default onError shows 401 toast
  FIX:    Update providers.tsx with APIError-aware config
  STATUS: 🔴 BLOCKING — MUST apply before finalizing EventCalendar
  REASON: Without this, runtime crash on 401 errors

BC-03: api convenience object removal (api.ts)
  BEFORE: api.getExecutiveSummary() / api.getPendingApprovals()
  AFTER:  useMCPQuery("executive_dashboard", "get_executive_summary")
  FIX:    grep for "api.get" to find consumers
  STATUS: ⬜ PENDING — apply before FASE 3

BC-04: TrendDirection re-export removal (advisor-engine/index.ts)
  BEFORE: import { TrendDirection } from "@/shared/lib/advisor-engine"
  AFTER:  import { TrendDirection } from "@/shared/types/domain-enums"
  FIX:    grep for TrendDirection import from advisor-engine
  STATUS: ⬜ PENDING — likely zero consumers

NOTA G7: el sync de tokens divergentes NO aparece como BC pendiente —
ya quedó APLICADO en globals.css v2.2 (Lote 2, verificado §1.2).
```

---

## §8 — COMPONENT INVENTORY

### shared/components/ui/ — 23 Completed ✅

```
Core UI (6):        Button, Card, Badge, Input, Modal, Skeleton
Form & Data (6):    FormField, FilterDropdown, Toast, EmptyState, Table, TrendIcon
Glass & Surface (3): FrostedGlassCard, GlowButton, ScoreGauge
Intel Extended (4): WizardStepper, FreshnessBadge, StaleDataBanner, NotificationDropdown
Advisor (4):        AdvisorActionModal, AdvisorReactionCard, PlanStepApprovalModal, CommandPalette
Barrel (1):         index.ts

ALL: 4.2 → 9.3 avg (+121%)
(6+6+3+4+4+1 = 23 ✓ + barrel = 24 entradas de directorio)
```

### shared/components/ — Other (NOT yet audited for feature use)

```
Layout (20):        DashboardLayout, Header, Sidebar, MobileNav, PageContainer,
                    StatCard, DetailTabs, AvatarAura, CursorEffect, KeyboardHelpModal,
                    MarbleBackground, MarbleCanvas, NotificationCenter, RouteSkeleton,
                    SectionError, SignalBusDebugPanel, SkipNavigation, TopLoadingBar,
                    WebGLBackground, WelcomeModal
AI (11):            AIDecisionPanel, CausalChainViz, CommandInterface, NLRuleAuthor,
                    PlanExecutionDashboard, ScenarioBuilder, SystemHealthDashboard,
                    TwinResults, AIInsightNarrative, AISimulationPanel, AIBoardBriefViewer
ML (10 = 7+3):      MLDashboardPage, CalibrationDashboard, ModelHealthPanel,
                    PredictiveIntelligenceFeed, HypotheticalSimulator, MLAdvisorBanner,
                    ChatActionCard + 3 hooks
Export (17):        DecisionDocument, PrintLayout, PrintView, ExportButton
                    + 11 decision/* sub-components + 2 hooks
                    (v6.1 decía "(15)" — el propio inventario lista 17 = #42)
Auth (3):           PermissionGate, ProtectedRoute, PermissionDenied
Error (2):          ErrorBoundary, NotFoundPage
Chat (2):           AIChatWidget + useAIChat
Root (2):           AdvisorBanner (unified), InsightCard
Feedback (1):       Placeholder

TOTAL components/: 24+20+11+2+10+3+2+17+1+2 = 92 ✓
(v6.1 decía "~82" contradiciendo este inventario = hallazgo #43)
```

---

## §9 — FEATURE MIGRATION ORDER

```
WAVE 1 — Core visible:
  FASE 2:  Events         (~14 components)  ← IN PROGRESS
  FASE 3:  Dashboard      (~22 components)
  FASE 4:  Families       (~21 components)

WAVE 2 — Decision-critical:
  FASE 5:  Members        (~21)
  FASE 6:  Finance        (~19)
  FASE 7:  Guests         (~19)
  FASE 8:  Recommendations(~31)

WAVE 3 — Domain features:
  FASE 9:  Sports         (~30)
  FASE 10: Cultural       (~35)
  FASE 11: Communications (~21)

WAVE 4 — Supporting:
  FASE 12: Facilities     (~26)
  FASE 13: Wellness       (~19)
  FASE 14: Engagement     (~18)
  FASE 15: Age Group      (~11)

WAVE 5 — Member-facing + Admin:
  FASE 16: Mi Club        (~12)
  FASE 17: AI System      (~2)
  FASE 18: Reports        (~10)
  FASE 19: Operations     (~3)
  FASE 20: Settings       (~6)
  FASE 21: Auth           (~3)

WAVE 6 — FASES DE CIERRE (NO son features — terminología §0.3 BASE):
  FASE 22: Deprecados cleanup (11 files)
  FASE 23: Bundle analysis
  FASE 24: Accessibility audit
  FASE 25: E2E testing
  FASE 26: Documentation

NOTE: 23 features total (20 core FASE 2-21 + 3 cross-cutting:
approvals, documents, maintenance → integrados en Wave 6 o asignados
a su FASE padre durante la migración). FASE 22-26 = cierre.

EACH FASE: Integration Audit → types → hooks → components → pages → verify
```

---

## §10 — INNOVATION PROPOSALS 2027

```
#  Proposal                         Impact    Effort   Validated?  Status
1  Conversational Intelligence      High      High     No          PROPOSED
2  Predictive Ambient Canvas        Transform Med      No          PROPOSED
3  Cross-Domain Insight Cascade     Transform Med      No          PROPOSED
4  Digital Twin Scenario Playground Med       V.High   No          PROPOSED
5  Self-Improving Dashboard Layouts High      High     No          PROPOSED
6  NL Rule Marketplace              Med       V.High   No          PROPOSED

NOTE: NONE are validated. All are PROPOSED.
"Validated?" means: technical feasibility confirmed + user-approved priority.
```

---

## §11 — APPENDICES

```
A: Advisor-Engine Consumption Audit     ✅ CONFIRMED
B: AdvisorBanner Duplicity Analysis     ⬜ PENDING (FASE 2)
C: MCP Communication Audit              ✅ COMPLETE
D: Integration Score Baseline           ⬜ PENDING (per-feature)
E: Type System Alignment Audit          ⬜ PENDING (per-feature)
F: Shared/ Reorganization Proposal      ✅ DOCUMENTED
G: Test Infrastructure Gap Analysis     ⬜ PENDING (FASE 25)
H: showToast Dependency in useAutonomousAdvisor → DOCUMENTED
I: Breaking Changes Registry            4 pendientes (§7)
   (título corregido G7: v6.1 decía "Applied" con 4 pending)
J: [Reserved]
K: Critical Error — Unaudited Shared/   ⚠️ ACTIVE (§12, §13)
L: AdvisorCommand.action Missing        ✅ RESOLVED
M: BaseContext Wrong Import             ✅ RESOLVED
N: Version drift v3.0→v6.0 detected     ✅ RESOLVED (G7 sincronizado)
O: Checklist B detail lost in v6.0      ✅ RESTORED (CHECKLIST v7.0)
P: Master Self-Audit G7 (hallazgos     ✅ RESOLVED (§0.3 — nuevo)
   #31-#60, conteos, fences, refs)
```

---

## §12 — PARALLEL AUDIT STATUS (SSOT = manifest AUDITED_REGISTRY)

```
G7 (hallazgo #59): el estado de audit POR ARCHIVO vive en
architecture.manifest.ts §8 — AUDITED_REGISTRY (27 entradas,
parseadas y verificadas). ESTA sección es sólo el resumen legible.
NUNCA mantener listas manuales paralelas: al auditar un archivo,
actualizar el REGISTRO y regenerar este resumen.

✅ AUDITED — 15 entradas "audited":
  Infrastructure (FASE 1.5):
   [x] shared/lib/api                    9.3
   [x] shared/lib/mcp (dir)              9.3
   [x] shared/lib/mcp/mcp-router         9.3
   [x] shared/hooks/useMCPQuery          9.3
   [x] shared/hooks/useAutonomousAdvisor 9.3
  Advisor Engine:
   [x] shared/lib/advisor-engine (dir)   9.3
   [x] shared/lib/advisor-engine/types   9.3
   [x] shared/lib/advisor-engine/engine  9.4
   [x] shared/lib/advisor-engine/index   9.3
   [x] shared/lib/advisor-engine/rules/events  9.4 (FASE 2)
   [x] shared/lib/advisor-engine/signal-bus    9.4 (FASE 2)
  Types:
   [x] shared/types (dir)                9.3
   [x] shared/types/ai-intelligence      9.3
   [x] shared/types/domain-enums         9.3
  Design system:
   [x] styles/globals                    9.7 (FASE 0 — v2.2 Lote 2)

🔁 REVERIFY-ON-USE — 4 entradas (migradas FASE 1; Checklist J):
   [~] shared/components/ui (barrel)     9.3
   [~] shared/components/ui/Button       9.3
   [~] shared/components/ui/EmptyState   9.3
   [~] shared/components/ui/AdvisorActionModal 9.2 ⚠️ (flag §3.2)

✅ AUDITED G9 — 7 entradas (REQUEST 1 · Paquete 1 · EventCalendar UNLOCKED):
   [x] shared/components/ui/ScoreGauge         9.4  (G9-01/02 · v2.1)
   [x] shared/components/ui/FreshnessBadge     9.3  (G9-04/05 · v2.1 · css sin cambios)
   [x] shared/components/ui/StaleDataBanner    9.3  (G9-06..10 · v2.1)
   [x] shared/components/ui/Skeleton           9.3  (G9-11..13 · v2.1)
   [x] shared/hooks/useBreakpoint              9.3  (G9-14 · v2.1)
   [x] shared/components/layout/PageContainer  9.4  (G9-15/16 · v2.1)
   [x] shared/components/auth/PermissionGate   9.3  (G9-17..20 · v2.1 · css REWRITE)

⚙ CONFIG — 1 entrada (material de calibración, no blocker):
   [c] shared/lib/advisor-engine/confidence (REQUEST 3)

TOTAL REGISTRO: 22 + 4 + 0 + 1 = 27 entradas ✓
   (G9 · Lote 5: los 7 pending §13 → audited; fórmula histórica
   pre-G9: 15 + 4 + 7 + 1 = 27 — mismo total, composición distinta;
   los 6 esquema wiring config quedan fuera de la fórmula, como en G7)

GAP DOCUMENTADO — task M-01: los 9 archivos de events completados
(§3.4) NO están en AUDITED_REGISTRY (sólo cubre shared/ + styles).
Extender el registro a features/ para cerrar el ciclo de tracking.

EXTENDED AUDIT REGISTRY (config, wiring, stores — para esquema):
   [ ] frontend/src/app/providers.tsx
   [ ] frontend/src/app/router.tsx
   [ ] frontend/src/stores/auth.store.ts
   [ ] frontend/src/shared/lib/utils.ts   ← ⚠️ no es mera auditoría:
                                           PENDING REWRITE score 7.2,
                                           6 violaciones U-01..U-06,
                                           RC-3 (removido del set
                                           auditado — nota del manifest)
   [ ] frontend/src/styles/globals.css    ← ✅ AUDITADO (9.7, v2.2)
   [ ] frontend/tsconfig.json
   [ ] frontend/vite.config.ts
   [ ] frontend/src/shared/components/ui/index.ts (barrel —
     reverify-on-use en el registro)
   (G7: globals.css sale de la lista — auditado en Lote 2;
    "or wherever" eliminado — el path normalizado del manifest
    es "styles/globals"; reconciliar con BASE §2.2 = task M-02)
```

---

## §13 — FILES PENDING REVIEW

```
╔══════════════════════════════════════════════════════════════════════════╗
║  UNIFIED SHARED/ FILES TO REQUEST (7 entradas — coincide con §5 y §12)  ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  These 7 entries block EventCalendar finalization.                      ║
║  Request them in this order (UI first, then hooks):                     ║
║                                                                          ║
║  1. src/shared/components/ui/ScoreGauge.tsx + .css                      ║
║  2. src/shared/components/ui/FreshnessBadge.tsx + .css                  ║
║  3. src/shared/components/ui/StaleDataBanner.tsx + .css                 ║
║  4. src/shared/components/ui/Skeleton.tsx + .css                        ║
║  5. src/shared/hooks/useBreakpoint.ts                                   ║
║  6. src/shared/components/layout/PageContainer.tsx + .css               ║
║     (EXISTS — listado en el inventario §8 Layout (20);                  ║
║      "(if exists)" de v6.1 eliminado = hallazgo #49)                    ║
║  7. src/shared/components/auth/PermissionGate.tsx                       ║
║                                                                          ║
║  AFTER these are audited → finalize EventCalendar.tsx + .css            ║
║  → THEN proceed to EventDetail → EventForm → 13 components             ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

EventCalendar.tsx + EventCalendar.css — ⚠️ PENDING
  BLOCKED ON: 7 unaudited shared/ imports
  ACTION: Audit the 7 above → then finalize EventCalendar
```

---

## §14 — CURRENT STATE & PENDING ASKS

```
╔══════════════════════════════════════════════════════════════════════════╗
║  WHERE WE ARE EXACTLY — 2026-08-12 (G7)                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  PHASE: FASE 2 — Events Feature Migration (30% complete)               ║
║                                                                          ║
║  COMPLETED:                                                              ║
║  ✅ FASE 0 (globals.css v2.2, 9.7) + FASE 1 (23 UI) + FASE 1.5 (7)    ║
║  ✅ Events: types, config, barrel, 5 hooks, calendarSignals (9 files)  ║
║  ✅ Shared parallel: rules/events.ts + signal-bus.ts (2 files)         ║
║  ✅ LOTES 1-2 (capa de gobierno): manifest v3.1.0, guardian v4.1.1     ║
║     (26 checks), validator v4.0.0, verify-integration v3.0.0 (8),      ║
║     globals.css v2.2 (9.7) — §3.5                                       ║
║  ✅ Master docs G7 (BASE + CHECKPOINT + CHECKLIST v7.0 sincronizados)   ║
║                                                                          ║
║  BLOCKED:                                                                ║
║  🔴 EventCalendar finalization → needs 7 shared/ files audited         ║
║  🔴 BC-02 (QueryClient error handler) → blocking for runtime            ║
║                                                                          ║
║  WHAT I NEED TO CONTINUE (in order):                                    ║
║                                                                          ║
║  REQUEST 1 (Blocker — must have):                                       ║
║  ├── 7 shared/ files from §13 (ScoreGauge, FreshnessBadge,            ║
║  │   StaleDataBanner, Skeleton, useBreakpoint, PageContainer,           ║
║  │   PermissionGate)                                                     ║
║  └── These unblock EventCalendar → EventDetail → EventForm → 13 comp  ║
║                                                                          ║
║  REQUEST 2 (Esquema/Automation — needed for tooling):                   ║
║  ├── frontend/src/shared/lib/utils.ts                                   ║
║  │   (⚠️ PENDING REWRITE: score 7.2, U-01..U-06 — no solo auditar)     ║
║  ├── frontend/tsconfig.json                                             ║
║  ├── frontend/vite.config.ts                                            ║
║  ├── frontend/src/app/providers.tsx                                     ║
║  ├── frontend/src/app/router.tsx                                        ║
║  ├── frontend/src/stores/auth.store.ts                                  ║
║  ├── frontend/src/shared/components/ui/index.ts (barrel)               ║
║  └── These unblock: Path Aliases + Guardian expansion + CSS audit      ║
║      (globals.css ya NO se pide: auditado 9.7 en Lote 2)               ║
║                                                                          ║
║  REQUEST 3 (Pattern references — for esquema base):                     ║
║  ├── frontend/src/features/events/types.ts (pattern reference)         ║
║  ├── frontend/src/features/events/hooks/useEventAdvisor.ts (pattern)   ║
║  ├── frontend/src/shared/lib/advisor-engine/confidence.ts              ║
║  └── These unblock: Feature template calibration                        ║
║                                                                          ║
║  AFTER ALL 3 REQUESTS:                                                  ║
║  → Drop-in Lotes 1-2 en el repo + task M-04a (VERSION_SYNC)            ║
║  → task M-01: extender AUDITED_REGISTRY a features/                     ║
║  → Expand Architecture Guardian (26 → 45+ checks)                      ║
║  → Port css-audit a tools/css-audit.ts + component-audit + pipeline    ║
║  → Apply BC-02 (blocking) + BC-01/03/04                                 ║
║  → Finalize EventCalendar + EventDetail + EventForm + 13 components   ║
║  → Continue with FASE 3+                                                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

END OF MASTER_CHECKPOINT.md v7.0 · Generación G7 (sincronizada con
MASTER_BASE.md v7.0 y MASTER_CHECKLIST.md v7.0)

