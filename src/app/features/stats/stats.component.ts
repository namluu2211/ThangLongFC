import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Player } from '../players/player-utils';

interface MatchData {
  id?: string;
  date: string;
  teamA: Player[];
  teamB: Player[];
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

interface AIAnalysisResult {
  xanhWinProb: number;
  camWinProb: number;
  confidence: number;
  avgGoalsDiff: string;
  matchesAnalyzed: number;
  keyFactors: {
    name: string;
    impact: number;
  }[];
  historicalStats: {
    xanhWins: number;
    camWins: number;
    draws: number;
    totalMatches: number;
  };
}

interface TeamMetrics {
  avgGoalsPerMatch: number;
  avgAssistsPerMatch: number;
  disciplineIndex: number;
  totalMatches: number;
  attackStrength: number;
  consistency: number;
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
                        <div class="player-avatar-wrapper">
                          <img [src]="getPlayerAvatar(monthlyStats[month]?.topScorer?.name!)" 
                               [alt]="monthlyStats[month]?.topScorer?.name"
                               class="monthly-avatar"
                               (error)="onImageError($event)">
                          <div class="achievement-badge goals-badge">{{monthlyStats[month]?.topScorer?.goals}}</div>
                        </div>
                        <div class="player-name-small">{{monthlyStats[month]?.topScorer?.name}}</div>
                      </div>
                      <ng-template #noPlayer>
                        <div class="no-data">Chưa có</div>
                      </ng-template>
                    </td>
                    <td class="player-cell">
                      <div class="player-achievement" *ngIf="monthlyStats[month]?.topAssist; else noPlayer2">
                        <div class="player-avatar-wrapper">
                          <img [src]="getPlayerAvatar(monthlyStats[month]?.topAssist?.name!)" 
                               [alt]="monthlyStats[month]?.topAssist?.name"
                               class="monthly-avatar"
                               (error)="onImageError($event)">
                          <div class="achievement-badge assists-badge">{{monthlyStats[month]?.topAssist?.assists}}</div>
                        </div>
                        <div class="player-name-small">{{monthlyStats[month]?.topAssist?.name}}</div>
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

        <!-- AI/ML Analysis Section -->
        <div class="ai-analysis-card mt-4">
          <div class="ai-header">
            <div class="d-flex justify-content-between align-items-center">
              <h4 class="mb-0">
                <i class="fas fa-brain me-2"></i>
                🤖 AI Phân Tích Dự Đoán
              </h4>
              <div class="ai-badge">
                <span class="badge bg-gradient-ai fs-6 px-3 py-2">
                  <i class="fas fa-robot me-1"></i>
                  Machine Learning
                </span>
              </div>
            </div>
            <p class="ai-subtitle mt-2 mb-0">Dự đoán tỷ lệ thắng/thua giữa đội Xanh và Cam dựa trên dữ liệu lịch sử</p>
          </div>

          <div class="ai-body">
            <!-- Team Selection and Analysis Controls -->
            <div class="analysis-controls mb-4">
              <div class="row">
                <div class="col-md-4">
                  <div class="team-selector xanh-team">
                    <h5 class="team-title">🔵 Đội Xanh</h5>
                    <div class="player-selection">
                      <label class="form-label" for="xanh-players">Chọn cầu thủ đội Xanh:</label>
                      <select multiple class="form-select" id="xanh-players" [(ngModel)]="selectedXanhPlayers" (change)="runAIAnalysis()">
                        <option *ngFor="let player of allPlayers" [value]="player">{{player}}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="vs-section">
                    <div class="vs-icon">⚔️</div>
                    <div class="prediction-trigger">
                      <button class="btn btn-ai" (click)="runAIAnalysis()" [disabled]="isAnalyzing">
                        <i [class]="isAnalyzing ? 'fas fa-spinner fa-spin' : 'fas fa-magic'" class="me-2"></i>
                        {{isAnalyzing ? 'Đang phân tích...' : 'Phân tích AI'}}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="team-selector cam-team">
                    <h5 class="team-title">🟠 Đội Cam</h5>
                    <div class="player-selection">
                      <label class="form-label" for="cam-players">Chọn cầu thủ đội Cam:</label>
                      <select multiple class="form-select" id="cam-players" [(ngModel)]="selectedCamPlayers" (change)="runAIAnalysis()">
                        <option *ngFor="let player of allPlayers" [value]="player">{{player}}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Analysis Results -->
            <div *ngIf="aiAnalysisResults" class="analysis-results">
              <div class="row">
                <!-- Win Probability -->
                <div class="col-lg-6">
                  <div class="prediction-card">
                    <h5 class="prediction-title">📊 Tỷ Lệ Thắng Dự Đoán</h5>
                    <div class="probability-bars">
                      <div class="prob-item xanh-prob">
                        <div class="prob-header">
                          <span class="team-name">🔵 Đội Xanh</span>
                          <span class="prob-value">{{aiAnalysisResults.xanhWinProb}}%</span>
                        </div>
                        <div class="progress">
                          <div class="progress-bar bg-primary" 
                               [style.width.%]="aiAnalysisResults.xanhWinProb"></div>
                        </div>
                      </div>
                      <div class="prob-item cam-prob">
                        <div class="prob-header">
                          <span class="team-name">🟠 Đội Cam</span>
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
                <div class="col-lg-6">
                  <div class="factors-card">
                    <h5 class="factors-title">🎯 Yếu Tố Quyết Định</h5>
                    <div class="factor-list">
                      <div *ngFor="let factor of aiAnalysisResults.keyFactors" 
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

            <!-- No Analysis Message -->
            <div *ngIf="!aiAnalysisResults && !isAnalyzing" class="no-analysis">
              <div class="no-analysis-icon">🤖</div>
              <div class="no-analysis-title">Chọn cầu thủ để bắt đầu phân tích AI</div>
              <div class="no-analysis-text">
                Hãy chọn cầu thủ cho mỗi đội và nhấn "Phân tích AI" để xem dự đoán dựa trên machine learning
              </div>
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
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
      overflow: hidden;
      position: relative;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
        width: 40px;
        height: 40px;
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
      gap: 8px;
      align-items: center;
      text-align: center;
    }

    .player-avatar-wrapper {
      position: relative;
      display: inline-block;
    }

    .monthly-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #fff;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s ease;
    }

    .monthly-avatar:hover {
      transform: scale(1.1);
    }

    .achievement-badge {
      position: absolute;
      bottom: -5px;
      right: -5px;
      min-width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
      color: white;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .goals-badge {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .assists-badge {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .player-name-small {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.75rem;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .bg-gradient-ai {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border: none;
    }

    .ai-body {
      padding: 2rem;
    }

    .analysis-controls {
      background: #f8f9ff;
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .team-selector {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .xanh-team {
      border-left: 4px solid #3498db;
    }

    .cam-team {
      border-left: 4px solid #f39c12;
    }

    .team-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .vs-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .vs-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .btn-ai {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .btn-ai:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      color: white;
    }

    .btn-ai:disabled {
      opacity: 0.7;
      transform: none;
    }

    .analysis-results {
      animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .prediction-card,
    .factors-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      height: 100%;
    }

    .prediction-title,
    .factors-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }

    .prob-item {
      margin-bottom: 1rem;
    }

    .prob-header {
      display: flex;
      justify-content: between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .team-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .prob-value {
      font-weight: 700;
      font-size: 1.1rem;
      color: #27ae60;
    }

    .progress {
      height: 8px;
      border-radius: 4px;
      background: #f1f3f4;
    }

    .progress-bar {
      border-radius: 4px;
      transition: width 1s ease-in-out;
    }

    .factor-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9ff;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }

    .factor-item.positive {
      background: #e8f5e8;
      border-left: 3px solid #27ae60;
    }

    .factor-item.negative {
      background: #fef2f2;
      border-left: 3px solid #e74c3c;
    }

    .factor-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .factor-impact {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .impact-value {
      font-weight: 700;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      text-align: center;
      display: flex;
      align-items: center;
      gap: 1rem;
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
    }

    .metric-content {
      flex: 1;
      text-align: left;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .metric-label {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .history-title {
      color: #2c3e50;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }

    .history-stats {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    }

    .history-stat {
      text-align: center;
      padding: 1rem;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .xanh-wins .stat-number {
      color: #3498db;
    }

    .cam-wins .stat-number {
      color: #f39c12;
    }

    .draws .stat-number {
      color: #95a5a6;
    }

    .total .stat-number {
      color: #2c3e50;
    }

    .stat-label {
      color: #7f8c8d;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .no-analysis {
      text-align: center;
      padding: 3rem 2rem;
      color: #7f8c8d;
    }

    .no-analysis-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .no-analysis-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    .no-analysis-text {
      font-size: 0.95rem;
    }

    /* Responsive AI Styles */
    @media (max-width: 768px) {
      .ai-header,
      .ai-body {
        padding: 1.5rem;
      }

      .analysis-controls {
        padding: 1rem;
      }

      .team-selector {
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .vs-section {
        margin: 1rem 0;
      }

      .metric-card {
        flex-direction: column;
        text-align: center;
      }

      .metric-content {
        text-align: center;
      }

      .prob-header {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .monthly-avatar {
        width: 40px;
        height: 40px;
      }

      .achievement-badge {
        min-width: 20px;
        height: 20px;
        font-size: 0.7rem;
        bottom: -3px;
        right: -3px;
      }

      .player-name-small {
        font-size: 0.7rem;
        max-width: 60px;
      }

      .player-achievement {
        gap: 6px;
      }

      .comparison-table {
        font-size: 0.85rem;
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

  // AI/ML Analysis Properties
  allPlayers: string[] = [];
  selectedXanhPlayers: string[] = [];
  selectedCamPlayers: string[] = [];
  isAnalyzing = false;
  aiAnalysisResults: AIAnalysisResult | null = null;

  ngOnInit() {
    this.loadHistory();
    this.calculateStats();
  }

  private loadHistory() {
    // Use the same data source as history component
    this.history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    this.initializeAI(); // Initialize AI data after loading history
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
      // Base names with various spellings
      'Sy': 'Sy.png',
      'Sỹ': 'Sy.png', // Alternative spelling
      'Trung': 'Trung.png',
      'Bình': 'Binh.png',
      'Binh': 'Binh.png',
      'Công': 'Cong.png',
      'Cong': 'Cong.png',
      'Cường': 'Cuong.png',
      'Cuong': 'Cuong.png',
      'Đ.Duy': 'D.Duy.png',
      'D.Duy': 'D.Duy.png',
      'Duy': 'D.Duy.png',
      'Định': 'Dinh.jpg',
      'Dinh': 'Dinh.jpg',
      'Dương': 'Duong.png',
      'Duong': 'Duong.png',
      'Dybala': 'Dybala.jpg',
      'Galvin': 'Galvin.png',
      'H.Thành': 'H.Thanh.png',
      'H.Thanh': 'H.Thanh.png',
      'Hà': 'Ha.png',
      'Ha': 'Ha.png',
      'Hải': 'Hai.png',
      'Hai': 'Hai.png',
      'Hải Lưu': 'Hai_lu.png',
      'Hai Lưu': 'Hai_lu.png',
      'Hai_lu': 'Hai_lu.png',
      'Hậu': 'Hau.png',
      'Hau': 'Hau.png',
      'Hiền': 'Hien.png',
      'Hien': 'Hien.png',
      'Hiển': 'Hien.png', // Alternative spelling
      'Hiếu': 'Hieu.png',
      'Hieu': 'Hieu.png',
      'Hòa': 'Hoa.png',
      'Hoa': 'Hoa.png',
      'Hùng': 'Hung.png',
      'Hung': 'Hung.png',
      'Huy': 'Huy.png',
      'K.Duy': 'K.Duy.png',
      'Lâm': 'Lam.png',
      'Lam': 'Lam.png',
      'Lê': 'Le.png',
      'Le': 'Le.png',
      'Minh Cui': 'Minh_cui.png',
      'Minh_cui': 'Minh_cui.png',
      'Minh củi': 'Minh_cui.png', // Alternative spelling
      'Minh Nhỏ': 'Minh_nho.jpg',
      'Minh_nho': 'Minh_nho.jpg',
      'Minh nhỏ': 'Minh_nho.jpg', // Alternative spelling
      'Nam': 'Nam.png',
      'Nhân': 'Nhan.png',
      'Nhan': 'Nhan.png',
      'Phú': 'Phu.png',
      'Phu': 'Phu.png',
      'Q.Thành': 'Q.Thanh.png',
      'Q.Thanh': 'Q.Thanh.png',
      'Quang': 'Quang.png',
      'Quý': 'Quy.png',
      'Quy': 'Quy.png',
      'Tây': 'Tay.png',
      'Tay': 'Tay.png',
      'Thắng': 'Thang.png',
      'Thang': 'Thang.png',
      'Thiện': 'Thien.png',
      'Thien': 'Thien.png',
      'V.Thành': 'V.Thanh.png',
      'V.Thanh': 'V.Thanh.png'
    };

    // First try exact match
    let fileName = nameMap[playerName];
    
    // If not found, try normalized matching (remove accents and standardize)
    if (!fileName) {
      // Normalize the input name (remove accents, convert to lowercase for comparison)
      const normalizedInput = playerName.toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd');

      // Try to find a match by normalizing all keys
      for (const [key, value] of Object.entries(nameMap)) {
        const normalizedKey = key.toLowerCase()
          .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
          .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
          .replace(/[ìíịỉĩ]/g, 'i')
          .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
          .replace(/[ùúụủũưừứựửữ]/g, 'u')
          .replace(/[ỳýỵỷỹ]/g, 'y')
          .replace(/đ/g, 'd');
        
        if (normalizedKey === normalizedInput) {
          fileName = value;
          break;
        }
      }
    }
    
    // If still not found, try partial matching (first name only)
    if (!fileName) {
      const firstNameOnly = playerName.split(' ')[0];
      fileName = nameMap[firstNameOnly];
    }
    
    if (fileName) {
      return `assets/images/avatar_players/${fileName}`;
    }
    
    // Default fallback - try to find by exact filename
    const possibleFilename = `${playerName.replace(/\s+/g, '_')}.png`;
    return `assets/images/avatar_players/${possibleFilename}`;
  }

  onImageError(event: Event): void {
    // Fallback to a default icon if image fails to load
    const target = event.target as HTMLImageElement;
    const playerName = target.alt || 'Unknown';
    
    console.log(`Avatar not found for player: ${playerName}, attempted URL: ${target.src}`);
    
    target.style.display = 'none';
    const parent = target.parentNode;
    if (parent && !parent.querySelector('.fallback-icon')) {
      const fallbackIcon = document.createElement('i');
      fallbackIcon.className = 'fas fa-user-circle fallback-icon';
      fallbackIcon.style.fontSize = '40px';
      fallbackIcon.style.color = '#6c757d';
      fallbackIcon.title = `Avatar not available for ${playerName}`;
      parent.appendChild(fallbackIcon);
    }
  }

  getDisplayTitle(): string {
    if (this.viewMode === 'monthly' && this.selectedMonth) {
      return `Tháng ${this.formatMonth(this.selectedMonth)}`;
    }
    return 'Tất cả thời gian';
  }

  // AI/ML Analysis Methods
  private initializeAI(): void {
    // Extract all unique player names from history
    const playerSet = new Set<string>();
    
    this.history.forEach(match => {
      [...match.teamA, ...match.teamB].forEach(player => {
        if (player && player.firstName) {
          const playerName = `${player.firstName} ${player.lastName || ''}`.trim();
          playerSet.add(playerName);
        }
      });
    });
    
    this.allPlayers = Array.from(playerSet).sort();
  }

  async runAIAnalysis(): Promise<void> {
    if (this.selectedXanhPlayers.length === 0 || this.selectedCamPlayers.length === 0) {
      return;
    }

    this.isAnalyzing = true;
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const analysis = this.performMLAnalysis();
      this.aiAnalysisResults = analysis;
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  private performMLAnalysis(): AIAnalysisResult {
    // Find historical matches between selected players
    const relevantMatches = this.findRelevantMatches();
    
    // Calculate player performance metrics
    const xanhMetrics = this.calculateTeamMetrics(this.selectedXanhPlayers);
    const camMetrics = this.calculateTeamMetrics(this.selectedCamPlayers);
    
    // Apply ML algorithms
    const prediction = this.applyMLPrediction(xanhMetrics, camMetrics, relevantMatches);
    
    return {
      xanhWinProb: Math.round(prediction.xanhWinProb),
      camWinProb: Math.round(prediction.camWinProb),
      confidence: Math.round(prediction.confidence),
      avgGoalsDiff: prediction.avgGoalsDiff,
      matchesAnalyzed: relevantMatches.length,
      keyFactors: prediction.keyFactors,
      historicalStats: this.calculateHistoricalStats(relevantMatches)
    };
  }

  private findRelevantMatches(): MatchData[] {
    return this.history.filter(match => {
      const teamAPlayers = match.teamA.map(p => p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : '');
      const teamBPlayers = match.teamB.map(p => p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : '');
      
      // Check if any selected players participated
      const xanhInTeamA = this.selectedXanhPlayers.some(player => teamAPlayers.includes(player));
      const xanhInTeamB = this.selectedXanhPlayers.some(player => teamBPlayers.includes(player));
      const camInTeamA = this.selectedCamPlayers.some(player => teamAPlayers.includes(player));
      const camInTeamB = this.selectedCamPlayers.some(player => teamBPlayers.includes(player));
      
      return (xanhInTeamA || xanhInTeamB) && (camInTeamA || camInTeamB);
    });
  }

  private calculateTeamMetrics(players: string[]) {
    let totalGoals = 0;
    let totalAssists = 0;
    let totalYellows = 0;
    let totalReds = 0;
    let totalMatches = 0;

    players.forEach(playerName => {
      this.history.forEach(match => {
        const playerParticipated = this.checkPlayerInMatch(match, playerName);
        if (playerParticipated) {
          totalMatches++;
          totalGoals += this.getPlayerStatsFromMatch(match, playerName, 'goals');
          totalAssists += this.getPlayerStatsFromMatch(match, playerName, 'assists');
          totalYellows += this.getPlayerStatsFromMatch(match, playerName, 'yellows');
          totalReds += this.getPlayerStatsFromMatch(match, playerName, 'reds');
        }
      });
    });

    const avgGoalsPerMatch = totalMatches > 0 ? totalGoals / totalMatches : 0;
    const avgAssistsPerMatch = totalMatches > 0 ? totalAssists / totalMatches : 0;
    const disciplineIndex = totalMatches > 0 ? (totalYellows * 0.5 + totalReds * 2) / totalMatches : 0;

    return {
      avgGoalsPerMatch,
      avgAssistsPerMatch,
      disciplineIndex,
      totalMatches,
      attackStrength: avgGoalsPerMatch + avgAssistsPerMatch,
      consistency: totalMatches > 5 ? 1 : totalMatches / 5 // Consistency based on experience
    };
  }

  private applyMLPrediction(xanhMetrics: TeamMetrics, camMetrics: TeamMetrics, historicalMatches: MatchData[]) {
    // Weighted factors for prediction
    const weights = {
      attackStrength: 0.3,
      consistency: 0.25,
      discipline: 0.15,
      historical: 0.3
    };

    // Calculate attack advantage
    const attackDiff = xanhMetrics.attackStrength - camMetrics.attackStrength;
    const attackAdvantage = Math.tanh(attackDiff) * weights.attackStrength;

    // Calculate consistency advantage  
    const consistencyDiff = xanhMetrics.consistency - camMetrics.consistency;
    const consistencyAdvantage = Math.tanh(consistencyDiff) * weights.consistency;

    // Calculate discipline advantage (lower is better)
    const disciplineDiff = camMetrics.disciplineIndex - xanhMetrics.disciplineIndex;
    const disciplineAdvantage = Math.tanh(disciplineDiff) * weights.discipline;

    // Historical performance
    const historicalStats = this.calculateHistoricalStats(historicalMatches);
    const historicalRate = historicalStats.totalMatches > 0 ? 
      historicalStats.xanhWins / historicalStats.totalMatches : 0.5;
    const historicalAdvantage = (historicalRate - 0.5) * weights.historical;

    // Combine all factors
    const totalAdvantage = attackAdvantage + consistencyAdvantage + disciplineAdvantage + historicalAdvantage;
    
    // Convert to probability (sigmoid-like function)
    const xanhWinProb = 50 + (totalAdvantage * 40);
    const camWinProb = 100 - xanhWinProb;

    // Calculate confidence based on data availability
    const confidence = Math.min(90, 
      30 + (historicalMatches.length * 5) + 
      (Math.min(xanhMetrics.totalMatches, camMetrics.totalMatches) * 2)
    );

    // Calculate average goal difference
    let totalGoalDiff = 0;
    historicalMatches.forEach(match => {
      totalGoalDiff += Math.abs(match.scoreA - match.scoreB);
    });
    const avgGoalsDiff = historicalMatches.length > 0 ? 
      (totalGoalDiff / historicalMatches.length).toFixed(1) : '0.0';

    return {
      xanhWinProb: Math.max(10, Math.min(90, xanhWinProb)),
      camWinProb: Math.max(10, Math.min(90, camWinProb)),
      confidence,
      avgGoalsDiff,
      keyFactors: [
        { name: 'Sức tấn công', impact: Math.round(attackAdvantage * 100) },
        { name: 'Kinh nghiệm', impact: Math.round(consistencyAdvantage * 100) },
        { name: 'Kỷ luật', impact: Math.round(disciplineAdvantage * 100) },
        { name: 'Lịch sử đối đầu', impact: Math.round(historicalAdvantage * 100) }
      ]
    };
  }

  private calculateHistoricalStats(matches: MatchData[]) {
    let xanhWins = 0;
    let camWins = 0;
    let draws = 0;

    matches.forEach(match => {
      const teamAHasXanh = match.teamA.some(p => 
        this.selectedXanhPlayers.includes(`${p.firstName} ${p.lastName || ''}`.trim())
      );
      const teamAHasCam = match.teamA.some(p => 
        this.selectedCamPlayers.includes(`${p.firstName} ${p.lastName || ''}`.trim())
      );

      if (teamAHasXanh && !teamAHasCam) {
        // Team A is Xanh
        if (match.scoreA > match.scoreB) xanhWins++;
        else if (match.scoreA < match.scoreB) camWins++;
        else draws++;
      } else if (!teamAHasXanh && teamAHasCam) {
        // Team A is Cam
        if (match.scoreA > match.scoreB) camWins++;
        else if (match.scoreA < match.scoreB) xanhWins++;
        else draws++;
      }
    });

    return {
      xanhWins,
      camWins,
      draws,
      totalMatches: xanhWins + camWins + draws
    };
  }

  private checkPlayerInMatch(match: MatchData, playerName: string): boolean {
    const teamAPlayers = match.teamA.map(p => `${p.firstName} ${p.lastName || ''}`.trim());
    const teamBPlayers = match.teamB.map(p => `${p.firstName} ${p.lastName || ''}`.trim());
    return teamAPlayers.includes(playerName) || teamBPlayers.includes(playerName);
  }

  private getPlayerStatsFromMatch(match: MatchData, playerName: string, statType: string): number {
    // Extract player stats from match scorerA, scorerB, assistA, assistB, etc.
    let count = 0;
    
    switch (statType) {
      case 'goals':
        count += this.parsePlayerStatFromField(match.scorerA || '', playerName);
        count += this.parsePlayerStatFromField(match.scorerB || '', playerName);
        break;
      case 'assists':
        count += this.parsePlayerStatFromField(match.assistA || '', playerName);
        count += this.parsePlayerStatFromField(match.assistB || '', playerName);
        break;
      case 'yellows':
        count += this.parsePlayerStatFromField(match.yellowA || '', playerName);
        count += this.parsePlayerStatFromField(match.yellowB || '', playerName);
        break;
      case 'reds':
        count += this.parsePlayerStatFromField(match.redA || '', playerName);
        count += this.parsePlayerStatFromField(match.redB || '', playerName);
        break;
    }
    
    return count;
  }

  // Note: loadHistory method is already defined earlier, will be updated to call initializeAI()
}
