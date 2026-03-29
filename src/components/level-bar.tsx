'use client';

import { motion } from 'framer-motion';

type LevelBarProps = {
  level: number;
  emoji: string;
  title: string;
  currentXP: number;
  xpToNext: number;
  progressPercent: number;
  streakDays: number;
  multiplier: number;
  compact?: boolean;
};

/**
 * Persistent XP progress bar — shows level, title, progress, streak, and multiplier.
 */
export function LevelBar({ level, emoji, title, currentXP, xpToNext, progressPercent, streakDays, multiplier, compact }: LevelBarProps) {
  return (
    <div className={`w-full ${compact ? 'py-2' : 'py-3'}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Level + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.div
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            {emoji}
          </motion.div>
          <div className="min-w-0">
            <div className="text-xs text-gray-400 font-medium leading-none">Level {level}</div>
            <div className="text-sm font-bold text-gray-900 truncate">{title}</div>
          </div>
        </div>

        {/* Right: Streak + Multiplier */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {streakDays > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold text-orange-600">{streakDays}</span>
            </div>
          )}
          {multiplier > 1 && (
            <div className="bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
              <span className="text-[10px] font-bold text-amber-700">×{multiplier}x</span>
            </div>
          )}
        </div>
      </div>

      {/* XP Bar */}
      <div className="mt-2">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">{currentXP.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
          <span className="text-[10px] text-emerald-600 font-medium">{Math.round(progressPercent)}%</span>
        </div>
      </div>
    </div>
  );
}
