"use client";

import { useState } from "react";
import { MessageCircle, ExternalLink, ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "How do I start my server?",
    answer: "Navigate to your server's control panel and click the green 'Start' button. Your server will initialize and start appearing in the console within seconds.",
  },
  {
    question: "How do I install mods or plugins?",
    answer: "Go to your server's 'Plugins' tab. You can search Modrinth or Spiget marketplaces directly and install plugins with one click. For manual installs, use the 'Files' tab to upload your plugin jar.",
  },
  {
    question: "My server won't start, what do I do?",
    answer: "Check the Console tab for error messages. Common fixes: 1) Ensure your startup configuration is correct in Settings. 2) Check if you've exceeded resource limits. 3) Try reinstalling from Settings → Danger Zone.",
  },
  {
    question: "How does billing work?",
    answer: "Add balance via Razorpay, Cashfree, or UPI from the Billing page. Server renewals are automatic if you have sufficient balance. You can also earn credits daily and convert them to balance.",
  },
  {
    question: "Can I upgrade my server plan?",
    answer: "Yes! Visit the Plans page to see all available plans. CUSTOM plans allow you to configure exact CPU, RAM, and disk to your needs. Contact support for migration assistance.",
  },
  {
    question: "How do I connect to my server?",
    answer: "Your server's IP and port are shown on the Overview tab. Use this address in your Minecraft/game client to connect. Default port is 25565 for Minecraft Java Edition.",
  },
  {
    question: "What is the credit system?",
    answer: "Credits can be earned daily by clicking the 'Earn Credits' button on the Credits page. Accumulated credits can be used to offset server costs or add to your balance.",
  },
  {
    question: "How do I manage player access?",
    answer: "Use the Players tab in your server's control panel. You can whitelist players, grant operator permissions, ban/unban players, and manage IP bans all from one place.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm font-medium group-hover:text-neon-orange transition-colors">{question}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground pb-4">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Support</h1>

      <GlassCard className="p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#5865F2]/10 flex items-center justify-center mx-auto">
          <MessageCircle className="w-8 h-8 text-[#5865F2]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Need Help?</h2>
          <p className="text-sm text-muted-foreground mt-1">Join our Discord community for real-time support, updates, and discussions.</p>
        </div>
        <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">
          <Button variant="glow" className="bg-[#5865F2] hover:bg-[#4752C4]">
            <ExternalLink className="w-4 h-4 mr-2" /> Join Discord
          </Button>
        </a>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-semibold mb-2">Frequently Asked Questions</h3>
        <div className="divide-y divide-white/5">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <h3 className="font-semibold">Quick Tips</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Check the <strong>Console</strong> tab on your server page for real-time logs.</p>
          <p>• Use <strong>Files</strong> tab to edit config files directly in the browser.</p>
          <p>• Server not starting? Try reinstalling from <strong>Settings → Danger Zone</strong>.</p>
          <p>• Balance low? Add funds via <strong>Billing</strong> or earn <strong>Credits</strong>.</p>
        </div>
      </GlassCard>
    </div>
  );
}
