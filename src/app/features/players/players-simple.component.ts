import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Player } from './player-utils';
import { PerformanceService } from '../../services/performance.service';
import { AssetOptimizationService } from '../../services/asset-optimization.service';
import { PlayerService } from '../../core/services/player.service';
import { PlayerInfo, PlayerStatus } from '../../core/models/player.model';

@Component({
  selector: 'app-players-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                <p>Hệ thống quản lý cầu thủ chuyên nghiệp với tính năng tìm kiếm và thống kê nâng cao</p>
              </div>
            </div>
          </div>
          
          <!-- Quick Stats in Header -->
          <div class="header-stats" *ngIf="allPlayers.length > 0">
            <div class="quick-stat">
              <span class="stat-number">{{ allPlayers.length }}</span>
              <span class="stat-label">Cầu thủ</span>
            </div>
            <div class="quick-stat">
              <span class="stat-number">{{ availablePositions.length }}</span>
              <span class="stat-label">Vị trí</span>
            </div>
            <div class="quick-stat">
              <span class="stat-number">{{ getAverageAge() }}</span>
              <span class="stat-label">Tuổi TB</span>
            </div>
          </div>
        </div>
        
        <!-- Global Search Bar -->
        <div class="global-search">
          <div class="search-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              (input)="applyFilters()"
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
            <!-- Position Filter Card -->
            <div class="filter-card">
              <div class="filter-header">
                <i class="fas fa-map-marker-alt"></i>
                <span>Vị trí</span>
              </div>
              <select 
                [(ngModel)]="selectedPosition" 
                (change)="applyFilters()"
                class="modern-select">
                <option value="">Tất cả vị trí</option>
                <option *ngFor="let position of availablePositions" [value]="position">
                  {{ position }}
                </option>
              </select>
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
                  (click)="viewMode = 'list'" 
                  [class.active]="viewMode === 'list'"
                  class="toggle-btn">
                  <i class="fas fa-list"></i>
                  <span>Danh sách</span>
                </button>
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
          
          <div *ngFor="let player of filteredPlayers" class="list-item">
            <div class="list-name">
              <img [src]="player.avatar" [alt]="player.firstName" class="list-avatar" (error)="onAvatarError($event)">
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
              <button 
                (click)="openEditPlayerModal(player)" 
                class="list-action-btn edit-btn"
                title="Chỉnh sửa cầu thủ">
                <i class="fas fa-edit"></i>
              </button>
              <button 
                (click)="confirmDeletePlayer(player)" 
                class="list-action-btn delete-btn"
                title="Xóa cầu thủ">
                <i class="fas fa-trash"></i>
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
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .quick-stat {
      background: rgba(255, 255, 255, 0.15);
      padding: 15px 20px;
      border-radius: 15px;
      text-align: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      min-width: 80px;
    }

    .stat-number {
      display: block;
      font-size: 1.8rem;
      font-weight: 700;
      color: white;
    }

    .stat-label {
      display: block;
      font-size: 0.85rem;
      opacity: 0.8;
      margin-top: 2px;
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

    /* Simplified List View */
    .players-list { background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .list-header { display: grid; grid-template-columns: 2.5fr 1.2fr 90px 90px 90px 120px; gap: 20px; padding: 20px 25px; background: #f8f9fa; font-weight: 700; }
    .list-item { display: grid; grid-template-columns: 2.5fr 1.2fr 90px 90px 90px 120px; gap: 20px; padding: 18px 25px; border-bottom: 1px solid #f5f5f5; }

    .list-item:hover {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      transform: translateX(5px);
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
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
      gap: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .list-avatar {
      width: 45px;
      height: 45px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid white;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
    }

    .position-badge-small {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
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
        padding: 30px 20px;
      }

      .title-text h1 {
        font-size: 2.2rem;
      }

      .modern-control-panel {
        margin: -20px 15px 15px;
      }

      .controls-section, .actions-section {
        padding: 20px;
      }

      .players-section, .stats-section {
        margin: 0 15px 15px;
        padding: 20px;
      }

      .players-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
      }

      .list-header, .list-item {
        grid-template-columns: 2fr 1fr 60px 80px;
        gap: 10px;
        padding: 15px 20px;
        font-size: 0.9rem;
      }

      .col-height, .col-weight {
        display: none;
      }

      .player-header {
        padding: 15px;
      }

      .player-avatar-enhanced {
        width: 50px;
        height: 50px;
      }

      .player-name-enhanced {
        font-size: 1.1rem;
      }

      .action-card {
        padding: 20px;
        gap: 15px;
      }

      .action-icon {
        width: 45px;
        height: 45px;
      }
    }

    @media (max-width: 480px) {
      .enhanced-players-container {
        font-size: 14px;
      }

      .modern-header {
        padding: 20px 15px;
      }

      .title-text h1 {
        font-size: 1.8rem;
      }

      .global-search-input {
        padding: 15px 15px 15px 45px;
        font-size: 1rem;
      }

      .header-stats {
        gap: 10px;
      }

      .quick-stat {
        padding: 12px 15px;
        min-width: 70px;
      }

      .stat-number {
        font-size: 1.5rem;
      }

      .modern-control-panel {
        margin: -15px 10px 10px;
      }

      .players-section, .stats-section {
        margin: 0 10px 10px;
        padding: 15px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .list-header, .list-item {
        grid-template-columns: 2fr 1fr 50px;
        padding: 12px 15px;
        font-size: 0.85rem;
      }

      .col-age, .col-actions {
        display: none;
      }

      .player-actions {
        padding: 12px 15px;
        gap: 8px;
      }

      .edit-btn, .delete-btn {
        width: 40px;
        height: 40px;
      }

      .detail-btn {
        padding: 8px 12px;
        font-size: 0.9rem;
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
  private readonly destroy$ = new Subject<void>();
  private componentLoadId: string | null = null;
  
  allPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  isLoading = false;
  errorMessage = '';

  lastUpdate?: Date;
  selectedPlayer: Player | null = null;

  // Filter and display properties
  searchTerm = '';
  selectedPosition = '';
  sortBy = 'firstName';
  viewMode: 'grid' | 'list' = 'list';
  availablePositions: string[] = [];

  // Player Management Properties
  showPlayerModal = false;
  showDeleteConfirm = false;
  isEditMode = false;
  isSaving = false;
  playerFormData: Partial<PlayerInfo> = {};
  playerToDelete: PlayerInfo | null = null;
  corePlayersData: PlayerInfo[] = [];

  ngOnInit() {
    // Start performance monitoring for this component
    this.componentLoadId = this.performanceService.startComponentLoad('PlayersSimpleComponent');
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
    const ages = this.allPlayers
      .map(p => this.calculateAge(p.DOB))
      .filter(age => age !== null) as number[];
    
    if (ages.length === 0) return 'N/A';
    const average = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    return Math.round(average).toString();
  }



  clearFilters() {
    this.searchTerm = '';
    this.selectedPosition = '';
    this.sortBy = 'firstName';
    this.applyFilters();
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
}