import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'players', pathMatch: 'full' },
  { path: 'players', loadComponent: () => import('./features/players/players-shell.component').then(m => m.PlayersShellComponent) },
  { path: 'players-list', loadComponent: () => import('./features/players/players-simple.component').then(m => m.PlayersSimpleComponent) },
  { path: 'history', loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent) },
  { path: 'fund', loadComponent: () => import('./features/fund/fund.component').then(m => m.FundComponent) },
  { path: 'stats', loadComponent: () => import('./features/stats/stats.component').then(m => m.StatsComponent) },
  { path: 'analysis', loadComponent: () => import('./features/analysis/analysis.component').then(m => m.AnalysisComponent) },
  { path: '**', redirectTo: 'players' }
];
