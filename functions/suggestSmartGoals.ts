import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, focus_area } = await req.json();

    // Fetch client data
    const [client, bsps, caseNotes, fba] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.CaseNote.filter({ client_id }),
      base44.entities.FunctionalBehaviourAssessment.filter({ client_id }),
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const activeBSP = bsps.find(b => b.status === 'active');
    const recentNotes = caseNotes.slice(0, 10);
    const latestFBA = fba[0];

    const prompt = `You are an expert NDIS behaviour support practitioner specializing in goal setting. Create SMART goals for this client based on their profile and progress.

CLIENT PROFILE:
Name: ${client.full_name}
Service Type: ${client.service_type}
Risk Level: ${client.risk_level}

${activeBSP ? `CURRENT BSP:
Behaviour Summary: ${activeBSP.behaviour_summary}
Environmental Strategies: ${activeBSP.environmental_strategies}
Skill Building Strategies: ${activeBSP.skill_building_strategies}
Reactive Strategies: ${activeBSP.reactive_strategies}` : 'No active BSP'}

${latestFBA ? `FUNCTIONAL BEHAVIOUR ASSESSMENT:
Target Behaviours: ${latestFBA.target_behaviours}
Hypothesised Function: ${latestFBA.hypothesised_function}
Replacement Behaviours: ${latestFBA.replacement_behaviours}
Recommendations: ${latestFBA.recommendations}` : ''}

RECENT PROGRESS NOTES (Last 10):
${recentNotes.map(n => `- ${n.session_date}: ${n.summary?.substring(0, 150) || n.progress_summary?.substring(0, 150) || 'No summary'}`).join('\n')}

${focus_area ? `FOCUS AREA: ${focus_area}` : ''}

Generate 3-5 SMART goals for this client. Each goal must be:
- **Specific**: Clear and unambiguous
- **Measurable**: Include concrete criteria for measurement
- **Achievable**: Realistic given client's current functioning
- **Relevant**: Aligned with BSP and client needs
- **Time-bound**: Include a specific timeframe

For each goal, provide:
1. Goal statement
2. Measurement criteria (how success will be measured)
3. Target timeframe
4. Rationale (why this goal is important)
5. Suggested strategies (2-3 evidence-based strategies to achieve it)

Focus on functional, meaningful outcomes that improve quality of life and reduce restrictive practices.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal_statement: { type: "string" },
                measurement_criteria: { type: "string" },
                timeframe: { type: "string" },
                rationale: { type: "string" },
                suggested_strategies: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          overall_framework: { type: "string" },
          priority_recommendation: { type: "string" }
        }
      }
    });

    return Response.json({
      client_id,
      client_name: client.full_name,
      suggested_goals: result,
      generated_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('SMART goals suggestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});