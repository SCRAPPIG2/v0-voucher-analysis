#!/usr/bin/env python3
"""
Script para ejecutar migraciones SQL en Neon PostgreSQL
"""

import os
import sys
from pathlib import Path

# Leer DATABASE_URL del ambiente
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL no esta definida")
    sys.exit(1)

try:
    import psycopg
except ImportError:
    print("Instalando psycopg...")
    os.system("pip install psycopg[binary]")
    import psycopg

# Conectar a la base de datos
print(f"Conectando a Neon...")
try:
    conn = psycopg.connect(database_url)
    cursor = conn.cursor()
    print("✓ Conexion establecida")
except Exception as e:
    print(f"✗ Error al conectar: {e}")
    sys.exit(1)

# Leer y ejecutar el script SQL
sql_file = Path(__file__).parent / "init-db.sql"
try:
    with open(sql_file, "r") as f:
        sql_content = f.read()
    
    # Ejecutar el SQL
    cursor.execute(sql_content)
    conn.commit()
    print(f"✓ Migracion ejecutada desde {sql_file}")
    
except Exception as e:
    conn.rollback()
    print(f"✗ Error en la migracion: {e}")
    sys.exit(1)
finally:
    cursor.close()
    conn.close()

print("✓ Base de datos lista para usar")
