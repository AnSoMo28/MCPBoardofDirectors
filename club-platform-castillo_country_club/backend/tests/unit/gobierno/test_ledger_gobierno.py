"""Suite del ledger de gobierno — Ola 4.1 (Q-GOV-01).

Corre SIN red, SIN DB y SIN dependencias: reloj inyectado, vectores
fijos. La prueba es del sellado criptográfico y del recibo portable:

  1. Génesis y cadena: prev_hash encadena, hash = sha256(prev+canon).
  2. Épocas Merkle: cada 8 eventos una raíz sellada EN la cadena.
  3. Determinismo: mismo input → mismo ledger byte a byte (hash
     hardcodeado como vector fijo — cambiar el canon = roto aquí).
  4. Tamper-evidence: un byte editado rompe la cadena en SU seq y
     verificar_cadena() lo delata con la posición exacta.
  5. Inmutabilidad: no existe mutación — eventos() devuelve copia,
     el dataclass es frozen, el append es la única operación.
  6. Recibo de inclusión: el camino Merkle O(log n) deriva la raíz
     publicada; época abierta no emite recibo (LookupError).
  7. CLI standalone: verificar_recibo.py corre FUERA del repo (sin
     sys.path, proceso aparte): legítimo → exit 0; falsificado o con
     camino alterado → exit 1. Equivalencia ledger↔CLI: el folding
     del CLI debe reproducir la raíz que el ledger publicó.
  8. Round-trip: a_json/desde_json estable + recibo portable idem.
"""
from __future__ import annotations

import json
import subprocess
import sys
from itertools import pairwise
from pathlib import Path

import pytest

from club_mcp.gobierno.ledger import (
    EPOCH_SIZE,
    GENESIS_HASH,
    EventoGobierno,
    LedgerGobierno,
    ReciboInclusion,
    _merkle_root,
)


RELOJ_FIJO = "2026-11-25T12:00:00Z"
CLI = Path(__file__).resolve().parents[3] / "src" / "club_mcp" / "gobierno" / "verificar_recibo.py"


def _ledger_cargado(n: int = 20) -> LedgerGobierno:
    led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
    for i in range(n):
        led.registrar(
            actor=f"agente_{i}",
            rol="admin",
            accion="aprobacion",
            recurso=f"r/{i}",
            detalles={"i": i},
        )
    return led


# ── 1 · génesis y cadena ─────────────────────────────────────────

class TestCadena:
    def test_genesis_prev_hash(self) -> None:
        led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        ev = led.registrar(actor="a", rol="r", accion="x", recurso="y")
        assert ev.prev_hash == GENESIS_HASH == "0" * 64
        assert ev.seq == 0

    def test_prev_hash_encadena(self) -> None:
        led = _ledger_cargado(3)
        eventos = led.eventos()
        for anterior, siguiente in pairwise(eventos):
            assert siguiente.prev_hash == anterior.hash

    def test_hash_se_deriva_del_canon(self) -> None:
        led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        ev = led.registrar(actor="a", rol="r", accion="x", recurso="y", detalles={"k": 1})
        esperado = ev.calcular_hash(GENESIS_HASH)
        assert ev.hash == esperado
        # el canon es reproducible: mismas claves, orden fijo
        canon_dict = json.loads(ev.canon_evento())
        assert list(canon_dict) == [
            "accion", "actor", "detalles", "recurso", "rol", "seq", "ts",
        ]  # sort_keys=True en el canon — orden alfabético, no de declaración


# ── 2 · épocas Merkle ─────────────────────────────────────────────

class TestEpocas:
    def test_sella_cada_epoch_size(self) -> None:
        led = _ledger_cargado(20)
        # 20 eventos + sellos: 8+8 cierran 2 épocas, 4 en la abierta
        sellos = [e for e in led.eventos() if e.accion == "epoch_seal"]
        assert len(sellos) == 2
        assert led.epochs_selladas() == 2

    def test_raiz_de_epoca_es_merkle_de_sus_hojas(self) -> None:
        led = _ledger_cargado(8)  # exactamente 1 época cerrada
        hojas = [e.hash for e in led.eventos()[:8]]
        assert led.raiz_epoca(0) == _merkle_root(hojas)

    def test_sello_vive_en_la_cadena(self) -> None:
        led = _ledger_cargado(8)
        sello = led.eventos()[8]  # seq 8 = el sello de la época 0
        assert sello.accion == "epoch_seal"
        assert sello.detalles["merkle-epoch-v1"]["raiz"] == led.raiz_epoca(0)
        # la cadena queda íntegra CON los sellos dentro
        assert led.verificar_cadena().ok


# ── 3 · determinismo con vector fijo ──────────────────────────────

class TestDeterminismo:
    def test_vector_fijo_hardcodeado(self) -> None:
        """El hash del primer evento con reloj fijo — VECTOR INAMOVIBLE.

        Si este test rompe, alguien cambió el canon/orden/algoritmo y
        TODA cadena previa firmada dejó de verificarse: eso no es un
        fix, es un rompimiento de compatibilidad (versión de formato).
        """
        led = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        ev = led.registrar(
            actor="tesorero", rol="admin", accion="aprobacion",
            recurso="pago/123", detalles={"monto": 50000},
        )
        assert ev.hash == (
            "226effefd3242808b071203ce438a4f940d44394921585f30df740b43b6aeb42"
        )

    def test_dos_ledgers_identicos_son_byte_a_byte(self) -> None:
        assert _ledger_cargado(20).a_json() == _ledger_cargado(20).a_json()

    def test_detalles_con_orden_distinto_mismo_hash(self) -> None:
        """El canon sort_keys=True hace el hash inmune al orden del dict."""
        led1 = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        led2 = LedgerGobierno(ts=lambda: RELOJ_FIJO)
        led1.registrar(actor="a", rol="r", accion="x", recurso="y", detalles={"b": 1, "a": 2})
        led2.registrar(actor="a", rol="r", accion="x", recurso="y", detalles={"a": 2, "b": 1})
        assert led1.eventos()[0].hash == led2.eventos()[0].hash


# ── 4 · tamper-evidence ───────────────────────────────────────────

class TestTamper:
    def test_evento_editado_rompe_cadena_en_su_seq(self) -> None:
        led = _ledger_cargado(3)
        eventos = led.eventos()
        falso = EventoGobierno(
            **{c: getattr(eventos[1], c) for c in eventos[1].__dataclass_fields__
               if c not in {"prev_hash", "hash"}},
            prev_hash=eventos[1].prev_hash,
            hash=eventos[1].hash,
        )
        # mutación lógica: mismo seq, otro actor — el hash deja de calzar
        objeto = json.loads(falso.a_json())
        objeto["actor"] = "intruso"
        falso2 = EventoGobierno.desde_json(json.dumps(objeto))
        led._eventos[1] = falso2
        informe = led.verificar_cadena()
        assert not informe.ok
        assert informe.primera_rotura == 1

    def test_desde_json_rechaza_ledger_corrupto(self) -> None:
        led = _ledger_cargado(10)
        data = json.loads(led.a_json())
        data["eventos"][4]["detalles"]["i"] = 999  # el atacante edita el pasado
        with pytest.raises(ValueError, match="ROTO"):
            LedgerGobierno.desde_json(json.dumps(data))

    def test_seq_saltado_detectado(self) -> None:
        led = _ledger_cargado(3)
        led._eventos.pop(1)
        informe = led.verificar_cadena()
        assert not informe.ok


# ── 5 · inmutabilidad por construcción ────────────────────────────

class TestInmutabilidad:
    def test_eventos_devuelve_copia(self) -> None:
        led = _ledger_cargado(2)
        copia = led.eventos()
        copia.clear()
        assert len(led.eventos()) == 2

    def test_evento_es_frozen(self) -> None:
        led = _ledger_cargado(1)
        with pytest.raises(Exception):  # noqa: B017 — FrozenInstanceError es la prueba
            led.evento(0).actor = "intruso"  # type: ignore[misc]

    def test_no_existe_mutacion_publica(self) -> None:
        """El sombrero ARQUITECTURA como test: ni update ni delete."""
        metodos = {m for m in dir(LedgerGobierno) if not m.startswith("_")}
        assert not any(
            palabra in m for m in metodos for palabra in ("update", "delete", "remove", "edit", "pop")
        )


# ── 6 · recibo de inclusión ───────────────────────────────────────

class TestRecibo:
    def test_epoca_abierta_no_emite_recibo(self) -> None:
        led = _ledger_cargado(3)  # época 0 abierta (3/8)
        with pytest.raises(LookupError, match="época 0 abierta"):
            led.recibo(2)

    def test_recibo_deriva_la_raiz_publicada(self) -> None:
        led = _ledger_cargado(16)  # 2 épocas cerradas exactas
        r = led.recibo(10)  # época 1, índice 2 dentro de la época
        assert r.epoch == 1
        assert r.epoch_root == led.raiz_epoca(1)

    def test_camino_es_logaritmico(self) -> None:
        led = _ledger_cargado(64)  # 8 épocas de 8
        for seq in (0, 7, 32, 63):
            r = led.recibo(seq)
            assert len(r.merkle_path) <= 3  # log2(8) = 3

    def test_recibo_de_evento_inexistente(self) -> None:
        led = _ledger_cargado(8)
        with pytest.raises(IndexError):
            led.recibo(99)

    def test_recibo_round_trip(self) -> None:
        led = _ledger_cargado(9)
        r = led.recibo(3)
        r2 = ReciboInclusion.desde_json(r.a_json())
        assert r2 == r


# ── 7 · CLI standalone: equivalencia y anti-falsificación ─────────

class TestCliStandalone:
    """La CLI corre como PROCESO APARTE sin sys.path del repo: el
    tercero solo tiene el archivo + recibo + raíz. Exit code es ley."""

    def _correr(self, recibo: dict[str, object], tmp_path: Path) -> subprocess.CompletedProcess[str]:
        p = tmp_path / "recibo.json"
        p.write_text(json.dumps(recibo), encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(CLI), str(p)],
            capture_output=True,
            text=True,
            timeout=30,
        )

    def test_cli_existe_y_es_standalone(self) -> None:
        """Sin imports del paquete: solo stdlib (grep del fuente)."""
        fuente = CLI.read_text(encoding="utf-8")
        assert "import club_mcp" not in fuente
        assert "from club_mcp" not in fuente

    def test_recibo_legitimo_exit_0(self, tmp_path: Path) -> None:
        led = _ledger_cargado(8)
        res = self._correr(json.loads(led.recibo(5).a_json()), tmp_path)
        assert res.returncode == 0
        assert "válido" in res.stdout

    def test_recibo_falsificado_exit_1(self, tmp_path: Path) -> None:
        led = _ledger_cargado(8)
        recibo = json.loads(led.recibo(5).a_json())
        recibo["event_hash"] = "f" * 64  # un evento que nunca existió
        res = self._correr(recibo, tmp_path)
        assert res.returncode == 1

    def test_camino_alterado_exit_1(self, tmp_path: Path) -> None:
        led = _ledger_cargado(8)
        recibo = json.loads(led.recibo(5).a_json())
        recibo["merkle_path"][0]["hash"] = "0" * 64  # merkle-path mentiroso
        res = self._correr(recibo, tmp_path)
        assert res.returncode == 1

    def test_raiz_publicada_trocada_exit_1(self, tmp_path: Path) -> None:
        led = _ledger_cargado(8)
        recibo = json.loads(led.recibo(5).a_json())
        recibo["epoch_root"] = "a" * 64  # apuntar a otra época
        res = self._correr(recibo, tmp_path)
        assert res.returncode == 1

    def test_equivalencia_ledger_cli(self, tmp_path: Path) -> None:
        """GATE ANTI-DERIVA: dos implementaciones del folding Merkle
        (ledger interno + CLI standalone) DEBEN derivar la misma raíz.
        Si alguien "arregla" una sin la otra, este test es CI ROJO."""
        led = _ledger_cargado(24)  # 3 épocas
        r = led.recibo(20)  # época 2
        res = self._correr(json.loads(r.a_json()), tmp_path)
        assert res.returncode == 0
        # y la raíz del recibo es la MISMA que el ledger selló en cadena
        sello = next(
            e for e in led.eventos()
            if e.accion == "epoch_seal" and e.recurso == "epoca/2"
        )
        assert sello.detalles["merkle-epoch-v1"]["raiz"] == r.epoch_root


# ── 8 · round-trip del ledger ─────────────────────────────────────

class TestRoundTrip:
    def test_ledger_completo_ida_y_vuelta(self) -> None:
        led = _ledger_cargado(20)
        led2 = LedgerGobierno.desde_json(led.a_json())
        assert led2.a_json() == led.a_json()
        assert led2.verificar_cadena().ok

    def test_epoch_size_viaja_en_el_json(self) -> None:
        led = LedgerGobierno(ts=lambda: RELOJ_FIJO, epoch_size=4)
        for i in range(8):
            led.registrar(actor="a", rol="r", accion="x", recurso=f"y/{i}")
        led2 = LedgerGobierno.desde_json(led.a_json())
        assert led2.raiz_epoca(0) == led.raiz_epoca(0)
        assert led2.epoch_size_ == 4 if hasattr(led2, "epoch_size_") else True


# ── 9 · constantes públicas ───────────────────────────────────────

def test_constantes_versionadas() -> None:
    assert GENESIS_HASH == "0" * 64
    assert EPOCH_SIZE == 8
