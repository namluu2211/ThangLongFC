// 🛡️ Admin Configuration for ThangLong FC
// This file centralizes all admin access control rules

export interface AdminUser {
  email: string;
  username: string;
  displayName: string;
  role: 'superadmin' | 'admin';
  permissions: string[];
}

// 👥 Admin Users Configuration
export const ADMIN_USERS: AdminUser[] = [
  {
    email: 'bktientu@gmail.com',
    username: 'NamLuu',
    displayName: 'Nam Lưu',
    role: 'superadmin',
    permissions: ['read', 'write', 'delete', 'admin_panel', 'user_management']
  },
  {
    email: 'nguyenthuysy@gmail.com', 
    username: 'SyNguyen',
    displayName: 'Sy Nguyễn',
    role: 'admin',
    permissions: ['read', 'write', 'admin_panel']
  },
  {
    email: 'hanguyen@thanglongfc.com',
    username: 'HaNguyen', 
    displayName: 'Hà Nguyễn',
    role: 'admin',
    permissions: ['read', 'write', 'admin_panel']
  },
  {
    email: 'hieunguyen@thanglongfc.com',
    username: 'HieuNguyen',
    displayName: 'Hiếu Nguyễn', 
    role: 'admin',
    permissions: ['read', 'write', 'admin_panel']
  }
];

// 📧 Quick lookup arrays for Firebase rules
export const ADMIN_EMAILS = ADMIN_USERS.map(user => user.email);
export const SUPER_ADMIN_EMAILS = ADMIN_USERS.filter(user => user.role === 'superadmin').map(user => user.email);

// 🎯 Helper Functions
export class AdminConfig {
  
  // Check if email is admin
  static isAdminEmail(email: string): boolean {
    return ADMIN_EMAILS.includes(email);
  }

  // Check if email is super admin
  static isSuperAdminEmail(email: string): boolean {
    return SUPER_ADMIN_EMAILS.includes(email);
  }

  // Get admin user by email
  static getAdminByEmail(email: string): AdminUser | null {
    return ADMIN_USERS.find(user => user.email === email) || null;
  }

  // Check if user has specific permission
  static hasPermission(userEmail: string, permission: string): boolean {
    const user = this.getAdminByEmail(userEmail);
    return user ? user.permissions.includes(permission) : false;
  }

  // Generate Firebase Security Rules (for reference - use scripts/generate-firebase-rules.js for production)
  static generateFirebaseRules(): object {
    const emailList = ADMIN_EMAILS.map(email => `auth.token.email == '${email}'`).join(' || ');
    
    return {
      "rules": {
        ".read": true,
        "matchResults": {
          ".write": `auth != null && (${emailList})`
        },
        "playerStats": {
          ".write": `auth != null && (${emailList})`
        },
        "history": {
          ".write": `auth != null && (${emailList})`
        }
      }
    };
  }

  // Get formatted rules for Firebase Console (for reference - use npm run firebase:rules for production)
  static getFirebaseRulesString(): string {
    return JSON.stringify(this.generateFirebaseRules(), null, 2);
  }
}

// 📋 Export commonly used lists
export {
  ADMIN_EMAILS as adminEmails,
  SUPER_ADMIN_EMAILS as superAdminEmails
};