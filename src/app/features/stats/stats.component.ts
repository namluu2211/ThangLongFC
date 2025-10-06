import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize, take } from 'rxjs/operators';
import { Player } from '../players/player-utils';
import { StatisticsService } from '../../core/services/statistics.service';
import { MatchService } from '../../core/services/match.service';
import { PlayerService } from '../../core/services/player.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { PlayerInfo } from '../../core/models/player.model';
import { MatchInfo } from '../../core/models/match.model';
import { FirebaseService, HistoryEntry } from '../../services/firebase.service';

interface MatchData {
  id?: string;
  date?: string;
  description?: string;
  
  // Team data - can be arrays of strings OR arrays of Player objects for backward compatibility
  teamA?: (string | Player)[];
  teamB?: (string | Player)[];
  scoreA?: number;
  scoreB?: number;
  scorerA?: string;
  scorerB?: string;
  assistA?: string;
  assistB?: string;
  yellowA?: string;
  yellowB?: string;
  redA?: string;
  redB?: string;
  
  // Financial data
  thu?: number;
  chi_total?: number;
  chi_trongtai?: number;
  chi_nuoc?: number;
  chi_san?: number;
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
            <i class="fas fa-calendar-alt me-1"></i>
                {{history.length}} trận đấu
          </div>
        </div>
      </div>

      <!-- Quick Stats Overview Table -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="stats-overview-table-card">
            <div class="stats-overview-header">
              <h5 class="mb-0">
                <i class="fas fa-chart-bar me-2"></i>
                📊 Tổng quan thống kê
              </h5>
            </div>
            <div class="stats-overview-body">
              <table class="stats-overview-table">
                <thead>
                  <tr>
                    <th class="metric-header">Chỉ số</th>
                    <th class="value-header">Giá trị</th>
                    <th class="description-header">Mô tả</th>
                    <th class="status-header">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="matches-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon matches">⚽</div>
                        <div class="metric-name">Trận đấu</div>
                      </div>
                    </td>
                    <td class="value-cell matches">
                      <div class="metric-value">{{overallStats.totalMatches}}</div>
                    </td>
                    <td class="description-cell">
                      <div class="metric-description">
                        <i class="fas fa-calendar-alt text-primary"></i>
                        Tổng số trận đã diễn ra
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge matches" 
                            [class.high]="overallStats.totalMatches > 20"
                            [class.medium]="overallStats.totalMatches > 10 && overallStats.totalMatches <= 20"
                            [class.low]="overallStats.totalMatches <= 10">
                        {{getMatchesStatus()}}
                      </span>
                    </td>
                  </tr>
                  <tr class="goals-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon goals">🥅</div>
                        <div class="metric-name">Bàn thắng</div>
                      </div>
                    </td>
                    <td class="value-cell goals">
                      <div class="metric-value">{{overallStats.totalGoals}}</div>
                    </td>
                    <td class="description-cell">
                      <div class="metric-description">
                        <i class="fas fa-target text-success"></i>
                        Tổng bàn thắng ghi được
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge goals">Tấn công</span>
                    </td>
                  </tr>
                  <tr class="assists-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon assists">🎯</div>
                        <div class="metric-name">Kiến tạo</div>
                      </div>
                    </td>
                    <td class="value-cell assists">
                      <div class="metric-value">{{overallStats.totalAssists}}</div>
                    </td>
                    <td class="description-cell">
                      <div class="metric-description">
                        <i class="fas fa-hand-point-right text-info"></i>
                        Tổng số kiến tạo thành công
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge assists">Hỗ trợ</span>
                    </td>
                  </tr>
                  <tr class="cards-row">
                    <td class="metric-cell">
                      <div class="metric-info">
                        <div class="metric-icon cards">🟨</div>
                        <div class="metric-name">Thẻ phạt</div>
                      </div>
                    </td>
                    <td class="value-cell cards">
                      <div class="metric-value">{{overallStats.totalYellowCards + overallStats.totalRedCards}}</div>
                    </td>
                    <td class="description-cell">
                      <div class="metric-description">
                        <i class="fas fa-exclamation-triangle text-warning"></i>
                        {{overallStats.totalYellowCards}} thẻ vàng + {{overallStats.totalRedCards}} thẻ đỏ
                      </div>
                    </td>
                    <td class="status-cell">
                      <span class="status-badge cards" 
                            [class.high]="(overallStats.totalYellowCards + overallStats.totalRedCards) > 20"
                            [class.medium]="(overallStats.totalYellowCards + overallStats.totalRedCards) > 10"
                            [class.low]="(overallStats.totalYellowCards + overallStats.totalRedCards) <= 10">
                        {{getCardsStatus()}}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="enhanced-filter-card">
            <div class="enhanced-filter-header">
              <div class="filter-title-section">
                <i class="fas fa-filter filter-icon"></i>
                <span>🎯 Bộ lọc & Sắp xếp</span>
              </div>
            </div>
            <div class="enhanced-filter-body">
              <div class="filter-row">
                <div class="filter-group">
                  <label class="enhanced-filter-label" for="viewModeSelect">
                    <i class="fas fa-eye label-icon"></i>
                    Xem theo
                  </label>
                  <div class="enhanced-select-wrapper">
                    <select id="viewModeSelect" class="enhanced-select" [(ngModel)]="viewMode" (change)="updateStats()">
                      <option value="all">🌍 Tất cả thời gian</option>
                      <option value="monthly">📅 Theo tháng</option>
                    </select>
                    <i class="fas fa-chevron-down enhanced-select-arrow"></i>
                  </div>
                </div>
                
                <div class="filter-group" *ngIf="viewMode === 'monthly'">
                  <label class="enhanced-filter-label" for="monthSelect">
                    <i class="fas fa-calendar label-icon"></i>
                    Chọn tháng
                  </label>
                  <div class="enhanced-select-wrapper">
                    <select id="monthSelect" class="enhanced-select" [(ngModel)]="selectedMonth" (change)="updateStats()">
                      <option value="">-- Chọn tháng --</option>
                      <option *ngFor="let month of availableMonths" [value]="month">{{formatMonth(month)}}</option>
                    </select>
                    <i class="fas fa-chevron-down enhanced-select-arrow"></i>
                  </div>
                </div>
                
                <div class="filter-group">
                  <label class="enhanced-filter-label" for="sortBySelect">
                    <i class="fas fa-sort label-icon"></i>
                    Sắp xếp theo
                  </label>
                  <div class="enhanced-select-wrapper">
                    <select id="sortBySelect" class="enhanced-select" [(ngModel)]="sortBy" (change)="updateStats()">
                      <option value="score">⭐ Điểm số</option>
                      <option value="goals">⚽ Bàn thắng</option>
                      <option value="assists">🎯 Kiến tạo</option>
                      <option value="yellowCards">🟨 Thẻ vàng</option>
                      <option value="redCards">🟥 Thẻ đỏ</option>
                      <option value="matches">🏟️ Số trận</option>
                    </select>
                    <i class="fas fa-chevron-down enhanced-select-arrow"></i>
                  </div>
                </div>
                
                <div class="filter-group status-group">
                  <div class="enhanced-filter-label">
                    <i class="fas fa-info-circle label-icon"></i>
                    Tình trạng
                  </div>
                  <div class="status-display">
                    <div class="status-badge-display">
                      <i class="fas fa-check-circle status-icon"></i>
                      <span>Đã cập nhật</span>
                    </div>
                  </div>
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
              <div class="table-badge" *ngIf="enhancedStats">
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
                🤖 Phân Tích Dự Đoán
              </h4>
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
                      <select multiple class="modern-multi-select xanh-select" id="xanh-players" [(ngModel)]="selectedXanhPlayers" (change)="runAIAnalysis()">
                        <option *ngFor="let player of allPlayers" [value]="player" class="player-option">
                          <span class="player-name">{{player}}</span>
                          <span *ngIf="getPlayerFromCore(player)" class="verified-badge"> ✓</span>
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="vs-section">
                    <div class="vs-icon">⚔️</div>
                    <div class="prediction-trigger">
                      <button class="btn btn-ai" (click)="runAIAnalysis()" [disabled]="isAnalyzing">
                        <i [class]="isAnalyzing ? 'fas fa-spinner fa-spin' : 'fas fa-brain'" class="me-2"></i>
                        {{isAnalyzing ? 'Đang phân tích...' : enhancedStats ? 'AI Nâng cao' : 'Phân tích AI'}}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="team-selector cam-team">
                    <h5 class="team-title">🟠 Đội Cam</h5>
                    <div class="player-selection">
                      <label class="form-label" for="cam-players">Chọn cầu thủ đội Cam:</label>
                      <select multiple class="modern-multi-select cam-select" id="cam-players" [(ngModel)]="selectedCamPlayers" (change)="runAIAnalysis()">
                        <option *ngFor="let player of allPlayers" [value]="player" class="player-option">
                          <span class="player-name">{{player}}</span>
                          <span *ngIf="getPlayerFromCore(player)" class="verified-badge"> ✓</span>
                        </option>
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

    /* Stats Overview Table */
    .stats-overview-table-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .stats-overview-header {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      padding: 1.5rem 2rem;
    }

    .stats-overview-body {
      padding: 0;
    }

    .stats-overview-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }

    .stats-overview-table thead th {
      background: #f8f9fa;
      padding: 1.25rem 1.5rem;
      font-weight: 700;
      color: #2c3e50;
      text-align: left;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e9ecef;
    }

    .metric-header {
      width: 25%;
    }

    .value-header {
      width: 20%;
    }

    .description-header {
      width: 35%;
    }

    .status-header {
      width: 20%;
    }

    .stats-overview-table tbody tr {
      transition: all 0.3s ease;
      border-bottom: 1px solid #f1f3f4;
    }

    .stats-overview-table tbody tr:hover {
      background: linear-gradient(135deg, #f8fcff 0%, #f0f8ff 100%);
      transform: translateX(5px);
    }

    .matches-row {
      border-left: 4px solid #11998e;
    }

    .goals-row {
      border-left: 4px solid #ff6b6b;
    }

    .assists-row {
      border-left: 4px solid #4fc3f7;
    }

    .cards-row {
      border-left: 4px solid #f093fb;
    }

    .stats-overview-table td {
      padding: 1.5rem;
      vertical-align: middle;
    }

    .metric-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .metric-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      font-weight: 600;
    }

    .metric-icon.matches {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .metric-icon.goals {
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
    }

    .metric-icon.assists {
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .metric-icon.cards {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .metric-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .metric-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #000000;
    }

    .value-cell.matches .metric-value {
      color: #000000 !important;
      text-shadow: 0 1px 2px rgba(255,255,255,0.5);
    }

    .value-cell.goals .metric-value {
      color: #000000 !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .value-cell.assists .metric-value {
      color: #000000 !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .value-cell.cards .metric-value {
      color: #000000 !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .metric-description {
      font-size: 0.9rem;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
      color: white;
    }

    .status-badge.matches {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .status-badge.matches.high {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .status-badge.matches.medium {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .status-badge.matches.low {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
    }

    .status-badge.goals {
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
    }

    .status-badge.assists {
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .status-badge.cards {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .status-badge.cards.high {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .status-badge.cards.medium {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .status-badge.cards.low {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    /* Enhanced Filter Card */
    .enhanced-filter-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.9) 100%);
      border-radius: 30px;
      box-shadow: 0 15px 45px rgba(0,0,0,0.18), 
                  inset 0 1px 0 rgba(255,255,255,0.8);
      overflow: hidden;
      border: 3px solid transparent;
      background-image: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.9) 100%), 
                        linear-gradient(135deg, #e8f4fd 0%, #bbdefb 100%);
      background-origin: border-box;
      background-clip: content-box, border-box;
      backdrop-filter: blur(20px);
      position: relative;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .enhanced-filter-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.02) 100%);
      pointer-events: none;
      z-index: 1;
    }

    .enhanced-filter-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.25), 
                  inset 0 1px 0 rgba(255,255,255,0.9);
    }

    .enhanced-filter-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1.75rem 2rem;
      color: white;
    }

    .filter-title-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.2rem;
      font-weight: 700;
    }

    .filter-icon {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .enhanced-filter-body {
      padding: 2.5rem;
      background: transparent;
      position: relative;
      z-index: 2;
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      align-items: stretch;
    }

    .filter-group {
      flex: 1;
      min-width: 220px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 1rem;
      padding: 0.5rem;
      transition: all 0.3s ease;
    }

    .filter-group:hover {
      transform: translateY(-2px);
    }

    .status-group {
      min-width: 180px;
      justify-content: center;
    }

    .enhanced-filter-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1rem;
      font-weight: 700;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.05) 100%);
      backdrop-filter: blur(5px);
      position: relative;
    }

    .enhanced-filter-label::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 2px;
      transition: all 0.3s ease;
    }

    .enhanced-filter-label:hover::before {
      height: 80%;
      box-shadow: 0 0 8px rgba(102, 126, 234, 0.5);
    }

    .label-icon {
      color: #667eea;
      font-size: 1rem;
      text-shadow: 0 1px 2px rgba(102, 126, 234, 0.2);
      transition: all 0.3s ease;
    }

    .enhanced-filter-label:hover .label-icon {
      color: #42a5f5;
      transform: scale(1.1);
      text-shadow: 0 2px 4px rgba(66, 165, 245, 0.3);
    }

    /* Enhanced Select Styling */
    .enhanced-select-wrapper {
      position: relative;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
    }

    .enhanced-select {
      width: 100%;
      height: 58px;
      min-height: 58px;
      padding: 1.25rem 3rem 1.25rem 1.5rem;
      border: 3px solid transparent;
      border-radius: 18px;
      background: linear-gradient(white, white) padding-box, 
                  linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) border-box;
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      appearance: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08), 
                  inset 0 1px 0 rgba(255,255,255,0.6);
      position: relative;
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
    }

    .enhanced-select::before {
      content: '';
      position: absolute;
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 18px;
      z-index: -1;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .enhanced-select:focus {
      outline: none;
      background: linear-gradient(white, white) padding-box, 
                  linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25), 
                  0 0 0 0.3rem rgba(102, 126, 234, 0.15),
                  inset 0 1px 0 rgba(255,255,255,0.8);
      transform: translateY(-2px) scale(1.02);
      color: #1a202c;
    }

    .enhanced-select:hover {
      background: linear-gradient(#f8fcff, #f0f8ff) padding-box, 
                  linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%) border-box;
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(66, 165, 245, 0.2), 
                  inset 0 1px 0 rgba(255,255,255,0.7);
    }

    .enhanced-select-arrow {
      position: absolute;
      right: 1.5rem;
      top: 50%;
      transform: translateY(-50%);
      color: #667eea;
      font-size: 1.1rem;
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
      z-index: 10;
    }

    .enhanced-select:focus + .enhanced-select-arrow {
      color: #667eea;
      transform: translateY(-50%) rotate(180deg) scale(1.1);
      text-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
    }

    .enhanced-select:hover + .enhanced-select-arrow {
      color: #42a5f5;
      transform: translateY(-50%) scale(1.05);
      text-shadow: 0 2px 4px rgba(66, 165, 245, 0.3);
    }

    /* Status Display */
    .status-display {
      display: flex;
      align-items: flex-end;
      height: 100%;
      margin-top: auto;
    }

    .status-badge-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%);
      color: #27ae60;
      padding: 1.25rem 1.5rem;
      border-radius: 15px;
      font-weight: 600;
      font-size: 1rem;
      border: 3px solid transparent;
      background-image: linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%), 
                        linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%);
      background-origin: border-box;
      background-clip: content-box, border-box;
      box-shadow: 0 4px 20px rgba(39, 174, 96, 0.15);
      height: 58px;
      min-height: 58px;
    }

    .status-icon {
      color: #27ae60;
      font-size: 1rem;
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
      color: #000000;
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

    /* Enhanced Filter Responsive */
    @media (max-width: 1200px) {
      .filter-row {
        gap: 1.25rem;
      }
      
      .filter-group {
        min-width: 180px;
      }
    }

    @media (max-width: 992px) {
      .enhanced-filter-body {
        padding: 2rem;
      }
      
      .filter-row {
        gap: 1.25rem;
        align-items: stretch;
      }
      
      .filter-group {
        min-width: 180px;
        flex: 1 1 48%;
        justify-content: flex-end;
      }
      
      .status-group {
        flex: 1 1 100%;
        justify-content: center;
      }
      
      .enhanced-select {
        height: 52px;
        min-height: 52px;
        padding: 1rem 2.5rem 1rem 1.25rem;
      }
      
      .status-badge-display {
        height: 52px;
        min-height: 52px;
        padding: 1rem 1.25rem;
        font-size: 0.95rem;
      }
      
      .enhanced-filter-label {
        font-size: 0.95rem;
      }
    }

    @media (max-width: 768px) {
      .stats-title {
        font-size: 1.8rem;
      }
      
      .enhanced-filter-card {
        border-radius: 20px;
        margin: 0 0.5rem;
      }
      
      .enhanced-filter-header {
        padding: 1.5rem;
      }
      
      .enhanced-filter-body {
        padding: 1.5rem;
      }
      
      .filter-row {
        flex-direction: column;
        gap: 1.5rem;
        align-items: stretch;
      }
      
      .filter-group {
        min-width: 100%;
        flex: 1;
        padding: 0.25rem;
        justify-content: flex-start;
      }
      
      .status-group {
        justify-content: flex-start;
      }
      
      .enhanced-select {
        padding: 1rem 2.5rem 1rem 1.25rem;
        font-size: 0.95rem;
        border-radius: 15px;
      }
      
      .enhanced-select-arrow {
        right: 1.25rem;
        font-size: 1rem;
      }
      
      .enhanced-filter-label {
        font-size: 0.9rem;
        padding: 0.5rem 0.75rem;
      }
      
      .filter-title-section {
        font-size: 1.1rem;
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
      
      .stats-overview-table td {
        padding: 1rem;
      }
      
      .metric-icon {
        width: 40px;
        height: 40px;
        font-size: 1.25rem;
      }
      
      .metric-value {
        font-size: 1.5rem;
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
      color: #000000;
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
      background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.9) 100%);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 
                  inset 0 1px 0 rgba(255,255,255,0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.3);
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .team-selector::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      z-index: 1;
    }

    .team-selector:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18), 
                  inset 0 1px 0 rgba(255,255,255,0.9);
    }

    .xanh-team::before {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .xanh-team {
      border-left: 6px solid #3498db;
      box-shadow: 0 8px 32px rgba(52, 152, 219, 0.2), 
                  inset 0 1px 0 rgba(255,255,255,0.8);
    }

    .cam-team::before {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .cam-team {
      border-left: 6px solid #f39c12;
      box-shadow: 0 8px 32px rgba(243, 156, 18, 0.2), 
                  inset 0 1px 0 rgba(255,255,255,0.8);
    }

    .team-title {
      color: #2c3e50;
      font-weight: 800;
      margin-bottom: 1.5rem;
      font-size: 1.3rem;
      text-shadow: 0 1px 3px rgba(44, 62, 80, 0.1);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .team-title::after {
      content: '';
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, rgba(44, 62, 80, 0.1) 50%, transparent 100%);
      margin-left: 1rem;
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
      color: #000000;
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
      color: #000000;
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

    /* Modern Multi-Select Styling */
    .modern-multi-select {
      width: 100%;
      min-height: 140px;
      padding: 1rem;
      border: 3px solid transparent;
      border-radius: 16px;
      background: linear-gradient(white, white) padding-box;
      font-size: 0.95rem;
      font-weight: 500;
      color: #2c3e50;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.08), 
                  inset 0 1px 0 rgba(255,255,255,0.6);
      backdrop-filter: blur(10px);
      cursor: pointer;
    }

    .modern-multi-select:focus {
      outline: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15), 
                  0 0 0 0.3rem rgba(102, 126, 234, 0.15),
                  inset 0 1px 0 rgba(255,255,255,0.8);
      transform: translateY(-2px);
    }

    .modern-multi-select:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.12), 
                  inset 0 1px 0 rgba(255,255,255,0.7);
    }

    .xanh-select {
      background: linear-gradient(white, white) padding-box, 
                  linear-gradient(135deg, rgba(52, 152, 219, 0.3) 0%, rgba(41, 128, 185, 0.2) 100%) border-box;
    }

    .xanh-select:focus {
      background: linear-gradient(white, white) padding-box, 
                  linear-gradient(135deg, #3498db 0%, #2980b9 100%) border-box;
    }

    .xanh-select:hover {
      background: linear-gradient(#f8fcff, #f0f8ff) padding-box, 
                  linear-gradient(135deg, rgba(52, 152, 219, 0.5) 0%, rgba(41, 128, 185, 0.3) 100%) border-box;
    }

    .cam-select {
      background: linear-gradient(white, white) padding-box, 
                  linear-gradient(135deg, rgba(243, 156, 18, 0.3) 0%, rgba(230, 126, 34, 0.2) 100%) border-box;
    }

    .cam-select:focus {
      background: linear-gradient(white, white) padding-box, 
                  linear-gradient(135deg, #f39c12 0%, #e67e22 100%) border-box;
    }

    .cam-select:hover {
      background: linear-gradient(#fffdf8, #fff8f0) padding-box, 
                  linear-gradient(135deg, rgba(243, 156, 18, 0.5) 0%, rgba(230, 126, 34, 0.3) 100%) border-box;
    }

    .player-option {
      padding: 0.75rem 1rem;
      margin: 0.25rem 0;
      border-radius: 8px;
      background: white;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .player-option:hover {
      background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
      color: #2c3e50;
    }

    .player-option:checked,
    .player-option:selected {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
    }

    .player-name {
      font-weight: 500;
      flex: 1;
    }

    .verified-badge {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
      font-size: 0.8rem;
      padding: 0.2rem 0.5rem;
      border-radius: 50%;
      font-weight: 600;
      margin-left: 0.5rem;
      box-shadow: 0 2px 4px rgba(39, 174, 96, 0.3);
      min-width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Player Selection Form Labels */
    .player-selection .form-label {
      font-size: 1rem;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .player-selection .form-label::before {
      content: '👥';
      font-size: 1.1rem;
    }

    /* VS Section Enhancement */
    .vs-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.03) 100%);
      border-radius: 20px;
      border: 2px dashed rgba(102, 126, 234, 0.2);
    }

    .vs-icon {
      font-size: 3rem;
      margin-bottom: 1.5rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .prediction-trigger {
      margin-top: 1rem;
    }

    /* Enhanced Button Styling */
    .btn-ai {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-weight: 700;
      padding: 1rem 2rem;
      border-radius: 25px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      position: relative;
      overflow: hidden;
    }

    .btn-ai::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.6s;
    }

    .btn-ai:hover::before {
      left: 100%;
    }

    .btn-ai:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
      color: white;
    }

    .btn-ai:disabled {
      opacity: 0.7;
      transform: none;
      cursor: not-allowed;
    }

    .btn-ai:disabled:hover {
      transform: none;
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
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
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .vs-section {
        margin: 1.5rem 0;
        padding: 1.5rem;
      }

      .vs-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }

      .modern-multi-select {
        min-height: 120px;
        padding: 0.75rem;
        font-size: 0.9rem;
      }

      .team-title {
        font-size: 1.1rem;
        margin-bottom: 1rem;
      }

      .btn-ai {
        padding: 0.875rem 1.5rem;
        font-size: 0.95rem;
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
export class StatsComponent implements OnInit, OnDestroy {
  // Core services
  private destroy$ = new Subject<void>();
  private readonly statisticsService = inject(StatisticsService);
  private readonly matchService = inject(MatchService);
  private readonly playerService = inject(PlayerService);
  private readonly dataStore = inject(DataStoreService);
  private readonly firebaseService = inject(FirebaseService);

  // Legacy data for backward compatibility
  history: HistoryEntry[] = [];
  availableMonths: string[] = [];
  monthlyStats: Record<string, MonthlyStats> = {};
  overallStats = {
    totalMatches: 0,
    totalGoals: 0,
    totalAssists: 0,
    totalYellowCards: 0,
    totalRedCards: 0
  };
  
  // Core data
  coreMatchesData: MatchInfo[] = [];
  corePlayersData: PlayerInfo[] = [];
  enhancedStats: { playerStats: import('../../core/services/statistics.service').PlayerStatistics[], fundAnalytics: import('../../core/services/statistics.service').FundAnalytics | null, matchAnalytics: import('../../core/services/statistics.service').MatchAnalytics[] } | null = null;
  isLoadingStats = false;
  
  // UI State
  viewMode: 'all' | 'monthly' = 'all';
  selectedMonth = '';
  sortBy: 'score' | 'goals' | 'assists' | 'yellowCards' | 'redCards' | 'matches' = 'score';

  // AI/ML Analysis Properties
  allPlayers: string[] = [];
  selectedXanhPlayers: string[] = [];
  selectedCamPlayers: string[] = [];
  isAnalyzing = false;
  aiAnalysisResults: AIAnalysisResult | null = null;

  ngOnInit() {
    this.loadCoreData();
    this.loadHistory(); // Keep for backward compatibility
    this.calculateStats();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCoreData() {
    try {
      this.isLoadingStats = true;
      
      // Subscribe to core services data
      this.matchService.matches$
        .pipe(takeUntil(this.destroy$))
        .subscribe(matches => {
          this.coreMatchesData = matches;
          this.generateEnhancedStatistics();
        });
      
      this.playerService.players$
        .pipe(takeUntil(this.destroy$))
        .subscribe(players => {
          this.corePlayersData = players;
          this.updatePlayerAnalytics();
        });
      
      // Subscribe to enhanced statistics
      this.statisticsService.getPlayerStatistics()
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoadingStats = false)
        )
        .subscribe(playerStats => {
          this.enhancedStats = {
            playerStats,
            fundAnalytics: null,
            matchAnalytics: []
          };
          console.log('\u2705 Enhanced statistics loaded from StatisticsService');
        });
      
    } catch (error) {
      console.error('Error loading core data:', error);
      this.isLoadingStats = false;
    }
  }

  private loadHistory() {
    try {
      // Use Firebase data like History component does
      console.log('🔄 Loading match history from Firebase (like History component)...');
      
      this.firebaseService.history$.pipe(take(1)).subscribe({
        next: (historyData) => {
          console.log('📊 Received Firebase history data:', historyData.length, 'matches');
          
          this.history = [...historyData]; // Create a copy
          this.history.sort((a, b) => {
            const dateA = new Date(a.date || '').getTime();
            const dateB = new Date(b.date || '').getTime();
            return dateB - dateA; // Newest first
          });
          
          console.log('📊 Stats component loaded Firebase history:', {
            parsedLength: this.history.length,
            firstMatch: this.history[0] || 'No matches',
            isArray: Array.isArray(this.history)
          });
          
          // Debug each match structure
          this.history.forEach((match, index) => {
            console.log(`🔍 Match ${index + 1} structure:`, {
              hasTeamA: !!match.teamA,
              teamAType: typeof match.teamA,
              teamAIsArray: Array.isArray(match.teamA),
              teamAValue: match.teamA,
              hasTeamB: !!match.teamB,
              teamBType: typeof match.teamB,
              teamBIsArray: Array.isArray(match.teamB),
              teamBValue: match.teamB,
              date: match.date,
              scorerA: match.scorerA,
              scorerB: match.scorerB,
              allKeys: Object.keys(match)
            });
          });
          
          this.initializeAI(); // Initialize AI data after loading history
          this.updateStats(); // Calculate statistics
        },
        error: (error) => {
          console.error('❌ Error loading matches from Firebase:', error);
          // Fallback to localStorage if Firebase fails
          this.loadHistoryFromLocalStorage();
        }
      });
    } catch (error) {
      console.error('❌ Error in loadHistory:', error);
      // Fallback to localStorage if Firebase fails
      this.loadHistoryFromLocalStorage();
    }
  }
  
  private loadHistoryFromLocalStorage() {
    try {
      console.log('🔄 Falling back to localStorage...');
      const matchHistoryData = localStorage.getItem('matchHistory') || '[]';
      this.history = JSON.parse(matchHistoryData);
      
      if (!Array.isArray(this.history)) {
        console.warn('⚠️ Match history is not an array, initializing as empty array');
        this.history = [];
      }
      
      console.log('📊 Loaded from localStorage:', this.history.length, 'matches');
      this.initializeAI();
      this.updateStats();
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
      this.history = [];
      this.initializeAI();
    }
  }

  private calculateStats() {
    console.log('📊 calculateStats() called with history length:', this.history.length);
    if (!this.history.length) {
      console.warn('⚠️ No match history data available for stats calculation');
      return;
    }

    // Group matches by month and calculate all stats
    const matchesByMonth: Record<string, MatchData[]> = {};
    const playerStatsAll: Record<string, PlayerStats> = {};

    // Ensure history is an array before iterating
    const history = Array.isArray(this.history) ? this.history : [];

    for (const match of history) {
      const date = new Date(match.date);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      
      if (!matchesByMonth[monthKey]) {
        matchesByMonth[monthKey] = [];
      }
      matchesByMonth[monthKey].push(match);

      // Process all players in the match for overall stats
      let teamA = match.teamA || [];
      let teamB = match.teamB || [];
      
      // Ensure they are arrays
      if (!Array.isArray(teamA)) teamA = [];
      if (!Array.isArray(teamB)) teamB = [];
      
      const allPlayers = [...teamA, ...teamB];
      
      // Track unique player participation
      const matchPlayerNames = new Set<string>();
      
      for (const player of allPlayers) {
        let playerName = '';
        
        if (typeof player === 'string') {
          // New format: player names are stored as strings
          playerName = (player as string).trim();
        } else if (player && typeof player === 'object' && 
                   'firstName' in player && typeof (player as { firstName?: string }).firstName === 'string') {
          // Old format: player objects with firstName/lastName
          const playerObj = player as { firstName: string; lastName?: string };
          playerName = `${playerObj.firstName} ${playerObj.lastName || ''}`.trim();
        }
        
        if (!playerName) continue;
        
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
        let teamA = match.teamA || [];
        let teamB = match.teamB || [];
        
        // Ensure they are arrays
        if (!Array.isArray(teamA)) teamA = [];
        if (!Array.isArray(teamB)) teamB = [];
        
        const allPlayers = [...teamA, ...teamB];
        const matchPlayerNames = new Set<string>();
        
        // Track players in this match
        for (const player of allPlayers) {
          let playerName = '';
          
          if (typeof player === 'string') {
            // New format: player names are stored as strings
            playerName = (player as string).trim();
          } else if (player && typeof player === 'object' && 
                     'firstName' in player && typeof (player as { firstName?: string }).firstName === 'string') {
            // Old format: player objects with firstName/lastName
            const playerObj = player as { firstName: string; lastName?: string };
            playerName = `${playerObj.firstName} ${playerObj.lastName || ''}`.trim();
          }
          
          if (!playerName) continue;
          
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

    // Debug: Check calculated stats
    console.log('📊 Calculated overallStats:', {
      totalMatches: this.overallStats.totalMatches,
      totalGoals: this.overallStats.totalGoals,
      totalAssists: this.overallStats.totalAssists,
      totalYellowCards: this.overallStats.totalYellowCards,
      totalRedCards: this.overallStats.totalRedCards,
      playersCount: allPlayersList.length,
      samplePlayer: allPlayersList[0] || 'No players'
    });
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
      if (this.sortBy === 'score') return this.calculatePlayerScore(b) - this.calculatePlayerScore(a);
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
    
      try {
        if (!this.history || !Array.isArray(this.history)) {
          console.warn('⚠️ History is not an array:', this.history);
          this.allPlayers = [];
          return;
        }

        console.log('🤖 InitializeAI processing', this.history.length, 'matches');

        this.history.forEach((match, matchIndex) => {
          if (!match) return;

          // Handle cases where teamA/teamB might be strings or non-arrays
          let teamA = match.teamA || [];
          let teamB = match.teamB || [];

          console.log(`🔍 Match ${matchIndex + 1} - Before processing:`, {
            teamA: teamA,
            teamAType: typeof teamA,
            teamAIsArray: Array.isArray(teamA),
            teamB: teamB,
            teamBType: typeof teamB,
            teamBIsArray: Array.isArray(teamB)
          });

          // Convert to array if it's not already
          if (!Array.isArray(teamA)) {
            console.warn('⚠️ teamA is not an array:', teamA);
            teamA = [];
          }
          if (!Array.isArray(teamB)) {
            console.warn('⚠️ teamB is not an array:', teamB);
            teamB = [];
          }

          // Handle both old format (objects with firstName/lastName) and new format (strings)
          [...teamA, ...teamB].forEach((player: string | { firstName?: string; lastName?: string } | unknown) => {
            let playerName = '';
            
            if (typeof player === 'string') {
              // New format: player names are stored as strings
              playerName = player.trim();
            } else if (player && typeof player === 'object' && 
                       'firstName' in player && typeof (player as { firstName?: string }).firstName === 'string') {
              // Old format: player objects with firstName/lastName
              const playerObj = player as { firstName: string; lastName?: string };
              playerName = `${playerObj.firstName} ${playerObj.lastName || ''}`.trim();
            }
            
            if (playerName) {
              playerSet.add(playerName);
            }
          });
        });
      } catch (error) {
        console.error('❌ Error in initializeAI:', error);
        console.log('History data:', this.history);
      }    this.allPlayers = Array.from(playerSet).sort();
  }

  // This method was replaced by the enhanced version below

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
      const teamAPlayers = (match.teamA || []).map(p => {
        if (typeof p === 'string') return p.trim();
        return (p && typeof p === 'object' && 'firstName' in p) ? `${(p as Player).firstName} ${(p as Player).lastName || ''}`.trim() : '';
      });
      const teamBPlayers = (match.teamB || []).map(p => {
        if (typeof p === 'string') return p.trim();
        return (p && typeof p === 'object' && 'firstName' in p) ? `${(p as Player).firstName} ${(p as Player).lastName || ''}`.trim() : '';
      });
      
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

    if (!players || !Array.isArray(players)) {
      console.warn('⚠️ Players parameter is not an array in calculateTeamMetrics:', players);
      return {
        avgGoalsPerMatch: 0,
        avgAssistsPerMatch: 0,
        disciplineIndex: 0,
        totalMatches: 0,
        attackStrength: 0,
        consistency: 0
      };
    }

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
      const teamAHasXanh = (match.teamA || []).some(p => {
        const playerName = typeof p === 'string' ? p.trim() : 
          (p && typeof p === 'object' && 'firstName' in p) ? `${(p as Player).firstName} ${(p as Player).lastName || ''}`.trim() : '';
        return this.selectedXanhPlayers.includes(playerName);
      });
      const teamAHasCam = (match.teamA || []).some(p => {
        const playerName = typeof p === 'string' ? p.trim() : 
          (p && typeof p === 'object' && 'firstName' in p) ? `${(p as Player).firstName} ${(p as Player).lastName || ''}`.trim() : '';
        return this.selectedCamPlayers.includes(playerName);
      });

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
    const teamAPlayers = (match.teamA || []).map(p => {
      if (typeof p === 'string') return p.trim();
      return (p && typeof p === 'object' && 'firstName' in p) ? `${(p as Player).firstName} ${(p as Player).lastName || ''}`.trim() : '';
    });
    const teamBPlayers = (match.teamB || []).map(p => {
      if (typeof p === 'string') return p.trim();
      return (p && typeof p === 'object' && 'firstName' in p) ? `${(p as Player).firstName} ${(p as Player).lastName || ''}`.trim() : '';
    });
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

  // Enhanced Statistics Methods
  private async generateEnhancedStatistics(): Promise<void> {
    try {
      if (this.coreMatchesData.length === 0) return;
      
      // Generate comprehensive analytics using StatisticsService
      const playerStats = await this.statisticsService.getPlayerStatistics().toPromise();
      const fundAnalytics = await this.statisticsService.getFundAnalytics().toPromise();
      
      if (playerStats) {
        // Update overall stats with enhanced data
        this.overallStats = {
          totalMatches: this.coreMatchesData.length,
          totalGoals: playerStats.reduce((sum, p) => sum + p.performance.goalsScored, 0),
          totalAssists: playerStats.reduce((sum, p) => sum + p.performance.assists, 0),
          totalYellowCards: playerStats.reduce((sum, p) => sum + p.performance.yellowCards, 0),
          totalRedCards: playerStats.reduce((sum, p) => sum + p.performance.redCards, 0)
        };
        
        this.enhancedStats = {
          playerStats,
          fundAnalytics,
          matchAnalytics: []
        };
        
        console.log('\u2705 Enhanced statistics generated successfully');
      }
    } catch (error) {
      console.warn('Enhanced statistics generation failed, using fallback:', error);
    }
  }

  private updatePlayerAnalytics(): void {
    try {
      // Update AI player list with core data
      this.allPlayers = this.corePlayersData
        .filter(player => player.isRegistered)
        .map(player => `${player.firstName} ${player.lastName || ''}`.trim())
        .sort();
      
      console.log('\u2705 Player analytics updated with', this.allPlayers.length, 'players');
    } catch (error) {
      console.warn('Player analytics update failed:', error);
    }
  }

  // Enhanced AI Analysis with StatisticsService
  async runEnhancedAIAnalysis(): Promise<void> {
    if (!this.selectedXanhPlayers?.length || !this.selectedCamPlayers?.length) {
      return;
    }

    this.isAnalyzing = true;
    
    try {
      // Get player IDs for selected players
      const xanhPlayerIds = this.getPlayerIdsFromNames(this.selectedXanhPlayers || []);
      const camPlayerIds = this.getPlayerIdsFromNames(this.selectedCamPlayers || []);
      
      // Use PlayerService for team balance analysis
      const allPlayerIds = [...(xanhPlayerIds || []), ...(camPlayerIds || [])];
      const teamBalance = await this.playerService.getTeamBalanceRecommendations(allPlayerIds).toPromise();
      
      if (teamBalance) {
        // Convert to legacy format for display
        this.aiAnalysisResults = this.convertTeamBalanceToAIResult(teamBalance);
      } else {
        // Fallback to original AI analysis
        await this.runAIAnalysis();
      }
    } catch (error) {
      console.warn('Enhanced AI analysis failed, using fallback:', error);
      await this.runAIAnalysis();
    } finally {
      this.isAnalyzing = false;
    }
  }

  private getPlayerIdsFromNames(playerNames: string[]): string[] {
    if (!playerNames || !Array.isArray(playerNames)) {
      return [];
    }
    return playerNames.map(name => {
      const player = (this.corePlayersData || []).find(p => 
        `${p.firstName} ${p.lastName || ''}`.trim() === name
      );
      return player?.id || '';
    }).filter(Boolean);
  }

  private convertTeamBalanceToAIResult(teamBalance: { balanceScore: number; recommendations: string[] }): AIAnalysisResult {
    // Convert PlayerService TeamBalance to legacy AIAnalysisResult format
    const balanceScore = teamBalance.balanceScore || 50;
    const xanhAdvantage = balanceScore > 50;
    
    return {
      xanhWinProb: Math.round(xanhAdvantage ? Math.min(85, 50 + (balanceScore - 50) * 0.7) : Math.max(15, 50 - (50 - balanceScore) * 0.7)),
      camWinProb: Math.round(xanhAdvantage ? Math.max(15, 50 - (balanceScore - 50) * 0.7) : Math.min(85, 50 + (50 - balanceScore) * 0.7)),
      confidence: Math.min(90, 65 + (teamBalance.recommendations?.length || 0) * 5),
      avgGoalsDiff: '1.2',
      matchesAnalyzed: this.coreMatchesData.length,
      keyFactors: (teamBalance.recommendations || []).slice(0, 4).map((rec, index: number) => ({
        name: rec || `Y\u1ebfu t\u1ed1 ${index + 1}`,
        impact: (balanceScore - 50) / 5 // Convert balance to impact percentage
      })),
      historicalStats: {
        xanhWins: Math.floor(this.coreMatchesData.length * 0.4),
        camWins: Math.floor(this.coreMatchesData.length * 0.35),
        draws: Math.floor(this.coreMatchesData.length * 0.25),
        totalMatches: this.coreMatchesData.length
      }
    };
  }

  // Main runAIAnalysis method - use enhanced version first
  async runAIAnalysis(): Promise<void> {
    // Try enhanced version first, fallback to original if needed
    if (this.corePlayersData?.length > 0) {
      await this.runEnhancedAIAnalysis();
    } else {
      await this.runOriginalAIAnalysis();
    }
  }

  private async runOriginalAIAnalysis(): Promise<void> {
    if (!this.selectedXanhPlayers?.length || !this.selectedCamPlayers?.length) {
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

  // Helper methods for status badges
  getMatchesStatus(): string {
    const total = this.overallStats.totalMatches;
    if (total > 20) return 'Nhiều kinh nghiệm';
    if (total > 10) return 'Có kinh nghiệm';
    return 'Mới bắt đầu';
  }

  getCardsStatus(): string {
    const totalCards = this.overallStats.totalYellowCards + this.overallStats.totalRedCards;
    if (totalCards > 20) return 'Cần cải thiện';
    if (totalCards > 10) return 'Bình thường';
    return 'Kỷ luật tốt';
  }

  getPlayerFromCore(playerName: string): PlayerInfo | undefined {
    return this.corePlayersData.find(player => 
      `${player.firstName} ${player.lastName || ''}`.trim() === playerName
    );
  }
}
