import { Injectable } from '@angular/core';
import { MatchInfo, MatchValidation } from '../models/match.model';

/**
 * MatchValidationService
 * Centralizes match data validation rules extracted from MatchService.
 */
@Injectable({ providedIn: 'root' })
export class MatchValidationService {
  validate(matchData: Partial<MatchInfo>): MatchValidation {
    const errors: { field: keyof MatchInfo; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: { field: keyof MatchInfo; message: string }[] = [];

    if (!matchData.date) {
      errors.push({ field: 'date', message: 'Ngày trận đấu là bắt buộc', severity: 'error' });
    }
    if (!matchData.teamA || !matchData.teamB) {
      errors.push({ field: 'teamA', message: 'Cần có đủ 2 đội', severity: 'error' });
    }
    if (matchData.teamA && matchData.teamB) {
      const teamASize = matchData.teamA.players?.length || 0;
      const teamBSize = matchData.teamB.players?.length || 0;
      if (Math.abs(teamASize - teamBSize) > 2) {
        warnings.push({ field: 'teamA', message: 'Đội hình không cân bằng về số lượng cầu thủ' });
      }
    }
    return { isValid: errors.length === 0, errors, warnings };
  }
}