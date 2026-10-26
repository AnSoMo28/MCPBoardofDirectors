"""
Document intelligence models (RAG).
Club: Castillo Country Club

Aligned with frontend types.ts (DocumentType, DocumentStatus).
Dual state model:
  - DocumentStatus: editorial workflow (draft/published/archived)
  - IngestionStatus: pipeline state (pending_review/approved/rejected/indexed)
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────────
# DocumentType: ALIGNED with frontend types.ts
# These represent WHAT the document IS (governance category),
# not the file format (pdf/docx — that's handled by the parser).


class DocumentType(str, Enum):
    BYLAW = "bylaw"
    REGULATION = "regulation"
    POLICY = "policy"
    MINUTES = "minutes"
    FINANCIAL_REPORT = "financial_report"
    CONTRACT = "contract"
    NEWSLETTER = "newsletter"
    MEMO = "memo"
    FORM = "form"
    OTHER = "other"


class DocumentCategory(str, Enum):
    FINANCIAL = "financial"
    LEGAL = "legal"
    OPERATIONAL = "operational"
    HR = "hr"
    MARKETING = "marketing"
    COMPLIANCE = "compliance"
    GOVERNANCE = "governance"
    MAINTENANCE = "maintenance"


class DocumentAccessLevel(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class DocumentStatus(str, Enum):
    """Editorial workflow status (user-facing)."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class IngestionStatus(str, Enum):
    """Pipeline ingestion status (internal)."""
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    INDEXED = "indexed"


# ── Access hierarchy ───────────────────────────────────────

ACCESS_HIERARCHY: dict[str, int] = {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "restricted": 3,
}


# ── Document (metadata) ───────────────────────────────────

class Document(BaseModel):
    """Document metadata stored in-memory (not the content itself)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str = ""
    file_name: str
    document_type: DocumentType
    category: DocumentCategory
    access_level: DocumentAccessLevel = DocumentAccessLevel.INTERNAL
    status: DocumentStatus = DocumentStatus.DRAFT
    ingestion_status: IngestionStatus = IngestionStatus.INDEXED
    tags: list[str] = Field(default_factory=list)
    chunk_count: int = 0
    content_preview: str = ""
    file_size_bytes: int = 0
    page_count: int = 0
    has_tables: bool = False
    uploaded_by: str = ""
    notes: str = ""
    version: int = 1
    created_at: str = ""
    updated_at: str = ""


class CreateDocument(BaseModel):
    """Input for creating a document metadata entry."""
    title: str = ""
    file_name: str
    document_type: DocumentType
    category: DocumentCategory
    access_level: DocumentAccessLevel = DocumentAccessLevel.INTERNAL
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
    uploaded_by: str = ""


# ── DocumentChunk ──────────────────────────────────────────

class DocumentChunk(BaseModel):
    """A chunk of document content (used by legacy search)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    document_name: str = ""
    chunk_index: int
    content: str
    page_number: int = 0
    score: float = 0.0
    section_title: str = ""
    is_table: bool = False
    created_at: str = ""


# ── KnowledgeReport ────────────────────────────────────────

class KnowledgeReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic: str
    audience: str = "internal"
    summary: str = ""
    source_documents: list[dict[str, Any]] = Field(default_factory=list)
    key_findings: list[str] = Field(default_factory=list)
    date_from: str = ""
    date_to: str = ""
    categories: list[str] = Field(default_factory=list)
    status: str = "draft"
    created_at: str = ""
    updated_at: str = ""


class CreateKnowledgeReport(BaseModel):
    topic: str
    audience: str = "internal"
    summary: str = ""
    source_documents: list[dict[str, Any]] = Field(default_factory=list)
    key_findings: list[str] = Field(default_factory=list)
    date_from: str = ""
    date_to: str = ""
    categories: list[str] = Field(default_factory=list)


# ── Knowledge Query (RAG) ──────────────────────────────────
# These models match the frontend types.ts interfaces exactly.

class KnowledgeSource(BaseModel):
    """A source cited in a RAG response."""
    document_id: str
    title: str
    snippet: str
    relevance: float
    document_type: str


class KnowledgeQueryRequest(BaseModel):
    """Input for RAG conversational query."""
    question: str
    conversation_id: str | None = None
    max_sources: int = 5


class KnowledgeQueryResponse(BaseModel):
    """Output from RAG conversational query."""
    status: str = "success"
    answer: str
    sources: list[KnowledgeSource] = Field(default_factory=list)
    confidence: float
    conversation_id: str


# ── Document Search ────────────────────────────────────────
# Matches frontend DocumentSearchResponse shape.

class DocumentSearchResultItem(BaseModel):
    """A single search result for the DocumentRepository UI."""
    document: Document
    relevance_score: float
    snippet: str
    highlighted_terms: list[str] = Field(default_factory=list)


class DocumentSearchResponse(BaseModel):
    """Search results response for DocumentRepository UI."""
    status: str = "success"
    results: list[DocumentSearchResultItem] = Field(default_factory=list)
    total: int = 0
    query_time_ms: float = 0.0
