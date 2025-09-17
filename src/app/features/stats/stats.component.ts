import { Component, OnInit } from '@angular/core';
@Component({
  selector: 'app-stats',
  template: `
    <div>
      <h3>Thống kê</h3>
      <div *ngIf="history.length; else none">
        <div *ngFor="let month of months">
          <h4>{{month}}</h4>
          <div *ngIf="stats[month]">
            <div>Top scorer: {{stats[month].topScorer || 'N/A'}}</div>
            <div>Top assist: {{stats[month].topAssist || 'N/A'}}</div>
            <div>Yellow cards: {{stats[month].yellow || 0}}</div>
            <div>Red cards: {{stats[month].red || 0}}</div>
          </div>
        </div>
      </div>
      <ng-template #none><div>Chưa có trận đấu để thống kê</div></ng-template>
    </div>
  `
})
export class StatsComponent implements OnInit {
  history: any[] = [];
  months: string[] = [];
  stats: any = {};
  ngOnInit() {
    this.history = JSON.parse(localStorage.getItem('MATCH_HISTORY') || '[]');
    const byMonth: any = {};
    for (const m of this.history) {
      const d = new Date(m.date);
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      byMonth[key] = byMonth[key] || [];
      byMonth[key].push(m);
    }
    this.months = Object.keys(byMonth).sort().reverse();
    for (const k of this.months) {
      const arr = byMonth[k];
      const scorerCounts: any = {};
      const assistCounts: any = {};
      let yellow = 0, red = 0;
      for (const match of arr) {
        for (const p of (match.teamA||[]).concat(match.teamB||[])) {
          scorerCounts[p.name] = (scorerCounts[p.name] || 0) + Number(p.scorer||0);
          assistCounts[p.name] = (assistCounts[p.name] || 0) + Number(p.assist||0);
          yellow += Number(p.yellow||0);
          red += Number(p.red||0);
        }
      }
      const topScorer = Object.entries(scorerCounts).sort((a:any,b:any)=> b[1]-a[1])[0];
      const topAssist = Object.entries(assistCounts).sort((a:any,b:any)=> b[1]-a[1])[0];
      this.stats[k] = {
        topScorer: topScorer ? topScorer[0] + ' ('+ topScorer[1] +')' : null,
        topAssist: topAssist ? topAssist[0] + ' ('+ topAssist[1] +')' : null,
        yellow, red
      };
    }
  }
}
