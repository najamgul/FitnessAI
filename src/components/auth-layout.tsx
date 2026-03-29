'use client';

import type React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Floating nutrition SVG elements for background
const FloatingElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Floating leaf */}
    <motion.svg viewBox="0 0 40 40" className="absolute top-[10%] left-[8%] w-10 h-10 opacity-15"
      animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity }}>
      <path d="M20 4 Q35 15 20 36 Q5 15 20 4Z" fill="#34d399" />
      <line x1="20" y1="10" x2="20" y2="32" stroke="#059669" strokeWidth="1" />
    </motion.svg>

    {/* Floating apple */}
    <motion.svg viewBox="0 0 30 30" className="absolute top-[25%] right-[12%] w-8 h-8 opacity-10"
      animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}>
      <circle cx="15" cy="17" r="10" fill="#10b981" />
      <path d="M15 7 L16 11" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
    </motion.svg>

    {/* Floating drop */}
    <motion.svg viewBox="0 0 24 24" className="absolute bottom-[20%] left-[15%] w-6 h-6 opacity-12"
      animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }}>
      <path d="M12 2 C12 2 4 12 4 16 C4 20 8 22 12 22 C16 22 20 20 20 16 C20 12 12 2 12 2Z" fill="#6ee7b7" />
    </motion.svg>

    {/* Plus signs (health) */}
    {[{ top: '60%', left: '85%', d: 0.5 }, { top: '15%', left: '75%', d: 1.5 }, { top: '70%', left: '10%', d: 2.5 }].map((p, i) => (
      <motion.svg key={i} viewBox="0 0 20 20" className="absolute w-5 h-5 opacity-10" style={{ top: p.top, left: p.left }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.06, 0.12, 0.06] }} transition={{ duration: 3, repeat: Infinity, delay: p.d }}>
        <line x1="10" y1="4" x2="10" y2="16" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="10" x2="16" y2="10" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      </motion.svg>
    ))}

    {/* Gradient orbs */}
    <motion.div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-200/20 blur-3xl"
      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 8, repeat: Infinity }} />
    <motion.div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-amber-200/15 blur-3xl"
      animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 10, repeat: Infinity }} />
  </div>
);

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 30%, #fffbeb 70%, #fefce8 100%)' }}>
      
      <FloatingElements />

      <motion.div className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        
        {/* Logo */}
        <motion.div className="mb-8 flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Link href="/landing" className="flex items-center gap-3 group">
            <motion.div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-700/20"
              whileHover={{ scale: 1.05, rotate: 5 }} whileTap={{ scale: 0.95 }}>
              <span className="text-white font-bold text-xl">A</span>
            </motion.div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-emerald-700 transition-colors">AZIAF</span>
          </Link>
          <p className="text-gray-400 text-xs tracking-wider uppercase">AI-Powered Nutrition</p>
        </motion.div>

        {children}

        {/* Footer */}
        <motion.p className="mt-6 text-center text-xs text-gray-400"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          Powered by Azai Intelligence
        </motion.p>
      </motion.div>
    </div>
  );
}
