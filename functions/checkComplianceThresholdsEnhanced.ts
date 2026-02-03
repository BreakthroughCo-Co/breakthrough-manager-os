import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all necessary data in parallel
    const [
      clients,
      billingRecords,
      goals,
      complianceItems,
      ndisPlans,
      thresholdConfigs,
      existingTasks
    ] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.BillingRecord.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.ComplianceItem.list(),
      base44.entities.NDISPlan.list(),
      base44.entities.AlertThresholdConfig.list(),
      base44.entities.Task.list()
    ]);

    const alerts = [];
    const alertsByType = {};

    // Helper: Get threshold config for alert type
    const getThreshold = (alertType) => {
      return thresholdConfigs?.find(t => t.alert_type === alertType) || {
        enabled: true,
        severity: 'medium',
        create_task_on_alert: true,
        threshold_value: null
      };
    };

    // ALERT 1: High Funding Utilization
    const highFundingThreshold = getThreshold('high_funding_utilization');
    if (highFundingThreshold.enabled) {
      clients?.forEach(client => {
        if (client.funding_allocated && client.funding_utilised) {
          const utilizationPercent = (client.funding_utilised / client.funding_allocated) * 100;
          if (utilizationPercent >= (highFundingThreshold.threshold_value || 85)) {
            alerts.push({
              type: 'high_funding_utilization',
              severity: highFundingThreshold.severity,
              client_id: client.id,
              client_name: client.full_name,
              message: `High funding utilization: ${utilizationPercent.toFixed(1)}% of plan funding used`,
              details: {
                allocated: client.funding_allocated,
                utilised: client.funding_utilised,
                percentage: utilizationPercent.toFixed(1)
              },
              create_task: highFundingThreshold.create_task_on_alert,
              task_config: {
                title: `Review funding utilization for ${client.full_name}`,
                category: 'Compliance',
                priority: 'high',
                description: `Client ${client.full_name} has utilized ${utilizationPercent.toFixed(1)}% of allocated NDIS plan funding.`,
                related_entity_type: 'Client',
                related_entity_id: client.id
              }
            });
          }
        }
      });
    }

    // ALERT 2: Low Funding Utilization
    const lowFundingThreshold = getThreshold('low_funding_utilization');
    if (lowFundingThreshold.enabled) {
      clients?.forEach(client => {
        const planEndDate = client.plan_end_date ? new Date(client.plan_end_date) : null;
        const daysUntilExpiry = planEndDate ? Math.floor((planEndDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        if (client.funding_allocated && client.funding_utilised && daysUntilExpiry && daysUntilExpiry <= 30) {
          const utilizationPercent = (client.funding_utilised / client.funding_allocated) * 100;
          if (utilizationPercent < (lowFundingThreshold.threshold_value || 30)) {
            alerts.push({
              type: 'low_funding_utilization',
              severity: lowFundingThreshold.severity,
              client_id: client.id,
              client_name: client.full_name,
              message: `Low funding utilization near plan expiry: ${utilizationPercent.toFixed(1)}% used with ${daysUntilExpiry} days remaining`,
              details: {
                allocated: client.funding_allocated,
                utilised: client.funding_utilised,
                percentage: utilizationPercent.toFixed(1),
                days_until_expiry: daysUntilExpiry
              },
              create_task: lowFundingThreshold.create_task_on_alert,
              task_config: {
                title: `Review low funding utilization for ${client.full_name}`,
                category: 'Compliance',
                priority: 'high',
                description: `${client.full_name} has only utilized ${utilizationPercent.toFixed(1)}% of plan funding with ${daysUntilExpiry} days until plan expiry.`,
                related_entity_type: 'Client',
                related_entity_id: client.id
              }
            });
          }
        }
      });
    }

    // ALERT 3: Goals At Risk or Not Started
    const goalAtRiskThreshold = getThreshold('goal_at_risk');
    if (goalAtRiskThreshold.enabled) {
      goals?.forEach(goal => {
        const planEndDate = clients?.find(c => c.id === goal.client_id)?.plan_end_date;
        const daysUntilExpiry = planEndDate ? Math.floor((new Date(planEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        if ((goal.status === 'at_risk' || goal.status === 'not_started') && daysUntilExpiry && daysUntilExpiry <= 90) {
          alerts.push({
            type: 'goal_at_risk',
            severity: 'high',
            client_id: goal.client_id,
            client_name: goal.client_name,
            message: `Goal "${goal.goal_description}" is ${goal.status} with ${daysUntilExpiry} days until plan expiry`,
            details: {
              goal_id: goal.id,
              status: goal.status,
              domain: goal.ndis_domain,
              days_until_plan_expiry: daysUntilExpiry
            },
            create_task: goalAtRiskThreshold.create_task_on_alert,
            task_config: {
              title: `Review at-risk goal for ${goal.client_name}`,
              category: 'Clinical',
              priority: 'high',
              description: `Goal: "${goal.goal_description}" is currently ${goal.status}.`,
              related_entity_type: 'ClientGoal',
              related_entity_id: goal.id
            }
          });
        }
      });
    }

    // ALERT 4: Non-Compliant Items
    const complianceThreshold = getThreshold('non_compliant_item');
    if (complianceThreshold.enabled) {
      complianceItems?.forEach(item => {
        if (item.status === 'non_compliant' && item.priority === 'critical') {
          alerts.push({
            type: 'compliance_breach',
            severity: 'critical',
            message: `Critical compliance breach: ${item.title}`,
            details: {
              compliance_id: item.id,
              category: item.category,
              priority: item.priority,
              description: item.description
            },
            create_task: complianceThreshold.create_task_on_alert,
            task_config: {
              title: `Address critical compliance issue: ${item.title}`,
              category: 'Compliance',
              priority: 'urgent',
              description: `${item.description}`,
              related_entity_type: 'ComplianceItem',
              related_entity_id: item.id
            }
          });
        }
      });
    }

    // ALERT 5: Plan Expiry Warning
    const planExpiryThreshold = getThreshold('plan_expiry_warning');
    if (planExpiryThreshold.enabled) {
      clients?.forEach(client => {
        const planEndDate = client.plan_end_date ? new Date(client.plan_end_date) : null;
        const daysUntilExpiry = planEndDate ? Math.floor((planEndDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        const thresholdDays = planExpiryThreshold.threshold_value || 30;
        if (daysUntilExpiry && daysUntilExpiry <= thresholdDays && daysUntilExpiry > 0) {
          alerts.push({
            type: 'plan_expiry_warning',
            severity: planExpiryThreshold.severity,
            client_id: client.id,
            client_name: client.full_name,
            message: `NDIS plan expires in ${daysUntilExpiry} days (${planEndDate.toLocaleDateString()})`,
            details: {
              plan_end_date: client.plan_end_date,
              days_until_expiry: daysUntilExpiry
            },
            create_task: planExpiryThreshold.create_task_on_alert,
            task_config: {
              title: `Plan renewal required for ${client.full_name}`,
              category: 'Compliance',
              priority: daysUntilExpiry <= 7 ? 'urgent' : 'high',
              description: `NDIS plan for ${client.full_name} expires on ${planEndDate.toLocaleDateString()}. Plan renewal should be initiated.`,
              related_entity_type: 'Client',
              related_entity_id: client.id,
              due_date: new Date(planEndDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          });
        }
      });
    }

    // Create tasks from alerts
    const createdTasks = [];
    for (const alert of alerts) {
      if (alert.create_task) {
        try {
          const existingTask = existingTasks?.find(t =>
            t.related_entity_id === alert.task_config.related_entity_id &&
            t.related_entity_type === alert.task_config.related_entity_type &&
            t.status !== 'completed'
          );

          if (!existingTask) {
            const newTask = await base44.entities.Task.create({
              ...alert.task_config,
              status: 'pending'
            });
            createdTasks.push(newTask);
          }
        } catch (e) {
          console.error('Task creation error:', e);
        }
      }
    }

    // Create in-app notifications
    for (const alert of alerts) {
      try {
        await base44.entities.Notification.create({
          recipient_id: user.id,
          type: alert.type,
          severity: alert.severity,
          title: `${alert.type.replace(/_/g, ' ').toUpperCase()}`,
          message: alert.message,
          details: JSON.stringify(alert.details),
          is_read: false,
          related_entity_type: alert.task_config?.related_entity_type || 'Client',
          related_entity_id: alert.task_config?.related_entity_id || alert.client_id
        });
      } catch (e) {
        console.error('Notification creation error:', e);
      }
    }

    // Group alerts by severity
    alerts.forEach(alert => {
      alertsByType[alert.severity] = (alertsByType[alert.severity] || 0) + 1;
    });

    return Response.json({
      success: true,
      check_date: new Date().toISOString(),
      alerts: alerts,
      alerts_by_severity: {
        critical: alertsByType.critical || 0,
        high: alertsByType.high || 0,
        medium: alertsByType.medium || 0
      },
      tasks_created: createdTasks.length,
      notifications_sent: alerts.length
    });
  } catch (error) {
    console.error('Compliance threshold check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});