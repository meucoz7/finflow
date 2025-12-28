
import { Category, Account } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Продукты', icon: '🛒', color: '#3b82f6', type: 'expense' },
  { id: '2', name: 'Транспорт', icon: '🚌', color: '#6366f1', type: 'expense' },
  { id: '3', name: 'Жилье', icon: '🏠', color: '#10b981', type: 'expense' },
  { id: '4', name: 'Развлечения', icon: '🎬', color: '#f59e0b', type: 'expense' },
  { id: '5', name: 'Зарплата', icon: '💰', color: '#8b5cf6', type: 'income' },
  { id: '6', name: 'Подработки', icon: '💼', color: '#ec4899', type: 'income' },
  { id: '7', name: 'Копилка', icon: '🐷', color: '#f43f5e', type: 'savings' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'cash', name: 'Наличные', type: 'cash', balance: 0, color: '#10b981', icon: '💵' },
  { id: 'main_card', name: 'Основная карта', type: 'card', balance: 0, color: '#6366f1', icon: '💳' },
];

export const CURRENCIES = [
  { code: 'RUB', symbol: '₽' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'KZT', symbol: '₸' },
];
