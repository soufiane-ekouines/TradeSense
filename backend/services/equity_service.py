"""
Equity Calculation Service
Real-time equity and PnL calculations with proper formulas.
"""

from models import db, Challenge, Trade
from services.price_cache import get_cached_price
from datetime import date


def calculate_positions(challenge_id: int) -> dict:
    """
    Calculate open positions from trade history.
    
    Returns:
        {
            'symbol': {
                'qty': float (positive = long, negative = short),
                'avg_entry': float,
                'side': 'long' | 'short' | 'flat'
            }
        }
    """
    trades = Trade.query.filter_by(challenge_id=challenge_id)\
        .order_by(Trade.executed_at.asc()).all()
    
    positions = {}
    
    for trade in trades:
        symbol = trade.symbol
        if symbol not in positions:
            positions[symbol] = {'qty': 0, 'avg_entry': 0, 'total_cost': 0}
        
        pos = positions[symbol]
        trade_qty = trade.qty if trade.side == 'buy' else -trade.qty
        
        # Check if opening or closing
        same_direction = (pos['qty'] >= 0 and trade.side == 'buy') or \
                        (pos['qty'] <= 0 and trade.side == 'sell')
        
        if same_direction or pos['qty'] == 0:
            # Opening/Adding to position
            new_cost = pos['total_cost'] + (trade.qty * trade.price)
            new_qty = pos['qty'] + trade_qty
            pos['total_cost'] = new_cost
            pos['qty'] = new_qty
            pos['avg_entry'] = abs(new_cost / new_qty) if new_qty != 0 else 0
        else:
            # Closing/Reducing position
            close_qty = min(abs(trade_qty), abs(pos['qty']))
            remaining_qty = pos['qty'] + trade_qty
            
            if abs(remaining_qty) < 0.000001:
                # Position fully closed
                pos['qty'] = 0
                pos['avg_entry'] = 0
                pos['total_cost'] = 0
            else:
                # Partial close
                pos['qty'] = remaining_qty
                # Keep same avg_entry for remaining
                pos['total_cost'] = pos['avg_entry'] * abs(remaining_qty)
    
    # Add side classification
    for symbol, pos in positions.items():
        if pos['qty'] > 0.000001:
            pos['side'] = 'long'
        elif pos['qty'] < -0.000001:
            pos['side'] = 'short'
        else:
            pos['side'] = 'flat'
    
    return positions


def calculate_unrealized_pnl(positions: dict) -> dict:
    """
    Calculate unrealized PnL for all open positions.
    
    Formula:
    - Long: (Current Price - Entry Price) × Quantity
    - Short: (Entry Price - Current Price) × |Quantity|
    
    Returns:
        {
            'symbol': {
                'unrealized_pnl': float,
                'current_price': float,
                'entry_price': float,
                'qty': float,
                'pnl_percent': float
            },
            '_total': float  # Total unrealized PnL
        }
    """
    result = {'_total': 0}
    
    for symbol, pos in positions.items():
        if pos['side'] == 'flat':
            continue
        
        price_data = get_cached_price(symbol)
        current_price = price_data['price']
        entry_price = pos['avg_entry']
        qty = pos['qty']
        
        if pos['side'] == 'long':
            unrealized_pnl = (current_price - entry_price) * qty
        else:  # short
            unrealized_pnl = (entry_price - current_price) * abs(qty)
        
        pnl_percent = ((current_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
        if pos['side'] == 'short':
            pnl_percent = -pnl_percent
        
        result[symbol] = {
            'unrealized_pnl': round(unrealized_pnl, 2),
            'current_price': current_price,
            'entry_price': entry_price,
            'qty': qty,
            'pnl_percent': round(pnl_percent, 2)
        }
        result['_total'] += unrealized_pnl
    
    result['_total'] = round(result['_total'], 2)
    return result


def calculate_realized_pnl(challenge_id: int) -> float:
    """
    Calculate total realized PnL from closed trades.
    """
    trades = Trade.query.filter_by(challenge_id=challenge_id)\
        .order_by(Trade.executed_at.asc()).all()
    
    positions = {}  # Track positions to calculate PnL on close
    total_realized = 0
    
    for trade in trades:
        symbol = trade.symbol
        if symbol not in positions:
            positions[symbol] = {'qty': 0, 'avg_entry': 0}
        
        pos = positions[symbol]
        trade_qty = trade.qty if trade.side == 'buy' else -trade.qty
        
        # Check if closing
        is_closing = (pos['qty'] > 0 and trade.side == 'sell') or \
                    (pos['qty'] < 0 and trade.side == 'buy')
        
        if is_closing and pos['qty'] != 0:
            # Calculate PnL for closed portion
            close_qty = min(abs(trade_qty), abs(pos['qty']))
            
            if pos['qty'] > 0:  # Closing long
                pnl = (trade.price - pos['avg_entry']) * close_qty
            else:  # Closing short
                pnl = (pos['avg_entry'] - trade.price) * close_qty
            
            total_realized += pnl
            
            # Update position
            remaining = pos['qty'] + trade_qty
            if abs(remaining) < 0.000001:
                pos['qty'] = 0
                pos['avg_entry'] = 0
            else:
                pos['qty'] = remaining
        else:
            # Opening position
            if pos['qty'] == 0:
                pos['avg_entry'] = trade.price
            else:
                # Average in
                total_val = (pos['qty'] * pos['avg_entry']) + (trade_qty * trade.price)
                pos['qty'] += trade_qty
                pos['avg_entry'] = abs(total_val / pos['qty']) if pos['qty'] != 0 else 0
            pos['qty'] += trade_qty if pos['qty'] == 0 else 0
    
    return round(total_realized, 2)


def calculate_equity(challenge_id: int) -> dict:
    """
    Calculate real-time equity for a challenge.
    
    Formula:
    Equity = Initial Balance + Realized PnL + Unrealized PnL - Commissions
    
    Returns:
        {
            'equity': float,
            'balance': float (closed PnL only),
            'unrealized_pnl': float,
            'realized_pnl': float,
            'total_pnl': float,
            'total_pnl_percent': float,
            'positions': dict
        }
    """
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        return None
    
    initial_balance = challenge.start_balance
    
    # Get positions
    positions = calculate_positions(challenge_id)
    
    # Calculate PnLs
    unrealized = calculate_unrealized_pnl(positions)
    unrealized_pnl = unrealized['_total']
    realized_pnl = calculate_realized_pnl(challenge_id)
    
    # Calculate equity
    # Note: challenge.equity in DB might be stale, we calculate fresh
    equity = initial_balance + realized_pnl + unrealized_pnl
    balance = initial_balance + realized_pnl  # Balance = closed trades only
    
    total_pnl = equity - initial_balance
    total_pnl_percent = (total_pnl / initial_balance * 100) if initial_balance > 0 else 0
    
    return {
        'equity': round(equity, 2),
        'balance': round(balance, 2),
        'initial_balance': initial_balance,
        'unrealized_pnl': unrealized_pnl,
        'realized_pnl': realized_pnl,
        'total_pnl': round(total_pnl, 2),
        'total_pnl_percent': round(total_pnl_percent, 2),
        'positions': {k: v for k, v in unrealized.items() if k != '_total'}
    }


def update_challenge_equity(challenge_id: int) -> float:
    """
    Update challenge equity in database with fresh calculation.
    Returns the new equity value.
    """
    equity_data = calculate_equity(challenge_id)
    if not equity_data:
        return None
    
    challenge = Challenge.query.get(challenge_id)
    if challenge:
        challenge.equity = equity_data['equity']
        db.session.commit()
    
    return equity_data['equity']
