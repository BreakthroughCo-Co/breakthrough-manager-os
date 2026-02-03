import { base44 } from '@/api/base44Client';

/**
 * Centralized error tracking and logging
 * Sentry-style error capture and reporting
 */

class ErrorTracker {
  constructor() {
    this.maxStackLength = 5000; // Limit stack trace size
  }

  /**
   * Capture and log an error
   */
  async captureError(error, context = {}) {
    try {
      const user = await base44.auth.me().catch(() => null);
      
      const errorLog = {
        error_type: context.type || this.categorizeError(error),
        severity: context.severity || this.calculateSeverity(error),
        message: error.message || 'Unknown error',
        stack_trace: this.sanitizeStack(error.stack),
        component: context.component,
        page: context.page || window.location.pathname,
        user_email: user?.email,
        user_action: context.action,
        browser_info: JSON.stringify({
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          url: window.location.href,
        }),
      };

      await base44.entities.ErrorLog.create(errorLog);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error tracked:', errorLog);
      }
    } catch (logError) {
      // Fail silently to avoid error loops
      console.error('Failed to track error:', logError);
    }
  }

  /**
   * Categorize error type
   */
  categorizeError(error) {
    if (error.name === 'ValidationError') return 'validation';
    if (error.message?.includes('network') || error.message?.includes('fetch')) return 'api';
    if (error.message?.includes('permission') || error.message?.includes('unauthorized')) return 'auth';
    return 'runtime';
  }

  /**
   * Calculate error severity
   */
  calculateSeverity(error) {
    if (error.message?.includes('critical') || error.name === 'SecurityError') return 'critical';
    if (error.message?.includes('unauthorized') || error.name === 'PermissionError') return 'high';
    if (error.name === 'ValidationError') return 'medium';
    return 'medium';
  }

  /**
   * Sanitize stack trace
   */
  sanitizeStack(stack) {
    if (!stack) return '';
    return stack.substring(0, this.maxStackLength);
  }

  /**
   * Track performance issue as error
   */
  async capturePerformanceIssue(metric, threshold) {
    if (metric.duration_ms > threshold) {
      await this.captureError(
        new Error(`Performance threshold exceeded: ${metric.duration_ms}ms`),
        {
          type: 'performance',
          severity: 'medium',
          component: metric.component,
          page: metric.page,
          action: 'performance_monitoring',
        }
      );
    }
  }
}

export const errorTracker = new ErrorTracker();

/**
 * Global error handler
 */
export const initGlobalErrorHandler = () => {
  window.addEventListener('error', (event) => {
    errorTracker.captureError(event.error, {
      type: 'runtime',
      page: window.location.pathname,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorTracker.captureError(event.reason, {
      type: 'promise',
      severity: 'high',
      page: window.location.pathname,
    });
  });
};