import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="",
        database="club_db",
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
