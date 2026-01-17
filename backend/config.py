import os

class Config:
    SECRET_KEY = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-prod')
    
    # Use absolute path to ensure consistent database location
    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f'sqlite:///{os.path.join(basedir, "instance", "tradesense.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = True
