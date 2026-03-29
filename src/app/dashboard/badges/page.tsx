'use client';

import { motion } from 'framer-motion';
import { useGamification } from '@/hooks/useGamification';
import { BADGES, RARITY_COLORS, Badge, BadgeRarity } from '@/data/badges';
import { useState } from 'react';
import { Lock } from 'lucide-react';

const RARITY_ORDER: BadgeRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  nutrition: { label: 'Nutrition', icon: '🍽️' },
  hydration: { label: 'Hydration', icon: '💧' },
  streak:    { label: 'Streaks', icon: '🔥' },
  progress:  { label: 'Progress', icon: '📊' },
  chat:      { label: 'Chat', icon: '💬' },
  special:   { label: 'Special', icon: '🌟' },
};

export default function BadgesPage() {
  const { profile, loading } = useGamification();
  const [filter, setFilter] = useState<string>('all');

  const earnedIds = new Set(profile.badges);
  const earnedCount = profile.badges.length;
  const totalCount = BADGES.length;

  const filteredBadges = filter === 'all'
    ? BADGES
    : BADGES.filter(b => b.category === filter);

  // Find next closest badge (not earned, lowest rarity)
  const nextBadge = BADGES
    .filter(b => !earnedIds.has(b.id))
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">🏆 Badge Collection</h1>
        <p className="text-gray-500 mt-1">Earn badges by completing nutrition milestones</p>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-emerald-700 to-emerald-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-emerald-200 text-sm">Badges Earned</div>
            <div className="text-4xl font-bold mt-1">{earnedCount} <span className="text-lg text-emerald-300 font-normal">/ {totalCount}</span></div>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
            <span className="text-4xl">🏅</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-emerald-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / totalCount) * 100}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Next Badge Highlight */}
      {nextBadge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
            {nextBadge.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-amber-600 font-medium uppercase tracking-wider">Next Badge</div>
            <div className="text-sm font-bold text-gray-900">{nextBadge.name}</div>
            <div className="text-xs text-gray-500">{nextBadge.condition}</div>
          </div>
          <div className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${RARITY_COLORS[nextBadge.rarity].bg} ${RARITY_COLORS[nextBadge.rarity].text} ${RARITY_COLORS[nextBadge.rarity].border} border`}>
            {nextBadge.rarity}
          </div>
        </motion.div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <FilterTab label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={BADGES.length} />
        {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
          <FilterTab key={key} label={`${icon} ${label}`} active={filter === key} onClick={() => setFilter(key)}
            count={BADGES.filter(b => b.category === key).length} />
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredBadges.map((badge, i) => {
          const earned = earnedIds.has(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className={`relative rounded-2xl border p-4 text-center transition-all ${
                earned
                  ? `${RARITY_COLORS[badge.rarity].bg} ${RARITY_COLORS[badge.rarity].border} shadow-md ${RARITY_COLORS[badge.rarity].glow}`
                  : 'bg-gray-50 border-gray-200 opacity-50'
              }`}
            >
              <div className={`text-3xl mb-2 ${earned ? '' : 'grayscale'}`}>
                {earned ? badge.icon : <Lock className="w-6 h-6 mx-auto text-gray-300" />}
              </div>
              <div className={`text-xs font-bold mb-0.5 ${earned ? 'text-gray-900' : 'text-gray-400'}`}>
                {earned ? badge.name : '???'}
              </div>
              <div className={`text-[10px] ${earned ? 'text-gray-500' : 'text-gray-300'}`}>
                {earned ? badge.description : badge.condition}
              </div>
              {earned && (
                <div className={`mt-2 text-[9px] font-bold uppercase tracking-wider ${RARITY_COLORS[badge.rarity].text}`}>
                  {badge.rarity}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        active
          ? 'bg-emerald-700 text-white border-emerald-700'
          : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200'
      }`}
    >
      {label} <span className="opacity-60 ml-0.5">{count}</span>
    </button>
  );
}
