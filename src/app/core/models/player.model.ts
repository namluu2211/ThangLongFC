/**
 * Core Player Model
 * Enhanced player data structure with comprehensive information
 */

export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  nickname?: string;
  
  // Physical attributes
  position?: string;
  height?: number; // cm
  weight?: number; // kg
  age?: number;
  dateOfBirth?: string;
  
  // Contact & Personal
  phoneNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  
  // Media assets
  avatar?: string;
  images?: string[];
  thumbnailUrl?: string;
  
  // Registration & Status
  isRegistered: boolean;
  registrationDate?: string;
  status: PlayerStatus;
  notes?: string;
  
  // Performance data
  stats: PlayerStats;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PlayerStats {
  // Basic statistics
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  
  // Performance metrics
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  
  // Team distribution
  teamAMatches: number;
  teamBMatches: number;
  
  // Advanced metrics
  winRate: number;
  averageGoalsPerMatch: number;
  averageAssistsPerMatch: number;
  disciplinaryScore: number; // Lower is better
  
  // Financial contribution
  totalRevenue: number; // From wins, etc.
  totalPenalties: number; // From cards
  netContribution: number;
  
  // Time-based stats
  currentStreak: number; // Win/loss streak
  lastMatchDate?: string;
  bestPerformanceDate?: string;
  
  // Season/period stats
  currentSeasonStats?: SeasonStats;
  allTimeStats?: SeasonStats;
}

export interface SeasonStats {
  season: string;
  matches: number;
  goals: number;
  assists: number;
  wins: number;
  yellowCards: number;
  redCards: number;
  startDate: string;
  endDate?: string;
}

export enum PlayerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  INJURED = 'injured',
  SUSPENDED = 'suspended',
  RETIRED = 'retired'
}

export enum PlayerPosition {
  GOALKEEPER = 'Thủ môn',
  DEFENDER = 'Hậu vệ',
  MIDFIELDER = 'Tiền vệ',
  FORWARD = 'Tiền đạo',
  WINGER = 'Cánh',
  CENTER_BACK = 'Trung vệ',
  FULLBACK = 'Hậu vệ biên',
  DEFENSIVE_MIDFIELDER = 'Tiền vệ phòng ngự',
  ATTACKING_MIDFIELDER = 'Tiền vệ tấn công',
  STRIKER = 'Tiền đạo cắm',
  UNKNOWN = 'Chưa xác định'
}

export interface PlayerValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: keyof PlayerInfo;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: keyof PlayerInfo;
  message: string;
}

export interface PlayerSearchCriteria {
  name?: string;
  position?: PlayerPosition;
  status?: PlayerStatus;
  isRegistered?: boolean;
  minMatches?: number;
  maxAge?: number;
  minAge?: number;
}

export interface PlayerSortOptions {
  field: keyof PlayerStats | keyof PlayerInfo;
  direction: 'asc' | 'desc';
}

// Utility types
export type PlayerUpdateFields = Partial<Omit<PlayerInfo, 'id' | 'createdAt' | 'stats'>>;
export type StatsUpdateFields = Partial<PlayerStats>;

// Constants
export const DEFAULT_PLAYER_STATS: PlayerStats = {
  totalMatches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  teamAMatches: 0,
  teamBMatches: 0,
  winRate: 0,
  averageGoalsPerMatch: 0,
  averageAssistsPerMatch: 0,
  disciplinaryScore: 0,
  totalRevenue: 0,
  totalPenalties: 0,
  netContribution: 0,
  currentStreak: 0
};

export const AVATAR_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  dimensions: {
    thumbnail: { width: 100, height: 100 },
    avatar: { width: 200, height: 200 },
    profile: { width: 400, height: 400 }
  }
} as const;