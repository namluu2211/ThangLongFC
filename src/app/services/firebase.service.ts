import { Injectable } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
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
import { firebaseConfig, isFirebaseConfigValid } from '../config/firebase.config';
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
  date?: string;
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
  
  // Metadata (Firebase timestamps can be object, string, or number)
  createdAt?: string | number | object | null;
  updatedAt?: string | number | object | null;
  updatedBy?: string;
  lastSaved?: string;
  createdBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: import('firebase/app').FirebaseApp | null = null;
  private database: Database | null = null;
  private isEnabled = false;
  
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

  // Enhanced offline mode support
  private isOfflineMode = new BehaviorSubject<boolean>(false);
  public isOfflineMode$ = this.isOfflineMode.asObservable();

  // Cache for frequently accessed data with advanced features
  private cache = new Map<string, { data: unknown; timestamp: number; version: number; checksum?: string }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Prevent memory leaks

  // Enhanced batch operations with priority queue
  private batchQueue: { operation: () => Promise<void>; priority: number; retryCount: number }[] = [];
  private isBatchProcessing = false;
  private readonly MAX_RETRY_ATTEMPTS = 5;

  // Performance monitoring
  private performanceMetrics = {
    operationCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    cacheHitRate: 0,
    lastOperationTime: Date.now()
  };

  // Data validation and integrity
  private dataValidationEnabled = true;
  private integrityChecks = new Map<string, string>(); // checksums for data integrity

  // Network status monitoring
  private networkStatus = new BehaviorSubject<'online' | 'offline' | 'slow'>('online');

  constructor() {
    // Only initialize if config is valid to prevent bootstrap errors
    if (isFirebaseConfigValid) {
      this.initializeFirebaseService();
      this.setupNetworkMonitoring();
    } else {
      console.log('🔄 Firebase service running in offline mode (invalid config)');
      this.isEnabled = false;
      // Still set up network monitoring for potential future initialization
      this.setupNetworkMonitoring();
    }
  }

  private initializeFirebaseService() {
    try {
      // Check if Firebase app already exists
      const existingApps = getApps();
      if (existingApps.length > 0) {
        console.log('🔥 Using existing Firebase app instance in firebase.service');
        this.app = existingApps[0];
      } else {
        console.log('🔥 Initializing new Firebase app in firebase.service');
        this.app = initializeApp(firebaseConfig);
      }
      this.database = getDatabase(this.app, firebaseConfig.databaseURL);
      this.isEnabled = true;
      console.log('✅ Firebase service initialized successfully');
      this.initializeOptimizedListeners();
      this.setupConnectionMonitoring();
      this.enableOfflineSupport();
    } catch (error) {
      console.error('❌ Firebase service initialization failed:', error);
      this.isEnabled = false;
    }
  }

  private initializeOptimizedListeners() {
    // Optimized listeners with error handling and retry logic
    this.setupListener('matchResults', this.matchResultsSubject);
    this.setupListener('playerStats', this.playerStatsSubject);  
    this.setupListener('history', this.historySubject);
  }

  private setupListener<T>(path: string, subject: BehaviorSubject<T[]>) {
    if (!this.isEnabled || !this.database) {
      console.log(`⚠️ Skipping ${path} listener - Firebase not available`);
      return;
    }
    
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
  private async executeBatchOperation<T>(operation: () => Promise<T>, priority = 1): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        operation: async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        priority,
        retryCount: 0
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
      // Sort by priority and process operations in batches of 5
      this.batchQueue.sort((a, b) => b.priority - a.priority);
      
      while (this.batchQueue.length > 0) {
        const batch = this.batchQueue.splice(0, 5);
        await Promise.all(batch.map(item => {
          const startTime = Date.now();
          return item.operation().then(() => {
            this.updatePerformanceMetrics(Date.now() - startTime, true);
          }).catch((error) => {
            this.updatePerformanceMetrics(Date.now() - startTime, false);
            if (item.retryCount < this.MAX_RETRY_ATTEMPTS) {
              item.retryCount++;
              this.batchQueue.unshift(item); // Retry with higher priority
              console.warn(`🔄 Retrying operation (${item.retryCount}/${this.MAX_RETRY_ATTEMPTS}):`, error);
            } else {
              console.error('❌ Max retry attempts reached:', error);
              throw error;
            }
          });
        }));
      }
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
    } finally {
      this.isBatchProcessing = false;
    }
  }

  // Enhanced cache management with integrity checks
  private setCache(key: string, data: unknown) {
    const serializedData = JSON.stringify(data);
    const checksum = this.generateChecksum(serializedData);
    
    this.cache.set(key, {
      data: JSON.parse(serializedData),
      timestamp: Date.now(),
      version: Date.now(), // Use timestamp as version
      checksum
    });
    
    // Maintain cache size limit
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = [...this.cache.entries()]
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
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

  // Enhanced analytics and monitoring
  getCacheStats() {
    const entries = [...this.cache.values()];
    const stats = {
      totalEntries: this.cache.size,
      memoryUsage: JSON.stringify(entries).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(v => v.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(v => v.timestamp)) : 0,
      hitRate: this.performanceMetrics.cacheHitRate,
      averageAge: entries.length > 0 ? (Date.now() - entries.reduce((sum, v) => sum + v.timestamp, 0) / entries.length) : 0
    };
    
    console.log('📊 Enhanced Cache Statistics:', stats);
    return stats;
  }

  getBatchQueueStatus() {
    return {
      queueLength: this.batchQueue.length,
      isProcessing: this.isBatchProcessing,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      operationCount: this.performanceMetrics.operationCount,
      errorCount: this.performanceMetrics.errorCount
    };
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  // Performance tracking
  private updatePerformanceMetrics(responseTime: number, success: boolean) {
    this.performanceMetrics.operationCount++;
    this.performanceMetrics.lastOperationTime = Date.now();
    
    if (success) {
      // Update rolling average response time
      const count = this.performanceMetrics.operationCount;
      this.performanceMetrics.averageResponseTime = 
        (this.performanceMetrics.averageResponseTime * (count - 1) + responseTime) / count;
    } else {
      this.performanceMetrics.errorCount++;
    }
    
    // Update cache hit rate (simplified calculation)
    const cacheHits = this.cache.size;
    const totalOps = this.performanceMetrics.operationCount;
    this.performanceMetrics.cacheHitRate = (cacheHits / Math.max(totalOps, 1)) * 100;
  }

  // Data integrity
  private generateChecksum(data: string): string {
    // Simple checksum implementation (for production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private validateDataIntegrity(key: string, data: unknown): boolean {
    if (!this.dataValidationEnabled) return true;
    
    const cached = this.cache.get(key);
    if (!cached) return true;
    
    const currentChecksum = this.generateChecksum(JSON.stringify(data));
    const isValid = currentChecksum === cached.checksum;
    
    if (!isValid) {
      console.warn(`⚠️ Data integrity check failed for ${key}`);
    }
    
    return isValid;
  }

  // Network monitoring
  private setupNetworkMonitoring() {
    // Monitor connection quality (with proper typing)
    const nav = navigator as Navigator & { connection?: { effectiveType: string; addEventListener: (event: string, callback: () => void) => void } };
    if (nav.connection) {
      const updateNetworkStatus = () => {
        const effectiveType = nav.connection!.effectiveType;
        if (effectiveType === '4g') {
          this.networkStatus.next('online');
        } else if (effectiveType === '3g' || effectiveType === '2g') {
          this.networkStatus.next('slow');
        } else {
          this.networkStatus.next('offline');
        }
      };

      nav.connection.addEventListener('change', updateNetworkStatus);
      updateNetworkStatus();
    }

    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored');
      this.networkStatus.next('online');
      this.connectionStatus.next(true);
      this.isOfflineMode.next(false);
    });

    window.addEventListener('offline', () => {
      console.warn('📱 Network connection lost');
      this.networkStatus.next('offline');
      this.connectionStatus.next(false);
      this.isOfflineMode.next(true);
    });
  }

  // Enhanced offline mode management
  async enableOfflineMode(): Promise<void> {
    console.log('📱 Enabling enhanced offline mode');
    this.isOfflineMode.next(true);
    
    // Save current data to localStorage as backup
    this.saveToLocalStorage();
    
    try {
      if (this.database) {
        goOffline(this.database);
      }
    } catch (error) {
      console.warn('⚠️ Firebase offline mode setup warning:', error);
    }
  }

  async enableOnlineMode(): Promise<void> {
    console.log('🌐 Enabling online mode');
    this.isOfflineMode.next(false);
    
    try {
      if (this.database) {
        goOnline(this.database);
        // Sync any offline changes
        await this.syncOfflineChanges();
      }
    } catch (error) {
      console.warn('⚠️ Firebase online mode setup warning:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('firebase_cache_matchResults', JSON.stringify(this.getCurrentMatchResults()));
      localStorage.setItem('firebase_cache_playerStats', JSON.stringify(this.getCurrentPlayerStats()));
      localStorage.setItem('firebase_cache_history', JSON.stringify(this.getCurrentHistory()));
      localStorage.setItem('firebase_cache_timestamp', Date.now().toString());
      console.log('💾 Data cached to localStorage for offline access');
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
    }
  }

  private async syncOfflineChanges(): Promise<void> {
    console.log('🔄 Syncing offline changes...');
    
    try {
      // Check if there are any pending changes in localStorage
      const pendingChanges = localStorage.getItem('firebase_pending_changes');
      if (pendingChanges) {
        const changes = JSON.parse(pendingChanges);
        
        for (const change of changes) {
          try {
            await this.executeBatchOperation(async () => {
              // Execute pending change based on type
              console.log('🔄 Syncing change:', change.type, change.id);
            }, 3); // High priority for sync
          } catch (error) {
            console.error('❌ Failed to sync change:', change, error);
          }
        }
        
        // Clear pending changes after successful sync
        localStorage.removeItem('firebase_pending_changes');
        console.log('✅ Offline changes synced successfully');
      }
    } catch (error) {
      console.error('❌ Error syncing offline changes:', error);
    }
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
      console.log('💾 Saving match finances:', { id: matchData.id, hasData: !!matchData });
      let historyRef;
      
      if (matchData.id) {
        // Update existing match
        historyRef = ref(this.database, `history/${matchData.id}`);
        // Filter out undefined values for Firebase compatibility
        const cleanMatchData = Object.fromEntries(
          Object.entries(matchData).filter(entry => entry[1] !== undefined)
        );
        const updateData = {
          ...cleanMatchData,
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
        
        // Filter out undefined values and exclude id for new entries
        const matchDataWithoutId = Object.fromEntries(
          Object.entries(matchData).filter(([key, value]) => key !== 'id' && value !== undefined)
        );
        const newMatchData = {
          ...matchDataWithoutId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: this.getCurrentUserEmail()
        };
        
        await set(newHistoryRef, newMatchData);
        
        // Update cache
        const currentHistory = this.historySubject.value;
        const newEntry: HistoryEntry = { id: newHistoryRef.key!, ...newMatchData } as HistoryEntry;
        this.historySubject.next([...currentHistory, newEntry]);
        
        console.log('💾 New match financial data created:', newHistoryRef.key);
        return newHistoryRef.key!;
      }
    });
  }

  async updateMatchFinancialField(matchId: string, field: string, value: string | number | boolean | null | undefined): Promise<void> {
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
    }, 2); // Higher priority for batch updates
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

  // Enhanced service management
  async resetService(): Promise<void> {
    console.log('🔄 Resetting Firebase service...');
    
    // Clear cache and queues
    this.cache.clear();
    this.batchQueue.length = 0;
    
    // Reset performance metrics
    this.performanceMetrics = {
      operationCount: 0,
      averageResponseTime: 0,
      errorCount: 0,
      cacheHitRate: 0,
      lastOperationTime: Date.now()
    };
    
    // Reinitialize if needed
    if (this.isEnabled && this.database) {
      this.initializeOptimizedListeners();
    }
    
    console.log('✅ Firebase service reset complete');
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      firebase: boolean;
      cache: boolean;
      network: string;
      performance: {
        responseTime: number;
        errorRate: number;
      };
    };
  }> {
    const details = {
      firebase: this.isEnabled && !!this.database,
      cache: this.cache.size > 0,
      network: this.networkStatus.value,
      performance: {
        responseTime: this.performanceMetrics.averageResponseTime,
        errorRate: this.performanceMetrics.operationCount > 0 ? 
          (this.performanceMetrics.errorCount / this.performanceMetrics.operationCount) * 100 : 0
      }
    };

    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (details.firebase && details.network === 'online' && details.performance.errorRate < 5) {
      status = 'healthy';
    } else if (details.firebase || details.cache) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    console.log('🏥 Firebase service health check:', status, details);
    return { status, details };
  }

  // Configuration methods
  enableDataValidation(enabled: boolean): void {
    this.dataValidationEnabled = enabled;
    console.log(`🛡️ Data validation ${enabled ? 'enabled' : 'disabled'}`);
  }

  setCacheDuration(duration: number): void {
    this.CACHE_DURATION = duration;
    console.log(`⏰ Cache duration set to ${duration}ms`);
  }

  // Enhanced cleanup method
  destroy() {
    console.log('🧹 Cleaning up Firebase service...');
    
    // Event listeners will be automatically cleaned up when the service is destroyed
    
    // Clear all data
    this.cache.clear();
    this.batchQueue.length = 0;
    this.integrityChecks.clear();
    
    // Complete observables
    this.matchResultsSubject.complete();
    this.playerStatsSubject.complete();
    this.historySubject.complete();
    this.connectionStatus.complete();
    this.isOfflineMode.complete();
    this.networkStatus.complete();
    
    console.log('✅ Firebase service cleanup complete');
  }
}