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
    const [client, caseNotes, feedback, goals, bsp, riskProfile] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.CaseNote.filter({ client_id }, '-created_date', 20),
      base44.asServiceRole.entities.ClientFeedback.filter({ client_id }),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }).then(p => p[0]).catch(() => null),
      base44.asServiceRole.entities.ClientRiskProfile.filter({ client_id }, '-analysis_date', 1).then(r => r[0]).catch(() => null)
    ]);

    // Analyze recent documentation patterns
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentNotes = caseNotes.filter(n => new Date(n.created_date) >= last30Days);
    const recentFeedback = feedback.filter(f => new Date(f.feedback_date) >= last30Days);

    // Extract themes from recent notes
    const noteThemes = recentNotes.map(n => 
      `${n.created_date}: ${n.observations || ''} ${n.progress_against_goals || ''}`
    ).join('\n');

    const feedbackThemes = recentFeedback.map(f =>
      `${f.feedback_date}: Satisfaction ${f.overall_satisfaction}/5, Comments: ${f.qualitative_feedback || 'None'}`
    ).join('\n');

    const prompt = `
You are an NDIS clinical review specialist analyzing client progress to suggest support plan updates.

CLIENT PROFILE:
- Name: ${client.full_name}
- Service Type: ${client.service_type}
- Current Risk Level: ${riskProfile?.overall_risk_level || 'Not assessed'}

CURRENT GOALS:
${goals.map(g => `- ${g.goal_description} (Status: ${g.status}, Progress: ${g.current_progress}%)`).join('\n')}

RECENT CASE NOTES (Last 20):
${noteThemes}

RECENT CLIENT FEEDBACK:
${feedbackThemes}

ACTIVE BSP STATUS:
${bsp ? `Plan active since ${bsp.plan_start_date}, Last reviewed: ${bsp.last_review_date || 'Never'}` : 'No active BSP'}

Based on documented progress, practitioner observations, and client feedback, recommend:
1. GOAL ADJUSTMENTS: Which goals should be modified, achieved, or discontinued
2. NEW GOALS: Emerging needs or progression opportunities
3. INTERVENTION CHANGES: Modifications to current strategies based on effectiveness
4. MILESTONE UPDATES: Progress markers that should be adjusted
5. SUPPORT INTENSITY: Whether service frequency should change
6. RISK MITIGATION: Updates to risk management approach
7. PRACTITIONER RECOMMENDATIONS: Specific actions for practitioners

Ensure all recommendations are evidence-based and NDIS outcome-focused.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          goal_adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                current_goal: { type: "string" },
                recommended_change: { type: "string" },
                rationale: { type: "string" },
                evidence_source: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          new_goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                proposed_goal: { type: "string" },
                ndis_domain: { type: "string" },
                rationale: { type: "string" },
                success_criteria: { type: "array", items: { type: "string" } },
                timeframe: { type: "string" }
              }
            }
          },
          intervention_changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                current_intervention: { type: "string" },
                recommended_modification: { type: "string" },
                effectiveness_evidence: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          milestone_updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal_area: { type: "string" },
                current_milestone: { type: "string" },
                revised_milestone: { type: "string" },
                adjustment_reason: { type: "string" }
              }
            }
          },
          support_intensity: {
            type: "object",
            properties: {
              current_frequency: { type: "string" },
              recommended_frequency: { type: "string" },
              rationale: { type: "string" },
              implementation_approach: { type: "string" }
            }
          },
          risk_mitigation_updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk_area: { type: "string" },
                current_strategy: { type: "string" },
                recommended_update: { type: "string" },
                urgency: { type: "string" }
              }
            }
          },
          practitioner_actions: {
            type: "array",
            items: {
              type: "string"
            }
          },
          review_recommendations: {
            type: "object",
            properties: {
              next_review_date: { type: "string" },
              review_focus_areas: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      client_id,
      client_name: client.full_name,
      update_suggestions: aiResponse,
      data_sources: {
        case_notes_analyzed: recentNotes.length,
        feedback_analyzed: recentFeedback.length,
        current_goals: goals.length
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});