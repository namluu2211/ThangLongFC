import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="header-container">
      <!-- Logo Section -->
      <div class="logo-section">
        <div class="logo-icon">
          <i class="fas fa-futbol"></i>
        </div>
        <div class="logo-text">
          <span class="logo-main">Thăng Long FC</span>
          <span class="logo-subtitle">Team Management</span>
        </div>
      </div>

      <!-- Login Section -->
      <div class="auth-section">
        <!-- Modal Backdrop -->
        <div *ngIf="!loggedIn && showLoginForm" class="modal-backdrop" (click)="closeLoginForm()"></div>
        
        <!-- Modern Login Form -->
        <div *ngIf="!loggedIn && showLoginForm" class="login-form expanded">
          <div class="form-header">
            <h4>🚀 ThangLong FC</h4>
            <button class="close-btn" (click)="closeLoginForm()">×</button>
          </div>
          <form class="form-content">
            <div class="input-group">
              <input 
                type="text" 
                [(ngModel)]="username" 
                placeholder="👤 Tên đăng nhập"
                autocomplete="username">
            </div>
            <div class="input-group">
              <input 
                type="password" 
                [(ngModel)]="password" 
                placeholder="🔒 Mật khẩu"
                autocomplete="current-password">
            </div>
            <button type="button" class="login-btn" (click)="login()">
              <i class="fas fa-sign-in-alt"></i>
              Đăng nhập
            </button>
          </form>
        </div>

        <!-- Login Button -->
        <div *ngIf="!loggedIn" class="login-container">
          <button class="login-toggle-btn" (click)="toggleLoginForm()">
            <i class="fas fa-sign-in-alt"></i>
            Đăng Nhập
          </button>
        </div>



        <!-- User Profile Section -->
        <div *ngIf="loggedIn" class="user-profile">
          <div class="user-info" (click)="toggleUserMenu()">
            <div class="user-avatar">
              <img 
                *ngIf="getUserAvatarUrl(); else defaultAvatar"
                [src]="getUserAvatarUrl()" 
                [alt]="getDisplayName()"
                class="avatar-image"
                (error)="onAvatarError($event)">
              <ng-template #defaultAvatar>
                <div class="avatar-placeholder">
                  {{getInitials()}}
                </div>
              </ng-template>
            </div>
            <div class="user-details">
              <span class="user-name">{{getDisplayName()}}</span>
              <span class="user-role">{{getRoleDisplayName()}}</span>
            </div>
            <i class="fas fa-chevron-down" [class.rotated]="showUserMenu"></i>
          </div>
          
          <!-- User Dropdown Menu -->
          <div class="user-dropdown" *ngIf="showUserMenu">
            <div class="dropdown-header">
              <div class="dropdown-avatar">
                <img 
                  *ngIf="getUserAvatarUrl(); else dropdownDefaultAvatar"
                  [src]="getUserAvatarUrl()" 
                  [alt]="getDisplayName()"
                  class="dropdown-avatar-image"
                  (error)="onAvatarError($event)">
                <ng-template #dropdownDefaultAvatar>
                  <div class="dropdown-avatar-placeholder">
                    {{getInitials()}}
                  </div>
                </ng-template>
              </div>
              <div class="dropdown-info">
                <div class="dropdown-name">{{getDisplayName()}}</div>
                <div class="dropdown-role">{{getRoleDisplayName()}}</div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-items">
              <div class="dropdown-item" (click)="openProfile()">
                <i class="fas fa-user-edit"></i>
                Thông tin cá nhân
              </div>
              <div class="dropdown-item" (click)="openSettings()">
                <i class="fas fa-cog"></i>
                Cài đặt
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item logout-item" (click)="logout()">
                <i class="fas fa-sign-out-alt"></i>
                Đăng xuất
              </div>
            </div>
          </div>
        </div>

        <!-- Background overlay for closing dropdown -->
        <div class="dropdown-overlay" 
             *ngIf="showUserMenu" 
             (click)="showUserMenu = false">
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

    /* Login Container */
    .login-container {
      position: relative;
    }

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

    .login-form.expanded {
      padding: 0;
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

    .login-inputs {
      display: flex;
      flex-direction: column;
      gap: 12px;
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

    .input-group input:focus::placeholder {
      color: #adb5bd;
    }

    .input-group i {
      color: #6c757d;
      font-size: 14px;
    }

    .login-input {
      border: none;
      outline: none;
      padding: 12px 0;
      font-size: 14px;
      flex: 1;
      background: transparent;
    }

    .login-actions {
      display: flex;
      gap: 8px;
      align-items: center;
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

    .login-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .login-btn:hover::before {
      left: 100%;
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 12px 30px rgba(0, 123, 255, 0.4);
      box-shadow: 0 6px 20px rgba(0, 123, 255, 0.3);
    }

    .login-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .cancel-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      font-size: 16px;
    }

    .cancel-btn:hover {
      background: #c82333;
      transform: translateY(-2px);
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

    .avatar-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.3);
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
      min-width: 220px;
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

    .dropdown-avatar-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #007bff;
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

    /* Clean Login Form */
    .clean-login-form {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      min-width: 320px;
      max-width: 400px;
      overflow: hidden;
      animation: loginFormSlide 0.3s ease;
    }

    @keyframes loginFormSlide {
      from {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    .login-header {
      background: linear-gradient(135deg, #007bff 0%, #00c6ff 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .login-header h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 8px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    .login-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #495057;
      font-size: 14px;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .login-submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #007bff 0%, #00c6ff 100%);
      color: white;
      border: none;
      padding: 14px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
    }

    .login-submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
    }

    /* Debug Button */
    .debug-btn {
      background: #ffc107;
      color: #212529;
      border: none;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }

    .debug-btn:hover {
      background: #e0a800;
      transform: translateY(-1px);
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

      .login-form.expanded {
        min-width: 240px;
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

    @media (max-width: 480px) {
      .logo-text .logo-main {
        font-size: 1rem;
      }

      .login-form.expanded {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1001;
        min-width: 280px;
        max-width: 90vw;
      }

      .user-dropdown {
        position: fixed;
        top: 60px;
        right: 8px;
        left: 8px;
        min-width: auto;
      }
    }

    /* Clean Login Modal */
    .clean-login-form {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      width: 400px;
      max-width: 90vw;
      animation: fadeIn 0.3s ease;
    }

    .modal-hidden {
      display: none !important;
    }

    .modal-visible {
      display: block !important;
    }

    .login-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .login-header h3 {
      margin: 0;
      color: #333;
      font-weight: 600;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #333;
    }

    .login-body {
      padding: 24px;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  @Output() loginChange = new EventEmitter<any>();
  username = '';
  password = '';
  loggedIn = false;
  role = '';
  showLoginForm = false;
  showUserMenu = false;

  // hardcoded hashed passwords (sha256)
  users = [
    { username: 'NamLuu', hash: '351974bb956e55ba2ee5df0be3f502abbec6cc8fdba1d1fb92932ce8a7016c49', role: 'superadmin', displayName: 'Nam Lưu' },
    { username: 'SyNguyen', hash: 'b9fab45c74254cdbd9e234a1fb5a8db2cf2d5a22ccf9d37bf3659a4b8f402fc3', role: 'admin', displayName: 'Sy Nguyễn' }
  ];

  ngOnInit() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('thang_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        this.username = userData.username;
        this.role = userData.role;
        this.loggedIn = true;
        setTimeout(() => {
          this.loginChange.emit({ loggedIn: true, role: this.role });
        }, 0);
      } catch (e) {
        localStorage.removeItem('thang_user');
        localStorage.removeItem('role');
        setTimeout(() => {
          this.loginChange.emit({ loggedIn: false, role: '' });
        }, 0);
      }
    } else {
      setTimeout(() => {
        this.loginChange.emit({ loggedIn: false, role: '' });
      }, 0);
    }
  }

  async sha256(str: string) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async login() {
    if (!this.username || !this.password) {
      this.showError('Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }

    const h = await this.sha256(this.password || '');
    const u = this.users.find(x => x.username === this.username && x.hash === h);
    
    if (u) {
      this.loggedIn = true;
      this.role = u.role;
      this.showLoginForm = false;
      
      localStorage.setItem('thang_user', JSON.stringify({ 
        username: this.username, 
        role: this.role,
        displayName: u.displayName,
        loginTime: new Date().toISOString()
      }));
      localStorage.setItem('role', this.role);
      
      this.loginChange.emit({ loggedIn: true, role: this.role });
      this.password = '';
      this.showSuccess(`Đăng nhập thành công! Chào mừng ${u.displayName}`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      this.showError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }
  }

  logout() {
    this.loggedIn = false;
    this.username = '';
    this.role = '';
    this.showUserMenu = false;
    localStorage.removeItem('thang_user');
    localStorage.removeItem('role');
    this.loginChange.emit({ loggedIn: false, role: '' });
    this.showSuccess('Đã đăng xuất thành công!');
  }

  forceLogout() {
    console.log('Force logout triggered');
    localStorage.clear(); // Clear all localStorage for debugging
    this.loggedIn = false;
    this.username = '';
    this.role = '';
    this.showUserMenu = false;
    this.showLoginForm = false;
    this.loginChange.emit({ loggedIn: false, role: '' });
    this.showSuccess('Đã xóa tất cả dữ liệu đăng nhập!');
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  forceShowLogin() {
    console.log('Force show login triggered');
    this.loggedIn = false;
    this.showLoginForm = true;
    this.showSuccess('Forced login form to show!');
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleLoginForm() {
    this.showLoginForm = !this.showLoginForm;
  }

  closeLoginForm() {
    console.log('Closing login form');
    this.showLoginForm = false;
    this.username = '';
    this.password = '';
  }

  onUsernameChange(event: any) {
    console.log('Username input event triggered!');
    console.log('Event type:', event.type);
    console.log('Event target value:', event.target.value);
    this.username = event.target.value;
  }

  onPasswordChange(event: any) {
    console.log('Password input event triggered!');
    console.log('Event type:', event.type);
    console.log('Event target value:', event.target.value);
    this.password = event.target.value;
  }



  getDisplayName(): string {
    const user = this.users.find(u => u.username === this.username);
    return user?.displayName || this.username;
  }

  getRoleDisplayName(): string {
    switch (this.role) {
      case 'superadmin': return 'Quản trị viên';
      case 'admin': return 'Quản lý';
      default: return 'Thành viên';
    }
  }

  openProfile() {
    this.showUserMenu = false;
    // TODO: Implement profile modal/page
    this.showInfo('Tính năng đang được phát triển');
  }

  openSettings() {
    this.showUserMenu = false;
    // TODO: Implement settings modal/page
    this.showInfo('Tính năng đang được phát triển');
  }

  private showSuccess(message: string) {
    // Simple success notification - could be enhanced with a proper toast system
    const notification = this.createNotification(message, 'success');
    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  private showError(message: string) {
    // Simple error notification - could be enhanced with a proper toast system
    const notification = this.createNotification(message, 'error');
    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 4000);
  }

  private showInfo(message: string) {
    // Simple info notification - could be enhanced with a proper toast system
    const notification = this.createNotification(message, 'info');
    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  getUserAvatarUrl(): string | null {
    // Map usernames to avatar file names
    const avatarMap: { [key: string]: string } = {
      'NamLuu': 'Nam.png',
      'SyNguyen': 'Sy.png'
    };
    
    const avatarFile = avatarMap[this.username];
    return avatarFile ? `/assets/images/avatar_players/${avatarFile}` : null;
  }

  getInitials(): string {
    const displayName = this.getDisplayName();
    return displayName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  onAvatarError(event: any): void {
    // Hide the broken image and show placeholder instead
    event.target.style.display = 'none';
  }

  private createNotification(message: string, type: 'success' | 'error' | 'info'): HTMLElement {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      margin-left: 10px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
    `;
    closeBtn.onclick = () => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    };
    notification.appendChild(closeBtn);

    // Add slide in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);

    return notification;
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }


}
