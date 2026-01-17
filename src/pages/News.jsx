import React from 'react';
import NewsHubSection from '../components/NewsHubSection';

export default function News() {
    return (
        <div className="min-h-screen bg-[#050505] py-12">
            <div className="container mx-auto px-4">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
                        Terminal <span className="text-emerald-500">Intelligence</span>
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Accédez à une intelligence de marché de niveau institutionnel.
                        Analyses IA, flux en temps réel et alertes économiques centralisés sur un seul écran.
                    </p>
                </div>

                <div className="bg-slate-900/20 rounded-3xl p-4 md:p-8 border border-white/5 backdrop-blur-sm">
                    <NewsHubSection />
                </div>
            </div>
        </div>
    );
}
