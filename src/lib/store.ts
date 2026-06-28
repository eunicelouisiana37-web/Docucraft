import { User, Tool, FileRecord, UsageLog, Invoice, SubscriptionPlan } from '../types';

// Default Tools
const DEFAULT_TOOLS: Tool[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    slug: 'merge-pdf',
    description: 'Combine multiple PDF files into one single document in seconds. Drag, drop, and reorder.',
    icon: 'FilePlus2',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    slug: 'split-pdf',
    description: 'Split PDF files by specific page ranges, extract single pages, or split every N pages.',
    icon: 'Scissors',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    slug: 'compress-pdf',
    description: 'Reduce PDF file size while keeping optimal visual quality. Low, medium, or high compression levels.',
    icon: 'Minimize2',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    slug: 'pdf-to-image',
    description: 'Convert PDF pages into high-quality JPG or PNG images. Choose 72, 150, or 300 DPI.',
    icon: 'FileImage',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    slug: 'image-to-pdf',
    description: 'Convert JPG, PNG, WebP images to PDF. Set custom page size, margins, and page orientation.',
    icon: 'ImagePlus',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    slug: 'pdf-to-word',
    description: 'Convert your PDF files to editable DOCX documents with precise layout preservation.',
    icon: 'FileText',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    slug: 'word-to-pdf',
    description: 'Convert Microsoft Word DOC and DOCX documents to clean, web-optimized PDF files.',
    icon: 'FileInput',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'image-converter',
    name: 'Image Converter',
    slug: 'image-converter',
    description: 'Convert images between JPG, PNG, WebP, GIF, BMP, and TIFF formats. Adjust compression quality.',
    icon: 'RefreshCw',
    isPdf: false,
    isEnabled: true,
    freeLimit: 3,
    category: 'Image'
  },
  {
    id: 'edit-pdf',
    name: 'Edit PDF',
    slug: 'edit-pdf',
    description: 'Add text annotations, draw sketches, insert shapes, place signatures, and manage pages in your PDF document.',
    icon: 'Edit',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    slug: 'pdf-to-excel',
    description: 'Extract tables and data from PDF documents into editable Excel spreadsheets.',
    icon: 'FileSpreadsheet',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    slug: 'watermark-pdf',
    description: 'Add image or text watermarks to your PDF pages with custom transparency and position.',
    icon: 'Stamp',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    slug: 'ocr-pdf',
    description: 'Convert scanned PDF documents or images into fully searchable, editable PDF files.',
    icon: 'ScanText',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'ai-chat',
    name: 'AI Chat PDF',
    slug: 'ai-chat',
    description: 'Upload any PDF and have a conversation with it. Ask questions, get summaries, extract key clauses.',
    icon: 'MessageSquare',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'sign-pdf',
    name: 'Sign PDF (E-Sign)',
    slug: 'sign-pdf',
    description: 'E-Sign your documents online securely. Create signatures, sign with initials, and track audit trails.',
    icon: 'Signature',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'rotate-reorder',
    name: 'Rotate & Reorder Pages',
    slug: 'rotate-reorder',
    description: 'Drag pages into order, rotate individually, or delete pages. Fast local client-side PDF editing.',
    icon: 'RotateCw',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'pdf-password',
    name: 'Protect & Unlock PDF',
    slug: 'pdf-password',
    description: 'Encrypt your PDF with a strong password or unlock protected files securely in your browser.',
    icon: 'Lock',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  },
  {
    id: 'page-numbers',
    name: 'Add Page Numbers',
    slug: 'page-numbers',
    description: 'Stamp professional page numbers on every page. Choose position, format, font size, and starting number.',
    icon: 'Binary',
    isPdf: true,
    isEnabled: true,
    freeLimit: 3,
    category: 'PDF'
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'System Admin',
    email: 'admin@yourapp.com',
    role: 'admin',
    plan: 'business',
    referralCode: 'ADMIN50',
    referralsCount: 42
  },
  {
    id: 'usr_premium',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    role: 'user',
    plan: 'pro',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000 * 25).toISOString(),
    referralCode: 'ALEX101',
    referralsCount: 3
  },
  {
    id: 'usr_free',
    name: 'Eunice Louisiana',
    email: 'eunicelouisiana37@gmail.com',
    role: 'user',
    plan: 'free',
    referralCode: 'EUNICE22',
    referralsCount: 0
  }
];

const PRE_POPULATED_LOGS: UsageLog[] = [
  { id: 'log_1', userId: 'usr_premium', tool: 'merge-pdf', date: new Date().toISOString().split('T')[0], fileName: 'Q4_Report_Merged.pdf', fileSize: 12450000, status: 'success' },
  { id: 'log_2', userId: 'usr_premium', tool: 'compress-pdf', date: new Date().toISOString().split('T')[0], fileName: 'Portfolio_compressed.pdf', fileSize: 45000000, status: 'success' },
  { id: 'log_3', userId: 'usr_free', tool: 'image-converter', date: new Date().toISOString().split('T')[0], fileName: 'avatar.png', fileSize: 450000, status: 'success' },
  { id: 'log_4', userId: 'usr_free', tool: 'split-pdf', date: new Date().toISOString().split('T')[0], fileName: 'Chapter3_Extract.pdf', fileSize: 2100000, status: 'success' },
  { id: 'log_5', userId: 'usr_premium', tool: 'pdf-to-image', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], fileName: 'Slides_Page_1.jpg', fileSize: 320000, status: 'success' }
];

const PRE_POPULATED_INVOICES: Invoice[] = [
  { id: 'inv_1092', date: '2026-06-01', amount: 9.99, status: 'paid', planName: 'Pro Plan (Monthly)' },
  { id: 'inv_1054', date: '2026-05-01', amount: 9.99, status: 'paid', planName: 'Pro Plan (Monthly)' },
  { id: 'inv_1012', date: '2026-04-01', amount: 9.99, status: 'paid', planName: 'Pro Plan (Monthly)' }
];

export class AppStore {
  static getLocalStorage<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  static setLocalStorage<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // State initialization
  static init() {
    if (!localStorage.getItem('pdf_users')) {
      this.setLocalStorage('pdf_users', DEFAULT_USERS);
      this.setLocalStorage('pdf_tools', DEFAULT_TOOLS);
      this.setLocalStorage('pdf_logs', PRE_POPULATED_LOGS);
      this.setLocalStorage('pdf_invoices', PRE_POPULATED_INVOICES);
      // Create user auth details (emails and passwords)
      const credentials = {
        'admin@yourapp.com': 'Admin@Secure2025!',
        'alex@example.com': 'password123',
        'eunicelouisiana37@gmail.com': 'password123'
      };
      this.setLocalStorage('pdf_credentials', credentials);
    } else {
      // Migration check: ensure all DEFAULT_TOOLS are in pdf_tools
      const tools = this.getLocalStorage<Tool[]>('pdf_tools', []);
      let updated = false;
      DEFAULT_TOOLS.forEach(defaultTool => {
        if (!tools.some(t => t.slug === defaultTool.slug)) {
          tools.push(defaultTool);
          updated = true;
        }
      });
      if (updated) {
        this.setLocalStorage('pdf_tools', tools);
      }
    }
  }

  static getUsers(): User[] {
    this.init();
    return this.getLocalStorage<User[]>('pdf_users', DEFAULT_USERS);
  }

  static getTools(): Tool[] {
    this.init();
    return this.getLocalStorage<Tool[]>('pdf_tools', DEFAULT_TOOLS);
  }

  static getLogs(): UsageLog[] {
    this.init();
    return this.getLocalStorage<UsageLog[]>('pdf_logs', PRE_POPULATED_LOGS);
  }

  static getInvoices(): Invoice[] {
    this.init();
    return this.getLocalStorage<Invoice[]>('pdf_invoices', PRE_POPULATED_INVOICES);
  }

  static getCredentials(): Record<string, string> {
    this.init();
    return this.getLocalStorage<Record<string, string>>('pdf_credentials', {});
  }

  static getCurrentUser(): User | null {
    const userId = localStorage.getItem('pdf_current_user_id');
    if (!userId) return null;
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  }

  static login(email: string, password: string): User | null {
    const credentials = this.getCredentials();
    if (credentials[email] === password) {
      const users = this.getUsers();
      const user = users.find(u => u.email === email);
      if (user) {
        localStorage.setItem('pdf_current_user_id', user.id);
        return user;
      }
    }
    return null;
  }

  static register(name: string, email: string, password: string): User {
    const users = this.getUsers();
    const credentials = this.getCredentials();

    if (credentials[email]) {
      throw new Error('Email already registered');
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      role: 'user',
      plan: 'free',
      referralCode: name.toUpperCase().replace(/\s+/g, '') + Math.floor(Math.random() * 900 + 100),
      referralsCount: 0
    };

    users.push(newUser);
    credentials[email] = password;

    this.setLocalStorage('pdf_users', users);
    this.setLocalStorage('pdf_credentials', credentials);
    localStorage.setItem('pdf_current_user_id', newUser.id);

    return newUser;
  }

  static logout(): void {
    localStorage.removeItem('pdf_current_user_id');
  }

  static updateProfile(userId: string, data: Partial<User>): User {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...data };
      this.setLocalStorage('pdf_users', users);
      return users[idx];
    }
    throw new Error('User not found');
  }

  static changePassword(email: string, newPassword: string): void {
    const credentials = this.getCredentials();
    if (credentials[email]) {
      credentials[email] = newPassword;
      this.setLocalStorage('pdf_credentials', credentials);
    } else {
      throw new Error('User credentials not found');
    }
  }

  static deleteAccount(userId: string, email: string): void {
    let users = this.getUsers();
    users = users.filter(u => u.id !== userId);
    this.setLocalStorage('pdf_users', users);

    const credentials = this.getCredentials();
    delete credentials[email];
    this.setLocalStorage('pdf_credentials', credentials);

    this.logout();
  }

  // Usage Limit Tracking
  static getDailyUsageCount(userId: string, toolSlug: string): number {
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = this.getLogs();
    return logs.filter(l => l.userId === userId && l.tool === toolSlug && l.date === todayStr && l.status === 'success').length;
  }

  static canUseTool(user: User | null, toolSlug: string): { allowed: boolean; reason: 'limit_reached' | 'unauthenticated' | 'disabled' | 'allowed' } {
    const tools = this.getTools();
    const tool = tools.find(t => t.slug === toolSlug);
    if (!tool || !tool.isEnabled) {
      return { allowed: false, reason: 'disabled' };
    }

    if (!user) {
      return { allowed: false, reason: 'unauthenticated' };
    }

    if (user.plan !== 'free') {
      return { allowed: true, reason: 'allowed' };
    }

    const todayUsage = this.getDailyUsageCount(user.id, toolSlug);
    // Referral bonus: +1 limit per referral (max extra limits)
    const allowedLimit = tool.freeLimit + user.referralsCount;
    if (todayUsage >= allowedLimit) {
      return { allowed: false, reason: 'limit_reached' };
    }

    return { allowed: true, reason: 'allowed' };
  }

  static logUsage(userId: string, toolSlug: string, fileName: string, fileSize: number, status: 'success' | 'failed' = 'success'): void {
    const logs = this.getLogs();
    const newLog: UsageLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      userId,
      tool: toolSlug,
      date: new Date().toISOString().split('T')[0],
      fileName,
      fileSize,
      status
    };
    logs.unshift(newLog); // Prepend to show most recent first
    this.setLocalStorage('pdf_logs', logs);

    // Save actual download link simulation details to session or state if needed
    const fileRecords = this.getFileRecords();
    const newRecord: FileRecord = {
      id: newLog.id,
      name: fileName,
      size: fileSize,
      tool: toolSlug,
      timestamp: new Date().toISOString(),
      status: status === 'success' ? 'success' : 'failed',
    };
    fileRecords.unshift(newRecord);
    this.setLocalStorage('pdf_files', fileRecords);
  }

  static getFileRecords(): FileRecord[] {
    return this.getLocalStorage<FileRecord[]>('pdf_files', []);
  }

  static clearFileRecords(): void {
    this.setLocalStorage('pdf_files', []);
  }

  // Stripe & Billing Simulation
  static handleCheckoutSimulation(userId: string, plan: SubscriptionPlan): User {
    const user = this.updateProfile(userId, {
      plan,
      stripeSubscriptionId: 'sub_' + Math.random().toString(36).substring(2, 10),
      stripeCustomerId: 'cus_' + Math.random().toString(36).substring(2, 10),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Log the transaction invoice
    const invoices = this.getInvoices();
    const planName = plan === 'pro' ? 'Pro Plan (Monthly)' : 'Business Plan (Monthly)';
    const amount = plan === 'pro' ? 9.99 : 24.99;
    invoices.unshift({
      id: 'inv_' + Math.floor(Math.random() * 9000 + 1000),
      date: new Date().toISOString().split('T')[0],
      amount,
      status: 'paid',
      planName
    });
    this.setLocalStorage('pdf_invoices', invoices);

    return user;
  }

  static cancelSubscription(userId: string): User {
    return this.updateProfile(userId, {
      plan: 'free',
      stripeSubscriptionId: undefined,
      currentPeriodEnd: undefined
    });
  }

  // Admin Controls
  static toggleToolStatus(toolSlug: string, isEnabled: boolean): void {
    const tools = this.getTools();
    const idx = tools.findIndex(t => t.slug === toolSlug);
    if (idx !== -1) {
      tools[idx].isEnabled = isEnabled;
      this.setLocalStorage('pdf_tools', tools);
    }
  }

  static updateToolLimit(toolSlug: string, limit: number): void {
    const tools = this.getTools();
    const idx = tools.findIndex(t => t.slug === toolSlug);
    if (idx !== -1) {
      tools[idx].freeLimit = limit;
      this.setLocalStorage('pdf_tools', tools);
    }
  }

  // Referral Simulation
  static applyReferral(userId: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.referralsCount += 1;
      this.setLocalStorage('pdf_users', users);
    }
  }
}
