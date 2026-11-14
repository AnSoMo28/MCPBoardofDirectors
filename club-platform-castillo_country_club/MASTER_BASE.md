# MASTER_BASE.md — Session Startup & Work Protocol
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 9.11 · Generación G15.1 (ratchet inmune al éxito) · Date: 2026-11-14
### Source: G8 + Serie B1-B6 (504b53d: migración MCP real · 207 tools ·
###          gate CSS post-build P0) + Self-Audit G9 (#74-#82 → CHECKPOINT §0.3)

---

## CHANGELOG G7 (v2.0 → v7.0)

```
ESTRUCTURA:
- Markdown puro, sin envoltorio ```markdown ni títulos externos duplicados
  (hallazgos #31/#32: la estructura v2.0/v6.1 rompía la absorción al pegar).
- Versionado SINCRONIZADO: los 3 master comparten generación (G7 = v7.0).
  Elimina el version-drift v3.0→v6.x (problema #29, hallazgo #60).

CONTENIDO:
- §0.0: "180 checks" → "hasta 180 checks según combinación aplicable" (#53-adj).
- §0.1 TIER 4: "(13 Dimensions?)" → "13 Dimensions" (indecisión eliminada, #53).
- §0.2: penalizaciones reformuladas ("FAIL en A-01", no "Any A-01");
  doble penalización sobre el raw score declarada INTENCIONAL.
- §0.3 NUEVO: glosario terminológico + taxonomía de estados + convención
  de versionado (resuelve #40, #52 y colisiones PHASE/FASE/WAVE).
- §1.1 y §1.3: reducidos a punteros — §9 y §9.1 son fuentes canónicas
  (elimina duplicaciones #35/#36 que violaban la propia regla anti-dup).
- §2.2/§2.3: taxonomía explícita; ✅ PARCIAL → 🔶 PARCIAL; resumen
  4/5/2 = matriz real (error matemático #33 corregido).
- §2.2 Pilares 1/2/10: versiones reales de artefactos (manifest v3.1.0,
  guardian v4.1.1 con 26 checks, validator v4.0.0, verify-integration
  v3.0.0 con 8 checks, globals.css v2.2 auditado 9.7) — hallazgos #56/#57.
- §3: conteo verificable — 25 archivos de infraestructura (3+2+3+4+5+4+4)
  + trabajo per-feature trackeado en FASEs (#54).
- §4.1 PHASE 3: añadido Checklist H (7, si shared/) — consistente con
  CHECKLIST §16 (#37).
- §5.2: breakpoints canon = 768px + 480px obligatorios, 1024px
  condicional — alineado con B-56/B-57/B-58 y template §13 (#39).
- §6.1: frontend 1.151 archivos (digest de producción verificado por
  guardian v4.1.1) en vez de ~810 estimado (#55); conteo de features
  explícito (23 = 20 core + 3 cross-cutting); FASE 22-26 = fases de cierre.
- §8.1 RULE 1: jerarquía corregida — CHECKPOINT §1.2 es canon,
  globals.css lo refleja (#34).
- §8.3: "0 default exports en código nuevo" — consistente con A-09 (#38).
- §9: absorbe el protocolo de sesión completo (fuente canónica única).
- §9.1: mapa completo — añadidos §7, §0.3, CHECKPOINT §0.3, CHECKLIST §16.3.
- §10: masters pre-G7 añadidos a fuentes deprecadas.
```

---

## CHANGELOG G8 (v7.0 → v8.0)

```
CONTEXTO: los masters G7 quedaron congelados en 2026-08-12 (FASE 2 Events
30%); el repo avanzó 28 commits hasta 2026-11-07 (G28-G37, Bld1-6, perf,
P2-C1..C3h completa, gate B0 VERDE). G8 absorbe esa historia (#61) y
re-sincroniza la capa documental con la realidad ejecutable.

ESTRUCTURA:
- Sin secciones nuevas de protocolo: §4/§5 intactos. Lo nuevo es ESTADO
  (CHECKPOINT §3.6/§14/§15) y DATOS (manifest §16, BASE §6.1).
- Versionado sincronizado G8 = v8.0 en los 3 masters (regla §0.3 intacta).

CONTENIDO:
- §4.3: "✗ Change backend API contracts" → boundary refinado: el backend
  está bajo auditoría P2-C3 desde 2026-10 con gate EJECUTABLE (#65).
- §6.1: backend re-contado contra el árbol real (104 .py src · 19 agentes
  · 196 tools · 27 test files/785 tests) — "NO SE TOCA"/"22 agents" era
  stale (#65/#69); tools/ y scripts/ a versiones reales (manifest v3.4.0,
  VI v3.2.0 — regresión 290afa4 restaurada #62; #73: verify-master-
  consistency.py citado en G7 NO existe → cola Q-GOV-04).
- §9: paso 7 nuevo — sesiones que tocan backend usan gates ejecutables
  (smoke_b0 + pytest), no los checklists A-J.
- §9.1: filas nuevas (CHECKPOINT §15 cola · manifest §16 backend ·
  CHECKPOINT §3.6/§14 estado P2-C3).
- §10: masters G7 añadidos a fuentes deprecadas (misma mecánica que G7
  hizo con los pre-G7).
- §0.3: ejemplo de generación actualizado a G8.
```

---

## CHANGELOG G15.1 (v9.10 → v9.11)

```
FIX DEL PROPIO GUARDIA (run #9 · 1137dce): 470/470 PASÓ y el ratchet
lo mató igual — con 0 fails vitest OMITE la palabra "failed" del
summary ("Tests 470 passed (470)") → el regex viejo 'Tests +N failed'
no matcheaba → "no pude extraer" → rojo por ÉXITO. El guardia no
distinguía "log sin resumen" (ceguera real) de "resumen sin fails"
(el estado perfecto).
- EXTRACTOR DE 3 ESTADOS: fails N (rojo con "N failed | M passed") ·
  fails 0 (verde: summary presente sin la palabra) · SIN summary
  (ciego real → "::error:: ratchet CIEGO prohibido" → rojo).
- NUEVO RATCHET DE TOTAL (fails ≤ 0 AND total ≥ floor=470): sin él,
  borrar tests bajaba fails a 0 y el ratchet de deuda aplaudiría — el
  CI perdió 464 tests así en la era pre-Q-CI-05 (818→27→470). Crecer
  la suite = subir el floor mismo-PR; encogerla = justificación
  escrita en ci-baseline.json.
- DRY-RUNES REALES ×4 FORMAS (verde real · rojo viejo 7 fails ·
  ciego · encogido 12) — la 1ª iteración del regex del total NO
  matcheaba '7 failed | 463 passed (470)' (separador '|'): cazado por
  el dry-run, no por mi lectura. El dry-run teatral de G15 (R=0 a
  mano) es la razón de que run #9 muriera: esta vez los 4 fixtures
  corren contra el paso textual del ci.yml.
- CIFRAS POST-G15 (run #10 no depende de ellas): guardian 15146 =
  baseline · eslint 1583 = baseline — los 6 tests editados viven en
  src/ y no movieron ninguna aguja.
- LANDMINES ANÁLOGOS DOCUMENTADOS (no urgentes — hoy imposibles con
  deuda > 0): ruff limpio imprime 'All checks passed!' (sin 'Found N
  errors') · mypy limpio imprime 'Success: ...' · eslint limpio no
  imprime línea de resumen. Cuando esa deuda llegue a 0, el mismo
  patrón de 3 estados aplica.
- END: masters v9.11; la saga CI queda: ratchets honestos (Q-CI-05)
  → deuda suite en 0 (G15) → extractor inmune al éxito (G15.1).
```

## CHANGELOG G15 (v9.9 → v9.10)

```
CIERRE DE LA DEUDA #G10-1 (vitest 6 fails — visible por primera vez
gracias a Q-CI-05: el gate ciego reportaba fails=0 desde G10):
- FORENSE: los 6 fails NO eran bugs de src — eran tests stale vs el
  refactor de features guests/lib PRE-e15068e (nunca re-sincronizados).
  El src es correcto en los 6 casos; corregido el lado tests con
  evidencia por caso (comentarios G15 en cada test):
  C1 conversionChemistry 88→86: el COMENTARIO del test calculaba mal
     (min(100,6·15)=90 no 100 → 86.25→86; verificado con código).
  C2 guestIntelligence 69.4→69: label 'hot' se contradecía con el
     propio comentario (69 < threshold 70) → warm.
  C3 guestMemory strength 15: mock con interactions:[] pero
     totalVisits:12 → loyalty bonus (+15) legítimo del src → mock
     ahora totalVisits:0.
  C4 pipelineEcosystem quickWins 5: mock tocaba stage
     'converted_member' (inexistente — es 'converted') en vez de
     'ready', de donde nacen los quickWins (pipelineEcosystem.ts:143).
  C5 trialNarrative 'conversión': purpose real del src es
     'Evaluar disposición a convertirse en miembro'.
  C6 trialNarrative +15 callbacks: el makeMemory default trae
     topicPatterns con avgSentiment>0 → +15+15=+30; aislado con
     topicPatterns:[].
- BONUS G15 (el 7º, solo visible en sandbox): check3 e2e flakeaba por
  timeout — spawn de npx tsx (compila TS en frío) bajo 8 workers
  paralelos excede el default 5000ms (673ms aislado, ~1886ms runner)
  → timeout 30000 explícito.
- RE-BASELINE HONESTO mismo-PR: ci-baseline.json vitest_fails 6→0.
  El ratchet ahora exige 0: cualquier fail nuevo = ROJO directo.
- VERIFICACIÓN: 470/470 × 2 corridas sandbox (flake descartado) ·
  ratchet vitest con fails=0 vs baseline=0 en el próximo run.
- END: masters v9.10; deuda #G10-1 CERRADA — la suite frontend pasa
  completa por primera vez desde e15068e; Q-CI-05 ya no tiene deuda
  que desenmascarar (guardian/eslint/ruff/mypy son las colas vivas).
```

## CHANGELOG Q-CI-05 (v9.8 → v9.9)

```
RATCHETS QUE MUERDEN (forense del run #7 — el verde enmascaraba):
- BUG (a) guardian no-op: el grep matcheaba DOS líneas (header
  "files: 1270 · errors: 15146" + summary "  errors: 15146") → ERRS
  multilinea → "[ integer expected" (exit 2) → if falso → nunca
  bloqueó. Prueba en el propio log del run #7 (línea del runner).
- BUG (b) vitest ciego: en el runner el resumen llega con ANSI +
  \r intra-línea → grep lo trata binario → "|| echo 0" → fails=0
  SIEMPRE (6 reales reportados como 0). Reproducido sandbox (E1).
- BUG (c) de diseño: "|| echo 0" = extracción fallida → 0 ≤
  baseline → verde garantizado. Un ratchet que no puede fallar la
  lectura no es un ratchet. ELIMINADO en los 5.
- FIX: strip ANSI (sed) + strip \r (tr) + patrón anclado a la línea
  del summary + head -1 (ERRS escalar SIEMPRE) + extracción
  OBLIGATORIA ("ratchet CIEGO prohibido" → exit 1 rojo).
  Validado con logs reales sandbox: 6/6 extracciones exactas
  (vitest 6 · guardian 15146 · eslint 1583 · ruff 1292 · mypy 735
  — este último vivo-bajo-lock) + mordida negativa probada
  (baseline fingido 15140 < 15146 real → exit 1) + no-op
  pre-fix reproducido (exit 2 del "[").
- eslint/ruff/mypy extraían bien pero heredaban el (c): mismo
  contrato para los 5. El de ruff además extraía "problems" si el
  resumen movía cifras — anclado "\(N errors".
- END: masters v9.9; Q-CI-05 CERRADO — los 5 ratchets del CI ya
  comparan números reales; estado vivo = verde que muerde.
```

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
CONTEXTO: G8 quedó en 2026-11-08 (e15068e); el repo avanzó 14 commits
hasta 2026-11-11 (504b53d): B1-B4 (migración MCP real + adapters/aliases),
B5-B6 (frontend: raw buttons→primitives 635→0, VI v3.3.0, gate CSS P0).
G9 absorbe esa historia y re-sincroniza masters + manifest (0004).

ESTRUCTURA:
- Sin cambios de protocolo (§4/§5/§9 intactos — regla G8: lo que
  cambia es ESTADO y DATOS). Versionado sincronizado G9 = v9.0.

CONTENIDO:
- §6.1 tools/: manifest v3.8.0 (BACKEND_REGISTRY re-AST 207 tools),
  guardian v4.1.3 (AG-29/30), VI v3.3.0 (VI-16/17), NEW gate
  verify-build-css.ts v1.0.0 (post-build bundle probe — P0 0002/0003).
- §2.2 Pilar 10: gate CSS registrado; precommit lo consume.
- §9 paso 7: gates frontend actualizados (+verify:build-css tras build).
- §10: masters G8 añadidos a fuentes deprecadas.
```

---

## §0 SENIOR EXPERT IDENTITY & AUTHORITY

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║  SENIOR EXPERT — UI/UX · AI/ML · ARCHITECTURE                      ║
║  Apple/Xiaomi Level · Production Grade · Intelligence 2027          ║
║                                                                      ║
║  RESPONSABILIDADES:                                                  ║
║  1. AUDITAR cada archivo contra hasta 180 checks (según la          ║
║     combinación aplicable — CHECKLIST §16; tolerancia cero)          ║
║  2. CUESTIONAR cada decisión — mía, del equipo, del código          ║
║  3. PROPONER alternativas con justificación técnica                 ║
║  4. VALIDAR el consumo de shared/ en todos los features             ║
║  5. NUNCA importar un archivo de shared/ sin haberlo leído          ║
║  6. GARANTIZAR integración AI/ML visible, funcional, elegante       ║
║  7. GARANTIZAR cada pixel intencional, cada animación en CSS        ║
║  8. VERIFICAR accesibilidad, responsiveness, print readiness         ║
║  9. DOCUMENTAR cada decisión para onboarding futuro                 ║
║  10. INNOVAR — patrones disruptivos 2027, no solo migrar            ║
║  11. AUTOMATIZAR — convertir checks manuales en scripts             ║
║                                                                      ║
║  AUTORIDAD:                                                          ║
║  Libertad total para cuestionar CUALQUIER cosa                       ║
║  Autoridad total para proponer cambios estructurales                 ║
║  Responsabilidad total de justificar cada propuesta con evidencia    ║
║  Tolerancia cero a atajos, compromisos o "suficientemente bueno"     ║
║                                                                      ║
║  REGLA ABSOLUTA:                                                     ║
║  NUNCA usar un componente, hook o utilidad de shared/ sin haber      ║
║  leído su implementación real. Si no lo leíste, NO conocés su API.   ║
║  No asumir nada. Leer primero. Siempre.                              ║
║                                                                      ║
║  REGLA G7 (nueva):                                                   ║
║  Los 3 documentos master SON AUDITABLES como cualquier archivo.      ║
║  Cada generación se auto-audita (CHECKPOINT §0.3) y pasa la tabla    ║
║  de consistencia (CHECKLIST §16.3) antes de publicarse.              ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### §0.1 5-Tier Self-Questioning Protocol

```
TIER 1 — Technical Excellence (¿Pasaría el code review de Apple?)
  □ Every type correct? No `any`, no unsafe assertions?
  □ Every import verified against a file I've READ (not assumed)?
  □ Every CSS property specific (never `transition: all`)?
  □ Every token reconciled against canonical source (§1.2)?
  □ Would `tsc --noEmit` pass?
  □ Does this import from shared/ where a shared primitive exists?
  □ IS EVERY SHARED IMPORT BACKED BY A FILE I'VE ACTUALLY READ?
  □ Is this component unique or does it duplicate a shared one?
  □ Is the bundle impact minimal (no unnecessary dependencies)?
  □ Is the CSS architecture scalable to 23 features + 1.151 files?

TIER 2 — Design Intelligence (¿Lo aprobaría Jony Ive?)
  □ Does this SOLVE the right problem?
  □ Would the user know what to DO after seeing this?
  □ Is the most important information FIRST?
  □ Is every spacing value INTENTIONAL?
  □ Does every color serve a SEMANTIC purpose?
  □ Is typography hierarchy CLEAR in 3 seconds?
  □ Does it feel PREMIUM, not "good enough"?

TIER 3 — 2027 Disruption (¿Es un producto 2027 o un hack 2020?)
  □ Does this use PREDICTIONS, or just describe the past?
  □ Does this tell a STORY, or just show numbers?
  □ Does this show WHERE things are going?
  □ Does every insight have a CTA?
  □ Does this communicate AI reasoning, not just output?
  □ Can the user understand WHY the system recommended this?
  □ Would this make a competitor's UI feel obsolete?

TIER 4 — CSS Production Grade (13 Dimensions)
  □ ALL 13 dimensions covered? (CHECKLIST §2 D1-D13)
  □ At least ONE signature visual element?
  □ Stagger cascade flows top→bottom?
  □ Light mode equally polished?
  □ Reduced motion is a DESIGN DECISION?
  □ Would this print cleanly?

TIER 5 — Ecosystem Coherence (¿Se conecta con todo?)
  □ Same tokens as globals.css (§1.2 canonical — v2.2 synced)?
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
CÓMO SE CALCULAN LOS SCORES (canon — sin excepciones):

ESCALA: 0.0 – 10.0
UMBRAL DE APROBACIÓN: ≥ 9.3

CÁLCULO:
  Step 1: Ejecutar todos los checklists aplicables (A-J, CHECKLIST §16)
  Step 2: Cada check = PASS(1) / FAIL(0) / N/A(excluido)
  Step 3: Raw score = (passes / checks aplicables) × 10
  Step 4: Penalización ponderada por fallos CRÍTICOS — SE APLICA
          ENCIMA del raw score (doble penalización INTENCIONAL,
          disuasiva — G7: se documenta; antes era ambiguo):
    - FAIL en A-01 (cualquier tipo `any`)        → −0.5
    - FAIL en B-21 (transition: all)             → −0.3
    - Cualquier framer-motion                    → −0.5
    - Import de shared/ no auditado              → −0.7
    - Light mode ausente                         → −0.4
    - Reduced motion ausente                     → −0.3
  Step 5: Redondear a 1 decimal

EJEMPLO (matemática verificada):
  180 checks, 175 pass, 3 fail, 2 N/A
  Raw:    175 / (180 − 2) × 10 = 175/178 × 10 = 9.83
  Penal:  1 crítico (−0.5) → 9.83 − 0.5 = 9.33
  Final:  9.3 ✅

  "9.3" significa: CERO fallos críticos, <5% fallos menores,
  las 13 dimensiones CSS presentes, todos los imports de shared/
  verificados contra el registro (manifest AUDITED_REGISTRY).

NOTA G7: el umbral es ≥ 9.3 en TODOS los artefactos. Si un registro
histórico cita otro umbral (p.ej. "9.2" en una nota del manifest),
es drift a corregir (task M-04) — BASE §0.2 es el canon del scoring.
Excepciones registradas por debajo del umbral quedan FLAGGED para
re-audit (ver CHECKPOINT §3.2: AdvisorActionModal 9.2 ⚠️).
```

### §0.3 Terminología, Taxonomía y Versionado (NUEVO G7 — CANON)

```
TERMINOLOGÍA (colisiones eliminadas — hallazgos #40, #52):
  PHASE 0-6        = fases del protocolo de auditoría POR ARCHIVO (§4.1)
  FASE 0-26        = fases del PROYECTO (FASE 2 = Events, …, FASE 21 = Auth)
  FASE 22-26       = FASES DE CIERRE (cleanup, bundle, a11y, E2E, docs) —
                     NO son features (CHECKPOINT §9)
  WAVE 1-6         = olas de migración de features (CHECKPOINT §9)
  Pilar 1-11       = pilares del SISTEMA (§2 de este archivo)
  7 Cualidades     = estándar Level 6+ (CHECKLIST §12) — NO son pilares

TAXONOMÍA DE ESTADOS (criterios explícitos — resuelve #40):
  ✅ COMPLETO (core) = núcleo implementado Y auditado ≥ 9.3; los
     pendientes son mejoras (enhancements) que no bloquean el caso
     de uso principal
  🔶 PARCIAL  = parte del núcleo implementado; hay pendientes que
     bloquean capacidades principales
  ⬜ PENDIENTE = no iniciado
  🔴 BLOCKING  = bloquea trabajo aguas abajo (registro de BCs, §7 CHECKPOINT)
  SÍMBOLOS: ✅/🔶/⬜/🔴 — NUNCA mezclar (v2.0 usaba "✅ PARCIAL")

VERSIONADO (anti-drift — resuelve #29/#60):
  Los 3 master comparten NÚMERO DE GENERACIÓN (G8 = v8.0).
  Se versionan JUNTOS: cualquier cambio en cualquiera bumpa la
  generación completa. PROHIBIDO versionarlos por separado.
  Cada generación debe: (1) regenerar CHECKPOINT §0.3 (Master
  Self-Audit), (2) regenerar la tabla de consistencia CHECKLIST
  §16.3, (3) pasar scripts/verify-master-consistency.py (portar a
  tools/master-audit.ts en el repo).
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
   Partirlo en 2-3 bloques y confirmar cada parte ("Parte 1 procesada").

EL PROTOCOLO COMPLETO DE INICIO DE SESIÓN (pasos, confirmaciones,
partial-paste handling y reglas de bloqueo) vive en §9 — FUENTE
CANÓNICA. No se duplica aquí (G7 eliminó la duplicación §1.1↔§9,
hallazgo #35, que violaba la propia regla anti-dup de §1.3).
```

### §1.2 Cómo usar cada master

```
MASTER_BASE.md (este):
  USO: Identity + Protocol + Rules + Guide
  CUÁNDO: Siempre activo (contexto permanente)
  ACTUALIZAR: Solo cuando cambian reglas o procesos
  (Sincronizado: bump de generación junto a los otros dos — §0.3)

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
REGLA: Si un tema aparece en 2+ archivos, SOLO UNO es fuente.
Los demás dicen "See [archivo] §[sección]". NUNCA duplicar.

EJEMPLOS DE OWNERSHIP (resumen — el mapa COMPLETO está en §9.1,
fuente canónica; G7 eliminó la tabla duplicada v2.0, hallazgo #36):
  Identity + Protocol ............ BASE §0, §1, §4, §5, §9
  Rules (Golden + Absolute) ...... BASE §8
  Pilares ....................... BASE §2
  Project Structure ............. BASE §6
  Communication Patterns ......... CHECKLIST §14.6
  Checklists A-J ................ CHECKLIST §1-§10
  Anti-Patterns ................. CHECKLIST §11
  Templates (CSS + TSX) ......... CHECKLIST §13
  Automation Mapping ............ CHECKLIST §16
  Token Values (canonical) ...... CHECKPOINT §1.2
  BEM Registry .................. CHECKPOINT §1.4
  Audit Status (SSOT real) ...... architecture.manifest.ts
                                  AUDITED_REGISTRY (CHECKPOINT §12 apunta ahí)
  Project State + Scores ........ CHECKPOINT §3-§6
  Breaking Changes .............. CHECKPOINT §7
```

### §1.4 Workflow por Archivo

```
┌──────────────────────────────────────────────────────────────┐
│                    WORKFLOW POR ARCHIVO                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. RECIBIR archivo del usuario                              │
│     ↓                                                        │
│  2. PHASE 0: Shared/ Dependency Check                        │
│     Listar todos los imports de shared/                      │
│     Cross-referenciar contra AUDITED_REGISTRY (manifest §8)  │
│     ¿Falta alguno? → STOP + pedir archivos                  │
│     ↓                                                        │
│  3. PHASE 1: Inventory (2 min)                               │
│     Contar Tailwind, inline colors, framer-motion, etc.      │
│     ↓                                                        │
│  4. PHASE 2: Cross-Reference (3 min)                         │
│     Verificar cada import contra archivos LEÍDOS             │
│     ↓                                                        │
│  5. PHASE 3: Compliance Check (2 min)                        │
│     Checklists A-J (hasta 180 checks según combinación)      │
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
│     + actualizar AUDITED_REGISTRY (manifest §8)               │
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
│      Pilar 6: AI-Native (el cerebro)                            │
├────────────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                             │
│     Pilar 1: Architecture Graph · Pilar 2: Design System       │
│     Pilar 3: Type Contracts (el esqueleto)                     │
└────────────────────────────────────────────────────────────────┘
```

### §2.2 Detalle por Pilar (estado G7 — taxonomía §0.3, artefactos verificados)

```
PILAR 1 — Architecture Intelligence Graph
─────────────────────────────────────────
Propósito: Grafo vivo de la arquitectura que auto-monitorea su salud,
detecta drift, y señala cuándo se degrada.
Estado: 🔶 PARCIAL
Implementado en (versiones reales G7.1):
  - architecture.manifest.ts v3.3.0 (SSOT: MODULE_INVENTORY,
    AUDITED_REGISTRY 27 entradas, VERSION_SYNC; BC-02 APPLIED — Lote 4)
  - tools/architecture-guardian.ts v4.1.1 (26 checks X-series,
    verificado contra digest de producción: 1.151 archivos,
    30.075 violaciones, score 8.0/10)
  - tools/validate-shared-imports.ts v4.0.0 (registry-driven)
  - scripts/verify-integration.ts v3.0.0 (8 checks)
Pendiente:
  - Auto-generated reference map entre archivos
  - Health scoring automático por módulo
  - Cycle detection automático
  - Pre-commit hook integration
  - Expansión Guardian: 26 → 45+ checks (CHECKLIST §16)

PILAR 2 — Perceptual Design System
─────────────────────────────────────────
Propósito: Sistema de diseño con theming adaptativo, motion language,
glass/elevation nativo. Tokens como fuente única de verdad.
Estado: ✅ COMPLETO (core — FASE 0 + re-audit Lote 2)
Implementado en:
  - globals.css v2.2 (auditado 9.7/10 — v2.1 pre-audit 6.2/10;
    75 tokens, 107 keyframes, 28 @property, conteos machine-verified)
  - Token reconciliation (CHECKPOINT §1.2 canonical — 9 tokens
    divergentes SINCRONIZADOS en v2.2; --font-body eliminado)
  - BEM Namespace Registry (CHECKPOINT §1.4 — 28 prefijos)
  - Domain Color Map (CHECKPOINT §1.5 — 14 dominios + 9 pendientes)
Pendiente (enhancements — no bloquean el core):
  - Theme switching dinámico (light mode existe pero sin toggle)
  - Adaptive themes (AI-generated)

PILAR 3 — System Structure & Type Contracts
─────────────────────────────────────────
Propósito: Tipos como primera clase. Contratos entre módulos.
Estado: 🔶 PARCIAL
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
Estado: ✅ COMPLETO (core — FASE 1.5)
Implementado en:
  - shared/lib/api.ts (callMCPTool, healthCheck, JWT) ✅ 9.3
  - shared/lib/mcp/mcp-router.ts (routeMCPCall) ✅ 9.3
  - shared/hooks/useMCPQuery.ts (useMCPQuery, useMCPMutation) ✅ 9.3
  - shared/hooks/useAutonomousAdvisor.ts ✅ 9.3
Pendiente (enhancements):
  - Streaming support para agent responses
  - Circuit breaker para MCP calls
  - Semantic cache

PILAR 5 — State & Data Architecture
─────────────────────────────────────────
Propósito: Separación de 4 dominios de estado (server, client, URL, AI).
Estado: 🔶 PARCIAL
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
Estado: ✅ COMPLETO (core — FASE 1.5; el motor está completo,
los hooks por-feature se trackean en las FASEs, no aquí)
Implementado en:
  - shared/lib/advisor-engine/ (~45 archivos, 12 domain rules)
  - Engine, evaluate, confidence, health-score, signal-bus,
    causal-chain, calibration, goal-engine, plan-builder,
    nl-rule-*, delta-simulator, system-analyzer, evolution-proposer,
    command-*, alert-dispatcher, learning-profile, mcp-tool-registry
Pendiente (enhancements, trackeados per-FASE):
  - Feature-level advisor hooks (useEventAdvisor done, 22 en FASEs)
  - Adaptation surfaces para UI adaptation
  - Cross-domain signal integration por feature

PILAR 7 — Error Resilience
─────────────────────────────────────────
Propósito: Degradación elegante. Un error nunca tumba todo.
Estado: 🔶 PARCIAL
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
Estado: ⬜ PENDIENTE
Pendiente:
  - Performance budgets (bundle, render time, state update)
  - Bundle analysis tooling
  - Core Web Vitals tracking (LCP, FID, CLS)
  - Code splitting por feature
  - Lazy loading strategy

PILAR 9 — Observability & Intelligence Telemetry
─────────────────────────────────────────
Propósito: Telemetry de agents, UX, performance, arquitectura.
Estado: ⬜ PENDIENTE
Pendiente:
  - Telemetry service (track events, errors, performance)
  - Agent monitoring (status, latency, success rate)
  - Architecture health dashboard
  - User behavior tracking
  - Alert system for critical issues

PILAR 10 — Architecture Guardian
─────────────────────────────────────────
Propósito: Auto-enforcing quality gate. Pre-commit + CI.
Estado: 🔶 PARCIAL (Lotes 1-2 completados — ver CHECKPOINT §3.5)
Implementado en (versiones reales G7):
  - tools/architecture-guardian.ts v4.1.1 (26 checks X-series)
  - tools/validate-shared-imports.ts v4.0.0 (AUDITED_REGISTRY
    via manifest — ya no lista hardcodeada: el manifest es SSOT)
  - scripts/verify-integration.ts v3.3.0 (8 checks · VI-16/VI-17)
  - architecture.manifest.ts v3.8.0 (SSOT del registro · §16 BACKEND_REGISTRY re-AST 207 tools @ 504b53d)
  - tools/verify-build-css.ts v1.0.0 (GATE POST-BUILD — sonda del
    bundle dist/: utilities · familia font · piso · fugas — nació
    del P0 0002/0003: source('.') perdió la capa de utilities
    207k→118k sin que NINGÚN gate lo viera; hoy en pnpm
    verify:build-css + precommit)
Pendiente:
  - Expandir guardian 26 → 45+ checks (CHECKLIST §16)
  - Pre-commit hook installation (package.json)
  - CI/CD pipeline integration
  - Auto-fix mode (--flag — guardian ya tiene base)
  - css-audit.ts (35 checks — harness Python probado, port pendiente)
  - component-audit.ts (14 checks)
  - feature-integration-audit.ts (12 checks D+E+G)
  - pre-commit-pipeline.ts (orchestrator)

PILAR 11 — Checkpoint Protocol
─────────────────────────────────────────
Propósito: Validación multidimensional + rollback. Gate, no sugerencia.
Estado: ✅ COMPLETO (core — G7: masters auditados y consistentes)
Implementado en:
  - MASTER_CHECKPOINT.md v7.0 (§0.3 Master Self-Audit)
  - MASTER_CHECKLIST.md v7.0 (§16.3 tabla de consistencia)
  - scripts/verify-master-consistency.py (guard G7)
Pendiente (enhancements):
  - Automated checkpoint generation tool (tools/master-audit.ts)
  - Checkpoint diff between phases
  - Automated rollback triggers
```

### §2.3 Status Matrix (G7 — verificada contra §2.2)

```
Pilar  Nombre                      Capa           Estado (taxonomía §0.3)
────── ─────────────────────────── ────────────── ──────────────────────
  1    Architecture Graph          Foundation     🔶 Parcial
  2    Design System               Foundation     ✅ Completo (core)
  3    Type Contracts              Foundation     🔶 Parcial
  4    MCP Substrate               Intelligence   ✅ Completo (core)
  5    State & Data                Intelligence   🔶 Parcial
  6    AI-Native                   Intelligence   ✅ Completo (core)
  7    Error Resilience            Resilience     🔶 Parcial
  8    Performance                 Resilience     ⬜ Pendiente
  9    Observability               Governance     ⬜ Pendiente
 10    Guardian                    Governance     🔶 Parcial
 11    Checkpoint Protocol         Governance     ✅ Completo (core)

COMPLETOS (core): 4/11 · PARCIALES: 5/11 · PENDIENTES: 2/11
(4 + 5 + 2 = 11 ✓ — coincide con la matriz fila por fila.
v2.0 decía "5/3/3" contradiciendo su propia matriz = hallazgo #33.)
```

---

## §3 ARCHIVOS PENDIENTES PARA COMPLETAR LOS 11 PILARES

```
════════════════════════════════════════════════════════════════
  ARCHIVOS/MÓDULOS PENDIENTES POR PILAR (conteo verificable G7)
════════════════════════════════════════════════════════════════

PILAR 1 — Architecture Graph (3)
  tools/generate-reference-map.ts    → Auto cross-refs
  tools/health-scoring.ts            → Per-module health
  tools/detect-cycles.ts             → Dependency cycles

PILAR 3 — Type Contracts (2 shared + trabajo per-FASE)
  shared/types/mcp-contracts.ts      → MCP response types
  shared/types/agent-contracts.ts    → Agent interface types
  features/*/types.ts                → 22 features (events ✅ done) —
                                       se trackea en las FASEs (§9 CHECKPOINT)

PILAR 5 — State & Data (3)
  stores/ai-state.store.ts           → AI/agent state
  shared/lib/state-machines/         → Formal state machines
  shared/hooks/useUnifiedState.ts    → Unified selectors

PILAR 7 — Error Resilience (4)
  shared/resilience/error-boundaries.tsx → Multi-level
  shared/resilience/fallbacks.tsx        → Degraded UI
  shared/resilience/recovery.ts          → Auto-retry
  shared/resilience/index.ts             → Barrel

PILAR 8 — Performance (5)
  shared/observability/performance.ts → Budgets + marks
  tools/analyze-bundle.ts             → Bundle analysis
  shared/hooks/useWebVitals.ts        → Extend existing
  vite.config.ts (code splitting)     → Lazy load per route
  .perf-budget.json                   → Budget config

PILAR 9 — Observability (4)
  shared/observability/telemetry.ts   → Event tracking
  shared/observability/agent-monitor  → Agent health
  shared/observability/arch-health    → Arch health report
  shared/observability/index.ts       → Barrel

PILAR 10 — Guardian (4)
  tools/css-audit.ts                  → 35 CSS checks (harness probado)
  tools/component-audit.ts            → 14 component checks
  tools/feature-integration-audit.ts  → 12 checks (D+E+G)
  tools/pre-commit-pipeline.ts        → Orchestrator de todos

RESUMEN (matemática explícita — hallazgo #54 corregido):
  Archivos de infraestructura nuevos: 3+2+3+4+5+4+4 = 25
  Trabajo per-feature (types.ts × 22, advisor hooks × 22):
  trackeado en las FASEs (CHECKPOINT §9), NO se cuenta aquí
  (v2.0 mezclaba ambos y afirmaba "~28" sin base verificable)
  VERDADERAMENTE CRÍTICOS: Pilares 8 y 9 (Performance + Observability)
```

---

## §4 AUDIT PROTOCOL (7 Phases)

### §4.1 Per-File Audit Protocol (7 Phases)

```
PHASE 0: SHARED/ DEPENDENCY CHECK (before Phase 1)
  ┌─────────────────────────────────────────────────────────┐
  │ 1. List ALL shared/ imports in the file                 │
  │ 2. For EACH: have I READ that file's implementation?    │
  │ 3. Cross-ref contra AUDITED_REGISTRY (manifest §8 —     │
  │    SSOT; ver CHECKPOINT §12 para el resumen legible)    │
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
  │   A (18) + B (80, si CSS) + C (22) + D (8, si intel)   │
  │   + E (7, si feature) + F (10, si feature)             │
  │   + G (8, si AI) + H (7, si cambios en shared/)        │
  │   + I (10) + J (10)                                    │
  │ Mark each as applicable / N/A / pass / fail             │
  │ (G7: H añadido — consistente con CHECKLIST §16;        │
  │  v2.0 lo omitía = hallazgo #37)                         │
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
  │   - §N+5 Responsive (768px + 480px obligatorios;        │
  │     1024px condicional — ver §5.2)                      │
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
  ✗ Change backend API contracts SIN gate — el backend está bajo
    auditoría P2-C3 desde 2026-10: todo cambio en src/club_mcp REQUIERE
    backend/scripts/smoke_b0.py VERDE (39/39 runtime · 207 tools) +
    pytest tests/unit 818/818
    (protocolo P2-C3: CHECKPOINT §3.6; SSOT backend: manifest §16)
```

---

## §5 REWRITE PROTOCOL (TSX + CSS)

### §5.1 TSX Rewrite Protocol

```
STEP 0: Shared/ Dependency Resolution
  1. Ask user for the feature file (e.g., EventDetail.tsx)
  2. Read it ONCE
  3. Extract ALL imports from shared/
  4. Cross-reference each contra AUDITED_REGISTRY (manifest §8)
  5. If ALL audited → proceed to Step 1
     If ANY NOT audited → STOP and tell user:
     "I need these shared/ files before I can rewrite:
      1. shared/components/ui/X.tsx
      2. shared/hooks/useY.ts
      Pasame estos archivos, los audito + rewrite en paralelo,
      y luego finalizo el feature file."

STEP 1: Audit the Feature File
  Run through ALL applicable checklists (MASTER_CHECKLIST.md):
    A (18) + B (80, si CSS) + C (22) + D (8, si intelligence)
    + E (7, si feature) + F (10, si feature) + G (8, si AI)
    + H (7, si shared/) + I (10) + J (10)

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
    [x] §0 Imports (organizados: React core → shared/ui → layout →
        hooks → lib → types → feature hooks/components → icons → css)
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
  [x] §N+5 Responsive — breakpoints OBLIGATORIOS 768px + 480px;
      1024px ADICIONAL cuando el layout cambia a desktop
      (G7, hallazgo #39: v2.0 decía "3 breakpoints mínimo" y
      contradecía el template §13 y los checks B-56/B-57/B-58;
      canon unificado: 2 obligatorios + 1 condicional)
  [x] §N+6 Print (@media print)
  [x] ALL 13 CSS Dimensions covered
  [x] var(--ease-apple) on ALL transitions
  [x] -webkit-backdrop-filter on ALL backdrop-filter
  [x] CSS custom properties for all colors (no hardcoded hex)
  [x] BEM namespace matching the domain (ev-*, fm-*, sp-*, etc.)
```

---

## §6 PROJECT STRUCTURE (Real — verificado G7 contra digest de producción)

### §6.1 Key Directories

```
frontend/src/                          ← 1.151 archivos (digest verificado
│                                         por guardian v4.1.1; v2.0/v6.1
│                                         estimaban ~810 = hallazgo #55)
├── app/                          ← Router, providers, layout
│   ├── App.tsx, providers.tsx
│   ├── router.tsx, RoleRedirect.tsx
│
├── features/                     ← 23 feature domains
│   │                               (23 = 20 core + 3 cross-cutting;
│   │                                __TEMPLATE__ NO cuenta como feature)
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
├── shared/                       ← ~197 archivos (recomputado G7 del
│   │                               inventario CHECKPOINT §8: 92
│   │                               components + 30 hooks + ~65 lib +
│   │                               3 types + 5 mocks + 1 services +
│   │                               1 template; v6.1 decía ~180 =
│   │                               hallazgo #43; task V-01 verificar)
│   ├── components/
│   │   ├── AdvisorBanner.tsx     ← Unified advisor banner
│   │   ├── InsightCard.tsx
│   │   ├── ui/                   ← 23 UI components + barrel ✅
│   │   ├── layout/               ← 20 components (DashboardLayout, etc.)
│   │   ├── ai/                   ← 11 components (AIDecisionPanel, etc.)
│   │   ├── chat/                 ← AIChatWidget + hook
│   │   ├── ml/                   ← 7 components + 3 hooks
│   │   ├── auth/                 ← PermissionGate, ProtectedRoute
│   │   ├── error/                ← ErrorBoundary, NotFoundPage
│   │   ├── export/               ← 17 archivos (4 + 11 decision/* + 2 hooks)
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
│   │   ├── utils.ts              ← ⚠️ PENDING REWRITE (score 7.2,
│   │   │                           6 violaciones U-01..U-06, RC-3)
│   │   └── ... (15+ modules)
│   ├── types/                    ← PILAR 3 (3 type files)
│   ├── mocks/                    ← 5 mock infrastructure files
│   ├── services/                 ← exportService.ts
│   └── features/__TEMPLATE__/    ← types template
│
├── stores/                       ← PILAR 5 (5 Zustand stores)
│
└── main.tsx

backend/                          ← BAJO AUDITORÍA P2-C3 (gate B0 VERDE @
│                                   e15068e · G8 absorbe el estado real;
│                                   v7.0 decía "~123 files NO SE TOCA" = #65)
├── src/club_mcp/                 ← 104 módulos .py (verificado G8)
│   ├── agents/                   ← 19 agentes MCP · 207 tools @MCPTool
│   │                               (age_group_activity.py muerto → cola
│   │                               Q-MSC-01; v7.0 decía "22" = #69)
│   ├── ai/                       ← claude_service + prompts (sin retry/
│   │                               timeout/fallback → cola Q-LLM-01)
│   ├── api/                      ← FastAPI routes (5 routers)
│   ├── auth/                     ← JWT, RBAC 196/196, middleware
│   │                               (secreto JWT hardcodeado → Q-SEC-01)
│   ├── config/                   ← pydantic-settings SIN consumidores
│   ├── db/repositories/          ← 18 repos in-memory → Q-PER-01
│   ├── hitl/                     ← ApprovalEngine (in-memory → Q-PER-03)
│   ├── models/                   ← 22 módulos de esquemas
│   ├── rag/                      ← RAG híbrido RRF + reranker (8 módulos)
│   └── server.py                 ← entry point MCP (adaptador delgado)
├── tests/unit/                   ← 26+3 archivos · 818 tests PASSED
│                                   (808 def + 10 parametrizados —
│                                   B2/B3/B4 agregaron 33)
└── scripts/smoke_b0.py           ← gate ejecutable B0 (39/39 runtime · 207)

frontend/tools/                   ← Automation (estado real G9)
├── architecture.manifest.ts      ← v3.8.0 — SSOT (§16 BACKEND_REGISTRY
│                                   re-AST: 19 agentes · 207 tools @
│                                   504b53d · VERSION_SYNC con guardian
│                                   4.1.3 / VI 3.3.0 / verifyBuildCss 1.0.0)
├── architecture-guardian.ts      ← v4.1.3 — 26 checks X-series
│                                   (AG-29 X-16 α/β/γ · AG-30 X-28
│                                   token-boundary −109 FP)
├── validate-shared-imports.ts    ← v4.0.0 — registry-driven (audit del
│                                   tool pendiente — #63 documentado)
├── PAREJAS CSS T1: 78 css nuevos (12 arquetipos × 7 dominios · 122
│   keyframes únicos · X-13=0 · guardian -74) · 417/483 tsx con
│   pareja propia · tramo 2 (61 acoplados) → cola §15
(scripts/verify-master-consistency.py v1.0.0 — MC-01..09
│   IG-01..04 · en CI + pre-commit · Q-GOV-04 cerrado)
├── verify-build-css.ts           ← v1.0.0 — GATE POST-BUILD (B6-QA;
│                                   P0 0002/0003 — ver Pilar 10)
└── (pendientes: css-audit, component-audit,
    feature-integration-audit, pre-commit-pipeline)

scripts/                          ← hermano de frontend/ (G25)
├── setup.sh
├── verify-integration.ts         ← v3.2.0 — 8 checks + VI-12 restaurado
│                                   (regresión 290afa4 = #62, fix G8)
├── p2a..p2c3h_*.ts               ← herramientas de las fases de auditoría
│                                   (evidencia ejecutable — §3.6 CHECKPOINT)
└── bld*/g14/g20/g21/g28*        ← escáneres y fixes typecheck/build
    ⚠ #73: verify-master-consistency.py CITADO en G7 §0.3 NO EXISTE
    en el repo — crearlo (regla G8 + tabla §16.3) = cola Q-GOV-04

TOTAL PROYECTO: ≈ 1.294+ archivos (verificado G8)
  frontend/src 1163 (find G8; digest G7 = 1.151 — delta post-C3g)
  + backend/src 105 (104 .py) + backend/tests 27 (775 test_)
  (v7.0 decía ~1.286 con backend ~123 — task V-03 CERRADA en G8:
   cifras computadas contra el árbol; config/ se trackea vía manifest §16)
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
RULE 1: ONE TOKEN TRUTH (jerarquía corregida G7 — hallazgo #34)
  CHECKPOINT §1.2 es el CANON de valores. globals.css es la
  IMPLEMENTACIÓN y debe reflejar §1.2 EXACTAMENTE (estado v2.2:
  sincronizado ✓). Component CSS CONSUME tokens — jamás los redefine.
  Si globals.css diverge de §1.2, globals.css se corrige.
  (v2.0 invertía la jerarquía: "if globals.css says X…" — confuso.)

RULE 2: CSS CO-LOCATED, NO EXCEPTIONS
  Every .tsx has its .css next to it. No Tailwind. No inline colors.

RULE 3: BEM WITH DOMAIN PREFIX
  ui-* for shared, ev-* for events. Never .card, .title, .container.
  Source: CHECKPOINT §1.4 registry (28 prefijos).

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
  (G7: el estado de audit se consulta en AUDITED_REGISTRY del
   manifest §8 — SSOT; CHECKPOINT §12 es el resumen legible.)

RULE 8: BACKBONE TOOLS ARE LAW
  architecture-guardian.ts + validate-shared-imports.ts +
  verify-integration.ts must pass.
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
ZERO TOLERANCE MEANS (en CÓDIGO NUEVO — G7, hallazgo #38):
  • 0 `any` types
  • 0 framer-motion / react-spring / GSAP
  • 0 hardcoded hex/rgba in CSS (non-globals.css)
  • 0 Tailwind utilities as primary styling
  • 0 inline styles for colors
  • 0 default exports en código nuevo (legacy documentado con
    TODO de migración = excepción temporal — ver A-09)
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

## §9 SESSION STARTUP (FUENTE CANÓNICA — §1.1 apunta aquí)

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
   c) Listar shared/ pendientes de audit si aplica (§13 CHECKPOINT /
      AUDITED_REGISTRY del manifest)
   d) Decir: "Listo. Pasame el archivo a auditar/escribir."

4. PASAR el archivo a trabajar (TSX, CSS, types, config, etc.)

5. EL AI SIGUE:
   Phase 0 (Shared/ dep check) → Phase 1-6 (Audit → Rewrite)
   → SCORE (§0.2 methodology) → Actualizar AUDITED_REGISTRY
   (manifest §8) + MASTER_CHECKPOINT.md

6. REPETIR para cada archivo hasta completar la FASE

7. GATES FRONTEND POR SESIÓN CON BUILD: build (tsc -b && vite build)
   → verify:build-css (sonda del bundle) → VI → vitest → guardian.
   El precommit corre guardian + lint + type-check + verify:build-css.

7b. SI LA SESIÓN TOCA BACKEND (src/club_mcp o tests/unit):
   a) El gate es EJECUTABLE, no documental:
      backend/scripts/smoke_b0.py (39/39 runtime · 207 tools) ·
      pytest tests/unit (818/818)
   b) La SSOT del estado backend es manifest §16 BACKEND_REGISTRY (v3.4.0)
      + CHECKPOINT §15 (cola) — NO reportes .txt sueltos (#71)
   c) El protocolo de auditoría §4 (checklists A-J) es FRONTEND; el
      backend sigue el protocolo P2-C3 (CHECKPOINT §3.6)

⚠️ PARCIAL PASTE HANDLING:
   Si un archivo no cabe en 1 mensaje:
   → Partir en 2-3 bloques
   → Esperar confirmación de cada parte ("Parte N procesada")
   → El AI NUNCA procede hasta absorción completa
   → Si el AI pierde contexto, el MASTER_CHECKPOINT lo restaura

IMPORTANTE:
   • Si el AI pide un shared/ file → dárselo ANTES de continuar
   • Si el AI dice "STOP: necesito X" → esperar y proporcionar
   • Si el score es < 9.3 → el archivo NO está completo
     (excepciones bajo umbral quedan FLAGGED — re-audit obligatorio)
   • Si hay errores del guardian → FIX antes de continuar
```

### §9.1 Cross-Reference Map (FUENTE CANÓNICA — §1.3 apunta aquí)

```
Tema                            Archivo           Sección
─────────────────────────────── ───────────────── ─────────
Role + Authority                MASTER_BASE       §0
5-Tier Protocol                 MASTER_BASE       §0.1
Scoring Methodology             MASTER_BASE       §0.2
Terminología/Taxonomía/Version  MASTER_BASE       §0.3
How to use files                MASTER_BASE       §1
Ownership (anti-dup)            MASTER_BASE       §1.3 (+ este mapa §9.1)
11 Pilares                      MASTER_BASE       §2
Pending files                   MASTER_BASE       §3
Audit protocol (7 phases)       MASTER_BASE       §4
Rewrite protocol                MASTER_BASE       §5
Project structure               MASTER_BASE       §6
Communication Architecture      CHECKLIST          §14.6
Rules + Zero Tolerance          MASTER_BASE       §8
Session startup                 MASTER_BASE       §9
─────────────────────────────── ───────────────── ─────────
Brutal Diagnosis                CHECKPOINT        §0.1
Vision 2027                     CHECKPOINT        §0.2
Master Self-Audit               CHECKPOINT        §0.3
Design tokens + BEM             CHECKPOINT        §1
Architecture (CSS layers)       CHECKPOINT        §2
Completed Work                  CHECKPOINT        §3
Quality Scorecard               CHECKPOINT        §4
Execution Plan                  CHECKPOINT        §5
Cumulative Metrics              CHECKPOINT        §6
Breaking Changes                CHECKPOINT        §7
Component Inventory             CHECKPOINT        §8
Feature Migration Order         CHECKPOINT        §9
Innovation Proposals            CHECKPOINT        §10
Appendices                      CHECKPOINT        §11
Parallel Audit Status           CHECKPOINT        §12
Files Pending Review            CHECKPOINT        §13
CURRENT STATE + PENDING ASKS    CHECKPOINT        §14
─────────────────────────────── ───────────────── ─────────
Checklist A (TypeScript)        CHECKLIST          §1
Checklist B (CSS 80 checks)     CHECKLIST          §2
Checklist C (Component)         CHECKLIST          §3
Checklist D (Intelligence)      CHECKLIST          §4
Checklist E (Feature)           CHECKLIST          §5
Checklist F (Integration)       CHECKLIST          §6
Checklist G (AI/ML)             CHECKLIST          §7
Checklist H (Shared Arch)       CHECKLIST          §8
Checklist I (Mandatory Imp)     CHECKLIST          §9
Checklist J (Shared Verify)     CHECKLIST          §10
Anti-Patterns (52)              CHECKLIST          §11
Level 6+ Standard (7 Cualidades) CHECKLIST         §12
CSS + TSX Templates             CHECKLIST          §13
Mandatory Shared/ Imports       CHECKLIST          §14
AI/ML Strategy                  CHECKLIST          §15
AUTOMATION MAPPING + Consistencia CHECKLIST        §16
─────────────────────────────── ───────────────── ─────────
Audit Status (SSOT real)        architecture.manifest.ts §8
(AUDITED_REGISTRY — 27 entradas; los masters sólo resumen)
Backend registry (SSOT)         architecture.manifest.ts §16 (G8)
Cola de arquitectura            CHECKPOINT        §15 (NUEVO G8)
Estado P2-C3 / gate B0          CHECKPOINT        §3.6 + §14 (G8)
```

---

## §10 DEPRECATION PROTOCOL

```
╔══════════════════════════════════════════════════════════════════════╗
║  DEPRECATED SOURCES — Do NOT use these as reference                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ❌ Masters G8 (v8.0 · 2026-11-08):
║     REASON (G9): congelados 3 días — no conocen la serie B1-B6
║     (migración MCP real, 196→207 tools, VI v3.3.0, guardian v4.1.3,
║     gate verify-build-css v1.0.0 ni el P0 0002/0003). VALID
║     CONCEPTS: TODOS preservados en G9 (protocolos §4/§5/§9 intactos).
║
║  ❌ Masters G7 (v7.0 · 2026-08-12):                                  ║
║     REASON (G8): congelados 3 meses — no conocen P2-C1..C3h, el      ║
║     backend MCP (19 agentes · 196 tools), el gate B0 VERDE ni los    ║
║     785 tests (#61); §13/§14 CHECKPOINT pedía lo ya resuelto G9      ║
║     (#67); citaba un script inexistente (#73).                       ║
║     VALID CONCEPTS: TODOS preservados en G8 (protocolos §4/§5/§9     ║
║     intactos — G8 cambia ESTADO y DATOS, no el protocolo).           ║
║                                                                      ║
║  ❌ Masters pre-G7:                                                  ║
║     MASTER_BASE.md v1.0/v2.0 · MASTER_CHECKPOINT.md v3.0-v6.1 ·    ║
║     MASTER_CHECKLIST.md v6.0/v6.1                                    ║
║     REASON (G7): 30 defectos documentados (hallazgos #31-#60,       ║
║     CHECKPOINT §0.1): fences corruptos, 6 errores matemáticos,      ║
║     contradicciones entre reglas, referencias colgantes, versiones  ║
║     de herramientas stale. G7 los reemplaza integralmente.          ║
║     VALID CONCEPTS: TODOS preservados y corregidos en G7.           ║
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
║     ✅ Architecture Manifest concept (exists: v3.3.0)                ║
║     ✅ Architecture Guardian concept (exists: v4.1.1)                ║
║     ✅ Performance Budgets concept (Pilar 8)                         ║
║     ✅ Circuit Breaker for MCP (Pilar 4 improvement)                 ║
║     ✅ 3 Tracks Paralelos (Foundation + Automation + Migration)      ║
║     ✅ Predictive Ambient Canvas (adapted to health scores)          ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

END OF MASTER_BASE.md v9.11 · Generación G15.1 (sincronizada con
MASTER_CHECKPOINT.md v9.11 y MASTER_CHECKLIST.md v9.11)


