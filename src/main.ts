import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from './environments/environment';

console.log('🚀 Starting application bootstrap...');

// Check if Firebase config is valid (not placeholder values)
const isFirebaseConfigValid = environment.firebase.databaseURL && 
                              environment.firebase.projectId && 
                              !environment.firebase.apiKey.includes('fake') &&
                              !environment.firebase.databaseURL.includes('placeholder');

console.log('Firebase config valid:', isFirebaseConfigValid);
console.log('Database URL:', environment.firebase.databaseURL);

// Create providers array
const providers = [
  importProvidersFrom(CommonModule, FormsModule)
];

// Only add Firebase providers if config is valid
if (isFirebaseConfigValid) {
  console.log('✅ Firebase enabled - services will initialize automatically');
} else {
  console.log('⚠️ Firebase config needs updating - check environment files');
}

bootstrapApplication(AppComponent, {
  providers: providers
}).then(() => {
  console.log('✅ Application bootstrap successful');
  // Remove loading screen if it exists
  const loadingScreen = document.querySelector('.app-loading');
  if (loadingScreen) {
    loadingScreen.remove();
  }
}).catch(err => {
  console.error('❌ Bootstrap error:', err);
  console.error('Error details:', err.message);
  console.error('Stack trace:', err.stack);
  
  // Show detailed error in the UI
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <h1>⚠️ Application Bootstrap Failed</h1>
      <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; margin: 20px 0; max-width: 600px;">
        <h3>Error Details:</h3>
        <pre style="text-align: left; overflow-x: auto; font-size: 14px;">${err.message}</pre>
      </div>
      <p>Please check the browser console for more details.</p>
      <button onclick="location.reload()" style="
        background: white;
        color: #dc2626;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 20px;
      ">Reload Application</button>
    </div>
  `;
});
