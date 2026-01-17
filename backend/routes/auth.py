from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from utils import generate_token, token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify(error="Email already registered"), 400
    
    hashed_pw = generate_password_hash(data.get('password'))
    new_user = User(
        name=data.get('name'),
        email=data.get('email'),
        password_hash=hashed_pw
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify(message="User registered successfully"), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    if user and check_password_hash(user.password_hash, data.get('password')):
        token = generate_token(user.id, user.role)
        
        return jsonify(token=token, user={'id': user.id, 'name': user.name, 'role': user.role})
    
    return jsonify(error="Invalid credentials"), 401
    return jsonify(error="Invalid credentials"), 401

