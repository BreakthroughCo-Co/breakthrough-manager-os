import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, transition_id } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    // Fetch client and transition data
    const client = await base44.entities.Client.filter({ id: client_id });
    const transition = transition_id ? await base44.entities.ClientTransition.filter({ id: transition_id }) : null;
    const clientGoals = await base44.entities.ClientGoal.filter({ client_id });
    const riskProfile = await base44.entities.ClientRiskProfile.filter({ client_id });
    const incidents = await base44.entities.Incident.list(); // Would be filtered by client_id in production

    if (!client || client.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientData = client[0];
    const recentIncidents = incidents.filter(i => i.client_id === client_id && 
      new Date(i.created_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    // Use LLM to reassess risk
    const prompt = `
    Analyze client risk profile for transition:
    
    Client: ${clientData.full_name}
    Current Risk Level: ${riskProfile?.[0]?.overall_risk_level || 'unknown'}
    Recent Incidents (30 days): ${recentIncidents.length}
    Active Goals: ${clientGoals?.length || 0}
    On-Track Goals: ${clientGoals?.filter(g => g.status === 'on_track')?.length || 0}
    At-Risk Goals: ${clientGoals?.filter(g => g.status === 'at_risk')?.length || 0}
    Plan Utilization: ${clientData.funding_utilised / clientData.funding_allocated * 100 || 0}%
    
    Recent Goal Status:
    ${clientGoals?.map(g => `- ${g.goal_description}: ${g.status}`).join('\n')}
    
    Recent Incidents: ${recentIncidents.length > 0 ? recentIncidents.map(i => i.description || 'Incident').join(', ') : 'None'}
    
    Provide a comprehensive risk reassessment:
    {
      updated_risk_level: "critical|high|medium|low",
      risk_score: number,
      transition_readiness: "high|moderate|low",
      continuity_of_care_risks: ["..."],
      goal_progress_stability: "improving|stable|declining",
      critical_transition_considerations: ["..."],
      practitioner_handover_notes: "...",
      monitoring_frequency_post_transition: "weekly|fortnightly|monthly",
      risk_mitigation_actions: ["..."],
      recommended_support_adjustments: ["..."]
    }
    `;

    const riskReassessment = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          updated_risk_level: { type: 'string' },
          risk_score: { type: 'number' },
          transition_readiness: { type: 'string' },
          continuity_of_care_risks: { type: 'array', items: { type: 'string' } },
          goal_progress_stability: { type: 'string' },
          critical_transition_considerations: { type: 'array', items: { type: 'string' } },
          practitioner_handover_notes: { type: 'string' },
          monitoring_frequency_post_transition: { type: 'string' },
          risk_mitigation_actions: { type: 'array', items: { type: 'string' } },
          recommended_support_adjustments: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Update or create client risk profile
    const existingRiskProfile = riskProfile?.[0];
    const updatedRiskProfile = existingRiskProfile
      ? await base44.entities.ClientRiskProfile.update(existingRiskProfile.id, {
          overall_risk_level: riskReassessment.updated_risk_level,
          overall_risk_score: riskReassessment.risk_score,
          trend_direction: riskReassessment.goal_progress_stability,
          analysis_date: new Date().toISOString(),
          recommended_actions: riskReassessment.risk_mitigation_actions,
          review_frequency: riskReassessment.monitoring_frequency_post_transition,
          next_review_date: calculateNextReviewDate(riskReassessment.monitoring_frequency_post_transition)
        })
      : await base44.entities.ClientRiskProfile.create({
          client_id,
          client_name: clientData.full_name,
          overall_risk_level: riskReassessment.updated_risk_level,
          overall_risk_score: riskReassessment.risk_score,
          analysis_date: new Date().toISOString(),
          trend_direction: riskReassessment.goal_progress_stability,
          recommended_actions: riskReassessment.risk_mitigation_actions,
          review_frequency: riskReassessment.monitoring_frequency_post_transition,
          next_review_date: calculateNextReviewDate(riskReassessment.monitoring_frequency_post_transition)
        });

    return Response.json({
      success: true,
      client_id,
      client_name: clientData.full_name,
      risk_reassessment: riskReassessment,
      risk_profile_updated: updatedRiskProfile.id,
      transition_strategy_adjustments_needed: riskReassessment.transition_readiness === 'low',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateNextReviewDate(frequency) {
  const date = new Date();
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  else if (frequency === 'fortnightly') date.setDate(date.getDate() + 14);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
}