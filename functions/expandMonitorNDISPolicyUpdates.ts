import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { ndis_policy_text, ndis_policy_title } = payload;

    if (!ndis_policy_text || !ndis_policy_title) {
      return Response.json({ error: 'Missing required fields: ndis_policy_text, ndis_policy_title' }, { status: 400 });
    }

    // Fetch all internal policy documents
    const internalPolicies = await base44.asServiceRole.entities.InternalPolicyDocument.list();

    if (internalPolicies.length === 0) {
      // No internal policies to compare against yet
      return Response.json({
        status: 'success',
        message: 'NDIS policy detected but no internal policies to compare',
        divergences: [],
        tasks_created: 0
      });
    }

    // LLM comparison for divergences
    const comparisonPrompt = `
You are a compliance expert specializing in NDIS regulations and practice management. 
A new NDIS policy has been detected:

NDIS Policy Title: ${ndis_policy_title}
NDIS Policy Text:
${ndis_policy_text}

Current internal policies and procedures:
${internalPolicies
  .map(
    (p) => `
Policy: ${p.title}
Category: ${p.category}
Content: ${p.content || 'No content provided'}
`
  )
  .join('\n')}

Analyze the new NDIS policy against our current internal policies. Identify:
1. Any divergences or gaps where our internal policies do not align with the new NDIS policy
2. Categorize each divergence by criticality (critical, high, medium, low)
3. Suggest required internal policy updates

Return a JSON array with objects containing:
{
  "policy_category": "string (internal policy category affected)",
  "divergence": "string (description of gap/divergence)",
  "criticality": "string (critical|high|medium|low)",
  "required_action": "string (what needs to be updated)"
}
`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: comparisonPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          divergences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                policy_category: { type: 'string' },
                divergence: { type: 'string' },
                criticality: { type: 'string' },
                required_action: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const divergences = llmResponse.divergences || [];
    let complianceItemsCreated = 0;
    let tasksCreated = 0;
    let auditTrailsCreated = 0;

    // Create ComplianceItem records for each divergence
    for (const divergence of divergences) {
      const complianceItem = await base44.asServiceRole.entities.ComplianceItem.create({
        title: `Policy Divergence: ${divergence.policy_category}`,
        category: 'NDIS Regulation',
        description: `${divergence.divergence}\n\nRequired Action: ${divergence.required_action}`,
        priority: divergence.criticality,
        status: 'pending_review',
        notes: `Detected from NDIS policy update: ${ndis_policy_title}`
      });

      complianceItemsCreated++;

      // Create ComplianceAuditTrail entry
      await base44.asServiceRole.entities.ComplianceAuditTrail.create({
        event_type: 'internal_policy_divergence',
        event_description: `Policy divergence detected: ${divergence.divergence}`,
        related_entity_type: 'ComplianceItem',
        related_entity_id: complianceItem.id,
        trigger_source: 'NDIS Policy Monitor',
        timestamp: new Date().toISOString(),
        triggered_by_user: 'System',
        ai_insight: divergence.required_action,
        severity: divergence.criticality === 'critical' || divergence.criticality === 'high' ? 'critical' : 'warning'
      });

      auditTrailsCreated++;

      // Create Task for high/critical divergences
      if (divergence.criticality === 'critical' || divergence.criticality === 'high') {
        const task = await base44.asServiceRole.entities.Task.create({
          title: `Review & Update Policy: ${divergence.policy_category}`,
          description: `${divergence.divergence}\n\nAction Required: ${divergence.required_action}`,
          category: 'Compliance',
          priority: divergence.criticality === 'critical' ? 'urgent' : 'high',
          status: 'pending',
          related_entity_type: 'ComplianceItem',
          related_entity_id: complianceItem.id,
          notes: `NDIS Policy Update: ${ndis_policy_title}`
        });

        tasksCreated++;
      }
    }

    // Create ComplianceAuditTrail for policy update detection
    await base44.asServiceRole.entities.ComplianceAuditTrail.create({
      event_type: 'policy_update_detected',
      event_description: `NDIS policy update detected: ${ndis_policy_title}`,
      trigger_source: 'NDIS Policy Monitor',
      timestamp: new Date().toISOString(),
      triggered_by_user: 'System',
      ai_insight: `${divergences.length} divergences identified between NDIS policy and internal procedures`,
      severity: divergences.some(d => d.criticality === 'critical') ? 'critical' : 'warning'
    });

    return Response.json({
      status: 'success',
      message: 'NDIS policy comparison completed',
      divergences_found: divergences.length,
      compliance_items_created: complianceItemsCreated,
      tasks_created: tasksCreated,
      audit_trails_created: auditTrailsCreated + 1
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});