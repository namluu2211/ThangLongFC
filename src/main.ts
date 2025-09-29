import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { PerformanceService } from './app/services/performance.service';
import { LazyLoadingService } from './app/services/lazy-loading.service';
import { AssetOptimizationService } from './app/services/asset-optimization.service';

console.log('🚀 Starting application bootstrap...');

bootstrapApplication(AppComponent, {
  providers: [
    PerformanceService,
    LazyLoadingService,
    AssetOptimizationService
  ]
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
