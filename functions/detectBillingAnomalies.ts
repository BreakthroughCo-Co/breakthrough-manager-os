import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [billingRecords, ndisClaimsRaw, existingDiscs] = await Promise.all([
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 500),
      base44.asServiceRole.entities.NDISClaimData.list('-service_date', 500),
      base44.asServiceRole.entities.FinancialDiscrepancy.list('-created_date', 200),
    ]);

    const existingKeys = new Set(existingDiscs.map(d => `${d.client_id}-${d.service_date}-${d.ndis_line_item}-${d.discrepancy_type}`));

    const anomalies = [];

    // 1. Rate anomaly: billing rate > 20% above NDIS price guide typical rates
    const typicalRates = { 'Assessment': 193.99, 'Plan Development': 193.99, 'Direct Support': 65.09, 'Report Writing': 193.99 };
    for (const br of billingRecords) {
      const typical = typicalRates[br.service_type];
      if (typical && br.rate > typical * 1.2) {
        const key = `${br.client_id}-${br.service_date}-${br.ndis_line_item}-amount_mismatch`;
        if (!existingKeys.has(key)) {
          anomalies.push({
            client_id: br.client_id, client_name: br.client_name,
            billing_record_id: br.id, service_date: br.service_date,
            ndis_line_item: br.ndis_line_item,
            discrepancy_type: 'amount_mismatch',
            severity: 'high',
            internal_amount: br.total_amount, claimed_amount: null, variance_amount: null,
            internal_hours: br.duration_hours, claimed_hours: null, variance_hours: null,
            description: `Rate anomaly: $${br.rate}/hr is ${Math.round(((br.rate - typical) / typical) * 100)}% above typical NDIS rate of $${typical}/hr for ${br.service_type}.`,
            status: 'new'
          });
        }
      }
    }

    // 2. Duration anomaly: single session > 8 hours
    for (const br of billingRecords) {
      if (br.duration_hours > 8) {
        const key = `${br.client_id}-${br.service_date}-${br.ndis_line_item}-hour_mismatch`;
        if (!existingKeys.has(key)) {
          anomalies.push({
            client_id: br.client_id, client_name: br.client_name,
            billing_record_id: br.id, service_date: br.service_date,
            ndis_line_item: br.ndis_line_item,
            discrepancy_type: 'hour_mismatch',
            severity: 'high',
            internal_hours: br.duration_hours, claimed_hours: null, variance_hours: null,
            internal_amount: br.total_amount, claimed_amount: null, variance_amount: null,
            description: `Duration anomaly: ${br.duration_hours}h billed in a single session for ${br.service_type}. Exceeds 8h threshold.`,
            status: 'new'
          });
        }
      }
    }

    // 3. Duplicate detection: same client/date/line_item billed twice
    const billingGroups = {};
    for (const br of billingRecords) {
      const gk = `${br.client_id}-${br.service_date}-${br.ndis_line_item}`;
      if (!billingGroups[gk]) billingGroups[gk] = [];
      billingGroups[gk].push(br);
    }
    for (const [gk, group] of Object.entries(billingGroups)) {
      if (group.length > 1) {
        const br = group[0];
        const key = `${br.client_id}-${br.service_date}-${br.ndis_line_item}-other`;
        if (!existingKeys.has(key)) {
          anomalies.push({
            client_id: br.client_id, client_name: br.client_name,
            billing_record_id: br.id, service_date: br.service_date,
            ndis_line_item: br.ndis_line_item,
            discrepancy_type: 'other',
            severity: 'critical',
            description: `Duplicate billing: ${group.length} records for same client/date/line item (${br.ndis_line_item}). Potential duplicate claim.`,
            status: 'new'
          });
        }
      }
    }

    // 4. NDIS claim with no matching internal billing
    for (const claim of ndisClaimsRaw) {
      const hasBilling = billingRecords.some(br =>
        br.client_id === claim.client_id &&
        br.service_date === claim.service_date &&
        br.ndis_line_item === claim.ndis_line_item
      );
      if (!hasBilling) {
        const key = `${claim.client_id}-${claim.service_date}-${claim.ndis_line_item}-unmatched_claim`;
        if (!existingKeys.has(key)) {
          anomalies.push({
            client_id: claim.client_id, client_name: claim.client_name,
            ndis_claim_id: claim.id, service_date: claim.service_date,
            ndis_line_item: claim.ndis_line_item,
            discrepancy_type: 'unmatched_claim',
            severity: 'medium',
            claimed_amount: claim.claimed_amount, internal_amount: null,
            variance_amount: claim.claimed_amount,
            description: `NDIS claim (${claim.claim_number}) has no corresponding internal billing record for ${claim.service_date}.`,
            status: 'new'
          });
        }
      }
    }

    // AI analysis of anomalies if any found
    if (anomalies.length > 0) {
      const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an NDIS financial compliance auditor. Analyse these ${anomalies.length} billing anomalies and provide a brief ai_analysis (1-2 sentences) for each, focusing on root cause and corrective action under NDIS price guide rules. Return JSON array with index and ai_analysis fields.\n\nAnomalies:\n${JSON.stringify(anomalies.map((a, i) => ({ index: i, description: a.description, type: a.discrepancy_type, severity: a.severity })), null, 2)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            analyses: {
              type: 'array',
              items: {
                type: 'object',
                properties: { index: { type: 'number' }, ai_analysis: { type: 'string' } }
              }
            }
          }
        }
      });
      if (aiRes?.analyses) {
        for (const a of aiRes.analyses) {
          if (anomalies[a.index]) anomalies[a.index].ai_analysis = a.ai_analysis;
        }
      }
    }

    // Persist anomalies as FinancialDiscrepancy records
    let created = 0;
    for (const anomaly of anomalies) {
      await base44.asServiceRole.entities.FinancialDiscrepancy.create(anomaly);
      created++;
    }

    // Auto-create Tasks for critical anomalies
    const criticals = anomalies.filter(a => a.severity === 'critical');
    for (const c of criticals) {
      await base44.asServiceRole.entities.Task.create({
        title: `CRITICAL Billing Anomaly: ${c.discrepancy_type.replace(/_/g, ' ')} — ${c.client_name}`,
        description: c.description,
        category: 'Finance',
        priority: 'urgent',
        status: 'pending',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        related_entity_type: 'FinancialDiscrepancy'
      });
    }

    return Response.json({
      anomalies_detected: created,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      tasks_created: criticals.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});