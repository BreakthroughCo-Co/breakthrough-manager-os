import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { incident_id } = await req.json();

    // Fetch incident details
    const incidents = await base44.entities.Incident.filter({ id: incident_id });
    const incident = incidents[0];

    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Fetch related data
    const [client, bsps, caseNotes, relatedIncidents] = await Promise.all([
      incident.client_id ? base44.entities.Client.filter({ id: incident.client_id }).then(c => c[0]) : null,
      incident.client_id ? base44.entities.BehaviourSupportPlan.filter({ client_id: incident.client_id }) : [],
      incident.client_id ? base44.entities.CaseNote.filter({ client_id: incident.client_id }) : [],
      incident.client_id ? base44.entities.Incident.filter({ client_id: incident.client_id }) : [],
    ]);

    const recentCaseNotes = caseNotes.slice(0, 5);
    const similarIncidents = relatedIncidents.filter(i => 
      i.id !== incident_id && i.category === incident.category
    ).slice(0, 3);

    const prompt = `You are a senior NDIS incident investigation specialist. Draft a comprehensive investigation report for the following high-severity incident.

INCIDENT DETAILS:
Date: ${new Date(incident.incident_date).toLocaleString()}
Category: ${incident.category}
Severity: ${incident.severity}
Location: ${incident.location || 'Not specified'}
Description: ${incident.description}
Immediate Action Taken: ${incident.immediate_action_taken || 'Not specified'}
Injuries Sustained: ${incident.injuries_sustained ? 'Yes' : 'No'}
${incident.injury_details ? `Injury Details: ${incident.injury_details}` : ''}
Restrictive Practice Used: ${incident.restrictive_practice_used ? 'Yes' : 'No'}
${incident.restrictive_practice_details ? `RP Details: ${incident.restrictive_practice_details}` : ''}
Witnesses: ${incident.witnesses || 'None recorded'}

${client ? `CLIENT PROFILE:
Name: ${client.full_name}
NDIS Number: ${client.ndis_number}
Risk Level: ${client.risk_level}
Service Type: ${client.service_type}` : ''}

${bsps.length > 0 ? `ACTIVE BSP:
${bsps.filter(b => b.status === 'active').map(b => 
  `Behaviour Summary: ${b.behaviour_summary}\nStrategies: ${b.environmental_strategies}`
).join('\n')}` : ''}

RECENT CASE NOTES (Last 5):
${recentCaseNotes.map(n => `- ${n.session_date}: ${n.summary?.substring(0, 150) || 'No summary'}`).join('\n')}

SIMILAR PAST INCIDENTS (${similarIncidents.length}):
${similarIncidents.map(i => `- ${new Date(i.incident_date).toLocaleDateString()}: ${i.description.substring(0, 100)}`).join('\n')}

Draft a professional investigation report with the following sections:

1. **Executive Summary** (2-3 sentences summarizing the incident and its significance)

2. **Incident Overview** (Detailed account of what occurred, including timeline if possible)

3. **Contributing Factors** (Analysis of potential causes, environmental factors, communication breakdowns, etc.)

4. **Policy & Procedure Review** (Assessment of whether policies were followed, any gaps identified)

5. **Risk Assessment** (Evaluation of ongoing risks and likelihood of recurrence)

6. **Root Cause Analysis** (Identification of underlying systemic or individual factors)

7. **Recommendations** (Specific, actionable recommendations for prevention and improvement)

8. **Follow-up Actions Required** (Immediate and long-term actions needed)

Format the report professionally with clear headings. Be specific, evidence-based, and solutions-focused. Align with NDIS Quality and Safeguards Commission requirements.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    return Response.json({
      incident_id,
      report_draft: result,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Investigation report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});