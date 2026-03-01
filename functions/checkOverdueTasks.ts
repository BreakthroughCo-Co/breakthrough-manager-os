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
      trigger_type: 'overdue_task',
      is_active: true
    });

    const tasks = await base44.asServiceRole.entities.Task.list();
    const triggered = [];

    for (const workflow of workflows) {
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        const due = new Date(t.due_date);
        return due < today;
      });

      for (const task of overdueTasks) {
        const daysOverdue = Math.ceil((today - new Date(task.due_date)) / (1000 * 60 * 60 * 24));

        const log = await base44.asServiceRole.entities.ClientCommunication.create({
          client_id: task.related_entity_id || '',
          client_name: task.assigned_to || 'Unassigned',
          communication_type: 'outreach',
          subject: `Overdue Task Alert - ${task.title}`,
          content: JSON.stringify({
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            trigger: 'overdue_task',
            task_id: task.id,
            task_title: task.title,
            task_category: task.category,
            assigned_to: task.assigned_to,
            days_overdue: daysOverdue,
            due_date: task.due_date
          }),
          status: 'pending',
          scheduled_date: new Date().toISOString().split('T')[0]
        });

        triggered.push({
          task_id: task.id,
          task_title: task.title,
          days_overdue: daysOverdue,
          assigned_to: task.assigned_to,
          log_id: log.id
        });
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