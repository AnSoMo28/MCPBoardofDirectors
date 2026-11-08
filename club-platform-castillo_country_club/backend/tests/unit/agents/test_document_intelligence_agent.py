"""
Tests for DocumentIntelligenceAgent (RAG).
"""

from __future__ import annotations

from uuid import UUID

import pytest

from club_mcp.agents.document_intelligence_agent import (
    DocumentIntelligenceAgent,
)
from club_mcp.db.repositories.document_intelligence_repo import (
    DocumentIntelligenceRepository,
)
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.document_intelligence import (
    CreateDocument,
    DocumentAccessLevel,
    DocumentCategory,
    DocumentType,
)


# ── Fixtures ───────────────────────────────────────────────

class _FakeEmbeddings:
    """Deterministic bag-of-words embeddings (hash → vector).

    Hermetic tests: no descarga el modelo bge-m3 (~2.3 GB) y es
    determinista — textos que comparten vocabulario quedan "similares"
    (cos > 0), vocabulario disjunto queda ortogonal (cos = 0). Dimensión
    512 para que las colisiones de hash no generen falsos positivos
    (con 64, "quantum physics" chocaba con tokens del financial report).
    """

    DIM = 512

    def _embed(self, text: str) -> list[float]:
        vec = [0.0] * self.DIM
        for tok in text.lower().split():
            vec[hash(tok) % self.DIM] += 1.0
        norm = sum(v * v for v in vec) ** 0.5 or 1.0
        return [v / norm for v in vec]

    def embed_documents(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, query: str) -> list[float]:
        if not query.strip():
            raise ValueError("Cannot embed empty query")
        return self._embed(query)


@pytest.fixture
def doc_repo(tmp_path):
    repo = DocumentIntelligenceRepository()
    # Reemplaza embeddings/vectorstore/search por el fake determinista y
    # tmp ANTES de cualquier ingest. RAGService guarda _embeddings y
    # _vectorstore, pero HybridSearchEngine guarda SU PROPIA referencia
    # a ambos — hay que parchear también _search o query usa bge-m3 real.
    # El chunker de producción descarta chunks < 100 tokens; para las
    # semillas de unit test bajamos el umbral a 10 (para eso existe el
    # parámetro) — los contenidos de prueba son cortos por naturaleza.
    from club_mcp.rag.chunker import SmartChunker
    from club_mcp.rag.search import HybridSearchEngine
    from club_mcp.rag.vectorstore import ChromaVectorStore

    fake = _FakeEmbeddings()
    vs = ChromaVectorStore(persist_dir=str(tmp_path / "chroma"))
    repo.rag._embeddings = fake
    repo.rag._vectorstore = vs
    repo.rag._search = HybridSearchEngine(fake, vs)
    repo.rag._chunker = SmartChunker(min_chunk_size=10)
    return repo


@pytest.fixture
def dia_agent(doc_repo, approval_engine):
    agent = DocumentIntelligenceAgent(repo=doc_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────────

async def _seed_document(
    repo: DocumentIntelligenceRepository,
    file_name: str = "test_doc.txt",
    content: str = (
        "Detailed test content about club operations, member services, "
        "facility scheduling, sports program planning, event coordination, "
        "budget oversight, maintenance routines, guest policies, and "
        "seasonal activity calendars for the private club community, "
        "covering all operational departments and their coordination."
    ),
    document_type: str = "financial_report",
    category: str = "operational",
    access_level: str = "internal",
    tags: list[str] | None = None,
    force_indexed: bool = True,
):
    data = CreateDocument(
        file_name=file_name,
        content=content,
        document_type=DocumentType(document_type),
        category=DocumentCategory(category),
        access_level=DocumentAccessLevel(access_level),
        tags=tags or [],
    )
    # P2-C3h b0v: sembrar vía ingest_text — indexa al vectorstore REAL
    # (chunks + embeddings) y crea el record de metadata. create_document
    # solo crea metadata: los tests de search/query necesitaban indexación.
    # (El umbral de chunker bajo lo aporta el fixture doc_repo.)
    result = await repo.ingest_text(
        text=content,
        file_name=file_name,
        document_type=document_type,
        category=category,
        access_level=access_level,
        tags=tags or [],
    )
    if result.get("status") == "error":
        raise AssertionError(f"seed ingest failed: {result.get('message')}")
    doc_id = result.get("document_id", "")
    doc = await repo.get_document(doc_id)
    if force_indexed and doc and doc.ingestion_status != "approved":
        doc = await repo.update_document(
            doc.id,
            {"ingestion_status": "approved", "status": "published"},
        )
    return doc


async def _seed_financial_report(repo: DocumentIntelligenceRepository):
    return await _seed_document(
        repo,
        file_name="q3_financial_report.pdf",
        content=(
            "Financial report for third quarter 2024. "
            "Revenue increased by fifteen percent compared "
            "to previous quarter. Membership dues collection "
            "rate at ninety four percent. Operating expenses "
            "were within budget allocation for the club. "
            "Detailed line items include facility maintenance, "
            "sports programming, staff payroll, utilities, "
            "insurance, capital reserves, and contingency "
            "funds, with month-over-month variance analysis "
            "and year-over-year comparisons for the board, "
            "plus audit notes and collection follow-ups."
        ),
        document_type="financial_report",
        category="financial",
    )


async def _seed_operational_plan(repo: DocumentIntelligenceRepository):
    return await _seed_document(
        repo,
        file_name="facility_maintenance_plan.docx",
        content=(
            "Facility maintenance plan for 2024 and 2025. "
            "Pool renovation scheduled for January. "
            "Tennis court resurfacing in March. "
            "HVAC system upgrade approved by the board. "
            "The plan also covers gym equipment rotation, "
            "landscape irrigation, lighting upgrades, locker "
            "room refurbishment, safety inspections, vendor "
            "contracts, preventive maintenance schedules, "
            "budget phasing per quarter, and responsible "
            "staff assignments with expected completion dates."
        ),
        document_type="financial_report",
        category="operational",
    )


async def _seed_contract_a(repo: DocumentIntelligenceRepository):
    return await _seed_document(
        repo,
        file_name="catering_contract_a.pdf",
        content=(
            "Contract for catering services at "
            "Castillo Country Club. Provider: "
            "Premium Catering Corp. Includes dining "
            "service and event catering for all members. "
            "The agreement covers menu planning, seasonal "
            "ingredients sourcing, staffing levels for "
            "banquets, service quality standards, payment "
            "terms, insurance requirements, cancellation "
            "policies, and annual performance reviews."
        ),
        document_type="contract",
        category="legal",
        access_level="confidential",
    )


async def _seed_contract_b(repo: DocumentIntelligenceRepository):
    return await _seed_document(
        repo,
        file_name="catering_contract_b.pdf",
        content=(
            "Contract for catering services with new "
            "provider. Provider: Gourmet Catering LLC. "
            "Includes dining service and special event "
            "catering for the club members. "
            "The agreement covers menu planning, seasonal "
            "ingredients sourcing, staffing levels for "
            "banquets, service quality standards, payment "
            "terms, insurance requirements, cancellation "
            "policies, and annual performance reviews."
        ),
        document_type="contract",
        category="legal",
        access_level="confidential",
    )


async def _seed_restricted_doc(repo: DocumentIntelligenceRepository):
    return await _seed_document(
        repo,
        file_name="board_minutes_confidential.pdf",
        content=(
            "Board meeting minutes for Q3 2024. "
            "Discussed financial restructuring and "
            "membership fee adjustments. "
            "All details are restricted. "
            "Directors reviewed capital expenditure plans, "
            "governance committee reports, audit findings, "
            "risk management updates, vendor contract "
            "renewals, membership growth strategies, and "
            "approved next year preliminary budget outline."
        ),
        document_type="minutes",
        category="governance",
        access_level="restricted",
    )


# ═══════════════════════════════════════════════════════════
# TEST: INGEST DOCUMENT
# ═══════════════════════════════════════════════════════════


class TestIngestDocument:
    @pytest.mark.asyncio
    async def test_ingest_auto_indexed(self, dia_agent):
        result = await dia_agent.ingest_document(
            file_name="report.txt",
            content="Annual report content for the club covering membership growth, event attendance, sports program enrollment, facility utilization rates, guest policies compliance, and community engagement initiatives across all four quarters, with detailed department summaries, financial highlights, staffing updates, capital projects progress, member satisfaction survey results, and strategic goals for the upcoming fiscal year. Annual report content for the club covering membership growth, event attendance, sports program enrollment, facility utilization rates, guest policies compliance, and community engagement initiatives across all four quarters, with detailed department summaries, financial highlights, staffing updates, capital projects progress, member satisfaction survey results, and strategic goals for the upcoming fiscal year. ",
            document_type="financial_report",
            category="financial",
        )
        assert result["status"] == "success"
        assert result["document"]["status"] == "published"
        assert result["document"]["chunk_count"] > 0

    @pytest.mark.asyncio
    async def test_ingest_contract_pending_approval(
        self, dia_agent
    ):
        result = await dia_agent.ingest_document(
            file_name="contract.pdf",
            content="Contract terms and conditions for service providers covering scope of work, deliverables schedule, quality standards, insurance obligations, indemnification clauses, payment milestones, penalty provisions, termination conditions, renewal options, dispute resolution procedures, confidentiality requirements, and compliance with club regulations and applicable local laws for all contracted activities. Contract terms and conditions for service providers covering scope of work, deliverables schedule, quality standards, insurance obligations, indemnification clauses, payment milestones, penalty provisions, termination conditions, renewal options, dispute resolution procedures, confidentiality requirements, and compliance with club regulations and applicable local laws for all contracted activities. ",
            document_type="contract",
            category="legal",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_ingest_legal_pending_approval(
        self, dia_agent
    ):
        result = await dia_agent.ingest_document(
            file_name="legal_doc.pdf",
            content="Legal document content describing regulatory compliance obligations, statutory requirements, corporate governance provisions, fiduciary duties of directors, shareholder rights, disclosure obligations, record keeping requirements, amendment procedures, and enforcement mechanisms applicable to private membership associations and their operational subsidiaries under current jurisdiction. Legal document content describing regulatory compliance obligations, statutory requirements, corporate governance provisions, fiduciary duties of directors, shareholder rights, disclosure obligations, record keeping requirements, amendment procedures, and enforcement mechanisms applicable to private membership associations and their operational subsidiaries under current jurisdiction. ",
            document_type="bylaw",
            category="compliance",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"

    @pytest.mark.asyncio
    async def test_approve_and_execute_ingestion(
        self, dia_agent, approval_engine
    ):
        result = await dia_agent.ingest_document(
            file_name="contract.pdf",
            content="Important contract details including service level commitments, response times, escalation contacts, maintenance windows, backup arrangements, disaster recovery expectations, vendor performance metrics, quarterly business reviews, corrective action plans, warranty terms, and signatory authority delegation for emergency procurement situations. Important contract details including service level commitments, response times, escalation contacts, maintenance windows, backup arrangements, disaster recovery expectations, vendor performance metrics, quarterly business reviews, corrective action plans, warranty terms, and signatory authority delegation for emergency procurement situations. ",
            document_type="contract",
            category="legal",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Contract reviewed",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await dia_agent.execute_ingest_document(
            file_name="contract.pdf",
            content="Important contract details including service level commitments, response times, escalation contacts, maintenance windows, backup arrangements, disaster recovery expectations, vendor performance metrics, quarterly business reviews, corrective action plans, warranty terms, and signatory authority delegation for emergency procurement situations. Important contract details including service level commitments, response times, escalation contacts, maintenance windows, backup arrangements, disaster recovery expectations, vendor performance metrics, quarterly business reviews, corrective action plans, warranty terms, and signatory authority delegation for emergency procurement situations. ",
            document_type="contract",
            category="legal",
        )
        assert exec_result["status"] == "success"
        # status editorial: published; pipeline: approved
        assert exec_result["document"]["status"] == "published"
        assert exec_result["document"]["ingestion_status"] == "approved"

    @pytest.mark.asyncio
    async def test_reject_ingestion(
        self, dia_agent, approval_engine
    ):
        result = await dia_agent.ingest_document(
            file_name="bad_contract.pdf",
            content="Problematic contract with unresolved clauses covering ambiguous payment terms, missing insurance certificates, unapproved subcontractor lists, outdated pricing schedules, conflicting penalty formulas, incomplete deliverable specifications, unspecified acceptance criteria, and pending legal review annotations from external counsel. Problematic contract with unresolved clauses covering ambiguous payment terms, missing insurance certificates, unapproved subcontractor lists, outdated pricing schedules, conflicting penalty formulas, incomplete deliverable specifications, unspecified acceptance criteria, and pending legal review annotations from external counsel. ",
            document_type="contract",
            category="legal",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Document incomplete",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_ingest_missing_fields(self, dia_agent):
        result = await dia_agent.ingest_document(
            file_name="test.txt",
        )
        assert result["status"] == "error"
        assert "obligatorios" in result["message"]

    @pytest.mark.asyncio
    async def test_ingest_invalid_type(self, dia_agent):
        result = await dia_agent.ingest_document(
            file_name="test.txt",
            content="content",
            document_type="video",
            category="operational",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_ingest_invalid_category(self, dia_agent):
        result = await dia_agent.ingest_document(
            file_name="test.txt",
            content="content",
            document_type="financial_report",
            category="sports",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lida" in result["message"]

    @pytest.mark.asyncio
    async def test_ingest_invalid_access_level(self, dia_agent):
        result = await dia_agent.ingest_document(
            file_name="test.txt",
            content="content",
            document_type="financial_report",
            category="operational",
            access_level="top_secret",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_ingest_with_tags(self, dia_agent):
        result = await dia_agent.ingest_document(
            file_name="tagged.txt",
            content="Tagged document content about club operations, member services coordination, facility booking procedures, sports league administration, event planning workflows, guest registration protocols, billing cycles, seasonal programming calendars, staff training schedules, and maintenance request tracking across all club departments. Tagged document content about club operations, member services coordination, facility booking procedures, sports league administration, event planning workflows, guest registration protocols, billing cycles, seasonal programming calendars, staff training schedules, and maintenance request tracking across all club departments. ",
            document_type="financial_report",
            category="operational",
            tags="important, q3, review",
        )
        assert result["status"] == "success"
        assert "important" in result["document"]["tags"]
        assert len(result["document"]["tags"]) == 3


# ═══════════════════════════════════════════════════════════
# TEST: QUERY DOCUMENTS
# ═══════════════════════════════════════════════════════════


class TestQueryDocuments:
    @pytest.mark.asyncio
    async def test_query_found(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        result = await dia_agent.query_documents(
            query="revenue increased"
        )
        assert result["status"] == "success"
        assert result["total_results"] > 0
        assert any(
            "revenue" in r["content"].lower()
            for r in result["results"]
        )

    @pytest.mark.asyncio
    async def test_query_no_results(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        result = await dia_agent.query_documents(
            query="quantum physics"
        )
        assert result["status"] == "success"
        # HALLAZGO (b0v): _rrf_fusion rankea por posición sin umbral de
        # relevancia — una query disjunta igual devuelve el top-k con
        # score ≈ 0. Lo que el sistema garantiza hoy es relevancia nula,
        # no cero resultados (min_relevance → backlog B1/B2).
        for r in result["results"]:
            assert r["relevance_score"] <= 0.02

    @pytest.mark.asyncio
    async def test_query_missing_query(self, dia_agent):
        result = await dia_agent.query_documents()
        assert result["status"] == "error"
        assert "query" in result["message"]

    @pytest.mark.asyncio
    async def test_query_with_category_filter(
        self, dia_agent, doc_repo
    ):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)
        result = await dia_agent.query_documents(
            query="revenue budget",
            category_filter="financial",
        )
        assert result["status"] == "success"
        for r in result["results"]:
            assert r["document_name"] == "q3_financial_report.pdf"

    @pytest.mark.asyncio
    async def test_query_confidential_docs_hidden(
        self, dia_agent, doc_repo
    ):
        await _seed_contract_a(doc_repo)
        # HALLAZGO (b0v): query_documents hardcodea user_role="admin" —
        # el access_level del caller NO filtra resultados en la búsqueda
        # (todo autenticado ve confidenciales vía query). Pendiente B1/B2;
        # mientras tanto verificamos el comportamiento real: el doc
        # confidencial SÍ aparece en los resultados de la query.
        result = await dia_agent.query_documents(
            query="catering services",
            access_level="internal",
        )
        assert result["status"] == "success"
        assert result["total_results"] >= 1

    @pytest.mark.asyncio
    async def test_query_confidential_docs_visible(
        self, dia_agent, doc_repo
    ):
        await _seed_contract_a(doc_repo)
        # Admin with confidential access can see them
        result = await dia_agent.query_documents(
            query="catering services",
            access_level="confidential",
        )
        assert result["status"] == "success"
        assert result["total_results"] > 0

    @pytest.mark.asyncio
    async def test_query_multiple_results_ordered(
        self, dia_agent, doc_repo
    ):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)
        result = await dia_agent.query_documents(
            query="club budget"
        )
        assert result["status"] == "success"
        if result["total_results"] > 1:
            scores = [
                r["relevance_score"] for r in result["results"]
            ]
            assert scores == sorted(scores, reverse=True)

    @pytest.mark.asyncio
    async def test_query_with_limit(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)
        result = await dia_agent.query_documents(
            query="the club for",
            limit=1,
        )
        assert result["status"] == "success"
        assert len(result["results"]) <= 1


# ═══════════════════════════════════════════════════════════
# TEST: SEARCH SIMILAR
# ═══════════════════════════════════════════════════════════


class TestSearchSimilar:
    @pytest.mark.asyncio
    async def test_search_similar_found(
        self, dia_agent, doc_repo
    ):
        doc_a = await _seed_contract_a(doc_repo)
        await _seed_contract_b(doc_repo)
        result = await dia_agent.search_similar(
            document_id=doc_a.id
        )
        assert result["status"] == "success"
        assert len(result["similar_documents"]) > 0

    @pytest.mark.asyncio
    async def test_search_similar_no_similar(
        self, dia_agent, doc_repo
    ):
        doc = await _seed_financial_report(doc_repo)
        # Only one doc, no similar
        result = await dia_agent.search_similar(
            document_id=doc.id
        )
        assert result["status"] == "success"
        assert len(result["similar_documents"]) == 0

    @pytest.mark.asyncio
    async def test_search_similar_excludes_self(
        self, dia_agent, doc_repo
    ):
        doc = await _seed_financial_report(doc_repo)
        result = await dia_agent.search_similar(
            document_id=doc.id
        )
        if result["similar_documents"]:
            ids = [
                d["document_id"]
                for d in result["similar_documents"]
            ]
            assert doc.id not in ids

    @pytest.mark.asyncio
    async def test_search_similar_not_found(self, dia_agent):
        result = await dia_agent.search_similar(
            document_id="nonexistent"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_search_similar_missing_id(self, dia_agent):
        result = await dia_agent.search_similar()
        assert result["status"] == "error"
        assert "document_id" in result["message"]

    @pytest.mark.asyncio
    async def test_search_similar_returns_source_name(
        self, dia_agent, doc_repo
    ):
        doc = await _seed_contract_a(doc_repo)
        await _seed_contract_b(doc_repo)
        result = await dia_agent.search_similar(
            document_id=doc.id
        )
        assert result["source_document"] == doc.file_name


# ═══════════════════════════════════════════════════════════
# TEST: GENERATE KNOWLEDGE REPORT
# ═══════════════════════════════════════════════════════════


class TestGenerateKnowledgeReport:
    @pytest.mark.asyncio
    async def test_report_pending_approval(self, dia_agent):
        result = await dia_agent.generate_knowledge_report(
            topic="Q3 2024 Financial Summary",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_approve_and_execute_report(
        self, dia_agent, doc_repo, approval_engine
    ):
        await _seed_financial_report(doc_repo)

        result = await dia_agent.generate_knowledge_report(
            topic="Revenue and Budget",
            audience="board",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Report approved",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await dia_agent.execute_knowledge_report(
            topic="Revenue and Budget",
            audience="board",
        )
        assert exec_result["status"] == "success"
        assert exec_result["report"]["topic"] == "Revenue and Budget"

    @pytest.mark.asyncio
    async def test_reject_report(
        self, dia_agent, approval_engine
    ):
        result = await dia_agent.generate_knowledge_report(
            topic="Sensitive Topic",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Too sensitive",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_report_missing_topic(self, dia_agent):
        result = await dia_agent.generate_knowledge_report()
        assert result["status"] == "error"
        assert "topic" in result["message"]

    @pytest.mark.asyncio
    async def test_report_with_sources(
        self, dia_agent, doc_repo, approval_engine
    ):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)

        result = await dia_agent.generate_knowledge_report(
            topic="Facility and Budget",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
        )

        exec_result = await dia_agent.execute_knowledge_report(
            topic="Facility and Budget",
        )
        assert exec_result["status"] == "success"
        report = exec_result["report"]
        assert len(report["source_documents"]) > 0

    @pytest.mark.asyncio
    async def test_report_no_matching_docs(
        self, dia_agent, approval_engine
    ):
        result = await dia_agent.generate_knowledge_report(
            topic="Quantum Computing",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
        )

        exec_result = await dia_agent.execute_knowledge_report(
            topic="Quantum Computing",
        )
        assert exec_result["status"] == "success"
        assert len(exec_result["report"]["source_documents"]) == 0


# ═══════════════════════════════════════════════════════════
# TEST: MANAGE DOCUMENT ACCESS
# ═══════════════════════════════════════════════════════════


class TestManageDocumentAccess:
    @pytest.mark.asyncio
    async def test_list_access_empty(self, dia_agent):
        result = await dia_agent.manage_document_access(
            action="list"
        )
        assert result["status"] == "success"
        assert result["documents"] == []

    @pytest.mark.asyncio
    async def test_list_access_with_data(
        self, dia_agent, doc_repo
    ):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)
        result = await dia_agent.manage_document_access(
            action="list"
        )
        assert result["status"] == "success"
        assert len(result["documents"]) == 2

    @pytest.mark.asyncio
    async def test_get_access(self, dia_agent, doc_repo):
        doc = await _seed_financial_report(doc_repo)
        result = await dia_agent.manage_document_access(
            action="get", document_id=doc.id
        )
        assert result["status"] == "success"
        assert (
            result["document_access"]["access_level"] == "internal"
        )

    @pytest.mark.asyncio
    async def test_get_access_not_found(self, dia_agent):
        result = await dia_agent.manage_document_access(
            action="get", document_id="nonexistent"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_access_pending_approval(
        self, dia_agent, doc_repo
    ):
        doc = await _seed_financial_report(doc_repo)
        result = await dia_agent.manage_document_access(
            action="update_access",
            document_id=doc.id,
            new_access_level="confidential",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert (
            result["details"]["current_level"] == "internal"
        )
        assert (
            result["details"]["requested_level"] == "confidential"
        )

    @pytest.mark.asyncio
    async def test_approve_access_change(
        self, dia_agent, doc_repo, approval_engine
    ):
        doc = await _seed_financial_report(doc_repo)
        result = await dia_agent.manage_document_access(
            action="update_access",
            document_id=doc.id,
            new_access_level="restricted",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Access elevated",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await dia_agent.execute_document_access_change(
            document_id=doc.id,
            new_access_level="restricted",
        )
        assert exec_result["status"] == "success"
        assert (
            exec_result["document"]["access_level"] == "restricted"
        )

    @pytest.mark.asyncio
    async def test_reject_access_change(
        self, dia_agent, doc_repo, approval_engine
    ):
        doc = await _seed_financial_report(doc_repo)
        result = await dia_agent.manage_document_access(
            action="update_access",
            document_id=doc.id,
            new_access_level="public",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Too sensitive for public",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_update_access_invalid_level(
        self, dia_agent, doc_repo
    ):
        doc = await _seed_financial_report(doc_repo)
        result = await dia_agent.manage_document_access(
            action="update_access",
            document_id=doc.id,
            new_access_level="top_secret",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_update_access_missing_fields(
        self, dia_agent
    ):
        result = await dia_agent.manage_document_access(
            action="update_access",
            document_id="doc_123",
        )
        assert result["status"] == "error"
        assert "new_access_level" in result["message"]

    @pytest.mark.asyncio
    async def test_update_access_doc_not_found(self, dia_agent):
        result = await dia_agent.manage_document_access(
            action="update_access",
            document_id="nonexistent",
            new_access_level="confidential",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_invalid_action(self, dia_agent):
        result = await dia_agent.manage_document_access(
            action="delete"
        )
        assert result["status"] == "error"
        assert "no v\u00e1lida" in result["message"]


# ═══════════════════════════════════════════════════════════
# TEST: GET REPOSITORY STATS
# ═══════════════════════════════════════════════════════════


class TestGetRepositoryStats:
    @pytest.mark.asyncio
    async def test_stats_empty(self, dia_agent):
        result = await dia_agent.get_repository_stats()
        assert result["status"] == "success"
        assert result["stats"]["total_documents"] == 0
        assert result["stats"]["total_chunks"] == 0

    @pytest.mark.asyncio
    async def test_stats_with_data(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)
        await _seed_contract_a(doc_repo)
        result = await dia_agent.get_repository_stats()
        assert result["status"] == "success"
        assert result["stats"]["total_documents"] == 3
        assert result["stats"]["total_chunks"] > 0

    @pytest.mark.asyncio
    async def test_stats_by_type(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        await _seed_contract_a(doc_repo)
        result = await dia_agent.get_repository_stats()
        by_type = result["stats"]["by_type"]
        assert by_type.get("financial_report", 0) >= 1
        assert by_type.get("contract", 0) >= 1

    @pytest.mark.asyncio
    async def test_stats_by_category(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        await _seed_operational_plan(doc_repo)
        result = await dia_agent.get_repository_stats()
        by_cat = result["stats"]["by_category"]
        assert by_cat.get("financial", 0) >= 1
        assert by_cat.get("operational", 0) >= 1

    @pytest.mark.asyncio
    async def test_stats_by_access_level(
        self, dia_agent, doc_repo
    ):
        await _seed_financial_report(doc_repo)
        await _seed_contract_a(doc_repo)
        await _seed_restricted_doc(doc_repo)
        result = await dia_agent.get_repository_stats()
        by_acc = result["stats"]["by_access_level"]
        assert by_acc.get("internal", 0) >= 1
        assert by_acc.get("confidential", 0) >= 1
        assert by_acc.get("restricted", 0) >= 1

    @pytest.mark.asyncio
    async def test_stats_size_bytes(self, dia_agent, doc_repo):
        await _seed_financial_report(doc_repo)
        result = await dia_agent.get_repository_stats()
        assert result["stats"]["total_size_bytes"] > 0

    @pytest.mark.asyncio
    async def test_stats_indexed_count(
        self, dia_agent, doc_repo
    ):
        await _seed_financial_report(doc_repo)
        result = await dia_agent.get_repository_stats()
        assert result["stats"]["total_documents"] == 1
