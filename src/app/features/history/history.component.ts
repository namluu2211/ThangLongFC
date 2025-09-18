import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h3>Lịch sử trận đấu</h3>
      <div *ngIf="history.length; else none">
        <div *ngFor="let m of history">
          <div style="border:1px solid #ddd; padding:12px; margin-bottom:12px; border-radius:10px; background:#f8faff; position:relative;">
            <div><strong>{{m.date | date:'short'}}</strong></div>
            <div><b>Tỷ số:</b> <span style="color:#007bff">{{m.scoreA}}</span> - <span style="color:#ff9800">{{m.scoreB}}</span></div>
            <div><b>Ghi bàn:</b> <span style="color:#007bff">{{m.scorerA}}</span> - <span style="color:#ff9800">{{m.scorerB}}</span></div>
            <div><b>Kiến tạo:</b> <span style="color:#007bff">{{m.assistA}}</span> - <span style="color:#ff9800">{{m.assistB}}</span></div>
            <div><b>Thẻ vàng:</b> <span style="color:#007bff">{{m.yellowA}}</span> - <span style="color:#ff9800">{{m.yellowB}}</span></div>
            <div><b>Thẻ đỏ:</b> <span style="color:#007bff">{{m.redA}}</span> - <span style="color:#ff9800">{{m.redB}}</span></div>
            <div><b>Đội hình A:</b> <span>{{getTeamNames(m.teamA)}}</span></div>
            <div><b>Đội hình B:</b> <span>{{getTeamNames(m.teamB)}}</span></div>
            <button *ngIf="isAdmin()" class="btn btn-danger btn-sm" style="position:absolute;top:12px;right:12px;" (click)="confirmDelete(m)">Xóa</button>
            <div *ngIf="deleteConfirm===m" class="modal-backdrop" style="z-index:2000;">
              <div class="modal-content" style="min-width:260px;max-width:90vw;">
                <div class="modal-header fw-bold">Xác nhận xóa lịch sử</div>
                <div class="modal-body">Bạn có chắc muốn xóa lịch sử trận này?</div>
                <div class="modal-footer">
                  <button class="btn btn-secondary me-2" (click)="deleteConfirm=null">Hủy</button>
                  <button class="btn btn-danger" (click)="deleteMatch(m)">Xóa</button>
                </div>
              </div>
            </div>
            <div><b>Thu:</b>
              <input type="number" [(ngModel)]="m.thu" class="player-input" style="width:120px;" [readonly]="!isAdmin()" />
              <button *ngIf="isAdmin()" class="btn btn-sm btn-info ms-2" (click)="calcThu(m)">Tính tự động</button>
            </div>
            <div><b>Chi:</b>
              <span>Trọng tài</span> <input type="number" [(ngModel)]="m.chi_trongtai" (ngModelChange)="updateChi(m)" class="player-input" style="width:80px;" [readonly]="!isAdmin()" />
              <span class="ms-2">Nước</span> <input type="number" [(ngModel)]="m.chi_nuoc" (ngModelChange)="updateChi(m)" class="player-input" style="width:80px;" [readonly]="!isAdmin()" />
              <span class="ms-2">Sân</span> <input type="number" [(ngModel)]="m.chi_san" (ngModelChange)="updateChi(m)" class="player-input" style="width:80px;" [readonly]="!isAdmin()" />
              <span class="ms-2 fw-bold">Tổng:</span> <span class="fw-bold" style="color:#007bff">{{m.chi_total ?? 0}}</span>
            </div>
          </div>
        </div>
      </div>
      <ng-template #none><div>Chưa có lịch sử</div></ng-template>
    </div>
  `
})
export class HistoryComponent implements OnInit {
  updateChi(m: any) {
    m.chi_total = Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0);
    localStorage.setItem('matchHistory', JSON.stringify(this.history));
  }
  calcThu(m: any) {
    // Winner/loser team
    let winnerTeam = [], loserTeam = [];
    if (Number(m.scoreA) > Number(m.scoreB)) {
      winnerTeam = m.teamA;
      loserTeam = m.teamB;
    } else if (Number(m.scoreB) > Number(m.scoreA)) {
      winnerTeam = m.teamB;
      loserTeam = m.teamA;
    } else {
      winnerTeam = [...m.teamA, ...m.teamB];
      loserTeam = [];
    }
    // Parse yellow/red card firstNames
    const yellowNames = (typeof m.yellowA === 'string' ? m.yellowA.split(/[, ]+/) : []).concat(typeof m.yellowB === 'string' ? m.yellowB.split(/[, ]+/) : []).filter(x=>x);
    const redNames = (typeof m.redA === 'string' ? m.redA.split(/[, ]+/) : []).concat(typeof m.redB === 'string' ? m.redB.split(/[, ]+/) : []).filter(x=>x);
    let thuWinner = 0;
    for (const p of winnerTeam) {
      let add = 40;
      if (yellowNames.includes(p.firstName)) add += 50;
      if (redNames.includes(p.firstName)) add += 100;
      thuWinner += add;
    }
    // Loser team: each player 60
    let thuLoser = loserTeam.length * 60;
    m.thu = thuWinner + thuLoser;
    localStorage.setItem('matchHistory', JSON.stringify(this.history));
  }
  calcChi(m: any): number {
    return Number(m.chi_trongtai || 0) + Number(m.chi_nuoc || 0) + Number(m.chi_san || 0);
  }
  isAdmin() {
    return this.role === 'admin' || this.role === 'superadmin';
  }
  deleteConfirm: any = null;
  confirmDelete(m: any) {
    this.deleteConfirm = m;
  }
  deleteMatch(m: any) {
    const idx = this.history.indexOf(m);
    if (idx > -1) {
      this.history.splice(idx, 1);
      localStorage.setItem('matchHistory', JSON.stringify(this.history));
    }
    this.deleteConfirm = null;
  }
  getTeamNames(team: any[]): string {
  return team.map(p => p.firstName || '').filter(x => x).join(', ');
  }
  history: any[] = [];
  role: string = '';
  ngOnInit() {
    this.history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    this.role = localStorage.getItem('role') || '';
    // Sync match info fields from last saved match if available
    if (this.history.length) {
      const m = this.history[this.history.length - 1];
      this.calcThu(m);
      this.updateChi(m);
    }
    this.history.forEach(m => {
      this.calcThu(m);
      this.updateChi(m);
    });
  }
  sumScore(team:any[]) {
    return team.reduce((s:any,p:any)=> s + Number(p.scorer||0),0);
  }
}
