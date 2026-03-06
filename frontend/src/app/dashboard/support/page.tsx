'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import { MessageCircle, Mail, HelpCircle, ExternalLink, ChevronDown, Headphones, BookOpen } from 'lucide-react';
import { StaggerContainer, FadeUpItem } from '@/components/ui/Animations';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ = [
  { q: 'How do I create a server?', a: 'Go to Plans, choose a plan, and click Deploy. Your server will be ready in seconds.' },
  { q: 'How do I add balance?', a: 'Navigate to Billing, select an amount and payment method, and complete the payment.' },
  { q: 'What happens when my server expires?', a: 'Your server will be suspended. Renew it from the server dashboard to restore access.' },
  { q: 'Can I upgrade my plan?', a: 'Delete your current server and create a new one with a higher plan. Your files will not transfer.' },
  { q: 'How do credits work?', a: 'Watch ads on the Credits page to earn free credits that can be used for services.' },
  { q: 'My server is not starting. What do I do?', a: 'Check the console for errors. Try reinstalling the server or contact support.' },
];

export default function SupportPage() {
  const [settings, setSettings] = useState<any>({});
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    settingsApi.public().then(r => setSettings(r.data || {})).catch(() => {});
  }, []);

  return (
    <StaggerContainer className="space-y-6 max-w-3xl">
      <FadeUpItem>
        <div className="page-header">
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-primary" /> Support
          </h1>
          <p className="text-sm text-gray-500 mt-1">Need help? We&apos;re here for you.</p>
        </div>
      </FadeUpItem>

      {/* Contact Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FadeUpItem>
          <a href={settings.DISCORD_INVITE_URL || '#'} target="_blank" rel="noopener noreferrer"
            className="neo-card group p-5 flex items-center gap-4 cursor-pointer hover:border-[#5865F2]/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.2)' }}>
              <MessageCircle className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">Discord Server</p>
              <p className="text-[12px] text-gray-500">Chat with us in real-time</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-[#5865F2] transition-colors" />
          </a>
        </FadeUpItem>

        <FadeUpItem>
          <a href={`mailto:${settings.SUPPORT_EMAIL || 'support@example.com'}`}
            className="neo-card group p-5 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">Email Support</p>
              <p className="text-[12px] text-gray-500 truncate">{settings.SUPPORT_EMAIL || 'support@example.com'}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
          </a>
        </FadeUpItem>
      </div>

      {/* FAQ */}
      <FadeUpItem>
        <div className="neo-card overflow-hidden">
          <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <BookOpen className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Frequently Asked Questions</h2>
            <span className="text-[11px] text-gray-600 ml-auto">{FAQ.length} questions</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {FAQ.map((f, i) => (
              <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{f.q}</p>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform shrink-0 ${openFaq === i ? 'rotate-180 text-primary' : ''}`} />
                </div>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-gray-400 mt-2 overflow-hidden"
                    >
                      {f.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </div>
      </FadeUpItem>
    </StaggerContainer>
  );
}
