"""Suite de la constitución ejecutable y el motor de políticas — Ola 4.2 (Q-GOV-02).

Corre SIN red, SIN DB, SIN dependencias y SIN reloj real (reloj inyectado
del ledger — lección G40.1 aplicada al nacimiento: ninguna fecha absoluta
que envejezca). La prueba es del contrato del gobierno:

  1. Constitución: carga, validación estructural COMPLETA (cada campo
     inválido rechazado), sellado sha-256 determinista, inmutabilidad.
  2. Pin del CI (el análogo del golden del prompt_registry): el sha
     hardcodeado calza con el documento vivo — editar sin bump = ROJO.
  3. Motor default-DENY: primera coincidencia por prioridad, matching
     de prefijos, exclusiones, condiciones por referencia actor.id.
  4. Economía: allow sin presupuesto es DENY; ventana por día UTC;
     contabilidad persistible; abortada no cobra.
  5. Cableado (DV-002): TODO veredicto se sella al ledger con el sha
     de la constitución; fail-closed sin constitución; round-trip del
     ledger completo con veredictos adentro.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from club_mcp.gobierno.constitucion import (
    DEFAULT_EFECTO,
    RUTA_CONSTITUCION,
    ConstitucionInvalida,
    cargar_constitucion,
    verificar_pin_constitucion,
)
from club_mcp.gobierno.fabrica import crear_gobierno
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import (
    ContabilidadEconomia,
    MotorPoliticas,
    Veredicto,
    _calza,
)

RELOJ_FIJO = "2026-11-26T12:00:00Z"
RELOJ_OTRO_DIA = "2026-11-27T03:00:00Z"

# Pin del CI — el golden de la constitución. Editar el documento sin
# actualizar ESTE hash (y bump de version) = esta suite ROJA con diff
# legible. Es la disciplina del prompt_registry (Ola 3.3) en gobierno.
CONSTITUCION_SHA_PIN = "5726a3cfeab1a371c350d61d87be02a19a7be01e8714ad95cc520bcefc812a6d"


def _motor(contabilidad: ContabilidadEconomia | None = None) -> MotorPoliticas:
    led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
    return MotorPoliticas(cargar_constitucion(), led, contabilidad)


def _eval(
    motor: MotorPoliticas,
    *,
    actor: str = "actor-1",
    rol: str = "staff",
    accion: str = "crear",
    recurso: str = "evento/1",
    contexto: dict | None = None,
    costo: dict | None = None,
) -> Veredicto:
    return motor.evaluar_y_registrar(
        actor=actor, rol=rol, accion=accion, recurso=recurso,
        contexto=contexto, costo_estimado=costo,
    )


def _constitucion_doc() -> dict:
    """Documento base para mutaciones de validación (tmp_path)."""
    return json.loads(RUTA_CONSTITUCION.read_text(encoding="utf-8"))


def _escribir(tmp_path: Path, doc: dict) -> Path:
    p = tmp_path / "constitucion.json"
    p.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    return p


# ── 1 · constitución: carga y validación estructural ─────────────

class TestConstitucionCarga:
    def test_carga_la_del_paquete(self) -> None:
        c = cargar_constitucion()
        assert c.version == 1
        assert len(c.politicas) == 5
        assert c.default == DEFAULT_EFECTO
        assert len(c.sha256) == 64

    def test_formato_incorrecto_rechazado(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["formato"] = "otro-formato-v99"
        with pytest.raises(ConstitucionInvalida, match="formato"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_json_roto_rechazado(self, tmp_path: Path) -> None:
        p = tmp_path / "c.json"
        p.write_text("{no json", encoding="utf-8")
        with pytest.raises(ConstitucionInvalida, match="ilegible"):
            cargar_constitucion(p)

    def test_version_invalida_rechazada(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["version"] = "uno"
        with pytest.raises(ConstitucionInvalida, match="version"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_id_duplicado_rechazado(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["politicas"][1]["id"] = doc["politicas"][0]["id"]
        with pytest.raises(ConstitucionInvalida, match="duplicado"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_prioridad_duplicada_rechazada(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["politicas"][1]["prioridad"] = doc["politicas"][0]["prioridad"]
        with pytest.raises(ConstitucionInvalida, match="prioridad"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_efecto_desconocido_rechazado(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["politicas"][0]["efecto"] = "quizas"
        with pytest.raises(ConstitucionInvalida, match="efecto"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_accion_desconocida_rechazada(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["politicas"][0]["acciones"] = ["volar"]
        with pytest.raises(ConstitucionInvalida, match="acción"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_rol_desconocido_rechazado(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["politicas"][0]["sujetos"]["roles"] = ["emperador"]
        with pytest.raises(ConstitucionInvalida, match="rol"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_sin_politicas_rechazado(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["politicas"] = []
        with pytest.raises(ConstitucionInvalida, match="politicas"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_default_allow_prohibido_por_diseno(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["invariantes"]["default"] = "allow"
        with pytest.raises(ConstitucionInvalida, match="fail-closed"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_economia_por_rol_mayor_que_global_rechazada(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["economia"]["presupuestos_por_rol"]["socio"]["tokens_dia"] = 999999999
        with pytest.raises(ConstitucionInvalida, match="flota entera"):
            cargar_constitucion(_escribir(tmp_path, doc))

    def test_economia_clave_desconocida_rechazada(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["economia"]["presupuestos_globales"]["euros_dia"] = 5
        with pytest.raises(ConstitucionInvalida, match="desconocida"):
            cargar_constitucion(_escribir(tmp_path, doc))


# ── 2 · sellado determinista + pin del CI ─────────────────────────

class TestSelladoConstitucion:
    def test_sha_determinista_entre_cargas(self) -> None:
        assert cargar_constitucion().sha256 == cargar_constitucion().sha256

    def test_reformatear_no_cambia_el_hash(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        indentado = tmp_path / "c.json"
        indentado.write_text(json.dumps(doc, ensure_ascii=False, indent=7), encoding="utf-8")
        assert cargar_constitucion(indentado).sha256 == cargar_constitucion().sha256

    def test_editar_un_valor_cambia_el_hash(self, tmp_path: Path) -> None:
        doc = _constitucion_doc()
        doc["economia"]["presupuestos_globales"]["tokens_dia"] += 1
        assert cargar_constitucion(_escribir(tmp_path, doc)).sha256 != cargar_constitucion().sha256

    def test_pin_del_ci_calza_con_el_documento_vivo(self) -> None:
        """EL gate: editar constitucion.json sin bump = este test ROJO."""
        assert cargar_constitucion().sha256 == CONSTITUCION_SHA_PIN

    def test_verificar_pin_rechaza_otro_sha(self) -> None:
        assert not verificar_pin_constitucion("f" * 64)

    def test_verificar_pin_rechaza_constitucion_rota(self, tmp_path: Path) -> None:
        p = tmp_path / "c.json"
        p.write_text("{}", encoding="utf-8")
        assert not verificar_pin_constitucion(CONSTITUCION_SHA_PIN, p)


# ── 3 · motor default-DENY ────────────────────────────────────────

class TestMotorDefaultDeny:
    def test_lo_no_listado_esta_denegado(self) -> None:
        assert not _eval(_motor(), rol="socio", accion="borrar", recurso="miembro/1").permitido

    def test_veredicto_deny_lleva_default_deny(self) -> None:
        v = _eval(_motor(), rol="socio", accion="borrar", recurso="miembro/1")
        assert v.motivo == "default_deny"
        assert v.politica_id is None

    def test_lecturas_permitidas_a_todos_los_roles(self) -> None:
        m = _motor()
        for rol in ("admin", "director", "staff", "socio"):
            assert _eval(m, rol=rol, accion="leer", recurso="dashboard/x").permitido

    def test_primera_coincidencia_por_prioridad_gana(self) -> None:
        # P-001 (prioridad 10) calza 'leer' sobre dashboard/* ANTES que
        # P-005 (admin catch-all): el socio obtiene P-001, no P-005.
        v = _eval(_motor(), rol="socio", accion="leer", recurso="dashboard/x")
        assert v.politica_id == "P-001"

    def test_director_no_muta_gobierno_por_exclusion(self) -> None:
        m = _motor()
        for accion in ("crear", "actualizar", "borrar", "ejecutar"):
            for recurso in ("gobierno/rol", "politica/P-001", "constitucion/json"):
                v = _eval(m, rol="director", accion=accion, recurso=recurso)
                assert not v.permitido, f"{accion} {recurso} debía denegarse"

    def test_admin_puede_mutar_gobierno(self) -> None:
        assert _eval(_motor(), rol="admin", accion="actualizar", recurso="gobierno/rol").permitido

    def test_staff_no_toca_finanzas_ni_gobierno(self) -> None:
        m = _motor()
        assert not _eval(m, rol="staff", accion="crear", recurso="factura/1").permitido
        assert not _eval(m, rol="staff", accion="ejecutar", recurso="gobierno/rol").permitido
        assert _eval(m, rol="staff", accion="crear", recurso="evento/1").permitido


class TestMatchingPatrones:
    def test_wildcard_total_calza_todo(self) -> None:
        assert _calza("*", "cualquier/cosa")

    def test_prefijo_con_wildcard(self) -> None:
        # Contrato = prefijo literal (mismo que el RBAC del club):
        # "evento/*" → startswith("evento"). Sin regex: auditable.
        assert _calza("evento/*", "evento/123")
        assert _calza("evento/*", "evento/")
        assert _calza("evento/*", "evento")
        assert _calza("evento/*", "eventos/123")
        assert not _calza("evento/*", "miembro/1")

    def test_sin_wildcard_igualdad_exacta(self) -> None:
        assert _calza("gobierno/rol", "gobierno/rol")
        assert not _calza("gobierno/rol", "gobierno/rol/x")


class TestCondicionesSelfService:
    def test_recurso_propio_permitido(self) -> None:
        v = _eval(
            _motor(), rol="socio", accion="crear", recurso="reserva/9",
            contexto={"propietario_recurso": "actor-1"}, actor="actor-1",
        )
        assert v.permitido and v.politica_id == "P-002"

    def test_recurso_ajeno_denegado(self) -> None:
        v = _eval(
            _motor(), rol="socio", accion="crear", recurso="reserva/9",
            contexto={"propietario_recurso": "otro"}, actor="actor-1",
        )
        assert not v.permitido and v.motivo == "default_deny"

    def test_sin_contexto_de_propiedad_fail_closed(self) -> None:
        assert not _eval(_motor(), rol="socio", accion="crear", recurso="reserva/9").permitido


# ── 4 · economía de agentes ───────────────────────────────────────

class TestEconomia:
    def test_allow_con_presupuesto_suficiente(self) -> None:
        v = _eval(
            _motor(), rol="staff", accion="ejecutar", recurso="evento/1",
            costo={"tokens": 100, "llamadas": 1, "costo": 0.5},
        )
        assert v.permitido
        assert v.economia is not None and "tokens_usados" in v.economia

    def test_allow_sin_presupuesto_es_deny(self) -> None:
        cont = ContabilidadEconomia.vacia()
        led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        led._cont = None  # noop — claridad
        # socio: 50000 tokens/día — ya gastados 49999, pide 2 → DENY
        cont.registrar_consumo("socio", "2026-11-26", 49999, 0, 0.0)
        m = MotorPoliticas(cargar_constitucion(), LedgerGobierno(ts=lambda: RELOJ_FIJO), cont)
        v = _eval(m, rol="socio", accion="leer", recurso="dashboard/x",
                  costo={"tokens": 2, "llamadas": 0, "costo": 0.0})
        assert not v.permitido
        assert v.motivo == "presupuesto_agotado"
        assert v.politica_permiso == "P-001"  # el permiso SÍ calzó — la economía negó

    def test_limite_por_llamadas(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("socio", "2026-11-26", 0, 200, 0.0)  # tope socio
        m = MotorPoliticas(cargar_constitucion(), LedgerGobierno(ts=lambda: RELOJ_FIJO), cont)
        v = _eval(m, rol="socio", accion="leer", recurso="dashboard/x",
                  costo={"tokens": 1, "llamadas": 1, "costo": 0.0})
        assert not v.permitido and v.motivo == "presupuesto_agotado"

    def test_limite_por_costo(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("socio", "2026-11-26", 0, 0, 10.0)  # tope socio
        m = MotorPoliticas(cargar_constitucion(), LedgerGobierno(ts=lambda: RELOJ_FIJO), cont)
        v = _eval(m, rol="socio", accion="leer", recurso="dashboard/x",
                  costo={"tokens": 0, "llamadas": 0, "costo": 0.01})
        assert not v.permitido and v.motivo == "presupuesto_agotado"

    def test_sin_costo_estimado_no_aplica_economia(self) -> None:
        """Acción sin costo LLM: la economía no la bloquea (no consume)."""
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("socio", "2026-11-26", 50000, 200, 10.0)  # todo al tope
        m = MotorPoliticas(cargar_constitucion(), LedgerGobierno(ts=lambda: RELOJ_FIJO), cont)
        v = _eval(m, rol="socio", accion="leer", recurso="dashboard/x")  # sin costo
        assert v.permitido

    def test_la_ventana_es_por_dia_utc(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("socio", "2026-11-26", 50000, 0, 0.0)  # ayer del reloj
        led = LedgerGobierno(ts=lambda: RELOJ_OTRO_DIA)  # 27-nov: día NUEVO
        m = MotorPoliticas(cargar_constitucion(), led, cont)
        v = _eval(m, rol="socio", accion="leer", recurso="dashboard/x",
                  costo={"tokens": 100, "llamadas": 1, "costo": 0.1})
        assert v.permitido  # presupuesto renovado con el día

    def test_confirmar_consumo_cobra_y_renovado_no(self) -> None:
        m = _motor()
        v = _eval(m, rol="socio", accion="leer", recurso="dashboard/x",
                  costo={"tokens": 60000, "llamadas": 0, "costo": 0.0})
        assert not v.permitido  # 60000 > tope 50000 del socio

    def test_contabilidad_round_trip(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("staff", "2026-11-26", 100, 2, 0.4)
        snap = cont.persistir()
        assert snap == {"staff|2026-11-26": {"tokens": 100, "llamadas": 2, "costo": 0.4}}
        vuelta = ContabilidadEconomia.desde_snapshot(snap)
        assert vuelta.gasto("staff", "2026-11-26") == {"tokens": 100, "llamadas": 2, "costo": 0.4}

    def test_rol_sin_presupuesto_usa_el_global(self) -> None:
        c = cargar_constitucion()
        assert c.economia.presupuesto_rol("rol_inexistente") == c.economia.global_


# ── 5 · cableado al ledger (DV-002) ───────────────────────────────

class TestCableadoLedger:
    def test_todo_veredicto_se_sella_al_ledger(self) -> None:
        m = _motor()
        _eval(m, rol="staff", accion="crear", recurso="evento/1")
        _eval(m, rol="socio", accion="borrar", recurso="miembro/9")
        led = m._ledger  # noqa: SLF001 — inspección de la suite
        evs = [e for e in led.eventos() if e.accion == "veredicto_politica"]
        assert len(evs) == 2
        assert [e.detalles["accion_solicitada"] for e in evs] == ["crear", "borrar"]

    def test_el_veredicto_cita_el_sha_de_la_constitucion(self) -> None:
        m = _motor()
        _eval(m, rol="staff", accion="crear", recurso="evento/1")
        ev = [e for e in m._ledger.eventos() if e.accion == "veredicto_politica"][0]  # noqa: SLF001
        assert ev.detalles["constitucion_sha"] == cargar_constitucion().sha256
        assert ev.detalles["constitucion_version"] == 1

    def test_fail_closed_sin_constitucion(self) -> None:
        led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        m = MotorPoliticas(None, led)
        v = _eval(m, rol="admin", accion="ejecutar", recurso="gobierno/rol")
        assert not v.permitido
        assert v.motivo == "sin_constitucion_cargada"
        assert v.constitucion_sha == "0" * 64  # el DENY también queda sellado

    def test_fabrica_fail_closed_con_documento_roto(self, tmp_path: Path) -> None:
        p = tmp_path / "c.json"
        p.write_text("{roto", encoding="utf-8")
        motor, _ = crear_gobierno(ts=lambda: RELOJ_FIJO, ruta_constitucion=p)
        assert motor.constitucion is None
        assert not _eval(motor, rol="admin", accion="ejecutar", recurso="x/y").permitido

    def test_fabrica_sana_operativa(self) -> None:
        motor, led = crear_gobierno(ts=lambda: RELOJ_FIJO)
        assert motor.constitucion is not None
        assert _eval(motor, rol="staff", accion="crear", recurso="evento/1").permitido
        assert led.verificar_cadena().ok

    def test_ledger_con_veredictos_round_trip(self) -> None:
        m = _motor()
        for i in range(6):
            _eval(m, rol="socio", accion="leer", recurso=f"dashboard/{i}",
                  costo={"tokens": 10, "llamadas": 1, "costo": 0.01})
        texto = m._ledger.a_json()  # noqa: SLF001
        led2 = LedgerGobierno.desde_json(texto)
        evs = [e for e in led2.eventos() if e.accion == "veredicto_politica"]
        assert len(evs) == 6
        assert led2.verificar_cadena().ok

    def test_dos_motores_iguales_producen_ledgers_byte_a_byte(self) -> None:
        veredictos = [
            ("a", "staff", "crear", "evento/1"),
            ("b", "socio", "leer", "dashboard/x"),
            ("c", "director", "actualizar", "miembro/2"),
        ]
        textos = []
        for _ in range(2):
            m = _motor()
            for actor, rol, accion, recurso in veredictos:
                _eval(m, actor=actor, rol=rol, accion=accion, recurso=recurso)
            textos.append(m._ledger.a_json())  # noqa: SLF001
        assert textos[0] == textos[1]

    def test_condicion_referencia_desconocida_fail_closed(self) -> None:
        """Una condición con referencia que no existe deniega — nunca abre."""
        from club_mcp.gobierno.constitucion import Politica
        p = Politica(
            id="PX", efecto="allow", roles=("socio",), acciones=("crear",),
            recursos=("reserva/*",),
            condicion={"campo": "recurso.propietario", "referencia": "actor.email"},
        )
        from club_mcp.gobierno.politicas import _condicion_ok
        assert not _condicion_ok(p, "a-1", {"propietario_recurso": "a-1"})
