#!/usr/bin/env python3
"""
Turso Database Migration Script
--------------------------------
This script migrates your local database.sql to Turso.

Usage:
    1. Set environment variables:
       - TURSO_DATABASE_URL: Your Turso database URL (libsql://...)
       - TURSO_AUTH_TOKEN: Your Turso auth token
    
    2. Run: python scripts/seed_turso.py

The script will:
    - Read database.sql from the project root
    - Parse and execute each SQL statement against Turso
    - Handle SQLite/Turso compatible syntax
"""

import os
import sys
import re
import asyncio

try:
    import libsql_client
except ImportError:
    print("❌ libsql-client not installed. Run: pip install libsql-client")
    sys.exit(1)


async def get_turso_client():
    """Create a client connection to Turso database."""
    url = os.environ.get('TURSO_DATABASE_URL')
    auth_token = os.environ.get('TURSO_AUTH_TOKEN')
    
    if not url:
        print("❌ TURSO_DATABASE_URL environment variable not set")
        print("   Example: libsql://your-db-name.turso.io")
        sys.exit(1)
    
    if not auth_token:
        print("❌ TURSO_AUTH_TOKEN environment variable not set")
        sys.exit(1)
    
    # Convert libsql:// to https:// for HTTP client
    http_url = url.replace("libsql://", "https://")
    
    print(f"📡 Connecting to: {http_url}")
    
    try:
        client = libsql_client.create_client(
            url=http_url,
            auth_token=auth_token
        )
        print("✅ Connected to Turso successfully!")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to Turso: {e}")
        sys.exit(1)


def read_sql_file(filepath):
    """Read and parse SQL file into individual statements."""
    if not os.path.exists(filepath):
        print(f"❌ SQL file not found: {filepath}")
        sys.exit(1)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'--.*$', '', content, flags=re.MULTILINE)
    
    # Split by semicolons, but keep the structure
    statements = []
    current_statement = []
    
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        current_statement.append(line)
        
        if line.endswith(';'):
            statement = ' '.join(current_statement)
            # Clean up the statement
            statement = re.sub(r'\s+', ' ', statement).strip()
            if statement and statement != ';':
                # Remove trailing semicolon for libsql-client
                statement = statement.rstrip(';').strip()
                if statement:
                    statements.append(statement)
            current_statement = []
    
    # Handle any remaining statement without semicolon
    if current_statement:
        statement = ' '.join(current_statement)
        statement = re.sub(r'\s+', ' ', statement).strip()
        if statement:
            statements.append(statement)
    
    return statements


def convert_postgres_to_sqlite(statement):
    """Convert PostgreSQL-style SQL to SQLite/Turso compatible syntax."""
    # Replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT
    statement = re.sub(
        r'(\w+)\s+SERIAL\s+PRIMARY\s+KEY',
        r'\1 INTEGER PRIMARY KEY AUTOINCREMENT',
        statement,
        flags=re.IGNORECASE
    )
    
    # Replace VARCHAR(n) with TEXT (SQLite doesn't enforce length)
    statement = re.sub(r'VARCHAR\(\d+\)', 'TEXT', statement, flags=re.IGNORECASE)
    
    # Replace TIMESTAMP with TEXT (SQLite stores as ISO8601 strings)
    statement = re.sub(r'\bTIMESTAMP\b', 'TEXT', statement, flags=re.IGNORECASE)
    
    # Replace BOOLEAN with INTEGER (SQLite uses 0/1)
    statement = re.sub(r'\bBOOLEAN\b', 'INTEGER', statement, flags=re.IGNORECASE)
    
    # Replace DEFAULT CURRENT_TIMESTAMP with DEFAULT (datetime('now'))
    statement = re.sub(
        r"DEFAULT\s+CURRENT_TIMESTAMP",
        "DEFAULT (datetime('now'))",
        statement,
        flags=re.IGNORECASE
    )
    
    # Replace REFERENCES with a comment (Turso/SQLite handles FK differently)
    # Keep the column definition, just remove REFERENCES clause
    statement = re.sub(
        r'REFERENCES\s+\w+\s*\(\s*\w+\s*\)',
        '',
        statement,
        flags=re.IGNORECASE
    )
    
    # Handle ON CONFLICT for INSERT statements
    statement = re.sub(
        r'ON\s+CONFLICT\s*\(\s*\w+\s*\)\s+DO\s+NOTHING',
        'ON CONFLICT DO NOTHING',
        statement,
        flags=re.IGNORECASE
    )
    
    return statement


async def execute_statements(client, statements):
    """Execute SQL statements against Turso."""
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        # Convert PostgreSQL syntax to SQLite
        converted = convert_postgres_to_sqlite(statement)
        
        # Skip empty statements
        if not converted.strip():
            continue
        
        try:
            print(f"\n📝 [{i}/{len(statements)}] Executing:")
            print(f"   {converted[:100]}{'...' if len(converted) > 100 else ''}")
            
            await client.execute(converted)
            
            print(f"   ✅ Success")
            success_count += 1
            
        except Exception as e:
            error_msg = str(e)
            
            # Handle common non-fatal errors
            if 'already exists' in error_msg.lower():
                print(f"   ⚠️  Table/index already exists (skipping)")
                success_count += 1
            elif 'unique constraint' in error_msg.lower():
                print(f"   ⚠️  Data already exists (skipping)")
                success_count += 1
            elif 'UNIQUE constraint failed' in error_msg:
                print(f"   ⚠️  Data already exists (skipping)")
                success_count += 1
            else:
                print(f"   ❌ Error: {error_msg}")
                error_count += 1
    
    return success_count, error_count


async def create_additional_tables(client):
    """Create additional tables that might not be in database.sql."""
    
    additional_tables = [
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'DH',
            purpose TEXT NOT NULL,
            method TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            metadata_json TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS strategies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            description TEXT,
            config_json TEXT,
            screenshot_url TEXT,
            win_rate REAL DEFAULT 0.0,
            votes_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS community_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT,
            user_id INTEGER NOT NULL,
            content TEXT,
            media_type TEXT DEFAULT 'TEXT',
            media_url TEXT,
            strategy_id INTEGER,
            likes_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS community_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT,
            media_url TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS direct_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT,
            media_type TEXT DEFAULT 'TEXT',
            media_url TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            thumbnail_url TEXT,
            difficulty TEXT DEFAULT 'beginner',
            duration_minutes INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            video_url TEXT,
            order_index INTEGER DEFAULT 0,
            duration_minutes INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            lesson_id INTEGER NOT NULL,
            completed INTEGER DEFAULT 0,
            completed_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ]
    
    print("\n📦 Creating additional tables from models.py...")
    
    for table_sql in additional_tables:
        try:
            # Clean up the SQL
            clean_sql = ' '.join(table_sql.split())
            await client.execute(clean_sql)
            # Extract table name for logging
            match = re.search(r'CREATE TABLE IF NOT EXISTS (\w+)', table_sql)
            if match:
                print(f"   ✅ Created/verified table: {match.group(1)}")
        except Exception as e:
            if 'already exists' not in str(e).lower():
                print(f"   ⚠️  Warning: {e}")


async def verify_tables(client):
    """Verify tables in the database."""
    print("\n📋 Verifying tables in Turso...")
    
    result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    
    tables = [row[0] for row in result.rows]
    print(f"   Found {len(tables)} tables:")
    for table in tables:
        print(f"   - {table}")
    
    return tables


async def main():
    print("=" * 60)
    print("🚀 Turso Database Migration Script")
    print("=" * 60)
    
    # Find the project root (where database.sql is)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    sql_file = os.path.join(project_root, 'database.sql')
    
    print(f"\n📂 Project root: {project_root}")
    print(f"📄 SQL file: {sql_file}")
    
    # Connect to Turso
    client = await get_turso_client()
    
    try:
        # Read and parse SQL file
        print(f"\n📖 Reading SQL file...")
        statements = read_sql_file(sql_file)
        print(f"   Found {len(statements)} SQL statements")
        
        # Execute statements
        print("\n🔧 Executing SQL statements...")
        success, errors = await execute_statements(client, statements)
        
        # Create additional tables from models
        await create_additional_tables(client)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Migration Summary")
        print("=" * 60)
        print(f"   ✅ Successful: {success}")
        print(f"   ❌ Errors: {errors}")
        
        if errors == 0:
            print("\n🎉 Migration completed successfully!")
        else:
            print(f"\n⚠️  Migration completed with {errors} error(s)")
        
        # Verify tables
        await verify_tables(client)
        
    finally:
        await client.close()
    
    print("\n✅ Done!")


if __name__ == '__main__':
    asyncio.run(main())
