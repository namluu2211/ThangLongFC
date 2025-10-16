/**
 * Core Match Management Service
 * Centralized service for match operations, team formation, and financial calculations
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  MatchInfo,
  MatchFinances,
  MatchValidation,
  MatchSearchCriteria,
  MatchSortOptions,
  MatchUpdateFields,
  MatchAnalytics,
  TeamComposition,
  TeamSide,
  MatchStatus,
  TeamColor,
  GoalDetail,
  CardDetail,
  MatchEvent,
  EventType,
  GoalType,
  CardType,
  CustomRates,
  DEFAULT_FINANCIAL_RATES,
  DEFAULT_MATCH_STATISTICS
} from '../models/match.model';
import { PlayerInfo } from '../models/player.model';
import { PlayerService } from './player.service';
import { FirebaseService } from '../../services/firebase.service';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly playerService = inject(PlayerService);
  private readonly firebaseService = inject(FirebaseService);

  // Core state management
  private readonly _matches$ = new BehaviorSubject<Map<string, MatchInfo>>(new Map());
  private readonly _currentMatch$ = new BehaviorSubject<MatchInfo | null>(null);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _searchCriteria$ = new BehaviorSubject<MatchSearchCriteria>({});
  private readonly _sortOptions$ = new BehaviorSubject<MatchSortOptions>({ field: 'date', direction: 'desc' });

  // Cache management
  private matchCache = new Map<string, { data: MatchInfo; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeMatchData();
  }

  // Public observables
  get matches$(): Observable<MatchInfo[]> {
    return combineLatest([
      this._matches$,
      this._searchCriteria$,
      this._sortOptions$
    ]).pipe(
      map(([matchesMap, criteria, sortOptions]) => {
        let matches = Array.from(matchesMap.values());
        
        // Apply search filters
        matches = this.filterMatches(matches, criteria);
        
        // Apply sorting
        matches = this.sortMatches(matches, sortOptions);
        
        return matches;
      })
    );
  }

  get currentMatch$(): Observable<MatchInfo | null> {
    return this._currentMatch$.asObservable();
  }

  get completedMatches$(): Observable<MatchInfo[]> {
    return this.matches$.pipe(
      map(matches => matches.filter(m => m.status === MatchStatus.COMPLETED))
    );
  }

  get upcomingMatches$(): Observable<MatchInfo[]> {
    return this.matches$.pipe(
      map(matches => matches.filter(m => m.status === MatchStatus.SCHEDULED))
    );
  }

  get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  get error$(): Observable<string | null> {
    return this._error$.asObservable();
  }

  // Match CRUD operations
  async createMatch(matchData: Omit<MatchInfo, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<MatchInfo> {
    try {
      this._loading$.next(true);
      this._error$.next(null);

      // Validate match data
      const validation = this.validateMatchData(matchData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Generate unique ID
      const id = this.generateMatchId();
      
      // Create complete match object
      const newMatch: MatchInfo = {
        ...matchData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      // Calculate initial finances
      newMatch.finances = this.calculateMatchFinances(newMatch);

      // Save to storage
      await this.saveMatchToStorage(newMatch);
      
      // Update local state
      const currentMatches = this._matches$.value;
      currentMatches.set(id, newMatch);
      this._matches$.next(new Map(currentMatches));

      console.log('✅ Match created successfully:', newMatch.date);
      return newMatch;

    } catch (error) {
      const errorMessage = `Failed to create match: ${error.message}`;
      this._error$.next(errorMessage);
      console.error('❌', errorMessage, error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async updateMatch(id: string, updates: MatchUpdateFields): Promise<MatchInfo> {
    try {
      this._loading$.next(true);
      this._error$.next(null);

      const currentMatch = await this.getMatchById(id);
      if (!currentMatch) {
        throw new Error(`Match with ID ${id} not found`);
      }

      // Merge updates
      const updatedMatch: MatchInfo = {
        ...currentMatch,
        ...updates,
        id, // Ensure ID cannot be changed
        updatedAt: new Date().toISOString(),
        version: currentMatch.version + 1
      };

      // Recalculate finances if relevant data changed
      if (this.shouldRecalculateFinances(updates)) {
        updatedMatch.finances = this.calculateMatchFinances(updatedMatch);
      }

      // Validate updated data
      const validation = this.validateMatchData(updatedMatch);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Save to storage
      await this.saveMatchToStorage(updatedMatch);
      
      // Update local state
      const currentMatches = this._matches$.value;
      currentMatches.set(id, updatedMatch);
      this._matches$.next(new Map(currentMatches));

      // Clear cache for this match
      this.matchCache.delete(id);

      // Update player statistics if match is completed
      if (updatedMatch.status === MatchStatus.COMPLETED) {
        await this.updatePlayerStatistics(updatedMatch);
      }

      console.log('✅ Match updated successfully:', updatedMatch.date);
      return updatedMatch;

    } catch (error) {
      const errorMessage = `Failed to update match: ${error.message}`;
      this._error$.next(errorMessage);
      console.error('❌', errorMessage, error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async deleteMatch(id: string): Promise<boolean> {
    try {
      this._loading$.next(true);
      this._error$.next(null);

      const match = await this.getMatchById(id);
      if (!match) {
        throw new Error(`Match with ID ${id} not found`);
      }

      // Remove from storage
      await this.removeMatchFromStorage(id);
      
      // Update local state
      const currentMatches = this._matches$.value;
      currentMatches.delete(id);
      this._matches$.next(new Map(currentMatches));

      // Clear cache
      this.matchCache.delete(id);

      console.log('✅ Match deleted successfully:', match.date);
      return true;

    } catch (error) {
      const errorMessage = `Failed to delete match: ${error.message}`;
      this._error$.next(errorMessage);
      console.error('❌', errorMessage, error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  // Match retrieval methods
  async getMatchById(id: string): Promise<MatchInfo | null> {
    // Check cache first
    const cached = this.matchCache.get(id);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    // Get from state
    const match = this._matches$.value.get(id) || null;
    
    if (match) {
      // Update cache
      this.matchCache.set(id, { data: match, timestamp: Date.now() });
    }

    return match;
  }

  // Team formation methods
  async createTeamFromPlayers(playerIds: string[], teamColor: TeamColor): Promise<TeamComposition> {
    const players: PlayerInfo[] = [];
    
    for (const playerId of playerIds) {
      const player = await this.playerService.getPlayerById(playerId);
      if (player) {
        players.push(player);
      }
    }

    return {
      name: this.getTeamNameByColor(teamColor),
      players,
      teamColor,
      formation: this.suggestFormation(players.length)
    };
  }

  getTeamBalance(teamA: TeamComposition, teamB: TeamComposition): Observable<{
    isBalanced: boolean;
    recommendations: string[];
    balanceScore: number;
  }> {
    return this.playerService.getTeamBalanceRecommendations([
      ...teamA.players.map(p => p.id!),
      ...teamB.players.map(p => p.id!)
    ]).pipe(
      map(balance => ({
        isBalanced: balance.balanceScore > 75,
        recommendations: balance.recommendations,
        balanceScore: balance.balanceScore
      }))
    );
  }

  // Match event management
  async addGoal(matchId: string, team: TeamSide, goalDetail: Omit<GoalDetail, 'goalType'>): Promise<MatchInfo> {
    const match = await this.getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    const goal: GoalDetail = {
      ...goalDetail,
      goalType: GoalType.REGULAR
    };

    const updatedResult = { ...match.result };
    
    if (team === 'A') {
      updatedResult.goalsA = [...updatedResult.goalsA, goal];
      updatedResult.scoreA += 1;
    } else {
      updatedResult.goalsB = [...updatedResult.goalsB, goal];
      updatedResult.scoreB += 1;
    }

    // Add match event
    const event: MatchEvent = {
      id: this.generateEventId(),
      type: EventType.GOAL,
      minute: goalDetail.minute,
      description: `Bàn thắng của ${goalDetail.playerName}`,
      playerId: goalDetail.playerId,
      teamId: team,
      timestamp: new Date().toISOString()
    };

    updatedResult.events = [...updatedResult.events, event];

    return await this.updateMatch(matchId, { result: updatedResult });
  }

  async addCard(matchId: string, team: TeamSide, cardDetail: CardDetail): Promise<MatchInfo> {
    const match = await this.getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    const updatedResult = { ...match.result };
    
    if (team === 'A') {
      if (cardDetail.cardType === CardType.YELLOW) {
        updatedResult.yellowCardsA = [...updatedResult.yellowCardsA, cardDetail];
      } else {
        updatedResult.redCardsA = [...updatedResult.redCardsA, cardDetail];
      }
    } else {
      if (cardDetail.cardType === CardType.YELLOW) {
        updatedResult.yellowCardsB = [...updatedResult.yellowCardsB, cardDetail];
      } else {
        updatedResult.redCardsB = [...updatedResult.redCardsB, cardDetail];
      }
    }

    // Add match event
    const event: MatchEvent = {
      id: this.generateEventId(),
      type: cardDetail.cardType === CardType.YELLOW ? EventType.YELLOW_CARD : EventType.RED_CARD,
      minute: cardDetail.minute,
      description: `Thẻ ${cardDetail.cardType === CardType.YELLOW ? 'vàng' : 'đỏ'} cho ${cardDetail.playerName}`,
      playerId: cardDetail.playerId,
      teamId: team,
      timestamp: new Date().toISOString()
    };

    updatedResult.events = [...updatedResult.events, event];

    return await this.updateMatch(matchId, { result: updatedResult });
  }

  // Financial calculations
  calculateMatchFinances(match: MatchInfo): MatchFinances {
    const rates = match.finances?.customRates || DEFAULT_FINANCIAL_RATES;
    
    // Calculate revenue
    const revenue = this.calculateRevenue(match, rates);
    
    // Get expenses (these should be input manually)
    const expenses = match.finances?.expenses || {
      referee: 0,
      field: 0,
      water: 0,
      transportation: 0,
      food: 0,
      equipment: 0,
      other: 0,
      fixed: 0,
      variable: 0
    };

    const totalRevenue = Object.values(revenue).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);

    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      revenueMode: match.finances?.revenueMode || 'auto',
      customRates: match.finances?.customRates || {
        winnerFee: DEFAULT_FINANCIAL_RATES.WINNER_FEE,
        loserFee: DEFAULT_FINANCIAL_RATES.LOSER_FEE,
        yellowCardFee: DEFAULT_FINANCIAL_RATES.YELLOW_CARD_FEE,
        redCardFee: DEFAULT_FINANCIAL_RATES.RED_CARD_FEE
      }
    };
  }

  private calculateRevenue(match: MatchInfo, rates: CustomRates | typeof DEFAULT_FINANCIAL_RATES): {
    winnerFees: number;
    loserFees: number;
    cardPenalties: number;
    otherRevenue: number;
    teamARevenue: number;
    teamBRevenue: number;
    penaltyRevenue: number;
  } {
    const result = match.result;
    
    // Determine winner
    let teamARevenue = 0;
    let teamBRevenue = 0;
    
    // Type-safe rate access
    const winnerFee = this.getRateValue(rates, 'winnerFee', 'WINNER_FEE', 40000);
    const loserFee = this.getRateValue(rates, 'loserFee', 'LOSER_FEE', 60000);
    const yellowFee = this.getRateValue(rates, 'yellowCardFee', 'YELLOW_CARD_FEE', 50000);
    const redFee = this.getRateValue(rates, 'redCardFee', 'RED_CARD_FEE', 100000);

    if (result.scoreA > result.scoreB) {
      // Team A wins
      teamARevenue += winnerFee * match.teamA.players.length;
      teamBRevenue += loserFee * match.teamB.players.length;
    } else if (result.scoreB > result.scoreA) {
      // Team B wins
      teamBRevenue += winnerFee * match.teamB.players.length;
      teamARevenue += loserFee * match.teamA.players.length;
    } else {
      // Draw
      const drawFee = (winnerFee + loserFee) / 2;
      teamARevenue += drawFee * match.teamA.players.length;
      teamBRevenue += drawFee * match.teamB.players.length;
    }

    // Calculate penalty revenue
    const penaltyRevenue = 
      (result.yellowCardsA.length + result.yellowCardsB.length) * yellowFee +
      (result.redCardsA.length + result.redCardsB.length) * redFee;

    return {
      winnerFees: teamARevenue > teamBRevenue ? teamARevenue : teamBRevenue,
      loserFees: teamARevenue < teamBRevenue ? teamARevenue : teamBRevenue,
      cardPenalties: penaltyRevenue,
      otherRevenue: 0,
      teamARevenue,
      teamBRevenue,
      penaltyRevenue
    };
  }

  // Match analytics
  getMatchAnalytics(matchId: string): Observable<MatchAnalytics> {
    return this.matches$.pipe(
      map(matches => {
        const match = matches.find(m => m.id === matchId);
        if (!match) throw new Error('Match not found');

        return this.calculateMatchAnalytics(match);
      })
    );
  }

  private calculateMatchAnalytics(match: MatchInfo): MatchAnalytics {
    const matchQuality = this.calculateMatchQuality(match);
    const teamAnalysis = this.calculateTeamAnalysis(match);
    const financialSummary = this.calculateFinancialSummary(match);
    const playerPerformance = this.calculatePlayerPerformance(match);

    return {
      matchQuality,
      teamAnalysis,
      financialSummary,
      playerPerformance
    };
  }

  private calculateMatchQuality(match: MatchInfo): {
    overallRating: number;
    competitiveness: number;
    entertainment: number;
    fairPlay: number;
    organization: number;
  } {
    const result = match.result;
    const totalGoals = result.scoreA + result.scoreB;
    const totalCards = result.yellowCardsA.length + result.yellowCardsB.length + 
                      (result.redCardsA.length + result.redCardsB.length) * 3;

    // Entertainment based on goals
    const entertainment = Math.min(100, totalGoals * 20);
    
    // Fair play based on cards (fewer cards = better)
    const fairPlay = Math.max(0, 100 - totalCards * 10);
    
    // Competitiveness based on score difference
    const scoreDiff = Math.abs(result.scoreA - result.scoreB);
    const competitiveness = Math.max(0, 100 - scoreDiff * 20);
    
    const overallRating = (entertainment + fairPlay + competitiveness) / 3;

    return {
      overallRating: Math.round(overallRating),
      competitiveness: Math.round(competitiveness),
      entertainment: Math.round(entertainment),
      fairPlay: Math.round(fairPlay),
      organization: 85 // Default organization score
    };
  }

  private calculateTeamAnalysis(match: MatchInfo): {
    teamA: {
      strength: number;
      chemistry: number;
      experience: number;
      predicted_performance: number;
      actual_performance: number;
    };
    teamB: {
      strength: number;
      chemistry: number;
      experience: number;
      predicted_performance: number;
      actual_performance: number;
    };
    balance: {
      experienceBalance: number;
      skillBalance: number;
      sizeBalance: number;
      overallBalance: number;
    };
  } {
    // Simplified team analysis
    const teamAStrength = this.calculateTeamStrength(match.teamA.players);
    const teamBStrength = this.calculateTeamStrength(match.teamB.players);
    
    return {
      teamA: {
        strength: teamAStrength,
        chemistry: 75, // Default
        experience: this.calculateTeamExperience(match.teamA.players),
        predicted_performance: teamAStrength,
        actual_performance: this.calculateActualPerformance(match, 'A')
      },
      teamB: {
        strength: teamBStrength,
        chemistry: 75, // Default
        experience: this.calculateTeamExperience(match.teamB.players),
        predicted_performance: teamBStrength,
        actual_performance: this.calculateActualPerformance(match, 'B')
      },
      balance: {
        experienceBalance: 80,
        skillBalance: 75,
        sizeBalance: Math.abs(match.teamA.players.length - match.teamB.players.length) <= 1 ? 100 : 60,
        overallBalance: 80
      }
    };
  }

  private calculateFinancialSummary(match: MatchInfo): {
    profitability: number;
    costEfficiency: number;
    revenueOptimization: number;
    suggestions: string[];
  } {
    const finances = match.finances;
    const profitability = finances.netProfit > 0 ? 100 : 0;
    const costEfficiency = finances.totalExpenses > 0 ? 
      (finances.totalRevenue / finances.totalExpenses) * 50 : 100;

    return {
      profitability: Math.round(profitability),
      costEfficiency: Math.round(Math.min(100, costEfficiency)),
      revenueOptimization: 80, // Default
      suggestions: this.getFinancialSuggestions(finances)
    };
  }

  private calculatePlayerPerformance(match: MatchInfo): {
    playerId: string;
    playerName: string;
    team: 'A' | 'B';
    goals: number;
    assists: number;
    cards: number;
    performanceRating: number;
    impactRating: number;
    revenueGenerated: number;
    penaltiesCaused: number;
  }[] {
    const performances: {
      playerId: string;
      playerName: string;
      team: 'A' | 'B';
      goals: number;
      assists: number;
      cards: number;
      performanceRating: number;
      impactRating: number;
      revenueGenerated: number;
      penaltiesCaused: number;
    }[] = [];
    
    // Process Team A players
    match.teamA.players.forEach(player => {
      const goals = match.result.goalsA.filter(g => g.playerId === player.id).length;
      const assists = match.result.goalsA.filter(g => g.assistedBy === player.id).length;
      const cards = (match.result.yellowCardsA.filter(c => c.playerId === player.id).length) +
                   (match.result.redCardsA.filter(c => c.playerId === player.id).length * 3);

      performances.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName || ''}`,
        team: 'A' as const,
        goals,
        assists,
        cards,
        performanceRating: this.calculatePerformanceRating(goals, assists, cards),
        impactRating: this.calculateImpactRating(goals, assists, cards),
        revenueGenerated: this.calculatePlayerRevenue(match, 'A', player.id!),
        penaltiesCaused: cards * 50000
      });
    });

    // Process Team B players
    match.teamB.players.forEach(player => {
      const goals = match.result.goalsB.filter(g => g.playerId === player.id).length;
      const assists = match.result.goalsB.filter(g => g.assistedBy === player.id).length;
      const cards = (match.result.yellowCardsB.filter(c => c.playerId === player.id).length) +
                   (match.result.redCardsB.filter(c => c.playerId === player.id).length * 3);

      performances.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName || ''}`,
        team: 'B' as const,
        goals,
        assists,
        cards,
        performanceRating: this.calculatePerformanceRating(goals, assists, cards),
        impactRating: this.calculateImpactRating(goals, assists, cards),
        revenueGenerated: this.calculatePlayerRevenue(match, 'B', player.id!),
        penaltiesCaused: cards * 50000
      });
    });

    return performances;
  }

  // Search and filtering
  updateSearchCriteria(criteria: Partial<MatchSearchCriteria>): void {
    const currentCriteria = this._searchCriteria$.value;
    this._searchCriteria$.next({ ...currentCriteria, ...criteria });
  }

  updateSortOptions(sortOptions: MatchSortOptions): void {
    this._sortOptions$.next(sortOptions);
  }

  clearSearch(): void {
    this._searchCriteria$.next({});
  }

  // Current match management
  setCurrentMatch(matchId: string): void {
    this.getMatchById(matchId).then(match => {
      this._currentMatch$.next(match);
    });
  }

  clearCurrentMatch(): void {
    this._currentMatch$.next(null);
  }

  // Utility methods
  exportMatchData(): string {
    const matches = Array.from(this._matches$.value.values());
    return JSON.stringify(matches, null, 2);
  }

  async importMatchData(jsonData: string): Promise<number> {
    try {
      const matchesData = JSON.parse(jsonData) as MatchInfo[];
      let importedCount = 0;

      for (const matchData of matchesData) {
        try {
          await this.createMatch(matchData);
          importedCount++;
        } catch (error) {
          console.warn(`Failed to import match ${matchData.date}:`, error);
        }
      }

      return importedCount;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  // Private helper methods
  private async initializeMatchData(): Promise<void> {
    try {
      this._loading$.next(true);
      await this.loadMatchesFromStorage();
    } catch (error) {
      console.error('Failed to initialize match data:', error);
      this._error$.next('Failed to load match data');
    } finally {
      this._loading$.next(false);
    }
  }

  private async loadMatchesFromStorage(): Promise<void> {
    try {
      // Load from localStorage for now
      const matchesData = localStorage.getItem('matchHistory');
      const matchesMap = new Map<string, MatchInfo>();

      if (matchesData) {
        const matches = JSON.parse(matchesData) as MatchInfo[];
        matches.forEach(match => {
          const validatedMatch = this.migrateMatchData(match);
          matchesMap.set(validatedMatch.id, validatedMatch);
        });
      }

      this._matches$.next(matchesMap);
      console.log('✅ Loaded', matchesMap.size, 'matches from storage');

    } catch (error) {
      console.error('Failed to load matches from storage:', error);
      throw error;
    }
  }

  private async saveMatchToStorage(match: MatchInfo): Promise<void> {
    try {
      // Save to localStorage
      const currentMatches = Array.from(this._matches$.value.values());
      const updatedMatches = currentMatches.filter(m => m.id !== match.id);
      updatedMatches.push(match);
      
      localStorage.setItem('matchHistory', JSON.stringify(updatedMatches));
      console.log('✅ Match saved to localStorage');
      
      // Also save to Firebase history for real-time database persistence
      const historyEntry = {
        date: match.date,
        description: `Trận đấu ngày ${match.date}`,
        
        // Map team data to simple arrays
        teamA: match.teamA?.players?.map(p => `${p.firstName} ${p.lastName}`.trim()) || [],
        teamB: match.teamB?.players?.map(p => `${p.firstName} ${p.lastName}`.trim()) || [],
        
        // Map scores
        scoreA: match.result?.scoreA || 0,
        scoreB: match.result?.scoreB || 0,
        
        // Map goal scorers (include ALL scorers as comma-separated)
        scorerA: match.result?.goalsA?.map(g => g.playerName).join(', ') || '',
        scorerB: match.result?.goalsB?.map(g => g.playerName).join(', ') || '',
        
        // Map assists (include ALL assists as comma-separated)
        assistA: match.result?.goalsA?.map(g => g.assistedBy).filter(a => a).join(', ') || '',
        assistB: match.result?.goalsB?.map(g => g.assistedBy).filter(a => a).join(', ') || '',
        
        // Map cards (convert arrays to comma-separated strings)
        yellowA: match.result?.yellowCardsA?.map(c => c.playerName).join(', ') || '',
        yellowB: match.result?.yellowCardsB?.map(c => c.playerName).join(', ') || '',
        redA: match.result?.redCardsA?.map(c => c.playerName).join(', ') || '',
        redB: match.result?.redCardsB?.map(c => c.playerName).join(', ') || '',
        
        // Map financial data
        thu: (match.finances?.revenue?.teamARevenue || 0) + (match.finances?.revenue?.teamBRevenue || 0),
        thuMode: 'auto' as const,
        chi_total: (match.finances?.expenses?.referee || 0) + (match.finances?.expenses?.water || 0) + (match.finances?.expenses?.field || 0) + (match.finances?.expenses?.transportation || 0) + (match.finances?.expenses?.food || 0) + (match.finances?.expenses?.equipment || 0) + (match.finances?.expenses?.other || 0),
        
        // Metadata
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        lastSaved: new Date().toISOString()
      };
      
      await this.firebaseService.addHistoryEntry(historyEntry);
      console.log('✅ Match saved to Firebase history');
      
    } catch (error) {
      console.error('❌ Failed to save match to storage:', error);
      throw error;
    }
  }

  private async removeMatchFromStorage(id: string): Promise<void> {
    try {
      const currentMatches = Array.from(this._matches$.value.values());
      const filteredMatches = currentMatches.filter(m => m.id !== id);
      
      localStorage.setItem('matchHistory', JSON.stringify(filteredMatches));
    } catch (error) {
      console.error('Failed to remove match from storage:', error);
      throw error;
    }
  }

  private validateMatchData(matchData: Partial<MatchInfo>): MatchValidation {
    const errors: { field: keyof MatchInfo; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: { field: keyof MatchInfo; message: string }[] = [];

    // Required fields validation
    if (!matchData.date) {
      errors.push({ field: 'date', message: 'Ngày trận đấu là bắt buộc', severity: 'error' });
    }

    if (!matchData.teamA || !matchData.teamB) {
      errors.push({ field: 'teamA', message: 'Cần có đủ 2 đội', severity: 'error' });
    }

    // Team size validation
    if (matchData.teamA && matchData.teamB) {
      const teamASize = matchData.teamA.players?.length || 0;
      const teamBSize = matchData.teamB.players?.length || 0;
      
      if (Math.abs(teamASize - teamBSize) > 2) {
        warnings.push({ field: 'teamA', message: 'Đội hình không cân bằng về số lượng cầu thủ' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private filterMatches(matches: MatchInfo[], criteria: MatchSearchCriteria): MatchInfo[] {
    return matches.filter(match => {
      if (criteria.dateFrom && match.date < criteria.dateFrom) {
        return false;
      }
      
      if (criteria.dateTo && match.date > criteria.dateTo) {
        return false;
      }
      
      if (criteria.status && match.status !== criteria.status) {
        return false;
      }
      
      if (criteria.teamPlayer) {
        const hasPlayer = 
          match.teamA.players.some(p => 
            p.firstName.toLowerCase().includes(criteria.teamPlayer!.toLowerCase())
          ) ||
          match.teamB.players.some(p => 
            p.firstName.toLowerCase().includes(criteria.teamPlayer!.toLowerCase())
          );
        
        if (!hasPlayer) return false;
      }
      
      return true;
    });
  }

  private sortMatches(matches: MatchInfo[], sortOptions: MatchSortOptions): MatchInfo[] {
    return matches.sort((a, b) => {
      let aVal: string | number | Date, bVal: string | number | Date;
      
      if (sortOptions.field === 'totalGoals') {
        aVal = a.result.scoreA + a.result.scoreB;
        bVal = b.result.scoreA + b.result.scoreB;
      } else if (sortOptions.field === 'profit') {
        aVal = a.finances.netProfit;
        bVal = b.finances.netProfit;
      } else {
        aVal = a[sortOptions.field as keyof MatchInfo] as string | number | Date;
        bVal = b[sortOptions.field as keyof MatchInfo] as string | number | Date;
      }
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      
      return sortOptions.direction === 'desc' ? -comparison : comparison;
    });
  }

  private shouldRecalculateFinances(updates: MatchUpdateFields): boolean {
    return !!(updates.result || updates.teamA || updates.teamB);
  }

  private async updatePlayerStatistics(match: MatchInfo): Promise<void> {
    // Update player statistics based on match results
    // This would integrate with PlayerService to update stats
    console.log('Updating player statistics for match:', match.date);
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTeamNameByColor(color: TeamColor): string {
    switch (color) {
      case TeamColor.BLUE: return 'Đội Xanh';
      case TeamColor.ORANGE: return 'Đội Cam';
      case TeamColor.RED: return 'Đội Đỏ';
      case TeamColor.GREEN: return 'Đội Xanh Lá';
      default: return 'Đội Không Xác Định';
    }
  }

  private suggestFormation(playerCount: number): string {
    if (playerCount <= 5) return '3-2';
    if (playerCount <= 7) return '4-3';
    if (playerCount <= 9) return '4-3-2';
    return '4-4-2';
  }

  private calculateTeamStrength(players: PlayerInfo[]): number {
    if (players.length === 0) return 0;
    
    const totalStrength = players.reduce((sum, player) => {
      const winRate = player.stats.winRate || 0;
      const experience = Math.min(player.stats.totalMatches, 50) * 2;
      const performance = (player.stats.averageGoalsPerMatch * 20) + 
                         (player.stats.averageAssistsPerMatch * 15);
      
      return sum + (winRate + experience + performance) / 3;
    }, 0);
    
    return Math.round(totalStrength / players.length);
  }

  private calculateTeamExperience(players: PlayerInfo[]): number {
    if (players.length === 0) return 0;
    
    const totalMatches = players.reduce((sum, p) => sum + p.stats.totalMatches, 0);
    return Math.min(100, (totalMatches / players.length) * 5);
  }

  private calculateActualPerformance(match: MatchInfo, team: TeamSide): number {
    const score = team === 'A' ? match.result.scoreA : match.result.scoreB;
    const cards = team === 'A' ? 
      match.result.yellowCardsA.length + match.result.redCardsA.length * 3 :
      match.result.yellowCardsB.length + match.result.redCardsB.length * 3;
    
    return Math.max(0, (score * 25) - (cards * 10));
  }

  private calculatePerformanceRating(goals: number, assists: number, cards: number): number {
    return Math.max(0, Math.min(100, (goals * 30) + (assists * 20) - (cards * 15) + 50));
  }

  private calculateImpactRating(goals: number, assists: number, cards: number): number {
    return Math.max(0, Math.min(100, (goals * 40) + (assists * 25) - (cards * 10) + 40));
  }

  private calculatePlayerRevenue(match: MatchInfo, team: TeamSide, playerId: string): number {
    // Base revenue per player
    const totalPlayers = match.teamA.players.length + match.teamB.players.length;
    const baseRevenue = match.finances.totalRevenue / totalPlayers;
    
    // Add bonus for goals/assists by this player
    const goals = team === 'A' ? 
      match.result.goalsA.filter(g => g.playerId === playerId).length :
      match.result.goalsB.filter(g => g.playerId === playerId).length;
    
    const assists = team === 'A' ?
      match.result.goalsA.filter(g => g.assistedBy === playerId).length :
      match.result.goalsB.filter(g => g.assistedBy === playerId).length;
    
    const performanceBonus = (goals * 10000) + (assists * 5000);
    
    return Math.round(baseRevenue + performanceBonus);
  }

  private getFinancialSuggestions(finances: MatchFinances): string[] {
    const suggestions: string[] = [];
    
    if (finances.netProfit < 0) {
      suggestions.push('Cần giảm chi phí hoặc tăng thu nhập');
    }
    
    if (finances.expenses.other > finances.totalRevenue * 0.3) {
      suggestions.push('Chi phí khác quá cao, cần kiểm soát');
    }
    
    return suggestions;
  }

  private getRateValue(
    rates: CustomRates | typeof DEFAULT_FINANCIAL_RATES, 
    customKey: keyof CustomRates, 
    defaultKey: keyof typeof DEFAULT_FINANCIAL_RATES, 
    fallback: number
  ): number {
    if ('winnerFee' in rates) {
      return (rates as CustomRates)[customKey] || fallback;
    } else {
      return (rates as typeof DEFAULT_FINANCIAL_RATES)[defaultKey] || fallback;
    }
  }

  private migrateMatchData(match: Partial<MatchInfo> & { id?: string }): MatchInfo {
    // Ensure backward compatibility with old match data
    if (!match.date || !match.teamA || !match.teamB || !match.result || !match.finances) {
      throw new Error('Invalid match data: missing required fields');
    }
    
    return {
      ...match,
      id: match.id || this.generateMatchId(),
      date: match.date,
      teamA: match.teamA,
      teamB: match.teamB,
      result: match.result,
      finances: match.finances,
      status: match.status || MatchStatus.COMPLETED,
      statistics: match.statistics || DEFAULT_MATCH_STATISTICS,
      version: match.version || 1,
      createdAt: match.createdAt || new Date().toISOString(),
      updatedAt: match.updatedAt || new Date().toISOString()
    } as MatchInfo;
  }
}