"""
Member 360 Repository — Data access layer.
Seed data for 12 members across 8 families.
Cross-domain aggregation methods.
"""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta
from typing import Any

from club_mcp.models.member_360 import (
    ActivityDomain,
    ChurnRiskLevel,
    EngagementProposal,
    EngagementProposalType,
    HealthFactor,
    JourneyMilestone,
    JourneyStage,
    LTVTier,
    Member360Preview,
    MemberHealthLevel,
    MemberIdentity,
    SocialClusterType,
    SocialConnection,
)


# ─── Seed Data ───────────────────────────────────────────────────────────────

TODAY = date.today()
NOW = datetime.now()


def _days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


def _dt_ago(n: int, hour: int = 10) -> datetime:
    return datetime.combine(TODAY - timedelta(days=n), datetime.min.time().replace(hour=hour))


MEMBER_SEED: list[dict[str, Any]] = [
    {"member_id": "m-001", "first_name": "Carlos", "last_name": "González", "email": "carlos@castillo.cr",
     "tier": "platino", "role": "primary", "family_id": "fam-001", "family_name": "González",
     "join_date": _days_ago(1825), "age": 52, "age_group": "adults"},
    {"member_id": "m-002", "first_name": "María", "last_name": "González", "email": "maria@castillo.cr",
     "tier": "platino", "role": "spouse", "family_id": "fam-001", "family_name": "González",
     "join_date": _days_ago(1825), "age": 49, "age_group": "adults"},
    {"member_id": "m-003", "first_name": "Roberto", "last_name": "Jiménez", "email": "roberto@castillo.cr",
     "tier": "oro", "role": "primary", "family_id": "fam-002", "family_name": "Jiménez",
     "join_date": _days_ago(730), "age": 45, "age_group": "adults"},
    {"member_id": "m-004", "first_name": "Ana", "last_name": "Vargas", "email": "ana@castillo.cr",
     "tier": "oro", "role": "spouse", "family_id": "fam-002", "family_name": "Jiménez",
     "join_date": _days_ago(730), "age": 42, "age_group": "adults"},
    {"member_id": "m-005", "first_name": "Diego", "last_name": "Ramírez", "email": "diego@castillo.cr",
     "tier": "plata", "role": "primary", "family_id": "fam-003", "family_name": "Ramírez",
     "join_date": _days_ago(365), "age": 38, "age_group": "adults"},
    {"member_id": "m-006", "first_name": "Sofía", "last_name": "Herrera", "email": "sofia@castillo.cr",
     "tier": "plata", "role": "primary", "family_id": "fam-004", "family_name": "Herrera",
     "join_date": _days_ago(540), "age": 55, "age_group": "adults"},
    {"member_id": "m-007", "first_name": "Fernando", "last_name": "Castro", "email": "fernando@castillo.cr",
     "tier": "bronce", "role": "primary", "family_id": "fam-005", "family_name": "Castro",
     "join_date": _days_ago(180), "age": 35, "age_group": "adults"},
    {"member_id": "m-008", "first_name": "Valentina", "last_name": "Solano", "email": "valentina@castillo.cr",
     "tier": "oro", "role": "primary", "family_id": "fam-006", "family_name": "Solano",
     "join_date": _days_ago(1095), "age": 48, "age_group": "adults"},
    {"member_id": "m-009", "first_name": "Andrés", "last_name": "Morales", "email": "andres@castillo.cr",
     "tier": "basic", "role": "primary", "family_id": "fam-007", "family_name": "Morales",
     "join_date": _days_ago(45), "age": 29, "age_group": "young_adults"},
    {"member_id": "m-010", "first_name": "Patricia", "last_name": "Vega", "email": "patricia@castillo.cr",
     "tier": "premium", "role": "primary", "family_id": "fam-008", "family_name": "Vega",
     "join_date": _days_ago(2190), "age": 61, "age_group": "adults"},
    {"member_id": "m-011", "first_name": "Luis", "last_name": "González", "email": "luis@castillo.cr",
     "tier": "platino", "role": "child", "family_id": "fam-001", "family_name": "González",
     "join_date": _days_ago(1825), "age": 22, "age_group": "young_adults"},
    {"member_id": "m-012", "first_name": "Elena", "last_name": "Brenes", "email": "elena@castillo.cr",
     "tier": "vip", "role": "primary", "family_id": "fam-009", "family_name": "Brenes",
     "join_date": _days_ago(3650), "age": 67, "age_group": "seniors"},
]

# Health factors per member
HEALTH_FACTORS_SEED: dict[str, list[dict]] = {
    "m-001": [
        {"name": "engagement", "score": 92, "weight": 0.30, "trend": "improving", "details": "Champion — asiste a 4+ eventos/mes"},
        {"name": "financial", "score": 88, "weight": 0.25, "trend": "stable", "details": "Pago al día, LTV creciente"},
        {"name": "social", "score": 85, "weight": 0.20, "trend": "stable", "details": "12 conexiones, 3 referrals"},
        {"name": "satisfaction", "score": 90, "weight": 0.15, "trend": "improving", "details": "NPS 9, sin quejas"},
        {"name": "activity", "score": 78, "weight": 0.10, "trend": "stable", "details": "Activo en 5 dominios"},
    ],
    "m-003": [
        {"name": "engagement", "score": 71, "weight": 0.30, "trend": "stable", "details": "Active — asiste regularmente"},
        {"name": "financial", "score": 82, "weight": 0.25, "trend": "improving", "details": "Buen historial de pagos"},
        {"name": "social", "score": 65, "weight": 0.20, "trend": "stable", "details": "6 conexiones"},
        {"name": "satisfaction", "score": 74, "weight": 0.15, "trend": "stable", "details": "NPS 7"},
        {"name": "activity", "score": 60, "weight": 0.10, "trend": "declining", "details": "Activo en 3 dominios, baja reciente"},
    ],
    "m-007": [
        {"name": "engagement", "score": 38, "weight": 0.30, "trend": "declining", "details": "At-risk — pocas asistencias recientes"},
        {"name": "financial", "score": 55, "weight": 0.25, "trend": "stable", "details": "Pago con 15 días de retraso"},
        {"name": "social", "score": 25, "weight": 0.20, "trend": "declining", "details": "Solo 1 conexión"},
        {"name": "satisfaction", "score": 45, "weight": 0.15, "trend": "declining", "details": "NPS 5, una queja reciente"},
        {"name": "activity", "score": 30, "weight": 0.10, "trend": "declining", "details": "Activo solo en 1 dominio"},
    ],
    "m-009": [
        {"name": "engagement", "score": 55, "weight": 0.30, "trend": "improving", "details": "En onboarding, primera participación"},
        {"name": "financial", "score": 90, "weight": 0.25, "trend": "stable", "details": "Pago adelantado"},
        {"name": "social", "score": 20, "weight": 0.20, "trend": "improving", "details": "0 conexiones — nuevo"},
        {"name": "satisfaction", "score": 72, "weight": 0.15, "trend": "stable", "details": "Encuesta pendiente"},
        {"name": "activity", "score": 40, "weight": 0.10, "trend": "improving", "details": "2 actividades en primer mes"},
    ],
    "m-012": [
        {"name": "engagement", "score": 95, "weight": 0.30, "trend": "stable", "details": "Champion — 6+ años de participación continua"},
        {"name": "financial", "score": 92, "weight": 0.25, "trend": "stable", "details": "LTV top 5 del club"},
        {"name": "social", "score": 88, "weight": 0.20, "trend": "improving", "details": "15 conexiones, embajadora"},
        {"name": "satisfaction", "score": 85, "weight": 0.15, "trend": "stable", "details": "NPS 9, testimonial voluntario"},
        {"name": "activity", "score": 90, "weight": 0.10, "trend": "stable", "details": "Activa en 6 dominios"},
    ],
}

# Default factors for members not explicitly seeded
_DEFAULT_FACTORS = [
    {"name": "engagement", "score": 60, "weight": 0.30, "trend": "stable"},
    {"name": "financial", "score": 70, "weight": 0.25, "trend": "stable"},
    {"name": "social", "score": 50, "weight": 0.20, "trend": "stable"},
    {"name": "satisfaction", "score": 65, "weight": 0.15, "trend": "stable"},
    {"name": "activity", "score": 55, "weight": 0.10, "trend": "stable"},
]


class Member360Repository:
    """Repository for Member 360 Intelligence data access."""

    def __init__(self, *, seed_demo_data: bool = False) -> None:
        self._members = [dict(member) for member in MEMBER_SEED] if seed_demo_data else []

    # ─── Identity ────────────────────────────────────────────────────────────

    def get_member_identity(self, member_id: str) -> MemberIdentity | None:
        """Get core identity for a member."""
        for m in self._members:
            if m["member_id"] == member_id:
                return MemberIdentity(
                    member_id=m["member_id"],
                    first_name=m["first_name"],
                    last_name=m["last_name"],
                    email=m.get("email"),
                    tier=m["tier"],
                    role=m["role"],
                    family_id=m["family_id"],
                    family_name=m["family_name"],
                    join_date=m["join_date"],
                    age=m.get("age"),
                    age_group=m.get("age_group"),
                )
        return None

    def search_members(
        self,
        query: str | None = None,
        tier: str | None = None,
        health_level: str | None = None,
        churn_risk: str | None = None,
        journey_stage: str | None = None,
        sort_by: str = "health_score_desc",
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """Search members with filters and 360 preview."""
        results = []
        for m in self._members:
            identity = self.get_member_identity(m["member_id"])
            if not identity:
                continue

            # Filter by query (name search)
            if query:
                full_name = f"{m['first_name']} {m['last_name']}".lower()
                if query.lower() not in full_name and query.lower() not in m.get("family_name", "").lower():
                    continue

            # Filter by tier
            if tier and m["tier"] != tier:
                continue

            # Compute preview data
            factors = self.get_health_factors(m["member_id"])
            composite = self._compute_composite(factors)
            level = self._health_level(composite)
            churn = self._churn_level(m["member_id"])
            engagement = self._engagement_score(factors)
            stage = self._journey_stage(m["member_id"])

            if health_level and level.value != health_level:
                continue
            if churn_risk and churn.value != churn_risk:
                continue
            if journey_stage and stage.value != journey_stage:
                continue

            last_activity = self._last_activity_date(m["member_id"])

            results.append(Member360Preview(
                member_id=m["member_id"],
                first_name=m["first_name"],
                last_name=m["last_name"],
                tier=m["tier"],
                role=m["role"],
                family_name=m["family_name"],
                health_score=round(composite, 1),
                health_level=level.value,
                churn_risk=churn.value,
                engagement_score=round(engagement, 1),
                journey_stage=stage.value,
                last_activity_date=last_activity,
            ))

        # Sort
        sort_map = {
            "health_score_desc": lambda x: -x.health_score,
            "health_score_asc": lambda x: x.health_score,
            "churn_risk_desc": lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x.churn_risk, 4),
            "ltv_desc": lambda x: 0,  # placeholder
            "name_asc": lambda x: x.last_name,
            "tier_desc": lambda x: {"vip": 0, "platino": 1, "oro": 2, "premium": 3, "plata": 4, "bronce": 5, "basic": 6}.get(x.tier, 7),
            "engagement_desc": lambda x: -x.engagement_score,
        }
        results.sort(key=sort_map.get(sort_by, sort_map["health_score_desc"]))

        total = len(results)
        start = (page - 1) * page_size
        paged = results[start : start + page_size]

        return {"members": paged, "total": total, "page": page, "page_size": page_size}

    # ─── Health Score ────────────────────────────────────────────────────────

    def get_health_factors(self, member_id: str) -> list[HealthFactor]:
        """Get 5 health factors for a member."""
        raw = HEALTH_FACTORS_SEED.get(member_id, _DEFAULT_FACTORS)
        return [HealthFactor(**f) for f in raw]

    def get_health_score(self, member_id: str) -> dict:
        """Compute composite health score with 5 factors."""
        factors = self.get_health_factors(member_id)
        composite = self._compute_composite(factors)
        level = self._health_level(composite)

        # Previous score simulation
        prev = composite - random.uniform(-5, 5)
        trend_val = "improving" if composite > prev else ("declining" if composite < prev - 2 else "stable")

        return {
            "member_id": member_id,
            "composite_score": round(composite, 1),
            "health_level": level.value,
            "factors": factors,
            "trend": trend_val,
            "trend_detail": f"{'+' if composite >= prev else ''}{round(composite - prev, 1)} pts vs mes anterior",
            "previous_score": round(prev, 1),
            "benchmark_percentile": round(random.uniform(40, 95), 1),
        }

    def _compute_composite(self, factors: list[HealthFactor]) -> float:
        return sum(f.score * f.weight for f in factors)

    def _health_level(self, score: float) -> MemberHealthLevel:
        if score >= 85:
            return MemberHealthLevel.EXCELLENT
        elif score >= 65:
            return MemberHealthLevel.HEALTHY
        elif score >= 45:
            return MemberHealthLevel.ATTENTION
        return MemberHealthLevel.CRITICAL

    # ─── Journey ─────────────────────────────────────────────────────────────

    def get_member_journey(self, member_id: str) -> dict:
        """Get lifecycle journey with milestones."""
        identity = self.get_member_identity(member_id)
        if not identity:
            return {"error": "Member not found"}

        stage = self._journey_stage(member_id)
        days_in = self._days_in_stage(member_id, stage)

        milestones = self._generate_milestones(identity)

        stage_history = self._generate_stage_history(identity, stage)

        return {
            "member_id": member_id,
            "current_stage": stage.value,
            "days_in_stage": days_in,
            "stage_history": stage_history,
            "milestones": milestones,
            "next_expected_transition": self._next_transition(stage),
            "next_transition_date": (TODAY + timedelta(days=random.randint(15, 90))).isoformat(),
            "journey_health": "stalled" if days_in > 180 else ("accelerating" if days_in < 30 else "healthy"),
        }

    def _journey_stage(self, member_id: str) -> JourneyStage:
        """Compute journey stage based on tenure and engagement."""
        identity = self.get_member_identity(member_id)
        if not identity:
            return JourneyStage.PROSPECT

        tenure = (TODAY - identity.join_date).days
        factors = self.get_health_factors(member_id)
        eng_score = next((f.score for f in factors if f.name == "engagement"), 50)

        if tenure < 90:
            return JourneyStage.ONBOARDING
        elif eng_score >= 80 and tenure > 365:
            return JourneyStage.PEAK
        elif eng_score >= 60:
            return JourneyStage.GROWING if tenure < 365 else JourneyStage.PLATEAU
        elif eng_score < 30 and tenure > 180:
            return JourneyStage.DORMANT if eng_score < 20 else JourneyStage.AT_RISK
        elif eng_score >= 50 and tenure > 730:
            return JourneyStage.REACTIVATED
        else:
            return JourneyStage.GROWING

    def _days_in_stage(self, member_id: str, stage: JourneyStage) -> int:
        """Estimate days in current stage."""
        identity = self.get_member_identity(member_id)
        if not identity:
            return 0
        tenure = (TODAY - identity.join_date).days
        # Heuristic: stage_duration ≈ tenure / 3
        return min(tenure, max(15, tenure // 3 + random.randint(-10, 10)))

    def _next_transition(self, stage: JourneyStage) -> str | None:
        transitions = {
            JourneyStage.ONBOARDING: "growing",
            JourneyStage.GROWING: "peak",
            JourneyStage.PEAK: "plateau",
            JourneyStage.PLATEAU: "at_risk",
            JourneyStage.AT_RISK: "dormant or reactivation",
            JourneyStage.DORMANT: "reactivated",
            JourneyStage.REACTIVATED: "growing",
            JourneyStage.PROSPECT: "onboarding",
        }
        return transitions.get(stage)

    def _generate_stage_history(self, identity: MemberIdentity, current: JourneyStage) -> list[dict]:
        stages = list(JourneyStage)
        current_idx = stages.index(current) if current in stages else 3
        history = []
        entry_date = identity.join_date
        for i in range(min(current_idx + 1, len(stages))):
            s = stages[i]
            duration = random.randint(30, 200)
            exit_date = entry_date + timedelta(days=duration)
            history.append({
                "stage": s.value,
                "entered_at": entry_date.isoformat(),
                "exited_at": exit_date.isoformat() if i < current_idx else None,
                "duration_days": duration if i < current_idx else (TODAY - entry_date).days,
            })
            entry_date = exit_date
        return history

    def _generate_milestones(self, identity: MemberIdentity) -> list[JourneyMilestone]:
        milestones = [
            JourneyMilestone(
                milestone_id=f"ms-{identity.member_id}-join",
                date=datetime.combine(identity.join_date, datetime.min.time()),
                milestone_type="join",
                title="Bienvenido al Castillo",
                description=f"Se unió como {identity.role} de la familia {identity.family_name}",
                celebrated=True,
            ),
        ]
        # Anniversary
        years = (TODAY - identity.join_date).days // 365
        if years >= 1:
            for y in range(1, min(years + 1, 4)):
                ann_date = identity.join_date.replace(year=identity.join_date.year + y)
                milestones.append(JourneyMilestone(
                    milestone_id=f"ms-{identity.member_id}-ann-{y}",
                    date=datetime.combine(ann_date, datetime.min.time()),
                    milestone_type="anniversary",
                    title=f"Aniversario #{y}",
                    description=f"{y} año{'s' if y > 1 else ''} como miembro",
                    celebrated=ann_date <= TODAY,
                ))

        # Activity milestone
        milestones.append(JourneyMilestone(
            milestone_id=f"ms-{identity.member_id}-act-50",
            date=_dt_ago(random.randint(30, 180)),
            milestone_type="achievement",
            title="50 actividades completadas",
            domain="multiple",
            celebrated=True,
        ))

        # Upcoming
        milestones.append(JourneyMilestone(
            milestone_id=f"ms-{identity.member_id}-next",
            date=datetime.combine(TODAY + timedelta(days=random.randint(5, 45)), datetime.min.time()),
            milestone_type="celebration",
            title="Evento especial sugerido",
            description="Basado en sus intereses y actividades recientes",
            celebrated=False,
        ))

        return sorted(milestones, key=lambda m: m.date)

    # ─── Churn ───────────────────────────────────────────────────────────────

    def _churn_level(self, member_id: str) -> ChurnRiskLevel:
        factors = self.get_health_factors(member_id)
        composite = self._compute_composite(factors)
        if composite >= 70:
            return ChurnRiskLevel.LOW
        elif composite >= 50:
            return ChurnRiskLevel.MEDIUM
        elif composite >= 30:
            return ChurnRiskLevel.HIGH
        return ChurnRiskLevel.CRITICAL

    def get_churn_prediction(self, member_id: str) -> dict:
        """Predict churn risk with factors."""
        factors = self.get_health_factors(member_id)
        composite = self._compute_composite(factors)
        risk_level = self._churn_level(member_id)

        risk_factors = []
        protective = []
        for f in factors:
            if f.score < 40:
                risk_factors.append({
                    "source": f.name,
                    "factor": f"{f.name}_low",
                    "weight": f.weight,
                    "detail": f.details or f"{f.name} score {f.score}",
                    "severity": "high" if f.score < 25 else "medium",
                })
            elif f.score > 70:
                protective.append({
                    "source": f.name,
                    "factor": f"{f.name}_strong",
                    "weight": f.weight,
                    "detail": f.details or f"{f.name} score {f.score}",
                })

        actions = []
        if risk_level in (ChurnRiskLevel.HIGH, ChurnRiskLevel.CRITICAL):
            actions = [
                "Contactar personalmente en las próximas 48 horas",
                "Ofrecer experiencia personalizada sin costo",
                "Agendar reunión con Director de Experiencia",
            ]
        elif risk_level == ChurnRiskLevel.MEDIUM:
            actions = [
                "Enviar comunicación personalizada",
                "Incluir en campaña de reactivación",
            ]

        return {
            "member_id": member_id,
            "churn_risk": risk_level.value,
            "churn_score": round(100 - composite, 1),
            "confidence": round(random.uniform(70, 95), 1),
            "risk_factors": risk_factors,
            "protective_factors": protective,
            "time_horizon_days": 90,
            "recommended_actions": actions,
            "similar_churned_count": random.randint(2, 8),
        }

    # ─── LTV ─────────────────────────────────────────────────────────────────

    def get_ltv_analysis(self, member_id: str) -> dict:
        """LTV projection and spend analysis."""
        identity = self.get_member_identity(member_id)
        if not identity:
            return {"error": "Member not found"}

        tenure_months = max(1, (TODAY - identity.join_date).days // 30)
        tier_multiplier = {"vip": 3.0, "platino": 2.5, "oro": 2.0, "premium": 1.8, "plata": 1.3, "bronce": 1.0, "basic": 0.7}.get(identity.tier, 1.0)

        monthly_spend = round(random.uniform(150, 800) * tier_multiplier, 2)
        current_ltv = round(monthly_spend * tenure_months, 2)

        spend_breakdown = [
            {"domain": "events", "amount": round(monthly_spend * 0.30, 2), "percentage": 30},
            {"domain": "sports", "amount": round(monthly_spend * 0.25, 2), "percentage": 25},
            {"domain": "wellness", "amount": round(monthly_spend * 0.15, 2), "percentage": 15},
            {"domain": "cultural", "amount": round(monthly_spend * 0.10, 2), "percentage": 10},
            {"domain": "dining", "amount": round(monthly_spend * 0.12, 2), "percentage": 12},
            {"domain": "guests", "amount": round(monthly_spend * 0.08, 2), "percentage": 8},
        ]

        tier_avg = round(current_ltv * random.uniform(0.7, 1.3), 2)
        projection_12m = round(current_ltv + monthly_spend * 12 * random.uniform(0.9, 1.1), 2)

        factors = self.get_health_factors(member_id)
        eng = next((f.score for f in factors if f.name == "engagement"), 50)
        ltv_trend = "improving" if eng > 70 else ("declining" if eng < 40 else "stable")
        ltv_tier_val = LTVTier.HIGH_VALUE if current_ltv > tier_avg * 1.2 else (
            LTVTier.NEGATIVE_TREND if ltv_trend == "declining" else (
                LTVTier.LOW_VALUE if current_ltv < tier_avg * 0.7 else LTVTier.STANDARD
            )
        )

        return {
            "member_id": member_id,
            "current_ltv": current_ltv,
            "monthly_avg_spend": monthly_spend,
            "ltv_trend": ltv_trend,
            "ltv_tier": ltv_tier_val.value,
            "spend_breakdown": spend_breakdown,
            "projection_12m": projection_12m,
            "projection_confidence": round(random.uniform(65, 90), 1),
            "benchmark_vs_tier": round((current_ltv / max(tier_avg, 1) - 1) * 100, 1),
            "peak_month": random.choice(["Diciembre", "Julio", "Marzo"]),
            "low_month": random.choice(["Febrero", "Septiembre", "Agosto"]),
        }

    # ─── Activity Summary ────────────────────────────────────────────────────

    def get_activity_summary(self, member_id: str, period_days: int = 90) -> dict:
        """Cross-domain activity breakdown."""
        factors = self.get_health_factors(member_id)
        eng = next((f.score for f in factors if f.name == "engagement"), 50)

        total = max(1, int(eng / 5) + random.randint(0, 5))
        domains = list(ActivityDomain)
        num_active = min(len(domains), max(1, int(eng / 20)))

        active_domains = random.sample(domains, num_active)
        by_domain = []
        remaining = 100
        for i, d in enumerate(active_domains):
            pct = random.randint(5, remaining - (len(active_domains) - i - 1) * 5) if i < len(active_domains) - 1 else remaining
            remaining -= pct
            count = max(1, int(total * pct / 100))
            by_domain.append({
                "domain": d.value,
                "count": count,
                "percentage": pct,
                "trend": random.choice(["improving", "stable", "declining"]),
                "last_activity": _dt_ago(random.randint(1, 30)).isoformat(),
            })

        # Heatmap
        heatmap = []
        for day in range(7):
            for hour in [7, 9, 11, 14, 16, 18, 20]:
                heatmap.append({
                    "weekday": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][day],
                    "hour": hour,
                    "count": random.randint(0, 5) if hour in [9, 11, 18] else random.randint(0, 2),
                })

        return {
            "member_id": member_id,
            "total_activities": total,
            "period_days": period_days,
            "by_domain": by_domain,
            "activity_heatmap": heatmap,
            "favorite_venues": [
                {"venue": "Piscina Principal", "visits": random.randint(5, 20)},
                {"venue": "Gimnasio", "visits": random.randint(3, 15)},
                {"venue": "Salón de Eventos", "visits": random.randint(1, 8)},
            ],
            "activity_streak_current": random.randint(0, 14),
            "activity_streak_longest": random.randint(14, 45),
        }

    # ─── Social Profile ──────────────────────────────────────────────────────

    def get_social_profile(self, member_id: str) -> dict:
        """Social connections, clusters, referrals."""
        other_ids = [
            member["member_id"]
            for member in self._members
            if member["member_id"] != member_id
        ]
        num_connections = random.randint(0, min(8, len(other_ids)))
        connected_ids = random.sample(other_ids, num_connections)

        connections = []
        for cid in connected_ids:
            other = next(
                (member for member in self._members if member["member_id"] == cid),
                None,
            )
            if other:
                connections.append(SocialConnection(
                    connected_member_id=cid,
                    connected_name=f"{other['first_name']} {other['last_name']}",
                    connection_type=random.choice(["friend", "co_activity", "family"]),
                    strength=round(random.uniform(0.3, 1.0), 2),
                    shared_activities=random.randint(1, 15),
                    last_interaction=_dt_ago(random.randint(1, 60)),
                ))

        clusters = random.sample(
            [c.value for c in SocialClusterType],
            k=random.randint(0, 2),
        )

        return {
            "member_id": member_id,
            "connections_count": len(connections),
            "connections": connections,
            "cluster_membership": clusters,
            "cluster_details": [
                {"cluster": c, "members_count": random.randint(5, 20), "cohesion": round(random.uniform(0.4, 0.9), 2), "match_score": round(random.uniform(0.5, 0.95), 2)}
                for c in clusters
            ],
            "referrals_made": random.randint(0, 3),
            "referrals_converted": random.randint(0, 2),
            "social_influence_score": round(random.uniform(20, 95), 1),
            "recommended_connections": [
                {"member_id": cid, "name": c.connected_name, "reason": "Comparten actividades deportivas", "shared_interests": ["tennis", "wellness"]}
                for cid, c in zip(
                    connected_ids[:2], connections[:2], strict=True
                )
            ],
        }

    # ─── Risk Assessment ─────────────────────────────────────────────────────

    def get_risk_assessment(self, member_id: str) -> dict:
        """Cross-domain risk factors."""
        factors = self.get_health_factors(member_id)
        composite = self._compute_composite(factors)

        risk_factors = []
        protective = []
        for f in factors:
            if f.score < 45:
                risk_factors.append({
                    "source": f.name,
                    "factor": f"low_{f.name}_score",
                    "severity": "critical" if f.score < 25 else "high" if f.score < 35 else "medium",
                    "weight": f.weight,
                    "detail": f.details or f"{f.name}: {f.score}/100",
                    "mitigation": f"Implementar plan de mejora de {f.name}",
                })
            elif f.score > 70:
                protective.append({
                    "source": f.name,
                    "factor": f"strong_{f.name}",
                    "detail": f.details or f"{f.name}: {f.score}/100",
                })

        overall = "critical" if composite < 40 else "high" if composite < 55 else "medium" if composite < 70 else "low"

        return {
            "member_id": member_id,
            "overall_risk": overall,
            "risk_score": round(100 - composite, 1),
            "risk_factors": risk_factors,
            "protective_factors": protective,
            "risk_trend": random.choice(["improving", "stable", "declining"]),
            "similar_at_risk_count": random.randint(3, 12),
        }

    # ─── Engagement Proposals (Motor) ────────────────────────────────────────

    def generate_engagement_proposals(self, member_id: str) -> dict:
        """Engagement Motor — personalized cross-domain proposals."""
        identity = self.get_member_identity(member_id)
        if not identity:
            return {"error": "Member not found"}

        factors = self.get_health_factors(member_id)
        eng = next((f.score for f in factors if f.name == "engagement"), 50)
        social = next((f.score for f in factors if f.name == "social"), 50)

        proposals = []

        # Always suggest based on engagement level
        if eng < 50:
            proposals.append(EngagementProposal(
                proposal_id=f"prop-{member_id}-retention",
                proposal_type=EngagementProposalType.RETENTION_CAMPAIGN.value,
                title="Campaña de Retención Personalizada",
                description=f"{identity.first_name} tiene engagement bajo ({eng}/100). Proponer experiencia personalizada para reconectar.",
                domain=ActivityDomain.EVENTS.value,
                priority="high",
                estimated_impact="high",
                confidence=82,
                suggested_action="Agendar llamada personal + invitación a evento exclusivo",
            ))

        if social < 40:
            proposals.append(EngagementProposal(
                proposal_id=f"prop-{member_id}-social",
                proposal_type=EngagementProposalType.SOCIAL_CONNECTION.value,
                title="Expandir Red Social en el Club",
                description=f"Solo {int(social)}/100 en score social. Conectar con familias compatibles.",
                domain=ActivityDomain.SOCIAL.value,
                priority="medium",
                estimated_impact="medium",
                confidence=75,
                suggested_action="Incluir en próximo evento de integración social",
            ))

        # Cross-domain suggestions
        active_domains_raw = random.sample(list(ActivityDomain), k=min(3, max(1, int(eng / 30))))
        inactive = [d for d in ActivityDomain if d not in active_domains_raw]
        if inactive:
            target = random.choice(inactive)
            proposals.append(EngagementProposal(
                proposal_id=f"prop-{member_id}-cross-{target.value}",
                proposal_type=EngagementProposalType.CROSS_DOMAIN.value,
                title=f"Descubrir {target.value.replace('_', ' ').title()}",
                description=f"{identity.first_name} nunca ha participado en {target.value.replace('_', ' ')}. Invitar a actividad de prueba.",
                domain=target.value,
                priority="medium",
                estimated_impact="medium",
                confidence=68,
                suggested_action=f"Enviar invitación a actividad de {target.value.replace('_', ' ')}",
            ))

        # Tier upgrade
        if identity.tier in ("basic", "bronce", "plata") and eng > 70:
            proposals.append(EngagementProposal(
                proposal_id=f"prop-{member_id}-tier",
                proposal_type=EngagementProposalType.TIER_UPGRADE.value,
                title=f"Candidato a Upgrade de {identity.tier.title()}",
                description=f"Engagement de {eng}/100 sostenido. Considerar upgrade de tier.",
                domain=ActivityDomain.EVENTS.value,
                priority="medium",
                estimated_impact="high",
                confidence=70,
                suggested_action="Revisificar elegibilidad de tier con Director de Membresía",
            ))

        # Milestone celebration
        tenure_days = (TODAY - identity.join_date).days
        next_anniversary = identity.join_date.replace(year=TODAY.year + 1)
        days_to_ann = (next_anniversary - TODAY).days
        if 0 < days_to_ann <= 30:
            proposals.append(EngagementProposal(
                proposal_id=f"prop-{member_id}-anniversary",
                proposal_type=EngagementProposalType.MILESTONE_CELEBRATION.value,
                title=f"Aniversario en {days_to_ann} días",
                description=f"Celebrar {tenure_days // 365 + 1} años de membresía con experiencia especial.",
                domain=ActivityDomain.SOCIAL.value,
                priority="high",
                estimated_impact="high",
                confidence=90,
                suggested_action="Coordinar sorpresa con Director de Experiencia",
            ))

        # Wellness gap
        activity_domains = [d["domain"] for d in self.get_activity_summary(member_id).get("by_domain", [])]
        if "wellness" not in activity_domains and eng > 40:
            proposals.append(EngagementProposal(
                proposal_id=f"prop-{member_id}-wellness",
                proposal_type=EngagementProposalType.WELLNESS_PROGRAM.value,
                title="Programa de Bienestar Personalizado",
                description="Sin actividad de wellness registrada. Ofrecer sesión de bienvenida al spa.",
                domain=ActivityDomain.WELLNESS.value,
                priority="medium",
                estimated_impact="medium",
                confidence=72,
                suggested_action="Enviar cupón de cortesía para primer servicio de wellness",
            ))

        return {
            "member_id": member_id,
            "proposals": proposals,
            "total_proposals": len(proposals),
            "cross_domain_signals": [
                {"signal": "engagement_trend", "value": eng, "status": "attention" if eng < 50 else "ok"},
                {"signal": "social_density", "value": social, "status": "attention" if social < 40 else "ok"},
                {"signal": "active_domains_count", "value": len(active_domains_raw), "status": "attention" if len(active_domains_raw) < 3 else "ok"},
            ],
        }

    def _engagement_score(self, factors: list[HealthFactor]) -> float:
        return next((f.score for f in factors if f.name == "engagement"), 50)

    def _last_activity_date(self, member_id: str) -> datetime | None:
        factors = self.get_health_factors(member_id)
        eng = next((f.score for f in factors if f.name == "engagement"), 50)
        days_back = max(1, int((100 - eng) / 5) + random.randint(0, 7))
        return _dt_ago(days_back)
