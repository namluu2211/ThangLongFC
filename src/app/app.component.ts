import { Component } from '@angular/core';
import { HeaderComponent } from './core/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatchInfoComponent } from './features/match-info/match-info.component';
import { HistoryComponent } from './features/history/history.component';
import { PlayersComponent } from './features/players/players.component';
import { FundComponent } from './features/fund/fund.component';
import { StatsComponent } from './features/stats/stats.component';
@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    MatchInfoComponent,
    HistoryComponent,
    PlayersComponent,
    FundComponent,
    StatsComponent
  ],
  template: `
    <div class="header">
      <div class="title">Thăng Long - FC</div>
      <app-header (loginChange)="onLoginChange($event)"></app-header>
    </div>
    <div class="container">
      <div *ngIf="loggedIn">
        <div class="hline"></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" (click)="show='match'">Thông tin trận đấu</button>
          <button class="btn" (click)="saveMatch()" [disabled]="!canEdit">Lưu trận đấu</button>
          <button class="btn" (click)="show='history'">Xem Lịch Sử</button>
          <button class="btn" (click)="show='list'">Danh sách</button>
          <button class="btn" (click)="show='fund'">Quỹ hiện tại</button>
          <button class="btn" (click)="show='stats'">Thống kê</button>
        </div>
        <div style="margin-top:12px;">
          <app-match-info *ngIf="show==='match'" [canEdit]="canEdit" (matchSaved)="onMatchSaved($event)"></app-match-info>
          <app-history *ngIf="show==='history'"></app-history>
          <app-players *ngIf="show==='list'"></app-players>
          <app-fund *ngIf="show==='fund'"></app-fund>
          <app-stats *ngIf="show==='stats'"></app-stats>
        </div>
      </div>
      <div *ngIf="!loggedIn" class="small">Vui lòng đăng nhập để sử dụng tính năng.</div>
    </div>
  `
})
export class AppComponent {
  loggedIn = false;
  role = '';
  show = 'match';
  canEdit = false;

  onLoginChange(e: any) {
    this.loggedIn = e.loggedIn;
    this.role = e.role;
    this.canEdit = (this.role==='admin' || this.role==='superadmin');
  }

  onMatchSaved(evt:any) {
    // when child notifies match saved
    this.show = 'history';
  }
  saveMatch() {
    // send event by localStorage flag so child can pick up
    localStorage.setItem('SAVE_MATCH_NOW','1');
    alert('Yêu cầu lưu trận đấu đã được gửi. Vui lòng mở Thông tin trận đấu và nhấn Lưu.');
  }
}
