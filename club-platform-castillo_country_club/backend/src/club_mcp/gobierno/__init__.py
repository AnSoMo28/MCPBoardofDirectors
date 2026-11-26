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

La ley de diseño es la misma del juez (Ola 3.4, ADR-0009): piso
determinista verificable offline primero; cualquier inteligencia
aditiva (4.3 backtesting de gobernanza) se construye SOBRE este
registro, nunca lo reemplaza.
"""
from __future__ import annotations


__all__ = [
    "ledger",
    "verificar_recibo",
    "constitucion",
    "politicas",
    "fabrica",
]
