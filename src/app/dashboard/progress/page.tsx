'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, Brain, Target, Zap, Calendar, Download, 
  Activity, Scale, Battery, Utensils, Award, AlertCircle,
  CheckCircle2, Star, BarChart3, Eye, Lightbulb,
  Heart, Moon, Droplets,
  ArrowUp, ArrowDown, Minus, Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type ProgressMetric = {
    weight: number;
    energyLevel: number;
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  const [currentMetrics, setCurrentMetrics] = useState<ProgressMetric>({
    weight: 0,
    energyLevel: 5,
    sleepHours: 7,
    moodScore: 5,
    exerciseMinutes: 30,
    stressLevel: 5
  });

  const [progressHistory, setProgressHistory] = useState<HistoryEntry[]>([]);
  const [aiInsights, setAiInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    try {
        const historyString = localStorage.getItem('progressHistory');
        if (historyString) {
            const history = JSON.parse(historyString) as HistoryEntry[];
            setProgressHistory(history);
            if (history.length > 0) {
                 const lastEntry = history[0]; // Assuming history is sorted newest first
                 setCurrentMetrics({
                    weight: lastEntry.weight,
                    energyLevel: lastEntry.energy,
                    sleepHours: lastEntry.sleep,
                    moodScore: lastEntry.mood,
                    exerciseMinutes: lastEntry.exercise,
                    stressLevel: lastEntry.stress
                 });
            }
        }
    } catch (e) {
        console.error("Failed to load progress history:", e);
        toast({ title: 'Error', description: 'Could not load your progress history.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  

  const analyzeTrends = useCallback(() => {
    const trends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};
    const metrics = ['weight', 'energy', 'meals', 'water', 'sleep', 'mood'];
    
    if (progressHistory.length < 3) return trends; // Not enough data

    metrics.forEach(metric => {
        const key = metric as keyof Omit<HistoryEntry, 'date' | 'exercise' | 'stress'>;
        const recent3 = progressHistory.slice(0, 3).map(day => day[key]);
        const slope = (recent3[0] - recent3[2]) / 2;
        trends[metric] = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    });
    
    return trends;
  }, [progressHistory]);

  const generateAIInsights = useCallback(() => {
    if (progressHistory.length < 2) return [];

    const insights: Insight[] = [];
    const latest = progressHistory[0];
    const previous = progressHistory[1];
    
    if (latest.weight < previous.weight) {
      insights.push({
        type: 'success',
        title: 'Weight Loss Momentum',
        message: `Excellent! You've lost ${(previous.weight - latest.weight).toFixed(1)}kg since your last entry. Keep it up!`,
        icon: <TrendingUp className="w-5 h-5 text-green-500" />,
        confidence: 95
      });
    }

    if (latest.sleep < 7 && latest.energy < 6) {
      insights.push({
        type: 'warning',
        title: 'Sleep-Energy Connection',
        message: `Your energy may be low due to sleeping less than 7 hours. Aim for more rest to boost tomorrow's energy.`,
        icon: <Moon className="w-5 h-5 text-primary" />,
        confidence: 88
      });
    }

    if (latest.meals > 80) {
      insights.push({
        type: 'pattern',
        title: 'Nutrition Consistency',
        message: `High meal completion (${latest.meals}%) is a strong indicator of success. Your metabolism is likely optimized.`,
        icon: <Utensils className="w-5 h-5 text-purple-500" />,
        confidence: 92
      });
    }
    
    return insights;
  }, [progressHistory]);

  const generatePredictions = useCallback(() => {
    if (progressHistory.length < 7) return {};

    const trends = analyzeTrends();
    const newPredictions: Record<string, Prediction> = {};
    
    if (trends.weight === 'decreasing') {
      const weeklyRate = progressHistory[6].weight - progressHistory[0].weight;
      newPredictions.weight = {
        value: parseFloat(Math.max(0, progressHistory[0].weight - weeklyRate).toFixed(1)),
        timeframe: '1 week',
        confidence: 89
      };
    } else {
        newPredictions.weight = { value: progressHistory[0].weight, timeframe: '1 week', confidence: 70 };
    }
    
    const consistencyScore = (progressHistory[0].meals + progressHistory[0].energy * 10) / 2;
    newPredictions.goalAchievement = {
      value: Math.min(95, consistencyScore + 5),
      timeframe: '2 weeks',
      confidence: Math.round(consistencyScore)
    };
    
    return newPredictions;
  }, [progressHistory, analyzeTrends]);

  const checkAchievements = useCallback(() => {
    if(progressHistory.length === 0) return [];
    
    const latest = progressHistory[0];
    const newAchievements: Achievement[] = [];
    
    if (latest.meals >= 80) {
      newAchievements.push({
        title: 'Nutrition Master',
        description: '80%+ meal completion achieved!',
        icon: <Award className="w-6 h-6 text-yellow-500" />,
        earned: true
      });
    }
    
    if (latest.energy >= 8) {
      newAchievements.push({
        title: 'Energy Champion',
        description: 'Peak energy levels maintained',
        icon: <Zap className="w-6 h-6 text-primary" />,
        earned: true
      });
    }
    
    const weightProgress = progressHistory.length > 6 ? progressHistory[6].weight - latest.weight : 0;
    if (weightProgress >= 1) {
      newAchievements.push({
        title: 'Weight Loss Hero',
        description: `Lost ${weightProgress.toFixed(1)}kg this week!`,
        icon: <Target className="w-6 h-6 text-green-500" />,
        earned: true
      });
    }
    
    return newAchievements;
  }, [progressHistory]);

  const runFullAnalysis = useCallback(() => {
     setAiInsights(generateAIInsights());
     setPredictions(generatePredictions());
     setAchievements(checkAchievements());
  }, [generateAIInsights, generatePredictions, checkAchievements]);

  useEffect(() => {
    if (!isLoading && progressHistory.length > 0) {
        runFullAnalysis();
    }
  }, [isLoading, progressHistory, runFullAnalysis]);

  const updateMetric = (metric: keyof ProgressMetric, value: number) => {
    setCurrentMetrics(prev => ({
      ...prev,
      [metric]: value
    }));
  };

  const logProgress = () => {
    setIsLogging(true);
    const today = new Date().toISOString().split('T')[0];

    // Check if entry for today already exists
    if (progressHistory.length > 0 && progressHistory[0].date === today) {
        toast({ title: 'Already Logged', description: 'You have already logged your progress for today.', variant: 'destructive' });
        setIsLogging(false);
        return;
    }
    
    // Fetch meal completion from local storage
    const mealProgressString = localStorage.getItem(`mealProgress_${today}`);
    const mealProgress = mealProgressString ? JSON.parse(mealProgressString) : {};
    let totalMeals = 0;
    let completedMeals = 0;
    Object.values(mealProgress).forEach((day: any) => {
      Object.values(day).forEach((meal: any) => {
        totalMeals++;
        if (meal.completed) completedMeals++;
      });
    });
    const mealCompletion = totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;

    // Fetch water intake from local storage
    const hydrationString = localStorage.getItem('hydrationSchedule');
    let waterIntake = 0;
    if (hydrationString) {
        const schedule = JSON.parse(hydrationString);
        waterIntake = schedule.filter((item: any) => item.completed).reduce((sum: number, item: any) => sum + item.amount, 0);
    }


    const newEntry: HistoryEntry = {
        date: today,
        weight: currentMetrics.weight,
        energy: currentMetrics.energyLevel,
        meals: mealCompletion,
        water: waterIntake,
        sleep: currentMetrics.sleepHours,
        mood: currentMetrics.moodScore,
        exercise: currentMetrics.exerciseMinutes,
        stress: currentMetrics.stressLevel,
    };

    const updatedHistory = [newEntry, ...progressHistory];
    
    try {
        localStorage.setItem('progressHistory', JSON.stringify(updatedHistory));
        setProgressHistory(updatedHistory);
        runFullAnalysis(); // Run analysis with the new data
        toast({ title: 'Progress Logged!', description: "Your insights and predictions have been updated."});
    } catch (e) {
        console.error("Failed to save progress:", e);
        toast({ title: 'Error', description: 'Could not save your progress.', variant: 'destructive'});
    } finally {
        setIsLogging(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend === 'decreasing') return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };
  
  const trends = useMemo(() => analyzeTrends(), [analyzeTrends]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

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
                        <h1 className="text-4xl font-bold font-headline">Azai Progress Tracker</h1>
                        <p className="text-indigo-100 mt-2">Your intelligent health & fitness companion</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold">Day {progressHistory.length + 1}</div>
                    <p className="text-indigo-100">Your Journey</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Azai Analysis Active</span>
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
                        disabled={isLogging}
                        className="w-full bg-gradient-to-r from-primary to-purple-600 text-white py-6 px-8 rounded-2xl font-bold text-xl hover:from-primary/90 hover:to-purple-600/90 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                    >
                        {isLogging ? <Loader2 className="w-6 h-6 animate-spin" /> : <Brain className="w-6 h-6" />}
                        {isLogging ? 'Logging...' : 'Log Progress & Get Azai Insights'}
                    </Button>
                </div>

                <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-headline text-foreground mb-6 flex items-center gap-3">
                        <Lightbulb className="w-8 h-8 text-yellow-500" />
                        Azai Intelligence Center
                    </h2>

                    <div className="space-y-4">
                        {aiInsights.length > 0 ? aiInsights.map((insight, index) => (
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
                        )) : (
                            <Card className="bg-gradient-to-r from-gray-50 to-gray-100"><CardContent className="pt-6"><p className="text-muted-foreground text-center">Log your progress to see Azai insights here.</p></CardContent></Card>
                        )}
                    </div>

                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Eye className="w-6 h-6 text-blue-600" />
                                Azai Predictions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        {Object.keys(predictions).length > 0 ? Object.entries(predictions).map(([key, pred]) => (
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
                        )) : (
                             <p className="text-muted-foreground text-center text-sm">Not enough data to make predictions. Keep logging!</p>
                        )}
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Award className="w-6 h-6 text-yellow-600" />
                                Achievements
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        {achievements.length > 0 ? achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-xl">
                            {achievement.icon}
                            <div>
                                <div className="font-semibold text-foreground">{achievement.title}</div>
                                <div className="text-sm text-muted-foreground">{achievement.description}</div>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-center text-sm">No achievements yet. You can do it!</p>
                        )}
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
                </CardHeader>
                <CardContent>
                    {progressHistory.length > 0 ? (
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
                                <td className="p-4 font-semibold text-green-800">Today's Log</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.weight}kg</td>
                                <td className="text-center p-4 font-bold text-green-700">{currentMetrics.energyLevel}/10</td>
                                <td className="text-center p-4 font-bold text-green-700">{/* Value will be auto-filled */}</td>
                                <td className="text-center p-4 font-bold text-green-700">{/* Value will be auto-filled */}</td>
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
                    ) : (
                        <p className="text-muted-foreground text-center py-8">Your progress history will appear here once you start logging.</p>
                    )}
                </CardContent>
            </Card>
            </div>
        </div>
    </div>
  );
};

export default UltimateProgressTracker;
