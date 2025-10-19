import { Injectable } from '@angular/core';

export interface FinanceState {
  thu: number;
  chi_total: number;
  chi_nuoc: number;
  chi_san: number;
  chi_trongtai: number;
}

@Injectable({ providedIn: 'root' })
export class MatchFinanceService {
  private state: FinanceState = {
    thu: 0,
    chi_total: 0,
    chi_nuoc: 0,
    chi_san: 0,
    chi_trongtai: 0
  };

  get finance(): FinanceState { return { ...this.state }; }

  update(partial: Partial<FinanceState>): void {
    this.state = { ...this.state, ...partial };
    this.recalculateTotalsIfNeeded();
  }

  private recalculateTotalsIfNeeded(): void {
    // If chi_total not explicitly provided, recompute as sum of components
    if (!('chi_total' in this.state) || this.state.chi_total === 0) {
      const computed = this.state.chi_nuoc + this.state.chi_san + this.state.chi_trongtai;
      if (computed > 0 && (this.state.chi_total === 0)) {
        this.state.chi_total = computed;
      }
    }
  }

  clear(): void {
    this.state = { thu: 0, chi_total: 0, chi_nuoc: 0, chi_san: 0, chi_trongtai: 0 };
  }
}
