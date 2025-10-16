import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { PlayerService } from '../../core/services/player.service';
import { PlayerInfo, PlayerStatus } from '../../core/models/player.model';
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
        
        <!-- Removed header stats (Tổng cầu thủ, Cầu thủ xuất sắc, Cập nhật lần cuối) as requested -->

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
            <tr *ngFor="let player of paginatedPlayers; trackBy: trackByPlayerId" class="player-row">
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
        <div class="pagination-bar" *ngIf="totalPages > 1">
          <button class="page-btn" (click)="prevPage()" [disabled]="currentPage === 0">«</button>
          <ng-container *ngFor="let p of pages; let i = index; trackBy: trackByPageIndex">
            <button class="page-btn" [class.active]="i === currentPage" (click)="goToPage(i)">{{ i + 1 }}</button>
          </ng-container>
            <button class="page-btn" (click)="nextPage()" [disabled]="currentPage === totalPages - 1">»</button>
          <div class="page-info">Hiển thị {{ pageStart + 1 }} - {{ pageEnd }} / {{ filteredPlayers.length }}</div>
        </div>
      </div>

      <!-- Detail / Create / Edit Panels -->
      <div 
        class="overlay" 
        *ngIf="panelOpen" 
        (click)="closePanels()" 
        tabindex="0" 
        role="presentation" 
        (keydown.escape)="closePanels()" 
        (keydown.enter)="closePanels()" 
        (keydown.space)="closePanels()"></div>

      <!-- Detail Panel -->
      <section *ngIf="isDetailOpen" class="side-panel animate-in" role="dialog" aria-modal="true" aria-label="Thông tin cầu thủ">
        <header class="panel-header">
          <h3>Thông tin cầu thủ</h3>
          <button class="icon-btn" (click)="closePanels()" aria-label="Đóng">✕</button>
        </header>
        <ng-container *ngIf="selectedPlayer; else noPlayer">
          <div class="panel-body">
            <div class="player-hero">
              <img class="hero-avatar" [src]="getPlayerAvatar(selectedPlayer)" [alt]="getPlayerDisplayName(selectedPlayer)" />
              <div class="hero-meta">
                <div class="hero-name">{{ getPlayerDisplayName(selectedPlayer) }}</div>
                <div class="hero-position">{{ selectedPlayer.position || 'Chưa xác định' }}</div>
              </div>
            </div>
            <div class="mini-stats">
              <div class="mini-stat"><span>{{ selectedPlayer.stats?.totalMatches || 0 }}</span><span class="mini-label">Trận</span></div>
              <div class="mini-stat"><span>{{ selectedPlayer.stats?.goals || 0 }}</span><span class="mini-label">Bàn</span></div>
              <div class="mini-stat"><span>{{ selectedPlayer.stats?.assists || 0 }}</span><span class="mini-label">Kiến tạo</span></div>
            </div>
            <dl class="detail-list">
              <div><dt>Tuổi</dt><dd>{{ calculateAge(selectedPlayer) }}</dd></div>
              <div><dt>Chiều cao</dt><dd>{{ selectedPlayer.height || '—' }}cm</dd></div>
              <div><dt>Cân nặng</dt><dd>{{ selectedPlayer.weight || '—' }}kg</dd></div>
              <div><dt>Trạng thái</dt><dd>{{ selectedPlayer.status }}</dd></div>
            </dl>
          </div>
          <footer class="panel-footer">
            <button class="primary-btn" (click)="openEditPlayer(selectedPlayer)">Chỉnh sửa</button>
            <button class="ghost-btn" (click)="closePanels()">Đóng</button>
          </footer>
        </ng-container>
        <ng-template #noPlayer><p>Không có dữ liệu.</p></ng-template>
      </section>

      <!-- Create Panel -->
      <section *ngIf="isCreateOpen" class="side-panel animate-in" role="dialog" aria-modal="true" aria-label="Thêm cầu thủ">
        <header class="panel-header">
          <h3>Thêm cầu thủ</h3>
          <button class="icon-btn" (click)="closePanels()" aria-label="Đóng">✕</button>
        </header>
        <div class="panel-body">
          <form (ngSubmit)="submitCreate()" #createForm="ngForm" class="player-form" id="createPlayerForm">
            <div class="form-grid">
              <label><span>Tên *</span><input name="firstName" [(ngModel)]="createModel.firstName" required /></label>
              <label><span>Họ</span><input name="lastName" [(ngModel)]="createModel.lastName" /></label>
              <label><span>Ngày sinh</span><input type="date" name="dateOfBirth" [(ngModel)]="createModel.dateOfBirth" /></label>
              <label><span>Vị trí</span><input name="position" [(ngModel)]="createModel.position" /></label>
              <label><span>Chiều cao (cm)</span><input type="number" name="height" [(ngModel)]="createModel.height" /></label>
              <label><span>Cân nặng (kg)</span><input type="number" name="weight" [(ngModel)]="createModel.weight" /></label>
            </div>
          </form>
        </div>
        <footer class="panel-footer">
          <button class="primary-btn" [disabled]="createForm.invalid" type="submit" form="createPlayerForm">Lưu</button>
          <button class="ghost-btn" type="button" (click)="closePanels()">Hủy</button>
        </footer>
      </section>

      <!-- Edit Panel -->
      <section *ngIf="isEditOpen" class="side-panel animate-in" role="dialog" aria-modal="true" aria-label="Chỉnh sửa cầu thủ">
        <header class="panel-header">
          <h3>Chỉnh sửa cầu thủ</h3>
          <button class="icon-btn" (click)="closePanels()" aria-label="Đóng">✕</button>
        </header>
        <div class="panel-body" *ngIf="editModel">
          <form (ngSubmit)="submitEdit()" #editForm="ngForm" class="player-form" id="editPlayerForm">
            <div class="form-grid">
              <label><span>Tên *</span><input name="firstName" [(ngModel)]="editModel.firstName" required /></label>
              <label><span>Họ</span><input name="lastName" [(ngModel)]="editModel.lastName" /></label>
              <label><span>Ngày sinh</span><input type="date" name="dateOfBirth" [(ngModel)]="editModel.dateOfBirth" /></label>
              <label><span>Vị trí</span><input name="position" [(ngModel)]="editModel.position" /></label>
              <label><span>Chiều cao (cm)</span><input type="number" name="height" [(ngModel)]="editModel.height" /></label>
              <label><span>Cân nặng (kg)</span><input type="number" name="weight" [(ngModel)]="editModel.weight" /></label>
            </div>
          </form>
        </div>
        <footer class="panel-footer">
          <button class="primary-btn" [disabled]="editForm.invalid" type="submit" form="editPlayerForm">Cập nhật</button>
          <button class="ghost-btn" type="button" (click)="closePanels()">Hủy</button>
        </footer>
      </section>

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

    .pagination-bar {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 15px;
      flex-wrap: wrap;
    }

    .page-btn {
      background: #e0e7ff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }

    .page-btn:hover:not(:disabled) {
      background: #c7d2fe;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-btn.active {
      background: #667eea;
      color: #fff;
    }

    .page-info {
      margin-left: auto;
      font-size: 0.8rem;
      color: #555;
    }

    /* Panels / overlay */
  .overlay { position: fixed; inset:0; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); z-index: 80; animation: fadeIn .25s ease; }
    .side-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 380px;
      max-width: 92%;
      height: auto;
      max-height: 88vh;
      background: #fff;
      z-index: 90;
      padding: 0;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.24);
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }
  .animate-in { animation: slideIn .3s ease; }
  @keyframes slideIn { from { transform: translate(-50%, -50%) scale(0.94); opacity:0;} to { transform: translate(-50%, -50%) scale(1); opacity:1;} }
  @keyframes fadeIn { from { opacity:0;} to { opacity:1;} }
  .panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #eee; background:#fafbfd; border-radius:16px 16px 0 0; }
  .panel-header h3 { margin:0; font-size:1.15rem; font-weight:600; }
    .panel-body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
    }
  .icon-btn { background:transparent; border:none; font-size:1.1rem; cursor:pointer; line-height:1; padding:4px 6px; border-radius:4px; }
  .icon-btn:hover { background:#f2f2f2; }
  .player-hero { display:flex; gap:14px; padding:20px 20px 12px; align-items:center; }
  .hero-avatar { width:70px; height:70px; border-radius:50%; object-fit:cover; background:#f3f3f3; box-shadow:0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,0.1); }
  .hero-meta { display:flex; flex-direction:column; justify-content:center; }
  .hero-name { font-weight:600; font-size:1.05rem; }
  .hero-position { font-size:0.75rem; text-transform:uppercase; letter-spacing:.5px; background:#eef2ff; color:#3845a7; padding:4px 8px; border-radius:12px; margin-top:6px; width:max-content; }
  .mini-stats { display:flex; gap:10px; padding:0 20px 16px; }
  .mini-stat { background:#f8f9fb; padding:10px 14px; border-radius:10px; display:flex; flex-direction:column; align-items:center; flex:1; }
  .mini-stat span { font-weight:600; font-size:1rem; }
  .mini-stat .mini-label { font-size:0.65rem; text-transform:uppercase; letter-spacing:.5px; color:#555; }
  .detail-list { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; padding:8px 20px 20px; }
  .detail-list dt { font-size:0.65rem; text-transform:uppercase; letter-spacing:.5px; color:#666; margin:0 0 4px; }
  .detail-list dd { margin:0; font-size:0.88rem; font-weight:500; }
  .panel-footer { position:sticky; bottom:0; background:#fff; padding:16px 20px; display:flex; gap:12px; border-top:1px solid #eee; border-radius:0 0 16px 16px; }
  .primary-btn, .ghost-btn, .icon-btn, .action-btn { font-family:inherit; }
  .primary-btn { background:#667eea; border:none; padding:11px 20px; color:#fff; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; box-shadow:0 2px 6px rgba(102,126,234,0.35); flex:1; }
  .primary-btn:hover { background:#5a6fd6; }
  .primary-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .ghost-btn { background:#f1f2f6; border:none; padding:11px 18px; border-radius:8px; font-size:0.8rem; cursor:pointer; flex:1; }
  .ghost-btn:hover { background:#e3e6ee; }
    .player-form {
      padding: 20px 20px 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 12px;
      width: 100%;
      box-sizing: border-box;
    }
    .form-grid label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: .5px;
      text-transform: uppercase;
      color: #555;
    }
    .form-grid input {
      padding: 9px 11px;
      border: 1px solid #d4d8e3;
      border-radius: 6px;
      font-size: 0.85rem;
      width: 100%;
      box-sizing: border-box;
    }
    .form-grid input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102,126,234,0.25);
    }
  @media (max-width:520px) { 
    .side-panel { width:90%; max-height:92vh; }
    .form-grid { grid-template-columns:1fr; }
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
  isDetailOpen = false;
  isCreateOpen = false;
  isEditOpen = false;
  createModel: Partial<PlayerInfo> = { firstName: '', lastName: '', position: '' };
  editModel: Partial<PlayerInfo> | null = null;
  
  // Derived UI state
  get panelOpen(): boolean {
    return this.isDetailOpen || this.isCreateOpen || this.isEditOpen;
  }
  
  // Cache for expensive computations
  // (Removed average age & top players cache fields)
  
  // Filter state
  searchTerm = '';
  selectedPosition = '';
  availablePositions: string[] = [];

  // Pagination state
  readonly pageSize = 10;
  currentPage = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredPlayers.length / this.pageSize)); }
  get paginatedPlayers(): PlayerInfo[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredPlayers.slice(start, start + this.pageSize);
  }
  get pageStart(): number { return this.currentPage * this.pageSize; }
  get pageEnd(): number { return Math.min(this.filteredPlayers.length, this.pageStart + this.pageSize); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }
  trackByPageIndex = (index: number) => index;
  
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

    this.filteredPlayers = filtered;
    this.currentPage = 0; // reset to first page when filters change
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

  clearFilters() {
    this.searchTerm = '';
    this.selectedPosition = '';
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
  // Pagination controls
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.cdr.markForCheck();
    }
  }
  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cdr.markForCheck();
    }
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
    this.isDetailOpen = true;
    this.isCreateOpen = false;
    this.isEditOpen = false;
    this.cdr.markForCheck();
  }

  openCreatePlayerModal() {
    this.resetCreateModel();
    this.isCreateOpen = true;
    this.isDetailOpen = false;
    this.isEditOpen = false;
    this.cdr.markForCheck();
  }

  exportPlayerStats() {
    console.log('Exporting player statistics');
    // Implementation for exporting data
  }

  openEditPlayer(player: PlayerInfo) {
    this.selectedPlayer = player;
    this.editModel = { ...player };
    this.isEditOpen = true;
    this.isDetailOpen = false;
    this.isCreateOpen = false;
    this.cdr.markForCheck();
  }

  closePanels() {
    this.isDetailOpen = false;
    this.isCreateOpen = false;
    this.isEditOpen = false;
    this.cdr.markForCheck();
  }

  resetCreateModel() {
    this.createModel = { firstName: '', lastName: '', position: '', dateOfBirth: '' };
  }

  async submitCreate() {
    if (!this.createModel.firstName) return;
    try {
      const base: Omit<PlayerInfo, 'id' | 'stats' | 'createdAt' | 'updatedAt'> = {
        firstName: this.createModel.firstName || '',
        lastName: this.createModel.lastName || '',
        fullName: `${this.createModel.firstName || ''} ${this.createModel.lastName || ''}`.trim(),
        position: this.createModel.position || 'Chưa xác định',
        dateOfBirth: this.createModel.dateOfBirth || '',
        height: this.createModel.height || 0,
        weight: this.createModel.weight || 0,
        isRegistered: true,
  status: PlayerStatus.ACTIVE,
        avatar: '',
        notes: ''
      };
      await this.playerService.createPlayer(base);
      this.loadPlayersFromService();
      this.closePanels();
    } catch (e) {
      console.error('Error creating player', e);
    }
  }

  async submitEdit() {
    if (!this.editModel || !this.editModel.id) return;
    try {
      const updates: Partial<PlayerInfo> = {
        firstName: this.editModel.firstName,
        lastName: this.editModel.lastName,
        fullName: `${this.editModel.firstName || ''} ${this.editModel.lastName || ''}`.trim(),
        position: this.editModel.position,
        dateOfBirth: this.editModel.dateOfBirth,
        height: this.editModel.height,
        weight: this.editModel.weight
      };
      await this.playerService.updatePlayer(this.editModel.id, updates);
      this.loadPlayersFromService();
      this.closePanels();
    } catch (e) {
      console.error('Error updating player', e);
    }
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