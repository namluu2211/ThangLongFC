import { Injectable } from '@angular/core';

interface AssetMetrics {
  totalImages: number;
  totalSize: number;
  loadedCount: number;
  failedCount: number;
  averageLoadTime: number;
  cacheHitRate: number;
}



@Injectable({
  providedIn: 'root'
})
export class AssetOptimizationService {
  private imageCache = new Map<string, HTMLImageElement>();
  private assetMetrics: AssetMetrics = {
    totalImages: 0,
    totalSize: 0,
    loadedCount: 0,
    failedCount: 0,
    averageLoadTime: 0,
    cacheHitRate: 0
  };
  
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private optimizationQueue: string[] = [];
  private preloadedAssets = new Set<string>();

  constructor() {
    this.initializeAssetOptimization();
  }

  private initializeAssetOptimization(): void {
    // Set up intersection observer for lazy image loading
    this.setupLazyImageLoading();
    
    // Monitor asset performance
    this.setupAssetPerformanceMonitoring();
    
    // Preload critical assets
    this.preloadCriticalAssets();
  }

  // Optimized image loading with caching and lazy loading
  async loadImage(url: string, options: {
    lazy?: boolean;
    preload?: boolean;
    fallback?: string;
    maxRetries?: number;
  } = {}): Promise<HTMLImageElement> {
    // Check cache first
    const cached = this.imageCache.get(url);
    if (cached) {
      this.updateCacheHitRate(true);
      return cached;
    }

    this.updateCacheHitRate(false);

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const loadingPromise = this.loadImageWithRetry(url, options.maxRetries || 3, options.fallback);
    this.loadingPromises.set(url, loadingPromise);

    try {
      const img = await loadingPromise;
      
      // Cache the loaded image
      this.imageCache.set(url, img);
      this.assetMetrics.loadedCount++;
      
      // Mark as preloaded if requested
      if (options.preload) {
        this.preloadedAssets.add(url);
      }
      
      return img;
    } catch (error) {
      this.assetMetrics.failedCount++;
      throw error;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  private async loadImageWithRetry(
    url: string, 
    maxRetries: number, 
    fallbackUrl?: string
  ): Promise<HTMLImageElement> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        const img = await this.loadSingleImage(url);
        const loadTime = performance.now() - startTime;
        
        // Update metrics
        this.updateAverageLoadTime(loadTime);
        this.assetMetrics.totalImages++;
        
        console.log(`✅ Image loaded: ${url} (${loadTime.toFixed(2)}ms, attempt ${attempt})`);
        return img;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Image load attempt ${attempt}/${maxRetries} failed for ${url}:`, error);
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    
    // Try fallback if provided
    if (fallbackUrl && fallbackUrl !== url) {
      console.log(`🔄 Trying fallback image: ${fallbackUrl}`);
      try {
        return await this.loadSingleImage(fallbackUrl);
      } catch (fallbackError) {
        console.error(`❌ Fallback image also failed: ${fallbackUrl}`, fallbackError);
      }
    }
    
    throw lastError!;
  }

  private loadSingleImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      // Set loading attributes for better performance
      img.loading = 'lazy';
      img.decoding = 'async';
      
      img.src = url;
    });
  }

  // Preload critical assets
  preloadCriticalAssets(): void {
    const criticalAssets = [
      'assets/images/ThangLong_FC.jpg',
      'assets/images/ThangLong_FC2.jpg'
      // Add other critical assets
    ];

    criticalAssets.forEach(async (url) => {
      try {
        await this.loadImage(url, { preload: true });
        console.log(`✅ Preloaded critical asset: ${url}`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload critical asset: ${url}`, error);
      }
    });
  }

  // Set up lazy image loading with intersection observer
  private setupLazyImageLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset['src'];
            
            if (src) {
              this.loadImage(src, { lazy: true })
                .then((loadedImg) => {
                  img.src = loadedImg.src;
                  img.classList.add('loaded');
                })
                .catch((error) => {
                  console.error('Lazy image load failed:', error);
                  img.classList.add('error');
                });
              
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01
      });

      // Observe existing lazy images
      document.addEventListener('DOMContentLoaded', () => {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
      });
    }
  }

  // Monitor asset performance
  private setupAssetPerformanceMonitoring(): void {
    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.initiatorType === 'img') {
              this.assetMetrics.totalSize += resourceEntry.transferSize || 0;
            }
          });
        });

        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('⚠️ Asset performance monitoring not available:', error);
      }
    }
  }

  // Image compression and optimization
  async optimizeImage(
    imageUrl: string, 
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<string> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'webp'
    } = options;

    try {
      // Load the original image
      const img = await this.loadImage(imageUrl);
      
      // Create canvas for optimization
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Calculate optimized dimensions
      const { width, height } = this.calculateOptimalDimensions(
        img.naturalWidth, 
        img.naturalHeight, 
        maxWidth, 
        maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to optimized format
      const mimeType = `image/${format}`;
      const optimizedDataUrl = canvas.toDataURL(mimeType, quality);
      
      console.log(`🎨 Optimized image: ${imageUrl} (${width}x${height}, ${format}, ${quality})`);
      
      return optimizedDataUrl;
    } catch (error) {
      console.error(`❌ Image optimization failed for ${imageUrl}:`, error);
      return imageUrl; // Return original on failure
    }
  }

  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;
    
    // Scale down if too wide
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    // Scale down if too tall
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }

  // Avatar loading with fallback for player images
  async loadPlayerAvatar(playerName: string): Promise<string> {
    const baseUrl = 'assets/images/avatar_players/';
    
    // List of possible avatar filenames
    const possibleNames = [
      `${playerName}.png`,
      `${playerName}.jpg`,
      `${playerName.toLowerCase()}.png`,
      `${playerName.toLowerCase()}.jpg`,
      `${playerName.replace(/\s+/g, '_')}.png`,
      `${playerName.replace(/\s+/g, '_')}.jpg`
    ];

    // Try each possible filename
    for (const filename of possibleNames) {
      try {
        const img = await this.loadImage(`${baseUrl}${filename}`, { 
          maxRetries: 1,
          fallback: 'assets/images/default-avatar.png'
        });
        
        console.log(`👤 Found avatar for ${playerName}: ${filename}`);
        return img.src;
      } catch {
        // Continue to next possibility
        continue;
      }
    }

    // Return default avatar if no specific avatar found
    console.log(`👤 Using default avatar for ${playerName}`);
    return 'assets/images/default-avatar.png';
  }

  // Create responsive image sources
  createResponsiveSources(baseUrl: string): {
    srcset: string;
    sizes: string;
  } {
    const breakpoints = [320, 768, 1024, 1440, 1920];
    const srcset = breakpoints
      .map(width => `${baseUrl}?w=${width} ${width}w`)
      .join(', ');
    
    const sizes = [
      '(max-width: 320px) 280px',
      '(max-width: 768px) 720px',
      '(max-width: 1024px) 960px',
      '(max-width: 1440px) 1200px',
      '1920px'
    ].join(', ');

    return { srcset, sizes };
  }

  // Cache management
  clearImageCache(): void {
    this.imageCache.clear();
    this.preloadedAssets.clear();
    console.log('🧹 Image cache cleared');
  }

  // Update metrics
  private updateAverageLoadTime(loadTime: number): void {
    const count = this.assetMetrics.loadedCount;
    this.assetMetrics.averageLoadTime = 
      (this.assetMetrics.averageLoadTime * count + loadTime) / (count + 1);
  }

  private updateCacheHitRate(wasHit: boolean): void {
    const total = this.assetMetrics.loadedCount + 1;
    const hits = wasHit ? 1 : 0;
    this.assetMetrics.cacheHitRate = 
      (this.assetMetrics.cacheHitRate * (total - 1) + hits) / total * 100;
  }

  // Get performance report
  getAssetMetrics(): AssetMetrics {
    return { ...this.assetMetrics };
  }

  logAssetReport(): void {
    console.group('🖼️ Asset Performance Report');
    console.log('Total Images:', this.assetMetrics.totalImages);
    console.log('Successfully Loaded:', this.assetMetrics.loadedCount);
    console.log('Failed to Load:', this.assetMetrics.failedCount);
    console.log('Average Load Time:', `${this.assetMetrics.averageLoadTime.toFixed(2)}ms`);
    console.log('Cache Hit Rate:', `${this.assetMetrics.cacheHitRate.toFixed(1)}%`);
    console.log('Total Size:', `${(this.assetMetrics.totalSize / 1024).toFixed(2)}KB`);
    console.log('Cached Images:', this.imageCache.size);
    console.log('Preloaded Assets:', this.preloadedAssets.size);
    console.groupEnd();
  }

  // Cleanup
  destroy(): void {
    this.clearImageCache();
    this.loadingPromises.clear();
    this.optimizationQueue.length = 0;
    
    console.log('🧹 Asset optimization service destroyed');
  }
}