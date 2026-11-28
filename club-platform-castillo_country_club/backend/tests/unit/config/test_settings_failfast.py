"""Ola 1 — Security P0: tests de los gates Q-SEC-01..05.

Cada test ES el gate de salida de su ítem del PATH:
  - Q-SEC-01: production sin JWT_SECRET_KEY real RECHAZA arrancar.
  - Q-SEC-02: cloud_ai_enabled sin api_key RECHAZA en production.
  - Q-SEC-01(b): jwt_service firma con el secreto de settings (una sola
    fuente de verdad — antes firmaba con SU propio literal).
  - Q-SEC-04: sin rol del caller, los tools RAG default a socio (least
    privilege), nunca admin.
  - Q-SEC-05: la rama BM25 de la búsqueda híbrida respeta el techo de
    access_level del rol (gradiente socio<staff<junta<admin).

Ola 1.2: el rol real del JWT llega a los tools vía el mecanismo
IDENTITY_FIELDS del router (tests en test_agents_routes).
"""

from __future__ import annotations

import inspect

import pytest
from rank_bm25 import BM25Okapi

from club_mcp.agents.document_intelligence_agent import DocumentIntelligenceAgent
from club_mcp.config.settings import _INSECURE_JWT_SECRETS, Settings
from club_mcp.rag.search import HybridSearchEngine
from club_mcp.rag.vectorstore import ROLE_ACCESS


class TestSettingsFailFast:
    """Q-SEC-01/02 — el artefacto (Settings) rechaza producción insegura."""

    def test_production_rejects_placeholder_jwt_secret(self) -> None:
        for bad in ["", *_INSECURE_JWT_SECRETS]:
            with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
                Settings(club_env="production", jwt_secret_key=bad)

    def test_production_accepts_real_secret(self) -> None:
        s = Settings(club_env="production", jwt_secret_key="x" * 44)
        assert s.is_production

    def test_production_rejects_cloud_ai_without_key(self) -> None:
        with pytest.raises(ValueError, match="CLOUD_AI_API_KEY"):
            Settings(
                club_env="production",
                jwt_secret_key="x" * 44,
                cloud_ai_enabled=True,
            )

    def test_development_keeps_defaults(self) -> None:
        """Dev loop intacto: defaults permiten arrancar sin configurar."""
        s = Settings(club_env="development")
        assert s.is_development
        assert s.jwt_secret_key  # algo hay, pero development lo tolera

    def test_denylist_contains_both_known_literals(self) -> None:
        """Los 2 literales históricos del árbol están en la denylist."""
        assert "change-me-in-production" in _INSECURE_JWT_SECRETS
        assert (
            "castillo-country-club-dev-secret-key-change-in-production"
            in _INSECURE_JWT_SECRETS
        )


class TestJwtSingleSourceOfTruth:
    """Q-SEC-01(b) — jwt_service consume settings, no su propio literal."""

    def test_secret_comes_from_settings(self) -> None:

        import club_mcp.auth.jwt_service as jwt_service

        # settings en dev default → el módulo debe usar ESE valor
        from club_mcp.config.settings import get_settings

        assert jwt_service._SECRET_KEY == get_settings().jwt_secret_key

    def test_algorithm_comes_from_settings(self) -> None:
        import club_mcp.auth.jwt_service as jwt_service
        from club_mcp.config.settings import get_settings

        assert jwt_service._ALGORITHM == get_settings().jwt_algorithm

    def test_no_own_hardcoded_secret_literal(self) -> None:
        """El módulo ya no contiene SU literal de firma."""
        import club_mcp.auth.jwt_service as jwt_service

        src = inspect.getsource(jwt_service)
        assert "castillo-country-club-dev-secret-key" not in src


class TestToolsDefaultToLeastPrivilege:
    """Q-SEC-04 — sin caller conocido, el default es socio, JAMÁS admin."""

    @pytest.mark.parametrize(
        "tool",
        [
            "search_documents",
            "knowledge_query",
            "query_documents",
            "execute_knowledge_report",
        ],
    )
    def test_user_role_defaults_to_socio(self, tool: str) -> None:
        sig = inspect.signature(getattr(DocumentIntelligenceAgent, tool))
        assert sig.parameters["user_role"].default == "socio"

    def test_agent_source_has_no_admin_hardcode(self) -> None:
        src = inspect.getsource(DocumentIntelligenceAgent)
        assert 'user_role="admin"' not in src


def _engine_with_corpus() -> HybridSearchEngine:
    """Motor híbrido con corpus mínimo pero con IDF positivo (6 docs).

    Un corpus de 2 documentos da IDF negativo y el `score > 0` ORIGINAL
    de _bm25_search descarta todo — artefacto del corpus mínimo, no del
    filtro de ACL. 6 documentos con vocabulario realista lo evita.
    """
    eng = HybridSearchEngine.__new__(HybridSearchEngine)
    eng._bm25_dirty = False
    eng._bm25 = None
    eng._bm25_corpus = [
        {"id": "pub_1", "tokens": ["presupuesto", "publico", "anual"], "metadata": {"access_level": 0}},
        {"id": "pub_2", "tokens": ["actividades", "deportivas", "verano"], "metadata": {"access_level": 0}},
        {"id": "int_1", "tokens": ["mantenimiento", "canchas", "interno"], "metadata": {"access_level": 1}},
        {"id": "conf_1", "tokens": ["contrato", "proveedor", "confidencial"], "metadata": {"access_level": 2}},
        {"id": "restr_1", "tokens": ["presupuesto", "secreto", "directorio"], "metadata": {"access_level": 3}},
        {"id": "restr_2", "tokens": ["salarios", "directorio", "privado"], "metadata": {"access_level": 3}},
    ]
    eng._bm25 = BM25Okapi([e["tokens"] for e in eng._bm25_corpus])
    return eng


class TestBm25AclGradient:
    """Q-SEC-05 — la rama keyword respeta el techo de access_level."""

    QUERY = "presupuesto secreto directorio"

    def test_socio_never_sees_restricted(self) -> None:
        res = _engine_with_corpus()._bm25_search(self.QUERY, top_k=10, user_role="socio")
        assert all(r["metadata"]["access_level"] <= ROLE_ACCESS["socio"] for r in res)
        assert res, "socio debería ver al menos el documento public"

    def test_admin_sees_everything(self) -> None:
        res = _engine_with_corpus()._bm25_search(self.QUERY, top_k=10, user_role="admin")
        ids = {r["id"] for r in res}
        assert {"restr_1", "restr_2"} <= ids

    @pytest.mark.parametrize("role", ["socio", "staff", "junta", "admin"])
    def test_gradient_respects_role_ceiling(self, role: str) -> None:
        res = _engine_with_corpus()._bm25_search(
            "presupuesto secreto contrato confidencial directorio salarios",
            top_k=10,
            user_role=role,
        )
        ceiling = ROLE_ACCESS[role]
        assert all(r["metadata"]["access_level"] <= ceiling for r in res)
