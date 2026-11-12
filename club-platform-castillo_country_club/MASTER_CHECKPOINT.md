# MASTER_CHECKPOINT.md — Project State & Execution Plan
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 9.5 · Generación G12 (resiliencia LLM — Q-LLM-01) · Date: 2026-11-12
### Updates: G9 — absorción serie B1-B6 (504b53d · 207 tools · 818
###          tests), P0 utilities + gate verify-build-css v1.0.0,
###          manifest v3.8.0 (0004), §3.7 NUEVO, §14/§15 re-escritos

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

## CHANGELOG G8 (v7.0 → v8.0)

```
- §0.3: Self-Audit REGENERADO (regla G7: cada generación) — hallazgos
  #61-#73: masters congelados, regresión REAL del VI (290afa4 pisó
  f11d8e7), M-04a cerrado, #65 scope backend, #67 §13/§14 stale, #73
  script fantasma.
- §3.6 NUEVO: P2-C3 completa (C1..C3h) — migración C3g (18 llamadas),
  fixes b0v (7 src + 4 tests), gate B0 VERDE, 785/785, commit e15068e.
- §5: plan re-escrito a la realidad: B1 (4 migrables) → B2 (15
  cross-agent) → cola §15 empezando por P0 (secrets).
- §6: métricas backend agregadas (785 tests · smoke 23/23 · 196 tools).
- §7: BC-01 marcado APPLIED (G33 — verificado contra types.ts:517).
- §13: regenerado — los 7 shared/ de v7.0 ya estaban auditados G9 (#67).
- §14: REESCRITO — estado 2026-11-08, requests reales.
- §15 NUEVO: COLA DE ARQUITECTURA (P0-P3, ~20 ítems) — registro de
  deuda production-grade: secrets, persistencia, CI, LLM ops, gobernanza
  backend, HITL, observabilidad.
- End marker v8.0 G8.
```

---

## CHANGELOG G12 (v9.4 → v9.5)

```
RESILIENCIA LLM PRODUCTION-GRADE — Q-LLM-01/02 (cola §15 P2):
- NUEVO src/club_mcp/ai/resilience.py (467L):
  · ResilientClaudeService — proxy de ClaudeService (misma interfaz,
    6 consumidores sin cambio de firma): retry exponencial 2^n con jitter
    completo, timeout por intento (asyncio.wait_for), circuit breaker
    CLOSED/OPEN/HALF_OPEN con ventana deslizante (asyncio.Lock, sin deps
    nuevas), fallback a Ollama.
  · Q-LLM-01 cerrado de verdad: el setting ollama_host/ollama_fast_model
    (fantasma desde el inicio) SE CONSUME al degradar — respuesta marcada
    degraded + provider_error (degradación honesta, nunca silenciosa).
  · TokenUsageLedger (Q-LLM-02 contorno): accounting por día de proceso,
    budget diario configurable, WARNING 80% / CRITICAL 95%, señal
    budget_alert en la respuesta + log. Persistencia real llega con
    Q-PER-01 (PostgreSQL) — no se duplica infra a medias.
- WIRING (sin scope creep): bootstrap.build_runtime (envuelve la instancia
  central) · get_claude_service singleton · cultural_social_agent default.
  RAGService ya recibía la inyectada — cero cambios de consumidor.
- TESTS: tests/unit/ai/test_resilience.py — 9/9 (retry con recuperación
  transitoria, no-retryable corta en 1 intento, breaker OPEN no toca red,
  HALF_OPEN→CLOSED, fallback Ollama con MockTransport, ledger 80/95%,
  invarianza de contrato generate_json/chat) · suite nueva = 30º archivo
  de tests (unit/ai/) — sandbox: 779 passed + 48 errors por deps pesadas
  (chromadb) IDÉNTICOS con y sin el diff (0 regresión) · CI con deps
  completas corre 827 (818 + 9 nuevas).
- LINT: ruff+mypy — 0 errores NUEVOS; baseline pre-existente documentado
  (claude_service 74 mypy / bootstrap 4 ruff / cultural 8 ruff — iguales
  en 3fe481c, fuera de scope de este commit).
- Decisiones de diseño: resiliencia en la CAPA DE TRANSPORTE (no try/except
  regados por método) · composition sobre herencia (proxy) · anthropic SDK
  ya reintenta 429/5xx internamente — esta capa cubre timeout de red,
  degradación y presupuesto.
- END: masters v9.5; Q-LLM-01 CERRADO · Q-LLM-02 contorno (persistencia
  → Q-PER-01) · protocolo intacto.
```

---

## CHANGELOG G11 (v9.3 → v9.4)

```
DESACOPLAMIENTO PAGE-CSS — COLA §15 CERRADA (TRAMO 3 FINAL):
- ENGINE de extracción atómica (scripts/g11_engine.py): parser css con
  stash de comentarios (bug P0 corregido: los comentarios de sección
  '/* ═ X ═ */' contaminaban preludes y 122 reglas se perdían silencio-
  samente — detectado por validación de paridad antes==después),
  atribución de regla→dueño en 3 niveles (censo exacto de clases del
  tsx → prefijo de sub-familia → bloque raíz), split de grupos
  multiselector (.light de 7 miembros → 1 regla por hijo, paridad visual
  garantizada), keyframes compartidos quedan en host, exclusivos viajan
  con su dueño.
- 36 PAREJAS 1:1 NUEVAS (mi-club 10 · settings 6 · board 5 · knowledge
  4 · risk 3 · approvals 2 · ai-system 2 · auth 2 · timeline 2 · hitl
  1) — 684 reglas atómicas movidas byte-exactas.
- 10 HOSTS PODADOS con banner documental (qué se extrajo, a dónde,
  qué conserva: root/grids/headers/skeletons/Shared ≥2 hijos).
- Cirugía tsx: import JS real "./X.css" (antes dependían del import
  del host — acoplamiento invisible) + javadoc @depends/@import propio.
- CAPA A11Y ADITIVA en los 36 css nuevos: :focus-visible (WCAG 2.2 AA
  2.4.7) donde faltaba + prefers-reduced-motion (anti-demanda §
  inclusividad) — sin tocar las reglas movidas (paridad intacta).
- FEATURE-SHEETS documentadas por diseño (no acoplamiento): PrintView
  (suite print), MyReservations (G10.2), FamilyAccountGlass (6 widgets),
  LivingCommandCenter, ml-glass, PermissionGate, DocumentRepository,
  PulseRadar, NeonBorder.
- VALIDACIÓN: 0 reglas perdidas (paridad canónica núcleo) · 0 huérfanos
  reales (321 clases OK · 15 dinámicas · 1 pre-existente Tailwind) ·
  X-13: 0 colores NUEVOS (delta contador = split de grupos .light
  pre-existentes, mismos valores distribuidos) · keyframes íntegros
  (2 muertos PRE-EXISTENTES descartados: board-section-expand sin uso,
  documentado) · EOL lf · imports 36/36 resuelven.
- ESTADO FINAL CSS: 453/483 tsx con pareja css directa · 7 no-UI
  documentados · 23 feature-sheets legítimas · cola §15 CERRADA.
- MIGRACIÓN CSS 3 TRAMOS: G10.1 T1 (78 parejas) + G10.2 T2 (P0
  MyReservations) + G11 T3 (desacoplamiento) = COMPLETA.
- Gates estáticos sandbox: todos ✓. CI a re-correr en merge (build,
  verify:build-css bundle +~30kB esperado por 36 css nuevos, vitest
  baseline 6, guardian ratchet ≤15198: X-13 delta 0 real).
- END: masters v9.4; protocolo intacto.
```

---

## CHANGELOG G10.2 (v9.2 → v9.3)

```
MIGRACIÓN CSS TRAMO 2 — CIERRE P0 (auditoría post-T1):
- P0 RESUELTO: MyReservations.css estaba VACÍO desde Fase 25 — 5 tsx
  (MyReservations, TodayHero, DayTimeline, ReservationCard,
  RebookSuggestion) referenciaban 36 selectores .glass-reservations__*
  inexistentes (página renderizada sin estilos). Hoja completada:
  607 líneas · 36+8 selectores · countdown normal/warning/urgent ·
  day-timeline proporcional con "now" indicator · cards con date block ·
  rebook suggestion dashed · 2 keyframes únicos prefijados
  (glass-reservations-hero-in, glass-reservations-countdown-pulse) ·
  tokens var() silver/surface/gold/teal/rose · .light overrides ·
  prefers-reduced-motion · focus-visible · X-13 en css nuevo: 0.
- AUDITORÍA T2 (66 tsx sin pareja 1:1 restantes): 7 no-UI documentados
  (providers/router/RoleRedirect/ProtectedRoute/usePermissionContext/
  highlight/main) · 28 cubiertos por page-css compartido (acoplamiento
  documentado — cola G11 §15) · glass-ai__awareness/section 100%
  cubiertos en AISystemPage.css (31 selectores verificados) ·
  ApprovalCard countdown--normal/warning/urgent cubiertos ·
  FamilyAccountGlass status-overdue/delinquent/past_due cubiertos.
- Fix quirúrgico: .glass-hitl__btn-reject-text (HitlCard) faltante en
  HitlQueue.css — 1 selector + 7 líneas, cero colores crudos nuevos.
- Guardian: ratchet intacto (css nuevo X-13=0; los 77 pre-existentes de
  HitlQueue.css cuentan en baseline 15198 — no se tocan).
- Totales parejas tras G10.1+G10.2: 417/423 tsx visuales con css
  (99%) · gap residual = acoplamiento page-css, plan G11.
- Gates estáticos sandbox: selectores 36/36 cubiertos · tokens 25/25
  existentes en globals.css · keyframes únicos · EOL lf.
- END: masters v9.3; protocolo intacto.
```

---

## CHANGELOG G10.1 (v9.1 → v9.2)

```
MIGRACIÓN CSS TRAMO 1 — PAREJA tsx↔css COMPLETA (78/144):
- 78 css NUEVOS de alta calidad (12 arquetipos × 7 dominios semánticos,
  122 keyframes con nombre único — 0 duplicados): banner aurora-sweep,
  gauge ring-draw, modal settle físico, panel stagger-oleada, calendar
  today-breathe, control select-pop, chart grow-in, cards aura-hover,
  chrome ember, state float+skeleton, page rise, print-doc b/n.
  Todos: tokens var() de globals.css · .light overrides ·
  prefers-reduced-motion · focus-visible. CERO rgba/hex/concat crudos
  (color-mix con var(--token) — X-13 en css nuevos: 0).
- tsx wiring quirúrgico: import './X.css' + clase raíz (2 cambios por
  archivo). Casos especiales resueltos: banners delegantes (clase via
  layerConfig), DashboardCanvas (canvas), App (shell body::before),
  print-docs sin imports (import añadido).
- Guardian: 15198 → 15124 (BAJA 74 — ratchet-down, no up).
- 5 archivos NO llevan css por diseño: providers/router/RoleRedirect/
  usePermissionContext/highlight (no visuales) — documentado.
- TRAMO 2 en cola §15: 61 tsx que importan css de OTRO archivo
  (acoplamiento) — desacoplar en G11.
- Gates: build 18.7s ✓ · verify-build-css ✓ (bundle 206903→219587B
  +12.7kB real animado) · VI ALL CLEAR ✓ · tsc -b ✓ ·
  consistency 13/13 ✓ · vitest 6 (=baseline, ratchet intacto).
- END: masters v9.2; protocolo intacto.
```

---

## CHANGELOG G10 (v9.0 → v9.1)

```
OLA 0 — BLINDAJE (PATH NEXT-STEPS-2027) CERRADA:
- .github/workflows/ci.yml (Q-CI-01 ✗→✓): 4 jobs — consistency ·
  frontend (build+verify-build-css+VI+vitest/guardian/eslint ratchet) ·
  backend (uv sync+pytest 818+smoke+ruff/mypy ratchet) · ci-summary.
  Estrategia: GATES DUROS bloquean (hoy verdes) · DEUDA CONGELADA en
  backend/docs/evidence/ci-baseline.json (ratchet: subir = ROJO,
  bajar = bienvenida). Greps del ratchet VALIDADOS contra logs reales.
- scripts/verify-master-consistency.py v1.0.0 (Q-GOV-04 ✗→✓,
  citado inexistente desde G7 #73 — YA EXISTE): MC-01..09
  (masters↔manifest↔tools) + IG-01..04 (BACKEND_REGISTRY §16 vs AST
  del árbol). 13/13 VERDE exit 0 · MUTATION-TESTED. En CI y pre-commit.
  Primer run cazó 2 drifts REALES: verify-build-css sin TOOL_VERSION
  const (agregada) y mcp-router/advisor-engine headers v2.0 vs
  VERSION_SYNC 2.1.0 desde G8 (bump v2.1) — el checker se pagó solo
  el día 1 (lección #77: VERSION_SYNC ya tiene enforcement).
- .pre-commit-config.yaml + .githooks/ (Q-CI-02 ✗→✓): 9 hooks;
  guardian-ratchet y css-token-boundary TESTEADOS (exit 0). El
  `pnpm run precommit` decorativo ahora es real (pre-commit install).
- Evidencia (Q-MSC-04 ✗→✓): 27 .txt/json de trabajo → docs/evidence/
  (26 en club + 1 en backend; raíz y backend/ limpios).
- DECISION-0006 (Intelligence as Code, propuesta del socio): núcleo
  ADOPTADO como olas 5-6 del PATH (ai.manifest+AI Guardian slice+red
  team+evals business); reorganización de dirs ARCHIVADA con criterio
  objetivo. El consistency checker YA ES el primer slice del AI
  Guardian (AG-01/03 aplicado a la capa documental). Doc: docs/
  decisions/DECISION-0006-IAC.md.
- DEUDA QUANTIFICADA (baseline congelado, §15): vitest 6 · guardian
  15198 · eslint 1583 · ruff 1288 (892 autofixables) · mypy strict 735.
  Existía ANTES de e15068e; la CI la vuelve visible y ratcheteable.
- END: masters v9.1; protocolo intacto (regla G8/G9).
```

---

## CHANGELOG G9 (v8.0 → v9.0)

```
- §0.3: Self-Audit REGENERADO (hallazgos #74-#82: la serie B1-B6
  corrió 3 días SIN capa documental — el gate más nuevo del sistema
  (verify-build-css) era invisible a los masters; BACKEND_REGISTRY
  stale en 196; 196→207 re-AST).
- §3.7 NUEVO: SERIE B1-B6 (14 commits) — migración MCP real completa,
  adapters/aliases B3/B4, raw buttons 635→0, VI v3.3.0, P0 utilities.
- §5: plan re-escrito: cola §15 P0 (secrets) primero; CI (Q-CI-01)
  ahora PRÓXIMO PASO inmediato (0 workflows sigue).
- §14: REESCRITO — estado 2026-11-11 @ 504b53d; smoke re-ejecutado
  VERDE en sandbox (19 agentes · 207 tools · 39/39 runtime checks);
  pytest 818/818 (808 def + 10 param).
- §15: cola P0-P3 con estado actualizado (Q-GOV-04 sigue abierto).
- End marker v9.0 G9.
```

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

## §0.3 — MASTER SELF-AUDIT G9 (regenerado — regla de cada generación)

```
METODOLOGÍA: idéntica a G7/G8 (escala BASE §0.2, umbral ≥ 9.3). La
auditoría G9 verificó los masters contra el ÁRBOL REAL en 504b53d
(AST, grep, git log, smoke EJECUTADO) — no contra claims internos.

SCORES G8 → G9:
  MASTER_BASE.md        v8.0: 9.5 → v9.0: 9.5 ✅ (protocolo intacto,
                          sólo estado/datos actualizados)
  MASTER_CHECKPOINT.md  v8.0: 9.4 → v9.0: 9.4 ✅ (absorbe §3.7;
                          §15 cola actualizada; §14 re-escrito)
  MASTER_CHECKLIST.md   v8.0: 9.5 → v9.0: 9.5 ✅ (§16.3 regenerada)

HALLAZGOS G9 (#74-#82 — la deriva que G8 no podía ver):
  🔴 #74  masters congelados: G8 = 2026-11-08; repo = 2026-11-11
          (14 commits: B1-B4 migración MCP + adapters/aliases,
          B5-B6 frontend QA/P0)
  🔴 #75  BACKEND_REGISTRY stale: manifest decía 196 tools @ e15068e;
          el árbol tiene 207 (B2 +1 · B4 +2 · ML +8) — AST re-contado
          por módulo en 0004 → manifest v3.8.0
  🟠 #76  GATE INVISIBLE: verify-build-css.ts v1.0.0 (el gate más
          nuevo del sistema, el que cazó el P0) NO existía para la
          capa documental: ni BASE §2.2 Pilar 10, ni CHECKLIST §16.1,
          ni manifest VERSION_SYNC lo registraban → G9 lo registra
          en los tres + precommit
  🟠 #77  VERSION_SYNC sin consumidores: 7 campos declarados, 0 tools
          los leen — ley sin enforcement (patrón BACKEND_REGISTRY pre
          Q-GOV-01) → cola Q-GOV-05 (nuevo: CI debe fallar si los
          TOOL_VERSION divergen del manifest)
  🟠 #78  smoke_b0 '23/23' citado en docs vs 39/39 runtime real
          (16 statements estáticos + loops: 2 F-8 + 9 B3 + 4 B4 +
          1 B2/B4 estático… = 39 checks ejecutados)
  🟠 #79  VI v3.3.0 (VI-16 comment masker + VI-17 definition sites)
          y guardian v4.1.3 (AG-29/30) sin reflejo en masters
  🟠 #80  pytest 785→818 sin reflejo (B4: +12 def + param)
  🟡 #81  VI info 31 (6F/470-class residual + 12 orphan mocks) —
          pre-existente, no bloqueante, registrado
  ✅ #82  P0 utilities CERRADO: 0002 detectó (118k) · 0003 fix
          (source('..')) · E2E sandbox + usuario cross-check
          (index-V9UQbTlo.css 206.90kB idéntico Windows/Linux);
          build 17.49s → 9.97s en el usuario

QUÉ SE VERIFICÓ CONTRA ARTEFACTOS REALES (método G9):
  - smoke_b0.py EJECUTADO en sandbox: VERDE 19 agentes · 207 tools
    · RBAC 207/207 · HITL · 401 sin token (exit 0) ✓
  - @MCPTool AST per-módulo: 207 total (16+13+11+16+12+7+11+9+14+14
    +6+12+8+8+13+12+5+10+10 = 207) = smoke registry.total_tools ✓
  - pytest collect ≈ 818 (808 def test_ + 10 param) = commit B4 ✓
  - VI --quiet exit 0 · validator PASS 9.89 (consumió manifest
    v3.8.0 post-0004) · tsc --noEmit exit 0 post-0004 ✓
  - git log e15068e..504b53d = 14 commits serie B ✓

MECANISMO ANTI-REGRESIÓN (heredado G8):
  1. Tabla de consistencia CHECKLIST §16.3 — regenerada G9
  2. Q-GOV-04: crear verify-master-consistency.py — SIGUE ABIERTO
     (la regla existe desde G7 #73; G9 lo re-confirma abierto)
  3. Versionado sincronizado G9 (BASE §0.3) ✓
  4. SSOT: audit → manifest §8; backend → manifest §16; deuda →
     CHECKPOINT §15 ✓
  5. LECCIÓN P0 (nueva, estructural): un gate de INPUT no protege
     el OUTPUT — todo gate debe mirar el ARTEFACTO (dist/), no
     sólo las fuentes. verify-build-css es el primer gate de
     OUTPUT del sistema.

(Bloque G8 histórico preservado abajo para trazabilidad.)

METODOLOGÍA: idéntica a G7 (escala BASE §0.2, umbral ≥ 9.3). La auditoría
G8 verificó los masters contra el ÁRBOL REAL en e15068e (AST, grep, git
log) — no contra claims internos.

SCORES G7 → G8:
  MASTER_BASE.md        v7.0: 9.5 → v8.0: 9.5 ✅ (protocolo intacto,
                          sólo estado/datos actualizados)
  MASTER_CHECKPOINT.md  v7.0: 9.5 → v8.0: 9.4 ✅ (§13/§14 estaban stale
                          — el score baja por los hallazgos absorbidos)
  MASTER_CHECKLIST.md   v7.0: 9.5 → v8.0: 9.5 ✅ (§16 re-verificado)

HALLAZGOS G8 (#61-#73 — la deriva que G7 no podía ver):
  🔴 #61  masters congelados: G7 = 2026-08-12; repo = 2026-11-07
          (28 commits: G28-G37 · Bld1-6 · perf · P2-C1..C3h · B0)
  🔴 #62  REGRESIÓN REAL de código: 290afa4 (P2-C3e/f) aplicó su parche
          sobre la base pre-P2B y BORRÓ f11d8e7 (VI-12 check 8 refs
          no-hook + check 4 EOL-insensible + v3.1.0). El VI en HEAD
          decía v3.0.0 sin VI-12. → G8 RESTAURADO (v3.2.0 + VI-15);
          el .bak-p2c3e (v3.2.0, con VI-12, sin VI-14) era el vestigio.
  🟠 #63  M-04a CERRADO: manifest VERSION_SYNC.validator "pending-audit"
          vs CHECKLIST §16.1 "v4.0.0" → "4.0.0" factual + audit
          pendiente explícito en ambos lados (versión ≠ claim de audit)
  🟠 #64  docs/ARCHITECTURE.md dice "11 Agents" (real: 19) → Q-MSC-03
  🟠 #65  BASE §6.1 "backend ~123 files NO SE TOCA" contradecía la fase
          activa P2-C3 → scope redefinido §4.3 + §6.1 re-contado
  🟠 #66  gobernanza frontend-only: guardian 0 checks sobre backend
          (19 agentes/196 tools sin gate de drift) → manifest §16
          BACKEND_REGISTRY (v3.4.0) + cola Q-GOV-01/03
  🟠 #67  §13/§14 stale: pedían los 7 shared/ YA auditados en G9 y
          EventCalendar "BLOCKED" ya desbloqueado → regenerados
  ✅ #68  data/chromadb en .gitignore raíz — RESUELTO en e15068e
          (verificado: línea presente; chroma.sqlite3 sin rastrear)
  🟠 #69  conteo de agentes divergente: 11 (docs) / 19 (smoke) / 20
          (módulos) → G8 fija 19 CANON (bootstrap._AGENT_MODULES por
          AST); age_group_activity.py = código muerto → Q-MSC-01
  🟡 #70  tests/unit/agents sin __init__.py (asimetría vs auth/api)
          → Q-MSC-02
  🟠 #71  estado de P2-C3h vivía sólo en reportes .txt (~470 KB) sin
          absorber → G8 absorbe lo esencial (§3.6); reportes quedan
          como evidencia de archivo
  🟠 #73  BASE §0.3 G7 citaba scripts/verify-master-consistency.py como
          mecanismo anti-regresión — NO EXISTE en el repo (find vacío).
          Crearlo = Q-GOV-04 (y es irónico: el guard de consistencia
          era consistente sólo en la imaginación de G7).

QUÉ SE VERIFICÓ CONTRA ARTEFACTOS REALES (método, no claims):
  - bootstrap._AGENT_MODULES → AST: 19 módulos ✓ (no grep difuso)
  - @MCPTool por AST sobre los 19 archivos: 196 total ✓
    (= smoke_b0 registry.total_tools — paridad ejecutable)
  - git show f11d8e7/290afa4: diff real de la regresión #62 ✓
  - .gitignore raíz: línea chromadb presente ✓ (#68)
  - find verify-master-consistency*: 0 resultados ✓ (#73)
  - HealthFactorStatus en advisor-engine/types.ts:517: inglés ✓ (BC-01)
  - find frontend/src = 1163 · backend/src = 105 (104 .py) ·
    backend/tests = 27 archivos/775 test_ ✓

MECANISMO ANTI-REGRESIÓN (heredado G7, corregido G8):
  1. Tabla de consistencia CHECKLIST §16.3 — regenerada G8
  2. Q-GOV-04: crear verify-master-consistency.py REAL (G7 lo citaba
     inexistente — #73; la regla sigue siendo correcta, el artefacto no)
  3. Versionado sincronizado G8 (BASE §0.3) ✓
  4. SSOT: audit status → manifest §8; estado backend → manifest §16;
     deuda → CHECKPOINT §15. Jamás listas manuales paralelas.
  5. Todo conteo con matemática/origen explícito al lado ✓
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

### §3.6 P2-C3 · AUDITORÍA DE INTEGRACIÓN MCP + GATE B0 (✅ CERRADA 2026-11-07)

```
LÍNEA DE TIEMPO (fases sin commit propio entraron pre-historizadas en
4c5d885 "First Step"; evidencia = scripts/p2*.ts + reportes .txt):

  P2-C1  tokens de colores al manifest (p2c1_tokens.ts)
  P2-C2  patch de gobernanza (p2c2_patch.ts)
  P2-C3a-d  probe → inventory → registration hunt → final verdict
         (el veredicto: el backend MCP es REAL — 19 agentes/196 tools;
         el frontend llamaba mocks; de ahí todo lo que sigue)
  P2-C3e/f  VI-14 v2: extractor motor-based + 5 estados en check 6
         ( commits 290afa4 · f11d8e7 — con la regresión #62)
  P2-C3g  MIGRACIÓN REAL (00417eb): 18 llamadas frontend → tools MCP
         reales (#1 #2 #5 #6 #9 #10 #11 #16, D5, C16) — multi-dominio:
         communications, engagement, facilities, guests, wellness
  P2-C3h  batches b0..b0v sobre el backend:
           · b0v fixes de PRODUCCIÓN: 7 src + 4 tests — imports a
             club_mcp.services (paquete nunca existió), factory
             get_claude_service ausente, RBAC str(enum) jamás en
             WRITE_LEVELS, search_similar_rag embed_query("") siempre
             ValueError, umbral RRF inalcanzable, populate_content no
             expuesto, filterwarnings INTERNALERROR
           · py3.14: ignore chromadb 1.5.9 asyncio.iscoroutinefunction
  GATE B0 (ejecutable, no documental):
           · backend/scripts/smoke_b0.py — 23/23 VERDE
             (composición 19 · registro 196 · resolve + 4 aliases ·
              RBAC 196/196 · HITL ejecuta · FastAPI self-wired ·
              HTTP 200/401)
           · pytest tests/unit — 785/785 (py3.12 sandbox + 3.14.4
             Windows usuario · 32.7s)
           · commit e15068e empujado a origin/audit/p2c3 · árbol
             limpio · chroma.sqlite3 fuera de rastreo (.gitignore)

QUEDÓ FUERA DE B0 (by design, ver §14/§15): B1 (4 migrables) · B2 (15
cross-agent, incl. reports.get_board_report hoy rechazado por diseño) ·
toda la cola P0-P3 de §15.
```

---

### §3.7 SERIE B1-B6 · MIGRACIÓN MCP REAL + QA/P0 (✅ CERRADA 2026-11-11)

```
LÍNEA DE TIEMPO (e15068e → 504b53d, 14 commits — evidencia: git log
+ worklog sandbox + outputs de gates re-ejecutados):

  B1   4 llamadas restantes migrables (backlog p2c3h §A)
  B2   reports.get_board_report registrado (tool AUTO + create-on-demand,
       lectura sin HITL) + mock dev del server en el registry frontend
  B3   ADAPTER LAYER: 8 tools reales + compat aliases — resolve por
       agente legacy (reports/families/engagement/finance/facilities/
       guests) · VI parsea registry.py (§6: 0 warnings)
  B4   event reads (get_event + list_events AUTO) + aliases
       audit-driven (events→event_orchestrator, finance.decision_simulate
       → advisor simulate_scenario, renames ×3) · VI alias-aware
       (§6 40→19) · dev-mocks legacy · ERR_PNPN_IGNORED_BUILDS (core-js)
  B5   raw <button> 635→0 vía codemod (<Button variant=unstyled>) ·
       D11 dark media query · pnpm field muerto
  B6   VI v3.3.0 (VI-16 comment masker + VI-17 definition sites — check 3
       phantom tokens honesto; check 8 refs no-hook) · QA defects (0001) ·
       P0 UTILITIES: @import "tailwindcss" source(".") relativo al
       STYLESHEET → scan colapsado a .css → capa utilities PERDIDA
       207k→118k (build verde, tsc verde, 0 gates miraban OUTPUT) →
       fix source('..') (0003) → E2E: bundle 206.90kB · utilities ✓ ·
       familia font ✓ · piso ✓ · sin fugas ✓ · hash idéntico
       Windows/Linux (determinístico cross-OS)

GATES AL CIERRE (re-ejecutados G9 en sandbox):
  smoke_b0 VERDE (19 · 207 · RBAC 207/207 · HITL · 401) exit 0
  VI ALL CLEAR (0 err · 0 warn · 31 info) exit 0
  validator PASS 9.89 (422 files scored) exit 0
  vitest 9/9 (verify-integration.check3) exit 0
  tsc --noEmit exit 0 · build 9.97s (usuario) 0 warnings

QUEDÓ FUERA (by design): B2-full cross-agent (15 llamadas) · cola §15
P0-P3 completa · FASE 2 frontend congelada (sigue) · CI inexistente.
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
IMMEDIATE NEXT STEPS (G8 — re-escrito al estado real 2026-11-08):

STEP 0: ✅ ABSORBIDO EN G8 — masters v8.0 sincronizados con e15068e;
        VI restaurado (#62); M-04a cerrado (#63); V-03 cerrada (BASE §6.1
        con cifras AST-verified); #68 verificado.

STEP 1: B1 — 4 llamadas migrables restantes
        (mapa: p2c3h_backlog_report.txt §A/§H · deuda de campos
        camel↔snake: Reservation 9 renames, Family 14v7, D5 FacilityMap)

STEP 2: B2 — 15 llamadas cross-agent + reports.get_board_report
        (hoy rechazado por diseño — desbloqueo de write-path con HITL;
         cruzan agentes: finanzas→events, wellness→families, etc.)

STEP 3: COLA §15 POR PRIORIDAD — empezar por P0 (secrets: Q-SEC-01
        secreto JWT hardcodeado → get_settings(); Q-SEC-02 api_key;
        Q-SEC-03 create_admin; Q-SEC-04 user_role="admin" hardcodeado
        en search_documents = bypass del access control RAG)

STEP 4: REANUDAR FASE 2 FRONTEND (Events) — congelada desde G7:
        EventCalendar finalización → EventDetail → EventForm → 13 comp
        (los 7 shared/ bloqueantes ya están auditados G9 — §13)

STEP 5: Q-CI-01 GitHub Actions (frontend vitest+tsc+guardian; backend
        ruff+mypy+pytest+smoke_b0) — hoy TODO manual, 0 workflows

THEN: Wave 1-6 feature migration (§9) + P1 persistencia (Q-PER-01..04)

VERIFICATION TASKS (estado G8):
  V-01: conteo shared/ (~197) — sigue ABIERTA
  V-02: tabla de scores por-archivo FASE 1 — sigue ABIERTA
  V-03: ✅ CERRADA G8 (BASE §6.1: 104 .py src · {be_src} files ·
        {be_tests} test files — AST/find verificados)
  M-01: extender AUDITED_REGISTRY a features/ — sigue ABIERTA
  M-02: reconciliar path de globals — sigue ABIERTA
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

BACKEND (P2-C3 · absorbido G8 — fuente: gates ejecutables):
  Tests unit: 775 funciones test_ · 785 PASSED / 0 FAILED
    (py3.12 sandbox · 3.14.4 Windows usuario · 32.7s)
  Smoke B0: 39/39 runtime · agentes 19 · tools 207 ·
    RBAC 196/196 · HITL cierra (2 executores)
  Fixes producción b0v: 7 src + 4 tests (commit e15068e)
  Tooling declarado: ruff · mypy strict · coverage branch fail_under 70
  DEUDA (ver §15): persistencia 100% in-memory · secrets hardcodeados ·
    0 CI · 0 retry en LLM · 36 executores HITL huérfanos

TOLERANCE: ZERO
```

---

## §7 — BREAKING CHANGES REGISTRY

```
BC-01: HealthFactorStatus values (types.ts)
  BEFORE: "excepcional" | "saludable" | "atención" | "crítico"
  AFTER:  "exceptional" | "healthy" | "attention" | "critical"
  FIX:    grep -r "excepcional\|saludable\|atención\|crítico" src/
  STATUS: ✅ APPLIED (G33, literals ES→EN) — verificado G8 contra
          advisor-engine/types.ts:517 ("exceptional"|"healthy"|
          "attention"|"critical"); el grep del FIX matchea COPY de
          UI en español, no valores del tipo — no re-aplicar

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
║  ACTUALIZADO G8 (#67 — v7.0 pedía lo ya resuelto en G9)                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  RESUELTO G9 (Lote 5 · manifest v3.3.0 · PENDING_AUDIT.size = 0):      ║
║    ScoreGauge · FreshnessBadge · StaleDataBanner · Skeleton ·           ║
║    useBreakpoint · PageContainer · PermissionGate — auditados ≥ 9.3     ║
║    (20 hallazgos G9-01..G9-20 cerrados — ledger §15 del manifest)       ║
║                                                                          ║
║  PENDIENTE REAL (G8):                                                   ║
║    ⬜ EventCalendar.tsx + .css — finalización (FASE 2, sin blockers)   ║
║    ⬜ EventDetail → EventForm → 13 components (FASE 2)                   ║
║    ⬜ shared/lib/utils.ts — PENDING REWRITE (7.2, U-01..U-06, RC-3)     ║
║    ⬜ task M-01: 9 archivos de events NO están en AUDITED_REGISTRY      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## §14 — CURRENT STATE & PENDING ASKS

```
╔══════════════════════════════════════════════════════════════════════════╗
║  WHERE WE ARE EXACTLY — 2026-11-11 (G9 @ 504b53d)                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  TRACK ACTIVA: post-B6 — mantenimiento de integridad continua          ║
║  GATE B0: ✅ CERRADO y RE-VERIFICADO G9 (504b53d · sandbox)        ║
║    · smoke_b0.py 39/39 runtime · pytest 818/818 (3.12+3.14.4)         ║
║    · backend: 19 agentes · 207 tools · RBAC 207/207 · HITL              ║
║      ejecuta (2 executores) · FastAPI self-wired · 401 sin token        ║
║    · masters G9 absorben todo el estado (esta generación)              ║
║                                                                          ║
║  TRACK FRENTE (frontend): FASE 2 Events sigue congelada; PERO la      ║
║    integridad frontend dio un salto: B5 (635 raw buttons → 0 vía      ║
║    codemod) · B6 (VI v3.3.0 honesto) · P0 utilities cazado y fixeado   ║
║    (gate NUEVO verify-build-css v1.0.0 en precommit) — ver §3.7.     ║
║                                                                          ║
║  BLOCKED: nada activo. reports.get_board_report se rechaza POR DISEÑO  ║
║    hasta B2 (no es defecto).                                            ║
║                                                                          ║
║  WHAT I NEED TO CONTINUE (in order):                                    ║
║                                                                          ║
║  REQUEST 1 (decisión de producto — B2-full):                          ║
║  └── B2: 15 cross-agent restantes (write-path HITL; board_report      ║
║      read ya registrado B2) — ¿go/no-go?                            ║
║                                                                          ║
║  REQUEST 2b (tramo 2 CSS — post-Ola 1, no bloqueante):          ║
║  ├── 61 tsx importan css de OTRO archivo (acoplamiento):      ║
║  │   desacoplar → pareja propia por archivo (idioma T1)       ║
║  └── 65 keyframes duplicados preexistentes (deuda CSS vieja   ║
║      X-13 9068 en css legacy — ratchet CI ya congela)         ║
║                                                                  ║
║  REQUEST 2 (P0 de la cola §15 — bloqueante para desplegar):            ║
║  ├── Q-SEC-01 secreto JWT hardcodeado (jwt_service.py:12) →             ║
║  │   get_settings() + env (pydantic-settings ya está, NADIE lo consume) ║
║  ├── Q-SEC-02/03 api_key="" + create_admin password vacío               ║
║  └── Q-SEC-04 user_role="admin" hardcodeado en search_documents         ║
║      (document_intelligence_agent.py:93) — bypass del RAG ACL           ║
║                                                                          ║
║  REQUEST 3 ✅ RESUELTO G10 (Ola 0 blindaje — ver CHANGELOG G10):              ║
║  ├── Q-CI-01 GitHub Actions (gates ya existen: guardian/vitest/tsc +    ║
║  │   smoke_b0/pytest — sólo falta el workflow)                          ║
║  └── Q-GOV-04 verify-master-consistency.py v1.0.0 EXISTE (13/13 VERDE)  ║
║                                                                          ║
║  OLA 0 ✅ CERRADA (2026-11-11 G10): CI 4 jobs + consistency checker
║      v1.0.0 (13/13 VERDE, 2 drifts reales cazados día 1) + pre-commit
║      real + evidencia ordenada + DECISION-0006 (IAC adoptado olas 5-6).
║      NEXT (orden §15): Ola 1 SEGURIDAD P0 (Q-SEC-01..04):
║      secrets a env + rol real del JWT en RAG — red-team RT-01 mínimo
║      como gate de salida (injection no revela secret).
║      (Q-CI-01/02, Q-GOV-04, Q-MSC-04 CERRADOS este commit — ver §15.)
║                                                                          ║
║  DEUDA CUANTIFICADA (ratchet CI — backend/docs/evidence/ci-baseline   ║
║  .json · congelada 2026-11-11 @ 03dc0bd · SUBIR = CI ROJA):           ║
║  ├── vitest 6 fails (guests/lib tests stale PRE-e15068e — deuda      ║
║  │   #G10-1, no de G9/B-series)                                      ║
║  ├── guardian 15198 err (muro M-01/FASE 2 — score 8.2 vs 9.3)       ║
║  ├── eslint 1583 err (nunca fue gate; unused/any en legacy)         ║
║  ├── ruff 1288 err (892 autofixables — ratchet-down fácil)          ║
║  └── mypy strict 735 err (typing capa db/ legacy)                   ║

║      PANORAMA: gates TODOS existen ya:    ║
║      frontend guardian/vitest/tsc/verify-build-css · backend          ║
║      ruff/mypy/pytest/smoke — sólo falta el workflow YAML)            ║
║  AFTER: FASE 2 frontend (EventCalendar → 13 comp) · P1 persistencia     ║
║  (SQLAlchemy+Alembic ya en deps, fantasma) · P2 LLM ops (retry/fallback ║
║  Ollama) · ver §15 para el mapa completo                                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## §15 — COLA DE ARQUITECTURA (NUEVO G8 — SSOT de deuda production-grade)

```
REGLA: esta sección es el REGISTRO de deuda. Un ítem entra con ID
Q-<ÁREA>-NN y NO sale hasta que su fix tiene commit + gate verde.
Prioridad = orden de ejecución recomendado. Nada de esto es opcional
para "PRODUCTION GRADE 2027" — todo lo demás sí puede esperar.

═══ P0 · SEGURIDAD (bloqueante para CUALQUIER despliegue) ═══
  Q-SEC-01  jwt_service.py:12 — secreto HS256 hardcodeado →
            get_settings() + env var. pydantic-settings está en deps
            con 0 consumidores (settings.py jamás importado en src).
  Q-SEC-02  claude_service.py:37 — api_key="" default → settings,
            fail-fast en producción si falta.
  Q-SEC-03  backend/create_admin.py — asyncpg.connect(password="")
            hardcodeado → CLI con env/getpass; además el script es
            ad-hoc de diagnóstico, no tooling.
  Q-SEC-04  document_intelligence_agent.py:93 — user_role="admin"
            hardcodeado (TODO propio del archivo) en search_documents:
            anula el access control por rol del vectorstore. → rol
            real del JWT.

═══ P1 · PERSISTENCIA (restart = pérdida total de estado) ═══
  Q-PER-01  18 repositorios 100% in-memory con seeds hardcodeados →
            SQLAlchemy async + PostgreSQL (deps DECLARADAS y fantasma:
            sqlalchemy[asyncio], asyncpg, pgvector).
  Q-PER-02  Alembic: dep declarada, CERO alembic.ini/migraciones →
            init + primera migración.
  Q-PER-03  ApprovalEngine: dict en memoria (docstring propio lo
            admite) → tabla approvals + expiración persistente.
  Q-PER-04  Usuarios seed en memoria (routes/auth.py:17) → tabla +
            seed script (los 4 roles con bcrypt ya correcto).

═══ P1 · CI / AUTOMATIZACIÓN (todo manual hoy) ═══
  Q-CI-01   .github/workflows — NO EXISTE .github/ en el repo. Gates
            ya disponibles: guardian + vitest + tsc (frontend) ·
            ruff + mypy strict + pytest 785 + smoke_b0 (backend).
  Q-CI-02   .pre-commit-config.yaml — pre-commit>=4.0 en dev-deps,
            config ausente; el script "precommit" de package.json
            nunca lo ejecuta git (hook inexistente).

═══ P2 · LLM OPS (resiliencia + costo — "moderno AI" de verdad) ═══
  Q-LLM-01  claude_service: try/except ÚNICO por método — sin retry,
            sin timeout, sin backoff, sin fallback a Ollama (ollama
            está en settings y NUNCA se consume). → política de
            reintentos + circuit breaker + fallback local.
  Q-LLM-02  Token/cost accounting: usage se devuelve y se descarta →
            persistir + presupuesto + alertas.
  Q-LLM-03  Prompts (ai/prompts.py, 814 líneas) = constantes sin
            versionado → registro con hash/versión por prompt.
  Q-LLM-04  Evals: golden set + LLM-as-judge (markers pytest
            slow/integration/hitl existen; suites no).

═══ P2 · GOBERNANZA BACKEND (cerrar el perímetro — #66) ═══
  Q-GOV-01  guardian backend-aware: checks X-29+ consumiendo
            BACKEND_REGISTRY (manifest §16) — drift backend = error,
            en paridad con smoke_b0.
  Q-GOV-02  absorber SHARED_COMPONENT_NAMES/GENERIC_KEYFRAMES/
            MCP_CHAIN_EXEMPT/ADVISOR_EXEMPT/EXTRA_BANNED_ANIMATION_LIBS
            del guardian al manifest (TODO propio del tool, §3).
  Q-GOV-03  VI check 6: validar contra BACKEND_REGISTRY además del
            extractor VI-14 motor-based.
  Q-GOV-04  crear scripts/verify-master-consistency.py — citado por
            G7 §0.3, INEXISTENTE (#73). Debe validar: versionado
            sincronizado 3 masters · tabla §16.3 · paridad BACKEND_REGISTRY
            vs smoke_b0.

═══ P3 · HITL COMPLETO ═══
  Q-HITL-01 dual approval: modelado (requires_dual_approval,
            first/second_approval_by) pero approve() no lo aplica.
  Q-HITL-02 notifier real: stub documentado (email/WhatsApp/push).
  Q-HITL-03 36 executores HITL huérfanos (solo 2 registrados en
            bootstrap._EXECUTOR_BINDINGS).

═══ P3 · OBSERVABILIDAD ═══
  Q-OBS-01  structlog en deps con 0 usos → logging estructurado real
            + /metrics + healthcheck con probe real (DB/LLM — el
            actual es un dict estático).
  Q-OBS-02  rate limiting en /api/agents/* y /api/chat (0 hoy).

═══ P3 · HIGIENE ═══
  Q-MSC-01  agents/age_group_activity.py — código muerto (no está en
            _AGENT_MODULES, sin @MCPTool): borrar o registrar.
  Q-MSC-02  tests/unit/agents sin __init__.py (asimetría vs auth/api).
  Q-MSC-03  docs/ARCHITECTURE.md — "11 Agents" → 19 + stack real.
  Q-MSC-04  .bak-p2c3e y reportes .txt (~470 KB) en el tree —
            mover a docs/evidence/ o .gitignore selectivo.

CONTEO: P0=4 · P1=6 · P2=8 · P3=9 → 27 ítems (matemática explícita).
```

---

END OF MASTER_CHECKPOINT.md v9.5 · Generación G12 (sincronizada con
MASTER_BASE.md v9.5 y MASTER_CHECKLIST.md v9.5)

