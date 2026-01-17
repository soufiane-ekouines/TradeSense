import os
from app import create_app
from models import db
import shutil

app = create_app()

with app.app_context():
    # Path to the database file
    db_path = os.path.join(app.instance_path, 'tradesense.db')
    
    print(f"Attempting to reset database at: {db_path}")
    
    # Close connections and drop all tables
    db.drop_all()
    
    # Remove the file to be absolutely sure
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("Database file deleted successfully.")
        except Exception as e:
            print(f"Error deleting database file: {e}")
    
    # Recreate tables
    db.create_all()
    print("Tables created successfully.")

    # Re-seed if needed
    try:
        from seed import plans
        import json
        from models import Plan
        for slug, price, features in plans:
            existing = Plan.query.filter_by(slug=slug).first()
            if not existing:
                new_plan = Plan(slug=slug, price_dh=price, features_json=json.dumps(features))
                db.session.add(new_plan)
        db.session.commit()
        print("Database seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")

print("Database reset complete.")
