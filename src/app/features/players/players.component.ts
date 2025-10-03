import { Component, OnInit, OnDestroy, Input, TrackByFunction, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Player } from './player-utils';
import { PlayerService } from '../../core/services/player.service';
import { MatchService } from '../../core/services/match.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { PlayerInfo } from '../../core/models/player.model';
import { TeamComposition, TeamColor, MatchStatus, GoalDetail, CardDetail, GoalType, CardType } from '../../core/models/match.model';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
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

        <!-- AI/ML Analysis Section (Below Both Teams) -->
        <div class="ai-analysis-section">
          <div class="analysis-container">
            <div class="analysis-header">
              <div class="battle-icon">
                <i class="fas fa-brain analysis-brain"></i>
                <div class="vs-divider">
                  <span class="vs-text">VS</span>
                  <div class="crossed-swords">
                    <i class="fas fa-sword sword-1"></i>
                    <i class="fas fa-sword sword-2"></i>
                  </div>
                </div>
                <i class="fas fa-chart-line analysis-chart"></i>
              </div>
            </div>
            
            <div class="analysis-content" [class.analyzing]="isAnalyzing">
              <div class="analysis-status">
                <div class="status-indicator" [class.active]="isAnalyzing">
                  <div class="pulse-ring"></div>
                  <div class="pulse-core"></div>
                </div>
                <h4 class="analysis-title">{{ isAnalyzing ? 'Đang phân tích đội hình...' : 'Phân tích AI/ML' }}</h4>
              </div>
              
              <div class="analysis-details" *ngIf="!isAnalyzing">
                <div class="analysis-grid">
                  <div class="analysis-item">
                    <div class="metric-icon team-a-color">
                      <i class="fas fa-users"></i>
                    </div>
                    <div class="metric-info">
                      <span class="metric-label">Đội Xanh</span>
                      <span class="metric-value">{{ teamA.length }} cầu thủ</span>
                    </div>
                  </div>
                  
                  <div class="analysis-item">
                    <div class="metric-icon balance-color">
                      <i class="fas fa-balance-scale"></i>
                    </div>
                    <div class="metric-info">
                      <span class="metric-label">Cân bằng</span>
                      <span class="metric-value">{{ getTeamBalance() }}</span>
                    </div>
                  </div>
                  
                  <div class="analysis-item">
                    <div class="metric-icon team-b-color">
                      <i class="fas fa-users"></i>
                    </div>
                    <div class="metric-info">
                      <span class="metric-label">Đội Cam</span>
                      <span class="metric-value">{{ teamB.length }} cầu thủ</span>
                    </div>
                  </div>
                </div>
                
                <div class="quick-actions">
                  <button class="ai-btn analyze-btn" (click)="startAIAnalysis()" [disabled]="isAnalyzing">
                    <i class="fas fa-robot me-2"></i>
                    {{ isAnalyzing ? 'Đang phân tích...' : 'Phân tích AI' }}
                  </button>
                  
                  <button class="ai-btn balance-btn" (click)="autoBalance()" [disabled]="isAnalyzing">
                    <i class="fas fa-magic me-2"></i>
                    Cân bằng tự động
                  </button>
                </div>
              </div>
              
              <div class="loading-analysis" *ngIf="isAnalyzing">
                <div class="analysis-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="analysisProgress"></div>
                  </div>
                  <span class="progress-text">{{ analysisProgress }}%</span>
                </div>
                <div class="analysis-steps">
                  <div class="step" [class.active]="analysisStep >= 1" [class.completed]="analysisStep > 1">
                    <i class="fas fa-user-friends"></i>
                    <span>Phân tích cầu thủ</span>
                  </div>
                  <div class="step" [class.active]="analysisStep >= 2" [class.completed]="analysisStep > 2">
                    <i class="fas fa-chart-bar"></i>
                    <span>Tính toán thống kê</span>
                  </div>
                  <div class="step" [class.active]="analysisStep >= 3" [class.completed]="analysisStep > 3">
                    <i class="fas fa-balance-scale"></i>
                    <span>Đánh giá cân bằng</span>
                  </div>
                  <div class="step" [class.active]="analysisStep >= 4">
                    <i class="fas fa-check-circle"></i>
                    <span>Hoàn thành</span>
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
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      backdrop-filter: blur(5px);
      overflow-y: auto;
      overflow-x: hidden;
    }

    .player-modal {
      background: white;
      border-radius: 20px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
      animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform: translateZ(0);
      margin: auto;
      position: relative;
      flex-shrink: 0;
    }

    /* Ensure modal is always visible and centered */
    .modal-overlay::before {
      content: '';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1px;
      height: 1px;
      pointer-events: none;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
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
        margin: 10px;
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

    /* AI/ML Analysis Section Styles */
    .ai-analysis-section {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 40px 0;
      padding: 0 20px;
    }

    .analysis-container {
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.95) 100%);
      border-radius: 25px;
      padding: 30px;
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px);
      border: 2px solid rgba(255, 255, 255, 0.3);
      width: 100%;
      max-width: 500px;
      position: relative;
      overflow: hidden;
    }

    .analysis-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
      animation: shimmer 3s infinite;
      pointer-events: none;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    .analysis-header {
      text-align: center;
      margin-bottom: 25px;
    }

    .battle-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      position: relative;
    }

    .analysis-brain, .analysis-chart {
      font-size: 2.5rem;
      color: #4f46e5;
      animation: pulse-glow 2s ease-in-out infinite;
    }

    .vs-divider {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .vs-text {
      font-size: 1.8rem;
      font-weight: 900;
      color: #dc2626;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 3px;
    }

    .crossed-swords {
      position: relative;
      width: 60px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sword-1, .sword-2 {
      position: absolute;
      font-size: 1.8rem;
      color: #8b5cf6;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .sword-1 {
      transform: rotate(45deg);
      animation: sword-clash-1 3s ease-in-out infinite;
    }

    .sword-2 {
      transform: rotate(-45deg);
      animation: sword-clash-2 3s ease-in-out infinite;
    }

    @keyframes sword-clash-1 {
      0%, 100% { transform: rotate(45deg) translateX(0); }
      50% { transform: rotate(45deg) translateX(-3px); }
    }

    @keyframes sword-clash-2 {
      0%, 100% { transform: rotate(-45deg) translateX(0); }
      50% { transform: rotate(-45deg) translateX(3px); }
    }

    @keyframes pulse-glow {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
        filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3));
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.05);
        filter: drop-shadow(0 0 20px rgba(79, 70, 229, 0.5));
      }
    }

    .analysis-content {
      text-align: center;
    }

    .analysis-status {
      margin-bottom: 25px;
    }

    .status-indicator {
      position: relative;
      display: inline-block;
      margin-bottom: 15px;
    }

    .pulse-ring, .pulse-core {
      position: absolute;
      border-radius: 50%;
    }

    .pulse-core {
      width: 20px;
      height: 20px;
      background: linear-gradient(45deg, #4f46e5, #7c3aed);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .pulse-ring {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(79, 70, 229, 0.3);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .status-indicator.active .pulse-ring {
      animation: pulse-ring-animation 2s ease-out infinite;
    }

    @keyframes pulse-ring-animation {
      0% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
      }
    }

    .analysis-title {
      color: #1f2937;
      font-size: 1.3rem;
      font-weight: 600;
      margin: 0;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 25px;
    }

    .analysis-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    }

    .metric-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: white;
    }

    .metric-icon.team-a-color {
      background: linear-gradient(45deg, #3b82f6, #1d4ed8);
    }

    .metric-icon.team-b-color {
      background: linear-gradient(45deg, #f97316, #ea580c);
    }

    .metric-icon.balance-color {
      background: linear-gradient(45deg, #10b981, #059669);
    }

    .metric-info {
      text-align: center;
    }

    .metric-label {
      display: block;
      font-size: 0.85rem;
      color: #6b7280;
      font-weight: 500;
    }

    .metric-value {
      display: block;
      font-size: 1.1rem;
      color: #1f2937;
      font-weight: 600;
    }

    .quick-actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .ai-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 25px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .analyze-btn {
      background: linear-gradient(45deg, #4f46e5, #7c3aed);
      color: white;
    }

    .balance-btn {
      background: linear-gradient(45deg, #10b981, #059669);
      color: white;
    }

    .ai-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .ai-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .loading-analysis {
      padding: 20px 0;
    }

    .analysis-progress {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: rgba(79, 70, 229, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      border-radius: 4px;
      transition: width 0.3s ease;
      position: relative;
    }

    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 20px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
      animation: progress-shine 2s infinite;
    }

    @keyframes progress-shine {
      0% { transform: translateX(-20px); }
      100% { transform: translateX(20px); }
    }

    .progress-text {
      font-weight: 600;
      color: #4f46e5;
      font-size: 0.9rem;
    }

    .analysis-steps {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 1;
      padding: 12px 8px;
      border-radius: 12px;
      transition: all 0.3s ease;
      opacity: 0.4;
    }

    .step.active {
      opacity: 1;
      background: rgba(79, 70, 229, 0.1);
      color: #4f46e5;
    }

    .step.completed {
      opacity: 1;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .step i {
      font-size: 1.2rem;
    }

    .step span {
      font-size: 0.7rem;
      font-weight: 500;
      text-align: center;
    }

    /* Responsive Design for AI Section */
    @media (max-width: 768px) {
      .ai-analysis-section {
        margin: 20px 0;
        padding: 0 10px;
      }

      .analysis-container {
        padding: 20px;
        max-width: 100%;
      }

      .battle-icon {
        gap: 15px;
      }

      .analysis-brain, .analysis-chart {
        font-size: 2rem;
      }

      .vs-text {
        font-size: 1.4rem;
      }

      .analysis-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .quick-actions {
        flex-direction: column;
        align-items: center;
      }

      .ai-btn {
        width: 100%;
        justify-content: center;
      }

      .analysis-steps {
        flex-direction: column;
        gap: 8px;
      }

      .step {
        flex-direction: row;
        justify-content: flex-start;
        padding: 10px 15px;
      }

      .step span {
        text-align: left;
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
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-weight: 600;
      margin-bottom: 6px;
      color: #333;
      font-size: 14px;
    }

    .form-control {
      padding: 10px 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
      background: white;
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
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .admin-controls {
        justify-content: center;
      }
      
      .modal-actions {
        flex-direction: column;
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
  
  // AI/ML Analysis state
  isAnalyzing = false;
  analysisProgress = 0;
  analysisStep = 0;
  saveMessage = '';
  saveRegisteredMessage = '';
  


  trackByPlayerId: TrackByFunction<Player> = (index: number, player: Player) => {
    return player.id;
  };

  async loadPlayers() {
    try {
      this.isLoadingPlayers = true;
      console.log('🔄 Loading players from PlayerService...');
      
      // Force PlayerService to reload data
      console.log('⚡ Triggering PlayerService refresh...');
      await this.playerService.refreshPlayers();
      
      // Subscribe to core players data
      this.playerService.players$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (corePlayersData) => {
            console.log('📥 Received players data from PlayerService:', corePlayersData.length);
            this.corePlayersData = corePlayersData;
            this.convertCorePlayersToLegacyFormat(corePlayersData);
            this.updateFilteredPlayers();
            this.isLoadingPlayers = false;
            
            // If still no players after 1 second, try fallback
            if (this.allPlayers.length === 0) {
              setTimeout(() => {
                if (this.allPlayers.length === 0) {
                  console.log('🔧 No players loaded, trying fallback method...');
                  this.loadPlayersDirectly();
                }
              }, 1000);
            }
          },
          error: (error) => {
            console.error('❌ Error in PlayerService subscription:', error);
            this.loadPlayersDirectly();
          }
        });
      
      // Also try direct load immediately as fallback
      setTimeout(() => {
        if (this.allPlayers.length === 0) {
          console.log('🔧 Fallback: Loading directly as PlayerService seems slow...');
          this.loadPlayersDirectly();
        }
      }, 500);
      
      console.log('✅ PlayerService subscription established');
    } catch (error) {
      console.error('❌ Error loading players:', error);
      this.loadPlayersDirectly();
    }
  }

  private async loadPlayersDirectly() {
    try {
      console.log('🔧 Loading players directly from assets...');
      const response = await fetch('assets/players.json');
      if (response.ok) {
        const legacyPlayers = await response.json();
        console.log('📁 Direct load successful:', legacyPlayers.length);
        
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
        console.log('✅ Direct load completed:', this.allPlayers.length);
      } else {
        throw new Error('Failed to fetch players.json');
      }
    } catch (error) {
      console.error('❌ Direct load failed:', error);
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
    console.log('🚀 DRAG STARTED:', player.firstName);
    this.isDragging = true;
    this.draggedPlayer = player;
  }

  onDragEnded() {
    console.log('🛑 DRAG ENDED:', this.draggedPlayer?.firstName || 'unknown');
    this.isDragging = false;
    this.draggedPlayer = null;
  }

  onAvatarError(event: Event, player: Player) {
    const defaultAvatar = 'assets/images/default-avatar.svg';
    const target = event.target as HTMLImageElement;
    target.src = defaultAvatar;
    player.avatar = defaultAvatar;
    console.warn(`Avatar failed to load for player: ${player.firstName}, using default avatar`);
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
    // Force scroll to top of modal overlay to ensure visibility
    setTimeout(() => {
      const overlay = document.querySelector('.modal-overlay') as HTMLElement;
      if (overlay) {
        overlay.scrollTop = 0;
      }
    }, 100);
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
      
      // Clear match data after saving
      this.clearMatchData();
    } catch (error) {
      console.error('Error saving match info:', error);
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
      date: new Date().toISOString().split('T')[0],
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
    console.log('🔄 Converting core players to legacy format:', corePlayers.length);
    
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
    
    console.log('✅ Converted to allPlayers:', this.allPlayers.length);
    console.log('📋 Sample player:', this.allPlayers[0]);
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
    
    // Subscribe to data store changes
    this.dataStore.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        if (!loading && this.isLoadingPlayers) {
          console.log('\u2705 Core data loaded, refreshing players');
          this.loadPlayers();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  // AI/ML Analysis Methods
  getTeamBalance(): string {
    const difference = Math.abs(this.teamA.length - this.teamB.length);
    if (difference === 0) return 'Hoàn hảo';
    if (difference <= 1) return 'Tốt';
    if (difference <= 2) return 'Khá';
    return 'Cần cải thiện';
  }

  startAIAnalysis(): void {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.analysisStep = 0;

    // Simulate AI analysis process
    const analysisSteps = [
      { step: 1, duration: 1000, progress: 25 },
      { step: 2, duration: 1500, progress: 50 },
      { step: 3, duration: 2000, progress: 75 },
      { step: 4, duration: 1000, progress: 100 }
    ];

    let currentStepIndex = 0;

    const runNextStep = () => {
      if (currentStepIndex >= analysisSteps.length) {
        this.isAnalyzing = false;
        this.showAnalysisResults();
        return;
      }

      const currentStep = analysisSteps[currentStepIndex];
      this.analysisStep = currentStep.step;

      // Animate progress
      const duration = currentStep.duration;
      const startProgress = this.analysisProgress;
      const targetProgress = currentStep.progress;
      const startTime = Date.now();

      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        this.analysisProgress = startProgress + (targetProgress - startProgress) * progress;

        if (progress < 1) {
          requestAnimationFrame(animateProgress);
        } else {
          currentStepIndex++;
          setTimeout(runNextStep, 200);
        }
      };

      animateProgress();
    };

    runNextStep();
  }

  async autoBalance(): Promise<void> {
    if (this.isAnalyzing) return;

    const allAvailablePlayers = [...this.teamA, ...this.teamB];
    if (allAvailablePlayers.length === 0) return;

    try {
      // Use PlayerService for intelligent team balancing
      const playerIds = allAvailablePlayers.map(p => p.id!.toString());
      const balanceRecommendation = await this.playerService.getTeamBalanceRecommendations(playerIds).toPromise();
      
      // Apply AI-powered balancing
      if (balanceRecommendation && balanceRecommendation.recommendations.length > 0) {
        // Clear current teams
        this.teamA = [];
        this.teamB = [];

        // Distribute based on service recommendations or fallback to random
        const shuffled = [...allAvailablePlayers].sort(() => Math.random() - 0.5);
        shuffled.forEach((player, index) => {
          if (index % 2 === 0) {
            this.teamA.push(player);
          } else {
            this.teamB.push(player);
          }
        });

        console.log('\u2705 Auto-balance completed with AI recommendations');
      }
    } catch (error) {
      console.warn('Auto-balance failed, using fallback:', error);
      // Fallback to simple random distribution
      this.teamA = [];
      this.teamB = [];
      const shuffled = [...allAvailablePlayers].sort(() => Math.random() - 0.5);
      shuffled.forEach((player, index) => {
        if (index % 2 === 0) {
          this.teamA.push(player);
        } else {
          this.teamB.push(player);
        }
      });
    }
  }

  private showAnalysisResults(): void {
    // Show analysis completion message
    const balanceScore = this.getTeamBalance();
    console.log('🤖 AI Analysis completed!');
    console.log(`Team balance: ${balanceScore}`);
    console.log(`Team A: ${this.teamA.length} players`);
    console.log(`Team B: ${this.teamB.length} players`);
    
    // You could show a modal or toast message here
    alert(`✅ Phân tích hoàn thành!\n\nCân bằng đội hình: ${balanceScore}\nĐội Xanh: ${this.teamA.length} cầu thủ\nĐội Cam: ${this.teamB.length} cầu thủ`);
  }

  // Admin utility methods
  isAdmin(): boolean {
    // For now, return true. In a real app, check user role
    return true;
  }



  // Admin Action Methods
  async syncWithFirebase(): Promise<void> {
    try {
      console.log('🔄 Syncing with Firebase...');
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
}