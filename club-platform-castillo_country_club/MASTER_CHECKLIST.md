# MASTER_CHECKLIST.md — Validation Gates & Standards
## Castillo Country Club · Intelligence Platform 2027
### Level 6+ Agency · Apple/Xiaomi Production Grade
### Version: 9.35 · Generación G40 (Ola 4.1 — ledger de gobierno + recibos verificables OFFLINE: vertical gobierno · Q-GOV-01 CERRADO) · 180 checks · ZERO tolerance
### Updates: G9 — §16.1/§16.3 regenerados al estado real del repo
###          (504b53d: manifest v3.8.0 · VI v3.3.0 · guardian v4.1.3 ·
###          NEW verify-build-css v1.0.0 · smoke 207 · pytest 818);
###          checks A-J intactos (180 — el estándar no cambia,
###          cambia la evidencia)

---



## CHANGELOG G40 (v9.34 → v9.35)

OLA 4.1 — LEDGER DE GOBIERNO + RECIBOS
VERIFICABLES OFFLINE (Q-GOV-01 CERRADO
— charter Ola 4 §5.4 guía G40; NO el
Q-GOV-01 del censo G9 §15-P2 'guardian
backend-aware', que sigue ABIERTO: ID
colisionado por herencia del censo,
anotado en §15) · CERRADO en DOS commits
(5aef1db vertical 0069 + 1a2931d job-name
pytest 1062→1091 — run #83 VERDE 5/5):
- gobierno/ledger.py (405L): LEDGER
  APPEND-ONLY por construcción — frozen
  dataclasses sin métodos de mutación,
  copia defensiva en lectura, doble
  sellado sha-256 sobre JSON canónico
  sort_keys: cadena lineal (génesis
  0*64, ADR-0007) + ÉPOCAS MERKLE
  RFC 6962 que cada 8 eventos sellan
  la raíz DENTRO de la cadena
  (epoch_seal merkle-epoch-v1) · reloj
  inyectado: determinismo byte a byte ·
  ReciboInclusion portable O(log n) —
  época·seq·event_hash·camino·raíz —
  emitible SOLO contra época cerrada.
- gobierno/verificar_recibo.py (123L):
  CLI STANDALONE stdlib auto-contenida
  que un TERCERO corre fuera del repo
  sin DB ni red: recibo legítimo exit 0 /
  falsificado exit 1 (compliance como
  DATO verificable, no como PDF).
- Suite 29 tests stdlib pura (317L):
  cadena · épocas · tamper con posición
  exacta · inmutabilidad por reflexión
  del API · vector fijo hardcodeado
  226effef… · anti-falsificación en 3
  vectores · GATE DE EQUIVALENCIA
  ledger↔CLI que blinda la doble
  implementación del folding Merkle ·
  bug cazado por la propia suite:
  recibo() localizaba la época por
  divmod(seq) cuando los sellos también
  ocupan seq — corregido por conteo de
  eventos no-sello.
- ADR-0010 (77L): 3 decisiones + deuda
  declarada (DV-002): nace SIN cableado
  runtime — Ola 4.2 (Q-GOV-02) lo
  conecta en el punto de aplicación.
- pytest 1062→1091 CI (+29 gobierno ·
  local 1057→1086 + 5 PG-solo-CI) ·
  run #83 VERDE 5/5 · ruff/mypy
  verticales 0 · superficie MCP INTACTA
  19/207/207 (gobierno/ es
  infraestructura de gobernanza, no
  superficie MCP) · errata BASE v9.34
  RESUELTA: gobierno/ en el árbol (la
  pagó 5aef1db: 6 archivos · 942L).

## CHANGELOG G39 (v9.33 → v9.34)

OLA 3.4 — VERTICAL GOLDEN SET + LLM-AS-JUDGE
(Q-LLM-04 CERRADO DEL TODO — markers
slow/integration/hitl existían, suites no →
golden de PROMPTS primero: respuestas cuando
haya tráfico, deuda anotada en ADR-0009)
CERRADO en DOS commits (389fbd8 vertical 0067
+ 27580fe job-name pytest 929→1062 — run #81
VERDE 5/5):
- tests/unit/ai/golden/prompts_v1.json: 41
  pins (version · sha256 · variables · chars)
  + 22 render_sha256 con kwargs sintéticos
  estables — semilla generada POR EJECUCIÓN
  desde registry_snapshot() @66e73de, no
  transcripción: un template editado sin bump
  es CI ROJO con diff legible.
- ai/llm_judge.py: judge_response() — HARD
  GATE determinista PRIMERO (placeholders sin
  resolver / substrings exigidos-vedados /
  rango de largo: el LLM NUNCA se consulta si
  la rúbrica reprueba) y LLM ADITIVO después
  (Protocol LLMClient estructural · salida
  debe cumplir su propio contrato JSON o queda
  degraded: rubric | rubric+llm | rubric+llm-
  error | rubric+llm-contract) · sin cliente =
  veredicto de rúbrica (CI sin key corre el
  gate duro SIEMPRE) · salida lleva
  judge_prompt_sha256 + judge_eval_sha256.
- Prompts del juez NACEN versionados:
  judge.system + judge.eval v1.0.0 (registry
  39→41 · placeholders 35→38 — la derivación
  cazó el ejemplo JSON del contrato: llaves
  dobladas = literal).
- Suites test_golden_prompts.py (4 def +
  41+22 parametrizados) y test_llm_judge.py
  (8 unit con stub — hard gate no consulta LLM
  probado con contador · conforme/roto/
  cercado/caído + 1 integration skipif sin
  ANTHROPIC_API_KEY) · censo 39→41 · pytest
  990→1062 CI (+72: 83 nueva suite ai − 11
  reemplazados del censo viejo) · ruff y
  mypy verticales en 0.
- ADR-0009-golden-judge.md: 3 decisiones +
  deuda explícita (columna prompt_sha256 en
  llm_calls · golden de respuestas cuando
  haya tráfico).

## CHANGELOG G38 (v9.32 → v9.33)

OLA 3.3 — VERTICAL PROMPT_REGISTRY (Q-LLM-03
CERRADO DEL TODO — 814 líneas de constantes sin
versionado ni contrato → registry: nombre canónico
+ semver + sha256, y el contrato de variables se
DERIVA del template — no puede mentir)
CERRADO en DOS pasos (3d6f010 vertical 0064 +
7c6044f fix-forward 0065 — CI run #78 ROJO
(persistence) → run #79 VERDE 5/5):
- ai/prompt_registry.py: 39 PromptSpec (name
  canónico · semver v1.0.0 = texto vivo del árbol
  byte a byte · variables DERIVADAS con
  string.Formatter · sha256 fingerprint — semilla
  del golden set 3.4/Q-LLM-04).
- render() valida kwargs exactos ANTES de gastar
  la llamada (falta/sobra → ValueError legible con
  el diff — el typo insight_id vs insights_id pasa
  de KeyError tardío a error de puerta) ·
  render_prompt/get_prompt/registry_snapshot
  (positional-only: 'name' es variable de template).
- Swap de los 4 puntos de render del árbol
  (claude_service 4 · advisor_intelligence 7 ·
  family_profile 5 + system_prompt por
  AGENT_SYSTEM_PROMPTS intacto · rag_service 1) —
  contrato observable INTACTO: render() ==
  template.format(**kwargs) byte a byte.
- DEDUPE RAG: RAG_SYSTEM_PROMPT duplicado byte a
  byte (ai/prompts.py:798 huérfano + rag_service
  .py:77 vivo) → fuente canónica única = entrada
  'rag' del registry · ADR-0008 (3 decisiones) ·
  prompts_member_360.py (92L · 0 importadores)
  fuera del registro: su spec nace versionado.
- Suite 9 tests (censo 39 byte a byte ·
  render==format 11 casos · falta/sobre/
  desconocido · 35 placeholders derivados · sha256
  entre procesos · dedupe RAG · grep negativo) ·
  pytest 981→990 CI · persistencia 135 (sin
  cambio) · ruff 1189→1186 (vertical 0 · isort
  pagó 3) · mypy 721 (vertical 0).
- Fix run #78 absorbido: instrument_engine por
  IDENTIDAD (WeakSet) — heisenbug del guard id()
  PRE-EXISTENTE (el vertical solo desplazó el
  patrón de allocations); la clase entera del bug
  muere, no este caso.

## CHANGELOG G37 (v9.31 → v9.32)

OLA 3.2 — VERTICAL LLM_CALLS + PRESUPUESTO
PERSISTENTE (Q-LLM-02 CERRADO DEL TODO — el
contorno G12 "persistencia real llega con
PostgreSQL" pagado: el presupuesto LLM vive EN
TABLA y SOBREVIVE al restart)
CERRADO en UN paso (aede317 vertical 0062 —
evidencia: OUT del APLICAR-VERTICAL-3.2-LLM-CALLS
+ CI run #76 VERDE 5/5 a la primera):
- 2 tablas: llm_calls (append-only — provider·
  model·tokens·degraded·provider_error·
  latency_ms·called_at·date_key) + llm_usage_daily
  (UNIQUE date_key · tokens·calls — el día se
  acumula EN TABLA) · alembic 0022 con 3 índices
  explícitos estilo 0018 (called_at auditoría ·
  date_key presupuesto · up/down/up determinista
  verificado).
- LLMCallsRepository async + TokenUsageLedger-
  Persistent (adapter MISMA API record/snapshot —
  _acall y los 6 consumidores NO cambian un byte;
  señal 80/95 MISMA del ledger G12 recalculada
  DESDE TABLA) · swap OPT-IN POR DENTRO del
  ResilientClaudeService (bootstrap: con
  CLUB_PERSISTENCE_URL cablea el adapter — sin
  env, contorno in-memory byte a byte · smoke B0
  VERDE).
- persistencia 128→135 (llm_calls 6: write-
  restart-read presupuesto · umbral re-derivado
  tras restart · degraded honesta 0/0 · auditoría
  ordenada ASC/DESC · drop-in in-memory vs ORM
  MISMA señal 90% · contrato vacío + 1 PG-real
  en CI) · pytest 974→981 · ruff vertical 0 ·
  mypy vertical 0 (regla §3.2.8: archivo NUEVO
  nace en 0) · globales 1189/721 ≤ baseline
  1282/733 · MC 13/13 · wiring e2e sobre DB
  migrada (warning 90% · critical 95%+ ·
  snapshot desde tabla) · lección 0053
  auto-aplicada (':' fuera del scalar YAML del
  step persistence).
- Errata G36.1 absorbida (89822a2): árbol de
  alembic del BASE cortado en 0018 → 3 líneas,
  head real = 22 migraciones.

## CHANGELOG G36 (v9.30 → v9.31)
OLA 2.1-DECIMONOVENA — VERTICAL ML_INTELLIGENCE
(Q-PER-01 CERRADO DEL TODO — 0 REPOS IN-MEMORY)
CERRADO en DOS pasos (025a6ba vertical 0058 +
5bb4cc2 bis 0059 — evidencia: OUT del APLICAR-
DECIMONOVENA + OUT del APLICAR-DECIMONOVENA-BIS +
CI run #72 rojo SOLO mypy + run #73 VERDE 5/5):
persistencia 124→128 (ml_intel 4: seed
idempotente tras restart + canon drop-in byte a
byte churn 17.5 · segments 4/7/7/2 · PSI 5/5 ·
explain 26.9 + contrato vacío + proxies
por-tier) · pytest 941→974 · ruff = baseline
(aporte CERO: 17→0 · TC003) · mypy = baseline
733 (aporte CERO: 19→0 — la lección G36 del run
#72: el ratchet se paga por ARCHIVO NUEVO = 0 ·
typing del data-layer: variable tipada EXACTA
Sequence[ORM] por consulta + loops únicos +
sklearn type: ignore[import-untyped] ×4 — los
patrones congelados del legacy no se replican
gratis) · consistency 13/13 · smoke B0 VERDE.
Vertical 19 (repo ORM async READ-ONLY
cross-domain · contrato EXACTO 9/9 AST ·
matemática IMPORTADA del in-memory — jamás
bifurcada · alembic 0021 · swap OPT-IN 19º ·
olar prophet filterwarnings Pandas4Warning
dual-path) → Q-PER-01 CERRADO DEL TODO: 19/19
verticales persistentes · db/repositories/ sin
repos in-memory · alembic head 0021.

## CHANGELOG G35 (v9.29 → v9.30)
OLA 2.3 — VERTICAL APPROVALENGINE (Q-PER-03 + R-1/R-6
DEL RADAR DE OBSERVABILIDAD) CERRADO — GATES DEL RUN #64
VERDE 5/5 @ 774eddb (https://github.com/AnSoMo28/
MCPBoardofDirectors/actions/runs/45093869682 — primera
corrida REAL sobre el vertical: el run #63 murió al nacer
por YAML inválido del ci.yml, errata 0053 una línea —
dos puntos → guion en el step name): persistencia 95/95
(83 + approval_engine 12: 8 ciclo/tamper/expiración/dual/
drop-in/re-register/pendientes/digest + 4 R-1 spans) ·
pytest 929→941 · ruff 1199→1196 ≤ 1282 (BAJA 3) · mypy
723→719 ≤ 723 (BAJA 4) · consistency 13/13 · smoke B0
VERDE. 2 tablas (approvals espejo 1:1 del request +
approval_events ledger append-only hash-chain
tamper-evident — event_hash = sha256(prev_hash + canon)
· GENESIS "0"*64 · verify_chain() re-deriva: una edición
post-hoc rompe EXACTO ahí) + ApprovalStore protocol en
hitl/approval_engine.py con ORM en approval_repo (la
INVERSIÓN: hitl NO importa db.orm) + ctor store=None
OPT-IN (sin CLUB_PERSISTENCE_URL corre 100% in-memory
byte a byte — AST contrato público idéntico, única
adición tolerada store=None) + spans OTel club.db.session
por session_scope (R-1: repo·status·latency_ms·
statements·rows · otel-api ya en lock · 0 deps nuevas ·
tracer no-op sin provider) + alembic 0018 (up/down/up
determinista) + ADR-0007. R-6 ENTREGADO con el vertical
(ledger auditable criptográficamente: reescribir quién
aprobó qué sin delatarlo es imposible). Q-PER-03 pasa a
CERRADO: "approval creada, proceso muere, approval sigue
pendiente" YA NO — el estado vive en la tabla y sobrevive
el restart.
END: masters v9.30 · Q-PER-03 CERRADO (Ola 2.3) · en P1
quedan SOLO las dos olas dedicadas: document_intelligence
(requiere Ola 2.2 Chroma→pgvector primero) ·
ml_intelligence (numpy/sklearn/prophet — olar la
dependencia ANTES: pin prophet compatible o guard
Pandas4Warning en pyproject, lección G34). Radar de
observabilidad: R-1 ENTREGADO · R-6 ENTREGADO · R-2/R-4
esperan volumen/3.4 · R-3/R-5 esperan sus olas.

## CHANGELOG G34 (v9.28 → v9.29)
OLA 2.1-DECIMASEPTIMA CERRADA — GATES:

PASO persistence extiende member_360 (run #61): write →
restart → read OK — ahora auth+family+engagement+event+
compliance+guest+satisfaction+communication+cultural_
social+executive_dashboard+proactive_recommendation+
facility_management+age_group+sports_recreation+finance
+wellness+member_360 (83 tests · 3+6+6+6+6+6+6+7+4+4+4+4
+4+4+5+4+4). Evidencia: vertical 0050 run #61 VERDE 5/5
@ facc83a A LA PRIMERA (tercera vertical seguida sin
saga §8: #57 finance → #59 wellness → #61 member_360 —
https://github.com/AnSoMo28/MCPBoardofDirectors/
actions/runs/45034294188). DECIMASEPTIMA vertical de la
familia de cirugía async — la primera READ-ONLY: 21
métodos sync→async (compliance 8 → finance 17 →
wellness 22 → member_360 21) con 0 cirugía del agente
(ya desacoplado: 0 self.repo._). Contrato AST 11/11
públicos idéntico (nombres+args+defaults+async
verificado por inspect.signature contra AMBOS repos).
2 tablas espejo 1:1 (member360_members 12 del MEMBER_SEED
+ member360_health_factors 5×5 explícitos + _DEFAULT_
FACTORS para el resto — HALLAZGO de perfilado: el repo
NO tiene writes públicos; el ORM siembra members SOLO
con opt-in del ctor (seed_demo_data=True — mecánica
family_repo.seed_demo_data) y factors del SEED GLOBAL
SIEMPRE (el in-memory lee HEALTH_FACTORS_SEED sin
depender de _members: health/churn/risk FUNCIONAN sin
opt-in con m-001 87.9 excellent byte a byte) + alembic
0017 (@0016 · sin índices · member_id UNIQUE). SEMÁNTICAS
LITERALES preservadas: contrato vacío sin opt-in EXACTO
(members VACÍOS: identity/search/journey/ltv/proposals →
None/[]/{"error": "Member not found"}) · search canon
completo (orden health_score_desc m-012 90.85 → m-001
87.9 → m-003 71.9 · empates 60.75 estables por orden de
inserción (order_by(id) — lección run #56) · filtros
query/tier/health_level/churn_risk/journey_stage · sort
tier_desc mapa literal · paginación slice · ltv_desc
placeholder MISMO) · compute-on-read byte a byte en lo
DETERMINISTA (m-007 39.9 CRITICAL · churn HIGH 60.1 ·
risk_factors engagement/social/activity exactos ·
journey PEAK/ONBOARDING por tenure+engagement · LTV
breakdown 30/25/15/10/12/8 · proposals retention 82/
social 75 · random STATELESS: forma-only para lo
aleatorio — canon determinista completo) · drop-in
in-memory vs ORM con dataset del MISMO opt-in.
DEUDA DEL VERTICAL PAGADA DENTRO (lección run #39):
ruff vertical 6→0 (RUF002 ×→x 6 · TC003 · I001) + mypy
10→0 (type-arg dict→dict[str,Any] 10). Cifras: pytest
925→929 · persistencia 79→83 · repos 3→2 · consistency
13/13 · ruff 1221→1199 ≤ 1282 (BAJA 22 — séptima
vertical consecutiva que BAJA) · mypy 733→723 ≤ 733
(BAJA 10 — sexta vertical que BAJA mypy) · smoke B0
VERDE. NOTA de predictibilidad sandbox: los 6 tests de
prophet (ml_intelligence) fallan SOLO con --all-extras
local (pandas 3.1.1 + Pandas4Warning escalado por
filterwarnings=["error"] DENTRO de prophet.fit); el CI
instala --extra dev SIN ml → _HAS_PROPHET=False →
fallback — verificado corriendo el espejo EXACTO del CI
(uv sync --frozen --extra dev): 929/929.
END: masters v9.29 · Q-PER-01 → 2 repos restantes (AMBOS
olas aparte por dependencia: document_intelligence RAG
lazy · ml_intelligence numpy/sklearn — la ola de
persistencia SIN dependencias TERMINÓ) · siguiente: Ola
2.3 Q-PER-03 (ApprovalEngine) o doc_intel/ml_intel como
olas dedicadas.

## CHANGELOG G33 (v9.27 → v9.28)
OLA 2.1-DECIMOSEXTA CERRADA — GATES:

PASO persistence extiende wellness (run #59): write →
restart → read OK — ahora auth+family+engagement+event+
compliance+guest+satisfaction+communication+cultural_
social+executive_dashboard+proactive_recommendation+
facility_management+age_group+sports_recreation+finance
+wellness (79 tests · 3+6+6+6+6+6+6+7+4+4+4+4+4+4+5+4).
Evidencia: vertical 0048 run #59 VERDE 5/5 @ 0c8438a A LA
PRIMERA (segunda saga §8-tris consecutiva sin ROJO:
#57 finance → #59 wellness — https://github.com/
AnSoMo28/MCPBoardofDirectors/actions/runs/44949505867).
DECIMOSEXTA vertical de la familia de cirugía async —
la MÁS GRANDE hasta ahora: 22 métodos sync→async
(compliance 8 → finance 17 → wellness 22) con 0
cirugía del agente (ya desacoplado: 0 self.repo._).
Contrato AST 22/22 idéntico (nombres+args+defaults+
async verificado por ast.parse contra AMBOS repos).
5 tablas espejo 1:1 (wellness_profiles JSONB lists ·
wellness_goals · wellness_activities · wellness_classes
SIN created_at — el modelo no lo tiene, espejo exacto
del observable · wellness_appointments) + alembic
0016 (@0015 · sin índices · sin seed — el in-memory
nace vacío). SEMÁNTICAS LITERALES preservadas: ids
wlp_/goal_/wla_/cls_/appt_{hex8} · enums reconstruidos
explícitos · SCHEDULED/ACTIVE literales del create ·
enrolled_count += 1 en create_appointment con floor
max(0, n-1) en cancel (doble cancel clava en 0) ·
update_* None-ignora + updated_at SIEMPRE · filtros
list_* con order_by(id) EXPLÍCITO en TODOS los reads
(lección MVCC run #56 institucionalizada desde el
diseño) · streak = unique dates (literal del in-
memory, NO consecutivos) · compute-on-read byte a
byte: prediction engagement 4 componentes (24+28.5+
0+10 = 62.5 en el dataset demo — aritmética REAL
afirmada por el suite, verificada ejecutando) ·
anomalías 4 detectores (gap 14d/30d · stagnation <10%
· drop 50% · overtraining 600 min/sem) · Pearson
_pearson/_significance replicados como funciones de
módulo · 3 tiers SIEMPRE · ranking revenue 200_000 ·
insights 90 días. DEUDA DEL VERTICAL PAGADA DENTRO
(lección run #39): ruff vertical 35→0 (UP017×16 ·
C401×4 · RUF001/RUF003 confusables por codepoints —
runtime string idéntico · F401 · B905 · TC001 ·
SIM108 · F841) + mypy 3→0. Cifras: pytest 921→925 ·
persistencia 75→79 · repos 4→3 · consistency 13/13 ·
ruff 1221→1197 ≤ 1282 (BAJA 24 — sexta vertical
consecutiva que BAJA) · mypy 733→723 ≤ 733 (BAJA 10
— quinta vertical que BAJA mypy) · smoke B0 VERDE.
CONTRATO DROP-IN con dataset sembrado por los MISMOS
métodos públicos: correlations + insights canon
idénticos in-memory vs ORM.
END: masters v9.28 · Q-PER-01 → 3 repos restantes ·
siguiente: member_360 (11m sync · compute read-heavy
— perfilar de primera) · document_intelligence (RAG
lazy — ola aparte por dependencia) · ml_intelligence
(numpy/sklearn — ola aparte).

## CHANGELOG G32 (v9.26 → v9.27)
OLA 2.1-DECIMOQUINTA CERRADA — GATES:

PASO persistence extiende finance (runs #56+#57): write →
restart → read OK — ahora auth+family+engagement+event+
compliance+guest+satisfaction+communication+cultural_
social+executive_dashboard+proactive_recommendation+
facility_management+age_group+sports_recreation+finance
(75 tests · 3+6+6+6+6+6+6+7+4+4+4+4+4+4+5). Evidencia:
CI run #56 ROJO 919/920 @ b23080d (UN solo test: orden de
get_budget contra PG real — PG MVCC mueve la fila UPDATE-ada
al final del heap; sqlite conserva el orden físico → bug
invisible en sandbox) → repair 0046 → CI run #57 VERDE @
98cc4de a la primera del repair (5/5 jobs · persistencia
75/75 · contrato in-memory 17/17 drop-in — DECIMOQUINTA
vertical drop-in: 0 cirugía del agente, ya desacoplado tras
la cirugía async del propio vertical). PRIMERA saga §8 en
8 generaciones (G25→G31 habían sido a la primera) — pero el
repair cerró en UNA corrida: causa raíz diagnósticada por el
log del usuario (feedback de proceso institucionalizado:
CI ROJO + log inaccesible → pedir el log de inmediato, no
reproducción indirecta). FIX QUIRÚRGICO: get_budget itera
ExpenseCategory (el ENUM — orden contractual del dict
sembrado en __init__), NUNCA el result-set sin ORDER BY +
test de regresión con heap físico garantizado NO-enum
(reinserta las 9 categorías al revés y exige orden enum —
pica en cualquier backend que devuelva el heap). AUDITORÍA
de orden de TODO el repo finance: list_*/report/trend
order_by(id)/sorted ✓ · AR buckets dict fijo ✓ · SOLO
get_budget filtraba el heap físico. Cifras: pytest
920→921 · persistencia 74→75 · repos 5→4 · consistency
13/13 · ruff 1221 ≤ 1282 · mypy 727 ≤ 733 (0 deuda nueva).
Lección MVCC INSTITUCIONALIZADA: un SELECT sin ORDER BY
NO tiene orden — el contrato de orden se define en el ENUM
o en ORDER BY, nunca en el heap (sqlite lo esconde).
END: masters v9.27 · Q-PER-01 → 4 repos restantes ·
siguiente: wellness (22m sync · 0 awaited — cirugía
async como compliance/finance) · member_360 (11m sync ·
compute read-heavy) · document_intelligence (RAG lazy —
ola aparte por dependencia) · ml_intelligence
(numpy/sklearn — ola aparte).

## CHANGELOG G31 (v9.25 → v9.26)
OLA 2.1-DECIMOCUARTA CERRADA — GATES:

PASO persistence extiende sports_recreation (runs #53+#54):
write → restart → read OK — ahora auth+family+engagement+
event+compliance+guest+satisfaction+communication+cultural_
social+executive_dashboard+proactive_recommendation+facility_
management+age_group+sports_recreation (70 tests ·
3+6+6+6+6+6+6+7+4+4+4+4+4+4). Evidencia: CI run #53 VERDE @
8f0a638 (refactor contrato — 7 públicos observables · vistas
async · output byte a byte · 912 tests) + CI run #54 VERDE @
8e1bb82 a la PRIMERA, sin saga §8 (5/5 jobs · persistencia
70/70 · AST contrato 40/40 idéntico — novena vertical
drop-in tras el refactor 0042: 0 cirugía, 0 tests del agente
ajustados · agente YA desacoplado). Lección run #39
INSTITUCIONALIZADA: ruff/mypy del vertical verificados en
sandbox bajo el lock del CI (uv sync --frozen) ANTES del
push — ruff vertical limpio (79 autofixes de estilo en los
archivos del vertical) · ruff global 1233 ≤ 1282 BAJA 43 ·
mypy global 727 ≤ 733 BAJA 1 (tercera vertical que BAJA
ambos ratchets). Cifras: pytest 912→916 · persistencia
66→70 · repos 6→5 · consistency 13/13. FIX DENTRO DEL
VERTICAL (lección guest §1.1): el agente usaba
SportsRecommendation en su anotación SIN importarlo (ruff
F821 del gate vertical lo cazó); fix +1 import 0 lógica.
PIEZA DE DISEÑO DEL VERTICAL: las 5 vistas del contrato 0042
se completan ASYNC (in-memory async def con cuerpo intacto ·
ORM con session_scope · agente await en 11 sitios —
contrato observable unificado, mecánica 0039/0040).
END: masters v9.26 · Q-PER-01 → 5 repos restantes ·
siguiente: finance (17m sync · 0 awaited — cirugía async
como compliance) · wellness (22m sync · 0 awaited) ·
member_360 (11m sync · compute read-heavy) ·
document_intelligence (RAG lazy — ola aparte por
dependencia) · ml_intelligence (numpy/sklearn — ola
aparte). El patrón refactor→vertical queda aplicado dos
veces (age_group 0039+0040 · sports 0042+0043).

## CHANGELOG G30 (v9.24 → v9.25)
OLA 2.1-DECIMATERCERA CERRADA — GATES:

PASO persistence extiende age_group (runs #50+#51): write →
restart → read OK — ahora auth+family+engagement+event+
compliance+guest+satisfaction+communication+cultural_social+
executive_dashboard+proactive_recommendation+facility_
management+age_group (66 tests · 3+6+6+6+6+6+6+7+4+4+4+4+4).
Evidencia: CI run #50 VERDE @ d84cecd (refactor contrato —
3 públicos observables · output byte a byte · 908 tests) +
CI run #51 VERDE @ 2a63042 a la PRIMERA, sin saga §8 (5/5
jobs · persistencia 66/66 · AST contrato 18/18 idéntico —
octava vertical drop-in total tras el refactor 0039: 0
cirugía, 0 tests del agente ajustados · agente YA
desacoplado). Lección run #39 INSTITUCIONALIZADA: ruff/mypy
del vertical verificados en sandbox bajo el lock del CI (uv
sync --frozen) ANTES del push — ruff vertical 0 (10
corregidos: I001 · RUF002 · 2×SIM910 · 4×RUF001 · RUF021) ·
mypy vertical 0 · ruff global 1264 ≤ 1282 BAJA 1 · mypy
global 703 ≤ 733 BAJA 1 (segunda vertical que BAJA ambos
ratchets). Cifras: pytest 908→912 · persistencia 62→66 ·
repos 7→6 · consistency 13/13. FIX DENTRO DEL VERTICAL
(lección guest §1.1): models/age_group_activity.py usaba
uuid4() en EngagementProposal.proposal_id default_factory
SIN import — el in-memory TAMBIÉN explotaba (nadie
ejercitaba generate_engagement_proposals contra runtime
real); fix +1 import 0 lógica.
END: masters v9.25 · Q-PER-01 → 6 repos restantes ·
siguiente: sports_recreation (27 privados tocados —
refactor de contrato ANTES, §5.3, como age_group) ·
finance (17m sync · 0 awaited — cirugía async como
compliance) · wellness (22m sync · 0 awaited) ·
member_360 (11m sync · compute read-heavy) ·
document_intelligence (RAG lazy — ola aparte por
dependencia) · ml_intelligence (numpy/sklearn — ola
aparte). El patrón refactor→vertical de age_group queda
probado como camino para sports_recreation.

## CHANGELOG G29 (v9.23 → v9.24)
OLA 2.1-DUODECIMA CERRADA — GATES:

PASO persistence extiende facility_management (run
#48): write → restart → read OK — ahora auth+family+
engagement+event+compliance+guest+satisfaction+
communication+cultural_social+executive_dashboard+
proactive_recommendation+facility_management (62
tests · 3+6+6+6+6+6+6+7+4+4+4+4). Evidencia: CI run
#48 VERDE @ 15f9db7 (5/5 jobs · a la PRIMERA, sin
saga §8) · persistencia 62/62 · AST contrato 22/22
idéntico (séptima vertical drop-in total — 0 cirugía,
0 tests del agente ajustados · 31 call sites ya
awaited · 0 privados · 0 dependencias). Lección run
#39 INSTITUCIONALIZADA: ruff/mypy del vertical
verificados en sandbox bajo el lock del CI (uv sync
--frozen) ANTES del push — ruff vertical 0 (4+1
corregidos en raíz: F401 · F841 · C416 · RUF003 +
isort autofixed) · mypy vertical 0 (5 errores → 0 en
raíz: 3 firmas updates dict[str, Any] + 2 dicts del
helper) · ruff global 1265 ≤ 1282 sin re-baseline
(vertical 0 deuda — igual al baseline pristine) · mypy
global 704 ≤ 733 ESTABLE (la BAJA 29 de la undécima
se conserva). Cifras: pytest 904→908 · persistencia
58→62 · repos 8→7 · consistency 13/13.
END: masters v9.24 · Q-PER-01 → 7 repos restantes ·
NINGUNO es drop-in limpio (perfilado G29 contra el
árbol @ 15f9db7): age_group (6 privados tocados por
el agente — refactor de contrato ANTES, §5.3) ·
sports_recreation (27 privados tocados — refactor
primero) · finance (17m sync · 0 awaited — cirugía
async como compliance) · wellness (22m sync · 0
awaited) · member_360 (11m sync · 0 awaited ·
compute read-heavy) · document_intelligence (RAG
lazy — ola aparte por dependencia) · ml_intelligence
(numpy/sklearn — ola aparte). La decimotercera
empieza por el REFACTOR de contrato de age_group
(~6 sitios · 1425L el repo), NO por un vertical
directo — el perfilado manda.

## CHANGELOG G28 (v9.22 → v9.23)
OLA 2.1-UNDECIMA CERRADA — GATES:

PASO persistence extiende proactive_recommendation (run
#46): write → restart → read OK — ahora auth+family+
engagement+event+compliance+guest+satisfaction+
communication+cultural_social+executive_dashboard+
proactive_recommendation (58 tests ·
3+6+6+6+6+6+6+7+4+4+4). Evidencia: CI run #46 VERDE @
e09698b (5/5 jobs · a la PRIMERA, sin saga §8) ·
persistencia 58/58 · AST contrato 23/23 idéntico (sexta
vertical drop-in total — 0 cirugía, 0 tests del agente
ajustados · 17 call sites ya awaited · 0 privados · 0
dependencias). Lección run #39 INSTITUCIONALIZADA:
ruff/mypy del vertical verificados en sandbox bajo el
lock del CI (uv sync --frozen) ANTES del push — ruff
vertical 0 (1 isort autofixed) · mypy vertical 0 (38
errores → 0 en raíz) · ruff global 1256 ≤ 1282 sin
re-baseline · mypy global 704 ≤ 733 BAJA 29 (el repo ORM
tipado reemplaza deuda del in-memory en el mismo
dominio — primera vertical que BAJA el global). Cifras:
pytest 900→904 · persistencia 54→58 · repos 9→8 ·
consistency 13/13.
END: masters v9.23 · Q-PER-01 → 8 repos restantes ·
siguiente vertical: facility_management (repos 8 —
perfilarlo contra el árbol; si arrastra índices/seed,
documentación aparte) o el refactor age_group antes de
su vertical (§5.3).

## CHANGELOG G27 (v9.21 → v9.22)
OLA 2.1-DÉCIMA CERRADA — GATES:

PASO persistence extiende executive_dashboard (run #44):
write → restart → read OK — ahora auth+family+engagement+
event+compliance+guest+satisfaction+communication+
cultural_social+executive_dashboard (54 tests ·
3+6+6+6+6+6+6+7+4+4). Evidencia: CI run #44 VERDE @
e0c6960 (5/5 jobs · a la PRIMERA, sin saga §8) ·
persistencia 54/54 · AST contrato 15/15 idéntico (quinta
vertical drop-in total — 0 cirugía, 0 tests del agente
ajustados · 9 call sites ya awaited · 0 privados).
Lección run #39 INSTITUCIONALIZADA: ruff/mypy del
vertical verificados en sandbox bajo el lock del CI
(uv sync --frozen) ANTES del push — ruff vertical 0 (7
detectados y arreglados) · mypy vertical 0 (20 errores
→ 0 en raíz) · ruff global 1256 ≤ 1282 sin re-baseline.
Cifras: pytest 896→900 · persistencia 50→54 · repos
10→9 · consistency 13/13.
END: masters v9.22 · Q-PER-01 → 9 repos restantes ·
siguiente vertical: document_intelligence (repos 9 —
perfilarlo contra el árbol; si arrastra RAG lazy,
documentación aparte) o el refactor age_group antes de
su vertical (§5.3).

## CHANGELOG G26 (v9.20 → v9.21)
OLA 2.1-NONA CERRADA — GATES:

PASO persistence extiende cultural_social (run #42):
write → restart → read OK — ahora auth+family+engagement+
event+compliance+guest+satisfaction+communication+
cultural_social (50 tests · 3+6+6+6+6+6+6+7+4). Evidencia:
CI run #42 VERDE @ 1d649fe (5/5 jobs · a la PRIMERA, sin
saga §8) · persistencia 50/50 · contrato agente
cultural_social 48/48 (async-FIRST drop-in — 0 cirugía,
0 tests ajustados · 6 analytics F31 compute-on-read byte
a byte). Lección run #39 INSTITUCIONALIZADA: ruff/mypy
del vertical verificados en sandbox bajo el lock del CI
(uv sync --frozen) ANTES del push — ruff vertical 0 ·
mypy vertical 0 · ruff global 1256 ≤ 1282 sin re-baseline.
Cifras: pytest 892→896 · persistencia 46→50 · repos
11→10 · consistency 13/13.
END: masters v9.21 · Q-PER-01 → 10 repos restantes ·
siguiente vertical: candidato del Chief Architect de los
10 restantes (executive_dashboard 15m/5 dicts — el
siguiente limpio; age_group refactor primero).

## CHANGELOG G25 (v9.19 → v9.20)
OLA 2.1-OCTAVA CERRADA — GATES:

PASO persistence extiende communication (runs #39/#40):
write → restart → read OK — ahora auth+family+engagement+
event+compliance+guest+satisfaction+communication (46
tests · 3+6+6+6+6+6+6+7). Evidencia: CI run #40 VERDE @
ed35109 (5/5 jobs) · persistencia 46/46 · contrato agente
communication 38/38 (async-FIRST drop-in — 0 cirugía, 0
tests ajustados). Saga §8 como la sexta: run #39 ROJO
(ruff ratchet +37 deuda de estilo — todos los gates
funcionales VERDE en ese run) → fix-forward 0029 → #40
VERDE. Cifras: pytest 885→892 · persistencia 39→46 ·
repos 12→11 · ruff/mypy sin re-baseline (≤ baseline) ·
consistency 13/13.
END: masters v9.20 · Q-PER-01 → 11 repos restantes ·
siguiente vertical: candidato del Chief Architect de los
11 restantes (age_group refactor primero).

## CHANGELOG G24 (v9.18 → v9.19)
OLA 2.1-SEPTIMA CERRADA — GATES:

PASO persistence extiende satisfaction (run #37): write →
restart → read OK — ahora auth+family+engagement+event+
compliance+guest+satisfaction (39 tests · 3+6+6+6+6+6+6).
Evidencia: CI run #37 VERDE @ fb02cd5 (5/5 jobs) ·
persistencia 39/39 · contrato agente satisfaction 21/21
(async-FIRST drop-in — 0 cirugía, 0 tests ajustados).
Cifras: pytest 879→885 · persistencia 33→39 · repos 13→12 ·
ruff/mypy sin re-baseline (≤ baseline) · consistency 13/13.
END: masters v9.19 · Q-PER-01 → 12 repos restantes ·
siguiente vertical: candidato del Chief Architect de los
12 restantes (age_group refactor primero).

## CHANGELOG G23 (v9.17 → v9.18)
OLA 2.1-QUINQUA + OLA 2.1-SEXTA CERRADAS — GATES:

PASO persistence extiende compliance (run #32) y guest (runs
#33/#34): write → restart → read OK — ahora auth+family+
engagement+event+compliance+guest (33 tests · 3+6+6+6+6+6).
Evidencia quinqua: CI run #32 VERDE @ e9a77dd (5/5 jobs,
verificado vía API) · persistencia 27/27 · contrato agente
compliance 28/28 (in-memory migrado async).
Evidencia sexta: CI run #33 ROJO — regla §8 (link del run +
diagnóstico read-only): ÚNICA falla el perf test PRE-EXISTENTE
de frontend computeVIPScore 'should complete within 1ms'
(1000 iter · presupuesto 5ms midió 5.002872ms — 0.057% —
ruido del runner compartido; el 0022 NO tocó frontend; el
mismo estado dio VERDE en run #32) → fix 0023 @ fdb2054
(presupuesto 5ms→50ms ~10× margen · hermano computeTemperature
INTACTO · baseline vitest SIN tocar — se arregla el flake, no
se sube el piso) → CI run #34 VERDE 5/5 (vitest debt 0 ·
guardian+lint reanudan VERDE).
Cifras: pytest 867→879 · persistencia 21→33 · repos 15→13 ·
ruff/mypy sin re-baseline (≤ baseline en #32/#34) ·
consistency 13/13.
END: masters v9.18 · Q-PER-01 → 13 repos restantes ·
siguiente vertical: satisfaction (candidato limpio).

## CHANGELOG G22 (v9.16 → v9.17)

```
OLA 2.2 CERRADA EN EVENT — GATES:
- PASO persistence extiende event (CI): write → restart →
  read OK contra pgvector REAL — ahora auth+family+engagement+
  event (21 tests · 3+6+6+6). Contrato agente event 50/50 sin
  tocar la lógica del dominio (radio 0 — regla §3.2-1); la
  MIGRACIÓN ASYNC fue la ola aparte que §3.8-bis anticipó.
- Evidencia del cierre (CI run #29 VERDE @ d532355 — 5/5 jobs,
  verificado vía API): 867 passed (861 + 6 event) · smoke B0
  VERDE · ruff 1277 (+17 deuda vertical bajo ratchet 1282) ·
  mypy 733 · consistency 13/13. Sandbox: cifras re-medidas
  bajo lock (867/867 · 21/21 · 50/50 — reproducible).
- RE-BASELINE mypy 735→733 same-PR (doctrina G16): el 0019
  pagó los +9 del vertical + 2 de deuda vieja — el piso baja
  a la cifra real; 733/734 ya no pasan sin ser el valor.
- LECCIÓN run #28 (estructural): el APLICAR corre el ratchet
  mypy LOCAL bajo lock antes del push — CI-rojo por ratchet
  ya no puede llegar a GitHub (mismo parser que el ci.yml).
- END: masters v9.17 · Q-PER-01 → 15 repos restantes.
```

## CHANGELOG G21 (v9.15 → v9.16)

```
OLA 2.1-TRIS CERRADA EN MEMBER_ENGAGEMENT — GATES:
- PASO persistence extiende engagement (CI): write → restart →
  read OK contra pgvector REAL — ahora auth+family+engagement
  (15 tests · 3+6+6). Suite agente 42/42 sin tocar un byte del
  in-memory (radio 0 — regla §3.2-1).
- Evidencia del cierre (CI runs #24 VERDE @ 4b16c4b tris + #25
  VERDE tras ff a p2c3 — verificados desde afuera): 861 passed
  (855 + 6 engagement) · smoke B0 VERDE · ruff 1260 (=) ·
  mypy 733 (=) · consistency 13/13. Sandbox: cifras re-medidas
  bajo lock (861/861 · 15/15 · 42/42 — reproducible).
- ERRATA G21 (cifras estáticas): el nombre del job backend dice
  "pytest 846" y el paso del README decía "persistence pasa a 15
  tests: auth + family + engagement" — el 846 del ci.yml es TEXTO
  ESTÁTICO del job name (no imprime la suite real); la cifra viva
  es 861 y la suite persistence YA corría 15 en #24/#25. Los
  masters registran la cifra real, no la estática (regla §3.2-2).
- END: masters v9.16 · Q-PER-01 → 16 repos restantes (siguiente:
  event es sync — su propia ola; membership ya tiene su ciclo).
```

## CHANGELOG G20 (v9.14 → v9.15)

```
OLA 2.1-BIS CERRADA EN FAMILY — NUEVOS GATES DE BACKEND:
- PASO persistence extiende family (CI): write → restart → read
  OK contra pgvector REAL — ahora auth+family; dataset demo
  UNA fuente (in-memory y ORM siembran el MISMO plan).
- Evidencia del cierre (CI run #20 VERDE @ 97db180): 855 passed
  (849 + 6 family) · smoke B0 VERDE · ruff 1260 (1282→1260 —
  baja, deuda de la ola pagada por el 0012) · mypy 733 (≤735 —
  baja) · consistency 13/13.
- LA SAGA DEL RUN #19 ROJO (regla §8): la ola validó tests pero
  NO los ratchets bajo lock — ruff 1302 > 1282. FIX 0012: deuda
  de lint 0 en módulos nuevos (43 ruff + 10 mypy) en 97db180.
- END: masters v9.15 · Q-PER-01 → 17 repos restantes (2.1-tris:
  event/membership primero).
```

## CHANGELOG G19 (v9.13 → v9.14)

```
OLA 2.1 CERRADA EN AUTH — NUEVOS GATES DE BACKEND (Ola 2.1):
- PASO persistence NUEVO en job backend (CI): write → restart
  (dispose + engine NUEVO) → read OK contra el service container
  pgvector/pgvector:pg16 REAL — el gate del PATH 2.1 corre en cada
  push, no solo en TestClient (lección verify-build-css aplicada a
  persistencia). Suite RE-RUNNABLE (Ola 2.1f: _reset_backend() por
  test — 2 corridas sobre el mismo PG, ambas limpias).
- Evidencia del cierre (CI run #16 VERDE @ e015bd4): 849 passed
  (846 + 3 persistencia) · smoke B0 VERDE · ruff 1282 = baseline ·
  mypy 732 (≤735 — baja) · consistency 13/13.
- Q-PER-02 CERRADO (alembic init + 0001_users · constraints
  deterministas) · Q-PER-04 CERRADO (tabla users + seed CLI
  idempotente) · Q-PER-01 INTACTO (18 repos in-memory de
  db/repositories/ → 2.1-bis: family/event primero).
- Gates sandbox de la ola: py_compile 12 · alembic --sql render ·
  mypy módulos nuevos 0 · ruff 0 deuda nueva · seed ×2 = 4.
- ERRATA G19.1 (0008): este changelog dijo "17 repos" — la
  aritmética era equivocada (18 - users). users NO era uno de
  los 18 (era el seed dict de Q-PER-04 en routes/auth.py):
  los 18 de db/repositories/ siguen intactos.
- END: masters v9.14 · Ola 2.1-bis (18 repos in-memory → ORM)
  es la siguiente.
```

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

## CHANGELOG G16 (v9.11 → v9.12)

```
CIERRE DE LA ÚLTIMA ANOMALÍA DEL RUN #10: mypy reportó 735 contra
baseline 737 — nadie tocó Python en G15/G15.1, y una deuda que baja
sola no es regalo, es pregunta. Medición forense (uv sync --frozen
--extra dev, lock mypy 2.1.0, 4 commits):
  · 9dd4270 → 735 · 62a5f40 → 735 · 03dc0bd → 735 · 741e0a4 → 735
  · diff Python 741e0a4→9dd4270 (src/pyproject/lock) = VACÍO
  · uvx mypy 2.4.1 (latest sin lock) → 828 en 81 files
CONCLUSIÓN: 737 nunca fue reproducible bajo el lock. La atribución
del comentario G12.1 ("735 era deriva de uvx-latest") estaba
INVERTIDA: 735 es la cifra estable del lock; 828 es la deriva
real de uvx-latest. El 737 original salió de un venv de máquina
local (mypy pre-instalado ≠ lock) en la medición G12.1.
IMPACTO: el ratchet era VÁLIDO (prohibir subir) pero con 2 unidades
de ventana muerta — 735/736 pasaban sin ser jamás el valor real.
Re-baseline 737→735 (bajar el piso SIEMPRE es bienvenido):
run #11 en adelante la cifra CI = la cifra del lock, sin colchón.
Estado de deuda post-G16: vitest 0/470 · guardian 15146 · eslint
1583 · ruff 1292 · mypy 735 — 5/5 medidas bajo sus locks exactos,
0 ventanas muertas.
END: masters v9.12.
```

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
  · TokenUsageLedger (Q-LLM-02 contorno en G12; CERRADO en Ola 3.2/
    G37 — presupuesto en tabla llm_usage_daily + llm_calls, ver
    CHANGELOG G37): accounting por día de proceso,
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
backend pytest tests/unit       unit backend            ✅ 861/861
                                                        (py3.12 + 3.14.4;
                                                        808 def + 16 param
                                                        +19 Q-SEC +3 Ola 2.1
                                                        +6 Ola 2.1-bis
                                                        +6 Ola 2.1-tris)
backend persistence suite       write → restart →       ✅ 15/15 en CI (G21:
(write-restart-read)           read OK contra PG       pgvector/pg16 · auth
(Ola 2.1/-bis/-tris G19-G21)   REAL del service        +family+engagement ·
                                                       re-runnable)
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

END OF MASTER_CHECKLIST.md v9.35 · Generación G40 (sincronizada con
MASTER_BASE.md v9.35 y MASTER_CHECKPOINT.md v9.35
