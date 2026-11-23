"""Seed de migración chroma→pg (Ola 2.2 · runtime, no DDL).

Vacía el ChromaDB persistente (./data/chromadb) a la tabla
rag_chunks del PgVectorStore — la operación de adopción del swap:
quien YA tenía documentos indexados no los pierde.

Requisito: esquema rag_chunks ya creado (alembic 0019 o
Base.metadata.create_all). El renglón chroma se inserta con
ON CONFLICT DO UPDATE — re-ejecutable (idempotente).

Uso (backend/):
    uv run python scripts/seed_rag_chroma_to_pg.py [--dry-run] [--from-dir DIR]

Lee el DSN igual que el store: CLUB_DATABASE_DSN >
CLUB_PERSISTENCE_URL > settings.database_url.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from club_mcp.rag.pg_vectorstore import ACCESS_HIERARCHY, PgVectorStore


DEFAULT_DIR = Path("./data/chromadb")


def _load_collection(persist_dir: Path, collection: str) -> Any:
    import chromadb

    client = chromadb.PersistentClient(path=str(persist_dir))
    return client.get_or_create_collection(
        name=collection,
        metadata={"hnsw:space": "cosine"},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="contar sin insertar")
    parser.add_argument("--from-dir", default=str(DEFAULT_DIR))
    parser.add_argument("--collection", default="castillo_documents")
    args = parser.parse_args()

    src = Path(args.from_dir)
    if not src.exists():
        print(f"[seed] {src} no existe — nada que migrar (sistema nuevo)")
        return 0

    coll = _load_collection(src, args.collection)
    total = coll.count()
    print(f"[seed] chroma '{args.collection}' @ {src}: {total} chunk(s)")
    if total == 0:
        print("[seed] colección vacía — nada que migrar")
        return 0

    got = coll.get(include=["embeddings", "documents", "metadatas"])
    # numpy arrays: `x or []` evalúa la verdad del ARRAY (ambiguo) —
    # se usa un or explícito de None, nunca la truthiness del valor.
    raw_ids = got.get("ids")
    raw_emb = got.get("embeddings")
    raw_docs = got.get("documents")
    raw_metas = got.get("metadatas")
    ids = list(raw_ids) if raw_ids is not None else []
    embeddings = list(raw_emb) if raw_emb is not None else []
    documents = list(raw_docs) if raw_docs is not None else []
    metadatas = list(raw_metas) if raw_metas is not None else []

    if args.dry_run:
        n_docs = len({m.get("document_id") for m in metadatas if m})
        print(f"[seed] DRY-RUN: migraría {total} chunk(s) de {n_docs} documento(s)")
        return 0

    store = PgVectorStore()
    store.add(
        ids=[str(i) for i in ids],
        embeddings=[list(map(float, e)) for e in embeddings],
        documents=[str(d) for d in documents],
        metadatas=[dict(m) for m in metadatas],
    )
    inserted = store.count()
    print(f"[seed] pg rag_chunks ahora: {inserted} chunk(s)")
    if inserted != total:
        print(f"[seed] WARN: chroma={total} pg={inserted} — revisar conflictos")
        return 1
    print(f"[seed] OK — migración completa (ACCESS_HIERARCHY vigente: {ACCESS_HIERARCHY})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
