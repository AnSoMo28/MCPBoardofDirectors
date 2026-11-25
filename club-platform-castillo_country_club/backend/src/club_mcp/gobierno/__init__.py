"""Paquete gobierno — Ola 4 (Q-GOV-01..04).

El gobierno del club como DATO VERIFICABLE, no como promesa:

- ``ledger``: append-only + hash-chain sha-256 + épocas Merkle.
  Cada acción privilegiada del backend (ahora y las que vengan en
  4.2-4.4) se registra una sola vez y queda sellada criptográficamente.
- ``verificar_recibo``: CLI standalone stdlib que un TERCERO ejecuta
  fuera del repo, sin DB y sin red, para verificar que un evento
  realmente ocurrió en el ledger del club (recibo + raíz de época).

La ley de diseño es la misma del juez (Ola 3.4, ADR-0009): piso
determinista verificable offline primero; cualquier inteligencia
aditiva (4.3 backtesting de gobernanza) se construye SOBRE este
registro, nunca lo reemplaza.
"""
from __future__ import annotations


__all__ = ["ledger", "verificar_recibo"]
