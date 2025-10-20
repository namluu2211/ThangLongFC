import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../core/services/permission.service';
import { CanEditDirective } from '../../shared/can-edit.directive';
import { AdminConfig } from '../../config/admin.config';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { DevFirebaseAuthService } from '../../services/dev-firebase-auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, CanEditDirective],
  template: `
    <div class="history-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Lịch sử trận đấu</h1>
          <p class="page-subtitle">Xem lại các trận đấu đã qua và quản lý tài chính</p>
        </div>
        <div class="header-actions">
          <div class="match-count-badge">
            {{ filteredMatches.length }}/{{ matches.length }} trận đấu
          </div>
          <button class="sync-btn" (click)="syncData()">🔄 Sync Data</button>
          <button 
            class="fund-sync-btn" 
            (click)="syncFundFromHistory()" 
            [disabled]="isSyncingFund"
            *appCanEdit>
            {{ isSyncingFund ? '🔄 Đang sync...' : '💰 Sync Fund' }}
          </button>
          <button class="export-btn" (click)="exportData()">📤 Xuất dữ liệu</button>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <div class="filter-section" *ngIf="matches.length > 0">
        <div class="search-controls">
          <div class="search-group">
            <label for="history-search-input">🔍 Tìm kiếm</label>
            <input 
              id="history-search-input"
              type="text" 
              [(ngModel)]="searchTerm" 
              (input)="onSearchChange()"
              placeholder="Tìm theo ngày, cầu thủ ghi bàn..."
              class="search-input"
              aria-label="Tìm kiếm trận đấu">
          </div>
          
          <div class="filter-group">
            <label for="history-month-filter">📅 Tháng</label>
            <input 
              id="history-month-filter"
              type="month" 
              [(ngModel)]="dateFilter" 
              (change)="onDateFilterChange()"
              class="date-filter"
              aria-label="Lọc theo tháng">
          </div>
          
          <div class="filter-group">
            <label for="history-score-filter">🏆 Kết quả</label>
            <select 
              id="history-score-filter"
              [(ngModel)]="scoreFilter" 
              (change)="onScoreFilterChange()"
              class="score-filter"
              aria-label="Lọc theo kết quả trận đấu">
              <option value="all">Tất cả</option>
              <option value="win">Thắng</option>
              <option value="draw">Hòa</option>
              <option value="loss">Thua</option>
            </select>
          </div>
          
          <button 
            class="clear-filters-btn" 
            (click)="clearFilters()" 
            *ngIf="searchTerm || dateFilter || scoreFilter !== 'all'"
            aria-label="Xóa tất cả bộ lọc đang áp dụng"
          >
            🗑️ Xóa bộ lọc
          </button>
        </div>
      </div>

      <!-- Fund Sync Result -->
      <div class="fund-sync-result" *ngIf="showFundSyncResult" aria-live="polite" aria-atomic="true">
        <div class="sync-message">{{ fundSyncMessage }}</div>
      </div>

      <!-- Tổng quan tài chính Section -->
      <div class="financial-section">
        <div class="section-header">
          <h2 class="section-title">📈 Tổng quan tài chính</h2>
          <button class="collapse-btn">v</button>
        </div>
        
        <div class="financial-stats">
          <div class="stat-item revenue">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-amount">{{ getTotalRevenue() | number:'1.0-0' }} đ</div>
              <div class="stat-label">Tổng thu nhập</div>
              <div class="stat-detail">{{ matches.length }} trận đấu</div>
            </div>
          </div>
          
          <div class="stat-item expense">
            <div class="stat-icon">💸</div>
            <div class="stat-info">
              <div class="stat-amount">{{ getTotalExpenses() | number:'1.0-0' }} đ</div>
              <div class="stat-label">Tổng chi phí</div>
              <div class="stat-detail">Bao gồm sân, trọng tài, nước</div>
            </div>
          </div>
          
          <div class="stat-item balance" [class.positive]="getNetProfit() >= 0" [class.negative]="getNetProfit() < 0">
            <div class="stat-icon">⚖️</div>
            <div class="stat-info">
              <div class="stat-amount">{{ getNetProfit() | number:'1.0-0' }} đ</div>
              <div class="stat-label">Hòa vốn</div>
              <div class="stat-detail">Cân bằng thu chi</div>
            </div>
          </div>
        </div>
        
        <div class="average-stats">
          <div class="avg-item">
            <span class="avg-label">Trung bình/trận:</span>
            <span class="avg-value">{{ getAveragePerMatch() | number:'1.0-0' }} đ</span>
          </div>
          <div class="avg-item">
            <span class="avg-label">Thu trung bình:</span>
            <span class="avg-value">{{ getAverageRevenue() | number:'1.0-0' }} đ</span>
          </div>
          <div class="avg-item">
            <span class="avg-label">Chi trung bình:</span>
            <span class="avg-value">{{ getAverageExpensePerMatch() | number:'1.0-0' }} đ</span>
          </div>
        </div>
      </div>

      <!-- Kết quả trận đấu Section -->
      <div class="matches-section">
        <div class="section-header">
          <h2 class="section-title">Kết quả trận đấu</h2>
        </div>

  <div class="matches-list" *ngIf="!loading && filteredMatches.length > 0; else loadingOrEmpty">
          <!-- Date Groups -->
          <div class="date-group" *ngFor="let dateGroup of getMatchesByDate(); trackBy: trackByDateGroup">
            <!-- Date Group Header -->
            <div 
              class="date-group-header"
              [class.collapsed]="isDateCollapsed(dateGroup.date)"
              (click)="toggleDateCollapse(dateGroup.date)"
              (keydown)="toggleDateCollapse(dateGroup.date, $event)"
              tabindex="0"
              role="button"
              [attr.aria-expanded]="!isDateCollapsed(dateGroup.date)"
              [attr.aria-controls]="'date-group-' + dateGroup.date"
              [attr.aria-label]="'Toggle matches for ' + getDateDisplayText(dateGroup.date)">
              
              <div class="date-header-content">
                <h3 class="date-title">{{ getDateDisplayText(dateGroup.date) }}</h3>
                <span class="match-count">{{ getMatchCountForDate(dateGroup.matches) }}</span>
              </div>
              
              <div class="collapse-indicator">
                <span class="collapse-icon" [attr.aria-hidden]="true">
                  {{ isDateCollapsed(dateGroup.date) ? '▶' : '▼' }}
                </span>
              </div>
            </div>

            <!-- Date Group Content -->
            <div 
              class="date-group-content"
              [class.collapsed]="isDateCollapsed(dateGroup.date)"
              [id]="'date-group-' + dateGroup.date"
              [attr.aria-hidden]="isDateCollapsed(dateGroup.date)">
              
              <!-- Individual match cards for this date -->
              <div class="match-card" *ngFor="let match of dateGroup.matches; trackBy: trackByMatchId">
            <!-- Match Date -->
            <div class="match-date-header">
              <span class="date-text">{{ formatMatchDate(match.date) }}</span>
              <div class="match-actions" *appCanEdit>
                <button class="action-btn edit" (click)="editMatch(match)" title="Chỉnh sửa trận đấu">✏️</button>
                <button class="action-btn delete" (click)="confirmDeleteMatch(match)" title="Xóa trận đấu">🗑️</button>
              </div>
            </div>

            <!-- Score Display -->
            <div class="score-display">
              <div class="team team-blue">
                <div class="team-name">Đội Xanh</div>
                <div class="team-score">{{ match.scoreA || 0 }}</div>
              </div>
              
              <div class="vs-divider">VS</div>
              
              <div class="team team-orange">
                <div class="team-name">Đội Cam</div>
                <div class="team-score">{{ match.scoreB || 0 }}</div>
              </div>
            </div>
            
            <!-- Team Players -->
            <div class="teams-display" *ngIf="match.teamA || match.teamB">
              <div class="team-players blue">
                <div class="team-header">
                  <span class="team-dot blue-dot"></span>
                  Đội Xanh ({{ getTeamSize(match.teamA) }})
                </div>
                <div class="players-grid">
                  <span class="player-tag" *ngFor="let player of match.teamA">{{ player }}</span>
                </div>
              </div>
              
              <div class="team-players orange">
                <div class="team-header">
                  <span class="team-dot orange-dot"></span>
                  Đội Cam ({{ getTeamSize(match.teamB) }})
                </div>
                <div class="players-grid">
                  <span class="player-tag" *ngFor="let player of match.teamB">{{ player }}</span>
                </div>
              </div>
            </div>

            <!-- Match Statistics -->
            <div class="match-statistics" *ngIf="getGoalScorers(match, 'A') || getGoalScorers(match, 'B') || getAssists(match, 'A') || getAssists(match, 'B') || getCards(match, 'A', 'yellow') || getCards(match, 'B', 'yellow') || getCards(match, 'A', 'red') || getCards(match, 'B', 'red')">
              <div class="stats-header">
                <span class="stats-title">📊 Thống kê trận đấu</span>
              </div>
              
              <div class="stats-content">
                <!-- Goals Section -->
                <div class="stat-section" *ngIf="getGoalScorers(match, 'A') || getGoalScorers(match, 'B')">
                  <div class="stat-title">
                    <i class="fas fa-futbol"></i>
                    Bàn thắng
                  </div>
                  <div class="stat-teams">
                    <div class="team-stat blue" *ngIf="getGoalScorers(match, 'A')">
                      <span class="team-label">Đội Xanh:</span>
                      <span class="stat-value">{{ getGoalScorers(match, 'A') }}</span>
                    </div>
                    <div class="team-stat orange" *ngIf="getGoalScorers(match, 'B')">
                      <span class="team-label">Đội Cam:</span>
                      <span class="stat-value">{{ getGoalScorers(match, 'B') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Assists Section -->
                <div class="stat-section" *ngIf="getAssists(match, 'A') || getAssists(match, 'B')">
                  <div class="stat-title">
                    <i class="fas fa-hands-helping"></i>
                    Kiến tạo
                  </div>
                  <div class="stat-teams">
                    <div class="team-stat blue" *ngIf="getAssists(match, 'A')">
                      <span class="team-label">Đội Xanh:</span>
                      <span class="stat-value">{{ getAssists(match, 'A') }}</span>
                    </div>
                    <div class="team-stat orange" *ngIf="getAssists(match, 'B')">
                      <span class="team-label">Đội Cam:</span>
                      <span class="stat-value">{{ getAssists(match, 'B') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Yellow Cards Section -->
                <div class="stat-section" *ngIf="getCards(match, 'A', 'yellow') || getCards(match, 'B', 'yellow')">
                  <div class="stat-title">
                    <i class="fas fa-square text-warning"></i>
                    Thẻ vàng
                  </div>
                  <div class="stat-teams">
                    <div class="team-stat blue" *ngIf="getCards(match, 'A', 'yellow')">
                      <span class="team-label">Đội Xanh:</span>
                      <span class="stat-value">{{ getCards(match, 'A', 'yellow') }}</span>
                    </div>
                    <div class="team-stat orange" *ngIf="getCards(match, 'B', 'yellow')">
                      <span class="team-label">Đội Cam:</span>
                      <span class="stat-value">{{ getCards(match, 'B', 'yellow') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Red Cards Section -->
                <div class="stat-section" *ngIf="getCards(match, 'A', 'red') || getCards(match, 'B', 'red')">
                  <div class="stat-title">
                    <i class="fas fa-square text-danger"></i>
                    Thẻ đỏ
                  </div>
                  <div class="stat-teams">
                    <div class="team-stat blue" *ngIf="getCards(match, 'A', 'red')">
                      <span class="team-label">Đội Xanh:</span>
                      <span class="stat-value">{{ getCards(match, 'A', 'red') }}</span>
                    </div>
                    <div class="team-stat orange" *ngIf="getCards(match, 'B', 'red')">
                      <span class="team-label">Đội Cam:</span>
                      <span class="stat-value">{{ getCards(match, 'B', 'red') }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Financial Info -->
            <div class="match-finance" *ngIf="match.thu || match.chi_total">
              <div class="finance-header">
                <span class="finance-title">Tài chính</span>
                <span class="finance-summary">
                  Thu: {{ match.thu | number:'1.0-0' }} đ | Chi: {{ match.chi_total | number:'1.0-0' }} đ
                </span>
              </div>
              
              <div class="finance-details">
                <div class="finance-group income">
                  <h4>Thu nhập</h4>
                  <div class="finance-row">
                    <span>Thu chính:</span>
                    <span>{{ match.thu_main || match.thu || 0 | number:'1.0-0' }} đ</span>
                  </div>
                  <div class="finance-total">
                    <strong>Tổng: {{ match.thu | number:'1.0-0' }} đ</strong>
                  </div>
                </div>
                
                <div class="finance-group expense">
                  <h4>Chi phí</h4>
                  <div class="finance-row" *ngIf="match.chi_san">
                    <span>Sân:</span>
                    <span>{{ match.chi_san | number:'1.0-0' }} đ</span>
                  </div>
                  <div class="finance-row" *ngIf="match.chi_trongtai">
                    <span>Trọng tài:</span>
                    <span>{{ match.chi_trongtai | number:'1.0-0' }} đ</span>
                  </div>
                  <div class="finance-row" *ngIf="match.chi_nuoc">
                    <span>Nước:</span>
                    <span>{{ match.chi_nuoc | number:'1.0-0' }} đ</span>
                  </div>
                  <div class="finance-total">
                    <strong>Tổng: {{ match.chi_total | number:'1.0-0' }} đ</strong>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading / Empty State -->
        <ng-template #loadingOrEmpty>
          <div *ngIf="loading" class="skeleton-list">
            <div class="skeleton-card" *ngFor="let s of skeletonArray">
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-line w-30"></div>
            </div>
          </div>
          <div *ngIf="!loading" class="empty-state">
            <div class="empty-icon">🏆</div>
            <h3>Chưa có lịch sử trận đấu</h3>
            <p>Bắt đầu thi đấu để xem lịch sử và phân tích tài chính tại đây.</p>
          </div>
        </ng-template>
      </div>
      
      <!-- Edit Match Modal -->
  <div class="modal-overlay" *ngIf="showEditModal && canEdit" (click)="cancelEdit()" tabindex="0" (keydown)="onOverlayKey($event)">
        <div class="modal-content edit-modal" (click)="$event.stopPropagation()" tabindex="0" (keydown)="onModalKey($event)">
          <div class="modal-header">
            <h3>✏️ Chỉnh sửa trận đấu</h3>
            <button class="close-btn" (click)="cancelEdit()">&times;</button>
          </div>
          
          <div class="modal-body">
            <form>
              <!-- Date and Score Section -->
              <div class="form-section">
                <h4>Thông tin trận đấu</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-date">Ngày thi đấu</label>
                    <input id="edit-date" type="date" [(ngModel)]="editFormData.date" name="date" class="form-control">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-scoreA">Tỷ số Đội Xanh</label>
                    <input id="edit-scoreA" type="number" [(ngModel)]="editFormData.scoreA" name="scoreA" class="form-control" min="0">
                  </div>
                  <div class="form-group">
                    <label for="edit-scoreB">Tỷ số Đội Cam</label>
                    <input id="edit-scoreB" type="number" [(ngModel)]="editFormData.scoreB" name="scoreB" class="form-control" min="0">
                  </div>
                </div>
              </div>

              <!-- Scorers and Assists Section -->
              <div class="form-section">
                <h4>Ghi bàn và Kiến tạo</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-scorerA">Ghi bàn Đội Xanh</label>
                    <input id="edit-scorerA" type="text" [(ngModel)]="editFormData.scorerA" name="scorerA" class="form-control" placeholder="Tên cầu thủ ghi bàn">
                  </div>
                  <div class="form-group">
                    <label for="edit-assistA">Kiến tạo Đội Xanh</label>
                    <input id="edit-assistA" type="text" [(ngModel)]="editFormData.assistA" name="assistA" class="form-control" placeholder="Tên cầu thủ kiến tạo">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-scorerB">Ghi bàn Đội Cam</label>
                    <input id="edit-scorerB" type="text" [(ngModel)]="editFormData.scorerB" name="scorerB" class="form-control" placeholder="Tên cầu thủ ghi bàn">
                  </div>
                  <div class="form-group">
                    <label for="edit-assistB">Kiến tạo Đội Cam</label>
                    <input id="edit-assistB" type="text" [(ngModel)]="editFormData.assistB" name="assistB" class="form-control" placeholder="Tên cầu thủ kiến tạo">
                  </div>
                </div>
              </div>

              <!-- Cards Section -->
              <div class="form-section">
                <h4>Thẻ phạt</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-yellowA">Thẻ vàng Đội Xanh</label>
                    <input id="edit-yellowA" type="text" [(ngModel)]="editFormData.yellowA" name="yellowA" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ vàng">
                  </div>
                  <div class="form-group">
                    <label for="edit-yellowB">Thẻ vàng Đội Cam</label>
                    <input id="edit-yellowB" type="text" [(ngModel)]="editFormData.yellowB" name="yellowB" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ vàng">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-redA">Thẻ đỏ Đội Xanh</label>
                    <input id="edit-redA" type="text" [(ngModel)]="editFormData.redA" name="redA" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ đỏ">
                  </div>
                  <div class="form-group">
                    <label for="edit-redB">Thẻ đỏ Đội Cam</label>
                    <input id="edit-redB" type="text" [(ngModel)]="editFormData.redB" name="redB" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ đỏ">
                  </div>
                </div>
              </div>

              <!-- Financial Section -->
              <div class="form-section">
                <h4>Tài chính</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-thu">Tổng thu (đ)</label>
                    <input id="edit-thu" type="number" [(ngModel)]="editFormData.thu" name="thu" class="form-control" min="0">
                  </div>
                  <div class="form-group">
                    <label for="edit-chi_total">Tổng chi (đ)</label>
                    <input id="edit-chi_total" type="number" [(ngModel)]="editFormData.chi_total" name="chi_total" class="form-control" min="0">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-chi_san">Chi sân (đ)</label>
                    <input id="edit-chi_san" type="number" [(ngModel)]="editFormData.chi_san" name="chi_san" class="form-control" min="0">
                  </div>
                  <div class="form-group">
                    <label for="edit-chi_trongtai">Chi trọng tài (đ)</label>
                    <input id="edit-chi_trongtai" type="number" [(ngModel)]="editFormData.chi_trongtai" name="chi_trongtai" class="form-control" min="0">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-chi_nuoc">Chi nước (đ)</label>
                    <input id="edit-chi_nuoc" type="number" [(ngModel)]="editFormData.chi_nuoc" name="chi_nuoc" class="form-control" min="0">
                  </div>
                </div>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Hủy</button>
            <button type="button" class="btn btn-primary" (click)="saveEditedMatch()">💾 Lưu thay đổi</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
  <div class="modal-overlay" *ngIf="showDeleteModal && canEdit" (click)="cancelDelete()" tabindex="0" (keydown)="onOverlayKey($event)">
        <div class="modal-content delete-modal" (click)="$event.stopPropagation()" tabindex="0" (keydown)="onModalKey($event)">
          <div class="modal-header">
            <h3>🗑️ Xác nhận xóa</h3>
            <button class="close-btn" (click)="cancelDelete()">&times;</button>
          </div>
          
          <div class="modal-body">
            <p>Bạn có chắc chắn muốn xóa trận đấu này không?</p>
            <div class="match-info" *ngIf="matchToDelete">
              <strong>Ngày:</strong> {{ formatMatchDate(matchToDelete.date) }}<br>
              <strong>Tỷ số:</strong> {{ matchToDelete.scoreA || 0 }} - {{ matchToDelete.scoreB || 0 }}
            </div>
            <p class="warning-text">⚠️ Hành động này không thể hoàn tác!</p>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancelDelete()">Hủy</button>
            <button type="button" class="btn btn-danger" (click)="deleteMatch()">🗑️ Xóa</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./history.component.css'],
  styles: [`
    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .edit-modal {
      width: 800px;
    }
    
    .delete-modal {
      width: 400px;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
    }
    
    .modal-header h3 {
      margin: 0;
      font-size: 1.2rem;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    }
    
    .close-btn:hover {
      color: #333;
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #eee;
    }
    
    .form-section {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      background: #f8f9fa;
    }
    
    .form-section h4 {
      margin: 0 0 16px 0;
      color: #495057;
      font-size: 1rem;
    }
    
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .form-group {
      flex: 1;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      color: #495057;
    }
    
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    
    .btn-primary {
      background: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    .btn:hover {
      opacity: 0.9;
    }
    
    .match-info {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin: 16px 0;
    }
    
    .warning-text {
      color: #dc3545;
      font-weight: 500;
      margin: 16px 0 0 0;
    }
    
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .action-btn:hover {
      background: rgba(0, 0, 0, 0.1);
    }
    
    .action-btn.edit {
      color: #007bff;
    }
    
    .action-btn.delete {
      color: #dc3545;
    }
    
    /* Search and Filter Styles */
    .filter-section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .search-controls {
      display: flex;
      gap: 16px;
      align-items: end;
      flex-wrap: wrap;
    }
    
    .search-group,
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 180px;
    }
    
    .search-group label,
    .filter-group label {
      font-weight: 500;
      color: #495057;
      font-size: 14px;
    }
    
    .search-input,
    .date-filter,
    .score-filter {
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .search-input:focus,
    .date-filter:focus,
    .score-filter:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    .clear-filters-btn {
      padding: 8px 16px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      height: fit-content;
    }
    
    .clear-filters-btn:hover {
      background: #5a6268;
    }
    
    /* Fund Sync Styles */
    .fund-sync-btn {
      padding: 8px 16px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .fund-sync-btn:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
    }
    
    .fund-sync-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
      opacity: 0.7;
    }
    
    .fund-sync-result {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      animation: slideInDown 0.5s ease-out;
    }

    /* Status & Debug */
    .status-bar {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 8px 12px;
      background: #f1f3f5;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 12px;
    }
    .listener-status {
      padding: 4px 8px;
      border-radius: 6px;
      background: #adb5bd;
      color: #fff;
      font-weight: 500;
    }
    .listener-status.active { background: #28a745; }
    .force-refresh-btn, .toggle-debug-btn {
      background: #0d6efd;
      color: #fff;
      border: none;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .force-refresh-btn:hover, .toggle-debug-btn:hover { opacity: .85; }
    .debug-panel { margin-bottom: 16px; }
    .debug-output {
      background: #212529;
      color: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      max-height: 300px;
      overflow: auto;
      line-height: 1.4;
    }
    /* Skeleton */
    .skeleton-list { display: grid; gap: 12px; }
    .skeleton-card { background:#fff; border:1px solid #e9ecef; padding:16px; border-radius:8px; }
    .skeleton-line { height:12px; background:linear-gradient(90deg,#e9ecef 25%,#f8f9fa 50%,#e9ecef 75%); background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:4px; margin-bottom:10px; }
    .skeleton-line.w-40{width:40%;} .skeleton-line.w-60{width:60%;} .skeleton-line.w-30{width:30%;}
    @keyframes shimmer { from{background-position:200% 0;} to{background-position:-200% 0;} }
    
    .sync-message {
      white-space: pre-line;
      font-weight: 500;
      line-height: 1.5;
    }
    
    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Date Group Styles */
    .date-group {
      margin-bottom: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .date-group:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .date-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-bottom: 1px solid #e9ecef;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .date-group-header:hover {
      background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
    }

    .date-group-header:focus {
      outline: 2px solid #007bff;
      outline-offset: -2px;
    }

    .date-group-header.collapsed {
      border-bottom: none;
    }

    .date-header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .date-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
    }

    .match-count {
      background: #007bff;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .collapse-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    }

    .date-group-header.collapsed .collapse-indicator {
      transform: rotate(-90deg);
    }

    .collapse-icon {
      font-size: 1.2rem;
      color: #6c757d;
      font-weight: bold;
    }

    .date-group-content {
      padding: 0;
      max-height: 2000px;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1;
    }

    .date-group-content.collapsed {
      max-height: 0;
      padding: 0;
      opacity: 0;
    }

    .date-group-content .match-card {
      margin: 16px 20px;
      border-radius: 8px;
    }

    .date-group-content .match-card:last-child {
      margin-bottom: 20px;
    }
    
    @media (max-width: 768px) {
      .search-controls {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-group,
      .filter-group {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class HistoryComponent implements OnInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  private dataStore = inject(DataStoreService);
  private firebaseAuth = inject(FirebaseAuthService);
  private devAuth = inject(DevFirebaseAuthService);
  private router = inject(Router);
  private permission = inject(PermissionService);
  
  // Removed external canEdit input; compute internally based on admin roles.
  // canEdit true for admin or superadmin with write permission
  canEdit = false;
  
  matches: HistoryEntry[] = [];
  filteredMatches: HistoryEntry[] = [];
  loading = false;
  showDeleteModal = false;
  matchToDelete: HistoryEntry | null = null;
  
  // Edit modal properties
  showEditModal = false;
  matchToEdit: HistoryEntry | null = null;
  editFormData: Partial<HistoryEntry> = {};
  
  // Search and filter properties
  searchTerm = '';
  dateFilter = '';
  scoreFilter = 'all'; // 'all', 'win', 'loss', 'draw'
  
  // Fund sync properties
  isSyncingFund = false;
  fundSyncMessage = '';
  showFundSyncResult = false;

  // Collapse state properties for date groups
  dateCollapseStates: Record<string, boolean> = {};
  private readonly COLLAPSE_STATES_KEY = 'history_date_collapse_states';

  // Skeleton loading placeholder
  skeletonArray = Array.from({ length: 5 });

  ngOnInit(): void {
    // Centralized permission subscription only
    this.permission.canEditChanges().subscribe(can => this.canEdit = can);
    // Deferred Firebase listeners: ensure history listener is attached only when History route is active
    // Await async attachment to avoid race with lazy core initialization
    (async () => {
      try {
        await this.firebaseService.attachHistoryListener();
        await this.loadMatches();
      } catch (e) {
        console.error('❌ Failed to initialize history listener:', e);
      }
    })();
    this.loadCollapseStates();
  }

  // Legacy evaluatePermissions removed in favor of centralized PermissionService.

  private historySub: ReturnType<typeof this.firebaseService.history$.subscribe> | null = null;

  async loadMatches(): Promise<void> {
    try {
      this.loading = true;
      console.log('🔄 Subscribing to live match history stream...');
      if (this.historySub) {
        this.historySub.unsubscribe();
      }
      this.historySub = this.firebaseService.history$.subscribe({
        next: (historyData) => {
          console.log('📊 Live history update:', historyData.length, 'matches');
          this.matches = [...historyData];
          this.matches.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ History stream error:', error);
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('❌ Error initializing history subscription:', error);
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.historySub) {
      this.historySub.unsubscribe();
      this.historySub = null;
    }
  }

  trackByMatchId(index: number, match: HistoryEntry): string {
    return match.id || index.toString();
  }

  trackByDateGroup(index: number, group: { date: string; matches: HistoryEntry[] }): string {
    return group.date;
  }

  formatMatchDate(date: string | undefined): string {
    if (!date) return 'Unknown Date';
    try {
      const matchDate = new Date(date);
      return matchDate.toLocaleDateString('vi-VN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  }

  getTotalRevenue(): number {
    return this.matches.reduce((total, match) => total + (match.thu || 0), 0);
  }

  getTotalExpenses(): number {
    return this.matches.reduce((total, match) => total + (match.chi_total || 0), 0);
  }

  getNetProfit(): number {
    return this.getTotalRevenue() - this.getTotalExpenses();
  }

  getMatchRevenue(match: HistoryEntry): number {
    return match.thu || 0;
  }

  getMatchExpenses(match: HistoryEntry): number {
    return match.chi_total || 0;
  }

  getMatchResultClass(match: HistoryEntry): string {
    const scoreA = match.scoreA || 0;
    const scoreB = match.scoreB || 0;
    
    if (scoreA > scoreB) return 'win';
    if (scoreB > scoreA) return 'loss';
    return 'draw';
  }

  getMatchResultText(match: HistoryEntry): string {
    const scoreA = match.scoreA || 0;
    const scoreB = match.scoreB || 0;
    
    if (scoreA > scoreB) return 'Win';
    if (scoreB > scoreA) return 'Loss';
    return 'Draw';
  }

  // Financial calculation methods
  getRevenuePercentage(): number {
    const total = this.getTotalRevenue() + this.getTotalExpenses();
    return total > 0 ? (this.getTotalRevenue() / total) * 100 : 0;
  }

  getExpensePercentage(): number {
    const total = this.getTotalRevenue() + this.getTotalExpenses();
    return total > 0 ? (this.getTotalExpenses() / total) * 100 : 0;
  }

  getBalancePercentage(): number {
    return 100 - this.getRevenuePercentage() - this.getExpensePercentage();
  }

  getAveragePerMatch(): number {
    return this.matches.length > 0 ? this.getNetProfit() / this.matches.length : 0;
  }

  getAverageRevenue(): number {
    return this.matches.length > 0 ? this.getTotalRevenue() / this.matches.length : 0;
  }

  getAverageExpensePerMatch(): number {
    return this.matches.length > 0 ? this.getTotalExpenses() / this.matches.length : 0;
  }

  // Team methods
  getTeamSize(team: string[] | undefined, match?: HistoryEntry, side?: 'A'|'B'): number {
    if (Array.isArray(team) && team.length) return team.length;
    if (match && side) {
      // Narrow match to extended shape without using any
      type ExtendedHistory = HistoryEntry & {
        teamA_ids?: (string|number)[]; teamB_ids?: (string|number)[];
        teamA_full?: { id?: string|number }[]; teamB_full?: { id?: string|number }[];
      };
      const ext = match as ExtendedHistory;
      const ids = side==='A'? ext.teamA_ids : ext.teamB_ids;
      if (Array.isArray(ids) && ids.length) return ids.length;
      const full = side==='A'? ext.teamA_full : ext.teamB_full;
      if (Array.isArray(full) && full.length) return full.length;
    }
    return 0;
  }

  getGoalScorers(match: HistoryEntry, team: 'A' | 'B'): string {
    const scorer = team === 'A' ? match.scorerA : match.scorerB;
    return scorer || '';
  }

  getAssists(match: HistoryEntry, team: 'A' | 'B'): string {
    const assist = team === 'A' ? match.assistA : match.assistB;
    return assist || '';
  }

  getCards(match: HistoryEntry, team: 'A' | 'B', type: 'yellow' | 'red'): string {
    if (type === 'yellow') {
      return team === 'A' ? (match.yellowA || '') : (match.yellowB || '');
    } else {
      return team === 'A' ? (match.redA || '') : (match.redB || '');
    }
  }

  editMatch(match: HistoryEntry): void {
    if (!this.canEdit) {
      console.warn('❌ Edit not allowed - insufficient permissions');
      return;
    }

    console.log('📝 Opening edit modal for match:', match.id);
    this.matchToEdit = match;
    this.editFormData = {
      date: match.date,
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
      thu: match.thu || 0,
      chi_total: match.chi_total || 0,
      chi_san: match.chi_san || 0,
      chi_trongtai: match.chi_trongtai || 0,
      chi_nuoc: match.chi_nuoc || 0
    };
    this.showEditModal = true;
  }

  confirmDeleteMatch(match: HistoryEntry): void {
    if (!this.canEdit) {
      console.warn('❌ Delete not allowed - insufficient permissions');
      return;
    }

    if (!match.id) {
      console.error('❌ Cannot delete match without ID');
      return;
    }

    console.log('🗑️ Confirming delete for match:', match.id);
    this.matchToDelete = match;
    this.showDeleteModal = true;
  }

  async saveEditedMatch(): Promise<void> {
    if (!this.matchToEdit?.id || !this.editFormData) {
      console.error('❌ Invalid match data for update');
      return;
    }

    // Basic validation
    const validation = this.validateEditForm();
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.errors);
      alert(`Dữ liệu không hợp lệ:\n${validation.errors.join('\n')}`);
      return;
    }

    try {
      console.log('💾 Saving edited match:', this.matchToEdit.id, this.editFormData);
      
      // Ensure numeric fields are properly converted
      const updateData = {
        ...this.editFormData,
        scoreA: Number(this.editFormData.scoreA || 0),
        scoreB: Number(this.editFormData.scoreB || 0),
        thu: Number(this.editFormData.thu || 0),
        chi_total: Number(this.editFormData.chi_total || 0),
        chi_san: Number(this.editFormData.chi_san || 0),
        chi_trongtai: Number(this.editFormData.chi_trongtai || 0),
        chi_nuoc: Number(this.editFormData.chi_nuoc || 0)
      };
      
      await this.firebaseService.updateHistoryEntry(this.matchToEdit.id, updateData);
      
      this.showEditModal = false;
      this.matchToEdit = null;
      this.editFormData = {};
      
      console.log('✅ Match updated successfully');
    } catch (error) {
      console.error('❌ Error updating match:', error);
      alert('Có lỗi xảy ra khi cập nhật trận đấu. Vui lòng thử lại.');
    }
  }

  cancelEdit(): void {
    this.showEditModal = false;
    this.matchToEdit = null;
    this.editFormData = {};
  }

  async deleteMatch(): Promise<void> {
    if (!this.matchToDelete?.id) return;

    try {
      console.log('🗑️ Deleting match:', this.matchToDelete.id);
      await this.firebaseService.deleteHistoryEntry(this.matchToDelete.id);
      
      this.showDeleteModal = false;
      this.matchToDelete = null;
      
      console.log('✅ Match deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting match:', error);
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.matchToDelete = null;
  }

  // Accessibility handlers for modal overlays
  onOverlayKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showEditModal) this.cancelEdit();
      if (this.showDeleteModal) this.cancelDelete();
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (this.showEditModal) this.cancelEdit();
    }
  }

  onModalKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showEditModal) {
      this.cancelEdit();
    }
  }

  private validateEditForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!this.editFormData.date) {
      errors.push('Ngày thi đấu không được để trống');
    }

    // Validate numeric fields
    const scoreA = Number(this.editFormData.scoreA);
    const scoreB = Number(this.editFormData.scoreB);
    
    if (scoreA < 0) errors.push('Tỷ số Đội Xanh không được âm');
    if (scoreB < 0) errors.push('Tỷ số Đội Cam không được âm');
    
    // Validate financial fields
    const thu = Number(this.editFormData.thu || 0);
    const chiTotal = Number(this.editFormData.chi_total || 0);
    
    if (thu < 0) errors.push('Tổng thu không được âm');
    if (chiTotal < 0) errors.push('Tổng chi không được âm');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async syncData(): Promise<void> {
    await this.loadMatches();
  }

  applyFilters(): void {
    let filtered = [...this.matches];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(match => 
        this.formatMatchDate(match.date).toLowerCase().includes(searchLower) ||
        (match.scorerA && match.scorerA.toLowerCase().includes(searchLower)) ||
        (match.scorerB && match.scorerB.toLowerCase().includes(searchLower)) ||
        (match.assistA && match.assistA.toLowerCase().includes(searchLower)) ||
        (match.assistB && match.assistB.toLowerCase().includes(searchLower))
      );
    }

    // Apply date filter
    if (this.dateFilter) {
      const filterDate = new Date(this.dateFilter);
      const filterYear = filterDate.getFullYear();
      const filterMonth = filterDate.getMonth();
      
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.date || '');
        return matchDate.getFullYear() === filterYear && 
               matchDate.getMonth() === filterMonth;
      });
    }

    // Apply score result filter
    if (this.scoreFilter !== 'all') {
      filtered = filtered.filter(match => {
        const scoreA = match.scoreA || 0;
        const scoreB = match.scoreB || 0;
        
        switch (this.scoreFilter) {
          case 'win':
            return scoreA > scoreB;
          case 'loss':
            return scoreB > scoreA;
          case 'draw':
            return scoreA === scoreB;
          default:
            return true;
        }
      });
    }

    this.filteredMatches = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onDateFilterChange(): void {
    this.applyFilters();
  }

  onScoreFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.dateFilter = '';
    this.scoreFilter = 'all';
    this.applyFilters();
  }

  async syncFundFromHistory(): Promise<void> {
    if (!this.canEdit) {
      console.warn('❌ Fund sync not allowed - insufficient permissions');
      return;
    }

    try {
      this.isSyncingFund = true;
      this.fundSyncMessage = 'Đang đồng bộ quỹ từ lịch sử trận đấu...';
      
      console.log('💰 Starting fund sync from match history...');
      console.log('📊 Processing', this.matches.length, 'matches for fund sync');

      const result = await this.dataStore.syncFundWithMatchHistory(this.matches);
      
      let message = '';
      if (result.transactionsAdded > 0) {
        message = `✅ Đã thêm ${result.transactionsAdded} giao dịch từ lịch sử trận đấu`;
        
        // Also recalculate fund balance to ensure accuracy
        const balanceResult = await this.dataStore.recalculateFundBalanceFromHistory();
        message += `\n💰 Số dư quỹ: ${balanceResult.oldBalance.toLocaleString()} → ${balanceResult.newBalance.toLocaleString()} đ`;
      } else {
        message = '✅ Quỹ đã được đồng bộ, không có giao dịch nào cần thêm';
      }

      if (result.errors.length > 0) {
        message += `\n⚠️ Có ${result.errors.length} lỗi trong quá trình xử lý`;
        console.warn('Fund sync errors:', result.errors);
      }

      this.fundSyncMessage = message;
      this.showFundSyncResult = true;

      // Auto hide message after 5 seconds
      setTimeout(() => {
        this.showFundSyncResult = false;
        this.fundSyncMessage = '';
      }, 5000);

      console.log('✅ Fund sync completed successfully');
      
    } catch (error) {
      console.error('❌ Error syncing fund from history:', error);
      this.fundSyncMessage = `❌ Lỗi khi đồng bộ quỹ: ${(error as Error).message}`;
      this.showFundSyncResult = true;
      
      setTimeout(() => {
        this.showFundSyncResult = false;
        this.fundSyncMessage = '';
      }, 5000);
    } finally {
      this.isSyncingFund = false;
    }
  }

  exportData(): void {
    const dataStr = JSON.stringify(this.filteredMatches, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `thanglong_fc_history_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ Data exported successfully');
  }

  // Date grouping and collapse functionality
  getMatchesByDate(): { date: string; matches: HistoryEntry[] }[] {
    const groups: Record<string, HistoryEntry[]> = {};
    
    // Group filtered matches by date
    this.filteredMatches.forEach(match => {
      const dateKey = match.date || 'unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

    // Convert to sorted array of groups
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Most recent first
      .map(date => ({
        date,
        matches: groups[date].sort((a, b) => 
          new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
        )
      }));
  }

  isDateCollapsed(date: string): boolean {
    return this.dateCollapseStates[date] === true;
  }

  toggleDateCollapse(date: string, event?: KeyboardEvent): void {
    // Handle keyboard events for accessibility
    if (event && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (event) {
      event.preventDefault();
    }

    this.dateCollapseStates[date] = !this.dateCollapseStates[date];
    this.saveCollapseStates();
  }

  private loadCollapseStates(): void {
    try {
      const saved = localStorage.getItem(this.COLLAPSE_STATES_KEY);
      if (saved) {
        this.dateCollapseStates = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Could not load collapse states:', error);
      this.dateCollapseStates = {};
    }
  }

  private saveCollapseStates(): void {
    try {
      localStorage.setItem(this.COLLAPSE_STATES_KEY, JSON.stringify(this.dateCollapseStates));
    } catch (error) {
      console.warn('Could not save collapse states:', error);
    }
  }

  getDateDisplayText(date: string): string {
    if (!date || date === 'unknown') return 'Ngày không xác định';
    return this.formatMatchDate(date);
  }

  getMatchCountForDate(matches: HistoryEntry[]): string {
    const count = matches.length;
    return count === 1 ? '1 trận' : `${count} trận`;
  }
}