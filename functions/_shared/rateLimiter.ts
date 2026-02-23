/**
 * Rate Limiter for LLM Calls
 * 
 * Prevents excessive AI usage and manages per-tenant quotas.
 * Implements circuit breaker pattern for API failures.
 * 
 * NDIS Compliance: Cost control and service sustainability
 */

// In-memory rate limit store (in production, use Redis or KV store)
const rateLimitStore = new Map();
const circuitBreakerStore = new Map();

/**
 * Rate limit configuration
 */
const LIMITS = {
    perMinute: 20,      // Max LLM calls per minute per tenant
    perHour: 200,       // Max LLM calls per hour per tenant
    perDay: 2000,       // Max LLM calls per day per tenant
};

const CIRCUIT_BREAKER = {
    failureThreshold: 5,        // Failures before opening circuit
    resetTimeout: 60000,        // 1 minute cooldown
    halfOpenAttempts: 3,        // Test attempts before closing
};

export class RateLimitError extends Error {
    constructor(message, retryAfter = 60) {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = 429;
        this.retryAfter = retryAfter;
    }
}

export class CircuitBreakerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerError';
        this.statusCode = 503;
    }
}

/**
 * Check rate limit for tenant
 */
export function checkRateLimit(tenantId, endpoint = 'llm') {
    const now = Date.now();
    const key = `${tenantId}:${endpoint}`;
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, {
            minute: { count: 0, resetAt: now + 60000 },
            hour: { count: 0, resetAt: now + 3600000 },
            day: { count: 0, resetAt: now + 86400000 }
        });
    }
    
    const limits = rateLimitStore.get(key);
    
    // Reset expired windows
    if (now > limits.minute.resetAt) {
        limits.minute = { count: 0, resetAt: now + 60000 };
    }
    if (now > limits.hour.resetAt) {
        limits.hour = { count: 0, resetAt: now + 3600000 };
    }
    if (now > limits.day.resetAt) {
        limits.day = { count: 0, resetAt: now + 86400000 };
    }
    
    // Check limits
    if (limits.minute.count >= LIMITS.perMinute) {
        const retryAfter = Math.ceil((limits.minute.resetAt - now) / 1000);
        throw new RateLimitError(
            `Rate limit exceeded: ${LIMITS.perMinute} requests per minute`,
            retryAfter
        );
    }
    
    if (limits.hour.count >= LIMITS.perHour) {
        const retryAfter = Math.ceil((limits.hour.resetAt - now) / 1000);
        throw new RateLimitError(
            `Rate limit exceeded: ${LIMITS.perHour} requests per hour`,
            retryAfter
        );
    }
    
    if (limits.day.count >= LIMITS.perDay) {
        const retryAfter = Math.ceil((limits.day.resetAt - now) / 1000);
        throw new RateLimitError(
            `Rate limit exceeded: ${LIMITS.perDay} requests per day`,
            retryAfter
        );
    }
    
    // Increment counters
    limits.minute.count++;
    limits.hour.count++;
    limits.day.count++;
    
    return {
        allowed: true,
        remaining: {
            minute: LIMITS.perMinute - limits.minute.count,
            hour: LIMITS.perHour - limits.hour.count,
            day: LIMITS.perDay - limits.day.count
        }
    };
}

/**
 * Circuit breaker for API failures
 */
export function checkCircuitBreaker(service = 'llm') {
    const now = Date.now();
    
    if (!circuitBreakerStore.has(service)) {
        circuitBreakerStore.set(service, {
            state: 'closed',           // closed, open, half-open
            failures: 0,
            lastFailure: null,
            halfOpenAttempts: 0
        });
    }
    
    const circuit = circuitBreakerStore.get(service);
    
    // Check if circuit is open
    if (circuit.state === 'open') {
        // Check if cooldown period has passed
        if (now - circuit.lastFailure > CIRCUIT_BREAKER.resetTimeout) {
            circuit.state = 'half-open';
            circuit.halfOpenAttempts = 0;
        } else {
            throw new CircuitBreakerError(
                `Circuit breaker open for ${service}. Service temporarily unavailable.`
            );
        }
    }
    
    return circuit;
}

/**
 * Record circuit breaker success
 */
export function recordSuccess(service = 'llm') {
    if (!circuitBreakerStore.has(service)) return;
    
    const circuit = circuitBreakerStore.get(service);
    
    if (circuit.state === 'half-open') {
        circuit.halfOpenAttempts++;
        if (circuit.halfOpenAttempts >= CIRCUIT_BREAKER.halfOpenAttempts) {
            circuit.state = 'closed';
            circuit.failures = 0;
        }
    } else {
        circuit.failures = 0;
    }
}

/**
 * Record circuit breaker failure
 */
export function recordFailure(service = 'llm') {
    if (!circuitBreakerStore.has(service)) {
        circuitBreakerStore.set(service, {
            state: 'closed',
            failures: 0,
            lastFailure: null,
            halfOpenAttempts: 0
        });
    }
    
    const circuit = circuitBreakerStore.get(service);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    
    if (circuit.failures >= CIRCUIT_BREAKER.failureThreshold) {
        circuit.state = 'open';
    }
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(tenantId, endpoint = 'llm') {
    const key = `${tenantId}:${endpoint}`;
    const limits = rateLimitStore.get(key);
    
    if (!limits) {
        return {
            remaining: {
                minute: LIMITS.perMinute,
                hour: LIMITS.perHour,
                day: LIMITS.perDay
            }
        };
    }
    
    return {
        remaining: {
            minute: LIMITS.perMinute - limits.minute.count,
            hour: LIMITS.perHour - limits.hour.count,
            day: LIMITS.perDay - limits.day.count
        },
        resetAt: {
            minute: new Date(limits.minute.resetAt),
            hour: new Date(limits.hour.resetAt),
            day: new Date(limits.day.resetAt)
        }
    };
}