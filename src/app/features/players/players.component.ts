import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { dividePlayersByPosition, Player } from './player-utils';


@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="container mt-4">
      <ng-container *ngIf="mode === 'auto'; else listMode">
        <div class="d-flex justify-content-center mb-4" style="gap:12px;">
          <button class="btn btn-primary" (click)="setUseRegistered(true)" [disabled]="canEdit">Chia đội từ đăng ký</button>   
          <button class="btn btn-success ms-2" (click)="saveMatchInfo()" [disabled]="!canEdit">Lưu Thông Tin</button>
            <!-- Only one set of buttons should be rendered -->
          <span *ngIf="matchSaveMessage" class="ms-2 text-success small">{{matchSaveMessage}}</span>
        </div>
        <div class="teams-frame">
          <div class="team-frame">
            <div class="card mb-4 shadow-sm rounded-4 border-0">
              <div class="card-header bg-info text-white rounded-top-4 d-flex align-items-center" style="gap:8px;">
                <h4 class="mb-0 fw-bold">Team A</h4>
                <input type="number" [(ngModel)]="scoreA" class="score-input form-control form-control-sm" min="0" max="99" maxlength="2" inputmode="numeric" pattern="[0-9]*" style="width:38px;" />
              </div>
              <div class="card-body">
                <div class="team-stats mb-3">
                  <div class="d-flex align-items-center mb-2"><span style="font-size:1.5em;">⚽</span> <input type="text" [(ngModel)]="scorerA" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                  <div class="d-flex align-items-center mb-2"><span style="font-size:1.5em;">🎯</span> <input type="text" [(ngModel)]="assistA" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                  <div class="d-flex align-items-center mb-2"><span style="font-size:1.5em;">🟨</span> <input type="text" [(ngModel)]="yellowA" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                  <div class="d-flex align-items-center"><span style="font-size:1.5em;">🟥</span> <input type="text" [(ngModel)]="redA" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                </div>
                <div *ngFor="let pos of allPositions" class="mb-3">
                  <div class="position-label mb-2">{{pos}}</div>
                  <div class="players-row">
                    <ng-container *ngIf="getPlayersByPosition(teamA, pos).length; else noPlayersA">
                      <ng-container *ngFor="let p of getPlayersByPosition(teamA, pos)">
                        <div class="player-card position-relative">
                          <img [src]="p.avatar" alt="avatar" class="player-avatar" />
                          <input type="text" [(ngModel)]="p.firstName" class="player-input" />
                          <button type="button" class="delete-btn" (click)="removePlayer(teamA, p)" title="Xóa khỏi trận này">✖</button>
                        </div>
                      </ng-container>
                    </ng-container>
                    <ng-template #noPlayersA><div class="text-muted" style="padding:8px 0;">Không có cầu thủ</div></ng-template>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="team-frame">
            <div class="card mb-4 shadow-sm rounded-4 border-0">
              <div class="card-header bg-warning text-white rounded-top-4 d-flex align-items-center" style="gap:8px;">
                <h4 class="mb-0 fw-bold">Team B</h4>
                <input type="number" [(ngModel)]="scoreB" class="score-input form-control form-control-sm" min="0" max="99" maxlength="2" inputmode="numeric" pattern="[0-9]*" style="width:38px;" />
              </div>
              <div class="card-body">
                <div class="team-stats mb-3">
                  <div class="d-flex align-items-center mb-2"><span style="font-size:1.5em;">⚽</span> <input type="text" [(ngModel)]="scorerB" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                  <div class="d-flex align-items-center mb-2"><span style="font-size:1.5em;">🎯</span> <input type="text" [(ngModel)]="assistB" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                  <div class="d-flex align-items-center mb-2"><span style="font-size:1.5em;">🟨</span> <input type="text" [(ngModel)]="yellowB" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                  <div class="d-flex align-items-center"><span style="font-size:1.5em;">🟥</span> <input type="text" [(ngModel)]="redB" class="stat-input form-control form-control-sm ms-1" maxlength="100" /></div>
                </div>
                <div *ngFor="let pos of allPositions" class="mb-3">
                  <div class="position-label mb-2">{{pos}}</div>
                  <div class="players-row">
                    <ng-container *ngIf="getPlayersByPosition(teamB, pos).length; else noPlayersB">
                      <ng-container *ngFor="let p of getPlayersByPosition(teamB, pos)">
                        <div class="player-card position-relative">
                          <img [src]="p.avatar" alt="avatar" class="player-avatar" />
                          <input type="text" [(ngModel)]="p.firstName" class="player-input" />
                          <button type="button" class="delete-btn" (click)="removePlayer(teamB, p)" title="Xóa khỏi trận này">✖</button>
                        </div>
                      </ng-container>
                    </ng-container>
                    <ng-template #noPlayersB><div class="text-muted" style="padding:8px 0;">Không có cầu thủ</div></ng-template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
      <ng-template #listMode>
        <div class="d-flex justify-content-center mb-4">
          <h3 class="fw-bold">Danh sách cầu thủ</h3>
        </div>
        <div class="row justify-content-center">
          <div class="col-12 col-md-10">
            <div class="card p-3">
              <div class="d-flex align-items-center mb-2" style="gap:12px;">
                <span class="fw-bold">Đã đăng ký: {{registeredPlayers.length}}</span>
                <button class="btn btn-success btn-sm" (click)="saveRegisteredPlayers()">Lưu danh sách đăng ký</button>
                <span *ngIf="saveRegisteredMessage" class="ms-2 text-success small">{{saveRegisteredMessage}}</span>
              </div>
              <div *ngFor="let pos of allPositions" class="mb-3">
                <div class="fw-bold mb-2" style="font-size:1.1rem;">{{pos}}:</div>
                <div class="players-line">
                  <span *ngFor="let p of getPlayersByPosition(allPlayers, pos); let last = last" style="display:inline-flex;align-items:center;gap:4px;">
                    <input type="checkbox" [checked]="isRegistered(p)" (change)="registerToggle(p, $event.target.checked)" />
                    <img [src]="p.avatar" alt="avatar" class="player-avatar-small clickable" (click)="viewPlayer(p)" style="width:28px;height:28px;border-radius:50%;object-fit:cover;cursor:pointer;vertical-align:middle;" />
                    <span>{{p.firstName}} {{p.lastName}}</span>
                    <span *ngIf="isRegistered(p)" style="color:#28a745;font-weight:bold;">✔</span>
                    {{!last ? ', ' : ''}}
                  </span>
                </div>
              </div>
              <div *ngIf="selectedPlayer" class="modal-backdrop" (click)="closePlayerModal()">
                <div class="modal-content" (click)="$event.stopPropagation()">
                  <div class="modal-header fw-bold">Chi tiết cầu thủ</div>
                  <div class="modal-body">
                    <img [src]="selectedPlayer.avatar" alt="avatar" class="player-avatar mb-2" />
                    <div><b>Tên:</b> {{selectedPlayer.firstName}} {{selectedPlayer.lastName}}</div>
                    <div><b>Vị trí:</b> {{selectedPlayer.position}}</div>
                    <div><b>Tuổi:</b> {{selectedPlayer.age}}</div>
                    <div><b>Chiều cao:</b> {{selectedPlayer.height}} cm</div>
                    <div><b>Cân nặng:</b> {{selectedPlayer.weight}} kg</div>
                  </div>
                  <div class="modal-footer"><button class="btn btn-secondary" (click)="closePlayerModal()">Đóng</button></div>
                </div>
              </div>
              <div *ngIf="canEdit" class="text-end mt-3">
                <button class="btn btn-success" (click)="savePlayers()">Lưu thay đổi</button>
                <span *ngIf="saveMessage" class="ms-2 text-success small">{{saveMessage}}</span>
              </div>
            </div>
          </div>
        </div>
      </ng-template>
  `,
})
export class PlayersComponent implements OnInit {
  isRegistered(player: Player): boolean {
    return this.registeredPlayers.some(rp => rp.id === player.id);
  }
  closePlayerModal() {
    this.selectedPlayer = null;
  }
  @Input() canEdit: boolean = false;
  @Input() isAdmin: boolean = false;
  matchSaveMessage = '';
  saveMatchInfo() {
    // Gather match info
    const match = {
      date: new Date().toISOString(),
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      scorerA: this.scorerA,
      scorerB: this.scorerB,
      assistA: this.assistA,
      assistB: this.assistB,
      yellowA: this.yellowA,
      yellowB: this.yellowB,
      redA: this.redA,
      redB: this.redB,
      teamA: this.teamA.map(p => ({ ...p })),
      teamB: this.teamB.map(p => ({ ...p })),
    };
    // Save to localStorage
    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    history.push(match);
    localStorage.setItem('matchHistory', JSON.stringify(history));
    this.matchSaveMessage = 'Đã lưu lịch sử trận!';
    setTimeout(() => this.matchSaveMessage = '', 2000);
  }
  registeredPlayers: Player[] = [];
  useRegistered: boolean = false;
  viewPlayer(p: any) {
    this.selectedPlayer = p;
  }
  saveMessage = '';
  savePlayers() {
    localStorage.setItem('players.json', JSON.stringify(this.allPlayers));
    this.saveMessage = 'Đã lưu thay đổi!';
    setTimeout(() => this.saveMessage = '', 2000);
  }
  saveRegisteredMessage: string = '';

  saveRegisteredPlayers() {
    localStorage.setItem('registeredPlayers', JSON.stringify(this.registeredPlayers));
    // Reload registeredPlayers from localStorage to ensure latest data
    const regPlayers = localStorage.getItem('registeredPlayers');
    if (regPlayers) {
      try {
        this.registeredPlayers = JSON.parse(regPlayers);
      } catch {}
    }
    this.saveRegisteredMessage = 'Đã lưu danh sách đăng ký!';
    setTimeout(() => this.saveRegisteredMessage = '', 2000);
  }
  @Input() mode: 'auto' | 'list' = 'auto';
  allPlayers: any[] = [];
  teamA: any[] = [];
  teamB: any[] = [];
  allPositions: string[] = [
    'Thủ môn',
    'Trung vệ',
    'Hậu vệ',
    'Tiền vệ',
    'Tiền đạo'
  ];
  scoreA = '';
  yellowA = '';
  redA = '';
  scorerA = '';
  assistA = '';
  scoreB = '';
  yellowB = '';
  redB = '';
  scorerB = '';
  assistB = '';
  selectedPlayer: any = null;

  ngOnInit() {
    // Load registered players from localStorage if available
    const regPlayers = localStorage.getItem('registeredPlayers');
    if (regPlayers) {
      try {
        this.registeredPlayers = JSON.parse(regPlayers);
      } catch {}
    }
    fetch('assets/players.json')
      .then(r => {
        if (!r.ok) throw new Error('Không thể tải danh sách cầu thủ');
        return r.json();
      })
      .then(json => {
        json.forEach((p: any) => {
          p.scorer = '';
          p.assist = '';
        });
        this.allPlayers = json;
        this.divideTeams();
      })
      .catch(err => {
        alert(err.message);
        this.allPlayers = [];
        this.teamA = [];
        this.teamB = [];
      });
  }

  divideTeams() {
    const source = this.useRegistered ? this.registeredPlayers : this.allPlayers;
    const { teamA, teamB } = dividePlayersByPosition(source);
    this.teamA = teamA;
    this.teamB = teamB;
  }

  removePlayer(team: any[], player: any) {
    const idx = team.indexOf(player);
    if (idx > -1) team.splice(idx, 1);
  }

  getPlayersByPosition(team: any[], pos: string) {
    return team.filter(x => x.position === pos);
  }

  setUseRegistered(val: boolean) {
  this.useRegistered = val;
  this.divideTeams();
  }

  registerToggle(player: Player, checked: boolean) {
    if (checked) {
      if (!this.registeredPlayers.some(p => p.id === player.id)) {
        this.registeredPlayers.push(player);
      }
    } else {
      this.registeredPlayers = this.registeredPlayers.filter(p => p.id !== player.id);
    }
  }
}
