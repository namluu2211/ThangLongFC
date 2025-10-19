import { Player } from '../player-utils';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  useRegistered: boolean;
  dataLength: number;
}

export interface PaginatedResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  items: T[];
}

export function computePagination<T>(items: T[], state: PaginationState): PaginatedResult<T> {
  const totalPages = Math.ceil(items.length / state.pageSize) || 0;
  const currentPage = Math.min(Math.max(state.currentPage, 0), Math.max(totalPages - 1, 0));
  const start = currentPage * state.pageSize;
  const end = start + state.pageSize;
  return { page: currentPage, pageSize: state.pageSize, totalPages, items: items.slice(start, end) };
}

export class PlayerPaginationController {
  private _cache: { key: string; result: PaginatedResult<Player> } | null = null;
  constructor(private readonly pageSize: number) {}

  paginate(players: Player[], currentPage: number): PaginatedResult<Player> {
    const key = `${players.length}:${currentPage}:${this.pageSize}`;
    if (this._cache && this._cache.key === key) return this._cache.result;
    const res = computePagination(players, { currentPage, pageSize: this.pageSize, totalPages: 0, useRegistered: false, dataLength: players.length });
    this._cache = { key, result: res };
    return res;
  }

  invalidate(): void { this._cache = null; }
}
