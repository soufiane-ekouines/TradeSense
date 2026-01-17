import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import demoVideo from '../../demo.mp4';

export default function CinematicVideoModal({ isOpen, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                    {/* Backdrop with progressive blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
                    />

                    {/* Modal Content container with perspective */}
                    <div className="relative w-full max-w-6xl aspect-video perspective-[1000px]">
                        <motion.div
                            initial={{ scale: 0.1, opacity: 0, rotateX: 45, y: 100 }}
                            animate={{ scale: 1, opacity: 1, rotateX: 0, y: 0 }}
                            exit={{ scale: 0, opacity: 0, rotateX: -45, y: -100 }}
                            transition={{
                                type: 'spring',
                                damping: 20,
                                stiffness: 100,
                                duration: 0.8
                            }}
                            className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.3)] border border-white/10 bg-black"
                        >
                            {/* Animated Glow Border */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl z-10">
                                <motion.div
                                    animate={{
                                        opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute inset-0 rounded-3xl border-[2px] border-emerald-500/30"
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-violet-500/10 to-emerald-500/10 mix-blend-overlay" />
                            </div>

                            {/* Video Element */}
                            <video
                                src={demoVideo}
                                className="w-full h-full object-contain"
                                controls
                                autoPlay
                                playsInline
                            />

                            {/* Close Button */}
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="absolute top-6 right-6 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-xl text-white transition-colors"
                            >
                                <X size={24} />
                            </motion.button>

                            {/* Decorative Corner Lights */}
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/20 blur-[80px]" />
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 blur-[80px]" />
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
