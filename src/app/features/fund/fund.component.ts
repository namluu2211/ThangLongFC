import { Component } from '@angular/core';
@Component({
  selector: 'app-fund',
  template: `
    <div>
      <h3>Quỹ hiện tại</h3>
      <div>Current Fund = Current Fund + Total receive - Total given</div>
      <div style="margin-top:8px;">
        <div>Quỹ hiện tại: <strong>{{currentFund}}</strong></div>
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
