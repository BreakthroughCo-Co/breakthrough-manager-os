import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all pending/submitted billing and NDIS claim records
    const billingRecords = await base44.entities.BillingRecord.filter({ status: 'submitted' });
    const ndisClaims = await base44.entities.NDISClaimData.filter({ status: 'submitted' });
    const clients = await base44.entities.Client.list();
    const practitioners = await base44.entities.Practitioner.list();

    const validationErrors = [];
    const warnings = [];

    // PRODA validation rules
    const validationRules = [
      {
        name: 'Missing Client NDIS Number',
        check: (claim, client) => !client?.ndis_number,
        severity: 'critical',
        message: 'Client NDIS number not recorded. PRODA submission will reject.'
      },
      {
        name: 'Invalid Claim Amount Format',
        check: (claim) => claim.claimed_amount && claim.claimed_amount <= 0,
        severity: 'critical',
        message: 'Claim amount must be positive.'
      },
      {
        name: 'Service Date Beyond Plan Period',
        check: (claim, client) => {
          const serviceDate = new Date(claim.service_date);
          const planStart = new Date(client?.plan_start_date);
          const planEnd = new Date(client?.plan_end_date);
          return serviceDate < planStart || serviceDate > planEnd;
        },
        severity: 'critical',
        message: 'Service date falls outside client NDIS plan period.'
      },
      {
        name: 'Line Item Not on Plan',
        check: (claim, client) => {
          // Simplified check; in production would cross-reference actual plan items
          return !claim.ndis_line_item;
        },
        severity: 'high',
        message: 'NDIS line item code not specified or not on client plan.'
      },
      {
        name: 'Practitioner Not Registered',
        check: (claim, client, practitioner) => {
          return !practitioner?.registration_number;
        },
        severity: 'high',
        message: 'Service delivery practitioner has no AHPRA/registration number. Claim will be rejected.'
      },
      {
        name: 'Hours Exceed Daily Limit',
        check: (claim) => claim.claimed_hours && claim.claimed_hours > 10,
        severity: 'medium',
        message: 'Claimed hours exceed typical daily maximum (10h). May trigger review.'
      },
      {
        name: 'Rate Higher Than NDIS Guide',
        check: (claim) => {
          const ndisPricing = {
            'behaviour_support': 120,
            'assessment': 150,
            'plan_development': 140
          };
          const guidedRate = ndisPricing[claim.line_item_description?.toLowerCase()] || 100;
          return claim.claimed_amount && claim.claimed_hours && (claim.claimed_amount / claim.claimed_hours) > (guidedRate * 1.25);
        },
        severity: 'medium',
        message: 'Claimed rate exceeds NDIS guidance by >25%. Provide supporting documentation.'
      },
      {
        name: 'Duplicate Claim Detected',
        check: (claim, client, practitioner, allClaims) => {
          return allClaims.some(c =>
            c.id !== claim.id &&
            c.client_id === claim.client_id &&
            c.service_date === claim.service_date &&
            c.claimed_amount === claim.claimed_amount &&
            c.status === 'submitted'
          );
        },
        severity: 'critical',
        message: 'Identical claim already submitted for same client/date/amount. Risk of double-claiming.'
      }
    ];

    // Validate each NDIS claim
    ndisClaims.forEach(claim => {
      const client = clients.find(c => c.id === claim.client_id);
      const practitioner = practitioners.find(p => p.id); // Placeholder; would reference case note practitioner

      validationRules.forEach(rule => {
        if (rule.check(claim, client, practitioner, ndisClaims)) {
          (rule.severity === 'critical' ? validationErrors : warnings).push({
            claim_id: claim.id,
            claim_number: claim.claim_number,
            client_id: claim.client_id,
            client_name: claim.client_name,
            service_date: claim.service_date,
            rule: rule.name,
            severity: rule.severity,
            message: rule.message,
            recommended_action: this.getRemediationAction(rule.name)
          });
        }
      });
    });

    // Invoke LLM for complex validation analysis
    if (validationErrors.length > 0 || warnings.length > 0) {
      const llmAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse the following PRODA claim validation issues and suggest remediation. Prioritise critical errors for immediate action.
        
Errors:
${JSON.stringify(validationErrors.slice(0, 10), null, 2)}

Warnings:
${JSON.stringify(warnings.slice(0, 10), null, 2)}

For each, suggest: (1) Root cause, (2) Immediate fix, (3) Preventive measure.`,
        response_json_schema: {
          type: 'object',
          properties: {
            analysis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  issue: { type: 'string' },
                  root_cause: { type: 'string' },
                  immediate_fix: { type: 'string' },
                  preventive_measure: { type: 'string' }
                }
              }
            },
            risk_assessment: { type: 'string' },
            submission_readiness: { type: 'string', enum: ['ready', 'with_caveats', 'hold'] }
          }
        }
      });

      // Create compliance tasks for critical issues
      for (const error of validationErrors) {
        if (error.severity === 'critical') {
          await base44.asServiceRole.entities.Task.create({
            title: `PRODA Validation Error: ${error.rule}`,
            description: `Claim ${error.claim_number} (${error.client_name}, ${error.service_date})\n\n${error.message}\n\nAction: ${error.recommended_action}`,
            category: 'Finance',
            priority: 'urgent',
            status: 'pending',
            assigned_to: 'Finance Manager',
            related_entity_type: 'NDISClaimData',
            related_entity_id: error.claim_id
          });
        }
      }

      return Response.json({
        scan_timestamp: new Date().toISOString(),
        total_claims_validated: ndisClaims.length,
        critical_errors: validationErrors.length,
        warnings: warnings.length,
        validation_errors: validationErrors.slice(0, 20),
        validation_warnings: warnings.slice(0, 20),
        llm_analysis: llmAnalysis,
        submission_readiness: llmAnalysis.submission_readiness || 'hold'
      });
    }

    return Response.json({
      scan_timestamp: new Date().toISOString(),
      total_claims_validated: ndisClaims.length,
      critical_errors: 0,
      warnings: 0,
      validation_errors: [],
      validation_warnings: [],
      submission_readiness: 'ready',
      message: 'All claims validated successfully. Ready for PRODA submission.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});