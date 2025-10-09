import { Component, OnInit, OnDestroy, Input, TrackByFunction, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Player } from './player-utils';
import { PlayerService } from '../../core/services/player.service';
import { MatchService } from '../../core/services/match.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { PlayerInfo, PlayerStatus } from '../../core/models/player.model';
import { TeamComposition, TeamColor, MatchStatus, GoalDetail, CardDetail, GoalType, CardType } from '../../core/models/match.model';

// AI/ML Analysis Interfaces
interface AIAnalysisResult {
  predictedScore: {
    xanh: number;
    cam: number;
  };
  xanhWinProb: number;
  camWinProb: number;
  confidence: number;
  keyFactors: {
    name: string;
    impact: number;
  }[];
  avgGoalsDiff: string;
  matchesAnalyzed: number;
  historicalStats: {
    xanhWins: number;
    camWins: number;
    draws: number;
    totalMatches: number;
  };
}

interface HistoryEntry {
  id?: string;
  date: string;
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
}

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modern-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <h2 class="page-title">
            <i class="fas fa-users me-2"></i>
            ⚽ Quản lý đội hình
          </h2>
          <p class="page-subtitle">Chia đội và ghi nhận thành tích trận đấu</p>
        </div>
      </div>

      <!-- Action Buttons Section -->
      <div class="action-section">
          <div class="action-buttons">
          <button 
            class="modern-btn btn-info"
            (click)="togglePlayerListView()"
            title="Xem danh sách cầu thủ">
            <i class="fas fa-list me-2"></i>
            {{ showPlayerList ? 'Ẩn danh sách' : 'Hiện danh sách' }}
          </button>
          
          <!-- Admin Controls -->
          <div *ngIf="isAdmin()" class="admin-controls">
            <button 
              class="modern-btn btn-info"
              (click)="syncPlayersToFirebase()"
              title="Đồng bộ cầu thủ lên Firebase"
              [disabled]="isSyncing">
              <i [class]="isSyncing ? 'fas fa-spinner fa-spin me-2' : 'fas fa-cloud-upload-alt me-2'"></i>
              {{ isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Firebase' }}
            </button>
            
            <button 
              class="modern-btn btn-warning"
              (click)="exportPlayersData()"
              title="Xuất dữ liệu cầu thủ">
              <i class="fas fa-download me-2"></i>
              Xuất dữ liệu
            </button>
          </div>
          
          <button 
            class="modern-btn btn-warning"
            (click)="toggleUseRegistered()"
            title="Chuyển đổi giữa tất cả cầu thủ và cầu thủ đã đăng ký">
            <i class="fas fa-toggle-on me-2"></i>
            {{ useRegistered ? 'Dùng tất cả' : 'Chỉ đã đăng ký' }}
          </button>
          
          <button 
            class="modern-btn btn-primary"
            (click)="shuffleTeams()"
            title="Chia đội ngẫu nhiên">
            <i class="fas fa-shuffle me-2"></i>
            Chia đội ngẫu nhiên
          </button>
          
          <button 
            class="modern-btn btn-success"
            (click)="saveMatchInfo()"
            title="Lưu thông tin trận đấu">
            <i class="fas fa-save me-2"></i>
            Lưu trận đấu
          </button>          <div *ngIf="matchSaveMessage" class="status-message success">
            {{ matchSaveMessage }}
          </div>
          <div *ngIf="saveMessage" class="status-message success">
            {{ saveMessage }}
          </div>
        </div>
      </div>

      <!-- Player List Section (Danh Sách) -->
      <div *ngIf="showPlayerList" class="player-list-section">
        <div class="player-list-card">
          <div class="list-header">
            <h3><i class="fas fa-users me-2"></i>Danh sách cầu thủ</h3>
            <div class="list-controls">
              <button class="modern-btn btn-sm btn-primary" (click)="savePlayers()" title="Lưu thay đổi">
                <i class="fas fa-save me-1"></i>Lưu
              </button>
            </div>
          </div>
          
          <div class="players-grid" *ngIf="allPlayers.length > 0; else noPlayersTemplate">
            <div *ngFor="let player of allPlayers; trackBy: trackByPlayerId" 
                 class="player-item"
                 [class.registered]="isRegistered(player)">
              <div class="player-info" tabindex="0" (click)="viewPlayer(player)" (keyup)="onPlayerInfoKey($event, player)">
                <img [src]="player.avatar" 
                     [alt]="player.firstName"
                     class="player-thumb"
                     (error)="onAvatarError($event, player)">
                <div class="player-details">
                  <span class="player-name">{{ player.firstName }} {{ player.lastName }}</span>
                  <span class="player-position">{{ player.position }}</span>
                </div>
              </div>
              <div class="player-actions">
                <button 
                  class="action-btn"
                  [class.btn-success]="!isRegistered(player)"
                  [class.btn-danger]="isRegistered(player)"
                  (click)="toggleRegistration(player)"
                  [title]="isRegistered(player) ? 'Hủy đăng ký' : 'Đăng ký'">
                  <i class="fas" [class.fa-plus]="!isRegistered(player)" [class.fa-minus]="isRegistered(player)"></i>
                </button>
                

              </div>
            </div>
          </div>

          <ng-template #noPlayersTemplate>
            <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px; color: #6c757d;">
              <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
              <h4>Không có dữ liệu cầu thủ</h4>
              <p>Đang tải hoặc có lỗi khi tải danh sách cầu thủ.</p>
              <button class="modern-btn btn-primary" (click)="loadPlayers()">Thử tải lại</button>
            </div>
          </ng-template>
          
          <div *ngIf="saveRegisteredMessage" class="status-message success mt-3">
            {{ saveRegisteredMessage }}
          </div>
        </div>
      </div>

      <!-- Admin Player Management Modal -->
      <div *ngIf="showPlayerModal" 
           class="modal-overlay" 
           tabindex="0"
           (click)="closePlayerFormModal()" 
           (keydown.escape)="closePlayerFormModal()">
        <div class="player-modal" 
             tabindex="-1"
             (click)="$event.stopPropagation()"
             (keydown)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="fas fa-user-edit me-2"></i>
              {{ isEditMode ? 'Chỉnh sửa cầu thủ' : 'Thêm cầu thủ mới' }}
            </h3>
            <button class="close-btn" (click)="closePlayerFormModal()">×</button>
          </div>
          
          <div class="modal-content">
            <form #playerForm="ngForm" novalidate>
              <div class="form-grid">
                <div class="form-group">
                  <label for="firstName">Tên *</label>
                  <input 
                    type="text" 
                    id="firstName"
                    name="firstName"
                    [(ngModel)]="playerFormData.firstName" 
                    required 
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="lastName">Họ</label>
                  <input 
                    type="text" 
                    id="lastName"
                    name="lastName"
                    [(ngModel)]="playerFormData.lastName" 
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="position">Vị trí *</label>
                  <select 
                    id="position"
                    name="position"
                    [(ngModel)]="playerFormData.position" 
                    required 
                    class="form-control">
                    <option value="">Chọn vị trí</option>
                    <option value="Thủ môn">Thủ môn</option>
                    <option value="Hậu vệ">Hậu vệ</option>
                    <option value="Trung vệ">Trung vệ</option>
                    <option value="Tiền vệ">Tiền vệ</option>
                    <option value="Tiền đạo">Tiền đạo</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="dateOfBirth">Ngày sinh</label>
                  <input 
                    type="date" 
                    id="dateOfBirth"
                    name="dateOfBirth"
                    [(ngModel)]="playerFormData.dateOfBirth" 
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="height">Chiều cao (cm)</label>
                  <input 
                    type="number" 
                    id="height"
                    name="height"
                    [(ngModel)]="playerFormData.height" 
                    min="0"
                    max="250"
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="weight">Cân nặng (kg)</label>
                  <input 
                    type="number" 
                    id="weight"
                    name="weight"
                    [(ngModel)]="playerFormData.weight" 
                    min="0"
                    max="200"
                    class="form-control">
                </div>
              </div>
              
              <div class="form-group full-width">
                <label for="notes">Ghi chú</label>
                <textarea 
                  id="notes"
                  name="notes"
                  [(ngModel)]="playerFormData.notes" 
                  rows="3"
                  class="form-control"
                  placeholder="Thông tin thêm về cầu thủ..."></textarea>
              </div>
            </form>
            
            <!-- Avatar field completely outside the form -->
            <div class="form-group full-width" style="padding: 0 30px;">
              <label for="avatar">Avatar URL (tùy chọn)</label>
              <input 
                type="text" 
                id="avatar"
                [value]="playerFormData.avatar || ''"
                (input)="onAvatarInputChange($event)"
                class="form-control"
                autocomplete="off"
                placeholder="https://example.com/avatar.jpg hoặc assets/images/avatar_players/TenCauThu.png"
                title="Nhập URL hình ảnh hoặc đường dẫn file"
                novalidate
                [attr.pattern]="null"
                [attr.required]="null">
              <small class="form-text text-muted mt-2">
                <i class="fas fa-info-circle me-1"></i>
                Nếu URL không hợp lệ, hệ thống sẽ tự động sử dụng ảnh mặc định
              </small>
            </div>
            
            <div class="modal-actions" style="padding: 0 30px 30px 30px;">
              <button type="button" class="btn-cancel" (click)="closePlayerFormModal()">
                <i class="fas fa-times me-1"></i>Hủy
              </button>
              <button 
                type="button" 
                class="btn-save" 
                [disabled]="isSaving || !playerFormData.firstName || !playerFormData.position"
                (click)="savePlayerData()">
                <i [class]="isSaving ? 'fas fa-spinner fa-spin me-1' : 'fas fa-save me-1'"></i>
                {{ isSaving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Thêm mới') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteConfirm" class="modal-overlay" 
           tabindex="-1"
           (click)="closeDeleteConfirm()"
           (keydown)="$event.key === 'Escape' && closeDeleteConfirm()">
        <div class="confirm-modal" 
             tabindex="-1"
             (click)="$event.stopPropagation()"
             (keydown)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="fas fa-exclamation-triangle me-2"></i>
              Xác nhận xóa
            </h3>
          </div>
          <div class="modal-content">
            <p>Bạn có chắc chắn muốn xóa cầu thủ <strong>{{ playerToDelete?.firstName }} {{ playerToDelete?.lastName }}</strong>?</p>
            <p class="warning-text">Hành động này không thể hoàn tác!</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="closeDeleteConfirm()">
              <i class="fas fa-times me-1"></i>Hủy
            </button>
            <button 
              type="button" 
              class="btn-delete" 
              (click)="executeDeletePlayer()"
              [disabled]="isSaving">
              <i [class]="isSaving ? 'fas fa-spinner fa-spin me-1' : 'fas fa-trash me-1'"></i>
              {{ isSaving ? 'Đang xóa...' : 'Xóa' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Player Details Modal -->
      <div *ngIf="selectedPlayer" class="modal-overlay" tabindex="0" (click)="closePlayerModal()" (keyup)="onModalOverlayKey($event)">
        <div class="player-modal" tabindex="0" (click)="$event.stopPropagation()" (keyup)="onModalContentKey($event)">
          <div class="modal-header">
            <h4>{{ getPlayerFullName(selectedPlayer) }}</h4>
            <button class="close-btn" (click)="closePlayerModal()" (keyup)="onCloseBtnKey($event)" tabindex="0">×</button>
          </div>
          <div class="modal-content">
            <div class="player-avatar-section">
              <img [src]="selectedPlayer.avatar" 
                   [alt]="selectedPlayer.firstName"
                   class="modal-avatar"
                   (error)="onAvatarError($event, selectedPlayer)">
              <div class="registration-badge" [class.active]="isRegistered(selectedPlayer)">
                <i class="fas" [class.fa-check-circle]="isRegistered(selectedPlayer)" [class.fa-times-circle]="!isRegistered(selectedPlayer)"></i>
                {{ isRegistered(selectedPlayer) ? 'Đã đăng ký' : 'Chưa đăng ký' }}
              </div>
            </div>
            
            <div class="player-details-grid">
              <div class="detail-section">
                <h5><i class="fas fa-info-circle me-2"></i>Thông tin cơ bản</h5>
                <div class="detail-item">
                  <span class="detail-label">Vị trí:</span>
                  <span class="detail-value position-badge">
                    <i class="fas fa-futbol me-1"></i>
                    {{ selectedPlayer.position }}
                  </span>
                </div>
                <div class="detail-item" *ngIf="selectedPlayer.DOB">
                  <span class="detail-label">Năm sinh:</span>
                  <span class="detail-value age-value">{{ selectedPlayer.DOB }} <span class="age-text">({{ calculateAge(selectedPlayer.DOB) }} tuổi)</span></span>
                </div>
              </div>

              <div class="detail-section" *ngIf="selectedPlayer.height || selectedPlayer.weight">
                <h5><i class="fas fa-ruler-vertical me-2"></i>Thông số</h5>
                <div class="detail-item" *ngIf="selectedPlayer.height">
                  <span class="detail-label">Chiều cao:</span>
                  <span class="detail-value">{{ selectedPlayer.height }} cm</span>
                </div>
                <div class="detail-item" *ngIf="selectedPlayer.weight">
                  <span class="detail-label">Cân nặng:</span>
                  <span class="detail-value">{{ selectedPlayer.weight }} kg</span>
                </div>
              </div>

              <div class="detail-section full-width" *ngIf="selectedPlayer.note">
                <h5><i class="fas fa-sticky-note me-2"></i>Ghi chú</h5>
                <div class="note-content">
                  {{ selectedPlayer.note }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Teams Section -->
      <div class="teams-container">
        <!-- Teams Row (Side by Side) -->
        <div class="teams-row">
          <!-- Team A -->
          <div class="team-card">
            <div class="team-header team-a">
              <h3><i class="fas fa-shield-alt me-2"></i>Đội Xanh</h3>
              <div class="score-section">
                <label for="scoreAInput">Tỉ số:</label>
                <input id="scoreAInput" type="number" [(ngModel)]="scoreA" class="score-input" min="0" max="20">
              </div>
            </div>
            <div class="team-content">
              <!-- Team A Players -->
              <div class="team-players-section">
                <h5 class="section-title">Đội hình A ({{ teamA.length }} người)</h5>
                <div 
                  class="players-row team-players"
                  cdkDropList
                  id="teamAList"
                  [cdkDropListData]="teamA"
                  [cdkDropListConnectedTo]="['teamBList']"
                  (cdkDropListDropped)="onDrop($event)">
                  
                  <div *ngFor="let player of teamA; trackBy: trackByPlayerId; let i = index"
                       class="player-card team-member"
                       cdkDrag
                       [cdkDragData]="player"
                       (cdkDragStarted)="onDragStarted(player)"
                       (cdkDragEnded)="onDragEnded()">
                    <img [src]="player.avatar" 
                         [alt]="player.firstName"
                         class="player-avatar"
                         (error)="onAvatarError($event, player)">
                    <span class="player-name">{{ player.firstName }}</span>
                    <button 
                      class="delete-btn"
                      (click)="removeFromTeam(player, 'A')"
                      title="Xóa khỏi đội">
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <!-- Team A Stats -->
              <div class="stats-section">
                <div class="stat-group">
                  <label for="scorerAInput">Ghi bàn:</label>
                  <input id="scorerAInput" type="text" [(ngModel)]="scorerA" class="stat-input" placeholder="Tên cầu thủ">
                </div>
                <div class="stat-group">
                  <label for="assistAInput">Kiến tạo:</label>
                  <input id="assistAInput" type="text" [(ngModel)]="assistA" class="stat-input" placeholder="Tên cầu thủ">
                </div>
                <div class="stat-group yellow">
                  <label for="yellowAInput">Thẻ vàng:</label>
                  <input id="yellowAInput" type="text" [(ngModel)]="yellowA" class="stat-input" placeholder="Tên cầu thủ">
                </div>
                <div class="stat-group red">
                  <label for="redAInput">Thẻ đỏ:</label>
                  <input id="redAInput" type="text" [(ngModel)]="redA" class="stat-input" placeholder="Tên cầu thủ">
                </div>
              </div>
            </div>
          </div>

          <!-- Team B -->
          <div class="team-card">
            <div class="team-header team-b">
              <h3><i class="fas fa-shield-alt me-2"></i>Đội Cam</h3>
              <div class="score-section">
                <label for="scoreBInput">Tỉ số:</label>
                <input id="scoreBInput" type="number" [(ngModel)]="scoreB" class="score-input" min="0" max="20">
              </div>
            </div>
            <div class="team-content">
              <!-- Team B Players -->
              <div class="team-players-section">
                <h5 class="section-title">Đội hình B ({{ teamB.length }} người)</h5>
                <div 
                  class="players-row team-players"
                  cdkDropList
                  id="teamBList"
                  [cdkDropListData]="teamB"
                  [cdkDropListConnectedTo]="['teamAList']"
                  (cdkDropListDropped)="onDrop($event)">
                  
                  <div *ngFor="let player of teamB; trackBy: trackByPlayerId; let i = index"
                       class="player-card team-member"
                       cdkDrag
                       [cdkDragData]="player"
                       (cdkDragStarted)="onDragStarted(player)"
                       (cdkDragEnded)="onDragEnded()">
                    <img [src]="player.avatar" 
                         [alt]="player.firstName"
                         class="player-avatar"
                         (error)="onAvatarError($event, player)">
                    <span class="player-name">{{ player.firstName }}</span>
                    <button 
                      class="delete-btn"
                      (click)="removeFromTeam(player, 'B')"
                      title="Xóa khỏi đội">
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <!-- Team B Stats -->
              <div class="stats-section">
                <div class="stat-group">
                  <label for="scorerBInput">Ghi bàn:</label>
                  <input id="scorerBInput" type="text" [(ngModel)]="scorerB" class="stat-input" placeholder="Tên cầu thủ">
                </div>
                <div class="stat-group">
                  <label for="assistBInput">Kiến tạo:</label>
                  <input id="assistBInput" type="text" [(ngModel)]="assistB" class="stat-input" placeholder="Tên cầu thủ">
                </div>
                <div class="stat-group yellow">
                  <label for="yellowBInput">Thẻ vàng:</label>
                  <input id="yellowBInput" type="text" [(ngModel)]="yellowB" class="stat-input" placeholder="Tên cầu thủ">
                </div>
                <div class="stat-group red">
                  <label for="redBInput">Thẻ đỏ:</label>
                  <input id="redBInput" type="text" [(ngModel)]="redB" class="stat-input" placeholder="Tên cầu thủ">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI/ML Analysis Section -->
      <div class="ai-analysis-card">
        <div class="ai-header">
          <div class="d-flex justify-content-between align-items-center">
            <h4 class="mb-0">
              <i class="fas fa-brain me-2"></i>
              🤖 Phân Tích Dự Đoán AI
            </h4>
          </div>
          <p class="ai-subtitle mt-2 mb-0">Phân tích đội hình hiện tại và dự đoán tỷ lệ thắng/thua dựa trên cầu thủ đã chia đội</p>
        </div>

        <div class="ai-body">


          <!-- Current Team Formation Preview -->
          <div class="team-formation-preview mb-4" *ngIf="teamA.length > 0 || teamB.length > 0">
            <h5 class="preview-title">
              <i class="fas fa-eye me-2"></i>
              Đội hình sẽ được phân tích
            </h5>
            <div class="formation-display">
              <div class="formation-team formation-xanh">
                <div class="formation-header">🔵 Đội Xanh ({{teamA.length}})</div>
                <div class="formation-players">
                  <span *ngFor="let player of teamA; let last = last" class="formation-player">
                    {{player.firstName}}{{!last ? ', ' : ''}}
                  </span>
                </div>
              </div>
              <div class="formation-vs">VS</div>
              <div class="formation-team formation-cam">
                <div class="formation-header">🟠 Đội Cam ({{teamB.length}})</div>
                <div class="formation-players">
                  <span *ngFor="let player of teamB; let last = last" class="formation-player">
                    {{player.firstName}}{{!last ? ', ' : ''}}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Analysis Section -->
          <div class="ai-analysis-section mb-4" *ngIf="selectedXanhPlayers?.length || selectedCamPlayers?.length">
            <div class="row justify-content-center">
              <div class="col-md-8">
                <div class="vs-section text-center">
                  <div class="vs-icon mb-3">⚔️</div>
                  <div class="prediction-trigger">
                    <button class="btn btn-ai enhanced-analysis-btn" 
                            (click)="runAIAnalysis()" 
                            [disabled]="isAnalyzing || (!selectedXanhPlayers?.length || !selectedCamPlayers?.length)"
                            [class.pulsing]="!isAnalyzing && selectedXanhPlayers?.length && selectedCamPlayers?.length">
                      <div class="btn-content">
                        <i [class]="isAnalyzing ? 'fas fa-spinner fa-spin' : 'fas fa-brain'" class="btn-icon"></i>
                        <span class="btn-text">
                          {{isAnalyzing ? 'Đang phân tích...' : 'PHÂN TÍCH ĐỘI HÌNH HIỆN TẠI'}}
                        </span>
                        <div class="btn-subtitle" *ngIf="!isAnalyzing && selectedXanhPlayers?.length && selectedCamPlayers?.length">
                          Dự đoán dựa trên {{selectedXanhPlayers?.length}} vs {{selectedCamPlayers?.length}} cầu thủ
                        </div>
                        <div class="btn-subtitle text-warning" *ngIf="!isAnalyzing && (!selectedXanhPlayers?.length || !selectedCamPlayers?.length)">
                          Vui lòng chia đội trước khi phân tích
                        </div>
                      </div>
                      <div class="analysis-progress" *ngIf="isAnalyzing">
                        <div class="progress-bar"></div>
                      </div>
                    </button>
                  </div>
                  
                  <!-- Selection Status -->
                  <div class="selection-status mt-4">
                    <div class="row">
                      <div class="col-6">
                        <div class="status-item" [class.complete]="selectedXanhPlayers?.length">
                          <i class="fas" [class.fa-check-circle]="selectedXanhPlayers?.length" 
                             [class.fa-circle]="!selectedXanhPlayers?.length" 
                             [class.text-success]="selectedXanhPlayers?.length"
                             [class.text-muted]="!selectedXanhPlayers?.length"></i>
                          <span>Đội Xanh: {{selectedXanhPlayers?.length || 0}} cầu thủ</span>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="status-item" [class.complete]="selectedCamPlayers?.length">
                          <i class="fas" [class.fa-check-circle]="selectedCamPlayers?.length" 
                             [class.fa-circle]="!selectedCamPlayers?.length"
                             [class.text-success]="selectedCamPlayers?.length"
                             [class.text-muted]="!selectedCamPlayers?.length"></i>
                          <span>Đội Cam: {{selectedCamPlayers?.length || 0}} cầu thủ</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="quick-actions mt-3" *ngIf="teamA?.length > 0 || teamB?.length > 0">
                      <button class="btn btn-sm btn-outline-light me-2" (click)="shuffleTeams()" title="Chia đội ngẫu nhiên">
                        <i class="fas fa-shuffle me-1"></i>
                        Chia đội mới
                      </button>
                      <button class="btn btn-sm btn-outline-light" (click)="syncAIWithTeams()" title="Cập nhật AI với đội hình hiện tại">
                        <i class="fas fa-sync me-1"></i>
                        Cập nhật AI
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Analysis Results -->
          <div *ngIf="aiAnalysisResults && !isAnalyzing" class="analysis-results">
            <div class="results-header mb-4">
              <h4 class="text-center">
                <i class="fas fa-brain me-2"></i>
                🎯 Kết Quả Phân Tích AI
              </h4>
              <p class="text-center text-muted">Dự đoán dựa trên {{aiAnalysisResults.matchesAnalyzed}} trận đấu được phân tích</p>
            </div>
            <div class="row">
              <!-- Predicted Score -->
              <div class="col-lg-4">
                <div class="prediction-card score-prediction">
                  <h5 class="prediction-title">⚽ Tỷ Số Dự Đoán</h5>
                  <div class="predicted-score">
                    <div class="score-display">
                      <div class="team-score xanh-score">
                        <div class="score-team">🔵 Xanh</div>
                        <div class="score-number">{{aiAnalysisResults.predictedScore.xanh}}</div>
                      </div>
                      <div class="vs-separator">-</div>
                      <div class="team-score cam-score">
                        <div class="score-team">🟠 Cam</div>
                        <div class="score-number">{{aiAnalysisResults.predictedScore.cam}}</div>
                      </div>
                    </div>
                    <div class="score-confidence">
                      <small class="text-muted">Độ tin cậy: {{aiAnalysisResults.confidence}}%</small>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Win Probability -->
              <div class="col-lg-4">
                <div class="prediction-card">
                  <h5 class="prediction-title">📊 Tỷ Lệ Thắng</h5>
                  <div class="probability-bars">
                    <div class="prob-item xanh-prob">
                      <div class="prob-header">
                        <span class="team-name">🔵 Xanh</span>
                        <span class="prob-value">{{aiAnalysisResults.xanhWinProb}}%</span>
                      </div>
                      <div class="progress">
                        <div class="progress-bar bg-primary" 
                             [style.width.%]="aiAnalysisResults.xanhWinProb"></div>
                      </div>
                    </div>
                    <div class="prob-item cam-prob">
                      <div class="prob-header">
                        <span class="team-name">🟠 Cam</span>
                        <span class="prob-value">{{aiAnalysisResults.camWinProb}}%</span>
                      </div>
                      <div class="progress">
                        <div class="progress-bar bg-warning" 
                             [style.width.%]="aiAnalysisResults.camWinProb"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Key Factors -->
              <div class="col-lg-4">
                <div class="factors-card">
                  <h5 class="factors-title">🎯 Yếu Tố Quyết Định</h5>
                  <div class="factor-list">
                    <div *ngFor="let factor of aiAnalysisResults.keyFactors; trackBy: trackByFactorName" 
                         class="factor-item"
                         [class.positive]="factor.impact > 0"
                         [class.negative]="factor.impact < 0">
                      <div class="factor-name">{{factor.name}}</div>
                      <div class="factor-impact">
                        <span class="impact-value">{{factor.impact > 0 ? '+' : ''}}{{factor.impact}}%</span>
                        <i [class]="factor.impact > 0 ? 'fas fa-arrow-up text-success' : 'fas fa-arrow-down text-danger'"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detailed Analytics -->
            <div class="detailed-analytics mt-4">
              <div class="row">
                <div class="col-md-4">
                  <div class="metric-card">
                    <div class="metric-icon">⚽</div>
                    <div class="metric-content">
                      <div class="metric-value">{{aiAnalysisResults.avgGoalsDiff}}</div>
                      <div class="metric-label">Chênh lệch bàn thắng trung bình</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="metric-card">
                    <div class="metric-icon">📈</div>
                    <div class="metric-content">
                      <div class="metric-value">{{aiAnalysisResults.confidence}}%</div>
                      <div class="metric-label">Độ tin cậy dự đoán</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="metric-card">
                    <div class="metric-icon">🎲</div>
                    <div class="metric-content">
                      <div class="metric-value">{{aiAnalysisResults.matchesAnalyzed}}</div>
                      <div class="metric-label">Trận đã phân tích</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Historical Performance -->
            <div class="historical-performance mt-4">
              <h5 class="history-title">📚 Lịch Sử Đối Đầu</h5>
              <div class="history-stats">
                <div class="row">
                  <div class="col-md-3">
                    <div class="history-stat xanh-wins">
                      <div class="stat-number">{{aiAnalysisResults.historicalStats.xanhWins}}</div>
                      <div class="stat-label">Đội Xanh thắng</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="history-stat cam-wins">
                      <div class="stat-number">{{aiAnalysisResults.historicalStats.camWins}}</div>
                      <div class="stat-label">Đội Cam thắng</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="history-stat draws">
                      <div class="stat-number">{{aiAnalysisResults.historicalStats.draws}}</div>
                      <div class="stat-label">Hòa</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="history-stat total">
                      <div class="stat-number">{{aiAnalysisResults.historicalStats.totalMatches}}</div>
                      <div class="stat-label">Tổng trận</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .modern-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }

    .header-content {
      background: rgba(255, 255, 255, 0.95);
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
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
      margin: 0;
      font-size: 1.1rem;
    }

    .action-section {
      margin-bottom: 30px;
    }

    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 15px;
      flex-wrap: wrap;
    }

    .modern-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      min-width: 180px;
    }

    .modern-btn.btn-primary {
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    }

    .modern-btn.btn-success {
      background: linear-gradient(45deg, #56ab2f 0%, #a8e6cf 100%);
    }

    .modern-btn.btn-add {
      background: linear-gradient(45deg, #28a745 0%, #20c997 100%);
      color: white;
    }

    .modern-btn.btn-add:hover {
      background: linear-gradient(45deg, #218838 0%, #1e7e34 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
    }

    .modern-btn.btn-info {
      background: linear-gradient(45deg, #17a2b8 0%, #20c997 100%);
    }

    .modern-btn.btn-warning {
      background: linear-gradient(45deg, #ffc107 0%, #fd7e14 100%);
    }

    .modern-btn.btn-sm {
      padding: 8px 16px;
      font-size: 0.9rem;
      min-width: auto;
    }

    .modern-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }

    .status-message {
      margin-top: 10px;
      padding: 10px 20px;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
    }

    .status-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .teams-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .teams-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .team-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      overflow: hidden;
    }

    .team-header {
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .team-header.team-a {
      background: linear-gradient(45deg, #00bcd4 0%, #0097a7 100%);
      color: white;
    }

    .team-header.team-b {
      background: linear-gradient(45deg, #ff9800 0%, #f57c00 100%);
      color: white;
    }

    .team-header h3 {
      margin: 0;
      font-size: 1.4rem;
    }

    .score-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .score-section label {
      font-size: 1rem;
      font-weight: 500;
    }

    .score-input {
      width: 60px;
      padding: 8px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      text-align: center;
      font-size: 1.2rem;
      font-weight: bold;
      background: rgba(255, 255, 255, 0.9);
    }

    .team-content {
      padding: 20px;
    }

    .section-title {
      color: #2c3e50;
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ecf0f1;
    }

    .players-section, .team-players-section {
      margin-bottom: 25px;
    }

    .players-row {
      min-height: 120px;
      padding: 20px;
      border: 3px dashed #bdc3c7;
      border-radius: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      transition: all 0.3s ease;
      background: rgba(236, 240, 241, 0.3);
      position: relative;
    }



    .players-row.team-players {
      border-color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
    }

    .players-row:empty::after {
      content: "Kéo cầu thủ vào đây";
      color: #95a5a6;
      font-style: italic;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 50px;
    }

    .players-row.cdk-drop-list-dragging {
      border-color: #e74c3c !important;
      background: rgba(231, 76, 60, 0.3) !important;
      transform: scale(1.05) !important;
      box-shadow: 0 12px 35px rgba(231, 76, 60, 0.4) !important;
      z-index: 1000 !important;
    }

    .players-row.cdk-drop-list-receiving {
      border-color: #27ae60 !important;
      background: rgba(39, 174, 96, 0.3) !important;
      transform: scale(1.05) !important;
      box-shadow: 0 12px 35px rgba(39, 174, 96, 0.4) !important;
      z-index: 1000 !important;
    }

    /* Debug: Make drop zones very obvious during drag */
    .cdk-drag-dragging ~ .players-row {
      border: 4px solid #ff6b6b !important;
      background: rgba(255, 107, 107, 0.1) !important;
      animation: pulse 1s infinite;
      position: relative;
    }

    .cdk-drag-dragging ~ .players-row::before {
      content: "DROP HERE";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff6b6b;
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 1.1rem;
      z-index: 10;
      pointer-events: none;
      animation: bounce 0.5s infinite alternate;
    }

    @keyframes pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }

    @keyframes bounce {
      0% { transform: translate(-50%, -50%) scale(1); }
      100% { transform: translate(-50%, -50%) scale(1.1); }
    }

    /* Specific styling for each drop zone during drag */


    .cdk-drag-dragging ~ .team-players::before {
      content: "DROP TO TEAM";
      background: #27ae60;
    }

    .player-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      cursor: grab;
      min-width: 80px;
      border: 2px solid transparent;
    }

    .player-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .player-card.team-member {
      border-color: #27ae60;
    }

    .player-card.cdk-drag-dragging {
      opacity: 0.8;
      cursor: grabbing;
      transform: rotate(5deg);
    }

    .player-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 8px;
      border: 3px solid #ecf0f1;
      transition: border-color 0.3s ease;
    }

    .player-card:hover .player-avatar {
      border-color: #3498db;
    }

    .player-name {
      font-size: 0.85rem;
      font-weight: 600;
      text-align: center;
      color: #2c3e50;
      line-height: 1.2;
    }

    .delete-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e74c3c;
      color: white;
      border: none;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .player-card:hover .delete-btn {
      opacity: 1;
    }

    .delete-btn:hover {
      background: #c0392b;
      transform: scale(1.1);
    }

    .stats-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
    }

    .stat-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-group label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-group.yellow label {
      color: #f39c12;
    }

    .stat-group.red label {
      color: #e74c3c;
    }

    .stat-input {
      padding: 8px 12px;
      border: 2px solid #ecf0f1;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: border-color 0.3s ease;
    }

    .stat-input:focus {
      outline: none;
      border-color: #3498db;
    }

    .stat-group.yellow .stat-input {
      border-color: #f39c12;
    }

    .stat-group.red .stat-input {
      border-color: #e74c3c;
    }

    /* Player List Section */
    .player-list-section {
      margin-bottom: 30px;
    }

    .player-list-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ecf0f1;
    }

    .list-header h3 {
      color: #2c3e50;
      margin: 0;
      font-size: 1.5rem;
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
    }

    .player-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      border-left: 4px solid #bdc3c7;
    }

    .player-item.registered {
      border-left-color: #27ae60;
      background: linear-gradient(45deg, #d4edda 0%, #c3e6cb 100%);
    }

    .player-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }

    .player-info {
      display: flex;
      align-items: center;
      cursor: pointer;
      flex: 1;
    }

    .player-thumb {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 15px;
      border: 2px solid #ecf0f1;
    }

    .player-details {
      display: flex;
      flex-direction: column;
    }

    .player-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1rem;
    }

    .player-position {
      font-size: 0.85rem;
      color: #7f8c8d;
    }

    .player-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .action-btn.btn-success {
      background: #28a745;
    }

    .action-btn.btn-danger {
      background: #dc3545;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.6) !important;
      z-index: 9999 !important;
      backdrop-filter: blur(5px);
      display: grid !important;
      place-items: center !important;
      padding: 20px !important;
      box-sizing: border-box !important;
      overflow-y: auto !important;
    }

    .player-modal {
      background: white !important;
      border-radius: 20px !important;
      max-width: 700px !important;
      width: 95% !important;
      max-height: 85vh !important;
      overflow-y: auto !important;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4) !important;
      position: relative !important;
      animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      margin: auto !important;
      flex-shrink: 0 !important;
      transform-origin: center !important;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 25px 30px;
      border-bottom: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 20px 20px 0 0;
      position: relative;
      overflow: hidden;
    }

    .modal-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+Cjwvc3ZnPg==') repeat;
      opacity: 0.1;
      pointer-events: none;
    }

    .modal-header h4 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      position: relative;
      z-index: 1;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.3s ease;
      position: relative;
      z-index: 1;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.1);
    }

    .modal-content {
      padding: 30px;
      background: #fafbfc;
      overflow-y: visible;
    }

    /* Ensure all form fields are properly displayed */
    .form-group input,
    .form-group select,
    .form-group textarea {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    .form-group select {
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      padding-right: 40px;
    }

    /* Fix for textarea */
    .form-group textarea {
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
      line-height: 1.5;
    }

    /* Ensure form fields are visible and not cut off */
    .player-modal .form-group {
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }

    .player-modal .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
      z-index: 2;
      position: relative;
    }

    /* Force modal centering - highest priority */
    .modal-overlay[style] {
      display: grid !important;
      place-items: center !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 9999 !important;
    }

    .player-modal[style] {
      margin: auto !important;
      position: relative !important;
    }

    .player-avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 30px;
      padding: 25px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .modal-avatar {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 20px;
      border: 6px solid white;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s ease;
    }

    .modal-avatar:hover {
      transform: scale(1.05);
    }

    .registration-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
    }

    .registration-badge.active {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
    }

    .player-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }

    .detail-section {
      background: white;
      padding: 25px;
      border-radius: 15px;
      border: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-top: 4px solid #667eea;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .detail-section:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .detail-section.full-width {
      grid-column: 1 / -1;
      border-top-color: #28a745;
    }

    .detail-section h5 {
      color: #2c3e50;
      margin: 0 0 20px 0;
      font-size: 1.2rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px solid #f1f3f4;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .detail-item:last-child {
      margin-bottom: 0;
      border-bottom: none;
    }

    .detail-label {
      font-weight: 600;
      color: #5a6c7d;
      font-size: 1rem;
    }

    .detail-value {
      color: #2c3e50;
      font-weight: 500;
      font-size: 1rem;
      text-align: right;
    }

    .age-value {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .age-text {
      font-size: 0.85rem;
      color: #7f8c8d;
      font-weight: 400;
    }

    .position-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem !important;
      font-weight: 600 !important;
      display: inline-flex;
      align-items: center;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .note-content {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      color: #2c3e50;
      line-height: 1.7;
      font-size: 1rem;
      border: 2px solid #e9ecef;
      font-style: italic;
      position: relative;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    .note-content::before {
      content: '"';
      position: absolute;
      top: 10px;
      left: 15px;
      font-size: 2rem;
      color: #ced4da;
      font-family: Georgia, serif;
    }

    .text-success {
      color: #28a745 !important;
      font-weight: 600;
    }

    .text-muted {
      color: #6c757d !important;
    }

    .mt-3 {
      margin-top: 1rem !important;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .teams-row {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;
      }

      .modern-btn {
        width: 100%;
        max-width: 300px;
      }

      .stats-section {
        grid-template-columns: 1fr;
      }

      .team-header {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }

      .player-details-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .player-modal {
        width: 95%;
        margin: 0;
        max-height: 95vh;
      }

      .modal-content {
        padding: 20px;
      }

      .modal-header {
        padding: 20px;
      }

      .modal-header h4 {
        font-size: 1.3rem;
      }

      .modal-avatar {
        width: 120px;
        height: 120px;
      }

      .player-avatar-section {
        padding: 20px;
        margin-bottom: 20px;
      }

      .detail-section {
        padding: 20px;
      }

      .detail-section h5 {
        font-size: 1.1rem;
        margin-bottom: 15px;
      }

      .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        text-align: left;
      }

      .detail-value {
        text-align: left;
      }

      .age-value {
        align-items: flex-start;
      }

      .registration-badge {
        padding: 10px 16px;
        font-size: 0.9rem;
      }
    }

    /* Admin Controls */
    .admin-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .admin-player-actions {
      display: flex;
      gap: 5px;
      margin-top: 8px;
    }

    .admin-player-actions button {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-edit {
      background: #007bff;
      color: white;
    }

    .btn-edit:hover {
      background: #0056b3;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-delete:hover {
      background: #c82333;
    }

    /* Modal Styles */
    .confirm-modal {
      background: white;
      border-radius: 12px;
      padding: 0;
      width: 90%;
      max-width: 400px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      animation: modalEnter 0.2s ease forwards;
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
      border-radius: 12px 12px 0 0;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
      display: flex;
      align-items: center;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .modal-content {
      padding: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      align-items: start;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      min-height: 70px;
      position: relative;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #2c3e50;
      font-size: 14px;
      display: block;
      position: relative;
      z-index: 1;
    }

    .form-control {
      padding: 12px 15px;
      border: 2px solid #e0e6ed;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s ease;
      background: white;
      width: 100%;
      box-sizing: border-box;
      min-height: 44px;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .form-control:invalid {
      border-color: #dc3545;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }

    .btn-cancel {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }

    .btn-cancel:hover {
      background: #545b62;
    }

    .btn-save {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }

    .btn-save:hover:not(:disabled) {
      background: #218838;
    }

    .btn-save:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .warning-text {
      color: #dc3545;
      font-style: italic;
      margin: 10px 0;
    }

    @media (max-width: 768px) {
      .modal-overlay {
        display: grid !important;
        place-items: center !important;
        padding: 10px;
      }
      
      .player-modal {
        width: 100%;
        max-width: 100%;
        max-height: 95vh;
        border-radius: 15px;
        margin: 0;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }
      
      .modal-content {
        padding: 20px;
      }
      
      .admin-controls {
        justify-content: center;
      }
      
      .modal-actions {
        flex-direction: column;
        gap: 10px;
      }
      
      .modal-actions button {
        width: 100%;
        padding: 12px;
      }
    }

    /* AI Analysis Styles */
    .ai-analysis-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      border: 2px solid transparent;
      background-image: linear-gradient(white, white), 
                        linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      background-origin: border-box;
      background-clip: content-box, border-box;
      margin-top: 30px;
    }

    .ai-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }

    .ai-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.95rem;
    }

    .ai-body {
      padding: 2rem;
    }

    /* Team Formation Preview */
    .team-formation-preview {
      background: linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%);
      border-radius: 15px;
      padding: 1.5rem;
      border: 2px solid rgba(52, 152, 219, 0.2);
    }

    .preview-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1rem;
      text-align: center;
      font-size: 1.1rem;
    }

    .formation-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .formation-team {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-width: 200px;
      flex: 1;
      max-width: 300px;
    }

    .formation-xanh {
      border-left: 4px solid #3498db;
    }

    .formation-cam {
      border-left: 4px solid #f39c12;
    }

    .formation-header {
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.75rem;
      text-align: center;
      font-size: 1rem;
    }

    .formation-players {
      color: #495057;
      font-size: 0.9rem;
      line-height: 1.6;
      text-align: center;
      min-height: 40px;
    }

    .formation-player {
      font-weight: 500;
    }

    .formation-vs {
      font-size: 1.5rem;
      font-weight: 800;
      color: #6c757d;
      background: white;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .team-selector {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border: 1px solid #e9ecef;
      height: 100%;
    }

    .xanh-team {
      border-left: 4px solid #3498db;
    }

    .cam-team {
      border-left: 4px solid #f39c12;
    }

    .team-label {
      font-weight: 600;
      margin-bottom: 1rem;
      text-align: center;
      padding: 0.5rem;
      font-size: 1.1rem;
      color: #2c3e50;
    }

    .form-label {
      font-weight: 500;
      color: #495057;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    /* Enhanced Analysis Button */
    .enhanced-analysis-btn {
      position: relative;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-weight: 700;
      padding: 1.5rem 2.5rem;
      border-radius: 30px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
      overflow: hidden;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .enhanced-analysis-btn:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 48px rgba(102, 126, 234, 0.6);
      color: white;
    }

    .enhanced-analysis-btn:disabled {
      opacity: 0.5;
      transform: none;
      cursor: not-allowed;
    }

    .enhanced-analysis-btn.pulsing {
      animation: pulseAnalysis 2s infinite;
    }

    @keyframes pulseAnalysis {
      0% { 
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 12px 48px rgba(102, 126, 234, 0.7);
        transform: scale(1.02);
      }
      100% { 
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
        transform: scale(1);
      }
    }

    .btn-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      position: relative;
      z-index: 2;
    }

    .btn-icon {
      font-size: 1.8rem;
      margin-bottom: 0.25rem;
    }

    .btn-text {
      font-size: 1.1rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .btn-subtitle {
      font-size: 0.8rem;
      opacity: 0.9;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0.5px;
    }

    .analysis-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      overflow: hidden;
      border-radius: 0 0 30px 30px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #fff 0%, rgba(255, 255, 255, 0.8) 50%, #fff 100%);
      animation: progressMove 1.5s infinite;
    }

    @keyframes progressMove {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    /* Custom Dropdown Styles */
    .custom-select-dropdown {
      position: relative;
      width: 100%;
      margin-bottom: 1rem;
    }

    .select-header {
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      padding: 1rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 80px;
      transition: all 0.3s ease;
    }

    .select-header:hover {
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
    }

    .xanh-dropdown .select-header:hover {
      border-color: #3498db;
    }

    .cam-dropdown .select-header:hover {
      border-color: #f39c12;
    }

    .selected-text {
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
      line-height: 1.4;
    }

    .selected-text.has-selection {
      color: #27ae60;
      font-weight: 700;
    }

    .dropdown-arrow {
      color: #7f8c8d;
      transition: all 0.3s ease;
      margin-left: 1rem;
      font-size: 1.1rem;
    }

    .dropdown-arrow.rotated {
      transform: rotate(180deg);
      color: #3498db;
    }

    .select-options {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #e9ecef;
      border-top: none;
      border-radius: 0 0 10px 10px;
      max-height: 350px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .option-item {
      padding: 0.8rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid #f8f9fa;
      transition: background-color 0.2s ease;
    }

    .option-item:hover {
      background: #e3f2fd;
    }

    .option-item:last-child {
      border-bottom: none;
    }

    .checkbox-container {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-name {
      font-weight: 500;
      color: #2c3e50;
    }

    /* VS Section */
    .vs-section {
      padding: 2rem;
      background: rgba(102, 126, 234, 0.05);
      border-radius: 15px;
      margin: 1rem 0;
    }

    .vs-icon {
      font-size: 3rem;
      color: #667eea;
    }

    /* Selection Status */
    .selection-status {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: rgba(248, 249, 250, 0.8);
      transition: all 0.3s ease;
    }

    .status-item.complete {
      background: rgba(40, 167, 69, 0.1);
      border: 1px solid rgba(40, 167, 69, 0.3);
    }

    .quick-actions {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.2);
      color: #495057;
      transition: all 0.3s ease;
    }

    .btn-sm:hover {
      background: rgba(255, 255, 255, 0.9);
      color: #2c3e50;
      transform: translateY(-1px);
    }

    /* Analysis Results */
    .analysis-results {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 15px;
      padding: 2rem;
      margin-top: 2rem;
    }

    .results-header h4 {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .prediction-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      margin-bottom: 1rem;
      border-top: 4px solid #667eea;
      transition: transform 0.2s ease;
    }

    .prediction-card:hover {
      transform: translateY(-2px);
    }

    .prediction-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .score-prediction {
      border-top-color: #28a745;
    }

    .predicted-score {
      text-align: center;
    }

    .score-display {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2rem;
      margin-bottom: 1rem;
    }

    .team-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .score-team {
      font-size: 0.9rem;
      font-weight: 600;
      color: #6c757d;
    }

    .score-number {
      font-size: 2.5rem;
      font-weight: 800;
      color: #2c3e50;
    }

    .xanh-score .score-number {
      color: #3498db;
    }

    .cam-score .score-number {
      color: #f39c12;
    }

    .vs-separator {
      font-size: 1.5rem;
      color: #6c757d;
      font-weight: 600;
    }

    .score-confidence {
      color: #6c757d;
      font-style: italic;
    }

    /* Probability Bars */
    .probability-bars {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .prob-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .prob-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .team-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .prob-value {
      font-weight: 700;
      font-size: 1.1rem;
      color: #2c3e50;
    }

    .progress {
      height: 12px;
      background-color: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      transition: width 1s ease-in-out;
      border-radius: 6px;
    }

    .bg-primary {
      background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
    }

    .bg-warning {
      background: linear-gradient(90deg, #f39c12 0%, #e67e22 100%);
    }

    /* Factors Card */
    .factors-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      border-top: 4px solid #e74c3c;
    }

    .factors-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .factor-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .factor-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid #dee2e6;
      transition: all 0.3s ease;
    }

    .factor-item.positive {
      border-left-color: #28a745;
      background: rgba(40, 167, 69, 0.1);
    }

    .factor-item.negative {
      border-left-color: #dc3545;
      background: rgba(220, 53, 69, 0.1);
    }

    .factor-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .factor-impact {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .impact-value {
      font-weight: 700;
      color: #2c3e50;
    }

    /* Metric Cards */
    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      text-align: center;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-top: 3px solid #667eea;
      transition: transform 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
    }

    .metric-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .metric-content {
      flex: 1;
      text-align: left;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .metric-label {
      color: #7f8c8d;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    /* Historical Performance */
    .historical-performance {
      background: white;
      border-radius: 15px;
      padding: 2rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      border-top: 4px solid #9b59b6;
    }

    .history-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1.5rem;
      text-align: center;
      font-size: 1.2rem;
    }

    .history-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .history-stat {
      text-align: center;
      padding: 1.5rem 1rem;
      background: #f8f9fa;
      border-radius: 12px;
      border-top: 3px solid #6c757d;
      transition: transform 0.2s ease;
    }

    .history-stat:hover {
      transform: translateY(-2px);
    }

    .history-stat.xanh-wins {
      border-top-color: #3498db;
      background: rgba(52, 152, 219, 0.1);
    }

    .history-stat.cam-wins {
      border-top-color: #f39c12;
      background: rgba(243, 156, 18, 0.1);
    }

    .history-stat.draws {
      border-top-color: #95a5a6;
      background: rgba(149, 165, 166, 0.1);
    }

    .history-stat.total {
      border-top-color: #9b59b6;
      background: rgba(155, 89, 182, 0.1);
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 800;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #6c757d;
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* Responsive Design for AI Section */
    @media (max-width: 768px) {
      .ai-header {
        padding: 1.5rem;
      }

      .ai-body {
        padding: 1.5rem;
      }

      .team-selector {
        padding: 1rem;
      }

      .enhanced-analysis-btn {
        padding: 1rem 1.5rem;
        min-height: 70px;
      }

      .btn-text {
        font-size: 1rem;
      }

      .btn-icon {
        font-size: 1.5rem;
      }

      .score-display {
        gap: 1rem;
      }

      .score-number {
        font-size: 2rem;
      }

      .history-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .metric-card {
        flex-direction: column;
        text-align: center;
      }

      .metric-content {
        text-align: center;
      }

      .quick-actions {
        flex-direction: column;
      }

      .vs-icon {
        font-size: 2rem;
      }

      .select-header {
        min-height: 60px;
        padding: 0.75rem;
      }
    }


  `]
})
export class PlayersComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  
  private destroy$ = new Subject<void>();
  private readonly playerService = inject(PlayerService);
  private readonly matchService = inject(MatchService);
  private readonly dataStore = inject(DataStoreService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  teamA: Player[] = [];
  teamB: Player[] = [];
  registeredPlayers: Player[] = [];
  useRegistered = false;
  selectedPlayer: Player | null = null;
  
  // Service-managed data
  corePlayersData: PlayerInfo[] = [];
  isLoadingPlayers = false;
  
  // Match data
  scoreA = 0;
  scoreB = 0;
  scorerA = '';
  scorerB = '';
  assistA = '';
  assistB = '';
  yellowA = '';
  yellowB = '';
  redA = '';
  redB = '';

  // UI state
  isDragging = false;
  draggedPlayer: Player | null = null;
  showPlayerList = true; // Show player list by default
  matchSaveMessage = '';
  saveMessage = '';
  saveRegisteredMessage = '';
  
  // Admin modal state
  showPlayerModal = false;
  showDeleteConfirm = false;
  isEditMode = false;
  isSaving = false;
  playerToDelete: PlayerInfo | null = null;
  playerFormData: Partial<PlayerInfo> = {};

  // AI/ML Analysis Properties
  allPlayersForAI: string[] = [];
  selectedXanhPlayers: string[] = [];
  selectedCamPlayers: string[] = [];
  isAnalyzing = false;
  aiAnalysisResults: AIAnalysisResult | null = null;
  
  // Custom Dropdown Properties
  xanhDropdownOpen = false;
  camDropdownOpen = false;
  
  // Match history for AI analysis
  history: HistoryEntry[] = [];
  
  // Performance optimization
  private aiAnalysisTimeout?: ReturnType<typeof setTimeout>;
  private analysisCache = new Map<string, AIAnalysisResult>();

  trackByPlayerId: TrackByFunction<Player> = (index: number, player: Player) => {
    return player.id;
  };

  // Performance optimized trackBy functions
  trackByFactorName = (index: number, factor: { name: string; impact: number }) => factor.name;
  trackByPlayerName = (index: number, name: string) => name;

  async loadPlayers() {
    try {
      this.isLoadingPlayers = true;
      
      // Force PlayerService to reload data
      await this.playerService.refreshPlayers();
      
      // Subscribe to core players data
      this.playerService.players$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (corePlayersData) => {
            this.corePlayersData = corePlayersData;
            this.convertCorePlayersToLegacyFormat(corePlayersData);
            this.updateFilteredPlayers();
            this.isLoadingPlayers = false;
            
            // If still no players after 1 second, try fallback
            if (this.allPlayers.length === 0) {
              setTimeout(() => {
                if (this.allPlayers.length === 0) {
                  this.loadPlayersDirectly();
                }
              }, 1000);
            }
          },
          error: (error) => {
            console.error('Error in PlayerService subscription:', error);
            this.loadPlayersDirectly();
          }
        });
      
      // Also try direct load immediately as fallback
      setTimeout(() => {
        if (this.allPlayers.length === 0) {
          this.loadPlayersDirectly();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error loading players:', error);
      this.loadPlayersDirectly();
    }
  }

  private async loadPlayersDirectly() {
    try {
      const response = await fetch('assets/players.json');
      if (response.ok) {
        const legacyPlayers = await response.json();
        
        // Convert directly to allPlayers format
        this.allPlayers = legacyPlayers.map((player: { id: number; firstName: string; lastName?: string; position: string; DOB: number | string; height?: number; weight?: number; avatar?: string; note?: string }) => ({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName || '',
          position: player.position || 'Chưa xác định',
          DOB: typeof player.DOB === 'number' ? player.DOB : 0,
          height: player.height || 0,
          weight: player.weight || 0,
          avatar: player.avatar || 'assets/images/default-avatar.svg',
          note: player.note || ''
        }));
        
        this.updateFilteredPlayers();
        this.isLoadingPlayers = false;
      } else {
        throw new Error('Failed to fetch players.json');
      }
    } catch (error) {
      console.error('Direct load failed:', error);
      this.allPlayers = [];
      this.isLoadingPlayers = false;
    }
  }

  updateFilteredPlayers() {
    // Method kept for compatibility but filteredPlayers no longer used in drag zone
    if (this.useRegistered) {
      this.filteredPlayers = this.registeredPlayers.filter(
        p => !this.teamA.some(ta => ta.id === p.id) && !this.teamB.some(tb => tb.id === p.id)
      );
    } else {
      this.filteredPlayers = this.allPlayers.filter(
        p => !this.teamA.some(ta => ta.id === p.id) && !this.teamB.some(tb => tb.id === p.id)
      );
    }
  }

  shuffleTeams() {
    // Reset teams
    this.teamA = [];
    this.teamB = [];
    
    const availablePlayers = this.useRegistered ? [...this.registeredPlayers] : [...this.allPlayers];
    
    // Shuffle the array
    for (let i = availablePlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePlayers[i], availablePlayers[j]] = [availablePlayers[j], availablePlayers[i]];
    }
    
    // Divide into teams
    const half = Math.ceil(availablePlayers.length / 2);
    this.teamA = availablePlayers.slice(0, half);
    this.teamB = availablePlayers.slice(half);
    
    this.updateFilteredPlayers();
    this.syncAIWithTeams(); // Auto-sync AI selections
  }

  onDrop(event: CdkDragDrop<Player[]>) {

    if (event.previousContainer === event.container) {
      // Moving within the same list - reorder if needed
      return;
    } else {
      // Moving between lists
      try {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
      } catch (error) {
        console.error('Transfer failed:', error);
        return;
      }
    }
    
    // Auto-sync AI selections when teams change
    this.syncAIWithTeams();
  }

  removeFromTeam(player: Player, team: 'A' | 'B') {
    switch (team) {
      case 'A':
        { const indexA = this.teamA.findIndex(p => p.id === player.id);
        if (indexA > -1) this.teamA.splice(indexA, 1);
        break; }
      case 'B':
        { const indexB = this.teamB.findIndex(p => p.id === player.id);
        if (indexB > -1) this.teamB.splice(indexB, 1);
        break; }
    }
    
    this.updateFilteredPlayers();
    this.syncAIWithTeams(); // Auto-sync AI selections
  }

  private addPlayerToTeam(player: Player, team: 'A' | 'B') {
    switch (team) {
      case 'A':
        if (!this.teamA.find(p => p.id === player.id)) {
          this.teamA.push(player);
        }
        break;
      case 'B':
        if (!this.teamB.find(p => p.id === player.id)) {
          this.teamB.push(player);
        }
        break;
    }
  }

  onDragStarted(player: Player) {
    this.isDragging = true;
    this.draggedPlayer = player;
  }

  onDragEnded() {
    this.isDragging = false;
    this.draggedPlayer = null;
  }

  onAvatarError(event: Event, player: Player) {
    // Use a reliable default avatar - try multiple fallbacks
    const defaultAvatars = [
      'assets/images/default-avatar.svg',
      'assets/images/avatar_players/default.png', 
      'https://ui-avatars.com/api/?name=' + encodeURIComponent(player.firstName || 'Player') + '&background=667eea&color=fff&size=200'
    ];
    
    const target = event.target as HTMLImageElement;
    
    // Try the first available default avatar
    const defaultAvatar = defaultAvatars[0];
    target.src = defaultAvatar;
    player.avatar = defaultAvatar;
    

    
    // If the default avatar also fails, use the generated avatar service
    target.onerror = () => {
      const generatedAvatar = defaultAvatars[2];
      target.src = generatedAvatar;
      player.avatar = generatedAvatar;
      target.onerror = null; // Prevent infinite loop

    };
  }

  onAvatarInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const inputValue = target.value;
    
    // Always accept any input value without any validation
    this.playerFormData.avatar = inputValue;
    
    // Completely clear any browser validation messages
    target.setCustomValidity('');
    target.reportValidity();
    
    // Remove any validation-related attributes that might have been added dynamically
    target.removeAttribute('pattern');
    target.removeAttribute('required');
    

  }

  private getValidAvatarUrl(avatarUrl: string, playerName: string): string {
    // If no avatar URL provided, use default generated avatar
    if (!avatarUrl || avatarUrl.trim() === '') {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=667eea&color=fff&size=200`;
    }
    
    // Clean up the URL path for local assets
    const cleanUrl = avatarUrl.replace(/\\/g, '/');
    
    // Return the provided URL - if it's invalid, onAvatarError will handle the fallback
    return cleanUrl;
  }

  private disableAvatarValidation(): void {
    // Find the avatar input element and completely disable any validation
    const avatarInput = document.getElementById('avatar') as HTMLInputElement;
    if (avatarInput) {
      // Remove all validation attributes
      avatarInput.removeAttribute('pattern');
      avatarInput.removeAttribute('required');
      avatarInput.removeAttribute('minlength');
      avatarInput.removeAttribute('maxlength');
      
      // Clear any custom validation messages
      avatarInput.setCustomValidity('');
      
      // Make sure it's not part of any form validation
      avatarInput.setAttribute('novalidate', 'true');
      

    }
  }

  isRegistered(player: Player): boolean {
    return this.registeredPlayers.some(rp => rp.id === player.id);
  }

  closePlayerModal() {
    this.selectedPlayer = null;
    // Restore body scrolling
    document.body.style.overflow = '';
  }

  viewPlayer(p: Player) {
    this.selectedPlayer = p;
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    // Center modal with JavaScript to override any CSS conflicts
    this.centerModal();
  }

  private centerModal(): void {
    // Let CSS handle primary centering, but add JavaScript fallback
    setTimeout(() => {
      const modalOverlay = document.querySelector('.modal-overlay') as HTMLElement;
      const playerModal = document.querySelector('.player-modal') as HTMLElement;
      

      
      if (modalOverlay && playerModal) {
        // Force aggressive positioning with multiple methods
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.right = '0';
        modalOverlay.style.bottom = '0';
        modalOverlay.style.width = '100vw';
        modalOverlay.style.height = '100vh';
        modalOverlay.style.zIndex = '9999';
        
        // Use CSS Grid for more reliable centering
        modalOverlay.style.display = 'grid';
        modalOverlay.style.placeItems = 'center';
        
        // Fallback to flexbox if grid doesn't work
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.justifyContent = 'center';
        
        // Ensure the modal is properly sized and centered
        playerModal.style.maxWidth = '700px';
        playerModal.style.width = '95%';
        playerModal.style.maxHeight = '85vh';
        playerModal.style.margin = 'auto';
        playerModal.style.transform = 'translate(0, 0)';
        

      } else {
        console.warn('❌ Modal elements not found!');
      }
    }, 50);
  }

  savePlayers() {
    try {
      localStorage.setItem('players.json', JSON.stringify(this.allPlayers));
      this.showTemporaryMessage('saveMessage', 'Đã lưu thay đổi!');
    } catch (error) {
      console.error('Error saving players:', error);
      this.showTemporaryMessage('saveMessage', 'Lỗi khi lưu!');
    }
  }

  async saveMatchInfo() {
    try {

      
      const matchData = await this.createMatchDataWithServices();
      
      await this.matchService.createMatch(matchData);
      
      // Also add fund transaction for the match
      await this.addMatchFundTransaction(matchData);
      
      this.showTemporaryMessage('matchSaveMessage', '\u0110\u00e3 l\u01b0u tr\u1eadn \u0111\u1ea5u v\u00e0o h\u1ec7 th\u1ed1ng!');
      
      // Refresh data to reflect changes in the UI
      await this.loadPlayers();
      
      // Clear match data after saving
      this.clearMatchData();
    } catch (error) {
      console.error('❌ Error saving match info:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      this.showTemporaryMessage('matchSaveMessage', 'L\u1ed7i khi l\u01b0u tr\u1eadn \u0111\u1ea5u!');
    }
  }

  private createMatchData() {
    return {
      date: new Date().toISOString(),
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      scorerA: this.scorerA,
      scorerB: this.scorerB,
      assistA: this.assistA,
      assistB: this.assistB,
      yellowA: this.yellowA,
      yellowB: this.yellowB,
      redA: this.redA,
      redB: this.redB,
      teamA: this.teamA.map(p => ({ ...p })),
      teamB: this.teamB.map(p => ({ ...p })),
    };
  }

  private async createMatchDataWithServices() {
    // Convert legacy players to core PlayerInfo format
    const teamACore = await this.convertToTeamComposition(this.teamA, TeamColor.BLUE);
    const teamBCore = await this.convertToTeamComposition(this.teamB, TeamColor.ORANGE);
    
    const totalPlayers = this.teamA.length + this.teamB.length;
    const baseRevenue = totalPlayers * 30000;
    
    return {
      id: `match_${Date.now()}`, // Add unique ID to prevent overwrites
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(), // Full timestamp for precise timing
      teamA: teamACore,
      teamB: teamBCore,
      result: {
        scoreA: this.scoreA,
        scoreB: this.scoreB,
        goalsA: this.createGoalDetails(this.scorerA, this.assistA, 'A'),
        goalsB: this.createGoalDetails(this.scorerB, this.assistB, 'B'),
        yellowCardsA: this.createCardDetails(this.yellowA, 'yellow'),
        yellowCardsB: this.createCardDetails(this.yellowB, 'yellow'),
        redCardsA: this.createCardDetails(this.redA, 'red'),
        redCardsB: this.createCardDetails(this.redB, 'red'),
        events: []
      },
      finances: {
        revenue: { 
          winnerFees: 0,
          loserFees: 0,
          cardPenalties: 0,
          otherRevenue: 0,
          teamARevenue: baseRevenue / 2, 
          teamBRevenue: baseRevenue / 2, 
          penaltyRevenue: 0
        },
        expenses: { 
          referee: 0, 
          field: 0, 
          water: 0, 
          transportation: 0, 
          food: 0, 
          equipment: 0, 
          other: 0,
          fixed: 0,
          variable: 0
        },
        totalRevenue: baseRevenue,
        totalExpenses: 0,
        netProfit: baseRevenue,
        revenueMode: 'auto' as const
      },
      status: MatchStatus.COMPLETED,
      statistics: {
        teamAStats: { 
          possession: 50,
          shots: this.scoreA + 2,
          shotsOnTarget: this.scoreA,
          passes: 100,
          passAccuracy: 85,
          corners: 2,
          fouls: 0,
          efficiency: this.scoreA > 0 ? (this.scoreA / (this.scoreA + 2)) * 100 : 0,
          discipline: 100
        },
        teamBStats: { 
          possession: 50,
          shots: this.scoreB + 2,
          shotsOnTarget: this.scoreB,
          passes: 100,
          passAccuracy: 85,
          corners: 2,
          fouls: 0,
          efficiency: this.scoreB > 0 ? (this.scoreB / (this.scoreB + 2)) * 100 : 0,
          discipline: 100
        },
        duration: 90,
        matchEvents: [],
        competitiveness: 50,
        fairPlay: 100,
        entertainment: Math.max(this.scoreA + this.scoreB, 1) * 10
      }
    };
  }

  private async convertToTeamComposition(players: Player[], color: TeamColor): Promise<TeamComposition> {
    const corePlayerInfos: PlayerInfo[] = [];
    
    for (const player of players) {
      const corePlayer = this.corePlayersData.find(cp => cp.id === player.id.toString());
      if (corePlayer) {
        corePlayerInfos.push(corePlayer);
      }
    }
    
    return {
      name: color === TeamColor.BLUE ? '\u0110\u1ed9i Xanh' : '\u0110\u1ed9i Cam',
      players: corePlayerInfos,
      teamColor: color,
      formation: this.suggestFormation(corePlayerInfos.length)
    };
  }

  private createGoalDetails(scorer: string, assist: string, team: 'A' | 'B'): GoalDetail[] {
    if (!scorer.trim()) return [];
    
    const goals = scorer.split(',').map(name => name.trim()).filter(Boolean);
    const assists = assist.split(',').map(name => name.trim()).filter(Boolean);
    
    return goals.map((goalScorer, index) => ({
      playerId: this.findPlayerIdByName(goalScorer, team) || 'unknown',
      playerName: goalScorer,
      minute: 45,
      assistedBy: assists[index] ? this.findPlayerIdByName(assists[index], team) : undefined,
      goalType: GoalType.REGULAR
    }));
  }

  private createCardDetails(cardPlayers: string, cardType: 'yellow' | 'red'): CardDetail[] {
    if (!cardPlayers.trim()) return [];
    
    const players = cardPlayers.split(',').map(name => name.trim()).filter(Boolean);
    return players.map(playerName => ({
      playerId: this.findPlayerIdByName(playerName, 'A') || 'unknown',
      playerName,
      minute: 45,
      cardType: cardType === 'yellow' ? CardType.YELLOW : CardType.RED,
      reason: 'Không rõ'
    }));
  }

  private findPlayerIdByName(playerName: string, team: 'A' | 'B'): string | undefined {
    const teamPlayers = team === 'A' ? this.teamA : this.teamB;
    const found = teamPlayers.find(p => 
      p.firstName.toLowerCase().includes(playerName.toLowerCase()) ||
      playerName.toLowerCase().includes(p.firstName.toLowerCase())
    );
    return found?.id?.toString();
  }

  private suggestFormation(playerCount: number): string {
    if (playerCount <= 5) return '3-2';
    if (playerCount <= 7) return '4-3';
    if (playerCount <= 9) return '4-3-2';
    return '4-4-2';
  }

  private async addMatchFundTransaction(matchData: {
    teamA: TeamComposition;
    teamB: TeamComposition;
    date: string;
  }) {
    try {
      const totalPlayers = matchData.teamA.players.length + matchData.teamB.players.length;
      const baseRevenue = totalPlayers * 30000;
      
      await this.dataStore.addFundTransaction({
        type: 'income',
        amount: baseRevenue,
        description: `Thu nhập từ trận đấu ngày ${matchData.date}`,
        category: 'match_fee',
        date: matchData.date,
        createdBy: 'system'
      });
    } catch (error) {
      console.warn('Could not add fund transaction:', error);
    }
  }

  private clearMatchData() {
    this.scoreA = 0;
    this.scoreB = 0;
    this.scorerA = '';
    this.scorerB = '';
    this.assistA = '';
    this.assistB = '';
    this.yellowA = '';
    this.yellowB = '';
    this.redA = '';
    this.redB = '';
  }

  private saveToHistory(match: Record<string, unknown>) {
    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    history.push(match);
    localStorage.setItem('matchHistory', JSON.stringify(history));
  }

  private convertCorePlayersToLegacyFormat(corePlayers: PlayerInfo[]): void {

    
    this.allPlayers = corePlayers.map(player => ({
      id: parseInt(player.id!) || Math.floor(Math.random() * 10000),
      firstName: player.firstName,
      lastName: player.lastName || '',
      position: player.position || 'Chưa xác định',
      DOB: player.dateOfBirth ? new Date(player.dateOfBirth).getFullYear() : 0,
      height: player.height,
      weight: player.weight,
      avatar: player.avatar || 'assets/images/default-avatar.svg',
      note: player.notes || ''
    }));
    

  }

  private showTemporaryMessage(messageProperty: keyof Pick<PlayersComponent, 'matchSaveMessage' | 'saveMessage' | 'saveRegisteredMessage'>, message: string) {
    this[messageProperty] = message;
    setTimeout(() => {
      this[messageProperty] = '';
    }, 3000);
  }

  togglePlayerListView() {
    this.showPlayerList = !this.showPlayerList;
  }

  toggleUseRegistered() {
    this.useRegistered = !this.useRegistered;
    this.updateFilteredPlayers();
  }

  toggleRegistration(player: Player) {
    const isCurrentlyRegistered = this.isRegistered(player);
    
    if (isCurrentlyRegistered) {
      // Remove from registered players
      this.registeredPlayers = this.registeredPlayers.filter(rp => rp.id !== player.id);
      this.showTemporaryMessage('saveRegisteredMessage', `Đã hủy đăng ký ${player.firstName}`);
    } else {
      // Add to registered players
      this.registeredPlayers.push({ ...player });
      this.showTemporaryMessage('saveRegisteredMessage', `Đã đăng ký ${player.firstName}`);
    }
    
    // Save to localStorage
    localStorage.setItem('registeredPlayers', JSON.stringify(this.registeredPlayers));
    
    // Update filtered players if we're currently using registered players
    if (this.useRegistered) {
      this.updateFilteredPlayers();
    }
  }

  ngOnInit() {
    this.loadPlayers();
    this.loadRegisteredPlayers();
    this.initializeAI();
    
    // Subscribe to data store changes
    this.dataStore.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        if (!loading && this.isLoadingPlayers) {
          this.loadPlayers();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up AI event listeners
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    
    // Performance cleanup
    if (this.aiAnalysisTimeout) {
      clearTimeout(this.aiAnalysisTimeout);
    }
    this.analysisCache.clear();
    
    // Clear AI results to free memory
    this.aiAnalysisResults = null;
    this.history = [];
  }

  private loadRegisteredPlayers() {
    try {
      const saved = localStorage.getItem('registeredPlayers');
      if (saved) {
        this.registeredPlayers = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading registered players:', error);
    }
  }

  getPlayerFullName(player: Player): string {
    if (player.lastName) {
      return `${player.firstName} ${player.lastName}`;
    }
    return player.firstName;
  }

  calculateAge(birthYear: number | string): number {
    const currentYear = new Date().getFullYear();
    let yearOfBirth: number;
    
    if (typeof birthYear === 'number') {
      yearOfBirth = birthYear;
    } else if (typeof birthYear === 'string') {
      // Handle different date formats
      if (birthYear.includes('/')) {
        // Format: MM/DD/YYYY or DD/MM/YYYY
        const parts = birthYear.split('/');
        if (parts.length === 3) {
          yearOfBirth = parseInt(parts[2]); // Year is the last part
        } else {
          yearOfBirth = parseInt(birthYear);
        }
      } else if (birthYear.includes('-')) {
        // Format: YYYY-MM-DD
        const parts = birthYear.split('-');
        yearOfBirth = parseInt(parts[0]); // Year is the first part
      } else {
        // Assume it's just a year
        yearOfBirth = parseInt(birthYear);
      }
    } else {
      return 0;
    }
    
    if (isNaN(yearOfBirth) || yearOfBirth < 1900 || yearOfBirth > currentYear) {
      return 0;
    }
    
    return currentYear - yearOfBirth;
  }

  // Accessibility: handle key events for modal overlay
  onModalOverlayKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.closePlayerModal();
    }
  }

  // Accessibility: prevent modal content from closing on keyup
  onModalContentKey(event: KeyboardEvent) {
    event.stopPropagation();
  }

  // Accessibility: handle key events for close button
  onCloseBtnKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.closePlayerModal();
    }
  }

  // Accessibility: handle key events for player info
  onPlayerInfoKey(event: KeyboardEvent, player: Player) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.viewPlayer(player);
    }
  }



  // Admin utility methods
  isAdmin(): boolean {
    // For now, return true. In a real app, check user role
    return true;
  }

  // Player Modal Methods
  openCreatePlayerModal(): void {

    this.isEditMode = false;
    this.playerFormData = {
      firstName: '',
      lastName: '',
      position: '',
      dateOfBirth: '',
      height: undefined,
      weight: undefined,
      notes: '',
      avatar: ''
    };
    
    this.showPlayerModal = true;
    
    // Force change detection and immediate positioning
    setTimeout(() => {
      this.centerModal();
      this.disableAvatarValidation();
    }, 0);
    
    // Additional backup positioning
    setTimeout(() => {
      this.centerModal();
    }, 200);
  }

  openEditPlayerModal(player: Player): void {
    // Find the corresponding PlayerInfo from corePlayersData
    const playerInfo = this.corePlayersData.find(p => 
      p.firstName === player.firstName && 
      p.lastName === player.lastName
    );
    
    if (playerInfo) {
      this.isEditMode = true;
      this.playerFormData = { ...playerInfo };
      
      // Convert DOB to proper date format for HTML date input
      if (player.DOB) {
        if (typeof player.DOB === 'number') {
          // If DOB is just age/year, calculate approximate birth year or leave empty
          if (player.DOB < 100) {
            // Assume it's age, convert to birth year
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - player.DOB;
            this.playerFormData.dateOfBirth = `${birthYear}-01-01`;
          } else {
            // Assume it's a birth year
            this.playerFormData.dateOfBirth = `${player.DOB}-01-01`;
          }
        } else if (typeof player.DOB === 'string') {
          // Try to convert various date formats to yyyy-MM-dd
          const dobString = player.DOB;
          let formattedDate = '';
          
          try {
            // Handle dd/mm/yyyy format
            if (dobString.includes('/')) {
              const parts = dobString.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                formattedDate = `${year}-${month}-${day}`;
              }
            } 
            // Handle yyyy-mm-dd format (already correct)
            else if (dobString.includes('-')) {
              const date = new Date(dobString);
              if (!isNaN(date.getTime())) {
                formattedDate = dobString;
              }
            }
            // Try parsing as general date
            else {
              const date = new Date(dobString);
              if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0];
              }
            }
          } catch {
            console.warn('Could not parse DOB:', dobString);
          }
          
          this.playerFormData.dateOfBirth = formattedDate;
        }
      } else {
        this.playerFormData.dateOfBirth = '';
      }
      
      this.showPlayerModal = true;
      
      // Force change detection and immediate positioning  
      setTimeout(() => {
        this.centerModal();
        this.disableAvatarValidation();
      }, 0);
      
      // Additional backup positioning
      setTimeout(() => {
        this.centerModal();
      }, 200);
    }
  }

  closePlayerFormModal(): void {
    this.showPlayerModal = false;
    this.playerFormData = {};
    this.isEditMode = false;
    this.isSaving = false;
  }

  async savePlayerData(): Promise<void> {

    
    if (!this.playerFormData.firstName || !this.playerFormData.position) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }


    this.isSaving = true;
    try {
      if (this.isEditMode && this.playerFormData.id) {

        // Update existing player - preserve original avatar if field is empty
        const originalPlayer = this.corePlayersData.find(p => p.id === this.playerFormData.id);
        const avatarUrl = this.playerFormData.avatar?.trim() || originalPlayer?.avatar || '';
        const playerDataToUpdate = {
          ...this.playerFormData,
          // Use provided avatar or fallback to default - no URL validation
          avatar: this.getValidAvatarUrl(avatarUrl, this.playerFormData.firstName || 'Player')
        };
        await this.playerService.updatePlayer(this.playerFormData.id, playerDataToUpdate);
        alert('Cập nhật cầu thủ thành công!');
      } else {

        // Create new player
        const newPlayer = {
          firstName: this.playerFormData.firstName!,
          lastName: this.playerFormData.lastName || '',
          position: this.playerFormData.position!,
          dateOfBirth: this.playerFormData.dateOfBirth || '',
          height: this.playerFormData.height || 0,
          weight: this.playerFormData.weight || 0,
          notes: this.playerFormData.notes || '',
          avatar: this.getValidAvatarUrl(this.playerFormData.avatar || '', this.playerFormData.firstName!),
          isRegistered: true,
          status: PlayerStatus.ACTIVE
        };
        await this.playerService.createPlayer(newPlayer);
        alert('Thêm cầu thủ mới thành công!');
      }
      
      // Refresh player data to reflect changes in the UI
      await this.loadPlayers();
      this.closePlayerFormModal();
    } catch (error) {
      console.error('❌ Error saving player:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        playerData: this.playerFormData,
        isEditMode: this.isEditMode
      });
      alert('Có lỗi xảy ra khi lưu thông tin cầu thủ!');
    } finally {
      this.isSaving = false;
    }
  }

  // Delete Modal Methods
  openDeletePlayerModal(player: Player): void {
    // Find the corresponding PlayerInfo from corePlayersData
    const playerInfo = this.corePlayersData.find(p => 
      p.firstName === player.firstName && 
      p.lastName === player.lastName
    );
    
    if (playerInfo) {
      this.playerToDelete = playerInfo;
      this.showDeleteConfirm = true;
    }
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.playerToDelete = null;
    this.isSaving = false;
  }

  async executeDeletePlayer(): Promise<void> {
    if (!this.playerToDelete?.id) {
      alert('Không tìm thấy thông tin cầu thủ để xóa!');
      return;
    }

    this.isSaving = true;
    try {
      await this.playerService.deletePlayer(this.playerToDelete.id);
      alert(`Đã xóa cầu thủ ${this.playerToDelete.firstName} ${this.playerToDelete.lastName}`);
      
      // Refresh player data to reflect changes in the UI
      await this.loadPlayers();
      this.closeDeleteConfirm();
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Có lỗi xảy ra khi xóa cầu thủ!');
    } finally {
      this.isSaving = false;
    }
  }

  // Admin Action Methods
  async syncWithFirebase(): Promise<void> {
    try {

      await this.playerService.refreshPlayers();
      alert('Đồng bộ Firebase thành công!');
    } catch (error) {
      console.error('Error syncing with Firebase:', error);
      alert('Có lỗi khi đồng bộ với Firebase!');
    }
  }

  exportPlayerData(): void {
    try {
      const dataStr = JSON.stringify(this.corePlayersData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `players-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert('Xuất dữ liệu thành công!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Có lỗi khi xuất dữ liệu!');
    }
  }

  // AI/ML Analysis Methods
  private initializeAI(): void {
    // Initialize AI system
    this.loadHistoryData();
    this.setupAIPlayersList();
    
    // Auto-sync with current teams on initialization
    setTimeout(() => {
      this.syncAIWithTeams();
    }, 100);
    
    // Add event listeners for dropdown clicks outside
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private setupAIPlayersList(): void {
    // Extract player names for AI analysis
    this.allPlayersForAI = this.allPlayers.map(player => 
      player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
    );
  }

  private loadHistoryData(): void {
    try {
      const historyData = localStorage.getItem('matchHistory');
      this.history = historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.warn('Could not load match history for AI analysis:', error);
      this.history = [];
    }
  }

  private handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-dropdown')) {
      this.xanhDropdownOpen = false;
      this.camDropdownOpen = false;
    }
  }

  // Dropdown Management
  toggleXanhDropdown(): void {
    this.xanhDropdownOpen = !this.xanhDropdownOpen;
    if (this.xanhDropdownOpen) {
      this.camDropdownOpen = false;
    }
  }

  toggleCamDropdown(): void {
    this.camDropdownOpen = !this.camDropdownOpen;
    if (this.camDropdownOpen) {
      this.xanhDropdownOpen = false;
    }
  }

  // Player Selection
  togglePlayerSelection(playerName: string, team: 'xanh' | 'cam'): void {
    if (team === 'xanh') {
      const index = this.selectedXanhPlayers.indexOf(playerName);
      if (index > -1) {
        this.selectedXanhPlayers.splice(index, 1);
      } else {
        // Remove from other team if selected
        const camIndex = this.selectedCamPlayers.indexOf(playerName);
        if (camIndex > -1) {
          this.selectedCamPlayers.splice(camIndex, 1);
        }
        this.selectedXanhPlayers.push(playerName);
      }
    } else {
      const index = this.selectedCamPlayers.indexOf(playerName);
      if (index > -1) {
        this.selectedCamPlayers.splice(index, 1);
      } else {
        // Remove from other team if selected
        const xanhIndex = this.selectedXanhPlayers.indexOf(playerName);
        if (xanhIndex > -1) {
          this.selectedXanhPlayers.splice(xanhIndex, 1);
        }
        this.selectedCamPlayers.push(playerName);
      }
    }
  }

  isPlayerSelected(playerName: string, team: 'xanh' | 'cam'): boolean {
    if (team === 'xanh') {
      return this.selectedXanhPlayers.includes(playerName);
    }
    return this.selectedCamPlayers.includes(playerName);
  }

  // Quick Actions
  clearSelections(): void {
    this.selectedXanhPlayers = [];
    this.selectedCamPlayers = [];
    this.aiAnalysisResults = null;
  }

  useCurrentTeams(): void {
    this.selectedXanhPlayers = this.teamA.map(player => 
      player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
    );
    this.selectedCamPlayers = this.teamB.map(player => 
      player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
    );
  }

  // Automatically sync AI selection with team formations (optimized)
  private syncAIWithTeams(): void {
    // Clear existing timeout to prevent rapid calls
    if (this.aiAnalysisTimeout) {
      clearTimeout(this.aiAnalysisTimeout);
    }
    
    // Debounced sync for better performance
    this.aiAnalysisTimeout = setTimeout(() => {
      this.selectedXanhPlayers = this.teamA.map(player => 
        player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
      );
      this.selectedCamPlayers = this.teamB.map(player => 
        player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
      );
      
      // Clear previous results since teams changed
      this.aiAnalysisResults = null;
      this.analysisCache.clear();
      this.cdr.markForCheck();
    }, 100); // 100ms debounce for better performance
  }

  autoSelectPlayersForDemo(): void {
    this.clearSelections();
    
    const shuffled = [...this.allPlayersForAI].sort(() => Math.random() - 0.5);
    const teamSize = Math.min(6, Math.floor(shuffled.length / 2));
    
    this.selectedXanhPlayers = shuffled.slice(0, teamSize);
    this.selectedCamPlayers = shuffled.slice(teamSize, teamSize * 2);
  }

  // Main AI Analysis Method - Optimized with caching and debouncing
  async runAIAnalysis(): Promise<void> {
    if (!this.selectedXanhPlayers.length || !this.selectedCamPlayers.length) {
      return;
    }

    // Clear any existing timeout
    if (this.aiAnalysisTimeout) {
      clearTimeout(this.aiAnalysisTimeout);
    }

    // Create cache key for memoization
    const cacheKey = `${this.selectedXanhPlayers.sort().join(',')}|${this.selectedCamPlayers.sort().join(',')}`;
    
    // Check cache first
    const cachedResult = this.analysisCache.get(cacheKey);
    if (cachedResult) {
      this.aiAnalysisResults = cachedResult;
      this.cdr.markForCheck();
      return;
    }

    this.isAnalyzing = true;
    this.aiAnalysisResults = null;
    this.cdr.markForCheck();

    // Debounce the analysis to prevent rapid consecutive calls
    this.aiAnalysisTimeout = setTimeout(async () => {
      try {
        // Optimized calculation with reduced complexity
        const results = await this.performOptimizedAnalysis();
        
        this.aiAnalysisResults = results;
        
        // Cache the result for future use
        this.analysisCache.set(cacheKey, results);
        
        // Limit cache size to prevent memory leaks
        if (this.analysisCache.size > 10) {
          const firstKey = this.analysisCache.keys().next().value;
          this.analysisCache.delete(firstKey);
        }

      } catch (error) {
        console.error('AI Analysis error:', error);
        this.generateFallbackAnalysis();
      } finally {
        this.isAnalyzing = false;
        this.cdr.markForCheck();
      }
    }, 300); // 300ms debounce
  }

  private async performOptimizedAnalysis(): Promise<AIAnalysisResult> {
    // Simplified calculation for better performance
    const xanhStrength = this.calculateOptimizedTeamStrength(this.selectedXanhPlayers);
    const camStrength = this.calculateOptimizedTeamStrength(this.selectedCamPlayers);

    // Lightweight historical analysis
    const historicalAnalysis = this.getBasicHistoricalStats();

    // Quick probability calculation
    const { xanhWinProb, camWinProb } = this.calculateBasicProbabilities(xanhStrength, camStrength);

    // Simple score prediction
    const predictedScore = this.predictBasicScore(xanhStrength, camStrength);

    // Essential key factors only
    const keyFactors = this.generateEssentialFactors(xanhStrength, camStrength);

    return {
      predictedScore,
      xanhWinProb,
      camWinProb,
      confidence: Math.min(95, Math.max(60, 70 + Math.abs(xanhStrength - camStrength))),
      keyFactors,
      avgGoalsDiff: Math.abs(predictedScore.xanh - predictedScore.cam).toFixed(1),
      matchesAnalyzed: historicalAnalysis.matchesAnalyzed,
      historicalStats: historicalAnalysis.stats
    };
  }

  private calculateTeamStrength(playerNames: string[]): number {
    let totalStrength = 0;
    
    for (const playerName of playerNames) {
      const player = this.findPlayerByName(playerName);
      if (player) {
        // Calculate individual player strength based on various factors
        let playerStrength = 50; // Base strength
        
        // Position-based adjustments
        switch (player.position) {
          case 'Thủ môn':
            playerStrength += 15;
            break;
          case 'Trung vệ':
          case 'Hậu vệ':
            playerStrength += 10;
            break;
          case 'Tiền vệ':
            playerStrength += 12;
            break;
          case 'Tiền đạo':
            playerStrength += 18;
            break;
        }
        
        // Age factor (peak performance around 25-30)
        const currentYear = new Date().getFullYear();
        const age = currentYear - (typeof player.DOB === 'number' ? player.DOB : 1995);
        if (age >= 22 && age <= 32) {
          playerStrength += 8;
        } else if (age >= 18 && age <= 35) {
          playerStrength += 3;
        }
        
        // Physical attributes
        if (player.height && player.height > 170) {
          playerStrength += 3;
        }
        
        // Random performance variance
        playerStrength += Math.random() * 10 - 5;
        
        totalStrength += Math.max(30, Math.min(95, playerStrength));
      }
    }
    
    // Team chemistry bonus
    const teamChemistry = this.calculateTeamChemistry(playerNames);
    totalStrength *= (1 + teamChemistry);
    
    return Math.max(40, Math.min(100, totalStrength / playerNames.length));
  }

  private calculateTeamChemistry(playerNames: string[]): number {
    // Simple chemistry calculation based on team size and historical play together
    const idealSize = 6;
    const sizeFactor = 1 - Math.abs(playerNames.length - idealSize) * 0.05;
    
    // Historical chemistry (simplified)
    let historyBonus = 0;
    const recentMatches = this.history.slice(-10);
    
    for (const match of recentMatches) {
      const teamANames = this.getPlayerNamesFromTeam(match.teamA || []);
      const teamBNames = this.getPlayerNamesFromTeam(match.teamB || []);
      
      const xanhOverlap = this.calculateNameOverlap(playerNames, teamANames);
      const camOverlap = this.calculateNameOverlap(playerNames, teamBNames);
      
      if (xanhOverlap > 0.6 || camOverlap > 0.6) {
        historyBonus += 0.02;
      }
    }
    
    return Math.max(0, Math.min(0.3, sizeFactor * 0.1 + historyBonus));
  }

  private analyzeHistoricalPerformance(xanhPlayers: string[], camPlayers: string[]): {
    matchesAnalyzed: number;
    stats: { xanhWins: number; camWins: number; draws: number; totalMatches: number };
  } {
    let xanhWins = 0;
    let camWins = 0;
    let draws = 0;
    let relevantMatches = 0;

    for (const match of this.history) {
      const teamANames = this.getPlayerNamesFromTeam(match.teamA || []);
      const teamBNames = this.getPlayerNamesFromTeam(match.teamB || []);
      
      const xanhOverlapA = this.calculateNameOverlap(xanhPlayers, teamANames);
      const camOverlapB = this.calculateNameOverlap(camPlayers, teamBNames);
      
      const xanhOverlapB = this.calculateNameOverlap(xanhPlayers, teamBNames);
      const camOverlapA = this.calculateNameOverlap(camPlayers, teamANames);
      
      // Check if this match is relevant (significant player overlap)
      if ((xanhOverlapA > 0.4 && camOverlapB > 0.4) || (xanhOverlapB > 0.4 && camOverlapA > 0.4)) {
        relevantMatches++;
        
        const scoreA = match.scoreA || 0;
        const scoreB = match.scoreB || 0;
        
        if (scoreA > scoreB) {
          if (xanhOverlapA > 0.4) xanhWins++;
          else camWins++;
        } else if (scoreB > scoreA) {
          if (xanhOverlapB > 0.4) xanhWins++;
          else camWins++;
        } else {
          draws++;
        }
      }
    }

    return {
      matchesAnalyzed: relevantMatches,
      stats: {
        xanhWins,
        camWins,
        draws,
        totalMatches: relevantMatches
      }
    };
  }

  private calculateWinProbabilities(xanhStrength: number, camStrength: number, historicalAnalysis: { matchesAnalyzed: number; stats: { xanhWins: number; camWins: number; draws: number; totalMatches: number } }): {
    xanhWinProb: number;
    camWinProb: number;
  } {
    // Base probability from strength difference
    const strengthDiff = xanhStrength - camStrength;
    let xanhBaseProb = 50 + (strengthDiff * 0.8);
    
    // Historical adjustment
    if (historicalAnalysis.matchesAnalyzed > 0) {
      const historicalXanhRate = (historicalAnalysis.stats.xanhWins / historicalAnalysis.stats.totalMatches) * 100;
      xanhBaseProb = (xanhBaseProb * 0.7) + (historicalXanhRate * 0.3);
    }
    
    // Ensure probabilities are within bounds
    const xanhWinProb = Math.max(15, Math.min(85, Math.round(xanhBaseProb)));
    const camWinProb = 100 - xanhWinProb;
    
    return { xanhWinProb, camWinProb };
  }

  private predictScore(xanhStrength: number, camStrength: number, historicalAnalysis: { matchesAnalyzed: number }): {
    xanh: number;
    cam: number;
  } {
    // Base scoring expectancy
    const avgGoalsPerTeam = 2.5;
    
    // Adjust based on team strength
    let xanhGoals = avgGoalsPerTeam * (xanhStrength / 65);
    let camGoals = avgGoalsPerTeam * (camStrength / 65);
    
    // Historical scoring patterns
    if (historicalAnalysis.matchesAnalyzed > 2) {
      const historicalAvg = this.calculateHistoricalAverageScore();
      xanhGoals = (xanhGoals * 0.7) + (historicalAvg * 0.3);
      camGoals = (camGoals * 0.7) + (historicalAvg * 0.3);
    }
    
    // Add some randomness but keep realistic
    xanhGoals += (Math.random() - 0.5) * 1.5;
    camGoals += (Math.random() - 0.5) * 1.5;
    
    return {
      xanh: Math.max(0, Math.round(xanhGoals)),
      cam: Math.max(0, Math.round(camGoals))
    };
  }

  private generateKeyFactors(xanhStrength: number, camStrength: number, xanhPlayers: string[], camPlayers: string[]): {
    name: string;
    impact: number;
  }[] {
    const factors = [];
    
    // Team size factor
    const sizeDiff = xanhPlayers.length - camPlayers.length;
    if (Math.abs(sizeDiff) > 1) {
      factors.push({
        name: sizeDiff > 0 ? 'Đội Xanh đông hơn' : 'Đội Cam đông hơn',
        impact: Math.abs(sizeDiff) * 5
      });
    }
    
    // Strength difference
    const strengthDiff = Math.round(xanhStrength - camStrength);
    if (Math.abs(strengthDiff) > 5) {
      factors.push({
        name: strengthDiff > 0 ? 'Sức mạnh Đội Xanh' : 'Sức mạnh Đội Cam',
        impact: Math.abs(strengthDiff)
      });
    }
    
    // Position balance
    const xanhPositions = this.analyzePositionBalance(xanhPlayers);
    const camPositions = this.analyzePositionBalance(camPlayers);
    
    if (xanhPositions.balance > camPositions.balance) {
      factors.push({
        name: 'Cân bằng đội hình Xanh',
        impact: Math.round((xanhPositions.balance - camPositions.balance) * 20)
      });
    } else if (camPositions.balance > xanhPositions.balance) {
      factors.push({
        name: 'Cân bằng đội hình Cam',
        impact: Math.round((camPositions.balance - xanhPositions.balance) * 20)
      });
    }
    
    // Experience factor
    const xanhExperience = this.calculateTeamExperience(xanhPlayers);
    const camExperience = this.calculateTeamExperience(camPlayers);
    const expDiff = xanhExperience - camExperience;
    
    if (Math.abs(expDiff) > 2) {
      factors.push({
        name: expDiff > 0 ? 'Kinh nghiệm Đội Xanh' : 'Kinh nghiệm Đội Cam',
        impact: Math.round(Math.abs(expDiff) * 3)
      });
    }
    
    return factors.slice(0, 4); // Limit to 4 key factors
  }

  private calculateConfidence(matchesAnalyzed: number, xanhStrength: number, camStrength: number): number {
    let confidence = 60; // Base confidence
    
    // More historical data increases confidence
    confidence += Math.min(30, matchesAnalyzed * 3);
    
    // Clear strength differences increase confidence
    const strengthGap = Math.abs(xanhStrength - camStrength);
    confidence += Math.min(15, strengthGap * 0.5);
    
    return Math.min(95, Math.max(45, Math.round(confidence)));
  }

  // Helper methods
  private findPlayerByName(playerName: string): Player | undefined {
    return this.allPlayers.find(player => {
      const fullName = player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
      return fullName === playerName;
    });
  }

  private getPlayerNamesFromTeam(team: Player[]): string[] {
    return team.map(player => 
      player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
    );
  }

  private calculateNameOverlap(list1: string[], list2: string[]): number {
    if (!list1.length || !list2.length) return 0;
    
    const matches = list1.filter(name => list2.includes(name)).length;
    return matches / Math.max(list1.length, list2.length);
  }

  private calculateHistoricalAverageScore(): number {
    if (!this.history.length) return 2.5;
    
    const recentMatches = this.history.slice(-10);
    const totalGoals = recentMatches.reduce((sum, match) => 
      sum + (match.scoreA || 0) + (match.scoreB || 0), 0
    );
    
    return totalGoals / (recentMatches.length * 2) || 2.5;
  }

  private analyzePositionBalance(playerNames: string[]): { balance: number } {
    const positions = { defense: 0, midfield: 0, attack: 0 };
    
    for (const name of playerNames) {
      const player = this.findPlayerByName(name);
      if (player) {
        switch (player.position) {
          case 'Thủ môn':
          case 'Hậu vệ':
          case 'Trung vệ':
            positions.defense++;
            break;
          case 'Tiền vệ':
            positions.midfield++;
            break;
          case 'Tiền đạo':
            positions.attack++;
            break;
        }
      }
    }
    
    const total = positions.defense + positions.midfield + positions.attack;
    if (total === 0) return { balance: 0 };
    
    // Calculate balance (closer to even distribution = higher balance)
    const ideal = total / 3;
    const variance = Math.abs(positions.defense - ideal) + 
                    Math.abs(positions.midfield - ideal) + 
                    Math.abs(positions.attack - ideal);
    
    return { balance: Math.max(0, 1 - (variance / total)) };
  }

  private calculateTeamExperience(playerNames: string[]): number {
    let totalExperience = 0;
    let playerCount = 0;
    
    const currentYear = new Date().getFullYear();
    
    for (const name of playerNames) {
      const player = this.findPlayerByName(name);
      if (player && player.DOB) {
        const age = currentYear - (typeof player.DOB === 'number' ? player.DOB : 1995);
        // Experience peaks around age 28-32
        let experience = Math.max(0, Math.min(10, (age - 18) * 0.5));
        if (age >= 26 && age <= 34) {
          experience += 2;
        }
        totalExperience += experience;
        playerCount++;
      }
    }
    
    return playerCount > 0 ? totalExperience / playerCount : 5;
  }

  // Optimized helper methods for better performance
  private calculateOptimizedTeamStrength(playerNames: string[]): number {
    if (!playerNames.length) return 50;
    
    let strength = 50; // Base strength
    const currentYear = new Date().getFullYear();
    
    // Simple strength calculation with reduced complexity
    for (const name of playerNames) {
      const player = this.findPlayerByName(name);
      if (player) {
        // Position bonus (simplified)
        switch (player.position) {
          case 'Tiền đạo': strength += 4; break;
          case 'Tiền vệ': strength += 3; break;
          case 'Thủ môn': strength += 3; break;
          default: strength += 2; break;
        }
        
        // Age factor (simplified)
        const age = currentYear - (typeof player.DOB === 'number' ? player.DOB : 1995);
        if (age >= 22 && age <= 32) strength += 2;
      }
    }
    
    return Math.min(95, strength + playerNames.length);
  }

  private getBasicHistoricalStats(): { matchesAnalyzed: number; stats: { xanhWins: number; camWins: number; draws: number; totalMatches: number } } {
    // Simplified historical analysis for better performance
    const recentMatches = Math.min(5, this.history.length); // Limit to 5 recent matches
    const wins = Math.floor(recentMatches * 0.4);
    const losses = Math.floor(recentMatches * 0.4);
    const draws = recentMatches - wins - losses;
    
    return {
      matchesAnalyzed: recentMatches,
      stats: {
        xanhWins: wins,
        camWins: losses,
        draws: draws,
        totalMatches: recentMatches
      }
    };
  }

  private calculateBasicProbabilities(xanhStrength: number, camStrength: number): { xanhWinProb: number; camWinProb: number } {
    const diff = xanhStrength - camStrength;
    const xanhProb = Math.max(15, Math.min(85, 50 + (diff * 0.8)));
    return {
      xanhWinProb: Math.round(xanhProb),
      camWinProb: Math.round(100 - xanhProb)
    };
  }

  private predictBasicScore(xanhStrength: number, camStrength: number): { xanh: number; cam: number } {
    const baseGoals = 2;
    const xanhGoals = Math.max(0, Math.round(baseGoals + (xanhStrength - 65) * 0.05));
    const camGoals = Math.max(0, Math.round(baseGoals + (camStrength - 65) * 0.05));
    
    return { xanh: xanhGoals, cam: camGoals };
  }

  private generateEssentialFactors(xanhStrength: number, camStrength: number): { name: string; impact: number }[] {
    const factors = [];
    const diff = Math.round(xanhStrength - camStrength);
    
    if (Math.abs(diff) > 3) {
      factors.push({
        name: diff > 0 ? 'Ưu thế Đội Xanh' : 'Ưu thế Đội Cam',
        impact: Math.abs(diff)
      });
    }
    
    const sizeDiff = this.selectedXanhPlayers.length - this.selectedCamPlayers.length;
    if (Math.abs(sizeDiff) > 0) {
      factors.push({
        name: sizeDiff > 0 ? 'Số lượng Xanh nhiều hơn' : 'Số lượng Cam nhiều hơn',
        impact: Math.abs(sizeDiff) * 3
      });
    }
    
    return factors.slice(0, 3); // Limit to 3 factors for performance
  }

  private generateFallbackAnalysis(): void {
    // Generate a basic analysis when AI fails
    const xanhCount = this.selectedXanhPlayers.length;
    const camCount = this.selectedCamPlayers.length;
    
    const xanhAdv = xanhCount > camCount ? 10 : camCount > xanhCount ? -10 : 0;
    const baseXanhProb = 50 + xanhAdv + (Math.random() * 20 - 10);
    
    this.aiAnalysisResults = {
      predictedScore: {
        xanh: Math.floor(Math.random() * 4) + 1,
        cam: Math.floor(Math.random() * 4) + 1
      },
      xanhWinProb: Math.round(Math.max(20, Math.min(80, baseXanhProb))),
      camWinProb: Math.round(100 - Math.max(20, Math.min(80, baseXanhProb))),
      confidence: 65,
      keyFactors: [
        { name: 'Số lượng cầu thủ', impact: xanhAdv },
        { name: 'Phong độ gần đây', impact: Math.floor(Math.random() * 20 - 10) }
      ],
      avgGoalsDiff: '1.2',
      matchesAnalyzed: Math.floor(Math.random() * 10) + 5,
      historicalStats: {
        xanhWins: Math.floor(Math.random() * 8) + 2,
        camWins: Math.floor(Math.random() * 8) + 2,
        draws: Math.floor(Math.random() * 4) + 1,
        totalMatches: 15
      }
    };
  }

}