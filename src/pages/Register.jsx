import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { auth } from '../services/api';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await auth.register(name, email, password);
            // Auto login or redirect to login? Let's redirect to login for simplicity
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Start Your Journey</h1>
                    <p className="text-slate-400">Create an account to begin your evaluation</p>
                </div>

                {error && <div className="p-3 rounded bg-red-500/10 text-red-500 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Full Name</label>
                        <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500 transition-colors"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Email</label>
                        <input
                            type="email"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500 transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Password</label>
                        <input
                            type="password"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button className="w-full" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>

                <div className="text-center text-sm text-slate-400">
                    Already have an account? <Link to="/login" className="text-primary-500 hover:text-primary-400">Login</Link>
                </div>
            </Card>
        </div>
    );
}
