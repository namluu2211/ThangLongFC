import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  relatedTo?: string; // match ID or member name
}

interface FundSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  thisMonthIncome: number;
  thisMonthExpenses: number;
  transactionCount: number;
}

interface CategoryStats {
  category: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-fund',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid mt-3">
      <!-- Header Section -->
      <div class="fund-header mb-4">
        <div class="row align-items-center">
          <div class="col-12">
            <h2 class="fund-title mb-0">
              <i class="fas fa-wallet me-2"></i>
              💰 Quản lý Quỹ Đội Bóng
            </h2>
            <p class="text-muted mb-0">Theo dõi thu chi và tài chính đội bóng</p>
          </div>
        </div>
      </div>

      <!-- Summary Table -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="summary-table-card">
            <div class="summary-table-header">
              <h5 class="mb-0">
                <i class="fas fa-chart-bar me-2"></i>
                📊 Tổng quan tài chính
              </h5>
            </div>
            <div class="summary-table-body">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th class="metric-header">Chỉ số</th>
                    <th class="value-header">Giá trị</th>
                    <th class="detail-header">Chi tiết</th>
                    <th class="status-header">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="income-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon income">📈</div>
                        <div class="metric-name">Tổng thu</div>
                      </div>
                    </td>
                    <td class="value-cell income">
                      <div class="metric-value">{{formatCurrency(fundSummary.totalIncome)}}</div>
                    </td>
                    <td class="detail-cell">
                      <div class="metric-detail" *ngIf="fundSummary.thisMonthIncome > 0">
                        <i class="fas fa-arrow-up text-success"></i>
                        +{{formatCurrency(fundSummary.thisMonthIncome)}} tháng này
                      </div>
                      <div class="metric-detail" *ngIf="fundSummary.thisMonthIncome === 0">
                        <i class="fas fa-minus text-muted"></i>
                        Chưa có thu nhập tháng này
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge income">Tích cực</span>
                    </td>
                  </tr>
                  <tr class="expense-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon expense">📉</div>
                        <div class="metric-name">Tổng chi</div>
                      </div>
                    </td>
                    <td class="value-cell expense">
                      <div class="metric-value">{{formatCurrency(fundSummary.totalExpenses)}}</div>
                    </td>
                    <td class="detail-cell">
                      <div class="metric-detail" *ngIf="fundSummary.thisMonthExpenses > 0">
                        <i class="fas fa-arrow-down text-danger"></i>
                        -{{formatCurrency(fundSummary.thisMonthExpenses)}} tháng này
                      </div>
                      <div class="metric-detail" *ngIf="fundSummary.thisMonthExpenses === 0">
                        <i class="fas fa-check text-success"></i>
                        Chưa có chi tiêu tháng này
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge expense">Chi tiêu</span>
                    </td>
                  </tr>
                  <tr class="transaction-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon transaction">📝</div>
                        <div class="metric-name">Giao dịch</div>
                      </div>
                    </td>
                    <td class="value-cell transaction">
                      <div class="metric-value">{{fundSummary.transactionCount}}</div>
                    </td>
                    <td class="detail-cell">
                      <div class="metric-detail">
                        <i class="fas fa-calendar-alt text-info"></i>
                        Tổng số lần giao dịch
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge transaction">Hoạt động</span>
                    </td>
                  </tr>
                  <tr class="profit-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon profit">⚖️</div>
                        <div class="metric-name">Lợi nhuận</div>
                      </div>
                    </td>
                    <td class="value-cell profit" [class.negative]="(fundSummary.totalIncome - fundSummary.totalExpenses) < 0">
                      <div class="metric-value">{{formatCurrency(fundSummary.totalIncome - fundSummary.totalExpenses)}}</div>
                    </td>
                    <td class="detail-cell">
                      <div class="metric-detail">
                        <i class="fas fa-calculator text-primary"></i>
                        Thu - Chi
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge" 
                            [class.profit]="(fundSummary.totalIncome - fundSummary.totalExpenses) >= 0"
                            [class.loss]="(fundSummary.totalIncome - fundSummary.totalExpenses) < 0">
                        {{(fundSummary.totalIncome - fundSummary.totalExpenses) >= 0 ? 'Lãi' : 'Lỗ'}}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions & Filters -->
      <div class="row mb-4">
        <div class="col-lg-8">
          <div class="action-card">
            <div class="action-header">
              <h5 class="mb-0">
                <i class="fas fa-plus-circle me-2"></i>
                ⚡ Thêm giao dịch nhanh
              </h5>
            </div>
            <div class="action-body">
              <form (ngSubmit)="addTransaction()" #transactionForm="ngForm">
                <div class="row g-3">
                  <div class="col-md-2">
                    <label class="form-label fw-semibold" for="transaction-type">Loại</label>
                    <select id="transaction-type" class="form-select modern-select" [(ngModel)]="newTransaction.type" name="type" required>
                      <option value="income">📈 Thu</option>
                      <option value="expense">📉 Chi</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-semibold" for="transaction-category">Danh mục</label>
                    <select id="transaction-category" class="form-select modern-select" [(ngModel)]="newTransaction.category" name="category" required>
                      <option value="">-- Chọn danh mục --</option>
                      <optgroup label="Thu nhập" *ngIf="newTransaction.type === 'income'">
                        <option value="Đóng góp thành viên">💳 Đóng góp thành viên</option>
                        <option value="Tiền thưởng">🏆 Tiền thưởng</option>
                        <option value="Tài trợ">🤝 Tài trợ</option>
                        <option value="Bán đồ">🛍️ Bán đồ</option>
                        <option value="Thu khác">💰 Thu khác</option>
                      </optgroup>
                      <optgroup label="Chi tiêu" *ngIf="newTransaction.type === 'expense'">
                        <option value="Đồ uống">🥤 Đồ uống</option>
                        <option value="Thuê sân">⚽ Thuê sân</option>
                        <option value="Trang phục">👕 Trang phục</option>
                        <option value="Thiết bị">🥅 Thiết bị</option>
                        <option value="Ăn uống">🍜 Ăn uống</option>
                        <option value="Y tế">🏥 Y tế</option>
                        <option value="Chi khác">💸 Chi khác</option>
                      </optgroup>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label fw-semibold" for="transaction-amount">Số tiền</label>
                    <input id="transaction-amount" type="number" class="form-control modern-input" [(ngModel)]="newTransaction.amount" 
                           name="amount" placeholder="0" min="0" required>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-semibold" for="transaction-description">Mô tả</label>
                    <input id="transaction-description" type="text" class="form-control modern-input" [(ngModel)]="newTransaction.description" 
                           name="description" placeholder="Mô tả chi tiết...">
                  </div>
                  <div class="col-md-2 d-flex align-items-end">
                    <button type="submit" class="btn btn-primary w-100 modern-btn" [disabled]="!transactionForm.form.valid">
                      <i class="fas fa-plus me-1"></i>
                      Thêm
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="filter-card">
            <div class="filter-header">
              <div class="filter-title">
                <i class="fas fa-filter filter-icon"></i>
                <span>🔍 Bộ lọc</span>
              </div>
            </div>
            <div class="filter-body">
              <div class="filter-section">
                <label class="filter-label" for="filter-type">Loại giao dịch</label>
                <div class="custom-select-wrapper">
                  <select id="filter-type" class="custom-select" [(ngModel)]="filter.type" (change)="applyFilters()">
                    <option value="">Tất cả</option>
                    <option value="income">📈 Thu nhập</option>
                    <option value="expense">📉 Chi tiêu</option>
                  </select>
                  <i class="fas fa-chevron-down select-arrow"></i>
                </div>
              </div>
              
              <div class="filter-section">
                <label class="filter-label" for="filter-period">Thời gian</label>
                <div class="custom-select-wrapper">
                  <select id="filter-period" class="custom-select" [(ngModel)]="filter.period" (change)="applyFilters()">
                    <option value="all">Tất cả</option>
                    <option value="today">📅 Hôm nay</option>
                    <option value="week">📊 Tuần này</option>
                    <option value="month">🗓️ Tháng này</option>
                  </select>
                  <i class="fas fa-chevron-down select-arrow"></i>
                </div>
              </div>
              
              <div class="filter-section">
                <label class="filter-label" for="filter-search">Tìm kiếm</label>
                <div class="search-input-wrapper">
                  <i class="fas fa-search search-icon"></i>
                  <input id="filter-search" type="text" class="search-input" [(ngModel)]="filter.search" 
                         (input)="applyFilters()" placeholder="Tìm theo mô tả...">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Statistics -->
      <div class="row mb-4" *ngIf="categoryStats.length > 0">
        <div class="col-12">
          <div class="stats-card">
            <div class="stats-header">
              <h5 class="mb-0">
                <i class="fas fa-chart-pie me-2"></i>
                📊 Phân tích theo danh mục
              </h5>
            </div>
            <div class="stats-body">
              <div class="row">
                <div class="col-lg-8">
                  <div class="category-list">
                    <div *ngFor="let stat of categoryStats" class="category-item">
                      <div class="category-info">
                        <div class="category-name">{{stat.category}}</div>
                        <div class="category-details">
                          {{stat.transactionCount}} giao dịch • {{stat.percentage.toFixed(1)}}%
                        </div>
                      </div>
                      <div class="category-amount">{{formatCurrency(stat.totalAmount)}}</div>
                      <div class="category-bar">
                        <div class="progress-fill" [style.width.%]="stat.percentage" [style.background-color]="stat.color"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-lg-4">
                  <div class="quick-stats">
                    <div class="quick-stat-item">
                      <div class="quick-stat-icon income">📈</div>
                      <div class="quick-stat-content">
                        <div class="quick-stat-value">{{getIncomeCategories().length}}</div>
                        <div class="quick-stat-label">Danh mục thu</div>
                      </div>
                    </div>
                    <div class="quick-stat-item">
                      <div class="quick-stat-icon expense">📉</div>
                      <div class="quick-stat-content">
                        <div class="quick-stat-value">{{getExpenseCategories().length}}</div>
                        <div class="quick-stat-label">Danh mục chi</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="transactions-card">
        <div class="transactions-header">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="fas fa-history me-2"></i>
              📋 Lịch sử giao dịch
            </h5>
            <div class="header-actions">
              <button class="btn btn-outline-primary btn-sm me-2" (click)="exportTransactions()">
                <i class="fas fa-download me-1"></i>
                Xuất Excel
              </button>
              <button class="btn btn-outline-danger btn-sm" (click)="showResetModal = true">
                <i class="fas fa-trash-alt me-1"></i>
                Reset Quỹ
              </button>
            </div>
          </div>
        </div>
        <div class="transactions-body">
          <div class="table-responsive" *ngIf="filteredTransactions.length > 0; else noTransactions">
            <table class="modern-transaction-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Loại</th>
                  <th>Danh mục</th>
                  <th>Mô tả</th>
                  <th>Số tiền</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let transaction of paginatedTransactions; let i = index" 
                    class="transaction-row" [class.income-row]="transaction.type === 'income'" 
                    [class.expense-row]="transaction.type === 'expense'">
                  <td class="date-cell">
                    <div class="transaction-date">
                      <div class="date-main">{{formatDate(transaction.date)}}</div>
                      <div class="date-time">{{formatTime(transaction.date)}}</div>
                    </div>
                  </td>
                  <td class="type-cell">
                    <div class="transaction-type" [class.income]="transaction.type === 'income'" 
                         [class.expense]="transaction.type === 'expense'">
                      <i [class]="transaction.type === 'income' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                      {{transaction.type === 'income' ? 'Thu' : 'Chi'}}
                    </div>
                  </td>
                  <td class="category-cell">
                    <div class="transaction-category">{{transaction.category}}</div>
                  </td>
                  <td class="description-cell">
                    <div class="transaction-description" [title]="transaction.description">
                      {{transaction.description || 'Không có mô tả'}}
                    </div>
                  </td>
                  <td class="amount-cell">
                    <div class="transaction-amount" [class.income]="transaction.type === 'income'" 
                         [class.expense]="transaction.type === 'expense'">
                      {{transaction.type === 'income' ? '+' : '-'}}{{formatCurrency(transaction.amount)}}
                    </div>
                  </td>
                  <td class="action-cell">
                    <button class="btn btn-sm btn-outline-danger" (click)="deleteTransaction(transaction.id)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="pagination-controls" *ngIf="totalPages > 1">
            <button class="btn btn-sm btn-outline-primary" (click)="previousPage()" [disabled]="currentPage === 1">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span class="pagination-info">
              Trang {{currentPage}} / {{totalPages}} ({{filteredTransactions.length}} giao dịch)
            </span>
            <button class="btn btn-sm btn-outline-primary" (click)="nextPage()" [disabled]="currentPage === totalPages">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>

          <!-- No Transactions -->
          <ng-template #noTransactions>
            <div class="no-transactions">
              <div class="no-transactions-icon">💳</div>
              <div class="no-transactions-title">Chưa có giao dịch nào</div>
              <div class="no-transactions-text">
                Hãy thêm giao dịch đầu tiên để bắt đầu quản lý quỹ đội bóng!
              </div>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Reset Modal -->
      <div class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" *ngIf="showResetModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                ⚠️ Xác nhận Reset Quỹ
              </h5>
            </div>
            <div class="modal-body">
              <p class="mb-3">Bạn có chắc chắn muốn reset toàn bộ quỹ đội bóng?</p>
              <div class="alert alert-warning">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Thao tác này sẽ:</strong>
                <ul class="mb-0 mt-2">
                  <li>Xóa tất cả lịch sử giao dịch</li>
                  <li>Đặt số dư về 0 VND</li>
                  <li>Không thể hoàn tác</li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showResetModal = false">
                <i class="fas fa-times me-1"></i>
                Hủy
              </button>
              <button type="button" class="btn btn-danger" (click)="resetFund()">
                <i class="fas fa-trash-alt me-1"></i>
                Xác nhận Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container-fluid {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header Styles */
    .fund-header {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      border-radius: 20px;
      padding: 2rem;
      color: white;
      box-shadow: 0 10px 30px rgba(39, 174, 96, 0.3);
    }

    .fund-title {
      font-size: 2.2rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .balance-display {
      text-align: center;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 1.5rem;
    }

    .balance-label {
      font-size: 0.9rem;
      opacity: 0.9;
      margin-bottom: 0.5rem;
    }

    .balance-amount {
      font-size: 2rem;
      font-weight: 800;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .balance-amount.negative {
      color: #ff6b6b;
    }

    /* Summary Table */
    .summary-table-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .summary-table-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem 2rem;
    }

    .summary-table-body {
      padding: 0;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }

    .summary-table thead th {
      background: #f8f9fa;
      padding: 1.25rem 1.5rem;
      font-weight: 700;
      color: #2c3e50;
      text-align: left;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e9ecef;
    }

    .metric-header {
      width: 25%;
    }

    .value-header {
      width: 25%;
    }

    .detail-header {
      width: 30%;
    }

    .status-header {
      width: 20%;
    }

    .summary-table tbody tr {
      transition: all 0.3s ease;
      border-bottom: 1px solid #f1f3f4;
    }

    .summary-table tbody tr:hover {
      background: linear-gradient(135deg, #f8fcff 0%, #f0f8ff 100%);
      transform: translateX(5px);
    }

    .income-row {
      border-left: 4px solid #27ae60;
    }

    .expense-row {
      border-left: 4px solid #e74c3c;
    }

    .transaction-row {
      border-left: 4px solid #3498db;
    }

    .profit-row {
      border-left: 4px solid #f39c12;
    }

    .summary-table td {
      padding: 1.5rem;
      vertical-align: middle;
    }

    .metric-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .metric-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      font-weight: 600;
    }

    .metric-icon.income {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .metric-icon.expense {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .metric-icon.transaction {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .metric-icon.profit {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .metric-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #2c3e50;
    }

    .value-cell.income .metric-value {
      color: #27ae60;
    }

    .value-cell.expense .metric-value {
      color: #e74c3c;
    }

    .value-cell.transaction .metric-value {
      color: #3498db;
    }

    .value-cell.profit .metric-value {
      color: #f39c12;
    }

    .value-cell.profit.negative .metric-value {
      color: #e74c3c;
    }

    .metric-detail {
      font-size: 0.9rem;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
      color: white;
    }

    .status-badge.income {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .status-badge.expense {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .status-badge.transaction {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .status-badge.profit {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .status-badge.loss {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    /* Action Card */
    .action-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .action-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem 2rem;
    }

    .action-body {
      padding: 2rem;
    }

    .modern-select,
    .modern-input {
      border-radius: 12px;
      border: 2px solid #e9ecef;
      padding: 0.75rem 1rem;
      transition: all 0.3s ease;
    }

    .modern-select:focus,
    .modern-input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.15);
    }

    .modern-btn {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      border: none;
      border-radius: 12px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .modern-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(39, 174, 96, 0.3);
    }

    /* Filter Card */
    .filter-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.12);
      overflow: hidden;
      height: fit-content;
      border: 1px solid #e3f2fd;
    }

    .filter-header {
      background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%);
      padding: 1.25rem 1.5rem;
      color: white;
    }

    .filter-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .filter-icon {
      font-size: 1rem;
      opacity: 0.9;
    }

    .filter-body {
      padding: 1.5rem;
      background: #fafbfc;
    }

    .filter-section {
      margin-bottom: 1.25rem;
    }

    .filter-section:last-child {
      margin-bottom: 0;
    }

    .filter-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #37474f;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Custom Select Styling */
    .custom-select-wrapper {
      position: relative;
    }

    .custom-select {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 2px solid #e1f5fe;
      border-radius: 12px;
      background: white;
      font-size: 0.9rem;
      font-weight: 500;
      color: #37474f;
      transition: all 0.3s ease;
      appearance: none;
      cursor: pointer;
    }

    .custom-select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 0.15rem rgba(25, 118, 210, 0.15);
      background: #fafbfc;
    }

    .custom-select:hover {
      border-color: #42a5f5;
      background: #f8fcff;
    }

    .select-arrow {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #78909c;
      font-size: 0.8rem;
      pointer-events: none;
      transition: all 0.3s ease;
    }

    .custom-select:focus + .select-arrow {
      color: #1976d2;
      transform: translateY(-50%) rotate(180deg);
    }

    /* Search Input Styling */
    .search-input-wrapper {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.75rem;
      border: 2px solid #e1f5fe;
      border-radius: 12px;
      background: white;
      font-size: 0.9rem;
      color: #37474f;
      transition: all 0.3s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 0.15rem rgba(25, 118, 210, 0.15);
      background: #fafbfc;
    }

    .search-input:hover {
      border-color: #42a5f5;
      background: #f8fcff;
    }

    .search-input::placeholder {
      color: #90a4ae;
      font-style: italic;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #78909c;
      font-size: 0.85rem;
      pointer-events: none;
    }

    .search-input:focus ~ .search-icon {
      color: #1976d2;
    }

    /* Stats Card */
    .stats-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .stats-header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 1.5rem 2rem;
    }

    .stats-body {
      padding: 2rem;
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .category-item {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }

    .category-info {
      margin-bottom: 0.5rem;
    }

    .category-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1rem;
    }

    .category-details {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .category-amount {
      position: absolute;
      right: 1rem;
      top: 1rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .category-bar {
      height: 6px;
      background: #e9ecef;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 1s ease-in-out;
    }

    .quick-stats {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-left: 2rem;
    }

    .quick-stat-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1rem;
    }

    .quick-stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .quick-stat-icon.income {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
    }

    .quick-stat-icon.expense {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }

    .quick-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .quick-stat-label {
      font-size: 0.9rem;
      color: #7f8c8d;
    }

    /* Transaction Table */
    .transactions-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .transactions-header {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 1.5rem 2rem;
    }

    .transactions-body {
      padding: 0;
    }

    .modern-transaction-table {
      width: 100%;
      border-collapse: collapse;
    }

    .modern-transaction-table thead th {
      background: #f8f9fa;
      padding: 1rem;
      font-weight: 600;
      color: #495057;
      text-align: left;
      border-bottom: 2px solid #e9ecef;
    }

    .transaction-row {
      transition: all 0.3s ease;
      border-bottom: 1px solid #f1f3f4;
    }

    .transaction-row:hover {
      background: #f8f9ff;
    }

    .transaction-row.income-row {
      border-left: 4px solid #27ae60;
    }

    .transaction-row.expense-row {
      border-left: 4px solid #e74c3c;
    }

    .modern-transaction-table td {
      padding: 1rem;
      vertical-align: middle;
    }

    .transaction-date {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .date-main {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .date-time {
      font-size: 0.75rem;
      color: #7f8c8d;
    }

    .transaction-type {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .transaction-type.income {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .transaction-type.expense {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .transaction-category {
      font-weight: 500;
      color: #495057;
    }

    .transaction-description {
      color: #6c757d;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .transaction-amount {
      font-weight: 700;
      font-size: 1rem;
    }

    .transaction-amount.income {
      color: #27ae60;
    }

    .transaction-amount.expense {
      color: #e74c3c;
    }

    /* Pagination */
    .pagination-controls {
      padding: 1.5rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .pagination-info {
      font-size: 0.9rem;
      color: #6c757d;
      flex: 1;
      text-align: center;
    }

    /* No Transactions */
    .no-transactions {
      text-align: center;
      padding: 4rem 2rem;
      color: #6c757d;
    }

    .no-transactions-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-transactions-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #495057;
      margin-bottom: 1rem;
    }

    .no-transactions-text {
      font-size: 1rem;
    }

    /* Header Actions */
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* Modal Styles */
    .modal {
      z-index: 1050;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .fund-title {
        font-size: 1.5rem;
      }

      .balance-amount {
        font-size: 1.5rem;
      }

      .summary-card {
        padding: 1.5rem;
        height: auto;
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .summary-icon {
        font-size: 2rem;
        width: 60px;
        height: 60px;
      }

      .action-header,
      .action-body,
      .transactions-header {
        padding: 1rem;
      }

      .quick-stats {
        padding-left: 0;
        margin-top: 2rem;
      }

      .modern-transaction-table {
        font-size: 0.8rem;
      }

      .modern-transaction-table td {
        padding: 0.5rem;
      }

      .transaction-description {
        max-width: 120px;
      }

      .header-actions {
        flex-direction: column;
      }
    }
  `]
})
export class FundComponent implements OnInit {
  // Transaction Management
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  
  // UI State
  showResetModal = false;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // Forms
  newTransaction: Partial<Transaction> = {
    type: 'expense',
    category: '',
    description: '',
    amount: 0
  };
  
  filter = {
    type: '',
    period: 'all',
    search: ''
  };
  
  // Computed Data
  fundSummary: FundSummary = {
    currentBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    thisMonthIncome: 0,
    thisMonthExpenses: 0,
    transactionCount: 0
  };
  
  categoryStats: CategoryStats[] = [];

  ngOnInit() {
    this.loadTransactions();
    this.calculateSummary();
    this.applyFilters();
  }

  private loadTransactions() {
    const stored = localStorage.getItem('fundTransactions');
    this.transactions = stored ? JSON.parse(stored) : [];
  }

  private saveTransactions() {
    localStorage.setItem('fundTransactions', JSON.stringify(this.transactions));
  }

  addTransaction() {
    if (!this.newTransaction.category || !this.newTransaction.amount) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: this.newTransaction.type!,
      category: this.newTransaction.category,
      description: this.newTransaction.description || '',
      amount: this.newTransaction.amount
    };

    this.transactions.unshift(transaction);
    this.saveTransactions();
    
    // Update fund balance in localStorage for compatibility
    this.updateFundBalance();
    
    // Reset form
    this.newTransaction = {
      type: 'expense',
      category: '',
      description: '',
      amount: 0
    };
    
    this.calculateSummary();
    this.applyFilters();
  }

  deleteTransaction(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      this.transactions = this.transactions.filter(t => t.id !== id);
      this.saveTransactions();
      this.updateFundBalance();
      this.calculateSummary();
      this.applyFilters();
    }
  }

  private updateFundBalance() {
    const balance = this.transactions.reduce((sum, t) => {
      return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);
    localStorage.setItem('fund', balance.toString());
    // Also update CURRENT_FUND for backward compatibility
    localStorage.setItem('CURRENT_FUND', balance.toString());
  }

  private calculateSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    this.fundSummary = {
      currentBalance: 0,
      totalIncome: 0,
      totalExpenses: 0,
      thisMonthIncome: 0,
      thisMonthExpenses: 0,
      transactionCount: this.transactions.length
    };

    for (const transaction of this.transactions) {
      const transactionDate = new Date(transaction.date);
      
      if (transaction.type === 'income') {
        this.fundSummary.totalIncome += transaction.amount;
        this.fundSummary.currentBalance += transaction.amount;
        
        if (transactionDate >= startOfMonth) {
          this.fundSummary.thisMonthIncome += transaction.amount;
        }
      } else {
        this.fundSummary.totalExpenses += transaction.amount;
        this.fundSummary.currentBalance -= transaction.amount;
        
        if (transactionDate >= startOfMonth) {
          this.fundSummary.thisMonthExpenses += transaction.amount;
        }
      }
    }

    this.calculateCategoryStats();
  }

  private calculateCategoryStats() {
    const categories: Record<string, { amount: number; count: number; type: string }> = {};
    
    for (const transaction of this.transactions) {
      if (!categories[transaction.category]) {
        categories[transaction.category] = { amount: 0, count: 0, type: transaction.type };
      }
      categories[transaction.category].amount += transaction.amount;
      categories[transaction.category].count++;
    }

    const totalAmount = Object.values(categories).reduce((sum, cat) => sum + cat.amount, 0);
    
    this.categoryStats = Object.entries(categories)
      .map(([category, data]) => ({
        category,
        totalAmount: data.amount,
        transactionCount: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        color: this.getCategoryColor(category, data.type)
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8); // Top 8 categories
  }

  private getCategoryColor(category: string, type: string): string {
    const incomeColors = ['#27ae60', '#2ecc71', '#16a085', '#1abc9c', '#f39c12', '#e67e22'];
    const expenseColors = ['#e74c3c', '#c0392b', '#8e44ad', '#9b59b6', '#34495e', '#2c3e50'];
    
    const colors = type === 'income' ? incomeColors : expenseColors;
    const index = category.length % colors.length;
    return colors[index];
  }

  applyFilters() {
    let filtered = [...this.transactions];

    // Filter by type
    if (this.filter.type) {
      filtered = filtered.filter(t => t.type === this.filter.type);
    }

    // Filter by period
    if (this.filter.period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (this.filter.period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    // Filter by search
    if (this.filter.search) {
      const search = this.filter.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search)
      );
    }

    this.filteredTransactions = filtered;
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }

  private updatePagination() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedTransactions = this.filteredTransactions.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  resetFund() {
    this.transactions = [];
    this.saveTransactions();
    localStorage.setItem('fund', '0');
    localStorage.setItem('CURRENT_FUND', '0');
    this.showResetModal = false;
    
    this.calculateSummary();
    this.applyFilters();
  }

  exportTransactions() {
    if (this.transactions.length === 0) {
      alert('Không có giao dịch nào để xuất!');
      return;
    }

    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fund-transactions-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private generateCSV(): string {
    const headers = ['Ngày', 'Loại', 'Danh mục', 'Mô tả', 'Số tiền'];
    const rows = this.transactions.map(t => [
      this.formatDate(t.date),
      t.type === 'income' ? 'Thu' : 'Chi',
      t.category,
      t.description || 'Không có mô tả',
      t.amount.toString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getIncomeCategories(): CategoryStats[] {
    return this.categoryStats.filter(stat => 
      this.transactions.find(t => t.category === stat.category)?.type === 'income'
    );
  }

  getExpenseCategories(): CategoryStats[] {
    return this.categoryStats.filter(stat => 
      this.transactions.find(t => t.category === stat.category)?.type === 'expense'
    );
  }

  // Legacy method for backward compatibility
  getCurrentFund(): number {
    return this.fundSummary.currentBalance;
  }

  // Legacy method for backward compatibility
  reset(): void {
    this.resetFund();
  }
}
