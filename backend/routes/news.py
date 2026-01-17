from flask import Blueprint, jsonify
from services.news_service import get_latest_news, generate_ai_summary, get_upcoming_events

news_bp = Blueprint('news', __name__)

@news_bp.route('/latest', methods=['GET'])
def latest_news():
    return jsonify({
        "news": get_latest_news(10),
        "ai_summary": generate_ai_summary(),
        "events": get_upcoming_events()
    })
