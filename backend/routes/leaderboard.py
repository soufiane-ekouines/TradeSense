from flask import Blueprint, jsonify, request, g
from models import db, Challenge, User, PayPalSettings
from sqlalchemy import func
from routes.challenges import token_required

leaderboard_bp = Blueprint('leaderboard', __name__)
admin_bp = Blueprint('admin', __name__)

@leaderboard_bp.route('/monthly-top10', methods=['GET'])
def top10():
    # Sort by % profit: (equity - start_balance) / start_balance
    results = db.session.query(
        User.name, 
        Challenge.equity, 
        Challenge.start_balance
    ).join(Challenge).filter(Challenge.status != 'failed').all()
    
    # Calculate performance in python (easier for MVP than complex SQL division)
    leaderboard = []
    for name, eq, start in results:
        pct = ((eq - start) / start) * 100
        leaderboard.append({'name': name, 'profit_pct': round(pct, 2)})
    
    # Sort and take top 10
    leaderboard.sort(key=lambda x: x['profit_pct'], reverse=True)
    return jsonify(leaderboard[:10])

@admin_bp.route('/paypal-settings', methods=['GET', 'PUT'])
@token_required
def paypal_settings():
    if g.user_role != 'admin':
        return jsonify(error="Unauthorized"), 403

    settings = PayPalSettings.query.first()
    if not settings:
        settings = PayPalSettings(enabled=False)
        db.session.add(settings)
        db.session.commit()

    if request.method == 'PUT':
        data = request.get_json()
        settings.enabled = data.get('enabled')
        settings.client_id = data.get('client_id')
        settings.client_secret = data.get('client_secret')
        db.session.commit()
    
    return jsonify({
        'enabled': settings.enabled,
        'client_id': settings.client_id
    })
