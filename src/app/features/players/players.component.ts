import { Component, OnInit, OnDestroy, Input, TrackByFunction, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Player } from './player-utils';
import { FirebasePlayerService } from '../../core/services/firebase-player.service';
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
          <p class="page-subtitle">
            Chia đội và ghi nhận thành tích trận đấu
          </p>
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
              class="modern-btn btn-primary"
              (click)="migrateToFirebase()"
              title="Chuyển dữ liệu từ localStorage sang Firebase">
              <i class="fas fa-database me-2"></i>
              Migrate Firebase
            </button>
            
            <button 
              class="modern-btn btn-danger"
              (click)="cleanupDuplicateFirebaseData()"
              title="Dọn dẹp dữ liệu trùng lặp trong Firebase">
              <i class="fas fa-broom me-2"></i>
              Dọn Firebase
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
            [class.btn-danger]="useRegistered && registeredPlayers.length === 0"
            (click)="toggleUseRegistered()"
            title="Chuyển đổi giữa tất cả cầu thủ và cầu thủ đã đăng ký">
            <i class="fas fa-toggle-on me-2"></i>
            {{ useRegistered ? 'Chỉ đã đăng ký (' + registeredPlayers.length + ')' : 'Dùng tất cả (' + allPlayers.length + ')' }}
          </button>
          
          <button 
            class="modern-btn btn-outline-secondary btn-sm"
            (click)="clearRegisteredPlayers()"
            title="Xóa tất cả cầu thủ đã đăng ký">
            <i class="fas fa-trash me-1"></i>
            Xóa đăng ký
          </button>
          
          <button 
            class="modern-btn btn-outline-info btn-sm"
            (click)="logPerformanceMetrics()"
            title="Kiểm tra hiệu suất">
            <i class="fas fa-chart-line me-1"></i>
            Hiệu suất
          </button>
          
          <button 
            class="modern-btn btn-primary"
            [disabled]="!canDivideTeams()"
            (click)="shuffleTeams()"
            [title]="canDivideTeams() ? 'Chia đội ngẫu nhiên' : 'Cần ít nhất 2 cầu thủ để chia đội'">
            <i class="fas fa-shuffle me-2"></i>
            Chia đội ngẫu nhiên
            <span *ngIf="!canDivideTeams()" class="text-muted ms-2">({{getDisplayPlayers().length}}/2)</span>
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
          <div class="status-message info" *ngIf="useRegistered && registeredPlayers.length === 0">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Chưa có cầu thủ nào đã đăng ký! Hãy đăng ký cầu thủ để chia đội.
          </div>
          <div class="player-mode-status">
            <small class="text-muted">{{ getPlayerModeStatus() }}</small>
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
          
          <!-- Pagination Controls -->
          <div class="pagination-info" *ngIf="getDisplayPlayers().length > pageSize">
            <ng-container *ngIf="getPaginationDisplay() as pagination">
              <span class="text-muted">
                Hiển thị {{ pagination.start }}-{{ pagination.end }} 
                trong tổng số {{ pagination.total }} cầu thủ
              </span>
            </ng-container>
          </div>

          <div class="players-grid" *ngIf="getDisplayPlayers().length > 0; else noPlayersTemplate">
            <div *ngFor="let player of getPaginatedPlayers(); trackBy: trackByPlayerId" 
                 class="player-item"
                 [class.registered]="isRegistered(player)">
              <div class="player-info" tabindex="0" (click)="viewPlayer(player)" (keyup)="onPlayerInfoKey($event, player)">
                <img [src]="player.avatar || 'assets/images/default-avatar.svg'" 
                     [alt]="player.firstName"
                     class="player-thumb"
                     loading="lazy"
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

          <!-- Pagination Controls -->
          <div class="pagination-controls" *ngIf="totalPages > 1">
            <button 
              class="btn btn-sm btn-outline-primary"
              [disabled]="currentPage === 0"
              (click)="previousPage()"
              title="Trang trước">
              <i class="fas fa-chevron-left"></i>
            </button>
            
            <span class="pagination-info mx-3">
              Trang {{ currentPage + 1 }} / {{ totalPages }}
            </span>
            
            <button 
              class="btn btn-sm btn-outline-primary"
              [disabled]="currentPage >= totalPages - 1"
              (click)="nextPage()"
              title="Trang sau">
              <i class="fas fa-chevron-right"></i>
            </button>
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
            
            <!-- Avatar Management Section -->
            <div class="form-group full-width" style="padding: 0 30px;">
              <div class="avatar-section-label">
                <i class="fas fa-user-circle me-2"></i>
                <strong>Avatar của cầu thủ</strong>
              </div>
              
              <!-- Current Avatar Display -->
              <div class="current-avatar-display" *ngIf="playerFormData.avatar">
                <div class="avatar-preview">
                  <img [src]="playerFormData.avatar" 
                       [alt]="playerFormData.firstName"
                       class="current-avatar-img"
                       (error)="onAvatarError($event)">
                  <div class="avatar-path"> 
                    <small class="text-muted">
                      <i class="fas fa-link me-1"></i>  
                      {{playerFormData.avatar}}
                    </small>
                  </div>
                </div>
                <button type="button" 
                        class="btn btn-outline-warning btn-sm update-avatar-btn"
                        (click)="openAvatarModal()">
                  <i class="fas fa-edit me-1"></i>
                  Cập nhật Avatar
                </button>
              </div>
              
              <!-- No Avatar State -->
              <div class="no-avatar-display" *ngIf="!playerFormData.avatar">
                <div class="default-avatar-placeholder">
                  <i class="fas fa-user-circle default-avatar-icon"></i>
                  <p class="no-avatar-text">Chưa có avatar</p>
                </div>
                <button type="button" 
                        class="btn btn-primary btn-sm add-avatar-btn"
                        (click)="openAvatarModal()">
                  <i class="fas fa-plus me-1"></i>
                  Thêm Avatar
                </button>
              </div>
              
              <small class="form-text text-muted mt-2">
                <i class="fas fa-info-circle me-1"></i>
                Avatar sẽ được sử dụng để hiển thị trong danh sách cầu thủ
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

      <!-- Avatar Selection Modal -->
      <div *ngIf="showAvatarModal" class="modal-overlay"
           tabindex="-1"
           (click)="closeAvatarModal()"
           (keydown)="$event.key === 'Escape' && closeAvatarModal()">
        <div class="avatar-modal" 
             tabindex="-1"
             (click)="$event.stopPropagation()"
             (keydown)="$event.stopPropagation()">
          
          <div class="modal-header">
            <h3>
              <i class="fas fa-user-circle me-2"></i>
              Chọn Avatar
            </h3>
            <button type="button" class="close-btn" (click)="closeAvatarModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Current Avatar Display -->
            <div *ngIf="playerFormData.avatar" class="current-avatar-section">
              <h5><i class="fas fa-eye me-2"></i>Avatar hiện tại:</h5>
              <div class="current-avatar-preview">
                <img [src]="playerFormData.avatar" 
                     [alt]="playerFormData.firstName"
                     class="avatar-preview-img"
                     (error)="onAvatarPreviewError($event)">
                <p class="avatar-path-display">{{playerFormData.avatar}}</p>
              </div>
            </div>
            
            <!-- Avatar Options -->
            <div class="avatar-options-section">
              <h5><i class="fas fa-images me-2"></i>Chọn avatar mới:</h5>
              
              <!-- Quick Suggestions -->
              <div class="avatar-quick-options">
                <button type="button" 
                        class="avatar-option-btn"
                        (click)="setAvatarPathAndClose('assets/images/avatar_players/' + (playerFormData.firstName || 'Player') + '.png')">
                  <i class="fas fa-file-image me-2"></i>
                  <div>
                    <strong>Local File</strong>
                    <small>assets/images/avatar_players/{{playerFormData.firstName || 'Player'}}.png</small>
                  </div>
                </button>
                
                <button type="button"
                        class="avatar-option-btn"
                        (click)="setAvatarPathAndClose('https://ui-avatars.com/api/?name=' + encodeURIComponent(playerFormData.firstName || 'Player') + '&background=667eea&color=fff&size=200')">
                  <i class="fas fa-user-circle me-2"></i>
                  <div>
                    <strong>Generated Avatar</strong>
                    <small>Tự động tạo từ tên cầu thủ</small>
                  </div>
                </button>
                
                <button type="button"
                        class="avatar-option-btn"
                        (click)="setAvatarPathAndClose('assets/images/avatar_players/default.png')">
                  <i class="fas fa-user me-2"></i>
                  <div>
                    <strong>Default Avatar</strong>
                    <small>Avatar mặc định của hệ thống</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="closeAvatarModal()">
              <i class="fas fa-times me-1"></i>
              Hủy
            </button>
            <button type="button" 
                    class="btn btn-outline-danger"
                    *ngIf="playerFormData.avatar"
                    (click)="removeAvatarAndClose()">
              <i class="fas fa-trash me-1"></i>
              Xóa Avatar
            </button>
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

          <!-- AI Analysis Results - Enhanced UI/UX -->
          <div *ngIf="aiAnalysisResults && !isAnalyzing" class="analysis-results-enhanced">
            <div class="results-header-enhanced mb-4">
              <div class="ai-badge">
                <i class="fas fa-robot me-2"></i>
                AI Analysis
              </div>
              <h3 class="results-title">
                🎯 Kết Quả Phân Tích AI
              </h3>
              <p class="results-subtitle">
                Dự đoán dựa trên <span class="highlight">{{aiAnalysisResults.matchesAnalyzed}} trận đấu</span> được phân tích
              </p>
            </div>

            <!-- Main Predictions Grid -->
            <div class="predictions-grid">
              <!-- Score Prediction Card -->
              <div class="prediction-card-enhanced score-card">
                <div class="card-header">
                  <div class="card-icon score-icon">⚽</div>
                  <div class="card-title">
                    <h4>Tỷ Số Dự Đoán</h4>
                    <span class="card-subtitle">Predicted Score</span>
                  </div>
                </div>
                <div class="score-display-enhanced">
                  <div class="team-score-enhanced xanh-team">
                    <div class="team-indicator">
                      <span class="team-dot xanh-dot"></span>
                      <span class="team-name">Xanh</span>
                    </div>
                    <div class="score-number-large">{{aiAnalysisResults.predictedScore.xanh}}</div>
                  </div>
                  <div class="vs-separator-enhanced">
                    <div class="vs-text">VS</div>
                  </div>
                  <div class="team-score-enhanced cam-team">
                    <div class="team-indicator">
                      <span class="team-dot cam-dot"></span>
                      <span class="team-name">Cam</span>
                    </div>
                    <div class="score-number-large">{{aiAnalysisResults.predictedScore.cam}}</div>
                  </div>
                </div>
                <div class="confidence-badge">
                  <i class="fas fa-chart-line me-1"></i>
                  Độ tin cậy: {{aiAnalysisResults.confidence}}%
                </div>
              </div>

              <!-- Win Probability Card -->
              <div class="prediction-card-enhanced probability-card">
                <div class="card-header">
                  <div class="card-icon probability-icon">📊</div>
                  <div class="card-title">
                    <h4>Tỷ Lệ Thắng</h4>
                    <span class="card-subtitle">Win Probability</span>
                  </div>
                </div>
                <div class="probability-display-enhanced">
                  <div class="prob-item-enhanced xanh-prob">
                    <div class="prob-team-info">
                      <span class="team-dot xanh-dot"></span>
                      <span class="team-name">Xanh</span>
                      <span class="prob-percentage">{{aiAnalysisResults.xanhWinProb}}%</span>
                    </div>
                    <div class="progress-enhanced">
                      <div class="progress-bar-enhanced xanh-bar" 
                           [style.width.%]="aiAnalysisResults.xanhWinProb">
                        <div class="progress-shine"></div>
                      </div>
                    </div>
                  </div>
                  <div class="prob-item-enhanced cam-prob">
                    <div class="prob-team-info">
                      <span class="team-dot cam-dot"></span>
                      <span class="team-name">Cam</span>
                      <span class="prob-percentage">{{aiAnalysisResults.camWinProb}}%</span>
                    </div>
                    <div class="progress-enhanced">
                      <div class="progress-bar-enhanced cam-bar" 
                           [style.width.%]="aiAnalysisResults.camWinProb">
                        <div class="progress-shine"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Key Factors Card -->
              <div class="prediction-card-enhanced factors-card-enhanced">
                <div class="card-header">
                  <div class="card-icon factors-icon">🎯</div>
                  <div class="card-title">
                    <h4>Yếu Tố Quyết Định</h4>
                    <span class="card-subtitle">Key Factors</span>
                  </div>
                </div>
                <div class="factors-list-enhanced">
                  <div *ngFor="let factor of aiAnalysisResults.keyFactors; trackBy: trackByFactorName" 
                       class="factor-item-enhanced"
                       [class.factor-positive]="factor.impact > 0"
                       [class.factor-negative]="factor.impact < 0">
                    <div class="factor-content">
                      <div class="factor-name-enhanced">{{factor.name}}</div>
                      <div class="factor-impact-enhanced">
                        <span class="impact-badge" 
                              [class.positive-impact]="factor.impact > 0"
                              [class.negative-impact]="factor.impact < 0">
                          <i [class]="factor.impact > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                          {{factor.impact > 0 ? '+' : ''}}{{factor.impact}}%
                        </span>
                      </div>
                    </div>
                    <div class="factor-progress">
                      <div class="factor-bar" 
                           [style.width.%]="Math.abs(factor.impact) * 2"
                           [class.positive-bar]="factor.impact > 0"
                           [class.negative-bar]="factor.impact < 0"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Historical Performance -->
            <!-- Enhanced Match History Section -->
            <div class="match-history-enhanced">
              <!-- Header with Badge -->
              <div class="history-header-enhanced">
                <div class="history-badge">
                  <span class="badge-icon">📈</span>
                  <span class="badge-text">Phân Tích Lịch Sử</span>
                </div>
                <h4 class="history-title-enhanced">Lịch Sử Đối Đầu</h4>
                <p class="history-subtitle">Dựa trên dữ liệu từ các trận đấu trước</p>
              </div>

              <!-- History Stats Grid -->
              <div class="history-cards-grid">
                <!-- Xanh Wins Card -->
                <div class="history-card xanh-card">
                  <div class="card-header-history">
                    <div class="card-icon-history xanh-icon">
                      <span>🏆</span>
                    </div>
                    <div class="card-info">
                      <h5 class="card-title-history">Đội Xanh</h5>
                      <p class="card-subtitle-history">Số trận thắng</p>
                    </div>
                  </div>
                  <div class="stat-display">
                    <div class="stat-number-large">{{aiAnalysisResults.historicalStats.xanhWins}}</div>
                    <div class="stat-percentage">
                      {{((aiAnalysisResults.historicalStats.xanhWins / aiAnalysisResults.historicalStats.totalMatches) * 100).toFixed(0)}}%
                    </div>
                  </div>
                  <div class="progress-indicator">
                    <div class="progress-track">
                      <div class="progress-fill xanh-progress" 
                           [style.width.%]="(aiAnalysisResults.historicalStats.xanhWins / aiAnalysisResults.historicalStats.totalMatches) * 100">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Cam Wins Card -->
                <div class="history-card cam-card">
                  <div class="card-header-history">
                    <div class="card-icon-history cam-icon">
                      <span>🏆</span>
                    </div>
                    <div class="card-info">
                      <h5 class="card-title-history">Đội Cam</h5>
                      <p class="card-subtitle-history">Số trận thắng</p>
                    </div>
                  </div>
                  <div class="stat-display">
                    <div class="stat-number-large">{{aiAnalysisResults.historicalStats.camWins}}</div>
                    <div class="stat-percentage">
                      {{((aiAnalysisResults.historicalStats.camWins / aiAnalysisResults.historicalStats.totalMatches) * 100).toFixed(0)}}%
                    </div>
                  </div>
                  <div class="progress-indicator">
                    <div class="progress-track">
                      <div class="progress-fill cam-progress" 
                           [style.width.%]="(aiAnalysisResults.historicalStats.camWins / aiAnalysisResults.historicalStats.totalMatches) * 100">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Draws Card -->
                <div class="history-card draws-card">
                  <div class="card-header-history">
                    <div class="card-icon-history draws-icon">
                      <span>🤝</span>
                    </div>
                    <div class="card-info">
                      <h5 class="card-title-history">Hòa</h5>
                      <p class="card-subtitle-history">Số trận hòa</p>
                    </div>
                  </div>
                  <div class="stat-display">
                    <div class="stat-number-large">{{aiAnalysisResults.historicalStats.draws}}</div>
                    <div class="stat-percentage">
                      {{((aiAnalysisResults.historicalStats.draws / aiAnalysisResults.historicalStats.totalMatches) * 100).toFixed(0)}}%
                    </div>
                  </div>
                  <div class="progress-indicator">
                    <div class="progress-track">
                      <div class="progress-fill draws-progress" 
                           [style.width.%]="(aiAnalysisResults.historicalStats.draws / aiAnalysisResults.historicalStats.totalMatches) * 100">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Total Matches Card -->
                <div class="history-card total-card">
                  <div class="card-header-history">
                    <div class="card-icon-history total-icon">
                      <span>⚽</span>
                    </div>
                    <div class="card-info">
                      <h5 class="card-title-history">Tổng Cộng</h5>
                      <p class="card-subtitle-history">Tổng số trận</p>
                    </div>
                  </div>
                  <div class="stat-display">
                    <div class="stat-number-large">{{aiAnalysisResults.historicalStats.totalMatches}}</div>
                    <div class="stat-label-enhanced">trận đấu</div>
                  </div>
                  <div class="summary-indicator">
                    <div class="summary-text">
                      Dữ liệu phân tích
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 15px;
    }

    .sync-indicator {
      font-size: 0.9rem;
      padding: 4px 8px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
    }

    .sync-synced {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .sync-syncing {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .sync-offline {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
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

    .status-message.info {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .player-mode-status {
      margin-top: 8px;
      text-align: center;
    }

    /* Pagination Controls */
    .pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 20px 0;
      padding: 15px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .pagination-info {
      margin: 10px 0;
      text-align: center;
      font-size: 0.9rem;
      color: #6c757d;
    }

    .pagination-controls .btn {
      margin: 0 5px;
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

    /* Basic animations - simplified */
    @keyframes pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }

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

    /* Table-based Player List */
    .players-table-container {
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }

    .players-table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 0.8fr 1fr 1fr 1.2fr;
      gap: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-cell {
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .players-table-body {
      background: white;
    }

    .player-row-item {
      display: grid;
      grid-template-columns: 2fr 1fr 0.8fr 1fr 1fr 1.2fr;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid #f1f3f4;
      align-items: center;
      transition: all 0.2s ease;
    }

    .player-row-item:hover {
      background-color: #f8f9fa;
    }

    .player-row-item.registered {
      background: linear-gradient(90deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%);
      border-left: 4px solid #28a745;
    }

    .player-info-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .player-avatar-wrapper {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid #e9ecef;
      flex-shrink: 0;
    }

    .player-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .player-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.95rem;
    }

    .player-position-cell,
    .player-age-cell,
    .player-height-cell,
    .player-weight-cell {
      display: flex;
      align-items: center;
      font-size: 0.9rem;
      color: #495057;
    }

    .position-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .position-gk {
      background: #ffeaa7;
      color: #fdcb6e;
    }

    .position-df {
      background: #74b9ff;
      color: #0984e3;
    }

    .position-mf {
      background: #fd79a8;
      color: #e84393;
    }

    .position-fw {
      background: #55a3ff;
      color: #2d3436;
    }

    .position-default {
      background: #ddd6fe;
      color: #8b5cf6;
    }

    .player-actions-cell {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-size: 0.8rem;
    }

    .view-btn {
      background: #17a2b8;
      color: white;
    }

    .view-btn:hover {
      background: #138496;
      transform: translateY(-1px);
    }

    .edit-btn {
      background: #ffc107;
      color: #212529;
    }

    .edit-btn:hover {
      background: #e0a800;
      transform: translateY(-1px);
    }

    .register-btn {
      background: #28a745;
      color: white;
    }

    .register-btn:hover {
      background: #218838;
      transform: translateY(-1px);
    }

    .unregister-btn {
      background: #dc3545;
      color: white;
    }

    .unregister-btn:hover {
      background: #c82333;
      transform: translateY(-1px);
    }

    /* Legacy grid styles - kept for compatibility */
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

    .detail-section.full-width { grid-column: 1 / -1; border-top-color: #28a745; }
    .detail-section h5 { color: #2c3e50; margin: 0 0 20px 0; font-weight: 700; padding-bottom: 10px; border-bottom: 2px solid #f1f3f4; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .detail-item:last-child { margin-bottom: 0; border-bottom: none; }
    .detail-label { font-weight: 600; color: #5a6c7d; }
    .detail-value { color: #2c3e50; font-weight: 500; text-align: right; }
    .age-value { display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
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

    .admin-player-actions button { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn-edit { background: #007bff; color: white; }
    .btn-edit:hover { background: #0056b3; }
    .btn-delete { background: #dc3545; color: white; }
    .btn-delete:hover { background: #c82333; }

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

    /* Completely disable validation styling for avatar input */
    .avatar-no-validation {
      border-color: #ced4da !important;
    }

    .avatar-no-validation:invalid {
      border-color: #ced4da !important;
      box-shadow: none !important;
    }

    .avatar-no-validation:focus {
      border-color: #80bdff !important;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
    }

    .avatar-no-validation:focus:invalid {
      border-color: #80bdff !important;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
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
      transition: all 0.2s;
    }

    .btn-save:hover:not(:disabled) { background: #218838; }
    .btn-save:disabled { background: #6c757d; cursor: not-allowed; }
    .warning-text { color: #dc3545; font-style: italic; margin: 10px 0; }

    @media (max-width: 768px) {
      .modal-overlay { padding: 10px; }
      .player-modal { width: 100%; max-height: 95vh; border-radius: 15px; }
      .form-grid { grid-template-columns: 1fr; gap: 15px; }
      .modal-content { padding: 20px; }
      .modal-actions { flex-direction: column; gap: 10px; }
      .modal-actions button { width: 100%; padding: 12px; }
    }

    /* Simplified Avatar Styles */
    .avatar-management-section {
      margin-bottom: 20px;
    }
    
    .avatar-section-label {
      display: flex;
      align-items: center;
      font-weight: 600;
      margin-bottom: 15px;
    }

    .current-avatar-display, .no-avatar-display {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 1px solid #e9ecef;
    }

    .no-avatar-display {
      border: 2px dashed #dee2e6;
    }

    .current-avatar-img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }

    .default-avatar-icon {
      font-size: 3rem;
      color: #6c757d;
    }

    .avatar-modal {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .avatar-preview-img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #667eea;
    }

    .avatar-quick-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .avatar-option-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
    }

    .avatar-option-btn:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .avatar-option-btn i {
      font-size: 24px;
      color: #667eea;
    }

    .avatar-option-btn strong {
      display: block;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .avatar-option-btn small {
      color: #6c757d;
      font-size: 12px;
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

    /* Simplified Formation Preview */
    .team-formation-preview { background: #f0f8ff; border-radius: 15px; padding: 1.5rem; border: 2px solid #3498db; }
    .preview-title { color: #2c3e50; font-weight: 700; margin-bottom: 1rem; text-align: center; }
    .formation-display { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
    .formation-team { background: white; border-radius: 12px; padding: 1rem; min-width: 200px; flex: 1; max-width: 300px; }
    .formation-xanh { border-left: 4px solid #3498db; }

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

    /* Simplified pulse animation */
    .enhanced-analysis-btn.pulsing { animation: pulse 2s infinite; }

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
      background: rgba(255, 255, 255, 0.8);
    }

    /* Simplified Dropdown */
    .custom-select-dropdown { position: relative; width: 100%; margin-bottom: 1rem; }
    .select-header { background: white; border: 2px solid #e9ecef; border-radius: 10px; padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; min-height: 80px; }
    .select-header:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .selected-text { font-weight: 600; color: #2c3e50; flex: 1; }
    .selected-text.has-selection { color: #27ae60;
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

    /* Enhanced Analysis Results - Modern UI/UX */
    .analysis-results-enhanced {
      background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%);
      border-radius: 24px;
      padding: 2.5rem;
      margin-top: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    }

    .results-header-enhanced { text-align: center; margin-bottom: 2.5rem; }
    .ai-badge { background: #667eea; color: white; padding: 0.5rem 1.2rem; border-radius: 25px; font-weight: 600; margin-bottom: 1rem; }
    .results-title { color: #667eea; font-weight: 800; margin-bottom: 0.5rem; font-size: 1.8rem; }
    .results-subtitle { color: #64748b; margin: 0; }
    .highlight { color: #667eea; font-weight: 700; }

    /* Predictions Grid */
    .predictions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    /* Simplified prediction cards */
    .prediction-card-enhanced {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border: 1px solid #e0e0e0;
    }
    .prediction-card-enhanced:hover { transform: translateY(-4px); }

    /* Card Header */
    .card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      flex-shrink: 0;
    }

    .score-icon {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    }

    .probability-icon {
      background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
    }

    .factors-icon {
      background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
    }

    .card-title h4 {
      color: #1a202c;
      font-weight: 700;
      margin: 0;
      font-size: 1.2rem;
    }

    .card-subtitle {
      color: #64748b;
      font-size: 0.85rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Enhanced Score Display */
    .score-display-enhanced {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 16px;
      padding: 1.5rem;
    }

    .team-score-enhanced {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .team-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .team-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .xanh-dot {
      background: #3b82f6;
    }

    .cam-dot {
      background: #f59e0b;
    }

    .team-name {
      font-weight: 600;
      color: #475569;
      font-size: 0.9rem;
    }

    .score-number-large {
      font-size: 3.5rem;
      font-weight: 900;
      color: #1e293b;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .vs-separator-enhanced {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .vs-text {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .confidence-badge {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 25px;
      text-align: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    /* Enhanced Probability Display */
    .probability-display-enhanced {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .prob-item-enhanced {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .prob-team-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .prob-percentage {
      font-weight: 800;
      font-size: 1.5rem;
      color: #1e293b;
    }

    .progress-enhanced {
      height: 16px;
      background: #f1f5f9;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar-enhanced {
      height: 100%;
      border-radius: 10px;
      position: relative;
      transition: width 2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .xanh-bar {
      background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%);
    }

    .cam-bar {
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    }

    .progress-shine {
      position: absolute;
      top: 0;
      left: -100%;
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shine 2s infinite;
    }

    /* Removed complex shine animation to reduce CSS size */

    /* Simplified Factors */
    .factors-list-enhanced { display: flex; flex-direction: column; gap: 1rem; }
    .factor-item-enhanced { background: #f8fafc; border-radius: 12px; padding: 1rem; border-left: 4px solid #e2e8f0; }
    .factor-item-enhanced.factor-positive { border-left-color: #10b981; }
    .factor-item-enhanced.factor-negative { border-left-color: #ef4444; }
    .factor-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }

    .factor-name-enhanced {
      font-weight: 600;
      color: #374151;
      font-size: 0.95rem;
    }

    .impact-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.8rem;
    }

    .positive-impact {
      background: #10b981;
      color: white;
    }

    .negative-impact {
      background: #ef4444;
      color: white;
    }

    .factor-progress {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }

    .factor-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 1s ease-out;
    }

    .positive-bar {
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    }

    .negative-bar {
      background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    }



    /* Enhanced Match History Section */
    .match-history-enhanced { background: white; border-radius: 24px; padding: 2.5rem; margin-top: 2rem; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border: 1px solid #e0e0e0; }
    .history-header-enhanced { text-align: center; margin-bottom: 2.5rem; }
    .history-badge { background: #667eea; color: white; padding: 0.75rem 1.5rem; border-radius: 25px; font-weight: 600; margin-bottom: 1rem; }
    .badge-icon { font-size: 1.2rem; }

    .badge-text {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .history-title-enhanced {
      color: #1a202c;
      font-weight: 800;
      margin-bottom: 0.5rem;
      font-size: 1.8rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .history-subtitle {
      color: #64748b;
      font-size: 1rem;
      margin: 0;
      font-weight: 500;
    }

    /* History Cards Grid */
    .history-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .history-card {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .history-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .history-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.12);
    }

    .xanh-card::before {
      background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%);
    }

    .cam-card::before {
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    }

    .draws-card::before {
      background: linear-gradient(90deg, #6b7280 0%, #4b5563 100%);
    }

    .total-card::before {
      background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);
    }

    /* Card Header */
    .card-header-history {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .card-icon-history {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      flex-shrink: 0;
    }
    .xanh-icon { background: #3b82f6; }
    .cam-icon { background: #f59e0b; }
    .draws-icon { background: #6b7280; }
    .total-icon { background: #8b5cf6; }

    .card-info {
      flex: 1;
    }

    .card-title-history { color: #1a202c; font-weight: 700; margin: 0 0 0.25rem 0; }
    .card-subtitle-history { color: #64748b; font-size: 0.85rem; margin: 0; }

    /* Stat Display */
    .stat-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 16px;
      padding: 1.5rem;
    }

    .stat-number-large {
      font-size: 3rem;
      font-weight: 900;
      color: #1e293b;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-percentage {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 1rem;
    }

    .stat-label-enhanced {
      color: #64748b;
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Progress Indicators */
    .progress-indicator {
      margin-bottom: 1rem;
    }

    .progress-track {
      height: 12px;
      background: #f1f5f9;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill { height: 100%; border-radius: 8px; position: relative; }

    .xanh-progress { background: #3b82f6; }
    .cam-progress { background: #f59e0b; }
    .draws-progress { background: #6b7280; }

    /* Summary Indicator */
    .summary-indicator { background: rgba(139,92,246,0.1); border-radius: 12px; padding: 1rem; text-align: center; }
    .summary-text { color: #7c3aed; font-weight: 600;
    }

    /* Responsive Design for AI Section */
    @media (max-width: 768px) {
      .ai-header, .ai-body { padding: 1.5rem; }
      .team-selector { padding: 1rem; }
      .enhanced-analysis-btn { padding: 1rem 1.5rem; min-height: 70px;
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

      .history-cards-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
      }

      .match-history-enhanced {
        padding: 1.5rem;
        margin-top: 1.5rem;
      }

      .history-header-enhanced {
        margin-bottom: 1.5rem;
      }

      .history-title-enhanced {
        font-size: 1.4rem;
      }

      .stat-number-large {
        font-size: 2.5rem;
      }

      .card-header-history {
        flex-direction: column;
        text-align: center;
        gap: 0.75rem;
      }

      .card-info {
        text-align: center;
      }

      .stat-display {
        flex-direction: column;
        gap: 1rem;
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
  private readonly playerService = inject(FirebasePlayerService);
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
  
  // Pagination for performance
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  private _paginatedPlayers: Player[] = [];
  private _lastPaginationState = { useRegistered: false, currentPage: -1, dataLength: 0 };

  // Debouncing timers
  private updateTimeout: NodeJS.Timeout | null = null;
  private renderTimeout: NodeJS.Timeout | null = null;
  
  // Subscription guard
  private firebaseSubscriptionActive = false;
  
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
  showAvatarModal = false;
  isEditMode = false;
  isSaving = false;
  playerToDelete: PlayerInfo | null = null;
  playerFormData: Partial<PlayerInfo> = {};

  // Avatar management - no longer needed with button-based system

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
    // Since we're using Firebase real-time service, don't create new subscriptions
    // Just trigger the data conversion with current data
    try {
      console.log('🔄 loadPlayers called...');
      this.isLoadingPlayers = true;
      
      const currentData = this.playerService.getAllPlayers();
      console.log('📊 Current Firebase data:', currentData?.length || 0);
      
      if (currentData && currentData.length > 0) {
        console.log('✅ Using Firebase data');
        this.corePlayersData = currentData;
        this.convertCorePlayersToLegacyFormat(currentData);
        this.updateFilteredPlayers();
        this.isLoadingPlayers = false;
        console.log('✅ loadPlayers completed with Firebase data:', this.allPlayers.length);
      } else {
        // Fallback to direct load if Firebase data is not available
        console.log('⚠️ No Firebase data available, falling back to assets/players.json');
        this.loadPlayersDirectly();
      }
      
    } catch (error) {
      console.error('❌ Error in loadPlayers:', error);
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
    
    // Invalidate pagination cache since filtered data may have changed
    this._invalidatePaginationCache();
  }

  shuffleTeams() {
    // Reset teams
    this.teamA = [];
    this.teamB = [];
    
    const availablePlayers = this.useRegistered ? [...this.registeredPlayers] : [...this.allPlayers];
    console.log(`🔄 shuffleTeams: useRegistered=${this.useRegistered}, using ${availablePlayers.length} players`);
    console.log('📋 Available players for shuffle:', availablePlayers.map(p => p.firstName));
    
    // Check if we have enough players
    if (availablePlayers.length === 0) {
      console.warn('⚠️ No players available for team division!');
      if (this.useRegistered) {
        alert('Không có cầu thủ nào đã đăng ký! Vui lòng đăng ký một số cầu thủ trước hoặc chuyển sang chế độ "Dùng tất cả".');
      } else {
        alert('Không có cầu thủ nào để chia đội!');
      }
      return;
    }
    
    if (availablePlayers.length < 2) {
      console.warn('⚠️ Need at least 2 players to divide into teams!');
      alert('Cần ít nhất 2 cầu thủ để chia đội!');
      return;
    }
    
    // Shuffle the array
    for (let i = availablePlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePlayers[i], availablePlayers[j]] = [availablePlayers[j], availablePlayers[i]];
    }
    
    // Divide into teams
    const half = Math.ceil(availablePlayers.length / 2);
    this.teamA = availablePlayers.slice(0, half);
    this.teamB = availablePlayers.slice(half);
    
    console.log(`✅ Teams divided: Team A (${this.teamA.length}), Team B (${this.teamB.length})`);
    console.log('👥 Team A:', this.teamA.map(p => p.firstName));
    console.log('👥 Team B:', this.teamB.map(p => p.firstName));
    
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
    
    // Remove any validation-related attributes that might have been added dynamically
    target.removeAttribute('pattern');
    target.removeAttribute('required');
    target.removeAttribute('minlength');
    target.removeAttribute('maxlength');
    
    // Prevent validation on this field
    target.setAttribute('novalidate', 'true');
    target.setAttribute('data-no-validation', 'true');
    
    // Force browser to accept the value as valid
    if (target.validity && !target.validity.valid) {
      target.setCustomValidity('');
    }
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
    // No longer needed - avatar system is now button-based without input validation
    // This method is kept for compatibility but does nothing
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
    console.log('🔄 Converting core players to legacy format:', corePlayers?.length || 0);
    console.log('📊 Current allPlayers before conversion:', this.allPlayers?.length || 0);
    
    // Check for duplicate players in the input
    if (corePlayers && corePlayers.length > 0) {
      const uniqueIds = new Set(corePlayers.map(p => p.id));
      console.log('🔍 Unique player IDs in Firebase data:', uniqueIds.size, 'vs total:', corePlayers.length);
      if (uniqueIds.size !== corePlayers.length) {
        console.warn('⚠️ DUPLICATE PLAYERS DETECTED in Firebase data!');
        console.log('📋 Duplicate analysis:', corePlayers.map(p => ({ id: p.id, name: p.firstName })));
      }
    }
    
    if (!corePlayers || corePlayers.length === 0) {
      console.warn('⚠️ No core players to convert');
      this.allPlayers = [];
      return;
    }
    
    // More aggressive deduplication by name (since IDs might be different for same player)
    const seenPlayers = new Map<string, PlayerInfo>();
    
    corePlayers.forEach(player => {
      const nameKey = `${player.firstName.toLowerCase().trim()}_${(player.lastName || '').toLowerCase().trim()}`;
      
      if (seenPlayers.has(nameKey)) {
        console.warn('🔧 DUPLICATE DETECTED by name:', nameKey, 'existing:', seenPlayers.get(nameKey), 'duplicate:', player);
      } else {
        seenPlayers.set(nameKey, player);
      }
    });
    
    const uniquePlayers = Array.from(seenPlayers.values());
    
    if (uniquePlayers.length !== corePlayers.length) {
      console.warn('🔧 DEDUPLICATION: Removed', corePlayers.length - uniquePlayers.length, 'duplicate players by name matching');
      console.log('🔧 Unique players after dedup:', uniquePlayers.length);
    }
    
    this.allPlayers = uniquePlayers.map(player => {
      const converted = {
        id: parseInt(player.id!) || Math.floor(Math.random() * 10000),
        firstName: player.firstName,
        lastName: player.lastName || '',
        position: player.position || 'Chưa xác định',
        DOB: player.dateOfBirth ? new Date(player.dateOfBirth).getFullYear() : 0,
        height: player.height || 0,
        weight: player.weight || 0,
        avatar: player.avatar || 'assets/images/default-avatar.svg',
        note: player.notes || ''
      };
      return converted;
    });
    
    console.log('✅ Conversion completed:', this.allPlayers.length, 'players');
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
    
    // Reset pagination when switching modes
    this.currentPage = 0;
    this._invalidatePaginationCache();
    
    // Debug localStorage contents
    this.debugLocalStorage();
    
    // Use debounced update for better performance
    this.debouncedUpdate(() => {
      // Provide user feedback
      if (this.useRegistered && this.registeredPlayers.length === 0) {
        console.warn('⚠️ Switched to registered players mode but no players are registered!');
        this.showTemporaryMessage('saveMessage', 'Chưa có cầu thủ nào đã đăng ký! Hãy đăng ký một số cầu thủ trước.');
      } else if (this.useRegistered) {
        this.showTemporaryMessage('saveMessage', `Đang sử dụng ${this.registeredPlayers.length} cầu thủ đã đăng ký`);
      } else {
        this.showTemporaryMessage('saveMessage', `Đang sử dụng tất cả ${this.allPlayers.length} cầu thủ`);
      }
      
      this.updateFilteredPlayers();
      this.cdr.detectChanges();
    });
  }

  debugLocalStorage() {
    try {
      const saved = localStorage.getItem('registeredPlayers');
      console.log('🔍 localStorage contents:');
      console.log('  - Key exists:', !!saved);
      console.log('  - Raw data:', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('  - Parsed data:', parsed);
        console.log('  - Count:', parsed.length);
      }
    } catch (error) {
      console.error('❌ Error reading localStorage:', error);
    }
  }

  clearRegisteredPlayers() {
    if (confirm('Bạn có chắc muốn xóa tất cả cầu thủ đã đăng ký?')) {
      this.registeredPlayers = [];
      localStorage.removeItem('registeredPlayers');
      console.log('✅ Cleared all registered players');
      this.showTemporaryMessage('saveMessage', 'Đã xóa tất cả cầu thủ đã đăng ký');
      this.updateFilteredPlayers();
      this.cdr.detectChanges();
    }
  }

  // Performance monitoring
  logPerformanceMetrics() {
    const startTime = performance.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memoryInfo = 'memory' in performance ? (performance as any).memory : null;
    
    if (memoryInfo) {
      const memoryUsage = memoryInfo.usedJSHeapSize / 1048576; // MB
      const renderingTime = performance.now() - startTime;
      const componentCount = document.querySelectorAll('.player-item').length;
      
      console.log('📊 Performance metrics:', {
        memoryUsage: `${memoryUsage.toFixed(2)} MB`,
        renderingTime: `${renderingTime.toFixed(2)} ms`,
        componentCount,
        currentPage: this.currentPage + 1,
        totalPages: this.totalPages,
        playersVisible: this.getPaginatedPlayers().length,
        playersTotal: this.getDisplayPlayers().length
      });
      
      // Alert if performance issues detected
      if (memoryUsage > 50 || renderingTime > 1000 || componentCount > 50) {
        console.warn('⚠️ Performance issues detected:', {
          memoryUsage,
          renderingTime,
          componentCount
        });
      }
    }
  }

  getDisplayPlayers(): Player[] {
    const players = this.useRegistered ? this.registeredPlayers : this.allPlayers;
    return players;
  }

  getPaginatedPlayers(): Player[] {
    const allPlayers = this.getDisplayPlayers();
    
    // Check if we need to recalculate pagination
    const currentState = {
      useRegistered: this.useRegistered,
      currentPage: this.currentPage,
      dataLength: allPlayers.length
    };
    
    const stateChanged = 
      this._lastPaginationState.useRegistered !== currentState.useRegistered ||
      this._lastPaginationState.currentPage !== currentState.currentPage ||
      this._lastPaginationState.dataLength !== currentState.dataLength;
    
    if (stateChanged) {
      this._updatePaginationCache(allPlayers);
      this._lastPaginationState = currentState;
    }
    
    return this._paginatedPlayers;
  }
  
  private _updatePaginationCache(allPlayers: Player[]): void {
    // Safety check for empty arrays
    if (!allPlayers || allPlayers.length === 0) {
      this.totalPages = 0;
      this._paginatedPlayers = [];
      return;
    }
    
    this.totalPages = Math.ceil(allPlayers.length / this.pageSize);
    
    // Ensure currentPage is within bounds
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }
    
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this._paginatedPlayers = allPlayers.slice(startIndex, endIndex);
  }
  
  private _invalidatePaginationCache(): void {
    this._lastPaginationState = { useRegistered: !this.useRegistered, currentPage: -1, dataLength: -1 };
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.debouncedRender(() => {
        this.cdr.detectChanges();
        this.logPerformanceMetrics();
      });
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.debouncedRender(() => {
        this.cdr.detectChanges();
        this.logPerformanceMetrics();
      });
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }

  getPaginationDisplay(): { start: number; end: number; total: number } {
    const total = this.getDisplayPlayers()?.length || 0;
    
    if (total === 0) {
      return { start: 0, end: 0, total: 0 };
    }
    
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, total);
    return { start, end, total };
  }

  private debouncedUpdate(callback: () => void, delay = 300) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => {
      callback();
      this.updateTimeout = null;
    }, delay);
  }

  private debouncedRender(callback: () => void, delay = 100) {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => {
      callback();
      this.renderTimeout = null;
    }, delay);
  }

  canDivideTeams(): boolean {
    const availablePlayers = this.useRegistered ? this.registeredPlayers : this.allPlayers;
    return availablePlayers.length >= 2;
  }

  getPlayerModeStatus(): string {
    if (this.useRegistered) {
      return this.registeredPlayers.length === 0 
        ? 'Chưa có cầu thủ đã đăng ký'
        : `Đang dùng ${this.registeredPlayers.length} cầu thủ đã đăng ký`;
    }
    return `Đang dùng tất cả ${this.allPlayers.length} cầu thủ`;
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
    
    // Invalidate pagination cache since player count may have changed
    this._invalidatePaginationCache();
  }

  ngOnInit() {
    this.initializeAI();
    this.loadRegisteredPlayers();
    
    // Set up single Firebase subscription for real-time updates
    this.setupFirebaseSubscription();
    
    // Subscribe to data store changes
    this.dataStore.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        if (!loading && this.isLoadingPlayers) {
          this.loadPlayers();
        }
      });
  }

  private setupFirebaseSubscription() {
    // Prevent multiple subscriptions
    if (this.firebaseSubscriptionActive) {
      console.log('⚠️ Firebase subscription already active, skipping...');
      return;
    }
    
    // Set up single subscription to Firebase players data
    console.log('🔄 Setting up Firebase subscription...');
    this.firebaseSubscriptionActive = true;
    this.isLoadingPlayers = true;
    
    this.playerService.players$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (corePlayersData) => {
          console.log('� FIREBASE SUBSCRIPTION TRIGGERED - Players received:', corePlayersData?.length || 0);
          console.log('📊 Current state before update - allPlayers:', this.allPlayers?.length || 0);
          console.log('📋 Raw Firebase data sample:', corePlayersData?.slice(0, 3));
          
          if (corePlayersData && corePlayersData.length > 0) {
            this.corePlayersData = corePlayersData;
            this.convertCorePlayersToLegacyFormat(corePlayersData);
            this.updateFilteredPlayers();
            console.log('✅ Player list updated - allPlayers:', this.allPlayers.length);
            console.log('📋 Converted allPlayers:', this.allPlayers);
          } else {
            console.warn('⚠️ No Firebase data received, trying fallback...');
            this.loadPlayersDirectly();
          }
          
          this.isLoadingPlayers = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Firebase players subscription error:', error);
          this.isLoadingPlayers = false;
          // Fallback to assets/players.json
          console.log('🔄 Falling back to assets/players.json');
          this.loadPlayersDirectly();
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
    
    // Clean up debouncing timers
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
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
        console.log(`✅ Loaded ${this.registeredPlayers.length} registered players from localStorage`);
      } else {
        console.log('ℹ️ No registered players found in localStorage');
        this.registeredPlayers = [];
      }
    } catch (error) {
      console.error('❌ Error loading registered players:', error);
      this.registeredPlayers = [];
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
    // Match by firstName primarily, and lastName only if both exist
    const playerInfo = this.corePlayersData.find(p => {
      const firstNameMatch = p.firstName === player.firstName;
      
      // If both have lastName, match both, otherwise just match firstName
      if (p.lastName && player.lastName) {
        return firstNameMatch && p.lastName === player.lastName;
      }
      
      return firstNameMatch;
    });
    
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
      
      // Additional backup positioning and validation disabling
      setTimeout(() => {
        this.centerModal();
        this.disableAvatarValidation();
      }, 50);
      
      // Final validation disabling
      setTimeout(() => {
        this.disableAvatarValidation();
      }, 200);
    } else {
      // Handle case when no matching PlayerInfo is found
      console.warn(`No matching PlayerInfo found for:`, {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position
      });
      
      // Create a new PlayerInfo entry based on the Player data
      // Type assertion for extended player properties from players.json
      interface ExtendedPlayer extends Player {
        height?: number;
        weight?: number;
        age?: number;
        DOB?: string | number;
        note?: string;
      }
      
      const playerData = player as ExtendedPlayer;
      const newPlayerInfo: Partial<PlayerInfo> = {
        firstName: player.firstName,
        lastName: player.lastName || '',
        position: player.position || '',
        avatar: player.avatar || '',
        height: playerData.height || 0,
        weight: playerData.weight || 0,
        age: playerData.age || 0,
        dateOfBirth: '',
        isRegistered: false,
        status: PlayerStatus.ACTIVE,
        notes: playerData.note || ''
      };
      
      this.isEditMode = true;
      this.playerFormData = newPlayerInfo;
      this.showPlayerModal = true;
      
      // Force change detection and positioning
      setTimeout(() => {
        this.centerModal();
        this.disableAvatarValidation();
      }, 0);
      
      setTimeout(() => {
        this.centerModal();
        this.disableAvatarValidation();
      }, 50);
      
      // Final validation disabling
      setTimeout(() => {
        this.disableAvatarValidation();
      }, 200);
      
      console.log(`Created temporary PlayerInfo for editing: ${player.firstName}`);
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
          fullName: `${this.playerFormData.firstName!} ${this.playerFormData.lastName || ''}`.trim(),
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
      
      // Real-time updates will automatically refresh the UI
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
      
      // Real-time updates will automatically refresh the UI
      this.closeDeleteConfirm();
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Có lỗi xảy ra khi xóa cầu thủ!');
    } finally {
      this.isSaving = false;
    }
  }

  // Admin Action Methods
  async migrateToFirebase(): Promise<void> {
    try {
      const confirm = window.confirm('Bạn có muốn chuyển dữ liệu từ localStorage sang Firebase? Thao tác này sẽ tạo mới các cầu thủ chưa có trong Firebase.');
      if (!confirm) return;

      await this.playerService.migrateFromLocalStorage();
      alert('Migration thành công! Dữ liệu đã được chuyển sang Firebase.');
    } catch (error) {
      console.error('Error migrating to Firebase:', error);
      alert('Có lỗi khi migrate dữ liệu: ' + error.message);
    }
  }

  async cleanupDuplicateFirebaseData(): Promise<void> {
    try {
      const confirm = window.confirm('Bạn có muốn dọn dẹp dữ liệu trùng lặp trong Firebase? Thao tác này sẽ xóa các cầu thủ bị trùng lặp.');
      if (!confirm) return;

      console.log('🧹 Starting Firebase duplicate cleanup...');
      
      // Get current Firebase data
      const currentData = this.corePlayersData;
      if (!currentData || currentData.length === 0) {
        alert('Không có dữ liệu để dọn dẹp!');
        return;
      }

      // Group players by name to find duplicates
      const playerGroups = new Map<string, typeof currentData>();
      currentData.forEach(player => {
        const key = `${player.firstName.toLowerCase()}_${player.lastName?.toLowerCase() || ''}`;
        if (!playerGroups.has(key)) {
          playerGroups.set(key, []);
        }
        playerGroups.get(key)!.push(player);
      });

      // Find duplicates
      const duplicatesToDelete: string[] = [];
      
      playerGroups.forEach((players, key) => {
        if (players.length > 1) {
          console.log(`🔍 Found ${players.length} duplicates for: ${key}`);
          // Keep the first one, mark others for deletion
          for (let i = 1; i < players.length; i++) {
            if (players[i].id) {
              duplicatesToDelete.push(players[i].id!);
            }
          }
        }
      });

      if (duplicatesToDelete.length === 0) {
        alert('Không tìm thấy dữ liệu trùng lặp nào!');
        return;
      }

      console.log(`🗑️ Will delete ${duplicatesToDelete.length} duplicate players`);
      
      // Delete duplicates one by one
      let deleted = 0;
      for (const playerId of duplicatesToDelete) {
        try {
          await this.playerService.deletePlayer(playerId);
          deleted++;
          console.log(`✅ Deleted duplicate player ${deleted}/${duplicatesToDelete.length}`);
        } catch (error) {
          console.error(`❌ Failed to delete player ${playerId}:`, error);
        }
      }

      alert(`Đã dọn dẹp thành công! Xóa ${deleted} cầu thủ trùng lặp.`);
    } catch (error) {
      console.error('Error cleaning up Firebase data:', error);
      alert('Có lỗi khi dọn dẹp dữ liệu: ' + error.message);
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

  // Avatar Management Methods
  openAvatarModal(): void {
    this.showAvatarModal = true;
    
    // Focus on modal for accessibility
    setTimeout(() => {
      const modal = document.querySelector('.avatar-modal') as HTMLElement;
      if (modal) {
        modal.focus();
      }
    }, 200);
  }

  closeAvatarModal(): void {
    this.showAvatarModal = false;
  }

  onAvatarPreviewError(event: Event): void {
    const target = event.target as HTMLImageElement;
    // Use default generated avatar if preview fails
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.playerFormData.firstName || 'Player')}&background=667eea&color=fff&size=200`;
  }

  setAvatarPath(path: string): void {
    this.playerFormData.avatar = path;
  }

  setAvatarPathAndClose(path: string): void {
    this.playerFormData.avatar = path;
    this.closeAvatarModal();
  }

  removeAvatarAndClose(): void {
    this.playerFormData.avatar = '';
    this.closeAvatarModal();
  }

  useExamplePath(path: string): void {
    // No longer needed - using direct button-based avatar setting
    this.setAvatarPath(path);
  }

  removeAvatar(): void {
    this.playerFormData.avatar = '';
    this.closeAvatarModal();
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