import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { HeaderComponent } from './core/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryComponent } from './features/history/history.component';
import { PlayersSimpleComponent } from './features/players/players-simple.component';
import { FundComponent } from './features/fund/fund.component';
import { StatsComponent } from './features/stats/stats.component';
import { FirebaseService } from './services/firebase.service';
import { PerformanceService } from './services/performance.service';
import { LazyLoadingService } from './services/lazy-loading.service';
import { AssetOptimizationService } from './services/asset-optimization.service';
import { FooterComponent } from './shared/footer.component';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { MatchData } from './models/types';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    HistoryComponent,
    PlayersSimpleComponent,
    FundComponent,
    StatsComponent,
    FooterComponent
  ],
  template: `
  <div class="app-header">
      <app-header (loginChange)="onLoginChange($event)"></app-header>
    </div>
    <div class="container">
      <div class="hline"></div>
      <div class="navigation-buttons">
        <button 
          class="nav-btn" 
          [class.active]="show === 'auto'"
          (click)="show='auto'">
          <i class="fas fa-users"></i>
          <span>Chia đội</span>
        </button>
        <button 
          class="nav-btn" 
          [class.active]="show === 'history'"
          (click)="show='history'">
          <i class="fas fa-history"></i>
          <span>Xem Lịch Sử</span>
        </button>
        <button 
          class="nav-btn" 
          [class.active]="show === 'fund'"
          (click)="show='fund'">
          <i class="fas fa-wallet"></i>
          <span>Quỹ hiện tại</span>
        </button>
        <button 
          class="nav-btn" 
          [class.active]="show === 'stats'"
          (click)="show='stats'">
          <i class="fas fa-chart-bar"></i>
          <span>Thống kê</span>
        </button>
      </div>
      <!-- Professional Content Area -->
      <div class="content-area fade-in">
        <div *ngIf="show==='auto'" style="padding: 20px;">
          <h2>⚽ Danh Sách Cầu Thủ</h2>
          <p>Đang tạm thời hiển thị chế độ gỡ lỗi...</p>
          <app-players-simple></app-players-simple>
        </div>
        <app-history *ngIf="show==='history'" [canEdit]="canEdit"></app-history>
        <app-players *ngIf="show==='list'" [canEdit]="canEdit" mode="list"></app-players>
        
        <!-- Professional Fund Display -->
        <div *ngIf="show==='fund'" class="fund-header-card glass interactive slide-up">
          <div class="fund-info">
            <div class="fund-icon">
              <i class="fas fa-coins"></i>
            </div>
            <div class="fund-details">
              <h2 class="fund-title">Quỹ Hiện Tại</h2>
              <div class="fund-amount">{{currentFund | number}} VNĐ</div>
              <div class="fund-status">
                <span class="status-indicator" [class.positive]="currentFund > 0" [class.negative]="currentFund <= 0"></span>
                <span class="status-text">{{getFundStatus()}}</span>
              </div>
            </div>
          </div>
        </div>
        
        <app-fund *ngIf="show==='fund'" [canEdit]="canEdit"></app-fund>
        <app-stats *ngIf="show==='stats'"></app-stats>
      </div>
      <div *ngIf="!loggedIn" class="small">Bạn đang xem ở chế độ khách. Đăng nhập để chỉnh sửa hoặc lưu dữ liệu.</div>
    </div>
    
    <!-- Footer -->
    <app-footer></app-footer>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fundCache: { value: number; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  
  loggedIn = false;
  role = '';
  show = 'auto'; // default to 'Chia đội tự động' for better UX
  canEdit = false;

  private readonly firebaseService = inject(FirebaseService);
  private readonly performanceService = inject(PerformanceService);
  private readonly lazyLoadingService = inject(LazyLoadingService);
  private readonly assetOptimizationService = inject(AssetOptimizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    // App component initialization
    
    // Initialize performance monitoring
    this.initializePerformanceServices();
    
    // Remove loading screen immediately when app component initializes
    setTimeout(() => {
      const loadingElement = document.querySelector('.app-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
      document.body.classList.add('app-loaded');
    }, 100);
    
    try {
      // Initialize app state - the header component will emit the initial login state
      console.log('App component initialized with Firebase service');
      
      // Initialize Firebase real-time listeners with error handling
      this.initializeFirebaseListeners();
      console.log('✅ Firebase listeners initialized successfully');
    } catch (error) {
      console.error('❌ Error in ngOnInit:', error);
      // Still remove loading screen even if there's an error
      const loadingElement = document.querySelector('.app-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
    }
  }

  private initializePerformanceServices() {
    console.log('🚀 Initializing performance services...');
    
    try {
      // Performance monitoring is automatically started in constructor
      console.log('✅ Performance monitoring active');
      
      // Preload critical assets for player avatars
      this.assetOptimizationService.preloadCriticalAssets();
      console.log('✅ Asset optimization started');
      
      // Preload critical components after service initialization
      setTimeout(() => {
        this.lazyLoadingService.preloadComponent('players-simple');
        this.lazyLoadingService.preloadComponent('fund');
        console.log('✅ Component preloading started');
      }, 100);
      
      // Monitor performance metrics with heavy throttling to reduce overhead
      this.performanceService.metrics$
        .pipe(
          debounceTime(10000), // Increased throttle to 10 seconds to reduce monitoring frequency
          takeUntil(this.destroy$)
        )
        .subscribe(metrics => {
          if (metrics && (metrics.memoryUsage > 50 || metrics.renderingTime > 5000)) {
            console.warn('⚠️ Performance issues detected:', {
              memoryUsage: metrics.memoryUsage,
              renderingTime: metrics.renderingTime,
              componentCount: metrics.componentLoadTimes.size
            });
            // Automatically trigger memory optimization when issues detected
            this.performanceService.optimizeMemoryUsage();
          }
        });
        
    } catch (error) {
      console.warn('⚠️ Performance services initialization failed:', error.message);
    }
  }

  private initializeFirebaseListeners() {
    // Use requestIdleCallback for better performance
    const initListeners = () => {
      try {
        // Initialize Firebase listeners
        
        // Combine Firebase subscriptions with takeUntil for proper cleanup
        this.firebaseService.matchResults$
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.invalidateFundCache();
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.warn('Firebase match results not available:', error.message);
            }
          });

        this.firebaseService.playerStats$
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (playerStats) => {
              console.log('Real-time player stats update:', Object.keys(playerStats || {}).length, 'players');
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.warn('Firebase player stats not available:', error.message);
            }
          });

        this.firebaseService.history$
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (history) => {
              console.log('Real-time history update:', history?.length || 0, 'matches');
              this.invalidateFundCache();
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.warn('Firebase history not available:', error.message);
            }
          });
      } catch (error) {
        console.warn('⚠️ Firebase listeners not available:', error.message);
      }
    };

    // Use requestIdleCallback for better performance, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initListeners);
    } else {
      setTimeout(initListeners, 1000);
    }
  }

  onLoginChange(event: { loggedIn: boolean; role: string }) {
    
    // Only update if values actually changed
    if (this.loggedIn !== event.loggedIn || this.role !== event.role) {
      this.loggedIn = event.loggedIn;
      this.role = event.role;
      this.canEdit = (this.role === 'admin' || this.role === 'superadmin');
      
      // Store role in localStorage for history component
      if (this.role) {
        localStorage.setItem('role', this.role);
      } else {
        localStorage.removeItem('role');
      }
      
      // Trigger change detection
      this.cdr.markForCheck();
    }
  }

  get currentFund(): number {
    // Use cache if available and not expired
    if (this.fundCache && (Date.now() - this.fundCache.timestamp) < this.CACHE_DURATION) {
      return this.fundCache.value;
    }
    
    // Calculate fund value
    const fund = this.calculateCurrentFund();
    
    // Update cache
    this.fundCache = {
      value: fund,
      timestamp: Date.now()
    };
    
    return fund;
  }
  
  private calculateCurrentFund(): number {
    try {
      const historyData = localStorage.getItem('matchHistory');
      if (!historyData) return 2795000;
      
      const history = JSON.parse(historyData) as MatchData[];
      const totalThu = history.reduce((sum, m) => sum + Number(m.thu || 0), 0);
      const totalChi = history.reduce((sum, m) => {
        return sum + (Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0));
      }, 0);
      
      return 2795000 + totalThu - totalChi;
    } catch (error) {
      console.error('Error calculating fund:', error);
      return 2795000;
    }
  }
  
  private invalidateFundCache(): void {
    this.fundCache = null;
  }

  getCurrentUsername(): string {
    const savedUser = localStorage.getItem('thang_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        return userData.username || '';
      } catch {
        return '';
      }
    }
    return '';
  }

  getFundStatus(): string {
    const fund = this.currentFund;
    if (fund > 5000) {
      return 'Tình hình tài chính tốt';
    } else if (fund > 2000) {
      return 'Tình hình tài chính ổn định';
    } else if (fund > 0) {
      return 'Cần tiết kiệm chi tiêu';
    } else {
      return 'Cần bổ sung quỹ';
    }
  }
  
  ngOnDestroy(): void {
    // Log final performance report
    this.performanceService.logPerformanceReport();
    this.assetOptimizationService.logAssetReport();
    
    // Final memory cleanup
    this.performanceService.optimizeMemoryUsage();
    
    // Clean up performance services
    this.performanceService.destroy();
    this.assetOptimizationService.destroy();
    
    // Complete all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clear cache
    this.fundCache = null;
    
    console.log('🧹 App component cleanup completed');
  }
}
