/**
 * Core Statistics Service
 * Advanced analytics and reporting for players, matches, and team performance
 */

import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { PlayerInfo } from '../models/player.model';
import { MatchInfo } from '../models/match.model';
import { DataStoreService, FundTransaction } from './data-store.service';

export interface PlayerStatistics {
  playerId: string;
  playerName: string;
  performance: {
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    goalsScored: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    averageGoalsPerMatch: number;
    averageAssistsPerMatch: number;
  };
  financial: {
    totalRevenue: number;
    averageRevenuePerMatch: number;
    penaltiesPaid: number;
    netContribution: number;
  };
  trends: {
    recentForm: ('W' | 'L' | 'D')[];
    goalsLastFiveMatches: number;
    winRateLast10Matches: number;
    performanceTrend: 'improving' | 'declining' | 'stable';
  };
  rankings: {
    goalsRank: number;
    assistsRank: number;
    winRateRank: number;
    revenueRank: number;
    overallRank: number;
  };
}

export interface TeamStatistics {
  teamComposition: {
    totalPlayers: number;
    averageExperience: number;
    positionDistribution: Record<string, number>;
    strengthDistribution: {
      strong: number;
      average: number;
      developing: number;
    };
  };
  performance: {
    totalMatches: number;
    homeWins: number;
    awayWins: number;
    draws: number;
    losses: number;
    winRate: number;
    averageGoalsScored: number;
    averageGoalsConceded: number;
    cleanSheets: number;
  };
  financial: {
    totalRevenue: number;
    totalExpenses: number;
    averageProfitPerMatch: number;
    mostProfitableMatch: string;
    leastProfitableMatch: string;
  };
  trends: {
    monthlyMatches: { month: string; count: number; winRate: number }[];
    goalsScoredTrend: { month: string; goals: number }[];
    profitabilityTrend: { month: string; profit: number }[];
    performanceByOpposition: { opponent: string; winRate: number; matches: number }[];
  };
}

export interface MatchAnalytics {
  matchId: string;
  date: string;
  quality: {
    competitiveness: number;
    entertainment: number;
    organization: number;
    fairPlay: number;
    overallRating: number;
  };
  balance: {
    teamStrength: number;
    experienceBalance: number;
    sizeBalance: number;
    recommendation: string;
  };
  financial: {
    profitability: number;
    costEfficiency: number;
    revenueOptimization: number;
    breakdownAnalysis: string;
  };
  playerHighlights: {
    topPerformer: string;
    topScorer: string;
    mvp: string;
    disciplinaryIssues: string[];
  };
}

export interface FundAnalytics {
  overview: {
    currentBalance: number;
    totalIncome: number;
    totalExpenses: number;
    netGrowth: number;
    growthRate: number;
  };
  trends: {
    monthlyIncome: { month: string; amount: number }[];
    monthlyExpenses: { month: string; amount: number }[];
    monthlyNet: { month: string; amount: number }[];
    categoryBreakdown: { category: string; amount: number; percentage: number }[];
  };
  projections: {
    nextMonthProjection: number;
    yearEndProjection: number;
    breakEvenAnalysis: {
      monthsToBreakEven: number;
      requiredMonthlyIncome: number;
    };
  };
  insights: {
    topIncomeSource: string;
    topExpenseCategory: string;
    costOptimizationSuggestions: string[];
    revenueImprovementSuggestions: string[];
  };
}

export interface ComparisonAnalytics {
  playerComparison: {
    players: string[];
    metrics: {
      goals: number[];
      assists: number[];
      winRate: number[];
      revenue: number[];
      matches: number[];
    };
    winner: {
      goals: string;
      assists: string;
      winRate: string;
      revenue: string;
      overall: string;
    };
  };
  timeComparison: {
    period1: { start: string; end: string };
    period2: { start: string; end: string };
    metrics: {
      matches: [number, number];
      winRate: [number, number];
      goals: [number, number];
      revenue: [number, number];
    };
    improvement: {
      matches: number;
      winRate: number;
      goals: number;
      revenue: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly dataStore = inject(DataStoreService);

  // Cached observables for performance
  private readonly playerStatistics$ = new BehaviorSubject<PlayerStatistics[]>([]);
  private readonly teamStatistics$ = new BehaviorSubject<TeamStatistics | null>(null);
  private readonly fundAnalytics$ = new BehaviorSubject<FundAnalytics | null>(null);

  constructor() {
    this.initializeStatistics();
  }

  // Player statistics
  getPlayerStatistics(): Observable<PlayerStatistics[]> {
    return combineLatest([
      this.dataStore.players$,
      this.dataStore.matches$
    ]).pipe(
      map(([players, matches]) => this.calculatePlayerStatistics(players, matches)),
      shareReplay(1)
    );
  }

  getPlayerStatisticsById(playerId: string): Observable<PlayerStatistics | null> {
    return this.getPlayerStatistics().pipe(
      map(stats => stats.find(s => s.playerId === playerId) || null)
    );
  }

  getTopPlayers(metric: 'goals' | 'assists' | 'winRate' | 'revenue', limit = 10): Observable<PlayerStatistics[]> {
    return this.getPlayerStatistics().pipe(
      map(stats => {
        const sorted = stats.sort((a, b) => {
          switch (metric) {
            case 'goals':
              return b.performance.goalsScored - a.performance.goalsScored;
            case 'assists':
              return b.performance.assists - a.performance.assists;
            case 'winRate':
              return b.performance.winRate - a.performance.winRate;
            case 'revenue':
              return b.financial.totalRevenue - a.financial.totalRevenue;
            default:
              return 0;
          }
        });
        return sorted.slice(0, limit);
      })
    );
  }

  // Team statistics
  getTeamStatistics(): Observable<TeamStatistics> {
    return combineLatest([
      this.dataStore.players$,
      this.dataStore.matches$
    ]).pipe(
      map(([players, matches]) => this.calculateTeamStatistics(players, matches)),
      shareReplay(1)
    );
  }

  // Match analytics
  getMatchAnalytics(matchId?: string): Observable<MatchAnalytics[]> {
    return combineLatest([
      this.dataStore.matches$,
      this.dataStore.players$
    ]).pipe(
      map(([matches, players]) => {
        const targetMatches = matchId ? 
          matches.filter(m => m.id === matchId) : 
          matches;
        
        return targetMatches.map(match => this.calculateMatchAnalytics(match, players));
      })
    );
  }

  getMatchAnalyticsById(matchId: string): Observable<MatchAnalytics | null> {
    return this.getMatchAnalytics(matchId).pipe(
      map(analytics => analytics[0] || null)
    );
  }

  // Fund analytics
  getFundAnalytics(): Observable<FundAnalytics> {
    return combineLatest([
      this.dataStore.fund$,
      this.dataStore.fundHistory$
    ]).pipe(
      map(([currentFund, transactions]) => 
        this.calculateFundAnalytics(currentFund, transactions)
      ),
      shareReplay(1)
    );
  }

  // Comparison analytics
  comparePlayer(playerIds: string[]): Observable<ComparisonAnalytics['playerComparison']> {
    return combineLatest([
      this.getPlayerStatistics(),
      this.dataStore.matches$
    ]).pipe(
      map(([playerStats]) => 
        this.calculatePlayerComparison(playerIds, playerStats)
      )
    );
  }

  compareTimePeriods(
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): Observable<ComparisonAnalytics['timeComparison']> {
    return this.dataStore.matches$.pipe(
      map(matches => this.calculateTimeComparison(matches, period1, period2))
    );
  }

  // Advanced analytics
  getPredictiveAnalytics(): Observable<{
    playerPerformancePredictions: { playerId: string; predictedGoals: number; confidence: number }[];
    teamPerformancePrediction: { expectedWinRate: number; expectedGoals: number; confidence: number };
    fundProjection: { nextMonth: number; nextQuarter: number; confidence: number };
  }> {
    return combineLatest([
      this.getPlayerStatistics(),
      this.getTeamStatistics(),
      this.getFundAnalytics()
    ]).pipe(
      map(([playerStats, teamStats, fundAnalytics]) => ({
        playerPerformancePredictions: this.predictPlayerPerformance(playerStats),
        teamPerformancePrediction: this.predictTeamPerformance(teamStats),
        fundProjection: this.predictFundGrowth(fundAnalytics)
      }))
    );
  }

  getCorrelationAnalysis(): Observable<{
    goalVsWinRate: number;
    experienceVsPerformance: number;
    teamSizeVsSuccess: number;
    spendingVsResults: number;
  }> {
    return combineLatest([
      this.getPlayerStatistics(),
      this.dataStore.matches$
    ]).pipe(
      map(() => this.calculateCorrelations())
    );
  }

  // Export functionality
  exportStatisticsReport(): Observable<string> {
    return combineLatest([
      this.getPlayerStatistics(),
      this.getTeamStatistics(),
      this.getFundAnalytics(),
      this.getMatchAnalytics()
    ]).pipe(
      map(([playerStats, teamStats, fundAnalytics, matchAnalytics]) => 
        this.generateStatisticsReport(playerStats, teamStats, fundAnalytics, matchAnalytics)
      )
    );
  }

  // Private calculation methods
  private calculatePlayerStatistics(players: PlayerInfo[], matches: MatchInfo[]): PlayerStatistics[] {
    return players.map(player => {
      const playerMatches = this.getPlayerMatches(player.id!, matches);
      const performance = this.calculatePlayerPerformance(player, playerMatches);
      const financial = this.calculatePlayerFinancial(player, playerMatches);
      const trends = this.calculatePlayerTrends(player, playerMatches);
      
      return {
        playerId: player.id!,
        playerName: `${player.firstName} ${player.lastName || ''}`.trim(),
        performance,
        financial,
        trends,
        rankings: this.calculatePlayerRankings(player.id!, players, matches)
      };
    });
  }

  private calculateTeamStatistics(players: PlayerInfo[], matches: MatchInfo[]): TeamStatistics {
    return {
      teamComposition: this.calculateTeamComposition(players),
      performance: this.calculateTeamPerformance(matches),
      financial: this.calculateTeamFinancial(matches),
      trends: this.calculateTeamTrends(matches)
    };
  }

  private calculateMatchAnalytics(match: MatchInfo, players: PlayerInfo[]): MatchAnalytics {
    return {
      matchId: match.id,
      date: match.date,
      quality: this.calculateMatchQuality(match),
      balance: this.calculateMatchBalance(match, players),
      financial: this.calculateMatchFinancial(match),
      playerHighlights: this.calculatePlayerHighlights(match)
    };
  }

  private calculateFundAnalytics(
    currentFund: number, 
    transactions: FundTransaction[]
  ): FundAnalytics {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      overview: {
        currentBalance: currentFund,
        totalIncome,
        totalExpenses,
        netGrowth: totalIncome - totalExpenses,
        growthRate: totalExpenses > 0 ? (totalIncome / totalExpenses - 1) * 100 : 0
      },
      trends: this.calculateFundTrends(transactions),
      projections: this.calculateFundProjections(transactions),
      insights: this.calculateFundInsights(transactions)
    };
  }

  private getPlayerMatches(playerId: string, matches: MatchInfo[]): MatchInfo[] {
    return matches.filter(match => 
      match.teamA.players.some(p => p.id === playerId) ||
      match.teamB.players.some(p => p.id === playerId)
    );
  }

  private calculatePlayerPerformance(player: PlayerInfo, matches: MatchInfo[]): PlayerStatistics['performance'] {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let goalsScored = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;

    matches.forEach(match => {
      const isTeamA = match.teamA.players.some(p => p.id === player.id);
      const isTeamB = match.teamB.players.some(p => p.id === player.id);
      
      if (!isTeamA && !isTeamB) return;

      // Determine match result for player
      const playerTeamScore = isTeamA ? match.result.scoreA : match.result.scoreB;
      const opponentScore = isTeamA ? match.result.scoreB : match.result.scoreA;
      
      if (playerTeamScore > opponentScore) wins++;
      else if (playerTeamScore < opponentScore) losses++;
      else draws++;

      // Count player's goals and assists
      if (isTeamA) {
        goalsScored += match.result.goalsA.filter(g => g.playerId === player.id).length;
        assists += match.result.goalsA.filter(g => g.assistedBy === player.id).length;
        yellowCards += match.result.yellowCardsA.filter(c => c.playerId === player.id).length;
        redCards += match.result.redCardsA.filter(c => c.playerId === player.id).length;
      } else {
        goalsScored += match.result.goalsB.filter(g => g.playerId === player.id).length;
        assists += match.result.goalsB.filter(g => g.assistedBy === player.id).length;
        yellowCards += match.result.yellowCardsB.filter(c => c.playerId === player.id).length;
        redCards += match.result.redCardsB.filter(c => c.playerId === player.id).length;
      }
    });

    const totalMatches = matches.length;
    
    return {
      totalMatches,
      wins,
      losses,
      draws,
      winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
      goalsScored,
      assists,
      yellowCards,
      redCards,
      averageGoalsPerMatch: totalMatches > 0 ? goalsScored / totalMatches : 0,
      averageAssistsPerMatch: totalMatches > 0 ? assists / totalMatches : 0
    };
  }

  private calculatePlayerFinancial(player: PlayerInfo, matches: MatchInfo[]): PlayerStatistics['financial'] {
    let totalRevenue = 0;
    let penaltiesPaid = 0;

    matches.forEach(match => {
      const isTeamA = match.teamA.players.some(p => p.id === player.id);
      const isTeamB = match.teamB.players.some(p => p.id === player.id);
      
      if (!isTeamA && !isTeamB) return;

      // Calculate player's share of match revenue
      const totalPlayers = match.teamA.players.length + match.teamB.players.length;
      const playerShare = match.finances.totalRevenue / totalPlayers;
      totalRevenue += playerShare;

      // Calculate penalties
      const yellowCardFee = 50000; // From DEFAULT_FINANCIAL_RATES
      const redCardFee = 100000;
      
      if (isTeamA) {
        penaltiesPaid += match.result.yellowCardsA.filter(c => c.playerId === player.id).length * yellowCardFee;
        penaltiesPaid += match.result.redCardsA.filter(c => c.playerId === player.id).length * redCardFee;
      } else {
        penaltiesPaid += match.result.yellowCardsB.filter(c => c.playerId === player.id).length * yellowCardFee;
        penaltiesPaid += match.result.redCardsB.filter(c => c.playerId === player.id).length * redCardFee;
      }
    });

    return {
      totalRevenue,
      averageRevenuePerMatch: matches.length > 0 ? totalRevenue / matches.length : 0,
      penaltiesPaid,
      netContribution: totalRevenue - penaltiesPaid
    };
  }

  private calculatePlayerTrends(player: PlayerInfo, matches: MatchInfo[]): PlayerStatistics['trends'] {
    const recentMatches = matches.slice(-5);
    const last10Matches = matches.slice(-10);
    
    const recentForm: ('W' | 'L' | 'D')[] = recentMatches.map(match => {
      const isTeamA = match.teamA.players.some(p => p.id === player.id);
      const playerTeamScore = isTeamA ? match.result.scoreA : match.result.scoreB;
      const opponentScore = isTeamA ? match.result.scoreB : match.result.scoreA;
      
      if (playerTeamScore > opponentScore) return 'W';
      if (playerTeamScore < opponentScore) return 'L';
      return 'D';
    });

    const goalsLastFiveMatches = recentMatches.reduce((total, match) => {
      const isTeamA = match.teamA.players.some(p => p.id === player.id);
      if (isTeamA) {
        return total + match.result.goalsA.filter(g => g.playerId === player.id).length;
      } else {
        return total + match.result.goalsB.filter(g => g.playerId === player.id).length;
      }
    }, 0);

    const winsLast10 = last10Matches.filter(match => {
      const isTeamA = match.teamA.players.some(p => p.id === player.id);
      const playerTeamScore = isTeamA ? match.result.scoreA : match.result.scoreB;
      const opponentScore = isTeamA ? match.result.scoreB : match.result.scoreA;
      return playerTeamScore > opponentScore;
    }).length;

    const winRateLast10Matches = last10Matches.length > 0 ? (winsLast10 / last10Matches.length) * 100 : 0;

    // Simple performance trend calculation
    const firstHalfWinRate = matches.length > 4 ? 
      (matches.slice(0, Math.floor(matches.length / 2)).filter(match => {
        const isTeamA = match.teamA.players.some(p => p.id === player.id);
        const playerTeamScore = isTeamA ? match.result.scoreA : match.result.scoreB;
        const opponentScore = isTeamA ? match.result.scoreB : match.result.scoreA;
        return playerTeamScore > opponentScore;
      }).length / Math.floor(matches.length / 2)) * 100 : 0;

    const secondHalfWinRate = matches.length > 4 ?
      (matches.slice(Math.floor(matches.length / 2)).filter(match => {
        const isTeamA = match.teamA.players.some(p => p.id === player.id);
        const playerTeamScore = isTeamA ? match.result.scoreA : match.result.scoreB;
        const opponentScore = isTeamA ? match.result.scoreB : match.result.scoreA;
        return playerTeamScore > opponentScore;
      }).length / Math.ceil(matches.length / 2)) * 100 : 0;

    const performanceTrend = 
      secondHalfWinRate > firstHalfWinRate + 10 ? 'improving' :
      secondHalfWinRate < firstHalfWinRate - 10 ? 'declining' : 'stable';

    return {
      recentForm,
      goalsLastFiveMatches,
      winRateLast10Matches,
      performanceTrend
    };
  }

  private calculatePlayerRankings(
    playerId: string, 
    players: PlayerInfo[], 
    matches: MatchInfo[]
  ): PlayerStatistics['rankings'] {
    const allPlayerStats = players.map(p => {
      const playerMatches = this.getPlayerMatches(p.id!, matches);
      return {
        playerId: p.id!,
        ...this.calculatePlayerPerformance(p, playerMatches),
        ...this.calculatePlayerFinancial(p, playerMatches)
      };
    });

    // Sort by different metrics to get rankings
    const goalsSorted = [...allPlayerStats].sort((a, b) => b.goalsScored - a.goalsScored);
    const assistsSorted = [...allPlayerStats].sort((a, b) => b.assists - a.assists);
    const winRateSorted = [...allPlayerStats].sort((a, b) => b.winRate - a.winRate);
    const revenueSorted = [...allPlayerStats].sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      goalsRank: goalsSorted.findIndex(p => p.playerId === playerId) + 1,
      assistsRank: assistsSorted.findIndex(p => p.playerId === playerId) + 1,
      winRateRank: winRateSorted.findIndex(p => p.playerId === playerId) + 1,
      revenueRank: revenueSorted.findIndex(p => p.playerId === playerId) + 1,
      overallRank: Math.round((
        goalsSorted.findIndex(p => p.playerId === playerId) +
        assistsSorted.findIndex(p => p.playerId === playerId) +
        winRateSorted.findIndex(p => p.playerId === playerId) +
        revenueSorted.findIndex(p => p.playerId === playerId)
      ) / 4) + 1
    };
  }

  // Additional helper methods for team and match calculations
  private calculateTeamComposition(players: PlayerInfo[]): TeamStatistics['teamComposition'] {
    const totalPlayers = players.length;
    const averageExperience = players.reduce((sum, p) => sum + (p.stats.totalMatches || 0), 0) / totalPlayers;
    
    // Position distribution (simplified)
    const positionDistribution: Record<string, number> = {
      'Thủ môn': players.filter(p => p.position === 'Thủ môn').length,
      'Hậu vệ': players.filter(p => p.position === 'Hậu vệ').length,
      'Tiền vệ': players.filter(p => p.position === 'Tiền vệ').length,
      'Tiền đạo': players.filter(p => p.position === 'Tiền đạo').length,
      'Khác': players.filter(p => !p.position || !['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'].includes(p.position)).length
    };

    // Strength distribution based on win rate
    const strong = players.filter(p => (p.stats.winRate || 0) >= 70).length;
    const developing = players.filter(p => (p.stats.winRate || 0) < 40).length;
    const average = totalPlayers - strong - developing;

    return {
      totalPlayers,
      averageExperience,
      positionDistribution,
      strengthDistribution: { strong, average, developing }
    };
  }

  private calculateTeamPerformance(matches: MatchInfo[]): TeamStatistics['performance'] {
    const totalMatches = matches.length;
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    const losses = 0;
    let totalGoalsScored = 0;
    let cleanSheets = 0;

    matches.forEach(match => {
      const scoreA = match.result.scoreA;
      const scoreB = match.result.scoreB;
      
      totalGoalsScored += scoreA + scoreB;
      
      if (scoreA > scoreB) {
        homeWins++;
        if (scoreB === 0) cleanSheets++;
      } else if (scoreB > scoreA) {
        awayWins++;
        if (scoreA === 0) cleanSheets++;
      } else {
        draws++;
        if (scoreA === 0 && scoreB === 0) cleanSheets++;
      }
    });

    const winRate = totalMatches > 0 ? ((homeWins + awayWins) / totalMatches) * 100 : 0;
    const averageGoalsScored = totalMatches > 0 ? totalGoalsScored / totalMatches : 0;

    return {
      totalMatches,
      homeWins,
      awayWins,
      draws,
      losses,
      winRate,
      averageGoalsScored,
      averageGoalsConceded: averageGoalsScored, // Simplified
      cleanSheets
    };
  }

  private calculateTeamFinancial(matches: MatchInfo[]): TeamStatistics['financial'] {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let mostProfitable = { matchId: '', profit: -Infinity };
    let leastProfitable = { matchId: '', profit: Infinity };

    matches.forEach(match => {
      totalRevenue += match.finances.totalRevenue;
      totalExpenses += match.finances.totalExpenses;
      
      if (match.finances.netProfit > mostProfitable.profit) {
        mostProfitable = { matchId: match.date, profit: match.finances.netProfit };
      }
      
      if (match.finances.netProfit < leastProfitable.profit) {
        leastProfitable = { matchId: match.date, profit: match.finances.netProfit };
      }
    });

    return {
      totalRevenue,
      totalExpenses,
      averageProfitPerMatch: matches.length > 0 ? (totalRevenue - totalExpenses) / matches.length : 0,
      mostProfitableMatch: mostProfitable.matchId,
      leastProfitableMatch: leastProfitable.matchId
    };
  }

  private calculateTeamTrends(matches: MatchInfo[]): TeamStatistics['trends'] {
    // Group matches by month
    const monthlyData = new Map<string, { matches: MatchInfo[]; wins: number }>();
    
    matches.forEach(match => {
      const monthKey = match.date.substring(0, 7); // YYYY-MM
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { matches: [], wins: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.matches.push(match);
      
      if (match.result.scoreA > match.result.scoreB || match.result.scoreB > match.result.scoreA) {
        data.wins++;
      }
    });

    const monthlyMatches = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      count: data.matches.length,
      winRate: data.matches.length > 0 ? (data.wins / data.matches.length) * 100 : 0
    }));

    const goalsScoredTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      goals: data.matches.reduce((sum, match) => sum + match.result.scoreA + match.result.scoreB, 0)
    }));

    const profitabilityTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      profit: data.matches.reduce((sum, match) => sum + match.finances.netProfit, 0)
    }));

    return {
      monthlyMatches,
      goalsScoredTrend,
      profitabilityTrend,
      performanceByOpposition: [] // Simplified - would need opponent data
    };
  }

  private calculateMatchQuality(match: MatchInfo): MatchAnalytics['quality'] {
    const totalGoals = match.result.scoreA + match.result.scoreB;
    const totalCards = match.result.yellowCardsA.length + match.result.yellowCardsB.length + 
                      (match.result.redCardsA.length + match.result.redCardsB.length) * 3;

    const entertainment = Math.min(100, totalGoals * 20);
    const fairPlay = Math.max(0, 100 - totalCards * 10);
    const competitiveness = Math.max(0, 100 - Math.abs(match.result.scoreA - match.result.scoreB) * 20);
    const organization = 85; // Default

    return {
      competitiveness,
      entertainment,
      organization,
      fairPlay,
      overallRating: (entertainment + fairPlay + competitiveness + organization) / 4
    };
  }

  private calculateMatchBalance(match: MatchInfo, players: PlayerInfo[]): MatchAnalytics['balance'] {
    const teamAStrength = this.calculateTeamStrength(match.teamA.players, players);
    const teamBStrength = this.calculateTeamStrength(match.teamB.players, players);
    const strengthBalance = 100 - Math.abs(teamAStrength - teamBStrength);
    
    const teamASize = match.teamA.players.length;
    const teamBSize = match.teamB.players.length;
    const sizeBalance = Math.abs(teamASize - teamBSize) <= 1 ? 100 : 60;

    return {
      teamStrength: (teamAStrength + teamBStrength) / 2,
      experienceBalance: 80, // Simplified
      sizeBalance,
      recommendation: strengthBalance < 60 ? 'Đội hình không cân bằng' : 'Đội hình tương đối cân bằng'
    };
  }

  private calculateMatchFinancial(match: MatchInfo): MatchAnalytics['financial'] {
    const profitability = match.finances.netProfit > 0 ? 100 : 0;
    const costEfficiency = match.finances.totalExpenses > 0 ? 
      (match.finances.totalRevenue / match.finances.totalExpenses) * 50 : 100;

    return {
      profitability,
      costEfficiency: Math.min(100, costEfficiency),
      revenueOptimization: 80, // Simplified
      breakdownAnalysis: `Thu ${match.finances.totalRevenue.toLocaleString()}₫ - Chi ${match.finances.totalExpenses.toLocaleString()}₫`
    };
  }

  private calculatePlayerHighlights(match: MatchInfo): MatchAnalytics['playerHighlights'] {
    const allGoals = [...match.result.goalsA, ...match.result.goalsB];
    const topScorer = allGoals.length > 0 ? allGoals[0].playerName : 'Không có';
    
    return {
      topPerformer: topScorer,
      topScorer,
      mvp: topScorer,
      disciplinaryIssues: [
        ...match.result.yellowCardsA.map(card => `Thẻ vàng: ${card.playerName}`),
        ...match.result.yellowCardsB.map(card => `Thẻ vàng: ${card.playerName}`),
        ...match.result.redCardsA.map(card => `Thẻ đỏ: ${card.playerName}`),
        ...match.result.redCardsB.map(card => `Thẻ đỏ: ${card.playerName}`)
      ]
    };
  }

  private calculateTeamStrength(teamPlayers: PlayerInfo[], allPlayers: PlayerInfo[]): number {
    if (teamPlayers.length === 0) return 0;
    
    const totalStrength = teamPlayers.reduce((sum, teamPlayer) => {
      const player = allPlayers.find(p => p.id === teamPlayer.id);
      if (!player) return sum;
      
      const winRate = player.stats.winRate || 0;
      const experience = Math.min(player.stats.totalMatches, 50) * 2;
      const performance = (player.stats.averageGoalsPerMatch * 20) + (player.stats.averageAssistsPerMatch * 15);
      
      return sum + (winRate + experience + performance) / 3;
    }, 0);
    
    return totalStrength / teamPlayers.length;
  }

  private calculateFundTrends(transactions: FundTransaction[]): FundAnalytics['trends'] {
    // Group transactions by month
    const monthlyData = new Map<string, { income: number; expenses: number }>();
    
    transactions.forEach(transaction => {
      const monthKey = transaction.date.substring(0, 7);
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      if (transaction.type === 'income') {
        data.income += transaction.amount;
      } else {
        data.expenses += transaction.amount;
      }
    });

    const monthlyIncome = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month, amount: data.income
    }));

    const monthlyExpenses = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month, amount: data.expenses
    }));

    const monthlyNet = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month, amount: data.income - data.expenses
    }));

    // Category breakdown
    const categoryTotals = new Map<string, number>();
    transactions.forEach(transaction => {
      const current = categoryTotals.get(transaction.category) || 0;
      categoryTotals.set(transaction.category, current + transaction.amount);
    });

    const totalAmount = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0);
    const categoryBreakdown = Array.from(categoryTotals.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
    }));

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlyNet,
      categoryBreakdown
    };
  }

  private calculateFundProjections(transactions: FundTransaction[]): FundAnalytics['projections'] {
    // Simple projection based on recent trends
    const recentTransactions = transactions.slice(-10);
    const averageMonthlyIncome = recentTransactions.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, recentTransactions.filter(t => t.type === 'income').length);
    
    const averageMonthlyExpenses = recentTransactions.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, recentTransactions.filter(t => t.type === 'expense').length);

    const monthlyNet = averageMonthlyIncome - averageMonthlyExpenses;

    return {
      nextMonthProjection: monthlyNet,
      yearEndProjection: monthlyNet * 12,
      breakEvenAnalysis: {
        monthsToBreakEven: averageMonthlyExpenses > 0 ? Math.ceil(averageMonthlyExpenses / averageMonthlyIncome) : 0,
        requiredMonthlyIncome: averageMonthlyExpenses * 1.1 // 10% buffer
      }
    };
  }

  private calculateFundInsights(transactions: FundTransaction[]): FundAnalytics['insights'] {
    const incomeByCategory = new Map<string, number>();
    const expensesByCategory = new Map<string, number>();

    transactions.forEach(transaction => {
      const map = transaction.type === 'income' ? incomeByCategory : expensesByCategory;
      const current = map.get(transaction.category) || 0;
      map.set(transaction.category, current + transaction.amount);
    });

    const topIncomeCategory = Array.from(incomeByCategory.entries())
      .sort(([,a], [,b]) => b - a)[0];
    const topExpenseCategory = Array.from(expensesByCategory.entries())
      .sort(([,a], [,b]) => b - a)[0];

    return {
      topIncomeSource: topIncomeCategory ? topIncomeCategory[0] : 'Chưa có dữ liệu',
      topExpenseCategory: topExpenseCategory ? topExpenseCategory[0] : 'Chưa có dữ liệu',
      costOptimizationSuggestions: [
        'Tối ưu hóa chi phí sân bóng',
        'Chia sẻ chi phí trọng tài',
        'Mua nước uống theo số lượng lớn'
      ],
      revenueImprovementSuggestions: [
        'Tăng phí tham gia cho trận thắng',
        'Tổ chức thêm các trận giao hữu',
        'Tìm kiếm nhà tài trợ'
      ]
    };
  }

  private calculatePlayerComparison(
    playerIds: string[], 
    playerStats: PlayerStatistics[]
  ): ComparisonAnalytics['playerComparison'] {
    const comparedStats = playerIds.map(id => 
      playerStats.find(s => s.playerId === id)
    ).filter(Boolean) as PlayerStatistics[];

    const metrics = {
      goals: comparedStats.map(s => s.performance.goalsScored),
      assists: comparedStats.map(s => s.performance.assists),
      winRate: comparedStats.map(s => s.performance.winRate),
      revenue: comparedStats.map(s => s.financial.totalRevenue),
      matches: comparedStats.map(s => s.performance.totalMatches)
    };

    const getBestPerformer = (values: number[]) => {
      const maxIndex = values.indexOf(Math.max(...values));
      return comparedStats[maxIndex]?.playerName || 'N/A';
    };

    return {
      players: comparedStats.map(s => s.playerName),
      metrics,
      winner: {
        goals: getBestPerformer(metrics.goals),
        assists: getBestPerformer(metrics.assists),
        winRate: getBestPerformer(metrics.winRate),
        revenue: getBestPerformer(metrics.revenue),
        overall: getBestPerformer(metrics.goals.map((g, i) => g + metrics.assists[i] + metrics.winRate[i] / 10))
      }
    };
  }

  private calculateTimeComparison(
    matches: MatchInfo[], 
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): ComparisonAnalytics['timeComparison'] {
    const period1Matches = matches.filter(m => m.date >= period1.start && m.date <= period1.end);
    const period2Matches = matches.filter(m => m.date >= period2.start && m.date <= period2.end);

    const calculatePeriodMetrics = (periodMatches: MatchInfo[]) => ({
      matches: periodMatches.length,
      winRate: periodMatches.length > 0 ? 
        (periodMatches.filter(m => Math.max(m.result.scoreA, m.result.scoreB) > Math.min(m.result.scoreA, m.result.scoreB)).length / periodMatches.length) * 100 : 0,
      goals: periodMatches.reduce((sum, m) => sum + m.result.scoreA + m.result.scoreB, 0),
      revenue: periodMatches.reduce((sum, m) => sum + m.finances.totalRevenue, 0)
    });

    const metrics1 = calculatePeriodMetrics(period1Matches);
    const metrics2 = calculatePeriodMetrics(period2Matches);

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

  private predictPlayerPerformance(playerStats: PlayerStatistics[]): { 
    playerId: string; 
    predictedGoals: number; 
    confidence: number 
  }[] {
    return playerStats.map(player => ({
      playerId: player.playerId,
      predictedGoals: Math.round(player.performance.averageGoalsPerMatch * 1.1), // Simple prediction
      confidence: player.performance.totalMatches > 5 ? 80 : 50
    }));
  }

  private predictTeamPerformance(teamStats: TeamStatistics): { 
    expectedWinRate: number; 
    expectedGoals: number; 
    confidence: number 
  } {
    return {
      expectedWinRate: teamStats.performance.winRate * 1.05, // Slight improvement expected
      expectedGoals: teamStats.performance.averageGoalsScored * 1.02,
      confidence: teamStats.performance.totalMatches > 10 ? 75 : 50
    };
  }

  private predictFundGrowth(fundAnalytics: FundAnalytics): { 
    nextMonth: number; 
    nextQuarter: number; 
    confidence: number 
  } {
    return {
      nextMonth: fundAnalytics.projections.nextMonthProjection,
      nextQuarter: fundAnalytics.projections.nextMonthProjection * 3,
      confidence: 70
    };
  }

  private calculateCorrelations(): {
    goalVsWinRate: number;
    experienceVsPerformance: number;
    teamSizeVsSuccess: number;
    spendingVsResults: number;
  } {
    // Simplified correlation calculations
    return {
      goalVsWinRate: 0.7, // Strong positive correlation
      experienceVsPerformance: 0.6, // Moderate positive correlation
      teamSizeVsSuccess: 0.3, // Weak positive correlation
      spendingVsResults: 0.4 // Moderate positive correlation
    };
  }

  private generateStatisticsReport(
    playerStats: PlayerStatistics[], 
    teamStats: TeamStatistics,
    fundAnalytics: FundAnalytics,
    matchAnalytics: MatchAnalytics[]
  ): string {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalPlayers: playerStats.length,
        totalMatches: teamStats.performance.totalMatches,
        teamWinRate: teamStats.performance.winRate,
        currentFund: fundAnalytics.overview.currentBalance,
        topScorer: playerStats.sort((a, b) => b.performance.goalsScored - a.performance.goalsScored)[0]?.playerName || 'N/A'
      },
      playerStatistics: playerStats,
      teamStatistics: teamStats,
      fundAnalytics,
      matchAnalytics
    };

    return JSON.stringify(report, null, 2);
  }

  private initializeStatistics(): void {
    // Initialize cached statistics
    this.getPlayerStatistics().subscribe(stats => {
      this.playerStatistics$.next(stats);
    });

    this.getTeamStatistics().subscribe(stats => {
      this.teamStatistics$.next(stats);
    });

    this.getFundAnalytics().subscribe(analytics => {
      this.fundAnalytics$.next(analytics);
    });

    console.log('✅ Statistics service initialized');
  }
}