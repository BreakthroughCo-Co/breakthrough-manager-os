import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { discrepancy_ids } = body;

    let discrepancies = [];
    if (discrepancy_ids?.length) {
      discrepancies = await Promise.all(discrepancy_ids.map(id => base44.asServiceRole.entities.FinancialDiscrepancy.get(id)));
    } else {
      discrepancies = await base44.asServiceRole.entities.FinancialDiscrepancy.filter({ status: 'new' }, '-created_date', 100);
    }

    const tasksDurations = { critical: 1, high: 3, medium: 7, low: 14 };
    const priorityMap = { critical: 'urgent', high: 'high', medium: 'medium', low: 'low' };

    let tasksCreated = 0;
    for (const disc of discrepancies) {
      const dueDays = tasksDurations[disc.severity] || 7;
      const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await base44.asServiceRole.entities.Task.create({
        title: `Discrepancy Review: ${disc.discrepancy_type?.replace(/_/g, ' ')} — ${disc.client_name}`,
        description: `${disc.description}\n\nVariance: $${Math.abs(disc.variance_amount || 0).toFixed(2)}\nSeverity: ${disc.severity?.toUpperCase()}\nService Date: ${disc.service_date}\n\n${disc.ai_analysis || ''}`,
        category: 'Finance',
        priority: priorityMap[disc.severity] || 'medium',
        status: 'pending',
        due_date: dueDate,
        related_entity_type: 'FinancialDiscrepancy',
        related_entity_id: disc.id
      });

      await base44.asServiceRole.entities.FinancialDiscrepancy.update(disc.id, { status: 'investigating' });
      tasksCreated++;
    }

    return Response.json({ tasks_created: tasksCreated, discrepancies_processed: discrepancies.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});