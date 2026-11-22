"""db.orm — persistencia real (Ola 2.1): ORM + alembic.

Paquete HERMANO de db.repositories (2 repos in-memory
restantes — Q-PER-01; 17 verticales de repo ya migradas: auth +
family + engagement + event + compliance + guest + satisfaction +
communication + cultural_social + executive_dashboard +
proactive_recommendation + facility_management + age_group +
sports_recreation + finance + wellness + member_360 · + Ola 2.3:
ApprovalEngine con estado durable):

    base.py      Declarative Base + naming convention determinista
    engine.py    engine async LAZY (primer consumidor de DATABASE_URL)
    session.py   session_factory + session_scope transaccional
                 (+ spans OTel opt-in — R-1/ADR-0007)
    users_orm.py tabla users (espejo 1:1 de auth.models.User)
    approvals_orm.py  tablas approvals + approval_events (ledger
                 hash-chain tamper-evident — Ola 2.3/ADR-0007)
    repositories/user_repo.py  UserRepository async
    repositories/approval_repo.py  ApprovalStore async (estado del
                 ApprovalEngine + ledger — Ola 2.3)

Los repos in-memory siguen siendo la fuente de TODO lo demás;
este paquete es la nueva columna vertebral persistente que los
reemplaza de a uno (auth primero, PATH 2.1; el ApprovalEngine es
el primer COMPONENTE no-repo que delega estado acá — Ola 2.3).
"""
