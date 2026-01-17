from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from models import db
from routes.auth import auth_bp
from routes.challenges import challenges_bp
from routes.market import market_bp
from routes.trades import trades_bp
from routes.leaderboard import leaderboard_bp
from routes.admin import admin_bp
from routes.news import news_bp
import os

def create_app():
    app = Flask(__name__, static_folder='static')
    app.config.from_object(Config)

    # Enable CORS for all routes including static files
    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/static/*": {"origins": "*"}
    })

    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(challenges_bp, url_prefix='/api/challenges')
    app.register_blueprint(market_bp, url_prefix='/api/market')
    app.register_blueprint(trades_bp, url_prefix='/api/trades')
    app.register_blueprint(leaderboard_bp, url_prefix='/api/leaderboard')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(news_bp, url_prefix='/api/news')
    
    from routes.strategy import strategy_bp
    app.register_blueprint(strategy_bp, url_prefix='/api/strategy')
    
    from routes.checkout import checkout_bp
    app.register_blueprint(checkout_bp, url_prefix='/api/checkout')

    from routes.community import community_bp
    app.register_blueprint(community_bp, url_prefix='/api/v1')

    from routes.academy import academy_bp
    app.register_blueprint(academy_bp, url_prefix='/api/v1')

    # Serve static files (for uploaded images, voice messages, etc.)
    @app.route('/static/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(os.path.join(app.root_path, 'static', 'uploads'), filename)

    # Global Error Handler
    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Resource not found"), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify(error="Internal server error"), 500

    # Create tables if using SQLite (dev)
    with app.app_context():
        db.create_all()
        # Seed initial data for community
        seed_initial_data()
    
    # Initialize background price scheduler for <5ms price lookups
    from services.price_cache import start_price_scheduler
    start_price_scheduler(app)
    print("✅ Price cache scheduler started!")

    return app

def seed_initial_data():
    """Seeds initial data for the community page if not present."""
    from models import User, Strategy, CommunityPost, Plan
    import json
    
    # Seed Plans if not present
    if not Plan.query.first():
        plans = [
            Plan(
                slug='starter',
                price_dh=200,
                features_json=json.dumps({
                    'start_balance': 10000,
                    'profit_target': 10,
                    'max_drawdown': 10,
                    'min_trading_days': 5
                })
            ),
            Plan(
                slug='pro',
                price_dh=500,
                features_json=json.dumps({
                    'start_balance': 50000,
                    'profit_target': 10,
                    'max_drawdown': 10,
                    'min_trading_days': 10
                })
            ),
            Plan(
                slug='elite',
                price_dh=1000,
                features_json=json.dumps({
                    'start_balance': 100000,
                    'profit_target': 10,
                    'max_drawdown': 5,
                    'min_trading_days': 10
                })
            )
        ]
        for p in plans:
            db.session.add(p)
        db.session.commit()
        print("✅ Plans seeded successfully!")
    
    # Check if we already have data
    if Strategy.query.first() is not None:
        return
    
    # Find or create a demo user
    demo_user = User.query.filter_by(email='demo@tradesense.com').first()
    if not demo_user:
        from werkzeug.security import generate_password_hash
        demo_user = User(
            name='TradeSense Bot',
            email='demo@tradesense.com',
            password_hash=generate_password_hash('demo123'),
            role='admin',
            avatar_url='https://api.dicebear.com/7.x/bottts/svg?seed=TradeSense'
        )
        db.session.add(demo_user)
        db.session.commit()
    
    # Create sample strategies
    sample_strategies = [
        {
            'symbol': 'GOLD',
            'description': 'Scalping strategy using EMA crossovers on 15m timeframe with RSI confirmation.',
            'win_rate': 72.5,
            'votes_count': 45
        },
        {
            'symbol': 'BTC-USD',
            'description': 'Trend following strategy using MACD and Bollinger Bands on 4H chart.',
            'win_rate': 68.0,
            'votes_count': 38
        },
        {
            'symbol': 'EUR-USD',
            'description': 'Range trading strategy with support/resistance levels and volume analysis.',
            'win_rate': 65.5,
            'votes_count': 29
        },
        {
            'symbol': 'IAM',
            'description': 'Morocco Telecom swing trading based on weekly price action patterns.',
            'win_rate': 71.0,
            'votes_count': 22
        },
        {
            'symbol': 'ETH-USD',
            'description': 'Momentum breakout strategy with volume confirmation on 1H timeframe.',
            'win_rate': 63.0,
            'votes_count': 18
        }
    ]
    
    for strat_data in sample_strategies:
        strategy = Strategy(
            user_id=demo_user.id,
            symbol=strat_data['symbol'],
            description=strat_data['description'],
            win_rate=strat_data['win_rate'],
            votes_count=strat_data['votes_count']
        )
        db.session.add(strategy)
        
        # Create a community post for this strategy
        post = CommunityPost(
            tenant_id='default',
            user_id=demo_user.id,
            content=f"🚀 New {strat_data['symbol']} strategy shared! Check out my setup.",
            media_type='STRATEGY',
            strategy_id=None  # Will be set after commit
        )
        db.session.add(post)
    
    db.session.commit()
    
    # Link strategies to posts
    strategies = Strategy.query.filter_by(user_id=demo_user.id).all()
    posts = CommunityPost.query.filter_by(user_id=demo_user.id, media_type='STRATEGY').all()
    
    for i, (strategy, post) in enumerate(zip(strategies, posts)):
        post.strategy_id = strategy.id
    
    # Add some text posts
    text_posts = [
        "📊 Market looking bullish today! Gold breaking resistance at 2050.",
        "💡 Pro tip: Always set your stop loss before entering a trade.",
        "🔥 Just hit my profit target on BTC! What a day!",
        "📈 IAM showing strong momentum on BVC. Worth watching!",
        "⚠️ High volatility expected with upcoming Fed announcement."
    ]
    
    for content in text_posts:
        post = CommunityPost(
            tenant_id='default',
            user_id=demo_user.id,
            content=content,
            media_type='TEXT',
            likes_count=int(hash(content) % 50)
        )
        db.session.add(post)
    
    db.session.commit()
    print("✅ Community seed data created successfully!")
    
    # Seed Academy data
    from services.academy_service import seed_academy_data
    result = seed_academy_data()
    print(f"✅ Academy: {result}")

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
