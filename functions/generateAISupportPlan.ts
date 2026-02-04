import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    // Gather comprehensive client data
    const [client, riskProfile, outcomePrediction, incidents, goals, caseNotes, bsp] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.ClientRiskProfile.filter({ client_id }, '-analysis_date', 1).then(r => r[0]).catch(() => null),
      base44.asServiceRole.functions.invoke('predictClientOutcomes', { client_id }).then(r => r.data?.prediction).catch(() => null),
      base44.asServiceRole.entities.Incident.filter({ client_id }, '-incident_date', 10),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.CaseNote.filter({ client_id }, '-created_date', 10),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }).then(p => p[0]).catch(() => null)
    ]);

    const prompt = `
You are an NDIS practice specialist creating an evidence-based support plan.

CLIENT PROFILE:
- Name: ${client.full_name}
- Service Type: ${client.service_type}
- NDIS Number: ${client.ndis_number}
- Plan Period: ${client.plan_start_date} to ${client.plan_end_date}

RISK ASSESSMENT:
- Overall Risk: ${riskProfile?.overall_risk_level || 'Not assessed'} (${riskProfile?.overall_risk_score}/100)
- Disengagement Risk: ${riskProfile?.disengagement_risk || 'N/A'}
- Crisis Risk: ${riskProfile?.crisis_risk || 'N/A'}
- Trend: ${riskProfile?.trend_direction || 'Unknown'}

OUTCOME PREDICTION:
- Success Probability: ${outcomePrediction?.success_probability || 'N/A'}%
- 6-Month Outlook: ${outcomePrediction?.six_month_outlook || 'N/A'}%
- Key Risk Factors: ${outcomePrediction?.risk_factors?.join(', ') || 'None identified'}

INCIDENT HISTORY (Last 10):
${incidents.map(i => `- ${i.incident_date}: ${i.incident_type} (${i.severity})`).join('\n') || 'No incidents recorded'}

CURRENT GOALS:
${goals.map(g => `- ${g.goal_description} (${g.status}, ${g.current_progress}%)`).join('\n') || 'No goals set'}

EXISTING BSP:
${bsp ? `Active since ${bsp.plan_start_date}, Last reviewed: ${bsp.last_review_date || 'Never'}` : 'No active BSP'}

RECENT DOCUMENTATION PATTERNS:
${caseNotes.length} case notes in last 30 days

Based on this comprehensive analysis, generate an evidence-based support plan that includes:
1. SMART goals aligned with NDIS outcome domains
2. Evidence-based intervention strategies
3. Risk mitigation approaches
4. Monitoring and review schedule
5. Measurable success criteria
6. Recommended service intensity

Ensure all recommendations align with NDIS Practice Standards and best practice guidelines.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal_description: { type: "string" },
                ndis_domain: { type: "string" },
                specific: { type: "string" },
                measurable: { type: "string" },
                achievable: { type: "string" },
                relevant: { type: "string" },
                time_bound: { type: "string" },
                baseline: { type: "string" },
                target_outcome: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          intervention_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                evidence_base: { type: "string" },
                implementation_approach: { type: "string" },
                expected_outcome: { type: "string" },
                frequency: { type: "string" }
              }
            }
          },
          risk_mitigation: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                mitigation_strategy: { type: "string" },
                monitoring_indicators: { type: "array", items: { type: "string" } }
              }
            }
          },
          review_schedule: {
            type: "object",
            properties: {
              frequency: { type: "string" },
              key_review_dates: { type: "array", items: { type: "string" } },
              review_focus_areas: { type: "array", items: { type: "string" } }
            }
          },
          success_criteria: {
            type: "array",
            items: {
              type: "string"
            }
          },
          recommended_service_intensity: { type: "string" },
          ndis_alignment_notes: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      client_id,
      client_name: client.full_name,
      support_plan: aiResponse,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});