import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NAV_LINKS, NavLink } from './navigation-links';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="app-footer">
      <div class="footer-container">
        <div class="footer-content">
          <!-- Logo and Brand -->
          <div class="footer-brand">
            <div class="footer-logo">
              <i class="fas fa-futbol"></i>
              <span class="logo-text">ThangLong FC</span>
            </div>
            <p class="brand-description">
              Mia Football Club Management System
            </p>
          </div>

          <!-- Quick Links -->
          <div class="footer-links">
            <h4>Liên kết nhanh</h4>
            <ul>
              <li *ngFor="let link of navLinks">
                <a [routerLink]="link.path" routerLinkActive="active" [routerLinkActiveOptions]="link.exact ? { exact: true } : {}">
                  <i *ngIf="link.icon" [class]="link.icon" class="me-1"></i>
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div class="footer-contact">
            <h4>Liên hệ</h4>
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <span>bktientu@gmail.com</span>
            </div>
            <div class="contact-item">
              <i class="fab fa-phone"></i>
                +84.913.933.835
            </div>
          </div>

          <!-- Tech Stack -->
          <div class="footer-tech">
            <h4>Công nghệ</h4>
            <div class="tech-stack">
              <span class="tech-item">Angular 20</span>
              <span class="tech-item">Firebase</span>
              <span class="tech-item">TypeScript</span>
            </div>
          </div>
        </div>

        <!-- Copyright Bar -->
        <div class="footer-bottom">
          <div class="copyright">
            <p>
              © 2025 <strong>Nam Luu</strong>. All rights reserved.
              <span class="divider">|</span>
              Made with <i class="fas fa-heart"></i> for ThangLong FC
            </p>
          </div>
          <div class="footer-version">
            <span>v{{ getVersion() }}</span>
            <span class="divider">|</span>
            <span>Build {{ getBuildDate() }}</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      margin-top: auto;
      border-top: 4px solid #3498db;
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px 0;
    }

    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }

    .footer-brand {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .footer-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .footer-logo i {
      color: #3498db;
      font-size: 2rem;
    }

    .logo-text {
      background: linear-gradient(45deg, #3498db, #00bcd4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .brand-description {
      color: #bdc3c7;
      margin: 0;
      font-style: italic;
    }

    .footer-links h4,
    .footer-contact h4,
    .footer-tech h4 {
      color: #3498db;
      margin: 0 0 15px 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .footer-links ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-links li {
      margin-bottom: 8px;
    }

    .footer-links a {
      color: #ecf0f1;
      text-decoration: none;
      transition: color 0.3s ease;
      font-size: 0.95rem;
    }

    .footer-links a:hover {
      color: #3498db;
    }

    .footer-links a.active {
      color: #3498db;
      font-weight: 600;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      font-size: 0.95rem;
    }

    .contact-item i {
      color: #3498db;
      width: 16px;
    }

    .contact-item a {
      color: #ecf0f1;
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .contact-item a:hover {
      color: #3498db;
    }

    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tech-item {
      background: rgba(52, 152, 219, 0.2);
      color: #3498db;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid rgba(52, 152, 219, 0.3);
    }

    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 20px;
    }

    .copyright p {
      margin: 0;
      font-size: 0.9rem;
      color: #bdc3c7;
    }

    .copyright strong {
      color: #3498db;
      font-weight: 600;
    }

    .copyright .fa-heart {
      color: #e74c3c;
      animation: heartbeat 1.5s ease-in-out infinite;
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .footer-version {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #95a5a6;
    }

    .divider {
      color: #7f8c8d;
      margin: 0 8px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .footer-content {
        grid-template-columns: 1fr;
        gap: 25px;
      }

      .footer-bottom {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }

      .footer-version {
        justify-content: center;
      }

      .tech-stack {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .footer-container {
        padding: 30px 15px 0;
      }

      .footer-logo {
        font-size: 1.3rem;
      }

      .footer-logo i {
        font-size: 1.8rem;
      }
    }
  `]
})
export class FooterComponent {
  navLinks: NavLink[] = NAV_LINKS;
  getVersion(): string {
    return '1.0.0';
  }

  getBuildDate(): string {
    return new Date().toLocaleDateString('vi-VN');
  }
}