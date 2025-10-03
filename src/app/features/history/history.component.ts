import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';
import { FormsModule } from '@angular/forms';

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
          <div class="match-count-badge">{{ matches.length }} trận đấu</div>
          <button class="sync-btn" (click)="syncData()">Sync</button>
          <button class="export-btn" (click)="exportData()">Xuất dữ liệu</button>
        </div>
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

        <div class="matches-list" *ngIf="matches.length > 0; else noMatches">
          <div class="match-card" *ngFor="let match of matches; trackBy: trackByMatchId">
            <!-- Match Date -->
            <div class="match-date-header">
              <span class="date-text">{{ formatMatchDate(match.date) }}</span>
              <div class="match-actions">
                <button class="action-btn edit" (click)="editMatch(match)">✏️</button>
                <button class="action-btn delete" (click)="confirmDeleteMatch(match)">🗑️</button>
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
    </div>
  `,
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  
  matches: HistoryEntry[] = [];
  loading = false;
  showDeleteModal = false;
  matchToDelete: HistoryEntry | null = null;

  ngOnInit(): void {
    this.loadMatches();
  }

  async loadMatches(): Promise<void> {
    try {
      this.loading = true;
      this.matches = this.firebaseService.getCurrentHistory();
      this.matches.sort((a, b) => {
        const dateA = new Date(a.date || '').getTime();
        const dateB = new Date(b.date || '').getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
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
    console.log('Edit match:', match);
  }

  confirmDeleteMatch(match: HistoryEntry): void {
    this.matchToDelete = match;
    this.showDeleteModal = true;
  }

  async deleteMatch(): Promise<void> {
    if (!this.matchToDelete?.id) return;

    try {
      console.log('Delete match:', this.matchToDelete.id);
      await this.loadMatches();
      this.showDeleteModal = false;
      this.matchToDelete = null;
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.matchToDelete = null;
  }

  async syncData(): Promise<void> {
    await this.loadMatches();
  }

  exportData(): void {
    console.log('Export data');
  }
}