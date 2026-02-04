/**
 * Tenant Isolation Middleware
 * 
 * CRITICAL SECURITY UTILITY
 * Enforces multi-tenancy and data isolation for NDIS providers.
 * 
 * Usage:
 * ```javascript
 * import { getTenantId, requireTenantAccess } from './_shared/requireTenant.js';
 * 
 * const user = await base44.auth.me();
 * const tenantId = getTenantId(user);
 * 
 * // Use in queries
 * const clients = await base44.asServiceRole.entities.Client.filter({
 *   tenant_id: tenantId,
 *   status: 'active'
 * });
 * ```
 * 
 * NDIS Compliance:
 * Implements strict data isolation required for multi-provider scenarios.
 * Critical for audit readiness and privacy obligations.
 */

/**
 * Extracts tenant ID from user object
 * @param {Object} user - User object from base44.auth.me()
 * @returns {string} Tenant/organization ID
 * @throws {Error} If tenant ID cannot be determined
 */
export function getTenantId(user) {
    if (!user) {
        throw new Error('User required to determine tenant');
    }

    // In Base44, tenant context is typically associated with the user
    // This implementation assumes tenant_id is stored in user metadata
    // Adjust based on your actual tenant storage strategy
    
    const tenantId = user.tenant_id || user.organization_id || user.app_id;
    
    if (!tenantId) {
        throw new Error('Tenant ID not found for user');
    }

    return tenantId;
}

/**
 * Validates that a resource belongs to the user's tenant
 * @param {Object} resource - Entity/resource to validate
 * @param {string} userTenantId - User's tenant ID
 * @throws {Error} If resource doesn't belong to user's tenant
 */
export function requireTenantAccess(resource, userTenantId) {
    if (!resource) {
        throw new Error('Resource required for tenant validation');
    }

    const resourceTenantId = resource.tenant_id || resource.organization_id;
    
    if (!resourceTenantId) {
        // If resource doesn't have tenant_id, it might be a global resource
        // Log warning for audit purposes
        console.warn('Resource accessed without tenant_id:', {
            resourceType: resource.constructor?.name,
            resourceId: resource.id
        });
        return true;
    }

    if (resourceTenantId !== userTenantId) {
        throw new Error('Access denied: Resource belongs to different tenant');
    }

    return true;
}

/**
 * Adds tenant filter to query parameters
 * @param {Object} user - User object
 * @param {Object} queryFilter - Existing query filters
 * @returns {Object} Query filter with tenant_id added
 */
export function addTenantFilter(user, queryFilter = {}) {
    const tenantId = getTenantId(user);
    
    return {
        ...queryFilter,
        tenant_id: tenantId
    };
}

/**
 * Validates tenant access with detailed error response
 * Suitable for HTTP handlers
 * @param {Object} user - User object
 * @param {Object} resource - Resource to validate
 * @returns {Response|null} Returns Response if forbidden, null if allowed
 */
export function validateTenantAccess(user, resource) {
    try {
        const tenantId = getTenantId(user);
        requireTenantAccess(resource, tenantId);
        return null; // Access allowed
    } catch (error) {
        return Response.json(
            {
                error: 'Forbidden',
                message: 'Access denied: Tenant isolation violation',
                details: error.message,
                statusCode: 403
            },
            { status: 403 }
        );
    }
}

/**
 * Wraps a query function with automatic tenant filtering
 * @param {Function} queryFn - Query function to wrap
 * @param {Object} user - User object
 * @returns {Function} Wrapped query function with tenant filter
 */
export function withTenantFilter(queryFn, user) {
    return async (...args) => {
        const tenantId = getTenantId(user);
        
        // Modify first argument (typically filter object) to include tenant
        if (args.length > 0 && typeof args[0] === 'object') {
            args[0] = { ...args[0], tenant_id: tenantId };
        } else {
            args.unshift({ tenant_id: tenantId });
        }
        
        return await queryFn(...args);
    };
}

/**
 * Audit log helper for tenant access
 * @param {Object} user - User object
 * @param {string} action - Action performed
 * @param {Object} resource - Resource accessed
 */
export function auditTenantAccess(user, action, resource) {
    const tenantId = getTenantId(user);
    
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'tenant_access',
        tenant_id: tenantId,
        user_id: user.id,
        user_email: user.email,
        action: action,
        resource_type: resource?.constructor?.name || 'unknown',
        resource_id: resource?.id
    }));
}