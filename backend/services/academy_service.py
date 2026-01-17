"""
Academy Service - MasterClass Learning Center
Handles course management, progress tracking, and AI-powered recommendations.
"""

from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from models import (
    db, User, Course, CourseModule, Lesson, LessonQuiz,
    UserProgress, UserXP, UserBadge, AIRecommendation, Trade, Challenge,
    CourseEnrollment, Certificate, Webinar, WebinarRegistration,
    UserNote, UserBookmark
)
import json
import uuid


# ==================== XP & LEVEL SYSTEM ====================

XP_PER_LEVEL = 500  # XP needed per level
BADGE_THRESHOLDS = {
    'certified_analyst': {'xp': 1000, 'name': 'Certified Analyst', 'icon': '📊'},
    'risk_master': {'xp': 2500, 'name': 'Risk Master', 'icon': '🛡️'},
    'trading_expert': {'xp': 5000, 'name': 'Trading Expert', 'icon': '🏆'},
    'elite_trader': {'xp': 10000, 'name': 'Elite Trader', 'icon': '👑'},
}


def get_or_create_user_xp(user_id):
    """Get or create UserXP record for a user."""
    user_xp = UserXP.query.filter_by(user_id=user_id).first()
    if not user_xp:
        user_xp = UserXP(user_id=user_id, total_xp=0, level=1)
        db.session.add(user_xp)
        db.session.commit()
    return user_xp


def add_xp(user_id, xp_amount):
    """Add XP to user and check for level ups and badges."""
    user_xp = get_or_create_user_xp(user_id)
    user_xp.total_xp += xp_amount
    user_xp.level = (user_xp.total_xp // XP_PER_LEVEL) + 1
    
    # Check for badge unlocks
    check_and_award_badges(user_id, user_xp.total_xp)
    
    db.session.commit()
    return user_xp


def check_and_award_badges(user_id, total_xp):
    """Check if user qualifies for any new badges."""
    existing_badges = {b.badge_type for b in UserBadge.query.filter_by(user_id=user_id).all()}
    
    for badge_type, badge_info in BADGE_THRESHOLDS.items():
        if badge_type not in existing_badges and total_xp >= badge_info['xp']:
            new_badge = UserBadge(
                user_id=user_id,
                badge_type=badge_type,
                badge_name=badge_info['name'],
                badge_icon=badge_info['icon']
            )
            db.session.add(new_badge)


def get_user_stats(user_id):
    """Get comprehensive user learning stats."""
    user_xp = get_or_create_user_xp(user_id)
    badges = UserBadge.query.filter_by(user_id=user_id).all()
    
    # Calculate progress
    total_lessons = Lesson.query.count()
    completed_lessons = UserProgress.query.filter_by(
        user_id=user_id, completed=True
    ).count()
    
    # Get current lesson (last in progress)
    current_progress = UserProgress.query.filter(
        UserProgress.user_id == user_id,
        UserProgress.completed == False
    ).order_by(UserProgress.updated_at.desc()).first()
    
    current_lesson = None
    if current_progress:
        lesson = Lesson.query.get(current_progress.lesson_id)
        if lesson:
            module = CourseModule.query.get(lesson.module_id)
            course = Course.query.get(module.course_id) if module else None
            current_lesson = {
                'id': lesson.id,
                'title': lesson.title,
                'course_title': course.title if course else 'Unknown',
                'video_progress': current_progress.video_progress_seconds
            }
    
    return {
        'total_xp': user_xp.total_xp,
        'level': user_xp.level,
        'xp_for_next_level': XP_PER_LEVEL - (user_xp.total_xp % XP_PER_LEVEL),
        'progress_percent': (user_xp.total_xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100,
        'completed_lessons': completed_lessons,
        'total_lessons': total_lessons,
        'completion_rate': (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0,
        'badges': [{'type': b.badge_type, 'name': b.badge_name, 'icon': b.badge_icon, 'earned_at': b.earned_at.isoformat()} for b in badges],
        'current_lesson': current_lesson
    }


# ==================== COURSE MANAGEMENT ====================

def get_all_courses(user_id=None):
    """Get all courses with user progress if user_id provided."""
    courses = Course.query.order_by(Course.order_index).all()
    result = []
    
    for course in courses:
        course_data = {
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'thumbnail_url': course.thumbnail_url,
            'preview_video_url': course.preview_video_url,
            'difficulty': course.difficulty,
            'tags': course.get_tags(),
            'is_premium': course.is_premium,
            'xp_reward': course.xp_reward,
            'duration_minutes': course.duration_minutes,
            'modules_count': len(course.modules),
            'lessons_count': sum(len(m.lessons) for m in course.modules)
        }
        
        if user_id:
            # Calculate user progress for this course
            lesson_ids = [l.id for m in course.modules for l in m.lessons]
            if lesson_ids:
                completed = UserProgress.query.filter(
                    UserProgress.user_id == user_id,
                    UserProgress.lesson_id.in_(lesson_ids),
                    UserProgress.completed == True
                ).count()
                course_data['user_progress'] = (completed / len(lesson_ids)) * 100
                course_data['completed_lessons'] = completed
            else:
                course_data['user_progress'] = 0
                course_data['completed_lessons'] = 0
        
        result.append(course_data)
    
    return result


def get_course_details(course_id, user_id=None):
    """Get detailed course information with modules and lessons."""
    course = Course.query.get(course_id)
    if not course:
        return None
    
    modules_data = []
    for module in course.modules:
        lessons_data = []
        for lesson in module.lessons:
            lesson_data = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'duration_minutes': lesson.duration_minutes,
                'xp_reward': lesson.xp_reward,
                'has_quiz': len(lesson.quizzes) > 0
            }
            
            if user_id:
                progress = UserProgress.query.filter_by(
                    user_id=user_id, lesson_id=lesson.id
                ).first()
                if progress:
                    lesson_data['completed'] = progress.completed
                    lesson_data['quiz_passed'] = progress.quiz_passed
                    lesson_data['video_progress'] = progress.video_progress_seconds
                else:
                    lesson_data['completed'] = False
                    lesson_data['quiz_passed'] = False
                    lesson_data['video_progress'] = 0
            
            lessons_data.append(lesson_data)
        
        modules_data.append({
            'id': module.id,
            'title': module.title,
            'description': module.description,
            'lessons': lessons_data
        })
    
    return {
        'id': course.id,
        'title': course.title,
        'description': course.description,
        'thumbnail_url': course.thumbnail_url,
        'difficulty': course.difficulty,
        'tags': course.get_tags(),
        'is_premium': course.is_premium,
        'xp_reward': course.xp_reward,
        'duration_minutes': course.duration_minutes,
        'modules': modules_data
    }


def get_lesson_details(lesson_id, user_id=None):
    """Get detailed lesson information with quiz."""
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return None
    
    module = CourseModule.query.get(lesson.module_id)
    course = Course.query.get(module.course_id) if module else None
    
    quiz_data = []
    for quiz in lesson.quizzes:
        quiz_data.append({
            'id': quiz.id,
            'question': quiz.question,
            'options': quiz.get_options(),
            # Don't send correct answer to frontend
        })
    
    lesson_data = {
        'id': lesson.id,
        'title': lesson.title,
        'description': lesson.description,
        'video_url': lesson.video_url,
        'duration_minutes': lesson.duration_minutes,
        'content_markdown': lesson.content_markdown,
        'chapter_markers': lesson.get_chapter_markers(),
        'xp_reward': lesson.xp_reward,
        'quiz': quiz_data,
        'course': {
            'id': course.id,
            'title': course.title
        } if course else None,
        'module': {
            'id': module.id,
            'title': module.title
        } if module else None
    }
    
    if user_id:
        progress = UserProgress.query.filter_by(
            user_id=user_id, lesson_id=lesson.id
        ).first()
        if progress:
            lesson_data['user_progress'] = {
                'completed': progress.completed,
                'quiz_score': progress.quiz_score,
                'quiz_passed': progress.quiz_passed,
                'video_progress': progress.video_progress_seconds
            }
    
    return lesson_data


# ==================== PROGRESS TRACKING ====================

def update_video_progress(user_id, lesson_id, seconds):
    """Update video watching progress."""
    progress = UserProgress.query.filter_by(
        user_id=user_id, lesson_id=lesson_id
    ).first()
    
    if not progress:
        progress = UserProgress(user_id=user_id, lesson_id=lesson_id)
        db.session.add(progress)
    
    progress.video_progress_seconds = max(progress.video_progress_seconds, seconds)
    db.session.commit()
    
    return {'video_progress': progress.video_progress_seconds}


def submit_quiz(user_id, lesson_id, answers):
    """
    Submit quiz answers and calculate score.
    answers: dict of {quiz_id: selected_option_index}
    Returns score and whether lesson is now completed.
    """
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return {'error': 'Lesson not found'}
    
    quizzes = {q.id: q for q in lesson.quizzes}
    if not quizzes:
        return {'error': 'No quiz for this lesson'}
    
    correct = 0
    total = len(quizzes)
    results = []
    
    for quiz_id, selected_index in answers.items():
        quiz = quizzes.get(int(quiz_id))
        if quiz:
            is_correct = quiz.correct_answer_index == selected_index
            if is_correct:
                correct += 1
            results.append({
                'quiz_id': quiz_id,
                'correct': is_correct,
                'correct_answer': quiz.correct_answer_index,
                'explanation': quiz.explanation
            })
    
    score = (correct / total) * 100 if total > 0 else 0
    passed = score >= 80
    
    # Update progress
    progress = UserProgress.query.filter_by(
        user_id=user_id, lesson_id=lesson_id
    ).first()
    
    if not progress:
        progress = UserProgress(user_id=user_id, lesson_id=lesson_id)
        db.session.add(progress)
    
    progress.quiz_score = score
    progress.quiz_passed = passed
    
    # Mark as completed if quiz passed
    if passed and not progress.completed:
        progress.completed = True
        progress.completed_at = datetime.utcnow()
        # Award XP
        add_xp(user_id, lesson.xp_reward)
    
    db.session.commit()
    
    return {
        'score': score,
        'passed': passed,
        'correct_count': correct,
        'total_count': total,
        'results': results,
        'xp_earned': lesson.xp_reward if passed else 0
    }


# ==================== AI RECOMMENDATION ENGINE ====================

class SmartRecommendationEngine:
    """
    AI-powered recommendation engine that analyzes trading patterns
    and suggests appropriate courses to improve trading performance.
    """
    
    COURSE_TAGS = {
        'technical': 'Analyse Technique',
        'risk': 'Gestion des Risques',
        'psychology': 'Psychologie du Trading',
        'fundamental': 'Analyse Fondamentale',
        'strategy': 'Stratégies Avancées'
    }
    
    def __init__(self, user_id):
        self.user_id = user_id
        self.recommendations = []
    
    def analyze_trade_patterns(self):
        """
        Analyze user's trading patterns and generate course recommendations.
        Returns list of recommended courses with reasons.
        """
        # Get user's recent trades
        trades = self._get_recent_trades(limit=50)
        
        if not trades:
            # New user - recommend beginner courses
            self._recommend_beginner_courses()
            return self._finalize_recommendations()
        
        # Calculate trading metrics
        metrics = self._calculate_metrics(trades)
        
        # Apply recommendation rules
        self._apply_win_rate_rules(metrics)
        self._apply_risk_management_rules(metrics)
        self._apply_consistency_rules(metrics)
        self._apply_drawdown_rules(metrics)
        
        return self._finalize_recommendations()
    
    def _get_recent_trades(self, limit=50):
        """Get user's recent trades from challenges."""
        challenges = Challenge.query.filter_by(user_id=self.user_id).all()
        if not challenges:
            return []
        
        challenge_ids = [c.id for c in challenges]
        trades = Trade.query.filter(
            Trade.challenge_id.in_(challenge_ids)
        ).order_by(Trade.executed_at.desc()).limit(limit).all()
        
        return trades
    
    def _calculate_metrics(self, trades):
        """Calculate key trading metrics."""
        if not trades:
            return {}
        
        # Simulated P&L calculation (in real app, this would be more sophisticated)
        wins = 0
        losses = 0
        total_profit = 0
        total_loss = 0
        consecutive_losses = 0
        max_consecutive_losses = 0
        current_streak = 0
        
        for i, trade in enumerate(trades):
            # Simplified: assume alternating wins/losses based on trade properties
            # In real app, calculate actual P&L from trade data
            simulated_pnl = (hash(str(trade.id)) % 200) - 100  # Random-ish P&L
            
            if simulated_pnl > 0:
                wins += 1
                total_profit += simulated_pnl
                consecutive_losses = 0
                current_streak = 1
            else:
                losses += 1
                total_loss += abs(simulated_pnl)
                consecutive_losses += 1
                max_consecutive_losses = max(max_consecutive_losses, consecutive_losses)
                current_streak = -consecutive_losses
        
        total_trades = wins + losses
        win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
        avg_win = total_profit / wins if wins > 0 else 0
        avg_loss = total_loss / losses if losses > 0 else 0
        profit_factor = total_profit / total_loss if total_loss > 0 else 0
        
        return {
            'total_trades': total_trades,
            'wins': wins,
            'losses': losses,
            'win_rate': win_rate,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'profit_factor': profit_factor,
            'max_consecutive_losses': max_consecutive_losses,
            'current_streak': current_streak
        }
    
    def _apply_win_rate_rules(self, metrics):
        """Apply win rate based recommendations."""
        win_rate = metrics.get('win_rate', 0)
        
        if win_rate < 40:
            self._add_recommendation(
                tag='technical',
                reason=f"Votre taux de réussite est de {win_rate:.1f}% (< 40%). Améliorez vos compétences en analyse technique.",
                priority='High'
            )
        elif win_rate < 50:
            self._add_recommendation(
                tag='strategy',
                reason=f"Votre taux de réussite de {win_rate:.1f}% peut être amélioré avec des stratégies plus avancées.",
                priority='Medium'
            )
    
    def _apply_risk_management_rules(self, metrics):
        """Apply risk management based recommendations."""
        avg_loss = metrics.get('avg_loss', 0)
        avg_win = metrics.get('avg_win', 0)
        
        # If average loss is greater than average win
        if avg_loss > avg_win * 1.5:
            self._add_recommendation(
                tag='risk',
                reason=f"Vos pertes moyennes ({avg_loss:.0f}) dépassent vos gains ({avg_win:.0f}). Maîtrisez la gestion des risques.",
                priority='Critical'
            )
        
        # Max allowed loss rule
        max_allowed_loss = 100  # Example threshold
        if avg_loss > max_allowed_loss:
            self._add_recommendation(
                tag='risk',
                reason=f"Perte moyenne ({avg_loss:.0f}) > seuil autorisé ({max_allowed_loss}). Cours de gestion des risques recommandé.",
                priority='High'
            )
    
    def _apply_consistency_rules(self, metrics):
        """Apply trading consistency rules."""
        max_consecutive_losses = metrics.get('max_consecutive_losses', 0)
        
        if max_consecutive_losses >= 5:
            self._add_recommendation(
                tag='psychology',
                reason=f"Vous avez eu {max_consecutive_losses} pertes consécutives. Travaillez sur la psychologie du trading.",
                priority='High'
            )
    
    def _apply_drawdown_rules(self, metrics):
        """Apply drawdown-based rules."""
        profit_factor = metrics.get('profit_factor', 0)
        
        if profit_factor < 1:
            self._add_recommendation(
                tag='fundamental',
                reason=f"Facteur de profit de {profit_factor:.2f}. Renforcez vos bases avec l'analyse fondamentale.",
                priority='Medium'
            )
    
    def _recommend_beginner_courses(self):
        """Recommend beginner courses for new users."""
        self._add_recommendation(
            tag='technical',
            reason="Nouveau trader ? Commencez par les bases de l'analyse technique.",
            priority='Medium'
        )
        self._add_recommendation(
            tag='risk',
            reason="La gestion des risques est essentielle pour tout trader débutant.",
            priority='Medium'
        )
    
    def _add_recommendation(self, tag, reason, priority='Medium'):
        """Add a recommendation to the list."""
        # Find courses with this tag
        courses = Course.query.all()
        for course in courses:
            if tag in course.get_tags():
                # Check if already recommended
                existing = next((r for r in self.recommendations if r['course_id'] == course.id), None)
                if not existing:
                    self.recommendations.append({
                        'course_id': course.id,
                        'course_title': course.title,
                        'tag': tag,
                        'reason': reason,
                        'priority': priority
                    })
                    break
    
    def _finalize_recommendations(self):
        """Save recommendations to database and return them."""
        # Clear old recommendations
        AIRecommendation.query.filter_by(user_id=self.user_id).delete()
        
        # Priority order
        priority_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
        self.recommendations.sort(key=lambda x: priority_order.get(x['priority'], 99))
        
        # Save new recommendations
        for rec in self.recommendations[:5]:  # Top 5 recommendations
            ai_rec = AIRecommendation(
                user_id=self.user_id,
                course_id=rec['course_id'],
                reason=rec['reason'],
                priority=rec['priority']
            )
            db.session.add(ai_rec)
        
        db.session.commit()
        
        return self.recommendations[:5]


def analyze_trade_patterns(user_id):
    """Convenience function to run AI analysis."""
    engine = SmartRecommendationEngine(user_id)
    return engine.analyze_trade_patterns()


def get_user_recommendations(user_id):
    """Get stored AI recommendations for a user."""
    recommendations = AIRecommendation.query.filter_by(
        user_id=user_id, is_dismissed=False
    ).order_by(AIRecommendation.created_at.desc()).all()
    
    return [{
        'id': r.id,
        'course_id': r.course_id,
        'course': {
            'id': r.course.id,
            'title': r.course.title,
            'thumbnail_url': r.course.thumbnail_url,
            'difficulty': r.course.difficulty
        },
        'reason': r.reason,
        'priority': r.priority,
        'created_at': r.created_at.isoformat()
    } for r in recommendations]


# ==================== COURSE ENROLLMENT ====================

def enroll_in_course(user_id, course_id):
    """Enroll a user in a course."""
    # Check if already enrolled
    existing = CourseEnrollment.query.filter_by(
        user_id=user_id, course_id=course_id
    ).first()
    
    if existing:
        return {'error': 'Already enrolled in this course', 'enrollment': serialize_enrollment(existing)}
    
    course = Course.query.get(course_id)
    if not course:
        return {'error': 'Course not found'}
    
    enrollment = CourseEnrollment(
        user_id=user_id,
        course_id=course_id
    )
    db.session.add(enrollment)
    db.session.commit()
    
    return {'success': True, 'enrollment': serialize_enrollment(enrollment)}


def serialize_enrollment(enrollment):
    """Serialize an enrollment for API response."""
    return {
        'id': enrollment.id,
        'course_id': enrollment.course_id,
        'enrolled_at': enrollment.enrolled_at.isoformat(),
        'started_at': enrollment.started_at.isoformat() if enrollment.started_at else None,
        'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None,
        'progress_percentage': enrollment.progress_percentage
    }


def get_user_enrollments(user_id):
    """Get all enrollments for a user."""
    enrollments = CourseEnrollment.query.filter_by(user_id=user_id).order_by(
        CourseEnrollment.enrolled_at.desc()
    ).all()
    
    result = []
    for e in enrollments:
        course = Course.query.get(e.course_id)
        if course:
            result.append({
                'enrollment': serialize_enrollment(e),
                'course': {
                    'id': course.id,
                    'title': course.title,
                    'thumbnail_url': course.thumbnail_url,
                    'difficulty': course.difficulty
                }
            })
    return result


def update_enrollment_progress(user_id, course_id):
    """Update enrollment progress based on lesson completions."""
    enrollment = CourseEnrollment.query.filter_by(
        user_id=user_id, course_id=course_id
    ).first()
    
    if not enrollment:
        return
    
    course = Course.query.get(course_id)
    if not course:
        return
    
    lesson_ids = [l.id for m in course.modules for l in m.lessons]
    if not lesson_ids:
        return
    
    completed = UserProgress.query.filter(
        UserProgress.user_id == user_id,
        UserProgress.lesson_id.in_(lesson_ids),
        UserProgress.completed == True
    ).count()
    
    enrollment.progress_percentage = (completed / len(lesson_ids)) * 100
    
    # Mark started if first lesson is accessed
    if not enrollment.started_at and completed > 0:
        enrollment.started_at = datetime.utcnow()
    
    # Mark completed if all lessons done
    if completed == len(lesson_ids) and not enrollment.completed_at:
        enrollment.completed_at = datetime.utcnow()
        # Award certificate
        issue_certificate(user_id, course_id)
    
    db.session.commit()


# ==================== CERTIFICATES ====================

def issue_certificate(user_id, course_id):
    """Issue a certificate for completing a course."""
    # Check if already has certificate
    existing = Certificate.query.filter_by(
        user_id=user_id, course_id=course_id
    ).first()
    
    if existing:
        return existing
    
    course = Course.query.get(course_id)
    if not course:
        return None
    
    # Generate unique certificate code
    cert_code = f"TS-{course_id:03d}-{user_id:05d}-{uuid.uuid4().hex[:8].upper()}"
    
    certificate = Certificate(
        user_id=user_id,
        course_id=course_id,
        certificate_code=cert_code
    )
    db.session.add(certificate)
    db.session.commit()
    
    # Award bonus XP for certification
    add_xp(user_id, course.xp_reward)
    
    return certificate


def get_user_certificates(user_id):
    """Get all certificates for a user."""
    certificates = Certificate.query.filter_by(user_id=user_id).order_by(
        Certificate.earned_at.desc()
    ).all()
    
    return [{
        'id': c.id,
        'certificate_code': c.certificate_code,
        'earned_at': c.earned_at.isoformat(),
        'course': {
            'id': c.course.id,
            'title': c.course.title,
            'thumbnail_url': c.course.thumbnail_url,
            'difficulty': c.course.difficulty
        }
    } for c in certificates]


def verify_certificate(certificate_code):
    """Verify a certificate by its code."""
    cert = Certificate.query.filter_by(certificate_code=certificate_code).first()
    
    if not cert:
        return {'valid': False, 'message': 'Certificate not found'}
    
    user = User.query.get(cert.user_id)
    course = Course.query.get(cert.course_id)
    
    return {
        'valid': True,
        'certificate': {
            'code': cert.certificate_code,
            'earned_at': cert.earned_at.isoformat(),
            'holder': user.name if user else 'Unknown',
            'course': course.title if course else 'Unknown'
        }
    }


# ==================== WEBINARS ====================

def get_upcoming_webinars(user_id=None):
    """Get all upcoming webinars."""
    now = datetime.utcnow()
    webinars = Webinar.query.filter(
        Webinar.scheduled_at > now,
        Webinar.status.in_(['upcoming', 'live'])
    ).order_by(Webinar.scheduled_at).all()
    
    result = []
    for w in webinars:
        webinar_data = serialize_webinar(w)
        
        if user_id:
            registration = WebinarRegistration.query.filter_by(
                user_id=user_id, webinar_id=w.id
            ).first()
            webinar_data['is_registered'] = registration is not None
            webinar_data['registration'] = serialize_registration(registration) if registration else None
        
        result.append(webinar_data)
    
    return result


def get_past_webinars():
    """Get past webinars with replays."""
    webinars = Webinar.query.filter(
        Webinar.status == 'completed',
        Webinar.replay_url.isnot(None)
    ).order_by(Webinar.scheduled_at.desc()).limit(10).all()
    
    return [serialize_webinar(w) for w in webinars]


def serialize_webinar(webinar):
    """Serialize a webinar for API response."""
    return {
        'id': webinar.id,
        'title': webinar.title,
        'description': webinar.description,
        'thumbnail_url': webinar.thumbnail_url,
        'scheduled_at': webinar.scheduled_at.isoformat(),
        'duration_minutes': webinar.duration_minutes,
        'host_name': webinar.host_name,
        'host_avatar_url': webinar.host_avatar_url,
        'is_premium': webinar.is_premium,
        'max_attendees': webinar.max_attendees,
        'current_registrations': len(webinar.registrations) if webinar.registrations else 0,
        'status': webinar.status,
        'replay_url': webinar.replay_url
    }


def serialize_registration(registration):
    """Serialize a registration for API response."""
    if not registration:
        return None
    return {
        'id': registration.id,
        'registered_at': registration.registered_at.isoformat(),
        'attended': registration.attended
    }


def register_for_webinar(user_id, webinar_id):
    """Register a user for a webinar."""
    webinar = Webinar.query.get(webinar_id)
    if not webinar:
        return {'error': 'Webinar not found'}
    
    if webinar.status not in ['upcoming', 'live']:
        return {'error': 'Webinar is not accepting registrations'}
    
    # Check max attendees
    if webinar.max_attendees:
        current_count = WebinarRegistration.query.filter_by(webinar_id=webinar_id).count()
        if current_count >= webinar.max_attendees:
            return {'error': 'Webinar is full'}
    
    # Check if already registered
    existing = WebinarRegistration.query.filter_by(
        user_id=user_id, webinar_id=webinar_id
    ).first()
    
    if existing:
        return {'error': 'Already registered', 'registration': serialize_registration(existing)}
    
    registration = WebinarRegistration(
        user_id=user_id,
        webinar_id=webinar_id
    )
    db.session.add(registration)
    db.session.commit()
    
    return {'success': True, 'registration': serialize_registration(registration)}


def unregister_from_webinar(user_id, webinar_id):
    """Unregister a user from a webinar."""
    registration = WebinarRegistration.query.filter_by(
        user_id=user_id, webinar_id=webinar_id
    ).first()
    
    if not registration:
        return {'error': 'Not registered for this webinar'}
    
    db.session.delete(registration)
    db.session.commit()
    
    return {'success': True}


def get_user_webinar_registrations(user_id):
    """Get all webinar registrations for a user."""
    registrations = WebinarRegistration.query.filter_by(user_id=user_id).all()
    
    result = []
    for r in registrations:
        webinar = Webinar.query.get(r.webinar_id)
        if webinar:
            result.append({
                'registration': serialize_registration(r),
                'webinar': serialize_webinar(webinar)
            })
    return result


# ==================== NOTES & BOOKMARKS ====================

def add_note(user_id, lesson_id, content, video_timestamp=0):
    """Add a note to a lesson."""
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return {'error': 'Lesson not found'}
    
    note = UserNote(
        user_id=user_id,
        lesson_id=lesson_id,
        content=content,
        video_timestamp=video_timestamp
    )
    db.session.add(note)
    db.session.commit()
    
    return {'success': True, 'note': serialize_note(note)}


def update_note(note_id, user_id, content):
    """Update a note."""
    note = UserNote.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return {'error': 'Note not found'}
    
    note.content = content
    db.session.commit()
    
    return {'success': True, 'note': serialize_note(note)}


def delete_note(note_id, user_id):
    """Delete a note."""
    note = UserNote.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return {'error': 'Note not found'}
    
    db.session.delete(note)
    db.session.commit()
    
    return {'success': True}


def get_lesson_notes(user_id, lesson_id):
    """Get all notes for a lesson."""
    notes = UserNote.query.filter_by(
        user_id=user_id, lesson_id=lesson_id
    ).order_by(UserNote.video_timestamp).all()
    
    return [serialize_note(n) for n in notes]


def get_all_user_notes(user_id):
    """Get all notes for a user."""
    notes = UserNote.query.filter_by(user_id=user_id).order_by(
        UserNote.created_at.desc()
    ).all()
    
    result = []
    for n in notes:
        lesson = Lesson.query.get(n.lesson_id)
        note_data = serialize_note(n)
        if lesson:
            module = CourseModule.query.get(lesson.module_id)
            course = Course.query.get(module.course_id) if module else None
            note_data['lesson'] = {
                'id': lesson.id,
                'title': lesson.title,
                'course_title': course.title if course else 'Unknown'
            }
        result.append(note_data)
    
    return result


def serialize_note(note):
    """Serialize a note for API response."""
    return {
        'id': note.id,
        'lesson_id': note.lesson_id,
        'content': note.content,
        'video_timestamp': note.video_timestamp,
        'created_at': note.created_at.isoformat(),
        'updated_at': note.updated_at.isoformat()
    }


def toggle_bookmark(user_id, lesson_id):
    """Toggle bookmark on a lesson."""
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return {'error': 'Lesson not found'}
    
    existing = UserBookmark.query.filter_by(
        user_id=user_id, lesson_id=lesson_id
    ).first()
    
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return {'bookmarked': False}
    else:
        bookmark = UserBookmark(user_id=user_id, lesson_id=lesson_id)
        db.session.add(bookmark)
        db.session.commit()
        return {'bookmarked': True, 'bookmark_id': bookmark.id}


def get_user_bookmarks(user_id):
    """Get all bookmarks for a user."""
    bookmarks = UserBookmark.query.filter_by(user_id=user_id).order_by(
        UserBookmark.bookmarked_at.desc()
    ).all()
    
    result = []
    for b in bookmarks:
        lesson = Lesson.query.get(b.lesson_id)
        if lesson:
            module = CourseModule.query.get(lesson.module_id)
            course = Course.query.get(module.course_id) if module else None
            result.append({
                'id': b.id,
                'bookmarked_at': b.bookmarked_at.isoformat(),
                'lesson': {
                    'id': lesson.id,
                    'title': lesson.title,
                    'duration_minutes': lesson.duration_minutes,
                    'thumbnail_url': course.thumbnail_url if course else None,
                    'course_title': course.title if course else 'Unknown'
                }
            })
    return result


# ==================== SEARCH & FILTERING ====================

def search_courses(query, filters=None):
    """Search courses by title, description, or tags."""
    base_query = Course.query
    
    if query:
        search_term = f"%{query}%"
        base_query = base_query.filter(
            or_(
                Course.title.ilike(search_term),
                Course.description.ilike(search_term),
                Course.tags_json.ilike(search_term)
            )
        )
    
    if filters:
        if filters.get('difficulty'):
            base_query = base_query.filter(Course.difficulty == filters['difficulty'])
        if filters.get('is_premium') is not None:
            base_query = base_query.filter(Course.is_premium == filters['is_premium'])
    
    courses = base_query.order_by(Course.order_index).all()
    
    return [{
        'id': c.id,
        'title': c.title,
        'description': c.description,
        'thumbnail_url': c.thumbnail_url,
        'difficulty': c.difficulty,
        'is_premium': c.is_premium,
        'duration_minutes': c.duration_minutes,
        'xp_reward': c.xp_reward,
        'tags': c.get_tags()
    } for c in courses]


def get_course_leaderboard(course_id, limit=10):
    """Get leaderboard for a specific course."""
    course = Course.query.get(course_id)
    if not course:
        return []
    
    lesson_ids = [l.id for m in course.modules for l in m.lessons]
    if not lesson_ids:
        return []
    
    # Get users who completed lessons in this course with their scores
    from sqlalchemy import desc
    
    leaderboard_query = db.session.query(
        User.id,
        User.name,
        User.avatar_url,
        func.count(UserProgress.id).label('completed_lessons'),
        func.avg(UserProgress.quiz_score).label('avg_score')
    ).join(
        UserProgress, User.id == UserProgress.user_id
    ).filter(
        UserProgress.lesson_id.in_(lesson_ids),
        UserProgress.completed == True
    ).group_by(
        User.id, User.name, User.avatar_url
    ).order_by(
        desc('completed_lessons'),
        desc('avg_score')
    ).limit(limit)
    
    result = []
    for idx, (user_id, name, avatar_url, completed, avg_score) in enumerate(leaderboard_query.all(), 1):
        result.append({
            'rank': idx,
            'user_id': user_id,
            'name': name,
            'avatar_url': avatar_url,
            'completed_lessons': completed,
            'avg_score': round(avg_score or 0, 1)
        })
    
    return result


# ==================== SEED ACADEMY DATA ====================

def seed_academy_data():
    """Seed the academy with comprehensive courses and lessons."""
    
    # Check if already seeded
    if Course.query.first():
        return "Academy data already exists"
    
    # =====================================================
    # COURSE 1: Analyse Technique de Base (Beginner)
    # =====================================================
    course1 = Course(
        title="Analyse Technique de Base",
        description="Maîtrisez les fondamentaux de l'analyse technique pour prédire les mouvements du marché. Ce cours couvre les bases essentielles pour tout trader débutant.",
        thumbnail_url="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
        preview_video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        difficulty="Beginner",
        is_premium=False,
        xp_reward=200,
        duration_minutes=120,
        order_index=1
    )
    course1.set_tags(['technical', 'beginner'])
    db.session.add(course1)
    db.session.flush()
    
    # Module 1.1: Introduction aux Graphiques
    module1_1 = CourseModule(
        course_id=course1.id,
        title="Introduction aux Graphiques",
        description="Apprenez à lire et interpréter les différents types de graphiques de prix.",
        order_index=1
    )
    db.session.add(module1_1)
    db.session.flush()
    
    # Lesson 1.1.1
    lesson1_1 = Lesson(
        module_id=module1_1.id,
        title="Types de Graphiques",
        description="Découvrez les graphiques en ligne, barres et chandeliers japonais.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration_minutes=15,
        xp_reward=50,
        content_markdown="""
# Les Types de Graphiques

## 1. Graphique en Ligne
Le plus simple, il relie les prix de clôture.

## 2. Graphique en Barres (OHLC)
Affiche l'ouverture, le plus haut, le plus bas et la clôture.

## 3. Chandeliers Japonais
Le format le plus populaire, avec un corps coloré et des mèches.

### Avantages des Chandeliers
- Visualisation claire des tendances
- Patterns facilement identifiables
- Information complète en un coup d'œil
        """,
        order_index=1
    )
    lesson1_1.chapter_markers_json = json.dumps([
        {"time": 0, "title": "Introduction"},
        {"time": 120, "title": "Graphique en Ligne"},
        {"time": 300, "title": "Graphique OHLC"},
        {"time": 480, "title": "Chandeliers Japonais"},
        {"time": 720, "title": "Conclusion"}
    ])
    db.session.add(lesson1_1)
    db.session.flush()
    
    # Quiz for Lesson 1.1.1
    quizzes_1_1 = [
        LessonQuiz(
            lesson_id=lesson1_1.id,
            question="Quel type de graphique affiche le plus d'informations ?",
            options_json=json.dumps(["Graphique en ligne", "Graphique en barres", "Graphique en chandeliers", "Tous sont égaux"]),
            correct_answer_index=2,
            explanation="Les chandeliers japonais montrent l'ouverture, la fermeture, le plus haut et le plus bas avec une représentation visuelle claire.",
            order_index=1
        ),
        LessonQuiz(
            lesson_id=lesson1_1.id,
            question="Que représente le corps d'un chandelier ?",
            options_json=json.dumps(["Le volume", "L'écart entre ouverture et clôture", "Le plus haut et le plus bas", "La volatilité"]),
            correct_answer_index=1,
            explanation="Le corps du chandelier représente l'écart entre le prix d'ouverture et de clôture.",
            order_index=2
        ),
        LessonQuiz(
            lesson_id=lesson1_1.id,
            question="Un chandelier vert (ou blanc) indique :",
            options_json=json.dumps(["Une baisse du prix", "Une hausse du prix", "Un marché stable", "Un volume élevé"]),
            correct_answer_index=1,
            explanation="Un chandelier vert indique que le prix de clôture est supérieur au prix d'ouverture.",
            order_index=3
        )
    ]
    for q in quizzes_1_1:
        db.session.add(q)
    
    # Lesson 1.1.2
    lesson1_2 = Lesson(
        module_id=module1_1.id,
        title="Timeframes et Périodes",
        description="Comprendre l'importance des unités de temps dans l'analyse technique.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        duration_minutes=12,
        xp_reward=50,
        content_markdown="""
# Les Timeframes (Unités de Temps)

## Timeframes Courts (Scalping)
- 1 minute (M1)
- 5 minutes (M5)
- 15 minutes (M15)

## Timeframes Moyens (Day Trading)
- 30 minutes (M30)
- 1 heure (H1)
- 4 heures (H4)

## Timeframes Longs (Swing Trading)
- Journalier (D1)
- Hebdomadaire (W1)
- Mensuel (MN)

### Règle d'Or
Analysez toujours au moins 2-3 timeframes avant de prendre une décision.
        """,
        order_index=2
    )
    db.session.add(lesson1_2)
    db.session.flush()
    
    quizzes_1_2 = [
        LessonQuiz(
            lesson_id=lesson1_2.id,
            question="Quel timeframe est recommandé pour le scalping ?",
            options_json=json.dumps(["Journalier", "4 heures", "1-15 minutes", "Hebdomadaire"]),
            correct_answer_index=2,
            explanation="Le scalping utilise des timeframes très courts (1-15 minutes) pour capturer de petits mouvements.",
            order_index=1
        ),
        LessonQuiz(
            lesson_id=lesson1_2.id,
            question="Combien de timeframes devrait-on analyser minimum ?",
            options_json=json.dumps(["1 seul", "2-3", "5-6", "10 ou plus"]),
            correct_answer_index=1,
            explanation="Il est recommandé d'analyser 2-3 timeframes pour confirmer les tendances.",
            order_index=2
        )
    ]
    for q in quizzes_1_2:
        db.session.add(q)
    
    # Module 1.2: Supports et Résistances
    module1_2 = CourseModule(
        course_id=course1.id,
        title="Supports et Résistances",
        description="Identifiez les niveaux clés du marché.",
        order_index=2
    )
    db.session.add(module1_2)
    db.session.flush()
    
    lesson1_3 = Lesson(
        module_id=module1_2.id,
        title="Identifier les Supports",
        description="Apprenez à tracer et identifier les niveaux de support.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        duration_minutes=18,
        xp_reward=50,
        content_markdown="""
# Les Niveaux de Support

## Définition
Un support est un niveau de prix où la demande est suffisamment forte pour empêcher le prix de baisser davantage.

## Comment identifier un support
1. Cherchez les creux répétés au même niveau
2. Plus le niveau a été testé, plus il est solide
3. Utilisez les zones plutôt que les lignes exactes

## Types de Supports
- **Support horizontal** : niveau de prix fixe
- **Support dynamique** : moyenne mobile ou trendline
- **Support psychologique** : nombres ronds (1.0000, 50, 100)
        """,
        order_index=1
    )
    db.session.add(lesson1_3)
    db.session.flush()
    
    quizzes_1_3 = [
        LessonQuiz(
            lesson_id=lesson1_3.id,
            question="Un support est un niveau où :",
            options_json=json.dumps(["Les vendeurs dominent", "Les acheteurs dominent", "Le volume est faible", "Le prix est instable"]),
            correct_answer_index=1,
            explanation="Un support est un niveau où la demande (acheteurs) est assez forte pour stopper la baisse.",
            order_index=1
        )
    ]
    for q in quizzes_1_3:
        db.session.add(q)
    
    # =====================================================
    # COURSE 2: Gestion des Risques Avancée (Pro)
    # =====================================================
    course2 = Course(
        title="Gestion des Risques Avancée",
        description="Protégez votre capital avec des techniques professionnelles de gestion des risques. La clé de la longévité en trading.",
        thumbnail_url="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
        preview_video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        difficulty="Pro",
        is_premium=True,
        xp_reward=300,
        duration_minutes=180,
        order_index=2
    )
    course2.set_tags(['risk', 'advanced'])
    db.session.add(course2)
    db.session.flush()
    
    module2_1 = CourseModule(
        course_id=course2.id,
        title="Position Sizing",
        description="Calculez la taille optimale de vos positions.",
        order_index=1
    )
    db.session.add(module2_1)
    db.session.flush()
    
    lesson2_1 = Lesson(
        module_id=module2_1.id,
        title="La Règle des 2%",
        description="Ne risquez jamais plus de 2% de votre capital par trade.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        duration_minutes=20,
        xp_reward=50,
        content_markdown="""
# La Règle des 2%

## Principe Fondamental
Ne jamais risquer plus de 2% de votre capital total sur un seul trade.

## Calcul
```
Risque max = Capital × 2%
Taille position = Risque max ÷ Distance du Stop Loss
```

## Exemple
- Capital : 10,000€
- Risque max : 200€ (2%)
- Stop Loss : 20 pips
- Valeur du pip : 10€
- Taille position : 200€ ÷ 20 = 10€/pip = 1 lot

## Pourquoi 2% ?
- Permet de survivre à 50 pertes consécutives
- Préserve le capital psychologique
- Croissance régulière avec le compound
        """,
        order_index=1
    )
    db.session.add(lesson2_1)
    db.session.flush()
    
    quizzes_2_1 = [
        LessonQuiz(
            lesson_id=lesson2_1.id,
            question="Avec un capital de 10,000€ et un risque de 2%, combien pouvez-vous risquer par trade ?",
            options_json=json.dumps(["100€", "200€", "500€", "1000€"]),
            correct_answer_index=1,
            explanation="2% de 10,000€ = 200€ maximum par trade.",
            order_index=1
        ),
        LessonQuiz(
            lesson_id=lesson2_1.id,
            question="La règle des 2% permet de survivre à combien de pertes consécutives ?",
            options_json=json.dumps(["10", "25", "50", "100"]),
            correct_answer_index=2,
            explanation="Avec 2% de risque par trade, vous pouvez théoriquement survivre à environ 50 pertes consécutives.",
            order_index=2
        ),
        LessonQuiz(
            lesson_id=lesson2_1.id,
            question="Comment calculer la taille de position ?",
            options_json=json.dumps([
                "Capital × 2%", 
                "Risque max ÷ Distance SL", 
                "Capital ÷ Prix de l'actif", 
                "Stop Loss × Leverage"
            ]),
            correct_answer_index=1,
            explanation="La taille de position = Risque maximum ÷ Distance du Stop Loss (en valeur).",
            order_index=3
        )
    ]
    for q in quizzes_2_1:
        db.session.add(q)
    
    lesson2_2 = Lesson(
        module_id=module2_1.id,
        title="Risk/Reward Ratio",
        description="Comprendre et optimiser le ratio risque/récompense.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        duration_minutes=15,
        xp_reward=50,
        content_markdown="""
# Le Ratio Risque/Récompense (R:R)

## Définition
Le R:R compare le profit potentiel au risque pris.

## Calcul
```
R:R = Distance Take Profit ÷ Distance Stop Loss
```

## Ratios Recommandés
- Minimum : 1:1.5
- Optimal : 1:2 ou 1:3
- Agressif : 1:4+

## Impact sur la Rentabilité
| R:R | Win Rate Minimum |
|-----|------------------|
| 1:1 | 50% |
| 1:2 | 33% |
| 1:3 | 25% |
        """,
        order_index=2
    )
    db.session.add(lesson2_2)
    db.session.flush()
    
    quizzes_2_2 = [
        LessonQuiz(
            lesson_id=lesson2_2.id,
            question="Un ratio R:R de 1:2 signifie :",
            options_json=json.dumps([
                "Risquer 2€ pour gagner 1€", 
                "Risquer 1€ pour gagner 2€", 
                "50% de chances de gain",
                "Deux trades par jour"
            ]),
            correct_answer_index=1,
            explanation="Un R:R de 1:2 signifie que pour chaque euro risqué, le profit potentiel est de 2 euros.",
            order_index=1
        )
    ]
    for q in quizzes_2_2:
        db.session.add(q)
    
    # Module 2.2: Drawdown Management
    module2_2 = CourseModule(
        course_id=course2.id,
        title="Gestion du Drawdown",
        description="Limiter et gérer les pertes cumulées.",
        order_index=2
    )
    db.session.add(module2_2)
    db.session.flush()
    
    lesson2_3 = Lesson(
        module_id=module2_2.id,
        title="Maximum Drawdown",
        description="Définir et respecter votre drawdown maximum.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        duration_minutes=18,
        xp_reward=50,
        content_markdown="""
# Le Maximum Drawdown

## Définition
Le drawdown est la baisse maximale depuis un pic de capital.

## Règles de Base
- Drawdown journalier max : 5%
- Drawdown total max : 10-15%
- Réduire la taille après -5%

## Plan d'Action
1. À -5% : Réduire la taille de 50%
2. À -8% : Pause trading (1 jour)
3. À -10% : Révision complète de la stratégie
        """,
        order_index=1
    )
    db.session.add(lesson2_3)
    
    # =====================================================
    # COURSE 3: Psychologie du Trading (Pro)
    # =====================================================
    course3 = Course(
        title="Psychologie du Trading",
        description="Maîtrisez vos émotions et développez un mindset de trader professionnel. 80% du succès en trading est mental.",
        thumbnail_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        preview_video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        difficulty="Pro",
        is_premium=True,
        xp_reward=250,
        duration_minutes=150,
        order_index=3
    )
    course3.set_tags(['psychology', 'mindset'])
    db.session.add(course3)
    db.session.flush()
    
    module3_1 = CourseModule(
        course_id=course3.id,
        title="Gérer les Émotions",
        description="Techniques pour rester calme sous pression.",
        order_index=1
    )
    db.session.add(module3_1)
    db.session.flush()
    
    lesson3_1 = Lesson(
        module_id=module3_1.id,
        title="Le FOMO et la Peur",
        description="Comprendre et gérer la peur de manquer et la peur de perdre.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
        duration_minutes=18,
        xp_reward=50,
        content_markdown="""
# FOMO et Peur en Trading

## FOMO (Fear Of Missing Out)
La peur de manquer une opportunité.

### Symptômes
- Entrer en position sans analyse
- Courir après le marché
- Ignorer votre plan de trading

### Solutions
- Accepter que d'autres opportunités viendront
- Respecter strictement votre plan
- Journal de trading pour identifier les patterns

## Fear of Loss (Peur de Perdre)
### Symptômes
- Couper les gains trop tôt
- Laisser courir les pertes
- Éviter de prendre des positions

### Solutions
- Accepter les pertes comme partie du jeu
- Se concentrer sur le processus, pas le résultat
- Méditation et respiration
        """,
        order_index=1
    )
    db.session.add(lesson3_1)
    db.session.flush()
    
    quizzes_3_1 = [
        LessonQuiz(
            lesson_id=lesson3_1.id,
            question="Le FOMO pousse souvent à :",
            options_json=json.dumps([
                "Attendre patiemment", 
                "Entrer sans analyse", 
                "Sortir trop tôt",
                "Réduire la taille de position"
            ]),
            correct_answer_index=1,
            explanation="Le FOMO pousse les traders à entrer en position sans analyse appropriée par peur de manquer le mouvement.",
            order_index=1
        ),
        LessonQuiz(
            lesson_id=lesson3_1.id,
            question="La meilleure solution contre le FOMO est :",
            options_json=json.dumps([
                "Trader plus souvent", 
                "Utiliser plus de levier", 
                "Respecter son plan de trading",
                "Suivre les signaux des autres"
            ]),
            correct_answer_index=2,
            explanation="Respecter strictement son plan de trading est la meilleure protection contre le FOMO.",
            order_index=2
        )
    ]
    for q in quizzes_3_1:
        db.session.add(q)
    
    lesson3_2 = Lesson(
        module_id=module3_1.id,
        title="Journal de Trading",
        description="L'outil indispensable pour progresser.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
        duration_minutes=15,
        xp_reward=50,
        content_markdown="""
# Le Journal de Trading

## Pourquoi un Journal ?
- Identifier vos forces et faiblesses
- Tracker vos émotions
- Améliorer continuellement

## Que Noter ?
- Date et heure
- Instrument tradé
- Raison de l'entrée
- Émotions ressenties
- Résultat et leçons

## Analyse Hebdomadaire
Chaque semaine, revoyez votre journal pour identifier les patterns.
        """,
        order_index=2
    )
    db.session.add(lesson3_2)
    
    # =====================================================
    # COURSE 4: Analyse Fondamentale (Beginner)
    # =====================================================
    course4 = Course(
        title="Analyse Fondamentale",
        description="Analysez les données économiques et les actualités pour anticiper les marchés.",
        thumbnail_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
        preview_video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
        difficulty="Beginner",
        is_premium=False,
        xp_reward=200,
        duration_minutes=100,
        order_index=4
    )
    course4.set_tags(['fundamental', 'news'])
    db.session.add(course4)
    db.session.flush()
    
    module4_1 = CourseModule(
        course_id=course4.id,
        title="Calendrier Économique",
        description="Utiliser le calendrier économique efficacement.",
        order_index=1
    )
    db.session.add(module4_1)
    db.session.flush()
    
    lesson4_1 = Lesson(
        module_id=module4_1.id,
        title="Événements Majeurs",
        description="Les annonces qui bougent les marchés.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration_minutes=20,
        xp_reward=50,
        content_markdown="""
# Événements Économiques Majeurs

## Haute Importance (3 étoiles)
- **NFP** : Non-Farm Payrolls (emploi US)
- **FOMC** : Décisions de taux Fed
- **BCE** : Décisions de taux Europe
- **PIB** : Produit Intérieur Brut

## Moyenne Importance (2 étoiles)
- CPI (Inflation)
- PMI (Activité manufacturière)
- Retail Sales (Ventes au détail)

## Comment Trader les News
1. Éviter les positions avant les annonces majeures
2. Attendre la réaction initiale
3. Trader la direction confirmée
        """,
        order_index=1
    )
    db.session.add(lesson4_1)
    db.session.flush()
    
    quizzes_4_1 = [
        LessonQuiz(
            lesson_id=lesson4_1.id,
            question="Quel événement a le plus d'impact sur le marché US ?",
            options_json=json.dumps(["PMI", "NFP (Non-Farm Payrolls)", "Retail Sales", "CPI"]),
            correct_answer_index=1,
            explanation="Le NFP (rapport sur l'emploi américain) est l'un des événements les plus volatils du mois.",
            order_index=1
        )
    ]
    for q in quizzes_4_1:
        db.session.add(q)
    
    # =====================================================
    # COURSE 5: Stratégies Elite (Elite)
    # =====================================================
    course5 = Course(
        title="Stratégies Elite",
        description="Découvrez les stratégies utilisées par les traders institutionnels et les hedge funds.",
        thumbnail_url="https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800",
        preview_video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        difficulty="Elite",
        is_premium=True,
        xp_reward=500,
        duration_minutes=240,
        order_index=5
    )
    course5.set_tags(['strategy', 'elite', 'institutional'])
    db.session.add(course5)
    db.session.flush()
    
    module5_1 = CourseModule(
        course_id=course5.id,
        title="Order Flow Trading",
        description="Comprendre le flux d'ordres institutionnel.",
        order_index=1
    )
    db.session.add(module5_1)
    db.session.flush()
    
    lesson5_1 = Lesson(
        module_id=module5_1.id,
        title="Introduction à l'Order Flow",
        description="Les bases du trading institutionnel.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        duration_minutes=25,
        xp_reward=75,
        content_markdown="""
# Order Flow Trading

## Qu'est-ce que l'Order Flow ?
L'analyse du flux d'ordres réels sur le marché.

## Concepts Clés
- **DOM** (Depth of Market)
- **Volume Profile**
- **Footprint Charts**
- **Delta**

## Avantages
- Voir où sont les gros ordres
- Anticiper les mouvements institutionnels
- Timing précis des entrées

## Outils Nécessaires
- Plateforme avec données Level 2
- Indicateurs de volume avancés
        """,
        order_index=1
    )
    db.session.add(lesson5_1)
    db.session.flush()
    
    quizzes_5_1 = [
        LessonQuiz(
            lesson_id=lesson5_1.id,
            question="Le DOM (Depth of Market) montre :",
            options_json=json.dumps([
                "L'historique des prix", 
                "Les ordres en attente à différents niveaux", 
                "La volatilité",
                "Les moyennes mobiles"
            ]),
            correct_answer_index=1,
            explanation="Le DOM affiche les ordres d'achat et de vente en attente à chaque niveau de prix.",
            order_index=1
        )
    ]
    for q in quizzes_5_1:
        db.session.add(q)
    
    module5_2 = CourseModule(
        course_id=course5.id,
        title="Smart Money Concepts",
        description="Comprendre les mouvements des institutionnels.",
        order_index=2
    )
    db.session.add(module5_2)
    db.session.flush()
    
    lesson5_2 = Lesson(
        module_id=module5_2.id,
        title="Liquidity Zones",
        description="Identifier les zones de liquidité.",
        video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        duration_minutes=22,
        xp_reward=75,
        content_markdown="""
# Zones de Liquidité

## Définition
Zones où se concentrent les Stop Loss des traders retail.

## Types de Liquidité
- **Buy-side Liquidity** : Au-dessus des sommets
- **Sell-side Liquidity** : Sous les creux
- **Equal Highs/Lows** : Niveaux évidents

## Comment les Institutionnels Utilisent la Liquidité
1. Accumulation en range
2. Chasse aux stops (liquidity grab)
3. Mouvement dans la vraie direction
        """,
        order_index=1
    )
    db.session.add(lesson5_2)
    
    db.session.commit()
    return "Academy data seeded successfully with comprehensive content"
