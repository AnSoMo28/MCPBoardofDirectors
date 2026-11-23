"""Suite de persistencia Ola 2.1-decimoctava — gate del vertical
document_intelligence:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/
guest/satisfaction/communication/cultural_social/executive_dashboard/
proactive_recommendation/facility_management/age_group/sports_
recreation/finance/wellness/member_360 (Ola 2.1-bis …
-DECIMASEPTIMA): restart REAL (engine.dispose() + engine NUEVO +
sesión nueva) · RE-RUNNABLE (_reset_backend antes de cada test) ·
sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los 48 tests del agente
document_intelligence corren contra el repo in-memory; este
archivo verifica que el repo ORM async cumple el mismo contrato
(mismos 17 métodos + 2 properties · None/[] sin excepciones
custom · JSONB tags/source_documents/key_findings/categories
roundtrip · enums roundtrip · DRAFT/INDEXED literales del create ·
updates dict parcial + clave desconocida ignorada · filtros
list_* con orden de inserción (order_by(id) — lección run #56) ·
get_stats compute-on-read · rag_service_ready = None SIN disparar
el build RAG (0055 W-2b — el contrato del bootstrap) · delete
best-effort RAG).

La suite NO ejercita el pipeline RAG real (embeddings bge-m3):
los 48 tests del agente ya lo cubren con _FakeEmbeddings y la
Ola 2.2 ya gateó el vectorstore contra PG real — este vertical es
el espejo de los 2 dicts de metadatos.
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.document_intelligence_orm import (
    DocumentORM,
    KnowledgeReportORM,
)
from club_mcp.db.orm.repositories.document_intelligence_repo import (
    DocumentIntelligenceRepository as DocRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.document_intelligence import (
    CreateDocument,
    CreateKnowledgeReport,
    DocumentAccessLevel,
    DocumentCategory,
    DocumentStatus,
    DocumentType,
    IngestionStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_docintel.db"

pytestmark = pytest.mark.asyncio


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP + CREATE de las 2 tablas del vertical antes de
    cada test (Ola 2.1f).

    DOC-INTEL ONLY: drop/create de documents + knowledge_reports, no
    drop_all global (lección run #67 del rag suite: drop_all global
    era bomba para las demás suites en el PG compartido de CI).
    """
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        for orm_cls in (DocumentORM, KnowledgeReportORM):
            tbl = orm_cls.__table__
            await conn.run_sync(tbl.drop, checkfirst=True)
            await conn.run_sync(tbl.create, checkfirst=True)
    await engine.dispose()


def _repo() -> DocRepoORM:
    return DocRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: DocRepoORM) -> DocRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


async def _seed_dataset(repo: DocRepoORM) -> dict[str, str]:
    """Dataset sembrado SOLO por métodos públicos del contrato."""
    ids = {}
    doc1 = await repo.create_document(CreateDocument(
        file_name="reglamento-2026.pdf",
        title="Reglamento Interno 2026",
        document_type=DocumentType.REGULATION,
        category=DocumentCategory.GOVERNANCE,
        access_level=DocumentAccessLevel.INTERNAL,
        tags=["reglamento", "2026"],
        uploaded_by="socio-admin",
        notes="Versión aprobada en asamblea",
    ))
    ids["doc1"] = doc1.id
    doc2 = await repo.create_document(CreateDocument(
        file_name="acta-asamblea-marzo.pdf",
        document_type=DocumentType.MINUTES,
        category=DocumentCategory.GOVERNANCE,
        access_level=DocumentAccessLevel.RESTRICTED,
        tags=["acta", "asamblea"],
    ))
    ids["doc2"] = doc2.id
    doc3 = await repo.create_document(CreateDocument(
        file_name="newsletter-abril.pdf",
        document_type=DocumentType.NEWSLETTER,
        category=DocumentCategory.MARKETING,
        access_level=DocumentAccessLevel.PUBLIC,
    ))
    ids["doc3"] = doc3.id
    rep1 = await repo.create_report(CreateKnowledgeReport(
        topic="Uso de instalaciones Q1",
        audience="board",
        summary="Análisis de uso de instalaciones del primer trimestre.",
        source_documents=[{"document_id": ids["doc1"], "title": "Reglamento Interno 2026"}],
        key_findings=["Piscina +18% de uso", "Canchas de pádel saturadas"],
        date_from="2026-01-01",
        date_to="2026-03-31",
        categories=["governance", "operational"],
    ))
    ids["rep1"] = rep1.id
    rep2 = await repo.create_report(CreateKnowledgeReport(
        topic="Compliance y gobernanza",
        audience="internal",
        summary="Reporte de cumplimiento normativo.",
        key_findings=["Sin hallazgos críticos"],
    ))
    ids["rep2"] = rep2.id
    return ids


async def test_entities_restart() -> None:
    """Documents (tags JSONB) + knowledge_reports (3+1 JSONB) tras restart."""
    await _reset_backend()
    repo = _repo()
    ids = await _seed_dataset(repo)

    # ── RESTART REAL: dispose + engine nuevo + repo nuevo ──
    repo = await _restart_repo(repo)

    doc1 = await repo.get_document(ids["doc1"])
    assert doc1 is not None
    assert doc1.title == "Reglamento Interno 2026"
    assert doc1.file_name == "reglamento-2026.pdf"
    assert doc1.document_type == DocumentType.REGULATION
    assert doc1.category == DocumentCategory.GOVERNANCE
    assert doc1.access_level == DocumentAccessLevel.INTERNAL
    assert doc1.status == DocumentStatus.DRAFT
    assert doc1.ingestion_status == IngestionStatus.INDEXED
    assert doc1.tags == ["reglamento", "2026"]
    assert doc1.chunk_count == 0
    assert doc1.version == 1
    assert doc1.uploaded_by == "socio-admin"
    assert doc1.created_at and doc1.updated_at
    assert len(doc1.id) == 12  # uuid4().hex[:12] del create

    doc2 = await repo.get_document(ids["doc2"])
    assert doc2 is not None
    assert doc2.access_level == DocumentAccessLevel.RESTRICTED
    assert doc2.status == DocumentStatus.DRAFT
    assert doc2.title == "acta-asamblea-marzo.pdf"  # title or file_name
    assert doc2.tags == ["acta", "asamblea"]

    rep1 = await repo.get_report(ids["rep1"])
    assert rep1 is not None
    assert rep1.topic == "Uso de instalaciones Q1"
    assert rep1.audience == "board"
    assert rep1.source_documents == [{"document_id": ids["doc1"], "title": "Reglamento Interno 2026"}]
    assert rep1.key_findings == ["Piscina +18% de uso", "Canchas de pádel saturadas"]
    assert rep1.date_from == "2026-01-01"
    assert rep1.date_to == "2026-03-31"
    assert rep1.categories == ["governance", "operational"]
    assert rep1.status == "draft"  # literal del create
    assert len(rep1.id) == 8  # uuid4().hex[:8] del create
    assert rep1.created_at and rep1.updated_at

    # get de lo inexistente: None sin excepción (contrato del in-memory)
    assert await repo.get_document("no-existe-xyz") is None
    assert await repo.get_report("no-existe") is None


async def test_filters_updates_delete() -> None:
    """list_* filtros + orden de inserción · update dict parcial · delete."""
    await _reset_backend()
    repo = _repo()
    ids = await _seed_dataset(repo)

    # list_documents SIN filtros: TODAS, orden de INSERCIÓN exacto (el
    # in-memory iteraba .values() — el ORM lo replica por seq, la
    # columna técnica de orden; los ids uuid4 aleatorios NO codifican
    # orden, a diferencia de las 17 verticales con prefijo).
    all_docs = await repo.list_documents()
    assert [d.id for d in all_docs] == [ids["doc1"], ids["doc2"], ids["doc3"]]

    # filtros exactos del contrato (str .value en columnas)
    gov = await repo.list_documents(category="governance")
    assert {d.id for d in gov} == {ids["doc1"], ids["doc2"]}
    pubs = await repo.list_documents(access_level="public")
    assert [d.id for d in pubs] == [ids["doc3"]]
    minutes = await repo.list_documents(document_type="minutes")
    assert [d.id for d in minutes] == [ids["doc2"]]
    drafts = await repo.list_documents(status="draft")
    assert len(drafts) == 3

    # list_reports: filtros audience/status + orden de INSERCIÓN (seq)
    all_reports = await repo.list_reports()
    assert [r.id for r in all_reports] == [ids["rep1"], ids["rep2"]]
    board = await repo.list_reports(audience="board")
    assert [r.id for r in board] == [ids["rep1"]]
    draft_reports = await repo.list_reports(status="draft")
    assert len(draft_reports) == 2

    # update dict parcial: SOLO la key pedida, updated_at SIEMPRE
    updated = await repo.update_document(ids["doc1"], {"status": "published", "version": 2})
    assert updated is not None
    assert updated.status == DocumentStatus.PUBLISHED
    assert updated.version == 2
    assert updated.tags == ["reglamento", "2026"]  # NO tocado por el update

    updated_rep = await repo.update_report(ids["rep1"], {"status": "published", "summary": "Otro"})
    assert updated_rep is not None
    assert updated_rep.status == "published"
    assert updated_rep.summary == "Otro"
    assert updated_rep.key_findings == ["Piscina +18% de uso", "Canchas de pádel saturadas"]

    # update de lo inexistente: None (contrato del in-memory)
    assert await repo.update_document("no-existe", {"status": "x"}) is None
    assert await repo.update_report("no-existe", {"status": "x"}) is None

    # ── RESTART: los updates SOBREVIVEN ──
    repo = await _restart_repo(repo)
    doc1 = await repo.get_document(ids["doc1"])
    assert doc1 is not None
    assert doc1.status == DocumentStatus.PUBLISHED
    assert doc1.version == 2

    # delete: metadata del delete SIEMPRE (RAG best-effort — el repo ORM
    # loguea el fallo del pipeline RAG y sigue, MISMO observable)
    deleted = await repo.delete_document(ids["doc3"])
    assert deleted is True
    assert await repo.get_document(ids["doc3"]) is None
    assert len(await repo.list_documents()) == 2

    # delete de lo inexistente: False
    assert await repo.delete_document("no-existe") is False


async def test_stats_compute_on_read() -> None:
    """get_stats: aritmética del in-memory sobre tabla (compute-on-read)."""
    await _reset_backend()
    repo = _repo()
    ids = await _seed_dataset(repo)

    # file_size_bytes 0 en el dataset (create_document literal 0) — stats
    # tras updates que PISAN el size (el contrato del in-memory permite
    # cualquier key de columna vía updates dict)
    await repo.update_document(ids["doc1"], {"file_size_bytes": 1500, "chunk_count": 12})
    await repo.update_document(ids["doc2"], {"file_size_bytes": 700, "chunk_count": 5})
    await repo.update_document(ids["doc3"], {"file_size_bytes": 300, "chunk_count": 2})

    stats = await repo.get_stats()
    assert stats["total_documents"] == 3
    assert stats["total_chunks"] == 12 + 5 + 2
    assert stats["total_size_bytes"] == 1500 + 700 + 300
    assert stats["by_type"] == {"regulation": 1, "minutes": 1, "newsletter": 1}
    assert stats["by_category"] == {"governance": 2, "marketing": 1}
    assert stats["by_access_level"] == {"internal": 1, "restricted": 1, "public": 1}

    # ── RESTART: compute-on-read SOBREVIVE (lee de la tabla) ──
    repo = await _restart_repo(repo)
    stats2 = await repo.get_stats()
    assert stats2["total_documents"] == 3
    assert stats2["total_chunks"] == 19
    assert stats2["total_size_bytes"] == 2500
    assert stats2["by_type"]["regulation"] == 1

    # vacío: contrato vacío idéntico (sin excepciones)
    await _reset_backend()
    repo = _repo()
    empty = await repo.get_stats()
    assert empty["total_documents"] == 0
    assert empty["total_chunks"] == 0
    assert empty["total_size_bytes"] == 0
    assert empty["by_type"] == {}
    assert empty["by_category"] == {}
    assert empty["by_access_level"] == {}
    assert await repo.list_documents() == []
    assert await repo.list_reports() == []


async def test_dropin_inmemory_vs_orm() -> None:
    """Drop-in: in-memory y ORM con dataset del MISMO contrato observable."""
    await _reset_backend()
    orm_repo = _repo()
    from club_mcp.db.repositories.document_intelligence_repo import (
        DocumentIntelligenceRepository as DocRepoInMemory,
    )

    mem_repo = DocRepoInMemory()

    # mismo dataset por métodos públicos en ambos repos
    payload_doc = CreateDocument(
        file_name="comparativa.pdf",
        title="Comparativa",
        document_type=DocumentType.POLICY,
        category=DocumentCategory.COMPLIANCE,
        access_level=DocumentAccessLevel.CONFIDENTIAL,
        tags=["drop-in"],
    )
    orm_doc = await orm_repo.create_document(payload_doc)
    mem_doc = await mem_repo.create_document(payload_doc)
    assert orm_doc.id != mem_doc.id  # ids distintos (uuid4 propio)
    for field in (
        "title", "file_name", "document_type", "category", "access_level",
        "status", "ingestion_status", "tags", "chunk_count",
        "content_preview", "file_size_bytes", "page_count", "has_tables",
        "uploaded_by", "notes", "version",
    ):
        assert getattr(orm_doc, field) == getattr(mem_doc, field), field
    assert orm_doc.created_at != ""
    assert mem_doc.created_at != ""

    payload_rep = CreateKnowledgeReport(
        topic="Comparativa",
        source_documents=[{"document_id": "x1", "title": "X"}],
        key_findings=["f1"],
        categories=["compliance"],
    )
    orm_rep = await orm_repo.create_report(payload_rep)
    mem_rep = await mem_repo.create_report(payload_rep)
    for field in (
        "topic", "audience", "summary", "source_documents",
        "key_findings", "date_from", "date_to", "categories", "status",
    ):
        assert getattr(orm_rep, field) == getattr(mem_rep, field), field

    # rag_service_ready: None SIN disparar el build RAG (0055 W-2b —
    # el contrato del bootstrap; cargar bge-m3 en un test de
    # persistencia sería una comportamiento-change)
    assert orm_repo.rag_service_ready is None
    assert mem_repo.rag_service_ready is None

    # update Report con clave DESCONOCIDA: ignorada, sin excepción
    u = await orm_repo.update_report(orm_rep.id, {"status": "published", "zzz": 1})
    assert u is not None
    assert u.status == "published"
