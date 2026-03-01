import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Called by entity automations for: Client, CaseNote, BillingRecord,
// FunctionalBehaviourAssessment, BehaviourSupportPlan, RestrictivePractice, Practitioner
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Support both direct invocation (from automation) and manual calls
    const { event, data, old_data } = payload;

    if (!event) {
      return Response.json({ error: 'Missing event payload' }, { status: 400 });
    }

    // Build diff_data for update events
    let diff_data = null;
    if (event.type === 'update' && old_data && data) {
      const changes = {};
      for (const key of Object.keys(data)) {
        if (JSON.stringify(data[key]) !== JSON.stringify(old_data[key])) {
          changes[key] = { from: old_data[key], to: data[key] };
        }
      }
      diff_data = JSON.stringify(changes);
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: event.entity_name,
      entity_id: event.entity_id,
      action_type: event.type,           // create | update | delete
      actor_id: data?.created_by || old_data?.created_by || 'system',
      timestamp: new Date().toISOString(),
      snapshot: event.type === 'delete'
        ? JSON.stringify(old_data || {})
        : JSON.stringify(data || {}),
      diff_data,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});