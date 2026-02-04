import psycopg2
import json

# Configuration
SOURCE_DB = {
    "host": "41.231.122.71",
    "port": "5432",
    "database": "chiffre",
    "user": "postgres",
    "password": "CSScss110595@123do"
}

DEST_DB = {
    "host": "16.16.141.239",
    "port": "5432",
    "database": "chiffre",
    "user": "postgres",
    "password": "CSScss110595@123do"
}

def get_connection(config):
    return psycopg2.connect(
        host=config["host"],
        port=config["port"],
        database=config["database"],
        user=config["user"],
        password=config["password"]
    )

def migrate():
    source_conn = None
    dest_conn = None
    
    try:
        # 1. Connect to Source
        print(f"Connecting to Source DB ({SOURCE_DB['host']})...")
        source_conn = get_connection(SOURCE_DB)
        source_cur = source_conn.cursor()
        
        # 2. Fetch Data
        print("Fetching 'article_families' from Source...")
        source_cur.execute("SELECT name, rows, suppliers FROM article_families")
        rows = source_cur.fetchall()
        print(f"Found {len(rows)} families to migrate.")
        
        # 3. Connect to Destination
        print(f"Connecting to Destination DB ({DEST_DB['host']})...")
        dest_conn = get_connection(DEST_DB)
        dest_cur = dest_conn.cursor()
        
        # 4. Ensure Table Exists (Basic Schema)
        print("Ensuring destination table exists...")
        dest_cur.execute("""
            CREATE TABLE IF NOT EXISTS article_families (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                rows JSONB,
                suppliers JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 5. Insert Data
        print("Inserting Data...")
        for row in rows:
            name, rows_data, suppliers_data = row
            
            # Ensure JSON serialization if they are dicts, though psycopg2 usually handles jsonb objects well if adapting
            # If they come back as python dicts/lists from fetchall, we pass them as is with json.dumps if needed, 
            # OR rely on psycopg2 Json adapter. 
            # To be safe and simple, let's just ensure we pass them correctly.
            # Usually psycopg2 returns dicts for jsonb columns.
            
            sql = """
                INSERT INTO article_families (name, rows, suppliers)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE 
                SET rows = EXCLUDED.rows, 
                    suppliers = EXCLUDED.suppliers,
                    updated_at = CURRENT_TIMESTAMP;
            """
            
            # Use json.dumps to ensure it's a valid JSON string for jsonb input if necessary,
            # but psycopg2 often handles Python objects for JSONB automatically if Json adapter is registered.
            # A safer generic way for scripts is explicitly dumping to string.
            val_rows = json.dumps(rows_data) if not isinstance(rows_data, str) else rows_data
            val_suppliers = json.dumps(suppliers_data) if not isinstance(suppliers_data, str) else suppliers_data
            
            dest_cur.execute(sql, (name, val_rows, val_suppliers))
            print(f" - Migrated: {name}")
            
        dest_conn.commit()
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"\nERROR: {e}")
    finally:
        if source_conn: source_conn.close()
        if dest_conn: dest_conn.close()

if __name__ == "__main__":
    migrate()
