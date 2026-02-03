import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, client_id } = await req.json();

    // Fetch comprehensive client data
    const [client, bsps, caseNotes, incidents, communications] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }),
      base44.entities.ClientCommunication.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Build comprehensive context for LLM
    const context = `
CLIENT PROFILE:
Name: ${client.full_name}
NDIS Number: ${client.ndis_number}
Service Type: ${client.service_type}
Status: ${client.status}
Risk Level: ${client.risk_level}
Plan Period: ${client.plan_start_date} to ${client.plan_end_date}

ACTIVE BSP:
${bsps.filter(b => b.status === 'active').map(b => `
Version: ${b.plan_version}
Behaviour Summary: ${b.behaviour_summary}
Skill Building Strategies: ${b.skill_building_strategies}
Environmental Strategies: ${b.environmental_strategies}
Review Date: ${b.review_date}
`).join('\n') || 'No active BSP'}

RECENT CASE NOTES (Last 10):
${caseNotes.slice(0, 10).map(n => `
Date: ${n.session_date}
Practitioner: ${n.practitioner_name || 'N/A'}
Summary: ${n.summary || n.progress_summary || 'N/A'}
`).join('\n')}

RECENT INCIDENTS (Last 5):
${incidents.slice(0, 5).map(i => `
Date: ${new Date(i.incident_date).toLocaleDateString()}
Category: ${i.category}
Severity: ${i.severity}
Description: ${i.description.substring(0, 200)}
`).join('\n')}

RECENT COMMUNICATIONS (Last 5):
${communications.slice(0, 5).map(c => `
Date: ${new Date(c.sent_date).toLocaleDateString()}
Subject: ${c.subject}
Type: ${c.communication_type}
`).join('\n')}

USER QUERY: ${query}

Provide a clear, concise, and professional response to the user's query based on the client data above. 
If the query asks for a summary, provide a structured summary.
If asking about specific goals or strategies, reference the BSP.
If asking about progress, reference case notes and trends.
Keep the response actionable and relevant for NDIS service delivery.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: context,
    });

    return Response.json({
      query,
      client_name: client.full_name,
      response,
    });
  } catch (error) {
    console.error('Client query error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});