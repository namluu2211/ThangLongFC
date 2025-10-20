import { Injectable } from '@angular/core';
import { MatchInfo, MatchFinances, CustomRates, DEFAULT_FINANCIAL_RATES } from '../models/match.model';

/**
 * MatchFinancesService
 * Extracted financial calculation logic from MatchService for single responsibility.
 * Provides pure-ish calculation helpers; stateless aside from future configurable rates.
 */
@Injectable({ providedIn: 'root' })
export class MatchFinancesService {

  calculate(match: MatchInfo): MatchFinances {
    const rates = match.finances?.customRates || DEFAULT_FINANCIAL_RATES;
  const revenue = this.calculateRevenue(match, rates);
    const expenses = match.finances?.expenses || {
      referee: 0,
      field: 0,
      water: 0,
      transportation: 0,
      food: 0,
      equipment: 0,
      other: 0,
      fixed: 0,
      variable: 0
    };
  // Only sum primary revenue categories, exclude internal detail fields (teamARevenue, teamBRevenue, penaltyRevenue which is duplicate of cardPenalties)
  const totalRevenue = revenue.winnerFees + revenue.loserFees + revenue.cardPenalties + revenue.otherRevenue;
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      revenueMode: match.finances?.revenueMode || 'auto',
      customRates: match.finances?.customRates || {
        winnerFee: DEFAULT_FINANCIAL_RATES.WINNER_FEE,
        loserFee: DEFAULT_FINANCIAL_RATES.LOSER_FEE,
        yellowCardFee: DEFAULT_FINANCIAL_RATES.YELLOW_CARD_FEE,
        redCardFee: DEFAULT_FINANCIAL_RATES.RED_CARD_FEE
      }
    };
  }

  private calculateRevenue(match: MatchInfo, rates: CustomRates | typeof DEFAULT_FINANCIAL_RATES) {
    const result = match.result;
    let teamARevenue = 0; let teamBRevenue = 0;
    const winnerFee = this.getRateValue(rates, 'winnerFee', 'WINNER_FEE', 40000);
    const loserFee = this.getRateValue(rates, 'loserFee', 'LOSER_FEE', 60000);
    const yellowFee = this.getRateValue(rates, 'yellowCardFee', 'YELLOW_CARD_FEE', 50000);
    const redFee = this.getRateValue(rates, 'redCardFee', 'RED_CARD_FEE', 100000);
    if (result.scoreA > result.scoreB) {
      teamARevenue += winnerFee * match.teamA.players.length;
      teamBRevenue += loserFee * match.teamB.players.length;
    } else if (result.scoreB > result.scoreA) {
      teamBRevenue += winnerFee * match.teamB.players.length;
      teamARevenue += loserFee * match.teamA.players.length;
    } else {
      const drawFee = (winnerFee + loserFee) / 2;
      teamARevenue += drawFee * match.teamA.players.length;
      teamBRevenue += drawFee * match.teamB.players.length;
    }
    const penaltyRevenue = (result.yellowCardsA.length + result.yellowCardsB.length) * yellowFee + (result.redCardsA.length + result.redCardsB.length) * redFee;
    const winnerFees = teamARevenue > teamBRevenue ? teamARevenue : teamBRevenue;
    const loserFees = teamARevenue < teamBRevenue ? teamARevenue : teamBRevenue;
    return {
      winnerFees,
      loserFees,
      cardPenalties: penaltyRevenue,
      otherRevenue: 0,
      teamARevenue,
      teamBRevenue,
      penaltyRevenue
    };
  }

  private getRateValue(
    rates: CustomRates | typeof DEFAULT_FINANCIAL_RATES,
    customKey: keyof CustomRates,
    defaultKey: keyof typeof DEFAULT_FINANCIAL_RATES,
    fallback: number
  ): number {
    if ('winnerFee' in rates) {
      return (rates as CustomRates)[customKey] || fallback;
    } else {
      return (rates as typeof DEFAULT_FINANCIAL_RATES)[defaultKey] || fallback;
    }
  }
}