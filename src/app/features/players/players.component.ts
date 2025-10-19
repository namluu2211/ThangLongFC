// PlayersComponent (clean singular definition with typed AI caching & debounce)
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnInit, OnDestroy, TrackByFunction, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { AIWorkerService } from './services/ai-worker.service';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Player } from './player-utils'; // Augment to satisfy AIAnalysisService Player index signature
import { PlayerInfo } from '../../core/models/player.model';
import { TeamComposition, TeamColor, MatchStatus, MatchInfo, MatchResult, MatchFinances, ExpenseBreakdown, RevenueBreakdown, MatchStatistics } from '../../core/models/match.model';
import type { AIAnalysisResult } from './services/ai-analysis.service';
import { MatchFinanceService } from './services/match-finance.service';
// FirebasePlayerService removed from direct injection; facade handles backend mode
import { PlayerDataFacade } from './services/player-data-facade.service';
import { BehaviorSubject } from 'rxjs';
import { MatchService } from '../../core/services/match.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { LoggerService } from '../../core/services/logger.service';
import { environment } from '../../../environments/environment';
import { PAGINATION, STORAGE_KEYS } from './players.constants';
import { PlayerPaginationController } from './utils/pagination.utils';
import { PlayerListComponent } from './components/player-list.component';
import { TeamsPanelComponent } from './components/teams-panel.component';
// AIAnalysisComponent will be lazy loaded dynamically
import { FinancePanelComponent } from './components/finance-panel.component';
import { PlayerRankingsComponent } from './components/player-rankings.component';

interface PlayerStats { name:string; goals:number; assists:number; yellowCards:number; redCards:number; matches:number; }
interface AIResult { predictedScore:{xanh:number;cam:number}; xanhWinProb:number; camWinProb:number; keyFactors:{name:string;impact:number}[]; historicalStats?:{xanhWins:number;camWins:number;draws:number;totalMatches:number}; teamStrengths?:{teamA:number;teamB:number;balanceScore:number} }
interface RawPlayerJson { id?: number|string; firstName?: string; lastName?: string; position?: string; DOB?: number; dateOfBirth?: string|number; height?: number; weight?: number; avatar?: string; note?: string; notes?: string; }
interface PlayerWithCoreId extends Player { coreId?: string; }

@Component({
  selector:'app-players',
  standalone:true,
  imports:[CommonModule,FormsModule,PlayerListComponent,TeamsPanelComponent,FinancePanelComponent,PlayerRankingsComponent],
  templateUrl:'./players.component.html',
  styleUrls:['./players.component.css'],
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class PlayersComponent implements OnInit, OnDestroy {
  @Input() canEdit=false;
  private destroy$=new Subject<void>();
  private subs:Subscription[]=[];
  // Low-level realtime firebase service retained for streaming; facade for CRUD
  private readonly playerFacade=inject(PlayerDataFacade);
  // Runtime mode toggle state (dev only) now reactive via facade.mode$
  dataMode$ = new BehaviorSubject<'file'|'firebase'>(this.playerFacade.useFileMode? 'file':'firebase');
  switchDataMode(){
    const next = this.dataMode$.value === 'file' ? 'firebase':'file';
    this.playerFacade.setMode(next);
    this.dataMode$.next(next);
    // Trigger a manual refresh of players in file mode to ensure latest snapshot
    void this.playerFacade.refresh();
  }
  private readonly matchService=inject(MatchService);
  private readonly dataStore=inject(DataStoreService);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly logger=inject(LoggerService);
  // AI service removed from eager injection; will be loaded lazily
  private aiService: { analyze: (a: Player[], b: Player[], h: unknown[]) => AIAnalysisResult } | null = null;
  private aiWorker = inject(AIWorkerService);
  private readonly financeService=inject(MatchFinanceService);

  corePlayersData:PlayerInfo[]=[]; allPlayers:PlayerWithCoreId[]=[]; registeredPlayers:PlayerWithCoreId[]=[]; useRegistered=false;
  teamA:Player[]=[]; teamB:Player[]=[]; scoreA=0; scoreB=0;
  // Finance state delegated to MatchFinanceService
  get thu(){ return this.financeService.finance.thu; }
  set thu(v:number){ this.financeService.update({ thu:v }); }
  get chi_total(){ return this.financeService.finance.chi_total; }
  set chi_total(v:number){ this.financeService.update({ chi_total:v }); }
  get chi_nuoc(){ return this.financeService.finance.chi_nuoc; }
  set chi_nuoc(v:number){ this.financeService.update({ chi_nuoc:v }); }
  get chi_san(){ return this.financeService.finance.chi_san; }
  set chi_san(v:number){ this.financeService.update({ chi_san:v }); }
  get chi_trongtai(){ return this.financeService.finance.chi_trongtai; }
  set chi_trongtai(v:number){ this.financeService.update({ chi_trongtai:v }); }
  currentPage=PAGINATION.INITIAL_PAGE; pageSize=PAGINATION.DEFAULT_PAGE_SIZE; totalPages=0;
  private pagination= new PlayerPaginationController(this.pageSize);
  private _paginated:Player[]=[];
  showPlayerList=true; matchSaveMessage=''; saveMessage='';
  isAnalyzing=false; aiAnalysisResults:AIResult|null=null; lastTeamCompositionHash='';
  aiLoaded=false; aiComponent:unknown|null=null;
  topPlayers:PlayerStats[]=[]; showPlayerRankings=true;
  private teamChange$=new Subject<void>();
  trackByPlayerId:TrackByFunction<Player>=(_:number,p:Player)=>p.id; trackByFactorName=(_:number,f:{name:string})=>f.name; Math=Math;
  // Dynamic drag & drop component state
  dndLoaded=false; dndComponent:unknown|null=null;
  removeFromTeamBound = (payload:{player:Player;team:'A'|'B'}) => this.removeFromTeam(payload.player,payload.team);
  teamDropBound = () => this.triggerTeamChange();

  ngOnInit(){
    this.loadRegisteredPlayers();
    this.subscribeToPlayersStream();
    this.subscribeToCompletedMatches();
    this.loadPlayers();
    this.teamChange$.pipe(takeUntil(this.destroy$),debounceTime(250)).subscribe(()=>this.runAIAnalysis());
  }
  ngOnDestroy(){ this.subs.forEach(s=>!s.closed&&s.unsubscribe()); this.destroy$.next(); this.destroy$.complete(); }

  private subscribeToPlayersStream(){ const shallowHash=(arr:PlayerInfo[]|undefined)=>{
    if(!arr||!arr.length) return '0';
    return arr.length+':' + arr.map(p=>p.id).join(',');
  }; const sub=this.playerFacade.players$.pipe(takeUntil(this.destroy$),debounceTime(200),distinctUntilChanged((a,b)=>shallowHash(a)===shallowHash(b))).subscribe({
    next:players=>{ if(players?.length){ this.corePlayersData=players; this.convertCorePlayers(players); this.updatePagination(); } this.cdr.markForCheck(); },
    error:err=>{ this.logger.errorDev('players stream error',err); if(!this.allPlayers.length) this.loadPlayers(); this.cdr.markForCheck(); }
  }); this.subs.push(sub); }

  // Subscribe to completed matches to derive player rankings dynamically
  private subscribeToCompletedMatches(){
    const sub=this.matchService.completedMatches$.pipe(takeUntil(this.destroy$),debounceTime(300)).subscribe({
      next:matches=>{ void this.lazyUpdatePlayerRankings(matches); },
  error:err=>{ this.logger.warnDev('completed matches stream error',err); }
    });
    this.subs.push(sub);
  }

  private async lazyUpdatePlayerRankings(matches:MatchInfo[]){
    if(!Array.isArray(matches)||!matches.length){ this.topPlayers=[]; this.cdr.markForCheck(); return; }
    const mod= await import('./utils/ranking.utils');
    const statsMap=mod.buildPlayerStats(matches);
    const ranked=[...statsMap.values()];
    ranked.sort((a,b)=>mod.calculatePlayerScore(b)-mod.calculatePlayerScore(a));
    this.topPlayers=ranked.slice(0,50);
    this.cdr.markForCheck();
  }

  async loadPlayers(){ try{ const data=this.playerFacade.getSnapshot(); if(data?.length){ this.corePlayersData=data; this.convertCorePlayers(data); } else { const resp=await fetch('assets/players.json'); if(resp.ok){ const json=await resp.json(); if(Array.isArray(json)&&json.length){ this.allPlayers=(json as RawPlayerJson[]).map(p=>({ id: typeof p.id==='number'?p.id:Math.floor(Math.random()*100000), firstName:String(p.firstName||'Unknown'), lastName:String(p.lastName||''), position:String(p.position||'Chưa xác định'), DOB: typeof p.DOB==='number'?p.DOB:0, height: typeof p.height==='number'?p.height:0, weight: typeof p.weight==='number'?p.weight:0, avatar: String(p.avatar||'assets/images/default-avatar.svg'), note: String(p.note||'') })); } } }
  this.updatePagination(); this.cdr.markForCheck(); } catch(e){ this.logger.errorDev('loadPlayers failure',e); this.allPlayers=[]; this.updatePagination(); this.cdr.markForCheck(); } }
  private loadRegisteredPlayers(){ try{ const saved=localStorage.getItem(STORAGE_KEYS.REGISTERED_PLAYERS); if(saved) this.registeredPlayers=JSON.parse(saved); } catch { this.registeredPlayers=[]; } }
  // Convert core PlayerInfo[] into legacy Player[] with stable numeric display id while preserving original coreId
  private convertCorePlayers(core:PlayerInfo[]){
    const unique=Array.from(new Map(core.map(p=>[`${p.firstName.toLowerCase()}_${(p.lastName||'').toLowerCase()}`,p])).values());
    this.allPlayers=unique.map(p=>({
      id: (typeof p.id==='string') ? Math.abs(this.hashId(p.id)) : (Number(p.id)||Math.floor(Math.random()*10000)),
      coreId: p.id,
      firstName:p.firstName,
      lastName:p.lastName||'',
      position:p.position||'Chưa xác định',
      DOB: p.dateOfBirth? new Date(p.dateOfBirth).getFullYear():0,
      height:p.height||0,
      weight:p.weight||0,
      avatar:p.avatar||'assets/images/default-avatar.svg',
      note:p.notes||''
    }));
  }

  // Stable numeric hash for display-only id derivation from firebase key
  private hashId(id:string){ let h=0; for(let i=0;i<id.length;i++){ h=(Math.imul(31,h)+id.charCodeAt(i))|0; } return h; }

  // CRUD Operations bridging to FirebasePlayerService
  async createNewPlayer(payload:{ firstName:string; lastName?:string; position?:string }){
    const { firstName, lastName='', position='Chưa xác định' }=payload;
    if(!firstName?.trim()) return;
    try{
  await this.playerFacade.createPlayer({ firstName,lastName,position });
      // Re-sync occurs via realtime listener. Optionally trigger manual load fallback.
    }catch(e){ this.logger.errorDev('create player failed',e); }
  }

  async updateExistingPlayer(p:PlayerWithCoreId, updates:{ firstName?:string; lastName?:string; position?:string }){
    const id=p.coreId? p.coreId: p.id.toString();
    try{
      const patch:Partial<PlayerInfo>={};
      if(updates.firstName!==undefined) patch.firstName=updates.firstName.trim();
      if(updates.lastName!==undefined) patch.lastName=updates.lastName.trim();
      if(updates.position!==undefined) patch.position=updates.position;
      if(patch.firstName||patch.lastName){ patch.fullName=`${patch.firstName||p.firstName} ${patch.lastName||p.lastName||''}`.trim(); }
      if(Object.keys(patch).length===0) return;
  await this.playerFacade.updatePlayer(id, patch);
    }catch(e){ this.logger.errorDev('update player failed',e); }
  }

  async deletePlayer(p:PlayerWithCoreId){
    const id=p.coreId? p.coreId: p.id.toString();
  try{ await this.playerFacade.deletePlayer(id); }catch(e){ this.logger.errorDev('delete player failed',e); }
  }

  getDisplayPlayers():Player[]{ return this.useRegistered? this.registeredPlayers: this.allPlayers; }
  getPaginatedPlayers():Player[]{
    const display=this.getDisplayPlayers();
    const result=this.pagination.paginate(display,this.currentPage);
    this.totalPages=result.totalPages; this._paginated=result.items; return this._paginated;
  }
  previousPage(){ if(this.currentPage>0){ this.currentPage--; this.pagination.invalidate(); this.getPaginatedPlayers(); } }
  nextPage(){ if(this.currentPage<this.totalPages-1){ this.currentPage++; this.pagination.invalidate(); this.getPaginatedPlayers(); } }
  private updatePagination(){ this.pagination.invalidate(); this.getPaginatedPlayers(); }

  toggleRegistration(p:Player){ const idx=this.registeredPlayers.findIndex(r=>r.id===p.id); if(idx>-1) this.registeredPlayers.splice(idx,1); else this.registeredPlayers.push(p); localStorage.setItem(STORAGE_KEYS.REGISTERED_PLAYERS, JSON.stringify(this.registeredPlayers)); if(this.useRegistered) this.updatePagination(); }
  togglePlayerListView(){ this.showPlayerList=!this.showPlayerList; }
  toggleUseRegistered(){ this.useRegistered=!this.useRegistered; this.updatePagination(); }
  clearRegisteredPlayers(){ this.registeredPlayers=[]; localStorage.removeItem(STORAGE_KEYS.REGISTERED_PLAYERS); if(this.useRegistered) this.updatePagination(); }
  canDivideTeams(){ return this.getDisplayPlayers().length>=2; }

  shuffleTeams(){ const pool=this.getDisplayPlayers().slice(); if(pool.length<2) return; for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; } const half=Math.ceil(pool.length/2); this.teamA=pool.slice(0,half); this.teamB=pool.slice(half); this.triggerTeamChange(); }
  // Drag-drop handled by lazy TeamDndComponent
  async loadDnd(){ if(this.dndLoaded) return; const mod=await import('./components/team-dnd.component'); this.dndComponent=mod.TeamDndComponent; this.dndLoaded=true; this.cdr.markForCheck(); }
  removeFromTeam(player:Player, team:'A'|'B'){ if(team==='A') this.teamA=this.teamA.filter(p=>p.id!==player.id); else this.teamB=this.teamB.filter(p=>p.id!==player.id); this.triggerTeamChange(); }
  private triggerTeamChange(){ this.teamChange$.next(); }

  private async runAIAnalysis(){
    // Publish team changes to global store for external analysis component/route
    this.dataStore.setTeams(this.teamA, this.teamB);
    if(!this.aiLoaded){ void this.loadAIComponent(); }
    if(!environment.features.aiAnalysis){ return; }
    if(!this.teamA.length||!this.teamB.length){ this.aiAnalysisResults=null; return; }
    const hash=this.computeTeamHash(this.teamA,this.teamB);
    if(this.lastTeamCompositionHash===hash && this.aiAnalysisResults){ return; }
    this.isAnalyzing=true; this.cdr.markForCheck();
    // Use worker-based analysis (with builtin fallback when unsupported)
    this.aiWorker.analyze(this.teamA, this.teamB).subscribe(res => {
      const calcStrength=(players:Player[])=>{
        if(!players.length) return 0;
        const total=players.reduce((sum,p)=> sum + ((typeof p.id==='number'? p.id%10:5)+10),0);
        return Math.round(total/players.length);
      };
      const teamAStr=calcStrength(this.teamA);
      const teamBStr=calcStrength(this.teamB);
      const balanceScore=100 - Math.min(100, Math.abs(teamAStr-teamBStr)*5);
      this.aiAnalysisResults={
        predictedScore:res.prediction.predictedScore,
        xanhWinProb:res.prediction.winProbability.xanh,
        camWinProb:res.prediction.winProbability.cam,
        keyFactors:res.keyFactors,
        historicalStats:{
          xanhWins:res.historicalContext.recentPerformance.xanhWins,
          camWins:res.historicalContext.recentPerformance.camWins,
          draws:res.historicalContext.recentPerformance.draws,
          totalMatches:res.historicalContext.matchesAnalyzed
        },
        teamStrengths:{ teamA:teamAStr, teamB:teamBStr, balanceScore }
      };
      this.lastTeamCompositionHash=hash; this.isAnalyzing=false; this.cdr.markForCheck();
    });
  }

  private computeTeamHash(a:Player[], b:Player[]):string {
    // Shallow stable hash using sorted ids & lengths
    const idsA=a.map(p=>p.id).sort().join(',');
    const idsB=b.map(p=>p.id).sort().join(',');
    return `${a.length}:${idsA}|${b.length}:${idsB}`;
  }

  getPlayerModeStatus(){ return this.useRegistered? `Chế độ: Đã đăng ký (${this.registeredPlayers.length})`:`Chế độ: Tất cả (${this.allPlayers.length})`; }
  getDataModeBadge(){ return this.dataMode$.value === 'file'? 'File Mode':'Firebase Mode'; }
  async loadAIComponent(){ if(this.aiLoaded) return; const mod=await import('./components/ai-analysis.component'); this.aiComponent=mod.AIAnalysisComponent; this.aiLoaded=true; this.cdr.markForCheck(); }
  calculatePlayerScore(p:PlayerStats){ return (p.goals*3)+(p.assists*2)-(p.yellowCards*0.5)-(p.redCards*2); }
  getPlayerAvatarByName(name:string){ return `assets/images/avatar_players/${name.replace(/\s+/g,'_')}.png`; }
  togglePlayerRankings(){ this.showPlayerRankings=!this.showPlayerRankings; }

  async saveMatchInfo(){ if(!this.teamA.length && !this.teamB.length){ this.matchSaveMessage='Chia đội trước!'; setTimeout(()=>this.matchSaveMessage='',2400); return; } const matchData=await this.createMatchData(); await this.matchService.createMatch(matchData); await this.addMatchFundTransaction({date:matchData.date}); this.matchSaveMessage='Đã lưu trận đấu'; setTimeout(()=>this.matchSaveMessage='',2400); }
  private async createMatchData():Promise<Omit<MatchInfo,'id'|'createdAt'|'updatedAt'|'version'>>{
    const teamACore=await this.convertToTeamComposition(this.teamA,TeamColor.BLUE);
    const teamBCore=await this.convertToTeamComposition(this.teamB,TeamColor.ORANGE);

    // Build result with winner field
    const rawResult:MatchResult={
      scoreA:this.scoreA,
      scoreB:this.scoreB,
      winner: this.scoreA===this.scoreB? 'draw': (this.scoreA>this.scoreB? 'A':'B'),
      goalsA:[], goalsB:[], yellowCardsA:[], yellowCardsB:[], redCardsA:[], redCardsB:[], events:[]
    };

    // Expense breakdown (fixed vs variable separation)
    const expenses:ExpenseBreakdown={
      referee:this.chi_trongtai||0,
      field:this.chi_san||0,
      water:this.chi_nuoc||0,
      transportation:0,
      food:0,
      equipment:0,
      other:0,
      fixed:(this.chi_trongtai||0)+(this.chi_san||0),
      variable:(this.chi_nuoc||0)
    };
    const revenue:RevenueBreakdown={ winnerFees:0, loserFees:0, cardPenalties:0, otherRevenue:0, teamARevenue:0, teamBRevenue:0, penaltyRevenue:0 };
    const finances:MatchFinances={
      revenue,
      expenses,
      totalRevenue:this.thu,
      totalExpenses:this.chi_total||Object.values(expenses).reduce((s,v)=>s+(typeof v==='number'?v:0),0),
      netProfit:(this.thu)-(this.chi_total||Object.values(expenses).reduce((s,v)=>s+(typeof v==='number'?v:0),0)),
      revenueMode:'auto'
    };

    // Placeholder statistics with simple derived metrics
    const teamAStats={ fouls:0, efficiency: rawResult.scoreA>0? rawResult.scoreA:0, discipline:100 };
    const teamBStats={ fouls:0, efficiency: rawResult.scoreB>0? rawResult.scoreB:0, discipline:100 };
    const statistics:MatchStatistics={
      teamAStats,
      teamBStats,
      duration:90,
      competitiveness: rawResult.scoreA===rawResult.scoreB? 80: Math.max(40, 100-Math.abs(rawResult.scoreA-rawResult.scoreB)*10),
      fairPlay:100,
      entertainment: Math.min(100,(rawResult.scoreA+rawResult.scoreB)*15)
    };

    return {
      date:new Date().toISOString().split('T')[0],
      teamA:teamACore,
      teamB:teamBCore,
      result:rawResult,
      finances,
      status:MatchStatus.COMPLETED,
      statistics
    };
  }
  private async convertToTeamComposition(players:Player[], color:TeamColor):Promise<TeamComposition>{ const infos:PlayerInfo[]=[]; for(const p of players){ const cp=this.corePlayersData.find(c=>c.id===p.id.toString()); if(cp) infos.push(cp);} return { name: color===TeamColor.BLUE? 'Đội Xanh':'Đội Cam', players:infos, teamColor:color, formation:'4-4-2' }; }
  private async addMatchFundTransaction(match:{date:string}){ try{ const total=this.teamA.length+this.teamB.length; const base=total*30000; await this.dataStore.addFundTransaction({ type:'income', amount:base, description:`Thu nhập trận ${match.date}`, category:'match_fee', date:match.date, createdBy:'system'}); } catch(e){ this.logger.warnDev('Fund transaction failed',e); } }

  savePlayers(){ localStorage.setItem('players', JSON.stringify(this.allPlayers)); this.saveMessage='Đã lưu thay đổi'; setTimeout(()=>this.saveMessage='',2000); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  viewPlayer(_p:Player){ /* reserved for future player detail drawer */ }
}
