"""Suite de contrato — backtesting contrafactual (Ola 4.3 · Q-GOV-03).

Blinda ADR-0012 D2: replay del historial REAL contra constitución
alternativa, fidelidad de ventana anclada al gasto sellado, ledger
espejo verificable, determinismo byte a byte.
"""
from __future__ import annotations

import json
from pathlib import Path  # noqa: TC003 — firma de fixture tmp_path

import pytest

from club_mcp.gobierno.backtesting import (
    BacktesterGobierno,
    CasoVeredicto,
    extraer_casos,
    informe,
)
from club_mcp.gobierno.constitucion import (
    RUTA_CONSTITUCION,
    ConstitucionInvalida,
    cargar_constitucion,
)
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import ContabilidadEconomia, MotorPoliticas


RELOJ = "2026-11-27T10:00:00Z"
OTRO_DIA = "2026-11-27T23:30:00Z"  # mismo día UTC que RELOJ
DIA_SIG = "2026-11-28T01:00:00Z"   # día UTC siguiente


def _motor(reloj: str = RELOJ) -> MotorPoliticas:
    led = LedgerGobierno(ts=lambda: reloj)
    return MotorPoliticas(cargar_constitucion(), led)


def _doc_vivo() -> dict:
    return json.loads(RUTA_CONSTITUCION.read_text(encoding="utf-8"))


def _caso(**kw) -> CasoVeredicto:
    base: dict = {
        "seq": 0, "ts": RELOJ, "actor": "a-1", "rol": "staff", "accion": "crear",
        "recurso": "evento/1", "original_permitido": True,
        "original_motivo": "allow_por_P-003",
    }
    base.update(kw)
    return CasoVeredicto(**base)


# ── 1 · extracción de casos del ledger real ───────────────────────

class TestExtraccion:
    def test_extrae_solo_veredictos_politica(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        m.evaluar_y_registrar(actor="b", rol="socio", accion="leer", recurso="dashboard/x")
        casos = extraer_casos(m._ledger)
        assert len(casos) == 2
        assert {c.actor for c in casos} == {"a", "b"}

    def test_los_sellos_de_epoca_no_entran(self) -> None:
        m = _motor()
        for i in range(8):  # fuerza 1 época sellada
            m.evaluar_y_registrar(actor=f"a{i}", rol="staff", accion="leer",
                                  recurso=f"dashboard/{i}")
        evs = m._ledger.eventos()
        assert any(e.accion == "epoch_seal" for e in evs)
        assert all(c.accion != "epoch_seal" for c in extraer_casos(m._ledger))

    def test_el_caso_lleva_el_veredicto_original(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="s", rol="socio", accion="borrar", recurso="x/1")
        c = extraer_casos(m._ledger)[0]
        assert c.original_permitido is False
        assert c.original_motivo == "default_deny"

    def test_el_caso_lleva_el_gasto_sellado(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("staff", "2026-11-27", 40000, 10, 5.0)
        led = LedgerGobierno(ts=lambda: RELOJ)
        m = MotorPoliticas(cargar_constitucion(), led, cont)
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear",
                              recurso="evento/1",
                              costo_estimado={"tokens": 20, "llamadas": 1, "costo": 1.0})
        c = extraer_casos(led)[0]
        assert c.gasto_original == {
            "tokens": 40000.0, "llamadas": 10.0, "costo": 5.0}
        assert c.dia_gasto == "20261127"
        assert c.costo_previsto == 1.0

    def test_veredicto_sin_economia_no_inventa_gasto(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="socio", accion="borrar", recurso="x/1")
        c = extraer_casos(m._ledger)[0]
        assert c.gasto_original is None
        assert c.costo_previsto == 0.0


# ── 2 · replay contra constitución alternativa ────────────────────

class TestReplay:
    def test_replay_de_una_serie_completa(self) -> None:
        m = _motor()
        series = [
            ("a", "staff", "crear", "evento/1", None),
            ("b", "socio", "leer", "dashboard/x", None),
            ("c", "director", "actualizar", "miembro/2", None),
        ]
        for actor, rol, accion, recurso, costo in series:
            m.evaluar_y_registrar(actor=actor, rol=rol, accion=accion,
                                  recurso=recurso, costo_estimado=costo)
        bt = BacktesterGobierno(cargar_constitucion())
        rs = bt.correr(extraer_casos(m._ledger))
        assert len(rs) == 3
        assert all(not r.flip for r in rs)  # misma constitución = cero flips

    def test_constitucion_mas_permisiva_genera_flips_a_allow(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="s", rol="socio", accion="borrar", recurso="x/1")
        doc = _doc_vivo()
        doc["version"] = 3
        doc["politicas"].append({
            "id": "P-006", "descripcion": "contrafactual: socio puede borrar x",
            "efecto": "allow", "sujetos": {"roles": ["socio"]},
            "acciones": ["borrar"], "recursos": ["x/*"], "prioridad": 5,
        })
        bt = BacktesterGobierno.desde_documento(doc)
        rs = bt.correr(extraer_casos(m._ledger))
        assert len(rs) == 1 and rs[0].flip
        assert rs[0].contrafactual_permitido
        assert rs[0].contrafactual_motivo == "allow_por_P-006"

    def test_constitucion_mas_restrictiva_genera_flips_a_deny(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        doc = _doc_vivo()
        doc["version"] = 3
        doc["politicas"] = [p for p in doc["politicas"] if p["id"] != "P-003"]
        bt = BacktesterGobierno.desde_documento(doc)
        rs = bt.correr(extraer_casos(m._ledger))
        assert rs[0].flip and not rs[0].contrafactual_permitido
        assert rs[0].contrafactual_motivo == "default_deny"

    def test_replay_con_presupuesto_mas_bajo_flips_por_economia(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("staff", "2026-11-27", 90, 3, 1.0)
        led = LedgerGobierno(ts=lambda: RELOJ)
        m = MotorPoliticas(cargar_constitucion(), led, cont)
        # original: staff gastó 90 de 100000 → allow con costo 5.0
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear",
                              recurso="evento/1",
                              costo_estimado={"tokens": 10, "llamadas": 0, "costo": 5.0})
        doc = _doc_vivo()
        doc["version"] = 3
        doc["economia"]["presupuestos_por_rol"]["staff"] = {
            "tokens_dia": 500, "llamadas_dia": 5, "costo_dia": 4.0}
        bt = BacktesterGobierno.desde_documento(doc)
        rs = bt.correr(extraer_casos(led))
        # contrafactual: 1.0 (anclado) + 5.0 (previsto) > 4.0 → deny
        assert rs[0].flip and not rs[0].contrafactual_permitido
        assert rs[0].contrafactual_motivo == "presupuesto_agotado"

    def test_replay_con_presupuesto_mas_alto_no_flip(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("staff", "2026-11-27", 99990, 399, 19.99)
        led = LedgerGobierno(ts=lambda: RELOJ)
        m = MotorPoliticas(cargar_constitucion(), led, cont)
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear",
                              recurso="evento/1",
                              costo_estimado={"tokens": 10, "llamadas": 0, "costo": 0.0})
        doc = _doc_vivo()
        doc["version"] = 3
        doc["economia"]["presupuestos_por_rol"]["staff"] = {
            "tokens_dia": 200000, "llamadas_dia": 800, "costo_dia": 40.0}
        bt = BacktesterGobierno.desde_documento(doc)
        rs = bt.correr(extraer_casos(led))
        assert not rs[0].flip

    def test_fidelidad_de_ventana_ancla_al_gasto_sellado(self) -> None:
        """El contrafactual VE el gasto acumulado que el original vio.

        Sin fidelidad: el replay partiría de contabilidad 0 y aprobaría
        lo que la historia real ya había gastado — el flip fantasma del
        backtesting ingenuo. Con costo previsto > 0 la economía decide
        en ambos lados con la MISMA ventana.
        """
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("staff", "2026-11-27", 0, 0, 18.0)  # costo ya gastado
        led = LedgerGobierno(ts=lambda: RELOJ)
        m = MotorPoliticas(cargar_constitucion(), led, cont)
        # original: 18.0 gastados de 20.0 + 2.0 previsto = 20.0 → allow (límite justo)
        v = m.evaluar_y_registrar(actor="a", rol="staff", accion="crear",
                                  recurso="evento/1",
                                  costo_estimado={"tokens": 10, "llamadas": 0, "costo": 2.0})
        assert v.permitido and v.motivo == "allow_por_P-003"
        # contrafactual MISMA constitución: el replay debe reproducir el
        # allow SOLO si ve el gasto anclado (18.0); desde cero diría allow
        # también — el discriminador es el tope:
        doc = _doc_vivo()
        doc["version"] = 3
        doc["economia"]["presupuestos_por_rol"]["staff"] = {
            "tokens_dia": 100000, "llamadas_dia": 400, "costo_dia": 19.0}
        bt = BacktesterGobierno.desde_documento(doc)
        rs = bt.correr(extraer_casos(led))
        # 18.0 (anclado al sellado) + 2.0 (previsto) > 19.0 → deny.
        # Si el replay ignorara el gasto sellado: 0 + 2.0 ≤ 19.0 → allow.
        assert rs[0].flip and not rs[0].contrafactual_permitido
        assert rs[0].contrafactual_motivo == "presupuesto_agotado"

    def test_gasto_de_otro_dia_no_contamina(self) -> None:
        cont = ContabilidadEconomia.vacia()
        cont.registrar_consumo("staff", "2026-11-26", 100000, 400, 20.0)  # AYER
        led = LedgerGobierno(ts=lambda: DIA_SIG)
        m = MotorPoliticas(cargar_constitucion(), led, cont)
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear",
                              recurso="evento/1",
                              costo_estimado={"tokens": 100, "llamadas": 1, "costo": 0.1})
        bt = BacktesterGobierno(cargar_constitucion())
        rs = bt.correr(extraer_casos(led))
        assert rs[0].contrafactual_permitido  # ventana nueva: presupuesto fresco


# ── 3 · ledger espejo (sellado y verificable) ─────────────────────

class TestEspejo:
    def test_el_espejo_es_un_ledger_verificable(self) -> None:
        m = _motor()
        for i in range(3):
            m.evaluar_y_registrar(actor=f"a{i}", rol="staff", accion="leer",
                                  recurso=f"dashboard/{i}")
        bt = BacktesterGobierno(cargar_constitucion())
        bt.correr(extraer_casos(m._ledger))
        inf = bt.espejo.verificar_cadena()
        assert inf.ok
        assert inf.eventos == 3

    def test_el_ledger_real_no_se_toca(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        antes = m._ledger.a_json()
        bt = BacktesterGobierno(cargar_constitucion())
        bt.correr(extraer_casos(m._ledger))
        assert m._ledger.a_json() == antes

    def test_el_espejo_cita_la_constitucion_alternativa(self) -> None:
        doc = _doc_vivo()
        doc["version"] = 99
        bt = BacktesterGobierno.desde_documento(doc)
        c = _caso()
        bt.correr([c])
        ev = bt.espejo.eventos()[0]
        assert ev.detalles["constitucion_version"] == 99
        assert ev.detalles["constitucion_sha"] != cargar_constitucion().sha256

    def test_reloj_del_espejo_es_el_ts_del_original(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        bt = BacktesterGobierno(cargar_constitucion())
        bt.correr(extraer_casos(m._ledger))
        ev_real = next(e for e in m._ledger.eventos() if e.accion == "veredicto_politica")
        ev_espejo = bt.espejo.eventos()[0]
        assert ev_espejo.ts == ev_real.ts  # comparable evento a evento

    def test_determinismo_byte_a_byte_entre_corridas(self) -> None:
        m = _motor()
        for i in range(5):
            m.evaluar_y_registrar(actor=f"a{i}", rol="socio", accion="leer",
                                  recurso=f"dashboard/{i}",
                                  costo_estimado={"tokens": 10, "llamadas": 1, "costo": 0.01})
        casos = extraer_casos(m._ledger)
        textos = []
        for _ in range(2):
            bt = BacktesterGobierno(cargar_constitucion())
            bt.correr(casos)
            textos.append(bt.espejo.a_json())
        assert textos[0] == textos[1]

    def test_espejo_round_trip_desde_json(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        bt = BacktesterGobierno(cargar_constitucion())
        bt.correr(extraer_casos(m._ledger))
        texto = bt.espejo.a_json()
        led2 = LedgerGobierno.desde_json(texto)
        assert led2.verificar_cadena().ok


# ── 4 · informe ───────────────────────────────────────────────────

class TestInforme:
    def test_informe_de_serie_sin_flips(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        m.evaluar_y_registrar(actor="b", rol="socio", accion="leer", recurso="dashboard/x")
        bt = BacktesterGobierno(cargar_constitucion())
        inf = informe(bt.correr(extraer_casos(m._ledger)))
        assert inf.casos == 2
        assert inf.permitidos_original == 2
        assert inf.flips == 0
        assert "2 decisiones" in inf.resumen()

    def test_informe_agrupa_flips_por_motivo(self) -> None:
        m = _motor()
        m.evaluar_y_registrar(actor="a", rol="staff", accion="crear", recurso="evento/1")
        doc = _doc_vivo()
        doc["version"] = 3
        doc["politicas"] = [p for p in doc["politicas"] if p["id"] != "P-003"]
        bt = BacktesterGobierno.desde_documento(doc)
        inf = informe(bt.correr(extraer_casos(m._ledger)))
        assert inf.flips == 1 and inf.flips_a_deny == 1
        assert inf.motivos_flip == {"allow_por_P-003→default_deny": 1}

    def test_resultado_expone_flip(self) -> None:
        r = CasoVeredicto(
            seq=0, ts=RELOJ, actor="a", rol="socio", accion="borrar", recurso="x/1",
            original_permitido=False, original_motivo="default_deny")
        from club_mcp.gobierno.backtesting import ResultadoCaso
        rc = ResultadoCaso(caso=r, contrafactual_permitido=True,
                           contrafactual_motivo="allow_por_P-006")
        assert rc.flip and rc.original_motivo == "default_deny"


# ── 5 · validación de la constitución alternativa ─────────────────

class TestValidacionAlternativa:
    def test_constitucion_invalida_no_existe(self, tmp_path: Path) -> None:
        doc = _doc_vivo()
        doc["version"] = 3
        doc["economia"]["presupuestos_por_rol"]["staff"] = {
            "tokens_dia": 999999, "llamadas_dia": 800, "costo_dia": 40.0}  # > global
        with pytest.raises(ConstitucionInvalida, match="global"):
            BacktesterGobierno.desde_documento(doc)

    def test_default_allow_prohibido_tambien_en_contrafactual(self) -> None:
        doc = _doc_vivo()
        doc["version"] = 3
        doc["invariantes"]["default"] = "allow"
        with pytest.raises(ConstitucionInvalida, match="default"):
            BacktesterGobierno.desde_documento(doc)

    def test_sin_constitucion_alternativa_raise(self) -> None:
        with pytest.raises(ConstitucionInvalida):
            BacktesterGobierno(None)  # type: ignore[arg-type]

    def test_documento_vivo_editado_sin_bump_sigue_valido_pero_otro_sha(self) -> None:
        doc = _doc_vivo()
        doc["version"] = 3  # bump correcto
        bt = BacktesterGobierno.desde_documento(doc)
        assert bt.constitucion.version == 3
        assert bt.constitucion.sha256 != cargar_constitucion().sha256
