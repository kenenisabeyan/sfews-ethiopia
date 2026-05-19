import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

print(f"Connecting to {DB_HOST} with SSL...")

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode="require"
    )
    conn.autocommit = True
    cursor = conn.cursor()

    print("Reading schema.sql...")
    with open("../database/schema.sql", "r") as f:
        schema_sql = f.read()

    print("Executing schema.sql...")
    cursor.execute(schema_sql)
    print("Database initialized successfully!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
