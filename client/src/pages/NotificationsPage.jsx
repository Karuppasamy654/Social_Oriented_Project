import React from 'react';
import { Bell, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  const notifications = [
    {
      id: 'n-1',
      title: 'Recurring Mistake Alert Detected',
      message: 'You repeated an off-by-one boundary mistake in HashMap array iteration. Target recommendation added to your Dashboard.',
      type: 'mistake',
      time: '10 mins ago',
      read: false
    },
    {
      id: 'n-2',
      title: 'New AI Problem Recommendation',
      message: 'Based on your recent solve accuracy in Graphs, we recommend trying "Rotting Oranges".',
      type: 'recommendation',
      time: '2 hours ago',
      read: true
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl">
          <Bell className="w-6 h-6 text-pink-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm">Real-time alerts, recurring mistake warnings, and system updates</p>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <div key={notif.id} className={`p-5 rounded-2xl border transition-all ${notif.read ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-900/90 border-pink-500/30'}`}>
            <div className="flex items-start space-x-4">
              {notif.type === 'mistake' ? (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white">{notif.title}</h4>
                  <span className="text-xs text-gray-500">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-300 mt-1">{notif.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
