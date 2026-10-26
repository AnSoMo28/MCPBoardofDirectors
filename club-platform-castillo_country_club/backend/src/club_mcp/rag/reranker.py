"""
Cross-Encoder Reranker — precision re-ranking for RAG pipeline.

Model: BAAI/bge-reranker-v2-m3
    - Multilingual (Spanish native)
    - Cross-encoder: passes (query, document) jointly → precise relevance
    - Improves precision@5 by ~15-25% vs hybrid-only search

Bypass logic:
    If total_candidates <= 5, reranking adds latency without much benefit.
    Return candidates sorted by hybrid score directly.

Usage:
    reranker = Reranker()
    reranked = await reranker.rerank(
        query="presupuesto aprobado 2024",
        candidates=search_results,
        top_k=10,
    )
"""

from __future__ import annotations

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "BAAI/bge-reranker-v2-m3"
_BYPASS_THRESHOLD = 5  # Skip reranking if ≤ 5 candidates


class Reranker:
    """
    Cross-encoder reranker with GPU auto-detection and conditional bypass.

    Lazy-loads the model on first use.
    Bypasses reranking when result set is small (≤5 candidates).

    Args:
        model_name: HuggingFace model identifier.
        device: Force device. None = auto-detect.
        bypass_threshold: Skip reranking if candidates ≤ this number.
    """

    def __init__(
        self,
        model_name: str = _DEFAULT_MODEL,
        device: str | None = None,
        bypass_threshold: int = _BYPASS_THRESHOLD,
    ) -> None:
        self.model_name = model_name
        self._forced_device = device
        self._bypass_threshold = bypass_threshold
        self._model: Any = None
        self._device: str = "cpu"

    def _ensure_loaded(self) -> None:
        """Lazy-load the CrossEncoder model."""
        if self._model is not None:
            return

        try:
            import torch
            from sentence_transformers import CrossEncoder
        except ImportError as exc:
            raise ImportError(
                "sentence-transformers is required for reranking. "
                "Install with: pip install sentence-transformers"
            ) from exc

        if self._forced_device:
            self._device = self._forced_device
        elif torch.cuda.is_available():
            self._device = "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self._device = "mps"
        else:
            self._device = "cpu"

        logger.info(
            "[reranker] Loading model '%s' on %s...",
            self.model_name, self._device,
        )

        self._model = CrossEncoder(
            self.model_name,
            max_length=512,
            device=self._device,
        )

        logger.info(
            "[reranker] Model loaded: %s | device=%s",
            self.model_name, self._device,
        )

    # ── Public API ────────────────────────────────────────

    async def rerank(
        self,
        query: str,
        candidates: list[Any],
        top_k: int = 10,
    ) -> list[Any]:
        """
        Rerank search candidates by cross-encoder relevance.

        Args:
            query: Original user query.
            candidates: List of SearchResult objects (must have .content or .id).
            top_k: Number of top results to return.

        Returns:
            Reranked list of candidates, trimmed to top_k.
            Each candidate gets an updated .final_score.
        """
        if not candidates:
            return []

        # Bypass: small result set
        if len(candidates) <= self._bypass_threshold:
            logger.info(
                "[reranker] Bypass: %d candidates ≤ %d threshold",
                len(candidates), self._bypass_threshold,
            )
            return candidates[:top_k]

        self._ensure_loaded()

        start = time.time()

        # Build query-document pairs for cross-encoder
        pairs = []
        for candidate in candidates:
            doc_text = self._get_candidate_text(candidate)
            pairs.append([query, doc_text])

        # Score with cross-encoder
        scores = self._model.predict(pairs, show_progress_bar=False)

        # Attach scores to candidates
        for i, candidate in enumerate(candidates):
            # Cross-encoder scores are logits, normalize to [0, 1]
            raw_score = float(scores[i])
            normalized = self._sigmoid(raw_score)
            candidate.final_score = round(normalized, 4)

        # Sort by final_score descending
        reranked = sorted(candidates, key=lambda c: c.final_score, reverse=True)
        result = reranked[:top_k]

        elapsed_ms = round((time.time() - start) * 1000)
        logger.info(
            "[reranker] Reranked %d → %d candidates (%dms, device=%s)",
            len(candidates), len(result), elapsed_ms, self._device,
        )

        return result

    # ── Helpers ───────────────────────────────────────────

    @staticmethod
    def _get_candidate_text(candidate: Any) -> str:
        """Extract text content from a candidate for reranking."""
        # SearchResult from search.py
        if hasattr(candidate, "content") and candidate.content:
            return candidate.content[:512]  # Truncate for cross-encoder

        # Fallback: use metadata content if available
        if hasattr(candidate, "metadata"):
            content = candidate.metadata.get("content", "")
            if content:
                return content[:512]

        # Last resort: file_name + document_type
        if hasattr(candidate, "file_name"):
            return f"{candidate.file_name} {candidate.document_type}"

        return ""

    @staticmethod
    def _sigmoid(x: float) -> float:
        """Sigmoid normalization for cross-encoder logits."""
        import math
        return 1.0 / (1.0 + math.exp(-min(max(x, -20), 20)))

    @property
    def is_gpu(self) -> bool:
        """Whether running on GPU."""
        if self._model is None:
            return False
        return self._device in ("cuda", "mps")

    @property
    def model_info(self) -> dict[str, Any]:
        """Model metadata for diagnostics."""
        return {
            "model_name": self.model_name,
            "device": self._device if self._model else "not_loaded",
            "bypass_threshold": self._bypass_threshold,
            "is_gpu": self.is_gpu,
        }
