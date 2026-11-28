#!/usr/bin/env python3
"""secret-audit v1.0.0 — Ola 1.3: 0 literales de secreto en src/.

Gate de ARTEFACTO: recorre el árbol de fuentes del backend buscando
patrones de secreto hardcodeado. La allowlist documenta cada excepción
viva (con razón); una nueva aparición sin allowlist = exit 1.

Reglas de la casa (NEXT-STEPS-2027 Ola 1.3): "audit de
password|secret|api_key en src/ → hardcode restante a settings" — este
script ES ese audit, ejecutable en CI y pre-commit.

Uso: cd backend && uv run python scripts/secret_audit.py [--fix-baseline]
Exit 0 = limpio · exit 1 = hallazgos fuera de allowlist · exit 2 = uso.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path


VERSION = "1.0.0"

# ── Allowlist: excepciones VIVAS y justificadas ──────────────────
# (archivo, EXTRACTO exacto del hallazgo) → razón. Anclamos al
# EXTRACTO, no al número de línea: ruff --fix y edits reordenan
# líneas y una allowlist por línea quedaría desincronizada en silencio
# (lección de esta misma ola: 3 re-alineaciones en un día). El
# extracto sigue siendo único por aparición.
ALLOWLIST: dict[str, str] = {
    # El placeholder default de DEV (development lo tolera; production
    # lo rechaza por el validator Q-SEC-01 — el gate vivo es el test).
    'jwt_secret_key: str = "dev-only-insecure-jwt-secret-do-not-use-in-production"':
        "default dev de jwt_secret_key 48B (production lo rechaza: validator Ola 1.1)",
    # La DENYLIST de secretos prohibidos: citar el literal es el punto —
    # es la lista de lo que production RECHAZA, no un secreto en uso.
    '"change-me-in-production"':
        "denylist _INSECURE_JWT_SECRETS (citar el placeholder es su función)",
}

# ── Patrones de secreto ───────────────────────────────────────────
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    # password="..." / password: str = "..." (con contenido o vacío en
    # código NO test): captura el clásico password="" de diagnóstico.
    ("password-literal", re.compile(
        r'password\s*[=:]\s*(?:"[^"]*"|\'[^\']*\')', re.IGNORECASE)),
    # secret = "..." / secret_key: str = "..."
    ("secret-literal", re.compile(
        r'(?:jwt_)?secret(?:_key)?\s*[=:]\s*(?:"[^"]+"|\'[^\']+\')', re.IGNORECASE)),
    # api_key: str = "" default — solo permitido como default vacío
    ("api-key-literal", re.compile(
        r'api_key\s*[=:]\s*(?:"[^"]+"|\'[^\']+\')', re.IGNORECASE)),
    # literales que gritan placeholder
    ("placeholder-secret", re.compile(
        r'["\'](change-?me[^"\']*|dev-?secret[^"\']*|sekrit|hunter2)["\']', re.IGNORECASE)),
]

# Archivos excluidos por diseño: los fixtures de tests usan literales
# deliberadamente; los docs de evidencia citan hallazgos históricos.
EXCLUDE_DIRS = {"tests", "docs", ".venv", "data", "__pycache__", "scripts"}
EXCLUDE_FILES = {"secret_audit.py"}  # este propio script cita los patrones

ROOT = Path(__file__).resolve().parent.parent / "src"


def audit() -> list[tuple[str, str, str, str]]:
    """Devuelve [(archivo:linea, patron, extracto, allowlist?)]"""
    findings: list[tuple[str, str, str, str | None]] = []
    for py in sorted(ROOT.rglob("*.py")):
        rel = py.relative_to(ROOT.parent)
        parts = set(rel.parts)
        if parts & EXCLUDE_DIRS or py.name in EXCLUDE_FILES:
            continue
        rel_posix = rel.as_posix()
        for lineno, line in enumerate(
            py.read_text(encoding="utf-8").splitlines(), 1
        ):
            stripped = line.strip()
            # comments con el patrón no son secretos
            if stripped.startswith("#"):
                continue
            for name, pat in PATTERNS:
                m = pat.search(line)
                if not m:
                    continue
                key = f"{rel_posix}:{lineno}"
                # allowlist por EXTRACTO (robusta a reordenación de
                # líneas): el match completo de la línea es la clave.
                reason = ALLOWLIST.get(m.group(0))
                findings.append((key, name, m.group(0)[:60], reason))
    return findings


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] not in ("--fix-baseline",):
        print(f"uso: {sys.argv[0]} [--fix-baseline]"); return 2

    findings = audit()
    print(f"secret-audit v{VERSION} — {sum(1 for _ in ROOT.rglob('*.py'))} archivos en src/")
    print(f"allowlist viva: {len(ALLOWLIST)} entradas")

    bad = [f for f in findings if f[3] is None]
    ok = [f for f in findings if f[3] is not None]

    for key, name, extract, reason in ok:
        print(f"  [ALLOWED] {key} · {name} · {reason}")

    if bad:
        print(f"\n::error::{len(bad)} hallazgo(s) FUERA de allowlist:")
        for key, name, extract, _ in bad:
            print(f"  [NEW] {key} · {name} · {extract}")
        print(
            "\nFix: mové el valor a Settings (env/.env) o, si es un falso "
            "positivo legítimo, sumalo a ALLOWLIST con razón."
        )
        return 1

    print(f"\nsecret-audit: 0 hallazgos nuevos ({len(ok)} allowlisted) — GATE VERDE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
