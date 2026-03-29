'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SoundEngine } from './sound-engine';

type XPRewardProps = {
  amount: number | null;
  source?: string;
  multiplied?: boolean;
  onComplete?: () => void;
};

/**
 * Floating "+25 XP" reward toast that rises and fades.
 * Plays a chime sound on appear.
 */
export function XPReward({ amount, source, multiplied, onComplete }: XPRewardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (amount && amount > 0) {
      setVisible(true);
      SoundEngine.xpGain();
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [amount, onComplete]);

  return (
    <AnimatePresence>
      {visible && amount && (
        <motion.div
          className="fixed top-20 right-6 z-[100] pointer-events-none"
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className="bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-700/30 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-lg font-bold leading-none">+{amount} XP</div>
              {source && <div className="text-emerald-200 text-xs mt-0.5">{source}</div>}
            </div>
            {multiplied && (
              <div className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                BONUS
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
