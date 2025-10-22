import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
  createdAt: number;
  autoCloseMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messagesSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  show(text: string, type: ToastMessage['type'] = 'info', autoCloseMs = 4000): string {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const message: ToastMessage = { id, type, text, createdAt: Date.now(), autoCloseMs };
    const list = [...this.messagesSubject.value, message];
    this.messagesSubject.next(list);
    if (autoCloseMs > 0) {
      setTimeout(() => this.dismiss(id), autoCloseMs);
    }
    return id;
  }

  success(text: string, autoCloseMs?: number) { return this.show(text, 'success', autoCloseMs); }
  error(text: string, autoCloseMs?: number) { return this.show(text, 'error', autoCloseMs); }
  info(text: string, autoCloseMs?: number) { return this.show(text, 'info', autoCloseMs); }
  warning(text: string, autoCloseMs?: number) { return this.show(text, 'warning', autoCloseMs); }

  dismiss(id: string) {
    const filtered = this.messagesSubject.value.filter(m => m.id !== id);
    this.messagesSubject.next(filtered);
  }

  clear() { this.messagesSubject.next([]); }
}