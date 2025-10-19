/**
 * Core Statistics Service
 * Advanced analytics and reporting for players, matches, and team performance
 */

import { Injectable, inject } from '@angular/core';
import { PerfMarksService } from './perf-marks.service';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';
import { map, shareReplay, take, debounceTime } from 'rxjs/operators';
import { PlayerInfo } from '../models/player.model';
import { MatchInfo } from '../models/match.model';
import { DataStoreService, FundTransaction } from './data-store.service';
// Lazy analytics loading for bundle optimization
/// <reference path="./lazy-analytics-loader.service.ts" />
import { LazyAnalyticsLoaderService } from './lazy-analytics-loader.service';
import { FirebaseService, StatisticsEntry, StatisticsData } from '../../services/firebase.service';

interface StatisticsDataExtended extends StatisticsData { batchType?: 'aggregate'; playerName?: string; }
import { CacheService } from './cache.service';

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
  private readonly lazyLoader = inject(LazyAnalyticsLoaderService) as LazyAnalyticsLoaderService;
  private readonly firebaseService = inject(FirebaseService);
  private readonly cache = inject(CacheService);
  private readonly perfMarks = inject(PerfMarksService) as PerfMarksService;

  // Cached observables for performance
  private readonly playerStatistics$ = new BehaviorSubject<PlayerStatistics[]>([]);
  private readonly teamStatistics$ = new BehaviorSubject<TeamStatistics | null>(null);
  private readonly fundAnalytics$ = new BehaviorSubject<FundAnalytics | null>(null);

  constructor() {
    this.initializeStatistics();
    this.initializeFirebaseSync();
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
      map(() => {
        void this.lazyLoader.getComparisonAnalytics().then(service => {
          service.buildCorrelations();
        });
        return { goalVsWinRate:0, experienceVsPerformance:0, teamSizeVsSuccess:0, spendingVsResults:0 };
      })
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

  // Unified aggregator (Phase 3)
  getAllAnalytics(): Observable<{
    players: PlayerStatistics[];
    team: TeamStatistics;
    fund: FundAnalytics;
    matches: MatchAnalytics[];
    comparison: ComparisonAnalytics['playerComparison'];
  }> {
    return combineLatest([
      this.getPlayerStatistics(),
      this.getTeamStatistics(),
      this.getFundAnalytics(),
      this.getMatchAnalytics(),
      this.comparePlayer([]) // empty list yields baseline comparison structure
    ]).pipe(
      map(([players, team, fund, matches, comparison]) => ({ players, team, fund, matches, comparison })),
      shareReplay(1)
    );
  }

  // Private calculation methods
  private calculatePlayerStatistics(players: PlayerInfo[], matches: MatchInfo[]): PlayerStatistics[] {
    const key = 'playerStats:' + players.length + ':' + matches.length + ':' + (matches[matches.length-1]?.id || 'none');
    // Measure only on cache miss
    const cached = this.cache.get<PlayerStatistics[]>(key);
    if(cached) return cached;
    const { value, measure } = this.perfMarks.timeSync('calc_player_stats', (): PlayerStatistics[] => {
      void this.lazyLoader.getPlayerAdvanced().then(service => {
        const full = service.buildPlayerStatistics(players, matches);
        this.playerStatistics$.next(full);
        this.cache.set(key, full, 15000);
      });
      // Fallback placeholder
      return players.map(p => ({
        playerId: p.id!,
        playerName: `${p.firstName} ${p.lastName || ''}`.trim(),
        performance: { totalMatches: matches.length, wins:0, losses:0, draws:0, winRate:0, goalsScored:0, assists:0, yellowCards:0, redCards:0, averageGoalsPerMatch:0, averageAssistsPerMatch:0 },
        financial: { totalRevenue:0, averageRevenuePerMatch:0, penaltiesPaid:0, netContribution:0 },
        trends: { recentForm:[], goalsLastFiveMatches:0, winRateLast10Matches:0, performanceTrend:'stable' as const },
        rankings: { goalsRank:0, assistsRank:0, winRateRank:0, revenueRank:0, overallRank:0 }
      }));
    });
    if(measure && measure.duration > 50){
      console.log(`⚙️ Player stats computed in ${measure.duration.toFixed(2)}ms`);
    }
    this.cache.set(key, value, 15000);
    return value;
  }

  private calculateTeamStatistics(players: PlayerInfo[], matches: MatchInfo[]): TeamStatistics {
    const key = 'teamStats:' + players.length + ':' + matches.length + ':' + (matches[matches.length-1]?.id || 'none');
    const cached = this.cache.get<TeamStatistics>(key);
    if(cached) return cached;
    const { value, measure } = this.perfMarks.timeSync('calc_team_stats', (): TeamStatistics => {
      void this.lazyLoader.getTeamAnalytics().then(service => {
        const full = service.buildTeamStatistics(players, matches);
        this.teamStatistics$.next(full);
        this.cache.set(key, full, 15000);
      });
      return {
        teamComposition: { totalPlayers: players.length, averageExperience:0, positionDistribution:{}, strengthDistribution:{ strong:0, average:0, developing:0 } },
        performance: { totalMatches: matches.length, homeWins:0, awayWins:0, draws:0, losses: matches.length, winRate:0, averageGoalsScored:0, averageGoalsConceded:0, cleanSheets:0 },
        financial: { totalRevenue:0, totalExpenses:0, averageProfitPerMatch:0, mostProfitableMatch:'', leastProfitableMatch:'' },
        trends: { monthlyMatches:[], goalsScoredTrend:[], profitabilityTrend:[], performanceByOpposition:[] }
      };
    });
    if(measure && measure.duration > 50){
      console.log(`⚙️ Team stats computed in ${measure.duration.toFixed(2)}ms`);
    }
    this.cache.set(key, value, 15000);
    return value;
  }

  private calculateMatchAnalytics(match: MatchInfo, players: PlayerInfo[]): MatchAnalytics {
    void this.lazyLoader.getMatchAnalytics().then(service => {
      // Build analytics (currently not persisted directly; could push to a subject if needed)
      service.buildMatchAnalytics(match, players);
    });
    return {
      matchId: match.id,
      date: match.date,
      quality: { competitiveness:0, entertainment:0, organization:0, fairPlay:0, overallRating:0 },
      balance: { teamStrength:0, experienceBalance:0, sizeBalance:0, recommendation:'Đang tải...' },
      financial: { profitability:0, costEfficiency:0, revenueOptimization:0, breakdownAnalysis:'' },
      playerHighlights: { topPerformer:'', topScorer:'', mvp:'', disciplinaryIssues:[] }
    };
  }

  private calculateFundAnalytics(currentFund: number, transactions: FundTransaction[]): FundAnalytics {
    const key = 'fundAnalytics:' + currentFund + ':' + transactions.length + ':' + (transactions[transactions.length-1]?.id || 'none');
    return this.cache.wrap<FundAnalytics>(key, 15000, (): FundAnalytics => {
      void this.lazyLoader.getFundAnalytics().then(service => {
        const full = service.buildFundAnalytics(currentFund, transactions);
        this.fundAnalytics$.next(full);
        this.cache.set(key, full, 15000);
      });
      return {
        overview: { currentBalance: currentFund, totalIncome:0, totalExpenses:0, netGrowth:0, growthRate:0 },
        trends: { monthlyIncome:[], monthlyExpenses:[], monthlyNet:[], categoryBreakdown:[] },
        projections: { nextMonthProjection:0, yearEndProjection:0, breakEvenAnalysis:{ monthsToBreakEven:0, requiredMonthlyIncome:0 } },
        insights: { topIncomeSource:'', topExpenseCategory:'', costOptimizationSuggestions:[], revenueImprovementSuggestions:[] }
      };
    });
  }

  // Player/team/match/fund comparison helpers delegated to extracted services

  private calculatePlayerComparison(
    playerIds: string[], 
    playerStats: PlayerStatistics[]
  ): ComparisonAnalytics['playerComparison'] {
    void this.lazyLoader.getComparisonAnalytics().then(service => {
      service.buildPlayerComparison(playerIds, playerStats);
    });
    return { players: [], metrics: { goals:[], assists:[], winRate:[], revenue:[], matches:[] }, winner: { goals:'', assists:'', winRate:'', revenue:'', overall:'' } };
  }

  private calculateTimeComparison(
    matches: MatchInfo[], 
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): ComparisonAnalytics['timeComparison'] {
    void this.lazyLoader.getComparisonAnalytics().then(service => {
      service.buildTimeComparison(matches, period1, period2);
    });
    return { period1, period2, metrics: { matches:[0,0], winRate:[0,0], goals:[0,0], revenue:[0,0] }, improvement: { matches:0, winRate:0, goals:0, revenue:0 } };
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

  // Correlation logic delegated to ComparisonAnalyticsService (currently placeholder static values)

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

  // Firebase Sync Methods
  private initializeFirebaseSync(): void {
    // Throttled batching approach: aggregate stats updates and flush every 30s (or on manual trigger later)
    const flush$ = new Subject<void>();

    // Queue holders
    let latestPlayerStats: PlayerStatistics[] = [];
    let latestTeamStats: TeamStatistics | null = null;
    let latestFundAnalytics: FundAnalytics | null = null;

    this.getPlayerStatistics().subscribe(stats => { latestPlayerStats = stats; flush$.next(); });
    this.getTeamStatistics().subscribe(stats => { latestTeamStats = stats; flush$.next(); });
    this.getFundAnalytics().subscribe(analytics => { latestFundAnalytics = analytics; flush$.next(); });

    flush$.pipe(debounceTime(30000)).subscribe(async () => {
      try {
        await this.syncBatchToFirebase(latestPlayerStats, latestTeamStats, latestFundAnalytics);
      } catch (error) {
        console.error('❌ Failed batched statistics sync:', error);
      }
    });

    console.log('✅ Firebase statistics sync initialized (batched & throttled)');
  }

  async syncPlayerStatisticsToFirebase(playerStats: PlayerStatistics[]): Promise<void> {
    for (const playerStat of playerStats) {
      const data: StatisticsData = {
        totalMatches: playerStat.performance.totalMatches,
        totalGoals: playerStat.performance.goalsScored,
        playerName: playerStat.playerName,
        winRate: playerStat.performance.winRate,
        totalRevenue: playerStat.financial.totalRevenue,
        totalExpenses: playerStat.financial.penaltiesPaid
      };

      const entry: Omit<StatisticsEntry, 'id'> = {
        type: 'player',
        period: 'monthly',
        date: new Date().toISOString(),
        data: data,
        calculatedAt: new Date().toISOString(),
        calculatedBy: 'system'
      };

      await this.firebaseService.addStatisticsEntry(entry);
    }
  }

  private async syncBatchToFirebase(
    playerStats: PlayerStatistics[],
    teamStats: TeamStatistics | null,
    fundAnalytics: FundAnalytics | null
  ): Promise<void> {
    // Batch: write a single aggregation entry per category
    if(playerStats.length){
      const aggregatedPlayerData: StatisticsDataExtended = {
        totalMatches: playerStats.reduce((s,p)=> s + p.performance.totalMatches,0),
        totalGoals: playerStats.reduce((s,p)=> s + p.performance.goalsScored,0),
        winRate: playerStats.reduce((s,p)=> s + p.performance.winRate,0) / playerStats.length,
        totalRevenue: playerStats.reduce((s,p)=> s + p.financial.totalRevenue,0),
        totalExpenses: playerStats.reduce((s,p)=> s + p.financial.penaltiesPaid,0),
        playerCount: playerStats.length,
        playerName: 'ALL'
      } as StatisticsData;
      aggregatedPlayerData.batchType = 'aggregate';
      await this.firebaseService.addStatisticsEntry({
        type: 'player',
        period: 'batch',
        date: new Date().toISOString(),
        data: aggregatedPlayerData,
        calculatedAt: new Date().toISOString(),
        calculatedBy: 'system'
      });
    }
    if(teamStats){
      const teamData: StatisticsDataExtended = {
        totalMatches: teamStats.performance.totalMatches,
        totalGoals: teamStats.performance.averageGoalsScored,
        winRate: teamStats.performance.winRate,
        totalRevenue: teamStats.financial.totalRevenue,
        totalExpenses: teamStats.financial.totalExpenses,
        playerCount: teamStats.teamComposition.totalPlayers
      };
      teamData.batchType = 'aggregate';
      await this.firebaseService.addStatisticsEntry({
        type: 'team',
        period: 'batch',
        date: new Date().toISOString(),
        data: teamData,
        calculatedAt: new Date().toISOString(),
        calculatedBy: 'system'
      });
    }
    if(fundAnalytics){
      const fundData: StatisticsDataExtended = {
        totalRevenue: fundAnalytics.overview.totalIncome,
        totalExpenses: fundAnalytics.overview.totalExpenses,
        averageGoalsPerMatch: fundAnalytics.overview.growthRate
      };
      fundData.batchType = 'aggregate';
      await this.firebaseService.addStatisticsEntry({
        type: 'financial',
        period: 'batch',
        date: new Date().toISOString(),
        data: fundData,
        calculatedAt: new Date().toISOString(),
        calculatedBy: 'system'
      });
    }
  }

  async syncTeamStatisticsToFirebase(teamStats: TeamStatistics): Promise<void> {
    const data: StatisticsData = {
      totalMatches: teamStats.performance.totalMatches,
      totalGoals: teamStats.performance.averageGoalsScored,
      winRate: teamStats.performance.winRate,
      totalRevenue: teamStats.financial.totalRevenue,
      totalExpenses: teamStats.financial.totalExpenses,
      playerCount: teamStats.teamComposition.totalPlayers
    };

    const entry: Omit<StatisticsEntry, 'id'> = {
      type: 'team',
      period: 'monthly',
      date: new Date().toISOString(),
      data: data,
      calculatedAt: new Date().toISOString(),
      calculatedBy: 'system'
    };

    await this.firebaseService.addStatisticsEntry(entry);
  }

  async syncFundAnalyticsToFirebase(fundAnalytics: FundAnalytics): Promise<void> {
    const data: StatisticsData = {
      totalRevenue: fundAnalytics.overview.totalIncome,
      totalExpenses: fundAnalytics.overview.totalExpenses,
      averageGoalsPerMatch: fundAnalytics.overview.growthRate
    };

    const entry: Omit<StatisticsEntry, 'id'> = {
      type: 'financial',
      period: 'monthly',
      date: new Date().toISOString(),
      data: data,
      calculatedAt: new Date().toISOString(),
      calculatedBy: 'system'
    };

    await this.firebaseService.addStatisticsEntry(entry);
  }

  // Get statistics from Firebase
  getStatisticsFromFirebase(): Observable<StatisticsEntry[]> {
    return this.firebaseService.statistics$;
  }

  // Get specific player statistics from Firebase
  getPlayerStatisticsFromFirebase(): Observable<StatisticsEntry[]> {
    return this.firebaseService.statistics$.pipe(
      map((entries: StatisticsEntry[]) => entries.filter(entry => 
        entry.type === 'player'
      ))
    );
  }

  // Get team statistics from Firebase
  getTeamStatisticsFromFirebase(): Observable<StatisticsEntry[]> {
    return this.firebaseService.statistics$.pipe(
      map((entries: StatisticsEntry[]) => entries.filter(entry => entry.type === 'team'))
    );
  }

  // Get fund analytics from Firebase
  getFundAnalyticsFromFirebase(): Observable<StatisticsEntry[]> {
    return this.firebaseService.statistics$.pipe(
      map((entries: StatisticsEntry[]) => entries.filter(entry => entry.type === 'financial'))
    );
  }

  // Clear all statistics from Firebase
  async clearStatisticsFromFirebase(): Promise<void> {
    try {
      const statistics = await this.firebaseService.statistics$.pipe(take(1)).toPromise();
      if (statistics) {
        for (const entry of statistics) {
          if (entry.id) {
            await this.firebaseService.deleteStatisticsEntry(entry.id);
          }
        }
      }
      console.log('✅ All statistics cleared from Firebase');
    } catch (error) {
      console.error('❌ Failed to clear statistics from Firebase:', error);
      throw error;
    }
  }
}