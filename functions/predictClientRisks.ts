import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isScheduled = false;
    let targetClientId = null;
    try {
      const body = await req.clone().json();
      isScheduled = body?.scheduled === true;
      targetClientId = body?.client_id || null;
    } catch {}

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const client = isScheduled ? base44.asServiceRole : base44;

    // Fetch data needed for predictions
    const [clients, incidents, billingRecords, caseNotes] = await Promise.all([
      targetClientId
        ? client.entities.Client.filter({ id: targetClientId })
        : client.entities.Client.filter({ status: 'active' }),
      client.entities.Incident.list('-incident_date', 500),
      client.entities.BillingRecord.list('-service_date', 500),
      client.entities.CaseNote ? client.entities.CaseNote.list('-created_date', 300) : Promise.resolve([]),
    ]);

    const updated = [];

    for (const c of clients) {
      const clientIncidents = incidents.filter(i => i.client_id === c.id);
      const clientBilling = billingRecords.filter(b => b.client_id === c.id);

      // Build context for AI analysis
      const now = new Date();
      const planDaysRemaining = c.plan_end_date
        ? Math.floor((new Date(c.plan_end_date) - now) / (1000 * 60 * 60 * 24))
        : null;
      const fundingUtilPct = c.funding_allocated > 0
        ? Math.round((c.funding_utilised / c.funding_allocated) * 100)
        : null;
      const recentIncidents = clientIncidents.filter(i => {
        const d = new Date(i.incident_date);
        return (now - d) / (1000 * 60 * 60 * 24) <= 90;
      });
      const lastBilling = clientBilling[0];
      const daysSinceLastService = lastBilling?.service_date
        ? Math.floor((now - new Date(lastBilling.service_date)) / (1000 * 60 * 60 * 24))
        : null;

      const prompt = `You are an NDIS practice analytics engine. Analyse this client data and return JSON predictions.

CLIENT DATA:
- Name: ${c.full_name}
- Status: ${c.status}
- Risk Level: ${c.risk_level}
- Service Type: ${c.service_type}
- Plan Days Remaining: ${planDaysRemaining ?? 'Unknown'}
- Funding Utilisation: ${fundingUtilPct !== null ? fundingUtilPct + '%' : 'Unknown'}
- Days Since Last Service: ${daysSinceLastService ?? 'Unknown'}
- Incidents (last 90 days): ${recentIncidents.length}
- Critical/Serious Incidents: ${recentIncidents.filter(i => ['critical','serious_injury'].includes(i.severity)).length}
- Total Incidents Ever: ${clientIncidents.length}
- Current Status: ${c.status}

TASK: Return a JSON object with these exact fields:
- predicted_disengagement_risk: float 0.0-1.0 (probability client will disengage from services in next 90 days)
- predicted_goal_attainment: float 0.0-1.0 (probability client will meet their NDIS goals this plan period)
- ai_risk_score: integer 0-100 (overall risk score)
- escalation_flags: array of strings (specific escalation concerns, max 3, empty array if none)

Return ONLY valid JSON, no explanation.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            predicted_disengagement_risk: { type: 'number' },
            predicted_goal_attainment: { type: 'number' },
            ai_risk_score: { type: 'number' },
            escalation_flags: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      const predictions = {
        predicted_disengagement_risk: Math.min(1, Math.max(0, result.predicted_disengagement_risk ?? 0.3)),
        predicted_goal_attainment: Math.min(1, Math.max(0, result.predicted_goal_attainment ?? 0.6)),
        ai_risk_score: Math.min(100, Math.max(0, Math.round(result.ai_risk_score ?? 30))),
        escalation_flags: result.escalation_flags || [],
        ai_predictions_updated: new Date().toISOString(),
      };

      await client.entities.Client.update(c.id, predictions);

      // Create ProactiveAlert if high disengagement risk
      if (predictions.predicted_disengagement_risk >= 0.7) {
        await client.entities.ProactiveAlert.create({
          alert_type: 'client_risk',
          severity: predictions.predicted_disengagement_risk >= 0.85 ? 'critical' : 'high',
          title: `High Disengagement Risk: ${c.full_name}`,
          description: `AI analysis indicates ${Math.round(predictions.predicted_disengagement_risk * 100)}% disengagement risk in next 90 days.`,
          suggested_actions: predictions.escalation_flags.length > 0
            ? predictions.escalation_flags
            : ['Schedule urgent practitioner review', 'Contact primary contact', 'Review support plan alignment'],
          related_entity_type: 'Client',
          related_entity_id: c.id,
          related_entity_name: c.full_name,
          status: 'active',
          priority_score: predictions.ai_risk_score,
          detected_date: new Date().toISOString(),
        });
      }

      updated.push({ client_id: c.id, name: c.full_name, predictions });
    }

    return Response.json({ processed: updated.length, clients: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});