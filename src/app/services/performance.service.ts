import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface PerformanceMetrics {
  initialLoadTime: number;
  componentLoadTimes: Map<string, number>;
  memoryUsage: number;
  networkRequests: number;
  cacheHitRate: number;
  bundleSizes: Map<string, number>;
  renderingTime: number;
  interactionLatency: number;
}

interface ComponentMetrics {
  name: string;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metrics: PerformanceMetrics;
  private componentMetrics: ComponentMetrics[] = [];
  private performanceEntries: PerformanceEntry[] = [];
  
  // Observable for real-time performance monitoring
  private metricsSubject = new BehaviorSubject<PerformanceMetrics | null>(null);
  public metrics$ = this.metricsSubject.asObservable();

  // Performance observer for detailed monitoring
  private observer: PerformanceObserver | null = null;
  
  // Timer management to prevent memory leaks
  private timers = new Set<ReturnType<typeof setInterval>>();
  private isDestroyed = false;

  constructor() {
    this.metrics = {
      initialLoadTime: 0,
      componentLoadTimes: new Map(),
      memoryUsage: 0,
      networkRequests: 0,
      cacheHitRate: 0,
      bundleSizes: new Map(),
      renderingTime: 0,
      interactionLatency: 0
    };

    // Significantly delay initialization to prevent startup blocking
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.initializePerformanceMonitoring();
      }
    }, 15000); // Increased to 15 seconds
  }

  // Timer management methods
  private addTimer(timerId: ReturnType<typeof setInterval>): void {
    this.timers.add(timerId);
  }

  private clearAllTimers(): void {
    this.timers.forEach(timerId => clearInterval(timerId));
    this.timers.clear();
  }

  private initializePerformanceMonitoring(): void {
    // Start timing application load
    this.startTiming('app-init');

    // Monitor performance entries
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          this.performanceEntries.push(...list.getEntries());
          this.updateMetrics();
        });

        // Observe different types of performance entries
        this.observer.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'paint', 'largest-contentful-paint'] 
        });
      } catch (error) {
        console.warn('⚠️ PerformanceObserver not fully supported:', error);
      }
    }

    // Monitor memory usage if available
    this.startMemoryMonitoring();

    // Monitor network requests
    this.startNetworkMonitoring();

    // Set up periodic metrics updates with minimal frequency
    this.addTimer(setInterval(() => {
      if (!this.isDestroyed) {
        this.throttledUpdateMetrics();
      }
    }, 120000)); // Further reduced to 2 minutes
  }

  // Component lifecycle tracking
  startComponentLoad(componentName: string): string {
    const measureId = `component-${componentName}-${Date.now()}`;
    performance.mark(`${measureId}-start`);
    return measureId;
  }

  endComponentLoad(measureId: string, componentName: string): void {
    const endMark = `${measureId}-end`;
    performance.mark(endMark);
    
    try {
      performance.measure(measureId, `${measureId}-start`, endMark);
      
      const measure = performance.getEntriesByName(measureId)[0];
      if (measure) {
        this.metrics.componentLoadTimes.set(componentName, measure.duration);
        
        // Store detailed component metrics
        this.componentMetrics.push({
          name: componentName,
          loadTime: measure.duration,
          renderTime: 0, // Will be updated by render tracking
          memoryUsage: this.getCurrentMemoryUsage(),
          timestamp: Date.now()
        });

        console.log(`⚡ Component ${componentName} loaded in ${measure.duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not measure ${componentName} load time:`, error);
    }
  }

  // General timing utilities
  startTiming(label: string): void {
    performance.mark(`${label}-start`);
  }

  endTiming(label: string): number {
    const endMark = `${label}-end`;
    performance.mark(endMark);
    
    try {
      performance.measure(label, `${label}-start`, endMark);
      const measure = performance.getEntriesByName(label)[0];
      return measure ? measure.duration : 0;
    } catch (error) {
      console.warn(`⚠️ Could not measure ${label}:`, error);
      return 0;
    }
  }

  // Memory monitoring
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      };

      updateMemory();
      this.addTimer(setInterval(() => {
        if (!this.isDestroyed) {
          updateMemory();
        }
      }, 60000)); // Reduced to every 60 seconds
    }
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Network monitoring
  private startNetworkMonitoring(): void {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    let requestCount = 0;

    window.fetch = async (...args) => {
      requestCount++;
      this.metrics.networkRequests = requestCount;
      
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        console.log(`🌐 Network request completed in ${(endTime - startTime).toFixed(2)}ms:`, args[0]);
        return response;
      } catch (error) {
        const endTime = performance.now();
        console.warn(`❌ Network request failed after ${(endTime - startTime).toFixed(2)}ms:`, args[0], error);
        throw error;
      }
    };
  }

  // Bundle size analysis
  analyzeBundleSize(): Promise<Map<string, number>> {
    return new Promise((resolve) => {
      // Analyze loaded scripts
      const scripts = document.querySelectorAll('script[src]');
      const promises: Promise<void>[] = [];
      const sizes = new Map<string, number>();

      scripts.forEach(script => {
        const src = (script as HTMLScriptElement).src;
        if (src) {
          const promise = fetch(src, { method: 'HEAD' })
            .then(response => {
              const size = parseInt(response.headers.get('content-length') || '0');
              if (size > 0) {
                const filename = src.split('/').pop() || src;
                sizes.set(filename, size);
              }
            })
            .catch((error: Error) => {
              console.debug('Cross-origin resource size check failed:', error.message);
            });
          
          promises.push(promise);
        }
      });

      Promise.allSettled(promises).then(() => {
        this.metrics.bundleSizes = sizes;
        resolve(sizes);
      });
    });
  }

  // Core Web Vitals
  measureCoreWebVitals(): Promise<{
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  }> {
    return new Promise((resolve) => {
      const vitals = { fcp: 0, lcp: 0, fid: 0, cls: 0 };

      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        vitals.fcp = fcpEntry.startTime;
      }

      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay would need event listener setup
          // Cumulative Layout Shift would need layout-shift observation
          
          setTimeout(() => {
            lcpObserver.disconnect();
            resolve(vitals);
          }, 5000);
        } catch {
          resolve(vitals);
        }
      } else {
        resolve(vitals);
      }
    });
  }

  // Performance recommendations
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check component load times
    const slowComponents = Array.from(this.metrics.componentLoadTimes.entries())
      .filter(([, time]) => time > 100); // Components taking >100ms
    
    if (slowComponents.length > 0) {
      recommendations.push(`Optimize slow-loading components: ${slowComponents.map(([name]) => name).join(', ')}`);
    }

    // Check memory usage
    if (this.metrics.memoryUsage > 50) { // >50MB
      recommendations.push('High memory usage detected. Consider component cleanup and memory leaks.');
    }

    // Check bundle sizes
    const largeBundles = Array.from(this.metrics.bundleSizes.entries())
      .filter(([, size]) => size > 500000); // >500KB
    
    if (largeBundles.length > 0) {
      recommendations.push(`Large bundles detected: ${largeBundles.map(([name]) => name).join(', ')}. Consider code splitting.`);
    }

    // Check network requests
    if (this.metrics.networkRequests > 20) {
      recommendations.push('High number of network requests. Consider bundling or caching strategies.');
    }

    return recommendations;
  }

  // Update metrics periodically
  private updateMetrics(): void {
    // Update navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.initialLoadTime = navigation.loadEventEnd - navigation.fetchStart;
    }

    // Update paint timing - calculate rendering duration, not absolute time
    const paintEntries = performance.getEntriesByType('paint');
    let fcpTime = 0;
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        fcpTime = entry.startTime;
      }
    });
    
    // Calculate rendering time as duration from navigation start
    if (navigation && fcpTime > 0) {
      this.metrics.renderingTime = fcpTime - navigation.fetchStart;
    } else if (fcpTime > 0) {
      // Fallback: limit to reasonable values
      this.metrics.renderingTime = Math.min(fcpTime, 5000); // Cap at 5 seconds
    }

    // Emit updated metrics
    this.metricsSubject.next({ ...this.metrics });
  }

  // Get current metrics snapshot
  getCurrentMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  // Get component performance report
  getComponentReport(): ComponentMetrics[] {
    return [...this.componentMetrics].sort((a, b) => b.loadTime - a.loadTime);
  }

  // Performance logging
  logPerformanceReport(): void {
    console.group('📊 Performance Report');
    
    const metrics = this.getCurrentMetrics();
    console.log('🚀 Initial Load Time:', `${metrics.initialLoadTime.toFixed(2)}ms`);
    console.log('💾 Memory Usage:', `${metrics.memoryUsage.toFixed(2)}MB`);
    console.log('🌐 Network Requests:', metrics.networkRequests);
    
    if (metrics.componentLoadTimes.size > 0) {
      console.log('🔧 Component Load Times:');
      metrics.componentLoadTimes.forEach((time, component) => {
        console.log(`  ${component}: ${time.toFixed(2)}ms`);
      });
    }

    const recommendations = this.getPerformanceRecommendations();
    if (recommendations.length > 0) {
      console.log('💡 Recommendations:');
      recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    console.groupEnd();
  }

  // Memory management and optimization
  optimizeMemoryUsage(): void {
    // Limit stored metrics to prevent memory leaks
    if (this.componentMetrics.length > 100) {
      this.componentMetrics = this.componentMetrics.slice(-50);
    }
    
    if (this.performanceEntries.length > 200) {
      this.performanceEntries = this.performanceEntries.slice(-100);
    }
    
    // Clear old component load times
    if (this.metrics.componentLoadTimes.size > 50) {
      const entries = Array.from(this.metrics.componentLoadTimes.entries());
      this.metrics.componentLoadTimes.clear();
      entries.slice(-25).forEach(([key, value]) => {
        this.metrics.componentLoadTimes.set(key, value);
      });
    }
    
    // Force garbage collection if available (browser dev mode)
    const globalWindow = window as typeof window & { gc?: () => void };
    if (globalWindow.gc && typeof globalWindow.gc === 'function') {
      globalWindow.gc();
    }
  }

  // Throttled performance updates to reduce overhead
  private throttledUpdateMetrics = this.throttle(() => {
    this.updateMetrics();
    this.optimizeMemoryUsage();
  }, 1000);
  
  private throttle<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return ((...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }

  // Cleanup
  destroy(): void {
    this.isDestroyed = true;
    this.clearAllTimers();
    
    if (this.observer) {
      this.observer.disconnect();
    }
    this.metricsSubject.complete();
    this.componentMetrics = [];
    this.performanceEntries = [];
    this.metrics.componentLoadTimes.clear();
    this.metrics.bundleSizes.clear();
  }
}