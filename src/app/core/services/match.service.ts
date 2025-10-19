/**
 * Core Match Management Service
 * Clean rebuilt version (single class) after refactor.
 * Delegates finances & validation to specialized services.
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  MatchInfo,
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
  DEFAULT_MATCH_STATISTICS
} from '../models/match.model';
import { PlayerInfo } from '../models/player.model';
import { PlayerService } from './player.service';
import { FirebaseService } from '../../services/firebase.service';
import { MatchFinancesService } from './match-finances.service';
import { MatchValidationService } from './match-validation.service';

@Injectable({ providedIn: 'root' })
export class MatchService {
  // Injected dependencies
  private readonly playerService = inject(PlayerService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly financesService = inject(MatchFinancesService);
  private readonly validationService = inject(MatchValidationService);

  // Reactive state
  private readonly _matches$ = new BehaviorSubject<Map<string, MatchInfo>>(new Map());
  private readonly _currentMatch$ = new BehaviorSubject<MatchInfo | null>(null);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _searchCriteria$ = new BehaviorSubject<MatchSearchCriteria>({});
  private readonly _sortOptions$ = new BehaviorSubject<MatchSortOptions>({ field: 'date', direction: 'desc' });

  // Simple in-memory cache
  private matchCache = new Map<string, { data: MatchInfo; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeMatchData();
  }
  // ---------- Public Observables ----------
  get matches$(): Observable<MatchInfo[]> {
    return combineLatest([
      this._matches$,
      this._searchCriteria$,
      this._sortOptions$
    ]).pipe(
      map(([matchesMap, criteria, sort]) => {
        let matches = Array.from(matchesMap.values());
        matches = this.filterMatches(matches, criteria);
        matches = this.sortMatches(matches, sort);
        return matches;
      })
    );
  }
  get currentMatch$(): Observable<MatchInfo | null> { return this._currentMatch$.asObservable(); }
  get completedMatches$(): Observable<MatchInfo[]> { return this.matches$.pipe(map(ms => ms.filter(m => m.status === MatchStatus.COMPLETED))); }
  get upcomingMatches$(): Observable<MatchInfo[]> { return this.matches$.pipe(map(ms => ms.filter(m => m.status === MatchStatus.SCHEDULED))); }
  get loading$(): Observable<boolean> { return this._loading$.asObservable(); }
  get error$(): Observable<string | null> { return this._error$.asObservable(); }

  // ---------- CRUD ----------
  async createMatch(matchData: Omit<MatchInfo, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<MatchInfo> {
    try {
      this._loading$.next(true); this._error$.next(null);
      const validation: MatchValidation = this.validationService.validate(matchData);
      if (!validation.isValid) throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      const id = this.generateMatchId();
      const newMatch: MatchInfo = { ...matchData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 };
      newMatch.finances = this.financesService.calculate(newMatch);
      await this.saveMatchToStorage(newMatch);
      const mapRef = this._matches$.value; mapRef.set(id, newMatch); this._matches$.next(new Map(mapRef));
      return newMatch;
    } catch (e) {
      const msg = `Failed to create match: ${(e as Error).message}`; this._error$.next(msg); throw e;
    } finally { this._loading$.next(false); }
  }

  async updateMatch(id: string, updates: MatchUpdateFields): Promise<MatchInfo> {
    try {
      this._loading$.next(true); this._error$.next(null);
      const current = await this.getMatchById(id); if (!current) throw new Error(`Match with ID ${id} not found`);
      const updated: MatchInfo = { ...current, ...updates, id, updatedAt: new Date().toISOString(), version: current.version + 1 };
      if (this.shouldRecalculateFinances(updates)) updated.finances = this.financesService.calculate(updated);
      const validation = this.validationService.validate(updated); if (!validation.isValid) throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      await this.saveMatchToStorage(updated);
      const mapRef = this._matches$.value; mapRef.set(id, updated); this._matches$.next(new Map(mapRef));
      this.matchCache.delete(id);
  if (updated.status === MatchStatus.COMPLETED) await this.updatePlayerStatistics();
      return updated;
    } catch (e) {
      const msg = `Failed to update match: ${(e as Error).message}`; this._error$.next(msg); throw e;
    } finally { this._loading$.next(false); }
  }

  async deleteMatch(id: string): Promise<boolean> {
    try {
      this._loading$.next(true); this._error$.next(null);
      const match = await this.getMatchById(id); if (!match) throw new Error(`Match with ID ${id} not found`);
      await this.removeMatchFromStorage(id);
      const mapRef = this._matches$.value; mapRef.delete(id); this._matches$.next(new Map(mapRef));
      this.matchCache.delete(id);
      return true;
    } catch (e) {
      const msg = `Failed to delete match: ${(e as Error).message}`; this._error$.next(msg); throw e;
    } finally { this._loading$.next(false); }
  }

  async getMatchById(id: string): Promise<MatchInfo | null> {
    const cached = this.matchCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) return cached.data;
    const match = this._matches$.value.get(id) || null;
    if (match) this.matchCache.set(id, { data: match, timestamp: Date.now() });
    return match;
  }

  // ---------- Team Formation ----------
  async createTeamFromPlayers(playerIds: string[], teamColor: TeamColor): Promise<TeamComposition> {
    const players: PlayerInfo[] = [];
    for (const pid of playerIds) { const p = await this.playerService.getPlayerById(pid); if (p) players.push(p); }
    return { name: this.getTeamNameByColor(teamColor), players, teamColor, formation: this.suggestFormation(players.length) };
  }

  getTeamBalance(teamA: TeamComposition, teamB: TeamComposition): Observable<{ isBalanced: boolean; recommendations: string[]; balanceScore: number; }> {
    return this.playerService.getTeamBalanceRecommendations([
      ...teamA.players.map(p => p.id!),
      ...teamB.players.map(p => p.id!)
    ]).pipe(
      map(b => ({ isBalanced: b.balanceScore > 75, recommendations: b.recommendations, balanceScore: b.balanceScore }))
    );
  }

  // ---------- Events ----------
  async addGoal(matchId: string, team: TeamSide, goalDetail: Omit<GoalDetail, 'goalType'>): Promise<MatchInfo> {
    const match = await this.getMatchById(matchId); if (!match) throw new Error('Match not found');
    const goal: GoalDetail = { ...goalDetail, goalType: GoalType.REGULAR };
    const result = { ...match.result };
    if (team === 'A') { result.goalsA = [...result.goalsA, goal]; result.scoreA++; } else { result.goalsB = [...result.goalsB, goal]; result.scoreB++; }
    const event: MatchEvent = { id: this.generateEventId(), type: EventType.GOAL, minute: goalDetail.minute, description: `Bàn thắng của ${goalDetail.playerName}`, playerId: goalDetail.playerId, teamId: team, timestamp: new Date().toISOString() };
    result.events = [...result.events, event];
    return this.updateMatch(matchId, { result });
  }

  async addCard(matchId: string, team: TeamSide, cardDetail: CardDetail): Promise<MatchInfo> {
    const match = await this.getMatchById(matchId); if (!match) throw new Error('Match not found');
    const result = { ...match.result };
    if (team === 'A') {
      if (cardDetail.cardType === CardType.YELLOW) result.yellowCardsA = [...result.yellowCardsA, cardDetail]; else result.redCardsA = [...result.redCardsA, cardDetail];
    } else {
      if (cardDetail.cardType === CardType.YELLOW) result.yellowCardsB = [...result.yellowCardsB, cardDetail]; else result.redCardsB = [...result.redCardsB, cardDetail];
    }
    const event: MatchEvent = { id: this.generateEventId(), type: cardDetail.cardType === CardType.YELLOW ? EventType.YELLOW_CARD : EventType.RED_CARD, minute: cardDetail.minute, description: `Thẻ ${cardDetail.cardType === CardType.YELLOW ? 'vàng' : 'đỏ'} cho ${cardDetail.playerName}`, playerId: cardDetail.playerId, teamId: team, timestamp: new Date().toISOString() };
    result.events = [...result.events, event];
    return this.updateMatch(matchId, { result });
  }

  // ---------- Analytics ----------
  getMatchAnalytics(matchId: string): Observable<MatchAnalytics> {
    return this.matches$.pipe(map(arr => { const match = arr.find(m => m.id === matchId); if (!match) throw new Error('Match not found'); return this.calculateMatchAnalytics(match); }));
  }
  private calculateMatchAnalytics(match: MatchInfo): MatchAnalytics {
    const matchQuality = this.calculateMatchQuality(match);
    const teamAnalysis = this.calculateTeamAnalysis(match);
    const financialSummary = this.buildFinancialSummary(match);
    const playerPerformance = this.calculatePlayerPerformance(match);
    return { matchQuality, teamAnalysis, financialSummary, playerPerformance };
  }
  private calculateMatchQuality(match: MatchInfo): { overallRating: number; competitiveness: number; entertainment: number; fairPlay: number; organization: number; } {
    const r = match.result; const totalGoals = r.scoreA + r.scoreB; const totalCards = r.yellowCardsA.length + r.yellowCardsB.length + (r.redCardsA.length + r.redCardsB.length) * 3;
    const entertainment = Math.min(100, totalGoals * 20); const fairPlay = Math.max(0, 100 - totalCards * 10); const diff = Math.abs(r.scoreA - r.scoreB); const competitiveness = Math.max(0, 100 - diff * 20); const overall = (entertainment + fairPlay + competitiveness) / 3;
    return { overallRating: Math.round(overall), competitiveness: Math.round(competitiveness), entertainment: Math.round(entertainment), fairPlay: Math.round(fairPlay), organization: 85 };
  }
  private calculateTeamAnalysis(match: MatchInfo): { teamA: { strength: number; chemistry: number; experience: number; predicted_performance: number; actual_performance: number; }; teamB: { strength: number; chemistry: number; experience: number; predicted_performance: number; actual_performance: number; }; balance: { experienceBalance: number; skillBalance: number; sizeBalance: number; overallBalance: number; }; } {
    const aStr = this.calculateTeamStrength(match.teamA.players); const bStr = this.calculateTeamStrength(match.teamB.players);
    return { teamA: { strength: aStr, chemistry: 75, experience: this.calculateTeamExperience(match.teamA.players), predicted_performance: aStr, actual_performance: this.calculateActualPerformance(match, 'A') }, teamB: { strength: bStr, chemistry: 75, experience: this.calculateTeamExperience(match.teamB.players), predicted_performance: bStr, actual_performance: this.calculateActualPerformance(match, 'B') }, balance: { experienceBalance: 80, skillBalance: 75, sizeBalance: Math.abs(match.teamA.players.length - match.teamB.players.length) <= 1 ? 100 : 60, overallBalance: 80 } };
  }
  private buildFinancialSummary(match: MatchInfo): { profitability: number; costEfficiency: number; revenueOptimization: number; suggestions: string[]; } {
    const f = match.finances; const profitability = f.netProfit > 0 ? 100 : 0; const costEffRaw = f.totalExpenses > 0 ? (f.totalRevenue / f.totalExpenses) * 50 : 100; const costEfficiency = Math.min(100, Math.max(0, costEffRaw)); const suggestions: string[] = []; if (f.netProfit < 0) suggestions.push('Cần giảm chi phí hoặc tăng thu nhập'); if (f.expenses.other > f.totalRevenue * 0.3) suggestions.push('Chi phí khác quá cao, cần kiểm soát'); return { profitability, costEfficiency: Math.round(costEfficiency), revenueOptimization: 80, suggestions }; }
  private calculatePlayerPerformance(match: MatchInfo): { playerId: string; playerName: string; team: 'A' | 'B'; goals: number; assists: number; cards: number; performanceRating: number; impactRating: number; revenueGenerated: number; penaltiesCaused: number; }[] {
    const perf: { playerId: string; playerName: string; team: 'A' | 'B'; goals: number; assists: number; cards: number; performanceRating: number; impactRating: number; revenueGenerated: number; penaltiesCaused: number; }[] = [];
    match.teamA.players.forEach(p => { const goals = match.result.goalsA.filter(g => g.playerId === p.id).length; const assists = match.result.goalsA.filter(g => g.assistedBy === p.id).length; const cards = match.result.yellowCardsA.filter(c => c.playerId === p.id).length + match.result.redCardsA.filter(c => c.playerId === p.id).length * 3; perf.push({ playerId: p.id!, playerName: `${p.firstName} ${p.lastName || ''}`, team: 'A', goals, assists, cards, performanceRating: this.calculatePerformanceRating(goals, assists, cards), impactRating: this.calculateImpactRating(goals, assists, cards), revenueGenerated: this.calculatePlayerRevenue(match, 'A', p.id!), penaltiesCaused: cards * 50000 }); });
    match.teamB.players.forEach(p => { const goals = match.result.goalsB.filter(g => g.playerId === p.id).length; const assists = match.result.goalsB.filter(g => g.assistedBy === p.id).length; const cards = match.result.yellowCardsB.filter(c => c.playerId === p.id).length + match.result.redCardsB.filter(c => c.playerId === p.id).length * 3; perf.push({ playerId: p.id!, playerName: `${p.firstName} ${p.lastName || ''}`, team: 'B', goals, assists, cards, performanceRating: this.calculatePerformanceRating(goals, assists, cards), impactRating: this.calculateImpactRating(goals, assists, cards), revenueGenerated: this.calculatePlayerRevenue(match, 'B', p.id!), penaltiesCaused: cards * 50000 }); });
    return perf;
  }

  // ---------- Search / Current Match ----------
  updateSearchCriteria(criteria: Partial<MatchSearchCriteria>): void { this._searchCriteria$.next({ ...this._searchCriteria$.value, ...criteria }); }
  updateSortOptions(sort: MatchSortOptions): void { this._sortOptions$.next(sort); }
  clearSearch(): void { this._searchCriteria$.next({}); }
  setCurrentMatch(matchId: string): void { this.getMatchById(matchId).then(m => this._currentMatch$.next(m)); }
  clearCurrentMatch(): void { this._currentMatch$.next(null); }

  // ---------- Utilities ----------
  exportMatchData(): string { return JSON.stringify(Array.from(this._matches$.value.values()), null, 2); }
  async importMatchData(jsonData: string): Promise<number> {
    try { const arr = JSON.parse(jsonData) as MatchInfo[]; let count = 0; for (const m of arr) { try { await this.createMatch(m); count++; } catch { /* skip invalid */ } } return count; } catch (e) { throw new Error(`Import failed: ${(e as Error).message}`); }
  }

  // ---------- Private Helpers ----------
  private async initializeMatchData(): Promise<void> { try { this._loading$.next(true); await this.loadMatchesFromStorage(); } catch (e) { console.error('Failed to init matches', e); this._error$.next('Failed to load match data'); } finally { this._loading$.next(false); } }
  private async loadMatchesFromStorage(): Promise<void> { try { const raw = localStorage.getItem('matchHistory'); const mapRef = new Map<string, MatchInfo>(); if (raw) { (JSON.parse(raw) as MatchInfo[]).forEach(m => { try { const migrated = this.migrateMatchData(m); mapRef.set(migrated.id, migrated); } catch { /* skip */ } }); } this._matches$.next(mapRef); } catch (e) { console.error('Load storage error', e); } }
  private async saveMatchToStorage(match: MatchInfo): Promise<void> { const list = Array.from(this._matches$.value.values()).filter(m => m.id !== match.id); list.push(match); localStorage.setItem('matchHistory', JSON.stringify(list)); const namesA = match.teamA.players.map(p => `${p.firstName} ${p.lastName}`.trim()); const namesB = match.teamB.players.map(p => `${p.firstName} ${p.lastName}`.trim()); const historyEntry = { date: match.date, description: `Trận đấu ngày ${match.date}`, teamA: namesA, teamB: namesB, teamA_names: namesA, teamB_names: namesB, scoreA: match.result.scoreA, scoreB: match.result.scoreB, scorerA: match.result.goalsA.map(g => g.playerName).join(', '), scorerB: match.result.goalsB.map(g => g.playerName).join(', '), assistA: match.result.goalsA.map(g => g.assistedBy).filter(Boolean).join(', '), assistB: match.result.goalsB.map(g => g.assistedBy).filter(Boolean).join(', '), yellowA: match.result.yellowCardsA.map(c => c.playerName).join(', '), yellowB: match.result.yellowCardsB.map(c => c.playerName).join(', '), redA: match.result.redCardsA.map(c => c.playerName).join(', '), redB: match.result.redCardsB.map(c => c.playerName).join(', '), thu: (match.finances.revenue.teamARevenue || 0) + (match.finances.revenue.teamBRevenue || 0), thuMode: 'auto' as const, chi_total: Object.values(match.finances.expenses).filter(v => typeof v === 'number').reduce((s,v)=>s+(v as number),0), chi_nuoc: match.finances.expenses.water || 0, chi_san: match.finances.expenses.field || 0, chi_trongtai: match.finances.expenses.referee || 0, createdAt: match.createdAt, updatedAt: match.updatedAt, lastSaved: new Date().toISOString() }; await this.firebaseService.addHistoryEntry(historyEntry); }
  private async removeMatchFromStorage(id: string): Promise<void> { const list = Array.from(this._matches$.value.values()).filter(m => m.id !== id); localStorage.setItem('matchHistory', JSON.stringify(list)); }
  private filterMatches(matches: MatchInfo[], c: MatchSearchCriteria): MatchInfo[] { return matches.filter(m => { if (c.dateFrom && m.date < c.dateFrom) return false; if (c.dateTo && m.date > c.dateTo) return false; if (c.status && m.status !== c.status) return false; if (c.teamPlayer) { const q = c.teamPlayer.toLowerCase(); const has = m.teamA.players.some(p => p.firstName.toLowerCase().includes(q)) || m.teamB.players.some(p => p.firstName.toLowerCase().includes(q)); if (!has) return false; } return true; }); }
  private sortMatches(matches: MatchInfo[], sort: MatchSortOptions): MatchInfo[] { return matches.sort((a,b)=>{ let av: number|string = a[sort.field as keyof MatchInfo] as string|number; let bv: number|string = b[sort.field as keyof MatchInfo] as string|number; if (sort.field === 'totalGoals') { av = a.result.scoreA + a.result.scoreB; bv = b.result.scoreA + b.result.scoreB; } else if (sort.field === 'profit') { av = a.finances.netProfit; bv = b.finances.netProfit; } const comp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv)); return sort.direction === 'desc' ? -comp : comp; }); }
  private shouldRecalculateFinances(updates: MatchUpdateFields): boolean { return !!(updates.result || updates.teamA || updates.teamB); }
  private async updatePlayerStatistics(): Promise<void> { /* integrate with PlayerService later */ }
  private generateMatchId(): string { return `match_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
  private generateEventId(): string { return `event_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
  private getTeamNameByColor(color: TeamColor): string { switch(color){case TeamColor.BLUE:return 'Đội Xanh';case TeamColor.ORANGE:return 'Đội Cam';case TeamColor.RED:return 'Đội Đỏ';case TeamColor.GREEN:return 'Đội Xanh Lá';default:return 'Đội Không Xác Định';} }
  private suggestFormation(count: number): string { if (count<=5) return '3-2'; if (count<=7) return '4-3'; if (count<=9) return '4-3-2'; return '4-4-2'; }
  private calculateTeamStrength(players: PlayerInfo[]): number { if(!players.length) return 0; const total = players.reduce((s,p)=>{ const win = p.stats.winRate||0; const exp = Math.min(p.stats.totalMatches,50)*2; const perf=(p.stats.averageGoalsPerMatch*20)+(p.stats.averageAssistsPerMatch*15); return s + (win+exp+perf)/3; },0); return Math.round(total/players.length); }
  private calculateTeamExperience(players: PlayerInfo[]): number { if(!players.length) return 0; const tm = players.reduce((s,p)=>s+p.stats.totalMatches,0); return Math.min(100,(tm/players.length)*5); }
  private calculateActualPerformance(match: MatchInfo, team: TeamSide): number { const score = team==='A'?match.result.scoreA:match.result.scoreB; const cards = team==='A'? match.result.yellowCardsA.length + match.result.redCardsA.length*3 : match.result.yellowCardsB.length + match.result.redCardsB.length*3; return Math.max(0,(score*25)-(cards*10)); }
  private calculatePerformanceRating(goals:number,assists:number,cards:number):number{ return Math.max(0,Math.min(100,(goals*30)+(assists*20)-(cards*15)+50)); }
  private calculateImpactRating(goals:number,assists:number,cards:number):number{ return Math.max(0,Math.min(100,(goals*40)+(assists*25)-(cards*10)+40)); }
  private calculatePlayerRevenue(match:MatchInfo,team:TeamSide,playerId:string):number{ const totalPlayers=match.teamA.players.length+match.teamB.players.length; const base=match.finances.totalRevenue/totalPlayers; const goals=team==='A'?match.result.goalsA.filter(g=>g.playerId===playerId).length:match.result.goalsB.filter(g=>g.playerId===playerId).length; const assists=team==='A'?match.result.goalsA.filter(g=>g.assistedBy===playerId).length:match.result.goalsB.filter(g=>g.assistedBy===playerId).length; return Math.round(base+(goals*10000)+(assists*5000)); }
  private migrateMatchData(match: Partial<MatchInfo> & { id?: string }): MatchInfo { if(!match.date||!match.teamA||!match.teamB||!match.result||!match.finances) throw new Error('Invalid match data'); return { ...match, id: match.id||this.generateMatchId(), date: match.date, teamA: match.teamA, teamB: match.teamB, result: match.result, finances: match.finances, status: match.status||MatchStatus.COMPLETED, statistics: match.statistics||DEFAULT_MATCH_STATISTICS, version: match.version||1, createdAt: match.createdAt||new Date().toISOString(), updatedAt: match.updatedAt||new Date().toISOString() } as MatchInfo; }
}