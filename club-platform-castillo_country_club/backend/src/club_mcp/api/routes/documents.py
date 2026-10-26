"""
Document upload and management API routes.

Endpoints:
    POST /api/documents/upload   — Upload and index a document
    GET  /api/documents/supported — List supported file types
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from club_mcp.models.document_intelligence import (
    ACCESS_HIERARCHY,
    DocumentAccessLevel,
    DocumentCategory,
)
from club_mcp.rag.parsers import DocumentParser
from club_mcp.rag.chunker import SmartChunker
from club_mcp.rag.embeddings import EmbeddingService
from club_mcp.rag.vectorstore import ChromaVectorStore

logger = logging.getLogger(__name__)

# documents.py — línea corregida:
router = APIRouter(tags=["documents"])


# ── Limits ────────────────────────────────────────────────

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = DocumentParser.supported_extensions()

# ── Singleton RAG components (lazy init) ──────────────────

_chunker = SmartChunker()
_embeddings: EmbeddingService | None = None
_vectorstore: ChromaVectorStore | None = None


def _get_embeddings() -> EmbeddingService:
    global _embeddings
    if _embeddings is None:
        _embeddings = EmbeddingService()
    return _embeddings


def _get_vectorstore() -> ChromaVectorStore:
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = ChromaVectorStore()
    return _vectorstore


# ── Document type detection ───────────────────────────────

_TYPE_MAP: dict[str, str] = {
    ".pdf": "financial_report",
    ".docx": "contract",
    ".doc": "contract",
    ".xlsx": "financial_report",
    ".xls": "financial_report",
    ".txt": "other",
    ".md": "regulation",
    ".csv": "other",
    ".json": "other",
    ".html": "other",
}


def _detect_document_type(file_name: str) -> str:
    """Map file extension to document type. Overridable by user."""
    ext = Path(file_name).suffix.lower()
    return _TYPE_MAP.get(ext, "other")


# ── Endpoints ─────────────────────────────────────────────


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(..., description="Document to upload"),
    category: str = Form(
        default="operational",
        description="Document category: financial, legal, operational, hr, marketing, compliance, governance, maintenance",
    ),
    access_level: str = Form(
        default="internal",
        description="Access level: public, internal, confidential, restricted",
    ),
    document_type: str = Form(
        default="",
        description="Override document type (auto-detected from extension if empty)",
    ),
    tags: str = Form(
        default="",
        description="Comma-separated tags",
    ),
    notes: str = Form(
        default="",
        description="Optional notes about this document",
    ),
    uploaded_by: str = Form(
        default="system",
        description="User who uploaded the document",
    ),
) -> JSONResponse:
    """
    Upload and index a document into the RAG knowledge base.

    Pipeline: File → Parse → Chunk → Embed → Store

    The document is immediately searchable after upload.
    Contract/legal files may require HITL approval (agent handles this).
    """
    start_time = time.time()

    # ── 1. Read and validate file ──
    content = await file.read()

    if not content:
        raise HTTPException(400, "Archivo vacío")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            413,
            f"Archivo excede el límite de {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB. "
            f"Tamaño: {len(content) / (1024 * 1024):.1f}MB",
        )

    file_name = file.filename or "unnamed"
    ext = Path(file_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Tipo de archivo no soportado: '{ext}'. "
            f"Permitidos: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # ── 2. Validate enums ──
    try:
        cat_enum = DocumentCategory(category)
    except ValueError:
        raise HTTPException(
            400,
            f"Categoría no válida: '{category}'. "
            f"Opciones: {', '.join(c.value for c in DocumentCategory)}",
        )

    try:
        acc_enum = DocumentAccessLevel(access_level)
    except ValueError:
        raise HTTPException(
            400,
            f"Nivel de acceso no válido: '{access_level}'. "
            f"Opciones: {', '.join(a.value for a in DocumentAccessLevel)}",
        )

    # ── 3. Parse document ──
    try:
        clean_doc = DocumentParser.parse(content, file_name)
    except Exception as exc:
        logger.error("[documents] Parse error for '%s': %s", file_name, exc)
        raise HTTPException(422, f"Error parseando el archivo: {exc}")

    if not clean_doc.content.strip():
        raise HTTPException(
            422,
            f"No se pudo extraer texto del archivo '{file_name}'. "
            f"¿Es un archivo escaneado sin OCR?",
        )

    # ── 4. Chunk ──
    chunks = _chunker.chunk(
        clean_doc.content,
        metadata={"file_name": file_name},
    )

    if not chunks:
        raise HTTPException(422, "El documento no produjo chunks indexables")

    # ── 5. Embed ──
    try:
        embedder = _get_embeddings()
        embeddings = embedder.embed_documents(
            [c.content for c in chunks],
            batch_size=32,
        )
    except Exception as exc:
        logger.error("[documents] Embedding error for '%s': %s", file_name, exc)
        raise HTTPException(500, f"Error generando embeddings: {exc}")

    # ── 6. Store in vector database ──
    document_id = uuid4().hex[:12]
    det_type = document_type if document_type else _detect_document_type(file_name)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    chunk_ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
    chunk_texts = [c.content for c in chunks]
    chunk_metadatas = [
        {
            "document_id": document_id,
            "file_name": file_name,
            "document_type": det_type,
            "category": cat_enum.value,
            "access_level": ACCESS_HIERARCHY.get(acc_enum.value, 1),
            "is_table": c.metadata.is_table,
            "page_number": c.metadata.page_number,
            "section_title": c.metadata.section_title or "",
            "uploaded_by": uploaded_by,
            "tags": ", ".join(tag_list) if tag_list else "",
        }
        for c in chunks
    ]

    try:
        store = _get_vectorstore()
        store.add(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=chunk_texts,
            metadatas=chunk_metadatas,
        )
    except Exception as exc:
        logger.error("[documents] Vector store error for '%s': %s", file_name, exc)
        raise HTTPException(500, f"Error almacenando en la base vectorial: {exc}")

    elapsed_ms = round((time.time() - start_time) * 1000)

    logger.info(
        "[documents] Uploaded '%s' — %d chunks, %d chars, %dms",
        file_name, len(chunks), len(clean_doc.content), elapsed_ms,
    )

    return JSONResponse(
        status_code=201,
        content={
            "status": "success",
            "message": (
                f"Documento '{file_name}' indexado correctamente. "
                f"{len(chunks)} fragmento(s) creado(s)."
            ),
            "document": {
                "id": document_id,
                "file_name": file_name,
                "document_type": det_type,
                "category": cat_enum.value,
                "access_level": acc_enum.value,
                "chunk_count": len(chunks),
                "file_size_bytes": len(content),
                "content_preview": clean_doc.content[:300],
                "page_count": clean_doc.metadata.page_count,
                "has_tables": clean_doc.metadata.has_tables,
                "tags": tag_list,
                "notes": notes,
                "uploaded_by": uploaded_by,
            },
            "processing": {
                "parse_ms": 0,  # TODO: instrument per-step timing in future
                "total_ms": elapsed_ms,
                "embedding_device": embedder.device,
                "embedding_model": embedder.model_name,
            },
        },
    )


@router.get("/supported")
async def get_supported_types() -> JSONResponse:
    """List supported file types and their descriptions."""
    type_info = {
        ".pdf": "PDF documents (text + tables)",
        ".docx": "Word documents",
        ".doc": "Legacy Word documents",
        ".xlsx": "Excel spreadsheets",
        ".xls": "Legacy Excel spreadsheets",
        ".txt": "Plain text files",
        ".md": "Markdown files",
        ".csv": "CSV data files",
        ".json": "JSON data files",
        ".html": "HTML files",
    }

    supported = [
        {"extension": ext, "description": type_info.get(ext, ext)}
        for ext in sorted(ALLOWED_EXTENSIONS)
    ]

    return JSONResponse({
        "status": "success",
        "supported_types": supported,
        "max_file_size_mb": MAX_FILE_SIZE_BYTES // (1024 * 1024),
    })
