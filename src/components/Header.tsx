import React from 'react';
import { User } from '../types';
import { AppStore } from '../lib/store';
import { 
  FileText, Sun, Moon, LogIn, User as UserIcon, LayoutDashboard, LogOut, Shield, Menu, X, Zap 
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({
  currentUser,
  currentPath,
  onNavigate,
  onOpenAuth,
  onLogout,
  theme,
  onToggleTheme
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Tools', path: 'tools' },
    { name: 'Pricing', path: 'pricing' },
  ];

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => handleNav('')} 
          className="flex items-center gap-2 cursor-pointer group"
          id="nav-logo"
        >
          <div className="p-2 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white transition-transform group-hover:scale-105">
            <FileText size={20} className="stroke-[2.5]" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-gray-900 dark:text-white">
            Docu<span className="text-indigo-600 dark:text-indigo-400">lux</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`font-sans text-sm font-medium transition-colors ${
                currentPath === item.path 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {item.name}
            </button>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="hidden md:flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 transition-colors"
            title="Toggle theme"
            id="theme-toggle-btn"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleNav('admin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 transition-all hover:shadow-sm"
                  id="header-admin-portal-btn"
                >
                  <Shield size={14} />
                  Admin Portal
                </button>
              )}

              <button
                onClick={() => handleNav('dashboard')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100/50 transition-colors"
                id="header-dashboard-btn"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm select-none shadow-sm">
                  {currentUser.name[0].toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                  title="Sign out"
                  id="header-logout-btn"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                id="header-login-btn"
              >
                <LogIn size={16} />
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-all hover:shadow-md"
                id="header-register-btn"
              >
                <Zap size={15} />
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 transition-colors"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 space-y-3 transition-colors duration-200">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-gray-900 space-y-2">
            {currentUser ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {currentUser.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                  </div>
                </div>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => handleNav('admin')}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/20"
                  >
                    <Shield size={18} />
                    Admin Portal
                  </button>
                )}

                <button
                  onClick={() => handleNav('dashboard')}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/20"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-2 py-1">
                <button
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-sm font-medium bg-indigo-600 text-white rounded-lg"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
