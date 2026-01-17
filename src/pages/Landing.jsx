import React from 'react';
import Hero3D from '../components/landing/Hero3D';
import FeaturesSection from '../components/landing/FeaturesSection';
import NewsHubSection from '../components/NewsHubSection';
import CommunitySection from '../components/landing/CommunitySection';
import StrategySimulator from '../components/landing/StrategySimulator';
import HowItWorks from '../components/landing/HowItWorks';
import MasterClassSection from '../components/landing/MasterClassSection';
import FounderSection from '../components/landing/FounderSection';
import PricingSection from '../components/landing/PricingSection';
import Footer from '../components/landing/Footer';

export default function Landing() {
    return (
        <div className="bg-[#050505]">
            <Hero3D />
            <FeaturesSection />
            <div className="container mx-auto">
                <NewsHubSection />
            </div>
            <CommunitySection />
            <StrategySimulator />
            <MasterClassSection />
            <HowItWorks />
            <FounderSection />
            <PricingSection />
            <Footer />
        </div>
    );
}
