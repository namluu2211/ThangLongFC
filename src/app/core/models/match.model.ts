/**
 * Core Match Model
 * Enhanced match data structure with comprehensive team and financial information
 */

import { PlayerInfo } from './player.model';

export interface MatchInfo {
  id: string;
  date: string;
  
  // Team composition
  teamA: TeamComposition;
  teamB: TeamComposition;
  
  // Match results
  result: MatchResult;
  
  // Financial data
  finances: MatchFinances;
  
  // Match statistics
  statistics: MatchStatistics;
  
  // Metadata
  status: MatchStatus;
  venue?: string;
  weather?: WeatherCondition;
  notes?: string;
  
  // Audit trail
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

export interface TeamComposition {
  name: string;
  players: PlayerInfo[];
  formation?: string;
  captain?: string;
  substitutes?: PlayerInfo[];
  teamColor: TeamColor;
}

export interface MatchResult {
  scoreA: number;
  scoreB: number;
  winner?: 'A' | 'B' | 'draw';
  
  // Goal details
  goalsA: GoalDetail[];
  goalsB: GoalDetail[];
  
  // Cards
  yellowCardsA: CardDetail[];
  yellowCardsB: CardDetail[];
  redCardsA: CardDetail[];
  redCardsB: CardDetail[];
  
  // Match events
  events: MatchEvent[];
}

export interface GoalDetail {
  playerId: string;
  playerName: string;
  minute?: number;
  assistedBy?: string;
  goalType: GoalType;
}

export interface CardDetail {
  playerId: string;
  playerName: string;
  minute?: number;
  reason?: string;
  cardType: CardType;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  minute?: number;
  description: string;
  playerId?: string;
  teamId: 'A' | 'B';
  timestamp: string;
}

export interface MatchFinances {
  // Revenue calculations
  revenue: RevenueBreakdown;
  
  // Expense tracking
  expenses: ExpenseBreakdown;
  
  // Summary
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  
  // Configuration
  revenueMode: 'auto' | 'manual';
  customRates?: CustomRates;
}

export interface RevenueBreakdown {
  winnerFees: number;
  loserFees: number;
  cardPenalties: number;
  otherRevenue: number;
  
  // Detailed calculations
  teamARevenue: number;
  teamBRevenue: number;
  penaltyRevenue: number;
}

export interface ExpenseBreakdown {
  referee: number;
  field: number;
  water: number;
  transportation: number;
  food: number;
  equipment: number;
  other: number;
  
  // Categories
  fixed: number;    // Referee, field
  variable: number; // Water, food, etc.
}

export interface CustomRates {
  winnerFee?: number;
  loserFee?: number;
  yellowCardFee?: number;
  redCardFee?: number;
}

export interface MatchStatistics {
  // Team performance
  teamAStats: TeamPerformance;
  teamBStats: TeamPerformance;
  
  // Match metrics
  duration: number; // in minutes
  attendance?: number;
  
  // Performance indicators
  competitiveness: number; // 0-100
  fairPlay: number; // 0-100 based on cards
  entertainment: number; // 0-100 based on goals/events
}

export interface TeamPerformance {
  possession?: number; // percentage
  shots?: number;
  shotsOnTarget?: number;
  passes?: number;
  passAccuracy?: number;
  corners?: number;
  fouls: number;
  
  // Calculated metrics
  efficiency: number; // goals per shots ratio
  discipline: number; // inverse of cards
}

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed'
}

export enum TeamColor {
  BLUE = 'blue',    // Đội Xanh
  ORANGE = 'orange', // Đội Cam
  RED = 'red',
  GREEN = 'green',
  YELLOW = 'yellow',
  PURPLE = 'purple'
}

export enum GoalType {
  REGULAR = 'regular',
  PENALTY = 'penalty',
  FREE_KICK = 'free_kick',
  HEADER = 'header',
  VOLLEY = 'volley',
  OWN_GOAL = 'own_goal'
}

export enum CardType {
  YELLOW = 'yellow',
  RED = 'red'
}

export enum EventType {
  GOAL = 'goal',
  ASSIST = 'assist',
  YELLOW_CARD = 'yellow_card',
  RED_CARD = 'red_card',
  SUBSTITUTION = 'substitution',
  INJURY = 'injury',
  TIMEOUT = 'timeout',
  HALF_TIME = 'half_time',
  FULL_TIME = 'full_time'
}

export enum WeatherCondition {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  WINDY = 'windy',
  HOT = 'hot',
  COLD = 'cold'
}

// Validation interfaces
export interface MatchValidation {
  isValid: boolean;
  errors: MatchValidationError[];
  warnings: MatchValidationWarning[];
}

export interface MatchValidationError {
  field: keyof MatchInfo;
  message: string;
  severity: 'error' | 'warning';
}

export interface MatchValidationWarning {
  field: keyof MatchInfo;
  message: string;
}

// Search and filter interfaces
export interface MatchSearchCriteria {
  dateFrom?: string;
  dateTo?: string;
  teamPlayer?: string; // Player in either team
  status?: MatchStatus;
  minScore?: number;
  hasCards?: boolean;
  venue?: string;
}

export interface MatchSortOptions {
  field: keyof MatchInfo | 'totalGoals' | 'profit';
  direction: 'asc' | 'desc';
}

// Analytics interfaces
export interface MatchAnalytics {
  matchQuality: MatchQuality;
  teamAnalysis: TeamAnalysisResult;
  financialSummary: FinancialSummary;
  playerPerformance: PlayerMatchPerformance[];
}

export interface MatchQuality {
  overallRating: number; // 0-100
  competitiveness: number;
  entertainment: number;
  fairPlay: number;
  organization: number;
}

export interface TeamAnalysisResult {
  teamA: TeamAnalysis;
  teamB: TeamAnalysis;
  balance: TeamBalance;
}

export interface TeamAnalysis {
  strength: number;
  chemistry: number;
  experience: number;
  predicted_performance: number;
  actual_performance: number;
}

export interface TeamBalance {
  experienceBalance: number;
  skillBalance: number;
  sizeBalance: number;
  overallBalance: number;
}

export interface FinancialSummary {
  profitability: number;
  costEfficiency: number;
  revenueOptimization: number;
  suggestions: string[];
}

export interface PlayerMatchPerformance {
  playerId: string;
  playerName: string;
  team: 'A' | 'B';
  
  // Performance metrics
  goals: number;
  assists: number;
  cards: number;
  
  // Calculated ratings
  performanceRating: number; // 0-100
  impactRating: number; // 0-100
  
  // Financial impact
  revenueGenerated: number;
  penaltiesCaused: number;
}

// Utility types
export type MatchUpdateFields = Partial<Omit<MatchInfo, 'id' | 'createdAt' | 'version'>>;
export type TeamSide = 'A' | 'B';

// Constants
export const DEFAULT_FINANCIAL_RATES = {
  WINNER_FEE: 40000,
  LOSER_FEE: 60000,
  YELLOW_CARD_FEE: 50000,
  RED_CARD_FEE: 100000
} as const;

export const DEFAULT_MATCH_STATISTICS: MatchStatistics = {
  teamAStats: {
    fouls: 0,
    efficiency: 0,
    discipline: 100
  },
  teamBStats: {
    fouls: 0,
    efficiency: 0,
    discipline: 100
  },
  duration: 90,
  competitiveness: 50,
  fairPlay: 100,
  entertainment: 50
};

export const TEAM_COLOR_CONFIG = {
  [TeamColor.BLUE]: {
    name: 'Đội Xanh',
    primary: '#00bcd4',
    secondary: '#00acc1',
    background: 'rgba(0, 188, 212, 0.1)'
  },
  [TeamColor.ORANGE]: {
    name: 'Đội Cam',
    primary: '#ff9800',
    secondary: '#ff8f00',
    background: 'rgba(255, 152, 0, 0.1)'
  },
  [TeamColor.RED]: {
    name: 'Đội Đỏ',
    primary: '#f44336',
    secondary: '#d32f2f',
    background: 'rgba(244, 67, 54, 0.1)'
  },
  [TeamColor.GREEN]: {
    name: 'Đội Xanh Lá',
    primary: '#4caf50',
    secondary: '#388e3c',
    background: 'rgba(76, 175, 80, 0.1)'
  }
} as const;