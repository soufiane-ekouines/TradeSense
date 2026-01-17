from models import CommunityPost, Strategy, User

def get_nexus_feed(tenant_id=None, page=1, per_page=20):
    query = CommunityPost.query
    if tenant_id:
        query = query.filter_by(tenant_id=tenant_id)
    
    posts_pagination = query.order_by(CommunityPost.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    feed = []
    for post in posts_pagination.items:
        post_data = {
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
        }
        
        if post.media_type == 'STRATEGY' and post.strategy:
            post_data['strategy'] = {
                'id': post.strategy.id,
                'symbol': post.strategy.symbol,
                'description': post.strategy.description,
                'screenshot_url': post.strategy.screenshot_url,
                'win_rate': post.strategy.win_rate,
                'config_json': post.strategy.config_json
            }
            
        feed.append(post_data)
        
    return {
        'posts': feed,
        'has_next': posts_pagination.has_next,
        'total': posts_pagination.total
    }
