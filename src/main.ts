import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { PerformanceService } from './app/services/performance.service';
import { LazyLoadingService } from './app/services/lazy-loading.service';
import { AssetOptimizationService } from './app/services/asset-optimization.service';

bootstrapApplication(AppComponent, {
  providers: [
    PerformanceService,
    LazyLoadingService,
    AssetOptimizationService
  ]
}).catch(err => {
  console.error('Bootstrap error:', err);
});
