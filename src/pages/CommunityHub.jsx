import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Hash, Mic, Send, Share2, TrendingUp, Award,
    MessageSquare, Play, Pause, MoreVertical, PlusCircle,
    BarChart3, Eye, Zap, ShieldCheck, Globe, Square, ThumbsUp,
    Mail, X, ArrowLeft, Image
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const TENANT = 'default';

const CommunityHub = () => {
    const { t, isRTL } = useLanguage();
    const [posts, setPosts] = useState([]);
    const [topStrategies, setTopStrategies] = useState([]);
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState(null);
    const [activeGroup, setActiveGroup] = useState('#General');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Voice recording states
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // DM states
    const [showDMPanel, setShowDMPanel] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [dmMessages, setDmMessages] = useState([]);
    const [dmText, setDmText] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [isDMLoading, setIsDMLoading] = useState(false);
    const [isSendingDM, setIsSendingDM] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchFeed(), fetchTopStrategies()]);
            setIsLoading(false);
        };
        loadData();
    }, []);

    // Cleanup audio URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const fetchFeed = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/v1/${TENANT}/community/nexus`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(response.data.posts || []);
        } catch (error) {
            console.error("Error fetching feed:", error);
        }
    };

    const fetchTopStrategies = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/v1/${TENANT}/community/strategies/top`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTopStrategies(response.data || []);
        } catch (error) {
            console.error("Error fetching top strategies:", error);
        }
    };

    // Voice Recording Functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                setAudioUrl(URL.createObjectURL(audioBlob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert(isRTL ? 'لا يمكن الوصول إلى الميكروفون' : 'Cannot access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendMessage = async () => {
        if (!message.trim() && !audioBlob) return;

        const token = localStorage.getItem('token');
        if (!token) {
            alert(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }

        setIsSending(true);
        try {
            const formData = new FormData();

            if (message.trim()) {
                formData.append('content', message);
            }

            if (audioBlob) {
                formData.append('file', audioBlob, 'voice_message.webm');
            }

            await axios.post(`${API_URL}/v1/${TENANT}/community/posts`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage('');
            cancelRecording();
            fetchFeed();
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error sending message';
            alert(isRTL ? `خطأ: ${errorMsg}` : errorMsg);
        } finally {
            setIsSending(false);
        }
    };

    const handleLikePost = async (postId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }
        try {
            await axios.post(`${API_URL}/v1/${TENANT}/community/posts/${postId}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update the post's like count locally
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, likes_count: (post.likes_count || 0) + 1 }
                    : post
            ));
        } catch (error) {
            console.error("Error liking post:", error);
        }
    };

    const handleVoteStrategy = async (strategyId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }
        try {
            await axios.post(`${API_URL}/v1/${TENANT}/community/strategies/${strategyId}/vote`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update strategies list
            fetchTopStrategies();
        } catch (error) {
            console.error("Error voting strategy:", error);
        }
    };

    // DM Functions
    const fetchConversations = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setIsDMLoading(true);
        try {
            const response = await axios.get(`${API_URL}/v1/${TENANT}/dm/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(response.data || []);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setIsDMLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await axios.get(`${API_URL}/v1/${TENANT}/dm/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableUsers(response.data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchDMMessages = async (userId) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await axios.get(`${API_URL}/v1/${TENANT}/dm/messages/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDmMessages(response.data || []);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const handleSendDM = async () => {
        const token = localStorage.getItem('token');
        if (!token || !selectedConversation || (!dmText.trim() && !audioBlob)) return;

        setIsSendingDM(true);
        try {
            const formData = new FormData();
            if (dmText.trim()) {
                formData.append('content', dmText);
            }
            if (audioBlob) {
                formData.append('file', audioBlob, 'voice_message.webm');
            }

            await axios.post(
                `${API_URL}/v1/${TENANT}/dm/messages/${selectedConversation.id}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setDmText('');
            setAudioBlob(null);
            setAudioUrl(null);
            fetchDMMessages(selectedConversation.id);
            fetchConversations();
        } catch (error) {
            console.error("Error sending DM:", error);
            alert(isRTL ? 'حدث خطأ أثناء الإرسال' : 'Error sending message');
        } finally {
            setIsSendingDM(false);
        }
    };

    const openDMPanel = () => {
        setShowDMPanel(true);
        fetchConversations();
        fetchAvailableUsers();
    };

    const startConversation = (user) => {
        setSelectedConversation(user);
        fetchDMMessages(user.id);
    };

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const groups = [
        { id: 1, name: 'Scalping-Gold', icon: Hash },
        { id: 2, name: 'Maroc-Telecom-BVC', icon: Hash },
        { id: 3, name: 'News-Impact', icon: Hash },
        { id: 4, name: 'General', icon: Hash },
        { id: 5, name: 'Crypto-Alpha', icon: Zap },
    ];

    const experts = [
        { id: 1, name: 'Soufiane_Dev', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Soufiane' },
        { id: 2, name: 'AlphaTrader', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha' },
        { id: 3, name: 'BVC_Master', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Master' },
    ];

    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishForm, setPublishForm] = useState({ symbol: '', description: '', win_rate: '' });
    const [isPublishing, setIsPublishing] = useState(false);
    const [screenshotFile, setScreenshotFile] = useState(null);
    const fileInputRef = useRef(null);

    const handlePublishStrategy = async () => {
        if (!publishForm.symbol.trim()) {
            alert(isRTL ? 'الرمز مطلوب' : 'Symbol is required');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }

        setIsPublishing(true);
        try {
            const formData = new FormData();
            formData.append('symbol', publishForm.symbol);
            formData.append('description', publishForm.description);

            if (publishForm.win_rate) {
                formData.append('win_rate', publishForm.win_rate);
            }

            if (screenshotFile) {
                formData.append('screenshot', screenshotFile);
            }

            await axios.post(`${API_URL}/v1/${TENANT}/community/strategies`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setShowPublishModal(false);
            setPublishForm({ symbol: '', description: '', win_rate: '' });
            setScreenshotFile(null);
            fetchFeed();
            fetchTopStrategies();
            alert(isRTL ? 'تم نشر الاستراتيجية بنجاح!' : 'Strategy published successfully!');
        } catch (error) {
            console.error("Error publishing strategy:", error);
            alert(isRTL ? 'خطأ في نشر الاستراتيجية' : 'Error publishing strategy');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-black text-white relative overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Moving Gradient Background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.3), transparent 70%)`
                }}
            />

            <div className={`flex h-[calc(100vh-64px)] ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'} relative z-10`}>

                {/* Left Column - Exploration */}
                <div className={`w-64 border-${isRTL ? 'l' : 'r'} border-white/10 bg-black/40 backdrop-blur-xl flex flex-col`}>
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Globe className="text-blue-500" />
                            {isRTL ? 'استكشاف' : 'Exploration'}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {isRTL ? 'القنوات' : 'Channels'}
                        </div>
                        {groups.map((group) => (
                            <button
                                key={group.id}
                                onClick={() => setActiveGroup(`#${group.name}`)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeGroup === `#${group.name}`
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                                <group.icon size={18} />
                                <span className="font-medium">#{group.name}</span>
                            </button>
                        ))}

                        <div className="mt-8 px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {isRTL ? 'الخبراء المتصلون' : 'Experts Online'}
                        </div>
                        {experts.map((expert) => (
                            <div key={expert.id} className={`flex items-center gap-3 px-3 py-2 group cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="relative">
                                    <img src={expert.avatar} alt={expert.name} className="w-8 h-8 rounded-full border border-white/10" />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                </div>
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{expert.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center Column - Alpha Feed */}
                <div className="flex-1 flex flex-col bg-slate-950/20">
                    <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md flex justify-between items-center">
                        <h3 className={`font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-blue-500 text-xl">#</span>
                            {activeGroup.replace('#', '')}
                        </h3>
                        <div className="flex gap-4 text-slate-400">
                            <button
                                onClick={openDMPanel}
                                className="hover:text-white cursor-pointer relative"
                                title={isRTL ? 'الرسائل المباشرة' : 'Direct Messages'}
                            >
                                <Mail size={20} />
                            </button>
                            <Hash size={20} className="hover:text-white cursor-pointer" />
                            <Users size={20} className="hover:text-white cursor-pointer" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                <p className="text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading community feed...'}</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <MessageSquare size={32} className="text-blue-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-300">{isRTL ? 'لا توجد منشورات بعد' : 'No posts yet'}</h3>
                                <p className="text-slate-500 max-w-sm">
                                    {isRTL ? 'كن أول من يشارك استراتيجية أو رسالة!' : 'Be the first to share a strategy or message!'}
                                </p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={post.id}
                                    className={`flex gap-4 group ${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                    <img
                                        src={post.author.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.author.name}`}
                                        className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 shadow-lg"
                                        alt="avatar"
                                    />
                                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                                        <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className="font-bold hover:underline cursor-pointer">{post.author.name}</span>
                                            {post.author.role === 'admin' && (
                                                <ShieldCheck size={14} className="text-blue-400" />
                                            )}
                                            <span className="text-xs text-slate-500">
                                                {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {post.content && (
                                            <p className="text-slate-300 leading-relaxed mb-3">{post.content}</p>
                                        )}

                                        {post.media_type === 'VOICE' && post.media_url && (
                                            <div className={`bg-white/5 border border-white/10 rounded-2xl p-3 max-w-sm flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <audio src={post.media_url} controls className="flex-1 h-10" />
                                            </div>
                                        )}

                                        {post.media_type === 'IMAGE' && post.media_url && (
                                            <div className="relative max-w-md rounded-2xl overflow-hidden border border-white/10 shadow-lg group/img">
                                                <img
                                                    src={post.media_url}
                                                    alt="Shared image"
                                                    className="w-full h-auto object-cover group-hover/img:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        )}

                                        {post.media_type === 'VOICE' && !post.media_url && (
                                            <div className={`bg-white/5 border border-white/10 rounded-2xl p-3 max-w-sm flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <button className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors">
                                                    <Play size={20} fill="white" />
                                                </button>
                                                <div className="flex-1 h-8 flex items-center gap-1">
                                                    {[...Array(20)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-1 bg-blue-500/40 rounded-full"
                                                            style={{ height: `${Math.random() * 100}%` }}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-slate-400">0:42</span>
                                            </div>
                                        )}

                                        {post.media_type === 'STRATEGY' && post.strategy && (
                                            <motion.div
                                                layout
                                                className="bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-2xl overflow-hidden max-w-md shadow-2xl group/card"
                                            >
                                                <div className="relative h-40 bg-slate-800">
                                                    <img
                                                        src={post.strategy.screenshot_url || "https://images.unsplash.com/photo-1611974714658-058f40da01f1?w=800&auto=format&fit=crop&q=60"}
                                                        className="w-full h-full object-cover opacity-60 group-hover/card:scale-105 transition-transform duration-500"
                                                        alt="Strategy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                                    <div className={`absolute bottom-3 ${isRTL ? 'right-3' : 'left-3'} flex items-center gap-2`}>
                                                        <div className="px-2 py-1 bg-blue-500 text-[10px] font-bold rounded uppercase tracking-wider shadow-lg">
                                                            {post.strategy.symbol}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <div className={`flex justify-between items-start mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <h4 className="font-bold text-lg">{post.strategy.symbol} Strategy</h4>
                                                        <div className="flex items-center gap-1 text-green-400 font-mono text-sm bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                            <TrendingUp size={14} />
                                                            {post.strategy.win_rate}% WR
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                                                        {post.strategy.description || "Experimental strategy using multi-timeframe EMA crossovers and RSI divergence detection."}
                                                    </p>
                                                    <Button
                                                        variant="secondary"
                                                        className={`w-full py-2 flex items-center justify-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
                                                        onClick={() => setSelectedStrategy(post.strategy)}
                                                    >
                                                        <Eye size={16} />
                                                        {isRTL ? 'عرض الإعداد' : 'View Setup'}
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Post Actions */}
                                        <div className={`flex items-center gap-4 mt-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <button
                                                onClick={() => handleLikePost(post.id)}
                                                className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 transition-colors group"
                                            >
                                                <ThumbsUp size={16} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-xs">{post.likes_count || 0}</span>
                                            </button>
                                            <button className="flex items-center gap-1.5 text-slate-500 hover:text-green-400 transition-colors group">
                                                <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-xs">{post.comments_count || 0}</span>
                                            </button>
                                            <button className="flex items-center gap-1.5 text-slate-500 hover:text-purple-400 transition-colors group">
                                                <Share2 size={16} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10">
                        {/* Voice Recording Preview */}
                        {audioUrl && !isRecording && (
                            <div className={`max-w-4xl mx-auto mb-3 flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <audio src={audioUrl} controls className="flex-1 h-10" />
                                <button
                                    onClick={cancelRecording}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Square size={18} />
                                </button>
                            </div>
                        )}

                        {/* Recording Indicator */}
                        {isRecording && (
                            <div className={`max-w-4xl mx-auto mb-3 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-red-400 font-mono">{formatTime(recordingTime)}</span>
                                <span className="text-slate-400 flex-1">{isRTL ? 'جاري التسجيل...' : 'Recording...'}</span>
                                <button
                                    onClick={stopRecording}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                                >
                                    {isRTL ? 'إيقاف' : 'Stop'}
                                </button>
                            </div>
                        )}

                        <div className={`max-w-4xl mx-auto relative flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 px-4 shadow-2xl focus-within:border-blue-500/50 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                                className={`p-2 rounded-xl transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : audioBlob ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isSending}
                            >
                                <Mic size={20} />
                            </button>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                placeholder={isRTL ? "اكتب رسالة أو شارك فكرة..." : "Type a message or share an alpha..."}
                                className={`flex-1 bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 py-3 ${isRTL ? 'text-right' : ''}`}
                                disabled={isRecording || isSending}
                            />
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <PlusCircle
                                    size={20}
                                    className="text-slate-500 hover:text-blue-400 cursor-pointer transition-colors"
                                    onClick={() => setShowPublishModal(true)}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={(!message.trim() && !audioBlob) || isSending}
                                >
                                    {isSending ? (
                                        <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send size={18} className={isRTL ? 'rotate-180' : ''} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Library */}
                <div className={`w-80 border-${isRTL ? 'r' : 'l'} border-white/10 bg-black/40 backdrop-blur-xl p-4 flex flex-col gap-6`}>
                    <div>
                        <Button
                            onClick={() => setShowPublishModal(true)}
                            className={`w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 group ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
                            <span className="font-bold uppercase tracking-wider text-sm">
                                {isRTL ? 'نشر استراتيجية جديدة' : 'Publish New Strategy'}
                            </span>
                        </Button>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Award size={16} className="text-amber-500" />
                            {isRTL ? 'أفضل الاستراتيجيات' : 'Top Shared Strategies'}
                        </h4>
                        <div className="space-y-3">
                            {topStrategies.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 text-sm">
                                    {isRTL ? 'لا توجد استراتيجيات بعد' : 'No strategies yet'}
                                </div>
                            ) : (
                                topStrategies.map((strat, i) => (
                                    <div key={strat.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group overflow-hidden relative cursor-pointer">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <TrendingUp size={40} />
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-xs uppercase tracking-widest text-blue-400">{strat.symbol}</span>
                                            <span className="text-[10px] text-slate-500">by {strat.author}</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div className="text-2xl font-mono font-bold">{strat.win_rate || 0}%</div>
                                            <button
                                                onClick={() => handleVoteStrategy(strat.id)}
                                                className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-blue-400 transition-colors"
                                            >
                                                <ThumbsUp size={10} /> {strat.votes_count || 0} votes
                                            </button>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${strat.win_rate || 0}%` }} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20">
                        <h5 className="font-bold text-sm mb-1 flex items-center gap-2">
                            < Zap size={14} className="text-amber-500 fill-amber-500" />
                            TradeSense Pro
                        </h5>
                        <p className="text-xs text-slate-400 mb-3">Get real-time alerts for community highly-rated setups.</p>
                        <button className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider">Upgrade Now →</button>
                    </div>
                </div>
            </div>

            {/* Publish Strategy Modal */}
            <AnimatePresence>
                {showPublishModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => !isPublishing && setShowPublishModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-white/20 rounded-3xl p-8 max-w-lg w-full relative z-[111] shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <PlusCircle className="text-blue-500" />
                                {isRTL ? 'نشر استراتيجية جديدة' : 'Publish New Strategy'}
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                                        {isRTL ? 'الرمز' : 'Symbol'} <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all font-mono"
                                        placeholder="e.g. BTC-USD, GOLD, IAM"
                                        value={publishForm.symbol}
                                        onChange={(e) => setPublishForm({ ...publishForm, symbol: e.target.value.toUpperCase() })}
                                        disabled={isPublishing}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">{isRTL ? 'الوصف' : 'Description'}</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all min-h-[100px] resize-none"
                                        placeholder="Explain your technical reasoning, entry/exit points, timeframe..."
                                        value={publishForm.description}
                                        onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                                        disabled={isPublishing}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">{isRTL ? 'نسبة النجاح المتوقعة (%)' : 'Expected Win Rate (%)'}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all font-mono"
                                        placeholder="e.g. 65"
                                        value={publishForm.win_rate}
                                        onChange={(e) => setPublishForm({ ...publishForm, win_rate: Math.min(100, Math.max(0, e.target.value)) })}
                                        disabled={isPublishing}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">{isRTL ? 'لقطة شاشة للرسم البياني' : 'Chart Screenshot'}</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setScreenshotFile(e.target.files[0])}
                                        disabled={isPublishing}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-black/50 border border-dashed border-white/20 rounded-xl px-4 py-6 outline-none hover:border-blue-500/50 transition-all text-center"
                                        disabled={isPublishing}
                                    >
                                        {screenshotFile ? (
                                            <div className="flex items-center justify-center gap-2 text-green-400">
                                                <Eye size={18} />
                                                <span>{screenshotFile.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-slate-500">
                                                <BarChart3 size={24} className="mx-auto mb-2" />
                                                <span>{isRTL ? 'انقر لتحميل صورة' : 'Click to upload image'}</span>
                                            </div>
                                        )}
                                    </button>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowPublishModal(false);
                                            setPublishForm({ symbol: '', description: '', win_rate: '' });
                                            setScreenshotFile(null);
                                        }}
                                        disabled={isPublishing}
                                    >
                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                    </Button>
                                    <Button
                                        className="flex-1 flex items-center justify-center gap-2"
                                        onClick={handlePublishStrategy}
                                        disabled={isPublishing || !publishForm.symbol.trim()}
                                    >
                                        {isPublishing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {isRTL ? 'جاري النشر...' : 'Publishing...'}
                                            </>
                                        ) : (
                                            isRTL ? 'نشر' : 'Publish'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DM Panel */}
            <AnimatePresence>
                {showDMPanel && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-96 z-[100] bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col"
                    >
                        {/* DM Header */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3">
                            {selectedConversation ? (
                                <>
                                    <button
                                        onClick={() => setSelectedConversation(null)}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <img
                                        src={selectedConversation.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedConversation.name}`}
                                        className="w-10 h-10 rounded-full"
                                        alt={selectedConversation.name}
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-bold">{selectedConversation.name}</h3>
                                        <p className="text-xs text-slate-400">{isRTL ? 'نشط الآن' : 'Active now'}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Mail className="text-blue-500" size={24} />
                                    <h3 className="font-bold flex-1">{isRTL ? 'الرسائل المباشرة' : 'Direct Messages'}</h3>
                                </>
                            )}
                            <button
                                onClick={() => { setShowDMPanel(false); setSelectedConversation(null); }}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* DM Content */}
                        <div className="flex-1 overflow-y-auto">
                            {selectedConversation ? (
                                /* Messages View */
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                        {dmMessages.length === 0 ? (
                                            <div className="text-center text-slate-500 py-8">
                                                {isRTL ? 'ابدأ المحادثة...' : 'Start the conversation...'}
                                            </div>
                                        ) : (
                                            dmMessages.map(msg => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[75%] rounded-2xl p-3 ${msg.is_mine
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white/10 text-slate-200'
                                                        }`}>
                                                        {msg.content && <p className="text-sm">{msg.content}</p>}
                                                        {msg.media_type === 'VOICE' && msg.media_url && (
                                                            <audio src={msg.media_url} controls className="max-w-full h-8 mt-2" />
                                                        )}
                                                        {msg.media_type === 'IMAGE' && msg.media_url && (
                                                            <img src={msg.media_url} alt="Shared" className="max-w-full rounded-lg mt-2" />
                                                        )}
                                                        <p className={`text-[10px] mt-1 ${msg.is_mine ? 'text-blue-200' : 'text-slate-500'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* DM Input */}
                                    <div className="p-4 border-t border-white/10">
                                        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
                                            <input
                                                type="text"
                                                value={dmText}
                                                onChange={e => setDmText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSendDM()}
                                                placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
                                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 px-2"
                                            />
                                            <button
                                                onClick={handleSendDM}
                                                disabled={(!dmText.trim() && !audioBlob) || isSendingDM}
                                                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isSendingDM ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Send size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Conversations List */
                                <div className="p-4 space-y-4">
                                    {/* New Conversation Section */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            {isRTL ? 'بدء محادثة جديدة' : 'Start New Chat'}
                                        </h4>
                                        <div className="space-y-1">
                                            {availableUsers.slice(0, 5).map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => startConversation(user)}
                                                    className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
                                                >
                                                    <img
                                                        src={user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.name}`}
                                                        className="w-10 h-10 rounded-full"
                                                        alt={user.name}
                                                    />
                                                    <div className="flex-1 text-left">
                                                        <p className="font-medium text-sm">{user.name}</p>
                                                        <p className="text-xs text-slate-500">{user.role}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Existing Conversations */}
                                    {conversations.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                {isRTL ? 'المحادثات' : 'Recent Conversations'}
                                            </h4>
                                            <div className="space-y-1">
                                                {conversations.map(conv => (
                                                    <button
                                                        key={conv.id}
                                                        onClick={() => startConversation(conv.user)}
                                                        className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
                                                    >
                                                        <div className="relative">
                                                            <img
                                                                src={conv.user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.user.name}`}
                                                                className="w-10 h-10 rounded-full"
                                                                alt={conv.user.name}
                                                            />
                                                            {conv.unread_count > 0 && (
                                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center font-bold">
                                                                    {conv.unread_count}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left overflow-hidden">
                                                            <p className="font-medium text-sm">{conv.user.name}</p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                {conv.last_message?.content || (conv.last_message?.media_type === 'VOICE' ? '🎤 Voice message' : '')}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs text-slate-600">
                                                            {new Date(conv.last_message_at).toLocaleDateString()}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isDMLoading && (
                                        <div className="flex justify-center py-4">
                                            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Strategy Modal */}
            <AnimatePresence>
                {selectedStrategy && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setSelectedStrategy(null)}
                        />
                        <motion.div
                            layoutId={`strat-${selectedStrategy.id}`}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-white/20 rounded-3xl overflow-hidden max-w-4xl w-full relative z-[101] shadow-2xl"
                        >
                            <div className="aspect-video bg-black relative">
                                <img
                                    src={selectedStrategy.screenshot_url || "https://images.unsplash.com/photo-1611974714658-058f40da01f1?w=800&auto=format&fit=crop&q=60"}
                                    className="w-full h-full object-contain"
                                    alt="Full Strategy"
                                />
                            </div>
                            <div className="p-8">
                                <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <h3 className="text-3xl font-bold mb-2">{selectedStrategy.symbol} Setup</h3>
                                        <p className="text-slate-400">Published by {selectedStrategy.author} • {new Date(selectedStrategy.created_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                    <div className={isRTL ? 'text-left' : 'text-right'}>
                                        <div className="text-4xl font-mono font-bold text-blue-400">{selectedStrategy.win_rate}%</div>
                                        <div className="text-sm text-slate-500 uppercase tracking-widest font-bold">Community Win Rate</div>
                                    </div>
                                </div>

                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="space-y-4">
                                        <h4 className={`font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <ShieldCheck size={18} className="text-green-500" />
                                            Technical Indicators
                                        </h4>
                                        <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : ''}`}>
                                            {['EMA 20/50', 'RSI (14)', 'MACD', 'Volume Profile'].map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className={`font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <BarChart3 size={18} className="text-blue-500" />
                                            Description
                                        </h4>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            {selectedStrategy.description || "This setup focuses on catching trend reversals on the 15m timeframe using a combination of momentum oscillators and volume confirmation."}
                                        </p>
                                    </div>
                                </div>

                                <div className={`mt-8 pt-8 border-t border-white/10 flex justify-end gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Button variant="secondary" onClick={() => setSelectedStrategy(null)}>{isRTL ? 'إغلاق' : 'Close'}</Button>
                                    <Button className="bg-blue-600 hover:bg-blue-500 flex items-center gap-2">
                                        <Share2 size={16} />
                                        {isRTL ? 'نسخ الإعداد إلى الرسوم البيانية الخاصة بي' : 'Copy Setup to My Chart'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunityHub;
