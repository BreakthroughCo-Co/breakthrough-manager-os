import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated NDIS Plan Expiry Workflow
 * Identifies clients with expiring plans and triggers outreach + tasks
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all clients with plan end dates
    const allClients = await base44.asServiceRole.entities.Client.list();

    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Identify clients with plans expiring in 60 days
    const expiringClients = allClients.filter(c => {
      if (!c.plan_end_date) return false;
      const endDate = new Date(c.plan_end_date);
      return endDate > now && endDate <= sixtyDaysFromNow;
    });

    console.log(`Found ${expiringClients.length} clients with plans expiring within 60 days`);

    const workflowResults = [];

    for (const client of expiringClients) {
      try {
        const daysUntilExpiry = Math.ceil((new Date(client.plan_end_date) - now) / (1000 * 60 * 60 * 24));

        // 1. Schedule Goal Review Outreach
        const outreach = await base44.asServiceRole.entities.ScheduledOutreach.create({
          client_id: client.id,
          client_name: client.full_name,
          message_type: 'goal_review',
          subject: `Plan Review Upcoming: ${client.full_name} - NDIS Plan Expires ${daysUntilExpiry} Days`,
          message_body: `Hi ${client.full_name},

Your current NDIS plan is expiring in ${daysUntilExpiry} days (${client.plan_end_date}).

We'd like to schedule a goal review meeting to:
- Celebrate your progress and achievements
- Review your current goals and support needs
- Prepare for your plan renewal with the NDIS

This is an important opportunity to ensure your plan continues to reflect your goals and aspirations. Please let us know your availability.

Looking forward to speaking with you soon.

Best regards,
Breakthrough Team`,
          scheduled_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          send_status: 'scheduled'
        });

        // 2. Create high-priority Plan Review Task
        const task = await base44.asServiceRole.entities.Task.create({
          title: `🔔 Plan Review Required: ${client.full_name}`,
          description: `URGENT: Client's NDIS plan expires in ${daysUntilExpiry} days (${client.plan_end_date}).

ACTION ITEMS:
1. Schedule goal review meeting with client
2. Collect latest case notes and progress documentation
3. Update progress against current goals
4. Review and update Behaviour Support Plan if needed
5. Prepare plan renewal documentation
6. Coordinate with support coordinator (if applicable)
7. Send to client before plan expiry for review

DEADLINE: ${new Date(new Date(client.plan_end_date).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} (14 days before expiry)`,
          category: 'Clinical',
          priority: daysUntilExpiry <= 30 ? 'urgent' : 'high',
          status: 'pending',
          due_date: new Date(new Date(client.plan_end_date).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assigned_to: client.assigned_practitioner_id || 'Unassigned',
          related_entity_type: 'Client',
          related_entity_id: client.id
        });

        // 3. Flag client for case manager attention on dashboard
        const caseManagerAlert = await base44.asServiceRole.entities.Message.create({
          sender_id: 'system',
          sender_name: 'Breakthrough Manager OS',
          recipient_id: client.assigned_practitioner_id || 'admin',
          recipient_name: 'Assigned Practitioner',
          subject: `Plan Review Alert: ${client.full_name}`,
          content: `${client.full_name}'s NDIS plan expires in ${daysUntilExpiry} days. A goal review task and outreach communication have been automatically scheduled. Please prioritize this client for plan renewal coordination.`,
          message_type: 'system',
          priority: daysUntilExpiry <= 30 ? 'urgent' : 'high',
          related_entity_type: 'Client',
          related_entity_id: client.id
        });

        workflowResults.push({
          client_id: client.id,
          client_name: client.full_name,
          plan_expires: client.plan_end_date,
          days_until_expiry: daysUntilExpiry,
          actions_taken: ['outreach_scheduled', 'task_created', 'alert_sent'],
          outreach_id: outreach.id,
          task_id: task.id,
          message_id: caseManagerAlert.id
        });

      } catch (error) {
        console.error(`Error processing client ${client.id}:`, error);
        workflowResults.push({
          client_id: client.id,
          client_name: client.full_name,
          error: error.message
        });
      }
    }

    // Create a summary task for management
    if (expiringClients.length > 0) {
      await base44.asServiceRole.entities.Task.create({
        title: `Plan Expiry Batch Processing Complete - ${expiringClients.length} Clients`,
        description: `Automated plan expiry workflow processed ${expiringClients.length} clients with plans expiring within 60 days.

Actions taken:
- ${expiringClients.length} outreach communications scheduled
- ${expiringClients.length} plan review tasks created
- ${expiringClients.length} practitioner alerts sent

Review the Plan Review Tasks in your task queue for detailed action items.`,
        category: 'Operations',
        priority: 'high',
        status: 'pending',
        due_date: new Date().toISOString().split('T')[0]
      });
    }

    return Response.json({
      workflow_date: new Date().toISOString(),
      clients_processed: expiringClients.length,
      clients_expiring_60days: expiringClients.map(c => ({
        name: c.full_name,
        plan_expires: c.plan_end_date,
        days_remaining: Math.ceil((new Date(c.plan_end_date) - now) / (1000 * 60 * 60 * 24))
      })),
      workflow_results: workflowResults,
      summary: {
        outreach_scheduled: workflowResults.filter(r => r.actions_taken).length,
        tasks_created: workflowResults.filter(r => r.task_id).length,
        alerts_sent: workflowResults.filter(r => r.message_id).length,
        errors: workflowResults.filter(r => r.error).length
      }
    });

  } catch (error) {
    console.error('Plan expiry workflow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});