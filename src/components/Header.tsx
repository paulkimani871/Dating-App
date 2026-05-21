import React, { useState } from 'react';
import { Bell, Sparkles, LogOut, CheckCircle, Shield, Menu } from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface HeaderProps {
  userName: string;
  role: 'admin' | 'user';
  isPremium: boolean;
  onlineStatus: boolean;
  setOnlineStatus: (status: boolean) => void;
  notifications: NotificationItem[];
  markNotificationsAsRead: () => void;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Header({
  userName,
  role,
  isPremium,
  onlineStatus,
  setOnlineStatus,
  notifications,
  markNotificationsAsRead,
  setActiveTab,
  onLogout
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      markNotificationsAsRead();
    }
  };

  return (
    <header className="h-20 w-[calc(100%-18rem)] ml-72 fixed top-0 right-0 glass-card border-b border-slate-800/80 px-8 flex items-center justify-between z-30">
      {/* Search / Section context */}
      <div>
        <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
          {role === 'admin' ? (
            <>
              <Shield className="w-5 h-5 text-red-400" />
              <span>Admin Management Space</span>
            </>
          ) : (
            <>
              <span>Welcome Back, <span className="text-gradient font-extrabold">{userName}</span></span>
              {isPremium && (
                <span className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full px-2 py-0.5 font-bold uppercase ml-1 animate-pulse">
                  VIP
                </span>
              )}
            </>
          )}
        </h2>
        <p className="text-xs text-slate-400">
          {role === 'admin' ? 'Monitoring platform safety and revenues.' : 'Find your perfect dream partner today.'}
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-6">
        {/* Presence Toggle */}
        {role !== 'admin' && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
            <span className={`w-2.5 h-2.5 rounded-full ${onlineStatus ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'} transition-all duration-300`}></span>
            <span className="text-xs font-medium text-slate-300 select-none">
              {onlineStatus ? 'Active Online' : 'Invisible'}
            </span>
            <button
              onClick={() => setOnlineStatus(!onlineStatus)}
              className="ml-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline bg-transparent border-0 cursor-pointer"
            >
              Toggle
            </button>
          </div>
        )}

        {/* Upgrade Premium Callout */}
        {role !== 'admin' && !isPremium && (
          <button
            onClick={() => setActiveTab('premium')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white text-xs font-bold shadow-md transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Go Premium VIP</span>
          </button>
        )}

        {/* Alert Bell */}
        <div className="relative">
          <button
            onClick={toggleNotifications}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-all duration-300 relative group"
          >
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-slate-900 shadow animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-card border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white">Live Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-900 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-900">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    No active notifications yet.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className={`p-4 transition-colors hover:bg-slate-900/30 ${!item.is_read ? 'bg-indigo-950/10' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-xs text-white leading-tight">
                          {item.title}
                        </span>
                        <span className="text-[9px] text-slate-500 shrink-0 font-medium">
                          {item.created_at}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">
                        {item.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-800/60 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Close panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
