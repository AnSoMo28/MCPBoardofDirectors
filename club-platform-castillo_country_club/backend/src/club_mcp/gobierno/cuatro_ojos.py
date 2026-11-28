"""Protocolo cuatro-ojos para acciones sensibles — Ola 4.3 (Q-GOV-03).

PISO (lo que un auditor top exige): las acciones que mutan el propio
gobierno no las decide UNA persona. La política que las autoriza puede
declarar ``"protocolo": "cuatro_ojos"`` en la constitución: el veredicto
del motor sigue siendo allow, pero la acción NO es ejecutable hasta que
DOS aprobadores humanos — distintos entre sí y del solicitante, con rol
aprobador — la habiliten. Cada transición del protocolo se sella al
ledger: un tercero verifica con recibo Merkle que la acción X se ejecutó
bajo dos pares de ojos distintos (offline, sin DB, sin red).

ELEMENTO ÚNICO (LEY 12): los four-eyes de 2026 viven en PDFs de
política de aprobación; los de este club viven EN LA CADENA. La doble
aprobación no es un checkbox en un ticket: es un par de eventos sellados
con hash encadenado y recibo de inclusión verificable — compliance como
DATO, no como formulario.

REGLAS (no convenciones — las hace cumplir el tipo):
- El motor NO se toca: el veredicto allow es el mismo; el protocolo es
  una CAPA que decide ejecutabilidad. Así la suite de 4.2 sigue siendo
  el contrato vivo del motor mientras 4.3 extiende el gobierno.
- Fail-closed en cada arista: self-approval prohibido (el solicitante
  nunca aprueba), el SEGUNDO ojo debe ser una persona DISTINTA del
  primero, y solo roles aprobadores (director/admin — nunca el socio
  que pide). Toda violación: ``AprobacionError`` + intento sellado.
- Expiración por reloj del ledger (UNA sola fuente de tiempo): una
  solicitud pendiente que excede la ventana muere sellada — no vive
  para siempre esperando el segundo ojo.
- Sin PII en ``detalles``: identificadores, nunca datos personales.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from club_mcp.gobierno.constitucion import Constitucion  # noqa: TC001 — runtime: _protocolo_de consulta el modelo
from club_mcp.gobierno.ledger import LedgerGobierno  # noqa: TC001 — runtime: compone el gobierno
from club_mcp.gobierno.politicas import MotorPoliticas, Veredicto  # noqa: TC001 — runtime: compone el gobierno


# ── Constantes del protocolo ──────────────────────────────────────

PROTOCOLO_CUATRO_OJOS = "cuatro_ojos"
ROLES_APROBADORES: tuple[str, ...] = ("director", "admin")
VENTANA_HORAS = 24
"""Vida útil de una solicitud pendiente — reloj del ledger, no del sistema."""

# acciones ledger del protocolo (se suman a veredicto_politica/epoch_seal)
ACCION_SOLICITUD = "cuatro_ojos_solicitud"
ACCION_APROBACION = "cuatro_ojos_aprobacion"
ACCION_RECHAZO = "cuatro_ojos_rechazo"
ACCION_EXPIRACION = "cuatro_ojos_expiracion"
ACCION_INTENTO_INVALIDO = "cuatro_ojos_intento_invalido"


class AprobacionError(Exception):
    """Transición prohibida del protocolo — fail-closed, intento sellado."""


# ── Estados ───────────────────────────────────────────────────────

ESTADO_DENEGADA = "denegada_por_motor"
ESTADO_DIRECTO = "ejecutable_directo"
ESTADO_PENDIENTE = "pendiente"
ESTADO_PRIMERA = "primera_aprobada"
ESTADO_APROBADA = "aprobada"
ESTADO_RECHAZADA = "rechazada"
ESTADO_EXPIRADA = "expirada"


@dataclass(frozen=True)
class SolicitudCuatroOjos:
    """Estado portable de una solicitud — lo que el runtime consulta.

    ``id`` es el seq del evento de solicitud en el ledger: determinista
    y trazable al sellado exacto que la creó.
    """
    id: str
    actor: str
    rol: str
    accion: str
    recurso: str
    estado: str
    veredicto_motor: Veredicto
    aprobadores: tuple[tuple[str, str], ...] = ()  # (aprobador, rol) en orden
    politica: str | None = None
    creada_ts: str = ""

    @property
    def ejecutable(self) -> bool:
        """Único camino a True: estado ``aprobada`` (dos ojos sellados)."""
        return self.estado == ESTADO_APROBADA


def _hace_mas_de(ts: str, horas: int, ahora: str) -> bool:
    """¿``ts`` es más viejo que ``horas`` respecto de ``ahora`` (ISO)?"""
    try:
        t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        a = datetime.fromisoformat(ahora.replace("Z", "+00:00"))
    except ValueError:
        return False  # timestamp ilegible: no expirar por adivinanza
    return a - t > timedelta(hours=horas)


# ── Protocolo ─────────────────────────────────────────────────────

class ProtocoloCuatroOjos:
    """Capa de doble aprobación humana sobre el motor de políticas.

    Ciclo de vida: ``solicitar`` evalúa con el motor (veredicto sellado
    como siempre) y, si la política ganadora declara el protocolo, abre
    la solicitud PENDIENTE (sellada). ``aprobar`` avanza la máquina
    (primera → segunda → aprobada); ``rechazar``/``expirar`` la cierran.
    El runtime ejecuta solo si ``solicitud.ejecutable`` y entonces
    ``confirmar_consumo`` del motor cobra el gasto real.
    """

    def __init__(
        self,
        motor: MotorPoliticas,
        ledger: LedgerGobierno,
        *,
        roles_aprobadores: tuple[str, ...] = ROLES_APROBADORES,
        ventana_horas: int = VENTANA_HORAS,
    ) -> None:
        self._motor = motor
        self._ledger = ledger
        self._roles_aprobadores = tuple(roles_aprobadores)
        self._ventana = ventana_horas
        self._solicitudes: dict[str, SolicitudCuatroOjos] = {}

    # ── apertura ──────────────────────────────────────────────────

    def solicitar(
        self,
        *,
        actor: str,
        rol: str,
        accion: str,
        recurso: str,
        contexto: dict[str, Any] | None = None,
        costo_estimado: dict[str, int | float] | None = None,
    ) -> SolicitudCuatroOjos:
        """Evalúa con el motor y abre (o no) la solicitud de doble ojo.

        Tres salidas, todas deterministas:
        - motor DENY → ``denegada_por_motor`` (no hay nada que aprobar);
        - allow sin protocolo → ``ejecutable_directo`` (4.2 semantics);
        - allow CON protocolo → ``pendiente`` + solicitud sellada.
        """
        v = self._motor.evaluar_y_registrar(
            actor=actor, rol=rol, accion=accion, recurso=recurso,
            contexto=contexto, costo_estimado=costo_estimado,
        )
        if not v.permitido:
            return SolicitudCuatroOjos(
                id="", actor=actor, rol=rol, accion=accion, recurso=recurso,
                estado=ESTADO_DENEGADA, veredicto_motor=v,
            )
        proto = self._protocolo_de(v)
        if proto is None:
            return SolicitudCuatroOjos(
                id="", actor=actor, rol=rol, accion=accion, recurso=recurso,
                estado=ESTADO_DIRECTO, veredicto_motor=v,
            )
        ev = self._ledger.registrar(
            actor=actor, rol=rol, accion=ACCION_SOLICITUD, recurso=recurso,
            detalles={
                "accion_solicitada": accion,
                "politica": v.politica_id or "",
                "protocolo": proto,
                "estado": ESTADO_PENDIENTE,
            },
        )
        s = SolicitudCuatroOjos(
            id=f"4oj-{ev.seq}", actor=actor, rol=rol, accion=accion,
            recurso=recurso, estado=ESTADO_PENDIENTE, veredicto_motor=v,
            politica=v.politica_id, creada_ts=ev.ts,
        )
        self._solicitudes[s.id] = s
        return s

    def _protocolo_de(self, v: Veredicto) -> str | None:
        """Protocolo declarado por la política que ganó (None = directo)."""
        c: Constitucion | None = self._motor.constitucion
        if c is None or v.politica_id is None:
            return None
        p = c.politica_por_id(v.politica_id)
        if p is None or p.protocolo != PROTOCOLO_CUATRO_OJOS:
            return None
        return PROTOCOLO_CUATRO_OJOS

    # ── transiciones ──────────────────────────────────────────────

    def solicitud(self, sid: str) -> SolicitudCuatroOjos:
        try:
            return self._solicitudes[sid]
        except KeyError:
            raise LookupError(f"solicitud {sid!r} inexistente") from None

    def aprobar(self, sid: str, *, aprobador: str, rol_aprobador: str) -> SolicitudCuatroOjos:
        """Un ojo válido avanza la máquina; el segundo la habilita.

        Fail-closed con intento sellado (``AprobacionError``):
        - la solicitud debe estar ``pendiente`` o ``primera_aprobada``;
        - ``aprobador`` ≠ solicitante (self-approval prohibido);
        - ``rol_aprobador`` ∈ roles aprobadores (director/admin);
        - ``aprobador`` ≠ aprobador previo (dos ojos = DOS personas).
        """
        s = self.solicitud(sid)
        if s.estado not in (ESTADO_PENDIENTE, ESTADO_PRIMERA):
            self._sellar_intento_invalido(
                s, aprobador, rol_aprobador,
                motivo=f"estado_no_aprobable_{s.estado}",
            )
            raise AprobacionError(f"solicitud {sid} en estado {s.estado}")
        if aprobador == s.actor:
            self._sellar_intento_invalido(
                s, aprobador, rol_aprobador, motivo="self_approval_prohibido")
            raise AprobacionError(
                f"el solicitante ({s.actor}) no puede ser aprobador")
        if rol_aprobador not in self._roles_aprobadores:
            self._sellar_intento_invalido(
                s, aprobador, rol_aprobador,
                motivo=f"rol_no_aprobador_{rol_aprobador}")
            raise AprobacionError(
                f"rol {rol_aprobador!r} no es aprobador "
                f"({'+'.join(self._roles_aprobadores)})")
        if any(apr == aprobador for apr, _ in s.aprobadores):
            self._sellar_intento_invalido(
                s, aprobador, rol_aprobador, motivo="segundo_ojo_igual_al_primero")
            raise AprobacionError(
                "el segundo ojo debe ser una persona distinta del primero")

        orden = len(s.aprobadores) + 1
        nuevo_estado = ESTADO_PRIMERA if orden == 1 else ESTADO_APROBADA
        self._ledger.registrar(
            actor=aprobador, rol=rol_aprobador,
            accion=ACCION_APROBACION, recurso=s.recurso,
            detalles={
                "solicitud": sid, "orden": orden,
                "solicitante": s.actor, "estado": nuevo_estado,
            },
        )
        s2 = SolicitudCuatroOjos(
            id=s.id, actor=s.actor, rol=s.rol, accion=s.accion,
            recurso=s.recurso, estado=nuevo_estado, veredicto_motor=s.veredicto_motor,
            aprobadores=(*s.aprobadores, (aprobador, rol_aprobador)),
            politica=s.politica, creada_ts=s.creada_ts,
        )
        self._solicitudes[sid] = s2
        return s2

    def rechazar(self, sid: str, *, rechazador: str, rol_rechazador: str) -> SolicitudCuatroOjos:
        """Cualquier aprobador puede matar la solicitud en cualquier estado vivo."""
        s = self.solicitud(sid)
        if s.estado not in (ESTADO_PENDIENTE, ESTADO_PRIMERA):
            self._sellar_intento_invalido(
                s, rechazador, rol_rechazador,
                motivo=f"estado_no_rechazable_{s.estado}")
            raise AprobacionError(f"solicitud {sid} en estado {s.estado}")
        self._ledger.registrar(
            actor=rechazador, rol=rol_rechazador,
            accion=ACCION_RECHAZO, recurso=s.recurso,
            detalles={"solicitud": sid, "solicitante": s.actor,
                      "estado": ESTADO_RECHAZADA},
        )
        s2 = SolicitudCuatroOjos(
            id=s.id, actor=s.actor, rol=s.rol, accion=s.accion,
            recurso=s.recurso, estado=ESTADO_RECHAZADA,
            veredicto_motor=s.veredicto_motor, aprobadores=s.aprobadores,
            politica=s.politica, creada_ts=s.creada_ts,
        )
        self._solicitudes[sid] = s2
        return s2

    def expirar(self, sid: str) -> SolicitudCuatroOjos | None:
        """Cierra por ventana vencida — reloj del ledger (UNA fuente).

        Devuelve la solicitud expirada, o ``None`` si sigue vigente.
        Solo aplica a estados vivos: lo ya resuelto no se re-abre.
        """
        s = self.solicitud(sid)
        if s.estado not in (ESTADO_PENDIENTE, ESTADO_PRIMERA):
            return None
        ahora = self._ledger._ts()
        if not _hace_mas_de(s.creada_ts, self._ventana, ahora):
            return None
        self._ledger.registrar(
            actor="gobierno", rol="sistema", accion=ACCION_EXPIRACION,
            recurso=s.recurso,
            detalles={"solicitud": sid, "estado": ESTADO_EXPIRADA,
                      "ventana_horas": self._ventana},
        )
        s2 = SolicitudCuatroOjos(
            id=s.id, actor=s.actor, rol=s.rol, accion=s.accion,
            recurso=s.recurso, estado=ESTADO_EXPIRADA,
            veredicto_motor=s.veredicto_motor, aprobadores=s.aprobadores,
            politica=s.politica, creada_ts=s.creada_ts,
        )
        self._solicitudes[sid] = s2
        return s2

    # ── contabilidad (delegada al motor — se cobra SOLO lo ejecutado) ──

    def confirmar_consumo(
        self, rol: str, tokens: int, llamadas: int, costo: float
    ) -> None:
        """TRAS ejecutar una acción doblemente aprobada: cobra el gasto."""
        self._motor.confirmar_consumo(rol, tokens, llamadas, costo)

    # ── sellado de intentos inválidos ─────────────────────────────

    def _sellar_intento_invalido(
        self, s: SolicitudCuatroOjos, quien: str, rol: str, *, motivo: str
    ) -> None:
        """Toda arista violada queda en el ledger — auditoría, no castigo."""
        self._ledger.registrar(
            actor=quien, rol=rol, accion=ACCION_INTENTO_INVALIDO,
            recurso=s.recurso,
            detalles={"solicitud": s.id, "motivo": motivo},
        )


# ── Fábrica ───────────────────────────────────────────────────────

def crear_gobierno_cuatro_ojos(
    ts: Any = None,
    ruta_constitucion: Any = None,
) -> tuple[ProtocoloCuatroOjos, MotorPoliticas, LedgerGobierno]:
    """Compone (protocolo, motor, ledger) — fail-closed como crear_gobierno.

    Constitución rota → motor sin constitución → toda solicitud sale
    ``denegada_por_motor`` (``sin_constitucion_cargada``). El gobierno
    nunca abre sin sus reglas; tampoco muere por ellas.
    """
    from club_mcp.gobierno.fabrica import crear_gobierno

    motor, led = crear_gobierno(ts=ts, ruta_constitucion=ruta_constitucion)
    return ProtocoloCuatroOjos(motor, led), motor, led
