import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { batch_id, new_status, notes, rejection_summary } = await req.json();

  if (!batch_id || !new_status) {
    return Response.json({ error: 'batch_id and new_status are required' }, { status: 400 });
  }

  const validTransitions = {
    generated: ['submitted_to_proda', 'draft'],
    draft: ['generated'],
    submitted_to_proda: ['partially_paid', 'paid', 'rejected'],
    partially_paid: ['paid'],
    rejected: ['generated']
  };

  const batch = await base44.asServiceRole.entities.PRODABulkUpload.filter({ id: batch_id });
  if (!batch || batch.length === 0) {
    return Response.json({ error: 'Batch not found' }, { status: 404 });
  }
  const currentBatch = batch[0];
  const allowed = validTransitions[currentBatch.status] || [];
  if (!allowed.includes(new_status)) {
    return Response.json({
      error: `Invalid transition: ${currentBatch.status} → ${new_status}. Allowed: ${allowed.join(', ') || 'none'}`
    }, { status: 422 });
  }

  const updatePayload = {
    status: new_status,
    submitted_by: user.email
  };
  if (notes) updatePayload.notes = notes;
  if (rejection_summary) updatePayload.rejection_summary = rejection_summary;

  // If being marked as submitted, link claim records
  if (new_status === 'submitted_to_proda') {
    const claimIds = JSON.parse(currentBatch.billing_record_ids || '[]');
    for (const claimId of claimIds) {
      await base44.asServiceRole.entities.NDISClaimData.update(claimId, {
        batch_id: batch_id,
        status: 'submitted'
      });
    }
  }

  // If rejected, flag claims for re-review
  if (new_status === 'rejected') {
    const claimIds = JSON.parse(currentBatch.billing_record_ids || '[]');
    for (const claimId of claimIds) {
      await base44.asServiceRole.entities.NDISClaimData.update(claimId, {
        status: 'queried',
        rejection_reason: notes || 'PRODA batch rejected — re-review required'
      });
    }
    // Create task for manager
    await base44.asServiceRole.entities.Task.create({
      title: `PRODA Batch Rejected — Action Required [Batch ${batch_id.slice(-8)}]`,
      description: `PRODA batch ${batch_id} was rejected. ${rejection_summary || ''}. All ${JSON.parse(currentBatch.billing_record_ids || '[]').length} claims have been flagged for re-review.`,
      category: 'Finance',
      priority: 'critical',
      status: 'pending',
      assigned_to: Deno.env.get('MANAGER_EMAIL') || user.email
    });
  }

  await base44.asServiceRole.entities.PRODABulkUpload.update(batch_id, updatePayload);

  // Audit trail
  await base44.asServiceRole.entities.ComplianceAuditTrail.create({
    event_type: 'reconciliation_completed',
    event_description: `PRODA batch ${batch_id.slice(-8)} status updated: ${currentBatch.status} → ${new_status}`,
    related_entity_type: 'PRODABulkUpload',
    related_entity_id: batch_id,
    trigger_source: 'Finance Manager',
    timestamp: new Date().toISOString(),
    triggered_by_user: user.email,
    severity: new_status === 'rejected' ? 'critical' : new_status === 'paid' ? 'info' : 'warning',
    ai_insight: notes || null
  });

  return Response.json({
    status: 'success',
    batch_id,
    previous_status: currentBatch.status,
    new_status,
    claims_updated: new_status === 'submitted_to_proda' || new_status === 'rejected'
      ? JSON.parse(currentBatch.billing_record_ids || '[]').length
      : 0
  });
});