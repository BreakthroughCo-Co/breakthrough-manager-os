import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, client_id, current_observation, guidance_type } = await req.json();

    if (!session_id || !client_id) {
      return Response.json({ error: 'Missing session_id or client_id' }, { status: 400 });
    }

    // Fetch relevant context
    const [
      sessionData,
      client,
      bsps,
      fbas,
      motivationAssessments,
      goals
    ] = await Promise.all([
      base44.entities.SessionContext.filter({ id: session_id }),
      base44.entities.Client.filter({ id: client_id }),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.FunctionalBehaviourAssessment.filter({ client_id }),
      base44.entities.MotivationAssessmentScale.filter({ client_id }),
      base44.entities.ClientGoal.filter({ client_id })
    ]);

    const session = sessionData?.[0];
    const activeBSP = bsps?.find(b => b.is_latest_version && b.status === 'active');
    const latestFBA = fbas?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))?.[0];
    const latestMotivation = motivationAssessments?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))?.[0];

    const prompt = `
You are providing real-time behaviour support guidance to a practitioner during a client session.

CLIENT PROFILE:
- Name: ${client?.[0]?.full_name}
- NDIS Service: ${client?.[0]?.service_type}
- Risk Level: ${client?.[0]?.risk_level}

CURRENT SESSION:
- Session Type: ${session?.session_type}
- Status: ${session?.current_status}
- Start Time: ${session?.session_start_time}

ACTIVE BEHAVIOUR SUPPORT PLAN:
${activeBSP ? `
- Environmental Strategies: ${activeBSP.environmental_strategies}
- Skill Building Strategies: ${activeBSP.skill_building_strategies}
- Reactive Strategies: ${activeBSP.reactive_strategies}
- Monitoring Method: ${activeBSP.monitoring_evaluation}
` : 'No active BSP found'}

FUNCTIONAL BEHAVIOUR ASSESSMENT:
${latestFBA ? `
- Hypothesised Function: ${latestFBA.hypothesised_function}
- Antecedents: ${latestFBA.antecedents}
- Consequences: ${latestFBA.consequences}
- Replacement Behaviours: ${latestFBA.replacement_behaviours}
` : 'No FBA found'}

MOTIVATION ASSESSMENT:
${latestMotivation ? `
- Primary Motivation: ${latestMotivation.primary_motivation}
- Sensory Score: ${latestMotivation.sensory_needs_score}
- Escape/Avoidance Score: ${latestMotivation.escape_avoidance_score}
- Attention Score: ${latestMotivation.attention_score}
- Tangibles Score: ${latestMotivation.tangibles_score}
` : 'No motivation assessment found'}

CURRENT OBSERVATION:
${current_observation || 'No specific observation noted'}

GUIDANCE REQUEST TYPE:
${guidance_type || 'general'}

Based on the client's support plan, FBA, and motivation assessment, provide real-time guidance in JSON format:
{
  "guidance_type": "${guidance_type || 'general'}",
  "situation_analysis": "Brief analysis of what's happening",
  "immediate_recommendations": [
    {
      "action": "specific action to take",
      "rationale": "why this aligns with the plan",
      "plan_reference": "which part of BSP/FBA this connects to"
    }
  ],
  "motivation_considerations": "How to leverage identified motivations",
  "risk_flagged": true|false,
  "risk_mitigation": "if applicable",
  "plan_alignment": "How to keep this aligned with current support plan",
  "next_observation_focus": "What to observe or measure next",
  "practitioner_tips": "Tips specific to this situation"
}

IMPORTANT:
- All guidance must align with the active support plan
- Flag any deviations or safety concerns immediately
- Recommendations must be practical and immediately actionable
- Consider both the FBA analysis and motivation assessment
`;

    const guidance = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          guidance_type: { type: 'string' },
          situation_analysis: { type: 'string' },
          immediate_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                rationale: { type: 'string' },
                plan_reference: { type: 'string' }
              }
            }
          },
          motivation_considerations: { type: 'string' },
          risk_flagged: { type: 'boolean' },
          risk_mitigation: { type: 'string' },
          plan_alignment: { type: 'string' },
          next_observation_focus: { type: 'string' },
          practitioner_tips: { type: 'string' }
        }
      }
    });

    // Log the support request
    await base44.entities.SessionSupportLog.create({
      session_id,
      client_id,
      client_name: client?.[0]?.full_name,
      practitioner_id: user.id,
      practitioner_name: user.full_name,
      request_timestamp: new Date().toISOString(),
      request_type: 'guidance',
      request_context: current_observation,
      ai_response: JSON.stringify(guidance)
    });

    return Response.json({
      success: true,
      session_id,
      client_id,
      guidance
    });
  } catch (error) {
    console.error('Session support error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});