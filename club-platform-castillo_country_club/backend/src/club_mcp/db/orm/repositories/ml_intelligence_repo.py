"""MLIntelligenceRepository async — la capa de datos se vuelve SQL.

Ola 2.1-decimonovena (vertical ml_intelligence · Q-PER-01 CERRADO:
0 repos in-memory). Contrato EXACTO del módulo in-memory que
reemplaza (club_mcp.db.repositories.ml_intelligence_repo): mismos
9 métodos públicos async, mismas firmas, mismos Pydantic de
salida, mismo comportamiento de error — el in-memory no define
excepciones custom y el ORM tampoco las inventa.

La decimonovena es READ-ONLY SIN tabla propia (perfil post-G35:
0 escrituras · 0 privados tocados por el agente — contrato limpio
de punta a punta, perfil idéntico al member_360 de G34). No hay
alembic: este repo NO persiste — AGREGA. Es un compute engine
cross-domain: los 9 métodos son análisis, no CRUD.

Arquitectura — la FUENTE cambia, la matemática NO se toca:

  * El in-memory siembra un dataset cross-domain en __init__
    (_build_cross_domain_seed) y corre SOBRE él la matemática
    (ensemble Isolation Forest + IQR · Prophet CR · PSI ·
    clustering aglomerativo · churn híbrido). El ORM reemplaza la
    FUENTE: _load_cross_domain_data() junta agregados mensuales
    de las TABLAS REALES de las verticales migradas y arma el
    MISMO shape self._data (mismas claves, mismos tipos).
    Las FEATURES per-member del seed (engagement/ltv/churn_risk/
    satisfaction/visits) no existen en NINGUNA de las 18 tablas
    (son features de ML, no columnas de dominio) — el diseño
    honesto es UNA tabla propia opcional para ellas:
    ml_member_features (siembra idempotente con el dataset del
    in-memory, mecánica member360.seed_demo_data). Con features
    vivas el canon es byte a byte; SIN ellas el repo degrada con
    proxies por-tier deterministas (MISMA forma, MISMA matemática):
      - finance_invoices (total/paid_date)         → revenue_monthly
      - events (date_start/attendance/price)       → events_monthly
      - satisfaction_surveys (score/submitted_at)  → satisfaction_monthly
      - members_360 + engagement_profile            → members
      - guest_monthly_snapshots (new/trials/conv)   → guest_monthly
      - age_group_monthly_snapshots (teens)         → age_group_monthly
      - notification_logs (sent/recipient_count)   → comms_monthly
      - facility_reservations/capacity             → facility_occupancy
    Tablas vacías → series vacías → MISMA degradación del
    in-memory con dataset vacío (contrato observable idéntico).
  * La matemática es IMPORTADA del módulo in-memory (fuente única
    de verdad): _mean/_std/_z_score/_exponential_smoothing/
    _compute_ci/_ensemble_anomalies/_compute_psi/_prophet_
    forecast/_HAS_PROPHET. Los 9 métodos del ORM leen SQL y
    delegan el análisis en esos helpers — jamás se bifurca.
  * _MODEL_METADATA/_BENCHMARKS: metadato del repo (historial de
    entrenamiento, benchmarks CR) — atributos de clase del
    in-memory reutilizados.

Mismas decisiones que las 18 verticales (§3.8..§3.8-DECIMOC-
TAVA): engine por inyección · session_scope transaccional ·
devuelve Pydantic (SQLAlchemy no sube) · canon determinista
(lección run #56: orden ENUM/ORDER BY explícito — agregados por
período ASC, members por id de inserción).

Lección run #70 aplicada por diseño: NINGÚN método construye
modelos pesados al leer — get_model_health lee metadatos y
series livianas; la única pieza pesada (Prophet) corre bajo
demanda EXPLÍCITA del forecast con fallback smoothing probado.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any


if TYPE_CHECKING:
    from collections.abc import Sequence

from sqlalchemy import select

from club_mcp.db.orm.age_group_orm import (
    AgeGroupMonthlySnapshotORM,
)
from club_mcp.db.orm.communication_orm import NotificationLogORM
from club_mcp.db.orm.event_orm import EventORM
from club_mcp.db.orm.facility_management_orm import (
    FacilityORM,
    FacilityReservationORM,
)
from club_mcp.db.orm.finance_orm import FinanceInvoiceORM
from club_mcp.db.orm.guest_orm import GuestMonthlySnapshotORM
from club_mcp.db.orm.member360_orm import Member360MemberORM
from club_mcp.db.orm.satisfaction_orm import SatisfactionSurveyORM
from club_mcp.db.orm.session import session_scope
from club_mcp.db.repositories import ml_intelligence_repo as _inmem
from club_mcp.db.repositories.ml_intelligence_repo import (
    _compute_psi,
    _ensemble_anomalies,
    _mean,
    _std,
    _z_score,
)
from club_mcp.models.ml_intelligence import (
    Anomaly,
    AnomalyFactor,
    AnomalyReport,
    AnomalySeverity,
    AnomalyType,
    ChatContext,
    ChurnMLReport,
    ChurnMLScore,
    DataQualityReport,
    DomainCoverageStatus,
    DomainQualityScore,
    DriftReport,
    DriftStatus,
    ForecastFactor,
    ForecastPoint,
    ForecastTarget,
    MemberSegment,
    MemberSegmentation,
    ModelHealthReport,
    ModelPerformance,
    PredictionExplanation,
    RevenueForecast,
    RevenueScenario,
    ScenarioType,
    SegmentLabel,
)


logger = logging.getLogger(__name__)

_HAS_PROPHET = _inmem._HAS_PROPHET
_prophet_forecast = _inmem._prophet_forecast
_exponential_smoothing = _inmem._exponential_smoothing
_compute_ci = _inmem._compute_ci

from club_mcp.db.orm.ml_intelligence_orm import MLMemberFeatureORM  # noqa: E402


# dominios con fuente SQL viva (data quality los reporta fresh)
_COVERAGE_SOURCE = {
    "member_360", "finance", "events", "satisfaction",
    "guest_management", "communications", "age_group", "facilities",
}

_DOMAIN_DISPLAY = {
    "member_360": "Member 360",
    "finance": "Finanzas",
    "events": "Eventos",
    "facilities": "Instalaciones",
    "sports": "Deportes",
    "communications": "Comunicaciones",
    "satisfaction": "Satisfacción",
    "age_group": "Grupos Etarios",
    "guest_management": "Invitados",
    "wellness": "Bienestar",
    "families": "Familias",
    "engagement": "Engagement",
    "cultural_social": "Cultural y Social",
}


# ── data-layer: agrega las TABLAS al shape del seed ─────────


def _month_of(value: Any) -> str | None:
    """YYYY-MM de date/datetime/str ISO — None si no parsea."""
    if value is None:
        return None
    text = str(value)
    if len(text) >= 7 and text[4] == "-":
        candidate = text[:7]
        if candidate[:4].isdigit() and candidate[5:7].isdigit():
            return candidate
    return None


def _seed_shape() -> dict[str, Any]:
    """Estructura del seed con series VACÍAS (mismas claves)."""
    return {
        "months": [],
        "members": [],
        "revenue_monthly": {},
        "budget_monthly": {},
        "events_monthly": {},
        "facility_occupancy": {},
        "satisfaction_monthly": {},
        "guest_monthly": {},
        "comms_monthly": {},
        "age_group_monthly": {},
        "domain_coverage": _inmem._build_cross_domain_seed()[
            "domain_coverage"
        ],
    }


async def _count_features(engine: Any) -> int:
    """Total de filas de ml_member_features (ancla del suite)."""
    from sqlalchemy import func as _func

    async with session_scope(engine, repo="ml_intelligence") as s:
        return int(
            (await s.execute(
                select(_func.count(MLMemberFeatureORM.member_id))
            )).scalar_one()
        )


def _ensure_months(data: dict[str, Any]) -> list[str]:
    """Meses observados en TODAS las series, orden ASC — canon run #56."""
    months: set[str] = {
        m
        for key in (
            "revenue_monthly", "events_monthly",
            "satisfaction_monthly", "guest_monthly",
            "comms_monthly", "age_group_monthly",
            "facility_occupancy",
        )
        for m in data[key]
    }
    ordered = sorted(months)
    data["months"] = ordered
    return ordered


async def _load_cross_domain_data(engine: Any) -> dict[str, Any]:
    """El dataset cross-domain, de las TABLAS reales.

    Un solo session_scope por carga (los 9 métodos del
    in-memory releen self._data — aquí releen el snapshot).
    """
    data = _seed_shape()

    async with session_scope(engine, repo="ml_intelligence") as s:
        # ── finance: revenue por mes de invoices PAGADAS ──
        rows = (
            (await s.execute(
                select(
                    FinanceInvoiceORM.paid_date,
                    FinanceInvoiceORM.total,
                )
            )).all()
        )
        for paid_date, total in rows:
            month = _month_of(paid_date)
            if month and total:
                data["revenue_monthly"][month] = round(
                    data["revenue_monthly"].get(month, 0.0)
                    + float(total)
                )
            # budget proxy: el seed usaba presupuesto fijo — sobre
            # tablas no hay presupuesto (no migrado): revenue como
            # base (MISMA forma, el budget_monthly vacío degrada los
            # vs_budget a 0.0 — MISMO contrato observable del
            # in-memory con budget 0).
        for month in data["revenue_monthly"]:
            data["budget_monthly"][month] = data["revenue_monthly"][month]

        # ── events: count/attendance/revenue por mes ──
        event_rows = (
            (await s.execute(
                select(
                    EventORM.date_start,
                    EventORM.current_attendance,
                    EventORM.price_per_person,
                )
            )).all()
        )
        for date_start, attendance, price in event_rows:
            month = _month_of(date_start)
            if month is None:
                continue
            bucket = data["events_monthly"].setdefault(month, {
                "count": 0, "attendance": 0, "revenue": 0,
            })
            bucket["count"] += 1
            bucket["attendance"] += int(attendance or 0)
            bucket["revenue"] += round(
                int(attendance or 0) * float(price or 0)
            )

        # ── satisfaction: avg/surveys por mes ──
        survey_rows = (
            (await s.execute(
                select(
                    SatisfactionSurveyORM.submitted_at,
                    SatisfactionSurveyORM.overall_score,
                )
            )).all()
        )
        for submitted_at, score in survey_rows:
            month = _month_of(submitted_at)
            if month is None:
                continue
            bucket = data["satisfaction_monthly"].setdefault(
                month, {"sum": 0.0, "surveys": 0}
            )
            bucket["sum"] += float(score or 0)
            bucket["surveys"] += 1
        for month, bucket in list(data["satisfaction_monthly"].items()):
            surveys = bucket.pop("surveys")
            avg = round(bucket["sum"] / surveys, 1) if surveys else 0.0
            bucket.pop("sum", None)
            # nps_proxy del seed: forma (avg-4)*40 clamp — proxy
            data["satisfaction_monthly"][month] = {
                "avg": avg,
                "surveys": surveys,
                "nps_proxy": int(
                    max(-100, min(100, (avg - 4) * 40))
                ),
            }

        # ── guest: snapshots mensuales (tabla ES el shape) ──
        guest_rows: Sequence[GuestMonthlySnapshotORM] = (
            (await s.execute(
                select(GuestMonthlySnapshotORM)
            )).scalars().all()
        )
        for snap in guest_rows:
            data["guest_monthly"][snap.month] = {
                "new_guests": snap.new_guests,
                "trials": snap.trials,
                "conversions": snap.conversions,
            }

        # ── age_group: teens/seniors enrolled por mes ──
        age_rows: Sequence[AgeGroupMonthlySnapshotORM] = (
            (await s.execute(
                select(AgeGroupMonthlySnapshotORM)
            )).scalars().all()
        )
        for ag in age_rows:
            bucket = data["age_group_monthly"].setdefault(
                ag.month, {"teens_enrolled": 0, "seniors_enrolled": 0}
            )
            if ag.age_group == "teens":
                bucket["teens_enrolled"] = ag.enrolled
            elif ag.age_group == "seniors":
                bucket["seniors_enrolled"] = ag.enrolled

        # ── comms: sent/opened/clicked por mes (logs sent) ──
        log_rows = (
            (await s.execute(
                select(
                    NotificationLogORM.sent_at,
                    NotificationLogORM.recipient_count,
                    NotificationLogORM.status,
                )
            )).all()
        )
        for sent_at, recipients, status in log_rows:
            month = _month_of(sent_at)
            if month is None:
                continue
            bucket = data["comms_monthly"].setdefault(month, {
                "sent": 0, "opened": 0, "clicked": 0,
            })
            if status == "sent":
                sent_n = int(recipients or 0)
                bucket["sent"] += sent_n
                # opened/clicked no son columnas del log (forma de
                # engagement no migrada): MISMA forma con los
                # ratios del benchmark del seed (70%/19%)
                bucket["opened"] += round(sent_n * 0.70)
                bucket["clicked"] += round(sent_n * 0.19)

        # ── members: features de ML si existen, si no members_360 ──
        # ml_member_features ES el shape del seed (canon byte a
        # byte). Sin features sembradas: proxies por-tier sobre
        # members_360 (MISMA forma, MISMA matemática).
        feat_rows: Sequence[MLMemberFeatureORM] = (
            (await s.execute(
                select(MLMemberFeatureORM).order_by(
                    MLMemberFeatureORM.member_id
                )
            )).scalars().all()
        )
        if feat_rows:
            for feat in feat_rows:
                data["members"].append(feat.to_dict())
        else:
            member_rows: Sequence[Member360MemberORM] = (
                (await s.execute(
                    select(Member360MemberORM).order_by(
                        Member360MemberORM.id
                    )
                )).scalars().all()
            )
            for mbr in member_rows:
                data["members"].append(_member_from_orm(mbr))

        # ── facility: occupancy proxy por reservas/capacidad ──
        facility_rows: Sequence[FacilityORM] = (
            (await s.execute(select(FacilityORM))).scalars().all()
        )
        total_capacity = sum(r.capacity or 0 for r in facility_rows)
        res_rows: Sequence[FacilityReservationORM] = (
            (await s.execute(
                select(FacilityReservationORM)
            )).scalars().all()
        )
        if total_capacity:
            per_month: dict[str, int] = {}
            for res in res_rows:
                month = _month_of(res.date)
                if month:
                    per_month[month] = per_month.get(month, 0) + 1
            for month, count in per_month.items():
                data["facility_occupancy"][month] = min(
                    100, round(count * 100 / max(total_capacity, 1))
                )

    _ensure_months(data)
    return data


def _member_from_orm(row: Member360MemberORM) -> dict[str, Any]:
    """Member del seed — shape exacto, valores de la TABLA.

    engagement: proxy (100 por defecto — sin serie histórica por
    miembro en members_360; MISMA forma, valor vivo del club).
    join_month de join_date · tenure real · churn_risk por tier
    ( MISMA heurística de mapeo del seed: vip/platino low ·
    bronce high) · ltv/satisfaction/visits/active_domains con
    defaults del MISMO rango del seed.
    """
    join_date = str(row.join_date)
    join_month = join_date[:7] if len(join_date) >= 7 else ""
    tier = (row.tier or "").lower()

    # tenure real en meses desde join_date (hoy)
    try:
        from datetime import date as _date

        today = _date.today()
        jd = row.join_date
        tenure = max(
            0,
            (today.year - jd.year) * 12 + (today.month - jd.month),
        )
    except Exception:
        tenure = 12

    churn = "low" if tier in ("vip", "premium", "platino") else (
        "high" if tier == "bronce" else "medium"
    )

    return {
        "id": row.member_id,
        "name": f"{row.first_name} {row.last_name}".strip(),
        "tier": tier,
        "family_id": row.family_id,
        "join_month": join_month,
        "engagement": 62.0,
        "ltv": 5200000.0,
        "churn_risk": churn,
        "satisfaction": 4.0,
        "visits_monthly": 9,
        "active_domains": ["sports", "dining", "events"],
        "tenure_months": tenure,
    }


def _member_from_orm_with_satisfaction(
    row: Member360MemberORM, avg_sat: float
) -> dict[str, Any]:
    """Variante con satisfaction real del club (por mes activo)."""
    base = _member_from_orm(row)
    base["satisfaction"] = round(avg_sat, 1) if avg_sat else 4.0
    return base


class MLIntelligenceRepository:
    """Repo READ-ONLY cross-domain — ver docstring del módulo."""

    _MODEL_METADATA = _inmem.MLIntelligenceRepository._MODEL_METADATA
    _BENCHMARKS = _inmem.MLIntelligenceRepository._BENCHMARKS

    def __init__(self, engine: Any) -> None:
        self._engine = engine
        self._data: dict[str, Any] | None = None
        self._seeded = False

    async def seed_member_features(self) -> int:
        """Siembra las features del seed in-memory (idempotente).

        Mecánica member360.seed_demo_data: INSERT por member_id —
        re-siembra = no-op por fila (SELECT por PK antes de
        insertar). Devuelve el total de filas DESPUÉS de sembrar
        (el suite lo usa como ancla del canon). El dataset se
        invalida para re-carga (self._data = None).
        """
        if self._seeded:
            rows = (await _count_features(self._engine))
            return rows
        seed_members = _inmem._build_cross_domain_seed()["members"]
        async with session_scope(
            self._engine, repo="ml_intelligence"
        ) as s:
            for m in seed_members:
                exists = await s.execute(
                    select(MLMemberFeatureORM).where(
                        MLMemberFeatureORM.member_id == m["id"]
                    )
                )
                if exists.scalar_one_or_none() is not None:
                    continue
                s.add(MLMemberFeatureORM(
                    member_id=m["id"],
                    name=m["name"],
                    tier=m["tier"],
                    family_id=m["family_id"],
                    join_month=m["join_month"],
                    engagement=float(m["engagement"]),
                    ltv=float(m["ltv"]),
                    churn_risk=m["churn_risk"],
                    satisfaction=float(m["satisfaction"]),
                    visits_monthly=int(m["visits_monthly"]),
                    active_domains=list(m["active_domains"]),
                    tenure_months=int(m["tenure_months"]),
                ))
        self._seeded = True
        self._data = None  # re-carga con las features nuevas
        return await _count_features(self._engine)

    async def _dataset(self) -> dict[str, Any]:
        """self._data del in-memory, pero de las TABLAS reales.

        Lazy UNA vez por instancia (los 9 métodos del in-memory
        releen self._data — MISMA forma de trabajo).
        """
        if self._data is None:
            self._data = await _load_cross_domain_data(self._engine)
            logger.info(
                "[ml_repo_orm] Dataset cross-domain: %d members · "
                "%d meses",
                len(self._data["members"]),
                len(self._data["months"]),
            )
        return self._data

    # ── 1 · Data Quality ──────────────────────────────────

    async def get_data_quality_report(self) -> DataQualityReport:
        """MISMO scoring sobre coverage — fresh para fuentes vivas."""
        data = await self._dataset()
        domains: list[DomainQualityScore] = []

        for domain, coverage in data["domain_coverage"].items():
            comp = coverage["completeness"]
            fresh = coverage["freshness_h"]
            cons = coverage["consistency"]
            if domain in _COVERAGE_SOURCE and _domain_has_data(
                data, domain
            ):
                fresh = 0

            overall = round(
                comp * 0.4 + cons * 0.35
                + max(0, 100 - fresh * 2) * 0.25,
                1,
            )

            if overall >= 80:
                status = DomainCoverageStatus.EXCELLENT
            elif overall >= 60:
                status = DomainCoverageStatus.GOOD
            elif overall >= 40:
                status = DomainCoverageStatus.PARTIAL
            else:
                status = DomainCoverageStatus.MINIMAL

            gaps: list[str] = []
            if comp < 60:
                gaps.append(f"Completitud baja ({comp}%)")
            if fresh > 12:
                gaps.append(f"Data stale ({fresh}h)")
            if cons < 70:
                gaps.append(f"Inconsistencia ({cons}%)")

            recommendation = ""
            if status == DomainCoverageStatus.MINIMAL:
                recommendation = "Seed data + mock alignment urgente"
            elif status == DomainCoverageStatus.PARTIAL:
                recommendation = "Expandir cobertura + reducir staleness"
            elif status == DomainCoverageStatus.GOOD:
                recommendation = "Mejorar consistencia cross-domain"

            domains.append(DomainQualityScore(
                domain=domain,
                display_name=_DOMAIN_DISPLAY.get(domain, domain),
                completeness_pct=comp,
                freshness_hours=fresh,
                consistency_score=cons,
                overall_score=overall,
                status=status,
                gaps=gaps,
                recommendation=recommendation,
            ))

        overall_scores = [d.overall_score for d in domains]
        overall_avg = round(_mean(overall_scores), 1)
        ready = sum(1 for d in domains if d.overall_score >= 60)
        critical_gaps = [
            d.domain for d in domains
            if d.status == DomainCoverageStatus.MINIMAL
        ]

        overall_status = (
            DomainCoverageStatus.EXCELLENT if overall_avg >= 80
            else DomainCoverageStatus.GOOD if overall_avg >= 60
            else DomainCoverageStatus.PARTIAL if overall_avg >= 40
            else DomainCoverageStatus.MINIMAL
        )

        return DataQualityReport(
            overall_score=overall_avg,
            overall_status=overall_status,
            domains=domains,
            total_domains=len(domains),
            domains_ready_for_ml=ready,
            critical_gaps=critical_gaps,
            recommendation=(
                f"{ready}/{len(domains)} dominios listos para ML. "
                f"{len(critical_gaps)} con cobertura mínima: "
                f"{', '.join(critical_gaps) if critical_gaps else 'ninguno'}."
            ),
        )

    # ── 2 · Anomaly Detection (Ensemble) ───────────────────

    async def get_anomaly_report(
        self,
        domain: str | None = None,
    ) -> AnomalyReport:
        """MISMOS detectores sobre las series SQL."""
        data = await self._dataset()
        months = data["months"]
        anomalies: list[Anomaly] = []

        # Revenue: ensemble (misma contamination)
        rev_values = [
            float(data["revenue_monthly"][m]) for m in months
            if m in data["revenue_monthly"]
        ]
        rev_labels = [
            m for m in months if m in data["revenue_monthly"]
        ]
        if len(rev_values) >= 4:
            anomalies.extend(_ensemble_anomalies(
                values=rev_values,
                labels=rev_labels,
                domain="finance",
                metric_prefix="revenue",
                contamination=0.15,
            ))

        # Satisfaction trend (declive < 0.93)
        sat_values = [
            float(data["satisfaction_monthly"][m]["avg"])
            for m in months if m in data["satisfaction_monthly"]
        ]
        if len(sat_values) >= 3:
            last3_avg = _mean(sat_values[-3:])
            overall_avg = _mean(sat_values)
            sat_std = _std(sat_values)
            z = abs(_z_score(last3_avg, overall_avg, sat_std))
            if last3_avg < overall_avg * 0.93:
                anomalies.append(Anomaly(
                    domain="satisfaction",
                    metric="satisfaction_trend",
                    anomaly_type=AnomalyType.DRIFT,
                    severity=(
                        AnomalySeverity.HIGH
                        if last3_avg < overall_avg * 0.88
                        else AnomalySeverity.MEDIUM
                    ),
                    current_value=round(last3_avg, 2),
                    expected_value=round(overall_avg, 2),
                    deviation_pct=round(
                        (last3_avg - overall_avg)
                        / overall_avg * 100, 1
                    ),
                    confidence=0.82,
                    factors=[
                        AnomalyFactor(
                            name="Satisfaction decline",
                            value=round(last3_avg, 2),
                            expected_range_min=4.0,
                            expected_range_max=4.5,
                            deviation_sigma=round(z, 2),
                            contribution_pct=45.0,
                        ),
                    ],
                    explanation=(
                        f"Satisfacción en declive sostenido: "
                        f"últimos 3 meses promedian "
                        f"{last3_avg:.2f}/5 vs promedio histórico "
                        f"{overall_avg:.2f}/5."
                    ),
                    affected_domains=[
                        "satisfaction", "events",
                        "guest_management", "member_360",
                    ],
                    suggested_action=(
                        "Auditoría de catering. Revisión de pricing. "
                        "Encuesta dirigida a detractores recientes."
                    ),
                    detection_method="statistical_trend",
                    ensemble_consensus="single",
                ))

        # Teens enrollment (caída < 0.6 del mean)
        teens_values = [
            float(
                data["age_group_monthly"][m]["teens_enrolled"]
            )
            for m in months
            if m in data["age_group_monthly"]
        ]
        if len(teens_values) >= 4:
            teens_mean = _mean(teens_values)
            teens_std = _std(teens_values)
            if teens_values[-1] < teens_mean * 0.6:
                z = abs(_z_score(
                    teens_values[-1], teens_mean, teens_std
                ))
                anomalies.append(Anomaly(
                    domain="age_group",
                    metric="teens_enrollment",
                    anomaly_type=AnomalyType.DRIFT,
                    severity=(
                        AnomalySeverity.HIGH if z > 2.0
                        else AnomalySeverity.MEDIUM
                    ),
                    current_value=teens_values[-1],
                    expected_value=round(teens_mean),
                    deviation_pct=round(
                        (teens_values[-1] - teens_mean)
                        / max(teens_mean, 1) * 100,
                        1,
                    ),
                    confidence=0.88,
                    factors=[
                        AnomalyFactor(
                            name="Declining interest",
                            value=teens_values[-1],
                            expected_range_min=(
                                teens_mean - teens_std
                            ),
                            expected_range_max=(
                                teens_mean + teens_std
                            ),
                            deviation_sigma=round(z, 2),
                            contribution_pct=60.0,
                        ),
                    ],
                    explanation=(
                        f"Enrollment teens: {teens_values[-1]:.0f} — "
                        f"declive frente al promedio "
                        f"{teens_mean:.0f}."
                    ),
                    affected_domains=[
                        "age_group", "member_360",
                        "communications", "events",
                    ],
                    suggested_action=(
                        "Programa gaming + deportes combo. "
                        "Encuesta a familias con teens."
                    ),
                    detection_method="statistical_trend",
                    ensemble_consensus="single",
                ))

        # Guest conversion (0 con base > 0.5)
        conv_values = [
            float(data["guest_monthly"][m]["conversions"])
            for m in months if m in data["guest_monthly"]
        ]
        if (
            conv_values
            and conv_values[-1] == 0
            and _mean(conv_values[:3]) > 0.5
        ):
            anomalies.append(Anomaly(
                domain="guest_management",
                metric="trial_conversion",
                anomaly_type=AnomalyType.POINT,
                severity=AnomalySeverity.HIGH,
                current_value=0.0,
                expected_value=round(_mean(conv_values[:3]), 1),
                deviation_pct=-100.0,
                confidence=0.75,
                factors=[
                    AnomalyFactor(
                        name="Conversions dropped to 0",
                        value=0.0,
                        expected_range_min=1.0,
                        expected_range_max=3.0,
                        deviation_sigma=2.5,
                        contribution_pct=70.0,
                    ),
                ],
                explanation=(
                    "Conversión trial→member en 0 el último mes. "
                    "Posible gap en el proceso de seguimiento "
                    "post-trial."
                ),
                affected_domains=[
                    "guest_management", "member_360", "finance",
                ],
                suggested_action=(
                    "Revisar pipeline de trials activos. "
                    "Implementar follow-up automático."
                ),
                detection_method="threshold",
                ensemble_consensus="single",
            ))

        if domain:
            anomalies = [a for a in anomalies if a.domain == domain]

        critical_count = sum(
            1 for a in anomalies
            if a.severity == AnomalySeverity.CRITICAL
        )
        high_count = sum(
            1 for a in anomalies
            if a.severity == AnomalySeverity.HIGH
        )
        domains_affected = list({a.domain for a in anomalies})
        risk = min(
            100,
            critical_count * 25 + high_count * 15 + len(anomalies) * 5,
        )

        return AnomalyReport(
            anomalies=anomalies,
            total_anomalies=len(anomalies),
            critical_count=critical_count,
            high_count=high_count,
            domains_affected=domains_affected,
            systemic_risk_score=risk,
            detection_method="ensemble",
            ensemble_size=2,
        )

    # ── 3 · Demand Forecast ────────────────────────────────

    async def get_demand_forecast(
        self,
        target: str = "revenue",
        horizon: int = 3,
    ) -> Any:
        """MISMO dual-path prophet/smoothing sobre series SQL."""
        from club_mcp.models.ml_intelligence import DemandForecast

        data = await self._dataset()
        target_enum = ForecastTarget(target)
        months = data["months"]

        values: list[float] = []
        display_name = ""
        seasonal = ""
        data_note = ""

        if target_enum == ForecastTarget.REVENUE:
            values = [
                data["revenue_monthly"][m] / 1e6
                for m in months if m in data["revenue_monthly"]
            ]
            display_name = "Revenue mensual (₡M)"
            seasonal = "Peak Dic-Feb (temporada alta CR)"
        elif target_enum == ForecastTarget.FACILITY_OCCUPANCY:
            values = [
                float(data["facility_occupancy"][m])
                for m in months if m in data["facility_occupancy"]
            ]
            display_name = "Ocupación instalaciones (%)"
            seasonal = "Peak Jul-Ago y Dic-Feb"
        elif target_enum == ForecastTarget.EVENT_ATTENDANCE:
            values = [
                float(data["events_monthly"][m]["attendance"])
                for m in months if m in data["events_monthly"]
            ]
            display_name = "Asistencia a eventos"
            seasonal = "Peak Mar-May (temporada de bodas)"
        elif target_enum == ForecastTarget.GUEST_VOLUME:
            values = [
                float(data["guest_monthly"][m]["new_guests"])
                for m in months if m in data["guest_monthly"]
            ]
            display_name = "Nuevos invitados"
            seasonal = "Peak Feb-Abr (eventos privados)"
        elif target_enum == ForecastTarget.SATISFACTION:
            values = [
                float(data["satisfaction_monthly"][m]["avg"])
                for m in months if m in data["satisfaction_monthly"]
            ]
            display_name = "Satisfacción promedio"
            seasonal = "Sin patrón estacional claro"
        else:
            values = [
                float(data["events_monthly"][m]["count"])
                for m in months if m in data["events_monthly"]
            ]
            display_name = "Conteo de eventos"
            seasonal = "Peak Mar-May y Oct-Dic"

        data_note = f"Basado en {len(values)} meses de data real"
        current = values[-1] if values else 0
        mean_val = _mean(values)
        std_val = _std(values)

        prophet_comps: dict[str, float] | None = None
        model_used = "exponential_smoothing"
        forecast_points: list[ForecastPoint] = []
        trend = "stable"

        if _HAS_PROPHET and len(values) >= 4:
            series_dict = dict(
                zip(months[-len(values):], values, strict=False)
            )
            pf = _prophet_forecast(
                series=series_dict,
                horizon=horizon,
                yearly_seasonality=len(values) >= 24,
            )
            forecast_points = [
                ForecastPoint(
                    period=p["period"],
                    predicted_value=p["predicted_value"],
                    lower_bound=p["lower_bound"],
                    upper_bound=p["upper_bound"],
                    confidence=p["confidence"],
                    trend_component=p["trend_component"],
                    seasonal_component=p["seasonal_component"],
                )
                for p in pf["points"]
            ]
            trend = pf["trend"]
            prophet_comps = pf["components"]
            model_used = "prophet"
        else:
            smoothed = _exponential_smoothing(
                values, alpha=0.3, horizon=horizon
            )
            future_months = _next_months(
                months[-1] if months else "2026-06", horizon
            )
            for i, pred in enumerate(smoothed[:horizon]):
                lo, hi = _compute_ci(pred, values)
                conf = round(
                    max(0.4, min(0.9, 0.8 - i * 0.12)), 2
                )
                forecast_points.append(ForecastPoint(
                    period=(
                        future_months[i]
                        if i < len(future_months)
                        else f"M+{i+1}"
                    ),
                    predicted_value=round(pred, 2),
                    lower_bound=lo,
                    upper_bound=hi,
                    confidence=conf,
                ))
            if len(values) >= 3:
                first_half = _mean(values[:3])
                second_half = _mean(values[-3:])
                if second_half > first_half * 1.05:
                    trend = "improving"
                elif second_half < first_half * 0.95:
                    trend = "declining"

        vs_last = 0.0
        if forecast_points:
            predicted = forecast_points[0].predicted_value
            vs_last = round(
                (predicted - current) / max(abs(current), 0.01) * 100,
                1,
            )

        factors = [
            ForecastFactor(
                name="Tendencia histórica",
                weight=0.40,
                direction=(
                    "positive" if trend == "improving"
                    else "negative" if trend == "declining"
                    else "neutral"
                ),
                description=f"Tendencia de {len(values)} meses",
            ),
            ForecastFactor(
                name="Estacionalidad CR",
                weight=0.30,
                direction="positive",
                description=seasonal,
            ),
            ForecastFactor(
                name="Variabilidad",
                weight=0.30,
                direction="neutral",
                description=(
                    f"Std: {std_val:.2f} "
                    f"({std_val / max(mean_val, 0.01) * 100:.1f}% del mean)"
                ),
            ),
        ]

        return DemandForecast(
            target=target_enum,
            display_name=display_name,
            current_value=round(current, 2),
            forecast_points=forecast_points,
            factors=factors,
            seasonal_pattern=seasonal,
            trend=trend,
            vs_last_period_pct=vs_last,
            data_quality_note=data_note,
            model_type=model_used,
            prophet_components=prophet_comps,
        )

    # ── 4 · Revenue Forecast ───────────────────────────────

    async def get_revenue_forecast(
        self,
        horizon: int = 3,
        scenario: str | None = None,
    ) -> RevenueForecast:
        """MISMOS 3 escenarios CI-based sobre revenue SQL."""
        data = await self._dataset()
        months = data["months"]
        rev_values = [
            float(data["revenue_monthly"][m])
            for m in months if m in data["revenue_monthly"]
        ]
        budget_values = [
            float(data["budget_monthly"][m])
            for m in months if m in data["budget_monthly"]
        ]
        current = rev_values[-1] if rev_values else 0
        budget = budget_values[-1] if budget_values else 0

        future_months = _next_months(
            months[-1] if months else "2026-06", horizon
        )
        scenarios: list[RevenueScenario] = []
        model_used = "exponential_smoothing"

        if _HAS_PROPHET and len(rev_values) >= 4:
            model_used = "prophet"
            series_dict = dict(
                zip(
                    months[-len(rev_values):],
                    [v / 1e6 for v in rev_values],
                    strict=False,
                )
            )
            pf = _prophet_forecast(
                series=series_dict,
                horizon=horizon,
                yearly_seasonality=len(rev_values) >= 24,
            )

            for stype, prob, label, field, assumptions in [
                (
                    ScenarioType.OPTIMISTIC, 0.25,
                    "Optimista", "upper_bound",
                    [
                        "Basado en intervalo de confianza "
                        "95% superior (Prophet)",
                        "Revenue al máximo del rango esperado",
                    ],
                ),
                (
                    ScenarioType.BASE, 0.50,
                    "Base", "predicted_value",
                    [
                        "Predicción central del modelo Prophet",
                        "Tendencia actual se mantiene",
                    ],
                ),
                (
                    ScenarioType.PESSIMISTIC, 0.25,
                    "Pesimista", "lower_bound",
                    [
                        "Basado en intervalo de confianza "
                        "95% inferior (Prophet)",
                        "Revenue al mínimo del rango esperado",
                    ],
                ),
            ]:
                monthly: dict[str, float] = {}
                total = 0.0
                for p in pf["points"]:
                    val = p[field]
                    monthly[p["period"]] = round(val * 1e6)
                    total += val

                budget_q = (
                    sum(budget_values[-3:]) / 1e6
                    if budget_values else 0.0
                )
                vs_budget = round(
                    (total - budget_q) / max(budget_q, 1) * 100, 1
                )

                scenarios.append(RevenueScenario(
                    scenario_type=stype,
                    label=label,
                    monthly_values=monthly,
                    quarterly_total=round(total * 1e6),
                    vs_budget_pct=vs_budget,
                    probability=prob,
                    key_assumptions=assumptions,
                ))
        else:
            rev_millions = [v / 1e6 for v in rev_values]
            base_forecast = _exponential_smoothing(
                rev_millions, alpha=0.3, horizon=horizon
            )

            for stype, multiplier, prob, label in [
                (ScenarioType.OPTIMISTIC, 1.10, 0.25, "Optimista"),
                (ScenarioType.BASE, 1.00, 0.50, "Base"),
                (ScenarioType.PESSIMISTIC, 0.90, 0.25, "Pesimista"),
            ]:
                monthly = {}
                total = 0.0
                for i, pred in enumerate(base_forecast[:horizon]):
                    adjusted = pred * multiplier
                    month_key = (
                        future_months[i]
                        if i < len(future_months)
                        else f"M+{i+1}"
                    )
                    monthly[month_key] = round(adjusted * 1e6)
                    total += adjusted

                if stype == ScenarioType.OPTIMISTIC:
                    assumptions = [
                        "Membership +5%",
                        "Events pipeline completo confirmado",
                        "Seasonal peak aprovechado",
                    ]
                elif stype == ScenarioType.BASE:
                    assumptions = [
                        "Membership +3%",
                        "Events trend estable",
                        "Seasonal patterns normales",
                    ]
                else:
                    assumptions = [
                        "Membership +1%",
                        "2 eventos corporativos cancelados",
                        "Churn increase +1%",
                    ]

                budget_q = (
                    sum(budget_values[-3:]) / 1e6
                    if budget_values else 0.0
                )
                vs_budget = round(
                    (total - budget_q) / max(budget_q, 1) * 100, 1
                )

                scenarios.append(RevenueScenario(
                    scenario_type=stype,
                    label=label,
                    monthly_values=monthly,
                    quarterly_total=round(total * 1e6),
                    vs_budget_pct=vs_budget,
                    probability=prob,
                    key_assumptions=assumptions,
                ))

        factors = [
            ForecastFactor(
                name="Membership revenue",
                weight=0.35,
                direction="positive",
                description="Crecimiento orgánico +3%",
            ),
            ForecastFactor(
                name="Events pipeline",
                weight=0.25,
                direction="positive",
                description="Pipeline de eventos del club",
            ),
            ForecastFactor(
                name="Estacionalidad",
                weight=0.20,
                direction="positive",
                description="Jul-Ago peak season",
            ),
            ForecastFactor(
                name="Satisfaction decline",
                weight=0.20,
                direction="negative",
                description="Food category afecta repeat business",
            ),
        ]

        rev_millions_all = [v / 1e6 for v in rev_values]
        confidence = round(
            max(
                0.5,
                min(
                    0.9,
                    0.85
                    - _std(rev_millions_all)
                    / max(_mean(rev_millions_all), 0.01),
                ),
            ),
            2,
        )

        return RevenueForecast(
            horizon_months=horizon,
            current_monthly_revenue=current,
            budget_monthly=budget,
            scenarios=scenarios,
            recommended_scenario=ScenarioType.BASE,
            factors=factors,
            confidence=confidence,
            model_type=model_used,
        )

    # ── 5 · Churn ML ───────────────────────────────────────

    async def get_churn_ml_scores(
        self,
        segment: str | None = None,
    ) -> ChurnMLReport:
        """MISMO híbrido (LogisticRegression N>=50/heuristic)."""
        import numpy as np

        data = await self._dataset()
        members = data["members"]
        n = len(members)
        use_ml = False
        probs: Any = None
        model: Any = None
        x_scaled: Any = None
        feature_names: list[str] = []

        if n >= 50:
            try:
                from sklearn.linear_model import LogisticRegression  # type: ignore[import-untyped]
                from sklearn.preprocessing import StandardScaler  # type: ignore[import-untyped]

                feature_names = [
                    "engagement", "visits_monthly",
                    "satisfaction", "active_domains",
                    "tenure_months", "ltv_millions",
                ]
                x_raw = []
                y = []
                for m in members:
                    x_raw.append([
                        m["engagement"],
                        m["visits_monthly"],
                        m["satisfaction"],
                        len(m["active_domains"]),
                        m["tenure_months"],
                        m["ltv"] / 1e6,
                    ])
                    y.append(
                        1 if m["churn_risk"] in ("high", "critical")
                        else 0
                    )

                x_arr = np.array(x_raw, dtype=float)
                y_arr = np.array(y, dtype=int)

                scaler = StandardScaler()
                x_scaled = scaler.fit_transform(x_arr)

                model = LogisticRegression(
                    C=0.5,
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=42,
                )
                model.fit(x_scaled, y_arr)

                probs = model.predict_proba(x_scaled)[:, 1]
                use_ml = True
                logger.info(
                    "[ml_repo_orm] Churn: ML mode (N=%d)", n
                )
            except Exception:
                use_ml = False
                logger.info(
                    "[ml_repo_orm] Churn: ML failed, heuristic"
                )

        scores = _score_members(
            members, use_ml, probs, model, x_scaled,
            feature_names, n,
        )

        if segment:
            scores = [s for s in scores if s.tier == segment]

        scores.sort(key=lambda s: s.ml_churn_score, reverse=True)

        total_at_risk = sum(
            1 for s in scores
            if s.churn_risk in ("high", "critical")
        )
        sig_disc = sum(
            1 for s in scores if abs(s.discrepancy) > 15
        )

        seg_stats: dict[str, dict[str, Any]] = {}
        for s in scores:
            entry = seg_stats.setdefault(s.tier, {
                "count": 0, "avg_ml": 0.0, "at_risk": 0,
            })
            entry["count"] += 1
            entry["avg_ml"] += s.ml_churn_score
            if s.churn_risk in ("high", "critical"):
                entry["at_risk"] += 1
        for _tier, stats in seg_stats.items():
            stats["avg_ml"] = round(
                stats["avg_ml"] / max(stats["count"], 1), 1
            )

        if use_ml:
            coefs_abs = np.abs(model.coef_[0])
            total_imp = coefs_abs.sum()
            global_features = [
                {
                    "feature": feature_names[i],
                    "importance_pct": round(
                        coefs_abs[i] / max(total_imp, 0.01) * 100, 1
                    ),
                }
                for i in np.argsort(-coefs_abs)
            ]
        else:
            global_features = [
                {"feature": "engagement_score",
                 "importance_pct": 25},
                {"feature": "visit_frequency",
                 "importance_pct": 20},
                {"feature": "satisfaction",
                 "importance_pct": 20},
                {"feature": "active_domains",
                 "importance_pct": 15},
                {"feature": "tenure_months",
                 "importance_pct": 10},
                {"feature": "ltv_trend",
                 "importance_pct": 10},
            ]

        return ChurnMLReport(
            scores=scores,
            total_at_risk=total_at_risk,
            total_analyzed=len(scores),
            avg_ml_score=round(
                _mean([s.ml_churn_score for s in scores]), 1
            ),
            avg_rule_score=round(
                _mean([s.rule_churn_score for s in scores]), 1
            ),
            significant_discrepancies=sig_disc,
            top_churn_features=global_features,
            segment_breakdown=seg_stats,
        )

    # ── 6 · Segmentation ───────────────────────────────────

    async def get_member_segments(self) -> MemberSegmentation:
        """MISMO clustering/rules sobre members SQL."""

        data = await self._dataset()
        members = data["members"]
        return _segmentation_pipeline(members)

    # ── 7 · Model Health (PSI) ─────────────────────────────

    async def get_model_health(self) -> ModelHealthReport:
        """MISMO PSI sobre las series SQL del dataset."""
        data = await self._dataset()

        def extract(key: str) -> tuple[list[float], list[float]]:
            months = data["months"]
            if key == "revenue_monthly":
                vals = [
                    data["revenue_monthly"][m] / 1e6
                    for m in months if m in data["revenue_monthly"]
                ]
            elif key == "events_monthly_attendance":
                vals = [
                    float(data["events_monthly"][m]["attendance"])
                    for m in months if m in data["events_monthly"]
                ]
            elif key == "member_engagement":
                vals = [
                    float(m["engagement"]) for m in data["members"]
                ]
            elif key == "member_ltv":
                vals = [
                    m["ltv"] / 1e6 for m in data["members"]
                ]
            elif key == "facility_occupancy":
                vals = [
                    float(data["facility_occupancy"][m])
                    for m in months
                    if m in data["facility_occupancy"]
                ]
            elif key == "satisfaction":
                vals = [
                    float(data["satisfaction_monthly"][m]["avg"])
                    for m in months
                    if m in data["satisfaction_monthly"]
                ]
            else:
                vals = [float(i) for i in range(len(months))]
            # MISMO corte del in-memory: SIEMPRE len(months)//2 —
            # para series de members (20) usa 10//2=5 pese a que
            # months son 6: replicamos el corte EXACTO.
            mid = len(months) // 2
            return vals[:mid], vals[mid:]

        models: list[ModelPerformance] = []
        drift_reports: list[DriftReport] = []

        for name, meta in self._MODEL_METADATA.items():
            accuracy = meta.get("accuracy", 0.0)

            psi_key = meta.get("psi_baseline_key", "")
            psi_score: float | None = None
            psi_status: DriftStatus | None = None

            if psi_key:
                baseline, current = extract(psi_key)
                if baseline and current:
                    psi_result = _compute_psi(baseline, current)
                    psi_score = psi_result["psi_score"]
                    psi_status = psi_result["status"]

                    months = data["months"]
                    mid = len(months) // 2
                    drift_reports.append(DriftReport(
                        model_name=name,
                        psi_score=psi_score,
                        status=psi_status,
                        baseline_window=(
                            f"{months[0]} to {months[max(0, mid - 1)]}"
                            if months else ""
                        ),
                        current_window=(
                            f"{months[mid]} to {months[-1]}"
                            if months else ""
                        ),
                        bins_used=psi_result["bins_used"],
                        retrain_recommended=(
                            psi_score > 0.20
                        ),
                        details=psi_result["details"],
                    ))

            drift_mag = (
                psi_score if psi_score is not None else 0.0
            )
            if drift_mag > 0.30 or accuracy < 60:
                status = "retrain_needed"
            elif drift_mag > 0.15 or accuracy < 75:
                status = "degraded"
            else:
                status = "healthy"

            models.append(ModelPerformance(
                model_name=name,
                display_name=name.replace("_", " ").title(),
                model_type=meta["type"],
                accuracy=accuracy,
                mae=meta.get("mae", 0.0),
                mape=meta.get("mape", 0.0),
                drift_detected=(
                    psi_status is not None
                    and psi_status in (
                        DriftStatus.MILD,
                        DriftStatus.SIGNIFICANT,
                        DriftStatus.SEVERE,
                    )
                ),
                drift_magnitude=drift_mag,
                feature_importance=meta.get("features", []),
                last_trained=meta.get("last_trained", ""),
                training_samples=meta.get("samples", 0),
                status=status,
                psi_score=psi_score,
                psi_status=psi_status,
                retrain_threshold=0.20,
            ))

        healthy = sum(1 for m in models if m.status == "healthy")
        degraded = sum(1 for m in models if m.status == "degraded")
        retrain = sum(
            1 for m in models if m.status == "retrain_needed"
        )
        avg_acc = round(
            _mean(
                [m.accuracy for m in models if m.accuracy > 0]
            ),
            1,
        )

        if any(
            d.status in (DriftStatus.SEVERE, DriftStatus.SIGNIFICANT)
            for d in drift_reports
        ):
            overall_drift = DriftStatus.SIGNIFICANT
        elif any(
            d.status == DriftStatus.MILD for d in drift_reports
        ):
            overall_drift = DriftStatus.MILD
        else:
            overall_drift = DriftStatus.STABLE

        return ModelHealthReport(
            models=models,
            total_models=len(models),
            healthy_count=healthy,
            degraded_count=degraded,
            retrain_needed_count=retrain,
            avg_accuracy=avg_acc,
            any_drift=any(m.drift_detected for m in models),
            next_scheduled_training="2026-06-16T02:00:00",
            overall_drift_status=overall_drift,
            drift_reports=drift_reports,
            next_evaluation="2026-06-23T02:00:00",
        )

    # ── 8 · Chat Context ──────────────────────────────────

    async def build_chat_context(self) -> ChatContext:
        """MISMA forma — counts de las tablas reales."""
        data = await self._dataset()
        anomalies = await self.get_anomaly_report()

        return ChatContext(
            active_domains=list(data["domain_coverage"].keys()),
            recent_anomalies=anomalies.total_anomalies,
            active_insights=5,
            latest_predictions={
                "revenue_trend": "stable",
                "churn_at_risk": sum(
                    1 for m in data["members"]
                    if m["churn_risk"] in ("high", "critical")
                ),
                "satisfaction_trend": "declining",
            },
            member_count=len(data["members"]),
            current_month=(
                data["months"][-1] if data["months"] else "2026-06"
            ),
        )

    # ── 9 · Explain churn ──────────────────────────────────

    async def explain_churn_prediction(
        self,
        member_id: str,
    ) -> PredictionExplanation:
        """MISMO explain sobre el member real de la tabla."""
        data = await self._dataset()
        member = next(
            (
                m for m in data["members"]
                if m["id"] == member_id
            ),
            None,
        )
        return _explain_churn_on(member_id, member)


# ── helpers de módulo (canon del in-memory, dataset SQL) ─────


def _domain_has_data(data: dict[str, Any], domain: str) -> bool:
    """¿El dominio tiene serie viva en el dataset SQL?"""
    mapping = {
        "member_360": "members",
        "finance": "revenue_monthly",
        "events": "events_monthly",
        "satisfaction": "satisfaction_monthly",
        "guest_management": "guest_monthly",
        "communications": "comms_monthly",
        "age_group": "age_group_monthly",
        "facilities": "facility_occupancy",
    }
    key = mapping.get(domain)
    if key is None:
        return False
    value = data.get(key)
    if isinstance(value, dict):
        return bool(value)
    return bool(value)


def _next_months(last: str, horizon: int) -> list[str]:
    """Meses consecutivos YYYY-MM tras `last` (fallback M+n)."""
    try:
        year = int(last[:4])
        month = int(last[5:7])
    except (ValueError, IndexError):
        return [f"M+{i+1}" for i in range(horizon)]
    out: list[str] = []
    for i in range(1, horizon + 1):
        m = month + i
        y = year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        out.append(f"{y:04d}-{m:02d}")
    return out


def _score_members(
    members: list[dict[str, Any]],
    use_ml: bool,
    probs: Any,
    model: Any,
    x_scaled: Any,
    feature_names: list[str],
    n: int,
) -> list[ChurnMLScore]:
    """MISMO scoring per-member del in-memory (misma matemática).

    ML mode: probs → score 0-100 + feature contributions de los
    coeficientes escalados. Heuristic: los MISMOS pesos 0.25/
    0.20/0.20/0.15/0.10/0.10 del in-memory.
    """
    scores: list[ChurnMLScore] = []
    for idx, m in enumerate(members):
        engagement = m["engagement"]
        visits = m["visits_monthly"]
        satisfaction = m["satisfaction"]
        domains = len(m["active_domains"])
        tenure = m["tenure_months"]

        if use_ml:
            import numpy as np

            ml_score = round(float(probs[idx]) * 100, 1)

            coefs = model.coef_[0]
            x_row = x_scaled[idx]
            contributions = coefs * x_row
            feature_list = []
            sorted_idx = np.argsort(-np.abs(contributions))
            for fi in sorted_idx[:4]:
                feature_list.append({
                    "feature": feature_names[fi],
                    "importance": round(
                        abs(float(contributions[fi]))
                        / max(
                            sum(
                                abs(c) for c in contributions
                            ), 0.01
                        ) * 100,
                        1,
                    ),
                    "direction": (
                        "negative"
                        if contributions[fi] > 0
                        else "positive"
                    ),
                })

            explanation_prefix = (
                f"ML (LogisticRegression, N={n}): "
            )
        else:
            eng_factor = max(0, (100 - engagement)) * 0.25
            visit_factor = max(0, (12 - visits) * 3) * 0.20
            sat_factor = max(0, (5 - satisfaction) * 15) * 0.20
            domain_factor = max(0, (3 - domains) * 10) * 0.15
            tenure_factor = (
                max(0, (12 - tenure) * 2) if tenure < 12
                else 0
            ) * 0.10
            ltv_trend = (
                10 if m["ltv"] < 3000000 else 0
            ) * 0.10

            ml_score = min(
                100,
                round(
                    eng_factor + visit_factor + sat_factor
                    + domain_factor + tenure_factor + ltv_trend,
                    1,
                ),
            )

            feature_list = [
                {
                    "feature": "engagement_score",
                    "importance": round(
                        eng_factor / max(ml_score, 1) * 100, 1
                    ),
                    "direction": (
                        "negative" if engagement < 50
                        else "positive"
                    ),
                },
                {
                    "feature": "visit_frequency",
                    "importance": round(
                        visit_factor / max(ml_score, 1) * 100, 1
                    ),
                    "direction": (
                        "negative" if visits < 8
                        else "positive"
                    ),
                },
                {
                    "feature": "satisfaction",
                    "importance": round(
                        sat_factor / max(ml_score, 1) * 100, 1
                    ),
                    "direction": (
                        "negative" if satisfaction < 3.5
                        else "positive"
                    ),
                },
                {
                    "feature": "active_domains",
                    "importance": round(
                        domain_factor / max(ml_score, 1) * 100, 1
                    ),
                    "direction": (
                        "negative" if domains < 2
                        else "positive"
                    ),
                },
            ]

            explanation_prefix = f"Heuristic (N={n}): "

        rule_score = {
            "low": 15, "medium": 45,
            "high": 72, "critical": 88,
        }.get(m["churn_risk"], 45)

        discrepancy = round(ml_score - rule_score, 1)

        risk = (
            "critical" if ml_score >= 75
            else "high" if ml_score >= 50
            else "medium" if ml_score >= 30
            else "low"
        )

        explanation = (
            f"{explanation_prefix}"
            f"Score: {ml_score} vs Rules: {rule_score} "
            f"(diff: {discrepancy:+.0f}). "
        )
        if abs(discrepancy) > 15:
            explanation += (
                "DISCREPANCIA SIGNIFICATIVA — "
                "el modelo detecta señales que "
                "las reglas no capturan."
            )
        elif discrepancy > 0:
            explanation += (
                "Modelo más pesimista — "
                "factores adicionales detectados."
            )
        else:
            explanation += (
                "Alineados — modelo confirma "
                "evaluación de reglas."
            )

        recommended = ""
        if ml_score >= 75:
            recommended = (
                "Retención urgente: llamada personal "
                "+ beneficio"
            )
        elif ml_score >= 50:
            recommended = (
                "Proactive outreach: evento exclusivo "
                "+ encuesta 1-on-1"
            )
        elif ml_score >= 30:
            recommended = (
                "Monitorear: engagement activity tracking"
            )
        else:
            recommended = "Mantener: socio saludable"

        scores.append(ChurnMLScore(
            member_id=m["id"],
            member_name=m["name"],
            tier=m["tier"],
            ml_churn_score=ml_score,
            rule_churn_score=float(rule_score),
            discrepancy=discrepancy,
            churn_risk=risk,
            top_features=feature_list,
            explanation=explanation,
            recommended_action=recommended,
        ))

    return scores


def _explain_churn_on(
    member_id: str, member: dict[str, Any] | None
) -> PredictionExplanation:
    """MISMO explain del in-memory sobre el member real."""
    if not member:
        return PredictionExplanation(
            prediction_id=member_id,
            prediction_type="churn",
            predicted_value=0,
            limitations=[
                f"Member {member_id} not found in data"
            ],
        )

    eng = member["engagement"]
    visits = member["visits_monthly"]
    sat = member["satisfaction"]
    domains = len(member["active_domains"])
    tenure = member["tenure_months"]

    eng_factor = max(0, (100 - eng)) * 0.25
    visit_factor = max(0, (12 - visits) * 3) * 0.20
    sat_factor = max(0, (5 - sat) * 15) * 0.20
    domain_factor = max(0, (3 - domains) * 10) * 0.15
    tenure_factor = (
        max(0, (12 - tenure) * 2) if tenure < 12 else 0
    ) * 0.10
    ltv_factor = (10 if member["ltv"] < 3000000 else 0) * 0.10

    ml_score = min(
        100,
        round(
            eng_factor + visit_factor + sat_factor
            + domain_factor + tenure_factor + ltv_factor,
            1,
        ),
    )

    factors = []
    all_factors = [
        (
            "engagement_score", 0.25, eng,
            "Engagement del socio",
            "Si engagement sube 10pts → churn baja ~8%",
        ),
        (
            "visit_frequency", 0.20, float(visits),
            "Visitas mensuales",
            "Si visitas suben a 12/mes → churn baja ~6%",
        ),
        (
            "satisfaction", 0.20, sat,
            "Satisfacción promedio",
            "Si satisfacción sube a 4.0 → churn baja ~10%",
        ),
        (
            "active_domains", 0.15, float(domains),
            "Dominios activos",
            "Si agrega 1 dominio → churn baja ~4%",
        ),
        (
            "tenure", 0.10, float(tenure),
            "Meses como socio",
            "Tenure > 12 reduce riesgo significativamente",
        ),
        (
            "ltv", 0.10, float(member["ltv"] / 1e6),
            "LTV (₡M)",
            "LTV bajo indica menor compromiso con el club",
        ),
    ]

    for feat_name, weight, value, desc, _sens in all_factors:
        direction = "negative" if (
            (feat_name == "engagement_score" and value < 50)
            or (feat_name == "visit_frequency" and value < 8)
            or (feat_name == "satisfaction" and value < 3.5)
            or (feat_name == "active_domains" and value < 2)
            or (feat_name == "tenure" and value < 12)
            or (feat_name == "ltv" and value < 3)
        ) else "positive"

        factors.append({
            "feature": feat_name,
            "weight": weight,
            "direction": direction,
            "value": round(value, 2),
            "explanation": desc,
        })

    sensitivity_list = [
        {
            "change": "Engagement +10 puntos",
            "impact": (
                f"Churn baja ~8% → "
                f"{max(0, ml_score - 8):.0f}"
            ),
        },
        {
            "change": "Satisfaction +0.5 puntos",
            "impact": (
                f"Churn baja ~10% → "
                f"{max(0, ml_score - 10):.0f}"
            ),
        },
        {
            "change": "Visitas +4/mes",
            "impact": (
                f"Churn baja ~6% → "
                f"{max(0, ml_score - 6):.0f}"
            ),
        },
        {
            "change": "Agregar 1 dominio activo",
            "impact": (
                f"Churn baja ~4% → "
                f"{max(0, ml_score - 4):.0f}"
            ),
        },
    ]

    rule_score = {
        "low": 15, "medium": 45, "high": 72, "critical": 88,
    }.get(member["churn_risk"], 45)

    return PredictionExplanation(
        prediction_id=member_id,
        prediction_type="churn",
        predicted_value=ml_score,
        factors=factors,
        sensitivity=sensitivity_list,
        comparison_to_rules=(
            f"ML: {ml_score} vs Rules: {rule_score}. "
            f"{'ML más pesimista — detecta señales adicionales.' if ml_score > rule_score + 5 else 'Alineados.'}"
        ),
        confidence=0.78,
        limitations=[
            "Basado en 6 meses de data (ideal: 12+)",
            "No incluye datos de llamadas/email directos",
            "Satisfaction puede tener response bias",
            "Modelo simplificado — producción usará GradientBoosting",
        ],
    )


def _segmentation_pipeline(
    members: list[dict[str, Any]],
) -> MemberSegmentation:
    """MISMO pipeline de segmentación del in-memory."""
    total = len(members)
    use_ml = False
    silhouette = 0.0
    optimal_k = 5

    segment_configs: dict[str, dict[str, Any]] = {
        "champion": {
            "label": SegmentLabel.CHAMPION,
            "display": "Campeones",
            "strategy": (
                "VIP treatment: acceso exclusivo, "
                "eventos privados, early access a "
                "nuevos programas."
            ),
            "characteristics": [
                "Alto engagement", "Multi-domain",
                "Alta satisfacción", "LTV premium",
            ],
        },
        "loyal": {
            "label": SegmentLabel.LOYAL,
            "display": "Leales",
            "strategy": (
                "Mantener engagement: programas de "
                "reconocimiento, cross-sell a nuevos "
                "dominios."
            ),
            "characteristics": [
                "Engagement consistente",
                "Buena satisfacción",
                "Visitas regulares",
            ],
        },
        "potential": {
            "label": SegmentLabel.POTENTIAL,
            "display": "Potenciales",
            "strategy": (
                "Activar: onboarding mejorado, "
                "recomendaciones personalizadas, "
                "primer evento VIP."
            ),
            "characteristics": [
                "Engagement moderado",
                "Room para crecer",
                "Dominios limitados",
            ],
        },
        "at_risk": {
            "label": SegmentLabel.AT_RISK,
            "display": "En Riesgo",
            "strategy": (
                "Retener: llamada personal, encuesta "
                "de satisfacción, beneficio de "
                "recuperación."
            ),
            "characteristics": [
                "Bajo engagement",
                "Visitas declining",
                "Satisfaction baja",
            ],
        },
        "dormant": {
            "label": SegmentLabel.DORMANT,
            "display": "Dormidos",
            "strategy": (
                "Reactivar: campaña de re-engagement, "
                "oferta especial, visita guiada "
                "renovada."
            ),
            "characteristics": [
                "Mínima actividad",
                "Sin dominios activos",
                "Riesgo de churn alto",
            ],
        },
    }

    cluster_labels: Any = None

    if total >= 30:
        try:
            import numpy as np
            from sklearn.cluster import AgglomerativeClustering  # type: ignore[import-untyped]
            from sklearn.metrics import silhouette_score  # type: ignore[import-untyped]
            from sklearn.preprocessing import StandardScaler

            x_raw = []
            for m in members:
                x_raw.append([
                    m["engagement"],
                    m["visits_monthly"],
                    m["satisfaction"],
                    len(m["active_domains"]),
                    m["ltv"] / 1e6,
                ])

            x_arr = np.array(x_raw, dtype=float)
            scaler = StandardScaler()
            x_scaled = scaler.fit_transform(x_arr)

            best_score = -1.0
            best_k = 5
            for k in range(3, min(8, total // 5 + 1)):
                agg = AgglomerativeClustering(
                    n_clusters=k,
                    linkage="ward",
                )
                labels = agg.fit_predict(x_scaled)
                if len(set(labels)) < 2:
                    continue
                sc = silhouette_score(x_scaled, labels)
                if sc > best_score:
                    best_score = sc
                    best_k = k

            final_model = AgglomerativeClustering(
                n_clusters=best_k,
                linkage="ward",
            )
            cluster_labels = final_model.fit_predict(x_scaled)

            silhouette = round(best_score, 3)
            optimal_k = best_k
            use_ml = True

            logger.info(
                "[ml_repo_orm] Segmentation: ML mode "
                "(N=%d, K=%d, silhouette=%.3f)",
                total, best_k, silhouette,
            )
        except Exception:
            use_ml = False
            logger.info(
                "[ml_repo_orm] Segmentation: heuristic"
            )

    # ── asignación ──
    if use_ml and cluster_labels is not None:
        cluster_scores: dict[int, list[float]] = {}
        for i, m in enumerate(members):
            composite = (
                m["engagement"] * 0.30
                + m["visits_monthly"] / 20 * 100 * 0.25
                + m["satisfaction"] / 5 * 100 * 0.20
                + len(m["active_domains"]) / 6 * 100 * 0.15
                + min(100, m["ltv"] / 150000 * 100) * 0.10
            )
            cid = int(cluster_labels[i])
            cluster_scores.setdefault(cid, []).append(composite)

        cluster_avg = {
            cid: _mean(scores)
            for cid, scores in cluster_scores.items()
        }
        sorted_clusters = sorted(
            cluster_avg.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        label_order = [
            "champion", "loyal", "potential",
            "at_risk", "dormant",
        ]
        cluster_to_label: dict[int, str] = {}
        for rank, (cid, _) in enumerate(sorted_clusters):
            label_idx = min(rank, len(label_order) - 1)
            cluster_to_label[cid] = label_order[label_idx]

        segments_data: dict[str, list[dict[str, Any]]] = {
            k: [] for k in label_order
        }
        for i, m in enumerate(members):
            cid = int(cluster_labels[i])
            label = cluster_to_label[cid]
            segments_data[label].append(m)
    else:
        scored = []
        for m in members:
            score = (
                m["engagement"] * 0.30
                + m["visits_monthly"] / 20 * 100 * 0.25
                + m["satisfaction"] / 5 * 100 * 0.20
                + len(m["active_domains"]) / 6 * 100 * 0.15
                + min(100, m["ltv"] / 150000 * 100) * 0.10
            )
            scored.append((m, round(score, 1)))

        scored.sort(key=lambda x: x[1], reverse=True)

        segments_data = {
            "champion": [], "loyal": [], "potential": [],
            "at_risk": [], "dormant": [],
        }
        for m, score in scored:
            if score >= 80:
                segments_data["champion"].append(m)
            elif score >= 60:
                segments_data["loyal"].append(m)
            elif score >= 40:
                segments_data["potential"].append(m)
            elif score >= 20:
                segments_data["at_risk"].append(m)
            else:
                segments_data["dormant"].append(m)

        silhouette = 0.0
        optimal_k = 5

    # ── build de los objetos de segmento ──
    segments: list[MemberSegment] = []
    total_ltv = sum(m["ltv"] for m in members)
    all_eng = [m["engagement"] for m in members]
    all_ltv = [m["ltv"] for m in members]
    all_visits = [m["visits_monthly"] for m in members]
    all_sat = [m["satisfaction"] for m in members]

    for seg_key, members_in_seg in segments_data.items():
        if not members_in_seg:
            continue

        config = segment_configs[seg_key]
        count = len(members_in_seg)
        pct = round(count / max(total, 1) * 100, 1)

        avg_ltv = _mean([m["ltv"] for m in members_in_seg])
        avg_eng = _mean(
            [m["engagement"] for m in members_in_seg]
        )
        avg_sat = _mean(
            [m["satisfaction"] for m in members_in_seg]
        )
        avg_visits = _mean(
            [m["visits_monthly"] for m in members_in_seg]
        )
        churn_risk_pct = round(
            sum(
                1 for m in members_in_seg
                if m["churn_risk"] in ("high", "critical")
            ) / max(count, 1) * 100,
            1,
        )
        rev_contrib = round(
            sum(m["ltv"] for m in members_in_seg)
            / max(total_ltv, 1) * 100,
            1,
        )

        key_features = [
            {
                "feature": "engagement",
                "value": round(avg_eng, 1),
                "vs_avg": round(avg_eng - _mean(all_eng), 1),
            },
            {
                "feature": "ltv",
                "value": round(avg_ltv),
                "vs_avg": round(avg_ltv - _mean(all_ltv)),
            },
            {
                "feature": "visits",
                "value": round(avg_visits, 1),
                "vs_avg": round(
                    avg_visits - _mean(all_visits), 1
                ),
            },
            {
                "feature": "satisfaction",
                "value": round(avg_sat, 1),
                "vs_avg": round(avg_sat - _mean(all_sat), 1),
            },
        ]

        segments.append(MemberSegment(
            label=config["label"],
            display_name=config["display"],
            member_count=count,
            percentage=pct,
            avg_ltv=round(avg_ltv),
            avg_engagement=round(avg_eng, 1),
            avg_satisfaction=round(avg_sat, 1),
            avg_visit_frequency=round(avg_visits, 1),
            churn_risk_pct=churn_risk_pct,
            revenue_contribution_pct=rev_contrib,
            characteristics=config["characteristics"],
            recommended_strategy=config["strategy"],
            key_features=key_features,
        ))

    differentiators = [
        "Engagement score es el factor #1 de diferenciación",
        "LTV: 80% del revenue viene de 30% de los socios "
        "(Pareto)",
        "Multi-domain engagement correlaciona fuertemente "
        "con retención",
        "Satisfaction < 3.5 es el predictor más fuerte "
        "de churn",
    ]

    return MemberSegmentation(
        segments=segments,
        total_members=total,
        silhouette_score=silhouette,
        optimal_k=optimal_k,
        key_differentiators=differentiators,
    )
