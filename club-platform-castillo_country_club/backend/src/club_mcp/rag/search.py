"""
Hybrid Search Engine — BM25 + Vector + RRF fusion.

Combines keyword search (BM25) with semantic search (vector embeddings)
using Reciprocal Rank Fusion (RRF) for superior retrieval quality.

Why hybrid:
    BM25:   Excellent for exact terms ("contrato #2023-045")
    Vector: Excellent for meaning ("acuerdos sobre cuotas de mantenimiento")
    RRF:    Best of both — ranked fusion without score normalization

Usage:
    search = HybridSearchEngine(embedding_service, vector_store)
    results = await search.search(
        query="presupuesto aprobado 2024",
        user_role="admin",
        top_k=20,
    )
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# RRF constant — k=60 is the standard from the original RRF paper
_RRF_K = 60


# ── Search Result ─────────────────────────────────────────


@dataclass
class SearchResult:
    """A single search result with fused scoring."""
    id: str
    document_id: str
    file_name: str
    document_type: str
    category: str
    access_level: int
    content: str
    bm25_rank: int = 0
    vector_rank: int = 0
    bm25_score: float = 0.0
    vector_score: float = 0.0
    rrf_score: float = 0.0
    final_score: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


# ── Hybrid Search Engine ──────────────────────────────────


class HybridSearchEngine:
    """
    Hybrid BM25 + Vector search with RRF fusion.

    BM25 index is built incrementally as documents are ingested.
    Vector search delegates to ChromaVectorStore.

    Args:
        embedding_service: EmbeddingService instance for query embedding.
        vector_store: ChromaVectorStore instance for vector search.
    """

    def __init__(self, embedding_service: Any, vector_store: Any) -> None:
        self._embeddings = embedding_service
        self._vectorstore = vector_store

        # BM25 index — built from all stored documents
        self._bm25: Any = None
        self._bm25_corpus: list[dict[str, Any]] = []  # {id, tokens, metadata}
        self._bm25_dirty = True

    # ── Public API ────────────────────────────────────────

    async def search(
        self,
        query: str,
        user_role: str = "admin",
        top_k: int = 20,
        category: str | None = None,
        document_type: str | None = None,
    ) -> list[SearchResult]:
        """
        Execute hybrid search: BM25 + Vector + RRF fusion.

        Args:
            query: User query string.
            user_role: User role for access control filtering.
            top_k: Maximum results to return.
            category: Optional category filter.
            document_type: Optional document type filter.

        Returns:
            List of SearchResult sorted by fused score (descending).
        """
        if not query.strip():
            return []

        start = time.time()

        # Step 1: BM25 search (keyword)
        bm25_results = self._bm25_search(query, top_k=top_k * 2)

        # Step 2: Vector search (semantic)
        vector_results = self._vector_search(
            query=query,
            user_role=user_role,
            top_k=top_k * 2,
            category=category,
            document_type=document_type,
        )

        # Step 3: RRF Fusion
        fused = self._rrf_fusion(bm25_results, vector_results)

        # Step 4: Trim to top_k
        results = fused[:top_k]

        elapsed_ms = round((time.time() - start) * 1000)
        logger.info(
            "[search] Hybrid search '%s': %d BM25 + %d Vector → %d fused (%dms)",
            query[:50], len(bm25_results), len(vector_results),
            len(results), elapsed_ms,
        )

        return results

    def add_to_index(
        self,
        chunk_ids: list[str],
        texts: list[str],
        metadatas: list[dict[str, Any]],
    ) -> None:
        """
        Add chunks to the BM25 index.

        Call this after ingesting documents into the vector store.
        The BM25 index is rebuilt lazily on next search if dirty.
        """
        for i, (chunk_id, text, meta) in enumerate(zip(chunk_ids, texts, metadatas)):
            tokens = self._tokenize(text)
            self._bm25_corpus.append({
                "id": chunk_id,
                "tokens": tokens,
                "metadata": meta,
            })

        self._bm25_dirty = True
        logger.info("[search] Added %d chunks to BM25 index", len(chunk_ids))

    def remove_from_index(self, document_id: str) -> int:
        """Remove all chunks of a document from BM25 index."""
        before = len(self._bm25_corpus)
        self._bm25_corpus = [
            entry for entry in self._bm25_corpus
            if entry["metadata"].get("document_id") != document_id
        ]
        removed = before - len(self._bm25_corpus)
        if removed:
            self._bm25_dirty = True
            logger.info("[search] Removed %d chunks from BM25 index (doc: %s)", removed, document_id)
        return removed

    def rebuild_index(self) -> None:
        """Force rebuild of BM25 index from current corpus."""
        self._bm25_dirty = True
        self._ensure_bm25()

    @property
    def index_size(self) -> int:
        """Number of chunks in the BM25 index."""
        return len(self._bm25_corpus)

    # ── BM25 Search ───────────────────────────────────────

    def _bm25_search(
        self,
        query: str,
        top_k: int = 40,
    ) -> list[dict[str, Any]]:
        """Keyword search using BM25."""
        self._ensure_bm25()

        if self._bm25 is None or not self._bm25_corpus:
            return []

        query_tokens = self._tokenize(query)
        scores = self._bm25.get_scores(query_tokens)

        # Pair scores with corpus entries and sort
        scored = [
            (i, score) for i, score in enumerate(scores)
            if score > 0
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        results = []
        for rank, (idx, score) in enumerate(scored[:top_k], 1):
            entry = self._bm25_corpus[idx]
            results.append({
                "id": entry["id"],
                "metadata": entry["metadata"],
                "bm25_rank": rank,
                "bm25_score": round(float(score), 4),
            })

        return results

    def _ensure_bm25(self) -> None:
        """Rebuild BM25 index if dirty."""
        if not self._bm25_dirty or not self._bm25_corpus:
            return

        try:
            from rank_bm25 import BM25Okapi
        except ImportError:
            logger.warning("[search] rank-bm25 not installed, BM25 search disabled")
            self._bm25 = None
            return

        tokenized_corpus = [entry["tokens"] for entry in self._bm25_corpus]
        self._bm25 = BM25Okapi(tokenized_corpus)
        self._bm25_dirty = False

        logger.info("[search] BM25 index rebuilt: %d documents", len(tokenized_corpus))

    # ── Vector Search ─────────────────────────────────────

    def _vector_search(
        self,
        query: str,
        user_role: str,
        top_k: int = 40,
        category: str | None = None,
        document_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Semantic search using vector embeddings."""
        try:
            query_embedding = self._embeddings.embed_query(query)
        except Exception as exc:
            logger.error("[search] Embedding error: %s", exc)
            return []

        results = self._vectorstore.query_with_access(
            embedding=query_embedding,
            user_role=user_role,
            n_results=top_k,
            category=category,
            document_type=document_type,
        )

        # Normalize to search format
        normalized = []
        for rank, item in enumerate(results, 1):
            meta = item.get("metadata", {})
            normalized.append({
                "id": item["id"],
                "metadata": meta,
                "vector_rank": rank,
                "vector_score": item.get("score", 0.0),
            })

        return normalized

    # ── RRF Fusion ────────────────────────────────────────

    def _rrf_fusion(
        self,
        bm25_results: list[dict[str, Any]],
        vector_results: list[dict[str, Any]],
    ) -> list[SearchResult]:
        """
        Fuse BM25 and Vector results using Reciprocal Rank Fusion.

        RRF score(d) = Σ 1/(k + rank_i(d))
        where k=60 (standard constant from original RRF paper).

        Results that appear in BOTH rankings get boosted.
        """
        scores: dict[str, float] = {}
        data_map: dict[str, dict[str, Any]] = {}

        # BM25 contributions
        for item in bm25_results:
            chunk_id = item["id"]
            rrf = 1.0 / (_RRF_K + item["bm25_rank"])
            scores[chunk_id] = scores.get(chunk_id, 0.0) + rrf
            data_map[chunk_id] = item

        # Vector contributions
        for item in vector_results:
            chunk_id = item["id"]
            rrf = 1.0 / (_RRF_K + item["vector_rank"])
            scores[chunk_id] = scores.get(chunk_id, 0.0) + rrf

            if chunk_id in data_map:
                # Merge: enrich existing entry with vector data
                data_map[chunk_id]["vector_rank"] = item["vector_rank"]
                data_map[chunk_id]["vector_score"] = item["vector_score"]
            else:
                data_map[chunk_id] = item

        # Sort by RRF score descending
        sorted_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)

        results: list[SearchResult] = []
        for chunk_id in sorted_ids:
            item = data_map[chunk_id]
            meta = item.get("metadata", {})

            results.append(SearchResult(
                id=chunk_id,
                document_id=meta.get("document_id", ""),
                file_name=meta.get("file_name", ""),
                document_type=meta.get("document_type", "other"),
                category=meta.get("category", ""),
                access_level=meta.get("access_level", 0),
                content="",  # Populated by RAG service if needed
                bm25_rank=item.get("bm25_rank", 0),
                vector_rank=item.get("vector_rank", 0),
                bm25_score=item.get("bm25_score", 0.0),
                vector_score=item.get("vector_score", 0.0),
                rrf_score=round(scores[chunk_id], 6),
                final_score=round(scores[chunk_id], 6),
                metadata=meta,
            ))

        return results

    # ── Tokenizer ─────────────────────────────────────────

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """
        Simple whitespace + lowercase tokenizer.

        For production Spanish NLP, consider:
        - Stemming (SnowballStemmer for Spanish)
        - Stopword removal (NLTK Spanish stopwords)
        - Accented character normalization

        Keeping it simple now — BM25's TF-IDF handles
        common words naturally via IDF weighting.
        """
        import re
        text = text.lower()
        text = re.sub(r"[^\wáéíóúñü\s]", " ", text)
        return [t for t in text.split() if len(t) > 1]
