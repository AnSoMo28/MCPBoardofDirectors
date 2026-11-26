"""Motor de políticas pre-ejecución — Ola 4.2 (Q-GOV-02).

PISO (lo que un auditor top exige): decisión ANTES de ejecutar, default
DENY, primera coincidencia por prioridad, TODO veredicto al ledger con
el hash de la constitución bajo la cual se decidió (cierra DV-002).

ELEMENTO ÚNICO (LEY 12): la ECONOMÍA vive en la MISMA constitución y
en el MISMO punto de decisión — el veredicto no es solo allow/deny por
permisos, incluye el presupuesto del actor (tokens/llamadas/costo por
día UTC determinista). Un allow sin presupuesto es DENY: gobernar una
flota de 19 agentes es gobernar su economía, no solo sus permisos.
Ningún PDP de los mil repos de 2026 pone el presupuesto como primitiva
de primera clase del veredicto — está en billing, llega tarde.

Ley de diseño (la del juez, ADR-0009, ahora gobierno): piso
determinista verificable offline primero; sin LLM en el camino crítico
de decisión; reloj inyectado; todo evento al ledger append-only.

Punto de aplicación (ADR-0011): ``evaluar_y_registrar`` es la ÚNICA
puerta — el runtime (server/agentes) la llama antes de toda acción
privilegiada. Fallar cerrado: sin constitución cargada, DENY.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable

from club_mcp.gobierno.constitucion import (
    DEFAULT_EFECTO,
    Constitucion,
    Politica,
)
from club_mcp.gobierno.ledger import LedgerGobierno

# ── Veredicto ──────────────────────────────────────────────────────

ACCION_REGISTRO = "veredicto_politica"


@dataclass(frozen=True)
class Veredicto:
    """Decisión determinista ANTES de ejecutar — portable y auditable.

    ``permitido`` ES la decisión económica Y de permisos juntas: un
    allow sin presupuesto se materializa como deny con motivo
    ``presupuesto_agotado`` y la política que SÍ autorizó aparece en
    ``politica_permiso`` para la trazabilidad completa.
    """
    permitido: bool
    motivo: str
    politica_id: str | None
    constitucion_sha: str
    constitucion_version: int
    economia: dict[str, int | float] | None = None
    politica_permiso: str | None = None

    def detalles_ledger(self) -> dict[str, Any]:
        """Payload canónico del veredicto para el ledger (sin PII)."""
        d: dict[str, Any] = {
            "permitido": self.permitido,
            "motivo": self.motivo,
            "constitucion_sha": self.constitucion_sha,
            "constitucion_version": self.constitucion_version,
        }
        if self.politica_id is not None:
            d["politica_id"] = self.politica_id
        if self.politica_permiso is not None:
            d["politica_permiso"] = self.politica_permiso
        if self.economia is not None:
            d["economia"] = self.economia
        return d


# ── Matching de patrones (determinista, sin regex) ────────────────

def _calza(patron: str, valor: str) -> bool:
    """Match de prefijo con ``/*`` — el mismo contrato del RBAC del club.

    ``*`` calza todo; ``evento/*`` calza ``evento/123``; sin wildcard,
    igualdad exacta. Sin regex: auditable línea por línea.
    """
    if patron == "*":
        return True
    if patron.endswith("/*"):
        return valor.startswith(patron[:-2])
    return patron == valor


def _aplica(p: Politica, rol: str, accion: str, recurso: str) -> bool:
    if rol not in p.roles:
        return False
    accion_ok = "*" in p.acciones or accion in p.acciones
    if not accion_ok:
        return False
    if any(_calza(x, recurso) for x in p.excluye):
        return False
    return any(_calza(r, recurso) for r in p.recursos)


def _condicion_ok(p: Politica, actor: str, ctx: dict[str, Any]) -> bool:
    """Condición declarativa: campo del recurso == referencia al actor.

    Dos formas, ambas deterministas y auditables:
    - ``{"campo": "recurso.propietario", "referencia": "actor.id"}``:
      self-service — el propietario del recurso (resuelto por el
      runtime en ``ctx``) debe ser el actor que pide.
    - ``{"campo": "...", "igual_a": <literal>}``: comparación con
      literal del documento.

    El motor NUNCA consulta fuentes: el contexto llega resuelto.
    """
    c = p.condicion
    if not c:
        return True
    campo = c.get("campo")
    if not campo:
        return False
    if "referencia" in c:
        ref = c["referencia"]
        if ref != "actor.id":
            return False  # referencia desconocida: fail-closed
        valor_actor = actor
    elif "igual_a" in c:
        valor_actor = c["igual_a"]
    else:
        return False
    if campo == "recurso.propietario":
        return ctx.get("propietario_recurso") == valor_actor
    return ctx.get(campo) == valor_actor


# ── Reloj económico determinista ───────────────────────────────────

def _dia_utc(ts: str) -> str:
    """Día natural UTC del timestamp ISO — la ventana del presupuesto.

    Determinista: en tests el reloj viene inyectado del ledger (mismo
    ``ts`` que sella los eventos — UNA sola fuente de tiempo).
    """
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(UTC).date().isoformat()
    except ValueError:
        return ts[:10]


# ── Contabilidad de economía (injectable — el runtime persiste) ────

@dataclass
class ContabilidadEconomia:
    """Contador consumido por (rol, día): la memoria del presupuesto.

    El motor NO persiste: recibe un ``gasto`` ya cargado (del estado
    durable del runtime) y devuelve el consumo NUEVO para que el
    caller lo persista SOLO si la acción se ejecuta. Si la acción se
    aborta después, no se cobró — la contabilidad sigue honesta.
    """
    _consumo: dict[tuple[str, str], dict[str, float]]

    @classmethod
    def vacia(cls) -> ContabilidadEconomia:
        return cls(_consumo={})

    def gasto(self, rol: str, dia: str) -> dict[str, float]:
        return dict(self._consumo.get((rol, dia), {"tokens": 0, "llamadas": 0, "costo": 0.0}))

    def registrar_consumo(
        self, rol: str, dia: str, tokens: int, llamadas: int, costo: float
    ) -> None:
        """Lo llama el runtime TRAS ejecutar la acción permitida."""
        cur = self._consumo.setdefault((rol, dia), {"tokens": 0, "llamadas": 0, "costo": 0.0})
        cur["tokens"] += tokens
        cur["llamadas"] += llamadas
        cur["costo"] += costo

    def persistir(self) -> dict[str, Any]:
        """Snapshot durable: {\"rol|dia\": {tokens, llamadas, costo}}."""
        return {f"{r}|{d}": dict(v) for (r, d), v in sorted(self._consumo.items())}

    @classmethod
    def desde_snapshot(cls, snap: dict[str, Any]) -> ContabilidadEconomia:
        c = cls.vacia()
        for k, v in snap.items():
            rol, _, dia = k.partition("|")
            c._consumo[(rol, dia)] = dict(v)
        return c


# ── Motor ──────────────────────────────────────────────────────────

class MotorPoliticas:
    """PDP determinista: constitución + ledger + contabilidad económica.

    Ciclo de vida: ``evaluar_y_registrar`` decide ANTES de ejecutar,
    escribe el veredicto al ledger (DV-002 cerrado) y devuelve el
    veredicto + el consumo previsto. El caller ejecuta solo si
    ``permitido`` y entonces ``confirmar_consumo``.
    """

    def __init__(
        self,
        constitucion: Constitucion | None,
        ledger: LedgerGobierno,
        contabilidad: ContabilidadEconomia | None = None,
    ) -> None:
        self._const = constitucion
        self._ledger = ledger
        self._cont = contabilidad or ContabilidadEconomia.vacia()

    @property
    def constitucion(self) -> Constitucion | None:
        return self._const

    def evaluar_y_registrar(
        self,
        *,
        actor: str,
        rol: str,
        accion: str,
        recurso: str,
        contexto: dict[str, Any] | None = None,
        costo_estimado: dict[str, int | float] | None = None,
    ) -> Veredicto:
        """LA puerta del gobierno: decide y sella, ANTES de ejecutar.

        ``costo_estimado`` = {tokens, llamadas, costo} que la acción
        consumiría (el runtime lo estima de su presupuesto LLM —
        Ola 3.2 ya lo mide). Si la economía de la constitución dice que
        no alcanza, el allow se materializa como DENY por presupuesto.
        """
        ctx = dict(contexto or {})
        ts = self._ledger._ts()  # noqa: SLF001 — UNA fuente de tiempo: la del ledger

        if self._const is None:
            v = Veredicto(
                permitido=False,
                motivo="sin_constitucion_cargada",
                politica_id=None,
                constitucion_sha="0" * 64,
                constitucion_version=0,
            )
            self._sellar(actor, rol, accion, recurso, v)
            return v

        c = self._const
        # Primera coincidencia por prioridad ASCENDENTE (menor número =
        # más específica gana primero — la convención del club).
        aplicada = next(
            (p for p in sorted(c.politicas, key=lambda x: x.prioridad)
             if _aplica(p, rol, accion, recurso) and _condicion_ok(p, actor, ctx)),
            None,
        )

        if aplicada is None or aplicada.efecto == "deny":
            v = Veredicto(
                permitido=False,
                motivo="default_deny" if aplicada is None else f"deny_por_{aplicada.id}",
                politica_id=aplicada.id if aplicada else None,
                constitucion_sha=c.sha256,
                constitucion_version=c.version,
            )
            self._sellar(actor, rol, accion, recurso, v)
            return v

        # ── permiso OK → la economía decide ──
        eco = c.economia
        lim = eco.presupuesto_rol(rol)
        est = {
            "tokens": int(costo_estimado.get("tokens", 0)) if costo_estimado else 0,
            "llamadas": int(costo_estimado.get("llamadas", 0)) if costo_estimado else 0,
            "costo": float(costo_estimado.get("costo", 0.0)) if costo_estimado else 0.0,
        }
        dia = _dia_utc(ts)
        ya = self._cont.gasto(rol, dia)

        economia_veredicto: dict[str, int | float] = {
            "tokens_usados": ya["tokens"], "llamadas_usadas": ya["llamadas"],
            "costo_usado": ya["costo"], "dia": int(dia.replace("-", "")),
        }
        if est["tokens"] or est["llamadas"] or est["costo"]:
            excede = (
                (lim.get("tokens_dia", 0) and ya["tokens"] + est["tokens"] > lim["tokens_dia"])
                or (lim.get("llamadas_dia", 0) and ya["llamadas"] + est["llamadas"] > lim["llamadas_dia"])
                or (lim.get("costo_dia", 0) and round(ya["costo"] + est["costo"], 6) > lim["costo_dia"])
            )
            if excede and eco.exceso == "deny":
                v = Veredicto(
                    permitido=False,
                    motivo="presupuesto_agotado",
                    politica_id=None,
                    constitucion_sha=c.sha256,
                    constitucion_version=c.version,
                    economia={**economia_veredicto, **{f"limite_{k}": lim[k] for k in lim}},
                    politica_permiso=aplicada.id,
                )
                self._sellar(actor, rol, accion, recurso, v)
                return v
            economia_veredicto["previsto"] = est["costo"]

        v = Veredicto(
            permitido=True,
            motivo=f"allow_por_{aplicada.id}",
            politica_id=aplicada.id,
            constitucion_sha=c.sha256,
            constitucion_version=c.version,
            economia=economia_veredicto if economia_veredicto else None,
        )
        self._sellar(actor, rol, accion, recurso, v)
        return v

    def confirmar_consumo(
        self, rol: str, tokens: int, llamadas: int, costo: float
    ) -> None:
        """TRAS ejecutar una acción permitida: cobra el gasto real.

        Día derivado del MISMO reloj del ledger — una sola línea de
        tiempo para permisos, presupuesto y sellado.
        """
        dia = _dia_utc(self._ledger._ts())  # noqa: SLF001
        self._cont.registrar_consumo(rol, dia, tokens, llamadas, costo)

    @property
    def contabilidad(self) -> ContabilidadEconomia:
        return self._cont

    def _sellar(
        self, actor: str, rol: str, accion: str, recurso: str, v: Veredicto
    ) -> None:
        self._ledger.registrar(
            actor=actor,
            rol=rol,
            accion=ACCION_REGISTRO,
            recurso=recurso,
            detalles={
                "accion_solicitada": accion,
                **v.detalles_ledger(),
            },
        )
