'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Badge, RARITY_COLORS } from '@/data/badges';
import { SoundEngine } from './sound-engine';
import { useEffect } from 'react';

type BadgeUnlockModalProps = {
  badge: Badge | null;
  onClose: () => void;
};

/**
 * Full-screen badge unlock celebration modal.
 * Dark overlay + spring animation + particle burst.
 */
export function BadgeUnlockModal({ badge, onClose }: BadgeUnlockModalProps) {
  useEffect(() => {
    if (badge) {
      SoundEngine.badgeUnlock();
    }
  }, [badge]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          {/* Card */}
          <motion.div
            className="relative z-10 bg-white rounded-[2rem] p-8 sm:p-10 max-w-sm w-full text-center shadow-2xl"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {/* Particle burst */}
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${RARITY_COLORS[badge.rarity].bg}`}
                  style={{ left: '50%', top: '40%' }}
                  animate={{
                    x: Math.cos(i * 30 * Math.PI / 180) * 120,
                    y: Math.sin(i * 30 * Math.PI / 180) * 120,
                    opacity: [1, 0],
                    scale: [1, 0],
                  }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                />
              ))}
            </div>

            {/* Glow ring */}
            <motion.div
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-5 border-4 ${RARITY_COLORS[badge.rarity].border} ${RARITY_COLORS[badge.rarity].bg} shadow-lg ${RARITY_COLORS[badge.rarity].glow}`}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
            >
              <span className="text-5xl">{badge.icon}</span>
            </motion.div>

            {/* Badge name */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">Badge Unlocked!</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{badge.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{badge.description}</p>
              <div className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${RARITY_COLORS[badge.rarity].border} ${RARITY_COLORS[badge.rarity].text} ${RARITY_COLORS[badge.rarity].bg}`}>
                {badge.rarity}
              </div>
            </motion.div>

            {/* XP reward */}
            <motion.div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 inline-flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <span className="text-lg">⚡</span>
              <span className="text-emerald-700 font-bold">+{badge.xpReward} XP</span>
            </motion.div>

            {/* Close */}
            <motion.button
              className="mt-6 w-full py-3 bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-colors"
              onClick={onClose}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              Awesome! 🎉
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
