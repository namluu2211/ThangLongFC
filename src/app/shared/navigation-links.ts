export interface NavLink {
  path: string;
  label: string;
  icon?: string;
  exact?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { path: '/players', label: 'Quản lý đội hình', icon: 'fas fa-users', exact: true },
  { path: '/players-list', label: 'Danh sách cầu thủ', icon: 'fas fa-list' },
  { path: '/history', label: 'Lịch sử trận đấu', icon: 'fas fa-history' },
  { path: '/fund', label: 'Quỹ đội', icon: 'fas fa-piggy-bank' }
];
