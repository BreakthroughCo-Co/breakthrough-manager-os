import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const triggers = await base44.asServiceRole.entities.WorkflowTrigger.filter({ is_active: true });
    const results = [];

    for (const trigger of triggers) {
      let matchingEntities = [];

      // Fetch entities based on trigger entity_type
      const entityFetchers = {
        Client: () => base44.asServiceRole.entities.Client.list(),
        ComplianceItem: () => base44.asServiceRole.entities.ComplianceItem.list(),
        Task: () => base44.asServiceRole.entities.Task.list(),
        Practitioner: () => base44.asServiceRole.entities.Practitioner.list(),
        BillingRecord: () => base44.asServiceRole.entities.BillingRecord.list(),
      };

      const fetcher = entityFetchers[trigger.entity_type];
      if (!fetcher) continue;
      const entities = await fetcher();

      // Evaluate conditions
      for (const entity of entities) {
        const fieldVal = entity[trigger.condition_field];
        const condVal = trigger.condition_value;
        let matches = false;

        if (trigger.condition_operator === 'equals') matches = String(fieldVal) === String(condVal);
        else if (trigger.condition_operator === 'not_equals') matches = String(fieldVal) !== String(condVal);
        else if (trigger.condition_operator === 'greater_than') matches = Number(fieldVal) > Number(condVal);
        else if (trigger.condition_operator === 'less_than') matches = Number(fieldVal) < Number(condVal);
        else if (trigger.condition_operator === 'days_until' && fieldVal) {
          const { differenceInDays } = await import('npm:date-fns@3');
          const days = differenceInDays(new Date(fieldVal), new Date());
          matches = days <= Number(condVal) && days >= 0;
        } else if (trigger.condition_operator === 'days_since' && fieldVal) {
          const { differenceInDays } = await import('npm:date-fns@3');
          const days = differenceInDays(new Date(), new Date(fieldVal));
          matches = days >= Number(condVal);
        }

        if (matches) matchingEntities.push(entity);
      }

      // Execute actions for matching entities
      let actioned = 0;
      for (const entity of matchingEntities) {
        const config = trigger.action_config ? JSON.parse(trigger.action_config) : {};

        if (trigger.action_type === 'create_task') {
          await base44.asServiceRole.entities.Task.create({
            title: config.title?.replace('{{name}}', entity.full_name || entity.title || entity.id) || `Auto Task: ${trigger.name}`,
            description: config.description || `Triggered by: ${trigger.name}`,
            category: config.category || 'Operations',
            priority: config.priority || 'medium',
            status: 'pending',
            related_entity_type: trigger.entity_type,
            related_entity_id: entity.id,
            due_date: config.due_days ? new Date(Date.now() + Number(config.due_days) * 86400000).toISOString().split('T')[0] : undefined
          });
          actioned++;
        } else if (trigger.action_type === 'send_notification') {
          await base44.asServiceRole.entities.Notification.create({
            title: config.title || trigger.name,
            message: config.message?.replace('{{name}}', entity.full_name || entity.title || entity.id) || `Workflow trigger: ${trigger.name}`,
            type: 'workflow',
            entity_type: trigger.entity_type,
            entity_id: entity.id,
            is_read: false
          }).catch(() => {});
          actioned++;
        } else if (trigger.action_type === 'update_status') {
          await base44.asServiceRole.entities[trigger.entity_type].update(entity.id, { status: config.new_status });
          actioned++;
        } else if (trigger.action_type === 'send_email') {
          const email = entity.email || entity.primary_contact_email || config.fallback_email;
          if (email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              subject: config.subject?.replace('{{name}}', entity.full_name || entity.title || '') || trigger.name,
              body: config.body?.replace('{{name}}', entity.full_name || entity.title || '') || `Automated notification: ${trigger.name}`
            });
            actioned++;
          }
        }
      }

      // Update last_triggered
      if (matchingEntities.length > 0) {
        await base44.asServiceRole.entities.WorkflowTrigger.update(trigger.id, { last_triggered: new Date().toISOString() });
      }

      results.push({ trigger_id: trigger.id, trigger_name: trigger.name, matched: matchingEntities.length, actioned });
    }

    return Response.json({ triggers_evaluated: triggers.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});