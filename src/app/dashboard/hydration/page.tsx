
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Droplets, Clock, Target, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

type ScheduleItem = {
  time: string;
  amount: number;
  completed: boolean;
  skipped: boolean;
  id: number;
  reason: string;
};

const SmartWaterTracker = () => {
  const [dailyGoal, setDailyGoal] = useState(2500);
  const [smartMode, setSmartMode] = useState(true);
  const [weatherTemp, setWeatherTemp] = useState(24);
  const [activityBoost, setActivityBoost] = useState(300);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Set initial daily goal based on user's onboarding data
  useEffect(() => {
    try {
        const onboardingDataString = localStorage.getItem('onboardingData');
        if (onboardingDataString) {
            const data = JSON.parse(onboardingDataString);
            const weight = parseFloat(data.weight);
            const activityLevel = data.activityLevel;

            if (!isNaN(weight)) {
                // Base goal: 35ml per kg of body weight
                let calculatedGoal = Math.round((weight * 35) / 50) * 50;
                
                // Adjust for activity level
                switch (activityLevel) {
                    case 'light':
                        calculatedGoal += 300;
                        break;
                    case 'moderate':
                        calculatedGoal += 500;
                        break;
                    case 'very':
                        calculatedGoal += 750;
                        break;
                }
                setDailyGoal(calculatedGoal);
            }
        }
    } catch (error) {
        console.error("Could not read onboarding data for hydration goal.", error);
    }
  }, []);


  // Play notification sound that works on mobile
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Sound not supported on this device');
    }
  };

  // Simple schedule generation without complex time calculations
  const generateSimpleSchedule = useCallback(() => {
    let adjustedGoal = dailyGoal;
    if (smartMode) {
      if (weatherTemp > 28) adjustedGoal += 300;
      if (weatherTemp > 32) adjustedGoal += 500;
      adjustedGoal += activityBoost;
    }

    const times = [
      '07:00 AM', '09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM',
      '05:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
    ];
    
    const baseAmount = Math.floor(adjustedGoal / 10);
    
    return times.map((time, index) => ({
      time,
      amount: Math.round((baseAmount + (index < 3 ? 50 : index > 7 ? -30 : 0))/10)*10,
      completed: false,
      skipped: false,
      id: index,
      reason: index < 3 ? 'Morning boost' : index > 7 ? 'Evening wind-down' : 'Regular hydration'
    }));
  }, [dailyGoal, smartMode, weatherTemp, activityBoost]);

  // Simple mount effect
  useEffect(() => {
    setMounted(true);
    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Generate schedule after mount
  useEffect(() => {
    if (mounted) {
      const schedule = generateSimpleSchedule();
      setScheduleItems(schedule);
    }
  }, [mounted, generateSimpleSchedule]);

  // Check for upcoming hydration times and play sound
  useEffect(() => {
    if (!mounted || scheduleItems.length === 0) return;

    const checkUpcomingHydration = () => {
      const now = new Date();
      
      scheduleItems.forEach(item => {
        if (item.completed || item.skipped) return;
        
        // Parse the item time
        const [time, period] = item.time.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        const itemTime = new Date();
        itemTime.setHours(hour24, minutes, 0, 0);
        
        // Check if it's 5 minutes before the scheduled time
        const fiveMinutesBefore = new Date(itemTime.getTime() - 5 * 60 * 1000);
        const oneMinuteAfter = new Date(fiveMinutesBefore.getTime() + 60 * 1000);
        
        if (now >= fiveMinutesBefore && now <= oneMinuteAfter) {
          playNotificationSound();
        }
      });
    };

    const interval = setInterval(checkUpcomingHydration, 60000); // Check every minute
    checkUpcomingHydration(); // Check immediately

    return () => clearInterval(interval);
  }, [mounted, scheduleItems, currentTime]);

  const toggleCompletion = (id: number) => {
    setScheduleItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed, skipped: false } : item
      )
    );
  };

  const skipSlot = (id: number) => {
    setScheduleItems(prev => {
      const updatedItems = [...prev];
      const skippedItem = updatedItems.find(item => item.id === id);
      
      if (!skippedItem) return prev;
      
      // Mark the item as skipped
      skippedItem.skipped = true;
      skippedItem.completed = false;
      
      // Find remaining incomplete slots (after the current one)
      const remainingSlots = updatedItems.filter(item => 
        item.id > id && !item.completed && !item.skipped
      );
      
      if (remainingSlots.length === 0) {
        // No remaining slots to redistribute to
        return updatedItems;
      }
      
      // Calculate how much water to redistribute
      const skippedAmount = skippedItem.amount;
      const extraPerSlot = Math.floor(skippedAmount / remainingSlots.length);
      const remainder = skippedAmount % remainingSlots.length;
      
      // Redistribute the water among remaining slots
      remainingSlots.forEach((slot, index) => {
        const originalItem = updatedItems.find(item => item.id === slot.id);
        if (originalItem) {
          originalItem.amount += extraPerSlot;
          // Add remainder to first few slots
          if (index < remainder) {
            originalItem.amount += 1;
          }
          originalItem.reason = `Adjusted (+${extraPerSlot + (index < remainder ? 1 : 0)}ml from skipped ${skippedItem.time})`;
        }
      });
      
      return updatedItems;
    });
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted || scheduleItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your hydration plan...</p>
        </div>
      </div>
    );
  }

  const completedWater = scheduleItems
    .filter(item => item.completed)
    .reduce((sum, item) => sum + item.amount, 0);
  
  let adjustedGoal = dailyGoal;
  if (smartMode) {
    if (weatherTemp > 28) adjustedGoal += 300;
    if (weatherTemp > 32) adjustedGoal += 500;
    adjustedGoal += activityBoost;
  }
  
  const completionRate = adjustedGoal > 0 ? Math.round((completedWater / adjustedGoal) * 100) : 0;
  const remainingWater = Math.max(0, adjustedGoal - completedWater);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-full">
                <Droplets className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Smart Hydration</h1>
                <p className="text-blue-100">Azai-powered water tracking</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{completionRate}%</div>
              <div className="text-blue-100 text-sm">Progress</div>
              <div className="text-blue-100 text-xs mt-1">Target: {adjustedGoal}ml</div>
            </div>
          </div>
          
          {/* Next Goal - Prominent Display */}
          {scheduleItems.find(item => !item.completed && !item.skipped) && (
            <div className="mt-4 p-4 bg-white/15 rounded-xl border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-400 rounded-full">
                    <Clock className="w-5 h-5 text-blue-900" />
                  </div>
                  <div>
                    <div className="text-sm text-blue-100 font-medium">NEXT HYDRATION</div>
                    <div className="text-xl font-bold text-white">
                      {scheduleItems.find(item => !item.completed && !item.skipped)?.amount}ml
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-200">
                    {scheduleItems.find(item => !item.completed && !item.skipped)?.time}
                  </div>
                  <div className="text-xs text-blue-200">
                    {(() => {
                      const nextItem = scheduleItems.find(item => !item.completed && !item.skipped);
                      if (!nextItem) return '';
                      
                      const [time, period] = nextItem.time.split(' ');
                      const [hours, minutes] = time.split(':').map(Number);
                      let hour24 = hours;
                      
                      if (period === 'PM' && hours !== 12) hour24 += 12;
                      if (period === 'AM' && hours === 12) hour24 = 0;
                      
                      const itemTime = new Date();
                      itemTime.setHours(hour24, minutes, 0, 0);
                      const now = new Date();
                      
                      const diffMs = itemTime.getTime() - now.getTime();
                      const diffMins = Math.round(diffMs / (1000 * 60));
                      
                      if (diffMins > 0) {
                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        return hours > 0 ? `in ${hours}h ${mins}m` : `in ${mins}m`;
                      } else if (diffMins > -30) {
                        return 'now';
                      } else {
                        return 'overdue';
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setSmartMode(!smartMode)} 
            className={`mt-4 px-4 py-2 rounded-full transition-all ${
              smartMode ? 'bg-yellow-400 text-blue-900' : 'bg-white/20 text-white'
            }`}
          >
            Smart Mode {smartMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="p-6">
          {/* Progress Circle */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="w-64 h-64 mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
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
                    stroke="#3b82f6"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${completionRate * 5.03} 503`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-4xl font-bold text-gray-900">{completedWater}</div>
                  <div className="text-gray-600">of {adjustedGoal} ml</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-gray-900">Goal</div>
              <div className="text-xl font-bold text-blue-600">{adjustedGoal}ml</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="font-semibold text-gray-900">Progress</div>
              <div className="text-xl font-bold text-green-600">{completionRate}%</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <Droplets className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <div className="font-semibold text-gray-900">Remaining</div>
              <div className="text-xl font-bold text-orange-600">{remainingWater}ml</div>
            </div>
          </div>

          {/* Environment Controls */}
          <div className="mb-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold mb-4">Environment Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Temperature</label>
                <div className="flex gap-2">
                  {[20, 25, 30, 35].map(temp => (
                    <button
                      key={temp}
                      onClick={() => setWeatherTemp(temp)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        weatherTemp === temp 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {temp}°C
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Activity Level</label>
                <div className="flex gap-2">
                  {[0, 300, 600, 900].map((boost, index) => (
                    <button
                      key={boost}
                      onClick={() => setActivityBoost(boost)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        activityBoost === boost 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {['Low', 'Mid', 'High', 'Max'][index]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-gray-800 p-4 text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {smartMode ? 'Azai-Optimized Schedule' : 'Basic Schedule'}
              </h3>
            </div>
            
            <div className="divide-y">
              {scheduleItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 ${
                    item.completed ? 'bg-green-50' : 
                    item.skipped ? 'bg-red-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleCompletion(item.id)}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Complete</span>
                        </label>
                        {!item.completed && !item.skipped && (
                          <button
                            onClick={() => skipSlot(item.id)}
                            className="text-xs text-red-600 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                          >
                            Miss
                          </button>
                        )}
                        {item.skipped && (
                          <div className="text-xs text-red-600 font-medium px-2 py-1 bg-red-100 rounded">
                            Missed
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {item.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : item.skipped ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {item.time}
                            {item.reason.includes('Adjusted') && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                                Redistributed
                              </span>
                            )}
                          </div>
                          {smartMode && (
                            <div className={`text-sm ${
                              item.reason.includes('Adjusted') 
                                ? 'text-orange-600 font-medium' 
                                : 'text-gray-600'
                            }`}>
                              {item.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`font-semibold ${
                      item.completed ? 'text-green-600' :
                      item.skipped ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {item.amount}ml
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartWaterTracker;

    