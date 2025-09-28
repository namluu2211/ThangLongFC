import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  Auth,
  UserCredential 
} from 'firebase/auth';
import { firebaseConfig } from '../config/firebase.config';
import { ADMIN_USERS, AdminUser } from '../config/admin.config';

export interface AdminSetupResult {
  success: boolean;
  message: string;
  email: string;
  created?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAdminSetupService {
  private app = initializeApp(firebaseConfig);
  private auth: Auth = getAuth(this.app);

  constructor() {}

  /**
   * Create Firebase Authentication users for all configured admins
   * This should be run once during initial setup
   */
  async createAllAdminUsers(defaultPassword: string = 'ThangLongFC2024!'): Promise<AdminSetupResult[]> {
    console.log('🚀 Creating Firebase Authentication users for all admins...');
    
    const results: AdminSetupResult[] = [];
    
    for (const admin of ADMIN_USERS) {
      try {
        const result = await this.createAdminUser(admin.email, defaultPassword);
        results.push(result);
        
        // Wait a bit between creations to avoid rate limiting
        await this.delay(1000);
      } catch (error: any) {
        console.error(`❌ Error creating user ${admin.email}:`, error);
        results.push({
          success: false,
          message: `Error: ${error.message}`,
          email: admin.email,
          created: false
        });
      }
    }
    
    return results;
  }

  /**
   * Create a single Firebase Authentication user
   */
  async createAdminUser(email: string, password: string): Promise<AdminSetupResult> {
    try {
      console.log(`📧 Creating Firebase user: ${email}`);
      
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      console.log(`✅ Successfully created user: ${email}`, userCredential.user.uid);
      
      return {
        success: true,
        message: `User created successfully with UID: ${userCredential.user.uid}`,
        email: email,
        created: true
      };
      
    } catch (error: any) {
      console.error(`❌ Failed to create user ${email}:`, error);
      
      let message = 'Unknown error';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'User already exists - this is OK!';
          return {
            success: true,
            message: message,
            email: email,
            created: false
          };
        case 'auth/weak-password':
          message = 'Password is too weak (minimum 6 characters)';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email format';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/Password authentication is not enabled in Firebase Console';
          break;
        default:
          message = error.message;
      }
      
      return {
        success: false,
        message: message,
        email: email,
        created: false
      };
    }
  }

  /**
   * Test login with an admin user
   */
  async testAdminLogin(email: string, password: string): Promise<AdminSetupResult> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      return {
        success: true,
        message: `Login successful! UID: ${userCredential.user.uid}`,
        email: email
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: `Login failed: ${error.message}`,
        email: email
      };
    }
  }

  /**
   * Get list of all configured admin emails
   */
  getConfiguredAdmins(): AdminUser[] {
    return ADMIN_USERS;
  }

  /**
   * Generate setup instructions
   */
  getSetupInstructions(): string {
    return `
🚀 Firebase Admin Setup Instructions:

1. MANUAL SETUP (Recommended):
   - Go to Firebase Console → Authentication → Users
   - Click "Add user" and create accounts for:
     ${ADMIN_USERS.map(user => `   • ${user.email} (${user.displayName} - ${user.role})`).join('\n')}
   
2. AUTOMATIC SETUP (Development only):
   - Use the Admin Setup Panel in your app
   - Click "Create All Firebase Users"
   - Default password: "ThangLongFC2024!"
   
3. SECURITY:
   - Change passwords after creation
   - Enable 2FA in production
   - Monitor authentication logs

📧 Configured Admins:
${ADMIN_USERS.map(user => 
  `• ${user.displayName} (${user.email})
    Role: ${user.role}
    Permissions: ${user.permissions.join(', ')}`
).join('\n\n')}
    `;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}