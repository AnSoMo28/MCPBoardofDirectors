## 1/3 — MASTER_BASE.md v2.1

```markdown
# MASTER_BASE.md — Session Startup & Work Protocol
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 2.1 · Date: 2026-08-12
### Supersedes: v2.0 · Consistent-with: MASTER_CHECKPOINT v6.2 · MASTER_CHECKLIST v6.2

---

## §0 SENIOR EXPERT IDENTITY & AUTHORITY

╔══════════════════════════════════════════════════════════════════════╗
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
║  AUTHORITY: full liberty to question · propose before implement ·    ║
║  justify with evidence · zero tolerance for "good enough"            ║
║                                                                      ║
║  ABSOLUTE RULE: NEVER use a shared/ component, hook, or utility      ║
║  without having READ its actual implementation. Assume nothing.      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### §0.1 5-Tier Self-Questioning Protocol

```
TIER 1 — Technical Excellence
  □ Every type correct? No `any`, no unsafe assertions?
  □ Every import verified against a file I've READ (not assumed)?
  □ Every CSS property specific (never `transition: all`)?
  □ Every token reconciled against canonical source [CHECKPOINT §1.2]?
  □ Would `tsc --noEmit` pass?
  □ Does this import from shared/ where a shared primitive exists?
  □ IS EVERY SHARED IMPORT BACKED BY A FILE I'VE ACTUALLY READ?
  □ Is this component unique or does it duplicate a shared one?
  □ Is the bundle impact minimal (no unnecessary dependencies)?
  □ Is the CSS architecture scalable to 23 features + 800+ files?

TIER 2 — Design Intelligence
  □ Does this SOLVE the right problem?
  □ Would the user know what to DO after seeing this?
  □ Is the most important information FIRST?
  □ Is every spacing value INTENTIONAL? [CHECKPOINT §1.3 gap tokens]
  □ Does every color serve a SEMANTIC purpose?
  □ Is typography hierarchy CLEAR in 3 seconds?
  □ Does it feel PREMIUM, not "good enough"?

TIER 3 — 2027 Disruption
  □ PREDICTIONS, not just past description?
  □ STORY, not just numbers?
  □ Shows WHERE things are going?
  □ Every insight has a CTA? (CHECKLIST D-01)
  □ Communicates AI reasoning, not just output?
  □ Can the user understand WHY the system recommended this?
  □ Would this make a competitor's UI feel obsolete?

TIER 4 — CSS Production Grade (13 Dimensions)
  □ ALL 13 dimensions covered? (CHECKLIST §2)
  □ At least ONE signature visual element? (Rule 6)
  □ Stagger cascade flows top→bottom?
  □ Light mode equally polished?
  □ Reduced motion is a DESIGN DECISION?
  □ Would this print cleanly?

TIER 5 — Ecosystem Coherence
  □ Same tokens as globals.css implementation of [CHECKPOINT §1.2]?
  □ Same BEM namespace conventions [CHECKPOINT §1.4]?
  □ Imports from SAME shared primitives?
  □ Import graph acyclic? (CHECKLIST H-06)
  □ Uses unified AdvisorBanner (not feature-specific)? (F-04)
  □ Communicates with backend via useMCPQuery or callMCPTool? (§14.6)
  □ HAVE I READ EVERY SHARED FILE I'M IMPORTING?
  □ Would a new developer understand this in 6 months?

REFERENCE FORMAT (mandatory, this document included):
  Every cross-document reference is written as [ARCHIVO] §[sección]
  (e.g. [CHECKPOINT §1.2]). Bare "§1.2" is FORBIDDEN — ambiguity
  between BASE §1.2 and CHECKPOINT §1.2 caused finding AC-B02.
```

### §0.2 Scoring Methodology (single formula — AC-B06 / AC-K06)

```
SCORE SCALE: 0.0 – 10.0
PASS THRESHOLD: ≥ 9.3

CALCULATION (per file):
  Step 1: Run all applicable checklists (A–J) — see §4.1 for applicability
  Step 2: Each check = PASS(1) / FAIL(0) / N/A (excluded from denominator)
  Step 3: Raw = (passes / applicable) × 10        where applicable = 180 − N/A
  Step 4: Final = Raw − Σ penalties, once per DISTINCT failed rule per file:
    A-01 (any type)               → −0.5
    C-03 (framer-motion et al)    → −0.5
    J-10 (unaudited shared use)   → −0.7
    B-64 (missing light mode)     → −0.4
    B-21 (transition: all)        → −0.3
    B-70 (missing reduced motion) → −0.3
  Step 5: Round to 1 decimal, half-up. Floor at 0.0.

PROJECT SCORE (never hand-written — computed by tooling):
  Overall = (Σ passes over all files / Σ applicable over all files) × 10
            − Σ distinct rule penalties across project

EXAMPLE:
  180 checks → 2 N/A → 178 applicable → 175 pass / 3 fail
  Raw: 175/178 × 10 = 9.83
  Penalties: one A-01 (−0.5) = 9.33
  Final: 9.3 ✅

  "9.3" means: ZERO critical failures, <5% minor failures,
  all 13 CSS dimensions present, all shared/ imports verified.
```

---

## §1 GUÍA DETALLADA DE USO DE LOS ARCHIVOS

### §1.1 Cómo empezar cada sesión

```
PASO 1: Pegar los 3 archivos en orden:
  1. MASTER_BASE.md (identidad + protocolo)
  2. MASTER_CHECKPOINT.md (estado del proyecto)
  3. MASTER_CHECKLIST.md (gates de validación)

  ⚠️ SI UN ARCHIVO NO CABE EN 1 MENSAJE:
     Partirlo en 2-3 bloques. Confirmar parte por parte
     ("Parte N procesada"). El AI NUNCA procede hasta absorción completa.

PASO 2: Decir al AI:
  "Revisá los 3 archivos master. Confirmá comprensión.
   Estamos en FASE [X], archivo: [nombre]. Seguí el protocolo."

PASO 3: El AI debe:
  a) Confirmar que absorbió los 3 archivos
  b) Repetir el estado actual (FASE, scores, pendientes)
  c) Listar shared/ pendientes de audit si aplica
  d) Decir qué va a hacer a continuación
  e) Esperar el archivo a auditar/escribir
```

### §1.2 Cómo usar cada master

```
MASTER_BASE.md       Identity + Protocol + Rules   → Siempre activo
MASTER_CHECKPOINT.md Project State + Plan          → Antes de cada rewrite
MASTER_CHECKLIST.md  Gates + Templates + Automation → En cada audit/rewrite

ACTUALIZAR:
  BASE       → solo cuando cambian reglas o procesos
  CHECKPOINT → al completar cada archivo/FASE
  CHECKLIST  → cuando se agregan checks o scripts
```

### §1.3 Ownership de contenido (anti-duplicación)

```
Tema                          FUENTE CANÓNICA       Otros referencian
────────────────────────────  ────────────────────  ─────────────────
Identity + Protocol           BASE §0, §1, §4, §5   "See BASE §X"
Rules (Golden + Absolute)     BASE §8               "See BASE §8"
Pilares                       BASE §2               "See BASE §2"
Project Structure             BASE §6               "See BASE §6"
Communication Patterns        CHECKLIST §14.6       "See CHECKLIST §14.6"
Checklists A-J                CHECKLIST §1-§10      "See CHECKLIST §X"
Anti-Patterns                 CHECKLIST §11         "See CHECKLIST §11"
Templates (CSS + TSX)         CHECKLIST §13         "See CHECKLIST §13"
Automation Mapping            CHECKLIST §16         "See CHECKLIST §16"
Token Values (canonical)      CHECKPOINT §1.2       "See CHECKPOINT §1.2"
BEM Registry                  CHECKPOINT §1.4       "See CHECKPOINT §1.4"
Project State + Scores        CHECKPOINT §3-§6      "See CHECKPOINT §X"
Breaking Changes              CHECKPOINT §7         "See CHECKPOINT §7"
Migration Order               CHECKPOINT §9         "See CHECKPOINT §9"
Audit Status                  CHECKPOINT §12        "See CHECKPOINT §12"
Current State + Asks          CHECKPOINT §14        "See CHECKPOINT §14"
Audit Ledgers (AC-*)          each master §ledger   — registra sus hallazgos

REGLA: Si un tema aparece en 2+ archivos, SOLO UNO es fuente.
Los demás dicen "See [archivo] §[sección]". NUNCA duplicar.
```

### §1.4 Workflow Diagram

```
WORKFLOW POR ARCHIVO
  1. RECIBIR archivo del usuario
  2. PHASE 0: Shared/ Dependency Check
     Listar imports de shared/ → cross-ref [CHECKPOINT §12]
     ¿Falta alguno? → STOP + pedir archivos
  3. PHASE 1: Inventory (2 min)
  4. PHASE 2: Cross-Reference (3 min) — cada import vs archivos LEÍDOS
  5. PHASE 3: Compliance Check (2 min) — Checklists A–J (180 checks)
  6. PHASE 4: Design Decision (2 min) — concepto + signature elements
  7. PHASE 5: REWRITE (10-20 min) — headers, § sections, CSS 13D
  8. PHASE 6: Self-Audit (2 min) — 5-Tier, ¿WWDC?
  9. OUTPUT: rewrite + SCORE (§0.2)
  10. ACTUALIZAR MASTER_CHECKPOINT.md (archivo ✅ + score)
```

---

## §2 LOS 11 PILARES DEL SISTEMA

### §2.1 Overview

```
GOVERNANCE   P9 Observability · P10 Guardian · P11 Checkpoint Protocol
RESILIENCE   P7 Error Architecture · P8 Performance
INTELLIGENCE P4 MCP Substrate · P5 State & Data · P6 AI-Native
FOUNDATION   P1 Architecture Graph · P2 Design System · P3 Type Contracts
```

### §2.2 Detalle por Pilar (contadores verificados contra árbol 2026-08-12 — AC-B07)

```
PILAR 1 — Architecture Intelligence Graph            Estado: ⚠️ PARCIAL
  Implementado: architecture.manifest.ts · tools/architecture-guardian.ts
                tools/validate-shared-imports.ts · scripts/verify-integration.ts
  Pendiente: reference map auto-gen · health scoring por módulo ·
             pre-commit hook · implementación automatizada de A–J [CHECKLIST §16]
             (detección de ciclos = CHECKLIST H-06, automatizable)

PILAR 2 — Perceptual Design System                   Estado: ✅ COMPLETO
  Implementado: src/styles/globals.css (tokens + glass + keyframes)
                Token reconciliation [CHECKPOINT §1.2] · BEM registry [CHECKPOINT §1.4]
                Domain Color Map [CHECKPOINT §1.5]
  Pendiente: theme switching dinámico (light mode existe, sin toggle) ·
             adaptive themes (AI-generated)

PILAR 3 — Type Contracts                             Estado: ⚠️ PARCIAL
  Implementado: shared/types/{ai-intelligence,domain-enums,permissions}.ts
                src/shared/features/__TEMPLATE__/types.ts (template — AC-B02)
                features/events/types.ts ✅ (primer feature)
  Pendiente: types.ts para los 22 features restantes ·
             mcp-contracts.ts · agent-contracts.ts · MCP response alignment

PILAR 4 — Intelligence Substrate (MCP)               Estado: ✅ COMPLETO
  Implementado: shared/lib/api.ts · shared/lib/mcp/mcp-router.ts ·
                shared/hooks/useMCPQuery.ts · shared/hooks/useAutonomousAdvisor.ts
  Pendiente: streaming · circuit breaker · semantic cache

PILAR 5 — State & Data Architecture                  Estado: ⚠️ PARCIAL
  Implementado: stores/{auth,chat,notifications,sidebar,theme}.store.ts ·
                useMCPQuery (server state) · useDataFreshness
  Pendiente: state machines formales · selectores unificados · AI state store

PILAR 6 — AI-Native Self-Modification                Estado: ✅ COMPLETO
  Implementado: shared/lib/advisor-engine/ (45 módulos: 11 rules/ + 34 core — AC-B03)
  Pendiente: 22 feature advisor hooks (useEventAdvisor done) ·
             adaptation surfaces · cross-domain signals por feature

PILAR 7 — Error Resilience                           Estado: ⚠️ PARCIAL
  Implementado: shared/components/error/{ErrorBoundary,NotFoundPage}.tsx
  Pendiente: multi-level boundaries · degraded mode UI ·
             feature fallbacks · agent error fallback

PILAR 8 — Performance                                Estado: ❌ PENDIENTE
  Pendiente: perf budgets · bundle analysis · Core Web Vitals (WCAG 2.2 floor —
             see [CHECKLIST §12]) · code splitting · lazy loading

PILAR 9 — Observability                              Estado: ❌ PENDIENTE
  Pendiente: telemetry service · agent monitoring · arch health dashboard ·
             user behavior tracking · alert system

PILAR 10 — Architecture Guardian                     Estado: ⚠️ PARCIAL
  Implementado: tools/architecture-guardian.ts · tools/validate-shared-imports.ts ·
                scripts/verify-integration.ts
  Pendiente: implementación automatizada A–J [CHECKLIST §16] ·
             pre-commit hook · CI/CD integration · auto-fix mode

PILAR 11 — Checkpoint Protocol                       Estado: ✅ COMPLETO
  Implementado: este sistema de documentos (BASE/CHECKPOINT/CHECKLIST)
  Pendiente: automated checkpoint generation · checkpoint diff ·
             automated rollback triggers
```

### §2.3 Status Matrix (2026-08-12 — mathematically verified, AC-B01)

```
Pilar  Nombre                Capa           Estado
────── ────────────────────  ─────────────  ──────────
  1    Architecture Graph    Foundation     ⚠️ Parcial
  2    Design System         Foundation     ✅ Completo
  3    Type Contracts        Foundation     ⚠️ Parcial
  4    MCP Substrate         Intelligence   ✅ Completo
  5    State & Data          Intelligence   ⚠️ Parcial
  6    AI-Native             Intelligence   ✅ Completo
  7    Error Resilience      Resilience     ⚠️ Parcial
  8    Performance           Resilience     ❌ Pendiente
  9    Observability         Governance     ❌ Pendiente
 10    Guardian              Governance     ⚠️ Parcial
 11    Checkpoint Protocol   Governance     ✅ Completo

COMPLETOS: 4/11 (2, 4, 6, 11) · PARCIALES: 5/11 (1, 3, 5, 7, 10) ·
PENDIENTES: 2/11 (8, 9)
(v2.0 declaraba 5/3/3 con severidad inconsistente — corregido, AC-B01)
```

---

## §3 ARCHIVOS PENDIENTES PARA COMPLETAR LOS 11 PILARES

```
PILAR 1   tools/generate-reference-map.ts · tools/health-scoring.ts
          (detección de ciclos: dentro del guardian = CHECKLIST H-06)
PILAR 3   features/*/types.ts (22) · shared/types/mcp-contracts.ts ·
          shared/types/agent-contracts.ts
PILAR 5   stores/ai-state.store.ts · shared/lib/state-machines/ ·
          shared/hooks/useUnifiedState.ts
PILAR 7   shared/resilience/{error-boundaries,fallbacks,recovery,index}
PILAR 8   shared/observability/performance.ts · tools/analyze-bundle.ts ·
          useWebVitals (extend) · vite.config.ts code splitting · .perf-budget.json
PILAR 9   shared/observability/{telemetry,agent-monitor,arch-health,index}
PILAR 10  automatización A–J según [CHECKLIST §16] · pre-commit-pipeline

RESUMEN: ~28 archivos/módulos nuevos
CRÍTICOS: Pilares 8 y 9 (Performance + Observability)
```

---

## §4 AUDIT PROTOCOL (7 Phases)

### §4.1 Per-File Audit Protocol

```
PHASE 0: SHARED/ DEPENDENCY CHECK
  1. List ALL shared/ imports in the file
  2. For EACH: have I READ that file's implementation?
  3. Cross-ref against [CHECKPOINT §12] AUDITED FILES
  4. If NO → STOP. Request the file. Read it. Audit it. Only THEN Phase 1.

PHASE 1: INVENTORY (2 min)
  1. Read the ENTIRE file without writing anything
  2-8. Count: Tailwind · inline colors · generic classes · JS animation libs ·
       hardcoded rgba/hex · transition-all · inline font declarations
  9. List every import — verified vs unverified
  10. Identify ghost types (don't exist)
  11. Map old class names to BEM namespace [CHECKPOINT §1.4]

PHASE 2: CROSS-REFERENCE (3 min)
  1. Each import vs verified files in context
  2. Unverified → REQUEST file
  3. Field access vs type definitions
  4. Tokens vs [CHECKPOINT §1.2] · keyframes vs globals.css · colors vs palette
  5. No divergence checkpoint ↔ globals.css

PHASE 3: COMPLIANCE CHECK (2 min)
  Run ALL applicable checklists [MASTER_CHECKLIST.md]:
    A (18) + B (80, if CSS) + C (22) + D (8, if intelligence)
    + E (7, if feature) + F (10, if feature) + G (8, if AI)
    + H (7, if touches shared/)                ← AC-B04: H was omitted in v2.0
    + I (10, always) + J (10, always)          = 180 max
  Mark each: applicable / N/A / pass / fail

PHASE 4: DESIGN DECISION (2 min)
  1. Solves the right problem? (T2)  2. CONCEPT embodied
  3. SIGNATURE VISUAL ELEMENTS (1-3/file)  4. What the user REMEMBERS
  5. Connection to intelligence layer  6. Dark AND light mode

PHASE 5: REWRITE (10-20 min)
  1. PRE-WRITE VERIFICATION header
  2. ANTI-PATTERNS REMOVED header
  3. §1 Types (readonly, discriminated unions) · §2 Constants · §3+ logic
     (readonly props · useMemo derived · useCallback handlers ·
      data-testid on root · aria-* on interactive · aria-hidden decorative ·
      CSS-only animations)
  4. CSS with ALL 13 dimensions in order:
     §0 Root · §1 Pseudo-elements · §2-N Sections · §N+1 Signature ·
     §N+2 Keyframes (at end, namespaced) · §N+3 Light · §N+4 Reduced Motion ·
     §N+5 Responsive · §N+6 Print
  5. POST-WRITE verification table

PHASE 6: SELF-AUDIT (2 min)
  Re-read · 5-Tier Protocol (§0.1) · ¿WWDC? · every value justified · iterate
```

### §4.2 Integration Audit Protocol (Per Feature)

```
STEP 1 SHARED CONSUMPTION MAP   → Integration Score
STEP 2 ADVISOR INTEGRATION      → Advisor Score
STEP 3 MCP/AI INTEGRATION       → AI Score
STEP 4 TYPE ALIGNMENT           → Type Score
STEP 5 FEATURE MIGRATION PLAN   → REWRITE / MIGRATE / PROMOTE / ELIMINATE / REFACTOR
```

### §4.3 Scope Boundaries

```
I DO: rewrite shared/ TSX+CSS pairs · shared/ consumption audit ·
      token reconciliation · remove JS animation libs · Tailwind→BEM ·
      light/reduced-motion/responsive/print · co-located CSS ·
      AI/ML visibility audit · Integration Score · 2027 proposals ·
      automate checks [CHECKLIST §16]

I PROPOSE FIRST, THEN EXECUTE: shared/ reorganization ·
      AdvisorBanner unification · new shared hooks · innovation proposals

I DON'T: change @theme {} architecture · move shared/ files without
      approval · invent values without provenance (provenance = verifiable
      source doc OR explicit PENDING-RATIFICATION) · change backend contracts
```

---

## §5 REWRITE PROTOCOL (TSX + CSS)

### §5.1 TSX Rewrite Protocol

```
STEP 0: Shared/ Dependency Resolution
  1. Ask for the feature file · 2. Read ONCE · 3. Extract ALL shared/ imports
  4. Cross-ref [CHECKPOINT §12] · 5. All audited → Step 1. Else STOP:
     "Necesito estos shared/ antes de reescribir: [lista]. Pasamelos."

STEP 1: Audit — ALL applicable checklists:
  A(18) + B(80 if CSS) + C(22) + D(8 if intel) + E(7 if feature)
  + F(10 if feature) + G(8 if AI) + H(7 if shared/) + I(10) + J(10)

STEP 2: Request Co-located CSS (ComponentName.css). Never CSS inline in
  .tsx. Never Tailwind as primary. Missing → create from scratch.

STEP 3: Plan 2027 Innovations — shared/ re-use gaps · AI/ML gaps ·
  responsive gaps · a11y gaps · print needs

STEP 4: Write the Rewrite — EVERY .tsx MUST have:
  [x] Header: @level, @namespace, @keyframes, @depends
  [x] PRE-WRITE VERIFICATION block
  [x] §0 Imports (shared/ui, layout, hooks, lib, types, feature, icons, css)
  [x] §1 Constants · §2 Component (§2.1, §2.2…)
  [x] ANTI-PATTERNS REMOVED block · POST-WRITE VERIFICATION · SCORE (§0.2)

STEP 5: Self-Audit — imports match AUDITED API · props EXIST · hook returns
  destructure correctly · 0 Tailwind · 0 inline colors · 13 dimensions ·
  § markers · data-testid · aria-label · ¿WWDC?
```

### §5.2 CSS Rewrite Protocol

```
EVERY .css file MUST have:
  [x] Header: @namespace, @keyframes count, @signature
  [x] §0 Root + Variables · §1 Pseudo-elements · §2-N Sections
  [x] §N+1 Signature Element · §N+2 Keyframes (END, namespaced)
  [x] §N+3 Light Mode (.light) · §N+4 Reduced Motion · §N+5 Responsive (3 bp)
  [x] §N+6 Print · ALL 13 dimensions
  [x] var(--ease-apple) on transitions · -webkit-backdrop-filter paired
  [x] Tokenized colors only (structural rgba values per [CHECKLIST §2 allowlist])
  [x] BEM namespace of the domain (ev-*, fm-*, sp-*, …)
```

---

## §6 PROJECT STRUCTURE (verified against tree 2026-08-12)

```
frontend/src/
├── app/                App.tsx, providers.tsx, router.tsx, RoleRedirect.tsx
├── styles/             globals.css         ← CANONICAL (AC-B01/AC-M01)
├── features/           23 feature domains (~620+ files)
│   ├── events/ (FASE 2 in progress) … maintenance/ (cross-cutting)
├── shared/             ≈180 files
│   ├── components/     ≈94 entries (86 .tsx + barrel + 7 co-located hooks)
│   │   ├── AdvisorBanner.tsx (unified) · InsightCard.tsx
│   │   ├── ui/ (23 + barrel) · layout/ (20) · ai/ (11) · chat/ (1+1)
│   │   ├── ml/ (7 + 4 hooks) · auth/ (3) · error/ (2)
│   │   ├── export/ (16 + 2 hooks) · feedback/ (1)
│   ├── hooks/          31 (30 .ts + usePermissionContext.tsx)
│   │                   + components/chat/hooks/useAIChat.ts
│   ├── lib/            api.ts · mcp/ (3) · advisor-engine/ (45:
│   │                   rules/ 11 + core 34 + __tests__ 2) · utils · financial/ · ui/
│   ├── types/          3 · mocks/ 5 · services/ 1
│   └── features/__TEMPLATE__/types.ts      ← Pilar 3 template (AC-B02)
├── stores/             5 Zustand stores
└── main.tsx

backend/src/club_mcp/   ~123 files (NO SE TOCA)
frontend/tools/         architecture-guardian.ts · validate-shared-imports.ts
scripts/                setup.sh · verify-integration.ts

TOTAL: ~945 archivos · FRONTEND ~810 · BACKEND ~123 · CONFIG ~12
CONTADORES derivables del filesystem — tooling los recalcula al escanear
(los números escritos son baseline documental, no fuente operativa — AC-B07)
```

---

## §7 COMMUNICATION ARCHITECTURE

See [CHECKLIST §14.6] (CANONICAL SOURCE — do not duplicate).
```
P1 Feature Data → useMCPQuery → callMCPTool → routeMCPCall → Backend ✅
P2 Autonomous  → useAutonomousAdvisor → callMCPTool → Backend ✅
P3 Advisor     → useAdvisorEngine → AdvisorEngine → rules ✅
P4 Cross-Domain→ Rule emits → SignalBus → Target domain ✅
```

---

## §8 ABSOLUTE RULES

### §8.1 The 6 Golden Rules

```
RULE 1: ONE TOKEN TRUTH
  [CHECKPOINT §1.2] CANON is authority. globals.css (src/styles/globals.css)
  is its implementation. If CANON says --color-rose-400: #E85D6E and
  globals.css still shows #C46470 → drift → fix globals to CANON
  (v2.0 example cited pre-reconciliation values — aligned, AC-B05).

RULE 2: CSS CO-LOCATED, NO EXCEPTIONS
  Every .tsx has its .css next to it. No Tailwind primary. No inline colors.

RULE 3: BEM WITH DOMAIN PREFIX
  ui-* shared · ev-* events · .mt-* maintenance (ratified v6.2 — AC-M04)
  Full registry: [CHECKPOINT §1.4]. Never .card/.title/.container.

RULE 4: ANIMATION = CSS, NOT JS
  No framer-motion · react-spring · GSAP. CSS only.

RULE 5: SHARED/ IS MANDATORY
  Shared primitive exists → use it. Missing → propose adding it.

RULE 6: EVERY FILE HAS A SIGNATURE ELEMENT
  At least ONE unique visual element per component CSS.
```

### §8.2 Additional Rules

```
RULE 7: NEVER IMPORT UNAUDITED SHARED/ — READ first. "Assumed API" never OK.
RULE 8: BACKBONE TOOLS ARE LAW — 0 errors = commit approved; 1 = rejected.
RULE 9: TEMPLATE FOLLOWS TYPES — every feature types.ts follows
        src/shared/features/__TEMPLATE__/types.ts (8 sections, all readonly,
        config maps with var(--color-*)).
RULE 10: AUTOMATE BEFORE MANUALIZE — scriptable checks are scripted
         [CHECKLIST §16]. Manual = design judgment only.
```

### §8.3 Zero Tolerance (+ EXCEPTIONS REGISTER — AC-B05/AC-CL01)

```
ZERO TOLERANCE:
  • 0 `any` types
  • 0 framer-motion / react-spring / GSAP
  • 0 hardcoded SEMANTIC hex/rgba in CSS (structural rgba per
    [CHECKLIST §2 Allowlist]; globals.css exempt as token layer)
  • 0 Tailwind utilities as primary styling
  • 0 inline styles for colors
  • 0 default exports — EXCEPT entrypoints on the allowlist
    (src/main.tsx, src/app/App.tsx — recorded in tooling manifest)
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
  • 0 banned fonts (Inter, Roboto, Arial, Space Grotesk, system-ui)

EXCEPTIONS REGISTER (each exception is versioned, scoped and justified):
  E-1 default exports     → entrypoints list (above)
  E-2 structural colors   → [CHECKLIST §2] allowlist (glass borders, scrims,
                            scrollbar thumb, print-safe values)
  E-3 `as unknown`        → MCP boundary only + runtime type guard +
                            "// assertion justified: <why>" comment
  E-4 `!important`        → reduced-motion/print overrides only + justification
```

---

## §9 SESSION STARTUP

```
EN CADA NUEVA SESIÓN:
1. PEGAR los 3 masters (partir si no caben; confirmar por partes)
2. DECIR: "Revisá los 3 archivos master. Confirmá comprensión.
   Estamos en FASE [X], trabajando en [archivo]."
3. EL AI: absorber → repetir FASE/score/siguiente → listar shared/ pendientes
   → "Listo. Pasame el archivo a auditar/escribir."
4. PASAR el archivo · 5. EL AI SIGUE §4.1 → SCORE (§0.2) → actualizar CHECKPOINT
6. REPETIR por archivo hasta completar la FASE

⚠️ PARCIAL PASTE HANDLING: partir en 2-3 bloques · confirmar por parte ·
   nunca proceder antes de absorción completa · CHECKPOINT restaura contexto.

REGLAS DE SESIÓN:
   • Si el AI pide un shared/ file → dárselo ANTES de continuar
   • Si el AI dice "STOP: necesito X" → esperar y proporcionar
   • Score < 9.3 → archivo NO completo
   • Errores del guardian → FIX antes de continuar
   • PROHIBIDO escribir desde cero un archivo que existe en repo sin
     haberlo leído (ABSOLUTE RULE aplica también a los archivos de tooling)
```

### §9.1 Cross-Reference Map

```
Topic                        File           Section
───────────────────────────  ─────────────  ────────
Role + Authority             BASE           §0
5-Tier Protocol              BASE           §0.1
Scoring Methodology          BASE           §0.2
How to use files             BASE           §1
Ownership (anti-dup)         BASE           §1.3
11 Pillars                   BASE           §2
Pending files                BASE           §3
Audit protocol (7 phases)    BASE           §4
Rewrite protocol             BASE           §5
Project structure            BASE           §6
Rules + Zero Tolerance       BASE           §8
Session startup              BASE           §9
Deprecation protocol         BASE           §10
Audit Ledger BASE            BASE           §11
───────────────────────────  ─────────────  ────────
Brutal Diagnosis             CHECKPOINT     §0.1
Vision 2027                  CHECKPOINT     §0.2
Token + BEM + auras          CHECKPOINT     §1
Architecture (CSS layers)    CHECKPOINT     §2
Completed Work               CHECKPOINT     §3
Quality Scorecard            CHECKPOINT     §4
Execution Plan               CHECKPOINT     §5
Cumulative Metrics           CHECKPOINT     §6
Breaking Changes             CHECKPOINT     §7
Component Inventory          CHECKPOINT     §8
Feature Migration Order      CHECKPOINT     §9
Innovation Proposals         CHECKPOINT     §10
Appendices                   CHECKPOINT     §11
Parallel Audit Status        CHECKPOINT     §12
Files Pending Review         CHECKPOINT     §13
Current State + Asks         CHECKPOINT     §14
Audit Ledger CHECKPOINT      CHECKPOINT     §15
───────────────────────────  ─────────────  ────────
Checklist A-J                CHECKLIST      §1-§10
Anti-Patterns                CHECKLIST      §11
Level 6+ Standard            CHECKLIST      §12
CSS + TSX Templates          CHECKLIST      §13
Shared/ Mandatory Imports    CHECKLIST      §14
AI/ML Strategy               CHECKLIST      §15
Automation Mapping           CHECKLIST      §16
Audit Ledger CHECKLIST       CHECKLIST      §17
```

---

## §10 DEPRECATION PROTOCOL

```
DEPRECATED SOURCES — do NOT use as reference:
  ❌ Chat History Msg 2-3 (7 Pilares + 11 Pilares v2.0)
     REASON: arquitectura divergente (domains/ vs features/, paleta violet/teal
     vs rose/gold/silver, stack @preact/signals+XState vs Zustand, código corrupto)

  VALID CONCEPTS EXTRACTED (adapted to real project):
     ✅ Path aliases (@shared/*, @features/*)   ✅ Architecture Manifest
     ✅ Architecture Guardian                   ✅ Performance Budgets (P8)
     ✅ Circuit Breaker for MCP (P4)            ✅ 3 parallel tracks
     ✅ Predictive Ambient Canvas (adapted)

VERSION GENEALOGY:
  BASE v1.0 → v2.0 (consolidación) → v2.1 (this: audit-clean)
  CHECKPOINT v3.0 → v6.0 → v6.1 → v6.2 (this: audit-clean)
  CHECKLIST v3.0 → v6.0 → v6.1 → v6.2 (this: audit-clean)
```

---

## §11 AUDIT LEDGER (v2.0 → v2.1)

```
AC-B01  §2.3 matrix: 5/3/3 → 4/5/2 + severidad unificada (⚠️ = parcial)
AC-B02  __TEMPLATE__ → src/shared/features/__TEMPLATE__/types.ts (ruta real)
AC-B03  advisor-engine "12 rules" → 11 rules + 34 core = 45 (árbol verificado)
AC-B04  §4.1 Phase 3 + §5.1 STEP 1: añadido H (7) — 180 checks cierra
AC-B05  §8.3: Zero Tolerance + EXCEPTIONS REGISTER (default exports,
        structural colors, as unknown, !important) — co-ejecutable con CHECKLIST
AC-B06  §0.2: penalizaciones mapeadas a IDs canónicos A-01/C-03/J-10/B-64/
        B-21/B-70; fórmula única; project score = computed (nunca manual)
AC-B07  Contadores del §6 marcados como baseline documental; derivables del FS
AC-B08  Todas las refs normalizadas a [ARCHIVO] §X (regla en §0.1)
AC-B09  Rule 1 example realineado al CANON post-reconciliación
AC-B10  §9: prohibición explícita de reescribir desde cero archivos existentes
```

END OF MASTER_BASE.md v2.1
```

---

## 2/3 — MASTER_CHECKPOINT.md v6.2

```markdown
# MASTER_CHECKPOINT.md — Project State & Execution Plan
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 6.2 · Date: 2026-08-12
### Supersedes: v6.1 · Consistent-with: MASTER_BASE v2.1 · MASTER_CHECKLIST v6.2

╔══════════════════════════════════════════════════════════════════════╗
║  MASTER CHECKPOINT v6.2 — DEFINITIVE CONSOLIDATED REFERENCE         ║
║                                                                      ║
║  Status: FASE 0 ✅ · FASE 1 UI ✅ · FASE 1.5 Shared/ Rewrite ✅    ║
║          · FASE 2 Events (IN PROGRESS)                              ║
║                                                                      ║
║  UI Components migrated:          23 / 23 (shared/components/ui/)   ║
║  Shared/ files rewritten:          7 / 7 (core infrastructure)       ║
║  Events deliverable units done:    9 / 25 (36% — unit = tsx+css     ║
║                                     pair or single ts module)        ║
║  Events pages completed:           0 / 3 (EventCalendar PENDING     ║
║                                     REVIEW — AC-K m1)                ║
║  Shared/ audit for feature use:    0 / 7 (PENDING — §13)            ║
║  Overall UI score:                 4.2 → 9.3 (+121%)                ║
║  Overall Shared/ score:            7.97 → 9.31 (+17%)               ║
║  Project score (completed, weighted by files): 9.3                   ║
║  Total project files:              ~945 (FE ~810 + BE ~123)         ║
║  CRITICAL ISSUE: 7 shared/ used without audit · BC-02 BLOCKING      ║
║                                                                      ║
║  THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR PROJECT STATE.     ║
║  Rules: [BASE §8] · Checks: [MASTER_CHECKLIST] · Scores: §0.2 [BASE]║
║  EVERY FILE THAT EXITS THIS PROCESS PASSES THIS CHECKPOINT.         ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## §0.1 — THE BRUTAL DIAGNOSIS (30 problems · full traceability — AC-K02)

```
STATUS LEGEND: RESOLVED · RESOLVED-GATE (fixed, carries a verification or
rollout gate) · OPEN

#   Problem                                   Status          Evidence/Gate
──  ────────────────────────────────────────  ──────────────  ─────────────
 1  Token divergence (8+ tokens)              RESOLVED-GATE   §1.2 CANON + FASE 0
                                                              gate: globals scan (G-01)
 2  Generic keyframes (107+)                  RESOLVED        §1.6 + B-77/B-79
 3  Missing -webkit-backdrop-filter           RESOLVED        policy + B-01
 4  Material easing instead of Apple          RESOLVED        §1.3 + B-15
 5  Mixed styling CSS/Tailwind/inline         RESOLVED-GATE   Rule 2 · per-wave C-01/C-04
 6  framer-motion in shared (30KB+)           RESOLVED-GATE   Rule 4 · per-wave C-03
 7  Zero responsive breakpoints               RESOLVED-GATE   B-56/B-57 per-wave
 8  Scrollbar 6px vs 3px                      RESOLVED        B-54 spec
 9  "OK (no mock)" silent success             RESOLVED        api.ts FASE 1.5
10  `null as T` casts in mcp-router           RESOLVED        mcp-router FASE 1.5
11  Domain hook useExecutiveSummary in shared OPEN-VERIFY     aún en shared/hooks/
                                                              (árbol 2026-08-12):
                                                              reclassificar o mover
12  HealthFactorStatus values in Spanish      OPEN            BC-01 (§7)
13  Side effect inside useMemo (engine.ts)    RESOLVED        engine.ts FASE 1.5
14  ~120 flat exports in barrel                RESOLVED        index.ts FASE 1.5
15  8 Spanish hardcoded toast messages        RESOLVED        rewrites FASE 1.5
16  setPlans updater duplicated ×6             RESOLVED        rewrites FASE 1.5
17  Manual JWT decode (no base64url)          RESOLVED        api.ts FASE 1.5
18  Concurrent token refresh race             RESOLVED        api.ts FASE 1.5
19  showToast in infrastructure (api.ts)      OPEN            BC-02 🔴 BLOCKING:
                                                              api.ts limpio, falta
                                                              QueryClient onError
20  13 duplicate AdvisorBanners               OPEN            unificado existe (§8);
                                                              dedupe = Appendix B / FASE 2+
21  ~7 test files / 400+ source files         OPEN            FASE 25 (TRACK)
22  Deprecated files in repo (11)             OPEN            FASE 22 · lista =
                                                              PENDING-RATIFICATION (§11J)
23  Shared imported without reading           OPEN            7 files §13 · Appendix K
24  AdvisorCommand.action field missed        RESOLVED        Appendix L
25  BaseContext imported from wrong module    RESOLVED        Appendix M
26  "Checkpoint v7" label in token table      RESOLVED        §1.2 (v6.1)
27  Triple discrepancy of shared/ lists       RESOLVED        §5 = §12 = §13 (v6.1)
28  Checklist B missing detail in v6.0        RESOLVED        CHECKLIST v6.1
29  Golden Rule 5 drifted v3.0→v6.0           RESOLVED        [BASE §8.1] canonical
30  Score math inconsistent across versions   OPEN            formula versionada ahora en
                                                              [BASE §0.2]; tooling la
                                                              computa (nunca manual)

TALLY (evidence-based — v6.1 claim "25 resueltos / 5 pendientes" corrected):
  RESOLVED      18 · RESOLVED-GATE  4 · OPEN  8
  (los 8 OPEN = 11, 12, 19, 20, 21, 22, 23, 30)
```

---

## §0.2 — VISION 2027

```
1. THE UI IS AN AI ORCHESTRATOR   5. CROSS-DOMAIN INTELLIGENCE
2. PREDICTION IS THE DEFAULT      6. AMBIENT INTELLIGENCE
3. EVERY INSIGHT IS ACTIONABLE    7. NATURAL LANGUAGE INTERACTION
4. THE SYSTEM LEARNS
```

---

## §1 — DESIGN SYSTEM REFERENCE

### §1.1 Token Authority Hierarchy

```
1. [CHECKPOINT §1.2] CANON column is AUTHORITY (canonical hex values)
2. src/styles/globals.css is the IMPLEMENTATION of that authority
3. Component CSS CONSUMES tokens — never redefines them
4. If a value isn't in globals.css, it doesn't exist
```

### §1.2 Token Reconciliation Table (state declared — AC-K01)

```
⚠️  COLUMN STATE DECLARATION (resolves finding AC-K01):
    "globals.css (pre-v2.0)" = HISTORICAL state that motivated FASE 0.
    FASE 0 rewrote globals.css v2.0 (accepted 9.7 avg) — application of
    CANON values is ASSUMED-DONE but UNVERIFIED until a diff scan runs
    (verification gate = automated token scan; expected: 0 drift).
    NEVER copy values from the historical column.

Token              Checkpoint (CANON)   globals.css (pre-v2.0)  Decision
─── ────────────── ───────────────────  ──────────────────────  ──────────
--color-silver-200 #E8EAF0              #D8DCE4                 Checkpoint ✓
--color-silver-600 #4A5568              #3D4755                 Checkpoint ✓
--color-silver-700 #3A4050              #374151                 Checkpoint ✓
--color-rose-400   #E85D6E              #C46470                 Checkpoint ✓
--color-rose-500   #D64457              #e45a64                 Checkpoint ✓
--color-surface-0  #0C1018              #0B0F18                 Checkpoint ✓
--color-surface-1  rgba(12,16,24,.75)   #111827                 Checkpoint ✓ ⚠ SEM
--color-surface-2  rgba(12,16,24,.6)    #1a2035                 Checkpoint ✓ ⚠ SEM
--font-body        (not defined)        "Source Serif 4"        Eliminate ✗

⚠ SEM = semantic change (opaque → translucent), not just hex swap.
  Verify contrast + light-mode composition after application.
```

### §1.3 Tokens Added to globals.css (FASE 0)

```
Colors:   --color-gold-200: #E8D5A0 · --color-gold-700: #8B692A
Shadows:  --shadow-card: 0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03) inset
          --shadow-float: 0 12px 40px rgba(0,0,0,0.3)
          --shadow-hero: 0 20px 60px rgba(0,0,0,0.4)
          --shadow-overlay: 0 24px 80px rgba(0,0,0,0.5)
Easing:   --ease-apple: cubic-bezier(0.32, 0.72, 0, 1)
          --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
          --ease-micro: ease-out
Spacing:  --gap-panel: 14px · --gap-card: 10px · --gap-metric: 6px
          --gap-timeline: 5px · --gap-action: 5px

PENDING-RATIFICATION (referenced by checks/templates, values NOT in this
checkpoint — nunca inventar valores, [BASE §4.3]): --font-mono, --font-ui,
--font-display, --radius-md, --color-gold-400, --color-silver-100/300/400/500,
--aura-* (14 vars). Fuente a verificar: src/styles/globals.css (REQUEST 2).
```

### §1.4 BEM Namespace Registry (maintenance ratified — AC-K M4)

```
Prefix  Domain               Prefix  Domain             Prefix  Domain
──────  ──────────────────   ──────  ────────────────   ──────  ─────────────
.ui-    shared/components/ui .ev-    events             .mc-    mi-club
.glass- globals effects      .fm-    families           .op-    operations
.lunar- globals effects      .sp-    sports             .rc-    recommendations
.frost- globals effects      .cu-    cultural           .rp-    reports
.glow-  globals effects      .en-    engagement         .ai-    ai-system
.ab-    advisor banner       .fi-    finance            .st-    settings
                            .gu-    guests             .au-    auth
                            .me-    members            .ap-    approvals
                            .cm-    communications     .do-    documents
                            .we-    wellness           .mt-    maintenance ← RATIFIED v6.2
                            .fa-    facilities         .db-    dashboard
                            .ag-    age-group
```

### §1.5 Domain Color Map (AI auras) — scope + reuse rationale (AC-K M3)

```
SCOPE: intelligent domains only (14 of 23 features). Non-aura domains
(dashboard, mi-club, operations, reports, settings, auth, approvals,
documents, maintenance) are non-intelligent by design — declared here so
the gap is a decision, not an omission.

Domain           Token               Var                Domain          Token            Var
──────           ─────               ───                ──────          ─────            ───
global           --color-gold-400    --aura-global      guests          --color-cyan-400 --aura-guests
events           --color-emerald-400 --aura-events      members         --color-indigo-400 --aura-members
families         --color-violet-400  --aura-families    communications  --color-pink-400 --aura-comms
sports           --color-sky-400     --aura-sports      wellness        --color-teal-400 --aura-wellness
cultural         --color-amber-400   --aura-cultural    facilities      --color-orange-400 --aura-facilities
engagement       --color-rose-400    --aura-engagement  age-group       --color-lime-400 --aura-age-group
finance          --color-emerald-400 --aura-finance     recommendations --color-violet-400 --aura-recs

TOKEN REUSE (emerald ×2, violet ×2): PERMITTED — cada dominio tiene su
propia variable --aura-<domain> (afinable independientemente) y los dominios
co-ocurren en contextos separados. Si dos dominios con token compartido
llegan a co-ocurrir en la misma vista, se exige override por dominio.
PRECEDENCIA DE AURA: [CHECKLIST §4] D-08 (severity→placement) >
este mapa (ambient de dominio) — ver [CHECKLIST §15].
```

### §1.6 Keyframe Naming Convention

```
Pattern: <prefix>-<DescriptiveName> · NEVER fadeIn/slideUp/pulse
Verified: ui-btn-spin, ui-modal-overlay-in, ui-skeleton-shimmer,
ui-reaction-orb-breathe, ui-cmd-spin, ui-approval-item-in
Events (planned): ev-calendarReveal, ev-heroBreathing, ev-rsvpCascade
Existing feature keyframes (do not rename): fm-cardRevealIn, fm-memRevealIn
```

---

## §2 — ARCHITECTURE

### §2.1 CSS Layer Architecture

```
Layer 0 DESIGN TOKENS      → src/styles/globals.css (@theme + :root)
Layer 1 SHARED PRIMITIVES  → globals.css §4-7
Layer 2 UI COMPONENTS      → shared/components/ui/<Name>.css
Layer 3 FEATURE COMPONENTS → features/<name>/components/<Name>.css
Layer 4 FEATURE ATOMS      → features/<name>/<name>-atoms.css (optional)
Layer 5 GLOBAL OVERRIDES   → globals.css §9-10
```

### §2.2 Shared/ Architecture (counts = tree baseline 2026-08-12 — AC-K M1)

```
src/shared/
├── components/ ≈94 entries (86 .tsx + ui barrel + 7 co-located hooks)
│   AdvisorBanner (unified) + InsightCard · ui/ 23+barrel · layout/ 20 ·
│   ai/ 11 · chat/ 1+1 · ml/ 7+4 · auth/ 3 · error/ 2 · export/ 16+2 ·
│   feedback/ 1
├── hooks/ 31 (incl. usePermissionContext.tsx) + chat/hooks/useAIChat.ts
├── lib/ api.ts · mcp/ 3 · advisor-engine/ 45 (rules/ 11 + core 34 + tests 2)
├── types/ 3 · mocks/ 5 · services/ 1
└── features/__TEMPLATE__/ types template

⚠️ v6.1 baselines (82 components · 30 hooks · 12 rules · 10 ml · 15 export)
   estaban desalineados del árbol — corregidos aquí; el tooling recalcula
   del filesystem, estos números son documentales (AC-K M1).
DEPRECATED (11 files): TO BE ELIMINATED — lista PENDING-RATIFICATION (§11J)
```

### §2.3 Placement Rules (Golden)

```
Style 2+ features → globals.css (L1)     Component 2+ features → shared/components/ (L2)
Style 1 feature   → co-located CSS (L3)  Component 1 feature   → feature directory
Hook 2+ features  → shared/hooks/        Hook 1 feature        → feature's hooks/
```

---

## §3 — COMPLETED WORK

### §3.1 FASE 0: globals.css v2.0 ✅ (8/8) · score 9.7 avg

### §3.2 FASE 1: UI Components (23/23) ✅
```
Core(1-6): 4.7→9.3 (+97.9%) · Form&Data(7-12): 4.4→9.3 (+111.4%)
Glass(13-15): 4.2→9.3 (+121.4%) · IntelExt(16-19): 4.1→9.3 (+126.8%)
Pre-batch(AdvisorActionModal): 5.7→9.2 (+61.4%) · Intel(20-22): 3.7→9.4 (+154.1%)
OVERALL: 4.2→9.3 (+121.4%) — convención de redondeo: 1 decimal, half-up (AC-K m4)
```

### §3.3 FASE 1.5: Shared/ Infrastructure (7/7) ✅
```
  #  File                        Before  After   1 api.ts                  6.6   9.3   2 mcp/mcp-router.ts       8.6   9.3
  3 hooks/useMCPQuery.ts        7.5   9.3   4 advisor-engine/types.ts   8.6   9.3
  5 advisor-engine/index.ts     7.3   9.3   6 advisor-engine/engine.ts  9.0   9.4
  7 hooks/useAutonomousAdvisor  8.2   9.3
AVERAGE: 7.97 → 9.31 (+17%) · ALL ≥ 9.3 ✅
```

### §3.4 FASE 2: Events (IN PROGRESS — 9/25 units = 36%)
```
SHARED PARALLEL: rules/events.ts ✅ 9.4 · signal-bus.ts ✅ 9.4
COMPLETED (9 units): types ✅9.3 · config ✅9.3 · index ✅9.4 ·
  useEventAdvisor ✅9.4 · useEventData ✅9.4 · useEventCalendar ✅9.3 ·
  useEventDetail ✅9.4 · useEventForm ✅9.4 · lib/calendarSignals ✅9.4
PENDING:
  EventCalendar.tsx+css   PENDING REVIEW (bloqueado por 7 shared/ §13 + BC-02)
  EventDetail, EventForm  NOT STARTED
  Components (13): CalendarGrid, EventHero, EventAdvisorBanner, EventFormSteps,
    EventListView, EventLivePreview, ChronoCompass, EventIntelligencePanel,
    ProgramTimeline, PulseRing, QuickAddPanel, RsvpBoard, VendorGrid — NOT STARTED
FEATURE AVERAGE (completed): 9.37 · ALL ≥ 9.3 ✅
```

---

## §4 — QUALITY SCORECARD

```
globals.css v2.0             ████████████████████  9.7/10
UI Components (23)           ████████████████████  9.3/10
Shared/ Infrastructure (7)   ████████████████████  9.3/10
Events (9 units completed)   ████████████████████  9.37/10
EventCalendar (pending)      ██████████░░░░░░░░░░  5.0/10 ⚠️
EventDetail/Form/13 comps    ░░░░░░░░░░░░░░░░░░░░   N/A
Shared/ 7 to audit           ░░░░░░░░░░░░░░░░░░░░   ⚠️ PENDING

PROJECT SCORE (formula [BASE §0.2], weighted by files):
  completed  = (1×9.7 + 46×9.3 + 7×9.31 + 11×9.37) / 65 = 9.3
  ⚠ v6.1 publicaba "9.35" y "7.8" sin método — reemplazados por valores
  computados; el score ampliado se calcula al gate time (AC-K M6 / #30).
RISK FLAG ACTIVO: BC-02 bloqueante degrada confidence del gate aunque el
score de archivos completados se mantenga ≥9.3.
```

---

## §5 — EXECUTION PLAN

```
STEP 1  AUDIT 7 shared/ (§13): ScoreGauge, FreshnessBadge, StaleDataBanner,
        Skeleton, useBreakpoint, PageContainer, PermissionGate → REWRITE si
        hace falta → recién entonces consumir en features
STEP 2  APPLY BC-02 (🔴 BLOCKING, §7) — antes de finalizar EventCalendar
STEP 3  FINALIZE EventCalendar.tsx+css (imports vs AUDITED APIs)
STEP 4  REWRITE EventDetail.tsx+css
STEP 5  REWRITE EventForm.tsx+css
STEP 6  REWRITE Event components (13)
STEP 7  APPLY BC-01, BC-03, BC-04 (§7)
THEN    Wave 1-6 feature migration (§9) · TRACKs (§9 nota de nomenclatura)
```

---

## §6 — CUMULATIVE METRICS

```
FILES COMPLETED: FASE 0: 1 · FASE 1: 46 (23 pairs) · FASE 1.5: 7 · FASE 2: 11
                 TOTAL: 65 files (unit=archivo; pares documentados aparte)
PENDING REVIEW: EventCalendar pair · 7 shared/ to audit
LOWEST: 9.3 · HIGHEST: 9.5 (CommandPalette) · STD DEV: 0.08
ANTI-PATTERNS REMOVED: ~900+ · CHECKS/FILE: 120–180 [CHECKLIST]
TOLERANCE: ZERO
```

---

## §7 — BREAKING CHANGES REGISTRY (Applied: 0/4 — AC-K03)

```
BC-01 HealthFactorStatus ES→EN (types.ts)                       PENDING
  BEFORE: "excepcional"|"saludable"|"atención"|"crítico"
  AFTER:  "exceptional"|"healthy"|"attention"|"critical"
  FIX: grep -r "excepcional\|saludable\|atención\|crítico" src/

BC-02 QueryClient global error handler (providers.tsx)      🔴 BLOCKING PENDING
  BEFORE: showToast(401) fired inside api.ts
  AFTER:  QueryClient default onError (APIError-aware) shows 401 toast
  REASON: sin esto, runtime crash en errores 401 · DEBE aplicarse antes de
          finalizar EventCalendar

BC-03 api convenience object removal (api.ts)                    PENDING
  AFTER: useMCPQuery("executive_dashboard", "get_executive_summary") pattern
  FIX: grep "api.get" · aplicar antes de FASE 3

BC-04 TrendDirection re-export removal (advisor-engine/index)    PENDING
  AFTER: import { TrendDirection } from "@/shared/types/domain-enums"
  FIX: grep TrendDirection import from advisor-engine · likely 0 consumers

⚠ El Appendix I de v6.1 decía "Applied" con 4 pendientes — corregido:
  Applied: 0/4. Los 4 siguen abiertos y se trackean aquí.
```

---

## §8 — COMPONENT INVENTORY

### shared/components/ui/ — 23 Completed ✅
```
Core(6): Button, Card, Badge, Input, Modal, Skeleton
Form&Data(6): FormField, FilterDropdown, Toast, EmptyState, Table, TrendIcon
Glass(3): FrostedGlassCard, GlowButton, ScoreGauge
Intel(4): WizardStepper, FreshnessBadge, StaleDataBanner, NotificationDropdown
Advisor(4): AdvisorActionModal, AdvisorReactionCard, PlanStepApprovalModal, CommandPalette
Barrel(1): index.ts
```

### shared/components/ — Other (NOT yet audited for feature use)
```
Layout(20) · AI(11) · ML(7+4 hooks) · Export(16+2 hooks) · Auth(3) ·
Error(2) · Chat(1+1 hook) · Root(2: AdvisorBanner unified + InsightCard) ·
Feedback(1)  — full file lists in project tree 2026-08-12
```

---

## §9 — FEATURE MIGRATION ORDER

```
FASE = feature migration unit · TRACK = transversal work (AC-K m6)

WAVE 1  FASE 2 Events (~14 comp) IN PROGRESS · FASE 3 Dashboard (~22) ·
        FASE 4 Families (~21)
WAVE 2  FASE 5 Members (~21) · FASE 6 Finance (~19) · FASE 7 Guests (~19) ·
        FASE 8 Recommendations (~31)
WAVE 3  FASE 9 Sports (~30) · FASE 10 Cultural (~35) · FASE 11 Comms (~21)
WAVE 4  FASE 12 Facilities (~26) · FASE 13 Wellness (~19) ·
        FASE 14 Engagement (~18) · FASE 15 Age Group (~11)
WAVE 5  FASE 16 Mi Club (~12) · FASE 17 AI System (~2) · FASE 18 Reports (~10) ·
        FASE 19 Operations (~3) · FASE 20 Settings (~6) · FASE 21 Auth (~3)
WAVE 6  TRACK A: deprecated cleanup (11) · TRACK B: bundle analysis ·
        TRACK C: a11y audit · TRACK D: E2E · TRACK E: documentation

23 features (not 26): approvals, documents, maintenance = cross-cutting →
se integran en Wave 6 o a su FASE madre.
EACH FASE: Integration Audit → types → hooks → components → pages → verify
```

---

## §10 — INNOVATION PROPOSALS 2027 (0 validated — all PROPOSED)

```
#  Proposal                        Impact    Effort   Validated  Status
1  Conversational Intelligence     High      High     No         PROPOSED
2  Predictive Ambient Canvas       Transform Med      No         PROPOSED
3  Cross-Domain Insight Cascade    Transform Med      No         PROPOSED
4  Digital Twin Scenario Playground Med      V.High   No         PROPOSED
5  Self-Improving Dashboard Layouts High     High     No         PROPOSED
6  NL Rule Marketplace             Med       V.High   No         PROPOSED
```

---

## §11 — APPENDICES

```
A  Advisor-Engine Consumption Audit        ✅ CONFIRMED
B  AdvisorBanner Duplicity Analysis        PENDING (FASE 2+ · problema #20)
C  MCP Communication Audit                 ✅ COMPLETE
D  Integration Score Baseline              PENDING (per-feature)
E  Type System Alignment Audit             PENDING (per-feature)
F  Shared/ Reorganization Proposal         ✅ DOCUMENTED
G  Test Infrastructure Gap Analysis        PENDING (TRACK D · #21)
H  showToast in useAutonomousAdvisor       ✅ DOCUMENTED
I  Breaking Changes Registry               🔴 0/4 applied (§7) — retitled (AC-K03)
J  Deprecated files (11) — RATIFICATION    ⚠️ PENDING LIST
   IDENTIFICATION RECIPES (para cerrar #22):
     grep -rn "api\.get" src/                    → consumidores de BC-03
     grep -rn "TrendDirection" src/              → consumidores de BC-04
     grep -rln "OK (no mock)" src/               → archivos legacy
     + revisión manual de imports huérfanos
   FORMATO: path | replacement | removable-since — completar con hallazgos
K  Critical Error — Unaudited Shared/       ⚠️ ACTIVE (§12, §13 · #23)
L  AdvisorCommand.action Missing           ✅ RESOLVED
M  BaseContext Wrong Import                ✅ RESOLVED
N  Version drift v3.0→v6.0                 ✅ RESOLVED (v6.1)
O  Checklist B detail lost in v6.0         ✅ RESTORED (CHECKLIST v6.1)
```

---

## §12 — PARALLEL AUDIT STATUS

```
✅ AUDITED (11 files):
  Infrastructure FASE 1.5: api.ts · mcp-router.ts · useMCPQuery.ts ·
    advisor-engine/types.ts · advisor-engine/index.ts · advisor-engine/engine.ts ·
    useAutonomousAdvisor.ts
  Advisor FASE 2 parallel: rules/events.ts · signal-bus.ts
  Types: shared/types/ai-intelligence.ts · shared/types/domain-enums.ts

⚠️ NOT YET AUDITED FOR FEATURE USE (7 — §13):
  [ ] ui/ScoreGauge.tsx+css  [ ] ui/FreshnessBadge.tsx+css
  [ ] ui/StaleDataBanner.tsx+css  [ ] ui/Skeleton.tsx+css
  [ ] hooks/useBreakpoint.ts  [ ] layout/PageContainer.tsx+css (existe — AC-K m7)
  [ ] auth/PermissionGate.tsx
  NOTE: Button, EmptyState, AdvisorActionModal migrados FASE 1 →
  re-verificar API al primer uso en feature (Checklist J).

EXTENDED AUDIT REGISTRY (config/wiring — esquema):
  [ ] src/app/providers.tsx · [ ] src/app/router.tsx · [ ] src/stores/auth.store.ts
  [ ] src/shared/lib/utils.ts · [ ] src/styles/globals.css (ruta confirmada — AC-K M5)
  [ ] frontend/tsconfig.json (NO figura en árbol 2026-08-12 — confirmar existencia)
  [ ] frontend/vite.config.ts · [ ] src/shared/components/ui/index.ts
  [ ] src/shared/features/__TEMPLATE__/types.ts (ruta confirmada)

AUDITED_FILES registry in tools/validate-shared-imports.ts se actualiza
al auditar cada archivo nuevo (Rule 7).
```

---

## §13 — FILES PENDING REVIEW (7 files — unificadas §5 = §12 = §13)

```
Estos 7 archivos bloquean la finalización de EventCalendar. Orden de pedido:
  1. src/shared/components/ui/ScoreGauge.tsx + .css
  2. src/shared/components/ui/FreshnessBadge.tsx + .css
  3. src/shared/components/ui/StaleDataBanner.tsx + .css
  4. src/shared/components/ui/Skeleton.tsx + .css
  5. src/shared/hooks/useBreakpoint.ts
  6. src/shared/components/layout/PageContainer.tsx + .css
  7. src/shared/components/auth/PermissionGate.tsx

DESPUÉS: auditar → registrar en AUDITED_FILES → finalizar EventCalendar
→ EventDetail → EventForm → 13 components
```

---

## §14 — CURRENT STATE & PENDING ASKS (2026-08-12)

```
PHASE: FASE 2 — Events (36% units · pages 0/3)

COMPLETED: FASE 0 + FASE 1 + FASE 1.5 + Events 9 units + shared parallel 2
           + master docs v6.2 (this update)

BLOCKED:
  🔴 EventCalendar → 7 shared/ sin auditar (§13)
  🔴 BC-02 → runtime crash 401 (§7)

WHAT I NEED TO CONTINUE (in order):
  REQUEST 1 (Blocker): 7 shared/ files (§13)
  REQUEST 2 (Esquema): src/styles/globals.css · frontend/tsconfig.json ·
    src/shared/lib/utils.ts · ui/index.ts (barrel) · vite.config.ts
    → desbloquea: alias resolution + token verification gate (G-01) +
      guardian expansion
  REQUEST 3 (Calibración): features/events/types.ts ·
    features/events/hooks/useEventAdvisor.ts · advisor-engine/confidence.ts
    → calibra checks heurísticos D/G contra código aprobado 9.3+

AFTER ALL 3: guardians → pre-commit → BC-02 → EventCalendar + Detail +
Form + 13 components → FASE 3+
```

---

## §15 — AUDIT LEDGER (v6.1 → v6.2)

```
AC-K01  §1.2: column state declared (histórica vs aplicada) + nota SEM en
        surface-1/2 · verification gate = token scan automatizado
AC-K02  §0.1: tabla trazable de los 30 problemas (18 R · 4 R-GATE · 8 OPEN);
        el "25/5" de v6.1 se corrigió con evidencia por ítem
AC-K03  §7/Appendix I: "Applied" → Applied: 0/4 · BC-02 flag de riesgo en §4
AC-K04  §2.2: baselines reales del árbol (94 components · 31 hooks · 11 rules
        + 34 core · ml 11 · export 18) — y declaración de derivabilidad
AC-K05  §11J: registro de deprecados + recetas de identificación (no invento)
AC-K06  §4: project score con fórmula [BASE §0.2] = 9.3 computado;
        valores manuales "9.35"/"7.8" retirados
AC-K M3 §1.5: scope declarado (14/23 = intelligent only) + rationale de
        reutilización de tokens + precedencia de aura
AC-K M4 §1.4: prefijo .mt- (maintenance) ratified
AC-K M5 §12: rutas corregidas (globals → src/styles/) · tsconfig marcado
AC-K m1 header: páginas events 0/3 · AC-K m2: units 9/25 = 36%
AC-K m4 §3.2: redondeo 1 decimal half-up declarado
AC-K m6 §9: FASE vs TRACK · AC-K m7: "(if exists)" eliminado (PageContainer existe)
AC-K m8 header/§3.4: semántica de estados = DONE / IN PROGRESS /
        PENDING REVIEW / PENDING / BLOCKED
```

END OF MASTER_CHECKPOINT.md v6.2
```

---

## 3/3 — MASTER_CHECKLIST.md v6.2

```markdown
# MASTER_CHECKLIST.md — Validation Gates & Standards
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 6.2 · 180 checks · ZERO tolerance
### Supersedes: v6.1 · Consistent-with: MASTER_BASE v2.1 · MASTER_CHECKPOINT v6.2

---

## §1 — Checklist A — TypeScript Quality (18 checks)

A-01  □  0 `any` types (use `unknown`, narrow with type guards)
A-02  □  0 type assertions (`as X`) except DOM narrowing · EXCEPCIÓN E-3:
          `as unknown` permitido en boundary MCP con runtime guard +
          `// assertion justified: <why>` [BASE §8.3]
A-03  □  All interface fields: `readonly`
A-04  □  All array params: `readonly T[]`
A-05  □  Union literals: `"value1" | "value2"`, not `string`
A-06  □  Error typed as `unknown` (narrow before `.message`)
A-07  □  No `enum` (use `const object` + union literal)
A-08  □  Props objects for hooks with >1 param
A-09  □  Named exports — default exports solo en allowlist de entrypoints
          (src/main.tsx, src/app/App.tsx) [BASE §8.3 E-1]
A-10  □  `export type` for type-only re-exports
A-11  □  No `React.ReactNode` without import (use `ReactNode`)
A-12  □  `forwardRef` uses named function pattern
A-13  □  No side effects in `useMemo`
A-14  □  Stable references: `useMemo` for objects, `useCallback` for fns
A-15  □  Query params wrapped in `useMemo` to prevent infinite re-fetch
A-16  □  No `document.getElementById` — use refs
A-17  □  No `// @ts-ignore` / `// @ts-expect-error` without
          `-- justified: <reason>`
A-18  □  § section markers in every file (§1 Types, §2 Constants, §3 Component)

---

## §2 — Checklist B — CSS Production Grade (80 checks, 13 Dimensions)

### STRUCTURAL COLOR ALLOWLIST (resolves AC-CL01 — B-31 co-ejecutable)
```
B-31 prohíbe colores SEMÁNTICOS/brand hardcodeados. Los valores
ESTRUCTURALES prescritos por otros checks están permitidos y versionados aquí
(v2.1 del manifesto los codifica; consolidar como tokens en globals es TRACK):
  glass borders/inset:  rgba(255,255,255,0.03 … 0.08)
  scrollbar thumb:      rgba(255,255,255,0.06)
  light-mode surfaces:  rgba(0,0,0,0.02 … 0.08)   (B-65, B-67)
  shadows ambient:      rgba(0,0,0,0.2 / 0.3 / 0.4 / 0.5)  (B-04)
  print-safe:           #fff · #000 · #ccc        (B-73)
TODO valor fuera de esta lista en CSS (excepto globals.css) = FAIL B-31.
```

── D1: GLASS MORPHISM (8) ─────────────────────────────────────
B-01  □  backdrop-filter + -webkit-backdrop-filter on glass surfaces
B-02  □  background: rgba() (never solid) on glass surfaces
B-03  □  border: 1px solid rgba(255,255,255,0.04-0.08)
B-04  □  box-shadow multicapa (ambient + depth + inset ring)
B-05  □  ::before edge light (gold gradient) on panels
B-06  □  ::after noise texture on panels (SVG feTurbulence)
B-07  □  Content wrapper z-index: 1 above pseudo-elements
B-08  □  Light mode: removes backdrop-filter + pseudo-elements
        (ALIAS de B-68 — mismo bloque satisface ambos IDs; scoring cuenta 1)

── D2: STAGGER CHOREOGRAPHY (6) ───────────────────────────────
B-09  □  Every list >1 item has nth-child + animation-delay
B-10  □  Base state: opacity: 0, animation: forwards
B-11  □  Delay increment: 20-60ms between items
B-12  □  Dynamic .map() uses CSS custom property cascade
B-13  □  Each section group gets SEQUENTIAL base delay
B-14  □  Reduced motion kills all stagger (opacity: 1, animation: none)

── D3: EASING & MOTION (8) ────────────────────────────────────
B-15  □  Panel/overlay entrance: var(--ease-apple) — literal
          cubic-bezier(0.32,0.72,0,1) aceptado pero WARN (migrar al token)
B-16  □  Micro-interaction hover: ease-out 0.15-0.2s
B-17  □  Content stagger: ease 0.25-0.3s
B-18  □  Exit faster than entrance (0.25s vs 0.35s)
B-19  □  No animation >0.5s (except continuous pulse/breathe)
B-20  □  Pulse/continuous: ease-in-out 2-3s
B-21  □  NO `transition: all` — always specific properties
B-22  □  Only GPU-composited properties animated (transform, opacity;
          filter con moderación — blur/backdrop-filter NUNCA se animan)

── D4: TYPOGRAPHY (8) ──────────────────────────────────────────
B-23  □  Data/values: --font-mono            ┐
B-24  □  Labels: --font-mono 9-10px upper    │ tokens PENDING-RATIFICATION
B-25  □  Body: --font-ui 12px                │ [CHECKPOINT §1.3] — verificar
B-26  □  Headlines: --font-display 16-18px   │ contra globals.css
B-27  □  Badges: --font-mono 8-10px 700      ┘
B-28  □  font-family declarations in CSS, NEVER inline in TSX
B-29  □  margin: 0 on all h*, p
B-30  □  3-level hierarchy: silver-100/200 (primary), 300 (secondary),
          400/500 (tertiary)

── D5: COLOR SYSTEM (8) ────────────────────────────────────────
B-31  □  0 hardcoded SEMANTIC colors — structural values per Allowlist ↑
B-32  □  color-mix() for translucent variants
B-33  □  data-* attributes for state-driven colors
B-34  □  NO inline styles for colors in TSX
B-35  □  Hover: lightens in dark mode (rgba white 0.015 → 0.035)
B-36  □  Focus ring: 2px solid var(--color-gold-400), offset 2px
          (ALIAS de B-59 — scoring cuenta 1)
B-37  □  Status colors: critical=rose, warning=amber, good=emerald
B-38  □  Domain colors from config, never hardcoded

── D6: PSEUDO-ELEMENT DEPTH (4) ───────────────────────────────
B-39  □  Every card/panel has at least one pseudo-element
B-40  □  pointer-events: none on all decorative pseudo-elements
B-41  □  z-index explicit on every pseudo-element
B-42  □  Light mode removes/hides decorative pseudo-elements

── D7: INTERACTIVE STATES (8) ──────────────────────────────────
B-43  □  :hover on ALL interactive elements
B-44  □  :focus-visible on ALL focusable elements
B-45  □  :active on buttons and triggers
B-46  □  :disabled: opacity 0.4 + pointer-events: none
B-47  □  transition on ALL state changes
B-48  □  cursor: pointer on clickable elements
B-49  □  min-height: 44px on touch targets (36px on compact)
B-50  □  font: inherit on buttons

── D8: DENSITY (5) ─────────────────────────────────────────────
B-51  □  Padding: 14-16px (panel), 12px (card), 9-12px (compact)
B-52  □  Gaps: 14px (panel), 10px (card), 6px (metrics), 5px (timeline)
B-53  □  Text: 9-12px (labels/badges), 12-13px (body), 16-18px (headlines)
B-54  □  Scrollbar: 3px wide, thumb rgba(255,255,255,0.06) [allowlist]
B-55  □  Not sparse, not cramped — PRECISE (manual judgment)

── D9: RESPONSIVE (3) ──────────────────────────────────────────
B-56  □  @media (max-width: 768px) — tablet adaptations
B-57  □  @media (max-width: 480px) — mobile adaptations
B-58  □  Overflow handling: overflow-x: hidden on containers

── D10: ACCESSIBILITY (5) ──────────────────────────────────────
B-59  □  focus-visible: 2px solid gold-400, outline-offset: 2px (≡ B-36)
B-60  □  role on custom interactive elements
B-61  □  aria-label on ALL buttons and controls
B-62  □  aria-hidden on decorative elements
B-63  □  aria-live on dynamic content regions

── D11: LIGHT MODE (6) ─────────────────────────────────────────
B-64  □  .light prefix for ALL overrides
B-65  □  Backgrounds → white / warm-canvas / rgba(0,0,0,0.02) [allowlist]
B-66  □  Text → silver-700/800
B-67  □  Borders → rgba(0,0,0,0.04-0.08) [allowlist]
B-68  □  Disables backdrop-filter (≡ B-08)
B-69  □  Hover: darkens (rgba 0,0,0) instead of lightens

── D12: REDUCED MOTION + PRINT (6) ─────────────────────────────
B-70  □  @media (prefers-reduced-motion: reduce) kills ALL animation
B-71  □  @media (prefers-reduced-motion: reduce) kills ALL transition
B-72  □  opacity: 1 on all stagger elements
B-73  □  @media print: white bg, black text, no glass
B-74  □  @media print: break-inside: avoid on cards
B-75  □  @media print: hide decorative + interactive chrome

── D13: KEYFRAMES (5) ──────────────────────────────────────────
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
C-04  □  0 Tailwind utilities in TSX (gate FINAL — ver F-07)
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
C-17  □  No business logic in component (delegate to hooks) — manual
C-18  □  § section markers in component file
C-19  □  File header: path, level, namespace, keyframes, depends
C-20  □  PRE-WRITE VERIFICATION block
C-21  □  ANTI-PATTERNS REMOVED block
C-22  □  Props interface: all fields readonly

---

## §4 — Checklist D — Intelligence Integration (8 checks)

D-01  □  Every insight has at least one CTA
D-02  □  Severity → placement mapping (critical=interrupt, high=hero)
D-03  □  Narrative generated (not raw description passthrough) — manual
D-04  □  CTAs deduplicated across all slots
D-05  □  Headline = top-severity insight narrative
D-06  □  hasUrgent flag drives ambient UI changes
D-07  □  Placement drives visual treatment (not data shape)
D-08  □  Intelligence auras: interrupt=rose, hero=gold, inline=none
          PRECEDENCIA: D-08 (severity→placement) > [CHECKPOINT §1.5]
          (domain ambient) — si dominio y placement chocan, manda placement

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
          (MÉTRICA DE MIGRACIÓN, severity warn — el gate final es C-04;
          ver [BASE §8.3] zero tolerance — AC-CL02)
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

H-01  □  shared/ follows the 6-block structure ([CHECKPOINT §2.2])
H-02  □  advisor-engine consumed by >0 feature hooks
H-03  □  useMCPQuery consumed by >0 features
H-04  □  ui barrel exports match available files
H-05  □  No feature re-implements a shared component locally
H-06  □  shared/ has zero circular dependencies (automatable — graph scan)
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
J-10  □  PENDING AUDIT files MUST be audited + rewritten BEFORE the
          consuming feature file can be finalized

---

## §11 — ANTI-PATTERNS REGISTRY (53 items — exact count, AC-CL05)

CSS (15):
❌ transition: all · ❌ !important (except reduced-motion/print + justification)
❌ Hardcoded semantic hex/rgba (structural per §2 Allowlist OK)
❌ Generic keyframes (fadeIn, slideUp, pulse) · ❌ Keyframes NOT at end
❌ Missing -webkit-backdrop-filter · ❌ Material easing (0.4,0,0.2,1)
❌ Inter, Roboto, Arial, Space Grotesk, system-ui
❌ Missing light / reduced motion / print / responsive
❌ Purple gradient on white · ❌ Equal-weight rainbow palettes
❌ animate-[...] arbitrary Tailwind · ❌ animate-spin Tailwind
❌ Keyframes without feature namespace

TSX (20):
❌ framer-motion / react-spring / GSAP · ❌ Tailwind as primary styling
❌ Inline styles for colors · ❌ Any `any` · ❌ Default exports (except allowlist)
❌ Mutable interface fields · ❌ Business logic in JSX
❌ Missing data-testid / aria-* / focus-visible
❌ Side effects in useMemo · ❌ eslint-disable without justification
❌ Error caught without narrowing · ❌ Magic numbers without constants
❌ Hardcoded UI strings without i18n-ready map
❌ font-[family-name:var(--font-*)] in Tailwind
❌ globalIdx mutable counter during render
❌ mousedown document listener for click-outside
  (use onClick overlay + stopPropagation panel)
❌ CSS file missing for component with styles · ❌ Unnamed forwardRef
❌ FASE 2 without Checklist E · ❌ Canvas without aria-hidden

INTEGRATION (13):
❌ Re-implementing a shared component locally
❌ Feature AdvisorBanner instead of unified
❌ Direct fetch instead of useMCPQuery / callMCPTool
❌ Inline advisor logic instead of advisor-engine
❌ AI output without loading/progress · ❌ Prediction without uncertainty viz
❌ Insight without CTA · ❌ Domain hook in shared/
❌ null as T cast · ❌ Silent success fallback ("OK (no mock)")
❌ Infrastructure layer importing from UI components
❌ Deprecated files left in repo · ❌ Feature migration without Integration Audit

SHARED/ USAGE (5):
❌ Importing shared/ without reading implementation
❌ Assuming a component's API from its name
❌ Passing props that don't exist · ❌ Using a hook's return without knowing shape
❌ Local copies of shared/ utilities

---

## §12 — THE STANDARD — Level 6+ Agency

### 7 Pillars
1. INTENTIONAL (every value has a reason) · 2. COHERENT (same design language)
3. PREMIUM (glass, physics animations, print typography)
4. INTELLIGENT (data drives visuals, AI visible)
5. SCALABLE (architecture predicts growth, shared/ consumed)
6. ACCESSIBLE (WCAG 2.2 AA is the floor — actualizado desde 2.1, AC-CL04)
7. BEAUTIFUL (dark = deep space, light = premium paper)

### 6 Golden Rules
See [BASE §8.1] (CANONICAL SOURCE)

---

## §13 — CSS + TSX Templates (structurally valid v6.2 — AC-CL01)

### CSS Template (Complete)

```css
/**
 * <ComponentName>.css
 * src/shared/components/ui/<ComponentName>.css  (or features/<name>/components/)
 *
 * @level       Level 6+ Agency · Apple/Xiaomi Production Grade · 2027
 * @namespace   .<prefix>-<component>
 * @keyframes   <N>
 * @signature   <unique visual element>
 *
 * 13 DIMENSIONS: D1✓ D2✓ D3✓ D4✓ D5✓ D6✓ D7✓ D8✓ D9✓ D10✓ D11✓ D12✓ D13✓
 */

/* §0  Root */
.<prefix>-<component> {
  position: relative;
  background: var(--color-surface-1);            /* token, not literal */
  backdrop-filter: blur(10px) saturate(1.2);
  -webkit-backdrop-filter: blur(10px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.06);      /* structural — Allowlist §2 */
  border-radius: var(--radius-md);               /* PENDING-RATIFICATION token */
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: transform 0.25s var(--ease-apple), box-shadow 0.25s ease;
}

/* §1  Pseudo-elements */
.<prefix>-<component>::before {
  content: ""; position: absolute; inset: 0;
  pointer-events: none; z-index: 0;              /* B-40, B-41 */
  /* edge light / inset highlight */
}
.<prefix>-<component>::after {
  content: ""; position: absolute; inset: 0;
  pointer-events: none; z-index: 0;
  /* noise / zone glow */
}

/* §2-N  Sections */
.<prefix>-<component>__<element> { ... }

/* §N+1  Signature Element */
.<prefix>-<component>__signature { ... }

/* §N+2  Keyframes (at end of styles, before media queries) */
@keyframes <prefix>-<DescriptiveName> { ... }

/* §N+3  Light Mode */
.light .<prefix>-<component> {
  background: rgba(0,0,0,0.02);                  /* Allowlist §2 */
  backdrop-filter: none; -webkit-backdrop-filter: none;
}

/* §N+4  Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .<prefix>-<component> { animation: none; opacity: 1; transition: none; }
}

/* §N+5  Responsive */
@media (max-width: 768px) { ... }
@media (max-width: 480px) { ... }

/* §N+6  Print */
@media print {
  .<prefix>-<component> {
    background: white; color: black; box-shadow: none;
    border: 1px solid #ccc; break-inside: avoid;
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
 * @depends     globals.css §1 tokens, <other deps — READ before use>
 *
 * PRE-WRITE VERIFICATION:
 * [x] <every import verified against READ file>
 * [x] <every token reconciled against [CHECKPOINT §1.2]>
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
const STATUS_MAP: Readonly<Record<string, string>> = { ... };

/* §3  COMPONENT */
export function ComponentName({ data, onAction }: ComponentProps) {
  return (
    <div data-testid="<prefix>-<component>-root">
      {/* ... */}
    </div>
  );
}
```

---

## §14 — SHARED/ MANDATORY IMPORTS (inline — v6.1 delegaba a un
## "original v6.0" inexistente en los masters; AC-CL02)

### §14.1 — UI COMPONENTS (mapping completa [CHECKPOINT §8])
```
Necesidad          → Importar de @/shared/components/ui
────────────────────────────────────────────────────────────
Button/GlowButton  → Button, GlowButton
Card/Glass         → Card, FrostedGlassCard
Badge/Score        → Badge, ScoreGauge
Input/FormField    → Input, FormField
Modal/Dialog       → Modal (+ focus trap C-14)
Toast/showToast    → Toast (showToast)         ⚠ audit pending (§13 #4 Skeleton)
EmptyState/Table   → EmptyState, Table
Filter/Select      → FilterDropdown
Skeleton/loading   → Skeleton                  ⚠ audit pending (§13)
Freshness/Stale    → FreshnessBadge, StaleDataBanner ⚠ audit pending (§13)
Wizard/Stepper     → WizardStepper
Notifications      → NotificationDropdown
Advisor surfaces   → AdvisorActionModal, AdvisorReactionCard, PlanStepApprovalModal
Command/Nav        → CommandPalette
Trend/Icon         → TrendIcon
StatusBar          → StatCard (shared/components/layout) ⚠ audit pending (§13 PageContainer)

REGLA: si shared/ lo tiene → usarlo. Si falta → PROPONER alta (Rule 5).
NUNCA reimplementar (I-10 / H-05).
```

### §14.2 — DATA FETCHING (3 Patterns)
```
PATTERN 1 (lecturas):   useMCPQuery(agent, tool, params)   — cache + freshness
PATTERN 2 (escrituras): useMCPMutation(agent, tool)        — optimistic updates
PATTERN 3 (imperativo): callMCPTool(agent, tool, params)   — eventos/acciones

NEVER: fetch(), axios, custom data-fetching hooks sin useMCPQuery (F-06).
```

### §14.3 — ADVISOR ENGINE
```
domain hook (useXAdvisor) → useAdvisorEngine(rules, context) → evaluación
  → señales vía SignalBus (P4) → UI (AdvisorBanner unificado)
Accesso a `raw` (unknown) del MCP: SIEMPRE con type guard runtime +
comentario "// assertion justified: <why>" (E-3).
```

### §14.4 — TYPES
```
Importar de shared/types/{ai-intelligence, domain-enums, permissions}.
Extender BaseContext. NUNCA redefinir enums compartidos (F-08, I-09).
Tipos de feature siguen src/shared/features/__TEMPLATE__/types.ts (Rule 9).
```

### §14.5 — HOOKS
```
Shared hooks (31 en repo): useMCPQuery, useMCPMutation, useAutonomousAdvisor,
useBreakpoint ⚠audit, useReducedMotion, useDataFreshness, usePermissionGate,
useWebVitals, ... (árbol 2026-08-12)
Feature-local hooks: permitidos solo para lógica de dominio (1 feature).
Hooks usados por 2+ features → promover a shared/hooks/ (Placement Rules).
```

### §14.6 — COMMUNICATION ARCHITECTURE (CANONICAL)
```
P1: Feature Data Queries → useMCPQuery → callMCPTool → routeMCPCall → Backend ✅
P2: Autonomous Execution → useAutonomousAdvisor → callMCPTool → Backend ✅
P3: Advisor Evaluation → useAdvisorEngine → AdvisorEngine → rules ✅
P4: Cross-Domain Signals → Rule emits → SignalBus → Target domain ✅

NEVER: fetch(), axios, custom hooks without useMCPQuery
```

---

## §15 — AI/ML INTEGRATION STRATEGY

### 4 Layers of Visible Intelligence
L1 AMBIENT (auras, pulse) · L2 REACTIVE (AdvisorBanner, predictions)
L3 INTERACTIVE (CommandPalette, Chat, accept/reject)
L4 TRANSPARENT (reasoning chain, confidence, "why?")

### Reusable AI/ML UX Patterns
```
Pattern                  Component                    Status
───────────────────────  ───────────────────────────  ─────────────────
Advisor Banner           shared/components/AdvisorBanner ✅ unified
Confidence Gauge         ScoreGauge                   ✅ (audit pending §13)
Prediction Visualization TrendIcon + feature charts    ✅ (charts en features —
                                                       no existe "Chart" shared;
                                                       AC-CL07)
AI Command Interface     CommandPalette               ✅
AI Chat                  AIChatWidget                 ✅
AI Decision Panel        AIDecisionPanel              ✅
NL Rule Author           NLRuleAuthor                 ✅
Scenario Builder         ScenarioBuilder              ✅
Simulation Results       TwinResults                  ✅
Plan Execution           PlanExecutionDashboard       ✅
System Health            SystemHealthDashboard        ✅
Causal Chain             CausalChainViz               ✅
Action Timeline          AdvisorReactionCard          ✅
```

---

## §16 — AUTOMATION MAPPING (model: 1 ENGINE + N SUITES — AC-CL03)

### PRINCIPIOS
```
1. OWNER DISJUNTO: cada check ID tiene UN solo dueño de ejecución.
   Ningún script reimplementa checks de otro (v6.1 sumaba 128 por solapes;
   el total real se computa desde el registro, no se escribe a mano).
2. CLASIFICACIÓN por check: full | heuristic | manual
   (full = determinista · heuristic = señal + revisión humana ·
    manual = design judgment only)
3. El registro máquina por check vive en tools/architecture-manifest.ts
   (materialización de este checklist); este §16 es la ley textual.
   Totales = se computan al correr los tools (nunca se mantienen a mano).
```

### CHECK → SUITE MAPPING (ownership disjunto)
```
SUITE (owner)              CHECKS    Tipo de automatización
─────────────────────────  ────────  ─────────────────────────────
guardian:typescript        A 18      AST (typescript compiler API)
guardian:css               B 80      regex/AST CSS + estructura de bloques
guardian:component         C 22      AST JSX + filesystem (co-location)
guardian:integration       D+E+F+G   AST imports + heurísticas de JSX
                           (33)
guardian:shared            H 7       grafo de imports (H-06 ciclo = graph scan)
shared-imports             I+J 20    resolución de specifiers + registry lookup
manual (humano)            (subset   design judgment: A-14, B-13, B-55, C-17,
                           marcado    D-03 + verificación de heurísticas)
                           arriba)

HERRAMIENTAS (roadmap — wrappers de suites, NO reimplementaciones):
  architecture-guardian.ts       EXISTS (expandir a suites A–H)
  validate-shared-imports.ts     EXISTS (suites I–J)
  pre-commit-pipeline.ts         ORCHESTRATOR (guardian + shared-imports + report)
  (los hipotéticos css-audit/component-audit/feature-integration-audit de v6.1
   se absorben como suites del guardian — eliminan el solape)

CI GATE: 0 errors en checks `full`+`heuristic` con severity error → commit OK
(rule 8 [BASE §8.2]). Rollout warn→error por waves [CHECKPOINT §9].
```

---

## §17 — AUDIT LEDGER (v6.1 → v6.2)

```
AC-CL01  B-31 vs B-02/B-03/B-54/B-65/B-67: STRUCTURAL COLOR ALLOWLIST (§2)
         + template §13 ahora estructuralmente válido (usaba rgba literal)
AC-CL02  §14.1–§14.5 inlineadas (v6.1 delegaba a "original v6.0" inexistente)
AC-CL03  §16: modelo 1 engine + N suites · ownership disjunto · stats computados
AC-CL04  §12: WCAG 2.1 → 2.2 AA
AC-CL05  §11: conteo exacto 53 items (era "~46")
AC-CL06  A-02/A-09/B-21: EXCEPTIONS REGISTER enlazado con [BASE §8.3] E-1..E-4
AC-CL07  §15: "TrendIcon + Chart" → TrendIcon + feature charts (Chart no existe)
AC-CL08  B-08≡B-68 · B-36≡B-59: alias declarados (scoring cuenta 1 por fallo)
AC-CL09  D-08 vs [CHECKPOINT §1.5]: precedencia de aura declarada (placement >
         domain ambient)
AC-CL10  B-15 literal easing → WARN · B-22: nota GPU (nunca animar
         backdrop-filter) · §13: tokens PENDING-RATIFICATION referenciados
         con estado explícito (no inventados)
AC-CL11  §16: cobertura declarada A–J completa (v6.1 no mapeaba H en scripts)
```

END OF MASTER_CHECKLIST.md v6.2
```

---

## Tabla de consistencia cruzada (validación post-rewrite)

| Punto crítico | BASE v2.1 | CHECKPOINT v6.2 | CHECKLIST v6.2 | Estado |
|---|---|---|---|---|
| Ruta globals.css | §2.2/§6 `src/styles/` | §1.1/§12 `src/styles/` | §14 implícito vía tokens | ✅ |
| Ruta __TEMPLATE__ | §6/Rule 9 `shared/features/__TEMPLATE__` | §12 confirmada | §14.4 referenciada | ✅ |
| Total checks | §4.1/§5.1 A–J con H = 180 | §6 "120–180 [CHECKLIST]" | §Grand Total 180 (suma verificada) | ✅ |
| Scoring | §0.2 fórmula única + IDs canónicos | §4 score computado 9.3 | penalizaciones B-64/B-70/B-21/C-03/A-01/J-10 | ✅ |
| Zero Tolerance | §8.3 + Exceptions Register | — | B-31 allowlist + A-02/A-09 excepciones | ✅ |
| BC status | Rule 8 | §7 Applied: 0/4 (BC-02 🔴) | — | ✅ |
| Aura precedence | — | §1.5 declarada | §4 D-08 + §15 | ✅ |
| maintenance `.mt-` | Rule 3 | §1.4 ratified | — | ✅ |
| WCAG floor | — | — | §12 WCAG 2.2 AA | ✅ |
| 30 problemas | — | §0.1 tabla 18R/4R-G/8OPEN | — | ✅ |

**Lo que queda fuera de este paso (siguientes, en orden):**
1. **(b) Auditoría de tooling:** pasame los 3 archivos reales (`architecture.manifest.ts`, `tools/architecture-guardian.ts`, `tools/validate-shared-imports.ts`) y los fusiono potenciando lo que ya tenés vs lo que generé — sin reemplazo ciego.
2. **(c) Ruta de trabajo por bloques:** con los masters ya limpios, armo el plan de 900+ archivos por criticidad (primero los 7 shared/ de §13 → EventCalendar → waves) con los checks automatizados del §16 corriendo incremental.

Los 3 masters quedan autoconsistentes y sin bloqueos cruzados. Los ledgers AC-* dentro de cada documento dejan trazable cada corrección para cuando los vuelvas a depurar.