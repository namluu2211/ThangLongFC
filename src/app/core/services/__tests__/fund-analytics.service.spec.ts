/// <reference types="jest" />
import { FundAnalyticsService } from '../fund-analytics.service';
import { FundTransaction } from '../data-store.service';

describe('FundAnalyticsService', () => {
  let service: FundAnalyticsService;
  beforeEach(() => { service = new FundAnalyticsService(); });

  it('aggregates overview metrics correctly', () => {
    const baseMeta = { description: '', createdAt: '2025-09-01', createdBy: 'system' };
    const tx: FundTransaction[] = [
      { id: 't1', type: 'income', amount: 500000, category: 'Phí trận', date: '2025-09-01', ...baseMeta },
      { id: 't2', type: 'expense', amount: 200000, category: 'Thuê sân', date: '2025-09-02', ...baseMeta },
      { id: 't3', type: 'income', amount: 300000, category: 'Tài trợ', date: '2025-09-15', ...baseMeta },
      { id: 't4', type: 'expense', amount: 100000, category: 'Nước uống', date: '2025-09-16', ...baseMeta }
    ];
    const analytics = service.buildFundAnalytics(600000, tx);
    expect(analytics.overview.currentBalance).toBe(600000);
    expect(analytics.overview.totalIncome).toBe(800000);
    expect(analytics.overview.totalExpenses).toBe(300000);
  });

  it('builds trends and projections', () => {
    const baseMeta = { description: '', createdAt: '2025-09-01', createdBy: 'system' };
    const tx: FundTransaction[] = [
      { id: 't1', type: 'income', amount: 100000, category: 'Phí trận', date: '2025-09-01', ...baseMeta },
      { id: 't2', type: 'income', amount: 200000, category: 'Tài trợ', date: '2025-09-05', ...baseMeta },
      { id: 't3', type: 'expense', amount: 50000, category: 'Thuê sân', date: '2025-09-06', ...baseMeta }
    ];
    const analytics = service.buildFundAnalytics(250000, tx);
    expect(analytics.trends.monthlyIncome.length).toBeGreaterThan(0);
    expect(analytics.trends.monthlyExpenses.length).toBeGreaterThan(0);
    expect(analytics.projections.nextMonthProjection).toBeDefined();
  });
});
