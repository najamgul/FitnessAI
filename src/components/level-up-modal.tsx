'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SoundEngine } from './sound-engine';
import { useEffect } from 'react';

type LevelUpModalProps = {
  show: boolean;
  level: number;
  emoji: string;
  title: string;
  unlock?: string;
  onClose: () => void;
};

/**
 * Full-screen level up celebration.
 */
export function LevelUpModal({ show, level, emoji, title, unlock, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (show) SoundEngine.levelUp();
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 bg-gradient-to-b from-emerald-50 to-white rounded-[2rem] p-8 sm:p-10 max-w-sm w-full text-center shadow-2xl border border-emerald-100"
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 180, damping: 15 }}
          >
            {/* Rays */}
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-0.5 bg-gradient-to-b from-amber-300 to-transparent"
                  style={{
                    left: '50%', top: '30%', height: '60px',
                    transformOrigin: 'top center',
                    rotate: `${i * 45}deg`,
                  }}
                  animate={{ opacity: [0, 0.4, 0], scaleY: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>

            {/* Level badge */}
            <motion.div
              className="w-24 h-24 mx-auto rounded-full bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center mb-4 shadow-lg shadow-emerald-200"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <span className="text-5xl">{emoji}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="text-xs uppercase tracking-widest text-emerald-600 font-medium mb-1">Level Up!</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">Level {level}</h3>
              <p className="text-lg font-semibold text-emerald-700 mb-2">{title}</p>
              {unlock && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3 inline-flex items-center gap-2">
                  <span className="text-sm">🔓</span>
                  <span className="text-amber-700 text-sm font-medium">{unlock}</span>
                </div>
              )}
            </motion.div>

            <motion.button
              className="mt-6 w-full py-3 bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-colors"
              onClick={onClose}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              Let's Go! 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
