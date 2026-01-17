import os
import uuid
from werkzeug.utils import secure_filename

# Configuration
UPLOAD_FOLDER = os.path.join('static', 'uploads', 'voice_messages')
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'webm', 'ogg', 'm4a', 'mpeg'}

def allowed_file(filename):
    """Check if file extension is allowed."""
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_voice_message(file_obj, tenant_id=None):
    """
    Saves a voice message file and returns the relative URL.
    
    Args:
        file_obj: The uploaded file object
        tenant_id: Optional tenant ID for multi-tenant support
        
    Returns:
        The URL path to access the file, or None if save failed
    """
    if not file_obj:
        return None
    
    # Get filename - handle both filename and name attributes
    filename = getattr(file_obj, 'filename', None) or getattr(file_obj, 'name', None)
    if not filename or filename == '':
        # Generate a default filename for blob uploads
        filename = 'voice_message.webm'

    # Check file extension or default to webm for blob uploads
    if allowed_file(filename):
        ext = filename.rsplit('.', 1)[1].lower()
    else:
        # Default to webm for browser recordings
        ext = 'webm'
    
    # Generate unique filename using UUID to prevent collisions
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Ensure directory exists
    path = os.path.join(os.getcwd(), UPLOAD_FOLDER)
    if not os.path.exists(path):
        os.makedirs(path)
        
    file_path = os.path.join(path, unique_filename)
    
    try:
        file_obj.save(file_path)
        # Return relative URL for static serving
        return f"/static/uploads/voice_messages/{unique_filename}"
    except Exception as e:
        print(f"Error saving voice message: {e}")
        return None

def save_image(file_obj, subfolder='images'):
    """
    Saves an image file and returns the relative URL.
    
    Args:
        file_obj: The uploaded file object
        subfolder: Subfolder within uploads directory
        
    Returns:
        The URL path to access the file, or None if save failed
    """
    if not file_obj:
        return None
        
    filename = getattr(file_obj, 'filename', None)
    if not filename:
        return None
    
    allowed_image_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    if '.' not in filename:
        return None
        
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in allowed_image_ext:
        return None
    
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    
    path = os.path.join(os.getcwd(), 'static', 'uploads', subfolder)
    if not os.path.exists(path):
        os.makedirs(path)
        
    file_path = os.path.join(path, unique_filename)
    
    try:
        file_obj.save(file_path)
        return f"/static/uploads/{subfolder}/{unique_filename}"
    except Exception as e:
        print(f"Error saving image: {e}")
        return None
