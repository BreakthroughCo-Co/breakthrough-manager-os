import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Performance monitoring component
 * Tracks page load times, component renders, and API calls
 */

const THRESHOLDS = {
  page_load: 3000,      // 3 seconds
  component_render: 100, // 100ms
  api_call: 2000,       // 2 seconds
  query_time: 1000,     // 1 second
};

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.flushInterval = 30000; // Flush every 30s
    this.startFlushTimer();
  }

  /**
   * Track page load performance
   */
  async trackPageLoad(page) {
    if (!window.performance) return;

    const perfData = performance.getEntriesByType('navigation')[0];
    if (!perfData) return;

    const duration = perfData.loadEventEnd - perfData.fetchStart;

    await this.recordMetric({
      metric_type: 'page_load',
      page,
      duration_ms: Math.round(duration),
      threshold_exceeded: duration > THRESHOLDS.page_load,
      metadata: JSON.stringify({
        dns: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
        tcp: Math.round(perfData.connectEnd - perfData.connectStart),
        request: Math.round(perfData.responseStart - perfData.requestStart),
        response: Math.round(perfData.responseEnd - perfData.responseStart),
        dom: Math.round(perfData.domContentLoadedEventEnd - perfData.responseEnd),
      }),
    });
  }

  /**
   * Track component render time
   */
  async trackRender(component, duration) {
    await this.recordMetric({
      metric_type: 'component_render',
      component,
      duration_ms: Math.round(duration),
      threshold_exceeded: duration > THRESHOLDS.component_render,
    });
  }

  /**
   * Track API call performance
   */
  async trackApiCall(endpoint, duration, metadata = {}) {
    await this.recordMetric({
      metric_type: 'api_call',
      component: endpoint,
      duration_ms: Math.round(duration),
      threshold_exceeded: duration > THRESHOLDS.api_call,
      metadata: JSON.stringify(metadata),
    });
  }

  /**
   * Record metric (batched)
   */
  async recordMetric(metric) {
    try {
      const user = await base44.auth.me().catch(() => null);
      this.metrics.push({
        ...metric,
        user_email: user?.email,
      });

      // Flush if threshold exceeded (immediate alert)
      if (metric.threshold_exceeded) {
        await this.flush();
      }
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Flush metrics to database
   */
  async flush() {
    if (this.metrics.length === 0) return;

    try {
      const metricsToFlush = [...this.metrics];
      this.metrics = [];

      await base44.entities.PerformanceMetric.bulkCreate(metricsToFlush);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * Start periodic flush
   */
  startFlushTimer() {
    setInterval(() => this.flush(), this.flushInterval);
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to monitor component render performance
 */
export const usePerformanceMonitor = (componentName) => {
  const renderStart = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - renderStart.current;
    performanceMonitor.trackRender(componentName, duration);
  }, [componentName]);
};

/**
 * Hook to monitor page load
 */
export const usePageLoadMonitor = (pageName) => {
  useEffect(() => {
    // Wait for page to fully load
    if (document.readyState === 'complete') {
      performanceMonitor.trackPageLoad(pageName);
    } else {
      window.addEventListener('load', () => {
        performanceMonitor.trackPageLoad(pageName);
      });
    }
  }, [pageName]);
};