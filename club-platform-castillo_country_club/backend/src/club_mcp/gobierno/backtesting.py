"""Backtesting de gobernanza contrafactual — Ola 4.3 (Q-GOV-03).

PISO (lo que un auditor top exige): «¿qué habría pasado si la
constitución hubiera dicho otra cosa?» debe ser COMPUTABLE, no una
reunión. Este módulo re-evalúa el historial REAL de decisiones del
ledger contra una constitución ALTERNATIVA y produce un ledger espejo
con los veredictos contrafactuales — sellado, comparable, exportable.

ELEMENTO ÚNICO (LEY 12): el backtesting de 2026 corre sobre métricas
de negocio simuladas; este corre sobre el REGISTRO INMUTABLE de lo que
el gobierno decidió de verdad. El insumo son los eventos
``veredicto_politica`` ya sellados (con su sha de constitución), y la
salida es otro ledger sellado con hash-chain — un contrafactual que un
tercero verifica offline con recibo Merkle, igual que un hecho real.
La pregunta «¿y si el director hubiera podido solo?» deja de ser opinión.

FIDELIDAD DE VENTANA — ANCLADA AL GASTO SELLADO (ADR-0012 D2): la
trampa del backtesting ingenuo es empezar cada veredicto con la
contabilidad en cero: predice presupuestos intactos que la historia
real ya gastó. Aquí cada evento sellado lleva el gasto ACUMULADO que
el original vio (``tokens_usados``/``llamadas_usadas``/``costo_usado``
del rol en su día UTC); el replay ancla su contabilidad al ÚLTIMO
gasto sellado de cada (rol, día) y juzga el MISMO tráfico. Lo que no
está sellado no se inventa: no simulamos consumos que el ledger no
registró — el contrafactual cambia las REGLAS, no la historia.

REGLAS (no convenciones — las hace cumplir el tipo):
- El ledger REAL nunca se toca: el replay escribe a un ledger ESPEJO
  (nuevo, inyectado); el original solo se LEE.
- Determinismo total: el reloj del espejo se FIJA al ``ts`` del evento
  original que re-evalúa — el sellado contrafactual es comparable
  evento a evento con el real, y dos corridas dan byte a byte igual.
- La constitución alternativa pasa la MISMA validación completa del
  runtime (``cargar_constitucion``): un contrafactual con constitución
  inválida no existe.
- Sin PII: los casos salen de eventos sellados, que por regla del
  ledger no llevan datos personales.
"""
from __future__ import annotations

import json
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from club_mcp.gobierno.constitucion import (
    Constitucion,
    ConstitucionInvalida,
    cargar_constitucion,
)
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import (
    ACCION_REGISTRO,
    ContabilidadEconomia,
    MotorPoliticas,
)


RELOJ_CERO = "1970-01-01T00:00:00Z"


# ── Casos (del ledger real) ───────────────────────────────────────

@dataclass(frozen=True)
class CasoVeredicto:
    """Un veredicto histórico re-evaluable — solo datos sellados.

    Fuente: el evento ``veredicto_politica``. ``gasto_original`` es el
    acumulado que el motor original vio al decidir (viene dentro del
    evento cuando la economía participó); ``costo_previsto`` es el costo
    que el runtime estimó en su momento (lo único de la estimación que
    el sellado preserva — ver ADR-0012 D2).
    """
    seq: int
    ts: str
    actor: str
    rol: str
    accion: str
    recurso: str
    original_permitido: bool
    original_motivo: str
    contexto: dict[str, Any] = field(default_factory=dict)
    costo_previsto: float = 0.0
    gasto_original: dict[str, float] | None = None
    dia_gasto: str = ""

    @classmethod
    def desde_evento(cls, ev: Any) -> CasoVeredicto:
        d = ev.detalles
        eco = d.get("economia") or {}
        gasto: dict[str, float] | None = None
        dia_gasto = ""
        if eco:
            gasto = {
                "tokens": float(eco.get("tokens_usados", 0)),
                "llamadas": float(eco.get("llamadas_usadas", 0)),
                "costo": float(eco.get("costo_usado", 0.0)),
            }
            dia_gasto = str(eco.get("dia", ""))
        return cls(
            seq=ev.seq, ts=ev.ts, actor=ev.actor, rol=ev.rol,
            accion=str(d.get("accion_solicitada", "")),
            recurso=ev.recurso,
            original_permitido=bool(d.get("permitido", False)),
            original_motivo=str(d.get("motivo", "desconocido")),
            costo_previsto=float(eco.get("previsto", 0.0) or 0.0),
            gasto_original=gasto,
            dia_gasto=dia_gasto,
        )


def extraer_casos(ledger: LedgerGobierno) -> list[CasoVeredicto]:
    """Todo veredicto sellado del ledger, en orden seq — el dataset."""
    return [
        CasoVeredicto.desde_evento(e)
        for e in ledger.eventos() if e.accion == ACCION_REGISTRO
    ]


# ── Resultado ─────────────────────────────────────────────────────

@dataclass(frozen=True)
class ResultadoCaso:
    """Veredicto original vs contrafactual para UNA decisión."""
    caso: CasoVeredicto
    contrafactual_permitido: bool
    contrafactual_motivo: str

    @property
    def original_permitido(self) -> bool:
        return self.caso.original_permitido

    @property
    def original_motivo(self) -> str:
        return self.caso.original_motivo

    @property
    def flip(self) -> bool:
        return self.original_permitido != self.contrafactual_permitido


@dataclass(frozen=True)
class InformeBacktesting:
    """Resumen ejecutivo del contrafactual — comparable entre corridas."""
    casos: int
    permitidos_original: int
    permitidos_contrafactual: int
    flips: int
    flips_a_deny: int
    flips_a_allow: int
    motivos_flip: dict[str, int]

    def resumen(self) -> str:
        return (
            f"{self.casos} decisiones re-evaluadas · "
            f"allow {self.permitidos_original}→{self.permitidos_contrafactual} · "
            f"{self.flips} flips ({self.flips_a_allow}→allow · "
            f"{self.flips_a_deny}→deny)"
        )


# ── Reloj espejo (fijable — sin tocar ledger.py) ──────────────────

class _RelojEspejo:
    """Callable ``ts`` mutable: el replay lo fija al ts del evento original."""

    def __init__(self) -> None:
        self._ts = RELOJ_CERO

    def fijar(self, ts: str) -> None:
        self._ts = ts

    def __call__(self) -> str:
        return self._ts


def _dia_de(dia_int: str) -> str:
    """``20261126`` → ``2026-11-26`` (la clave de ContabilidadEconomia)."""
    s = str(dia_int)
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if len(s) == 8 else s


# ── Motor del replay ──────────────────────────────────────────────

class BacktesterGobierno:
    """Re-evalúa el historial real contra una constitución alternativa.

    El motor del contrafactual es un ``MotorPoliticas`` NORMAL sobre un
    ledger espejo — las MISMAS reglas de decisión y economía del
    gobierno vivo, cero código duplicado. La diferencia es quién
    alimenta la contabilidad: el replay, anclándola al gasto sellado.
    """

    def __init__(
        self,
        constitucion_alternativa: Constitucion,
    ) -> None:
        if constitucion_alternativa is None:
            raise ConstitucionInvalida("backtesting sin constitución alternativa")
        self._const = constitucion_alternativa
        self._reloj = _RelojEspejo()
        self._espejo = LedgerGobierno(ts=self._reloj)

    @property
    def espejo(self) -> LedgerGobierno:
        """Ledger espejo del contrafactual — sellado, verificable, offline."""
        return self._espejo

    @property
    def constitucion(self) -> Constitucion:
        return self._const

    @classmethod
    def desde_documento(cls, documento: dict[str, Any]) -> BacktesterGobierno:
        """Constitución alternativa como dict — la MISMA validación del runtime.

        Típico: ``doc = json.loads(RUTA.read_text())``, editar el campo
        que se quiere contrafactuar (presupuesto, política, protocolo),
        bump de ``version`` y pasar acá. Si el resultado es inválido,
        ``ConstitucionInvalida`` — igual que en producción.
        """
        with tempfile.NamedTemporaryFile(
            "w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            f.write(json.dumps(documento, ensure_ascii=False))
            ruta = Path(f.name)
        try:
            const = cargar_constitucion(ruta)
        finally:
            ruta.unlink(missing_ok=True)
        return cls(const)

    def correr(self, casos: list[CasoVeredicto]) -> list[ResultadoCaso]:
        """Replay de todos los casos en orden seq, con fidelidad de ventana.

        Por caso: el reloj del espejo se fija al ``ts`` original, la
        contabilidad se ancla al ÚLTIMO gasto sellado de ese (rol, día)
        y el veredicto se evalúa con el costo previsto que el sellado
        preservó. Cada resultado queda sellado en el espejo.
        """
        # último gasto sellado por (rol, dia) — reconstrucción del
        # acumulado que el original vio, sin inventar nada
        anclado: dict[tuple[str, str], dict[str, float]] = {}
        resultados: list[ResultadoCaso] = []
        for c in casos:
            if c.gasto_original is not None:
                anclado[(c.rol, _dia_de(c.dia_gasto))] = {
                    "tokens": c.gasto_original["tokens"],
                    "llamadas": c.gasto_original["llamadas"],
                    "costo": c.gasto_original["costo"],
                }
            self._reloj.fijar(c.ts)
            cont = ContabilidadEconomia.vacia()
            try:
                dia = c.ts[:10]
            except (ValueError, TypeError):
                dia = RELOJ_CERO[:10]
            g = anclado.get((c.rol, dia))
            if g:
                cont.registrar_consumo(
                    c.rol, dia, int(g["tokens"]), int(g["llamadas"]), g["costo"])
            motor = MotorPoliticas(self._const, self._espejo, cont)
            v = motor.evaluar_y_registrar(
                actor=c.actor, rol=c.rol, accion=c.accion, recurso=c.recurso,
                contexto=dict(c.contexto),
                costo_estimado={"tokens": 0, "llamadas": 0, "costo": c.costo_previsto}
                if c.costo_previsto else None,
            )
            resultados.append(ResultadoCaso(
                caso=c,
                contrafactual_permitido=v.permitido,
                contrafactual_motivo=v.motivo,
            ))
        return resultados


def informe(resultados: list[ResultadoCaso]) -> InformeBacktesting:
    """Agrega flips por categoría — el resumen ejecutivo del contrafactual."""
    n = len(resultados)
    po = sum(1 for r in resultados if r.original_permitido)
    pc = sum(1 for r in resultados if r.contrafactual_permitido)
    flips = [r for r in resultados if r.flip]
    a_deny = sum(1 for r in flips if not r.contrafactual_permitido)
    a_allow = sum(1 for r in flips if r.contrafactual_permitido)
    motivos: dict[str, int] = {}
    for r in flips:
        clave = f"{r.original_motivo}→{r.contrafactual_motivo}"
        motivos[clave] = motivos.get(clave, 0) + 1
    return InformeBacktesting(
        casos=n, permitidos_original=po, permitidos_contrafactual=pc,
        flips=len(flips), flips_a_deny=a_deny, flips_a_allow=a_allow,
        motivos_flip=motivos,
    )
