from app import create_app
from models import db, Plan
import json

app = create_app()

with app.app_context():
    print("Seeding database...")
    plans = [
        ('starter', 200, {"balance": 5000, "profit_target": 0.10, "max_loss": 0.10, "daily_loss": 0.05}),
        ('pro', 500, {"balance": 25000, "profit_target": 0.10, "max_loss": 0.10, "daily_loss": 0.05}),
        ('elite', 1000, {"balance": 100000, "profit_target": 0.10, "max_loss": 0.10, "daily_loss": 0.05})
    ]

    for slug, price, features in plans:
        existing = Plan.query.filter_by(slug=slug).first()
        if not existing:
            new_plan = Plan(slug=slug, price_dh=price, features_json=json.dumps(features))
            db.session.add(new_plan)
            print(f"Created plan: {slug}")
        else:
            print(f"Plan exists: {slug}")
    
    db.session.commit()
    print("Database seeding complete.")
