/**
 * Daily Challenge Generator
 * Creates fresh challenges each day using date-based seeding
 */

export type ChallengeCategory = 'nutrition' | 'hydration' | 'activity' | 'mindfulness';

export type DailyChallenge = {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  xpReward: number;
  icon: string;
  completed: boolean;
};

const CHALLENGE_POOL: Omit<DailyChallenge, 'id' | 'completed'>[] = [
  // Nutrition
  { title: 'Breakfast Champion', description: 'Complete your breakfast before 8 AM', category: 'nutrition', xpReward: 30, icon: '🌅' },
  { title: 'Clean Plate Club', description: 'Complete all meals today', category: 'nutrition', xpReward: 75, icon: '🍽️' },
  { title: 'Snack Smart', description: 'Log a healthy snack between meals', category: 'nutrition', xpReward: 20, icon: '🥜' },
  { title: 'Meal Prepper', description: 'Complete 3 meals before 3 PM', category: 'nutrition', xpReward: 40, icon: '⏰' },
  { title: 'Veggie Power', description: 'Eat a vegetable-focused meal', category: 'nutrition', xpReward: 25, icon: '🥦' },

  // Hydration
  { title: 'Morning Hydration', description: 'Complete 2 water slots before noon', category: 'hydration', xpReward: 25, icon: '💧' },
  { title: 'Hydration Hero', description: 'Hit 100% water goal today', category: 'hydration', xpReward: 50, icon: '🌊' },
  { title: 'Water Streak', description: 'Complete 5 consecutive water slots', category: 'hydration', xpReward: 35, icon: '🏊' },
  { title: 'Aqua Master', description: 'Log water every 2 hours', category: 'hydration', xpReward: 40, icon: '🚿' },

  // Activity
  { title: 'Move It!', description: 'Log at least 30 minutes of exercise', category: 'activity', xpReward: 40, icon: '🏃' },
  { title: 'Step Challenge', description: 'Take a 10-minute walk after a meal', category: 'activity', xpReward: 25, icon: '🚶' },
  { title: 'Morning Stretch', description: 'Do 5 minutes of stretching before breakfast', category: 'activity', xpReward: 20, icon: '🧘' },

  // Mindfulness
  { title: 'Mindful Eater', description: 'Eat one meal without screens', category: 'mindfulness', xpReward: 30, icon: '🧠' },
  { title: 'Gratitude Log', description: 'Write 3 things you\'re grateful for today', category: 'mindfulness', xpReward: 20, icon: '📝' },
  { title: 'Deep Breath', description: 'Do 5 minutes of deep breathing', category: 'mindfulness', xpReward: 15, icon: '🌬️' },
  { title: 'Sleep Prep', description: 'No caffeine after 2 PM', category: 'mindfulness', xpReward: 25, icon: '☕' },
  { title: 'Azai Check-in', description: 'Ask Azai a nutrition question', category: 'mindfulness', xpReward: 15, icon: '💬' },
];

/**
 * Simple date-based hash for deterministic challenge selection.
 */
function dateHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get 3 daily challenges for a given date.
 * Uses date-based seeding so everyone sees the same challenges per day.
 */
export function getDailyChallenges(dateStr?: string): DailyChallenge[] {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const hash = dateHash(today);
  const storageKey = `challenges_${today}`;

  // Check localStorage for completion state
  let completionState: Record<string, boolean> = {};
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) completionState = JSON.parse(stored);
  } catch { /* ignore */ }

  // Select 3 challenges from different categories
  const categories: ChallengeCategory[] = ['nutrition', 'hydration', 'activity', 'mindfulness'];
  const selected: DailyChallenge[] = [];
  const usedCategories = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const catIndex = (hash + i * 7) % categories.length;
    let cat = categories[catIndex];

    // Avoid duplicate categories if possible
    if (usedCategories.has(cat)) {
      cat = categories.find(c => !usedCategories.has(c)) || cat;
    }
    usedCategories.add(cat);

    const catChallenges = CHALLENGE_POOL.filter(c => c.category === cat);
    const challengeIndex = (hash + i * 13) % catChallenges.length;
    const challenge = catChallenges[challengeIndex];

    const id = `${today}_${i}`;
    selected.push({
      ...challenge,
      id,
      completed: completionState[id] || false,
    });
  }

  return selected;
}

/**
 * Complete a challenge and persist state.
 */
export function completeChallenge(challengeId: string): void {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `challenges_${today}`;

  let state: Record<string, boolean> = {};
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) state = JSON.parse(stored);
    state[challengeId] = true;
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch { /* ignore */ }
}

export const CATEGORY_COLORS: Record<ChallengeCategory, { bg: string; text: string; border: string }> = {
  nutrition:    { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  hydration:   { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  activity:    { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200' },
  mindfulness: { bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200' },
};
