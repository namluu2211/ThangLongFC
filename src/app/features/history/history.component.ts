import { Component, OnInit, Input, inject, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { FirebaseHistoryService } from '../../core/services/firebase-history.service';
import { MatchService } from '../../core/services/match.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { StatisticsService } from '../../core/services/statistics.service';

import { take, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { MatchData, Player, AuthUser, CardType, FINANCIAL_RATES } from '../../models/types';
import { MatchInfo, MatchUpdateFields } from '../../core/models/match.model';
import { PlayerInfo } from '../../core/models/player.model';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./history.component.css'],
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

            
            <!-- Admin Firebase Actions -->
            <div class="admin-firebase-actions" *ngIf="isAdmin()">
              <button 
                class="btn btn-sm btn-primary" 
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
              
              <button 
                class="btn btn-sm btn-info" 
                (click)="syncFromFirebase()"
                title="Đồng bộ dữ liệu từ Firebase Realtime Database">
                <i class="fas fa-cloud-download-alt me-1"></i>
                Sync từ Firebase
              </button>
              
              <div class="firebase-status-indicator">
                <span class="badge" 
                      [class]="getFirebaseStatusClass()"
                      title="{{getFirebaseStatusText()}}">
                  <i class="fas fa-circle me-1"></i>
                  {{getFirebaseStatusText()}}
                </span>
              </div>
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
          <div *ngIf="deleteConfirm === m" class="modal-overlay"
               tabindex="0"
               (click)="deleteConfirm = null"
               (keydown)="handleDeleteConfirmKey($event)">
            <div class="delete-modal"
                 tabindex="0"
                 (click)="$event.stopPropagation()"
                 (keydown)="onDeleteModalKeydown($event)">
              <div class="modal-header">
                <h4>
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  Xác nhận xóa
                </h4>
                <button class="close-btn"
                        (click)="deleteConfirm = null"
                        tabindex="0"
                        (keydown)="onDeleteModalKeydown($event)">×</button>
              </div>
              <div class="modal-content">
                <p>Bạn có chắc chắn muốn xóa trận đấu này?</p>
                <p class="text-muted">
                  <small>Hành động này không thể hoàn tác.</small>
                </p>
              </div>
              <div class="modal-footer">
                <button class="btn-secondary"
                        (click)="deleteConfirm = null"
                        tabindex="0"
                        (keydown)="onDeleteModalKeydown($event)">
                  <i class="fas fa-times me-1"></i>
                  Hủy
                </button>
                <button class="btn-danger"
                        (click)="deleteMatch(m)"
                        tabindex="0"
                        (keydown)="onConfirmDeleteKeydown($event, m)">
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
})
export class HistoryComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  
  private authSubscription?: Subscription;
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private matchService = inject(MatchService);
  private dataStoreService = inject(DataStoreService);
  private statisticsService = inject(StatisticsService);
  
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
    return this.getMemoizedCalculation('totalRevenue', () => {
      // Use StatisticsService if available, fallback to manual calculation
      try {
        return this.history.reduce((total, m) => total + (m.thu || 0), 0);
      } catch (error) {
        console.warn('Using manual revenue calculation:', error);
        return this.history.reduce((total, m) => total + (m.thu || 0), 0);
      }
    });
  }

  getTotalExpenses(): number {
    return this.getMemoizedCalculation('totalExpenses', () => {
      try {
        return this.history.reduce((total, m) => total + this.calcChi(m), 0);
      } catch (error) {
        console.warn('Using manual expense calculation:', error);
        return this.history.reduce((total, m) => total + this.calcChi(m), 0);
      }
    });
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

  // Enhanced analytics using StatisticsService
  getFinancialAnalytics(): {
    totalRevenue: number;
    totalExpenses: number; 
    netProfit: number;
    averagePerMatch: number;
    profitMargin: number;
    totalMatches: number;
  } | null {
    try {
      // This could be enhanced to use StatisticsService.getFundAnalytics()
      return {
        totalRevenue: this.getTotalRevenue(),
        totalExpenses: this.getTotalExpenses(),
        netProfit: this.getNetProfit(),
        averagePerMatch: this.getAveragePerMatch(),
        profitMargin: this.getTotalRevenue() > 0 ? (this.getNetProfit() / this.getTotalRevenue()) * 100 : 0,
        totalMatches: this.history.length
      };
    } catch (error) {
      console.warn('Error calculating financial analytics:', error);
      return null;
    }
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

    if (this.isSyncingToFirebase) {
      alert('Đồng bộ đang diễn ra, vui lòng chờ...');
      return;
    }

    this.isSyncingToFirebase = true;

    try {
      console.log('🔄 Starting enhanced sync using core services...');
      this.saveStatus.set('sync', 'saving');
      this.cdr.markForCheck();
      
      // Use MatchService to sync all matches
      const allMatches = await this.matchService.matches$.pipe(take(1)).toPromise();
      if (allMatches && allMatches.length > 0) {
        console.log(`📊 Syncing ${allMatches.length} matches via MatchService...`);
        
        // The MatchService already handles Firebase sync internally
        // Just trigger a data refresh
        await this.dataStoreService.refreshAllData();
        
        this.saveStatus.set('sync', 'saved');
        this.cdr.markForCheck();
        console.log('✅ Enhanced sync completed via core services');
        alert('✅ Đã đồng bộ toàn bộ dữ liệu thông qua hệ thống core!');
      } else {
        // Fallback to legacy Firebase sync
        await this.legacyFirebaseSync();
      }
      
      setTimeout(() => {
        this.saveStatus.delete('sync');
        this.cdr.markForCheck();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Enhanced sync error:', error);
      this.saveStatus.set('sync', 'error');
      this.cdr.markForCheck();
      
      // Try fallback to legacy sync
      try {
        console.log('🔄 Falling back to legacy sync...');
        await this.legacyFirebaseSync();
        this.saveStatus.set('sync', 'saved');
        alert('✅ Đã đồng bộ bằng phương pháp dự phòng!');
      } catch (fallbackError) {
        console.error('❌ Fallback sync also failed:', fallbackError);
        let errorMessage = '❌ Lỗi khi đồng bộ dữ liệu!';
        if (error.message.includes('timeout')) {
          errorMessage = '❌ Đồng bộ quá lâu - kiểm tra kết nối mạng!';
        }
        alert(errorMessage);
      }
      
      setTimeout(() => {
        this.saveStatus.delete('sync');
        this.cdr.markForCheck();
      }, 3000);
    } finally {
      this.isSyncingToFirebase = false;
    }
  }

  private async legacyFirebaseSync(): Promise<void> {
    // Check Firebase connectivity first
    const isConnected = await this.checkFirebaseConnection();
    if (!isConnected) {
      throw new Error('Firebase connection failed');
    }
    
    // Legacy sync with timeout
    const historyEntries = this.convertMatchDataToHistoryEntries(this.history);
    const syncPromise = this.firebaseService.syncLocalHistoryToFirebase(historyEntries);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sync timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([syncPromise, timeoutPromise]);
  }

  // Helper method to check Firebase connection
  private async checkFirebaseConnection(): Promise<boolean> {
    try {
      // Try a simple read operation to test connectivity - get current history
      await this.firebaseService.getCurrentHistory();
      console.log('🔌 Firebase connection verified');
      return true;
    } catch (error) {
      console.error('🔌 Firebase connectivity check failed:', error);
      return false;
    }
  }

  // New Firebase Realtime Database sync method
  async syncFromFirebase(): Promise<void> {
    if (!this.isAdmin()) {
      alert('Chỉ admin mới có thể đồng bộ dữ liệu');
      return;
    }

    try {
      console.log('🔄 Starting sync from Firebase Realtime Database...');
      
      // Get Firebase service status
      const status = this.firebaseHistoryService.getStatus();
      console.log('📊 Firebase service status:', status);
      
      if (!status.isEnabled) {
        alert('⚠️ Firebase chưa được cấu hình. Kiểm tra file environment.ts');
        return;
      }
      
      if (!status.isConnected) {
        alert('❌ Không thể kết nối Firebase. Kiểm tra mạng internet.');
        return;
      }
      
      // Force refresh Firebase data
      await this.firebaseHistoryService.refreshHistory();
      
      // Get current Firebase data
      const firebaseHistory = this.firebaseHistoryService.getCurrentHistory();
      console.log(`📥 Found ${firebaseHistory.length} records in Firebase`);
      
      if (firebaseHistory.length === 0) {
        alert('ℹ️ Không tìm thấy dữ liệu trong Firebase Realtime Database');
        return;
      }
      
      // Show confirmation dialog
      const confirmSync = confirm(
        `Tìm thấy ${firebaseHistory.length} bản ghi trong Firebase.\n\n` +
        `Bạn có muốn đồng bộ dữ liệu này không?\n\n` +
        `Lưu ý: Dữ liệu hiện tại sẽ được ghi đè.`
      );
      
      if (!confirmSync) return;
      
      // Convert Firebase data to local format
      const convertedHistory = firebaseHistory.map(entry => this.convertFirebaseToLocal(entry));
      
      // Update local data
      this.history = convertedHistory;
      this.cdr.markForCheck();
      
      // Save to localStorage as backup
      localStorage.setItem('matchHistory', JSON.stringify(convertedHistory));
      
      console.log('✅ Firebase sync completed successfully');
      alert(`✅ Đã đồng bộ ${convertedHistory.length} trận đấu từ Firebase thành công!`);
      
    } catch (error) {
      console.error('❌ Error syncing from Firebase:', error);
      alert('❌ Lỗi khi đồng bộ từ Firebase: ' + error.message);
    }
  }

  // Convert Firebase history entry to local MatchData format
  private convertFirebaseToLocal(firebaseEntry: any): MatchData {
    // Convert team string arrays to Player objects if needed
    const convertTeam = (team: string[] | Player[] | undefined): Player[] => {
      if (!team) return [];
      return team.map((item: any) => {
        if (typeof item === 'string') {
          return { id: item, firstName: item, lastName: '', position: '' } as Player;
        }
        return item as Player;
      });
    };
    
    // Convert timestamp to string
    const convertTimestamp = (timestamp: any): string => {
      if (!timestamp) return new Date().toISOString();
      if (typeof timestamp === 'string') return timestamp;
      if (typeof timestamp === 'number') return new Date(timestamp).toISOString();
      if (timestamp instanceof Date) return timestamp.toISOString();
      return new Date().toISOString();
    };

    return {
      id: firebaseEntry.id || Date.now().toString(),
      date: firebaseEntry.date || new Date().toISOString(),
      teamA: convertTeam(firebaseEntry.teamA),
      teamB: convertTeam(firebaseEntry.teamB),
      scoreA: firebaseEntry.scoreA || 0,
      scoreB: firebaseEntry.scoreB || 0,
      scorerA: firebaseEntry.scorerA || '',
      scorerB: firebaseEntry.scorerB || '',
      assistA: firebaseEntry.assistA || '',
      assistB: firebaseEntry.assistB || '',
      yellowA: firebaseEntry.yellowA || '',
      yellowB: firebaseEntry.yellowB || '',
      redA: firebaseEntry.redA || '',
      redB: firebaseEntry.redB || '',
      
      // Financial data
      thu: firebaseEntry.thu || 0,
      thuMode: firebaseEntry.thuMode || 'auto',
      thu_main: firebaseEntry.thu_main || 0,
      thu_penalties: firebaseEntry.thu_penalties || 0,
      thu_other: firebaseEntry.thu_other || 0,
      
      chi_trongtai: firebaseEntry.chi_trongtai || 0,
      chi_nuoc: firebaseEntry.chi_nuoc || 0,
      chi_san: firebaseEntry.chi_san || 0,
      chi_dilai: firebaseEntry.chi_dilai || 0,
      chi_anuong: firebaseEntry.chi_anuong || 0,
      chi_khac: firebaseEntry.chi_khac || 0,
      chi_total: firebaseEntry.chi_total || 0,
      
      // Metadata
      lastSaved: convertTimestamp(firebaseEntry.updatedAt || firebaseEntry.lastSaved),
      updatedBy: firebaseEntry.updatedBy || 'firebase-sync'
    };
  }

  // Get Firebase service status for UI indicators
  getFirebaseStatusClass(): string {
    const status = this.firebaseHistoryService.getStatus();
    
    if (!status.isEnabled) return 'bg-secondary';
    if (!status.isConnected) return 'bg-danger';
    if (status.hasData) return 'bg-success';
    return 'bg-warning';
  }

  getFirebaseStatusText(): string {
    const status = this.firebaseHistoryService.getStatus();
    
    if (!status.isEnabled) return 'Chưa cấu hình';
    if (!status.isConnected) return 'Ngắt kết nối';
    if (status.hasData) return `${status.recordCount} bản ghi`;
    return 'Kết nối OK';
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
        
        // Use MatchService to update the match
        if (this.isAdmin()) {
          await this.updateMatchViaService(match, changeType);
        }
        
        // Set success status
        this.saveStatus.set(match, 'saved');
        console.log(`💾 Match ${changeType} data saved successfully via MatchService at ${match.lastSaved}`);

        // Clear success message after 2 seconds
        setTimeout(() => {
          this.saveStatus.delete(match);
        }, 2000);

      } catch (error) {
        console.error('❌ Error saving match data:', error);
        this.saveStatus.set(match, 'error');
        
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
          
          // Team and score data (convert Player[] to string[] for Firebase)
          teamA: match.teamA ? match.teamA.map(player => 
            typeof player === 'string' ? player : `${player.firstName} ${player.lastName || ''}`.trim()
          ) : [],
          teamB: match.teamB ? match.teamB.map(player => 
            typeof player === 'string' ? player : `${player.firstName} ${player.lastName || ''}`.trim()
          ) : [],
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
  
  // Sync protection flag
  private isSyncingToFirebase = false;
  
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

  handleDeleteConfirmKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.deleteConfirm = null;
    }
  }
  
  async deleteMatch(m: MatchData): Promise<void> {
    try {
      // Use MatchService to delete the match
      if (m.id && this.isAdmin()) {
        await this.matchService.deleteMatch(m.id);
        console.log('✅ Match deleted via MatchService');
      } else {
        // Fallback to local array manipulation
        const idx = this.history.indexOf(m);
        if (idx > -1) {
          this.history.splice(idx, 1);
          localStorage.setItem('matchHistory', JSON.stringify(this.history));
        }
      }
    } catch (error) {
      console.error('❌ Error deleting match:', error);
      alert('Lỗi khi xóa trận đấu. Vui lòng thử lại.');
    } finally {
      this.deleteConfirm = null;
    }
  }

  onDeleteModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
    }
  }

  getTeamNames(team: Player[]): string {
    return team.map(p => p.firstName || '').filter(x => x).join(', ');
  }
  
  history: MatchData[] = [];
  role = '';
  
  private firebaseAuthService = inject(FirebaseAuthService);
  private firebaseService = inject(FirebaseService);
  private firebaseHistoryService = inject(FirebaseHistoryService);
  
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
      console.log('📡 Loading match history using MatchService...');
      
      // Also sync with Firebase history service
      this.firebaseHistoryService.history$
        .pipe(takeUntil(this.destroy$))
        .subscribe(firebaseHistory => {
          console.log('🔥 Firebase history received:', firebaseHistory.length, 'entries');
          if (firebaseHistory.length > 0) {
            console.log('📋 Sample Firebase entry:', firebaseHistory[0]);
          }
        });
      
      // Subscribe to Firebase connection status
      this.firebaseHistoryService.connected$
        .pipe(takeUntil(this.destroy$))
        .subscribe(connected => {
          console.log('🔗 Firebase connection status:', connected ? 'Connected' : 'Disconnected');
        });
      
      // Subscribe to completed matches from MatchService
      this.matchService.completedMatches$
        .pipe(takeUntil(this.destroy$))
        .subscribe(completedMatches => {
          console.log(`🏆 Completed matches loaded: ${completedMatches.length} matches`);
          this.history = this.convertMatchInfoToMatchData(completedMatches);
          this.clearCalculationCache();
          this.processHistoryData();
          this.cdr.markForCheck();
        });
        
      // Also subscribe to fund updates for financial calculations
      this.dataStoreService.fund$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          console.log('💰 Funds updated, recalculating financial summaries...');
          this.clearCalculationCache();
          this.cdr.markForCheck();
        });
        
    } catch (error) {
      console.error('❌ Error loading match history:', error);
      // Fallback to localStorage if core services fail
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
    
    // Try to sync localStorage data to Firebase (with delay to avoid blocking UI)
    if (this.history.length > 0 && this.isAdmin()) {
      // Add a delay to prevent blocking the UI and avoid sync conflicts
      setTimeout(() => {
        console.log('🔄 Attempting delayed sync to Firebase...');
        this.syncLocalToFirebase();
      }, 2000);
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
    if (!this.isAdmin() || this.isSyncingToFirebase) return;
    
    this.isSyncingToFirebase = true;
    
    try {
      console.log('🔄 Syncing localStorage data to Firebase...');
      
      // Set a timeout to prevent infinite sync
      const historyEntries = this.convertMatchDataToHistoryEntries(this.history);
      const syncPromise = this.firebaseService.syncLocalHistoryToFirebase(historyEntries);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout')), 10000); // 10 second timeout
      });
      
      await Promise.race([syncPromise, timeoutPromise]);
      console.log('✅ Successfully synced to Firebase');
    } catch (error) {
      console.warn('⚠️ Failed to sync to Firebase (using localStorage only):', error.message);
      // Don't throw the error - just continue with localStorage data
    } finally {
      this.isSyncingToFirebase = false;
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

  private convertHistoryEntriesToMatchData(entries: HistoryEntry[]): MatchData[] {
    return entries.map(entry => {
      // Convert string arrays back to Player arrays if needed
      const teamA: Player[] = entry.teamA ? entry.teamA.map((name: string) => ({
        firstName: name,
        id: name.toLowerCase().replace(/\s+/g, '-')
      } as Player)) : [];
      
      const teamB: Player[] = entry.teamB ? entry.teamB.map((name: string) => ({
        firstName: name,
        id: name.toLowerCase().replace(/\s+/g, '-')
      } as Player)) : [];

      return {
        ...entry,
        teamA,
        teamB
      } as MatchData;
    });
  }

  private async updateMatchViaService(match: MatchData, changeType: string): Promise<void> {
    try {
      // Find the existing match in MatchService
      const existingMatch = await this.matchService.matches$.pipe(take(1)).toPromise();
      const matchToUpdate = existingMatch?.find(m => m.id === match.id);
      
      if (!matchToUpdate) {
        console.warn('Match not found in MatchService, saving to local storage as fallback');
        localStorage.setItem('matchHistory', JSON.stringify(this.history));
        return;
      }

      // Update financial data based on change type
      const updateFields: MatchUpdateFields = {
        finances: {
          ...matchToUpdate.finances,
          totalRevenue: match.thu || 0,
          revenueMode: match.thuMode || 'auto',
          revenue: {
            ...matchToUpdate.finances.revenue,
            winnerFees: match.thu_main || 0,
            cardPenalties: match.thu_penalties || 0,
            otherRevenue: match.thu_other || 0
          },
          expenses: {
            ...matchToUpdate.finances.expenses,
            referee: match.chi_trongtai || 0,
            water: match.chi_nuoc || 0,
            field: match.chi_san || 0,
            transportation: match.chi_dilai || 0,
            food: match.chi_anuong || 0,
            other: match.chi_khac || 0
          },
          totalExpenses: this.calcChi(match)
        }
      };

      // Update result if score changed
      if (changeType === 'all') {
        updateFields.result = {
          ...matchToUpdate.result,
          scoreA: match.scoreA || 0,
          scoreB: match.scoreB || 0
        };
      }

      // Use MatchService to update
      await this.matchService.updateMatch(match.id, updateFields);
      console.log('✅ Match updated via MatchService');
      
    } catch (error) {
      console.error('❌ Error updating match via service:', error);
      // Fallback to localStorage
      localStorage.setItem('matchHistory', JSON.stringify(this.history));
      throw error;
    }
  }

  private convertMatchInfoToMatchData(matchInfos: MatchInfo[]): MatchData[] {
    return matchInfos.map(matchInfo => {
      // Convert PlayerInfo to Player for backward compatibility
      const convertPlayers = (players: PlayerInfo[]): Player[] => {
        return players.map(player => ({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName || '',
          position: player.position || '',
          stats: {
            ...player.stats,
            gamesPlayed: player.stats?.totalMatches || 0
          }
        } as Player));
      };

      const teamA: Player[] = convertPlayers(matchInfo.teamA?.players || []);
      const teamB: Player[] = convertPlayers(matchInfo.teamB?.players || []);

      return {
        id: matchInfo.id,
        date: matchInfo.date,
        teamA: teamA,
        teamB: teamB,
        scoreA: matchInfo.result?.scoreA || 0,
        scoreB: matchInfo.result?.scoreB || 0,
        scorerA: matchInfo.result?.goalsA?.map(g => g.playerName).join(', ') || '',
        scorerB: matchInfo.result?.goalsB?.map(g => g.playerName).join(', ') || '',
        assistA: matchInfo.result?.goalsA?.map(g => g.assistedBy || '').join(', ') || '',
        assistB: matchInfo.result?.goalsB?.map(g => g.assistedBy || '').join(', ') || '',
        yellowA: matchInfo.result?.yellowCardsA?.join(', ') || '',
        yellowB: matchInfo.result?.yellowCardsB?.join(', ') || '',
        redA: matchInfo.result?.redCardsA?.join(', ') || '',
        redB: matchInfo.result?.redCardsB?.join(', ') || '',
        
        // Financial data using correct property names
        thu: matchInfo.finances?.totalRevenue || 0,
        thuMode: matchInfo.finances?.revenueMode || 'auto',
        thu_main: matchInfo.finances?.revenue?.winnerFees + matchInfo.finances?.revenue?.loserFees || 0,
        thu_penalties: matchInfo.finances?.revenue?.cardPenalties || 0,
        thu_other: matchInfo.finances?.revenue?.otherRevenue || 0,
        
        chi_trongtai: matchInfo.finances?.expenses?.referee || 0,
        chi_nuoc: matchInfo.finances?.expenses?.water || 0,
        chi_san: matchInfo.finances?.expenses?.field || 0,
        chi_dilai: matchInfo.finances?.expenses?.transportation || 0,
        chi_anuong: matchInfo.finances?.expenses?.food || 0,
        chi_khac: matchInfo.finances?.expenses?.other || 0,
        chi_total: matchInfo.finances?.totalExpenses || 0,
        
        // Additional properties for UI compatibility
        showAllExpenses: false,
        expenseErrors: {},
        lastSaved: matchInfo.updatedAt
      } as MatchData;
    });
  }

  private convertMatchDataToHistoryEntries(matches: MatchData[]): HistoryEntry[] {
    return matches.map(match => {
      // Convert Player arrays to string arrays for Firebase
      const teamA = match.teamA ? match.teamA.map(player => 
        typeof player === 'string' ? player : `${player.firstName} ${player.lastName || ''}`.trim()
      ) : [];
      
      const teamB = match.teamB ? match.teamB.map(player => 
        typeof player === 'string' ? player : `${player.firstName} ${player.lastName || ''}`.trim()
      ) : [];

      return {
        ...match,
        teamA,
        teamB
      } as HistoryEntry;
    });
  }

  onConfirmDeleteKeydown(event: KeyboardEvent, match: MatchData): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.deleteMatch(match);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
}
