"""
Academy Routes - MasterClass Learning Center API
"""

from flask import Blueprint, request, jsonify, g
from functools import wraps
import jwt
from config import Config
from models import db, User

academy_bp = Blueprint('academy', __name__, url_prefix='/api/v1')


def token_required(f):
    """Decorator to require valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify(error='Token is missing'), 401
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            g.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify(error='Token has expired'), 401
        except jwt.InvalidTokenError:
            return jsonify(error='Invalid token'), 401
        
        return f(*args, **kwargs)
    return decorated


def token_optional(f):
    """Decorator to optionally extract user from token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        g.user_id = None
        if token:
            try:
                payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
                g.user_id = payload['user_id']
            except:
                pass
        
        return f(*args, **kwargs)
    return decorated


# ==================== COURSES ====================

@academy_bp.route('/<tenant>/academy/courses', methods=['GET'])
@token_optional
def get_courses(tenant):
    """Get all courses with optional user progress."""
    from services.academy_service import get_all_courses
    
    courses = get_all_courses(user_id=g.user_id)
    return jsonify(courses), 200


@academy_bp.route('/<tenant>/academy/courses/<int:course_id>', methods=['GET'])
@token_optional
def get_course(tenant, course_id):
    """Get detailed course information."""
    from services.academy_service import get_course_details
    
    course = get_course_details(course_id, user_id=g.user_id)
    if not course:
        return jsonify(error='Course not found'), 404
    
    return jsonify(course), 200


# ==================== LESSONS ====================

@academy_bp.route('/<tenant>/academy/lessons/<int:lesson_id>', methods=['GET'])
@token_optional
def get_lesson(tenant, lesson_id):
    """Get detailed lesson information."""
    from services.academy_service import get_lesson_details
    
    lesson = get_lesson_details(lesson_id, user_id=g.user_id)
    if not lesson:
        return jsonify(error='Lesson not found'), 404
    
    return jsonify(lesson), 200


@academy_bp.route('/<tenant>/academy/lessons/<int:lesson_id>/progress', methods=['POST'])
@token_required
def update_lesson_progress(tenant, lesson_id):
    """Update video watching progress."""
    from services.academy_service import update_video_progress
    
    data = request.get_json()
    seconds = data.get('video_progress_seconds', 0)
    
    result = update_video_progress(g.user_id, lesson_id, seconds)
    return jsonify(result), 200


@academy_bp.route('/<tenant>/academy/lessons/<int:lesson_id>/quiz', methods=['POST'])
@token_required
def submit_lesson_quiz(tenant, lesson_id):
    """Submit quiz answers."""
    from services.academy_service import submit_quiz
    
    data = request.get_json()
    answers = data.get('answers', {})
    
    if not answers:
        return jsonify(error='Answers are required'), 400
    
    result = submit_quiz(g.user_id, lesson_id, answers)
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200


# ==================== USER STATS & XP ====================

@academy_bp.route('/<tenant>/academy/me/stats', methods=['GET'])
@token_required
def get_my_stats(tenant):
    """Get current user's learning stats."""
    from services.academy_service import get_user_stats
    
    stats = get_user_stats(g.user_id)
    return jsonify(stats), 200


@academy_bp.route('/<tenant>/academy/me/progress', methods=['GET'])
@token_required
def get_my_progress(tenant):
    """Get all lesson progress for current user."""
    from models import UserProgress, Lesson, CourseModule, Course
    
    progress_records = UserProgress.query.filter_by(user_id=g.user_id).all()
    
    result = []
    for p in progress_records:
        lesson = Lesson.query.get(p.lesson_id)
        if lesson:
            module = CourseModule.query.get(lesson.module_id)
            course = Course.query.get(module.course_id) if module else None
            
            result.append({
                'lesson_id': p.lesson_id,
                'lesson_title': lesson.title,
                'course_title': course.title if course else 'Unknown',
                'completed': p.completed,
                'quiz_score': p.quiz_score,
                'quiz_passed': p.quiz_passed,
                'video_progress': p.video_progress_seconds,
                'completed_at': p.completed_at.isoformat() if p.completed_at else None
            })
    
    return jsonify(result), 200


# ==================== AI RECOMMENDATIONS ====================

@academy_bp.route('/<tenant>/academy/me/recommendations', methods=['GET'])
@token_required
def get_my_recommendations(tenant):
    """Get AI-powered course recommendations."""
    from services.academy_service import get_user_recommendations
    
    recommendations = get_user_recommendations(g.user_id)
    return jsonify(recommendations), 200


@academy_bp.route('/<tenant>/academy/me/recommendations/analyze', methods=['POST'])
@token_required
def analyze_and_recommend(tenant):
    """Trigger AI analysis of trading patterns and get recommendations."""
    from services.academy_service import analyze_trade_patterns
    
    recommendations = analyze_trade_patterns(g.user_id)
    return jsonify({
        'message': 'Analysis complete',
        'recommendations': recommendations
    }), 200


@academy_bp.route('/<tenant>/academy/me/recommendations/<int:rec_id>/dismiss', methods=['POST'])
@token_required
def dismiss_recommendation(tenant, rec_id):
    """Dismiss a recommendation."""
    from models import AIRecommendation
    
    rec = AIRecommendation.query.filter_by(id=rec_id, user_id=g.user_id).first()
    if not rec:
        return jsonify(error='Recommendation not found'), 404
    
    rec.is_dismissed = True
    db.session.commit()
    
    return jsonify({'message': 'Recommendation dismissed'}), 200


# ==================== BADGES ====================

@academy_bp.route('/<tenant>/academy/me/badges', methods=['GET'])
@token_required
def get_my_badges(tenant):
    """Get all badges earned by current user."""
    from models import UserBadge
    
    badges = UserBadge.query.filter_by(user_id=g.user_id).all()
    
    return jsonify([{
        'id': b.id,
        'badge_type': b.badge_type,
        'badge_name': b.badge_name,
        'badge_icon': b.badge_icon,
        'earned_at': b.earned_at.isoformat()
    } for b in badges]), 200


@academy_bp.route('/<tenant>/users/<int:user_id>/badges', methods=['GET'])
def get_user_badges(tenant, user_id):
    """Get badges for a specific user (public)."""
    from models import UserBadge
    
    badges = UserBadge.query.filter_by(user_id=user_id).all()
    
    return jsonify([{
        'badge_type': b.badge_type,
        'badge_name': b.badge_name,
        'badge_icon': b.badge_icon,
        'earned_at': b.earned_at.isoformat()
    } for b in badges]), 200


# ==================== ENROLLMENTS ====================

@academy_bp.route('/<tenant>/academy/courses/<int:course_id>/enroll', methods=['POST'])
@token_required
def enroll_in_course(tenant, course_id):
    """Enroll in a course."""
    from services.academy_service import enroll_in_course as do_enroll
    
    result = do_enroll(g.user_id, course_id)
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 201


@academy_bp.route('/<tenant>/academy/me/enrollments', methods=['GET'])
@token_required
def get_my_enrollments(tenant):
    """Get all course enrollments for current user."""
    from services.academy_service import get_user_enrollments
    
    enrollments = get_user_enrollments(g.user_id)
    return jsonify(enrollments), 200


# ==================== CERTIFICATES ====================

@academy_bp.route('/<tenant>/academy/me/certificates', methods=['GET'])
@token_required
def get_my_certificates(tenant):
    """Get all certificates earned by current user."""
    from services.academy_service import get_user_certificates
    
    certificates = get_user_certificates(g.user_id)
    return jsonify(certificates), 200


@academy_bp.route('/<tenant>/academy/certificates/verify/<certificate_code>', methods=['GET'])
def verify_certificate(tenant, certificate_code):
    """Verify a certificate by its code (public)."""
    from services.academy_service import verify_certificate as do_verify
    
    result = do_verify(certificate_code)
    return jsonify(result), 200 if result['valid'] else 404


# ==================== WEBINARS ====================

@academy_bp.route('/<tenant>/academy/webinars', methods=['GET'])
@token_optional
def get_webinars(tenant):
    """Get all upcoming webinars."""
    from services.academy_service import get_upcoming_webinars
    
    webinars = get_upcoming_webinars(user_id=g.user_id)
    return jsonify(webinars), 200


@academy_bp.route('/<tenant>/academy/webinars/past', methods=['GET'])
def get_past_webinars(tenant):
    """Get past webinars with replays."""
    from services.academy_service import get_past_webinars as get_past
    
    webinars = get_past()
    return jsonify(webinars), 200


@academy_bp.route('/<tenant>/academy/webinars/<int:webinar_id>/register', methods=['POST'])
@token_required
def register_for_webinar(tenant, webinar_id):
    """Register for a webinar."""
    from services.academy_service import register_for_webinar as do_register
    
    result = do_register(g.user_id, webinar_id)
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 201


@academy_bp.route('/<tenant>/academy/webinars/<int:webinar_id>/unregister', methods=['DELETE'])
@token_required
def unregister_from_webinar(tenant, webinar_id):
    """Unregister from a webinar."""
    from services.academy_service import unregister_from_webinar as do_unregister
    
    result = do_unregister(g.user_id, webinar_id)
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200


@academy_bp.route('/<tenant>/academy/me/webinars', methods=['GET'])
@token_required
def get_my_webinar_registrations(tenant):
    """Get all webinar registrations for current user."""
    from services.academy_service import get_user_webinar_registrations
    
    registrations = get_user_webinar_registrations(g.user_id)
    return jsonify(registrations), 200


# ==================== NOTES ====================

@academy_bp.route('/<tenant>/academy/lessons/<int:lesson_id>/notes', methods=['GET'])
@token_required
def get_lesson_notes(tenant, lesson_id):
    """Get all notes for a lesson."""
    from services.academy_service import get_lesson_notes as get_notes
    
    notes = get_notes(g.user_id, lesson_id)
    return jsonify(notes), 200


@academy_bp.route('/<tenant>/academy/lessons/<int:lesson_id>/notes', methods=['POST'])
@token_required
def add_lesson_note(tenant, lesson_id):
    """Add a note to a lesson."""
    from services.academy_service import add_note
    
    data = request.get_json()
    content = data.get('content', '').strip()
    timestamp = data.get('video_timestamp', 0)
    
    if not content:
        return jsonify(error='Note content is required'), 400
    
    result = add_note(g.user_id, lesson_id, content, timestamp)
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 201


@academy_bp.route('/<tenant>/academy/notes/<int:note_id>', methods=['PUT'])
@token_required
def update_note(tenant, note_id):
    """Update a note."""
    from services.academy_service import update_note as do_update
    
    data = request.get_json()
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify(error='Note content is required'), 400
    
    result = do_update(note_id, g.user_id, content)
    if 'error' in result:
        return jsonify(result), 404
    
    return jsonify(result), 200


@academy_bp.route('/<tenant>/academy/notes/<int:note_id>', methods=['DELETE'])
@token_required
def delete_note(tenant, note_id):
    """Delete a note."""
    from services.academy_service import delete_note as do_delete
    
    result = do_delete(note_id, g.user_id)
    if 'error' in result:
        return jsonify(result), 404
    
    return jsonify(result), 200


@academy_bp.route('/<tenant>/academy/me/notes', methods=['GET'])
@token_required
def get_all_my_notes(tenant):
    """Get all notes for current user."""
    from services.academy_service import get_all_user_notes
    
    notes = get_all_user_notes(g.user_id)
    return jsonify(notes), 200


# ==================== BOOKMARKS ====================

@academy_bp.route('/<tenant>/academy/lessons/<int:lesson_id>/bookmark', methods=['POST'])
@token_required
def toggle_lesson_bookmark(tenant, lesson_id):
    """Toggle bookmark on a lesson."""
    from services.academy_service import toggle_bookmark
    
    result = toggle_bookmark(g.user_id, lesson_id)
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200


@academy_bp.route('/<tenant>/academy/me/bookmarks', methods=['GET'])
@token_required
def get_my_bookmarks(tenant):
    """Get all bookmarks for current user."""
    from services.academy_service import get_user_bookmarks
    
    bookmarks = get_user_bookmarks(g.user_id)
    return jsonify(bookmarks), 200


# ==================== SEARCH ====================

@academy_bp.route('/<tenant>/academy/search', methods=['GET'])
def search_courses(tenant):
    """Search courses."""
    from services.academy_service import search_courses as do_search
    
    query = request.args.get('q', '')
    difficulty = request.args.get('difficulty')
    is_premium = request.args.get('is_premium')
    
    filters = {}
    if difficulty:
        filters['difficulty'] = difficulty
    if is_premium is not None:
        filters['is_premium'] = is_premium.lower() == 'true'
    
    courses = do_search(query, filters if filters else None)
    return jsonify(courses), 200


# ==================== LEADERBOARD ====================

@academy_bp.route('/<tenant>/academy/courses/<int:course_id>/leaderboard', methods=['GET'])
def get_course_leaderboard(tenant, course_id):
    """Get leaderboard for a course."""
    from services.academy_service import get_course_leaderboard as get_leaderboard
    
    limit = request.args.get('limit', 10, type=int)
    leaderboard = get_leaderboard(course_id, limit)
    return jsonify(leaderboard), 200


# ==================== SEED DATA ====================

@academy_bp.route('/<tenant>/academy/seed', methods=['POST'])
def seed_academy(tenant):
    """Seed academy with sample data (development only)."""
    from services.academy_service import seed_academy_data
    
    result = seed_academy_data()
    return jsonify({'message': result}), 200


# ==================== SEED WEBINARS ====================

@academy_bp.route('/<tenant>/academy/seed-webinars', methods=['POST'])
def seed_webinars(tenant):
    """Seed sample webinars (development only)."""
    from models import Webinar
    from datetime import datetime, timedelta
    
    if Webinar.query.first():
        return jsonify({'message': 'Webinars already seeded'}), 200
    
    webinars = [
        Webinar(
            title="MasterClass: Analyse Technique Avancée",
            description="Apprenez les techniques d'analyse technique utilisées par les traders professionnels.",
            thumbnail_url="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
            scheduled_at=datetime.utcnow() + timedelta(days=3),
            duration_minutes=90,
            host_name="Ahmed Benali",
            host_avatar_url="https://randomuser.me/api/portraits/men/32.jpg",
            is_premium=False,
            max_attendees=100,
            status='upcoming'
        ),
        Webinar(
            title="Live Trading: Session Forex",
            description="Tradez en direct avec notre équipe d'experts sur les paires majeures.",
            thumbnail_url="https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800",
            scheduled_at=datetime.utcnow() + timedelta(days=7),
            duration_minutes=120,
            host_name="Sarah Tazi",
            host_avatar_url="https://randomuser.me/api/portraits/women/44.jpg",
            is_premium=True,
            max_attendees=50,
            status='upcoming'
        ),
        Webinar(
            title="Q&A: Vos Questions Trading",
            description="Posez toutes vos questions à notre équipe d'experts.",
            thumbnail_url="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
            scheduled_at=datetime.utcnow() + timedelta(days=14),
            duration_minutes=60,
            host_name="Karim Alaoui",
            host_avatar_url="https://randomuser.me/api/portraits/men/67.jpg",
            is_premium=False,
            max_attendees=200,
            status='upcoming'
        )
    ]
    
    for w in webinars:
        db.session.add(w)
    db.session.commit()
    
    return jsonify({'message': 'Webinars seeded successfully'}), 200
