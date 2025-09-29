import { Component, OnInit, Input, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Player } from './player-utils';

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
          </button>
          
          <div *ngIf="matchSaveMessage" class="status-message success">
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

        <!-- Enhanced AI/ML Analysis Section -->
        <div class="ai-analysis-section">
          <div class="analysis-container">
            <!-- Advanced Analysis Header -->
            <div class="analysis-header-enhanced">
              <div class="header-background">
                <div class="floating-particles">
                  <div class="particle particle-1"></div>
                  <div class="particle particle-2"></div>
                  <div class="particle particle-3"></div>
                  <div class="particle particle-4"></div>
                  <div class="particle particle-5"></div>
                </div>
              </div>
              
              <div class="header-content">
                <div class="ai-logo">
                  <div class="neural-network">
                    <div class="network-node node-1"></div>
                    <div class="network-node node-2"></div>
                    <div class="network-node node-3"></div>
                    <div class="network-connection connection-1"></div>
                    <div class="network-connection connection-2"></div>
                    <div class="network-connection connection-3"></div>
                  </div>
                  <i class="fas fa-robot ai-robot"></i>
                </div>
                
                <div class="title-section">
                  <h3 class="ai-title">
                    <span class="gradient-text">AI Phân Tích Dự Đoán</span>
                  </h3>
                  <p class="ai-subtitle">Công nghệ Machine Learning tiên tiến</p>
                </div>
                
                <div class="confidence-indicator">
                  <div class="confidence-circle">
                    <div class="confidence-fill" [style.stroke-dasharray]="'251.2, 251.2'" 
                         [style.stroke-dashoffset]="251.2 - (analysisConfidence * 251.2 / 100)">
                    </div>
                    <div class="confidence-text">
                      <span class="percentage">{{ analysisConfidence }}%</span>
                      <span class="label">Độ tin cậy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Enhanced Analysis Content -->
            <div class="analysis-content-enhanced" [class.analyzing]="isAnalyzing">
              
              <!-- Team Analysis Dashboard -->
              <div class="team-dashboard" *ngIf="!isAnalyzing">
                <div class="dashboard-row">
                  <!-- Team A Stats -->
                  <div class="team-stats-card team-a-stats">
                    <div class="team-header-card">
                      <div class="team-logo team-a-logo">
                        <i class="fas fa-shield-alt"></i>
                      </div>
                      <div class="team-info">
                        <h5 class="team-name">Đội Xanh</h5>
                        <span class="team-count">{{ teamA.length }} cầu thủ</span>
                      </div>
                    </div>
                    
                    <div class="stats-grid">
                      <div class="stat-item">
                        <i class="fas fa-fist-raised"></i>
                        <div class="stat-data">
                          <span class="stat-value">{{ getTeamSkillAverage('teamA', 'attack') }}</span>
                          <span class="stat-label">Tấn công</span>
                        </div>
                      </div>
                      <div class="stat-item">
                        <i class="fas fa-shield"></i>
                        <div class="stat-data">
                          <span class="stat-value">{{ getTeamSkillAverage('teamA', 'defense') }}</span>
                          <span class="stat-label">Phòng thủ</span>
                        </div>
                      </div>
                      <div class="stat-item">
                        <i class="fas fa-running"></i>
                        <div class="stat-data">
                          <span class="stat-value">{{ getTeamSkillAverage('teamA', 'stamina') }}</span>
                          <span class="stat-label">Thể lực</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- VS Section with Prediction -->
                  <div class="vs-prediction-section">
                    <div class="vs-container">
                      <div class="vs-ring">
                        <div class="battle-swords">
                          <i class="fas fa-swords sword-left"></i>
                          <i class="fas fa-swords sword-right"></i>
                        </div>
                        <div class="vs-text">VS</div>
                      </div>
                    </div>
                    
                    <div class="prediction-result">
                      <div class="prediction-header">
                        <i class="fas fa-crystal-ball"></i>
                        <span>Dự đoán AI</span>
                      </div>
                      <div class="win-probability">
                        <div class="prob-team-a">
                          <span class="prob-value">{{ teamAWinProbability }}%</span>
                          <div class="prob-bar">
                            <div class="prob-fill" [style.width.%]="teamAWinProbability"></div>
                          </div>
                        </div>
                        <div class="prob-draw">
                          <span class="draw-text">Hòa: {{ drawProbability }}%</span>
                        </div>
                        <div class="prob-team-b">
                          <div class="prob-bar">
                            <div class="prob-fill" [style.width.%]="teamBWinProbability"></div>
                          </div>
                          <span class="prob-value">{{ teamBWinProbability }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Team B Stats -->
                  <div class="team-stats-card team-b-stats">
                    <div class="team-header-card">
                      <div class="team-logo team-b-logo">
                        <i class="fas fa-shield-alt"></i>
                      </div>
                      <div class="team-info">
                        <h5 class="team-name">Đội Cam</h5>
                        <span class="team-count">{{ teamB.length }} cầu thủ</span>
                      </div>
                    </div>
                    
                    <div class="stats-grid">
                      <div class="stat-item">
                        <i class="fas fa-fist-raised"></i>
                        <div class="stat-data">
                          <span class="stat-value">{{ getTeamSkillAverage('teamB', 'attack') }}</span>
                          <span class="stat-label">Tấn công</span>
                        </div>
                      </div>
                      <div class="stat-item">
                        <i class="fas fa-shield"></i>
                        <div class="stat-data">
                          <span class="stat-value">{{ getTeamSkillAverage('teamB', 'defense') }}</span>
                          <span class="stat-label">Phòng thủ</span>
                        </div>
                      </div>
                      <div class="stat-item">
                        <i class="fas fa-running"></i>
                        <div class="stat-data">
                          <span class="stat-value">{{ getTeamSkillAverage('teamB', 'stamina') }}</span>
                          <span class="stat-label">Thể lực</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Advanced Controls -->
                <div class="advanced-controls">
                  <div class="control-group">
                    <div class="control-label">
                      <i class="fas fa-sliders-h"></i>
                      Mức độ phân tích
                    </div>
                    <div class="analysis-modes">
                      <button class="mode-btn" 
                              [class.active]="analysisMode === 'basic'"
                              (click)="setAnalysisMode('basic')">
                        <i class="fas fa-chart-bar"></i>
                        Cơ bản
                      </button>
                      <button class="mode-btn" 
                              [class.active]="analysisMode === 'advanced'"
                              (click)="setAnalysisMode('advanced')">
                        <i class="fas fa-brain"></i>
                        Nâng cao
                      </button>
                      <button class="mode-btn" 
                              [class.active]="analysisMode === 'professional'"
                              (click)="setAnalysisMode('professional')">
                        <i class="fas fa-microscope"></i>
                        Chuyên nghiệp
                      </button>
                    </div>
                  </div>
                  
                  <div class="action-buttons">
                    <button class="ai-btn-enhanced analyze-btn" 
                            (click)="startAIAnalysis()" 
                            [disabled]="isAnalyzing || (teamA.length === 0 && teamB.length === 0)">
                      <div class="btn-content">
                        <i class="fas fa-rocket"></i>
                        <span>{{ isAnalyzing ? 'Đang phân tích...' : 'Phân tích dự đoán' }}</span>
                      </div>
                      <div class="btn-shine"></div>
                    </button>
                    
                    <button class="ai-btn-enhanced balance-btn" 
                            (click)="autoBalance()" 
                            [disabled]="isAnalyzing">
                      <div class="btn-content">
                        <i class="fas fa-magic"></i>
                        <span>Tự động cân bằng</span>
                      </div>
                      <div class="btn-shine"></div>
                    </button>
                    
                    <button class="ai-btn-enhanced export-btn" 
                            (click)="exportAnalysis()" 
                            [disabled]="isAnalyzing">
                      <div class="btn-content">
                        <i class="fas fa-download"></i>
                        <span>Xuất báo cáo</span>
                      </div>
                      <div class="btn-shine"></div>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Enhanced Loading Analysis -->
              <div class="loading-analysis-enhanced" *ngIf="isAnalyzing">
                <div class="analysis-visualization">
                  <div class="neural-processing">
                    <div class="processing-core">
                      <div class="core-ring ring-1"></div>
                      <div class="core-ring ring-2"></div>
                      <div class="core-ring ring-3"></div>
                      <div class="processing-center">
                        <i class="fas fa-brain processing-brain"></i>
                      </div>
                    </div>
                    
                    <div class="data-streams">
                      <div class="stream stream-1"></div>
                      <div class="stream stream-2"></div>
                      <div class="stream stream-3"></div>
                      <div class="stream stream-4"></div>
                    </div>
                  </div>
                  
                  <div class="progress-section">
                    <h4 class="processing-title">{{ getCurrentProcessingTitle() }}</h4>
                    <div class="enhanced-progress-bar">
                      <div class="progress-track"></div>
                      <div class="progress-fill-enhanced" 
                           [style.width.%]="analysisProgress"
                           [style.background]="getProgressGradient()"></div>
                      <div class="progress-glow" [style.left.%]="analysisProgress"></div>
                    </div>
                    <div class="progress-info">
                      <span class="progress-percentage">{{ analysisProgress }}%</span>
                      <span class="eta">{{ getEstimatedTime() }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="analysis-steps-enhanced">
                  <div class="step-enhanced" 
                       [class.active]="analysisStep >= 1" 
                       [class.completed]="analysisStep > 1"
                       [class.processing]="analysisStep === 1">
                    <div class="step-icon">
                      <i class="fas fa-users-cog"></i>
                      <div class="step-pulse" *ngIf="analysisStep === 1"></div>
                    </div>
                    <div class="step-content">
                      <span class="step-title">Phân tích đội hình</span>
                      <span class="step-description">Đánh giá kỹ năng cầu thủ</span>
                    </div>
                  </div>
                  
                  <div class="step-enhanced" 
                       [class.active]="analysisStep >= 2" 
                       [class.completed]="analysisStep > 2"
                       [class.processing]="analysisStep === 2">
                    <div class="step-icon">
                      <i class="fas fa-chart-line"></i>
                      <div class="step-pulse" *ngIf="analysisStep === 2"></div>
                    </div>
                    <div class="step-content">
                      <span class="step-title">Machine Learning</span>
                      <span class="step-description">Tính toán xác suất</span>
                    </div>
                  </div>
                  
                  <div class="step-enhanced" 
                       [class.active]="analysisStep >= 3" 
                       [class.completed]="analysisStep > 3"
                       [class.processing]="analysisStep === 3">
                    <div class="step-icon">
                      <i class="fas fa-balance-scale-right"></i>
                      <div class="step-pulse" *ngIf="analysisStep === 3"></div>
                    </div>
                    <div class="step-content">
                      <span class="step-title">Tối ưu hóa</span>
                      <span class="step-description">Cân bằng đội hình</span>
                    </div>
                  </div>
                  
                  <div class="step-enhanced" 
                       [class.active]="analysisStep >= 4"
                       [class.completed]="analysisStep >= 4">
                    <div class="step-icon">
                      <i class="fas fa-trophy"></i>
                      <div class="step-pulse" *ngIf="analysisStep === 4"></div>
                    </div>
                    <div class="step-content">
                      <span class="step-title">Kết quả dự đoán</span>
                      <span class="step-description">Hoàn thành phân tích</span>
                    </div>
                  </div>
                </div>
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
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
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
      .teams-container {
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

    /* Enhanced AI/ML Analysis Section Styles */
    .ai-analysis-section {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 40px 0;
      padding: 0 20px;
    }

    .analysis-container {
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
      border-radius: 30px;
      padding: 35px;
      box-shadow: 
        0 25px 80px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(25px);
      border: 3px solid rgba(255, 255, 255, 0.4);
      width: 100%;
      max-width: none;
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

    /* Enhanced Header */
    .analysis-header-enhanced {
      position: relative;
      margin-bottom: 35px;
      overflow: hidden;
      border-radius: 20px;
    }

    .header-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      opacity: 0.05;
    }

    .floating-particles {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: linear-gradient(45deg, #667eea, #764ba2);
      border-radius: 50%;
      animation: float-particle 6s infinite ease-in-out;
    }

    .particle-1 { top: 20%; left: 10%; animation-delay: 0s; }
    .particle-2 { top: 80%; left: 20%; animation-delay: 1s; }
    .particle-3 { top: 30%; right: 15%; animation-delay: 2s; }
    .particle-4 { bottom: 20%; left: 70%; animation-delay: 3s; }
    .particle-5 { top: 60%; right: 25%; animation-delay: 4s; }

    @keyframes float-particle {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
      33% { transform: translateY(-10px) rotate(120deg); opacity: 0.8; }
      66% { transform: translateY(10px) rotate(240deg); opacity: 0.5; }
    }

    .header-content {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 30px;
      padding: 25px;
      position: relative;
      z-index: 1;
    }

    .ai-logo {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .neural-network {
      position: absolute;
      width: 80px;
      height: 80px;
      animation: rotate-network 10s linear infinite;
    }

    .network-node {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
      animation: pulse-node 2s ease-in-out infinite;
    }

    .node-1 { top: 10px; left: 10px; animation-delay: 0s; }
    .node-2 { top: 10px; right: 10px; animation-delay: 0.5s; }
    .node-3 { bottom: 10px; left: 50%; transform: translateX(-50%); animation-delay: 1s; }

    .network-connection {
      position: absolute;
      height: 2px;
      background: linear-gradient(90deg, #667eea, transparent, #764ba2);
      animation: data-flow 3s ease-in-out infinite;
    }

    .connection-1 { top: 14px; left: 18px; width: 44px; transform: rotate(0deg); }
    .connection-2 { top: 30px; left: 14px; width: 35px; transform: rotate(-45deg); }
    .connection-3 { top: 30px; right: 14px; width: 35px; transform: rotate(45deg); }

    @keyframes rotate-network {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes pulse-node {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.5); opacity: 1; }
    }

    @keyframes data-flow {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }

    .ai-robot {
      font-size: 3rem;
      color: #667eea;
      z-index: 2;
      position: relative;
      animation: robot-pulse 3s ease-in-out infinite;
      filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3));
    }

    @keyframes robot-pulse {
      0%, 100% { transform: scale(1) rotateY(0deg); }
      25% { transform: scale(1.1) rotateY(5deg); }
      75% { transform: scale(1.1) rotateY(-5deg); }
    }

    .title-section {
      text-align: center;
    }

    .ai-title {
      margin: 0 0 8px 0;
      font-size: 2.2rem;
      font-weight: 800;
    }

    .gradient-text {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-shift 3s ease-in-out infinite;
    }

    @keyframes gradient-shift {
      0%, 100% { filter: hue-rotate(0deg); }
      50% { filter: hue-rotate(20deg); }
    }

    .ai-subtitle {
      color: #64748b;
      font-size: 1rem;
      margin: 0;
      font-weight: 500;
      font-style: italic;
    }

    .confidence-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confidence-circle {
      position: relative;
      width: 80px;
      height: 80px;
    }

    .confidence-circle::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #667eea 0%, #764ba2 100%);
      animation: rotate 2s linear infinite;
      z-index: -1;
    }

    .confidence-fill {
      stroke: #667eea;
      stroke-width: 6;
      stroke-linecap: round;
      fill: none;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
      animation: draw-circle 2s ease-out;
    }

    @keyframes draw-circle {
      0% { stroke-dashoffset: 251.2; }
      100% { stroke-dashoffset: calc(251.2 - (251.2 * var(--progress, 95) / 100)); }
    }

    .confidence-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .percentage {
      display: block;
      font-size: 1.2rem;
      font-weight: 800;
      color: #667eea;
    }

    .label {
      display: block;
      font-size: 0.7rem;
      color: #64748b;
      font-weight: 500;
    }

    /* Enhanced Content */
    .analysis-content-enhanced {
      width: 100%;
    }

    .team-dashboard {
      margin-bottom: 30px;
    }

    .dashboard-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 30px;
      align-items: center;
    }

    .team-stats-card {
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
      border-radius: 20px;
      padding: 25px;
      border: 2px solid rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .team-stats-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .team-a-stats::before {
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    }

    .team-b-stats::before {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    .team-stats-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
    }

    .team-header-card {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }

    .team-logo {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      position: relative;
    }

    .team-a-logo {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }

    .team-b-logo {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
    }

    .team-info h5 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #1f2937;
    }

    .team-count {
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 12px;
      transition: all 0.2s ease;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .stat-item:hover {
      transform: scale(1.02);
      background: rgba(255, 255, 255, 0.9);
    }

    .stat-item i {
      font-size: 1.2rem;
      color: #667eea;
    }

    .stat-data {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #6b7280;
      font-weight: 500;
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

    /* VS Section with Prediction */
    .vs-prediction-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 20px;
    }

    .vs-container {
      position: relative;
    }

    .vs-ring {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      animation: ring-pulse 3s ease-in-out infinite;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    @keyframes ring-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); }
      50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4); }
    }

    .battle-swords {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .sword-left, .sword-right {
      position: absolute;
      font-size: 2rem;
      color: rgba(255, 255, 255, 0.8);
      animation: sword-battle 2s ease-in-out infinite;
    }

    .sword-left {
      transform: rotate(-30deg) translateX(-10px);
      animation-delay: 0s;
    }

    .sword-right {
      transform: rotate(150deg) translateX(-10px);
      animation-delay: 1s;
    }

    @keyframes sword-battle {
      0%, 100% { transform: rotate(-30deg) translateX(-10px) scale(1); }
      50% { transform: rotate(-35deg) translateX(-15px) scale(1.1); }
    }

    .vs-text {
      font-size: 1.8rem;
      font-weight: 900;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 2px;
      z-index: 2;
      position: relative;
    }

    .prediction-result {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 15px;
      padding: 20px;
      border: 2px solid rgba(102, 126, 234, 0.1);
      min-width: 280px;
    }

    .prediction-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 15px;
      color: #667eea;
      font-weight: 600;
      font-size: 1rem;
    }

    .win-probability {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .prob-team-a, .prob-team-b {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .prob-value {
      font-size: 1.1rem;
      font-weight: 700;
      min-width: 40px;
    }

    .prob-bar {
      flex: 1;
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .prob-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 1s ease;
    }

    .prob-team-a .prob-fill {
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    }

    .prob-team-b .prob-fill {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    .prob-draw {
      text-align: center;
      padding: 8px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 8px;
      color: #10b981;
      font-size: 0.9rem;
      font-weight: 600;
    }

    /* Advanced Controls */
    .advanced-controls {
      display: flex;
      flex-direction: column;
      gap: 25px;
      padding: 25px;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 250, 252, 0.7) 100%);
      border-radius: 20px;
      border: 2px solid rgba(102, 126, 234, 0.1);
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .control-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #374151;
      font-size: 1rem;
    }

    .analysis-modes {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .mode-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      border: 2px solid #e5e7eb;
      background: white;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .mode-btn:hover {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .mode-btn.active {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .ai-btn-enhanced {
      position: relative;
      padding: 15px 25px;
      border: none;
      border-radius: 15px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      overflow: hidden;
      min-width: 180px;
    }

    .ai-btn-enhanced .btn-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      position: relative;
      z-index: 2;
    }

    .btn-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: left 0.5s ease;
      z-index: 1;
    }

    .ai-btn-enhanced:hover .btn-shine {
      left: 100%;
    }

    .analyze-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .balance-btn {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
    }

    .export-btn {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: white;
      box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
    }

    .ai-btn-enhanced:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
    }

    .ai-btn-enhanced:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .loading-analysis {
      padding: 20px 0;
    }

    /* Enhanced Loading Analysis */
    .loading-analysis-enhanced {
      padding: 30px 0;
      text-align: center;
    }

    .analysis-visualization {
      margin-bottom: 40px;
    }

    .neural-processing {
      position: relative;
      display: inline-block;
      margin-bottom: 30px;
    }

    .processing-core {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto;
    }

    .core-ring {
      position: absolute;
      border-radius: 50%;
      border: 3px solid;
    }

    .ring-1 {
      width: 120px;
      height: 120px;
      border-color: rgba(102, 126, 234, 0.3);
      animation: rotate-ring 8s linear infinite;
    }

    .ring-2 {
      width: 90px;
      height: 90px;
      top: 15px;
      left: 15px;
      border-color: rgba(139, 92, 246, 0.5);
      animation: rotate-ring 6s linear infinite reverse;
    }

    .ring-3 {
      width: 60px;
      height: 60px;
      top: 30px;
      left: 30px;
      border-color: rgba(245, 158, 11, 0.7);
      animation: rotate-ring 4s linear infinite;
    }

    @keyframes rotate-ring {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .processing-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: center-pulse 2s ease-in-out infinite;
    }

    @keyframes center-pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.2); }
    }

    .processing-brain {
      color: white;
      font-size: 1.2rem;
    }

    .data-streams {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .stream {
      position: absolute;
      width: 2px;
      height: 20px;
      background: linear-gradient(to bottom, transparent, #667eea, transparent);
      animation: data-stream 2s ease-in-out infinite;
    }

    .stream-1 { top: 20px; left: 30px; animation-delay: 0s; }
    .stream-2 { top: 40px; right: 25px; animation-delay: 0.5s; }
    .stream-3 { bottom: 30px; left: 45px; animation-delay: 1s; }
    .stream-4 { bottom: 20px; right: 40px; animation-delay: 1.5s; }

    @keyframes data-stream {
      0%, 100% { opacity: 0; transform: translateY(0); }
      50% { opacity: 1; transform: translateY(-10px); }
    }

    .progress-section {
      margin-bottom: 30px;
    }

    .processing-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 20px 0;
      animation: text-glow 2s ease-in-out infinite;
    }

    @keyframes text-glow {
      0%, 100% { text-shadow: 0 0 5px rgba(102, 126, 234, 0.3); }
      50% { text-shadow: 0 0 20px rgba(102, 126, 234, 0.5); }
    }

    .enhanced-progress-bar {
      position: relative;
      height: 12px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      margin-bottom: 15px;
      overflow: hidden;
    }

    .progress-track {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      animation: track-shimmer 2s linear infinite;
    }

    @keyframes track-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-fill-enhanced {
      height: 100%;
      border-radius: 6px;
      transition: width 0.8s ease;
      position: relative;
      overflow: hidden;
    }

    .progress-glow {
      position: absolute;
      top: -2px;
      width: 20px;
      height: 16px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent);
      border-radius: 50%;
      animation: glow-move 2s ease-in-out infinite;
      transform: translateX(-50%);
    }

    @keyframes glow-move {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }

    .progress-percentage {
      font-weight: 700;
      color: #667eea;
    }

    .eta {
      color: #6b7280;
      font-style: italic;
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

    /* Enhanced Steps */
    .analysis-steps-enhanced {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-top: 20px;
    }

    .step-enhanced {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 15px;
      border-radius: 15px;
      transition: all 0.3s ease;
      position: relative;
      background: rgba(255, 255, 255, 0.5);
      border: 2px solid rgba(0, 0, 0, 0.05);
    }

    .step-enhanced.active {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      border-color: rgba(102, 126, 234, 0.3);
      transform: translateY(-5px);
    }

    .step-enhanced.completed {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
      border-color: rgba(16, 185, 129, 0.3);
    }

    .step-enhanced.processing {
      animation: step-processing 2s ease-in-out infinite;
    }

    @keyframes step-processing {
      0%, 100% { box-shadow: 0 0 0 rgba(102, 126, 234, 0.4); }
      50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
    }

    .step-icon {
      position: relative;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      font-size: 1.3rem;
      color: #6b7280;
      transition: all 0.3s ease;
    }

    .step-enhanced.active .step-icon,
    .step-enhanced.processing .step-icon {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      animation: icon-pulse 2s ease-in-out infinite;
    }

    .step-enhanced.completed .step-icon {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    @keyframes icon-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .step-pulse {
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      border: 2px solid #667eea;
      border-radius: 50%;
      animation: pulse-ring 2s ease-out infinite;
    }

    @keyframes pulse-ring {
      0% {
        transform: scale(0.8);
        opacity: 1;
      }
      100% {
        transform: scale(1.8);
        opacity: 0;
      }
    }

    .step-content {
      text-align: center;
    }

    .step-title {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }

    .step-description {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 400;
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
  `]
})
export class PlayersComponent implements OnInit {
  @Input() canEdit = false;
  @Input() isAdmin = false;
  
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  teamA: Player[] = [];
  teamB: Player[] = [];
  registeredPlayers: Player[] = [];
  useRegistered = false;
  selectedPlayer: Player | null = null;
  
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
      // Load from assets file
      const response = await fetch('/assets/players.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.allPlayers = data || [];
      
      this.updateFilteredPlayers();
    } catch (error) {
      console.error('❌ Error loading players:', error);
      this.allPlayers = [];
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

  saveMatchInfo() {
    try {
      const match = this.createMatchData();
      this.saveToHistory(match);
      this.showTemporaryMessage('matchSaveMessage', 'Đã lưu lịch sử trận!');
    } catch (error) {
      console.error('Error saving match info:', error);
      this.showTemporaryMessage('matchSaveMessage', 'Lỗi khi lưu trận đấu!');
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

  private saveToHistory(match: {
    date: string;
    scoreA: number;
    scoreB: number;
    scorerA: string;
    scorerB: string;
    assistA: string;
    assistB: string;
    yellowA: string;
    yellowB: string;
    redA: string;
    redB: string;
    teamA: Player[];
    teamB: Player[];
  }) {
    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    history.push(match);
    localStorage.setItem('matchHistory', JSON.stringify(history));
  }

  private showTemporaryMessage(messageProperty: keyof Pick<PlayersComponent, 'matchSaveMessage' | 'saveMessage' | 'saveRegisteredMessage'>, message: string) {
    this[messageProperty] = message;
    setTimeout(() => {
      this[messageProperty] = '';
    }, 3000);
  }

  // Enhanced AI Analysis Properties
  analysisConfidence = 95;
  teamAWinProbability = 45;
  teamBWinProbability = 40;
  drawProbability = 15;
  analysisMode = 'advanced';

  // Enhanced AI Analysis Methods
  getTeamSkillAverage(team: 'teamA' | 'teamB', skill: 'attack' | 'defense' | 'stamina'): number {
    const players = team === 'teamA' ? this.teamA : this.teamB;
    if (players.length === 0) return 0;
    
    const total = players.reduce((sum, player) => {
      const playerWithSkills = player as Player & { attack?: number; defense?: number; stamina?: number };
      switch (skill) {
        case 'attack': return sum + (playerWithSkills.attack || 5);
        case 'defense': return sum + (playerWithSkills.defense || 5);
        case 'stamina': return sum + (playerWithSkills.stamina || 5);
        default: return sum + 5;
      }
    }, 0);
    
    return Math.round((total / players.length) * 10) / 10;
  }

  setAnalysisMode(mode: string) {
    this.analysisMode = mode;
    this.updateAnalysisPredictions();
  }

  private updateAnalysisPredictions() {
    // Calculate team strengths
    const teamAStrength = this.calculateTeamStrength('teamA');
    const teamBStrength = this.calculateTeamStrength('teamB');
    const totalStrength = teamAStrength + teamBStrength;
    
    if (totalStrength === 0) {
      this.teamAWinProbability = 50;
      this.teamBWinProbability = 50;
      this.drawProbability = 0;
      return;
    }

    // Base probabilities
    const teamABase = (teamAStrength / totalStrength) * 100;
    const teamBBase = (teamBStrength / totalStrength) * 100;
    
    // Adjust for analysis mode complexity
    this.drawProbability = Math.min(25, Math.max(5, Math.abs(teamABase - teamBBase) / 2));
    
    const remainingProb = 100 - this.drawProbability;
    this.teamAWinProbability = Math.round((teamABase / 100) * remainingProb);
    this.teamBWinProbability = Math.round((teamBBase / 100) * remainingProb);
    
    // Update confidence based on team balance
    const balanceDiff = Math.abs(teamAStrength - teamBStrength);
    this.analysisConfidence = Math.max(70, 100 - balanceDiff * 2);
  }

  private calculateTeamStrength(team: 'teamA' | 'teamB'): number {
    const players = team === 'teamA' ? this.teamA : this.teamB;
    return players.reduce((total, player) => {
      const playerWithSkills = player as Player & { attack?: number; defense?: number; stamina?: number };
      const attack = playerWithSkills.attack || 5;
      const defense = playerWithSkills.defense || 5;
      const stamina = playerWithSkills.stamina || 5;
      return total + (attack + defense + stamina);
    }, 0);
  }

  private getAnalysisComplexity(): number {
    switch (this.analysisMode) {
      case 'basic': return 0.5;
      case 'advanced': return 1.0;
      case 'professional': return 1.5;
      default: return 1.0;
    }
  }

  getCurrentProcessingTitle(): string {
    switch (this.analysisStep) {
      case 1: return 'Đang phân tích kỹ năng cầu thủ...';
      case 2: return 'Đang tính toán bằng Machine Learning...';
      case 3: return 'Đang tối ưu hóa đội hình...';
      case 4: return 'Hoàn thành dự đoán AI!';
      default: return 'Đang khởi động AI Engine...';
    }
  }

  getProgressGradient(): string {
    const progress = this.analysisProgress;
    if (progress < 25) return 'linear-gradient(90deg, #ff6b6b, #ffa726)';
    if (progress < 50) return 'linear-gradient(90deg, #ffa726, #42a5f5)';
    if (progress < 75) return 'linear-gradient(90deg, #42a5f5, #66bb6a)';
    return 'linear-gradient(90deg, #66bb6a, #26c6da)';
  }

  getEstimatedTime(): string {
    const remaining = 100 - this.analysisProgress;
    const seconds = Math.max(1, Math.round(remaining / 20));
    return `~${seconds}s còn lại`;
  }

  exportAnalysis() {
    const analysisData = {
      timestamp: new Date().toISOString(),
      teams: {
        teamA: {
          players: this.teamA,
          skills: {
            attack: this.getTeamSkillAverage('teamA', 'attack'),
            defense: this.getTeamSkillAverage('teamA', 'defense'),
            stamina: this.getTeamSkillAverage('teamA', 'stamina')
          }
        },
        teamB: {
          players: this.teamB,
          skills: {
            attack: this.getTeamSkillAverage('teamB', 'attack'),
            defense: this.getTeamSkillAverage('teamB', 'defense'),
            stamina: this.getTeamSkillAverage('teamB', 'stamina')
          }
        }
      },
      prediction: {
        teamAWinProbability: this.teamAWinProbability,
        teamBWinProbability: this.teamBWinProbability,
        drawProbability: this.drawProbability,
        confidence: this.analysisConfidence
      },
      analysisMode: this.analysisMode
    };

    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `thanglong-fc-analysis-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
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

  autoBalance(): void {
    if (this.isAnalyzing) return;

    const allAvailablePlayers = [...this.teamA, ...this.teamB];
    if (allAvailablePlayers.length === 0) return;

    // Clear current teams
    this.teamA = [];
    this.teamB = [];

    // Shuffle players randomly
    const shuffled = [...allAvailablePlayers].sort(() => Math.random() - 0.5);

    // Distribute players evenly
    shuffled.forEach((player, index) => {
      if (index % 2 === 0) {
        this.teamA.push(player);
      } else {
        this.teamB.push(player);
      }
    });

    this.savePlayers();
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
}