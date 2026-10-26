"""
Executive dashboard repository.
In-memory store for KPI snapshots, anomalies, board reports and exports.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from club_mcp.models.executive_dashboard import (
    Anomaly,
    AnomalyDomain,
    AnomalySeverity,
    BoardReport,
    CreateBoardReport,
    ExportFormat,
    ExportRequest,
    ExecutiveSummary,
    ReportAudience,
)

logger = logging.getLogger(__name__)


class ExecutiveDashboardRepository:
    def __init__(self) -> None:
        self._summaries: dict[str, dict] = {}
        self._anomalies: dict[str, dict] = {}
        self._board_reports: dict[str, dict] = {}
        self._exports: dict[str, dict] = {}

    @staticmethod
    def _gen_id() -> str:
        return uuid4().hex[:8]

    # ── Executive Summaries ────────────────────────────────

    async def save_summary(
        self, summary: ExecutiveSummary
    ) -> ExecutiveSummary:
        record = summary.model_dump(mode="json")
        self._summaries[record["id"]] = record
        logger.info(
            "[dashboard_repo] Summary saved: %s (%s)",
            record["period"], record["id"],
        )
        return ExecutiveSummary(**record)

    async def get_summary(
        self, summary_id: str
    ) -> Optional[ExecutiveSummary]:
        record = self._summaries.get(summary_id)
        if not record:
            return None
        return ExecutiveSummary(**record)

    async def list_summaries(
        self,
        period: str = "",
    ) -> list[ExecutiveSummary]:
        results = list(self._summaries.values())
        if period:
            results = [s for s in results if s["period"] == period]
        return [ExecutiveSummary(**s) for s in results]

    # ── Anomalies ──────────────────────────────────────────

    async def save_anomaly(self, anomaly: Anomaly) -> Anomaly:
        record = anomaly.model_dump(mode="json")
        self._anomalies[record["id"]] = record
        return Anomaly(**record)

    async def list_anomalies(
        self,
        domain: str = "",
        severity: str = "",
    ) -> list[Anomaly]:
        results = list(self._anomalies.values())
        if domain:
            results = [a for a in results if a["domain"] == domain]
        if severity:
            results = [a for a in results if a["severity"] == severity]
        return [Anomaly(**a) for a in results]

    async def clear_anomalies(self) -> int:
        count = len(self._anomalies)
        self._anomalies.clear()
        return count

    # ── Board Reports ──────────────────────────────────────

    async def create_board_report(
        self, data: CreateBoardReport
    ) -> BoardReport:
        report_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": report_id,
            **data.model_dump(),
            "status": "draft",
            "created_at": now,
            "updated_at": now,
        }
        self._board_reports[report_id] = record
        logger.info(
            "[dashboard_repo] Board report created: %s %s (%s)",
            data.quarter.value, data.year, report_id,
        )
        return BoardReport(**record)

    async def get_board_report(
        self, report_id: str
    ) -> Optional[BoardReport]:
        record = self._board_reports.get(report_id)
        if not record:
            return None
        return BoardReport(**record)

    async def list_board_reports(
        self,
        year: int = 0,
        quarter: str = "",
    ) -> list[BoardReport]:
        results = list(self._board_reports.values())
        if year:
            results = [r for r in results if r["year"] == year]
        if quarter:
            results = [
                r for r in results if r["quarter"] == quarter
            ]
        return [BoardReport(**r) for r in results]

    async def update_board_report(
        self, report_id: str, updates: dict
    ) -> Optional[BoardReport]:
        record = self._board_reports.get(report_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return BoardReport(**record)

    # ── Exports ────────────────────────────────────────────

    async def create_export(
        self,
        report_type: str,
        export_format: ExportFormat,
        audience: ReportAudience = ReportAudience.INTERNAL,
    ) -> ExportRequest:
        export_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": export_id,
            "report_type": report_type,
            "export_format": export_format.value,
            "audience": audience.value,
            "status": "completed",
            "file_path": (
                f"/exports/{report_type}_{export_id}"
                f".{export_format.value}"
            ),
            "created_at": now,
            "updated_at": now,
        }
        self._exports[export_id] = record
        return ExportRequest(**record)

    async def list_exports(
        self,
        report_type: str = "",
    ) -> list[ExportRequest]:
        results = list(self._exports.values())
        if report_type:
            results = [
                e for e in results
                if e["report_type"] == report_type
            ]
        return [ExportRequest(**e) for e in results]
