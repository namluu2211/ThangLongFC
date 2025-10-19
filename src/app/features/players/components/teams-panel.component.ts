import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Player } from '../player-utils';

@Component({
  selector: 'app-teams-panel',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="teams-container" *ngIf="teamA || teamB">
      <div class="teams-row">
        <div class="team-card">
          <div class="team-header team-a">
            <h3>🔵 Đội Xanh ({{teamA.length}})</h3>
            <div class="score-section">
              <label for="scoreA">Bàn thắng:</label>
              <input id="scoreA" type="number" [(ngModel)]="scoreA" (change)="scoreAChange.emit(scoreA)" class="score-input" min="0" />
            </div>
          </div>
          <div class="team-content">
            <h4 class="section-title">Cầu thủ</h4>
            <div cdkDropList [cdkDropListData]="teamA" (cdkDropListDropped)="dropped($event)" class="players-row team-players" aria-label="Khu vực Đội Xanh">
              <div *ngFor="let player of teamA; trackBy: trackByPlayerId" cdkDrag class="player-card team-member" [attr.aria-label]="player.firstName">
                <img [src]="player.avatar || 'assets/images/default-avatar.svg'" (error)="onAvatarError($event)" class="player-avatar" [alt]="player.firstName" loading="lazy" />
                <span class="player-name">{{player.firstName}}</span>
                <button class="delete-btn" (click)="removePlayer.emit({player, team: 'A'})" aria-label="Xóa khỏi đội xanh">×</button>
              </div>
            </div>
          </div>
        </div>
        <div class="team-card">
          <div class="team-header team-b">
            <h3>🟠 Đội Cam ({{teamB.length}})</h3>
            <div class="score-section">
              <label for="scoreB">Bàn thắng:</label>
              <input id="scoreB" type="number" [(ngModel)]="scoreB" (change)="scoreBChange.emit(scoreB)" class="score-input" min="0" />
            </div>
          </div>
          <div class="team-content">
            <h4 class="section-title">Cầu thủ</h4>
            <div cdkDropList [cdkDropListData]="teamB" (cdkDropListDropped)="dropped($event)" class="players-row team-players" aria-label="Khu vực Đội Cam">
              <div *ngFor="let player of teamB; trackBy: trackByPlayerId" cdkDrag class="player-card team-member" [attr.aria-label]="player.firstName">
                <img [src]="player.avatar || 'assets/images/default-avatar.svg'" (error)="onAvatarError($event)" class="player-avatar" [alt]="player.firstName" loading="lazy" />
                <span class="player-name">{{player.firstName}}</span>
                <button class="delete-btn" (click)="removePlayer.emit({player, team: 'B'})" aria-label="Xóa khỏi đội cam">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamsPanelComponent {
  @Input() teamA: Player[] = [];
  @Input() teamB: Player[] = [];
  @Input() scoreA = 0;
  @Input() scoreB = 0;
  @Output() scoreAChange = new EventEmitter<number>();
  @Output() scoreBChange = new EventEmitter<number>();
  @Output() removePlayer = new EventEmitter<{player: Player; team: 'A'|'B'}>();
  @Output() teamDrop = new EventEmitter<CdkDragDrop<Player[]>>();

  trackByPlayerId = (_:number, p:Player)=>p.id;
  onAvatarError(event:Event){ (event.target as HTMLImageElement).src='assets/images/default-avatar.svg'; }
  dropped(event:CdkDragDrop<Player[]>) { this.teamDrop.emit(event); }
}
