import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

console.log('🔥 BOOTSTRAP: Starting application...');

bootstrapApplication(AppComponent)
  .then(() => {
    console.log('✅ BOOTSTRAP: App started successfully!');
  })
  .catch(err => {
    console.error('❌ BOOTSTRAP ERROR:', err);
  });
