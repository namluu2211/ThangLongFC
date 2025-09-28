import { Component, OnInit, Input, inject, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

import { take, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { MatchData, Player, AuthUser, CardType, FINANCIAL_RATES } from '../../models/types';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modern-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <h2 class="page-title">
            <i class="fas fa-history me-2"></i>
            📜 Lịch sử trận đấu
          </h2>
          <p class="page-subtitle">Xem lại các trận đấu đã qua và quản lý tài chính</p>
          <div class="header-badges">
            <div class="stats-badge" *ngIf="history.length">
              <span class="badge bg-primary fs-6 px-3 py-2">
                <i class="fas fa-calendar-alt me-1"></i>
                {{history.length}} trận đấu
              </span>
            </div>
            <div class="edit-status-badge">
              <span class="badge px-3 py-2" 
                    [class.bg-success]="isAdmin()" 
                    [class.bg-secondary]="!isAdmin()">
                <i [class]="isAdmin() ? 'fas fa-edit' : 'fas fa-save'" class="me-1"></i>
                {{isAdmin() ? 'Có thể chỉnh sửa & lưu' : 'Chỉ xem'}}
              </span>
            </div>
            
            <!-- Admin Firebase Actions -->
            <div class="admin-firebase-actions" *ngIf="isAdmin()">
              <button 
                class="btn btn-sm btn-primary me-2" 
                (click)="syncAllToFirebase()"
                [disabled]="saveStatus.get('sync') === 'saving'"
                title="Đồng bộ toàn bộ dữ liệu lên Firebase">
                <i [class]="saveStatus.get('sync') === 'saving' ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'" class="me-1"></i>
                {{saveStatus.get('sync') === 'saving' ? 'Đang đồng bộ...' : 'Sync'}}
              </button>
              
              <button 
                class="btn btn-sm btn-success" 
                (click)="exportAllData()"
                title="Xuất toàn bộ dữ liệu ra file JSON">
                <i class="fas fa-download me-1"></i>
                Xuất dữ liệu
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Summary Section -->
      <div class="financial-summary-card" *ngIf="history.length">
        <div class="summary-header">
          <h3>
            <i class="fas fa-chart-line me-2"></i>
            Tổng quan tài chính
          </h3>
          <button 
            class="toggle-summary-btn"
            (click)="toggleSummaryDetails()"
            [title]="showSummaryDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'">
            <i [class]="showSummaryDetails ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
          </button>
        </div>
        
        <div class="summary-grid">
          <div class="summary-item total-revenue">
            <div class="summary-icon">
              <i class="fas fa-coins"></i>
            </div>
            <div class="summary-content">
              <div class="summary-label">Tổng thu</div>
              <div class="summary-value">{{formatCurrency(getTotalRevenue())}}</div>
            </div>
          </div>
          
          <div class="summary-item total-expenses">
            <div class="summary-icon">
              <i class="fas fa-receipt"></i>
            </div>
            <div class="summary-content">
              <div class="summary-label">Tổng chi</div>
              <div class="summary-value">{{formatCurrency(getTotalExpenses())}}</div>
            </div>
          </div>
          
          <div class="summary-item net-profit" 
               [class.profit]="getNetProfit() > 0" 
               [class.loss]="getNetProfit() < 0">
            <div class="summary-icon">
              <i class="fas fa-balance-scale"></i>
            </div>
            <div class="summary-content">
              <div class="summary-label">Lãi/Lỗ ròng</div>
              <div class="summary-value">{{formatCurrency(getNetProfit())}}</div>
            </div>
          </div>
          
          <div class="summary-item avg-per-match">
            <div class="summary-icon">
              <i class="fas fa-calculator"></i>
            </div>
            <div class="summary-content">
              <div class="summary-label">TB/trận</div>
              <div class="summary-value">{{formatCurrency(getAveragePerMatch())}}</div>
            </div>
          </div>
        </div>

        <!-- Detailed financial breakdown -->
        <div class="summary-details" *ngIf="showSummaryDetails">
          <div class="details-grid">
            <!-- Revenue breakdown -->
            <div class="detail-section">
              <h4>
                <i class="fas fa-arrow-up me-1"></i>
                Chi tiết thu nhập
              </h4>
              <div class="detail-items">
                <div class="detail-item">
                  <span class="detail-label">Thu từ đội thắng:</span>
                  <span class="detail-value">{{formatCurrency(getWinnerRevenue())}}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Thu từ đội thua:</span>
                  <span class="detail-value">{{formatCurrency(getLoserRevenue())}}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Thu từ thẻ phạt:</span>
                  <span class="detail-value">{{formatCurrency(getPenaltyRevenue())}}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Thu khác:</span>
                  <span class="detail-value">{{formatCurrency(getOtherRevenue())}}</span>
                </div>
              </div>
            </div>

            <!-- Expense breakdown -->
            <div class="detail-section">
              <h4>
                <i class="fas fa-arrow-down me-1"></i>
                Chi tiết chi phí
              </h4>
              <div class="detail-items">
                <div class="detail-item">
                  <span class="detail-label">Chi phí sân:</span>
                  <span class="detail-value">{{formatCurrency(getFieldExpenses())}}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Chi phí trọng tài:</span>
                  <span class="detail-value">{{formatCurrency(getRefereeExpenses())}}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Chi phí nước:</span>
                  <span class="detail-value">{{formatCurrency(getWaterExpenses())}}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Chi phí khác:</span>
                  <span class="detail-value">{{formatCurrency(getOtherExpenses())}}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Financial timeline -->
          <div class="financial-timeline">
            <h4>
              <i class="fas fa-chart-area me-1"></i>
              Diễn biến tài chính theo trận
            </h4>
            <div class="timeline-chart">
              <div class="timeline-item" *ngFor="let m of history; let i = index; trackBy: trackByMatch">
                <div class="timeline-match">
                  <div class="match-number">{{i + 1}}</div>
                  <div class="match-date-short">{{formatShortDate(m.date)}}</div>
                </div>
                <div class="timeline-finances">
                  <div class="timeline-bar revenue" [style.height.%]="getRevenuePercentage(m)">
                    <span class="bar-label">{{formatShortCurrency(m.thu || 0)}}</span>
                  </div>
                  <div class="timeline-bar expense" [style.height.%]="getExpensePercentage(m)">
                    <span class="bar-label">{{formatShortCurrency(calcChi(m))}}</span>
                  </div>
                  <div class="timeline-profit" [class.positive]="(m.thu || 0) - calcChi(m) > 0" [class.negative]="(m.thu || 0) - calcChi(m) < 0">
                    {{formatShortCurrency((m.thu || 0) - calcChi(m))}}
                  </div>
                </div>
              </div>
            </div>
            <div class="timeline-legend">
              <div class="legend-item">
                <div class="legend-color revenue"></div>
                <span>Thu</span>
              </div>
              <div class="legend-item">
                <div class="legend-color expense"></div>
                <span>Chi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- History Content -->
      <div *ngIf="history.length; else noHistory" class="history-content">
        <div *ngFor="let m of history; let i = index; trackBy: trackByMatch" class="match-card">
          <!-- Match Header -->
          <div class="match-header">
            <div class="match-date">
              <i class="fas fa-calendar me-2"></i>
              <span>{{formatDate(m.date)}}</span>
            </div>
            <div class="match-actions" *ngIf="isAdmin()">
              <button 
                class="edit-btn"
                (click)="toggleEditMode(m)" 
                [disabled]="!canEdit"
                [title]="isEditing(m) ? 'Hủy chỉnh sửa' : 'Chỉnh sửa trận đấu'">
                <i [class]="isEditing(m) ? 'fas fa-times' : 'fas fa-edit'"></i>
              </button>
              <button 
                class="delete-btn"
                (click)="confirmDelete(m)" 
                [disabled]="!canEdit"
                title="Xóa trận đấu">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- Score Section -->
          <div class="score-section" *ngIf="!isEditing(m)">
            <div class="team-score team-a">
              <div class="team-label">Đội Xanh</div>
              <div class="score">{{m.scoreA || 0}}</div>
            </div>
            <div class="vs-separator">
              <span>VS</span>
            </div>
            <div class="team-score team-b">
              <div class="team-label">Đội Cam</div>
              <div class="score">{{m.scoreB || 0}}</div>
            </div>
          </div>

          <!-- Edit Score Section -->
          <div class="edit-score-section" *ngIf="isEditing(m)">
            <div class="edit-form-header">
              <i class="fas fa-edit me-2"></i>
              <span>Chỉnh sửa thông tin trận đấu</span>
            </div>
            <div class="simple-edit-form">
              <div class="edit-score-grid">
                <div class="team-edit team-a">
                  <label class="team-label" for="scoreA-{{i}}">Đội Xanh</label>
                  <input type="number" [(ngModel)]="m.scoreA" class="score-input" min="0" placeholder="Tỷ số" id="scoreA-{{i}}">
                </div>
                <div class="vs-separator-edit">
                  <span>VS</span>
                </div>
                <div class="team-edit team-b">
                  <label class="team-label" for="scoreB-{{i}}">Đội Cam</label>
                  <input type="number" [(ngModel)]="m.scoreB" class="score-input" min="0" placeholder="Tỷ số" id="scoreB-{{i}}">
                </div>
              </div>
              
              <div class="edit-actions">
                <button type="button" class="btn-cancel" (click)="cancelEdit(m)">
                  <i class="fas fa-times me-1"></i>Hủy
                </button>
                <button type="button" class="btn-save" (click)="saveMatch(m)">
                  <i class="fas fa-save me-1"></i>Lưu
                </button>
              </div>
            </div>
          </div>

          <!-- Match Stats Grid -->
          <div class="stats-grid">
            <!-- Goals -->
            <div class="stat-item" *ngIf="m.scorerA || m.scorerB">
              <div class="stat-header">
                <i class="fas fa-futbol stat-icon goals"></i>
                <span class="stat-label">Ghi bàn</span>
              </div>
              <div class="stat-values">
                <div class="team-stat team-a">
                  <span class="value">{{m.scorerA || '-'}}</span>
                </div>
                <div class="team-stat team-b">
                  <span class="value">{{m.scorerB || '-'}}</span>
                </div>
              </div>
            </div>

            <!-- Assists -->
            <div class="stat-item" *ngIf="m.assistA || m.assistB">
              <div class="stat-header">
                <i class="fas fa-crosshairs stat-icon assists"></i>
                <span class="stat-label">Kiến tạo</span>
              </div>
              <div class="stat-values">
                <div class="team-stat team-a">
                  <span class="value">{{m.assistA || '-'}}</span>
                </div>
                <div class="team-stat team-b">
                  <span class="value">{{m.assistB || '-'}}</span>
                </div>
              </div>
            </div>

            <!-- Yellow Cards -->
            <div class="stat-item" *ngIf="m.yellowA || m.yellowB">
              <div class="stat-header">
                <i class="fas fa-square stat-icon yellow-card"></i>
                <span class="stat-label">Thẻ vàng</span>
              </div>
              <div class="stat-values">
                <div class="team-stat team-a">
                  <span class="value">{{m.yellowA || '-'}}</span>
                </div>
                <div class="team-stat team-b">
                  <span class="value">{{m.yellowB || '-'}}</span>
                </div>
              </div>
            </div>

            <!-- Red Cards -->
            <div class="stat-item" *ngIf="m.redA || m.redB">
              <div class="stat-header">
                <i class="fas fa-square stat-icon red-card"></i>
                <span class="stat-label">Thẻ đỏ</span>
              </div>
              <div class="stat-values">
                <div class="team-stat team-a">
                  <span class="value">{{m.redA || '-'}}</span>
                </div>
                <div class="team-stat team-b">
                  <span class="value">{{m.redB || '-'}}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Team Lineups -->
          <div class="lineups-section">
            <div class="lineup-item">
              <div class="lineup-header">
                <i class="fas fa-users me-2"></i>
                <span>Đội Xanh</span>
                <span class="player-count">({{(m.teamA || []).length}} người)</span>
              </div>
              <div class="player-list">
                {{getTeamNames(m.teamA) || 'Chưa có thông tin'}}
              </div>
            </div>
            <div class="lineup-item">
              <div class="lineup-header">
                <i class="fas fa-users me-2"></i>
                <span>Đội Cam</span>
                <span class="player-count">({{(m.teamB || []).length}} người)</span>
              </div>
              <div class="player-list">
                {{getTeamNames(m.teamB) || 'Chưa có thông tin'}}
              </div>
            </div>
          </div>

          <!-- Financial Section -->
          <div class="financial-section">
            <div class="financial-header">
              <i class="fas fa-coins me-2"></i>
              <span>Thông tin tài chính</span>
              <div class="save-status" *ngIf="getSaveStatus(m)" [class]="getSaveStatusClass(m)">
                <i [class]="saveStatus.get(m) === 'saving' ? 'fas fa-spinner fa-spin' : saveStatus.get(m) === 'saved' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'" class="me-1"></i>
                {{getSaveStatus(m)}}
              </div>
            </div>
            
            <div class="financial-grid">
              <!-- Thu -->
              <div class="financial-item revenue">
                <div class="financial-label">
                  <i class="fas fa-arrow-up me-1"></i>
                  Thu
                  <button 
                    *ngIf="isAdmin()" 
                    class="calculation-toggle"
                    (click)="toggleThuMode(m)"
                    [title]="m.thuMode === 'manual' ? 'Chuyển sang tính tự động' : 'Chỉnh sửa thủ công'">
                    <i [class]="m.thuMode === 'manual' ? 'fas fa-calculator' : 'fas fa-edit'"></i>
                  </button>
                </div>
                <div class="revenue-breakdown" *ngIf="isAdmin() && m.thuMode === 'manual'; else autoThu">
                  <div class="revenue-item">
                    <span class="revenue-label">Thu nhập chính:</span>
                    <input 
                      type="number" 
                      [(ngModel)]="m.thu_main" 
                      (ngModelChange)="updateThuManual(m)"
                      class="revenue-input"
                      [disabled]="!isAdmin()"
                      min="0"
                      step="1000"
                      placeholder="0" />
                  </div>
                  <div class="revenue-item">
                    <span class="revenue-label">Thu phụ (thẻ phạt):</span>
                    <input 
                      type="number" 
                      [(ngModel)]="m.thu_penalties" 
                      (ngModelChange)="updateThuManual(m)"
                      class="revenue-input"
                      [disabled]="!isAdmin()"
                      min="0"
                      step="1000"
                      placeholder="0" />
                  </div>
                  <div class="revenue-item">
                    <span class="revenue-label">Thu khác:</span>
                    <input 
                      type="number" 
                      [(ngModel)]="m.thu_other" 
                      (ngModelChange)="updateThuManual(m)"
                      class="revenue-input"
                      [disabled]="!isAdmin()"
                      min="0"
                      step="1000"
                      placeholder="0" />
                  </div>
                  <div class="revenue-total">
                    <span class="total-label">Tổng thu:</span>
                    <span class="total-value">{{formatCurrency(calcThuManual(m))}}</span>
                  </div>
                  <div class="revenue-actions" *ngIf="isAdmin()">
                    <button 
                      class="save-btn manual"
                      (click)="saveMatchData(m, 'thu')"
                      [disabled]="saveStatus.get(m) === 'saving'"
                      title="Lưu thủ công dữ liệu thu nhập">
                      <i [class]="saveStatus.get(m) === 'saving' ? 'fas fa-spinner fa-spin' : 'fas fa-save'" class="me-1"></i>
                      {{saveStatus.get(m) === 'saving' ? 'Đang lưu...' : 'Lưu Thu'}}
                    </button>
                  </div>
                </div>
                <ng-template #autoThu>
                  <div class="auto-calculation">
                    <div class="calculation-breakdown">
                      <div class="calc-item">
                        <span class="calc-label">Đội thắng ({{getWinnerCount(m)}} × 40k):</span>
                        <span class="calc-value">{{formatCurrency(getWinnerCount(m) * 40000)}}</span>
                      </div>
                      <div class="calc-item">
                        <span class="calc-label">Đội thua ({{getLoserCount(m)}} × 60k):</span>
                        <span class="calc-value">{{formatCurrency(getLoserCount(m) * 60000)}}</span>
                      </div>
                      <div class="calc-item">
                        <span class="calc-label">Thẻ vàng ({{getCardCount(m, 'yellow')}} × 50k):</span>
                        <span class="calc-value">{{formatCurrency(getCardCount(m, 'yellow') * 50000)}}</span>
                      </div>
                      <div class="calc-item">
                        <span class="calc-label">Thẻ đỏ ({{getCardCount(m, 'red')}} × 100k):</span>
                        <span class="calc-value">{{formatCurrency(getCardCount(m, 'red') * 100000)}}</span>
                      </div>
                    </div>
                    <div class="financial-value auto-total">
                      {{formatCurrency(m.thu || 0)}}
                    </div>
                  </div>
                </ng-template>
              </div>

              <!-- Chi -->
              <div class="financial-item expenses">
                <div class="financial-label">
                  <i class="fas fa-arrow-down me-1"></i>
                  Chi
                  <button 
                    *ngIf="isAdmin()" 
                    class="expense-add-btn"
                    (click)="toggleExpenseCategories(m)"
                    [title]="m.showAllExpenses ? 'Ẩn mục chi phí' : 'Hiện thêm mục chi phí'">
                    <i [class]="m.showAllExpenses ? 'fas fa-minus' : 'fas fa-plus'"></i>
                  </button>
                </div>
                <div class="expense-breakdown">
                  <!-- Core expense categories -->
                  <div class="expense-item" 
                       [attr.data-tooltip]="'Chi phí trọng tài cho trận đấu (VD: 100,000 VND)'">
                    <span class="expense-label required">
                      <i class="fas fa-whistle me-1"></i>
                      Trọng tài:
                    </span>
                    <div class="input-wrapper">
                      <input 
                        type="number" 
                        [(ngModel)]="m.chi_trongtai" 
                        (ngModelChange)="updateChi(m)"
                        (blur)="validateExpenseInput(m, 'chi_trongtai')"
                        class="expense-input"
                        [class.error]="hasExpenseError(m, 'chi_trongtai')"
                        [readonly]="!isAdmin()"
                        [disabled]="!isAdmin()"
                        min="0"
                        step="1000"
                        placeholder="0" />
                      <span class="currency-suffix">VND</span>
                    </div>
                  </div>
                  
                  <div class="expense-item"
                       [attr.data-tooltip]="'Chi phí nước uống cho cầu thủ (VD: 50,000 VND)'">
                    <span class="expense-label">
                      <i class="fas fa-tint me-1"></i>
                      Nước:
                    </span>
                    <div class="input-wrapper">
                      <input 
                        type="number" 
                        [(ngModel)]="m.chi_nuoc" 
                        (ngModelChange)="updateChi(m)"
                        (blur)="validateExpenseInput(m, 'chi_nuoc')"
                        class="expense-input"
                        [class.error]="hasExpenseError(m, 'chi_nuoc')"
                        [readonly]="!isAdmin()"
                        [disabled]="!isAdmin()"
                        min="0"
                        step="1000"
                        placeholder="0" />
                      <span class="currency-suffix">VND</span>
                    </div>
                  </div>
                  
                  <div class="expense-item"
                       [attr.data-tooltip]="'Chi phí thuê sân bóng (VD: 300,000 VND)'">
                    <span class="expense-label required">
                      <i class="fas fa-futbol me-1"></i>
                      Sân:
                    </span>
                    <div class="input-wrapper">
                      <input 
                        type="number" 
                        [(ngModel)]="m.chi_san" 
                        (ngModelChange)="updateChi(m)"
                        (blur)="validateExpenseInput(m, 'chi_san')"
                        class="expense-input"
                        [class.error]="hasExpenseError(m, 'chi_san')"
                        [readonly]="!isAdmin()"
                        [disabled]="!isAdmin()"
                        min="0"
                        step="1000"
                        placeholder="0" />
                      <span class="currency-suffix">VND</span>
                    </div>
                  </div>

                  <!-- Additional expense categories (collapsible) -->
                  <div class="additional-expenses" *ngIf="m.showAllExpenses">
                    <div class="expense-item"
                         [attr.data-tooltip]="'Chi phí đi lại, xăng xe (VD: 30,000 VND)'">
                      <span class="expense-label">
                        <i class="fas fa-car me-1"></i>
                        Đi lại:
                      </span>
                      <div class="input-wrapper">
                        <input 
                          type="number" 
                          [(ngModel)]="m.chi_dilai" 
                          (ngModelChange)="updateChi(m)"
                          class="expense-input"
                          [readonly]="!isAdmin()"
                          [disabled]="!isAdmin()"
                          min="0"
                          step="1000"
                          placeholder="0" />
                        <span class="currency-suffix">VND</span>
                      </div>
                    </div>
                    
                    <div class="expense-item"
                         [attr.data-tooltip]="'Chi phí ăn uống sau trận (VD: 200,000 VND)'">
                      <span class="expense-label">
                        <i class="fas fa-utensils me-1"></i>
                        Ăn uống:
                      </span>
                      <div class="input-wrapper">
                        <input 
                          type="number" 
                          [(ngModel)]="m.chi_anuong" 
                          (ngModelChange)="updateChi(m)"
                          class="expense-input"
                          [readonly]="!isAdmin()"
                          [disabled]="!isAdmin()"
                          min="0"
                          step="1000"
                          placeholder="0" />
                        <span class="currency-suffix">VND</span>
                      </div>
                    </div>
                    
                    <div class="expense-item"
                         [attr.data-tooltip]="'Chi phí khác như dụng cụ, y tế... (VD: 20,000 VND)'">
                      <span class="expense-label">
                        <i class="fas fa-ellipsis-h me-1"></i>
                        Khác:
                      </span>
                      <div class="input-wrapper">
                        <input 
                          type="number" 
                          [(ngModel)]="m.chi_khac" 
                          (ngModelChange)="updateChi(m)"
                          class="expense-input"
                          [readonly]="!isAdmin()"
                          [disabled]="!isAdmin()"
                          min="0"
                          step="1000"
                          placeholder="0" />
                        <span class="currency-suffix">VND</span>
                      </div>
                    </div>
                  </div>

                  <div class="expense-total">
                    <span class="total-label">
                      <i class="fas fa-calculator me-1"></i>
                      Tổng chi phí:
                    </span>
                    <span class="total-value">{{formatCurrency(calcChi(m))}}</span>
                  </div>
                  
                  <div class="expense-actions" *ngIf="isAdmin()">
                    <button 
                      class="save-btn manual"
                      (click)="saveMatchData(m, 'chi')"
                      [disabled]="saveStatus.get(m) === 'saving'"
                      title="Lưu thủ công dữ liệu chi phí">
                      <i [class]="saveStatus.get(m) === 'saving' ? 'fas fa-spinner fa-spin' : 'fas fa-save'" class="me-1"></i>
                      {{saveStatus.get(m) === 'saving' ? 'Đang lưu...' : 'Lưu Chi'}}
                    </button>
                  </div>
                  
                  <!-- Expense validation messages -->
                  <div class="expense-validation" *ngIf="getExpenseErrors(m).length">
                    <div class="validation-header">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      Lưu ý:
                    </div>
                    <ul class="validation-list">
                      <li *ngFor="let error of getExpenseErrors(m)" class="validation-item">
                        {{error}}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Net Profit/Loss -->
              <div class="financial-item net-result" [class.profit]="(m.thu || 0) - calcChi(m) > 0" [class.loss]="(m.thu || 0) - calcChi(m) < 0">
                <div class="financial-label">
                  <i class="fas fa-balance-scale me-1"></i>
                  Lãi/Lỗ
                </div>
                <div class="financial-value">
                  {{formatCurrency((m.thu || 0) - calcChi(m))}}
                </div>
              </div>
            </div>

            <!-- Master Save Actions -->
            <div class="financial-master-actions" *ngIf="isAdmin()">
              <div class="master-save-section">
                <button 
                  class="save-btn master"
                  (click)="saveMatchData(m, 'all')"
                  [disabled]="saveStatus.get(m) === 'saving'"
                  title="Lưu toàn bộ dữ liệu tài chính của trận đấu">
                  <i [class]="saveStatus.get(m) === 'saving' ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'" class="me-2"></i>
                  {{saveStatus.get(m) === 'saving' ? 'Đang lưu...' : 'Lưu toàn bộ tài chính'}}
                </button>
                
                <button 
                  class="validate-btn"
                  (click)="validateMatchFinances(m)"
                  title="Kiểm tra tính hợp lệ của dữ liệu tài chính">
                  <i class="fas fa-check-double me-1"></i>
                  Kiểm tra
                </button>
                
                <button 
                  class="backup-btn"
                  (click)="exportMatchData(m)"
                  title="Xuất dữ liệu tài chính của trận này">
                  <i class="fas fa-download me-1"></i>
                  Xuất dữ liệu
                </button>
              </div>
              
              <div class="last-saved" *ngIf="getLastSavedTime(m)">
                <small class="text-muted">
                  <i class="fas fa-clock me-1"></i>
                  Lưu lần cuối: {{getLastSavedTime(m)}}
                </small>
              </div>
            </div>
          </div>

          <!-- Delete Confirmation Modal -->
          <div *ngIf="deleteConfirm === m" class="modal-overlay" (click)="deleteConfirm = null">
            <div class="delete-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h4>
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  Xác nhận xóa
                </h4>
                <button class="close-btn" (click)="deleteConfirm = null">×</button>
              </div>
              <div class="modal-content">
                <p>Bạn có chắc chắn muốn xóa trận đấu này?</p>
                <p class="text-muted">
                  <small>Hành động này không thể hoàn tác.</small>
                </p>
              </div>
              <div class="modal-footer">
                <button class="btn-secondary" (click)="deleteConfirm = null">
                  <i class="fas fa-times me-1"></i>
                  Hủy
                </button>
                <button class="btn-danger" (click)="deleteMatch(m)">
                  <i class="fas fa-trash me-1"></i>
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No History Template -->
      <ng-template #noHistory>
        <div class="no-data-card">
          <div class="no-data-icon">📜</div>
          <div class="no-data-title">Chưa có lịch sử trận đấu</div>
          <div class="no-data-text">
            Hãy chơi một vài trận và lưu kết quả để xem lịch sử tại đây!
            <br>
            <small class="text-muted mt-2 d-block">
              <i class="fas fa-info-circle me-1"></i>
              Lịch sử sẽ được lưu tự động khi bạn nhấn "Lưu trận đấu"
            </small>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .modern-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    /* Header Styles */
    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }

    .header-content {
      background: rgba(255, 255, 255, 0.95);
      padding: 25px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .page-title {
      color: #2c3e50;
      margin-bottom: 10px;
      font-weight: 700;
      font-size: 2.2rem;
    }

    .page-subtitle {
      color: #7f8c8d;
      margin: 0 0 15px 0;
      font-size: 1.1rem;
    }

    .header-badges {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .stats-badge .badge, 
    .edit-status-badge .badge {
      font-size: 1rem;
      border-radius: 25px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      font-weight: 600;
    }

    .edit-status-badge .badge.bg-success {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%) !important;
      animation: pulse 2s infinite;
    }

    .edit-status-badge .badge.bg-secondary {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%) !important;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.2);
      }
      50% {
        box-shadow: 0 4px 25px rgba(39, 174, 96, 0.4);
      }
      100% {
        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.2);
      }
    }

    /* History Content */
    .history-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Match Card */
    .match-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 25px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .match-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
    }

    /* Match Header */
    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 25px;
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
    }

    .match-date {
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }

    .match-actions {
      display: flex;
      gap: 10px;
    }

    .delete-btn {
      background: rgba(231, 76, 60, 0.2);
      border: 2px solid rgba(231, 76, 60, 0.3);
      color: #e74c3c;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .delete-btn:hover:not(:disabled) {
      background: #e74c3c;
      color: white;
      transform: scale(1.05);
    }

    .delete-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Score Section */
    .score-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px 25px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .team-score {
      text-align: center;
      flex: 1;
      padding: 20px;
      border-radius: 15px;
      margin: 0 10px;
      transition: all 0.3s ease;
    }

    .team-score.team-a {
      background: linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 151, 167, 0.15) 100%);
      border: 2px solid rgba(0, 188, 212, 0.3);
    }

    .team-score.team-a .team-label {
      color: white;
      background: linear-gradient(135deg, #00bcd4 0%, #00acc1 100%);
      box-shadow: 0 4px 15px rgba(0, 188, 212, 0.3);
    }

    .team-score.team-b {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.15) 100%);
      border: 2px solid rgba(255, 152, 0, 0.3);
    }

    .team-score.team-b .team-label {
      color: white;
      background: linear-gradient(135deg, #ff9800 0%, #ff8f00 100%);
      box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
    }

    .team-label {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 1rem;
      color: white;
      margin-bottom: 15px;
    }

    /* Edit Form Team Colors */
    .team-edit {
      text-align: center;
      flex: 1;
      padding: 15px;
      border-radius: 10px;
      margin: 0 5px;
    }

    .team-edit.team-a {
      background: linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 151, 167, 0.15) 100%);
      border: 2px solid rgba(0, 188, 212, 0.3);
    }

    .team-edit.team-a .team-label {
      color: #00bcd4;
      font-weight: 700;
    }

    .team-edit.team-b {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.15) 100%);
      border: 2px solid rgba(255, 152, 0, 0.3);
    }

    .team-edit.team-b .team-label {
      color: #ff9800;
      font-weight: 700;
    }

    .score {
      font-size: 3rem;
      font-weight: 800;
      color: #2c3e50;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .vs-separator {
      margin: 0 30px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #7f8c8d;
      background: white;
      padding: 15px 25px;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    /* Stats Grid */
    .stats-grid {
      padding: 25px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .stat-item {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      border-left: 4px solid #3498db;
    }

    .stat-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    .stat-icon {
      font-size: 1.2rem;
      margin-right: 10px;
      padding: 8px;
      border-radius: 10px;
      color: white;
    }

    .stat-icon.goals {
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
    }

    .stat-icon.assists {
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .stat-icon.yellow-card {
      background: linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%);
    }

    .stat-icon.red-card {
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
    }

    .stat-label {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1rem;
    }

    .stat-values {
      display: flex;
      justify-content: space-between;
      gap: 15px;
    }

    .team-stat {
      flex: 1;
      text-align: center;
      padding: 15px;
      border-radius: 10px;
      background: #f8f9fa;
    }

    .team-stat.team-a {
      border-left: 4px solid #00bcd4;
      background: linear-gradient(135deg, rgba(0, 188, 212, 0.05) 0%, rgba(0, 151, 167, 0.08) 100%);
    }

    .team-stat.team-b {
      border-left: 4px solid #ff9800;
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(245, 124, 0, 0.08) 100%);
    }

    .team-stat .value {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.95rem;
    }

    /* Lineups Section */
    .lineups-section {
      padding: 0 25px 25px 25px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .lineup-item {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .lineup-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .player-count {
      margin-left: auto;
      background: #3498db;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.85rem;
    }

    .player-list {
      line-height: 1.6;
      color: #495057;
      font-size: 0.95rem;
    }

    /* Financial Section */
    .financial-section {
      padding: 0 25px 25px 25px;
    }

    .financial-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      font-weight: 600;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .save-status {
      font-size: 0.85rem;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid currentColor;
      opacity: 0.9;
      animation: fadeIn 0.3s ease-in;
    }

    .save-status.text-warning {
      color: #f39c12;
      background: rgba(243, 156, 18, 0.1);
      border-color: rgba(243, 156, 18, 0.3);
    }

    .save-status.text-success {
      color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
      border-color: rgba(39, 174, 96, 0.3);
    }

    .save-status.text-danger {
      color: #e74c3c;
      background: rgba(231, 76, 60, 0.1);
      border-color: rgba(231, 76, 60, 0.3);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 0.9; transform: translateY(0); }
    }

    /* Save Button Styles */
    .revenue-actions,
    .expense-actions {
      margin-top: 15px;
      text-align: center;
    }

    .save-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      font-size: 0.85rem;
    }

    .save-btn.manual {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
    }

    .save-btn.manual:hover:not(:disabled) {
      background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
    }

    .save-btn.master {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
      padding: 12px 24px;
      font-size: 1rem;
      border-radius: 15px;
    }

    .save-btn.master:hover:not(:disabled) {
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
    }

    .save-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .validate-btn {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      font-size: 0.9rem;
      box-shadow: 0 3px 10px rgba(243, 156, 18, 0.3);
    }

    .validate-btn:hover {
      background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(243, 156, 18, 0.4);
    }

    .backup-btn {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      font-size: 0.9rem;
      box-shadow: 0 3px 10px rgba(155, 89, 182, 0.3);
    }

    .backup-btn:hover {
      background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(155, 89, 182, 0.4);
    }

    .financial-master-actions {
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 15px;
      margin-top: 15px;
      border: 2px dashed #dee2e6;
    }

    .master-save-section {
      display: flex;
      gap: 15px;
      justify-content: center;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .last-saved {
      text-align: center;
      margin-top: 10px;
    }

    .last-saved small {
      background: rgba(255, 255, 255, 0.8);
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    /* Admin Firebase Actions */
    .admin-firebase-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 15px;
    }

    .admin-firebase-actions .btn {
      font-weight: 600;
      border-radius: 20px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .admin-firebase-actions .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .admin-firebase-actions .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }

    .admin-firebase-actions .btn-success {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      border: none;
    }

    .financial-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .financial-item {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .financial-item.revenue {
      border-left: 4px solid #27ae60;
    }

    .financial-item.expenses {
      border-left: 4px solid #e74c3c;
    }

    .financial-item.net-result {
      border-left: 4px solid #95a5a6;
    }

    .financial-item.net-result.profit {
      border-left-color: #27ae60;
    }

    .financial-item.net-result.profit .financial-value {
      color: #27ae60;
    }

    .financial-item.net-result.loss {
      border-left-color: #e74c3c;
    }

    .financial-item.net-result.loss .financial-value {
      color: #e74c3c;
    }

    .financial-label {
      display: flex;
      align-items: center;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 1rem;
    }

    .financial-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .expense-breakdown {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .expense-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .expense-label {
      font-weight: 500;
      color: #495057;
      font-size: 0.9rem;
    }

    .expense-input {
      width: 80px;
      padding: 6px 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      text-align: right;
      font-weight: 500;
      transition: border-color 0.3s ease;
    }

    .expense-input:focus {
      outline: none;
      border-color: #3498db;
    }

    .expense-input:read-only {
      background: #f8f9fa;
      color: #6c757d;
    }

    .expense-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
    }

    .total-label {
      font-weight: 600;
      color: #2c3e50;
    }

    .total-value {
      font-weight: 700;
      color: #e74c3c;
      font-size: 1.1rem;
    }

    /* Enhanced Thu (Revenue) Styles */
    .calculation-toggle {
      background: rgba(52, 152, 219, 0.1);
      border: 2px solid rgba(52, 152, 219, 0.3);
      color: #3498db;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.8rem;
      margin-left: 10px;
    }

    .calculation-toggle:hover {
      background: #3498db;
      color: white;
      transform: scale(1.05);
    }

    .revenue-breakdown {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .revenue-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .revenue-label {
      font-weight: 500;
      color: #495057;
      font-size: 0.9rem;
    }

    .revenue-input {
      width: 80px;
      padding: 6px 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      text-align: right;
      font-weight: 500;
      transition: border-color 0.3s ease;
    }

    .revenue-input:focus {
      outline: none;
      border-color: #27ae60;
    }

    .revenue-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
    }

    .revenue-total .total-value {
      color: #27ae60;
    }

    .auto-calculation {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .calculation-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 10px;
      border-left: 4px solid #27ae60;
    }

    .calc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .calc-label {
      color: #495057;
      font-weight: 500;
    }

    .calc-value {
      color: #27ae60;
      font-weight: 600;
    }

    .auto-total {
      text-align: center;
      padding: 15px;
      background: linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(46, 204, 113, 0.15) 100%);
      border-radius: 10px;
      border: 2px solid rgba(39, 174, 96, 0.2);
    }

    /* Enhanced Expense (Chi) Styles */
    .expense-add-btn {
      background: rgba(231, 76, 60, 0.1);
      border: 2px solid rgba(231, 76, 60, 0.3);
      color: #e74c3c;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.8rem;
      margin-left: 10px;
    }

    .expense-add-btn:hover {
      background: #e74c3c;
      color: white;
      transform: scale(1.05);
    }

    .expense-item {
      position: relative;
      margin-bottom: 12px;
    }

    .expense-item[data-tooltip]:hover::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      white-space: nowrap;
      z-index: 1000;
      max-width: 300px;
      white-space: normal;
      width: max-content;
    }

    .expense-label {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }

    .expense-label.required::after {
      content: '*';
      color: #e74c3c;
      margin-left: 3px;
      font-weight: bold;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .expense-input {
      width: 100px;
      padding: 8px 35px 8px 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      text-align: right;
      font-weight: 500;
      transition: all 0.3s ease;
      font-family: 'Roboto Mono', monospace;
    }

    .expense-input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .expense-input.error {
      border-color: #e74c3c;
      background: rgba(231, 76, 60, 0.05);
    }

    .expense-input:read-only {
      background: #f8f9fa;
      color: #6c757d;
      cursor: not-allowed;
    }

    .expense-input:disabled {
      background: #f8f9fa;
      color: #6c757d;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .revenue-input {
      width: 100px;
      padding: 8px 35px 8px 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      text-align: right;
      font-weight: 500;
      transition: all 0.3s ease;
      font-family: 'Roboto Mono', monospace;
    }

    .revenue-input:focus {
      outline: none;
      border-color: #27ae60;
      box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
    }

    .revenue-input:disabled {
      background: #f8f9fa;
      color: #6c757d;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .currency-suffix {
      position: absolute;
      right: 8px;
      font-size: 0.75rem;
      color: #6c757d;
      pointer-events: none;
    }

    .additional-expenses {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px dashed #dee2e6;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .expense-total {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #e9ecef;
      background: linear-gradient(135deg, rgba(231, 76, 60, 0.05) 0%, rgba(192, 57, 43, 0.08) 100%);
      border-radius: 8px;
      padding: 12px;
    }

    .expense-validation {
      margin-top: 15px;
      padding: 12px;
      background: rgba(231, 76, 60, 0.05);
      border: 1px solid rgba(231, 76, 60, 0.2);
      border-radius: 8px;
    }

    .validation-header {
      font-weight: 600;
      color: #e74c3c;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }

    .validation-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .validation-item {
      color: #dc3545;
      font-size: 0.85rem;
      margin-bottom: 4px;
      padding-left: 16px;
      position: relative;
    }

    .validation-item::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #e74c3c;
    }

    /* Financial Summary Styles */
    .financial-summary-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 30px;
      overflow: hidden;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 25px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .summary-header h3 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .toggle-summary-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .toggle-summary-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0;
      padding: 0;
    }

    .summary-item {
      display: flex;
      align-items: center;
      padding: 25px 30px;
      border-right: 1px solid rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .summary-item:last-child {
      border-right: none;
    }

    .summary-item:hover {
      background: rgba(52, 152, 219, 0.05);
      transform: translateY(-2px);
    }

    .summary-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: #bdc3c7;
    }

    .summary-item.total-revenue::before {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .summary-item.total-expenses::before {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-item.net-profit::before {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
    }

    .summary-item.net-profit.profit::before {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .summary-item.net-profit.loss::before {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-item.avg-per-match::before {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-icon {
      font-size: 2rem;
      margin-right: 15px;
      padding: 15px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .total-revenue .summary-icon {
      background: linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(46, 204, 113, 0.15) 100%);
      color: #27ae60;
    }

    .total-expenses .summary-icon {
      background: linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(192, 57, 43, 0.15) 100%);
      color: #e74c3c;
    }

    .net-profit .summary-icon {
      background: linear-gradient(135deg, rgba(149, 165, 166, 0.1) 0%, rgba(127, 140, 141, 0.15) 100%);
      color: #95a5a6;
    }

    .net-profit.profit .summary-icon {
      background: linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(230, 126, 34, 0.15) 100%);
      color: #f39c12;
    }

    .net-profit.loss .summary-icon {
      background: linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(192, 57, 43, 0.15) 100%);
      color: #e74c3c;
    }

    .avg-per-match .summary-icon {
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(41, 128, 185, 0.15) 100%);
      color: #3498db;
    }

    .summary-content {
      flex: 1;
    }

    .summary-label {
      font-size: 0.9rem;
      color: #7f8c8d;
      font-weight: 500;
      margin-bottom: 5px;
    }

    .summary-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .net-profit.profit .summary-value {
      color: #f39c12;
    }

    .net-profit.loss .summary-value {
      color: #e74c3c;
    }

    /* Summary Details */
    .summary-details {
      padding: 30px;
      background: #f8f9fa;
      animation: slideDown 0.3s ease-out;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }

    .detail-section h4 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
    }

    .detail-items {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f2f6;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: #495057;
      font-weight: 500;
    }

    .detail-value {
      color: #2c3e50;
      font-weight: 600;
    }

    /* Financial Timeline */
    .financial-timeline {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .financial-timeline h4 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
    }

    .timeline-chart {
      display: flex;
      align-items: end;
      gap: 15px;
      padding: 20px 0;
      overflow-x: auto;
      min-height: 200px;
    }

    .timeline-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
    }

    .timeline-match {
      margin-bottom: 10px;
      text-align: center;
    }

    .match-number {
      background: #3498db;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 600;
      margin: 0 auto 5px;
    }

    .match-date-short {
      font-size: 0.7rem;
      color: #7f8c8d;
    }

    .timeline-finances {
      display: flex;
      align-items: end;
      gap: 5px;
      height: 120px;
      margin-bottom: 10px;
    }

    .timeline-bar {
      width: 25px;
      min-height: 10px;
      border-radius: 4px 4px 0 0;
      position: relative;
      display: flex;
      align-items: end;
      justify-content: center;
    }

    .timeline-bar.revenue {
      background: linear-gradient(to top, #27ae60 0%, #2ecc71 100%);
    }

    .timeline-bar.expense {
      background: linear-gradient(to top, #e74c3c 0%, #ec7063 100%);
    }

    .bar-label {
      position: absolute;
      bottom: 100%;
      font-size: 0.6rem;
      color: #2c3e50;
      font-weight: 600;
      white-space: nowrap;
      transform: rotate(-45deg);
      transform-origin: bottom;
      margin-bottom: 5px;
    }

    .timeline-profit {
      font-size: 0.7rem;
      font-weight: 600;
      text-align: center;
      min-width: 60px;
    }

    .timeline-profit.positive {
      color: #27ae60;
    }

    .timeline-profit.negative {
      color: #e74c3c;
    }

    .timeline-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #495057;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }

    .legend-color.revenue {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .legend-color.expense {
      background: linear-gradient(135deg, #e74c3c 0%, #ec7063 100%);
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
      z-index: 2000;
    }

    .delete-modal {
      background: white;
      border-radius: 20px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .delete-modal .modal-header {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 20px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .delete-modal .modal-header h4 {
      margin: 0;
      font-size: 1.3rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.3s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .delete-modal .modal-content {
      padding: 25px;
    }

    .delete-modal .modal-content p {
      margin-bottom: 10px;
      color: #2c3e50;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      padding: 20px 25px;
      background: #f8f9fa;
    }

    .btn-secondary, .btn-danger {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
      transform: translateY(-2px);
    }

    /* No Data State */
    .no-data-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 60px 40px;
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
    }

    .no-data-icon {
      font-size: 4rem;
      color: #bdc3c7;
      margin-bottom: 25px;
    }

    .no-data-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 15px;
    }

    .no-data-text {
      color: #7f8c8d;
      font-size: 1rem;
      line-height: 1.6;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .modern-container {
        padding: 15px;
      }

      .page-title {
        font-size: 1.8rem;
      }

      .header-content {
        padding: 20px;
      }

      /* Financial Summary Mobile */
      .summary-grid {
        grid-template-columns: 1fr 1fr;
      }

      .summary-item {
        padding: 15px 20px;
        flex-direction: column;
        text-align: center;
      }

      .summary-icon {
        margin: 0 0 10px 0;
        font-size: 1.5rem;
        padding: 10px;
      }

      .summary-value {
        font-size: 1.1rem;
      }

      .details-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .timeline-chart {
        gap: 10px;
      }

      .timeline-item {
        min-width: 60px;
      }

      .timeline-bar {
        width: 20px;
      }

      /* Match Cards Mobile */
      .match-header {
        padding: 15px 20px;
      }

      .match-actions {
        gap: 5px;
      }

      .lineups-section {
        grid-template-columns: 1fr;
        padding: 0 20px 20px 20px;
      }

      .financial-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        padding: 20px;
      }

      .score-section {
        flex-direction: column;
        gap: 20px;
        padding: 20px;
      }

      .vs-separator {
        margin: 0;
        transform: rotate(90deg);
      }

      .stat-values {
        flex-direction: column;
        gap: 10px;
      }

      .expense-breakdown {
        gap: 10px;
      }

      .expense-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .input-wrapper {
        width: 100%;
      }

      .expense-input {
        width: 100%;
        padding-right: 40px;
      }

      .calculation-breakdown {
        padding: 12px;
      }

      .calc-item {
        font-size: 0.8rem;
      }

      /* Edit forms mobile */
      .edit-score-grid {
        padding: 15px;
      }

      .team-edit {
        margin: 0 0 10px 0;
        padding: 10px;
      }

      .vs-separator-edit {
        margin: 10px 0;
      }

      .financial-timeline h4 {
        font-size: 1rem;
      }

      .bar-label {
        display: none; /* Hide labels on mobile for cleaner look */
      }
    }

    @media (max-width: 480px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .timeline-chart {
        gap: 8px;
      }

      .timeline-item {
        min-width: 50px;
      }

      .match-number {
        width: 20px;
        height: 20px;
        font-size: 0.7rem;
      }

      .timeline-profit {
        font-size: 0.6rem;
        min-width: 50px;
      }

      .expense-input {
        font-size: 0.9rem;
      }
    }
  `]
})
export class HistoryComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  
  private authSubscription?: Subscription;
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  
  // Memoized calculations cache
  private calculationCache = new Map<string, unknown>();
  private lastHistoryLength = 0;
  
  toNumber(val: unknown): number {
    return Number(val) || 0;
  }
  
  updateChi(m: MatchData): void {
    m.chi_total = this.calcChi(m);
    this.clearCalculationCache();
    this.saveMatchData(m, 'chi');
    this.cdr.markForCheck();
  }
  calcThu(m: MatchData): void {
    // Winner/loser team
    // Thu = total players of winner team x 40 + loser team x 60 + yellow cards x 50 + red cards x 100
    // Exclude 'Thủ môn' and 'Minh nhỏ' from Thu calculation
    let winnerTeam: Player[] = [], loserTeam: Player[] = [];
    if (Number(m.scoreA) > Number(m.scoreB)) {
      winnerTeam = m.teamA || [];
      loserTeam = m.teamB || [];
    } else if (Number(m.scoreB) > Number(m.scoreA)) {
      winnerTeam = m.teamB || [];
      loserTeam = m.teamA || [];
    } else {
      winnerTeam = [...(m.teamA || []), ...(m.teamB || [])];
      loserTeam = [];
    }
    const isFree = (p: Player) => p.position === 'Thủ môn' || p.firstName === 'Minh nhỏ';
    const winnerCount = winnerTeam.filter(p => !isFree(p)).length;
    const loserCount = loserTeam.filter(p => !isFree(p)).length;
    const yellowCount = (typeof m.yellowA === 'string' ? m.yellowA.split(/[, ]+/).filter(x=>x).length : 0) + (typeof m.yellowB === 'string' ? m.yellowB.split(/[, ]+/).filter(x=>x).length : 0);
    const redCount = (typeof m.redA === 'string' ? m.redA.split(/[, ]+/).filter(x=>x).length : 0) + (typeof m.redB === 'string' ? m.redB.split(/[, ]+/).filter(x=>x).length : 0);
    m.thu = winnerCount * FINANCIAL_RATES.WINNER_FEE + loserCount * FINANCIAL_RATES.LOSER_FEE + yellowCount * FINANCIAL_RATES.YELLOW_CARD_FEE + redCount * FINANCIAL_RATES.RED_CARD_FEE;
    localStorage.setItem('matchHistory', JSON.stringify(this.history));
  }
  calcChi(m: MatchData): number {
    return Number(m.chi_trongtai || 0) + 
           Number(m.chi_nuoc || 0) + 
           Number(m.chi_san || 0) + 
           Number(m.chi_dilai || 0) + 
           Number(m.chi_anuong || 0) + 
           Number(m.chi_khac || 0);
  }

  // Enhanced expense management methods
  toggleExpenseCategories(m: MatchData): void {
    if (!this.isAdmin()) return;
    m.showAllExpenses = !m.showAllExpenses;
  }

  validateExpenseInput(m: MatchData, field: string): void {
    if (!m.expenseErrors) {
      m.expenseErrors = {};
    }

    const value = Number(m[field] || 0);
    
    // Clear previous error
    delete m.expenseErrors[field];

    // Validation rules
    if (field === 'chi_trongtai' && value > 0 && value < 50000) {
      m.expenseErrors[field] = 'Chi phí trọng tài thường từ 50,000 VND trở lên';
    }
    
    if (field === 'chi_san' && value > 0 && value < 100000) {
      m.expenseErrors[field] = 'Chi phí sân thường từ 100,000 VND trở lên';
    }

    if (value < 0) {
      m.expenseErrors[field] = 'Chi phí không thể âm';
    }

    if (value > 1000000) {
      m.expenseErrors[field] = 'Chi phí có vẻ quá cao, vui lòng kiểm tra lại';
    }
  }

  hasExpenseError(m: MatchData, field: string): boolean {
    return !!(m.expenseErrors && m.expenseErrors[field]);
  }

  getExpenseErrors(m: MatchData): string[] {
    if (!m.expenseErrors) return [];
    return Object.values(m.expenseErrors) as string[];
  }

  // New methods for enhanced Thu (Income) functionality
  toggleThuMode(m: MatchData): void {
    if (!this.isAdmin()) return;
    
    if (m.thuMode === 'manual') {
      // Switch to auto mode
      m.thuMode = 'auto';
      this.calcThu(m); // Recalculate automatically
    } else {
      // Switch to manual mode
      m.thuMode = 'manual';
      // Initialize manual fields with current auto-calculated values
      if (!m.thu_main && !m.thu_penalties && !m.thu_other) {
        const winnerCount = this.getWinnerCount(m);
        const loserCount = this.getLoserCount(m);
        m.thu_main = (winnerCount * FINANCIAL_RATES.WINNER_FEE) + (loserCount * FINANCIAL_RATES.LOSER_FEE);
        m.thu_penalties = (this.getCardCount(m, 'yellow') * FINANCIAL_RATES.YELLOW_CARD_FEE) + (this.getCardCount(m, 'red') * FINANCIAL_RATES.RED_CARD_FEE);
        m.thu_other = 0;
      }
      this.updateThuManual(m);
    }
  }

  updateThuManual(m: MatchData): void {
    m.thu = this.calcThuManual(m);
    this.clearCalculationCache();
    this.saveMatchData(m, 'thu');
    this.cdr.markForCheck();
  }

  calcThuManual(m: MatchData): number {
    return Number(m.thu_main || 0) + Number(m.thu_penalties || 0) + Number(m.thu_other || 0);
  }

  getWinnerCount(m: MatchData): number {
    let winnerTeam: Player[] = [];
    if (Number(m.scoreA) > Number(m.scoreB)) {
      winnerTeam = m.teamA || [];
    } else if (Number(m.scoreB) > Number(m.scoreA)) {
      winnerTeam = m.teamB || [];
    } else {
      // Draw case - combine both teams
      winnerTeam = [...(m.teamA || []), ...(m.teamB || [])];
    }
    const isFree = (p: Player) => p.position === 'Thủ môn' || p.firstName === 'Minh nhỏ';
    return winnerTeam.filter(p => !isFree(p)).length;
  }

  getLoserCount(m: MatchData): number {
    let loserTeam: Player[] = [];
    if (Number(m.scoreA) > Number(m.scoreB)) {
      loserTeam = m.teamB || [];
    } else if (Number(m.scoreB) > Number(m.scoreA)) {
      loserTeam = m.teamA || [];
    }
    // Draw case - no loser team
    const isFree = (p: Player) => p.position === 'Thủ môn' || p.firstName === 'Minh nhỏ';
    return loserTeam.filter(p => !isFree(p)).length;
  }

  getCardCount(m: MatchData, cardType: CardType): number {
    const fieldA = cardType === 'yellow' ? m.yellowA : m.redA;
    const fieldB = cardType === 'yellow' ? m.yellowB : m.redB;
    const countA = typeof fieldA === 'string' ? fieldA.split(/[, ]+/).filter(x => x).length : 0;
    const countB = typeof fieldB === 'string' ? fieldB.split(/[, ]+/).filter(x => x).length : 0;
    return countA + countB;
  }

  // Financial summary and tracking methods
  showSummaryDetails = false;

  toggleSummaryDetails() {
    this.showSummaryDetails = !this.showSummaryDetails;
  }

  getTotalRevenue(): number {
    return this.getMemoizedCalculation('totalRevenue', () => 
      this.history.reduce((total, m) => total + (m.thu || 0), 0)
    );
  }

  getTotalExpenses(): number {
    return this.getMemoizedCalculation('totalExpenses', () => 
      this.history.reduce((total, m) => total + this.calcChi(m), 0)
    );
  }

  getNetProfit(): number {
    return this.getMemoizedCalculation('netProfit', () => 
      this.getTotalRevenue() - this.getTotalExpenses()
    );
  }

  getAveragePerMatch(): number {
    return this.getMemoizedCalculation('averagePerMatch', () => 
      this.history.length > 0 ? this.getNetProfit() / this.history.length : 0
    );
  }

  // Detailed revenue breakdown
  getWinnerRevenue(): number {
    return this.history.reduce((total, m) => {
      const winnerCount = this.getWinnerCount(m);
      const loserCount = this.getLoserCount(m);
      if (loserCount === 0) {
        // Draw case - all players pay winner rate
        return total + (winnerCount * 40000);
      }
      return total + (winnerCount * 40000);
    }, 0);
  }

  getLoserRevenue(): number {
    return this.history.reduce((total, m) => {
      const loserCount = this.getLoserCount(m);
      return total + (loserCount * 60000);
    }, 0);
  }

  getPenaltyRevenue(): number {
    return this.history.reduce((total, m) => {
      const yellowCount = this.getCardCount(m, 'yellow');
      const redCount = this.getCardCount(m, 'red');
      return total + (yellowCount * 50000) + (redCount * 100000);
    }, 0);
  }

  getOtherRevenue(): number {
    return this.history.reduce((total, m) => {
      if (m.thuMode === 'manual') {
        return total + (m.thu_other || 0);
      }
      return total;
    }, 0);
  }

  // Detailed expense breakdown
  getFieldExpenses(): number {
    return this.history.reduce((total, m) => total + Number(m.chi_san || 0), 0);
  }

  getRefereeExpenses(): number {
    return this.history.reduce((total, m) => total + Number(m.chi_trongtai || 0), 0);
  }

  getWaterExpenses(): number {
    return this.history.reduce((total, m) => total + Number(m.chi_nuoc || 0), 0);
  }

  getOtherExpenses(): number {
    return this.history.reduce((total, m) => {
      return total + Number(m.chi_dilai || 0) + Number(m.chi_anuong || 0) + Number(m.chi_khac || 0);
    }, 0);
  }

  // Timeline chart helpers
  getMaxFinancialValue(): number {
    const allRevenues = this.history.map(m => m.thu || 0);
    const allExpenses = this.history.map(m => this.calcChi(m));
    return Math.max(...allRevenues, ...allExpenses);
  }

  getRevenuePercentage(m: MatchData): number {
    const maxValue = this.getMaxFinancialValue();
    return maxValue > 0 ? ((m.thu || 0) / maxValue) * 100 : 0;
  }

  getExpensePercentage(m: MatchData): number {
    const maxValue = this.getMaxFinancialValue();
    return maxValue > 0 ? (this.calcChi(m) / maxValue) * 100 : 0;
  }

  formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric'
    });
  }

  formatShortCurrency(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'k';
    }
    return amount.toString();
  }

  debugPermissions() {
    const debugInfo = {
      'Component role': this.role,
      'localStorage role': localStorage.getItem('role'),
      'canEdit input': this.canEdit,
      'isAdmin()': this.isAdmin(),
      'Current user (localStorage)': localStorage.getItem('currentUser'),
      'thang_user (localStorage)': localStorage.getItem('thang_user')
    };
    
    console.table(debugInfo);
    alert('Debug info logged to console (F12). Check role and permissions.');
  }

  // Data export and sync methods
  async exportAllData() {
    if (!this.isAdmin()) {
      alert('Chỉ admin mới có thể xuất dữ liệu');
      return;
    }

    try {
      const allData = {
        matches: this.history,
        exportedAt: new Date().toISOString(),
        exportedBy: localStorage.getItem('currentUser') || 'unknown',
        totalMatches: this.history.length,
        totalRevenue: this.getTotalRevenue(),
        totalExpenses: this.getTotalExpenses(),
        netProfit: this.getNetProfit()
      };

      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `thanglong-fc-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      console.log('📊 Data exported successfully');
      alert('✅ Dữ liệu đã được xuất thành công!');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('❌ Lỗi khi xuất dữ liệu!');
    }
  }

  async syncAllToFirebase() {
    if (!this.isAdmin()) {
      alert('Chỉ admin mới có thể đồng bộ dữ liệu');
      return;
    }

    try {
      console.log('🔄 Starting full Firebase sync...');
      this.saveStatus.set('sync', 'saving');
      
      await this.firebaseService.syncLocalHistoryToFirebase(this.history);
      
      this.saveStatus.set('sync', 'saved');
      console.log('✅ Full sync completed');
      alert('✅ Đã đồng bộ toàn bộ dữ liệu lên Firebase!');
      
      setTimeout(() => {
        this.saveStatus.delete('sync');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.saveStatus.set('sync', 'error');
      alert('❌ Lỗi khi đồng bộ dữ liệu!');
      
      setTimeout(() => {
        this.saveStatus.delete('sync');
      }, 3000);
    }
  }

  // Enhanced save functionality with Firebase integration
  saveMatchData(match: MatchData, changeType: 'thu' | 'chi' | 'all' = 'all'): void {
    // Clear existing timeout for this match
    if (this.saveTimeouts.has(match)) {
      clearTimeout(this.saveTimeouts.get(match));
    }

    // Set saving status
    this.saveStatus.set(match, 'saving');

    // Debounced save after 500ms
    const timeoutId = setTimeout(async () => {
      try {
        // Update last saved timestamp
        match.lastSaved = new Date().toISOString();
        
        // Save to Firebase first (primary storage)
        if (this.isAdmin()) {
          await this.saveToFirebase(match, changeType);
        }
        
        // Save to localStorage as backup
        localStorage.setItem('matchHistory', JSON.stringify(this.history));
        
        // Set success status
        this.saveStatus.set(match, 'saved');
        console.log(`💾 Match ${changeType} data saved successfully at ${match.lastSaved}`);

        // Clear success message after 2 seconds
        setTimeout(() => {
          this.saveStatus.delete(match);
        }, 2000);

      } catch (error) {
        console.error('❌ Error saving match data:', error);
        this.saveStatus.set(match, 'error');
        
        // Still save to localStorage even if Firebase fails
        try {
          localStorage.setItem('matchHistory', JSON.stringify(this.history));
          console.log('💾 Fallback: Saved to localStorage');
        } catch (localError) {
          console.error('❌ Even localStorage save failed:', localError);
        }
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          this.saveStatus.delete(match);
        }, 3000);
      }
    }, 500);

    this.saveTimeouts.set(match, timeoutId);
  }

  async saveToFirebase(match: MatchData, changeType: string): Promise<void> {
    // Save to Firebase if service is available and user is authenticated
    try {
      if (!this.firebaseService || !this.isAdmin()) {
        console.warn('⚠️ Firebase service not available or user lacks permissions');
        return;
      }

      const currentUser: AuthUser | null = await this.firebaseAuthService.currentUser$.pipe(
        take(1)
      ).toPromise();
      
      if (currentUser && (currentUser.isAdmin || currentUser.isSuperAdmin)) {
        // Prepare complete match data for Firebase
        const matchData = {
          id: match.id || undefined,
          date: match.date,
          
          // Team and score data
          teamA: match.teamA || [],
          teamB: match.teamB || [],
          scoreA: match.scoreA || 0,
          scoreB: match.scoreB || 0,
          scorerA: match.scorerA || '',
          scorerB: match.scorerB || '',
          assistA: match.assistA || '',
          assistB: match.assistB || '',
          yellowA: match.yellowA || '',
          yellowB: match.yellowB || '',
          redA: match.redA || '',
          redB: match.redB || '',
          
          // Financial data - Revenue
          thu: match.thu || 0,
          thuMode: match.thuMode || 'auto',
          thu_main: match.thu_main || 0,
          thu_penalties: match.thu_penalties || 0,
          thu_other: match.thu_other || 0,
          
          // Financial data - Expenses
          chi_trongtai: match.chi_trongtai || 0,
          chi_nuoc: match.chi_nuoc || 0,
          chi_san: match.chi_san || 0,
          chi_dilai: match.chi_dilai || 0,
          chi_anuong: match.chi_anuong || 0,
          chi_khac: match.chi_khac || 0,
          chi_total: this.calcChi(match),
          
          // Metadata
          lastSaved: match.lastSaved,
          updatedBy: currentUser.email
        };

        // Save to Firebase using the service
        const savedId = await this.firebaseService.saveMatchFinances(matchData);
        
        // Update local match with Firebase ID if it was newly created
        if (!match.id && savedId) {
          match.id = savedId;
        }
        
        console.log('🔥 Successfully saved to Firebase:', {
          matchId: savedId,
          changeType: changeType,
          savedBy: currentUser.email
        });
        
      } else {
        console.warn('⚠️ User not authenticated or lacks admin permissions');
      }
    } catch (error) {
      console.error('❌ Firebase save error:', error);
      throw error; // Re-throw to handle in parent method
    }
  }

  getSaveStatus(match: MatchData): string {
    const status = this.saveStatus.get(match);
    switch (status) {
      case 'saving': return 'Đang lưu...';
      case 'saved': return 'Đã lưu ✓';
      case 'error': return 'Lỗi lưu ✗';
      default: return '';
    }
  }

  getSaveStatusClass(match: MatchData): string {
    const status = this.saveStatus.get(match);
    switch (status) {
      case 'saving': return 'text-warning';
      case 'saved': return 'text-success';
      case 'error': return 'text-danger';
      default: return '';
    }
  }

  validateMatchFinances(match: MatchData): void {
    const errors: string[] = [];
    
    // Validate revenue
    if (match.thuMode === 'manual') {
      const totalRevenue = this.calcThuManual(match);
      if (totalRevenue <= 0) {
        errors.push('Thu nhập thủ công phải lớn hơn 0');
      }
    } else {
      const autoRevenue = match.thu || 0;
      if (autoRevenue <= 0) {
        errors.push('Thu nhập tự động không hợp lệ');
      }
    }

    // Validate expenses
    const totalExpenses = this.calcChi(match);
    if (totalExpenses < 0) {
      errors.push('Chi phí không thể âm');
    }

    // Validate required expenses
    if (!match.chi_san || match.chi_san <= 0) {
      errors.push('Chi phí sân là bắt buộc');
    }

    if (!match.chi_trongtai || match.chi_trongtai <= 0) {
      errors.push('Chi phí trọng tài là bắt buộc');
    }

    // Show validation results
    if (errors.length > 0) {
      const errorMessage = 'Lỗi xác thực:\n' + errors.join('\n');
      alert(errorMessage);
      console.error('❌ Validation errors:', errors);
    } else {
      alert('✅ Dữ liệu tài chính hợp lệ!');
      console.log('✅ Financial validation passed');
      
      // Auto-save after successful validation
      this.saveMatchData(match, 'all');
    }
  }

  getLastSavedTime(match: MatchData): string {
    if (match.lastSaved) {
      const date = new Date(match.lastSaved);
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return '';
  }

  exportMatchData(match: MatchData): void {
    const exportData = {
      date: match.date,
      teams: {
        teamA: match.teamA,
        teamB: match.teamB
      },
      scores: {
        scoreA: match.scoreA,
        scoreB: match.scoreB
      },
      finances: {
        thu: match.thu || 0,
        thuMode: match.thuMode || 'auto',
        thu_main: match.thu_main || 0,
        thu_penalties: match.thu_penalties || 0,
        thu_other: match.thu_other || 0,
        chi_trongtai: match.chi_trongtai || 0,
        chi_nuoc: match.chi_nuoc || 0,
        chi_san: match.chi_san || 0,
        chi_dilai: match.chi_dilai || 0,
        chi_anuong: match.chi_anuong || 0,
        chi_khac: match.chi_khac || 0,
        totalChi: this.calcChi(match),
        netProfit: (match.thu || 0) - this.calcChi(match)
      },
      stats: {
        yellowA: match.yellowA,
        yellowB: match.yellowB,
        redA: match.redA,
        redB: match.redB
      },
      exportedAt: new Date().toISOString(),
      exportedBy: this.role
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `match_finances_${match.date.split('T')[0]}.json`;
    link.click();
    
    console.log('📊 Match data exported:', exportData);
  }
  isAdmin() {
    return this.role === 'admin' || this.role === 'superadmin';
  }
  
  // Edit mode management
  editingMatches = new Set<MatchData>();
  
  // Save feedback system
  saveStatus = new Map<MatchData | string, 'saving' | 'saved' | 'error'>();
  saveTimeouts = new Map<MatchData, NodeJS.Timeout>();
  
  isEditing(match: MatchData): boolean {
    return this.editingMatches.has(match);
  }
  
  toggleEditMode(match: MatchData): void {
    if (!this.canEdit) return;
    
    if (this.editingMatches.has(match)) {
      // Exit edit mode
      this.editingMatches.delete(match);
    } else {
      // Enter edit mode
      this.editingMatches.add(match);
    }
  }
  
  deleteConfirm: MatchData | null = null;
  
  confirmDelete(m: MatchData): void {
    this.deleteConfirm = m;
  }
  
  deleteMatch(m: MatchData): void {
    const idx = this.history.indexOf(m);
    if (idx > -1) {
      this.history.splice(idx, 1);
      localStorage.setItem('matchHistory', JSON.stringify(this.history));
    }
    this.deleteConfirm = null;
  }
  getTeamNames(team: Player[]): string {
    return team.map(p => p.firstName || '').filter(x => x).join(', ');
  }
  
  history: MatchData[] = [];
  role = '';
  
  private firebaseAuthService = inject(FirebaseAuthService);
  private firebaseService = inject(FirebaseService);
  
  // TrackBy functions for better performance
  trackByMatch = (index: number, match: MatchData) => match.id || match.date || index;
  
  // Memoized calculations
  private getMemoizedCalculation<T>(key: string, calculation: () => T): T {
    if (this.calculationCache.has(key) && this.lastHistoryLength === this.history.length) {
      return this.calculationCache.get(key) as T;
    }
    const result = calculation();
    this.calculationCache.set(key, result);
    this.lastHistoryLength = this.history.length;
    return result;
  }
  
  private clearCalculationCache() {
    this.calculationCache.clear();
  }
  
  ngOnInit() {
    console.log('🔍 History component ngOnInit started');
    
    // Initialize role and permissions
    this.initializeUserRole();
    
    // Load data from Firebase with localStorage fallback
    this.loadHistoryData();
    
    // Subscribe to Firebase auth changes for real-time role updates
    this.authSubscription = this.firebaseAuthService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
      if (user) {
        this.role = user.isSuperAdmin ? 'superadmin' : 'admin';
        localStorage.setItem('role', this.role);
        console.log('� Role updated from Firebase auth:', this.role);
      } else {
        this.role = '';
        localStorage.removeItem('role');
        console.log('� Role cleared - user logged out');
      }
    });
    
    console.log('🏁 History component initialization complete');
  }

  private initializeUserRole() {
    this.role = localStorage.getItem('role') || '';
    console.log('👤 Current role:', this.role);
    console.log('🔐 canEdit property:', this.canEdit);
    console.log('🛡️ isAdmin():', this.isAdmin());
    
    // Debug permission values
    const currentUser = localStorage.getItem('currentUser');
    console.log('👥 Current user:', currentUser);
    console.log('🔑 Permission values:', {
      role: this.role,
      canEdit: this.canEdit,
      isAdmin: this.isAdmin()
    });
  }

  private async loadHistoryData() {
    try {
      console.log('📡 Loading history from Firebase...');
      
      // Subscribe to Firebase history updates
      this.firebaseService.history$
        .pipe(takeUntil(this.destroy$))
        .subscribe(firebaseHistory => {
        if (firebaseHistory && firebaseHistory.length > 0) {
          console.log(`🔥 Firebase history loaded: ${firebaseHistory.length} matches`);
          this.history = firebaseHistory as MatchData[];
          this.clearCalculationCache();
          this.processHistoryData();
          
          // Sync to localStorage as backup
          localStorage.setItem('matchHistory', JSON.stringify(this.history));
          this.cdr.markForCheck();
        } else {
          // Fallback to localStorage if Firebase is empty or unavailable
          this.loadFromLocalStorage();
        }
      });
    } catch (error) {
      console.warn('⚠️ Firebase history not available, using localStorage:', error);
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage() {
    console.log('📦 Loading history from localStorage...');
    const matchHistoryData = localStorage.getItem('matchHistory');
    console.log('📦 Raw matchHistory from localStorage:', matchHistoryData);
    
    this.history = JSON.parse(matchHistoryData || '[]');
    console.log('📋 Parsed history array:', this.history);
    console.log('📊 History length:', this.history.length);
    
    this.processHistoryData();
    
    // Try to sync localStorage data to Firebase
    if (this.history.length > 0 && this.isAdmin()) {
      this.syncLocalToFirebase();
    }
  }

  private processHistoryData() {
    if (this.history.length) {
      console.log('✅ Found matches in history, processing...');
    } else {
      console.log('❌ No matches found in history');
      return;
    }
    
    this.history.forEach((m, index) => {
      console.log(`🏆 Processing match ${index + 1}:`, m);
      
      // Initialize thu mode if not set
      if (!m.thuMode) {
        m.thuMode = 'auto';
      }
      
      // Calculate financial data based on mode
      if (m.thuMode === 'manual') {
        m.thu = this.calcThuManual(m); // Calculate without saving during init
      } else {
        this.calcThu(m);
      }
      m.chi_total = this.calcChi(m); // Calculate without saving during init
    });
  }

  private async syncLocalToFirebase() {
    if (!this.isAdmin()) return;
    
    try {
      console.log('🔄 Syncing localStorage data to Firebase...');
      await this.firebaseService.syncLocalHistoryToFirebase(this.history);
      console.log('✅ Successfully synced to Firebase');
    } catch (error) {
      console.error('❌ Failed to sync to Firebase:', error);
    }
  }
  
  ngOnDestroy() {
    // Complete all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clear timeouts to prevent memory leaks
    this.saveTimeouts.forEach(timeout => clearTimeout(timeout));
    this.saveTimeouts.clear();
    
    // Clear caches
    this.calculationCache.clear();
    
    // Legacy subscription cleanup
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  
  // Simple edit methods (without reactive forms)
  saveMatch(match: MatchData): void {
    if (!this.canEdit || !this.isAdmin()) return;
    
    // Validate inputs
    if (match.scoreA < 0 || match.scoreB < 0) {
      alert('Tỷ số không thể âm');
      return;
    }
    
    // Recalculate finances after score change
    this.calcThu(match);
    this.clearCalculationCache();
    
    // Save match data
    this.saveMatchData(match, 'all');
    
    // Exit edit mode
    this.editingMatches.delete(match);
  }
  
  cancelEdit(match: MatchData): void {
    this.editingMatches.delete(match);
  }

  sumScore(team: Player[]): number {
    return team.reduce((sum, player) => {
      const scorerValue = (player as Player & { scorer?: number }).scorer;
      return sum + Number(scorerValue || 0);
    }, 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
}
