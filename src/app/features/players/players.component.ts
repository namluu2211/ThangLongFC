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
            {{ showPlayerList ? 'Ẩn danh sách' : 'Danh Sách' }}
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
          <div class="players-grid">
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
                  <span class="detail-label">Tuổi:</span>
                  <span class="detail-value">{{ selectedPlayer.DOB }}</span>
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
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .player-modal {
      background: white;
      border-radius: 15px;
      max-width: 650px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease-out;
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
      padding: 20px;
      border-bottom: 1px solid #ecf0f1;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 15px 15px 0 0;
    }

    .modal-header h4 {
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

    .modal-content {
      padding: 25px;
    }

    .player-avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 2px solid #ecf0f1;
    }

    .modal-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 15px;
      border: 4px solid #ecf0f1;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .registration-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      background: #dc3545;
      color: white;
      transition: all 0.3s ease;
    }

    .registration-badge.active {
      background: #28a745;
    }

    .player-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .detail-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .detail-section.full-width {
      grid-column: 1 / -1;
      border-left-color: #28a745;
    }

    .detail-section h5 {
      color: #2c3e50;
      margin: 0 0 15px 0;
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .detail-item:last-child {
      margin-bottom: 0;
      border-bottom: none;
    }

    .detail-label {
      font-weight: 600;
      color: #495057;
      font-size: 0.95rem;
    }

    .detail-value {
      color: #2c3e50;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .position-badge {
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 4px 10px;
      border-radius: 15px;
      font-size: 0.85rem !important;
      display: inline-flex;
      align-items: center;
    }

    .note-content {
      background: white;
      padding: 15px;
      border-radius: 8px;
      color: #2c3e50;
      line-height: 1.6;
      font-size: 0.95rem;
      border: 1px solid rgba(0, 0, 0, 0.1);
      font-style: italic;
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
        gap: 15px;
      }

      .player-modal {
        width: 95%;
        margin: 10px;
      }

      .modal-content {
        padding: 20px;
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
  showPlayerList = false;
  matchSaveMessage = '';
  saveMessage = '';
  saveRegisteredMessage = '';

  trackByPlayerId: TrackByFunction<Player> = (index: number, player: Player) => {
    return player.id;
  };

  async loadPlayers() {
    try {
      // Try to load from localStorage first
      const cachedData = localStorage.getItem('players.json');
      if (cachedData) {
        this.allPlayers = JSON.parse(cachedData);
      } else {
        // Load from assets file
        const response = await fetch('assets/players.json');
        const data = await response.json();
        this.allPlayers = data;
        // Cache the data
        localStorage.setItem('players.json', JSON.stringify(data));
      }
      
      this.updateFilteredPlayers();
    } catch (error) {
      console.error('Error loading players:', error);
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
    console.log('🎯 DROP EVENT FIRED!');
    
    // Enhanced debugging with container identification
    const containerNames = {
      'teamAList': 'Team A',
      'teamBList': 'Team B'
    };
    
    const fromContainer = containerNames[event.previousContainer.id as keyof typeof containerNames] || event.previousContainer.id;
    const toContainer = containerNames[event.container.id as keyof typeof containerNames] || event.container.id;
    
    console.log('🎯 Drop event details:', {
      from: `${fromContainer} (${event.previousContainer.id})`,
      to: `${toContainer} (${event.container.id})`,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      dragData: event.item.data,
      previousData: event.previousContainer.data.length,
      currentData: event.container.data.length
    });

    if (event.previousContainer === event.container) {
      // Moving within the same list - reorder if needed
      console.log(`📝 Reordering within ${fromContainer} - no action needed`);
      return;
    } else {
      // Moving between lists
      console.log(`🔄 Moving from ${fromContainer} to ${toContainer}`);
      console.log('🔍 Before transfer:', {
        sourceLength: event.previousContainer.data.length,
        targetLength: event.container.data.length,
        playerBeingMoved: event.previousContainer.data[event.previousIndex]
      });
      
      try {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
        console.log('✅ Transfer successful');
        console.log('🔍 After transfer:', {
          sourceLength: event.previousContainer.data.length,
          targetLength: event.container.data.length
        });
      } catch (error) {
        console.error('❌ Transfer failed:', error);
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
  }

  viewPlayer(p: Player) {
    this.selectedPlayer = p;
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

  private showTemporaryMessage(messageProperty: string, message: string) {
    (this as any)[messageProperty] = message;
    setTimeout(() => {
      (this as any)[messageProperty] = '';
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
}