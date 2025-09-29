import { Injectable, ComponentRef, ViewContainerRef, Type, inject } from '@angular/core';
import { PerformanceService } from './performance.service';

interface LazyComponentConfig {
  name: string;
  loadComponent: () => Promise<Type<unknown>>;
  preload?: boolean;
  priority?: number;
}

interface LoadedComponent {
  name: string;
  component: ComponentRef<unknown>;
  loadTime: number;
  memoryUsage: number;
}

@Injectable({
  providedIn: 'root'
})
export class LazyLoadingService {
  private performanceService = inject(PerformanceService);
  
  // Registry of lazy components
  private componentRegistry = new Map<string, LazyComponentConfig>();
  
  // Cache of loaded components
  private loadedComponents = new Map<string, LoadedComponent>();
  
  // Preloading queue
  private preloadQueue: string[] = [];
  
  // Loading states
  private loadingStates = new Map<string, Promise<Type<unknown>>>();

  constructor() {
    this.registerCommonComponents();
    this.initializeLazyLoading();
  }

  private initializeLazyLoading(): void {
    // Set up intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Start preloading high-priority components
    this.startPreloading();
  }

  // Register a lazy component
  registerComponent(config: LazyComponentConfig): void {
    this.componentRegistry.set(config.name, config);
    
    if (config.preload) {
      this.preloadQueue.push(config.name);
    }
    
    console.log(`📦 Registered lazy component: ${config.name}`);
  }

  // Load a component dynamically
  async loadComponent(
    componentName: string, 
    container: ViewContainerRef, 
    inputs?: Record<string, unknown>
  ): Promise<ComponentRef<unknown>> {
    const measureId = this.performanceService.startComponentLoad(componentName);
    
    try {
      // Check if already loaded
      const existing = this.loadedComponents.get(componentName);
      if (existing) {
        console.log(`♻️ Reusing cached component: ${componentName}`);
        return existing.component;
      }

      // Get component config
      const config = this.componentRegistry.get(componentName);
      if (!config) {
        throw new Error(`Component ${componentName} not registered`);
      }

      // Load the component
      const ComponentClass = await this.loadComponentClass(componentName, config);
      
      // Create component instance
      const componentRef = container.createComponent(ComponentClass);
      
      // Apply inputs if provided
      if (inputs && componentRef.instance && typeof componentRef.instance === 'object') {
        const instance = componentRef.instance as Record<string, unknown>;
        Object.entries(inputs).forEach(([key, value]) => {
          if (key in instance) {
            instance[key] = value;
          }
        });
      }

      // Cache the loaded component
      const loadTime = this.performanceService.endTiming(`component-${componentName}-${Date.now()}`);
      this.loadedComponents.set(componentName, {
        name: componentName,
        component: componentRef,
        loadTime,
        memoryUsage: this.getMemoryUsage()
      });

      console.log(`✅ Lazy loaded component: ${componentName} in ${loadTime.toFixed(2)}ms`);
      
      return componentRef;
    } catch (error) {
      console.error(`❌ Failed to load component ${componentName}:`, error);
      throw error;
    } finally {
      this.performanceService.endComponentLoad(measureId, componentName);
    }
  }

  // Preload a component without rendering
  async preloadComponent(componentName: string): Promise<void> {
    if (this.loadedComponents.has(componentName) || this.loadingStates.has(componentName)) {
      return; // Already loaded or loading
    }

    const config = this.componentRegistry.get(componentName);
    if (!config) {
      console.warn(`⚠️ Cannot preload unregistered component: ${componentName}`);
      return;
    }

    console.log(`🔄 Preloading component: ${componentName}`);
    
    try {
      await this.loadComponentClass(componentName, config);
      console.log(`✅ Preloaded component: ${componentName}`);
    } catch (error) {
      console.error(`❌ Failed to preload component ${componentName}:`, error);
    }
  }

  // Load component class with caching
  private async loadComponentClass(componentName: string, config: LazyComponentConfig): Promise<Type<unknown>> {
    // Check if already loading
    if (this.loadingStates.has(componentName)) {
      return this.loadingStates.get(componentName)!;
    }

    // Start loading
    const loadingPromise = config.loadComponent();
    this.loadingStates.set(componentName, loadingPromise);

    try {
      const ComponentClass = await loadingPromise;
      return ComponentClass;
    } finally {
      // Remove from loading states once complete
      this.loadingStates.delete(componentName);
    }
  }

  // Unload a component to free memory
  unloadComponent(componentName: string): void {
    const loaded = this.loadedComponents.get(componentName);
    if (loaded) {
      loaded.component.destroy();
      this.loadedComponents.delete(componentName);
      console.log(`🗑️ Unloaded component: ${componentName}`);
    }
  }

  // Start preloading process
  private startPreloading(): void {
    // Use requestIdleCallback for preloading during idle time
    const preloadNext = () => {
      if (this.preloadQueue.length === 0) return;

      const componentName = this.preloadQueue.shift()!;
      this.preloadComponent(componentName).then(() => {
        // Schedule next preload
        if ('requestIdleCallback' in window) {
          requestIdleCallback(preloadNext);
        } else {
          setTimeout(preloadNext, 100);
        }
      });
    };

    // Start preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadNext);
    } else {
      setTimeout(preloadNext, 1000);
    }
  }

  // Set up intersection observer for viewport-based lazy loading
  private setupIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const componentName = entry.target.getAttribute('data-lazy-component');
            if (componentName && this.componentRegistry.has(componentName)) {
              this.preloadComponent(componentName);
            }
          }
        });
      }, {
        rootMargin: '50px' // Start loading 50px before entering viewport
      });

      // Observe elements with data-lazy-component attribute
      document.addEventListener('DOMContentLoaded', () => {
        const lazyElements = document.querySelectorAll('[data-lazy-component]');
        lazyElements.forEach(el => observer.observe(el));
      });
    }
  }

  // Memory management
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Get loading statistics
  getLoadingStats(): {
    totalRegistered: number;
    totalLoaded: number;
    totalMemoryUsage: number;
    averageLoadTime: number;
    loadedComponents: string[];
  } {
    const loadedComponents = Array.from(this.loadedComponents.values());
    const totalMemoryUsage = loadedComponents.reduce((sum, comp) => sum + comp.memoryUsage, 0);
    const averageLoadTime = loadedComponents.length > 0 
      ? loadedComponents.reduce((sum, comp) => sum + comp.loadTime, 0) / loadedComponents.length 
      : 0;

    return {
      totalRegistered: this.componentRegistry.size,
      totalLoaded: this.loadedComponents.size,
      totalMemoryUsage,
      averageLoadTime,
      loadedComponents: loadedComponents.map(comp => comp.name)
    };
  }

  // Cleanup unused components based on memory pressure
  cleanupComponents(maxMemoryMB = 100): void {
    const stats = this.getLoadingStats();
    
    if (stats.totalMemoryUsage > maxMemoryMB) {
      console.log(`🧹 Memory cleanup triggered (${stats.totalMemoryUsage.toFixed(2)}MB > ${maxMemoryMB}MB)`);
      
      // Sort by memory usage (highest first) and unload
      const sortedComponents = Array.from(this.loadedComponents.entries())
        .sort(([,a], [,b]) => b.memoryUsage - a.memoryUsage);
      
      let freedMemory = 0;
      let freedCount = 0;
      
      for (const [name, component] of sortedComponents) {
        if (stats.totalMemoryUsage - freedMemory <= maxMemoryMB * 0.8) break; // Keep 20% buffer
        
        this.unloadComponent(name);
        freedMemory += component.memoryUsage;
        freedCount++;
      }
      
      console.log(`✅ Freed ${freedMemory.toFixed(2)}MB by unloading ${freedCount} components`);
    }
  }

  // Register common components
  registerCommonComponents(): void {
    // Players component (high priority)
    this.registerComponent({
      name: 'players',
      loadComponent: () => import('../features/players/players.component').then(m => m.PlayersComponent),
      preload: true,
      priority: 1
    });

    // Players Simple component (high priority - used in main view)
    this.registerComponent({
      name: 'players-simple',
      loadComponent: () => import('../features/players/players-simple.component').then(m => m.PlayersSimpleComponent),
      preload: true,
      priority: 1
    });

    // Fund component (medium priority)
    this.registerComponent({
      name: 'fund',
      loadComponent: () => import('../features/fund/fund.component').then(m => m.FundComponent),
      preload: true,
      priority: 2
    });

    // History component (medium priority)
    this.registerComponent({
      name: 'history',
      loadComponent: () => import('../features/history/history.component').then(m => m.HistoryComponent),
      preload: false,
      priority: 2
    });

    // Stats component (low priority - large bundle)
    this.registerComponent({
      name: 'stats',
      loadComponent: () => import('../features/stats/stats.component').then(m => m.StatsComponent),
      preload: false,
      priority: 3
    });

    // Match info component (medium priority)
    this.registerComponent({
      name: 'match-info',
      loadComponent: () => import('../features/match-info/match-info.component').then(m => m.MatchInfoComponent),
      preload: false,
      priority: 2
    });
  }

  // Destroy and cleanup
  destroy(): void {
    // Unload all components
    this.loadedComponents.forEach((_, name) => {
      this.unloadComponent(name);
    });

    // Clear caches
    this.componentRegistry.clear();
    this.loadingStates.clear();
    this.preloadQueue.length = 0;

    console.log('🧹 Lazy loading service destroyed');
  }
}