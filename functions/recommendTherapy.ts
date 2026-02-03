import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Predictive Therapeutic Recommendations
 * Suggests personalized therapeutic approaches based on client profile and history
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    // Fetch comprehensive client profile
    const [client, bsps, caseNotes, goals, incidents, communications] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(c => c[0]),
      base44.entities.BehaviourSupportPlan.filter({ client_id }),
      base44.entities.CaseNote.filter({ client_id }, '-session_date', 20),
      base44.entities.ClientGoal.filter({ client_id }),
      base44.entities.Incident.filter({ client_id }, '-incident_date', 15),
      base44.entities.ClientCommunication.filter({ client_id }, '-sent_date', 10)
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const activeBSP = bsps.find(b => b.status === 'active');
    const progressTrend = caseNotes.length > 0 
      ? caseNotes.slice(0, 5).map(n => n.progress_rating)
      : [];

    // Compile client profile for AI analysis
    const profileContext = `
CLIENT PROFILE:
- Name: ${client.full_name}
- Risk Level: ${client.risk_level}
- Service Type: ${client.service_type}
- Current Status: ${client.status}

CURRENT SUPPORT APPROACH:
${activeBSP ? `
- Active BSP Version: ${activeBSP.plan_version}
- Review Date: ${activeBSP.review_date}
- Behaviour Summary: ${activeBSP.behaviour_summary?.substring(0, 200)}
- Current Interventions: ${activeBSP.intervention_strategies?.substring(0, 200)}
` : '- No active BSP'}

GOALS:
${goals.slice(0, 5).map(g => `- ${g.goal_description} (Status: ${g.status}, Progress: ${g.current_progress}%)`).join('\n') || '- No documented goals'}

RECENT PROGRESS TREND:
${progressTrend.slice(0, 5).map((p, i) => `- Session ${i + 1}: ${p}`).join('\n') || '- Limited history'}

RECENT INCIDENTS (Last 30 days):
${incidents.slice(0, 5).map(i => `- ${i.incident_date}: ${i.category} (${i.severity})`).join('\n') || '- No recent incidents'}

RECENT COMMUNICATIONS/CONCERNS:
${communications.slice(0, 3).map(c => `- ${c.subject || 'Communication'}: ${c.message_body?.substring(0, 100)}`).join('\n') || '- Limited communication data'}

CLINICAL ASSESSMENT DATA:
${caseNotes[0] ? `
- Recent Assessment: ${caseNotes[0].assessment?.substring(0, 150)}
- Subjective: ${caseNotes[0].subjective?.substring(0, 100)}
- Objective: ${caseNotes[0].objective?.substring(0, 100)}
` : '- No recent assessments'}`;

    // Get AI recommendations
    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `${profileContext}

Based on this client's complete profile, current support plan, progress, and presenting concerns, provide:

1. **Current Approach Assessment** - Is the current therapeutic approach effective? What's working well?
2. **Suggested Modifications** - What adjustments to the current plan could improve outcomes?
3. **Alternative Therapeutic Approaches** - 2-3 evidence-based alternative or supplementary approaches tailored to this client
4. **Specific Intervention Recommendations** - 3-5 concrete interventions to trial with clear implementation guidance
5. **Progress Monitoring Strategy** - How to track whether new approaches are effective
6. **Potential Risks/Contraindications** - Any concerns or prerequisites for recommended approaches
7. **Timeline for Adjustment** - When to review and adjust if new approaches aren't effective (e.g., 4 weeks, 8 weeks)

Be clinical, specific, and grounded in the client's actual presenting profile. Avoid generic advice.`,
      response_json_schema: {
        type: "object",
        properties: {
          current_assessment: {
            type: "object",
            properties: {
              effectiveness: { type: "string" },
              working_well: { type: "array", items: { type: "string" } },
              areas_of_concern: { type: "array", items: { type: "string" } }
            }
          },
          suggested_modifications: { type: "array", items: { type: "string" } },
          alternative_approaches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                approach_name: { type: "string" },
                rationale: { type: "string" },
                implementation: { type: "string" },
                expected_benefit: { type: "string" }
              }
            }
          },
          specific_interventions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                how_to_implement: { type: "string" },
                frequency: { type: "string" },
                expected_outcome: { type: "string" },
                materials_needed: { type: "string" }
              }
            }
          },
          monitoring_strategy: {
            type: "object",
            properties: {
              metrics_to_track: { type: "array", items: { type: "string" } },
              measurement_method: { type: "string" },
              review_points: { type: "array", items: { type: "string" } }
            }
          },
          risks_and_contraindications: { type: "array", items: { type: "string" } },
          review_timeline: { type: "string" }
        }
      }
    });

    return Response.json({
      client_id,
      client_name: client.full_name,
      recommendations,
      generated_date: new Date().toISOString(),
      review_recommended: true,
      review_by_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Therapy recommendation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});