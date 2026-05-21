import React from 'react';
import { Heart, User, MessageCircle, Settings, LogOut, ShieldAlert, Sparkles, Sliders, Bell } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'admin' | 'user';
  userName: string;
  isPremium: boolean;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, role, userName, isPremium, onLogout }: SidebarProps) {
interface MenuItem {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    accent?: boolean;
  }

  const userMenuItems: MenuItem[] = [
    { id: 'discover', label: 'Discover Matches', icon: Heart },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'filters', label: 'Search & Filters', icon: Sliders },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'premium', label: 'Premium VIP', icon: Sparkles, accent: true },
  ];

  const adminMenuItems: MenuItem[] = [
    { id: 'overview', label: 'Analytics Panel', icon: Sliders },
    { id: 'users', label: 'User Directory', icon: User },
    { id: 'moderation', label: 'Photo Approval', icon: Sparkles },
    { id: 'reports', label: 'Support & Abuse', icon: ShieldAlert },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : userMenuItems;

  return (
    <aside className="w-72 h-screen fixed left-0 top-0 glass-card border-r border-slate-800 flex flex-col justify-between py-6 px-4 z-40">
      <div>
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-3 mb-8 cursor-pointer group" onClick={() => setActiveTab(role === 'admin' ? 'overview' : 'discover')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center pulse-border">
            <Heart className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wider text-white">
              DREAM<span className="text-gradient">MATCH</span>
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">
              {role === 'admin' ? 'SYSTEM ADMIN' : 'Dating SaaS'}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mb-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-sm">
              {userName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-sm text-white truncate">{userName}</h3>
            {role === 'admin' ? (
              <span className="inline-block text-[9px] bg-red-950 text-red-400 border border-red-900/50 rounded-full px-2 py-0.5 mt-0.5 font-medium uppercase tracking-wider">
                Super Admin
              </span>
            ) : isPremium ? (
              <span className="inline-block text-[9px] bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-full px-2 py-0.5 mt-0.5 font-bold uppercase tracking-wider shadow">
                ✨ PREMIUM VIP
              </span>
            ) : (
              <span className="inline-block text-[9px] bg-slate-800 text-slate-400 rounded-full px-2 py-0.5 mt-0.5">
                Free Account
              </span>
            )}
          </div>
        </div>

        {/* Nav Links Column */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
                  isActive
                    ? 'bg-gradient-brand text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent hover:border-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                  item.accent && !isActive ? 'text-amber-400 group-hover:animate-pulse' : ''
                }`} />
                <span>{item.label}</span>
                {item.accent && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Row */}
      <div className="pt-4 border-t border-slate-800/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-950/40 transition-all duration-300 group"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all duration-300" />
          <span>Exit Workspace</span>
        </button>
      </div>
    </aside>
  );
}
