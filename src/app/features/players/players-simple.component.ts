import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Player } from './player-utils';
import { PerformanceService } from '../../services/performance.service';
import { AssetOptimizationService } from '../../services/asset-optimization.service';

@Component({
  selector: 'app-players-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="enhanced-players-container">
      <!-- Header Section -->
      <div class="header-section">
        <h2>
          <i class="fas fa-users me-2"></i>
          Enhanced Players Management
        </h2>
        <p>Advanced player management with filtering, search, and statistics</p>
      </div>

      <!-- Control Panel -->
      <div class="control-panel">
        <div class="controls-grid">
          <!-- Search -->
          <div class="control-group">
            <label for="searchInput">🔍 Search Players:</label>
            <input 
              id="searchInput"
              type="text" 
              [(ngModel)]="searchTerm" 
              (input)="applyFilters()"
              placeholder="Search by name or position..."
              class="form-control">
          </div>

          <!-- Position Filter -->
          <div class="control-group">
            <label for="positionFilter">⚽ Filter by Position:</label>
            <select 
              id="positionFilter"
              [(ngModel)]="selectedPosition" 
              (change)="applyFilters()"
              class="form-control">
              <option value="">All Positions</option>
              <option *ngFor="let position of availablePositions" [value]="position">
                {{ position }}
              </option>
            </select>
          </div>

          <!-- Sort Options -->
          <div class="control-group">
            <label for="sortBy">📊 Sort By:</label>
            <select 
              id="sortBy"
              [(ngModel)]="sortBy" 
              (change)="applyFilters()"
              class="form-control">
              <option value="firstName">Name (A-Z)</option>
              <option value="position">Position</option>
              <option value="age">Age</option>
              <option value="height">Height</option>
              <option value="weight">Weight</option>
            </select>
          </div>

          <!-- View Mode -->
          <div class="control-group">
            <span class="control-label">👁️ View Mode:</span>
            <div class="button-group" role="radiogroup" aria-label="View mode selection">
              <button 
                (click)="viewMode = 'grid'" 
                [class.active]="viewMode === 'grid'"
                class="view-btn">
                <i class="fas fa-th"></i> Grid
              </button>
              <button 
                (click)="viewMode = 'list'" 
                [class.active]="viewMode === 'list'"
                class="view-btn">
                <i class="fas fa-list"></i> List
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button (click)="testLoadPlayers()" class="action-btn primary">
            <i class="fas fa-sync-alt"></i> Reload Data
          </button>
          <button (click)="testFetchDirect()" class="action-btn success">
            <i class="fas fa-download"></i> Force Refresh
          </button>
          <button (click)="exportPlayerStats()" class="action-btn info">
            <i class="fas fa-file-export"></i> Export Stats
          </button>
          <button (click)="toggleDebugMode()" class="action-btn secondary">
            <i class="fas fa-bug"></i> Debug
          </button>
        </div>
      </div>

      <!-- Statistics Section -->
      <div class="stats-section" *ngIf="allPlayers.length > 0">
        <h3><i class="fas fa-chart-bar me-2"></i>Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ allPlayers.length }}</div>
            <div class="stat-label">Total Players</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ filteredPlayers.length }}</div>
            <div class="stat-label">Filtered Results</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ availablePositions.length }}</div>
            <div class="stat-label">Positions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getAverageAge() }}</div>
            <div class="stat-label">Avg Age</div>
          </div>
        </div>
      </div>

      <!-- Debug Panel -->
      <div class="debug-panel" *ngIf="showDebugMode">
        <h3><i class="fas fa-bug me-2"></i>Debug Information</h3>
        <div class="debug-info">
          <div><strong>Loading State:</strong> {{ isLoading ? 'Loading...' : 'Complete' }}</div>
          <div><strong>Error:</strong> {{ errorMessage || 'None' }}</div>
          <div><strong>Cache Status:</strong> {{ getCacheInfo() }}</div>
          <div><strong>Last Update:</strong> {{ lastUpdate?.toLocaleString() || 'Never' }}</div>
          <div><strong>Search Term:</strong> "{{ searchTerm || '(empty)' }}"</div>
          <div><strong>Active Filters:</strong> {{ getActiveFilters() }}</div>
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
          <h3>
            <i class="fas fa-users me-2"></i>
            Players ({{ filteredPlayers.length }} of {{ allPlayers.length }})
          </h3>
        </div>

        <!-- Grid View -->
        <div *ngIf="viewMode === 'grid'" class="players-grid">
          <div *ngFor="let player of filteredPlayers; let i = index" class="player-card-enhanced">
            <div class="player-header">
              <img [src]="player.avatar" 
                   [alt]="player.firstName"
                   class="player-avatar-enhanced"
                   (error)="onAvatarError($event)">
              <div class="player-basic-info">
                <h4 class="player-name-enhanced">{{ player.firstName }} {{ player.lastName }}</h4>
                <span class="position-badge">{{ player.position }}</span>
              </div>
            </div>
            
            <div class="player-stats" *ngIf="player.height || player.weight || player.DOB">
              <div class="stat-item" *ngIf="player.height">
                <i class="fas fa-arrows-alt-v"></i>
                <span>{{ player.height }}cm</span>
              </div>
              <div class="stat-item" *ngIf="player.weight">
                <i class="fas fa-weight"></i>
                <span>{{ player.weight }}kg</span>
              </div>
              <div class="stat-item" *ngIf="player.DOB">
                <i class="fas fa-calendar-alt"></i>
                <span>{{ calculateAge(player.DOB) }} years</span>
              </div>
            </div>

            <div class="player-actions">
              <button (click)="viewPlayerDetails(player)" class="detail-btn">
                <i class="fas fa-info-circle"></i> Details
              </button>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div *ngIf="viewMode === 'list'" class="players-list">
          <div class="list-header">
            <div class="col-name">Name</div>
            <div class="col-position">Position</div>
            <div class="col-age">Age</div>
            <div class="col-height">Height</div>
            <div class="col-weight">Weight</div>
            <div class="col-actions">Actions</div>
          </div>
          
          <div *ngFor="let player of filteredPlayers" class="list-row">
            <div class="col-name">
              <img [src]="player.avatar" [alt]="player.firstName" class="list-avatar">
              <span>{{ player.firstName }} {{ player.lastName }}</span>
            </div>
            <div class="col-position">
              <span class="position-badge-small">{{ player.position }}</span>
            </div>
            <div class="col-age">{{ calculateAge(player.DOB) || '-' }}</div>
            <div class="col-height">{{ player.height ? player.height + 'cm' : '-' }}</div>
            <div class="col-weight">{{ player.weight ? player.weight + 'kg' : '-' }}</div>
            <div class="col-actions">
              <button (click)="viewPlayerDetails(player)" class="list-action-btn">
                <i class="fas fa-eye"></i>
              </button>
            </div>
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

      <!-- Player Detail Modal -->
      <div *ngIf="selectedPlayer" class="modal-overlay" 
           (click)="closePlayerDetails()" 
           (keydown)="onModalKeyDown($event)"
           tabindex="0"
           role="dialog"
           aria-modal="true"
           [attr.aria-labelledby]="'modal-title-' + selectedPlayer.id">
        <div class="player-detail-modal" 
             (click)="$event.stopPropagation()"
             (keydown)="$event.stopPropagation()"
             tabindex="-1"
             role="document">
          <div class="modal-header">
            <h3>{{ selectedPlayer.firstName }} {{ selectedPlayer.lastName }}</h3>
            <button (click)="closePlayerDetails()" class="close-modal-btn">×</button>
          </div>
          <div class="modal-content">
            <div class="player-detail-grid">
              <div class="detail-avatar">
                <img [src]="selectedPlayer.avatar" [alt]="selectedPlayer.firstName">
              </div>
              <div class="detail-info">
                <div class="info-row">
                  <span class="info-label">Position:</span>
                  <span class="position-badge">{{ selectedPlayer.position }}</span>
                </div>
                <div class="info-row" *ngIf="selectedPlayer.DOB">
                  <span class="info-label">Age:</span>
                  <span>{{ calculateAge(selectedPlayer.DOB) }} years</span>
                </div>
                <div class="info-row" *ngIf="selectedPlayer.height">
                  <span class="info-label">Height:</span>
                  <span>{{ selectedPlayer.height }}cm</span>
                </div>
                <div class="info-row" *ngIf="selectedPlayer.weight">
                  <span class="info-label">Weight:</span>
                  <span>{{ selectedPlayer.weight }}kg</span>
                </div>
                <div class="info-row" *ngIf="selectedPlayer.note">
                  <span class="info-label">Notes:</span>
                  <span>{{ selectedPlayer.note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .enhanced-players-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }

    .header-section {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }

    .header-section h2 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .control-panel {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .controls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group > div {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .form-control {
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .button-group {
      display: flex;
      gap: 10px;
    }

    .view-btn {
      flex: 1;
      padding: 10px;
      border: 2px solid #e9ecef;
      background: white;
      border-radius: 8px;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .view-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
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

    .stats-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
    }

    .stat-card {
      text-align: center;
      padding: 20px;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .players-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .player-card-enhanced {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .player-card-enhanced:hover {
      transform: translateY(-5px);
    }

    .position-badge {
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

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

    .player-detail-modal {
      background: white;
      border-radius: 15px;
      max-width: 600px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 15px 15px 0 0;
    }

    .close-modal-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .controls-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlayersSimpleComponent implements OnInit, OnDestroy {
  private readonly performanceService = inject(PerformanceService);
  private readonly assetService = inject(AssetOptimizationService);
  private componentLoadId: string | null = null;
  
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  isLoading = false;
  errorMessage = '';
  showDebugMode = false;
  lastUpdate?: Date;
  selectedPlayer: Player | null = null;

  // Filter and display properties
  searchTerm = '';
  selectedPosition = '';
  sortBy = 'firstName';
  viewMode: 'grid' | 'list' = 'grid';
  availablePositions: string[] = [];

  ngOnInit() {
    // Start performance monitoring for this component
    this.componentLoadId = this.performanceService.startComponentLoad('PlayersSimpleComponent');
    this.testLoadPlayers();
  }

  async testLoadPlayers() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      console.log('🔄 Testing player loading...');
      
      const cachedData = localStorage.getItem('players.json');
      if (cachedData) {
        console.log('📦 Found cached data');
        this.allPlayers = JSON.parse(cachedData);
        console.log('✅ Loaded from cache:', this.allPlayers.length, 'players');
        this.processPlayersData();
        
        // Complete performance monitoring after successful load
        if (this.componentLoadId) {
          this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
          this.componentLoadId = null;
        }
      } else {
        console.log('🌐 No cache, fetching from assets...');
        await this.testFetchDirect();
        return;
      }
      
    } catch (error) {
      console.error('❌ Error in testLoadPlayers:', error);
      this.errorMessage = `Error loading players: ${error}`;
    } finally {
      this.isLoading = false;
    }
  }

  async testFetchDirect() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      console.log('🌐 Testing direct fetch...');
      
      const response = await fetch('/assets/players.json');
      console.log('📡 Fetch response:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log('📄 Raw response length:', text.length);
      
      const data = JSON.parse(text);
      this.allPlayers = data;
      console.log('✅ Parsed successfully:', this.allPlayers.length, 'players');
      
      localStorage.setItem('players.json', text);
      console.log('💾 Cached to localStorage after test direct fetch');
      
      this.processPlayersData();
      
    } catch (error) {
      console.error('❌ Error in testFetchDirect:', error);
      this.errorMessage = `Direct fetch error: ${error}`;
    } finally {
      this.isLoading = false;
    }
  }

  processPlayersData() {
    this.lastUpdate = new Date();
    this.extractAvailablePositions();
    this.applyFilters();
  }

  extractAvailablePositions() {
    const positions = new Set(this.allPlayers.map(p => p.position).filter(p => p));
    this.availablePositions = Array.from(positions).sort();
  }

  applyFilters() {
    let filtered = [...this.allPlayers];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.firstName.toLowerCase().includes(term) ||
        (player.lastName && player.lastName.toLowerCase().includes(term)) ||
        player.position.toLowerCase().includes(term)
      );
    }

    if (this.selectedPosition) {
      filtered = filtered.filter(player => player.position === this.selectedPosition);
    }

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
  }

  calculateAge(dob?: string | number): number | null {
    if (!dob) return null;
    const birthYear = typeof dob === 'string' ? parseInt(dob) : dob;
    if (isNaN(birthYear)) return null;
    return new Date().getFullYear() - birthYear;
  }

  getAverageAge(): string {
    const ages = this.allPlayers
      .map(p => this.calculateAge(p.DOB))
      .filter(age => age !== null) as number[];
    
    if (ages.length === 0) return 'N/A';
    const average = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    return Math.round(average).toString();
  }

  getCacheInfo(): string {
    const cached = localStorage.getItem('players.json');
    return cached ? `${Math.round(cached.length / 1024)}KB cached` : 'No cache';
  }

  getActiveFilters(): string {
    const filters = [];
    if (this.searchTerm) filters.push(`Search: "${this.searchTerm}"`);
    if (this.selectedPosition) filters.push(`Position: ${this.selectedPosition}`);
    if (this.sortBy !== 'firstName') filters.push(`Sort: ${this.sortBy}`);
    return filters.length > 0 ? filters.join(', ') : 'None';
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedPosition = '';
    this.sortBy = 'firstName';
    this.applyFilters();
  }

  toggleDebugMode() {
    this.showDebugMode = !this.showDebugMode;
  }

  viewPlayerDetails(player: Player) {
    this.selectedPlayer = player;
  }

  closePlayerDetails() {
    this.selectedPlayer = null;
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

  ngOnDestroy() {
    // End performance monitoring for this component
    if (this.componentLoadId) {
      this.performanceService.endComponentLoad(this.componentLoadId, 'PlayersSimpleComponent');
    }
  }
}