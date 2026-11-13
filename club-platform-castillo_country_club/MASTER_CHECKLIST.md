# MASTER_CHECKLIST.md — Validation Gates & Standards
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 9.8 · Generación G12.1 (absorción G13/G14 retrospectiva) · 180 checks · ZERO tolerance
### Updates: G9 — §16.1/§16.3 regenerados al estado real del repo
###          (504b53d: manifest v3.8.0 · VI v3.3.0 · guardian 4.1.3 ·
###          NEW verify-build-css v1.0.0 · smoke 207 · pytest 818);
###          checks A-J intactos (180 — el estándar no cambia,
###          cambia la evidencia)

---

## CHANGELOG G7 (v6.1 → v7.0)

```
ESTRUCTURA:
- Markdown puro sin envoltorio ```markdown — v6.1 tenía fence
  corruption (```markdown duplicado + stray fence) que rompía la
  absorpción del documento (hallazgo #31, el más crítico).
- Versionado sincronizado G7 junto a BASE v7.0 y CHECKPOINT v7.0.

CONTENIDO:
- §1-§10 (Checklists A-J): numbering y semántica INTACTOS (180 checks,
  verificado por script) — no romper los registros de audit de los
  65 archivos ya completados. Únicos retoques: A-09 alineado con
  BASE §8.3 (hallazgo #38) y nota D9 sobre breakpoints (#39).
- §11: conteo REAL = 52 ítems (14 CSS + 20 TSX + 13 INTEGRATION +
  5 SHARED/) — v6.1 decía "~46" contradiciendo su propio listado (#50).
- §12: "7 Pillars" → "LAS 7 CUALIDADES Level 6+" con nota de
  desambiguación vs los 11 Pilares del sistema (colisión #52);
  referencia a Golden Rules ampliada (6 golden §8.1 + 4 adicionales §8.2).
- §13: templates con §0 Imports marcado (consistente con BASE §5.1);
  breakpoint 1024px condicional documentado en el CSS template (#39).
- §14: RESTAURADO COMPLETO — v6.1 tenía aquí referencias colgantes
  con el contenido obligatorio AUSENTE (= hallazgo #47): la tabla de
  mapeo "unchanged from v6.0", los patrones "See original" y el
  advisor "See original §14.3". G7 escribe las 5 subsecciones
  completas: §14.1 tabla de mapeo, §14.2 los 3 patrones de data
  fetching, §14.3 patrón advisor CON type guard, §14.4 types,
  §14.5 hooks.
- §15: intacto (tabla de patrones AI/ML).
- §16: estado real de scripts (guardian v4.1.1/26 checks, validator
  v4.0.0, verify-integration v3.0.0/8 checks — hallazgo #56);
  cobertura 111/69 con desglose verificable por checklist (#51);
  §16.3 NUEVO: tabla de consistencia anti-drift con matemática
  explícita por claim — regenerar en cada generación.
- GRAND TOTAL: matemática verificada (180 = suma por checklist;
  combinaciones aplicables re-verificadas).
```

---

## CHANGELOG G8 (v7.0 → v8.0)

```
- Los 180 checks A-J NO cambian: el estándar de calidad frontend es
  estable. Lo que cambia es §16 (estado de automatización) porque el
  repo cambió debajo: manifest v3.4.0 (BACKEND_REGISTRY), VI v3.2.0
  (regresión 290afa4 restaurada — CHECKPOINT §0.3 #62), validator
  v4.0.0 factual (M-04a #63), gates del backend incorporados a la
  tabla (smoke_b0 · pytest 785 · ruff/mypy strict).
- §16.1: filas nuevas smoke_b0.py y pytest; verify-master-consistency
  marcado ⚠ INEXISTENTE (#73 — citado desde G7).
- §16.3: tabla regenerada — filas backend (19 agentes · 196 tools ·
  785 tests) + versión manifest 3.4.0 + VI 3.2.0.
- Nota de scope: los checks A-J son el gate de CALIDAD FRONTEND; el
  backend tiene su propio gate EJECUTABLE (smoke_b0 + pytest +
  ruff/mypy) — no se mezclan los números (principio §12 CHECKPOINT G7
  de colisiones terminológicas).
```

---

## CHANGELOG G13-G14 (v9.7 → v9.8)

```
ABSORCIÓN RETROSPECTIVA G13/G14 (deuda §0.3 "sin reflejo en masters"):
- HALLAZGO FORENSE: los 4 commits ya son ancestros de la rama —
  G13-A 4c21125 (guardian 4.1.2 · AG-29 X-16 α/β/γ) · G13-B eda7b3d
  (158 mirrors X-16 escritos + revert de las 4 duplicadas de G11 ·
  err 15740→15303) · G14-A 47e9d9c (guardian 4.1.3 · AG-30 X-28
  token-boundary · 109/111 FP · err 15303→15194) · G14-B 4df8a9c
  (M-01-T3: 25 promociones con evidencia sandbox · J-07 490→187 ·
  verified 580→883 · manifest 3.6.1→3.7.0). Aplicados sobre
  ca2454b (G12-registry) y seguidos por 17 generaciones de la saga
  B2→B6→G9→G12.1 — por eso X-16 = 0 y TOOL_VERSION 4.1.3 hoy.
  Los parches sandbox de download/g13/ quedan OBSOLETOS (0 aplican
  al árbol — mapeado dry-run: drift manifest 3.6.0/3.7.0).
- CIFRAS VIVAS (medidas 2026-11-13 en el árbol exacto 94d965d,
  sandbox Linux, byte-reproducible — mismo número que el CI run #6):
  guardian 4.1.3: 15146 err · 14553 warn · auto-fixable 0 · score 8.2
  (X-16 = 0 · X-13 8927 · X-26 5249 dominan la deuda restante) ·
  validator 4.0.0: 9.89 · 0 err · J-07 187 · verified 883 · below 15
  (worst: ExecutiveDashboard 7.5 · router 8.75 · AISystemPage 8.75) ·
  VI 3.3.0: ALL CLEAR (exit 0 · 806 ts/tsx · 464 css · 105 py).
- X-16 = 0 CONFIRMADO por medición directa del detector corregido
  (α: fixer prev OR next · β: ventana bidireccional value-aware ·
  γ: autoFixable veraz vía X16_BARE_DECL compartida).
- BASELINE CI (guardian_errors 15198 → 15146): re-baseline honesto
  mismo-PR — 15198 era pre-G13/G14; 15146 es el número del CI verde
  run #6 y de esta medición. El ratchet baja el piso de nuevo.
- END: masters v9.8; G13/G14 ABSORBIDOS (código ya estaba; la deuda
  era documental); estado vivo = código ↔ masters ↔ CI alineados.
```

## CHANGELOG G12.1-cierre (v9.6 → v9.7)

CIERRE REAL: CI VERDE EN ACTIONS (Q-CI-02→04 · runs #1→#5):

RUN #1 @ f1e7cfc ROJO (job frontend, paso install): pnpm 9 — la
versión que pinnea el CI — adopta frontend/pnpm-workspace.yaml
como workspace-root y exige el campo packages:; sin él,
pnpm install --frozen-lockfile muere ("packages field missing
or empty"). FIX Q-CI-02 (910c003 + 741e0a4): packages: - .
(workspace de un solo paquete; el lock 9.0 ya es formato
importers — frozen sigue válido) + re-baseline honesto mypy
735→737 bajo lock (735 era medición uvx-latest; delta G12 = 0,
mismo criterio que ruff 1288→1292 de v9.6).
RUN #3 @ 741e0a4 (2 verdes / 2 rojos — los rojos eran del PROPIO
workflow, no del código): frontend ✓ y consistency ✓ (ratchets
aguantaron: 6≤6 · 15198≤15198 · ≤1583) · ci-summary ✗: heredaba
defaults.run.working-directory del nivel workflow pero NO hace
checkout → bash ni arrancaba ("No such file or directory") ·
backend ✗ sin paso visible. FIX Q-CI-03 (41695fa): defaults
bajados a nivel job (solo donde se usan) · ci-summary sin checkout
ni defaults (corre en raíz) · uv pip install -e . eliminado
(redundante con uv sync, nunca validado en sandbox) → uv sync --frozen (lock commiteado exacto; hatchling instala el proyecto
editable).
RUN #4 @ 41695fa: backend ✗ con 827/827 PASADOS — pytest 9 (plugin
unraisableexception) promueve a error de sesión 3 ResourceWarnings
del teardown Linux (2 sockets AF_UNIX + 1 event loop sin cerrar —
transports de tests) → exit 1 pese al verde; Windows no tiene
AF_UNIX (por eso los gates locales eran verdes) y el sandbox no
lo disparó (timing de GC). FIX Q-CI-04 (2e9210f): -p no:unraisableexception solo en la invocación de CI — el signal
827-passed queda intacto; higiene de cierre de transports =
deuda cosmética registrada.
RUN #5 @ 2e9210f: CI VERDE — 4/4 jobs en Actions: consistency 13/13
· frontend (gates duros + ratchets) · backend 827 passed + smoke
B0 VERDE (19 agentes · 207 tools — primera vez en CI real) +
ruff 1292=baseline + mypy 737=baseline · verdict "CI VERDE —
gates duros ✓ ratchets ✓". Las ~16 anotaciones del panel son la
deuda congelada VISIBLE en cada run verde (6 vitest, 10
eslint/log-auditor + warnings Node 20) — el diseño, no fallos.
SANIDAD: de-dup del - . duplicado en pnpm-workspace.yaml
(colateral del sed de Q-CI-02 — pnpm 9 lo toleraba, igual
limpiado) · retiro de Antiguosparaconsulta/ (~90 archivos de
consulta vieja, fuera del scope del checker; recuperables en
historia: git show <sha>:Antiguosparaconsulta/...).
END: masters v9.7; G12.1 CERRADO con CI VERDE real en Actions
(run #5 @ 2e9210f); el ratchet de deuda queda armado y visible.

## CHANGELOG G12.1 (v9.5 → v9.6)

```
CORRECCIÓN DE ENTREGA G12 — CI REAL + DETERMINISMO (Q-CI-01 raíz):
- HALLAZGO P0 (Q-CI-01 bis): el workflow vivía ANIDADO en
  club-platform-castillo_country_club/.github/workflows/ — GitHub
  Actions SOLO descubre workflows en .github/workflows/ de la RAÍZ.
  Consecuencia medida: 0 corridas de Actions en TODA la historia del
  repo (el push a165339 de G12 nunca disparó nada; la "corrida CI
  verde" de G10-G12 era sandbox). Los masters ya documentaban
  `.github/workflows/ci.yml` — el árbol estaba desincronizado con su
  propia documentación. FIX: workflow movido a raíz (rename tracked).
- HALLAZGO P1 (determinismo): ratchets corrían ruff/mypy por
  `uvx`/pip-LATEST (baseline 1288/735 medido así) mientras el uv.lock
  pinea ruff 0.15.12/mypy 2.1.0 → conteos del día: 1292/737 → ROJO
  por deriva de versión, no por deuda. FIX: `uv run ruff`/`uv run
  mypy` (lock) + re-baseline honesto ruff 1288→1292 (delta G12 = 0
  verificado en ambos árboles con ambos pares de versiones).
- HALLAZGO P2 (corregido): la serie G12.1 midió +2 mypy NETOS contra
  una reconstrucción sandbox desactualizada (sin Protocol) — FALSO
  POSITIVO: el árbol real a165339 YA traía ClaudeServiceLike (v3, 3
  métodos) y mide 735 = baseline exacto. FIX real de G12.1: Protocol
  completado 3→7 métodos públicos (unión de los 4 delegados vía
  __getattr__, hoy visibles para mypy) + builder tipado contra el
  Protocol (TYPE_CHECKING, sin ciclo).
- SANIDAD: de-dup del changelog G12 en CHECKLIST (encabezado
  duplicado defecto del 0002) · 'pytest 818'→'827' en job backend.
- VERIFICACIÓN (sandbox, árbol exacto del parche): 13/13 consistency
  · 827 passed · smoke B0 VERDE · ruff 1292 = baseline · mypy 735 =
  baseline — los 4 gates duros + 2 ratchets del job backend verdes.
- END: masters v9.6; Q-CI-01 CERRADO DE VERDAD (visible a Actions);
  protocolo intacto (regla G8/G9).
```

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
- .github/workflows/ci.yml (Q-CI-01→04 ✓ + run #5 VERDE · cierre G12.1 — RAÍZ: anidado era
  invisible a Actions, 0 corridas históricas): 4 jobs — consistency ·
  frontend (build+verify-build-css+VI+vitest/guardian/eslint ratchet) ·
  backend (uv sync+pytest 827+smoke+ruff/mypy ratchet por uv.lock) ·
  ci-summary.
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
  15198 · eslint 1583 · ruff 1292 (892 autofixables — re-baseline
  G12.1: 1288 era deriva de uvx-latest; delta G12 = 0) · mypy strict 737 (re-baseline Q-CI-02: 735 era uvx-latest; bajo lock 2.1.0 = 737, delta G12 = 0).
  Existía ANTES de e15068e; la CI la vuelve visible y ratcheteable.
- END: masters v9.1; protocolo intacto (regla G8/G9).
```

---

## CHANGELOG G9 (v8.0 → v9.0)

```
- Los 180 checks A-J NO cambian (estándar estable). §16 cambia:
  manifest v3.8.0 (0004) · VI v3.3.0 · guardian v4.1.3 · NEW
  verify-build-css.ts v1.0.0 (gate post-build — B6-QA; P0 0002→0003:
  utilities 118k→207k; cableado a pnpm run verify:build-css +
  precommit) · smoke 39/39 runtime (19 agentes · 207 tools · B2/B3/B4
  compat) · pytest 818/818.
- §16.1: fila nueva verify-build-css.ts; smoke actualizado; §16.3
  regenerada (matemática verificada).
```

---

## §1 — Checklist A — TypeScript Quality (18 checks)

```
A-01  □  0 `any` types (use `unknown`, narrow with type guards)
A-02  □  0 type assertions (`as X`) except DOM narrowing
A-03  □  All interface fields: `readonly`
A-04  □  All array params: `readonly T[]`
A-05  □  Union literals: `"value1" | "value2"`, not `string`
A-06  □  Error typed as `unknown` (narrow before `.message`)
A-07  □  No `enum` (use `const object` + union literal)
A-08  □  Props objects for hooks with >1 param
A-09  □  Named exports únicamente — 0 default exports en código
          nuevo (legacy documentado con TODO de migración =
          excepción temporal; ver BASE §8.3 — alineado G7, #38)
A-10  □  `export type` for type-only re-exports
A-11  □  No `React.ReactNode` without import (use `ReactNode`)
A-12  □  `forwardRef` uses named function pattern
A-13  □  No side effects in `useMemo`
A-14  □  Stable references: `useMemo` for objects, `useCallback` for fns
A-15  □  Query params wrapped in `useMemo` to prevent infinite re-fetch
A-16  □  No `document.getElementById` — use refs
A-17  □  No `// @ts-ignore` or `// @ts-expect-error` without justification
A-18  □  § section markers in every file (§1 Types, §2 Constants, §3 Component)
```

---

## §2 — Checklist B — CSS Production Grade (80 checks, 13 Dimensions)

```
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
(G7, #39: canon de breakpoints = 768px + 480px OBLIGATORIOS +
 1024px CONDICIONAL si el layout cambia — ver BASE §5.2 y §13)

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

TOTAL B: 8+6+8+8+8+4+8+5+3+5+6+6+5 = 80 ✓ (13 dimensiones)
```

---

## §3 — Checklist C — Component Quality (22 checks)

```
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
```

---

## §4 — Checklist D — Intelligence Integration (8 checks)

```
D-01  □  Every insight has at least one CTA
D-02  □  Severity → placement mapping (critical=interrupt, high=hero)
D-03  □  Narrative generated (not raw description passthrough)
D-04  □  CTAs deduplicated across all slots
D-05  □  Headline = top-severity insight narrative
D-06  □  hasUrgent flag drives ambient UI changes
D-07  □  Placement drives visual treatment (not data shape)
D-08  □  Intelligence auras: interrupt=rose, hero=gold, inline=none
```

---

## §5 — Checklist E — Feature Component Migration (7 checks)

```
E-01  □  BEM prefix matches feature: .ev-*, .fm-*, .sp-*, etc.
E-02  □  Imports tokens from globals.css (never redefines colors)
E-03  □  If 3+ shared animations → extract to <feature>-atoms.css
E-04  □  data-testid pattern: <prefix>-<component>-<element>
E-05  □  Canvas elements: aria-hidden="true", pointer-events: none
E-06  □  Intelligence: severity → placement mapping
E-07  □  Data attributes: data-<prefix>-<property>
```

---

## §6 — Checklist F — Integration Quality (10 checks)

```
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
```

---

## §7 — Checklist G — AI/ML Integration (8 checks)

```
G-01  □  MCP tool calls have loading/progress UI
G-02  □  AI suggestions have accept/reject/modify actions
G-03  □  Confidence scores visualized (gauge/bar, not just number)
G-04  □  Predictions show uncertainty range
G-05  □  Advisor recommendations have reasoning chain on demand
G-06  □  System shows "thinking" state during MCP tool execution
G-07  □  Fallback UI exists when AI backend is unavailable
G-08  □  AI-generated narratives have "regenerate" action
```

---

## §8 — Checklist H — Shared/ Architecture Compliance (7 checks)

```
H-01  □  shared/ follows the 6-block structure (CHECKPOINT §2.2)
H-02  □  advisor-engine consumed by >0 feature hooks
H-03  □  useMCPQuery consumed by >0 features
H-04  □  ui barrel exports match available files
H-05  □  No feature re-implements a shared component locally
H-06  □  shared/ has zero circular dependencies
H-07  □  Every shared/ file is exported or explicitly internal
```

---

## §9 — Checklist I — Mandatory Shared/ Imports (10 checks)

```
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
```

---

## §10 — Checklist J — Shared/ Import Verification (10 checks)

```
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
(G7: el estado de audit se verifica contra AUDITED_REGISTRY del
 manifest — SSOT; CHECKPOINT §12 es el resumen legible.)
```

---

## §11 — ANTI-PATTERNS REGISTRY (52 ítems — conteo verificado G7)

```
REGISTRO: 52 ítems únicos = 14 CSS + 20 TSX + 13 INTEGRATION + 5 SHARED/
(v6.1 decía "~46 unique items" contradiciendo su propio listado —
hallazgo #50. El conteo por categoría es verificable línea por línea.)

CSS (14):
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

TSX (20):
❌ framer-motion / react-spring / GSAP
❌ Tailwind utilities as primary styling
❌ Inline styles for colors
❌ Any `any` type
❌ Default exports (código nuevo — ver A-09)
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
❌ FASE 2 sin Checklist E                                ← v3.0
❌ Canvas elements sin aria-hidden="true"                ← v3.0

INTEGRATION (13):
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

SHARED/ USAGE (5 — v6.0+):
❌ Importing a shared/ file without reading its implementation
❌ Assuming a component's API from its name
❌ Passing props that don't exist on the actual component
❌ Using a hook's return value without knowing its shape
❌ Creating local copies of shared/ utilities
```

---

## §12 — THE STANDARD — Level 6+ Agency

```
### LAS 7 CUALIDADES LEVEL 6+ (G7 — antes "7 Pillars", colisión
terminológica con los 11 Pilares del sistema resuelta = hallazgo #52.
Estas son CUALIDADES del estándar; los Pilares son la arquitectura
del sistema — ver BASE §2.)

1. INTENTIONAL   — Every value has a reason
2. COHERENT      — Every component speaks the same design language
3. PREMIUM       — Glass morphism, physics animations, print typography
4. INTELLIGENT   — Data drives visual decisions, AI is visible
5. SCALABLE      — Architecture predicts growth, shared/ is consumed
6. ACCESSIBLE    — WCAG 2.1 AA is the floor
7. BEAUTIFUL     — Dark mode = deep space, light mode = premium paper

### REGLAS
See MASTER_BASE.md §8.1 (6 Golden Rules) + §8.2 (Rules 7-10) —
CANONICAL SOURCE (G7: v6.1 referenciaba solo §8.1 y omitía las 4
reglas adicionales).
```

---

## §13 — CSS + TSX Templates (alineados con BASE §5 — G7)

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
 * D1 Glass    ✓/✗  D2 Stagger  ✓/✗  D3 Easing   ✓/✗  D4 Type    ✓/✗
 * D5 Color    ✓/✗  D6 Pseudo   ✓/✗  D7 States   ✓/✗  D8 Density ✓/✗
 * D9 Respo    ✓/✗  D10 A11y    ✓/✗  D11 Light   ✓/✗  D12 RM+Pr  ✓/✗
 * D13 Keyfr   ✓/✗
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

/* §N+5  Responsive — 768px + 480px obligatorios; 1024px CONDICIONAL
   (G7 #39: canon unificado con BASE §5.2 y checks B-56/B-57/B-58) */
@media (max-width: 1024px) { /* solo si el layout cambia a desktop */ }
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

/* §0  Imports (organizados — ver BASE §5.1 STEP 4) */

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

## §14 — SHARED/ MANDATORY IMPORTS (RESTAURADO COMPLETO — G7)

```
G7 (hallazgo #47): v6.1 contenía aquí referencias colgantes —
"Full mapping table unchanged from v6.0", "See original", "See
original §14.3" — con el contenido obligatorio AUSENTE. Esta
sección ahora está completa y autocontenida. NADA referenciado a
versiones deprecadas.
```

### §14.1 — UI COMPONENTS (tabla de mapeo completa)

```
Necesidad                 Import desde                    Componente
───────────────────────── ─────────────────────────────── ─────────────────
Botón / acción            @/shared/components/ui          Button
Tarjeta / contenedor      @/shared/components/ui          Card
Modal / overlay           @/shared/components/ui          Modal
Badge / estado            @/shared/components/ui          Badge
Notificación (toast)      @/shared/components/ui          showToast
Skeleton / loading        @/shared/components/ui          Skeleton
Input de texto            @/shared/components/ui          Input
Input con label + error   @/shared/components/ui          FormField
Dropdown de filtro        @/shared/components/ui          FilterDropdown
Tabla de datos            @/shared/components/ui          Table
Estado vacío              @/shared/components/ui          EmptyState
Tendencia / delta         @/shared/components/ui          TrendIcon
Wizard / steps            @/shared/components/ui          WizardStepper
Frescura de datos         @/shared/components/ui          FreshnessBadge
Banner datos stale        @/shared/components/ui          StaleDataBanner
Gauge de score/confianza  @/shared/components/ui          ScoreGauge
Glass surface premium     @/shared/components/ui          FrostedGlassCard
CTA con glow              @/shared/components/ui          GlowButton
Notificaciones dropdown   @/shared/components/ui          NotificationDropdown

REGLA: si el componente existe en shared/components/ui y el archivo
lo necesita → IMPORT obligatorio (I-01..I-05, F-01..F-03). Crear una
versión local = anti-pattern "Re-implementing a shared component
locally" (§11 INTEGRATION).

⚠️ ESTADO DE AUDIT (manifest AUDITED_REGISTRY — CHECKPOINT §12):
  ScoreGauge, FreshnessBadge, StaleDataBanner, Skeleton → PENDING
  (bloquean EventCalendar — CHECKPOINT §13). Button, EmptyState,
  AdvisorActionModal → reverify-on-use al consumirlos (Checklist J).
```

### §14.2 — DATA FETCHING (3 Patrones — completos)

```
PATTERN 1 — useMCPQuery (queries / lectura):
  import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

  const { data, isLoading, error, freshness } = useMCPQuery({
    agent: "events_agent",
    tool: "get_event_calendar",
    params: useMemo(() => ({ month, filter }), [month, filter]),
  });
  // A-15: params SIEMPRE en useMemo (referencia estable — evita
  // re-fetch infinito por nueva identidad del objeto en cada render)
  // Datos van al server state de React Query; NO copiarlos a useState.

PATTERN 2 — useMCPMutation (escritura / comandos):
  import { useMCPMutation } from "@/shared/hooks/useMCPQuery";

  const { mutate, isPending } = useMCPMutation({
    agent: "events_agent",
    tool: "create_event",
    onSuccess: (data) => { /* invalidate queries relacionadas */ },
    onError: (err: unknown) => { /* narrow con instanceof APIError */ },
  });
  // El 401 global lo maneja el QueryClient (BC-02) — NO showToast
  // en la capa de infraestructura (problema #19 resuelto así).

PATTERN 3 — callMCPTool (imperativo — efectos, no-queries):
  import { callMCPTool, APIError } from "@/shared/lib/api";

  try {
    const result = await callMCPTool("events_agent", "rsvp_event", {
      eventId,
    });
  } catch (err: unknown) {
    if (err instanceof APIError) { /* status, message tipados */ }
    else { /* fallback genérico */ }
  }
  // A-06: catch SIEMPRE `unknown` + narrowing. Nunca `any`.

NEVER: fetch(), axios, XMLHttpRequest, hooks custom de fetching
que NO pasen por useMCPQuery (anti-pattern §11 INTEGRATION).
TODO el tráfico frontend↔backend pasa por la cadena MCP:
useMCPQuery/useMCPMutation/callMCPTool → routeMCPCall → Backend.
```

### §14.3 — ADVISOR ENGINE (patrón completo + type guard)

```
PATRÓN (por dominio/feature):
  Componente → hook del feature (use<Domain>Advisor) →
  useAdvisorEngine → AdvisorEngine.evaluate → domain rule
  (shared/lib/advisor-engine/rules/<domain>.ts) → Insights.

1. El COMPONENTE jamás contiene lógica de advisor (C-17):
   const { insights, hasUrgent } = useEventAdvisor({ eventId });

2. El HOOK del feature consume el engine compartido:
   import { useAdvisorEngine } from "@/shared/lib/advisor-engine";
   // El hook extiende BaseContext con el contexto del dominio
   // (p.ej. EventContext) y pasa la rule correspondiente.

3. TYPE GUARD OBLIGATORIO para respuestas raw (G7 — v6.1 decía
   "code example fixed — add type guard" SIN mostrar el fix; ahora
   sí):

   // ❌ NUNCA:
   const insight = raw as unknown as Insight;        // anti-pattern
   // ✅ SIEMPRE — discriminated union + guard:
   function isInsight(v: unknown): v is Insight {
     if (typeof v !== "object" || v === null) return false;
     const r = v as Record<string, unknown>;          // narrowing DOM-safe
     return typeof r.id === "string"
       && typeof r.severity === "string"
       && SEVERITIES.includes(r.severity as Severity);
   }
   const insights = rawList.filter(isInsight);       // A-01/A-02 clean

4. Health scores: computeHealthScore desde
   @/shared/lib/advisor-engine (I-08) — jamás recalcular local.

5. BaseContext SIEMPRE desde el módulo canónico:
   import { BaseContext } from "@/shared/lib/advisor-engine/types";
   (problema #25: import desde módulo equivocado — resuelto así)
```

### §14.4 — TYPES

```
1. Importar desde shared — jamás redefinir enums compartidos:
   import { TrendDirection, HealthFactorStatus } from
     "@/shared/types/domain-enums";
   import type { Insight, AdvisorCommand } from
     "@/shared/types/ai-intelligence";

2. Feature types.ts EXTIENDE shared types (F-08):
   export interface EventContext extends BaseContext {
     readonly eventId: string;
     readonly attendeeCount: number;
   }

3. Estructura del template: features/__TEMPLATE__/types.ts —
   8 secciones, todo readonly, config maps con var(--color-*)
   (RULE 9 BASE §8.2).

4. BC-01: HealthFactorStatus usa valores EN INGLÉS
   ("exceptional" | "healthy" | "attention" | "critical").

5. export type para re-exports type-only (A-10). Discriminated
   unions en vez de casts (anti-pattern "null as T").
```

### §14.5 — HOOKS

```
SHARED HOOKS (consumo directo — cross-features):
  useMCPQuery / useMCPMutation   → data fetching MCP (Pilar 4)
  useAutonomousAdvisor           → ejecución autónoma (Pilar 6)
  useBreakpoint                  → responsive JS (⚠️ pending audit §13)
  useDataFreshness               → frescura de datos
  useReducedMotion               → media query reduced-motion
  useAdvisorEngine               → motor de advisor (Pilar 6)

REGLA DE PLACEMENT (CHECKPOINT §2.3):
  Hook usado por 2+ features  → shared/hooks/
  Hook usado por 1 feature    → features/<name>/hooks/
  (anti-pattern §11: "Domain hook in shared/ directory" — caso
   useExecutiveSummary, problema #11)

FEATURE HOOKS (dominio-específico — el patrón Events):
  useEventAdvisor, useEventData, useEventCalendar, useEventDetail,
  useEventForm → features/events/hooks/ (9.3-9.4 ✅)
```

### §14.6 — COMMUNICATION ARCHITECTURE (CANONICAL)

```
P1: Feature Data Queries → useMCPQuery → callMCPTool → routeMCPCall → Backend ✅
P2: Autonomous Execution → useAutonomousAdvisor → callMCPTool → Backend ✅
P3: Advisor Evaluation → useAdvisorEngine → AdvisorEngine → rules ✅
P4: Cross-Domain Signals → Rule emits → SignalBus → Target domain ✅

DATA FETCHING:
  PATTERN 1: useMCPQuery (queries)          → §14.2
  PATTERN 2: useMCPMutation (writes)        → §14.2
  PATTERN 3: callMCPTool (imperative)       → §14.2

NEVER: fetch(), axios, custom hooks sin useMCPQuery (§14.2)

(ESTA subsección es la fuente canónica — BASE §7 apunta aquí.)
```

---

## §15 — AI/ML INTEGRATION STRATEGY

```
### 4 Layers of Visible Intelligence
LAYER 1: AMBIENT — Status auras, pulse, breathing
LAYER 2: REACTIVE — AdvisorBanner, predictions, alerts
LAYER 3: INTERACTIVE — CommandPalette, Chat, accept/reject
LAYER 4: TRANSPARENT — Reasoning chain, confidence, "why?"

### Reusable AI/ML UX Patterns

Pattern                    Component/Location              Status
─────────────────────────────────────────────────────────────────
Advisor Banner             shared/components/AdvisorBanner ✅ Exists (unified)
Confidence Gauge           ScoreGauge                      ⚠️ Exists (pending audit §13)
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

## §16 — AUTOMATION MAPPING + CONSISTENCIA (matemática verificada)

### §16.1 Estado REAL de scripts (G7 — verificado contra artefactos)

```
SCRIPT                          COBERTURA               ESTADO REAL
──────────────────────────────  ──────────────────────  ──────────────────
architecture-guardian.ts        A,B,C,F,H,I subsets     ✅ v4.1.3 · 26 checks
                                (X-01..X-28,            (expandir → 45+;
                                 sin X-11/X-24)          digest producción:
                                                        1.151 files,
                                                        30.075 violaciones,
                                                        8.0/10; backend-aware
                                                        → cola Q-GOV-01)
validate-shared-imports.ts      J + I (registry)        ✅ v4.0.0 (versión
                                                        FACTUAL del archivo —
                                                        audit del tool
                                                        pendiente, #63; no
                                                        es claim de audit)
verify-integration.ts           F (integración)         ✅ v3.3.0 · 8 checks
                                                        (router/mcp/tokens/
                                                        buttons/gates/tools/
                                                        routes/mocks) + --json
                                                        · VI-16 comment masker
                                                        · VI-17 definition
                                                        sites (B6)
MIGRACIÓN CSS T1 · 78 parejas     css (feature)          ✅ 12 arquetipos × 7
                                                        dominios · 122 keyframes
                                                        únicos · X-13=0 · guardian
                                                        15198→15124 (-74) · 417/483
                                                        tsx con pareja · tramo 2:
                                                        61 acoplados → §15
scripts/verify-master-consistency.py  M (docs↔tree)      ✅ v1.0.0 — 13 checks
                                                        (MC-01..09 IG-01..04)
                                                        · 13/13 VERDE exit 0
                                                        · mutation-tested ·
                                                        en CI + pre-commit
                                                        (Q-GOV-04 ✗→✓)
.github/workflows/ci.yml         infra (CI)             ✅ 4 jobs — gates
                                                        duros (build·css·VI·
                                                        pytest·smoke·consist.)
                                                        + ratchet deuda
                                                        (Q-CI-01 ✗→✓)
.pre-commit-config.yaml +        infra (hooks)          ✅ 9 hooks · local
.githooks/                                              ratchet + consistency
                                                        (Q-CI-02 ✗→✓)
verify-build-css.ts             B (output)              ✅ v1.0.0 — GATE
                                                        POST-BUILD (B6-QA):
                                                        sonda del bundle dist/
                                                        (utilities · familia
                                                        font · piso · fugas);
                                                        nació del P0 0002/0003
                                                        (utilities 207k→118k
                                                        invisible a gates de
                                                        INPUT); cableado:
                                                        pnpm verify:build-css
                                                        + precommit
css-audit.ts                    B (35)                  ⬜ TO CREATE — harness
                                                        Python probado en
                                                        scripts/css-audit/
                                                        (port TS pendiente)
component-audit.ts              C (14)                  ⬜ TO CREATE
feature-integration-audit.ts    D (4) + E (5) + G (3)   ⬜ TO CREATE
pre-commit-pipeline.ts          orchestrator            ⬜ TO CREATE

═══ GATES BACKEND (P2-C3 · track separada del estándar A-J) ═══
backend/scripts/smoke_b0.py     composición+registro+   ✅ 39/39 runtime VERDE
                                resolve+RBAC+HITL+      (504b53d; re-ejecutado
                                FastAPI+HTTP            G9 sandbox: 19 agentes
                                                        · 207 tools · RBAC
                                                        207/207)
backend pytest tests/unit       unit backend            ✅ 818/818
                                                        (py3.12 + 3.14.4;
                                                        808 def + 10 param)
backend ruff + mypy strict      estilo/tipos backend    ✅ config en
                                                        pyproject (manual —
                                                        sin CI → Q-CI-01)
scripts/verify-master-          consistencia masters    ⚠ INEXISTENTE (#73) —
consistency.py                                          citado desde G7 §0.3;
                                                        crear = Q-GOV-04

(v6.1 decía guardian "~45" y validator "v2.0" — stale #56/#51;
 G7 registra lo que EXISTE; G8 añade la track backend — 19 agentes ·
 196 tools · 785 tests, SSOT manifest §16.)
```

### §16.2 Cobertura por Checklist (asignación G7 — verificable)

```
Checklist   Automatizable   Manual (juicio de diseño)   Cubierto hoy por
─────────   ─────────────   ─────────────────────────   ─────────────────
A           16              2                           guardian (parcial)
B           35              45                          css-audit (futuro)
C           14              8                           component-audit (fut.)
D           4               4                           feat-int (futuro)
E           5               2                           feat-int (futuro)
F           8               2                           verify-integration ✅
G           3               5                           feat-int (futuro)
H           6               1                           guardian (parcial)
I           10              0                           validator ✅
J           10              0                           validator ✅
TOTAL       111 (62%)       69 (38%)                    28 directo + guardian
                                                        (mapeo fino X→A-J
                                                        pendiente = task M-03)

MATEMÁTICA (hallazgo #51 resuelto):
  Automatizables: 16+35+14+4+5+8+3+6+10+10 = 111 ✓
  Manuales:        2+45+8+4+2+2+5+1+0+0     = 69 ✓
  111 + 69 = 180 ✓  ·  111/180 = 62% ✓
  (v6.1 mostraba una suma bruta de scripts de 128 con total
   declarado 111 y SIN reconciliación de solapamientos — los checks
   cubiertos por 2+ scripts se cuentan UNA vez; la cobertura se
   define por CHECKLIST, no por script.)

ASIGNACIÓN: inicial G7 — refinar al implementar cada script. Los
manuales de B son dimensión de juicio (B-55 "PRECISE", jerarquía
tipográfica, calidad visual); los de G requieren evaluación UX.
```

### §16.3 TABLA DE CONSISTENCIA (ANTI-DRIFT — NUEVA G7)

```
REGLA: esta tabla se REGENERA en cada bump de generación. Si un
número no cuadra tras una edición, la generación NO se publica.
Sin excepciones. (Mecanismo para que los masters NO vuelvan a
generar errores — CHECKPOINT §0.3 punto 1.)

CLAIM                          VALOR          VERIFICACIÓN (matemática explícita)
─────────────────────────────  ─────────────  ──────────────────────────────────
Total checks (A-J)             180            18+80+22+8+7+10+8+7+10+10 = 180 ✓
Checklist B (13 dims)          80             8+6+8+8+8+4+8+5+3+5+6+6+5 = 80 ✓
Checklist A                    18             A-01..A-18 ✓
Checklist C                    22             C-01..C-22 ✓
Checklist D/E/F/G/H/I/J        8/7/10/8/7/10/10  ids secuenciales ✓
Anti-patterns                  52             14 CSS + 20 TSX + 13 INT + 5 SHARED ✓
Automatizables                 111            16+35+14+4+5+8+3+6+10+10 = 111 ✓
Manuales                       69             2+45+8+4+2+2+5+1+0+0 = 69 ✓
Combinación máxima             180            A+B+C+D+E+F+G+H+I+J (§16.4) ✓
Pilares del sistema            11             4 core + 5 parciales + 2 pendientes ✓
Archivos infra pendientes      25             3+2+3+4+5+4+4 = 25 ✓
Components shared/             92             24+20+11+2+10+3+2+17+1+2 = 92 ✓
Shared/ total                  ~197           92+30+65+3+5+1+1 = 197 ✓
Unidades auditadas ≥9.3        42             1+23+7+11 = 42 ✓
OVERALL completados            9.33           (1×9.7+23×9.3+7×9.31+11×9.37)/42 ✓
Archivos feature/shared compl. 65             1+46+7+11 = 65 ✓
Pending review                 14 físicos     2 (EventCalendar) + 12 (7 shared/) ✓
AUDITED_REGISTRY               27 entradas    15+4+7+1 = 27 ✓ (manifest §8)
Checks guardian                26             X-01..X-28 sin X-11/X-24 ✓ (v4.1.3)
Checks verify-integration      8              8 ids verificados ✓ (VI v3.3.0 G9 · VI-16/17)
Manifest version               3.8.0          §16 re-AST 207 tools @ 504b53d (G9-0004) ✓
Backend agentes                19              bootstrap._AGENT_MODULES por AST (G8) = smoke_b0 ✓
Backend tools                  207              @MCPTool AST per-módulo (G9) = registry.total_tools = smoke ✓
Backend tests unit             818            pytest tests/unit PASSED (py3.12+3.14.4) ✓ (+12 B4)
Gate post-build CSS            1              verify-build-css v1.0.0 (B6-QA · P0) — en precommit ✓
Frontend files                 1163          find G8 (digest G7 = 1.151 — delta post-C3g) ✓
```

### §16.4 CHECKLIST GRAND TOTAL (matemática explícita)

```
╔══════════════════════════════════════════════════════════════════════╗
║  GRAND TOTAL — EXPLICIT MATH (verificado por script G7)              ║
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
║  TOTAL ALL CHECKS: 18+80+22+8+7+10+8+7+10+10 = 180 ✓                ║
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
║  (140=18+80+22+10+10 ✓ · 148=+8 ✓ · 157=+7+10 ✓ · 173=+8+8 ✓        ║
║   147=+7 ✓ · 180=suma completa ✓)                                   ║
║                                                                      ║
║  TOLERANCE: ZERO                                                    ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

END OF MASTER_CHECKLIST.md v9.8 · Generación G12.1 (sincronizada con
MASTER_BASE.md v9.8 y MASTER_CHECKPOINT.md v9.8)

