import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderComponent } from './core/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, HistoryEntry } from './services/firebase.service';
import { PerformanceService } from './services/performance.service';
import { LazyLoadingService } from './services/lazy-loading.service';
import { AssetOptimizationService } from './services/asset-optimization.service';
import { DataStoreService } from './core/services/data-store.service';
import { FooterComponent } from './shared/footer.component';
import { Subject } from 'rxjs';
import { environment } from '../environments/environment';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { PermissionService } from './core/services/permission.service';


@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  template: `
  <div class="app-header">
      <app-header (loginChange)="onLoginChange($event)"></app-header>
    </div>
    <div class="container">
      <div class="hline"></div>
      <nav class="navigation-buttons" aria-label="Main navigation">
        <a routerLink="/players" routerLinkActive="active" class="nav-btn">
          <i class="fas fa-users"></i><span>Đội hình</span>
        </a>
        <a routerLink="/players-list" routerLinkActive="active" class="nav-btn">
          <i class="fas fa-list"></i><span>Danh sách</span>
        </a>
        <a routerLink="/history" routerLinkActive="active" class="nav-btn">
          <i class="fas fa-history"></i><span>Lịch sử</span>
        </a>
        <a routerLink="/fund" routerLinkActive="active" class="nav-btn">
          <i class="fas fa-wallet"></i><span>Tài chính</span>
        </a>
        <a routerLink="/stats" routerLinkActive="active" class="nav-btn">
          <i class="fas fa-chart-bar"></i><span>Thống kê</span>
        </a>
      </nav>
      <!-- Professional Content Area -->
      <div class="content-area fade-in">
        <router-outlet></router-outlet>
      </div>
      <div *ngIf="!loggedIn" class="small">Bạn đang xem ở chế độ khách. Đăng nhập để chỉnh sửa hoặc lưu dữ liệu.</div>
    </div>
    
    <!-- Footer -->
    <app-footer></app-footer>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loggedIn = false;
  role = '';
  // show removed; router handles active view
  canEdit = false;
  currentFund = 0;
  isLoading = false;

  private readonly dataStore = inject(DataStoreService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  // Optional services - try to inject with optional flag
  private readonly firebaseService = inject(FirebaseService, { optional: true });
  private readonly performanceService = inject(PerformanceService, { optional: true });
  private readonly lazyLoadingService = inject(LazyLoadingService, { optional: true });
  private readonly assetOptimizationService = inject(AssetOptimizationService, { optional: true });
  private readonly permissionService = inject(PermissionService);

  ngOnInit() {
    // App component initialization
    
    // Initialize optional services
    this.initializeOptionalServices();
    
    // Initialize DataStore and subscribe to fund changes
    this.initializeDataStore();
    
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
      console.log('App component initialized with core services');
      
      // Initialize Firebase real-time listeners with error handling
      setTimeout(() => {
        try {
          this.initializeFirebaseListeners();
          console.log('✅ Firebase listeners initialized successfully');
        } catch (firebaseError) {
          console.warn('⚠️ Firebase listeners initialization failed:', firebaseError);
          // Continue with app initialization even if Firebase fails
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error in ngOnInit:', error);
      // Still remove loading screen even if there's an error
      const loadingElement = document.querySelector('.app-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
    }
  }

  private initializeOptionalServices() {
    try {
      const f = environment.features;
      // Performance & related services gated by environment flags
      if (f.performanceMonitoring && this.performanceService) {
        this.initializePerformanceServices();
      } else {
        console.log('🚫 Performance monitoring disabled by feature flag');
      }

      // Asset optimization can run independently if enabled
      if (f.assetOptimization && this.assetOptimizationService) {
        try {
          this.assetOptimizationService.preloadCriticalAssets();
          console.log('✅ Asset optimization started (flag enabled)');
        } catch (e) {
          console.warn('⚠️ Asset optimization failed to start:', e);
        }
      } else {
        console.log('🚫 Asset optimization disabled by feature flag');
      }

      // Component preloading (lazy hints)
      if (f.componentPreload && this.lazyLoadingService) {
        setTimeout(() => {
          this.lazyLoadingService?.preloadComponent('match-info');
          console.log('✅ Component preloading started (flag enabled)');
        }, 100);
      } else {
        console.log('🚫 Component preload disabled by feature flag');
      }

      console.log('✅ Optional services initialization pass completed');
    } catch (error) {
      console.warn('⚠️ Some optional services not available:', error);
    }
  }

  private initializeDataStore() {
    console.log('🚀 Initializing DataStore integration...');
    
    try {
      // Subscribe to fund changes
      this.dataStore.fund$
        .pipe(takeUntil(this.destroy$))
        .subscribe(fund => {
          this.currentFund = fund;
          this.cdr.markForCheck();
        });

      // Subscribe to loading state
      this.dataStore.isLoading$
        .pipe(takeUntil(this.destroy$))
        .subscribe(loading => {
          this.isLoading = loading;
          this.cdr.markForCheck();
        });

      // Subscribe to sync status for connection monitoring
      this.dataStore.syncStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe(status => {
          if (!status.isConnected) {
            console.warn('⚠️ Offline mode - data will sync when connection is restored');
          }
        });

      // Initialize data refresh
      this.dataStore.refreshAllData().catch(error => {
        console.warn('Initial data refresh failed:', error);
      });

      console.log('✅ DataStore integration completed');
    } catch (error) {
      console.error('❌ DataStore initialization failed:', error);
    }
  }

  private initializePerformanceServices() {
    console.log('🚀 Initializing performance services...');
    
    try {
      // Performance monitoring is automatically started in constructor when service exists
      if (this.performanceService) {
        console.log('✅ Performance monitoring active');
        
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
              this.performanceService?.optimizeMemoryUsage();
            }
          });
      }
      
      // Asset & component preload moved to initializeOptionalServices with flags
        
    } catch (error) {
      console.warn('⚠️ Performance services initialization failed:', error);
    }
  }

  private initializeFirebaseListeners() {
    // Use requestIdleCallback for better performance
    const initListeners = () => {
      try {
        // Initialize Firebase listeners
        
        // Combine Firebase subscriptions with takeUntil for proper cleanup
        // Firebase integration with DataStore (only if service available)
        if (this.firebaseService) {
          this.firebaseService.matchResults$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                // Trigger data refresh in DataStore when Firebase updates
                this.dataStore.refreshAllData().catch(error => {
                  console.warn('Data refresh after Firebase update failed:', error);
                });
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
              next: (history: HistoryEntry[]) => {
                const count = Array.isArray(history) ? history.length : 0;
                console.log('Real-time history update:', count, 'matches');
                // Trigger data refresh when history updates
                this.dataStore.refreshAllData().catch(error => {
                  console.warn('Data refresh after history update failed:', error);
                });
              },
              error: (error) => {
                console.warn('Firebase history not available:', error.message);
              }
            });
        }
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
  this.permissionService.setAuthState({ loggedIn: this.loggedIn, role: this.role });
      
      // Store role in localStorage for history component
      // (Role persistence moved into PermissionService)
      
      // Trigger change detection
      this.cdr.markForCheck();
    }
  }

  // Fund status calculation based on current fund value
  getFundStatus(): string {
    const fund = this.currentFund;
    if (fund > 5000000) {
      return 'Tình hình tài chính tốt';
    } else if (fund > 2000000) {
      return 'Tình hình tài chính ổn định';
    } else if (fund > 0) {
      return 'Cần tiết kiệm chi tiêu';
    } else {
      return 'Cần bổ sung quỹ';
    }
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


  
  ngOnDestroy(): void {
    // Log final performance report (if services available)
    if (this.performanceService) {
      this.performanceService.logPerformanceReport();
      this.performanceService.optimizeMemoryUsage();
      this.performanceService.destroy();
    }
    
    if (this.assetOptimizationService) {
      this.assetOptimizationService.logAssetReport();
      this.assetOptimizationService.destroy();
    }
    
    // Complete all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    console.log('🧹 App component cleanup completed');
  }
}
