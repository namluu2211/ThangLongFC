// PlayersComponent (clean singular definition with typed AI caching & debounce)
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnInit, OnDestroy, TrackByFunction, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { AIWorkerService } from './services/ai-worker.service';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Player } from './player-utils'; // Augment to satisfy AIAnalysisService Player index signature
import { PlayerInfo } from '../../core/models/player.model';
import { TeamComposition, TeamColor, MatchStatus, MatchInfo, MatchResult, MatchFinances, ExpenseBreakdown, RevenueBreakdown, MatchStatistics, GoalType, CardType, EventType, MatchEvent } from '../../core/models/match.model';
import type { AIAnalysisResult } from './services/ai-analysis.service';
import { MatchFinanceService } from './services/match-finance.service';
// FirebasePlayerService removed from direct injection; facade handles backend mode
// NOTE: Temporarily removing PlayerDataFacade usage due to bootstrap 'Error: invalid'.
// We fallback to simplified PlayerService that loads from localStorage/assets.
// import { PlayerDataFacade } from './services/player-data-facade.service';
import { PlayerService } from '../../core/services/player.service';
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
// Removed FinancePanelComponent & PlayerRankingsComponent from Đội hình tab

interface PlayerStats { name:string; goals:number; assists:number; yellowCards:number; redCards:number; matches:number; }
interface AIResult { predictedScore:{xanh:number;cam:number}; xanhWinProb:number; camWinProb:number; keyFactors:{name:string;impact:number}[]; historicalStats?:{xanhWins:number;camWins:number;draws:number;totalMatches:number}; teamStrengths?:{teamA:number;teamB:number;balanceScore:number} }
interface RawPlayerJson { id?: number|string; firstName?: string; lastName?: string; position?: string; DOB?: number; dateOfBirth?: string|number; height?: number; weight?: number; avatar?: string; note?: string; notes?: string; }
interface PlayerWithCoreId extends Player { coreId?: string; }

@Component({
  selector:'app-players',
  standalone:true,
  imports:[CommonModule,FormsModule,PlayerListComponent,TeamsPanelComponent],
  templateUrl:'./players.component.html',
  styleUrls:['./players.component.css'],
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class PlayersComponent implements OnInit, OnDestroy {
  @Input() canEdit=false;
  private destroy$=new Subject<void>();
  private subs:Subscription[]=[];
  // Fallback simplified player service (file/localStorage only)
  private readonly simplePlayerService = inject(PlayerService);
  // Legacy dataMode removed (always 'file' in fallback). Preserve observable for template binding stability.
  dataMode$ = new BehaviorSubject<'file'|'firebase'>('file');
  switchDataMode(){ /* Firebase disabled temporarily */ }
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
  // Match event state (Phase B)
  goalsA:{playerId:number;assistId?:number;minute:number}[]=[];
  goalsB:{playerId:number;assistId?:number;minute:number}[]=[];
  assistsA:{playerId:number;minute:number}[]=[]; // optional separate tracking if needed
  assistsB:{playerId:number;minute:number}[]=[];
  yellowCardsA:{playerId:number;minute:number}[]=[];
  yellowCardsB:{playerId:number;minute:number}[]=[];
  redCardsA:{playerId:number;minute:number}[]=[];
  redCardsB:{playerId:number;minute:number}[]=[];
  // Finance temp inputs (lightweight inline form state)
  _revWinner:number|null=null; _revLoser:number|null=null; _revCards:number|null=null; _revOther:number|null=null;
  _expWater:number|null=null; _expField:number|null=null; _expRef:number|null=null; _expOther:number|null=null;
  // Event form temp fields
  _gaPlayerA:number|null=null; _gaAssistA:number|null=null; _gaMinuteA:number|null=null;
  _gaPlayerB:number|null=null; _gaAssistB:number|null=null; _gaMinuteB:number|null=null;
  _ycPlayerA:number|null=null; _ycMinuteA:number|null=null; _rcPlayerA:number|null=null; _rcMinuteA:number|null=null;
  _ycPlayerB:number|null=null; _ycMinuteB:number|null=null; _rcPlayerB:number|null=null; _rcMinuteB:number|null=null;
  // Simple text input tracking for quick entry (as per screenshot variant)
  goalsTextA=''; goalsTextB=''; assistsTextA=''; assistsTextB=''; yellowTextA=''; yellowTextB=''; redTextA=''; redTextB='';
  // Finance getters removed (moved to dedicated fund tab)
  currentPage=PAGINATION.INITIAL_PAGE; pageSize=PAGINATION.DEFAULT_PAGE_SIZE; totalPages=0;
  private pagination= new PlayerPaginationController(this.pageSize);
  private _paginated:Player[]=[];
  showPlayerList=true; matchSaveMessage=''; saveMessage='';
  isAnalyzing=false; aiAnalysisResults:AIResult|null=null; lastTeamCompositionHash='';
  aiLoaded=false; aiComponent:unknown|null=null;
  topPlayers:PlayerStats[]=[]; showPlayerRankings=true;
  private teamChange$=new Subject<void>();
  trackByPlayerId:TrackByFunction<Player>=(_:number,p:Player)=>p.id; trackByFactorName=(_:number,f:{name:string})=>f.name; Math=Math;
  // Legacy dynamic drag & drop removed (integrated directly in TeamsPanel)

  ngOnInit(){
    this.loadRegisteredPlayers();
    this.subscribeToPlayersStream();
    this.subscribeToCompletedMatches();
    this.loadPlayers();
    this.teamChange$.pipe(takeUntil(this.destroy$),debounceTime(250)).subscribe(()=>this.runAIAnalysis());
    // Attempt restore of persisted teams after players load (delayed to ensure players available)
    setTimeout(()=>this.restorePersistedTeams(), 600);
    // Restore draft event inputs
    this.restoreDraftEvents();
  }
  ngOnDestroy(){ this.subs.forEach(s=>!s.closed&&s.unsubscribe()); this.destroy$.next(); this.destroy$.complete(); }

  private subscribeToPlayersStream(){
    const shallowHash=(arr:PlayerInfo[]|undefined)=>{
      if(!arr||!arr.length) return '0';
      return arr.length+':' + arr.map(p=>p.id).join(',');
    };
    const sub=this.simplePlayerService.players$.pipe(takeUntil(this.destroy$),debounceTime(200),distinctUntilChanged((a,b)=>shallowHash(a)===shallowHash(b))).subscribe({
      next:players=>{
        if(players?.length){ this.corePlayersData=players; this.convertCorePlayers(players); this.updatePagination(); }
        this.cdr.markForCheck();
      },
      error:err=>{ this.logger.errorDev('players stream error (fallback)',err); if(!this.allPlayers.length) this.loadPlayers(); this.cdr.markForCheck(); }
    });
    this.subs.push(sub);
  }

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

  async loadPlayers(){
    try{
      const data=this.simplePlayerService.getAllPlayers();
      if(data?.length){
        this.corePlayersData=data; this.convertCorePlayers(data);
      } else {
        const resp=await fetch('assets/players.json');
        if(resp.ok){
          const json=await resp.json();
          if(Array.isArray(json)&&json.length){
            this.allPlayers=(json as RawPlayerJson[]).map(p=>({
              id: typeof p.id==='number'?p.id:Math.floor(Math.random()*100000),
              firstName:String(p.firstName||'Unknown'),
              lastName:String(p.lastName||''),
              position:String(p.position||'Chưa xác định'),
              DOB: typeof p.DOB==='number'?p.DOB:0,
              height: typeof p.height==='number'?p.height:0,
              weight: typeof p.weight==='number'?p.weight:0,
              avatar: String(p.avatar||'assets/images/default-avatar.svg'),
              note: String(p.note||'')
            }));
          }
        }
      }
      this.updatePagination(); this.cdr.markForCheck();
    } catch(e){
      this.logger.errorDev('loadPlayers failure (fallback)',e);
      this.allPlayers=[]; this.updatePagination(); this.cdr.markForCheck();
    }
  }
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
      await this.simplePlayerService.createPlayer({
        firstName, lastName, position,
        fullName: `${firstName} ${lastName}`.trim(),
        dateOfBirth: '', avatar: '', notes: '',
        isRegistered: true, status: undefined as never // will default internally
      });
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
      await this.simplePlayerService.updatePlayer(id, patch);
    }catch(e){ this.logger.errorDev('update player failed',e); }
  }

  async deletePlayer(p:PlayerWithCoreId){
    const id=p.coreId? p.coreId: p.id.toString();
    try{ await this.simplePlayerService.deletePlayer(id); }catch(e){ this.logger.errorDev('delete player failed',e); }
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
  removeFromTeam(player:Player, team:'A'|'B'){ if(team==='A') this.teamA=this.teamA.filter(p=>p.id!==player.id); else this.teamB=this.teamB.filter(p=>p.id!==player.id); this.triggerTeamChange(); this.persistTeams(); }
  private triggerTeamChange(){ this.teamChange$.next(); this.persistTeams(); }
  onTeamDropped(event: { previousContainer: { data: Player[] }; container: { data: Player[] }; previousIndex: number; currentIndex: number }){
    // Basic CDK drop event mapping without importing concrete type to avoid circular import here
    const prevList: Player[] = event.previousContainer.data;
    const currList: Player[] = event.container.data;
    if(prevList===currList){
      // Reorder within same list
      const [moved] = prevList.splice(event.previousIndex,1);
      prevList.splice(event.currentIndex,0,moved);
    } else {
      const [moved] = prevList.splice(event.previousIndex,1);
      currList.splice(event.currentIndex,0,moved);
    }
    this.triggerTeamChange();
    this.cdr.markForCheck();
  }
  clearTeams(){ this.teamA=[]; this.teamB=[]; this.triggerTeamChange(); localStorage.removeItem('persisted_teams'); }
  shuffleRegisteredTeams(){
    // Use only registered players pool (explicit per requirement)
    const pool=this.registeredPlayers.slice();
    if(pool.length<2){ return; }
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    const half=Math.ceil(pool.length/2);
    this.teamA=pool.slice(0,half);
    this.teamB=pool.slice(half);
    this.triggerTeamChange();
  }

  async runAIAnalysis(){
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
  getDataModeBadge(){ return 'File Mode'; }
  async loadAIComponent(){ if(this.aiLoaded) return; const mod=await import('./components/ai-analysis.component'); this.aiComponent=mod.AIAnalysisComponent; this.aiLoaded=true; this.cdr.markForCheck(); }
  calculatePlayerScore(p:PlayerStats){ return (p.goals*3)+(p.assists*2)-(p.yellowCards*0.5)-(p.redCards*2); }
  getPlayerAvatarByName(name:string){ return `assets/images/avatar_players/${name.replace(/\s+/g,'_')}.png`; }
  togglePlayerRankings(){ this.showPlayerRankings=!this.showPlayerRankings; }

  async saveMatchInfo(){ if(!this.teamA.length && !this.teamB.length){ this.matchSaveMessage='Chia đội trước!'; setTimeout(()=>this.matchSaveMessage='',2400); return; } const matchData=await this.createMatchData(); await this.matchService.createMatch(matchData); await this.addMatchFundTransaction({date:matchData.date}); this.matchSaveMessage='Đã lưu trận đấu'; setTimeout(()=>this.matchSaveMessage='',2400); }
  private async createMatchData():Promise<Omit<MatchInfo,'id'|'createdAt'|'updatedAt'|'version'>>{
    const teamACore=await this.convertToTeamComposition(this.teamA,TeamColor.BLUE);
    const teamBCore=await this.convertToTeamComposition(this.teamB,TeamColor.ORANGE);

    // Build result with winner field
    const nameById=(id:number)=>{
      const p=this.allPlayers.find(pl=>pl.id===id); return p? `${p.firstName} ${p.lastName||''}`.trim():`#${id}`; };
  const goalMap=(arr:{playerId:number;assistId?:number;minute:number}[])=> arr.map(g=>({
      playerId: g.playerId.toString(),
      playerName: nameById(g.playerId),
      minute: g.minute,
      assistedBy: g.assistId? nameById(g.assistId): undefined,
      goalType: GoalType.REGULAR
    }));
    const cardMap=(arr:{playerId:number;minute:number}[], type:CardType)=> arr.map(c=>({
      playerId: c.playerId.toString(),
      playerName: nameById(c.playerId),
      minute: c.minute,
      cardType: type
    }));
    const rawResult:MatchResult={
      scoreA:this.scoreA,
      scoreB:this.scoreB,
      winner: this.scoreA===this.scoreB? 'draw': (this.scoreA>this.scoreB? 'A':'B'),
  goalsA:goalMap(this.goalsA),
  goalsB:goalMap(this.goalsB),
      yellowCardsA:cardMap(this.yellowCardsA,CardType.YELLOW),
      yellowCardsB:cardMap(this.yellowCardsB,CardType.YELLOW),
      redCardsA:cardMap(this.redCardsA,CardType.RED),
      redCardsB:cardMap(this.redCardsB,CardType.RED),
      events:this.buildTextMatchEvents()
    };

    // Finance removed from Đội hình tab – use zeroed placeholder structure
  const revenueTotalWinner=this._revWinner||0;
  const revenueTotalLoser=this._revLoser||0;
  const revenueCardPenalty=this._revCards||0;
  const revenueOther=this._revOther||0;
  const totalRevenue=revenueTotalWinner+revenueTotalLoser+revenueCardPenalty+revenueOther;
  const expensesWater=this._expWater||0;
  const expensesField=this._expField||0;
  const expensesRef=this._expRef||0;
  const expensesOther=this._expOther||0;
  const totalExpenses=expensesWater+expensesField+expensesRef+expensesOther;
  const netProfit=totalRevenue-totalExpenses;
  const expenses:ExpenseBreakdown={ referee:expensesRef, field:expensesField, water:expensesWater, transportation:0, food:0, equipment:0, other:expensesOther, fixed:expensesRef+expensesField, variable:expensesWater+expensesOther };
  const revenue:RevenueBreakdown={ winnerFees:revenueTotalWinner, loserFees:revenueTotalLoser, cardPenalties:revenueCardPenalty, otherRevenue:revenueOther, teamARevenue:0, teamBRevenue:0, penaltyRevenue:revenueCardPenalty };
  const finances:MatchFinances={ revenue, expenses, totalRevenue, totalExpenses, netProfit, revenueMode:'manual' };

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
  /**
   * Build MatchEvent entries from the raw comma-separated text inputs (goals / assists / cards)
   * without attempting to deduplicate against structured goal/card arrays.
   * Each name becomes one event with a generated id and timestamp.
   */
  private buildTextMatchEvents():MatchEvent[]{
    const events:MatchEvent[]=[];
    const now=Date.now();
    let counter=0;
    const timestamp=()=> new Date().toISOString();
    const parse=(text:string)=> text.split(/[\n,;]/).map(s=>s.trim()).filter(Boolean);
    // Extract minute if pattern 'Name 23' or 'Name 23'' or 'Name 23p'
    const extractMinute=(token:string)=>{
      const m=token.match(/(.+?)\s+(\d{1,3})(?:'|p)?$/i);
      if(m){
        const minute=parseInt(m[2],10);
        if(!isNaN(minute)) return { name:m[1].trim(), minute };
      }
      return { name:token, minute:undefined as number|undefined };
    };
    const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    const tokenScore=(input:string, candidate:Player)=>{
      const full=`${candidate.firstName} ${candidate.lastName||''}`.trim();
      const nIn=normalize(input);
      const nFirst=normalize(candidate.firstName);
      const nFull=normalize(full);
      if(nIn===nFull) return 1;
      if(nIn===nFirst) return 0.95;
      if(nFull.startsWith(nIn)) return 0.9;
      if(nFirst.startsWith(nIn)) return 0.85;
      // Partial subsequence score
      let matchCount=0; let j=0;
      for(const ch of nIn){ while(j<nFull.length && nFull[j]!==ch) j++; if(j<nFull.length && nFull[j]===ch){ matchCount++; j++; } }
      const subseqRatio=matchCount/nIn.length;
      if(subseqRatio>0.6) return 0.6+subseqRatio*0.2; // up to 0.8
      return 0;
    };
    const findPlayer=(name:string, team:Player[]):Player|undefined=>{
      const scored=team.map(p=>({p, s:tokenScore(name,p)})).filter(r=>r.s>0.55).sort((a,b)=>b.s-a.s);
      return scored.length? scored[0].p: undefined;
    };
    const pushEvents=(names:string[], type:EventType, teamId:'A'|'B', prefix:string, teamPlayers:Player[])=>{
      for(const n of names){
        const { name, minute } = extractMinute(n);
        const player=findPlayer(name, teamPlayers);
        events.push({
          id:`e_${now}_${counter++}`,
          type,
          description:`${prefix} ${name}`.trim() + (minute!==undefined? ` (${minute}')`:'') ,
          playerId: player? (player.id.toString()): undefined,
          teamId,
          minute,
          timestamp: timestamp()
        });
      }
    };
    // Goals
    pushEvents(parse(this.goalsTextA), EventType.GOAL, 'A', 'Ghi bàn:', this.teamA);
    pushEvents(parse(this.goalsTextB), EventType.GOAL, 'B', 'Ghi bàn:', this.teamB);
    // Assists now dedicated ASSIST EventType
    pushEvents(parse(this.assistsTextA), EventType.ASSIST, 'A', 'Kiến tạo:', this.teamA);
    pushEvents(parse(this.assistsTextB), EventType.ASSIST, 'B', 'Kiến tạo:', this.teamB);
    // Yellow cards
    pushEvents(parse(this.yellowTextA), EventType.YELLOW_CARD, 'A', 'Thẻ vàng:', this.teamA);
    pushEvents(parse(this.yellowTextB), EventType.YELLOW_CARD, 'B', 'Thẻ vàng:', this.teamB);
    // Red cards
    pushEvents(parse(this.redTextA), EventType.RED_CARD, 'A', 'Thẻ đỏ:', this.teamA);
    pushEvents(parse(this.redTextB), EventType.RED_CARD, 'B', 'Thẻ đỏ:', this.teamB);
    return events;
  }
  private async convertToTeamComposition(players:Player[], color:TeamColor):Promise<TeamComposition>{ const infos:PlayerInfo[]=[]; for(const p of players){ const cp=this.corePlayersData.find(c=>c.id===p.id.toString()); if(cp) infos.push(cp);} return { name: color===TeamColor.BLUE? 'Đội Xanh':'Đội Cam', players:infos, teamColor:color, formation:'4-4-2' }; }
  private async addMatchFundTransaction(match:{date:string}){ try{ const total=this.teamA.length+this.teamB.length; const base=total*30000; await this.dataStore.addFundTransaction({ type:'income', amount:base, description:`Thu nhập trận ${match.date}`, category:'match_fee', date:match.date, createdBy:'system'}); } catch(e){ this.logger.warnDev('Fund transaction failed',e); } }

  savePlayers(){ localStorage.setItem('players', JSON.stringify(this.allPlayers)); this.saveMessage='Đã lưu thay đổi'; setTimeout(()=>this.saveMessage='',2000); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  viewPlayer(_p:Player){ /* reserved for future player detail drawer */ }

  /* ===== Event manipulation helpers (simplified forms) ===== */
  addGoal(team:'A'|'B', playerId:number, minute:number, assistId?:number){ const target=team==='A'?this.goalsA:this.goalsB; target.push({playerId,minute,assistId}); this.updateScoreFromGoals(); }
  removeGoal(team:'A'|'B', index:number){ const target=team==='A'?this.goalsA:this.goalsB; if(index>-1) target.splice(index,1); this.updateScoreFromGoals(); }
  private updateScoreFromGoals(){ this.scoreA=this.goalsA.length; this.scoreB=this.goalsB.length; }
  private persistTeams(){
    try{
      const payload={ a:this.teamA.map(p=>p.id), b:this.teamB.map(p=>p.id), ts:Date.now() };
      localStorage.setItem('persisted_teams', JSON.stringify(payload));
    }catch{/* ignore */}
  }
  private restorePersistedTeams(){
    try{
      const raw=localStorage.getItem('persisted_teams'); if(!raw) return;
      const data=JSON.parse(raw) as {a:number[]; b:number[]};
      if(!data || !Array.isArray(data.a) || !Array.isArray(data.b)) return;
      // Only restore if current teams empty to avoid overwriting deliberate setup
      if(this.teamA.length||this.teamB.length) return;
      const mapById=new Map(this.getDisplayPlayers().map(p=>[p.id,p]));
      this.teamA=data.a.map(id=>mapById.get(id)).filter(Boolean) as Player[];
      this.teamB=data.b.map(id=>mapById.get(id)).filter(Boolean) as Player[];
      if(this.teamA.length || this.teamB.length){ this.triggerTeamChange(); this.cdr.markForCheck(); }
    }catch{/* ignore */}
  }
  addCard(type:'yellow'|'red', team:'A'|'B', playerId:number, minute:number){ const map={yellow:{A:this.yellowCardsA,B:this.yellowCardsB}, red:{A:this.redCardsA,B:this.redCardsB}} as const; map[type][team].push({playerId,minute}); }
  removeCard(type:'yellow'|'red', team:'A'|'B', idx:number){ const map={yellow:{A:this.yellowCardsA,B:this.yellowCardsB}, red:{A:this.redCardsA,B:this.redCardsB}} as const; const arr=map[type][team]; if(idx>-1) arr.splice(idx,1); }
  getPlayerName(id:number){ const p=this.allPlayers.find(pl=>pl.id===id); return p? p.firstName: ('#'+id); }
  profit(){ const rev=(this._revWinner||0)+(this._revLoser||0)+(this._revCards||0)+(this._revOther||0); const exp=(this._expWater||0)+(this._expField||0)+(this._expRef||0)+(this._expOther||0); return rev-exp; }
  // (handlers overridden below with persistence-enabled versions)
  private persistDraftEvents(){
    try{
      const payload={ gA:this.goalsTextA, gB:this.goalsTextB, aA:this.assistsTextA, aB:this.assistsTextB, yA:this.yellowTextA, yB:this.yellowTextB, rA:this.redTextA, rB:this.redTextB, ts:Date.now() };
      localStorage.setItem('draft_match_events', JSON.stringify(payload));
    }catch{/* ignore */}
  }
  private restoreDraftEvents(){
    interface DraftPayload { gA?:string; gB?:string; aA?:string; aB?:string; yA?:string; yB?:string; rA?:string; rB?:string; ts?:number }
    try{
      const raw=localStorage.getItem('draft_match_events'); if(!raw) return;
      const d=JSON.parse(raw) as DraftPayload;
      if(d){
        this.goalsTextA=d.gA||''; this.goalsTextB=d.gB||'';
        this.assistsTextA=d.aA||''; this.assistsTextB=d.aB||'';
        this.yellowTextA=d.yA||''; this.yellowTextB=d.yB||'';
        this.redTextA=d.rA||''; this.redTextB=d.rB||'';
      }
    }catch{/* ignore */}
  }
  // Hook persistence into zone stable updates (simple approach: debounce typing via setTimeout in handlers optional future)
  onGoalsTextChange(e:{team:'A'|'B'; text:string}){ this[e.team==='A'?'goalsTextA':'goalsTextB']=e.text; this.persistDraftEvents(); }
  onAssistsTextChange(e:{team:'A'|'B'; text:string}){ this[e.team==='A'?'assistsTextA':'assistsTextB']=e.text; this.persistDraftEvents(); }
  onYellowTextChange(e:{team:'A'|'B'; text:string}){ this[e.team==='A'?'yellowTextA':'yellowTextB']=e.text; this.persistDraftEvents(); }
  onRedTextChange(e:{team:'A'|'B'; text:string}){ this[e.team==='A'?'redTextA':'redTextB']=e.text; this.persistDraftEvents(); }

  /* ===== Impact stats aggregation ===== */
  computeImpactStats(){
    const stats = new Map<number, { player: Player; goals:number; assists:number; yellow:number; red:number; score:number }>();
    const ensure=(p:Player)=>{ if(!stats.has(p.id)) stats.set(p.id,{player:p, goals:0, assists:0, yellow:0, red:0, score:0}); return stats.get(p.id)!; };
    // Structured goals
    for(const g of [...this.goalsA,...this.goalsB]){ const p=this.allPlayers.find(pl=>pl.id===g.playerId); if(p){ const s=ensure(p); s.goals++; } if(g.assistId){ const a=this.allPlayers.find(pl=>pl.id===g.assistId); if(a){ const sa=ensure(a); sa.assists++; } } }
    // Cards structured
    for(const c of [...this.yellowCardsA,...this.yellowCardsB]){ const p=this.allPlayers.find(pl=>pl.id===c.playerId); if(p){ ensure(p).yellow++; } }
    for(const c of [...this.redCardsA,...this.redCardsB]){ const p=this.allPlayers.find(pl=>pl.id===c.playerId); if(p){ ensure(p).red++; } }
    // Text assist / goal fallback (names that didn't map structurally)
    const parseNames=(txt:string)=> txt.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
    const addByName=(names:string[], field:'goals'|'assists'|'yellow'|'red')=>{
      for(const raw of names){
        const name=raw.replace(/\s+\d{1,3}(?:'|p)?$/,'').trim();
        const player=this.allPlayers.find(p=> p.firstName.toLowerCase()===name.toLowerCase());
        if(player){ const s=ensure(player); s[field]++; }
      }
    };
    addByName(parseNames(this.goalsTextA), 'goals');
    addByName(parseNames(this.goalsTextB), 'goals');
    addByName(parseNames(this.assistsTextA), 'assists');
    addByName(parseNames(this.assistsTextB), 'assists');
    addByName(parseNames(this.yellowTextA), 'yellow');
    addByName(parseNames(this.yellowTextB), 'yellow');
    addByName(parseNames(this.redTextA), 'red');
    addByName(parseNames(this.redTextB), 'red');
    // Score formula (simple weighting)
    for(const s of stats.values()){ s.score = s.goals*4 + s.assists*3 - s.yellow*0.5 - s.red*3; }
    return Array.from(stats.values()).sort((a,b)=> b.score - a.score);
  }
}
