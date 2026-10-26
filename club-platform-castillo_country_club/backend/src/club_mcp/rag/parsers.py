"""
Document parsers — convert binary files to clean text.

Supported formats:
    PDF  (.pdf)              → pymupdf (fitz)
    Word (.docx, .doc)       → python-docx
    Excel (.xlsx, .xls)      → openpyxl (table → markdown)
    Text (.txt, .md, .csv)   → chardet encoding detection

Usage:
    clean_doc = DocumentParser.parse(file_bytes, "contrato_2024.pdf")
    print(clean_doc.content)       # extracted text
    print(clean_doc.metadata)      # file info
"""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── Output Models ─────────────────────────────────────────


@dataclass
class DocumentMetadata:
    """Metadata extracted during parsing."""
    file_name: str
    file_type: str
    page_count: int = 0
    has_tables: bool = False
    language: str = "es"
    file_size_bytes: int = 0
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class CleanDocument:
    """Parsed document with clean text and metadata."""
    content: str
    metadata: DocumentMetadata


# ── PDF Parser ────────────────────────────────────────────


class PDFParser:
    """Parse PDF files using pymupdf (fitz)."""

    def parse(self, content: bytes, file_name: str) -> CleanDocument:
        import fitz  # pymupdf

        doc = fitz.open(stream=content, filetype="pdf")
        page_count = len(doc)
        pages: list[str] = []
        tables_found = False

        for page_num in range(page_count):
            page = doc[page_num]

            # Extract text
            text = page.get_text("text")
            if text.strip():
                pages.append(f"[Página {page_num + 1}]\n{text}")

            # Extract tables (pymupdf >= 1.23.0)
            try:
                tables = page.find_tables()
                if tables and tables.tables:
                    tables_found = True
                    for tab_idx, tab in enumerate(tables.tables):
                        df = tab.to_pandas()
                        md_table = df.to_markdown(index=False)
                        pages.append(
                            f"[Tabla {tab_idx + 1} - Página {page_num + 1}]\n"
                            f"{md_table}"
                        )
            except (AttributeError, Exception):
                # Older pymupdf or extraction error — skip tables
                pass

        doc.close()

        text = "\n\n".join(pages)
        if not text.strip():
            logger.warning("[parsers] PDF '%s' yielded no text (scanned?)", file_name)

        return CleanDocument(
            content=text,
            metadata=DocumentMetadata(
                file_name=file_name,
                file_type="pdf",
                page_count=page_count,
                has_tables=tables_found,
                file_size_bytes=len(content),
            ),
        )


# ── Word Parser ───────────────────────────────────────────


class WordParser:
    """Parse Word documents (.docx) using python-docx."""

    def parse(self, content: bytes, file_name: str) -> CleanDocument:
        from docx import Document as DocxDocument

        doc = DocxDocument(io.BytesIO(content))
        parts: list[str] = []
        tables_found = len(doc.tables) > 0

        # Extract paragraphs with heading preservation
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            style_name = para.style.name or ""
            if style_name.startswith("Heading"):
                try:
                    level = int(style_name.replace("Heading ", "").strip())
                    parts.append(f"{'#' * level} {text}")
                except ValueError:
                    parts.append(text)
            else:
                parts.append(text)

        # Extract tables as markdown
        for i, table in enumerate(doc.tables):
            rows: list[str] = []
            for row in table.rows:
                cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                rows.append(" | ".join(cells))

            if rows:
                parts.append(f"\n[Tabla {i + 1}]\n" + "\n".join(rows))

        return CleanDocument(
            content="\n\n".join(parts),
            metadata=DocumentMetadata(
                file_name=file_name,
                file_type="docx",
                has_tables=tables_found,
                file_size_bytes=len(content),
            ),
        )


# ── Excel Parser ──────────────────────────────────────────


class ExcelParser:
    """Parse Excel files using openpyxl. Each sheet → markdown table."""

    def parse(self, content: bytes, file_name: str) -> CleanDocument:
        import openpyxl

        wb = openpyxl.load_workbook(
            io.BytesIO(content), read_only=True, data_only=True
        )
        sheets_content: list[str] = []
        total_rows = 0

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows: list[str] = []

            for row in ws.iter_rows(values_only=True):
                cells = [str(c).strip() if c is not None else "" for c in row]
                if any(cells):
                    rows.append(" | ".join(cells))

            if rows:
                total_rows += len(rows)
                # First row treated as header
                header = rows[0]
                data_rows = rows[1:]
                sheet_text = (
                    f"[Hoja: {sheet_name}]\n"
                    f"{header}\n"
                    + "\n".join(data_rows)
                )
                sheets_content.append(sheet_text)

        wb.close()

        return CleanDocument(
            content="\n\n".join(sheets_content),
            metadata=DocumentMetadata(
                file_name=file_name,
                file_type="xlsx",
                has_tables=True,
                file_size_bytes=len(content),
                extra={"sheet_count": len(sheets_content), "total_rows": total_rows},
            ),
        )


# ── Text Parser ───────────────────────────────────────────


class TextParser:
    """Parse plain text files with automatic encoding detection."""

    def parse(self, content: bytes, file_name: str) -> CleanDocument:
        encoding = self._detect_encoding(content)

        try:
            text = content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            text = content.decode("utf-8", errors="replace")
            logger.warning(
                "[parsers] Encoding '%s' failed for '%s', using utf-8 fallback",
                encoding, file_name,
            )

        return CleanDocument(
            content=text,
            metadata=DocumentMetadata(
                file_name=file_name,
                file_type=Path(file_name).suffix.lstrip(".") or "txt",
                file_size_bytes=len(content),
                extra={"detected_encoding": encoding},
            ),
        )

    @staticmethod
    def _detect_encoding(content: bytes) -> str:
        """Detect text encoding using chardet."""
        try:
            import chardet
            result = chardet.detect(content)
            return result.get("encoding") or "utf-8"
        except ImportError:
            return "utf-8"


# ── Document Parser Router ────────────────────────────────


class DocumentParser:
    """
    Auto-detecting document parser.

    Routes file to the correct parser based on extension.
    Falls back to TextParser for unknown formats.

    Usage:
        clean_doc = DocumentParser.parse(file_bytes, "reporte.xlsx")
    """

    _PARSERS: dict[str, type] = {
        ".pdf": PDFParser,
        ".docx": WordParser,
        ".doc": WordParser,
        ".xlsx": ExcelParser,
        ".xls": ExcelParser,
        ".txt": TextParser,
        ".md": TextParser,
        ".csv": TextParser,
        ".json": TextParser,
        ".html": TextParser,
    }

    @classmethod
    def parse(cls, content: bytes, file_name: str) -> CleanDocument:
        """
        Parse a document from raw bytes.

        Args:
            content: Raw file bytes.
            file_name: Original filename (used for extension detection).

        Returns:
            CleanDocument with extracted text and metadata.

        Raises:
            ValueError: If file is empty.
        """
        if not content:
            raise ValueError(f"Empty file: {file_name}")

        ext = Path(file_name).suffix.lower()
        parser_cls = cls._PARSERS.get(ext, TextParser)

        logger.info(
            "[parsers] Parsing '%s' (%s, %d bytes) with %s",
            file_name, ext or "unknown", len(content), parser_cls.__name__,
        )

        doc = parser_cls().parse(content, file_name)

        logger.info(
            "[parsers] Parsed '%s': %d chars, %d pages, tables=%s",
            file_name, len(doc.content), doc.metadata.page_count,
            doc.metadata.has_tables,
        )

        return doc

    @classmethod
    def supported_extensions(cls) -> set[str]:
        """Return the set of supported file extensions."""
        return set(cls._PARSERS.keys())
