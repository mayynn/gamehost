'use client';

import { useState, useEffect, useCallback } from 'react';
import { creditsApi } from '@/lib/api';
import { Gift, Clock, Coins, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreditsPage() {
    const [credits, setCredits] = useState(0);
    const [config, setConfig] = useState<any>({});
    const [timer, setTimer] = useState(0);
    const [earning, setEarning] = useState(false);

    useEffect(() => {
        creditsApi.get().then((r) => setCredits(r.data || 0)).catch(() => { });
        creditsApi.config().then((r) => setConfig(r.data || {})).catch(() => { });
    }, []);

    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const startEarning = () => {
        setEarning(true);
        setTimer(config.timerSeconds || 60);
    };

    const claimCredits = async () => {
        try {
            const { data } = await creditsApi.earn();
            setCredits(data?.total || credits + (config.reward || 10));
            toast.success(`Earned ${config.reward || 10} credits!`);
            setEarning(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to earn credits');
        }
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-2">Earn Credits</h1>
            <p className="text-gray-400 mb-8">Watch ads to earn free credits for your game servers</p>

            {/* Credits Balance */}
            <div className="glass-card p-8 text-center mb-8">
                <Gift className="w-16 h-16 text-accent mx-auto mb-4" />
                <p className="text-sm text-gray-400 mb-1">Your Credits</p>
                <p className="text-5xl font-bold gradient-text mb-2">{credits}</p>
                <p className="text-sm text-gray-500">= {config.reward || 10} credits per watch</p>
            </div>

            {/* Earn Section */}
            <div className="glass-card p-8 text-center">
                {!earning ? (
                    <div>
                        <Play className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Watch an Ad</h3>
                        <p className="text-gray-400 mb-6 text-sm">
                            Watch for {config.timerSeconds || 60} seconds to earn {config.reward || 10} credits
                        </p>
                        <button onClick={startEarning} className="btn-primary">
                            Start Earning
                        </button>
                    </div>
                ) : timer > 0 ? (
                    <div>
                        <Clock className="w-12 h-12 text-orange-400 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Watching...</h3>

                        {/* Ad placeholder */}
                        <div className="my-6 p-8 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-gray-500 text-sm">Ad content loads here</p>
                            {config.adsenseId && <p className="text-xs text-gray-600 mt-1">Powered by AdSense</p>}
                        </div>

                        {/* Timer */}
                        <div className="w-24 h-24 mx-auto rounded-full border-4 border-primary/30 flex items-center justify-center mb-4 relative">
                            <span className="text-2xl font-bold">{formatTime(timer)}</span>
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="4" />
                                <circle cx="48" cy="48" r="44" fill="none" stroke="#00d4ff" strokeWidth="4"
                                    strokeDasharray={276.46} strokeDashoffset={276.46 * (1 - timer / (config.timerSeconds || 60))}
                                    strokeLinecap="round" className="transition-all duration-1000" />
                            </svg>
                        </div>
                    </div>
                ) : (
                    <div>
                        <Coins className="w-12 h-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Ready to Claim!</h3>
                        <p className="text-gray-400 mb-6">You&apos;ve earned {config.reward || 10} credits</p>
                        <button onClick={claimCredits} className="btn-primary">
                            Claim {config.reward || 10} Credits
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
