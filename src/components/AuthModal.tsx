import React, { useState } from 'react';
import { AppStore } from '../lib/store';
import { X, LogIn, UserPlus, HelpCircle, ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
  onLoginSuccess: (user: any) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login',
  onLoginSuccess
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'> (initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  React.useEffect(() => {
    setTab(initialTab);
    setFieldErrors({});
    setSuccess('');
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  // Rate limiting helper
  const isLockedOut = () => {
    if (lockoutTime && Date.now() < lockoutTime) {
      return true;
    }
    return false;
  };

  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return 0;
    return Math.ceil((lockoutTime - Date.now()) / 1000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess('');

    if (isLockedOut()) {
      const remaining = getRemainingLockoutTime();
      setFieldErrors({ password: `Too many failed attempts. Try again in ${remaining} seconds.` });
      return;
    }

    if (!email) {
      setFieldErrors(prev => ({ ...prev, email: 'Email is required' }));
      return;
    }
    if (!password) {
      setFieldErrors(prev => ({ ...prev, password: 'Password is required' }));
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user = AppStore.login(email, password);
      setIsLoading(false);

      if (user) {
        setFailedAttempts(0);
        setSuccess('Successfully logged in!');
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
        }, 800);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          const lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins
          setLockoutTime(lockedUntil);
          setFieldErrors({ password: 'Too many failed attempts. Security lock activated (15 mins).' });
        } else {
          setFieldErrors({ password: `Invalid email or password. ${5 - nextAttempts} attempts remaining.` });
        }
      }
    }, 1000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess('');

    let hasErrors = false;
    const errors: { name?: string; email?: string; password?: string } = {};

    if (!name) {
      errors.name = 'Full name is required.';
      hasErrors = true;
    }
    if (!email) {
      errors.email = 'Email address is required.';
      hasErrors = true;
    }
    if (!password) {
      errors.password = 'Password is required.';
      hasErrors = true;
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      hasErrors = true;
    }

    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const user = AppStore.register(name, email, password);
        setIsLoading(false);
        setSuccess('Registration successful! Check your inbox for verification email.');
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setFieldErrors({ email: err.message || 'Registration failed' });
      }
    }, 1200);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess('');

    if (!email) {
      setFieldErrors({ email: 'Please enter your email address.' });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccess('Password reset link has been sent to your email! (Expires in 1 hour)');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="auth-modal-overlay">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-2xl p-6 sm:p-8 animate-scale-up transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          id="auth-modal-close"
        >
          <X size={18} />
        </button>

        {/* Logo/Header */}
        <div className="text-center mb-6">
          <h3 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">
            {tab === 'login' && 'Welcome Back'}
            {tab === 'register' && 'Create Account'}
            {tab === 'forgot' && 'Reset Password'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {tab === 'login' && 'Log in to process and manage your files.'}
            {tab === 'register' && 'Join over 10,000+ professionals using Doculux.'}
            {tab === 'forgot' && "Enter your email and we'll send a recovery link."}
          </p>
        </div>

        {/* Tab Toggle */}
        {tab !== 'forgot' && (
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-6 select-none">
            <button
              onClick={() => { setTab('login'); setFieldErrors({}); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'login' 
                  ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
              id="auth-toggle-login"
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setFieldErrors({}); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'register' 
                  ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
              id="auth-toggle-register"
            >
              <UserPlus size={15} />
              Register
            </button>
          </div>
        )}

        {/* Error/Success Alerts */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/25 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
            {success}
          </div>
        )}

        {/* Form Body */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4" id="login-form">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.email ? 'input-field-error' : ''}`}
              />
              {fieldErrors.email && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {fieldErrors.email}
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.password ? 'input-field-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {fieldErrors.password}
                </div>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember_me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-800 bg-transparent"
              />
              <label htmlFor="remember_me" className="ml-2 text-xs text-gray-600 dark:text-gray-400 font-medium cursor-pointer">
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Quick Demo Credentials Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-900/50 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wide block">Demo Accounts</span>
              <div className="flex justify-between text-[11px] font-mono text-gray-600 dark:text-gray-400">
                <span>Free User: eunicelouisiana37@gmail.com</span>
                <span>pw: password123</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-amber-700 dark:text-amber-400">
                <span>Admin User: admin@yourapp.com</span>
                <span>pw: Admin@Secure2025!</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              id="login-submit"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4" id="register-form">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.name ? 'input-field-error' : ''}`}
              />
              {fieldErrors.name && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {fieldErrors.name}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.email ? 'input-field-error' : ''}`}
              />
              {fieldErrors.email && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {fieldErrors.email}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.password ? 'input-field-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {fieldErrors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              id="register-submit"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4" id="forgot-form">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.email ? 'input-field-error' : ''}`}
              />
              {fieldErrors.email && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setTab('login')}
                className="text-gray-500 hover:text-gray-700 hover:underline"
              >
                Back to Sign In
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              id="forgot-submit"
            >
              {isLoading ? 'Sending Reset Link...' : 'Send Recovery Link'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
