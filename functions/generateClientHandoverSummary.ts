import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, from_practitioner_id, to_practitioner_id } = await req.json();

    if (!client_id || !from_practitioner_id || !to_practitioner_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch comprehensive client data
    const [
      clients,
      goals,
      caseNotes,
      sessionNotes,
      riskProfiles,
      bsps,
      practitioners,
      incidents
    ] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.CaseNote.list(),
      base44.entities.SessionNote.list(),
      base44.entities.ClientRiskProfile.list(),
      base44.entities.BehaviourSupportPlan.list(),
      base44.entities.Practitioner.list(),
      base44.entities.Incident.list()
    ]);

    const client = clients?.find(c => c.id === client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const fromPractitioner = practitioners?.find(p => p.id === from_practitioner_id);
    const toPractitioner = practitioners?.find(p => p.id === to_practitioner_id);

    const clientGoals = goals?.filter(g => g.client_id === client_id) || [];
    const clientNotes = caseNotes?.filter(n => n.client_id === client_id) || [];
    const clientSessionNotes = sessionNotes?.filter(n => n.client_id === client_id).slice(-10) || [];
    const clientRisk = riskProfiles?.find(r => r.client_id === client_id);
    const activeBSP = bsps?.find(b => b.client_id === client_id && b.is_latest_version && b.status === 'active');
    const recentIncidents = incidents?.filter(i => i.client_id === client_id).slice(-5) || [];

    const handoverData = {
      client: {
        name: client.full_name,
        ndis_number: client.ndis_number,
        service_type: client.service_type,
        risk_level: client.risk_level
      },
      goals_summary: {
        total: clientGoals.length,
        on_track: clientGoals.filter(g => g.status === 'on_track').length,
        at_risk: clientGoals.filter(g => g.status === 'at_risk').length,
        not_started: clientGoals.filter(g => g.status === 'not_started').length
      },
      current_goals: clientGoals.slice(-5).map(g => ({
        description: g.goal_description,
        status: g.status,
        progress: g.current_progress,
        target: g.target_outcome
      })),
      recent_progress: clientSessionNotes.slice(-3).map(n => ({
        date: n.session_date,
        observations: n.observations,
        progress: n.progress_against_goals
      })),
      risk_profile: clientRisk ? {
        overall_level: clientRisk.overall_risk_level,
        score: clientRisk.overall_risk_score,
        key_concerns: clientRisk.disengagement_risk > 60 ? 'High disengagement risk' : '',
        recommended_actions: clientRisk.recommended_actions?.slice(0, 3)
      } : null,
      support_plan: activeBSP ? {
        status: activeBSP.status,
        key_interventions: activeBSP.interventions_used?.slice(0, 5),
        updated: activeBSP.updated_date
      } : null,
      recent_incidents: recentIncidents.length > 0 ? recentIncidents.length : 0,
      engagement_level: clientSessionNotes.length > 0 
        ? Math.round(clientSessionNotes.reduce((sum, n) => sum + (n.client_engagement_level || 50), 0) / clientSessionNotes.length)
        : 'Unknown'
    };

    const prompt = `
Generate a comprehensive handover summary for a client being transitioned between practitioners. This summary will guide the new practitioner and ensure continuity of care.

HANDOVER CONTEXT:
Client: ${client.full_name}
NDIS Number: ${client.ndis_number}
Current Practitioner: ${fromPractitioner?.full_name}
New Practitioner: ${toPractitioner?.full_name}

CLIENT DATA:
${JSON.stringify(handoverData, null, 2)}

Generate handover summary in JSON format:
{
  "executive_summary": "Brief overview of client and key transition considerations",
  "client_strengths": ["strength 1 - client capability", "strength 2"],
  "current_challenges": ["challenge 1 - observable difficulty", "challenge 2"],
  "goals_status": "Summary of progress against goals and any at-risk items",
  "critical_interventions": [
    "intervention name - why it works for this client",
    "intervention name - expected response"
  ],
  "engagement_strategies": [
    "specific strategy that has been effective",
    "specific strategy that has been effective"
  ],
  "risk_considerations": {
    "disengagement_risk": "assessment if any",
    "incident_patterns": "patterns observed if any",
    "behavioral_triggers": ["specific triggers to monitor"]
  },
  "support_plan_overview": "Brief overview of active behaviour support plan focus areas",
  "family_context": "Any relevant family dynamics or contact information to know",
  "communication_style": "How client responds best to communication and instruction",
  "transition_recommendations": [
    "specific recommendation for transition (e.g., overlapping sessions, gradual handoff)",
    "specific recommendation"
  ],
  "first_session_prep": [
    "topic to cover in first session",
    "topic to cover in first session"
  ],
  "session_structure": "How sessions are typically structured (frequency, duration, location, activities)",
  "monitoring_checklist": [
    "monitor for this indicator in first weeks",
    "monitor for this indicator in first weeks"
  ]
}

Guidelines:
- Focus on operational continuity and risk mitigation
- Highlight what has worked with this client
- Flag any sensitive or critical information
- Provide actionable recommendations`;

    const handoverContent = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          client_strengths: { type: 'array', items: { type: 'string' } },
          current_challenges: { type: 'array', items: { type: 'string' } },
          goals_status: { type: 'string' },
          critical_interventions: { type: 'array', items: { type: 'string' } },
          engagement_strategies: { type: 'array', items: { type: 'string' } },
          risk_considerations: {
            type: 'object',
            properties: {
              disengagement_risk: { type: 'string' },
              incident_patterns: { type: 'string' },
              behavioral_triggers: { type: 'array', items: { type: 'string' } }
            }
          },
          support_plan_overview: { type: 'string' },
          family_context: { type: 'string' },
          communication_style: { type: 'string' },
          transition_recommendations: { type: 'array', items: { type: 'string' } },
          first_session_prep: { type: 'array', items: { type: 'string' } },
          session_structure: { type: 'string' },
          monitoring_checklist: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      client_id,
      client_name: client.full_name,
      from_practitioner: fromPractitioner?.full_name,
      to_practitioner: toPractitioner?.full_name,
      handover_summary: handoverContent,
      progress_snapshot: handoverData.current_goals,
      risk_summary: handoverData.risk_profile
    });
  } catch (error) {
    console.error('Handover generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});