"""
Flask API Entry Point for Vercel Serverless Functions
------------------------------------------------------
This file serves as the entry point for the Flask API when deployed to Vercel.
It connects to Turso (LibSQL) for the database via HTTP API.
"""

import os
import sys

# Add the api directory to the path for imports
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
import json
import jwt
from datetime import datetime, timedelta

# ============================================
# Flask App - Create FIRST before anything else
# ============================================

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-prod')

# Enable CORS for all routes
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# ============================================
# Turso Database Configuration
# ============================================

TURSO_DATABASE_URL = os.environ.get('TURSO_DATABASE_URL', '')
TURSO_AUTH_TOKEN = os.environ.get('TURSO_AUTH_TOKEN', '')

# Try to import libsql_client, but don't crash if it fails
try:
    import libsql_client
    LIBSQL_AVAILABLE = True
except ImportError as e:
    print(f"[WARNING] libsql_client not available: {e}")
    LIBSQL_AVAILABLE = False


def get_db():
    """
    Create a new Turso database client for each request.
    In serverless environments, we don't keep global connections open.
    Returns the client or None if not configured.
    """
    if not LIBSQL_AVAILABLE:
        print("[DB ERROR] libsql_client not available")
        return None
        
    if not TURSO_DATABASE_URL or not TURSO_AUTH_TOKEN:
        print("[DB ERROR] TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not configured")
        return None
    
    try:
        # Use sync client for serverless - simpler and more reliable
        client = libsql_client.create_client_sync(
            url=TURSO_DATABASE_URL,
            auth_token=TURSO_AUTH_TOKEN
        )
        return client
    except Exception as e:
        print(f"[DB ERROR] Failed to create Turso client: {str(e)}")
        return None


def query_db(query, args=(), one=False):
    """Execute a query and return results."""
    client = get_db()
    if not client:
        return None if one else []
    
    try:
        result = client.execute(query, args)
        
        if not result.rows:
            return None if one else []
        
        columns = result.columns
        rows = [dict(zip(columns, row)) for row in result.rows]
        return rows[0] if one else rows
    except Exception as e:
        print(f"[DB ERROR] Query failed: {str(e)}")
        print(f"[DB ERROR] Query was: {query}")
        raise e
    finally:
        try:
            client.close()
        except:
            pass


def execute_db(query, args=()):
    """Execute a write query and return last insert ID."""
    client = get_db()
    if not client:
        print("[DB ERROR] Failed to get database client")
        return None
    
    try:
        print(f"[DB DEBUG] Executing query: {query}")
        print(f"[DB DEBUG] With args: {args}")
        print(f"[DB DEBUG] Args types: {[type(a).__name__ for a in args]}")
        
        result = client.execute(query, args)
        
        # Handle different result formats from libsql_client
        if result is None:
            print("[DB DEBUG] Result is None, returning None")
            return None
        
        # Try to get last_insert_rowid, handle different result types
        if hasattr(result, 'last_insert_rowid'):
            row_id = result.last_insert_rowid
            print(f"[DB DEBUG] Insert successful, last_insert_rowid: {row_id}")
            return row_id
        elif hasattr(result, 'rows') and len(result.rows) > 0:
            print(f"[DB DEBUG] Result has rows: {result.rows}")
            return result.rows[0][0] if result.rows[0] else None
        else:
            # For libsql_client, the result might be structured differently
            print(f"[DB DEBUG] Result type: {type(result)}, Result: {result}")
            # Try to access as dict or get rowid directly
            if isinstance(result, dict):
                return result.get('last_insert_rowid') or result.get('rowid')
            return None
    except Exception as e:
        print(f"[DB ERROR] Execute failed: {str(e)}")
        print(f"[DB ERROR] Exception type: {type(e).__name__}")
        print(f"[DB ERROR] Query was: {query}")
        print(f"[DB ERROR] Args were: {args}")
        raise e
    finally:
        try:
            client.close()
        except:
            pass


# ============================================
# JWT Authentication Helper
# ============================================

def create_token(user_id, role='user'):
    """Create a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    """Decorator to require JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user_id = payload['user_id']
            request.user_role = payload.get('role', 'user')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated


# ============================================
# API Routes
# ============================================

# Root endpoint - no database access required
@app.route('/', methods=['GET'])
@app.route('/api', methods=['GET'])
def root():
    """Root endpoint."""
    return jsonify({
        'name': 'TradeSense API',
        'version': '1.0.0',
        'status': 'running',
        'turso_configured': bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)
    })

# Routes are registered with both /api prefix and without
# This handles Vercel's routing behavior which may or may not strip the prefix

@app.route('/api/debug', methods=['GET'])
@app.route('/debug', methods=['GET'])
def debug_route():
    """Debug endpoint to check routing."""
    return jsonify({
        'path': request.path,
        'full_path': request.full_path,
        'url': request.url,
        'method': request.method,
        'headers': dict(request.headers),
        'message': 'Debug info from Flask'
    })

@app.route('/api/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    db_status = 'not_configured'
    db_error = None
    
    if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
        try:
            # Test database connection
            query_db("SELECT 1")
            db_status = 'connected'
        except Exception as e:
            db_status = 'error'
            db_error = str(e)
    
    response = {
        'status': 'healthy' if db_status in ['connected', 'not_configured'] else 'unhealthy',
        'database': db_status,
        'message': 'TradeSense API is running on Vercel!'
    }
    
    if db_error:
        response['db_error'] = db_error
    
    return jsonify(response), 200 if response['status'] == 'healthy' else 500


# ============================================
# Auth Routes
# ============================================

@app.route('/api/auth/register', methods=['POST'])
@app.route('/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    from werkzeug.security import generate_password_hash
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not all([name, email, password]):
        return jsonify({'error': 'Name, email, and password are required'}), 400
    
    # Check if user exists
    existing = query_db('SELECT id FROM users WHERE email = ?', (email,), one=True)
    if existing:
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create user
    password_hash = generate_password_hash(password)
    user_id = execute_db(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        (name, email, password_hash, 'user')
    )
    
    token = create_token(user_id)
    
    return jsonify({
        'message': 'Registration successful',
        'token': token,
        'user': {'id': user_id, 'name': name, 'email': email, 'role': 'user'}
    }), 201


@app.route('/api/auth/login', methods=['POST'])
@app.route('/auth/login', methods=['POST'])
def login():
    """Login a user."""
    from werkzeug.security import check_password_hash
    
    # Explicitly handle JSON parsing
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
    except Exception as e:
        print(f"[LOGIN ERROR] Failed to parse JSON: {str(e)}")
        return jsonify({'error': 'Invalid JSON data'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not all([email, password]):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Use try/finally to ensure database connection is properly handled
    try:
        user = query_db('SELECT * FROM users WHERE email = ?', (email,), one=True)
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        token = create_token(user['id'], user['role'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        })
    except Exception as e:
        print(f"[LOGIN ERROR] Database error: {str(e)}")
        return jsonify({'error': 'Login failed. Please try again.'}), 500


@app.route('/api/auth/me', methods=['GET'])
@app.route('/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user info."""
    user = query_db('SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?', 
                   (request.user_id,), one=True)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user})


# ============================================
# Plans Routes
# ============================================

@app.route('/api/plans', methods=['GET'])
@app.route('/plans', methods=['GET'])
def get_plans():
    """Get all available plans."""
    plans = query_db('SELECT * FROM plans ORDER BY price_dh ASC')
    
    # Parse features JSON
    for plan in plans:
        if plan.get('features_json'):
            plan['features'] = json.loads(plan['features_json'])
        else:
            plan['features'] = {}
    
    return jsonify({'plans': plans})


# ============================================
# Challenges Routes
# ============================================

@app.route('/api/challenges', methods=['GET'])
@app.route('/challenges', methods=['GET'])
@token_required
def get_challenges():
    """Get user's challenges."""
    challenges = query_db(
        '''SELECT c.*, p.slug as plan_slug, p.price_dh 
           FROM challenges c 
           JOIN plans p ON c.plan_id = p.id 
           WHERE c.user_id = ? 
           ORDER BY c.created_at DESC''',
        (request.user_id,)
    )
    
    return jsonify({'challenges': challenges})


@app.route('/api/challenges/<int:challenge_id>', methods=['GET'])
@app.route('/challenges/<int:challenge_id>', methods=['GET'])
@token_required
def get_challenge(challenge_id):
    """Get a specific challenge."""
    challenge = query_db(
        '''SELECT c.*, p.slug as plan_slug, p.features_json 
           FROM challenges c 
           JOIN plans p ON c.plan_id = p.id 
           WHERE c.id = ? AND c.user_id = ?''',
        (challenge_id, request.user_id),
        one=True
    )
    
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404
    
    if challenge.get('features_json'):
        challenge['features'] = json.loads(challenge['features_json'])
    
    return jsonify({'challenge': challenge})


# ============================================
# Trades Routes
# ============================================

@app.route('/api/trades/<int:challenge_id>', methods=['GET'])
@app.route('/trades/<int:challenge_id>', methods=['GET'])
@token_required
def get_trades(challenge_id):
    """Get trades for a challenge."""
    # Verify challenge belongs to user
    challenge = query_db(
        'SELECT id FROM challenges WHERE id = ? AND user_id = ?',
        (challenge_id, request.user_id),
        one=True
    )
    
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404
    
    trades = query_db(
        'SELECT * FROM trades WHERE challenge_id = ? ORDER BY executed_at DESC',
        (challenge_id,)
    )
    
    return jsonify({'trades': trades})


@app.route('/api/trades/<int:challenge_id>', methods=['POST'])
@app.route('/trades/<int:challenge_id>', methods=['POST'])
@token_required
def create_trade(challenge_id):
    """Create a new trade."""
    # Verify challenge belongs to user and is active
    challenge = query_db(
        'SELECT * FROM challenges WHERE id = ? AND user_id = ? AND status = ?',
        (challenge_id, request.user_id, 'active'),
        one=True
    )
    
    if not challenge:
        return jsonify({'error': 'Active challenge not found'}), 404
    
    data = request.get_json()
    symbol = data.get('symbol')
    side = data.get('side')
    qty = data.get('qty')
    price = data.get('price')
    
    if not all([symbol, side, qty, price]):
        return jsonify({'error': 'Symbol, side, qty, and price are required'}), 400
    
    trade_id = execute_db(
        'INSERT INTO trades (challenge_id, symbol, side, qty, price) VALUES (?, ?, ?, ?, ?)',
        (challenge_id, symbol, side, qty, price)
    )
    
    # Update challenge equity (simplified)
    pnl = qty * price if side == 'sell' else -qty * price
    new_equity = challenge['equity'] + pnl
    execute_db('UPDATE challenges SET equity = ? WHERE id = ?', (new_equity, challenge_id))
    
    return jsonify({
        'message': 'Trade executed',
        'trade_id': trade_id,
        'new_equity': new_equity
    }), 201


# ============================================
# Leaderboard Routes
# ============================================

@app.route('/api/leaderboard', methods=['GET'])
@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get the leaderboard."""
    leaderboard = query_db(
        '''SELECT u.id, u.name, u.avatar_url, 
                  COUNT(c.id) as total_challenges,
                  SUM(CASE WHEN c.status = 'passed' THEN 1 ELSE 0 END) as passed_challenges,
                  MAX(c.equity - c.start_balance) as best_profit
           FROM users u
           LEFT JOIN challenges c ON u.id = c.user_id
           GROUP BY u.id
           HAVING total_challenges > 0
           ORDER BY passed_challenges DESC, best_profit DESC
           LIMIT 50'''
    )
    
    return jsonify({'leaderboard': leaderboard})


# ============================================
# Community Routes
# ============================================

@app.after_request
def add_cache_headers(response):
    """Add headers to prevent caching of API responses."""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.route('/api/v1/<tenant>/community/nexus', methods=['GET'])
@app.route('/v1/<tenant>/community/nexus', methods=['GET'])
def get_community_nexus(tenant):
    """Get unified community feed (nexus)."""
    try:
        posts = query_db(
            '''SELECT p.id, p.content, p.media_type, p.media_url, p.likes_count, p.created_at,
                      u.id as user_id, u.name as author_name, u.role as author_role
               FROM community_posts p
               JOIN users u ON p.user_id = u.id
               WHERE p.tenant_id = ?
               ORDER BY p.created_at DESC
               LIMIT 50''',
            (tenant,)
        )
        
        formatted_posts = []
        for post in posts:
            formatted_posts.append({
                'id': post.get('id'),
                'content': post.get('content'),
                'media_type': post.get('media_type', 'TEXT'),
                'media_url': post.get('media_url'),
                'likes_count': post.get('likes_count', 0),
                'created_at': post.get('created_at'),
                'author': {
                    'id': post.get('user_id'),
                    'name': post.get('author_name', 'Anonymous'),
                    'avatar_url': f"https://api.dicebear.com/7.x/identicon/svg?seed={post.get('author_name', 'user')}",
                    'role': post.get('author_role', 'user')
                }
            })
        
        return jsonify({'posts': formatted_posts})
    except Exception as e:
        print(f"Error in get_community_nexus: {e}")
        return jsonify({'posts': []})


@app.route('/api/v1/<tenant>/community/posts', methods=['POST'])
@app.route('/v1/<tenant>/community/posts', methods=['POST'])
@token_required
def create_community_post(tenant):
    """Create a new community post (text, voice, or image)."""
    try:
        # Handle both FormData and JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            content = request.form.get('content', '')
            file = request.files.get('file')
            media_type = 'TEXT'
            media_url = None
            
            if file:
                # For now, we'll skip file upload in serverless
                # In production, upload to cloud storage
                media_type = 'VOICE'
                media_url = None  # Would be cloud storage URL
        else:
            data = request.get_json() or {}
            content = data.get('content', '')
            media_type = data.get('media_type', 'TEXT')
            media_url = data.get('media_url')
        
        if not content and not media_url:
            return jsonify({'error': 'Content or media is required'}), 400
        
        post_id = execute_db(
            '''INSERT INTO community_posts (tenant_id, user_id, content, media_type, media_url, likes_count)
               VALUES (?, ?, ?, ?, ?, 0)''',
            (tenant, request.user_id, content, media_type, media_url)
        )
        
        # Get user info for response
        user = query_db('SELECT name, role FROM users WHERE id = ?', (request.user_id,), one=True)
        user_name = user.get('name', 'User') if user else 'User'
        user_role = user.get('role', 'user') if user else 'user'
        
        return jsonify({
            'message': 'Post created successfully',
            'post_id': post_id,
            'post': {
                'id': post_id,
                'content': content,
                'media_type': media_type,
                'media_url': media_url,
                'likes_count': 0,
                'author': {
                    'id': request.user_id,
                    'name': user_name,
                    'avatar_url': f"https://api.dicebear.com/7.x/identicon/svg?seed={user_name}",
                    'role': user_role
                }
            }
        }), 201
    except Exception as e:
        print(f"Error creating post: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/v1/<tenant>/community/posts/<int:post_id>/like', methods=['POST'])
@app.route('/v1/<tenant>/community/posts/<int:post_id>/like', methods=['POST'])
@token_required
def like_post(tenant, post_id):
    """Like a community post."""
    try:
        # Check if already liked
        existing = query_db(
            'SELECT id FROM community_post_likes WHERE post_id = ? AND user_id = ?',
            (post_id, request.user_id),
            one=True
        )
        
        if existing:
            return jsonify({'message': 'Already liked'}), 200
        
        # Add like
        execute_db(
            'INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)',
            (post_id, request.user_id)
        )
        
        # Update likes count
        execute_db(
            'UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?',
            (post_id,)
        )
        
        return jsonify({'message': 'Post liked'}), 200
    except Exception as e:
        print(f"Error liking post: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/v1/<tenant>/community/strategies/top', methods=['GET'])
@app.route('/v1/<tenant>/community/strategies/top', methods=['GET'])
def get_top_strategies(tenant):
    """Get top community strategies."""
    try:
        strategies = query_db(
            '''SELECT s.id, s.symbol, s.description, s.win_rate, s.screenshot_url, s.votes_count, s.created_at,
                      u.id as user_id, u.name as author_name
               FROM community_strategies s
               JOIN users u ON s.user_id = u.id
               WHERE s.tenant_id = ?
               ORDER BY s.votes_count DESC
               LIMIT 10''',
            (tenant,)
        )
        
        formatted = []
        for s in strategies:
            formatted.append({
                'id': s.get('id'),
                'symbol': s.get('symbol'),
                'description': s.get('description'),
                'win_rate': s.get('win_rate'),
                'screenshot_url': s.get('screenshot_url'),
                'votes_count': s.get('votes_count', 0),
                'created_at': s.get('created_at'),
                'author': {
                    'id': s.get('user_id'),
                    'name': s.get('author_name', 'Anonymous')
                }
            })
        
        return jsonify(formatted)
    except Exception as e:
        print(f"Error getting top strategies: {e}")
        return jsonify([])


@app.route('/api/v1/<tenant>/community/strategies', methods=['POST'])
@app.route('/v1/<tenant>/community/strategies', methods=['POST'])
@token_required
def publish_strategy(tenant):
    """Publish a new community strategy."""
    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            symbol = request.form.get('symbol', '')
            description = request.form.get('description', '')
            win_rate = request.form.get('win_rate')
            screenshot = request.files.get('screenshot')
        else:
            data = request.get_json() or {}
            symbol = data.get('symbol', '')
            description = data.get('description', '')
            win_rate = data.get('win_rate')
            screenshot = None
        
        if not symbol:
            return jsonify({'error': 'Symbol is required'}), 400
        
        strategy_id = execute_db(
            '''INSERT INTO community_strategies (tenant_id, user_id, symbol, description, win_rate, votes_count)
               VALUES (?, ?, ?, ?, ?, 0)''',
            (tenant, request.user_id, symbol, description, float(win_rate) if win_rate else None)
        )
        
        return jsonify({'message': 'Strategy published', 'strategy_id': strategy_id}), 201
    except Exception as e:
        print(f"Error publishing strategy: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/v1/<tenant>/community/strategies/<int:strategy_id>/vote', methods=['POST'])
@app.route('/v1/<tenant>/community/strategies/<int:strategy_id>/vote', methods=['POST'])
@token_required
def vote_strategy(tenant, strategy_id):
    """Vote for a community strategy."""
    try:
        # Check if already voted
        existing = query_db(
            'SELECT id FROM strategy_votes WHERE strategy_id = ? AND user_id = ?',
            (strategy_id, request.user_id),
            one=True
        )
        
        if existing:
            return jsonify({'message': 'Already voted'}), 200
        
        # Add vote
        execute_db(
            'INSERT INTO strategy_votes (strategy_id, user_id) VALUES (?, ?)',
            (strategy_id, request.user_id)
        )
        
        # Update votes count
        execute_db(
            'UPDATE community_strategies SET votes_count = votes_count + 1 WHERE id = ?',
            (strategy_id,)
        )
        
        return jsonify({'message': 'Vote recorded'}), 200
    except Exception as e:
        print(f"Error voting strategy: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# Direct Messaging Routes
# ============================================

@app.route('/api/v1/<tenant>/dm/conversations', methods=['GET'])
@app.route('/v1/<tenant>/dm/conversations', methods=['GET'])
@token_required
def get_conversations(tenant):
    """Get all conversations for the current user."""
    try:
        conversations = query_db(
            '''SELECT c.id, c.last_message_at, c.created_at,
                      u1.id as user1_id, u1.name as user1_name,
                      u2.id as user2_id, u2.name as user2_name
               FROM dm_conversations c
               JOIN users u1 ON c.user1_id = u1.id
               JOIN users u2 ON c.user2_id = u2.id
               WHERE c.user1_id = ? OR c.user2_id = ?
               ORDER BY c.last_message_at DESC''',
            (request.user_id, request.user_id)
        )
        
        formatted = []
        for c in conversations:
            # Get the other user in the conversation
            other_id = c.get('user2_id') if c.get('user1_id') == request.user_id else c.get('user1_id')
            other_name = c.get('user2_name') if c.get('user1_id') == request.user_id else c.get('user1_name')
            
            formatted.append({
                'id': other_id,  # Use other user's ID as conversation ID
                'name': other_name,
                'avatar_url': f"https://api.dicebear.com/7.x/identicon/svg?seed={other_name}",
                'last_message_at': c.get('last_message_at')
            })
        
        return jsonify(formatted)
    except Exception as e:
        print(f"Error getting conversations: {e}")
        return jsonify([])


@app.route('/api/v1/<tenant>/dm/users', methods=['GET'])
@app.route('/v1/<tenant>/dm/users', methods=['GET'])
@token_required
def get_available_users(tenant):
    """Get all users available for DM."""
    try:
        users = query_db(
            'SELECT id, name, role FROM users WHERE id != ? LIMIT 50',
            (request.user_id,)
        )
        
        formatted = []
        for u in users:
            formatted.append({
                'id': u.get('id'),
                'name': u.get('name'),
                'avatar_url': f"https://api.dicebear.com/7.x/identicon/svg?seed={u.get('name')}",
                'role': u.get('role', 'user')
            })
        
        return jsonify(formatted)
    except Exception as e:
        print(f"Error getting users: {e}")
        return jsonify([])


@app.route('/api/v1/<tenant>/dm/messages/<int:user_id>', methods=['GET'])
@app.route('/v1/<tenant>/dm/messages/<int:user_id>', methods=['GET'])
@token_required
def get_dm_messages(tenant, user_id):
    """Get messages between current user and another user."""
    try:
        # Find conversation
        conv = query_db(
            '''SELECT id FROM dm_conversations 
               WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)''',
            (request.user_id, user_id, user_id, request.user_id),
            one=True
        )
        
        if not conv:
            return jsonify([])
        
        messages = query_db(
            '''SELECT m.id, m.content, m.media_url, m.is_read, m.created_at,
                      m.sender_id, u.name as sender_name
               FROM direct_messages m
               JOIN users u ON m.sender_id = u.id
               WHERE m.conversation_id = ?
               ORDER BY m.created_at ASC''',
            (conv.get('id'),)
        )
        
        formatted = []
        for m in messages:
            formatted.append({
                'id': m.get('id'),
                'content': m.get('content'),
                'media_url': m.get('media_url'),
                'is_read': m.get('is_read'),
                'created_at': m.get('created_at'),
                'sender': {
                    'id': m.get('sender_id'),
                    'name': m.get('sender_name')
                },
                'is_mine': m.get('sender_id') == request.user_id
            })
        
        return jsonify(formatted)
    except Exception as e:
        print(f"Error getting messages: {e}")
        return jsonify([])


@app.route('/api/v1/<tenant>/dm/messages/<int:user_id>', methods=['POST'])
@app.route('/v1/<tenant>/dm/messages/<int:user_id>', methods=['POST'])
@token_required
def send_dm_message(tenant, user_id):
    """Send a direct message to another user."""
    try:
        # Handle both FormData and JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            content = request.form.get('content', '')
            file = request.files.get('file')
            media_url = None
            if file:
                # Would upload to cloud storage
                pass
        else:
            data = request.get_json() or {}
            content = data.get('content', '')
            media_url = data.get('media_url')
        
        if not content and not media_url:
            return jsonify({'error': 'Message content is required'}), 400
        
        # Find or create conversation
        conv = query_db(
            '''SELECT id FROM dm_conversations 
               WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)''',
            (request.user_id, user_id, user_id, request.user_id),
            one=True
        )
        
        if not conv:
            # Create new conversation
            conv_id = execute_db(
                'INSERT INTO dm_conversations (user1_id, user2_id) VALUES (?, ?)',
                (request.user_id, user_id)
            )
        else:
            conv_id = conv.get('id')
        
        # Insert message
        msg_id = execute_db(
            'INSERT INTO direct_messages (conversation_id, sender_id, content, media_url) VALUES (?, ?, ?, ?)',
            (conv_id, request.user_id, content, media_url)
        )
        
        # Update conversation last_message_at
        execute_db(
            'UPDATE dm_conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
            (conv_id,)
        )
        
        return jsonify({'message': 'Message sent', 'message_id': msg_id}), 201
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# Market Data Routes
# ============================================

@app.route('/api/market/quotes', methods=['GET'])
@app.route('/market/quotes', methods=['GET'])
def get_market_quotes():
    """Get market quotes for popular symbols."""
    # This would typically integrate with a real market data API
    # For now, return sample data
    quotes = [
        {'symbol': 'GOLD', 'price': 2045.50, 'change': 12.30, 'change_pct': 0.61},
        {'symbol': 'BTC-USD', 'price': 43250.00, 'change': -520.00, 'change_pct': -1.19},
        {'symbol': 'EUR-USD', 'price': 1.0875, 'change': 0.0012, 'change_pct': 0.11},
        {'symbol': 'IAM', 'price': 120.50, 'change': 2.10, 'change_pct': 1.77},
    ]
    
    return jsonify({'quotes': quotes})


# ============================================
# Checkout Routes
# ============================================

PLAN_PRICES = {'starter': 200, 'pro': 500, 'elite': 1000}
PLAN_BALANCES = {'starter': 10000, 'pro': 25000, 'elite': 100000}

def get_plan_by_slug(slug):
    """Get plan from database by slug."""
    return query_db('SELECT * FROM plans WHERE slug = ?', (slug,), one=True)

def create_challenge_for_user(user_id, plan_id, start_balance):
    """Create a new challenge for the user."""
    from datetime import datetime, timedelta
    
    # Prepare values
    end_date_str = (datetime.utcnow() + timedelta(days=30)).isoformat()
    max_drawdown = 0.10  # 10% max drawdown
    profit_target = 0.10  # 10% profit target
    
    values = (
        int(user_id),
        int(plan_id),
        'active',
        float(start_balance),
        float(start_balance),
        float(max_drawdown),
        float(profit_target),
        str(end_date_str)
    )
    
    print(f"[CHALLENGE DEBUG] Creating challenge with values:")
    print(f"  user_id: {user_id} (type: {type(user_id).__name__})")
    print(f"  plan_id: {plan_id} (type: {type(plan_id).__name__})")
    print(f"  status: 'active'")
    print(f"  start_balance: {start_balance} (type: {type(start_balance).__name__})")
    print(f"  equity: {start_balance}")
    print(f"  max_drawdown: {max_drawdown}")
    print(f"  profit_target: {profit_target}")
    print(f"  end_date: {end_date_str}")
    
    try:
        challenge_id = execute_db(
            '''INSERT INTO challenges (user_id, plan_id, status, start_balance, equity, max_drawdown, profit_target, end_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            values
        )
        print(f"[CHALLENGE DEBUG] Challenge created with ID: {challenge_id}")
        return challenge_id
    except Exception as e:
        print(f"[CHALLENGE ERROR] Failed to create challenge: {str(e)}")
        print(f"[CHALLENGE ERROR] Exception type: {type(e).__name__}")
        raise e


@app.route('/api/checkout/crypto', methods=['POST'])
@app.route('/checkout/crypto', methods=['POST'])
@token_required
def pay_crypto():
    """Process crypto payment."""
    try:
        data = request.get_json()
        plan_slug = data.get('plan')
        
        print(f"[CRYPTO CHECKOUT] Processing payment for plan: {plan_slug}, user_id: {request.user_id}")
        
        if not plan_slug or plan_slug not in PLAN_PRICES:
            return jsonify({'error': 'Invalid plan', 'details': f'Plan "{plan_slug}" not found in available plans'}), 400
        
        # Get plan from database
        plan = get_plan_by_slug(plan_slug)
        if not plan:
            return jsonify({'error': 'Plan not found', 'details': f'Plan "{plan_slug}" not in database'}), 404
        
        amount = PLAN_PRICES.get(plan_slug, 200)
        start_balance = PLAN_BALANCES.get(plan_slug, 10000)
        
        # Get plan_id safely
        plan_id = plan.get('id') if isinstance(plan, dict) else getattr(plan, 'id', None)
        if plan_id is None:
            # If we can't get plan_id, query it directly
            plan_row = query_db('SELECT id FROM plans WHERE slug = ?', (plan_slug,), one=True)
            plan_id = plan_row.get('id') if plan_row else 1
        
        print(f"[CRYPTO CHECKOUT] Plan ID: {plan_id}, Amount: {amount}, Start Balance: {start_balance}")
        
        # Simulate crypto payment processing
        import uuid
        transaction_id = str(uuid.uuid4())
        
        # Create challenge for the user
        try:
            challenge_id = create_challenge_for_user(request.user_id, plan_id, start_balance)
        except Exception as db_error:
            print(f"[CRYPTO CHECKOUT ERROR] Database error creating challenge: {str(db_error)}")
            return jsonify({
                'error': 'Database error',
                'details': str(db_error),
                'error_type': type(db_error).__name__
            }), 500
        
        return jsonify({
            'success': True,
            'transaction_id': transaction_id,
            'challenge_id': challenge_id,
            'message': f'Crypto payment of ${amount} processed successfully',
            'wallet_address': '0x1234567890abcdef1234567890abcdef12345678',
            'amount_crypto': amount / 43000  # Approximate BTC conversion
        })
    except Exception as e:
        print(f"[CRYPTO CHECKOUT ERROR] Unexpected error: {str(e)}")
        return jsonify({'error': 'Payment processing failed', 'details': str(e)}), 500


@app.route('/api/checkout/cmi', methods=['POST'])
@app.route('/checkout/cmi', methods=['POST'])
@token_required
def pay_cmi():
    """Process CMI card payment."""
    try:
        data = request.get_json()
        plan_slug = data.get('plan')
        
        if not plan_slug or plan_slug not in PLAN_PRICES:
            return jsonify({'error': 'Invalid plan'}), 400
        
        # Get plan from database
        plan = get_plan_by_slug(plan_slug)
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        
        amount = PLAN_PRICES.get(plan_slug, 200)
        start_balance = PLAN_BALANCES.get(plan_slug, 10000)
        
        # Get plan_id safely
        plan_id = plan.get('id') if isinstance(plan, dict) else getattr(plan, 'id', None)
        if plan_id is None:
            plan_row = query_db('SELECT id FROM plans WHERE slug = ?', (plan_slug,), one=True)
            plan_id = plan_row.get('id') if plan_row else 1
        
        # Simulate CMI payment processing
        import uuid
        transaction_id = str(uuid.uuid4())
        
        # Create challenge for the user
        challenge_id = create_challenge_for_user(request.user_id, plan_id, start_balance)
        
        return jsonify({
            'success': True,
            'transaction_id': transaction_id,
            'challenge_id': challenge_id,
            'message': f'CMI payment of {amount} DH processed successfully'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/checkout/paypal', methods=['POST'])
@app.route('/checkout/paypal', methods=['POST'])
@token_required
def pay_paypal():
    """Process PayPal payment."""
    try:
        data = request.get_json()
        plan_slug = data.get('plan')
        
        if not plan_slug or plan_slug not in PLAN_PRICES:
            return jsonify({'error': 'Invalid plan'}), 400
        
        # Get plan from database
        plan = get_plan_by_slug(plan_slug)
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        
        amount = PLAN_PRICES.get(plan_slug, 200)
        start_balance = PLAN_BALANCES.get(plan_slug, 10000)
        
        # Get plan_id safely
        plan_id = plan.get('id') if isinstance(plan, dict) else getattr(plan, 'id', None)
        if plan_id is None:
            plan_row = query_db('SELECT id FROM plans WHERE slug = ?', (plan_slug,), one=True)
            plan_id = plan_row.get('id') if plan_row else 1
        
        # Simulate PayPal payment processing
        import uuid
        transaction_id = str(uuid.uuid4())
        
        # Create challenge for the user
        challenge_id = create_challenge_for_user(request.user_id, plan_id, start_balance)
        
        return jsonify({
            'success': True,
            'transaction_id': transaction_id,
            'challenge_id': challenge_id,
            'message': f'PayPal payment of ${amount} processed successfully',
            'paypal_order_id': f'PP-{transaction_id[:8].upper()}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# Academy Routes - MasterClass Learning Center
# ============================================

# Static course data (no database needed for MVP)
ACADEMY_COURSES = [
    {
        'id': 1,
        'title': 'Trading Fundamentals',
        'description': 'Master the basics of trading - from market structure to order types. Perfect for beginners.',
        'difficulty': 'Beginner',
        'duration_minutes': 270,
        'duration': '4h 30m',
        'xp_reward': 500,
        'thumbnail_url': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        'instructor': 'Sarah Johnson',
        'rating': 4.8,
        'students': 2547,
        'is_premium': False,
        'user_progress': 0,
        'modules': [
            {
                'id': 1, 
                'title': 'Market Basics', 
                'duration': '1h 30m',
                'lessons': [
                    {'id': 101, 'title': 'Introduction to Financial Markets', 'duration': '15m', 'completed': False, 'type': 'video'},
                    {'id': 102, 'title': 'Understanding Market Structure', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 103, 'title': 'Types of Financial Instruments', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 104, 'title': 'Quiz: Market Basics', 'duration': '10m', 'completed': False, 'type': 'quiz'}
                ]
            },
            {
                'id': 2, 
                'title': 'Order Types', 
                'duration': '1h 30m',
                'lessons': [
                    {'id': 105, 'title': 'Market Orders vs Limit Orders', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 106, 'title': 'Stop Loss & Take Profit', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 107, 'title': 'Advanced Order Types', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 108, 'title': 'Practice: Place Your First Trade', 'duration': '15m', 'completed': False, 'type': 'practice'}
                ]
            },
            {
                'id': 3, 
                'title': 'Risk Management', 
                'duration': '1h 30m',
                'lessons': [
                    {'id': 109, 'title': 'Position Sizing Fundamentals', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 110, 'title': 'Risk-Reward Ratios', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 111, 'title': 'Building a Risk Management Plan', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 112, 'title': 'Final Quiz', 'duration': '15m', 'completed': False, 'type': 'quiz'}
                ]
            }
        ]
    },
    {
        'id': 2,
        'title': 'Technical Analysis Pro',
        'description': 'Advanced chart patterns, indicators, and price action strategies used by professionals.',
        'difficulty': 'Pro',
        'duration_minutes': 495,
        'duration': '8h 15m',
        'xp_reward': 1200,
        'thumbnail_url': 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800',
        'instructor': 'Michael Chen',
        'rating': 4.9,
        'students': 1823,
        'is_premium': True,
        'user_progress': 0,
        'modules': [
            {
                'id': 4, 
                'title': 'Chart Patterns', 
                'duration': '3h',
                'lessons': [
                    {'id': 201, 'title': 'Support & Resistance Levels', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 202, 'title': 'Trend Lines & Channels', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 203, 'title': 'Head & Shoulders Pattern', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 204, 'title': 'Double Tops & Bottoms', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 205, 'title': 'Triangles & Wedges', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 206, 'title': 'Pattern Recognition Practice', 'duration': '20m', 'completed': False, 'type': 'practice'}
                ]
            },
            {
                'id': 5, 
                'title': 'Indicators Mastery', 
                'duration': '2h 30m',
                'lessons': [
                    {'id': 207, 'title': 'Moving Averages Deep Dive', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 208, 'title': 'RSI & Momentum Indicators', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 209, 'title': 'MACD Strategies', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 210, 'title': 'Bollinger Bands', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 211, 'title': 'Combining Multiple Indicators', 'duration': '25m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 6, 
                'title': 'Price Action', 
                'duration': '2h 45m',
                'lessons': [
                    {'id': 212, 'title': 'Candlestick Patterns', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 213, 'title': 'Price Action Trading Strategies', 'duration': '35m', 'completed': False, 'type': 'video'},
                    {'id': 214, 'title': 'Market Structure Analysis', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 215, 'title': 'Live Chart Analysis', 'duration': '30m', 'completed': False, 'type': 'practice'},
                    {'id': 216, 'title': 'Final Assessment', 'duration': '20m', 'completed': False, 'type': 'quiz'}
                ]
            }
        ]
    },
    {
        'id': 3,
        'title': 'Forex Mastery',
        'description': 'Complete guide to forex trading - pairs, sessions, and advanced strategies.',
        'difficulty': 'Pro',
        'duration_minutes': 405,
        'duration': '6h 45m',
        'xp_reward': 1000,
        'thumbnail_url': 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
        'instructor': 'Ahmed Mansour',
        'rating': 4.7,
        'students': 1456,
        'is_premium': True,
        'user_progress': 0,
        'modules': [
            {
                'id': 7, 
                'title': 'Forex Basics', 
                'duration': '2h',
                'lessons': [
                    {'id': 301, 'title': 'Introduction to Forex', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 302, 'title': 'Currency Pairs Explained', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 303, 'title': 'Pips, Lots & Leverage', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 304, 'title': 'Reading Forex Quotes', 'duration': '20m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 8, 
                'title': 'Session Trading', 
                'duration': '2h 30m',
                'lessons': [
                    {'id': 305, 'title': 'Understanding Trading Sessions', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 306, 'title': 'London Session Strategies', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 307, 'title': 'New York Session Strategies', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 308, 'title': 'Session Overlap Trading', 'duration': '25m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 9, 
                'title': 'Advanced Strategies', 
                'duration': '2h 15m',
                'lessons': [
                    {'id': 309, 'title': 'Carry Trade Strategy', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 310, 'title': 'News Trading', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 311, 'title': 'Correlation Trading', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 312, 'title': 'Final Quiz', 'duration': '15m', 'completed': False, 'type': 'quiz'}
                ]
            }
        ]
    },
    {
        'id': 4,
        'title': 'Algorithmic Trading',
        'description': 'Build and backtest your own trading algorithms. Python & automation focus.',
        'difficulty': 'Elite',
        'duration_minutes': 750,
        'duration': '12h 30m',
        'xp_reward': 2000,
        'thumbnail_url': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
        'instructor': 'Dr. Emily Watson',
        'rating': 4.9,
        'students': 892,
        'is_premium': True,
        'user_progress': 0,
        'modules': [
            {
                'id': 10, 
                'title': 'Python for Trading', 
                'duration': '4h',
                'lessons': [
                    {'id': 401, 'title': 'Python Basics for Traders', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 402, 'title': 'Pandas for Financial Data', 'duration': '35m', 'completed': False, 'type': 'video'},
                    {'id': 403, 'title': 'NumPy for Calculations', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 404, 'title': 'Data Visualization', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 405, 'title': 'API Integration', 'duration': '35m', 'completed': False, 'type': 'video'},
                    {'id': 406, 'title': 'Coding Practice', 'duration': '30m', 'completed': False, 'type': 'practice'}
                ]
            },
            {
                'id': 11, 
                'title': 'Strategy Development', 
                'duration': '5h',
                'lessons': [
                    {'id': 407, 'title': 'Building Your First Algorithm', 'duration': '40m', 'completed': False, 'type': 'video'},
                    {'id': 408, 'title': 'Signal Generation', 'duration': '35m', 'completed': False, 'type': 'video'},
                    {'id': 409, 'title': 'Position Management Logic', 'duration': '35m', 'completed': False, 'type': 'video'},
                    {'id': 410, 'title': 'Risk Controls in Code', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 411, 'title': 'Strategy Optimization', 'duration': '40m', 'completed': False, 'type': 'video'},
                    {'id': 412, 'title': 'Build Your Strategy', 'duration': '45m', 'completed': False, 'type': 'practice'}
                ]
            },
            {
                'id': 12, 
                'title': 'Backtesting & Deployment', 
                'duration': '3h 30m',
                'lessons': [
                    {'id': 413, 'title': 'Backtesting Fundamentals', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 414, 'title': 'Avoiding Overfitting', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 415, 'title': 'Walk-Forward Analysis', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 416, 'title': 'Paper Trading Setup', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 417, 'title': 'Going Live', 'duration': '30m', 'completed': False, 'type': 'video'},
                    {'id': 418, 'title': 'Final Project', 'duration': '30m', 'completed': False, 'type': 'practice'}
                ]
            }
        ]
    },
    {
        'id': 5,
        'title': 'Crypto Trading Essentials',
        'description': 'Navigate the crypto markets with confidence. DeFi, NFTs, and more.',
        'difficulty': 'Pro',
        'duration_minutes': 320,
        'duration': '5h 20m',
        'xp_reward': 800,
        'thumbnail_url': 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
        'instructor': 'Jake Rivera',
        'rating': 4.6,
        'students': 3201,
        'is_premium': False,
        'user_progress': 0,
        'modules': [
            {
                'id': 13, 
                'title': 'Crypto Fundamentals', 
                'duration': '1h 45m',
                'lessons': [
                    {'id': 501, 'title': 'Blockchain Basics', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 502, 'title': 'Understanding Bitcoin', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 503, 'title': 'Altcoins & Tokens', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 504, 'title': 'Crypto Wallets & Security', 'duration': '20m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 14, 
                'title': 'DeFi & NFTs', 
                'duration': '1h 50m',
                'lessons': [
                    {'id': 505, 'title': 'Introduction to DeFi', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 506, 'title': 'Yield Farming & Staking', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 507, 'title': 'NFT Markets', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 508, 'title': 'DeFi Risks', 'duration': '20m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 15, 
                'title': 'Advanced Crypto Trading', 
                'duration': '1h 45m',
                'lessons': [
                    {'id': 509, 'title': 'Crypto Technical Analysis', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 510, 'title': 'Market Cycles', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 511, 'title': 'Trading Crypto Volatility', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 512, 'title': 'Final Quiz', 'duration': '15m', 'completed': False, 'type': 'quiz'}
                ]
            }
        ]
    },
    {
        'id': 6,
        'title': 'Risk & Psychology',
        'description': 'Master your mind and money. Essential for consistent profitability.',
        'difficulty': 'Beginner',
        'duration_minutes': 225,
        'duration': '3h 45m',
        'xp_reward': 600,
        'thumbnail_url': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
        'instructor': 'Dr. Lisa Park',
        'rating': 4.8,
        'students': 4102,
        'is_premium': False,
        'user_progress': 0,
        'modules': [
            {
                'id': 16, 
                'title': 'Trading Psychology', 
                'duration': '1h 30m',
                'lessons': [
                    {'id': 601, 'title': 'The Trader Mindset', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 602, 'title': 'Emotions in Trading', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 603, 'title': 'Fear & Greed', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 604, 'title': 'Developing Discipline', 'duration': '25m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 17, 
                'title': 'Risk Management', 
                'duration': '1h 15m',
                'lessons': [
                    {'id': 605, 'title': 'Capital Preservation', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 606, 'title': 'Drawdown Management', 'duration': '25m', 'completed': False, 'type': 'video'},
                    {'id': 607, 'title': 'Portfolio Risk', 'duration': '25m', 'completed': False, 'type': 'video'}
                ]
            },
            {
                'id': 18, 
                'title': 'Discipline & Routine', 
                'duration': '1h',
                'lessons': [
                    {'id': 608, 'title': 'Building a Trading Routine', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 609, 'title': 'Journaling Best Practices', 'duration': '20m', 'completed': False, 'type': 'video'},
                    {'id': 610, 'title': 'Long-term Success Habits', 'duration': '20m', 'completed': False, 'type': 'video'}
                ]
            }
        ]
    }
]


@app.route('/api/v1/<tenant>/academy/courses', methods=['GET'])
@app.route('/v1/<tenant>/academy/courses', methods=['GET'])
def get_academy_courses(tenant):
    """Get all available courses."""
    return jsonify(ACADEMY_COURSES), 200


@app.route('/api/v1/<tenant>/academy/courses/<int:course_id>', methods=['GET'])
@app.route('/v1/<tenant>/academy/courses/<int:course_id>', methods=['GET'])
def get_academy_course(tenant, course_id):
    """Get detailed course information."""
    course = next((c for c in ACADEMY_COURSES if c['id'] == course_id), None)
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    return jsonify(course), 200


@app.route('/api/v1/<tenant>/academy/me/stats', methods=['GET'])
@app.route('/v1/<tenant>/academy/me/stats', methods=['GET'])
@token_required
def get_academy_stats(tenant):
    """Get current user's learning stats."""
    # Return mock stats for MVP
    stats = {
        'total_xp': 1250,
        'level': 5,
        'xp_to_next_level': 250,
        'courses_completed': 2,
        'courses_in_progress': 1,
        'lessons_completed': 28,
        'quiz_accuracy': 85.5,
        'streak_days': 7,
        'badges_earned': 3,
        'rank': 'Rising Star',
        'completed_courses': [1, 6],
        'in_progress_courses': [2]
    }
    return jsonify(stats), 200


@app.route('/api/v1/<tenant>/academy/me/recommendations', methods=['GET'])
@app.route('/v1/<tenant>/academy/me/recommendations', methods=['GET'])
@token_required
def get_academy_recommendations(tenant):
    """Get AI-powered course recommendations for user."""
    # Return mock recommendations based on courses
    recommendations = [
        {
            'id': 1,
            'course_id': 2,
            'course': ACADEMY_COURSES[1],  # Technical Analysis Pro
            'reason': 'Based on your trading patterns, improving technical analysis could increase your win rate.',
            'priority': 'high',
            'match_score': 95
        },
        {
            'id': 2,
            'course_id': 4,
            'course': ACADEMY_COURSES[3],  # Algorithmic Trading
            'reason': 'Your systematic approach suggests you might benefit from algorithmic trading skills.',
            'priority': 'medium',
            'match_score': 82
        },
        {
            'id': 3,
            'course_id': 6,
            'course': ACADEMY_COURSES[5],  # Risk & Psychology
            'reason': 'Managing drawdowns better could significantly improve your overall performance.',
            'priority': 'high',
            'match_score': 88
        }
    ]
    return jsonify(recommendations), 200


@app.route('/api/v1/<tenant>/academy/me/recommendations/analyze', methods=['POST'])
@app.route('/v1/<tenant>/academy/me/recommendations/analyze', methods=['POST'])
@token_required
def analyze_academy_recommendations(tenant):
    """Trigger AI analysis of trading patterns and get recommendations."""
    recommendations = [
        {
            'id': 1,
            'course_id': 2,
            'reason': 'Your recent trades show entry timing issues - Technical Analysis Pro can help.',
            'priority': 'high',
            'match_score': 92
        }
    ]
    return jsonify({
        'message': 'Analysis complete',
        'recommendations': recommendations
    }), 200


@app.route('/api/v1/<tenant>/academy/lessons/<int:lesson_id>', methods=['GET'])
@app.route('/v1/<tenant>/academy/lessons/<int:lesson_id>', methods=['GET'])
def get_academy_lesson(tenant, lesson_id):
    """Get lesson details."""
    # Mock lesson data
    lesson = {
        'id': lesson_id,
        'title': f'Lesson {lesson_id}: Introduction to Candlestick Patterns',
        'course_id': 1,
        'module_id': 1,
        'duration': '15:30',
        'video_url': 'https://example.com/video.mp4',
        'content': 'Learn the basics of candlestick patterns and how to read price action...',
        'quiz': {
            'questions': [
                {
                    'id': 1,
                    'question': 'What does a green (bullish) candle indicate?',
                    'options': ['Price went down', 'Price went up', 'Price stayed same', 'Market closed'],
                    'correct': 1
                }
            ]
        },
        'xp_reward': 50,
        'order': lesson_id
    }
    return jsonify(lesson), 200


@app.route('/api/v1/<tenant>/academy/me/badges', methods=['GET'])
@app.route('/v1/<tenant>/academy/me/badges', methods=['GET'])
@token_required
def get_academy_badges(tenant):
    """Get user's earned badges."""
    badges = [
        {'id': 1, 'badge_type': 'first_lesson', 'badge_name': 'First Steps', 'badge_icon': '🎯', 'earned_at': '2024-01-15T10:30:00'},
        {'id': 2, 'badge_type': 'course_complete', 'badge_name': 'Course Graduate', 'badge_icon': '🎓', 'earned_at': '2024-01-20T14:45:00'},
        {'id': 3, 'badge_type': 'streak_7', 'badge_name': 'Week Warrior', 'badge_icon': '🔥', 'earned_at': '2024-01-22T09:00:00'}
    ]
    return jsonify(badges), 200


# ============================================
# News Routes - Yahoo Finance & Moroccan Data
# ============================================

# Cache for news data (avoid hitting APIs too frequently)
NEWS_CACHE = {
    'data': None,
    'timestamp': 0
}
NEWS_CACHE_DURATION = 300  # 5 minutes

def get_yfinance_news():
    """Fetch news from Yahoo Finance RSS feeds (lightweight, no heavy dependencies)."""
    import requests as req
    from bs4 import BeautifulSoup
    import hashlib
    
    all_news = []
    
    # Yahoo Finance RSS feeds for financial news
    rss_feeds = [
        {'url': 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', 'impact': 'High'},
        {'url': 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^DJI&region=US&lang=en-US', 'impact': 'High'},
        {'url': 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US', 'impact': 'High'},
        {'url': 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US', 'impact': 'Medium'},
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for feed in rss_feeds:
        try:
            response = req.get(feed['url'], headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'lxml-xml')
                items = soup.find_all('item')[:3]  # Get top 3 per feed
                
                for item in items:
                    title = item.find('title')
                    link = item.find('link')
                    pub_date = item.find('pubDate')
                    
                    if title:
                        title_text = title.get_text(strip=True)
                        news_id = hashlib.md5(title_text.encode()).hexdigest()[:8]
                        
                        all_news.append({
                            'id': news_id,
                            'title': title_text,
                            'source': 'Yahoo Finance',
                            'link': link.get_text(strip=True) if link else '',
                            'time': parse_rss_date(pub_date.get_text(strip=True) if pub_date else ''),
                            'impact': feed['impact'],
                            'category': 'international',
                            'thumbnail': ''
                        })
        except Exception as e:
            print(f"[NEWS] Error fetching RSS feed: {e}")
            continue
    
    # If RSS fails, return fallback international news
    if not all_news:
        all_news = get_fallback_international_news()
    
    return all_news[:10]


def parse_rss_date(date_str):
    """Parse RSS date to relative time."""
    from datetime import datetime
    try:
        # RSS date format: "Tue, 07 Jan 2025 15:30:00 +0000"
        dt = datetime.strptime(date_str[:25], '%a, %d %b %Y %H:%M:%S')
        now = datetime.now()
        diff = now - dt
        
        if diff.days > 0:
            return f'{diff.days}j'
        hours = diff.seconds // 3600
        if hours > 0:
            return f'{hours}h'
        minutes = diff.seconds // 60
        return f'{minutes}m' if minutes > 0 else 'Now'
    except:
        return 'Récent'


def get_fallback_international_news():
    """Fallback international news when RSS fails."""
    return [
        {'id': 'int-1', 'title': 'S&P 500 opens higher as investors digest economic data', 'source': 'Yahoo Finance', 'time': '1h', 'impact': 'High', 'category': 'international', 'link': '', 'thumbnail': ''},
        {'id': 'int-2', 'title': 'Bitcoin holds steady above $90,000 amid institutional interest', 'source': 'Yahoo Finance', 'time': '2h', 'impact': 'High', 'category': 'international', 'link': '', 'thumbnail': ''},
        {'id': 'int-3', 'title': 'Gold prices edge up on safe-haven demand', 'source': 'Yahoo Finance', 'time': '3h', 'impact': 'Medium', 'category': 'international', 'link': '', 'thumbnail': ''},
        {'id': 'int-4', 'title': 'EUR/USD unchanged ahead of Fed decision', 'source': 'Yahoo Finance', 'time': '4h', 'impact': 'Medium', 'category': 'international', 'link': '', 'thumbnail': ''},
        {'id': 'int-5', 'title': 'Tech stocks lead market gains in early trading', 'source': 'Yahoo Finance', 'time': '5h', 'impact': 'High', 'category': 'international', 'link': '', 'thumbnail': ''},
    ]


def get_moroccan_news():
    """Scrape news from Moroccan financial sources."""
    import requests as req
    from bs4 import BeautifulSoup
    
    moroccan_news = []
    
    # List of Moroccan financial news sources to scrape
    sources = [
        {
            'url': 'https://www.leboursier.ma/',
            'name': 'Le Boursier',
            'selector': 'article h2 a, .post-title a',
        },
        {
            'url': 'https://www.finances.gov.ma/fr/Pages/actualites.aspx',
            'name': 'Ministère des Finances',
            'selector': '.news-title a, .article-title',
        }
    ]
    
    for source in sources:
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = req.get(source['url'], headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'lxml')
                articles = soup.select(source['selector'])[:5]
                
                for i, article in enumerate(articles):
                    title = article.get_text(strip=True)
                    link = article.get('href', '')
                    if link and not link.startswith('http'):
                        link = source['url'].rstrip('/') + '/' + link.lstrip('/')
                    
                    if title and len(title) > 10:
                        moroccan_news.append({
                            'id': f"ma-{source['name']}-{i}",
                            'title': title[:150],
                            'source': source['name'],
                            'link': link,
                            'time': 'Récent',
                            'impact': 'Medium',
                            'category': 'maroc',
                            'thumbnail': ''
                        })
        except Exception as e:
            print(f"[NEWS] Error scraping {source['name']}: {e}")
            continue
    
    # Add fallback Moroccan news if scraping fails
    if not moroccan_news:
        moroccan_news = get_fallback_moroccan_news()
    
    return moroccan_news[:8]


def get_fallback_moroccan_news():
    """Fallback Moroccan financial news when scraping fails."""
    return [
        {'id': 'ma-1', 'title': 'Bourse de Casablanca: Le MASI termine en hausse de 0.45%', 'source': 'Le Boursier', 'time': '2h', 'impact': 'Medium', 'category': 'maroc', 'link': '', 'thumbnail': ''},
        {'id': 'ma-2', 'title': 'Bank Al-Maghrib maintient le taux directeur à 2.75%', 'source': 'BAM', 'time': '3h', 'impact': 'High', 'category': 'maroc', 'link': '', 'thumbnail': ''},
        {'id': 'ma-3', 'title': 'Maroc Telecom: Résultats annuels en progression de 5%', 'source': 'Le Boursier', 'time': '4h', 'impact': 'Medium', 'category': 'maroc', 'link': '', 'thumbnail': ''},
        {'id': 'ma-4', 'title': 'Attijariwafa Bank: Nouvelle émission obligataire', 'source': 'Finances Gov', 'time': '5h', 'impact': 'Medium', 'category': 'maroc', 'link': '', 'thumbnail': ''},
        {'id': 'ma-5', 'title': 'OCP: Investissements records dans la transformation verte', 'source': 'Le Boursier', 'time': '6h', 'impact': 'High', 'category': 'maroc', 'link': '', 'thumbnail': ''},
    ]


def format_news_time(timestamp):
    """Format Unix timestamp to relative time."""
    if not timestamp:
        return 'Unknown'
    
    from datetime import datetime
    try:
        now = datetime.now()
        news_time = datetime.fromtimestamp(timestamp)
        diff = now - news_time
        
        if diff.days > 0:
            return f'{diff.days}j'
        hours = diff.seconds // 3600
        if hours > 0:
            return f'{hours}h'
        minutes = diff.seconds // 60
        return f'{minutes}m'
    except:
        return 'Récent'


def generate_ai_market_summary(news_list):
    """Generate an AI-style market summary based on news."""
    import random
    
    # Analyze news for sentiment
    positive_keywords = ['hausse', 'gains', 'rally', 'surge', 'rise', 'higher', 'growth', 'profit', 'bullish']
    negative_keywords = ['baisse', 'chute', 'drop', 'fall', 'decline', 'loss', 'bearish', 'crash', 'down']
    
    positive_count = 0
    negative_count = 0
    
    for news in news_list:
        title_lower = news.get('title', '').lower()
        for keyword in positive_keywords:
            if keyword in title_lower:
                positive_count += 1
        for keyword in negative_keywords:
            if keyword in title_lower:
                negative_count += 1
    
    if positive_count > negative_count:
        sentiment = 'BULLISH'
    elif negative_count > positive_count:
        sentiment = 'BEARISH'
    else:
        sentiment = 'NEUTRAL'
    
    drivers = random.choice([
        "Données économiques positives & Earnings Tech solides",
        "Politiques monétaires accommodantes & Reprise économique",
        "Volatilité des marchés émergents & Tensions géopolitiques",
        "Optimisme sur l'IA & Croissance des investissements verts"
    ])
    
    return {
        'sentiment': sentiment,
        'drivers': drivers,
        'summary': f"Sentiment du marché: {sentiment}. Facteurs principaux: {drivers}. Surveillez les prochaines données sur l'emploi."
    }


def get_upcoming_events():
    """Get upcoming economic events."""
    from datetime import datetime, timedelta
    
    now = datetime.now()
    events = [
        {'id': 1, 'name': 'NFP Release (USA)', 'time': (now + timedelta(hours=2, minutes=45)).isoformat(), 'impact': 'High'},
        {'id': 2, 'name': 'CPI Inflation Data', 'time': (now + timedelta(hours=5)).isoformat(), 'impact': 'High'},
        {'id': 3, 'name': 'FOMC Minutes', 'time': (now + timedelta(hours=20)).isoformat(), 'impact': 'High'},
        {'id': 4, 'name': 'Bank Al-Maghrib Meeting', 'time': (now + timedelta(days=2)).isoformat(), 'impact': 'High'},
        {'id': 5, 'name': 'Morocco GDP Report', 'time': (now + timedelta(days=5)).isoformat(), 'impact': 'Medium'},
    ]
    return events


@app.route('/api/news/latest', methods=['GET'])
@app.route('/news/latest', methods=['GET'])
def get_latest_news():
    """Get latest financial news from yfinance and Moroccan sources."""
    import time
    
    now = time.time()
    
    # Check cache
    if NEWS_CACHE['data'] and (now - NEWS_CACHE['timestamp']) < NEWS_CACHE_DURATION:
        return jsonify(NEWS_CACHE['data'])
    
    try:
        # Fetch news from both sources
        yf_news = get_yfinance_news()
        ma_news = get_moroccan_news()
        
        # Combine and sort news
        all_news = yf_news + ma_news
        
        # Generate AI summary
        ai_summary = generate_ai_market_summary(all_news)
        
        # Get upcoming events
        events = get_upcoming_events()
        
        response_data = {
            'news': all_news,
            'moroccan_news': ma_news,
            'international_news': yf_news,
            'ai_summary': ai_summary,
            'events': events,
            'last_updated': datetime.now().isoformat()
        }
        
        # Update cache
        NEWS_CACHE['data'] = response_data
        NEWS_CACHE['timestamp'] = now
        
        return jsonify(response_data)
    except Exception as e:
        print(f"[NEWS ERROR] {str(e)}")
        # Return fallback data
        return jsonify({
            'news': get_fallback_moroccan_news(),
            'moroccan_news': get_fallback_moroccan_news(),
            'international_news': [],
            'ai_summary': {
                'sentiment': 'NEUTRAL',
                'drivers': 'Données en cours de chargement...',
                'summary': 'Analyse du marché en cours.'
            },
            'events': get_upcoming_events(),
            'last_updated': datetime.now().isoformat()
        })


# ============================================
# Error Handlers
# ============================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'error': 'Resource not found',
        'requested_path': request.path,
        'method': request.method
    }), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    print(f"[ERROR] Unhandled exception: {str(e)}")
    return jsonify({'error': str(e)}), 500


# ============================================
# Vercel Serverless Handler Export
# ============================================

# Ensure 'app' is properly exported for Vercel's Python runtime
# This must be at the module level and named exactly 'app'
app = app

# Development server
if __name__ == "__main__":
    app.run(debug=True, port=5000)
