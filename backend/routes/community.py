from flask import Blueprint, request, jsonify, g
from models import db, CommunityPost, CommunityComment, User, Strategy, DirectMessage, Conversation
from utils import token_required
from services.file_service import save_voice_message, save_image
from services.strategy_service import create_strategy
from services.feed_manager import get_nexus_feed

community_bp = Blueprint('community', __name__)

@community_bp.route('/<tenant>/community/feed', methods=['GET'])
@token_required
def get_feed(tenant):
    """
    Retrieves the community feed for a specific tenant.
    """
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    posts_pagination = CommunityPost.query.filter_by(tenant_id=tenant)\
        .order_by(CommunityPost.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    feed = []
    for post in posts_pagination.items:
        feed.append({
            'id': post.id,
            'content': post.content,
            'media_type': post.media_type,
            'media_url': post.media_url,
            'likes_count': post.likes_count,
            'created_at': post.created_at.isoformat(),
            'author': {
                'id': post.author.id,
                'name': post.author.name,
                'avatar_url': post.author.avatar_url,
                'role': post.author.role
            },
            'comments_count': len(post.comments)
        })
        
    return jsonify({
        'posts': feed,
        'has_next': posts_pagination.has_next,
        'next_page': posts_pagination.next_num if posts_pagination.has_next else None,
        'total': posts_pagination.total
    }), 200

@community_bp.route('/<tenant>/community/posts', methods=['POST'])
@token_required
def create_post(tenant):
    """
    Creates a new community post (text, voice, or image).
    """
    content = request.form.get('content')
    file = request.files.get('file')
    image = request.files.get('image')
    
    media_url = None
    media_type = 'TEXT'
    
    # Handle voice file
    if file:
        media_url = save_voice_message(file, tenant)
        if media_url:
            media_type = 'VOICE'
        else:
            return jsonify(error="Invalid voice file type or upload failed"), 400
    
    # Handle image file
    if image:
        media_url = save_image(image, 'posts')
        if media_url:
            media_type = 'IMAGE'
        else:
            return jsonify(error="Invalid image file type or upload failed"), 400

    if not content and not media_url:
        return jsonify(error="Content or media is required"), 400

    new_post = CommunityPost(
        tenant_id=tenant,
        user_id=g.user_id,
        content=content,
        media_type=media_type,
        media_url=media_url
    )
    
    db.session.add(new_post)
    db.session.commit()
    
    # Return the created post with author info
    return jsonify({
        'message': 'Post created successfully',
        'post_id': new_post.id,
        'post': {
            'id': new_post.id,
            'content': new_post.content,
            'media_type': new_post.media_type,
            'media_url': new_post.media_url,
            'created_at': new_post.created_at.isoformat(),
            'author': {
                'id': new_post.author.id,
                'name': new_post.author.name,
                'avatar_url': new_post.author.avatar_url
            }
        }
    }), 201

@community_bp.route('/<tenant>/community/posts/<int:post_id>/comments', methods=['POST'])
@token_required
def add_comment(tenant, post_id):
    """
    Adds a comment to a specific post.
    """
    post = CommunityPost.query.get_or_404(post_id)
    
    content = request.form.get('content')
    file = request.files.get('file')
    
    media_url = None
    if file:
        media_url = save_voice_message(file, tenant)
        
    if not content and not media_url:
        return jsonify(error="Comment content or media is required"), 400

    new_comment = CommunityComment(
        post_id=post_id,
        user_id=g.user_id,
        content=content,
        media_url=media_url
    )
    
    db.session.add(new_comment)
    db.session.commit()
    
    return jsonify({
        'message': 'Comment added successfully',
        'comment_id': new_comment.id
    }), 201

@community_bp.route('/<tenant>/community/nexus', methods=['GET'])
@token_required
def get_nexus(tenant):
    """
    Unified feed for the Community Nexus.
    """
    page = request.args.get('page', 1, type=int)
    feed_data = get_nexus_feed(tenant_id=tenant, page=page)
    return jsonify(feed_data), 200

@community_bp.route('/<tenant>/community/strategies', methods=['POST'])
@token_required
def share_strategy(tenant):
    """
    Shares a trading strategy to the community.
    """
    symbol = request.form.get('symbol')
    description = request.form.get('description')
    config_json = request.form.get('config_json')
    win_rate = request.form.get('win_rate')
    screenshot = request.files.get('screenshot')
    
    if not symbol:
        return jsonify(error="Symbol is required"), 400
        
    # Create the strategy
    strategy = create_strategy(
        user_id=g.user_id,
        symbol=symbol,
        description=description,
        config_json=config_json,
        screenshot_file=screenshot,
        win_rate=win_rate
    )
    
    # Create a post for this strategy
    new_post = CommunityPost(
        tenant_id=tenant,
        user_id=g.user_id,
        content=f"🚀 Shared a new {symbol.upper()} strategy! Check out my setup.",
        media_type='STRATEGY',
        strategy_id=strategy.id
    )
    
    db.session.add(new_post)
    db.session.commit()
    
    return jsonify({
        'message': 'Strategy shared successfully',
        'post_id': new_post.id,
        'strategy_id': strategy.id,
        'strategy': {
            'id': strategy.id,
            'symbol': strategy.symbol,
            'description': strategy.description,
            'win_rate': strategy.win_rate,
            'screenshot_url': strategy.screenshot_url
        }
    }), 201

@community_bp.route('/<tenant>/community/strategies/top', methods=['GET'])
@token_required
def get_top_strategies(tenant):
    """
    Retrieves top rated strategies.
    """
    top_strategies = Strategy.query.order_by(Strategy.win_rate.desc(), Strategy.votes_count.desc()).limit(5).all()
    
    result = []
    for s in top_strategies:
        result.append({
            'id': s.id,
            'symbol': s.symbol,
            'win_rate': s.win_rate,
            'votes_count': s.votes_count,
            'author': s.author.name
        })
    return jsonify(result), 200

@community_bp.route('/<tenant>/community/posts/<int:post_id>/like', methods=['POST'])
@token_required
def like_post(tenant, post_id):
    """
    Likes a community post.
    """
    post = CommunityPost.query.get_or_404(post_id)
    post.likes_count = (post.likes_count or 0) + 1
    db.session.commit()
    
    return jsonify({
        'message': 'Post liked successfully',
        'likes_count': post.likes_count
    }), 200

@community_bp.route('/<tenant>/community/strategies/<int:strategy_id>/vote', methods=['POST'])
@token_required
def vote_strategy(tenant, strategy_id):
    """
    Votes for a strategy.
    """
    strategy = Strategy.query.get_or_404(strategy_id)
    strategy.votes_count = (strategy.votes_count or 0) + 1
    db.session.commit()
    
    return jsonify({
        'message': 'Vote recorded successfully',
        'votes_count': strategy.votes_count
    }), 200

@community_bp.route('/<tenant>/community/posts/<int:post_id>/comments', methods=['GET'])
@token_required
def get_comments(tenant, post_id):
    """
    Retrieves all comments for a specific post.
    """
    post = CommunityPost.query.get_or_404(post_id)
    comments = []
    for comment in post.comments:
        comments.append({
            'id': comment.id,
            'content': comment.content,
            'media_url': comment.media_url,
            'created_at': comment.created_at.isoformat(),
            'author': {
                'id': comment.author.id,
                'name': comment.author.name
            }
        })
    return jsonify(comments), 200

# ==================== DIRECT MESSAGES ====================

@community_bp.route('/<tenant>/dm/conversations', methods=['GET'])
@token_required
def get_conversations(tenant):
    """
    Get all conversations for the current user.
    """
    from sqlalchemy import or_
    
    conversations = Conversation.query.filter(
        or_(Conversation.user1_id == g.user_id, Conversation.user2_id == g.user_id)
    ).order_by(Conversation.last_message_at.desc()).all()
    
    result = []
    for conv in conversations:
        other_user = conv.user2 if conv.user1_id == g.user_id else conv.user1
        
        # Get last message
        last_msg = DirectMessage.query.filter(
            or_(
                (DirectMessage.sender_id == g.user_id) & (DirectMessage.receiver_id == other_user.id),
                (DirectMessage.sender_id == other_user.id) & (DirectMessage.receiver_id == g.user_id)
            )
        ).order_by(DirectMessage.created_at.desc()).first()
        
        # Count unread messages
        unread_count = DirectMessage.query.filter(
            DirectMessage.sender_id == other_user.id,
            DirectMessage.receiver_id == g.user_id,
            DirectMessage.is_read == False
        ).count()
        
        result.append({
            'id': conv.id,
            'user': {
                'id': other_user.id,
                'name': other_user.name,
                'avatar_url': other_user.avatar_url
            },
            'last_message': {
                'content': last_msg.content if last_msg else None,
                'media_type': last_msg.media_type if last_msg else None,
                'created_at': last_msg.created_at.isoformat() if last_msg else None
            } if last_msg else None,
            'unread_count': unread_count,
            'last_message_at': conv.last_message_at.isoformat()
        })
    
    return jsonify(result), 200

@community_bp.route('/<tenant>/dm/messages/<int:user_id>', methods=['GET'])
@token_required
def get_messages(tenant, user_id):
    """
    Get all messages between current user and specified user.
    """
    from sqlalchemy import or_, and_
    
    messages = DirectMessage.query.filter(
        or_(
            and_(DirectMessage.sender_id == g.user_id, DirectMessage.receiver_id == user_id),
            and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == g.user_id)
        )
    ).order_by(DirectMessage.created_at.asc()).all()
    
    # Mark messages as read
    DirectMessage.query.filter(
        DirectMessage.sender_id == user_id,
        DirectMessage.receiver_id == g.user_id,
        DirectMessage.is_read == False
    ).update({'is_read': True})
    db.session.commit()
    
    result = []
    for msg in messages:
        result.append({
            'id': msg.id,
            'content': msg.content,
            'media_type': msg.media_type,
            'media_url': msg.media_url,
            'is_mine': msg.sender_id == g.user_id,
            'is_read': msg.is_read,
            'created_at': msg.created_at.isoformat()
        })
    
    return jsonify(result), 200

@community_bp.route('/<tenant>/dm/messages/<int:user_id>', methods=['POST'])
@token_required
def send_message(tenant, user_id):
    """
    Send a direct message to a user.
    """
    from sqlalchemy import or_, and_
    
    # Check if receiver exists
    receiver = User.query.get(user_id)
    if not receiver:
        return jsonify(error="User not found"), 404
    
    content = request.form.get('content')
    file = request.files.get('file')
    image = request.files.get('image')
    
    media_url = None
    media_type = 'TEXT'
    
    if file:
        media_url = save_voice_message(file, tenant)
        if media_url:
            media_type = 'VOICE'
    
    if image:
        media_url = save_image(image, 'dm')
        if media_url:
            media_type = 'IMAGE'
    
    if not content and not media_url:
        return jsonify(error="Message content or media is required"), 400
    
    # Create the message
    new_message = DirectMessage(
        sender_id=g.user_id,
        receiver_id=user_id,
        content=content,
        media_type=media_type,
        media_url=media_url
    )
    db.session.add(new_message)
    
    # Update or create conversation
    conversation = Conversation.query.filter(
        or_(
            and_(Conversation.user1_id == g.user_id, Conversation.user2_id == user_id),
            and_(Conversation.user1_id == user_id, Conversation.user2_id == g.user_id)
        )
    ).first()
    
    if not conversation:
        conversation = Conversation(
            user1_id=g.user_id,
            user2_id=user_id
        )
        db.session.add(conversation)
    
    from datetime import datetime
    conversation.last_message_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Message sent successfully',
        'dm': {
            'id': new_message.id,
            'content': new_message.content,
            'media_type': new_message.media_type,
            'media_url': new_message.media_url,
            'is_mine': True,
            'created_at': new_message.created_at.isoformat()
        }
    }), 201

@community_bp.route('/<tenant>/dm/users', methods=['GET'])
@token_required
def get_users_for_dm(tenant):
    """
    Get list of users available for DM.
    """
    users = User.query.filter(User.id != g.user_id).limit(50).all()
    
    result = []
    for user in users:
        result.append({
            'id': user.id,
            'name': user.name,
            'avatar_url': user.avatar_url,
            'role': user.role
        })
    
    return jsonify(result), 200
