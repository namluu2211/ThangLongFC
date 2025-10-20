import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
  timeout?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _messages$ = new BehaviorSubject<ToastMessage[]>([]);
  readonly messages$ = this._messages$.asObservable();
  readonly maxToasts = 5;

  show(text: string, type: ToastMessage['type']='info', timeout=3000) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const msg: ToastMessage = { id, text, type, timeout };
  const current = [...this._messages$.value, msg];
  // Enforce max count by removing oldest
  while (current.length > this.maxToasts) current.shift();
  this._messages$.next(current);
    if (timeout > 0) {
      setTimeout(() => this.dismiss(id), timeout);
    }
  }

  success(text: string, timeout=2500) { this.show(text, 'success', timeout); }
  error(text: string, timeout=4000) { this.show(text, 'error', timeout); }
  info(text: string, timeout=3000) { this.show(text, 'info', timeout); }

  dismiss(id: string) {
    this._messages$.next(this._messages$.value.filter(m => m.id !== id));
  }

  clear() { this._messages$.next([]); }
}
