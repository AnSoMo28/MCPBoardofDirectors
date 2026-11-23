"""
Castillo RAG Engine — Retrieval-Augmented Generation pipeline.

Modules:
    parsers     — Document parsing (PDF, Word, Excel, Text)
    chunker     — Semantic-aware text chunking
    embeddings  — Vector embedding generation (bge-m3)
    vectorstore — ChromaDB vector storage with access control
    pg_vectorstore — PostgreSQL + pgvector storage (Ola 2.2 opt-in)

Architecture:
    File → Parser → Chunker → Embedder → VectorStore
                                              ↓
    Query → Embedder → VectorStore → (Block 2: Hybrid Search + Reranker + RAG Service)
"""

__version__ = "1.0.0"

from club_mcp.rag.chunker import ChunkData, ChunkMetadata, SmartChunker
from club_mcp.rag.embeddings import EmbeddingService
from club_mcp.rag.parsers import CleanDocument, DocumentMetadata, DocumentParser
from club_mcp.rag.pg_vectorstore import PgVectorStore, build_vectorstore
from club_mcp.rag.vectorstore import ChromaVectorStore


__all__ = [
    "ChromaVectorStore",
    "ChunkData",
    "ChunkMetadata",
    "CleanDocument",
    "DocumentMetadata",
    "DocumentParser",
    "EmbeddingService",
    "PgVectorStore",
    "SmartChunker",
    "build_vectorstore",
]
