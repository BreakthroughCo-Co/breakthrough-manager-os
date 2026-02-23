/**
 * Request Validation Middleware
 * 
 * Centralized validation for backend function inputs.
 * Prevents invalid data from reaching business logic.
 * 
 * NDIS Compliance: Ensures data integrity for audit trail
 */

export class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

/**
 * Validate required fields exist and are non-empty
 */
export function validateRequired(data, fields) {
    const missing = [];
    
    for (const field of fields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missing.push(field);
        }
    }
    
    if (missing.length > 0) {
        throw new ValidationError(
            `Missing required fields: ${missing.join(', ')}`,
            missing[0]
        );
    }
}

/**
 * Validate field types
 */
export function validateTypes(data, schema) {
    for (const [field, expectedType] of Object.entries(schema)) {
        if (data[field] === undefined || data[field] === null) continue;
        
        const actualType = typeof data[field];
        
        if (expectedType === 'array') {
            if (!Array.isArray(data[field])) {
                throw new ValidationError(
                    `Field '${field}' must be an array`,
                    field
                );
            }
        } else if (actualType !== expectedType) {
            throw new ValidationError(
                `Field '${field}' must be of type ${expectedType}, got ${actualType}`,
                field
            );
        }
    }
}

/**
 * Validate enum values
 */
export function validateEnum(data, field, allowedValues) {
    if (data[field] === undefined || data[field] === null) return;
    
    if (!allowedValues.includes(data[field])) {
        throw new ValidationError(
            `Field '${field}' must be one of: ${allowedValues.join(', ')}`,
            field
        );
    }
}

/**
 * Validate email format
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format', 'email');
    }
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(dateString, field = 'date') {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new ValidationError(`Invalid date format for '${field}'`, field);
    }
}

/**
 * Validate NDIS number format
 */
export function validateNDISNumber(ndisNumber) {
    // NDIS numbers are typically 9 digits
    const ndisRegex = /^\d{9}$/;
    if (!ndisRegex.test(ndisNumber.replace(/\s/g, ''))) {
        throw new ValidationError('Invalid NDIS number format (must be 9 digits)', 'ndis_number');
    }
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Complete request validator wrapper
 */
export function validateRequest(data, rules) {
    try {
        // Required fields
        if (rules.required) {
            validateRequired(data, rules.required);
        }
        
        // Type validation
        if (rules.types) {
            validateTypes(data, rules.types);
        }
        
        // Enum validation
        if (rules.enums) {
            for (const [field, allowedValues] of Object.entries(rules.enums)) {
                if (data[field]) {
                    validateEnum(data, field, allowedValues);
                }
            }
        }
        
        // Email validation
        if (rules.emails) {
            for (const field of rules.emails) {
                if (data[field]) {
                    validateEmail(data[field]);
                }
            }
        }
        
        // Date validation
        if (rules.dates) {
            for (const field of rules.dates) {
                if (data[field]) {
                    validateDate(data[field], field);
                }
            }
        }
        
        return true;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Validation failed: ' + error.message);
    }
}