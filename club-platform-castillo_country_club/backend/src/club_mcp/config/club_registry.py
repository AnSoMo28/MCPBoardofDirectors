"""Registro de configuración por club (P2-C3h b0s).

Creado por b0s a partir del diagnóstico de b0r (§E: H2 puro): bootstrap.py:165
importa `from club_mcp.config.club_registry import get_club_config` y el módulo
no existía en ningún punto del árbol. Contrato inferido de los únicos
consumidores reales (verificados por b0r §B):

- bootstrap.py:173         club_config = get_club_config("castillo_country_club")
- bootstrap.py:211-212     kwargs[pname] = club_config  (inyección por nombre a agentes)
- event_orchestrator.py:35 club_config: dict[str, Any] | None = None  →  or {}

get_club_config(slug) devuelve un dict plano por club (copia defensiva); slug
desconocido → KeyError explícito: un club no registrado es un error de
configuración, no un caso de "vacío". El contenido vive en _CLUB_CONFIGS:
castillo_country_club arranca con dict vacío y se puebla con los datos reales
del club cuando la fase que los consume los defina (insumo: lo que
config/settings.py ya expone, volcado en p2c3h_b0s_report.txt §A).
"""

from typing import Any

_CLUB_CONFIGS: dict[str, dict[str, Any]] = {
    "castillo_country_club": {},
}

_KNOWN = ", ".join(sorted(_CLUB_CONFIGS))


def get_club_config(club_slug: str) -> dict[str, Any]:
    """Configuración del club `club_slug`, como dict plano (copia defensiva).

    Raises:
        KeyError: si el slug no está registrado en _CLUB_CONFIGS.
    """
    try:
        return dict(_CLUB_CONFIGS[club_slug])
    except KeyError:
        raise KeyError(
            f"club no registrado: {club_slug!r} (registrados: {_KNOWN})"
        ) from None


def registered_clubs() -> list[str]:
    """Slugs con configuración registrada (tests y diagnóstico)."""
    return sorted(_CLUB_CONFIGS)
