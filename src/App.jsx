import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Checkout from './pages/Checkout';
import Leaderboard from './pages/Leaderboard';
import News from './pages/News';
import CommunityHub from './pages/CommunityHub';
import Academy from './pages/Academy';
import Lesson from './pages/Lesson';
import Course from './pages/Course';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout><Landing /></Layout>} />
                <Route path="/news" element={<Layout><News /></Layout>} />
                <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Layout>
                            <Dashboard />
                        </Layout>
                    </ProtectedRoute>
                } />

                <Route path="/community-hub" element={
                    <ProtectedRoute>
                        <Layout>
                            <CommunityHub />
                        </Layout>
                    </ProtectedRoute>
                } />

                <Route path="/checkout" element={
                    <ProtectedRoute>
                        <Layout>
                            <Checkout />
                        </Layout>
                    </ProtectedRoute>
                } />

                {/* Academy Routes */}
                <Route path="/academy" element={
                    <Layout>
                        <Academy />
                    </Layout>
                } />
                <Route path="/academy/course/:courseId" element={
                    <Layout>
                        <Course />
                    </Layout>
                } />
                <Route path="/academy/lesson/:lessonId" element={
                    <ProtectedRoute>
                        <Lesson />
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
