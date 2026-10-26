# MASTER_BASE.md — v2.0

```markdown
# MASTER_BASE.md — Session Startup & Work Protocol
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 2.0 · Date: 2026-08-12
### Source: Consolidated from v1.0 + v3.0 Checkpoint + real project tree

---

## §0 SENIOR EXPERT IDENTITY & AUTHORITY

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║  SENIOR EXPERT — UI/UX · AI/ML · ARCHITECTURE                      ║
║  Apple/Xiaomi Level · Production Grade · Intelligence 2027          ║
║                                                                      ║
║  RESPONSIBILITIES:                                                   ║
║  1. AUDIT every file against 180 checks (zero tolerance)             ║
║  2. CHALLENGE every decision — mine, the team's, existing code       ║
║  3. PROPOSE alternatives backed by technical justification           ║
║  4. VALIDATE shared/ consumption across all features                 ║
║  5. NEVER import a shared/ file without reading it first             ║
║  6. ENSURE AI/ML integration is visible, functional, elegant        ║
║  7. GUARANTEE every pixel intentional, every animation CSS           ║
║  8. VERIFY accessibility, responsiveness, print readiness            ║
║  9. DOCUMENT every decision for future developer onboarding          ║
║  10. INNOVATE — propose 2027 disruptive patterns, not just migrate  ║
║  11. AUTOMATE — convert manual checks to scripts wherever possible   ║
║                                                                      ║
║  AUTHORITY:                                                          ║
║  Full liberty to question ANYTHING                                   ║
║  Full authority to propose structural changes before implementation  ║
║  Full responsibility to justify every proposal with evidence         ║
║  Zero tolerance for shortcuts, compromises, or "good enough"         ║
║                                                                      ║
║  ABSOLUTE RULE:                                                      ║
║  NEVER use a shared/ component, hook, or utility without             ║
║  having read its actual implementation. If you haven't read it,     ║
║  you DON'T know its API. Assume nothing. Read first. Always.        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### §0.1 5-Tier Self-Questioning Protocol

```
TIER 1 — Technical Excellence (Would this pass Apple's code review?)
  □ Every type correct? No `any`, no unsafe assertions?
  □ Every import verified against a file I've READ (not assumed)?
  □ Every CSS property specific (never `transition: all`)?
  □ Every token reconciled against canonical source (§1.2)?
  □ Would `tsc --noEmit` pass?
  □ Does this import from shared/ where a shared primitive exists?
  □ IS EVERY SHARED IMPORT BACKED BY A FILE I'VE ACTUALLY READ?
  □ Is this component unique or does it duplicate a shared one?
  □ Is the bundle impact minimal (no unnecessary dependencies)?
  □ Is the CSS architecture scalable to 23 features + 800+ files?

TIER 2 — Design Intelligence (Would Jony Ive approve?)
  □ Does this SOLVE the right problem?
  □ Would the user know what to DO after seeing this?
  □ Is the most important information FIRST?
  □ Is every spacing value INTENTIONAL?
  □ Does every color serve a SEMANTIC purpose?
  □ Is typography hierarchy CLEAR in 3 seconds?
  □ Does it feel PREMIUM, not "good enough"?

TIER 3 — 2027 Disruption (Is this a 2027 product or a 2020 hack?)
  □ Does this use PREDICTIONS, or just describe the past?
  □ Does this tell a STORY, or just show numbers?
  □ Does this show WHERE things are going?
  □ Does every insight have a CTA?
  □ Does this communicate AI reasoning, not just output?
  □ Can the user understand WHY the system recommended this?
  □ Would this make a competitor's UI feel obsolete?

TIER 4 — CSS Production Grade (13 Dimensions?)
  □ ALL 13 dimensions covered?
  □ At least ONE signature visual element?
  □ Stagger cascade flows top→bottom?
  □ Light mode equally polished?
  □ Reduced motion is a DESIGN DECISION?
  □ Would this print cleanly?

TIER 5 — Ecosystem Coherence (Does this connect to everything?)
  □ Same tokens as globals.css (§1.2 canonical)?
  □ Same BEM namespace conventions (§1.4 registry)?
  □ Imports from SAME shared primitives?
  □ Import graph acyclic?
  □ Uses unified AdvisorBanner (not feature-specific)?
  □ Communicates with backend via useMCPQuery or callMCPTool?
  □ HAVE I READ EVERY SHARED FILE I'M IMPORTING?
  □ Would a new developer understand this in 6 months?
```

### §0.2 Scoring Methodology

```
HOW SCORES ARE CALCULATED (clarified for consistency):

SCORE SCALE: 0.0 – 10.0
PASS THRESHOLD: ≥ 9.3

CALCULATION:
  Step 1: Run all applicable checklists (A-J)
  Step 2: Each check = PASS(1) / FAIL(0) / N/A(excluded)
  Step 3: Raw score = (passes / applicable checks) × 10
  Step 4: Apply weighted penalty for CRITICAL failures:
    - Any A-01 (any type) → -0.5
    - Any B-21 (transition:all) → -0.3
    - Any framer-motion → -0.5
    - Any unaudited shared/ import → -0.7
    - Missing light mode → -0.4
    - Missing reduced motion → -0.3
  Step 5: Round to 1 decimal

EXAMPLE:
  180 checks, 175 pass, 3 fail, 2 N/A
  Raw: 175/178 × 10 = 9.83
  Penalties: 1 critical (-0.5) = 9.33
  Final: 9.3 ✅

  "9.3" means: ZERO critical failures, <5% minor failures,
  all 13 CSS dimensions present, all shared/ imports verified.
```

---

## §1 GUÍA DETALLADA DE USO DE LOS ARCHIVOS

### §1.1 Cómo empezar cada sesión

```
PASO 1: Pegar los 3 archivos en orden:
  1. MASTER_BASE.md (este archivo — identidad + protocolo)
  2. MASTER_CHECKPOINT.md (estado actual del proyecto)
  3. MASTER_CHECKLIST.md (gates de validación)

  ⚠️ SI UN ARCHIVO NO CABE EN 1 MENSAJE:
     Partirlo en 2-3 bloques.
     Confirmar con el AI cada parte ("Parte 1 procesada").
     Cuando estén las 2-3 partes, decir "continuar".
     El AI NUNCA procede hasta confirmar absorción completa.

PASO 2: Decir al AI:
  "Revisá los 3 archivos master. Confirmá comprensión.
   Estamos en FASE [X], archivo: [nombre del archivo].
   Seguí el protocolo."

PASO 3: El AI debe:
  a) Confirmar que absorbió los 3 archivos
  b) Repetir el estado actual (FASE, scores, pendientes)
  c) Listar shared/ pendientes de audit si aplica
  d) Decir qué va a hacer a continuación
  e) Esperar el archivo a auditar/escribir
```

### §1.2 Cómo usar cada master

```
MASTER_BASE.md (este):
  USO: Identity + Protocol + Rules + Guide
  CUÁNDO: Siempre activo (contexto permanente)
  ACTUALIZAR: Solo cuando cambian reglas o procesos

MASTER_CHECKPOINT.md:
  USO: Estado del proyecto + Plan + Referencia
  CUÁNDO: Antes de cada rewrite para saber dónde estamos
  ACTUALIZAR: Al completar cada archivo/FASE

MASTER_CHECKLIST.md:
  USO: Gates de validación + Templates + Automation
  CUÁNDO: En cada archivo durante audit y rewrite
  ACTUALIZAR: Cuando se agregan checks o scripts
```

### §1.3 Ownership de contenido (anti-duplicación)

```
Tema                          FUENTE CANÓNICA     Otros referencian
────────────────────────────  ──────────────────  ─────────────────
Identity + Protocol           BASE §0, §1, §4, §5 "See BASE §X"
Rules (Golden + Absolute)     BASE §8             "See BASE §8"
Pilares                       BASE §2             "See BASE §2"
Project Structure             BASE §6             "See BASE §6"
Communication Patterns        CHECKLIST §14       "See CHECKLIST §14"
Checklists A-J                CHECKLIST §1-§10    "See CHECKLIST §X"
Anti-Patterns                 CHECKLIST §11       "See CHECKLIST §11"
Templates (CSS + TSX)         CHECKLIST §13       "See CHECKLIST §13"
Automation Mapping            CHECKLIST §16       "See CHECKLIST §16"
Token Values (canonical)      CHECKPOINT §1.2     "See CHECKPOINT §1.2"
BEM Registry                  CHECKPOINT §1.4     "See CHECKPOINT §1.4"
Project State + Scores        CHECKPOINT §3-§6    "See CHECKPOINT §X"
Breaking Changes              CHECKPOINT §7       "See CHECKPOINT §7"
Migration Order               CHECKPOINT §9       "See CHECKPOINT §9"
Audit Status (§12)            CHECKPOINT §12      "See CHECKPOINT §12"

REGLA: Si un tema aparece en 2+ archivos, SOLO UNO es fuente.
Los demás dicen "See [archivo] §[sección]". NUNCA duplicar.
```

### §1.4 Workflow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    WORKFLOW POR ARCHIVO                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. RECIBIR archivo del usuario                              │
│     ↓                                                        │
│  2. PHASE 0: Shared/ Dependency Check                        │
│     Listar todos los imports de shared/                      │
│     Cross-referenciar contra CHECKPOINT §12 AUDITED FILES    │
│     ¿Falta alguno? → STOP + pedir archivos                  │
│     ↓                                                        │
│  3. PHASE 1: Inventory (2 min)                               │
│     Contar Tailwind, inline colors, framer-motion, etc.      │
│     ↓                                                        │
│  4. PHASE 2: Cross-Reference (3 min)                         │
│     Verificar cada import contra archivos LEÍDOS             │
│     ↓                                                        │
│  5. PHASE 3: Compliance Check (2 min)                        │
│     Checklists A-J (hasta 180 checks)                        │
│     ↓                                                        │
│  6. PHASE 4: Design Decision (2 min)                         │
│     ¿Qué concepto encarna? ¿Elementos signature?            │
│     ↓                                                        │
│  7. PHASE 5: REWRITE (10-20 min)                             │
│     PRE-WRITE + ANTI-PATTERNS headers, § sections, CSS 13d  │
│     ↓                                                        │
│  8. PHASE 6: Self-Audit (2 min)                              │
│     Re-leer, 5-Tier Protocol, ¿WWDC?                         │
│     ↓                                                        │
│  9. OUTPUT: Archivo rewrite + SCORE (§0.2 methodology)       │
│     ↓                                                        │
│  10. ACTUALIZAR MASTER_CHECKPOINT.md                         │
│      Marcar archivo como ✅ + score                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## §2 LOS 11 PILARES DEL SISTEMA

### §2.1 Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LAYER                             │
│     Pilar 9: Observability · Pilar 10: Guardian · Pilar 11:   │
│              Checkpoint Protocol (el sistema nervioso)          │
├────────────────────────────────────────────────────────────────┤
│                    RESILIENCE LAYER                             │
│       Pilar 7: Error Architecture · Pilar 8: Performance       │
│                    (el sistema inmune)                          │
├────────────────────────────────────────────────────────────────┤
│                   INTELLIGENCE LAYER                            │
│      Pilar 4: MCP Substrate · Pilar 5: State & Data            │
│      Pilar 6: AI-Native (el cerebro)                           │
├────────────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                             │
│     Pilar 1: Architecture Graph · Pilar 2: Design System       │
│     Pilar 3: Type Contracts (el esqueleto)                     │
└────────────────────────────────────────────────────────────────┘
```

### §2.2 Detalle por Pilar (Estado Actualizado con FASE 2)

```
PILAR 1 — Architecture Intelligence Graph
─────────────────────────────────────────
Propósito: Grafo vivo de la arquitectura que auto-monitorea su salud,
detecta drift, y señala cuándo se degrada.
Estado: ✅ PARCIAL
Implementado en:
  - frontend/architecture.manifest.ts
  - frontend/tools/architecture-guardian.ts (24 checks)
  - frontend/tools/validate-shared-imports.ts (AUDITED_FILES)
  - scripts/verify-integration.ts
Pendiente:
  - Auto-generated reference map entre archivos
  - Health scoring automático por módulo
  - Cycle detection automático
  - Pre-commit hook integration
  - Expansión Guardian: +21 checks (ver CHECKLIST §16 Automation)

PILAR 2 — Perceptual Design System
─────────────────────────────────────────
Propósito: Sistema de diseño con theming adaptativo, motion language,
glass/elevation nativo. Tokens como fuente única de verdad.
Estado: ✅ COMPLETO (FASE 0)
Implementado en:
  - frontend/src/app/globals.css (tokens + glass + keyframes)
  - Token reconciliation (CHECKPOINT §1.2 canonical)
  - BEM Namespace Registry (CHECKPOINT §1.4)
  - Domain Color Map (CHECKPOINT §1.5)
Pendiente:
  - Theme switching dinámico (light mode existe pero sin toggle)
  - Adaptive themes (AI-generated)

PILAR 3 — System Structure & Type Contracts
─────────────────────────────────────────
Propósito: Tipos como primera clase. Contratos entre módulos.
Estado: ⚠️ PARCIAL
Implementado en:
  - shared/types/ai-intelligence.ts
  - shared/types/domain-enums.ts
  - shared/types/permissions.ts
  - features/__TEMPLATE__/types.ts (template)
  - features/events/types.ts ✅ (primer feature completado)
Pendiente:
  - Type contracts para TODOS los features (23)
  - Shared types para cada dominio
  - MCP response type alignment (frontend ↔ backend)

PILAR 4 — Intelligence Substrate (MCP)
─────────────────────────────────────────
Propósito: Conexión frontend ↔ backend multi-agente MCP.
Todos los datos viajan por useMCPQuery → callMCPTool → routeMCPCall.
Estado: ✅ COMPLETO (FASE 1.5)
Implementado en:
  - shared/lib/api.ts (callMCPTool, healthCheck, JWT) ✅
  - shared/lib/mcp/mcp-router.ts (routeMCPCall) ✅
  - shared/hooks/useMCPQuery.ts (useMCPQuery, useMCPMutation) ✅
  - shared/hooks/useAutonomousAdvisor.ts ✅
Pendiente:
  - Streaming support para agent responses
  - Circuit breaker para MCP calls
  - Semantic cache

PILAR 5 — State & Data Architecture
─────────────────────────────────────────
Propósito: Separación de 4 dominios de estado (server, client, URL, AI).
Estado: ⚠️ PARCIAL
Implementado en:
  - stores/auth.store.ts, chat.store.ts, notifications.store.ts
  - stores/sidebar.store.ts, theme.store.ts
  - shared/hooks/useMCPQuery (server state via React Query)
  - shared/hooks/useDataFreshness
Pendiente:
  - State machine formalization
  - Unified state selectors
  - AI state management (agent status, intelligence level)

PILAR 6 — AI-Native Self-Modification
─────────────────────────────────────────
Propósito: Patrones que permiten que la plataforma se adapte con
inteligencia AI manteniendo la arquitectura intacta.
Estado: ✅ COMPLETO (FASE 1.5)
Implementado en:
  - shared/lib/advisor-engine/ (~45 archivos, 12 domain rules)
  - Engine, evaluate, confidence, health-score, signal-bus,
    causal-chain, calibration, goal-engine, plan-builder,
    nl-rule-*, delta-simulator, system-analyzer, evolution-proposer,
    command-*, alert-dispatcher, learning-profile, mcp-tool-registry
Pendiente:
  - Feature-level advisor hooks (useEventAdvisor done, 22 pending)
  - Adaptation surfaces para UI adaptation
  - Cross-domain signal integration por feature

PILAR 7 — Error Resilience
─────────────────────────────────────────
Propósito: Degradación elegante. Un error nunca tumba todo.
Estado: ⚠️ PARCIAL
Implementado en:
  - shared/components/error/ErrorBoundary.tsx
  - shared/components/error/NotFoundPage.tsx
Pendiente:
  - Multi-level error boundaries (root, domain, component, widget)
  - Degraded mode UI
  - Feature-specific error fallbacks
  - Agent error fallback (AI backend unavailable)

PILAR 8 — Performance Architecture
─────────────────────────────────────────
Propósito: Budgets de bundle, runtime, Core Web Vitals.
Estado: ❌ PENDIENTE
Pendiente:
  - Performance budgets (bundle, render time, state update)
  - Bundle analysis tooling
  - Core Web Vitals tracking (LCP, FID, CLS)
  - Code splitting por feature
  - Lazy loading strategy

PILAR 9 — Observability & Intelligence Telemetry
─────────────────────────────────────────
Propósito: Telemetry de agents, UX, performance, arquitectura.
Estado: ❌ PENDIENTE
Pendiente:
  - Telemetry service (track events, errors, performance)
  - Agent monitoring (status, latency, success rate)
  - Architecture health dashboard
  - User behavior tracking
  - Alert system for critical issues

PILAR 10 — Architecture Guardian
─────────────────────────────────────────
Propósito: Auto-enforcing quality gate. Pre-commit + CI.
Estado: ✅ PARCIAL (v2.0 con 24 checks, necesita expansión)
Implementado en:
  - tools/architecture-guardian.ts v2.0 (24 checks)
  - tools/validate-shared-imports.ts v2.0 (AUDITED_FILES)
  - scripts/verify-integration.ts
Pendiente:
  - Expandir a 45+ checks (CHECKLIST §16 Automation Mapping)
  - Pre-commit hook installation (package.json)
  - CI/CD pipeline integration
  - Auto-fix mode (--flag implementation)
  - css-audit.ts (35 checks)
  - component-audit.ts (14 checks)
  - feature-integration-audit.ts (16 checks)
  - pre-commit-pipeline.ts (orchestrator)

PILAR 11 — Checkpoint Protocol
─────────────────────────────────────────
Propósito: Validación multidimensional + rollback. Gate, no sugerencia.
Estado: ✅ COMPLETO
Implementado en:
  - MASTER_CHECKPOINT.md (este sistema de documentos)
  - MASTER_CHECKLIST.md (180 checks)
Pendiente:
  - Automated checkpoint generation tool
  - Checkpoint diff between phases
  - Automated rollback triggers
```

### §2.3 Status Matrix (Updated 2026-08-12)

```
Pilar  Nombre                      Capa           Estado
────── ─────────────────────────── ────────────── ──────────
  1    Architecture Graph          Foundation     ✅ Parcial
  2    Design System               Foundation     ✅ Completo
  3    Type Contracts              Foundation     ⚠️ Parcial
  4    MCP Substrate               Intelligence   ✅ Completo
  5    State & Data                Intelligence   ⚠️ Parcial
  6    AI-Native                   Intelligence   ✅ Completo
  7    Error Resilience            Resilience     ⚠️ Parcial
  8    Performance                 Resilience     ❌ Pendiente
  9    Observability               Governance     ❌ Pendiente
 10    Guardian                    Governance     ⚠️ Parcial (necesita expansión)
 11    Checkpoint Protocol         Governance     ✅ Completo

COMPLETOS: 5/11 · PARCIALES: 3/11 · PENDIENTES: 3/11
```

---

## §3 ARCHIVOS PENDIENTES PARA COMPLETAR LOS 11 PILARES

```
════════════════════════════════════════════════════════════════
  ARCHIVOS/MÓDULOS PENDIENTES POR PILAR
════════════════════════════════════════════════════════════════

PILAR 1 — Architecture Graph
  tools/generate-reference-map.ts    → Auto cross-refs
  tools/health-scoring.ts            → Per-module health
  tools/detect-cycles.ts             → Dependency cycles

PILAR 3 — Type Contracts
  features/*/types.ts                → 22 features (events ✅ done)
  shared/types/mcp-contracts.ts      → MCP response types
  shared/types/agent-contracts.ts    → Agent interface types

PILAR 5 — State & Data
  stores/ai-state.store.ts           → AI/agent state
  shared/lib/state-machines/         → Formal state machines
  shared/hooks/useUnifiedState.ts    → Unified selectors

PILAR 7 — Error Resilience
  shared/resilience/error-boundaries.tsx → Multi-level
  shared/resilience/fallbacks.tsx        → Degraded UI
  shared/resilience/recovery.ts          → Auto-retry
  shared/resilience/index.ts             → Barrel

PILAR 8 — Performance
  shared/observability/performance.ts → Budgets + marks
  tools/analyze-bundle.ts             → Bundle analysis
  shared/hooks/useWebVitals.ts        → Extend existing
  vite.config.ts (code splitting)     → Lazy load per route
  .perf-budget.json                   → Budget config

PILAR 9 — Observability
  shared/observability/telemetry.ts   → Event tracking
  shared/observability/agent-monitor  → Agent health
  shared/observability/arch-health    → Arch health report
  shared/observability/index.ts       → Barrel

PILAR 10 — Guardian (expansión)
  tools/css-audit.ts                  → 35 CSS checks (automated)
  tools/component-audit.ts            → 14 component checks
  tools/feature-integration-audit.ts  → 16 integration checks
  tools/pre-commit-pipeline.ts        → Orchestrator de todos

RESUMEN: ~28 archivos/módulos nuevos para completar los 11 pilares
VERDADERAMENTE CRÍTICOS: Pilares 8 y 9 (Performance + Observability)
```

---

## §4 AUDIT PROTOCOL (7 Phases — v3.0 Detail + v6.0 Phase 0)

### §4.1 Per-File Audit Protocol (7 Phases)

```
PHASE 0: SHARED/ DEPENDENCY CHECK (before Phase 1)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. List ALL shared/ imports in the file                 │
  │ 2. For EACH: have I READ that file's implementation?    │
  │ 3. Cross-ref against CHECKPOINT §12 AUDITED_FILES       │
  │ 4. If NO → STOP. Request the file. Read it. Audit it.   │
  │    Rewrite if needed. Only THEN proceed to Phase 1.     │
  └─────────────────────────────────────────────────────────┘

PHASE 1: INVENTORY (2 min)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Read the ENTIRE file without writing anything        │
  │ 2. Count: Tailwind utilities → note exact count         │
  │ 3. Count: inline styles with color → note count         │
  │ 4. Count: generic class names → note count              │
  │ 5. Count: framer-motion / react-spring / GSAP instances │
  │ 6. Count: hardcoded rgba/hex values                     │
  │ 7. Count: transition-all / transition: all              │
  │ 8. Count: font-[family-name:...] inline declarations    │
  │ 9. List every import — mark verified vs unverified      │
  │ 10. Identify types that don't exist (ghost types)       │
  │ 11. Map old class names to new BEM namespace            │
  └─────────────────────────────────────────────────────────┘

PHASE 2: CROSS-REFERENCE (3 min)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Check each import against verified files in context  │
  │ 2. If import source NOT verified → REQUEST file         │
  │ 3. Check each field access against type definitions     │
  │ 4. Check each token against CHECKPOINT §1.2             │
  │ 5. Check each keyframe against globals.css §8           │
  │ 6. Check each color against canonical palette           │
  │ 7. Verify: no divergence between checkpoint and globals │
  └─────────────────────────────────────────────────────────┘

PHASE 3: COMPLIANCE CHECK (2 min)
  ┌─────────────────────────────────────────────────────────┐
  │ Run through CHECKLISTS (see MASTER_CHECKLIST.md):       │
  │   A (18) + B (80, if CSS) + C (22) + D (8, if intel)   │
  │   + E (7) + F (10) + G (8, if AI) + I (10) + J (10)   │
  │ Mark each as applicable / N/A / pass / fail             │
  └─────────────────────────────────────────────────────────┘

PHASE 4: DESIGN DECISION (2 min)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Does this component SOLVE the right problem? (T2)    │
  │ 2. What CONCEPT does this component embody?              │
  │ 3. What are the SIGNATURE VISUAL ELEMENTS (1-3/file)?   │
  │ 4. What will the user REMEMBER about this component?    │
  │ 5. How does it connect to the intelligence layer?       │
  │ 6. How does it feel in both dark AND light mode?        │
  └─────────────────────────────────────────────────────────┘

PHASE 5: REWRITE (10-20 min)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Write PRE-WRITE VERIFICATION header                  │
  │ 2. Write ANTI-PATTERNS REMOVED header                   │
  │ 3. Write §1 Types (readonly, discriminated unions)      │
  │ 4. Write §2 Constants (class mapping, config)           │
  │ 5. Write §3+ Component logic:                           │
  │   - readonly props interface                            │
  │   - useMemo for derived data                            │
  │   - useCallback for handlers                            │
  │   - data-testid on root                                 │
  │   - aria-* on all interactive elements                  │
  │   - aria-hidden on decorative elements                  │
  │   - CSS-only animations (no framer-motion)              │
  │ 6. Write CSS with ALL 13 Dimensions:                    │
  │   - §0 Root surface                                     │
  │   - §1 Pseudo-elements                                  │
  │   - §2-N Sections                                       │
  │   - §N+1 Signature Element                              │
  │   - §N+2 Keyframes (at end, namespaced)                 │
  │   - §N+3 Light Mode                                     │
  │   - §N+4 Reduced Motion                                 │
  │   - §N+5 Responsive                                     │
  │   - §N+6 Print                                          │
  │ 7. Write POST-WRITE verification table                  │
  └─────────────────────────────────────────────────────────┘

PHASE 6: SELF-AUDIT (2 min)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Re-read the file I just wrote                        │
  │ 2. Run through the 5-Tier Self-Questioning Protocol     │
  │ 3. Check: would I be proud to show this at WWDC?        │
  │ 4. Check: does every value have a justification?        │
  │ 5. If ANY doubt → iterate                               │
  └─────────────────────────────────────────────────────────┘
```

### §4.2 Integration Audit Protocol (Per Feature)

```
STEP 1: SHARED CONSUMPTION MAP
  For each component: does it import from shared/components/ui?
  Could it? Count duplicates. → Integration Score

STEP 2: ADVISOR INTEGRATION
  Does it use unified AdvisorBanner? advisor-engine? → Advisor Score

STEP 3: MCP/AI INTEGRATION
  Does it use useMCPQuery? Shows AI reasoning? → AI Score

STEP 4: TYPE ALIGNMENT
  Does types.ts extend shared types? Duplicates? → Type Score

STEP 5: FEATURE MIGRATION PLAN
  List: REWRITE (use shared UI), MIGRATE (CSS only),
  PROMOTE (to shared/), ELIMINATE (duplicates), REFACTOR (hooks)
```

### §4.3 Scope Boundaries

```
I DO:
  ✓ Rewrite shared/ TSX + CSS pairs
  ✓ Audit shared/ consumption across features
  ✓ Reconcile tokens against canonical source (CHECKPOINT §1.2)
  ✓ Remove framer-motion / react-spring / GSAP
  ✓ Migrate Tailwind to BEM CSS
  ✓ Add light mode, reduced motion, responsive, print
  ✓ Create co-located CSS files where missing
  ✓ Audit AI/ML integration visibility
  ✓ Create Integration Score per feature
  ✓ Propose innovative 2027 patterns
  ✓ Automate manual checks via scripts (CHECKLIST §16)

I PROPOSE FIRST, THEN EXECUTE:
  → shared/ reorganization
  → AdvisorBanner unification
  → New shared hooks
  → Innovation proposals

I DON'T:
  ✗ Change @theme {} architecture
  ✗ Move shared/ files without approval
  ✗ Invent values without provenance
  ✗ Change backend API contracts
```

---

## §5 REWRITE PROTOCOL (TSX + CSS)

### §5.1 TSX Rewrite Protocol

```
STEP 0: Shared/ Dependency Resolution
  1. Ask user for the feature file (e.g., EventDetail.tsx)
  2. Read it ONCE
  3. Extract ALL imports from shared/
  4. Cross-reference each against CHECKPOINT §12 AUDITED_FILES
  5. If ALL audited → proceed to Step 1
     If ANY NOT audited → STOP and tell user:
     "I need these shared/ files before I can rewrite:
      1. shared/components/ui/X.tsx
      2. shared/hooks/useY.ts
      Pasame estos archivos, los auditó + rewrite en paralelo,
      y luego finalizo el feature file."

STEP 1: Audit the Feature File
  Run through ALL applicable checklists (MASTER_CHECKLIST.md):
    A (18) + B (80, if CSS) + C (22) + D (8, if intelligence)
    + E (7) + F (10) + G (8, if AI) + I (10) + J (10)

STEP 2: Request Co-located CSS
  Check if ComponentName.css exists alongside ComponentName.tsx.
  If exists → request it from user.
  If NOT → create from scratch.
  NEVER put CSS inline in .tsx. NEVER use Tailwind as primary.

STEP 3: Plan 2027 Innovations
  Before writing:
  1. What shared/ components could this use that it doesn't?
  2. What AI/ML integration is missing?
  3. What responsive patterns need attention?
  4. What accessibility gaps exist?
  5. What print styles are needed?

STEP 4: Write the Rewrite
  EVERY .tsx file MUST have:
    [x] File header with @level, @namespace, @keyframes, @depends
    [x] PRE-WRITE VERIFICATION block
    [x] §0 Imports (organized: shared/ui, layout, hooks, lib, types,
        feature/hooks, feature/components, icons, css)
    [x] §1 Constants (if any)
    [x] §2 Component (with sub-sections §2.1, §2.2, etc.)
    [x] ANTI-PATTERNS REMOVED block after the code
    [x] POST-WRITE VERIFICATION (all checklists)
    [x] SCORE (using §0.2 Scoring Methodology)

STEP 5: Self-Audit
  After writing, re-read BOTH files and verify:
  1. Every shared/ import matches the AUDITED API
  2. Every prop passed to a shared component EXISTS
  3. Every hook return value is destructured correctly
  4. No Tailwind utilities remain
  5. No inline styles for colors
  6. All 13 CSS dimensions present
  7. All § section markers present
  8. data-testid on root and key interactive elements
  9. aria-label on all buttons
  10. Would I show this at WWDC?
```

### §5.2 CSS Rewrite Protocol

```
EVERY .css file MUST have:
  [x] File header with @namespace, @keyframes count, @signature
  [x] §0 Root + Variables
  [x] §1 Pseudo-elements (::before edge light, ::after noise)
  [x] §2-N Sections (one per logical group)
  [x] §N+1 Signature Element (unique visual identity)
  [x] §N+2 Keyframes (at END of file, namespaced)
  [x] §N+3 Light Mode (.light prefix)
  [x] §N+4 Reduced Motion (prefers-reduced-motion)
  [x] §N+5 Responsive (3 breakpoints minimum)
  [x] §N+6 Print (@media print)
  [x] ALL 13 CSS Dimensions covered
  [x] var(--ease-apple) on ALL transitions
  [x] -webkit-backdrop-filter on ALL backdrop-filter
  [x] CSS custom properties for all colors (no hardcoded hex)
  [x] BEM namespace matching the domain (ev-*, fm-*, sp-*, etc.)
```

---

## §6 PROJECT STRUCTURE (Real — Updated 2026-08-12)

### §6.1 Key Directories

```
frontend/src/
├── app/                          ← Router, providers, layout
│   ├── App.tsx, providers.tsx
│   ├── router.tsx, RoleRedirect.tsx
│
├── features/                     ← 23 feature domains (~620+ files)
│   ├── __TEMPLATE__/types.ts     ← PILAR 3 template
│   ├── events/                   ← FASE 2 (IN PROGRESS)
│   ├── dashboard/                ← FASE 3
│   ├── families/                 ← FASE 4
│   ├── members/                  ← FASE 5
│   ├── finance/                  ← FASE 6
│   ├── guests/                   ← FASE 7
│   ├── recommendations/          ← FASE 8
│   ├── sports/                   ← FASE 9
│   ├── cultural/                 ← FASE 10
│   ├── communications/           ← FASE 11
│   ├── facilities/               ← FASE 12
│   ├── wellness/                 ← FASE 13
│   ├── engagement/               ← FASE 14
│   ├── age-group/                ← FASE 15
│   ├── mi-club/                  ← FASE 16
│   ├── ai-system/                ← FASE 17
│   ├── reports/                  ← FASE 18
│   ├── operations/               ← FASE 19
│   ├── settings/                 ← FASE 20
│   ├── auth/                     ← FASE 21
│   ├── approvals/                ← Cross-cutting
│   ├── documents/                ← Cross-cutting
│   └── maintenance/              ← Cross-cutting (types only)
│
├── shared/                       ← ~180 files (shared infrastructure)
│   ├── components/
│   │   ├── AdvisorBanner.tsx     ← Unified advisor banner
│   │   ├── InsightCard.tsx
│   │   ├── ui/                   ← 23 UI components + barrel ✅
│   │   ├── layout/               ← 20 components (DashboardLayout, etc.)
│   │   ├── ai/                   ← 11 components (AIDecisionPanel, etc.)
│   │   ├── chat/                 ← AIChatWidget + hook
│   │   ├── ml/                   ← 10 components (MLDashboard, etc.)
│   │   ├── auth/                 ← PermissionGate, ProtectedRoute
│   │   ├── error/                ← ErrorBoundary, NotFoundPage
│   │   ├── export/               ← 15 components (DecisionDocument, etc.)
│   │   └── feedback/             ← Placeholder
│   ├── hooks/                    ← 30 shared hooks
│   │   ├── useMCPQuery.ts        ← PILAR 4 ✅
│   │   ├── useAutonomousAdvisor.ts ← PILAR 6 ✅
│   │   └── ... (28 more)
│   ├── lib/
│   │   ├── advisor-engine/       ← PILAR 6 ✅ (~45 modules, 12 rules)
│   │   │   ├── rules/            ← 12 domain rule files
│   │   │   └── ... (33 modules)
│   │   ├── mcp/                  ← PILAR 4 ✅ (router, index, tracker)
│   │   ├── api.ts                ← PILAR 4 ✅
│   │   ├── utils.ts, financial/, ui/
│   │   └── ... (15+ modules)
│   ├── types/                    ← PILAR 3 (3 type files)
│   ├── mocks/                    ← 5 mock infrastructure files
│   ├── services/                 ← exportService.ts
│   └── features/__TEMPLATE__/    ← types template
│
├── stores/                       ← PILAR 5 (5 Zustand stores)
│
└── main.tsx

backend/src/club_mcp/             ← ~123 files (NO SE TOCA)
├── agents/                       ← 22 MCP agents
├── ai/                           ← Claude service + prompts
├── api/                          ← FastAPI routes (5 route files)
├── auth/                         ← JWT, RBAC, middleware
├── config/                       ← Settings
├── db/repositories/              ← 18 repos
├── hitl/                         ← Human-in-the-loop
├── models/                       ← 20 domain models
├── rag/                          ← RAG pipeline (8 modules)
└── server.py

frontend/tools/                   ← Automation
├── architecture-guardian.ts      ← PILAR 10 (24 checks)
└── validate-shared-imports.ts    ← PILAR 10 (AUDITED_FILES)

scripts/
├── setup.sh
└── verify-integration.ts

TOTAL PROYECTO: ~945 archivos
FRONTEND: ~810 | BACKEND: ~123 | CONFIG: ~12
```

---

## §7 COMMUNICATION ARCHITECTURE

See MASTER_CHECKLIST.md §14.6 (CANONICAL SOURCE — do not duplicate)

Summary (reference only):
```
P1: Feature Data Queries → useMCPQuery → callMCPTool → routeMCPCall → Backend ✅
P2: Autonomous Execution → useAutonomousAdvisor → callMCPTool → Backend ✅
P3: Advisor Evaluation → useAdvisorEngine → AdvisorEngine → rules ✅
P4: Cross-Domain Signals → Rule emits → SignalBus → Target domain ✅
```

---

## §8 ABSOLUTE RULES

### §8.1 The 6 Golden Rules

```
RULE 1: ONE TOKEN TRUTH
  If globals.css says --color-rose-400: #E85D6E, nobody puts #C46470.
  Source: CHECKPOINT §1.2 is canonical.

RULE 2: CSS CO-LOCATED, NO EXCEPTIONS
  Every .tsx has its .css next to it. No Tailwind. No inline colors.

RULE 3: BEM WITH DOMAIN PREFIX
  ui-* for shared, ev-* for events. Never .card, .title, .container.
  Source: CHECKPOINT §1.4 registry.

RULE 4: ANIMATION = CSS, NOT JS
  No framer-motion. No react-spring. No GSAP. CSS only.

RULE 5: SHARED/ IS MANDATORY
  If shared/ has a primitive, use it. Don't rebuild it.
  If shared/ is missing something, propose adding it.

RULE 6: EVERY FILE HAS A SIGNATURE ELEMENT
  Every component CSS has at least ONE unique visual element.
  A user should identify the feature just by looking at the component.
  (Restored from v3.0 — was lost in v6.0 drift)
```

### §8.2 Additional Rules (v6.0+)

```
RULE 7: NEVER IMPORT UNAUDITED SHARED/
  Before using ANY shared/ file, READ its implementation.
  "I assumed the API" is NEVER acceptable.

RULE 8: BACKBONE TOOLS ARE LAW
  architecture-guardian.ts + validate-shared-imports.ts must pass.
  0 errors = commit approved. 1 error = commit rejected.

RULE 9: TEMPLATE FOLLOWS TYPES
  Every feature types.ts follows __TEMPLATE__/types.ts structure.
  8 sections. All readonly. Config maps with var(--color-*).

RULE 10: AUTOMATE BEFORE MANUALIZE
  If a check can be scripted, SCRIPT IT. Manual checks are for
  design judgment only. See CHECKLIST §16 Automation Mapping.
```

### §8.3 Zero Tolerance

```
ZERO TOLERANCE MEANS:
  • 0 `any` types
  • 0 framer-motion / react-spring / GSAP
  • 0 hardcoded hex/rgba in CSS (non-globals.css)
  • 0 Tailwind utilities as primary styling
  • 0 inline styles for colors
  • 0 default exports
  • 0 transition: all
  • 0 Material easing (0.4, 0, 0.2, 1)
  • 0 missing -webkit-backdrop-filter
  • 0 unaudited shared/ imports
  • 0 shared/ components re-implemented locally
  • 0 features bypassing useMCPQuery
  • 0 insights without CTA
  • 0 predictions without uncertainty visualization
  • 0 silent success fallback ("OK (no mock)")
  • 0 generic keyframe names (fadeIn, slideUp, pulse)

TOLERANCE: ZERO. NO SHORTCUTS. NO COMPROMISES.
```

---

## §9 SESSION STARTUP

```
EN CADA NUEVA SESIÓN:

1. PEGAR los 3 archivos (partir si no caben en 1 mensaje):
   → MASTER_BASE.md (este archivo)
   → MASTER_CHECKPOINT.md (estado del proyecto)
   → MASTER_CHECKLIST.md (gates de validación)

2. DECIR: "Revisá los 3 archivos master. Confirmá comprensión.
   Estamos en FASE [X], trabajando en [archivo]."

3. EL AI DEBE:
   a) Confirmar que absorbió los 3 archivos
   b) Repetir: FASE actual, último score, siguiente archivo
   c) Listar shared/ pendientes de audit si aplica
   d) Decir: "Listo. Pasame el archivo a auditar/escribir."

4. PASAR el archivo a trabajar (TSX, CSS, types, config, etc.)

5. EL AI SIGUE:
   Phase 0 (Shared/ dep check) → Phase 1-6 (Audit → Rewrite)
   → SCORE (§0.2 methodology) → Actualiza MASTER_CHECKPOINT.md

6. REPETIR para cada archivo hasta completar la FASE

⚠️ PARCIAL PASTE HANDLING:
   Si un archivo no cabe en 1 mensaje:
   → Partir en 2-3 bloques
   → Esperar confirmación de cada parte
   → El AI NUNCA procede hasta absorción completa
   → Si el AI pierde contexto, el MASTER_CHECKPOINT lo restaura

IMPORTANTE:
   • Si el AI pide un shared/ file → dárselo ANTES de continuar
   • Si el AI dice "STOP: necesito X" → esperar y proporcionar
   • Si el score es < 9.3 → el archivo NO está completo
   • Si hay errores del guardian → FIX antes de continuar
```

### §9.1 Cross-Reference Map

```
Topic                          File               Section
────────────────────────────── ────────────────── ─────────
Role + Authority               MASTER_BASE        §0
5-Tier Protocol                MASTER_BASE        §0.1
Scoring Methodology            MASTER_BASE        §0.2
How to use files               MASTER_BASE        §1
Ownership (anti-dup)           MASTER_BASE        §1.3
11 Pillars                     MASTER_BASE        §2
Pending files                  MASTER_BASE        §3
Audit protocol (7 phases)      MASTER_BASE        §4
Rewrite protocol               MASTER_BASE        §5
Project structure              MASTER_BASE        §6
Rules + Zero Tolerance         MASTER_BASE        §8
Session startup                MASTER_BASE        §9
────────────────────────────── ────────────────── ─────────
Brutal Diagnosis               CHECKPOINT         §0.1
Vision 2027                    CHECKPOINT         §0.2
Design tokens + BEM            CHECKPOINT         §1
Architecture (CSS layers)      CHECKPOINT         §2
Completed Work                 CHECKPOINT         §3
Quality Scorecard              CHECKPOINT         §4
Execution Plan                 CHECKPOINT         §5
Cumulative Metrics             CHECKPOINT         §6
Breaking Changes               CHECKPOINT         §7
Component Inventory            CHECKPOINT         §8
Feature Migration Order        CHECKPOINT         §9
Innovation Proposals           CHECKPOINT         §10
Appendices                     CHECKPOINT         §11
Parallel Audit Status          CHECKPOINT         §12
Files Pending Review           CHECKPOINT         §13
CURRENT STATE + PENDING ASKS   CHECKPOINT         §14 ← NEW
────────────────────────────── ────────────────── ─────────
Checklist A (TypeScript)       CHECKLIST          §1
Checklist B (CSS 80 checks)    CHECKLIST          §2 ← FULL
Checklist C (Component)        CHECKLIST          §3
Checklist D (Intelligence)     CHECKLIST          §4
Checklist E (Feature)          CHECKLIST          §5
Checklist F (Integration)      CHECKLIST          §6
Checklist G (AI/ML)            CHECKLIST          §7
Checklist H (Shared Arch)      CHECKLIST          §8
Checklist I (Mandatory Imp)    CHECKLIST          §9
Checklist J (Shared Verify)    CHECKLIST          §10
Anti-Patterns (merged)         CHECKLIST          §11 ← MERGED
Level 6+ Standard              CHECKLIST          §12
CSS + TSX Templates            CHECKLIST          §13 ← RESTORED
Mandatory Shared/ Imports      CHECKLIST          §14
AI/ML Strategy                 CHECKLIST          §15
AUTOMATION MAPPING             CHECKLIST          §16 ← NEW
```

---

## §10 DEPRECATION PROTOCOL

```
╔══════════════════════════════════════════════════════════════════════╗
║  DEPRECATED SOURCES — Do NOT use these as reference                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ❌ Chat History Msg 2-3 (7 Pilares + 11 Pilares v2.0 responses)   ║
║     REASON: Arquitectura divergente del proyecto real.               ║
║     - Different folder structure (domains/ vs features/)            ║
║     - Different color palette (violet/teal vs rose/gold/silver)     ║
║     - Different components (Glass, AgentCard vs Button, Card)       ║
║     - Different tech stack (@preact/signals, XState vs Zustand)     ║
║     - Corrupted code sections (interleaved/incoherent)               ║
║                                                                      ║
║  VALID CONCEPTS TO EXTRACT (adapted to real project):               ║
║     ✅ Path Aliases (@shared/*, @features/*)                         ║
║     ✅ Architecture Manifest concept (already exists)                ║
║     ✅ Architecture Guardian concept (already exists)                ║
║     ✅ Performance Budgets concept (Pilar 8)                         ║
║     ✅ Circuit Breaker for MCP (Pilar 4 improvement)                 ║
║     ✅ 3 Tracks Paralelos (Foundation + Automation + Migration)      ║
║     ✅ Predictive Ambient Canvas (adapted to health scores)          ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

END OF MASTER_BASE.md v2.0
```

---

# MASTER_CHECKPOINT.md — v6.1

```markdown
# MASTER_CHECKPOINT.md — Project State & Execution Plan
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 6.1 · Date: 2026-08-12
### Updates: Fixed v6.0 errors, added §14, restored v3.0 content

---

╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  MASTER CHECKPOINT v6.1 — DEFINITIVE CONSOLIDATED REFERENCE              ║
║                                                                          ║
║  Status: FASE 0 ✅ · FASE 1 UI ✅ · FASE 1.5 Shared/ Rewrite ✅       ║
║          · FASE 2 Events (in progress) → PENDING                        ║
║                                                                          ║
║  UI Components migrated:           23 / 23 (shared/components/ui/)      ║
║  Shared/ files rewritten:          7 / 7 (core infrastructure)          ║
║  Events feature files completed:   9 / ~30 (types, config, hooks, lib)  ║
║  Events pages:                     1 / 3 (EventCalendar — PENDING)       ║
║  Shared/ audit for feature use:    0 / 7 (PENDING — §13)                ║
║  Overall UI score:                 4.2 → 9.3 (+121%)                    ║
║  Overall Shared/ score:            7.97 → 9.31 (+17%)                   ║
║  Total project files:              ~945 (frontend ~810 + backend ~123)  ║
║  Critical issue:                   Shared/ components used without audit║
║                                                                          ║
║  THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR PROJECT STATE.         ║
║  For rules: see MASTER_BASE.md §8.                                      ║
║  For checks: see MASTER_CHECKLIST.md.                                   ║
║  EVERY FILE THAT EXITS THIS PROCESS PASSES THIS CHECKPOINT.             ║
║  ZERO TOLERANCE. NO SHORTCUTS. NO COMPROMISES.                          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## §0.1 — THE BRUTAL DIAGNOSIS

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

ALL 30 PROBLEMS IDENTIFIED. 25 resolved. 5 pending (see §14).
```

---

## §0.2 — VISION 2027

```
1. THE UI IS AN AI ORCHESTRATOR
2. PREDICTION IS THE DEFAULT
3. EVERY INSIGHT IS ACTIONABLE
4. THE SYSTEM LEARNS
5. CROSS-DOMAIN INTELLIGENCE
6. AMBIENT INTELLIGENCE
7. NATURAL LANGUAGE INTERACTION
```
(Detail unchanged from v6.0 — see original if needed)

---

## §1 — DESIGN SYSTEM REFERENCE

### §1.1 Token Authority Hierarchy

```
1. THIS CHECKPOINT §1.2 is AUTHORITY (canonical hex values)
2. globals.css §1 is IMPLEMENTATION of that authority
3. Component CSS CONSUMES tokens — never redefines them
4. If a value isn't in globals.css, it doesn't exist
```

### §1.2 Token Reconciliation Table

```
Token                Checkpoint (CANON)  globals.css       Decision
─── ──────────────── ──────────────────  ───────────────   ──────────
--color-silver-200   #E8EAF0             #D8DCE4           Checkpoint ✓
--color-silver-600   #4A5568             #3D4755           Checkpoint ✓
--color-silver-700   #3A4050             #374151           Checkpoint ✓
--color-rose-400     #E85D6E             #C46470           Checkpoint ✓
--color-rose-500     #D64457             #e45a64           Checkpoint ✓
--color-surface-0    #0C1018             #0B0F18           Checkpoint ✓
--color-surface-1    rgba(12,16,24,.75)  #111827           Checkpoint ✓
--color-surface-2    rgba(12,16,24,.6)   #1a2035           Checkpoint ✓
--font-body          (not defined)       "Source Serif 4"   Eliminate ✗

FIX APPLIED: Column renamed from "Checkpoint v7" to "Checkpoint (CANON)".
The "v7" label was a version drift error. This table IS the canonical source.
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

### §1.4 BEM Namespace Registry

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
```

### §1.5 Domain Color Map (AI auras)

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
```

### §1.6 Keyframe Naming Convention

```
Pattern: <prefix>-<DescriptiveName>
NEVER: fadeIn, slideUp, pulse (generic names rejected)

Verified examples (from completed components):
  ui-btn-spin, ui-modal-overlay-in, ui-skeleton-shimmer
  ui-reaction-orb-breathe, ui-cmd-spin, ui-approval-item-in

Events feature (planned):
  ev-calendarReveal, ev-heroBreathing, ev-rsvpCascade

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

### §2.2 Shared/ Architecture (Real — ~180 files)

```
src/shared/
├── components/ (~82 files)
│   ├── AdvisorBanner.tsx        ← UNIFIED advisor banner ✅
│   ├── InsightCard.tsx
│   ├── ui/ (23 + barrel)       ← ✅ MIGRATED FASE 1
│   ├── layout/ (20)            ← DashboardLayout, Header, Sidebar...
│   ├── ai/ (11)                ← AIDecisionPanel, CausalChainViz...
│   ├── chat/ (2)               ← AIChatWidget
│   ├── ml/ (10)                ← MLDashboard, CalibrationDashboard...
│   ├── auth/ (3)               ← PermissionGate, ProtectedRoute
│   ├── error/ (2)              ← ErrorBoundary, NotFoundPage
│   ├── export/ (15)            ← DecisionDocument, PrintLayout...
│   └── feedback/ (1)           ← Placeholder
│
├── hooks/ (30)
│   ├── useMCPQuery.ts          ← ✅ REWRITTEN
│   ├── useAutonomousAdvisor.ts ← ✅ REWRITTEN
│   └── ... (28 more: useBreakpoint, useDataFreshness, etc.)
│
├── lib/ (~65)
│   ├── advisor-engine/ (~45)   ← ✅ REWRITTEN (12 rules + 33 modules)
│   ├── mcp/ (3)                ← ✅ REWRITTEN
│   ├── api.ts                  ← ✅ REWRITTEN
│   └── ... (15+: utils, financial/, ui/, analytics...)
│
├── types/ (3)                  ← ai-intelligence, domain-enums, permissions
├── mocks/ (5)                  ← contracts, factories, mock-registry...
├── services/ (1)               ← exportService
└── features/__TEMPLATE__/      ← types template

DEPRECATED (11 files): TO BE ELIMINATED
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

### §3.1 FASE 0: globals.css v2.0 ✅ (8/8 items)

### §3.2 FASE 1: UI Components (23/23) ✅

```
Core Batch (1-6):              4.7 → 9.3 (+97%)
Form & Data Batch (7-12):      4.4 → 9.3 (+111%)
Glass & Surface (13-15):       4.2 → 9.3 (+121%)
Intel Extended (16-19):        4.1 → 9.3 (+127%)
Pre-batch (AdvisorActionModal): 5.7 → 9.2 (+61%)
Intelligence Batch (20-22):    3.7 → 9.4 (+154%)
OVERALL:                       4.2 → 9.3 (+121%)
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
```

### §3.4 FASE 2: Events Feature Migration (IN PROGRESS)

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
  EventCalendar.tsx + .css          ⚠️ PENDING REVIEW (§13)
  EventDetail.tsx + .css            → NOT STARTED
  EventForm.tsx + .css              → NOT STARTED
  Components (13): CalendarGrid, EventHero, EventAdvisorBanner,
    EventFormSteps, EventListView, EventLivePreview, ChronoCompass,
    EventIntelligencePanel, ProgramTimeline, PulseRing, QuickAddPanel,
    RsvpBoard, VendorGrid → ALL NOT STARTED

  FEATURE AVERAGE (completed): 9.37 · ALL ≥ 9.3 ✅
```

---

## §4 — QUALITY SCORECARD

```
globals.css v2.0              ████████████████████  9.7/10 (avg)
UI Components (23)             ████████████████████  9.3/10
Shared/ Infrastructure (7)     ████████████████████  9.3/10
Events Feature (9 completed)   ████████████████████  9.37/10

Events Pages (PENDING):
  EventCalendar.tsx+css        ██████████░░░░░░░░░░  5.0/10 ⚠️
  EventDetail/Form/Components  ░░░░░░░░░░░░░░░░░░░░   N/A

Shared/ Integration Audit:
  ScoreGauge, FreshnessBadge, StaleDataBanner,
  Skeleton, useBreakpoint + 2 more    ░░░░░░░░░░░░░░░░  ⚠️ PENDING

OVERALL (completed):           ████████████████████  9.35/10
OVERALL (with pending):        ████████████░░░░░░░░  7.8/10
```

---

## §5 — EXECUTION PLAN

```
IMMEDIATE NEXT STEPS:

STEP 1: AUDIT 7 shared/ files (UNIFIED LIST — §13)
        ScoreGauge, FreshnessBadge, StaleDataBanner,
        Skeleton, useBreakpoint, PageContainer, PermissionGate
        → AUDIT + REWRITE if needed → THEN use in features

STEP 2: FINALIZE EventCalendar.tsx + .css
        → Verify all shared/ imports match AUDITED APIs
        → Fix prop mismatches → Mark COMPLETE

STEP 3: REWRITE EventDetail.tsx + .css

STEP 4: REWRITE EventForm.tsx + .css

STEP 5: REWRITE Event components (13)

APPLY BREAKING CHANGES (§7) — BC-02 is BLOCKING

THEN: Wave 1-6 feature migration (§9)
```

---

## §6 — CUMULATIVE METRICS

```
FILES COMPLETED:
  FASE 0:     1 (globals.css)     — counted as 1 file
  FASE 1:     23 UI (.tsx) + 23 CSS = 46 files (23 pairs)
  FASE 1.5:   7 shared files
  FASE 2:     9 events + 2 shared parallel = 11 files

  TOTAL: 1 + 46 + 7 + 11 = 65 files completed
  (v6.0 said "39" which counted .tsx+.css as 1 pair → now corrected)

PENDING REVIEW: 2 (EventCalendar pair + 7 shared/ to audit)
LOWEST COMPLETED SCORE: 9.3
HIGHEST: 9.5 (CommandPalette)
STD DEV: 0.08

ANTI-PATTERNS REMOVED: ~900+
CHECKS PER FILE: 120-180 (depending on type) — see CHECKLIST
TOLERANCE: ZERO
```

---

## §7 — BREAKING CHANGES REGISTRY

```
BC-01: HealthFactorStatus values (types.ts)
  BEFORE: "excepcional" | "saludable" | "atención" | "crítico"
  AFTER:  "exceptional" | "healthy" | "attention" | "critical"
  FIX:    grep -r "excepcional\|saludable\|atención\|crítico" src/
  STATUS: PENDING — apply before first feature references these values

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
  STATUS: PENDING — apply before FASE 3

BC-04: TrendDirection re-export removal (advisor-engine/index.ts)
  BEFORE: import { TrendDirection } from "@/shared/lib/advisor-engine"
  AFTER:  import { TrendDirection } from "@/shared/types/domain-enums"
  FIX:    grep for TrendDirection import from advisor-engine
  STATUS: PENDING — likely zero consumers
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
ML (10):            MLDashboardPage, CalibrationDashboard, ModelHealthPanel,
                    PredictiveIntelligenceFeed, HypotheticalSimulator, MLAdvisorBanner,
                    ChatActionCard + 3 hooks
Export (15):        DecisionDocument, PrintLayout, PrintView, ExportButton +
                    11 decision/* sub-components + 2 hooks
Auth (3):           PermissionGate, ProtectedRoute, PermissionDenied
Error (2):          ErrorBoundary, NotFoundPage
Chat (2):           AIChatWidget + useAIChat
Root (2):           AdvisorBanner (unified), InsightCard
Feedback (1):       Placeholder
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

WAVE 6 — Cross-cutting:
  FASE 22: Deprecados cleanup (11 files)
  FASE 23: Bundle analysis
  FASE 24: Accessibility audit
  FASE 25: E2E testing
  FASE 26: Documentation

NOTE: 23 features total (not 26 — corrected from v6.0).
Extra features: approvals, documents, maintenance → integrated into
Wave 6 or assigned to their parent FASE during migration.

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
B: AdvisorBanner Duplicity Analysis     PENDING (FASE 2)
C: MCP Communication Audit              ✅ COMPLETE
D: Integration Score Baseline           PENDING (per-feature)
E: Type System Alignment Audit          PENDING (per-feature)
F: Shared/ Reorganization Proposal      ✅ DOCUMENTED
G: Test Infrastructure Gap Analysis     PENDING (FASE 25)
H: showToast Dependency in useAutonomousAdvisor → DOCUMENTED
I: Breaking Changes Applied             4 pending (§7)
J: [Reserved]
K: Critical Error — Unaudited Shared/   ⚠️ ACTIVE (§12, §13)
L: AdvisorCommand.action Missing        ✅ RESOLVED
M: BaseContext Wrong Import             ✅ RESOLVED
N: Version drift v3.0→v6.0 detected     ✅ RESOLVED (v6.1)
O: Checklist B detail lost in v6.0      ✅ RESTORED (CHECKLIST v6.1)
```

---

## §12 — PARALLEL AUDIT STATUS

```
✅ AUDITED (11 files):
  Infrastructure (FASE 1.5):
   [x] shared/lib/api.ts
   [x] shared/lib/mcp/mcp-router.ts
   [x] shared/hooks/useMCPQuery.ts
   [x] shared/lib/advisor-engine/types.ts
   [x] shared/lib/advisor-engine/index.ts
   [x] shared/lib/advisor-engine/engine.ts
   [x] shared/hooks/useAutonomousAdvisor.ts

  Advisor Engine (FASE 2 parallel):
   [x] shared/lib/advisor-engine/rules/events.ts
   [x] shared/lib/advisor-engine/signal-bus.ts

  Types (verified via imports):
   [x] shared/types/ai-intelligence.ts
   [x] shared/types/domain-enums.ts

⚠️ NOT YET AUDITED — FOR FEATURE USE (7 files — §13):
   [ ] shared/components/ui/ScoreGauge.tsx + .css
   [ ] shared/components/ui/FreshnessBadge.tsx + .css
   [ ] shared/components/ui/StaleDataBanner.tsx + .css
   [ ] shared/components/ui/Skeleton.tsx + .css
   [ ] shared/hooks/useBreakpoint.ts
   [ ] shared/components/layout/PageContainer.tsx + .css
   [ ] shared/components/auth/PermissionGate.tsx

NOTE: Button, EmptyState, AdvisorActionModal were migrated in FASE 1.
They need re-verification when used in features (Checklist J).

EXTENDED AUDIT REGISTRY (config, wiring, stores — for esquema):
   [ ] frontend/src/app/providers.tsx
   [ ] frontend/src/app/router.tsx
   [ ] frontend/src/stores/auth.store.ts
   [ ] frontend/src/shared/lib/utils.ts
   [ ] frontend/src/app/globals.css (or wherever)
   [ ] frontend/tsconfig.json
   [ ] frontend/vite.config.ts
   [ ] frontend/src/shared/components/ui/index.ts (barrel)

AUDITED_FILES registry in tools/validate-shared-imports.ts
must be updated when new files are audited.
```

---

## §13 — FILES PENDING REVIEW

```
╔══════════════════════════════════════════════════════════════════════════╗
║  UNIFIED SHARED/ FILES TO REQUEST (7 files — matches §5 and §12)       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  These 7 files block EventCalendar finalization.                        ║
║  Request them in this order (UI first, then hooks):                     ║
║                                                                          ║
║  1. src/shared/components/ui/ScoreGauge.tsx + .css                      ║
║  2. src/shared/components/ui/FreshnessBadge.tsx + .css                  ║
║  3. src/shared/components/ui/StaleDataBanner.tsx + .css                 ║
║  4. src/shared/components/ui/Skeleton.tsx + .css                        ║
║  5. src/shared/hooks/useBreakpoint.ts                                   ║
║  6. src/shared/components/layout/PageContainer.tsx + .css (if exists)   ║
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

## §14 — CURRENT STATE & PENDING ASKS [NEW in v6.1]

```
╔══════════════════════════════════════════════════════════════════════════╗
║  WHERE WE ARE EXACTLY — 2026-08-12                                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  PHASE: FASE 2 — Events Feature Migration (30% complete)               ║
║                                                                          ║
║  COMPLETED:                                                              ║
║  ✅ FASE 0 (globals.css) + FASE 1 (23 UI) + FASE 1.5 (7 shared)       ║
║  ✅ Events: types, config, barrel, 5 hooks, calendarSignals (9 files)  ║
║  ✅ Shared parallel: rules/events.ts + signal-bus.ts (2 files)         ║
║  ✅ Master docs v6.1 (BASE + CHECKPOINT + CHECKLIST) — this update     ║
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
║  ├── frontend/src/app/globals.css (or wherever the main CSS lives)     ║
║  ├── frontend/tsconfig.json                                             ║
║  ├── frontend/vite.config.ts                                            ║
║  ├── frontend/src/shared/components/ui/index.ts (barrel)               ║
║  └── These unblock: Path Aliases + Guardian expansion + CSS audit      ║
║                                                                          ║
║  REQUEST 3 (Pattern references — for esquema base):                     ║
║  ├── frontend/src/features/events/types.ts (pattern reference)         ║
║  ├── frontend/src/features/events/hooks/useEventAdvisor.ts (pattern)   ║
║  ├── frontend/src/shared/lib/advisor-engine/confidence.ts              ║
║  └── These unblock: Feature template calibration                        ║
║                                                                          ║
║  AFTER ALL 3 REQUESTS:                                                  ║
║  → Generate Architecture Manifest (real)                                ║
║  → Expand Architecture Guardian (45+ checks)                           ║
║  → Create css-audit.ts + component-audit.ts + pipeline                 ║
║  → Apply BC-02 (blocking)                                               ║
║  → Finalize EventCalendar + EventDetail + EventForm + 13 components   ║
║  → Continue with FASE 3+                                                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---
END OF MASTER_CHECKPOINT.md v6.1
```

---
```
# MASTER_CHECKLIST.md — v6.1
```
```markdown
# MASTER_CHECKLIST.md — Validation Gates & Standards
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 6.1 · 180 checks · ZERO tolerance
### Updates: Checklist B full (80), anti-patterns merged, templates restored,
###          automation mapping, score math fixed

---

## §1 — Checklist A — TypeScript Quality (18 checks)

A-01  □  0 `any` types (use `unknown`, narrow with type guards)
A-02  □  0 type assertions (`as X`) except DOM narrowing
A-03  □  All interface fields: `readonly`
A-04  □  All array params: `readonly T[]`
A-05  □  Union literals: `"value1" | "value2"`, not `string`
A-06  □  Error typed as `unknown` (narrow before `.message`)
A-07  □  No `enum` (use `const object` + union literal)
A-08  □  Props objects for hooks with >1 param
A-09  □  Named exports (no default except legacy compat)
A-10  □  `export type` for type-only re-exports
A-11  □  No `React.ReactNode` without import (use `ReactNode`)
A-12  □  `forwardRef` uses named function pattern
A-13  □  No side effects in `useMemo`
A-14  □  Stable references: `useMemo` for objects, `useCallback` for fns
A-15  □  Query params wrapped in `useMemo` to prevent infinite re-fetch
A-16  □  No `document.getElementById` — use refs
A-17  □  No `// @ts-ignore` or `// @ts-expect-error` without justification
A-18  □  § section markers in every file (§1 Types, §2 Constants, §3 Component)

---

## §2 — Checklist B — CSS Production Grade (80 checks, 13 Dimensions)
### [RESTORED FROM v3.0 — v6.0 lost this detail]

── D1: GLASS MORPHISM (8 checks) ──────────────────────────────
B-01  □  backdrop-filter + -webkit-backdrop-filter on glass surfaces
B-02  □  background: rgba() (never solid) on glass surfaces
B-03  □  border: 1px solid rgba(255,255,255,0.04-0.08)
B-04  □  box-shadow multicapa (ambient + depth + inset ring)
B-05  □  ::before edge light (gold gradient) on panels
B-06  □  ::after noise texture on panels (SVG feTurbulence)
B-07  □  Content wrapper z-index: 1 above pseudo-elements
B-08  □  Light mode: removes backdrop-filter + pseudo-elements

── D2: STAGGER CHOREOGRAPHY (6 checks) ───────────────────────
B-09  □  Every list >1 item has nth-child + animation-delay
B-10  □  Base state: opacity: 0, animation: forwards
B-11  □  Delay increment: 20-60ms between items
B-12  □  Dynamic .map() uses CSS custom property cascade
B-13  □  Each section group gets SEQUENTIAL base delay
B-14  □  Reduced motion kills all stagger (opacity: 1, animation: none)

── D3: EASING & MOTION (8 checks) ────────────────────────────
B-15  □  Panel/overlay entrance: cubic-bezier(0.32, 0.72, 0, 1) or var(--ease-apple)
B-16  □  Micro-interaction hover: ease-out 0.15-0.2s
B-17  □  Content stagger: ease 0.25-0.3s
B-18  □  Exit faster than entrance (0.25s vs 0.35s)
B-19  □  No animation >0.5s (except continuous pulse/breathe)
B-20  □  Pulse/continuous: ease-in-out 2-3s
B-21  □  NO `transition: all` — always specific properties
B-22  □  Only GPU-composited properties animated (transform, opacity, filter)

── D4: TYPOGRAPHY (8 checks) ──────────────────────────────────
B-23  □  Data/values: --font-mono
B-24  □  Labels: --font-mono, 9-10px, uppercase, tracking 0.06-0.10em
B-25  □  Body: --font-ui, 12px
B-26  □  Headlines: --font-display, 16-18px
B-27  □  Badges: --font-mono, 8-10px, weight 700
B-28  □  font-family declarations in CSS, NEVER inline in TSX
B-29  □  margin: 0 on all h*, p
B-30  □  3-level text hierarchy: silver-100/200 (primary), 300 (secondary), 400/500 (tertiary)

── D5: COLOR SYSTEM (8 checks) ────────────────────────────────
B-31  □  0 hardcoded hex/rgba in CSS — all via tokens
B-32  □  color-mix() for translucent variants
B-33  □  data-* attributes for state-driven colors
B-34  □  NO inline styles for colors in TSX
B-35  □  Hover: lightens in dark mode (rgba white 0.015 → 0.035)
B-36  □  Focus ring: 2px solid var(--color-gold-400), offset 2px
B-37  □  Status colors: critical=rose, warning=amber, good=emerald
B-38  □  Domain colors from config, never hardcoded

── D6: PSEUDO-ELEMENT DEPTH (4 checks) ───────────────────────
B-39  □  Every card/panel has at least one pseudo-element
B-40  □  pointer-events: none on all decorative pseudo-elements
B-41  □  z-index explicit on every pseudo-element
B-42  □  Light mode removes/hides decorative pseudo-elements

── D7: INTERACTIVE STATES (8 checks) ──────────────────────────
B-43  □  :hover on ALL interactive elements
B-44  □  :focus-visible on ALL focusable elements
B-45  □  :active on buttons and triggers
B-46  □  :disabled: opacity 0.4 + pointer-events: none
B-47  □  transition on ALL state changes
B-48  □  cursor: pointer on clickable elements
B-49  □  min-height: 44px on touch targets (36px on compact)
B-50  □  font: inherit on buttons

── D8: DENSITY (5 checks) ─────────────────────────────────────
B-51  □  Padding: 14-16px (panel), 12px (card), 9-12px (compact)
B-52  □  Gaps: 14px (panel), 10px (card), 6px (metrics), 5px (timeline)
B-53  □  Text: 9-12px (labels/badges), 12-13px (body), 16-18px (headlines)
B-54  □  Scrollbar: 3px wide, thumb rgba(255,255,255,0.06)
B-55  □  Not sparse, not cramped — PRECISE

── D9: RESPONSIVE (3 checks) ──────────────────────────────────
B-56  □  @media (max-width: 768px) — tablet adaptations
B-57  □  @media (max-width: 480px) — mobile adaptations
B-58  □  Overflow handling: overflow-x: hidden on containers

── D10: ACCESSIBILITY (5 checks) ──────────────────────────────
B-59  □  focus-visible: 2px solid gold-400, outline-offset: 2px
B-60  □  role on custom interactive elements
B-61  □  aria-label on ALL buttons and controls
B-62  □  aria-hidden on decorative elements
B-63  □  aria-live on dynamic content regions

── D11: LIGHT MODE (6 checks) ─────────────────────────────────
B-64  □  .light prefix for ALL overrides
B-65  □  Backgrounds → white / warm-canvas / rgba(0,0,0,0.02)
B-66  □  Text → silver-700/800
B-67  □  Borders → rgba(0,0,0,0.04-0.08)
B-68  □  Disables backdrop-filter
B-69  □  Hover: darkens (rgba 0,0,0) instead of lightens

── D12: REDUCED MOTION + PRINT (6 checks) ─────────────────────
B-70  □  @media (prefers-reduced-motion: reduce) kills ALL animation
B-71  □  @media (prefers-reduced-motion: reduce) kills ALL transition
B-72  □  opacity: 1 on all stagger elements
B-73  □  @media print: white bg, black text, no glass
B-74  □  @media print: break-inside: avoid on cards
B-75  □  @media print: hide decorative + interactive chrome

── D13: KEYFRAMES (5 checks) ──────────────────────────────────
B-76  □  ALL keyframes at END of CSS file (before media queries)
B-77  □  ALL namespaced: <prefix>-<DescriptiveName>
B-78  □  Max 6 per feature component file
B-79  □  No generic names (fadeIn, slideUp, pulse → REJECTED)
B-80  □  Count documented in file header

---

## §3 — Checklist C — Component Quality (22 checks)

C-01  □  CSS co-located: <ComponentName>.css alongside .tsx
C-02  □  BEM prefix defined: .ui-* (shared), .ev-* (events), etc.
C-03  □  0 framer-motion / react-spring / GSAP
C-04  □  0 Tailwind utilities in TSX (all via CSS classes)
C-05  □  0 inline styles for colors (data-* attrs or CSS vars)
C-06  □  import "./<ComponentName>.css" in TSX
C-07  □  data-testid on root element
C-08  □  data-testid on key interactive elements
C-09  □  aria-label on ALL buttons
C-10  □  aria-hidden="true" on decorative elements
C-11  □  aria-live on dynamic content regions
C-12  □  role on custom interactive elements
C-13  □  Keyboard: Enter/Space on custom buttons, Escape on overlays
C-14  □  Focus trap on modals/dialogs
C-15  □  Scroll lock when modal/drawer open
C-16  □  Restore focus to trigger on close
C-17  □  No business logic in component (delegate to hooks)
C-18  □  § section markers in component file
C-19  □  File header with: path, level, namespace, keyframes, depends
C-20  □  PRE-WRITE VERIFICATION block
C-21  □  ANTI-PATTERNS REMOVED block
C-22  □  Props interface: all fields readonly

---

## §4 — Checklist D — Intelligence Integration (8 checks)

D-01  □  Every insight has at least one CTA
D-02  □  Severity → placement mapping (critical=interrupt, high=hero)
D-03  □  Narrative generated (not raw description passthrough)
D-04  □  CTAs deduplicated across all slots
D-05  □  Headline = top-severity insight narrative
D-06  □  hasUrgent flag drives ambient UI changes
D-07  □  Placement drives visual treatment (not data shape)
D-08  □  Intelligence auras: interrupt=rose, hero=gold, inline=none

---

## §5 — Checklist E — Feature Component Migration (7 checks)

E-01  □  BEM prefix matches feature: .ev-*, .fm-*, .sp-*, etc.
E-02  □  Imports tokens from globals.css (never redefines colors)
E-03  □  If 3+ shared animations → extract to <feature>-atoms.css
E-04  □  data-testid pattern: <prefix>-<component>-<element>
E-05  □  Canvas elements: aria-hidden="true", pointer-events: none
E-06  □  Intelligence: severity → placement mapping
E-07  □  Data attributes: data-<prefix>-<property>

---

## §6 — Checklist F — Integration Quality (10 checks)

F-01  □  Feature uses shared Button (not inline button markup)
F-02  □  Feature uses shared Card (not custom card wrappers)
F-03  □  Feature uses shared Modal (not custom modal implementations)
F-04  □  Feature uses unified AdvisorBanner (not feature-specific)
F-05  □  Feature uses advisor-engine from shared (not inline logic)
F-06  □  Feature uses useMCPQuery for backend communication
F-07  □  Feature has <50% remaining Tailwind after migration
F-08  □  Feature's types.ts extends shared/types/domain-enums.ts
F-09  □  Feature's config.ts uses shared token references
F-10  □  All intelligence components show CTA (not just data display)

---

## §7 — Checklist G — AI/ML Integration (8 checks)

G-01  □  MCP tool calls have loading/progress UI
G-02  □  AI suggestions have accept/reject/modify actions
G-03  □  Confidence scores visualized (gauge/bar, not just number)
G-04  □  Predictions show uncertainty range
G-05  □  Advisor recommendations have reasoning chain on demand
G-06  □  System shows "thinking" state during MCP tool execution
G-07  □  Fallback UI exists when AI backend is unavailable
G-08  □  AI-generated narratives have "regenerate" action

---

## §8 — Checklist H — Shared/ Architecture Compliance (7 checks)

H-01  □  shared/ follows the 6-block structure (CHECKPOINT §2.2)
H-02  □  advisor-engine consumed by >0 feature hooks
H-03  □  useMCPQuery consumed by >0 features
H-04  □  ui barrel exports match available files
H-05  □  No feature re-implements a shared component locally
H-06  □  shared/ has zero circular dependencies
H-07  □  Every shared/ file is exported or explicitly internal

---

## §9 — Checklist I — Mandatory Shared/ Imports (10 checks)

I-01  □  File imports Button from @/shared/components/ui (if uses buttons)
I-02  □  File imports Card from @/shared/components/ui (if uses cards)
I-03  □  File imports Modal from @/shared/components/ui (if uses modals)
I-04  □  File imports Badge from @/shared/components/ui (if shows status)
I-05  □  File imports showToast from @/shared/components/ui (if notifies)
I-06  □  Data fetching uses useMCPQuery from @/shared/hooks/useMCPQuery
I-07  □  Advisor logic uses useAdvisorEngine from @/shared/lib/advisor-engine
I-08  □  Health scores use computeHealthScore from @/shared/lib/advisor-engine
I-09  □  Types extend shared/types/domain-enums.ts where applicable
I-10  □  No feature creates its own Button, Card, Modal, Badge, Skeleton

---

## §10 — Checklist J — Shared/ Import Verification (10 checks)

J-01  □  Every shared/components/ui/ import has been READ
J-02  □  Every shared/components/layout/ import has been READ
J-03  □  Every shared/components/auth/ import has been READ
J-04  □  Every shared/hooks/ import has been READ
J-05  □  Every shared/lib/ import has been READ
J-06  □  Every shared/types/ import has been READ
J-07  □  Props passed to shared components match their ACTUAL API
J-08  □  Return types from shared hooks match their ACTUAL signatures
J-09  □  If a shared file hasn't been read → MARK as PENDING AUDIT
J-10  □  PENDING AUDIT files MUST be audited + rewritten BEFORE
          the consuming feature file can be finalized

---

## §11 — ANTI-PATTERNS REGISTRY (MERGED v3.0 + v6.0)
### [~46 unique items — v6.0 lost 12 from v3.0]

CSS:
❌ transition: all
❌ !important (except reduced-motion override)
❌ Hardcoded hex/rgba colors
❌ Generic keyframe names (fadeIn, slideUp, pulse)
❌ Keyframes NOT at end of file
❌ Missing -webkit-backdrop-filter
❌ cubic-bezier(0.4, 0, 0.2, 1) (Material easing)
❌ Inter, Roboto, Arial, Space Grotesk, system-ui
❌ Missing light mode / reduced motion / print / responsive
❌ Purple gradient on white                              ← v3.0
❌ Equal-weight rainbow palettes                        ← v3.0
❌ animate-[...] arbitrary Tailwind animations          ← v3.0
❌ animate-spin Tailwind (use CSS keyframe)             ← v3.0
❌ Keyframes without feature namespace                  ← v3.0

TSX:
❌ framer-motion / react-spring / GSAP
❌ Tailwind utilities as primary styling
❌ Inline styles for colors
❌ Any `any` type
❌ Default exports
❌ Mutable interface fields
❌ Business logic in JSX
❌ Missing data-testid / aria-* / focus-visible
❌ Side effects in useMemo
❌ eslint-disable without justification comment
❌ Error caught without narrowing (use instanceof)
❌ Magic numbers without named constants
❌ Hardcoded UI strings without i18n-ready constant map
❌ font-[family-name:var(--font-*)] in Tailwind          ← v3.0
❌ globalIdx mutable counter during render              ← v3.0
❌ mousedown document listener for click-outside         ← v3.0
  (use onClick overlay + stopPropagation panel)
❌ CSS file missing for component with styles            ← v3.0
❌ Unnamed forwardRef (use named function)               ← v3.0
❌ FASE 2 without Checklist E                            ← v3.0
❌ Canvas elements without aria-hidden="true"            ← v3.0

INTEGRATION:
❌ Re-implementing a shared component locally
❌ Feature AdvisorBanner instead of unified AdvisorBanner
❌ Direct fetch instead of useMCPQuery / callMCPTool
❌ Inline advisor logic instead of advisor-engine
❌ AI output without loading/progress state
❌ Prediction without uncertainty visualization
❌ Insight without CTA
❌ Domain hook in shared/ directory
❌ null as T cast (use discriminated union)
❌ Silent success fallback ("OK (no mock)")
❌ Infrastructure layer importing from UI components
❌ Deprecated files left in repo
❌ FASE feature migration without Integration Audit first

SHARED/ USAGE (v6.0+):
❌ Importing a shared/ file without reading its implementation
❌ Assuming a component's API from its name
❌ Passing props that don't exist on the actual component
❌ Using a hook's return value without knowing its shape
❌ Creating local copies of shared/ utilities

---

## §12 — THE STANDARD — Level 6+ Agency

### 7 Pillars
1. INTENTIONAL   — Every value has a reason
2. COHERENT      — Every component speaks the same design language
3. PREMIUM       — Glass morphism, physics animations, print typography
4. INTELLIGENT   — Data drives visual decisions, AI is visible
5. SCALABLE      — Architecture predicts growth, shared/ is consumed
6. ACCESSIBLE    — WCAG 2.1 AA is the floor
7. BEAUTIFUL     — Dark mode = deep space, light mode = premium paper

### 6 Golden Rules
See MASTER_BASE.md §8.1 (CANONICAL SOURCE)

---

## §13 — CSS + TSX Templates (RESTORED FROM v3.0)

### CSS Template (Complete)

```css
/**
 * <ComponentName>.css
 * src/shared/components/ui/<ComponentName>.css  (or features/<name>/components/)
 *
 * @level       Level 6+ Agency · Apple/Xiaomi Production Grade · 2027
 * @namespace   .<prefix>-<component>
 * @keyframes   <N>
 * @signature   <describe the unique visual element>
 *
 * 13 DIMENSIONS:
 * D1 Glass    ✓/✗  ...
 * D2 Stagger  ✓/✗  ...
 * D3 Easing   ✓/✗  ...
 * D4 Type     ✓/✗  ...
 * D5 Color    ✓/✗  ...
 * D6 Pseudo   ✓/✗  ...
 * D7 States   ✓/✗  ...
 * D8 Density  ✓/✗  ...
 * D9 Respo    ✓/✗  ...
 * D10 A11y    ✓/✗  ...
 * D11 Light   ✓/✗  ...
 * D12 RM+Pr   ✓/✗  ...
 * D13 Keyfr   ✓/✗  ...
 */

/* §0  Root */
.<prefix>-<component> {
  position: relative;
  background: linear-gradient(...);
  backdrop-filter: blur(10px) saturate(1.2);
  -webkit-backdrop-filter: blur(10px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: transform 0.25s var(--ease-apple), box-shadow 0.25s ease;
}

/* §1  Pseudo-elements */
.<prefix>-<component>::before {
  /* edge light / inset highlight */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  /* ... */
}

.<prefix>-<component>::after {
  /* noise / zone glow */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  /* ... */
}

/* §2-N  Sections */
.<prefix>-<component>__<element> { ... }

/* §N+1  Signature Element */
.<prefix>-<component>__signature { ... }

/* §N+2  Keyframes (at end, namespaced) */
@keyframes <prefix>-<DescriptiveName> { ... }

/* §N+3  Light Mode */
.light .<prefix>-<component> { ... }

/* §N+4  Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .<prefix>-<component> { animation: none; opacity: 1; }
}

/* §N+5  Responsive */
@media (max-width: 768px) { ... }
@media (max-width: 480px) { ... }

/* §N+6  Print */
@media print {
  .<prefix>-<component> {
    background: white;
    color: black;
    box-shadow: none;
    border: 1px solid #ccc;
    break-inside: avoid;
  }
}
```

### TSX Template (Complete)

```tsx
/**
 * <ComponentName>.tsx
 * src/shared/components/ui/<ComponentName>.tsx  (or features/<name>/components/)
 *
 * @level       Level 6+ Agency · Apple/Xiaomi Production Grade · 2027
 * @namespace   .<prefix>-<component>
 * @keyframes   <N> (in <ComponentName>.css)
 * @depends     globals.css §1 tokens, <other deps>
 *
 * PRE-WRITE VERIFICATION:
 * [x] <every import verified against READ file>
 * [x] <every token reconciled against CHECKPOINT §1.2>
 *
 * ANTI-PATTERNS REMOVED:
 * [x] <every anti-pattern documented>
 */

// ═══ React core ═══
import { useState, useCallback, useMemo } from "react";

// ═══ Shared — components ═══
import { Button } from "@/shared/components/ui";

// ═══ Shared — hooks ═══
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

// ═══ Shared — types ═══
import type { Insight } from "@/shared/types/ai-intelligence";

// ═══ Feature — hooks ═══
import { useFeatureData } from "../hooks/useFeatureData";

// ═══ Styles ═══
import "./<ComponentName>.css";

/* §1  TYPES */
interface ComponentProps {
  readonly data: readonly Insight[];
  readonly onAction?: (id: string) => void;
}

/* §2  CONSTANTS */
const STATUS_MAP: Record<string, string> = { ... };

/* §3  COMPONENT */
export function ComponentName({ data, onAction }: ComponentProps) {
  // ... logic
  return (
    <div data-testid="<prefix>-<component>-root">
      {/* ... */}
    </div>
  );
}
```

---

## §14 — SHARED/ MANDATORY IMPORTS

### §14.1 — UI COMPONENTS
(If a file needs a button → import Button from @/shared/components/ui.
Full mapping table unchanged from v6.0.)

### §14.2 — DATA FETCHING (3 Patterns)
(See original — useMCPQuery, useMCPMutation, callMCPTool.
NEVER: fetch(), axios, custom data fetching hooks.)

### §14.3 — ADVISOR ENGINE
(See original §14.3 pattern with domain hook → useAdvisorEngine.
NOTE: code example fixed — add type guard for `raw as unknown` access.)

### §14.4 — TYPES
(Import from shared types. Extend BaseContext. Never redefine shared enums.)

### §14.5 — HOOKS
(Shared hooks: useMCPQuery, useBreakpoint, useReducedMotion, etc.
Feature-local hooks allowed for domain-specific logic.)

### §14.6 — COMMUNICATION ARCHITECTURE (CANONICAL)

```
P1: Feature Data Queries → useMCPQuery → callMCPTool → routeMCPCall → Backend ✅
P2: Autonomous Execution → useAutonomousAdvisor → callMCPTool → Backend ✅
P3: Advisor Evaluation → useAdvisorEngine → AdvisorEngine → rules ✅
P4: Cross-Domain Signals → Rule emits → SignalBus → Target domain ✅

DATA FETCHING:
  PATTERN 1: useMCPQuery (queries)
  PATTERN 2: useMCPMutation (writes)
  PATTERN 3: callMCPTool (imperative)

NEVER: fetch(), axios, custom hooks without useMCPQuery
```

---

## §15 — AI/ML INTEGRATION STRATEGY

### 4 Layers of Visible Intelligence
LAYER 1: AMBIENT — Status auras, pulse, breathing
LAYER 2: REACTIVE — AdvisorBanner, predictions, alerts
LAYER 3: INTERACTIVE — CommandPalette, Chat, accept/reject
LAYER 4: TRANSPARENT — Reasoning chain, confidence, "why?"

### Reusable AI/ML UX Patterns

```
Pattern                    Component/Location              Status
─────────────────────────────────────────────────────────────────
Advisor Banner             shared/components/AdvisorBanner ✅ Exists (unified)
Confidence Gauge           ScoreGauge                      ✅ Exists (needs audit)
Prediction Visualization   TrendIcon + Chart               ✅ Exists
AI Command Interface       CommandPalette                  ✅ Exists
AI Chat                    AIChatWidget                    ✅ Exists
AI Decision Panel          AIDecisionPanel                 ✅ Exists
NL Rule Author             NLRuleAuthor                    ✅ Exists
Scenario Builder           ScenarioBuilder                 ✅ Exists
Simulation Results         TwinResults                     ✅ Exists
Plan Execution             PlanExecutionDashboard          ✅ Exists
System Health              SystemHealthDashboard           ✅ Exists
Causal Chain               CausalChainViz                  ✅ Exists
Action Timeline            AdvisorReactionCard             ✅ Exists
```

---

## §16 — AUTOMATION MAPPING [NEW in v6.1]

### Check → Script Mapping (111/180 checks automatable = 62%)

```
SCRIPT                          CHECKS AUTOMATED    STATUS
──────────────────────────────  ──────────────────  ──────────
architecture-guardian.ts        ~45 (A,B,C,F,H,I)   ✅ EXISTS (expand)
validate-shared-imports.ts      ~18 (J,I)           ✅ EXISTS (expand)
css-audit.ts                    ~35 (B subset)      ❌ TO CREATE
component-audit.ts              ~14 (C subset)      ❌ TO CREATE
feature-integration-audit.ts    ~16 (D,E,F,G,H)     ❌ TO CREATE
pre-commit-pipeline.ts          Orchestrator         ❌ TO CREATE

AUTOMATED: 111 checks (62%)
MANUAL:    69 checks (38%) — design judgment only
```

### CHECKLIST GRAND TOTAL (CORRECTED MATH)

```
╔══════════════════════════════════════════════════════════════════════╗
║  GRAND TOTAL — EXPLICIT MATH                                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Checklist A (TypeScript):            18                            ║
║  Checklist B (CSS 13 Dimensions):     80                            ║
║  Checklist C (Component):             22                            ║
║  Checklist D (Intelligence):          8  (when applicable)          ║
║  Checklist E (Feature Migration):     7  (FASE 2+)                 ║
║  Checklist F (Integration):           10 (FASE 2+)                 ║
║  Checklist G (AI/ML):                 8  (intelligence)             ║
║  Checklist H (Shared Architecture):   7  (shared/ changes)          ║
║  Checklist I (Mandatory Imports):     10 (EVERY file)               ║
║  Checklist J (Shared Verification):   10 (EVERY file)               ║
║                                                                      ║
║  TOTAL ALL CHECKS: 180                                              ║
║                                                                      ║
║  APPLICABLE COMBINATIONS:                                           ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Type                  Checklists                   Total   │     ║
║  │ ────────────────────  ──────────────────────────   ──────  │     ║
║  │ UI Component          A+B+C+I+J                   = 140   │     ║
║  │ UI + Intelligence     A+B+C+D+I+J                 = 148   │     ║
║  │ Feature Component     A+B+C+E+F+I+J               = 157   │     ║
║  │ Feature + Intel       A+B+C+D+E+F+G+I+J           = 173   │     ║
║  │ Shared/ Changes       A+B+C+H+I+J                 = 147   │     ║
║  │ MAX (all applicable)  A+B+C+D+E+F+G+H+I+J         = 180   │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  TOLERANCE: ZERO                                                    ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---
END OF MASTER_CHECKLIST.md v6.1
```

---

**Los 3 masters v2.0/v6.1/v6.1 están depurados y listos.** Todos los fixes aplicados. §14 en CHECKPOINT marca exactamente dónde estamos y qué archivos pedirte para continuar.

**¿Procedemos con los archivos pendientes de auditoría (§13)?**