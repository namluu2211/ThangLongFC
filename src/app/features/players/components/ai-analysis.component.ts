import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../player-utils';

export interface SimpleAIResult {
  predictedScore: { xanh: number; cam: number };
  xanhWinProb: number;
  camWinProb: number;
  keyFactors: { name: string; impact: number }[];
  historicalStats?: { xanhWins: number; camWins: number; draws: number; totalMatches: number };
  /**
   * Optional extended strengths data (0-100 scale or raw) for richer UI.
   * balance: 0 means completely uneven, 100 means perfectly balanced
   */
  teamStrengths?: { xanh: number; cam: number; balance: number };
}

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="ai-analysis-card" *ngIf="teamA.length || teamB.length" [class.light-theme]="!darkMode">
    <div class="ai-header">
      <h4><i class="fas fa-brain me-2"></i>🤖 Phân Tích Dự Đoán AI</h4>
      <p class="ai-subtitle">Dự đoán tỷ lệ thắng dựa trên đội hình hiện tại</p>
      <button type="button" class="theme-toggle-btn" (click)="toggleTheme()" [attr.aria-label]="darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'">
        <span *ngIf="darkMode">🌞</span>
        <span *ngIf="!darkMode">🌙</span>
      </button>
    </div>
    <div class="ai-body">
      <!-- Formation preview removed (redundant with Teams Panel) -->
  <!-- Internal AI trigger removed (toolbar button now sole trigger) -->
      <div class="analysis-results-enhanced" *ngIf="ai as result">
        <div class="results-header-enhanced">
          <div class="ai-badge" aria-label="Kết quả dự đoán">Kết quả</div>
          <h3 class="results-title" aria-live="polite">Dự đoán tỷ số: <span class="score-pill xanh-pill">{{result.predictedScore?.xanh ?? 0}}</span> - <span class="score-pill cam-pill">{{result.predictedScore?.cam ?? 0}}</span></h3>
          <p class="results-subtitle">Tỷ lệ thắng: 🔵 {{ (result.xanhWinProb || 0) | number:'1.0-2'}}% <span class="divider">|</span> 🟠 {{ (result.camWinProb || 0) | number:'1.0-2'}}%</p>
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
                <div class="score-number-large">{{result.predictedScore?.xanh ?? 0}}</div>
              </div>
              <div class="vs-separator-enhanced"><div class="vs-text">VS</div></div>
              <div class="team-score-enhanced">
                <div class="team-indicator"><span class="team-dot cam-dot"></span><span class="team-name">Đội Cam</span></div>
                <div class="score-number-large">{{result.predictedScore?.cam ?? 0}}</div>
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
                <div class="prob-team-info"><span>Đội Xanh</span><span class="prob-percentage">{{ (result.xanhWinProb || 0) | number:'1.0-2'}}%</span></div>
                <div class="progress-enhanced" aria-label="Xác suất thắng đội Xanh"><div class="progress-bar-enhanced xanh-bar" [style.width.%]="result.xanhWinProb || 0"></div></div>
              </div>
              <div class="prob-item-enhanced">
                <div class="prob-team-info"><span>Đội Cam</span><span class="prob-percentage">{{ (result.camWinProb || 0) | number:'1.0-2'}}%</span></div>
                <div class="progress-enhanced" aria-label="Xác suất thắng đội Cam"><div class="progress-bar-enhanced cam-bar" [style.width.%]="result.camWinProb || 0"></div></div>
              </div>
            </div>
          </div>
          <div class="prediction-card-enhanced balance-card" *ngIf="result.teamStrengths as s">
            <div class="card-header">
              <div class="card-icon balance-icon">⚖️</div>
              <div class="card-title"><h4>Cân Bằng Đội</h4><div class="card-subtitle">Team Balance</div></div>
            </div>
            <div class="balance-meter" aria-label="Chỉ số cân bằng đội">
              <div class="balance-bars">
                <div class="balance-side xanh-side">
                  <div class="balance-label">Xanh</div>
                  <div class="balance-bar-wrapper">
                    <div class="balance-bar xanh-bar" [style.width.%]="normalizedStrength(s.xanh, s.cam).xanh"></div>
                  </div>
                  <div class="balance-value">{{s.xanh}}</div>
                </div>
                <div class="balance-center">
                  <div class="balance-score" [class.good-balance]="(s.balance||0) >= 55" [class.poor-balance]="(s.balance||0) < 40">{{s.balance || 0}}%</div>
                  <div class="balance-score-label">cân bằng</div>
                </div>
                <div class="balance-side cam-side">
                  <div class="balance-label">Cam</div>
                  <div class="balance-bar-wrapper">
                    <div class="balance-bar cam-bar" [style.width.%]="normalizedStrength(s.xanh, s.cam).cam"></div>
                  </div>
                  <div class="balance-value">{{s.cam}}</div>
                </div>
              </div>
              <div class="balance-hint" *ngIf="(s.balance||0) < 50">Gợi ý: Cân nhắc hoán đổi 1-2 cầu thủ để cân bằng hơn</div>
              <div class="balance-hint good" *ngIf="(s.balance||0) >= 50">Đội hình khá cân bằng 👍</div>
            </div>
          </div>
          <div class="prediction-card-enhanced" *ngIf="result.keyFactors?.length">
            <div class="card-header">
              <div class="card-icon factors-icon">🧠</div>
              <div class="card-title"><h4>Yếu Tố Chính</h4><div class="card-subtitle">Key Factors</div></div>
            </div>
            <div class="factors-list-enhanced">
              <div *ngFor="let factor of result.keyFactors; trackBy: trackByFactorName" class="factor-item-enhanced" [class.factor-positive]="(factor.impact||0) > 0" [class.factor-negative]="(factor.impact||0) < 0">
                <div class="factor-content">
                  <div class="factor-name-enhanced">{{factor.name}}</div>
                  <div class="factor-impact-enhanced">
                    <span class="impact-badge" [class.positive-impact]="(factor.impact||0) > 0" [class.negative-impact]="(factor.impact||0) < 0">
                      <i [class]="(factor.impact||0) > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                      {{(factor.impact||0) > 0 ? '+' : ''}}{{factor.impact || 0}}%
                    </span>
                  </div>
                </div>
                <div class="factor-progress">
                  <div class="factor-bar" [style.width.%]="abs(factor.impact) * 2" [class.positive-bar]="(factor.impact||0) > 0" [class.negative-bar]="(factor.impact||0) < 0"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Historical stats panel removed to reduce redundancy -->
      </div>
    </div>
  `,
  styles:[
    `.ai-analysis-card{background:radial-gradient(circle at 15% 20%,#1f2c3d,#243242 55%,#394857);color:#e6edf3;padding:18px 20px 26px;border:1px solid #2f4253;border-radius:18px;box-shadow:0 8px 28px -8px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.35);font-size:.85rem}`,
    `.ai-header h4{margin:0 0 4px;font-size:1rem;font-weight:600;letter-spacing:.5px;display:flex;align-items:center;gap:6px}`,
    `.ai-subtitle{margin:0 0 14px;opacity:.65;font-size:.7rem}`,
    `.preview-title{font-size:.7rem;letter-spacing:.5px;text-transform:uppercase;opacity:.7;margin:0 0 6px}`,
    `.formation-display{display:flex;flex-direction:column;gap:6px;font-size:.7rem}`,
    `.formation-team{background:rgba(255,255,255,.04);padding:6px 10px 8px;border:1px solid rgba(255,255,255,.08);border-radius:10px;backdrop-filter:blur(2px)}`,
    `.formation-header{font-weight:600;font-size:.72rem;margin-bottom:2px;display:flex;align-items:center;gap:4px}`,
    `.enhanced-analysis-btn{margin:4px 0 16px}`,
    `.analysis-results-enhanced{display:flex;flex-direction:column;gap:18px}`,
    `.results-title{font-size:1.05rem;font-weight:600;margin:4px 0 6px}`,
    `.score-pill{display:inline-block;min-width:34px;text-align:center;padding:4px 10px;border-radius:14px;font-weight:700;font-size:1rem}`,
    `.score-pill.xanh-pill{background:#167dff;color:#fff}`,
    `.score-pill.cam-pill{background:#ff8c42;color:#fff}`,
    `.results-subtitle{margin:0;font-size:.72rem;letter-spacing:.4px;opacity:.75}`,
    `.divider{opacity:.4;margin:0 6px}`,
    `.predictions-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}`,
    `.prediction-card-enhanced{background:linear-gradient(145deg,#253646,#202d3c);border:1px solid #304557;border-radius:14px;padding:12px 14px 16px;display:flex;flex-direction:column;gap:12px;position:relative;box-shadow:0 4px 14px -4px rgba(0,0,0,.5)}`,
    `.prediction-card-enhanced .card-header{display:flex;align-items:center;gap:10px}`,
    `.card-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);border-radius:10px;font-size:16px}`,
    `.card-title h4{margin:0;font-size:.85rem;font-weight:600}`,
    `.card-subtitle{font-size:.55rem;text-transform:uppercase;letter-spacing:.5px;opacity:.55;margin-top:2px}`,
    `.score-display-enhanced{display:flex;justify-content:space-between;align-items:center;gap:10px}`,
    `.team-score-enhanced{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}`,
    `.team-indicator{display:flex;align-items:center;gap:6px;font-size:.6rem;opacity:.85}`,
    `.team-dot{width:10px;height:10px;border-radius:50%;display:inline-block}`,
    `.team-dot.xanh-dot{background:#1c9bff;box-shadow:0 0 0 3px rgba(28,155,255,.25)}`,
    `.team-dot.cam-dot{background:#ff8c42;box-shadow:0 0 0 3px rgba(255,140,66,.25)}`,
    `.score-number-large{font-size:1.7rem;font-weight:700;line-height:1}`,
    `.vs-separator-enhanced{width:40px;position:relative;display:flex;align-items:center;justify-content:center}`,
    `.vs-text{font-size:.65rem;letter-spacing:1px;opacity:.5;background:#2b3d4e;padding:3px 6px;border-radius:6px}`,
    `.probability-display-enhanced{display:flex;flex-direction:column;gap:10px}`,
    `.prob-item-enhanced{display:flex;flex-direction:column;gap:4px}`,
    `.prob-team-info{display:flex;justify-content:space-between;font-size:.65rem;font-weight:600}`,
    `.prob-percentage{font-weight:700}`,
    `.progress-enhanced{height:8px;background:#1e2c38;border:1px solid #2d4252;border-radius:6px;overflow:hidden;position:relative}`,
    `.progress-bar-enhanced{height:100%;background:linear-gradient(90deg,#22c1ff,#1d9fff);box-shadow:0 0 6px rgba(34,193,255,.6) inset;transition:width .4s ease}`,
    `.progress-bar-enhanced.cam-bar{background:linear-gradient(90deg,#ff9944,#ff7b00);box-shadow:0 0 6px rgba(255,153,68,.5) inset}`,
    `.factors-list-enhanced{display:flex;flex-direction:column;gap:10px}`,
    `.factor-item-enhanced{background:#233241;border:1px solid #324554;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}`,
    `.factor-item-enhanced.factor-positive{border-color:#1fa776}`,
    `.factor-item-enhanced.factor-negative{border-color:#c74444}`,
    `.factor-content{display:flex;justify-content:space-between;align-items:center;gap:10px}`,
    `.factor-name-enhanced{font-size:.7rem;font-weight:600;letter-spacing:.3px}`,
    `.impact-badge{display:inline-flex;align-items:center;gap:4px;font-size:.6rem;font-weight:600;padding:4px 8px;border-radius:20px;background:#2d4152;color:#9ec5e2}`,
    `.impact-badge.positive-impact{background:#1d6f53;color:#c4f5e4}`,
    `.impact-badge.negative-impact{background:#7b2b2b;color:#ffe2e2}`,
    `.factor-progress{height:4px;background:#18242f;border-radius:3px;overflow:hidden}`,
    `.factor-bar{height:100%;background:linear-gradient(90deg,#22c1ff,#1d9fff)}`,
    `.factor-bar.positive-bar{background:linear-gradient(90deg,#2dd19d,#1fa776)}`,
    `.factor-bar.negative-bar{background:linear-gradient(90deg,#ff6a6a,#c74444)}`,
    `.match-history-enhanced{display:flex;flex-direction:column;gap:16px}`,
    `.history-title-enhanced{margin:0 0 4px;font-size:.85rem;font-weight:600}`,
    `.history-subtitle{margin:0;font-size:.58rem;letter-spacing:.4px;opacity:.55}`,
    `.history-cards-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}`,
    `.history-card{background:#233241;border:1px solid #314556;border-radius:12px;padding:10px 12px 14px;display:flex;flex-direction:column;gap:8px;position:relative}`,
    `.history-card.xanh-card{border-color:#1c9bff}`,
    `.history-card.cam-card{border-color:#ff8c42}`,
    `.history-card.draws-card{border-color:#9fa6ad}`,
    `.history-card.total-card{border-color:#5c6e7c}`,
    `.card-header-history{display:flex;align-items:center;gap:8px}`,
    `.card-icon-history{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#2b3e4f;border-radius:8px;font-size:14px}`,
    `.stat-display{display:flex;flex-direction:column;gap:4px;align-items:flex-start}`,
    `.stat-number-large{font-size:1.2rem;font-weight:700;line-height:1}`,
    `.stat-percentage{font-size:.6rem;font-weight:600;opacity:.85}`,
    `.stat-label-enhanced{font-size:.55rem;opacity:.6}`,
    /* Balance card styles */
    `.balance-card .card-icon{background:rgba(255,255,255,.08)}`,
    `.balance-meter{display:flex;flex-direction:column;gap:10px}`,
    `.balance-bars{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}`,
    `.balance-side{flex:1;display:flex;flex-direction:column;gap:4px}`,
    `.balance-label{font-size:.55rem;text-transform:uppercase;opacity:.65;font-weight:600;letter-spacing:.5px}`,
    `.balance-bar-wrapper{background:#1e2c38;border:1px solid #2d4252;border-radius:6px;overflow:hidden;height:10px;position:relative}`,
    `.balance-bar{height:100%;background:linear-gradient(90deg,#22c1ff,#1d9fff);transition:width .6s cubic-bezier(.4,.1,.2,1);box-shadow:0 0 5px rgba(34,193,255,.4) inset}`,
    `.balance-bar.cam-bar{background:linear-gradient(90deg,#ff9944,#ff7b00);box-shadow:0 0 5px rgba(255,153,68,.4) inset}`,
    `.balance-center{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 4px}`,
    `.balance-score{font-size:.9rem;font-weight:700;padding:6px 10px;border-radius:10px;background:#2b4152;box-shadow:0 0 0 1px #325066,0 4px 10px -4px rgba(0,0,0,.4)}`,
    `.balance-score.good-balance{background:#1d5f43;color:#c4f5e4}`,
    `.balance-score.poor-balance{background:#7b2b2b;color:#ffe2e2}`,
    `.balance-score-label{font-size:.55rem;opacity:.55;text-transform:uppercase;letter-spacing:.5px}`,
    `.balance-value{font-size:.6rem;font-weight:600;opacity:.8}`,
    `.balance-hint{font-size:.55rem;opacity:.7}`,
    `.balance-hint.good{color:#2dd19d;opacity:.85}`,
    /* Theme toggle */
    `.theme-toggle-btn{position:absolute;top:8px;right:8px;background:#2b3d4e;border:1px solid #3b5364;color:#cdd7e0;font-size:.8rem;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .25s,border-color .25s}`,
    `.theme-toggle-btn:hover{background:#314859}`,
    /* Light theme overrides */
    `.ai-analysis-card.light-theme{background:radial-gradient(circle at 15% 20%,#f2f4f7,#e3e8ec 55%,#d4dbe1);color:#1a2b36;border-color:#b8c4ce}`,
    `.ai-analysis-card.light-theme .prediction-card-enhanced{background:linear-gradient(145deg,#ffffff,#f0f4f7);border-color:#d3dde5;box-shadow:0 4px 10px -4px rgba(0,0,0,.15)}`,
    `.ai-analysis-card.light-theme .history-card{background:#f4f7f9;border-color:#d3dde5}`,
    `.ai-analysis-card.light-theme .formation-team{background:#fff;border-color:#d3dde5}`,
    `.ai-analysis-card.light-theme .progress-enhanced{background:#e2e8ed;border-color:#c8d3db}`,
    `.ai-analysis-card.light-theme .factor-item-enhanced{background:#fff;border-color:#d3dde5}`,
    `.ai-analysis-card.light-theme .impact-badge{background:#e6eef3;color:#3b5364}`,
    `.ai-analysis-card.light-theme .impact-badge.positive-impact{background:#d9f4ec;color:#1d5f43}`,
    `.ai-analysis-card.light-theme .impact-badge.negative-impact{background:#ffe2e2;color:#7b2b2b}`,
    `.ai-analysis-card.light-theme .balance-score{background:#fff;box-shadow:0 0 0 1px #d3dde5}`,
    `.ai-analysis-card.light-theme .theme-toggle-btn{background:#ffffff;border-color:#d3dde5;color:#2b3d4e}`,
    `.ai-analysis-card.light-theme .theme-toggle-btn:hover{background:#eaf0f4}`,
    /* Animations */
    `@keyframes fadeInUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}` ,
    `.prediction-card-enhanced,.history-card,.factor-item-enhanced{animation:fadeInUp .45s ease both}`,
    `@media (max-width:720px){.predictions-grid{grid-template-columns:1fr}}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AIAnalysisComponent {
  @Input() teamA: Player[] = [];
  @Input() teamB: Player[] = [];
  @Input() ai: SimpleAIResult | null = null;
  @Input() isAnalyzing = false;
  @Output() runAnalysis = new EventEmitter<void>();

  trackByFactorName = (_:number, f:{name:string}) => f.name;
  abs(v:number|undefined|null){ return Math.abs(v||0); }
  darkMode = true;

  toggleTheme(){
    this.darkMode = !this.darkMode;
  }

  /**
   * Normalize two raw strength values so their widths sum to 100 (or near) for bar display.
   */
  normalizedStrength(a:number, b:number){
    const safeA = a || 0; const safeB = b || 0; const total = safeA + safeB || 1;
    const xanh = +(safeA / total * 100).toFixed(2);
    const cam = +(safeB / total * 100).toFixed(2);
    return { xanh, cam };
  }
}
