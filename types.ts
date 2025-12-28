
export type TransactionType = 'income' | 'expense' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: 'card' | 'cash';
  balance: number; // Начальный баланс
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
  date: string; // ISO string
  note: string;
  type: TransactionType;
  isPlanned?: boolean;
  isJoint?: boolean; // Флаг совместной траты
  linkedDebtId?: string; // Связанный долг
  debtAction?: 'increase' | 'decrease'; // Увеличить или уменьшить долг
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  type: 'i_owe' | 'they_owe';
  isBank?: boolean; // Флаг банковского обязательства
  isMonthly?: boolean; // Ежемесячный платеж
  dueDate?: string; // Дата платежа (ближайшего)
  endDate?: string; // Дата окончания выплаты
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

export interface UserProfile {
  name: string;
  currency: string;
  avatar?: string;
}

export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  debts: Debt[];
  savings: SavingsGoal[];
  profile: UserProfile;
}
