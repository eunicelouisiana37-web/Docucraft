export type UserRole = 'user' | 'admin';
export type SubscriptionPlan = 'free' | 'pro' | 'business';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: SubscriptionPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  profilePhoto?: string;
  referralCode: string;
  referralsCount: number;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isPdf: boolean;
  isEnabled: boolean;
  freeLimit: number;
  category: 'PDF' | 'Image';
}

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  tool: string;
  timestamp: string;
  status: 'success' | 'failed' | 'processing';
  downloadUrl?: string;
  blob?: Blob;
}

export interface UsageLog {
  id: string;
  userId: string;
  tool: string;
  date: string; // YYYY-MM-DD
  fileName: string;
  fileSize: number;
  status: 'success' | 'failed';
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'failed';
  planName: string;
}

export interface Referree {
  id: string;
  name: string;
  email: string;
  date: string;
  status: 'pending' | 'converted';
}
