import { Injectable } from '@angular/core';
import { PlayerInfo } from '../models/player.model';
import { MatchInfo } from '../models/match.model';
import { TeamStatistics } from './statistics.service';

/**
 * TeamAnalyticsService
 * Extracted team-level analytics: composition, performance, financial, and trends.
 * All methods pure for easier testing & optimization.
 */
@Injectable({ providedIn: 'root' })
export class TeamAnalyticsService {
  buildTeamStatistics(players: PlayerInfo[], matches: MatchInfo[]): TeamStatistics {
    return {
      teamComposition: this.calculateTeamComposition(players),
      performance: this.calculateTeamPerformance(matches),
      financial: this.calculateTeamFinancial(matches),
      trends: this.calculateTeamTrends(matches)
    };
  }

  // --- Composition ---
  private calculateTeamComposition(players: PlayerInfo[]): TeamStatistics['teamComposition'] {
    const totalPlayers = players.length;
    const averageExperience = totalPlayers ? players.reduce((sum, p) => sum + (p.stats.totalMatches || 0), 0) / totalPlayers : 0;
    const positionDistribution: Record<string, number> = {
      'Thủ môn': players.filter(p => p.position === 'Thủ môn').length,
      'Hậu vệ': players.filter(p => p.position === 'Hậu vệ').length,
      'Tiền vệ': players.filter(p => p.position === 'Tiền vệ').length,
      'Tiền đạo': players.filter(p => p.position === 'Tiền đạo').length,
      'Khác': players.filter(p => !p.position || !['Thủ môn','Hậu vệ','Tiền vệ','Tiền đạo'].includes(p.position)).length
    };
    const strong = players.filter(p => (p.stats.winRate || 0) >= 70).length;
    const developing = players.filter(p => (p.stats.winRate || 0) < 40).length;
    const average = totalPlayers - strong - developing;
    return { totalPlayers, averageExperience, positionDistribution, strengthDistribution: { strong, average, developing } };
  }

  // --- Performance ---
  private calculateTeamPerformance(matches: MatchInfo[]): TeamStatistics['performance'] {
    const totalMatches = matches.length;
  let homeWins = 0, awayWins = 0, draws = 0, totalGoalsScored = 0, totalGoalsConceded = 0, cleanSheets = 0;
    matches.forEach(m => {
      // Simplified: assume teamA is 'home', teamB 'away'
      if (m.result.scoreA > m.result.scoreB) homeWins++; else if (m.result.scoreA < m.result.scoreB) awayWins++; else draws++;
      totalGoalsScored += m.result.scoreA + m.result.scoreB;
      totalGoalsConceded += m.result.scoreA + m.result.scoreB; // placeholder identical; can refine later
      if (m.result.scoreA === 0 || m.result.scoreB === 0) cleanSheets++;
    });
    const winRate = totalMatches ? ((homeWins + awayWins) / totalMatches) * 100 : 0;
    return {
      totalMatches,
      homeWins,
      awayWins,
      draws,
      losses: totalMatches - (homeWins + awayWins + draws),
      winRate,
      averageGoalsScored: totalMatches ? totalGoalsScored / totalMatches : 0,
      averageGoalsConceded: totalMatches ? totalGoalsConceded / totalMatches : 0,
      cleanSheets
    };
  }

  // --- Financial ---
  private calculateTeamFinancial(matches: MatchInfo[]): TeamStatistics['financial'] {
    if (!matches.length) return { totalRevenue: 0, totalExpenses: 0, averageProfitPerMatch: 0, mostProfitableMatch: '', leastProfitableMatch: '' };
    let totalRevenue = 0, totalExpenses = 0;
    let mostProfit = Number.NEGATIVE_INFINITY, leastProfit = Number.POSITIVE_INFINITY;
    let mostMatch = '', leastMatch = '';
    matches.forEach(m => {
      totalRevenue += m.finances.totalRevenue;
      totalExpenses += m.finances.totalExpenses;
      const profit = m.finances.netProfit;
      if (profit > mostProfit) { mostProfit = profit; mostMatch = m.id; }
      if (profit < leastProfit) { leastProfit = profit; leastMatch = m.id; }
    });
    return {
      totalRevenue,
      totalExpenses,
      averageProfitPerMatch: matches.length ? (totalRevenue - totalExpenses) / matches.length : 0,
      mostProfitableMatch: mostMatch,
      leastProfitableMatch: leastMatch
    };
  }

  // --- Trends ---
  private calculateTeamTrends(matches: MatchInfo[]): TeamStatistics['trends'] {
    // Group by month string YYYY-MM
    const monthMap = new Map<string, { wins: number; matches: number; goals: number; profit: number }>();
    matches.forEach(m => {
      const month = (m.date || '').slice(0,7);
      if (!monthMap.has(month)) monthMap.set(month, { wins:0, matches:0, goals:0, profit:0 });
      const bucket = monthMap.get(month)!;
      bucket.matches++; bucket.goals += m.result.scoreA + m.result.scoreB; bucket.profit += m.finances.netProfit; if (m.result.scoreA !== m.result.scoreB) bucket.wins++; // simplistic win count
    });
    const monthlyMatches = Array.from(monthMap.entries()).map(([month, b]) => ({ month, count: b.matches, winRate: b.matches? (b.wins/b.matches)*100 : 0 }));
    const goalsScoredTrend = Array.from(monthMap.entries()).map(([month, b]) => ({ month, goals: b.goals }));
    const profitabilityTrend = Array.from(monthMap.entries()).map(([month, b]) => ({ month, profit: b.profit }));
    // Placeholder performanceByOpposition until opposition structured
    const performanceByOpposition: { opponent: string; winRate: number; matches: number }[] = [];
    return { monthlyMatches, goalsScoredTrend, profitabilityTrend, performanceByOpposition };
  }
}
