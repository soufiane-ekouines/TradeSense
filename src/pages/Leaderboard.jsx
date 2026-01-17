import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { leaderboard } from '../services/api';
import { Trophy, Medal } from 'lucide-react';

export default function Leaderboard() {
    const [traders, setTraders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data } = await leaderboard.getTop10();
                setTraders(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (index) => {
        if (index === 0) return <Trophy className="text-yellow-400" size={24} />;
        if (index === 1) return <Medal className="text-gray-300" size={24} />;
        if (index === 2) return <Medal className="text-amber-600" size={24} />;
        return <span className="text-slate-500 font-bold w-6 text-center">{index + 1}</span>;
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">Top Traders</h1>
                <p className="text-slate-400">Wall of Fame - This Month's Best Performers</p>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Trader</th>
                                <th className="px-6 py-4 text-right">Profit %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-500">Loading leaderboard...</td></tr>
                            ) : traders.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-500">No active traders this month yet.</td></tr>
                            ) : (
                                traders.map((trader, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">{getRankIcon(i)}</td>
                                        <td className="px-6 py-4 font-medium">{trader.name}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-emerald-400 font-bold">+{trader.profit_pct}%</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
