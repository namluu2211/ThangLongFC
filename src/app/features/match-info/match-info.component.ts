import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Player, MatchData } from '../../models/types';

interface MatchPlayer extends Player {
  scorer: number;
  assist: number;
  yellow: number;
  red: number;
}

@Component({
  selector: 'app-match-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="match-info-container">
      <!-- Header -->
      <div class="header-section">
        <h2 class="match-title">
          <i class="fas fa-futbol me-2"></i>
          ⚽ Thông tin trận đấu
        </h2>
        <p class="match-subtitle">Quản lý thông tin chi tiết về trận đấu và thống kê cầu thủ</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-section">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Đang tải danh sách cầu thủ...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage" class="error-section">
        <div class="error-card">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Có lỗi xảy ra</h4>
          <p>{{errorMessage}}</p>
          <button class="retry-btn" (click)="loadPlayers()">
            <i class="fas fa-retry me-1"></i>
            Thử lại
          </button>
        </div>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="success-section">
        <div class="success-card">
          <i class="fas fa-check-circle"></i>
          <p>{{successMessage}}</p>
        </div>
      </div>

      <!-- Match Content -->
      <div *ngIf="players.length && !isLoading" class="match-content">
        <!-- Teams Section -->
        <div class="teams-container">
          <!-- Team A -->
          <div class="team-card team-a">
            <div class="team-header">
              <h3>
                <i class="fas fa-users me-2"></i>
                Đội Xanh
              </h3>
              <div class="team-stats">
                <span class="player-count">{{teamA.length}} cầu thủ</span>
              </div>
            </div>
            <div class="team-table-container">
              <div class="table-responsive">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Vị trí</th>
                      <th>Tên cầu thủ</th>
                      <th class="stat-col">⚽ Bàn thắng</th>
                      <th class="stat-col">🎯 Kiến tạo</th>
                      <th class="stat-col">🟨 Thẻ vàng</th>
                      <th class="stat-col">🟥 Thẻ đỏ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let player of teamA; trackBy: trackByPlayerId">
                      <td class="position-cell">
                        <span class="position-badge">{{player.position}}</span>
                      </td>
                      <td class="player-cell">
                        <div class="player-info">
                          <img [src]="player.avatar" 
                               [alt]="player.firstName"
                               class="player-thumb"
                               (error)="onImageError($event)">
                          <span class="player-name">{{getPlayerName(player)}}</span>
                        </div>
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.scorer" 
                               [disabled]="!canEdit"
                               class="stat-input goals"
                               min="0" 
                               max="10"
                               (change)="onStatChange()">
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.assist" 
                               [disabled]="!canEdit"
                               class="stat-input assists"
                               min="0" 
                               max="10"
                               (change)="onStatChange()">
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.yellow" 
                               [disabled]="!canEdit"
                               class="stat-input yellow"
                               min="0" 
                               max="3"
                               (change)="onStatChange()">
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.red" 
                               [disabled]="!canEdit"
                               class="stat-input red"
                               min="0" 
                               max="1"
                               (change)="onStatChange()">
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Team B -->
          <div class="team-card team-b">
            <div class="team-header">
              <h3>
                <i class="fas fa-users me-2"></i>
                Đội Cam
              </h3>
              <div class="team-stats">
                <span class="player-count">{{teamB.length}} cầu thủ</span>
              </div>
            </div>
            <div class="team-table-container">
              <div class="table-responsive">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Vị trí</th>
                      <th>Tên cầu thủ</th>
                      <th class="stat-col">⚽ Bàn thắng</th>
                      <th class="stat-col">🎯 Kiến tạo</th>
                      <th class="stat-col">🟨 Thẻ vàng</th>
                      <th class="stat-col">🟥 Thẻ đỏ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let player of teamB; trackBy: trackByPlayerId">
                      <td class="position-cell">
                        <span class="position-badge">{{player.position}}</span>
                      </td>
                      <td class="player-cell">
                        <div class="player-info">
                          <img [src]="player.avatar" 
                               [alt]="player.firstName"
                               class="player-thumb"
                               (error)="onImageError($event)">
                          <span class="player-name">{{getPlayerName(player)}}</span>
                        </div>
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.scorer" 
                               [disabled]="!canEdit"
                               class="stat-input goals"
                               min="0" 
                               max="10"
                               (change)="onStatChange()">
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.assist" 
                               [disabled]="!canEdit"
                               class="stat-input assists"
                               min="0" 
                               max="10"
                               (change)="onStatChange()">
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.yellow" 
                               [disabled]="!canEdit"
                               class="stat-input yellow"
                               min="0" 
                               max="3"
                               (change)="onStatChange()">
                      </td>
                      <td class="input-cell">
                        <input type="number" 
                               [(ngModel)]="player.red" 
                               [disabled]="!canEdit"
                               class="stat-input red"
                               min="0" 
                               max="1"
                               (change)="onStatChange()">
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Match Summary -->
        <div class="match-summary-card">
          <div class="summary-header">
            <h3>
              <i class="fas fa-chart-bar me-2"></i>
              📊 Tổng kết trận đấu
            </h3>
          </div>
          <div class="summary-content">
            <div class="score-summary">
              <div class="team-score team-a-score">
                <h4>Đội Xanh</h4>
                <div class="score-display">{{getTeamScore('A')}}</div>
              </div>
              <div class="vs-divider">VS</div>
              <div class="team-score team-b-score">
                <h4>Đội Cam</h4>
                <div class="score-display">{{getTeamScore('B')}}</div>
              </div>
            </div>

            <div class="match-stats">
              <div class="stat-item">
                <i class="fas fa-futbol"></i>
                <span class="stat-label">Tổng bàn thắng:</span>
                <span class="stat-value">{{getTotalGoals()}}</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-crosshairs"></i>
                <span class="stat-label">Tổng kiến tạo:</span>
                <span class="stat-value">{{getTotalAssists()}}</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-square text-warning"></i>
                <span class="stat-label">Thẻ vàng:</span>
                <span class="stat-value">{{getTotalYellows()}}</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-square text-danger"></i>
                <span class="stat-label">Thẻ đỏ:</span>
                <span class="stat-value">{{getTotalReds()}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Section -->
        <div class="financial-card">
          <div class="financial-header">
            <h3>
              <i class="fas fa-money-bill-wave me-2"></i>
              💰 Thông tin tài chính
            </h3>
          </div>
          <div class="financial-content">
            <div class="financial-inputs">
              <div class="input-group">
                <label for="matchFeeInput">
                  <i class="fas fa-coins me-1"></i>
                  Phí sân:
                </label>
                <input id="matchFeeInput"
                       type="number" 
                       [(ngModel)]="matchFee" 
                       [disabled]="!canEdit"
                       class="financial-input"
                       min="0"
                       placeholder="0">
                <span class="currency">VNĐ</span>
              </div>
              
              <div class="input-group">
                <label for="drinkingInput">
                  <i class="fas fa-glass-cheers me-1"></i>
                  Tiền nước:
                </label>
                <input id="drinkingInput"
                       type="number" 
                       [(ngModel)]="drinking" 
                       [disabled]="!canEdit"
                       class="financial-input"
                       min="0"
                       placeholder="0">
                <span class="currency">VNĐ</span>
              </div>
              
              <div class="input-group">
                <label for="refereeInput">
                  <i class="fas fa-whistle me-1"></i>
                  Trọng tài:
                </label>
                <input id="refereeInput"
                       type="number" 
                       [(ngModel)]="referee" 
                       [disabled]="!canEdit"
                       class="financial-input"
                       min="0"
                       placeholder="0">
                <span class="currency">VNĐ</span>
              </div>
            </div>

            <div class="financial-summary" *ngIf="hasFinancialData()">
              <div class="summary-item">
                <span class="label">Tổng chi phí:</span>
                <span class="value expense">{{getTotalExpenses() | number}} VNĐ</span>
              </div>
              <div class="summary-item">
                <span class="label">Thu từ phạt:</span>
                <span class="value income">{{calculatePenaltyIncome() | number}} VNĐ</span>
              </div>
              <div class="summary-item total">
                <span class="label">Số dư thay đổi:</span>
                <span class="value" [class.positive]="getNetChange() > 0" [class.negative]="getNetChange() < 0">
                  {{getNetChange() > 0 ? '+' : ''}}{{getNetChange() | number}} VNĐ
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <button class="action-btn calculate-btn" 
                  (click)="calculateScore()"
                  [disabled]="isCalculating">
            <i [class]="isCalculating ? 'fas fa-spinner fa-spin' : 'fas fa-calculator'" class="me-2"></i>
            {{isCalculating ? 'Đang tính...' : '🧮 Tính điểm & Quỹ'}}
          </button>
          
          <button class="action-btn save-btn" 
                  (click)="save()" 
                  [disabled]="!canEdit || isSaving"
                  [class.disabled]="!canEdit">
            <i [class]="isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-save'" class="me-2"></i>
            {{isSaving ? 'Đang lưu...' : '💾 Lưu trận đấu'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .match-info-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }

    /* Header */
    .header-section {
      text-align: center;
      margin-bottom: 2rem;
      color: white;
    }

    .match-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .match-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin: 0;
    }

    /* Loading & Error States */
    .loading-section, .error-section, .success-section {
      text-align: center;
      padding: 3rem 2rem;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    .loading-spinner {
      font-size: 3rem;
      color: #667eea;
      margin-bottom: 1rem;
    }

    .error-card {
      color: #e74c3c;
    }

    .error-card i {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .success-card {
      color: #27ae60;
    }

    .success-card i {
      font-size: 2rem;
      margin-right: 0.5rem;
    }

    .retry-btn {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      margin-top: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .retry-btn:hover {
      background: #c0392b;
    }

    /* Teams Container */
    .teams-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .team-card {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .team-header {
      padding: 1.5rem;
      background: linear-gradient(135deg, #00bcd4 0%, #00acc1 100%);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .team-card.team-b .team-header {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    }

    .team-header h3 {
      margin: 0;
      font-weight: 600;
      font-size: 1.3rem;
    }

    .player-count {
      background: rgba(255,255,255,0.2);
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* Tables */
    .team-table-container {
      padding: 0;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }

    .modern-table thead th {
      background: #f8f9fa;
      padding: 1rem 0.75rem;
      text-align: center;
      font-weight: 600;
      font-size: 0.9rem;
      border-bottom: 2px solid #dee2e6;
      color: #495057;
    }

    .modern-table tbody td {
      padding: 1rem 0.75rem;
      border-bottom: 1px solid #f1f3f4;
      vertical-align: middle;
    }

    .modern-table tbody tr:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .position-cell {
      text-align: center;
      width: 100px;
    }

    .position-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .player-cell {
      min-width: 180px;
    }

    .player-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .player-thumb {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .player-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .stat-col {
      width: 100px;
      text-align: center;
    }

    .input-cell {
      text-align: center;
      padding: 0.5rem !important;
    }

    .stat-input {
      width: 70px;
      padding: 0.5rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .stat-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }

    .stat-input:disabled {
      background: #f8f9fa;
      color: #6c757d;
    }

    .stat-input.goals:focus {
      border-color: #28a745;
      box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
    }

    .stat-input.assists:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .stat-input.yellow:focus {
      border-color: #ffc107;
      box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
    }

    .stat-input.red:focus {
      border-color: #dc3545;
      box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
    }

    /* Match Summary */
    .match-summary-card {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .summary-header {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 1.5rem;
    }

    .summary-header h3 {
      margin: 0;
      font-weight: 600;
    }

    .summary-content {
      padding: 2rem;
    }

    .score-summary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3rem;
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 15px;
    }

    .team-score {
      text-align: center;
    }

    .team-score h4 {
      margin: 0 0 1rem 0;
      color: #495057;
      font-weight: 600;
    }

    .score-display {
      font-size: 4rem;
      font-weight: 800;
      color: #2c3e50;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .team-a-score .score-display {
      color: #00bcd4;
    }

    .team-b-score .score-display {
      color: #ff9800;
    }

    .vs-divider {
      font-size: 2rem;
      font-weight: 700;
      color: #6c757d;
      display: flex;
      align-items: center;
    }

    .match-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(102, 126, 234, 0.05);
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }

    .stat-item i {
      font-size: 1.2rem;
      color: #667eea;
    }

    .stat-label {
      font-weight: 500;
      color: #495057;
    }

    .stat-value {
      font-weight: 700;
      color: #2c3e50;
      margin-left: auto;
      font-size: 1.1rem;
    }

    /* Financial Section */
    .financial-card {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .financial-header {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
      padding: 1.5rem;
    }

    .financial-header h3 {
      margin: 0;
      font-weight: 600;
    }

    .financial-content {
      padding: 2rem;
    }

    .financial-inputs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
    }

    .input-group label {
      font-weight: 600;
      color: #495057;
      display: flex;
      align-items: center;
    }

    .financial-input {
      padding: 0.875rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      padding-right: 4rem;
    }

    .financial-input:focus {
      outline: none;
      border-color: #27ae60;
      box-shadow: 0 0 0 0.2rem rgba(39, 174, 96, 0.25);
    }

    .financial-input:disabled {
      background: #f8f9fa;
      color: #6c757d;
    }

    .currency {
      position: absolute;
      right: 1rem;
      top: 2.5rem;
      color: #6c757d;
      font-weight: 500;
      pointer-events: none;
    }

    .financial-summary {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 1.5rem;
      border-radius: 10px;
      border-left: 4px solid #27ae60;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      font-size: 1rem;
    }

    .summary-item:last-child {
      margin-bottom: 0;
    }

    .summary-item.total {
      padding-top: 0.75rem;
      border-top: 2px solid #dee2e6;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .summary-item .label {
      font-weight: 500;
      color: #495057;
    }

    .summary-item .value {
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-item .value.expense {
      color: #dc3545;
    }

    .summary-item .value.income {
      color: #28a745;
    }

    .summary-item .value.positive {
      color: #28a745;
    }

    .summary-item .value.negative {
      color: #dc3545;
    }

    /* Action Section */
    .action-section {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 200px;
      justify-content: center;
    }

    .calculate-btn {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }

    .calculate-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(52, 152, 219, 0.4);
    }

    .save-btn {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
    }

    .save-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(39, 174, 96, 0.4);
    }

    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .action-btn.disabled {
      background: #6c757d !important;
      opacity: 0.6;
    }

    /* Responsive Design */
    @media (max-width: 992px) {
      .teams-container {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .score-summary {
        gap: 2rem;
      }

      .score-display {
        font-size: 3rem;
      }
    }

    @media (max-width: 768px) {
      .match-info-container {
        padding: 1rem;
      }

      .match-title {
        font-size: 2rem;
      }

      .financial-inputs {
        grid-template-columns: 1fr;
      }

      .match-stats {
        grid-template-columns: 1fr;
      }

      .action-section {
        flex-direction: column;
        align-items: center;
      }

      .action-btn {
        width: 100%;
        max-width: 300px;
      }

      .modern-table {
        font-size: 0.875rem;
      }

      .modern-table thead th,
      .modern-table tbody td {
        padding: 0.75rem 0.5rem;
      }

      .stat-input {
        width: 60px;
        padding: 0.4rem;
      }

      .player-thumb {
        width: 35px;
        height: 35px;
      }

      .score-summary {
        flex-direction: column;
        gap: 1rem;
      }

      .vs-divider {
        transform: rotate(90deg);
      }
    }
  `]
})
export class MatchInfoComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  @Output() matchSaved = new EventEmitter<MatchData>();
  
  // State management
  players: MatchPlayer[] = [];
  teamA: MatchPlayer[] = [];
  teamB: MatchPlayer[] = [];
  
  // Financial data
  matchFee = 0;
  drinking = 0;
  referee = 0;
  
  // UI state
  isLoading = false;
  isSaving = false;
  isCalculating = false;
  errorMessage = '';
  successMessage = '';
  
  // Event listener reference for cleanup
  private storageListener?: (event: StorageEvent) => void;
  private readonly http = inject(HttpClient);

  ngOnInit(): void {
    this.loadPlayers();
    this.setupStorageListener();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async loadPlayers(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      const response = await firstValueFrom(this.http.get<Player[]>('/assets/players.json'));
      
      this.players = response.map(player => ({
        ...player,
        scorer: 0,
        assist: 0,
        yellow: 0,
        red: 0
      }));
      
      this.divideTeams();
      
    } catch (error) {
      console.error('Error loading players:', error);
      this.errorMessage = 'Không thể tải danh sách cầu thủ. Vui lòng thử lại.';
    } finally {
      this.isLoading = false;
    }
  }

  private divideTeams(): void {
    // Simple division by index for A/B teams
    this.teamA = this.players.filter((_, index) => index % 2 === 0);
    this.teamB = this.players.filter((_, index) => index % 2 === 1);
  }

  private setupStorageListener(): void {
    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'SAVE_MATCH_NOW' && localStorage.getItem('SAVE_MATCH_NOW') === '1') {
        this.save();
        localStorage.removeItem('SAVE_MATCH_NOW');
      }
    };
    
    window.addEventListener('storage', this.storageListener);
  }

  private cleanup(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  // Template methods
  trackByPlayerId(index: number, player: MatchPlayer): number {
    return typeof player.id === 'number' ? player.id : index;
  }

  getPlayerName(player: MatchPlayer): string {
    return player.lastName 
      ? `${player.firstName} ${player.lastName}` 
      : player.firstName;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default-avatar.png';
  }

  onStatChange(): void {
    // Clear success message when stats change
    this.successMessage = '';
  }

  getTeamScore(team: 'A' | 'B'): number {
    const teamPlayers = team === 'A' ? this.teamA : this.teamB;
    return teamPlayers.reduce((sum, player) => sum + (player.scorer || 0), 0);
  }

  getTotalGoals(): number {
    return this.getTeamScore('A') + this.getTeamScore('B');
  }

  getTotalAssists(): number {
    const allPlayers = [...this.teamA, ...this.teamB];
    return allPlayers.reduce((sum, player) => sum + (player.assist || 0), 0);
  }

  getTotalYellows(): number {
    const allPlayers = [...this.teamA, ...this.teamB];
    return allPlayers.reduce((sum, player) => sum + (player.yellow || 0), 0);
  }

  getTotalReds(): number {
    const allPlayers = [...this.teamA, ...this.teamB];
    return allPlayers.reduce((sum, player) => sum + (player.red || 0), 0);
  }

  hasFinancialData(): boolean {
    return this.matchFee > 0 || this.drinking > 0 || this.referee > 0;
  }

  getTotalExpenses(): number {
    return (this.matchFee || 0) + (this.drinking || 0) + (this.referee || 0);
  }

  calculatePenaltyIncome(): number {
    const yellows = this.getTotalYellows() * 50;
    const reds = this.getTotalReds() * 100;
    const winnerBonus = this.calculateWinnerBonus();
    return yellows + reds + winnerBonus;
  }

  private calculateWinnerBonus(): number {
    const scoreA = this.getTeamScore('A');
    const scoreB = this.getTeamScore('B');
    
    if (scoreA > scoreB) {
      return this.teamA.length * 40;
    } else if (scoreB > scoreA) {
      return this.teamB.length * 40;
    }
    return 0; // Draw
  }

  getNetChange(): number {
    return this.calculatePenaltyIncome() - this.getTotalExpenses();
  }

  private getPlayerStatString(team: MatchPlayer[], statType: 'scorer' | 'assist' | 'yellow' | 'red'): string {
    const playersWithStat = team
      .filter(player => player[statType] > 0)
      .map(player => {
        const count = player[statType];
        const name = this.getPlayerName(player);
        return count > 1 ? `${name} (${count})` : name;
      });
    
    return playersWithStat.join(', ');
  }

  async calculateScore(): Promise<void> {
    try {
      this.isCalculating = true;
      this.errorMessage = '';
      
      const netChange = this.getNetChange();
      
      // Update fund
      const currentFund = Number(localStorage.getItem('CURRENT_FUND') || '0');
      const newFund = currentFund + netChange;
      localStorage.setItem('CURRENT_FUND', String(newFund));
      
      this.successMessage = 'Đã tính toán xong! Kiểm tra quỹ để xem chi tiết.';
      
      // Auto-hide success message
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);
      
    } catch (error) {
      console.error('Error calculating score:', error);
      this.errorMessage = 'Có lỗi xảy ra khi tính toán. Vui lòng thử lại.';
    } finally {
      this.isCalculating = false;
    }
  }

  async save(): Promise<void> {
    if (!this.canEdit) {
      this.errorMessage = 'Bạn không có quyền lưu trận đấu.';
      return;
    }

    try {
      this.isSaving = true;
      this.errorMessage = '';

      const matchData: MatchData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        teamA: [...this.teamA],
        teamB: [...this.teamB],
        scoreA: this.getTeamScore('A'),
        scoreB: this.getTeamScore('B'),
        // Convert player stats to goal/assist strings
        scorerA: this.getPlayerStatString(this.teamA, 'scorer'),
        scorerB: this.getPlayerStatString(this.teamB, 'scorer'),
        assistA: this.getPlayerStatString(this.teamA, 'assist'),
        assistB: this.getPlayerStatString(this.teamB, 'assist'),
        yellowA: this.getPlayerStatString(this.teamA, 'yellow'),
        yellowB: this.getPlayerStatString(this.teamB, 'yellow'),
        redA: this.getPlayerStatString(this.teamA, 'red'),
        redB: this.getPlayerStatString(this.teamB, 'red'),
        // Financial data
        chi_san: this.matchFee || 0,
        chi_nuoc: this.drinking || 0,
        chi_trongtai: this.referee || 0,
        chi_total: this.getTotalExpenses(),
        lastSaved: new Date().toISOString(),
        updatedBy: 'match-info-component'
      };

      // Save to localStorage
      const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
      history.push(matchData);
      localStorage.setItem('matchHistory', JSON.stringify(history));

      // Emit event
      this.matchSaved.emit(matchData);

      this.successMessage = 'Đã lưu trận đấu thành công!';
      
      // Auto-hide success message
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error) {
      console.error('Error saving match:', error);
      this.errorMessage = 'Có lỗi xảy ra khi lưu trận đấu. Vui lòng thử lại.';
    } finally {
      this.isSaving = false;
    }
  }
}