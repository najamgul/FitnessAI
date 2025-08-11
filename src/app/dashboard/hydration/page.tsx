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
  const [dailyGoal] = useState(2500);
  const [smartMode, setSmartMode] = useState(true);
  const [weatherTemp, setWeatherTemp] = useState(24);
  const [activityBoost, setActivityBoost] = useState(300);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [mounted, setMounted] = useState(false);

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
      amount: baseAmount + (index < 3 ? 50 : index > 7 ? -30 : 0),
      completed: false,
      skipped: false,
      id: index,
      reason: index < 3 ? 'Morning boost' : index > 7 ? 'Evening wind-down' : 'Regular hydration'
    }));
  }, [dailyGoal, smartMode, weatherTemp, activityBoost]);

  // Simple mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate schedule after mount
  useEffect(() => {
    if (mounted) {
      const schedule = generateSimpleSchedule();
      setScheduleItems(schedule);
    }
  }, [mounted, generateSimpleSchedule]);

  const toggleCompletion = (id: number) => {
    setScheduleItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed, skipped: false } : item
      )
    );
  };

  const skipSlot = (id: number) => {
    setScheduleItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, skipped: true, completed: false } : item
      )
    );
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
                <p className="text-blue-100">AI-powered water tracking</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{completionRate}%</div>
              <div className="text-blue-100 text-sm">Progress</div>
            </div>
          </div>
          
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

          {/* Quick Add Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            {[100, 250, 500].map(amount => (
              <button 
                key={amount}
                onClick={() => {
                  const nextSlot = scheduleItems.find(item => !item.completed && !item.skipped);
                  if (nextSlot) {
                    toggleCompletion(nextSlot.id);
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
              >
                +{amount}ml
              </button>
            ))}
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

          {/* Demo Controls */}
          <div className="mb-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold mb-4">Demo Controls</h3>
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
                {smartMode ? 'AI-Optimized Schedule' : 'Basic Schedule'}
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
                            Skip
                          </button>
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
                          <div className="font-medium">{item.time}</div>
                          {smartMode && (
                            <div className="text-sm text-gray-600">{item.reason}</div>
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
