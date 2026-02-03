import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, client_id, behavior_observed, context } = await req.json();

    if (!session_id || !client_id || !behavior_observed) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch support plan and assessments
    const [
      bsps,
      fbas,
      motivationAssessments,
      abcRecords,
      client
    ] = await Promise.all([
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.FunctionalBehaviourAssessment.filter({ client_id }),
      base44.entities.MotivationAssessmentScale.filter({ client_id }),
      base44.entities.ABCRecord.filter({ client_id }),
      base44.entities.Client.filter({ id: client_id })
    ]);

    const activeBSP = bsps?.find(b => b.is_latest_version && b.status === 'active');
    const latestFBA = fbas?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))?.[0];
    const latestMotivation = motivationAssessments?.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))?.[0];
    const recentABC = abcRecords?.slice(-10) || [];

    const prompt = `
You are recommending specific interventions for a behaviour support practitioner to use RIGHT NOW during a client session.

CLIENT: ${client?.[0]?.full_name}

CURRENT BEHAVIOUR OBSERVED:
${behavior_observed}

CONTEXT:
${context || 'No additional context'}

RECENT ABC PATTERNS (last 10 observations):
${recentABC.map(abc => `- Antecedent: ${abc.antecedent}, Behaviour: ${abc.behaviour} (${abc.behaviour_intensity}), Consequence: ${abc.consequence}`).join('\n')}

FUNCTIONAL BEHAVIOUR ASSESSMENT:
- Hypothesised Function: ${latestFBA?.hypothesised_function}
- Likely Antecedents: ${latestFBA?.antecedents}
- Replacement Behaviours: ${latestFBA?.replacement_behaviours}

MOTIVATION PROFILE:
- Primary: ${latestMotivation?.primary_motivation}
- Sensory: ${latestMotivation?.sensory_needs_score}, Escape: ${latestMotivation?.escape_avoidance_score}, Attention: ${latestMotivation?.attention_score}, Tangibles: ${latestMotivation?.tangibles_score}

ACTIVE SUPPORT PLAN:
- Environmental Strategies: ${activeBSP?.environmental_strategies}
- Skill Building: ${activeBSP?.skill_building_strategies}
- Reactive: ${activeBSP?.reactive_strategies}

Based on the FBA, motivation assessment, and plan, recommend immediate interventions:
{
  "priority": "critical|high|medium",
  "interventions": [
    {
      "name": "specific intervention",
      "why_now": "why this is relevant right now",
      "how_to_deliver": "step-by-step instructions",
      "expected_outcome": "what should happen",
      "plan_reference": "which part of BSP",
      "difficulty_level": "easy|moderate|challenging"
    }
  ],
  "avoid": ["things to avoid in this moment"],
  "motivation_lever": "how to use identified motivations",
  "quick_alternative": "if primary intervention doesn't work, try...",
  "safety_alert": "any safety considerations",
  "is_plan_aligned": true|false,
  "time_estimate": "how long this typically takes"
}

Recommendations must be:
- Immediately actionable
- Aligned with current support plan
- Evidence-based from FBA analysis
- Sensitive to identified motivations
`;

    const interventions = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          priority: { type: 'string' },
          interventions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                why_now: { type: 'string' },
                how_to_deliver: { type: 'string' },
                expected_outcome: { type: 'string' },
                plan_reference: { type: 'string' },
                difficulty_level: { type: 'string' }
              }
            }
          },
          avoid: { type: 'array', items: { type: 'string' } },
          motivation_lever: { type: 'string' },
          quick_alternative: { type: 'string' },
          safety_alert: { type: 'string' },
          is_plan_aligned: { type: 'boolean' },
          time_estimate: { type: 'string' }
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
      request_type: 'intervention_suggestion',
      request_context: `Behaviour: ${behavior_observed}`,
      ai_response: JSON.stringify(interventions)
    });

    return Response.json({
      success: true,
      session_id,
      client_id,
      interventions
    });
  } catch (error) {
    console.error('Intervention suggestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});