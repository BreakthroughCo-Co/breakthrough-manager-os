/**
 * Structured Logging Utility
 * 
 * Provides consistent, structured logging across all backend functions.
 * Supports log levels, contextual data, and audit trail requirements.
 * 
 * NDIS Compliance: Maintains detailed audit logs for compliance review
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Set from environment variable, default to INFO
const CURRENT_LOG_LEVEL = LOG_LEVELS[Deno.env.get('LOG_LEVEL') || 'INFO'];

/**
 * Format log entry as structured JSON
 */
function formatLog(level, message, context = {}) {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: level,
        message: message,
        ...context,
        // Add trace ID if available (for request correlation)
        trace_id: context.trace_id || context.request_id || null
    });
}

/**
 * Log error with stack trace
 */
export function logError(message, error = null, context = {}) {
    if (CURRENT_LOG_LEVEL < LOG_LEVELS.ERROR) return;
    
    const logData = {
        ...context,
        error_name: error?.name || null,
        error_message: error?.message || null,
        stack_trace: error?.stack || null
    };
    
    console.error(formatLog('ERROR', message, logData));
}

/**
 * Log warning
 */
export function logWarn(message, context = {}) {
    if (CURRENT_LOG_LEVEL < LOG_LEVELS.WARN) return;
    console.warn(formatLog('WARN', message, context));
}

/**
 * Log informational message
 */
export function logInfo(message, context = {}) {
    if (CURRENT_LOG_LEVEL < LOG_LEVELS.INFO) return;
    console.log(formatLog('INFO', message, context));
}

/**
 * Log debug message
 */
export function logDebug(message, context = {}) {
    if (CURRENT_LOG_LEVEL < LOG_LEVELS.DEBUG) return;
    console.log(formatLog('DEBUG', message, context));
}

/**
 * Log audit event (always logged regardless of level)
 */
export function logAudit(action, context = {}) {
    console.log(formatLog('AUDIT', action, {
        ...context,
        audit: true,
        timestamp_utc: new Date().toISOString()
    }));
}

/**
 * Create request-scoped logger with trace ID
 */
export function createRequestLogger(request) {
    const trace_id = request.headers.get('x-trace-id') || 
                     request.headers.get('x-request-id') || 
                     crypto.randomUUID();
    
    return {
        error: (msg, error, ctx = {}) => logError(msg, error, { trace_id, ...ctx }),
        warn: (msg, ctx = {}) => logWarn(msg, { trace_id, ...ctx }),
        info: (msg, ctx = {}) => logInfo(msg, { trace_id, ...ctx }),
        debug: (msg, ctx = {}) => logDebug(msg, { trace_id, ...ctx }),
        audit: (action, ctx = {}) => logAudit(action, { trace_id, ...ctx })
    };
}

/**
 * Log function execution metrics
 */
export function logMetric(metricName, value, unit = '', context = {}) {
    console.log(formatLog('METRIC', metricName, {
        metric_name: metricName,
        metric_value: value,
        metric_unit: unit,
        ...context
    }));
}