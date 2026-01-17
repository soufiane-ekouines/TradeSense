from flask import Blueprint, request, jsonify, g
from models import db, PayPalSettings
from routes.challenges import token_required

admin_bp = Blueprint('admin_separate', __name__)

# Note: I already included admin routes in leaderboard.py for brevity in the previous step,
# but to strictly follow the file structure I'll define the admin blueprint object here 
# and import it in app.py. 
# Re-writing the admin specific logic here to avoid clutter in leaderboard.py if I were ensuring strict separation.
# However, for the MVP and tool usage efficiency, I will use the one defined in leaderboard.py (it exported both).
# Actually, I should split them properly to match the file list I promised.

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
        settings.enabled = data.get('enabled', settings.enabled)
        settings.client_id = data.get('client_id', settings.client_id)
        settings.client_secret = data.get('client_secret', settings.client_secret)
        db.session.commit()
    
    return jsonify({
        'enabled': settings.enabled,
        'client_id': settings.client_id,
        # Don't return secret
    })
