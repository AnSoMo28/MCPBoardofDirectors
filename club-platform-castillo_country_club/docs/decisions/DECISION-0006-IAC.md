# DECISION-0006 — "Intelligence as Code": calificación y fusión al PATH
**Fecha:** 2026-11-11 · **Origen:** propuesta externa del socio (Andrés) recibida post-G9
**Formato:** Architecture Decision Record — evaluada con gorra de Chief Architect / AI Fellow / Principal Engineer
**Base de evaluación:** árbol real @ 03dc0bd · masters G9 v9.0 · PATH de 5 olas (NEXT-STEPS-2027.md)

---

## 0 · Resumen ejecutivo (dictamen de una línea)

> **ADOPTAR EL NÚCLEO, ARCHIVAR LA REORGANIZACIÓN.** La propuesta describe
> correctamente el destino 2027-2030 (gobernar inteligencia, no sólo software),
> pero comete el error clásico de roadmap: **salta de la Fase 1 a la Fase 4 sin
> pagar las Fases 2-3** — que son exactamente las que este PATH ya tiene en
> construcción (olas 1-4). La adoptamos como **norte estratégico**, la
> re-secuenciamos como **olas 5-7 del PATH existente**, y extraemos HOY los
> tres elementos que son inmediatamente construibles y de valor real:
> **(a)** `ai.manifest.ts` v0.1 declarativo, **(b)** governance de modelos
> (MG-01/02/03/04) dentro del manifest de YA existen, **(c)** evaluaciones
> (golden set + LLM-as-judge) que ya era Ola 3.4. El resto queda en la cola
> §15 con prioridad y criterio de arranque explícitos.

**Score global de la propuesta: 7.5/10** — visión excelente (9.5),
secuenciación ingenua (4), aplicabilidad inmediata media (6.5, extraíble a 9
con re-secuenciamiento).

---

## 1 · Qué propone (síntesis fiel, 30 segundos)

1. **Roadmap 5 fases**: AI-Aware (hoy) → AI-Native (dirs `agents/skills/tools/
   memory/knowledge/evaluations/guardrails/policies/workflows/reasoning/
   observability`) → Multi-Agent Enterprise (features con agents/knowledge/
   evaluations propios) → Self-Evolving (meta-agents de review) → Autonomous
   Organization (policy engines gobernando humanos+agentes).
2. **AI Guardian v1.0** con 6 categorías: AG (agentes), MG (modelos), KG
   (conocimiento), MEM (memoria), MCP (herramientas), RE (razonamiento) —
   ~20 checks estilo "todo agente registrado / purpose+owner+riskLevel /
   sin huérfanos / model pinning / fallback obligatorio / TTL memoria /
   PII prohibido / confianza+SLA por tool / reasoning auditable".
3. **RAI en 7 pilares**: Safety / Privacy / Fairness / Transparency /
   Accountability / Observation / Governance (policy engine tipo OPA "para IA").
4. **Red Team suite** (RT-01..04: prompt injection, RAG poisoning, tool abuse,
   agent hijacking) + **Evaluación** en 4 familias (funcional/safety/operational/
   business).
5. **4 artefactos fundacionales**: `ai.manifest.ts` · `ai-guardian.ts` ·
   `rai.manifest.ts` · `evaluation-engine.ts` al nivel de los existentes.

## 2 · Qué es EXCELENTE (y por qué lo adoptamos)

### 2.1 El diagnóstico del salto es correcto (9.5/10)
"Gobernar inteligencia, no sólo software" es textualmente el argumento que
este PATH hace en su sección 0 (dictamen honesto): la plataforma tiene gates
de código (guardian 26 checks), pero **cero gates de comportamiento** (sin
evals de retrieval, sin red team, sin cost accounting, sin confidence
score). La propuesta nombra el gap real.

### 2.2 Las categorías del AI Guardian son las correctas (9/10)
AG/MG/KG/MEM/MCP/RE es exactamente la taxonomía que usa la industria en
2026 (agent governance, model governance, knowledge governance son las tres
que los frameworks serios —LangGraph Platform, OpenAI Evals, Garak— cubren).
Los checks son concretos y verificables, no aspiracionales. En particular:
- **MG-02 (model pinning, prohibido `latest`)** — hoy el sistema pinnea en
  settings pero NADA lo verifica. Check trivialmente construible.
- **MEM-02 (PII prohibido en memoria permanente)** — cierra el hueco entre
  "tenemos ACL" y "tenemos privacidad".
- **RE-01/02/03 (razonamiento auditable + confidence + grounding)** — es la
  versión formal del #78/Q-OBS: registrar prompt/context/tools/cost/decision.

### 2.3 Red Team como suite de código versionada (9/10)
`red-team/` con 10 vectores ES la práctica 2026 correcta (Garak, PyRIT). Y
encaja quirúrgicamente en el sistema actual: RT-03 (tool abuse) se prueba
contra el RBAC 207/207 que YA existe; RT-02 (RAG poisoning) contra el ACL
por rol que YA existe. **Nota irónica que valida la prioridad de la Ola 1:**
RT-01 (prompt injection "reveal secrets") hoy probaría VÁLIDO porque
Q-SEC-01 tiene el secreto JWT hardcodeado — el red team más básico del
mundo encuentra el P0 que la Ola 1 cierra. El red team CONFIRMA el orden
del PATH.

### 2.4 Evaluación en 4 familias (8.5/10)
Functional/safety/operational/business es más completa que lo que el PATH
tenía (sólo functional+operational). La familia **business** (retención,
calidad de forecast) es la que un board de country club entiende — añade
métrica a las 4 capas.

## 3 · Dónde la propuesta falla (y por qué la re-secuenciamos)

### 3.1 La reorganización de directorios de Fase 2 es premature (3/10)
Mover hoy a `agents/skills/tools/memory/knowledge/evaluations/guardrails/
policies/workflows/reasoning/observability`:
- **Rompe 207 tools registrados, 3 masters de navegación, 23 features de
  frontend y 818 tests** por cosmética. El costo es real; el beneficio
  (legibilidad 2028) no se materializa hasta que exista contenido real en
  cada capa.
- La arquitectura actual YA tiene las capas semánticamente (club_mcp/agents,
  rag/ = knowledge, approvals = HITL/policies, evaluation no existe — ése sí
  es el gap). **Los nombres importan menos que los INVARIANTES**: un guardian
  que prohíba imports fuera de capa logra el mismo resultado sin mover un
  archivo (y es la medicina que este repo ya aplicó con X-13..X-28).
- **Decisión: ARCHIVADA.** Cuando la Ola 3 (evals) exista, re-evaluar si la
  masa de contenido justifica la migración. Criterio objetivo: ≥3 de las 12
  dirs con contenido real y un consumidor vivo.

### 3.2 Fase 4-5 (meta-agents, autonomous org) sin staging de riesgo (4/10)
"Meta Agents de Code/Prompt/Evaluation Review" es deseable PERO: en un
sistema que hoy no tiene CI (Ola 0.1 SIN CORRER), ni secrets (Ola 1), ni
persistencia (Ola 2), ni evals (Ola 3), un meta-agente de review es un
reviewer sin evidencia que revisar. **Cada fase de la propuesta presupone
la infraestructura de la fase anterior — que es exactamente lo que el PATH
provee.** No es un plan rival: es el cliente de nuestro plan.

### 3.3 Falta el costo de transición (el gap típico de vision docs)
La propuesta no dice: qué pasa con los 180 checks, los 3 masters, la serie
de gates G8-G9, ni cómo se versiona la migración. En este repo eso se paga
en generaciones de master (G10-G14). Lo integramos como olas, no como
big-bang.

## 4 · LA FUSIÓN — el PATH queda así (7 olas)

| Ola | Contenido | Origen | Gate de salida |
|---|---|---|---|
| **0 Blindaje** | CI GitHub Actions + verify-master-consistency + pre-commit hooks + evidencia a docs/ | PATH original (esta sesión) | PR bloqueado si gate falla; consistency check VERDE en CI |
| **1 Seguridad P0** | Q-SEC-01..04 (secrets env, rol real del JWT en RAG) | PATH original | red-team slice RT-01 mínimo pasa (injection no revela secret) |
| **2 Persistencia** | Alembic + repos reales + pgvector + docker compose | PATH original | restart no pierde datos |
| **3 LLM Ops + RAG** | retry/fallback/cost + **evals golden set (3.4)** + prompts versionados | PATH original; familia business de la propuesta se agrega a 3.4 | pytest -m evals VERDE; cost dashboard |
| **4 Observabilidad** | structlog + /metrics + healthcheck real + rate limit | PATH original | healthcheck rojo si DB cae |
| **5 AI Governance (NUEVO — de la propuesta)** | `ai.manifest.ts` v0.1 + AI Guardian checks slice: **MG-01/02 (registry+pinning), AG-01/02 (agentes registrados, purpose/riskLevel), MEM-02 (PII), RE-02 (confidence score en respuestas)** + `rai.manifest.ts` skeleton con las 7 capas declaradas | DECISION-IAC §2.2 | ai-guardian exit 0 sobre manifest declarado; CI lo corre |
| **6 Red Team + Evals a escala (NUEVO — de la propuesta)** | `red-team/` con RT-01 (injection), RT-02 (RAG poisoning vs ACL), RT-03 (tool abuse vs RBAC) + evals business (retención/forecast) | DECISION-IAC §2.3/2.4 | suite red-team en CI (weekly); ≥1 eval business con baseline |
| **7 Autonomous (post-2030, hipotética)** | Meta-agents, policy engine | propuesta Fases 4-5 | **sólo si 5 y 6 cerraron 2 generaciones** |

**Regla de integridad del PATH (sin cambios):** cada ola cierra con un gate
que mira el ARTEFACTO/COMPORTAMIENTO, no las fuentes.

## 5 · Lo que YA estamos construyendo HOY de esta propuesta

En la sesión G10 (esta), la Ola 0 incluye el **primer slice del AI Guardian**
que la propuesta pide — bajo otro nombre:

`scripts/verify-master-consistency.py` v1.0.0 ejecutará, en CI:
- **MC-01..MC-08** (versiones sincronizadas masters↔manifest↔tools: AG-01
  "todo agente registrado" para la capa documental)
- **IG-01..IG-03** (BACKEND_REGISTRY §16 = AST del árbol: "no huérfanos,
  no stale" = la lección #75 hecha check permanente)

Es literalmente la misma categoría de invariantes que AG-01..AG-03, aplicada
al artefacto que hoy gobierna el sistema. El AI Guardian formal (X-29+) llega
en la Ola 5 consumiendo `ai.manifest.ts`; su prototipo nace hoy en Python.

## 6 · Riesgos de adoptar (y mitigación)

| Riesgo | Mitigación |
|---|---|
| Scope creep: olas 5-6 doblan el PATH | Las olas 5-6 quedan DESPUÉS de 4; no se reordenan por atractivo |
| `ai.manifest.ts` duplica SSOT con architecture.manifest | Diseño: ai.manifest CONSUME architecture.manifest (import), no compite |
| Red team en CI = costos/flakiness | weekly + fail-fast + vectors deterministas primero (RT-03 RBAC), LLM-judged después |
| Expectativa de reorganización de dirs | §3.1 archivada con criterio objetivo de re-apertura |

## 7 · Decisión final (para el socio)

1. **Sí** a tu tesis central: el siguiente salto es gobernar inteligencia.
2. **Sí** a los 4 artefactos — **como olas 5-6 del PATH existente**, no como
   reorganización big-bang.
3. **No** a mover directorios hoy (archivado, criterio §3.1).
4. **Ya empezamos:** la Ola 0 que corre esta sesión contiene el prototipo
   del AI Guardian (verify-master-consistency: MC-01..08 + IG-01..03).
5. Tu punto RT-01 vs Q-SEC-01 es la mejor validación posible del orden del
   PATH: el red team más simple del mundo hoy gana por KO. Cerrémoslo en
   la Ola 1 y hagamos que perder sea trabajo.

---

*END — ADR DECISION-0006 · G10 · evaluada contra árbol @ 03dc0bd; autor de
la propuesta: socio (Andrés); decisión: fusión re-secuenciada (núcleo
adoptado, reorganización archivada, slice inmediato en Ola 0).*
