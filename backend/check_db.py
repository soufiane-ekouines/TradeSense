from app import create_app
from models import db, Transaction, User
import sys

app = create_app()

with app.app_context():
    # 1. Check Tables
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    if 'transactions' not in tables:
        print("ERROR: 'transactions' table MISSING!")
        try:
            db.create_all()
            print("Attempted to create tables...")
        except Exception as e:
            print(f"Failed to create tables: {e}")
    else:
        print("'transactions' table exists.")

    # 2. Check Users
    user = User.query.first()
    if not user:
        print("WARNING: No users found in DB.")
    else:
        print(f"Found user: {user.email} (ID: {user.id})")

    # 3. Try Insert
    try:
        t = Transaction(
            user_id=user.id if user else 1,
            amount=500,
            purpose='test',
            method='TEST'
        )
        db.session.add(t)
        db.session.commit()
        print("SUCCESS: Test transaction inserted.")
    except Exception as e:
        print(f"ERROR: Insert failed: {e}")
