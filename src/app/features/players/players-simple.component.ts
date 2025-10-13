import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Player } from './player-utils';
import { PerformanceService } from '../../services/performance.service';
import { AssetOptimizationService } from '../../services/asset-optimization.service';
import { PlayerService } from '../../core/services/player.service';
import { PlayerInfo, PlayerStatus } from '../../core/models/player.model';

@Component({
  selector: 'app-players-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="enhanced-players-container">      
      <!-- Enhanced Header Section -->
      <div class="modern-header">
        <div class="header-content">
          <div class="title-section">
            <div class="title-wrapper">
              <div class="icon-wrapper">
                <i class="fas fa-users"></i>
              </div>
              <div class="title-text">
                <h1>Quản lý cầu thủ</h1>
              </div>
            </div>
          </div>
          
          <!-- Enhanced Quick Stats in Header -->
          <div class="header-stats" *ngIf="allPlayers.length > 0">
            <div class="quick-stat primary">
              <div class="stat-icon">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ allPlayers.length }}</span>
                <span class="stat-label">Tổng cầu thủ</span>
              </div>
            </div>
            
            <div class="quick-stat secondary">
              <div class="stat-icon">
                <i class="fas fa-chart-pie"></i>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ availablePositions.length }}</span>
                <span class="stat-label">Vị trí</span>
                <div class="mini-chart">
                  <div *ngFor="let pos of availablePositions; trackBy: trackByPositionName" 
                       class="position-bar"
                       [style.width.%]="getPositionPercentage(pos)"
                       [title]="pos + ': ' + getPlayersByPosition(pos).length + ' cầu thủ'">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="quick-stat tertiary">
              <div class="stat-icon">
                <i class="fas fa-birthday-cake"></i>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ getAverageAge() }}</span>
                <span class="stat-label">Tuổi TB</span>
                <div class="age-distribution">
                  <span class="age-group young" [title]="'Dưới 23 tuổi: ' + getPlayersByAgeGroup('young').length">
                    {{ getPlayersByAgeGroup('young').length }}
                  </span>
                  <span class="age-group prime" [title]="'23-30 tuổi: ' + getPlayersByAgeGroup('prime').length">
                    {{ getPlayersByAgeGroup('prime').length }}
                  </span>
                  <span class="age-group veteran" [title]="'Trên 30 tuổi: ' + getPlayersByAgeGroup('veteran').length">
                    {{ getPlayersByAgeGroup('veteran').length }}
                  </span>
                </div>
              </div>
            </div>

            <div class="quick-stat quaternary">
              <div class="stat-icon">
                <i class="fas fa-star"></i>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ getAverageRating() }}</span>
                <span class="stat-label">Xếp hạng TB</span>
                <div class="rating-distribution">
                  <div class="rating-bar excellent" 
                       [style.height.%]="getRatingDistribution().excellent"
                       [title]="'Xuất sắc (85+): ' + getPlayersByRating('excellent').length"></div>
                  <div class="rating-bar good" 
                       [style.height.%]="getRatingDistribution().good"
                       [title]="'Tốt (75-84): ' + getPlayersByRating('good').length"></div>
                  <div class="rating-bar average" 
                       [style.height.%]="getRatingDistribution().average"
                       [title]="'Trung bình (65-74): ' + getPlayersByRating('average').length"></div>
                  <div class="rating-bar poor" 
                       [style.height.%]="getRatingDistribution().poor"
                       [title]="'Cần cải thiện (<65): ' + getPlayersByRating('poor').length"></div>
                </div>
              </div>
            </div>

            <div class="quick-stat quinary">
              <div class="stat-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ getTeamStrength() }}%</span>
                <span class="stat-label">Sức mạnh đội</span>
                <div class="strength-meter">
                  <div class="strength-fill" [style.width.%]="getTeamStrength()"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Global Search Bar -->
        <div class="global-search">
          <div class="search-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input 
              type="text" 
              [value]="searchTerm" 
              (input)="onSearchInput($any($event.target).value)"
              placeholder="Tìm kiếm cầu thủ theo tên, vị trí, hoặc thông tin..."
              class="global-search-input">
            <button *ngIf="searchTerm" (click)="clearSearch()" class="clear-search">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Enhanced Control Panel -->
      <div class="modern-control-panel">
        <div class="controls-section">
          <h3 class="section-title">
            <i class="fas fa-filter"></i>
            Bộ lọc & Sắp xếp
          </h3>
          
          <div class="filter-cards">
            <!-- Position Filter Card with Multi-Select -->
            <div class="filter-card">
              <div class="filter-header">
                <i class="fas fa-map-marker-alt"></i>
                <span>Vị trí</span>
                <button 
                  (click)="clearPositionFilter()" 
                  *ngIf="selectedPositions.length > 0"
                  class="clear-filter-btn">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="position-multi-select">
                <div class="selected-positions" *ngIf="selectedPositions.length > 0">
                  <span *ngFor="let pos of selectedPositions; trackBy: trackByPositionName" class="position-tag">
                    {{ pos }}
                    <button 
                      class="remove-position-btn"
                      (click)="removePosition(pos)"
                      (keydown.enter)="removePosition(pos)"
                      (keydown.space)="removePosition(pos)"
                      [attr.aria-label]="'Remove ' + pos"
                      tabindex="0">
                      <i class="fas fa-times"></i>
                    </button>
                  </span>
                </div>
                <select 
                  (change)="addPosition($event)"
                  class="modern-select">
                  <option value="">Chọn vị trí...</option>
                  <option *ngFor="let position of getAvailablePositions(); trackBy: trackByPositionName" [value]="position">
                    {{ position }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Sort Options Card -->
            <div class="filter-card">
              <div class="filter-header">
                <i class="fas fa-sort-amount-down"></i>
                <span>Sắp xếp</span>
              </div>
              <select 
                [(ngModel)]="sortBy" 
                (change)="applyFilters()"
                class="modern-select">
                <option value="firstName">Tên (A-Z)</option>
                <option value="position">Vị trí</option>
                <option value="age">Tuổi</option>
                <option value="height">Chiều cao</option>
                <option value="weight">Cân nặng</option>
              </select>
            </div>

            <!-- View Mode Card -->
            <div class="filter-card">
              <div class="filter-header">
                <i class="fas fa-eye"></i>
                <span>Hiển thị</span>
              </div>
              <div class="view-toggle" role="radiogroup" aria-label="View mode selection">
                <button 
                  (click)="viewMode = 'grid'" 
                  [class.active]="viewMode === 'grid'"
                  class="toggle-btn">
                  <i class="fas fa-th"></i>
                  <span>Lưới</span>
                </button>
                <button 
                  (click)="viewMode = 'table'" 
                  [class.active]="viewMode === 'table'"
                  class="toggle-btn">
                  <i class="fas fa-table"></i>
                  <span>Bảng</span>
                </button>
                <button 
                  (click)="viewMode = 'list'" 
                  [class.active]="viewMode === 'list'"
                  class="toggle-btn">
                  <i class="fas fa-list"></i>
                  <span>Danh sách</span>
                </button>
              </div>
            </div>

          </div>

        <!-- Data Visualization Section -->
        <div class="visualization-section">
          <h3 class="section-title">
            <i class="fas fa-chart-bar"></i>
            Phân tích & Biểu đồ
            <button 
              (click)="toggleVisualization()" 
              class="visualization-toggle"
              [class.active]="showVisualization">
              <i class="fas" [class.fa-chevron-up]="showVisualization" [class.fa-chevron-down]="!showVisualization"></i>
            </button>
          </h3>
          
          <div class="visualization-panel" [class.expanded]="showVisualization">
            <div class="charts-grid">
              <!-- Position Distribution Chart -->
              <div class="chart-container">
                <h5 class="chart-title">
                  <i class="fas fa-users"></i>
                  Phân bổ vị trí
                </h5>
                <div class="position-chart">
                  <div *ngFor="let position of availablePositions; trackBy: trackByPositionName" class="position-slice">
                    <div class="position-bar-horizontal" 
                         [style.width.%]="getPositionPercentage(position)"
                         [class]="'bar-' + getPositionColor(position)">
                    </div>
                    <div class="position-info">
                      <span class="position-name">{{ position }}</span>
                      <span class="position-count">{{ getPlayersByPosition(position).length }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Age Distribution Chart -->
              <div class="chart-container">
                <h5 class="chart-title">
                  <i class="fas fa-birthday-cake"></i>
                  Phân bổ độ tuổi
                </h5>
                <div class="age-chart">
                  <div class="age-histogram">
                    <div *ngFor="let ageGroup of getAgeHistogram(); trackBy: trackByAgeGroup" 
                         class="age-histogram-bar"
                         [style.height.%]="ageGroup.percentage"
                         [title]="ageGroup.range + ': ' + ageGroup.count + ' cầu thủ'">
                      <div class="age-bar-fill" [class]="ageGroup.class"></div>
                      <span class="age-count">{{ ageGroup.count }}</span>
                    </div>
                  </div>
                  <div class="age-labels">
                    <span *ngFor="let ageGroup of getAgeHistogram(); trackBy: trackByAgeGroup">{{ ageGroup.label }}</span>
                  </div>
                </div>
              </div>

              <!-- Rating Distribution Chart -->
              <div class="chart-container">
                <h5 class="chart-title">
                  <i class="fas fa-star"></i>
                  Phân bổ xếp hạng
                </h5>
                <div class="rating-donut-chart">
                  <div class="donut-center">
                    <div class="avg-rating">{{ getAverageRating() }}</div>
                    <div class="avg-label">Điểm TB</div>
                  </div>
                  <div class="donut-segments">
                    <div class="segment excellent" 
                         [style.--percentage]="getRatingDistribution().excellent + '%'"
                         [title]="'Xuất sắc: ' + getPlayersByRating('excellent').length + ' cầu thủ'">
                    </div>
                    <div class="segment good" 
                         [style.--percentage]="getRatingDistribution().good + '%'"
                         [title]="'Tốt: ' + getPlayersByRating('good').length + ' cầu thủ'">
                    </div>
                    <div class="segment average" 
                         [style.--percentage]="getRatingDistribution().average + '%'"
                         [title]="'Trung bình: ' + getPlayersByRating('average').length + ' cầu thủ'">
                    </div>
                    <div class="segment poor" 
                         [style.--percentage]="getRatingDistribution().poor + '%'"
                         [title]="'Cần cải thiện: ' + getPlayersByRating('poor').length + ' cầu thủ'">
                    </div>
                  </div>
                  <div class="donut-legend">
                    <div class="legend-item excellent">
                      <div class="legend-color"></div>
                      <span>Xuất sắc ({{ getPlayersByRating('excellent').length }})</span>
                    </div>
                    <div class="legend-item good">
                      <div class="legend-color"></div>
                      <span>Tốt ({{ getPlayersByRating('good').length }})</span>
                    </div>
                    <div class="legend-item average">
                      <div class="legend-color"></div>
                      <span>Trung bình ({{ getPlayersByRating('average').length }})</span>
                    </div>
                    <div class="legend-item poor">
                      <div class="legend-color"></div>
                      <span>Cần cải thiện ({{ getPlayersByRating('poor').length }})</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Physical Stats Chart -->
              <div class="chart-container">
                <h5 class="chart-title">
                  <i class="fas fa-dumbbell"></i>
                  Thống kê thể chất
                </h5>
                <div class="physical-stats-chart">
                  <div class="scatter-plot">
                    <div *ngFor="let player of allPlayers; trackBy: trackByPlayerId" 
                         class="scatter-point"
                         [style.left.%]="getHeightPercentile(player.height)"
                         [style.bottom.%]="getWeightPercentile(player.weight)"
                         [title]="getPlayerFullName(player) + ' - ' + player.height + 'cm, ' + player.weight + 'kg'"
                         [class]="'point-' + getPositionColor(player.position)">
                    </div>
                  </div>
                  <div class="axis-labels">
                    <div class="y-axis-label">Cân nặng (kg)</div>
                    <div class="x-axis-label">Chiều cao (cm)</div>
                  </div>
                </div>
              </div>

              <!-- Team Composition Radar -->
              <div class="chart-container full-width">
                <h5 class="chart-title">
                  <i class="fas fa-shield-alt"></i>
                  Cân bằng đội hình
                </h5>
                <div class="team-balance-radar">
                  <div class="radar-chart">
                    <div class="radar-axis attack">
                      <div class="radar-value" [style.height.%]="getPositionStrength('attack')"></div>
                      <span class="radar-label">Tấn công</span>
                    </div>
                    <div class="radar-axis midfield">
                      <div class="radar-value" [style.height.%]="getPositionStrength('midfield')"></div>
                      <span class="radar-label">Tiền vệ</span>
                    </div>
                    <div class="radar-axis defense">
                      <div class="radar-value" [style.height.%]="getPositionStrength('defense')"></div>
                      <span class="radar-label">Phòng thủ</span>
                    </div>
                    <div class="radar-axis goalkeeper">
                      <div class="radar-value" [style.height.%]="getPositionStrength('goalkeeper')"></div>
                      <span class="radar-label">Thủ môn</span>
                    </div>
                  </div>
                  <div class="balance-summary">
                    <div class="balance-score">
                      <span class="score">{{ getTeamStrength() }}%</span>
                      <span class="score-label">Cân bằng tổng thể</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Section -->
        <div class="actions-section">
          <h3 class="section-title">
            <i class="fas fa-tools"></i>
            Thao tác
          </h3>
          
          <div class="action-cards">
            <button 
              (click)="openCreatePlayerModal()" 
              class="action-card add-player">
              <div class="action-icon">
                <i class="fas fa-user-plus"></i>
              </div>
              <div class="action-content">
                <h4>Thêm cầu thủ</h4>
                <p>Tạo hồ sơ cầu thủ mới</p>
              </div>
            </button>

            <button 
              (click)="testLoadPlayers()" 
              class="action-card reload-data">
              <div class="action-icon">
                <i class="fas fa-sync-alt"></i>
              </div>
              <div class="action-content">
                <h4>Tải lại</h4>
                <p>Cập nhật dữ liệu</p>
              </div>
            </button>

            <button 
              (click)="exportPlayerStats()" 
              class="action-card export-data">
              <div class="action-icon">
                <i class="fas fa-file-export"></i>
              </div>
              <div class="action-content">
                <h4>Xuất dữ liệu</h4>
                <p>Tải thống kê cầu thủ</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading players data...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h4>Error Loading Data</h4>
        <p>{{ errorMessage }}</p>
        <button (click)="testLoadPlayers()" class="retry-btn">Try Again</button>
      </div>

      <!-- Players Display -->
      <div *ngIf="!isLoading && !errorMessage && allPlayers.length > 0" class="players-section">
        <div class="section-header">
        <div class="section-header">
          <h3>
            <i class="fas fa-users me-2"></i>
            Players ({{ filteredPlayers.length }} of {{ allPlayers.length }}) 
            <small *ngIf="allPlayers.length !== filteredPlayers.length" style="color: #6c757d;">
              - {{ allPlayers.length - filteredPlayers.length }} hidden by filters
            </small>
          </h3>
        </div>
        </div>

        <!-- Grid View -->
        <div *ngIf="viewMode === 'grid'" class="players-grid">
          <div *ngFor="let player of paginatedPlayers; let i = index; trackBy: trackByPlayerId" 
               class="player-card-enhanced"
               [class.selected]="isPlayerSelected(getPlayerId(player))">
            <div class="bulk-select-overlay" *ngIf="bulkSelectMode">
              <input 
                type="checkbox"
                [checked]="isPlayerSelected(getPlayerId(player))"
                (change)="togglePlayerSelection(getPlayerId(player))"
                class="bulk-select-checkbox">
            </div>
            <div class="player-header">
              <div class="player-avatar-container">
                <img [src]="player.avatar" 
                     [alt]="player.firstName"
                     class="player-avatar-enhanced"
                     loading="lazy"
                     (error)="onAvatarError($event)">
                <div class="player-rating">
                  {{ getPlayerRating(player) }}
                </div>
              </div>
              <div class="player-basic-info">
                <h4 class="player-name-enhanced">{{ player.firstName }} {{ player.lastName }}</h4>
                <div class="position-container">
                  <span class="position-badge">{{ player.position }}</span>
                  <div class="skill-badges">
                    <span *ngFor="let skill of getPlayerSkills(player)" 
                          class="skill-badge" 
                          [class]="'skill-' + skill.toLowerCase()">
                      {{ skill }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="player-stats" *ngIf="player.height || player.weight || player.DOB">
              <div class="stat-item" *ngIf="player.height">
                <i class="fas fa-arrows-alt-v"></i>
                <span>{{ player.height }}cm</span>
                <div class="stat-indicator" [class]="getHeightIndicator(player.height)"></div>
              </div>
              <div class="stat-item" *ngIf="player.weight">
                <i class="fas fa-weight"></i>
                <span>{{ player.weight }}kg</span>
                <div class="stat-indicator" [class]="getWeightIndicator(player.weight)"></div>
              </div>
              <div class="stat-item" *ngIf="player.DOB">
                <i class="fas fa-calendar-alt"></i>
                <span>{{ calculateAge(player.DOB) }} tuổi</span>
                <div class="age-category">{{ getAgeCategory(calculateAge(player.DOB)) }}</div>
              </div>
              <div class="stat-item performance-stat">
                <i class="fas fa-chart-line"></i>
                <span>Hiệu suất</span>
                <div class="performance-bar">
                  <div class="performance-fill" [style.width.%]="getPerformanceScore(player)"></div>
                </div>
              </div>
            </div>

            <div class="player-actions">
              <button (click)="viewPlayerDetails(player)" class="detail-btn">
                <i class="fas fa-info-circle"></i> Details
              </button>
              <button 
                (click)="openEditPlayerModal(player); $event.stopPropagation()"
                class="action-btn edit-btn"
                title="Chỉnh sửa cầu thủ">
                <i class="fas fa-edit"></i>
              </button>
              <button 
                (click)="confirmDeletePlayer(player); $event.stopPropagation()"
                class="action-btn delete-btn"
                title="Xóa cầu thủ">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div *ngIf="viewMode === 'table'" class="players-table-container">
          <div class="table-wrapper">
            <table class="players-table">
              <thead>
                <tr>
                  <th *ngIf="bulkSelectMode" class="select-col">
                    <input 
                      type="checkbox"
                      [checked]="areAllVisibleSelected()"
                      [indeterminate]="isSomeVisibleSelected()"
                      (change)="toggleAllVisible()"
                      class="bulk-select-all">
                  </th>
                  <th class="avatar-col">Ảnh</th>
                  <th class="name-col">Tên cầu thủ</th>
                  <th class="position-col">Vị trí</th>
                  <th class="age-col">Tuổi</th>
                  <th class="height-col">Chiều cao</th>
                  <th class="weight-col">Cân nặng</th>
                  <th class="actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let player of paginatedPlayers; let i = index; trackBy: trackByPlayerId" 
                    class="player-row"
                    [class.selected]="isPlayerSelected(getPlayerId(player))">
                  <td *ngIf="bulkSelectMode" class="select-cell">
                    <input 
                      type="checkbox"
                      [checked]="isPlayerSelected(getPlayerId(player))"
                      (change)="togglePlayerSelection(getPlayerId(player))"
                      class="player-checkbox">
                  </td>
                  <td class="avatar-cell">
                    <img [src]="player.avatar" 
                         [alt]="player.firstName"
                         class="table-avatar"
                         loading="lazy"
                         (error)="onAvatarError($event)">
                  </td>
                  <td class="name-cell">
                    <span class="player-full-name">{{ player.firstName }} {{ player.lastName }}</span>
                  </td>
                  <td class="position-cell">
                    <span class="position-badge-small">{{ player.position }}</span>
                  </td>
                  <td class="age-cell">
                    <span *ngIf="player.DOB">{{ calculateAge(player.DOB) }}</span>
                    <span *ngIf="!player.DOB">-</span>
                  </td>
                  <td class="height-cell">
                    <span *ngIf="player.height">{{ player.height }}cm</span>
                    <span *ngIf="!player.height">-</span>
                  </td>
                  <td class="weight-cell">
                    <span *ngIf="player.weight">{{ player.weight }}kg</span>
                    <span *ngIf="!player.weight">-</span>
                  </td>
                  <td class="actions-cell">
                    <div class="table-actions">
                      <button 
                        (click)="viewPlayerDetails(player)"
                        class="action-btn detail-btn"
                        title="Chi tiết">
                        <i class="fas fa-info-circle"></i>
                      </button>
                      <button 
                        (click)="openEditPlayerModal(player)"
                        class="action-btn edit-btn"
                        title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button 
                        (click)="deletePlayer(getPlayerId(player))"
                        class="action-btn delete-btn"
                        title="Xóa">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- List View -->
        <div *ngIf="viewMode === 'list'" class="players-list" [class.bulk-mode]="bulkSelectMode">
          <div class="list-header">
            <div *ngIf="bulkSelectMode">Chọn</div>
            <div>Tên cầu thủ</div>
            <div>Vị trí</div>
            <div>Tuổi</div>
            <div>Chiều cao</div>
            <div>Cân nặng</div>
            <div>Thao tác</div>
          </div>
          <div *ngFor="let player of paginatedPlayers; let i = index; trackBy: trackByPlayerId" 
               class="list-item"
               [class.selected]="isPlayerSelected(getPlayerId(player))">
            <div class="col-select" *ngIf="bulkSelectMode">
              <input 
                type="checkbox"
                [checked]="isPlayerSelected(getPlayerId(player))"
                (change)="togglePlayerSelection(getPlayerId(player))"
                class="bulk-select-checkbox">
            </div>
            
            <div class="list-name">
              <img [src]="player.avatar" 
                   [alt]="player.firstName" 
                   class="list-avatar" 
                   loading="lazy"
                   (error)="onAvatarError($event)">
              <div>
                <div class="player-name">{{ player.firstName }} {{ player.lastName }}</div>
              </div>
            </div>
            
            <div>
              <span class="position-badge-small">{{ player.position }}</span>
            </div>
            
            <div>
              <span *ngIf="calculateAge(player.DOB); else noAge">{{ calculateAge(player.DOB) }}</span>
              <ng-template #noAge>-</ng-template>
            </div>
            
            <div>
              <span *ngIf="player.height; else noHeight">{{ player.height }}cm</span>
              <ng-template #noHeight>-</ng-template>
            </div>
            
            <div>
              <span *ngIf="player.weight; else noWeight">{{ player.weight }}kg</span>
              <ng-template #noWeight>-</ng-template>
            </div>
            
            <div class="list-actions">
              <button (click)="viewPlayerDetails(player)" class="action-btn detail-btn">
                <i class="fas fa-eye"></i>
                Xem
              </button>
              <button (click)="openEditPlayerModal(player)" class="action-btn edit-btn">
                <i class="fas fa-edit"></i>
                Sửa
              </button>
              <button (click)="confirmDeletePlayer(player)" class="action-btn delete-btn">
                <i class="fas fa-trash"></i>
                Xóa
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div *ngIf="totalPages > 1" class="pagination-section">
          <div class="pagination-info">
            <ng-container *ngIf="getPaginationInfo() as pagination">
              <span class="text-muted">
                Hiển thị {{ pagination.start }}-{{ pagination.end }} 
                trong tổng số {{ pagination.total }} cầu thủ
              </span>
            </ng-container>
          </div>
          
          <div class="pagination-controls">
            <button 
              class="btn btn-sm btn-outline-primary"
              [disabled]="currentPage === 0"
              (click)="previousPage()"
              title="Trang trước">
              <i class="fas fa-chevron-left"></i>
            </button>
            
            <span class="pagination-info mx-3">
              Trang {{ currentPage + 1 }} / {{ totalPages }}
            </span>
            
            <button 
              class="btn btn-sm btn-outline-primary"
              [disabled]="currentPage >= totalPages - 1"
              (click)="nextPage()"
              title="Trang sau">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- No Results -->
        <div *ngIf="filteredPlayers.length === 0" class="no-results">
          <i class="fas fa-search"></i>
          <h4>No players found</h4>
          <p>Try adjusting your search criteria</p>
          <button (click)="clearFilters()" class="clear-filters-btn">Clear Filters</button>
        </div>
      </div>

      <!-- Player Detail Modal - Now dynamically rendered at document.body level -->

      <!-- Admin Player Management Modal -->
      <div *ngIf="showPlayerModal" class="modal-overlay" 
           tabindex="-1"
           (click)="closePlayerFormModal()"
           (keydown)="$event.key === 'Escape' && closePlayerFormModal()">
        <div class="player-modal" 
             tabindex="-1"
             (click)="$event.stopPropagation()"
             (keydown)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="fas fa-user-edit me-2"></i>
              {{ isEditMode ? 'Chỉnh sửa cầu thủ' : 'Thêm cầu thủ mới' }}
            </h3>
            <button class="close-btn" (click)="closePlayerFormModal()">×</button>
          </div>
          
          <div class="modal-content">
            <form #playerForm="ngForm" (ngSubmit)="savePlayerData()">
              <div class="form-grid">
                <div class="form-group">
                  <label for="firstName">Tên *</label>
                  <input 
                    type="text" 
                    id="firstName"
                    name="firstName"
                    [(ngModel)]="playerFormData.firstName" 
                    required 
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="lastName">Họ</label>
                  <input 
                    type="text" 
                    id="lastName"
                    name="lastName"
                    [(ngModel)]="playerFormData.lastName" 
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="position">Vị trí *</label>
                  <select 
                    id="position"
                    name="position"
                    [(ngModel)]="playerFormData.position" 
                    required 
                    class="form-control">
                    <option value="">Chọn vị trí</option>
                    <option value="Thủ môn">Thủ môn</option>
                    <option value="Hậu vệ">Hậu vệ</option>
                    <option value="Trung vệ">Trung vệ</option>
                    <option value="Tiền vệ">Tiền vệ</option>
                    <option value="Tiền đạo">Tiền đạo</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="dateOfBirth">Ngày sinh</label>
                  <input 
                    type="date" 
                    id="dateOfBirth"
                    name="dateOfBirth"
                    [(ngModel)]="playerFormData.dateOfBirth" 
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="height">Chiều cao (cm)</label>
                  <input 
                    type="number" 
                    id="height"
                    name="height"
                    [(ngModel)]="playerFormData.height" 
                    min="0"
                    max="250"
                    class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="weight">Cân nặng (kg)</label>
                  <input 
                    type="number" 
                    id="weight"
                    name="weight"
                    [(ngModel)]="playerFormData.weight" 
                    min="0"
                    max="200"
                    class="form-control">
                </div>
              </div>
              
              <div class="form-group full-width">
                <label for="notes">Ghi chú</label>
                <textarea 
                  id="notes"
                  name="notes"
                  [(ngModel)]="playerFormData.notes" 
                  rows="3"
                  class="form-control"
                  placeholder="Thông tin thêm về cầu thủ..."></textarea>
              </div>
              
              <!-- Avatar Input - Validation Free -->
              <div class="form-group full-width">
                <label for="avatar">
                  <i class="fas fa-user-circle me-2"></i>
                  Đường dẫn Avatar (tùy chọn)
                </label>
                <input 
                  type="text"
                  id="avatar"
                  name="avatar"
                  [(ngModel)]="playerFormData.avatar" 
                  class="form-control avatar-input-simple"
                  placeholder="assets/images/avatar_players/TenCauThu.png"
                  autocomplete="off"
                  spellcheck="false"
                  data-no-validation="true"
                  novalidate>
                <small class="form-text text-muted">
                  <i class="fas fa-info-circle me-1"></i>
                  Nhập đường dẫn file ảnh hoặc để trống để sử dụng ảnh mặc định
                </small>
              </div>
              
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closePlayerFormModal()">
                  <i class="fas fa-times me-1"></i>Hủy
                </button>
                <button 
                  type="submit" 
                  class="btn-save" 
                  [disabled]="!playerForm.form.valid || isSaving">
                  <i [class]="isSaving ? 'fas fa-spinner fa-spin me-1' : 'fas fa-save me-1'"></i>
                  {{ isSaving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Thêm mới') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteConfirm" class="modal-overlay" 
           tabindex="-1"
           (click)="closeDeleteConfirm()"
           (keydown)="$event.key === 'Escape' && closeDeleteConfirm()">
        <div class="confirm-modal" 
             tabindex="-1"
             (click)="$event.stopPropagation()"
             (keydown)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="fas fa-exclamation-triangle me-2"></i>
              Xác nhận xóa
            </h3>
          </div>
          <div class="modal-content">
            <p>Bạn có chắc chắn muốn xóa cầu thủ <strong>{{ playerToDelete?.firstName }} {{ playerToDelete?.lastName }}</strong>?</p>
            <p class="warning-text">Hành động này không thể hoàn tác!</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="closeDeleteConfirm()">
              <i class="fas fa-times me-1"></i>Hủy
            </button>
            <button 
              type="button" 
              class="btn-delete" 
              (click)="executeDeletePlayer()"
              [disabled]="isSaving">
              <i [class]="isSaving ? 'fas fa-spinner fa-spin me-1' : 'fas fa-trash me-1'"></i>
              {{ isSaving ? 'Đang xóa...' : 'Xóa' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .enhanced-players-container {
      padding: 0;
      max-width: 1600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Modern Header Styles */
    .modern-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .modern-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="rgba(255,255,255,0.1)"><polygon points="0,100 1000,0 1000,100"/></svg>') bottom;
      background-size: cover;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      flex-wrap: wrap;
      gap: 20px;
    }

    .title-section {
      flex: 1;
      min-width: 300px;
    }

    .title-wrapper {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .icon-wrapper {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .icon-wrapper i {
      font-size: 2rem;
      color: white;
    }

    .title-text h1 {
      font-size: 2.8rem;
      margin: 0 0 10px 0;
      font-weight: 700;
      background: linear-gradient(45deg, #ffffff, #f0f8ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .title-text p {
      font-size: 1.1rem;
      margin: 0;
      opacity: 0.9;
      line-height: 1.5;
    }

    .header-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px;
      max-width: 1000px;
    }

    .quick-stat {
      background: rgba(255, 255, 255, 0.15);
      padding: 20px;
      border-radius: 20px;
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 120px;
    }

    .quick-stat::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .quick-stat:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      background: rgba(255, 255, 255, 0.25);
    }

    .quick-stat:hover::before {
      opacity: 1;
    }

    .quick-stat.primary:hover::before { background: linear-gradient(90deg, #667eea, #764ba2); }
    .quick-stat.secondary:hover::before { background: linear-gradient(90deg, #1abc9c, #16a085); }
    .quick-stat.tertiary:hover::before { background: linear-gradient(90deg, #f39c12, #e67e22); }
    .quick-stat.quaternary:hover::before { background: linear-gradient(90deg, #e74c3c, #c0392b); }
    .quick-stat.quinary:hover::before { background: linear-gradient(90deg, #9b59b6, #8e44ad); }

    .stat-icon {
      width: 45px;
      height: 45px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      color: white;
      margin-bottom: 12px;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .stat-content {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .stat-number {
      display: block;
      font-size: 2.2rem;
      font-weight: 800;
      color: white;
      margin-bottom: 4px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .stat-label {
      display: block;
      font-size: 0.8rem;
      opacity: 0.9;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    /* Mini Charts */
    .mini-chart {
      display: flex;
      gap: 2px;
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }

    .position-bar {
      height: 100%;
      background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0.7));
      transition: all 0.3s ease;
      min-width: 2px;
    }

    .age-distribution {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      width: 100%;
      justify-content: center;
    }

    .age-group {
      background: rgba(255, 255, 255, 0.3);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 600;
      color: white;
      text-align: center;
      min-width: 20px;
      cursor: help;
    }

    .age-group.young { background: rgba(52, 152, 219, 0.4); }
    .age-group.prime { background: rgba(46, 204, 113, 0.4); }
    .age-group.veteran { background: rgba(230, 126, 34, 0.4); }

    .rating-distribution {
      display: flex;
      gap: 2px;
      height: 20px;
      width: 80%;
      margin-top: 6px;
      border-radius: 4px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.2);
      align-items: end;
    }

    .rating-bar {
      flex: 1;
      border-radius: 1px;
      transition: all 0.3s ease;
      cursor: help;
      min-height: 2px;
    }

    .rating-bar.excellent { background: linear-gradient(180deg, #27ae60, #2ecc71); }
    .rating-bar.good { background: linear-gradient(180deg, #3498db, #2980b9); }
    .rating-bar.average { background: linear-gradient(180deg, #f39c12, #e67e22); }
    .rating-bar.poor { background: linear-gradient(180deg, #e74c3c, #c0392b); }

    .strength-meter {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 6px;
      position: relative;
    }

    .strength-fill {
      height: 100%;
      background: linear-gradient(90deg, #e74c3c, #f39c12, #f1c40f, #2ecc71, #27ae60);
      border-radius: 4px;
      transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .strength-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shimmerStrength 2s infinite;
    }

    @keyframes shimmerStrength {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    .global-search {
      margin-top: 30px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 20px;
      color: #666;
      font-size: 1.1rem;
      z-index: 2;
    }

    .global-search-input {
      width: 100%;
      padding: 18px 20px 18px 55px;
      font-size: 1.1rem;
      border: none;
      border-radius: 25px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      outline: none;
    }

    .global-search-input:focus {
      background: white;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .clear-search {
      position: absolute;
      right: 15px;
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 5px;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .clear-search:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #333;
    }

    /* Modern Control Panel Styles */
    .modern-control-panel {
      background: white;
      margin: -50px 30px 30px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 10;
      overflow: hidden;
    }

    .controls-section, .actions-section {
      padding: 30px;
    }

    .controls-section {
      border-bottom: 1px solid #f0f0f0;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.3rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f8f9fa;
    }

    .section-title i {
      color: #667eea;
      font-size: 1.2rem;
    }

    .filter-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .filter-card {
      background: #f8f9fa;
      border-radius: 15px;
      padding: 20px;
      border: 2px solid transparent;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .filter-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .filter-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
    }

    .filter-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .filter-header i {
      color: #667eea;
      font-size: 1.1rem;
    }

    .modern-select {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      font-size: 1rem;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 12px center;
      background-repeat: no-repeat;
      background-size: 16px;
      padding-right: 40px;
    }

    .modern-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .view-toggle {
      display: flex;
      background: #e9ecef;
      border-radius: 10px;
      padding: 4px;
      gap: 4px;
    }

    .toggle-btn {
      flex: 1;
      padding: 10px 15px;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 500;
      color: #6c757d;
    }

    .toggle-btn.active {
      background: white;
      color: #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .action-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .action-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid transparent;
      border-radius: 15px;
      padding: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 20px;
      text-align: left;
    }

    .action-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .action-card.add-player:hover {
      border-color: #28a745;
      background: linear-gradient(135deg, #d4edda, #c3e6cb);
    }

    .action-card.reload-data:hover {
      border-color: #007bff;
      background: linear-gradient(135deg, #d1ecf1, #bee5eb);
    }

    .action-card.export-data:hover {
      border-color: #17a2b8;
      background: linear-gradient(135deg, #d1ecf1, #b8e6e1);
    }

    .action-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      color: white;
      flex-shrink: 0;
    }

    .add-player .action-icon {
      background: linear-gradient(135deg, #28a745, #20c997);
    }

    .reload-data .action-icon {
      background: linear-gradient(135deg, #007bff, #0056b3);
    }

    .export-data .action-icon {
      background: linear-gradient(135deg, #17a2b8, #138496);
    }

    .action-content h4 {
      margin: 0 0 5px 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .action-content p {
      margin: 0;
      font-size: 0.9rem;
      color: #6c757d;
      line-height: 1.4;
    }

    .action-btn {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn.primary { background: #007bff; color: white; }
    .action-btn.success { background: #28a745; color: white; }
    .action-btn.info { background: #17a2b8; color: white; }
    .action-btn.secondary { background: #6c757d; color: white; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Enhanced Statistics Section */
    .stats-section {
      background: white;
      margin: 0 30px 30px;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
    }

    .stats-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .stats-section h3 {
      font-size: 1.4rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 25px 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
    }

    .stat-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%);
      padding: 25px;
      border-radius: 16px;
      text-align: center;
      border: 2px solid #f0f0f0;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      border-color: #667eea;
      box-shadow: 0 15px 40px rgba(102, 126, 234, 0.15);
    }

    .stat-card:hover::before {
      transform: scaleX(1);
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #6c757d;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Enhanced Players Section */
    .players-section {
      background: white;
      margin: 0 30px 30px;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
    }

    .section-header h3 {
      font-size: 1.4rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 30px 0;
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 25px;
    }

    .player-card-enhanced {
      background: white;
      border-radius: 16px;
      padding: 0;
      border: 2px solid #f0f0f0;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      position: relative;
    }

    .player-card-enhanced::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .player-card-enhanced:hover {
      transform: translateY(-8px);
      border-color: #667eea;
      box-shadow: 0 20px 60px rgba(102, 126, 234, 0.15);
    }

    .player-card-enhanced:hover::before {
      transform: scaleX(1);
    }

    .player-header {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    }

    .player-avatar-enhanced {
      width: 60px;
      height: 60px;
      border-radius: 15px;
      object-fit: cover;
      border: 3px solid white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .player-basic-info {
      flex: 1;
    }

    .player-name-enhanced {
      margin: 0 0 8px 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
      line-height: 1.3;
    }

    .position-badge {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 6px 14px;
      border-radius: 25px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
    }

    .player-stats {
      padding: 20px;
      display: flex;
      justify-content: space-around;
      background: #fafbfc;
      border-top: 1px solid #f0f0f0;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      color: #6c757d;
      font-size: 0.85rem;
    }

    .stat-item i {
      color: #667eea;
      font-size: 1.1rem;
    }

    .stat-item span {
      font-weight: 600;
      color: #2c3e50;
    }

    .player-actions {
      padding: 15px 20px;
      display: flex;
      gap: 10px;
      border-top: 1px solid #f0f0f0;
      background: white;
    }

    .detail-btn {
      flex: 1;
      padding: 10px 15px;
      border: 2px solid #667eea;
      background: transparent;
      color: #667eea;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .detail-btn:hover {
      background: #667eea;
      color: white;
      transform: translateY(-1px);
    }

    .edit-btn, .delete-btn {
      width: 45px;
      height: 45px;
      border: 2px solid;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .edit-btn {
      border-color: #28a745;
      color: #28a745;
      background: transparent;
    }

    .edit-btn:hover {
      background: #28a745;
      color: white;
      transform: translateY(-1px);
    }

    .delete-btn {
      border-color: #dc3545;
      color: #dc3545;
      background: transparent;
    }

    .delete-btn:hover {
      background: #dc3545;
      color: white;
      transform: translateY(-1px);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
      backdrop-filter: blur(8px);
      overflow: hidden;
      margin: 0 !important;
    }

    .player-detail-modal {
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
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
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

    /* Avatar Sizing - Consistent across all views */
    .player-avatar-enhanced {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .player-avatar-enhanced:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .list-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
      margin-right: 15px;
    }

    .detail-avatar img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #667eea;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }

    .player-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .player-basic-info {
      flex: 1;
    }

    .player-name-enhanced {
      margin: 0 0 8px 0;
      color: #2c3e50;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .player-stats {
      display: flex;
      gap: 15px;
      margin: 15px 0;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.9rem;
      color: #6c757d;
    }

    .player-actions {
      margin-top: 15px;
    }

    .detail-btn {
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: transform 0.2s ease;
    }

    .detail-btn:hover {
      transform: translateY(-2px);
    }

    /* Table View Styles */
    .players-table-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      border: 1px solid rgba(102, 126, 234, 0.08);
    }

    .table-wrapper {
      overflow-x: auto;
      max-width: 100%;
    }

    .players-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .players-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .players-table th {
      padding: 16px 12px;
      font-weight: 600;
      text-align: left;
      font-size: 14px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    }

    .players-table th.select-col { width: 50px; text-align: center; }
    .players-table th.avatar-col { width: 70px; text-align: center; }
    .players-table th.name-col { width: 200px; }
    .players-table th.position-col { width: 120px; text-align: center; }
    .players-table th.age-col { width: 80px; text-align: center; }
    .players-table th.height-col { width: 100px; text-align: center; }
    .players-table th.weight-col { width: 100px; text-align: center; }
    .players-table th.actions-col { width: 150px; text-align: center; }

    .player-row {
      transition: all 0.2s ease;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .player-row:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%);
      transform: scale(1.005);
    }

    .player-row.selected {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%);
    }

    .players-table td {
      padding: 14px 12px;
      vertical-align: middle;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .select-cell {
      text-align: center;
    }

    .player-checkbox, .bulk-select-all {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #667eea;
    }

    .avatar-cell {
      text-align: center;
    }

    .table-avatar {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(102, 126, 234, 0.2);
      transition: all 0.2s ease;
    }

    .table-avatar:hover {
      transform: scale(1.1);
      border-color: #667eea;
    }

    .name-cell {
      font-weight: 500;
    }

    .player-full-name {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 600;
    }

    .position-cell {
      text-align: center;
    }

    .position-badge-small {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .age-cell, .height-cell, .weight-cell {
      text-align: center;
      font-weight: 500;
      color: #495057;
    }

    .actions-cell {
      text-align: center;
    }

    .table-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .action-btn {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
    }

    .detail-btn {
      color: #17a2b8;
      background: rgba(23, 162, 184, 0.1);
    }

    .detail-btn:hover {
      background: rgba(23, 162, 184, 0.2);
      transform: scale(1.1);
    }

    .edit-btn {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    .edit-btn:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: scale(1.1);
    }

    .delete-btn {
      color: #dc3545;
      background: rgba(220, 53, 69, 0.1);
    }

    .delete-btn:hover {
      background: rgba(220, 53, 69, 0.2);
      transform: scale(1.1);
    }

    .action-btn i {
      font-size: 14px;
    }

    /* Responsive table */
    @media (max-width: 768px) {
      .players-table th, .players-table td {
        padding: 10px 8px;
        font-size: 13px;
      }
      
      .table-avatar {
        width: 35px;
        height: 35px;
      }
      
      .player-full-name {
        font-size: 13px;
      }
      
      .position-badge-small {
        padding: 4px 8px;
        font-size: 11px;
      }
      
      .action-btn {
        width: 30px;
        height: 30px;
        padding: 6px;
      }
    }

    @media (max-width: 480px) {
      .players-table {
        font-size: 12px;
      }
      
      .players-table th, .players-table td {
        padding: 8px 6px;
      }
      
      .table-avatar {
        width: 30px;
        height: 30px;
      }
      
    }

    /* Simplified List View */
    .players-list { 
      background: white; 
      border-radius: 16px; 
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.08); 
      overflow: hidden;
      border: 1px solid rgba(102, 126, 234, 0.08);
    }
    .list-header { display: grid; grid-template-columns: 2.8fr 1.3fr 95px 100px 100px 180px; gap: 28px; padding: 20px 32px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); font-weight: 700; text-align: center; border-radius: 12px 12px 0 0; }
    .list-item { display: grid; grid-template-columns: 2.8fr 1.3fr 95px 100px 100px 180px; gap: 28px; padding: 18px 32px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); align-items: center; transition: all 0.3s ease; }

    .list-item:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.12);
      border-radius: 10px;
    }

    .list-item:hover::before {
      transform: scaleY(1);
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .list-name {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      color: #2c3e50;
      justify-self: start;
    }

    .list-avatar {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid white;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
      transition: all 0.3s ease;
    }

    .list-item:hover .list-avatar {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
    }

    .position-badge-small {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      white-space: nowrap;
      display: inline-block;
    }

    /* Center alignment for list columns */
    .list-item > div:not(.list-name) {
      text-align: center;
      justify-self: center;
    }

    .list-header > div:first-child {
      text-align: left;
      justify-self: start;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .list-header > div:not(:first-child) {
      text-align: center;
      justify-self: center;
    }

    .list-actions {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
    }

    .list-actions .action-btn {
      padding: 5px 8px;
      border: none;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 3px;
      min-width: 50px;
      justify-content: center;
    }

    .list-actions .detail-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .list-actions .detail-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .list-actions .edit-btn {
      background: linear-gradient(135deg, #ffeaa7, #fab1a0);
      color: #2d3436;
      box-shadow: 0 2px 8px rgba(255, 234, 167, 0.3);
    }

    .list-actions .edit-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 234, 167, 0.4);
    }

    .list-actions .delete-btn {
      background: linear-gradient(135deg, #fd79a8, #e84393);
      color: white;
      box-shadow: 0 2px 8px rgba(253, 121, 168, 0.3);
    }

    .list-actions .delete-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(253, 121, 168, 0.4);
    }

    .list-actions .action-btn i {
      font-size: 0.7rem;
    }

    .player-name {
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 2px;
      line-height: 1.3;
      font-size: 1.05rem;
      transition: color 0.3s ease;
    }

    .list-item:hover .player-name {
      color: #667eea;
    }

    .col-age, .col-height, .col-weight {
      font-weight: 600;
      color: #495057;
    }

    .col-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .list-action-btn {
      width: 35px;
      height: 35px;
      border: 2px solid;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      background: transparent;
    }

    .list-action-btn:first-child {
      border-color: #667eea;
      color: #667eea;
    }

    .list-action-btn:first-child:hover {
      background: #667eea;
      color: white;
      transform: scale(1.1);
    }

    .list-action-btn.edit-btn {
      border-color: #28a745;
      color: #28a745;
    }

    .list-action-btn.edit-btn:hover {
      background: #28a745;
      color: white;
      transform: scale(1.1);
    }

    .list-action-btn.delete-btn {
      border-color: #dc3545;
      color: #dc3545;
    }

    .list-action-btn.delete-btn:hover {
      background: #dc3545;
      color: white;
      transform: scale(1.1);
    }

    /* Enhanced Loading States */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      background: white;
      margin: 0 30px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-state p {
      color: #6c757d;
      font-size: 1.1rem;
      margin: 0;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      background: white;
      margin: 0 30px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
      text-align: center;
    }

    .error-state i {
      font-size: 4rem;
      color: #dc3545;
      margin-bottom: 20px;
    }

    .error-state h4 {
      color: #2c3e50;
      font-size: 1.5rem;
      margin: 0 0 10px 0;
    }

    .error-state p {
      color: #6c757d;
      margin: 0 0 25px 0;
      line-height: 1.5;
    }

    .retry-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .retry-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }

    .no-results i {
      font-size: 3rem;
      margin-bottom: 20px;
      color: #dee2e6;
    }

    .no-results h4 {
      font-size: 1.3rem;
      margin: 0 0 10px 0;
      color: #495057;
    }

    .no-results p {
      margin: 0 0 25px 0;
    }

    .clear-filters-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .clear-filters-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
    }

    /* Pagination Styles */
    .pagination-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      margin: 20px 0;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .pagination-info {
      color: #6c757d;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .pagination-controls .btn {
      border: 2px solid #667eea;
      background: transparent;
      color: #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .pagination-controls .btn:not(:disabled):hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .pagination-controls .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pagination-info.mx-3 {
      margin: 0 1.5rem;
      color: #495057;
      font-weight: 600;
      font-size: 0.95rem;
    }

    /* Advanced Filters Styles */
    .advanced-toggle-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .advanced-toggle-card .filter-header {
      color: white;
    }

    .advanced-toggle-card .filter-header i {
      color: white;
    }

    .advanced-toggle-btn {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s ease;
    }

    .advanced-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-1px);
    }

    .advanced-toggle-btn.active {
      background: rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .advanced-filters-panel {
      max-height: 0;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      background: white;
      border-radius: 15px;
      margin-top: 20px;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.1);
    }

    .advanced-filters-panel.expanded {
      max-height: 500px;
      padding: 25px;
    }

    .advanced-filters-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 25px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }

    .advanced-filters-title i {
      color: #667eea;
    }

    .advanced-filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 25px;
    }

    .range-filter {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e9ecef;
      transition: all 0.3s ease;
      position: relative;
    }

    .range-filter:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
    }

    .range-label {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
    }

    .range-label i {
      color: #667eea;
      font-size: 1rem;
    }

    .dual-range-container {
      position: relative;
      height: 40px;
      margin-bottom: 10px;
    }

    .range-input {
      position: absolute;
      width: 100%;
      height: 6px;
      background: transparent;
      appearance: none;
      outline: none;
      cursor: pointer;
      border-radius: 3px;
    }

    .range-input::-webkit-slider-track {
      width: 100%;
      height: 6px;
      background: #ddd;
      border-radius: 3px;
    }

    .range-input::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
      transition: all 0.2s ease;
    }

    .range-input::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
    }

    .range-input::-moz-range-track {
      width: 100%;
      height: 6px;
      background: #ddd;
      border-radius: 3px;
      border: none;
    }

    .range-input::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
    }

    .range-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 5px;
    }

    .filter-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      grid-column: 1 / -1;
    }

    .reset-filters-btn {
      background: linear-gradient(135deg, #dc3545, #c82333);
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reset-filters-btn:hover {
      background: linear-gradient(135deg, #c82333, #bd2130);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
    }

    /* Enhanced Player Card Styles */
    .player-avatar-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-rating {
      position: absolute;
      bottom: -8px;
      left: -8px;
      width: 32px;
      height: 20px;
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: white;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .position-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    .skill-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .skill-badge {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.65rem;
      font-weight: 600;
      border: 1px solid rgba(102, 126, 234, 0.2);
      transition: all 0.2s ease;
    }

    .skill-badge:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: scale(1.05);
    }

    /* Skill-specific colors */
    .skill-phản { background: rgba(231, 76, 60, 0.1); color: #e74c3c; border-color: rgba(231, 76, 60, 0.2); }
    .skill-bắt { background: rgba(52, 152, 219, 0.1); color: #3498db; border-color: rgba(52, 152, 219, 0.2); }
    .skill-phòng { background: rgba(46, 204, 113, 0.1); color: #2ecc71; border-color: rgba(46, 204, 113, 0.2); }
    .skill-tranh { background: rgba(230, 126, 34, 0.1); color: #e67e22; border-color: rgba(230, 126, 34, 0.2); }
    .skill-đánh { background: rgba(155, 89, 182, 0.1); color: #9b59b6; border-color: rgba(155, 89, 182, 0.2); }
    .skill-chuyền { background: rgba(26, 188, 156, 0.1); color: #1abc9c; border-color: rgba(26, 188, 156, 0.2); }
    .skill-kiến { background: rgba(241, 196, 15, 0.1); color: #f1c40f; border-color: rgba(241, 196, 15, 0.2); }
    .skill-ghi { background: rgba(192, 57, 43, 0.1); color: #c0392b; border-color: rgba(192, 57, 43, 0.2); }
    .skill-dứt { background: rgba(211, 84, 0, 0.1); color: #d35400; border-color: rgba(211, 84, 0, 0.2); }
    .skill-tốc { background: rgba(142, 68, 173, 0.1); color: #8e44ad; border-color: rgba(142, 68, 173, 0.2); }
    .skill-kỹ { background: rgba(22, 160, 133, 0.1); color: #16a085; border-color: rgba(22, 160, 133, 0.2); }
    .skill-thể { background: rgba(39, 174, 96, 0.1); color: #27ae60; border-color: rgba(39, 174, 96, 0.2); }
    .skill-chiến { background: rgba(41, 128, 185, 0.1); color: #2980b9; border-color: rgba(41, 128, 185, 0.2); }
    .skill-lãnh { background: rgba(243, 156, 18, 0.1); color: #f39c12; border-color: rgba(243, 156, 18, 0.2); }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #6c757d;
      font-size: 0.85rem;
      position: relative;
    }

    .stat-indicator {
      width: 12px;
      height: 3px;
      border-radius: 2px;
      margin-top: 2px;
    }

    .indicator-high { background: linear-gradient(90deg, #27ae60, #2ecc71); }
    .indicator-good { background: linear-gradient(90deg, #3498db, #2980b9); }
    .indicator-average { background: linear-gradient(90deg, #f39c12, #e67e22); }
    .indicator-low { background: linear-gradient(90deg, #e74c3c, #c0392b); }
    .indicator-neutral { background: #bdc3c7; }

    .age-category {
      font-size: 0.7rem;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .performance-stat {
      grid-column: 1 / -1;
      width: 100%;
    }

    .performance-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
      position: relative;
    }

    .performance-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
      background-size: 200% 100%;
      border-radius: 4px;
      transition: width 1s ease-in-out;
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Enhanced Player Stats Layout */
    .player-stats {
      padding: 15px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: #fafbfc;
      border-top: 1px solid #f0f0f0;
      border-bottom: 1px solid #f0f0f0;
    }

    /* Position Multi-Select Styles */
    .position-multi-select {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .selected-positions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .position-tag {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      animation: slideInScale 0.3s ease;
    }

    @keyframes slideInScale {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .remove-position-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 2px;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      transition: all 0.2s ease;
    }

    .remove-position-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .clear-filter-btn {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
      border: none;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 0.7rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: auto;
    }

    .clear-filter-btn:hover {
      background: rgba(220, 53, 69, 0.2);
      transform: scale(1.05);
    }

    /* Bulk Operations Styles */
    .section-title-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .bulk-select-toggle {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .bulk-select-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .bulk-select-toggle.active {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
    }

    .bulk-actions-bar {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      border: 2px solid #dee2e6;
      border-radius: 15px;
      padding: 15px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transform: translateY(-10px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .bulk-actions-bar.visible {
      transform: translateY(0);
      opacity: 1;
    }

    .bulk-selection-info {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #2c3e50;
      font-weight: 600;
    }

    .bulk-selection-info i {
      color: #27ae60;
      font-size: 1.1rem;
    }

    .bulk-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .bulk-action-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
    }

    .bulk-action-btn.select-all {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
    }

    .bulk-action-btn.clear-selection {
      background: linear-gradient(135deg, #95a5a6, #7f8c8d);
      color: white;
    }

    .bulk-action-btn.export {
      background: linear-gradient(135deg, #1abc9c, #16a085);
      color: white;
    }

    .bulk-action-btn.change-position {
      background: linear-gradient(135deg, #f39c12, #e67e22);
      color: white;
    }

    .bulk-action-btn.delete {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
    }

    .bulk-action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }

    .bulk-select-overlay {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 10;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      padding: 5px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(5px);
    }

    .bulk-select-checkbox,
    .header-select-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #667eea;
    }

    .player-card-enhanced.selected {
      border-color: #667eea !important;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
    }

    .list-item.selected {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
      border-left: 4px solid #667eea;
    }

    .col-select {
      width: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Update list header and item grid templates when bulk select is active */
    .players-list .list-header {
      grid-template-columns: 50px 2.5fr 1.2fr 90px 90px 90px 120px;
    }

    .players-list .list-item {
      grid-template-columns: 50px 2.5fr 1.2fr 90px 90px 90px 120px;
    }

    /* Hide bulk select column when not in bulk mode */
    .players-list:not(.bulk-mode) .col-select {
      display: none;
    }

    /* Data Visualization Styles */
    .visualization-section {
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      margin-bottom: 30px;
    }

    .visualization-toggle {
      background: rgba(102, 126, 234, 0.1);
      border: none;
      color: #667eea;
      padding: 8px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-left: auto;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .visualization-toggle:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: scale(1.05);
    }

    .visualization-toggle.active {
      background: #667eea;
      color: white;
    }

    .visualization-panel {
      max-height: 0;
      overflow: hidden;
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .visualization-panel.expanded {
      max-height: 800px;
      padding: 30px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 25px;
    }

    .chart-container {
      background: linear-gradient(135deg, #f8f9fa, #ffffff);
      border-radius: 15px;
      padding: 20px;
      border: 2px solid #e9ecef;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }

    .chart-container:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
      border-color: #667eea;
    }

    .chart-container.full-width {
      grid-column: 1 / -1;
    }

    .chart-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }

    .chart-title i {
      color: #667eea;
      font-size: 1rem;
    }

    /* Position Chart Styles */
    .position-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .position-slice {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .position-bar-horizontal {
      height: 25px;
      border-radius: 12px;
      min-width: 20px;
      transition: all 0.4s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      color: white;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .position-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-width: 120px;
      font-size: 0.9rem;
    }

    .position-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .position-count {
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Position Color Variations */
    .bar-goalkeeper { background: linear-gradient(90deg, #e74c3c, #c0392b); }
    .bar-defender { background: linear-gradient(90deg, #2ecc71, #27ae60); }
    .bar-centerback { background: linear-gradient(90deg, #3498db, #2980b9); }
    .bar-midfielder { background: linear-gradient(90deg, #f39c12, #e67e22); }
    .bar-forward { background: linear-gradient(90deg, #9b59b6, #8e44ad); }
    .bar-default { background: linear-gradient(90deg, #95a5a6, #7f8c8d); }

    /* Age Histogram Styles */
    .age-chart {
      display: flex;
      flex-direction: column;
      height: 200px;
    }

    .age-histogram {
      display: flex;
      align-items: end;
      justify-content: space-around;
      height: 150px;
      background: linear-gradient(to top, #f8f9fa, transparent);
      border-radius: 8px;
      padding: 10px;
      gap: 8px;
    }

    .age-histogram-bar {
      flex: 1;
      position: relative;
      display: flex;
      align-items: end;
      justify-content: center;
      cursor: help;
      transition: all 0.3s ease;
    }

    .age-histogram-bar:hover {
      transform: scale(1.1);
    }

    .age-bar-fill {
      width: 100%;
      border-radius: 4px 4px 0 0;
      transition: all 0.4s ease;
      position: relative;
    }

    .age-bar-fill.very-young { background: linear-gradient(180deg, #3498db, #2980b9); }
    .age-bar-fill.young { background: linear-gradient(180deg, #2ecc71, #27ae60); }
    .age-bar-fill.prime { background: linear-gradient(180deg, #f39c12, #e67e22); }
    .age-bar-fill.veteran { background: linear-gradient(180deg, #e74c3c, #c0392b); }
    .age-bar-fill.senior { background: linear-gradient(180deg, #9b59b6, #8e44ad); }

    .age-count {
      position: absolute;
      top: -25px;
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.8rem;
      background: white;
      padding: 2px 6px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .age-labels {
      display: flex;
      justify-content: space-around;
      padding-top: 10px;
      font-size: 0.8rem;
      color: #6c757d;
      font-weight: 600;
    }

    /* Rating Donut Chart Styles */
    .rating-donut-chart {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      height: 250px;
    }

    .donut-center {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .avg-rating {
      font-size: 2rem;
      font-weight: 800;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .avg-label {
      font-size: 0.8rem;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .donut-legend {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      width: 100%;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #2c3e50;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-item.excellent .legend-color { background: linear-gradient(135deg, #27ae60, #2ecc71); }
    .legend-item.good .legend-color { background: linear-gradient(135deg, #3498db, #2980b9); }
    .legend-item.average .legend-color { background: linear-gradient(135deg, #f39c12, #e67e22); }
    .legend-item.poor .legend-color { background: linear-gradient(135deg, #e74c3c, #c0392b); }

    /* Physical Stats Scatter Plot */
    .physical-stats-chart {
      position: relative;
      height: 200px;
      background: linear-gradient(to top right, #f8f9fa, #ffffff);
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }

    .scatter-plot {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 20px;
    }

    .scatter-point {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      cursor: help;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .scatter-point:hover {
      transform: scale(1.5);
      z-index: 10;
    }

    .point-goalkeeper { background: linear-gradient(135deg, #e74c3c, #c0392b); }
    .point-defender { background: linear-gradient(135deg, #2ecc71, #27ae60); }
    .point-centerback { background: linear-gradient(135deg, #3498db, #2980b9); }
    .point-midfielder { background: linear-gradient(135deg, #f39c12, #e67e22); }
    .point-forward { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
    .point-default { background: linear-gradient(135deg, #95a5a6, #7f8c8d); }

    .axis-labels {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .y-axis-label {
      position: absolute;
      left: -15px;
      top: 50%;
      transform: rotate(-90deg) translateY(50%);
      font-size: 0.8rem;
      color: #6c757d;
      font-weight: 600;
    }

    .x-axis-label {
      position: absolute;
      bottom: -15px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
      color: #6c757d;
      font-weight: 600;
    }

    /* Team Balance Radar */
    .team-balance-radar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .radar-chart {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      width: 100%;
      max-width: 400px;
    }

    .radar-axis {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
    }

    .radar-value {
      width: 30px;
      background: linear-gradient(180deg, #667eea, #764ba2);
      border-radius: 15px;
      max-height: 100px;
      transition: height 1s ease-out;
      position: relative;
    }

    .radar-value::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      border-radius: 15px;
      animation: shimmerRadar 2s infinite;
    }

    @keyframes shimmerRadar {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }

    .radar-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .balance-summary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 20px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .balance-score .score {
      display: block;
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 5px;
    }

    .balance-score .score-label {
      font-size: 0.9rem;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Comprehensive Mobile Responsiveness */
    @media (max-width: 1200px) {
      .modern-control-panel {
        margin: -30px 20px 20px;
      }

      .players-section, .stats-section {
        margin: 0 20px 20px;
      }
    }

    @media (max-width: 968px) {
      .header-content {
        flex-direction: column;
        text-align: center;
        gap: 30px;
      }

      .title-wrapper {
        flex-direction: column;
        gap: 15px;
      }

      .header-stats {
        justify-content: center;
      }

      .filter-cards {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .action-cards {
        grid-template-columns: 1fr;
        gap: 15px;
      }
    }

    @media (max-width: 768px) {
      .modern-header {
        padding: 25px 15px;
      }

      .title-text h1 {
        font-size: 2rem;
      }

      .header-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
      }

      .quick-stat {
        padding: 15px;
        min-height: 100px;
      }

      .stat-number {
        font-size: 1.8rem;
      }

      .modern-control-panel {
        margin: -15px 10px 15px;
      }

      .controls-section, .actions-section {
        padding: 15px;
      }

      .filter-cards, .action-cards {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .advanced-filters-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .players-section, .stats-section, .visualization-section {
        margin: 0 10px 15px;
        padding: 15px;
      }

      .section-title-area {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }

      .bulk-actions-bar {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
        text-align: center;
      }

      .bulk-actions {
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .bulk-action-btn {
        flex: 1;
        min-width: 100px;
        justify-content: center;
      }

      .players-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .player-card-enhanced {
        padding: 0;
      }

      .player-header {
        padding: 15px;
        flex-direction: column;
        gap: 12px;
        text-align: center;
      }

      .player-avatar-container {
        align-self: center;
      }

      .player-avatar-enhanced {
        width: 60px;
        height: 60px;
      }

      .player-rating {
        font-size: 0.6rem;
        width: 24px;
        height: 24px;
        bottom: -6px;
        left: -6px;
      }

      .player-basic-info {
        align-items: center;
      }

      .player-name-enhanced {
        font-size: 1rem;
        text-align: center;
      }

      .skill-badges {
        justify-content: center;
      }

      .player-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        padding: 12px;
      }

      .performance-stat {
        grid-column: 1 / -1;
      }

      .player-actions {
        flex-direction: column;
        gap: 8px;
        padding: 12px 15px;
      }

      .detail-btn {
        width: 100%;
        justify-content: center;
      }

      .edit-btn, .delete-btn {
        width: 100%;
        height: 40px;
        justify-content: center;
        gap: 8px;
      }

      .list-header, .list-item {
        grid-template-columns: 50px 2fr 1fr 80px;
        gap: 8px;
        padding: 12px 15px;
        font-size: 0.85rem;
      }

      .col-height, .col-weight, .col-actions {
        display: none;
      }

      .list-name {
        gap: 10px;
      }

      .list-avatar {
        width: 40px;
        height: 40px;
      }

      .action-card {
        padding: 15px;
        gap: 12px;
        flex-direction: column;
        text-align: center;
      }

      .action-icon {
        width: 40px;
        height: 40px;
        margin: 0 auto;
      }

      /* Enhanced Mobile Pagination */
      .pagination-section {
        flex-direction: column;
        gap: 12px;
        text-align: center;
        padding: 15px;
      }

      .pagination-controls {
        justify-content: center;
        flex-wrap: wrap;
        gap: 12px;
      }

      .pagination-controls .btn {
        width: 44px;
        height: 44px;
        font-size: 1rem;
      }

      .pagination-info {
        font-size: 0.85rem;
      }

      /* Mobile Charts */
      .charts-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .chart-container {
        padding: 15px;
      }

      .visualization-panel.expanded {
        padding: 20px;
      }

      .position-chart {
        gap: 10px;
      }

      .position-slice {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .position-info {
        min-width: auto;
        justify-content: space-between;
      }

      .age-histogram {
        height: 120px;
        gap: 4px;
      }

      .radar-chart {
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
      }

      .donut-legend {
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .physical-stats-chart {
        height: 150px;
      }

      .scatter-point {
        width: 6px;
        height: 6px;
      }

      /* Mobile Touch Enhancements */
      .player-card-enhanced {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .player-card-enhanced:active {
        transform: scale(0.98);
      }

      .bulk-select-checkbox,
      .header-select-checkbox {
        width: 20px;
        height: 20px;
        transform: scale(1.2);
      }

      .modern-select,
      .range-input,
      .form-control {
        min-height: 48px;
        font-size: 16px; /* Prevents zoom on iOS */
      }

      .action-btn,
      .bulk-action-btn,
      .toggle-btn {
        min-height: 44px;
        touch-action: manipulation;
      }

      /* Swipe gestures for cards */
      .player-card-enhanced {
        position: relative;
        overflow: hidden;
      }

      .player-card-enhanced::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
        transition: left 0.6s;
      }

      .player-card-enhanced:active::after {
        left: 100%;
      }
    }

    @media (max-width: 480px) {
      .enhanced-players-container {
        font-size: 14px;
      }

      .modern-header {
        padding: 20px 12px;
      }

      .title-wrapper {
        gap: 12px;
      }

      .icon-wrapper {
        width: 60px;
        height: 60px;
      }

      .icon-wrapper i {
        font-size: 1.5rem;
      }

      .title-text h1 {
        font-size: 1.6rem;
      }

      .title-text p {
        font-size: 0.95rem;
      }

      .global-search {
        margin-top: 20px;
      }

      .global-search-input {
        padding: 14px 14px 14px 40px;
        font-size: 16px;
        border-radius: 20px;
      }

      .search-icon {
        left: 16px;
        font-size: 1rem;
      }

      .header-stats {
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .quick-stat {
        padding: 12px;
        min-height: 85px;
      }

      .stat-icon {
        width: 35px;
        height: 35px;
        font-size: 1.2rem;
        margin-bottom: 8px;
      }

      .stat-number {
        font-size: 1.6rem;
      }

      .stat-label {
        font-size: 0.75rem;
      }

      .modern-control-panel {
        margin: -15px 8px 12px;
      }

      .controls-section, .actions-section {
        padding: 12px;
      }

      .section-title {
        font-size: 1.1rem;
        margin-bottom: 15px;
      }

      .filter-card, .action-card {
        padding: 15px;
      }

      .advanced-filters-panel.expanded {
        padding: 15px;
      }

      .range-filter {
        padding: 15px;
      }

      .players-section, .stats-section, .visualization-section {
        margin: 0 8px 12px;
        padding: 12px;
      }

      .section-title-area h3 {
        font-size: 1.1rem;
      }

      .bulk-select-toggle {
        padding: 8px 16px;
        font-size: 0.85rem;
      }

      .bulk-actions-bar {
        padding: 12px 15px;
      }

      .bulk-action-btn {
        padding: 6px 12px;
        font-size: 0.8rem;
        min-width: 80px;
      }

      .players-grid {
        gap: 12px;
      }

      .player-card-enhanced {
        border-radius: 12px;
      }

      .player-header {
        padding: 12px;
        gap: 10px;
      }

      .player-avatar-enhanced {
        width: 50px;
        height: 50px;
      }

      .player-rating {
        width: 20px;
        height: 20px;
        font-size: 0.55rem;
      }

      .player-name-enhanced {
        font-size: 0.95rem;
        margin-bottom: 6px;
      }

      .position-badge {
        font-size: 0.7rem;
        padding: 4px 10px;
      }

      .skill-badge {
        font-size: 0.6rem;
        padding: 1px 6px;
      }

      .player-stats {
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        padding: 10px;
      }

      .stat-item {
        font-size: 0.8rem;
        gap: 2px;
      }

      .performance-stat {
        grid-column: 1 / -1;
        margin-top: 4px;
      }

      .performance-bar {
        height: 6px;
      }

      .player-actions {
        padding: 10px 12px;
        gap: 6px;
      }

      .detail-btn {
        padding: 8px 12px;
        font-size: 0.85rem;
      }

      .edit-btn, .delete-btn {
        width: 36px;
        height: 36px;
        font-size: 0.85rem;
      }

      /* Ultra-compact list view */
      .list-header, .list-item {
        grid-template-columns: 40px 2fr 80px;
        gap: 6px;
        padding: 10px 12px;
        font-size: 0.8rem;
      }

      .col-position, .col-age, .col-height, .col-weight, .col-actions {
        display: none;
      }

      .list-name {
        gap: 8px;
        font-size: 0.85rem;
      }

      .list-avatar {
        width: 35px;
        height: 35px;
      }

      .position-badge-small {
        font-size: 0.65rem;
        padding: 2px 6px;
      }

      /* Compact action cards */
      .action-card {
        padding: 12px;
        gap: 8px;
        min-height: auto;
      }

      .action-icon {
        width: 35px;
        height: 35px;
        font-size: 1.1rem;
      }

      .action-content h4 {
        font-size: 0.95rem;
        margin-bottom: 2px;
      }

      .action-content p {
        font-size: 0.8rem;
      }

      /* Compact pagination */
      .pagination-section {
        padding: 12px;
        gap: 10px;
      }

      .pagination-controls .btn {
        width: 40px;
        height: 40px;
        font-size: 0.9rem;
      }

      .pagination-info {
        font-size: 0.8rem;
      }

      /* Compact charts */
      .visualization-panel.expanded {
        padding: 15px;
      }

      .chart-container {
        padding: 12px;
      }

      .chart-title {
        font-size: 1rem;
        margin-bottom: 12px;
      }

      .age-histogram {
        height: 100px;
        padding: 8px;
      }

      .age-count {
        top: -20px;
        font-size: 0.7rem;
      }

      .radar-chart {
        gap: 10px;
        max-width: 280px;
      }

      .radar-value {
        width: 25px;
        max-height: 80px;
      }

      .radar-label {
        font-size: 0.75rem;
      }

      .balance-summary {
        padding: 15px;
      }

      .balance-score .score {
        font-size: 2rem;
      }

      .balance-score .score-label {
        font-size: 0.8rem;
      }

      /* Enhanced touch targets */
      .toggle-btn {
        padding: 10px 12px;
        min-height: 44px;
      }

      .range-input {
        height: 8px;
      }

      .range-input::-webkit-slider-thumb {
        width: 24px;
        height: 24px;
      }

      .bulk-select-checkbox,
      .header-select-checkbox {
        width: 24px;
        height: 24px;
      }

      /* Improved modal for mobile */
      .modal-overlay {
        padding: 10px;
      }

      .player-modal, .confirm-modal {
        width: 95%;
        max-width: 95vw;
        margin: 10px auto;
        max-height: 95vh;
        align-self: flex-start;
        margin-top: 20px;
      }

      .modal-overlay {
        padding: 10px !important;
        align-items: flex-start !important;
        justify-content: center !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      
      .modal-content {
        max-height: calc(95vh - 80px) !important;
        padding: 15px !important;
      }

      .modal-header {
        padding: 15px 18px 12px 18px;
      }

      .modal-header h3 {
        font-size: 1.1rem;
      }

      .modal-content {
        padding: 18px;
      }

      .form-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .modal-actions {
        flex-direction: column;
        gap: 10px;
      }

      .btn-cancel, .btn-save, .btn-delete {
        width: 100%;
        padding: 14px 20px;
        font-size: 1rem;
      }
    }

      /* Smooth Animations */
      * {
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      .player-details-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .player-detail-modal {
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

    /* Player Management Styles */
    .action-btn {
      padding: 8px 12px;
      margin: 0 4px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .add-btn {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
    }

    .add-btn:hover {
      background: linear-gradient(135deg, #45a049, #3d8b40);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }

    .edit-btn {
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
      padding: 6px 10px;
      font-size: 0.8rem;
    }

    .edit-btn:hover {
      background: linear-gradient(135deg, #1976D2, #1565C0);
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(33, 150, 243, 0.3);
    }

    .delete-btn {
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white;
      padding: 6px 10px;
      font-size: 0.8rem;
    }

    .delete-btn:hover {
      background: linear-gradient(135deg, #d32f2f, #c62828);
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(244, 67, 54, 0.3);
    }

    .list-action-btn.edit-btn,
    .list-action-btn.delete-btn {
      padding: 4px 8px;
      margin: 0 2px;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .player-modal, .confirm-modal {
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
      max-width: 500px;
      width: 95%;
      max-height: 85vh;
      overflow: hidden;
      animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      display: flex;
      flex-direction: column;
      transform: translateZ(0);
      margin: 0 auto;
    }

    @keyframes modalSlideIn {
      0% {
        opacity: 0;
        transform: scale(0.8) translateY(-30px);
      }
      60% {
        opacity: 0.8;
        transform: scale(1.05) translateY(-10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      padding: 20px 24px 15px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 20px 20px 0 0;
      position: relative;
    }

    .modal-header h3 {
      margin: 0;
      color: white;
      font-size: 1.4rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: white;
      padding: 8px;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    .modal-content {
      padding: 24px;
      flex: 1;
      overflow-y: auto;
      max-height: calc(90vh - 120px);
      position: relative;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 600;
      color: #555;
    }

    .form-control {
      padding: 14px 16px;
      border: 2px solid #e8eaed;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #fafbfc;
    }

    .form-control:focus {
      border-color: #667eea;
      outline: none;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
      background: white;
    }

    .form-group label {
      margin-bottom: 10px;
      font-weight: 600;
      color: #374151;
      font-size: 0.95rem;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }

    .btn-cancel, .btn-save, .btn-delete {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-cancel {
      background: #f5f5f5;
      color: #666;
      border: 2px solid #e0e0e0;
    }

    .btn-cancel:hover {
      background: #eeeeee;
      color: #333;
    }

    .btn-save {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background: linear-gradient(135deg, #45a049, #3d8b40);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-delete {
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white;
    }

    .btn-delete:hover:not(:disabled) {
      background: linear-gradient(135deg, #d32f2f, #c62828);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
    }

    .btn-delete:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .warning-text {
      color: #f44336;
      font-weight: 500;
      font-style: italic;
    }

    .me-1 { margin-right: 4px; }
    .me-2 { margin-right: 8px; }

    /* Force modal to always be in viewport */
    .modal-overlay {
      transform: translate3d(0, 0, 0) !important;
      will-change: transform;
      backface-visibility: hidden;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .modal-overlay {
        padding: 15px;
      }
      
      .player-modal, .confirm-modal {
        width: 98%;
        max-width: none;
        max-height: 90vh;
        margin: 0;
      }
      
      .modal-header {
        padding: 16px 20px 12px 20px;
      }
      
      .modal-header h3 {
        font-size: 1.2rem;
      }
      
      .modal-content {
        padding: 20px;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .modal-actions {
        flex-direction: column;
        gap: 8px;
      }
      
      .btn-cancel, .btn-save, .btn-delete {
        width: 100%;
        justify-content: center;
      }
    }

    /* Ensure modal stays centered and doesn't scroll */
    @media (max-height: 600px) {
      .player-modal, .confirm-modal {
        max-height: 95vh;
      }
    }

    /* Global body styles for modal */
    :host ::ng-deep body.modal-open {
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
    }

    /* Prevent background scrolling on mobile */
    :host ::ng-deep .modal-overlay {
      touch-action: none;
      -webkit-overflow-scrolling: touch;
    }

    /* Additional safety rules for modal centering */
    .modal-overlay, :host ::ng-deep .modal-overlay {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 99999 !important;
    }

    .player-modal, .confirm-modal, :host ::ng-deep .player-modal {
      margin: 0 auto !important;
      align-self: center !important;
    }

    /* Ensure modal container doesn't affect positioning */
    :host {
      position: relative;
      z-index: 1;
    }

    /* Force viewport positioning */
    .modal-overlay {
      transform: translate3d(0, 0, 0) !important;
    }

    /* Simple Avatar Input Styles */
    .avatar-input-simple {
      border: 2px solid #e3f2fd;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
      transition: all 0.3s ease;
      background: #fafafa;
    }

    .avatar-input-simple:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      background: #fff;
    }

    .avatar-input-simple::placeholder {
      color: #9e9e9e;
      font-style: italic;
    }

    /* Prevent any validation styling */
    .avatar-input-simple:invalid {
      border-color: #e3f2fd !important;
      box-shadow: none !important;
    }

    .avatar-input-simple:valid {
      border-color: #e3f2fd !important;
      box-shadow: none !important;
    }
  `]
})
export class PlayersSimpleComponent implements OnInit, OnDestroy {
  private readonly performanceService = inject(PerformanceService);
  private readonly assetService = inject(AssetOptimizationService);
  private readonly playerService = inject(PlayerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();
  private componentLoadId: string | null = null;
  
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  isLoading = false;
  errorMessage = '';

  lastUpdate?: Date;
  selectedPlayer: Player | null = null;

  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  paginatedPlayers: Player[] = [];

  // Filter and display properties
  searchTerm = '';
  selectedPosition = '';
  selectedPositions: string[] = [];
  sortBy = 'firstName';
  viewMode: 'grid' | 'table' | 'list' = 'table';
  availablePositions: string[] = [];
  
  // Advanced filters
  ageRange = { min: 0, max: 100 };
  heightRange = { min: 0, max: 300 };
  weightRange = { min: 0, max: 300 };
  showAdvancedFilters = false;

  // Bulk operations
  selectedPlayerIds = new Set<string>();
  bulkSelectMode = false;

  // Data visualization
  showVisualization = false;

  // Player Management Properties
  showPlayerModal = false;
  showDeleteConfirm = false;
  isEditMode = false;
  isSaving = false;
  playerFormData: Partial<PlayerInfo> = {};
  playerToDelete: PlayerInfo | null = null;
  corePlayersData: PlayerInfo[] = [];

  // Performance optimization - cached computed values
  private _cachedAverageAge: number | null = null;
  private _cachedAverageRating: number | null = null;
  private _cachedTeamStrength: number | null = null;
  private _cachedRatingDistribution: { excellent: number; good: number; average: number; poor: number } | null = null;
  private _lastDataHash: string | null = null;

  // TrackBy functions for ngFor optimization
  trackByPlayerId = (index: number, player: Player): string => {
    return (player.id?.toString() || `${player.firstName}-${player.lastName}-${index}`);
  };

  trackByPositionName = (index: number, position: string): string => {
    return position;
  };

  trackByAgeGroup = (index: number, ageGroup: { label: string; count: number; range: string; percentage: number; class: string }): string => {
    return ageGroup.label;
  };

  ngOnInit() {
    // Start performance monitoring for this component
    this.componentLoadId = this.performanceService.startComponentLoad('PlayersSimpleComponent');
    
    // Set up debounced search to reduce excessive filtering
    this.searchSubject$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.applyFilters();
      this.cdr.markForCheck();
    });
    
    this.loadPlayersFromService();
    
    // Performance optimization applied: OnPush strategy, memoization, debouncing, trackBy
  }

  async testLoadPlayers() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const cachedData = localStorage.getItem('players.json');
      if (cachedData) {
        this.allPlayers = JSON.parse(cachedData);
        this.processPlayersData();
        
        // Complete performance monitoring after successful load
        if (this.componentLoadId) {
          this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
          this.componentLoadId = null;
        }
      } else {
        await this.testFetchDirect();
        return;
      }
      
    } catch (error) {
      console.error('Error loading players:', error);
      this.errorMessage = `Error loading players: ${error}`;
    } finally {
      this.isLoading = false;
    }
  }

  async testFetchDirect() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response = await fetch('/assets/players.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const data = JSON.parse(text);
      this.allPlayers = data;
      
      localStorage.setItem('players.json', text);
      
      this.processPlayersData();
      
    } catch (error) {
      console.error('Error fetching players:', error);
      this.errorMessage = `Fetch error: ${error}`;
    } finally {
      this.isLoading = false;
    }
  }

  processPlayersData() {
    this.lastUpdate = new Date();
    this.invalidateCache();
    this.extractAvailablePositions();
    this.applyFilters();
    this.cdr.markForCheck();
  }

  extractAvailablePositions() {
    const positions = new Set(this.allPlayers.map(p => p.position).filter(p => p));
    this.availablePositions = Array.from(positions).sort();
  }

  applyFilters() {
    let filtered = [...this.allPlayers];

    // Text search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.firstName.toLowerCase().includes(term) ||
        (player.lastName && player.lastName.toLowerCase().includes(term)) ||
        player.position.toLowerCase().includes(term)
      );
    }

    // Position filter (legacy single selection)
    if (this.selectedPosition) {
      filtered = filtered.filter(player => player.position === this.selectedPosition);
    }

    // Multi-position filter
    if (this.selectedPositions.length > 0) {
      filtered = filtered.filter(player => 
        this.selectedPositions.includes(player.position)
      );
    }

    // Age range filter
    filtered = filtered.filter(player => {
      const age = this.calculateAge(player.DOB);
      return age === null || (age >= this.ageRange.min && age <= this.ageRange.max);
    });

    // Height range filter
    filtered = filtered.filter(player => {
      return !player.height || (player.height >= this.heightRange.min && player.height <= this.heightRange.max);
    });

    // Weight range filter
    filtered = filtered.filter(player => {
      return !player.weight || (player.weight >= this.weightRange.min && player.weight <= this.weightRange.max);
    });

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'position':
          return a.position.localeCompare(b.position);
        case 'age': {
          const ageA = this.calculateAge(a.DOB) || 0;
          const ageB = this.calculateAge(b.DOB) || 0;
          return ageB - ageA;
        }
        case 'height':
          return (b.height || 0) - (a.height || 0);
        case 'weight':
          return (b.weight || 0) - (a.weight || 0);
        default:
          return a.firstName.localeCompare(b.firstName);
      }
    });

    this.filteredPlayers = filtered;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  calculateAge(dob?: string | number): number | null {
    if (!dob) return null;
    
    let birthYear: number;
    
    if (typeof dob === 'number') {
      birthYear = dob;
    } else if (typeof dob === 'string') {
      // Handle different date formats
      if (dob.includes('/')) {
        // Format: MM/DD/YYYY or DD/MM/YYYY
        const parts = dob.split('/');
        if (parts.length === 3) {
          birthYear = parseInt(parts[2]); // Year is the last part
        } else {
          birthYear = parseInt(dob);
        }
      } else if (dob.includes('-')) {
        // Format: YYYY-MM-DD
        const parts = dob.split('-');
        birthYear = parseInt(parts[0]); // Year is the first part
      } else {
        // Assume it's just a year
        birthYear = parseInt(dob);
      }
    } else {
      return null;
    }
    
    if (isNaN(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
      return null;
    }
    
    return new Date().getFullYear() - birthYear;
  }

  getPlayerFullName(player: Player): string {
    if (player.lastName) {
      return `${player.firstName} ${player.lastName}`;
    }
    return player.firstName;
  }

  getAverageAge(): string {
    const currentHash = this.getDataHash();
    if (this._cachedAverageAge !== null && this._lastDataHash === currentHash) {
      return this._cachedAverageAge.toString();
    }
    
    const ages = this.allPlayers
      .map(p => this.calculateAge(p.DOB))
      .filter(age => age !== null) as number[];
    
    if (ages.length === 0) {
      this._cachedAverageAge = 0;
      this._lastDataHash = currentHash;
      return 'N/A';
    }
    
    const average = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    this._cachedAverageAge = Math.round(average);
    this._lastDataHash = currentHash;
    return this._cachedAverageAge.toString();
  }



  // Performance optimization methods
  private getDataHash(): string {
    return `${this.allPlayers.length}-${this.allPlayers.map(p => p.id).join(',')}`;
  }

  private invalidateCache(): void {
    this._cachedAverageAge = null;
    this._cachedAverageRating = null;
    this._cachedTeamStrength = null;
    this._cachedRatingDistribution = null;
    this._lastDataHash = null;
  }

  // Debounced search method
  onSearchInput(searchTerm: string): void {
    this.searchSubject$.next(searchTerm);
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedPosition = '';
    this.selectedPositions = [];
    this.sortBy = 'firstName';
    this.resetAdvancedFilters();
    this.applyFilters();
    this.cdr.markForCheck();
  }

  // Advanced Filter Methods
  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  resetAdvancedFilters() {
    this.ageRange = { min: 0, max: 100 };
    this.heightRange = { min: 0, max: 300 };
    this.weightRange = { min: 0, max: 300 };
    this.applyFilters();
  }

  // Position Multi-Select Methods
  addPosition(event: Event) {
    const target = event.target as HTMLSelectElement;
    const position = target.value;
    if (position && !this.selectedPositions.includes(position)) {
      this.selectedPositions.push(position);
      this.applyFilters();
    }
    target.value = ''; // Reset select
  }

  removePosition(position: string) {
    this.selectedPositions = this.selectedPositions.filter(p => p !== position);
    this.applyFilters();
  }

  clearPositionFilter() {
    this.selectedPositions = [];
    this.applyFilters();
  }

  getAvailablePositions(): string[] {
    return this.availablePositions.filter(pos => 
      !this.selectedPositions.includes(pos)
    );
  }

  // Enhanced Player Card Methods
  getPlayerRating(player: Player): number {
    // Generate rating based on multiple factors
    let rating = 50; // Base rating
    
    // Age factor (peak at 25-28)
    const age = this.calculateAge(player.DOB);
    if (age) {
      if (age >= 25 && age <= 28) {
        rating += 15;
      } else if (age >= 22 && age <= 31) {
        rating += 10;
      } else if (age >= 18 && age <= 35) {
        rating += 5;
      }
    }
    
    // Height factor for different positions
    if (player.height) {
      if (player.position === 'Thủ môn' && player.height >= 180) {
        rating += 10;
      } else if (player.position === 'Trung vệ' && player.height >= 175) {
        rating += 8;
      } else if (player.height >= 165 && player.height <= 185) {
        rating += 5;
      }
    }
    
    // Random factor for variety
    rating += Math.floor(Math.random() * 20) - 10;
    
    return Math.min(Math.max(rating, 30), 95);
  }

  getPlayerSkills(player: Player): string[] {
    const skills: string[] = [];
    const position = player.position;
    
    // Position-based skills
    switch (position) {
      case 'Thủ môn':
        skills.push('Phản xạ', 'Bắt bóng');
        break;
      case 'Hậu vệ':
        skills.push('Phòng ngự', 'Tranh chấp');
        break;
      case 'Trung vệ':
        skills.push('Đánh đầu', 'Phòng ngự');
        break;
      case 'Tiền vệ':
        skills.push('Chuyền bóng', 'Kiến tạo');
        break;
      case 'Tiền đạo':
        skills.push('Ghi bàn', 'Dứt điểm');
        break;
    }
    
    // Add random secondary skill
    const allSkills = ['Tốc độ', 'Kỹ thuật', 'Thể lực', 'Chiến thuật', 'Lãnh đạo'];
    const randomSkill = allSkills[Math.floor(Math.random() * allSkills.length)];
    if (!skills.includes(randomSkill)) {
      skills.push(randomSkill);
    }
    
    return skills.slice(0, 2); // Limit to 2 skills per player
  }

  getHeightIndicator(height?: number): string {
    if (!height) return 'indicator-neutral';
    if (height >= 185) return 'indicator-high';
    if (height >= 175) return 'indicator-good';
    if (height >= 165) return 'indicator-average';
    return 'indicator-low';
  }

  getWeightIndicator(weight?: number): string {
    if (!weight) return 'indicator-neutral';
    if (weight >= 85) return 'indicator-high';
    if (weight >= 75) return 'indicator-good';
    if (weight >= 60) return 'indicator-average';
    return 'indicator-low';
  }

  getAgeCategory(age: number | null): string {
    if (!age) return '';
    if (age < 20) return 'Trẻ';
    if (age < 25) return 'Tài năng';
    if (age < 30) return 'Kinh nghiệm';
    if (age < 35) return 'Kỳ cựu';
    return 'Cao tuổi';
  }

  getPerformanceScore(player: Player): number {
    // Generate performance score based on rating and other factors
    const rating = this.getPlayerRating(player);
    const age = this.calculateAge(player.DOB) || 25;
    
    let performance = rating;
    
    // Age adjustment
    if (age < 20) performance -= 5;
    if (age > 32) performance -= 10;
    
    // Add some randomness for variety
    performance += Math.floor(Math.random() * 10) - 5;
    
    return Math.min(Math.max(performance, 0), 100);
  }

  // Bulk Operations Methods
  getPlayerId(player: Player): string {
    // Generate consistent ID from player data
    return `${player.firstName}-${player.lastName}-${player.position}`.toLowerCase().replace(/\s+/g, '-');
  }

  toggleBulkSelectMode() {
    this.bulkSelectMode = !this.bulkSelectMode;
    if (!this.bulkSelectMode) {
      this.selectedPlayerIds.clear();
    }
  }

  togglePlayerSelection(playerId: string) {
    if (this.selectedPlayerIds.has(playerId)) {
      this.selectedPlayerIds.delete(playerId);
    } else {
      this.selectedPlayerIds.add(playerId);
    }
  }

  isPlayerSelected(playerId: string): boolean {
    return this.selectedPlayerIds.has(playerId);
  }

  selectAllVisible() {
    this.paginatedPlayers.forEach(player => {
      this.selectedPlayerIds.add(this.getPlayerId(player));
    });
  }

  clearSelection() {
    this.selectedPlayerIds.clear();
  }

  areAllVisibleSelected(): boolean {
    return this.paginatedPlayers.length > 0 && 
           this.paginatedPlayers.every(player => 
             this.selectedPlayerIds.has(this.getPlayerId(player))
           );
  }

  isSomeVisibleSelected(): boolean {
    return this.paginatedPlayers.some(player => 
      this.selectedPlayerIds.has(this.getPlayerId(player))
    ) && !this.areAllVisibleSelected();
  }

  toggleAllVisible() {
    if (this.areAllVisibleSelected()) {
      this.paginatedPlayers.forEach(player => {
        this.selectedPlayerIds.delete(this.getPlayerId(player));
      });
    } else {
      this.selectAllVisible();
    }
  }

  bulkExport() {
    const selectedPlayers = this.allPlayers.filter(player => 
      this.selectedPlayerIds.has(this.getPlayerId(player))
    );

    if (selectedPlayers.length === 0) {
      alert('Vui lòng chọn ít nhất một cầu thủ để xuất dữ liệu!');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalPlayers: selectedPlayers.length,
      players: selectedPlayers.map(player => ({
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: this.calculateAge(player.DOB),
        height: player.height,
        weight: player.weight,
        rating: this.getPlayerRating(player),
        skills: this.getPlayerSkills(player),
        notes: player.note
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `selected-players-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Đã xuất dữ liệu ${selectedPlayers.length} cầu thủ!`);
  }

  bulkChangePosition() {
    if (this.selectedPlayerIds.size === 0) {
      alert('Vui lòng chọn ít nhất một cầu thủ để thay đổi vị trí!');
      return;
    }

    const newPosition = prompt('Nhập vị trí mới:\n- Thủ môn\n- Hậu vệ\n- Trung vệ\n- Tiền vệ\n- Tiền đạo');
    
    if (newPosition && this.availablePositions.includes(newPosition)) {
      const selectedPlayers = this.corePlayersData.filter(player => {
        const playerId = `${player.firstName}-${player.lastName}-${player.position}`.toLowerCase().replace(/\s+/g, '-');
        return this.selectedPlayerIds.has(playerId);
      });

      if (selectedPlayers.length > 0) {
        const updatePromises = selectedPlayers.map(player => 
          this.playerService.updatePlayer(player.id, { ...player, position: newPosition })
        );

        Promise.all(updatePromises).then(() => {
          alert(`Đã cập nhật vị trí cho ${selectedPlayers.length} cầu thủ!`);
          this.loadPlayersFromService();
          this.clearSelection();
        }).catch(error => {
          console.error('Error updating players:', error);
          alert('Có lỗi xảy ra khi cập nhật vị trí cầu thủ!');
        });
      }
    } else if (newPosition) {
      alert('Vị trí không hợp lệ! Vui lòng chọn một trong các vị trí có sẵn.');
    }
  }

  bulkDelete() {
    if (this.selectedPlayerIds.size === 0) {
      alert('Vui lòng chọn ít nhất một cầu thủ để xóa!');
      return;
    }

    const confirmed = confirm(`Bạn có chắc chắn muốn xóa ${this.selectedPlayerIds.size} cầu thủ đã chọn?\n\nHành động này không thể hoàn tác!`);
    
    if (confirmed) {
      const selectedPlayers = this.corePlayersData.filter(player => {
        const playerId = `${player.firstName}-${player.lastName}-${player.position}`.toLowerCase().replace(/\s+/g, '-');
        return this.selectedPlayerIds.has(playerId);
      });

      if (selectedPlayers.length > 0) {
        const deletePromises = selectedPlayers.map(player => 
          this.playerService.deletePlayer(player.id)
        );

        Promise.all(deletePromises).then(() => {
          alert(`Đã xóa ${selectedPlayers.length} cầu thủ!`);
          this.loadPlayersFromService();
          this.clearSelection();
          this.bulkSelectMode = false;
        }).catch(error => {
          console.error('Error deleting players:', error);
          alert('Có lỗi xảy ra khi xóa cầu thủ!');
        });
      }
    }
  }

  // Enhanced Analytics Methods
  getPlayersByPosition(position: string): Player[] {
    return this.allPlayers.filter(player => player.position === position);
  }

  getPositionPercentage(position: string): number {
    const count = this.getPlayersByPosition(position).length;
    return this.allPlayers.length > 0 ? (count / this.allPlayers.length) * 100 : 0;
  }

  getPlayersByAgeGroup(group: 'young' | 'prime' | 'veteran'): Player[] {
    return this.allPlayers.filter(player => {
      const age = this.calculateAge(player.DOB);
      if (!age) return false;
      
      switch (group) {
        case 'young': return age < 23;
        case 'prime': return age >= 23 && age <= 30;
        case 'veteran': return age > 30;
        default: return false;
      }
    });
  }

  getAverageRating(): number {
    const currentHash = this.getDataHash();
    if (this._cachedAverageRating !== null && this._lastDataHash === currentHash) {
      return this._cachedAverageRating;
    }
    
    if (this.allPlayers.length === 0) {
      this._cachedAverageRating = 0;
      this._lastDataHash = currentHash;
      return 0;
    }
    
    const totalRating = this.allPlayers.reduce((sum, player) => 
      sum + this.getPlayerRating(player), 0);
    
    this._cachedAverageRating = Math.round(totalRating / this.allPlayers.length);
    this._lastDataHash = currentHash;
    return this._cachedAverageRating;
  }

  getPlayersByRating(category: 'excellent' | 'good' | 'average' | 'poor'): Player[] {
    return this.allPlayers.filter(player => {
      const rating = this.getPlayerRating(player);
      switch (category) {
        case 'excellent': return rating >= 85;
        case 'good': return rating >= 75 && rating < 85;
        case 'average': return rating >= 65 && rating < 75;
        case 'poor': return rating < 65;
        default: return false;
      }
    });
  }

  getRatingDistribution(): { excellent: number; good: number; average: number; poor: number } {
    const currentHash = this.getDataHash();
    if (this._cachedRatingDistribution !== null && this._lastDataHash === currentHash) {
      return this._cachedRatingDistribution;
    }
    
    const total = this.allPlayers.length;
    if (total === 0) {
      this._cachedRatingDistribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      this._lastDataHash = currentHash;
      return this._cachedRatingDistribution;
    }
    
    this._cachedRatingDistribution = {
      excellent: (this.getPlayersByRating('excellent').length / total) * 100,
      good: (this.getPlayersByRating('good').length / total) * 100,
      average: (this.getPlayersByRating('average').length / total) * 100,
      poor: (this.getPlayersByRating('poor').length / total) * 100
    };
    this._lastDataHash = currentHash;
    return this._cachedRatingDistribution;
  }

  getTeamStrength(): number {
    if (this.allPlayers.length === 0) return 0;
    
    const avgRating = this.getAverageRating();
    const positionBalance = this.availablePositions.length >= 5 ? 10 : this.availablePositions.length * 2;
    const squadDepth = Math.min(this.allPlayers.length / 25 * 15, 15); // Bonus for squad depth
    const ageBalance = this.calculateAgeBalance();
    
    const strength = (avgRating * 0.6) + positionBalance + squadDepth + ageBalance;
    return Math.min(Math.round(strength), 100);
  }

  calculateAgeBalance(): number {
    const youngCount = this.getPlayersByAgeGroup('young').length;
    const primeCount = this.getPlayersByAgeGroup('prime').length;
    const veteranCount = this.getPlayersByAgeGroup('veteran').length;
    
    // Ideal balance: 30% young, 50% prime, 20% veteran
    const total = this.allPlayers.length;
    if (total === 0) return 0;
    
    const youngRatio = youngCount / total;
    const primeRatio = primeCount / total;
    const veteranRatio = veteranCount / total;
    
    const youngBalance = Math.max(0, 10 - Math.abs(youngRatio - 0.3) * 20);
    const primeBalance = Math.max(0, 10 - Math.abs(primeRatio - 0.5) * 20);
    const veteranBalance = Math.max(0, 5 - Math.abs(veteranRatio - 0.2) * 25);
    
    return (youngBalance + primeBalance + veteranBalance) / 3;
  }

  // List Enhancement Methods


  // Data Visualization Methods
  toggleVisualization() {
    this.showVisualization = !this.showVisualization;
  }

  getPositionColor(position: string): string {
    const colorMap: Record<string, string> = {
      'Thủ môn': 'goalkeeper',
      'Hậu vệ': 'defender',
      'Trung vệ': 'centerback',
      'Tiền vệ': 'midfielder',
      'Tiền đạo': 'forward'
    };
    return colorMap[position] || 'default';
  }

  getAgeHistogram(): {range: string, count: number, percentage: number, class: string, label: string}[] {
    const ageRanges = [
      { min: 16, max: 20, label: '16-20', class: 'very-young' },
      { min: 21, max: 25, label: '21-25', class: 'young' },
      { min: 26, max: 30, label: '26-30', class: 'prime' },
      { min: 31, max: 35, label: '31-35', class: 'veteran' },
      { min: 36, max: 45, label: '36+', class: 'senior' }
    ];

    const histogram = ageRanges.map(range => {
      const count = this.allPlayers.filter(player => {
        const age = this.calculateAge(player.DOB);
        return age !== null && age >= range.min && age <= range.max;
      }).length;

      const maxCount = Math.max(...ageRanges.map(r => 
        this.allPlayers.filter(p => {
          const age = this.calculateAge(p.DOB);
          return age !== null && age >= r.min && age <= r.max;
        }).length
      ));

      return {
        range: `${range.min}-${range.max}`,
        count,
        percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
        class: range.class,
        label: range.label
      };
    });

    return histogram;
  }

  getHeightPercentile(height?: number): number {
    if (!height) return 0;
    const minHeight = 150;
    const maxHeight = 200;
    return ((height - minHeight) / (maxHeight - minHeight)) * 100;
  }

  getWeightPercentile(weight?: number): number {
    if (!weight) return 0;
    const minWeight = 40;
    const maxWeight = 120;
    return ((weight - minWeight) / (maxWeight - minWeight)) * 100;
  }

  getPositionStrength(category: 'attack' | 'midfield' | 'defense' | 'goalkeeper'): number {
    let relevantPlayers: Player[] = [];
    
    switch (category) {
      case 'attack':
        relevantPlayers = this.allPlayers.filter(p => p.position === 'Tiền đạo');
        break;
      case 'midfield':
        relevantPlayers = this.allPlayers.filter(p => p.position === 'Tiền vệ');
        break;
      case 'defense':
        relevantPlayers = this.allPlayers.filter(p => 
          p.position === 'Hậu vệ' || p.position === 'Trung vệ');
        break;
      case 'goalkeeper':
        relevantPlayers = this.allPlayers.filter(p => p.position === 'Thủ môn');
        break;
    }

    if (relevantPlayers.length === 0) return 0;

    const avgRating = relevantPlayers.reduce((sum, player) => 
      sum + this.getPlayerRating(player), 0) / relevantPlayers.length;
    
    const depthBonus = Math.min(relevantPlayers.length / 5 * 10, 15);
    
    return Math.min((avgRating / 100 * 85) + depthBonus, 100);
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }



  viewPlayerDetails(player: Player) {
    this.selectedPlayer = player;
    
    // Remove any existing modal
    this.closePlayerDetails();
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 20px;
        backdrop-filter: blur(5px);
      ">
        <div class="player-detail-modal" style="
          background: white;
          border-radius: 20px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
          position: relative;
          padding: 0;
        ">
          <div class="modal-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 30px;
            border-bottom: 2px solid #f0f0f0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px 20px 0 0;
          ">
            <h4 style="margin: 0; font-size: 1.5rem; font-weight: 600;">${this.getPlayerFullName(player)}</h4>
            <button class="close-btn" style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              color: white;
              font-size: 24px;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
          </div>
          <div class="modal-content" style="padding: 30px;">
            <div class="player-avatar-section" style="text-align: center; margin-bottom: 30px;">
              <img src="${player.avatar}" alt="${player.firstName}" style="
                width: 120px;
                height: 120px;
                border-radius: 50%;
                object-fit: cover;
                border: 5px solid #667eea;
                margin-bottom: 15px;
              ">
              <div style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 25px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 500;
              ">
                <i class="fas fa-check-circle"></i>
                Cầu thủ đăng ký
              </div>
            </div>
            
            <div class="player-details-grid">
              <div class="detail-section" style="margin-bottom: 25px;">
                <h5 style="
                  color: #667eea;
                  margin-bottom: 15px;
                  font-size: 1.1rem;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <i class="fas fa-info-circle"></i>Thông tin cơ bản
                </h5>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 500; color: #475569;">Vị trí:</span>
                  <span style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                  ">
                    <i class="fas fa-futbol"></i>
                    ${player.position}
                  </span>
                </div>
                ${player.DOB ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 500; color: #475569;">Năm sinh:</span>
                  <span>${player.DOB} <span style="color: #667eea; font-weight: 500;">(${this.calculateAge(player.DOB)} tuổi)</span></span>
                </div>
                ` : ''}
              </div>

              ${player.height || player.weight ? `
              <div class="detail-section" style="margin-bottom: 25px;">
                <h5 style="
                  color: #667eea;
                  margin-bottom: 15px;
                  font-size: 1.1rem;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <i class="fas fa-ruler-vertical"></i>Thông số
                </h5>
                ${player.height ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 500; color: #475569;">Chiều cao:</span>
                  <span>${player.height} cm</span>
                </div>
                ` : ''}
                ${player.weight ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 500; color: #475569;">Cân nặng:</span>
                  <span>${player.weight} kg</span>
                </div>
                ` : ''}
              </div>
              ` : ''}

              ${player.note ? `
              <div class="detail-section">
                <h5 style="
                  color: #667eea;
                  margin-bottom: 15px;
                  font-size: 1.1rem;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <i class="fas fa-sticky-note"></i>Ghi chú
                </h5>
                <div style="
                  background: #f8fafc;
                  padding: 15px;
                  border-radius: 10px;
                  color: #475569;
                  line-height: 1.6;
                ">
                  ${player.note}
                </div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Create modal element
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    modalDiv.id = 'player-modal';
    
    // Add to document body
    document.body.appendChild(modalDiv);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    const overlay = modalDiv.querySelector('.modal-overlay') as HTMLElement;
    const closeBtn = modalDiv.querySelector('.close-btn') as HTMLElement;
    
    const closeModal = () => {
      this.closePlayerDetails();
    };
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
    
    closeBtn.addEventListener('click', closeModal);
    
    // Add keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  closePlayerDetails() {
    this.selectedPlayer = null;
    
    // Remove modal from DOM
    const existingModal = document.getElementById('player-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Restore body scrolling
    document.body.style.overflow = '';
  }

  exportPlayerStats() {
    const stats = {
      totalPlayers: this.allPlayers.length,
      positions: this.availablePositions,
      averageAge: this.getAverageAge(),
      players: this.allPlayers.map(p => ({
        name: `${p.firstName} ${p.lastName}`,
        position: p.position,
        age: this.calculateAge(p.DOB),
        height: p.height,
        weight: p.weight
      }))
    };

    const dataStr = JSON.stringify(stats, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'thanglong-fc-player-stats.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  onAvatarError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default-avatar.svg';
  }

  onModalKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closePlayerDetails();
    }
  }

  // Load players from PlayerService (Firebase)
  async loadPlayersFromService() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // Force PlayerService to reload data
      await this.playerService.refreshPlayers();
      
      // Subscribe to core players data
      this.playerService.players$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (corePlayersData) => {
            this.corePlayersData = corePlayersData;
            this.convertCorePlayersToLegacyFormat(corePlayersData);
            this.processPlayersData();
            this.isLoading = false;
            
            // Complete performance monitoring after successful load
            if (this.componentLoadId) {
              this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
              this.componentLoadId = null;
            }
          },
          error: (error) => {
            console.error('Error loading players from service:', error);
            this.errorMessage = `Error loading players: ${error}`;
            this.isLoading = false;
            
            // Fallback to JSON file if service fails
            this.testLoadPlayers();
          }
        });
      
    } catch (error) {
      console.error('Error in loadPlayersFromService:', error);
      this.errorMessage = `Service error: ${error}`;
      this.isLoading = false;
      
      // Fallback to JSON file
      this.testLoadPlayers();
    }
  }

  // Convert PlayerInfo[] to Player[] format for compatibility
  convertCorePlayersToLegacyFormat(corePlayersData: PlayerInfo[]) {
    this.allPlayers = corePlayersData.map(playerInfo => ({
      id: playerInfo.id || 0,
      firstName: playerInfo.firstName || '',
      lastName: playerInfo.lastName || '',
      position: playerInfo.position || '',
      avatar: playerInfo.avatar || `${playerInfo.firstName}.png`,
      DOB: playerInfo.dateOfBirth || '',
      height: playerInfo.height || 0,
      weight: playerInfo.weight || 0,
      note: playerInfo.notes || ''
    } as Player));
  }

  // Player Management Methods
  openCreatePlayerModal(): void {
    this.isEditMode = false;
    this.playerFormData = {
      firstName: '',
      lastName: '',
      position: '',
      dateOfBirth: '',
      height: undefined,
      weight: undefined,
      notes: '',
      avatar: ''
    };
    this.showPlayerModal = true;
    this.preventBodyScroll();
    this.ensureModalVisible();
  }

  openEditPlayerModal(player: Player): void {
    // Find the corresponding PlayerInfo from corePlayersData
    const playerInfo = this.corePlayersData.find(p => 
      p.firstName === player.firstName && 
      p.lastName === player.lastName
    );
    
    if (playerInfo) {
      this.isEditMode = true;
      this.playerFormData = { ...playerInfo };
      this.openDynamicEditModal(playerInfo);
    } else {
      console.error('No matching PlayerInfo found for:', player);
      alert('Could not find player data for editing. Please try refreshing the page.');
    }
  }

  closePlayerFormModal(): void {
    this.showPlayerModal = false;
    this.playerFormData = {};
    this.isEditMode = false;
    this.isSaving = false;
    this.allowBodyScroll();
  }

  async savePlayerData(): Promise<void> {
    if (!this.playerFormData.firstName || !this.playerFormData.position) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    this.isSaving = true;
    try {
      if (this.isEditMode && this.playerFormData.id) {
        // Update existing player
        await this.playerService.updatePlayer(this.playerFormData.id, this.playerFormData);
        alert('Cập nhật cầu thủ thành công!');
      } else {
        // Create new player
        const newPlayer = {
          firstName: this.playerFormData.firstName!,
          lastName: this.playerFormData.lastName || '',
          position: this.playerFormData.position!,
          dateOfBirth: this.playerFormData.dateOfBirth || '',
          height: this.playerFormData.height || 0,
          weight: this.playerFormData.weight || 0,
          notes: this.playerFormData.notes || '',
          avatar: this.playerFormData.avatar || '',
          isRegistered: true,
          status: PlayerStatus.ACTIVE
        };
        await this.playerService.createPlayer(newPlayer);
        alert('Thêm cầu thủ mới thành công!');
      }
      
      this.closePlayerFormModal();
      // Refresh the player list
      await this.testLoadPlayers();
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Có lỗi xảy ra khi lưu thông tin cầu thủ!');
    } finally {
      this.isSaving = false;
    }
  }

  confirmDeletePlayer(player: Player): void {

    
    // Find the corresponding PlayerInfo from corePlayersData
    const playerInfo = this.corePlayersData.find(p => 
      p.firstName === player.firstName && 
      p.lastName === player.lastName
    );
    

    
    if (playerInfo) {
      this.playerToDelete = playerInfo;
      this.openDynamicDeleteModal(playerInfo);

    } else {
      console.error('❌ No matching PlayerInfo found for deletion:', player);
      alert('Could not find player data for deletion. Please try refreshing the page.');
    }
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.playerToDelete = null;
    this.isSaving = false;
    this.allowBodyScroll();
  }

  async executeDeletePlayer(): Promise<void> {
    if (!this.playerToDelete?.id) {
      alert('Không tìm thấy thông tin cầu thủ để xóa!');
      return;
    }

    this.isSaving = true;
    try {
      await this.playerService.deletePlayer(this.playerToDelete.id);
      alert(`Đã xóa cầu thủ ${this.playerToDelete.firstName} ${this.playerToDelete.lastName}`);
      this.closeDeleteConfirm();
      // Refresh the player list
      await this.loadPlayersFromService();
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Có lỗi xảy ra khi xóa cầu thủ!');
    } finally {
      this.isSaving = false;
    }
  }

  // Helper methods for body scroll management
  preventBodyScroll(): void {
    // Store current scroll position
    const scrollY = window.scrollY;
    
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    const scrollbarWidth = this.getScrollbarWidth();
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    // Store scroll position for restoration
    document.body.setAttribute('data-scroll-y', scrollY.toString());
  }

  allowBodyScroll(): void {
    document.body.classList.remove('modal-open');
    
    // Restore scroll position
    const scrollY = document.body.getAttribute('data-scroll-y');
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    
    // Restore scroll position
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY, 10));
      document.body.removeAttribute('data-scroll-y');
    }
  }

  private getScrollbarWidth(): number {
    // Simple method to get scrollbar width
    return window.innerWidth - document.documentElement.clientWidth;
  }

  private ensureModalVisible(): void {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      // Force the modal to appear in viewport
      const modalElement = document.querySelector('.modal-overlay') as HTMLElement;
      if (modalElement) {
        modalElement.scrollIntoView({ 
          behavior: 'instant', 
          block: 'center',
          inline: 'center'
        });
        
        // Double check by forcing viewport position
        modalElement.style.position = 'fixed';
        modalElement.style.top = '0';
        modalElement.style.left = '0';
        modalElement.style.width = '100vw';
        modalElement.style.height = '100vh';
        modalElement.style.zIndex = '99999';
      }
    }, 0);
  }

  openDynamicEditModal(playerInfo: PlayerInfo): void {
    // Remove any existing modal
    this.closeDynamicModal();

    const modalHTML = `
      <div class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 20px;
        backdrop-filter: blur(8px);
      ">
        <div class="player-modal" style="
          background: white;
          border-radius: 20px;
          max-width: 500px;
          width: 95%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
          position: relative;
          display: flex;
          flex-direction: column;
        ">
          <div class="modal-header" style="
            padding: 20px 24px 15px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px 20px 0 0;
          ">
            <h3 style="margin: 0; color: white; font-size: 1.4rem; font-weight: 600;">
              <i class="fas fa-user-edit" style="margin-right: 8px;"></i>
              Chỉnh sửa cầu thủ
            </h3>
            <button class="close-btn" style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: white;
              padding: 8px;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
          </div>
          
          <div class="modal-content" style="padding: 24px; flex: 1; overflow-y: auto;">
            <form id="editPlayerForm">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Tên *</label>
                  <input type="text" name="firstName" value="${playerInfo.firstName || ''}" required style="
                    padding: 14px 16px;
                    border: 2px solid #e8eaed;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                  " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
                </div>
                
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Họ</label>
                  <input type="text" name="lastName" value="${playerInfo.lastName || ''}" style="
                    padding: 14px 16px;
                    border: 2px solid #e8eaed;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                  " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
                </div>
                
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Vị trí *</label>
                  <select name="position" required style="
                    padding: 14px 16px;
                    border: 2px solid #e8eaed;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                  " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
                    <option value="">Chọn vị trí</option>
                    <option value="Thủ môn" ${playerInfo.position === 'Thủ môn' ? 'selected' : ''}>Thủ môn</option>
                    <option value="Hậu vệ" ${playerInfo.position === 'Hậu vệ' ? 'selected' : ''}>Hậu vệ</option>
                    <option value="Trung vệ" ${playerInfo.position === 'Trung vệ' ? 'selected' : ''}>Trung vệ</option>
                    <option value="Tiền vệ" ${playerInfo.position === 'Tiền vệ' ? 'selected' : ''}>Tiền vệ</option>
                    <option value="Tiền đạo" ${playerInfo.position === 'Tiền đạo' ? 'selected' : ''}>Tiền đạo</option>
                  </select>
                </div>
                
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Ngày sinh</label>
                  <input type="date" name="dateOfBirth" value="${playerInfo.dateOfBirth || ''}" style="
                    padding: 14px 16px;
                    border: 2px solid #e8eaed;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                  " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
                </div>
                
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Chiều cao (cm)</label>
                  <input type="number" name="height" value="${playerInfo.height || ''}" min="0" max="250" style="
                    padding: 14px 16px;
                    border: 2px solid #e8eaed;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                  " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
                </div>
                
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Cân nặng (kg)</label>
                  <input type="number" name="weight" value="${playerInfo.weight || ''}" min="0" max="200" style="
                    padding: 14px 16px;
                    border: 2px solid #e8eaed;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #fafbfc;
                  " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
                </div>
              </div>
              
              <div style="display: flex; flex-direction: column; margin-bottom: 20px;">
                <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Ghi chú</label>
                <textarea name="notes" rows="3" placeholder="Thông tin thêm về cầu thủ..." style="
                  padding: 14px 16px;
                  border: 2px solid #e8eaed;
                  border-radius: 10px;
                  font-size: 1rem;
                  transition: all 0.3s ease;
                  background: #fafbfc;
                  resize: vertical;
                " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">${playerInfo.notes || ''}</textarea>
              </div>
              
              <div style="display: flex; flex-direction: column; margin-bottom: 20px;">
                <label style="margin-bottom: 10px; font-weight: 600; color: #374151; font-size: 0.95rem;">Avatar URL</label>
                <input type="url" name="avatar" value="${playerInfo.avatar || ''}" placeholder="https://example.com/avatar.jpg" style="
                  padding: 14px 16px;
                  border: 2px solid #e8eaed;
                  border-radius: 10px;
                  font-size: 1rem;
                  transition: all 0.3s ease;
                  background: #fafbfc;
                " onfocus="this.style.borderColor='#667eea'; this.style.background='white';" onblur="this.style.borderColor='#e8eaed'; this.style.background='#fafbfc';">
              </div>
              
              <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <button type="button" class="btn-cancel" style="
                  padding: 12px 24px;
                  border: 2px solid #e0e0e0;
                  background: #f5f5f5;
                  color: #666;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 1rem;
                  font-weight: 500;
                  transition: all 0.3s ease;
                " onmouseover="this.style.background='#eeeeee'; this.style.color='#333';" onmouseout="this.style.background='#f5f5f5'; this.style.color='#666';">
                  <i class="fas fa-times" style="margin-right: 4px;"></i>Hủy
                </button>
                <button type="submit" class="btn-save" style="
                  padding: 12px 24px;
                  border: none;
                  background: linear-gradient(135deg, #4CAF50, #45a049);
                  color: white;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 1rem;
                  font-weight: 500;
                  transition: all 0.3s ease;
                " onmouseover="this.style.background='linear-gradient(135deg, #45a049, #3d8b40)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.background='linear-gradient(135deg, #4CAF50, #45a049)'; this.style.transform='translateY(0)';">
                  <i class="fas fa-save" style="margin-right: 4px;"></i>Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Create modal element
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    modalDiv.id = 'edit-player-modal';
    
    // Add to document body
    document.body.appendChild(modalDiv);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    this.setupModalEventListeners(modalDiv, playerInfo);
  }

  openDynamicDeleteModal(playerInfo: PlayerInfo): void {
    // Remove any existing modal
    this.closeDynamicModal();

    const modalHTML = `
      <div class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 20px;
        backdrop-filter: blur(8px);
      ">
        <div class="confirm-modal" style="
          background: white;
          border-radius: 20px;
          max-width: 400px;
          width: 95%;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
          position: relative;
          display: flex;
          flex-direction: column;
        ">
          <div class="modal-header" style="
            padding: 20px 24px 15px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #f44336, #d32f2f);
            color: white;
            border-radius: 20px 20px 0 0;
          ">
            <h3 style="margin: 0; color: white; font-size: 1.3rem; font-weight: 600;">
              <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
              Xác nhận xóa
            </h3>
          </div>
          
          <div class="modal-content" style="padding: 24px;">
            <p style="margin: 0 0 10px 0; color: #374151; font-size: 1rem;">
              Bạn có chắc chắn muốn xóa cầu thủ <strong>${playerInfo.firstName} ${playerInfo.lastName}</strong>?
            </p>
            <p style="margin: 0; color: #f44336; font-weight: 500; font-style: italic; font-size: 0.9rem;">
              Hành động này không thể hoàn tác!
            </p>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end; padding: 0 24px 24px 24px;">
            <button type="button" class="btn-cancel" style="
              padding: 12px 24px;
              border: 2px solid #e0e0e0;
              background: #f5f5f5;
              color: #666;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 500;
              transition: all 0.3s ease;
            " onmouseover="this.style.background='#eeeeee'; this.style.color='#333';" onmouseout="this.style.background='#f5f5f5'; this.style.color='#666';">
              <i class="fas fa-times" style="margin-right: 4px;"></i>Hủy
            </button>
            <button type="button" class="btn-delete" style="
              padding: 12px 24px;
              border: none;
              background: linear-gradient(135deg, #f44336, #d32f2f);
              color: white;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 500;
              transition: all 0.3s ease;
            " onmouseover="this.style.background='linear-gradient(135deg, #d32f2f, #c62828)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.background='linear-gradient(135deg, #f44336, #d32f2f)'; this.style.transform='translateY(0)';">
              <i class="fas fa-trash" style="margin-right: 4px;"></i>Xóa
            </button>
          </div>
        </div>
      </div>
    `;

    // Create modal element
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    modalDiv.id = 'delete-player-modal';
    
    // Add to document body
    document.body.appendChild(modalDiv);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Add event listeners for delete modal
    this.setupDeleteModalEventListeners(modalDiv, playerInfo);
  }

  private closeDynamicModal(): void {
    // Remove any existing modals
    const existingEditModal = document.getElementById('edit-player-modal');
    const existingDeleteModal = document.getElementById('delete-player-modal');
    const existingDetailModal = document.getElementById('player-modal');
    
    if (existingEditModal) {
      existingEditModal.remove();
    }
    if (existingDeleteModal) {
      existingDeleteModal.remove();
    }
    if (existingDetailModal) {
      existingDetailModal.remove();
    }
    
    // Restore body scrolling
    document.body.style.overflow = '';
  }

  private setupModalEventListeners(modalDiv: HTMLElement, playerInfo: PlayerInfo): void {
    // Close button event
    const closeBtn = modalDiv.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeDynamicModal();
      });
    }

    // Cancel button event
    const cancelBtn = modalDiv.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeDynamicModal();
      });
    }

    // Form submission event
    const form = modalDiv.querySelector('#editPlayerForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        this.handleEditFormSubmission(form, playerInfo);
      });
    }

    // Click outside modal to close
    const overlay = modalDiv.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e: Event) => {
        if (e.target === overlay) {
          this.closeDynamicModal();
        }
      });
    }
  }

  private setupDeleteModalEventListeners(modalDiv: HTMLElement, playerInfo: PlayerInfo): void {
    // Cancel button event
    const cancelBtn = modalDiv.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeDynamicModal();
      });
    }

    // Delete button event
    const deleteBtn = modalDiv.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleDeleteConfirmation(playerInfo);
      });
    }

    // Click outside modal to close
    const overlay = modalDiv.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e: Event) => {
        if (e.target === overlay) {
          this.closeDynamicModal();
        }
      });
    }
  }

  private async handleEditFormSubmission(form: HTMLFormElement, originalPlayer: PlayerInfo): Promise<void> {
    const formData = new FormData(form);
    
    // Create updated player object
    const updatedPlayer: PlayerInfo = {
      ...originalPlayer,
      firstName: formData.get('firstName') as string || '',
      lastName: formData.get('lastName') as string || '',
      position: formData.get('position') as string || '',
      dateOfBirth: formData.get('dateOfBirth') as string || undefined,
      height: formData.get('height') ? Number(formData.get('height')) : undefined,
      weight: formData.get('weight') ? Number(formData.get('weight')) : undefined,
      notes: formData.get('notes') as string || undefined,
      avatar: formData.get('avatar') as string || undefined
    };



    try {
      // Call the service to update player
      await this.playerService.updatePlayer(updatedPlayer.id, updatedPlayer);

      this.loadPlayersFromService(); // Reload the list
      this.closeDynamicModal();
      alert('Cập nhật thông tin cầu thủ thành công!');
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin cầu thủ!');
    }
  }

  private async handleDeleteConfirmation(playerInfo: PlayerInfo): Promise<void> {


    try {
      await this.playerService.deletePlayer(playerInfo.id);

      this.loadPlayersFromService(); // Reload the list
      this.closeDynamicModal();
      alert('Xóa cầu thủ thành công!');
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Có lỗi xảy ra khi xóa cầu thủ!');
    }
  }

  ngOnDestroy() {
    // Complete any ongoing subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Restore body scroll in case modal was open
    this.allowBodyScroll();
    
    // End performance monitoring for this component
    if (this.componentLoadId) {
      this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
    }
    
    // Clean up any existing modal
    this.closePlayerDetails();
  }

  // Pagination Methods (Optimized)
  updatePagination(): void {
    const totalPlayers = this.filteredPlayers.length;
    this.totalPages = Math.ceil(totalPlayers / this.pageSize);
    
    // Reset to first page if current page is beyond available pages
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = 0;
    }
    
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalPlayers);
    this.paginatedPlayers = this.filteredPlayers.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPaginationInfo(): { start: number; end: number; total: number } {
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.filteredPlayers.length);
    return { start, end, total: this.filteredPlayers.length };
  }
}