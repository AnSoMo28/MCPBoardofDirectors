#!/usr/bin/env python3
"""verificar_bundle — CLI standalone de verificación OFFLINE (Ola 4.4).

ESTE ARCHIVO ES AUTO-CONTENIDO A PROPÓSITO: importa stdlib y NADA más.
Copia este archivo a la máquina del auditor/regulador/seguro junto con
el bundle JSON del club y corré:

    python3 verificar_bundle.py bundle.json

El club no abre su backend; el tercero no necesita el repo, la DB ni la
red. La verificación re-deriva TODO lo derivable desde el artefacto
mismo (sha-256 + canon JSON determinista) y contesta con exit code 0
(válido) o 1 (inválido) — la misma línea de ``verificar_recibo.py``
(Ola 4.1), ahora para el bundle completo.

Qué verifica (fail-closed, en orden):
  1. FORMATO — manifiesto ``gobierno-evidencia-v1`` legible y completo.
  2. CONJUNTO — cada componente declarado existe (ni fantasma ni faltante).
  3. HASHES — sha256(nombre + \\n + contenido) recalculado de cada
     componente calza con el manifiesto: un byte mutado = inválido.
  4. RAÍZ — la raíz Merkle del manifiesto se RE-DERIVA de los hashes
     (orden alfabético, hoja impar duplicada — RFC 6962): el acta de
     64 caracteres que el club publica fuera de banda calza con el
     contenido REAL del bundle.
  5. LEDGER — la cadena lineal del ledger exportado se re-deriva
     evento a evento (prev_hash + sha256(prev_hash + canon(evento))) y
     las raíces de época se re-computan de sus hojas: el registro
     íntegro, no prometido.
  6. CONSTITUCIÓN — es JSON válido con los campos estructurales del
     formato ``constitucion-ejecutable-v1`` (versión, políticas con
     id/efecto/prioridad, economía): el documento que el bundle dice
     ser. (La validación SEMÁNTICA completa es del runtime; el tercero
     valida estructura + amarrado por hash.)

Uso avanzado:
    python3 verificar_bundle.py bundle.json --raiz PUBLICADA.txt
verifica además que la raíz del bundle calza con una raíz publicada
fuera de banda (acta de junta, póliza, board) — lamutación del bundle
COMPLETO se detecta contra 64 caracteres.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import sys


FORMATO_BUNDLE = "gobierno-evidencia-v1"
NOMBRE_LEDGER = "ledger"
NOMBRE_CONSTITUCION = "constitucion"
CAMPOS_EVENTO = ("seq", "ts", "actor", "rol", "accion", "recurso", "detalles")
GENESIS = "0" * 64
USO = "uso: python3 verificar_bundle.py BUNDLE.json [--raiz RAIZ_PUBLICADA.txt]"


def _sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def _canon(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _hash_componente(nombre: str, contenido: str) -> str:
    return _sha256(nombre + "\n" + contenido)


def _merkle_root(hojas: list[str]) -> str:
    """Raíz Merkle binaria — RFC 6962: hoja impar se duplica."""
    if not hojas:
        return GENESIS
    nivel = list(hojas)
    while len(nivel) > 1:
        if len(nivel) % 2 == 1:
            nivel.append(nivel[-1])
        nivel = [_sha256(nivel[i] + nivel[i + 1]) for i in range(0, len(nivel), 2)]
    return nivel[0]


def _verificar_ledger(contenido: str) -> tuple[bool, str]:
    """Cadena lineal + épocas Merkle del ledger exportado — re-derivadas."""
    try:
        d = json.loads(contenido)
        eventos = d["eventos"]
        raices = d.get("raices_epocas", {})
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        return False, f"ledger ilegible: {e}"
    prev = GENESIS
    hojas_epoca: list[str] = []
    epoca_actual = 0
    for i, ev in enumerate(eventos):
        try:
            if int(ev["seq"]) != i:
                return False, f"seq {ev['seq']} ≠ posición {i}"
            canon_ev = _canon({c: ev.get(c) for c in CAMPOS_EVENTO})
            h = _sha256(str(ev.get("prev_hash", "")) + canon_ev)
            if str(ev.get("prev_hash", "")) != prev:
                return False, f"prev_hash roto @ seq={i}"
            if str(ev.get("hash", "")) != h:
                return False, f"hash del evento no calza @ seq={i}"
            prev = h
        except (KeyError, TypeError, ValueError) as e:
            return False, f"evento {i} malformado: {e}"
        accion = str(ev.get("accion", ""))
        if accion == "epoch_seal":
            # sello: raíz declarada debe calzar con la re-computada
            try:
                raiz_declarada = ev["detalles"]["merkle-epoch-v1"]["raiz"]
            except (KeyError, TypeError):
                return False, f"sello de época malformado @ seq={i}"
            raiz_computada = _merkle_root(hojas_epoca)
            if raiz_declarada != raiz_computada:
                return False, f"época {epoca_actual}: raíz declarada ≠ re-computada"
            if raices.get(str(epoca_actual)) != raiz_declarada:
                return False, f"época {epoca_actual}: índice de raíces no calza"
            hojas_epoca = []
            epoca_actual += 1
        else:
            hojas_epoca.append(str(ev.get("hash", "")))
    if hojas_epoca:
        # época abierta: la cadena lineal YA sella esos eventos (tamper-
        # evident); solo carecen de recibo Merkle O(log n) hasta el
        # próximo sello — se REPORTA, no se reprueba (consistente con
        # la verificación del módulo: ambas puertas dicen lo mismo)
        return True, (
            f"cadena ÍNTEGRA · {len(eventos)} eventos · {epoca_actual} épocas selladas · "
            f"NOTA: época {epoca_actual} abierta ({len(hojas_epoca)} eventos sin sello Merkle)"
        )
    return True, f"cadena ÍNTEGRA · {len(eventos)} eventos · {epoca_actual} épocas selladas"


def _verificar_constitucion(contenido: str) -> tuple[bool, str]:
    """Estructura mínima del documento ejecutable (validación semántica = runtime)."""
    try:
        d = json.loads(contenido)
        assert d["formato"] == "constitucion-ejecutable-v1"
        assert isinstance(d["version"], int) and d["version"] >= 1
        pols = d["politicas"]
        assert isinstance(pols, list) and pols
        for p in pols:
            assert p["id"] and p["efecto"] in ("allow", "deny")
            assert isinstance(p["prioridad"], int)
        eco = d["economia"]
        assert isinstance(eco.get("presupuestos_globales"), dict)
        assert isinstance(eco.get("presupuestos_por_rol"), dict)
    except (json.JSONDecodeError, KeyError, TypeError, AssertionError) as e:
        return False, f"constitución no calza con el formato ejecutable: {e}"
    return True, f"constitucion-ejecutable-v1 · v{d['version']} · {len(pols)} políticas"


def verificar_bundle(bundle: dict[str, object]) -> tuple[bool, str]:
    """Verdad única: TODO lo declarado se recalcula desde el artefacto."""
    # 1 · formato y manifiesto
    try:
        crudo = bundle["manifiesto"]
        assert isinstance(crudo, dict)
        man: dict[str, object] = crudo
        assert man["formato"] == FORMATO_BUNDLE
        comps = bundle["componentes"]
        assert isinstance(comps, list)
        pares = man["componentes"]
        assert isinstance(pares, list)
        declarados = {str(n): str(h) for n, h in pares}
        raiz_declarada = str(man["raiz_bundle"])
    except (KeyError, TypeError, AssertionError) as e:
        return False, f"manifiesto ilegible/incompleto: {e}"
    # 2 · conjunto
    por_nombre: dict[str, str] = {}
    for c in comps:
        try:
            n, cont = str(c["nombre"]), str(c["contenido"])
        except (KeyError, TypeError) as e:
            return False, f"componente malformado: {e}"
        if n in por_nombre:
            return False, f"componente duplicado: {n}"
        por_nombre[n] = cont
    if set(declarados) != set(por_nombre):
        return False, (
            f"manifiesto declara {len(declarados)} componentes, "
            f"el bundle trae {len(por_nombre)} — conjunto distinto"
        )
    # 3 · hashes recalculados
    for n, sha in declarados.items():
        if _hash_componente(n, por_nombre[n]) != sha:
            return False, f"componente {n!r}: contenido mutado (sha no calza)"
    # 4 · raíz re-derivada
    raiz = _merkle_root([declarados[n] for n in sorted(declarados)])
    if raiz != raiz_declarada:
        return False, f"raíz del bundle mutada: {raiz[:16]}… ≠ declarada {raiz_declarada[:16]}…"
    # 5 · ledger íntegro
    if NOMBRE_LEDGER not in por_nombre:
        return False, "bundle sin ledger — no es evidencia de gobierno"
    ok, msg = _verificar_ledger(por_nombre[NOMBRE_LEDGER])
    if not ok:
        return False, f"ledger del bundle: {msg}"
    # 6 · constitución estructural
    if NOMBRE_CONSTITUCION not in por_nombre:
        return False, "bundle sin constitución — no es evidencia de gobierno"
    okc, msgc = _verificar_constitucion(por_nombre[NOMBRE_CONSTITUCION])
    if not okc:
        return False, f"constitución del bundle: {msgc}"
    return True, (
        f"bundle {FORMATO_BUNDLE} ÍNTEGRO · raíz {raiz[:16]}… · "
        f"{len(declarados)} componentes · {msg} · {msgc} · snapshot {str(man.get('snapshot_ts'))!s}"
    )


def _forzar_utf8_salida() -> None:
    """stdout/stderr a UTF-8 con ``errors="replace"`` — portable y silencioso.

    El tercero puede correr la CLI en una consola cp1252 (Windows) o
    con ``PYTHONIOENCODING=ascii`` en el entorno: sin esto, el primer
    ``print`` con «✓» muere con ``UnicodeEncodeError`` ANTES de poder
    reportar nada — un bundle VÁLIDO fallaría por la codificación de la
    CONSOLA del auditor, no por la evidencia. La salida que importa es
    el exit code; el texto llega legible o con sustituciones, pero
    llega. Best-effort: si la consola no soporta reconfigure, seguimos.
    """
    for flujo in (sys.stdout, sys.stderr):
        reconfig = getattr(flujo, "reconfigure", None)
        if reconfig is not None:
            with contextlib.suppress(ValueError, OSError):
                reconfig(encoding="utf-8", errors="replace")


def main(argv: list[str]) -> int:
    _forzar_utf8_salida()
    if len(argv) < 2 or argv[1] in {"-h", "--help"}:
        print(USO)
        return 2
    try:
        with open(argv[1], encoding="utf-8") as f:
            bundle = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"bundle ilegible: {e}")
        return 1
    ok, msg = verificar_bundle(bundle)
    # opción --raiz: amarrado contra lo publicado fuera de banda
    if ok and len(argv) >= 4 and argv[2] == "--raiz":
        try:
            with open(argv[3], encoding="utf-8") as f:
                publicada = f.read().strip()
        except OSError as e:
            print(f"no pude leer la raíz publicada: {e}")
            return 1
        if publicada != bundle["manifiesto"]["raiz_bundle"]:
            print(
                f"RAÍZ NO CALZA: bundle {bundle['manifiesto']['raiz_bundle'][:16]}… ≠ "
                f"publicada {publicada[:16]}… — el bundle MUTÓ respecto del acta"
            )
            return 1
        msg += " · raíz == publicada fuera de banda ✓"
    print(("✓ " if ok else "✗ ") + msg)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
