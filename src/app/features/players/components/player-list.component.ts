import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Player } from '../player-utils';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="showPlayerList" class="player-list-section">
    <div class="player-list-card">
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
      <!-- Create new player form -->
      <form class="create-player-form" (submit)="onCreate($event)" novalidate>
        <input type="text" [(ngModel)]="draftFirstName" name="firstName" placeholder="Tên*" required class="form-control form-control-sm" />
        <input type="text" [(ngModel)]="draftLastName" name="lastName" placeholder="Họ" class="form-control form-control-sm" />
        <input type="text" [(ngModel)]="draftPosition" name="position" placeholder="Vị trí" class="form-control form-control-sm" />
        <button class="modern-btn btn-sm btn-success" type="submit" [disabled]="!draftFirstName.trim()"><i class="fas fa-plus me-1"></i>Thêm</button>
      </form>
      <div class="pagination-info" *ngIf="displayPlayers.length > pageSize">
        <span class="text-muted">Hiển thị {{paginationStart}}-{{paginationEnd}} trong tổng số {{displayPlayers.length}} cầu thủ</span>
      </div>
      <div class="players-grid" *ngIf="paginatedPlayers.length > 0; else noPlayersTemplate">
        <div *ngFor="let player of paginatedPlayers; trackBy: trackByPlayerId" class="player-item" [class.registered]="isRegistered(player)">
          <div class="player-info" tabindex="0" (click)="viewPlayer.emit(player)" (keyup)="onPlayerInfoKey($event, player)">
            <img [src]="player.avatar || 'assets/images/default-avatar.svg'" [alt]="player.firstName" class="player-thumb" loading="lazy" (error)="onAvatarError($event)">
            <div class="player-details">
              <span class="player-name">{{ player.firstName }} {{ player.lastName }}</span>
              <span class="player-position">{{ player.position }}</span>
            </div>
          </div>
          <div class="player-actions">
            <button class="action-btn" [class.btn-success]="!isRegistered(player)" [class.btn-danger]="isRegistered(player)" (click)="toggleRegistration.emit(player)" [title]="isRegistered(player) ? 'Hủy đăng ký' : 'Đăng ký'">
              <i class="fas" [class.fa-plus]="!isRegistered(player)" [class.fa-minus]="isRegistered(player)"></i>
            </button>
            <button class="action-btn btn-warning" title="Sửa" (click)="startEdit(player)"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-outline-danger" title="Xóa" (click)="deletePlayer.emit(player)"><i class="fas fa-trash"></i></button>
          </div>
          <div class="player-edit-row" *ngIf="editingId === player.id">
            <input type="text" [(ngModel)]="editFirstName" name="editFirstName" class="form-control form-control-sm" placeholder="Tên" />
            <input type="text" [(ngModel)]="editLastName" name="editLastName" class="form-control form-control-sm" placeholder="Họ" />
            <input type="text" [(ngModel)]="editPosition" name="editPosition" class="form-control form-control-sm" placeholder="Vị trí" />
            <button class="btn btn-sm btn-success" (click)="commitEdit(player)"><i class="fas fa-check"></i></button>
            <button class="btn btn-sm btn-secondary" (click)="cancelEdit()"><i class="fas fa-times"></i></button>
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
        <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px; color: #6c757d;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <h4>Không có dữ liệu cầu thủ</h4>
          <p>Đang tải hoặc có lỗi khi tải danh sách cầu thủ.</p>
          <button class="modern-btn btn-primary" (click)="reload.emit()">Thử tải lại</button>
        </div>
      </ng-template>
    </div>
  </div>
  `,
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
  @Output() toggleRegistration = new EventEmitter<Player>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() savePlayers = new EventEmitter<void>();
  @Output() viewPlayer = new EventEmitter<Player>();
  @Output() toggleList = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
  @Output() createPlayer = new EventEmitter<{ firstName:string; lastName?:string; position?:string }>();
  @Output() updatePlayer = new EventEmitter<{ player:Player; updates:{ firstName?:string; lastName?:string; position?:string } }>();
  @Output() deletePlayer = new EventEmitter<Player>();

  trackByPlayerId = (_:number, p:Player) => p.id;
  isRegistered = (p:Player) => this.registeredPlayers.some(r=>r.id===p.id);
  get paginationStart(){ return (this.currentPage*this.pageSize)+1; }
  get paginationEnd(){ return Math.min((this.currentPage+1)*this.pageSize, this.displayPlayers.length); }
  onPlayerInfoKey(event:KeyboardEvent, player:Player){ if(event.key==='Enter' || event.key===' ') this.viewPlayer.emit(player); }
  onAvatarError(event:Event){ (event.target as HTMLImageElement).src='assets/images/default-avatar.svg'; }

  // Inline create state
  draftFirstName=''; draftLastName=''; draftPosition='';
  editingId:number|null=null; editFirstName=''; editLastName=''; editPosition='';
  onCreate(e:Event){ e.preventDefault(); if(!this.draftFirstName.trim()) return; this.createPlayer.emit({ firstName:this.draftFirstName, lastName:this.draftLastName, position:this.draftPosition||'Chưa xác định' }); this.draftFirstName=''; this.draftLastName=''; this.draftPosition=''; }
  startEdit(p:Player){ this.editingId=p.id; this.editFirstName=p.firstName; this.editLastName=p.lastName||''; this.editPosition=p.position; }
  cancelEdit(){ this.editingId=null; }
  commitEdit(p:Player){ if(this.editingId!==p.id) return; this.updatePlayer.emit({ player:p, updates:{ firstName:this.editFirstName, lastName:this.editLastName, position:this.editPosition } }); this.cancelEdit(); }
}
