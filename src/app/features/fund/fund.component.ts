import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
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
  imports: [CommonModule, FormsModule],
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
          <div class="header-actions">
            <button class="btn-primary" (click)="showAddTransaction = true">
              <span class="btn-icon">➕</span>
              Thêm giao dịch
            </button>
          </div>
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
          <button class="quick-action-btn income-action" (click)="quickAddIncome()">
            <span class="action-icon">💰</span>
            <span class="action-text">Thêm thu nhập</span>
          </button>
          <button class="quick-action-btn expense-action" (click)="quickAddExpense()">
            <span class="action-icon">💸</span>
            <span class="action-text">Thêm chi phí</span>
          </button>
          <button class="quick-action-btn report-action" (click)="generateReport()">
            <span class="action-icon">📋</span>
            <span class="action-text">Báo cáo</span>
          </button>
          <button class="quick-action-btn sync-action" (click)="syncWithMatches()">
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
              <button class="action-btn edit" (click)="editTransaction(transaction)" title="Chỉnh sửa">
                ✏️
              </button>
              <button class="action-btn delete" (click)="deleteTransaction(transaction)" title="Xóa">
                🗑️
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="filteredTransactions.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <h3 class="empty-title">Chưa có giao dịch nào</h3>
          <p class="empty-text">Bắt đầu bằng cách thêm giao dịch đầu tiên của bạn</p>
          <button class="btn-primary" (click)="showAddTransaction = true">
            <span class="btn-icon">➕</span>
            Thêm giao dịch đầu tiên
          </button>
        </div>
      </div>

      <!-- Add Transaction Modal -->
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
    </div>
  `,
  styles: [`
    /* Modern Dashboard Styles */
    .fund-dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Header Styles */
    .dashboard-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      background: white;
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1a365d;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .title-icon {
      font-size: 3rem;
    }

    .dashboard-subtitle {
      font-size: 1.1rem;
      color: #64748b;
      margin: 8px 0 0 0;
      font-weight: 400;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Summary Cards Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .summary-card {
      background: white;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }

    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }

    .balance-card.negative::before {
      background: linear-gradient(90deg, #ff6b6b 0%, #ee5a52 100%);
    }

    .income-card::before {
      background: linear-gradient(90deg, #51cf66 0%, #40c057 100%);
    }

    .expense-card::before {
      background: linear-gradient(90deg, #ff6b6b 0%, #fa5252 100%);
    }

    .activity-card::before {
      background: linear-gradient(90deg, #339af0 0%, #228be6 100%);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .card-icon {
      font-size: 1.5rem;
    }

    .card-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .main-value {
      font-size: 2.2rem;
      font-weight: 700;
      color: #1a365d;
      margin-bottom: 8px;
      line-height: 1.2;
    }

    .main-value.income {
      color: #51cf66;
    }

    .main-value.expense {
      color: #ff6b6b;
    }

    .main-value.activity {
      color: #339af0;
    }

    .card-subtitle {
      font-size: 0.9rem;
      color: #64748b;
    }

    .card-subtitle.positive {
      color: #51cf66;
    }

    .card-subtitle.negative {
      color: #ff6b6b;
    }

    .trend-icon {
      margin-right: 4px;
    }

    .breakdown {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .breakdown span {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* Quick Actions */
    .quick-actions-section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-icon {
      font-size: 1.3rem;
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .quick-action-btn {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      color: #1a365d;
    }

    .quick-action-btn:hover {
      border-color: #667eea;
      background: #f8faff;
      transform: translateY(-2px);
    }

    .action-icon {
      font-size: 1.8rem;
    }

    .action-text {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .income-action:hover {
      border-color: #51cf66;
      background: #f0fff4;
    }

    .expense-action:hover {
      border-color: #ff6b6b;
      background: #fff5f5;
    }

    .report-action:hover {
      border-color: #339af0;
      background: #f0f9ff;
    }

    .sync-action:hover {
      border-color: #845ef7;
      background: #faf5ff;
    }

    /* Transaction Section */
    .transaction-section {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      color: #1a365d;
      font-size: 0.9rem;
    }

    /* Transaction List */
    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .transaction-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      transition: all 0.2s ease;
    }

    .transaction-item:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .transaction-item.income {
      border-left: 4px solid #51cf66;
    }

    .transaction-item.expense {
      border-left: 4px solid #ff6b6b;
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
      margin-bottom: 4px;
    }

    .transaction-category {
      font-weight: 600;
      color: #1a365d;
      font-size: 0.9rem;
    }

    .transaction-date {
      font-size: 0.8rem;
      color: #64748b;
    }

    .transaction-description {
      color: #64748b;
      font-size: 0.9rem;
    }

    .transaction-amount {
      font-size: 1.1rem;
      font-weight: 700;
      text-align: right;
    }

    .transaction-amount.income {
      color: #51cf66;
    }

    .transaction-amount.expense {
      color: #ff6b6b;
    }

    .transaction-actions {
      display: flex;
      gap: 8px;
      margin-left: 16px;
    }

    .action-btn {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .action-btn:hover {
      background: #e2e8f0;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: #1a365d;
      margin-bottom: 8px;
    }

    .empty-text {
      margin-bottom: 24px;
    }

    /* Buttons */
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #1a365d;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
      transform: translateY(-1px);
    }

    .btn-icon {
      font-size: 0.9rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
      padding: 4px;
      border-radius: 4px;
    }

    .close-btn:hover {
      background: #f1f5f9;
      color: #1a365d;
    }

    /* Form Styles */
    .transaction-form {
      padding: 24px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-label {
      display: block;
      font-weight: 600;
      color: #1a365d;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .type-selector {
      display: flex;
      gap: 8px;
    }

    .type-btn {
      flex: 1;
      padding: 12px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .type-btn.active {
      border-color: #667eea;
      background: #f8faff;
      color: #667eea;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .fund-dashboard {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        padding: 24px;
      }

      .dashboard-title {
        font-size: 2rem;
      }

      .summary-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .quick-actions-grid {
        grid-template-columns: repeat(2, 1fr);
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
        gap: 8px;
      }

      .transaction-amount {
        text-align: left;
        font-size: 1.3rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .modal-content {
        margin: 10px;
      }
    }

    @media (max-width: 480px) {
      .quick-actions-grid {
        grid-template-columns: 1fr;
      }

      .transaction-actions {
        margin-left: 0;
        margin-top: 8px;
      }
    }
  `]
})
export class FundComponent implements OnInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  private fundTransactionService = inject(FundTransactionService);
  private logger = inject(LoggerService);
  private subscription?: Subscription;

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
    this.loadData();
    this.subscribeToMatchHistory();
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
    this.editingTransaction = transaction;
    this.transactionForm = { ...transaction };
    this.showAddTransaction = true;
  }

  deleteTransaction(transaction: Transaction) {
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