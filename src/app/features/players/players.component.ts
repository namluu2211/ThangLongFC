import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { dividePlayersByPosition, Player } from './player-utils';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <button class="btn" (click)="divideTeams()">Chia đội tự động theo vị trí</button>
      <button class="btn" (click)="randomSubstitution()">Thay người ngẫu nhiên</button>
      <h3>Team A</h3>
      <div *ngFor="let pos of allPositions">
        <strong>{{pos}}:</strong>
        <span *ngFor="let p of getPlayersByPosition(teamA, pos)">
          <input type="text" [(ngModel)]="p.firstName" style="width:90px" /> <input type="text" [(ngModel)]="p.lastName" style="width:90px" />
        </span>
      </div>
      <div style="margin-top:12px;">
        <label>Tỷ số: <input type="text" [(ngModel)]="scoreA" style="width:60px" /></label>
        <label style="margin-left:12px;">Thẻ vàng: <input type="text" [(ngModel)]="yellowA" style="width:60px" /></label>
        <label style="margin-left:12px;">Thẻ đỏ: <input type="text" [(ngModel)]="redA" style="width:60px" /></label>
        <label style="margin-left:12px;">Ghi Bàn: <input type="text" [(ngModel)]="scorerA" style="width:120px" /></label>
        <label style="margin-left:12px;">Kiến Tạo: <input type="text" [(ngModel)]="assistA" style="width:120px" /></label>
      </div>
      <h3>Team B</h3>
      <div *ngFor="let pos of allPositions">
        <strong>{{pos}}:</strong>
        <span *ngFor="let p of getPlayersByPosition(teamB, pos)">
          <input type="text" [(ngModel)]="p.firstName" style="width:90px" /> <input type="text" [(ngModel)]="p.lastName" style="width:90px" />
        </span>
      </div>
      <div style="margin-top:12px;">
        <label>Tỷ số: <input type="text" [(ngModel)]="scoreB" style="width:60px" /></label>
        <label style="margin-left:12px;">Thẻ vàng: <input type="text" [(ngModel)]="yellowB" style="width:60px" /></label>
        <label style="margin-left:12px;">Thẻ đỏ: <input type="text" [(ngModel)]="redB" style="width:60px" /></label>
        <label style="margin-left:12px;">Ghi Bàn: <input type="text" [(ngModel)]="scorerB" style="width:120px" /></label>
        <label style="margin-left:12px;">Kiến Tạo: <input type="text" [(ngModel)]="assistB" style="width:120px" /></label>
      </div>
    </div>
  `
})
export class PlayersComponent implements OnInit {
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
