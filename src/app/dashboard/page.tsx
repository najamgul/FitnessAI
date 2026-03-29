
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, Target, Zap, Award,
  Activity, Scale, Battery, Utensils, Heart, Moon,
  Droplets, Sparkles,
  LineChart as ChartIcon,
  MessageSquare, Flame, Trophy, ArrowRight,
} from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart as RechartsLineChart, CartesianGrid, XAxis, Line } from 'recharts';
import { useGamification } from '@/hooks/useGamification';
import { BADGES, RARITY_COLORS } from '@/data/badges';
import { LevelBar } from '@/components/level-bar';
import { getDailyChallenges, completeChallenge, DailyChallenge, CATEGORY_COLORS } from '@/data/daily-challenges';
import { XPReward } from '@/components/xp-reward';
import { SoundEngine } from '@/components/sound-engine';
import { CheckCircle2 } from 'lucide-react';

type ProgressEntry = {
    date: string;
    weight: number;
    energy: number;
    meals: number;
    water: number;
    sleep: number;
    mood: number;
    exercise: number;
    stress: number;
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const DashboardPage = () => {
    const [userName, setUserName] = useState('User');
    const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { profile, levelProgress, multiplier, loading: gamLoading, awardXP } = useGamification();
    const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
    const [xpEvent, setXpEvent] = useState<{ amount: number; source: string; multiplied: boolean } | null>(null);

    useEffect(() => {
        try {
            const onboardingDataString = localStorage.getItem('onboardingData');
            if (onboardingDataString) {
                const onboardingData = JSON.parse(onboardingDataString);
                if (onboardingData?.name) setUserName(onboardingData.name.split(' ')[0] || 'User');
            } else {
                const loggedInEmail = localStorage.getItem('loggedInEmail');
                if (loggedInEmail) setUserName(loggedInEmail.split('@')[0]);
            }
            const historyString = localStorage.getItem('progressHistory');
            if (historyString) setProgressHistory(JSON.parse(historyString));
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setChallenges(getDailyChallenges());
        }
    }, []);

    const chartData = useMemo(() => progressHistory.map(entry => ({
        name: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Weight: entry.weight,
        Energy: entry.energy,
    })).reverse(), [progressHistory]);

    const recentBadges = useMemo(() => {
        return profile.badges.slice(-3).map(id => BADGES.find(b => b.id === id)).filter(Boolean);
    }, [profile.badges]);

    if (isLoading || gamLoading) {
        return <div className="flex justify-center items-center h-full py-20"><div className="w-8 h-8 border-3 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" /></div>;
    }

    return (
        <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
            {/* Hero Bar */}
            <motion.div variants={item}
                className="rounded-2xl p-6 text-white overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)' }}
            >
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -ml-8 -mb-8" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {userName}! 👋</h1>
                            <p className="text-emerald-100 mt-1 text-sm">Here's your health game hub</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {profile.streakDays > 0 && (
                                <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5">
                                    <span className="text-base">🔥</span>
                                    <span className="text-sm font-bold">{profile.streakDays}-day streak</span>
                                </div>
                            )}
                            {multiplier > 1 && (
                                <div className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
                                    ×{multiplier}x
                                </div>
                            )}
                        </div>
                    </div>

                    {/* XP Bar inline */}
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{levelProgress.emoji}</span>
                                <span className="text-sm font-medium">Level {levelProgress.level} — {levelProgress.title}</span>
                            </div>
                            <span className="text-xs text-emerald-200">{levelProgress.currentLevelXP.toLocaleString()} / {levelProgress.xpToNextLevel.toLocaleString()} XP</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${levelProgress.progressPercent}%` }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickStat icon={<Trophy className="w-5 h-5 text-amber-500" />} label="Total XP" value={profile.totalXP.toLocaleString()} bg="bg-amber-50 border-amber-200" />
                <QuickStat icon={<Flame className="w-5 h-5 text-orange-500" />} label="Streak" value={`${profile.streakDays} days`} bg="bg-orange-50 border-orange-200" />
                <QuickStat icon={<Utensils className="w-5 h-5 text-emerald-500" />} label="Meals" value={profile.totalMealsCompleted.toString()} bg="bg-emerald-50 border-emerald-200" />
                <QuickStat icon={<Award className="w-5 h-5 text-purple-500" />} label="Badges" value={`${profile.badges.length}/${BADGES.length}`} bg="bg-purple-50 border-purple-200" />
            </motion.div>

            {/* Daily Challenges */}
            <motion.div variants={item} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <XPReward amount={xpEvent?.amount ?? null} source={xpEvent?.source} multiplied={xpEvent?.multiplied} onComplete={() => setXpEvent(null)} />
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-gray-900">Daily Challenges</h3>
                    </div>
                    <div className="text-xs text-gray-400">{challenges.filter(c => c.completed).length}/{challenges.length} done</div>
                </div>
                <div className="space-y-2">
                    {challenges.map(c => (
                        <motion.div
                            key={c.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${c.completed ? 'bg-emerald-50 border-emerald-200' : `${CATEGORY_COLORS[c.category].bg} ${CATEGORY_COLORS[c.category].border}`}`}
                            whileTap={{ scale: 0.98 }}
                        >
                            <button
                                onClick={async () => {
                                    if (c.completed) return;
                                    completeChallenge(c.id);
                                    setChallenges(prev => prev.map(ch => ch.id === c.id ? { ...ch, completed: true } : ch));
                                    SoundEngine.mealComplete();
                                    const event = await awardXP(c.xpReward, c.title);
                                    if (event) setXpEvent(event);
                                    // All challenges complete bonus
                                    const allDone = challenges.filter(ch => ch.id !== c.id).every(ch => ch.completed);
                                    if (allDone) {
                                        setTimeout(async () => {
                                            const bonus = await awardXP(75, 'All challenges complete! 🎉');
                                            if (bonus) setXpEvent(bonus);
                                        }, 1500);
                                    }
                                }}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${c.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'}`}
                            >
                                {c.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </button>
                            <span className="text-lg flex-shrink-0">{c.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${c.completed ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>{c.title}</div>
                                <div className="text-[10px] text-gray-400">{c.description}</div>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                +{c.xpReward} XP
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Progress Chart */}
                {chartData.length > 0 && (
                    <motion.div variants={item} className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ChartIcon className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-bold text-gray-900">Progress Overview</h3>
                        </div>
                        <div className="h-56">
                            <ChartContainer config={{
                                Weight: { label: "Weight (kg)", color: "#059669" },
                                Energy: { label: "Energy", color: "#f59e0b" }
                            }}>
                                <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                    <Line dataKey="Weight" type="monotone" strokeWidth={2} stroke="#059669" dot={false} />
                                    <Line dataKey="Energy" type="monotone" strokeWidth={2} stroke="#f59e0b" dot={false} />
                                </RechartsLineChart>
                            </ChartContainer>
                        </div>
                    </motion.div>
                )}

                {/* Quick Actions */}
                <motion.div variants={item} className={`${chartData.length > 0 ? 'lg:col-span-3' : 'lg:col-span-7'} space-y-3`}>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h3>
                    <QuickAction href="/dashboard/plan" icon={<Utensils className="w-5 h-5 text-emerald-600" />} label="View Diet Plan" desc="Track your meals" xp="+25 XP/meal" />
                    <QuickAction href="/dashboard/hydration" icon={<Droplets className="w-5 h-5 text-blue-500" />} label="Log Water" desc="Stay hydrated" xp="+10 XP/slot" />
                    <QuickAction href="/dashboard/progress" icon={<Target className="w-5 h-5 text-purple-500" />} label="Log Progress" desc="Track your metrics" xp="+50 XP" />
                    <QuickAction href="/dashboard/ask" icon={<MessageSquare className="w-5 h-5 text-amber-500" />} label="Chat with Azai" desc="Ask anything" xp="+5 XP/q" />
                    <QuickAction href="/dashboard/badges" icon={<Trophy className="w-5 h-5 text-pink-500" />} label="View Badges" desc="Your collection" xp={`${profile.badges.length} earned`} />
                </motion.div>
            </div>

            {/* Recent Badges */}
            {recentBadges.length > 0 && (
                <motion.div variants={item} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-gray-900">Recent Badges</h3>
                        </div>
                        <Link href="/dashboard/badges" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {recentBadges.map((badge) => badge && (
                            <div key={badge.id} className={`flex-shrink-0 rounded-xl border p-3 text-center w-24 ${RARITY_COLORS[badge.rarity].bg} ${RARITY_COLORS[badge.rarity].border}`}>
                                <div className="text-2xl mb-1">{badge.icon}</div>
                                <div className="text-[10px] font-bold text-gray-900 truncate">{badge.name}</div>
                                <div className={`text-[8px] font-bold uppercase ${RARITY_COLORS[badge.rarity].text}`}>{badge.rarity}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Health Stats */}
            {progressHistory.length > 0 && (
                <motion.div variants={item} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <HealthStat icon={<Scale className="w-5 h-5" />} label="Weight" value={`${progressHistory[0].weight} kg`} color="text-blue-600" bg="bg-blue-50" />
                    <HealthStat icon={<Battery className="w-5 h-5" />} label="Energy" value={`${progressHistory[0].energy}/10`} color="text-amber-600" bg="bg-amber-50" />
                    <HealthStat icon={<Droplets className="w-5 h-5" />} label="Water" value={`${progressHistory[0].water} ml`} color="text-cyan-600" bg="bg-cyan-50" />
                    <HealthStat icon={<Moon className="w-5 h-5" />} label="Sleep" value={`${progressHistory[0].sleep} hrs`} color="text-purple-600" bg="bg-purple-50" />
                </motion.div>
            )}
        </motion.div>
    );
};

// ─── Sub-components ───

function QuickStat({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
    return (
        <div className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500 font-medium">{label}</span></div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
        </div>
    );
}

function QuickAction({ href, icon, label, desc, xp }: { href: string; icon: React.ReactNode; label: string; desc: string; xp: string }) {
    return (
        <Link href={href}>
            <motion.div
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm transition-all"
                whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}
            >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{label}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex-shrink-0">{xp}</div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </motion.div>
        </Link>
    );
}

function HealthStat({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
    return (
        <div className={`${bg} rounded-xl p-4 border border-gray-100`}>
            <div className={`flex items-center gap-2 mb-1 ${color}`}>{icon}<span className="text-sm font-medium">{label}</span></div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
    );
}

export default DashboardPage;
