import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { ReadonlyBannerComponent } from '../../shared/readonly-banner.component';
import { CanEditDirective } from '../../shared/can-edit.directive';
import { DisableUnlessCanEditDirective } from '../../shared/disable-unless-can-edit.directive';
import { PermissionService } from '../../core/services/permission.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { Subscription } from 'rxjs';

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
}

@Component({
  selector: 'app-fund-clean',
  standalone: true,
  imports: [CommonModule, FormsModule, ReadonlyBannerComponent, CanEditDirective, DisableUnlessCanEditDirective],
  template: `
    <div class="fund-container">
      <!-- Header -->
      <div class="fund-header">
        <div class="header-content">
          <div class="fund-icon">💰</div>
          <div class="fund-info">
            <h1>Quản lý Quỹ Đội Bóng</h1>
            <p>Theo dõi thu chi và tài chính đội bóng</p>
          </div>
        </div>
        <div class="balance-display">
          <div class="balance-label">Số dư hiện tại</div>
          <div class="balance-amount" [class]="fundSummary.currentBalance >= 0 ? 'positive' : 'negative'">
            {{formatCurrency(fundSummary.currentBalance)}}
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card income">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <div class="card-title">Tổng thu</div>
            <div class="card-amount">{{formatCurrency(fundSummary.grandTotalIncome)}}</div>
            <div class="card-detail">Từ {{matchCount}} trận + giao dịch</div>
          </div>
        </div>

        <div class="summary-card expense">
          <div class="card-icon">📉</div>
          <div class="card-content">
            <div class="card-title">Tổng chi</div>
            <div class="card-amount">{{formatCurrency(fundSummary.grandTotalExpenses)}}</div>
            <div class="card-detail">Chi tiêu đội bóng</div>
          </div>
        </div>

        <div class="summary-card transactions">
          <div class="card-icon">📝</div>
          <div class="card-content">
            <div class="card-title">Giao dịch</div>
            <div class="card-amount">{{fundSummary.transactionCount}}</div>
            <div class="card-detail">Tổng số giao dịch</div>
          </div>
        </div>
      </div>

      <!-- Add Transaction -->
  <div class="add-transaction-section" *appCanEdit>
        <button class="add-btn" (click)="showAddForm = !showAddForm">
          <span class="btn-icon">➕</span>
          Thêm giao dịch mới
        </button>
      </div>
  <app-readonly-banner [canEdit]="canEdit" />

      <!-- Transaction Form -->
  @if (showAddForm) {
        <div class="transaction-form">
          <h3>Thêm giao dịch mới</h3>
          <form (ngSubmit)="addTransaction()">
            <div class="form-row">
              <div class="form-group">
                <label for="tx-type">Loại giao dịch</label>
                <select id="tx-type" [(ngModel)]="newTransaction.type" name="type" required>
                  <option value="income">📈 Thu nhập</option>
                  <option value="expense">📉 Chi phí</option>
                </select>
              </div>
              <div class="form-group">
                <label for="tx-amount">Số tiền (VND)</label>
                <input id="tx-amount" type="number" [(ngModel)]="newTransaction.amount" name="amount" placeholder="0" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="tx-category">Danh mục</label>
                <input id="tx-category" type="text" [(ngModel)]="newTransaction.category" name="category" placeholder="Ví dụ: Thuê sân, Đóng góp...">
              </div>
              <div class="form-group">
                <label for="tx-desc">Mô tả</label>
                <input id="tx-desc" type="text" [(ngModel)]="newTransaction.description" name="description" placeholder="Mô tả chi tiết...">
              </div>
            </div>
            <div class="form-actions">
              <button type="button" (click)="showAddForm = false" class="btn-cancel">Hủy</button>
              <button type="submit" class="btn-save">Lưu giao dịch</button>
            </div>
          </form>
        </div>
      }

      <!-- Recent Transactions -->
      <div class="transactions-section">
        <h3>Lịch sử giao dịch gần đây</h3>
        @if (transactions.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h4>Chưa có giao dịch nào</h4>
            <p>Hãy thêm giao dịch đầu tiên để theo dõi tài chính</p>
          </div>
        } @else {
          <div class="transaction-list">
            @for (transaction of getRecentTransactions(); track transaction.id) {
              <div class="transaction-item" [class]="transaction.type">
                <div class="transaction-icon">
                  {{transaction.type === 'income' ? '📈' : '📉'}}
                </div>
                <div class="transaction-info">
                  <div class="transaction-desc">{{transaction.description || transaction.category}}</div>
                  <div class="transaction-meta">
                    <span class="transaction-date">{{formatDate(transaction.date)}}</span>
                    <span class="transaction-category">{{transaction.category}}</span>
                  </div>
                </div>
                <div class="transaction-amount" [class]="transaction.type">
                  {{transaction.type === 'income' ? '+' : '-'}}{{formatCurrency(Math.abs(transaction.amount))}}
                </div>
                <button class="delete-btn" *appCanEdit (click)="deleteTransaction(transaction)" title="Xóa">
                  🗑️
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .fund-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    /* Header */
    .fund-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .fund-icon {
      font-size: 3rem;
      background: rgba(255, 255, 255, 0.2);
      padding: 15px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
    }

    .fund-info h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .fund-info p {
      margin: 5px 0 0 0;
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .balance-display {
      text-align: right;
    }

    .balance-label {
      font-size: 0.9rem;
      opacity: 0.8;
      margin-bottom: 5px;
    }

    .balance-amount {
      font-size: 2.2rem;
      font-weight: 900;
      margin: 0;
    }

    .balance-amount.positive {
      color: #4ade80;
    }

    .balance-amount.negative {
      color: #f87171;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: white;
      border-radius: 16px;
      padding: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 2px solid #f3f4f6;
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
    }

    .summary-card.income::before {
      background: linear-gradient(90deg, #10b981, #34d399);
    }

    .summary-card.expense::before {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }

    .summary-card.transactions::before {
      background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    }

    .summary-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    }

    .card-icon {
      font-size: 2.5rem;
      margin-bottom: 15px;
    }

    .card-title {
      font-size: 0.9rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .card-amount {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .card-detail {
      font-size: 0.85rem;
      color: #6b7280;
    }

    /* Add Transaction */
    .add-transaction-section {
      text-align: center;
      margin-bottom: 30px;
    }

    .add-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 15px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .add-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
    }

    /* Transaction Form */
    .transaction-form {
      background: white;
      border-radius: 16px;
      padding: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 2px solid #f3f4f6;
      margin-bottom: 30px;
    }

    .transaction-form h3 {
      margin: 0 0 20px 0;
      color: #1f2937;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 600;
      color: #374151;
    }

    .form-group input,
    .form-group select {
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 15px;
      justify-content: flex-end;
    }

    .btn-cancel {
      padding: 12px 24px;
      border: 2px solid #e5e7eb;
      background: white;
      color: #6b7280;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-cancel:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }

    .btn-save {
      padding: 12px 24px;
      border: none;
      background: linear-gradient(135deg, #10b981, #34d399);
      color: white;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-save:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    /* Transactions */
    .transactions-section {
      background: white;
      border-radius: 16px;
      padding: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 2px solid #f3f4f6;
    }

    .transactions-section h3 {
      margin: 0 0 25px 0;
      color: #1f2937;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .empty-state h4 {
      color: #6b7280;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: #9ca3af;
    }

    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .transaction-item {
      display: flex;
      align-items: center;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      transition: all 0.3s ease;
    }

    .transaction-item:hover {
      background: #f3f4f6;
      border-color: #667eea;
    }

    .transaction-item.income {
      border-left: 4px solid #10b981;
    }

    .transaction-item.expense {
      border-left: 4px solid #ef4444;
    }

    .transaction-icon {
      font-size: 1.5rem;
      margin-right: 15px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: white;
    }

    .transaction-info {
      flex-grow: 1;
    }

    .transaction-desc {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .transaction-meta {
      display: flex;
      gap: 15px;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .transaction-amount {
      font-size: 1.2rem;
      font-weight: 700;
      margin-right: 15px;
    }

    .transaction-amount.income {
      color: #10b981;
    }

    .transaction-amount.expense {
      color: #ef4444;
    }

    .delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.3s ease;
    }

    .delete-btn:hover {
      background: #fee2e2;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .fund-container {
        padding: 15px;
      }

      .fund-header {
        flex-direction: column;
        text-align: center;
        gap: 20px;
      }

      .header-content {
        flex-direction: column;
      }

      .balance-display {
        text-align: center;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .fund-info h1 {
        font-size: 2rem;
      }
    }
  `]
})
export class FundCleanComponent implements OnInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  
  transactions: Transaction[] = [];
  matchHistory: HistoryEntry[] = [];
  matchCount = 0;
  showAddForm = false;
  
  newTransaction: Partial<Transaction> = {
    type: 'expense',
    amount: 0,
    category: '',
    description: ''
  };

  fundSummary: FundSummary = {
    currentBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
    matchTotalIncome: 0,
    matchTotalExpenses: 0,
    grandTotalIncome: 0,
    grandTotalExpenses: 0
  };

  private subscription?: Subscription;
  canEdit = false;
  private permission = inject(PermissionService);

  ngOnInit() {
    this.loadData();
    this.subscribeToMatchHistory();
    // Subscribe to permission changes
    this.permission.canEditChanges().subscribe(can => { this.canEdit = can; });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private loadData() {
    // Load transactions from localStorage
    const storedTransactions = localStorage.getItem('fund-transactions');
    if (storedTransactions) {
      this.transactions = JSON.parse(storedTransactions);
    }
    this.calculateSummary();
  }

  private subscribeToMatchHistory() {
    this.subscription = this.firebaseService.history$.subscribe((matchHistory: HistoryEntry[]) => {
      this.matchHistory = matchHistory;
      this.matchCount = matchHistory.length;
      this.calculateMatchHistoryBalance();
      this.calculateSummary();
    });
  }

  private calculateMatchHistoryBalance() {
    let totalIncome = 0;
    let totalExpenses = 0;

    this.matchHistory.forEach(match => {
      // Income from match fees (using thu for total income)
      totalIncome += match.thu || 0;
      
      // Expenses using correct property names
      totalExpenses += (match.chi_san || 0);        // Field rental cost
      totalExpenses += (match.chi_trongtai || 0);   // Referee cost
      totalExpenses += (match.chi_khac || 0);       // Other costs
      totalExpenses += (match.chi_nuoc || 0);       // Water costs
      totalExpenses += (match.chi_dilai || 0);      // Transportation costs
      totalExpenses += (match.chi_anuong || 0);     // Food/drink costs
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

    // Calculate grand totals (transactions + match history)
    this.fundSummary.grandTotalIncome = this.fundSummary.totalIncome + this.fundSummary.matchTotalIncome;
    this.fundSummary.grandTotalExpenses = this.fundSummary.totalExpenses + this.fundSummary.matchTotalExpenses;

    // Calculate current balance
    this.fundSummary.currentBalance = this.fundSummary.grandTotalIncome - this.fundSummary.grandTotalExpenses;
  }

  addTransaction() {
    if (!this.newTransaction.amount || this.newTransaction.amount <= 0) {
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: this.newTransaction.type || 'expense',
      category: this.newTransaction.category || '',
      description: this.newTransaction.description || '',
      amount: this.newTransaction.amount
    };

    this.transactions.unshift(transaction);
    this.saveTransactions();
    this.calculateSummary();
    
    // Reset form
    this.newTransaction = {
      type: 'expense',
      amount: 0,
      category: '',
      description: ''
    };
    this.showAddForm = false;
  }

  deleteTransaction(transaction: Transaction) {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      this.transactions = this.transactions.filter(t => t.id !== transaction.id);
      this.saveTransactions();
      this.calculateSummary();
    }
  }

  getRecentTransactions(): Transaction[] {
    return this.transactions.slice(0, 10);
  }

  private saveTransactions() {
    localStorage.setItem('fund-transactions', JSON.stringify(this.transactions));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }
}