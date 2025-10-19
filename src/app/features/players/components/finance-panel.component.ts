import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-finance-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="thu-chi-section">
    <h3><i class="fas fa-coins me-2"></i>Thu / Chi Trận Đấu</h3>
    <div class="thu-chi-grid">
      <div class="finance-section revenue-section">
        <div class="section-title">Thu</div>
        <input type="number" class="finance-input" [(ngModel)]="thu" (change)="thuChange.emit(thu)" placeholder="Tổng thu" min="0" />
      </div>
      <div class="finance-section expenses-section">
        <div class="section-title">Chi (Tổng)</div>
        <input type="number" class="finance-input" [(ngModel)]="chi_total" (change)="chiTotalChange.emit(chi_total)" placeholder="Tổng chi" min="0" />
        <div class="finance-summary mt-3">
          <div class="summary-row"><span class="summary-label">Nước</span><input type="number" [(ngModel)]="chi_nuoc" (change)="chiNuocChange.emit(chi_nuoc)" class="finance-input" placeholder="0" min="0" /></div>
          <div class="summary-row"><span class="summary-label">Sân</span><input type="number" [(ngModel)]="chi_san" (change)="chiSanChange.emit(chi_san)" class="finance-input" placeholder="0" min="0" /></div>
          <div class="summary-row"><span class="summary-label">Trọng tài</span><input type="number" [(ngModel)]="chi_trongtai" (change)="chiTrongTaiChange.emit(chi_trongtai)" class="finance-input" placeholder="0" min="0" /></div>
        </div>
      </div>
      <div class="finance-section summary-section">
        <div class="section-title">Tóm tắt</div>
        <div class="finance-summary">
          <div class="summary-row"><span class="summary-label">Thu</span><span class="summary-value positive">{{thu | number}}</span></div>
          <div class="summary-row"><span class="summary-label">Chi</span><span class="summary-value negative">{{chi_total | number}}</span></div>
          <div class="summary-row total"><span class="summary-label">Lợi nhuận</span><span class="summary-value" [class.positive]="(thu - chi_total) >= 0" [class.negative]="(thu - chi_total) < 0">{{(thu - chi_total) | number}}</span></div>
        </div>
      </div>
    </div>
  </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancePanelComponent {
  @Input() thu = 0;
  @Input() chi_total = 0;
  @Input() chi_nuoc = 0;
  @Input() chi_san = 0;
  @Input() chi_trongtai = 0;
  @Output() thuChange = new EventEmitter<number>();
  @Output() chiTotalChange = new EventEmitter<number>();
  @Output() chiNuocChange = new EventEmitter<number>();
  @Output() chiSanChange = new EventEmitter<number>();
  @Output() chiTrongTaiChange = new EventEmitter<number>();
}
