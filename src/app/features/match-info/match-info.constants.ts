// match-info.constants.ts
// Centralized constants for Match Info feature

export const MATCH_INFO_STORAGE_KEY = 'match-teams';
export const MATCH_PENALTY_AMOUNTS = {
  YELLOW_CARD: 20000,
  RED_CARD: 50000
};

export const MATCH_STAT_LIMITS = {
  MAX_GOALS: 10,
  MAX_ASSISTS: 10,
  MAX_YELLOW_CARDS: 3,
  MAX_RED_CARDS: 1
};

export const MATCH_MESSAGES = {
  LOAD_SUCCESS: 'Đã tải danh sách cầu thủ thành công',
  LOAD_ERROR: 'Không thể tải danh sách cầu thủ. Vui lòng thử lại.',
  SAVE_SUCCESS: 'Đã lưu thông tin trận đấu thành công!',
  SAVE_ERROR: 'Có lỗi xảy ra khi lưu. Vui lòng thử lại.',
  CALCULATE_SUCCESS: 'Đã tính toán điểm và quỹ thành công!',
  CALCULATE_ERROR: 'Có lỗi xảy ra khi tính toán. Vui lòng thử lại.',
  MISSING_TEAMS: 'Vui lòng phân chia đội và nhập thống kê trước khi lưu!',
  AI_ANALYSIS_SUCCESS: 'Phân tích AI hoàn tất',
  AI_ANALYSIS_ERROR: 'Không thể phân tích dữ liệu'
};

export const AI_ANALYSIS_CONFIG = {
  MIN_MATCHES_FOR_ANALYSIS: 5,
  CONFIDENCE_THRESHOLD: 60,
  ANALYSIS_TIMEOUT_MS: 3000
};

export const DEFAULT_AVATAR = 'assets/images/avatar_players/default-avatar.png';
