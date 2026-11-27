# ADR-0012 — Four-eyes en la cadena y backtesting contrafactual (Ola 4.3 · Q-GOV-03)

**Estado:** Aceptado · **Fecha:** 2026-11-27 · **Base:** ADR-0011 (constitución ejecutable + economía)

## Contexto

Ola 4.2 cerró DV-002: todo veredicto pre-ejecución queda sellado al ledger con el sha de la constitución. El charter (guía G40 §8, S40e) pide para 4.3 dos cosas: **four-eyes** (las acciones que mutan el propio gobierno no las decide una sola persona) y **backtesting de gobernanza contrafactual** («¿qué habría pasado con otra constitución?» computable). ADR-0011 ya lo anticipaba: veredictos + constitución versionada + replay determinista habilitan el contrafactual.

## Decisiones

### D1 — El four-eyes es un PROTOCOLO de la constitución, como capa sobre el motor (no dentro)

La política que autoriza una acción sensible puede declarar `"protocolo": "cuatro_ojos"` en `constitucion.json` (campo nuevo, validado al cargar contra `PROTOCOLOS_VALIDOS` — protocolo desconocido = constitución que no carga). El motor **no se toca**: su veredicto allow sigue idéntico y la suite de 4.2 (49 tests) queda como contrato vivo. La capa `cuatro_ojos.py` decide la **ejecutabilidad**: una solicitud pendiente no es ejecutable hasta que DOS aprobadores humanos — distintos entre sí y del solicitante, con rol aprobador (director/admin) — la habiliten.

Por qué capa y no flag del motor: la doble aprobación no es una decisión de política (¿esto está permitido?) sino un requisito de ejercicio (¿QUIÉN lo firma?). Mezclarlos acoplaría el PDP determinista con un flujo asíncrono humano y rompería el congelamiento del contrato de 4.2. El four-eyes es un protocolo de la constitución, ejecutado por su capa, sellado al mismo ledger.

Alternativas descartadas: (a) implementarlo en `hitl/approval_engine.py` — ese motor es del runtime MCP (async, Pydantic, store opcional) y su deuda Q-HITL-01 (dual approval modelado pero no aplicado) es del censo G9, no del charter Ola 4; la gobernanza constitucional no puede depender de una deuda ajena. (b) segunda firma vía 2FA/medio externo — no deja evidencia verificable offline.

### D2 — Backtesting con FIDELIDAD DE VENTANA, anclada al gasto sellado

`backtesting.py` re-evalúa los eventos `veredicto_politica` del ledger real contra una constitución alternativa y produce un **ledger espejo** sellado (reloj fijado al `ts` de cada evento original — comparable evento a evento). La trampa del backtesting ingenuo es arrancar cada veredicto con la contabilidad en cero: predice presupuestos intactos que la historia real ya gastó. Aquí el replay **ancla** su contabilidad al último gasto acumulado sellado del evento (`tokens_usados`/`llamadas_usadas`/`costo_usado` de cada (rol, día)): juzga el MISMO tráfico que el original juzgó, cambiando solo las REGLAS. Lo que no está sellado no se inventa — el contrafactual no simula consumos que el ledger no registró.

El informe (`informe()`) agrega flips por categoría de motivo: el resumen ejecutivo del contrafactual («allow 12→9 · 3 flips →deny, todos presupuesto_agotado»), legible sin leer dos ledgers. Y como el espejo es un `LedgerGobierno` normal, un tercero lo verifica con recibo Merkle offline — un contrafactual con la misma cadena de custodia que un hecho.

### D3 — P-005 bajo cuatro-ojos: la autoridad máxima no se ejerce en solitario

La constitución bumpea a **v2**: P-005 (solo admin muta el gobierno) declara `protocolo: cuatro_ojos`. Es la política correcta para estrenar el mecanismo: el riesgo sistémico de mayor magnitud del club es exactamente «admin solo cambia las reglas del juego». El golden del pin (sha `45354125…`) se bumbea JUNTO al documento — la disciplina del registry demostrada en vivo: cambiar la constitución sin bump es imposible sin romper CI.

## Consecuencias

- (+) Q-GOV-03 cerrado: doble aprobación verificable offline + contrafactual computable.
- (+) El HITL del runtime (Q-HITL-01) gana su referencia de diseño: cuando ese ítem del censo se pague, la capa cuatro_ojos es el patrón a integrar.
- (+) El contrafactual es la herramienta de debate de reformas: antes de bumpear la constitución v3, se corre el backtesting de la propuesta contra el historial real.
- (−) La capa cuatro_ojos es síncrona e in-memory (igual que el motor): la persistencia de solicitudes llega con el puerto de evidencia (4.4) si el runtime lo consume.
- (−) La fidelidad de ventana depende de que los eventos sellen su gasto acumulado (true desde 4.2: todo veredicto con economía participando lo lleva).

## Próximo paso (charter)

4.4 Q-GOV-04: puerto de evidencia + cierre de Ola 4 (bundle verificable: constitución + ledgers + contrafactuales como artefacto único) + bump G42.
