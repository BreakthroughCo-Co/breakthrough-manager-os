import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Tenant isolation context
 * Provides organization-scoped data access throughout the app
 */
const TenantContext = createContext(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const user = await base44.auth.me();
      
      // In production: fetch user's organization
      // For now, create/fetch default org
      const orgs = await base44.entities.Organization.list();
      
      if (orgs.length === 0) {
        // Create default organization
        const newOrg = await base44.entities.Organization.create({
          name: 'Breakthrough Coaching & Consulting',
          plan_tier: 'professional',
          subscription_status: 'active',
          features_enabled: JSON.stringify([
            'clinical_tools',
            'compliance_suite',
            'ai_assistant',
            'reporting',
            'integrations'
          ]),
        });
        setOrganization(newOrg);
      } else {
        setOrganization(orgs[0]);
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    organization,
    orgId: organization?.id,
    loading,
    refreshOrg: loadOrganization,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};