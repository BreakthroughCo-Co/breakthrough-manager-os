import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // NDIS pricing reference (sample; should be externally sourced)
    const ndisPricing = {
      'behaviour_support_direct': 120,
      'assessment': 150,
      'plan_development': 140,
      'plan_review': 130,
      'report_writing': 100,
      'travel': 80,
      'group_session': 60
    };

    // Fetch billing and claim data
    const billingRecords = await base44.entities.BillingRecord.list();
    const ndisClaims = await base44.entities.NDISClaimData.list();
    const discrepancies = [];
    const tasksToCreate = [];

    // 1. RATE MISMATCH DETECTION (>20% above NDIS guidance)
    billingRecords.forEach(br => {
      const expectedRate = ndisPricing[br.service_type?.toLowerCase().replace(/ /g, '_')] || 100;
      const rateVariance = ((br.rate - expectedRate) / expectedRate) * 100;
      
      if (rateVariance > 20) {
        discrepancies.push({
          billing_record_id: br.id,
          client_id: br.client_id,
          client_name: br.client_name,
          service_date: br.service_date,
          discrepancy_type: 'amount_mismatch',
          severity: rateVariance > 40 ? 'critical' : 'high',
          internal_amount: br.total_amount,
          claimed_amount: null,
          variance_amount: br.total_amount - (expectedRate * br.duration_hours),
          description: `Billing rate $${br.rate}/hr exceeds NDIS guidance ($${expectedRate}/hr) by ${Math.round(rateVariance)}%`,
          ai_analysis: `Rate variance detected. Verify against current NDIS pricing catalogue and service agreement. If legitimate (e.g., senior practitioner uplift), document exception in service record.`
        });
      }
    });

    // 2. UNUSUALLY LONG SESSION DETECTION (>8 hours)
    billingRecords.forEach(br => {
      if (br.duration_hours > 8) {
        discrepancies.push({
          billing_record_id: br.id,
          client_id: br.client_id,
          client_name: br.client_name,
          service_date: br.service_date,
          discrepancy_type: 'hour_mismatch',
          severity: br.duration_hours > 12 ? 'critical' : 'high',
          internal_hours: br.duration_hours,
          claimed_hours: null,
          variance_hours: br.duration_hours - 8,
          description: `Session duration ${br.duration_hours}h exceeds typical maximum (8h). Verify accuracy and client consent.`,
          ai_analysis: `Unusually prolonged session. Confirm: (a) accurate duration recording, (b) client fatigue/safety protocols observed, (c) NDIS line item supports extended delivery.`
        });
      }
    });

    // 3. DUPLICATE BILLING DETECTION (same client, service type, date within 2 hours)
    const billedByDate = {};
    billingRecords.forEach(br => {
      const key = `${br.client_id}_${br.service_type}_${br.service_date}`;
      if (!billedByDate[key]) billedByDate[key] = [];
      billedByDate[key].push(br);
    });

    Object.entries(billedByDate).forEach(([key, records]) => {
      if (records.length > 1) {
        const sorted = records.sort((a, b) => new Date(a.service_date) - new Date(b.service_date));
        for (let i = 0; i < sorted.length - 1; i++) {
          discrepancies.push({
            billing_record_id: sorted[i].id,
            client_id: sorted[i].client_id,
            client_name: sorted[i].client_name,
            service_date: sorted[i].service_date,
            discrepancy_type: 'unclaimed_internal',
            severity: 'high',
            internal_amount: sorted[i].total_amount,
            claimed_amount: null,
            variance_amount: sorted[i].total_amount,
            description: `Potential duplicate billing detected: ${records.length} entries for ${sorted[i].service_type} on ${sorted[i].service_date}`,
            ai_analysis: `Duplicate records detected. Verify: (a) whether both sessions actually occurred, (b) if combined into single session, flag secondary records for deletion or adjustment.`
          });
        }
      }
    });

    // 4. UNMATCHED INTERNAL BILLING (no corresponding NDIS claim)
    billingRecords.forEach(br => {
      const matchedClaim = ndisClaims.find(nc => 
        nc.client_id === br.client_id &&
        nc.service_date === br.service_date &&
        nc.claimed_amount === br.total_amount
      );

      if (!matchedClaim && br.status === 'submitted') {
        discrepancies.push({
          billing_record_id: br.id,
          client_id: br.client_id,
          client_name: br.client_name,
          service_date: br.service_date,
          discrepancy_type: 'unclaimed_internal',
          severity: 'medium',
          internal_amount: br.total_amount,
          claimed_amount: 0,
          variance_amount: br.total_amount,
          description: `Internal billing record for $${br.total_amount} has no corresponding NDIS claim submitted`,
          ai_analysis: `Verify client eligibility, plan balance, and NDIS line item availability. If legitimate, generate claim submission. If client reached funding threshold, flag for plan review scheduling.`
        });
      }
    });

    // 5. UNMATCHED NDIS CLAIMS (claim without internal billing)
    ndisClaims.forEach(nc => {
      const matchedBilling = billingRecords.find(br =>
        br.client_id === nc.client_id &&
        br.service_date === nc.service_date &&
        br.total_amount === nc.claimed_amount
      );

      if (!matchedBilling && nc.status === 'submitted') {
        discrepancies.push({
          ndis_claim_id: nc.id,
          client_id: nc.client_id,
          client_name: nc.client_name,
          service_date: nc.service_date,
          discrepancy_type: 'unmatched_claim',
          severity: 'high',
          claimed_amount: nc.claimed_amount,
          internal_amount: 0,
          variance_amount: nc.claimed_amount,
          description: `NDIS claim $${nc.claimed_amount} submitted without corresponding internal billing record`,
          ai_analysis: `Potential invoice/receipt generation issue. Verify: (a) internal billing record exists but was not matched (data quality), (b) if claim is phantom, reverse via PRODA.`
        });
      }
    });

    // Create FinancialDiscrepancy records
    let created = 0;
    for (const disc of discrepancies) {
      const result = await base44.asServiceRole.entities.FinancialDiscrepancy.create({
        ...disc,
        status: 'new'
      });
      created++;

      // Auto-create Task for critical/high severity
      if (disc.severity === 'critical' || disc.severity === 'high') {
        tasksToCreate.push({
          title: `Financial Discrepancy: ${disc.description.substring(0, 60)}`,
          description: `AI Analysis: ${disc.ai_analysis}`,
          category: 'Finance',
          priority: disc.severity === 'critical' ? 'urgent' : 'high',
          status: 'pending',
          related_entity_type: 'FinancialDiscrepancy',
          related_entity_id: result.id
        });
      }
    }

    // Create tasks in batch
    if (tasksToCreate.length > 0) {
      await base44.asServiceRole.entities.Task.bulkCreate(tasksToCreate);
    }

    return Response.json({
      scan_timestamp: new Date().toISOString(),
      anomalies_detected: discrepancies.length,
      critical: discrepancies.filter(d => d.severity === 'critical').length,
      high: discrepancies.filter(d => d.severity === 'high').length,
      medium: discrepancies.filter(d => d.severity === 'medium').length,
      discrepancies_created: created,
      tasks_created: tasksToCreate.length,
      by_type: {
        rate_mismatch: discrepancies.filter(d => d.discrepancy_type === 'amount_mismatch').length,
        hour_mismatch: discrepancies.filter(d => d.discrepancy_type === 'hour_mismatch').length,
        unclaimed_internal: discrepancies.filter(d => d.discrepancy_type === 'unclaimed_internal').length,
        unmatched_claim: discrepancies.filter(d => d.discrepancy_type === 'unmatched_claim').length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});