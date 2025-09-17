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
          <div style="border:1px solid #ddd; padding:8px; margin-bottom:8px;">
            <div><strong>{{m.date}}</strong> - ID: {{m.id}}</div>
            <div>Score A: {{sumScore(m.teamA)}} - Score B: {{sumScore(m.teamB)}}</div>
          </div>
        </div>
      </div>
      <ng-template #none><div>Chưa có lịch sử</div></ng-template>
    </div>
  `
})
export class HistoryComponent implements OnInit {
  history: any[] = [];
  ngOnInit() {
    this.history = JSON.parse(localStorage.getItem('MATCH_HISTORY') || '[]');
  }
  sumScore(team:any[]) {
    return team.reduce((s:any,p:any)=> s + Number(p.scorer||0),0);
  }
}
