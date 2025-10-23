import { Component, EventEmitter, Output, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NAV_LINKS, NavLink } from '../shared/navigation-links';
import { AdminConfig } from '../config/admin.config';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { AIWorkerService } from '../features/players/services/ai-worker.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="header-container" role="banner" aria-label="Application header">
      <!-- Logo Section -->
  <div class="logo-section" role="link" tabindex="0" aria-label="Trang chủ Thăng Long FC">
  <div class="logo-icon" aria-hidden="true">
          <i class="fas fa-futbol"></i>
        </div>
  <div class="logo-text" aria-label="Tên ứng dụng">
          <span class="logo-main">Thăng Long FC</span>
          <span class="logo-subtitle">Team Management</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="nav-links" aria-label="Điều hướng chính">
        <a *ngFor="let link of navLinks"
           class="nav-link"
           [routerLink]="link.path"
           routerLinkActive="active"
           [routerLinkActiveOptions]="link.exact ? { exact: true } : {}"
           [attr.aria-label]="link.label"
           [attr.aria-current]="isLinkActive(link.path) ? 'page' : null">
          <i *ngIf="link.icon" [class]="link.icon" aria-hidden="true"></i>
          <span class="nav-text">{{link.label}}</span>
        </a>
      </nav>

      <!-- AI Mode Badge -->
      <div class="ai-mode-badge" *ngIf="aiMode !== 'idle'" [class.worker]="aiMode==='worker'" [class.fallback]="aiMode==='fallback'" aria-label="Trạng thái phân tích AI"> 
        <i class="fas fa-robot" aria-hidden="true"></i>
        <span>{{ aiMode==='worker' ? 'AI nhanh' : 'AI dự phòng' }}</span>
        <small *ngIf="lastAIDuration" class="duration">{{ lastAIDuration }}ms</small>
      </div>

      <!-- Login Section -->
  <div class="auth-section" role="navigation" aria-label="Tài khoản người dùng">
        <!-- Modal Backdrop -->
        <div 
          *ngIf="!loggedIn && showLoginForm" 
          class="modal-backdrop" 
          tabindex="0"
          aria-label="Đóng biểu mẫu đăng nhập" 
          (click)="closeLoginForm()" 
          (keydown)="onBackdropKeydown($event)">
        </div>
        
        <!-- Login Form -->
        <div *ngIf="!loggedIn && showLoginForm" class="login-form expanded" role="dialog" aria-modal="true" aria-labelledby="loginHeading">
          <div class="form-header">
            <h4 id="loginHeading">🔥 Login</h4>
            <button class="close-btn" (click)="closeLoginForm()">×</button>
          </div>
          <form class="form-content" (submit)="login(); $event.preventDefault()">
            <div class="input-group" aria-label="Email đăng nhập">
              <input 
                type="email" 
                [(ngModel)]="email" 
                placeholder="📧 Email đăng nhập"
                autocomplete="email"
                required>
            </div>
            <div class="input-group" aria-label="Mật khẩu">
              <input 
                type="password" 
                [(ngModel)]="password" 
                placeholder="🔒 Mật khẩu"
                autocomplete="current-password"
                required>
            </div>
            <button type="submit" class="login-btn" [disabled]="isLoading || !email || !password">
              <i class="fas fa-sign-in-alt"></i>
              {{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}}
            </button>
          </form>
          
          <!-- Firebase Setup Hint -->
          <div class="firebase-hint">
            <small>💡 Sử dụng email và mật khẩu Authentication</small>
          </div>
        </div>

        <!-- Login Button -->
        <div *ngIf="!loggedIn" class="login-container" aria-label="Khu vực đăng nhập">
          <button class="login-toggle-btn" (click)="toggleLoginForm()">
            <i class="fas fa-sign-in-alt"></i>
            Đăng Nhập
          </button>
        </div>

        <!-- User Profile Section -->
  <div *ngIf="loggedIn" class="user-profile" aria-label="Thông tin người dùng">
          <div 
            class="user-info" 
            tabindex="0" 
            role="button" aria-haspopup="true" aria-expanded="{{showUserMenu}}" aria-label="Mở menu người dùng"
            (click)="toggleUserMenu()" 
            (keydown)="onUserInfoKeydown($event)">
            <div class="user-avatar">
              <div class="avatar-placeholder">
                {{getInitials()}}
              </div>
            </div>
            <div class="user-details">
              <span class="user-name">{{getDisplayName()}}</span>
              <span class="user-role">{{getRoleDisplayName()}}</span>
            </div>
            <i class="fas fa-chevron-down" [class.rotated]="showUserMenu"></i>
          </div>
          
          <!-- User Dropdown Menu -->
          <div class="user-dropdown" *ngIf="showUserMenu" role="menu" aria-label="Menu người dùng">
            <div class="dropdown-header">
              <div class="dropdown-avatar">
                <div class="dropdown-avatar-placeholder">
                  {{getInitials()}}
                </div>
              </div>
              <div class="dropdown-info">
                <div class="dropdown-name">{{getDisplayName()}}</div>
                <div class="dropdown-role">{{getRoleDisplayName()}}</div>
                <div class="dropdown-email">{{getCurrentUserEmail()}}</div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-items">
              <div class="dropdown-item" tabindex="0" role="menuitem" (click)="openProfile()" (keydown)="onDropdownItemKeydown($event, openProfile)">
                <i class="fas fa-user-edit"></i>
                Thông tin cá nhân
              </div>
              <div class="dropdown-item" tabindex="0" role="menuitem" (click)="openSettings()" (keydown)="onDropdownItemKeydown($event, openSettings)">
                <i class="fas fa-cog"></i>
                Cài đặt
              </div>
              <div class="dropdown-divider"></div>
              <div 
                class="dropdown-item logout-item" 
                tabindex="0"
                role="menuitem"
                aria-label="Đăng xuất"
                (click)="logout()"
                (keydown)="onDropdownItemKeydown($event, logout)">
                <i class="fas fa-sign-out-alt"></i>
                Đăng xuất
              </div>
            </div>
          </div>
        </div>

        <!-- Background overlay for closing dropdown -->
        <div class="dropdown-overlay" 
             *ngIf="showUserMenu" 
             tabindex="0"
             (click)="showUserMenu = false"
             (keydown)="onDropdownOverlayKeydown($event)">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0;
      position: relative;
      width: 100%;
    }

    .nav-links {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-left: 24px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-weight: 500;
      padding: 6px 10px;
      border-radius: 8px;
      transition: background .3s, color .3s;
      font-size: 14px;
    }

    .nav-link:hover {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }

    .nav-link.active {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,123,255,0.3);
    }

    .nav-link i {
      font-size: 14px;
    }

    .ai-mode-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(255,255,255,0.15);
      color: #fff;
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.25);
      transition: background .3s;
      margin-right: 12px;
    }
    .ai-mode-badge.worker { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); }
    .ai-mode-badge.fallback { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); }
    .ai-mode-badge i { font-size: 14px; }
  .ai-mode-badge .duration { font-size:10px; opacity:.85; margin-left:4px; font-weight:500; }

    /* Logo Section */
    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #00c6ff 0%, #007bff 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .logo-text {
      display: flex;
      flex-direction: column;
    }

    .logo-main {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .logo-subtitle {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 400;
    }

    /* Auth Section */
    .auth-section {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* Login Form */
    .login-form {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
      border-radius: 20px;
      padding: 0;
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
      border: none;
      width: 420px;
      max-width: 90vw;
      z-index: 1000;
      animation: modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(20px);
    }

    @keyframes modalSlideIn {
      0% {
        opacity: 0;
        transform: translate(-50%, -60%) scale(0.9);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      z-index: 999;
      animation: backdropFadeIn 0.3s ease;
    }

    @keyframes backdropFadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    .login-toggle-btn {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #007bff;
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      font-size: 14px;
    }

    .login-toggle-btn:hover {
      background: white;
      border-color: #007bff;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 123, 255, 0.25);
    }

    .form-header {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
      padding: 24px 32px 20px;
      border-radius: 20px 20px 0 0;
      position: relative;
      overflow: hidden;
    }

    .form-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: shimmer 3s ease-in-out infinite alternate;
    }

    @keyframes shimmer {
      0% { transform: rotate(0deg) scale(1); }
      100% { transform: rotate(5deg) scale(1.05); }
    }

    .form-header h4 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 1;
    }

    .close-btn {
      position: absolute;
      top: 20px;
      right: 24px;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 18px;
      font-weight: 300;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      backdrop-filter: blur(10px);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: rotate(90deg) scale(1.1);
    }

    .form-content {
      padding: 32px;
      background: white;
      border-radius: 0 0 20px 20px;
    }

    .input-group {
      position: relative;
      margin-bottom: 20px;
    }

    .input-group input {
      width: 100%;
      padding: 16px 20px;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      font-size: 16px;
      background: #f8f9fa;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      font-weight: 500;
      color: #495057;
      box-sizing: border-box;
    }

    .input-group input:focus {
      border-color: #007bff;
      background: white;
      box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1);
      transform: translateY(-2px);
    }

    .input-group input::placeholder {
      color: #6c757d;
      font-weight: 400;
    }

    .login-btn {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      width: 100%;
      margin-top: 8px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0, 123, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      letter-spacing: 0.5px;
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 12px 30px rgba(0, 123, 255, 0.4);
    }

    .login-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
      opacity: 0.6;
      transform: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .firebase-hint {
      padding: 16px 32px 24px;
      background: white;
      border-radius: 0 0 20px 20px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }

    .firebase-hint small {
      color: #6c757d;
      font-size: 0.85rem;
    }

    /* User Profile */
    .user-profile {
      position: relative;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      padding: 8px 12px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .user-info:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
      border: 2px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      backdrop-filter: blur(5px);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      color: white;
    }

    .user-name {
      font-weight: 600;
      font-size: 14px;
    }

    .user-role {
      font-size: 12px;
      opacity: 0.8;
    }

    .fa-chevron-down {
      color: white;
      font-size: 12px;
      transition: transform 0.3s ease;
    }

    .fa-chevron-down.rotated {
      transform: rotate(180deg);
    }

    /* User Dropdown */
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
      border: 1px solid #e9ecef;
      min-width: 250px;
      z-index: 1000;
      animation: dropdownSlide 0.3s ease;
      overflow: hidden;
    }

    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999;
      background: transparent;
    }

    .dropdown-header {
      padding: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dropdown-avatar {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dropdown-avatar-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, #007bff 0%, #00c6ff 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 18px;
    }

    .dropdown-info {
      flex: 1;
    }

    .dropdown-name {
      font-weight: 600;
      color: #212529;
      font-size: 14px;
    }

    .dropdown-role {
      color: #6c757d;
      font-size: 12px;
    }

    .dropdown-email {
      color: #007bff;
      font-size: 11px;
      font-weight: 500;
    }

    .dropdown-divider {
      height: 1px;
      background: #e9ecef;
      margin: 0;
    }

    .dropdown-items {
      padding: 8px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      color: #495057;
      font-size: 14px;
    }

    .dropdown-item:hover {
      background-color: #f8f9fa;
    }

    .dropdown-item i {
      width: 16px;
      color: #6c757d;
    }

    .logout-item {
      color: #dc3545;
    }

    .logout-item:hover {
      background-color: #f8f9fa;
      color: #c82333;
    }

    .logout-item i {
      color: #dc3545;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .header-container {
        padding: 0 8px;
      }

      .logo-section {
        gap: 8px;
      }

      .logo-icon {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }

      .logo-main {
        font-size: 1.2rem;
      }

      .logo-subtitle {
        display: none;
      }

      .login-form {
        width: 90vw;
        padding: 16px;
      }

      .user-details {
        display: none;
      }

      .user-dropdown {
        right: -8px;
        min-width: 200px;
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  @Output() loginChange = new EventEmitter<{loggedIn: boolean; role: string}>();
  
  // Firebase Authentication properties
  email = '';
  password = '';
  loggedIn = false;
  role = '';
  showLoginForm = false;
  showUserMenu = false;
  isLoading = false;
  
  // Current user info from Firebase
  currentUserEmail = '';
  currentUserDisplayName = '';
  
  private readonly firebaseAuthService = inject(FirebaseAuthService);
  private readonly aiWorkerService = inject(AIWorkerService);
  private readonly toast = inject(ToastService);
  navLinks: NavLink[] = NAV_LINKS;
  aiMode: 'idle'|'worker'|'fallback' = 'idle';
  lastAIDuration?: number;
  private aiBadgeTimer?: ReturnType<typeof setTimeout>;

  isLinkActive(path:string): boolean {
    // Simple check using location; for robust solution inject Router and check
    return typeof window !== 'undefined' && window.location.pathname === path;
  }

  ngOnInit() {
    // Subscribe to Firebase auth state changes
    this.firebaseAuthService.currentUser$.subscribe(firebaseUser => {
      if (firebaseUser) {
        // User is logged in via Firebase
        this.loggedIn = true;
        this.currentUserEmail = firebaseUser.email;
        this.currentUserDisplayName = firebaseUser.displayName;
        this.role = firebaseUser.isSuperAdmin ? 'superadmin' : 'admin';
        
        // Emit login state
        this.loginChange.emit({ loggedIn: true, role: this.role });
        
        console.log('🔥 Firebase user logged in:', {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: this.role
        });
        this.toast.success(`Đăng nhập: ${firebaseUser.displayName || firebaseUser.email}`);
      } else {
        // No user logged in
        this.loggedIn = false;
        this.currentUserEmail = '';
        this.currentUserDisplayName = '';
        this.role = '';
        
        // Emit logout state
        this.loginChange.emit({ loggedIn: false, role: '' });
        
        console.log('🔥 No Firebase user logged in');
        this.toast.info('Chưa đăng nhập');
      }
    });

    // Subscribe to AI mode changes
  this.aiWorkerService.mode$.subscribe(mode => {
    this.aiMode = mode;
    if (this.aiBadgeTimer) clearTimeout(this.aiBadgeTimer);
    if (mode !== 'idle') {
      this.aiBadgeTimer = setTimeout(() => {
        // reset to idle after inactivity
        this.aiMode = 'idle';
      }, 10000);
    }
  });
  this.aiWorkerService.lastDuration$.subscribe(d => { this.lastAIDuration = d; });
  }

  async login() {
    if (!this.email || !this.password) {
      this.toast.error('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    // Validate email format
    if (!this.isValidEmail(this.email)) {
      this.toast.error('Vui lòng nhập email hợp lệ');
      return;
    }

    // Check if email is in admin configuration
    if (!AdminConfig.isAdminEmail(this.email)) {
      this.toast.error('Email này không có quyền admin. Liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    this.isLoading = true;

    try {
      
      const firebaseUser = await this.firebaseAuthService.signInWithEmail(this.email, this.password);
      
      if (firebaseUser) {
        // Login successful - Firebase auth service will handle state updates
        this.showLoginForm = false;
        this.password = ''; // Clear password for security
  this.toast.success(`🔥 Chào mừng ${firebaseUser.displayName || firebaseUser.email}`);
        
        console.log('🔥 login successful:', firebaseUser);
      }
      
    } catch (error: unknown) {
      console.error('❌ login failed:', error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      if (errorMsg.includes('user-not-found')) {
        errorMessage = `Không tìm thấy tài khoản Firebase cho email ${this.email}. Vui lòng tạo tài khoản trước.`;
      } else if (errorMsg.includes('wrong-password')) {
        errorMessage = 'Mật khẩu không chính xác.';
      } else if (errorMsg.includes('invalid-email')) {
        errorMessage = 'Email không hợp lệ.';
      } else if (errorMsg.includes('Unauthorized')) {
        errorMessage = 'Email này không có quyền admin.';
      }
      
  this.toast.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    try {
      await this.firebaseAuthService.signOut();
      this.showUserMenu = false;
  this.toast.info('Đã đăng xuất');
      console.log('🔥 Firebase logout successful');
    } catch (error) {
      console.error('❌ Firebase logout failed:', error);
  this.toast.error('Lỗi đăng xuất. Vui lòng thử lại.');
    }
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleLoginForm() {
    this.showLoginForm = !this.showLoginForm;
  }

  closeLoginForm() {
    this.showLoginForm = false;
    this.email = '';
    this.password = '';
  }

  getDisplayName(): string {
    if (this.currentUserDisplayName) {
      return this.currentUserDisplayName;
    }
    
    // Try to get display name from admin config
    const adminUser = AdminConfig.getAdminByEmail(this.currentUserEmail);
    return adminUser ? adminUser.displayName : this.currentUserEmail.split('@')[0];
  }

  getRoleDisplayName(): string {
    switch (this.role) {
      case 'superadmin': return 'Quản trị viên';
      case 'admin': return 'Quản lý';
      default: return 'Thành viên';
    }
  }

  getCurrentUserEmail(): string {
    return this.currentUserEmail;
  }

  getInitials(): string {
    const displayName = this.getDisplayName();
    return displayName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('');
  }

  openProfile() {
  this.showUserMenu = false;
  this.toast.info('Tính năng đang phát triển');
  }

  // Accessibility: handle keydown for dropdown items
  onDropdownItemKeydown(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  // Accessibility: handle keydown on user info for dropdown
  onUserInfoKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleUserMenu();
    }
  }

  // Accessibility: handle keydown on modal backdrop
  onBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      this.closeLoginForm();
    }
  }

  // Accessibility: handle keydown on dropdown overlay
  onDropdownOverlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      this.showUserMenu = false;
      event.preventDefault();
    }
  }

  // Helper methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Removed legacy DOM notification implementation in favor of ToastService
}