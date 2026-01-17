from app import create_app
from models import db, User
from services.payment_service import PaymentService

app = create_app()

with app.app_context():
    print("\n=== Testing PayPal Payment Flow ===")
    
    # Get a test user
    test_user = User.query.filter_by(email='test@test.com').first()
    if not test_user:
        print("Test user 'test@test.com' not found. Please ensure it exists (run previous test script).")
        # Just create one for safety if needed, or exit
        from werkzeug.security import generate_password_hash
        test_user = User(name='Test User', email='test@test.com', password_hash=generate_password_hash('test123'))
        db.session.add(test_user)
        db.session.commit()
    
    payment_service = PaymentService()
    
    # Test PayPal with 'starter' plan
    plan_slug = 'starter'
    amount = 200
    print(f"\nTesting PayPal payment with plan_slug='{plan_slug}', amount={amount}")
    
    try:
        result = payment_service.process_paypal_payment(test_user.id, plan_slug, amount)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {e}")
