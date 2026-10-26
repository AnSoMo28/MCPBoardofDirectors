"""
DocumentIntelligenceAgent: RAG — Knowledge Repository.
Club: Castillo Country Club

TOOLS (8):
  search_documents           🟢 AUTO        Búsqueda híbrida para DocumentRepository UI
  knowledge_query            🟢 AUTO        Consulta RAG conversacional
  query_documents            🟢 AUTO        Búsqueda semántica en el repositorio
  search_similar             🟢 AUTO        Encontrar documentos similares
  get_repository_stats       🟢 AUTO        Estadísticas del repositorio
  ingest_document            🟡 SEMI_AUTO   Ingestar documentos (contracts → HITL)
  generate_knowledge_report  🔴 HITL        Generar reportes de conocimiento
  manage_document_access     🔴 HITL        Gestionar acceso a documentos
"""

from __future__ import annotations

import logging
from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.document_intelligence_repo import (
    DocumentIntelligenceRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.document_intelligence import (
    CreateDocument,
    CreateKnowledgeReport,
    DocumentAccessLevel,
    DocumentCategory,
    DocumentType,
    IngestionStatus,
)

logger = logging.getLogger(__name__)

_CONTRACT_TYPES = {DocumentType.CONTRACT, DocumentType.BYLAW}


class DocumentIntelligenceAgent(BaseAgent):
    """
    Agente de inteligencia documental (RAG) de Castillo Country Club.
    Motor de conocimiento con búsqueda semántica, generación de respuestas
    con fuentes citadas, y gestión documental completa.
    """

    agent_name: str = "document_intelligence"
    description: str = "Repositorio de conocimiento y RAG"

    def __init__(
        self, repo=None, approval_engine=None, notifier=None, claude_service=None
    ) -> None:
        super().__init__()
        self.repo = repo or DocumentIntelligenceRepository(claude_service=claude_service)
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass  # Auto-discovered by @MCPTool decorators

    @staticmethod
    def _parse_tags(tags_str: str) -> list[str]:
        return [t.strip() for t in tags_str.split(",") if t.strip()]

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL: SEARCH DOCUMENTS (AUTO) — for DocumentRepository UI
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="search_documents",
        description=(
            "Búsqueda híbrida de documentos (keyword + semántica). "
            "Diseñada para el componente DocumentRepository del frontend. "
            "Devuelve documentos deduplicados con snippets y relevancia."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def search_documents(
        self,
        query: str = "",
        document_types: str = "",
        category: str = "",
        limit: int = 24,
        offset: int = 0,
    ) -> dict[str, Any]:
        if not query:
            return {
                "status": "error",
                "message": "Se requiere query para buscar documentos 🔍",
            }

        type_list = self._parse_tags(document_types) if document_types else None

        result = await self.repo.search_documents_rag(
            query=query,
            user_role="admin",  # TODO: pass actual user role from context
            document_types=type_list,
            category=category or None,
            limit=limit,
            offset=offset,
        )

        return result

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL: KNOWLEDGE QUERY (AUTO) — for KnowledgeQuery UI
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="knowledge_query",
        description=(
            "Consulta conversacional a la base de conocimiento del club. "
            "Busca en documentos internos y genera una respuesta fundamentada "
            "con fuentes citadas y nivel de confianza. Soporta conversaciones multi-turn."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def knowledge_query(
        self,
        question: str = "",
        conversation_id: str = "",
        max_sources: int = 5,
    ) -> dict[str, Any]:
        if not question:
            return {
                "status": "error",
                "message": "Se requiere una pregunta para consultar la base de conocimiento 🔍",
            }

        result = await self.repo.query_knowledge(
            question=question,
            user_role="admin",  # TODO: pass actual user role from context
            conversation_id=conversation_id or None,
            max_sources=max_sources,
        )

        return result

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL: QUERY DOCUMENTS (AUTO) — semantic chunk search
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="query_documents",
        description=(
            "Buscar en el repositorio de conocimiento mediante búsqueda semántica. "
            "Devuelve fragmentos relevantes con citas al documento fuente."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def query_documents(
        self,
        query: str = "",
        category_filter: str = "",
        document_type_filter: str = "",
        access_level: str = "internal",
        limit: int = 5,
    ) -> dict[str, Any]:
        if not query:
            return {
                "status": "error",
                "message": "Se requiere query para buscar 🔍",
            }

        try:
            # Use hybrid search directly
            candidates = await self.repo.rag.search_engine.search(
                query=query,
                user_role="admin",
                top_k=limit,
                category=category_filter or None,
                document_type=document_type_filter or None,
            )

            if not candidates:
                return {
                    "status": "success",
                    "message": "🔍 No se encontraron resultados para su búsqueda.",
                    "results": [],
                    "total_results": 0,
                }

            results = []
            for c in candidates:
                results.append({
                    "chunk_id": c.id,
                    "document_id": c.document_id,
                    "document_name": c.file_name,
                    "content": c.content or "",
                    "relevance_score": c.final_score,
                    "chunk_index": 0,
                    "section_title": c.metadata.get("section_title", ""),
                })

            return {
                "status": "success",
                "message": f"🔍 {len(results)} fragmento(s) encontrado(s) para '{query}'.",
                "results": results,
                "total_results": len(results),
            }

        except Exception as exc:
            logger.error("[document_intelligence] Query error: %s", exc)
            return {
                "status": "error",
                "message": f"Error en la búsqueda: {exc}",
            }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL: SEARCH SIMILAR (AUTO)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="search_similar",
        description=(
            "Buscar documentos similares a uno dado. "
            "Útil para encontrar contratos relacionados, versiones previas "
            "o documentos sobre el mismo tema."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def search_similar(
        self,
        document_id: str = "",
        limit: int = 5,
    ) -> dict[str, Any]:
        if not document_id:
            return {
                "status": "error",
                "message": "Se requiere document_id 🔍",
            }

        doc = await self.repo.get_document(document_id)
        if not doc:
            return {
                "status": "not_found",
                "message": f"No encontramos el documento {document_id} 😔",
            }

        result = await self.repo.search_similar_rag(
            document_id=document_id,
            limit=limit,
        )

        return result

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL: GET REPOSITORY STATS (AUTO)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="get_repository_stats",
        description=(
            "Obtener estadísticas del repositorio de documentos: "
            "total, por categoría, por tipo, por nivel de acceso, "
            "volumen de almacenamiento y estado del motor RAG."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_repository_stats(self) -> dict[str, Any]:
        stats = await self.repo.get_stats()

        total_docs = stats.get("total_documents", 0)
        total_chunks = stats.get("total_chunks", 0)
        total_size = stats.get("total_size_bytes", 0)

        if total_docs == 0:
            return {
                "status": "success",
                "message": "📊 El repositorio está vacío. Usá 'ingest_document' para cargar documentos.",
                "stats": stats,
            }

        size_kb = total_size / 1024
        size_mb = size_kb / 1024
        size_str = f"{size_mb:.1f} MB" if size_mb >= 1 else f"{size_kb:.1f} KB"

        return {
            "status": "success",
            "message": (
                f"📊 Repositorio: {total_docs} documento(s), "
                f"{total_chunks} fragmento(s), {size_str}."
            ),
            "stats": stats,
        }

    # ══════════════════════════════════════════════════════
    # 🟡 TOOL: INGEST DOCUMENT (SEMI_AUTO → HITL for contracts)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="ingest_document",
        description=(
            "Ingestar documentos al repositorio de conocimiento. "
            "Acepta texto pre-parseado de PDF, Word, Excel, etc. "
            "Contratos y estatutos requieren revisión humana antes de indexarse."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def ingest_document(
        self,
        file_name: str = "",
        content: str = "",
        document_type: str = "",
        category: str = "",
        access_level: str = "internal",
        tags: str = "",
        notes: str = "",
        uploaded_by: str = "system",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([file_name, content, document_type, category]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: file_name, content, document_type, category 📋",
            }

        # Validate enums
        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Tipo no válido: '{document_type}'. "
                    f"Opciones: {', '.join(d.value for d in DocumentType)}"
                ),
            }

        try:
            cat = DocumentCategory(category)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Categoría no válida: '{category}'. "
                    f"Opciones: {', '.join(c.value for c in DocumentCategory)}"
                ),
            }

        try:
            acc_level = DocumentAccessLevel(access_level)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Nivel de acceso no válido: '{access_level}'. "
                    f"Opciones: {', '.join(a.value for a in DocumentAccessLevel)}"
                ),
            }

        tag_list = self._parse_tags(tags) if tags else []

        # Contract/Bylaw → HITL escalation
        if doc_type in _CONTRACT_TYPES:
            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="ingest_document",
                params={
                    "file_name": file_name,
                    "content": content[:500],  # Truncated for approval display
                    "document_type": document_type,
                    "category": category,
                    "access_level": access_level,
                    "tags": tag_list,
                    "notes": notes,
                    "uploaded_by": uploaded_by,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Documento legal/estatuto: '{file_name}' ({document_type}). "
                    f"Nivel de acceso: {access_level}"
                ),
                estimated_impact="Ingestión de documento legal al repositorio de conocimiento",
                affected_count=1,
                approver_roles=["admin"],
            )

            logger.info("[document_intelligence] Contract approval: %s", file_name)

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"📄 Documento legal '{file_name}' requiere revisión. "
                    f"Esperando aprobación del administrador."
                ),
                "details": {
                    "file_name": file_name,
                    "document_type": document_type,
                    "category": category,
                    "access_level": access_level,
                },
            }

        # Other documents → auto-ingest
        result = await self.repo.ingest_text(
            text=content,
            file_name=file_name,
            document_type=document_type,
            category=category,
            access_level=access_level,
            tags=tag_list,
            uploaded_by=uploaded_by,
            notes=notes,
        )

        logger.info("[document_intelligence] Document ingested: %s (%s)", file_name, result.get("document_id"))

        return {
            "status": "success",
            "message": (
                f"📄 Documento '{file_name}' indexado. "
                f"{result.get('chunk_count', 0)} fragmento(s) creado(s)."
            ),
            "document": result.get("document", {}),
        }

    # ── INTERNAL: Execute ingestion after HITL ──

    async def execute_ingest_document(
        self,
        file_name: str,
        content: str,
        document_type: str,
        category: str,
        access_level: str = "internal",
        tags: list[str] | None = None,
        notes: str = "",
        uploaded_by: str = "",
    ) -> dict[str, Any]:
        """Ingesta el documento tras aprobación HITL."""
        result = await self.repo.ingest_text(
            text=content,
            file_name=file_name,
            document_type=document_type,
            category=category,
            access_level=access_level,
            tags=tags,
            uploaded_by=uploaded_by,
            notes=notes,
        )

        doc_id = result.get("document_id", "")

        # Update metadata status to approved
        await self.repo.update_document(doc_id, {
            "ingestion_status": IngestionStatus.APPROVED.value,
            "status": "published",
        })

        # Update ChromaDB metadata
        try:
            from club_mcp.rag.vectorstore import ACCESS_HIERARCHY

            chunks = self.repo.rag.vectorstore._collection.get(
                where={"document_id": doc_id},
            )
            if chunks.get("ids"):
                updated_metas = []
                for meta in chunks["metadatas"]:
                    meta["access_level"] = ACCESS_HIERARCHY.get(access_level, 1)
                    updated_metas.append(meta)
                self.repo.rag.vectorstore.update(
                    ids=chunks["ids"],
                    metadatas=updated_metas,
                )
        except Exception as exc:
            logger.warning("[document_intelligence] ChromaDB metadata update failed: %s", exc)

        logger.info("[document_intelligence] Document approved: %s (%s)", file_name, doc_id)

        return {
            "status": "success",
            "message": (
                f"📄 Documento '{file_name}' aprobado e indexado. "
                f"{result.get('chunk_count', 0)} fragmento(s)."
            ),
            "document": result.get("document", {}),
        }

    # ══════════════════════════════════════════════════════
    # 🔴 TOOL: GENERATE KNOWLEDGE REPORT (HITL)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="generate_knowledge_report",
        description=(
            "Generar un reporte de conocimiento sintetizado "
            "a partir de documentos internos del club. "
            "REQUIERE APROBACIÓN HUMANA. "
            "El reporte cita fuentes documentales."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def generate_knowledge_report(
        self,
        topic: str = "",
        date_from: str = "",
        date_to: str = "",
        categories: str = "",
        audience: str = "internal",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not topic:
            return {
                "status": "error",
                "message": "Se requiere topic para generar el reporte 📋",
            }

        cat_list = self._parse_tags(categories) if categories else []

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="generate_knowledge_report",
            params={
                "topic": topic,
                "date_from": date_from,
                "date_to": date_to,
                "categories": cat_list,
                "audience": audience,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Reporte de conocimiento: '{topic}'. "
                f"Audiencia: {audience}. Puede incluir información sensible."
            ),
            estimated_impact="Síntesis de documentos internos del club",
            affected_count=0,
            approver_roles=["admin"],
        )

        logger.info("[document_intelligence] Knowledge report approval: %s", topic)

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"📋 Reporte sobre '{topic}' registrado. "
                f"Esperando aprobación del administrador."
            ),
            "details": {
                "topic": topic,
                "audience": audience,
                "categories": cat_list,
            },
        }

    # ── INTERNAL: Execute report after HITL approval ──

    async def execute_knowledge_report(
        self,
        topic: str,
        date_from: str = "",
        date_to: str = "",
        categories: list[str] | None = None,
        audience: str = "internal",
    ) -> dict[str, Any]:
        """Genera el reporte tras aprobación HITL usando RAG."""
        # Use RAG to get relevant content
        rag_response = await self.repo.rag.query_rag(
            question=f"Genera un reporte sobre: {topic}",
            user_role="admin",
            max_sources=10,
        )

        # Build source documents from RAG sources
        source_docs: list[dict[str, Any]] = []
        seen_docs: set[str] = set()
        key_findings: list[str] = []

        for source in rag_response.sources:
            if source.document_id not in seen_docs:
                source_docs.append({
                    "document_id": source.document_id,
                    "file_name": source.title,
                    "relevance_score": source.relevance,
                })
                seen_docs.add(source.document_id)
            key_findings.append(f"[{source.title}] {source.snippet[:150]}...")

        summary_parts = [f"Reporte de conocimiento: {topic}"]
        if source_docs:
            summary_parts.append(
                f"Basado en {len(source_docs)} documento(s) con "
                f"{len(rag_response.sources)} fragmento(s) relevante(s)."
            )
            summary_parts.append(f"\n\n{rag_response.answer}")
        else:
            summary_parts.append("No se encontraron documentos relevantes en el repositorio.")

        data = CreateKnowledgeReport(
            topic=topic,
            audience=audience,
            summary=" ".join(summary_parts),
            source_documents=source_docs,
            key_findings=key_findings[:10],
            date_from=date_from,
            date_to=date_to,
            categories=categories or [],
        )
        report = await self.repo.create_report(data)

        logger.info("[document_intelligence] Report confirmed: %s (%s)", report.topic, report.id)

        return {
            "status": "success",
            "message": (
                f"📋 Reporte sobre '{topic}' generado. "
                f"{len(source_docs)} fuente(s) citada(s)."
            ),
            "report": report.model_dump(mode="json"),
        }

    # ══════════════════════════════════════════════════════
    # 🔴 TOOL: MANAGE DOCUMENT ACCESS (HITL)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="manage_document_access",
        description=(
            "Gestionar niveles de acceso a documentos del club. "
            "REQUIERE APROBACIÓN HUMANA para cambiar accesos. "
            "Consultas son directas."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def manage_document_access(
        self,
        action: str = "list",
        document_id: str = "",
        new_access_level: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            docs = await self.repo.list_documents()
            access_info = [
                {
                    "document_id": d.id,
                    "file_name": d.file_name,
                    "title": d.title,
                    "access_level": d.access_level.value,
                    "document_type": d.document_type.value,
                    "category": d.category.value,
                }
                for d in docs
            ]
            return {
                "status": "success",
                "message": f"🔒 {len(access_info)} documento(s) con niveles de acceso.",
                "documents": access_info,
            }

        # ── Get ──
        if action == "get":
            if not document_id:
                return {
                    "status": "error",
                    "message": "Se requiere document_id 🔍",
                }
            doc = await self.repo.get_document(document_id)
            if not doc:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el documento {document_id} 😔",
                }
            return {
                "status": "success",
                "document_access": {
                    "document_id": doc.id,
                    "file_name": doc.file_name,
                    "title": doc.title,
                    "access_level": doc.access_level.value,
                    "document_type": doc.document_type.value,
                    "category": doc.category.value,
                },
            }

        # ── Update Access → HITL ──
        if action == "update_access":
            if not all([document_id, new_access_level]):
                return {
                    "status": "error",
                    "message": "Se requiere document_id y new_access_level 🔍",
                }

            try:
                DocumentAccessLevel(new_access_level)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Nivel no válido: '{new_access_level}'. "
                        f"Opciones: {', '.join(a.value for a in DocumentAccessLevel)}"
                    ),
                }

            doc = await self.repo.get_document(document_id)
            if not doc:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el documento {document_id} 😔",
                }

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_document_access",
                params={
                    "action": "update_access",
                    "document_id": document_id,
                    "new_access_level": new_access_level,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Cambio de acceso para '{doc.file_name}': "
                    f"'{doc.access_level.value}' → '{new_access_level}'"
                ),
                estimated_impact="Modificación de permisos de acceso a documento",
                affected_count=1,
                approver_roles=["admin"],
            )

            logger.info("[document_intelligence] Access change request: %s", doc.file_name)

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"🔒 Cambio de acceso para '{doc.file_name}' registrado. "
                    f"Esperando aprobación."
                ),
                "details": {
                    "document_id": document_id,
                    "file_name": doc.file_name,
                    "current_level": doc.access_level.value,
                    "requested_level": new_access_level,
                },
            }

        return {
            "status": "error",
            "message": f"Acción no válida: '{action}'. Usa: list, get, update_access 🔍",
        }

    # ── INTERNAL: Execute access change after HITL ──

    async def execute_document_access_change(
        self,
        document_id: str,
        new_access_level: str,
    ) -> dict[str, Any]:
        """Cambia el acceso tras aprobación HITL."""
        doc = await self.repo.update_document(document_id, {"access_level": new_access_level})
        if not doc:
            return {
                "status": "error",
                "message": f"Documento {document_id} no encontrado.",
            }

        # Update ChromaDB metadata
        try:
            from club_mcp.rag.vectorstore import ACCESS_HIERARCHY
            chunks = self.repo.rag.vectorstore._collection.get(
                where={"document_id": document_id},
            )
            if chunks.get("ids"):
                updated_metas = []
                for meta in chunks["metadatas"]:
                    meta["access_level"] = ACCESS_HIERARCHY.get(new_access_level, 1)
                    updated_metas.append(meta)
                self.repo.rag.vectorstore.update(
                    ids=chunks["ids"],
                    metadatas=updated_metas,
                )
        except Exception as exc:
            logger.warning("[document_intelligence] ChromaDB access update failed: %s", exc)

        logger.info("[document_intelligence] Access changed: %s → %s", doc.file_name, new_access_level)

        return {
            "status": "success",
            "message": f"🔒 Acceso de '{doc.file_name}' cambiado a: {new_access_level}.",
            "document": doc.model_dump(mode="json"),
        }
