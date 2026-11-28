"""Suite de contrato — puerto de evidencia (Ola 4.4 · Q-GOV-04 charter).

Blinda ADR-0013: el bundle amarra constitución + ledger + espejos con
raíz Merkle única, fail-closed en cada arista de emisión y verificación,
determinismo byte a byte, y el snapshot sellado al ledger como hecho.
"""
from __future__ import annotations

import json

import pytest

from club_mcp.gobierno.backtesting import (
    BacktesterGobierno,
    extraer_casos,
    informe,
)
from club_mcp.gobierno.constitucion import cargar_constitucion
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import MotorPoliticas
from club_mcp.gobierno.puerto_evidencia import (
    ACCION_SNAPSHOT,
    FORMATO_BUNDLE,
    NOMBRE_CONSTITUCION,
    NOMBRE_LEDGER,
    PREFIJO_ESPEJO,
    PREFIJO_INFORME,
    BundleEvidencia,
    ComponenteEvidencia,
    EspejoEvidencia,
    EvidenciaError,
    ManifiestoEvidencia,
    PuertoEvidencia,
    contar_veredictos,
    raiz_de,
    verificar_bundle,
)


RELOJ = "2026-11-27T12:00:00Z"
RELOJ2 = "2026-11-27T18:30:00Z"


def _gobierno(reloj: str = RELOJ) -> tuple[MotorPoliticas, LedgerGobierno]:
    led = LedgerGobierno(ts=lambda: reloj)
    motor = MotorPoliticas(cargar_constitucion(), led)
    return motor, led


def _gobierno_con_trafico() -> tuple[MotorPoliticas, LedgerGobierno]:
    """Ledger con veredictos + four-eyes: evidencia con contenido real."""
    from club_mcp.gobierno.cuatro_ojos import ProtocoloCuatroOjos

    motor, led = _gobierno()
    proto = ProtocoloCuatroOjos(motor, led)
    motor.evaluar_y_registrar(
        actor="a-1", rol="socio", accion="leer", recurso="dashboard/1"
    )
    s = proto.solicitar(
        actor="a-9", rol="admin", accion="actualizar", recurso="gobierno/rol/7"
    )
    proto.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
    proto.aprobar(s.id, aprobador="a-2", rol_aprobador="admin")
    return motor, led


def _espejo(led: LedgerGobierno, reloj: str = RELOJ) -> EspejoEvidencia:
    """Contrafactual real: presupuesto socio a la mitad."""
    doc = json.loads(cargar_constitucion().documento_canon)
    doc["economia"]["presupuestos_por_rol"]["socio"]["tokens_dia"] = 25000
    doc["version"] = 3
    bt = BacktesterGobierno.desde_documento(doc)
    resultados = bt.correr(extraer_casos(led))
    return EspejoEvidencia(
        etiqueta="socio-mitad",
        ledger_json=bt.espejo.a_json(),
        informe_resumen=informe(resultados).resumen(),
    )


# ── 1 · emisión ───────────────────────────────────────────────────

class TestEmision:
    def test_bundle_minimo_estructura(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        m = b.manifiesto
        assert m.formato == FORMATO_BUNDLE
        assert m.constitucion_version == 2
        nombres = {n for n, _ in m.componentes}
        assert nombres == {NOMBRE_CONSTITUCION, NOMBRE_LEDGER}

    def test_componentes_en_orden_canonico(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        nombres = [c.nombre for c in b.componentes]
        assert nombres == sorted(nombres)

    def test_hash_componente_une_nombre_y_contenido(self) -> None:
        c1 = ComponenteEvidencia("a", "x")
        c2 = ComponenteEvidencia("b", "x")
        c3 = ComponenteEvidencia("a", "y")
        assert c1.hash != c2.hash  # mismo contenido, otro nombre
        assert c1.hash != c3.hash  # mismo nombre, otro contenido

    def test_con_espejos_lleva_los_cuatro_componentes(self) -> None:
        _, led = _gobierno_con_trafico()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir(
            espejos=[_espejo(led)]
        )
        nombres = {n for n, _ in b.manifiesto.componentes}
        assert nombres == {
            NOMBRE_CONSTITUCION, NOMBRE_LEDGER,
            PREFIJO_ESPEJO + "socio-mitad", PREFIJO_INFORME + "socio-mitad",
        }

    def test_el_snapshot_se_sella_al_ledger(self) -> None:
        _, led = _gobierno()
        antes = len(led.eventos())
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        despues = led.eventos()
        assert len(despues) == antes + 1
        sello = despues[-1]
        assert sello.accion == ACCION_SNAPSHOT
        assert sello.detalles["raiz"] == b.manifiesto.raiz_bundle
        assert sello.detalles["eventos_al_snapshot"] == antes

    def test_el_bundle_no_contiene_su_propio_sello(self) -> None:
        """La raíz amarra el estado PRE-sello — no puede amarrarse a sí misma."""
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        eventos_en_bundle = json.loads(
            b.componente(NOMBRE_LEDGER).contenido
        )["eventos"]
        assert all(e["accion"] != ACCION_SNAPSHOT for e in eventos_en_bundle)
        assert len(eventos_en_bundle) == b.manifiesto.ledger_eventos


# ── 2 · fail-closed de emisión ────────────────────────────────────

class TestEmisionFailClosed:
    def test_sin_constitucion_no_emite(self) -> None:
        _, led = _gobierno()
        with pytest.raises(EvidenciaError, match="sin constitución"):
            PuertoEvidencia(None, led).emitir()

    def test_espejo_con_ledger_roto_no_emite(self) -> None:
        _, led = _gobierno()
        roto = EspejoEvidencia(
            etiqueta="roto", ledger_json="{}",
            informe_resumen="x",
        )
        with pytest.raises(EvidenciaError, match="espejo 'roto'"):
            PuertoEvidencia(cargar_constitucion(), led).emitir(espejos=[roto])


# ── 3 · round-trip + verificación ─────────────────────────────────

class TestRoundTrip:
    def test_round_trip_byte_a_byte(self) -> None:
        _, led = _gobierno_con_trafico()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        assert BundleEvidencia.desde_json(b.a_json()).a_json() == b.a_json()

    def test_verificar_bundle_valido(self) -> None:
        _, led = _gobierno_con_trafico()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir(
            espejos=[_espejo(led)]
        )
        ok, msg = verificar_bundle(b.a_json())
        assert ok, msg
        assert "ÍNTEGRO" in msg
        assert "constitución v2" in msg

    def test_bundle_mutado_no_verifica(self) -> None:
        _, led = _gobierno_con_trafico()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        d["componentes"][0]["contenido"] = d["componentes"][0]["contenido"].replace(
            "P-001", "P-999"
        )
        ok, msg = verificar_bundle(json.dumps(d))
        assert not ok
        assert "mutado" in msg or "raíz" in msg

    def test_ledger_mutado_dentro_del_bundle_no_verifica(self) -> None:
        _, led = _gobierno_con_trafico()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        for c in d["componentes"]:
            if c["nombre"] == NOMBRE_LEDGER:
                c["contenido"] = c["contenido"].replace("dashboard/1", "dashboard/9")
        ok, _ = verificar_bundle(json.dumps(d))
        assert not ok

    def test_componente_fantasma_no_verifica(self) -> None:
        """Componente extra no declarado = conjunto distinto → inválido."""
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        d["componentes"].append({"nombre": "extra", "contenido": "x"})
        ok, _ = verificar_bundle(json.dumps(d))
        assert not ok

    def test_manifiesto_con_menos_componentes_no_verifica(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        d["manifiesto"]["componentes"] = d["manifiesto"]["componentes"][:1]
        ok, _ = verificar_bundle(json.dumps(d))
        assert not ok

    def test_manifiesto_ilegible(self) -> None:
        ok, msg = verificar_bundle("no soy json")
        assert not ok
        assert "ilegible" in msg

    def test_formato_desconocido(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        d["manifiesto"]["formato"] = "gobierno-evidencia-v0"
        ok, _ = verificar_bundle(json.dumps(d))
        assert not ok

    def test_conteo_ledger_mentiroso_no_verifica(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        d["manifiesto"]["ledger_eventos"] += 5
        ok, _ = verificar_bundle(json.dumps(d))
        assert not ok

    def test_constitucion_del_bundle_no_calza_con_manifiesto(self) -> None:
        """Constitución mutada (aún válida) = sha distinto → inválido."""
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        d = json.loads(b.a_json())
        for c in d["componentes"]:
            if c["nombre"] == NOMBRE_CONSTITUCION:
                doc = json.loads(c["contenido"])
                doc["politicas"][0]["descripcion"] = "mutada"
                c["contenido"] = json.dumps(doc, ensure_ascii=False)
        ok, _ = verificar_bundle(json.dumps(d))
        assert not ok

    def test_sin_ledger_no_es_evidencia(self) -> None:
        d = {
            "manifiesto": json.loads(
                ManifiestoEvidencia(
                    formato=FORMATO_BUNDLE, constitucion_sha="0" * 64,
                    constitucion_version=1, ledger_eventos=0, ledger_epochs=0,
                    snapshot_ts=RELOJ, componentes=(), raiz_bundle="0" * 64,
                ).a_json()
            ),
            "componentes": [],
        }
        ok, msg = verificar_bundle(json.dumps(d))
        assert not ok
        assert "ledger" in msg


# ── 4 · determinismo ──────────────────────────────────────────────

class TestDeterminismo:
    def test_mismo_estado_misma_raiz_byte_a_byte(self) -> None:
        motor, led = _gobierno_con_trafico()
        b1 = PuertoEvidencia(cargar_constitucion(), led).emitir()
        # segunda emisión sobre el MISMO estado visible: el sello previo
        # ya está en el ledger (el estado creció) — así que comparamos
        # dos construcciones independientes del mismo gobierno en frio
        motor2, led2 = _gobierno_con_trafico()
        b2 = PuertoEvidencia(cargar_constitucion(), led2).emitir()
        assert b1.a_json() == b2.a_json()
        assert b1.manifiesto.raiz_bundle == b2.manifiesto.raiz_bundle
        assert motor is not motor2  # sanity: gobiernos distintos, mismo artefacto

    def test_reloj_inyectado_controla_el_snapshot_ts(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(
            cargar_constitucion(), led, ts=lambda: RELOJ2
        ).emitir()
        assert b.manifiesto.snapshot_ts == RELOJ2


# ── 5 · utilidades del tercero ────────────────────────────────────

class TestUtilidadesTercero:
    def test_raiz_de_es_de_64_hex(self) -> None:
        _, led = _gobierno_con_trafico()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        raiz = raiz_de(b.a_json())
        assert len(raiz) == 64
        int(raiz, 16)  # hex puro

    def test_raiz_de_bundle_roto_falla_cerrado(self) -> None:
        with pytest.raises(EvidenciaError):
            raiz_de("{}")

    def test_contar_veredictos_del_trafico_real(self) -> None:
        motor, led = _gobierno_con_trafico()
        # veredictos sellados: la lectura del socio + la solicitud admin
        # (las APROBACIONES del protocolo no evalúan el motor — son
        # transiciones de la capa, selladas como cuatro_ojos_*)
        b = PuertoEvidencia(motor.constitucion, led).emitir()
        assert contar_veredictos(b.a_json()) == 2

    def test_contar_veredictos_bundle_roto_falla_cerrado(self) -> None:
        with pytest.raises(EvidenciaError):
            contar_veredictos("no json")

    def test_acceso_por_nombre(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        assert b.componente(NOMBRE_CONSTITUCION).nombre == NOMBRE_CONSTITUCION
        with pytest.raises(LookupError):
            b.componente("no-existe")


# ── 6 · contrato del motor INTACTO ────────────────────────────────

class TestContratoMotorIntacto:
    def test_el_documento_canon_calza_con_el_sha_sellado(self) -> None:
        """El canon retenido (nuevo campo 4.4) es el MISMO que sella el sha."""
        import hashlib

        c = cargar_constitucion()
        assert hashlib.sha256(c.documento_canon.encode()).hexdigest() == c.sha256

    def test_la_constitucion_cargada_del_bundle_es_la_viva(self) -> None:
        _, led = _gobierno()
        b = PuertoEvidencia(cargar_constitucion(), led).emitir()
        recargada = BundleEvidencia.desde_json(b.a_json()).constitucion
        viva = cargar_constitucion()
        assert recargada.sha256 == viva.sha256
        assert recargada.version == viva.version
        assert len(recargada.politicas) == len(viva.politicas)
