from app import create_app
from models import db, Plan, User
from services.payment_service import PaymentService
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Check plans
    print("=== Plans in Database ===")
    plans = Plan.query.all()
    for p in plans:
        print(f"Slug: '{p.slug}' | Price: {p.price_dh} DH | ID: {p.id}")
    
    print("\n=== Testing Payment Flow ===")
    
    # Create a test user if not exists
    test_user = User.query.filter_by(email='test@test.com').first()
    if not test_user:
        test_user = User(
            name='Test User',
            email='test@test.com',
            password_hash=generate_password_hash('test123')
        )
        db.session.add(test_user)
        db.session.commit()
        print(f"Created test user: {test_user.email}")
    else:
        print(f"Test user exists: {test_user.email}")
    
    # Test the payment service
    payment_service = PaymentService()
    
    # Test with 'pro' plan
    plan_slug = 'pro'
    amount = 500
    print(f"\nTesting payment with plan_slug='{plan_slug}', amount={amount}")
    
    result = payment_service.process_cmi_payment(test_user.id, plan_slug, amount)
    print(f"Result: {result}")
