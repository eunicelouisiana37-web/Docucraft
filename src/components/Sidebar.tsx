import React from 'react';
import { User } from '../types';
import { 
  LayoutDashboard, FileSpreadsheet, History, CreditCard, Settings, Share2, Shield, Users, Database, ToggleLeft, Activity, LogOut, ArrowLeft, Palette
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeView: string; // e.g., 'overview', 'files', 'history', 'billing', 'settings', 'referrals', 'admin-dashboard', 'admin-users', etc.
  onSelectView: (view: string) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  isAdminMode?: boolean;
}

export default function Sidebar({
  currentUser,
  activeView,
  onSelectView,
  onLogout,
  onNavigateHome,
  isAdminMode = false
}: SidebarProps) {

  const dashboardMenu = [
    { name: 'Overview', id: 'overview', icon: LayoutDashboard },
    { name: 'My Files', id: 'files', icon: FileSpreadsheet },
    { name: 'Usage History', id: 'history', icon: History },
    { name: 'Billing', id: 'billing', icon: CreditCard },
    { name: 'Referrals', id: 'referrals', icon: Share2 },
    { name: 'Settings', id: 'settings', icon: Settings },
  ];

  const adminMenu = [
    { name: 'KPI Dashboard', id: 'admin-dashboard', icon: Activity },
    { name: 'Users', id: 'admin-users', icon: Users },
    { name: 'Subscriptions', id: 'admin-subscriptions', icon: CreditCard },
    { name: 'Tools Status', id: 'admin-tools', icon: ToggleLeft },
    { name: 'Global Settings', id: 'admin-settings', icon: Settings },
  ];

  const activeMenu = isAdminMode ? adminMenu : dashboardMenu;

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 h-[calc(100vh-4rem)] sticky top-16 select-none transition-colors duration-200">
        {/* Profile Card Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-900 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl mb-2 shadow-sm">
            {currentUser.name[0].toUpperCase()}
          </div>
          <h4 className="font-sans font-semibold text-gray-900 dark:text-white text-sm truncate w-full">
            {currentUser.name}
          </h4>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mb-2.5 truncate w-full">
            {currentUser.email}
          </p>
          
          {/* Plan Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider select-none bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {currentUser.plan} Plan
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {activeMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60 hover:text-gray-900 dark:hover:text-white'
                }`}
                id={`sidebar-item-${item.id}`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-900 space-y-1">
          {isAdminMode ? (
            <button
              onClick={onNavigateHome}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/20 hover:bg-amber-100/60 transition-all"
              id="sidebar-back-home"
            >
              <ArrowLeft size={18} />
              Exit Admin Portal
            </button>
          ) : currentUser.role === 'admin' ? (
            <button
              onClick={() => onSelectView('admin-dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/20 hover:bg-amber-100/60 transition-all"
              id="sidebar-admin-btn"
            >
              <Shield size={18} />
              Admin Panel
            </button>
          ) : null}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            id="sidebar-logout"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Drawer */}
      <nav className="md:hidden mobile-bottom-nav">
        {activeMenu.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`mobile-bottom-nav-item ${isActive ? 'mobile-bottom-nav-item--active' : ''}`}
            >
              {isActive && <div className="mobile-bottom-nav-item-indicator" />}
              <div className="mobile-bottom-nav-item-content">
                <Icon size={18} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.name}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
}
