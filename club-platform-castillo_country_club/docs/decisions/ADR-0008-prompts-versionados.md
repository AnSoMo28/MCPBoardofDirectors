# ADR-0008 — Prompts versionados: registry con contrato de variables (Q-LLM-03)

**Fecha:** 2026-11-24 · **Estado:** APROBADO (implementado en Ola 3.3 · vertical 0064)
**Gorras:** Chief Architect / AI Fellow / Principal Engineer · **Base:** 9cdc841 (G37 cerrado · run #77 VERDE)
**Contexto:** guía G36 §5.4 (tablero Ola 3 · ítem 3.3) · H-6 (Q-LLM-03 prompts 814L)

---

## Decisión 1 — `ai/prompt_registry.py`: 39 `PromptSpec` versionados

**QUÉ:** cada prompt del árbol vive en un registro con `name` canónico
(`message.birthday`, `advisor.ask`, `agent.family_profile`, `rag`…),
`version` semántico (v1.0.0 = el texto vivo de 9cdc841, byte a byte),
`variables` **derivadas automáticamente** del template con
`string.Formatter`, y `sha256` del template como fingerprint.

**POR QUÉ:** 814 líneas de constantes sin versionado y sin contrato de
variables significan que un `.format()` con kwarg faltante es un
`KeyError` que estalla DESPUÉS de gastar la llamada al LLM — o en
runtime, frente al socio. Y sin hash no hay forma de demostrar que dos
procesos corrieron el MISMO prompt: la auditoría de Ola 3.2 (`llm_calls`)
cuenta tokens, pero no sabía QUÉ prompt los gastó.

**CÓMO (con disciplina):**
- 0 dependencias nuevas: `hashlib` + `string.Formatter` + `dataclasses`,
  todo stdlib.
- El censo es finito y verificable: 11 `agent.*` + 12 `message.*` +
  16 nominados = 39. La suite lo afirma por conteo Y por igualdad de
  texto contra `ai/prompts.py` (la v1.0.0 no es re-transcripción).
- `registry_snapshot()` es la evidencia ejecutable: nombre, versión,
  hash, variables y chars de cada prompt — lista para colgarse de
  `llm_calls` (columna `prompt_sha256`) cuando Ola 3.4 la necesite.

## Decisión 2 — `render()` valida kwargs exactos ANTES de la llamada

**QUÉ:** `render_prompt("advisor.narrative", insight_data=..., ...)` exige
el contrato exacto: kwarg faltante o sobrante es `ValueError` legible
(con el diff), en la puerta, antes de gastar el request.

**POR QUÉ:** los typos (`insight_id` vs `insights_id`) hoy son silencio
o `KeyError` tardío. La diferencia práctica: el error de puerta se ve
en el stack trace del caller con las variables válidas listadas — no
en la respuesta degradada del socio.

**CÓMO:** para los mismos kwargs, `render() == template.format(**kwargs)`
byte a byte — el swap de los 3 consumidores (`claude_service` ·
`advisor_intelligence` · `family_profile`) no cambia ni un byte de lo
que viaja al LLM. Es la misma regla del drop-in canon de las 19
verticales: contrato observable intacto, solo cambia la puerta.

## Decisión 3 — dedupe del RAG + retiro del quinto módulo huérfano

**QUÉ:** `RAG_SYSTEM_PROMPT` vivía DUPLICADO byte a byte
(`ai/prompts.py:798` — huérfano, nadie lo importaba — y
`rag/rag_service.py:77` — el vivo). La fuente canónica única pasa a ser
la entrada `rag` del registry; `rag_service` importa de ahí.
`ai/prompts_member_360.py` (92L, 1 prompt, 0 importadores) se RETIRA
del registro: no está muerto por accidente — cuando member_360 pida
LLM, su spec nace versionado desde el día uno (regla §3.2.8: lo nuevo
nace sin deuda).

**POR QUÉ:** dos copias idénticas por disciplina, no por contrato, es
deuda de sincronización esperando a morder: la primera edición de una
deja a la otra vieja en silencio. El patrón ya mordió una vez en este
repo (G36.1: el árbol de alembic citado en BASE cortado en 0018).

## Consecuencias

- `ai/prompts.py` queda como FUENTE de los textos (single source de
  texto) y el registry como único punto de RENDER. Editar un texto sin
  tocar versión = smoke rojo del hash en CI si el golden set de 3.4 lo
  ancla; hasta entonces, la suite del vertical es el guardián.
- Subir la versión de un prompt es un cambio LOCAL (el spec), no un
  flag day: los 39 son independientes.
- Semilla pagada para Ola 3.4 (evals): el golden set necesita saber
  qué prompt exacto corrió — `sha256` + `version` es esa respuesta.
- Deuda nueva: 0 (archivo nuevo nace limpio · ruff 0 · mypy 0).
