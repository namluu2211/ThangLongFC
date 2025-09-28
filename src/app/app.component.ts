import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from './core/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryComponent } from './features/history/history.component';
import { PlayersComponent } from './features/players/players.component';
import { FundComponent } from './features/fund/fund.component';
import { StatsComponent } from './features/stats/stats.component';
import { FirebaseService } from './services/firebase.service';
import { AdminPanelComponent } from './components/admin-panel.component';
import { AdminSetupComponent } from './components/admin-setup.component';
import { FooterComponent } from './shared/footer.component';
@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    HistoryComponent,
    PlayersComponent,
    FundComponent,
    StatsComponent,
    AdminPanelComponent,
    AdminSetupComponent,
    FooterComponent
  ],
  template: `
  <div class="app-header">
      <app-header (loginChange)="onLoginChange($event)"></app-header>
    </div>
    <div class="container">
      <!-- Admin Panel - Only visible to admins -->
      <app-admin-panel 
        *ngIf="canEdit" 
        [canEdit]="canEdit" 
        [currentUser]="getCurrentUsername()">
      </app-admin-panel>
      
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
        <button 
          *ngIf="role === 'superadmin'"
          class="nav-btn setup-btn" 
          [class.active]="show === 'setup'"
          (click)="show='setup'">
          <i class="fas fa-cog"></i>
          <span>Cài đặt Firebase</span>
        </button>
      </div>
      <!-- Professional Content Area -->
      <div class="content-area fade-in">
        <app-players *ngIf="show==='auto'" [canEdit]="canEdit" mode="auto"></app-players>
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
        <app-admin-setup *ngIf="show==='setup' && role === 'superadmin'"></app-admin-setup>
      </div>
      <div *ngIf="!loggedIn" class="small">Bạn đang xem ở chế độ khách. Đăng nhập để chỉnh sửa hoặc lưu dữ liệu.</div>
    </div>
    
    <!-- Footer -->
    <app-footer></app-footer>
  `
})
export class AppComponent implements OnInit {
  loggedIn = false;
  role = '';
  show = 'auto'; // default to 'Chia đội tự động' for better UX
  canEdit = false;

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    console.log('🚀 App component ngOnInit started');
    console.log('🔥 Firebase service available:', !!this.firebaseService);
    
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

  private initializeFirebaseListeners() {
    // Use setTimeout to not block the main thread
    setTimeout(() => {
      try {
        console.log('🔥 Initializing Firebase listeners...');
        
        // Subscribe to real-time data updates with error handling
        this.firebaseService.matchResults$.subscribe({
          next: (matchResults) => {
            console.log('Real-time match results update:', matchResults?.length || 0, 'items');
          },
          error: (error) => {
            console.warn('Firebase match results not available:', error.message);
          }
        });

        this.firebaseService.playerStats$.subscribe({
          next: (playerStats) => {
            console.log('Real-time player stats update:', Object.keys(playerStats || {}).length, 'players');
          },
          error: (error) => {
            console.warn('Firebase player stats not available:', error.message);
          }
        });

        this.firebaseService.history$.subscribe({
          next: (history) => {
            console.log('Real-time history update:', history?.length || 0, 'matches');
          },
          error: (error) => {
            console.warn('Firebase history not available:', error.message);
          }
        });
      } catch (error) {
        console.warn('⚠️ Firebase listeners not available:', error.message);
        // App continues to work with localStorage only
      }
    }, 1000); // Delay Firebase initialization to not block UI
  }

  onLoginChange(event: { loggedIn: boolean; role: string }) {
    console.log('Login change received:', event);
    this.loggedIn = event.loggedIn;
    this.role = event.role;
    this.canEdit = (this.role === 'admin' || this.role === 'superadmin');
  }

  get currentFund(): number {
    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    const totalThu = history.reduce((sum: number, m: any) => sum + Number(m.thu || 0), 0);
    const totalChi = history.reduce((sum: number, m: any) => sum + (Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0)), 0);
    return 2730 + totalThu - totalChi;
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
}
