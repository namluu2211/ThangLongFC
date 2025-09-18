import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-fund',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div style="margin-top:8px;">
        <button class="btn" (click)="reset()">Reset Quỹ về 0</button>
      </div>
    </div>
  `
})
export class FundComponent {
  currentFund = Number(localStorage.getItem('CURRENT_FUND') || '0');
  reset() {
    localStorage.setItem('CURRENT_FUND','0');
    this.currentFund = 0;
  }
}
