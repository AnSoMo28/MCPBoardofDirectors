import asyncio
import getpass
import os

import asyncpg


def _db_password() -> str:
    """Q-SEC-03 (Ola 1.1): la credencial NUNCA vive en el código.

    Orden: CLUB_DB_PASSWORD (env/CI) → getpass interactivo. El literal
    password="" era un residuo de diagnóstico pegado al repo — sondeo de
    tablas, no creación de admin (renombrado en este commit a
    scripts/db_probe.py para que el nombre no mienta).
    """
    pw = os.environ.get("CLUB_DB_PASSWORD")
    if pw:
        return pw
    return getpass.getpass("PostgreSQL password (postgres@club_db): ")


async def main():
    conn = await asyncpg.connect(
        host=os.environ.get("CLUB_DB_HOST", "localhost"),
        port=int(os.environ.get("CLUB_DB_PORT", "5432")),
        user=os.environ.get("CLUB_DB_USER", "postgres"),
        password=_db_password(),
        database=os.environ.get("CLUB_DB_NAME", "club_db"),
    )

    print("=== CONEXION EXITOSA ===")


    # 1. Ver qué tablas existen
    tables = await conn.fetch(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    )
    print("=== TABLAS ===")
    for t in tables:
        print(t["table_name"])

    # 2. Buscar tabla de usuarios
    user_table = None
    for t in tables:
        name = t["table_name"].lower()
        if name in ("users", "user", "members", "member", "accounts"):
            user_table = t["table_name"]
            break

    if not user_table:
        print("\nNo se encontró tabla de usuarios. Pegame la lista de tablas.")
        await conn.close()
        return

    # 3. Ver columnas de esa tabla
    cols = await conn.fetch(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        user_table,
    )
    print(f"\n=== COLUMNAS de {user_table} ===")
    for c in cols:
        print(f"  {c['column_name']} ({c['data_type']})")

    # 4. Ver si ya hay usuarios
    count = await conn.fetchval(f"SELECT COUNT(*) FROM {user_table}")
    print(f"\nUsuarios existentes: {count}")

    await conn.close()

asyncio.run(main())
