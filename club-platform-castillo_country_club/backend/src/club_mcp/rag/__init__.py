"""
Castillo RAG Engine — Retrieval-Augmented Generation pipeline.

Modules:
    parsers     — Document parsing (PDF, Word, Excel, Text)
    chunker     — Semantic-aware text chunking
    embeddings  — Vector embedding generation (bge-m3)
    vectorstore — ChromaDB vector storage with access control

Architecture:
    File → Parser → Chunker → Embedder → VectorStore
                                              ↓
    Query → Embedder → VectorStore → (Block 2: Hybrid Search + Reranker + RAG Service)
"""

__version__ = "1.0.0"

from club_mcp.rag.parsers import DocumentParser, CleanDocument, DocumentMetadata
from club_mcp.rag.chunker import SmartChunker, ChunkData, ChunkMetadata
from club_mcp.rag.embeddings import EmbeddingService
from club_mcp.rag.vectorstore import ChromaVectorStore

__all__ = [
    "DocumentParser",
    "CleanDocument",
    "DocumentMetadata",
    "SmartChunker",
    "ChunkData",
    "ChunkMetadata",
    "EmbeddingService",
    "ChromaVectorStore",
]
