# ADR-0009 — Golden set + LLM-as-judge con hard gate determinista (Q-LLM-04)

**Fecha:** 2026-11-25 · **Estado:** APROBADO (implementado en Ola 3.4 · vertical 0067)
**Gorras:** Chief Architect / AI Fellow / Principal Engineer · **Base:** 66e73de (G38 cerrado · run #80 VERDE)
**Contexto:** CHECKPOINT §15 Q-LLM-04 ("Evals: golden set + LLM-as-judge — markers pytest slow/integration/hitl existen; suites no") · ADR-0008 §"lista para colgarse de llm_calls"

---

## Decisión 1 — Golden set: el árbol pineado contra el comportamiento pretendido

**QUÉ:** `tests/unit/ai/golden/prompts_v1.json` congela, por cada uno
de los 41 specs del registry, `version · sha256 · variables · chars`
y — cuando el spec tiene variables — el `render_sha256` con kwargs
sintéticos estables. La suite `test_golden_prompts.py` compara punto
por punto en cada corrida.

**POR QUÉ:** el censo de Ola 3.3 compara registry ↔ árbol (drift
interno: que el registro diga la verdad sobre el texto vivo). Pero
nada comparaba el árbol ↔ el comportamiento PRETENDIDO: un template
editado un viernes por la tarde pasa el censo (el registry se edita
junto) y llega a producción sin que nadie haya decidido que el cambio
era aceptable. El golden convierte esa decisión en un archivo: si el
texto cambia sin bump de versión + regeneración consciente, CI ROJO
con diff legible (spec, campo, antes ≠ después).

**CÓMO (con disciplina):**
- Semilla generada POR EJECUCIÓN desde el registry vivo @66e73de
  (no transcripción): `registry_snapshot()` + render con kwargs
  sintéticos (`Ana`, `Los Herrera`, `7`…). 41 specs, 22 con render
  pineado, 11.4 KB.
- Los kwargs sintéticos NO son prosa real: pinean forma y
  contracto (que `message.birthday` renderice `name`+`age` donde
  estaban), no contenido. El contenido lo juzga el juez (Decisión 2).
- Regla de mantenimiento en el archivo mismo (`_comment` + test de
  semillas): cambiar un prompt = bump de versión en el registry +
  regenerar el golden en el MISMO PR. El JSON anota su semilla
  (`seed_commit`, `generated`) — evidencia, no fe.

## Decisión 2 — LLM-as-judge: hard gate determinista primero, LLM aditivo

**QUÉ:** `ai/llm_judge.py` — `judge_response()` juzga una respuesta
candidata en dos etapas. Primero la rúbrica determinista
(`evaluate_rubric`): placeholders sin resolver `{nombre}`, substrings
exigidos/vedados, rango de largo. Si reprueba, NO se consulta al LLM.
Solo si pasa (y hay cliente) el LLM juzga tono/coherencia/utilidad con
los specs `judge.system`/`judge.eval` — y su salida debe cumplir su
propio contrato JSON (`verdict/score/criteria/summary`) o queda
`degraded`.

**POR QUÉ:** un juez que es solo un LLM tiene los tres vicios que
esta plataforma no se puede permitir: no es reproducible (dos
corridas, dos veredictos), cuesta tokens por respuesta obviamente
rota, y puede ser persuadido por prosa bonita que envuelve un
placeholder crudo. El hard gate invierte el orden: lo mecánico lo
decide lo mecánico (gratis, determinista, siempre en CI), y el LLM
gasta sus tokens SOLO en lo que solo un lector juzga. El juez jamás
aprueba lo que la rúbrica reprueba — regla 2 de su propio system
prompt, y código que la hace ineludible (`if not rubric.ok: return`).

**CÓMO (con disciplina):**
- `LLMClient` es un `Protocol` estructural: `claude_service.chat` ya
  lo cumple sin tocar una línea; la suite lo implementa con un stub
  de 15 líneas (sin `anthropic`, sin red, contador de llamadas que
  PRUEBA que el hard gate no consultó).
- Sin cliente (CI sin API key, local sin red): veredicto = rúbrica,
  `degraded=True`. El gate duro corre SIEMPRE; el juicio LLM es
  aditivo. `judge="rubric" | "rubric+llm" | "rubric+llm-error" |
  "rubric+llm-contract"` — cuatro estados, cero ambigüedad.
- La salida lleva `judge_prompt_sha256` + `judge_eval_sha256`: la
  evidencia de Ola 3.3 (qué prompt corrió) embebida en el veredicto
  — lista para colgarse de `llm_calls` cuando la integración lo
  pida.
- Los prompts del juez NACEN versionados (v1.0.0 en el registry,
  39 → 41): la lección de Ola 3.3 aplicada a tiempo. La derivación
  de variables cazó en sandbox el ejemplo JSON del contrato (llaves
  dobladas = literal) — el contrato no puede mentir, otra vez.

## Decisión 3 — Los markers existentes, ahora con suites que los usan

**QUÉ:** `slow`/`integration`/`hitl` están registrados en
`pyproject.toml` desde siempre. El vertical usa el contrato a su
manera: la suite del juez es unit pura (corre en CI sin key); el
camino LLM real (cliente Anthropic + API key) queda como
`integration` — `skipif` sin `ANTHROPIC_API_KEY`, ejecutable bajo
demanda (`uv run pytest -m integration`) sin acoplar el CI a una
cuenta de LLM.

**POR QUÉ:** un CI que depende de una API key externa para pasar
deja de ser evidencia y pasa a ser un sistema frágil conStates
falsos (rojo por quota ≠ rojo por regresión). El hard gate
determinista cubre lo que CI debe garantizar; el juicio LLM real se
corre cuando se necesita, con la misma salida de veredicto.

---

**Consecuencias:** pytest 990 → 999 CI (8 juez + 64 golden + censo
actualizado · parametrizados incluidos en el conteo de corrida);
registry 39 → 41; placeholders 35 → 38. `llm_judge.py` stdlib pura
en su cadena de imports (Protocol local, no importa claude_service):
la suite corre en cualquier sandbox. Deuda explícita: conectar
`judge_response` a `llm_calls.prompt_sha256` (columna a añadir en la
migración de la próxima ola que toque LLM ops) y el golden set de
RESPUESTAS (no de prompts) cuando haya tráfico real que sembrarlo.
