'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  GamificationProfile,
  DEFAULT_PROFILE,
  getLevelProgress,
  getStreakMultiplier,
  calculateStreak,
  XP_REWARDS,
} from '@/lib/gamification';
import { Badge, checkBadgeUnlocks } from '@/data/badges';

type XPEvent = {
  amount: number;
  source: string;
  multiplied: boolean;
};

type UseGamificationReturn = {
  profile: GamificationProfile;
  loading: boolean;
  levelProgress: ReturnType<typeof getLevelProgress>;
  multiplier: number;

  // XP actions
  awardXP: (amount: number, source: string) => Promise<XPEvent | null>;
  completeMeal: () => Promise<XPEvent | null>;
  completeAllMeals: () => Promise<XPEvent | null>;
  logHydrationSlot: () => Promise<XPEvent | null>;
  completeHydrationGoal: () => Promise<XPEvent | null>;
  logProgress: () => Promise<XPEvent | null>;
  askAzai: () => Promise<XPEvent | null>;

  // Badge system
  newBadges: Badge[];
  clearNewBadges: () => void;

  // Level up detection
  leveledUp: boolean;
  newLevel: number | null;
  clearLevelUp: () => void;
};

export function useGamification(): UseGamificationReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GamificationProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const prevLevelRef = useRef(1);

  // Listen for auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Load profile from Firestore
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadProfile = async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'gamification', 'profile');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as GamificationProfile;
          setProfile(data);
          prevLevelRef.current = data.level;
        } else {
          // First time — create default profile
          await setDoc(ref, DEFAULT_PROFILE);
          setProfile(DEFAULT_PROFILE);
          prevLevelRef.current = 1;
        }
      } catch (e) {
        console.error('Failed to load gamification profile:', e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Save profile to Firestore
  const saveProfile = useCallback(async (updated: GamificationProfile) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'gamification', 'profile');
      await setDoc(ref, updated, { merge: true });
    } catch (e) {
      console.error('Failed to save gamification profile:', e);
    }
  }, [user]);

  // Core XP award function
  const awardXP = useCallback(async (baseAmount: number, source: string): Promise<XPEvent | null> => {
    if (!user) return null;

    const multiplier = getStreakMultiplier(profile.streakDays);
    const finalAmount = Math.round(baseAmount * multiplier);

    const newTotalXP = profile.totalXP + finalAmount;
    const progress = getLevelProgress(newTotalXP);

    // Streak update
    const today = new Date().toISOString().split('T')[0];
    const streakResult = calculateStreak(profile.lastActiveDate, today, profile.streakDays, profile.streakShields);

    // Shields earned at level 3, 10, 20
    let newShields = streakResult.shieldsRemaining;
    const shieldLevels = [3, 10, 20];
    if (progress.level > prevLevelRef.current) {
      for (const sl of shieldLevels) {
        if (progress.level >= sl && prevLevelRef.current < sl) {
          newShields++;
        }
      }
    }

    const updated: GamificationProfile = {
      ...profile,
      totalXP: newTotalXP,
      level: progress.level,
      currentLevelXP: progress.currentLevelXP,
      xpToNextLevel: progress.xpToNextLevel,
      title: progress.title,
      emoji: progress.emoji,
      streakDays: streakResult.streakDays,
      longestStreak: Math.max(profile.longestStreak, streakResult.streakDays),
      lastActiveDate: today,
      streakShields: newShields,
    };

    // Check level up
    if (progress.level > prevLevelRef.current) {
      setLeveledUp(true);
      setNewLevel(progress.level);
      prevLevelRef.current = progress.level;
    }

    // Check badges
    const unlocked = checkBadgeUnlocks(profile.badges, {
      totalMealsCompleted: updated.totalMealsCompleted,
      totalWaterLogged: updated.totalWaterLogged,
      streakDays: updated.streakDays,
      totalDaysLogged: updated.totalDaysLogged,
      totalQuestionsAsked: updated.totalQuestionsAsked,
    });

    if (unlocked.length > 0) {
      updated.badges = [...profile.badges, ...unlocked.map(b => b.id)];
      // Add badge XP
      const badgeXP = unlocked.reduce((sum, b) => sum + b.xpReward, 0);
      updated.totalXP += badgeXP;
      const finalProgress = getLevelProgress(updated.totalXP);
      updated.level = finalProgress.level;
      updated.currentLevelXP = finalProgress.currentLevelXP;
      updated.xpToNextLevel = finalProgress.xpToNextLevel;
      updated.title = finalProgress.title;
      updated.emoji = finalProgress.emoji;
      setNewBadges(prev => [...prev, ...unlocked]);
    }

    setProfile(updated);
    await saveProfile(updated);

    return { amount: finalAmount, source, multiplied: multiplier > 1 };
  }, [user, profile, saveProfile]);

  // Convenience action methods
  const completeMeal = useCallback(async () => {
    const updated = { ...profile, totalMealsCompleted: profile.totalMealsCompleted + 1 };
    setProfile(updated);
    return awardXP(XP_REWARDS.MEAL_COMPLETE, 'Meal completed');
  }, [profile, awardXP]);

  const completeAllMeals = useCallback(async () => {
    return awardXP(XP_REWARDS.ALL_MEALS_COMPLETE, 'Perfect day — all meals!');
  }, [awardXP]);

  const logHydrationSlot = useCallback(async () => {
    return awardXP(XP_REWARDS.HYDRATION_SLOT, 'Water logged');
  }, [awardXP]);

  const completeHydrationGoal = useCallback(async () => {
    return awardXP(XP_REWARDS.HYDRATION_GOAL, 'Hydration goal reached!');
  }, [awardXP]);

  const logProgress = useCallback(async () => {
    const updated = { ...profile, totalDaysLogged: profile.totalDaysLogged + 1 };
    setProfile(updated);
    return awardXP(XP_REWARDS.LOG_PROGRESS, 'Progress logged');
  }, [profile, awardXP]);

  const askAzai = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const resetCount = profile.lastQuestionDate !== today;
    const todayCount = resetCount ? 0 : profile.questionsAskedToday;

    if (todayCount >= 10) return null; // Max 10 per day

    const updated = {
      ...profile,
      totalQuestionsAsked: profile.totalQuestionsAsked + 1,
      questionsAskedToday: todayCount + 1,
      lastQuestionDate: today,
    };
    setProfile(updated);
    return awardXP(XP_REWARDS.ASK_AZAI, 'Asked Azai');
  }, [profile, awardXP]);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);
  const clearLevelUp = useCallback(() => { setLeveledUp(false); setNewLevel(null); }, []);

  const levelProgress = getLevelProgress(profile.totalXP);
  const multiplier = getStreakMultiplier(profile.streakDays);

  return {
    profile, loading, levelProgress, multiplier,
    awardXP, completeMeal, completeAllMeals, logHydrationSlot, completeHydrationGoal, logProgress, askAzai,
    newBadges, clearNewBadges,
    leveledUp, newLevel, clearLevelUp,
  };
}
