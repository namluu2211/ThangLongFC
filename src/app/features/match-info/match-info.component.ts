import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-match-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h3>Thông tin trận đấu</h3>
      <div *ngIf="players?.length">
        <div style="display:flex; gap:20px;">
          <div style="flex:1;">
            <h4>Team A</h4>
            <table class="table">
              <tr><th>Vị trí</th><th>Tên</th><th>Ghi bàn</th><th>Kiến tạo</th><th>Vàng</th><th>Đỏ</th></tr>
              <tr *ngFor="let p of teamA">
                <td>{{p.position}}</td>
                <td>{{p.name}}</td>
                <td><input type="number" [(ngModel)]="p.scorer" [disabled]="!canEdit"></td>
                <td><input type="number" [(ngModel)]="p.assist" [disabled]="!canEdit"></td>
                <td><input type="number" [(ngModel)]="p.yellow" [disabled]="!canEdit"></td>
                <td><input type="number" [(ngModel)]="p.red" [disabled]="!canEdit"></td>
              </tr>
            </table>
          </div>
          <div style="flex:1;">
            <h4>Team B</h4>
            <table class="table">
              <tr><th>Vị trí</th><th>Tên</th><th>Ghi bàn</th><th>Kiến tạo</th><th>Vàng</th><th>Đỏ</th></tr>
              <tr *ngFor="let p of teamB">
                <td>{{p.position}}</td>
                <td>{{p.name}}</td>
                <td><input type="number" [(ngModel)]="p.scorer" [disabled]="!canEdit"></td>
                <td><input type="number" [(ngModel)]="p.assist" [disabled]="!canEdit"></td>
                <td><input type="number" [(ngModel)]="p.yellow" [disabled]="!canEdit"></td>
                <td><input type="number" [(ngModel)]="p.red" [disabled]="!canEdit"></td>
              </tr>
            </table>
          </div>
        </div>

        <div style="margin-top:12px;">
          <label>Match fee: <input type="number" [(ngModel)]="matchFee" [disabled]="!canEdit"></label>
          <label style="margin-left:12px;">Drinking: <input type="number" [(ngModel)]="drinking" [disabled]="!canEdit"></label>
          <label style="margin-left:12px;">Referee: <input type="number" [(ngModel)]="referee" [disabled]="!canEdit"></label>
        </div>

        <div style="margin-top:12px;">
          <button class="btn" (click)="calculateScore()">Tính điểm & Quỹ</button>
          <button class="btn" (click)="save()" [disabled]="!canEdit">Lưu nội dung</button>
        </div>

      </div>
      <div *ngIf="!players?.length">Đang tải danh sách cầu thủ...</div>
    </div>
  `
})
export class MatchInfoComponent implements OnInit {
  @Input() canEdit = false;
  @Output() matchSaved = new EventEmitter<any>();
  players: any[] = [];
  teamA: any[] = [];
  teamB: any[] = [];
  matchFee = 0;
  drinking = 0;
  referee = 0;

  ngOnInit() {
    fetch('/assets/players.json').then(r=>r.json()).then(json=>{
      this.players = json.map(p=>({ ...p, scorer:0, assist:0, yellow:0, red:0 }));
      // simple division by index for A/B
      this.teamA = this.players.filter((_,i)=> i % 2 === 0);
      this.teamB = this.players.filter((_,i)=> i % 2 === 1);
      // listen for global save request
      window.addEventListener('storage', (e:any)=>{
        if (e.key==='SAVE_MATCH_NOW' && localStorage.getItem('SAVE_MATCH_NOW')==='1') {
          this.save();
          localStorage.removeItem('SAVE_MATCH_NOW');
        }
      });
    });
  }

  calculateScore() {
    const scoreA = this.teamA.reduce((s:any,p:any)=> s + Number(p.scorer||0),0);
    const scoreB = this.teamB.reduce((s:any,p:any)=> s + Number(p.scorer||0),0);
    const yellows = this.teamA.concat(this.teamB).reduce((s:any,p:any)=> s + Number(p.yellow||0),0);
    const reds = this.teamA.concat(this.teamB).reduce((s:any,p:any)=> s + Number(p.red||0),0);
    const winnerPlayers = scoreA>scoreB ? this.teamA.length : (scoreB>scoreA ? this.teamB.length : 0);
    const totalReceive = (winnerPlayers * 40) + (yellows * 50) + (reds * 100);
    const totalGiven = Number(this.matchFee||0) + Number(this.drinking||0) + Number(this.referee||0);
    const currentFund = Number(localStorage.getItem('CURRENT_FUND') || '0');
    const newFund = currentFund + totalReceive - totalGiven;
    localStorage.setItem('CURRENT_FUND', String(newFund));
    alert('Tính xong. Quỹ hiện tại = ' + newFund);
  }

  save() {
    const match = {
      id: Date.now(),
      date: new Date().toISOString(),
      teamA: this.teamA,
      teamB: this.teamB,
      matchFee: this.matchFee,
      drinking: this.drinking,
      referee: this.referee
    };
    const history = JSON.parse(localStorage.getItem('MATCH_HISTORY') || '[]');
    history.push(match);
    localStorage.setItem('MATCH_HISTORY', JSON.stringify(history));
    this.matchSaved.emit(match);
    alert('Đã lưu trận đấu vào lịch sử.');
  }
}
