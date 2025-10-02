/**
 * Simplified Player Service (No Firebase Dependencies)
 * Temporary service to avoid bootstrap issues while Firebase is being configured
 * Updated to fix NG0201 errors
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  PlayerInfo, 
  PlayerStats, 
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

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  // Core state management
  private readonly _players$ = new BehaviorSubject<Map<string, PlayerInfo>>(new Map());
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

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

      // Try to load from localStorage first
      const cachedData = this.loadFromLocalStorage();
      if (cachedData.length > 0) {
        console.log('📂 Loaded', cachedData.length, 'players from localStorage');
        this.updatePlayersMap(cachedData);
      } else {
        // Load from assets as fallback
        console.log('📂 Loading players from assets/players.json...');
        const assetsData = await this.loadPlayersFromAssets();
        this.updatePlayersMap(assetsData);
      }

      this._error$.next(null);
    } catch (error) {
      console.error('❌ Failed to initialize player data:', error);
      this._error$.next('Failed to load player data');
    } finally {
      this._loading$.next(false);
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
        this.migratePlayerData(legacyPlayer)
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
        return players.map(player => this.migratePlayerData(player));
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
  private migratePlayerData(playerData: any): PlayerInfo {
    const now = new Date().toISOString();
    
    // Handle both legacy and new formats
    const migrated: PlayerInfo = {
      id: playerData.id ? String(playerData.id) : this.generateId(),
      firstName: playerData.firstName || '',
      lastName: playerData.lastName || '',
      fullName: playerData.fullName || `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim(),
      position: playerData.position || 'Chưa xác định',
      height: playerData.height || 0,
      weight: playerData.weight || 0,
      dateOfBirth: playerData.dateOfBirth || playerData.DOB || '',
      avatar: playerData.avatar || '',
      notes: playerData.notes || playerData.note || '',
      
      // Status and registration
      isRegistered: playerData.isRegistered !== undefined ? playerData.isRegistered : true,
      status: playerData.status || PlayerStatus.ACTIVE,
      
      // Stats
      stats: playerData.stats || { ...DEFAULT_PLAYER_STATS },
      
      // Metadata
      createdAt: playerData.createdAt || now,
      updatedAt: playerData.updatedAt || now
    };

    return migrated;
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
        updatedAt: new Date().toISOString()
      };

      // Add to current map
      const currentMap = new Map(this._players$.value);
      currentMap.set(newPlayer.id, newPlayer);
      this._players$.next(currentMap);

      // Save to localStorage
      this.saveToLocalStorage(Array.from(currentMap.values()));

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
        updatedAt: new Date().toISOString()
      };

      currentMap.set(id, updatedPlayer);
      this._players$.next(currentMap);

      // Save to localStorage
      this.saveToLocalStorage(Array.from(currentMap.values()));

      console.log('✅ Updated player:', updatedPlayer.firstName);
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

      // Save to localStorage
      this.saveToLocalStorage(Array.from(currentMap.values()));

      console.log('✅ Deleted player:', player.firstName);
    } catch (error) {
      console.error('❌ Error deleting player:', error);
      throw error;
    } finally {
      this._loading$.next(false);
    }
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

  // Temporary method for team balance recommendations
  getTeamBalanceRecommendations(playerIds: string[]): Observable<any> {
    // Return a simple mock recommendation for now
    return new BehaviorSubject({
      recommendation: 'Balanced teams based on available players',
      teamAPlayers: playerIds.slice(0, Math.ceil(playerIds.length / 2)),
      teamBPlayers: playerIds.slice(Math.ceil(playerIds.length / 2))
    }).asObservable();
  }
}