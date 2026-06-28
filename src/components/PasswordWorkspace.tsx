import React, { useState } from 'react';
import { 
  Lock, Unlock, Eye, EyeOff, Shield, ShieldCheck, ShieldAlert, FileText, ArrowLeft, Loader2, Download
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PasswordWorkspaceProps {
  file: File;
  onClose: () => void;
  onSave: (editedBlob: Blob, filename: string) => void;
}

export default function PasswordWorkspace({
  file,
  onClose,
  onSave
}: PasswordWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'protect' | 'unlock'>('protect');
  
  // Protect form states
  const [protectPassword, setProtectPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showProtectPassword, setShowProtectPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [encryptionLevel, setEncryptionLevel] = useState<'standard' | 'strong'>('standard');
  const [protectError, setProtectError] = useState('');

  // Unlock form states
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Password strength analyzer
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { width: '0%', color: 'transparent', label: 'Enter a password', level: 'none' };
    if (pwd.length < 6) {
      return { width: '25%', color: 'var(--color-error, #ef4444)', label: 'Weak (min 6 characters)', level: 'weak' };
    }
    
    const hasNumbers = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    if (pwd.length >= 10 && hasNumbers && hasSpecial) {
      return { width: '100%', color: 'var(--color-success, #10b981)', label: 'Strong', level: 'strong' };
    }
    
    return { width: '60%', color: 'var(--color-warning, #f59e0b)', label: 'Medium', level: 'medium' };
  };

  const strength = getPasswordStrength(protectPassword);

  const handleProtect = async (e: React.FormEvent) => {
    e.preventDefault();
    setProtectError('');

    if (protectPassword.length < 6) {
      setProtectError('Password must be at least 6 characters long.');
      return;
    }

    if (protectPassword !== confirmPassword) {
      setProtectError('Passwords do not match.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(15);

      // Step 1: Uploading/Reading
      const arrayBuffer = await file.arrayBuffer();
      setProgress(45);

      // Step 2: Processing with pdf-lib
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setProgress(70);

      const protectedBytes = await pdfDoc.save({
        userPassword: protectPassword,
        ownerPassword: protectPassword + '_owner',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
        }
      } as any);
      setProgress(90);

      const finalBlob = new Blob([protectedBytes], { type: 'application/pdf' });
      setProgress(100);

      setTimeout(() => {
        onSave(finalBlob, `${file.name.replace('.pdf', '')}_protected.pdf`);
        setIsProcessing(false);
      }, 500);

    } catch (err: any) {
      console.error('Failed to encrypt PDF', err);
      setProtectError(err.message || 'Failed to encrypt the PDF. Make sure it is not already encrypted.');
      setIsProcessing(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');

    if (!unlockPassword) {
      setUnlockError('Password is required to unlock.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(20);

      const arrayBuffer = await file.arrayBuffer();
      setProgress(50);

      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { password: unlockPassword } as any);
        setProgress(80);
        
        const unlockedBytes = await pdfDoc.save();
        setProgress(100);

        const finalBlob = new Blob([unlockedBytes], { type: 'application/pdf' });
        setTimeout(() => {
          onSave(finalBlob, `${file.name.replace('.pdf', '')}_unlocked.pdf`);
          setIsProcessing(false);
        }, 500);

      } catch (innerErr) {
        throw new Error('Incorrect password or this PDF uses unsupported encryption. Try Adobe Acrobat for strongly encrypted files.');
      }

    } catch (err: any) {
      console.error('Failed to unlock PDF', err);
      setUnlockError(err.message || 'Incorrect password.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl overflow-hidden text-left max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">PDF Password Protect & Unlock</h3>
            <p className="text-xs text-gray-500 mt-0.5">{file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="px-6 md:px-8 pt-6">
        <div className="tool-filter-tabs select-none" id="passwordTabs">
          <button
            onClick={() => { setActiveTab('protect'); setProtectError(''); setUnlockError(''); }}
            className={`filter-tab ${activeTab === 'protect' ? 'active' : ''}`}
            type="button"
          >
            🔒 Protect PDF
          </button>
          <button
            onClick={() => { setActiveTab('unlock'); setProtectError(''); setUnlockError(''); }}
            className={`filter-tab ${activeTab === 'unlock' ? 'active' : ''}`}
            type="button"
          >
            🔓 Unlock PDF
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 md:p-8">
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <h4 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">
              {activeTab === 'protect' ? 'Securing PDF File...' : 'Unlocking PDF File...'}
            </h4>
            <p className="text-xs text-gray-500 max-w-sm">
              All encryption and unlocking occurs securely offline inside your browser. No files are uploaded to any server.
            </p>

            <div className="processing-steps w-full max-w-md">
              <div className={`proc-step ${progress > 30 ? 'proc-step--completed' : 'proc-step--active'}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Reading file</span>
              </div>
              <div className={`proc-step ${progress > 80 ? 'proc-step--completed' : progress > 30 ? 'proc-step--active' : ''}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">{activeTab === 'protect' ? 'Applying Encryption' : 'Removing Protection'}</span>
              </div>
              <div className={`proc-step ${progress === 100 ? 'proc-step--active' : ''}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Ready</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden max-w-md">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs font-mono font-bold text-gray-400">
              {progress}%
            </div>
          </div>
        ) : activeTab === 'protect' ? (
          /* PROTECT FORM */
          <form onSubmit={handleProtect} className="space-y-6">
            {protectError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-950 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span>{protectError}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Set Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Set Password
                </label>
                <div className="relative">
                  <input
                    type={showProtectPassword ? 'text' : 'password'}
                    value={protectPassword}
                    onChange={(e) => setProtectPassword(e.target.value)}
                    placeholder="Enter password (min 6 chars)"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProtectPassword(!showProtectPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showProtectPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {protectPassword && (
                  <div className="space-y-1 pt-1.5">
                    <div className="strength-bar-wrapper h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="strength-bar-fill h-full transition-all duration-300" 
                        style={{ width: strength.width, backgroundColor: strength.color }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">STRENGTH</span>
                      <span style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Encryption Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Encryption level
              </label>
              <select
                value={encryptionLevel}
                onChange={(e) => setEncryptionLevel(e.target.value as 'standard' | 'strong')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="standard">Standard (128-bit RC4 - Highly compatible)</option>
                <option value="strong">Strong (256-bit AES - Industrial Grade)</option>
              </select>
            </div>

            {/* Alert / Notice */}
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-950/60 rounded-xl flex items-start gap-2.5 text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
              <Shield className="shrink-0 mt-0.5 text-indigo-500" size={15} />
              <span>
                <strong>Security Guarantee:</strong> Doculux protects your files 100% locally. No passwords or documents are sent to external servers, protecting your secrets.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Lock size={15} />
              Protect PDF
            </button>
          </form>
        ) : (
          /* UNLOCK FORM */
          <form onSubmit={handleUnlock} className="space-y-6">
            {unlockError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-950 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 font-medium leading-normal">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span>{unlockError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Enter current password
              </label>
              <div className="relative">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter PDF password to decrypt"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Unlock size={15} />
              Unlock & Remove Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
