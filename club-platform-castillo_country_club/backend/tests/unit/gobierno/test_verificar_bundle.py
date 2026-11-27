"""Suite de contrato — CLI standalone verificar_bundle (Ola 4.4 · Q-GOV-04).

Blinda el CIERRE del charter 4.4: «CLI de verificación offline ya
existente» — el tercero verifica el bundle SIN repo, SIN DB, SIN red,
con UN archivo stdlib puro. El gate central es la EQUIVALENCIA con la
verificación del módulo (mismo patrón que el gate ledger↔CLI de 4.1):
ambas puertas dicen lo mismo sobre el mismo artefacto, siempre.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from club_mcp.gobierno.constitucion import cargar_constitucion
from club_mcp.gobierno.cuatro_ojos import ProtocoloCuatroOjos
from club_mcp.gobierno.ledger import LedgerGobierno
from club_mcp.gobierno.politicas import MotorPoliticas
from club_mcp.gobierno.puerto_evidencia import (
    PuertoEvidencia,
    escribir_bundle,
)
from club_mcp.gobierno.puerto_evidencia import (
    verificar_bundle as verificar_modulo,
)


RUTA_CLI = (
    Path(__file__).resolve().parents[3] / "src" / "club_mcp" / "gobierno" / "verificar_bundle.py"
)
RELOJ = "2026-11-27T12:00:00Z"


def _bundle_con_trafico(tmp_path: Path) -> Path:
    """Gobierno vivo (veredictos + four-eyes + época sellada) → bundle en disco."""
    led = LedgerGobierno(ts=lambda: RELOJ, epoch_size=4)
    motor = MotorPoliticas(cargar_constitucion(), led)
    proto = ProtocoloCuatroOjos(motor, led)
    motor.evaluar_y_registrar(actor="a-1", rol="socio", accion="leer", recurso="dashboard/1")
    s = proto.solicitar(actor="a-9", rol="admin", accion="actualizar", recurso="gobierno/rol/7")
    proto.aprobar(s.id, aprobador="d-1", rol_aprobador="director")
    proto.aprobar(s.id, aprobador="a-2", rol_aprobador="admin")
    motor.evaluar_y_registrar(actor="a-3", rol="staff", accion="crear", recurso="evento/4")
    motor.evaluar_y_registrar(actor="a-4", rol="socio", accion="leer", recurso="reporte/9")
    bundle = PuertoEvidencia(cargar_constitucion(), led, ts=lambda: RELOJ).emitir()
    ruta = tmp_path / "bundle.json"
    escribir_bundle(bundle, ruta)
    return ruta


def _env_tercero() -> dict[str, str]:
    """Entorno de la MÁQUINA DEL TERCERO — portable Windows/Linux/mac.

    Reproduce la máquina del auditor: SIN ``PYTHONPATH`` ni variables
    del venv (no tiene el repo), con lo que el SO necesita para
    arrancar un proceso (``SystemRoot`` en Windows, ``PATH``…). La
    lección del run #90-anulado: un ``env`` reinventado a mano rompe
    ``git``/dlls en Windows y muere todo lo que spawnea la CLI.
    """
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.upper().startswith(("PYTHON", "VIRTUAL", "UV_")) and k != "PLASH"
    }
    env.pop("PYTHONPATH", None)
    env.pop("PYTHONHOME", None)
    return env


def _cli(ruta: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    """Ejecuta la CLI con python AISLADO — reproduce la máquina del tercero."""
    return subprocess.run(
        [sys.executable, str(RUTA_CLI), str(ruta), *extra],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
        check=False,
        env=_env_tercero(),  # SIN PYTHONPATH: sin repo
        cwd=str(Path.cwd()),
    )


# ── 1 · equivalencia CLI ↔ módulo (el gate central) ───────────────


class TestEquivalencia:
    def test_bundle_valido_ambas_puertas_verdes(self, tmp_path: Path) -> None:
        ruta = _bundle_con_trafico(tmp_path)
        ok_m, msg_m = verificar_modulo(ruta.read_text(encoding="utf-8"))
        r = _cli(ruta)
        assert ok_m, msg_m
        assert r.returncode == 0, r.stdout + r.stderr
        assert "ÍNTEGRO" in r.stdout

    def test_bundle_mutado_ambas_puertas_rojas(self, tmp_path: Path) -> None:
        ruta = _bundle_con_trafico(tmp_path)
        d = json.loads(ruta.read_text(encoding="utf-8"))
        d["componentes"][0]["contenido"] = d["componentes"][0]["contenido"].replace(
            "P-001", "P-XXX"
        )
        ruta_mutada = tmp_path / "mutado.json"
        ruta_mutada.write_text(json.dumps(d), encoding="utf-8")
        ok_m, _ = verificar_modulo(ruta_mutada.read_text(encoding="utf-8"))
        r = _cli(ruta_mutada)
        assert not ok_m
        assert r.returncode == 1
        assert "mutado" in r.stdout

    def test_ledger_mutado_cli_roja(self, tmp_path: Path) -> None:
        ruta = _bundle_con_trafico(tmp_path)
        d = json.loads(ruta.read_text(encoding="utf-8"))
        for c in d["componentes"]:
            if c["nombre"] == "ledger":
                c["contenido"] = c["contenido"].replace("dashboard/1", "dashboard/9")
        ruta_mutada = tmp_path / "ledger-mutado.json"
        ruta_mutada.write_text(json.dumps(d), encoding="utf-8")
        r = _cli(ruta_mutada)
        assert r.returncode == 1

    def test_manifiesto_recortado_cli_roja(self, tmp_path: Path) -> None:
        ruta = _bundle_con_trafico(tmp_path)
        d = json.loads(ruta.read_text(encoding="utf-8"))
        d["manifiesto"]["componentes"] = d["manifiesto"]["componentes"][:1]
        ruta_m = tmp_path / "recortado.json"
        ruta_m.write_text(json.dumps(d), encoding="utf-8")
        r = _cli(ruta_m)
        assert r.returncode == 1


# ── 2 · la CLI vive de verdad standalone ──────────────────────────


class TestStandalone:
    def test_la_fuente_no_importa_club_mcp(self) -> None:
        """La CLI NO importa club_mcp NI sys.path del repo — contrato estático.

        Válido en CUALQUIER SO (no spawnea nada): la máquina del tercero
        es aquella donde ``club_mcp`` no existe. Si la fuente contiene
        ``import club_mcp`` o ``sys.path``, la standalone está rota.
        """
        texto = RUTA_CLI.read_text(encoding="utf-8")
        assert "import club_mcp" not in texto
        assert "from club_mcp" not in texto
        assert "sys.path" not in texto

    def test_sin_club_mcp_en_el_entorno(self, tmp_path: Path) -> None:
        """La CLI verifica con el PYTHONPATH del tercero: sin repo, verde."""
        ruta = _bundle_con_trafico(tmp_path)
        r = _cli(ruta)
        assert r.returncode == 0, r.stderr
        assert "ModuleNotFoundError" not in r.stderr

    def test_uso_sin_args_exit_2(self) -> None:
        r = subprocess.run(
            [sys.executable, str(RUTA_CLI)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
            check=False,
            env=_env_tercero(),
            cwd=str(Path.cwd()),
        )
        assert r.returncode == 2
        assert "uso:" in r.stdout

    def test_bundle_ilegible_exit_1(self, tmp_path: Path) -> None:
        ruta = tmp_path / "roto.json"
        ruta.write_text("no soy json", encoding="utf-8")
        r = _cli(ruta)
        assert r.returncode == 1
        assert "ilegible" in r.stdout

    def test_consola_hostil_utf8_rc_0(self, tmp_path: Path) -> None:
        """PYTHONIOENCODING=ascii: un bundle VÁLIDO sigue siendo rc 0.

        Regresión del run #90-anulado (lección H-11): la CLI no puede
        morir con ``UnicodeEncodeError`` por la codificación de LA
        CONSOLA del auditor — la salida que importa es el exit code, y
        el texto llega con sustituciones, no con excepciones.
        """
        ruta = _bundle_con_trafico(tmp_path)
        env = _env_tercero() | {"PYTHONIOENCODING": "ascii"}
        r = subprocess.run(
            [sys.executable, str(RUTA_CLI), str(ruta)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
            check=False,
            env=env,
            cwd=str(Path.cwd()),
        )
        assert r.returncode == 0, r.stdout + r.stderr
        assert "UnicodeEncodeError" not in r.stderr


# ── 3 · anclaje contra la raíz publicada fuera de banda ───────────


class TestRaizPublicada:
    def test_raiz_publicada_calza(self, tmp_path: Path) -> None:
        ruta = _bundle_con_trafico(tmp_path)
        raiz = json.loads(ruta.read_text(encoding="utf-8"))["manifiesto"]["raiz_bundle"]
        acta = tmp_path / "acta.txt"
        acta.write_text(raiz, encoding="utf-8")
        r = _cli(ruta, "--raiz", str(acta))
        assert r.returncode == 0, r.stdout
        assert "raíz == publicada" in r.stdout

    def test_raiz_publicada_descalza(self, tmp_path: Path) -> None:
        ruta = _bundle_con_trafico(tmp_path)
        acta = tmp_path / "acta.txt"
        acta.write_text("f" * 64, encoding="utf-8")
        r = _cli(ruta, "--raiz", str(acta))
        assert r.returncode == 1
        assert "RAÍZ NO CALZA" in r.stdout


# ── 4 · contrato del módulo INTACTO ───────────────────────────────


class TestContratoIntacto:
    def test_la_cli_y_el_modulo_comparten_formato_y_nombres(self) -> None:
        """La CLI duplica constantes a propósito (standalone) — el test las amarra."""
        texto = RUTA_CLI.read_text(encoding="utf-8")
        from club_mcp.gobierno import puerto_evidencia as pe

        assert f'"{pe.FORMATO_BUNDLE}"' in texto
        assert f'"{pe.NOMBRE_LEDGER}"' in texto
        assert f'"{pe.NOMBRE_CONSTITUCION}"' in texto

    def test_epoca_abierta_valida_con_nota(self, tmp_path: Path) -> None:
        """Época abierta = cadena ÍNTEGRA + NOTA — misma respuesta que el módulo.

        La cadena lineal ya sella esos eventos; solo carecen de recibo
        Merkle hasta el próximo sello. La CLI no puede reprobar lo que
        el módulo aprueba: son la misma verdad dos veces contada.
        """
        led = LedgerGobierno(ts=lambda: RELOJ)  # epoch_size 8: queda abierta
        motor = MotorPoliticas(cargar_constitucion(), led)
        motor.evaluar_y_registrar(actor="a-1", rol="socio", accion="leer", recurso="dashboard/1")
        bundle = PuertoEvidencia(cargar_constitucion(), led, ts=lambda: RELOJ).emitir()
        ruta = tmp_path / "abierto.json"
        escribir_bundle(bundle, ruta)
        r = _cli(ruta)
        assert r.returncode == 0, r.stdout
        assert "NOTA: época 0 abierta" in r.stdout
        ok_m, msg_m = verificar_modulo(ruta.read_text(encoding="utf-8"))
        assert ok_m, msg_m  # equivalencia: ambas puertas verdes
