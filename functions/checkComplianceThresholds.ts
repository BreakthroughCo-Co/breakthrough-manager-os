import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Check Compliance Thresholds
 * Monitors BillingRecord, ClientGoal, and ComplianceItem entities for alert conditions
 * Triggers notifications and emails when thresholds are breached
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch data to monitor
    const [clients, billingRecords, goals, complianceItems, ndisPlans] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.BillingRecord.list('-service_date', 500),
      base44.asServiceRole.entities.ClientGoal.list(),
      base44.asServiceRole.entities.ComplianceItem.list(),
      base44.asServiceRole.entities.NDISPlan.list()
    ]);

    const alerts = [];

    // CHECK 1: Funding utilization below threshold
    for (const client of clients) {
      const clientNdis = ndisPlans.find(p => p.client_id === client.id && p.status === 'active');
      if (!clientNdis) continue;

      const utilizationPercent = clientNdis.total_budget > 0 
        ? (clientNdis.total_used / clientNdis.total_budget) * 100 
        : 0;

      // Alert if utilization is extremely low (< 10%) or extremely high (> 90%)
      if (utilizationPercent < 10 && clientNdis.total_budget > 0) {
        alerts.push({
          type: 'low_funding_utilization',
          severity: 'medium',
          client_id: client.id,
          client_name: client.full_name,
          message: `Funding utilization is only ${utilizationPercent.toFixed(1)}% for ${client.full_name}`,
          details: {
            total_budget: clientNdis.total_budget,
            total_used: clientNdis.total_used,
            utilization_percent: utilizationPercent
          }
        });
      } else if (utilizationPercent > 90) {
        alerts.push({
          type: 'high_funding_utilization',
          severity: 'high',
          client_id: client.id,
          client_name: client.full_name,
          message: `Funding utilization is ${utilizationPercent.toFixed(1)}% - plan may run out soon for ${client.full_name}`,
          details: {
            total_budget: clientNdis.total_budget,
            total_used: clientNdis.total_used,
            utilization_percent: utilizationPercent
          }
        });
      }
    }

    // CHECK 2: Goals at risk or not started
    const atRiskGoals = goals.filter(g => g.status === 'at_risk' || g.status === 'not_started');
    for (const goal of atRiskGoals) {
      const client = clients.find(c => c.id === goal.client_id);
      if (client) {
        alerts.push({
          type: 'goal_at_risk',
          severity: 'medium',
          client_id: client.id,
          client_name: client.full_name,
          message: `Goal "${goal.goal_description}" is ${goal.status} for ${client.full_name}`,
          details: {
            goal_id: goal.id,
            goal_description: goal.goal_description,
            status: goal.status
          }
        });
      }
    }

    // CHECK 3: Compliance status changes
    const nonCompliantItems = complianceItems.filter(i => i.status === 'non_compliant');
    for (const item of nonCompliantItems) {
      alerts.push({
        type: 'compliance_breach',
        severity: 'critical',
        client_id: null,
        client_name: null,
        message: `Compliance item "${item.title}" is non-compliant`,
        details: {
          compliance_item_id: item.id,
          category: item.category,
          due_date: item.due_date
        }
      });
    }

    // CHECK 4: Plan expiry alerts
    const today = new Date();
    const thirtyDaysAhead = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const plan of ndisPlans) {
      const planEndDate = new Date(plan.plan_end_date);
      if (planEndDate <= thirtyDaysAhead && planEndDate > today && plan.status !== 'expired') {
        const client = clients.find(c => c.id === plan.client_id);
        if (client) {
          const daysUntilExpiry = Math.ceil((planEndDate - today) / (1000 * 60 * 60 * 24));
          alerts.push({
            type: 'plan_expiry_warning',
            severity: daysUntilExpiry < 7 ? 'high' : 'medium',
            client_id: client.id,
            client_name: client.full_name,
            message: `NDIS plan expires in ${daysUntilExpiry} days for ${client.full_name}`,
            details: {
              plan_id: plan.id,
              plan_end_date: plan.plan_end_date,
              days_until_expiry: daysUntilExpiry
            }
          });
        }
      }
    }

    // Create notifications and queue emails
    const adminEmails = (await base44.asServiceRole.entities.User.list())
      .filter(u => u.role === 'admin')
      .map(u => u.email);

    for (const alert of alerts) {
      // Create in-app notification for each admin
      for (const adminEmail of adminEmails) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: adminEmail,
          notification_type: alert.type === 'compliance_breach' ? 'risk_alert' : 'review_due',
          title: `[${alert.severity.toUpperCase()}] ${alert.type.replace(/_/g, ' ')}`,
          message: alert.message,
          priority: alert.severity,
          related_entity_type: alert.type === 'compliance_breach' ? 'ComplianceItem' : 'Client',
          related_entity_id: alert.type === 'compliance_breach' ? alert.details.compliance_item_id : alert.client_id,
          email_sent: false
        });
      }
    }

    return Response.json({
      check_date: new Date().toISOString(),
      alerts_triggered: alerts.length,
      alerts_by_severity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length
      },
      alerts
    });

  } catch (error) {
    console.error('Compliance threshold check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});