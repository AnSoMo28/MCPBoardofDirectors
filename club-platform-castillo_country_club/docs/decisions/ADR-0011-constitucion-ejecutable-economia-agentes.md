# ADR-0011 — Constitución ejecutable y economía de agentes (Ola 4.2 · Q-GOV-02)

**Estado:** Aceptado · **Fecha:** 2026-11-26 · **Base:** ADR-0010 (ledger de gobierno)

## Contexto

Ola 4.1 (ADR-0010, D3) entregó el ledger de gobierno **sin cableado al runtime** — deuda declarada (DV-002). Q-GOV-02 pide: motor de políticas declarativas pre-ejecución con default DENY, todo veredicto al ledger, constitución ejecutable versionada y **economía de agentes** como primitiva de primera clase.

## Decisiones

### D1 — La constitución es un EJECUTABLE JSON canónico, no YAML ni prosa

`gobierno/constitucion.json` con `formato: constitucion-ejecutable-v1`. Razones frente a las alternativas:

- **JSON canónico stdlib** (elegido): cero dependencias nuevas (pyyaml existe en el lock solo como transitiva de chromadb/fastmcp — depender de transitivas es deuda silenciosa), hash sha-256 directo sobre `json.dumps(sort_keys=True)` — el mismo canon que sella el ledger. El documento y el sellado comparten UNA serialización.
- **YAML** (descartado): legible, pero su parseo tiene aliases/anchors y el canon de hash exigiría normalizar a JSON igual — una traducción de más entre el documento y su sello.
- **Policies-as-code en Python** (descartado): editar reglas exigiría tocar código (y CI de código, no de documento); el hash del archivo sería un hash de fuente, no de política.

La disciplina es la del prompt_registry (Ola 3.3): **editar sin bump = CI rojo** — el pin `CONSTITUCION_SHA256` se verifica en la suite (y el hash viaja en CADA veredicto del ledger: "bajo qué reglas se decidió" pasa de cita a dato verificable). Las "constituciones de IA" de 2026 son PDFs de principios; esta es un ejecutable cuyo hash queda soldado al historial de decisiones — ese es el elemento único (LEY 12).

### D2 — La economía vive en la MISMA constitución y en el MISMO veredicto

`seccion economía`: presupuestos por rol (tokens/llamadas/costo por día UTC) y globales de flota. El motor materializa `allow sin presupuesto` como **DENY con motivo `presupuesto_agotado`** (y `politica_permiso` preservada para trazabilidad). Puntos clave:

- **El veredicto es una sola pieza**: permisos Y economía se deciden juntos, antes de ejecutar. Ningún PDP estándar pone el presupuesto en el camino de decisión — vive en billing y llega tarde, cuando el gasto ya ocurrió.
- **Contabilidad inyectada, no consultada**: el motor recibe el gasto ya cargado (`ContabilidadEconomia`) y el runtime persiste el consumo SOLO si la acción se ejecuta (`confirmar_consumo`) — una acción abortada no cobra.
- **Ventana por día UTC natural**, derivada del reloj del ledger (UNA sola fuente de tiempo para sellado y presupuesto — determinismo verificable).
- **Coherencia validada al cargar**: presupuesto por-rol ≤ global (un rol no puede presupuestar más que la flota). `exceso: deny` por defecto.

### D3 — Punto de aplicación: UNA puerta, fail-closed

`MotorPoliticas.evaluar_y_registrar()` es la única entrada del gobierno: decide ANTES de ejecutar, sella el veredicto al ledger (DV-002 cerrado) y devuelve el resultado + consumo previsto. Sin constitución cargada → DENY `sin_constitucion_cargada`. El motor nunca consulta fuentes: el contexto (propietario del recurso, costo estimado) llega resuelto por el caller — determinismo puro, testeable offline.

Alcance de 4.2: el motor + la constitución + la suite de contrato viven en `gobierno/`; el cableado a los 19 agentes del runtime MCP se materializa en el server (composición) en el mismo parche vía la fábrica `crear_gobierno()` — la superficie MCP 19/207/207 NO cambia (la gobernanza es capa backend, no tools).

## Consecuencias

- (+) DV-002 cerrado: TODO veredicto pre-ejecución queda en el ledger con el sha de la constitución.
- (+) Backtesting (4.3) habilitado: veredictos + constitución versionada + replay determinista = "¿qué habría pasado con otra constitución?" es computable.
- (+) La economía deja de ser métrica reactiva (llm_calls, Ola 3.2) y pasa a límite preventivo en el punto de decisión.
- (−) El runtime DEBE resolver contexto (propietario, costo estimado) antes de llamar — contrato más estricto para el caller.
- (−) Cambiar reglas exige bump de versión + pin nuevo: fricción deliberada (gobernar no debe ser barato ni silencioso).
