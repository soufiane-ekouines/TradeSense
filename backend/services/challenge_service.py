from models import db, Challenge, DailyMetric
from datetime import date

def check_risk_exposure(challenge_id):
    """
    Calculates the risk level of a challenge based on daily and total loss limits.
    Returns:
    {
        'danger_level': float (0-100),
        'status': 'NORMAL' | 'DANGER' | 'CRITICAL',
        'message': str,
        'metrics': {
            'daily_loss_pct': float,
            'total_loss_pct': float,
            'remaining_daily_distance': float,
            'remaining_total_distance': float
        }
    }
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.status != 'active':
        return {'status': 'INACTIVE', 'danger_level': 0}

    initial_balance = challenge.start_balance
    current_equity = challenge.equity
    
    # 1. Daily Loss Analysis
    today = date.today()
    daily_metric = DailyMetric.query.filter_by(challenge_id=challenge.id, date=today).first()
    
    if daily_metric:
        day_start = daily_metric.day_start_equity
    else:
        day_start = current_equity # Fallback if metric not initialized yet

    daily_max_loss_pct = 0.05 # 5%
    daily_limit = day_start * (1 - daily_max_loss_pct)
    current_daily_loss = day_start - current_equity
    daily_max_loss_amount = day_start * daily_max_loss_pct
    
    if daily_max_loss_amount > 0:
        daily_danger = (current_daily_loss / daily_max_loss_amount) * 100
    else:
        daily_danger = 0

    # 2. Total Loss Analysis (Drawdown)
    total_max_loss_pct = 0.10 # 10%
    total_limit = initial_balance * (1 - total_max_loss_pct)
    current_total_loss = initial_balance - current_equity
    total_max_loss_amount = initial_balance * total_max_loss_pct
    
    if total_max_loss_amount > 0:
        total_danger = (current_total_loss / total_max_loss_amount) * 100
    else:
        total_danger = 0

    # Overall Danger Level
    danger_level = max(0, min(100, max(daily_danger, total_danger)))
    
    status = 'NORMAL'
    message = ""
    
    if danger_level > 95:
        status = 'CRITICAL'
        message = "ALERTE : Seuil de perte critique ! Liquidation imminente."
    elif danger_level > 80:
        status = 'DANGER'
        message = "ALERTE : Seuil de perte journalière imminent"
        
    return {
        'challenge_id': challenge_id,
        'danger_level': round(danger_level, 2),
        'status': status,
        'message': message,
        'current_equity': current_equity,
        'limits': {
            'daily_limit': round(daily_limit, 2),
            'total_limit': round(total_limit, 2)
        }
    }
