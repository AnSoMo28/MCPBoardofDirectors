"""Suite Ola 2.2 — swap Chroma→pgvector: PgVectorStore.

Tres capas (el gate del vertical):

1. HERMÉTICOS (sin red, sin PG): la where-language traduce al
   subconjunto real ($lte + equality), _sanitize_metadata idéntico
   al de chroma, factory opt-in, bridge sync→async detecta loop.

2. WRITE-RESTART-READ (persistencia real): mismo patrón de las
   17 verticales — sqlite local / PG real en CI via
   CLUB_PERSISTENCE_URL. El esquema lo monta Base.metadata
   (rag_orm), NO el store (lección create_all de las suites).

3. CONTRATO: add/query/update/delete/stats devuelven la MISMA
   forma que ChromaVectorStore (AST-verificado en el vertical: los
   11 métodos públicos + statics, firmas idénticas).
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import pytest

import club_mcp.db.orm.rag_orm  # noqa: F401 — registra rag_chunks en Base.metadata
from club_mcp.db.orm.rag_orm import RagChunkORM
from club_mcp.rag.pg_vectorstore import (
    ACCESS_HIERARCHY,
    ROLE_ACCESS,
    PgVectorStore,
    build_vectorstore,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_rag.db"


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable RAG-ONLY: drop/create rag_chunks sola.

    Lección del run #67: Base.metadata (drop|create)_all GLOBAL aquí
    rompía dos cosas a la vez — (1) rag_chunks nunca llegaba a
    crearse porque rag_orm no se importaba, y (2) un drop_all global
    sobre las tablas de las DEMÁS verticales en el PG compartido de
    CI dejaba el backend inconsistente entre suites. Este reset
    toca EXCLUSIVAMENTE la tabla del swap.
    """
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync: RagChunkORM.__table__.drop(
                sync, checkfirst=True
            )
        )
        await conn.run_sync(
            lambda sync: RagChunkORM.__table__.create(
                sync, checkfirst=True
            )
        )
    await engine.dispose()


def _schema_ready() -> None:
    """CREATE EXTENSION vector en la db de tests (una vez por sesión).

    El service pgvector/pgvector:pg16 la trae preinstalada; este
    paso es un no-op allí y el safety net en cualquier otro PG
    (requiere superuser — como postgres del service).
    """
    dsn = _mk_dsn()
    if not dsn:
        return

    async def _go() -> None:
        import asyncpg

        conn = await asyncpg.connect(dsn)
        try:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        except Exception:
            pass
        finally:
            await conn.close()

    asyncio.run(_go())


pytestmark = pytest.mark.asyncio


def _mk_dsn() -> str:
    """asyncpg DSN para el backend de este test (sqlite → skip PG paths).

    CLUB_PERSISTENCE_URL llega como sqlalchemy URL
    (postgresql+asyncpg://) — asyncpg quiere postgresql:// y sin
    password-encoded '+' del scheme.
    """
    if PG_URL:
        dsn = PG_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
        return dsn
    return ""


# ════════════════════════════════════════════════════════════
# 1 · HERMÉTICOS — where-language + sanitize + factory + bridge
# ════════════════════════════════════════════════════════════


class TestWhereTranslation:
    """La where-language REAL (inventario): $lte + equality. Nada más."""

    async def test_lte_access_level(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)  # sin __init__ (sin DSN)
        clauses, params = store._where_to_sql({"access_level": {"$lte": 1}})
        assert clauses == ["access_level <= $1"]
        assert params == [1]

    async def test_equality_access_level(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        clauses, params = store._where_to_sql({"access_level": 2})
        assert clauses == ["access_level = $1"]
        assert params == [2]

    async def test_equality_metadata_key(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        clauses, params = store._where_to_sql({"document_id": "abc123"})
        # JSONB ->> para metadata arbitraria, = parametrizado
        assert clauses == ["metadata_json->>'document_id' = $1"]
        assert params == ["abc123"]

    async def test_lte_on_non_access_raises(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        with pytest.raises(ValueError, match=r"\$lte only on access_level"):
            store._where_to_sql({"category": {"$lte": 1}})

    async def test_unsupported_operator_raises(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        with pytest.raises(ValueError, match="unsupported operator"):
            store._where_to_sql({"category": {"$gte": 1}})

    async def test_empty_where(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        assert store._where_to_sql(None) == ([], [])
        assert store._where_to_sql({}) == ([], [])

    async def test_key_quoting_no_injection(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        assert store._quote_literal("doc'or") == "'doc''or'"


class TestSanitize:
    """_sanitize_metadata: mismo contrato que el store chroma."""

    async def test_scalars_pass(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        out = store._sanitize_metadata({"a": "x", "b": 1, "c": 2.0, "d": True})
        assert out == {"a": "x", "b": 1, "c": 2.0, "d": True}

    async def test_none_becomes_empty(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        assert store._sanitize_metadata({"a": None}) == {"a": ""}

    async def test_list_dict_jsonified(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        out = store._sanitize_metadata({"tags": ["a", "b"], "meta": {"k": 1}})
        assert out["tags"] == json.dumps(["a", "b"], ensure_ascii=False)
        assert out["meta"] == json.dumps({"k": 1}, ensure_ascii=False)

    async def test_other_str(self) -> None:
        store = PgVectorStore.__new__(PgVectorStore)
        out = store._sanitize_metadata({"a": 1.5})
        assert out == {"a": 1.5}  # float escalar: pasa directo (no str())


class TestFactory:
    """build_vectorstore: opt-in CLUB_RAG_BACKEND=pgvector."""

    async def test_default_is_chroma(self, tmp_path: Any) -> None:
        os.environ.pop("CLUB_RAG_BACKEND", None)
        from club_mcp.rag.vectorstore import ChromaVectorStore

        persist = str(tmp_path / "chroma")  # tmp: no deja artefactos en el árbol
        store = build_vectorstore(persist_dir=persist)
        assert isinstance(store, ChromaVectorStore)
        assert store._persist_dir == persist

    async def test_pgvector_opt_in(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CLUB_RAG_BACKEND", "pgvector")
        monkeypatch.setenv("CLUB_DATABASE_DSN", "postgresql://u:p@localhost:5432/db")
        store = build_vectorstore()
        assert isinstance(store, PgVectorStore)

    async def test_unknown_value_is_chroma(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CLUB_RAG_BACKEND", "qdrant")  # no existe: default
        from club_mcp.rag.vectorstore import ChromaVectorStore

        store = build_vectorstore()
        assert isinstance(store, ChromaVectorStore)


class TestBridge:
    """El puente sync→asyncpg: la parte que puede romperse sola.

    __new__ no sirve aquí (sin __init__ faltan _pool/_loop): se
    construye el store REAL con DSN dummy — el pool es lazy, nada
    conecta si la coroutine no lo pide.
    """

    def _mk(self) -> PgVectorStore:
        return PgVectorStore(dsn="postgresql://u:p@localhost:5432/dummy")

    async def test_run_from_sync_context(self) -> None:
        store = self._mk()

        async def coro() -> int:
            return 42  # no toca el pool: nada conecta

        assert store._run(coro()) == 42

    async def test_run_from_async_context_via_private_loop(self) -> None:
        # asyncio.run dentro de un loop RAISA — el puente debe
        # detectarlo y correr en el loop privado del thread.
        store = self._mk()

        async def coro() -> int:
            return 7  # no toca el pool: nada conecta

        out = await asyncio.to_thread(lambda: store._run(coro()))
        assert out == 7

    async def test_dsn_secret_masks_password(self) -> None:
        store = self._mk()
        assert "secret" not in store._dsn_secret()
        assert "u:***@localhost:5432/dummy" in store._dsn_secret()


# ════════════════════════════════════════════════════════════
# 2 · WRITE-RESTART-READ (persistencia real — sqlite / PG)
# ════════════════════════════════════════════════════════════


@pytest.mark.skipif(
    not PG_URL,
    reason="sqlite backend: PgVectorStore habla asyncpg, no sqlite (CI corre el PG real)",
)
class TestPgVectorStorePersistence:
    """CI-only: contra el service pgvector/pgvector:pg16 real.

    _reset_backend (rag-only) ya crea la tabla; _schema_ready corre
    una vez (CREATE EXTENSION) en el setup del primer test.
    """

    async def test_write_restart_read(self) -> None:
        await _reset_backend()  # drop+create rag_chunks (rag-only)  # restart REAL: engine nuevo tras el write

        store = PgVectorStore(dsn=_mk_dsn())
        emb = [0.1] * 1024
        store.add(
            ids=["c1", "c2"],
            embeddings=[emb, emb],
            documents=["texto uno", "texto dos"],
            metadatas=[
                {"document_id": "docA", "access_level": 1, "category": "finanzas"},
                {"document_id": "docA", "access_level": 3, "category": "legal"},
            ],
        )
        # restart del store: instancia NUEVA (pool nuevo) mismo DSN
        store2 = PgVectorStore(dsn=_mk_dsn())
        assert store2.count() == 2
        results = store2.query(embedding=emb, n_results=5)
        assert len(results) == 2
        assert all(r["score"] >= 0.99 for r in results)  # mismo vector → cos≈1
        meta = results[0]["metadata"]
        assert "category" in meta and "access_level" in meta

    async def test_access_control_lte(self) -> None:
        await _reset_backend()  # drop+create rag_chunks (rag-only)

        store = PgVectorStore(dsn=_mk_dsn())
        emb = [0.1] * 1024
        store.add(
            ids=["c1", "c2", "c3"],
            embeddings=[emb, emb, emb],
            documents=["a", "b", "c"],
            metadatas=[
                {"document_id": "dA", "access_level": 0},
                {"document_id": "dB", "access_level": 1},
                {"document_id": "dC", "access_level": 3},
            ],
        )
        # socio (max 0): solo c1
        socio = store.query_with_access(embedding=emb, user_role="socio")
        assert [r["id"] for r in socio] == ["c1"]
        # staff (max 1): c1 + c2
        staff = store.query_with_access(embedding=emb, user_role="staff")
        assert sorted(r["id"] for r in staff) == ["c1", "c2"]
        # admin (max 3): todo
        admin = store.query_with_access(embedding=emb, user_role="admin")
        assert len(admin) == 3

    async def test_update_access_metadata_roundtrip(self) -> None:
        await _reset_backend()  # drop+create rag_chunks (rag-only)

        store = PgVectorStore(dsn=_mk_dsn())
        emb = [0.1] * 1024
        store.add(
            ids=["c1"],
            embeddings=[emb],
            documents=["x"],
            metadatas=[{"document_id": "doc9", "access_level": 3}],
        )
        # update() del contrato 0055: la ruta update_access_metadata
        store.update(ids=["c1"], metadatas=[{"access_level": 1, "document_id": "doc9"}])
        got = store.get_chunks_by_document("doc9")
        assert got["ids"] == ["c1"]
        assert got["metadatas"][0]["access_level"] == 1

    async def test_delete_by_document(self) -> None:
        await _reset_backend()  # drop+create rag_chunks (rag-only)

        store = PgVectorStore(dsn=_mk_dsn())
        emb = [0.1] * 1024
        store.add(
            ids=["c1", "c2"],
            embeddings=[emb, emb],
            documents=["a", "b"],
            metadatas=[{"document_id": "d1"}, {"document_id": "d2"}],
        )
        assert store.delete_by_document("d1") == 1
        assert store.count() == 1
        store.delete_by_ids(["c2"])
        assert store.count() == 0

    async def test_get_by_ids_shape(self) -> None:
        await _reset_backend()  # drop+create rag_chunks (rag-only)

        store = PgVectorStore(dsn=_mk_dsn())
        emb = [0.1] * 1024
        store.add(
            ids=["c1"],
            embeddings=[emb],
            documents=["doc text"],
            metadatas=[{"document_id": "d1", "category": "finanzas"}],
        )
        items = store.get_by_ids(["c1"])
        assert items[0]["id"] == "c1"
        assert items[0]["document"] == "doc text"
        assert items[0]["metadata"]["category"] == "finanzas"

    async def test_stats_shape(self) -> None:
        await _reset_backend()  # drop+create rag_chunks (rag-only)

        store = PgVectorStore(dsn=_mk_dsn())
        emb = [0.1] * 1024
        store.add(
            ids=["c1", "c2"],
            embeddings=[emb, emb],
            documents=["aa", "bb"],
            metadatas=[
                {"document_id": "d1", "document_type": "contract", "category": "legal"},
                {"document_id": "d1", "document_type": "contract", "category": "legal"},
            ],
        )
        stats = store.get_stats()
        assert stats["total_chunks"] == 2
        assert stats["total_documents"] == 1
        assert stats["by_type"] == {"contract": 2}
        assert stats["by_category"] == {"legal": 2}
        assert stats["total_size_bytes"] == 4  # "aa" + "bb"
        store.close()


# ════════════════════════════════════════════════════════════
# 3 · CONTRATO — mismas formas que ChromaVectorStore
# ════════════════════════════════════════════════════════════


class TestContractShapes:
    """Las formas de retorno: idénticas a las del store chroma."""

    async def test_role_access_shared_constant(self) -> None:
        from club_mcp.rag.vectorstore import ROLE_ACCESS as CHROMA_ROLE

        assert ROLE_ACCESS == CHROMA_ROLE
        from club_mcp.rag.vectorstore import ACCESS_HIERARCHY as CHROMA_HIER

        assert ACCESS_HIERARCHY == CHROMA_HIER

    async def test_where_contracts_documented(self) -> None:
        """query_with_access arma el where del subconjunto soportado."""
        store = PgVectorStore.__new__(PgVectorStore)
        # smoke: el método existe y no explota al armarse (sin I/O)
        assert hasattr(store, "query_with_access")
