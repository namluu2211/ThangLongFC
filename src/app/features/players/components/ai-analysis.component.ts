import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../player-utils';

export interface SimpleAIResult {
  predictedScore: { xanh: number; cam: number };
  xanhWinProb: number;
  camWinProb: number;
  keyFactors: { name: string; impact: number }[];
  historicalStats?: { xanhWins: number; camWins: number; draws: number; totalMatches: number };
}

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="ai-analysis-card" *ngIf="teamA.length || teamB.length">
    <div class="ai-header">
      <h4><i class="fas fa-brain me-2"></i>🤖 Phân Tích Dự Đoán AI</h4>
      <p class="ai-subtitle">Dự đoán tỷ lệ thắng dựa trên đội hình hiện tại</p>
    </div>
    <div class="ai-body">
      <div class="team-formation-preview mb-4">
        <h5 class="preview-title"><i class="fas fa-eye me-2"></i>Đội hình sẽ được phân tích</h5>
        <div class="formation-display">
          <div class="formation-team formation-xanh">
            <div class="formation-header">🔵 Đội Xanh ({{teamA.length}})</div>
            <div class="formation-players">
              <span *ngFor="let player of teamA; let last = last" class="formation-player">{{player.firstName}}{{!last ? ', ' : ''}}</span>
            </div>
          </div>
          <div class="formation-team formation-cam">
            <div class="formation-header">🟠 Đội Cam ({{teamB.length}})</div>
            <div class="formation-players">
              <span *ngFor="let player of teamB; let last = last" class="formation-player">{{player.firstName}}{{!last ? ', ' : ''}}</span>
            </div>
          </div>
        </div>
      </div>
      <button class="modern-btn btn-primary enhanced-analysis-btn" (click)="runAnalysis.emit()" [disabled]="isAnalyzing || !teamA.length || !teamB.length">
        <span *ngIf="!isAnalyzing"><i class="fas fa-robot me-2"></i>Phân tích AI</span>
        <span *ngIf="isAnalyzing"><i class="fas fa-spinner fa-spin me-2"></i>Đang phân tích...</span>
      </button>
      <div class="analysis-results-enhanced" *ngIf="ai as result">
        <div class="results-header-enhanced">
          <div class="ai-badge">Kết quả</div>
          <h3 class="results-title">Dự đoán tỷ số: {{result.predictedScore.xanh}} - {{result.predictedScore.cam}}</h3>
          <p class="results-subtitle">Tỷ lệ thắng: 🔵 {{result.xanhWinProb}}% | 🟠 {{result.camWinProb}}%</p>
        </div>
        <div class="predictions-grid">
          <div class="prediction-card-enhanced">
            <div class="card-header">
              <div class="card-icon score-icon">⚽</div>
              <div class="card-title"><h4>Tỷ Số Dự Đoán</h4><div class="card-subtitle">Score Prediction</div></div>
            </div>
            <div class="score-display-enhanced">
              <div class="team-score-enhanced">
                <div class="team-indicator"><span class="team-dot xanh-dot"></span><span class="team-name">Đội Xanh</span></div>
                <div class="score-number-large">{{result.predictedScore.xanh}}</div>
              </div>
              <div class="vs-separator-enhanced"><div class="vs-text">VS</div></div>
              <div class="team-score-enhanced">
                <div class="team-indicator"><span class="team-dot cam-dot"></span><span class="team-name">Đội Cam</span></div>
                <div class="score-number-large">{{result.predictedScore.cam}}</div>
              </div>
            </div>
          </div>
          <div class="prediction-card-enhanced">
            <div class="card-header">
              <div class="card-icon probability-icon">📊</div>
              <div class="card-title"><h4>Xác Suất Thắng</h4><div class="card-subtitle">Win Probability</div></div>
            </div>
            <div class="probability-display-enhanced">
              <div class="prob-item-enhanced">
                <div class="prob-team-info"><span>Đội Xanh</span><span class="prob-percentage">{{result.xanhWinProb}}%</span></div>
                <div class="progress-enhanced"><div class="progress-bar-enhanced xanh-bar" [style.width.%]="result.xanhWinProb"></div></div>
              </div>
              <div class="prob-item-enhanced">
                <div class="prob-team-info"><span>Đội Cam</span><span class="prob-percentage">{{result.camWinProb}}%</span></div>
                <div class="progress-enhanced"><div class="progress-bar-enhanced cam-bar" [style.width.%]="result.camWinProb"></div></div>
              </div>
            </div>
          </div>
          <div class="prediction-card-enhanced" *ngIf="result.keyFactors?.length">
            <div class="card-header">
              <div class="card-icon factors-icon">🧠</div>
              <div class="card-title"><h4>Yếu Tố Chính</h4><div class="card-subtitle">Key Factors</div></div>
            </div>
            <div class="factors-list-enhanced">
              <div *ngFor="let factor of result.keyFactors; trackBy: trackByFactorName" class="factor-item-enhanced" [class.factor-positive]="factor.impact > 0" [class.factor-negative]="factor.impact < 0">
                <div class="factor-content">
                  <div class="factor-name-enhanced">{{factor.name}}</div>
                  <div class="factor-impact-enhanced">
                    <span class="impact-badge" [class.positive-impact]="factor.impact > 0" [class.negative-impact]="factor.impact < 0">
                      <i [class]="factor.impact > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                      {{factor.impact > 0 ? '+' : ''}}{{factor.impact}}%
                    </span>
                  </div>
                </div>
                <div class="factor-progress">
                  <div class="factor-bar" [style.width.%]="Math.abs(factor.impact) * 2" [class.positive-bar]="factor.impact > 0" [class.negative-bar]="factor.impact < 0"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="match-history-enhanced" *ngIf="result.historicalStats">
          <div class="history-header-enhanced">
            <div class="history-badge"><span class="badge-icon">📈</span><span class="badge-text">Phân Tích Lịch Sử</span></div>
            <h4 class="history-title-enhanced">Lịch Sử Đối Đầu</h4>
            <p class="history-subtitle">Dựa trên dữ liệu các trận gần đây</p>
          </div>
          <div class="history-cards-grid">
            <div class="history-card xanh-card">
              <div class="card-header-history">
                <div class="card-icon-history xanh-icon">🏆</div>
                <div class="card-info"><h5 class="card-title-history">Đội Xanh</h5><p class="card-subtitle-history">Thắng</p></div>
              </div>
              <div class="stat-display">
                <div class="stat-number-large">{{result.historicalStats?.xanhWins}}</div>
                <div class="stat-percentage">{{((result.historicalStats?.xanhWins || 0) / (result.historicalStats?.totalMatches || 1) * 100) | number:'1.0-0'}}%</div>
              </div>
            </div>
            <div class="history-card cam-card">
              <div class="card-header-history">
                <div class="card-icon-history cam-icon">🏆</div>
                <div class="card-info"><h5 class="card-title-history">Đội Cam</h5><p class="card-subtitle-history">Thắng</p></div>
              </div>
              <div class="stat-display">
                <div class="stat-number-large">{{result.historicalStats?.camWins}}</div>
                <div class="stat-percentage">{{((result.historicalStats?.camWins || 0) / (result.historicalStats?.totalMatches || 1) * 100) | number:'1.0-0'}}%</div>
              </div>
            </div>
            <div class="history-card draws-card">
              <div class="card-header-history">
                <div class="card-icon-history draws-icon">🤝</div>
                <div class="card-info"><h5 class="card-title-history">Hòa</h5><p class="card-subtitle-history">Số trận</p></div>
              </div>
              <div class="stat-display"><div class="stat-number-large">{{result.historicalStats?.draws}}</div></div>
            </div>
            <div class="history-card total-card">
              <div class="card-header-history">
                <div class="card-icon-history total-icon">⚽</div>
                <div class="card-info"><h5 class="card-title-history">Tổng</h5><p class="card-subtitle-history">Trận đấu</p></div>
              </div>
              <div class="stat-display">
                <div class="stat-number-large">{{result.historicalStats?.totalMatches}}</div>
                <div class="stat-label-enhanced">trận</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AIAnalysisComponent {
  @Input() teamA: Player[] = [];
  @Input() teamB: Player[] = [];
  @Input() ai: SimpleAIResult | null = null;
  @Input() isAnalyzing = false;
  @Output() runAnalysis = new EventEmitter<void>();

  trackByFactorName = (_:number, f:{name:string}) => f.name;
}
