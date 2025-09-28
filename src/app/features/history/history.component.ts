import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <div class="stats-badge" *ngIf="history.length">
            <span class="badge bg-primary fs-6 px-3 py-2">
              <i class="fas fa-calendar-alt me-1"></i>
              {{history.length}} trận đấu
            </span>
          </div>
        </div>
      </div>

      <!-- History Content -->
      <div *ngIf="history.length; else noHistory" class="history-content">
        <div *ngFor="let m of history; let i = index" class="match-card">
          <!-- Match Header -->
          <div class="match-header">
            <div class="match-date">
              <i class="fas fa-calendar me-2"></i>
              <span>{{formatDate(m.date)}}</span>
            </div>
            <div class="match-actions" *ngIf="isAdmin()">
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
          <div class="score-section">
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
                <span>Đội hình A</span>
                <span class="player-count">({{(m.teamA || []).length}} người)</span>
              </div>
              <div class="player-list">
                {{getTeamNames(m.teamA) || 'Chưa có thông tin'}}
              </div>
            </div>
            <div class="lineup-item">
              <div class="lineup-header">
                <i class="fas fa-users me-2"></i>
                <span>Đội hình B</span>
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
            </div>
            
            <div class="financial-grid">
              <!-- Thu -->
              <div class="financial-item revenue">
                <div class="financial-label">
                  <i class="fas fa-arrow-up me-1"></i>
                  Thu
                </div>
                <div class="financial-value">
                  {{formatCurrency(m.thu || 0)}}
                </div>
              </div>

              <!-- Chi -->
              <div class="financial-item expenses">
                <div class="financial-label">
                  <i class="fas fa-arrow-down me-1"></i>
                  Chi
                </div>
                <div class="expense-breakdown">
                  <div class="expense-item">
                    <span class="expense-label">Trọng tài:</span>
                    <input 
                      type="number" 
                      [(ngModel)]="m.chi_trongtai" 
                      (ngModelChange)="updateChi(m)"
                      class="expense-input"
                      [readonly]="!canEdit"
                      placeholder="0" />
                  </div>
                  <div class="expense-item">
                    <span class="expense-label">Nước:</span>
                    <input 
                      type="number" 
                      [(ngModel)]="m.chi_nuoc" 
                      (ngModelChange)="updateChi(m)"
                      class="expense-input"
                      [readonly]="!canEdit"
                      placeholder="0" />
                  </div>
                  <div class="expense-item">
                    <span class="expense-label">Sân:</span>
                    <input 
                      type="number" 
                      [(ngModel)]="m.chi_san" 
                      (ngModelChange)="updateChi(m)"
                      class="expense-input"
                      [readonly]="!canEdit"
                      placeholder="0" />
                  </div>
                  <div class="expense-total">
                    <span class="total-label">Tổng:</span>
                    <span class="total-value">{{formatCurrency(calcChi(m))}}</span>
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
          </div>

          <!-- Delete Confirmation Modal -->
          <div *ngIf="deleteConfirm === m" class="modal-overlay" (click)="deleteConfirm = null">
            <div class="delete-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h4>
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  Xác nhận xóa
                </h4>
                <button class="close-btn" (click)="deleteConfirm = null">×</button>
              </div>
              <div class="modal-content">
                <p>Bạn có chắc chắn muốn xóa trận đấu này?</p>
                <p class="text-muted">
                  <small>Hành động này không thể hoàn tác.</small>
                </p>
              </div>
              <div class="modal-footer">
                <button class="btn-secondary" (click)="deleteConfirm = null">
                  <i class="fas fa-times me-1"></i>
                  Hủy
                </button>
                <button class="btn-danger" (click)="deleteMatch(m)">
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
  styles: [`
    .modern-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    /* Header Styles */
    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }

    .header-content {
      background: rgba(255, 255, 255, 0.95);
      padding: 25px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
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
      margin: 0 0 15px 0;
      font-size: 1.1rem;
    }

    .stats-badge .badge {
      font-size: 1rem;
      border-radius: 25px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    /* History Content */
    .history-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Match Card */
    .match-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 25px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .match-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
    }

    /* Match Header */
    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 25px;
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
    }

    .match-date {
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }

    .match-actions {
      display: flex;
      gap: 10px;
    }

    .delete-btn {
      background: rgba(231, 76, 60, 0.2);
      border: 2px solid rgba(231, 76, 60, 0.3);
      color: #e74c3c;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .delete-btn:hover:not(:disabled) {
      background: #e74c3c;
      color: white;
      transform: scale(1.05);
    }

    .delete-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Score Section */
    .score-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px 25px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .team-score {
      text-align: center;
      flex: 1;
    }

    .team-score.team-a .team-label {
      color: white;
      background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);
    }

    .team-score.team-b .team-label {
      color: white;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    }

    .team-label {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 1rem;
      color: white;
      margin-bottom: 15px;
    }

    .score {
      font-size: 3rem;
      font-weight: 800;
      color: #2c3e50;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .vs-separator {
      margin: 0 30px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #7f8c8d;
      background: white;
      padding: 15px 25px;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    /* Stats Grid */
    .stats-grid {
      padding: 25px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .stat-item {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      border-left: 4px solid #3498db;
    }

    .stat-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    .stat-icon {
      font-size: 1.2rem;
      margin-right: 10px;
      padding: 8px;
      border-radius: 10px;
      color: white;
    }

    .stat-icon.goals {
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
    }

    .stat-icon.assists {
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .stat-icon.yellow-card {
      background: linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%);
    }

    .stat-icon.red-card {
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
    }

    .stat-label {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1rem;
    }

    .stat-values {
      display: flex;
      justify-content: space-between;
      gap: 15px;
    }

    .team-stat {
      flex: 1;
      text-align: center;
      padding: 15px;
      border-radius: 10px;
      background: #f8f9fa;
    }

    .team-stat.team-a {
      border-left: 4px solid #00bcd4;
    }

    .team-stat.team-b {
      border-left: 4px solid #ff9800;
    }

    .team-stat .value {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.95rem;
    }

    /* Lineups Section */
    .lineups-section {
      padding: 0 25px 25px 25px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .lineup-item {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .lineup-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .player-count {
      margin-left: auto;
      background: #3498db;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.85rem;
    }

    .player-list {
      line-height: 1.6;
      color: #495057;
      font-size: 0.95rem;
    }

    /* Financial Section */
    .financial-section {
      padding: 0 25px 25px 25px;
    }

    .financial-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      font-weight: 600;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .financial-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .financial-item {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .financial-item.revenue {
      border-left: 4px solid #27ae60;
    }

    .financial-item.expenses {
      border-left: 4px solid #e74c3c;
    }

    .financial-item.net-result {
      border-left: 4px solid #95a5a6;
    }

    .financial-item.net-result.profit {
      border-left-color: #27ae60;
    }

    .financial-item.net-result.profit .financial-value {
      color: #27ae60;
    }

    .financial-item.net-result.loss {
      border-left-color: #e74c3c;
    }

    .financial-item.net-result.loss .financial-value {
      color: #e74c3c;
    }

    .financial-label {
      display: flex;
      align-items: center;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 1rem;
    }

    .financial-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .expense-breakdown {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .expense-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .expense-label {
      font-weight: 500;
      color: #495057;
      font-size: 0.9rem;
    }

    .expense-input {
      width: 80px;
      padding: 6px 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      text-align: right;
      font-weight: 500;
      transition: border-color 0.3s ease;
    }

    .expense-input:focus {
      outline: none;
      border-color: #3498db;
    }

    .expense-input:read-only {
      background: #f8f9fa;
      color: #6c757d;
    }

    .expense-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
    }

    .total-label {
      font-weight: 600;
      color: #2c3e50;
    }

    .total-value {
      font-weight: 700;
      color: #e74c3c;
      font-size: 1.1rem;
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
      z-index: 2000;
    }

    .delete-modal {
      background: white;
      border-radius: 20px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .delete-modal .modal-header {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 20px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .delete-modal .modal-header h4 {
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

    .delete-modal .modal-content {
      padding: 25px;
    }

    .delete-modal .modal-content p {
      margin-bottom: 10px;
      color: #2c3e50;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      padding: 20px 25px;
      background: #f8f9fa;
    }

    .btn-secondary, .btn-danger {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
      transform: translateY(-2px);
    }

    /* No Data State */
    .no-data-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 60px 40px;
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
    }

    .no-data-icon {
      font-size: 4rem;
      color: #bdc3c7;
      margin-bottom: 25px;
    }

    .no-data-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 15px;
    }

    .no-data-text {
      color: #7f8c8d;
      font-size: 1rem;
      line-height: 1.6;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page-title {
        font-size: 1.8rem;
      }

      .lineups-section {
        grid-template-columns: 1fr;
      }

      .financial-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        padding: 20px;
      }

      .score-section {
        flex-direction: column;
        gap: 20px;
      }

      .vs-separator {
        margin: 0;
        transform: rotate(90deg);
      }

      .stat-values {
        flex-direction: column;
        gap: 10px;
      }

      .expense-breakdown {
        gap: 10px;
      }

      .expense-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
    }
  `]
})
export class HistoryComponent implements OnInit {
  @Input() canEdit: boolean = false;
  toNumber(val: any): number {
    return Number(val) || 0;
  }
  updateChi(m: any) {
    m.chi_total = Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0);
    localStorage.setItem('matchHistory', JSON.stringify(this.history));
  }
  calcThu(m: any) {
    // Winner/loser team
    // Thu = total players of winner team x 40 + loser team x 60 + yellow cards x 50 + red cards x 100
    // Exclude 'Thủ môn' and 'Minh nhỏ' from Thu calculation
    let winnerTeam: any[] = [], loserTeam: any[] = [];
    if (Number(m.scoreA) > Number(m.scoreB)) {
      winnerTeam = Array.isArray(m.teamA) ? m.teamA : [];
      loserTeam = Array.isArray(m.teamB) ? m.teamB : [];
    } else if (Number(m.scoreB) > Number(m.scoreA)) {
      winnerTeam = Array.isArray(m.teamB) ? m.teamB : [];
      loserTeam = Array.isArray(m.teamA) ? m.teamA : [];
    } else {
      winnerTeam = [...(Array.isArray(m.teamA) ? m.teamA : []), ...(Array.isArray(m.teamB) ? m.teamB : [])];
      loserTeam = [];
    }
    const isFree = (p: any) => p.position === 'Thủ môn' || p.firstName === 'Minh nhỏ';
    const winnerCount = winnerTeam.filter(p => !isFree(p)).length;
    const loserCount = loserTeam.filter(p => !isFree(p)).length;
    const yellowCount = (typeof m.yellowA === 'string' ? m.yellowA.split(/[, ]+/).filter(x=>x).length : 0) + (typeof m.yellowB === 'string' ? m.yellowB.split(/[, ]+/).filter(x=>x).length : 0);
    const redCount = (typeof m.redA === 'string' ? m.redA.split(/[, ]+/).filter(x=>x).length : 0) + (typeof m.redB === 'string' ? m.redB.split(/[, ]+/).filter(x=>x).length : 0);
    m.thu = winnerCount * 40 + loserCount * 60 + yellowCount * 50 + redCount * 100;
    localStorage.setItem('matchHistory', JSON.stringify(this.history));
  }
  calcChi(m: any): number {
    return Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0);
  }
  isAdmin() {
    return this.role === 'admin' || this.role === 'superadmin';
  }
  deleteConfirm: any = null;
  confirmDelete(m: any) {
    this.deleteConfirm = m;
  }
  deleteMatch(m: any) {
    const idx = this.history.indexOf(m);
    if (idx > -1) {
      this.history.splice(idx, 1);
      localStorage.setItem('matchHistory', JSON.stringify(this.history));
    }
    this.deleteConfirm = null;
  }
  getTeamNames(team: any[]): string {
  return team.map(p => p.firstName || '').filter(x => x).join(', ');
  }
  history: any[] = [];
  role: string = '';
  ngOnInit() {
    this.history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    this.role = localStorage.getItem('role') || '';
    // Sync match info fields from last saved match if available
    if (this.history.length) {
      const m = this.history[this.history.length - 1];
      this.calcThu(m);
      this.updateChi(m);
    }
    this.history.forEach(m => {
      this.calcThu(m);
      this.updateChi(m);
    });
  }
  sumScore(team:any[]) {
    return team.reduce((s:any,p:any)=> s + Number(p.scorer||0),0);
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
}
