"""
Embedding Service — vector embeddings for RAG pipeline.

Primary model: BAAI/bge-m3 (multilingual, 1024 dimensions)
    - Spanish-native — no translation needed
    - Dense retrieval optimized
    - Self-hosted — zero API calls, data sovereignty

Auto-detects GPU/CPU:
    - GPU: ~50ms per batch of 32
    - CPU: ~500ms per batch of 32

Usage:
    service = EmbeddingService()
    vectors = service.embed_documents(["chunk 1", "chunk 2"])
    query_vec = service.embed_query("pregunta del usuario")
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Default model — top-tier multilingual RAG embedding 2025-2026
_DEFAULT_MODEL = "BAAI/bge-m3"
_DEFAULT_DIMENSION = 1024


class EmbeddingService:
    """
    Embedding service with GPU auto-detection.

    Lazy-loads the model on first use to avoid startup cost.
    Thread-safe after initial load (model is read-only).
    """

    def __init__(
        self,
        model_name: str = _DEFAULT_MODEL,
        device: str | None = None,
    ) -> None:
        """
        Args:
            model_name: HuggingFace model identifier.
            device: Force device ("cuda", "cpu"). None = auto-detect.
        """
        self.model_name = model_name
        self._forced_device = device
        self._model: Any = None
        self._device: str = "cpu"
        self._dimension: int = _DEFAULT_DIMENSION

    def _ensure_loaded(self) -> None:
        """Lazy-load the SentenceTransformer model."""
        if self._model is not None:
            return

        try:
            import torch
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ImportError(
                "sentence-transformers is required. "
                "Install with: pip install sentence-transformers"
            ) from exc

        # Auto-detect device
        if self._forced_device:
            self._device = self._forced_device
        elif torch.cuda.is_available():
            self._device = "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self._device = "mps"  # Apple Silicon
        else:
            self._device = "cpu"

        logger.info(
            "[embeddings] Loading model '%s' on %s...",
            self.model_name, self._device,
        )

        self._model = SentenceTransformer(
            self.model_name,
            device=self._device,
        )
        self._dimension = self._model.get_sentence_embedding_dimension()

        logger.info(
            "[embeddings] Model loaded: %s | device=%s | dim=%d",
            self.model_name, self._device, self._dimension,
        )

    # ── Public API ────────────────────────────────────────

    def embed_documents(
        self,
        texts: list[str],
        batch_size: int = 32,
        show_progress: bool = False,
    ) -> list[list[float]]:
        """
        Embed a batch of document texts.

        Args:
            texts: List of text chunks to embed.
            batch_size: Batch size for encoding (larger = faster on GPU).
            show_progress: Show tqdm progress bar.

        Returns:
            List of embedding vectors (one per input text).
        """
        if not texts:
            return []

        self._ensure_loaded()

        embeddings = self._model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            normalize_embeddings=True,  # Cosine similarity ready
        )

        logger.info(
            "[embeddings] Embedded %d documents (%s, batch=%d)",
            len(texts), self._device, batch_size,
        )

        return embeddings.tolist()

    def embed_query(self, query: str) -> list[float]:
        """
        Embed a single query string.

        Uses the same model but encodes as a single item
        (important for models that differentiate doc vs query encoding).

        Args:
            query: User query text.

        Returns:
            Embedding vector.
        """
        if not query.strip():
            raise ValueError("Cannot embed empty query")

        self._ensure_loaded()

        embedding = self._model.encode(
            [query],
            normalize_embeddings=True,
        )

        return embedding[0].tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Alias for embed_documents with progress bar disabled."""
        return self.embed_documents(texts, batch_size=batch_size)

    # ── Properties ────────────────────────────────────────

    @property
    def dimension(self) -> int:
        """Embedding dimension (loads model if needed)."""
        self._ensure_loaded()
        return self._dimension

    @property
    def device(self) -> str:
        """Active compute device."""
        self._ensure_loaded()
        return self._device

    @property
    def is_gpu(self) -> bool:
        """Whether running on GPU."""
        self._ensure_loaded()
        return self._device in ("cuda", "mps")

    @property
    def model_info(self) -> dict[str, Any]:
        """Model metadata for diagnostics."""
        self._ensure_loaded()
        return {
            "model_name": self.model_name,
            "device": self._device,
            "dimension": self._dimension,
            "is_gpu": self.is_gpu,
        }
