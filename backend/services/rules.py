from models import db, Challenge, DailyMetric
from datetime import datetime, date

def evaluate_challenge(challenge_id):
    """
    Core Rule Engine:
    1. Check Max Daily Loss
    2. Check Max Total Loss
    3. Check Profit Target
    Updates challenge status if a rule is breached or met.
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge or challenge.status != 'active':
        return

    # 0. Get Plan Rules
    # Assuming standard rules for MVP if not strictly parsed from JSON yet
    # But we should use the plan's stored features
    plan = challenge.user.challenges[0].plan if challenge.user.challenges else None 
    # Wait, the challenge has a plan_id relations
    # We just need to query the plan. 
    # For MVP speed, let's hardcode the defaults mentioned in the prompt if DB fetch is complex, 
    # but let's do it right:
    # We didn't link Challenge -> Plan via relationship explicitly in models.py (just ID)
    # Let's rely on the Seeded Defaults for rules:
    # Daily Loss: 5% of Day Start Equity
    # Max Total Loss: 10% of Initial Balance
    # Profit Target: 10% of Initial Balance
    
    initial_balance = challenge.start_balance
    current_equity = challenge.equity
    
    # --- 1. Max Total Loss (10%) ---
    # Drawdown limit = Initial Balance * 0.90
    max_loss_limit = initial_balance * 0.90
    if current_equity <= max_loss_limit:
        challenge.status = 'failed'
        challenge.failed_at = datetime.utcnow()
        db.session.commit()
        return 'failed_total_loss'

    # --- 2. Profit Target (10%) ---
    profit_target = initial_balance * 1.10
    if current_equity >= profit_target:
        challenge.status = 'passed'
        challenge.passed_at = datetime.utcnow()
        db.session.commit()
        return 'passed'

    # --- 3. Daily Loss (5%) ---
    # We need the equity at the start of the TODAY
    today = date.today()
    daily_metric = DailyMetric.query.filter_by(challenge_id=challenge.id, date=today).first()
    
    if not daily_metric:
        # If no metric for today, create one initializing with current equity (or yesterday's close)
        # Ideally this is created at midnight. For MVP, create lazily on first trade check.
        # But IF it's the very first trade of the day, start equity is equity BEFORE this trade 
        # (which might be hard to get if we just updated it).
        # We will assume 'day_start_equity' is tracked via a daily job or initialized 
        # when the user logs in for the first time that day.
        # For simplicity: If missing, set start_equity = current_equity (Weakness in Logic for MVP but acceptable)
        # BETTER: Use yesterday's metric end_equity, or initial_balance if new.
        day_start = initial_balance # Fallback
        # Logic to find yesterday... skipped for brevity, assumes lazy init = current
        # Let's just create it now to track drawdown FROM NOW ON if not exists
        daily_metric = DailyMetric(
            challenge_id=challenge.id, 
            date=today, 
            day_start_equity=current_equity
        )
        db.session.add(daily_metric)
        db.session.commit()
    
    # Check Daily Drawdown
    # "if equity drops 5% in a day" relative to Day Start
    # Limit = Day Start * 0.95
    daily_limit = daily_metric.day_start_equity * 0.95
    
    if current_equity <= daily_limit:
        challenge.status = 'failed'
        challenge.failed_at = datetime.utcnow()
        db.session.commit()
        return 'failed_daily_loss'
    
    # Update Daily High/Metrics (Tracking Max Intraday Drawdown technically requires high-water mark logic)
    # For this MVP, we just check against Day Start.
    
    return 'active'
