"""Constitución EJECUTABLE — Ola 4.2 (Q-GOV-02).

El documento de gobierno y el programa son UNA sola cosa: este módulo
carga ``constitucion.json``, lo valida ESTRUCTURALMENTE COMPLETO (una
constitución con un campo inválido no carga — falla al inicio, no en
plena sesión) y sella su hash sha-256 sobre canon determinista.

La disciplina es la del prompt_registry (Ola 3.3, Q-LLM-03): editar el
documento sin bump de versión cambia el hash → el pin del CI (y todo
veredicto que cite ``constitucion_sha``) deja de calzar → ROJO. El
próximo veredicto de política cita el hash de la constitución BAJO LA
CUAL se tomó: gobernanza reproducible contra el documento exacto.

Qué hace ÚNICO a esta pieza (LEY 12): las constituciones de IA de 2026
son PDFs de principios; esta es un EJECUTABLE versionado cuyo hash viaja
soldado a cada veredicto del ledger — «bajo qué reglas se decidió» deja
de ser una cita y pasa a ser un dato verificable.

REGLAS (no convenciones):
- El hash es sobre el canon del documento NORMALIZADO (claves
  ordenadas): reformatar el archivo no cambia el hash; cambiar un valor
  sí. Determinismo byte a byte entre runs.
- Validación COMPLETA al cargar: ids únicos, prioridades únicas,
  efectos/acciones/roles conocidos, economía coherente (por-rol nunca
  supera al global). Una constitución a medias no existe en memoria.
- La constitución es INMUTABLE en runtime: se carga una vez, frozen
  dataclass; cambiar de constitución = cargar otra instancia con otra
  versión (y el veredicto lo cita).
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ── Constantes versionadas ────────────────────────────────────────

FORMATO_CONSTITUCION = "constitucion-ejecutable-v1"
EFECTOS_VALIDOS = frozenset({"allow", "deny"})
ACCIONES_VALIDAS = frozenset({"leer", "crear", "actualizar", "borrar", "ejecutar"})
ROLES_VALIDOS = frozenset({"admin", "director", "staff", "socio"})
CLAVES_ECONOMIA = frozenset({"tokens_dia", "llamadas_dia", "costo_dia"})
DEFAULT_EFECTO = "deny"

RUTA_CONSTITUCION = Path(__file__).resolve().parent / "constitucion.json"


class ConstitucionInvalida(Exception):
    """La constitución no carga: fallar AL INICIO, no en plena sesión."""


def _canon(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def _normalizar(doc: dict[str, Any]) -> dict[str, Any]:
    """Documento tal cual se hashea: mismas claves, orden canónico."""
    return json.loads(_canon(doc))


# ── Modelo (frozen: inmutable en runtime) ─────────────────────────

@dataclass(frozen=True)
class Politica:
    """Una regla de la constitución — evaluada por el motor (politicas.py)."""
    id: str
    efecto: str
    descripcion: str = ""
    roles: tuple[str, ...] = ()
    acciones: tuple[str, ...] = ()
    recursos: tuple[str, ...] = ()
    excluye: tuple[str, ...] = ()
    condicion: dict[str, Any] = field(default_factory=dict)
    prioridad: int = 0


@dataclass(frozen=True)
class Economia:
    """Presupuestos de la flota: gobernar agentes es gobernar su economía."""
    moneda: str
    global_: dict[str, int | float]
    por_rol: dict[str, dict[str, int | float]]
    exceso: str = "deny"

    def presupuesto_rol(self, rol: str) -> dict[str, int | float]:
        return dict(self.por_rol.get(rol, self.global_))


@dataclass(frozen=True)
class Constitucion:
    """Documento de gobierno cargado, validado y sellado."""
    version: int
    politicas: tuple[Politica, ...]
    economia: Economia
    sha256: str
    default: str

    def politica_por_id(self, pid: str) -> Politica | None:
        return next((p for p in self.politicas if p.id == pid), None)


# ── Carga + validación estructural COMPLETA ───────────────────────

def cargar_constitucion(
    ruta: Path | str = RUTA_CONSTITUCION,
) -> Constitucion:
    """Carga, valida TODO y sella. ``ConstitucionInvalida`` si algo falla.

    Cada validación existe porque una constitución a medias es peor que
    ninguna: da la impresión de gobierno sin ejercerlo (sombrero
    AUDITORÍA: efecto privilegiado sin trazabilidad real).
    """
    ruta = Path(ruta)
    try:
        doc = json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise ConstitucionInvalida(f"constitución ilegible ({ruta}): {e}") from e

    if doc.get("formato") != FORMATO_CONSTITUCION:
        raise ConstitucionInvalida(
            f"formato {doc.get('formato')!r} ≠ {FORMATO_CONSTITUCION!r} — "
            "versión de documento no soportada por este motor"
        )

    version = doc.get("version")
    if not isinstance(version, int) or version < 1:
        raise ConstitucionInvalida(f"version {version!r} debe ser entero ≥ 1")

    # ── políticas: validación campo por campo ──
    politicas_raw = doc.get("politicas")
    if not isinstance(politicas_raw, list) or not politicas_raw:
        raise ConstitucionInvalida("sección 'politicas' vacía o ausente")

    ids: set[str] = set()
    prioridades: set[int] = set()
    politicas: list[Politica] = []
    for i, p in enumerate(politicas_raw):
        pid = p.get("id")
        if not isinstance(pid, str) or not pid:
            raise ConstitucionInvalida(f"política[{i}] sin id")
        if pid in ids:
            raise ConstitucionInvalida(f"id duplicado: {pid}")
        ids.add(pid)

        efecto = p.get("efecto")
        if efecto not in EFECTOS_VALIDOS:
            raise ConstitucionInvalida(f"{pid}: efecto {efecto!r} ∉ {sorted(EFECTOS_VALIDOS)}")

        prioridad = p.get("prioridad", 0)
        if not isinstance(prioridad, int) or prioridad in prioridades:
            raise ConstitucionInvalida(f"{pid}: prioridad {prioridad!r} inválida o duplicada")
        prioridades.add(prioridad)

        for campo, valido in (
            ("acciones", ACCIONES_VALIDAS),
            ("roles", ROLES_VALIDOS),
        ):
            fuente = p.get("sujetos", {}).get("roles", []) if campo == "roles" else p.get(campo, [])
            for v in fuente:
                if campo == "acciones" and v != "*" and v not in valido:
                    raise ConstitucionInvalida(f"{pid}: acción {v!r} desconocida")
                if campo == "roles" and v not in valido:
                    raise ConstitucionInvalida(f"{pid}: rol {v!r} ∉ {sorted(ROLES_VALIDOS)}")

        politicas.append(Politica(
            id=pid,
            efecto=str(efecto),
            descripcion=str(p.get("descripcion", "")),
            roles=tuple(p.get("sujetos", {}).get("roles", [])),
            acciones=tuple(p.get("acciones", [])),
            recursos=tuple(p.get("recursos", [])),
            excluye=tuple(p.get("excluye", [])),
            condicion=dict(p.get("condicion", {})),
            prioridad=prioridad,
        ))

    # ── economía: coherencia por-rol ≤ global ──
    eco_raw = doc.get("economia")
    if not isinstance(eco_raw, dict):
        raise ConstitucionInvalida("sección 'economia' ausente")
    glob = eco_raw.get("presupuestos_globales", {})
    for k in glob:
        if k not in CLAVES_ECONOMIA:
            raise ConstitucionInvalida(f"economía global: clave {k!r} desconocida")
    por_rol = eco_raw.get("presupuestos_por_rol", {})
    for rol, lims in por_rol.items():
        if rol not in ROLES_VALIDOS:
            raise ConstitucionInvalida(f"economía por rol: rol {rol!r} ∉ {sorted(ROLES_VALIDOS)}")
        for k, v in lims.items():
            if k not in CLAVES_ECONOMIA:
                raise ConstitucionInvalida(f"economía[{rol}]: clave {k!r} desconocida")
            if k in glob and v > glob[k]:
                raise ConstitucionInvalida(
                    f"economía[{rol}].{k}={v} > global {glob[k]} — "
                    "un rol no puede presupuestar más que la flota entera"
                )
    exceso = eco_raw.get("exceso", "deny")
    if exceso not in EFECTOS_VALIDOS:
        raise ConstitucionInvalida(f"economía.exceso {exceso!r} inválido")

    default = doc.get("invariantes", {}).get("default", DEFAULT_EFECTO)
    if default != DEFAULT_EFECTO:
        raise ConstitucionInvalida(
            f"invariantes.default={default!r} — la constitución NO puede "
            "abrir el default (fail-closed por diseño)"
        )

    # ── sellado: hash sobre canon normalizado ──
    sha = _sha256(_canon(_normalizar(doc)))
    return Constitucion(
        version=version,
        politicas=tuple(politicas),
        economia=Economia(
            moneda=str(eco_raw.get("moneda", "creditos")),
            global_=dict(glob),
            por_rol={r: dict(l) for r, l in por_rol.items()},
            exceso=str(exceso),
        ),
        sha256=sha,
        default=str(default),
    )


def verificar_pin_constitucion(
    sha_esperado: str,
    ruta: Path | str = RUTA_CONSTITUCION,
) -> bool:
    """Gate del CI: el pin declarado calza con el documento vivo.

    El análogo exacto del golden del prompt_registry: editar
    constitucion.json sin actualizar el pin = CI ROJO con diff legible.
    """
    try:
        return cargar_constitucion(ruta).sha256 == sha_esperado
    except ConstitucionInvalida:
        return False
