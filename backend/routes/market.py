from flask import Blueprint, request, jsonify
from services.market import get_current_price, get_candle_history
from services.morocco_scraper import get_moroccan_stock_price
from services.price_cache import get_cached_price, get_all_cached_prices
from services.market_data_service import get_live_quote, get_live_candle, generate_mock_tick

market_bp = Blueprint('market', __name__)

@market_bp.route('/quote', methods=['GET'])
def quote():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify(error="Symbol required"), 400
    
    # Use live quote service (always returns dynamic data)
    quote_data = get_live_quote(symbol)
    
    return jsonify({
        'symbol': symbol,
        'price': quote_data['price'],
        'timestamp': quote_data['timestamp'],
        'change': quote_data.get('change', 0),
        'change_pct': quote_data.get('change_pct', 0),
        'source': quote_data['source']
    })

@market_bp.route('/tick', methods=['GET'])
def tick():
    """
    Real-time tick endpoint for chart updates.
    Returns current candle data with is_new flag.
    """
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify(error="Symbol required"), 400
    
    candle = get_live_candle(symbol)
    quote = get_live_quote(symbol)
    
    return jsonify({
        'symbol': symbol,
        'candle': candle,
        'price': quote['price'],
        'timestamp': quote['timestamp'],
        'source': quote['source']
    })

@market_bp.route('/series', methods=['GET'])
def series():
    symbol = request.args.get('symbol')
    # Default to 1 day history for MVP charts
    candles = get_candle_history(symbol)
    return jsonify(candles)

@market_bp.route('/prices', methods=['GET'])
def all_prices():
    """Get all cached prices for dashboard ticker."""
    prices = get_all_cached_prices()
    return jsonify(prices)
