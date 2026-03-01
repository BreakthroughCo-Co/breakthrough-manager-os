import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all recent performance metrics
    const metrics = await base44.asServiceRole.entities.PerformanceMetric.list('-metric_date', 100);

    const alerts = [];
    const tasksCreated = [];

    for (const metric of metrics) {
      const alertReasons = [];

      // Check billable hours variance
      if (metric.actual_billable_hours && metric.predicted_billable_hours) {
        const variance = Math.abs(metric.actual_billable_hours - metric.predicted_billable_hours);
        if (variance > metric.predicted_billable_hours * 0.3) {
          alertReasons.push(
            `Billable hours significantly below prediction (${metric.actual_billable_hours.toFixed(1)} vs ${metric.predicted_billable_hours.toFixed(1)})`
          );
        }
      }

      // Check caseload efficiency
      if (metric.caseload_efficiency_score && metric.caseload_efficiency_score < 30) {
        alertReasons.push(`Caseload severely under-utilised (${metric.caseload_efficiency_score.toFixed(0)}%)`);
      }

      // Check burnout risk
      if (metric.risk_of_burnout || (metric.burnout_score && metric.burnout_score > 70)) {
        alertReasons.push(`High burnout risk detected (score: ${metric.burnout_score || 'N/A'})`);
      }

      // Check compliance score
      if (metric.compliance_score && metric.compliance_score < 80) {
        alertReasons.push(`Compliance score below threshold (${metric.compliance_score.toFixed(0)}%)`);
      }

      // Create alert if any deviation detected
      if (alertReasons.length > 0) {
        const alert = {
          practitioner_id: metric.practitioner_id,
          practitioner_name: metric.practitioner_name,
          alert_reasons: alertReasons,
          severity: metric.risk_of_burnout ? 'high' : 'medium',
          metric_id: metric.id
        };

        alerts.push(alert);

        // Create Task for manager
        const task = await base44.asServiceRole.entities.Task.create({
          title: `Performance Alert: ${metric.practitioner_name}`,
          description: `${alert.severity.toUpperCase()} Priority Performance Issue\n\n${alertReasons.join('\n')}\n\nMetric Details:\n- Caseload: ${metric.current_caseload}/${metric.caseload_capacity}\n- Efficiency: ${metric.caseload_efficiency_score.toFixed(0)}%\n- Compliance: ${metric.compliance_score.toFixed(0)}%`,
          category: 'Operations',
          priority: alert.severity === 'high' ? 'urgent' : 'high',
          status: 'pending',
          related_entity_type: 'PerformanceMetric',
          related_entity_id: metric.id
        });

        tasksCreated.push(task.id);
      }
    }

    // Log audit trail
    if (alerts.length > 0) {
      await base44.asServiceRole.entities.ComplianceAuditTrail.create({
        event_type: 'practitioner_credential_action',
        event_description: `Performance alert check completed: ${alerts.length} alerts generated`,
        trigger_source: 'Performance Alert System',
        timestamp: new Date().toISOString(),
        triggered_by_user: 'System',
        severity: alerts.some((a) => a.severity === 'high') ? 'critical' : 'warning'
      });
    }

    return Response.json({
      status: 'success',
      alerts_generated: alerts.length,
      tasks_created: tasksCreated.length,
      alert_details: alerts.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});