import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  networkLatency: number;
  cacheHitRatio: number;
}

export interface OptimizationReport {
  timestamp: Date;
  metrics: PerformanceMetrics;
  recommendations: string[];
  score: number; // 0-100
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metricsSubject = new BehaviorSubject<PerformanceMetrics | null>(null);
  public metrics$ = this.metricsSubject.asObservable();

  private startTime = performance.now();
  private renderStartTime = 0;
  private cacheHits = 0;
  private cacheTotal = 0;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Monitor page load performance
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.collectMetrics();
        }, 1000);
      });

      // Monitor network performance
      this.monitorNetworkPerformance();
      
      // Monitor memory usage
      this.monitorMemoryUsage();
    }
  }

  startRenderTimer() {
    this.renderStartTime = performance.now();
  }

  endRenderTimer(): number {
    if (this.renderStartTime > 0) {
      const renderTime = performance.now() - this.renderStartTime;
      this.renderStartTime = 0;
      return renderTime;
    }
    return 0;
  }

  recordCacheHit(isHit: boolean) {
    this.cacheTotal++;
    if (isHit) {
      this.cacheHits++;
    }
  }

  private async collectMetrics() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
      const renderTime = paintEntries.length > 0 ? paintEntries[0].startTime : 0;
      
      const memoryUsage = await this.getMemoryUsage();
      const networkLatency = await this.measureNetworkLatency();
      const bundleSize = await this.getBundleSize();
      const cacheHitRatio = this.cacheTotal > 0 ? (this.cacheHits / this.cacheTotal) * 100 : 0;

      const metrics: PerformanceMetrics = {
        loadTime,
        renderTime,
        bundleSize,
        memoryUsage,
        networkLatency,
        cacheHitRatio
      };

      this.metricsSubject.next(metrics);
      
      console.log('📊 Performance Metrics:', metrics);
      
    } catch (error) {
      console.error('❌ Failed to collect performance metrics:', error);
    }
  }

  private async getMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    return 0;
  }

  private async measureNetworkLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      await fetch('/assets/favicon.ico', { method: 'HEAD' });
      return performance.now() - startTime;
    } catch (error) {
      return 0;
    }
  }

  private async getBundleSize(): Promise<number> {
    try {
      const resources = performance.getEntriesByType('resource');
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') && resource.name.includes('main')
      );
      
      let totalSize = 0;
      jsResources.forEach(resource => {
        if ('transferSize' in resource) {
          totalSize += (resource as any).transferSize;
        }
      });
      
      return totalSize / 1024; // Convert to KB
    } catch (error) {
      return 0;
    }
  }

  private monitorNetworkPerformance() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      console.log('📡 Network Info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });
    }
  }

  private monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
        
        if (usedMemoryMB > 50) { // Alert if using more than 50MB
          console.warn('⚠️ High memory usage:', usedMemoryMB.toFixed(2), 'MB');
        }
      }, 30000); // Check every 30 seconds
    }
  }

  generateOptimizationReport(): OptimizationReport {
    const currentMetrics = this.metricsSubject.value;
    
    if (!currentMetrics) {
      return {
        timestamp: new Date(),
        metrics: {
          loadTime: 0,
          renderTime: 0,
          bundleSize: 0,
          memoryUsage: 0,
          networkLatency: 0,
          cacheHitRatio: 0
        },
        recommendations: ['Chưa có dữ liệu performance để phân tích'],
        score: 0
      };
    }

    const recommendations: string[] = [];
    let score = 100;

    // Load time analysis
    if (currentMetrics.loadTime > 3000) {
      recommendations.push('🐌 Thời gian tải trang > 3s - Cần tối ưu bundle size và lazy loading');
      score -= 20;
    }

    // Render time analysis
    if (currentMetrics.renderTime > 1000) {
      recommendations.push('🎨 Thời gian render > 1s - Cần tối ưu component rendering');
      score -= 15;
    }

    // Bundle size analysis
    if (currentMetrics.bundleSize > 500) {
      recommendations.push('📦 Bundle size > 500KB - Cần code splitting và tree shaking');
      score -= 15;
    }

    // Memory usage analysis
    if (currentMetrics.memoryUsage > 30) {
      recommendations.push('💾 Memory usage > 30MB - Cần tối ưu memory leaks');
      score -= 10;
    }

    // Network latency analysis
    if (currentMetrics.networkLatency > 200) {
      recommendations.push('📡 Network latency > 200ms - Cần tối ưu API calls');
      score -= 10;
    }

    // Cache hit ratio analysis
    if (currentMetrics.cacheHitRatio < 80) {
      recommendations.push('📋 Cache hit ratio < 80% - Cần tối ưu caching strategy');
      score -= 10;
    }

    // Positive recommendations
    if (score > 90) {
      recommendations.push('🚀 Performance tuyệt vời! Ứng dụng đã được tối ưu tốt');
    } else if (score > 70) {
      recommendations.push('✅ Performance khá tốt, một vài điểm cần cải thiện');
    } else {
      recommendations.push('⚠️ Performance cần được cải thiện đáng kể');
    }

    return {
      timestamp: new Date(),
      metrics: currentMetrics,
      recommendations,
      score: Math.max(0, score)
    };
  }

  // Real-time monitoring alerts
  startRealtimeMonitoring() {
    setInterval(() => {
      const currentMetrics = this.metricsSubject.value;
      if (currentMetrics) {
        this.checkPerformanceThresholds(currentMetrics);
      }
    }, 10000); // Check every 10 seconds
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics) {
    // Alert for high memory usage
    if (metrics.memoryUsage > 50) {
      console.warn('🚨 High memory usage detected:', metrics.memoryUsage.toFixed(2), 'MB');
    }

    // Alert for slow render times
    if (metrics.renderTime > 2000) {
      console.warn('🚨 Slow rendering detected:', metrics.renderTime.toFixed(2), 'ms');
    }

    // Alert for poor cache performance
    if (metrics.cacheHitRatio < 50) {
      console.warn('🚨 Poor cache performance:', metrics.cacheHitRatio.toFixed(2), '%');
    }
  }

  // Performance optimization utilities
  optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy';
      }
      if (!img.decoding) {
        img.decoding = 'async';
      }
    });
    console.log('🖼️ Optimized', images.length, 'images for lazy loading');
  }

  preloadCriticalResources() {
    const criticalResources = [
      '/assets/images/ThangLong_FC.jpg',
      // Add other critical resources
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = resource;
      document.head.appendChild(link);
    });

    console.log('⚡ Preloaded', criticalResources.length, 'critical resources');
  }

  // Export performance data
  exportPerformanceData(): string {
    const report = this.generateOptimizationReport();
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
      userAgent: navigator.userAgent,
      report
    }, null, 2);
  }
}