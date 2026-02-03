/**
 * Deterministic Compliance Rules Engine
 * NO LLM ASSERTIONS - Pure rule-based compliance checking
 */

export class ComplianceRulesEngine {
  /**
   * NDIS Practice Standards - Deterministic Checks
   */
  static checkBSPCompliance(bsp, fba, serviceAgreement, abcRecords) {
    const violations = [];
    const warnings = [];
    
    // Rule 1: BSP must reference completed FBA
    if (!fba || fba.status !== 'completed') {
      violations.push({
        rule: 'BSP_REQUIRES_FBA',
        standard: '3A',
        severity: 'critical',
        message: 'BSP cannot be published without a completed FBA',
      });
    }
    
    // Rule 2: BSP must have minimum ABC data
    if (!abcRecords || abcRecords.length < 5) {
      violations.push({
        rule: 'INSUFFICIENT_ABC_DATA',
        standard: '3A',
        severity: 'critical',
        message: 'Minimum 5 ABC records required for BSP',
      });
    }
    
    // Rule 3: BSP effective date must be within service agreement
    if (serviceAgreement && bsp.effective_date) {
      const effective = new Date(bsp.effective_date);
      const agreementEnd = new Date(serviceAgreement.end_date);
      if (effective > agreementEnd) {
        violations.push({
          rule: 'BSP_OUTSIDE_AGREEMENT',
          standard: '2A',
          severity: 'high',
          message: 'BSP effective date exceeds service agreement period',
        });
      }
    }
    
    // Rule 4: BSP must have consent
    if (!bsp.consent_obtained || !bsp.consent_date) {
      violations.push({
        rule: 'CONSENT_MISSING',
        standard: '1A',
        severity: 'critical',
        message: 'Participant consent required before BSP publication',
      });
    }
    
    // Rule 5: BSP must have review date
    if (!bsp.review_date) {
      warnings.push({
        rule: 'NO_REVIEW_DATE',
        standard: '3A',
        severity: 'medium',
        message: 'BSP should have scheduled review date',
      });
    }
    
    // Rule 6: Review date must be within 12 months
    if (bsp.review_date) {
      const review = new Date(bsp.review_date);
      const effective = new Date(bsp.effective_date);
      const monthsDiff = (review - effective) / (1000 * 60 * 60 * 24 * 30);
      if (monthsDiff > 12) {
        warnings.push({
          rule: 'REVIEW_TOO_LATE',
          standard: '3A',
          severity: 'medium',
          message: 'BSP review should occur within 12 months',
        });
      }
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Restrictive Practice Compliance (Deterministic)
   */
  static checkRestrictivePracticeCompliance(practice) {
    const violations = [];
    
    // Rule 1: Must have authorization
    if (!practice.authorized_by || !practice.authorization_date) {
      violations.push({
        rule: 'RP_NO_AUTHORIZATION',
        standard: '1B',
        severity: 'critical',
        message: 'Restrictive practice requires authorization',
      });
    }
    
    // Rule 2: Authorization must not be expired
    if (practice.expiry_date) {
      const expiry = new Date(practice.expiry_date);
      if (expiry < new Date()) {
        violations.push({
          rule: 'RP_AUTHORIZATION_EXPIRED',
          standard: '1B',
          severity: 'critical',
          message: 'Restrictive practice authorization expired',
        });
      }
    }
    
    // Rule 3: Must have reduction plan
    if (!practice.reduction_plan) {
      violations.push({
        rule: 'RP_NO_REDUCTION_PLAN',
        standard: '1B',
        severity: 'critical',
        message: 'Restrictive practice requires reduction plan',
      });
    }
    
    // Rule 4: Must link to BSP
    if (!practice.bsp_id) {
      violations.push({
        rule: 'RP_NO_BSP_LINK',
        standard: '3A',
        severity: 'critical',
        message: 'Restrictive practice must link to BSP',
      });
    }
    
    // Rule 5: NDIS notification required within 5 days
    if (!practice.ndis_notified) {
      violations.push({
        rule: 'RP_NDIS_NOT_NOTIFIED',
        standard: '1B',
        severity: 'high',
        message: 'NDIS must be notified of restrictive practice use',
      });
    }
    
    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Practitioner Compliance Checks
   */
  static checkPractitionerCompliance(practitioner, clients, caseworkLoad) {
    const violations = [];
    const warnings = [];
    
    // Rule 1: Active practitioners must have registration
    if (practitioner.status === 'active' && !practitioner.registration_number) {
      violations.push({
        rule: 'NO_REGISTRATION',
        standard: '4A',
        severity: 'critical',
        message: 'Active practitioner requires NDIS registration',
      });
    }
    
    // Rule 2: Caseload must not exceed capacity
    if (practitioner.current_caseload > practitioner.caseload_capacity) {
      warnings.push({
        rule: 'CASELOAD_EXCEEDED',
        standard: '4A',
        severity: 'high',
        message: `Caseload (${practitioner.current_caseload}) exceeds capacity (${practitioner.caseload_capacity})`,
      });
    }
    
    // Rule 3: Must have PBS certification for PBS work
    const hasPBSClients = clients.some(c => c.service_type === 'Behaviour Support');
    const hasPBSCert = practitioner.certifications?.some(c => 
      c.includes('PBS') || c.includes('Behaviour Support')
    );
    if (hasPBSClients && !hasPBSCert) {
      violations.push({
        rule: 'PBS_CERT_REQUIRED',
        standard: '4A',
        severity: 'critical',
        message: 'PBS certification required for behaviour support clients',
      });
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Client Plan Compliance
   */
  static checkClientPlanCompliance(client, ndisPlans, serviceAgreements) {
    const violations = [];
    const warnings = [];
    
    // Rule 1: Active client must have current NDIS plan
    if (client.status === 'active') {
      if (!client.plan_end_date) {
        violations.push({
          rule: 'NO_PLAN_END_DATE',
          standard: '2A',
          severity: 'high',
          message: 'Active client missing NDIS plan end date',
        });
      } else {
        const planEnd = new Date(client.plan_end_date);
        if (planEnd < new Date()) {
          violations.push({
            rule: 'PLAN_EXPIRED',
            standard: '2A',
            severity: 'critical',
            message: 'Client NDIS plan has expired',
          });
        }
        
        // Warning if plan expires within 60 days
        const daysToExpiry = (planEnd - new Date()) / (1000 * 60 * 60 * 24);
        if (daysToExpiry < 60 && daysToExpiry > 0) {
          warnings.push({
            rule: 'PLAN_EXPIRING_SOON',
            standard: '2A',
            severity: 'medium',
            message: `NDIS plan expires in ${Math.round(daysToExpiry)} days`,
          });
        }
      }
    }
    
    // Rule 2: Must have service agreement
    const activeAgreement = serviceAgreements?.find(sa => sa.status === 'active');
    if (!activeAgreement) {
      violations.push({
        rule: 'NO_SERVICE_AGREEMENT',
        standard: '2A',
        severity: 'high',
        message: 'Active client requires service agreement',
      });
    }
    
    // Rule 3: Funding utilization tracking
    if (client.funding_allocated && !client.funding_utilised) {
      warnings.push({
        rule: 'NO_FUNDING_TRACKING',
        standard: '2A',
        severity: 'medium',
        message: 'Funding utilization not being tracked',
      });
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      warnings,
    };
  }
}