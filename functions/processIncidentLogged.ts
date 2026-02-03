import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Zero-Touch Compliance Pipeline: Incident Logged
 * Trigger: Incident created → RP cross-check → mandatory review
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);
  
  try {
    const { event, data } = await req.json();
    
    if (event.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const incident = data;
    const steps = [];
    const pipelineId = `pipeline_${Date.now()}`;

    // Step 1: Cross-check restrictive practice usage
    if (incident.restrictive_practice_used?.practice_used) {
      try {
        const rpRecords = await base44.asServiceRole.entities.RestrictivePractice.filter({
          client_id: incident.participants_involved?.[0]?.participant_id,
        });

        const authorized = rpRecords.some(rp =>
          rp.practice_type === incident.restrictive_practice_used.practice_type &&
          rp.status === 'active' &&
          new Date(rp.expiry_date) > new Date()
        );

        steps.push({
          step: 'rp_cross_check',
          authorized,
          practice_type: incident.restrictive_practice_used.practice_type,
        });

        if (!authorized) {
          // Create critical alert
          await base44.asServiceRole.entities.RiskAlert.create({
            alert_type: 'organisational_risk',
            entity_type: 'organisation',
            entity_id: 'org',
            entity_name: 'Compliance Alert',
            risk_score: 100,
            risk_level: 'critical',
            alert_category: 'compliance_gap',
            metrics: JSON.stringify({
              incident_id: incident.id,
              unauthorized_rp: true,
            }),
            flags: JSON.stringify([
              'UNAUTHORIZED RESTRICTIVE PRACTICE USE',
              `Practice type: ${incident.restrictive_practice_used.practice_type}`,
              `Incident: ${incident.id}`,
            ]),
            recommendations: JSON.stringify([
              'Immediate review required',
              'Notify NDIS Quality and Safeguards Commission',
              'Conduct internal investigation',
            ]),
            severity: 'critical',
            status: 'active',
          });

          steps.push({ step: 'critical_alert_raised' });
        }
      } catch (error) {
        steps.push({ step: 'rp_cross_check_failed', error: error.message });
      }
    }

    // Step 2: Trigger mandatory review for high-severity incidents
    const highSeverity = incident.consequences?.injuries?.some(i =>
      i.severity === 'major' || i.severity === 'critical'
    ) || incident.incident_type === 'safeguarding';

    if (highSeverity) {
      try {
        const review = await base44.asServiceRole.entities.ScheduledReview.create({
          review_type: 'risk_assessment',
          entity_type: 'IncidentReport',
          entity_id: incident.id,
          entity_name: `Incident Review - ${incident.participants_involved?.[0]?.participant_name}`,
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'urgent',
          status: 'pending',
          notes: 'High-severity incident requires immediate review',
        });
        steps.push({ step: 'mandatory_review_scheduled', entity_id: review.id });
      } catch (error) {
        steps.push({ step: 'review_scheduling_failed', error: error.message });
      }
    }

    // Step 3: Check if BSP exists and create review task
    const clientId = incident.participants_involved?.[0]?.participant_id;
    if (clientId && incident.incident_type === 'behaviour_of_concern') {
      try {
        const bsps = await base44.asServiceRole.entities.BehaviourSupportPlan.filter({
          client_id: clientId,
          lifecycle_stage: 'published',
        });

        if (bsps.length > 0) {
          const task = await base44.asServiceRole.entities.Task.create({
            title: `Review BSP Following Incident`,
            description: `Review BSP effectiveness following incident ${incident.id}`,
            category: 'Clinical',
            priority: 'urgent',
            status: 'pending',
            assigned_to: bsps[0].author_name,
            related_entity_type: 'BehaviourSupportPlan',
            related_entity_id: bsps[0].id,
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
          steps.push({ step: 'bsp_review_task_created', entity_id: task.id });
        }
      } catch (error) {
        steps.push({ step: 'bsp_task_failed', error: error.message });
      }
    }

    // Step 4: Audit logging
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'incident_logged_pipeline',
      entity_type: 'IncidentReport',
      entity_id: incident.id,
      user_email: incident.reported_by?.email || 'system',
      user_name: incident.reported_by?.name || 'System',
      metadata: JSON.stringify({ pipeline_id: pipelineId, steps }),
      severity: highSeverity ? 'critical' : 'warning',
    });

    // Record pipeline
    const executionTime = Date.now() - startTime;
    await base44.asServiceRole.entities.CompliancePipeline.create({
      pipeline_name: 'Incident Logged Pipeline',
      trigger_event: 'incident_created',
      entity_type: 'IncidentReport',
      entity_id: incident.id,
      steps_executed: JSON.stringify(steps),
      status: 'completed',
      executed_by: 'system',
      execution_time_ms: executionTime,
      reversible: false,
    });

    return Response.json({
      success: true,
      pipeline_id: pipelineId,
      steps_completed: steps.length,
      execution_time_ms: executionTime,
    });
  } catch (error) {
    console.error('Pipeline error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});