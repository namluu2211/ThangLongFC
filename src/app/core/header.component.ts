import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display:flex; align-items:center; gap:8px;">
      <div *ngIf="!loggedIn" class="login">
        <input placeholder="username" [(ngModel)]="username">
        <input placeholder="password" type="password" [(ngModel)]="password">
        <button class="btn" (click)="login()">Đăng Nhập</button>
      </div>
      <div *ngIf="loggedIn" style="display:flex; gap:8px; align-items:center;">
        <div>Xin chào, <strong>{{username}}</strong></div>
        <div class="small">({{role}})</div>
        <button class="btn" (click)="logout()">Đăng xuất</button>
      </div>
    </div>
  `
})
export class HeaderComponent {
  @Output() loginChange = new EventEmitter<any>();
  username = '';
  password = '';
  loggedIn = false;
  role = '';

  // hardcoded hashed passwords (sha256)
  users = [
    { username: 'NamLuu', hash: '351974bb956e55ba2ee5df0be3f502abbec6cc8fdba1d1fb92932ce8a7016c49', role: 'superadmin' },
    { username: 'SyNguyen', hash: 'b9fab45c74254cdbd9e234a1fb5a8db2cf2d5a22ccf9d37bf3659a4b8f402fc3', role: 'admin' }
  ];

  async sha256(str: string) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async login() {
    const h = await this.sha256(this.password || '');
    const u = this.users.find(x => x.username === this.username && x.hash === h);
    if (u) {
      this.loggedIn = true;
      this.role = u.role;
      localStorage.setItem('thang_user', JSON.stringify({ username: this.username, role: this.role }));
      localStorage.setItem('role', this.role); // Ensure 'role' is set for history delete
      this.loginChange.emit({ loggedIn: true, role: this.role });
      this.password = '';
    } else {
      alert('Đăng nhập thất bại');
    }
  }

  logout() {
    this.loggedIn = false;
    this.username = '';
    this.role = '';
    localStorage.removeItem('thang_user');
    this.loginChange.emit({ loggedIn: false, role: '' });
  }
}
