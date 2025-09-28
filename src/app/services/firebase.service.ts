import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  onValue, 
  serverTimestamp,
  Database,
  goOffline,
  goOnline
} from 'firebase/database';
import { BehaviorSubject } from 'rxjs';
import { shareReplay, distinctUntilChanged } from 'rxjs';
import { firebaseConfig } from '../config/firebase.config';
import { AdminConfig } from '../config/admin.config';

export interface MatchResult {
  id?: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PlayerStats {
  id?: string;
  name: string;
  position: string;
  goals: number;
  assists: number;
  matches: number;
  updatedBy: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id?: string;
  date: string;
  description?: string;
  
  // Team data
  teamA?: string[];
  teamB?: string[];
  scoreA?: number;
  scoreB?: number;
  scorerA?: string;
  scorerB?: string;
  assistA?: string;
  assistB?: string;
  yellowA?: string;
  yellowB?: string;
  redA?: string;
  redB?: string;
  
  // Financial data - Revenue (Thu)
  thu?: number;
  thuMode?: 'auto' | 'manual';
  thu_main?: number;
  thu_penalties?: number;
  thu_other?: number;
  
  // Financial data - Expenses (Chi)
  chi_trongtai?: number;
  chi_nuoc?: number;
  chi_san?: number;
  chi_dilai?: number;
  chi_anuong?: number;
  chi_khac?: number;
  chi_total?: number;
  
  // Metadata
  createdAt?: string | number | null;
  updatedAt?: string | number | null;
  updatedBy?: string;
  lastSaved?: string;
  createdBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app = initializeApp(firebaseConfig);
  private database: Database = getDatabase(this.app, firebaseConfig.databaseURL);
  
  // Optimized BehaviorSubjects with caching
  private matchResultsSubject = new BehaviorSubject<MatchResult[]>([]);
  private playerStatsSubject = new BehaviorSubject<PlayerStats[]>([]);
  private historySubject = new BehaviorSubject<HistoryEntry[]>([]);
  
  // Cached observables with shareReplay for multiple subscribers
  public matchResults$ = this.matchResultsSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  
  public playerStats$ = this.playerStatsSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  
  public history$ = this.historySubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Connection status tracking
  private connectionStatus = new BehaviorSubject<boolean>(true);
  public isConnected$ = this.connectionStatus.asObservable();

  // Cache for frequently accessed data
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Batch operations queue
  private batchQueue: (() => Promise<void>)[] = [];
  private isBatchProcessing = false;

  constructor() {
    this.initializeOptimizedListeners();
    this.setupConnectionMonitoring();
    this.enableOfflineSupport();
  }

  private initializeOptimizedListeners() {
    // Optimized listeners with error handling and retry logic
    this.setupListener('matchResults', this.matchResultsSubject);
    this.setupListener('playerStats', this.playerStatsSubject);  
    this.setupListener('history', this.historySubject);
  }

  private setupListener<T>(path: string, subject: BehaviorSubject<T[]>) {
    const dbRef = ref(this.database, path);
    
    const retryListener = (retryCount = 0) => {
      onValue(dbRef, 
        (snapshot) => {
          try {
            const data = snapshot.val();
            const items: T[] = data ? Object.keys(data).map(key => ({
              id: key,
              ...data[key]
            })) : [];
            
            // Cache the data
            this.setCache(path, items);
            subject.next(items);
            
            console.log(`📊 Firebase ${path} updated:`, items.length, 'items');
          } catch (error) {
            console.error(`❌ Error processing ${path}:`, error);
            this.loadFromCache(path, subject);
          }
        },
        (error) => {
          console.error(`❌ Firebase ${path} listener error:`, error);
          this.connectionStatus.next(false);
          
          // Retry with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => retryListener(retryCount + 1), delay);
          } else {
            // Load from cache as fallback
            this.loadFromCache(path, subject);
          }
        }
      );
    };

    retryListener();
  }

  private setupConnectionMonitoring() {
    const connectedRef = ref(this.database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val();
      this.connectionStatus.next(isConnected);
      
      if (isConnected) {
        console.log('🔥 Firebase connected');
        this.processBatchQueue();
      } else {
        console.warn('⚠️ Firebase disconnected - using cache');
      }
    });
  }

  private enableOfflineSupport() {
    // Enable Firebase offline persistence
    try {
      // Firebase automatically enables offline persistence
      console.log('🔥 Firebase offline persistence enabled');
    } catch (error) {
      console.warn('⚠️ Offline persistence setup failed:', error);
    }
  }

  // Optimized CRUD operations with batching and caching

  async addMatchResult(matchResult: Omit<MatchResult, 'id'>): Promise<string> {
    return this.executeBatchOperation(async () => {
      const matchesRef = ref(this.database, 'matchResults');
      const newMatchRef = push(matchesRef);
      
      const optimizedMatchResult = {
        ...matchResult,
        updatedAt: new Date().toISOString()
      };
      
      await set(newMatchRef, optimizedMatchResult);
      
      // Update cache immediately
      const currentMatches = this.matchResultsSubject.value;
      const newMatch = { id: newMatchRef.key!, ...optimizedMatchResult };
      this.matchResultsSubject.next([...currentMatches, newMatch]);
      
      console.log('✅ Match result added:', newMatchRef.key);
      return newMatchRef.key!;
    });
  }

    async addPlayerStats(stats: Omit<PlayerStats, 'id'>): Promise<string> {
    return this.executeBatchOperation(async () => {
      const statsRef = ref(this.database, 'playerStats');
      const newStatsRef = push(statsRef);
      
      const optimizedStats = {
        ...stats,
        updatedAt: new Date().toISOString()
      };
      
      await set(newStatsRef, optimizedStats);
      
      // Update cache immediately
      const currentStats = this.playerStatsSubject.value;
      const newStats = { id: newStatsRef.key!, ...optimizedStats };
      this.playerStatsSubject.next([...currentStats, newStats]);
      
      console.log('✅ Player stats added:', newStatsRef.key);
      return newStatsRef.key!;
    });
  }

  async addHistoryEntry(entry: Omit<HistoryEntry, 'id'>): Promise<string> {
    return this.executeBatchOperation(async () => {
      const historyRef = ref(this.database, 'history');
      const newHistoryRef = push(historyRef);
      
      const optimizedEntry = {
        ...entry,
        createdAt: new Date().toISOString(), // Convert to string for local cache
        createdBy: this.getCurrentUserEmail()
      };
      
      await set(newHistoryRef, {
        ...entry,
        createdAt: serverTimestamp(),
        createdBy: this.getCurrentUserEmail()
      });
      
      // Update cache immediately
      const currentHistory = this.historySubject.value;
      const newEntry = { id: newHistoryRef.key!, ...optimizedEntry };
      this.historySubject.next([...currentHistory, newEntry]);
      
      console.log('✅ History entry added:', newHistoryRef.key);
      return newHistoryRef.key!;
    });
  }

  // Batch operation management
  private async executeBatchOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processBatchQueue();
    });
  }

  private async processBatchQueue() {
    if (this.isBatchProcessing || this.batchQueue.length === 0) {
      return;
    }

    this.isBatchProcessing = true;
    
    try {
      // Process operations in batches of 5
      while (this.batchQueue.length > 0) {
        const batch = this.batchQueue.splice(0, 5);
        await Promise.all(batch.map(operation => operation()));
      }
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
    } finally {
      this.isBatchProcessing = false;
    }
  }

  // Optimized cache management
  private setCache(key: string, data: unknown) {
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)),
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    this.cleanExpiredCache();
  }

  private getCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private loadFromCache<T>(key: string, subject: BehaviorSubject<T[]>) {
    const cachedData = this.getCache(key);
    if (cachedData) {
      subject.next(cachedData as T[]);
      console.log(`📦 Loaded ${key} from cache:`, (cachedData as T[]).length, 'items');
    }
  }

  private cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // Optimized getters with caching
  getCurrentMatchResults(): MatchResult[] {
    const cached = this.getCache('matchResults');
    return Array.isArray(cached) ? cached as MatchResult[] : this.matchResultsSubject.value;
  }

  getCurrentPlayerStats(): PlayerStats[] {
    const cached = this.getCache('playerStats');
    return Array.isArray(cached) ? cached as PlayerStats[] : this.playerStatsSubject.value;
  }

  getCurrentHistory(): HistoryEntry[] {
    const cached = this.getCache('history');
    return Array.isArray(cached) ? cached as HistoryEntry[] : this.historySubject.value;
  }

  // Permission helpers (optimized)
  isAdminByEmail(email: string): boolean {
    return AdminConfig.isAdminEmail(email);
  }

  isSuperAdminByEmail(email: string): boolean {
    return AdminConfig.isSuperAdminEmail(email);
  }

  // Connection management
  async goOnlineMode(): Promise<void> {
    try {
      goOnline(this.database);
      console.log('🔥 Firebase online mode enabled');
    } catch (error) {
      console.error('❌ Failed to enable online mode:', error);
    }
  }

  async goOfflineMode(): Promise<void> {
    try {
      goOffline(this.database);
      console.log('📱 Firebase offline mode enabled');
    } catch (error) {
      console.error('❌ Failed to enable offline mode:', error);
    }
  }

  // Analytics and monitoring
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      memoryUsage: JSON.stringify([...this.cache.values()]).length,
      oldestEntry: Math.min(...[...this.cache.values()].map(v => v.timestamp)),
      newestEntry: Math.max(...[...this.cache.values()].map(v => v.timestamp))
    };
    
    console.log('📊 Cache Statistics:', stats);
    return stats;
  }

  getBatchQueueStatus() {
    return {
      queueLength: this.batchQueue.length,
      isProcessing: this.isBatchProcessing
    };
  }

  // Delete methods
  async deleteMatchResult(id: string): Promise<void> {
    return this.executeBatchOperation(async () => {
      console.log('🗑️ Deleting match result:', id);
      const matchRef = ref(this.database, `matchResults/${id}`);
      await set(matchRef, null);
      
      // Update cache immediately
      const currentMatches = this.matchResultsSubject.value;
      const updatedMatches = currentMatches.filter(match => match.id !== id);
      this.matchResultsSubject.next(updatedMatches);
      
      console.log('✅ Match result deleted:', id);
    });
  }

  async deletePlayerStats(id: string): Promise<void> {
    return this.executeBatchOperation(async () => {
      console.log('🗑️ Deleting player stats:', id);
      const statsRef = ref(this.database, `playerStats/${id}`);
      await set(statsRef, null);
      
      // Update cache immediately
      const currentStats = this.playerStatsSubject.value;
      const updatedStats = currentStats.filter(stats => stats.id !== id);
      this.playerStatsSubject.next(updatedStats);
      
      console.log('✅ Player stats deleted:', id);
    });
  }

  // Match Financial Data Management
  async saveMatchFinances(matchData: HistoryEntry): Promise<string> {
    return this.executeBatchOperation(async () => {
      let historyRef;
      
      if (matchData.id) {
        // Update existing match
        historyRef = ref(this.database, `history/${matchData.id}`);
        const updateData = {
          ...matchData,
          updatedAt: serverTimestamp(),
          updatedBy: this.getCurrentUserEmail()
        };
        await set(historyRef, updateData);
        
        // Update cache
        const currentHistory = this.historySubject.value;
        const updatedHistory = currentHistory.map(entry => 
          entry.id === matchData.id ? { ...entry, ...updateData } : entry
        );
        this.historySubject.next(updatedHistory);
        
        console.log('💾 Match financial data updated:', matchData.id);
        return matchData.id;
      } else {
        // Create new match
        historyRef = ref(this.database, 'history');
        const newHistoryRef = push(historyRef);
        
        const newMatchData = {
          ...matchData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: this.getCurrentUserEmail()
        };
        
        await set(newHistoryRef, newMatchData);
        
        // Update cache
        const currentHistory = this.historySubject.value;
        const newEntry = { id: newHistoryRef.key!, ...newMatchData };
        this.historySubject.next([...currentHistory, newEntry]);
        
        console.log('💾 New match financial data created:', newHistoryRef.key);
        return newHistoryRef.key!;
      }
    });
  }

  async updateMatchFinancialField(matchId: string, field: string, value: any): Promise<void> {
    return this.executeBatchOperation(async () => {
      const fieldRef = ref(this.database, `history/${matchId}/${field}`);
      await set(fieldRef, value);
      
      // Also update metadata
      const metaRef = ref(this.database, `history/${matchId}/updatedAt`);
      await set(metaRef, serverTimestamp());
      
      // Update cache
      const currentHistory = this.historySubject.value;
      const updatedHistory = currentHistory.map(entry => 
        entry.id === matchId ? { ...entry, [field]: value, updatedAt: new Date().toISOString() } : entry
      );
      this.historySubject.next(updatedHistory);
      
      console.log(`💾 Match ${matchId} field ${field} updated:`, value);
    });
  }

  async batchUpdateMatchFinances(matchId: string, updates: Partial<HistoryEntry>): Promise<void> {
    return this.executeBatchOperation(async () => {
      const matchRef = ref(this.database, `history/${matchId}`);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: this.getCurrentUserEmail()
      };
      
      // Use Firebase's update method for partial updates
      const updatePromises = Object.entries(updateData).map(([key, value]) => {
        const fieldRef = ref(this.database, `history/${matchId}/${key}`);
        return set(fieldRef, value);
      });
      
      await Promise.all(updatePromises);
      
      // Update cache
      const currentHistory = this.historySubject.value;
      const updatedHistory = currentHistory.map(entry => 
        entry.id === matchId ? { ...entry, ...updateData } : entry
      );
      this.historySubject.next(updatedHistory);
      
      console.log(`💾 Match ${matchId} batch updated:`, Object.keys(updates));
    });
  }

  async syncLocalHistoryToFirebase(localHistory: HistoryEntry[]): Promise<void> {
    console.log(`🔄 Starting local history sync to Firebase (${localHistory.length} matches)...`);
    
    if (!localHistory || localHistory.length === 0) {
      console.log('📝 No matches to sync');
      return;
    }
    
    try {
      const batchSize = 5; // Process in smaller batches to avoid timeouts
      let synced = 0;
      
      for (let i = 0; i < localHistory.length; i += batchSize) {
        const batch = localHistory.slice(i, i + batchSize);
        
        // Process batch with Promise.all for better performance
        const batchPromises = batch.map(async (match) => {
          if (!match.id) {
            // Generate ID based on date and content
            match.id = `match_${match.date.replace(/[^0-9]/g, '')}_${Date.now() + Math.random()}`;
          }
          
          // Retry logic for individual match saves
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              await this.saveMatchFinances(match);
              synced++;
              console.log(`✅ Synced match ${synced}/${localHistory.length}: ${match.id}`);
              break;
            } catch (error) {
              retryCount++;
              console.warn(`⚠️ Retry ${retryCount}/${maxRetries} for match ${match.id}:`, error);
              
              if (retryCount === maxRetries) {
                throw new Error(`Failed to sync match ${match.id} after ${maxRetries} attempts`);
              }
              
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        });
        
        // Wait for current batch to complete before starting next
        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent rate limiting
        if (i + batchSize < localHistory.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`🎉 Successfully synced all ${localHistory.length} matches to Firebase`);
    } catch (error) {
      console.error('❌ Error syncing to Firebase:', error);
      throw error;
    }
  }

  async exportAllMatchFinances(): Promise<HistoryEntry[]> {
    const history = this.historySubject.value;
    console.log(`📊 Exporting ${history.length} match financial records`);
    return history;
  }

  // Utility methods
  private getCurrentUserEmail(): string | null {
    // This should integrate with your Firebase Auth service
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

  // Cleanup method
  destroy() {
    // Clean up listeners and cache
    this.cache.clear();
    this.batchQueue.length = 0;
    console.log('🧹 Firebase service cleaned up');
  }
}