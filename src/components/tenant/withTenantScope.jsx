import { base44 } from '@/api/base44Client';

/**
 * Utility to add tenant isolation to queries
 * Ensures all data queries are scoped to the organization
 */

// In production, this would fetch orgId from user context
let _cachedOrgId = null;

export const initTenantScope = async () => {
  try {
    const orgs = await base44.entities.Organization.list();
    if (orgs.length > 0) {
      _cachedOrgId = orgs[0].id;
    }
  } catch (error) {
    console.error('Failed to init tenant scope:', error);
  }
};

/**
 * Add org_id filter to query
 */
export const withTenantScope = (filters = {}) => {
  if (!_cachedOrgId) {
    console.warn('Tenant scope not initialized. Call initTenantScope() first.');
    return filters;
  }
  
  return {
    ...filters,
    org_id: _cachedOrgId,
  };
};

/**
 * Add org_id to entity data before creation
 */
export const addTenantScope = (data) => {
  if (!_cachedOrgId) {
    console.warn('Tenant scope not initialized.');
    return data;
  }
  
  return {
    ...data,
    org_id: _cachedOrgId,
  };
};

/**
 * Tenant-scoped query helpers
 */
export const tenantQuery = {
  list: async (entityType, sortBy = '-created_date', limit = 50) => {
    await initTenantScope();
    return base44.entities[entityType].filter(
      withTenantScope(),
      sortBy,
      limit
    );
  },
  
  filter: async (entityType, filters, sortBy = '-created_date', limit = 50) => {
    await initTenantScope();
    return base44.entities[entityType].filter(
      withTenantScope(filters),
      sortBy,
      limit
    );
  },
  
  create: async (entityType, data) => {
    await initTenantScope();
    return base44.entities[entityType].create(addTenantScope(data));
  },
  
  bulkCreate: async (entityType, dataArray) => {
    await initTenantScope();
    const scopedData = dataArray.map(data => addTenantScope(data));
    return base44.entities[entityType].bulkCreate(scopedData);
  },
};