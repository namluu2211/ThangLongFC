import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatchInfo, CardDetail } from '../../../core/models/match.model';

interface PlayerDiagnosticsRow {
  playerName: string;
  matches: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  goalSources: { matchId: string; minute: number | undefined }[];
  assistSources: { matchId: string; minute: number | undefined }[];
  cardSources: { matchId: string; type: 'Y' | 'R'; minute: number | undefined; matchIdRef: string }[];
}

@Component({
  selector: 'app-player-stats-diagnostics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="diag-wrapper">
    <h3>🔍 Chẩn đoán thống kê cầu thủ</h3>
    <p class="hint">Hiển thị nguồn gốc (matchId + phút) cho bàn thắng, kiến tạo, thẻ. Dùng để đối chiếu bảng xếp hạng.</p>
    <div class="controls">
      <label>
        <input type="checkbox" [(ngModel)]="showSources" /> Hiển thị chi tiết nguồn
      </label>
      <input placeholder="Lọc tên" [(ngModel)]="filter" />
    </div>
    <table class="diag-table" *ngIf="rows.length; else empty">
      <thead>
        <tr>
          <th>Cầu thủ</th>
          <th>Trận</th>
          <th>Bàn</th>
          <th>KT</th>
          <th>Vàng</th>
          <th>Đỏ</th>
          <th *ngIf="showSources">Nguồn</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of rows | slice:0:500" [class.highlight-discrepancy]="isDiscrepancy(r)">
          <td>{{ r.playerName }}</td>
          <td>{{ r.matches }}</td>
          <td>{{ r.goals }}</td>
          <td>{{ r.assists }}</td>
          <td>{{ r.yellows }}</td>
          <td>{{ r.reds }}</td>
          <td *ngIf="showSources">
            <div class="sources">
              <div class="src-group" *ngIf="r.goalSources.length"><strong>Bàn:</strong> <span *ngFor="let s of r.goalSources">{{s.matchId}} ({{s.minute||'?'}}')</span></div>
              <div class="src-group" *ngIf="r.assistSources.length"><strong>KT:</strong> <span *ngFor="let s of r.assistSources">{{s.matchId}} ({{s.minute||'?'}}')</span></div>
              <div class="src-group" *ngIf="r.cardSources.length"><strong>Thẻ:</strong> <span *ngFor="let c of r.cardSources">{{c.matchIdRef}} {{c.type}} ({{c.minute||'?'}}')</span></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <ng-template #empty><div class="empty">Không có dữ liệu trận đấu</div></ng-template>
  </div>
  `,
  styles: [`
    .diag-wrapper { background:#1e1f24; padding:1rem; border-radius:8px; color:#eee; font-size:13px; }
    h3 { margin:0 0 .5rem; font-size:16px; }
    .hint { margin:.25rem 0 1rem; font-size:12px; color:#aaa; }
    .controls { display:flex; gap:1rem; align-items:center; margin-bottom:.75rem; }
    .controls input[type='text'], .controls input[type='search'], .controls input[placeholder] { background:#2a2b31; border:1px solid #444; color:#ddd; padding:.25rem .5rem; border-radius:4px; }
    .diag-table { width:100%; border-collapse:collapse; }
    .diag-table th, .diag-table td { padding:.35rem .5rem; border-bottom:1px solid #333; text-align:left; }
    .diag-table th { background:#2c2d33; position:sticky; top:0; z-index:1; }
    .sources { display:flex; flex-direction:column; gap:2px; font-size:11px; }
    .src-group span { margin-right:.25rem; background:#2f3036; padding:2px 4px; border-radius:3px; }
    .highlight-discrepancy { background:#3a2a2a; }
    .empty { text-align:center; padding:1rem; color:#888; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerStatsDiagnosticsComponent {
  @Input() matches: MatchInfo[] = [];
  @Input() rankingMap: Map<string, { goals:number; assists:number; matches:number; yellowCards:number; redCards:number }> | null = null;
  showSources = true;
  filter = '';

  get rows(): PlayerDiagnosticsRow[] {
    const agg = new Map<string, PlayerDiagnosticsRow>();
    for (const m of this.matches) {
      const playerNames = new Set<string>();
      for (const p of m.teamA.players) playerNames.add(`${p.firstName} ${p.lastName||''}`.trim());
      for (const p of m.teamB.players) playerNames.add(`${p.firstName} ${p.lastName||''}`.trim());
      for (const name of playerNames) {
        const row = agg.get(name) || { playerName: name, matches:0, goals:0, assists:0, yellows:0, reds:0, goalSources:[], assistSources:[], cardSources:[] };
        row.matches++; agg.set(name,row);
      }
      // Goals & assists
      for (const g of m.result.goalsA.concat(m.result.goalsB)) {
        const row = agg.get(g.playerName) || { playerName: g.playerName, matches:0, goals:0, assists:0, yellows:0, reds:0, goalSources:[], assistSources:[], cardSources:[] };
        row.goals++; row.goalSources.push({ matchId: m.id, minute: g.minute }); agg.set(g.playerName,row);
        if (g.assistedBy) {
          const ra = agg.get(g.assistedBy) || { playerName: g.assistedBy, matches:0, goals:0, assists:0, yellows:0, reds:0, goalSources:[], assistSources:[], cardSources:[] };
          ra.assists++; ra.assistSources.push({ matchId: m.id, minute: g.minute }); agg.set(g.assistedBy, ra);
        }
      }
      // Cards
  const applyCards = (cards: CardDetail[], type: 'Y'|'R') => {
        for (const c of cards) {
          const row = agg.get(c.playerName) || { playerName: c.playerName, matches:0, goals:0, assists:0, yellows:0, reds:0, goalSources:[], assistSources:[], cardSources:[] };
          if (type==='Y') row.yellows++; else row.reds++;
          row.cardSources.push({ matchId: m.id, type, minute: c.minute, matchIdRef: m.id });
          agg.set(c.playerName,row);
        }
      };
      applyCards(m.result.yellowCardsA,'Y');
      applyCards(m.result.yellowCardsB,'Y');
      applyCards(m.result.redCardsA,'R');
      applyCards(m.result.redCardsB,'R');
    }
    let out = Array.from(agg.values());
    if (this.filter.trim()) {
      const f = this.filter.trim().toLowerCase();
      out = out.filter(r => r.playerName.toLowerCase().includes(f));
    }
    out.sort((a,b)=> (b.goals*3 + b.assists*2 + b.matches) - (a.goals*3 + a.assists*2 + a.matches));
    return out;
  }

  isDiscrepancy(row: PlayerDiagnosticsRow): boolean {
    if (!this.rankingMap) return false;
    const rank = this.rankingMap.get(row.playerName);
    if (!rank) return false;
    return rank.goals !== row.goals || rank.assists !== row.assists || rank.matches !== row.matches;
  }
}
