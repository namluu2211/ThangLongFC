import { Injectable } from '@angular/core';
import { FUND_LOCAL_STORAGE_KEY } from './fund.constants';

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  relatedTo?: string;
}

@Injectable({ providedIn: 'root' })
export class FundTransactionService {
  loadTransactions(): Transaction[] {
    const stored = localStorage.getItem(FUND_LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(FUND_LOCAL_STORAGE_KEY, JSON.stringify(transactions));
  }

  addTransaction(transactions: Transaction[], transaction: Transaction): Transaction[] {
    return [...transactions, transaction];
  }

  updateTransaction(transactions: Transaction[], updated: Transaction): Transaction[] {
    return transactions.map(t => t.id === updated.id ? updated : t);
  }

  deleteTransaction(transactions: Transaction[], id: string): Transaction[] {
    return transactions.filter(t => t.id !== id);
  }
}
