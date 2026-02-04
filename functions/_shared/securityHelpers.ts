/**
 * Security Helpers
 * 
 * Centralized security utilities for backend functions.
 * Combines role-based access control, tenant isolation, and audit logging.
 * 
 * NDIS Compliance:
 * Provides reusable security patterns for audit-ready backend operations.
 */

import { requireRole, requireAdmin, forbiddenResponse, unauthorizedResponse } from './requireRole.js';
import { getTenantId, requireTenantAccess, addTenantFilter, auditTenantAccess } from './requireTenant.js';

/**
 * Complete authentication and authorization check
 * @param {Object} base44 - Base44 SDK instance
 * @param {string} requiredRole - Required role (optional)
 * @returns {Object} Authenticated user object
 * @throws {Error} If authentication/authorization fails
 */
export async function authenticate(base44, requiredRole = null) {
    const user = await base44.auth.me();
    
    if (!user) {
        throw new Error('Unauthorized: Authentication required');
    }
    
    if (requiredRole) {
        requireRole(user, requiredRole);
    }
    
    return user;
}

/**
 * Secure query wrapper with tenant isolation
 * @param {Object} base44 - Base44 SDK instance
 * @param {string} entityName - Entity name to query
 * @param {Object} filter - Query filter
 * @param {string} sortField - Sort field (optional)
 * @param {number} limit - Limit (optional)
 * @returns {Array} Filtered entities
 */
export async function secureQuery(base44, entityName, filter = {}, sortField = null, limit = null) {
    const user = await authenticate(base44);
    const tenantId = getTenantId(user);
    
    const tenantFilter = { ...filter, tenant_id: tenantId };
    
    auditTenantAccess(user, 'query', { type: entityName });
    
    if (sortField && limit) {
        return await base44.asServiceRole.entities[entityName].filter(tenantFilter, sortField, limit);
    } else if (sortField) {
        return await base44.asServiceRole.entities[entityName].filter(tenantFilter, sortField);
    } else {
        return await base44.asServiceRole.entities[entityName].filter(tenantFilter);
    }
}

/**
 * Secure entity creation with tenant isolation
 * @param {Object} base44 - Base44 SDK instance
 * @param {string} entityName - Entity name
 * @param {Object} data - Entity data
 * @returns {Object} Created entity
 */
export async function secureCreate(base44, entityName, data) {
    const user = await authenticate(base44);
    const tenantId = getTenantId(user);
    
    const tenantData = { ...data, tenant_id: tenantId };
    
    auditTenantAccess(user, 'create', { type: entityName });
    
    return await base44.asServiceRole.entities[entityName].create(tenantData);
}

/**
 * Secure entity update with tenant validation
 * @param {Object} base44 - Base44 SDK instance
 * @param {string} entityName - Entity name
 * @param {string} entityId - Entity ID
 * @param {Object} data - Update data
 * @returns {Object} Updated entity
 */
export async function secureUpdate(base44, entityName, entityId, data) {
    const user = await authenticate(base44);
    const tenantId = getTenantId(user);
    
    // Verify entity belongs to user's tenant before updating
    const existing = await base44.asServiceRole.entities[entityName].get(entityId);
    requireTenantAccess(existing, tenantId);
    
    auditTenantAccess(user, 'update', { type: entityName, id: entityId });
    
    return await base44.asServiceRole.entities[entityName].update(entityId, data);
}

/**
 * Admin-only operation wrapper
 * @param {Object} base44 - Base44 SDK instance
 * @param {Function} operation - Operation to perform
 * @returns {*} Operation result
 */
export async function adminOnly(base44, operation) {
    const user = await authenticate(base44);
    requireAdmin(user);
    
    return await operation(user);
}

/**
 * Error handler with security-aware responses
 * @param {Error} error - Error object
 * @returns {Response} Appropriate error response
 */
export function handleSecurityError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('forbidden') || message.includes('role required')) {
        return forbiddenResponse(error.message);
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
        return unauthorizedResponse(error.message);
    }
    
    if (message.includes('tenant')) {
        return forbiddenResponse('Access denied: Tenant isolation violation');
    }
    
    console.error('Security error:', error);
    
    return Response.json(
        {
            error: 'Internal Server Error',
            message: 'An error occurred while processing your request',
            statusCode: 500
        },
        { status: 500 }
    );
}

/**
 * Rate limiting helper (basic implementation)
 * @param {string} identifier - Rate limit identifier (user ID, IP, etc.)
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if within rate limit
 */
const rateLimitStore = new Map();

export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const userRequests = rateLimitStore.get(identifier) || [];
    
    // Remove expired entries
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
        return false;
    }
    
    validRequests.push(now);
    rateLimitStore.set(identifier, validRequests);
    
    return true;
}

/**
 * Creates rate limit response
 * @param {number} retryAfter - Seconds until retry allowed
 * @returns {Response} 429 Too Many Requests response
 */
export function rateLimitResponse(retryAfter = 60) {
    return Response.json(
        {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: retryAfter,
            statusCode: 429
        },
        { 
            status: 429,
            headers: {
                'Retry-After': retryAfter.toString()
            }
        }
    );
}