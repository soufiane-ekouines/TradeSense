from flask import Blueprint, request, jsonify
from services.payment_service import PaymentService
from models import User, Plan
from utils import token_required

checkout_bp = Blueprint('checkout', __name__)
payment_service = PaymentService()

@checkout_bp.route('/cmi', methods=['POST'])
@token_required
def pay_cmi(current_user):
    data = request.get_json()
    plan_slug = data.get('plan')
    
    # Simple price lookup (In real app, fetch from DB)
    prices = {'starter': 200, 'pro': 500, 'elite': 1000}
    amount = prices.get(plan_slug)
    
    if not amount:
        return jsonify({'error': 'Invalid plan'}), 400

    result = payment_service.process_cmi_payment(current_user.id, plan_slug, amount)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@checkout_bp.route('/crypto', methods=['POST'])
@token_required
def pay_crypto(current_user):
    data = request.get_json()
    plan_slug = data.get('plan')
    
    prices = {'starter': 200, 'pro': 500, 'elite': 1000}
    amount = prices.get(plan_slug) # In USD mostly same for MVP

    if not amount:
        return jsonify({'error': 'Invalid plan'}), 400

    result = payment_service.process_crypto_payment(current_user.id, plan_slug, amount)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@checkout_bp.route('/paypal', methods=['POST'])
@token_required
def pay_paypal(current_user):
    data = request.get_json()
    plan_slug = data.get('plan')
    
    prices = {'starter': 200, 'pro': 500, 'elite': 1000}
    amount = prices.get(plan_slug)

    if not amount:
        return jsonify({'error': 'Invalid plan'}), 400

    result = payment_service.process_paypal_payment(current_user.id, plan_slug, amount)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400
