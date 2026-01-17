"""
Watchdog Service - Challenge Health Monitor
Detects rule violations in real-time and auto-fails challenges.
"""

from models import db, Challenge, DailyMetric, Trade
from services.equity_service import calculate_equity
from services.price_cache import get_cached_price
from datetime import date, datetime
from typing import Optional, Dict, Any


# Rule thresholds (can be loaded from Plan in production)
DAILY_LOSS_LIMIT_PCT = 0.05  # 5%
MAX_DRAWDOWN_PCT = 0.10      # 10%
PROFIT_TARGET_PCT = 0.10     # 10%


class WatchdogResult:
    """Result of a watchdog health check."""
    def __init__(self):
        self.is_healthy = True
        self.should_fail = False
        self.fail_reason = None
        self.should_pass = False
        self.violations = []
        self.warnings = []
        self.metrics = {}


def get_day_start_equity(challenge_id: int) -> float:
    """Get the equity at the start of today."""
    today = date.today()
    daily_metric = DailyMetric.query.filter_by(
        challenge_id=challenge_id, 
        date=today
    ).first()
    
    if daily_metric:
        return daily_metric.day_start_equity
    
    # If no metric for today, get challenge's current stored equity
    # (This should be yesterday's closing equity)
    challenge = Challenge.query.get(challenge_id)
    if challenge:
        return challenge.equity
    
    return 0


def ensure_daily_metric(challenge_id: int, start_equity: float) -> DailyMetric:
    """Ensure a daily metric exists for today."""
    today = date.today()
    daily_metric = DailyMetric.query.filter_by(
        challenge_id=challenge_id, 
        date=today
    ).first()
    
    if not daily_metric:
        daily_metric = DailyMetric(
            challenge_id=challenge_id,
            date=today,
            day_start_equity=start_equity
        )
        db.session.add(daily_metric)
        db.session.commit()
    
    return daily_metric


def check_account_health(challenge_id: int) -> WatchdogResult:
    """
    Main watchdog function - checks all rules for a challenge.
    Should be called on every price tick or trade execution.
    
    Returns WatchdogResult with:
    - is_healthy: True if no violations
    - should_fail: True if challenge should be marked as failed
    - fail_reason: Reason for failure
    - violations: List of current violations
    - warnings: List of warnings (approaching limits)
    - metrics: Current risk metrics
    """
    result = WatchdogResult()
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        result.is_healthy = False
        result.fail_reason = "Challenge not found"
        return result
    
    if challenge.status != 'active':
        result.is_healthy = False
        result.fail_reason = f"Challenge is {challenge.status}"
        return result
    
    # Calculate real-time equity
    equity_data = calculate_equity(challenge_id)
    if not equity_data:
        result.is_healthy = False
        result.fail_reason = "Could not calculate equity"
        return result
    
    initial_balance = challenge.start_balance
    current_equity = equity_data['equity']
    
    # Ensure daily metric exists
    day_start_equity = get_day_start_equity(challenge_id)
    if day_start_equity == 0:
        day_start_equity = initial_balance
    ensure_daily_metric(challenge_id, day_start_equity)
    
    # ==================== CHECK 1: DAILY LOSS ====================
    daily_loss = day_start_equity - current_equity
    daily_loss_pct = (daily_loss / day_start_equity) if day_start_equity > 0 else 0
    daily_limit = day_start_equity * DAILY_LOSS_LIMIT_PCT
    daily_danger_pct = (daily_loss / daily_limit * 100) if daily_limit > 0 else 0
    
    result.metrics['daily_loss'] = round(daily_loss, 2)
    result.metrics['daily_loss_pct'] = round(daily_loss_pct * 100, 2)
    result.metrics['daily_limit'] = round(daily_limit, 2)
    result.metrics['daily_danger_pct'] = round(daily_danger_pct, 2)
    result.metrics['day_start_equity'] = day_start_equity
    
    if daily_loss_pct >= DAILY_LOSS_LIMIT_PCT:
        result.is_healthy = False
        result.should_fail = True
        result.fail_reason = "DAILY_LOSS_EXCEEDED"
        result.violations.append({
            'rule': 'DAILY_LOSS',
            'message': f"Daily loss of {daily_loss_pct*100:.2f}% exceeds limit of {DAILY_LOSS_LIMIT_PCT*100}%",
            'current': daily_loss,
            'limit': daily_limit
        })
    elif daily_danger_pct >= 80:
        result.warnings.append({
            'rule': 'DAILY_LOSS',
            'message': f"Approaching daily loss limit ({daily_danger_pct:.1f}% used)",
            'severity': 'high' if daily_danger_pct >= 90 else 'medium'
        })
    
    # ==================== CHECK 2: MAX DRAWDOWN ====================
    total_drawdown = initial_balance - current_equity
    total_drawdown_pct = (total_drawdown / initial_balance) if initial_balance > 0 else 0
    max_drawdown_limit = initial_balance * MAX_DRAWDOWN_PCT
    drawdown_danger_pct = (total_drawdown / max_drawdown_limit * 100) if max_drawdown_limit > 0 else 0
    
    result.metrics['total_drawdown'] = round(total_drawdown, 2)
    result.metrics['total_drawdown_pct'] = round(total_drawdown_pct * 100, 2)
    result.metrics['max_drawdown_limit'] = round(max_drawdown_limit, 2)
    result.metrics['drawdown_danger_pct'] = round(drawdown_danger_pct, 2)
    
    if total_drawdown_pct >= MAX_DRAWDOWN_PCT:
        result.is_healthy = False
        result.should_fail = True
        result.fail_reason = "MAX_DRAWDOWN_EXCEEDED"
        result.violations.append({
            'rule': 'MAX_DRAWDOWN',
            'message': f"Total drawdown of {total_drawdown_pct*100:.2f}% exceeds limit of {MAX_DRAWDOWN_PCT*100}%",
            'current': total_drawdown,
            'limit': max_drawdown_limit
        })
    elif drawdown_danger_pct >= 80:
        result.warnings.append({
            'rule': 'MAX_DRAWDOWN',
            'message': f"Approaching max drawdown limit ({drawdown_danger_pct:.1f}% used)",
            'severity': 'high' if drawdown_danger_pct >= 90 else 'medium'
        })
    
    # ==================== CHECK 3: PROFIT TARGET ====================
    profit = current_equity - initial_balance
    profit_pct = (profit / initial_balance) if initial_balance > 0 else 0
    profit_target = initial_balance * PROFIT_TARGET_PCT
    profit_progress_pct = (profit / profit_target * 100) if profit_target > 0 else 0
    
    result.metrics['profit'] = round(profit, 2)
    result.metrics['profit_pct'] = round(profit_pct * 100, 2)
    result.metrics['profit_target'] = round(profit_target, 2)
    result.metrics['profit_progress_pct'] = round(max(0, profit_progress_pct), 2)
    
    if profit_pct >= PROFIT_TARGET_PCT:
        result.should_pass = True
        result.metrics['target_reached'] = True
    
    # Add current equity to metrics
    result.metrics['current_equity'] = current_equity
    result.metrics['initial_balance'] = initial_balance
    
    return result


def force_close_all_positions(challenge_id: int) -> Dict[str, Any]:
    """
    Force close all open positions for a challenge.
    Called when a rule is violated.
    """
    from services.equity_service import calculate_positions
    from services.price_cache import get_cached_price
    
    positions = calculate_positions(challenge_id)
    closed_trades = []
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        return {'error': 'Challenge not found'}
    
    for symbol, pos in positions.items():
        if pos['side'] == 'flat':
            continue
        
        # Get current price
        price_data = get_cached_price(symbol)
        current_price = price_data['price']
        
        # Create closing trade
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
            'price': current_price
        })
    
    db.session.commit()
    
    return {
        'closed_positions': len(closed_trades),
        'trades': closed_trades
    }


def execute_watchdog(challenge_id: int) -> Dict[str, Any]:
    """
    Execute full watchdog check and take action if needed.
    This is the main entry point for the watchdog.
    
    Returns:
        {
            'status': 'healthy' | 'warning' | 'failed' | 'passed',
            'action_taken': str | None,
            'health_check': WatchdogResult dict,
            'challenge_status': str
        }
    """
    result = check_account_health(challenge_id)
    
    response = {
        'status': 'healthy',
        'action_taken': None,
        'health_check': {
            'is_healthy': result.is_healthy,
            'violations': result.violations,
            'warnings': result.warnings,
            'metrics': result.metrics
        },
        'challenge_status': 'active'
    }
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        response['status'] = 'error'
        return response
    
    # Handle warnings
    if result.warnings and result.is_healthy:
        response['status'] = 'warning'
    
    # Handle failure
    if result.should_fail:
        response['status'] = 'failed'
        response['action_taken'] = 'FORCE_CLOSE_AND_FAIL'
        
        # Force close all positions
        close_result = force_close_all_positions(challenge_id)
        response['closed_positions'] = close_result
        
        # Mark challenge as failed
        challenge.status = 'failed'
        challenge.failed_at = datetime.utcnow()
        db.session.commit()
        
        response['challenge_status'] = 'failed'
        response['fail_reason'] = result.fail_reason
    
    # Handle passing
    elif result.should_pass:
        response['status'] = 'passed'
        response['action_taken'] = 'CHALLENGE_PASSED'
        
        challenge.status = 'passed'
        challenge.passed_at = datetime.utcnow()
        db.session.commit()
        
        response['challenge_status'] = 'passed'
    
    return response


def get_watchdog_status(challenge_id: int) -> Dict[str, Any]:
    """
    Get current watchdog status without taking action.
    For UI display purposes.
    """
    result = check_account_health(challenge_id)
    
    overall_danger = max(
        result.metrics.get('daily_danger_pct', 0),
        result.metrics.get('drawdown_danger_pct', 0)
    )
    
    status = 'NORMAL'
    if overall_danger >= 95:
        status = 'CRITICAL'
    elif overall_danger >= 80:
        status = 'DANGER'
    elif overall_danger >= 60:
        status = 'WARNING'
    
    return {
        'challenge_id': challenge_id,
        'status': status,
        'danger_level': round(overall_danger, 2),
        'is_healthy': result.is_healthy,
        'can_trade': result.is_healthy and not result.should_fail,
        'metrics': result.metrics,
        'warnings': result.warnings,
        'violations': result.violations
    }
