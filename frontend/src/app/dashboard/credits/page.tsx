'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { creditsApi } from '@/lib/api';
import { Gift, Clock, Coins, Play, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Anti-Adblock Detection ──────────────────────────────
function useAdblockDetector() {
    const [blocked, setBlocked] = useState<boolean | null>(null); // null = checking

    useEffect(() => {
        let cancelled = false;

        const detect = async () => {
            // Method 1: Bait element — adblockers hide elements with ad-related classnames
            const bait = document.createElement('div');
            bait.className = 'ad_unit ad-zone textad banner-ad ad-banner pub_300x250 pub_300x250m pub_728x90 text-ad adsbox ad-placement';
            bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
            bait.innerHTML = '&nbsp;';
            document.body.appendChild(bait);

            // Give adblocker time to process the DOM mutation
            await new Promise((r) => setTimeout(r, 300));

            const baitBlocked =
                bait.offsetHeight === 0 ||
                bait.offsetWidth === 0 ||
                bait.clientHeight === 0 ||
                getComputedStyle(bait).display === 'none' ||
                getComputedStyle(bait).visibility === 'hidden';
            bait.remove();

            if (baitBlocked && !cancelled) {
                setBlocked(true);
                return;
            }

            // Method 2: Try fetching a typical ad script URL that blockers intercept
            try {
                const resp = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-store',
                });
                // If it does not throw, ads likely allowed
                if (!cancelled) setBlocked(false);
            } catch {
                // Fetch blocked → adblocker likely active
                if (!cancelled) setBlocked(true);
            }
        };

        detect();
        return () => { cancelled = true; };
    }, []);

    return blocked;
}

// ─── Adsterra Script Loader ──────────────────────────────
function AdsterraZone({ src, index }: { src: string; index: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (!src || !containerRef.current || loadedRef.current) return;
        loadedRef.current = true;

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');

        // Adsterra scripts render into the element that follows the script tag,
        // or into a container with a specific ID. Append to our wrapper div.
        containerRef.current.appendChild(script);

        return () => {
            // Cleanup on unmount
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            loadedRef.current = false;
        };
    }, [src]);

    return (
        <div
            ref={containerRef}
            className="w-full min-h-[100px] flex items-center justify-center rounded-xl bg-white/5 border border-white/10 overflow-hidden"
            id={`adsterra-zone-${index}`}
        />
    );
}

// ─── AdSense Block ───────────────────────────────────────
function AdSenseBlock({ clientId }: { clientId: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (!clientId || loadedRef.current) return;
        loadedRef.current = true;

        // Load the adsbygoogle script once
        if (!document.querySelector('script[src*="adsbygoogle"]')) {
            const s = document.createElement('script');
            s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
            s.async = true;
            s.crossOrigin = 'anonymous';
            document.head.appendChild(s);
        }

        // Push ad after script loads
        try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch { }
    }, [clientId]);

    return (
        <div ref={containerRef} className="w-full min-h-[100px] rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%' }}
                data-ad-client={clientId}
                data-ad-slot="auto"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
}

export default function CreditsPage() {
    const [credits, setCredits] = useState(0);
    const [config, setConfig] = useState<any>({});
    const [timer, setTimer] = useState(0);
    const [earning, setEarning] = useState(false);
    const [loading, setLoading] = useState(true);
    const adBlocked = useAdblockDetector();

    useEffect(() => {
        Promise.all([
            creditsApi.get().then((r) => setCredits(r.data || 0)).catch(() => { }),
            creditsApi.config().then((r) => setConfig(r.data || {})).catch(() => { }),
        ]).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
        return () => clearInterval(interval);
    }, [timer]);

    // Dynamic config from admin panel
    const provider = config.provider || 'both';
    const antiAdblock = config.antiAdblock !== false; // default true
    const showAdsense = provider === 'both' || provider === 'adsense';
    const showAdsterra = provider === 'both' || provider === 'adsterra';
    const adsterraUrls: string[] = showAdsterra ? (config.adsterraUrls || (config.adsterraUrl ? [config.adsterraUrl] : [])) : [];
    const hasAds = !!(config.adsenseId && showAdsense) || adsterraUrls.length > 0;
    const adblockBlocking = antiAdblock && adBlocked === true;
    const adsDisabled = provider === 'none';

    const startEarning = () => {
        if (adblockBlocking) {
            toast.error('Please disable your ad blocker to earn credits');
            return;
        }
        if (adsDisabled) {
            toast.error('Credit earning is currently disabled');
            return;
        }
        setEarning(true);
        setTimer(config.timerSeconds || 60);
    };

    const claimCredits = async () => {
        if (adblockBlocking) {
            toast.error('Ad blocker detected — credits cannot be claimed');
            return;
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-2">Earn Credits</h1>
            <p className="text-gray-400 mb-8">Watch ads to earn free credits for your game servers</p>

            {/* Ads Disabled Banner */}
            {adsDisabled && (
                <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="text-yellow-400 font-semibold text-sm">Credit Earning Paused</h3>
                        <p className="text-yellow-300/80 text-xs mt-1">The admin has temporarily disabled ad-based credit earning.</p>
                    </div>
                </div>
            )}

            {/* Adblock Warning Banner */}
            {adblockBlocking && !adsDisabled && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="text-red-400 font-semibold text-sm">Ad Blocker Detected</h3>
                        <p className="text-red-300/80 text-xs mt-1">
                            Please disable your ad blocker for this site to earn credits.
                            Ads fund free game servers — we keep them minimal and non-intrusive.
                        </p>
                    </div>
                </div>
            )}

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
                        <button
                            onClick={startEarning}
                            disabled={adblockBlocking || adsDisabled}
                            className={`btn-primary ${adblockBlocking || adsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {adblockBlocking ? 'Disable Ad Blocker First' : adsDisabled ? 'Credit Earning Paused' : 'Start Earning'}
                        </button>
                    </div>
                ) : timer > 0 ? (
                    <div>
                        <Clock className="w-12 h-12 text-orange-400 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Watching...</h3>

                        {/* Ad Zones */}
                        <div className="my-6 space-y-4">
                            {/* Adsterra zones (dynamic based on provider mode) */}
                            {showAdsterra && adsterraUrls.map((url: string, i: number) => (
                                <AdsterraZone key={`adsterra-${i}`} src={url} index={i} />
                            ))}

                            {/* AdSense zone (dynamic based on provider mode) */}
                            {showAdsense && config.adsenseId && (
                                <AdSenseBlock clientId={config.adsenseId} />
                            )}

                            {/* Fallback if no ads configured */}
                            {!hasAds && !adsDisabled && (
                                <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <AlertTriangle className="w-8 h-8 text-yellow-500/60 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No ad networks configured</p>
                                    <p className="text-gray-600 text-xs mt-1">Admin: Set ADSTERRA_SCRIPT_URLS or ADSENSE_PUBLISHER_ID in .env</p>
                                </div>
                            )}
                        </div>

                        {/* Timer */}
                        <div className="w-24 h-24 mx-auto rounded-full border-4 border-primary/30 flex items-center justify-center mb-4 relative">
                            <span className="text-2xl font-bold">{formatTime(timer)}</span>
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="4" />
                                <circle cx="48" cy="48" r="44" fill="none" stroke="#00d4ff" strokeWidth="4"
                                    strokeDasharray={276.46} strokeDashoffset={276.46 * (1 - timer / (config.timerSeconds || 60))}
                                    strokeLinecap="round" className="transition-all duration-1000" />
                            </svg>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">Keep this page open — timer resets if you leave</p>
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

            {/* How It Works */}
            <div className="mt-8 glass-card p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">How It Works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs text-gray-400">
                    <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-lg mb-1">1</div>
                        <p>Click <strong className="text-white">Start Earning</strong></p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-lg mb-1">2</div>
                        <p>Wait {config.timerSeconds || 60}s while ads display</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-lg mb-1">3</div>
                        <p>Claim <strong className="text-accent">{config.reward || 10} credits</strong></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
