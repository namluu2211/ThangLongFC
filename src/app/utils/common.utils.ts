// Shared utility functions for ThangLong FC application

import { MatchData, Player, FINANCIAL_RATES } from '../models/types';

/**
 * Currency formatting utility
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

/**
 * Short currency formatting for charts and compact displays
 */
export function formatShortCurrency(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + 'k';
  }
  return amount.toString();
}

/**
 * Date formatting utility
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Short date formatting for compact displays
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a player should be excluded from fee calculation
 */
export function isFreePlayer(player: Player): boolean {
  return player.position === 'Thủ môn' || player.firstName === 'Minh nhỏ';
}

/**
 * Get winner team from match data
 */
export function getWinnerTeam(match: MatchData): Player[] {
  if (Number(match.scoreA) > Number(match.scoreB)) {
    return match.teamA || [];
  } else if (Number(match.scoreB) > Number(match.scoreA)) {
    return match.teamB || [];
  } else {
    // Draw case - combine both teams
    return [...(match.teamA || []), ...(match.teamB || [])];
  }
}

/**
 * Get loser team from match data
 */
export function getLoserTeam(match: MatchData): Player[] {
  if (Number(match.scoreA) > Number(match.scoreB)) {
    return match.teamB || [];
  } else if (Number(match.scoreB) > Number(match.scoreA)) {
    return match.teamA || [];
  } else {
    // Draw case - no loser team
    return [];
  }
}

/**
 * Count yellow or red cards from match data
 */
export function getCardCount(match: MatchData, cardType: 'yellow' | 'red'): number {
  const fieldA = cardType === 'yellow' ? match.yellowA : match.redA;
  const fieldB = cardType === 'yellow' ? match.yellowB : match.redB;
  const countA = typeof fieldA === 'string' ? fieldA.split(/[, ]+/).filter(x => x).length : 0;
  const countB = typeof fieldB === 'string' ? fieldB.split(/[, ]+/).filter(x => x).length : 0;
  return countA + countB;
}

/**
 * Calculate automatic revenue (Thu) based on match results
 */
export function calculateAutoRevenue(match: MatchData): number {
  const winnerTeam = getWinnerTeam(match);
  const loserTeam = getLoserTeam(match);
  
  const winnerCount = winnerTeam.filter(p => !isFreePlayer(p)).length;
  const loserCount = loserTeam.filter(p => !isFreePlayer(p)).length;
  const yellowCount = getCardCount(match, 'yellow');
  const redCount = getCardCount(match, 'red');
  
  return winnerCount * FINANCIAL_RATES.WINNER_FEE + 
         loserCount * FINANCIAL_RATES.LOSER_FEE + 
         yellowCount * FINANCIAL_RATES.YELLOW_CARD_FEE + 
         redCount * FINANCIAL_RATES.RED_CARD_FEE;
}

/**
 * Calculate manual revenue (Thu) from manual input fields
 */
export function calculateManualRevenue(match: MatchData): number {
  return Number(match.thu_main || 0) + 
         Number(match.thu_penalties || 0) + 
         Number(match.thu_other || 0);
}

/**
 * Calculate total expenses (Chi)
 */
export function calculateTotalExpenses(match: MatchData): number {
  return Number(match.chi_trongtai || 0) + 
         Number(match.chi_nuoc || 0) + 
         Number(match.chi_san || 0) + 
         Number(match.chi_dilai || 0) + 
         Number(match.chi_anuong || 0) + 
         Number(match.chi_khac || 0);
}

/**
 * Get team names as comma-separated string
 */
export function getTeamNames(team: Player[]): string {
  return team.map(p => p.firstName || '').filter(x => x).join(', ');
}

/**
 * Validate expense input
 */
export function validateExpenseInput(value: number, field: string): string | null {
  if (value < 0) {
    return 'Chi phí không thể âm';
  }
  
  if (field === 'chi_trongtai' && value > 0 && value < 50000) {
    return 'Chi phí trọng tài thường từ 50,000 VND trở lên';
  }
  
  if (field === 'chi_san' && value > 0 && value < 100000) {
    return 'Chi phí sân thường từ 100,000 VND trở lên';
  }
  
  if (value > 1000000) {
    return 'Chi phí có vẻ quá cao, vui lòng kiểm tra lại';
  }
  
  return null;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(undefined, args), wait);
  };
}

/**
 * Simple memoization utility
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Safe number conversion
 */
export function toNumber(val: unknown): number {
  return Number(val) || 0;
}

/**
 * Generate unique ID for matches
 */
export function generateMatchId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}