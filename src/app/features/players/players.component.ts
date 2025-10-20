// PlayersComponent (clean singular definition with typed AI caching & debounce)
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnInit, OnDestroy, TrackByFunction, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { AIWorkerService } from './services/ai-worker.service';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Player } from './player-utils'; // Augment to satisfy AIAnalysisService Player index signature
import { PlayerInfo } from '../../core/models/player.model';
import { TeamComposition, TeamColor, MatchStatus, MatchInfo, MatchResult, MatchFinances, ExpenseBreakdown, RevenueBreakdown, MatchStatistics, GoalType, CardType, MatchEvent, EventType } from '../../core/models/match.model';
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
import { CanEditDirective } from '../../shared/can-edit.directive';
import { DisableUnlessCanEditDirective } from '../../shared/disable-unless-can-edit.directive';
// AIAnalysisComponent will be lazy loaded dynamically
// Removed FinancePanelComponent & PlayerRankingsComponent from Đội hình tab

interface PlayerStats { name:string; goals:number; assists:number; yellowCards:number; redCards:number; matches:number; }
interface AIResult { predictedScore:{xanh:number;cam:number}; xanhWinProb:number; camWinProb:number; keyFactors:{name:string;impact:number}[]; historicalStats?:{xanhWins:number;camWins:number;draws:number;totalMatches:number}; teamStrengths?:{ xanh:number; cam:number; balance:number } }
interface RawPlayerJson { id?: number|string; firstName?: string; lastName?: string; position?: string; DOB?: number; dateOfBirth?: string|number; height?: number; weight?: number; avatar?: string; note?: string; notes?: string; }
interface PlayerWithCoreId extends Player { coreId?: string; avatar?: string; note?: string; }

@Component({
  selector:'app-players',
  standalone:true,
  imports:[CommonModule,FormsModule,PlayerListComponent,TeamsPanelComponent,CanEditDirective,DisableUnlessCanEditDirective],
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
  filterRegisteredOnly=false;
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
  // Legacy free-text event inputs removed (structured arrays only)
  /**
   * Migration Note (2025-10-20):
   * Free-text match event inputs (goalsTextA/goalsTextB/etc.) were deprecated in favor of
   * structured arrays (goalsA/goalsB, yellowCardsA/B, redCardsA/B). This improves data integrity,
   * eliminates ambiguous name matching and simplifies persistence. Historical matches that used
   * textual events still retain their 'events' array produced at save time; new matches generate
   * events solely from structured arrays via buildStructuredEvents(). LocalStorage key
   * 'draft_match_events' is no longer written or read.
   */
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

  // New player form state (avatar + note)
  newPlayerFirstName='';
  newPlayerLastName='';
  newPlayerPosition='';
  newPlayerAvatar='';
  newPlayerNote='';
  onNewAvatarError(){ this.newPlayerAvatar=''; }
  resetNewPlayerForm(){
    this.newPlayerFirstName='';
    this.newPlayerLastName='';
    this.newPlayerPosition='';
    this.newPlayerAvatar='';
    this.newPlayerNote='';
  }

  // Editing existing player state
  editingPlayer: PlayerWithCoreId | null = null;
  editFirstName='';
  editLastName='';
  editPosition='';
  editAvatar='';
  editNote='';
  startEditPlayer(p:PlayerWithCoreId){
    this.editingPlayer=p;
    this.editFirstName=p.firstName;
    this.editLastName=p.lastName||'';
    this.editPosition=p.position||'';
    // Attempt to find core record for richer fields
    const coreId=p.coreId? p.coreId: p.id.toString();
    const core=this.corePlayersData.find(c=>c.id===coreId);
    this.editAvatar=core?.avatar||p.avatar||'';
  this.editNote=(core?.notes || p.note || '') as string;
  }
  cancelPlayerEdit(){ this.editingPlayer=null; }
  async applyPlayerEdits(){
    if(!this.editingPlayer) return;
    const target=this.editingPlayer;
    const id= target.coreId? target.coreId: target.id.toString();
    try{
      const patch: Partial<PlayerInfo> = {
        firstName: this.editFirstName.trim(),
        lastName: this.editLastName.trim(),
        position: this.editPosition.trim()||'Chưa xác định',
        fullName: `${this.editFirstName.trim()} ${this.editLastName.trim()}`.trim(),
        avatar: this.editAvatar.trim(),
        notes: this.editNote.trim()
      };
      await this.simplePlayerService.updatePlayer(id, patch);
      this.editingPlayer=null;
      // local list soft update for immediate UI response
      const local=this.allPlayers.find(p=>p.id===target.id);
      if(local){
        local.firstName=patch.firstName!;
        local.lastName=patch.lastName!;
        local.position=patch.position!;
        local.avatar=patch.avatar;
        local.note=patch.notes;
      }
      this.cdr.markForCheck();
    }catch(e){ this.logger.errorDev('applyPlayerEdits failed', e); }
  }

  ngOnInit(){
    this.loadRegisteredPlayers();
    this.subscribeToPlayersStream();
    this.subscribeToCompletedMatches();
    this.loadPlayers();
    this.teamChange$.pipe(takeUntil(this.destroy$),debounceTime(250)).subscribe(()=>this.runAIAnalysis());
    // Attempt restore of persisted teams after players load (delayed to ensure players available)
    setTimeout(()=>this.restorePersistedTeams(), 600);
  // Draft free-text event inputs deprecated – no restoration needed
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
    // Use player id as uniqueness key to avoid dropping distinct players sharing same name
    const unique=Array.from(new Map(core.map(p=>[p.id,p])).values());
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
      const avatar=this.newPlayerAvatar?.trim()||'';
      const notes=this.newPlayerNote?.trim()||'';
      await this.simplePlayerService.createPlayer({
        firstName, lastName, position: position||'Chưa xác định',
        fullName: `${firstName} ${lastName}`.trim(),
        dateOfBirth: '', avatar, notes,
        isRegistered: true, status: undefined as never // will default internally
      });
      this.resetNewPlayerForm();
      // Re-sync occurs via realtime listener.
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

  getDisplayPlayers():Player[]{
    const base = this.useRegistered? this.registeredPlayers: this.allPlayers;
    if(this.filterRegisteredOnly) return base.filter(p=> this.registeredPlayers.some(r=>r.id===p.id));
    return base;
  }
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
  // Public wrapper for template to toggle the registered-only filter without exposing internal pagination helper
  toggleRegisteredFilter(){
    this.filterRegisteredOnly = !this.filterRegisteredOnly;
    this.updatePagination();
    this.cdr.markForCheck();
  }
  canDivideTeams(){ return this.getDisplayPlayers().length>=2; }

  shuffleTeams(){
    const pool=this.getDisplayPlayers().slice();
    if(pool.length<2){
      this.matchSaveMessage='Cần ≥2 cầu thủ để chia đội';
      setTimeout(()=>{ this.matchSaveMessage=''; this.cdr.markForCheck(); },2500);
      return;
    }
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    const half=Math.ceil(pool.length/2);
    // Replace with new array references so OnPush notices immediately
    this.teamA=[...pool.slice(0,half)];
    this.teamB=[...pool.slice(half)];
    this.triggerTeamChange();
    this.cdr.markForCheck();
    // Auto-run AI analysis for viewers if both teams exist
    if(!this.canEdit && this.teamA.length && this.teamB.length){
      setTimeout(()=> this.runAIAnalysis(), 50);
    }
  }
  // Drag-drop handled by lazy TeamDndComponent
  removeFromTeam(player:Player, team:'A'|'B'){ const list=team==='A'?this.teamA:this.teamB; const idx=list.findIndex(p=>p.id===player.id); if(idx>-1){ list.splice(idx,1); this.triggerTeamChange(); this.persistTeams(); }
  }
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
  clearTeams(){ this.teamA.length=0; this.teamB.length=0; this.triggerTeamChange(); localStorage.removeItem('persisted_teams'); }
  shuffleRegisteredTeams(){
    // Allow viewer fallback: if not enough registered players, use full player list as pool
    const basePool = this.registeredPlayers.length>=2 ? this.registeredPlayers : this.allPlayers;
    const pool=basePool.slice();
    if(pool.length<2){
      this.matchSaveMessage='Cần ≥2 cầu thủ';
      setTimeout(()=>{ this.matchSaveMessage=''; this.cdr.markForCheck(); },2500);
      return;
    }
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    const half=Math.ceil(pool.length/2);
    this.teamA=[...pool.slice(0,half)];
    this.teamB=[...pool.slice(half)];
    this.triggerTeamChange();
    this.cdr.markForCheck();
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
        teamStrengths:{ xanh:teamAStr, cam:teamBStr, balance:balanceScore }
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

  async saveMatchInfo(){
    if(!this.canEdit){
      this.matchSaveMessage='Chế độ xem: không thể lưu';
      setTimeout(()=>this.matchSaveMessage='',2400);
      return;
    }
    if(!this.teamA.length && !this.teamB.length){
      this.matchSaveMessage='Chia đội trước!';
      setTimeout(()=>this.matchSaveMessage='',2400);
      return;
    }
    const matchData=await this.createMatchData();
    await this.matchService.createMatch(matchData);
    await this.addMatchFundTransaction({date:matchData.date});
    this.matchSaveMessage='Đã lưu trận đấu';
    setTimeout(()=>this.matchSaveMessage='',2400);
  }
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
    const rawResultPartial: Omit<MatchResult,'events'> = {
      scoreA:this.scoreA,
      scoreB:this.scoreB,
      winner: this.scoreA===this.scoreB? 'draw': (this.scoreA>this.scoreB? 'A':'B'),
      goalsA:goalMap(this.goalsA),
      goalsB:goalMap(this.goalsB),
      yellowCardsA:cardMap(this.yellowCardsA,CardType.YELLOW),
      yellowCardsB:cardMap(this.yellowCardsB,CardType.YELLOW),
      redCardsA:cardMap(this.redCardsA,CardType.RED),
      redCardsB:cardMap(this.redCardsB,CardType.RED)
    };
    const rawResult:MatchResult = { ...rawResultPartial, events: this.buildStructuredEvents(rawResultPartial as MatchResult) };

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
   * Build MatchEvent entries from structured arrays only.
   * Each goal generates a GOAL event and an ASSIST event (if assistId provided).
   * Each card generates YELLOW_CARD or RED_CARD event.
   */
  private buildStructuredEvents(result:MatchResult):MatchEvent[]{
    const events:MatchEvent[]=[];
    let counter=0; const now=Date.now(); const ts=()=> new Date().toISOString();
    const push=(e:Omit<MatchEvent,'id'|'timestamp'>)=> events.push({...e, id:`e_${now}_${counter++}`, timestamp:ts()});
    for(const g of result.goalsA){
      push({ type:EventType.GOAL, description:`Ghi bàn: ${g.playerName}`+(g.minute!==undefined? ` (${g.minute}')`:''), minute:g.minute, playerId:g.playerId, teamId:'A' });
      if(g.assistedBy){ push({ type:EventType.ASSIST, description:`Kiến tạo: ${g.assistedBy}`+(g.minute!==undefined? ` (${g.minute}')`:''), minute:g.minute, playerId: undefined, teamId:'A' }); }
    }
    for(const g of result.goalsB){
      push({ type:EventType.GOAL, description:`Ghi bàn: ${g.playerName}`+(g.minute!==undefined? ` (${g.minute}')`:''), minute:g.minute, playerId:g.playerId, teamId:'B' });
      if(g.assistedBy){ push({ type:EventType.ASSIST, description:`Kiến tạo: ${g.assistedBy}`+(g.minute!==undefined? ` (${g.minute}')`:''), minute:g.minute, playerId: undefined, teamId:'B' }); }
    }
    for(const c of result.yellowCardsA){ push({ type:EventType.YELLOW_CARD, description:`Thẻ vàng: ${c.playerName}`+(c.minute!==undefined? ` (${c.minute}')`:''), minute:c.minute, playerId:c.playerId, teamId:'A' }); }
    for(const c of result.yellowCardsB){ push({ type:EventType.YELLOW_CARD, description:`Thẻ vàng: ${c.playerName}`+(c.minute!==undefined? ` (${c.minute}')`:''), minute:c.minute, playerId:c.playerId, teamId:'B' }); }
    for(const c of result.redCardsA){ push({ type:EventType.RED_CARD, description:`Thẻ đỏ: ${c.playerName}`+(c.minute!==undefined? ` (${c.minute}')`:''), minute:c.minute, playerId:c.playerId, teamId:'A' }); }
    for(const c of result.redCardsB){ push({ type:EventType.RED_CARD, description:`Thẻ đỏ: ${c.playerName}`+(c.minute!==undefined? ` (${c.minute}')`:''), minute:c.minute, playerId:c.playerId, teamId:'B' }); }
    return events;
  }
  private async convertToTeamComposition(players:Player[], color:TeamColor):Promise<TeamComposition>{
    const infos:PlayerInfo[]=[];
    for(const p of players){
      let cp:PlayerInfo|undefined;
      if((p as PlayerWithCoreId).coreId){
        cp=this.corePlayersData.find(c=>c.id===(p as PlayerWithCoreId).coreId);
      }
      if(!cp){
        // Fallback match by full name (case-insensitive, diacritic-insensitive)
        const normalize=(s:string)=> s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
        const first=normalize(p.firstName);
        const last=normalize(p.lastName||'');
        cp=this.corePlayersData.find(c=> normalize(c.firstName)===first && normalize(c.lastName||'')===last);
      }
      if(cp){
        infos.push(cp);
      } else {
        // Create minimal placeholder PlayerInfo so roster still shows in match record
        infos.push({
          id: (p as PlayerWithCoreId).coreId? (p as PlayerWithCoreId).coreId: p.id.toString(),
          firstName: p.firstName,
          lastName: p.lastName||'',
          fullName: `${p.firstName} ${p.lastName||''}`.trim(),
          position: p.position || 'Chưa xác định',
          dateOfBirth: '',
          avatar: (p as PlayerWithCoreId).avatar || 'assets/images/default-avatar.svg',
          notes: (p as PlayerWithCoreId).note || '',
          stats: { totalMatches:0, winRate:0, averageGoalsPerMatch:0, averageAssistsPerMatch:0 }
        } as PlayerInfo);
      }
    }
    return { name: color===TeamColor.BLUE? 'Đội Xanh':'Đội Cam', players:infos, teamColor:color, formation:'4-4-2' };
  }
  private async addMatchFundTransaction(match:{date:string}){ try{ const total=this.teamA.length+this.teamB.length; const base=total*30000; await this.dataStore.addFundTransaction({ type:'income', amount:base, description:`Thu nhập trận ${match.date}`, category:'match_fee', date:match.date, createdBy:'system'}); } catch(e){ this.logger.warnDev('Fund transaction failed',e); } }

  savePlayers(){ localStorage.setItem('players', JSON.stringify(this.allPlayers)); this.saveMessage='Đã lưu thay đổi'; setTimeout(()=>this.saveMessage='',2000); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  viewPlayer(_p:Player){ /* reserved for future player detail drawer */ }

  /* ===== Event manipulation helpers (simplified forms) ===== */
  addGoal(team:'A'|'B', playerId:number, minute:number, assistId?:number){
    if(!this.canEdit) return; const target=team==='A'?this.goalsA:this.goalsB; target.push({playerId,minute,assistId}); this.updateScoreFromGoals();
  }
  removeGoal(team:'A'|'B', index:number){ if(!this.canEdit) return; const target=team==='A'?this.goalsA:this.goalsB; if(index>-1) target.splice(index,1); this.updateScoreFromGoals(); }
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
      // Avoid overwriting if user already shuffled or manually set teams
      if(this.teamA.length||this.teamB.length) return;
      if((!data.a.length)&&(!data.b.length)) return;
      const mapById=new Map(this.getDisplayPlayers().map(p=>[p.id,p]));
      const restoredA=data.a.map(id=>mapById.get(id)).filter(Boolean) as Player[];
      const restoredB=data.b.map(id=>mapById.get(id)).filter(Boolean) as Player[];
      if(restoredA.length || restoredB.length){
        this.teamA=[...restoredA];
        this.teamB=[...restoredB];
        this.triggerTeamChange();
        this.cdr.markForCheck();
      }
    }catch{/* ignore */}
  }
  addCard(type:'yellow'|'red', team:'A'|'B', playerId:number, minute:number){ if(!this.canEdit) return; const map={yellow:{A:this.yellowCardsA,B:this.yellowCardsB}, red:{A:this.redCardsA,B:this.redCardsB}} as const; map[type][team].push({playerId,minute}); }
  removeCard(type:'yellow'|'red', team:'A'|'B', idx:number){ if(!this.canEdit) return; const map={yellow:{A:this.yellowCardsA,B:this.yellowCardsB}, red:{A:this.redCardsA,B:this.redCardsB}} as const; const arr=map[type][team]; if(idx>-1) arr.splice(idx,1); }
  getPlayerName(id:number){ const p=this.allPlayers.find(pl=>pl.id===id); return p? p.firstName: ''; }
  profit(){ const rev=(this._revWinner||0)+(this._revLoser||0)+(this._revCards||0)+(this._revOther||0); const exp=(this._expWater||0)+(this._expField||0)+(this._expRef||0)+(this._expOther||0); return rev-exp; }
  // (handlers overridden below with persistence-enabled versions)
  // Draft free-text events deprecated – methods removed
  // Hook persistence into zone stable updates (simple approach: debounce typing via setTimeout in handlers optional future)
  // Text change handlers removed

  /* ===== Impact stats aggregation ===== */
  computeImpactStats(){
    const stats = new Map<number, { player: Player; goals:number; assists:number; yellow:number; red:number; score:number }>();
    const ensure=(p:Player)=>{ if(!stats.has(p.id)) stats.set(p.id,{player:p, goals:0, assists:0, yellow:0, red:0, score:0}); return stats.get(p.id)!; };
    // Structured goals
    for(const g of [...this.goalsA,...this.goalsB]){ const p=this.allPlayers.find(pl=>pl.id===g.playerId); if(p){ const s=ensure(p); s.goals++; } if(g.assistId){ const a=this.allPlayers.find(pl=>pl.id===g.assistId); if(a){ const sa=ensure(a); sa.assists++; } } }
    // Cards structured
    for(const c of [...this.yellowCardsA,...this.yellowCardsB]){ const p=this.allPlayers.find(pl=>pl.id===c.playerId); if(p){ ensure(p).yellow++; } }
    for(const c of [...this.redCardsA,...this.redCardsB]){ const p=this.allPlayers.find(pl=>pl.id===c.playerId); if(p){ ensure(p).red++; } }
    // Score formula (simple weighting)
    for(const s of stats.values()){ s.score = s.goals*4 + s.assists*3 - s.yellow*0.5 - s.red*3; }
    return Array.from(stats.values()).sort((a,b)=> b.score - a.score);
  }

  /** Keep array reference stable for drag & drop while replacing contents */
  private replaceTeam(team:'A'|'B', players:Player[]){
    const target= team==='A'? this.teamA: this.teamB;
    target.length=0; for(const p of players) target.push(p);
  }
}
