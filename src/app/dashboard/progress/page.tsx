
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, Brain, Target, Zap, Calendar, Download, 
  Activity, Scale, Battery, Utensils, Award, AlertCircle,
  CheckCircle2, Star, BarChart3, Eye, Lightbulb,
  Heart, Moon, Droplets,
  ArrowUp, ArrowDown, Minus, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

type ProgressMetric = {
    weight: number;
    energyLevel: number;
    mealCompletion: number;
    waterIntake: number;
    sleepHours: number;
    moodScore: number;
    exerciseMinutes: number;
    stressLevel: number;
};

type HistoryEntry = {
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

type Insight = {
    type: 'success' | 'warning' | 'pattern' | 'discovery';
    title: string;
    message: string;
    icon: React.ReactNode;
    confidence: number;
};

type Prediction = {
    value: number;
    timeframe: string;
    confidence: number;
};

type Achievement = {
    title: string;
    description: string;
    icon: React.ReactNode;
    earned: boolean;
};

const UltimateProgressTracker = () => {
  const [currentMetrics, setCurrentMetrics] = useState<ProgressMetric>({
    weight: 68.5,
    energyLevel: 7,
    mealCompletion: 85,
    waterIntake: 2100,
    sleepHours: 7.5,
    moodScore: 8,
    exerciseMinutes: 45,
    stressLevel: 3
  });

  const [progressHistory] = useState<HistoryEntry[]>([
    { date: '2024-01-08', weight: 69.2, energy: 6, meals: 70, water: 1800, sleep: 6.5, mood: 6, exercise: 30, stress: 5 },
    { date: '2024-01-07', weight: 69.0, energy: 7, meals: 80, water: 2000, sleep: 7, mood: 7, exercise: 45, stress: 4 },
    { date: '2024-01-06', weight: 68.8, energy: 8, meals: 90, water: 2200, sleep: 8, mood: 8, exercise: 60, stress: 3 },
    { date: '2024-01-05', weight: 69.1, energy: 5, meals: 60, water: 1600, sleep: 6, mood: 5, exercise: 20, stress: 6 },
    { date: '2024-01-04', weight: 69.3, energy: 6, meals: 75, water: 1900, sleep: 7, mood: 6, exercise: 40, stress: 4 },
    { date: '2024-01-03', weight: 69.5, energy: 7, meals: 85, water: 2100, sleep: 7.5, mood: 7, exercise: 50, stress: 3 },
    { date: '2024-01-02', weight: 69.8, energy: 4, meals: 50, water: 1400, sleep: 5.5, mood: 4, exercise: 15, stress: 7 }
  ]);

  const [aiInsights, setAiInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const analyzeTrends = useCallback(() => {
    const trends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};
    const metrics = ['weight', 'energy', 'meals', 'water', 'sleep', 'mood'];
    
    metrics.forEach(metric => {
        const key = metric as keyof Omit<HistoryEntry, 'date' | 'exercise' | 'stress'>;
        const recent3 = progressHistory.slice(0, 3).map(day => day[key]);
        const slope = (recent3[0] - recent3[2]) / 2;
        trends[metric] = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    });
    
    return trends;
  }, [progressHistory]);

  const generateAIInsights = useCallback(() => {
    const insights: Insight[] = [];
    const recent = progressHistory.slice(0, 3);
    const trends = analyzeTrends();

    if (trends.weight === 'decreasing' && progressHistory.length > 6) {
      insights.push({
        type: 'success',
        title: 'Weight Loss Momentum',
        message: `Excellent! You've lost ${(progressHistory[6].weight - currentMetrics.weight).toFixed(1)}kg this week. Your current approach is working perfectly.`,
        icon: <TrendingUp className="w-5 h-5 text-green-500" />,
        confidence: 95
      });
    }

    const avgSleep = recent.reduce((sum, day) => sum + day.sleep, 0) / recent.length;
    const avgEnergy = recent.reduce((sum, day) => sum + day.energy, 0) / recent.length;
    
    if (avgSleep < 7 && avgEnergy < 6) {
      insights.push({
        type: 'warning',
        title: 'Sleep-Energy Connection',
        message: `Your energy levels correlate strongly with sleep. Aim for 8+ hours tonight to boost tomorrow's energy by ~30%.`,
        icon: <Moon className="w-5 h-5 text-primary" />,
        confidence: 88
      });
    }

    if (currentMetrics.mealCompletion > 80) {
      insights.push({
        type: 'pattern',
        title: 'Nutrition Consistency',
        message: `High meal completion (${currentMetrics.mealCompletion}%) is accelerating your progress. Your metabolism is optimized.`,
        icon: <Utensils className="w-5 h-5 text-purple-500" />,
        confidence: 92
      });
    }

    const stressTrend = currentMetrics.stressLevel < recent[0].stress;
    if (stressTrend && currentMetrics.exerciseMinutes > 30) {
      insights.push({
        type: 'discovery',
        title: 'Exercise-Stress Relief',
        message: `Your ${currentMetrics.exerciseMinutes}min workout reduced stress by ${recent[0].stress - currentMetrics.stressLevel} points. This is your sweet spot!`,
        icon: <Activity className="w-5 h-5 text-orange-500" />,
        confidence: 87
      });
    }

    return insights;
  }, [progressHistory, currentMetrics, analyzeTrends]);

  const generatePredictions = useCallback(() => {
    const trends = analyzeTrends();
    const newPredictions: Record<string, Prediction> = {};
    
    if (trends.weight === 'decreasing' && progressHistory.length > 6) {
      const weeklyRate = progressHistory[6].weight - currentMetrics.weight;
      newPredictions.weight = {
        value: parseFloat(Math.max(65, currentMetrics.weight - weeklyRate).toFixed(1)),
        timeframe: '1 week',
        confidence: 89
      };
    }
    
    const consistencyScore = (currentMetrics.mealCompletion + currentMetrics.energyLevel * 10) / 2;
    newPredictions.goalAchievement = {
      value: Math.min(95, consistencyScore + 15),
      timeframe: '2 weeks',
      confidence: 92
    };
    
    return newPredictions;
  }, [progressHistory, currentMetrics, analyzeTrends]);

  const checkAchievements = useCallback(() => {
    const newAchievements: Achievement[] = [];
    
    if (currentMetrics.mealCompletion >= 80) {
      newAchievements.push({
        title: 'Nutrition Master',
        description: '80%+ meal completion achieved!',
        icon: <Award className="w-6 h-6 text-yellow-500" />,
        earned: true
      });
    }
    
    if (currentMetrics.energyLevel >= 8) {
      newAchievements.push({
        title: 'Energy Champion',
        description: 'Peak energy levels maintained',
        icon: <Zap className="w-6 h-6 text-primary" />,
        earned: true
      });
    }
    
    const weightProgress = progressHistory.length > 6 ? progressHistory[6].weight - currentMetrics.weight : 0;
    if (weightProgress >= 1) {
      newAchievements.push({
        title: 'Weight Loss Hero',
        description: `Lost ${weightProgress.toFixed(1)}kg this week!`,
        icon: <Target className="w-6 h-6 text-green-500" />,
        earned: true
      });
    }
    
    return newAchievements;
  }, [progressHistory, currentMetrics]);

  useEffect(() => {
    setAiInsights(generateAIInsights());
    setPredictions(generatePredictions());
    setAchievements(checkAchievements());
  }, [currentMetrics, generateAIInsights, generatePredictions, checkAchievements]);

  const updateMetric = (metric: keyof ProgressMetric, value: number) => {
    setCurrentMetrics(prev => ({
      ...prev,
      [metric]: value
    }));
  };

  const logProgress = () => {
    const newInsights = generateAIInsights();
    setAiInsights(newInsights);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend === 'decreasing') return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const trends = analyzeTrends();

  return (
    <div className="bg-background">
        <div className="bg-card rounded-3xl shadow-xl overflow-hidden border">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 p-8 text-primary-foreground">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                        <Brain className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold font-headline">AI Progress Tracker</h1>
                        <p className="text-indigo-100 mt-2">Your intelligent health & fitness companion</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold">Day 7</div>
                    <p className="text-indigo-100">Weekly Journey</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">AI Analysis Active</span>
                </div>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="text-sm">{aiInsights.length} Smart Insights</span>
                </div>
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-300" />
                    <span className="text-sm">{achievements.length} Achievements</span>
                </div>
            </div>
            </div>

            <div className="p-4 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-headline text-foreground mb-6 flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-primary" />
                        Track Today's Progress
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
                            <CardHeader className="flex-row items-center gap-3 pb-2">
                                <Scale className="w-6 h-6 text-blue-600" />
                                <CardTitle className="text-lg">Weight (kg)</CardTitle>
                                {getTrendIcon(trends.weight)}
                            </CardHeader>
                            <CardContent>
                                <input
                                    type="number" value={currentMetrics.weight}
                                    onChange={(e) => updateMetric('weight', parseFloat(e.target.value))}
                                    className="w-full text-2xl font-bold bg-white border-2 border-blue-200 rounded-xl p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    step="0.1"
                                />
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-100">
                             <CardHeader className="flex-row items-center gap-3 pb-2">
                                <Battery className="w-6 h-6 text-yellow-600" />
                                <CardTitle className="text-lg">Energy (1-10)</CardTitle>
                                {getTrendIcon(trends.energy)}
                            </CardHeader>
                            <CardContent className="flex items-center gap-3">
                                <input type="range" min="1" max="10" value={currentMetrics.energyLevel} onChange={(e) => updateMetric('energyLevel', parseInt(e.target.value))} className="w-full" />
                                <span className="text-2xl font-bold text-yellow-600 w-12">{currentMetrics.energyLevel}</span>
                            </CardContent>
                        </Card>
                         <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                             <CardHeader className="flex-row items-center gap-3 pb-2">
                                <Utensils className="w-6 h-6 text-green-600" />
                                <CardTitle className="text-lg">Meals (%)</CardTitle>
                                {getTrendIcon(trends.meals)}
                            </CardHeader>
                            <CardContent className="flex items-center gap-3">
                                <input type="range" min="0" max="100" value={currentMetrics.mealCompletion} onChange={(e) => updateMetric('mealCompletion', parseInt(e.target.value))} className="w-full" />
                                <span className="text-2xl font-bold text-green-600 w-16">{currentMetrics.mealCompletion}%</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100">
                             <CardHeader className="flex-row items-center gap-3 pb-2">
                                <Droplets className="w-6 h-6 text-cyan-600" />
                                <CardTitle className="text-lg">Water (ml)</CardTitle>
                                {getTrendIcon(trends.water)}
                            </CardHeader>
                            <CardContent>
                                <input
                                    type="number" value={currentMetrics.waterIntake}
                                    onChange={(e) => updateMetric('waterIntake', parseInt(e.target.value))}
                                    className="w-full text-2xl font-bold bg-white border-2 border-cyan-200 rounded-xl p-3 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                                    step="50"
                                />
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
                             <CardHeader className="flex-row items-center gap-3 pb-2">
                                <Moon className="w-6 h-6 text-purple-600" />
                                <CardTitle className="text-lg">Sleep (hrs)</CardTitle>
                                {getTrendIcon(trends.sleep)}
                            </CardHeader>
                            <CardContent>
                                <input
                                    type="number" value={currentMetrics.sleepHours}
                                    onChange={(e) => updateMetric('sleepHours', parseFloat(e.target.value))}
                                    className="w-full text-2xl font-bold bg-white border-2 border-purple-200 rounded-xl p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                                    step="0.5"
                                />
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100">
                             <CardHeader className="flex-row items-center gap-3 pb-2">
                                <Heart className="w-6 h-6 text-pink-600" />
                                <CardTitle className="text-lg">Mood (1-10)</CardTitle>
                                {getTrendIcon(trends.mood)}
                            </CardHeader>
                            <CardContent className="flex items-center gap-3">
                                <input type="range" min="1" max="10" value={currentMetrics.moodScore} onChange={(e) => updateMetric('moodScore', parseInt(e.target.value))} className="w-full" />
                                <span className="text-2xl font-bold text-pink-600 w-12">{currentMetrics.moodScore}</span>
                            </CardContent>
                        </Card>
                    </div>

                    <Button
                        onClick={logProgress}
                        className="w-full bg-gradient-to-r from-primary to-purple-600 text-white py-6 px-8 rounded-2xl font-bold text-xl hover:from-primary/90 hover:to-purple-600/90 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                    >
                        <Brain className="w-6 h-6" />
                        Log Progress & Get AI Insights
                    </Button>
                </div>

                <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-headline text-foreground mb-6 flex items-center gap-3">
                        <Lightbulb className="w-8 h-8 text-yellow-500" />
                        AI Intelligence Center
                    </h2>

                    <div className="space-y-4">
                        {aiInsights.map((insight, index) => (
                        <Card key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-l-primary">
                            <CardContent className="pt-6 flex items-start gap-4">
                                {insight.icon}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold text-lg text-foreground">{insight.title}</h3>
                                    <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full font-medium">
                                        {insight.confidence}% confidence
                                    </span>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">{insight.message}</p>
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>

                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Eye className="w-6 h-6 text-blue-600" />
                                AI Predictions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        {Object.entries(predictions).map(([key, pred]) => (
                            <div key={key} className="flex items-center justify-between bg-white p-4 rounded-xl">
                            <div>
                                <div className="font-semibold text-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                                <div className="text-sm text-muted-foreground">In {pred.timeframe}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">{pred.value}{key === 'weight' ? 'kg' : '%'}</div>
                                <div className="text-xs text-muted-foreground">{pred.confidence}% accurate</div>
                            </div>
                            </div>
                        ))}
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Award className="w-6 h-6 text-yellow-600" />
                                Today's Achievements
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        {achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-xl">
                            {achievement.icon}
                            <div>
                                <div className="font-semibold text-foreground">{achievement.title}</div>
                                <div className="text-sm text-muted-foreground">{achievement.description}</div>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                            </div>
                        ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
          
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-3xl font-bold font-headline text-foreground flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-purple-600" />
                        Smart Analytics
                    </CardTitle>
                    <Button variant="secondary">
                        <Download className="w-5 h-5" />
                        Download Report
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary/50">
                                <tr>
                                <th className="text-left p-4 font-semibold">Date</th>
                                <th className="text-center p-4 font-semibold">Weight</th>
                                <th className="text-center p-4 font-semibold">Energy</th>
                                <th className="text-center p-4 font-semibold">Meals</th>
                                <th className="text-center p-4 font-semibold">Water</th>
                                <th className="text-center p-4 font-semibold">Sleep</th>
                                <th className="text-center p-4 font-semibold">Mood</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b bg-green-50 border-green-200">
                                <td className="p-4 font-semibold text-green-800">Today</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.weight}kg</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.energyLevel}/10</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.mealCompletion}%</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.waterIntake}ml</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.sleepHours}h</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.moodScore}/10</td>
                                </tr>
                                {progressHistory.map((day, index) => (
                                <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                                    <td className="p-4 text-muted-foreground">{new Date(day.date).toLocaleDateString()}</td>
                                    <td className="text-center p-4">{day.weight}kg</td>
                                    <td className="text-center p-4">{day.energy}/10</td>
                                    <td className="text-center p-4">{day.meals}%</td>
                                    <td className="text-center p-4">{day.water}ml</td>
                                    <td className="text-center p-4">{day.sleep}h</td>
                                    <td className="text-center p-4">{day.mood}/10</td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    </div>
  );
};

export default UltimateProgressTracker;

    