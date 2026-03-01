import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const clients = await base44.asServiceRole.entities.Client.list();
    const workflows = await base44.asServiceRole.entities.AutomatedOutreachWorkflow.filter({
      trigger_type: 'plan_review_due',
      is_active: true
    });

    const triggered = [];

    for (const workflow of workflows) {
      const thresholdDays = workflow.condition_days_threshold || 30;

      for (const client of clients) {
        if (!client.plan_end_date || client.status !== 'active') continue;

        const planEnd = new Date(client.plan_end_date);
        const daysUntil = Math.ceil((planEnd - today) / (1000 * 60 * 60 * 24));

        if (daysUntil <= thresholdDays && daysUntil >= 0) {
          const log = await base44.asServiceRole.entities.ClientCommunication.create({
            client_id: client.id,
            client_name: client.full_name,
            communication_type: 'outreach',
            subject: `Plan Review Due - ${client.full_name}`,
            content: JSON.stringify({
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              trigger: 'plan_review_due',
              days_until_expiry: daysUntil,
              plan_end_date: client.plan_end_date,
              client_id: client.id,
              client_name: client.full_name,
              channels: { email: workflow.channel_email, sms: workflow.channel_sms }
            }),
            status: 'pending',
            scheduled_date: new Date().toISOString().split('T')[0]
          });

          triggered.push({
            client_id: client.id,
            client_name: client.full_name,
            days_until_expiry: daysUntil,
            workflow: workflow.name,
            log_id: log.id
          });
        }
      }
    }

    // Update last_run_at for each workflow
    for (const workflow of workflows) {
      await base44.asServiceRole.entities.AutomatedOutreachWorkflow.update(workflow.id, {
        last_run_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, triggered_count: triggered.length, triggered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});