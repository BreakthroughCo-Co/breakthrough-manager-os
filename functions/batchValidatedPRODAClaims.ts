import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { period_start, period_end } = payload;

    if (!period_start || !period_end) {
      return Response.json({ error: 'Missing period_start and period_end dates' }, { status: 400 });
    }

    // Fetch all NDIS claims marked as submitted (internally ready)
    const claims = await base44.asServiceRole.entities.NDISClaimData.filter({
      status: 'submitted'
    });

    if (claims.length === 0) {
      return Response.json({
        status: 'success',
        message: 'No validated claims to batch',
        claims_processed: 0,
        batch_id: null
      });
    }

    // Filter claims that have no critical PRODA errors
    const validatedClaims = [];
    for (const claim of claims) {
      const discrepancies = await base44.asServiceRole.entities.FinancialDiscrepancy.filter({
        ndis_claim_id: claim.id,
        severity: 'critical'
      });

      if (discrepancies.length === 0) {
        validatedClaims.push(claim);
      }
    }

    if (validatedClaims.length === 0) {
      return Response.json({
        status: 'success',
        message: 'No claims passed validation (all have critical errors)',
        claims_processed: 0,
        batch_id: null
      });
    }

    // Generate CSV file for PRODA submission
    const csvHeader = 'claim_number,client_name,service_date,ndis_line_item,claimed_hours,claimed_amount,practitioner_id\n';
    const csvRows = validatedClaims
      .map(
        (c) =>
          `${c.claim_number},${c.client_name},${c.service_date},${c.ndis_line_item},${c.claimed_hours},${c.claimed_amount},${c.id}`
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });

    // Upload file to private storage
    const fileUploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: csvBlob
    });

    const totalAmount = validatedClaims.reduce((sum, c) => sum + (c.claimed_amount || 0), 0);

    // Create PRODABulkUpload record
    const bulkUpload = await base44.asServiceRole.entities.PRODABulkUpload.create({
      upload_date: new Date().toISOString().split('T')[0],
      period_start: period_start,
      period_end: period_end,
      total_claims: validatedClaims.length,
      total_amount: totalAmount,
      file_url: fileUploadResult.file_uri,
      status: 'generated',
      billing_record_ids: JSON.stringify(validatedClaims.map((c) => c.id)),
      submitted_by: user.email,
      notes: `Auto-generated batch from validated claims between ${period_start} and ${period_end}`
    });

    // Create Task for Finance Manager review
    const managerEmail = Deno.env.get('MANAGER_EMAIL') || 'manager@example.com';
    const reviewTask = await base44.asServiceRole.entities.Task.create({
      title: `Review & Approve PRODA Batch [${period_start} to ${period_end}]`,
      description: `A new PRODA batch has been automatically generated and is ready for review and approval.

Total Claims: ${validatedClaims.length}
Total Amount: $${totalAmount.toFixed(2)}
Period: ${period_start} to ${period_end}
Batch ID: ${bulkUpload.id}

Action Required: Review the generated CSV file, verify all data is accurate, and approve for PRODA submission.`,
      category: 'Finance',
      priority: 'high',
      status: 'pending',
      assigned_to: managerEmail,
      related_entity_type: 'PRODABulkUpload',
      related_entity_id: bulkUpload.id
    });

    // Create audit trail
    await base44.asServiceRole.entities.ComplianceAuditTrail.create({
      event_type: 'task_created',
      event_description: `PRODA batch generated: ${validatedClaims.length} claims, $${totalAmount.toFixed(2)}`,
      related_entity_type: 'PRODABulkUpload',
      related_entity_id: bulkUpload.id,
      trigger_source: 'PRODA Batching System',
      timestamp: new Date().toISOString(),
      triggered_by_user: 'System',
      ai_insight: `Batch ready for manager review. ${validatedClaims.length} claims passed validation.`
    });

    return Response.json({
      status: 'success',
      batch_id: bulkUpload.id,
      claims_processed: validatedClaims.length,
      total_amount: totalAmount.toFixed(2),
      file_url: fileUploadResult.file_uri,
      review_task_id: reviewTask.id,
      assigned_to: managerEmail,
      message: 'Batch generated and assigned for review'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});