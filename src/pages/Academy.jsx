import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, Play, Award, BookOpen, TrendingUp, Shield,
    Clock, Star, ChevronRight, Lock, CheckCircle, Zap, Target,
    Brain, BarChart3, Users, Trophy, ArrowRight, Sparkles,
    AlertTriangle, X, Volume2, VolumeX
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TENANT = 'default';

const AcademyDashboard = () => {
    const navigate = useNavigate();
    const { isRTL } = useLanguage();
    const [courses, setCourses] = useState([]);
    const [userStats, setUserStats] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [hoveredCourse, setHoveredCourse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const [coursesRes, statsRes, recsRes] = await Promise.allSettled([
                axios.get(`${API_URL}/v1/${TENANT}/academy/courses`, { headers }),
                token ? axios.get(`${API_URL}/v1/${TENANT}/academy/me/stats`, { headers }) : Promise.resolve({ data: null }),
                token ? axios.get(`${API_URL}/v1/${TENANT}/academy/me/recommendations`, { headers }) : Promise.resolve({ data: [] })
            ]);
            
            if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data || []);
            if (statsRes.status === 'fulfilled' && statsRes.value.data) setUserStats(statsRes.value.data);
            if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value.data || []);
        } catch (error) {
            console.error('Error loading academy data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const analyzePatterns = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login first');
            return;
        }
        
        try {
            const response = await axios.post(
                `${API_URL}/v1/${TENANT}/academy/me/recommendations/analyze`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRecommendations(response.data.recommendations || []);
        } catch (error) {
            console.error('Error analyzing patterns:', error);
        }
    };

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const difficultyColors = {
        'Beginner': 'from-green-500 to-emerald-600',
        'Pro': 'from-blue-500 to-indigo-600',
        'Elite': 'from-amber-500 to-orange-600'
    };

    const difficultyBadgeColors = {
        'Beginner': 'bg-green-500/20 text-green-400 border-green-500/30',
        'Pro': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'Elite': 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30'
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-slate-400 text-lg">Loading MasterClass...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen bg-black text-white overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div 
                    className="absolute w-[800px] h-[800px] rounded-full opacity-10"
                    style={{
                        background: `radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent 70%)`,
                        left: mousePos.x - 400,
                        top: mousePos.y - 400,
                        transition: 'left 0.3s, top 0.3s'
                    }}
                />
            </div>

            {/* Hero Section - AI Journey */}
            <section className="relative pt-8 pb-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-white/10 p-8 md:p-12"
                    >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                                    </pattern>
                                </defs>
                                <rect width="100" height="100" fill="url(#grid)"/>
                            </svg>
                        </div>

                        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                            {/* Left: Text Content */}
                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6">
                                    <Sparkles size={16} />
                                    Centre d'Apprentissage MasterClass
                                </div>
                                
                                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                    Votre Parcours IA
                                </h1>
                                
                                <p className="text-lg text-slate-400 mb-8 max-w-xl">
                                    TradeSense AI inclut une académie complète avec des cours de haute qualité pour vous transformer en trader professionnel.
                                </p>

                                {userStats?.current_lesson && (
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`/academy/lesson/${userStats.current_lesson.id}`)}
                                        className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                                    >
                                        <Play size={20} fill="white" />
                                        Continuer: {userStats.current_lesson.title}
                                        <ChevronRight size={20} />
                                    </motion.button>
                                )}
                            </div>

                            {/* Right: XP Circle */}
                            <div className="relative">
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="w-64 h-64 relative"
                                >
                                    {/* Outer Ring */}
                                    <svg className="w-full h-full -rotate-90">
                                        <circle
                                            cx="128"
                                            cy="128"
                                            r="110"
                                            fill="none"
                                            stroke="rgba(255,255,255,0.1)"
                                            strokeWidth="12"
                                        />
                                        <circle
                                            cx="128"
                                            cy="128"
                                            r="110"
                                            fill="none"
                                            stroke="url(#xpGradient)"
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(userStats?.progress_percent || 0) * 6.91} 691`}
                                        />
                                        <defs>
                                            <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#3B82F6" />
                                                <stop offset="100%" stopColor="#8B5CF6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    
                                    {/* Center Content */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
                                            {userStats?.level || 1}
                                        </span>
                                        <span className="text-slate-400 font-medium mt-1">Niveau</span>
                                        <div className="mt-3 px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 text-sm font-semibold">
                                            {userStats?.total_xp || 0} XP
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Badges Orbiting */}
                                {userStats?.badges?.slice(0, 4).map((badge, i) => (
                                    <motion.div
                                        key={badge.type}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.1 }}
                                        className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 text-2xl"
                                        style={{
                                            top: `${50 + 45 * Math.sin((i * 90) * Math.PI / 180)}%`,
                                            left: `${50 + 45 * Math.cos((i * 90) * Math.PI / 180)}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        title={badge.name}
                                    >
                                        {badge.icon}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* AI Recommendations Section */}
            {recommendations.length > 0 && (
                <section className="px-6 mb-16">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <Brain className="text-purple-500" />
                                Recommandations IA pour Vous
                            </h2>
                            <button 
                                onClick={analyzePatterns}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                            >
                                <Zap size={16} />
                                Analyser mes trades
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recommendations.map((rec, i) => (
                                <motion.div
                                    key={rec.id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-4 rounded-2xl border ${
                                        rec.priority === 'Critical' ? 'bg-red-500/10 border-red-500/30' :
                                        rec.priority === 'High' ? 'bg-amber-500/10 border-amber-500/30' :
                                        'bg-blue-500/10 border-blue-500/30'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl ${
                                            rec.priority === 'Critical' ? 'bg-red-500/20' :
                                            rec.priority === 'High' ? 'bg-amber-500/20' :
                                            'bg-blue-500/20'
                                        }`}>
                                            <AlertTriangle size={20} className={
                                                rec.priority === 'Critical' ? 'text-red-400' :
                                                rec.priority === 'High' ? 'text-amber-400' :
                                                'text-blue-400'
                                            } />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold mb-1">{rec.course?.title}</h4>
                                            <p className="text-sm text-slate-400">{rec.reason}</p>
                                            <button 
                                                onClick={() => rec.course?.id && navigate(`/academy/course/${rec.course.id}`)}
                                                className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                            >
                                                Commencer <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Bento Grid Course Catalog */}
            <section className="px-6 pb-20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <BookOpen className="text-blue-500" />
                            Catalogue des Cours
                        </h2>
                        <div className="flex gap-2">
                            {['Tous', 'Beginner', 'Pro', 'Elite'].map(filter => (
                                <button 
                                    key={filter}
                                    className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course, i) => (
                            <CourseCard 
                                key={course.id}
                                course={course}
                                index={i}
                                isHovered={hoveredCourse === course.id}
                                onHover={() => setHoveredCourse(course.id)}
                                onLeave={() => setHoveredCourse(null)}
                                onClick={() => navigate(`/academy/course/${course.id}`)}
                                difficultyColors={difficultyColors}
                                difficultyBadgeColors={difficultyBadgeColors}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 py-4 px-6 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <Trophy className="text-amber-500" size={20} />
                            <span className="text-slate-400">Niveau</span>
                            <span className="font-bold text-lg">{userStats?.level || 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="text-blue-500" size={20} />
                            <span className="text-slate-400">XP Total</span>
                            <span className="font-bold text-lg">{userStats?.total_xp || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="text-green-500" size={20} />
                            <span className="text-slate-400">Leçons Complétées</span>
                            <span className="font-bold text-lg">{userStats?.completed_lessons || 0}/{userStats?.total_lessons || 0}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">Prochain niveau:</span>
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${userStats?.progress_percent || 0}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </div>
                        <span className="text-sm font-semibold">{Math.round(userStats?.progress_percent || 0)}%</span>
                    </div>
                </div>
            </section>

            {/* Course Detail Modal */}
            <AnimatePresence>
                {selectedCourse && (
                    <CourseModal 
                        course={selectedCourse} 
                        onClose={() => setSelectedCourse(null)}
                        difficultyBadgeColors={difficultyBadgeColors}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Course Card Component with Video Preview
const CourseCard = ({ course, index, isHovered, onHover, onLeave, onClick, difficultyColors, difficultyBadgeColors }) => {
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            if (isHovered) {
                videoRef.current.play().catch(() => {});
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isHovered]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            onHoverStart={onHover}
            onHoverEnd={onLeave}
            onClick={onClick}
            className={`relative rounded-2xl overflow-hidden cursor-pointer group ${
                course.is_premium ? 'ring-2 ring-amber-500/50' : ''
            }`}
        >
            {/* Thumbnail / Video Preview */}
            <div className="relative aspect-video overflow-hidden">
                <img 
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800'}
                    alt={course.title}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                />
                
                {/* Video Preview (shows on hover) */}
                {course.preview_video_url && (
                    <video
                        ref={videoRef}
                        src={course.preview_video_url}
                        muted={isMuted}
                        loop
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {/* Premium Badge */}
                {course.is_premium && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Star size={12} fill="white" />
                        PREMIUM
                    </div>
                )}
                
                {/* Difficulty Badge */}
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${difficultyBadgeColors[course.difficulty]}`}>
                    {course.difficulty}
                </div>
                
                {/* Play Button (on hover) */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                <Play size={28} fill="white" className="ml-1" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sound Toggle (on hover) */}
                {isHovered && course.preview_video_url && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                        className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-5 bg-gradient-to-b from-slate-900 to-black">
                <h3 className="font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">
                    {course.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                    {course.description}
                </p>
                
                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {course.duration_minutes}min
                        </span>
                        <span className="flex items-center gap-1">
                            <BookOpen size={14} />
                            {course.lessons_count} leçons
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Zap size={14} />
                        +{course.xp_reward} XP
                    </div>
                </div>

                {/* Progress Bar (if user has progress) */}
                {course.user_progress !== undefined && course.user_progress > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progression</span>
                            <span>{Math.round(course.user_progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${course.user_progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Course Detail Modal
const CourseModal = ({ course, onClose, difficultyBadgeColors }) => {
    const [courseDetails, setCourseDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCourseDetails();
    }, [course.id]);

    const loadCourseDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API_URL}/v1/${TENANT}/academy/courses/${course.id}`, { headers });
            setCourseDetails(response.data);
        } catch (error) {
            console.error('Error loading course details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl shadow-2xl"
            >
                {/* Header Image */}
                <div className="relative h-64">
                    <img 
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800'}
                        className="w-full h-full object-cover"
                        alt={course.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${difficultyBadgeColors[course.difficulty]}`}>
                                {course.difficulty}
                            </span>
                            {course.is_premium && (
                                <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Star size={12} fill="white" /> PREMIUM
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold">{course.title}</h2>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    <p className="text-slate-400 mb-6">{course.description}</p>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <Clock className="mx-auto mb-2 text-blue-400" />
                            <div className="font-bold">{course.duration_minutes}min</div>
                            <div className="text-xs text-slate-500">Durée</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <BookOpen className="mx-auto mb-2 text-green-400" />
                            <div className="font-bold">{courseDetails?.modules?.length || 0}</div>
                            <div className="text-xs text-slate-500">Modules</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <Play className="mx-auto mb-2 text-purple-400" />
                            <div className="font-bold">{course.lessons_count}</div>
                            <div className="text-xs text-slate-500">Leçons</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <Zap className="mx-auto mb-2 text-amber-400" />
                            <div className="font-bold">+{course.xp_reward}</div>
                            <div className="text-xs text-slate-500">XP</div>
                        </div>
                    </div>
                    
                    {/* Modules List */}
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Target className="text-blue-500" />
                                Contenu du Cours
                            </h3>
                            
                            {courseDetails?.modules?.map((module, mi) => (
                                <div key={module.id} className="border border-white/10 rounded-xl overflow-hidden">
                                    <div className="p-4 bg-white/5 font-semibold flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">
                                            {mi + 1}
                                        </span>
                                        {module.title}
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {module.lessons.map((lesson, li) => (
                                            <div 
                                                key={lesson.id}
                                                onClick={() => navigate(`/academy/lesson/${lesson.id}`)}
                                                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {lesson.completed ? (
                                                        <CheckCircle size={18} className="text-green-500" />
                                                    ) : (
                                                        <Play size={18} className="text-slate-400" />
                                                    )}
                                                    <span className={lesson.completed ? 'text-green-400' : ''}>{lesson.title}</span>
                                                    {lesson.has_quiz && (
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">Quiz</span>
                                                    )}
                                                </div>
                                                <span className="text-sm text-slate-500">{lesson.duration_minutes}min</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* CTA Button */}
                    <div className="mt-8 flex justify-center">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                // Find first incomplete lesson or first lesson
                                const firstModule = courseDetails?.modules?.[0];
                                const firstLesson = firstModule?.lessons?.[0];
                                if (firstLesson) {
                                    navigate(`/academy/lesson/${firstLesson.id}`);
                                }
                            }}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center gap-3"
                        >
                            <Play size={22} fill="white" />
                            Commencer le Cours
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AcademyDashboard;
