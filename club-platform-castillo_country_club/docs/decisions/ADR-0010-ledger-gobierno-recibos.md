# ADR-0010 · Ledger de gobierno con recibos verificables offline

- **Fecha:** 2026-11-25 (Ola 4.1 · Q-GOV-01)
- **Estado:** Aceptado
- **Decisión de:** Chief Architect · AI Fellow · Principal Engineer (guía G40 §1)

## Contexto

Ola 4 (gobernanza) exige que toda acción privilegiada del backend quede
(i) registrada de forma inmutable, (ii) verificable y (iii) demostrable
ante terceros. El repo YA tiene un ledger hash-chain — el de approvals
(Ola 2.3, R-6/ADR-0007) — pero está confinado al ciclo de vida HITL:
no registra acciones privilegiadas fuera de aprobaciones, no emite
evidencia portable, y demostrar su integridad requiere leer TODAS las
filas. Para un club con socios, auditores externos y seguros, la
evidencia debe poder viajar: 32 bytes de raíz + un camino logarítmico.

## Decisiones

### D1 — Ledger general en `gobierno/` con doble sellado

`gobierno/ledger.py`: append-only con cadena lineal sha-256 (génesis
`"0"*64`, mismo diseño que ADR-0007 — consistencia deliberada, no
duplicación de concepto: este es el registro GENERAL de gobierno, aquel
el registro especializado HITL que 4.3/4.4 podrán plegar como fuente)
**más épocas Merkle** (RFC 6962: árbol binario, hoja impar duplicada):
cada 8 eventos la raíz de época se sella DENTRO de la cadena como
evento `epoch_seal` versionado (`merkle-epoch-v1`). Inmutabilidad por
construcción: frozen dataclasses, sin métodos de mutación, copia
defensiva en lectura, reloj inyectado, JSON canónico sort_keys.

### D2 — Recibos de inclusión verificables OFFLINE (la vanguardia)

`ReciboInclusion`: JSON portable (época · seq · event_hash · camino
Merkle O(log n) · raíz). `gobierno/verificar_recibo.py` es una CLI
standalone stdlib auto-contenida — se copia a la máquina del
auditor/regulador/seguro junto con el recibo, y verifica sin repo, sin
DB y sin red: exit 0 = el evento estuvo en la época sellada; exit 1 =
falsificado. El club demuestra su conducta sin abrir el backend:
**compliance como dato verificable, no como PDF**. El test de
equivalencia ledger↔CLI es el gate anti-deriva de la doble
implementación (misma matemática escrita dos veces a propósito: la del
paquete y la del tercero).

### D3 — Nace SIN cableado al runtime (deuda declarada, no implícita)

4.1 entrega el contrato + la evidencia + la suite, NO el cableado: es
la misma secuencia que hizo Ola 3.3 (registry antes de consumidores).
4.2 (motor de políticas, Q-GOV-02) conecta el ledger a las acciones
reales en el punto de aplicación y escribe en él TODO veredicto
(allow/deny/quota) — la suite de contrato de 4.1 es exactamente lo que
blinda esa futura integración. Riesgo de ventana sin consumidor
aceptado explícitamente y registrado en la guía (sección deuda).

## Alternativas descartadas

- **Extender ApprovalEventORM:** ata el registro general de gobierno
  al ciclo HITL y a la DB; el recibo offline exige que el sellado viva
  en el dominio puro, no en el ORM.
- **Solo cadena lineal (sin Merkle):** verificar UN evento exige el
  ledger completo — evidencia no portable, no cabe en un email.
- **Firma de claves asimétricas (Ed25519):** agrega gestión de claves
  y dependencias cripto a cambio de una propiedad (no-repudio del
  emisor) que las raíces publicadas por canal del club ya cubren en la
  amenaza actual (empleado con acceso a DB). Re-evaluar si el modelo
  de amenaza crece a comprometer el canal de publicación.

## Consecuencias

- La verificación de UN evento es O(log n) y offline; la del ledger
  completo sigue siendo O(n) determinista (`verificar_cadena`).
- Cambiar `CAMPOS_EVENTO`, el canon o `EPOCH_SIZE` rompe TODA cadena
  previa: el hash del vector fijo (test hardcodeado) es el guardián.
  Toda evolución del formato = versión nueva del sello de época, nunca
  edición silenciosa.
- La PII sigue prohibida en `detalles` (referencias por ID) — regla de
  casa §1.4, la hace cumplir el sombrero SEGURIDAD en revisión.
