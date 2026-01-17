from flask import Blueprint, request, jsonify
from services.market import get_candle_history
from services.strategy_engine import SignalAggregator
import pandas as pd
import random

strategy_bp = Blueprint('strategy', __name__)
aggregator = SignalAggregator()

@strategy_bp.route('/consensus', methods=['GET'])
def get_consensus():
    symbol = request.args.get('symbol', 'BTC-USD')
    
    # Fetch ample history for Technical Analysis (e.g. 200 SMA needs >200 points)
    # We'll ask for '5d' at '15m' interval or similar to get enough granularity and length
    # Or just rely on what get_candle_history provides if configurable
    try:
        # market.py get_candle_history signature: (symbol, period='1d', interval='1m')
        # Let's request 1 month of 1h data to be safe for 200 EMA
        candles = get_candle_history(symbol, period='1mo', interval='1h')
        
        if not candles:
            return jsonify({'error': 'Insufficient market data'}), 404

        # Convert to DataFrame
        df = pd.DataFrame(candles)
        
        # Renaissance keys to match StrategyEngine expectation (Capitalized)
        # market.py returns: time, open, high, low, close
        rename_map = {
            'open': 'Open',
            'high': 'High',
            'low': 'Low',
            'close': 'Close',
            'time': 'Date'
        }
        df.rename(columns=rename_map, inplace=True)
        
        # Mock News Sentiment (Range -1.0 to 1.0)
        # In a real app, this would come from a NewsService
        sentiment = random.uniform(-0.6, 0.6) 
        
        # Generate Consensus
        analysis = aggregator.generate_consensus(df, news_sentiment=sentiment)
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"Strategy Error: {e}")
        return jsonify({'error': str(e)}), 500
