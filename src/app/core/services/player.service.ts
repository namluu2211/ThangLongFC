/**
 * Simplified Player Service (No Firebase Dependencies)
 * Temporary service to avoid bootstrap issues while Firebase is being configured
 * Updated to fix NG0201 errors
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
// Firebase imports (guarded by runtime validation)
import { firebaseApp, isFirebaseConfigValid } from '../../config/firebase.config';
import { getDatabase, ref, get, set, update, remove } from 'firebase/database';
import { 
  PlayerInfo, 
  PlayerStatus,
  DEFAULT_PLAYER_STATS
} from '../models/player.model';

// Legacy player interface for backward compatibility
interface LegacyPlayer {
  id: number | string;
  firstName: string;
  lastName?: string;
  DOB: number | string;
  position: string;
  height?: number;
  weight?: number;
  avatar?: string;
  note?: string;
}

type LegacyInput = Partial<PlayerInfo> & Partial<LegacyPlayer> & Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  // Core state management
  private readonly _players$ = new BehaviorSubject<Map<string, PlayerInfo>>(new Map());
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  // Firebase realtime database reference (lazy init)
  private db = isFirebaseConfigValid && firebaseApp ? getDatabase(firebaseApp) : null;
  private realtimeEnabled = !!this.db; // Could be enhanced with environment.features.firebaseRealtime

  // Internal flags
  private initialLoadPerformed = false;
  private _balanceCache = new Map<string, TeamBalanceResult>();

  constructor() {
    console.log('🚀 PlayerService (Simple) constructor called, initializing...');
    this.initializePlayerData();
  }

  // Public observables
  get players$(): Observable<PlayerInfo[]> {
    return this._players$.asObservable().pipe(
      map(playerMap => Array.from(playerMap.values()))
    );
  }

  get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  get error$(): Observable<string | null> {
    return this._error$.asObservable();
  }

  // Initialize player data
  private async initializePlayerData(): Promise<void> {
    try {
      this._loading$.next(true);
      console.log('📊 Initializing player data...');

      if (this.realtimeEnabled) {
        console.log('🌐 Realtime mode enabled - loading players from Firebase Realtime DB');
        await this.loadFromRealtime();
      } else {
        // Offline / local fallback
        const cachedData = this.loadFromLocalStorage();
        if (cachedData.length > 0) {
          console.log('📂 Loaded', cachedData.length, 'players from localStorage');
          this.updatePlayersMap(cachedData);
        } else {
          console.log('📂 Loading players from assets/players.json...');
          const assetsData = await this.loadPlayersFromAssets();
          this.updatePlayersMap(assetsData);
        }
      }

      this._error$.next(null);
    } catch (error) {
      console.error('❌ Failed to initialize player data:', error);
      this._error$.next('Failed to load player data');
    } finally {
      this._loading$.next(false);
      this.initialLoadPerformed = true;
    }
  }

  // Load players from Firebase Realtime DB
  private async loadFromRealtime(): Promise<void> {
    if (!this.db) return;
    try {
      const playersRef = ref(this.db, 'players');
      const snapshot = await get(playersRef);
      if (snapshot.exists()) {
        const raw = snapshot.val();
  const list: PlayerInfo[] = Object.values(raw).map(p => this.migratePlayerData(p as LegacyInput));
        console.log('🌐 Loaded', list.length, 'players from Realtime DB');
        this.updatePlayersMap(list);
      } else {
        console.log('🌐 /players node empty. Attempting fallback scan for legacy root player_* nodes...');
        const rootSnap = await get(ref(this.db, '/'));
        if (rootSnap.exists()) {
          const rootVal = rootSnap.val();
          const fallback: PlayerInfo[] = [];
          Object.keys(rootVal || {}).forEach(key => {
            if (/^player_/.test(key) && rootVal[key] && typeof rootVal[key] === 'object') {
              try {
                const migrated = this.migratePlayerData({ id: key, ...(rootVal[key] as Record<string, unknown>) });
                fallback.push(migrated);
              } catch (e) {
                console.warn('⚠️ Failed to migrate fallback player node', key, e);
              }
            }
          });
          if (fallback.length) {
            console.log('🌐 Fallback root scan recovered', fallback.length, 'players (please move them under /players/{id}).');
            this.updatePlayersMap(fallback);
          } else {
            console.log('🌐 No player_* nodes found at root.');
            this.updatePlayersMap([]);
          }
        } else {
          this.updatePlayersMap([]);
        }
      }
    } catch (e) {
      console.error('❌ Realtime DB load error:', e);
      this._error$.next('Realtime DB load failed');
    }
  }

  // Load players from assets/players.json
  private async loadPlayersFromAssets(): Promise<PlayerInfo[]> {
    try {
      const response = await fetch('assets/players.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const legacyPlayers: LegacyPlayer[] = await response.json();
      console.log('📥 Loaded', legacyPlayers.length, 'legacy players from assets');
      
      // Convert legacy format to new format
      const convertedPlayers = legacyPlayers.map(legacyPlayer => 
  this.migratePlayerData(legacyPlayer as unknown as LegacyInput)
      );
      
      // Save to localStorage for next time
      this.saveToLocalStorage(convertedPlayers);
      
      return convertedPlayers;
    } catch (error) {
      console.error('❌ Error loading from assets:', error);
      throw error;
    }
  }

  // Load players from localStorage
  private loadFromLocalStorage(): PlayerInfo[] {
    try {
      const saved = localStorage.getItem('players_data');
      if (saved) {
        const players: PlayerInfo[] = JSON.parse(saved);
  return players.map(player => this.migratePlayerData(player as unknown as LegacyInput));
      }
    } catch (error) {
      console.warn('⚠️ Error loading from localStorage:', error);
    }
    return [];
  }

  // Save players to localStorage
  private saveToLocalStorage(players: PlayerInfo[]): void {
    try {
      localStorage.setItem('players_data', JSON.stringify(players));
      console.log('💾 Saved', players.length, 'players to localStorage');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  // Convert legacy player data to new format
  private migratePlayerData(playerData: LegacyInput): PlayerInfo { // Flexible legacy conversion
    const now = new Date().toISOString();
    
    // Handle both legacy and new formats
    const migrated: PlayerInfo = {
      id: playerData.id ? String(playerData.id) : this.generateId(),
      firstName: playerData.firstName || '',
      lastName: playerData.lastName || '',
  fullName: playerData.fullName || `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim(),
  position: playerData.position || 'Chưa xác định',
  height: this.coerceNumber(playerData.height),
  weight: this.coerceNumber(playerData.weight),
  dateOfBirth: (playerData.dateOfBirth || playerData.DOB || '') as string,
      avatar: playerData.avatar || '',
  notes: (playerData.notes || playerData.note || '') as string,
      videoUrl: (playerData as Record<string, unknown>).videoUrl as string || '', // Video URL for player highlights
      
      // Status and registration
      isRegistered: playerData.isRegistered !== undefined ? playerData.isRegistered : true,
      status: playerData.status || PlayerStatus.ACTIVE,
      
      // Stats
      stats: playerData.stats || { ...DEFAULT_PLAYER_STATS },
      
      // Metadata
      createdAt: playerData.createdAt || now,
      updatedAt: playerData.updatedAt || now,
      __rev: typeof (playerData as unknown as { __rev?: unknown }).__rev === 'number'
        ? (playerData as unknown as { __rev?: number }).__rev!
        : 0
    };

    return migrated;
  }

  private coerceNumber(val: unknown): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    const parsed = parseFloat(String(val).trim());
    return isNaN(parsed) ? 0 : parsed;
  }

  // Generate unique ID
  private generateId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update players map and notify subscribers
  private updatePlayersMap(players: PlayerInfo[]): void {
    const playerMap = new Map<string, PlayerInfo>();
    players.forEach(player => {
      playerMap.set(player.id, player);
    });
    
    this._players$.next(playerMap);
    console.log('🔄 Updated players map with', players.length, 'players');
    // Invalidate balance cache on any player data change
    this._balanceCache.clear();
  }

  // Public API methods
  async refreshPlayers(): Promise<void> {
    console.log('🔄 Refreshing players...');
    await this.initializePlayerData();
  }

  async createPlayer(playerData: Omit<PlayerInfo, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): Promise<PlayerInfo> {
    try {
      this._loading$.next(true);
      
      const newPlayer: PlayerInfo = {
        ...playerData,
        id: this.generateId(),
        stats: { ...DEFAULT_PLAYER_STATS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __rev: 0
      };
      // Ensure numeric fields after spread
      newPlayer.height = this.coerceNumber(newPlayer.height);
      newPlayer.weight = this.coerceNumber(newPlayer.weight);

      // Add to current map
      const currentMap = new Map(this._players$.value);
      currentMap.set(newPlayer.id, newPlayer);
      this._players$.next(currentMap);

      const persistList = Array.from(currentMap.values()).map(p => this.stripInternalFields(p));
      if (this.realtimeEnabled && this.db) {
        await this.writePlayerRealtime(this.stripInternalFields(newPlayer));
        this.saveToLocalStorage(persistList);
      } else {
        this.saveToLocalStorage(persistList);
      }

      console.log('✅ Created new player:', newPlayer.firstName);
      return newPlayer;
    } catch (error) {
      console.error('❌ Error creating player:', error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async updatePlayer(id: string, updates: Partial<PlayerInfo>): Promise<PlayerInfo> {
    try {
      this._loading$.next(true);
      
      const currentMap = new Map(this._players$.value);
      const existingPlayer = currentMap.get(id);
      
      if (!existingPlayer) {
        throw new Error(`Player with id ${id} not found`);
      }

      const updatedPlayer: PlayerInfo = {
        ...existingPlayer,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
        __rev: (existingPlayer.__rev || 0) + 1
      };
      updatedPlayer.height = this.coerceNumber(updatedPlayer.height);
      updatedPlayer.weight = this.coerceNumber(updatedPlayer.weight);

      currentMap.set(id, updatedPlayer);
      this._players$.next(currentMap);

      const persistList = Array.from(currentMap.values()).map(p => this.stripInternalFields(p));
      if (this.realtimeEnabled && this.db) {
        await this.writePlayerRealtime(this.stripInternalFields(updatedPlayer));
        this.saveToLocalStorage(persistList);
      } else {
        this.saveToLocalStorage(persistList);
      }

  console.log('✅ Updated player:', updatedPlayer.firstName, 'height:', updatedPlayer.height, 'weight:', updatedPlayer.weight);
      return updatedPlayer;
    } catch (error) {
      console.error('❌ Error updating player:', error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async deletePlayer(id: string): Promise<void> {
    try {
      this._loading$.next(true);
      
      const currentMap = new Map(this._players$.value);
      const player = currentMap.get(id);
      
      if (!player) {
        throw new Error(`Player with id ${id} not found`);
      }

      currentMap.delete(id);
      this._players$.next(currentMap);

      if (this.realtimeEnabled && this.db) {
        await this.deletePlayerRealtime(id);
      } else {
        this.saveToLocalStorage(Array.from(currentMap.values()));
      }

      console.log('✅ Deleted player:', player.firstName);
    } catch (error) {
      console.error('❌ Error deleting player:', error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  // Realtime helper: write player and avatar metadata node
  private async writePlayerRealtime(player: PlayerInfo) {
    if (!this.db) return;
    const playerRef = ref(this.db, `players/${player.id}`);
  const payload: PlayerInfo & { avatarURL?: string } = { ...player };
    // Avatar versioning logic: if avatar changed, append new version entry
    if (player.avatar) {
      const avatarMetaRef = ref(this.db, `playerAvatars/${player.id}`);
      const updatedAt = new Date().toISOString();
      const versionKey = `v${Date.now()}`;
      // Fetch existing to determine currentVersion (optional optimization skipped here for simplicity)
      await update(avatarMetaRef, {
        playerId: player.id,
        downloadURL: player.avatar,
        currentVersion: versionKey,
        [`versions/${versionKey}`]: {
          downloadURL: player.avatar,
          updatedAt
        },
        updatedAt
      });
      payload.avatarURL = player.avatar;
    }
    await set(playerRef, payload);
  }
  private stripInternalFields(player: PlayerInfo): PlayerInfo {
    const clone: PlayerInfo = { ...player };
    delete (clone as Partial<PlayerInfo>).__rev;
    return clone;
  }

  // Public API to add gallery media metadata (client-side uploads not implemented here)
  async addGalleryMedia(playerId: string, media: { downloadURL: string; fileName?: string; checksum?: string; }): Promise<void> {
    if (!this.db) return;
    const mediaId = media.checksum || `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mediaRef = ref(this.db, `playerMedia/${playerId}/${mediaId}`);
    await set(mediaRef, {
      mediaId,
      playerId,
      fileName: media.fileName || mediaId,
      downloadURL: media.downloadURL,
      checksum: media.checksum || null,
      type: 'gallery',
      createdAt: new Date().toISOString()
    });
  }

  private async deletePlayerRealtime(id: string) {
    if (!this.db) return;
    const playerRef = ref(this.db, `players/${id}`);
    const avatarRef = ref(this.db, `playerAvatars/${id}`);
    await remove(playerRef);
    await remove(avatarRef); // Safe even if missing
  }

  // Get player by ID
  getPlayerById(id: string): PlayerInfo | undefined {
    return this._players$.value.get(id);
  }

  // Get all players as array
  getAllPlayers(): PlayerInfo[] {
    return Array.from(this._players$.value.values());
  }

  // Get players count
  getPlayerCount(): number {
    return this._players$.value.size;
  }

  // Team balance heuristic returning composite result with balanceScore
  getTeamBalanceRecommendations(playerIds: string[]): Observable<TeamBalanceResult> {
    const cacheKey = playerIds.slice().sort().join('-');
    const cached = this._balanceCache.get(cacheKey);
    if (cached) {
      return new BehaviorSubject<TeamBalanceResult>(cached).asObservable();
    }
    const teamAPlayers = playerIds.slice(0, Math.ceil(playerIds.length / 2));
    const teamBPlayers = playerIds.slice(Math.ceil(playerIds.length / 2));
      // Retrieve player objects for richer metrics
      const teamAInfos = teamAPlayers.map(id => this.getPlayerById(id)).filter(Boolean) as PlayerInfo[];
      const teamBInfos = teamBPlayers.map(id => this.getPlayerById(id)).filter(Boolean) as PlayerInfo[];

      // Size parity
      const countDiff = Math.abs(teamAPlayers.length - teamBPlayers.length);
      const sizeScore = Math.max(0, 100 - countDiff * 20);

      // Skill variance (approx: use goals+assists per match as proxy)
      const skillValuesA = teamAInfos.map(p => (p.stats.averageGoalsPerMatch * 30) + (p.stats.averageAssistsPerMatch * 20));
      const skillValuesB = teamBInfos.map(p => (p.stats.averageGoalsPerMatch * 30) + (p.stats.averageAssistsPerMatch * 20));
      const variance = (arr: number[]) => {
        if (!arr.length) return 0;
        const mean = arr.reduce((s,v)=>s+v,0)/arr.length;
        return arr.reduce((s,v)=>s+Math.pow(v-mean,2),0)/arr.length;
      };
      const combinedSkill = [...skillValuesA, ...skillValuesB];
      const skillVar = variance(combinedSkill);
      // Normalize variance to score (lower variance => higher score)
      const skillVarianceScore = Math.max(0, Math.min(100, 100 - skillVar));

      // Experience parity (avg totalMatches difference)
      const avgMatches = (infos: PlayerInfo[]) => infos.length ? infos.reduce((s,p)=>s+p.stats.totalMatches,0)/infos.length : 0;
      const expDiff = Math.abs(avgMatches(teamAInfos) - avgMatches(teamBInfos));
      const experienceParityScore = Math.max(0, 100 - Math.min(100, expDiff));

      // Position diversity (unique positions across both teams)
      const positions = new Set<string>();
      [...teamAInfos, ...teamBInfos].forEach(p => { if (p.position) positions.add(p.position); });
      const positionDiversityScore = Math.min(100, positions.size * 15); // up to ~6-7 unique positions for 100

      // Legacy simple score for backward compatibility
      const balanceScore = Math.round(sizeScore);

      // Final composite (weighted)
      const balanceScoreFinal = Math.round(
        sizeScore * 0.3 +
        skillVarianceScore * 0.25 +
        experienceParityScore * 0.25 +
        positionDiversityScore * 0.2
      );

      const recommendations: string[] = [];
      if (countDiff > 1) recommendations.push('⚖️ Move one player to even team sizes');
      if (skillVarianceScore < 60) recommendations.push('🎯 Distribute high-skill players more evenly');
      if (experienceParityScore < 60) recommendations.push('🧠 Swap experienced player to weaker team');
      if (positionDiversityScore < 60) recommendations.push('🧩 Improve position diversity (add missing roles)');
      if (recommendations.length === 0) recommendations.push('✅ Teams balanced across key metrics');

      const swapSuggestions = this.computeSwapSuggestions(teamAInfos, teamBInfos, balanceScoreFinal);
      const result: TeamBalanceResult = {
        recommendation: recommendations[0],
        recommendations,
        teamAPlayers,
        teamBPlayers,
        sizeScore,
        skillVarianceScore,
        experienceParityScore,
        positionDiversityScore,
        balanceScore,
        balanceScoreFinal,
        swapSuggestions
      };
      this._balanceCache.set(cacheKey, result);
      return new BehaviorSubject<TeamBalanceResult>(result).asObservable();
  }

  // Compute swap suggestions between two teams to improve composite balance score.
  // Evaluates subset cross-team swaps and returns top 5 by expectedGain.
  private computeSwapSuggestions(teamA: PlayerInfo[], teamB: PlayerInfo[], currentScore: number): { fromTeam: 'A' | 'B'; playerOutId: string; playerInId: string; expectedGain: number; rationale: string; }[] {
    const maxPlayers = 15;
    const aSubset = teamA.slice(0, maxPlayers);
    const bSubset = teamB.slice(0, maxPlayers);
    const suggestions: { fromTeam: 'A' | 'B'; playerOutId: string; playerInId: string; expectedGain: number; rationale: string; }[] = [];
    const skillValue = (p: PlayerInfo) => (p.stats.averageGoalsPerMatch * 30) + (p.stats.averageAssistsPerMatch * 20) + (p.stats.winRate * 0.2);
    const avgMatches = (infos: PlayerInfo[]) => infos.length ? infos.reduce((s,p)=>s+p.stats.totalMatches,0)/infos.length : 0;

    for (const a of aSubset) {
      for (const b of bSubset) {
        // Simulate swap
        const newA = teamA.map(p => p.id === a.id ? b : p);
        const newB = teamB.map(p => p.id === b.id ? a : p);
        // Recompute simple metrics
        const sizeScore = Math.max(0, 100 - Math.abs(newA.length - newB.length) * 20);
        const skillValues = [...newA, ...newB].map(skillValue);
        const mean = skillValues.reduce((s,v)=>s+v,0)/skillValues.length;
        const variance = skillValues.reduce((s,v)=>s+Math.pow(v-mean,2),0)/skillValues.length;
        const skillVarianceScore = Math.max(0, Math.min(100, 100 - variance));
        const expDiff = Math.abs(avgMatches(newA) - avgMatches(newB));
        const experienceParityScore = Math.max(0, 100 - Math.min(100, expDiff));
        const positionSet = new Set<string>(); [...newA, ...newB].forEach(p => { if (p.position) positionSet.add(p.position); });
        const positionDiversityScore = Math.min(100, positionSet.size * 15);
        const newFinal = Math.round(
          sizeScore * 0.3 + skillVarianceScore * 0.25 + experienceParityScore * 0.25 + positionDiversityScore * 0.2
        );
        const gain = newFinal - currentScore;
        if (gain > 0) {
          suggestions.push({
            fromTeam: 'A',
            playerOutId: a.id,
            playerInId: b.id,
            expectedGain: gain,
            rationale: `Swap ${a.firstName} ↔ ${b.firstName} improves composite score by ${gain}`
          });
        }
      }
    }
    // Sort by highest gain and cap
    return suggestions.sort((x,y)=>y.expectedGain - x.expectedGain).slice(0,5);
  }

  // Position-based team balancing
  balanceTeamsByPosition(playerIds: string[]): PositionBasedTeamResult {
    console.log('⚽ Starting position-based team balancing for', playerIds.length, 'players');
    
    const players = playerIds.map(id => this.getPlayerById(id)).filter(Boolean) as PlayerInfo[];
    
    if (players.length < 2) {
      return this.createEmptyTeamResult('Cần ít nhất 2 cầu thủ để chia đội');
    }

    // Group players by position
    const positionGroups = this.groupPlayersByPosition(players);
    console.log('📊 Position groups:', Object.keys(positionGroups).map(pos => `${pos}: ${positionGroups[pos].length}`));

    // Initialize teams
    const teamA: PlayerInfo[] = [];
    const teamB: PlayerInfo[] = [];

    // Position priority order (most important first)
    const positionPriority = [
      'Thủ môn',           // Goalkeeper - most critical
      'Trung vệ',          // Center Back
      'Hậu vệ',            // Defender
      'Hậu vệ biên',       // Fullback
      'Tiền vệ phòng ngự', // Defensive Midfielder
      'Tiền vệ',           // Midfielder
      'Tiền vệ tấn công',  // Attacking Midfielder
      'Cánh',              // Winger
      'Tiền đạo',          // Forward
      'Tiền đạo cắm',      // Striker
      'Chưa xác định'      // Unknown - last
    ];

    // Distribute players by position priority
    for (const position of positionPriority) {
      const playersInPosition = positionGroups[position] || [];
      
      if (playersInPosition.length === 0) continue;

      // Sort by skill within position (goals + assists + win rate)
      const sortedPlayers = playersInPosition.sort((a, b) => {
        const skillA = (a.stats.averageGoalsPerMatch * 30) + (a.stats.averageAssistsPerMatch * 20) + (a.stats.winRate * 0.5);
        const skillB = (b.stats.averageGoalsPerMatch * 30) + (b.stats.averageAssistsPerMatch * 20) + (b.stats.winRate * 0.5);
        return skillB - skillA; // Descending order
      });

      // Distribute players alternately (snake draft)
      sortedPlayers.forEach((player, index) => {
        if (index % 2 === 0) {
          teamA.push(player);
        } else {
          teamB.push(player);
        }
      });
    }

    // Balance team sizes if needed
    this.balanceTeamSizes(teamA, teamB);

    // Calculate position balance scores
    const teamAPositions = this.getPositionDistribution(teamA);
    const teamBPositions = this.getPositionDistribution(teamB);
    
    const positionBalanceScore = this.calculatePositionBalanceScore(teamAPositions, teamBPositions);
    const skillBalanceScore = this.calculateSkillBalance(teamA, teamB);
    const sizeBalanceScore = Math.max(0, 100 - Math.abs(teamA.length - teamB.length) * 20);

    const overallScore = Math.round(
      positionBalanceScore * 0.5 +  // Position balance is most important
      skillBalanceScore * 0.3 +      // Skill balance
      sizeBalanceScore * 0.2         // Size balance
    );

    const recommendations = this.generatePositionRecommendations(
      teamA, teamB, teamAPositions, teamBPositions, positionBalanceScore, skillBalanceScore
    );

    console.log('✅ Team balancing complete!');
    console.log('📋 Team A:', teamA.length, 'players', teamAPositions);
    console.log('📋 Team B:', teamB.length, 'players', teamBPositions);
    console.log('📊 Overall balance score:', overallScore);

    return {
      teamA: teamA.map(p => p.id),
      teamB: teamB.map(p => p.id),
      teamADetails: teamA,
      teamBDetails: teamB,
      teamAPositions,
      teamBPositions,
      positionBalanceScore,
      skillBalanceScore,
      sizeBalanceScore,
      overallScore,
      recommendations,
      success: true,
      message: `Đã chia đội dựa trên vị trí và kỹ năng (${teamA.length}v${teamB.length})`
    };
  }

  private groupPlayersByPosition(players: PlayerInfo[]): Record<string, PlayerInfo[]> {
    const groups: Record<string, PlayerInfo[]> = {};
    
    players.forEach(player => {
      const position = player.position || 'Chưa xác định';
      if (!groups[position]) {
        groups[position] = [];
      }
      groups[position].push(player);
    });

    return groups;
  }

  private balanceTeamSizes(teamA: PlayerInfo[], teamB: PlayerInfo[]): void {
    // Move players from larger team to smaller team if difference > 1
    while (Math.abs(teamA.length - teamB.length) > 1) {
      if (teamA.length > teamB.length) {
        const player = teamA.pop();
        if (player) teamB.push(player);
      } else {
        const player = teamB.pop();
        if (player) teamA.push(player);
      }
    }
  }

  private getPositionDistribution(team: PlayerInfo[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    team.forEach(player => {
      const position = player.position || 'Chưa xác định';
      distribution[position] = (distribution[position] || 0) + 1;
    });

    return distribution;
  }

  private calculatePositionBalanceScore(
    teamAPositions: Record<string, number>,
    teamBPositions: Record<string, number>
  ): number {
    // Get all positions from both teams
    const allPositions = new Set([
      ...Object.keys(teamAPositions),
      ...Object.keys(teamBPositions)
    ]);

    let totalDifference = 0;
    let criticalPositionsMissing = 0;

    allPositions.forEach(position => {
      const countA = teamAPositions[position] || 0;
      const countB = teamBPositions[position] || 0;
      const diff = Math.abs(countA - countB);
      
      // Critical positions (goalkeeper, defenders) have higher weight
      const isCritical = position === 'Thủ môn' || position === 'Trung vệ' || position === 'Hậu vệ';
      const weight = isCritical ? 2 : 1;
      
      totalDifference += diff * weight;

      // Penalize if one team has no goalkeeper
      if (position === 'Thủ môn' && (countA === 0 || countB === 0)) {
        criticalPositionsMissing += 30;
      }
    });

    // Calculate score (lower difference = higher score)
    const baseScore = Math.max(0, 100 - (totalDifference * 10));
    const finalScore = Math.max(0, baseScore - criticalPositionsMissing);

    return Math.round(finalScore);
  }

  private calculateSkillBalance(teamA: PlayerInfo[], teamB: PlayerInfo[]): number {
    const getTeamSkill = (team: PlayerInfo[]) => {
      if (team.length === 0) return 0;
      const totalSkill = team.reduce((sum, player) => {
        return sum + (player.stats.averageGoalsPerMatch * 30) + 
               (player.stats.averageAssistsPerMatch * 20) + 
               (player.stats.winRate * 0.5);
      }, 0);
      return totalSkill / team.length;
    };

    const skillA = getTeamSkill(teamA);
    const skillB = getTeamSkill(teamB);
    const difference = Math.abs(skillA - skillB);

    // Lower difference = higher score
    return Math.round(Math.max(0, 100 - (difference * 2)));
  }

  private generatePositionRecommendations(
    teamA: PlayerInfo[],
    teamB: PlayerInfo[],
    teamAPositions: Record<string, number>,
    teamBPositions: Record<string, number>,
    positionScore: number,
    skillScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Check goalkeeper distribution
    const goalkeepersA = teamAPositions['Thủ môn'] || 0;
    const goalkeepersB = teamBPositions['Thủ môn'] || 0;
    
    if (goalkeepersA === 0 && goalkeepersB > 0) {
      recommendations.push('⚠️ Đội A không có thủ môn! Cần chuyển 1 thủ môn sang đội A');
    } else if (goalkeepersB === 0 && goalkeepersA > 0) {
      recommendations.push('⚠️ Đội B không có thủ môn! Cần chuyển 1 thủ môn sang đội B');
    } else if (Math.abs(goalkeepersA - goalkeepersB) > 1) {
      recommendations.push('⚖️ Cân bằng số lượng thủ môn giữa 2 đội');
    }

    // Check position balance
    if (positionScore < 60) {
      recommendations.push('🔄 Hoán đổi cầu thủ để cân bằng vị trí giữa 2 đội');
    }

    // Check skill balance
    if (skillScore < 60) {
      recommendations.push('🎯 Hoán đổi cầu thủ mạnh/yếu để cân bằng kỹ năng');
    }

    // Check team sizes
    if (Math.abs(teamA.length - teamB.length) > 1) {
      recommendations.push('⚖️ Điều chỉnh số lượng cầu thủ cho đều hơn');
    }

    // Add positive feedback
    if (recommendations.length === 0) {
      recommendations.push('✅ Hai đội đã cân bằng tốt về vị trí và kỹ năng!');
    }

    return recommendations;
  }

  private createEmptyTeamResult(message: string): PositionBasedTeamResult {
    return {
      teamA: [],
      teamB: [],
      teamADetails: [],
      teamBDetails: [],
      teamAPositions: {},
      teamBPositions: {},
      positionBalanceScore: 0,
      skillBalanceScore: 0,
      sizeBalanceScore: 0,
      overallScore: 0,
      recommendations: [message],
      success: false,
      message
    };
  }
}

export interface TeamBalanceResult {
  recommendation: string;
  recommendations: string[];
  teamAPlayers: string[];
  teamBPlayers: string[];
  // Component scores
  sizeScore: number;
  skillVarianceScore: number;
  experienceParityScore: number;
  positionDiversityScore: number;
  // Legacy simple score
  balanceScore: number;
  // Final composite
  balanceScoreFinal: number;
  swapSuggestions?: { fromTeam: 'A' | 'B'; playerOutId: string; playerInId: string; expectedGain: number; rationale: string; }[];
}

export interface PositionBasedTeamResult {
  teamA: string[];  // Player IDs for team A
  teamB: string[];  // Player IDs for team B
  teamADetails: PlayerInfo[];  // Full player objects for team A
  teamBDetails: PlayerInfo[];  // Full player objects for team B
  teamAPositions: Record<string, number>;  // Position distribution for team A
  teamBPositions: Record<string, number>;  // Position distribution for team B
  positionBalanceScore: number;  // How well positions are balanced (0-100)
  skillBalanceScore: number;     // How well skills are balanced (0-100)
  sizeBalanceScore: number;      // How well team sizes are balanced (0-100)
  overallScore: number;          // Overall balance score (0-100)
  recommendations: string[];     // Suggestions for improvement
  success: boolean;              // Whether balancing was successful
  message: string;               // Status message
}
