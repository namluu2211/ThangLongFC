/**
 * Firebase-enabled Player Service for Real-time Database Operations
 * Provides CRUD operations for players with real-time synchronization
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  onValue, 
  serverTimestamp,
  remove,
  update,
  Database,
  off
} from 'firebase/database';
import { 
  PlayerInfo, 
  PlayerStats, 
  PlayerStatus,
  DEFAULT_PLAYER_STATS
} from '../models/player.model';
import { FirebaseService } from '../../services/firebase.service';

export interface FirebasePlayer {
  id?: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  position: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
  avatar?: string;
  notes?: string;
  isRegistered?: boolean;
  status?: PlayerStatus;
  stats?: PlayerStats;
  createdAt?: string | number | object | null;
  updatedAt?: string | number | object | null;
  createdBy?: string;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebasePlayerService {
  private database: Database;
  private playersRef: import('firebase/database').DatabaseReference;
  
  // State management
  private readonly _players$ = new BehaviorSubject<Map<string, PlayerInfo>>(new Map());
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _syncStatus$ = new BehaviorSubject<'synced' | 'syncing' | 'offline'>('offline');

  // Cache for offline support
  private offlineCache = new Map<string, PlayerInfo>();
  private pendingOperations: {
    type: 'create' | 'update' | 'delete';
    id?: string;
    data?: Record<string, unknown>;
    timestamp: number;
  }[] = [];

  private firebaseService = inject(FirebaseService);

  constructor() {
    console.log('🚀 FirebasePlayerService initializing...');
    this.initializeService();
  }

  // Public observables
  get players$(): Observable<PlayerInfo[]> {
    return this._players$.asObservable().pipe(
      map(playerMap => Array.from(playerMap.values())),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  get error$(): Observable<string | null> {
    return this._error$.asObservable();
  }

  get syncStatus$(): Observable<'synced' | 'syncing' | 'offline'> {
    return this._syncStatus$.asObservable();
  }

  // Combined state for UI convenience
  get state$(): Observable<{
    players: PlayerInfo[];
    loading: boolean;
    error: string | null;
    syncStatus: 'synced' | 'syncing' | 'offline';
  }> {
    return combineLatest([
      this.players$,
      this.loading$,
      this.error$,
      this.syncStatus$
    ]).pipe(
      map(([players, loading, error, syncStatus]) => ({
        players,
        loading,
        error,
        syncStatus
      }))
    );
  }

  private async initializeService(): Promise<void> {
    try {
      console.log('🚀 FirebasePlayerService initializing...');
      this._loading$.next(true);
      
      // Initialize database reference
      this.database = getDatabase();
      this.playersRef = ref(this.database, 'players');
      console.log('✅ Firebase database initialized');
      
      // Load from localStorage first for immediate UI
      this.loadFromLocalStorage();
      
      // Set up real-time listener
      this.setupRealtimeListener();
      
      // Monitor connection status
      this.monitorConnectionStatus();
      
      console.log('✅ FirebasePlayerService initialized successfully');
      this._error$.next(null);
    } catch (error) {
      console.error('❌ Failed to initialize FirebasePlayerService:', error);
      this._error$.next('Failed to initialize player service');
      this._syncStatus$.next('offline');
    } finally {
      this._loading$.next(false);
    }
  }

  private setupRealtimeListener(): void {
    console.log('👂 Setting up real-time listener for players...');
    console.log('🔗 Database reference:', this.playersRef);
    
    onValue(this.playersRef, 
      (snapshot) => {
        try {
          console.log('📡 Firebase snapshot received');
          this._syncStatus$.next('syncing');
          const data = snapshot.val();
          console.log('📋 Raw Firebase data:', data);
          
          const players: PlayerInfo[] = data ? 
            Object.keys(data).map(key => {
              console.log(`🔄 Processing player ${key}:`, data[key]);
              return {
                id: key,
                ...this.migratePlayerData(data[key])
              };
            }) : [];
          
          console.log('📊 Processed players:', players.length);
          console.log('📋 Players array:', players);
          
          // Update state
          this.updatePlayersMap(players);
          
          // Cache for offline use
          this.saveToLocalStorage(players);
          this.offlineCache = new Map(players.map(p => [p.id, p]));
          
          this._syncStatus$.next('synced');
          this._error$.next(null);
          
          console.log(`✅ Real-time update completed: ${players.length} players synced`);
        } catch (error) {
          console.error('❌ Error processing real-time update:', error);
          this._error$.next('Real-time sync error');
        }
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        this._error$.next('Connection lost - using cached data');
        this._syncStatus$.next('offline');
        
        // Fallback to cached data
        if (this.offlineCache.size > 0) {
          this.updatePlayersMap(Array.from(this.offlineCache.values()));
        }
      }
    );
  }

  private monitorConnectionStatus(): void {
    // Monitor Firebase connection status
    const connectedRef = ref(this.database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val();
      
      if (isConnected) {
        console.log('🔥 Firebase connected - processing pending operations');
        this._syncStatus$.next('synced');
        this.processPendingOperations();
      } else {
        console.warn('⚠️ Firebase disconnected - switching to offline mode');
        this._syncStatus$.next('offline');
      }
    });
  }

  // CRUD Operations

  async createPlayer(playerData: Omit<PlayerInfo, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      this._loading$.next(true);
      
      const newPlayer: Omit<FirebasePlayer, 'id'> = {
        firstName: playerData.firstName,
        lastName: playerData.lastName || '',
        fullName: playerData.fullName || `${playerData.firstName} ${playerData.lastName || ''}`.trim(),
        position: playerData.position || 'Chưa xác định',
        height: playerData.height || 0,
        weight: playerData.weight || 0,
        dateOfBirth: playerData.dateOfBirth || '',
        avatar: playerData.avatar || '',
        notes: playerData.notes || '',
        isRegistered: playerData.isRegistered ?? true,
        status: playerData.status || PlayerStatus.ACTIVE,
        stats: { ...DEFAULT_PLAYER_STATS },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: this.getCurrentUserEmail()
      };

      // Try to save to Firebase
      if (this._syncStatus$.value !== 'offline') {
        try {
          const newPlayerRef = push(this.playersRef);
          await set(newPlayerRef, newPlayer);
          
          console.log('✅ Player created in Firebase:', newPlayerRef.key);
          return newPlayerRef.key!;
        } catch (error) {
          console.warn('⚠️ Firebase create failed, queuing for later:', error);
          // Fall through to offline handling
        }
      }

      // Offline handling
      const tempId = this.generateTempId();
      const playerWithId: PlayerInfo = {
        ...newPlayer,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as PlayerInfo;

      // Add to pending operations
      this.pendingOperations.push({
        type: 'create',
        data: newPlayer,
        timestamp: Date.now()
      });

      // Update local state immediately
      const currentMap = new Map(this._players$.value);
      currentMap.set(tempId, playerWithId);
      this._players$.next(currentMap);
      
      // Cache locally
      this.saveToLocalStorage(Array.from(currentMap.values()));
      
      console.log('📱 Player created offline (will sync later):', tempId);
      return tempId;
      
    } catch (error) {
      console.error('❌ Error creating player:', error);
      this._error$.next('Failed to create player');
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async updatePlayer(id: string, updates: Partial<PlayerInfo>): Promise<void> {
    try {
      this._loading$.next(true);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: this.getCurrentUserEmail()
      };

      // Try to update in Firebase
      if (this._syncStatus$.value !== 'offline') {
        try {
          const playerRef = ref(this.database, `players/${id}`);
          await update(playerRef, updateData);
          
          console.log('✅ Player updated in Firebase:', id);
          return;
        } catch (error) {
          console.warn('⚠️ Firebase update failed, queuing for later:', error);
          // Fall through to offline handling
        }
      }

      // Offline handling
      const currentMap = new Map(this._players$.value);
      const existingPlayer = currentMap.get(id);
      
      if (!existingPlayer) {
        throw new Error(`Player with id ${id} not found`);
      }

      const updatedPlayer: PlayerInfo = {
        ...existingPlayer,
        ...updateData,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };

      // Add to pending operations
      this.pendingOperations.push({
        type: 'update',
        id,
        data: updateData,
        timestamp: Date.now()
      });

      // Update local state immediately
      currentMap.set(id, updatedPlayer);
      this._players$.next(currentMap);
      
      // Cache locally
      this.saveToLocalStorage(Array.from(currentMap.values()));
      
      console.log('📱 Player updated offline (will sync later):', id);
      
    } catch (error) {
      console.error('❌ Error updating player:', error);
      this._error$.next('Failed to update player');
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  async deletePlayer(id: string): Promise<void> {
    try {
      this._loading$.next(true);
      
      // Try to delete from Firebase
      if (this._syncStatus$.value !== 'offline') {
        try {
          const playerRef = ref(this.database, `players/${id}`);
          await remove(playerRef);
          
          console.log('✅ Player deleted from Firebase:', id);
          return;
        } catch (error) {
          console.warn('⚠️ Firebase delete failed, queuing for later:', error);
          // Fall through to offline handling
        }
      }

      // Offline handling
      const currentMap = new Map(this._players$.value);
      const player = currentMap.get(id);
      
      if (!player) {
        throw new Error(`Player with id ${id} not found`);
      }

      // Add to pending operations
      this.pendingOperations.push({
        type: 'delete',
        id,
        timestamp: Date.now()
      });

      // Update local state immediately
      currentMap.delete(id);
      this._players$.next(currentMap);
      
      // Cache locally
      this.saveToLocalStorage(Array.from(currentMap.values()));
      
      console.log('📱 Player deleted offline (will sync later):', id);
      
    } catch (error) {
      console.error('❌ Error deleting player:', error);
      this._error$.next('Failed to delete player');
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  // Batch operations for better performance
  async batchUpdatePlayers(updates: { id: string; data: Partial<PlayerInfo> }[]): Promise<void> {
    console.log(`🔄 Batch updating ${updates.length} players...`);
    
    try {
      this._loading$.next(true);
      
      if (this._syncStatus$.value !== 'offline') {
        // Try Firebase batch update
        const updatePromises = updates.map(({ id, data }) => {
          const playerRef = ref(this.database, `players/${id}`);
          const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: this.getCurrentUserEmail()
          };
          return update(playerRef, updateData);
        });
        
        await Promise.all(updatePromises);
        console.log('✅ Batch update completed in Firebase');
        return;
      }

      // Offline batch update
      const currentMap = new Map(this._players$.value);
      
      updates.forEach(({ id, data }) => {
        const existingPlayer = currentMap.get(id);
        if (existingPlayer) {
          const updatedPlayer: PlayerInfo = {
            ...existingPlayer,
            ...data,
            id,
            updatedAt: new Date().toISOString()
          };
          currentMap.set(id, updatedPlayer);
          
          // Queue for later sync
          this.pendingOperations.push({
            type: 'update',
            id,
            data,
            timestamp: Date.now()
          });
        }
      });

      this._players$.next(currentMap);
      this.saveToLocalStorage(Array.from(currentMap.values()));
      
      console.log('📱 Batch update completed offline (will sync later)');
      
    } catch (error) {
      console.error('❌ Batch update failed:', error);
      this._error$.next('Batch update failed');
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  // Utility methods
  getPlayerById(id: string): PlayerInfo | undefined {
    return this._players$.value.get(id);
  }

  getAllPlayers(): PlayerInfo[] {
    const players = Array.from(this._players$.value.values());
    console.log('📊 getAllPlayers() returning:', players.length, 'players');
    console.log('📋 Players data:', players);
    return players;
  }

  getPlayerCount(): number {
    return this._players$.value.size;
  }

  getPlayersByPosition(position: string): PlayerInfo[] {
    return this.getAllPlayers().filter(player => player.position === position);
  }

  getActivePlayersCount(): number {
    return this.getAllPlayers().filter(player => player.status === PlayerStatus.ACTIVE).length;
  }

  searchPlayers(query: string): PlayerInfo[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.getAllPlayers();
    
    return this.getAllPlayers().filter(player => 
      player.firstName.toLowerCase().includes(searchTerm) ||
      player.lastName.toLowerCase().includes(searchTerm) ||
      player.fullName.toLowerCase().includes(searchTerm) ||
      player.position.toLowerCase().includes(searchTerm)
    );
  }

  // Offline support methods
  private async processPendingOperations(): Promise<void> {
    if (this.pendingOperations.length === 0) return;
    
    console.log(`🔄 Processing ${this.pendingOperations.length} pending operations...`);
    
    const operations = [...this.pendingOperations];
    this.pendingOperations = []; // Clear the queue
    
    for (const operation of operations) {
      try {
        switch (operation.type) {
        case 'create': {
          const newPlayerRef = push(this.playersRef);
          await set(newPlayerRef, {
            ...operation.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('✅ Pending create synced:', newPlayerRef.key);
          break;
        }          case 'update':
            if (operation.id) {
              const playerRef = ref(this.database, `players/${operation.id}`);
              await update(playerRef, {
                ...operation.data,
                updatedAt: serverTimestamp()
              });
              console.log('✅ Pending update synced:', operation.id);
            }
            break;
            
          case 'delete':
            if (operation.id) {
              const playerRef = ref(this.database, `players/${operation.id}`);
              await remove(playerRef);
              console.log('✅ Pending delete synced:', operation.id);
            }
            break;
        }
      } catch (error) {
        console.error('❌ Failed to sync pending operation:', operation, error);
        // Re-queue failed operations
        this.pendingOperations.push(operation);
      }
    }
    
    console.log('🎉 Pending operations sync completed');
  }

  private updatePlayersMap(players: PlayerInfo[]): void {
    const playerMap = new Map<string, PlayerInfo>();
    players.forEach(player => {
      playerMap.set(player.id, player);
    });
    
    this._players$.next(playerMap);
    console.log('🔄 Updated players map with', players.length, 'players');
  }

  private migratePlayerData(playerData: Record<string, unknown>): PlayerInfo {
    const now = new Date().toISOString();
    const data = playerData as Record<string, unknown>;
    
    return {
      id: (data.id as string) || this.generateTempId(),
      firstName: (data.firstName as string) || '',
      lastName: (data.lastName as string) || '',
      fullName: (data.fullName as string) || `${(data.firstName as string) || ''} ${(data.lastName as string) || ''}`.trim(),
      position: (data.position as string) || 'Chưa xác định',
      height: (data.height as number) || 0,
      weight: (data.weight as number) || 0,
      dateOfBirth: (data.dateOfBirth as string) || (data.DOB as string) || '',
      avatar: (data.avatar as string) || '',
      notes: (data.notes as string) || (data.note as string) || '',
      isRegistered: data.isRegistered !== undefined ? (data.isRegistered as boolean) : true,
      status: (data.status as PlayerStatus) || PlayerStatus.ACTIVE,
      stats: (data.stats as PlayerStats) || { ...DEFAULT_PLAYER_STATS },
      createdAt: (data.createdAt as string) || now,
      updatedAt: (data.updatedAt as string) || now
    };
  }

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromLocalStorage(): void {
    try {
      // Try Firebase cache first
      const firebaseCached = localStorage.getItem('firebase_players_cache');
      if (firebaseCached) {
        const players: PlayerInfo[] = JSON.parse(firebaseCached);
        this.updatePlayersMap(players);
        console.log('📂 Loaded', players.length, 'players from Firebase localStorage cache');
        return;
      }

      // Fall back to legacy localStorage data
      const legacyData = localStorage.getItem('players_data');
      if (legacyData) {
        const legacyPlayers: Record<string, unknown>[] = JSON.parse(legacyData);
        console.log('📂 Found legacy localStorage data:', legacyPlayers.length, 'players');
        
        const migratedPlayers = legacyPlayers.map(player => this.migratePlayerData(player));
        this.updatePlayersMap(migratedPlayers);
        console.log('📂 Migrated and loaded', migratedPlayers.length, 'players from legacy localStorage');
      }
    } catch (error) {
      console.warn('⚠️ Error loading from localStorage:', error);
    }
  }

  private saveToLocalStorage(players: PlayerInfo[]): void {
    try {
      localStorage.setItem('firebase_players_cache', JSON.stringify(players));
      localStorage.setItem('firebase_players_timestamp', Date.now().toString());
      console.log('💾 Cached', players.length, 'players to localStorage');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  private getCurrentUserEmail(): string {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user.email || 'system@thanglong.fc';
      }
    } catch (error) {
      console.warn('Could not get current user email:', error);
    }
    return 'system@thanglong.fc';
  }

  // Data migration and sync
  async migrateFromLocalStorage(): Promise<void> {
    console.log('🔄 Migrating players from localStorage to Firebase...');
    
    try {
      // Load existing localStorage data
      const localData = localStorage.getItem('players_data');
      if (!localData) {
        console.log('📝 No local data to migrate');
        return;
      }

      const localPlayers: Record<string, unknown>[] = JSON.parse(localData);
      console.log(`📊 Found ${localPlayers.length} local players to migrate`);

      // Migrate each player
      for (const localPlayer of localPlayers) {
        try {
          const migratedPlayer = this.migratePlayerData(localPlayer);
          // Remove id field for createPlayer method
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _, ...playerData } = migratedPlayer;
          
          await this.createPlayer(playerData);
          console.log('✅ Migrated player:', migratedPlayer.firstName);
        } catch (error) {
          console.error('❌ Failed to migrate player:', localPlayer, error);
        }
      }

      console.log('🎉 Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async exportPlayers(): Promise<PlayerInfo[]> {
    const players = this.getAllPlayers();
    console.log(`📊 Exporting ${players.length} players`);
    return players;
  }

  async importPlayers(players: PlayerInfo[]): Promise<void> {
    console.log(`📥 Importing ${players.length} players...`);
    
    const updates = players.map(player => ({
      id: player.id,
      data: player
    }));
    
    await this.batchUpdatePlayers(updates);
  }

  // Statistics and analytics
  getPlayerStatistics(): {
    total: number;
    active: number;
    inactive: number;
    byPosition: Record<string, number>;
    averageAge: number;
  } {
    const players = this.getAllPlayers();
    const now = new Date();
    
    const stats = {
      total: players.length,
      active: players.filter(p => p.status === PlayerStatus.ACTIVE).length,
      inactive: players.filter(p => p.status !== PlayerStatus.ACTIVE).length,
      byPosition: {} as Record<string, number>,
      averageAge: 0
    };

    // Count by position
    players.forEach(player => {
      stats.byPosition[player.position] = (stats.byPosition[player.position] || 0) + 1;
    });

    // Calculate average age
    const ages = players
      .filter(p => p.dateOfBirth)
      .map(p => {
        const birthDate = new Date(p.dateOfBirth);
        return now.getFullYear() - birthDate.getFullYear();
      });
    
    stats.averageAge = ages.length > 0 ? 
      Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;

    return stats;
  }

  // Cleanup
  destroy(): void {
    console.log('🧹 Cleaning up FirebasePlayerService...');
    
    // Unsubscribe from Firebase listeners
    if (this.playersRef) {
      off(this.playersRef);
    }
    
    // Complete observables
    this._players$.complete();
    this._loading$.complete();
    this._error$.complete();
    this._syncStatus$.complete();
    
    // Clear caches
    this.offlineCache.clear();
    this.pendingOperations = [];
    
    console.log('✅ FirebasePlayerService cleanup complete');
  }
}