import { base44 } from '@/api/base44Client';

/**
 * Central audit logging utility for compliance and security
 * Logs all critical actions across the application
 */
export const logEvent = async (action, entityType, metadata = {}) => {
  try {
    const user = await base44.auth.me();
    
    const logEntry = {
      action,
      entity_type: entityType,
      entity_id: metadata.entityId || null,
      user_email: user.email,
      user_name: user.full_name,
      metadata: JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
      changes: metadata.changes ? JSON.stringify(metadata.changes) : null,
      severity: metadata.severity || 'info',
    };

    await base44.entities.AuditLog.create(logEntry);
  } catch (error) {
    // Fail silently but log to console for debugging
    console.error('Audit logging failed:', error);
  }
};

/**
 * Log helpers for common actions
 */
export const auditLog = {
  created: (entityType, entityId, metadata = {}) => 
    logEvent('created', entityType, { ...metadata, entityId }),
  
  updated: (entityType, entityId, changes, metadata = {}) => 
    logEvent('updated', entityType, { ...metadata, entityId, changes }),
  
  deleted: (entityType, entityId, metadata = {}) => 
    logEvent('deleted', entityType, { ...metadata, entityId, severity: 'warning' }),
  
  published: (entityType, entityId, metadata = {}) => 
    logEvent('published', entityType, { ...metadata, entityId, severity: 'info' }),
  
  approved: (entityType, entityId, metadata = {}) => 
    logEvent('approved', entityType, { ...metadata, entityId, severity: 'info' }),
  
  accessed: (entityType, entityId, metadata = {}) => 
    logEvent('accessed', entityType, { ...metadata, entityId }),
  
  exported: (entityType, entityId, metadata = {}) => 
    logEvent('exported', entityType, { ...metadata, entityId, severity: 'warning' }),
  
  critical: (action, entityType, metadata = {}) => 
    logEvent(action, entityType, { ...metadata, severity: 'critical' }),
};