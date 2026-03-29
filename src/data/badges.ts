/**
 * Badge Definitions — Complete collection for AZIAF gamification
 */

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: 'nutrition' | 'hydration' | 'streak' | 'progress' | 'chat' | 'special';
  condition: string;     // human-readable
  xpReward: number;
};

export const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; text: string; glow: string }> = {
  common:    { bg: 'bg-gray-100',    border: 'border-gray-300',    text: 'text-gray-600',    glow: 'shadow-gray-200' },
  uncommon:  { bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700', glow: 'shadow-emerald-200' },
  rare:      { bg: 'bg-blue-50',     border: 'border-blue-300',    text: 'text-blue-700',    glow: 'shadow-blue-200' },
  epic:      { bg: 'bg-purple-50',   border: 'border-purple-300',  text: 'text-purple-700',  glow: 'shadow-purple-200' },
  legendary: { bg: 'bg-amber-50',    border: 'border-amber-400',   text: 'text-amber-700',   glow: 'shadow-amber-200' },
};

export const BADGES: Badge[] = [
  // ── Nutrition ──
  { id: 'first_bite',       name: 'First Bite',       description: 'Complete your first meal',       icon: '🍽️', rarity: 'common',    category: 'nutrition', condition: 'Complete 1 meal',             xpReward: 25 },
  { id: 'meal_prep_pro',    name: 'Meal Prep Pro',    description: 'Complete 50 meals total',        icon: '🥗', rarity: 'uncommon',  category: 'nutrition', condition: 'Complete 50 meals',            xpReward: 100 },
  { id: 'iron_chef',        name: 'Iron Chef',        description: 'Complete 200 meals total',       icon: '👨‍🍳', rarity: 'rare',      category: 'nutrition', condition: 'Complete 200 meals',           xpReward: 250 },
  { id: 'nutrition_master', name: 'Nutrition Master',  description: 'Complete 500 meals total',       icon: '🏅', rarity: 'epic',      category: 'nutrition', condition: 'Complete 500 meals',           xpReward: 500 },
  { id: 'perfect_day',      name: 'Perfect Day',      description: '100% meal completion in a day',  icon: '⭐', rarity: 'uncommon',  category: 'nutrition', condition: '100% meal completion in a day', xpReward: 100 },
  { id: 'perfect_week',     name: 'Perfect Week',     description: '7 consecutive perfect days',     icon: '🌟', rarity: 'epic',      category: 'nutrition', condition: '7 perfect days in a row',      xpReward: 500 },

  // ── Hydration ──
  { id: 'first_drop',       name: 'First Drop',       description: 'Complete your first water slot',  icon: '💧', rarity: 'common',    category: 'hydration', condition: 'Complete 1 hydration slot',    xpReward: 10 },
  { id: 'water_warrior',    name: 'Water Warrior',    description: 'Hit 100% hydration 10 times',    icon: '🌊', rarity: 'rare',      category: 'hydration', condition: '100% hydration 10 times',     xpReward: 200 },
  { id: 'hydration_hero',   name: 'Hydration Hero',   description: 'Hit 100% hydration 30 times',    icon: '🏊', rarity: 'epic',      category: 'hydration', condition: '100% hydration 30 times',     xpReward: 400 },
  { id: 'ocean_master',     name: 'Ocean Master',     description: 'Log 100L total water',           icon: '🐋', rarity: 'legendary', category: 'hydration', condition: 'Log 100 liters total',        xpReward: 1000 },

  // ── Streak ──
  { id: 'getting_started',  name: 'Getting Started',  description: 'Maintain a 3-day streak',        icon: '🔥', rarity: 'common',    category: 'streak',    condition: '3-day streak',                xpReward: 50 },
  { id: 'week_warrior',     name: 'Week Warrior',     description: 'Maintain a 7-day streak',        icon: '💥', rarity: 'uncommon',  category: 'streak',    condition: '7-day streak',                xpReward: 200 },
  { id: 'fortnight_force',  name: 'Fortnight Force',  description: 'Maintain a 14-day streak',       icon: '⚡', rarity: 'rare',      category: 'streak',    condition: '14-day streak',               xpReward: 350 },
  { id: 'monthly_monarch',  name: 'Monthly Monarch',  description: 'Maintain a 30-day streak',       icon: '👑', rarity: 'epic',      category: 'streak',    condition: '30-day streak',               xpReward: 750 },
  { id: 'quarterly_queen',  name: 'Quarterly Queen',  description: 'Maintain a 90-day streak',       icon: '💎', rarity: 'legendary', category: 'streak',    condition: '90-day streak',               xpReward: 2000 },

  // ── Progress ──
  { id: 'self_aware',       name: 'Self Aware',       description: 'Log your progress for the first time', icon: '📊', rarity: 'common',   category: 'progress',  condition: 'Log progress 1 time',        xpReward: 25 },
  { id: 'data_driven',      name: 'Data Driven',      description: 'Log progress for 7 days',        icon: '📈', rarity: 'uncommon',  category: 'progress',  condition: 'Log progress 7 days',        xpReward: 150 },
  { id: 'trend_setter',     name: 'Trend Setter',     description: 'Log progress for 30 days',       icon: '📉', rarity: 'rare',      category: 'progress',  condition: 'Log progress 30 days',       xpReward: 400 },

  // ── Chat ──
  { id: 'curious_mind',     name: 'Curious Mind',     description: 'Ask Azai 10 questions',          icon: '💬', rarity: 'common',    category: 'chat',      condition: 'Ask 10 questions',           xpReward: 50 },
  { id: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Ask Azai 50 questions',          icon: '📚', rarity: 'uncommon',  category: 'chat',      condition: 'Ask 50 questions',           xpReward: 200 },
  { id: 'nutrition_scholar', name: 'Nutrition Scholar', description: 'Ask Azai 200 questions',        icon: '🎓', rarity: 'rare',      category: 'chat',      condition: 'Ask 200 questions',          xpReward: 500 },

  // ── Special ──
  { id: 'origin_story',     name: 'Origin Story',     description: 'Complete the onboarding process', icon: '🚀', rarity: 'common',    category: 'special',   condition: 'Complete onboarding',        xpReward: 200 },
  { id: 'early_bird',       name: 'Early Bird',       description: 'Complete a meal before 7 AM',    icon: '🌅', rarity: 'uncommon',  category: 'special',   condition: 'Meal before 7 AM',           xpReward: 75 },
  { id: 'comeback_kid',     name: 'Comeback Kid',     description: 'Resume after a 7+ day break',    icon: '💪', rarity: 'rare',      category: 'special',   condition: 'Resume after 7-day break',   xpReward: 150 },
];

/**
 * Check which new badges should be unlocked based on profile stats.
 */
export function checkBadgeUnlocks(
  currentBadges: string[],
  stats: {
    totalMealsCompleted: number;
    totalWaterLogged: number;
    streakDays: number;
    totalDaysLogged: number;
    totalQuestionsAsked: number;
  }
): Badge[] {
  const newBadges: Badge[] = [];

  const conditions: Record<string, boolean> = {
    first_bite:       stats.totalMealsCompleted >= 1,
    meal_prep_pro:    stats.totalMealsCompleted >= 50,
    iron_chef:        stats.totalMealsCompleted >= 200,
    nutrition_master: stats.totalMealsCompleted >= 500,
    first_drop:       stats.totalWaterLogged >= 1,
    getting_started:  stats.streakDays >= 3,
    week_warrior:     stats.streakDays >= 7,
    fortnight_force:  stats.streakDays >= 14,
    monthly_monarch:  stats.streakDays >= 30,
    quarterly_queen:  stats.streakDays >= 90,
    self_aware:       stats.totalDaysLogged >= 1,
    data_driven:      stats.totalDaysLogged >= 7,
    trend_setter:     stats.totalDaysLogged >= 30,
    curious_mind:     stats.totalQuestionsAsked >= 10,
    knowledge_seeker: stats.totalQuestionsAsked >= 50,
    nutrition_scholar: stats.totalQuestionsAsked >= 200,
  };

  for (const badge of BADGES) {
    if (!currentBadges.includes(badge.id) && conditions[badge.id]) {
      newBadges.push(badge);
    }
  }

  return newBadges;
}
