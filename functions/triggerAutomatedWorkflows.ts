import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated Workflow Engine - Triggers actions based on entity events
 * Handles: Critical compliance risks, plan expiry alerts, high-risk escalations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event_type, entity_name, entity_id, data } = await req.json();

    console.log(`Workflow trigger: ${event_type} on ${entity_name} ${entity_id}`);

    // Critical Compliance Risk Forecast
    if (entity_name === 'ComplianceRiskForecast' && event_type === 'create') {
      if (data.impact === 'critical' && data.probability >= 70) {
        // Create high-priority task for compliance team
        await base44.asServiceRole.entities.Task.create({
          title: `URGENT: Critical Compliance Risk - ${data.risk_area}`,
          description: `Forecasted critical risk in ${data.risk_category}.\n\nContributing Factors:\n${data.contributing_factors}\n\nRecommended Actions:\n${data.recommended_actions}`,
          category: 'Compliance',
          priority: 'urgent',
          status: 'pending',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
        });

        // Send email notification to admins
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `🚨 Critical Compliance Risk Alert: ${data.risk_area}`,
            body: `A critical compliance risk has been forecast:

Risk Area: ${data.risk_area}
Category: ${data.risk_category}
Probability: ${data.probability}%
Impact: ${data.impact}

Contributing Factors:
${data.contributing_factors}

Recommended Actions:
${data.recommended_actions}

A task has been created and assigned. Please review immediately.`,
          });
        }

        return Response.json({
          workflow_triggered: true,
          actions: ['task_created', 'notifications_sent'],
          task_count: 1,
          notifications: admins.length,
        });
      }
    }

    // NDIS Plan Expiry Alert (when client updated with plan end date approaching)
    if (entity_name === 'Client' && (event_type === 'create' || event_type === 'update')) {
      const { plan_end_date, full_name, id, assigned_practitioner_id } = data;
      
      if (plan_end_date) {
        const daysUntilExpiry = Math.ceil((new Date(plan_end_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        // 30 days before expiry
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 27) {
          // Schedule goal review outreach
          await base44.asServiceRole.entities.ScheduledOutreach.create({
            client_id: id,
            client_name: full_name,
            message_type: 'goal_review',
            subject: `Plan Review: ${full_name} - NDIS Plan Expiring Soon`,
            message_body: `Hi,\n\nYour NDIS plan is expiring in ${daysUntilExpiry} days (on ${new Date(plan_end_date).toLocaleDateString()}).\n\nWe'd like to schedule a goal review meeting to discuss your progress and prepare for your plan renewal.\n\nPlease let us know your availability.\n\nBest regards,\nBreakthrough Coaching & Consulting`,
            scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            send_status: 'scheduled',
          });

          // Create task for case manager
          await base44.asServiceRole.entities.Task.create({
            title: `Plan Review Required: ${full_name}`,
            description: `NDIS plan expires in ${daysUntilExpiry} days (${new Date(plan_end_date).toLocaleDateString()}).\n\nActions needed:\n- Schedule goal review meeting\n- Prepare progress reports\n- Coordinate with support coordinator\n- Update BSP if needed`,
            category: 'Clinical',
            priority: 'high',
            status: 'pending',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assigned_to: assigned_practitioner_id || 'Unassigned',
            related_entity_type: 'Client',
            related_entity_id: id,
          });

          return Response.json({
            workflow_triggered: true,
            actions: ['outreach_scheduled', 'task_created'],
            client_name: full_name,
            days_until_expiry: daysUntilExpiry,
          });
        }
      }
    }

    // High-Risk Client Escalation (when RiskAlert created)
    if (entity_name === 'RiskAlert' && event_type === 'create') {
      const { client_id, client_name, risk_level, risk_score, alert_type } = data;
      
      if (risk_level === 'critical' || risk_level === 'high') {
        // Create urgent task
        await base44.asServiceRole.entities.Task.create({
          title: `⚠️ ${risk_level.toUpperCase()} Risk Alert: ${client_name}`,
          description: `Risk alert triggered: ${alert_type}\n\nRisk Score: ${risk_score}/100\nRisk Level: ${risk_level}\n\nImmediate action required:\n- Review client history\n- Assess current support plan\n- Consider additional interventions\n- Update risk management strategies`,
          category: 'Clinical',
          priority: risk_level === 'critical' ? 'urgent' : 'high',
          status: 'pending',
          due_date: new Date(Date.now() + (risk_level === 'critical' ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          related_entity_type: 'Client',
          related_entity_id: client_id,
        });

        // Schedule priority outreach
        await base44.asServiceRole.entities.ScheduledOutreach.create({
          client_id,
          client_name,
          message_type: 'support_offer',
          subject: `Checking In - ${client_name}`,
          message_body: `Hi,\n\nWe wanted to check in and see how things are going. Your wellbeing is important to us, and we're here to support you.\n\nWould you like to schedule a catch-up or discuss any concerns?\n\nWarm regards,\nBreakthrough Team`,
          scheduled_date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
          send_status: 'scheduled',
        });

        return Response.json({
          workflow_triggered: true,
          actions: ['urgent_task_created', 'priority_outreach_scheduled'],
          risk_level,
          client_name,
        });
      }
    }

    // Training Gap Identified
    if (entity_name === 'TeamTrainingNeed' && event_type === 'create') {
      if (data.priority === 'critical' || data.priority === 'high') {
        // Create task for training coordinator
        await base44.asServiceRole.entities.Task.create({
          title: `Training Gap: ${data.skill_area}`,
          description: `${data.priority.toUpperCase()} priority training need identified.\n\nCategory: ${data.category}\nAffected Staff: ${data.affected_practitioners}\n\nBusiness Impact:\n${data.business_impact}\n\nRecommended Training:\n${data.recommended_modules}`,
          category: 'HR',
          priority: data.priority === 'critical' ? 'urgent' : 'high',
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

        return Response.json({
          workflow_triggered: true,
          actions: ['training_task_created'],
          skill_area: data.skill_area,
        });
      }
    }

    return Response.json({
      workflow_triggered: false,
      message: 'No workflow rules matched this event',
    });

  } catch (error) {
    console.error('Workflow trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});