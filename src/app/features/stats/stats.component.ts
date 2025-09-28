import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface MatchData {
  id?: string;
  date: string;
  teamA: any[];
  teamB: any[];
  scoreA: number;
  scoreB: number;
  scorerA?: string;
  scorerB?: string;
  assistA?: string;
  assistB?: string;
  yellowA?: string;
  yellowB?: string;
  redA?: string;
  redB?: string;
}

interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matches: number;
}

interface MonthlyStats {
  month: string;
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  topScorer: PlayerStats | null;
  topAssist: PlayerStats | null;
  playerStats: PlayerStats[];
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid mt-3">
      <!-- Header with gradient background -->
      <div class="stats-header mb-4">
        <div class="row align-items-center">
          <div class="col-md-8">
            <h2 class="stats-title mb-0">
              <i class="fas fa-chart-line me-2"></i>
              📊 Thống kê Thành Tích
            </h2>
            <p class="text-muted mb-0">Phân tích chi tiết thành tích cầu thủ và đội bóng</p>
          </div>
          <div class="col-md-4 text-end">
            <div class="stats-badge">
              <span class="badge bg-success fs-6 px-3 py-2">
                <i class="fas fa-calendar-alt me-1"></i>
                {{history.length}} trận đấu
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Overview Cards -->
      <div class="row mb-4 g-3">
        <div class="col-lg-3 col-md-6">
          <div class="stat-card matches">
            <div class="stat-card-body">
              <div class="stat-icon">⚽</div>
              <div class="stat-info">
                <div class="stat-number">{{overallStats.totalMatches}}</div>
                <div class="stat-label">Trận đấu</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="stat-card goals">
            <div class="stat-card-body">
              <div class="stat-icon">🥅</div>
              <div class="stat-info">
                <div class="stat-number">{{overallStats.totalGoals}}</div>
                <div class="stat-label">Bàn thắng</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="stat-card assists">
            <div class="stat-card-body">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <div class="stat-number">{{overallStats.totalAssists}}</div>
                <div class="stat-label">Kiến tạo</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="stat-card cards">
            <div class="stat-card-body">
              <div class="stat-icon">🟨</div>
              <div class="stat-info">
                <div class="stat-number">{{overallStats.totalYellowCards + overallStats.totalRedCards}}</div>
                <div class="stat-label">Tổng thẻ phạt</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="filter-card">
            <div class="filter-header">
              <h5 class="mb-0">
                <i class="fas fa-filter me-2"></i>
                🎯 Bộ lọc & Sắp xếp
              </h5>
            </div>
            <div class="filter-body">
              <div class="row g-3">
                <div class="col-lg-3 col-md-4">
                  <label class="form-label fw-semibold" for="viewModeSelect">
                    <i class="fas fa-eye me-1"></i>
                    Xem theo:
                  </label>
                  <select id="viewModeSelect" class="form-select modern-select" [(ngModel)]="viewMode" (change)="updateStats()">
                    <option value="all">🌍 Tất cả thời gian</option>
                    <option value="monthly">📅 Theo tháng</option>
                  </select>
                </div>
                <div class="col-lg-3 col-md-4" *ngIf="viewMode === 'monthly'">
                  <label class="form-label fw-semibold" for="monthSelect">
                    <i class="fas fa-calendar me-1"></i>
                    Chọn tháng:
                  </label>
                  <select id="monthSelect" class="form-select modern-select" [(ngModel)]="selectedMonth" (change)="updateStats()">
                    <option value="">-- Chọn tháng --</option>
                    <option *ngFor="let month of availableMonths" [value]="month">{{formatMonth(month)}}</option>
                  </select>
                </div>
                <div class="col-lg-3 col-md-4">
                  <label class="form-label fw-semibold" for="sortBySelect">
                    <i class="fas fa-sort me-1"></i>
                    Sắp xếp theo:
                  </label>
                  <select id="sortBySelect" class="form-select modern-select" [(ngModel)]="sortBy" (change)="updateStats()">
                    <option value="goals">⚽ Bàn thắng</option>
                    <option value="assists">🎯 Kiến tạo</option>
                    <option value="yellowCards">🟨 Thẻ vàng</option>
                    <option value="redCards">🟥 Thẻ đỏ</option>
                    <option value="matches">🏟️ Số trận</option>
                  </select>
                </div>
                <div class="col-lg-3 col-md-12">
                  <label class="form-label fw-semibold text-muted" for="statusField">Tình trạng:</label>
                  <input id="statusField" type="text" class="form-control-plaintext mt-2" value="Đã cập nhật" readonly aria-label="Tình trạng: Đã cập nhật">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics Content -->
      <div *ngIf="history.length; else noData">
        <!-- Monthly Stats View -->
        <div *ngIf="viewMode === 'monthly' && selectedMonth" class="mb-4">
          <div class="monthly-stats-card">
            <div class="monthly-header">
              <h4 class="mb-0">
                <i class="fas fa-calendar-alt me-2"></i>
                📅 Thống kê tháng {{formatMonth(selectedMonth)}}
              </h4>
            </div>
            <div class="monthly-body">
              <div class="row g-3">
                <div class="col-lg-2 col-md-4 col-6">
                  <div class="monthly-stat">
                    <div class="monthly-stat-icon matches">⚽</div>
                    <div class="monthly-stat-value">{{monthlyStats[selectedMonth]?.totalMatches || 0}}</div>
                    <div class="monthly-stat-label">Trận đấu</div>
                  </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                  <div class="monthly-stat">
                    <div class="monthly-stat-icon goals">🥅</div>
                    <div class="monthly-stat-value">{{monthlyStats[selectedMonth]?.totalGoals || 0}}</div>
                    <div class="monthly-stat-label">Bàn thắng</div>
                  </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                  <div class="monthly-stat">
                    <div class="monthly-stat-icon assists">🎯</div>
                    <div class="monthly-stat-value">{{monthlyStats[selectedMonth]?.totalAssists || 0}}</div>
                    <div class="monthly-stat-label">Kiến tạo</div>
                  </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                  <div class="monthly-stat">
                    <div class="monthly-stat-icon yellow">🟨</div>
                    <div class="monthly-stat-value">{{monthlyStats[selectedMonth]?.totalYellowCards || 0}}</div>
                    <div class="monthly-stat-label">Thẻ vàng</div>
                  </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                  <div class="monthly-stat">
                    <div class="monthly-stat-icon red">🟥</div>
                    <div class="monthly-stat-value">{{monthlyStats[selectedMonth]?.totalRedCards || 0}}</div>
                    <div class="monthly-stat-label">Thẻ đỏ</div>
                  </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                  <div class="monthly-stat">
                    <div class="monthly-stat-icon total">📊</div>
                    <div class="monthly-stat-value">{{(monthlyStats[selectedMonth]?.totalGoals || 0) + (monthlyStats[selectedMonth]?.totalAssists || 0)}}</div>
                    <div class="monthly-stat-label">Tổng điểm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Player Statistics Table -->
        <div class="modern-table-card">
          <div class="table-header">
            <div class="d-flex justify-content-between align-items-center">
              <h4 class="mb-0">
                <i class="fas fa-users me-2"></i>
                👥 Bảng xếp hạng cầu thủ
              </h4>
              <div class="table-badge" *ngIf="selectedMonth !== 'all'">
                <span class="badge bg-primary fs-6 px-3 py-2">{{getDisplayTitle()}}</span>
              </div>
            </div>
          </div>
          <div class="table-body">
            <div class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th class="rank-col">#</th>
                    <th class="player-col">
                      <i class="fas fa-user me-1"></i>
                      Cầu thủ
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-futbol me-1"></i>
                      Bàn thắng
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-crosshairs me-1"></i>
                      Kiến tạo
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-square text-warning me-1"></i>
                      Thẻ vàng
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-square text-danger me-1"></i>
                      Thẻ đỏ
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-calendar-check me-1"></i>
                      Số trận
                    </th>
                    <th class="score-col">
                      <i class="fas fa-star me-1"></i>
                      Điểm số
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let player of getCurrentPlayerStats(); let i = index" 
                      class="player-row"
                      [class.rank-1]="i === 0" 
                      [class.rank-2]="i === 1" 
                      [class.rank-3]="i === 2">
                    <td class="rank-cell">
                      <div class="rank-badge" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                        <span *ngIf="i === 0">🥇</span>
                        <span *ngIf="i === 1">🥈</span>
                        <span *ngIf="i === 2">🥉</span>
                        <span *ngIf="i > 2">{{i + 1}}</span>
                      </div>
                    </td>
                    <td class="player-cell">
                      <div class="player-info">
                        <div class="player-avatar">
                          <img [src]="getPlayerAvatar(player.name)" 
                               [alt]="player.name"
                               class="avatar-img"
                               (error)="onImageError($event)">
                        </div>
                        <div class="player-name">{{player.name}}</div>
                      </div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value goals" *ngIf="player.goals > 0">{{player.goals}}</div>
                      <div class="stat-empty" *ngIf="player.goals === 0">-</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value assists" *ngIf="player.assists > 0">{{player.assists}}</div>
                      <div class="stat-empty" *ngIf="player.assists === 0">-</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value yellow" *ngIf="player.yellowCards > 0">{{player.yellowCards}}</div>
                      <div class="stat-empty" *ngIf="player.yellowCards === 0">-</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value red" *ngIf="player.redCards > 0">{{player.redCards}}</div>
                      <div class="stat-empty" *ngIf="player.redCards === 0">-</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value matches">{{player.matches}}</div>
                    </td>
                    <td class="score-cell">
                      <div class="score-badge" [class.high-score]="calculatePlayerScore(player) > 10" 
                           [class.medium-score]="calculatePlayerScore(player) > 5 && calculatePlayerScore(player) <= 10"
                           [class.low-score]="calculatePlayerScore(player) <= 5">
                        {{calculatePlayerScore(player).toFixed(1)}}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Monthly Comparison (All Time View) -->
        <div *ngIf="viewMode === 'all'" class="modern-table-card mt-4">
          <div class="table-header">
            <div class="d-flex justify-content-between align-items-center">
              <h4 class="mb-0">
                <i class="fas fa-calendar-alt me-2"></i>
                📈 So sánh theo tháng
              </h4>
              <div class="table-badge">
                <span class="badge bg-info fs-6 px-3 py-2">{{availableMonths.length}} tháng</span>
              </div>
            </div>
          </div>
          <div class="table-body">
            <div class="table-responsive">
              <table class="modern-monthly-table">
                <thead>
                  <tr>
                    <th class="month-col">
                      <i class="fas fa-calendar me-1"></i>
                      Tháng
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-trophy me-1"></i>
                      Trận đấu
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-futbol me-1"></i>
                      Bàn thắng
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-crosshairs me-1"></i>
                      Kiến tạo
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-square text-warning me-1"></i>
                      Thẻ vàng
                    </th>
                    <th class="stat-col">
                      <i class="fas fa-square text-danger me-1"></i>
                      Thẻ đỏ
                    </th>
                    <th class="player-col">
                      <i class="fas fa-crown me-1"></i>
                      Vua phá lưới
                    </th>
                    <th class="player-col">
                      <i class="fas fa-star me-1"></i>
                      Vua kiến tạo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let month of availableMonths; let i = index" 
                      class="monthly-row"
                      [class.highlight-row]="i === 0">
                    <td class="month-cell">
                      <div class="month-info">
                        <div class="month-name">{{formatMonth(month)}}</div>
                        <div class="month-year">{{getMonthYear(month)}}</div>
                      </div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value">{{monthlyStats[month]?.totalMatches || 0}}</div>
                      <div class="stat-label">trận</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value goals">{{monthlyStats[month]?.totalGoals || 0}}</div>
                      <div class="stat-label">bàn</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value assists">{{monthlyStats[month]?.totalAssists || 0}}</div>
                      <div class="stat-label">kiến tạo</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value yellow">{{monthlyStats[month]?.totalYellowCards || 0}}</div>
                      <div class="stat-label">thẻ vàng</div>
                    </td>
                    <td class="stat-cell">
                      <div class="stat-value red">{{monthlyStats[month]?.totalRedCards || 0}}</div>
                      <div class="stat-label">thẻ đỏ</div>
                    </td>
                    <td class="player-cell">
                      <div class="player-achievement" *ngIf="monthlyStats[month]?.topScorer; else noPlayer">
                        <div class="player-name">{{monthlyStats[month]?.topScorer?.name}}</div>
                        <div class="achievement-value">{{monthlyStats[month]?.topScorer?.goals}} bàn</div>
                      </div>
                      <ng-template #noPlayer>
                        <div class="no-data">Chưa có</div>
                      </ng-template>
                    </td>
                    <td class="player-cell">
                      <div class="player-achievement" *ngIf="monthlyStats[month]?.topAssist; else noPlayer2">
                        <div class="player-name">{{monthlyStats[month]?.topAssist?.name}}</div>
                        <div class="achievement-value">{{monthlyStats[month]?.topAssist?.assists}} kiến tạo</div>
                      </div>
                      <ng-template #noPlayer2>
                        <div class="no-data">Chưa có</div>
                      </ng-template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- No Data Template -->
      <ng-template #noData>
        <div class="no-data-card">
          <div class="no-data-icon">📊</div>
          <div class="no-data-title">Chưa có dữ liệu thống kê</div>
          <div class="no-data-text">
            Hãy chơi một vài trận đấu và lưu vào lịch sử để xem thống kê chi tiết tại đây!
            <br>
            <small class="text-muted mt-2 d-block">
              <i class="fas fa-info-circle me-1"></i>
              Thống kê sẽ tự động cập nhật từ dữ liệu "Xem Lịch Sử"
            </small>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .container-fluid {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header Styles */
    .stats-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      padding: 2rem;
      color: white;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      margin-bottom: 2rem;
    }

    .stats-title {
      font-size: 2.5rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .stats-badge .badge {
      font-size: 1rem;
      border-radius: 25px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }

    /* Stat Cards */
    .stat-card {
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      height: 120px;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    }

    .stat-card.matches {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .stat-card.goals {
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
    }

    .stat-card.assists {
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .stat-card.cards {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .stat-card-body {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      height: 100%;
      color: white;
    }

    .stat-icon {
      font-size: 3rem;
      margin-right: 1.5rem;
      opacity: 0.9;
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .stat-label {
      font-size: 1rem;
      font-weight: 500;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Filter Card */
    .filter-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.05);
    }

    .filter-header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      padding: 1.5rem;
      color: white;
    }

    .filter-header h5 {
      font-weight: 600;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .filter-body {
      padding: 2rem;
    }

    .modern-select {
      border-radius: 12px;
      border: 2px solid #e9ecef;
      padding: 0.75rem 1rem;
      transition: all 0.3s ease;
      background: white;
    }

    .modern-select:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.15);
    }

    /* Monthly Stats Card */
    .monthly-stats-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      overflow: hidden;
      margin-bottom: 2rem;
    }

    .monthly-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1.5rem;
      color: white;
    }

    .monthly-body {
      padding: 2rem;
    }

    .monthly-stat {
      text-align: center;
      padding: 1.5rem 1rem;
      border-radius: 15px;
      background: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }

    .monthly-stat:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }

    .monthly-stat-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .monthly-stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .monthly-stat-label {
      font-size: 0.9rem;
      color: #7f8c8d;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Modern Table */
    .modern-table-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .table-header {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      padding: 1.5rem 2rem;
      color: white;
    }

    .table-header h4 {
      font-weight: 600;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .table-badge .badge {
      font-size: 1rem;
      border-radius: 25px;
      background: rgba(255,255,255,0.2) !important;
      backdrop-filter: blur(10px);
    }

    .table-body {
      padding: 0;
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }

    .modern-table thead tr {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
    }

    .modern-table th {
      padding: 1.5rem 1rem;
      color: white;
      font-weight: 600;
      text-align: center;
      border: none;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modern-table .player-col {
      text-align: left;
      min-width: 200px;
    }

    .modern-table .rank-col {
      width: 80px;
    }

    .modern-table .stat-col {
      width: 100px;
    }

    .modern-table .score-col {
      width: 120px;
    }

    .player-row {
      transition: all 0.3s ease;
      border-bottom: 1px solid #f8f9fa;
    }

    .player-row:hover {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      transform: scale(1.01);
    }

    .player-row.rank-1 {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
    }

    .player-row.rank-2 {
      background: linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, rgba(192, 192, 192, 0.05) 100%);
    }

    .player-row.rank-3 {
      background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, rgba(205, 127, 50, 0.05) 100%);
    }

    .modern-table td {
      padding: 1.5rem 1rem;
      border: none;
      text-align: center;
      vertical-align: middle;
    }

    .rank-cell {
      text-align: center;
    }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      font-weight: 800;
      font-size: 1.2rem;
      background: #e9ecef;
      color: #495057;
    }

    .rank-badge.gold {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      color: #b7791f;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    }

    .rank-badge.silver {
      background: linear-gradient(135deg, #c0c0c0 0%, #ddd 100%);
      color: #666;
      box-shadow: 0 4px 15px rgba(192, 192, 192, 0.4);
    }

    .rank-badge.bronze {
      background: linear-gradient(135deg, #cd7f32 0%, #d49c3d 100%);
      color: #8b4513;
      box-shadow: 0 4px 15px rgba(205, 127, 50, 0.4);
    }

    .player-cell {
      text-align: left !important;
    }

    .player-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .player-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
      overflow: hidden;
      position: relative;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .fallback-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .player-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1rem;
    }

    .stat-value {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 1rem;
      color: white;
    }

    .stat-value.goals {
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
    }

    .stat-value.assists {
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .stat-value.yellow {
      background: linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%);
      color: #b7791f !important;
    }

    .stat-value.red {
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
    }

    .stat-value.matches {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .stat-empty {
      color: #bdc3c7;
      font-size: 1.2rem;
      font-weight: 300;
    }

    .score-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 60px;
      height: 40px;
      border-radius: 20px;
      font-weight: 800;
      font-size: 1rem;
      color: white;
    }

    .score-badge.high-score {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
    }

    .score-badge.medium-score {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      box-shadow: 0 4px 15px rgba(230, 126, 34, 0.3);
    }

    .score-badge.low-score {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
      box-shadow: 0 4px 15px rgba(127, 140, 141, 0.3);
    }

    /* No Data State */
    .no-data-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      padding: 4rem 2rem;
      text-align: center;
    }

    .no-data-icon {
      font-size: 4rem;
      color: #bdc3c7;
      margin-bottom: 2rem;
    }

    .no-data-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    .no-data-text {
      color: #7f8c8d;
      font-size: 1rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-title {
        font-size: 1.8rem;
      }
      
      .stat-card-body {
        padding: 1rem;
      }
      
      .stat-icon {
        font-size: 2rem;
        margin-right: 1rem;
      }
      
      .stat-number {
        font-size: 1.8rem;
      }
      
      .filter-body {
        padding: 1.5rem;
      }
      
      .monthly-body {
        padding: 1.5rem;
      }
      
      .table-header {
        padding: 1rem 1.5rem;
      }
      
      .modern-table th,
      .modern-table td {
        padding: 1rem 0.5rem;
        font-size: 0.8rem;
      }
      
      .player-info {
        gap: 0.5rem;
      }
      
      .player-avatar {
        width: 30px;
        height: 30px;
        font-size: 1rem;
      }
      
      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
    }

    /* Modern Monthly Table Styles */
    .modern-monthly-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .modern-monthly-table thead th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 12px;
      font-weight: 600;
      text-align: center;
      border: none;
      font-size: 0.9rem;
    }

    .modern-monthly-table thead th:first-child {
      text-align: left;
      border-top-left-radius: 12px;
    }

    .modern-monthly-table thead th:last-child {
      border-top-right-radius: 12px;
    }

    .monthly-row {
      transition: all 0.3s ease;
      border-bottom: 1px solid #f1f3f4;
    }

    .monthly-row:hover {
      background: #f8f9ff;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
    }

    .monthly-row.highlight-row {
      background: linear-gradient(135deg, #fff7e6 0%, #fffbf0 100%);
    }

    .monthly-row:last-child {
      border-bottom: none;
    }

    .month-cell {
      padding: 16px;
      border-right: 1px solid #f1f3f4;
    }

    .month-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .month-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1rem;
    }

    .month-year {
      font-size: 0.8rem;
      color: #7f8c8d;
      font-weight: 500;
    }

    .stat-cell {
      padding: 16px 12px;
      text-align: center;
      border-right: 1px solid #f1f3f4;
      min-width: 80px;
    }

    .stat-value {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .stat-value.goals {
      color: #27ae60;
    }

    .stat-value.assists {
      color: #3498db;
    }

    .stat-value.yellow {
      color: #f39c12;
    }

    .stat-value.red {
      color: #e74c3c;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .player-cell {
      padding: 16px 12px;
      border-right: 1px solid #f1f3f4;
      min-width: 140px;
    }

    .player-cell:last-child {
      border-right: none;
    }

    .player-achievement {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: center;
    }

    .player-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .achievement-value {
      font-size: 0.8rem;
      color: #7f8c8d;
      font-weight: 500;
    }

    .no-data {
      color: #bdc3c7;
      font-style: italic;
      font-size: 0.85rem;
      text-align: center;
    }

    /* Responsive Monthly Table */
    @media (max-width: 1200px) {
      .modern-monthly-table {
        font-size: 0.85rem;
      }

      .month-cell, .stat-cell, .player-cell {
        padding: 12px 8px;
      }

      .stat-value {
        font-size: 1rem;
      }

      .player-cell {
        min-width: 120px;
      }
    }

    @media (max-width: 992px) {
      .modern-monthly-table thead th,
      .stat-cell, .player-cell {
        padding: 10px 6px;
      }

      .stat-value {
        font-size: 0.95rem;
      }

      .player-name {
        font-size: 0.8rem;
      }

      .achievement-value {
        font-size: 0.7rem;
      }
    }

    @media (max-width: 768px) {
      .modern-monthly-table {
        border-radius: 8px;
      }

      .modern-monthly-table thead th {
        padding: 8px 4px;
        font-size: 0.8rem;
      }

      .month-cell, .stat-cell, .player-cell {
        padding: 8px 4px;
      }

      .month-name {
        font-size: 0.85rem;
      }

      .month-year {
        font-size: 0.7rem;
      }

      .stat-value {
        font-size: 0.9rem;
      }

      .stat-label {
        font-size: 0.65rem;
      }

      .player-name {
        font-size: 0.75rem;
      }

      .achievement-value {
        font-size: 0.65rem;
      }
    }
  `]
})
export class StatsComponent implements OnInit {
  history: MatchData[] = [];
  availableMonths: string[] = [];
  monthlyStats: Record<string, MonthlyStats> = {};
  overallStats = {
    totalMatches: 0,
    totalGoals: 0,
    totalAssists: 0,
    totalYellowCards: 0,
    totalRedCards: 0
  };
  
  // UI State
  viewMode: 'all' | 'monthly' = 'all';
  selectedMonth = '';
  sortBy: 'goals' | 'assists' | 'yellowCards' | 'redCards' | 'matches' = 'goals';

  ngOnInit() {
    this.loadHistory();
    this.calculateStats();
  }

  private loadHistory() {
    // Use the same data source as history component
    this.history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
  }

  private calculateStats() {
    if (!this.history.length) return;

    // Group matches by month and calculate all stats
    interface Player {
      firstName: string;
      lastName?: string;
      // Add other player properties if needed
    }

    interface Match {
      date: string;
      teamA?: Player[];
      teamB?: Player[];
      scorerA?: string;
      scorerB?: string;
      assistA?: string;
      assistB?: string;
      yellowA?: string;
      yellowB?: string;
      redA?: string;
      redB?: string;
      // Add other fields as needed
    }
    const matchesByMonth: Record<string, Match[]> = {};
    const playerStatsAll: Record<string, PlayerStats> = {};

    for (const match of this.history) {
      const date = new Date(match.date);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      
      if (!matchesByMonth[monthKey]) {
        matchesByMonth[monthKey] = [];
      }
      matchesByMonth[monthKey].push(match);

      // Process all players in the match for overall stats
      const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
      
      // Track unique player participation
      const matchPlayerNames = new Set<string>();
      
      for (const player of allPlayers) {
        if (!player.firstName) continue;
        
        const playerName = `${player.firstName} ${player.lastName || ''}`.trim();
        matchPlayerNames.add(playerName);
        
        if (!playerStatsAll[playerName]) {
          playerStatsAll[playerName] = {
            name: playerName,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            matches: 0
          };
        }
      }

      // Count match participation for each unique player
      matchPlayerNames.forEach(playerName => {
        playerStatsAll[playerName].matches++;
        
        // Add individual player stats from match fields
        const goals = this.parsePlayerStatFromField(match.scorerA, playerName) + this.parsePlayerStatFromField(match.scorerB, playerName);
        const assists = this.parsePlayerStatFromField(match.assistA, playerName) + this.parsePlayerStatFromField(match.assistB, playerName);
        const yellows = this.parsePlayerStatFromField(match.yellowA, playerName) + this.parsePlayerStatFromField(match.yellowB, playerName);
        const reds = this.parsePlayerStatFromField(match.redA, playerName) + this.parsePlayerStatFromField(match.redB, playerName);
        
        playerStatsAll[playerName].goals += goals;
        playerStatsAll[playerName].assists += assists;
        playerStatsAll[playerName].yellowCards += yellows;
        playerStatsAll[playerName].redCards += reds;
      });
    }

    // Calculate monthly stats
    this.availableMonths = Object.keys(matchesByMonth).sort().reverse();
    
    for (const monthKey of this.availableMonths) {
      const monthMatches = matchesByMonth[monthKey];
      const monthPlayerStats: Record<string, PlayerStats> = {};
      
      let totalGoals = 0;
      let totalAssists = 0;
      let totalYellowCards = 0;
      let totalRedCards = 0;

      for (const match of monthMatches) {
        const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
        const matchPlayerNames = new Set<string>();
        
        // Track players in this match
        for (const player of allPlayers) {
          if (!player.firstName) continue;
          
          const playerName = `${player.firstName} ${player.lastName || ''}`.trim();
          matchPlayerNames.add(playerName);
          
          if (!monthPlayerStats[playerName]) {
            monthPlayerStats[playerName] = {
              name: playerName,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              matches: 0
            };
          }
        }

        // Count participation and stats for each player
        matchPlayerNames.forEach(playerName => {
          monthPlayerStats[playerName].matches++;
          
          const goals = this.parsePlayerStatFromField(match.scorerA, playerName) + this.parsePlayerStatFromField(match.scorerB, playerName);
          const assists = this.parsePlayerStatFromField(match.assistA, playerName) + this.parsePlayerStatFromField(match.assistB, playerName);
          const yellows = this.parsePlayerStatFromField(match.yellowA, playerName) + this.parsePlayerStatFromField(match.yellowB, playerName);
          const reds = this.parsePlayerStatFromField(match.redA, playerName) + this.parsePlayerStatFromField(match.redB, playerName);
          
          monthPlayerStats[playerName].goals += goals;
          monthPlayerStats[playerName].assists += assists;
          monthPlayerStats[playerName].yellowCards += yellows;
          monthPlayerStats[playerName].redCards += reds;
        });

        // Calculate total match stats
        totalGoals += this.countStatOccurrences(match.scorerA) + this.countStatOccurrences(match.scorerB);
        totalAssists += this.countStatOccurrences(match.assistA) + this.countStatOccurrences(match.assistB);
        totalYellowCards += this.countStatOccurrences(match.yellowA) + this.countStatOccurrences(match.yellowB);
        totalRedCards += this.countStatOccurrences(match.redA) + this.countStatOccurrences(match.redB);
      }

      // Find top performers for the month
      const monthPlayers = Object.values(monthPlayerStats);
      const topScorer = monthPlayers.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals)[0] || null;
      const topAssist = monthPlayers.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists)[0] || null;

      this.monthlyStats[monthKey] = {
        month: monthKey,
        totalMatches: monthMatches.length,
        totalGoals,
        totalAssists,
        totalYellowCards,
        totalRedCards,
        topScorer,
        topAssist,
        playerStats: monthPlayers
      };
    }

    // Calculate overall stats
    const allPlayersList = Object.values(playerStatsAll);
    this.overallStats = {
      totalMatches: this.history.length,
      totalGoals: allPlayersList.reduce((sum, p) => sum + p.goals, 0),
      totalAssists: allPlayersList.reduce((sum, p) => sum + p.assists, 0),
      totalYellowCards: allPlayersList.reduce((sum, p) => sum + p.yellowCards, 0),
      totalRedCards: allPlayersList.reduce((sum, p) => sum + p.redCards, 0)
    };
  }

  private parsePlayerStatFromField(statField: string, playerName: string): number {
    if (!statField || !playerName) return 0;
    
    // Handle comma-separated names with counts
    const parts = statField.split(',');
    let totalCount = 0;
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Extract the name part (without count in parentheses)
      const nameWithoutCount = trimmed.replace(/\s*\(\d+\)$/, '').trim();
      
      // Check for exact match
      if (this.isExactNameMatch(nameWithoutCount, playerName)) {
        // Extract number if any (e.g., "PlayerName (2)" -> 2)
        const countMatch = trimmed.match(/\((\d+)\)$/);
        const count = countMatch ? parseInt(countMatch[1]) : 1;
        totalCount += count;
      }
    }
    
    return totalCount;
  }

  private isExactNameMatch(fieldName: string, playerName: string): boolean {
    // Normalize names (trim and handle case)
    const normalizedFieldName = fieldName.trim().toLowerCase();
    const normalizedPlayerName = playerName.trim().toLowerCase();
    
    // 1. First try exact full name match
    if (normalizedFieldName === normalizedPlayerName) {
      return true;
    }
    
    // 2. Try matching with first name only, but with strict boundary checking
    const playerFirstName = normalizedPlayerName.split(' ')[0];
    const fieldIsJustFirstName = !normalizedFieldName.includes(' ');
    
    // Only match first name if:
    // - The field contains exactly the first name (no spaces)
    // - AND the field name is exactly the same length as the first name
    // This prevents "Trung" from matching "Trung Dybala"
    if (fieldIsJustFirstName && normalizedFieldName === playerFirstName) {
      return true;
    }
    
    // 3. Handle cases where field might have partial name but we want exact match
    // Split both names and compare each part
    const fieldParts = normalizedFieldName.split(/\s+/);
    const playerParts = normalizedPlayerName.split(/\s+/);
    
    // For exact matching, all parts of the field name must match parts of the player name
    // and the field should not be a subset unless it's exactly the first name
    if (fieldParts.length === playerParts.length) {
      return fieldParts.every((part, index) => part === playerParts[index]);
    }
    
    return false;
  }

  private countStatOccurrences(statField: string): number {
    if (!statField) return 0;
    
    // Count total occurrences in the field
    const parts = statField.split(',');
    let total = 0;
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        // Extract number if any (e.g., "PlayerName (2)" -> 2), otherwise count as 1
        const match = trimmed.match(/\((\d+)\)/);
        total += match ? parseInt(match[1]) : 1;
      }
    }
    return total;
  }

  updateStats() {
    // Trigger recalculation if needed
    this.calculateStats();
  }

  getCurrentPlayerStats(): PlayerStats[] {
    let playerStats: PlayerStats[];
    
    if (this.viewMode === 'monthly' && this.selectedMonth && this.monthlyStats[this.selectedMonth]) {
      playerStats = this.monthlyStats[this.selectedMonth].playerStats;
    } else {
      // Overall stats - reconstruct from monthly data
      const allPlayers: Record<string, PlayerStats> = {};
      
      for (const monthData of Object.values(this.monthlyStats)) {
        for (const player of monthData.playerStats) {
          if (!allPlayers[player.name]) {
            allPlayers[player.name] = {
              name: player.name,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              matches: 0
            };
          }
          
          allPlayers[player.name].goals += player.goals;
          allPlayers[player.name].assists += player.assists;
          allPlayers[player.name].yellowCards += player.yellowCards;
          allPlayers[player.name].redCards += player.redCards;
          allPlayers[player.name].matches += player.matches;
        }
      }
      
      playerStats = Object.values(allPlayers);
    }

    // Sort by selected criteria
    return playerStats.sort((a, b) => {
      if (this.sortBy === 'goals') return b.goals - a.goals;
      if (this.sortBy === 'assists') return b.assists - a.assists;
      if (this.sortBy === 'yellowCards') return b.yellowCards - a.yellowCards;
      if (this.sortBy === 'redCards') return b.redCards - a.redCards;
      if (this.sortBy === 'matches') return b.matches - a.matches;
      return 0;
    });
  }

  calculatePlayerScore(player: PlayerStats): number {
    // Score calculation: goals*3 + assists*2 - yellowCards*0.5 - redCards*2
    return (player.goals * 3) + (player.assists * 2) - (player.yellowCards * 0.5) - (player.redCards * 2);
  }

  formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('vi-VN', { month: 'long' });
  }

  getMonthYear(monthKey: string): string {
    const [year] = monthKey.split('-');
    return year;
  }

  getPlayerAvatar(playerName: string): string {
    // Map player names to their avatar files
    const nameMap: Record<string, string> = {
      'Sy': 'Sy.png',
      'Trung': 'Trung.png',
      'Bình': 'Binh.png',
      'Công': 'Cong.png',
      'Cường': 'Cuong.png',
      'Đ.Duy': 'D.Duy.png',
      'Duy': 'D.Duy.png',
      'Định': 'Dinh.jpg',
      'Dương': 'Duong.png',
      'Dybala': 'Dybala.jpg',
      'Galvin': 'Galvin.png',
      'H.Thành': 'H.Thanh.png',
      'Hà': 'Ha.png',
      'Hải': 'Hai.png',
      'Hải Lưu': 'Hai_lu.png',
      'Hậu': 'Hau.png',
      'Hiền': 'Hien.png',
      'Hiếu': 'Hieu.png',
      'Hòa': 'Hoa.png',
      'Hùng': 'Hung.png',
      'Huy': 'Huy.png',
      'K.Duy': 'K.Duy.png',
      'Lâm': 'Lam.png',
      'Lê': 'Le.png',
      'Minh Cui': 'Minh_cui.png',
      'Minh Nhỏ': 'Minh_nho.jpg',
      'Nam': 'Nam.png',
      'Nhân': 'Nhan.png',
      'Phú': 'Phu.png',
      'Q.Thành': 'Q.Thanh.png',
      'Quang': 'Quang.png',
      'Quý': 'Quy.png',
      'Tây': 'Tay.png',
      'Thắng': 'Thang.png',
      'Thiện': 'Thien.png',
      'V.Thành': 'V.Thanh.png'
    };

    const fileName = nameMap[playerName];
    if (fileName) {
      return `assets/images/avatar_players/${fileName}`;
    }
    
    // Default fallback avatar
    return 'assets/images/avatar_players/default.png';
  }

  onImageError(event: Event): void {
    // Fallback to a default icon if image fails to load
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentNode;
    if (parent && !parent.querySelector('.fallback-icon')) {
      const fallbackIcon = document.createElement('i');
      fallbackIcon.className = 'fas fa-user-circle fallback-icon';
      fallbackIcon.style.fontSize = '40px';
      fallbackIcon.style.color = '#6c757d';
      parent.appendChild(fallbackIcon);
    }
  }

  getDisplayTitle(): string {
    if (this.viewMode === 'monthly' && this.selectedMonth) {
      return `Tháng ${this.formatMonth(this.selectedMonth)}`;
    }
    return 'Tất cả thời gian';
  }
}
