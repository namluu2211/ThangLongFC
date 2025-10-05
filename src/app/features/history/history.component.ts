import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            *ngIf="canEdit">
            {{ isSyncingFund ? '🔄 Đang sync...' : '💰 Sync Fund' }}
          </button>
          <button class="export-btn" (click)="exportData()">📤 Xuất dữ liệu</button>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <div class="filter-section" *ngIf="matches.length > 0">
        <div class="search-controls">
          <div class="search-group">
            <label>🔍 Tìm kiếm</label>
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              (input)="onSearchChange()"
              placeholder="Tìm theo ngày, cầu thủ ghi bàn..."
              class="search-input">
          </div>
          
          <div class="filter-group">
            <label>📅 Tháng</label>
            <input 
              type="month" 
              [(ngModel)]="dateFilter" 
              (change)="onDateFilterChange()"
              class="date-filter">
          </div>
          
          <div class="filter-group">
            <label>🏆 Kết quả</label>
            <select 
              [(ngModel)]="scoreFilter" 
              (change)="onScoreFilterChange()"
              class="score-filter">
              <option value="all">Tất cả</option>
              <option value="win">Thắng</option>
              <option value="draw">Hòa</option>
              <option value="loss">Thua</option>
            </select>
          </div>
          
          <button class="clear-filters-btn" (click)="clearFilters()" *ngIf="searchTerm || dateFilter || scoreFilter !== 'all'">
            🗑️ Xóa bộ lọc
          </button>
        </div>
      </div>

      <!-- Fund Sync Result -->
      <div class="fund-sync-result" *ngIf="showFundSyncResult">
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

        <div class="matches-list" *ngIf="filteredMatches.length > 0; else noMatches">
          <div class="match-card" *ngFor="let match of filteredMatches; trackBy: trackByMatchId">
            <!-- Match Date -->
            <div class="match-date-header">
              <span class="date-text">{{ formatMatchDate(match.date) }}</span>
              <div class="match-actions" *ngIf="canEdit">
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

        <!-- Empty State -->
        <ng-template #noMatches>
          <div class="empty-state">
            <div class="empty-icon">🏆</div>
            <h3>Chưa có lịch sử trận đấu</h3>
            <p>Bắt đầu thi đấu để xem lịch sử và phân tích tài chính tại đây.</p>
          </div>
        </ng-template>
      </div>
      
      <!-- Edit Match Modal -->
      <div class="modal-overlay" *ngIf="showEditModal" (click)="cancelEdit()">
        <div class="modal-content edit-modal" (click)="$event.stopPropagation()">
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
                    <label>Ngày thi đấu</label>
                    <input type="date" [(ngModel)]="editFormData.date" name="date" class="form-control">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Tỷ số Đội Xanh</label>
                    <input type="number" [(ngModel)]="editFormData.scoreA" name="scoreA" class="form-control" min="0">
                  </div>
                  <div class="form-group">
                    <label>Tỷ số Đội Cam</label>
                    <input type="number" [(ngModel)]="editFormData.scoreB" name="scoreB" class="form-control" min="0">
                  </div>
                </div>
              </div>

              <!-- Scorers and Assists Section -->
              <div class="form-section">
                <h4>Ghi bàn và Kiến tạo</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Ghi bàn Đội Xanh</label>
                    <input type="text" [(ngModel)]="editFormData.scorerA" name="scorerA" class="form-control" placeholder="Tên cầu thủ ghi bàn">
                  </div>
                  <div class="form-group">
                    <label>Kiến tạo Đội Xanh</label>
                    <input type="text" [(ngModel)]="editFormData.assistA" name="assistA" class="form-control" placeholder="Tên cầu thủ kiến tạo">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Ghi bàn Đội Cam</label>
                    <input type="text" [(ngModel)]="editFormData.scorerB" name="scorerB" class="form-control" placeholder="Tên cầu thủ ghi bàn">
                  </div>
                  <div class="form-group">
                    <label>Kiến tạo Đội Cam</label>
                    <input type="text" [(ngModel)]="editFormData.assistB" name="assistB" class="form-control" placeholder="Tên cầu thủ kiến tạo">
                  </div>
                </div>
              </div>

              <!-- Cards Section -->
              <div class="form-section">
                <h4>Thẻ phạt</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Thẻ vàng Đội Xanh</label>
                    <input type="text" [(ngModel)]="editFormData.yellowA" name="yellowA" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ vàng">
                  </div>
                  <div class="form-group">
                    <label>Thẻ vàng Đội Cam</label>
                    <input type="text" [(ngModel)]="editFormData.yellowB" name="yellowB" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ vàng">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Thẻ đỏ Đội Xanh</label>
                    <input type="text" [(ngModel)]="editFormData.redA" name="redA" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ đỏ">
                  </div>
                  <div class="form-group">
                    <label>Thẻ đỏ Đội Cam</label>
                    <input type="text" [(ngModel)]="editFormData.redB" name="redB" class="form-control" placeholder="Danh sách cầu thủ nhận thẻ đỏ">
                  </div>
                </div>
              </div>

              <!-- Financial Section -->
              <div class="form-section">
                <h4>Tài chính</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Tổng thu (đ)</label>
                    <input type="number" [(ngModel)]="editFormData.thu" name="thu" class="form-control" min="0">
                  </div>
                  <div class="form-group">
                    <label>Tổng chi (đ)</label>
                    <input type="number" [(ngModel)]="editFormData.chi_total" name="chi_total" class="form-control" min="0">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Chi sân (đ)</label>
                    <input type="number" [(ngModel)]="editFormData.chi_san" name="chi_san" class="form-control" min="0">
                  </div>
                  <div class="form-group">
                    <label>Chi trọng tài (đ)</label>
                    <input type="number" [(ngModel)]="editFormData.chi_trongtai" name="chi_trongtai" class="form-control" min="0">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Chi nước (đ)</label>
                    <input type="number" [(ngModel)]="editFormData.chi_nuoc" name="chi_nuoc" class="form-control" min="0">
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
      <div class="modal-overlay" *ngIf="showDeleteModal" (click)="cancelDelete()">
        <div class="modal-content delete-modal" (click)="$event.stopPropagation()">
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
export class HistoryComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private dataStore = inject(DataStoreService);
  
  @Input() canEdit = false;
  
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

  ngOnInit(): void {
    this.loadMatches();
  }

  async loadMatches(): Promise<void> {
    try {
      this.loading = true;
      console.log('🔄 Loading fresh match history from Firebase...');
      
      // Subscribe to history observable to get real-time updates
      this.firebaseService.history$.pipe(take(1)).subscribe({
        next: (historyData) => {
          console.log('📊 Received history data:', historyData.length, 'matches');
          console.log('📋 Match data:', historyData);
          
          this.matches = [...historyData]; // Create a copy
          this.matches.sort((a, b) => {
            const dateA = new Date(a.date || '').getTime();
            const dateB = new Date(b.date || '').getTime();
            return dateB - dateA;
          });
          
          this.applyFilters(); // Apply search and filters
          console.log('✅ Match history loaded and sorted successfully');
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading matches:', error);
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('❌ Error in loadMatches:', error);
      this.loading = false;
    }
  }

  trackByMatchId(index: number, match: HistoryEntry): string {
    return match.id || index.toString();
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
  getTeamSize(team: string[] | undefined): number {
    return team ? team.length : 0;
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
}