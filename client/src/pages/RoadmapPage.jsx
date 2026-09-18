import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, CheckCircle2, Lock, Sparkles, BookOpen } from 'lucide-react';

export default function RoadmapPage() {
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await api.get('/recommendations/progress');
      setProgressData(res.data);
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const roadmapItems = progressData?.roadmap || [
    { topic: 'Array Fundamentals', status: 'completed', completionPercentage: 100 },
    { topic: 'Strings & Char Counting', status: 'completed', completionPercentage: 100 },
    { topic: 'HashMap & Sets', status: 'in_progress', completionPercentage: 70 },
    { topic: 'Two Pointers Technique', status: 'in_progress', completionPercentage: 40 },
    { topic: 'Sliding Window', status: 'in_progress', completionPercentage: 20 },
    { topic: 'Trees & Binary Search Trees', status: 'locked', completionPercentage: 0 },
    { topic: 'Graph Algorithms', status: 'locked', completionPercentage: 0 },
    { topic: 'Dynamic Programming', status: 'locked', completionPercentage: 0 }
  ];

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="px-3 py-1 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-xs font-bold">
          Verified Level: {progressData?.verifiedLevel || 'Intermediate+'}
        </span>
        <h1 className="text-3xl font-extrabold text-white">Your Personalized Learning Roadmap</h1>
        <p className="text-xs text-gray-400">CodeBuddy AI dynamically adjusts topic progression according to your accuracy and recurring mistakes.</p>
      </div>

      <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="space-y-6 font-mono text-xs">
          {roadmapItems.map((item, idx) => {
            const isCompleted = item.status === 'completed';
            const isLocked = item.status === 'locked';
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between font-sans text-sm font-semibold text-white">
                  <div className="flex items-center space-x-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-lime" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5 text-gray-500" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-accent-blue animate-ping"></span>
                    )}
                    <span className={isLocked ? 'text-gray-500' : 'text-white'}>{item.topic}</span>
                  </div>
                  <span className={isCompleted ? 'text-accent-lime font-bold' : isLocked ? 'text-gray-500' : 'text-accent-blue font-bold'}>
                    {item.completionPercentage}%
                  </span>
                </div>

                <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden p-0.5 border border-surface-border">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-accent-lime shadow-glow-blue' : isLocked ? 'bg-gray-700' : 'bg-gradient-to-r from-accent-blue to-accent-purple shadow-glow-purple'
                    }`}
                    style={{ width: `${item.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
