from flask import Blueprint, request, jsonify, g
from models import db, Challenge, Plan
from utils import token_required

challenges_bp = Blueprint('challenges', __name__)

@challenges_bp.route('/active', methods=['GET'])
@token_required
def get_active_challenge():
    # Return the first active challenge for simplicity in MVP
    challenge = Challenge.query.filter_by(user_id=g.user_id, status='active').first()
    if not challenge:
        # Check if there are failed/passed ones to show history, 
        # but for "Dashboard" we specifically want the active one or empty
        return jsonify(None)
    
    return jsonify({
        'id': challenge.id,
        'start_balance': challenge.start_balance,
        'equity': challenge.equity,
        'status': challenge.status
    })

@challenges_bp.route('/<int:id>', methods=['GET'])
@token_required
def get_challenge(id):
    challenge = Challenge.query.get_or_404(id)
    if challenge.user_id != g.user_id and g.user_role != 'admin':
        return jsonify(error="Unauthorized"), 403
        
    return jsonify({
        'id': challenge.id,
        'status': challenge.status,
        'equity': challenge.equity,
        'start_balance': challenge.start_balance,
        'created_at': challenge.created_at
    })

@challenges_bp.route('/create', methods=['POST'])
@token_required
def create_challenge():
    # Simplified Checkout/Create logic
    # In real app, this is called by the Webhook from Payment Gateway
    data = request.get_json()
    plan_slug = data.get('plan_slug')
    
    plan = Plan.query.filter_by(slug=plan_slug).first()
    if not plan:
        return jsonify(error="Invalid plan"), 400
        
    features = plan.get_features()
    start_bal = features.get('balance', 5000)
    
    # Fail other active challenges? Or allow multiple? MVP: One active at a time usually.
    existing = Challenge.query.filter_by(user_id=g.user_id, status='active').first()
    if existing:
        return jsonify(error="You already have an active challenge"), 400

    new_challenge = Challenge(
        user_id=g.user_id,
        plan_id=plan.id,
        start_balance=start_bal,
        equity=start_bal,
        status='active'
    )
    db.session.add(new_challenge)
    db.session.commit()
    
    return jsonify(message="Challenge created", challenge_id=new_challenge.id), 201

@challenges_bp.route('/plans', methods=['GET'])
def get_plans():
    plans = Plan.query.all()
    return jsonify([{
        'id': p.id,
        'slug': p.slug,
        'price': p.price_dh,
        'features': p.get_features()
    } for p in plans])
