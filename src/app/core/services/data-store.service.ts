/**
 * Core Data Store Service
 * Centralized data management with caching, synchronization, and offline support
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, timer, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { PlayerInfo } from '../models/player.model';
import { MatchInfo } from '../models/match.model';
import { PlayerService } from './player.service';
import { MatchService } from './match.service';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { Player } from '../../features/players/player-utils';

export interface AppState {
  players: {
    list: PlayerInfo[];
    loading: boolean;
    error: string | null;
    lastUpdated: string;
    totalCount: number;
  };
  matches: {
    list: MatchInfo[];
    loading: boolean;
    error: string | null;
    lastUpdated: string;
    totalCount: number;
  };
  fund: {
    current: number;
    loading: boolean;
    error: string | null;
    lastUpdated: string;
    history: FundTransaction[];
  };
  sync: {
    isOnline: boolean;
    lastSync: string;
    pending: number;
    syncing: boolean;
    error: string | null;
  };
  ui: {
    theme: 'light' | 'dark';
    language: 'vi' | 'en';
    notifications: boolean;
    compactMode: boolean;
  };
}

export interface FundTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  matchId?: string;
  date: string;
  createdAt: string;
  createdBy: string;
}

export interface DataStorageConfig {
  enableLocalStorage: boolean;
  enableFirebase: boolean;
  syncInterval: number; // in minutes
  cacheExpiry: number; // in minutes
  retryAttempts: number;
  compressionEnabled: boolean;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date;
  pendingOperations: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {
  private readonly playerService = inject(PlayerService);
  private readonly matchService = inject(MatchService);
  private readonly firebaseService = inject(FirebaseService);

  // Team state sharing for analysis route & stats
  private readonly _teamA$ = new BehaviorSubject<Player[]>([]);
  private readonly _teamB$ = new BehaviorSubject<Player[]>([]);

  get teamA$(): Observable<Player[]> { return this._teamA$.asObservable(); }
  get teamB$(): Observable<Player[]> { return this._teamB$.asObservable(); }

  /**
   * Set current teams (publishing shallow copies to avoid accidental mutation across routes)
   */
  setTeams(teamA: Player[], teamB: Player[]): void {
    this._teamA$.next([...teamA]);
    this._teamB$.next([...teamB]);
  }

  // Application state
  private readonly _appState$ = new BehaviorSubject<AppState>(this.getInitialAppState());
  
  // Configuration
  private readonly config: DataStorageConfig = {
    enableLocalStorage: true,
    enableFirebase: true,
    syncInterval: 30, // 30 minutes
    cacheExpiry: 60, // 1 hour
    retryAttempts: 3,
    compressionEnabled: true
  };

  // Cache management
  private cache = new Map<string, { data: unknown; timestamp: number; expiry: number }>();
  private readonly CACHE_KEYS = {
    PLAYERS: 'players_cache',
    MATCHES: 'matches_cache',
    FUND: 'fund_cache',
    APP_STATE: 'app_state_cache'
  };

  // Sync management
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private syncTimer?: any;
  private pendingOperations: { type: string; data: unknown; timestamp: number }[] = [];

  constructor() {
    this.initializeDataStore();
  }

  // Public observables
  get appState$(): Observable<AppState> {
    return this._appState$.asObservable();
  }

  get players$(): Observable<PlayerInfo[]> {
    return this._appState$.pipe(
      map(state => state.players.list)
    );
  }

  get matches$(): Observable<MatchInfo[]> {
    return this._appState$.pipe(
      map(state => state.matches.list)
    );
  }

  get fund$(): Observable<number> {
    return this._appState$.pipe(
      map(state => state.fund.current)
    );
  }

  get fundHistory$(): Observable<FundTransaction[]> {
    return this._appState$.pipe(
      map(state => state.fund.history)
    );
  }

  get syncStatus$(): Observable<SyncStatus> {
    return this._appState$.pipe(
      map(state => ({
        isConnected: state.sync.isOnline,
        lastSync: new Date(state.sync.lastSync),
        pendingOperations: state.sync.pending,
        errors: state.sync.error ? [state.sync.error] : []
      }))
    );
  }

  get isLoading$(): Observable<boolean> {
    return this._appState$.pipe(
      map(state => 
        state.players.loading || 
        state.matches.loading || 
        state.fund.loading ||
        state.sync.syncing
      )
    );
  }

  // Data operations
  async refreshAllData(): Promise<void> {
    try {
      this.updateAppState(state => ({
        ...state,
        players: { ...state.players, loading: true },
        matches: { ...state.matches, loading: true },
        fund: { ...state.fund, loading: true }
      }));

      const [players, matches, fundAmount] = await Promise.all([
        this.loadPlayersFromSources(),
        this.loadMatchesFromSources(),
        this.loadFundFromSources()
      ]);

      this.updateAppState(state => ({
        ...state,
        players: {
          list: players,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
          totalCount: players.length
        },
        matches: {
          list: matches,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
          totalCount: matches.length
        },
        fund: {
          ...state.fund,
          current: fundAmount,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString()
        }
      }));

      console.log('✅ Data refresh completed successfully');

    } catch (error) {
      this.handleDataError(error, 'refresh');
      throw error;
    }
  }

  async syncWithFirebase(): Promise<void> {
    if (!this.config.enableFirebase) {
      console.warn('Firebase sync is disabled');
      return;
    }

    try {
      this.updateAppState(state => ({
        ...state,
        sync: { ...state.sync, syncing: true, error: null }
      }));

      // Sync players
      await this.syncPlayersWithFirebase();

      // Sync matches
      await this.syncMatchesWithFirebase();

      // Sync fund transactions
      await this.syncFundWithFirebase();

      // Process pending operations
      await this.processPendingOperations();

      this.updateAppState(state => ({
        ...state,
        sync: {
          ...state.sync,
          syncing: false,
          lastSync: new Date().toISOString(),
          pending: this.pendingOperations.length
        }
      }));

      console.log('✅ Firebase sync completed');

    } catch (error) {
      this.updateAppState(state => ({
        ...state,
        sync: {
          ...state.sync,
          syncing: false,
          error: error.message
        }
      }));
      console.error('❌ Firebase sync failed:', error);
      throw error;
    }
  }

  // Fund management
  async addFundTransaction(transaction: Omit<FundTransaction, 'id' | 'createdAt'>): Promise<FundTransaction> {
    const newTransaction: FundTransaction = {
      ...transaction,
      id: this.generateTransactionId(),
      createdAt: new Date().toISOString()
    };

    // Update fund amount
    const currentState = this._appState$.value;
    const newAmount = transaction.type === 'income' 
      ? currentState.fund.current + transaction.amount
      : currentState.fund.current - transaction.amount;

    this.updateAppState(state => ({
      ...state,
      fund: {
        ...state.fund,
        current: newAmount,
        history: [...state.fund.history, newTransaction],
        lastUpdated: new Date().toISOString()
      }
    }));

    // Add to pending operations for sync
    this.addPendingOperation('fund_transaction_add', newTransaction);

    // Save to localStorage
    await this.saveFundToStorage();

    // Also save to Firebase Realtime Database
    try {
      const firebaseId = await this.firebaseService.addFundTransaction({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        matchId: transaction.matchId,
        date: transaction.date,
        createdBy: transaction.createdBy
      });
      console.log('✅ Fund transaction synced to Firebase:', firebaseId);
    } catch (error) {
      console.warn('⚠️ Failed to sync fund transaction to Firebase:', error);
      // Continue operation even if Firebase sync fails
    }

    console.log('✅ Fund transaction added:', newTransaction);
    return newTransaction;
  }

  async removeFundTransaction(transactionId: string): Promise<boolean> {
    const currentState = this._appState$.value;
    const transaction = currentState.fund.history.find(t => t.id === transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Reverse the fund amount change
    const newAmount = transaction.type === 'income'
      ? currentState.fund.current - transaction.amount
      : currentState.fund.current + transaction.amount;

    this.updateAppState(state => ({
      ...state,
      fund: {
        ...state.fund,
        current: newAmount,
        history: state.fund.history.filter(t => t.id !== transactionId),
        lastUpdated: new Date().toISOString()
      }
    }));

    // Add to pending operations for sync
    this.addPendingOperation('fund_transaction_remove', { id: transactionId });

    // Save to localStorage
    await this.saveFundToStorage();

    // Also remove from Firebase Realtime Database
    try {
      await this.firebaseService.deleteFundTransaction(transactionId);
      console.log('✅ Fund transaction removed from Firebase:', transactionId);
    } catch (error) {
      console.warn('⚠️ Failed to remove fund transaction from Firebase:', error);
      // Continue operation even if Firebase sync fails
    }

    console.log('✅ Fund transaction removed:', transactionId);
    return true;
  }

  // Fund synchronization with match history
  async syncFundWithMatchHistory(matchHistory: HistoryEntry[]): Promise<{
    transactionsAdded: number;
    fundBalanceUpdated: boolean;
    errors: string[];
  }> {
    console.log('🔄 Starting fund synchronization with match history...');
    
    const result = {
      transactionsAdded: 0,
      fundBalanceUpdated: false,
      errors: [] as string[]
    };

    try {
      const currentTransactions = this._appState$.value.fund.history;
      const transactionsToAdd: Omit<FundTransaction, 'id' | 'createdAt'>[] = [];

      // Analyze each match in history
      for (const match of matchHistory) {
        try {
          const matchDate = match.date || new Date().toISOString().split('T')[0];
          const matchTransactions = this.generateTransactionsFromMatch(match, matchDate);
          
          // Check for existing transactions to avoid duplicates
          for (const transaction of matchTransactions) {
            const exists = currentTransactions.some(existing => 
              existing.description === transaction.description &&
              existing.date === transaction.date &&
              existing.amount === transaction.amount &&
              existing.type === transaction.type
            );

            if (!exists) {
              transactionsToAdd.push(transaction);
            }
          }
        } catch (error) {
          result.errors.push(`Error processing match ${match.id || 'unknown'}: ${(error as Error).message}`);
        }
      }

      // Add new transactions
      for (const transaction of transactionsToAdd) {
        await this.addFundTransaction(transaction);
        result.transactionsAdded++;
      }

      result.fundBalanceUpdated = result.transactionsAdded > 0;
      
      console.log(`✅ Fund sync completed: ${result.transactionsAdded} transactions added`);
      return result;

    } catch (error) {
      result.errors.push(`Fund sync failed: ${error.message}`);
      console.error('❌ Fund synchronization failed:', error);
      return result;
    }
  }

  private generateTransactionsFromMatch(match: HistoryEntry, matchDate: string): Omit<FundTransaction, 'id' | 'createdAt'>[] {
    const transactions: Omit<FundTransaction, 'id' | 'createdAt'>[] = [];

    // Generate income transactions
    if (match.thu && match.thu > 0) {
      transactions.push({
        type: 'income',
        amount: match.thu,
        description: `Thu nhập từ trận đấu ngày ${matchDate}`,
        category: 'match_fee',
        date: matchDate,
        createdBy: 'history-sync'
      });
    }

    // Generate expense transactions
    if (match.chi_san && match.chi_san > 0) {
      transactions.push({
        type: 'expense',
        amount: match.chi_san,
        description: `Chi phí sân bóng - ${matchDate}`,
        category: 'field_rental',
        date: matchDate,
        createdBy: 'history-sync'
      });
    }

    if (match.chi_trongtai && match.chi_trongtai > 0) {
      transactions.push({
        type: 'expense',
        amount: match.chi_trongtai,
        description: `Chi phí trọng tài - ${matchDate}`,
        category: 'referee_fee',
        date: matchDate,
        createdBy: 'history-sync'
      });
    }

    if (match.chi_nuoc && match.chi_nuoc > 0) {
      transactions.push({
        type: 'expense',
        amount: match.chi_nuoc,
        description: `Chi phí nước uống - ${matchDate}`,
        category: 'refreshments',
        date: matchDate,
        createdBy: 'history-sync'
      });
    }

    return transactions;
  }

  async recalculateFundBalanceFromHistory(): Promise<{
    oldBalance: number;
    newBalance: number;
    transactionCount: number;
  }> {
    console.log('🔄 Recalculating fund balance from transaction history...');
    
    const currentState = this._appState$.value;
    const oldBalance = currentState.fund.current;
    
    // Calculate balance from all transactions
    const newBalance = currentState.fund.history.reduce((balance, transaction) => {
      return transaction.type === 'income' 
        ? balance + transaction.amount
        : balance - transaction.amount;
    }, 0);

    // Update the fund balance
    this.updateAppState(state => ({
      ...state,
      fund: {
        ...state.fund,
        current: newBalance,
        lastUpdated: new Date().toISOString()
      }
    }));

    await this.saveFundToStorage();

    console.log(`✅ Fund balance recalculated: ${oldBalance} → ${newBalance}`);
    
    return {
      oldBalance,
      newBalance,
      transactionCount: currentState.fund.history.length
    };
  }

  async syncFundTransactionsToFirebase(): Promise<{
    synced: number;
    errors: string[];
  }> {
    console.log('🔄 Starting fund transactions sync to Firebase...');
    
    const result = {
      synced: 0,
      errors: [] as string[]
    };

    try {
      const currentState = this._appState$.value;
      const localTransactions = currentState.fund.history;
      
      console.log(`📊 Found ${localTransactions.length} local fund transactions to sync`);

      // Get existing Firebase transactions to avoid duplicates
      const firebaseTransactions = await new Promise<FundTransaction[]>((resolve) => {
        this.firebaseService.fundTransactions$.pipe(take(1)).subscribe({
          next: (transactions) => resolve(transactions as FundTransaction[]),
          error: () => resolve([])
        });
      });

      // Sync each local transaction to Firebase if not already exists
      for (const transaction of localTransactions) {
        try {
          // Check if transaction already exists in Firebase
          const exists = firebaseTransactions.some(fbTransaction => 
            fbTransaction.description === transaction.description &&
            fbTransaction.date === transaction.date &&
            fbTransaction.amount === transaction.amount &&
            fbTransaction.type === transaction.type
          );

          if (!exists) {
            await this.firebaseService.addFundTransaction({
              type: transaction.type,
              amount: transaction.amount,
              description: transaction.description,
              category: transaction.category,
              matchId: transaction.matchId,
              date: transaction.date,
              createdBy: transaction.createdBy
            });
            result.synced++;
          }
        } catch (error) {
          result.errors.push(`Error syncing transaction ${transaction.id}: ${(error as Error).message}`);
        }
      }

      console.log(`✅ Fund transactions sync completed: ${result.synced} synced, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      result.errors.push(`Fund sync failed: ${(error as Error).message}`);
      console.error('❌ Fund transactions sync failed:', error);
      return result;
    }
  }

  // Statistics and analytics
  getAppStatistics(): Observable<{
    players: {
      total: number;
      active: number;
      averageWinRate: number;
      topScorer: string;
    };
    matches: {
      total: number;
      thisMonth: number;
      averageGoals: number;
      profitability: number;
    };
    fund: {
      current: number;
      totalIncome: number;
      totalExpenses: number;
      monthlyChange: number;
    };
  }> {
    return combineLatest([
      this.players$,
      this.matches$,
      this.fund$,
      this.fundHistory$
    ]).pipe(
      map(([players, matches, fund, transactions]) => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return {
          players: {
            total: players.length,
            active: players.filter(p => p.stats.lastMatchDate && 
              new Date(p.stats.lastMatchDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            ).length,
            averageWinRate: players.reduce((sum, p) => sum + (p.stats.winRate || 0), 0) / players.length || 0,
            topScorer: this.getTopScorer(players)
          },
          matches: {
            total: matches.length,
            thisMonth: matches.filter(m => new Date(m.date) >= thisMonth).length,
            averageGoals: this.calculateAverageGoals(matches),
            profitability: this.calculateProfitability(matches)
          },
          fund: {
            current: fund,
            totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            monthlyChange: this.calculateMonthlyFundChange(transactions)
          }
        };
      })
    );
  }

  // Configuration management
  updateConfig(updates: Partial<DataStorageConfig>): void {
    Object.assign(this.config, updates);
    
    // Restart sync timer if interval changed
    if (updates.syncInterval && this.syncTimer) {
      this.stopAutoSync();
      this.startAutoSync();
    }

    console.log('Configuration updated:', updates);
  }

  getConfig(): DataStorageConfig {
    return { ...this.config };
  }

  // Cache management
  getCacheInfo(): { size: number; entries: number; oldestEntry: Date | null } {
    const entries = Array.from(this.cache.entries());
    
    return {
      size: JSON.stringify(entries).length,
      entries: entries.length,
      oldestEntry: entries.length > 0 
        ? new Date(Math.min(...entries.map(([, value]) => value.timestamp)))
        : null
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('✅ Cache cleared');
  }

  // Export/Import functionality
  async exportAppData(): Promise<string> {
    const currentState = this._appState$.value;
    
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      data: {
        players: currentState.players.list,
        matches: currentState.matches.list,
        fund: {
          current: currentState.fund.current,
          history: currentState.fund.history
        },
        settings: currentState.ui
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importAppData(jsonData: string): Promise<{ 
    playersImported: number; 
    matchesImported: number; 
    transactionsImported: number; 
  }> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.version || !importData.data) {
        throw new Error('Invalid import data format');
      }

      let playersImported = 0;
      let matchesImported = 0;
      let transactionsImported = 0;

      // Import players
      if (importData.data.players) {
        for (const playerData of importData.data.players) {
          try {
            await this.playerService.createPlayer(playerData);
            playersImported++;
          } catch (error) {
            console.warn(`Failed to import player ${playerData.firstName}:`, error);
          }
        }
      }

      // Import matches
      if (importData.data.matches) {
        for (const matchData of importData.data.matches) {
          try {
            await this.matchService.createMatch(matchData);
            matchesImported++;
          } catch (error) {
            console.warn(`Failed to import match ${matchData.date}:`, error);
          }
        }
      }

      // Import fund transactions
      if (importData.data.fund?.history) {
        for (const transaction of importData.data.fund.history) {
          try {
            await this.addFundTransaction(transaction);
            transactionsImported++;
          } catch (error) {
            console.warn(`Failed to import transaction ${transaction.id}:`, error);
          }
        }
      }

      // Refresh data after import
      await this.refreshAllData();

      console.log('✅ Import completed:', { playersImported, matchesImported, transactionsImported });
      return { playersImported, matchesImported, transactionsImported };

    } catch (error) {
      console.error('❌ Import failed:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  // Private methods
  private async initializeDataStore(): Promise<void> {
    try {
      // Load cached state
      await this.loadAppStateFromStorage();
      
      // Start auto-sync if enabled
      if (this.config.enableFirebase) {
        this.startAutoSync();
      }

      // Listen for online/offline status
      this.setupNetworkListener();

      console.log('✅ Data store initialized');

    } catch (error) {
      console.error('❌ Failed to initialize data store:', error);
    }
  }

  private async loadPlayersFromSources(): Promise<PlayerInfo[]> {
    // Try cache first
    const cached = this.getFromCache(this.CACHE_KEYS.PLAYERS) as PlayerInfo[];
    if (cached) {
      return cached;
    }

    // Load from player service
    return new Promise((resolve, reject) => {
      this.playerService.players$.pipe(
        map(players => players || []),
        catchError(error => {
          console.error('Failed to load players:', error);
          return of([]);
        })
      ).subscribe({
        next: players => {
          this.setCache(this.CACHE_KEYS.PLAYERS, players);
          resolve(players);
        },
        error: reject
      });
    });
  }

  private async loadMatchesFromSources(): Promise<MatchInfo[]> {
    // Try cache first
    const cached = this.getFromCache(this.CACHE_KEYS.MATCHES) as MatchInfo[];
    if (cached) {
      return cached;
    }

    // Load from match service
    return new Promise((resolve, reject) => {
      this.matchService.matches$.pipe(
        map(matches => matches || []),
        catchError(error => {
          console.error('Failed to load matches:', error);
          return of([]);
        })
      ).subscribe({
        next: matches => {
          this.setCache(this.CACHE_KEYS.MATCHES, matches);
          resolve(matches);
        },
        error: reject
      });
    });
  }

  private async loadFundFromSources(): Promise<number> {
    try {
      // Load fund from localStorage
      const fundData = localStorage.getItem('fundData');
      if (fundData) {
        const parsed = JSON.parse(fundData);
        return parsed.current || 0;
      }
      return 0;
    } catch (error) {
      console.error('Failed to load fund:', error);
      return 0;
    }
  }

  private async loadAppStateFromStorage(): Promise<void> {
    try {
      if (!this.config.enableLocalStorage) return;

      const savedState = localStorage.getItem(this.CACHE_KEYS.APP_STATE);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this._appState$.next({
          ...this.getInitialAppState(),
          ...parsedState
        });
      }
    } catch (error) {
      console.error('Failed to load app state:', error);
    }
  }

  private async saveAppStateToStorage(): Promise<void> {
    try {
      if (!this.config.enableLocalStorage) return;

      const currentState = this._appState$.value;
      localStorage.setItem(this.CACHE_KEYS.APP_STATE, JSON.stringify(currentState));
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }

  private async saveFundToStorage(): Promise<void> {
    try {
      const currentState = this._appState$.value;
      const fundData = {
        current: currentState.fund.current,
        history: currentState.fund.history,
        lastUpdated: currentState.fund.lastUpdated
      };
      
      localStorage.setItem('fundData', JSON.stringify(fundData));
    } catch (error) {
      console.error('Failed to save fund data:', error);
    }
  }

  private async syncPlayersWithFirebase(): Promise<void> {
    // Implementation would sync with Firebase
    console.log('Syncing players with Firebase...');
  }

  private async syncMatchesWithFirebase(): Promise<void> {
    // Implementation would sync with Firebase
    console.log('Syncing matches with Firebase...');
  }

  private async syncFundWithFirebase(): Promise<void> {
    // Implementation would sync with Firebase
    console.log('Syncing fund with Firebase...');
  }

  private async processPendingOperations(): Promise<void> {
    console.log(`Processing ${this.pendingOperations.length} pending operations...`);
    this.pendingOperations = []; // Clear after processing
  }

  private startAutoSync(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = timer(0, this.config.syncInterval * 60 * 1000).subscribe(async () => {
      try {
        await this.syncWithFirebase();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    });

    console.log(`Auto-sync started (${this.config.syncInterval} minutes interval)`);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      this.syncTimer.unsubscribe();
      this.syncTimer = null;
      console.log('Auto-sync stopped');
    }
  }

  private setupNetworkListener(): void {
    const updateOnlineStatus = () => {
      this.updateAppState(state => ({
        ...state,
        sync: { ...state.sync, isOnline: navigator.onLine }
      }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Set initial status
  }

  private updateAppState(updater: (state: AppState) => AppState): void {
    const currentState = this._appState$.value;
    const newState = updater(currentState);
    this._appState$.next(newState);
    
    // Save to localStorage
    this.saveAppStateToStorage();
  }

  private handleDataError(error: Error, context: string): void {
    console.error(`Data error in ${context}:`, error);
    
    this.updateAppState(state => ({
      ...state,
      players: { ...state.players, loading: false, error: error.message },
      matches: { ...state.matches, loading: false, error: error.message },
      fund: { ...state.fund, loading: false, error: error.message }
    }));
  }

  private addPendingOperation(type: string, data: unknown): void {
    this.pendingOperations.push({
      type,
      data,
      timestamp: Date.now()
    });

    this.updateAppState(state => ({
      ...state,
      sync: { ...state.sync, pending: this.pendingOperations.length }
    }));
  }

  private getFromCache(key: string): unknown {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (this.config.cacheExpiry * 60 * 1000)
    });
  }

  private getInitialAppState(): AppState {
    return {
      players: {
        list: [],
        loading: false,
        error: null,
        lastUpdated: '',
        totalCount: 0
      },
      matches: {
        list: [],
        loading: false,
        error: null,
        lastUpdated: '',
        totalCount: 0
      },
      fund: {
        current: 0,
        loading: false,
        error: null,
        lastUpdated: '',
        history: []
      },
      sync: {
        isOnline: navigator.onLine,
        lastSync: '',
        pending: 0,
        syncing: false,
        error: null
      },
      ui: {
        theme: 'light',
        language: 'vi',
        notifications: true,
        compactMode: false
      }
    };
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTopScorer(players: PlayerInfo[]): string {
    if (players.length === 0) return 'N/A';
    
    const topScorer = players.reduce((top, current) => 
      (current.stats.totalMatches * current.stats.averageGoalsPerMatch || 0) > 
      (top.stats.totalMatches * top.stats.averageGoalsPerMatch || 0) ? current : top
    );
    
    return `${topScorer.firstName} ${topScorer.lastName || ''}`.trim();
  }

  private calculateAverageGoals(matches: MatchInfo[]): number {
    if (matches.length === 0) return 0;
    
    const totalGoals = matches.reduce((sum, match) => 
      sum + match.result.scoreA + match.result.scoreB, 0
    );
    
    return totalGoals / matches.length;
  }

  private calculateProfitability(matches: MatchInfo[]): number {
    if (matches.length === 0) return 0;
    
    const totalProfit = matches.reduce((sum, match) => 
      sum + match.finances.netProfit, 0
    );
    
    return totalProfit / matches.length;
  }

  private calculateMonthlyFundChange(transactions: FundTransaction[]): number {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = transactions.filter(t => 
      new Date(t.date) >= thisMonth
    );
    
    return monthlyTransactions.reduce((sum, t) => 
      sum + (t.type === 'income' ? t.amount : -t.amount), 0
    );
  }
}