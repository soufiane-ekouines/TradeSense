from app import create_app
from models import Plan

app = create_app()
print(f'Database URI: {app.config["SQLALCHEMY_DATABASE_URI"]}')

with app.app_context():
    plans = Plan.query.all()
    print(f'Plans found: {len(plans)}')
    for p in plans:
        print(f'  - {p.slug}: {p.price_dh} DH')
