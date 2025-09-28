import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseAdminSetupService, AdminSetupResult } from '../services/firebase-admin-setup.service';
import { ADMIN_USERS, AdminUser } from '../config/admin.config';

@Component({
  selector: 'app-admin-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="setup-container">
      <!-- Setup Header -->
      <div class="setup-header">
        <h2>🚀 Firebase Admin Setup</h2>
        <p>Create Firebase Authentication users for admin access</p>
      </div>

      <!-- Setup Status -->
      <div class="setup-status">
        <div class="status-card" [class]="setupStatus.class">
          <i [class]="setupStatus.icon"></i>
          <span>{{setupStatus.message}}</span>
        </div>
      </div>

      <!-- Admin Users List -->
      <div class="admin-list">
        <h3>📧 Configured Admin Users</h3>
        <div class="admin-grid">
          <div *ngFor="let admin of adminUsers" class="admin-card">
            <div class="admin-info">
              <div class="admin-name">{{admin.displayName}}</div>
              <div class="admin-email">{{admin.email}}</div>
              <div class="admin-role" [class]="admin.role">{{admin.role}}</div>
            </div>
            <div class="admin-actions">
              <button 
                class="create-btn"
                (click)="createSingleUser(admin.email)"
                [disabled]="isLoading">
                <i class="fas fa-user-plus"></i>
                Create
              </button>
              <button 
                class="test-btn"
                (click)="testLogin(admin.email)"
                [disabled]="isLoading">
                <i class="fas fa-sign-in-alt"></i>
                Test
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Setup Actions -->
      <div class="setup-actions">
        <div class="password-section">
          <label for="defaultPassword">Default Password for New Users:</label>
          <input 
            type="password" 
            id="defaultPassword"
            [(ngModel)]="defaultPassword" 
            placeholder="Enter secure password"
            class="password-input">
          <small>⚠️ Users should change this after first login</small>
        </div>
        
        <div class="action-buttons">
          <button 
            class="setup-btn primary"
            (click)="createAllUsers()"
            [disabled]="isLoading || !defaultPassword">
            <i class="fas fa-users"></i>
            {{isLoading ? 'Creating Users...' : 'Create All Firebase Users'}}
          </button>
          
          <button 
            class="setup-btn secondary"
            (click)="showInstructions = !showInstructions">
            <i class="fas fa-info-circle"></i>
            {{showInstructions ? 'Hide' : 'Show'}} Instructions
          </button>
          
          <button 
            class="setup-btn danger"
            (click)="clearResults()">
            <i class="fas fa-trash"></i>
            Clear Results
          </button>
        </div>
      </div>

      <!-- Instructions -->
      <div *ngIf="showInstructions" class="instructions">
        <h3>📋 Setup Instructions</h3>
        <div class="instruction-content">
          <div class="manual-setup">
            <h4>🔧 Manual Setup (Recommended)</h4>
            <ol>
              <li>Go to <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a></li>
              <li>Select your project: <code>thanglong-fc</code></li>
              <li>Go to <strong>Authentication → Users</strong></li>
              <li>Click <strong>"Add user"</strong> for each admin:</li>
              <ul class="user-list">
                <li *ngFor="let admin of adminUsers">
                  <strong>{{admin.email}}</strong> - {{admin.displayName}} ({{admin.role}})
                </li>
              </ul>
              <li>Set a secure password for each user</li>
              <li>Users can login immediately after creation</li>
            </ol>
          </div>
          
          <div class="auto-setup">
            <h4>⚡ Automatic Setup (Development)</h4>
            <ol>
              <li>Enter a secure default password above</li>
              <li>Click <strong>"Create All Firebase Users"</strong></li>
              <li>Check results below for success/failure status</li>
              <li>Users should change passwords after first login</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div *ngIf="setupResults.length > 0" class="results">
        <h3>📊 Setup Results</h3>
        <div class="results-list">
          <div *ngFor="let result of setupResults" 
               class="result-item" 
               [class]="result.success ? 'success' : 'error'">
            <div class="result-icon">
              <i [class]="result.success ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
            </div>
            <div class="result-content">
              <div class="result-email">{{result.email}}</div>
              <div class="result-message">{{result.message}}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Login Section -->
      <div *ngIf="showTestLogin" class="test-login">
        <h3>🧪 Test Login</h3>
        <div class="test-form">
          <input 
            type="email" 
            [(ngModel)]="testEmail" 
            placeholder="Admin email"
            class="test-input">
          <input 
            type="password" 
            [(ngModel)]="testPassword" 
            placeholder="Password"
            class="test-input">
          <button 
            class="test-submit-btn"
            (click)="performTestLogin()"
            [disabled]="isLoading || !testEmail || !testPassword">
            Test Login
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .setup-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .setup-header h2 {
      color: #007bff;
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .setup-header p {
      color: #6c757d;
      margin: 0;
      font-size: 1.1rem;
    }

    .setup-status {
      margin-bottom: 24px;
    }

    .status-card {
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
    }

    .status-card.pending {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .status-card.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status-card.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .admin-list h3 {
      color: #333;
      margin-bottom: 16px;
      font-size: 1.3rem;
    }

    .admin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .admin-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .admin-info {
      flex: 1;
    }

    .admin-name {
      font-weight: 700;
      color: #333;
      font-size: 1.1rem;
      margin-bottom: 4px;
    }

    .admin-email {
      color: #6c757d;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    .admin-role {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
    }

    .admin-role.superadmin {
      background: linear-gradient(135deg, #ff6b6b, #ff5252);
      color: white;
    }

    .admin-role.admin {
      background: linear-gradient(135deg, #4ecdc4, #26a69a);
      color: white;
    }

    .admin-actions {
      display: flex;
      gap: 8px;
      flex-direction: column;
    }

    .create-btn, .test-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 80px;
    }

    .create-btn {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
    }

    .create-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .test-btn {
      background: linear-gradient(135deg, #007bff, #17a2b8);
      color: white;
    }

    .test-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }

    .create-btn:disabled, .test-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .setup-actions {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .password-section {
      margin-bottom: 20px;
    }

    .password-section label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .password-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    .password-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .password-section small {
      display: block;
      margin-top: 6px;
      color: #dc3545;
      font-size: 0.85rem;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .setup-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }

    .setup-btn.primary {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
    }

    .setup-btn.secondary {
      background: linear-gradient(135deg, #6c757d, #495057);
      color: white;
    }

    .setup-btn.danger {
      background: linear-gradient(135deg, #dc3545, #c82333);
      color: white;
    }

    .setup-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .setup-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .instructions {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .instructions h3 {
      color: #333;
      margin: 0 0 20px 0;
      font-size: 1.3rem;
    }

    .instruction-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .manual-setup, .auto-setup {
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }

    .manual-setup {
      background: #f8f9fa;
      border-left-color: #28a745;
    }

    .auto-setup {
      background: #fff3cd;
      border-left-color: #ffc107;
    }

    .instruction-content h4 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .instruction-content ol {
      margin: 0;
      padding-left: 20px;
    }

    .instruction-content li {
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .user-list {
      margin: 8px 0;
      padding-left: 16px;
    }

    .user-list li {
      margin-bottom: 4px;
    }

    code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Consolas', monospace;
      color: #e83e8c;
    }

    .results {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .results h3 {
      color: #333;
      margin: 0 0 16px 0;
      font-size: 1.3rem;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid transparent;
    }

    .result-item.success {
      background: #d4edda;
      border-left-color: #28a745;
    }

    .result-item.error {
      background: #f8d7da;
      border-left-color: #dc3545;
    }

    .result-icon {
      font-size: 1.2rem;
    }

    .result-item.success .result-icon {
      color: #28a745;
    }

    .result-item.error .result-icon {
      color: #dc3545;
    }

    .result-content {
      flex: 1;
    }

    .result-email {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }

    .result-message {
      color: #6c757d;
      font-size: 0.9rem;
    }

    .test-login {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .test-login h3 {
      color: #333;
      margin: 0 0 16px 0;
      font-size: 1.3rem;
    }

    .test-form {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .test-input {
      flex: 1;
      min-width: 200px;
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .test-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .test-submit-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #17a2b8, #138496);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .test-submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
    }

    .test-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .setup-container {
        padding: 16px;
      }

      .admin-grid {
        grid-template-columns: 1fr;
      }

      .instruction-content {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
      }

      .setup-btn {
        text-align: center;
        justify-content: center;
      }

      .test-form {
        flex-direction: column;
      }

      .test-input {
        min-width: auto;
      }
    }
  `]
})
export class AdminSetupComponent implements OnInit {
  adminUsers: AdminUser[] = ADMIN_USERS;
  defaultPassword: string = 'ThangLongFC2024!';
  setupResults: AdminSetupResult[] = [];
  isLoading: boolean = false;
  showInstructions: boolean = false;
  showTestLogin: boolean = false;
  
  // Test login fields
  testEmail: string = '';
  testPassword: string = '';
  
  setupStatus = {
    message: 'Ready to create Firebase Authentication users for your admins',
    class: 'pending',
    icon: 'fas fa-clock'
  };

  constructor(private adminSetupService: FirebaseAdminSetupService) {}

  ngOnInit() {
    console.log('🚀 Admin Setup Component initialized');
    console.log('📧 Configured admins:', this.adminUsers);
  }

  async createAllUsers() {
    if (!this.defaultPassword || this.defaultPassword.length < 6) {
      this.updateStatus('Password must be at least 6 characters long', 'error', 'fas fa-exclamation-triangle');
      return;
    }

    this.isLoading = true;
    this.setupResults = [];
    this.updateStatus('Creating Firebase Authentication users...', 'pending', 'fas fa-spinner fa-spin');

    try {
      const results = await this.adminSetupService.createAllAdminUsers(this.defaultPassword);
      this.setupResults = results;
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        this.updateStatus(
          `✅ All ${totalCount} users created successfully!`, 
          'success', 
          'fas fa-check-circle'
        );
      } else {
        this.updateStatus(
          `⚠️ ${successCount}/${totalCount} users created. Check results below.`, 
          'error', 
          'fas fa-exclamation-triangle'
        );
      }
      
    } catch (error: any) {
      console.error('❌ Setup failed:', error);
      this.updateStatus(`Setup failed: ${error.message}`, 'error', 'fas fa-times-circle');
    } finally {
      this.isLoading = false;
    }
  }

  async createSingleUser(email: string) {
    if (!this.defaultPassword || this.defaultPassword.length < 6) {
      this.updateStatus('Password must be at least 6 characters long', 'error', 'fas fa-exclamation-triangle');
      return;
    }

    this.isLoading = true;
    
    try {
      const result = await this.adminSetupService.createAdminUser(email, this.defaultPassword);
      
      // Update or add result for this email
      const existingIndex = this.setupResults.findIndex(r => r.email === email);
      if (existingIndex >= 0) {
        this.setupResults[existingIndex] = result;
      } else {
        this.setupResults.push(result);
      }
      
      if (result.success) {
        this.updateStatus(`✅ User ${email} created successfully!`, 'success', 'fas fa-check-circle');
      } else {
        this.updateStatus(`❌ Failed to create ${email}: ${result.message}`, 'error', 'fas fa-times-circle');
      }
      
    } catch (error: any) {
      console.error('❌ Single user creation failed:', error);
      this.updateStatus(`Failed to create ${email}: ${error.message}`, 'error', 'fas fa-times-circle');
    } finally {
      this.isLoading = false;
    }
  }

  async testLogin(email: string) {
    if (!this.defaultPassword) {
      this.updateStatus('Enter the password to test login', 'error', 'fas fa-exclamation-triangle');
      return;
    }

    this.isLoading = true;
    
    try {
      const result = await this.adminSetupService.testAdminLogin(email, this.defaultPassword);
      
      if (result.success) {
        this.updateStatus(`✅ Login test successful for ${email}!`, 'success', 'fas fa-check-circle');
      } else {
        this.updateStatus(`❌ Login test failed for ${email}: ${result.message}`, 'error', 'fas fa-times-circle');
      }
      
    } catch (error: any) {
      console.error('❌ Login test failed:', error);
      this.updateStatus(`Login test failed: ${error.message}`, 'error', 'fas fa-times-circle');
    } finally {
      this.isLoading = false;
    }
  }

  async performTestLogin() {
    if (!this.testEmail || !this.testPassword) {
      return;
    }

    this.isLoading = true;
    
    try {
      const result = await this.adminSetupService.testAdminLogin(this.testEmail, this.testPassword);
      
      if (result.success) {
        this.updateStatus(`✅ Test login successful for ${this.testEmail}!`, 'success', 'fas fa-check-circle');
      } else {
        this.updateStatus(`❌ Test login failed: ${result.message}`, 'error', 'fas fa-times-circle');
      }
      
    } catch (error: any) {
      console.error('❌ Test login failed:', error);
      this.updateStatus(`Test login failed: ${error.message}`, 'error', 'fas fa-times-circle');
    } finally {
      this.isLoading = false;
    }
  }

  clearResults() {
    this.setupResults = [];
    this.updateStatus('Results cleared. Ready for new setup.', 'pending', 'fas fa-clock');
  }

  private updateStatus(message: string, statusClass: string, icon: string) {
    this.setupStatus = {
      message,
      class: statusClass,
      icon
    };
  }
}