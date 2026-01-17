import os
import uuid
import json
from werkzeug.utils import secure_filename
from models import db, Strategy

UPLOAD_FOLDER = os.path.join('static', 'uploads', 'strategies')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_strategy_screenshot(file_obj):
    if not file_obj or file_obj.filename == '':
        return None

    if allowed_file(file_obj.filename):
        filename = secure_filename(file_obj.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        
        path = os.path.join(os.getcwd(), UPLOAD_FOLDER)
        if not os.path.exists(path):
            os.makedirs(path)
            
        file_path = os.path.join(path, unique_filename)
        file_obj.save(file_path)
        
        return f"/static/uploads/strategies/{unique_filename}"
    return None

def create_strategy(user_id, symbol, description=None, config_json=None, screenshot_file=None, win_rate=None):
    """
    Creates a new trading strategy.
    
    Args:
        user_id: The ID of the user creating the strategy
        symbol: Trading symbol (e.g., 'BTC-USD', 'GOLD')
        description: Optional description of the strategy
        config_json: Optional JSON configuration for indicators
        screenshot_file: Optional chart screenshot file
        win_rate: Optional expected win rate percentage
    
    Returns:
        The created Strategy object
    """
    screenshot_url = None
    if screenshot_file:
        screenshot_url = save_strategy_screenshot(screenshot_file)
    
    # Parse config_json if it's a dict
    config_str = None
    if config_json:
        if isinstance(config_json, dict):
            config_str = json.dumps(config_json)
        else:
            config_str = config_json
    
    # Parse win_rate
    parsed_win_rate = 0.0
    if win_rate:
        try:
            parsed_win_rate = float(win_rate)
            parsed_win_rate = max(0, min(100, parsed_win_rate))  # Clamp between 0-100
        except (ValueError, TypeError):
            parsed_win_rate = 0.0
        
    new_strategy = Strategy(
        user_id=user_id,
        symbol=symbol.upper() if symbol else 'UNKNOWN',
        description=description,
        config_json=config_str,
        screenshot_url=screenshot_url,
        win_rate=parsed_win_rate,
        votes_count=0
    )
    
    db.session.add(new_strategy)
    db.session.commit()
    return new_strategy

def get_strategy_by_id(strategy_id):
    """Get a strategy by its ID."""
    return Strategy.query.get(strategy_id)

def get_user_strategies(user_id):
    """Get all strategies created by a user."""
    return Strategy.query.filter_by(user_id=user_id).order_by(Strategy.created_at.desc()).all()

def vote_for_strategy(strategy_id):
    """Increment the vote count for a strategy."""
    strategy = Strategy.query.get(strategy_id)
    if strategy:
        strategy.votes_count = (strategy.votes_count or 0) + 1
        db.session.commit()
        return True
    return False
