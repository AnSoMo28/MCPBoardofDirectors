"""
Smart Chunker — semantic-aware text splitting.

Hierarchy of splitting boundaries:
    1. Sections (headings, page markers, table markers)
    2. Paragraphs (\n\n)
    3. Sentences (. ! ?)
    4. Characters (last resort)

Overlap: configurable token-based overlap between consecutive chunks.
Tables: preserved as single chunks when possible.

Usage:
    chunker = SmartChunker(chunk_size=800, chunk_overlap=150)
    chunks = chunker.chunk(clean_text, metadata={"file_name": "doc.pdf"})
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ── Output Models ─────────────────────────────────────────


@dataclass
class ChunkMetadata:
    """Metadata attached to each chunk."""
    section_title: str | None = None
    page_number: int = 0
    is_table: bool = False
    token_count: int = 0
    source_file: str = ""


@dataclass
class ChunkData:
    """A single text chunk with metadata."""
    content: str
    chunk_index: int
    metadata: ChunkMetadata


# ── Smart Chunker ─────────────────────────────────────────


class SmartChunker:
    """
    Semantic-aware text chunker.

    Respects document structure (headings, paragraphs, sentences)
    and produces overlapping chunks of approximately chunk_size tokens.

    Args:
        chunk_size: Target chunk size in tokens (~1.3 tokens/word for Spanish).
        chunk_overlap: Overlap between consecutive chunks in tokens.
        min_chunk_size: Minimum chunk size — smaller chunks are discarded.
    """

    # Patterns for section boundary detection
    _HEADING_RE = re.compile(r"^#{1,4}\s+.+", re.MULTILINE)
    _PAGE_MARKER_RE = re.compile(r"^$$Página\s+\d+$$", re.MULTILINE)
    _TABLE_MARKER_RE = re.compile(r"^$$(Tabla|Hoja)[^$$]*\]", re.MULTILINE)
    _SECTION_RE = re.compile(
        r"^(#{1,4}\s+.+|$$Página\s+\d+$$|$$(Tabla|Hoja)[^$$]*\])",
        re.MULTILINE,
    )
    _SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")

    def __init__(
        self,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
        min_chunk_size: int = 100,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size

    def chunk(
        self,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> list[ChunkData]:
        """
        Split text into semantically coherent chunks.

        Args:
            text: Full document text.
            metadata: Optional metadata (file_name, etc.).

        Returns:
            Ordered list of ChunkData with sequential indices.
        """
        if not text or not text.strip():
            return []

        source_file = (metadata or {}).get("file_name", "")

        # Step 1: Split into sections
        sections = self._split_into_sections(text)

        # Step 2: Chunk each section
        all_chunks: list[ChunkData] = []
        for section in sections:
            section_chunks = self._chunk_section(
                text=section["content"],
                title=section.get("title"),
                is_table=section.get("is_table", False),
                source_file=source_file,
            )
            all_chunks.extend(section_chunks)

        # Step 3: Filter undersized chunks
        all_chunks = [
            c for c in all_chunks
            if c.metadata.token_count >= self.min_chunk_size
        ]

        # Step 4: Assign sequential indices
        for i, chunk in enumerate(all_chunks):
            chunk.chunk_index = i

        logger.info(
            "[chunker] %d chars → %d chunks (size=%d, overlap=%d)",
            len(text), len(all_chunks), self.chunk_size, self.chunk_overlap,
        )

        return all_chunks

    # ── Section splitting ─────────────────────────────────

    def _split_into_sections(self, text: str) -> list[dict[str, Any]]:
        """
        Split text into sections by headings and markers.

        Returns list of {title, content, is_table}.
        """
        lines = text.split("\n")
        sections: list[dict[str, Any]] = []
        current_title: str | None = None
        current_lines: list[str] = []
        current_is_table = False

        for line in lines:
            stripped = line.strip()

            if self._SECTION_RE.match(stripped):
                # Save previous section
                if current_lines:
                    content = "\n".join(current_lines).strip()
                    if content:
                        sections.append({
                            "title": current_title,
                            "content": content,
                            "is_table": current_is_table,
                        })

                current_title = stripped[:120]
                current_is_table = bool(self._TABLE_MARKER_RE.match(stripped))
                current_lines = [line]
            else:
                current_lines.append(line)

        # Save last section
        if current_lines:
            content = "\n".join(current_lines).strip()
            if content:
                sections.append({
                    "title": current_title,
                    "content": content,
                    "is_table": current_is_table,
                })

        # Fallback: entire text as one section
        if not sections and text.strip():
            sections.append({
                "title": None,
                "content": text,
                "is_table": False,
            })

        return sections

    # ── Section chunking ──────────────────────────────────

    def _chunk_section(
        self,
        text: str,
        title: str | None,
        is_table: bool,
        source_file: str,
    ) -> list[ChunkData]:
        """Split a section into chunks respecting paragraph boundaries."""
        tokens = self._estimate_tokens(text)

        # Small section: keep as single chunk
        if tokens <= self.chunk_size:
            return [ChunkData(
                content=text.strip(),
                chunk_index=0,
                metadata=ChunkMetadata(
                    section_title=title,
                    is_table=is_table,
                    token_count=tokens,
                    source_file=source_file,
                ),
            )]

        # Split by paragraphs
        paragraphs = [p for p in text.split("\n\n") if p.strip()]

        chunks: list[ChunkData] = []
        buffer = ""
        buffer_tokens = 0

        for para in paragraphs:
            para_tokens = self._estimate_tokens(para)

            # Paragraph fits in buffer
            if buffer_tokens + para_tokens <= self.chunk_size:
                buffer = f"{buffer}\n\n{para}".strip() if buffer else para
                buffer_tokens += para_tokens
                continue

            # Buffer is full — flush it
            if buffer.strip() and buffer_tokens >= self.min_chunk_size:
                chunks.append(self._make_chunk(
                    buffer, title, is_table, buffer_tokens, source_file,
                ))

                # Overlap: retain tail of buffer
                overlap = self._overlap_tail(buffer)
                buffer = f"{overlap}\n\n{para}".strip() if overlap else para
                buffer_tokens = self._estimate_tokens(buffer)
            else:
                # Single paragraph exceeds chunk_size → split by sentences
                if buffer.strip():
                    chunks.append(self._make_chunk(
                        buffer, title, is_table, buffer_tokens, source_file,
                    ))
                    buffer = ""

                sent_chunks = self._chunk_by_sentences(para, title, is_table, source_file)
                chunks.extend(sent_chunks)
                buffer = ""
                buffer_tokens = 0

        # Flush remaining buffer
        if buffer.strip() and buffer_tokens >= self.min_chunk_size:
            chunks.append(self._make_chunk(
                buffer, title, is_table, buffer_tokens, source_file,
            ))

        return chunks

    # ── Sentence-level splitting ──────────────────────────

    def _chunk_by_sentences(
        self,
        text: str,
        title: str | None,
        is_table: bool,
        source_file: str,
    ) -> list[ChunkData]:
        """Split a large paragraph by sentence boundaries."""
        sentences = self._SENTENCE_RE.split(text)

        chunks: list[ChunkData] = []
        buffer = ""
        buffer_tokens = 0

        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue

            sent_tokens = self._estimate_tokens(sent)

            if buffer_tokens + sent_tokens <= self.chunk_size:
                buffer = f"{buffer} {sent}".strip() if buffer else sent
                buffer_tokens += sent_tokens
            else:
                if buffer.strip():
                    chunks.append(self._make_chunk(
                        buffer, title, is_table, buffer_tokens, source_file,
                    ))
                buffer = sent
                buffer_tokens = sent_tokens

        if buffer.strip():
            chunks.append(self._make_chunk(
                buffer, title, is_table, buffer_tokens, source_file,
            ))

        return chunks

    # ── Helpers ───────────────────────────────────────────

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """
        Estimate token count.

        Uses ~1.3 tokens per word (empirical for Spanish text).
        For English, ~1.0 would suffice, but Spanish tokenizes
        more aggressively due to morphology.
        """
        words = len(text.split())
        return max(1, int(words * 1.3))

    def _overlap_tail(self, text: str) -> str:
        """Extract the tail of text for overlap between chunks."""
        words = text.split()
        overlap_words = max(1, int(self.chunk_overlap / 1.3))
        if overlap_words >= len(words):
            return text
        return " ".join(words[-overlap_words:])

    @staticmethod
    def _make_chunk(
        content: str,
        title: str | None,
        is_table: bool,
        token_count: int,
        source_file: str,
    ) -> ChunkData:
        """Create a ChunkData with computed metadata."""
        return ChunkData(
            content=content.strip(),
            chunk_index=0,  # Reassigned later
            metadata=ChunkMetadata(
                section_title=title,
                is_table=is_table,
                token_count=token_count,
                source_file=source_file,
            ),
        )
