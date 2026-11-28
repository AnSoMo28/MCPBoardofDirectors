"""Ledger de gobierno — Ola 4.1 (Q-GOV-01).

Registro append-only de TODA acción privilegiada del backend, con dos
capas de sellado criptográfico (sha-256, JSON canónico):

1. **Cadena lineal** (mismo diseño que el ledger HITL de Ola 2.3,
   ADR-0007): cada evento lleva ``prev_hash`` y ``hash = sha256(
   prev_hash + canon(event))``. Editar una fila rompe TODAS las
   siguientes — tamper-evidence end-to-end verificable con
   ``verificar_cadena()``.

2. **Épocas Merkle** (RFC 6962, estilo certificate-transparency): cada
   ``EPOCH_SIZE`` eventos se sella un árbol Merkle binario y su raíz
   queda TRABADA en la cadena como evento tipo ``epoch_seal``. Con la
   raíz + un recibo de inclusión, un TERCERO verifica que UN evento
   estuvo en el ledger sin ver el ledger completo: O(log n) hashes,
   sin repo, sin DB, sin red (``verificar_recibo.py``).

Por qué las dos capas y no solo la cadena lineal: la cadena demostrar
que NADA mutó requiere las N filas. El recibo Merkle demuestra que UN
evento estuvo ahí con O(log n) hashes publicables. Para un club con
socios, auditores externos y seguros, la diferencia es el tamaño del
artefacto de evidencia: 32 bytes de raíz + camino logarítmico vs el
ledger entero.

REGLAS (no convenciones — las hace cumplir el tipo):
- Append-only: el ledger no expone mutación ni borrado de eventos. Los
  eventos son `` frozen dataclasses``; la lista interna nunca se
  entrega por referencia.
- Determinismo total: reloj INYECTADO (callable ``ts``), orden de
  claves fijo en el canon. Dos ejecuciones con las mismas entradas
  producen byte a byte el mismo ledger.
- Sin PII en ``detalles``: referencias por ID, mínimo necesario
  (regla de casa §1.4 — el sombrero SEGURIDAD lo caza en revisión).

Cableado: en 4.1 el ledger nace SIN consumidores del runtime — por
diseño (ADR-0010). 4.2 (motor de políticas) lo conecta a las acciones
reales en el punto de aplicación, y TODO veredicto de política se
escribe aquí. La suite de contrato de este módulo es la que blinda esa
futura integración.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any


if TYPE_CHECKING:
    from collections.abc import Callable, Sequence


# ── Constantes del sellado ────────────────────────────────────────

GENESIS_HASH = "0" * 64
"""prev_hash del primer evento —/documentado, testeado, nunca cambia."""

EPOCH_SIZE = 8
"""Eventos por época Merkle. 8 mantiene el camino de recibo ≤ 3 hashes
en tests y demos; producción puede sellar más grueso (constante por
configuración, no por edición del algoritmo)."""

# Canon de campos en ORDEN FIJO — el hash depende del orden: nunca
# reordenar (rompería TODA cadena existente); solo añadir al final con
# versión de formato.
CAMPOS_EVENTO: tuple[str, ...] = (
    "seq",
    "ts",
    "actor",
    "rol",
    "accion",
    "recurso",
    "detalles",
)

EPOCH_GENESIS_SEAL = "merkle-epoch-v1"
"""Etiqueta del payload de sellado de época — versionada desde nacimiento."""


def canon(obj: Any) -> str:
    """Serialización determinista: claves ordenadas, separadores compactos."""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def utc_now() -> str:
    """Reloj por defecto — ISO-8601 UTC con Z. Inyectable en tests."""
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


# ── Evento ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class EventoGobierno:
    """Una acción privilegiada, inmutable y sellada.

    ``hash`` se computa en el append (no en ``__post_init__``) para que
    el dataclass sea construible en deserialización sin falsear la
    cadena: un evento desde ``desde_json`` recalcula y SE COMPARA, no
    se confía.
    """

    seq: int
    ts: str
    actor: str
    rol: str
    accion: str
    recurso: str
    detalles: dict[str, Any] = field(default_factory=dict)
    prev_hash: str = GENESIS_HASH
    hash: str = ""

    def canon_evento(self) -> str:
        """Payload determinista del evento (sin hash/prev_hash — sellan, no son sellados)."""
        return canon({c: getattr(self, c) for c in CAMPOS_EVENTO})

    def calcular_hash(self, prev_hash: str) -> str:
        return _sha256(prev_hash + self.canon_evento())

    def a_json(self) -> str:
        """Round-trip estable: 7 campos + prev_hash + hash, orden fijo."""
        return canon(
            {c: getattr(self, c) for c in CAMPOS_EVENTO}
            | {"prev_hash": self.prev_hash, "hash": self.hash}
        )

    @classmethod
    def desde_json(cls, texto: str) -> EventoGobierno:
        d = json.loads(texto)
        return cls(
            seq=int(d["seq"]),
            ts=str(d["ts"]),
            actor=str(d["actor"]),
            rol=str(d["rol"]),
            accion=str(d["accion"]),
            recurso=str(d["recurso"]),
            detalles=dict(d.get("detalles", {})),
            prev_hash=str(d["prev_hash"]),
            hash=str(d["hash"]),
        )


# ── Merkle por época (RFC 6962: duplicar último si impar) ─────────

def _merkle_root(hojas: Sequence[str]) -> str:
    """Raíz Merkle de hojas hex. Árbol binario completo, hoja impar se duplica (RFC 6962 §2.1)."""
    if not hojas:
        return GENESIS_HASH
    nivel = list(hojas)
    while len(nivel) > 1:
        if len(nivel) % 2 == 1:
            nivel.append(nivel[-1])
        nivel = [_sha256(nivel[i] + nivel[i + 1]) for i in range(0, len(nivel), 2)]
    return nivel[0]


def _merkle_camino(hojas: Sequence[str], indice: int) -> list[dict[str, str]]:
    """Camino de inclusión O(log n): [{hash, lado}] desde la hoja a la raíz."""
    if indice < 0 or indice >= len(hojas):
        raise IndexError(f"índice {indice} fuera de rango ({len(hojas)} hojas)")
    nivel = list(hojas)
    camino: list[dict[str, str]] = []
    i = indice
    while len(nivel) > 1:
        if len(nivel) % 2 == 1:
            nivel.append(nivel[-1])
        if i % 2 == 0:
            camino.append({"hash": nivel[i + 1] if i + 1 < len(nivel) else nivel[i], "lado": "d"})
        else:
            camino.append({"hash": nivel[i - 1], "lado": "i"})
        nivel = [_sha256(nivel[j] + nivel[j + 1]) for j in range(0, len(nivel), 2)]
        i //= 2
    return camino


# ── Recibo ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ReciboInclusion:
    """Evidencia portable de que UN evento estuvo en una época sellada.

    Este objeto ES el artefacto que viaja al tercero: la CLI standalone
    ``verificar_recibo.py`` lo consume junto con la raíz publicada.
    """

    epoch: int
    seq: int
    event_hash: str
    merkle_path: tuple[dict[str, str], ...]
    epoch_root: str

    def a_json(self) -> str:
        return canon(
            {
                "epoch": self.epoch,
                "seq": self.seq,
                "event_hash": self.event_hash,
                "merkle_path": [dict(p) for p in self.merkle_path],
                "epoch_root": self.epoch_root,
            }
        )

    @classmethod
    def desde_json(cls, texto: str) -> ReciboInclusion:
        d = json.loads(texto)
        return cls(
            epoch=int(d["epoch"]),
            seq=int(d["seq"]),
            event_hash=str(d["event_hash"]),
            merkle_path=tuple(dict(p) for p in d["merkle_path"]),
            epoch_root=str(d["epoch_root"]),
        )


# ── Informe de verificación ───────────────────────────────────────

@dataclass(frozen=True)
class InformeVerificacion:
    """Resultado determinista de verificar la cadena completa."""

    ok: bool
    eventos: int
    epochs_selladas: int
    primera_rotura: int | None

    def resumen(self) -> str:
        estado = "ÍNTEGRA" if self.ok else f"ROTO @ seq={self.primera_rotura}"
        return (
            f"cadena {estado} · {self.eventos} eventos · "
            f"{self.epochs_selladas} épocas selladas"
        )


# ── Ledger ────────────────────────────────────────────────────────

class LedgerGobierno:
    """Append-only con doble sellado: cadena lineal + épocas Merkle.

    Inmutabilidad POR CONSTRUCCIÓN: no existen métodos de update/delete
    de eventos; ``eventos`` devuelve copia; los eventos son frozen
    dataclasses. La única mutación posible es ``registrar()`` — append.
    """

    def __init__(
        self,
        ts: Callable[[], str] = utc_now,
        epoch_size: int = EPOCH_SIZE,
    ) -> None:
        self._ts = ts
        self._epoch_size = max(2, epoch_size)
        self._eventos: list[EventoGobierno] = []
        self._raices_epocas: dict[int, str] = {}
        # Hojas Merkle de la época CORRIENTE (hashes de eventos, no seqs)
        self._hojas_epoca: list[str] = []

    # ── append (la única mutación) ────────────────────────────────

    def registrar(
        self,
        *,
        actor: str,
        rol: str,
        accion: str,
        recurso: str,
        detalles: dict[str, Any] | None = None,
    ) -> EventoGobierno:
        """Añade un evento y (si cierra época) sella su raíz en la cadena."""
        prev = self._eventos[-1].hash if self._eventos else GENESIS_HASH
        base = EventoGobierno(
            seq=len(self._eventos),
            ts=self._ts(),
            actor=actor,
            rol=rol,
            accion=accion,
            recurso=recurso,
            detalles=detalles or {},
            prev_hash=prev,
        )
        ev = replace(base, hash=base.calcular_hash(prev))
        self._eventos.append(ev)
        self._hojas_epoca.append(ev.hash)

        if len(self._hojas_epoca) == self._epoch_size:
            self._sellar_epoca()
        return ev

    def _sellar_epoca(self) -> EventoGobierno:
        """Sella la época corriente: raíz Merkle trabada en la cadena."""
        epoch = len(self._raices_epocas)
        raiz = _merkle_root(self._hojas_epoca)
        self._raices_epocas[epoch] = raiz
        sello = self.registrar(
            actor="gobierno",
            rol="sistema",
            accion="epoch_seal",
            recurso=f"epoca/{epoch}",
            detalles={EPOCH_GENESIS_SEAL: {"raiz": raiz, "hojas": len(self._hojas_epoca)}},
        )
        self._hojas_epoca = []
        return sello

    # ── lectura ───────────────────────────────────────────────────

    def eventos(self) -> list[EventoGobierno]:
        """Copia defensiva — la lista interna nunca sale por referencia."""
        return list(self._eventos)

    def evento(self, seq: int) -> EventoGobierno:
        return self._eventos[seq]

    def raiz_epoca(self, epoch: int) -> str:
        return self._raices_epocas[epoch]

    def epochs_selladas(self) -> int:
        return len(self._raices_epocas)

    # ── verificación determinista (sin red, sin DB) ───────────────

    def verificar_cadena(self) -> InformeVerificacion:
        """Re-deriva TODA la cadena: prev_hash, hash y sellos de época."""
        prev = GENESIS_HASH
        for i, ev in enumerate(self._eventos):
            if ev.seq != i:
                return InformeVerificacion(False, len(self._eventos), len(self._raices_epocas), i)
            if ev.prev_hash != prev or ev.hash != ev.calcular_hash(prev):
                return InformeVerificacion(False, len(self._eventos), len(self._raices_epocas), i)
            prev = ev.hash
        # Los sellos de época deben haber dejado épocas consistentes
        ok = len(self._raices_epocas) == sum(
            1 for e in self._eventos if e.accion == "epoch_seal"
        )
        return InformeVerificacion(
            ok, len(self._eventos), len(self._raices_epocas), None if ok else -1
        )

    # ── recibo de inclusión ───────────────────────────────────────

    def recibo(self, seq: int) -> ReciboInclusion:
        """Recibo portable del evento ``seq`` contra su época sellada.

        La época NO es ``seq // epoch_size``: los sellos también ocupan
        seq y desplazan la aritmética. La localización es por CONTEO de
        eventos no-sello — la misma contabilidad que cierra épocas.

        Requiere que la época del evento esté CERRADA (sellada): un
        recibo contra época abierta no es evidencia — la raíz todavía
        puede mutar. ``LookupError`` si la época aún vive.
        """
        ev = self._eventos[seq]
        # eventos no-sello con índice lineal dentro de SU época
        no_sello: list[int] = [i for i, e in enumerate(self._eventos) if e.accion != "epoch_seal"]
        epoch = no_sello.index(seq) // self._epoch_size
        idx_en_epoca = no_sello.index(seq) % self._epoch_size
        if epoch not in self._raices_epocas:
            restantes = self._epoch_size - len(self._hojas_epoca)
            raise LookupError(
                f"época {epoch} abierta (faltan {restantes} eventos para sellar) — "
                f"sellá antes de emitir recibo de seq={seq}"
            )
        inicio_epoca = epoch * self._epoch_size
        hojas = [self._eventos[no_sello[i]].hash for i in range(inicio_epoca, inicio_epoca + self._epoch_size)]
        return ReciboInclusion(
            epoch=epoch,
            seq=seq,
            event_hash=ev.hash,
            merkle_path=tuple(_merkle_camino(hojas, idx_en_epoca)),
            epoch_root=self._raices_epocas[epoch],
        )

    # ── exportación ───────────────────────────────────────────────

    def a_json(self) -> str:
        """Ledger completo determinista — para archivo/exporte 4.4."""
        return canon(
            {
                "eventos": [json.loads(e.a_json()) for e in self._eventos],
                "raices_epocas": {str(k): v for k, v in sorted(self._raices_epocas.items())},
                "epoch_size": self._epoch_size,
            }
        )

    @classmethod
    def desde_json(cls, texto: str) -> LedgerGobierno:
        """Reconstruye SIN confiar: re-verifica cadena completa al cargar."""
        d = json.loads(texto)
        led = cls(epoch_size=int(d["epoch_size"]))
        for e in d["eventos"]:
            ev = EventoGobierno.desde_json(canon(e))
            led._eventos.append(ev)
            if ev.accion == "epoch_seal":
                # raíz leída del sello — única fuente de verdad del dict
                raiz = ev.detalles[EPOCH_GENESIS_SEAL]["raiz"]
                led._raices_epocas[len(led._raices_epocas)] = raiz
                led._hojas_epoca = []
            else:
                led._hojas_epoca.append(ev.hash)
        informe = led.verificar_cadena()
        if not informe.ok:
            raise ValueError(f"ledger corrupto al deserializar: {informe.resumen()}")
        return led
