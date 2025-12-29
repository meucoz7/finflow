export type TransactionType = 'income' | 'expense' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: 'card' | 'cash';
  balance: number;
  color: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  type: TransactionType;
  isPlanned?: boolean;
  isJoint?: boolean;
  linkedDebtId?: string;
  debtAction?: 'increase' | 'decrease';
  subscriptionId?: string;
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  type: 'i_owe' | 'they_owe';
  isBank?: boolean;
  isMonthly?: boolean;
  dueDate?: string;
  endDate?: string;
  date: string;
  description: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  period: 'monthly' | 'yearly' | 'weekly';
  nextPaymentDate: string;
  categoryId: string;
  accountId: string;
  isActive: boolean;
  reminderDays: number; // 1 or 2 as requested
  icon: string;
  color: string;
}

export type DashboardWidget = 'hero' | 'subs' | 'summary' | 'accounts' | 'history';

export interface UserProfile {
  name: string;
  currency: string;
  avatar?: string;
  partnerId?: number | null;
  pendingPartnerId?: number | null;
  includeDebtsInCapital?: boolean;
  dashboardLayout?: {
    order: DashboardWidget[];
    hidden: DashboardWidget[];
  };
}

export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  debts: Debt[];
  savings: SavingsGoal[];
  subscriptions: Subscription[];
  profile: UserProfile;
}