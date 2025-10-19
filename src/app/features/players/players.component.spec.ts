import { TestBed, fakeAsync, tick } from '@angular/core/testing';
// Declare Jasmine globals to satisfy TypeScript without installing types in this context
// (Assuming Jasmine/Karma environment; adjust if using Jest)
declare const describe: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const it: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const expect: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const beforeEach: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const spyOn: any; // eslint-disable-line @typescript-eslint/no-explicit-any
import { PlayersComponent } from './players.component';
import { AIAnalysisService } from './services/ai-analysis.service';
import { FirebasePlayerService } from '../../core/services/firebase-player.service';
import { MatchService } from '../../core/services/match.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { LoggerService } from '../../core/services/logger.service';
import { of } from 'rxjs';

class MockAIAnalysisService { analyzeTeams(){ return { prediction:{ predictedScore:{ xanh:1, cam:2 }, winProbability:{ xanh:0.4, cam:0.6 } }, keyFactors:[], historicalContext:{ recentPerformance:{ xanhWins:0, camWins:0, draws:0 }, matchesAnalyzed:0 } }; } }
class MockFirebasePlayerService { players$=of([]); getAllPlayers(){ return []; } }
class MockMatchService { completedMatches$=of([]); createMatch(){ return Promise.resolve(); } }
class MockDataStoreService { addFundTransaction(){ return Promise.resolve(); } }
class MockLoggerService { log() { /* noop */ } warn() { /* noop */ } error() { /* noop */ } }

describe('PlayersComponent', () => {
  let component: PlayersComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports:[PlayersComponent],
      providers:[
        { provide: AIAnalysisService, useClass: MockAIAnalysisService },
        { provide: FirebasePlayerService, useClass: MockFirebasePlayerService },
        { provide: MatchService, useClass: MockMatchService },
        { provide: DataStoreService, useClass: MockDataStoreService },
        { provide: LoggerService, useClass: MockLoggerService }
      ]
    });
    const fixture = TestBed.createComponent(PlayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should memoize pagination results until state changes', () => {
    component.allPlayers = Array.from({length:25},(_,i)=>({ id:i+1, firstName:'P'+(i+1), lastName:'', position:'', DOB:0, height:0, weight:0, avatar:'', note:'' }));
    const first = component.getPaginatedPlayers();
    const second = component.getPaginatedPlayers();
    expect(first).toBe(second);
    component.nextPage();
    const third = component.getPaginatedPlayers();
    expect(third).not.toBe(first);
  });

  it('should debounce AI analysis calls', fakeAsync(() => {
    // Access private method via type assertion
  spyOn(component as unknown as { runAIAnalysis: () => void }, 'runAIAnalysis').and.callThrough();
    component.teamA=[{ id:1, firstName:'A', lastName:'', position:'', DOB:0, height:0, weight:0, avatar:'', note:'' }];
    component.teamB=[{ id:2, firstName:'B', lastName:'', position:'', DOB:0, height:0, weight:0, avatar:'', note:'' }];
    (component as unknown as { triggerTeamChange: () => void }).triggerTeamChange();
    (component as unknown as { triggerTeamChange: () => void }).triggerTeamChange();
    (component as unknown as { triggerTeamChange: () => void }).triggerTeamChange();
    tick(260); // exceed debounce time
  expect((component as unknown as { runAIAnalysis: () => void }).runAIAnalysis).toHaveBeenCalledTimes(1);
  }));
});
