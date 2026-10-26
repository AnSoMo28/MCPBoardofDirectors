"""models module."""
from club_mcp.models.age_group_activity import (
    AgeGroupActivity,
    AgeGroupActivityCreate,
    AgeGroupCategory,
    AgeGroupDemographics,
    AgeGroupSummary,
)

from club_mcp.rag.search import HybridSearchEngine, SearchResult
from club_mcp.rag.reranker import Reranker
from club_mcp.rag.conversations import ConversationStore, ConversationSession
from club_mcp.rag.rag_service import RAGService, RAGResponse, SearchResponse, KnowledgeSource


__all__ = [
    ...,
    "AgeGroupActivity",
    "AgeGroupActivityCreate",
    "AgeGroupCategory",
    "AgeGroupDemographics",
    "AgeGroupSummary",
    # Bloque 1
    "DocumentParser", "CleanDocument", "DocumentMetadata",
    "SmartChunker", "ChunkData", "ChunkMetadata",
    "EmbeddingService",
    "ChromaVectorStore",
    # Bloque 2
    "HybridSearchEngine", "SearchResult",
    "Reranker",
    "ConversationStore", "ConversationSession",
    "RAGService", "RAGResponse", "SearchResponse", "KnowledgeSource",
]
