"""Paquete gobierno — Ola 4 (Q-GOV-01..04).

El gobierno del club como DATO VERIFICABLE, no como promesa:

- ``ledger``: append-only + hash-chain sha-256 + épocas Merkle.
  Cada acción privilegiada del backend se registra una sola vez y
  queda sellada criptográficamente.
- ``verificar_recibo``: CLI standalone stdlib que un TERCERO ejecuta
  fuera del repo, sin DB y sin red, para verificar que un evento
  realmente ocurrió en el ledger del club (recibo + raíz de época).
- ``constitucion``: el documento de gobierno COMO EJECUTABLE — JSON
  canónico versionado, validado estructuralmente completo al cargar,
  sellado con sha-256 sobre el mismo canon del ledger. Editar sin
  bump = CI rojo (la disciplina del prompt_registry, ahora gobierno).
- ``politicas``: motor pre-ejecución default-DENY con la ECONOMÍA de
  agentes como primitiva de primera clase — allow sin presupuesto es
  DENY; TODO veredicto se sella al ledger con el sha de la
  constitución bajo la cual se decidió (cierra DV-002).
- ``fabrica``: ``crear_gobierno()`` — la composición raíz que el
  runtime usa al arranque (fail-closed: sin constitución, DENY todo).
- ``cuatro_ojos``: protocolo de doble aprobación humana para las
  políticas que lo declaran (Ola 4.3) — el veredicto del motor sigue
  siendo allow, pero la acción no es ejecutable hasta DOS aprobadores
  distintos; cada transición sellada al ledger.
- ``backtesting``: contrafactual computable (Ola 4.3) — re-evalúa el
  historial real de veredictos contra una constitución alternativa con
  fidelidad de ventana (gasto anclado al sellado) y produce un ledger
  espejo verificable offline.
- ``puerto_evidencia``: el gobierno como ARTEFACTO (Ola 4.4) — bundle
  con manifiesto de hashes y raíz Merkle única que amarra constitución
  + ledger + contrafactuales; verificación completa offline, fail-closed
  en cada arista, snapshot sellado al ledger como hecho del gobierno.
- ``verificar_bundle``: CLI standalone stdlib (Ola 4.4) — el TERCERO
  verifica el bundle completo sin repo, sin DB y sin red: hashes
  recalculados, raíz Merkle re-derivada, cadena del ledger re-derivada
  evento a evento, épocas re-computadas, constitución estructural.
  Anclaje opcional ``--raiz`` contra el acta publicada fuera de banda.

La ley de diseño es la misma del juez (Ola 3.4, ADR-0009): piso
determinista verificable offline primero; cualquier inteligencia
aditiva se construye SOBRE este registro, nunca lo reemplaza.
"""
from __future__ import annotations


__all__ = [
    "backtesting",
    "constitucion",
    "cuatro_ojos",
    "fabrica",
    "ledger",
    "politicas",
    "puerto_evidencia",
    "verificar_bundle",
    "verificar_recibo",
]
