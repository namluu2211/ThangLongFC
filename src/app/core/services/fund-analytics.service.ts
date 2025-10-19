import { Injectable } from '@angular/core';
import { FundTransaction } from './data-store.service';
import { FundAnalytics } from './statistics.service';

/**
 * FundAnalyticsService
 * Encapsulates financial overview, trends, projections, insights.
 * Pure/stateless; depends only on transactions + currentFund input.
 */
@Injectable({ providedIn: 'root' })
export class FundAnalyticsService {
  buildFundAnalytics(currentFund: number, transactions: FundTransaction[]): FundAnalytics {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      overview: this.calculateOverview(currentFund, totalIncome, totalExpenses),
      trends: this.calculateTrends(transactions),
      projections: this.calculateProjections(transactions),
      insights: this.calculateInsights(transactions)
    };
  }

  private calculateOverview(currentFund: number, totalIncome: number, totalExpenses: number): FundAnalytics['overview'] {
    return {
      currentBalance: currentFund,
      totalIncome,
      totalExpenses,
      netGrowth: totalIncome - totalExpenses,
      growthRate: totalExpenses > 0 ? (totalIncome / totalExpenses - 1) * 100 : 0
    };
  }

  private calculateTrends(transactions: FundTransaction[]): FundAnalytics['trends'] {
    const monthlyData = new Map<string, { income: number; expenses: number }>();
    transactions.forEach(t => {
      const month = t.date.substring(0,7);
      if (!monthlyData.has(month)) monthlyData.set(month, { income:0, expenses:0 });
      const bucket = monthlyData.get(month)!;
      if (t.type === 'income') bucket.income += t.amount; else bucket.expenses += t.amount;
    });
    const monthlyIncome = Array.from(monthlyData.entries()).map(([month, d]) => ({ month, amount: d.income }));
    const monthlyExpenses = Array.from(monthlyData.entries()).map(([month, d]) => ({ month, amount: d.expenses }));
    const monthlyNet = Array.from(monthlyData.entries()).map(([month, d]) => ({ month, amount: d.income - d.expenses }));

    // Category breakdown
    const categoryTotals = new Map<string, number>();
    transactions.forEach(t => categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount));
    const totalAmount = Array.from(categoryTotals.values()).reduce((s,a) => s+a, 0);
    const categoryBreakdown = Array.from(categoryTotals.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount/totalAmount)*100 : 0
    }));

    return { monthlyIncome, monthlyExpenses, monthlyNet, categoryBreakdown };
  }

  private calculateProjections(transactions: FundTransaction[]): FundAnalytics['projections'] {
    const recent = transactions.slice(-10);
    const avgIncome = this.averageOfType(recent, 'income');
    const avgExpenses = this.averageOfType(recent, 'expense');
    const monthlyNet = avgIncome - avgExpenses;
    return {
      nextMonthProjection: monthlyNet,
      yearEndProjection: monthlyNet * 12,
      breakEvenAnalysis: {
        monthsToBreakEven: avgIncome > 0 ? Math.ceil(avgExpenses / avgIncome) : 0,
        requiredMonthlyIncome: avgExpenses * 1.1
      }
    };
  }

  private averageOfType(transactions: FundTransaction[], type: 'income'|'expense'): number {
    const filtered = transactions.filter(t => t.type === type);
    if (!filtered.length) return 0;
    return filtered.reduce((s,t) => s+t.amount,0) / filtered.length;
  }

  private calculateInsights(transactions: FundTransaction[]): FundAnalytics['insights'] {
    const incomeByCat = new Map<string, number>();
    const expenseByCat = new Map<string, number>();
    transactions.forEach(t => {
      const map = t.type === 'income' ? incomeByCat : expenseByCat;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    const topIncome = Array.from(incomeByCat.entries()).sort((a,b)=>b[1]-a[1])[0];
    const topExpense = Array.from(expenseByCat.entries()).sort((a,b)=>b[1]-a[1])[0];
    return {
      topIncomeSource: topIncome ? topIncome[0] : 'Chưa có dữ liệu',
      topExpenseCategory: topExpense ? topExpense[0] : 'Chưa có dữ liệu',
      costOptimizationSuggestions: [
        'Tối ưu chi phí sân bãi',
        'Giảm chi phí dụng cụ tiêu hao',
        'Lập ngân sách theo tháng'
      ],
      revenueImprovementSuggestions: [
        'Tìm thêm nhà tài trợ',
        'Tổ chức sự kiện gây quỹ',
        'Tăng hiệu quả thu phí trận thắng'
      ]
    };
  }
}
