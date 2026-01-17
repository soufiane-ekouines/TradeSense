import random
from datetime import datetime, timedelta

def get_latest_news(limit=5):
    """
    Simulates fetching latest financial news.
    In a real app, this would call a News API (e.g., NewsAPI, Bloomberg, etc.)
    """
    mock_news = [
        {"id": 1, "title": "Fed indicates potential rate cuts in early 2026", "impact": "High", "time": "5m ago"},
        {"id": 2, "title": "Bitcoin reaches new all-time high amid institutional adoption", "impact": "High", "time": "12m ago"},
        {"id": 3, "title": "Global supply chain pressures ease as port congestion clears", "impact": "Medium", "time": "25m ago"},
        {"id": 4, "title": "Tech stocks rally following strong quarterly earnings reports", "impact": "Medium", "time": "45m ago"},
        {"id": 5, "title": "Oil prices stabilize after OPEC+ maintains production cuts", "impact": "Medium", "time": "1h ago"},
        {"id": 6, "title": "European markets open higher as inflation data surprises", "impact": "Low", "time": "2h ago"},
        {"id": 7, "title": "Gold remains steady as geopolitical tensions linger", "impact": "Low", "time": "3h ago"},
    ]
    return random.sample(mock_news, min(limit, len(mock_news)))

def generate_ai_summary():
    """
    Simulates an AI-generated market summary.
    """
    sentiment = random.choice(["BULLISH", "BEARISH", "NEUTRAL"])
    drivers = random.choice([
        "Strong Tech Earnings & Low Inflation data.",
        "Geopolitical Tensions & Energy Price Volatility.",
        "Central Bank Hawkishness & Weakening Consumer Spend.",
        "Positive Economic Outlook & Corporate Buybacks."
    ])
    
    return {
        "sentiment": sentiment,
        "drivers": drivers,
        "summary": f"Market Sentiment is currently {sentiment}. Primary drivers include {drivers} Investors are closely watching upcoming labor data."
    }

def get_upcoming_events():
    """
    Simulates fetching high-impact economic calendar events.
    """
    now = datetime.now()
    events = [
        {"id": 1, "name": "NFP Release", "time": (now + timedelta(hours=2, minutes=45)).isoformat(), "impact": "High"},
        {"id": 2, "name": "CPI Inflation Data", "time": (now + timedelta(hours=5)).isoformat(), "impact": "High"},
        {"id": 3, "name": "FOMC Meeting Minutes", "time": (now + timedelta(hours=20)).isoformat(), "impact": "High"},
    ]
    return events
