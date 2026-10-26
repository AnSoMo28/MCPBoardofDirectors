"""
ChromaDB Vector Store — persistent vector storage with access control.

Architecture note:
    This module abstracts ChromaDB behind a clean interface.
    To swap to Qdrant or pgvector in F29, replace this file
    with the same public API — no changes needed in parsers,
    chunker, embeddings, or RAG service.

Usage:
    store = ChromaVectorStore()
    store.add(ids, embeddings, documents, metadatas)
    results = store.query(query_embedding, n_results=10, where={...})
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

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

_DEFAULT_PERSIST_DIR = "./data/chromadb"
_DEFAULT_COLLECTION = "castillo_documents"


class ChromaVectorStore:
    """
    ChromaDB-backed vector store with metadata filtering.

    Persistent storage: data survives restarts.
    Cosine distance: normalized embeddings → cosine similarity.

    Args:
        persist_dir: Directory for ChromaDB persistent storage.
        collection_name: Name of the ChromaDB collection.
    """

    def __init__(
        self,
        persist_dir: str = _DEFAULT_PERSIST_DIR,
        collection_name: str = _DEFAULT_COLLECTION,
    ) -> None:
        try:
            import chromadb
        except ImportError as exc:
            raise ImportError(
                "chromadb is required. Install with: pip install chromadb"
            ) from exc

        self._persist_dir = persist_dir
        self._collection_name = collection_name

        self._client = chromadb.PersistentClient(path=persist_dir)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={
                "hnsw:space": "cosine",  # Cosine distance for normalized embeddings
                "hnsw:M": 16,            # HNSW graph connectivity (default 16)
                "hnsw:construction_ef": 200,  # Build quality
                "hnsw:search_ef": 100,   # Search quality
            },
        )

        count = self._collection.count()
        logger.info(
            "[vectorstore] Collection '%s' ready at '%s' (%d chunks)",
            collection_name, persist_dir, count,
        )

    # ── CRUD ──────────────────────────────────────────────

    def add(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """
        Add chunks with embeddings and metadata.

        Args:
            ids: Unique chunk IDs.
            embeddings: Vector embeddings (same length as ids).
            documents: Chunk text content.
            metadatas: Metadata dicts (document_id, access_level, etc.).
        """
        if not ids:
            return

        # ChromaDB requires metadata values to be str/int/float/bool
        sanitized = [self._sanitize_metadata(m) for m in metadatas]

        self._collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=sanitized,
        )

        logger.info("[vectorstore] Added %d chunks", len(ids))

    def query(
        self,
        embedding: list[float],
        n_results: int = 10,
        where: dict[str, Any] | None = None,
        where_document: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Query by embedding with optional metadata filtering.

        Args:
            embedding: Query vector.
            n_results: Maximum results to return.
            where: ChromaDB metadata filter (e.g., {"access_level": {"$lte": 1}}).
            where_document: ChromaDB document content filter.

        Returns:
            List of {id, document, metadata, distance, score} dicts.
            score = 1 - distance (cosine similarity).
        """
        total = self._collection.count()
        if total == 0:
            return []

        kwargs: dict[str, Any] = {
            "query_embeddings": [embedding],
            "n_results": min(n_results, total),
        }
        if where:
            kwargs["where"] = where
        if where_document:
            kwargs["where_document"] = where_document

        try:
            results = self._collection.query(**kwargs)
        except Exception as exc:
            logger.error("[vectorstore] Query error: %s", exc)
            return []

        return self._unpack_results(results)

    def get_by_ids(self, ids: list[str]) -> list[dict[str, Any]]:
        """Retrieve specific chunks by their IDs."""
        if not ids:
            return []

        results = self._collection.get(ids=ids, include=["documents", "metadatas"])
        items = []
        for i, chunk_id in enumerate(results.get("ids", [])):
            items.append({
                "id": chunk_id,
                "document": results["documents"][i] if results.get("documents") else "",
                "metadata": results["metadatas"][i] if results.get("metadatas") else {},
            })
        return items

    def update(
        self,
        ids: list[str],
        embeddings: list[list[float]] | None = None,
        documents: list[str] | None = None,
        metadatas: list[dict[str, Any]] | None = None,
    ) -> None:
        """Update existing chunks by ID."""
        kwargs: dict[str, Any] = {"ids": ids}
        if embeddings is not None:
            kwargs["embeddings"] = embeddings
        if documents is not None:
            kwargs["documents"] = documents
        if metadatas is not None:
            kwargs["metadatas"] = [self._sanitize_metadata(m) for m in metadatas]

        self._collection.update(**kwargs)
        logger.info("[vectorstore] Updated %d chunks", len(ids))

    def delete_by_document(self, document_id: str) -> int:
        """
        Delete all chunks belonging to a document.

        Returns:
            Number of chunks deleted.
        """
        results = self._collection.get(
            where={"document_id": document_id},
        )

        ids = results.get("ids", [])
        if ids:
            self._collection.delete(ids=ids)
            logger.info(
                "[vectorstore] Deleted %d chunks for document '%s'",
                len(ids), document_id,
            )

        return len(ids)

    def delete_by_ids(self, ids: list[str]) -> None:
        """Delete specific chunks by ID."""
        if ids:
            self._collection.delete(ids=ids)

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

        Args:
            embedding: Query vector.
            user_role: User role (admin, junta, staff, socio).
            n_results: Max results.
            category: Optional category filter.
            document_type: Optional document type filter.

        Returns:
            Filtered results the user is authorized to see.
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

        Returns:
            Dict with total_chunks, by_type, by_category, by_access_level, etc.
        """
        count = self._collection.count()
        if count == 0:
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "by_type": {},
                "by_category": {},
                "by_access_level": {},
            }

        all_data = self._collection.get(
            include=["metadatas", "documents"],
        )
        metadatas = all_data.get("metadatas", [])
        documents = all_data.get("documents", [])

        by_type: dict[str, int] = {}
        by_category: dict[str, int] = {}
        by_access: dict[str, int] = {}
        doc_ids: set[str] = set()
        total_bytes = 0

        for meta in metadatas:
            t = meta.get("document_type", "unknown")
            by_type[t] = by_type.get(t, 0) + 1

            c = meta.get("category", "unknown")
            by_category[c] = by_category.get(c, 0) + 1

            a = str(meta.get("access_level", 0))
            by_access[a] = by_access.get(a, 0) + 1

            doc_id = meta.get("document_id", "")
            if doc_id:
                doc_ids.add(doc_id)

        for doc_text in documents:
            total_bytes += len(doc_text.encode("utf-8"))

        return {
            "total_chunks": count,
            "total_documents": len(doc_ids),
            "total_size_bytes": total_bytes,
            "by_type": by_type,
            "by_category": by_category,
            "by_access_level": by_access,
        }

    def count(self) -> int:
        """Total chunks in the collection."""
        return self._collection.count()

    # ── Internal helpers ──────────────────────────────────

    @staticmethod
    def _unpack_results(results: dict[str, Any]) -> list[dict[str, Any]]:
        """Unpack ChromaDB query results into flat dicts."""
        items: list[dict[str, Any]] = []

        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i in range(len(ids)):
            distance = distances[i] if i < len(distances) else 0.0
            # cosine distance → similarity score
            score = round(max(0.0, 1.0 - distance), 4)

            items.append({
                "id": ids[i],
                "document": documents[i] if i < len(documents) else "",
                "metadata": metadatas[i] if i < len(metadatas) else {},
                "distance": round(distance, 4),
                "score": score,
            })

        return items

    @staticmethod
    def _sanitize_metadata(meta: dict[str, Any]) -> dict[str, Any]:
        """
        Ensure all metadata values are ChromaDB-compatible types.

        ChromaDB only accepts str, int, float, bool in metadata.
        Lists and dicts are converted to JSON strings.
        """
        import json

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
