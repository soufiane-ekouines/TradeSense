"""
Script to create community tables in Turso database.
Run this once to set up the required tables.

Usage:
    Set environment variables TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
    Then run: python scripts/create_community_tables.py
"""

import os
import sys
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use requests for HTTP API (more reliable than websocket)
try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
    import requests

# Get Turso credentials from environment
TURSO_DATABASE_URL = os.environ.get('TURSO_DATABASE_URL', '')
TURSO_AUTH_TOKEN = os.environ.get('TURSO_AUTH_TOKEN', '')

if not TURSO_DATABASE_URL or not TURSO_AUTH_TOKEN:
    print("ERROR: Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables")
    print()
    print("Example:")
    print('  $env:TURSO_DATABASE_URL = "libsql://your-db.turso.io"')
    print('  $env:TURSO_AUTH_TOKEN = "your-auth-token"')
    sys.exit(1)

# SQL statements to create community tables
CREATE_TABLES_SQL = [
    # Community Posts
    """
    CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        user_id INTEGER REFERENCES users(id),
        content TEXT,
        media_type TEXT DEFAULT 'TEXT',
        media_url TEXT,
        likes_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    
    # Community Post Likes
    """
    CREATE TABLE IF NOT EXISTS community_post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER REFERENCES community_posts(id),
        user_id INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
    )
    """,
    
    # Community Strategies
    """
    CREATE TABLE IF NOT EXISTS community_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        user_id INTEGER REFERENCES users(id),
        symbol TEXT NOT NULL,
        description TEXT,
        win_rate REAL,
        screenshot_url TEXT,
        votes_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    
    # Strategy Votes
    """
    CREATE TABLE IF NOT EXISTS strategy_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id INTEGER REFERENCES community_strategies(id),
        user_id INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(strategy_id, user_id)
    )
    """,
    
    # Direct Message Conversations
    """
    CREATE TABLE IF NOT EXISTS dm_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER REFERENCES users(id),
        user2_id INTEGER REFERENCES users(id),
        last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    
    # Direct Messages
    """
    CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER REFERENCES dm_conversations(id),
        sender_id INTEGER REFERENCES users(id),
        content TEXT,
        media_url TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
]

def execute_sql(http_url, auth_token, sql):
    """Execute SQL using Turso HTTP API."""
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "requests": [
            {"type": "execute", "stmt": {"sql": sql}},
            {"type": "close"}
        ]
    }
    
    response = requests.post(f"{http_url}/v2/pipeline", headers=headers, json=payload)
    
    if response.status_code != 200:
        raise Exception(f"HTTP {response.status_code}: {response.text}")
    
    return response.json()


def main():
    print("Connecting to Turso database...")
    
    # Convert websocket URL to HTTP URL
    http_url = TURSO_DATABASE_URL.replace('libsql://', 'https://').replace('wss://', 'https://')
    print(f"URL: {http_url[:50]}...")
    
    # Test connection
    try:
        result = execute_sql(http_url, TURSO_AUTH_TOKEN, "SELECT 1")
        print("Connected successfully!")
    except Exception as e:
        print(f"ERROR: Failed to connect: {e}")
        sys.exit(1)
    
    print()
    print("Creating community tables...")
    
    for sql in CREATE_TABLES_SQL:
        table_name = sql.split("CREATE TABLE IF NOT EXISTS")[1].split("(")[0].strip()
        try:
            execute_sql(http_url, TURSO_AUTH_TOKEN, sql.strip())
            print(f"  ✓ Created table: {table_name}")
        except Exception as e:
            print(f"  ✗ Failed to create {table_name}: {e}")
    
    print()
    print("Verifying tables...")
    
    try:
        result = execute_sql(http_url, TURSO_AUTH_TOKEN, "SELECT name FROM sqlite_master WHERE type='table'")
        # Parse response to get table names
        results = result.get('results', [])
        if results and 'response' in results[0]:
            rows = results[0]['response'].get('result', {}).get('rows', [])
            tables = [row[0].get('value', row[0]) if isinstance(row[0], dict) else row[0] for row in rows]
            print(f"  Tables in database: {', '.join(tables)}")
        else:
            print(f"  Raw response: {result}")
    except Exception as e:
        print(f"  Error listing tables: {e}")
    
    print()
    print("Done! Community tables are ready.")

if __name__ == "__main__":
    main()
