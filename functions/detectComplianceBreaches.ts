import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { date_range_days = 30 } = await req.json();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - date_range_days);

    // Fetch relevant data
    const [incidents, bsps, communications, restrictivePractices] = await Promise.all([
      base44.asServiceRole.entities.Incident.list('-incident_date', 100),
      base44.asServiceRole.entities.BehaviourSupportPlan.list('-updated_date', 100),
      base44.asServiceRole.entities.ClientCommunication.list('-sent_date', 100),
      base44.asServiceRole.entities.RestrictivePractice.list('-updated_date', 100),
    ]);

    const recentIncidents = incidents.filter(i => new Date(i.incident_date) > cutoffDate);
    
    // Build analysis context
    const analysisContext = `
Analyze the following NDIS service delivery data for potential compliance breaches:

RECENT INCIDENTS (${recentIncidents.length}):
${recentIncidents.slice(0, 20).map(i => `
- Date: ${new Date(i.incident_date).toLocaleDateString()}
- Category: ${i.category}
- Severity: ${i.severity}
- NDIS Reportable: ${i.ndis_reportable}
- Restrictive Practice Used: ${i.restrictive_practice_used}
- Status: ${i.status}
- Description: ${i.description.substring(0, 150)}
`).join('\n')}

RESTRICTIVE PRACTICES (${restrictivePractices.length}):
${restrictivePractices.slice(0, 10).map(rp => `
- Type: ${rp.practice_type}
- Authorization Status: ${rp.authorisation_status}
- Last Review: ${rp.last_review_date || 'Not recorded'}
`).join('\n')}

BSP DOCUMENTATION STATUS:
- Active BSPs: ${bsps.filter(b => b.status === 'active').length}
- Pending Approval: ${bsps.filter(b => b.status === 'pending_approval').length}
- Under Review: ${bsps.filter(b => b.status === 'under_review').length}

Identify potential NDIS compliance breaches in the following categories:
1. Unauthorized restrictive practices
2. Reportable incidents not properly documented
3. Missing or outdated consent
4. Documentation gaps in BSPs
5. Service delivery failures

For each potential breach identified, provide:
- breach_type (exact match from enum)
- severity (low/medium/high/critical)
- description (specific issue)
- evidence (what data points indicate the breach)
- ndis_clauses (relevant NDIS Practice Standards sections)
- required_actions (specific remediation steps)

Return as JSON array of breach objects. Be specific and cite evidence.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisContext,
      response_json_schema: {
        type: "object",
        properties: {
          breaches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                breach_type: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                evidence: { type: "array", items: { type: "string" } },
                ndis_clauses: { type: "string" },
                required_actions: { type: "array", items: { type: "string" } },
                related_entity_type: { type: "string" },
                related_entity_id: { type: "string" }
              }
            }
          }
        }
      }
    });

    const breaches = result.breaches || [];
    const createdBreaches = [];

    // Create breach records
    for (const breach of breaches) {
      const breachRecord = await base44.asServiceRole.entities.ComplianceBreach.create({
        breach_type: breach.breach_type,
        severity: breach.severity,
        description: breach.description,
        evidence: JSON.stringify(breach.evidence || []),
        ndis_clauses: breach.ndis_clauses,
        required_actions: JSON.stringify(breach.required_actions || []),
        detected_date: new Date().toISOString(),
        detected_by: 'compliance_auditor',
        status: 'identified',
        related_entity_type: breach.related_entity_type,
        related_entity_id: breach.related_entity_id,
      });
      createdBreaches.push(breachRecord);
    }

    return Response.json({
      breaches_detected: createdBreaches.length,
      breaches: createdBreaches,
      analysis_period_days: date_range_days
    });
  } catch (error) {
    console.error('Breach detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});