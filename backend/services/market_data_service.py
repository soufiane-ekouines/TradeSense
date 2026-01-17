"""
Market Data Service with Live/Mock Switch
Ensures chart always has dynamic data, even when markets are closed.
"""

import time
import random
from datetime import datetime, timedelta
import pytz

# Store last known prices for random walk simulation
_last_prices = {}
_last_candles = {}

# Market hours (US Eastern Time for stocks, 24/7 for crypto)
MARKET_HOURS = {
    'stocks': {'open': 9, 'close': 16, 'tz': 'America/New_York'},
    'crypto': {'open': 0, 'close': 24, 'tz': 'UTC'}  # 24/7
}

CRYPTO_SYMBOLS = ['BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD']
MOROCCAN_SYMBOLS = ['IAM', 'ATW', 'BCP']

# Base prices for mock data
BASE_PRICES = {
    'BTC-USD': 45000,
    'ETH-USD': 2500,
    'AAPL': 185,
    'TSLA': 250,
    'GOLD': 2050,
    'IAM': 130,
    'ATW': 480,
    'BCP': 290,
}


def is_market_open(symbol: str) -> bool:
    """Check if the market is currently open for this symbol."""
    if symbol in CRYPTO_SYMBOLS:
        return True  # Crypto is 24/7
    
    # Check US stock market hours
    try:
        et = pytz.timezone('America/New_York')
        now = datetime.now(et)
        
        # Weekend check
        if now.weekday() >= 5:  # Saturday or Sunday
            return False
        
        # Market hours: 9:30 AM - 4:00 PM ET
        market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
        
        return market_open <= now <= market_close
    except:
        return False


def generate_mock_tick(symbol: str, last_price: float = None) -> dict:
    """
    Generate a realistic mock price tick using random walk.
    Guarantees price movement for testing/demo purposes.
    
    Returns:
        {
            'price': float,
            'timestamp': int (milliseconds),
            'change': float,
            'change_pct': float,
            'source': 'mock'
        }
    """
    global _last_prices
    
    # Get or initialize last price
    if last_price is None:
        last_price = _last_prices.get(symbol, BASE_PRICES.get(symbol, 100))
    
    # Random walk with momentum bias
    # Volatility varies by asset type
    if symbol in CRYPTO_SYMBOLS:
        volatility = 0.001  # 0.1% per tick for crypto
    else:
        volatility = 0.0005  # 0.05% per tick for stocks
    
    # Generate change with slight mean reversion
    base = BASE_PRICES.get(symbol, last_price)
    mean_reversion = (base - last_price) / base * 0.01  # Pull toward base
    random_change = random.uniform(-volatility, volatility)
    
    change_pct = random_change + mean_reversion
    change = last_price * change_pct
    new_price = round(last_price + change, 2)
    
    # Store for next tick
    _last_prices[symbol] = new_price
    
    return {
        'price': new_price,
        'timestamp': int(time.time() * 1000),  # Milliseconds
        'change': round(change, 4),
        'change_pct': round(change_pct * 100, 4),
        'source': 'mock'
    }


def generate_mock_candle(symbol: str, interval_seconds: int = 60) -> dict:
    """
    Generate or update a mock candle for the current interval.
    
    Returns:
        {
            'time': int (unix seconds),
            'open': float,
            'high': float,
            'low': float,
            'close': float,
            'is_new': bool
        }
    """
    global _last_candles
    
    current_time = int(time.time())
    candle_time = (current_time // interval_seconds) * interval_seconds
    
    # Get current tick
    tick = generate_mock_tick(symbol)
    current_price = tick['price']
    
    # Check if we need a new candle or update existing
    candle_key = f"{symbol}_{candle_time}"
    
    if candle_key in _last_candles:
        # Update existing candle
        candle = _last_candles[candle_key]
        candle['high'] = max(candle['high'], current_price)
        candle['low'] = min(candle['low'], current_price)
        candle['close'] = current_price
        candle['is_new'] = False
    else:
        # Create new candle
        last_close = _last_prices.get(symbol, BASE_PRICES.get(symbol, 100))
        candle = {
            'time': candle_time,
            'open': last_close,
            'high': max(last_close, current_price),
            'low': min(last_close, current_price),
            'close': current_price,
            'is_new': True
        }
        _last_candles[candle_key] = candle
        
        # Cleanup old candles (keep last 10)
        keys_to_remove = []
        for key in _last_candles:
            if key.startswith(symbol) and key != candle_key:
                keys_to_remove.append(key)
        for key in sorted(keys_to_remove)[:-10]:
            _last_candles.pop(key, None)
    
    return candle


def get_live_quote(symbol: str) -> dict:
    """
    Get a live quote with guaranteed movement.
    Uses real data if market open, mock data otherwise.
    """
    from services.price_cache import get_cached_price
    
    # Try to get cached real price first
    cached = get_cached_price(symbol)
    
    if cached['source'] == 'cache' and cached['age_ms'] < 5000:
        # Real data available and fresh
        price = cached['price']
        
        # Add small mock variation if price seems stale
        if symbol in _last_prices and abs(price - _last_prices[symbol]) < 0.001:
            tick = generate_mock_tick(symbol, price)
            return tick
        
        _last_prices[symbol] = price
        return {
            'price': price,
            'timestamp': int(time.time() * 1000),
            'change': 0,
            'change_pct': 0,
            'source': 'live'
        }
    
    # Market closed or no data - use mock
    return generate_mock_tick(symbol)


def get_live_candle(symbol: str) -> dict:
    """
    Get the current live candle for chart updates.
    """
    from services.price_cache import get_cached_price
    
    current_time = int(time.time())
    candle_time = (current_time // 60) * 60  # 1-minute candles
    
    # Get current price
    cached = get_cached_price(symbol)
    if cached['source'] == 'cache':
        current_price = cached['price']
        _last_prices[symbol] = current_price
    else:
        tick = generate_mock_tick(symbol)
        current_price = tick['price']
    
    # Generate/update candle
    candle_key = f"{symbol}_{candle_time}"
    
    if candle_key in _last_candles:
        candle = _last_candles[candle_key]
        candle['high'] = max(candle['high'], current_price)
        candle['low'] = min(candle['low'], current_price)
        candle['close'] = current_price
        candle['is_new'] = False
    else:
        last_close = _last_prices.get(symbol, BASE_PRICES.get(symbol, 100))
        candle = {
            'time': candle_time,
            'open': last_close,
            'high': max(last_close, current_price),
            'low': min(last_close, current_price),
            'close': current_price,
            'is_new': True
        }
        _last_candles[candle_key] = candle
    
    return {
        'time': candle['time'],
        'open': round(candle['open'], 2),
        'high': round(candle['high'], 2),
        'low': round(candle['low'], 2),
        'close': round(candle['close'], 2),
        'is_new': candle['is_new']
    }
