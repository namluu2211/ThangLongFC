// Shared type definitions for ThangLong FC application

export interface Player {
  id?: string;
  firstName: string;
  lastName?: string;
  position?: string;
  avatar?: string;
  stats?: PlayerStats;
}

export interface PlayerStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Team {
  players: Player[];
  score?: number;
  goals?: string;
  assists?: string;
  yellowCards?: string;
  redCards?: string;
}

export interface MatchFinances {
  // Revenue (Thu)
  thu?: number;
  thuMode?: 'auto' | 'manual';
  thu_main?: number;
  thu_penalties?: number;
  thu_other?: number;
  
  // Expenses (Chi)
  chi_trongtai?: number;
  chi_nuoc?: number;
  chi_san?: number;
  chi_dilai?: number;
  chi_anuong?: number;
  chi_khac?: number;
  chi_total?: number;
  
  // UI State
  showAllExpenses?: boolean;
  expenseErrors?: Record<string, string>;
}

export interface MatchData extends MatchFinances {
  id?: string;
  date: string;
  
  // Teams
  teamA: Player[];
  teamB: Player[];
  
  // Scores
  scoreA: number;
  scoreB: number;
  
  // Goals and assists
  scorerA?: string;
  scorerB?: string;
  assistA?: string;
  assistB?: string;
  
  // Cards
  yellowA?: string;
  yellowB?: string;
  redA?: string;
  redB?: string;
  
  // Metadata
  lastSaved?: string;
  updatedBy?: string;
}

export interface AppState {
  loggedIn: boolean;
  role: string;
  show: string;
  canEdit: boolean;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface SaveStatus {
  status: 'saving' | 'saved' | 'error';
  message?: string;
  timestamp: number;
}

export interface FundData {
  value: number;
  timestamp: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Utility types
export type ComponentMode = 'auto' | 'list' | 'history' | 'fund' | 'stats' | 'setup';
export type CardType = 'yellow' | 'red';
export type FinancialChangeType = 'thu' | 'chi' | 'all';

// Constants
export const TEAM_COLORS = {
  A: {
    name: 'Đội Xanh',
    primary: '#00bcd4',
    secondary: '#00acc1',
    background: 'rgba(0, 188, 212, 0.1)'
  },
  B: {
    name: 'Đội Cam', 
    primary: '#ff9800',
    secondary: '#ff8f00',
    background: 'rgba(255, 152, 0, 0.1)'
  }
} as const;

export const FINANCIAL_RATES = {
  WINNER_FEE: 40000,
  LOSER_FEE: 60000,
  YELLOW_CARD_FEE: 50000,
  RED_CARD_FEE: 100000
} as const;

export const CACHE_DURATION = {
  FUND_CACHE: 30000, // 30 seconds
  CALCULATION_CACHE: 60000 // 1 minute
} as const;