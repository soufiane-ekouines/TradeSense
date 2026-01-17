import jwt
import datetime
from flask import current_app, jsonify, request, g
from functools import wraps
from config import Config
from models import User

def generate_token(user_id, role):
    try:
        payload = {
            'user_id': user_id,
            'role': role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
            'iat': datetime.datetime.utcnow()
        }
        return jwt.encode(
            payload,
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
    except Exception as e:
        return str(e)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                token = auth_header
        
        if not token:
            return jsonify({'error': 'Token is missing!', 'message': 'Token is missing!'}), 401
        
        try:
            # Always use Config.SECRET_KEY as primary to ensure consistency across reloads/blueprints
            secret = current_app.config.get('SECRET_KEY') or Config.SECRET_KEY
            data = jwt.decode(token, secret, algorithms=["HS256"])
            
            # Populate both 'g' and pass user object to be compatible with all route styles
            g.user_id = data['user_id']
            g.user_role = data.get('role', 'user')
            
            current_user = User.query.get(g.user_id)
            if not current_user:
                return jsonify({'error': 'User not found!', 'message': 'User not found!'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!', 'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError as e:
            print(f"JWT ERROR: {str(e)}") # Log specifically
            return jsonify({'error': 'Token is invalid!', 'message': 'Token is invalid!'}), 401
        except Exception as e:
            print(f"JWT UNKNOWN ERROR: {str(e)}")
            return jsonify({'error': 'Token logic error', 'message': 'Token logic error'}), 401
            
        # Check if the route function expects current_user as first arg
        import inspect
        sig = inspect.signature(f)
        if 'current_user' in sig.parameters:
            return f(current_user, *args, **kwargs)
        return f(*args, **kwargs)
    
    return decorated
