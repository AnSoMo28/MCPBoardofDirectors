#!/usr/bin/env python3
"""verificar_recibo — CLI standalone de verificación OFFLINE (Ola 4.1).

ESTE ARCHIVO ES AUTO-CONTENIDO A PROPÓSITO: importa stdlib y NADA más.
Copia este archivo a la máquina del auditor/regulador/seguro, junto
con el recibo JSON del club y la raíz de época publicada. Corré:

    python3 verificar_recibo.py recibo.json

El club no necesita abrir su backend; el tercero no necesita el repo,
la DB ni la red. La verificación re-deriva el camino Merkle con
sha-256 (RFC 6962) y contesta con exit code 0 (válido) o 1 (inválido).

Formato del recibo (emitido por club_mcp.gobierno.ledger):
    {
      "epoch": 3,            # época sellada donde vivió el evento
      "seq": 25,             # posición global del evento en el ledger
      "event_hash": "…64h",  # sha-256 del evento (canon lineal)
      "merkle_path": [       # camino de inclusión hoja→raíz
        {"hash": "…", "lado": "d"}, {"hash": "…", "lado": "i"}, …
      ],
      "epoch_root": "…64h"   # raíz publicada por el club
    }

Si el club publica además el JSON del evento original, verificá su
integridad con --evento evento.json: comprueba que
sha256(evento.canon) == recibo.event_hash.
"""
from __future__ import annotations

import hashlib
import json
import sys


CAMPOS_EVENTO = ("seq", "ts", "actor", "rol", "accion", "recurso", "detalles")
USO = "uso: python3 verificar_recibo.py RECIBO.json [--evento EVENTO.json]"


def _sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def _canon(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def derivar_raiz(event_hash: str, merkle_path: list[dict[str, str]]) -> str:
    """Folding del camino: hoja + pares (lado decide el orden del concat)."""
    actual = event_hash
    for paso in merkle_path:
        hermano = paso["hash"]
        if paso["lado"] == "d":
            actual = _sha256(actual + hermano)
        elif paso["lado"] == "i":
            actual = _sha256(hermano + actual)
        else:
            raise ValueError(f"lado inválido: {paso['lado']!r} (esperado 'i' o 'd')")
    return actual


def verificar_recibo(recibo: dict[str, object]) -> tuple[bool, str]:
    """Verdad única: la raíz derivada del camino DEBE ser la raíz publicada."""
    try:
        event_hash = str(recibo["event_hash"])
        epoch_root = str(recibo["epoch_root"])
        crudo = recibo["merkle_path"]
        merkle_path = [dict(p) for p in crudo] if isinstance(crudo, list) else []
    except (KeyError, TypeError) as exc:
        return False, f"recibo incompleto: falta {exc}"
    derivada = derivar_raiz(event_hash, merkle_path)
    if derivada == epoch_root:
        return True, f"válido: evento sha256={event_hash[:16]}… incluido en época {recibo.get('epoch')}"
    return False, (
        f"inválido: raíz derivada {derivada[:16]}… ≠ publicada {epoch_root[:16]}… — "
        "el evento NO estuvo en esa época (o el recibo/raíz fue alterado)"
    )


def verificar_evento(evento: dict[str, object], recibo: dict[str, object]) -> tuple[bool, str]:
    """El evento original pina el recibo: canon(evento) → event_hash."""
    canon_evento = _canon({c: evento.get(c) for c in CAMPOS_EVENTO})
    h = _sha256(str(recibo.get("prev_hash", "")) + canon_evento)
    if h == str(recibo.get("event_hash")):
        return True, "evento íntegro: su hash calza con el recibo"
    return False, (
        "evento no calza: sha256(prev_hash + canon(evento)) ≠ recibo.event_hash — "
        "el JSON del evento difiere del que fue registrado"
    )


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] in {"-h", "--help"}:
        print(USO)
        return 2
    try:
        with open(argv[1], encoding="utf-8") as fh:
            recibo = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"✗ no pude leer el recibo: {exc}")
        return 2

    ok, msg = verificar_recibo(recibo)
    print(("✓ " if ok else "✗ ") + msg)

    # Verificación opcional del evento original contra el recibo
    if "--evento" in argv:
        path = argv[argv.index("--evento") + 1]
        try:
            with open(path, encoding="utf-8") as fh:
                evento = json.load(fh)
        except (OSError, json.JSONDecodeError, IndexError) as exc:
            print(f"✗ no pude leer el evento: {exc}")
            return 2
        ok2, msg2 = verificar_evento(evento, recibo)
        print(("✓ " if ok2 else "✗ ") + msg2)
        ok = ok and ok2

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
