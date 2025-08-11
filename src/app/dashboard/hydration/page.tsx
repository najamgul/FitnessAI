
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Droplets, Clock, Target, TrendingUp, Sun, Activity, Bell, Zap, Brain, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type ScheduleItem = {
  time: string;
  amount: number;
  completed: boolean;
  skipped: boolean;
  smart: boolean;
  id: number;
  reason: string;
  originalAmount?: number;
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
  const [activityBoost, setActivityBoost] = useState(300);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [redistributing, setRedistributing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notificationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Safe notification setup for mobile
  const setupNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          setNotificationsEnabled(permission === 'granted');
        } else {
          setNotificationsEnabled(Notification.permission === 'granted');
        }
      }
    } catch (error) {
      console.log('Notifications not supported on this device');
      setNotificationsEnabled(false);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    setupNotifications();
    
    // Load profile data from memory instead of localStorage
    // In a real app, this would come from your backend/database
    const defaultProfile = {
      weight: 70,
      activityLevel: 'moderate',
      wakeTime: '07:00',
      sleepTime: '23:00'
    };
    setProfile(defaultProfile);
  }, [setupNotifications]);

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
      const hourDecimal = wakeHour + (i * awakeHours) / numSlots;
      const hour = Math.floor(hourDecimal);
      const minute = Math.round((hourDecimal % 1) * 60);
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

      const finalAmount = Math.round(amount / 10) * 10;
      schedule.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        amount: finalAmount,
        originalAmount: finalAmount,
        completed: false,
        skipped: false,
        smart: true,
        id: i,
        reason,
      });
    }

    const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
    let diff = adjustedGoal - totalScheduled;
    let i = 0;
    while(diff !== 0 && i < 100) {
      const adjustment = diff > 0 ? 10 : -10;
      if (schedule[i % numSlots].amount + adjustment > 0) {
        schedule[i % numSlots].amount += adjustment;
        schedule[i % numSlots].originalAmount = schedule[i % numSlots].amount;
        diff -= adjustment;
      }
      i++;
    }

    return schedule;
  }, [profile.wakeTime, profile.sleepTime, dailyGoal, smartMode, weatherTemp, activityBoost]);

  useEffect(() => {
    if (isClient) {
      const newSchedule = generateSmartSchedule();
      setScheduleItems(newSchedule);
    }
  }, [isClient, generateSmartSchedule]);

  // Safe notification scheduling for mobile
  useEffect(() => {
    notificationTimeouts.current.forEach(clearTimeout);
    notificationTimeouts.current = [];

    if (isClient && notificationsEnabled && scheduleItems.length > 0) {
      scheduleItems.forEach(item => {
        if (!item.completed && !item.skipped) {
          const now = new Date();
          const itemTimeParts = item.time.match(/(\d+):(\d+)\s?(AM|PM)/i);
          if (!itemTimeParts) return;

          let [, hours, minutes, meridiem] = itemTimeParts;
          let hour = parseInt(hours, 10);

          if (meridiem && meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (meridiem && meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;

          const itemDate = new Date();
          itemDate.setHours(hour, parseInt(minutes, 10), 0, 0);
          const notificationTime = new Date(itemDate.getTime() - 5 * 60 * 1000);

          if (notificationTime > now) {
            const timeout = setTimeout(() => {
              try {
                new Notification('Hydration Reminder', {
                  body: `Time for your next glass of water at ${item.time}!`,
                  icon: '💧'
                });
              } catch (error) {
                console.log('Notification failed:', error);
              }
            }, notificationTime.getTime() - now.getTime());
            notificationTimeouts.current.push(timeout);
          }
        }
      });
    }

    return () => {
      notificationTimeouts.current.forEach(clearTimeout);
    };
  }, [scheduleItems, isClient, notificationsEnabled]);

  const redistributeWaterSlots = useCallback((skippedItemId: number) => {
    setRedistributing(true);
    
    setScheduleItems(prevItems => {
      const updatedItems = [...prevItems];
      const skippedItem = updatedItems.find(item => item.id === skippedItemId);
      
      if (!skippedItem) {
        setRedistributing(false);
        return prevItems;
      }

      const skippedAmount = skippedItem.originalAmount || skippedItem.amount;
      
      const remainingItems = updatedItems.filter(item => 
        item.id > skippedItemId && 
        !item.completed && 
        !item.skipped
      );

      if (remainingItems.length === 0) {
        setRedistributing(false);
        return updatedItems;
      }

      const additionalAmountPerSlot = Math.round(skippedAmount / remainingItems.length / 10) * 10;
      
      updatedItems.forEach(item => {
        if (remainingItems.some(remaining => remaining.id === item.id)) {
          const originalAmount = item.originalAmount || item.amount;
          item.amount = originalAmount + additionalAmountPerSlot;
          item.reason = `Redistributed - +${additionalAmountPerSlot}ml from missed ${skippedItem.time}`;
        }
      });

      setTimeout(() => setRedistributing(false), 500);
      return updatedItems;
    });
  }, []);

  const toggleCompletion = (id: number, completed: boolean) => {
    setScheduleItems(prevSchedule =>
      prevSchedule.map(item =>
        item.id === id ? { ...item, completed, skipped: !completed && item.skipped } : item
      )
    );
  };

  const skipSlot = (id: number) => {
    setScheduleItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, skipped: true, completed: false } : item
      )
    );
    redistributeWaterSlots(id);
  };

  const completedWater = scheduleItems.filter(item => item.completed).reduce((sum, item) => sum + item.amount, 0);
  
  let adjustedGoal = dailyGoal;
  if (smartMode) {
    if (weatherTemp > 28) adjustedGoal += 300;
    if (weatherTemp > 32) adjustedGoal += 500;
    adjustedGoal += activityBoost;
  }
  
  const completionRate = adjustedGoal > 0 ? Math.round((completedWater / adjustedGoal) * 100) : 0;
  const remainingWaterNeeded = Math.max(0, adjustedGoal - completedWater);
  
  const nextDrink = scheduleItems.find(item => {
    if (item.completed || item.skipped) return false;
    const now = new Date();
    const itemTimeParts = item.time.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!itemTimeParts) return false;
    let [, hours, minutes, meridiem] = itemTimeParts;
    let hour = parseInt(hours, 10);
    if (meridiem && meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (meridiem && meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;
    const itemTime = new Date(now);
    itemTime.setHours(hour, parseInt(minutes, 10), 0, 0);
    return itemTime >= now;
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
        insights.push({ icon: <AlertCircle className="w-4 h-4 text-red-500" />, text: skippedCount > 0 ? `Behind schedule with ${skippedCount} missed slots. Plan redistributed!` : 'Behind schedule. Consider larger portions.' });
      }
      if (completionRate > 100) {
        insights.push({ icon: <Brain className="w-4 h-4 text-blue-500" />, text: 'Excellent hydration! Your body is optimally fueled.' });
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

  if (!isClient || scheduleItems.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <Droplets className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Smart Hydration Assistant</h1>
              <p className="text-blue-100 mt-1 text-sm sm:text-base">AI-powered personalized water tracking</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-3xl sm:text-4xl font-bold">{completionRate}%</div>
            <div className="text-blue-100 text-sm">Daily Progress</div>
            {remainingWaterNeeded > 0 && (
              <div className="text-blue-100 text-xs sm:text-sm mt-1">{remainingWaterNeeded}ml remaining</div>
            )}
          </div>
        </div>
        <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setSmartMode(!smartMode)} 
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full transition-all text-sm ${smartMode ? 'bg-yellow-400 text-blue-900' : 'bg-white/20 text-white'}`}
          >
            <Zap className="w-4 h-4" /> Smart Mode {smartMode ? 'ON' : 'OFF'}
          </button>
          {smartMode && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-100">
              <Brain className="w-4 h-4" /> AI automatically adjusting your plan
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-block">
            <svg className="w-64 h-64 sm:w-80 sm:h-80 transform -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={`${completionRate * 5.03} 503`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col px-4">
              <div className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">{completedWater}</div>
              <div className="text-gray-600 text-sm sm:text-lg mt-1">of {adjustedGoal} ml</div>
              {nextDrink && (
                <div className="mt-2 sm:mt-3 text-center">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium">Next:</div>
                  <div className="text-sm sm:text-base text-blue-600 font-semibold">
                    {nextDrink.amount}ml at {nextDrink.time}
                    {nextDrink.originalAmount && nextDrink.amount !== nextDrink.originalAmount && (
                      <span className="text-orange-600 text-xs sm:text-sm ml-1">(+{nextDrink.amount - nextDrink.originalAmount}ml)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[100, 250, 500].map(amount => (
            <button 
              key={amount} 
              onClick={() => addWater(amount)} 
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
            >
              +{amount}ml
            </button>
          ))}
        </div>

        {redistributing && (
          <div className="mb-6 sm:mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
            <div className="animate-spin"><Zap className="w-5 h-5 text-yellow-600" /></div>
            <div className="text-yellow-800">
              <div className="font-semibold text-sm sm:text-base">Redistributing Schedule...</div>
              <div className="text-xs sm:text-sm">Recalculating remaining hydration slots</div>
            </div>
          </div>
        )}

        {smartMode && insights.length > 0 && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <h3 className="font-semibold text-purple-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Brain className="w-4 sm:w-5 h-4 sm:h-5" /> AI Insights
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  {insight.icon}
                  <span className="text-gray-700">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="font-bold text-xl sm:text-2xl text-blue-700">{completedWater}</div>
                <div className="text-blue-600 text-xs sm:text-sm">Consumed</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-xl sm:text-2xl text-cyan-700">{adjustedGoal}</div>
                <div className="text-cyan-600 text-xs sm:text-sm">Target</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-xl sm:text-2xl text-green-700">{remainingWaterNeeded}</div>
                <div className="text-green-600 text-xs sm:text-sm">Remaining</div>
              </div>
            </div>
            <div className="w-full sm:w-32 bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-cyan-500 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-50 rounded-2xl">
          <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Smart Adjustments (Demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-2">Weather Temperature</label>
              <div className="flex gap-2">
                {[20, 25, 30, 35].map(temp => (
                  <button 
                    key={temp} 
                    onClick={() => setWeatherTemp(temp)} 
                    className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm ${weatherTemp === temp ? 'bg-orange-500 text-white' : 'bg-white text-gray-900 border'}`}
                  >
                    {temp}°C
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-2">Activity Level</label>
              <div className="flex gap-2">
                {[0, 300, 600, 900].map((boost, index) => (
                  <button 
                    key={boost} 
                    onClick={() => setActivityBoost(boost)} 
                    className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm ${activityBoost === boost ? 'bg-green-500 text-white' : 'bg-white text-gray-900 border'}`}
                  >
                    {['Low', 'Moderate', 'High', 'Intense'][index]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-3 sm:p-4 text-white">
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 sm:w-5 h-4 sm:h-5" />
              {smartMode ? 'AI-Optimized Hydration Plan' : 'Standard Schedule'}
            </h3>
            {smartMode && (
              <p className="text-gray-300 text-xs sm:text-sm mt-1">
                Automatically adjusted for weather, activity, and your personal patterns
              </p>
            )}
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {scheduleItems.map((item) => (
              <div key={item.id} className={`p-3 sm:p-4 ${item.completed ? 'bg-green-50' : item.skipped ? 'bg-red-50' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <label className="flex items-center gap-1 sm:gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={item.completed} 
                          onChange={(e) => toggleCompletion(item.id, e.target.checked)} 
                          className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
                        />
                        <span className="text-xs sm:text-sm text-gray-600">Goal</span>
                      </label>
                      {!item.completed && !item.skipped && (
                        <button 
                          onClick={() => skipSlot(item.id)} 
                          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Missed
                        </button>
                      )}
                      {item.skipped && (
                        <div className="text-xs text-red-600 font-medium px-2 py-1 bg-red-100 rounded">Missed</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-500" />
                      ) : item.skipped ? (
                        <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-red-500" />
                      ) : (
                        <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                          {item.time}
                          {item.originalAmount && item.amount !== item.originalAmount && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                              Adjusted
                            </span>
                          )}
                        </div>
                        {smartMode && (
                          <div className={`text-xs sm:text-sm ${item.reason.includes('Redistributed') ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                            {item.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm sm:text-base ${item.completed ? 'text-green-600' : item.skipped ? 'text-red-600' : 'text-blue-600'}`}>
                      {item.amount} ml
                      {item.originalAmount && item.amount !== item.originalAmount && (
                        <span className="text-gray-500 text-xs sm:text-sm ml-1">(was {item.originalAmount}ml)</span>
                      )}
                    </div>
                    {item.reason.includes('Redistributed') && !item.completed && (
                      <div className="text-xs text-orange-600 font-medium">+{item.amount - (item.originalAmount || 0)}ml</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <Target className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 text-sm sm:text-base">Today's Goal</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{adjustedGoal} ml</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <TrendingUp className="w-6 sm:w-8 h-6 sm:h-8 text-green-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 text-sm sm:text-base">Completion Rate</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{completionRate}%</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <Bell className="w-6 sm:w-8 h-6 sm:h-8 text-purple-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 text-sm sm:text-base">Smart Alerts</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{notificationsEnabled ? 'Active' : 'Disabled'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
