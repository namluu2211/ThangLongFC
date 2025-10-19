import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarFallbackDirective } from '../directives/avatar-fallback.directive';
import { PlayerSkeletonComponent } from './player-skeleton.component';
import { FormsModule } from '@angular/forms';
import { Player } from '../player-utils';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarFallbackDirective, PlayerSkeletonComponent],
  template: `
  <div *ngIf="showPlayerList" class="player-list-section">
    <div class="player-list-card light">
      <div class="list-header">
        <h3><i class="fas fa-users me-2"></i>Danh sách cầu thủ</h3>
        <div class="list-controls">
          <button class="modern-btn btn-sm btn-primary" (click)="savePlayers.emit()" title="Lưu thay đổi">
            <i class="fas fa-save me-1"></i>Lưu
          </button>
          <button class="modern-btn btn-sm btn-secondary" (click)="toggleList.emit()">
            {{ showPlayerList ? 'Ẩn danh sách' : 'Hiện danh sách' }}
          </button>
        </div>
      </div>
      <app-player-skeleton *ngIf="loading && paginatedPlayers.length === 0"></app-player-skeleton>
      <div class="players-grid4" *ngIf="paginatedPlayers.length > 0 && !loading; else noPlayersTemplate">
        <div *ngFor="let player of paginatedPlayers; trackBy: trackByPlayerId" class="player-cell" [class.registered]="isRegistered(player)">
          <div class="top-row">
            <div class="avatar-small" (click)="viewPlayer.emit(player)" tabindex="0" (keyup)="onPlayerInfoKey($event, player)">
              <img appAvatarFallback [fallbackSrc]="'assets/images/default-avatar.svg'" [src]="player.avatar || 'assets/images/default-avatar.svg'" [alt]="player.firstName" loading="lazy">
            </div>
            <button class="register-toggle" (click)="toggleRegistration.emit(player)" [attr.aria-pressed]="isRegistered(player)" [title]="isRegistered(player)?'Hủy đăng ký':'Đăng ký'">
              <i class="fas" [class.fa-circle-plus]="!isRegistered(player)" [class.fa-circle-check]="isRegistered(player)"></i>
            </button>
          </div>
          <div class="info">
            <div class="name" [title]="player.firstName + ' ' + player.lastName">{{ player.firstName }} {{ player.lastName }}</div>
            <div class="position">{{ player.position }}</div>
          </div>
        </div>
      </div>
      <div class="pagination-controls" *ngIf="totalPages > 1">
        <button class="btn btn-sm btn-outline-primary" [disabled]="currentPage === 0" (click)="previousPage.emit()" title="Trang trước">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination-info mx-3">Trang {{ currentPage + 1 }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-outline-primary" [disabled]="currentPage >= totalPages - 1" (click)="nextPage.emit()" title="Trang sau">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      <ng-template #noPlayersTemplate>
        <div class="empty">
          <i class="fas fa-exclamation-triangle icon"></i>
          <h4>Không có dữ liệu cầu thủ</h4>
          <p>Đang tải hoặc có lỗi khi tải danh sách cầu thủ.</p>
          <button class="modern-btn btn-primary" (click)="reload.emit()">Thử tải lại</button>
        </div>
      </ng-template>
    </div>
  </div>
  `,
  styles: [`
    .player-list-section { padding:12px 6px 8px; }
    .player-list-card.light { background:#f6f4ff; border:1px solid #e0dcf5; border-radius:16px; padding:14px 14px 10px; box-shadow:0 6px 20px -6px rgba(50,30,90,.25),0 2px 6px rgba(0,0,0,.08); }
    .list-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .list-header h3 { margin:0; font-size:1rem; font-weight:600; color:#312b53; letter-spacing:.3px; }
    .list-controls { display:flex; gap:6px; }
  .players-grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
  .player-cell { background:#ffffff; border:1px solid #dad4ed; border-radius:12px; padding:8px 8px 6px; display:flex; flex-direction:column; gap:4px; position:relative; box-shadow:0 2px 4px rgba(0,0,0,.05); transition:box-shadow .18s, transform .18s; }
  .player-cell.registered { border-color:#53b963; box-shadow:0 3px 10px -2px rgba(30,120,55,.25); }
  .player-cell:hover { box-shadow:0 6px 16px rgba(0,0,0,.15); transform:translateY(-3px); }
  .top-row { display:flex; align-items:center; justify-content:space-between; gap:6px; }
    .register-toggle { background:#ece8fa; border:1px solid #d3cbed; color:#5a3fd0; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:8px; cursor:pointer; font-size:14px; transition:background .18s, color .18s; }
    .player-row.registered .register-toggle { background:#36a14a; border-color:#2d8a3d; color:#fff; }
    .register-toggle:hover { background:#ded7f4; }
    .player-row.registered .register-toggle:hover { background:#42b156; }
    .register-toggle:focus-visible { outline:2px solid #ffcf66; outline-offset:2px; }
    .avatar-small { width:38px; height:38px; border-radius:50%; overflow:hidden; border:2px solid #d3cbed; background:#fff; display:flex; align-items:center; justify-content:center; }
    .avatar-small img { width:100%; height:100%; object-fit:cover; }
    .info { display:flex; flex-direction:column; line-height:1.15; }
    .name { font-weight:600; font-size:.8rem; color:#2c2350; letter-spacing:.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .position { font-size:.65rem; text-transform:uppercase; letter-spacing:.5px; color:#6e6a85; }
    .pagination-controls { display:flex; align-items:center; justify-content:center; gap:8px; margin:10px 0 4px; }
    .empty { text-align:center; padding:32px 20px; background:#faf9fe; border:1px dashed #d8d1f4; border-radius:14px; color:#695f90; }
    .empty .icon { font-size:2.4rem; margin-bottom:12px; opacity:.65; }
  @media (max-width:900px){ .players-grid4 { grid-template-columns:repeat(3,1fr); } }
  @media (max-width:680px){ .players-grid4 { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:460px){ .players-grid4 { grid-template-columns:1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerListComponent {
  @Input() showPlayerList = true;
  @Input() paginatedPlayers: Player[] = [];
  @Input() displayPlayers: Player[] = [];
  @Input() pageSize = 20;
  @Input() currentPage = 0;
  @Input() totalPages = 0;
  @Input() registeredPlayers: Player[] = [];
  @Input() loading = false;
  @Output() toggleRegistration = new EventEmitter<Player>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() savePlayers = new EventEmitter<void>();
  @Output() viewPlayer = new EventEmitter<Player>();
  @Output() toggleList = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
  // Delete removed from this context per design; keep emitter for backward compat optionally (deprecated)
  // @Output() deletePlayer = new EventEmitter<Player>();

  trackByPlayerId = (_:number, p:Player) => p.id;
  isRegistered = (p:Player) => this.registeredPlayers.some(r=>r.id===p.id);
  get paginationStart(){ return (this.currentPage*this.pageSize)+1; }
  get paginationEnd(){ return Math.min((this.currentPage+1)*this.pageSize, this.displayPlayers.length); }
  onPlayerInfoKey(event:KeyboardEvent, player:Player){ if(event.key==='Enter' || event.key===' ') this.viewPlayer.emit(player); }
  // Avatar fallback now handled by directive
  onAvatarError(){ /* deprecated: handled by directive */ }

  // Edit functionality removed; player modifications handled in Danh sách tab.
}
