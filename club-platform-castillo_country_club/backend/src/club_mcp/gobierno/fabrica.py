"""Fábrica del gobierno — Ola 4.2 (Q-GOV-02, ADR-0011 D3).

Composición raíz: UNA función arma el gobierno completo (constitución
validada + ledger + motor) para el runtime. El server / los agentes
llaman ``crear_gobierno()`` al arranque y usan el motor devuelto en
toda acción privilegiada — este módulo es el punto donde la deuda
DV-002 (ADR-0010 D3) se cierra de verdad.

Fail-closed por diseño: si la constitución no carga (archivo dañado,
formato viejo, validación reprobada), ``crear_gobierno`` devuelve un
motor SIN constitución — que deniega TODO con motivo
``sin_constitucion_cargada`` y lo sella al ledger. El arranque nunca
muere por el gobierno, pero tampoco opera sin él: denegar es seguro,
operar sin constitución no lo es.
"""
from __future__ import annotations

from typing import Callable

from club_mcp.gobierno.constitucion import (
    RUTA_CONSTITUCION,
    ConstitucionInvalida,
    cargar_constitucion,
)
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import (
    ContabilidadEconomia,
    MotorPoliticas,
)


def crear_gobierno(
    ts: Callable[[], str] | None = None,
    contabilidad: ContabilidadEconomia | None = None,
    ruta_constitucion=None,
) -> tuple[MotorPoliticas, LedgerGobierno]:
    """Compone el gobierno: (motor, ledger) listos para el runtime.

    ``ts`` inyectable (tests deterministas); por defecto el reloj UTC
    del ledger. La constitución se carga desde el paquete (el pin del
    CI garantiza que el documento vivo es el esperado).
    """
    from datetime import UTC, datetime

    led = LedgerGobierno(ts=ts or (lambda: datetime.now(UTC).isoformat().replace("+00:00", "Z")))
    try:
        ruta = ruta_constitucion or RUTA_CONSTITUCION
        const = cargar_constitucion(ruta)
    except ConstitucionInvalida:
        const = None  # fail-closed: motor que deniega todo
    return MotorPoliticas(const, led, contabilidad), led
