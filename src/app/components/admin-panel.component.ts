import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, MatchResult, PlayerStats } from '../services/firebase.service';
import { FirebaseAuthService } from '../services/firebase-auth.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-panel" *ngIf="canEdit">
      <div class="admin-header">
        <h3><i class="fas fa-shield-alt"></i> Admin Panel</h3>
        <div class="admin-badge">{{currentUser}}</div>
      </div>

      <div class="admin-tabs">
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'matches'"
          (click)="activeTab = 'matches'">
          <i class="fas fa-futbol"></i> Trận đấu
        </button>
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'players'"
          (click)="activeTab = 'players'">
          <i class="fas fa-users"></i> Cầu thủ
        </button>
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'history'"
          (click)="activeTab = 'history'">
          <i class="fas fa-history"></i> Lịch sử
        </button>
      </div>

      <!-- Match Results Tab -->
      <div *ngIf="activeTab === 'matches'" class="tab-content">
        <div class="add-form">
          <h4><i class="fas fa-plus"></i> Thêm kết quả trận đấu</h4>
          <form (ngSubmit)="addMatchResult()" #matchForm="ngForm">
            <div class="form-row">
              <input 
                type="date" 
                [(ngModel)]="newMatch.date" 
                name="date" 
                required
                class="form-input">
              <input 
                type="text" 
                [(ngModel)]="newMatch.competition" 
                name="competition" 
                placeholder="Giải đấu"
                class="form-input">
            </div>
            <div class="form-row">
              <input 
                type="text" 
                [(ngModel)]="newMatch.homeTeam" 
                name="homeTeam" 
                placeholder="Đội nhà" 
                required
                class="form-input">
              <span class="vs">VS</span>
              <input 
                type="text" 
                [(ngModel)]="newMatch.awayTeam" 
                name="awayTeam" 
                placeholder="Đội khách" 
                required
                class="form-input">
            </div>
            <div class="form-row">
              <input 
                type="number" 
                [(ngModel)]="newMatch.homeScore" 
                name="homeScore" 
                placeholder="Tỷ số nhà" 
                min="0"
                required
                class="form-input score-input">
              <span class="score-separator">-</span>
              <input 
                type="number" 
                [(ngModel)]="newMatch.awayScore" 
                name="awayScore" 
                placeholder="Tỷ số khách" 
                min="0"
                required
                class="form-input score-input">
            </div>
            <button type="submit" class="submit-btn" [disabled]="!matchForm.valid">
              <i class="fas fa-save"></i> Lưu kết quả
            </button>
          </form>
        </div>

        <div class="data-list">
          <h4><i class="fas fa-list"></i> Kết quả gần đây</h4>
          <div class="match-list">
            <div *ngFor="let match of matchResults | slice:0:5" class="match-item">
              <div class="match-info">
                <div class="match-date">{{formatDate(match.date)}}</div>
                <div class="match-teams">
                  <span class="team">{{match.homeTeam}}</span>
                  <span class="score">{{match.homeScore}} - {{match.awayScore}}</span>
                  <span class="team">{{match.awayTeam}}</span>
                </div>
                <div class="match-meta">{{match.competition}} • {{match.updatedBy}}</div>
              </div>
              <button class="delete-btn" (click)="deleteMatch(match.id!)" *ngIf="isSuperAdmin">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Player Stats Tab -->
      <div *ngIf="activeTab === 'players'" class="tab-content">
        <div class="add-form">
          <h4><i class="fas fa-plus"></i> Thêm/Cập nhật thống kê cầu thủ</h4>
          <form (ngSubmit)="addPlayerStats()" #playerForm="ngForm">
            <div class="form-row">
              <input 
                type="text" 
                [(ngModel)]="newPlayer.name" 
                name="name" 
                placeholder="Tên cầu thủ" 
                required
                class="form-input">
              <select 
                [(ngModel)]="newPlayer.position" 
                name="position" 
                class="form-input">
                <option value="GK">Thủ môn</option>
                <option value="DF">Hậu vệ</option>
                <option value="MF">Tiền vệ</option>
                <option value="FW">Tiền đạo</option>
              </select>
            </div>
            <div class="form-row">
              <input 
                type="number" 
                [(ngModel)]="newPlayer.goals" 
                name="goals" 
                placeholder="Bàn thắng" 
                min="0"
                class="form-input">
              <input 
                type="number" 
                [(ngModel)]="newPlayer.assists" 
                name="assists" 
                placeholder="Kiến tạo" 
                min="0"
                class="form-input">
              <input 
                type="number" 
                [(ngModel)]="newPlayer.matches" 
                name="matches" 
                placeholder="Số trận" 
                min="0"
                class="form-input">
            </div>
            <button type="submit" class="submit-btn" [disabled]="!playerForm.valid">
              <i class="fas fa-save"></i> Lưu thống kê
            </button>
          </form>
        </div>

        <div class="data-list">
          <h4><i class="fas fa-list"></i> Thống kê cầu thủ</h4>
          <div class="player-list">
            <div *ngFor="let player of playerStats" class="player-item">
              <div class="player-info">
                <div class="player-name">{{player.name}}</div>
                <div class="player-stats">
                  <span class="stat">{{player.goals}} bàn</span>
                  <span class="stat">{{player.assists}} kiến tạo</span>
                  <span class="stat">{{player.matches}} trận</span>
                </div>
                <div class="player-meta">{{player.position}} • {{player.updatedBy}}</div>
              </div>
              <button class="delete-btn" (click)="deletePlayer(player.id!)" *ngIf="isSuperAdmin">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- History Tab -->
      <div *ngIf="activeTab === 'history'" class="tab-content">
        <div class="history-list">
          <h4><i class="fas fa-clock"></i> Lịch sử hoạt động</h4>
          <div *ngFor="let item of history | slice:0:10" class="history-item">
            <div class="history-icon">
              <i class="fas fa-edit" *ngIf="item.action.includes('added')"></i>
              <i class="fas fa-sync" *ngIf="item.action.includes('updated')"></i>
              <i class="fas fa-trash" *ngIf="item.action.includes('deleted')"></i>
            </div>
            <div class="history-content">
              <div class="history-description">{{item.description}}</div>
              <div class="history-meta">
                {{item.updatedBy}} • {{formatDateTime(item.date)}}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Status -->
      <div class="realtime-status">
        <div class="status-indicator online"></div>
        <span>Đồng bộ thời gian thực</span>
        <small>Mọi thay đổi sẽ xuất hiện ngay lập tức cho tất cả người dùng</small>
      </div>
    </div>
  `,
  styles: [`
    .admin-panel {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 24px;
      color: white;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .admin-header h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }

    .admin-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }

    .admin-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }

    .tab-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 600;
    }

    .tab-btn:hover, .tab-btn.active {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .tab-content {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
    }

    .add-form {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .add-form h4 {
      margin: 0 0 16px 0;
      font-size: 18px;
    }

    .form-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      align-items: center;
    }

    .form-input {
      flex: 1;
      padding: 12px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 14px;
    }

    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.7);
    }

    .form-input:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.5);
    }

    .score-input {
      max-width: 80px;
      text-align: center;
    }

    .vs, .score-separator {
      font-weight: bold;
      padding: 0 8px;
    }

    .submit-btn {
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .data-list {
      background: rgba(255, 255, 255, 0.05);
      padding: 16px;
      border-radius: 8px;
    }

    .match-item, .player-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.1);
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .match-info, .player-info {
      flex: 1;
    }

    .match-date, .player-name {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .match-teams, .player-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .score {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
    }

    .stat {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .match-meta, .player-meta {
      font-size: 12px;
      opacity: 0.7;
    }

    .delete-btn {
      background: #ff4757;
      border: none;
      color: white;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .delete-btn:hover {
      background: #ff3742;
      transform: scale(1.1);
    }

    .history-item {
      display: flex;
      align-items: start;
      background: rgba(255, 255, 255, 0.1);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .history-icon {
      background: rgba(255, 255, 255, 0.2);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .history-content {
      flex: 1;
    }

    .history-description {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .history-meta {
      font-size: 12px;
      opacity: 0.7;
    }

    .realtime-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 20px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-indicator.online {
      background: #4CAF50;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
      100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
    }

    .realtime-status small {
      margin-left: auto;
      opacity: 0.7;
    }
  `]
})
export class AdminPanelComponent implements OnInit {
  @Input() canEdit = false;
  @Input() currentUser = '';

  activeTab = 'matches';
  
  matchResults: MatchResult[] = [];
  playerStats: PlayerStats[] = [];
  history: any[] = [];

  newMatch: Omit<MatchResult, 'id'> = {
    date: new Date().toISOString().split('T')[0],
    homeTeam: '',
    awayTeam: '',
    homeScore: 0,
    awayScore: 0,
    competition: '',
    updatedBy: '',
    updatedAt: ''
  };

  newPlayer: Omit<PlayerStats, 'id'> = {
    name: '',
    goals: 0,
    assists: 0,
    matches: 0,
    position: 'MF',
    updatedBy: '',
    updatedAt: ''
  };

  constructor(
    private firebaseService: FirebaseService,
    private firebaseAuthService: FirebaseAuthService
  ) {}

  ngOnInit() {
    // Subscribe to real-time data updates
    this.firebaseService.matchResults$.subscribe(results => {
      this.matchResults = results;
    });

    this.firebaseService.playerStats$.subscribe(stats => {
      this.playerStats = stats;
    });

    this.firebaseService.history$.subscribe(history => {
      this.history = history;
    });
  }

  async addMatchResult() {
    try {
      await this.firebaseService.addMatchResult(this.newMatch);
      // Reset form
      this.newMatch = {
        date: new Date().toISOString().split('T')[0],
        homeTeam: '',
        awayTeam: '',
        homeScore: 0,
        awayScore: 0,
        competition: '',
        updatedBy: '',
        updatedAt: ''
      };
    } catch (error) {
      console.error('Error adding match result:', error);
    }
  }

  async addPlayerStats() {
    try {
      await this.firebaseService.addPlayerStats(this.newPlayer);
      // Reset form
      this.newPlayer = {
        name: '',
        goals: 0,
        assists: 0,
        matches: 0,
        position: 'MF',
        updatedBy: '',
        updatedAt: ''
      };
    } catch (error) {
      console.error('Error adding player stats:', error);
    }
  }

  async deleteMatch(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa kết quả trận đấu này?')) {
      try {
        await this.firebaseService.deleteMatchResult(id);
      } catch (error) {
        console.error('Error deleting match result:', error);
      }
    }
  }

  async deletePlayer(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa thống kê cầu thủ này?')) {
      try {
        await this.firebaseService.deletePlayerStats(id);
      } catch (error) {
        console.error('Error deleting player stats:', error);
      }
    }
  }

  get isSuperAdmin(): boolean {
    // Check if current Firebase user is super admin
    const currentFirebaseUser = this.firebaseAuthService.getCurrentUser();
    return currentFirebaseUser ? currentFirebaseUser.isSuperAdmin : false;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }
}