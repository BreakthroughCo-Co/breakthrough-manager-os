/**
 * Role-Based Access Control Middleware
 * 
 * CRITICAL SECURITY UTILITY
 * Enforces role-based access control for backend functions.
 * 
 * Usage:
 * ```javascript
 * import { requireRole, requireAdmin } from './_shared/requireRole.js';
 * 
 * const user = await base44.auth.me();
 * requireAdmin(user); // Throws if not admin
 * requireRole(user, 'manager'); // Throws if not manager
 * ```
 * 
 * NDIS Compliance:
 * Implements principle of least privilege for audit-ready access control.
 */

/**
 * Checks if user has required role
 * @param {Object} user - User object from base44.auth.me()
 * @param {string} requiredRole - Required role ('admin', 'manager', 'user')
 * @throws {Error} If user doesn't have required role
 */
export function requireRole(user, requiredRole) {
    if (!user) {
        throw new Error('Authentication required');
    }

    if (!user.role) {
        throw new Error('User role not defined');
    }

    // Admin has access to everything
    if (user.role === 'admin') {
        return true;
    }

    if (user.role !== requiredRole) {
        throw new Error(`Forbidden: ${requiredRole} role required`);
    }

    return true;
}

/**
 * Requires admin role
 * @param {Object} user - User object from base44.auth.me()
 * @throws {Error} If user is not admin
 */
export function requireAdmin(user) {
    if (!user) {
        throw new Error('Authentication required');
    }

    if (user.role !== 'admin') {
        throw new Error('Forbidden: Admin role required');
    }

    return true;
}

/**
 * Checks if user has any of the specified roles
 * @param {Object} user - User object
 * @param {string[]} allowedRoles - Array of allowed roles
 * @throws {Error} If user doesn't have any of the allowed roles
 */
export function requireAnyRole(user, allowedRoles) {
    if (!user) {
        throw new Error('Authentication required');
    }

    if (!user.role) {
        throw new Error('User role not defined');
    }

    // Admin always has access
    if (user.role === 'admin') {
        return true;
    }

    if (!allowedRoles.includes(user.role)) {
        throw new Error(`Forbidden: One of [${allowedRoles.join(', ')}] roles required`);
    }

    return true;
}

/**
 * Creates a standardized forbidden response
 * @param {string} message - Error message
 * @returns {Response} 403 Forbidden response
 */
export function forbiddenResponse(message = 'Access forbidden') {
    return Response.json(
        {
            error: 'Forbidden',
            message: message,
            statusCode: 403
        },
        { status: 403 }
    );
}

/**
 * Creates a standardized unauthorized response
 * @param {string} message - Error message
 * @returns {Response} 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required') {
    return Response.json(
        {
            error: 'Unauthorized',
            message: message,
            statusCode: 401
        },
        { status: 401 }
    );
}