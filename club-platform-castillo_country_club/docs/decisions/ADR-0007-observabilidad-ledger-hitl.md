# ADR-0007 — Observabilidad de la capa de datos (R-1) + ledger tamper-evident del HITL (R-6)

**Fecha:** 2026-11-22 · **Estado:** APROBADO (implementado en Ola 2.3 · vertical 0052)
**Gorras:** Chief Architect / AI Fellow / Principal Engineer · **Base:** d0606e5 (G34 cerrado · run #62 VERDE)
**Contexto:** guía G24 §1.5 (radar R-1 vencido desde G26+2 bumps) · NEXT-STEPS 2.3 (Q-PER-03)

---

## Decisión 1 — spans OTel GenAI en `session_scope` (R-1)

**QUÉ:** cada `session_scope()` emite UN span `club.db.session` con
`db.repo · db.status (commit|rollback) · db.latency_ms · db.statements · db.rows`.
Contadores vía eventos `before/after_cursor_execute` del Engine
(probe verificado sobre async engine: aiosqlite y asyncpg por igual).

**POR QUÉ:** la garantía de Ola 2.3 ("la aprobación sobrevive al restart") se
DEMONSTRA con trazas: el span del ciclo create→approve ES la evidencia. Y
R-2 (proyecciones de lectura) exige métricas de latency por repo para
justificar el corte — esto empieza a acumularlas.

**CÓMO (con disciplina):**
- 0 dependencias nuevas: `opentelemetry-api` ya vive en el lock (1.45.2,
  transitivo de chromadb); tracer no-op si no hay TracerProvider global —
  cero emisión, cero overhead, cero cambio de contrato.
- OPT-IN por env `CLUB_OTEL_EXPORT` (default on; `0` lo apaga).
- `session_scope(engine, repo=...)` — kw opcional: las 17 verticales llaman
  `session_scope(engine)` sin repo y NO cambian (compat verificada por test).
- El exporter OTLP NO se prende: sin collector consumidor es humo (§1.4).
  El SDK ya permite processors custom — el futuro Ola 4.1 decide el destino.

**QUÉ NO HACE:** no instrumenta tools/LLM (Ola 4.1 con /metrics), no cambia
contratos de los 17 repos, no agrega deps.

**Gate (demostrado):** `test_session_otel_r1.py` — span capturado end-to-end
con TracerProvider+SimpleSpanProcessor+exporter propio del test:
attrs `db.repo/db.status/db.statements ≥1/db.latency_ms` presentes;
rollback reportado `db.status=rollback` con la tx tronada; opt-out verificado.

## Decisión 2 — ledger hash-chain del ciclo HITL (R-6)

**QUÉ:** tabla `approval_events` (append-only): cada transición
(created/approved/rejected/expired) appenda UNA fila cuya
`event_hash = sha256(prev_hash + canon(event))` sella la anterior.
`verify_chain()` re-deriva toda la cadena: UNA edición post-hoc rompe
EXACTAMENTE en la fila editada (dominó hacia adelante).

**POR QUÉ (el "nunca antes visto" honesto):** la aprobación de un club no
solo debe sobrevivir al restart (Q-PER-03) — debe ser **auditable
criptográficamente**: un admin que edite la fila del evento "approved"
para reescribir la historia NO puede hacerlo sin que la cadena lo
delate. La cadena es el testigo. No es blockchain de moda: es la
propiedad mínima de tamper-evidence con sha256 encadenado —
los ledgers contables/auditoría llevan décadas con este patrón; la
innovación es aplicarlo al ciclo de aprobación HITL de una plataforma
de agentes, donde "quién aprobó qué y cuándo" es el dato más
sensible del sistema.

**CÓMO:**
- GENESIS = "0"*64; canon determinista (JSON sort_keys · datetimes
  normalizados a UTC-naive: el canon es EXACTO al escribir y releer
  independiente del driver — lección cazada por el suite mismo).
- El ledger es INDEPENDIENTE del estado mutable de `approvals`
  (append-only): el purge de solicitudes resueltas NO borra historia.
- Suite: `test_ledger_tamper_evident` — edita `actor` post-hoc y exige
  la rotura en la fila exacta.

## Alternativas descartadas

- **structlog events solamente:** sin contrato de spans estándar — OTel es
  el estándar de observabilidad GenAI 2026 (radar §1.4); structlog entra
  en Ola 4.1 con el formato real.
- **Tabla de auditoría plana:** detecta quién/cuándo pero NO la edición
  post-hoc — el hash-chain sí.
- **Firma HMAC con clave:** requiere gestión de claves (KMS) — sha256
  encadenado da tamper-evidence sin dependencia operativa nueva; la firma
  por-request es el paso natural si el threat model crece (queda anotado).

## Consecuencias

- `session_scope` gana kw opcional `repo=` (compat 17 verticales · test).
- El motor HITL persiste vía ApprovalStoreProtocol (inversión: hitl NO
  importa db.orm; bootstrap cablea OPT-IN como las 17).
- pytest 929→941 · persistencia 83→95 · mypy 723→719 (BAJA 4) ·
  ruff 1199→1196 (BAJA 3) · smoke B0 VERDE.
- R-1 pasa de "propuesto" a **ENTREGADO**; R-6 nace entregado.

---

*ADR-0007 · Ola 2.3 vertical 0052 · validado por ejecución completa bajo el
lock del venv del CI (AST contrato idéntico d0606e5 · 941/941 · B0 VERDE).*
