/**
 * Core Player Management Service
 * Centralized service for all player operations including CRUD, validation, and state management
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  PlayerInfo, 
  PlayerStats, 
  PlayerValidation, 
  PlayerSearchCriteria, 
  PlayerSortOptions,
  PlayerUpdateFields,
  StatsUpdateFields,
  PlayerStatus,
  ValidationError,
  ValidationWarning,
  DEFAULT_PLAYER_STATS,
  AVATAR_CONFIG
} from '../models/player.model';

// Additional interfaces for analytics
interface PlayerAnalytics {
  overallRating: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  comparison: PlayerComparison;
}

interface PlayerComparison {
  vsTeamAverage: {
    winRate: number;
    goals: number;
    assists: number;
  };
}

interface TeamBalance {
  balanceScore: number;
  positionDistribution: Record<string, number>;
  teamStats: {
    avgWinRate: number;
    totalGoals: number;
    totalExperience: number;
  };
  recommendations: string[];
}

interface TeamAverages {
  avgWinRate: number;
  avgGoalsPerMatch: number;
  avgAssistsPerMatch: number;
}
import { FirebaseService } from '../../services/firebase.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly firebaseService = inject(FirebaseService);
  
  // Core state management
  private readonly _players$ = new BehaviorSubject<Map<string, PlayerInfo>>(new Map());
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _searchCriteria$ = new BehaviorSubject<PlayerSearchCriteria>({});
  private readonly _sortOptions$ = new BehaviorSubject<PlayerSortOptions>({ field: 'firstName', direction: 'asc' });

  // Cache management
  private playerCache = new Map<string, { data: PlayerInfo; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializePlayerData();
  }

  // Public observables
  get players$(): Observable<PlayerInfo[]> {
    return combineLatest([
      this._players$,
      this._searchCriteria$,
      this._sortOptions$
    ]).pipe(
      map(([playersMap, criteria, sortOptions]) => {
        let players = Array.from(playersMap.values());
        
        // Apply search filters
        players = this.filterPlayers(players, criteria);
        
        // Apply sorting
        players = this.sortPlayers(players, sortOptions);
        
        return players;
      })
    );
  }

  get registeredPlayers$(): Observable<PlayerInfo[]> {
    return this.players$.pipe(
      map(players => players.filter(p => p.isRegistered))
    );
  }

  get activePlayers$(): Observable<PlayerInfo[]> {
    return this.players$.pipe(
      map(players => players.filter(p => p.status === PlayerStatus.ACTIVE))
    );
  }

  get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  get error$(): Observable<string | null> {
    return this._error$.asObservable();
  }

  // Player CRUD operations
  async createPlayer(playerData: Omit<PlayerInfo, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<PlayerInfo> {
    try {
      this._loading$.next(true);
      this._error$.next(null);

      // Validate player data
      const validation = this.validatePlayerData(playerData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Generate unique ID
      const id = this.generatePlayerId();
      
      // Create complete player object
      const newPlayer: PlayerInfo = {
        ...playerData,
        id,
        fullName: `${playerData.firstName} ${playerData.lastName || ''}`.trim(),
        stats: { ...DEFAULT_PLAYER_STATS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRegistered: playerData.isRegistered ?? false,
        status: playerData.status || PlayerStatus.ACTIVE
      };

      // Save to storage
      await this.savePlayerToStorage(newPlayer);
      
      // Update local state
      const currentPlayers = this._players$.value;
      currentPlayers.set(id, newPlayer);
      this._players$.next(new Map(currentPlayers));

      console.log('✅ Player created successfully:', newPlayer.fullName);
      return newPlayer;

    } catch (error) {
      const errorMessage = `Failed to create player: ${error.message}`;
      this._error$.next(errorMessage);
      console.error('❌', errorMessage, error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async updatePlayer(id: string, updates: PlayerUpdateFields): Promise<PlayerInfo> {
    try {
      this._loading$.next(true);
      this._error$.next(null);

      const currentPlayer = await this.getPlayerById(id);
      if (!currentPlayer) {
        throw new Error(`Player with ID ${id} not found`);
      }

      // Merge updates
      const updatedPlayer: PlayerInfo = {
        ...currentPlayer,
        ...updates,
        id, // Ensure ID cannot be changed
        updatedAt: new Date().toISOString(),
        fullName: `${updates.firstName || currentPlayer.firstName} ${updates.lastName || currentPlayer.lastName || ''}`.trim()
      };

      // Validate updated data
      const validation = this.validatePlayerData(updatedPlayer);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Save to storage
      await this.savePlayerToStorage(updatedPlayer);
      
      // Update local state
      const currentPlayers = this._players$.value;
      currentPlayers.set(id, updatedPlayer);
      this._players$.next(new Map(currentPlayers));

      // Clear cache for this player
      this.playerCache.delete(id);

      console.log('✅ Player updated successfully:', updatedPlayer.fullName);
      return updatedPlayer;

    } catch (error) {
      const errorMessage = `Failed to update player: ${error.message}`;
      this._error$.next(errorMessage);
      console.error('❌', errorMessage, error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async updatePlayerStats(id: string, statsUpdates: StatsUpdateFields): Promise<PlayerInfo> {
    try {
      const currentPlayer = await this.getPlayerById(id);
      if (!currentPlayer) {
        throw new Error(`Player with ID ${id} not found`);
      }

      const updatedStats: PlayerStats = {
        ...currentPlayer.stats,
        ...statsUpdates
      };

      // Recalculate derived stats
      this.recalculateDerivedStats(updatedStats);

      const updatedPlayer = await this.getPlayerById(id);
      if (!updatedPlayer) throw new Error('Player not found');
      
      const playerWithUpdatedStats: PlayerInfo = {
        ...updatedPlayer,
        stats: updatedStats,
        updatedAt: new Date().toISOString()
      };
      
      await this.savePlayerToStorage(playerWithUpdatedStats);
      const currentPlayers = this._players$.value;
      currentPlayers.set(id, playerWithUpdatedStats);
      this._players$.next(new Map(currentPlayers));
      
      return playerWithUpdatedStats;

    } catch (error) {
      console.error('❌ Failed to update player stats:', error);
      throw error;
    }
  }

  async deletePlayer(id: string): Promise<boolean> {
    try {
      this._loading$.next(true);
      this._error$.next(null);

      const player = await this.getPlayerById(id);
      if (!player) {
        throw new Error(`Player with ID ${id} not found`);
      }

      // Remove from storage
      await this.removePlayerFromStorage(id);
      
      // Update local state
      const currentPlayers = this._players$.value;
      currentPlayers.delete(id);
      this._players$.next(new Map(currentPlayers));

      // Clear cache
      this.playerCache.delete(id);

      console.log('✅ Player deleted successfully:', player.fullName);
      return true;

    } catch (error) {
      const errorMessage = `Failed to delete player: ${error.message}`;
      this._error$.next(errorMessage);
      console.error('❌', errorMessage, error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  // Player retrieval methods
  async getPlayerById(id: string): Promise<PlayerInfo | null> {
    // Check cache first
    const cached = this.playerCache.get(id);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    // Get from state
    const player = this._players$.value.get(id) || null;
    
    if (player) {
      // Update cache
      this.playerCache.set(id, { data: player, timestamp: Date.now() });
    }

    return player;
  }

  getPlayerByName(firstName: string, lastName?: string): Observable<PlayerInfo | null> {
    const fullName = `${firstName} ${lastName || ''}`.trim().toLowerCase();
    return this.players$.pipe(
      map(players => 
        players.find(p => 
          p.fullName?.toLowerCase() === fullName ||
          p.firstName.toLowerCase() === firstName.toLowerCase()
        ) || null
      )
    );
  }

  // Search and filtering
  updateSearchCriteria(criteria: Partial<PlayerSearchCriteria>): void {
    const currentCriteria = this._searchCriteria$.value;
    this._searchCriteria$.next({ ...currentCriteria, ...criteria });
  }

  updateSortOptions(sortOptions: PlayerSortOptions): void {
    this._sortOptions$.next(sortOptions);
  }

  clearSearch(): void {
    this._searchCriteria$.next({});
  }

  // Avatar and image management
  async updatePlayerAvatar(id: string, file: File): Promise<string> {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        throw new Error('Invalid image file. Please use JPG, PNG, or WebP format under 5MB.');
      }

      // Process and upload image
      const avatarUrl = await this.processAndUploadAvatar(id, file);
      
      // Update player record
      await this.updatePlayer(id, { avatar: avatarUrl });
      
      return avatarUrl;

    } catch (error) {
      console.error('❌ Failed to update avatar:', error);
      throw error;
    }
  }

  async addPlayerImage(id: string, file: File): Promise<string> {
    try {
      if (!this.isValidImageFile(file)) {
        throw new Error('Invalid image file. Please use JPG, PNG, or WebP format under 5MB.');
      }

      const imageUrl = await this.processAndUploadImage(id, file);
      
      const player = await this.getPlayerById(id);
      if (player) {
        const currentImages = player.images || [];
        await this.updatePlayer(id, { 
          images: [...currentImages, imageUrl] 
        });
      }
      
      return imageUrl;

    } catch (error) {
      console.error('❌ Failed to add image:', error);
      throw error;
    }
  }

  // Registration management
  async togglePlayerRegistration(id: string): Promise<PlayerInfo> {
    const player = await this.getPlayerById(id);
    if (!player) {
      throw new Error(`Player with ID ${id} not found`);
    }

    const updates: PlayerUpdateFields = {
      isRegistered: !player.isRegistered,
      registrationDate: !player.isRegistered ? new Date().toISOString() : undefined
    };

    return await this.updatePlayer(id, updates);
  }

  async bulkRegisterPlayers(playerIds: string[]): Promise<PlayerInfo[]> {
    const results: PlayerInfo[] = [];
    
    for (const id of playerIds) {
      try {
        const result = await this.updatePlayer(id, { 
          isRegistered: true,
          registrationDate: new Date().toISOString()
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to register player ${id}:`, error);
      }
    }
    
    return results;
  }

  // Statistics and analytics
  getPlayerPerformanceAnalytics(id: string): Observable<PlayerAnalytics | null> {
    return this.players$.pipe(
      map(players => {
        const player = players.find(p => p.id === id);
        if (!player) return null;

        return this.calculatePlayerAnalytics(player);
      })
    );
  }

  getTeamBalanceRecommendations(playerIds: string[]): Observable<TeamBalance> {
    return this.players$.pipe(
      map(players => {
        const selectedPlayers = players.filter(p => playerIds.includes(p.id!));
        return this.calculateTeamBalance(selectedPlayers);
      })
    );
  }

  // Data synchronization
  async syncWithServer(): Promise<void> {
    try {
      this._loading$.next(true);
      
      // Load from Firebase if available
      if (this.firebaseService) {
        // Implementation would sync with Firebase
        console.log('🔄 Syncing player data with server...');
      }
      
      // For now, load from localStorage
      await this.loadPlayersFromStorage();
      
    } catch (error) {
      this._error$.next(`Sync failed: ${error.message}`);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  // Utility methods
  exportPlayersData(): string {
    const players = Array.from(this._players$.value.values());
    return JSON.stringify(players, null, 2);
  }

  async importPlayersData(jsonData: string): Promise<number> {
    try {
      const playersData = JSON.parse(jsonData) as PlayerInfo[];
      let importedCount = 0;

      for (const playerData of playersData) {
        try {
          await this.createPlayer(playerData);
          importedCount++;
        } catch (error) {
          console.warn(`Failed to import player ${playerData.firstName}:`, error);
        }
      }

      return importedCount;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  // Private methods
  private async initializePlayerData(): Promise<void> {
    try {
      this._loading$.next(true);
      await this.loadPlayersFromStorage();
    } catch (error) {
      console.error('Failed to initialize player data:', error);
      this._error$.next('Failed to load player data');
    } finally {
      this._loading$.next(false);
    }
  }

  private async loadPlayersFromStorage(): Promise<void> {
    try {
      // Load from localStorage for now
      const playersData = localStorage.getItem('players');
      const playersMap = new Map<string, PlayerInfo>();

      if (playersData) {
        const players = JSON.parse(playersData) as PlayerInfo[];
        players.forEach(player => {
          // Ensure player has all required fields
          const validatedPlayer = this.migratePlayerData(player);
          playersMap.set(validatedPlayer.id, validatedPlayer);
        });
      }

      this._players$.next(playersMap);
      console.log('✅ Loaded', playersMap.size, 'players from storage');

    } catch (error) {
      console.error('Failed to load players from storage:', error);
      throw error;
    }
  }

  private async savePlayerToStorage(player: PlayerInfo): Promise<void> {
    try {
      const currentPlayers = Array.from(this._players$.value.values());
      const updatedPlayers = currentPlayers.filter(p => p.id !== player.id);
      updatedPlayers.push(player);
      
      localStorage.setItem('players', JSON.stringify(updatedPlayers));
    } catch (error) {
      console.error('Failed to save player to storage:', error);
      throw error;
    }
  }

  private async removePlayerFromStorage(id: string): Promise<void> {
    try {
      const currentPlayers = Array.from(this._players$.value.values());
      const filteredPlayers = currentPlayers.filter(p => p.id !== id);
      
      localStorage.setItem('players', JSON.stringify(filteredPlayers));
    } catch (error) {
      console.error('Failed to remove player from storage:', error);
      throw error;
    }
  }

  private validatePlayerData(playerData: Partial<PlayerInfo>): PlayerValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!playerData.firstName?.trim()) {
      errors.push({ field: 'firstName', message: 'Tên là bắt buộc', severity: 'error' });
    }

    // Name length validation
    if (playerData.firstName && playerData.firstName.length > 50) {
      errors.push({ field: 'firstName', message: 'Tên không được quá 50 ký tự', severity: 'error' });
    }

    // Age validation
    if (playerData.age && (playerData.age < 16 || playerData.age > 50)) {
      warnings.push({ field: 'age', message: 'Tuổi có vẻ không phù hợp cho bóng đá nghiệp dư' });
    }

    // Email validation
    if (playerData.email && !this.isValidEmail(playerData.email)) {
      errors.push({ field: 'email', message: 'Email không hợp lệ', severity: 'error' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private filterPlayers(players: PlayerInfo[], criteria: PlayerSearchCriteria): PlayerInfo[] {
    return players.filter(player => {
      if (criteria.name && !this.playerMatchesName(player, criteria.name)) {
        return false;
      }
      
      if (criteria.position && player.position !== criteria.position) {
        return false;
      }
      
      if (criteria.status && player.status !== criteria.status) {
        return false;
      }
      
      if (criteria.isRegistered !== undefined && player.isRegistered !== criteria.isRegistered) {
        return false;
      }
      
      if (criteria.minMatches && player.stats.totalMatches < criteria.minMatches) {
        return false;
      }
      
      if (criteria.maxAge && player.age && player.age > criteria.maxAge) {
        return false;
      }
      
      if (criteria.minAge && player.age && player.age < criteria.minAge) {
        return false;
      }
      
      return true;
    });
  }

  private sortPlayers(players: PlayerInfo[], sortOptions: PlayerSortOptions): PlayerInfo[] {
    return players.sort((a, b) => {
      const aVal = this.getPlayerFieldValue(a, sortOptions.field);
      const bVal = this.getPlayerFieldValue(b, sortOptions.field);
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      
      return sortOptions.direction === 'desc' ? -comparison : comparison;
    });
  }

  private getPlayerFieldValue(player: PlayerInfo, field: keyof PlayerStats | keyof PlayerInfo): unknown {
    if (field in player.stats) {
      return player.stats[field as keyof PlayerStats];
    }
    return player[field as keyof PlayerInfo];
  }

  private playerMatchesName(player: PlayerInfo, searchName: string): boolean {
    const search = searchName.toLowerCase();
    return (
      player.firstName.toLowerCase().includes(search) ||
      player.lastName?.toLowerCase().includes(search) ||
      player.fullName?.toLowerCase().includes(search) ||
      player.nickname?.toLowerCase().includes(search)
    );
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidImageFile(file: File): boolean {
    return (
      (AVATAR_CONFIG.allowedTypes as readonly string[]).includes(file.type) &&
      file.size <= AVATAR_CONFIG.maxSize
    );
  }

  private async processAndUploadAvatar(playerId: string, file: File): Promise<string> {
    // For now, create a blob URL (in production, upload to cloud storage)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Store in localStorage for now
        localStorage.setItem(`avatar_${playerId}`, dataUrl);
        resolve(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  private async processAndUploadImage(playerId: string, file: File): Promise<string> {
    // Similar to avatar processing
    return this.processAndUploadAvatar(playerId, file);
  }

  private recalculateDerivedStats(stats: PlayerStats): void {
    // Calculate win rate
    if (stats.totalMatches > 0) {
      stats.winRate = (stats.wins / stats.totalMatches) * 100;
      stats.averageGoalsPerMatch = stats.goals / stats.totalMatches;
      stats.averageAssistsPerMatch = stats.assists / stats.totalMatches;
    }

    // Calculate disciplinary score (lower is better)
    stats.disciplinaryScore = (stats.yellowCards * 1) + (stats.redCards * 3);

    // Calculate net contribution
    stats.netContribution = stats.totalRevenue - stats.totalPenalties;
  }

  private migratePlayerData(player: Partial<PlayerInfo>): PlayerInfo {
    // Ensure backward compatibility with old player data
    const firstName = player.firstName || 'Unknown';
    const lastName = player.lastName || '';
    
    return {
      ...player,
      id: player.id || this.generatePlayerId(),
      firstName,
      lastName,
      fullName: player.fullName || `${firstName} ${lastName}`.trim(),
      isRegistered: player.isRegistered ?? false,
      status: player.status || PlayerStatus.ACTIVE,
      stats: { ...DEFAULT_PLAYER_STATS, ...player.stats },
      createdAt: player.createdAt || new Date().toISOString(),
      updatedAt: player.updatedAt || new Date().toISOString()
    };
  }

  private calculatePlayerAnalytics(player: PlayerInfo): PlayerAnalytics {
    const stats = player.stats;
    
    return {
      overallRating: this.calculateOverallRating(stats),
      strengths: this.identifyPlayerStrengths(stats),
      weaknesses: this.identifyPlayerWeaknesses(stats),
      recommendations: this.getPlayerRecommendations(stats),
      comparison: this.getPlayerComparison(player)
    };
  }

  private calculateOverallRating(stats: PlayerStats): number {
    // Simple rating algorithm (can be enhanced)
    const winRateScore = stats.winRate * 0.3;
    const goalScore = Math.min(stats.averageGoalsPerMatch * 20, 30);
    const assistScore = Math.min(stats.averageAssistsPerMatch * 15, 20);
    const disciplineScore = Math.max(20 - stats.disciplinaryScore, 0);
    
    return Math.round(winRateScore + goalScore + assistScore + disciplineScore);
  }

  private identifyPlayerStrengths(stats: PlayerStats): string[] {
    const strengths: string[] = [];
    
    if (stats.winRate > 70) strengths.push('Tỷ lệ thắng cao');
    if (stats.averageGoalsPerMatch > 1) strengths.push('Ghi bàn tốt');
    if (stats.averageAssistsPerMatch > 0.5) strengths.push('Kiến tạo tốt');
    if (stats.disciplinaryScore < 2) strengths.push('Kỷ luật tốt');
    if (stats.totalMatches > 20) strengths.push('Kinh nghiệm nhiều');
    
    return strengths;
  }

  private identifyPlayerWeaknesses(stats: PlayerStats): string[] {
    const weaknesses: string[] = [];
    
    if (stats.winRate < 40) weaknesses.push('Tỷ lệ thắng thấp');
    if (stats.averageGoalsPerMatch < 0.2) weaknesses.push('Ít ghi bàn');
    if (stats.disciplinaryScore > 5) weaknesses.push('Nhiều thẻ phạt');
    if (stats.totalMatches < 5) weaknesses.push('Ít kinh nghiệm');
    
    return weaknesses;
  }

  private getPlayerRecommendations(stats: PlayerStats): string[] {
    const recommendations: string[] = [];
    
    if (stats.averageGoalsPerMatch < 0.3) {
      recommendations.push('Tập luyện kỹ thuật dứt điểm');
    }
    if (stats.disciplinaryScore > 3) {
      recommendations.push('Cải thiện kỷ luật trong trận đấu');
    }
    if (stats.averageAssistsPerMatch < 0.3) {
      recommendations.push('Phát triển khả năng kiến tạo');
    }
    
    return recommendations;
  }

  private getPlayerComparison(player: PlayerInfo): PlayerComparison {
    // Compare with team averages
    const allPlayers = Array.from(this._players$.value.values());
    const teamStats = this.calculateTeamAverages(allPlayers);
    
    return {
      vsTeamAverage: {
        winRate: player.stats.winRate - teamStats.avgWinRate,
        goals: player.stats.averageGoalsPerMatch - teamStats.avgGoalsPerMatch,
        assists: player.stats.averageAssistsPerMatch - teamStats.avgAssistsPerMatch
      }
    };
  }

  private calculateTeamAverages(players: PlayerInfo[]): TeamAverages {
    if (players.length === 0) return { avgWinRate: 0, avgGoalsPerMatch: 0, avgAssistsPerMatch: 0 };
    
    const totals = players.reduce((acc, player) => ({
      winRate: acc.winRate + player.stats.winRate,
      goalsPerMatch: acc.goalsPerMatch + player.stats.averageGoalsPerMatch,
      assistsPerMatch: acc.assistsPerMatch + player.stats.averageAssistsPerMatch
    }), { winRate: 0, goalsPerMatch: 0, assistsPerMatch: 0 });
    
    return {
      avgWinRate: totals.winRate / players.length,
      avgGoalsPerMatch: totals.goalsPerMatch / players.length,
      avgAssistsPerMatch: totals.assistsPerMatch / players.length
    };
  }

  private calculateTeamBalance(players: PlayerInfo[]): TeamBalance {
    // Team balance calculation logic
    const positions = players.reduce((acc, player) => {
      acc[player.position || 'unknown'] = (acc[player.position || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgWinRate = players.reduce((sum, p) => sum + p.stats.winRate, 0) / players.length;
    const totalGoals = players.reduce((sum, p) => sum + p.stats.goals, 0);
    const totalExperience = players.reduce((sum, p) => sum + p.stats.totalMatches, 0);

    return {
      balanceScore: this.calculateBalanceScore(players),
      positionDistribution: positions,
      teamStats: { avgWinRate, totalGoals, totalExperience },
      recommendations: this.getTeamRecommendations(players)
    };
  }

  private calculateBalanceScore(players: PlayerInfo[]): number {
    // Balance score algorithm (0-100)
    const experienceBalance = this.calculateExperienceBalance(players);
    const skillBalance = this.calculateSkillBalance(players);
    const positionBalance = this.calculatePositionBalance(players);
    
    return Math.round((experienceBalance + skillBalance + positionBalance) / 3);
  }

  private calculateExperienceBalance(players: PlayerInfo[]): number {
    const matches = players.map(p => p.stats.totalMatches);
    const avg = matches.reduce((sum, m) => sum + m, 0) / matches.length;
    const variance = matches.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / matches.length;
    
    // Lower variance = better balance
    return Math.max(0, 100 - (variance / avg) * 100);
  }

  private calculateSkillBalance(players: PlayerInfo[]): number {
    const winRates = players.map(p => p.stats.winRate);
    const avg = winRates.reduce((sum, wr) => sum + wr, 0) / winRates.length;
    const variance = winRates.reduce((sum, wr) => sum + Math.pow(wr - avg, 2), 0) / winRates.length;
    
    return Math.max(0, 100 - variance);
  }

  private calculatePositionBalance(players: PlayerInfo[]): number {
    // Simple position balance check
    const positions = new Set(players.map(p => p.position));
    return Math.min(100, (positions.size / players.length) * 100);
  }

  private getTeamRecommendations(players: PlayerInfo[]): string[] {
    const recommendations: string[] = [];
    
    const balanceScore = this.calculateBalanceScore(players);
    if (balanceScore < 60) {
      recommendations.push('Đội hình chưa cân bằng, cần điều chỉnh');
    }
    
    const avgExperience = players.reduce((sum, p) => sum + p.stats.totalMatches, 0) / players.length;
    if (avgExperience < 10) {
      recommendations.push('Đội có nhiều cầu thủ mới, cần thêm kinh nghiệm');
    }
    
    return recommendations;
  }
}