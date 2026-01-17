import pandas as pd
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Dict

class SignalResult:
    def __init__(self, direction: str, strength: float, reasoning: str):
        self.direction = direction  # 'BUY', 'SELL', 'NEUTRAL'
        self.strength = strength    # 0-100
        self.reasoning = reasoning

    def to_dict(self):
        return {
            'direction': self.direction,
            'strength': self.strength,
            'reasoning': self.reasoning
        }

class IStrategy(ABC):
    @abstractmethod
    def analyze(self, df: pd.DataFrame, news_sentiment: float = 0.0) -> SignalResult:
        pass

class TrendFollowerStrategy(IStrategy):
    """
    Uses EMA 50/200 and MACD to identify trend.
    """
    def analyze(self, df: pd.DataFrame, news_sentiment: float = 0.0) -> SignalResult:
        if df.empty or len(df) < 200:
            return SignalResult('NEUTRAL', 0, "Insufficient data for Trend Analysis")

        closes = df['Close']
        
        # EMA
        ema_50 = closes.ewm(span=50, adjust=False).mean().iloc[-1]
        ema_200 = closes.ewm(span=200, adjust=False).mean().iloc[-1]
        
        # MACD
        exp12 = closes.ewm(span=12, adjust=False).mean()
        exp26 = closes.ewm(span=26, adjust=False).mean()
        macd_line = exp12 - exp26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        
        current_macd = macd_line.iloc[-1]
        current_signal = signal_line.iloc[-1]
        
        # Logic
        direction = 'NEUTRAL'
        strength = 0
        reasons = []

        # Golden Cross / Death Cross logic proxy via price relation to EMAs
        price = closes.iloc[-1]
        
        if price > ema_50 > ema_200:
            direction = 'BUY'
            strength += 40
            reasons.append("Price > EMA 50 > EMA 200 (Bullish Trend)")
        elif price < ema_50 < ema_200:
            direction = 'SELL'
            strength += 40
            reasons.append("Price < EMA 50 < EMA 200 (Bearish Trend)")
            
        # MACD Confirmation
        if current_macd > current_signal:
            if direction == 'BUY':
                strength += 30
                reasons.append("MACD Bullish Crossover")
            elif direction == 'NEUTRAL':
                 # Weak buy signal
                 direction = 'BUY'
                 strength = 20
                 reasons.append("MACD Bullish Crossover")
        elif current_macd < current_signal:
            if direction == 'SELL':
                strength += 30
                reasons.append("MACD Bearish Crossover")
            elif direction == 'NEUTRAL':
                direction = 'SELL'
                strength = 20
                reasons.append("MACD Bearish Crossover")

        final_reason = "; ".join(reasons) if reasons else "No strong trend detected"
        return SignalResult(direction, min(strength, 100), final_reason)

class MeanReversionStrategy(IStrategy):
    """
    Uses RSI and Bollinger Bands to find overbought/oversold conditions.
    """
    def analyze(self, df: pd.DataFrame, news_sentiment: float = 0.0) -> SignalResult:
        if df.empty or len(df) < 20:
             return SignalResult('NEUTRAL', 0, "Insufficient data for Mean Reversion")
        
        closes = df['Close']
        
        # RSI 14
        delta = closes.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs)).iloc[-1]
        
        # Bollinger Bands 20, 2
        window = 20
        no_of_std = 2
        rolling_mean = closes.rolling(window).mean()
        rolling_std = closes.rolling(window).std()
        upper_band = (rolling_mean + (rolling_std * no_of_std)).iloc[-1]
        lower_band = (rolling_mean - (rolling_std * no_of_std)).iloc[-1]
        price = closes.iloc[-1]
        
        direction = 'NEUTRAL'
        strength = 0
        reasons = []
        
        # RSI Logic
        if rsi > 70:
            direction = 'SELL'
            strength += 40
            reasons.append(f"RSI Overbought ({rsi:.1f})")
        elif rsi < 30:
            direction = 'BUY'
            strength += 40
            reasons.append(f"RSI Oversold ({rsi:.1f})")
            
        # BB Logic
        if price > upper_band:
            if direction == 'SELL':
                strength += 40
                reasons.append("Price > Upper Bollinger Band")
            elif direction == 'NEUTRAL': # Potential reversal
                direction = 'SELL'
                strength = 20
                reasons.append("Price piercing Upper Band")
        elif price < lower_band:
            if direction == 'BUY':
                strength += 40
                reasons.append("Price < Lower Bollinger Band")
            elif direction == 'NEUTRAL':
                direction = 'BUY'
                strength = 20
                reasons.append("Price piercing Lower Band")
                
        final_reason = "; ".join(reasons) if reasons else "Price within normal range"
        return SignalResult(direction, min(strength, 100), final_reason)

class NewsSentimentStrategy(IStrategy):
    """
    Uses external sentiment score (mocked/provided) to bias the signal.
    """
    def analyze(self, df: pd.DataFrame, news_sentiment: float = 0.0) -> SignalResult:
        # Sentiment range is typically -1.0 to 1.0 (or similar)
        # Let's assume input is -1 to 1 type score.
        
        direction = 'NEUTRAL'
        strength = 0
        reason = "Neutral News Sentiment"
        
        if news_sentiment > 0.2:
            direction = 'BUY'
            strength = int(news_sentiment * 100) # 0.5 -> 50 strength
            reason = "Positive News Sentiment"
        elif news_sentiment < -0.2:
            direction = 'SELL'
            strength = int(abs(news_sentiment) * 100)
            reason = "Negative News Sentiment"
            
        return SignalResult(direction, min(strength, 100), reason)

class SignalAggregator:
    def __init__(self):
        self.strategies = {
            'Trend': TrendFollowerStrategy(),
            'MeanReversion': MeanReversionStrategy(),
            'News': NewsSentimentStrategy()
        }
        self.weights = {
            'Trend': 0.4,
            'MeanReversion': 0.3,
            'News': 0.3
        }
        
    def generate_consensus(self, df: pd.DataFrame, news_sentiment: float = 0.0) -> Dict:
        signals = {}
        weighted_score = 0 # -100 to 100 range proxy
        
        total_strength = 0
        
        for name, strategy in self.strategies.items():
            result = strategy.analyze(df, news_sentiment)
            signals[name] = result.to_dict()
            
            # Convert direction/strength to scalar score (-100 to 100)
            score = result.strength
            if result.direction == 'SELL':
                score = -score
            elif result.direction == 'NEUTRAL':
                score = 0
                
            weighted_score += score * self.weights[name]
            
        # Determine Final Consensus
        final_direction = 'NEUTRAL'
        final_confidence = abs(weighted_score)
        
        if weighted_score > 15:
            final_direction = 'BUY'
        elif weighted_score < -15:
            final_direction = 'SELL'
            
        # Calculate Trade Setup Levels
        current_price = df['Close'].iloc[-1] if not df.empty else 0
        atr_proxy = (df['High'] - df['Low']).rolling(14).mean().iloc[-1] if not df.empty else (current_price * 0.01)
        
        stop_loss = 0
        take_profit = 0
        
        if final_direction == 'BUY':
            stop_loss = current_price - (1.5 * atr_proxy)
            take_profit = current_price + (3.0 * atr_proxy) # 1:2 R:R
        elif final_direction == 'SELL':
            stop_loss = current_price + (1.5 * atr_proxy)
            take_profit = current_price - (3.0 * atr_proxy)
            
        return {
            'consensus': {
                'action': final_direction,
                'confidence': round(final_confidence, 2),
                'score': round(weighted_score, 2)
            },
            'setup': {
                'entry_price': round(current_price, 2),
                'stop_loss': round(stop_loss, 2),
                'take_profit': round(take_profit, 2)
            },
            'strategies': signals
        }
