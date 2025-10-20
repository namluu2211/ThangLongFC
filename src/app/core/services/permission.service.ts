import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthState {
  loggedIn: boolean;
  role: string; // '', 'viewer', 'admin', 'superadmin'
  email?: string | null;
}

export interface PermissionSnapshot {
  canEdit: boolean;
  role: string;
  loggedIn: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private authState$ = new BehaviorSubject<AuthState>({ loggedIn: false, role: '' });
  private canEdit$ = new BehaviorSubject<boolean>(false);
  private snapshot: PermissionSnapshot = { canEdit: false, role: '', loggedIn: false };

  authChanges(): Observable<AuthState> { return this.authState$.asObservable(); }
  canEditChanges(): Observable<boolean> { return this.canEdit$.asObservable(); }
  getCurrent(): PermissionSnapshot { return this.snapshot; }

  setAuthState(state: AuthState) {
    this.authState$.next(state);
    const canEdit = state.loggedIn && (state.role === 'admin' || state.role === 'superadmin');
    this.canEdit$.next(canEdit);
    this.snapshot = { canEdit, role: state.role, loggedIn: state.loggedIn };
    try {
      if (state.role) localStorage.setItem('role', state.role); else localStorage.removeItem('role');
    } catch { /* ignore storage errors */ }
  }
}
