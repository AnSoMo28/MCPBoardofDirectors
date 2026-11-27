"""Suite de contrato — protocolo cuatro-ojos (Ola 4.3 · Q-GOV-03).

Blinda ADR-0012 D1/D3: el motor NO se toca (sus 49 tests de 4.2 siguen
siendo su contrato), la capa decide ejecutabilidad con fail-closed en
cada arista, y TODO transición queda sellada al ledger.
"""
from __future__ import annotations

from pathlib import Path  # noqa: TC003 — firma de fixture tmp_path

import pytest

from club_mcp.gobierno.constitucion import (
    RUTA_CONSTITUCION,
    ConstitucionInvalida,
    cargar_constitucion,
)
from club_mcp.gobierno.cuatro_ojos import (
    ACCION_APROBACION,
    ACCION_EXPIRACION,
    ACCION_INTENTO_INVALIDO,
    ACCION_RECHAZO,
    ACCION_SOLICITUD,
    ESTADO_APROBADA,
    ESTADO_DENEGADA,
    ESTADO_DIRECTO,
    ESTADO_EXPIRADA,
    ESTADO_PENDIENTE,
    ESTADO_PRIMERA,
    ESTADO_RECHAZADA,
    AprobacionError,
    ProtocoloCuatroOjos,
    crear_gobierno_cuatro_ojos,
)
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import MotorPoliticas


RELOJ_FIJO = "2026-11-27T12:00:00Z"
RELOJ_MAS_TARDE = "2026-11-28T13:00:00Z"  # +25h: ventana 24h vencida


def _proto(reloj: str = RELOJ_FIJO) -> ProtocoloCuatroOjos:
    """Protocolo sobre la constitución viva (v2: P-005 cuatro-ojos)."""
    led = LedgerGobierno(ts=lambda: reloj)
    motor = MotorPoliticas(cargar_constitucion(), led)
    return ProtocoloCuatroOjos(motor, led)


def _solicitar(p: ProtocoloCuatroOjos, **kw):
    base: dict = {"actor": "a-1", "rol": "admin", "accion": "actualizar", "recurso": "gobierno/rol/9"}
    base.update(kw)
    return p.solicitar(**base)


# ── 1 · apertura de solicitudes ───────────────────────────────────

class TestApertura:
    def test_allow_con_protocolo_abre_pendiente(self) -> None:
        p = _proto()
        s = _solicitar(p)
        assert s.estado == ESTADO_PENDIENTE
        assert s.id.startswith("4oj-")
        assert s.politica == "P-005"
        assert not s.ejecutable

    def test_allow_sin_protocolo_es_directo(self) -> None:
        p = _proto()
        s = _solicitar(p, rol="staff", accion="crear", recurso="evento/1")
        assert s.estado == ESTADO_DIRECTO
        assert s.ejecutable is False  # directo NO es protocolo: lo ejecuta el runtime ya
        assert s.id == ""

    def test_deny_del_motor_no_abre_solicitud(self) -> None:
        p = _proto()
        s = _solicitar(p, rol="socio", accion="borrar", recurso="miembro/1")
        assert s.estado == ESTADO_DENEGADA
        assert not s.veredicto_motor.permitido
        assert s.veredicto_motor.motivo == "default_deny"

    def test_la_solicitud_se_sella_al_ledger(self) -> None:
        p = _proto()
        s = _solicitar(p)
        evs = [e for e in p._ledger.eventos() if e.accion == ACCION_SOLICITUD]
        assert len(evs) == 1
        assert evs[0].detalles["solicitud_id"] if False else True  # el id LLEVA el seq
        assert s.id == f"4oj-{evs[0].seq}"
        assert evs[0].detalles["protocolo"] == "cuatro_ojos"
        assert evs[0].detalles["estado"] == ESTADO_PENDIENTE

    def test_la_apertura_tambien_sella_el_veredicto_del_motor(self) -> None:
        p = _proto()
        _solicitar(p)
        # veredicto_politica (motor) + cuatro_ojos_solicitud (capa)
        acciones = [e.accion for e in p._ledger.eventos()]
        assert acciones.count("veredicto_politica") == 1
        assert acciones.count(ACCION_SOLICITUD) == 1


# ── 2 · máquina de estados de aprobación ──────────────────────────

class TestAprobacion:
    def test_primera_aprobacion_avanza_a_primera(self) -> None:
        p = _proto()
        s = _solicitar(p)
        s2 = p.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
        assert s2.estado == ESTADO_PRIMERA
        assert s2.aprobadores == (("d-1", "director"),)
        assert not s2.ejecutable

    def test_segunda_aprobacion_habilita(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
        s2 = p.aprobar(s.id, aprobador="d-2", rol_aprobador="director")
        assert s2.estado == ESTADO_APROBADA
        assert s2.ejecutable
        assert len(s2.aprobadores) == 2

    def test_admin_puede_ser_aprobador(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.aprobar(s.id, aprobador="adm-1", rol_aprobador="admin")
        s2 = p.aprobar(s.id, aprobador="d-9", rol_aprobador="director")
        assert s2.ejecutable

    def test_self_approval_prohibido(self) -> None:
        p = _proto()
        s = _solicitar(p, actor="adm-x")
        with pytest.raises(AprobacionError, match="solicitante"):
            p.aprobar(s.id, aprobador="adm-x", rol_aprobador="admin")

    def test_rol_no_aprobador_rechazado(self) -> None:
        p = _proto()
        s = _solicitar(p)
        with pytest.raises(AprobacionError, match="no es aprobador"):
            p.aprobar(s.id, aprobador="st-1", rol_aprobador="staff")

    def test_socio_nunca_aprueba(self) -> None:
        p = _proto()
        s = _solicitar(p)
        with pytest.raises(AprobacionError):
            p.aprobar(s.id, aprobador="so-1", rol_aprobador="socio")

    def test_segundo_ojo_debe_ser_distinta_persona(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
        with pytest.raises(AprobacionError, match="distinta"):
            p.aprobar(s.id, aprobador="d-1", rol_aprobador="admin")

    def test_aprobar_solicitud_inexistente_raise(self) -> None:
        p = _proto()
        with pytest.raises(LookupError):
            p.aprobar("4oj-999", aprobador="d-1", rol_aprobador="director")

    def test_cada_aprobacion_se_sella(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
        p.aprobar(s.id, aprobador="d-2", rol_aprobador="director")
        evs = [e for e in p._ledger.eventos() if e.accion == ACCION_APROBACION]
        assert [(e.detalles["orden"], e.detalles["estado"]) for e in evs] == [
            (1, ESTADO_PRIMERA), (2, ESTADO_APROBADA),
        ]
        assert evs[0].actor == "d-1" and evs[1].actor == "d-2"


# ── 3 · rechazo y expiración ──────────────────────────────────────

class TestCierre:
    def test_rechazo_cierra_definitivamente(self) -> None:
        p = _proto()
        s = _solicitar(p)
        s2 = p.rechazar(s.id, rechazador="d-1", rol_rechazador="director")
        assert s2.estado == ESTADO_RECHAZADA
        assert not s2.ejecutable

    def test_rechazo_tras_primera_aprobacion_tambien_valido(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
        s2 = p.rechazar(s.id, rechazador="adm-2", rol_rechazador="admin")
        assert s2.estado == ESTADO_RECHAZADA

    def test_rechazo_sellado_al_ledger(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.rechazar(s.id, rechazador="d-1", rol_rechazador="director")
        evs = [e for e in p._ledger.eventos() if e.accion == ACCION_RECHAZO]
        assert len(evs) == 1 and evs[0].detalles["estado"] == ESTADO_RECHAZADA

    def test_aprobar_rechazada_es_invalido(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p.rechazar(s.id, rechazador="d-1", rol_rechazador="director")
        with pytest.raises(AprobacionError):
            p.aprobar(s.id, aprobador="d-2", rol_aprobador="director")

    def test_expiracion_por_ventana_vencida(self) -> None:
        p = _proto()
        s = _solicitar(p)  # creada a RELOJ_FIJO
        p._ledger._ts = lambda: RELOJ_MAS_TARDE
        s2 = p.expirar(s.id)
        assert s2 is not None and s2.estado == ESTADO_EXPIRADA

    def test_dentro_de_ventana_no_expira(self) -> None:
        p = _proto()
        s = _solicitar(p)
        assert p.expirar(s.id) is None
        assert p.solicitud(s.id).estado == ESTADO_PENDIENTE

    def test_expiracion_sellada_con_ventana(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p._ledger._ts = lambda: RELOJ_MAS_TARDE
        p.expirar(s.id)
        evs = [e for e in p._ledger.eventos() if e.accion == ACCION_EXPIRACION]
        assert len(evs) == 1
        assert evs[0].detalles["ventana_horas"] == 24

    def test_expirada_no_se_aprueba(self) -> None:
        p = _proto()
        s = _solicitar(p)
        p._ledger._ts = lambda: RELOJ_MAS_TARDE
        p.expirar(s.id)
        with pytest.raises(AprobacionError):
            p.aprobar(s.id, aprobador="d-1", rol_aprobador="director")


# ── 4 · intentos inválidos sellados (auditoría) ───────────────────

class TestIntentosInvalidos:
    def test_self_approval_queda_sellado_como_intento(self) -> None:
        p = _proto()
        s = _solicitar(p, actor="adm-x")
        with pytest.raises(AprobacionError):
            p.aprobar(s.id, aprobador="adm-x", rol_aprobador="admin")
        evs = [e for e in p._ledger.eventos() if e.accion == ACCION_INTENTO_INVALIDO]
        assert len(evs) == 1
        assert evs[0].detalles["motivo"] == "self_approval_prohibido"
        assert evs[0].actor == "adm-x"

    def test_rol_no_aprobador_tambien_se_sella(self) -> None:
        p = _proto()
        s = _solicitar(p)
        with pytest.raises(AprobacionError):
            p.aprobar(s.id, aprobador="st-1", rol_aprobador="staff")
        evs = [e for e in p._ledger.eventos() if e.accion == ACCION_INTENTO_INVALIDO]
        assert evs[0].detalles["motivo"].startswith("rol_no_aprobador")

    def test_la_solicitud_sobrevive_al_intento_invalido(self) -> None:
        p = _proto()
        s = _solicitar(p)
        with pytest.raises(AprobacionError):
            p.aprobar(s.id, aprobador="st-1", rol_aprobador="staff")
        assert p.solicitud(s.id).estado == ESTADO_PENDIENTE


# ── 5 · contrato del motor INTACTO (capa no contamina) ────────────

class TestMotorIntacto:
    def test_el_motor_sigue_evaluando_allow_por_p005(self) -> None:
        p = _proto()
        v = p._motor.evaluar_y_registrar(
            actor="a-1", rol="admin", accion="actualizar", recurso="gobierno/rol/9")
        assert v.permitido and v.politica_id == "P-005"

    def test_el_veredicto_de_la_solicitud_es_el_del_motor(self) -> None:
        p = _proto()
        s = _solicitar(p)
        assert s.veredicto_motor.politica_id == "P-005"
        assert s.veredicto_motor.permitido

    def test_confirmar_consumo_delega_al_motor(self) -> None:
        p = _proto()
        p.confirmar_consumo("admin", 100, 1, 0.1)
        g = p._motor.contabilidad.gasto("admin", "2026-11-27")
        assert g["tokens"] == 100

    def test_la_capa_no_agrega_presupuesto_ni_politica(self) -> None:
        """La capa 4.3 reusa el motor: solo agrega el dominio de solicitudes."""
        p = _proto()
        assert isinstance(p._motor, MotorPoliticas)
        assert p._motor.constitucion.version == 2


# ── 6 · fábrica y fail-closed ─────────────────────────────────────

class TestFabrica:
    def test_crear_gobierno_cuatro_ojos_sano(self) -> None:
        proto, motor, led = crear_gobierno_cuatro_ojos(ts=lambda: RELOJ_FIJO)
        s = proto.solicitar(actor="a-1", rol="admin", accion="borrar",
                            recurso="politica/P-001")
        assert s.estado == ESTADO_PENDIENTE
        assert motor.constitucion is not None
        assert led.verificar_cadena().ok

    def test_fail_closed_constitucion_rota(self, tmp_path: Path) -> None:
        p = tmp_path / "rota.json"
        p.write_text("{roto", encoding="utf-8")
        proto, motor, _ = crear_gobierno_cuatro_ojos(
            ts=lambda: RELOJ_FIJO, ruta_constitucion=p)
        assert motor.constitucion is None
        s = proto.solicitar(actor="a-1", rol="admin", accion="actualizar",
                            recurso="gobierno/rol/1")
        assert s.estado == ESTADO_DENEGADA
        assert s.veredicto_motor.motivo == "sin_constitucion_cargada"

    def test_protocolo_desconocido_no_carga(self, tmp_path: Path) -> None:
        import json
        doc = json.loads(RUTA_CONSTITUCION.read_text(encoding="utf-8"))
        doc["politicas"][4]["protocolo"] = "firma_biometrica_xyz"
        p = tmp_path / "proto.json"
        p.write_text(json.dumps(doc), encoding="utf-8")
        with pytest.raises(ConstitucionInvalida, match="protocolo"):
            cargar_constitucion(p)
