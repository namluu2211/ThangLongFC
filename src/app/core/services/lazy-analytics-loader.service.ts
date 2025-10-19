import { Injectable } from '@angular/core';
import type { PlayerAdvancedStatsService } from './player-advanced-stats.service';
import type { TeamAnalyticsService } from './team-analytics.service';
import type { MatchAnalyticsService } from './match-analytics.service';
import type { FundAnalyticsService } from './fund-analytics.service';
import type { ComparisonAnalyticsService } from './comparison-analytics.service';

@Injectable({ providedIn: 'root' })
export class LazyAnalyticsLoaderService {
  private playerAdvancedPromise?: Promise<PlayerAdvancedStatsService>;
  private teamAnalyticsPromise?: Promise<TeamAnalyticsService>;
  private matchAnalyticsPromise?: Promise<MatchAnalyticsService>;
  private fundAnalyticsPromise?: Promise<FundAnalyticsService>;
  private comparisonAnalyticsPromise?: Promise<ComparisonAnalyticsService>;

  preloadAll(): void {
    setTimeout(() => {
      void this.getPlayerAdvanced();
      void this.getTeamAnalytics();
      void this.getMatchAnalytics();
      void this.getFundAnalytics();
      void this.getComparisonAnalytics();
    }, 0);
  }

  async getPlayerAdvanced() {
    if (!this.playerAdvancedPromise) {
      this.playerAdvancedPromise = import('./player-advanced-stats.service').then(m => new m.PlayerAdvancedStatsService());
    }
    return this.playerAdvancedPromise;
  }
  async getTeamAnalytics() {
    if (!this.teamAnalyticsPromise) {
      this.teamAnalyticsPromise = import('./team-analytics.service').then(m => new m.TeamAnalyticsService());
    }
    return this.teamAnalyticsPromise;
  }
  async getMatchAnalytics() {
    if (!this.matchAnalyticsPromise) {
      this.matchAnalyticsPromise = import('./match-analytics.service').then(m => new m.MatchAnalyticsService());
    }
    return this.matchAnalyticsPromise;
  }
  async getFundAnalytics() {
    if (!this.fundAnalyticsPromise) {
      this.fundAnalyticsPromise = import('./fund-analytics.service').then(m => new m.FundAnalyticsService());
    }
    return this.fundAnalyticsPromise;
  }
  async getComparisonAnalytics() {
    if (!this.comparisonAnalyticsPromise) {
      this.comparisonAnalyticsPromise = import('./comparison-analytics.service').then(m => new m.ComparisonAnalyticsService());
    }
    return this.comparisonAnalyticsPromise;
  }
}
