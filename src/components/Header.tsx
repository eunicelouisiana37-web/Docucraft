import React from 'react';
import { User } from '../types';
import { 
  Menu, X, LogIn, LogOut, Shield, LayoutDashboard, Sun, Moon, Sparkles 
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

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary shrink-0">
    <path d="M6 4C6 2.89543 6.89543 2 8 2H20L26 8V28C26 29.1046 25.1046 30 24 30H8C6.89543 30 6 29.1046 6 28V4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 2V8H26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 14H21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M11 19H21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M11 24H17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

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
    { name: 'How It Works', path: 'how-it-works' },
    { name: 'Pricing', path: 'pricing' },
  ];

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-surface/90 backdrop-blur-[12px] border-b border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        
        {/* Logo Section */}
        <div 
          onClick={() => handleNav('')} 
          className="flex items-center gap-2.5 cursor-pointer group"
          id="nav-logo"
        >
          <LogoIcon />
          <span className="font-display font-bold text-[22px] leading-none tracking-tight text-text-primary">
            Docu<span className="text-primary">lux</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`text-[15px] transition-colors duration-150 font-medium ${
                currentPath === item.path 
                  ? 'text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.name}
            </button>
          ))}
        </nav>

        {/* Desktop CTA Action Controls */}
        <div className="hidden md:flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
            title="Toggle theme"
            id="theme-toggle-btn"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-4">
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleNav('admin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full text-amber-500 bg-amber-500/10 border border-amber-500/20 transition-all hover:bg-amber-500/20"
                  id="header-admin-portal-btn"
                >
                  <Shield size={14} />
                  Admin Portal
                </button>
              )}

              <button
                onClick={() => handleNav('dashboard')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                id="header-dashboard-btn"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm select-none shadow-md">
                  {currentUser.name[0].toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title="Sign out"
                  id="header-logout-btn"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Sign In (ghost) */}
              <button
                onClick={() => onOpenAuth('login')}
                className="px-[18px] py-[8px] text-[15px] font-medium text-text-secondary hover:text-text-primary border border-border bg-transparent rounded-full hover:border-primary transition-all duration-150"
                id="header-login-btn"
              >
                Sign In
              </button>
              {/* Try Free (filled) */}
              <button
                onClick={() => onOpenAuth('register')}
                className="px-[20px] py-[8px] text-[15px] font-semibold rounded-full bg-primary text-white hover:bg-primary-dark hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all duration-150"
                id="header-register-btn"
              >
                Try Free
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger and quick theme switcher */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
            aria-label="Open Menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Full Screen Overlay Menu Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-surface flex flex-col p-6 animate-fade-in md:hidden">
          {/* Header Row inside overlay */}
          <div className="flex items-center justify-between h-10 mb-8">
            <div className="flex items-center gap-2.5">
              <LogoIcon />
              <span className="font-display font-bold text-[22px] leading-none tracking-tight text-text-primary">
                Docu<span className="text-primary">lux</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
              aria-label="Close Menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Nav links stack */}
          <nav className="flex flex-col gap-6 text-center my-auto">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`text-2xl font-display font-semibold transition-colors ${
                  currentPath === item.path 
                    ? 'text-primary' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          {/* CTA & Actions stack */}
          <div className="mt-auto space-y-4 pt-8 border-t border-border">
            {currentUser ? (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base shadow-md">
                    {currentUser.name[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary">{currentUser.name}</p>
                    <p className="text-xs text-text-muted">{currentUser.email}</p>
                  </div>
                </div>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => handleNav('admin')}
                    className="flex w-full items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20"
                  >
                    <Shield size={16} />
                    Admin Portal
                  </button>
                )}

                <button
                  onClick={() => handleNav('dashboard')}
                  className="flex w-full items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-primary bg-primary/10 border border-primary/20"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/20"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 text-center text-[16px] font-medium text-text-secondary hover:text-text-primary border border-border bg-transparent rounded-full hover:border-primary transition-all duration-150"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 text-center text-[16px] font-semibold rounded-full bg-primary text-white hover:bg-primary-dark hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all duration-150"
                >
                  Try Free
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
