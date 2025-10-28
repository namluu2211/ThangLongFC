import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanEditDirective } from '../../shared/can-edit.directive';
import { DisableUnlessCanEditDirective } from '../../shared/disable-unless-can-edit.directive';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { PermissionService } from '../../core/services/permission.service';
import { Subscription } from 'rxjs';
import {
  FUND_CURRENCY,
  FUND_DATE_FORMAT,
  FUND_CATEGORIES
} from './fund.constants';
import { FundTransactionService, Transaction as FundTransaction } from './fund-transaction.service';
import { LoggerService } from '../../core/services/logger.service';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  relatedTo?: string;
}

interface FundSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  matchTotalIncome: number;
  matchTotalExpenses: number;
  grandTotalIncome: number;
  grandTotalExpenses: number;
  monthlyProfit: number;
}

@Component({
  selector: 'app-fund',
  standalone: true,
  imports: [CommonModule, FormsModule, CanEditDirective, DisableUnlessCanEditDirective],
  template: `
    <div class="fund-dashboard">
      <!-- Modern Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="header-info">
            <h1 class="dashboard-title">
              <span class="title-icon">💰</span>
              Quản lý Quỹ Đội Bóng
            </h1>
            <p class="dashboard-subtitle">Theo dõi tài chính và quản lý thu chi hiệu quả</p>
          </div>
          <div class="header-actions" *appCanEdit; else readOnlyBanner>
            <button class="btn-primary" (click)="showAddTransaction = true">
              <span class="btn-icon">➕</span>
              Thêm giao dịch
            </button>
          </div>
          <ng-template #readOnlyBanner>
            <div class="readonly-note">Chế độ xem (đăng nhập để thêm giao dịch)</div>
          </ng-template>
        </div>
      </div>

      <!-- Summary Cards Grid -->
      <div class="summary-grid">
        <div class="summary-card balance-card" [class.negative]="fundSummary.currentBalance < 0">
          <div class="card-header">
            <span class="card-icon balance-icon">💳</span>
            <span class="card-title">Số dư hiện tại</span>
          </div>
          <div class="card-content">
            <div class="main-value">{{formatCurrency(fundSummary.currentBalance)}}</div>
            <div class="card-subtitle" [class.positive]="fundSummary.monthlyProfit > 0" [class.negative]="fundSummary.monthlyProfit < 0">
              <span class="trend-icon">{{fundSummary.monthlyProfit > 0 ? '📈' : '📉'}}</span>
              {{formatCurrency(fundSummary.monthlyProfit)}} tháng này
            </div>
          </div>
        </div>

        <div class="summary-card income-card">
          <div class="card-header">
            <span class="card-icon income-icon">📈</span>
            <span class="card-title">Tổng thu</span>
          </div>
          <div class="card-content">
            <div class="main-value income">{{formatCurrency(fundSummary.grandTotalIncome)}}</div>
            <div class="card-subtitle">
              <div class="breakdown">
                <span>Trận đấu: {{formatCurrency(fundSummary.matchTotalIncome)}}</span>
                <span>Giao dịch: {{formatCurrency(fundSummary.totalIncome)}}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="summary-card expense-card">
          <div class="card-header">
            <span class="card-icon expense-icon">📉</span>
            <span class="card-title">Tổng chi</span>
          </div>
          <div class="card-content">
            <div class="main-value expense">{{formatCurrency(fundSummary.grandTotalExpenses)}}</div>
            <div class="card-subtitle">
              <div class="breakdown">
                <span>Trận đấu: {{formatCurrency(fundSummary.matchTotalExpenses)}}</span>
                <span>Giao dịch: {{formatCurrency(fundSummary.totalExpenses)}}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="summary-card activity-card">
          <div class="card-header">
            <span class="card-icon activity-icon">📊</span>
            <span class="card-title">Hoạt động</span>
          </div>
          <div class="card-content">
            <div class="main-value activity">{{fundSummary.transactionCount}}</div>
            <div class="card-subtitle">Giao dịch trong tháng</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-section">
        <h2 class="section-title">
          <span class="section-icon">⚡</span>
          Thao tác nhanh
        </h2>
        <div class="quick-actions-grid">
          <button class="quick-action-btn income-action" (click)="quickAddIncome()" appDisableUnlessCanEdit>
            <span class="action-icon">💰</span>
            <span class="action-text">Thêm thu nhập</span>
          </button>
          <button class="quick-action-btn expense-action" (click)="quickAddExpense()" appDisableUnlessCanEdit>
            <span class="action-icon">💸</span>
            <span class="action-text">Thêm chi phí</span>
          </button>
          <button class="quick-action-btn report-action" (click)="generateReport()">
            <span class="action-icon">📋</span>
            <span class="action-text">Báo cáo</span>
          </button>
          <button class="quick-action-btn sync-action" (click)="syncWithMatches()" appDisableUnlessCanEdit>
            <span class="action-icon">🔄</span>
            <span class="action-text">Đồng bộ trận đấu</span>
          </button>
        </div>
      </div>

      <!-- Transaction Management -->
      <div class="transaction-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="section-icon">📝</span>
            Lịch sử giao dịch
          </h2>
          <div class="section-actions">
            <div class="filter-group">
              <select [(ngModel)]="selectedFilter" (change)="filterTransactions()" class="filter-select">
                <option value="all">Tất cả</option>
                <option value="income">Thu nhập</option>
                <option value="expense">Chi phí</option>
                <option value="this-month">Tháng này</option>
              </select>
            </div>
            <button class="btn-secondary" (click)="exportTransactions()">
              <span class="btn-icon">📁</span>
              Xuất Excel
            </button>
          </div>
        </div>

        <div class="transaction-list" *ngIf="filteredTransactions.length > 0">
          <div *ngFor="let transaction of filteredTransactions; trackBy: trackTransaction" 
               class="transaction-item" 
               [class.income]="transaction.type === 'income'"
               [class.expense]="transaction.type === 'expense'">
            <div class="transaction-main">
              <div class="transaction-info">
                <div class="transaction-header">
                  <span class="transaction-category">{{transaction.category}}</span>
                  <span class="transaction-date">{{formatDate(transaction.date)}}</span>
                </div>
                <div class="transaction-description">{{transaction.description}}</div>
              </div>
              <div class="transaction-amount" [class.income]="transaction.type === 'income'" [class.expense]="transaction.type === 'expense'">
                <span class="amount-symbol">{{transaction.type === 'income' ? '+' : '-'}}</span>
                <span class="amount-value">{{formatCurrency(transaction.amount)}}</span>
              </div>
            </div>
            <div class="transaction-actions">
              <button class="action-btn edit" *appCanEdit (click)="editTransaction(transaction)" title="Chỉnh sửa">
                ✏️
              </button>
              <button class="action-btn delete" *appCanEdit (click)="deleteTransaction(transaction)" title="Xóa">
                🗑️
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="filteredTransactions.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <h3 class="empty-title">Chưa có giao dịch nào</h3>
          <p class="empty-text">Bắt đầu bằng cách thêm giao dịch đầu tiên của bạn</p>
          <button class="btn-primary" *appCanEdit (click)="showAddTransaction = true">
            <span class="btn-icon">➕</span>
            Thêm giao dịch đầu tiên
          </button>
        </div>
      </div>

      <!-- Add Transaction Modal -->
  <ng-container *appCanEdit>
  <div *ngIf="showAddTransaction" class="modal-overlay" tabindex="0" (click)="showAddTransaction = false" (keyup.escape)="showAddTransaction = false">
        <div class="modal-content" tabindex="0" (click)="$event.stopPropagation()" (keyup.escape)="closeTransactionModal()">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="modal-icon">💰</span>
              {{editingTransaction ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}}
            </h3>
            <button class="close-btn" (click)="closeTransactionModal()">✕</button>
          </div>
          
          <form (ngSubmit)="saveTransaction()" class="transaction-form">
            <div class="form-grid">
              <div class="form-group">
                <div class="form-label">Loại giao dịch</div>
                <div class="type-selector">
                  <button type="button" 
                          class="type-btn" 
                          [class.active]="transactionForm.type === 'income'"
                          (click)="transactionForm.type = 'income'">
                    <span class="type-icon">📈</span>
                    Thu nhập
                  </button>
                  <button type="button" 
                          class="type-btn" 
                          [class.active]="transactionForm.type === 'expense'"
                          (click)="transactionForm.type = 'expense'">
                    <span class="type-icon">📉</span>
                    Chi phí
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label for="category" class="form-label">Danh mục</label>
                <select id="category" [(ngModel)]="transactionForm.category" name="category" class="form-input" required>
                  <option value="">Chọn danh mục</option>
                  <option *ngFor="let cat of getCategories()" [value]="cat.value">{{cat.label}}</option>
                </select>
              </div>

              <div class="form-group full-width">
                <label for="description" class="form-label">Mô tả</label>
                <input id="description" type="text" 
                       [(ngModel)]="transactionForm.description" 
                       name="description"
                       class="form-input" 
                       placeholder="Nhập mô tả giao dịch..."
                       required>
              </div>

              <div class="form-group">
                <label for="amount" class="form-label">Số tiền (VNĐ)</label>
                <input id="amount" type="number" 
                       [(ngModel)]="transactionForm.amount" 
                       name="amount"
                       class="form-input amount-input" 
                       placeholder="0"
                       min="0"
                       step="1000"
                       required>
              </div>

              <div class="form-group">
                <label for="transactionDate" class="form-label">Ngày giao dịch</label>
                <input id="transactionDate" type="date" 
                       [(ngModel)]="transactionForm.date" 
                       name="date"
                       class="form-input"
                       required>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeTransactionModal()">
                Hủy
              </button>
              <button type="submit" class="btn-primary">
                <span class="btn-icon">💾</span>
                {{editingTransaction ? 'Cập nhật' : 'Thêm giao dịch'}}
              </button>
            </div>
          </form>
        </div>
    </div>
  </ng-container>
    </div>
  `,
  styles: [`
    /* Modern Dashboard Styles with Enhanced Glassmorphism */
    .fund-dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
      }
      50% {
        box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }

    /* Modern Header with Glassmorphism */
    .dashboard-header {
      margin-bottom: 32px;
      animation: slideDown 0.6s ease;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      padding: 32px;
      border-radius: 24px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.5);
      position: relative;
      overflow: hidden;
    }

    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .title-icon {
      font-size: 3rem;
      animation: bounce 2s ease-in-out infinite;
    }

    .dashboard-subtitle {
      font-size: 1.1rem;
      color: #64748b;
      margin: 12px 0 0 0;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .readonly-note {
      padding: 12px 20px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      border-radius: 16px;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
    }

    /* Enhanced Summary Cards Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
      animation: fadeInUp 0.6s ease 0.1s both;
    }

    .summary-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
      border: 2px solid rgba(255, 255, 255, 0.9);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: height 0.3s ease;
    }

    .summary-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
    }

    .summary-card:hover::before {
      height: 8px;
    }

    .balance-card {
      background: white;
    }

    .balance-card::before {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }

    .balance-card.negative {
      background: white;
    }

    .balance-card.negative::before {
      background: linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%);
    }

    .income-card {
      background: white;
    }

    .income-card::before {
      background: linear-gradient(90deg, #059669 0%, #10b981 100%);
    }

    .expense-card {
      background: white;
    }

    .expense-card::before {
      background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
    }

    .activity-card {
      background: white;
    }

    .activity-card::before {
      background: linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .card-icon {
      font-size: 2rem;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .main-value {
      font-size: 2.8rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 12px;
      line-height: 1;
    }

    .main-value.income {
      color: #059669;
    }

    .main-value.expense {
      color: #dc2626;
    }

    .main-value.activity {
      color: #0284c7;
    }

    .card-subtitle {
      font-size: 0.95rem;
      color: #475569;
      font-weight: 600;
    }

    .card-subtitle.positive {
      color: #059669;
    }

    .card-subtitle.negative {
      color: #dc2626;
    }

    .trend-icon {
      margin-right: 4px;
    }

    .breakdown {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .breakdown span {
      font-size: 0.9rem;
      color: #475569;
      font-weight: 600;
    }

    /* Enhanced Quick Actions */
    .quick-actions-section {
      margin-bottom: 40px;
      animation: fadeInUp 0.6s ease 0.2s both;
    }

    .section-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: white;
      margin: 0 0 24px 0;
      display: flex;
      align-items: center;
      gap: 12px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .section-icon {
      font-size: 1.6rem;
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .quick-action-btn {
      background: white;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-radius: 16px;
      padding: 28px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      color: #0f172a;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    .quick-action-btn:hover:not(:disabled) {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    }

    .quick-action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-icon {
      font-size: 2.5rem;
      transition: transform 0.3s ease;
    }

    .quick-action-btn:hover:not(:disabled) .action-icon {
      transform: scale(1.2);
    }

    .action-text {
      font-weight: 700;
      font-size: 1.05rem;
      color: #0f172a;
    }

    .income-action:hover:not(:disabled) {
      border-color: #059669;
      background: white;
    }

    .expense-action:hover:not(:disabled) {
      border-color: #dc2626;
      background: white;
    }

    .report-action:hover:not(:disabled) {
      border-color: #0284c7;
      background: white;
    }

    .sync-action:hover:not(:disabled) {
      border-color: #764ba2;
      background: white;
    }

    /* Enhanced Transaction Section */
    .transaction-section {
      background: white;
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      border: 2px solid rgba(255, 255, 255, 0.9);
      animation: fadeInUp 0.6s ease 0.3s both;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .section-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 24px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .transaction-section .section-title {
      color: #0f172a;
      margin: 0;
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .filter-select {
      padding: 10px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: white;
      color: #0f172a;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .filter-select:hover {
      border-color: #667eea;
    }

    .filter-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    }

    /* Enhanced Transaction List */
    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .transaction-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border: 2px solid #e9ecef;
      border-radius: 16px;
      background: white;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .transaction-item:hover {
      background: #f8f9fa;
      border-color: #cbd5e1;
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .transaction-item.income {
      border-left: 5px solid #11998e;
    }

    .transaction-item.expense {
      border-left: 5px solid #ff6b6b;
    }

    .transaction-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      gap: 16px;
    }

    .transaction-info {
      flex: 1;
    }

    .transaction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      gap: 12px;
    }

    .transaction-category {
      font-weight: 700;
      color: #2d3748;
      font-size: 1rem;
    }

    .transaction-date {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 600;
    }

    .transaction-description {
      color: #64748b;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .transaction-amount {
      font-size: 1.3rem;
      font-weight: 800;
      text-align: right;
      min-width: 140px;
    }

    .transaction-amount.income {
      color: #11998e;
    }

    .transaction-amount.expense {
      color: #ff6b6b;
    }

    .amount-symbol {
      font-size: 1rem;
      margin-right: 2px;
    }

    .transaction-actions {
      display: flex;
      gap: 8px;
      margin-left: 16px;
    }

    .action-btn {
      background: white;
      border: 2px solid #e9ecef;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }

    .action-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .action-btn.edit:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
    }

    .action-btn.delete:hover {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      border-color: #ff6b6b;
    }

    /* Enhanced Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #64748b;
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 20px;
      opacity: 0.7;
      animation: bounce 2s ease-in-out infinite;
    }

    .empty-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 12px;
    }

    .empty-text {
      margin-bottom: 28px;
      font-size: 1.05rem;
    }

    /* Enhanced Buttons */
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      font-size: 0.95rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.45);
    }

    .btn-primary:active {
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #2d3748;
      border: 2px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .btn-secondary:hover {
      background: #e2e8f0;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .btn-icon {
      font-size: 1rem;
    }

    /* Enhanced Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background: white;
      border-radius: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(40px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 28px;
      border-bottom: 2px solid #f0f2f5;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.02));
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #2d3748;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-icon {
      font-size: 1.8rem;
    }

    .close-btn {
      background: #f1f5f9;
      border: 2px solid #e2e8f0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 1.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      color: #64748b;
    }

    .close-btn:hover {
      background: #ef4444;
      border-color: #ef4444;
      color: white;
      transform: rotate(90deg);
    }

    /* Enhanced Transaction Form */
    .transaction-form {
      padding: 28px;
    }

    .form-grid {
      display: grid;
      gap: 20px;
      margin-bottom: 28px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-label {
      font-weight: 700;
      color: #2d3748;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .type-btn {
      padding: 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #64748b;
    }

    .type-btn:hover {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .type-btn.active {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1));
      color: #667eea;
      font-weight: 700;
    }

    .type-icon {
      font-size: 1.5rem;
    }

    .form-input {
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      color: #2d3748;
      background: white;
      transition: all 0.3s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
      transform: translateY(-2px);
    }

    .form-input:hover {
      border-color: #cbd5e1;
    }

    .amount-input {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 20px;
      border-top: 2px solid #f0f2f5;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .fund-dashboard {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        padding: 24px;
      }

      .dashboard-title {
        font-size: 2rem;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr 1fr;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .transaction-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .transaction-main {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
      }

      .transaction-amount {
        text-align: left;
      }

      .transaction-actions {
        margin-left: 0;
        width: 100%;
        justify-content: flex-end;
      }

      .modal-content {
        width: 95%;
        max-height: 95vh;
      }

      .type-selector {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .dashboard-title {
        font-size: 1.6rem;
      }

      .title-icon {
        font-size: 2rem;
      }

      .main-value {
        font-size: 2rem;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FundComponent implements OnInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  private fundTransactionService = inject(FundTransactionService);
  private logger = inject(LoggerService);
  private subscription?: Subscription;
  private permission = inject(PermissionService);
  canEdit = false;

  // Data properties
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  matchHistory: HistoryEntry[] = [];
  
  fundSummary: FundSummary = {
    currentBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
    matchTotalIncome: 0,
    matchTotalExpenses: 0,
    grandTotalIncome: 0,
    grandTotalExpenses: 0,
    monthlyProfit: 0
  };

  // UI state
  showAddTransaction = false;
  editingTransaction: Transaction | null = null;
  selectedFilter = 'all';

  // Form data
  transactionForm: Partial<Transaction> = {
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    description: ''
  };

  ngOnInit() {
    // Deferred Firebase listeners: attach fund & history listeners only when Fund route is active
    this.firebaseService.attachFundListener();
    // History might be needed for match-related financial summaries
    this.firebaseService.attachHistoryListener();
    // Statistics may be displayed or computed within fund summaries
    this.firebaseService.attachStatisticsListener();
    this.loadData();
    this.subscribeToMatchHistory();
    this.permission.canEditChanges().subscribe(can=>{ this.canEdit=can; });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private loadData() {
    try {
      this.transactions = this.fundTransactionService.loadTransactions();
      this.logger.info('Loaded transactions from storage', this.transactions);
    } catch (err) {
      this.logger.error('Failed to load transactions', err);
      this.transactions = [];
    }
    this.filterTransactions();
    this.calculateSummary();
  }

  private subscribeToMatchHistory() {
    this.subscription = this.firebaseService.history$.subscribe(matchHistory => {
      this.matchHistory = matchHistory;
      this.calculateMatchHistoryBalance();
      this.calculateSummary();
    });
  }

  private calculateMatchHistoryBalance() {
    let totalIncome = 0;
    let totalExpenses = 0;

    this.matchHistory.forEach(match => {
      totalIncome += match.thu || 0;
      totalExpenses += (match.chi_san || 0) + (match.chi_trongtai || 0) + 
                      (match.chi_khac || 0) + (match.chi_nuoc || 0) + 
                      (match.chi_dilai || 0) + (match.chi_anuong || 0);
    });

    this.fundSummary.matchTotalIncome = totalIncome;
    this.fundSummary.matchTotalExpenses = totalExpenses;
  }

  private calculateSummary() {
    // Calculate transaction totals
    this.fundSummary.totalIncome = this.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.fundSummary.totalExpenses = this.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    this.fundSummary.transactionCount = this.transactions.length;

    // Calculate grand totals
    this.fundSummary.grandTotalIncome = this.fundSummary.totalIncome + this.fundSummary.matchTotalIncome;
    this.fundSummary.grandTotalExpenses = this.fundSummary.totalExpenses + this.fundSummary.matchTotalExpenses;

    // Calculate current balance
    this.fundSummary.currentBalance = this.fundSummary.grandTotalIncome - this.fundSummary.grandTotalExpenses;

    // Calculate monthly profit (simplified)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyIncome = this.transactions
      .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = this.transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0);

    this.fundSummary.monthlyProfit = monthlyIncome - monthlyExpenses;
  }

  filterTransactions() {
    let filtered = [...this.transactions];

    switch (this.selectedFilter) {
      case 'income':
        filtered = filtered.filter(t => t.type === 'income');
        break;
      case 'expense':
        filtered = filtered.filter(t => t.type === 'expense');
        break;
      case 'this-month': {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        filtered = filtered.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        break;
      }
    }

    this.filteredTransactions = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  quickAddIncome() {
    if(!this.canEdit) return;
    this.transactionForm = {
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: 'match-fee',
      description: ''
    };
    this.showAddTransaction = true;
  }

  quickAddExpense() {
    if(!this.canEdit) return;
    this.transactionForm = {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: 'field-rental',
      description: ''
    };
    this.showAddTransaction = true;
  }

  generateReport() {
    // Implement report generation
    console.log('Generating report...');
  }

  syncWithMatches() {
    // Implement match synchronization
    console.log('Syncing with matches...');
  }

  exportTransactions() {
    // Implement export functionality
    console.log('Exporting transactions...');
  }

  saveTransaction() {
    if(!this.canEdit) return;
    if (!this.transactionForm.category || !this.transactionForm.description || !this.transactionForm.amount) {
      this.logger.warn('Transaction form is incomplete', this.transactionForm);
      return;
    }
    try {
      const transaction: FundTransaction = {
        id: this.editingTransaction?.id || this.generateId(),
        date: this.transactionForm.date!,
        type: this.transactionForm.type as 'income' | 'expense',
        category: this.transactionForm.category!,
        description: this.transactionForm.description!,
        amount: Number(this.transactionForm.amount)
      };
      if (this.editingTransaction) {
        this.transactions = this.fundTransactionService.updateTransaction(this.transactions, transaction);
        this.logger.info('Updated transaction', transaction);
      } else {
        this.transactions = this.fundTransactionService.addTransaction(this.transactions, transaction);
        this.logger.info('Added new transaction', transaction);
      }
      this.fundTransactionService.saveTransactions(this.transactions);
      this.logger.success('Transactions saved');
    } catch (err) {
      this.logger.error('Failed to save transaction', err, this.transactionForm);
    }
    this.calculateSummary();
    this.filterTransactions();
    this.closeTransactionModal();
  }

  editTransaction(transaction: Transaction) {
    if(!this.canEdit) return;
    this.editingTransaction = transaction;
    this.transactionForm = { ...transaction };
    this.showAddTransaction = true;
  }

  deleteTransaction(transaction: Transaction) {
    if(!this.canEdit) return;
    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
      try {
        this.transactions = this.fundTransactionService.deleteTransaction(this.transactions, transaction.id);
        this.fundTransactionService.saveTransactions(this.transactions);
        this.logger.info('Deleted transaction', transaction);
        this.logger.success('Transactions saved after delete');
      } catch (err) {
        this.logger.error('Failed to delete transaction', err, transaction);
      }
      this.calculateSummary();
      this.filterTransactions();
    }
  }

  closeTransactionModal() {
    this.showAddTransaction = false;
    this.editingTransaction = null;
    this.transactionForm = {
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      description: ''
    };
  }

  getCategories() {
    return FUND_CATEGORIES;
  }

  trackTransaction(index: number, transaction: Transaction): string {
    return transaction.id;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(FUND_DATE_FORMAT, {
      style: 'currency',
      currency: FUND_CURRENCY,
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(FUND_DATE_FORMAT);
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}