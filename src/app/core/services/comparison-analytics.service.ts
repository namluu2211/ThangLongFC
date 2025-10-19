import { Injectable } from '@angular/core';
import { MatchInfo } from '../models/match.model';
import { PlayerStatistics, ComparisonAnalytics } from './statistics.service';

/**
 * ComparisonAnalyticsService
 * Provides player-to-player and time period comparison plus basic correlation analysis.
 * Pure/stateless; delegates heavy player stat building to PlayerAdvancedStatsService upstream.
 */
@Injectable({ providedIn: 'root' })
export class ComparisonAnalyticsService {
  buildPlayerComparison(playerIds: string[], playerStats: PlayerStatistics[]): ComparisonAnalytics['playerComparison'] {
    const comparedStats = playerIds.map(id => playerStats.find(s => s.playerId === id)).filter(Boolean) as PlayerStatistics[];
    const metrics = {
      goals: comparedStats.map(s => s.performance.goalsScored),
      assists: comparedStats.map(s => s.performance.assists),
      winRate: comparedStats.map(s => s.performance.winRate),
      revenue: comparedStats.map(s => s.financial.totalRevenue),
      matches: comparedStats.map(s => s.performance.totalMatches)
    };
    const getBest = (values: number[]) => {
      const maxIndex = values.indexOf(Math.max(...values));
      return comparedStats[maxIndex]?.playerName || 'N/A';
    };
    return {
      players: comparedStats.map(s => s.playerName),
      metrics,
      winner: {
        goals: getBest(metrics.goals),
        assists: getBest(metrics.assists),
        winRate: getBest(metrics.winRate),
        revenue: getBest(metrics.revenue),
        overall: getBest(metrics.goals.map((g,i) => g + metrics.assists[i] + metrics.winRate[i] / 10))
      }
    };
  }

  buildTimeComparison(matches: MatchInfo[], period1: { start: string; end: string }, period2: { start: string; end: string }): ComparisonAnalytics['timeComparison'] {
    const p1Matches = matches.filter(m => m.date >= period1.start && m.date <= period1.end);
    const p2Matches = matches.filter(m => m.date >= period2.start && m.date <= period2.end);
    const metrics1 = this.periodMetrics(p1Matches);
    const metrics2 = this.periodMetrics(p2Matches);
    return {
      period1,
      period2,
      metrics: {
        matches: [metrics1.matches, metrics2.matches],
        winRate: [metrics1.winRate, metrics2.winRate],
        goals: [metrics1.goals, metrics2.goals],
        revenue: [metrics1.revenue, metrics2.revenue]
      },
      improvement: {
        matches: metrics2.matches - metrics1.matches,
        winRate: metrics2.winRate - metrics1.winRate,
        goals: metrics2.goals - metrics1.goals,
        revenue: metrics2.revenue - metrics1.revenue
      }
    };
  }

  private periodMetrics(periodMatches: MatchInfo[]) {
    return {
      matches: periodMatches.length,
      winRate: periodMatches.length ? (periodMatches.filter(m => Math.max(m.result.scoreA, m.result.scoreB) > Math.min(m.result.scoreA, m.result.scoreB)).length / periodMatches.length) * 100 : 0,
      goals: periodMatches.reduce((sum, m) => sum + m.result.scoreA + m.result.scoreB, 0),
      revenue: periodMatches.reduce((sum, m) => sum + m.finances.totalRevenue, 0)
    };
  }

  buildCorrelations(): { goalVsWinRate: number; experienceVsPerformance: number; teamSizeVsSuccess: number; spendingVsResults: number } {
    // Placeholder static correlations until real statistical model implemented.
    return {
      goalVsWinRate: 0.7,
      experienceVsPerformance: 0.6,
      teamSizeVsSuccess: 0.3,
      spendingVsResults: 0.4
    };
  }
}
