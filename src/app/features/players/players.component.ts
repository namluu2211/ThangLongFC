import { Component, OnInit, Input, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { dividePlayersByPosition, Player } from './player-utils';


@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="container mt-4">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-4">
        <div class="loading-spinner"></div>
        <p class="mt-2 text-muted">Đang tải danh sách cầu thủ...</p>
      </div>
      
      <!-- Error State -->
      <div *ngIf="errorMessage && !isLoading" class="alert alert-danger text-center">
        <p class="mb-2">{{errorMessage}}</p>
        <button class="btn btn-outline-danger btn-sm" (click)="loadAllPlayers()">Thử lại</button>
      </div>
      
      <ng-container *ngIf="!isLoading && !errorMessage">
        <ng-container *ngIf="mode === 'auto'; else listMode">
        <div class="d-flex justify-content-center mb-4" style="gap:12px;">
          <button class="btn btn-primary" (click)="setUseRegistered(true)" [disabled]="canEdit">Chia đội đăng ký</button>   
          <button class="btn btn-success ms-2" (click)="saveMatchInfo()" [disabled]="!canEdit">Lưu Thông Tin</button>
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
                <div *ngFor="let pos of allPositions; trackBy: trackByPosition" class="mb-3">
                  <div class="position-label mb-2">{{pos}}</div>
                  <div class="players-row" 
                       cdkDropList 
                       [cdkDropListData]="getPlayersByPosition(teamA, pos)" 
                       (cdkDropListDropped)="onDrop($event, 'A', pos)"
                       [cdkDropListConnectedTo]="getConnectedDropLists()"
                       id="teamA-{{pos}}">
                    <ng-container *ngIf="getPlayersByPosition(teamA, pos).length; else noPlayersA">
                      <ng-container *ngFor="let p of getPlayersByPosition(teamA, pos); trackBy: trackByPlayer">
                        <div class="player-card position-relative" 
                             cdkDrag 
                             [cdkDragData]="p"
                             (cdkDragStarted)="onDragStarted(p)"
                             (cdkDragEnded)="onDragEnded()">
                          <img [src]="p.avatar" 
                               alt="avatar" 
                               class="player-avatar" 
                               (error)="onAvatarError($event, p)"
                               loading="lazy" />
                          <input type="text" [(ngModel)]="p.firstName" class="player-input" />
                          <button type="button" class="delete-btn" (click)="removePlayer(teamA, p)" title="Xóa khỏi trận này">✖</button>
                          <div class="drag-handle" title="Kéo để di chuyển">⋮⋮</div>
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
                <div *ngFor="let pos of allPositions; trackBy: trackByPosition" class="mb-3">
                  <div class="position-label mb-2">{{pos}}</div>
                  <div class="players-row" 
                       cdkDropList 
                       [cdkDropListData]="getPlayersByPosition(teamB, pos)" 
                       (cdkDropListDropped)="onDrop($event, 'B', pos)"
                       [cdkDropListConnectedTo]="getConnectedDropLists()"
                       id="teamB-{{pos}}">
                    <ng-container *ngIf="getPlayersByPosition(teamB, pos).length; else noPlayersB">
                      <ng-container *ngFor="let p of getPlayersByPosition(teamB, pos); trackBy: trackByPlayer">
                        <div class="player-card position-relative" 
                             cdkDrag 
                             [cdkDragData]="p"
                             (cdkDragStarted)="onDragStarted(p)"
                             (cdkDragEnded)="onDragEnded()">
                          <img [src]="p.avatar" 
                               alt="avatar" 
                               class="player-avatar" 
                               (error)="onAvatarError($event, p)"
                               loading="lazy" />
                          <input type="text" [(ngModel)]="p.firstName" class="player-input" />
                          <button type="button" class="delete-btn" (click)="removePlayer(teamB, p)" title="Xóa khỏi trận này">✖</button>
                          <div class="drag-handle" title="Kéo để di chuyển">⋮⋮</div>
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
              <div *ngFor="let pos of allPositions; trackBy: trackByPosition" class="mb-3">
                <div class="fw-bold mb-2" style="font-size:1.1rem;">{{pos}}:</div>
                <div class="players-line">
                  <span *ngFor="let p of getPlayersByPosition(allPlayers, pos); let last = last; trackBy: trackByPlayer" style="display:inline-flex;align-items:center;gap:4px;">
                    <input type="checkbox" [checked]="isRegistered(p)" (change)="registerToggle(p, $event.target.checked)" />
                    <img [src]="p.avatar" 
                         alt="avatar" 
                         class="player-avatar-small clickable" 
                         (click)="viewPlayer(p)" 
                         (error)="onAvatarError($event, p)"
                         loading="lazy"
                         style="width:28px;height:28px;border-radius:50%;object-fit:cover;cursor:pointer;vertical-align:middle;" />
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
                    <img [src]="selectedPlayer.avatar" 
                         alt="avatar" 
                         class="player-avatar mb-2" 
                         (error)="onAvatarError($event, selectedPlayer)"
                         loading="lazy" />
                    <div><b>Tên:</b> {{selectedPlayer.firstName}} {{selectedPlayer.lastName || ''}}</div>
                    <div><b>Vị trí:</b> {{selectedPlayer.position}}</div>
                    <div><b>DOB:</b> {{selectedPlayer.DOB || 'Chưa có thông tin'}}</div>
                    <div><b>Chiều cao:</b> {{selectedPlayer.height}} cm</div>
                    <div><b>Cân nặng:</b> {{selectedPlayer.weight}} kg</div>
                    <div *ngIf="selectedPlayer.note"><b>Ghi chú:</b> {{selectedPlayer.note}}</div>
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
      </ng-container>
  `,
  styles: [`
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      opacity: 0.8;
    }

    .cdk-drag-placeholder {
      opacity: 0.4;
      border: 2px dashed #ccc;
      background: #f8f9fa;
    }

    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .players-row.cdk-drop-list-receiving {
      background-color: #e3f2fd;
      border: 2px dashed #2196f3;
      border-radius: 8px;
    }

    .player-card {
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px;
      margin: 4px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      position: relative;
      min-width: 80px;
      max-width: 120px;
    }

    .player-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: #007bff;
    }
    
    .player-avatar {
      width: 40px !important;
      height: 40px !important;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 4px;
    }

    .player-card.cdk-drag-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .position-label {
      font-weight: 600;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
      padding-bottom: 4px;
    }

    .teams-frame {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: clamp(8px, 2vw, 12px);
      container-type: inline-size;
      max-width: 100%;
    }
    
    /* Input styling optimizations */
    .score-input {
      width: 50px !important;
      min-width: 40px;
      max-width: 60px;
      padding: 4px 6px !important;
      text-align: center;
      font-weight: bold;
    }
    
    .stat-input {
      flex: 1;
      min-width: 0;
      padding: 4px 8px !important;
      font-size: 0.9em;
    }
    
    .player-input {
      width: 100% !important;
      max-width: 100%;
      padding: 4px 6px;
      font-size: 0.85em;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      text-align: center;
      background: white;
    }
    
    /* Team stats container optimization */
    .team-stats {
      margin-bottom: 12px !important;
    }
    
    .team-stats .d-flex {
      margin-bottom: 6px !important;
      align-items: center;
      gap: 4px;
    }
    
    .team-stats span {
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    @media (max-width: 768px) {
      .teams-frame {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .score-input {
        width: 45px !important;
      }
      
      .stat-input {
        font-size: 0.8em;
        padding: 3px 6px !important;
      }
      
      .player-input {
        font-size: 0.8em;
        padding: 3px 5px;
      }
    }
    
    /* Card and layout optimizations */
    .card {
      margin-bottom: 16px !important;
      height: fit-content;
    }
    
    .card-body {
      padding: 12px !important;
    }
    
    .card-header {
      padding: 8px 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
    }
    
    .card-header h4 {
      margin: 0 !important;
      flex: 1;
    }
    
    /* Container improvements */
    .container {
      max-width: 1200px !important;
      padding: 0 12px;
    }
    
    /* Button layout improvements */
    .d-flex.justify-content-center {
      flex-wrap: wrap;
      gap: 8px !important;
    }
    
    .position-label {
      margin-bottom: 8px !important;
      font-size: 0.9em;
      padding-bottom: 2px;
    }
    
    .players-row {
      min-height: 60px;
      padding: 8px 4px;
      border-radius: 8px;
      margin-bottom: 12px !important;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 4px;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }
    
    .players-row:empty::after {
      content: "Kéo cầu thủ vào đây";
      color: #6c757d;
      font-style: italic;
      font-size: 0.8em;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      width: 100%;
    }

    /* Delete button styling */
    .delete-btn {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #dc3545;
      color: white;
      border: none;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      cursor: pointer;
      z-index: 10;
    }
    
    .player-card:hover .delete-btn {
      opacity: 1;
    }
    
    .delete-btn:hover {
      background: #c82333;
      transform: scale(1.1);
    }

    /* Drag handle styling */
    .drag-handle {
      position: absolute;
      top: -4px;
      left: -4px;
      width: 20px;
      height: 20px;
      font-size: 8px;
      color: #6c757d;
      cursor: grab;
      opacity: 0;
      transition: opacity 0.2s ease;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #dee2e6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-card:hover .drag-handle {
      opacity: 1;
    }

    .cdk-drag-dragging .drag-handle {
      cursor: grabbing;
    }

    /* Performance optimizations */
    .player-card {
      will-change: transform;
      contain: layout style paint;
    }

    .players-row {
      contain: layout style;
    }

    /* Loading state */
    .loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Avatar loading states */
    .player-avatar {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      transition: opacity 0.3s ease;
    }

    .player-avatar[src*="default-avatar"] {
      background-color: #007bff;
    }

    .player-avatar:not([src]), .player-avatar[src=""] {
      background-size: cover;
    }
  `]
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
    try {
      const match = this.createMatchData();
      this.saveToHistory(match);
      this.showTemporaryMessage('matchSaveMessage', 'Đã lưu lịch sử trận!');
    } catch (error) {
      console.error('Error saving match info:', error);
      this.showTemporaryMessage('matchSaveMessage', 'Lỗi khi lưu trận đấu!');
    }
  }

  private createMatchData() {
    return {
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
  }

  private saveToHistory(match: any) {
    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    history.push(match);
    localStorage.setItem('matchHistory', JSON.stringify(history));
  }
  registeredPlayers: Player[] = [];
  useRegistered: boolean = false;
  viewPlayer(p: any) {
    this.selectedPlayer = p;
  }
  saveMessage = '';
  saveRegisteredMessage: string = '';

  savePlayers() {
    try {
      localStorage.setItem('players.json', JSON.stringify(this.allPlayers));
      this.showTemporaryMessage('saveMessage', 'Đã lưu thay đổi!');
    } catch (error) {
      console.error('Error saving players:', error);
      this.showTemporaryMessage('saveMessage', 'Lỗi khi lưu!');
    }
  }

  saveRegisteredPlayers() {
    try {
      localStorage.setItem('registeredPlayers', JSON.stringify(this.registeredPlayers));
      this.loadRegisteredPlayers(); // Reload to ensure consistency
      this.showTemporaryMessage('saveRegisteredMessage', 'Đã lưu danh sách đăng ký!');
    } catch (error) {
      console.error('Error saving registered players:', error);
      this.showTemporaryMessage('saveRegisteredMessage', 'Lỗi khi lưu danh sách!');
    }
  }

  private showTemporaryMessage(property: keyof this, message: string, duration = 2000) {
    (this as any)[property] = message;
    setTimeout(() => (this as any)[property] = '', duration);
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

  // TrackBy functions for performance optimization
  trackByPosition: TrackByFunction<string> = (index: number, position: string) => position;
  trackByPlayer: TrackByFunction<Player> = (index: number, player: Player) => player.id;
  
  // Drag state
  isDragging = false;
  draggedPlayer: Player | null = null;
  
  // Loading and error states
  isLoading = false;
  errorMessage = '';

  ngOnInit() {
    this.loadRegisteredPlayers();
    this.loadAllPlayers();
  }

  private loadRegisteredPlayers() {
    const regPlayers = localStorage.getItem('registeredPlayers');
    if (regPlayers) {
      try {
        this.registeredPlayers = JSON.parse(regPlayers);
      } catch (error) {
        console.error('Error parsing registered players:', error);
        this.registeredPlayers = [];
      }
    }
  }

  // Sync registered players with current data from allPlayers
  private syncRegisteredPlayersData() {
    if (this.registeredPlayers.length > 0 && this.allPlayers.length > 0) {
      this.registeredPlayers = this.registeredPlayers.map(regPlayer => {
        // Find the corresponding player in allPlayers to get the latest data
        const currentPlayer = this.allPlayers.find(p => p.id === regPlayer.id);
        if (currentPlayer) {
          // Use the current player data but preserve registration status
          return { ...currentPlayer };
        }
        return regPlayer;
      });
      console.log('Synced registered players with current data');
    }
  }

  async loadAllPlayers() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response = await fetch('assets/players.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const players = await response.json();
      console.log('Loaded players:', players.length, 'players');
      this.initializePlayers(players);
      this.allPlayers = players;
      console.log('All players set:', this.allPlayers.length);
      
      // Sync registered players with current data to ensure avatars match
      this.syncRegisteredPlayersData();
      
      this.divideTeams();
    } catch (error) {
      console.error('Error loading players:', error);
      this.errorMessage = 'Không thể tải danh sách cầu thủ. Vui lòng thử lại.';
      this.initializeEmptyTeams();
    } finally {
      this.isLoading = false;
    }
  }

  private initializePlayers(players: any[]) {
    players.forEach((player: any) => {
      player.scorer = '';
      player.assist = '';
      
      // Debug logging for avatar paths - catch all external URLs
      if (!player.avatar || player.avatar.includes('randomuser.me') || player.avatar.startsWith('https://') || player.avatar.startsWith('http://')) {
        console.warn(`Player ${player.firstName} has invalid avatar: ${player.avatar}`);
        player.avatar = 'assets/images/default-avatar.svg';
      }
    });
  }

  private initializeEmptyTeams() {
    this.allPlayers = [];
    this.teamA = [];
    this.teamB = [];
  }

  divideTeams() {
    const source = this.useRegistered ? this.registeredPlayers : this.allPlayers;
    console.log('Dividing teams with source:', source.length, 'players, useRegistered:', this.useRegistered);
    const { teamA, teamB } = dividePlayersByPosition(source);
    this.teamA = teamA;
    this.teamB = teamB;
    console.log('Teams divided - A:', this.teamA.length, 'B:', this.teamB.length);
  }

  getConnectedDropLists(): string[] {
    const lists: string[] = [];
    
    // Add team A lists
    this.allPositions.forEach(pos => {
      lists.push(`teamA-${pos}`);
    });
    
    // Add team B lists
    this.allPositions.forEach(pos => {
      lists.push(`teamB-${pos}`);
    });
    
    return lists;
  }

  removePlayer(team: any[], player: any) {
    const idx = team.indexOf(player);
    if (idx > -1) {
      team.splice(idx, 1);
    }
  }

  getPlayersByPosition(team: any[], pos: string) {
    return team.filter(x => x.position === pos);
  }

  setUseRegistered(val: boolean) {
    this.useRegistered = val;
    // Sync registered players with latest data before dividing teams
    this.syncRegisteredPlayersData();
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

  onDrop(event: CdkDragDrop<Player[]>, targetTeam: 'A' | 'B', targetPosition: string) {
    const draggedPlayer = event.item.data || event.previousContainer.data[event.previousIndex];
    
    if (!draggedPlayer) return;

    // Get source container info
    const sourceContainerId = event.previousContainer.id || '';
    let sourceTeam: 'A' | 'B' = 'A';
    let sourcePosition = '';

    if (sourceContainerId.startsWith('teamA-')) {
      sourceTeam = 'A';
      sourcePosition = sourceContainerId.replace('teamA-', '');
    } else if (sourceContainerId.startsWith('teamB-')) {
      sourceTeam = 'B';
      sourcePosition = sourceContainerId.replace('teamB-', '');
    }

    // If dropping in the same container, just reorder
    if (event.previousContainer === event.container) {
      const players = event.container.data;
      const movedPlayer = players.splice(event.previousIndex, 1)[0];
      players.splice(event.currentIndex, 0, movedPlayer);
      return;
    }

    // Remove player from source
    this.removePlayerFromTeam(draggedPlayer, sourceTeam);

    // Update player position if needed (allow position changes)
    if (targetPosition !== sourcePosition) {
      draggedPlayer.position = targetPosition;
    }

    // Add player to target
    this.addPlayerToTeam(draggedPlayer, targetTeam);
  }

  private removePlayerFromTeam(player: any, team: 'A' | 'B') {
    switch (team) {
      case 'A':
        const indexA = this.teamA.findIndex(p => p.id === player.id);
        if (indexA > -1) this.teamA.splice(indexA, 1);
        break;
      case 'B':
        const indexB = this.teamB.findIndex(p => p.id === player.id);
        if (indexB > -1) this.teamB.splice(indexB, 1);
        break;
    }
  }

  private addPlayerToTeam(player: any, team: 'A' | 'B') {
    switch (team) {
      case 'A':
        if (!this.teamA.find(p => p.id === player.id)) {
          this.teamA.push(player);
        }
        break;
      case 'B':
        if (!this.teamB.find(p => p.id === player.id)) {
          this.teamB.push(player);
        }
        break;
    }
  }

  onDragStarted(player: Player) {
    this.isDragging = true;
    this.draggedPlayer = player;
  }

  onDragEnded() {
    this.isDragging = false;
    this.draggedPlayer = null;
  }

  onAvatarError(event: any, player: any) {
    // Set a default avatar when the image fails to load
    const defaultAvatar = 'assets/images/default-avatar.svg';
    event.target.src = defaultAvatar;
    
    // Also update the player object to prevent repeated failures
    player.avatar = defaultAvatar;
    
    console.warn(`Avatar failed to load for player: ${player.firstName}, using default avatar`);
  }

  // Method to clear cached data (kept for future debugging - not exposed in UI)
  // clearCachedData() {
  //   localStorage.removeItem('registeredPlayers');
  //   localStorage.removeItem('players.json');
  //   console.log('Cleared cached player data');
  //   // Reload the page to start fresh
  //   window.location.reload();
  // }
}
