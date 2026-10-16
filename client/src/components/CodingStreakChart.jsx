import React, { useState } from 'react';
import { Flame, Calendar, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';

export default function CodingStreakChart({ userStats = {}, activityCalendar = {} }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const streak = userStats.currentStreak ?? 0;
  const bestStreak = userStats.bestStreak ?? 0;
  const totalSolved = userStats.totalSolved ?? 0;
  const totalSubmissions = userStats.totalSubmissions ?? 0;

  // Generate 16 weeks (112 days) up to today
  const calendarDays = [];
  const today = new Date();
  const dayOfWeekToday = today.getDay();

  // Find start date (16 weeks ago aligned to Sunday)
  const totalDaysToDisplay = 16 * 7;
  for (let i = totalDaysToDisplay - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const count = activityCalendar[dateStr] || 0;

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    calendarDays.push({
      dateStr,
      formattedDate,
      dayName,
      monthName,
      dayOfWeek: d.getDay(),
      count
    });
  }

  // Active hover info or default today info
  const activeHover = hoveredDay || calendarDays[calendarDays.length - 1];

  // Month labels positioning
  const monthLabels = [];
  calendarDays.forEach((day, idx) => {
    if (day.dayOfWeek === 0) { // Sunday start of week
      if (idx === 0 || day.monthName !== calendarDays[idx - 1]?.monthName) {
        monthLabels.push({ month: day.monthName, colIndex: Math.floor(idx / 7) });
      }
    }
  });

  return (
    <div className="bg-surface border border-surface-border rounded-3xl p-6 shadow-2xl space-y-6 animate-fadeIn">
      
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-orange/15 border border-accent-orange/30 flex items-center justify-center text-accent-orange shadow-glow-orange">
            <Flame className="w-6 h-6 fill-accent-orange animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-black text-white tracking-tight">Coding Activity & Streak Heatmap</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-accent-orange/20 text-accent-orange border border-accent-orange/30 text-[10px] font-extrabold uppercase">
                {streak} Day Streak 🔥
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Daily submission matrix over the past 16 weeks ({totalSubmissions} submissions logged)
            </p>
          </div>
        </div>

        {/* Quick Streak Summary Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-surface-secondary border border-surface-border px-3.5 py-2 rounded-2xl text-center">
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Current Streak</span>
            <span className="text-accent-orange font-extrabold text-sm flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-accent-orange" /> {streak} days
            </span>
          </div>
          <div className="bg-surface-secondary border border-surface-border px-3.5 py-2 rounded-2xl text-center">
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Best Streak</span>
            <span className="text-amber-400 font-extrabold text-sm">{bestStreak} days</span>
          </div>
          <div className="bg-surface-secondary border border-surface-border px-3.5 py-2 rounded-2xl text-center">
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Solved</span>
            <span className="text-emerald-400 font-extrabold text-sm">{totalSolved}</span>
          </div>
        </div>

      </div>

      {/* Interactive Tooltip Banner */}
      <div className="bg-surface-secondary/80 border border-surface-border/80 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-accent-blue" />
          <span className="text-white font-bold">{activeHover.formattedDate}:</span>
          <span className={activeHover.count > 0 ? "text-emerald-400 font-bold" : "text-gray-400"}>
            {activeHover.count > 0 
              ? `🚀 ${activeHover.count} submission(s) completed` 
              : "No coding activity logged for this day"}
          </span>
        </div>
        <span className="text-gray-500 hidden sm:inline text-[11px]">Hover over any box to view details</span>
      </div>

      {/* Heatmap Matrix Grid */}
      <div className="overflow-x-auto pb-2 no-scrollbar">
        <div className="min-w-[640px] space-y-2">
          
          {/* Month Labels Row */}
          <div className="flex text-[10px] font-mono text-gray-400 pl-8 relative h-4">
            {monthLabels.map((m, idx) => (
              <span 
                key={idx} 
                className="absolute font-bold text-gray-300 uppercase" 
                style={{ left: `${m.colIndex * 18 + 32}px` }}
              >
                {m.month}
              </span>
            ))}
          </div>

          <div className="flex items-start">
            
            {/* Day of Week Labels */}
            <div className="flex flex-col justify-between text-[10px] font-mono text-gray-500 pr-2 pt-0.5 space-y-[9px] select-none">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* 7 rows x 16 cols Box Matrix */}
            <div className="grid grid-rows-7 grid-flow-col gap-1.5 flex-1">
              {calendarDays.map((d, idx) => {
                const count = d.count;
                let bgStyle = "bg-[#0B1020] border-surface-border/50 hover:border-gray-500";
                
                if (count >= 4) {
                  bgStyle = "bg-emerald-400 border-emerald-300 shadow-md shadow-emerald-400/50 hover:scale-125 z-10";
                } else if (count >= 2) {
                  bgStyle = "bg-emerald-600 border-emerald-500 shadow-sm shadow-emerald-600/30 hover:scale-125 z-10";
                } else if (count >= 1) {
                  bgStyle = "bg-emerald-900/90 border-emerald-700/70 hover:scale-125 z-10";
                }

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md border transition-all duration-200 cursor-pointer ${bgStyle}`}
                  ></div>
                );
              })}
            </div>

          </div>

        </div>
      </div>

      {/* Heatmap Footer Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-border text-xs font-mono text-gray-400">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-[11px]">Consistent daily coding builds long-term algorithmic mastery.</span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span>Less</span>
          <div className="w-3.5 h-3.5 rounded-md bg-[#0B1020] border border-surface-border/50"></div>
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-900/90 border border-emerald-700/70"></div>
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-600 border border-emerald-500"></div>
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-400 border border-emerald-300 shadow-sm shadow-emerald-400"></div>
          <span>More</span>
        </div>
      </div>

    </div>
  );
}
