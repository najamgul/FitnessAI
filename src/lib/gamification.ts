/**
 * AZIAF Gamification Engine
 * Core XP, Level, Streak, and Badge logic
 */

// ─── XP Rewards Table ───
export const XP_REWARDS = {
  MEAL_COMPLETE: 25,
  ALL_MEALS_COMPLETE: 100,
  HYDRATION_SLOT: 10,
  HYDRATION_GOAL: 50,
  LOG_PROGRESS: 50,
  ASK_AZAI: 5,
  COMPLETE_ONBOARDING: 200,
  FIRST_WEEK_STREAK: 500,
  DAILY_CHALLENGE_COMPLETE: 0, // varies per challenge
  ALL_CHALLENGES_COMPLETE: 75,
} as const;

// ─── Level System ───
export const LEVEL_TITLES: Record<number, { title: string; emoji: string; unlock?: string }> = {
  1:  { title: 'Nutrition Seedling', emoji: '🌱' },
  2:  { title: 'Health Sprout', emoji: '🌿', unlock: 'Streak counter visible' },
  3:  { title: 'Green Beginner', emoji: '🍀', unlock: 'First streak shield' },
  5:  { title: 'Meal Planner', emoji: '🥗', unlock: 'Custom dashboard theme' },
  8:  { title: 'Active Tracker', emoji: '🏃', unlock: 'Hydration sounds' },
  10: { title: 'Fitness Enthusiast', emoji: '💪', unlock: 'Badge showcase' },
  15: { title: 'Nutrition Strategist', emoji: '🧠', unlock: 'Azai deep analysis' },
  20: { title: 'Health Champion', emoji: '🏆', unlock: 'Animated profile frame' },
  25: { title: 'Wellness Master', emoji: '👑', unlock: 'Gold name badge' },
  30: { title: 'Azai Legend', emoji: '🌟', unlock: 'Custom avatar glow' },
};

/**
 * XP required to reach a given level.
 * xpForLevel(n) = floor(100 * n * 1.5)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += Math.floor(100 * i * 1.5);
  }
  return total;
}

/**
 * XP needed just for this level (not cumulative).
 */
export function xpForThisLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * level * 1.5);
}

/**
 * Calculate level from totalXP.
 */
export function levelFromXP(totalXP: number): number {
  let level = 1;
  let cumulative = 0;
  while (true) {
    const next = Math.floor(100 * (level + 1) * 1.5);
    if (cumulative + next > totalXP) break;
    cumulative += next;
    level++;
  }
  return level;
}

/**
 * Get the title for a given level (uses closest lower defined title).
 */
export function getTitleForLevel(level: number): { title: string; emoji: string } {
  const definedLevels = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const l of definedLevels) {
    if (level >= l) return LEVEL_TITLES[l];
  }
  return LEVEL_TITLES[1];
}

/**
 * Calculate streak multiplier.
 * 7+ days = 1.5x, 30+ days = 2x
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 7) return 1.5;
  return 1.0;
}

/**
 * Calculate XP progress within current level.
 */
export function getLevelProgress(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPercent: number;
  title: string;
  emoji: string;
} {
  const level = levelFromXP(totalXP);
  const xpAtCurrentLevel = xpForLevel(level);
  const xpAtNextLevel = xpForLevel(level + 1);
  const currentLevelXP = totalXP - xpAtCurrentLevel;
  const xpToNextLevel = xpAtNextLevel - xpAtCurrentLevel;
  const progressPercent = xpToNextLevel > 0 ? Math.min((currentLevelXP / xpToNextLevel) * 100, 100) : 100;
  const { title, emoji } = getTitleForLevel(level);

  return { level, currentLevelXP, xpToNextLevel, progressPercent, title, emoji };
}

// ─── Streak Logic ───

/**
 * Check if a streak should continue, break, or use a shield.
 * @returns Updated streak state
 */
export function calculateStreak(
  lastActiveDate: string | null,
  currentDate: string,
  currentStreak: number,
  shields: number
): { streakDays: number; shieldsRemaining: number; streakBroken: boolean; shieldUsed: boolean } {
  if (!lastActiveDate) {
    return { streakDays: 1, shieldsRemaining: shields, streakBroken: false, shieldUsed: false };
  }

  const last = new Date(lastActiveDate);
  const current = new Date(currentDate);
  const diffMs = current.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day — no change
    return { streakDays: currentStreak, shieldsRemaining: shields, streakBroken: false, shieldUsed: false };
  }
  if (diffDays === 1) {
    // Consecutive day — streak continues
    return { streakDays: currentStreak + 1, shieldsRemaining: shields, streakBroken: false, shieldUsed: false };
  }
  if (diffDays === 2 && shields > 0) {
    // Missed one day but have a shield
    return { streakDays: currentStreak + 1, shieldsRemaining: shields - 1, streakBroken: false, shieldUsed: true };
  }
  // Streak broken
  return { streakDays: 1, shieldsRemaining: shields, streakBroken: true, shieldUsed: false };
}

// ─── Gamification Profile Type ───

export type GamificationProfile = {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  title: string;
  emoji: string;
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakShields: number;
  badges: string[];
  totalMealsCompleted: number;
  totalWaterLogged: number;
  totalDaysLogged: number;
  totalQuestionsAsked: number;
  questionsAskedToday: number;
  lastQuestionDate: string | null;
};

export const DEFAULT_PROFILE: GamificationProfile = {
  totalXP: 0,
  level: 1,
  currentLevelXP: 0,
  xpToNextLevel: 300,
  title: 'Nutrition Seedling',
  emoji: '🌱',
  streakDays: 0,
  longestStreak: 0,
  lastActiveDate: null,
  streakShields: 0,
  badges: [],
  totalMealsCompleted: 0,
  totalWaterLogged: 0,
  totalDaysLogged: 0,
  totalQuestionsAsked: 0,
  questionsAskedToday: 0,
  lastQuestionDate: null,
};
