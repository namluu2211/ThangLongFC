import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Player } from '../player-utils';

@Component({
  selector: 'app-teams-panel',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="teams-container" *ngIf="teamA || teamB">
      <div class="teams-row">
        <div class="balance-badge" *ngIf="teamA.length && teamB.length">
          <span>⚖️ Cân bằng: <strong>{{ balanceScore() }}%</strong></span>
        </div>
        <div class="team-card">
          <div class="team-header team-a">
            <h3>
              🔵 Đội Xanh
              <span class="count-badge" [attr.aria-label]="'Số cầu thủ đội xanh: ' + teamA.length">{{teamA.length}}</span>
              <span class="strength-badge" title="Sức mạnh tương đối">⚡ {{ teamStrength(teamA) }}</span>
            </h3>
            <div class="right-meta">
              <div class="pill-stat goals" title="Số bàn (từ sự kiện đã nhập)">⚽ {{ goalsCountA }}</div>
              <div class="pill-stat yc" title="Thẻ vàng (từ sự kiện đã nhập)">🟨 {{ yellowCountA }}</div>
              <div class="pill-stat rc" title="Thẻ đỏ (từ sự kiện đã nhập)">🟥 {{ redCountA }}</div>
              <label class="score-label" for="scoreA">Tỉ số:</label>
              <input id="scoreA" type="number" [(ngModel)]="scoreA" (change)="scoreAChange.emit(scoreA)" class="score-input" min="0" />
            </div>
          </div>
          <div class="team-content">
            <h4 class="section-title players-title">Cầu thủ</h4>
            <div cdkDropList id="teamAList" [cdkDropListData]="teamA" [cdkDropListConnectedTo]="['teamBList']" (cdkDropListDropped)="dropped($event)" class="players-row team-players" aria-label="Khu vực Đội Xanh">
              <div class="placeholder" *ngIf="!teamA.length">Kéo cầu thủ vào đây</div>
              <div *ngFor="let player of teamA; trackBy: trackByPlayerId" cdkDrag class="player-card team-member" [attr.aria-label]="player.firstName">
                <div class="drag-handle" cdkDragHandle title="Kéo để chuyển đội" aria-label="Kéo để chuyển đội">⋮⋮</div>
                <img [src]="player.avatar || 'assets/images/default-avatar.svg'" (error)="onAvatarError($event)" class="player-avatar" [alt]="player.firstName" loading="lazy" />
                <span class="player-name">{{player.firstName}}</span>
              </div>
            </div>
            <div class="impact-mini" *ngIf="teamA.length">
              <div class="impact-title">Top đóng góp</div>
              <div class="impact-tags">
                <span class="impact-tag" *ngFor="let tag of miniImpact(teamA)" [title]="tag.tooltip">{{tag.label}}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="team-card">
          <div class="team-header team-b">
            <h3>
              🟠 Đội Cam
              <span class="count-badge" [attr.aria-label]="'Số cầu thủ đội cam: ' + teamB.length">{{teamB.length}}</span>
              <span class="strength-badge" title="Sức mạnh tương đối">⚡ {{ teamStrength(teamB) }}</span>
            </h3>
            <div class="right-meta">
              <div class="pill-stat goals" title="Số bàn (từ sự kiện đã nhập)">⚽ {{ goalsCountB }}</div>
              <div class="pill-stat yc" title="Thẻ vàng (từ sự kiện đã nhập)">🟨 {{ yellowCountB }}</div>
              <div class="pill-stat rc" title="Thẻ đỏ (từ sự kiện đã nhập)">🟥 {{ redCountB }}</div>
              <label class="score-label" for="scoreB">Tỉ số:</label>
              <input id="scoreB" type="number" [(ngModel)]="scoreB" (change)="scoreBChange.emit(scoreB)" class="score-input" min="0" />
            </div>
          </div>
          <div class="team-content">
            <h4 class="section-title players-title">Cầu thủ</h4>
            <div cdkDropList id="teamBList" [cdkDropListData]="teamB" [cdkDropListConnectedTo]="['teamAList']" (cdkDropListDropped)="dropped($event)" class="players-row team-players" aria-label="Khu vực Đội Cam">
              <div class="placeholder" *ngIf="!teamB.length">Kéo cầu thủ vào đây</div>
              <div *ngFor="let player of teamB; trackBy: trackByPlayerId" cdkDrag class="player-card team-member" [attr.aria-label]="player.firstName">
                <div class="drag-handle" cdkDragHandle title="Kéo để chuyển đội" aria-label="Kéo để chuyển đội">⋮⋮</div>
                <img [src]="player.avatar || 'assets/images/default-avatar.svg'" (error)="onAvatarError($event)" class="player-avatar" [alt]="player.firstName" loading="lazy" />
                <span class="player-name">{{player.firstName}}</span>
              </div>
            </div>
            <div class="impact-mini" *ngIf="teamB.length">
              <div class="impact-title">Top đóng góp</div>
              <div class="impact-tags">
                <span class="impact-tag" *ngFor="let tag of miniImpact(teamB)" [title]="tag.tooltip">{{tag.label}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .team-header { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:12px 12px 0 0; }
  .team-header.team-a { background:linear-gradient(90deg,#06b2ff,#00e5ff); color:#064065; }
  .team-header.team-b { background:linear-gradient(90deg,#ffd740,#ffca28); color:#5a4700; }
    .team-header h3 { margin:0; font-size:1rem; display:flex; align-items:center; gap:8px; font-weight:600; }
    .count-badge { background:#fff; color:#222; padding:2px 8px; border-radius:16px; font-size:.7rem; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,.25); }
    .strength-badge { background:rgba(255,255,255,.18); color:#fff; padding:2px 8px; border-radius:14px; font-size:.7rem; font-weight:500; backdrop-filter:blur(2px); }
  .right-meta { display:flex; align-items:center; gap:6px; font-size:.65rem; }
  .score-label { font-weight:600; font-size:.65rem; }
  .score-input { width:46px; padding:2px 4px; border-radius:6px; border:1px solid rgba(255,255,255,.4); background:rgba(255,255,255,.18); color:#fff; font-size:.7rem; }
  .pill-stat { background:rgba(255,255,255,.25); padding:2px 8px; border-radius:20px; font-weight:600; display:flex; align-items:center; gap:4px; line-height:1; }
  .pill-stat.goals { background:#00e5ff; color:#004b55; }
  .pill-stat.yc { background:#ffd740; color:#5e4700; }
  .pill-stat.rc { background:#ff5252; color:#5d0d0d; }
  .team-card { background:#ffffff; border:1px solid #d9d2f2; border-radius:12px; overflow:hidden; flex:1; display:flex; flex-direction:column; box-shadow:0 8px 24px -8px rgba(50,30,90,.25); }
    .teams-row { display:flex; gap:16px; flex-wrap:wrap; }
  .balance-badge { flex-basis:100%; background:#ece8fa; color:#423559; padding:6px 12px; border-radius:10px; font-size:.72rem; letter-spacing:.5px; display:flex; justify-content:center; align-items:center; gap:6px; box-shadow:0 2px 5px rgba(50,30,90,.18); }
    .team-content { padding:10px 12px 16px; }
    .section-title { margin:4px 0 10px; font-size:.75rem; text-transform:uppercase; letter-spacing:.5px; opacity:.7; }
  .team-players { display:flex; flex-wrap:wrap; gap:8px; min-height:64px; padding:8px; border:1px dashed #c9c1e6; border-radius:10px; background:linear-gradient(145deg,#fafdff,#f2f0fb); }
  .team-players .placeholder { font-size:.65rem; opacity:.5; font-style:italic; }
    .team-players.cdk-drop-list-dragging { background:#2c3545; }
  .player-card.team-member { position:relative; width:72px; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px; background:#ffffff; border:1px solid #d4cee9; border-radius:10px; cursor:grab; box-shadow:0 2px 6px rgba(0,0,0,.08); }
    .player-card.team-member:active { cursor:grabbing; }
  .player-card.team-member.cdk-drag-preview { box-shadow:0 6px 18px -4px rgba(50,30,90,.35); border-color:#7158e2; transform:rotate(2deg); }
  .player-card.team-member.cdk-drag-placeholder { opacity:0.25; border:2px dashed #b6acd6; }
  .players-row.team-players.cdk-drop-list-dragging { background:linear-gradient(145deg,#eef3ff,#e4def7); }
  .drag-handle { position:absolute; top:2px; right:2px; font-size:10px; line-height:1; padding:2px 4px; cursor:grab; color:#7a6aa1; background:#f3f0fa; border:1px solid #d7d1ea; border-radius:6px; font-weight:600; letter-spacing:1px; }
  .drag-handle:active { cursor:grabbing; background:#e6e0f5; }
  .player-avatar { width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px; border:1px solid #d1cbe5; }
  .player-name { font-size:.65rem; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#312744; }
  .inline-events-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:8px 12px; margin-bottom:10px; }
  .inline-field { display:flex; flex-direction:column; gap:4px; }
  .inline-field label { font-size:.6rem; font-weight:600; letter-spacing:.5px; text-transform:uppercase; opacity:.7; }
  .inline-field input { background:#f7f6fd; border:1px solid #d4cee9; border-radius:8px; padding:6px 8px; font-size:.65rem; box-shadow:0 1px 2px rgba(0,0,0,.05); transition:border-color .15s, box-shadow .15s; }
  .inline-field input.yellow { border-color:#ffd740; background:#fffbe8; }
  .inline-field input.red { border-color:#ff5252; background:#ffecec; }
  .inline-field input:focus { outline:none; border-color:#7158e2; box-shadow:0 0 0 2px rgba(113,88,226,.25); }
  .inline-field input.yellow:focus { box-shadow:0 0 0 2px rgba(255,215,64,.4); }
  .inline-field input.red:focus { box-shadow:0 0 0 2px rgba(255,82,82,.35); }
  .players-title { margin-top:4px; }
  .impact-mini { margin-top:8px; background:#f6f4fb; border:1px solid #e0d9f2; padding:6px 8px; border-radius:8px; }
  .impact-title { font-size:.55rem; text-transform:uppercase; letter-spacing:.5px; opacity:.6; margin-bottom:4px; font-weight:600; }
  .impact-tags { display:flex; flex-wrap:wrap; gap:4px; }
  .impact-tag { background:#7158e2; color:#fff; font-size:.55rem; padding:3px 6px; border-radius:14px; line-height:1; font-weight:500; box-shadow:0 2px 4px rgba(50,30,90,.25); }
  .impact-tag:hover { background:#5d48c1; }
  /* delete removed */
    @media (max-width:900px){ .teams-row { flex-direction:column; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamsPanelComponent {
  @Input() teamA: Player[] = [];
  @Input() teamB: Player[] = [];
  @Input() scoreA = 0;
  @Input() scoreB = 0;
  // Structured event inputs (provided by parent PlayersComponent)
  @Input() goalsA: {playerId:number;assistId?:number;minute:number}[] = [];
  @Input() goalsB: {playerId:number;assistId?:number;minute:number}[] = [];
  @Input() yellowCardsA: {playerId:number;minute:number}[] = [];
  @Input() yellowCardsB: {playerId:number;minute:number}[] = [];
  @Input() redCardsA: {playerId:number;minute:number}[] = [];
  @Input() redCardsB: {playerId:number;minute:number}[] = [];
  @Output() scoreAChange = new EventEmitter<number>();
  @Output() scoreBChange = new EventEmitter<number>();
  // Legacy text change outputs removed – events now entered via structured UI in parent
  @Output() removePlayer = new EventEmitter<{player: Player; team: 'A'|'B'}>();
  @Output() teamDrop = new EventEmitter<CdkDragDrop<Player[]>>();

  trackByPlayerId = (_:number, p:Player)=>p.id;
  onAvatarError(event:Event){ (event.target as HTMLImageElement).src='assets/images/default-avatar.svg'; }
  dropped(event:CdkDragDrop<Player[]>) { this.teamDrop.emit(event); }
  teamStrength(players:Player[]): number {
    if(!players || !players.length) return 0;
    // Simple heuristic: average of (id % 10 + 10) like parent AI preview strength
    const total = players.reduce((sum,p)=> sum + ((typeof p.id==='number'? p.id%10:5)+10),0);
    return Math.round(total/players.length);
  }
  balanceScore(): number {
    if(!this.teamA.length || !this.teamB.length) return 0;
    const a=this.teamStrength(this.teamA); const b=this.teamStrength(this.teamB);
    const diff=Math.abs(a-b);
    return Math.max(0, 100 - Math.min(100,diff*5));
  }
  // Derived counters from structured arrays
  get goalsCountA(){ return this.goalsA.length; }
  get goalsCountB(){ return this.goalsB.length; }
  get yellowCountA(){ return this.yellowCardsA.length; }
  get yellowCountB(){ return this.yellowCardsB.length; }
  get redCountA(){ return this.redCardsA.length; }
  get redCountB(){ return this.redCardsB.length; }
  miniImpact(team:Player[]){
    // Structured impact: goals (4), assists (3), yellow (-0.5), red (-3)
    const scoreMap = new Map<number,{p:Player; g:number; a:number; y:number; r:number; s:number}>();
    const ensure=(p:Player)=>{ if(!scoreMap.has(p.id)) scoreMap.set(p.id,{p,g:0,a:0,y:0,r:0,s:0}); return scoreMap.get(p.id)!; };
    const isTeamA = team===this.teamA;
    const goals = isTeamA? this.goalsA: this.goalsB;
    for(const g of goals){ const pl=team.find(p=>p.id===g.playerId); if(pl){ ensure(pl).g++; } if(g.assistId){ const aPl=team.find(p=>p.id===g.assistId); if(aPl){ ensure(aPl).a++; } } }
    const yCards = isTeamA? this.yellowCardsA: this.yellowCardsB;
    for(const c of yCards){ const pl=team.find(p=>p.id===c.playerId); if(pl){ ensure(pl).y++; } }
    const rCards = isTeamA? this.redCardsA: this.redCardsB;
    for(const c of rCards){ const pl=team.find(p=>p.id===c.playerId); if(pl){ ensure(pl).r++; } }
    for(const rec of scoreMap.values()){ rec.s = rec.g*4 + rec.a*3 - rec.y*0.5 - rec.r*3; }
    return Array.from(scoreMap.values())
      .sort((a,b)=>b.s-a.s)
      .slice(0,3)
      .map(r=>({ label:`${r.p.firstName} ${r.g? '⚽'+r.g:''}${r.a? ' 🅰'+r.a:''}${r.y? ' 🟨'+r.y:''}${r.r? ' 🟥'+r.r:''}`.trim(), tooltip:`Bàn: ${r.g} | KT: ${r.a} | Vàng: ${r.y} | Đỏ: ${r.r}` }));
  }
}
