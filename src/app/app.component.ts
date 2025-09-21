import { Component } from '@angular/core';
import { HeaderComponent } from './core/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
      <div class="hline"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" (click)="show='auto'">Chia đội tự động</button>
        <button class="btn" (click)="show='history'">Xem Lịch Sử</button>
        <button class="btn" (click)="show='list'">Danh sách</button>
        <button class="btn" (click)="show='fund'">Quỹ hiện tại</button>
        <button class="btn" (click)="show='stats'">Thống kê</button>
      </div>
      <div style="margin-top:12px;">
  <app-players *ngIf="show==='auto'" [canEdit]="canEdit" mode="auto"></app-players>
  <app-history *ngIf="show==='history'" [canEdit]="canEdit"></app-history>
  <app-players *ngIf="show==='list'" [canEdit]="canEdit" mode="list"></app-players>
  <div *ngIf="show==='fund'" style="font-size:1.2em; margin-bottom:16px; color:#007bff; font-weight:bold;">Quỹ hiện tại: {{currentFund | number}}</div>
  <app-fund *ngIf="show==='fund'" [canEdit]="canEdit"></app-fund>
  <app-stats *ngIf="show==='stats'"></app-stats>
      </div>
      <div *ngIf="!loggedIn" class="small">Bạn đang xem ở chế độ khách. Đăng nhập để chỉnh sửa hoặc lưu dữ liệu.</div>
    </div>
  `
})
export class AppComponent {
  loggedIn = false;
  role = '';
  show = 'auto'; // default to 'Chia đội tự động' for better UX
  canEdit = false;

  onLoginChange(event: { loggedIn: boolean; role: string }) {
    this.loggedIn = event.loggedIn;
    this.role = event.role;
    this.canEdit = (this.role === 'admin' || this.role === 'superadmin');
  }

  get currentFund(): number {
    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    const totalThu = history.reduce((sum: number, m: any) => sum + Number(m.thu || 0), 0);
    const totalChi = history.reduce((sum: number, m: any) => sum + (Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0)), 0);
    return 2730 + totalThu - totalChi;
  }
}
