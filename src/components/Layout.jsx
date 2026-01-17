import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { LayoutDashboard, TrendingUp, LogOut, Menu, X, Trophy, Newspaper, Users, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

export default function Layout({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const { t, isRTL } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const NavLink = ({ to, icon: Icon, children }) => {
        const active = location.pathname === to;
        return (
            <Link
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${active ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:text-white'
                    }`}
            >
                <Icon size={18} />
                {children}
            </Link>
        );
    };

    return (
        <div className={`min-h-screen bg-slate-950 flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Navbar */}
            <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center">
                            <TrendingUp className="text-white" size={20} />
                        </div>
                        Trade<span className="text-primary-500">Sense</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        <NavLink to="/" icon={TrendingUp}>{t('navbar.home')}</NavLink>
                        <NavLink to="/news" icon={Newspaper}>{t('navbar.news')}</NavLink>
                        <NavLink to="/academy" icon={GraduationCap}>Academy</NavLink>
                        <NavLink to="/community-hub" icon={Users}>{t('navbar.community')}</NavLink>
                        <NavLink to="/leaderboard" icon={Trophy}>{t('navbar.leaderboard')}</NavLink>
                        {token && <NavLink to="/dashboard" icon={LayoutDashboard}>{t('navbar.dashboard')}</NavLink>}
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <LanguageSelector />
                        {token ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-400">Hi, {user.name}</span>
                                <Button variant="secondary" onClick={handleLogout} className="text-sm px-3 py-1.5">
                                    <LogOut size={16} />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Link to="/login"><Button variant="secondary" className="text-sm">{t('navbar.login')}</Button></Link>
                                <Link to="/register"><Button className="text-sm">{t('navbar.register')}</Button></Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <div className="flex items-center gap-4 md:hidden">
                        <LanguageSelector />
                        <button className="text-slate-400" onClick={() => setIsOpen(!isOpen)}>
                            {isOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden p-4 border-t border-slate-800 bg-slate-950 absolute w-full space-y-4">
                        <NavLink to="/" icon={TrendingUp}>{t('navbar.home')}</NavLink>
                        <NavLink to="/news" icon={Newspaper}>{t('navbar.news')}</NavLink>
                        <NavLink to="/academy" icon={GraduationCap}>Academy</NavLink>
                        <NavLink to="/community-hub" icon={Users}>{t('navbar.community')}</NavLink>
                        <NavLink to="/leaderboard" icon={Trophy}>{t('navbar.leaderboard')}</NavLink>
                        {token && <NavLink to="/dashboard" icon={LayoutDashboard}>{t('navbar.dashboard')}</NavLink>}
                        <div className="pt-4 border-t border-slate-800">
                            {token ? (
                                <Button onClick={handleLogout} className="w-full">{t('navbar.logout')}</Button>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Link to="/login"><Button variant="secondary" className="w-full">{t('navbar.login')}</Button></Link>
                                    <Link to="/register"><Button className="w-full">{t('navbar.register')}</Button></Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
