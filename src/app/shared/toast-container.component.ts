import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-wrapper" *ngIf="messages.length" aria-live="polite" role="status">
      <div *ngFor="let m of messages" class="toast fade" [class.success]="m.type==='success'" [class.error]="m.type==='error'" [class.info]="m.type==='info'">
        <span class="msg">{{ m.text }}</span>
        <button class="close" (click)="dismiss(m.id)" aria-label="Đóng">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-wrapper { position: fixed; top: 12px; right: 12px; display:flex; flex-direction:column; gap:8px; z-index:2000; }
  .toast { display:flex; align-items:center; gap:12px; background:#fff; border-radius:8px; padding:10px 14px; box-shadow:0 4px 14px rgba(0,0,0,0.15); font-size:0.85rem; border-left:4px solid #667eea; min-width:220px; opacity:1; transform:translateY(0); transition:opacity .3s ease, transform .3s ease; }
  .toast.fade { opacity:0; transform:translateY(-6px); animation:toastIn .35s forwards; }
  @keyframes toastIn { to { opacity:1; transform:translateY(0); } }
    .toast.success { border-color:#34a853; }
    .toast.error { border-color:#d93025; }
    .toast.info { border-color:#1e88e5; }
    .toast .close { background:transparent; border:none; font-size:1rem; cursor:pointer; line-height:1; color:#555; }
    .toast .close:hover { color:#000; }
  `]
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  messages: { id: string; text: string; type: string; timeout?: number; }[] = [];

  constructor() {
    this.toastService.messages$.subscribe(list => this.messages = list);
  }

  dismiss(id: string) { this.toastService.dismiss(id); }
}
