from flask import Blueprint, request, jsonify, g
from models import db, Trade, Challenge, DailyMetric
from services.rules import evaluate_challenge
from services.market import get_current_price
from services.morocco_scraper import get_moroccan_stock_price
from services.price_cache import get_cached_price
from services.equity_service import calculate_equity, update_challenge_equity
from services.watchdog_service import execute_watchdog, get_watchdog_status
from utils import token_required
from datetime import date, datetime
from services.challenge_service import check_risk_exposure

trades_bp = Blueprint('trades', __name__)

@trades_bp.route('', methods=['POST'])
@token_required
def place_trade():
    """
    Execute a trade with optimized flow:
    1. Validate Challenge Status
    2. PRE-TRADE Watchdog Check (prevent trading if violation imminent)
    3. Get Price from Cache (<5ms)
    4. Save Trade
    5. POST-TRADE Watchdog Check (auto-fail if limits breached)
    6. Return fresh equity data
    """
    data = request.get_json()
    challenge_id = data.get('challenge_id')
    symbol = data.get('symbol')
    side = data.get('side')  # buy/sell
    qty = float(data.get('qty', 0))
    
    print(f"DEBUG: Placing trade for Challenge {challenge_id}, User {g.user_id}, Symbol {symbol}, Qty {qty}")

    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        print("DEBUG: Challenge not found in DB")
        return jsonify(error="Challenge not found"), 404
        
    if challenge.user_id != g.user_id:
        print(f"DEBUG: Unauthorized challenge access. Owner: {challenge.user_id}, Requestor: {g.user_id}")
        return jsonify(error="Challenge not found"), 404

    # ==================== ACCOUNT STATUS VALIDATION ====================
    # Block trading if account is FAILED (403 Forbidden)
    if challenge.status == 'failed':
        print(f"DEBUG: Trade blocked - Challenge {challenge_id} is FAILED")
        return jsonify(
            error="Trading blocked: Account has FAILED",
            status="failed",
            reason="Account exceeded risk limits and is permanently locked"
        ), 403
    
    # Allow trading on PASSED accounts but log it
    if challenge.status == 'passed':
        print(f"DEBUG: Trade allowed on PASSED challenge {challenge_id}")
    
    if challenge.status != 'active' and challenge.status != 'passed':
        print(f"DEBUG: Challenge status is {challenge.status}")
        return jsonify(error="Challenge is not active"), 400
    # ===================================================================

    # PRE-TRADE Watchdog: Block trade if already in violation
    pre_watchdog = get_watchdog_status(challenge_id)
    if not pre_watchdog['can_trade']:
        return jsonify(
            error="Trading blocked: Account in violation",
            watchdog=pre_watchdog
        ), 403

    # PRICE LOGIC: Prefer frontend live chart price (real-time), fallback to cache
    # The frontend sends the current price from the chart header (updates every 1s)
    price = None
    frontend_price = data.get('current_price')
    
    # Step 1: Use frontend price if valid (this is the live chart price)
    if frontend_price and float(frontend_price) > 0:
        price = float(frontend_price)
        print(f"DEBUG: Using live chart price for {symbol}: {price}")
    else:
        # Step 2: Fallback to cached price
        cached = get_cached_price(symbol)
        if cached['source'] != 'missing' and cached['price'] and cached['price'] > 0:
            price = cached['price']
            print(f"DEBUG: Using cached price for {symbol}: {price}")
        else:
            # Step 3: Last resort - direct API call
            if symbol in ['IAM', 'ATW', 'BCP']:
                price = get_moroccan_stock_price(symbol)
            else:
                price = get_current_price(symbol)
            print(f"DEBUG: Fetched API price for {symbol}: {price}")
    
    # SAFETY: Reject trade if price is invalid (0, None, or negative)
    if not price or price <= 0:
        print(f"ERROR: Invalid price {price} for {symbol}, rejecting trade")
        return jsonify(error="Market data unavailable - cannot execute trade with invalid price"), 503
    
    # Ensure price is a float
    price = float(price)
    print(f"DEBUG: Final execution price for {symbol}: {price}")

    # Calculate commission
    commission = qty * price * 0.001  # 0.1% spread
    
    # Execute Trade
    new_trade = Trade(
        challenge_id=challenge_id,
        symbol=symbol,
        side=side,
        qty=qty,
        price=price
    )
    db.session.add(new_trade)
    db.session.commit()
    
    # POST-TRADE Watchdog: Check status (warnings only, no auto-fail)
    watchdog_result = get_watchdog_status(challenge_id)
    
    # Calculate fresh equity
    equity_data = calculate_equity(challenge_id)
    
    # Update stored equity for dashboard
    if equity_data:
        update_challenge_equity(challenge_id)
    
    # Refresh challenge status
    challenge = Challenge.query.get(challenge_id)
    
    return jsonify({
        'message': 'Trade executed',
        'trade': {
            'id': new_trade.id,
            'symbol': new_trade.symbol,
            'side': new_trade.side,
            'qty': new_trade.qty,
            'price': new_trade.price,
            'time': new_trade.executed_at.isoformat()
        },
        'commission': commission,
        'equity': equity_data,
        'new_equity': equity_data['equity'] if equity_data else challenge.equity,
        'status': challenge.status,
        'watchdog': watchdog_result
    }), 201

@trades_bp.route('', methods=['GET'])
@token_required
def get_trades():
    challenge_id = request.args.get('challenge_id')
    trades = Trade.query.filter_by(challenge_id=challenge_id).order_by(Trade.executed_at.desc()).all()
    return jsonify([{
        'id': t.id,
        'symbol': t.symbol,
        'side': t.side,
        'qty': t.qty,
        'price': t.price,
        'time': t.executed_at
    } for t in trades])


@trades_bp.route('/validate-account', methods=['POST'])
@token_required
def validate_account_status():
    """
    Real-time account status validator.
    Checks all prop firm rules and returns current status.
    Includes unrealized PnL for accurate live equity calculation.
    
    Called on:
    - Every price update (throttled to 1s)
    - Before every trade
    - On dashboard load
    
    Returns:
        {
            'status': 'active' | 'failed' | 'passed',
            'can_trade': bool,
            'is_locked': bool,
            'metrics': { equity, drawdown, daily_loss, profit_progress },
            'fail_reason': str | None
        }
    """
    from services.watchdog_service import execute_watchdog, check_account_health
    
    data = request.get_json()
    challenge_id = data.get('challenge_id')
    live_prices = data.get('live_prices', {})  # Frontend sends current chart prices
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        return jsonify(error="Challenge not found"), 404
    
    if challenge.user_id != g.user_id:
        return jsonify(error="Unauthorized"), 403
    
    # If already failed or passed, return immediately
    if challenge.status == 'failed':
        return jsonify({
            'status': 'failed',
            'can_trade': False,
            'is_locked': True,
            'fail_reason': 'Account exceeded risk limits',
            'metrics': {
                'initial_balance': challenge.start_balance,
                'current_equity': challenge.equity
            }
        })
    
    if challenge.status == 'passed':
        return jsonify({
            'status': 'passed',
            'can_trade': True,  # Allow continued trading after passing
            'is_locked': False,
            'metrics': {
                'initial_balance': challenge.start_balance,
                'current_equity': challenge.equity
            }
        })
    
    # Execute full watchdog check (this will update status if needed)
    watchdog_result = execute_watchdog(challenge_id)
    
    # Refresh challenge after potential status change
    challenge = Challenge.query.get(challenge_id)
    
    return jsonify({
        'status': challenge.status,
        'can_trade': watchdog_result.get('status') not in ['failed'],
        'is_locked': challenge.status == 'failed',
        'fail_reason': watchdog_result.get('fail_reason'),
        'metrics': watchdog_result.get('health_check', {}).get('metrics', {}),
        'warnings': watchdog_result.get('health_check', {}).get('warnings', []),
        'violations': watchdog_result.get('health_check', {}).get('violations', [])
    })


@trades_bp.route('/close-all', methods=['POST'])
@token_required
def close_all_trades():
    """
    Panic Button: Liquidate all simulated positions for a challenge.
    Uses optimized price cache for instant closure.
    """
    data = request.get_json()
    challenge_id = data.get('challenge_id')
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.user_id != g.user_id:
        return jsonify(error="Challenge not found"), 404
        
    if challenge.status != 'active':
        return jsonify(error="Challenge is not active"), 400

    from services.equity_service import calculate_positions
    
    # Get current open positions
    positions = calculate_positions(challenge_id)
    closed_trades = []
    
    for symbol, pos in positions.items():
        if pos['side'] == 'flat':
            continue
        
        # Get cached price for instant execution
        cached = get_cached_price(symbol)
        current_price = cached['price']
        
        # Create closing trade (opposite side)
        close_side = 'sell' if pos['qty'] > 0 else 'buy'
        close_trade = Trade(
            challenge_id=challenge_id,
            symbol=symbol,
            side=close_side,
            qty=abs(pos['qty']),
            price=current_price
        )
        db.session.add(close_trade)
        closed_trades.append({
            'symbol': symbol,
            'side': close_side,
            'qty': abs(pos['qty']),
            'price': current_price,
            'pnl': pos['unrealized_pnl']
        })
    
    db.session.commit()
    
    # Calculate final equity
    equity_data = calculate_equity(challenge_id)
    update_challenge_equity(challenge_id)
    
    return jsonify({
        'message': 'PANIC: All positions liquidated. Risk mitigated.',
        'challenge_id': challenge.id,
        'closed_positions': len(closed_trades),
        'trades': closed_trades,
        'equity': equity_data
    }), 200

@trades_bp.route('/risk/<int:challenge_id>', methods=['GET'])
@token_required
def get_challenge_risk(challenge_id):
    """
    Get the risk sentinel status for a specific challenge.
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.user_id != g.user_id:
        return jsonify(error="Challenge not found"), 404
        
    risk_info = check_risk_exposure(challenge_id)
    return jsonify(risk_info), 200


@trades_bp.route('/equity/<int:challenge_id>', methods=['GET'])
@token_required
def get_realtime_equity(challenge_id):
    """
    Get real-time equity calculation using cached prices.
    Ultra-fast endpoint for dashboard polling.
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.user_id != g.user_id:
        return jsonify(error="Challenge not found"), 404
    
    equity_data = calculate_equity(challenge_id)
    if not equity_data:
        return jsonify(error="Could not calculate equity"), 500
    
    return jsonify(equity_data), 200


@trades_bp.route('/positions/<int:challenge_id>', methods=['GET'])
@token_required
def get_positions(challenge_id):
    """
    Get current open positions for a challenge.
    """
    from services.equity_service import calculate_positions
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.user_id != g.user_id:
        return jsonify(error="Challenge not found"), 404
    
    positions = calculate_positions(challenge_id)
    
    # Filter to only open positions
    open_positions = {
        symbol: pos for symbol, pos in positions.items() 
        if pos['side'] != 'flat'
    }
    
    return jsonify({
        'positions': open_positions,
        'count': len(open_positions)
    }), 200


@trades_bp.route('/watchdog/<int:challenge_id>', methods=['GET'])
@token_required
def get_watchdog(challenge_id):
    """
    Get current watchdog status for a challenge.
    Returns danger levels, warnings, and metrics.
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.user_id != g.user_id:
        return jsonify(error="Challenge not found"), 404
    
    watchdog_status = get_watchdog_status(challenge_id)
    return jsonify(watchdog_status), 200


@trades_bp.route('/watchdog/<int:challenge_id>/execute', methods=['POST'])
@token_required
def run_watchdog(challenge_id):
    """
    Manually trigger watchdog check.
    Will auto-fail challenge if rules are violated.
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.user_id != g.user_id:
        return jsonify(error="Challenge not found"), 404
    
    result = execute_watchdog(challenge_id)
    return jsonify(result), 200
