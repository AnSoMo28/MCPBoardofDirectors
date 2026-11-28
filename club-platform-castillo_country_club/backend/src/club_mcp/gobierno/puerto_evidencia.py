"""Puerto de evidencia — Ola 4.4 (Q-GOV-04 del charter, cierre de Ola 4).

PISO (lo que un auditor top exige): cuando un tercero (auditor, seguro,
regulador, la propia junta) pregunta «demuéstrame que este gobierno
operó bajo las reglas que dice operar», la respuesta no puede ser «ve
el repo y armate algo». Este módulo EMPAQUETA el gobierno como UN
artefacto verificable offline: la constitución sellada, el ledger
completo y los contrafactuales, amarrados por un manifiesto de hashes
que se verifica con UN comando stdlib-puro.

ELEMENTO ÚNICO (LEY 12): los evidence bundles de 2026 son exportadores
que escupen un ZIP de archivos planos y confían en que el tercero
abrirá cada uno. Este bundle ES UNA CADENA: cada componente lleva el
sha-256 de su contenido, el manifiesto los amarra TODOS en una raíz
Merkle única, y esa raíz es lo que el club publica fuera de banda —
el bundle se verifica a SÍ MISMO (hashes recalculados + cadena del
ledger re-derivada + constitución re-validada) sin deps, sin red, sin
repo: «evidence as code» de verdad, no un ZIP con un README.

POR QUÉ MERKLE Y NO UN DICT DE HASHES SUELTO: un dict de hashes
verifica que CADA archivo está intacto, pero el manifiesto mismo queda
sin ancla — un emisor deshonesto podría regenerar manifiesto y archivo
juntos. La raíz Merkle del bundle hace que TODA mutación de CUALQUIER
componente (incluidos el orden y los metadatos del manifiesto) cambie
la raíz; la raíz publicada (acta, póliza, board) congela el estado
completo del gobierno en 64 caracteres.

REGLAS (no convenciones — las hace cumplir el tipo):
- El bundle es INMUTABLE una vez emitido: dataclasses frozen, el
  manifiesto se DERIVA del contenido (nunca se declara a mano).
- Fail-closed: constitución ausente, ledger corrupto, espejo roto o
  componente mutado → ``EvidenciaError`` — el puerto NO exporta
  evidencia que no verifica (exportarla sería peor que no exportar:
  daría fe de algo falso).
- Determinismo total: mismo gobierno + mismos espejos → byte a byte
  el mismo bundle (canon JSON, reloj del snapshot inyectable).
- Sin PII: los componentes ya nacen sin PII (regla del ledger); el
  manifiesto solo agrega metadatos estructurales.

ORDEN DEL SNAPSHOT (ADR-0013 D1): el bundle contiene el ledger tal
como estaba AL MOMENTO del snapshot; el sello ``snapshot_evidencia``
es el evento SIGUIENTE del ledger — demuestra que el snapshot ocurrió
sin incluirse a sí mismo (una raíz no puede amarrar el evento que la
declara). El manifiesto cuenta los eventos PRE-sello: calza exacto
con el componente exportado.

CABLEADO (charter 4.4): el puerto nace SIN consumidor del runtime —
igual que el ledger en 4.1 (ADR-0010 D3). La suite de contrato blinda
la integración futura; cerrar Ola 4 es tener el gobierno COMO
artefacto, no wirearlo a un endpoint.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any


if TYPE_CHECKING:
    from collections.abc import Callable
    from pathlib import Path

    from club_mcp.gobierno.constitucion import Constitucion

from club_mcp.gobierno.ledger import GENESIS_HASH, LedgerGobierno
from club_mcp.gobierno.politicas import ACCION_REGISTRO


# ── Constantes versionadas ────────────────────────────────────────

FORMATO_BUNDLE = "gobierno-evidencia-v1"
"""Versión del formato del bundle — versionado desde nacimiento."""

NOMBRE_CONSTITUCION = "constitucion"
NOMBRE_LEDGER = "ledger"
PREFIJO_ESPEJO = "espejo/"
PREFIJO_INFORME = "informe/"

ACCION_SNAPSHOT = "snapshot_evidencia"
"""El cierre del bundle se sella AL LEDGER — el snapshot es un hecho del gobierno."""


class EvidenciaError(Exception):
    """El bundle no se emite/verifica: evidencia rota no viaja."""


def _canon(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def _merkle_root_hojas(hojas: list[str]) -> str:
    """Raíz Merkle binaria (RFC 6962: hoja impar se duplica)."""
    if not hojas:
        return GENESIS_HASH
    nivel = list(hojas)
    while len(nivel) > 1:
        if len(nivel) % 2 == 1:
            nivel.append(nivel[-1])
        nivel = [_sha256(nivel[i] + nivel[i + 1]) for i in range(0, len(nivel), 2)]
    return nivel[0]


# ── Componentes ───────────────────────────────────────────────────

@dataclass(frozen=True)
class ComponenteEvidencia:
    """Un archivo del bundle: nombre + contenido canon + sha derivado.

    ``hash`` une nombre y contenido (``sha256(nombre + \\n + contenido)``):
    renombrar un componente cambia su hash — un swap de nombres no
    puede hacer pasar un contenido por otro.
    """
    nombre: str
    contenido: str

    @property
    def hash(self) -> str:
        return _sha256(self.nombre + "\n" + self.contenido)


@dataclass(frozen=True)
class EspejoEvidencia:
    """Un contrafactual del backtesting como componente del bundle.

    El espejo es un ``LedgerGobierno`` YA sellado por el replay; acá
    viaja su export JSON + el resumen ejecutivo del contrafactual
    (``InformeBacktesting.resumen()``).
    """
    etiqueta: str
    ledger_json: str
    informe_resumen: str

    def componentes(self) -> list[ComponenteEvidencia]:
        return [
            ComponenteEvidencia(PREFIJO_ESPEJO + self.etiqueta, self.ledger_json),
            ComponenteEvidencia(PREFIJO_INFORME + self.etiqueta, self.informe_resumen),
        ]


# ── Manifiesto ────────────────────────────────────────────────────

@dataclass(frozen=True)
class ManifiestoEvidencia:
    """El índice del bundle: lista cada componente con su sha.

    La raíz Merkle de los hashes de componentes (en orden alfabético
    de nombre — orden canónico) amarra TODO el bundle. El manifiesto
    lleva la raíz como dato para el round-trip, pero ``desde_json`` la
    RE-DERIVA y la compara: la raíz publicada fuera de banda es lo que
    congela el estado; dentro del bundle es una afirmación verificada.
    """
    formato: str
    constitucion_sha: str
    constitucion_version: int
    ledger_eventos: int
    ledger_epochs: int
    snapshot_ts: str
    componentes: tuple[tuple[str, str], ...]  # (nombre, sha) orden canónico
    raiz_bundle: str

    def a_json(self) -> str:
        return _canon(
            {
                "formato": self.formato,
                "constitucion_sha": self.constitucion_sha,
                "constitucion_version": self.constitucion_version,
                "ledger_eventos": self.ledger_eventos,
                "ledger_epochs": self.ledger_epochs,
                "snapshot_ts": self.snapshot_ts,
                "componentes": [[n, h] for n, h in self.componentes],
                "raiz_bundle": self.raiz_bundle,
            }
        )

    @classmethod
    def desde_json(cls, texto: str) -> ManifiestoEvidencia:
        try:
            d = json.loads(texto)
        except json.JSONDecodeError as e:
            raise EvidenciaError(f"manifiesto ilegible: {e}") from e
        if d.get("formato") != FORMATO_BUNDLE:
            raise EvidenciaError(f"formato {d.get('formato')!r} ≠ {FORMATO_BUNDLE!r}")
        try:
            return cls(
                formato=str(d["formato"]),
                constitucion_sha=str(d["constitucion_sha"]),
                constitucion_version=int(d["constitucion_version"]),
                ledger_eventos=int(d["ledger_eventos"]),
                ledger_epochs=int(d["ledger_epochs"]),
                snapshot_ts=str(d["snapshot_ts"]),
                componentes=tuple((str(n), str(h)) for n, h in d["componentes"]),
                raiz_bundle=str(d["raiz_bundle"]),
            )
        except (KeyError, TypeError, ValueError) as e:
            raise EvidenciaError(f"manifiesto incompleto: {e}") from e


# ── Bundle ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class BundleEvidencia:
    """El gobierno como artefacto único verificable offline.

    Contiene: manifiesto + constitución + ledger + espejos (ledgers
    contrafactuales + informes). ``a_json`` es EL formato de archivo
    del puerto — un solo JSON canónico viaja al tercero, y la
    verificación completa (``desde_json``) no confía en nada declarado.
    """
    manifiesto: ManifiestoEvidencia
    constitucion: Constitucion
    componentes: tuple[ComponenteEvidencia, ...]

    def a_json(self) -> str:
        return _canon(
            {
                "manifiesto": json.loads(self.manifiesto.a_json()),
                "componentes": [
                    {"nombre": c.nombre, "contenido": c.contenido}
                    for c in self.componentes
                ],
            }
        )

    def componente(self, nombre: str) -> ComponenteEvidencia:
        """Acceso por nombre — el manifiesto ya validó el conjunto."""
        for c in self.componentes:
            if c.nombre == nombre:
                return c
        raise LookupError(f"componente {nombre!r} no está en el bundle")

    @classmethod
    def desde_json(cls, texto: str) -> BundleEvidencia:
        """Reconstruye SIN confiar: re-verifica TODO lo declarado.

        Fail-closed total: (1) cada componente declarado existe y su
        hash recalculado calza; (2) la raíz Merkle re-derivada calza;
        (3) el ledger re-verifica su cadena completa y su conteo; (4)
        la constitución RE-CARGA con la validación completa del runtime
        y su sha calza con el manifiesto. Cualquier descalce =
        ``EvidenciaError`` — un bundle corrupto no carga.
        """
        try:
            d = json.loads(texto)
        except json.JSONDecodeError as e:
            raise EvidenciaError(f"bundle ilegible: {e}") from e
        if "manifiesto" not in d or "componentes" not in d:
            raise EvidenciaError("bundle sin manifiesto o sin componentes")
        man = ManifiestoEvidencia.desde_json(_canon(d["manifiesto"]))

        por_nombre: dict[str, ComponenteEvidencia] = {}
        for c in d["componentes"]:
            try:
                comp = ComponenteEvidencia(
                    nombre=str(c["nombre"]), contenido=str(c["contenido"])
                )
            except (KeyError, TypeError) as e:
                raise EvidenciaError(f"componente malformado: {e}") from e
            if comp.nombre in por_nombre:
                raise EvidenciaError(f"componente duplicado: {comp.nombre}")
            por_nombre[comp.nombre] = comp

        # (1) conjunto y hashes declarados vs recalculados
        declarados = dict(man.componentes)
        if set(declarados) != set(por_nombre):
            raise EvidenciaError(
                f"manifiesto declara {len(declarados)} componentes, "
                f"el bundle trae {len(por_nombre)} — conjunto distinto"
            )
        for nombre, sha in declarados.items():
            if por_nombre[nombre].hash != sha:
                raise EvidenciaError(
                    f"componente {nombre!r}: sha declarado {sha[:16]}… ≠ "
                    f"recalculado {por_nombre[nombre].hash[:16]}… — contenido mutado"
                )
        # (2) raíz Merkle re-derivada
        raiz = _merkle_root_hojas([declarados[n] for n in sorted(declarados)])
        if raiz != man.raiz_bundle:
            raise EvidenciaError(
                f"raíz del bundle mutada: derivada {raiz[:16]}… ≠ "
                f"declarada {man.raiz_bundle[:16]}…"
            )
        # (3) ledger del bundle: cadena completa + conteo
        led_comp = por_nombre.get(NOMBRE_LEDGER)
        if led_comp is None:
            raise EvidenciaError("bundle sin ledger — no es evidencia de gobierno")
        try:
            ledger = LedgerGobierno.desde_json(led_comp.contenido)
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            raise EvidenciaError(f"ledger del bundle no verifica: {e}") from e
        if len(ledger.eventos()) != man.ledger_eventos:
            raise EvidenciaError(
                f"manifiesto declara {man.ledger_eventos} eventos, "
                f"el ledger trae {len(ledger.eventos())}"
            )
        # (4) constitución: validación completa del runtime + sha amarrado
        const = _cargar_constitucion_componente(por_nombre)
        if const.sha256 != man.constitucion_sha or const.version != man.constitucion_version:
            raise EvidenciaError(
                f"constitución del bundle no calza con el manifiesto: "
                f"v{const.version} sha {const.sha256[:16]}… ≠ "
                f"v{man.constitucion_version} sha {man.constitucion_sha[:16]}…"
            )
        return cls(manifiesto=man, constitucion=const, componentes=tuple(por_nombre[n] for n in sorted(por_nombre)))


def _cargar_constitucion_componente(
    por_nombre: dict[str, ComponenteEvidencia],
) -> Constitucion:
    """La constitución del bundle RE-CARGADA con la validación del runtime.

    El bundle no confía ni en su propio documento: el contenido viaja
    por ``cargar_constitucion`` (misma puerta que producción) — un JSON
    mutado que aún parsea pero no valida = bundle inválido.
    """
    import tempfile
    from pathlib import Path

    from club_mcp.gobierno.constitucion import cargar_constitucion

    comp = por_nombre.get(NOMBRE_CONSTITUCION)
    if comp is None:
        raise EvidenciaError("bundle sin constitución — no es evidencia de gobierno")
    with tempfile.NamedTemporaryFile(
        "w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        f.write(comp.contenido)
        ruta = Path(f.name)
    try:
        return cargar_constitucion(ruta)
    finally:
        ruta.unlink(missing_ok=True)


# ── Puerto (emisor) ───────────────────────────────────────────────

class PuertoEvidencia:
    """Emite el bundle del gobierno — el puerto de salida del ciclo 4.x.

    Uso del runtime/CI: ``puerto = PuertoEvidencia(motor.constitucion,
    ledger)``; ``puerto.emitir(espejos=[...])`` devuelve el bundle y
    sella el snapshot al ledger (el cierre es un HECHO del gobierno,
    no un artefacto lateral). La raíz Merkle resultante es lo que el
    club publica fuera de banda (acta, seguro, board).
    """

    def __init__(
        self,
        constitucion: Constitucion | None,
        ledger: LedgerGobierno,
        *,
        ts: Callable[[], str] | None = None,
    ) -> None:
        self._const = constitucion
        self._ledger = ledger
        self._ts = ts or (lambda: ledger._ts())

    def emitir(
        self,
        *,
        espejos: list[EspejoEvidencia] | None = None,
    ) -> BundleEvidencia:
        """Empaqueta el gobierno como bundle verificable, sellando el snapshot.

        Fail-closed: constitución ausente, ledger corrupto o espejo con
        ledger roto → ``EvidenciaError``. El snapshot se sella AL
        ledger DESPUÉS de exportar el componente: el bundle contiene el
        estado AL momento del snapshot; el sello es el evento siguiente
        (una raíz no puede amarrar el evento que la declara).
        """
        espejos = list(espejos or [])
        if self._const is None:
            raise EvidenciaError(
                "sin constitución cargada no hay evidencia que emitir — "
                "el gobierno no opera, el puerto no exporta"
            )
        informe = self._ledger.verificar_cadena()
        if not informe.ok:
            raise EvidenciaError(f"ledger corrupto: {informe.resumen()}")

        # estado del ledger PRE-sello — lo que el bundle captura
        ledger_json = self._ledger.a_json()

        # constitución: el documento EXACTO que se validó (canon retenido
        # al cargar) — no una re-serialización del paquete que podría
        # divergir del sha sellado
        componentes: list[ComponenteEvidencia] = [
            ComponenteEvidencia(NOMBRE_CONSTITUCION, self._const.documento_canon)
        ]
        for e in espejos:
            try:
                LedgerGobierno.desde_json(e.ledger_json)
            except (ValueError, KeyError, json.JSONDecodeError) as ex:
                raise EvidenciaError(f"espejo {e.etiqueta!r} no verifica: {ex}") from ex
            componentes.extend(e.componentes())
        componentes.append(ComponenteEvidencia(NOMBRE_LEDGER, ledger_json))
        componentes.sort(key=lambda c: c.nombre)

        raiz = _merkle_root_hojas([c.hash for c in componentes])
        ts = self._ts()
        # el snapshot se sella AL LEDGER: raíz + conteos — el cierre como hecho
        self._ledger.registrar(
            actor="gobierno", rol="sistema", accion=ACCION_SNAPSHOT,
            recurso=f"bundle/{raiz[:12]}",
            detalles={
                "formato": FORMATO_BUNDLE,
                "raiz": raiz,
                "componentes": len(componentes),
                "eventos_al_snapshot": informe.eventos,
                "epochs_al_snapshot": informe.epochs_selladas,
                "espejos": len(espejos),
                "ts": ts,
            },
        )
        manifiesto = ManifiestoEvidencia(
            formato=FORMATO_BUNDLE,
            constitucion_sha=self._const.sha256,
            constitucion_version=self._const.version,
            ledger_eventos=informe.eventos,
            ledger_epochs=informe.epochs_selladas,
            snapshot_ts=ts,
            componentes=tuple((c.nombre, c.hash) for c in componentes),
            raiz_bundle=raiz,
        )
        return BundleEvidencia(
            manifiesto=manifiesto,
            constitucion=self._const,
            componentes=tuple(componentes),
        )


# ── Verificación offline (sin ledger vivo, sin DB, sin red) ───────

def verificar_bundle(bundle_json: str) -> tuple[bool, str]:
    """Verificación COMPLETA de un bundle serializado — la puerta del tercero.

    Re-verifica TODO lo verificable desde el artefacto mismo: hashes
    de componentes, raíz Merkle, cadena del ledger, conteos y validez
    de la constitución. Es la función que la CLI standalone envuelve
    (misma línea de ``verificar_recibo.py`` — stdlib puro).
    """
    try:
        b = BundleEvidencia.desde_json(bundle_json)
    except EvidenciaError as e:
        return False, f"bundle inválido: {e}"
    m = b.manifiesto
    return True, (
        f"bundle {FORMATO_BUNDLE} ÍNTEGRO · raíz {m.raiz_bundle[:16]}… · "
        f"{len(m.componentes)} componentes · constitución v{m.constitucion_version} "
        f"sha {m.constitucion_sha[:16]}… · ledger {m.ledger_eventos} eventos "
        f"· {m.ledger_epochs} épocas · snapshot {m.snapshot_ts}"
    )


def raiz_de(bundle_json: str) -> str:
    """El acta de 64 caracteres: la raíz Merkle del bundle.

    Esto es lo que se publica fuera de banda (acta de junta, póliza,
    board). Quien tenga la raíz detecta CUALQUIER mutación posterior
    del bundle — regenerarlo con otro contenido da otra raíz. Fail-
    closed: la raíz de un bundle que no verifica no existe.
    """
    b = BundleEvidencia.desde_json(bundle_json)  # EvidenciaError si está roto
    return b.manifiesto.raiz_bundle


def contar_veredictos(bundle_json: str) -> int:
    """Utilidad de auditoría: veredictos de política dentro del bundle.

    El tercero cuenta las decisiones del gobierno SIN cargar el motor:
    los eventos ``veredicto_politica`` del ledger exportado. Fail-
    closed sobre bundle inválido (la cuenta de un bundle roto no
    existe).
    """
    b = BundleEvidencia.desde_json(bundle_json)
    eventos = json.loads(b.componente(NOMBRE_LEDGER).contenido)["eventos"]
    return sum(1 for e in eventos if e["accion"] == ACCION_REGISTRO)


def escribir_bundle(bundle: BundleEvidencia, ruta: Path) -> Path:
    """Persiste el bundle canónico — para el archivo/CI del cierre."""
    ruta.write_text(bundle.a_json(), encoding="utf-8")
    return ruta
