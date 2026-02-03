import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Zero-Touch Compliance Pipeline: BSP Approval
 * Trigger: BSP approved → compliance register → audit pack → tasks
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);
  
  try {
    const { event, data } = await req.json();
    
    if (event.type !== 'update' || data.lifecycle_stage !== 'approved') {
      return Response.json({ skipped: true, reason: 'Not an approval event' });
    }

    const bsp = data;
    const steps = [];
    const pipelineId = `pipeline_${Date.now()}`;

    // Step 1: Update compliance register
    try {
      const complianceItem = await base44.asServiceRole.entities.ComplianceItem.create({
        title: `BSP Approved - ${bsp.client_name}`,
        category: 'Clinical Governance',
        status: 'compliant',
        last_reviewed: new Date().toISOString(),
        responsible_person: bsp.approved_by,
        evidence_url: `/bsp/${bsp.id}`,
        notes: `BSP v${bsp.version_number} approved on ${bsp.approved_date}`,
      });
      steps.push({
        step: 'compliance_register_updated',
        entity_id: complianceItem.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      steps.push({ step: 'compliance_register_failed', error: error.message });
    }

    // Step 2: Check for restrictive practices → create register entries
    if (bsp.restrictive_practices && bsp.restrictive_practices.length > 0) {
      for (const rp of bsp.restrictive_practices) {
        try {
          const rpRecord = await base44.asServiceRole.entities.RestrictivePractice.create({
            client_id: bsp.client_id,
            client_name: bsp.client_name,
            practice_type: rp.practice_type,
            description: rp.description,
            bsp_id: bsp.id,
            authorized_by: bsp.approved_by,
            authorization_date: bsp.approved_date,
            status: 'active',
          });
          steps.push({
            step: 'restrictive_practice_registered',
            practice_type: rp.practice_type,
            entity_id: rpRecord.id,
          });
        } catch (error) {
          steps.push({ step: 'rp_registration_failed', error: error.message });
        }
      }
    }

    // Step 3: Schedule mandatory BSP review (12 months)
    try {
      const reviewDue = new Date(bsp.effective_date);
      reviewDue.setMonth(reviewDue.getMonth() + 12);
      
      const scheduledReview = await base44.asServiceRole.entities.ScheduledReview.create({
        review_type: 'bsp_mandatory',
        entity_type: 'BehaviourSupportPlan',
        entity_id: bsp.id,
        entity_name: `${bsp.client_name} BSP`,
        due_date: reviewDue.toISOString().split('T')[0],
        assigned_to: bsp.author_name,
        priority: 'scheduled',
        status: 'pending',
      });
      steps.push({
        step: 'review_scheduled',
        review_due: reviewDue.toISOString(),
        entity_id: scheduledReview.id,
      });
    } catch (error) {
      steps.push({ step: 'review_scheduling_failed', error: error.message });
    }

    // Step 4: Create task for practitioner
    try {
      const task = await base44.asServiceRole.entities.Task.create({
        title: `Monitor BSP Implementation - ${bsp.client_name}`,
        description: `Track implementation of newly approved BSP v${bsp.version_number}`,
        category: 'Clinical',
        priority: 'high',
        status: 'pending',
        assigned_to: bsp.author_name,
        related_entity_type: 'BehaviourSupportPlan',
        related_entity_id: bsp.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      steps.push({
        step: 'task_created',
        entity_id: task.id,
      });
    } catch (error) {
      steps.push({ step: 'task_creation_failed', error: error.message });
    }

    // Step 5: Log audit event
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'bsp_approved_pipeline',
        entity_type: 'BehaviourSupportPlan',
        entity_id: bsp.id,
        user_email: bsp.approved_by || 'system',
        user_name: bsp.approved_by || 'System',
        metadata: JSON.stringify({
          pipeline_id: pipelineId,
          steps_completed: steps.filter(s => !s.error).length,
          steps_failed: steps.filter(s => s.error).length,
        }),
        severity: 'info',
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }

    // Step 6: Record pipeline execution
    const executionTime = Date.now() - startTime;
    await base44.asServiceRole.entities.CompliancePipeline.create({
      pipeline_name: 'BSP Approval Pipeline',
      trigger_event: 'bsp_approved',
      entity_type: 'BehaviourSupportPlan',
      entity_id: bsp.id,
      steps_executed: JSON.stringify(steps),
      status: steps.some(s => s.error) ? 'failed' : 'completed',
      executed_by: bsp.approved_by || 'system',
      execution_time_ms: executionTime,
      reversible: true,
    });

    return Response.json({
      success: true,
      pipeline_id: pipelineId,
      steps_completed: steps.filter(s => !s.error).length,
      steps_failed: steps.filter(s => s.error).length,
      execution_time_ms: executionTime,
      steps,
    });
  } catch (error) {
    console.error('Pipeline error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});