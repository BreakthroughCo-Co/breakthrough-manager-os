import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const workflows = await base44.asServiceRole.entities.AutomatedOutreachWorkflow.filter({
      trigger_type: 'client_inactivity',
      is_active: true
    });

    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
    const caseNotes = await base44.asServiceRole.entities.CaseNote.list('-session_date', 500);

    const triggered = [];

    for (const workflow of workflows) {
      const inactivityDays = workflow.condition_days_threshold || 21;

      for (const client of clients) {
        const lastNote = caseNotes.find(n => n.client_id === client.id);
        if (!lastNote) continue;

        const lastSession = new Date(lastNote.session_date);
        const daysSince = Math.ceil((today - lastSession) / (1000 * 60 * 60 * 24));

        if (daysSince >= inactivityDays) {
          const log = await base44.asServiceRole.entities.ClientCommunication.create({
            client_id: client.id,
            client_name: client.full_name,
            communication_type: 'outreach',
            subject: `Client Inactivity Alert - ${client.full_name}`,
            content: JSON.stringify({
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              trigger: 'client_inactivity',
              client_id: client.id,
              client_name: client.full_name,
              days_since_last_session: daysSince,
              last_session_date: lastNote.session_date,
              assigned_practitioner: client.assigned_practitioner_id,
              channels: { email: workflow.channel_email, sms: workflow.channel_sms }
            }),
            status: 'pending',
            scheduled_date: new Date().toISOString().split('T')[0]
          });

          triggered.push({
            client_id: client.id,
            client_name: client.full_name,
            days_since_last_session: daysSince,
            workflow: workflow.name,
            log_id: log.id
          });
        }
      }

      await base44.asServiceRole.entities.AutomatedOutreachWorkflow.update(workflow.id, {
        last_run_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, triggered_count: triggered.length, triggered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});