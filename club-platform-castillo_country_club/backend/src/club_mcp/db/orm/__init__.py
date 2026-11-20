"""db.orm — persistencia real (Ola 2.1): ORM + alembic.

Paquete HERMANO de db.repositories (11 repos in-memory
restantes — Q-PER-01; 8 verticales ya migradas: auth + family +
engagement + event + compliance + guest + satisfaction +
communication):

    base.py      Declarative Base + naming convention determinista
    engine.py    engine async LAZY (primer consumidor de DATABASE_URL)
    session.py   session_factory + session_scope transaccional
    users_orm.py tabla users (espejo 1:1 de auth.models.User)
    repositories/user_repo.py  UserRepository async

Los repos in-memory siguen siendo la fuente de TODO lo demás;
este paquete es la nueva columna vertebral persistente que los
reemplaza de a uno (auth primero, PATH 2.1).
"""
