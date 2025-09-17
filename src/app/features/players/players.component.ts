import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { dividePlayersByPosition, Player } from './player-utils';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="container mt-4">
      <div class="d-flex justify-content-center mb-4">
        <div class="btn-group" role="group">
          <button class="btn btn-primary" (click)="divideTeams()">Chia đội tự động theo vị trí</button>
          <button class="btn btn-success" (click)="randomSubstitution()">Thay người ngẫu nhiên</button>
        </div>
      </div>
  <div class="row gy-4">
        <div class="col-md-6">
          <div class="card mb-4 shadow-sm rounded-4 border-0">
            <div class="card-header bg-info text-white rounded-top-4"><h4 class="mb-0 fw-bold">Team A</h4></div>
            <div class="card-body">
              <div *ngFor="let pos of allPositions" class="mb-3">
                <div class="position-label mb-2">{{pos}}</div>
                <div class="players-row">
                  <ng-container *ngFor="let p of getPlayersByPosition(teamA, pos)">
                    <div class="player-card position-relative">
                      <img [src]="p.avatar" alt="avatar" class="player-avatar" />
                      <input type="text" [(ngModel)]="p.firstName" class="player-input" />
                      <button type="button" class="delete-btn" (click)="removePlayer(teamA, p)" title="Xóa khỏi trận này">✖</button>
                    </div>
                  </ng-container>
                </div>
              </div>
              <div class="mt-3 d-flex align-items-center gap-3 justify-content-center">
                <span title="Tỷ số" class="d-flex align-items-center"><span class="fw-bold">Tỷ số</span> <input type="text" [(ngModel)]="scoreA" class="form-control form-control-sm ms-1" style="width:120px" /></span>
                <span title="Thẻ vàng" class="d-flex align-items-center"><span style="font-size:1.5em;">🟨</span> <input type="text" [(ngModel)]="yellowA" class="form-control form-control-sm ms-1" style="width:60px" /></span>
                <span title="Thẻ đỏ" class="d-flex align-items-center"><span style="font-size:1.5em;">🟥</span> <input type="text" [(ngModel)]="redA" class="form-control form-control-sm ms-1" style="width:60px" /></span>
                <span title="Ghi Bàn" class="d-flex align-items-center"><span style="font-size:1.5em;">⚽</span> <input type="text" [(ngModel)]="scorerA" class="form-control form-control-sm ms-1" style="width:120px" /></span>
                <span title="Kiến Tạo" class="d-flex align-items-center"><span style="font-size:1.5em;">🎯</span> <input type="text" [(ngModel)]="assistA" class="form-control form-control-sm ms-1" style="width:120px" /></span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card mb-4 shadow-sm rounded-4 border-0">
            <div class="card-header bg-warning text-white rounded-top-4"><h4 class="mb-0 fw-bold">Team B</h4></div>
            <div class="card-body">
              <div *ngFor="let pos of allPositions" class="mb-3">
                <div class="position-label mb-2">{{pos}}</div>
                <div class="players-row">
                  <ng-container *ngFor="let p of getPlayersByPosition(teamB, pos)">
                    <div class="player-card position-relative">
                      <img [src]="p.avatar" alt="avatar" class="player-avatar" />
                      <input type="text" [(ngModel)]="p.firstName" class="player-input" />
                      <button type="button" class="delete-btn" (click)="removePlayer(teamB, p)" title="Xóa khỏi trận này">✖</button>
                    </div>
                  </ng-container>
                </div>
              </div>
              <div class="mt-3 d-flex align-items-center gap-3 justify-content-center">
                <span title="Tỷ số" class="d-flex align-items-center"><span class="fw-bold">Tỷ số</span> <input type="text" [(ngModel)]="scoreB" class="form-control form-control-sm ms-1" style="width:120px" /></span>
                <span title="Thẻ vàng" class="d-flex align-items-center"><span style="font-size:1.5em;">🟨</span> <input type="text" [(ngModel)]="yellowB" class="form-control form-control-sm ms-1" style="width:60px" /></span>
                <span title="Thẻ đỏ" class="d-flex align-items-center"><span style="font-size:1.5em;">🟥</span> <input type="text" [(ngModel)]="redB" class="form-control form-control-sm ms-1" style="width:60px" /></span>
                <span title="Ghi Bàn" class="d-flex align-items-center"><span style="font-size:1.5em;">⚽</span> <input type="text" [(ngModel)]="scorerB" class="form-control form-control-sm ms-1" style="width:120px" /></span>
                <span title="Kiến Tạo" class="d-flex align-items-center"><span style="font-size:1.5em;">🎯</span> <input type="text" [(ngModel)]="assistB" class="form-control form-control-sm ms-1" style="width:120px" /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PlayersComponent implements OnInit {
  removePlayer(team: any[], player: any) {
    const idx = team.indexOf(player);
    if (idx > -1) team.splice(idx, 1);
  }
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

  ngOnInit() {
    fetch('/assets/players.json').then(r=>r.json()).then(json => {
      json.forEach((p: any) => {
        p.scorer = '';
        p.assist = '';
      });
      this.allPlayers = json;
      this.divideTeams();
    });
  }

  divideTeams() {
    const { teamA, teamB } = dividePlayersByPosition(this.allPlayers);
    this.teamA = teamA;
    this.teamB = teamB;
  }

  randomSubstitution() {
    // Randomly pick a player from allPlayers and swap with a random player in teamA or teamB
    if (this.allPlayers.length === 0) return;
    const all = this.allPlayers;
    const idxA = Math.floor(Math.random() * this.teamA.length);
    const idxB = Math.floor(Math.random() * this.teamB.length);
    const idxAllA = Math.floor(Math.random() * all.length);
    const idxAllB = Math.floor(Math.random() * all.length);
    this.teamA[idxA] = { ...all[idxAllA] };
    this.teamB[idxB] = { ...all[idxAllB] };
  }

  getPlayersByPosition(team: any[], pos: string) {
    return team.filter(x => x.position === pos);
  }
}
