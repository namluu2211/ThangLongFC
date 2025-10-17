/**
 * Constants for Players Component
 * Extracted from players.component.ts for better maintainability
 */

// Position strength bonuses for AI calculations
export const POSITION_STRENGTH_BONUSES = {
  STRIKER: 10,
  MIDFIELDER: 8,
  DEFENDER: 5,
  GOALKEEPER: 3
} as const;

// Base strength values
export const BASE_STRENGTH = {
  DEFAULT: 60,
  MIN: 0,
  MAX: 100
} as const;

// Score calculation weights
export const SCORE_WEIGHTS = {
  GOAL: 3,
  ASSIST: 2,
  YELLOW_CARD: -0.5,
  RED_CARD: -2
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  INITIAL_PAGE: 0
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  TOP_PLAYER_MIN_MATCHES: 3,
  TOP_PLAYER_MIN_SCORE: 5,
  DEBOUNCE_TIME_MS: 300
} as const;

// UI/UX delays
export const UI_DELAYS = {
  TEMPORARY_MESSAGE_DURATION: 3000,
  AI_ANALYSIS_DEBOUNCE: 500
} as const;

// LocalStorage keys
export const STORAGE_KEYS = {
  REGISTERED_PLAYERS: 'registeredPlayers',
  TEAM_A: 'teamA',
  TEAM_B: 'teamB'
} as const;

// Avatar fallback
export const AVATAR = {
  DEFAULT: 'assets/images/default-avatar.svg',
  PLACEHOLDER_BASE64: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY3ZWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPj88L3RleHQ+PC9zdmc+'
} as const;

// Team division
export const TEAM = {
  MIN_PLAYERS_TO_DIVIDE: 2
} as const;

// Position names (Vietnamese)
export const POSITIONS = {
  STRIKER: 'Tiền đạo',
  MIDFIELDER: 'Tiền vệ',
  DEFENDER: 'Hậu vệ',
  GOALKEEPER: 'Thủ môn',
  UNKNOWN: 'Chưa xác định'
} as const;

// AI Analysis cache settings
export const AI_CACHE = {
  ENABLE: true,
  MAX_AGE_MS: 60000 // 1 minute
} as const;
