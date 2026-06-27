import React, { useState, useEffect } from 'react';
import { User, Tool, FileRecord, UsageLog, Invoice, SubscriptionPlan } from './types';
import { AppStore } from './lib/store';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import UpgradeModal from './components/UpgradeModal';
import ToolPageLayout from './components/ToolPageLayout';
import { 
  FileText, ArrowRight, Check, Zap, Sparkles, Sliders, Play, Trash2, HelpCircle, ChevronDown, CheckCircle, Search, Info, Settings, ShieldAlert, Edit, UserMinus, ToggleLeft, Activity, RefreshCw, Star, ArrowUpRight, Copy, Share2, Mail, Lock, Trash, ArrowRightLeft, Landmark, Loader2, Upload
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(''); // e.g. '', 'tools', 'pricing', 'tools/merge-pdf'
  const [activeDashboardView, setActiveDashboardView] = useState<string>('overview');
  
  // Auth & Upgrade modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeInitialPlan, setUpgradeInitialPlan] = useState<SubscriptionPlan>('pro');

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('pdf_theme') as 'light' | 'dark') || 'light';
  });

  // Database lists
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [allLogs, setAllLogs] = useState<UsageLog[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [fileRecords, setFileRecords] = useState<FileRecord[]>([]);

  // Search/Filter states
  const [toolSearch, setToolSearch] = useState('');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserFilter, setAdminUserFilter] = useState<string>('all'); // all, pro, business, free, admin

  // Profile Settings states
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsReferralCode, setSettingsReferralCode] = useState('');

  // Landing Page Demo State
  const [landingFile, setLandingFile] = useState<File | null>(null);
  const [landingProgress, setLandingProgress] = useState(0);
  const [landingProcessing, setLandingProcessing] = useState(false);
  const [landingResultReady, setLandingResultReady] = useState(false);

  // Load state and listen to Hash changes
  useEffect(() => {
    // Sync theme on load
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Initialize store & state lists
    AppStore.init();
    setCurrentUser(AppStore.getCurrentUser());
    setAllUsers(AppStore.getUsers());
    setAllTools(AppStore.getTools());
    setAllLogs(AppStore.getLogs());
    setAllInvoices(AppStore.getInvoices());
    setFileRecords(AppStore.getFileRecords());

    // Routing by Hash
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      setCurrentPath(hash);
      
      // Auto-route views inside dashboard/admin based on path
      if (hash.startsWith('dashboard')) {
        const sub = hash.split('/')[1] || 'overview';
        setActiveDashboardView(sub);
      } else if (hash.startsWith('admin')) {
        const sub = hash.split('/')[1] || 'admin-dashboard';
        setActiveDashboardView(sub);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run on mount

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pdf_theme', nextTheme);
  };

  const handleNavigate = (path: string) => {
    window.location.hash = `#/${path}`;
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAllUsers(AppStore.getUsers());
    setAllLogs(AppStore.getLogs());
    setAllInvoices(AppStore.getInvoices());
    setFileRecords(AppStore.getFileRecords());
    
    setSettingsName(user.name);
    setSettingsEmail(user.email);
    
    // Notify
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });

    // Auto-route to dashboard on login
    handleNavigate('dashboard');
  };

  const handleLogout = () => {
    AppStore.logout();
    setCurrentUser(null);
    handleNavigate('');
  };

  const handleUpgradeSuccess = (user: User) => {
    setCurrentUser(user);
    setAllUsers(AppStore.getUsers());
    setAllInvoices(AppStore.getInvoices());
    
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 }
    });
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleShowUpgrade = (plan: SubscriptionPlan = 'pro') => {
    setUpgradeInitialPlan(plan);
    setUpgradeModalOpen(true);
  };

  // Referral State triggers
  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Find referral match
    const users = AppStore.getUsers();
    const referrer = users.find(u => u.referralCode.toUpperCase() === settingsReferralCode.toUpperCase() && u.id !== currentUser.id);
    
    if (referrer) {
      AppStore.applyReferral(referrer.id);
      AppStore.applyReferral(currentUser.id); // Also give current user +1 refer credit!
      
      setCurrentUser(AppStore.getCurrentUser());
      setAllUsers(AppStore.getUsers());
      setSettingsReferralCode('');
      
      confetti({
        particleCount: 60,
        spread: 40,
        origin: { y: 0.8 }
      });
      alert(`Success! Referral applied. You and ${referrer.name} both unlocked +1 extra free tool use per day!`);
    } else {
      alert('Invalid or expired referral code. Please check and try again.');
    }
  };

  // Save Settings State
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const updated = AppStore.updateProfile(currentUser.id, {
        name: settingsName,
        email: settingsEmail
      });
      if (settingsPassword) {
        AppStore.changePassword(currentUser.email, settingsPassword);
        setSettingsPassword('');
      }
      setCurrentUser(updated);
      setAllUsers(AppStore.getUsers());
      alert('Profile settings saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    }
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    if (confirm('Are you absolutely sure you want to permanently delete your account? This action is irreversible.')) {
      AppStore.deleteAccount(currentUser.id, currentUser.email);
      setCurrentUser(null);
      handleNavigate('');
    }
  };

  // Admin: Suspend or Edit Users
  const handleAdminUpdateUserPlan = (userId: string, plan: SubscriptionPlan) => {
    AppStore.updateProfile(userId, { plan });
    setAllUsers(AppStore.getUsers());
  };

  const handleAdminUpdateUserRole = (userId: string, role: 'user' | 'admin') => {
    AppStore.updateProfile(userId, { role });
    setAllUsers(AppStore.getUsers());
  };

  const handleAdminDeleteUser = (userId: string, email: string) => {
    if (confirm(`Delete user ${email} permanently?`)) {
      AppStore.deleteAccount(userId, email);
      setAllUsers(AppStore.getUsers());
    }
  };

  const handleAdminToggleTool = (slug: string, isEnabled: boolean) => {
    AppStore.toggleToolStatus(slug, isEnabled);
    setAllTools(AppStore.getTools());
  };

  const handleAdminUpdateLimit = (slug: string, limit: number) => {
    AppStore.updateToolLimit(slug, limit);
    setAllTools(AppStore.getTools());
  };

  // Landing Page Interactive Demo Handler
  const handleLandingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLandingFile(e.target.files[0]);
      setLandingProcessing(true);
      setLandingProgress(10);
      
      const interval = setInterval(() => {
        setLandingProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + Math.floor(Math.random() * 20 + 5);
        });
      }, 150);

      setTimeout(() => {
        clearInterval(interval);
        setLandingProgress(100);
        setLandingProcessing(false);
        setLandingResultReady(true);
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.6 }
        });
      }, 1200);
    }
  };

  // Helper: Format Dates nicely
  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Active Tool Routing Checker
  const activeTool = allTools.find(t => `tools/${t.slug}` === currentPath);

  // FAQ list for landing & pricing pages
  const faqs = [
    { q: 'Is my data secure on Doculux?', a: 'Yes! Unlike other services, Doculux operates 100% in-browser using advanced client-side libraries. Your files are NEVER uploaded to third-party databases or remote clouds — keeping your documents private and fully encrypted on your local computer.' },
    { q: 'What are the file limits on the free tier?', a: 'Free tier members get up to 3 actions per tool per day with a file limit of 25MB and up to 10 files per batch upload. Pro members enjoy up to 200MB file limits and unlimited daily actions.' },
    { q: 'How does the Referral program work?', a: 'Every person who signs up using your unique referral code grants BOTH you and them +1 extra daily action limit permanently! You can earn up to 10 extra actions daily.' },
    { q: 'Can I cancel my Pro subscription at any time?', a: 'Absolutely! You can manage and cancel your subscriptions seamlessly using our self-serve Stripe Billing portal. There are no locking contracts or penalties.' },
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen text-gray-950 dark:text-gray-50 flex flex-col justify-between transition-colors duration-200 relative overflow-x-hidden" id="main-app-container">
      {/* Mesh Glass Gradient Background */}
      <div className="mesh-bg"></div>
      
      {/* Universal Header */}
      <Header
        currentUser={currentUser}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Page Area */}
      <main className="flex-1">
        {activeTool ? (
          /* Dynamic Active Tool Page Render */
          <ToolPageLayout
            tool={activeTool}
            currentUser={currentUser}
            onShowUpgrade={handleShowUpgrade}
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            onProcessSuccess={() => {
              setAllLogs(AppStore.getLogs());
              setFileRecords(AppStore.getFileRecords());
            }}
          />
        ) : currentPath.startsWith('dashboard') ? (
          /* USER DASHBOARD PAGE CONTAINER */
          currentUser ? (
            <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
              {/* Sidebar */}
              <Sidebar
                currentUser={currentUser}
                activeView={activeDashboardView}
                onSelectView={(v) => handleNavigate(`dashboard/${v}`)}
                onLogout={handleLogout}
                onNavigateHome={() => handleNavigate('')}
              />

              {/* Central Panel Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-24 md:pb-8 text-left bg-gray-50 dark:bg-gray-950/20">
                
                {/* Dashboard View: Overview */}
                {activeDashboardView === 'overview' && (
                  <div className="space-y-6 animate-fade-in" id="dashboard-overview-panel">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl shadow-sm">
                      <div>
                        <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white flex items-center gap-2">
                          Welcome Back, {currentUser.name}!
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          You are currently on the <strong className="text-indigo-600 dark:text-indigo-400 capitalize">{currentUser.plan} Plan</strong>.
                        </p>
                      </div>

                      {currentUser.plan === 'free' ? (
                        <button
                          onClick={() => handleShowUpgrade('pro')}
                          className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm flex items-center gap-1.5 transition-all"
                        >
                          <Zap size={14} />
                          Upgrade to Pro (Unlimited)
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/45 rounded-xl">
                          <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Premium Active</span>
                        </div>
                      )}
                    </div>

                    {/* Usage Progress Cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {allTools.slice(0, 4).map((t) => {
                        const usage = AppStore.getDailyUsageCount(currentUser.id, t.slug);
                        const limit = t.freeLimit + currentUser.referralsCount;
                        const percent = currentUser.plan !== 'free' ? 100 : Math.min(100, (usage / limit) * 100);
                        return (
                          <div key={t.slug} className="glass-card p-4 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.name}</span>
                              <span className="text-xs font-mono font-bold text-gray-400">
                                {currentUser.plan !== 'free' ? 'Unlimited' : `${usage}/${limit}`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${percent >= 100 && currentUser.plan === 'free' ? 'bg-red-500' : 'bg-indigo-600'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 block">Daily usage statistics</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Access Grid */}
                    <div className="space-y-3">
                      <h3 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">Quick-Access Tools</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {allTools.map((t) => (
                          <div 
                            key={t.slug}
                            onClick={() => handleNavigate(`tools/${t.slug}`)}
                            className="p-5 rounded-2xl glass-card glass-card-hover cursor-pointer group"
                          >
                            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 mb-2.5 block">{t.category}</span>
                            <h4 className="font-sans font-bold text-gray-950 dark:text-white group-hover:text-indigo-600 transition-colors">{t.name}</h4>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard View: Recent Files */}
                {activeDashboardView === 'files' && (
                  <div className="space-y-6 animate-fade-in" id="dashboard-files-panel">
                    <div className="flex justify-between items-center">
                      <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Processed Files</h2>
                      {fileRecords.length > 0 && (
                        <button 
                          onClick={() => { AppStore.clearFileRecords(); setFileRecords([]); }} 
                          className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline"
                        >
                          Clear Session Files
                        </button>
                      )}
                    </div>

                    {fileRecords.length === 0 ? (
                      <div className="p-12 text-center glass-card rounded-3xl">
                        <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">No files processed recently</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Upload a document on any tool to see downloadable files listed here. For maximum safety, files are kept for 1 hour.</p>
                        <button 
                          onClick={() => handleNavigate('tools')} 
                          className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                        >
                          Open Tools Catalog
                        </button>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fileRecords.map((rec) => (
                          <div key={rec.id} className="p-4 glass-card rounded-2xl shadow-sm flex flex-col justify-between h-36">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-sans font-bold text-sm text-gray-950 dark:text-white truncate">{rec.name}</h4>
                                <span className="px-1.5 py-0.5 rounded bg-green-50 text-[9px] font-bold text-green-700 capitalize">Success</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">Tool: {rec.tool.replace('-', ' ')}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-900/50 pt-2.5">
                              <span className="text-[10px] font-mono text-gray-400">{(rec.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span className="text-[10px] text-gray-400">{formatDate(rec.timestamp).split(',')[0]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Dashboard View: Usage History */}
                {activeDashboardView === 'history' && (
                  <div className="space-y-6 animate-fade-in" id="dashboard-history-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Usage Logs</h2>
                    
                    <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 uppercase font-bold tracking-wider">
                              <th className="p-4">Timestamp</th>
                              <th className="p-4">Tool</th>
                              <th className="p-4">File Name</th>
                              <th className="p-4">File Size</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                            {allLogs.filter(l => l.userId === currentUser.id).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-xs text-gray-400 font-mono">No usage logged yet.</td>
                              </tr>
                            ) : (
                              allLogs.filter(l => l.userId === currentUser.id).map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                                  <td className="p-4 font-mono text-[11px] text-gray-400">{log.date}</td>
                                  <td className="p-4 font-bold text-gray-900 dark:text-white capitalize">{log.tool.replace('-', ' ')}</td>
                                  <td className="p-4 truncate max-w-[200px] text-gray-600 dark:text-gray-300">{log.fileName}</td>
                                  <td className="p-4 font-mono text-xs">{(log.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                      {log.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard View: Billing & Stripe Simulation */}
                {activeDashboardView === 'billing' && (
                  <div className="space-y-6 animate-fade-in" id="dashboard-billing-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Plan & Billing</h2>

                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Subscription Active Card */}
                      <div className="glass-card p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Current Membership</span>
                          <h3 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white capitalize">
                            {currentUser.plan} Plan
                          </h3>
                          <p className="text-xs text-gray-400 mt-2 max-w-sm">
                            {currentUser.plan === 'free' 
                              ? 'Get up to 3 daily usages per tool. Upgrade to access unlimited storage limits and priority processors.' 
                              : `Your Pro features are activated and safe. Next renewal billing date: ${currentUser.currentPeriodEnd ? formatDate(currentUser.currentPeriodEnd).split(',')[0] : 'N/A'}`
                            }
                          </p>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-50 dark:border-gray-900/50">
                          {currentUser.plan === 'free' ? (
                            <button
                              onClick={() => handleShowUpgrade('pro')}
                              className="w-full py-3 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all text-xs"
                            >
                              Upgrade subscription plan
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm('Cancel your Pro Plan subscription? Your features will deactivate instantly.')) {
                                  const downgraded = AppStore.cancelSubscription(currentUser.id);
                                  setCurrentUser(downgraded);
                                  setAllUsers(AppStore.getUsers());
                                }
                              }}
                              className="w-full py-3 text-center bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all text-xs"
                            >
                              Cancel Active Subscription
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Promo referral link details */}
                      <div className="glass-card p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-1">Need extra uses?</span>
                          <h3 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">
                            Invite & Earn!
                          </h3>
                          <p className="text-xs text-gray-400 mt-2">
                            Invite your friends or team. For every friend who signs up using your code, you both earn an extra +1 daily limit on all 8 tools permanently!
                          </p>
                        </div>
                        <button
                          onClick={() => handleNavigate('dashboard/referrals')}
                          className="mt-8 w-full py-3 text-center border border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                        >
                          <Share2 size={14} />
                          Go to Referrals Dashboard
                        </button>
                      </div>
                    </div>

                    {/* Invoice History */}
                    <div className="space-y-3">
                      <h3 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">Invoice History</h3>
                      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 uppercase font-bold tracking-wider">
                              <th className="p-4">Invoice ID</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Membership Plan</th>
                              <th className="p-4">Amount Paid</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                            {allInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                                <td className="p-4 font-mono text-xs">{inv.id}</td>
                                <td className="p-4 font-mono text-xs text-gray-400">{inv.date}</td>
                                <td className="p-4 font-semibold">{inv.planName}</td>
                                <td className="p-4 font-mono text-xs font-bold text-gray-900 dark:text-white">${inv.amount.toFixed(2)}</td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded bg-green-50 text-[10px] font-bold text-green-700 uppercase">Paid</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard View: Account Settings */}
                {activeDashboardView === 'settings' && (
                  <div className="space-y-6 animate-fade-in" id="dashboard-settings-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Account Settings</h2>

                    <div className="max-w-xl glass-card p-6 rounded-3xl shadow-sm">
                      <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                          <input
                            type="text"
                            value={settingsName}
                            onChange={(e) => setSettingsName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                          <input
                            type="email"
                            value={settingsEmail}
                            onChange={(e) => setSettingsEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Update Password (Optional)</label>
                          <input
                            type="password"
                            value={settingsPassword}
                            onChange={(e) => setSettingsPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all"
                        >
                          Save Changes
                        </button>
                      </form>

                      <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-900/50 space-y-3">
                        <h4 className="font-sans font-extrabold text-sm text-red-600">Danger Zone</h4>
                        <p className="text-xs text-gray-400">Permanently delete your Doculux account, files logs, and passwords. This cannot be undone.</p>
                        <button
                          onClick={handleDeleteAccount}
                          className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors"
                        >
                          Delete Doculux Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard View: Referrals */}
                {activeDashboardView === 'referrals' && (
                  <div className="space-y-6 animate-fade-in" id="dashboard-referrals-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Referrals</h2>

                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Refer & Earn Panel */}
                      <div className="glass-card p-6 rounded-3xl space-y-4">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Invite Code</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`https://docucraft.app?ref=${currentUser.referralCode}`}
                            className="flex-1 px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-xs font-mono rounded-xl border border-gray-100 dark:border-gray-900/40 select-all"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://docucraft.app?ref=${currentUser.referralCode}`);
                              alert('Referral link copied to clipboard!');
                            }}
                            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition-colors"
                            title="Copy Code Link"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>• Share your custom invite link with colleagues.</p>
                          <p>• Your referral count is currently: <strong>{currentUser.referralsCount} users</strong>.</p>
                          <p>• Your permanent daily limit bonus: <strong>+{currentUser.referralsCount} actions/day</strong>!</p>
                        </div>
                      </div>

                      {/* Apply Friend's Referral Code */}
                      <div className="glass-card p-6 rounded-3xl space-y-4">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Apply Referral</span>
                        <form onSubmit={handleApplyReferral} className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Enter Code (e.g. ALEX101)"
                            value={settingsReferralCode}
                            onChange={(e) => setSettingsReferralCode(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                          >
                            Apply
                          </button>
                        </form>
                        <p className="text-xs text-gray-400">Have a friend’s code? Apply it above and BOTH of you will instantly unlock +1 daily actions on Doculux permanently!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Redirect/Login trigger if accessed without being logged in */
            <div className="p-12 text-center max-w-md mx-auto my-12 bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl">
              <ShieldAlert size={48} className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white">Sign In Required</h2>
              <p className="text-xs text-gray-400 mt-2">Please login or create a free account to access your personal dashboard and history tracking.</p>
              <button
                onClick={() => handleOpenAuth('login')}
                className="mt-6 px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-500 shadow-md"
              >
                Sign In Now
              </button>
            </div>
          )
        ) : currentPath.startsWith('admin') ? (
          /* SYSTEM ADMIN PORTAL CONTAINER */
          currentUser?.role === 'admin' ? (
            <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
              {/* Sidebar */}
              <Sidebar
                currentUser={currentUser}
                activeView={activeDashboardView}
                onSelectView={(v) => handleNavigate(`admin/${v}`)}
                onLogout={handleLogout}
                onNavigateHome={() => handleNavigate('')}
                isAdminMode={true}
              />

              {/* Central Panel Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-24 md:pb-8 text-left bg-gray-50 dark:bg-gray-950/20">
                
                {/* Admin: KPI Dashboard */}
                {activeDashboardView === 'admin-dashboard' && (
                  <div className="space-y-6 animate-fade-in" id="admin-kpi-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Platform KPI Dashboard</h2>

                    {/* Stat indicators */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-5 glass-card rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Registered Users</span>
                        <span className="text-3xl font-extrabold text-gray-950 dark:text-white mt-1.5 block">{allUsers.length * 342}</span>
                        <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">↑ 14% this month</span>
                      </div>
                      <div className="p-5 glass-card rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Daily Active Users (DAU)</span>
                        <span className="text-3xl font-extrabold text-gray-950 dark:text-white mt-1.5 block">{Math.floor(allUsers.length * 115.4)}</span>
                        <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">↑ 8% today</span>
                      </div>
                      <div className="p-5 glass-card rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Platform MRR</span>
                        <span className="text-3xl font-extrabold text-gray-950 dark:text-white mt-1.5 block">$8,495.20</span>
                        <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">↑ $430 since yesterday</span>
                      </div>
                      <div className="p-5 glass-card rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Free to Pro Conversion</span>
                        <span className="text-3xl font-extrabold text-gray-950 dark:text-white mt-1.5 block">6.42%</span>
                        <span className="text-[10px] text-gray-400 mt-1 block font-mono">Industry avg: 2.1%</span>
                      </div>
                    </div>

                    {/* Tool usage Heatmap */}
                    <div className="space-y-3">
                      <h3 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">Tool Popularity Heatmap</h3>
                      <div className="glass-card p-6 rounded-3xl shadow-sm space-y-3">
                        {allTools.map((t) => {
                          const usages = Math.floor(Math.random() * 400 + 150);
                          const pct = (usages / 550) * 100;
                          return (
                            <div key={t.slug} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-gray-900 dark:text-white">{t.name}</span>
                                <span className="font-mono text-gray-400">{usages} actions / today</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin: Users Management */}
                {activeDashboardView === 'admin-users' && (
                  <div className="space-y-6 animate-fade-in" id="admin-users-panel">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Users Database</h2>
                      
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search email/name..."
                            value={adminUserSearch}
                            onChange={(e) => setAdminUserSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-950/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <select
                          value={adminUserFilter}
                          onChange={(e) => setAdminUserFilter(e.target.value)}
                          className="px-3 py-2 text-xs bg-white/40 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl"
                        >
                          <option value="all">All Plans</option>
                          <option value="free">Free Plan</option>
                          <option value="pro">Pro Plan</option>
                          <option value="business">Business Plan</option>
                        </select>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 uppercase font-bold tracking-wider">
                              <th className="p-4">User</th>
                              <th className="p-4">Email Address</th>
                              <th className="p-4">Membership Plan</th>
                              <th className="p-4">Role</th>
                              <th className="p-4">Referrals</th>
                              <th className="p-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                            {allUsers
                              .filter(u => {
                                const matchesSearch = u.name.toLowerCase().includes(adminUserSearch.toLowerCase()) || u.email.toLowerCase().includes(adminUserSearch.toLowerCase());
                                if (adminUserFilter === 'all') return matchesSearch;
                                return matchesSearch && u.plan === adminUserFilter;
                              })
                              .map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                                  <td className="p-4 font-bold text-gray-950 dark:text-white">{u.name}</td>
                                  <td className="p-4 font-mono text-xs">{u.email}</td>
                                  <td className="p-4">
                                    <select
                                      value={u.plan}
                                      onChange={(e) => handleAdminUpdateUserPlan(u.id, e.target.value as any)}
                                      className="text-xs bg-transparent border border-gray-200 dark:border-gray-850 p-1 rounded font-bold uppercase text-indigo-600 dark:text-indigo-400"
                                    >
                                      <option value="free">Free</option>
                                      <option value="pro">Pro</option>
                                      <option value="business">Business</option>
                                    </select>
                                  </td>
                                  <td className="p-4">
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleAdminUpdateUserRole(u.id, e.target.value as any)}
                                      className="text-xs bg-transparent border border-gray-200 dark:border-gray-850 p-1 rounded font-mono uppercase text-gray-600 dark:text-gray-300"
                                    >
                                      <option value="user">User</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </td>
                                  <td className="p-4 font-mono text-xs">{u.referralsCount} users</td>
                                  <td className="p-4">
                                    <div className="flex gap-1.5">
                                      {u.id !== currentUser.id && (
                                        <>
                                          <button
                                            onClick={() => {
                                              localStorage.setItem('pdf_current_user_id', u.id);
                                              setCurrentUser(u);
                                              handleNavigate('dashboard');
                                              alert(`Impersonating user "${u.name}". Accessing client-side workspace logs...`);
                                            }}
                                            className="px-2 py-1 text-[10px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-200"
                                          >
                                            Impersonate
                                          </button>
                                          <button
                                            onClick={() => handleAdminDeleteUser(u.id, u.email)}
                                            className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-700 rounded border border-red-200"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin: Active Subscriptions */}
                {activeDashboardView === 'admin-subscriptions' && (
                  <div className="space-y-6 animate-fade-in" id="admin-subs-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Active Subscriptions</h2>
                    <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 uppercase font-bold tracking-wider">
                            <th className="p-4">Subscription ID</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Billing Plan</th>
                            <th className="p-4">Period Expiration</th>
                            <th className="p-4">Action Override</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                          {allUsers.filter(u => u.stripeSubscriptionId).map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                              <td className="p-4 font-mono text-xs">{u.stripeSubscriptionId}</td>
                              <td className="p-4 font-semibold">{u.name}</td>
                              <td className="p-4 capitalize text-indigo-600 font-bold">{u.plan} plan</td>
                              <td className="p-4 font-mono text-xs text-gray-400">{u.currentPeriodEnd ? formatDate(u.currentPeriodEnd).split(',')[0] : 'N/A'}</td>
                              <td className="p-4">
                                <button
                                  onClick={() => {
                                    if (confirm(`Manually revoke and cancel plan for ${u.name}?`)) {
                                      AppStore.cancelSubscription(u.id);
                                      setAllUsers(AppStore.getUsers());
                                    }
                                  }}
                                  className="px-2 py-1 text-[10px] bg-red-50 text-red-600 rounded font-semibold border border-red-200"
                                >
                                  Force Cancel
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Admin: Tools Configuration */}
                {activeDashboardView === 'admin-tools' && (
                  <div className="space-y-6 animate-fade-in" id="admin-tools-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Tools Global Toggles</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {allTools.map((t) => (
                        <div key={t.slug} className="p-5 glass-card rounded-2xl shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">{t.category} Group</span>
                            <h4 className="font-sans font-bold text-gray-950 dark:text-white text-base">{t.name}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-gray-400">Daily limit:</span>
                              <input
                                type="number"
                                value={t.freeLimit}
                                onChange={(e) => handleAdminUpdateLimit(t.slug, Math.max(1, Number(e.target.value)))}
                                className="w-12 px-1 py-0.5 bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-800 rounded font-mono text-xs font-bold text-center"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase ${t.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                              {t.isEnabled ? 'Active' : 'Maintenance'}
                            </span>
                            <button
                              onClick={() => handleAdminToggleTool(t.slug, !t.isEnabled)}
                              className={`p-2 rounded-xl border transition-all ${
                                t.isEnabled 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              <ToggleLeft size={18} className={t.isEnabled ? 'rotate-180 transition-all' : 'transition-all'} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin: Global Content settings */}
                {activeDashboardView === 'admin-settings' && (
                  <div className="space-y-6 animate-fade-in" id="admin-settings-panel">
                    <h2 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white">Global CMS Settings</h2>
                    
                    <div className="max-w-xl glass-card p-6 rounded-3xl shadow-sm space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Platform Support Contact</label>
                        <input
                          type="text"
                          defaultValue="support@doculux.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Announcement Banner Text</label>
                        <input
                          type="text"
                          defaultValue="🎉 Welcome to Doculux v4. Now running fully client-side!"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        onClick={() => alert('CMS Configurations updated globally.')}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all"
                      >
                        Save Configurations
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Admin Gate Error display */
            <div className="p-12 text-center max-w-md mx-auto my-12 bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl">
              <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white">Access Denied (403)</h2>
              <p className="text-xs text-gray-400 mt-2">Only platform administrators can view this screen. If you are an administrator, please log in with your credentials.</p>
              <button
                onClick={() => handleOpenAuth('login')}
                className="mt-6 px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-500 shadow-md animate-pulse"
              >
                Log In as Admin
              </button>
            </div>
          )
        ) : currentPath === 'tools' ? (
          /* TOOLS INDEX CATALOG DIRECTORY PAGE */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center animate-fade-in" id="tools-catalog-page">
            <div className="mb-10 space-y-3">
              <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-gray-900 dark:text-white">
                Core Document Catalog
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                Discover our curated suite of browser-based tools. Clean layouts, secure encryption, and zero server upload delays.
              </p>
              
              {/* Search input catalog */}
              <div className="relative max-w-md mx-auto pt-4">
                <Search size={16} className="absolute left-3.5 top-7 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tool (e.g. merge, compress, split)..."
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-gray-800/50 bg-white/40 dark:bg-gray-950/40 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allTools
                .filter(t => t.name.toLowerCase().includes(toolSearch.toLowerCase()) || t.description.toLowerCase().includes(toolSearch.toLowerCase()))
                .map((t) => (
                  <div
                    key={t.slug}
                    onClick={() => handleNavigate(`tools/${t.slug}`)}
                    className="glass-card glass-card-hover p-6 rounded-3xl cursor-pointer text-left flex flex-col justify-between group"
                  >
                    <div>
                      <span className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-4">{t.category} TOOL</span>
                      <h3 className="font-sans font-extrabold text-lg text-gray-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-3">{t.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-900/40 pt-4 mt-6">
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/30 font-bold py-0.5 px-2 rounded-full uppercase tracking-wide">Ready</span>
                      <ArrowRight size={14} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : currentPath === 'pricing' ? (
          /* PRICING PLANS COMPREHENSIVE VIEW PAGE */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center animate-fade-in" id="pricing-page">
            <div className="mb-12 space-y-3">
              <h1 className="font-sans font-extrabold text-3.5xl sm:text-4.5xl text-gray-900 dark:text-white">
                Simple, High-Value Plans
              </h1>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No surprises. Start with 3 free actions daily, or unlock unlimited premium processing.
              </p>
            </div>

            {/* Standard Pricing Grid layout */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
              
              {/* Free Tier card */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col justify-between text-left">
                <div>
                  <h3 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">Free Plan</h3>
                  <p className="text-xs text-gray-400 mt-1">Perfect for casual, emergency conversions.</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-gray-950 dark:text-white">$0</span>
                    <span className="text-xs text-gray-400">/ forever</span>
                  </div>
                  <ul className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> 3 free actions daily</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Max 25MB file sizes</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Max 10 files per batch</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Safe Client-side conversions</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleOpenAuth('register')} 
                  className="mt-8 w-full py-3 border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 rounded-xl text-xs font-bold text-center text-gray-700 dark:text-gray-300 transition-all"
                >
                  Start For Free
                </button>
              </div>

              {/* Pro Tier card */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl border-2 border-indigo-600/80 shadow-xl flex flex-col justify-between text-left relative">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 py-1 px-3 bg-indigo-600 text-[10px] font-bold tracking-wider text-white uppercase rounded-full">
                  Most Popular
                </span>
                <div>
                  <h3 className="font-sans font-extrabold text-lg text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    Pro Plan
                    <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">High-speeds and priority processing daily.</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-gray-950 dark:text-white">$9.99</span>
                    <span className="text-xs text-gray-400">/ month</span>
                  </div>
                  <ul className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> <strong>Unlimited actions</strong> daily</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Max <strong>200MB file sizes</strong></li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Max 50 files per batch</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> High-speed servers queue</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleShowUpgrade('pro')} 
                  className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold text-center shadow-md transition-all"
                >
                  Upgrade to Pro Plan
                </button>
              </div>

              {/* Business / Team card */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col justify-between text-left">
                <div>
                  <h3 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">Business Plan</h3>
                  <p className="text-xs text-gray-400 mt-1">Multi-seat team control and APIs.</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-gray-950 dark:text-white">$24.99</span>
                    <span className="text-xs text-gray-400">/ month</span>
                  </div>
                  <ul className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Everything in Pro Plan</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> <strong>Up to 5 team seats</strong></li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Global Developer API Token</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Premium 24/7 priority support</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleShowUpgrade('business')} 
                  className="mt-8 w-full py-3 border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 rounded-xl text-xs font-bold text-center text-gray-700 dark:text-gray-300 transition-all"
                >
                  Get Business Plan
                </button>
              </div>
            </div>

            {/* General FAQs on pricing page */}
            <div className="max-w-3xl mx-auto space-y-4 text-left">
              <h3 className="font-sans font-extrabold text-xl text-gray-900 dark:text-white mb-6 text-center">Frequently Asked Questions</h3>
              {faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-gray-100 dark:border-gray-900 pb-3">
                  <button 
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="flex justify-between items-center w-full py-2.5 font-sans font-bold text-sm text-gray-900 dark:text-white hover:text-indigo-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={14} className={`text-gray-400 transform transition-transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaqIndex === idx && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed pl-1">{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* HOMEPAGE (/) LANDING PAGE */
          <div className="animate-fade-in" id="landing-home-page">
            
            {/* Announcement Banner */}
            <div className="bg-indigo-600 text-white text-center py-2 px-4 text-xs font-semibold select-none">
              🚀 Announcement: Doculux v4 is now 100% serverless client-side secured. Your documents never leave your browser!
            </div>

            {/* Hero area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center space-y-8 select-none">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 py-1 px-3.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={12} className="animate-pulse" />
                  Browser-Based Processing Engine
                </div>
                <h1 className="font-display font-extrabold text-4xl sm:text-5.5xl lg:text-6.5xl text-gray-900 dark:text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
                  The Premium, Secured <span className="text-indigo-600 dark:text-indigo-400">PDF & Image</span> Suite
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                  Doculux runs fast rendering directly in your browser. No slow cloud uploads, no privacy threats — just robust, instant document modifications.
                </p>
              </div>

              {/* Instant Hero File Dropper Interactive Demo (WOW FACTOR) */}
              <div className="max-w-lg mx-auto glass-card p-6 rounded-3xl shadow-xl space-y-4">
                <div className="text-left mb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Instant Playground Test</span>
                  <h4 className="font-sans font-bold text-sm text-gray-950 dark:text-white mt-0.5">Test Document Converted Instantly</h4>
                </div>

                {!landingResultReady ? (
                  <div 
                    onClick={() => document.getElementById('hero-test-uploader')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] transition-all ${
                      landingProcessing 
                        ? 'bg-indigo-50/10 border-indigo-600' 
                        : 'border-gray-200/50 dark:border-gray-800/50 hover:border-indigo-500'
                    }`}
                  >
                    <input
                      type="file"
                      id="hero-test-uploader"
                      onChange={handleLandingFileSelect}
                      className="hidden"
                    />
                    
                    {landingProcessing ? (
                      <div className="space-y-2 w-full max-w-[240px]">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin text-indigo-600" />
                          <span className="text-xs font-semibold">Local Conversion Processing...</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${landingProgress}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-gray-400">{landingProgress}% Done</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-indigo-600 mb-2" />
                        <h5 className="font-sans font-bold text-xs">Drag any file to experience the speed!</h5>
                        <p className="text-[9px] text-gray-400 mt-1">Accepts PDFs or Images. Safe client-side trial.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border border-green-200 bg-green-50/20 rounded-2xl text-center space-y-3">
                    <div className="w-10 h-10 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center rounded-full mx-auto">
                      <CheckCircle size={20} className="stroke-[2.5]" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold">Conversion trial completed successfully!</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{landingFile?.name} has been processed inside your browser sandbox.</p>
                    </div>
                    <button
                      onClick={() => {
                        setLandingFile(null);
                        setLandingResultReady(false);
                      }}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      Try Another Conversion
                    </button>
                  </div>
                )}
              </div>

              {/* Trust badges stat line */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400 font-mono text-xs pt-4">
                <span>🟢 4.2M+ CONVERSIONS ACTIVE</span>
                <span>•</span>
                <span>🟢 100% ENCRYPTED CLIENT ENGINE</span>
                <span>•</span>
                <span>🟢 24/7 SLACK UPTIME</span>
              </div>
            </div>

            {/* Tools catalog directory grid */}
            <div className="border-y border-gray-100/40 dark:border-gray-900/40 py-16 select-none">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
                <div className="space-y-2">
                  <h2 className="font-sans font-extrabold text-2.5xl sm:text-3xl text-gray-900 dark:text-white">
                    Select Your Utility Tool
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                    Choose from our 8 high-performance tools and start editing with unlimited bandwidth today.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {allTools.map((t) => (
                    <div
                      key={t.slug}
                      onClick={() => handleNavigate(`tools/${t.slug}`)}
                      className="glass-card glass-card-hover cursor-pointer text-left transition-all duration-300 group flex flex-col justify-between min-h-[150px] p-5"
                    >
                      <div>
                        <span className="text-[9px] font-bold font-mono text-indigo-600 uppercase tracking-widest block mb-2">{t.category}</span>
                        <h4 className="font-sans font-extrabold text-sm text-gray-950 dark:text-white group-hover:text-indigo-600 transition-colors">{t.name}</h4>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 mt-4">
                        Open tool
                        <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comprehensive Pricing details card */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 select-none">
              <div className="text-center mb-12 space-y-2">
                <h2 className="font-sans font-extrabold text-2.5xl sm:text-3.5xl text-gray-900 dark:text-white">
                  Designed for Teams & Individuals
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                  Simple membership models. No locking contracts, cancellable in one click.
                </p>
              </div>

              {/* Double pricing plan toggle shortcut */}
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Pro card */}
                <div className="glass-card p-6 sm:p-8 rounded-3xl border-2 border-indigo-600/80 shadow-xl text-left flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans font-bold text-lg text-indigo-600 flex items-center gap-1">
                      Pro Premium
                      <Sparkles size={14} className="animate-pulse" />
                    </h3>
                    <div className="my-4">
                      <span className="text-3xl font-extrabold text-gray-950 dark:text-white">$9.99</span>
                      <span className="text-xs text-gray-400">/ month</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                      <li className="flex items-center gap-2"><Check size={12} className="text-indigo-600" /> Unlimited daily usage</li>
                      <li className="flex items-center gap-2"><Check size={12} className="text-indigo-600" /> Up to 200MB file uploads</li>
                      <li className="flex items-center gap-2"><Check size={12} className="text-indigo-600" /> High-speed processors priority</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleShowUpgrade('pro')}
                    className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold text-center animate-pulse"
                  >
                    Get Pro Access
                  </button>
                </div>

                {/* Free plan */}
                <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-sm text-left flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans font-bold text-lg text-gray-900 dark:text-white">Free Access</h3>
                    <div className="my-4">
                      <span className="text-3xl font-extrabold text-gray-950 dark:text-white">$0</span>
                      <span className="text-xs text-gray-400">/ forever</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                      <li className="flex items-center gap-2"><Check size={12} className="text-indigo-600" /> 3 actions per tool daily</li>
                      <li className="flex items-center gap-2"><Check size={12} className="text-indigo-600" /> Up to 25MB file size limit</li>
                      <li className="flex items-center gap-2"><Check size={12} className="text-indigo-600" /> Safe local client conversions</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleOpenAuth('register')}
                    className="mt-6 w-full py-3 border border-gray-200/50 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold text-center"
                  >
                    Start Converting
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pricing / Auth Trigger modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        onLoginSuccess={handleLoginSuccess}
      />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentUser={currentUser}
        onUpgradeSuccess={handleUpgradeSuccess}
        onOpenAuth={handleOpenAuth}
        initialPlanSelection={upgradeInitialPlan}
      />

      {/* Universal Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-900 py-8 bg-gray-50/50 dark:bg-gray-950 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-indigo-600 text-white text-xs">
              <FileText size={14} />
            </div>
            <span className="font-sans font-bold text-sm tracking-tight text-gray-900 dark:text-white">
              Doculux
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            <button onClick={() => handleNavigate('')} className="hover:text-indigo-600">Home</button>
            <span>•</span>
            <button onClick={() => handleNavigate('tools')} className="hover:text-indigo-600">Tools Catalog</button>
            <span>•</span>
            <button onClick={() => handleNavigate('pricing')} className="hover:text-indigo-600">Pricing Tiers</button>
            <span>•</span>
            <a href="mailto:support@doculux.com" className="hover:text-indigo-600">Contact Support</a>
          </div>

          <p className="text-[10px] text-gray-400 font-mono">
            © 2026 Doculux, Inc. • SSL Encrypted Browser Sandbox
          </p>
        </div>
      </footer>
    </div>
  );
}
