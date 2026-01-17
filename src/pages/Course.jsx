import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Play, Clock, Award, BookOpen, ChevronRight, Lock, CheckCircle,
    ArrowLeft, Star, Users, GraduationCap, Zap, List
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TENANT = 'default';

const CoursePage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const loadCourse = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API_URL}/v1/${TENANT}/academy/courses/${courseId}`, { headers });
            setCourse(response.data);
            
            // Check if user has any progress (means enrolled)
            if (response.data.user_progress > 0) {
                setIsEnrolled(true);
            }
        } catch (error) {
            console.error('Error loading course:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnroll = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setIsEnrolling(true);
        try {
            await axios.post(
                `${API_URL}/v1/${TENANT}/academy/courses/${courseId}/enroll`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsEnrolled(true);
            // Navigate to first lesson
            startCourse();
        } catch (error) {
            console.error('Error enrolling:', error);
            // Even if enrollment fails, try to start
            startCourse();
        } finally {
            setIsEnrolling(false);
        }
    };

    const startCourse = () => {
        const firstModule = course?.modules?.[0];
        const firstLesson = firstModule?.lessons?.[0];
        if (firstLesson) {
            navigate(`/academy/lesson/${firstLesson.id}`);
        }
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
                    <p className="text-slate-400 text-lg">Chargement du cours...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Cours non trouvé</h1>
                    <button
                        onClick={() => navigate('/academy')}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mx-auto"
                    >
                        <ArrowLeft size={18} />
                        Retour à l'Academy
                    </button>
                </div>
            </div>
        );
    }

    const totalLessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
    const completedLessons = course.modules?.reduce((sum, m) => 
        sum + (m.lessons?.filter(l => l.completed)?.length || 0), 0) || 0;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero Section */}
            <div className="relative h-[50vh] overflow-hidden">
                {/* Background Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-10 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/academy')}
                        className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Retour
                    </button>

                    {/* Badges */}
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${difficultyBadgeColors[course.difficulty]}`}>
                            {course.difficulty}
                        </span>
                        {course.is_premium && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <Star size={14} fill="currentColor" />
                                Premium
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
                    
                    {/* Description */}
                    <p className="text-lg text-slate-300 max-w-2xl mb-6">{course.description}</p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-6 text-slate-400">
                        <div className="flex items-center gap-2">
                            <Clock size={18} />
                            <span>{course.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} />
                            <span>{totalLessons} leçons</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <List size={18} />
                            <span>{course.modules?.length || 0} modules</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-amber-400" />
                            <span>{course.xp_reward} XP</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content - Modules */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <GraduationCap className="text-blue-500" />
                            Programme du Cours
                        </h2>

                        {/* Progress Bar */}
                        {completedLessons > 0 && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Progression</span>
                                    <span className="text-blue-400 font-medium">
                                        {completedLessons}/{totalLessons} leçons
                                    </span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(completedLessons / totalLessons) * 100}%` }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Modules List */}
                        <div className="space-y-4">
                            {course.modules?.map((module, mi) => (
                                <motion.div
                                    key={module.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: mi * 0.1 }}
                                    className="border border-white/10 rounded-2xl overflow-hidden bg-white/5"
                                >
                                    {/* Module Header */}
                                    <div className="p-5 bg-white/5 border-b border-white/10">
                                        <div className="flex items-center gap-4">
                                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold">
                                                {mi + 1}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-lg">{module.title}</h3>
                                                <p className="text-sm text-slate-400">{module.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lessons List */}
                                    <div className="divide-y divide-white/5">
                                        {module.lessons?.map((lesson, li) => (
                                            <motion.div
                                                key={lesson.id}
                                                onClick={() => navigate(`/academy/lesson/${lesson.id}`)}
                                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                                className="p-4 flex items-center justify-between cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Status Icon */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                        lesson.completed 
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-white/10 text-slate-400'
                                                    }`}>
                                                        {lesson.completed ? (
                                                            <CheckCircle size={18} />
                                                        ) : (
                                                            <Play size={16} />
                                                        )}
                                                    </div>

                                                    {/* Lesson Info */}
                                                    <div>
                                                        <h4 className={`font-medium ${lesson.completed ? 'text-green-400' : ''}`}>
                                                            {lesson.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {lesson.duration_minutes} min
                                                            </span>
                                                            {lesson.has_quiz && (
                                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                                                                    Quiz
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* XP Reward */}
                                                <div className="flex items-center gap-2 text-amber-400 text-sm">
                                                    <Zap size={14} />
                                                    +{lesson.xp_reward} XP
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* CTA Card */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-6 sticky top-6">
                            {/* Course Progress or Start */}
                            {completedLessons > 0 ? (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                                            <span className="text-2xl font-bold">
                                                {Math.round((completedLessons / totalLessons) * 100)}%
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg">Cours en Cours</h3>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {completedLessons} sur {totalLessons} leçons complétées
                                        </p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={startCourse}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3"
                                    >
                                        <Play size={22} fill="white" />
                                        Continuer
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <div className="text-center mb-6">
                                        <GraduationCap size={48} className="mx-auto mb-4 text-blue-400" />
                                        <h3 className="font-bold text-lg">Prêt à Apprendre ?</h3>
                                        <p className="text-sm text-slate-400 mt-1">
                                            Commencez ce cours et gagnez {course.xp_reward} XP
                                        </p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleEnroll}
                                        disabled={isEnrolling}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isEnrolling ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Inscription...
                                            </>
                                        ) : (
                                            <>
                                                <Play size={22} fill="white" />
                                                Commencer le Cours
                                            </>
                                        )}
                                    </motion.button>
                                </>
                            )}

                            {/* Tags */}
                            {course.tags && course.tags.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <p className="text-sm text-slate-400 mb-3">Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {course.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 bg-white/10 rounded-full text-sm text-slate-300"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Certificate Info */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="text-amber-400" size={24} />
                                <h3 className="font-bold">Certificat</h3>
                            </div>
                            <p className="text-sm text-slate-400">
                                Complétez toutes les leçons et réussissez les quiz pour obtenir votre certificat officiel TradeSense.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursePage;
