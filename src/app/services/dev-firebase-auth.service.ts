// 🔧 TEMPORARY DEVELOPMENT AUTH SERVICE
// Use this to test admin functionality while fixing Firebase config

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdminConfig } from '../config/admin.config';

export interface DevAuthUser {
  email: string;
  uid: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class DevFirebaseAuthService {
  private currentUserSubject = new BehaviorSubject<DevAuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Auto-login with first admin for development
    const firstAdmin = AdminConfig.getAdminByEmail('bktientu@gmail.com');
    if (firstAdmin) {
      const devUser: DevAuthUser = {
        email: firstAdmin.email,
        uid: 'dev-user-123',
        isAdmin: true,
        isSuperAdmin: firstAdmin.role === 'superadmin',
        displayName: firstAdmin.displayName
      };
      this.currentUserSubject.next(devUser);
    }
  }

  async signInWithEmail(email: string): Promise<DevAuthUser | null> {
    // Simulate Firebase delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔍 DEV AUTH: Attempting login with email:', email);
    
    // Check if email is in admin list
    const admin = AdminConfig.getAdminByEmail(email);
    if (!admin) {
      throw new Error(`❌ ${email} is not in the admin list. Check admin.config.ts for available admin emails.`);
    }

    // Simulate successful login for admin users
    const devUser: DevAuthUser = {
      email: admin.email,
      uid: `dev-${Date.now()}`,
      isAdmin: true,
      isSuperAdmin: admin.role === 'superadmin',
      displayName: admin.displayName
    };

    this.currentUserSubject.next(devUser);
    console.log('✅ DEV AUTH: Login successful for:', devUser.displayName);
    return devUser;
  }

  async signOut(): Promise<void> {
    this.currentUserSubject.next(null);
    console.log('👋 DEV AUTH: Signed out');
  }

  getCurrentUser(): DevAuthUser | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user ? user.isAdmin : false;
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user ? user.isSuperAdmin : false;
  }

  canWriteToFirebase(): boolean {
    return this.isAdmin();
  }

  getCurrentUserEmail(): string | null {
    const user = this.getCurrentUser();
    return user ? user.email : null;
  }
}