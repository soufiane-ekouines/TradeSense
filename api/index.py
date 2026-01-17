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
        return None
    
    try:
        result = client.execute(query, args)
        return result.last_insert_rowid
    except Exception as e:
        print(f"[DB ERROR] Execute failed: {str(e)}")
        print(f"[DB ERROR] Query was: {query}")
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

@app.route('/api/v1/community/feed', methods=['GET'])
@app.route('/v1/community/feed', methods=['GET'])
def get_community_feed():
    """Get community feed posts."""
    posts = query_db(
        '''SELECT p.*, u.name as author_name, u.avatar_url as author_avatar
           FROM community_posts p
           JOIN users u ON p.user_id = u.id
           ORDER BY p.created_at DESC
           LIMIT 50'''
    )
    
    return jsonify({'posts': posts})


@app.route('/api/v1/community/posts', methods=['POST'])
@app.route('/v1/community/posts', methods=['POST'])
@token_required
def create_post():
    """Create a new community post."""
    data = request.get_json()
    content = data.get('content')
    media_type = data.get('media_type', 'TEXT')
    media_url = data.get('media_url')
    
    if not content:
        return jsonify({'error': 'Content is required'}), 400
    
    post_id = execute_db(
        '''INSERT INTO community_posts (user_id, content, media_type, media_url)
           VALUES (?, ?, ?, ?)''',
        (request.user_id, content, media_type, media_url)
    )
    
    return jsonify({'message': 'Post created', 'post_id': post_id}), 201


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
    import uuid
    from datetime import datetime, timedelta
    
    challenge_id = execute_db(
        '''INSERT INTO challenges (user_id, plan_id, status, start_balance, equity, max_drawdown, profit_target, end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            user_id,
            plan_id,
            'active',
            start_balance,
            start_balance,
            0.10,  # 10% max drawdown
            0.10,  # 10% profit target
            (datetime.utcnow() + timedelta(days=30)).isoformat()
        )
    )
    return challenge_id


@app.route('/api/checkout/crypto', methods=['POST'])
@app.route('/checkout/crypto', methods=['POST'])
@token_required
def pay_crypto():
    """Process crypto payment."""
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
            # If we can't get plan_id, query it directly
            plan_row = query_db('SELECT id FROM plans WHERE slug = ?', (plan_slug,), one=True)
            plan_id = plan_row.get('id') if plan_row else 1
        
        # Simulate crypto payment processing
        import uuid
        transaction_id = str(uuid.uuid4())
        
        # Create challenge for the user
        challenge_id = create_challenge_for_user(request.user_id, plan_id, start_balance)
        
        return jsonify({
            'success': True,
            'transaction_id': transaction_id,
            'challenge_id': challenge_id,
            'message': f'Crypto payment of ${amount} processed successfully',
            'wallet_address': '0x1234567890abcdef1234567890abcdef12345678',
            'amount_crypto': amount / 43000  # Approximate BTC conversion
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
# News Routes - Yahoo Finance & Moroccan Data
# ============================================

# Cache for news data (avoid hitting APIs too frequently)
NEWS_CACHE = {
    'data': None,
    'timestamp': 0
}
NEWS_CACHE_DURATION = 300  # 5 minutes

def get_yfinance_news():
    """Fetch news from Yahoo Finance for major tickers."""
    try:
        import yfinance as yf
        
        # Get news from major indices and stocks
        tickers = ['SPY', 'QQQ', 'GLD', 'BTC-USD', 'EUR=X']
        all_news = []
        
        for symbol in tickers:
            try:
                ticker = yf.Ticker(symbol)
                news = ticker.news[:3] if ticker.news else []  # Get top 3 news per ticker
                for item in news:
                    all_news.append({
                        'id': item.get('uuid', ''),
                        'title': item.get('title', ''),
                        'source': item.get('publisher', 'Yahoo Finance'),
                        'link': item.get('link', ''),
                        'time': format_news_time(item.get('providerPublishTime', 0)),
                        'impact': 'High' if symbol in ['SPY', 'QQQ', 'BTC-USD'] else 'Medium',
                        'category': 'international',
                        'thumbnail': item.get('thumbnail', {}).get('resolutions', [{}])[0].get('url', '')
                    })
            except Exception as e:
                print(f"[NEWS] Error fetching {symbol}: {e}")
                continue
        
        return all_news[:10]  # Return top 10 news
    except ImportError:
        print("[NEWS] yfinance not available")
        return []
    except Exception as e:
        print(f"[NEWS] Error fetching yfinance news: {e}")
        return []


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
