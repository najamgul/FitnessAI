

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Droplets, Clock, Target, TrendingUp, Sun, Activity, Bell, Zap, Brain, CheckCircle2, AlertCircle } from 'lucide-react';

type ScheduleItem = {
  time: string;
  amount: number;
  completed: boolean;
  skipped: boolean;
  smart: boolean;
  id: number;
  reason: string;
};

const SmartWaterTracker = () => {
  const [dailyGoal, setDailyGoal] = useState(2500);
  const [profile, setProfile] = useState({
    weight: 70,
    activityLevel: 'moderate',
    sleepTime: '23:00',
    wakeTime: '07:00'
  });
  const [smartMode, setSmartMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherTemp, setWeatherTemp] = useState(24);
  const [activityBoost, setActivityBoost] = useState(300); // Default moderate activity boost
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [redistributing, setRedistributing] = useState(false);

  // Smart schedule generation using useCallback to memoize
  const generateSmartSchedule = useCallback(() => {
    const wakeHour = parseInt(profile.wakeTime.split(':')[0]);
    const sleepHour = parseInt(profile.sleepTime.split(':')[0]);
    let awakeHours = sleepHour - wakeHour;
    if (awakeHours < 0) awakeHours += 24;

    let adjustedGoal = dailyGoal;
    if (smartMode) {
      if (weatherTemp > 28) adjustedGoal += 300;
      if (weatherTemp > 32) adjustedGoal += 500;
      adjustedGoal += activityBoost;
    }

    const schedule: ScheduleItem[] = [];
    const numSlots = 10;
    const baseAmount = Math.floor(adjustedGoal / numSlots);

    for (let i = 0; i < numSlots; i++) {
      const hour = wakeHour + Math.floor((i * awakeHours) / numSlots);
      const minute = (i * 60 * awakeHours / numSlots) % 60;
      const time = new Date();
      time.setHours(hour, minute, 0, 0);

      let amount = baseAmount;
      let reason = 'Consistent hydration';

      if (i < 2) {
        amount += 50;
        reason = 'Morning hydration boost';
      }
      if (i === 3 || i === 6) {
        amount += 50;
        reason = 'Pre-meal optimization';
      }
      if (i > 7) {
        amount = Math.floor(amount * 0.7);
        reason = 'Evening wind-down';
      }
      if (i >= 3 && i <= 6 && activityBoost > 0) {
        amount += Math.floor(activityBoost / 4);
        reason = 'Peak activity period';
      }

      schedule.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        amount: Math.round(amount / 10) * 10, // Round to nearest 10
        completed: false,
        skipped: false,
        smart: true,
        id: i,
        reason,
      });
    }

    // Adjust total to match the goal
    const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
    let diff = adjustedGoal - totalScheduled;
    let i = 0;
    while(diff !== 0) {
      const adjustment = diff > 0 ? 10 : -10;
      if (schedule[i % numSlots].amount + adjustment > 0) {
        schedule[i % numSlots].amount += adjustment;
        diff -= adjustment;
      }
      i++;
      if (i > 100) break; // Safety break
    }

    return schedule;
  }, [profile.wakeTime, profile.sleepTime, dailyGoal, smartMode, weatherTemp, activityBoost]);

  useEffect(() => {
    setScheduleItems(generateSmartSchedule());
  }, [generateSmartSchedule]);

  const redistributeSchedule = useCallback(() => {
    setRedistributing(true);
    setTimeout(() => {
        const now = new Date();
        const completedWater = scheduleItems.filter(item => item.completed).reduce((sum, item) => sum + item.amount, 0);
        let adjustedGoal = dailyGoal;
         if (smartMode) {
            if (weatherTemp > 28) adjustedGoal += 300;
            if (weatherTemp > 32) adjustedGoal += 500;
            adjustedGoal += activityBoost;
        }
        const remainingGoal = adjustedGoal - completedWater;

        const remainingSlots = scheduleItems.filter(item => {
            if (item.completed || item.skipped) return false;
            const itemTimeParts = item.time.match(/(\d+):(\d+)\s?(AM|PM)/i);
            if (!itemTimeParts) return false;
            let [ , hours, minutes, meridiem] = itemTimeParts;
            let hour = parseInt(hours, 10);
            if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;
            
            const itemTime = new Date(now);
            itemTime.setHours(hour, parseInt(minutes, 10), 0, 0);

            return itemTime >= now;
        });

        if (remainingSlots.length === 0) {
            setRedistributing(false);
            return;
        }

        const baseAmount = Math.floor(Math.max(remainingGoal, 0) / remainingSlots.length);
        const extraAmount = Math.max(remainingGoal, 0) % remainingSlots.length;

        setScheduleItems(prev => prev.map(item => {
            const slotIndex = remainingSlots.findIndex(slot => slot.id === item.id);
            if (slotIndex !== -1) {
                return {
                    ...item,
                    amount: Math.round((baseAmount + (slotIndex < extraAmount ? 1 : 0))/10)*10,
                    reason: 'Redistributed - Catch-up hydration'
                };
            }
            return item;
        }));
        setRedistributing(false);
    }, 1000);
  }, [scheduleItems, dailyGoal, smartMode, weatherTemp, activityBoost]);

  const toggleCompletion = (id: number, completed: boolean) => {
    setScheduleItems(prevSchedule =>
      prevSchedule.map(item =>
        item.id === id ? { ...item, completed, skipped: !completed && item.skipped } : item
      )
    );
  };

  const skipSlot = (id: number) => {
    setScheduleItems(prev => prev.map(item => item.id === id ? { ...item, skipped: true, completed: false } : item));
    redistributeSchedule();
  };

  const completedWater = scheduleItems.filter(item => item.completed).reduce((sum, item) => sum + item.amount, 0);
  
  let adjustedGoal = dailyGoal;
    if (smartMode) {
        if (weatherTemp > 28) adjustedGoal += 300;
        if (weatherTemp > 32) adjustedGoal += 500;
        adjustedGoal += activityBoost;
  }
  
  const completionRate = adjustedGoal > 0 ? Math.round((completedWater / adjustedGoal) * 100) : 0;
  
  const nextDrink = scheduleItems.find(item => {
    if (item.completed || item.skipped) return false;
    const itemTimeParts = item.time.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!itemTimeParts) return false;
    let [ , hours, minutes, meridiem] = itemTimeParts;
    let hour = parseInt(hours, 10);
    if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;

    const itemTime = new Date(new Date().toDateString());
    itemTime.setHours(hour, parseInt(minutes, 10));

    return itemTime >= currentTime;
  });

  const getSmartInsights = useCallback(() => {
    const insights = [];
    if (smartMode) {
      if (weatherTemp > 28) {
        insights.push({ icon: <Sun className="w-4 h-4 text-orange-500" />, text: `Hot weather detected (${weatherTemp}°C). Goal increased.` });
      }
      if (activityBoost > 0) {
        insights.push({ icon: <Activity className="w-4 h-4 text-green-500" />, text: `Active day detected. Added ${activityBoost}ml.` });
      }
      if (completionRate < 50 && currentTime.getHours() > 14) {
        const skippedCount = scheduleItems.filter(i => i.skipped).length;
        insights.push({ icon: <AlertCircle className="w-4 h-4 text-destructive" />, text: skippedCount > 0 ? `Behind schedule with ${skippedCount} skipped slots. Plan redistributed!` : 'Behind schedule. Consider larger portions.' });
      }
       if (completionRate > 100) {
        insights.push({ icon: <Brain className="w-4 h-4 text-primary" />, text: 'Excellent hydration! Your body is optimally fueled.' });
      }
    }
    return insights;
  }, [smartMode, weatherTemp, activityBoost, completionRate, currentTime, scheduleItems]);
  
  const insights = getSmartInsights();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const addWater = (amount: number) => {
    const firstUncompletedSlot = scheduleItems.find(item => !item.completed && !item.skipped);
    if (firstUncompletedSlot) {
      toggleCompletion(firstUncompletedSlot.id, true);
    }
  };


  return (
    <div className="bg-background rounded-3xl shadow-xl overflow-hidden border">
      <div className="bg-gradient-to-r from-primary to-cyan-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-full"><Droplets className="w-8 h-8" /></div>
            <div>
              <h1 className="text-3xl font-bold font-headline text-primary-foreground">Smart Hydration Assistant</h1>
              <p className="text-blue-100 mt-1">AI-powered personalized water tracking</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary-foreground">{completionRate}%</div>
            <div className="text-blue-100">Daily Progress</div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button onClick={() => setSmartMode(!smartMode)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${smartMode ? 'bg-yellow-400 text-blue-900' : 'bg-white/20 text-white'}`}>
            <Zap className="w-4 h-4" /> Smart Mode {smartMode ? 'ON' : 'OFF'}
          </button>
          {smartMode && <div className="flex items-center gap-2 text-sm text-blue-100"><Brain className="w-4 h-4" /> AI automatically adjusting your plan</div>}
        </div>
      </div>

      <div className="p-6">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" stroke="hsl(var(--muted))" strokeWidth="12" fill="transparent" />
              <circle cx="100" cy="100" r="80" stroke="url(#gradient)" strokeWidth="12" fill="transparent" strokeDasharray={`${completionRate * 5.03} 503`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              <defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="hsl(var(--primary))" /><stop offset="100%" stopColor="hsl(var(--accent))" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <div className="text-4xl font-bold text-foreground">{completedWater}</div>
              <div className="text-muted-foreground">of {adjustedGoal} ml</div>
              {nextDrink && <div className="mt-2 text-sm text-primary font-medium">Next: {nextDrink.amount}ml at {nextDrink.time}</div>}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {[100, 250, 500].map(amount => (
            <button key={amount} onClick={() => addWater(amount)} className="bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground px-8 py-4 rounded-xl hover:from-primary/90 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg">
              +{amount}ml
            </button>
          ))}
        </div>

        {redistributing && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
            <div className="animate-spin"><Zap className="w-5 h-5 text-yellow-600" /></div>
            <div className="text-yellow-800"><div className="font-semibold">Redistributing Schedule...</div><div className="text-sm">AI is recalculating remaining hydration slots</div></div>
          </div>
        )}

        {smartMode && insights.length > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2"><Brain className="w-5 h-5" /> AI Insights</h3>
            <div className="space-y-3">
              {insights.map((insight, index) => <div key={index} className="flex items-center gap-3 text-sm">{insight.icon}<span className="text-gray-700">{insight.text}</span></div>)}
            </div>
          </div>
        )}

        <div className="mb-8 p-6 bg-muted/50 rounded-2xl">
          <h3 className="font-semibold text-foreground mb-4 font-headline">Smart Adjustments (Demo)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Weather Temperature</label>
              <div className="flex gap-2">
                {[20, 25, 30, 35].map(temp => <button key={temp} onClick={() => setWeatherTemp(temp)} className={`px-3 py-2 rounded-lg text-sm ${weatherTemp === temp ? 'bg-orange-500 text-white' : 'bg-background text-foreground border'}`}>{temp}°C</button>)}
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Activity Level</label>
              <div className="flex gap-2">
                {[0, 300, 600, 900].map((boost, index) => <button key={boost} onClick={() => setActivityBoost(boost)} className={`px-3 py-2 rounded-lg text-sm ${activityBoost === boost ? 'bg-green-500 text-white' : 'bg-background text-foreground border'}`}>{['Low', 'Moderate', 'High', 'Intense'][index]}</button>)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-2xl border overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 text-white">
            <h3 className="font-semibold flex items-center gap-2 font-headline"><Clock className="w-5 h-5" />{smartMode ? 'AI-Optimized Hydration Plan' : 'Standard Schedule'}</h3>
            {smartMode && <p className="text-gray-300 text-sm mt-1">Automatically adjusted for weather, activity, and your personal patterns</p>}
          </div>
          <div className="divide-y">
            {scheduleItems.map((item) => (
              <div key={item.id} className={`p-4 ${item.completed ? 'bg-green-50' : item.skipped ? 'bg-red-50' : 'bg-background'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.completed} onChange={(e) => toggleCompletion(item.id, e.target.checked)} className="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2" />
                        <span className="text-sm text-muted-foreground">Done</span>
                      </label>
                      {!item.completed && !item.skipped && <button onClick={() => skipSlot(item.id)} className="text-xs text-destructive hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors">Skip</button>}
                      {item.skipped && <div className="text-xs text-red-600 font-medium px-2 py-1 bg-red-100 rounded">Skipped</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      {item.completed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : item.skipped ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <div className="font-medium text-foreground">{item.time}</div>
                        {smartMode && <div className={`text-sm ${item.reason === 'Redistributed - Catch-up hydration' ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>{item.reason}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${item.completed ? 'text-green-600' : item.skipped ? 'text-destructive' : 'text-primary'}`}>{item.amount} ml</div>
                    {item.reason === 'Redistributed - Catch-up hydration' && !item.completed && <div className="text-xs text-orange-600 font-medium">Adjusted</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl"><Target className="w-8 h-8 text-primary mx-auto mb-2" /><div className="font-semibold text-foreground">Today's Goal</div><div className="text-2xl font-bold text-primary">{adjustedGoal} ml</div></div>
          <div className="text-center p-4 bg-green-50 rounded-xl"><TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" /><div className="font-semibold text-foreground">Completion Rate</div><div className="text-2xl font-bold text-green-600">{completionRate}%</div></div>
          <div className="text-center p-4 bg-purple-50 rounded-xl"><Bell className="w-8 h-8 text-purple-500 mx-auto mb-2" /><div className="font-semibold text-foreground">Smart Alerts</div><div className="text-2xl font-bold text-purple-600">{smartMode ? 'Active' : 'Disabled'}</div></div>
        </div>
      </div>
    </div>
  );
};

export default SmartWaterTracker;

    