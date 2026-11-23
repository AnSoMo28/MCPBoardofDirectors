"""
PgVectorStore — vector storage on PostgreSQL + pgvector (Ola 2.2).

Replaces ChromaVectorStore file-for-file with the SAME public API
(the architecture note in the old file: "To swap to Qdrant or
pgvector in F29, replace this file with the same public API — no
changes needed in parsers, chunker, embeddings, or RAG service").

Design (lección 0055): the store is called from sync context
(RAGService._populate_content, HybridSearchEngine._vector_search,
routes) AND async context (nothing today, but the repo contract
methods are async). The database stack of the house is asyncpg —
psycopg is NOT in the lock, and adding it would break
`uv sync --frozen`. So this store bridges sync→async: every public
method runs its SQL through asyncio.run on a fresh connection from
an asyncpg pool. In an async context the caller's loop is NOT
taken (asyncio.run would raise "cannot run inside a running loop"):
the bridge detects it and runs on a private loop in a daemon
thread — RAG queries stay sync-shaped, zero changes at call sites.

Storage model: one row per chunk in `rag_chunks` (mirror of what
ChromaDB kept: ids/embeddings/documents/metadatas). Embeddings are
normalized by EmbeddingService (cosine-ready) → cosine distance
via pgvector's <=> operator; score = 1 - distance, exactly the
ChromaDB contract. Access control: `access_level` integer column
plus the WHERE language subset the code actually uses ($lte and
plain equality — inventory: no other operator, no where_document
callers). Extra metadata keys ride in a JSONB column.

Table: created by Base.metadata.create_all (persistence suites,
CI) or alembic 0019 (production). The ORM lives in
db/orm/rag_orm.py; this store does raw asyncpg SQL (no ORM sessions
here — a vector store is storage, not domain).
"""
from __future__ import annotations

import asyncio
import json
import logging
import threading
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Any


if TYPE_CHECKING:
    from club_mcp.rag.vectorstore import ChromaVectorStore

logger = logging.getLogger(__name__)

# ── pgvector canonical types (asyncpg codec path) ──────────
# register_vector installs the codec ON each pool connection; Vector
# is the parameter type asyncpg serializes (README oficial pgvector).
# Fallback a lista plana: sin pgvector el store es importable y solo
# falla si el backend realmente corre SQL.
try:
    from pgvector import Vector as _PgVector

    _VectorParam = _PgVector
except ImportError:  # pragma: no cover - env sin pgvector
    _VectorParam = list  # type: ignore[assignment,misc]

# ── Shared constants (identical to the chromadb store) ──────

# Access level hierarchy for metadata filtering
ACCESS_HIERARCHY: dict[str, int] = {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "restricted": 3,
}

# Role → max access level
ROLE_ACCESS: dict[str, int] = {
    "admin": 3,      # Can see everything
    "junta": 2,      # Up to confidential
    "staff": 1,      # Up to internal
    "socio": 0,      # Public only
}

_DEFAULT_DIMENSION = 1024  # bge-m3 (EmbeddingService._DEFAULT_DIMENSION)
_DEFAULT_TABLE = "rag_chunks"

# Ola 2.2 opt-in flag (patrón de la casa: default = comportamiento
# previo exacto; el swap solo vive si el operador lo pide).
_RAG_BACKEND_ENV = "CLUB_RAG_BACKEND"


def build_vectorstore(
    persist_dir: str | None = None,
    collection_name: str | None = None,
) -> PgVectorStore | ChromaVectorStore:
    """
    Factory (Ola 2.2): ChromaVectorStore por default, PgVectorStore opt-in.

    CLUB_RAG_BACKEND=pgvector (env) → PgVectorStore (tabla rag_chunks).
    Cualquier otro valor / unset → ChromaVectorStore — el comportamiento
    previo exacto, cero cambio para quien no opta (patrón swap opt-in
    de las 17 verticales de repos ORM).

    Args: None = NO pasar (los defaults del store receptor aplican —
    pasar "" rompería el path de chromadb); solo se forwardea lo que
    el caller pidió explícitamente.
    """
    import os

    kwargs: dict[str, str] = {}
    if persist_dir is not None:
        kwargs["persist_dir"] = persist_dir
    if collection_name is not None:
        kwargs["collection_name"] = collection_name

    backend = os.environ.get(_RAG_BACKEND_ENV, "").strip().lower()
    if backend == "pgvector":
        return PgVectorStore(**kwargs)  # type: ignore[arg-type]
    from club_mcp.rag.vectorstore import ChromaVectorStore

    return ChromaVectorStore(**kwargs)


class PgVectorStore:
    """
    PostgreSQL + pgvector-backed vector store with metadata filtering.

    Same public API as ChromaVectorStore (swap file-for-file):
        store = PgVectorStore()
        store.add(ids, embeddings, documents, metadatas)
        results = store.query(query_embedding, n_results=10, where={...})

    Args:
        dsn: postgres DSN (postgres://user:pass@host:port/db). Falls back
            to CLUB_DATABASE_DSN / settings.database_url translated.
        persist_dir: ACCEPTED AND IGNORED (chromadb compat — data lives
            in PG now, ./data/chromadb dies with this wave).
        collection_name: ACCEPTED AND IGNORED (single table rag_chunks).
    """

    def __init__(
        self,
        dsn: str | None = None,
        persist_dir: str = "",   # chromadb compat — ignored
        collection_name: str = "",  # chromadb compat — ignored
        dimension: int = _DEFAULT_DIMENSION,
        table: str = _DEFAULT_TABLE,
    ) -> None:
        try:
            import asyncpg  # type: ignore[import-untyped]  # noqa: F401
        except ImportError as exc:
            raise ImportError(
                "asyncpg is required for PgVectorStore. "
                "Install with: pip install asyncpg"
            ) from exc

        if dsn is None:
            dsn = self._default_dsn()
        self._dsn = self._normalize_dsn(dsn)
        self._dimension = dimension
        self._table = table
        self._pool: Any = None
        self._pool_lock = threading.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._loop_thread: threading.Thread | None = None

        logger.info(
            "[pgvectorstore] Store ready (table=%s, dim=%d, dsn=%s)",
            table, dimension, self._dsn_secret(),
        )

    # ── DSN helpers ────────────────────────────────────────

    @staticmethod
    def _default_dsn() -> str:
        """CLUB_DATABASE_DSN > settings.database_url (translated to asyncpg)."""
        import os

        env = os.environ.get("CLUB_DATABASE_DSN")
        if env:
            return env
        from club_mcp.config.settings import get_settings

        url = get_settings().database_url
        # sqlalchemy URL → asyncpg DSN
        if url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return url

    @staticmethod
    def _normalize_dsn(dsn: str) -> str:
        return dsn.replace("postgresql+asyncpg://", "postgresql://", 1)

    def _dsn_secret(self) -> str:
        dsn = self._dsn
        if "@" in dsn:
            scheme, rest = dsn.split("://", 1)
            creds, host = rest.rsplit("@", 1)
            user = creds.split(":", 1)[0] if ":" in creds else creds
            return f"{scheme}://{user}:***@{host}"
        return dsn

    # ── sync→async bridge ─────────────────────────────────

    def _run(self, coro: Any) -> Any:
        """Run a coroutine from sync context.

        Fast path: no running loop → asyncio.run (fresh loop each call).

        Async context: a private daemon loop in a thread executes the
        coroutine (asyncio.run would raise "cannot run inside a running
        loop"). The pool binds to whichever loop runs the coroutine.

        NOTE: coro must obtain the pool itself (via _acquire) so a
        connection failure never orphans the caller's coroutine.
        """
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(coro)

        loop = self._ensure_private_loop()
        fut = asyncio.run_coroutine_threadsafe(coro, loop)
        return fut.result()

    def _ensure_private_loop(self) -> asyncio.AbstractEventLoop:
        """The bridge loop (daemon thread) for async-context callers."""
        if self._loop is None or not self._loop.is_running():
            with self._loop_lock:
                if self._loop is None or not self._loop.is_running():
                    self._loop = asyncio.new_event_loop()
                    self._loop_thread = threading.Thread(
                        target=self._loop.run_forever,
                        name="pgvectorstore-bridge",
                        daemon=True,
                    )
                    self._loop_thread.start()
        return self._loop

    _loop_lock: threading.Lock = threading.Lock()

    async def _acquire(self) -> Any:
        """Async context manager yielding a pooled connection.

        The pool is created lazily ON the loop that runs the coroutine
        (asyncpg pools are loop-bound). Used by every SQL helper —
        never by _run, so a connection failure surfaces as a normal
        exception and the caller's coroutine is never orphaned.
        """
        import asyncpg

        @asynccontextmanager
        async def _ctx() -> Any:
            if self._pool is None:
                # register_vector en cada conexión del pool (patrón
                # canónico pgvector/asyncpg): instala el codec que
                # serializa Vector params y lee columnas vector.
                from pgvector.asyncpg import register_vector

                async def _init(conn: Any) -> None:
                    await register_vector(conn)

                self._pool = await asyncpg.create_pool(
                    self._dsn, min_size=1, max_size=4, init=_init
                )
            async with self._pool.acquire() as conn:
                yield conn

        return _ctx()

    # ── connection for one-shot SQL (create_all path) ──────

    async def _ensure_table(self) -> None:
        """CREATE TABLE IF NOT EXISTS + indexes (idempotent).

        The persistence suites create the schema with
        Base.metadata.create_all BEFORE the store runs; this is the
        safety net for direct usage (routes singleton, RAGService
        default). CREATE EXTENSION requires superuser — in the
        pgvector/pgvector:pg16 CI service it is preinstalled, and
        alembic 0019 is the production path; here it is best-effort
        (failures surface on the first real SQL statement).
        """
        async with await self._acquire() as conn:
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            except Exception as exc:
                logger.debug(
                    "[pgvectorstore] CREATE EXTENSION skipped (%s) — "
                    "se asume preinstalada", exc,
                )
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {self._table} (
                    chunk_id        VARCHAR(64) PRIMARY KEY,
                    document_id     VARCHAR(64) NOT NULL,
                    document        TEXT NOT NULL,
                    embedding       VECTOR({self._dimension}) NOT NULL,
                    access_level    INTEGER NOT NULL DEFAULT 0,
                    metadata_json   JSONB NOT NULL DEFAULT '{{}}'::jsonb
                )
            """)
            await conn.execute(f"""
                CREATE INDEX IF NOT EXISTS ix_{self._table}_document_id
                ON {self._table} (document_id)
            """)
            await conn.execute(f"""
                CREATE INDEX IF NOT EXISTS ix_{self._table}_access_level
                ON {self._table} (access_level)
            """)

    # ── CRUD ───────────────────────────────────────────────

    def add(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """
        Add chunks with embeddings and metadata (same contract as chromadb).

        Metadata split: access_level → dedicated column (WHERE $lte lives
        here), everything else → metadata_json (JSONB). Values sanitized
        exactly like the chromadb store (str/int/float/bool; lists/dicts
        → JSON strings; None → "").
        """
        if not ids:
            return

        rows = []
        for chunk_id, emb, doc, meta in zip(
            ids, embeddings, documents, metadatas, strict=True
        ):
            sanitized = self._sanitize_metadata(meta)
            access = sanitized.pop("access_level", 0)
            access = int(access) if isinstance(access, (int, float, bool)) else 0
            rows.append((
                chunk_id,
                sanitized.pop("document_id", ""),
                doc,
                _VectorParam(emb),
                access,
                json.dumps(sanitized, ensure_ascii=False),
            ))

        self._run(self._add_rows(rows))
        logger.info("[pgvectorstore] Added %d chunks", len(ids))

    async def _add_rows(self, rows: list[tuple[Any, ...]]) -> None:
        async with await self._acquire() as conn:
            await conn.executemany(
                f"""
                INSERT INTO {self._table}
                    (chunk_id, document_id, document, embedding, access_level, metadata_json)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                ON CONFLICT (chunk_id) DO UPDATE SET
                    document_id = EXCLUDED.document_id,
                    document = EXCLUDED.document,
                    embedding = EXCLUDED.embedding,
                    access_level = EXCLUDED.access_level,
                    metadata_json = EXCLUDED.metadata_json
                """,
                rows,
            )

    def query(
        self,
        embedding: list[float],
        n_results: int = 10,
        where: dict[str, Any] | None = None,
        where_document: dict[str, Any] | None = None,  # chromadb compat — unimplemented
    ) -> list[dict[str, Any]]:
        """
        Query by embedding with optional metadata filtering.

        Same return contract: list of {id, document, metadata, distance,
        score} dicts, score = 1 - cosine distance (embeddings are
        normalized → cosine similarity), rounded to 4 decimals.

        where: the subset the codebase actually uses —
            {"access_level": {"$lte": N}} and {"k": v} equality
            (document_id, category, document_type). Anything else
            raises ValueError BEFORE touching the DB (fail-fast, no
            silent empty results).
        """
        # offset=2: $1 es el embedding (Vector), $2 el LIMIT — las
        # cláusulas where empiezan en $3 (lección run #67: sin el
        # offset, "access_level <= $1" comparaba INTEGER contra VECTOR).
        clauses, where_params = self._where_to_sql(where, offset=2)

        sql = f"""
            SELECT chunk_id, document, metadata_json, access_level,
                   embedding <=> $1 AS distance
            FROM {self._table}
        """
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY distance ASC LIMIT $2"
        params: list[Any] = [_VectorParam(embedding), n_results, *where_params]

        results = self._run(self._fetch_all(sql, *params))
        total_all = self.count()
        if total_all == 0:
            return []

        items: list[dict[str, Any]] = []
        for chunk_id, document, meta_json, access, distance in results:
            meta: dict[str, Any] = json.loads(meta_json) if meta_json else {}
            meta["access_level"] = access
            score = round(max(0.0, 1.0 - distance), 4)
            items.append({
                "id": chunk_id,
                "document": document,
                "metadata": meta,
                "distance": round(float(distance), 4),
                "score": score,
            })
        return items

    async def _fetch_all(self, sql: str, *params: Any) -> list[tuple[Any, ...]]:
        async with await self._acquire() as conn:
            rows: list[tuple[Any, ...]] = await conn.fetch(sql, *params)
            return rows

    def _where_to_sql(
        self, where: dict[str, Any] | None, offset: int = 0
    ) -> tuple[list[str], list[Any]]:
        """Translate the where-language subset to SQL clauses.

        offset: número de placeholders $n que YA ocupan posición en
        la sentencia destino (query() usa $1 embedding + $2 LIMIT).

        Subset (inventory of real usage): $lte on access_level, plain
        equality on document_id / category / document_type. The JSONB
        metadata path uses the contained operator (->>) so equality
        works on any metadata key; $lte is reserved for access_level
        (dedicated column — index-backed).
        """
        if not where:
            return [], []
        clauses: list[str] = []
        params: list[Any] = []
        for key, cond in where.items():
            if isinstance(cond, dict):
                if len(cond) != 1 or "$lte" not in cond:
                    raise ValueError(
                        f"PgVectorStore.where: unsupported operator {cond!r} "
                        f"on {key!r} (supported: ${{'$lte': N}} or plain value)"
                    )
                if key != "access_level":
                    raise ValueError(
                        "PgVectorStore.where: $lte only on access_level "
                        "(dedicated column)"
                    )
                clauses.append(f"access_level <= ${len(params) + offset + 1}")
                params.append(int(cond["$lte"]))
            else:
                if key == "access_level":
                    clauses.append(f"access_level = ${len(params) + offset + 1}")
                    params.append(int(cond))
                else:
                    clauses.append(
                        f"metadata_json->>{self._quote_literal(key)} "
                        f"= ${len(params) + offset + 1}"
                    )
                    params.append(str(cond))
        return clauses, params

    @staticmethod
    def _quote_literal(key: str) -> str:
        """Safely quote a metadata key for ->> operator (no injection)."""
        return "'" + key.replace("'", "''") + "'"

    def get_by_ids(self, ids: list[str]) -> list[dict[str, Any]]:
        """Retrieve specific chunks by their IDs (same shape as chromadb)."""
        if not ids:
            return []
        rows = self._run(self._get_by_ids_rows(ids))
        items: list[dict[str, Any]] = []
        for chunk_id, document, meta_json in rows:
            meta: dict[str, Any] = json.loads(meta_json) if meta_json else {}
            meta["access_level"] = None  # not selected — same as chromadb shape
            items.append({
                "id": chunk_id,
                "document": document,
                "metadata": meta,
            })
        return items

    async def _get_by_ids_rows(self, ids: list[str]) -> list[tuple[Any, ...]]:
        async with await self._acquire() as conn:
            rows = await conn.fetch(
                f"SELECT chunk_id, document, metadata_json FROM {self._table} "
                f"WHERE chunk_id = ANY($1)",
                ids,
            )
            return [tuple(r) for r in rows]

    def update(
        self,
        ids: list[str],
        embeddings: list[list[float]] | None = None,
        documents: list[str] | None = None,
        metadatas: list[dict[str, Any]] | None = None,
    ) -> None:
        """Update existing chunks by ID (same contract as chromadb)."""
        if not ids:
            return
        for i, chunk_id in enumerate(ids):
            sets: list[str] = []
            params: list[Any] = []
            if embeddings is not None:
                sets.append(f"embedding = ${len(params) + 1}")
                params.append(_VectorParam(embeddings[i]))
            if documents is not None:
                sets.append(f"document = ${len(params) + 1}")
                params.append(documents[i])
            if metadatas is not None:
                sanitized = self._sanitize_metadata(metadatas[i])
                access = sanitized.pop("access_level", None)
                if access is not None:
                    sets.append(f"access_level = ${len(params) + 1}")
                    params.append(int(access) if isinstance(access, (int, float, bool)) else 0)
                if sanitized:
                    sets.append(f"metadata_json = ${len(params) + 1}::jsonb")
                    params.append(json.dumps(sanitized, ensure_ascii=False))
            if not sets:
                continue
            params.append(chunk_id)
            self._run(self._execute(
                f"UPDATE {self._table} SET {', '.join(sets)} "
                f"WHERE chunk_id = ${len(params)}",
                *params,
            ))
        logger.info("[pgvectorstore] Updated %d chunks", len(ids))

    def delete_by_document(self, document_id: str) -> int:
        """
        Delete all chunks belonging to a document.

        Returns: number of chunks deleted.
        """
        n = self._run(self._delete_document_rows(document_id))
        if n:
            logger.info(
                "[pgvectorstore] Deleted %d chunks for document '%s'",
                n, document_id,
            )
        return int(n)

    async def _delete_document_rows(self, document_id: str) -> int:
        async with await self._acquire() as conn:
            n = await conn.execute(
                f"DELETE FROM {self._table} WHERE document_id = $1",
                document_id,
            )
            # asyncpg returns "DELETE n"
            return int(str(n).split()[-1])

    def delete_by_ids(self, ids: list[str]) -> None:
        """Delete specific chunks by ID."""
        if ids:
            self._run(self._execute(
                f"DELETE FROM {self._table} WHERE chunk_id = ANY($1)",
                ids,
            ))

    def get_chunks_by_document(
        self,
        document_id: str,
        limit: int | None = None,
        include: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Raw chunks of a document by metadata (0055 public API).

        Same shape as the chromadb store: the native get() payload
        (ids/documents/metadatas). include is accepted (compat) —
        metadatas are always returned as dicts with access_level
        merged from its column.
        """
        limit_sql = f" LIMIT {int(limit)}" if limit is not None else ""
        rows = self._run(self._get_chunks_rows(document_id, limit_sql))
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []
        for chunk_id, document, meta_json, access in rows:
            ids.append(chunk_id)
            documents.append(document)
            meta: dict[str, Any] = json.loads(meta_json) if meta_json else {}
            meta["access_level"] = access
            metadatas.append(meta)
        return {"ids": ids, "documents": documents, "metadatas": metadatas}

    async def _get_chunks_rows(
        self, document_id: str, limit_sql: str
    ) -> list[tuple[Any, ...]]:
        async with await self._acquire() as conn:
            rows = await conn.fetch(
                f"SELECT chunk_id, document, metadata_json, access_level "
                f"FROM {self._table} WHERE document_id = $1"
                f"{limit_sql} ORDER BY chunk_id",
                document_id,
            )
            return [tuple(r) for r in rows]

    # ── Access control helpers ────────────────────────────

    def query_with_access(
        self,
        embedding: list[float],
        user_role: str,
        n_results: int = 10,
        category: str | None = None,
        document_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Query with automatic access level filtering by user role.

        Same contract: filtered results the user is authorized to see.
        """
        max_level = ROLE_ACCESS.get(user_role, 0)

        where: dict[str, Any] = {
            "access_level": {"$lte": max_level},
        }

        if category:
            where["category"] = category
        if document_type:
            where["document_type"] = document_type

        return self.query(embedding=embedding, n_results=n_results, where=where)

    # ── Stats ─────────────────────────────────────────────

    def get_stats(self) -> dict[str, Any]:
        """
        Get aggregated statistics of the vector store.

        Same shape as the chromadb store: total_chunks, by_type,
        by_category, by_access_level, total_documents, total_size_bytes.
        """
        rows = self._run(self._stats_rows())
        if not rows or rows[0][0] == 0:
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "by_type": {},
                "by_category": {},
                "by_access_level": {},
            }
        count, total_bytes = rows[0][0], rows[0][1]
        group_rows = self._run(self._stats_group_rows())
        by_type: dict[str, int] = {}
        by_category: dict[str, int] = {}
        by_access: dict[str, int] = {}
        doc_ids: set[str] = set()
        for t, c, a, d in group_rows:
            by_type[t] = by_type.get(t, 0) + 1
            by_category[c] = by_category.get(c, 0) + 1
            a_str = str(a)
            by_access[a_str] = by_access.get(a_str, 0) + 1
            if d:
                doc_ids.add(d)
        return {
            "total_chunks": count,
            "total_documents": len(doc_ids),
            "total_size_bytes": total_bytes,
            "by_type": by_type,
            "by_category": by_category,
            "by_access_level": by_access,
        }

    async def _stats_rows(self) -> list[tuple[Any, ...]]:
        async with await self._acquire() as conn:
            return [tuple(r) for r in await conn.fetch(
                f"SELECT COUNT(*), COALESCE(SUM(OCTET_LENGTH(document)), 0) "
                f"FROM {self._table}"
            )]

    async def _stats_group_rows(self) -> list[tuple[Any, ...]]:
        async with await self._acquire() as conn:
            rows = await conn.fetch(
                f"SELECT chunk_id, document, metadata_json, access_level, document_id "
                f"FROM {self._table}"
            )
            out = []
            for r in rows:
                meta = json.loads(r["metadata_json"]) if r["metadata_json"] else {}
                out.append((
                    meta.get("document_type", "unknown"),
                    meta.get("category", "unknown"),
                    r["access_level"],
                    r["document_id"],
                ))
            return out

    def count(self) -> int:
        """Total chunks in the collection (table)."""
        return int(self._run(self._count_rows()))

    async def _count_rows(self) -> int:
        async with await self._acquire() as conn:
            n: int = await conn.fetchval(f"SELECT COUNT(*) FROM {self._table}")
            return n

    async def _execute(self, sql: str, *params: Any) -> None:
        async with await self._acquire() as conn:
            await conn.execute(sql, *params)

    # ── Internal helpers ──────────────────────────────────

    @staticmethod
    def _sanitize_metadata(meta: dict[str, Any]) -> dict[str, Any]:
        """
        Ensure all metadata values are storage-compatible types.

        Same behavior as the chromadb store (str/int/float/bool;
        lists/dicts → JSON strings; None → ""), so JSONB columns hold
        the same values chromadb metadata held.
        """
        sanitized: dict[str, Any] = {}
        for key, value in meta.items():
            if isinstance(value, (str, int, float, bool)):
                sanitized[key] = value
            elif value is None:
                sanitized[key] = ""
            elif isinstance(value, (list, dict)):
                sanitized[key] = json.dumps(value, ensure_ascii=False)
            else:
                sanitized[key] = str(value)
        return sanitized

    # ── Teardown (tests) ──────────────────────────────────

    def close(self) -> None:
        """Close pools and the bridge loop (idempotent, test teardown)."""
        coro = self._close_async()
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(coro)
            self._pool = None
            return
        loop = self._ensure_private_loop()
        asyncio.run_coroutine_threadsafe(coro, loop).result()
        self._pool = None

    async def _close_async(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
