from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')
    avatar_url = db.Column(db.String(255), nullable=True) # Profile picture
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    challenges = db.relationship('Challenge', backref='user', lazy=True)

class Plan(db.Model):
    __tablename__ = 'plans'
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    price_dh = db.Column(db.Integer, nullable=False)
    features_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_features(self):
        return json.loads(self.features_json) if self.features_json else {}

class PayPalSettings(db.Model):
    __tablename__ = 'paypal_settings'
    id = db.Column(db.Integer, primary_key=True)
    enabled = db.Column(db.Boolean, default=False)
    client_id = db.Column(db.String(200))
    client_secret = db.Column(db.String(200))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Challenge(db.Model):
    __tablename__ = 'challenges'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    start_balance = db.Column(db.Float, nullable=False)
    equity = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='active') 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    passed_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)

    # Indexes for faster lookup
    __table_args__ = (
        db.Index('idx_challenge_user_status', 'user_id', 'status'),
    )

    trades = db.relationship('Trade', backref='challenge', lazy=True)
    daily_metrics = db.relationship('DailyMetric', backref='challenge', lazy=True)

class Trade(db.Model):
    __tablename__ = 'trades'
    id = db.Column(db.Integer, primary_key=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenges.id'), nullable=False)
    symbol = db.Column(db.String(20), nullable=False)
    side = db.Column(db.String(10), nullable=False)
    qty = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    executed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        db.Index('idx_trade_challenge', 'challenge_id'),
    )

class DailyMetric(db.Model):
    __tablename__ = 'daily_metrics'
    id = db.Column(db.Integer, primary_key=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenges.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    day_start_equity = db.Column(db.Float, nullable=False)
    day_end_equity = db.Column(db.Float)
    day_pnl = db.Column(db.Float)
    max_intraday_drawdown_pct = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_daily_metric_lookup', 'challenge_id', 'date'),
    )

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='DH')
    purpose = db.Column(db.String(50), nullable=False) # e.g. 'challenge_purchase'
    method = db.Column(db.String(20), nullable=False) # 'CMI', 'CRYPTO'
    status = db.Column(db.String(20), default='pending') # 'pending', 'completed', 'failed'
    metadata_json = db.Column(db.Text) # JSON string for extra details (txn_id, wallet, etc)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Strategy(db.Model):
    __tablename__ = 'strategies'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    symbol = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    config_json = db.Column(db.Text) # Indicator settings
    screenshot_url = db.Column(db.String(255))
    win_rate = db.Column(db.Float, default=0.0)
    votes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    author = db.relationship('User', backref='strategies')

class CommunityPost(db.Model):
    __tablename__ = 'community_posts'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(50), nullable=True) # For multi-tenant support
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    media_type = db.Column(db.String(20), default='TEXT') # 'TEXT', 'VOICE', 'IMAGE', 'STRATEGY'
    media_url = db.Column(db.String(255), nullable=True)
    strategy_id = db.Column(db.Integer, db.ForeignKey('strategies.id'), nullable=True)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    author = db.relationship('User', backref='posts')
    comments = db.relationship('CommunityComment', backref='post', cascade="all, delete-orphan")
    strategy = db.relationship('Strategy', backref='shared_posts')

class CommunityComment(db.Model):
    __tablename__ = 'community_comments'
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('community_posts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    media_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    author = db.relationship('User', backref='comments')

class DirectMessage(db.Model):
    __tablename__ = 'direct_messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    media_type = db.Column(db.String(20), default='TEXT')  # 'TEXT', 'VOICE', 'IMAGE'
    media_url = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_message_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user1 = db.relationship('User', foreign_keys=[user1_id])
    user2 = db.relationship('User', foreign_keys=[user2_id])

# ==================== ACADEMY MODELS ====================

class Course(db.Model):
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    thumbnail_url = db.Column(db.String(500))
    preview_video_url = db.Column(db.String(500))
    difficulty = db.Column(db.String(20), default='Beginner')  # 'Beginner', 'Pro', 'Elite'
    tags_json = db.Column(db.Text)  # JSON array: ['risk', 'psychology', 'technical']
    is_premium = db.Column(db.Boolean, default=False)
    xp_reward = db.Column(db.Integer, default=100)
    duration_minutes = db.Column(db.Integer, default=0)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    modules = db.relationship('CourseModule', backref='course', cascade='all, delete-orphan', order_by='CourseModule.order_index')

    def get_tags(self):
        return json.loads(self.tags_json) if self.tags_json else []

    def set_tags(self, tags):
        self.tags_json = json.dumps(tags)

class CourseModule(db.Model):
    __tablename__ = 'course_modules'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    lessons = db.relationship('Lesson', backref='module', cascade='all, delete-orphan', order_by='Lesson.order_index')

class Lesson(db.Model):
    __tablename__ = 'lessons'
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('course_modules.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    video_url = db.Column(db.String(500))
    duration_minutes = db.Column(db.Integer, default=10)
    content_markdown = db.Column(db.Text)  # Written content
    chapter_markers_json = db.Column(db.Text)  # Video chapter markers
    xp_reward = db.Column(db.Integer, default=50)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    quizzes = db.relationship('LessonQuiz', backref='lesson', cascade='all, delete-orphan')

    def get_chapter_markers(self):
        return json.loads(self.chapter_markers_json) if self.chapter_markers_json else []

class LessonQuiz(db.Model):
    __tablename__ = 'lesson_quizzes'
    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    options_json = db.Column(db.Text, nullable=False)  # JSON array of options
    correct_answer_index = db.Column(db.Integer, nullable=False)
    explanation = db.Column(db.Text)
    order_index = db.Column(db.Integer, default=0)

    def get_options(self):
        return json.loads(self.options_json) if self.options_json else []

class UserProgress(db.Model):
    __tablename__ = 'user_progress'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    quiz_score = db.Column(db.Float, default=0)  # Percentage 0-100
    quiz_passed = db.Column(db.Boolean, default=False)
    video_progress_seconds = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'lesson_id', name='unique_user_lesson_progress'),
        db.Index('idx_user_progress_lookup', 'user_id', 'lesson_id'),
    )

    # Relationships
    user = db.relationship('User', backref='lesson_progress')
    lesson = db.relationship('Lesson', backref='user_progress')

class UserXP(db.Model):
    __tablename__ = 'user_xp'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    total_xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='xp_data')

class UserBadge(db.Model):
    __tablename__ = 'user_badges'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    badge_type = db.Column(db.String(50), nullable=False)  # 'certified_analyst', 'risk_master', etc.
    badge_name = db.Column(db.String(100), nullable=False)
    badge_icon = db.Column(db.String(100))
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'badge_type', name='unique_user_badge'),
    )

    # Relationships
    user = db.relationship('User', backref='badges')

class AIRecommendation(db.Model):
    __tablename__ = 'ai_recommendations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    reason = db.Column(db.Text)  # Why this course was recommended
    priority = db.Column(db.String(20), default='Medium')  # 'Low', 'Medium', 'High', 'Critical'
    is_dismissed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='ai_recommendations')
    course = db.relationship('Course', backref='recommendations')


class CourseEnrollment(db.Model):
    """Track user enrollments in courses."""
    __tablename__ = 'course_enrollments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)  # When user first opened a lesson
    completed_at = db.Column(db.DateTime)  # When user completed all lessons
    progress_percentage = db.Column(db.Float, default=0)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'course_id', name='unique_user_course_enrollment'),
    )
    
    # Relationships
    user = db.relationship('User', backref='enrollments')
    course = db.relationship('Course', backref='enrollments')


class Certificate(db.Model):
    """Certificates earned by completing courses."""
    __tablename__ = 'certificates'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    certificate_code = db.Column(db.String(50), unique=True, nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    pdf_url = db.Column(db.String(500))
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'course_id', name='unique_user_course_certificate'),
    )
    
    # Relationships
    user = db.relationship('User', backref='certificates')
    course = db.relationship('Course', backref='certificates')


class Webinar(db.Model):
    """Live webinars/masterclasses."""
    __tablename__ = 'webinars'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    thumbnail_url = db.Column(db.String(500))
    scheduled_at = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    host_name = db.Column(db.String(100))
    host_avatar_url = db.Column(db.String(500))
    is_premium = db.Column(db.Boolean, default=False)
    max_attendees = db.Column(db.Integer)
    meeting_url = db.Column(db.String(500))  # Zoom/Teams link
    replay_url = db.Column(db.String(500))  # After webinar ends
    status = db.Column(db.String(20), default='upcoming')  # upcoming, live, completed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class WebinarRegistration(db.Model):
    """Track user registrations for webinars."""
    __tablename__ = 'webinar_registrations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    webinar_id = db.Column(db.Integer, db.ForeignKey('webinars.id'), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    attended = db.Column(db.Boolean, default=False)
    attended_duration_minutes = db.Column(db.Integer, default=0)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'webinar_id', name='unique_user_webinar_registration'),
    )
    
    # Relationships
    user = db.relationship('User', backref='webinar_registrations')
    webinar = db.relationship('Webinar', backref='registrations')


class UserNote(db.Model):
    """User notes on lessons."""
    __tablename__ = 'user_notes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    video_timestamp = db.Column(db.Integer, default=0)  # Timestamp in seconds where note was taken
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='lesson_notes')
    lesson = db.relationship('Lesson', backref='user_notes')


class UserBookmark(db.Model):
    """User bookmarks on lessons."""
    __tablename__ = 'user_bookmarks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    bookmarked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'lesson_id', name='unique_user_lesson_bookmark'),
    )
    
    # Relationships
    user = db.relationship('User', backref='bookmarks')
    lesson = db.relationship('Lesson', backref='bookmarks')

