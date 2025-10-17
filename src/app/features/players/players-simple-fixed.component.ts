import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { PlayerService } from '../../core/services/player.service';
import { PlayerInfo } from '../../core/models/player.model';
import { PerformanceService } from '../../services/performance.service';
import { AssetOptimizationService } from '../../services/asset-optimization.service';

@Component({
  selector: 'app-players-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="players-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="title-text">
          <h1>Thông tin cầu thủ</h1>
          <p>Quản lý và theo dõi thông tin chi tiết của tất cả cầu thủ</p>
        </div>
        
        <div class="header-stats">
          <div class="quick-stat">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ filteredPlayers.length }}</div>
              <div class="stat-label">Tổng cầu thủ</div>
            </div>
          </div>
          
          <div class="quick-stat">
            <div class="stat-icon">
              <i class="fas fa-trophy"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ getTopPlayers().length }}</div>
              <div class="stat-label">Cầu thủ xuất sắc</div>
            </div>
          </div>
          
          <div class="quick-stat">
            <div class="stat-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ getAverageAge() }}</div>
              <div class="stat-label">Tuổi TB</div>
            </div>
          </div>
          
          <div class="quick-stat">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ lastUpdate ? (lastUpdate | date:'HH:mm') : '--' }}</div>
              <div class="stat-label">Cập nhật lần cuối</div>
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
      <div *ngIf="errorMessage && !isLoading" class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Có lỗi xảy ra</h3>
        <p>{{ errorMessage }}</p>
        <button (click)="testLoadPlayers()" class="retry-btn">
          <i class="fas fa-redo"></i>
          Thử lại
        </button>
      </div>

      <!-- Filters Section -->
      <div *ngIf="!isLoading && !errorMessage" class="filters-section">
        <div class="search-container">
          <div class="search-box">
            <i class="fas fa-search search-icon"></i>
            <input 
              type="text" 
              placeholder="Tìm kiếm cầu thủ..." 
              (input)="onSearchInput($event)"
              class="search-input">
          </div>
          
          <div class="filter-group">
            <select (change)="onPositionFilterChange($event)" class="filter-select">
              <option value="">Tất cả vị trí</option>
              <option *ngFor="let position of availablePositions; trackBy: trackByPositionName" [value]="position">
                {{ position }}
              </option>
            </select>
            
            <select (change)="onAgeFilterChange($event)" class="filter-select">
              <option value="">Tất cả độ tuổi</option>
              <option value="young">Trẻ (< 25)</option>
              <option value="prime">Đỉnh cao (25-30)</option>
              <option value="veteran">Kỳ cựu (> 30)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Players Table -->
      <div *ngIf="!isLoading && !errorMessage && filteredPlayers.length > 0" class="table-container">
        <table class="players-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Tên cầu thủ</th>
              <th>Vị trí</th>
              <th>Tuổi</th>
              <th>Chiều cao</th>
              <th>Cân nặng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let player of filteredPlayers; trackBy: trackByPlayerId" class="player-row">
              <td class="avatar-cell">
                <img 
                  [src]="getPlayerAvatar(player)" 
                  [alt]="getPlayerDisplayName(player)"
                  class="player-avatar"
                  loading="lazy">
              </td>
              <td class="name-cell">
                <div class="player-name">{{ getPlayerDisplayName(player) }}</div>
                <div class="player-number">#{{ player.id }}</div>
              </td>
              <td class="position-cell">
                <span class="position-badge">{{ player.position }}</span>
              </td>
              <td class="age-cell">{{ calculateAge(player) }}</td>
              <td class="height-cell">{{ player.height }}cm</td>
              <td class="weight-cell">{{ player.weight }}kg</td>
              <td class="actions-cell">
                <button 
                  (click)="viewPlayerDetails(player)" 
                  class="action-btn detail-btn"
                  title="Xem chi tiết">
                  <i class="fas fa-eye"></i>
                  Chi tiết
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- No Results -->
      <div *ngIf="!isLoading && !errorMessage && filteredPlayers.length === 0 && allPlayers.length > 0" class="no-results">
        <div class="no-results-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>Không tìm thấy cầu thủ</h3>
        <p>Không có cầu thủ nào phù hợp với bộ lọc hiện tại.</p>
        <button (click)="clearFilters()" class="clear-filters-btn">
          <i class="fas fa-times"></i>
          Xóa bộ lọc
        </button>
      </div>
    </div>
  `,
  styles: [`
    .players-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .header-section {
      max-width: 1200px;
      margin: 0 auto 40px;
      text-align: center;
    }

    .title-text h1 {
      font-size: 2.8rem;
      margin: 0 0 10px 0;
      font-weight: 700;
      color: white;
    }

    .title-text p {
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
    }

    .header-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px;
      max-width: 1000px;
      margin: 30px auto;
    }

    .quick-stat {
      background: rgba(255, 255, 255, 0.15);
      padding: 20px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      gap: 15px;
      transition: transform 0.3s ease;
    }

    .quick-stat:hover {
      transform: translateY(-5px);
    }

    .stat-icon {
      font-size: 1.5rem;
      color: #fff;
    }

    .stat-number {
      font-size: 1.8rem;
      font-weight: bold;
      color: white;
    }

    .stat-label {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
    }

    .actions-section {
      margin: 30px auto;
      max-width: 800px;
    }

    .section-title {
      color: white;
      font-size: 1.5rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
    }

    .action-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .action-card {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 15px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 15px;
      text-align: left;
    }

    .action-card:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-3px);
    }

    .action-icon {
      font-size: 2rem;
      color: #fff;
    }

    .action-content h4 {
      color: white;
      margin: 0 0 5px 0;
      font-size: 1.1rem;
    }

    .action-content p {
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
      font-size: 0.9rem;
    }

    .filters-section {
      max-width: 1200px;
      margin: 0 auto 30px;
    }

    .search-container {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 250px;
    }

    .search-input {
      width: 100%;
      padding: 12px 15px 12px 45px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 25px;
      background: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
    }

    .search-icon {
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
    }

    .filter-group {
      display: flex;
      gap: 15px;
    }

    .filter-select {
      padding: 10px 15px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.9);
      font-size: 0.95rem;
    }

    .table-container {
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .players-table {
      width: 100%;
      border-collapse: collapse;
    }

    .players-table thead {
      background: linear-gradient(45deg, #667eea, #764ba2);
    }

    .players-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: white;
      font-size: 0.95rem;
    }

    .player-row {
      transition: background-color 0.2s ease;
    }

    .player-row:hover {
      background-color: #f8f9ff;
    }

    .players-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    .player-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .player-name {
      font-weight: 600;
      color: #333;
    }

    .player-number {
      font-size: 0.85rem;
      color: #666;
    }

    .position-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .action-btn {
      background: #1976d2;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: background-color 0.2s ease;
    }

    .action-btn:hover {
      background: #1565c0;
    }

    .loading-state, .error-state, .no-results {
      text-align: center;
      padding: 60px 20px;
      color: white;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon, .no-results-icon {
      font-size: 3rem;
      margin-bottom: 20px;
    }

    .retry-btn, .clear-filters-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      margin-top: 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .retry-btn:hover, .clear-filters-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    @media (max-width: 768px) {
      .search-container {
        flex-direction: column;
        align-items: stretch;
      }
      
      .filter-group {
        justify-content: center;
      }
      
      .table-container {
        overflow-x: auto;
      }
      
      .action-cards {
        grid-template-columns: 1fr;
      }
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
  
  allPlayers: PlayerInfo[] = [];
  filteredPlayers: PlayerInfo[] = [];
  isLoading = false;
  errorMessage = '';
  lastUpdate?: Date;
  selectedPlayer: PlayerInfo | null = null;
  
  // Cache for expensive computations
  private cachedAverageAge?: number;
  private cachedTopPlayers?: PlayerInfo[];
  private cacheInvalidated = true;
  
  // Filter state
  searchTerm = '';
  selectedPosition = '';
  selectedAgeGroup = '';
  availablePositions: string[] = [];
  
  trackByPlayerId = (index: number, player: PlayerInfo): string => {
    return player.id || `${player.firstName}-${index}`;
  };

  trackByPositionName = (index: number, position: string): string => {
    return position;
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
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.firstName?.toLowerCase().includes(searchLower) ||
        player.lastName?.toLowerCase().includes(searchLower) ||
        player.position?.toLowerCase().includes(searchLower) ||
        player.id?.toString().includes(searchLower)
      );
    }

    // Position filter
    if (this.selectedPosition) {
      filtered = filtered.filter(player => player.position === this.selectedPosition);
    }

    // Age group filter
    if (this.selectedAgeGroup) {
      filtered = filtered.filter(player => {
        const age = this.calculateAge(player);
        switch (this.selectedAgeGroup) {
          case 'young': return age < 25;
          case 'prime': return age >= 25 && age <= 30;
          case 'veteran': return age > 30;
          default: return true;
        }
      });
    }

    this.filteredPlayers = filtered;
  }

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchSubject$.next(target.value);
  }

  onPositionFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedPosition = target.value;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  onAgeFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedAgeGroup = target.value;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedPosition = '';
    this.selectedAgeGroup = '';
    this.applyFilters();
    this.cdr.markForCheck();
  }

  // Helper method to calculate age from PlayerInfo
  calculateAge(player: PlayerInfo): number {
    if (player.age) return player.age;
    
    if (!player.dateOfBirth) return 0;
    
    // Handle if DOB is a date string
    const birthDate = new Date(player.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Helper method to get player display name
  getPlayerDisplayName(player: PlayerInfo): string {
    return player.fullName || (player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName);
  }

  // Cached computation methods
  getAverageAge(): number {
    if (this.cacheInvalidated || this.cachedAverageAge === undefined) {
      if (this.allPlayers.length === 0) {
        this.cachedAverageAge = 0;
      } else {
        const totalAge = this.allPlayers.reduce((sum, player) => sum + this.calculateAge(player), 0);
        this.cachedAverageAge = Math.round(totalAge / this.allPlayers.length);
      }
    }
    return this.cachedAverageAge;
  }

  getTopPlayers(): PlayerInfo[] {
    if (this.cacheInvalidated || !this.cachedTopPlayers) {
      // Simple heuristic for "top" players - could be expanded with more criteria
      this.cachedTopPlayers = this.allPlayers
        .filter(player => {
          const age = this.calculateAge(player);
          return age >= 23 && age <= 32;
        })
        .slice(0, 10);
    }
    return this.cachedTopPlayers;
  }

  invalidateCache() {
    this.cacheInvalidated = true;
    this.cachedAverageAge = undefined;
    this.cachedTopPlayers = undefined;
  }

  getPlayerAvatar(player: PlayerInfo): string {
    return player.avatar || '/assets/images/default-avatar.svg';
  }

  async loadPlayersFromService() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.allPlayers = this.playerService.getAllPlayers();
      this.processPlayersData();
      
      // Complete performance monitoring
      if (this.componentLoadId) {
        this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
        this.componentLoadId = null;
      }
    } catch (error) {
      console.error('Error loading players from service:', error);
      this.errorMessage = `Service error: ${error}`;
      // Fallback to direct loading
      await this.testLoadPlayers();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  viewPlayerDetails(player: PlayerInfo) {
    this.selectedPlayer = player;
    console.log('Viewing details for player:', this.getPlayerDisplayName(player));
    // Here you would typically open a modal or navigate to a detail page
  }

  openCreatePlayerModal() {
    console.log('Opening create player modal');
    // Implementation for creating new player
  }

  exportPlayerStats() {
    console.log('Exporting player statistics');
    // Implementation for exporting data
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up performance monitoring if still active
    if (this.componentLoadId) {
      this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
    }
  }
}