import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
    Maximize, ChevronLeft, ChevronRight, CheckCircle, XCircle,
    BookOpen, Clock, Zap, Trophy, ArrowLeft, List, FileText,
    HelpCircle, Award, Loader
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const TENANT = 'default';

const LessonPage = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('content'); // 'content', 'quiz'

    // Video Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const videoRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    // Quiz State
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResults, setQuizResults] = useState(null);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

    useEffect(() => {
        loadLesson();
    }, [lessonId]);

    useEffect(() => {
        // Save video progress periodically
        const interval = setInterval(() => {
            if (currentTime > 0) {
                saveProgress(currentTime);
            }
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, [currentTime]);

    const loadLesson = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API_URL}/v1/${TENANT}/academy/lessons/${lessonId}`, { headers });
            setLesson(response.data);

            // Restore video progress
            if (response.data.user_progress?.video_progress) {
                setCurrentTime(response.data.user_progress.video_progress);
            }
        } catch (error) {
            console.error('Error loading lesson:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveProgress = async (seconds) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            await axios.post(
                `${API_URL}/v1/${TENANT}/academy/lessons/${lessonId}/progress`,
                { video_progress_seconds: Math.floor(seconds) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    };

    const handleSubmitQuiz = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to submit the quiz');
            return;
        }

        setIsSubmittingQuiz(true);
        try {
            const response = await axios.post(
                `${API_URL}/v1/${TENANT}/academy/lessons/${lessonId}/quiz`,
                { answers: quizAnswers },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setQuizResults(response.data);
            setQuizSubmitted(true);
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Error submitting quiz');
        } finally {
            setIsSubmittingQuiz(false);
        }
    };

    // Video Controls
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            // Seek to saved position
            if (lesson?.user_progress?.video_progress) {
                videoRef.current.currentTime = lesson.user_progress.video_progress;
            }
        }
    };

    const seekTo = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleProgressClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        seekTo(pos * duration);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-slate-400">Loading lesson...</p>
                </div>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Lesson not found</h2>
                    <button
                        onClick={() => navigate('/academy')}
                        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
                    >
                        Back to Academy
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/academy')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <p className="text-sm text-slate-400">{lesson.course?.title}</p>
                            <h1 className="font-semibold">{lesson.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock size={16} />
                            {lesson.duration_minutes} min
                        </div>
                        <div className="flex items-center gap-2 text-sm text-amber-400">
                            <Zap size={16} />
                            +{lesson.xp_reward} XP
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex pt-16 h-screen">
                {/* Video Area */}
                <div className="flex-1 flex flex-col">
                    {/* Custom Video Player */}
                    <div
                        className="relative bg-black flex-1 flex items-center justify-center"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => isPlaying && setShowControls(false)}
                    >
                        {lesson.video_url ? (
                            <>
                                <video
                                    ref={videoRef}
                                    src={lesson.video_url}
                                    className="max-w-full max-h-full"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    muted={isMuted}
                                />

                                {/* Video Controls Overlay */}
                                <AnimatePresence>
                                    {showControls && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent"
                                        >
                                            {/* Chapter Markers */}
                                            {lesson.chapter_markers?.length > 0 && (
                                                <div className="absolute top-4 left-4 right-4 flex gap-2 flex-wrap">
                                                    {lesson.chapter_markers.map((marker, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => seekTo(marker.time)}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${currentTime >= marker.time ? 'bg-blue-500' : 'bg-white/20 hover:bg-white/30'
                                                                }`}
                                                        >
                                                            {marker.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Center Play Button */}
                                            <button
                                                onClick={togglePlay}
                                                className="absolute inset-0 flex items-center justify-center"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
                                                    {isPlaying ? (
                                                        <Pause size={32} fill="white" />
                                                    ) : (
                                                        <Play size={32} fill="white" className="ml-1" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Bottom Controls */}
                                            <div className="p-4 space-y-3">
                                                {/* Progress Bar */}
                                                <div
                                                    className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer group"
                                                    onClick={handleProgressClick}
                                                >
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full relative group-hover:h-2 transition-all"
                                                        style={{ width: `${(currentTime / duration) * 100}%` }}
                                                    >
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>

                                                {/* Control Buttons */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={togglePlay} className="hover:text-blue-400 transition-colors">
                                                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                                        </button>
                                                        <button onClick={() => seekTo(currentTime - 10)} className="hover:text-blue-400 transition-colors">
                                                            <SkipBack size={20} />
                                                        </button>
                                                        <button onClick={() => seekTo(currentTime + 10)} className="hover:text-blue-400 transition-colors">
                                                            <SkipForward size={20} />
                                                        </button>
                                                        <button onClick={() => setIsMuted(!isMuted)} className="hover:text-blue-400 transition-colors">
                                                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                                        </button>
                                                        <span className="text-sm font-mono">
                                                            {formatTime(currentTime)} / {formatTime(duration)}
                                                        </span>
                                                    </div>
                                                    <button className="hover:text-blue-400 transition-colors">
                                                        <Maximize size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        ) : (
                            <div className="text-center text-slate-400">
                                <BookOpen size={64} className="mx-auto mb-4 opacity-50" />
                                <p>This lesson has no video content</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panel - Content/Quiz */}
                <div className="w-96 bg-slate-900/50 border-l border-white/10 flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('content')}
                            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'content'
                                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <FileText size={18} />
                            Contenu
                        </button>
                        <button
                            onClick={() => setActiveTab('quiz')}
                            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'quiz'
                                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <HelpCircle size={18} />
                            Quiz
                            {lesson.quiz?.length > 0 && (
                                <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                                    {lesson.quiz.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'content' ? (
                            <div className="p-6 space-y-4">
                                <h3 className="font-bold text-lg">{lesson.title}</h3>
                                <p className="text-slate-400">{lesson.description}</p>

                                {lesson.content_markdown && (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        {/* Render markdown content */}
                                        <div dangerouslySetInnerHTML={{ __html: lesson.content_markdown }} />
                                    </div>
                                )}

                                {/* Chapter List */}
                                {lesson.chapter_markers?.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <List size={16} />
                                            Chapitres
                                        </h4>
                                        <div className="space-y-2">
                                            {lesson.chapter_markers.map((chapter, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => seekTo(chapter.time)}
                                                    className={`w-full p-3 rounded-lg text-left transition-colors ${currentTime >= chapter.time && currentTime < (lesson.chapter_markers[i + 1]?.time || duration)
                                                            ? 'bg-blue-500/20 border border-blue-500/30'
                                                            : 'bg-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{chapter.title}</span>
                                                        <span className="text-sm text-slate-500">{formatTime(chapter.time)}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6">
                                {lesson.quiz?.length > 0 ? (
                                    <div className="space-y-6">
                                        <div className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                                            <HelpCircle className="mx-auto mb-2 text-purple-400" size={32} />
                                            <h3 className="font-bold mb-1">Quiz de Validation</h3>
                                            <p className="text-sm text-slate-400">
                                                Répondez correctement à 80% des questions pour valider cette leçon
                                            </p>
                                        </div>

                                        {quizSubmitted && quizResults ? (
                                            <QuizResults results={quizResults} onRetry={() => {
                                                setQuizSubmitted(false);
                                                setQuizAnswers({});
                                                setQuizResults(null);
                                            }} />
                                        ) : (
                                            <>
                                                {lesson.quiz.map((q, i) => (
                                                    <div key={q.id} className="space-y-3">
                                                        <p className="font-medium">
                                                            <span className="text-blue-400 mr-2">Q{i + 1}.</span>
                                                            {q.question}
                                                        </p>
                                                        <div className="space-y-2">
                                                            {q.options.map((option, oi) => (
                                                                <button
                                                                    key={oi}
                                                                    onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: oi })}
                                                                    className={`w-full p-3 rounded-xl text-left transition-all ${quizAnswers[q.id] === oi
                                                                            ? 'bg-blue-500/20 border-2 border-blue-500'
                                                                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    <span className="mr-2 text-slate-500">{String.fromCharCode(65 + oi)}.</span>
                                                                    {option}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={handleSubmitQuiz}
                                                    disabled={Object.keys(quizAnswers).length < lesson.quiz.length || isSubmittingQuiz}
                                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {isSubmittingQuiz ? (
                                                        <>
                                                            <Loader className="animate-spin" size={20} />
                                                            Validation...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={20} />
                                                            Valider le Quiz
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Cette leçon n'a pas de quiz</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Quiz Results Component
const QuizResults = ({ results, onRetry }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            {/* Score Display */}
            <div className={`text-center p-6 rounded-2xl ${results.passed
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
                    : 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30'
                }`}>
                {results.passed ? (
                    <Trophy className="mx-auto mb-3 text-amber-400" size={48} />
                ) : (
                    <XCircle className="mx-auto mb-3 text-red-400" size={48} />
                )}

                <h3 className="text-2xl font-bold mb-2">
                    {results.passed ? '🎉 Félicitations!' : 'Pas encore...'}
                </h3>

                <div className="text-4xl font-bold my-4">
                    {Math.round(results.score)}%
                </div>

                <p className="text-slate-400">
                    {results.correct_count}/{results.total_count} réponses correctes
                </p>

                {results.passed && results.xp_earned > 0 && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-400 font-semibold">
                        <Zap size={18} />
                        +{results.xp_earned} XP Gagnés!
                    </div>
                )}
            </div>

            {/* Answer Review */}
            <div className="space-y-4">
                <h4 className="font-semibold">Révision des Réponses</h4>
                {results.results.map((r, i) => (
                    <div
                        key={r.quiz_id}
                        className={`p-4 rounded-xl ${r.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {r.correct ? (
                                <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={20} />
                            ) : (
                                <XCircle className="text-red-400 mt-1 flex-shrink-0" size={20} />
                            )}
                            <div>
                                <p className="font-medium mb-2">Question {i + 1}</p>
                                {r.explanation && (
                                    <p className="text-sm text-slate-400">{r.explanation}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Retry Button */}
            {!results.passed && (
                <button
                    onClick={onRetry}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
                >
                    Réessayer le Quiz
                </button>
            )}
        </motion.div>
    );
};

export default LessonPage;
