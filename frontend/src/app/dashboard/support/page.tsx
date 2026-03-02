'use client';
import { HeadphonesIcon, MessageSquare, Mail } from 'lucide-react';

export default function SupportPage() {
    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-8">Support</h1>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
                <div className="glass-card-hover p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Discord Community</h3>
                    <p className="text-sm text-gray-400 mb-4">Join our Discord server for instant help and community support.</p>
                    <a href="#" className="btn-primary inline-block">Join Discord</a>
                </div>
                <div className="glass-card-hover p-8 text-center">
                    <Mail className="w-12 h-12 text-accent mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Email Support</h3>
                    <p className="text-sm text-gray-400 mb-4">Send us an email and we&apos;ll get back to you within 24 hours.</p>
                    <a href="mailto:support@gamehost.com" className="btn-secondary inline-block">Email Us</a>
                </div>
            </div>
            <div className="glass-card p-6 mt-8 max-w-4xl">
                <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                    {[
                        { q: 'How do I create a server?', a: 'Go to Plans, select a plan, choose your game, and click Deploy. Your server will be ready in seconds.' },
                        { q: 'How do free credits work?', a: 'Go to Earn Credits, watch a short ad, and claim credits. Credits can be used for free plan servers.' },
                        { q: 'What payment methods are accepted?', a: 'We accept Razorpay, Cashfree, UPI, and account balance. Check the Billing page for available gateways.' },
                        { q: 'My server is suspended, what do I do?', a: 'Server suspension is due to expired payment. Go to Billing and complete the renewal payment.' },
                    ].map((faq, i) => (
                        <details key={i} className="group">
                            <summary className="p-4 rounded-lg bg-white/5 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors">{faq.q}</summary>
                            <p className="text-sm text-gray-400 p-4 pt-2">{faq.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </div>
    );
}
